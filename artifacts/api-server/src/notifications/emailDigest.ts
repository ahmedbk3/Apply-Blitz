import nodemailer from "nodemailer";
import { getConfig } from "../db/database.js";
import { getApplicationStats } from "../db/queries.js";
import { log } from "../logs/sseLogger.js";

export async function sendDailyDigest(): Promise<boolean> {
  const host = getConfig("smtp_host");
  const user = getConfig("smtp_user");
  const pass = getConfig("smtp_pass");
  const recipient = getConfig("user_email") ?? "ahmedbenkilani3@gmail.com";

  if (!host || !user || !pass) {
    log.warn("[Digest] SMTP not configured, skipping digest");
    return false;
  }

  const stats = getApplicationStats();
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const subject = `ApplyBlitz — Daily Report ${date}: ${stats.todayAutoApplied} sent, ${stats.todayManualQueue} in queue`;
  const text = `
ApplyBlitz Daily Report — ${date}
=====================================

Today's Summary:
  Total sent today:    ${stats.todayAutoApplied}
  In manual queue:     ${stats.todayManualQueue}
  Failed:              ${stats.todayFailed}
  Total processed:     ${stats.todayTotal} / ${stats.todayTarget}

By Category:
  Internships:   ${stats.byCategory.internships.sent} sent, ${stats.byCategory.internships.manual} manual
  Accommodation: ${stats.byCategory.accommodation.sent} sent, ${stats.byCategory.accommodation.manual} manual
  Part-time:     ${stats.byCategory.parttime.sent} sent, ${stats.byCategory.parttime.manual} manual

All-time Stats:
  Total applied: ${stats.allTimeAutoApplied} / ${stats.allTimeTotal}
  Success rate:  ${stats.successRate}%

---
ApplyBlitz • ahmedbk3.github.io
  `.trim();

  try {
    const transporter = nodemailer.createTransport({ host, port: 587, secure: false, auth: { user, pass } });
    await transporter.sendMail({ from: user, to: recipient, subject, text });
    log.success(`[Digest] Daily report sent to ${recipient}`);
    return true;
  } catch (err) {
    log.error(`[Digest] Failed: ${String(err)}`);
    return false;
  }
}
