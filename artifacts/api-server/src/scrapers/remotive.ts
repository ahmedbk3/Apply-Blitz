import { log } from "../logs/sseLogger.js";
import type { JobListing } from "../apply/emailApply.js";

const REMOTIVE_API = "https://remotive.com/api/remote-jobs";

const INTERNSHIP_TAGS = ["devops", "cloud", "iot", "network", "telecom", "cybersecurity", "python", "sre", "platform"];
const PARTTIME_TAGS = ["devops", "python", "network", "cloud"];
const ACCOMMODATION_TAGS = ["housing", "accommodation"];

export async function scrapeRemotive(category: "internships" | "accommodation" | "parttime", limit = 20): Promise<JobListing[]> {
  const results: JobListing[] = [];

  try {
    log.info(`[Remotive] Fetching ${category} jobs...`);
    const resp = await fetch(`${REMOTIVE_API}?limit=100`);
    if (!resp.ok) { log.warn(`[Remotive] API returned ${resp.status}`); return []; }

    const data = await resp.json() as { jobs: RemotiveJob[] };
    const jobs = data.jobs ?? [];

    for (const job of jobs) {
      if (results.length >= limit) break;
      if (!matchesCategory(job, category)) continue;

      results.push({
        company: job.company_name,
        role: job.title,
        source: "Remotive",
        url: job.url,
        category,
        language: "en",
        isPriority: false,
      });
    }

    log.success(`[Remotive] Found ${results.length} ${category} jobs`);
  } catch (err) {
    log.error(`[Remotive] Error: ${String(err)}`);
  }

  return results;
}

function matchesCategory(job: RemotiveJob, category: string): boolean {
  const text = `${job.title} ${job.tags?.join(" ") ?? ""} ${job.job_type}`.toLowerCase();

  if (category === "internships") {
    return INTERNSHIP_TAGS.some(t => text.includes(t)) || text.includes("intern");
  }
  if (category === "parttime") {
    return (text.includes("part") || text.includes("contractor") || text.includes("freelance")) &&
      PARTTIME_TAGS.some(t => text.includes(t));
  }
  if (category === "accommodation") {
    return ACCOMMODATION_TAGS.some(t => text.includes(t));
  }
  return false;
}

interface RemotiveJob {
  id: number;
  title: string;
  company_name: string;
  url: string;
  tags: string[];
  job_type: string;
}
