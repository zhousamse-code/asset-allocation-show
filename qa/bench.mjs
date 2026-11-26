// Frame cost per page on the real GPU: node qa/bench.mjs <idx,idx|all> [ratio,ratio,...]   env W, H, MSAA, BLOOM, TRANS=1
// Prints ms of simulation + ms of rendering per frame, for the settled page (or, with TRANS=1, for the camera move
// into it from the page before). W x H is the browser window in CSS pixels; ratio is the canvas pixel ratio.
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const exe = '/home/sam/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const file = path.resolve(process.env.FILE || 'dist/200万闲钱怎么投资.html');
const W = +(process.env.W || 1470), H = +(process.env.H || 880);
const ratios = (process.argv[3] || '1').split(',').map(Number);
const opt = { msaa: +(process.env.MSAA ?? 4), bloom: process.env.BLOOM !== '0', frames: +(process.env.FRAMES || 24) };
const browser = await chromium.launch({ executablePath: exe, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=gl-egl', '--disable-gpu-vsync'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror] ' + e.message));
const t0 = Date.now();
await page.goto(pathToFileURL(file).href + '?qa');
await page.waitForFunction(() => window.__qa, null, { timeout: 60000 });
console.log('boot', Date.now() - t0, 'ms');
const n = await page.evaluate(() => window.__qa.n);
const beats = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2].split(',').map(Number) : [...Array(n).keys()];
for (const r of ratios) {
  const rows = [];
  for (const b of beats) {
    const [sim, gpu] = await page.evaluate(([b, o]) => window.__qa.bench(b, o), [b, { ...opt, ratio: r, from: process.env.TRANS ? Math.max(0, b - 1) : -1 }]);
    rows.push([b, sim, gpu]);
  }
  rows.sort((a, c) => c[1] + c[2] - a[1] - a[2]);
  const avg = rows.reduce((s, x) => s + x[1] + x[2], 0) / rows.length;
  console.log(`ratio ${r} (${Math.round(W * r)}x${Math.round(H * r)}) msaa ${opt.msaa} bloom ${opt.bloom}: avg ${avg.toFixed(1)} ms; slowest: ` + rows.slice(0, 8).map((x) => `b${x[0] + 1} ${x[1].toFixed(1)}+${x[2].toFixed(1)}`).join(', '));
}
await browser.close();
