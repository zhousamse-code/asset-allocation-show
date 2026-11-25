import * as THREE from 'three';
import { Piece, rbox, COL, hdr, lerp, seg, ss, eOut, eInOut, blob } from '../lib.js';
import { bundleSet } from './kit.js';
import { factory } from './act3.js';
import { bankModel } from './fx.js';

/* ================= 1.2  Interest = the "rent" on borrowed money; what 降息 and 降准 actually do =================
   steps: 'many' companies queue up to borrow → the rent (interest) gauge rises
          'few'  business is hard, they leave → the rent falls
          'cut'  降息: the central bank pushes the rent down directly → borrowing is cheaper, some come back
          'rrr'  降准: the bank gets back part of the money it must park at the central bank → more to lend
          'stuck' why the rent cannot go back up: it is already low and still almost nobody borrows; whenever it
                 tries to rise, one of the few borrowers backs away (and those already in debt could not pay)
   All schematic: no rates are read off the gauge. */
const P_CB = new THREE.Vector3(-8.2, 0, -0.8);
const P_VAULT = new THREE.Vector3(-8.2, 0, 2.3);
const P_BANK = new THREE.Vector3(0, 0, 0);
const P_G = new THREE.Vector3(2.75, 0, 1.55);
const NQ = 6;
const QX = (i) => 6.0 + i * 2.1; // queue pad starts at x = 4.55, clear of the bank pad (ends at 4.3): no coplanar overlap
const GH = 4.0; // gauge tube height
const RMB = new THREE.Color(0xd9483b);
const arc = (a, b, u, h, out) => out.set(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u + 4 * h * u * (1 - u), a.z + (b.z - a.z) * u);
const flowU = (tau, speed, k, n) => {
  const v = tau * speed - k / n;
  return v < 0 ? -1 : v % 1;
};
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export class Rates extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [3, 0, 17, 1.05] });
    const stone = this.m(new THREE.MeshStandardMaterial({ color: 0xb2ada3, roughness: 0.6, metalness: 0.05 }));
    const padMat = this.m(new THREE.MeshStandardMaterial({ color: 0x1a1b20, metalness: 0.6, roughness: 0.4 }));
    const pad = (x, z, w, d, rim) => {
      const m = new THREE.Mesh(rbox(w, 0.24, d, 0.08), padMat);
      m.position.set(x, 0.12, z);
      const r = new THREE.Mesh(rbox(w + 0.06, 0.06, d + 0.06, 0.03), this.m(new THREE.MeshBasicMaterial({ color: hdr(rim, 1.3) })));
      r.position.set(x, 0.06, z);
      const g = new THREE.Group();
      g.add(m, r);
      this.add(g);
      return g;
    };

    // the bank and its "rent" gauge
    pad(1.0, 0.2, 6.6, 3.6, 0x9aa0aa);
    const bank = bankModel(this, stone);
    bank.position.set(P_BANK.x - 0.4, 0.24, P_BANK.z);
    this.add(bank);
    const glass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, GH, 32, 1, true),
      this.m(new THREE.MeshPhysicalMaterial({ color: 0xd8e8ff, roughness: 0.05, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide })),
    );
    glass.position.set(P_G.x, 0.24 + GH / 2 + 0.02, P_G.z);
    glass.renderOrder = 5;
    this.add(glass);
    const fg = new THREE.CylinderGeometry(0.34, 0.34, 1, 32);
    fg.translate(0, 0.5, 0);
    this.fill = new THREE.Mesh(fg, this.m(new THREE.MeshStandardMaterial({ color: 0x3a2a08, emissive: COL.gold, emissiveIntensity: 0.9, roughness: 0.3 })));
    this.fill.position.set(P_G.x, 0.26, P_G.z);
    this.add(this.fill);
    const gb = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.18, 32), this.m(new THREE.MeshStandardMaterial({ color: 0x9aa0aa, metalness: 1, roughness: 0.3 })));
    gb.position.set(P_G.x, 0.33, P_G.z);
    this.add(gb);

    // companies that come to borrow
    pad(QX(2.5), 0.4, NQ * 2.1 + 0.6, 3.0, COL.rmb);
    this.q = Array.from({ length: NQ }, (_, i) => {
      const win = this.m(new THREE.MeshBasicMaterial({ color: hdr(0xffd9a0, 1.6) }));
      const f = factory(this, stone, win);
      f.scale.setScalar(0.5);
      this.add(f);
      return { f, win, p: 0, lit: 1 };
    });

    // the central bank, with the vault where banks must park part of their deposits
    this.cb = new THREE.Group();
    this.cb.position.copy(P_CB);
    this.add(this.cb);
    const cbp = new THREE.Mesh(rbox(5.0, 0.24, 6.6, 0.08), padMat);
    cbp.position.set(0, 0.12, 1.4);
    this.cb.add(cbp);
    const cbr = new THREE.Mesh(rbox(5.06, 0.06, 6.66, 0.03), this.m(new THREE.MeshBasicMaterial({ color: hdr(COL.gold, 1.3) })));
    cbr.position.set(0, 0.06, 1.4);
    this.cb.add(cbr);
    const cbm = bankModel(this, this.m(new THREE.MeshStandardMaterial({ color: 0xc9bfa4, roughness: 0.55, metalness: 0.1 })));
    cbm.position.y = 0.24;
    cbm.scale.setScalar(1.2);
    this.cb.add(cbm);
    const vault = new THREE.Mesh(
      rbox(3.2, 1.3, 1.7, 0.06),
      this.m(new THREE.MeshPhysicalMaterial({ color: 0xffe6a6, roughness: 0.08, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide })),
    );
    vault.position.set(0, 0.24 + 0.65 + 0.01, P_VAULT.z - P_CB.z);
    vault.renderOrder = 5;
    this.cb.add(vault);
    for (let i = 0; i < 6; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.3, 8), this.m(new THREE.MeshStandardMaterial({ color: 0x9aa0aa, metalness: 1, roughness: 0.3 })));
      bar.position.set(-1.35 + i * 0.54, 0.24 + 0.66, P_VAULT.z - P_CB.z + 0.86);
      this.cb.add(bar);
    }

    // money: vault bundles 0..7, flows 8..
    this.bills = bundleSet(this, 8 + NQ * 3, { w: 0.86, h: 0.15, d: 0.42 });
    this.add(this.bills.mesh, this.bills.band);
    this.NV = 8;
    this.vslot = Array.from({ length: this.NV }, (_, i) => V(P_VAULT.x - 0.95 + (i % 3) * 0.95, 0.24 + 0.1 + Math.floor(i / 3) * 0.16, P_VAULT.z + (i % 2 ? 0.25 : -0.25)));
    this.pulse = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), this.m(new THREE.MeshBasicMaterial({ color: hdr(COL.gold, 2.4) })));
    this.add(this.pulse);
    this.P = new THREE.Vector3();
    this.add(blob(this, 34, 10, 0.6));

    this.lBank = this.label('<span class="t">银行</span><span class="c">把钱借出去</span>', [P_BANK.x - 0.4, 3.0, 0]);
    this.lGauge = this.label('', [P_G.x, 0.24 + GH + 0.25, P_G.z]);
    this.lQueue = this.label('<span class="t">来借钱的企业</span>', [QX(2.5), 2.1, 0.4]);
    this.lMsg = this.label('', [QX(2.5), 0.05, 2.0], 'down');
    this.lCB = this.label('<span class="t">央行</span>', [P_CB.x, 3.6, P_CB.z]);
    this.lCut = this.label('<span class="t gold">降息：直接把“租金”调低</span>', [-2.6, 5.6, 0.5]);
    this.lVault = this.label('<span class="t">押在央行的钱</span><span class="c">银行不能借出去</span>', [P_VAULT.x, 0.05, P_VAULT.z + 1.5], 'down');
    this.lRrr = this.label('<span class="t gold">降准：少押一点</span>', [-3.9, 3.9, 1.6]);
    this.lDebt = this.label('<span class="t">已经背着债的</span><span class="c">利息一高，就还不起</span>', [(QX(0) + QX(1)) / 2, 2.35, 0.4]);
  }
  update(dt, time) {
    const t = this.t;
    const st = this.st.step || 'many';
    const on = (c) => (c ? 1 : 0);

    // 'stuck': every few seconds the rent tries to climb; the second borrower backs away, so it sinks again
    let bump = 0;
    let away = 0;
    if (st === 'stuck' && t > 1.8) {
      const ph = (t - 1.8) % 6.2;
      bump = eInOut(seg(ph, 0, 0.9)) * (1 - eInOut(seg(ph, 2.9, 3.8)));
      away = eInOut(seg(ph, 0.8, 1.6)) * (1 - eInOut(seg(ph, 3.9, 4.7)));
    }
    // who is in the queue (0 = gone, 1 = there); the first companies stand nearest the bank
    const pres = (i) => {
      const arrive = (t0) => eOut(seg(t, t0, t0 + 0.45));
      if (st === 'stuck') return i === 0 ? arrive(0.3) : i === 1 ? arrive(0.5) * (1 - 0.8 * away) : 0;
      if (st === 'many') return arrive(0.5 + i * 0.42);
      if (st === 'few') return i < 2 ? 1 : 1 - eInOut(seg(t, 0.6 + (5 - i) * 0.55, 1.05 + (5 - i) * 0.55));
      if (st === 'cut') return i < 2 ? 1 : i < 4 ? arrive(2.7 + (i - 2) * 0.5) : 0;
      return i < 4 ? 1 : arrive(3.0 + (i - 4) * 0.5); // rrr: room to lend to more
    };
    let sum = 0;
    this.q.forEach((c, i) => {
      const p = pres(i);
      sum += p;
      // 'stuck': the second borrower only steps back a few paces (still in view), it does not leave the stage
      const back = st === 'stuck' && i === 1 ? away : 0;
      const k = back ? p / (1 - 0.8 * away) : p;
      c.f.position.set(QX(i) + (1 - k) * 7 + back * 3.4, 0.24, 0.35);
      c.f.scale.setScalar(Math.max(0.001, 0.5 * k * (1 - 0.3 * back)));
      c.f.visible = k > 0.01;
    });

    // the rent gauge
    let r;
    if (st === 'many') r = 0.32 + 0.52 * (sum / NQ);
    else if (st === 'few') r = 0.42 + 0.42 * ((sum - 2) / 4);
    else if (st === 'cut') r = lerp(0.42, 0.2, eInOut(seg(t, 1.8, 2.5)));
    else if (st === 'stuck') r = 0.2 + 0.15 * bump;
    else r = 0.2;
    this.fill.scale.y = Math.max(0.01, r * (GH - 0.2));
    const arrow =
      st === 'many'
        ? t > 1.2
          ? '<span class="t red">↑ 涨</span>'
          : ''
        : st === 'few'
          ? t > 1.0
            ? '<span class="t green">↓ 降</span>'
            : ''
          : st === 'cut'
            ? t > 2.0
              ? '<span class="t green">↓ 降</span>'
              : ''
            : st === 'stuck'
              ? '<span class="t red">涨不上去</span>'
              : '';
    this.lGauge.set(`<span class="t gold">借钱的“租金”</span><span class="c">也就是利息</span>${arrow}`);

    // money lent out: a stream from the bank to each company that is there
    const B = V(P_BANK.x + 0.4, 1.9, 0.6);
    for (let i = 0; i < NQ; i++) {
      const p = pres(i);
      const dest = V(QX(i), 1.5, 0.35);
      for (let k = 0; k < 3; k++) {
        const idx = this.NV + i * 3 + k;
        const u = p > 0.95 ? flowU(t - 0.3 - i * 0.2, 0.55, k, 3) : -1;
        if (u < 0) {
          this.bills.hide(idx);
          continue;
        }
        arc(B, dest, u, 1.3 + i * 0.12, this.P);
        const s = ss(0, 0.08, u) * ss(1, 0.92, u);
        this.bills.set(idx, this.P.x, this.P.y, this.P.z, s, RMB, u * 1.1);
      }
    }

    // the central bank appears for 降息 / 降准
    const cbOn = st === 'cut' || st === 'rrr';
    const kcb = cbOn ? (st === 'cut' ? eOut(seg(t, 0.2, 1.0)) : 1) : 0;
    this.cb.scale.setScalar(Math.max(0.001, kcb));
    this.cb.visible = kcb > 0.01;
    // vault bundles; in 'rrr' three of them go back to the bank
    for (let i = 0; i < this.NV; i++) {
      const v = this.vslot[i];
      if (!cbOn || kcb < 0.98) {
        this.bills.hide(i);
        continue;
      }
      let q = 0;
      if (st === 'rrr' && i >= this.NV - 3) q = eInOut(seg(t, 1.3 + (i - this.NV + 3) * 0.35, 2.3 + (i - this.NV + 3) * 0.35));
      if (q >= 1) {
        this.bills.hide(i);
        continue;
      }
      arc(v, V(P_BANK.x - 0.4, 2.2, 0.9), q, 2.0, this.P);
      this.bills.set(i, this.P.x, this.P.y, this.P.z, 1 - ss(0.85, 1, q), RMB, q * 2);
    }
    this.bills.commit();

    // 降息: a pulse from the central bank presses the gauge down
    const pq = st === 'cut' ? seg(t, 1.0, 1.8) : 0;
    this.pulse.visible = pq > 0 && pq < 1;
    if (this.pulse.visible) arc(V(P_CB.x, 4.0, P_CB.z), V(P_G.x, 0.24 + GH + 0.3, P_G.z), pq, 2.2, this.pulse.position);

    const msg =
      st === 'many'
        ? '<span class="t red">借钱的人多 → 租金涨</span>'
        : st === 'few'
          ? '<span class="t green">生意难做，不敢借钱扩张 → 租金降</span>'
          : st === 'cut'
            ? '<span class="t">借钱便宜了，又有人来借</span>'
            : st === 'stuck'
              ? '<span class="t">租金一涨，借钱的人更少</span>'
              : '<span class="t">能借出去的钱多了</span>';
    this.lMsg.set(msg);
    this.lMsg.target = on(st === 'many' ? t > 3.2 : st === 'few' ? t > 1.2 : st === 'stuck' ? t > 2.4 : t > 3.2);
    this.lBank.target = on(t > 0.3);
    this.lGauge.target = on(t > 0.5);
    this.lQueue.target = on(st === 'many' && t > 1.4);
    this.lCB.target = on(cbOn && kcb > 0.9);
    this.lCut.target = on(st === 'cut' && t > 1.6 && !this.app.ui.narrow());
    this.lVault.target = on(st === 'rrr' && t > 0.4);
    this.lRrr.target = on(st === 'rrr' && t > 1.5);
    this.lDebt.target = on(st === 'stuck' && t > 1.0);
  }
}
