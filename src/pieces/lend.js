import * as THREE from 'three';
import { Piece, rbox, hdr, seg, damp, eInOut, eOutBack, blob, textPlane } from '../lib.js';
import { bundleSet } from './kit.js';
import { factory, house } from './act3.js';
import { bankModel } from './fx.js';

/* ================= 1.3  Why cheaper borrowing means more money: every loan a bank makes is new money =================
   The step between "降息" and "放水". One bundle = 10 万.
   steps: 'lend' someone deposits 100 万; the bank keeps 10 and lends 90. The depositor's passbook still says 100,
                 and the borrower now holds 90: together 190, where there was 100.
          'loop' the borrower pays a supplier 90; the supplier deposits it (passbook: 90); the bank keeps 10 and
                 lends 80 again: 100 + 90 + 80 = 270. Each round adds one more sum.
   Schematic: "keeps 10 万 each time" is only there so the numbers stay round. */
const PAD = 0.24;
const XH = -8.5; // depositor
const XB = -2.2; // bank
const XF = 4.6; // borrower
const XS = 10.6; // the supplier who gets paid (second step only)
const ZS = 2.0; // the row in front of the buildings where the money and the passbooks sit
const N = 10;
const RMB = new THREE.Color(0xd9483b);
const slots = (x) =>
  Array.from({ length: N }, (_, k) => new THREE.Vector3(x + ((k % 2) - 0.5) * 0.96, PAD + 0.09 + Math.floor(k / 2) * 0.165, ZS));
const SH = slots(XH);
const SB = slots(XB);
const SF = slots(XF);
const SS = slots(XS);
const arc = (a, b, u, h, out) => out.set(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u + 4 * h * u * (1 - u), a.z + (b.z - a.z) * u);
const fly = (t, t0, dur, i) => eInOut(seg(t, t0 + i * 0.07, t0 + dur + i * 0.07));

export class Lend extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [1, 0, 16, 1.05] });
    const stone = this.m(new THREE.MeshStandardMaterial({ color: 0xb2ada3, roughness: 0.6, metalness: 0.05 }));
    const roof = this.m(new THREE.MeshStandardMaterial({ color: 0x7a3a30, roughness: 0.7 }));
    const roof2 = this.m(new THREE.MeshStandardMaterial({ color: 0x2f5d7a, roughness: 0.7 }));
    const win = this.m(new THREE.MeshBasicMaterial({ color: hdr(0xffd9a0, 1.6) }));
    const padMat = this.m(new THREE.MeshStandardMaterial({ color: 0x1a1b20, metalness: 0.6, roughness: 0.4 }));
    const pad = (x, rim, parent) => {
      const m = new THREE.Mesh(rbox(4.6, PAD, 5.0, 0.08), padMat);
      m.position.set(x, PAD / 2, 0.7);
      const r = new THREE.Mesh(rbox(4.66, 0.06, 5.06, 0.03), this.m(new THREE.MeshBasicMaterial({ color: hdr(rim, 1.3) })));
      r.position.set(x, 0.06, 0.7);
      parent.add(m, r);
    };
    const put = (obj, x, s, parent = this.inner) => {
      obj.position.set(x, PAD, -0.4);
      obj.scale.setScalar(s);
      parent.add(obj);
    };
    pad(XH, 0xf2c14e, this.inner);
    pad(XB, 0x9aa0aa, this.inner);
    pad(XF, 0xe8483c, this.inner);
    put(house(this, stone, roof, win), XH, 1.4);
    put(bankModel(this, stone), XB, 1.15);
    put(factory(this, stone, win), XF, 0.95);
    // the supplier only joins in the second step
    this.shop = new THREE.Group();
    this.shop.position.set(XS, 0, 0);
    this.add(this.shop);
    pad(0, 0xf2c14e, this.shop);
    put(house(this, stone, roof2, win), 0, 1.4, this.shop);

    // a passbook: what the depositor holds once the cash is in the bank
    const book = (x) => {
      const g = new THREE.Group();
      const card = new THREE.Mesh(rbox(1.5, 0.95, 0.08, 0.03), this.m(new THREE.MeshStandardMaterial({ color: 0x8f1d22, emissive: 0x3a0a0c, roughness: 0.5 })));
      g.add(card);
      const txt = textPlane(this, '存折', { w: 1.3, h: 0.6, px: 300, color: '#f2c14e', glow: 0.5 });
      txt.position.z = 0.045;
      g.add(txt);
      g.position.set(x, PAD + 0.52, ZS);
      g.rotation.x = -0.22;
      this.add(g);
      return g;
    };
    this.book1 = book(XH);
    this.book2 = book(XS);

    this.bills = bundleSet(this, N, { w: 0.86, h: 0.15, d: 0.42 });
    this.add(this.bills.mesh, this.bills.band);
    this.P = new THREE.Vector3();
    this.add(blob(this, 30, 10, 0.6));

    this.lHouse = this.label('<span class="t">存钱的人</span>', [XH, 3.15, -0.4]);
    this.lBank = this.label('<span class="t">银行</span>', [XB, 3.6, -0.4]);
    this.lFac = this.label('<span class="t">借钱的人</span>', [XF, 3.2, -0.4]);
    this.lShop = this.label('<span class="t">收到货款的人</span>', [XS, 3.15, -0.4]);
    // one row of amounts along the front edge: these are what the total below adds up
    this.lBook1 = this.label('', [XH, 0.1, ZS + 0.75], 'down');
    this.lBook2 = this.label('<span class="v sm gold">存折 90 万</span><span class="c">货款存进了银行</span>', [XS, 0.1, ZS + 0.75], 'down');
    this.lKeep = this.label('', [XB, 0.1, ZS + 0.75], 'down');
    this.lGot = this.label('', [XF, 0.1, ZS + 0.75], 'down');
    this.pill = [
      this.label('<span class="pill">① 存进 100 万 →</span>', [(XH + XB) / 2, 4.3, 1.0]),
      this.label('<span class="pill">② 借出 90 万 →</span>', [(XB + XF) / 2, 4.3, 1.0]),
      this.label('<span class="pill">③ 花出去：付货款 90 万 →</span>', [(XF + XS) / 2, 4.3, 1.0]),
      this.label('<span class="pill">← ④ 又存进银行</span>', [(XS + XB) / 2, 6.3, 1.4]),
      this.label('<span class="pill">⑤ 再借出 80 万 →</span>', [(XB + XF) / 2, 4.3, 1.0]),
    ];
    this.lSum = this.label('', [-1.95, 0.1, 6.4], 'down');
    this.kShop = 0;
    this.cx = -1.95;
  }
  enter(st, prev, fresh) {
    if (fresh) {
      this.kShop = st.step === 'loop' ? 1 : 0;
      this.cx = st.step === 'loop' ? 1.05 : -1.95;
    }
  }
  /* where bundle i is at time t of a step */
  place(i, loop, t, out) {
    if (!loop) {
      if (i > 0) {
        const u2 = fly(t, 3.2, 0.9, i);
        if (u2 > 0) return arc(SB[i], SF[i - 1], u2, 2.2, out);
      }
      return arc(SH[i], SB[i], fly(t, 0.9, 0.9, i), 2.2, out);
    }
    if (i === 0) return out.copy(SB[0]);
    if (i > 1) {
      const u3 = fly(t, 5.3, 0.9, i);
      if (u3 > 0) return arc(SB[i], SF[i - 2], u3, 2.2, out);
    }
    const u2 = fly(t, 2.9, 1.2, i);
    if (u2 > 0) return arc(SS[i - 1], SB[i], u2, 4.4, out);
    return arc(SF[i - 1], SS[i - 1], fly(t, 0.7, 0.9, i), 2.0, out);
  }
  update(dt) {
    const t = this.t;
    const loop = this.st.step === 'loop';
    const on = (c) => (c ? 1 : 0);
    const nar = this.app.ui.narrow();

    for (let i = 0; i < N; i++) {
      this.place(i, loop, t, this.P);
      this.bills.set(i, this.P.x, this.P.y, this.P.z, 1, RMB, 0);
    }
    this.bills.commit();

    this.kShop = damp(this.kShop, loop ? 1 : 0, 4, dt);
    this.shop.visible = this.kShop > 0.01;
    this.shop.scale.setScalar(Math.max(0.001, this.kShop));

    // the passbooks pop up once the cash has gone into the bank
    const b1 = loop ? 1 : eOutBack(seg(t, 2.3, 2.8));
    const b2 = loop ? eOutBack(seg(t, 4.5, 5.0)) : 0;
    this.book1.visible = b1 > 0.01;
    this.book1.scale.setScalar(Math.max(0.001, b1));
    this.book2.visible = b2 > 0.01;
    this.book2.scale.setScalar(Math.max(0.001, b2));

    const lent = loop || t > 4.8;
    const pre = nar ? ['', ''] : ['存折 ', '现金 ']; // phones: the four stations stand close together, numbers only
    this.lBook1.set(`<span class="v sm gold">${pre[0]}100 万</span>${lent ? '<span class="c">一分没少，随时能花</span>' : ''}`);
    this.lBook1.target = on(b1 > 0.9);
    this.lBook2.set(`<span class="v sm gold">${pre[0]}90 万</span><span class="c">货款存进了银行</span>`);
    this.lShop.set(nar ? '<span class="t">收款的人</span>' : '<span class="t">收到货款的人</span>');
    this.lBook2.target = on(b2 > 0.9);
    this.lHouse.target = this.lBank.target = this.lFac.target = on(t > 0.3 || loop);
    this.lShop.target = on(loop && this.kShop > 0.8);
    this.lKeep.set(loop && t > 6.9 ? '<span class="c">每次留 10 万备用</span>' : '<span class="c">留 10 万备用</span>');
    this.lKeep.target = on(lent);
    this.lGot.set(loop && t > 2 ? `<span class="v sm">${pre[1]}80 万</span><span class="c">又借到一笔</span>` : `<span class="v sm">${pre[1]}90 万</span><span class="c">借来的，拿去用</span>`);
    this.lGot.target = on(loop ? t < 0.7 || t > 6.9 : t > 4.8);
    this.pill[0].target = on(!loop && t > 0.9 && !nar);
    this.pill[1].target = on(!loop && t > 3.2 && !nar);
    this.pill[2].target = on(loop && t > 0.7 && !nar);
    this.pill[3].target = on(loop && t > 2.9 && !nar);
    this.pill[4].target = on(loop && t > 5.3 && !nar);

    this.cx = damp(this.cx, loop ? 1.05 : -1.95, 3, dt);
    this.lSum.pos.x = this.cx;
    this.lSum.pos.z = 5.6 + ((this.cx + 1.95) / 3) * 0.8 + (nar ? 2.2 : 0); // the wider second view sits further back
    const arrow = ' <span class="muted">→</span> ';
    let sum = '100 万';
    if (lent) sum += arrow + (loop && t > 7.2 ? '190 万' : '<span class="green">190 万</span>');
    if (loop && t > 7.2) sum += arrow + '<span class="green">270 万</span>' + arrow + '…';
    const note = loop && t > 7.2 ? '每转一圈，就多出一笔' : lent ? '存折上的 100 万还在，又多出借走的 90 万' : '';
    this.lSum.set(`<span class="c">市面上的钱</span><span class="v">${sum}</span>${note ? `<span class="c">${note}</span>` : ''}`);
    this.lSum.target = on(t > 0.5 || loop);
  }
}
