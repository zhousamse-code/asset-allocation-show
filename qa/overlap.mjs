// Text-overlap probe: settle a beat at several viewport sizes and report intersecting text boxes
// (slide text vs 3D labels vs other labels vs top/bottom chrome). Uses tight per-line text rects.
// Beats are 0-based indices (page bN in the URL hash = index N-1); output names pages as bN.
// usage: node qa/overlap.mjs <idx,idx|all> <WxH,WxH,...> [shotDir]   env FILE
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
const exe = '/home/sam/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const file = path.resolve(process.env.FILE || 'dist/200万闲钱怎么投资.html');
const settleMap = JSON.parse(fs.readFileSync('qa/settle.json', 'utf8'));
const sizes = (process.argv[3] || '1440x810').split(',').map((s) => s.split('x').map(Number));
const shotDir = process.argv[4] ? path.resolve(process.argv[4]) : null;
if (shotDir) fs.mkdirSync(shotDir, { recursive: true });

const browser = await chromium.launch({ executablePath: exe, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=gl-egl'] });
const page = await browser.newPage({ viewport: { width: sizes[0][0], height: sizes[0][1] }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', (e) => errs.push('[pageerror] ' + e.message));
await page.goto(pathToFileURL(file).href + '?qa');
await page.waitForFunction(() => window.__qa, null, { timeout: 60000 });
const n = await page.evaluate(() => window.__qa.n);
let beats = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2].split(',').map(Number) : [...Array(n).keys()];

let total = 0;
for (const [W, H] of sizes) {
  await page.setViewportSize({ width: W, height: H });
  await page.evaluate(() => window.__qa.size());
  for (const b of beats) {
    const st = settleMap[b] || 4.5;
    const hits = await page.evaluate(([b, st]) => {
      window.__qa.shot(b, st);
      const tight = (el) => {
        const r = document.createRange();
        r.selectNodeContents(el);
        return [...r.getClientRects()].filter((q) => q.width > 1 && q.height > 1);
      };
      const items = [];
      const slide = document.getElementById('slides').lastElementChild; // newest slide (stale ones linger in QA mode)
      if (slide)
        for (const ch of slide.children) {
          if (ch.classList.contains('extra')) {
            const r = ch.getBoundingClientRect();
            if (r.width > 1) items.push({ kind: 'slide', text: ch.textContent.trim().slice(0, 24), rects: [r] });
          } else items.push({ kind: 'slide', text: ch.textContent.trim().slice(0, 24), rects: tight(ch) });
        }
      for (const l of document.querySelectorAll('#labels .lbl')) {
        if (l.style.visibility !== 'visible' || +l.style.opacity < 0.35) continue;
        const box = l.firstElementChild;
        const spans = box.children.length ? [...box.children] : [box];
        for (const s of spans) {
          if (getComputedStyle(s).display === 'none') continue;
          const rects = tight(s);
          if (rects.length) items.push({ kind: 'label', text: s.textContent.trim().slice(0, 24), rects, lbl: l });
        }
      }
      for (const sel of ['#brand', '#acts', '#ctrl', '#prog']) {
        const e = document.querySelector(sel);
        if (!e) continue;
        const r = e.getBoundingClientRect();
        if (r.width > 1 && getComputedStyle(e).display !== 'none') items.push({ kind: 'chrome', text: sel, rects: [r] });
      }
      const out = [];
      const ov = (a, c) => Math.max(0, Math.min(a.right, c.right) - Math.max(a.left, c.left)) * Math.max(0, Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top));
      for (let i = 0; i < items.length; i++)
        for (let j = i + 1; j < items.length; j++) {
          const A = items[i], B = items[j];
          if (A.kind === 'chrome' && B.kind === 'chrome') continue;
          if (A.kind === 'slide' && B.kind === 'slide') continue;
          if (A.lbl && A.lbl === B.lbl) continue;
          let area = 0;
          for (const a of A.rects) for (const c of B.rects) area += ov(a, c);
          if (area > 40) out.push(`${A.kind}「${A.text}」 x ${B.kind}「${B.text}」 ${Math.round(area)}px²`);
        }
      return out;
    }, [b, st]);
    if (hits.length) {
      total += hits.length;
      console.log(`b${b + 1} (idx ${b}) @${W}x${H}:\n  ` + hits.join('\n  '));
      if (shotDir) await page.screenshot({ path: path.join(shotDir, `b${b + 1}_${W}x${H}.png`) });
    }
  }
}
console.log(total ? `${total} overlaps` : 'no overlaps', errs.length ? '\n' + errs.join('\n') : '');
await browser.close();
