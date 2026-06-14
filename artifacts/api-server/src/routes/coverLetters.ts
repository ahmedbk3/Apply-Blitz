import { Router } from "express";
import { getConfig, setConfig } from "../db/database.js";
import { renderCoverLetter } from "../apply/coverLetter.js";

const router = Router();

router.get("/cover-letters", (_req, res) => {
  res.json({
    fr: getConfig("cover_letter_fr") ?? "",
    en: getConfig("cover_letter_en") ?? "",
  });
});

router.put("/cover-letters", (req, res) => {
  const { fr, en } = req.body as { fr?: string; en?: string };
  if (fr !== undefined) setConfig("cover_letter_fr", fr);
  if (en !== undefined) setConfig("cover_letter_en", en);
  res.json({
    fr: getConfig("cover_letter_fr") ?? "",
    en: getConfig("cover_letter_en") ?? "",
  });
});

router.post("/cover-letters/preview", (req, res) => {
  const { language, role, company } = req.body as { language: "fr" | "en"; role: string; company: string };
  if (!["fr", "en"].includes(language)) { res.status(400).json({ error: "Invalid language" }); return; }
  const rendered = renderCoverLetter(language, role, company);
  res.json({ rendered, language });
});

export default router;
