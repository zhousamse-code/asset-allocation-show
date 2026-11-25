import * as THREE from 'three';
import { Piece, rbox, COL, hdr, lerp, seg, eOut, eInOut, blob } from '../lib.js';
import { glowTower } from './kit.js';

/* ================= 3.3b  A century of leaders: each wave's giant, and what became of it =================
   A year counter runs 1900 -> 2026. Each leader rises in its era; when its fate year passes it either sinks off
   the stage (dropped from the S&P 500) or turns grey and shrinks (dropped from the Dow, still in the S&P 500).
   Dates: GM out of the S&P 500 2 Jun 2009 (bankruptcy); Kodak out Dec 2010; Sears Holdings out Sep 2012;
   U.S. Steel out Jul 2014, bought by Nippon Steel Jun 2025; GE out of the Dow Jun 2018; Intel replaced by
   Nvidia in the Dow Nov 2024. Heights are uniform on purpose: each was the giant of its own time. */
const ERAS = [
  { name: '美国钢铁', era: '钢铁 · 1901', up: 1901, fate: 2014, how: '2014 调出标普', out: 'sp' },
  { name: '通用汽车', era: '汽车 · 1955', up: 1955, fate: 2009, how: '2009 破产出局', out: 'sp' },
  { name: '西尔斯', era: '百货 · 1970', up: 1970, fate: 2012, how: '2012 调出标普', out: 'sp' },
  { name: '柯达', era: '胶卷 · 1976', up: 1976, fate: 2010, how: '2010 调出标普', out: 'sp' },
  { name: '英特尔', era: '电脑芯片 · 1993', up: 1993, fate: 2024, how: '2024 道琼斯里被换掉', out: 'dow' },
  { name: '通用电气', era: '电器 · 2000', up: 2000, fate: 2018, how: '2018 踢出道琼斯', out: 'dow' },
  { name: '苹果', era: '手机 · 现在最大', up: 2007 },
  { name: '英伟达', era: 'AI 芯片 · 现在第二', up: 2023 },
];
const H = 4.0;
const X = (i) => -10.5 + i * 3;
// year counter: 1900 -> 2006 quickly (the rises), short pause, then 2006 -> 2026 slower (the fates)
const yearAt = (t) => (t < 4.6 ? lerp(1900, 2006, eInOut(seg(t, 0.6, 4.6))) : t < 5.0 ? 2006 : lerp(2006, 2026, seg(t, 5.0, 9.6)));
const C_LIVE = new THREE.Color(COL.spx);
const C_NEW = new THREE.Color(COL.ok);
const C_OUT = new THREE.Color(COL.risk);
const C_GREY = new THREE.Color(0x6d7480);

export class Eras extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [0, 0, 15, 1.05] });
    const stage = new THREE.Mesh(rbox(25.4, 0.6, 3.4, 0.08), this.m(new THREE.MeshStandardMaterial({ color: 0x17181e, metalness: 0.7, roughness: 0.32 })));
    stage.position.y = 0.3;
    this.add(stage);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(25.2, 0.04, 0.04), this.m(new THREE.MeshBasicMaterial({ color: hdr(COL.spx, 2.0) })));
    edge.position.set(0, 0.62, 1.68);
    this.add(edge);
    this.cos = ERAS.map((e, i) => {
      const tw = glowTower(this, e.out ? COL.spx : COL.ok, { w: 1.5, d: 1.5, em: 0.4 });
      tw.g.position.set(X(i), 0.6, 0);
      tw.setH(0.001);
      tw.g.visible = false;
      this.add(tw.g);
      const l = this.label('', [X(i), 0.6, 0]);
      return { ...e, tw, l, c: (e.out ? C_LIVE : C_NEW).clone(), k: 0, gone: 0 };
    });
    this.lYear = this.label('', [0, 0, 2.2], 'down');
    this.add(blob(this, 30, 8, 0.75));
  }
  update(dt) {
    const t = this.t;
    const y = yearAt(t);
    this.lYear.set(`<span class="v">${Math.floor(y)} 年</span>`);
    this.lYear.target = t > 0.4 ? 1 : 0;
    const a = 1 - Math.exp(-7 * dt);
    for (const c of this.cos) {
      const risen = y >= c.up;
      const fell = c.out && y >= c.fate;
      c.k += ((risen ? 1 : 0) - c.k) * a; // rise
      c.gone += ((fell ? 1 : 0) - c.gone) * a; // fate
      const kH = eOut(Math.min(1, c.k * 1.02));
      // S&P drop-outs sink into the stage; Dow drop-outs shrink and go grey
      const h = H * kH * (c.out === 'sp' ? 1 - 0.985 * c.gone : 1 - 0.55 * c.gone);
      c.tw.g.visible = kH > 0.01;
      c.tw.setH(Math.max(0.001, h));
      const target = fell ? (c.out === 'sp' ? C_OUT : C_GREY) : c.out ? C_LIVE : C_NEW;
      c.c.lerp(target, a);
      c.tw.bm.emissive.copy(c.c);
      c.tw.cm.color.copy(c.c).multiplyScalar(2.0);
      c.l.pos.y = 0.6 + h + 0.2;
      c.l.set(
        fell
          ? `<span class="t ${c.out === 'sp' ? 'red' : 'muted'}">${c.name}</span><span class="c">${c.how}</span>`
          : `<span class="t${c.out ? '' : ' green'}">${c.name}</span><span class="c">${c.era}</span>`,
      );
      c.l.target = kH > 0.5 ? 1 : 0;
    }
  }
}
