import { scrapeRemotive } from "./remotive.js";
import { scrapeRemoteOK } from "./remoteok.js";
import { scrapeJobicy } from "./jobicy.js";
import { scrapeAdzuna } from "./adzuna.js";
import { log } from "../logs/sseLogger.js";
import { createApplication } from "../db/queries.js";
import { isDuplicate, hashUrl } from "../db/database.js";
import { detectLanguage } from "../apply/coverLetter.js";
import { sendEmailApplication, type JobListing } from "../apply/emailApply.js";

const PRIORITY_COMPANIES = ["telnet", "vermeg", "sofrecom"];
const IEEE_BADGE_SOURCES = ["ieee"];
const IAESTE_BADGE_SOURCES = ["iaeste"];

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function randomDelay() { return sleep(2000 + Math.random() * 6000); }

function detectBadge(job: JobListing): string | null {
  const text = `${job.source} ${job.url} ${job.company}`.toLowerCase();
  if (IEEE_BADGE_SOURCES.some(b => text.includes(b))) return "ieee";
  if (IAESTE_BADGE_SOURCES.some(b => text.includes(b))) return "iaeste";
  return null;
}

function isPriorityCompany(company: string): boolean {
  return PRIORITY_COMPANIES.some(p => company.toLowerCase().includes(p));
}

type RunResult = {
  found: number;
  applied: number;
  manual: number;
  failed: number;
  duped: number;
};

export async function runCategory(
  category: "internships" | "accommodation" | "parttime",
  testMode = false,
  targetCount = 50
): Promise<RunResult> {
  log.info(`[Bot] Starting ${category} run (testMode=${testMode}, target=${targetCount})`);
  const result: RunResult = { found: 0, applied: 0, manual: 0, failed: 0, duped: 0 };

  const scrapers = [
    () => scrapeRemotive(category, 25),
    () => scrapeAdzuna(category, 20),
    () => scrapeRemoteOK(category, 15),
    () => scrapeJobicy(category, 15),
  ];

  const allJobs: JobListing[] = [];
  for (const scraper of scrapers) {
    try {
      const jobs = await scraper();
      allJobs.push(...jobs);
    } catch (err) {
      log.error(`[Bot] Scraper error: ${String(err)}`);
    }
  }

  result.found = allJobs.length;
  log.info(`[Bot] ${category}: found ${allJobs.length} jobs total`);

  if (testMode) {
    log.info(`[Bot] Test mode: skipping application, returning preview`);
    return result;
  }

  let processed = 0;
  for (const job of allJobs) {
    if (processed >= targetCount) break;

    const urlHash = hashUrl(job.url, job.role);

    if (isDuplicate(urlHash)) {
      log.skip(`[Dedup] Skipped ${job.company} — applied recently`);
      result.duped++;
      createApplication({
        category,
        company: job.company,
        role: job.role,
        source: job.source,
        url: job.url,
        urlHash,
        status: "duplicate",
        language: job.language ?? detectLanguage(job.company, job.source),
        isPriority: isPriorityCompany(job.company) ? 1 : 0,
        badge: detectBadge(job),
      });
      continue;
    }

    const isPriority = isPriorityCompany(job.company) || (job.isPriority ?? false);
    const language = job.language ?? detectLanguage(job.company, job.source);
    const badge = detectBadge(job);

    if (isPriority) {
      log.warn(`[Priority] ${job.company} → Manual queue (priority target)`);
      createApplication({
        category, company: job.company, role: job.role, source: job.source,
        url: job.url, urlHash, status: "manual", language,
        notes: "Priority target — apply manually with tailored message",
        isPriority: 1, badge,
      });
      result.manual++;
      processed++;
      continue;
    }

    if (job.applyEmail) {
      const emailResult = await sendEmailApplication(job);
      if (emailResult === "sent") {
        createApplication({ category, company: job.company, role: job.role, source: job.source, url: job.url, urlHash, status: "sent", language, isPriority: isPriority ? 1 : 0, badge });
        result.applied++;
        log.success(`[Applied] ${job.company} — ${job.role} via email`);
      } else if (emailResult === "failed") {
        createApplication({ category, company: job.company, role: job.role, source: job.source, url: job.url, urlHash, status: "failed", language, isPriority: isPriority ? 1 : 0, badge });
        result.failed++;
      } else {
        createApplication({ category, company: job.company, role: job.role, source: job.source, url: job.url, urlHash, status: "manual", language, isPriority: isPriority ? 1 : 0, badge });
        result.manual++;
      }
    } else {
      createApplication({ category, company: job.company, role: job.role, source: job.source, url: job.url, urlHash, status: "manual", language, isPriority: isPriority ? 1 : 0, badge });
      result.manual++;
      log.warn(`[Manual] ${job.company} — ${job.role} (no email apply, form-based)`);
    }

    processed++;
    await randomDelay();
  }

  log.success(`[Bot] ${category} done: ${result.applied} sent, ${result.manual} manual, ${result.failed} failed, ${result.duped} duped`);
  return result;
}

export async function runAll(testMode = false): Promise<Record<string, RunResult>> {
  const results: Record<string, RunResult> = {};
  for (const cat of ["internships", "accommodation", "parttime"] as const) {
    results[cat] = await runCategory(cat, testMode);
  }
  return results;
}

export async function runTestPreview(): Promise<JobListing[]> {
  const all: JobListing[] = [];
  for (const cat of ["internships", "accommodation", "parttime"] as const) {
    const [remotive] = await Promise.all([scrapeRemotive(cat, 5)]);
    all.push(...remotive.slice(0, 5).map(j => ({ ...j, category: cat })));
  }
  return all;
}
