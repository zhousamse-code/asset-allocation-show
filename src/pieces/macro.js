import * as THREE from 'three';
import { Piece, rbox, COL, hdr, lerp, clamp, clamp01, seg, ss, eOut, eIn, eInOut, blob, edges, progTube, rng } from '../lib.js';
import { bundleSet } from './kit.js';
import { factory, house } from './act3.js';
import { GY } from './bundles.js';

/* ================= 1.1  Why business got so cut-throat: more goods than buyers (a balance scale) ================= */
const RED = new THREE.Color(0xb3202a);
/* ================= 1.1  Why business got so cut-throat: more goods, fewer buyers =================
   steps: 'goods' factories keep pushing out cartons; exports hit the tariff wall and come back home
          'money' house prices fall, people stop spending and park the money in the bank
          'price' too many goods for the money: prices get cut again and again
          'share' the root: household spending is only ~40% of China's economy (US ~68%) */
const FAC = [new THREE.Vector3(-10.4, 0, -2.4), new THREE.Vector3(-7.9, 0, -3.5)];
const WALL_X = -13.6;
const SAFE = new THREE.Vector3(9.4, 0, 2.5);
const HOUSE = new THREE.Vector3(10.6, 0, -2.6);
const JUG = [new THREE.Vector3(15.2, 0, 0.6), new THREE.Vector3(18.6, 0, 0.6)];
const JUG_H = 4.0;
const SHARE = [0.4, 0.68];
const arcTo = (a, b, u, h, out) => out.set(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u + 4 * h * u * (1 - u), a.z + (b.z - a.z) * u);
export class Scale extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [2, 0, 17, 1.1] });
    const metal = this.m(new THREE.MeshStandardMaterial({ color: 0x2c2f36, metalness: 0.85, roughness: 0.3 }));
    const steel = this.m(new THREE.MeshStandardMaterial({ color: 0x9aa0aa, metalness: 1, roughness: 0.28 }));
    const ped = new THREE.Mesh(rbox(4.2, 0.3, 2.4, 0.08), metal);
    ped.position.y = 0.15;
    this.add(ped);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 5.5, 24), metal);
    pillar.position.y = 0.3 + 2.75;
    this.add(pillar);
    this.PY = 5.9;
    this.L = 4.6;
    this.HANG = 2.55;
    this.pivot = new THREE.Group();
    this.pivot.position.y = this.PY;
    this.add(this.pivot);
    const beam = new THREE.Mesh(rbox(this.L * 2 + 0.6, 0.24, 0.5, 0.06), metal);
    this.pivot.add(beam);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(this.L * 2 + 0.4, 0.03, 0.03), this.m(new THREE.MeshBasicMaterial({ color: hdr(0xffffff, 0.9) })));
    strip.position.set(0, 0.06, 0.26);
    this.pivot.add(strip);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), steel);
    this.pivot.add(cap);
    const panGeo = new THREE.CylinderGeometry(1.7, 1.58, 0.16, 48);
    const rodGeo = new THREE.CylinderGeometry(0.025, 0.025, 1, 6);
    rodGeo.translate(0, 0.5, 0);
    this.pans = [-1, 1].map((side) => {
      const g = new THREE.Group();
      this.add(g);
      g.add(new THREE.Mesh(panGeo, steel));
      const top = new THREE.Vector3(0, this.HANG, 0);
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + 0.5;
        const p = new THREE.Vector3(Math.cos(a) * 1.55, 0.05, Math.sin(a) * 1.55);
        const rod = new THREE.Mesh(rodGeo, steel);
        rod.position.copy(p);
        const dir = top.clone().sub(p);
        rod.scale.y = dir.length();
        rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        g.add(rod);
      }
      return { g, side };
    });
    // goods: cartons on the left pan
    const SL = [];
    const layer = (y, xs, zs) => xs.forEach((x) => zs.forEach((z) => SL.push([x, y, z])));
    layer(0.33, [-0.7, 0, 0.7], [-0.36, 0.36]);
    layer(0.83, [-0.7, 0, 0.7], [-0.36, 0.36]);
    layer(1.33, [-0.35, 0.35], [-0.36, 0.36]);
    layer(1.83, [-0.35, 0.35], [0]);
    layer(2.33, [0], [0]);
    this.slots = SL;
    this.NG = SL.length;
    this.G0 = 4;
    const cartonGeo = rbox(0.66, 0.48, 0.64, 0.03, 2);
    const cartonMat = this.m(new THREE.MeshStandardMaterial({ color: 0xb48a58, roughness: 0.85, metalness: 0 }));
    const tapeGeo = new THREE.BoxGeometry(0.14, 0.49, 0.65);
    const tapeMat = this.m(new THREE.MeshStandardMaterial({ color: 0xe3cc9a, roughness: 0.6 }));
    const inst = (geo, mat, n, parent) => {
      const m = new THREE.InstancedMesh(geo, mat, n);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      parent.add(m);
      return m;
    };
    this.cartons = inst(cartonGeo, cartonMat, this.NG, this.pans[0].g);
    this.tape = inst(tapeGeo, tapeMat, this.NG, this.pans[0].g);
    // cartons in flight: from the factories, and the export ones that bounce off the tariff wall
    this.NF = 8;
    this.fly = inst(cartonGeo, cartonMat, this.NF, this.inner);
    this.flyT = inst(tapeGeo, tapeMat, this.NF, this.inner);
    // money on the right pan
    this.NM = 12;
    this.M1 = 3;
    this.money = bundleSet(this, this.NM, { w: 0.92, h: 0.17, d: 0.46 });
    this.pans[1].g.add(this.money.mesh, this.money.band);
    this.mslot = [];
    for (let l = 0; l < 3; l++) for (let k = 0; k < 4; k++) this.mslot.push([k % 2 ? 0.5 : -0.5, 0.17 + l * 0.18, k < 2 ? -0.26 : 0.26]);
    this.cols = Array.from({ length: this.NM }, (_, i) => RED.clone().offsetHSL(0, 0, ((i * 0.37) % 1 - 0.5) * 0.06));

    // props: factories, the tariff wall, a house, the savings safe, two measuring jugs
    const stone = this.m(new THREE.MeshStandardMaterial({ color: 0xb2ada3, roughness: 0.6, metalness: 0.05 }));
    const roof = this.m(new THREE.MeshStandardMaterial({ color: 0x8c6f58, roughness: 0.6 }));
    const win = this.m(new THREE.MeshBasicMaterial({ color: hdr(0xffd9a0, 1.6) }));
    this.facs = FAC.map((p) => {
      const f = factory(this, stone, win);
      f.position.copy(p);
      f.scale.setScalar(0.7);
      this.add(f);
      return f;
    });
    this.wall = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 3.4, 3.6),
      this.m(new THREE.MeshStandardMaterial({ color: 0x3a0d0b, emissive: COL.risk, emissiveIntensity: 0.7, transparent: true, opacity: 0.8, depthWrite: false })),
    );
    this.wall.position.set(WALL_X, 1.72, -0.6);
    this.add(this.wall);
    this.house = house(this, stone, roof, win);
    this.house.position.copy(HOUSE);
    this.house.scale.setScalar(1.25);
    this.add(this.house);
    const safe = new THREE.Group();
    safe.position.copy(SAFE);
    this.add(safe);
    const sb = new THREE.Mesh(rbox(1.8, 1.6, 1.4, 0.08), this.m(new THREE.MeshStandardMaterial({ color: 0x3a3f48, metalness: 0.85, roughness: 0.35 })));
    sb.position.y = 0.8;
    safe.add(sb);
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 28), steel);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(0.25, 0.85, 0.72);
    safe.add(dial);
    this.jugs = JUG.map((p, i) => {
      const g = new THREE.Group();
      g.position.copy(p);
      this.add(g);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.3, 0.2, 40), metal);
      base.position.y = 0.1;
      g.add(base);
      const glass = new THREE.Mesh(
        new THREE.CylinderGeometry(1.05, 1.05, JUG_H, 40, 1, true),
        this.m(new THREE.MeshPhysicalMaterial({ color: 0xd8e8ff, roughness: 0.05, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide })),
      );
      glass.position.y = 0.21 + JUG_H / 2;
      glass.renderOrder = 5;
      g.add(glass);
      const fg = new THREE.CylinderGeometry(0.98, 0.98, 1, 40);
      fg.translate(0, 0.5, 0);
      const col = i ? COL.spx : COL.rmb;
      const fill = new THREE.Mesh(fg, this.m(new THREE.MeshStandardMaterial({ color: new THREE.Color(col).multiplyScalar(0.35), emissive: col, emissiveIntensity: 0.55, roughness: 0.3 })));
      fill.position.y = 0.21;
      fill.scale.y = 0.001;
      g.add(fill);
      return { g, fill };
    });
    this.add(blob(this, 40, 10, 0.75));

    this.Mx = new THREE.Matrix4();
    this.Z = new THREE.Matrix4().makeScale(0, 0, 0);
    this.P = new THREE.Vector3();
    this.lFac = this.label('<span class="t">前些年拼命扩产</span>', [(FAC[0].x + FAC[1].x) / 2, 2.9, -3.0]);
    this.lWall = this.label('<span class="t red">出口碰上关税</span>', [WALL_X, 3.6, -0.6]);
    this.lBack = this.label('<span class="c">只好转回国内卖</span>', [WALL_X + 2.6, 0.9, 1.4], 'down');
    this.lGoods = this.label('<span class="t">东西多了</span>', [0, -0.2, 0], 'down', this.pans[0].g);
    this.lMoney = this.label('<span class="t">买的人少了</span>', [0, -0.2, 0], 'down', this.pans[1].g);
    this.lHouse = this.label('<span class="t red">房价跌了 ↓</span><span class="c">家里的钱“缩水”</span>', [HOUSE.x, 3.3, HOUSE.z]);
    this.lSafe = this.label('<span class="t">存起来，不敢花</span><span class="c">收入、养老心里没底</span>', [SAFE.x - 1.1, 0.8, SAFE.z], 'left');
    this.lPrice = this.label('', [0, 3.15, 0], 'up', this.pans[0].g);
    this.lResult = this.label('<span class="v red">供大于求</span>', [0, this.PY + 0.75, 0]);
    this.lJug = JUG.map((p, i) => this.label(`<span class="v sm ${i ? 'blue' : 'red'}">约 ${Math.round(SHARE[i] * 100)}%</span><span class="t">${i ? '美国' : '中国'}</span>`, [p.x, 0, p.z]));
    this.lJugCap = this.label('<span class="c">老百姓花的钱，占整个经济的比例</span>', [(JUG[0].x + JUG[1].x) / 2, 0.21 + JUG_H + 0.35, 0.6]);
    this.ang = 0;
    this.vel = 0;
  }
  enter(st, prev, fresh) {
    if (fresh) {
      this.ang = 0;
      this.vel = 0;
    }
  }
  update(dt, time) {
    const t = this.t;
    const st = this.st.step || 'goods';
    const goods = st === 'goods';
    const on = (c) => (c ? 1 : 0);
    // cartons in the pan: they pile up during 'goods', the pile is full afterwards
    const nG = goods ? Math.min(this.NG, this.G0 + Math.max(0, Math.floor((t - 1.0) / 0.3))) : this.NG;
    for (let k = 0; k < this.NG; k++) {
      if (k >= nG) {
        this.cartons.setMatrixAt(k, this.Z);
        this.tape.setMatrixAt(k, this.Z);
        continue;
      }
      const [x, y, z] = this.slots[k];
      this.Mx.makeRotationY(((k * 0.618) % 1 - 0.5) * 0.25).setPosition(x, y, z);
      this.cartons.setMatrixAt(k, this.Mx);
      this.tape.setMatrixAt(k, this.Mx);
    }
    this.cartons.instanceMatrix.needsUpdate = true;
    this.tape.instanceMatrix.needsUpdate = true;
    // cartons in flight (step 'goods'): half go straight to the pan, half try to export and bounce back
    const pan0 = this.pans[0].g.position;
    const dest = this.P.set(pan0.x, pan0.y + 2.4, 0).clone();
    for (let k = 0; k < this.NF; k++) {
      const exportOne = k % 2 === 1;
      const v = goods ? (t - 0.6) * 0.38 - k / this.NF : -1;
      if (v < 0) {
        this.fly.setMatrixAt(k, this.Z);
        this.flyT.setMatrixAt(k, this.Z);
        continue;
      }
      const u = v % 1;
      const src = FAC[k % 4 < 2 ? 0 : 1];
      const a = new THREE.Vector3(src.x, 2.0, src.z);
      if (!exportOne) arcTo(a, dest, u, 1.4, this.P);
      else if (u < 0.5) arcTo(a, new THREE.Vector3(WALL_X + 0.4, 2.2, -0.6), u / 0.5, 1.2, this.P);
      else arcTo(new THREE.Vector3(WALL_X + 0.4, 2.2, -0.6), dest, (u - 0.5) / 0.5, 1.0, this.P);
      const s = 0.85 * Math.min(1, u / 0.06) * Math.min(1, (1 - u) / 0.06);
      this.Mx.makeRotationY(u * 3 + k).scale(new THREE.Vector3(s, s, s)).setPosition(this.P);
      this.fly.setMatrixAt(k, this.Mx);
      this.flyT.setMatrixAt(k, this.Mx);
    }
    this.fly.instanceMatrix.needsUpdate = true;
    this.flyT.instanceMatrix.needsUpdate = true;
    // money leaves the right pan for the safe (step 'money'); gone afterwards
    const pan1 = this.pans[1].g.position;
    let wM = 0;
    for (let i = 0; i < this.NM; i++) {
      const [x, y, z] = this.mslot[i];
      const leaving = i >= this.M1;
      const order = this.NM - 1 - i;
      const q = !leaving || goods ? 0 : st === 'money' ? seg(t, 0.9 + order * 0.3, 1.6 + order * 0.3) : 1;
      if (q <= 0) wM += 1;
      if (q >= 1) {
        this.money.hide(i);
        continue;
      }
      const e = eInOut(q);
      const tx = SAFE.x - pan1.x;
      const ty = 1.7 - pan1.y;
      const tz = SAFE.z;
      this.money.set(i, x + (tx - x) * e, y + (ty - y) * e + Math.sin(Math.PI * e) * 2.2, z + (tz - z) * e, 1 - ss(0.8, 1, q), this.cols[i], q * 1.6, 0);
    }
    this.money.commit();
    // the beam tips toward whichever side is heavier
    const target = clamp((nG - wM * 0.62) * 0.0135, -0.3, 0.3);
    const n = 4;
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      this.vel += ((target - this.ang) * 26 - this.vel * 5.2) * h;
      this.ang += this.vel * h;
    }
    this.pivot.rotation.z = this.ang + Math.sin(time * 1.1) * 0.004;
    const c = Math.cos(this.pivot.rotation.z);
    const sn = Math.sin(this.pivot.rotation.z);
    for (const p of this.pans) p.g.position.set(p.side * this.L * c, this.PY + p.side * this.L * sn - this.HANG, 0);
    // the house loses value (it sinks a little and goes grey-red) in step 'money' and after
    const kh = goods ? 0 : st === 'money' ? eInOut(seg(t, 0.6, 1.8)) : 1;
    this.house.position.y = HOUSE.y - 0.35 * kh;
    this.house.rotation.z = -0.06 * kh;
    // step 'price': the price tag keeps dropping
    const kp = st === 'price' ? eInOut(seg(t, 0.8, 4.4)) : st === 'share' ? 1 : 0;
    const price = Math.round(100 - 22 * kp);
    this.lPrice.set(`<span class="c">出厂价</span><span class="v sm red">¥${price}${kp > 0.05 ? ' ↓' : ''}</span>`);
    // step 'share': the two jugs fill
    this.jugs.forEach((j, i) => {
      j.g.visible = st === 'share';
      const k = st === 'share' ? eInOut(seg(t, 0.5 + i * 0.3, 2.2 + i * 0.3)) : 0;
      j.fill.scale.y = Math.max(0.001, SHARE[i] * (JUG_H - 0.1) * k);
      this.lJug[i].pos.y = 0.21 + SHARE[i] * (JUG_H - 0.1) * k + 0.2;
      this.lJug[i].target = on(st === 'share' && k > 0.6);
    });
    this.lJugCap.target = on(st === 'share' && t > 0.8);
    this.lFac.target = on(goods && t > 0.5);
    this.lWall.target = on(goods && t > 1.6);
    this.lBack.target = on(goods && t > 2.6);
    this.lGoods.target = on(t > 0.4 && st !== 'share');
    this.lMoney.target = on(t > 0.4 && st !== 'share' && !goods);
    this.lHouse.target = on(st === 'money' && t > 1.0);
    this.lSafe.target = on(st === 'money' && t > 1.8);
    this.lPrice.target = on(st === 'price' && t > 0.6);
    this.lResult.target = on(st === 'price' && t > 0.4);
  }
}

/* ================= 1.3  "Releasing water": the money supply (M2) vs. the economy (GDP) ================= */
/* 万亿元, year-end.  M2: PBOC; GDP: NBS (nominal). */
export const M2 = [
  [2015, 139.2],
  [2017, 167.7],
  [2019, 198.6],
  [2021, 238.3],
  [2023, 292.3],
  [2025, 340.3],
];
export const GDP = [
  [2015, 68.9],
  [2017, 83.2],
  [2019, 98.7],
  [2021, 114.9],
  [2023, 126.1],
  [2025, 140.2],
];
export class MoneyStack extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [0, 0, 11, 1.0] });
    const ped = new THREE.Mesh(rbox(15, 0.14, 3.0, 0.05), this.m(new THREE.MeshStandardMaterial({ color: 0x15161b, metalness: 0.6, roughness: 0.4 })));
    ped.position.y = 0.07;
    this.add(ped);
    this.cols = M2.map(([yr, v], c) => ({ yr, v, n: Math.round(v / 10), x: (c - 2.5) * 2.35, g: GDP[c][1] }));
    const total = this.cols.reduce((s, c) => s + c.n, 0);
    this.set = bundleSet(this, total);
    this.add(this.set.mesh, this.set.band);
    this.items = [];
    const R = rng(17);
    this.cols.forEach((c, ci) => {
      for (let k = 0; k < c.n; k++)
        this.items.push({ ci, k, x: c.x + (R() - 0.5) * 0.06, z: (R() - 0.5) * 0.06, r: (R() - 0.5) * 0.05, col: RED.clone().offsetHSL(0, 0, (R() - 0.5) * 0.07) });
    });
    const top = (n) => 0.14 + n * GY;
    // GDP line in front of the stacks
    const pts = this.cols.map((c) => new THREE.Vector3(c.x, top(c.g / 10), 0.62));
    this.gdp = progTube(pts, 0.06, this.m(new THREE.MeshBasicMaterial({ color: hdr(0x5fd4cc, 1.25) })), 8);
    this.add(this.gdp);
    this.dots = this.cols.map((c, i) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), this.m(new THREE.MeshBasicMaterial({ color: hdr(0x5fd4cc, 1.6) })));
      s.position.copy(pts[i]);
      this.add(s);
      return s;
    });
    this.add(blob(this, 18, 6, 0.7));
    this.lVal = this.cols.map((c) => this.label(`<span class="t">${Math.round(c.v)}</span>`, [c.x, top(c.n) + 0.12, 0]));
    this.lYr = this.cols.map((c) => this.label(`<span class="c">${c.yr}</span>`, [c.x, 0, 1.55], 'down'));
    const last = this.cols[this.cols.length - 1];
    this.lM2 = this.label('<span class="t">市面上的钱（M2）</span><span class="c">单位：万亿元 · 十年约翻了 2.4 倍</span>', [this.cols[1].x, top(this.cols[4].n) + 0.6, 0]);
    this.lGdp = this.label('<span class="t teal">经济总量（GDP）</span><span class="c">约翻了一倍</span>', [last.x + 0.9, top(last.g / 10), 0.62], 'right');
    this.T = this.cols.map((c, i) => 0.5 + i * 0.5);
  }
  update(dt, time) {
    const t = this.t;
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      const t0 = this.T[it.ci] + it.k * 0.022;
      const q = seg(t, t0, t0 + 0.34);
      if (q <= 0) {
        this.set.hide(i);
        continue;
      }
      const y = 0.14 + 0.13 + it.k * GY + (1 - q * q) * 2.6;
      this.set.set(i, it.x, y, it.z, 1, it.col, it.r);
    }
    this.set.commit();
    this.cols.forEach((c, i) => {
      this.lVal[i].target = t > this.T[i] + c.n * 0.022 + 0.3 ? 1 : 0;
      this.lYr[i].target = t > 0.4 ? 1 : 0;
    });
    const pg = eInOut(seg(t, 4.0, 5.4));
    this.gdp.setProgress(pg);
    this.dots.forEach((d, i) => (d.visible = pg >= i / (this.dots.length - 1) - 0.001 && pg > 0));
    this.lGdp.target = pg > 0.98 ? 1 : 0;
    this.lM2.target = t > 3.6 ? 1 : 0;
  }
}

/* ================= 1.4  More money, thinner money: a pot of tea that keeps getting water added ================= */
const TEA = new THREE.Color(0x8a4a10);
const TEA_E = new THREE.Color(0x3a1a04);
const PALE = new THREE.Color(0xd8cfae);
const PALE_E = new THREE.Color(0x2a2720);
export class Dilute extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [0, 0, 9, 1.1] });
    const R = 1.75;
    const H = 5.6;
    const B = 0.25;
    Object.assign(this, { R, H, B });
    const glassMat = this.m(
      new THREE.MeshPhysicalMaterial({ color: 0xdde9ff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.8, clearcoat: 1 }),
    );
    const wall = new THREE.CylinderGeometry(R, R * 0.93, H, 64, 1, true);
    wall.translate(0, H / 2 + B, 0);
    const w = new THREE.Mesh(wall, glassMat);
    w.renderOrder = 6;
    this.add(w);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(R * 0.93, R * 0.93, B, 64),
      this.m(new THREE.MeshPhysicalMaterial({ color: 0xdde9ff, roughness: 0.1, transparent: true, opacity: 0.35, envMapIntensity: 1.5, clearcoat: 1 })),
    );
    base.position.y = B / 2;
    this.add(base);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.03, 8, 72), this.m(new THREE.MeshBasicMaterial({ color: hdr(0xffffff, 1.0), transparent: true, opacity: 0.8 })));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = H + B;
    this.add(rim);
    // tea
    const lg = new THREE.CylinderGeometry(R * 0.92, R * 0.87, 1, 64);
    lg.translate(0, 0.5, 0);
    this.lMat = this.m(new THREE.MeshStandardMaterial({ color: TEA.clone(), emissive: TEA_E.clone(), emissiveIntensity: 1, roughness: 0.15, transparent: true, opacity: 0.86, depthWrite: false }));
    this.liq = new THREE.Mesh(lg, this.lMat);
    this.liq.position.y = B;
    this.liq.renderOrder = 3;
    this.add(this.liq);
    this.sMat = this.m(new THREE.MeshStandardMaterial({ color: TEA.clone(), emissive: TEA_E.clone(), emissiveIntensity: 1.3, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.92, depthWrite: false }));
    this.surf = new THREE.Mesh(new THREE.CircleGeometry(R * 0.92, 64), this.sMat);
    this.surf.rotation.x = -Math.PI / 2;
    this.surf.renderOrder = 4;
    this.add(this.surf);
    // tea leaves = the real goods: a fixed amount at the bottom
    this.NL = 70;
    const lgeo = new THREE.SphereGeometry(1, 8, 6);
    lgeo.scale(0.17, 0.035, 0.09);
    this.leaves = new THREE.InstancedMesh(lgeo, this.m(new THREE.MeshStandardMaterial({ color: 0x4a5a22, roughness: 0.7, emissive: 0x141a06, emissiveIntensity: 1 })), this.NL);
    this.leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.leaves.frustumCulled = false;
    this.leaves.renderOrder = 2;
    this.add(this.leaves);
    const r = rng(9);
    this.lf = Array.from({ length: this.NL }, () => ({ a: r() * Math.PI * 2, r: 0.2 + r() * 1.25, y: B + 0.08 + r() * 0.55, w: 0.08 + r() * 0.12, s: r() * 10, sp: r() * Math.PI }));
    // faucet + water
    const steel = this.m(new THREE.MeshStandardMaterial({ color: 0x9aa0aa, metalness: 1, roughness: 0.28 }));
    this.mouth = new THREE.Vector3(-0.45, B + H + 1.45, 0.15);
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-5.2, B + H + 2.6, -1.2),
      new THREE.Vector3(-1.6, B + H + 2.6, -0.2),
      new THREE.Vector3(-0.6, B + H + 2.3, 0.1),
      new THREE.Vector3(-0.47, B + H + 1.75, 0.15),
      new THREE.Vector3(-0.45, B + H + 1.5, 0.15),
    ]);
    this.add(new THREE.Mesh(new THREE.TubeGeometry(path, 70, 0.22, 16, false), steel));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.06, 10, 28), steel);
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(this.mouth).setY(this.mouth.y + 0.04);
    this.add(ring);
    const cg = new THREE.CylinderGeometry(0.1, 0.15, 1, 16, 1, true);
    cg.translate(0, -0.5, 0);
    this.stream = new THREE.Mesh(cg, this.m(new THREE.MeshBasicMaterial({ color: hdr(0x7ab8ff, 1.1), transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false })));
    this.stream.position.copy(this.mouth);
    this.stream.renderOrder = 5;
    this.add(this.stream);
    this.add(blob(this, 7, 5, 0.85));
    this.Mx = new THREE.Matrix4();
    this.Q = new THREE.Quaternion();
    this.E = new THREE.Euler();
    this.S = new THREE.Vector3();
    this.P = new THREE.Vector3();
    this.lLeaf = this.label('<span class="t">茶叶 = 实实在在的东西</span><span class="c">没多出多少</span>', [R + 0.35, B + 0.55, 0], 'right');
    this.lWater = this.label('<span class="t blue">水 = 钱</span><span class="c">一直在往里加</span>', [-3.0, B + H + 2.95, -0.6]);
    this.lTaste = this.label('<span class="t">茶越来越淡</span><span class="c">每一块钱，能买的东西越来越少</span>', [R + 0.35, 0, 0], 'right');
    this.L0 = 1.35;
  }
  update(dt, time) {
    const t = this.t;
    const { B, H } = this;
    const level = lerp(this.L0, H - 0.55, eInOut(seg(t, 0.8, 6.2)));
    this.liq.scale.y = level;
    this.surf.position.y = B + level + 0.002;
    const k = Math.pow(this.L0 / level, 1.15);
    this.lMat.color.copy(PALE).lerp(TEA, k);
    this.lMat.emissive.copy(PALE_E).lerp(TEA_E, k);
    this.lMat.opacity = lerp(0.42, 0.86, k);
    this.sMat.color.copy(PALE).lerp(TEA, k);
    this.sMat.emissive.copy(PALE_E).lerp(TEA_E, k);
    this.sMat.opacity = lerp(0.5, 0.92, k);
    const pouring = t > 0.5 && t < 6.6;
    const sk = pouring ? ss(0.5, 0.9, t) * (1 - ss(6.2, 6.6, t)) : 0;
    this.stream.visible = sk > 0.01;
    this.stream.scale.set(sk, Math.max(0.01, this.mouth.y - (B + level)), sk);
    for (let i = 0; i < this.NL; i++) {
      const L = this.lf[i];
      const a = L.a + time * L.w;
      this.E.set(Math.sin(time * 0.7 + L.s) * 0.4, a + L.sp, Math.cos(time * 0.6 + L.s) * 0.3);
      this.Q.setFromEuler(this.E);
      this.P.set(Math.cos(a) * L.r, L.y + Math.sin(time * 0.9 + L.s) * 0.05, Math.sin(a) * L.r);
      this.Mx.compose(this.P, this.Q, this.S.setScalar(1));
      this.leaves.setMatrixAt(i, this.Mx);
    }
    this.leaves.instanceMatrix.needsUpdate = true;
    this.lTaste.pos.y = B + level + 0.1;
    this.lLeaf.target = t > 0.6 ? 1 : 0;
    this.lWater.target = t > 0.9 ? 1 : 0;
    this.lTaste.target = t > 3.8 ? 1 : 0;
  }
}
