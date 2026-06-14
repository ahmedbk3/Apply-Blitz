import { log } from "../logs/sseLogger.js";
import type { JobListing } from "../apply/emailApply.js";
import { newBrowserPage, sleep } from "./playwrightBrowser.js";

const SEARCH_URLS = [
  "https://www.workaway.info/en/hosts#type=4&country=ES&activity=3",
  "https://www.workaway.info/en/hosts#type=4&country=IT&activity=3",
  "https://www.workaway.info/en/hosts#type=4&country=FR&activity=3",
  "https://www.workaway.info/en/hosts#type=4&country=PT&activity=3",
];

const TECH_KEYWORDS = [
  "tech", "computer", "web", "programming", "developer", "digital",
  "network", "wifi", "internet", "social media", "website", "it support",
  "photography", "video", "design", "admin",
];

export async function scrapeWorkaway(
  category: "internships" | "accommodation" | "parttime",
  limit = 15
): Promise<JobListing[]> {
  if (category !== "accommodation") return [];
  const results: JobListing[] = [];

  try {
    log.info(`[Workaway] Starting Playwright scrape for accommodation hosts...`);
    const { page, ctx } = await newBrowserPage();

    try {
      for (const searchUrl of SEARCH_URLS) {
        if (results.length >= limit) break;
        try {
          await page.goto("https://www.workaway.info/en/hosts", {
            waitUntil: "networkidle",
            timeout: 25000,
          });
          await sleep(2000);

          await page.evaluate((url) => { window.location.hash = url.split("#")[1] ?? ""; }, searchUrl);
          await sleep(3000);

          const jobs = await page.evaluate((keywords: string[]) => {
            const items: { role: string; company: string; url: string }[] = [];
            const cards = document.querySelectorAll(
              ".host-card, .listing-card, article.host, [class*='host-item'], .card-host, .search-result-item"
            );

            cards.forEach(card => {
              const titleEl = card.querySelector("h2, h3, .title, .host-name, [class*='title']");
              const descEl = card.querySelector("p, .description, .summary, [class*='desc']");
              const linkEl = card.querySelector("a[href*='/en/host/'], a[href*='/host/']");
              const locationEl = card.querySelector(".location, .country, [class*='location']");

              const title = titleEl?.textContent?.trim() ?? "";
              const desc = descEl?.textContent?.trim() ?? "";
              const href = (linkEl as HTMLAnchorElement)?.href ?? "";
              const location = locationEl?.textContent?.trim() ?? "Unknown";

              if (!title || !href) return;

              const combinedText = `${title} ${desc}`.toLowerCase();
              const hasTechActivity = keywords.some(k => combinedText.includes(k));

              if (hasTechActivity || items.length < 5) {
                items.push({
                  role: `Work Exchange – ${title}`,
                  company: location || title,
                  url: href,
                });
              }
            });
            return items;
          }, TECH_KEYWORDS);

          for (const job of jobs) {
            if (results.length >= limit) break;
            results.push({
              company: job.company,
              role: job.role,
              source: "Workaway",
              url: job.url || "https://www.workaway.info/en/hosts",
              category: "accommodation",
              language: "en",
              isPriority: false,
            });
          }
          await sleep(2500 + Math.random() * 2000);
        } catch (err) {
          log.warn(`[Workaway] Page error for ${searchUrl}: ${String(err)}`);
        }
      }

      if (results.length === 0) {
        log.warn("[Workaway] No results via scraping — adding placeholder for manual review");
        results.push({
          company: "Workaway Host (Spain/Italy/France)",
          role: "Tech Work Exchange – Free Accommodation for IT Skills",
          source: "Workaway",
          url: "https://www.workaway.info/en/hosts",
          category: "accommodation",
          language: "en",
          isPriority: false,
        });
      }
    } finally {
      await ctx.close();
    }

    log.success(`[Workaway] Found ${results.length} accommodation opportunities`);
  } catch (err) {
    log.error(`[Workaway] Error: ${String(err)}`);
  }
  return results;
}
