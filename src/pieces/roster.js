import * as THREE from 'three';
import { Piece, rbox, COL, hdr, lerp, clamp01, seg, ss, eOut, eIn, eInOut, blob } from '../lib.js';
import { glowTower } from './kit.js';

/* ================= 3.3  Owning the index = automatic "drop the laggards, add the new leaders" =================
   A stage = the index. A year counter runs 2000 -> 2026. Companies that collapse get pushed off the stage;
   newcomers drop into the free slot. Heights are schematic (roughly market value). */
const Y0 = 2000;
const Y1 = 2026;
/* the year counter runs, then stops at each change so there is time to read it:
   [seconds of running, year reached, seconds held there] */
const PLAN = [
  [0.5, 2001.85, 1.4],
  [0.9, 2005.9, 1.4],
  [0.7, 2008.7, 1.3],
  [0.5, 2010.95, 1.3],
  [1.8, 2020.9, 1.4],
  [1.1, 2026, 0],
];
const KEYS = [[0, Y0], [0.9, Y0]];
const HOLD = {};
{
  let tt = 0.9;
  for (const [run, y, hold] of PLAN) {
    tt += run;
    KEYS.push([tt, y]);
    HOLD[y] = tt;
    tt += hold;
    if (hold) KEYS.push([tt, y]);
  }
}
const T_END = KEYS[KEYS.length - 1][0];
const yearAt = (t) => {
  if (t >= T_END) return Y1;
  for (let i = 0; i < KEYS.length - 1; i++) {
    const [a, ya] = KEYS[i];
    const [b, yb] = KEYS[i + 1];
    if (t <= b) return b > a ? ya + ((yb - ya) * (t - a)) / (b - a) : yb;
  }
  return Y1;
};
const SLOTS = [-6.5, -3.9, -1.3, 1.3, 3.9, 6.5];

const COS = [
  { name: '苹果', slot: 0, end: '2000 年还是小个子<br>如今是指数里最大的公司', H: [[2000, 0.7], [2003, 0.6], [2007, 1.9], [2012, 3.8], [2016, 3.6], [2020, 5.0], [2026, 6.4]] },
  { name: '安然', slot: 1, out: 2001.85, note: '2001 · 财务造假破产，出局', H: [[2000, 2.3], [2001, 2.0], [2001.85, 0.9]] },
  { name: '英伟达', slot: 1, in: 2001.85, note: '2001 · 补进，顶的正是安然的位置', end: '当年的替补<br>如今是指数里第二大', H: [[2001.85, 0.6], [2008, 0.5], [2015, 0.9], [2018, 1.8], [2020, 2.6], [2023, 4.0], [2026, 5.6]] },
  { name: 'AT&T', slot: 2, out: 2005.9, note: '2005 · 老电话公司被收购，出局', H: [[2000, 2.6], [2002, 1.5], [2005.9, 1.0]] },
  { name: '亚马逊', slot: 2, in: 2005.9, note: '2005 · 补进，顶的正是 AT&T 的位置', H: [[2005.9, 0.8], [2010, 1.4], [2015, 2.3], [2020, 4.0], [2022, 3.0], [2026, 4.4]] },
  { name: '雷曼兄弟', slot: 3, out: 2008.7, note: '2008 · 金融危机中破产，出局', H: [[2000, 1.1], [2007, 1.8], [2008.7, 0.6]] },
  { name: '新公司', slot: 3, in: 2008.7, note: '2008 · 补进', H: [[2008.7, 0.7], [2026, 1.3]], plain: true },
  { name: '柯达', slot: 4, out: 2010.95, note: '2010 · 被数码相机淘汰，出局', H: [[2000, 1.3], [2005, 0.9], [2010.95, 0.45]] },
  { name: '新公司', slot: 4, in: 2010.95, note: '2010 · 补进', H: [[2010.95, 0.6], [2026, 1.1]], plain: true },
  { name: '一家地产公司', slot: 5, out: 2020.9, note: '2020 · 规模太小，被调出', H: [[2000, 0.9], [2010, 0.8], [2020.9, 0.55]], plain: true },
  { name: '特斯拉', slot: 5, in: 2020.9, note: '2020 · 补进', H: [[2020.9, 3.0], [2022, 3.6], [2023, 2.4], [2026, 3.6]] },
];
const hAt = (H, y) => {
  if (y <= H[0][0]) return H[0][1];
  for (let i = 0; i < H.length - 1; i++) {
    const [a, ha] = H[i];
    const [b, hb] = H[i + 1];
    if (y <= b) {
      const k = (y - a) / (b - a);
      return ha + (hb - ha) * (k * k * (3 - 2 * k));
    }
  }
  return H[H.length - 1][1];
};
const C_OK = new THREE.Color(COL.spx);
const C_BAD = new THREE.Color(0xc0392b);
const C_NEW = new THREE.Color(COL.ok);
const C_PLAIN = new THREE.Color(0x7d8ea6);

export class Roster extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [0, 0, 13, 1.05] });
    const stage = new THREE.Mesh(rbox(16.2, 0.6, 3.4, 0.08), this.m(new THREE.MeshStandardMaterial({ color: 0x17181e, metalness: 0.7, roughness: 0.32 })));
    stage.position.y = 0.3;
    this.add(stage);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(16.0, 0.04, 0.04), this.m(new THREE.MeshBasicMaterial({ color: hdr(COL.spx, 2.0) })));
    edge.position.set(0, 0.6, 1.7);
    this.add(edge);
    const tileMat = this.m(new THREE.MeshStandardMaterial({ color: 0x1f2128, metalness: 0.6, roughness: 0.4 }));
    for (const x of SLOTS) {
      const tile = new THREE.Mesh(rbox(2.1, 0.03, 2.3, 0.01), tileMat);
      tile.position.set(x, 0.615, 0);
      this.add(tile);
    }
    // a green ring that lights up when a newcomer joins
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.05, 10, 64), this.m(new THREE.MeshBasicMaterial({ color: hdr(COL.ok, 2.4), transparent: true, opacity: 1 })));
    this.ring.rotation.x = Math.PI / 2;
    this.ring.visible = false;
    this.add(this.ring);
    this.add(blob(this, 20, 8, 0.7));
    this.cos = COS.map((c) => {
      const tw = glowTower(this, c.plain ? 0x7d8ea6 : COL.spx, { w: 1.35, d: 1.35, em: 0.4 });
      this.add(tw.g);
      const lab = this.label(`<span class="t">${c.name}</span>`, [0, 0, 0], 'up', tw.g);
      return { ...c, tw, lab, col: new THREE.Color() };
    });
    this.lYear = this.label('', [-8.6, 0.65, 0], 'left');
    this.lStage = this.label('<span class="c">台上 = 指数里的公司（示意，高矮约等于市值）</span>', [0, 0, 1.9], 'down');
  }
  enter() {
    this.ring.visible = false;
  }
  update(dt, time) {
    const t = this.t;
    const y = yearAt(t);
    const done = t > T_END + 0.4;
    let ringOn = 0;
    let ringX = 0;
    for (const c of this.cos) {
      const { tw, lab } = c;
      const g = tw.g;
      const x = SLOTS[c.slot];
      const tIn = c.in ? HOLD[c.in] + 0.6 : 0;
      if (c.in && t < tIn) {
        g.visible = false;
        lab.target = 0;
        continue;
      }
      g.visible = true;
      const h = hAt(c.H, Math.min(y, c.out || Y1));
      tw.setH(Math.max(0.05, h));
      let px = x;
      let py = 0.62;
      let pz = 0;
      let rx = 0;
      let sc = 1;
      let health = c.out ? 1 - seg(y, c.out - 4, c.out) : 1;
      let html = `<span class="t">${c.name}</span>`;
      let show = t > 0.5 ? 1 : 0;
      if (c.out && t >= HOLD[c.out]) {
        const q = seg(t, HOLD[c.out], HOLD[c.out] + 1.2);
        const s = seg(q, 0.1, 0.42);
        const f = seg(q, 0.3, 0.75);
        pz = 2.6 * eIn(s);
        py = 0.62 - 0.62 * f * f;
        rx = 1.35 * eIn(f);
        sc = 1 - ss(0.8, 1, q);
        health = 0;
        html = `<span class="t red">${c.name}</span><span class="c">${c.note}</span>`;
        show = q < 0.75 ? 1 : 0;
        if (q >= 1) {
          g.visible = false;
          lab.target = 0;
          continue;
        }
      } else if (c.in) {
        const ti = tIn;
        const e = seg(t, ti, ti + 0.5);
        py = 0.62 + 7 * (1 - e * e);
        if (e >= 1) {
          const b = seg(t, ti + 0.5, ti + 0.75);
          py = 0.62 + Math.sin(b * Math.PI) * 0.12 * (1 - b);
        }
        const fresh = t - ti;
        if (fresh < 1.9) {
          html = `<span class="t green">${c.name}</span><span class="c">${c.note}</span>`;
          ringOn = Math.max(ringOn, 1 - ss(1.2, 1.8, fresh));
          ringX = x;
        }
      }
      if (done && c.end) html = `<span class="t blue">${c.name}</span><span class="c">${c.end}</span>`;
      g.position.set(px, py, pz);
      g.rotation.x = rx;
      g.scale.setScalar(Math.max(0.001, sc));
      // colour: healthy blue, collapsing red, newcomers start green
      const base = c.plain ? C_PLAIN : C_OK;
      c.col.copy(C_BAD).lerp(base, health);
      if (c.in) c.col.lerp(C_NEW, 1 - ss(0.6, 2.0, t - tIn));
      tw.bm.emissive.copy(c.col);
      tw.cm.color.copy(c.col).multiplyScalar(2.1);
      lab.pos.set(0, tw.h + 0.25, 0);
      lab.set(html);
      lab.target = show;
    }
    this.ring.visible = ringOn > 0.01;
    if (this.ring.visible) {
      this.ring.position.set(ringX, 0.66, 0);
      this.ring.scale.setScalar(1 + (1 - ringOn) * 0.25);
      this.ring.material.opacity = ringOn;
    }
    this.lYear.set(`<span class="v">${Math.floor(y)} 年</span>`);
    this.lYear.target = t > 0.4 ? 1 : 0;
    this.lStage.target = t > 0.6 ? 1 : 0;
  }
}
