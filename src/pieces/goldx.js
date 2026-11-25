import * as THREE from 'three';
import { Piece, rbox, COL, hdr, lerp, clamp01, seg, ss, eOut, eInOut, rng, blob, edges, dashLine, progTube, monotone } from '../lib.js';
import { bundleSet } from './kit.js';
import { goldBarGeo, stampTex } from './act4.js';

/* ================= 5.2  Gold vs. paper money: what one 1-kg bar costs in RMB =================
   SGE Au99.99: Dec 2005 ≈ 132 元/克, end-2015 222.85, 2026-11-24 777.00; peak 1243.01 on 2026-01-29. */
const RED = new THREE.Color(0xb3202a);
const STACKS = [
  { lb: '2005 年', v: 13, x: -4.0 },
  { lb: '2015 年', v: 22, x: -0.6 },
  { lb: '2026 年 11 月', v: 78, x: 2.8, now: true },
];
const BX = 6.6;
const PL = 6; // bundles per layer: 2 wide x 3 deep
const PEAK = 124;
const GXo = 1.62;
const GYo = 0.272;
export class GoldFiat extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [1.5, 0, 11, 1.1] });
    const ped = new THREE.Mesh(rbox(3.0, 1.0, 2.0, 0.06), this.m(new THREE.MeshStandardMaterial({ color: 0x1b1c22, metalness: 0.7, roughness: 0.35 })));
    ped.position.set(BX, 0.5, 0);
    this.add(ped);
    this.bar = new THREE.Group();
    this.add(this.bar);
    this.bar.add(
      new THREE.Mesh(goldBarGeo(), this.m(new THREE.MeshPhysicalMaterial({ color: 0xffd27a, metalness: 1, roughness: 0.22, clearcoat: 0.3, clearcoatRoughness: 0.2, envMapIntensity: 1.6 }))),
    );
    const st = new THREE.Mesh(
      new THREE.PlaneGeometry(1.55, 0.6),
      this.m(new THREE.MeshStandardMaterial({ map: stampTex(), transparent: true, metalness: 1, roughness: 0.55, color: 0x6e4e18, envMapIntensity: 0.6, depthWrite: false })),
    );
    st.rotation.x = -Math.PI / 2;
    st.position.y = 0.313;
    this.bar.add(st);
    const total = STACKS.reduce((s, q) => s + q.v, 0);
    this.set = bundleSet(this, total);
    this.add(this.set.mesh, this.set.band);
    const R = rng(41);
    this.items = [];
    STACKS.forEach((q, si) => {
      for (let k = 0; k < q.v; k++) {
        const l = Math.floor(k / PL);
        const r = k % PL;
        this.items.push({ si, k, x: q.x + ((r % 2) - 0.5) * GXo + (R() - 0.5) * 0.04, z: (Math.floor(r / 2) - 1) * 0.8, y: 0.13 + l * GYo, r: (R() - 0.5) * 0.04, col: RED.clone().offsetHSL(0, 0, (R() - 0.5) * 0.07) });
      }
    });
    // ghost of the January 2026 peak above today's stack
    const gh = Math.ceil(PEAK / PL) * GYo;
    const gg = new THREE.BoxGeometry(3.4, gh, 2.5);
    gg.translate(0, gh / 2, 0);
    this.ghost = edges(this, gg, 0xffd27a, 0.35);
    this.ghost.position.set(STACKS[2].x, 0, 0);
    this.add(this.ghost);
    this.add(blob(this, 20, 7, 0.75));
    this.lBar = this.label('<span class="t gold">1 公斤金条</span><span class="c">20 年来，一直是这一根</span>', [BX, 1.75, 0]);
    this.lSt = STACKS.map((q) =>
      this.label(`<span class="v sm${q.now ? ' gold' : ''}">约 ${q.v} 万</span><span class="c">${q.lb}</span>`, [q.x, 0.13 + Math.ceil(q.v / PL) * GYo + 0.15, 0]),
    );
    this.lGhost = this.label(`<span class="c">今年 1 月最高到过约 ${PEAK} 万，之后回落了近四成</span>`, [STACKS[2].x, gh + 0.15, 0]);
    this.lUnit = this.label('<span class="c">每捆 = 1 万元：买这一根金条要花的钱</span>', [-0.6, 0, 1.6], 'down');
    this.T = STACKS.map((q, i) => 1.2 + i * 0.9);
  }
  update(dt, time) {
    const t = this.t;
    const kb = seg(t, 0.25, 0.75);
    this.bar.position.set(BX, 1.0 + 0.31 + (1 - kb * kb) * 5, 0);
    this.bar.rotation.y = 0.35 + Math.sin(time * 0.5) * 0.08;
    this.bar.visible = kb > 0;
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      const t0 = this.T[it.si] + it.k * 0.016;
      const q = seg(t, t0, t0 + 0.3);
      if (q <= 0) {
        this.set.hide(i);
        continue;
      }
      this.set.set(i, it.x, it.y + (1 - q * q) * 2.6, it.z, 1, it.col, it.r);
    }
    this.set.commit();
    STACKS.forEach((q, i) => (this.lSt[i].target = t > this.T[i] + q.v * 0.016 + 0.3 ? 1 : 0));
    const gOn = t > 4.4;
    this.ghost.visible = gOn;
    this.ghost.material.opacity = 0.35 * ss(4.4, 5.0, t);
    this.lGhost.target = t > 4.8 ? 1 : 0;
    this.lBar.target = t > 0.9 ? 1 : 0;
    this.lUnit.target = t > 1.3 ? 1 : 0;
  }
}

/* ================= 5.3  Gold since 1971 (USD/oz, log scale): two long bear markets and a fresh drop ================= */
const GOLD = [
  [1971.0, 37.4], [1971.62, 42], [1971.99, 43.6], [1972.99, 64.9], [1973.45, 120], [1973.99, 112.3], [1974.95, 195], [1975.99, 140.3],
  [1976.65, 103.5], [1977.99, 165], [1978.99, 226], [1979.75, 400], [1979.99, 512], [1980.05, 850], [1980.22, 480], [1980.75, 710],
  [1980.99, 590], [1981.99, 397.5], [1982.47, 297], [1982.99, 457], [1983.12, 509], [1983.99, 382], [1984.99, 308], [1985.15, 284],
  [1985.99, 327], [1986.99, 391], [1987.95, 500], [1988.99, 410], [1989.99, 401], [1990.99, 386], [1991.99, 353], [1992.99, 333],
  [1993.6, 405], [1993.99, 392], [1994.99, 383], [1995.99, 387], [1996.1, 415], [1996.99, 369], [1997.99, 290], [1998.99, 288],
  [1999.55, 252.8], [1999.77, 325], [1999.99, 290], [2000.99, 274.5], [2001.25, 256], [2001.99, 276.5], [2002.99, 342.8],
  [2003.99, 416.3], [2004.99, 435.6], [2005.99, 513], [2006.37, 725], [2006.99, 632], [2007.99, 834], [2008.21, 1011],
  [2008.82, 712.5], [2008.99, 870], [2009.99, 1104], [2010.99, 1405.5], [2011.68, 1895], [2011.99, 1531], [2012.99, 1657.5],
  [2013.99, 1204.5], [2014.99, 1206], [2015.96, 1049.4], [2016.99, 1146], [2017.99, 1291], [2018.99, 1279], [2019.99, 1515],
  [2020.6, 2067], [2020.99, 1888], [2021.99, 1806], [2022.2, 2039], [2022.83, 1630], [2022.99, 1812], [2023.99, 2062],
  [2024.99, 2611], [2025.31, 3430], [2025.6, 3350], [2025.8, 4250], [2025.99, 4320], [2026.08, 5450], [2026.09, 4900],
  [2026.48, 3960], [2026.62, 4430], [2026.75, 4160], [2026.865, 3870], [2026.885, 3540], [2026.9, 3552],
];
const HX = (yr) => (yr - 1998.9) * 0.52;
const HY = (p) => 0.6 + (Math.log10(p) - Math.log10(30)) * 3.35;
const NOTES = [
  { yr: 1971.62, p: 42, html: '<span class="t">35 美元</span><span class="c">1971 年美元和黄金脱钩</span>', cls: 'up' },
  { yr: 1980.05, p: 850, html: '<span class="t gold">850 美元</span><span class="c">1980 年见顶</span>', cls: 'up' },
  { yr: 1999.55, p: 252.8, html: '<span class="t red">252 美元 · 跌了 70%</span><span class="c">1999 年</span>', cls: 'down' },
  { yr: 2011.68, p: 1895, html: '<span class="t gold">1,900 美元</span><span class="c">2011 年见顶</span>', cls: 'left' },
  { yr: 2015.96, p: 1049.4, html: '<span class="t red">1,050 美元 · 跌了 45%</span><span class="c">2015 年</span>', cls: 'down' },
  { yr: 2026.08, p: 5450, html: '<span class="t gold">约 5,600 美元</span><span class="c">今年 1 月见顶</span>', cls: 'left' },
  { yr: 2026.9, p: 3552, html: '<span class="t red">约 3,550 美元</span><span class="c">现在 · 比高点跌了三成多</span>', cls: 'down' },
];
const BRACKETS = [
  { a: 1980.05, b: 2008.0, p: 850, txt: '28 年才回到 1980 年的高点' },
  { a: 2011.68, b: 2020.55, p: 1895, txt: '9 年才回来' },
];
export class GoldHistory extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [0, 0, 22, 0.9] });
    const f = monotone(
      GOLD.map((q) => q[0]),
      GOLD.map((q) => Math.log10(q[1])),
    );
    const T0 = GOLD[0][0];
    const T1 = GOLD[GOLD.length - 1][0];
    this.T0 = T0;
    this.T1 = T1;
    const N = 700;
    const pts = [];
    const pos = [];
    const at = [];
    for (let i = 0; i <= N; i++) {
      const yr = T0 + ((T1 - T0) * i) / N;
      const y = HY(10 ** f(yr));
      const x = HX(yr);
      pts.push(new THREE.Vector3(x, y, 0));
      pos.push(x, 0.04, 0, x, y, 0);
      at.push(0, 1);
    }
    this.line = progTube(pts, 0.075, this.m(new THREE.MeshBasicMaterial({ color: hdr(0xffe2a0, 1.3) })), 8);
    this.add(this.line);
    const idx = [];
    for (let i = 0; i < N; i++) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(at, 1));
    g.setIndex(idx);
    this.areaMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: { uFade: this.fade, uX: { value: -100 } },
      vertexShader: 'attribute float aT; varying float vT; varying float vX; void main(){ vT = aT; vX = position.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader:
        'uniform float uFade; uniform float uX; varying float vT; varying float vX; void main(){ float on = step(vX, uX); float t = clamp(vT, 0.0, 1.0); float a = (0.03 + 0.3 * t * t) * on * uFade; gl_FragColor = vec4(vec3(0.95, 0.68, 0.22), a); }',
    });
    this.add(new THREE.Mesh(g, this.areaMat));
    const base = new THREE.Mesh(new THREE.BoxGeometry(HX(T1) - HX(T0) + 1.2, 0.05, 0.6), this.m(new THREE.MeshStandardMaterial({ color: 0x1a1b20, metalness: 0.6, roughness: 0.4 })));
    base.position.set((HX(T0) + HX(T1)) / 2, 0.025, 0);
    this.add(base);
    [100, 1000].forEach((p) => this.add(dashLine(this, [new THREE.Vector3(HX(T0), HY(p), -0.05), new THREE.Vector3(HX(T1), HY(p), -0.05)], 0xffffff, 0.16)));
    this.lAx = [1000].map((p) => this.label(`<span class="c">${p} 美元</span>`, [HX(T0) - 0.3, HY(p), 0], 'left'));
    this.lYears = [1971, 1980, 1990, 2000, 2011, 2026].map((y) => this.label(`<span class="c">${y}</span>`, [HX(y), 0, 0.5], 'down'));
    this.notes = NOTES.map((n) => {
      const p = new THREE.Vector3(HX(n.yr), HY(n.p), 0);
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), this.m(new THREE.MeshBasicMaterial({ color: hdr(n.html.includes('red') ? COL.risk : COL.gold, 2.0) })));
      s.position.copy(p);
      this.add(s);
      const off = n.cls === 'down' ? [0, -0.3, 0.2] : n.cls === 'left' ? [-0.35, 0, 0.2] : n.cls === 'right' ? [0.35, 0, 0.2] : [0, 0.3, 0.2];
      const l = this.label(n.html, [p.x + off[0], p.y + off[1], off[2]], n.cls);
      return { ...n, s, l, x: p.x };
    });
    const bm = this.m(new THREE.MeshBasicMaterial({ color: hdr(0xff8a7a, 1.3) }));
    this.brackets = BRACKETS.map((b) => {
      const grp = new THREE.Group();
      const x0 = HX(b.a);
      const x1 = HX(b.b);
      const y = HY(b.p) + 0.75;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.045, 0.045), bm);
      bar.position.set((x0 + x1) / 2, y, 0);
      grp.add(bar);
      [x0, x1].forEach((x) => {
        const tk = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.3, 0.045), bm);
        tk.position.set(x, y - 0.15, 0);
        grp.add(tk);
      });
      this.add(grp);
      const l = this.label(`<span class="t red">${b.txt}</span>`, [(x0 + x1) / 2, y + 0.05, 0]);
      return { grp, l, x1, txt: b.txt, narrowHide: b.a > 2000 };
    });
    this.add(blob(this, 34, 6, 0.6));
  }
  update(dt) {
    const t = this.t;
    const p = eInOut(seg(t, 0.4, 4.2));
    this.line.setProgress(p);
    const px = HX(this.T0) + p * (HX(this.T1) - HX(this.T0)) + 0.01;
    this.areaMat.uniforms.uX.value = px;
    for (const n of this.notes) {
      const on = n.x <= px;
      n.s.visible = on;
      n.l.target = on ? 1 : 0;
    }
    for (const b of this.brackets) {
      const on = b.x1 <= px;
      b.grp.visible = on;
      // phones: the second bracket's caption has no room between the 2011 and 2026 peaks
      b.l.target = on && !(b.narrowHide && this.app.ui.narrow()) ? 1 : 0;
      if (!b.narrowHide) b.l.set(`<span class="t red">${this.app.ui.narrow() ? '28 年才回来' : b.txt}</span>`);
    }
    const ax = t > 0.4 ? 1 : 0;
    for (const l of this.lAx) l.target = ax;
    for (const l of this.lYears) l.target = ax;
  }
}
