import { Router } from "express";
import { getConfig, setConfig, getAllConfig } from "../db/database.js";
import { getSchedulerStatus, restartScheduler } from "../scheduler/cron.js";

const router = Router();

router.get("/config", (_req, res) => {
  const conf = getAllConfig();
  res.json({
    smtpHost: conf.smtp_host ?? "",
    smtpUser: conf.smtp_user ?? "",
    smtpConfigured: !!(conf.smtp_host && conf.smtp_user && conf.smtp_pass),
    adzunaApiKey: conf.adzuna_api_key ?? "",
    adzunaConfigured: !!conf.adzuna_api_key,
    scheduleTime: conf.schedule_time ?? "08:00",
    cvPath: conf.cv_path ?? null,
    onboardingComplete: conf.onboarding_complete === "true",
  });
});

router.put("/config", (req, res) => {
  const { smtpHost, smtpUser, smtpPass, adzunaApiKey, scheduleTime } = req.body as Record<string, string>;
  if (smtpHost !== undefined) setConfig("smtp_host", smtpHost);
  if (smtpUser !== undefined) setConfig("smtp_user", smtpUser);
  if (smtpPass !== undefined) setConfig("smtp_pass", smtpPass);
  if (adzunaApiKey !== undefined) setConfig("adzuna_api_key", adzunaApiKey);
  if (scheduleTime !== undefined) {
    setConfig("schedule_time", scheduleTime);
    restartScheduler();
  }
  const conf = getAllConfig();
  res.json({
    smtpHost: conf.smtp_host ?? "",
    smtpUser: conf.smtp_user ?? "",
    smtpConfigured: !!(conf.smtp_host && conf.smtp_user && conf.smtp_pass),
    adzunaApiKey: conf.adzuna_api_key ?? "",
    adzunaConfigured: !!conf.adzuna_api_key,
    scheduleTime: conf.schedule_time ?? "08:00",
    cvPath: conf.cv_path ?? null,
    onboardingComplete: conf.onboarding_complete === "true",
  });
});

router.get("/profile", (_req, res) => {
  const c = getAllConfig();
  res.json({
    name: c.user_name ?? "",
    email: c.user_email ?? "",
    phone: c.user_phone ?? null,
    location: c.user_location ?? "",
    university: c.user_university ?? "",
    specialization: c.user_specialization ?? "",
    priorExperience: c.user_prior_experience ?? "",
    skills: c.user_skills ?? "",
    portfolio: c.user_portfolio ?? "",
    github: c.user_github ?? "",
    languages: c.user_languages ?? "",
    availability: c.user_availability ?? "",
  });
});

router.put("/profile", (req, res) => {
  const fields: Record<string, string> = {
    name: "user_name", email: "user_email", phone: "user_phone",
    location: "user_location", university: "user_university",
    specialization: "user_specialization", priorExperience: "user_prior_experience",
    skills: "user_skills", portfolio: "user_portfolio", github: "user_github",
    languages: "user_languages", availability: "user_availability",
  };
  for (const [field, key] of Object.entries(fields)) {
    if (req.body[field] !== undefined) setConfig(key, req.body[field]);
  }
  const c = getAllConfig();
  res.json({
    name: c.user_name ?? "", email: c.user_email ?? "", phone: c.user_phone ?? null,
    location: c.user_location ?? "", university: c.user_university ?? "",
    specialization: c.user_specialization ?? "", priorExperience: c.user_prior_experience ?? "",
    skills: c.user_skills ?? "", portfolio: c.user_portfolio ?? "",
    github: c.user_github ?? "", languages: c.user_languages ?? "",
    availability: c.user_availability ?? "",
  });
});

router.get("/onboarding/status", (_req, res) => {
  const complete = getConfig("onboarding_complete") === "true";
  const missing: string[] = [];
  if (!getConfig("smtp_host")) missing.push("smtp");
  if (!getConfig("cv_path")) missing.push("cv");
  if (!getConfig("user_phone")) missing.push("phone");
  res.json({ complete, missingFields: missing });
});

router.post("/onboarding/complete", (req, res) => {
  const { profile, smtpHost, smtpUser, smtpPass, adzunaApiKey, coverLetterFr, coverLetterEn } = req.body;
  if (profile) {
    const fields: Record<string, string> = {
      name: "user_name", email: "user_email", phone: "user_phone",
      location: "user_location", university: "user_university",
      specialization: "user_specialization", priorExperience: "user_prior_experience",
      skills: "user_skills", portfolio: "user_portfolio", github: "user_github",
      languages: "user_languages", availability: "user_availability",
    };
    for (const [f, k] of Object.entries(fields)) {
      if (profile[f] !== undefined) setConfig(k, profile[f]);
    }
  }
  if (smtpHost) setConfig("smtp_host", smtpHost);
  if (smtpUser) setConfig("smtp_user", smtpUser);
  if (smtpPass) setConfig("smtp_pass", smtpPass);
  if (adzunaApiKey) setConfig("adzuna_api_key", adzunaApiKey);
  if (coverLetterFr) setConfig("cover_letter_fr", coverLetterFr);
  if (coverLetterEn) setConfig("cover_letter_en", coverLetterEn);
  setConfig("onboarding_complete", "true");

  const missing: string[] = [];
  if (!getConfig("smtp_host")) missing.push("smtp");
  if (!getConfig("cv_path")) missing.push("cv");
  res.json({ complete: true, missingFields: missing });
});

router.get("/schedule", (_req, res) => {
  const s = getSchedulerStatus();
  res.json({
    enabled: getConfig("schedule_enabled") !== "false",
    time: getConfig("schedule_time") ?? "08:00",
    timezone: "Africa/Tunis",
    nextRun: s.nextRun,
  });
});

router.put("/schedule", (req, res) => {
  const { enabled, time } = req.body as { enabled?: boolean; time?: string };
  if (enabled !== undefined) setConfig("schedule_enabled", String(enabled));
  if (time !== undefined) setConfig("schedule_time", time);
  restartScheduler();
  const s = getSchedulerStatus();
  res.json({
    enabled: getConfig("schedule_enabled") !== "false",
    time: getConfig("schedule_time") ?? "08:00",
    timezone: "Africa/Tunis",
    nextRun: s.nextRun,
  });
});

export default router;
