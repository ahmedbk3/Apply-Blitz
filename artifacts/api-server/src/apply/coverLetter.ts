import { getConfig } from "../db/database.js";

export function injectVariables(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

export function detectLanguage(company: string, source: string): "fr" | "en" {
  const tunisianSources = ["tanitjobs", "emploi.nat", "telnet", "vermeg", "sofrecom", "tn", "tunisie"];
  const sourceLower = source.toLowerCase();
  const companyLower = company.toLowerCase();
  for (const sig of tunisianSources) {
    if (sourceLower.includes(sig) || companyLower.includes(sig)) return "fr";
  }
  return "en";
}

export function renderCoverLetter(
  language: "fr" | "en",
  role: string,
  company: string
): string {
  const template = getConfig(language === "fr" ? "cover_letter_fr" : "cover_letter_en") ?? "";
  return injectVariables(template, {
    role,
    company,
    date: new Date().toLocaleDateString(language === "fr" ? "fr-FR" : "en-US"),
    year: new Date().getFullYear().toString(),
  });
}
