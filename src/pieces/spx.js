import * as THREE from 'three';
import { Piece, rbox, COL, hdr, lerp, clamp, clamp01, seg, ss, eOut, eIn, eInOut, rng, blob, dashLine, progTube, monotone } from '../lib.js';
import { bundleSet, glowTower } from './kit.js';

/* ================= 4.x  Who is inside: the ten biggest companies (S&P 500, then Nasdaq-100) ================= */
/* [name, what they do, index weight %] — sorted by weight. Source: index factsheets / ETF holdings. */
export const SPX_TOP = [
  ['苹果', 'iPhone', 8.2],
  ['英伟达', 'AI 芯片', 6.4],
  ['微软', 'Windows · AI', 5.9],
  ['谷歌', '搜索 · 安卓', 4.8],
  ['亚马逊', '网购 · 云', 4.0],
  ['博通', '芯片', 2.4],
  ['Meta', 'Facebook', 2.1],
  ['礼来', '减肥药', 1.8],
  ['特斯拉', '电动车', 1.7],
  ['伯克希尔', '巴菲特的公司', 1.7],
];
/* Nasdaq-100 via QQQ holdings (2026-11-23); Alphabet A+C counted together */
export const NDX_TOP = [
  ['苹果', 'iPhone', 8.8],
  ['英伟达', 'AI 芯片', 6.9],
  ['微软', 'Windows · AI', 6.3],
  ['谷歌', '搜索 · 安卓', 5.5],
  ['亚马逊', '网购 · 云', 4.7],
  ['美光', '内存芯片', 3.8],
  ['AMD', '芯片', 3.5],
  ['特斯拉', '电动车', 3.5],
  ['Meta', 'Facebook', 3.1],
  ['沃尔玛', '超市', 3.0],
];
const C_SPX = new THREE.Color(COL.spx);
const C_NDX = new THREE.Color(COL.ndx);
export class Skyline extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [0, -3, 15, 1.0] });
    const plot = new THREE.Mesh(rbox(23, 0.12, 12.5, 0.05), this.m(new THREE.MeshStandardMaterial({ color: 0x0c0d11, metalness: 0.6, roughness: 0.5 })));
    plot.position.set(0, 0.06, -4.2);
    this.add(plot);
    this.N = 10;
    this.towers = Array.from({ length: this.N }, (_, i) => {
      const tw = glowTower(this, COL.spx, { w: 1.3, d: 1.3, em: 0.42 });
      tw.g.position.set(-9.45 + i * 2.1, 0.12, 0.9);
      this.add(tw.g);
      const lab = this.label('', [0, 0, 0], 'up', tw.g);
      return { tw, lab, h: 0.001, h0: 0.001, h1: 0.001, col: new THREE.Color(COL.spx) };
    });
    // the other 490 (or 90) companies: a low, dense carpet behind
    const R = rng(31);
    this.NC = 490;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    this.carpet = new THREE.InstancedMesh(
      geo,
      this.m(new THREE.MeshStandardMaterial({ color: 0x0b1626, emissive: COL.spx, emissiveIntensity: 0.28, roughness: 0.3, metalness: 0.4 })),
      this.NC,
    );
    this.carpet.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.carpet.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.NC * 3), 3);
    this.carpet.frustumCulled = false;
    this.add(this.carpet);
    this.cp = [];
    const cols = 35;
    for (let i = 0; i < this.NC; i++) {
      const cx = i % cols;
      const cz = Math.floor(i / cols);
      const h = 0.12 + 0.75 * R() ** 2.2 + (cz < 2 ? 0.25 * R() : 0);
      this.cp.push({ x: -10.6 + cx * 0.62 + (R() - 0.5) * 0.08, z: -0.6 - cz * 0.66 + (R() - 0.5) * 0.08, h, d: R() });
    }
    // rank order for the Nasdaq thinning: keep a spread-out subset of 90
    this.keep = new Uint8Array(this.NC);
    for (let i = 0; i < this.NC; i++) this.keep[i] = i % 5 === 0 || i === 1 ? 1 : 0;
    let kept = this.keep.reduce((s, v) => s + v, 0);
    for (let i = this.NC - 1; kept > 90; i--) if (this.keep[i]) (this.keep[i] = 0), kept--;
    this.add(blob(this, 26, 16, 0.6));
    this.lRest = this.label('', [0, 0.1, 2.3], 'down');
    this.Mx = new THREE.Matrix4();
    this.c = new THREE.Color();
    this.mode = null;
    this.cv = 0; // 0 = S&P carpet, 1 = Nasdaq carpet
  }
  enter(st, prev, fresh) {
    const data = st.mode === 'ndx' ? NDX_TOP : SPX_TOP;
    const k = 0.78;
    this.towers.forEach((T, i) => {
      T.h0 = fresh ? 0.001 : T.h;
      T.h1 = data[i][2] * k;
      T.name = data[i][0];
      T.biz = data[i][1];
      T.w = data[i][2];
    });
    if (fresh) this.cv = st.mode === 'ndx' ? 1 : 0;
    this.mode = st.mode;
  }
  update(dt, time) {
    const t = this.t;
    const ndx = this.mode === 'ndx';
    this.cv = lerp(this.cv, ndx ? 1 : 0, 1 - Math.exp(-2.2 * dt));
    const tint = this.c.copy(C_SPX).lerp(C_NDX, this.cv);
    this.towers.forEach((T, i) => {
      const k = eOut(seg(t, 0.25 + i * 0.09, 1.35 + i * 0.09));
      T.h = lerp(T.h0, T.h1, k);
      T.tw.setH(Math.max(0.001, T.h));
      T.tw.bm.emissive.copy(tint);
      T.tw.cm.color.copy(tint).multiplyScalar(2.1);
      T.lab.pos.set(0, T.h + 0.2, 0);
      T.lab.set(`<span class="t">${T.name}</span><span class="c">${T.biz}</span><span class="c">${T.w.toFixed(1)}%</span>`);
      T.lab.target = k > 0.7 && (i < 5 || !this.app.ui.narrow()) ? 1 : 0;
    });
    const grow = eOut(seg(t, 0.2, 1.6));
    for (let i = 0; i < this.NC; i++) {
      const p = this.cp[i];
      const on = this.keep[i] ? 1 : 1 - this.cv;
      const s = grow * on * (0.85 + 0.15 * Math.sin(time * 0.6 + p.d * 20));
      this.Mx.makeScale(0.42, Math.max(0.001, p.h * s), 0.42).setPosition(p.x, 0.12, p.z);
      this.carpet.setMatrixAt(i, this.Mx);
      this.carpet.setColorAt(i, tint);
    }
    this.carpet.instanceMatrix.needsUpdate = true;
    this.carpet.instanceColor.needsUpdate = true;
    this.carpet.material.emissive.copy(tint);
    const sum = this.towers.reduce((s, T) => s + T.w, 0);
    this.lRest.set(
      ndx
        ? `<span class="t violet">纳斯达克 100 · 前十大合计约 ${Math.round(sum)}%</span><span class="c">后面矮的一片：其余 90 家</span>`
        : `<span class="t blue">标普 500 · 前十大合计约 ${Math.round(sum)}%</span><span class="c">后面矮的一片：其余 490 家</span>`,
    );
    this.lRest.target = t > 1.4 ? 1 : 0;
  }
}

/* ================= 4.x  Drawdowns since 1928: how deep, and how long until the old high came back =================
   S&P 500 price index (dividends not included). Points are actual peak / trough / recovery dates. */
const DD = [
  [1928.0, 0], [1929.7, 0], [1929.87, -44.6], [1930.3, -18.6], [1932.42, -86.2], [1932.7, -72], [1933.15, -82.5], [1934.1, -63],
  [1935.2, -74.7], [1937.2, -41.4], [1938.25, -73.3], [1939.8, -62], [1942.3, -76.6], [1946.4, -39.6], [1949.45, -57.5],
  [1952.9, -16.5], [1953.7, -28.7], [1954.72, 0], [1956.6, 0], [1957.8, -20.7], [1958.6, 0], [1961.95, 0], [1962.48, -28],
  [1963.7, 0], [1966.1, 0], [1966.75, -22.2], [1967.6, 0], [1968.9, 0], [1970.4, -36.1], [1972.2, 0], [1973.03, 0],
  [1974.76, -48.2], [1976.7, -10.3], [1978.2, -27.7], [1980.55, 0], [1980.9, 0], [1982.6, -27.1], [1982.85, 0], [1987.65, 0],
  [1987.92, -33.5], [1989.55, 0], [1990.55, 0], [1990.78, -19.9], [1991.1, 0], [1998.5, 0], [1998.7, -19.3], [1998.9, 0],
  [2000.23, 0], [2001.72, -36.8], [2002.77, -49.1], [2004.99, -20.7], [2006.99, -7.1], [2007.41, 0], [2007.77, 0],
  [2008.89, -51.9], [2009.19, -56.8], [2010.3, -22.2], [2010.51, -34.7], [2011.32, -12.9], [2011.76, -29.8], [2013.24, 0],
  [2015.38, 0], [2016.11, -14.2], [2016.5, 0], [2018.72, 0], [2018.98, -19.8], [2019.3, 0], [2020.13, 0], [2020.22, -33.9],
  [2020.63, 0], [2022.0, 0], [2022.46, -23.6], [2022.62, -10.2], [2022.78, -25.4], [2023.5, -7], [2023.82, -14.2],
  [2024.05, 0], [2025.13, 0], [2025.27, -18.9], [2025.49, 0], [2026.07, 0], [2026.24, -9.1], [2026.4, 0], [2026.76, 0], [2026.885, -11.6], [2026.9, -7.9],
];
const UX = (yr) => (yr - 1977) * 0.36;
const SURF = 8.6;
const UY = (d) => SURF + d * 0.09;
/* the pits we talk about: [label year (trough), depth %, start, end, name, recovery text] */
const PITS = [
  { yr: 1932.42, d: -86.2, a: 1929.7, b: 1954.72, name: '1929–1932 大萧条', rec: '25 年才回到前高', step: 'deep', big: true },
  { yr: 1974.76, d: -48.2, a: 1973.03, b: 1980.55, name: '1973 石油危机', rec: '7 年半' },
  { yr: 1987.92, d: -33.5, a: 1987.65, b: 1989.55, name: '1987 股灾', rec: '约 2 年' },
  { yr: 2002.77, d: -49.1, a: 2000.23, b: 2007.41, name: '2000 互联网泡沫', rec: '7 年' },
  { yr: 2009.19, d: -56.8, a: 2007.77, b: 2013.24, name: '2008 金融危机', rec: '5 年半' },
  { yr: 2020.22, d: -33.9, a: 2020.13, b: 2020.63, name: '2020 疫情', rec: '半年', side: 'left' },
  { yr: 2022.78, d: -25.4, a: 2022.0, b: 2024.05, name: '2022 加息', rec: '2 年', side: 'right' },
];
export class Underwater extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [0, 0, 26, 0.85] });
    const f = monotone(
      DD.map((p) => p[0]),
      DD.map((p) => p[1]),
    );
    this.f = f;
    const N = 900;
    const T0 = DD[0][0];
    const T1 = DD[DD.length - 1][0];
    this.T0 = T0;
    this.T1 = T1;
    const pts = [];
    const pos = [];
    const at = [];
    const dep = [];
    for (let i = 0; i <= N; i++) {
      const yr = T0 + ((T1 - T0) * i) / N;
      const d = Math.min(0, f(yr));
      const x = UX(yr);
      const y = UY(d);
      pts.push(new THREE.Vector3(x, y, 0));
      pos.push(x, SURF, 0, x, y, 0);
      at.push(0, 1);
      dep.push(-d / 100, -d / 100);
    }
    this.line = progTube(pts, 0.075, this.m(new THREE.MeshBasicMaterial({ color: hdr(0xffd0c8, 1.25) })), 8);
    this.add(this.line);
    const idx = [];
    for (let i = 0; i < N; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(at, 1));
    g.setAttribute('aD', new THREE.Float32BufferAttribute(dep, 1));
    g.setIndex(idx);
    this.areaMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: { uFade: this.fade, uX: { value: -100 } },
      vertexShader:
        'attribute float aT; attribute float aD; varying float vT; varying float vD; varying float vX; void main(){ vT = aT; vD = aD; vX = position.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: /* glsl */ `
        uniform float uFade; uniform float uX;
        varying float vT; varying float vD; varying float vX;
        void main(){
          float on = step(vX, uX);
          float t = clamp(vT, 0.0, 1.0);
          float d = clamp(vD, 0.0, 1.0);
          vec3 c = mix(vec3(0.95, 0.45, 0.25), vec3(1.0, 0.16, 0.14), smoothstep(0.15, 0.6, d));
          float a = (0.08 + 0.42 * t * t) * on * uFade * smoothstep(0.0, 0.04, d);
          gl_FragColor = vec4(c, a);
        }`,
    });
    this.add(new THREE.Mesh(g, this.areaMat));
    // the "back to the old high" line
    const W = UX(T1) - UX(T0) + 1.2;
    const surf = new THREE.Mesh(new THREE.BoxGeometry(W, 0.05, 0.05), this.m(new THREE.MeshBasicMaterial({ color: hdr(0xdfe9ff, 1.1) })));
    surf.position.set((UX(T0) + UX(T1)) / 2, SURF, 0);
    this.add(surf);
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(W, 2.2),
      this.m(new THREE.MeshBasicMaterial({ color: hdr(COL.spx, 0.6), transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide })),
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.set((UX(T0) + UX(T1)) / 2, SURF, 0);
    this.add(plane);
    // depth grid lines at -25 / -50 / -75 %
    [-25, -50, -75].forEach((d) => this.add(dashLine(this, [new THREE.Vector3(UX(T0), UY(d), -0.05), new THREE.Vector3(UX(T1), UY(d), -0.05)], 0xffffff, 0.16)));
    this.lSurf = this.label('<span class="c">0% = 回到前高（回本）</span>', [UX(T1) + 0.4, SURF, 0], 'right');
    this.lNow = this.label('<span class="t red">−12%</span><span class="c">今年 11 月 · 进行中</span>', [UX(2026.885) + 0.35, UY(-11.6), 0.2], 'right');
    this.lYears = [1930, 1950, 1965, 1995, 2016, 2026].map((y) => this.label(`<span class="c">${y}</span>`, [UX(y), SURF + 0.35, 0]));
    // brackets showing how long each recovery took
    const bm = this.m(new THREE.MeshBasicMaterial({ color: hdr(0xffd27a, 1.3) }));
    this.pits = PITS.map((p) => {
      const grp = new THREE.Group();
      const x0 = UX(p.a);
      const x1 = UX(p.b);
      const yb = SURF + (p.big ? 1.15 : 0.75);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.05, x1 - x0), 0.05, 0.05), bm);
      bar.position.set((x0 + x1) / 2, yb, 0);
      grp.add(bar);
      [x0, x1].forEach((x) => {
        const tk = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.05), bm);
        tk.position.set(x, yb - 0.18, 0);
        grp.add(tk);
      });
      this.add(grp);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(p.big ? 0.24 : 0.17, 18, 12), this.m(new THREE.MeshBasicMaterial({ color: hdr(COL.risk, 2.0) })));
      dot.position.set(UX(p.yr), UY(p.d), 0);
      this.add(dot);
      const cls = p.side || 'down';
      const lp = cls === 'left' ? [UX(p.yr) - 0.3, UY(p.d), 0.2] : cls === 'right' ? [UX(p.yr) + 0.3, UY(p.d), 0.2] : [UX(p.yr), UY(p.d) - 0.3, 0.2];
      const ld = this.label(`<span class="v red${p.big ? '' : ' sm'}">${Math.round(p.d)}%</span><span class="c">${p.name}</span>`, lp, cls);
      const lr = this.label(`<span class="${p.big ? 'v sm gold' : 't gold'}">${p.rec}</span>${p.big ? '<span class="c">1929 → 1954，按指数点位算</span>' : ''}`, [(x0 + x1) / 2, yb + 0.05, 0]);
      return { ...p, grp, dot, ld, lr, x1 };
    });
    // what the two words mean: the depth of a pit is the 最大回撤, its width the 回本时间
    this.ddLine = dashLine(this, [new THREE.Vector3(UX(1932.42), SURF, 0.15), new THREE.Vector3(UX(1932.42), UY(-86.2), 0.15)], 0xffd27a, 0.9, 0.18, 0.12);
    this.add(this.ddLine);
    this.lDD = this.label('<span class="t gold">最大回撤 ↓</span><span class="c">从最高点跌到最低点</span>', [UX(1929.6) - 0.25, UY(-48), 0.2], 'left');
    this.add(blob(this, 40, 8, 0.5));
    this.p = 0;
  }
  enter(st, prev, fresh) {
    if (fresh) this.p = 0;
  }
  update(dt) {
    const t = this.t;
    const deep = this.st.step === 'deep';
    this.p = deep ? Math.max(this.p, eInOut(seg(t, 0.4, 3.6))) : Math.max(this.p, eInOut(seg(t, 0.2, 1.4)));
    this.line.setProgress(this.p);
    const px = UX(this.T0) + this.p * (UX(this.T1) - UX(this.T0)) + 0.01;
    this.areaMat.uniforms.uX.value = px;
    for (const q of this.pits) {
      const reached = q.x1 <= px + 0.01;
      const mine = deep ? q.step === 'deep' : q.step !== 'deep';
      q.grp.visible = reached && (deep ? q.step === 'deep' : true);
      q.dot.visible = UX(q.yr) <= px;
      q.ld.target = UX(q.yr) <= px && (mine || (!deep && q.big)) ? (t > 0.5 ? 1 : 0) : 0;
      q.lr.target = reached && mine ? (t > 0.8 ? 1 : 0) : 0;
    }
    this.ddLine.visible = deep && t > 1.0;
    this.lDD.target = deep && t > 1.3 ? 1 : 0;
    const axOn = t > 0.4 ? 1 : 0;
    this.lNow.target = !deep && t > 0.8 ? 1 : 0;
    this.lSurf.target = axOn;
    for (const l of this.lYears) l.target = axOn;
  }
}

/* ================= 4.x  100万 put into the S&P 500 ten years ago: where it stands now ================= */
/* Value in 万元 (RMB), total return incl. dividends, converted at the USD/CNY rate of each date. */
export const TEN = [
  ['2016.11', 100],
  ['2017', 116],
  ['2018', 117],
  ['2019', 156],
  ['2020', 174],
  ['2021', 218],
  ['2022', 193],
  ['2023', 251],
  ['2024', 323],
  ['2025', 364],
  ['2026.11', 369],
];
export const CMP = [
  { v: 75, cls: 'red', t: '最差的十年', c: '2000–2009 · 按人民币算' },
  { v: 270, cls: '', t: '历史平均', c: '年化约 10% · 按美元算' },
  { v: 369, cls: 'blue', t: '最近十年', c: '2016–2026 · 按人民币算' },
];
const BUN = { w: 1.25, h: 0.2, d: 0.64 };
const GY2 = 0.212;
export class TenYear extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [0, 0, 14, 1.0] });
    const ped = new THREE.Mesh(rbox(19.4, 0.14, 2.6, 0.05), this.m(new THREE.MeshStandardMaterial({ color: 0x15161b, metalness: 0.6, roughness: 0.4 })));
    ped.position.y = 0.07;
    this.add(ped);
    const R = rng(23);
    this.cols = TEN.map(([lb, v], i) => ({ lb, v, n: Math.max(1, Math.round(v / 10)), x: (i - 5) * 1.66 }));
    this.ni = this.cols.reduce((s, c) => s + c.n, 0);
    this.cmp = CMP.map((c, i) => ({ ...c, n: Math.max(1, Math.round(c.v / 10)), x: (i - 1) * 4.6 }));
    this.nc = this.cmp.reduce((s, c) => s + c.n * 2, 0);
    this.set = bundleSet(this, this.ni + this.nc, BUN);
    this.add(this.set.mesh, this.set.band);
    this.items = [];
    this.cols.forEach((c, ci) => {
      for (let k = 0; k < c.n; k++) this.items.push({ ci, k, x: c.x + (R() - 0.5) * 0.05, z: (R() - 0.5) * 0.05, r: (R() - 0.5) * 0.05, col: RED2.clone().offsetHSL(0, 0, (R() - 0.5) * 0.07) });
    });
    this.citems = [];
    this.cmp.forEach((c, ci) => {
      for (let k = 0; k < c.n; k++)
        for (let s = 0; s < 2; s++)
          this.citems.push({ ci, k, x: c.x + (s - 0.5) * 1.31 + (R() - 0.5) * 0.05, z: (R() - 0.5) * 0.05, r: (R() - 0.5) * 0.05, col: RED2.clone().offsetHSL(0, 0, (R() - 0.5) * 0.07) });
    });
    const top = (n) => 0.14 + n * GY2;
    this.top = top;
    const last = this.cols.length - 1;
    this.lVal = this.cols.map((c, i) =>
      this.label(
        i === 0
          ? `<span class="v sm">100 万</span><span class="c">2016 年 11 月买入</span>`
          : i === last
            ? `<span class="v blue">≈ ${c.v} 万</span><span class="c">2026 年 11 月</span>`
            : `<span class="t">${c.v}</span>`,
        [c.x, top(c.n) + 0.1, 0],
      ),
    );
    this.lYr = this.cols.map((c) => this.label(`<span class="c">${c.lb}</span>`, [c.x, 0, 1.45], 'down'));
    this.lUnit = this.label('<span class="c">每捆 = 10 万元 · 含分红 · 单位：万元</span>', [this.cols[0].x - 0.9, top(this.cols[0].n) + 2.3, 0], 'right');
    this.base100 = dashLine(this, [new THREE.Vector3(-6.0, top(10), 0.75), new THREE.Vector3(7.4, top(10), 0.75)], 0xffffff, 0.5);
    this.add(this.base100);
    this.lBase = this.label('<span class="c">起点 100 万</span>', [7.5, top(10), 0.75], 'right');
    this.lCmp = this.cmp.map((c, i) =>
      this.label(
        `<span class="v ${c.cls}">≈ ${c.v} 万</span><span class="t">${c.t}</span><span class="c">${c.c}</span>`,
        i === 0 ? [c.x - 1.55, top(c.n) * 0.5 + 0.2, 0] : [c.x, top(c.n) + 0.12, 0],
        i === 0 ? 'left' : 'up',
      ),
    );
    this.add(blob(this, 24, 6, 0.7));
    this.T = this.cols.map((c, i) => 0.5 + i * 0.42);
    this.out = 0;
  }
  enter(st, prev, fresh) {
    if (fresh) this.out = st.step === 'compare' ? 1 : 0;
  }
  update(dt) {
    const t = this.t;
    const cmp = this.st.step === 'compare';
    this.out = lerp(this.out, cmp ? 1 : 0, 1 - Math.exp(-4 * dt));
    const keep = 1 - this.out;
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      const t0 = cmp ? -10 : this.T[it.ci] + it.k * 0.018;
      const q = seg(t, t0, t0 + 0.3);
      if (q <= 0 || keep < 0.02) {
        this.set.hide(i);
        continue;
      }
      const y = 0.14 + BUN.h / 2 + it.k * GY2 + (1 - q * q) * 2.4;
      this.set.set(i, it.x, y * (0.4 + 0.6 * keep), it.z, keep, it.col, it.r);
    }
    for (let j = 0; j < this.citems.length; j++) {
      const it = this.citems[j];
      const t0 = 0.5 + it.ci * 0.55 + it.k * 0.03;
      const q = cmp ? seg(t, t0, t0 + 0.32) : 0;
      if (q <= 0) {
        this.set.hide(this.ni + j);
        continue;
      }
      const y = 0.14 + BUN.h / 2 + it.k * GY2 + (1 - q * q) * 2.4;
      this.set.set(this.ni + j, it.x, y, it.z, 1, it.col, it.r);
    }
    this.set.commit();
    this.cols.forEach((c, i) => {
      const on = !cmp && t > this.T[i] + c.n * 0.018 + 0.25 ? 1 : 0;
      this.lVal[i].target = on;
      this.lYr[i].target = !cmp && t > 0.4 ? 1 : 0;
    });
    this.lUnit.target = !cmp && t > 0.6 ? 1 : 0;
    this.base100.visible = cmp && t > 0.4;
    this.lBase.target = cmp && t > 0.6 ? 1 : 0;
    this.cmp.forEach((c, i) => (this.lCmp[i].target = cmp && t > 0.5 + i * 0.55 + c.n * 0.03 + 0.3 ? 1 : 0));
  }
}
const RED2 = new THREE.Color(0xb3202a);
