import { Router } from "express";
import { runCategory, runAll, runTestPreview } from "../scrapers/index.js";
import { getSchedulerStatus, executeRun } from "../scheduler/cron.js";
import { detectLanguage } from "../apply/coverLetter.js";
import { testSmtpConnection } from "../apply/emailApply.js";
import { log } from "../logs/sseLogger.js";

const router = Router();
let activeRunPromise: Promise<void> | null = null;

router.post("/jobs/run", async (req, res) => {
  const { category, testMode } = req.body as { category: string; testMode?: boolean };
  if (!["internships", "accommodation", "parttime"].includes(category)) {
    res.status(400).json({ error: "Invalid category" });
    return;
  }
  const status = getSchedulerStatus();
  if (status.isRunning) {
    res.json({ started: false, message: "A run is already in progress", runId: null });
    return;
  }
  log.info(`[API] Manual run triggered: ${category}`);
  const cat = category as "internships" | "accommodation" | "parttime";
  activeRunPromise = runCategory(cat, testMode ?? false).then(() => { activeRunPromise = null; });
  res.json({ started: true, message: `Run started for ${category}`, runId: `manual-${Date.now()}` });
});

router.post("/jobs/run-all", async (_req, res) => {
  const status = getSchedulerStatus();
  if (status.isRunning) {
    res.json({ started: false, message: "A run is already in progress", runId: null });
    return;
  }
  log.info(`[API] Run all triggered`);
  activeRunPromise = executeRun().then(() => { activeRunPromise = null; });
  res.json({ started: true, message: "Full run started (150 target)", runId: `run-all-${Date.now()}` });
});

router.post("/jobs/test", async (_req, res) => {
  log.info("[Test] Running test mode — preview only, no applications sent");
  const jobs = await runTestPreview();
  res.json({
    jobs: jobs.map(j => ({
      company: j.company,
      role: j.role,
      source: j.source,
      url: j.url,
      category: j.category,
      language: j.language ?? detectLanguage(j.company, j.source),
      wouldApply: !!j.applyEmail,
    })),
    message: `Found ${jobs.length} jobs across all categories (test mode — no applications sent)`,
  });
});

router.get("/jobs/status", (_req, res) => {
  const s = getSchedulerStatus();
  res.json({
    isRunning: s.isRunning,
    activeCategories: s.isRunning ? ["internships", "accommodation", "parttime"] : [],
    lastRun: s.lastRun,
    nextRun: s.nextRun,
    currentProgress: s.currentProgress,
  });
});

router.post("/smtp/test", async (_req, res) => {
  const result = await testSmtpConnection();
  res.json(result);
});

router.post("/digest/send", async (_req, res) => {
  const { sendDailyDigest } = await import("../notifications/emailDigest.js");
  const sent = await sendDailyDigest();
  res.json({ sent, message: sent ? "Digest sent successfully" : "Failed to send digest (check SMTP config)" });
});

export default router;
