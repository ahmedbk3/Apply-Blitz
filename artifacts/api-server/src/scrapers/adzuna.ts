import { log } from "../logs/sseLogger.js";
import { getConfig } from "../db/database.js";
import type { JobListing } from "../apply/emailApply.js";

const BASE = "https://api.adzuna.com/v1/api/jobs";

const CATEGORY_PARAMS: Record<string, { what: string; country: string }[]> = {
  internships: [
    { what: "IoT internship", country: "gb" },
    { what: "DevOps intern", country: "gb" },
    { what: "Cloud intern", country: "us" },
    { what: "Network engineer intern", country: "fr" },
  ],
  parttime: [
    { what: "DevOps part time remote", country: "gb" },
    { what: "Python developer part time", country: "gb" },
    { what: "Network engineer remote", country: "us" },
  ],
  accommodation: [],
};

export async function scrapeAdzuna(category: "internships" | "accommodation" | "parttime", limit = 20): Promise<JobListing[]> {
  const apiKey = getConfig("adzuna_api_key");
  const appId = getConfig("adzuna_app_id");

  if (!apiKey || !appId) {
    log.warn(`[Adzuna] API key not configured — skipping`);
    return [];
  }

  const queries = CATEGORY_PARAMS[category] ?? [];
  if (!queries.length) return [];

  const results: JobListing[] = [];

  for (const query of queries) {
    if (results.length >= limit) break;
    try {
      const url = new URL(`${BASE}/${query.country}/search/1`);
      url.searchParams.set("app_id", appId);
      url.searchParams.set("app_key", apiKey);
      url.searchParams.set("what", query.what);
      url.searchParams.set("results_per_page", "10");
      url.searchParams.set("full_time", category === "parttime" ? "0" : "1");

      const resp = await fetch(url.toString());
      if (!resp.ok) { log.warn(`[Adzuna] ${query.what}: ${resp.status}`); continue; }

      const data = await resp.json() as { results?: AdzunaJob[] };
      for (const job of data.results ?? []) {
        if (results.length >= limit) break;
        results.push({
          company: job.company?.display_name ?? "Unknown",
          role: job.title ?? "Unknown Role",
          source: "Adzuna",
          url: job.redirect_url ?? "",
          category,
          language: query.country === "fr" || query.country === "tn" ? "fr" : "en",
          isPriority: false,
        });
      }
    } catch (err) {
      log.error(`[Adzuna] ${query.what}: ${String(err)}`);
    }
    await sleep(1000);
  }

  log.success(`[Adzuna] Found ${results.length} ${category} jobs`);
  return results;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

interface AdzunaJob {
  id?: string;
  title?: string;
  company?: { display_name?: string };
  redirect_url?: string;
  location?: { display_name?: string };
}
