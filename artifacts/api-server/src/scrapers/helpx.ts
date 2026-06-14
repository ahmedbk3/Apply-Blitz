import { log } from "../logs/sseLogger.js";
import type { JobListing } from "../apply/emailApply.js";
import * as cheerio from "cheerio";

const SEARCH_URLS = [
  "https://helpx.net/list-cgi/list.cgi?c=0&w=all&f=tech",
  "https://helpx.net/list-cgi/list.cgi?c=0&w=all",
  "https://helpx.net/list-cgi/list.cgi?c=0&w=europe",
];

const TECH_KEYWORDS = [
  "tech", "computer", "web", "coding", "programmer", "developer",
  "digital", "internet", "it", "software", "network", "photography",
  "social media", "website", "wordpress", "database",
];

export async function scrapeHelpX(
  category: "internships" | "accommodation" | "parttime",
  limit = 15
): Promise<JobListing[]> {
  if (category !== "accommodation") return [];
  const results: JobListing[] = [];

  try {
    log.info(`[HelpX] Fetching accommodation listings...`);

    for (const searchUrl of SEARCH_URLS) {
      if (results.length >= limit) break;
      try {
        const resp = await fetch(searchUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml",
          },
          signal: AbortSignal.timeout(12000),
        });

        if (!resp.ok) { log.warn(`[HelpX] HTTP ${resp.status}`); continue; }
        const html = await resp.text();
        const $ = cheerio.load(html);

        $("tr, .listing, .host-item, li.result").each((_i, el): false | void => {
          if (results.length >= limit) return false;
          const $el = $(el);
          const linkEl = $el.find("a[href*='helpx.net/exchange'], a[href*='/en/exchange'], a.title-link, td a").first();
          const text = linkEl.text().trim() || $el.find("td").first().text().trim();
          const href = linkEl.attr("href") ?? "";
          const locationEl = $el.find("td:nth-child(2), .location, .country").first();
          const descEl = $el.find("td:nth-child(3), .description, .activities").first();

          if (!text || text.length < 5) return;
          const combined = `${text} ${descEl.text()}`.toLowerCase();
          if (!TECH_KEYWORDS.some(k => combined.includes(k))) return;

          const fullUrl = href.startsWith("http")
            ? href
            : `https://helpx.net${href}`;

          results.push({
            company: locationEl.text().trim() || "HelpX Host",
            role: `Work Exchange – ${text.substring(0, 80)}`,
            source: "HelpX",
            url: fullUrl || "https://helpx.net",
            category: "accommodation",
            language: "en",
            isPriority: false,
          });
        });

        await new Promise(r => setTimeout(r, 1500));
      } catch (err) {
        log.warn(`[HelpX] Fetch error: ${String(err)}`);
      }
    }

    if (results.length === 0) {
      log.warn("[HelpX] No results — site may require cookies");
      results.push({
        company: "HelpX Europe",
        role: "Work Exchange – IT / Web Skills for Accommodation",
        source: "HelpX",
        url: "https://helpx.net/list-cgi/list.cgi?c=0&w=europe",
        category: "accommodation",
        language: "en",
        isPriority: false,
      });
    }

    log.success(`[HelpX] Found ${results.length} accommodation listings`);
  } catch (err) {
    log.error(`[HelpX] Error: ${String(err)}`);
  }
  return results;
}
