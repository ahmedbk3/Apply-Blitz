import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { getConfig } from "../db/database.js";
import { renderCoverLetter, detectLanguage } from "./coverLetter.js";
import { log } from "../logs/sseLogger.js";

export interface JobListing {
  company: string;
  role: string;
  source: string;
  url: string;
  category: string;
  applyEmail?: string;
  language?: "fr" | "en";
  isPriority?: boolean;
  badge?: string;
}

function getTransporter() {
  const host = getConfig("smtp_host");
  const user = getConfig("smtp_user");
  const pass = getConfig("smtp_pass");
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({ host, port: 587, secure: false, auth: { user, pass } });
}

function getCvPath(): string | null {
  const cvPath = getConfig("cv_path");
  if (!cvPath || !fs.existsSync(cvPath)) return null;
  return cvPath;
}

export async function sendEmailApplication(job: JobListing): Promise<"sent" | "failed" | "no-email" | "no-smtp"> {
  if (!job.applyEmail) return "no-email";

  const transporter = getTransporter();
  if (!transporter) return "no-smtp";

  const lang = job.language ?? detectLanguage(job.company, job.source);
  const rendered = renderCoverLetter(lang, job.role, job.company);
  const cvPath = getCvPath();

  const subject = lang === "fr"
    ? `Candidature stage ${job.role} — Ahmed Ben Kilani, RT3 INSAT`
    : `Internship Application — ${job.role} | Ahmed Ben Kilani, INSAT Tunis`;

  const attachments = cvPath
    ? [{ filename: path.basename(cvPath), path: cvPath, contentType: "application/pdf" }]
    : [];

  try {
    await transporter.sendMail({
      from: getConfig("smtp_user") ?? "ahmedbenkilani3@gmail.com",
      to: job.applyEmail,
      subject,
      text: rendered,
      attachments,
    });
    log.success(`[EMAIL] Sent to ${job.company} (${job.applyEmail}) for ${job.role}`);
    return "sent";
  } catch (err) {
    log.error(`[EMAIL] Failed sending to ${job.company}: ${String(err)}`);
    return "failed";
  }
}
