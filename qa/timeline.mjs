// Capture one beat at several moments of its animation: node qa/timeline.mjs <beat> <t1,t2,...>  (env OUT, W, H)
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
const exe = '/home/sam/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const file = path.resolve('dist/200万闲钱怎么投资.html');
const W = +(process.env.W || 1440), H = +(process.env.H || 810);
const out = path.resolve(process.env.OUT || 'qa/tl'); fs.mkdirSync(out, { recursive: true });
const beat = +process.argv[2];
const times = (process.argv[3] || '1,2,3').split(',').map(Number);
const prev = process.argv[4] !== undefined ? +process.argv[4] : -1;
const browser = await chromium.launch({ executablePath: exe, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=gl-egl'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const logs = []; page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message));
await page.goto(pathToFileURL(file).href + '?qa');
await page.waitForFunction(() => window.__qa);
if (prev >= 0) await page.evaluate((p) => window.__qa.shot(p, 6), prev);
await page.evaluate(([b, t]) => window.__qa.shot(b, t), [beat, times[0]]);
await page.screenshot({ path: path.join(out, `b${beat}_t${times[0]}.png`) });
for (let k = 1; k < times.length; k++) {
  await page.evaluate((d) => window.__qa.adv(d), times[k] - times[k - 1]);
  await page.screenshot({ path: path.join(out, `b${beat}_t${times[k]}.png`) });
}
console.log(logs.join('\n') || 'no errors');
await browser.close();
