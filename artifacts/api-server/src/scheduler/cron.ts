import cron from "node-cron";
import { getConfig } from "../db/database.js";
import { runAll } from "../scrapers/index.js";
import { log } from "../logs/sseLogger.js";

let currentTask: cron.ScheduledTask | null = null;
export let isRunning = false;
export let lastRun: string | null = null;
export let nextRun: string | null = null;
export const currentProgress: Record<string, number> = { internships: 0, accommodation: 0, parttime: 0 };

export function startScheduler() {
  if (currentTask) { currentTask.destroy(); currentTask = null; }

  const enabled = getConfig("schedule_enabled") !== "false";
  if (!enabled) { log.info("[Scheduler] Disabled"); return; }

  const time = getConfig("schedule_time") ?? "08:00";
  const [hour, minute] = time.split(":").map(Number);
  const cronExpr = `${minute} ${hour} * * *`;

  log.info(`[Scheduler] Scheduling daily run at ${time} (UTC+1)`);

  currentTask = cron.schedule(cronExpr, async () => {
    if (isRunning) { log.warn("[Scheduler] Already running, skipping"); return; }
    log.info("[Scheduler] Daily run triggered");
    await executeRun();
  }, { timezone: "Africa/Tunis" });

  updateNextRun(hour, minute);
}

function updateNextRun(hour: number, minute: number) {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  nextRun = next.toISOString();
}

export async function executeRun() {
  if (isRunning) return;
  isRunning = true;
  currentProgress.internships = 0;
  currentProgress.accommodation = 0;
  currentProgress.parttime = 0;

  try {
    log.info("[Bot] Starting full run — 150 applications target");
    await runAll(false);
    lastRun = new Date().toISOString();
    log.success("[Bot] Daily run complete");
  } catch (err) {
    log.error(`[Bot] Run failed: ${String(err)}`);
  } finally {
    isRunning = false;
    const time = getConfig("schedule_time") ?? "08:00";
    const [h, m] = time.split(":").map(Number);
    updateNextRun(h, m);
  }
}

export function restartScheduler() {
  startScheduler();
}

export function getSchedulerStatus() {
  return { isRunning, lastRun, nextRun, currentProgress: { ...currentProgress } };
}
