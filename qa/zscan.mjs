// Flicker (z-fighting) scan over all beats: settle, render 16 consecutive frames, score pixels whose temporal
// 2nd difference is high, and write one heat map per page (bN.png). Smooth camera sway scores low; z-fighting and
// continuous animation (particles, pouring water, flowing dots) score high, so look at the top pages' heat maps.
// usage: node qa/zscan.mjs [outDir]
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
const exe = '/home/sam/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const file = path.resolve(process.env.FILE || 'dist/200万闲钱怎么投资.html');
const settleMap = JSON.parse(fs.readFileSync('qa/settle.json', 'utf8'));
const out = path.resolve(process.argv[2] || 'qa/out/zscan');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: exe, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=gl-egl'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(file).href + '?qa');
await page.waitForFunction(() => window.__qa, null, { timeout: 60000 });
const n = await page.evaluate(() => window.__qa.n);
for (let b = 0; b < n; b++) {
  const st = Math.max(settleMap[b] || 4.5, 6);
  const r = await page.evaluate(([b, st]) => {
    window.__qa.shot(b, st);
    const c = document.getElementById('gl');
    const gl = c.getContext('webgl2');
    const w = c.width, h = c.height, N = w * h;
    const grab = () => {
      const px = new Uint8Array(N * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const y = new Float32Array(N);
      for (let i = 0; i < N; i++) y[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
      return y;
    };
    let a = grab(); window.__qa.adv(1 / 30); let bb = grab();
    const acc = new Float32Array(N), F = 16;
    for (let k = 2; k < F; k++) { window.__qa.adv(1 / 30); const cc = grab(); for (let i = 0; i < N; i++) acc[i] += Math.abs(cc[i] - 2 * bb[i] + a[i]); a = bb; bb = cc; }
    let hot = 0;
    for (let i = 0; i < N; i++) if (acc[i] / (F - 2) > 12) hot++;
    const hm = document.createElement('canvas'); hm.width = w; hm.height = h;
    const g = hm.getContext('2d'); const img = g.createImageData(w, h);
    for (let yy = 0; yy < h; yy++) for (let x = 0; x < w; x++) { const v = Math.min(255, acc[(h - 1 - yy) * w + x] / (F - 2) * 255 / 12); const o = (yy * w + x) * 4; img.data[o] = v; img.data[o + 1] = v * 0.6; img.data[o + 3] = 255; }
    g.putImageData(img, 0, 0);
    return { hot: hot / N, heat: hm.toDataURL('image/png') };
  }, [b, st]);
  fs.writeFileSync(path.join(out, `b${b + 1}.png`), Buffer.from(r.heat.split(',')[1], 'base64'));
  console.log(`b${b + 1}`, (r.hot * 100).toFixed(2) + '%');
}
await browser.close();
