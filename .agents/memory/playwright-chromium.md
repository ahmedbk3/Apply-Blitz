---
name: Playwright + Chromium on Replit
description: How to use Playwright with the system Chromium browser in this Replit environment
---

# Playwright + Chromium on Replit

## The rule
`npx playwright install chromium` fails on Replit (no system deps access). Instead, install Chromium via the Nix package manager and point Playwright to it.

**Why:** Replit's sandbox blocks the Playwright browser installer but has Nix available.

**How to apply:** Whenever Playwright is needed in a Replit server project.

## Steps
1. `installSystemDependencies({ packages: ["chromium"] })` via code_execution
2. In `playwrightBrowser.ts`, find the binary dynamically:
   ```ts
   execSync("which chromium 2>/dev/null", { timeout: 3000 }).toString().trim()
   ```
3. Pass to `chromium.launch({ executablePath: found_path, ... })`

## Required launch args (headless + Replit sandbox)
```
--no-sandbox, --disable-setuid-sandbox, --disable-dev-shm-usage,
--single-process, --disable-gpu, --no-zygote
```

## Verified working
- Chromium 138 launches and navigates to external URLs
- Sites with Cloudflare bot protection (Tanitjobs, etc.) return challenge page — scrapers handle this gracefully with empty results
