import * as THREE from 'three';
import { Piece, rbox, COL, hdr, seg, ss, eInOut, blob, dashLine } from '../lib.js';
import { bundleSet, glowTower } from './kit.js';
import { factory, house } from './act3.js';
import { containerTex } from './act1.js';

/* ---------- 2.1b  The two forces of the FX tug-of-war, as money moving between places ----------
   step 'up':   exporters ship goods, get paid in dollars, swap the dollars for yuan at the bank to pay wages and
                suppliers → more people want yuan → one dollar buys fewer yuan (7.30 → 6.66: the yuan gets dearer)
   step 'down': dollar deposits pay ~3.6 %, yuan deposits 0.95 % → exporters sit on their dollars and others swap
                yuan for dollars → one dollar buys more yuan (6.66 → 7.30: the yuan gets cheaper). Schematic. */
const HI = 7.3;
const LO = 6.66;
const USD_C = new THREE.Color(0x5cc98f);
const RMB_C = new THREE.Color(0xd9483b);
const P_WORK = new THREE.Vector3(-12.2, 0, 0.2);
const P_BANK = new THREE.Vector3(-6.4, 0, 0);
const P_FAC = new THREE.Vector3(-0.6, 0, 0);
const P_BUY = new THREE.Vector3(8.8, 0, 0);
const P_USD = new THREE.Vector3(4.3, 0, -3.6);
const P_RMB = new THREE.Vector3(2.5, 0, -3.6);
const RK = 1.15; // tower height per percentage point

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const arc = (a, b, u, h, out) => out.set(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u + 4 * h * u * (1 - u), a.z + (b.z - a.z) * u);
// position along a looping stream: item k of n enters at the start one after another, never mid-way
const flowU = (tau, speed, k, n) => {
  const v = tau * speed - k / n;
  return v < 0 ? -1 : v % 1;
};

/* a small classical bank: body, four columns, slab and pediment; sits on y = 0 */
export function bankModel(piece, stone) {
  const bank = new THREE.Group();
  const body = new THREE.Mesh(rbox(3.0, 1.7, 1.5, 0.04), stone);
  body.position.set(0, 0.85, -0.35);
  bank.add(body);
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 1.7, 16), stone);
    c.position.set(-1.15 + i * 0.77, 0.85, 0.75);
    bank.add(c);
  }
  const slab = new THREE.Mesh(rbox(3.6, 0.22, 2.3, 0.04), stone);
  slab.position.set(0, 1.81, 0.05);
  bank.add(slab);
  const tri = new THREE.Shape();
  tri.moveTo(-1.85, 0);
  tri.lineTo(1.85, 0);
  tri.lineTo(0, 0.7);
  tri.closePath();
  const pg = new THREE.ExtrudeGeometry(tri, { depth: 2.2, bevelEnabled: false });
  pg.translate(0, 0, -1.05);
  const ped = new THREE.Mesh(pg, stone);
  ped.position.y = 1.92;
  bank.add(ped);
  return bank;
}

export class FxFlow extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [-1.5, 0, 17, 1.0] });
    const stone = this.m(new THREE.MeshStandardMaterial({ color: 0xb2ada3, roughness: 0.6, metalness: 0.05 }));
    const roof = this.m(new THREE.MeshStandardMaterial({ color: 0x8c6f58, roughness: 0.6 }));
    const win = this.m(new THREE.MeshBasicMaterial({ color: hdr(0xffd9a0, 1.6) }));
    const padMat = this.m(new THREE.MeshStandardMaterial({ color: 0x1a1b20, metalness: 0.6, roughness: 0.4 }));
    const pad = (p, w, d, rim) => {
      const m = new THREE.Mesh(rbox(w, 0.24, d, 0.08), padMat);
      m.position.set(p.x, 0.12, p.z);
      this.add(m);
      const r = new THREE.Mesh(rbox(w + 0.06, 0.06, d + 0.06, 0.03), this.m(new THREE.MeshBasicMaterial({ color: hdr(rim, 1.3) })));
      r.position.set(p.x, 0.06, p.z);
      this.add(r);
    };

    // workers & suppliers: two houses
    pad(P_WORK, 4.6, 3.2, COL.rmb);
    [-1.0, 1.1].forEach((dx, i) => {
      const h = house(this, stone, roof, win);
      h.position.set(P_WORK.x + dx, 0.24, P_WORK.z + (i ? 0.5 : -0.4));
      h.scale.setScalar(i ? 0.85 : 1);
      this.add(h);
    });

    // the bank
    pad(P_BANK, 4.4, 3.2, 0x9aa0aa);
    const bank = bankModel(this, stone);
    bank.position.set(P_BANK.x, 0.24, P_BANK.z);
    this.add(bank);

    // exporter: the factory
    pad(P_FAC, 4.4, 3.2, COL.rmb);
    const fac = factory(this, stone, win);
    fac.position.set(P_FAC.x, 0.24, P_FAC.z);
    this.add(fac);

    // foreign buyer: a store with glowing shop windows
    pad(P_BUY, 4.2, 3.2, COL.spx);
    const store = new THREE.Group();
    store.position.set(P_BUY.x, 0.24, P_BUY.z);
    this.add(store);
    const sb = new THREE.Mesh(rbox(3.2, 2.1, 2.0, 0.05), this.m(new THREE.MeshStandardMaterial({ color: 0x2a3446, roughness: 0.5, metalness: 0.3 })));
    sb.position.y = 1.05;
    store.add(sb);
    const sw = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 0.02), this.m(new THREE.MeshBasicMaterial({ color: hdr(0x9cc8ff, 1.5) })));
    sw.position.set(0, 0.75, 1.01);
    store.add(sw);
    const aw = new THREE.Mesh(rbox(3.4, 0.16, 0.7, 0.04), this.m(new THREE.MeshStandardMaterial({ color: COL.spx, roughness: 0.4 })));
    aw.position.set(0, 1.55, 1.2);
    store.add(aw);

    // interest-rate towers (step 'down')
    this.tR = glowTower(this, COL.rmb, { w: 1.25, d: 1.25, em: 0.45 });
    this.tU = glowTower(this, COL.usd, { w: 1.25, d: 1.25, em: 0.45 });
    this.tR.g.position.copy(P_RMB);
    this.tU.g.position.copy(P_USD);
    this.add(this.tR.g, this.tU.g);
    this.tR.setH(0.001);
    this.tU.setH(0.001);

    // goods: containers shipped to the buyer
    this.NC = 4;
    this.boxes = new THREE.InstancedMesh(new THREE.BoxGeometry(1.15, 0.62, 0.62), this.m(new THREE.MeshStandardMaterial({ map: containerTex(), roughness: 0.55, metalness: 0.35 })), this.NC);
    this.boxes.frustumCulled = false;
    this.boxes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.add(this.boxes);

    // money: one pool of bundles shared by all streams
    this.bills = bundleSet(this, 46, { w: 0.86, h: 0.15, d: 0.42 });
    this.add(this.bills.mesh, this.bills.band);
    const top = (p, y, dz = 0) => V(p.x, y, p.z + dz);
    // [from, to, arc height, first bundle, count, colour, speed, start time, which step]
    this.streams = [
      { a: top(P_BUY, 1.2, 1.1), b: top(P_FAC, 1.1, 1.1), h: 1.1, i0: 0, n: 5, c: USD_C, sp: 0.42, t0: 1.3, on: () => true },
      { a: top(P_FAC, 1.6, 0.9), b: top(P_BANK, 1.4, 0.9), h: 1.4, i0: 5, n: 5, c: USD_C, sp: 0.45, t0: 2.4, on: (up) => up },
      { a: top(P_BANK, 1.4, 0.9), b: top(P_WORK, 1.2, 0.9), h: 1.4, i0: 10, n: 6, c: RMB_C, sp: 0.45, t0: 3.0, on: (up) => up },
      { a: top(P_WORK, 1.2, 0.9), b: top(P_BANK, 1.4, 0.9), h: 1.4, i0: 16, n: 5, c: RMB_C, sp: 0.45, t0: 2.6, on: (up) => !up },
      { a: top(P_BANK, 2.4, -0.4), b: V(P_USD.x, 3.6 * RK + 0.35, P_USD.z), h: 1.6, i0: 21, n: 6, c: USD_C, sp: 0.32, t0: 3.1, on: (up) => !up },
    ];
    this.HOARD = 27; // bundles 27..38 pile up next to the factory in step 'down'
    this.NH = 12;
    this.P = new THREE.Vector3();
    this.S = new THREE.Vector3();
    this.M = new THREE.Matrix4();
    this.Q = new THREE.Quaternion();
    this.Z = new THREE.Matrix4().makeScale(0, 0, 0);
    this.goodsA = top(P_FAC, 1.0, -0.9);
    this.goodsB = top(P_BUY, 0.9, -0.9);
    this.add(dashLine(this, [V(P_WORK.x - 2.6, 0.02, 2.2), V(P_FAC.x + 2.4, 0.02, 2.2)], COL.rmb, 0.35));
    this.add(dashLine(this, [V(P_BUY.x - 2.3, 0.02, 2.2), V(P_BUY.x + 2.3, 0.02, 2.2)], COL.spx, 0.45));
    this.add(blob(this, 30, 9, 0.6));

    this.lChina = this.label('<span class="c">国内</span>', [(P_WORK.x + P_FAC.x) / 2, 0, 2.2], 'down');
    this.lAbroad = this.label('<span class="c">国外</span>', [P_BUY.x, 0, 2.2], 'down');
    this.lWork = this.label('<span class="t">工人 · 供应商</span>', [P_WORK.x, 2.5, P_WORK.z]);
    this.lBank = this.label('<span class="t">银行</span>', [P_BANK.x, 2.75, 0]);
    this.lFac = this.label('<span class="t red">出口企业</span>', [P_FAC.x - 0.4, 3.85, P_FAC.z - 0.55]);
    this.lBuy = this.label('<span class="t blue">国外买家</span>', [P_BUY.x, 2.6, P_BUY.z]);
    this.lGoods = this.label('<span class="c">卖货</span>', [(P_FAC.x + P_BUY.x) / 2, 3.2, -0.9]);
    this.lUsd = this.label('<span class="t green">收回美元</span>', [(P_FAC.x + P_BUY.x) / 2, 1.2, 1.1], 'down');
    this.lSwap = this.label('<span class="t">美元换成人民币</span>', [(P_FAC.x + P_BANK.x) / 2, 3.0, 0.9]);
    this.lPay = this.label('<span class="t red">发工资 · 付货款</span>', [(P_BANK.x + P_WORK.x) / 2, 2.85, 0.9]);
    this.lRate = this.label('', [P_BANK.x, 5.6, 0]);
    this.lTR = this.label('<span class="v sm red">0.95%</span><span class="c">人民币 1 年定存</span>', [P_RMB.x, 0, P_RMB.z]);
    this.lTU = this.label('<span class="v sm green">约 3.6%</span><span class="c">美元存款</span>', [P_USD.x, 0, P_USD.z]);
    this.lHoard = this.label('<span class="t green">攒着美元，不急着换</span>', [P_FAC.x + 3.2, 0.1, 1.2], 'down');
    this.lToUsd = this.label('<span class="t green">换成美元存着</span>', [(P_BANK.x + P_USD.x) / 2 - 1.5, 5.6, -1.4]);
  }
  update(dt, time) {
    const t = this.t;
    const up = this.st.step !== 'down';
    const P = this.P;

    // containers: exports (step 'up' only; the next page is about what happens to the dollars)
    for (let k = 0; k < this.NC; k++) {
      const u = up ? flowU(t - 0.5, 0.2, k, this.NC) : -1;
      if (u < 0) {
        this.boxes.setMatrixAt(k, this.Z);
        continue;
      }
      arc(this.goodsA, this.goodsB, u, 1.6, P);
      const s = ss(0, 0.06, u) * ss(1, 0.94, u);
      this.M.compose(P, this.Q.identity(), this.S.setScalar(s));
      this.boxes.setMatrixAt(k, this.M);
    }
    this.boxes.instanceMatrix.needsUpdate = true;

    for (const f of this.streams) {
      const live = f.on(up);
      for (let k = 0; k < f.n; k++) {
        const i = f.i0 + k;
        const u = live ? flowU(t - f.t0, f.sp, k, f.n) : -1;
        if (u < 0) {
          this.bills.hide(i);
          continue;
        }
        arc(f.a, f.b, u, f.h, P);
        const s = ss(0, 0.07, u) * ss(1, 0.93, u);
        this.bills.set(i, P.x, P.y, P.z, s, f.c, u * 1.2);
      }
    }
    // step 'down': dollars pile up at the exporter instead of going to the bank
    const nh = up ? 0 : Math.min(this.NH, Math.floor(Math.max(0, t - 2.0) * 2.2));
    for (let k = 0; k < this.NH; k++) {
      const i = this.HOARD + k;
      if (k >= nh) {
        this.bills.hide(i);
        continue;
      }
      const l = Math.floor(k / 4);
      const r = k % 4;
      this.bills.set(i, P_FAC.x + 2.75 + (r % 2) * 0.92, 0.075 + l * 0.155, 0.5 + Math.floor(r / 2) * 0.46, 1, USD_C, 0);
    }
    this.bills.commit();

    // interest-rate towers
    const kT = up ? 0 : eInOut(seg(t, 0.3, 1.4));
    this.tR.setH(Math.max(0.001, 0.95 * RK * kT));
    this.tU.setH(Math.max(0.001, 3.6 * RK * kT));
    this.tR.g.visible = this.tU.g.visible = kT > 0.002;
    this.lTR.pos.y = 0.95 * RK * kT + 0.15;
    this.lTU.pos.y = 3.6 * RK * kT + 0.15;

    // the exchange rate above the bank: one dollar buys fewer yuan (up) / more yuan (down)
    const k = eInOut(seg(t, 3.4, 6.6));
    const rate = up ? HI + (LO - HI) * k : LO + (HI - LO) * k;
    const dir = k > 0.15 ? (up ? '<span class="t red">人民币变贵了</span>' : '<span class="t green">人民币变便宜了</span>') : '';
    this.lRate.set(`<span class="c">1 美元能换</span><span class="v">${rate.toFixed(2)} 元</span>${dir}`);

    const on = (c) => (c ? 1 : 0);
    // phones: keep the place names and the rate; the arrows-in-words would pile on top of each other
    const wide = !this.app.ui.narrow();
    this.lChina.target = this.lAbroad.target = on(t > 0.3);
    this.lWork.target = this.lBank.target = this.lFac.target = this.lBuy.target = on(t > 0.4);
    this.lGoods.target = on(wide && up && t > 1.0);
    this.lUsd.target = on(wide && up && t > 1.9);
    this.lSwap.target = on(wide && up && t > 2.9);
    this.lPay.target = on(wide && up && t > 3.5);
    this.lRate.target = on(t > 3.2);
    this.lTR.target = this.lTU.target = on(!up && t > 1.2);
    this.lHoard.target = on(!up && t > 2.6);
    this.lToUsd.target = on(wide && !up && t > 3.8);
  }
}
