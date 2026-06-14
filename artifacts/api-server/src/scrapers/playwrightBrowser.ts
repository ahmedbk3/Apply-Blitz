import type { Browser } from "playwright";
import { execSync } from "child_process";
import { log } from "../logs/sseLogger.js";

let _browser: Browser | null = null;

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

let _chromiumPath: string | null = null;

function findChromium(): string | null {
  if (_chromiumPath) return _chromiumPath;
  const candidates = [
    // nix store (dynamic — use `which`)
    () => execSync("which chromium 2>/dev/null", { timeout: 3000 }).toString().trim(),
    () => execSync("which chromium-browser 2>/dev/null", { timeout: 3000 }).toString().trim(),
    () => execSync("which google-chrome 2>/dev/null", { timeout: 3000 }).toString().trim(),
  ];
  for (const fn of candidates) {
    try {
      const p = fn();
      if (p) { _chromiumPath = p; return p; }
    } catch { /* continue */ }
  }
  return null;
}

async function getBrowser(): Promise<Browser> {
  if (_browser?.isConnected()) return _browser;

  const executablePath = findChromium();
  if (!executablePath) {
    throw new Error("No Chromium binary found. Run: nix-env -i chromium");
  }

  const { chromium } = await import("playwright");
  log.info(`[Browser] Launching Chromium: ${executablePath}`);
  _browser = await chromium.launch({
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
      "--disable-background-networking",
      "--disable-default-apps",
      "--disable-extensions",
      "--disable-sync",
      "--disable-translate",
      "--mute-audio",
    ],
  });
  log.info("[Browser] Chromium ready");
  return _browser;
}

export async function newBrowserPage() {
  const browser = await getBrowser();
  const ctx = await browser.newContext({
    userAgent: randomUA(),
    viewport: { width: 1366, height: 768 },
    locale: "en-US",
    timezoneId: "Europe/Paris",
    extraHTTPHeaders: {
      "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
    },
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  return { page, ctx };
}

export async function closeBrowser() {
  if (_browser?.isConnected()) {
    await _browser.close();
    _browser = null;
    log.info("[Browser] Chromium closed");
  }
}

export function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
