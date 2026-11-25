import { build } from 'esbuild';
import fs from 'node:fs';

const TITLE = '200 万闲钱怎么投资';
const res = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  minify: true,
  write: false,
  target: 'es2020',
  legalComments: 'none',
  charset: 'utf8',
});
let js = res.outputFiles[0].text;
if (/<\/script/i.test(js)) js = js.replace(/<\/script/gi, '<\\/script');
const css = fs.readFileSync('src/style.css', 'utf8');
const body = fs.readFileSync('src/body.html', 'utf8');

const head = `<title>${TITLE}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="200 万闲钱怎么投资：从内需不足、利率和放水讲起，到标普 500、黄金、黑天鹅和汇率风险，再到全部买标普 500 的方案和具体怎么买。数据截至 2026 年 11 月。">
<style>${css}</style>`;

// 1) stand-alone file: works offline (double-click), no external requests at all
const full = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${head}
</head>
<body>
${body}
<script>${js}</script>
</body>
</html>
`;
// 2) web (artifact) version: same code, unminified, with three.js loaded from the CDN via an import map
const web = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'esm',
  minify: false,
  write: false,
  target: 'es2020',
  legalComments: 'none',
  charset: 'utf8',
  external: ['three', 'three/addons/*'],
});
let wjs = web.outputFiles[0].text;
if (/<\/script/i.test(wjs)) wjs = wjs.replace(/<\/script/gi, '<\\/script');
const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.170.0';
const frag = `${head}
${body}
<script type="importmap">{"imports":{"three":"${THREE_CDN}/build/three.module.min.js","three/addons/":"${THREE_CDN}/examples/jsm/"}}</script>
<script type="module">
${wjs}
</script>
`;
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/200万闲钱怎么投资.html', full);
fs.writeFileSync('dist/artifact.html', frag);
console.log('built', (full.length / 1024).toFixed(0) + ' KB standalone,', (frag.length / 1024).toFixed(0) + ' KB web');
