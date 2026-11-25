import * as THREE from 'three';
import { Piece, rbox, COL, hdr, lerp, seg, ss, eOut, eInOut, blob, dashLine, progTube, monotone, rng } from '../lib.js';
import { SPX } from './act5.js';

const slab = (piece, w, d) => {
  const m = new THREE.Mesh(rbox(w, 0.3, d, 0.08), piece.m(new THREE.MeshStandardMaterial({ color: 0x18191e, metalness: 0.7, roughness: 0.35 })));
  m.position.y = 0.15;
  return m;
};
/* translucent band under a curve, revealed left to right with setDrawRange */
function curtain(piece, pts, y0, color, op) {
  const pos = [];
  for (const p of pts) pos.push(p.x, y0, p.z - 0.02, p.x, p.y, p.z - 0.02);
  const idx = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const m = new THREE.Mesh(g, piece.m(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide })));
  m.setProgress = (p) => g.setDrawRange(0, Math.round(Math.max(0, Math.min(1, p)) * (pts.length - 1)) * 6);
  m.setProgress(0);
  return m;
}

/* ================= 6.x  The Black Swan: Taleb's turkey ================= */
/* A turkey is fed every day for 1,000 days and feels safer every day; day 1,001 is Thanksgiving. */
export class Turkey extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [0, 0, 12, 1.0] });
    const X = (d) => -8.6 + (d / 1000) * 16.6;
    const Y = (v) => 0.55 + v;
    this.X = X;
    this.Y = Y;
    const R = rng(9);
    const val = (d) => 0.35 + 4.7 * (d / 1000) ** 0.8;
    const N = 160;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const d = (i / N) * 1000;
      const jit = i > 0 && i < N ? (R() - 0.5) * 0.1 : 0;
      pts.push(new THREE.Vector3(X(d), Y(val(d) + jit), 0));
    }
    this.pts = pts;
    this.add(slab(this, 19.4, 2.4));
    const axis = new THREE.Mesh(new THREE.BoxGeometry(18.2, 0.04, 0.04), this.m(new THREE.MeshBasicMaterial({ color: hdr(0xdfe9ff, 0.9) })));
    axis.position.set(X(500) + 0.4, Y(0), 0);
    this.add(axis);
    this.line = progTube(pts, 0.075, this.m(new THREE.MeshBasicMaterial({ color: hdr(0xe8f0ff, 1.7) })), 8);
    this.add(this.line);
    this.band = curtain(this, pts, Y(0), hdr(COL.spx, 0.8), 0.13);
    this.add(this.band);
    const top = pts[pts.length - 1];
    this.top = top;
    const drop = [top.clone(), new THREE.Vector3(top.x + 0.12, Y(2.4), 0), new THREE.Vector3(top.x + 0.3, Y(0.02), 0)];
    this.drop = progTube(drop, 0.085, this.m(new THREE.MeshBasicMaterial({ color: hdr(COL.risk, 2.2) })), 8);
    this.add(this.drop);
    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 12), this.m(new THREE.MeshBasicMaterial({ color: hdr(0xffe3b0, 2.0) })));
    this.add(this.head);
    this.add(blob(this, 22, 6, 0.7));

    this.lAxis = this.label('<span class="c">↑ 火鸡的“安全感”</span>', [X(0) + 0.1, Y(4.4), 0], 'right');
    this.lDay1 = this.label('<span class="c">第 1 天</span>', [X(0), Y(0) - 0.1, 0.3], 'down');
    this.lFed = this.label('<span class="t">天天有人喂</span><span class="c">一天比一天放心</span>', [X(430), Y(val(430)) + 0.55, 0]);
    this.lTop = this.label('<span class="t">第 1000 天</span><span class="c">最放心的时候</span>', [top.x - 0.6, top.y + 0.5, 0]);
    this.lDrop = this.label('<span class="t red">第 1001 天：感恩节</span><span class="c">（美国人这天吃火鸡）</span>', [top.x + 0.55, Y(0.5), 0.2], 'right');
    this.lMoral = this.label('<span class="t gold">预测不了，但迟早会来</span>', [top.x - 1.4, top.y + 0.5, 0]);
    this.cHead = hdr(0xffe3b0, 2.0);
    this.cRed = hdr(COL.risk, 2.2);
    this.shook = false;
  }
  enter() {
    this.shook = false;
  }
  update() {
    const t = this.t;
    const p = eInOut(seg(t, 0.4, 3.4));
    this.line.setProgress(p);
    this.band.setProgress(p);
    const q = seg(t, 3.9, 4.15);
    this.drop.setProgress(q);
    const n = this.pts.length - 1;
    const hp = this.pts[Math.min(n, Math.round(p * n))];
    if (q <= 0) this.head.position.copy(hp);
    else this.head.position.set(this.top.x + 0.3 * q, lerp(this.top.y, this.Y(0.02), q * q), 0);
    this.head.visible = t > 0.4;
    this.head.material.color.copy(q > 0 ? this.cRed : this.cHead);
    if (q >= 1 && !this.shook) {
      this.shook = true;
      this.app.shake = 0.7;
    }
    const on = (c) => (c ? 1 : 0);
    this.lAxis.target = on(t > 0.5);
    this.lDay1.target = on(t > 0.5);
    this.lFed.target = on(t > 1.7);
    this.lTop.target = on(t > 3.3 && t < 4.6);
    this.lDrop.target = on(t > 4.3);
    this.lMoral.target = on(t > 5.0);
  }
}

/* ================= 6.x  How long can the money stay in? ================= */
/* S&P 500 price index: from the old high, how long until it was back there (time "underwater"). */
const REC = [
  { name: '2020 疫情', y: 0.5, txt: '半年' },
  { name: '1987 股灾', y: 1.9, txt: '约 2 年' },
  { name: '2022 加息', y: 2.05, txt: '2 年' },
  { name: '2008 金融危机', y: 5.5, txt: '5 年半' },
  { name: '2000 互联网泡沫', y: 7.2, txt: '7 年' },
  { name: '1973 石油危机', y: 7.5, txt: '7 年半' },
  { name: '1929 大萧条', y: 25, txt: '25 年' },
];
const STOPS = [
  { h: 1, html: '<span class="t gold">1 年内要用</span><span class="c">生意周转、应急</span>' },
  { h: 4, html: '<span class="t gold">三五年后要用</span><span class="c">孩子、换房</span>' },
  { h: 10, html: '<span class="t gold">十年以上不用</span><span class="c">养老</span>' },
];
const HX = (yr) => -5.2 + yr * 0.56;
const GREEN = new THREE.Color(COL.ok);
const RED = new THREE.Color(COL.risk);
export class Horizon extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [1, 0, 13, 1.0] });
    this.add(slab(this, 24, 2.2));
    const Y0 = 0.75;
    const row = (i) => 5.75 - i * 0.74;
    const axis = new THREE.Mesh(new THREE.BoxGeometry(HX(26) - HX(0), 0.04, 0.04), this.m(new THREE.MeshBasicMaterial({ color: hdr(0xdfe9ff, 0.9) })));
    axis.position.set((HX(0) + HX(26)) / 2, Y0, 0);
    this.add(axis);
    const geo = new THREE.BoxGeometry(1, 0.4, 0.3);
    geo.translate(0.5, 0, 0);
    this.bars = REC.map((r, i) => {
      const mat = this.m(new THREE.MeshStandardMaterial({ color: 0x14161c, emissive: RED.clone(), emissiveIntensity: 0.75, roughness: 0.4, metalness: 0.2 }));
      const m = new THREE.Mesh(geo, mat);
      m.position.set(HX(0), row(i), 0);
      m.scale.x = 0.001;
      this.add(m);
      const l = this.label(`<span class="c">${r.name} · <b>${r.txt}</b></span>`, [HX(0) - 0.25, row(i), 0], 'left');
      return { ...r, m, mat, l, c: RED.clone() };
    });
    this.ticks = [0, 5, 10, 15, 20, 25].map((y) => {
      const tk = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.04), this.m(new THREE.MeshBasicMaterial({ color: hdr(0xdfe9ff, 0.9) })));
      tk.position.set(HX(y), Y0 - 0.11, 0);
      this.add(tk);
      return this.label(`<span class="c">${y === 0 ? '0' : y + ' 年'}</span>`, [HX(y), Y0 - 0.2, 0], 'down');
    });
    this.lCap = this.label('<span class="c">买在最高点，到涨回这个高点用了多久（标普 500 点位）</span>', [HX(13), Y0 - 0.95, 0.3], 'down');
    // the withdrawal date: a glowing line that moves right
    this.marker = new THREE.Mesh(new THREE.BoxGeometry(0.07, row(0) - Y0 + 0.9, 0.07), this.m(new THREE.MeshBasicMaterial({ color: hdr(COL.gold, 2.0) })));
    this.markerY = (row(0) + 0.9 + Y0) / 2;
    this.add(this.marker);
    this.lMark = this.label('', [0, row(0) + 0.95, 0.2]);
    this.H = 0;
  }
  enter() {
    this.H = 0;
  }
  update(dt) {
    const t = this.t;
    this.bars.forEach((b, i) => {
      const k = eOut(seg(t, 0.3 + i * 0.12, 1.3 + i * 0.12));
      b.m.scale.x = Math.max(0.001, (HX(b.y) - HX(0)) * k);
      b.l.target = k > 0.6 ? 1 : 0;
    });
    // marker: 0 → 1 → 4 → 10 years, with holds
    const s1 = eInOut(seg(t, 1.9, 2.6));
    const s2 = eInOut(seg(t, 3.9, 4.7));
    const s3 = eInOut(seg(t, 5.9, 6.9));
    const H = s3 > 0 ? lerp(4, 10, s3) : s2 > 0 ? lerp(1, 4, s2) : lerp(0, 1, s1);
    this.H = H;
    const x = HX(H);
    this.marker.position.set(x, this.markerY, 0.18);
    this.marker.visible = t > 1.9;
    const stop = s3 > 0.5 ? 2 : s2 > 0.5 ? 1 : 0;
    this.lMark.set(STOPS[stop].html);
    this.lMark.pos.x = x;
    this.lMark.target = t > 2.1 ? 1 : 0;
    // a bar turns green once its whole recovery fits before the withdrawal date
    for (const b of this.bars) {
      const ok = t > 2.0 && b.y <= H + 1e-3;
      b.c.lerp(ok ? GREEN : RED, 1 - Math.exp(-6 * dt));
      b.mat.emissive.copy(b.c);
    }
    for (const l of this.ticks) l.target = t > 0.5 ? 1 : 0;
    this.lCap.target = t > 0.8 ? 1 : 0;
  }
}

/* ================= 6.x  Needing the money in the middle of a crash ================= */
/* 100万 put in at the Oct 2007 high (S&P 500 price index, USD, no dividends): taken out at the 2009 low it is 43万;
   by Mar 2013 it is back to 100万; today about 460万. */
const W0 = 2007.55;
const W1 = 2026.9;
const PEAK = 1565;
const WX = (yr) => -9.4 + ((yr - W0) / (W1 - W0)) * 18.8;
const WY = (v) => 0.75 + (Math.log10(v) - Math.log10(32)) * 4.2;
export class Withdraw extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [0, 0, 12, 1.0] });
    const data = SPX.filter((p) => p[0] >= 2006.9);
    const f = monotone(
      data.map((p) => p[0]),
      data.map((p) => Math.log10((100 * p[1]) / PEAK)),
    );
    const N = 420;
    const a0 = 2007.77;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const yr = a0 + ((W1 - a0) * i) / N;
      pts.push(new THREE.Vector3(WX(yr), WY(10 ** f(yr)), 0));
    }
    this.yrOf = (p) => a0 + (W1 - a0) * p;
    this.pOf = (yr) => (yr - a0) / (W1 - a0);
    this.add(slab(this, 20.4, 2.4));
    this.line = progTube(pts, 0.075, this.m(new THREE.MeshBasicMaterial({ color: hdr(0xe8f0ff, 1.7) })), 8);
    this.add(this.line);
    this.band = curtain(this, pts, WY(32), hdr(COL.spx, 0.8), 0.12);
    this.add(this.band);
    this.add(dashLine(this, [new THREE.Vector3(WX(W0), WY(100), -0.05), new THREE.Vector3(WX(W1) + 0.3, WY(100), -0.05)], 0xffffff, 0.45));
    const dot = (yr, v, col) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 12), this.m(new THREE.MeshBasicMaterial({ color: hdr(col, 2.0) })));
      m.position.set(WX(yr), WY(v), 0.05);
      m.visible = false;
      this.add(m);
      return m;
    };
    this.d0 = dot(2007.77, 100, 0xffffff);
    this.d1 = dot(2009.19, 43.3, COL.risk);
    this.d2 = dot(2013.24, 100.3, 0xffffff);
    this.d3 = dot(2026.9, 460, COL.ok);
    this.l0 = this.label('<span class="t">2007 年最高点</span><span class="c">投进去 100 万</span>', [WX(2007.77), WY(100) + 0.35, 0]);
    this.l1 = this.label('<span class="c">2009 年 3 月就得取</span><span class="v sm red">只剩 43 万</span>', [WX(2009.19), WY(43.3) - 0.3, 0], 'down');
    this.l2 = this.label('<span class="c">多等 4 年</span><span class="v sm">回到 100 万</span>', [WX(2013.24) + 0.35, WY(100.3) - 0.8, 0], 'right');
    this.l3 = this.label('<span class="c">放到现在</span><span class="v sm green">约 460 万</span>', [WX(2026.9), WY(460) + 0.35, 0]);
    this.lCap = this.label('<span class="c">按标普 500 点位、美元算，不含分红</span>', [WX(2019.5), WY(32) - 0.15, 0.3], 'down');
    this.add(blob(this, 23, 6, 0.7));
  }
  update() {
    const t = this.t;
    // three legs: to the 2009 low, back to the old high, on to today
    const p1 = this.pOf(2009.19);
    const p2 = this.pOf(2013.24);
    const p = t < 2.3 ? p1 * eInOut(seg(t, 0.5, 1.7)) : t < 4.2 ? lerp(p1, p2, eInOut(seg(t, 2.4, 3.4))) : lerp(p2, 1, eInOut(seg(t, 4.3, 6.0)));
    this.line.setProgress(p);
    this.band.setProgress(p);
    this.d0.visible = t > 0.4;
    this.d1.visible = p >= p1 - 1e-3;
    this.d2.visible = p >= p2 - 1e-3;
    this.d3.visible = p >= 1 - 1e-3;
    const on = (c) => (c ? 1 : 0);
    this.l0.target = on(t > 0.4);
    this.l1.target = on(t > 1.8);
    this.l2.target = on(t > 3.5);
    this.l3.target = on(t > 6.0);
    this.lCap.target = on(t > 0.8);
  }
}
