import { scrapeRemotive } from "./remotive.js";
import { scrapeRemoteOK } from "./remoteok.js";
import { scrapeJobicy } from "./jobicy.js";
import { scrapeAdzuna } from "./adzuna.js";
import { scrapeWeWorkRemotely } from "./weworkremotely.js";
import { scrapeLinkedIn } from "./linkedin.js";
import { scrapeTanitjobs } from "./tanitjobs.js";
import { scrapeEmploiNat } from "./emploinat.js";
import { scrapeWorkaway } from "./workaway.js";
import { scrapeHelpX } from "./helpx.js";
import { scrapeWWOOF } from "./wwoof.js";
import { closeBrowser } from "./playwrightBrowser.js";
import { log } from "../logs/sseLogger.js";
import { createApplication } from "../db/queries.js";
import { isDuplicate, hashUrl } from "../db/database.js";
import { detectLanguage } from "../apply/coverLetter.js";
import { sendEmailApplication, type JobListing } from "../apply/emailApply.js";

const PRIORITY_COMPANIES = ["telnet", "vermeg", "sofrecom"];
const IEEE_BADGE_SOURCES = ["ieee"];
const IAESTE_BADGE_SOURCES = ["iaeste"];

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function randomDelay() { return sleep(2000 + Math.random() * 5000); }

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

type ScraperFn = (cat: "internships" | "accommodation" | "parttime", limit: number) => Promise<JobListing[]>;

function buildScrapers(category: "internships" | "accommodation" | "parttime"): { fn: ScraperFn; limit: number }[] {
  if (category === "internships") {
    return [
      { fn: scrapeTanitjobs,   limit: 12 },
      { fn: scrapeEmploiNat,   limit: 10 },
      { fn: scrapeRemotive,    limit: 10 },
      { fn: scrapeAdzuna,      limit: 8  },
      { fn: scrapeLinkedIn,    limit: 8  },
      { fn: scrapeWeWorkRemotely, limit: 6 },
      { fn: scrapeRemoteOK,    limit: 4  },
      { fn: scrapeJobicy,      limit: 4  },
    ];
  }
  if (category === "accommodation") {
    return [
      { fn: scrapeWorkaway,    limit: 20 },
      { fn: scrapeWWOOF,       limit: 15 },
      { fn: scrapeHelpX,       limit: 15 },
    ];
  }
  if (category === "parttime") {
    return [
      { fn: scrapeRemotive,    limit: 12 },
      { fn: scrapeRemoteOK,    limit: 10 },
      { fn: scrapeWeWorkRemotely, limit: 10 },
      { fn: scrapeJobicy,      limit: 8  },
      { fn: scrapeAdzuna,      limit: 8  },
      { fn: scrapeLinkedIn,    limit: 6  },
    ];
  }
  return [];
}

export async function runCategory(
  category: "internships" | "accommodation" | "parttime",
  testMode = false,
  targetCount = 50
): Promise<RunResult> {
  log.info(`[Bot] ▶ Starting ${category} run (testMode=${testMode}, target=${targetCount})`);
  const result: RunResult = { found: 0, applied: 0, manual: 0, failed: 0, duped: 0 };

  const scrapers = buildScrapers(category);
  const allJobs: JobListing[] = [];

  for (const { fn, limit } of scrapers) {
    try {
      const jobs = await fn(category, limit);
      allJobs.push(...jobs);
    } catch (err) {
      log.error(`[Bot] Scraper error: ${String(err)}`);
    }
  }

  result.found = allJobs.length;
  log.info(`[Bot] ${category}: found ${allJobs.length} total jobs from ${scrapers.length} sources`);

  if (testMode) {
    log.info(`[Bot] Test mode active — skipping all applications`);
    return result;
  }

  let processed = 0;
  for (const job of allJobs) {
    if (processed >= targetCount) break;

    const urlHash = hashUrl(job.url, job.role);

    if (isDuplicate(urlHash)) {
      log.skip(`[Dedup] Skipped ${job.company} — applied within 30 days`);
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
        badge: detectBadge(job) ?? undefined,
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
        isPriority: 1, badge: badge ?? undefined,
      });
      result.manual++;
      processed++;
      continue;
    }

    if (job.applyEmail) {
      const emailResult = await sendEmailApplication(job);
      if (emailResult === "sent") {
        createApplication({
          category, company: job.company, role: job.role, source: job.source,
          url: job.url, urlHash, status: "sent", language, isPriority: 0, badge: badge ?? undefined,
        });
        result.applied++;
        log.success(`[Applied] ✓ ${job.company} — ${job.role} via email`);
      } else if (emailResult === "failed") {
        createApplication({
          category, company: job.company, role: job.role, source: job.source,
          url: job.url, urlHash, status: "failed", language, isPriority: 0, badge: badge ?? undefined,
        });
        result.failed++;
        log.error(`[Failed] ✗ ${job.company} — ${job.role}`);
      } else if (emailResult === "no-smtp") {
        createApplication({
          category, company: job.company, role: job.role, source: job.source,
          url: job.url, urlHash, status: "manual", language, isPriority: 0, badge: badge ?? undefined,
          notes: "SMTP not configured — apply manually",
        });
        result.manual++;
      } else {
        createApplication({
          category, company: job.company, role: job.role, source: job.source,
          url: job.url, urlHash, status: "manual", language, isPriority: 0, badge: badge ?? undefined,
        });
        result.manual++;
      }
    } else {
      createApplication({
        category, company: job.company, role: job.role, source: job.source,
        url: job.url, urlHash, status: "manual", language, isPriority: 0, badge: badge ?? undefined,
        notes: category === "accommodation"
          ? "Accommodation host — contact via platform profile"
          : "Form-based application — apply via job listing link",
      });
      result.manual++;
      log.warn(`[Manual] ${job.company} — ${job.role} (${job.source})`);
    }

    processed++;
    await randomDelay();
  }

  log.success(
    `[Bot] ✓ ${category} done — ${result.applied} sent, ${result.manual} manual, ${result.failed} failed, ${result.duped} duped`
  );
  return result;
}

export async function runAll(testMode = false): Promise<Record<string, RunResult>> {
  const results: Record<string, RunResult> = {};
  try {
    for (const cat of ["internships", "accommodation", "parttime"] as const) {
      results[cat] = await runCategory(cat, testMode);
    }
  } finally {
    await closeBrowser();
  }
  return results;
}

export async function runTestPreview(): Promise<JobListing[]> {
  const all: JobListing[] = [];
  try {
    for (const cat of ["internships", "accommodation", "parttime"] as const) {
      const [remotive, wwr] = await Promise.all([
        scrapeRemotive(cat, 3),
        scrapeWeWorkRemotely(cat, 2),
      ]);
      all.push(...remotive.slice(0, 3).map(j => ({ ...j, category: cat })));
      all.push(...wwr.slice(0, 2).map(j => ({ ...j, category: cat })));
    }
  } catch (err) {
    log.error(`[Test] Preview error: ${String(err)}`);
  }
  return all;
}
