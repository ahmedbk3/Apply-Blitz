import { Router } from "express";
import {
  listApplications,
  createApplication,
  getApplication,
  updateApplication,
  deleteApplication,
  getManualQueue,
  getApplicationStats,
} from "../db/queries.js";
import { hashUrl } from "../db/database.js";
import { detectLanguage } from "../apply/coverLetter.js";

const router = Router();

router.get("/applications", (req, res) => {
  const { category, status, language, limit, offset } = req.query as Record<string, string>;
  const apps = listApplications({
    category,
    status,
    language,
    limit: limit ? Number(limit) : 100,
    offset: offset ? Number(offset) : 0,
  });
  res.json(apps);
});

router.post("/applications", (req, res) => {
  const { category, company, role, source, url, status, language, notes, isPriority, badge } = req.body;
  const urlHash = hashUrl(url, role);
  const lang = language ?? detectLanguage(company, source);
  const app = createApplication({ category, company, role, source, url, urlHash, status, language: lang, notes, isPriority, badge });
  res.status(201).json(app);
});

router.get("/applications/stats", (_req, res) => {
  res.json(getApplicationStats());
});

router.get("/applications/manual-queue", (_req, res) => {
  res.json(getManualQueue());
});

router.patch("/applications/:id", (req, res) => {
  const id = Number(req.params.id);
  const updated = updateApplication(id, req.body);
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/applications/:id", (req, res) => {
  const id = Number(req.params.id);
  const existing = getApplication(id);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  deleteApplication(id);
  res.status(204).send();
});

export default router;
