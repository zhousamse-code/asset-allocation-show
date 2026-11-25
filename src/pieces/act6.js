import * as THREE from 'three';
import { Piece, COL, hdr, seg, eOut, blob } from '../lib.js';

/* ================= 6.1  The longer you hold, the higher the odds (S&P 500, 1926 onward, incl. dividends) ================= */
export class Glasses extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [0, 0, 10, 1.1] });
    const data = [
      ['持有 1 年', 0.74, '约 7 成', 0xff9f0a],
      ['持有 5 年', 0.88, '近 9 成', COL.spx],
      ['持有 10 年', 0.95, '约 95%', COL.spx],
      ['持有 15 年', 0.995, '接近 100%', COL.spx],
    ];
    const R = 1.1;
    const H = 5.6;
    const B = 0.25;
    this.H = H;
    this.B = B;
    const glassMat = this.m(
      new THREE.MeshPhysicalMaterial({ color: 0xdde9ff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.8, clearcoat: 1 }),
    );
    const baseMat = this.m(new THREE.MeshPhysicalMaterial({ color: 0xdde9ff, roughness: 0.1, transparent: true, opacity: 0.32, envMapIntensity: 1.5, clearcoat: 1 }));
    const rimMat = this.m(new THREE.MeshBasicMaterial({ color: hdr(0xffffff, 1.0), transparent: true, opacity: 0.8 }));
    const wall = new THREE.CylinderGeometry(R, R, H, 64, 1, true);
    wall.translate(0, H / 2 + B, 0);
    const liq = new THREE.CylinderGeometry(R * 0.93, R * 0.93, 1, 64);
    liq.translate(0, 0.5, 0);
    this.items = data.map(([nm, v, txt, col], i) => {
      const g = new THREE.Group();
      g.position.x = (i - 1.5) * 3.3;
      this.add(g);
      const w = new THREE.Mesh(wall, glassMat);
      w.renderOrder = 6;
      g.add(w);
      const bs = new THREE.Mesh(new THREE.CylinderGeometry(R, R, B, 64), baseMat);
      bs.position.y = B / 2;
      g.add(bs);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.025, 8, 72), rimMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = H + B;
      g.add(rim);
      const lm = this.m(new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.55, roughness: 0.2, transparent: true, opacity: 0.82, depthWrite: false }));
      const l = new THREE.Mesh(liq, lm);
      l.position.y = B;
      l.renderOrder = 3;
      g.add(l);
      const s = new THREE.Mesh(new THREE.CircleGeometry(R * 0.93, 64), this.m(new THREE.MeshBasicMaterial({ color: hdr(col, 1.7), transparent: true, opacity: 0.9, depthWrite: false })));
      s.rotation.x = -Math.PI / 2;
      s.renderOrder = 4;
      g.add(s);
      const lb = this.label(`<span class="t">${nm}</span>`, [g.position.x, 0, R + 0.3], 'down');
      const lv = this.label(`<span class="v ${i === 0 ? 'amber' : 'blue'}">${txt}</span>`, [g.position.x, 0, 0]);
      return { g, v, l, s, lb, lv };
    });
    this.add(blob(this, 16, 5, 0.7));
    this.lWarn = this.label('<span class="pill amber">急用的钱，别买</span>', [this.items[0].g.position.x, H + B + 1.25, 0]);
  }
  update(dt, time) {
    const t = this.t;
    this.items.forEach((it, i) => {
      const k = eOut(seg(t, 0.4 + i * 0.35, 2.2 + i * 0.35));
      const lev = it.v * k * this.H;
      it.l.scale.y = Math.max(0.001, lev);
      const wob = Math.sin(time * 5 + i) * 0.03 * (1 - k);
      it.s.position.y = this.B + lev + 0.002 + wob;
      it.s.visible = lev > 0.01;
      it.lv.pos.y = this.B + Math.max(lev, 0.5) + 0.35;
      it.lv.target = k > 0.6 ? 1 : 0;
      it.lb.target = t > 0.3 ? 1 : 0;
    });
    this.lWarn.target = t > 2.4 ? 1 : 0;
  }
}
