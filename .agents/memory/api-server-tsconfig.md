---
name: API server tsconfig DOM lib + cheerio externals
description: Non-obvious config needed to typecheck Playwright page.evaluate() callbacks and bundle cheerio
---

# API server TypeScript + build config

## The rule
The api-server tsconfig must include `"lib": ["es2022", "dom"]` so TypeScript accepts DOM types (`document`, `window`, `NodeListOf<Element>`, etc.) inside `page.evaluate()` callbacks.

**Why:** `page.evaluate()` serializes the callback to run in the browser, but TypeScript sees it as Node.js code. Adding `dom` to lib prevents errors like "Cannot find name 'document'".

**How to apply:** Any time a Node.js server uses Playwright's `page.evaluate()` with DOM APIs.

## cheerio in build.mjs
Add `"cheerio"` to the `external` array in `build.mjs`. This avoids esbuild bundling quirks with cheerio's CJS/ESM dual-package.

## node-cron ScheduledTask type
Import the type directly: `import cron, { type ScheduledTask } from "node-cron"`. Using `cron.ScheduledTask` as a namespace fails when `dom` lib is added.
