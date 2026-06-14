import { getConfig, getAllConfig } from "../db/database.js";

export function injectVariables(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

export function detectLanguage(company: string, source: string): "fr" | "en" {
  const tunisianSignals = [
    "tanitjobs", "emploi.nat", "emploinat", "telnet", "vermeg", "sofrecom",
    "tn", "tunisie", "tunisia", "sfax", "sousse", "bizerte", "ariana",
    "ibitek", "orange tunisie", "ooredoo", "topnet",
  ];
  const sourceLower = source.toLowerCase();
  const companyLower = company.toLowerCase();
  for (const sig of tunisianSignals) {
    if (sourceLower.includes(sig) || companyLower.includes(sig)) return "fr";
  }
  const frenchSignals = ["wwoof.fr", "workaway france", "france", "belgiqu", "suisse", "maroc", "algérie"];
  for (const sig of frenchSignals) {
    if (sourceLower.includes(sig) || companyLower.includes(sig)) return "fr";
  }
  return "en";
}

export function buildProfileVars(): Record<string, string> {
  const c = getAllConfig();
  const now = new Date();
  return {
    name:            c.user_name ?? "Ahmed Ben Kilani",
    email:           c.user_email ?? "ahmedbenkilani3@gmail.com",
    phone:           c.user_phone ?? "",
    location:        c.user_location ?? "Tunis, Tunisia",
    university:      c.user_university ?? "INSAT Tunis — 3rd year Networks & Telecommunications (RT3)",
    specialization:  c.user_specialization ?? "IoT, DevOps, Cloud",
    experience:      c.user_prior_experience ?? "Network Administrator @ Groupe IBITEK",
    skills:          c.user_skills ?? "ESP32, Python, Node.js, Docker, Linux, Networking",
    portfolio:       c.user_portfolio ?? "ahmedbk3.github.io",
    github:          c.user_github ?? "github.com/ahmedbk3",
    languages:       c.user_languages ?? "Arabic (native), French (fluent), English (fluent)",
    availability:    c.user_availability ?? "Mid-June 2025, full-time internship or part-time remote",
    year:            now.getFullYear().toString(),
    date:            now.toLocaleDateString("fr-FR"),
    date_en:         now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  };
}

export function renderCoverLetter(
  language: "fr" | "en",
  role: string,
  company: string
): string {
  const template = getConfig(language === "fr" ? "cover_letter_fr" : "cover_letter_en") ?? "";
  const profileVars = buildProfileVars();
  return injectVariables(template, {
    ...profileVars,
    role,
    company,
  });
}
