// Download daily ^GSPC (price, from 1927-12-30) and ^SP500TR (total return, from 1988) from the Yahoo chart API.
// Plain curl is answered with 429, so the request goes through a browser context.
// usage: node tools/fetch_yahoo.mjs <outDir>   → <outDir>/gspc.json, <outDir>/sp500tr.json
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const out = process.argv[2];
const exe = '/home/sam/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe });
const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36', locale: 'en-US' });
const page = await ctx.newPage();
for (const [name, sym] of [['gspc', '%5EGSPC'], ['sp500tr', '%5ESP500TR']]) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?period1=-1400000000&period2=1800000000&interval=1d`;
  const r = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const body = await r.text();
  console.log(name, r.status(), body.length, body.slice(0, 120));
  if (r.status() === 200) fs.writeFileSync(`${out}/${name}.json`, body);
}
await browser.close();
