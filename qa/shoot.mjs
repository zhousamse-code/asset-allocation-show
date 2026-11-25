import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const exe = '/home/sam/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const file = path.resolve(process.env.FILE || 'dist/200万闲钱怎么投资.html');
const outDir = path.resolve(process.env.OUT || 'qa/out');
fs.mkdirSync(outDir, { recursive: true });
const W = +(process.env.W || 1440), H = +(process.env.H || 810);
const settle = +(process.env.SETTLE || 4.5);
const angle = process.env.ANGLE || 'gl-egl';
const browser = await chromium.launch({
  executablePath: exe,
  args: angle === 'swiftshader'
    ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync']
    : ['--enable-gpu', '--ignore-gpu-blocklist', `--use-angle=${angle}`, '--disable-gpu-vsync'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack || ''}`));
await page.goto(pathToFileURL(file).href + '?qa');
await page.waitForFunction(() => window.__qa || document.documentElement.classList.contains('nogl'), null, { timeout: 60000 });
const info = await page.evaluate(() => {
  const c = document.createElement('canvas').getContext('webgl2');
  const ext = c && c.getExtension('WEBGL_debug_renderer_info');
  return { nogl: document.documentElement.classList.contains('nogl'), renderer: ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'n/a', n: window.__qa && window.__qa.n };
});
console.log('info', JSON.stringify(info));
let list = process.argv.slice(2);
if (!list.length || list[0] === 'all') list = [...Array(info.n).keys()];
for (const s of list) {
  const i = +s;
  const t0 = Date.now();
  const st = +(process.env.SETTLE || 0) || (JSON.parse(fs.readFileSync('qa/settle.json','utf8'))[i]) || settle;
  await page.evaluate(([i, st]) => window.__qa.shot(i, st), [i, st]);
  await page.screenshot({ path: path.join(outDir, `b${String(i).padStart(2, '0')}.png`) });
  console.log('shot', i, Date.now() - t0, 'ms');
}
console.log(logs.join('\n') || '(no console output)');
await browser.close();
