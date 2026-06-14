import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { getConfig } from "../db/database.js";
import { renderCoverLetter, detectLanguage, buildProfileVars } from "./coverLetter.js";
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
  const port = parseInt(getConfig("smtp_port") ?? "587", 10);
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

function getCvPath(): string | null {
  const cvPath = getConfig("cv_path");
  if (!cvPath || !fs.existsSync(cvPath)) return null;
  return cvPath;
}

function buildHtmlEmail(lang: "fr" | "en", role: string, company: string, bodyText: string): string {
  const vars = buildProfileVars();
  const accentColor = "#58A6FF";
  const bgColor = "#0D1117";
  const surfaceColor = "#161B22";
  const textColor = "#E6EDF3";
  const mutedColor = "#8B949E";

  const greeting = lang === "fr"
    ? "Madame, Monsieur,"
    : "Dear Hiring Team,";

  const subjectLine = lang === "fr"
    ? `Candidature — ${role} | ${vars.name}, ${vars.university}`
    : `Application — ${role} | ${vars.name}, INSAT Tunis`;

  const htmlBody = bodyText
    .split("\n")
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return "<br/>";
      if (trimmed.startsWith("Objet :") || trimmed.startsWith("Subject:")) return "";
      if (trimmed === greeting) return `<p style="color:${textColor};margin:0 0 16px;">${trimmed}</p>`;
      return `<p style="color:${textColor};margin:0 0 12px;line-height:1.6;">${trimmed}</p>`;
    })
    .filter(Boolean)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${subjectLine}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:${surfaceColor};border-radius:8px;overflow:hidden;border:1px solid #30363D;max-width:600px;">

        <!-- Header -->
        <tr>
          <td style="background:${bgColor};padding:24px 32px;border-bottom:2px solid ${accentColor};">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="color:${accentColor};font-size:18px;font-weight:700;letter-spacing:-0.5px;">ApplyBlitz</span>
                  <span style="color:${mutedColor};font-size:12px;margin-left:8px;">automated application</span>
                </td>
                <td align="right">
                  <span style="color:${mutedColor};font-size:12px;">${vars.date_en}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Role badge -->
        <tr>
          <td style="background:${bgColor};padding:16px 32px 0;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:${accentColor}22;border:1px solid ${accentColor}44;border-radius:4px;padding:6px 12px;">
                  <span style="color:${accentColor};font-size:13px;font-weight:600;">${role}</span>
                  <span style="color:${mutedColor};font-size:13px;"> @ ${company}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:${bgColor};padding:24px 32px;color:${textColor};font-size:14px;line-height:1.7;">
            ${htmlBody}
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="background:${bgColor};padding:0 32px;"><hr style="border:none;border-top:1px solid #30363D;margin:0;"/></td></tr>

        <!-- Footer / signature -->
        <tr>
          <td style="background:${bgColor};padding:20px 32px 24px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:16px;vertical-align:top;">
                  <div style="width:44px;height:44px;background:${accentColor}22;border:1px solid ${accentColor}44;border-radius:50%;text-align:center;line-height:44px;">
                    <span style="color:${accentColor};font-weight:700;font-size:18px;">A</span>
                  </div>
                </td>
                <td>
                  <p style="margin:0 0 4px;color:${textColor};font-weight:600;font-size:14px;">${vars.name}</p>
                  <p style="margin:0 0 4px;color:${mutedColor};font-size:12px;">${vars.university}</p>
                  <p style="margin:0 0 4px;font-size:12px;">
                    <a href="mailto:${vars.email}" style="color:${accentColor};text-decoration:none;">${vars.email}</a>
                    ${vars.phone ? `<span style="color:${mutedColor}"> · ${vars.phone}</span>` : ""}
                  </p>
                  <p style="margin:0;font-size:12px;">
                    <a href="https://${vars.portfolio}" style="color:${accentColor};text-decoration:none;">${vars.portfolio}</a>
                    <span style="color:${mutedColor}"> · </span>
                    <a href="https://${vars.github}" style="color:${accentColor};text-decoration:none;">${vars.github}</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Bottom bar -->
        <tr>
          <td style="background:${surfaceColor};padding:10px 32px;border-top:1px solid #30363D;">
            <p style="margin:0;color:${mutedColor};font-size:11px;text-align:center;">
              Sent via ApplyBlitz · ${vars.availability}
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendEmailApplication(
  job: JobListing
): Promise<"sent" | "failed" | "no-email" | "no-smtp"> {
  if (!job.applyEmail) return "no-email";

  const transporter = getTransporter();
  if (!transporter) return "no-smtp";

  const lang = job.language ?? detectLanguage(job.company, job.source);
  const bodyText = renderCoverLetter(lang, job.role, job.company);
  const cvPath = getCvPath();
  const vars = buildProfileVars();

  const subject =
    lang === "fr"
      ? `Candidature stage ${job.role} — ${vars.name}, RT3 INSAT`
      : `Internship Application — ${job.role} | ${vars.name}, INSAT Tunis`;

  const html = buildHtmlEmail(lang, job.role, job.company, bodyText);

  const attachments = cvPath
    ? [{ filename: path.basename(cvPath), path: cvPath, contentType: "application/pdf" }]
    : [];

  try {
    await transporter.sendMail({
      from: `"${vars.name}" <${getConfig("smtp_user") ?? vars.email}>`,
      to: job.applyEmail,
      subject,
      text: bodyText,
      html,
      attachments,
      headers: {
        "X-Mailer": "ApplyBlitz/1.0",
        "X-Source-Category": job.category,
        "X-Source-Site": job.source,
      },
    });
    log.success(`[EMAIL] ✓ Sent to ${job.company} <${job.applyEmail}> — ${job.role}`);
    return "sent";
  } catch (err) {
    log.error(`[EMAIL] ✗ Failed → ${job.company}: ${String(err)}`);
    return "failed";
  }
}

export async function testSmtpConnection(): Promise<{ ok: boolean; error?: string }> {
  const transporter = getTransporter();
  if (!transporter) return { ok: false, error: "SMTP not configured" };
  try {
    await transporter.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
