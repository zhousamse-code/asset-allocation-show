import * as THREE from 'three';
import { Piece, rbox, COL, clamp01, lerp, eInOut, ss, rng, canvasTex, blob } from '../lib.js';

/* 200 bundles = 200 万元 (one bundle = 1 万). The same bundles become the allocation towers later:
   70% S&P 500 (140 bundles) + 30% gold (60 bundles). */
const N = 200;
export const BW = 1.56;
export const BH = 0.26;
export const BD = 0.76;
const GX = 1.62;
export const GY = 0.272;
const GZ = 0.8;
const NS = 140; // S&P 500 bundles
const PER = 6; // bundles per tower layer (3 wide x 2 deep)
const TX = [-2.95, 2.95];
const LAYERS = [Math.ceil(NS / PER), Math.ceil((N - NS) / PER)];
const catOf = (i) => (i < NS ? 0 : 1);
const idxIn = (i) => (i < NS ? i : i - NS);
const HERO = 9 * 20 + 3 * 5 + 2;

/* buying plan: gold in one go; the S&P part in 7 batches of 20 (FX quotas / ETF premiums make it gradual) */
const NB = 7;
const batchOf = (i) => (i < NS ? Math.floor(i / 20) : -1);
function pilePos(i, out) {
  const layer = Math.floor(i / 20);
  const r = i % 20;
  return out.set(((r % 5) - 2) * GX, BH / 2 + layer * GY, (Math.floor(r / 5) - 1.5) * GZ);
}
function towerPos(cat, k, out) {
  const layer = Math.floor(k / PER);
  const r = k % PER;
  return out.set(TX[cat] + ((r % 3) - 1) * GX, BH / 2 + layer * GY, (Math.floor(r / 3) - 0.5) * GZ);
}
function queuePos(i, out) {
  const b = batchOf(i);
  const k = i % 20;
  return out.set(-1.2 + b * 1.6 + ((k % 2) - 0.5) * 0.82, BH / 2 + Math.floor(k / 2) * GY, 5.4);
}
export function noteTex() {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#000000';
    g.globalAlpha = 0.07;
    for (let y = 2; y < h; y += 3) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
    g.globalAlpha = 0.16;
    g.lineWidth = 2;
    g.strokeRect(7, 7, w - 14, h - 14);
  });
}

const TOWER_TXT = [
  ['70%', '标普 500', '140 万 · 长期增长', 'blue'],
  ['30%', '黄金', '60 万 · 对冲 · 抗贬值', 'gold'],
];

export class Bundles extends Piece {
  constructor(app, name, origin, kind) {
    super(app, name, origin, { spot: [0, 0.5, 12, 1.15] });
    this.kind = kind;
    const R = rng(kind === 'cover' ? 7 : kind === 'alloc' ? 11 : 13);
    this.jit = Array.from({ length: N }, () => [R() - 0.5, R() - 0.5, R()]);
    const mat = this.m(new THREE.MeshStandardMaterial({ color: 0xffffff, map: noteTex(), roughness: 0.5, metalness: 0.05 }));
    this.mesh = new THREE.InstancedMesh(rbox(BW, BH, BD, 0.035, 2), mat, N);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    const bmat = this.m(new THREE.MeshStandardMaterial({ color: 0xcdbf9f, roughness: 0.78 }));
    this.band = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, BH + 0.014, BD + 0.016), bmat, N);
    this.band.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.band.frustumCulled = false;
    this.add(this.mesh);
    this.add(this.band);
    this.add(blob(this, kind === 'cover' ? 13 : 20, kind === 'cover' ? 8 : 10, 0.8));

    this.S = Array.from({ length: N }, () => ({
      p: new THREE.Vector3(),
      c: new THREE.Color(),
      r: 0,
      s: 1,
      p0: new THREE.Vector3(),
      c0: new THREE.Color(),
      r0: 0,
      s0: 1,
      p1: new THREE.Vector3(),
      c1: new THREE.Color(),
      r1: 0,
      s1: 1,
      t0: 0,
      dur: 1,
      arc: 0,
      drop: false,
      key: -1,
      sky: false,
    }));
    this.M = new THREE.Matrix4();
    this.P = new THREE.Vector3();
    this.Q = new THREE.Quaternion();
    this.E = new THREE.Euler();
    this.SC = new THREE.Vector3();
    this.red = new THREE.Color(0xb3202a);
    this.cash = new THREE.Color(0xb9bdc4);
    this.catC = [0x2f7fe0, 0xe0ad3c].map((c) => new THREE.Color(c));
    this.batchNow = -1;

    if (kind === 'cover') {
      this.lTotal = this.label('<span class="c">200 捆 × 每捆 1 万元</span>', [0, 0, 2.3], 'down');
      this.lHero = this.label('<span class="v">1 万元</span><span class="c">一捆</span>', [0, 0, 0]);
    } else {
      this.lTower = TOWER_TXT.map(([pct, nm, sub, cls], c) =>
        this.label(`<span class="v ${cls}">${pct}</span><span class="t">${nm}</span><span class="c">${sub}</span>`, [TX[c], LAYERS[c] * GY + 0.3, 0]),
      );
      this.lBatch = this.label('', [3.6, 0, 6.4], 'down');
    }
  }

  spawn(st) {
    const tmp = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const S = this.S[i];
      S.key = -1;
      S.sky = false;
      if (st.mode === 'pile') {
        pilePos(i, S.p);
        S.p.y += 14 + Math.floor(i / 20) * 0.3;
        S.c.copy(this.red);
        S.sky = true;
      } else if (st.mode === 'unit') {
        pilePos(i, S.p);
        S.c.copy(this.red);
      } else if (st.mode === 'alloc') {
        pilePos(i, S.p);
        S.c.copy(this.red).offsetHSL(0, 0, this.jit[i][0] * 0.06);
      } else if (st.mode === 'final') {
        towerPos(catOf(i), idxIn(i), tmp);
        S.p.copy(tmp);
        S.p.y += 14;
        S.c.copy(this.catC[catOf(i)]);
        S.sky = true;
      } else {
        towerPos(catOf(i), idxIn(i), S.p);
        S.c.copy(this.catC[catOf(i)]);
      }
      S.r = 0;
      S.s = 1;
      S.p0.copy(S.p);
      S.c0.copy(S.c);
      S.t0 = 0;
      S.dur = 0.001;
    }
  }

  enter(st, prev, fresh) {
    if (fresh) this.spawn(st);
    // the piece clock restarts at 0 on every new state: rebase running animations so that
    // bundles which already arrived stay where they are
    else if (this.lastT) for (const S of this.S) S.t0 -= this.lastT;
    this.lastT = 0;
    this.batchNow = -1;
  }

  retarget(i, S, key, mode, t) {
    const j = this.jit[i];
    S.p0.copy(S.p);
    S.c0.copy(S.c);
    S.r0 = S.r;
    S.s0 = S.s;
    S.key = key;
    S.drop = false;
    if (key === 1) {
      pilePos(i, S.p1);
      S.c1.copy(this.red).offsetHSL(0, 0, j[0] * 0.06);
      S.r1 = j[1] * 0.03;
      S.s1 = 1;
      const layer = Math.floor(i / 20);
      if (S.sky) {
        S.t0 = t + 0.25 + layer * 0.13 + j[2] * 0.12;
        S.dur = 0.75;
        S.arc = 0;
        S.drop = true;
      } else {
        S.t0 = t + j[2] * 0.3;
        S.dur = 0.9;
        S.arc = 0.3;
      }
    } else if (key === 2) {
      pilePos(i, S.p1);
      S.p1.x *= 1.12;
      S.p1.z *= 1.15;
      S.p1.y = S.p1.y * 1.5 + 0.04;
      S.c1.copy(this.red).offsetHSL(0, 0, j[0] * 0.06);
      S.r1 = j[1] * 0.07;
      S.s1 = 1;
      S.t0 = t + j[2] * 0.35;
      S.dur = 1.0;
      S.arc = 0.15;
    } else if (key === 3) {
      S.p1.set(0.4, 4.6, 3.3);
      S.c1.copy(this.red).offsetHSL(0, 0.02, 0.05);
      S.r1 = -0.42;
      S.s1 = 1.35;
      S.t0 = t + 0.45;
      S.dur = 1.3;
      S.arc = 0.5;
    } else if (key === 4) {
      const c = catOf(i);
      const k = idxIn(i);
      towerPos(c, k, S.p1);
      S.c1.copy(this.catC[c]).offsetHSL(0, 0, j[0] * 0.05);
      S.r1 = j[1] * 0.03;
      S.s1 = 1;
      if (S.sky) {
        S.t0 = t + 0.2 + Math.floor(k / PER) * 0.06 + c * 0.12 + j[2] * 0.1;
        S.dur = 0.8;
        S.arc = 0;
        S.drop = true;
      } else if (mode === 'batch') {
        S.t0 = t + (c === 1 ? k * 0.008 : (i % 20) * 0.025);
        S.dur = 0.8;
        S.arc = 1.8;
      } else {
        S.t0 = t + 0.7 + c * 0.35 + k * 0.01 + j[2] * 0.12;
        S.dur = 1.15;
        S.arc = 2.2;
      }
    } else {
      // waiting in line as cash: one stack per batch, in front of the towers
      queuePos(i, S.p1);
      S.c1.copy(this.cash).offsetHSL(0, 0, j[0] * 0.03);
      S.r1 = Math.PI / 2;
      S.s1 = 1;
      S.t0 = t + 0.15 + batchOf(i) * 0.05 + (i % 20) * 0.015;
      S.dur = 0.9;
      S.arc = 1.6;
    }
    S.sky = false;
  }

  update(dt, time, st) {
    const t = this.t;
    this.lastT = t;
    const mode = st.mode;
    let batchNow = -1;
    if (mode === 'batch') batchNow = Math.min(NB - 1, Math.floor((t - 2.6) / 0.85));
    this.batchNow = batchNow;
    for (let i = 0; i < N; i++) {
      const S = this.S[i];
      let key;
      if (mode === 'pile') key = 1;
      else if (mode === 'unit') key = i === HERO ? 3 : 2;
      else if (mode === 'batch') {
        const b = batchOf(i);
        key = b < 0 || b <= batchNow ? 4 : 10 + b;
      } else key = 4;
      if (key !== S.key) this.retarget(i, S, key, mode, t);
      const k = clamp01((t - S.t0) / S.dur);
      if (S.drop) {
        const f = k < 0.82 ? (k / 0.82) ** 2 : 1;
        S.p.lerpVectors(S.p0, S.p1, f);
        if (k >= 0.82) {
          const b = (k - 0.82) / 0.18;
          S.p.y += Math.sin(b * Math.PI) * 0.06 * (1 - b);
        }
        S.c.lerpColors(S.c0, S.c1, ss(0, 0.8, k));
        S.r = lerp(S.r0, S.r1, f);
        S.s = lerp(S.s0, S.s1, f);
      } else {
        const e = eInOut(k);
        S.p.lerpVectors(S.p0, S.p1, e);
        S.p.y += Math.sin(Math.PI * e) * S.arc;
        S.c.lerpColors(S.c0, S.c1, ss(0.25, 0.85, k));
        S.r = lerp(S.r0, S.r1, e) + Math.sin(Math.PI * e) * S.arc * 0.12;
        S.s = lerp(S.s0, S.s1, e);
      }
      this.P.copy(S.p);
      if (mode === 'unit' && i === HERO && k >= 1) this.P.y += Math.sin(time * 1.3) * 0.08;
      this.E.set(i === HERO && mode === 'unit' ? 0.18 : 0, S.r, 0);
      this.Q.setFromEuler(this.E);
      this.SC.setScalar(S.s);
      this.M.compose(this.P, this.Q, this.SC);
      this.mesh.setMatrixAt(i, this.M);
      this.band.setMatrixAt(i, this.M);
      this.mesh.setColorAt(i, S.c);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.band.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
    this.inner.rotation.y = this.kind === 'cover' ? Math.sin(time * 0.12) * 0.12 : this.kind === 'final' ? Math.sin(time * 0.1) * 0.18 : 0;

    if (this.kind === 'cover') {
      this.lTotal.target = mode === 'pile' && t > 2.6 ? 1 : mode === 'unit' && t > 1.2 ? 1 : 0;
      const H = this.S[HERO];
      this.lHero.pos.set(H.p.x, H.p.y + 0.62, H.p.z);
      this.lHero.target = mode === 'unit' && t > 1.7 ? 1 : 0;
    } else {
      const show = mode === 'alloc' ? t > 2.4 : mode === 'final' ? t > 1.6 : mode === 'batch';
      for (let c = 0; c < 2; c++) {
        const l = this.lTower[c];
        let top = LAYERS[c] * GY;
        if (mode === 'batch' && c === 0) top = Math.ceil(((batchNow + 1) * 20) / PER) * GY;
        l.pos.y = top + 0.3;
        if (mode === 'batch')
          l.set(
            c === 1
              ? '<span class="t gold">黄金 60 万</span><span class="c">没有额度限制，一次买齐</span>'
              : `<span class="t blue">标普 500 · 已买 ${Math.max(0, batchNow + 1) * 20} 万</span><span class="c">受额度和溢价限制，分批进场</span>`,
          );
        else l.set(`<span class="v ${TOWER_TXT[c][3]}">${TOWER_TXT[c][0]}</span><span class="t">${TOWER_TXT[c][1]}</span><span class="c">${TOWER_TXT[c][2]}</span>`);
        l.target = show && !(mode === 'batch' && c === 0 && batchNow < 0) && !(mode === 'batch' && c === 1 && t < 0.8) ? 1 : 0;
      }
      if (mode === 'batch') {
        const b = batchNow + 1;
        this.lBatch.set(
          b >= NB
            ? '<span class="v green">分几批，买齐了</span><span class="c">溢价低时买一批，高了就等一等（示意）</span>'
            : `<span class="v">${b <= 0 ? '等待中的现金' : `第 ${b} 批`}</span><span class="c">溢价低时买一批，高了就等一等（示意）</span>`,
        );
        this.lBatch.target = t > 0.8 ? 1 : 0;
      } else this.lBatch.target = 0;
    }
  }
}
