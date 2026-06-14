import { Router } from "express";
import { listPriorityTargets, getPriorityTarget, updatePriorityTarget } from "../db/queries.js";
import { log } from "../logs/sseLogger.js";

const router = Router();

router.get("/priority-targets", (_req, res) => {
  res.json(listPriorityTargets());
});

router.post("/priority-targets/:id/check", async (req, res) => {
  const id = Number(req.params.id);
  const target = getPriorityTarget(id);
  if (!target) { res.status(404).json({ error: "Not found" }); return; }

  log.info(`[Priority] Checking ${target.company} careers page...`);
  const now = new Date().toISOString();

  try {
    const resp = await fetch(target.careersUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36" },
      signal: AbortSignal.timeout(10000),
    });
    const status = resp.ok ? "accessible" : `error-${resp.status}`;
    const updated = updatePriorityTarget(id, {
      lastChecked: now,
      status,
      notes: `Last checked: ${new Date(now).toLocaleString()}. Status: ${status}. Apply manually via the link.`,
    });
    log.success(`[Priority] ${target.company}: ${status}`);
    res.json(updated);
  } catch (err) {
    const updated = updatePriorityTarget(id, {
      lastChecked: now,
      status: "unreachable",
      notes: `Failed to reach: ${String(err)}`,
    });
    log.warn(`[Priority] ${target.company}: unreachable`);
    res.json(updated);
  }
});

export default router;
