import { log } from "../logs/sseLogger.js";
import type { JobListing } from "../apply/emailApply.js";
import { newBrowserPage, sleep } from "./playwrightBrowser.js";

const WWOOF_SITES: { country: string; url: string; lang: "fr" | "en" }[] = [
  { country: "France",  url: "https://www.wwoof.fr/en/become-a-wwoofer",        lang: "fr" },
  { country: "Italy",   url: "https://www.wwoof.it/en/volunteers/search",       lang: "en" },
  { country: "Spain",   url: "https://wwoof.es/en/volunteer",                   lang: "en" },
  { country: "Germany", url: "https://www.wwoof.de/wwoofer",                    lang: "en" },
];

export async function scrapeWWOOF(
  category: "internships" | "accommodation" | "parttime",
  limit = 15
): Promise<JobListing[]> {
  if (category !== "accommodation") return [];
  const results: JobListing[] = [];

  try {
    log.info(`[WWOOF] Starting Playwright scrape...`);
    const { page, ctx } = await newBrowserPage();

    try {
      for (const site of WWOOF_SITES) {
        if (results.length >= limit) break;
        try {
          await page.goto(site.url, { waitUntil: "domcontentloaded", timeout: 20000 });
          await sleep(2000);

          const jobs = await page.evaluate((country) => {
            const items: { role: string; company: string; url: string }[] = [];

            const selectors = [
              ".farm-item",
              ".host-card",
              ".wwoofer-host",
              ".host-listing",
              "article",
              ".card",
              "li.result",
              "[class*='farm']",
              "[class*='host']",
            ];

            let cards: NodeListOf<Element> | null = null;
            for (const sel of selectors) {
              const found = document.querySelectorAll(sel);
              if (found.length >= 2) { cards = found; break; }
            }

            if (!cards || cards.length === 0) {
              const anchors = document.querySelectorAll(
                "a[href*='/host/'], a[href*='/farm/'], a[href*='/wwoofer/'], a.host-link"
              );
              anchors.forEach(a => {
                const href = (a as HTMLAnchorElement).href;
                const text = a.textContent?.trim() ?? "";
                if (!text || !href) return;
                items.push({
                  role: `WWOOF Work Exchange – ${text.substring(0, 60)}`,
                  company: country,
                  url: href,
                });
              });
            } else {
              cards.forEach(card => {
                const titleEl = card.querySelector(
                  "h2, h3, h4, .title, .farm-name, .host-name, [class*='title'], [class*='name']"
                );
                const linkEl = card.querySelector("a[href]");
                const title = titleEl?.textContent?.trim() ?? "";
                const href = (linkEl as HTMLAnchorElement)?.href ?? "";
                if (!title || !href) return;
                items.push({
                  role: `WWOOF Work Exchange – ${title.substring(0, 60)}`,
                  company: `WWOOF ${country}`,
                  url: href,
                });
              });
            }
            return items.slice(0, 10);
          }, site.country);

          for (const job of jobs) {
            if (results.length >= limit) break;
            results.push({
              company: job.company,
              role: job.role,
              source: "WWOOF",
              url: job.url,
              category: "accommodation",
              language: site.lang,
              isPriority: false,
            });
          }
          await sleep(2500);
        } catch (err) {
          log.warn(`[WWOOF] Error for ${site.country}: ${String(err)}`);
        }
      }

      if (results.length === 0) {
        log.warn("[WWOOF] No results from sites — adding fallback entries for manual signup");
        const fallbacks = [
          { country: "France",  url: "https://www.wwoof.fr/en/become-a-wwoofer", lang: "fr" as const },
          { country: "Italy",   url: "https://www.wwoof.it/en/volunteers/search", lang: "en" as const },
          { country: "Spain",   url: "https://wwoof.es/en/volunteer",             lang: "en" as const },
        ];
        for (const fb of fallbacks) {
          results.push({
            company: `WWOOF ${fb.country}`,
            role: `WWOOF Work Exchange – Free Accommodation for Farm/Tech Help`,
            source: "WWOOF",
            url: fb.url,
            category: "accommodation",
            language: fb.lang,
            isPriority: false,
          });
        }
      }
    } finally {
      await ctx.close();
    }

    log.success(`[WWOOF] Found ${results.length} accommodation listings`);
  } catch (err) {
    log.error(`[WWOOF] Error: ${String(err)}`);
  }
  return results;
}
