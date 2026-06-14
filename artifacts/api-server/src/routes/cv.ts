import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { getConfig, setConfig } from "../db/database.js";
import { log } from "../logs/sseLogger.js";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `cv_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

const router = Router();

router.get("/cv", (_req, res) => {
  const cvPath = getConfig("cv_path");
  if (!cvPath || !fs.existsSync(cvPath)) {
    res.json({ uploaded: false, filename: null, uploadedAt: null, size: null });
    return;
  }
  const stat = fs.statSync(cvPath);
  res.json({
    uploaded: true,
    filename: path.basename(cvPath),
    uploadedAt: stat.mtime.toISOString(),
    size: stat.size,
  });
});

router.post("/cv/upload", upload.single("cv"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  setConfig("cv_path", req.file.path);
  log.success(`[CV] Uploaded: ${req.file.originalname} (${Math.round(req.file.size / 1024)}KB)`);
  const stat = fs.statSync(req.file.path);
  res.json({
    uploaded: true,
    filename: req.file.originalname,
    uploadedAt: stat.mtime.toISOString(),
    size: req.file.size,
  });
});

export default router;
