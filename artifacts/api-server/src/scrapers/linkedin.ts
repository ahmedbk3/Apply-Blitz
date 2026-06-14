import { log } from "../logs/sseLogger.js";
import type { JobListing } from "../apply/emailApply.js";
import * as cheerio from "cheerio";

const SEARCH_CONFIGS: Record<string, { keywords: string; location: string; jobType?: string }[]> = {
  internships: [
    { keywords: "DevOps intern Tunisia", location: "Tunisia", jobType: "I" },
    { keywords: "Cloud intern Tunisia", location: "Tunisia", jobType: "I" },
    { keywords: "Network engineer intern", location: "Tunisia", jobType: "I" },
    { keywords: "IoT intern", location: "France", jobType: "I" },
  ],
  parttime: [
    { keywords: "DevOps remote part-time", location: "Worldwide" },
    { keywords: "Python developer remote", location: "Worldwide" },
    { keywords: "Network engineer remote", location: "Worldwide" },
  ],
  accommodation: [],
};

const BASE = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";

export async function scrapeLinkedIn(
  category: "internships" | "accommodation" | "parttime",
  limit = 15
): Promise<JobListing[]> {
  if (category === "accommodation") return [];
  const configs = SEARCH_CONFIGS[category] ?? [];
  const results: JobListing[] = [];

  try {
    log.info(`[LinkedIn] Scraping public job listings for ${category}...`);
    for (const cfg of configs) {
      if (results.length >= limit) break;
      try {
        const url = new URL(BASE);
        url.searchParams.set("keywords", cfg.keywords);
        url.searchParams.set("location", cfg.location);
        url.searchParams.set("start", "0");
        if (cfg.jobType) url.searchParams.set("f_JT", cfg.jobType);

        const resp = await fetch(url.toString(), {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.linkedin.com/jobs/",
          },
          signal: AbortSignal.timeout(12000),
        });

        if (!resp.ok) {
          log.warn(`[LinkedIn] ${cfg.keywords}: HTTP ${resp.status}`);
          continue;
        }

        const html = await resp.text();
        const $ = cheerio.load(html);

        $("li").each((_i, el): false | void => {
          if (results.length >= limit) return false;
          const $el = $(el);
          const titleEl = $el.find(".base-search-card__title, h3, .job-search-card__title").first();
          const companyEl = $el.find(".base-search-card__subtitle, h4, .job-search-card__company-name").first();
          const linkEl = $el.find("a.base-card__full-link, a[href*='linkedin.com/jobs']").first();

          const role = titleEl.text().trim();
          const company = companyEl.text().trim();
          const jobUrl = linkEl.attr("href")?.split("?")[0] ?? "";

          if (!role || !company || !jobUrl) return;

          const lang = cfg.location === "Tunisia" ? "fr" : "en";
          results.push({
            company,
            role,
            source: "LinkedIn",
            url: jobUrl,
            category,
            language: lang,
            isPriority: false,
          });
        });

        await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
      } catch (err) {
        log.warn(`[LinkedIn] ${cfg.keywords}: ${String(err)}`);
      }
    }
    log.success(`[LinkedIn] Found ${results.length} ${category} jobs`);
  } catch (err) {
    log.error(`[LinkedIn] Error: ${String(err)}`);
  }
  return results;
}
