import { log } from "../logs/sseLogger.js";
import type { JobListing } from "../apply/emailApply.js";

const RSS_FEEDS: Record<string, string[]> = {
  parttime: [
    "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss",
    "https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss",
    "https://weworkremotely.com/categories/remote-networking-information-systems-jobs.rss",
  ],
  internships: [
    "https://weworkremotely.com/remote-jobs.rss",
  ],
  accommodation: [],
};

const INTERNSHIP_KEYWORDS = ["intern", "devops", "iot", "network", "cloud", "telecom", "sre"];
const PARTTIME_KEYWORDS = ["devops", "python", "network", "cloud", "sre", "platform", "engineer", "developer"];

function xmlText(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`, "i"));
  return (m?.[1] ?? m?.[2] ?? "").trim();
}

function extractItems(xml: string): string[] {
  const items: string[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(xml)) !== null) {
    items.push(m[1]);
  }
  return items;
}

export async function scrapeWeWorkRemotely(
  category: "internships" | "accommodation" | "parttime",
  limit = 20
): Promise<JobListing[]> {
  if (category === "accommodation") return [];
  const feeds = RSS_FEEDS[category] ?? [];
  const results: JobListing[] = [];
  const keywords = category === "internships" ? INTERNSHIP_KEYWORDS : PARTTIME_KEYWORDS;

  try {
    log.info(`[WeWorkRemotely] Fetching ${category} RSS feeds...`);
    for (const feedUrl of feeds) {
      if (results.length >= limit) break;
      try {
        const resp = await fetch(feedUrl, {
          headers: {
            "User-Agent": "ApplyBlitz/1.0 (ahmedbenkilani3@gmail.com)",
            "Accept": "application/rss+xml, application/xml",
          },
          signal: AbortSignal.timeout(10000),
        });
        if (!resp.ok) { log.warn(`[WeWorkRemotely] Feed returned ${resp.status}: ${feedUrl}`); continue; }
        const xml = await resp.text();
        const items = extractItems(xml);

        for (const item of items) {
          if (results.length >= limit) break;
          const title = xmlText(item, "title");
          const link = xmlText(item, "link") || (item.match(/<link>([^<]+)<\/link>/)?.[1] ?? "");
          const company = xmlText(item, "region") || title.split(" at ").pop() || "Unknown";
          const role = title.includes(" at ") ? title.split(" at ")[0].trim() : title;

          const text = `${title}`.toLowerCase();
          if (category === "parttime" && !keywords.some(k => text.includes(k))) continue;
          if (category === "internships" && !keywords.some(k => text.includes(k))) continue;

          results.push({
            company: company.trim(),
            role: role.trim(),
            source: "WeWorkRemotely",
            url: link.trim(),
            category,
            language: "en",
            isPriority: false,
          });
        }
      } catch (err) {
        log.warn(`[WeWorkRemotely] Feed error: ${String(err)}`);
      }
    }
    log.success(`[WeWorkRemotely] Found ${results.length} ${category} jobs`);
  } catch (err) {
    log.error(`[WeWorkRemotely] Error: ${String(err)}`);
  }
  return results;
}
