import { log } from "../logs/sseLogger.js";
import type { JobListing } from "../apply/emailApply.js";

const REMOTEOK_API = "https://remoteok.com/remote-jobs.json";
const KEYWORDS = ["devops", "python", "iot", "network", "cloud", "sre", "platform", "telecom"];

export async function scrapeRemoteOK(category: "internships" | "accommodation" | "parttime", limit = 20): Promise<JobListing[]> {
  if (category !== "parttime") return [];
  const results: JobListing[] = [];

  try {
    log.info(`[RemoteOK] Fetching jobs...`);
    const resp = await fetch(REMOTEOK_API, {
      headers: { "User-Agent": "ApplyBlitz/1.0 (ahmedbenkilani3@gmail.com)" },
    });
    if (!resp.ok) { log.warn(`[RemoteOK] API returned ${resp.status}`); return []; }

    const raw = await resp.json() as RemoteOKJob[];
    const jobs = Array.isArray(raw) ? raw.filter(j => j.slug) : [];

    for (const job of jobs) {
      if (results.length >= limit) break;
      const text = `${job.position ?? ""} ${(job.tags ?? []).join(" ")}`.toLowerCase();
      if (!KEYWORDS.some(k => text.includes(k))) continue;

      results.push({
        company: job.company ?? "Unknown",
        role: job.position ?? "Remote Job",
        source: "RemoteOK",
        url: `https://remoteok.com/l/${job.slug}`,
        category,
        language: "en",
        isPriority: false,
      });
    }

    log.success(`[RemoteOK] Found ${results.length} jobs`);
  } catch (err) {
    log.error(`[RemoteOK] Error: ${String(err)}`);
  }

  return results;
}

interface RemoteOKJob {
  slug?: string;
  company?: string;
  position?: string;
  tags?: string[];
  apply_url?: string;
  date?: string;
}
