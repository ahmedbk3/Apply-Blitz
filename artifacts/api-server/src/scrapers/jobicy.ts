import { log } from "../logs/sseLogger.js";
import type { JobListing } from "../apply/emailApply.js";

const JOBICY_API = "https://jobicy.com/api/v2/remote-jobs?count=50&tag=devops";

export async function scrapeJobicy(category: "internships" | "accommodation" | "parttime", limit = 15): Promise<JobListing[]> {
  if (category !== "parttime") return [];
  const results: JobListing[] = [];

  try {
    log.info(`[Jobicy] Fetching part-time jobs...`);
    const resp = await fetch(JOBICY_API, {
      headers: { "User-Agent": "ApplyBlitz/1.0" },
    });
    if (!resp.ok) { log.warn(`[Jobicy] API returned ${resp.status}`); return []; }

    const data = await resp.json() as { jobs?: JobicyJob[] };
    const jobs = data.jobs ?? [];

    for (const job of jobs) {
      if (results.length >= limit) break;
      results.push({
        company: job.companyName ?? "Unknown",
        role: job.jobTitle ?? "Remote Position",
        source: "Jobicy",
        url: job.url ?? "",
        category,
        language: "en",
        isPriority: false,
      });
    }

    log.success(`[Jobicy] Found ${results.length} jobs`);
  } catch (err) {
    log.error(`[Jobicy] Error: ${String(err)}`);
  }

  return results;
}

interface JobicyJob {
  id?: number;
  companyName?: string;
  jobTitle?: string;
  url?: string;
  jobType?: string;
  jobCategory?: string;
}
