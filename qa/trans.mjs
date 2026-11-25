import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
const exe = '/home/sam/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const file = path.resolve('dist/200万闲钱怎么投资.html');
const out = path.resolve('qa/trans'); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const logs = []; page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message));
await page.goto(pathToFileURL(file).href + '?qa');
await page.waitForFunction(() => window.__qa);
const pairs = (process.argv[2] || '1:2,9:10,29:30').split(',').map((p) => p.split(':').map(Number));
for (const [a, b] of pairs) {
  await page.evaluate((a) => window.__qa.shot(a, 4), a);
  await page.evaluate((b) => window.__qa.go(b), b);
  let k = 0;
  for (const dt of [0.45, 0.45, 0.45, 0.45, 0.6]) {
    await page.evaluate((dt) => window.__qa.adv(dt), dt);
    await page.screenshot({ path: path.join(out, `t${a}-${b}-${k++}.png`) });
  }
}
console.log(logs.join('\n') || 'no errors');
await browser.close();
