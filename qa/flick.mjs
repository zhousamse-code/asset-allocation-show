// Render consecutive frames (WebGL canvas only, read back in-page) for flicker analysis.
// usage: node qa/flick.mjs <beat> [frames] [settle]   env: OUT, W, H, ANGLE (gl-egl|vulkan|swiftshader), SAVE=1
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
const exe = '/home/sam/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const file = path.resolve(process.env.FILE || 'dist/200万闲钱怎么投资.html');
const W = +(process.env.W || 1280), H = +(process.env.H || 720);
const angle = process.env.ANGLE || 'gl-egl';
const args = angle === 'swiftshader'
  ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  : ['--enable-gpu', '--ignore-gpu-blocklist', `--use-angle=${angle}`, '--enable-features=Vulkan,VulkanFromANGLE', '--disable-vulkan-surface'];
const beats = (process.argv[2] || '19').split(',').map(Number);
const frames = +(process.argv[3] || 30), settle = +(process.argv[4] || 5);
const out = path.resolve(process.env.OUT || 'qa/flick');
const browser = await chromium.launch({ executablePath: exe, args });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const logs = []; page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message));
await page.goto(pathToFileURL(file).href + '?qa');
await page.waitForFunction(() => window.__qa);
for (const beat of beats) {
  const dir = path.join(out, 'b' + beat); fs.mkdirSync(dir, { recursive: true });
  await page.evaluate(([b, s]) => window.__qa.shot(b, s), [beat, settle]);
  const means = [];
  for (let k = 0; k < frames; k++) {
    const r = await page.evaluate((save) => {
      window.__qa.adv(1 / 30);
      const c = document.getElementById('gl');
      const gl = c.getContext('webgl2');
      const px = new Uint8Array(c.width * c.height * 4);
      gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let s = 0, black = 0;
      for (let i = 0; i < px.length; i += 4) { const v = px[i] + px[i + 1] + px[i + 2]; s += v; if (v === 0) black++; }
      return { mean: s / (px.length / 4) / 3, black: black / (px.length / 4), url: save ? c.toDataURL('image/png') : null };
    }, !!process.env.SAVE);
    means.push(r.mean.toFixed(1) + (r.black > 0.5 ? '*' : ''));
    if (r.url) fs.writeFileSync(path.join(dir, `f${String(k).padStart(3, '0')}.png`), Buffer.from(r.url.split(',')[1], 'base64'));
  }
  console.log('beat', beat, means.join(' '));
}
console.log(logs.join('\n') || 'no errors');
await browser.close();
