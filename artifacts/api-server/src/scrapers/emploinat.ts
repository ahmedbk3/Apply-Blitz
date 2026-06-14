import { log } from "../logs/sseLogger.js";
import type { JobListing } from "../apply/emailApply.js";
import { newBrowserPage, sleep } from "./playwrightBrowser.js";

const SEARCH_URLS = [
  "https://www.emploi.nat.tn/offre-de-stage?domaine=informatique",
  "https://www.emploi.nat.tn/offre-de-stage?domaine=t%C3%A9l%C3%A9com",
  "https://www.emploi.nat.tn/offre-de-stage",
];

export async function scrapeEmploiNat(
  category: "internships" | "accommodation" | "parttime",
  limit = 15
): Promise<JobListing[]> {
  if (category !== "internships") return [];
  const results: JobListing[] = [];

  try {
    log.info(`[EmploiNat] Starting Playwright scrape for internships...`);
    const { page, ctx } = await newBrowserPage();

    try {
      for (const searchUrl of SEARCH_URLS) {
        if (results.length >= limit) break;
        try {
          await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
          await sleep(2000);

          const jobs = await page.evaluate(() => {
            const items: { role: string; company: string; url: string }[] = [];

            const selectors = [
              ".offer-item",
              ".job-offer",
              ".offre-emploi",
              ".stage-item",
              "article",
              ".list-group-item",
              ".card",
              "tr[class*='offer'], tr[class*='stage']",
            ];

            let cards: NodeListOf<Element> | null = null;
            for (const sel of selectors) {
              const found = document.querySelectorAll(sel);
              if (found.length >= 2) { cards = found; break; }
            }

            if (!cards || cards.length === 0) {
              const anchors = document.querySelectorAll(
                "a[href*='offre'], a[href*='stage'], a[href*='emploi']"
              );
              anchors.forEach((a) => {
                const href = (a as HTMLAnchorElement).href;
                const text = a.textContent?.trim() ?? "";
                if (!text || text.length < 5 || !href) return;
                const parentText = a.closest("tr, li, div.row, article")?.textContent ?? "";
                const lines = parentText.split(/\n|\r/).map(l => l.trim()).filter(Boolean);
                const company = lines.find(l => l !== text && l.length > 3 && l.length < 60) ?? "Unknown";
                items.push({ role: text, company, url: href });
              });
            } else {
              cards.forEach(card => {
                const titleEl = card.querySelector(
                  "h2 a, h3 a, h4 a, .title a, .poste a, td a, a.offer-link, a[href*='offre'], a[href*='stage']"
                );
                const companyEl = card.querySelector(
                  ".company, .entreprise, .employeur, td:nth-child(2), [class*='company'], [class*='entreprise']"
                );

                const role = titleEl?.textContent?.trim() ?? "";
                const company = companyEl?.textContent?.trim() ?? "Unknown";
                const url = (titleEl as HTMLAnchorElement)?.href ?? "";

                if (role && url) items.push({ role, company, url });
              });
            }
            return items;
          });

          for (const job of jobs) {
            if (results.length >= limit) break;
            if (!job.url || job.url.includes("nat.tn/offre-de-stage?")) continue;
            results.push({
              company: job.company,
              role: job.role,
              source: "Emploi.nat.tn",
              url: job.url,
              category: "internships",
              language: "fr",
              isPriority: false,
            });
          }
          await sleep(2000);
        } catch (err) {
          log.warn(`[EmploiNat] Page error: ${String(err)}`);
        }
      }
    } finally {
      await ctx.close();
    }

    log.success(`[EmploiNat] Found ${results.length} internships`);
  } catch (err) {
    log.error(`[EmploiNat] Error: ${String(err)}`);
  }
  return results;
}
