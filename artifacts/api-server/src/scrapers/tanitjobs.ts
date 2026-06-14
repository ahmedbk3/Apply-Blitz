import { log } from "../logs/sseLogger.js";
import type { JobListing } from "../apply/emailApply.js";
import { newBrowserPage, sleep } from "./playwrightBrowser.js";

const SEARCH_URLS: Record<string, string[]> = {
  internships: [
    "https://www.tanitjobs.com/offres-d-emploi/?&page=1&offer_type=stage&keyword=devops",
    "https://www.tanitjobs.com/offres-d-emploi/?&page=1&offer_type=stage&keyword=r%C3%A9seau",
    "https://www.tanitjobs.com/offres-d-emploi/?&page=1&offer_type=stage&keyword=cloud",
    "https://www.tanitjobs.com/offres-d-emploi/?&page=1&offer_type=stage&keyword=informatique",
  ],
  parttime: [
    "https://www.tanitjobs.com/offres-d-emploi/?&page=1&keyword=t%C3%A9l%C3%A9travail",
  ],
  accommodation: [],
};

export async function scrapeTanitjobs(
  category: "internships" | "accommodation" | "parttime",
  limit = 20
): Promise<JobListing[]> {
  if (category === "accommodation") return [];
  const urls = SEARCH_URLS[category] ?? [];
  const results: JobListing[] = [];

  try {
    log.info(`[Tanitjobs] Starting Playwright scrape for ${category}...`);
    const { page, ctx } = await newBrowserPage();

    try {
      for (const searchUrl of urls) {
        if (results.length >= limit) break;
        try {
          await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
          await sleep(1500 + Math.random() * 1500);

          const jobs = await page.evaluate(() => {
            const items: { role: string; company: string; url: string; email: string | null }[] = [];

            const selectors = [
              ".job-item",
              ".job-card",
              ".offer-item",
              ".jobs-container li",
              "article.job",
              ".list-jobs li",
            ];

            let cards: NodeListOf<Element> | null = null;
            for (const sel of selectors) {
              const found = document.querySelectorAll(sel);
              if (found.length > 0) { cards = found; break; }
            }

            if (!cards || cards.length === 0) {
              const links = document.querySelectorAll("a[href*='/offre-emploi/'], a[href*='/offres-d-emploi/']");
              links.forEach(link => {
                const href = (link as HTMLAnchorElement).href;
                const text = link.textContent?.trim() ?? "";
                if (!text || !href || href.includes("?")) return;
                const parentText = link.closest("li, div, article")?.textContent ?? "";
                const companyMatch = parentText.match(/(?:chez|at|par)\s+([A-Z][^\n,]+)/i);
                items.push({
                  role: text,
                  company: companyMatch?.[1]?.trim() ?? "Unknown",
                  url: href,
                  email: null,
                });
              });
            } else {
              cards.forEach(card => {
                const roleEl = card.querySelector("h2 a, h3 a, .job-title a, .title a, a[href*='offre']");
                const companyEl = card.querySelector(".company, .company-name, .employer, [class*='company']");
                const emailEl = card.querySelector("a[href^='mailto:']");

                const role = roleEl?.textContent?.trim() ?? "";
                const company = companyEl?.textContent?.trim() ?? "Unknown";
                const url = (roleEl as HTMLAnchorElement)?.href ?? "";
                const email = emailEl ? (emailEl as HTMLAnchorElement).href.replace("mailto:", "") : null;

                if (role && url) {
                  items.push({ role, company, url, email });
                }
              });
            }
            return items;
          });

          for (const job of jobs) {
            if (results.length >= limit) break;
            if (!job.url) continue;
            results.push({
              company: job.company,
              role: job.role,
              source: "Tanitjobs",
              url: job.url,
              category,
              language: "fr",
              applyEmail: job.email ?? undefined,
              isPriority: false,
            });
          }
          await sleep(2000 + Math.random() * 2000);
        } catch (err) {
          log.warn(`[Tanitjobs] Page error: ${String(err)}`);
        }
      }
    } finally {
      await ctx.close();
    }

    log.success(`[Tanitjobs] Found ${results.length} ${category} jobs`);
  } catch (err) {
    log.error(`[Tanitjobs] Error: ${String(err)}`);
  }
  return results;
}
