import * as THREE from 'three';
import { Piece, rbox, COL, hdr, lerp, damp, seg, ss, eOut, eIn, eInOut, canvasTex, blob, edges } from '../lib.js';
import { factory } from './act3.js';

/* ---------- 1.1  Deposit-rate staircase: 5.50% -> 2.75% -> 1.30% ---------- */
export class Stairs extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [0, 0, 10, 1.15] });
    const data = [
      ['2011 年', 5.5, '5.50%', '11 万'],
      ['2015 年', 2.75, '2.75%', '5.5 万'],
      ['如今', 1.3, '1.30%', '2.6 万'],
    ];
    const W = 3.1;
    const D = 3.2;
    this.steps = data.map(([yr, r, txt, per200], i) => {
      const g = new THREE.Group();
      g.position.x = (i - 1) * (W + 0.1);
      this.add(g);
      const h = r * 0.95;
      const geo = rbox(W, h, D, 0.06, 3);
      const body = new THREE.Mesh(
        geo,
        this.m(new THREE.MeshPhysicalMaterial({ color: 0x17181d, roughness: 0.3, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.3 })),
      );
      body.position.y = h / 2;
      g.add(body);
      const top = new THREE.Mesh(
        new THREE.BoxGeometry(W - 0.14, 0.03, D - 0.14),
        this.m(new THREE.MeshStandardMaterial({ color: 0x2a0c0a, emissive: COL.rmb, emissiveIntensity: lerp(0.32, 0.14, i / 2), roughness: 0.25, metalness: 0.2 })),
      );
      top.position.y = h + 0.012;
      g.add(top);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(W - 0.12, 0.035, 0.035), this.m(new THREE.MeshBasicMaterial({ color: hdr(COL.rmb, lerp(3.2, 1.6, i / 2)) })));
      edge.position.set(0, h + 0.02, D / 2 - 0.06);
      g.add(edge);
      const e = edges(this, geo, 0xffffff, 0.12);
      e.position.y = h / 2;
      g.add(e);
      // what that rate pays on the 200 万 of the title (simple interest per year)
      const lab = this.label(`<span class="c">${yr}</span><span class="v">${txt}</span><span class="c">200 万一年利息 ${per200}</span>`, [g.position.x, h + 0.2, D / 2 - 0.3]);
      return { g, h, lab };
    });
    this.add(blob(this, 14, 7, 0.85));
    this.coin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.44, 0.09, 48),
      this.m(new THREE.MeshStandardMaterial({ color: COL.gold, metalness: 1, roughness: 0.22 })),
    );
    this.add(this.coin);
    this.cap = this.label('<span class="c">国有大行 5 年期定期存款挂牌利率</span>', [0, 0, D / 2 + 0.5], 'down');
  }
  update(dt, time) {
    const t = this.t;
    this.steps.forEach((s, i) => {
      const k = eOut(seg(t, 0.15 + i * 0.25, 1.15 + i * 0.25));
      s.g.scale.y = Math.max(0.001, k);
      s.lab.pos.y = s.h * k + 0.2;
      s.lab.target = k > 0.85 ? 1 : 0;
    });
    this.cap.target = t > 1.2 ? 1 : 0;

    const xs = this.steps.map((s) => s.g.position.x);
    const tops = this.steps.map((s) => s.h + 0.065);
    const c = this.coin;
    const t0 = 2.1;
    const L = 5.4;
    if (t < t0) {
      c.visible = false;
      return;
    }
    const u = (t - t0) % L;
    const hop = (a, b, ya, yb, H, s) => [lerp(a, b, s), lerp(ya, yb, s) + 4 * H * s * (1 - s)];
    let x;
    let y;
    let rz = 0;
    let sc = 1;
    c.visible = true;
    if (u < 0.5) {
      x = xs[0];
      y = lerp(tops[0] + 3.5, tops[0], eIn(u / 0.5));
    } else if (u < 0.95) {
      const b = (u - 0.5) / 0.45;
      x = xs[0];
      y = tops[0] + Math.max(0, Math.sin(b * Math.PI * 2) * 0.12 * (1 - b));
    } else if (u < 1.55) {
      const s = (u - 0.95) / 0.6;
      [x, y] = hop(xs[0], xs[1], tops[0], tops[1], 0.9, s);
      rz = -s * Math.PI * 2;
    } else if (u < 1.95) {
      x = xs[1];
      y = tops[1];
    } else if (u < 2.55) {
      const s = (u - 1.95) / 0.6;
      [x, y] = hop(xs[1], xs[2], tops[1], tops[2], 0.8, s);
      rz = -s * Math.PI * 2;
    } else if (u < 3.0) {
      x = xs[2];
      y = tops[2];
    } else if (u < 3.75) {
      const s = (u - 3.0) / 0.75;
      [x, y] = hop(xs[2], xs[2] + 3.2, tops[2], 0.05, 0.7, s);
      rz = -s * Math.PI * 3;
    } else if (u < 4.6) {
      const s = (u - 3.75) / 0.85;
      x = xs[2] + 3.2 + eOut(s) * 1.4;
      y = 0.05;
      sc = 1 - ss(0.4, 1, s);
    } else {
      c.visible = false;
      return;
    }
    c.position.set(x, y, 0.4);
    c.rotation.set(0, 0, rz);
    c.scale.setScalar(Math.max(0.001, sc));
  }
}

/* ---------- 1.2  Where the released money went: into the bank, and why it does not come out again ----------
   steps: 'fill'  the central bank keeps pouring and the water (household deposits) piles up: 81 → 170+ 万亿
          'flow'  what should happen: two pipes lead out to a shop (消费) and a factory (投资), the water
                  turns their wheels and the lights are on
          'stuck' what happens now: both valves are screwed almost shut, the wheels stop, the lights go out
                  and the tank turns into "dead water"
   Household deposits: 81.3 万亿 at the end of 2019, about 173 万亿 in June 2026 (PBoC). */
const W_BLUE = new THREE.Color(0x1f6ff0);
const W_EM = new THREE.Color(0x0c3a9a);
const S_BLUE = new THREE.Color(0x4a95ff);
const S_EM = new THREE.Color(0x1d56c4);
const W_DULL = new THREE.Color(0x2c4250);
const W_DEM = new THREE.Color(0x0a151b);
const S_DULL = new THREE.Color(0x3b5563);
const S_DEM = new THREE.Color(0x0e1a20);
const LIT = hdr(0xffd9a0, 1.7);
const UNLIT = new THREE.Color(0x15161a);
const TRAY_ON = hdr(0x3f8cff, 1.1);
const TRAY_OFF = new THREE.Color(0x0b1220);
const RW = 1.25; // water-wheel radius
const PAD = 0.24; // top of the platform the shop and the factory stand on

function waterWheel(piece, wood, steel) {
  const g = new THREE.Group();
  const rot = new THREE.Group();
  g.add(rot);
  for (const z of [-0.23, 0.23]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(RW, 0.045, 8, 40), wood);
    rim.position.z = z;
    rot.add(rim);
    for (let k = 0; k < 4; k++) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(RW * 2, 0.06, 0.04), wood);
      sp.position.z = z;
      sp.rotation.z = (k * Math.PI) / 4;
      rot.add(sp);
    }
  }
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const pd = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.56), wood);
    pd.position.set(Math.cos(a) * (RW - 0.06), Math.sin(a) * (RW - 0.06), 0);
    pd.rotation.z = a + 0.5;
    rot.add(pd);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.96, 16), steel);
  hub.rotation.x = Math.PI / 2;
  g.add(hub);
  // A-frame stand on both sides
  const yc = RW + 0.23;
  const len = Math.hypot(0.6, yc);
  for (const z of [-0.43, 0.43])
    for (const sx of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, len, 0.07), steel);
      leg.position.set(sx * 0.3, -yc / 2, z);
      leg.rotation.z = sx * Math.atan2(0.6, yc);
      g.add(leg);
    }
  g.rot = rot;
  g.yc = yc;
  return g;
}
function shopModel(piece, wall, trim, win) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(rbox(2.0, 1.3, 1.4, 0.04), wall);
  body.position.y = 0.65;
  g.add(body);
  const roof = new THREE.Mesh(rbox(2.16, 0.12, 1.56, 0.03), wall);
  roof.position.y = 1.37;
  g.add(roof);
  const sign = new THREE.Mesh(rbox(1.2, 0.36, 0.08, 0.02), trim);
  sign.position.set(0, 1.62, 0.6);
  g.add(sign);
  const awn = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 0.62), trim);
  awn.position.set(0, 1.12, 0.96);
  awn.rotation.x = 0.5;
  g.add(awn);
  const w = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.5, 0.02), win);
  w.position.set(-0.32, 0.56, 0.71);
  g.add(w);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.82, 0.02), win);
  door.position.set(0.62, 0.42, 0.71);
  g.add(door);
  return g;
}

export class Tank extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [3.5, 0, 15, 1.0] });
    const W = 8.2;
    const H = 6.4;
    const D = 4.6;
    const B = 0.36;
    const HI = H - 1.05; // water level of today
    Object.assign(this, { W, H, D, B, HI });
    const base = new THREE.Mesh(rbox(W + 0.7, B, D + 0.7, 0.08), this.m(new THREE.MeshStandardMaterial({ color: 0x1a1b20, metalness: 0.7, roughness: 0.35 })));
    base.position.y = B / 2;
    this.add(base);

    const wgeo = new THREE.BoxGeometry(W - 0.16, 1, D - 0.16);
    wgeo.translate(0, 0.5, 0);
    this.wMat = this.m(
      new THREE.MeshStandardMaterial({ color: W_BLUE.clone(), emissive: W_EM.clone(), emissiveIntensity: 0.7, roughness: 0.25, transparent: true, opacity: 0.55, depthWrite: false }),
    );
    this.water = new THREE.Mesh(wgeo, this.wMat);
    this.water.position.y = B;
    this.water.renderOrder = 2;
    this.add(this.water);

    const sgeo = new THREE.PlaneGeometry(W - 0.16, D - 0.16, 60, 34);
    sgeo.rotateX(-Math.PI / 2);
    this.sBase = sgeo.attributes.position.array.slice();
    this.sMat = this.m(
      new THREE.MeshStandardMaterial({
        color: S_BLUE.clone(),
        emissive: S_EM.clone(),
        emissiveIntensity: 0.8,
        roughness: 0.06,
        metalness: 0.1,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.surf = new THREE.Mesh(sgeo, this.sMat);
    this.surf.renderOrder = 3;
    this.add(this.surf);

    const ggeo = new THREE.BoxGeometry(W, H, D);
    // sit the glass a hair above the base: its bottom face and bottom edges were exactly coplanar with the
    // base top (y = B) and z-fought, flickering across the whole tank floor
    ggeo.translate(0, H / 2 + B + 0.012, 0);
    const glass = new THREE.Mesh(
      ggeo,
      this.m(
        new THREE.MeshPhysicalMaterial({ color: 0xd8e8ff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.6, clearcoat: 1 }),
      ),
    );
    glass.renderOrder = 6;
    this.add(glass);
    const ed = edges(this, ggeo, 0xd6e6ff, 0.45);
    ed.renderOrder = 7;
    this.add(ed);

    // the level of 2019 and of today, marked on the front glass
    this.Y19 = B + HI * (81.3 / 173);
    const markMat = this.m(new THREE.MeshBasicMaterial({ color: hdr(0xffffff, 1.1), transparent: true, opacity: 0.85, depthWrite: false }));
    this.marks = [this.Y19, B + HI].map((y) => {
      const mk = new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, 0.03, 0.03), markMat);
      mk.position.set(0.25, y, D / 2 + 0.03);
      mk.renderOrder = 8;
      this.add(mk);
      return mk;
    });

    const mouth = new THREE.Vector3(-1.3, B + H + 1.25, 0.2);
    this.mouth = mouth;
    const steel = this.m(new THREE.MeshStandardMaterial({ color: 0x9aa0aa, metalness: 1, roughness: 0.28 }));
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.3, B + H + 2.5, -8),
      new THREE.Vector3(-1.3, B + H + 2.5, -1.3),
      new THREE.Vector3(-1.3, B + H + 2.25, -0.3),
      new THREE.Vector3(-1.3, B + H + 1.6, 0.15),
      new THREE.Vector3(-1.3, B + H + 1.3, 0.2),
    ]);
    this.add(new THREE.Mesh(new THREE.TubeGeometry(path, 80, 0.3, 20, false), steel));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.07, 10, 32), steel);
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(mouth).setY(mouth.y + 0.05);
    this.add(ring);

    const cg = new THREE.CylinderGeometry(0.17, 0.25, 1, 20, 1, true);
    cg.translate(0, -0.5, 0);
    const colMat = () => this.m(new THREE.MeshBasicMaterial({ color: hdr(0x5aa2ff, 1.2), transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.col = new THREE.Mesh(cg, colMat());
    this.col.position.copy(mouth);
    this.col.renderOrder = 4;
    this.add(this.col);

    this.NP = 240;
    this.drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), this.m(new THREE.MeshBasicMaterial({ color: hdr(0x7ab8ff, 1.8) })), this.NP);
    this.drops.frustumCulled = false;
    this.drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.add(this.drops);
    this.P = new Float32Array(this.NP * 7);
    this.alive = new Uint8Array(this.NP);
    this.cursor = 0;
    this.acc = 0;
    this.M = new THREE.Matrix4();
    this.zero = new THREE.Matrix4().makeScale(0, 0, 0);
    this.add(blob(this, 15, 8, 0.8));

    /* ---- downstream: where the water is supposed to go. One group that grows out of the tank's right wall;
       everything in it is placed relative to the outlet point on that wall. ---- */
    const dn = new THREE.Group();
    dn.position.set(W / 2, 0, 0.8);
    this.add(dn);
    this.dn = dn;
    const padM = new THREE.Mesh(rbox(12.6, PAD, 4.4, 0.08), this.m(new THREE.MeshStandardMaterial({ color: 0x1a1b20, metalness: 0.6, roughness: 0.4 })));
    padM.position.set(7.4, PAD / 2, -0.35);
    dn.add(padM);
    const wood = this.m(new THREE.MeshStandardMaterial({ color: 0xb58d63, roughness: 0.7, metalness: 0.05 }));
    const stone = this.m(new THREE.MeshStandardMaterial({ color: 0xb2ada3, roughness: 0.6, metalness: 0.05 }));
    const thin = this.m(new THREE.MeshStandardMaterial({ color: 0x8b919b, metalness: 1, roughness: 0.32 }));
    const red = this.m(new THREE.MeshStandardMaterial({ color: 0xd9483b, roughness: 0.45, metalness: 0.2 }));
    const YC = PAD + RW + 0.23; // wheel axle height
    const TOP = YC + RW; // where the falling water meets the wheel
    // [name, outlet height on the tank wall, wheel x, building x]
    const lay = [
      { y: B + 3.8, wx: 2.6, bx: 5.45, s: 1.3 },
      { y: B + 4.9, wx: 8.65, bx: 11.85, s: 1.1 },
    ];
    this.outs = lay.map((o, j) => {
      const mx = o.wx + 0.15; // the spout ends just past the top of the wheel, so the wheel turns clockwise
      const my = TOP + 0.34;
      const pts = [new THREE.Vector3(-0.1, o.y, 0), new THREE.Vector3(mx - 0.65, o.y, 0), new THREE.Vector3(mx - 0.1, o.y - 0.35, 0), new THREE.Vector3(mx, o.y - 0.8, 0)];
      if (o.y - 0.8 > my + 0.3) pts.push(new THREE.Vector3(mx, (o.y - 0.8 + my) / 2, 0));
      pts.push(new THREE.Vector3(mx, my, 0));
      dn.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.15, 14), thin));
      // valve: a body on the pipe and a red hand-wheel above it
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.36, 18), thin);
      body.rotation.z = Math.PI / 2;
      body.position.set(0.8, o.y, 0);
      dn.add(body);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 8), thin);
      stem.position.set(0.8, o.y + 0.36, 0);
      dn.add(stem);
      const hand = new THREE.Group();
      hand.position.set(0.8, o.y + 0.58, 0);
      const tor = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.045, 8, 28), red);
      tor.rotation.x = Math.PI / 2;
      hand.add(tor);
      for (let k = 0; k < 2; k++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.04, 0.05), red);
        bar.rotation.y = (k * Math.PI) / 2;
        hand.add(bar);
      }
      dn.add(hand);
      const wheel = waterWheel(this, wood, steel);
      wheel.position.set(o.wx, YC, 0);
      dn.add(wheel);
      const tray = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.035, 40), this.m(new THREE.MeshBasicMaterial({ color: TRAY_OFF.clone() })));
      tray.position.set(o.wx + 0.3, PAD + 0.03, 0);
      dn.add(tray);
      const col = new THREE.Mesh(cg, colMat());
      col.position.set(mx, my, 0);
      col.renderOrder = 4;
      dn.add(col);
      const win = this.m(new THREE.MeshBasicMaterial({ color: UNLIT.clone() }));
      const b = j === 0 ? shopModel(this, stone, red, win) : factory(this, stone, win);
      b.scale.setScalar(o.s);
      b.position.set(o.bx, PAD, -0.45);
      dn.add(b);
      return { ...o, mx, my, hand, wheel, tray, col, win, ang: 0 };
    });
    this.TOP = TOP;
    this.YC = YC;
    this.NF = 16; // drops per outlet: 10 falling onto the wheel, 6 leaving it
    this.flow = new THREE.InstancedMesh(new THREE.SphereGeometry(0.065, 8, 6), this.m(new THREE.MeshBasicMaterial({ color: hdr(0x7ab8ff, 1.6) })), this.NF * 2);
    this.flow.frustumCulled = false;
    this.flow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    dn.add(this.flow);
    // chimney smoke: the factory is working
    this.NS = 5;
    this.smoke = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.2, 10, 8),
      this.m(new THREE.MeshBasicMaterial({ color: 0x8e96a3, transparent: true, opacity: 0.4, depthWrite: false })),
      this.NS,
    );
    this.smoke.frustumCulled = false;
    this.smoke.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    dn.add(this.smoke);
    this.chim = new THREE.Vector3(lay[1].bx - 1.0 * lay[1].s, PAD + 2.85 * lay[1].s, -0.45 - 0.55 * lay[1].s);
    const sh = blob(this, 16, 7, 0.7);
    sh.position.set(7.4, 0.015, -0.3);
    dn.add(sh);

    this.lTap = this.label('<span class="t">央行放水</span><span class="c">钱一直在往里放</span>', [-1.85, B + H + 1.75, 0.2], 'left');
    this.lDep = this.label('', [0.4, B + 2.3, D / 2 + 0.05], 'mid');
    this.lM19 = this.label('<span class="t">2019 年底：81 万亿</span>', [W / 2 + 0.55, this.Y19, D / 2], 'right');
    this.lM26 = this.label('<span class="t">2026 年 6 月：超 170 万亿</span>', [W / 2 + 0.55, B + HI, D / 2], 'right');
    this.lShop = this.label('', [lay[0].bx, PAD + 2.55, -0.45], 'up', dn);
    this.lFac = this.label('', [lay[1].bx + 0.9, PAD + 2.85 * lay[1].s + 0.1, -0.45], 'up', dn);
    this.lMsg = this.label('', [8.3, B + H + 0.15, 0], 'up', dn);
    this.level = 0.45;
    this.kDown = 0;
    this.f = 0;
    this.om = 0;
    this.sg = 0;
  }
  enter(st, prev, fresh) {
    this.alive.fill(0);
    const step = st.step || 'fill';
    if (fresh) {
      // arriving from another scene: start from the state the step before would have left behind
      this.level = step === 'fill' ? 0.45 : this.HI;
      this.kDown = step === 'fill' ? 0 : 1;
      this.f = step === 'stuck' ? 1 : 0;
      this.om = this.f;
      this.sg = 0;
    }
  }
  update(dt, time) {
    const t = this.t;
    const { B, H, HI } = this;
    const step = this.st.step || 'fill';
    const fill = step === 'fill';
    const stuck = step === 'stuck';

    this.level = damp(this.level, fill ? lerp(0.45, HI, eInOut(seg(t, 0.6, 4.8))) : HI, 6, dt);
    const level = this.level;
    const top = B + level;
    this.water.scale.y = level;
    this.sg = damp(this.sg, stuck && t > 2.0 ? 1 : 0, 1.3, dt);
    const sg = this.sg;
    this.wMat.color.copy(W_BLUE).lerp(W_DULL, sg);
    this.wMat.emissive.copy(W_EM).lerp(W_DEM, sg);
    this.sMat.color.copy(S_BLUE).lerp(S_DULL, sg);
    this.sMat.emissive.copy(S_EM).lerp(S_DEM, sg);

    const pos = this.surf.geometry.attributes.position;
    const a = pos.array;
    const b0 = this.sBase;
    const A = lerp(0.1, 0.01, sg);
    const R = lerp(0.13, 0.02, sg);
    const ix = this.mouth.x;
    const iz = this.mouth.z;
    for (let k = 0; k < a.length; k += 3) {
      const x = b0[k];
      const z = b0[k + 2];
      const d = Math.hypot(x - ix, z - iz);
      a[k + 1] =
        A * (Math.sin(x * 1.25 + time * 2.0) * 0.55 + Math.sin(z * 2.0 - time * 1.6 + x * 0.3) * 0.45) + R * Math.sin(d * 5.5 - time * 7.5) * Math.exp(-d * 0.7);
    }
    pos.needsUpdate = true;
    this.surf.geometry.computeVertexNormals();
    this.surf.position.y = top;

    const pouring = t > 0.35 || !fill;
    this.col.scale.set(1, pouring ? Math.max(0.01, (this.mouth.y - top) * (fill ? ss(0.35, 0.8, t) : 1)) : 0.001, 1);

    // falling drops
    const P = this.P;
    if (pouring) this.acc += dt * 100;
    while (this.acc >= 1) {
      this.acc -= 1;
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.NP;
      const o = i * 7;
      const ang = Math.random() * Math.PI * 2;
      const rr = Math.random() * 0.16;
      P[o] = this.mouth.x + Math.cos(ang) * rr;
      P[o + 1] = this.mouth.y - 0.1;
      P[o + 2] = this.mouth.z + Math.sin(ang) * rr;
      P[o + 3] = (Math.random() - 0.5) * 0.5;
      P[o + 4] = -2.0 - Math.random() * 0.8;
      P[o + 5] = (Math.random() - 0.5) * 0.5;
      P[o + 6] = 0;
      this.alive[i] = 1;
    }
    for (let i = 0; i < this.NP; i++) {
      if (!this.alive[i]) {
        this.drops.setMatrixAt(i, this.zero);
        continue;
      }
      const o = i * 7;
      P[o + 4] -= 14 * dt;
      P[o] += P[o + 3] * dt;
      P[o + 1] += P[o + 4] * dt;
      P[o + 2] += P[o + 5] * dt;
      if (P[o + 1] < top) {
        if (P[o + 6] === 0 && Math.random() < 0.35 * (1 - sg * 0.8)) {
          P[o + 1] = top;
          P[o + 4] = 1.1 + Math.random() * 1.6;
          P[o + 3] *= 3;
          P[o + 5] *= 3;
          P[o + 6] = 1;
        } else {
          this.alive[i] = 0;
          this.drops.setMatrixAt(i, this.zero);
          continue;
        }
      }
      this.M.makeTranslation(P[o], P[o + 1], P[o + 2]);
      this.drops.setMatrixAt(i, this.M);
    }
    this.drops.instanceMatrix.needsUpdate = true;

    /* ---- downstream ---- */
    this.kDown = damp(this.kDown, fill ? 0 : 1, 3.2, dt);
    const kd = this.kDown;
    this.dn.visible = kd > 0.01;
    this.dn.scale.setScalar(Math.max(0.001, kd));
    // valves: open in 'flow' (once the pipes are there), screwed shut in 'stuck'
    const fT = fill ? 0 : stuck ? (t > 1.0 ? 0 : 1) : t > 0.9 ? 1 : 0;
    this.f = damp(this.f, fT, stuck ? 1.6 : 2.4, dt);
    const f = this.f;
    this.om = damp(this.om, f, 1.1, dt); // the wheels have inertia
    const run = ss(0.12, 0.75, this.om);
    const TOP = this.TOP;
    this.outs.forEach((o, j) => {
      o.hand.rotation.y = f * 5.5 + j;
      o.ang -= this.om * 1.9 * dt;
      o.wheel.rot.rotation.z = o.ang + j * 0.3;
      o.win.color.copy(UNLIT).lerp(LIT, run);
      o.tray.material.color.copy(TRAY_OFF).lerp(TRAY_ON, ss(0.15, 0.8, f));
      o.col.scale.set(0.55 * Math.max(0.02, f), Math.max(0.01, (o.my - TOP) * ss(0.02, 0.3, f)), 0.55 * Math.max(0.02, f));
      o.col.visible = f > 0.03;
      for (let i = 0; i < this.NF; i++) {
        const idx = j * this.NF + i;
        let show = false;
        if (i < 10) {
          // from the spout onto the wheel; when the valve is shut, a single drop now and then
          if (f > 0.12) {
            const u = (time * 1.5 + i / 10 + j * 0.37) % 1;
            show = i / 10 < f + 0.05;
            this.M.makeTranslation(o.mx + Math.sin(i * 12.9) * 0.05, o.my - u * u * (o.my - TOP), Math.cos(i * 7.3) * 0.05);
          } else if (i === 0 && stuck) {
            const per = 3.1 + j * 0.9;
            const u = ((t + j * 1.3) % per) / 0.55;
            show = u < 1;
            this.M.makeTranslation(o.mx, o.my - u * u * (o.my - TOP), 0);
          }
        } else if (f > 0.12) {
          // spilling off the wheel into the tray
          const u = (time * 1.2 + (i - 10) / 6 + j * 0.21) % 1;
          show = (i - 10) / 6 < f;
          this.M.makeTranslation(o.wx + RW * 0.8 + u * 0.3, this.YC - 0.1 - u * u * (this.YC - 0.1 - PAD), Math.sin(i * 5.1) * 0.2);
        }
        this.flow.setMatrixAt(idx, show ? this.M : this.zero);
      }
    });
    this.flow.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < this.NS; i++) {
      const u = (time * 0.28 + i / this.NS) % 1;
      const s = Math.sin(Math.PI * u) * (0.6 + u) * run;
      if (s < 0.02) {
        this.smoke.setMatrixAt(i, this.zero);
        continue;
      }
      this.M.makeScale(s, s, s).setPosition(this.chim.x + u * 0.7 + Math.sin(i * 3.3 + time) * 0.06, this.chim.y + u * 1.5, this.chim.z);
      this.smoke.setMatrixAt(i, this.M);
    }
    this.smoke.instanceMatrix.needsUpdate = true;

    /* ---- labels ---- */
    const on = (c) => (c ? 1 : 0);
    this.lTap.target = on(t > 0.5 || !fill);
    this.lDep.set(
      fill
        ? '<span class="c">居民在银行的存款</span><span class="v">六年半，翻了一倍多</span>'
        : stuck
          ? `<span class="c">居民存款</span><span class="v">超 170 万亿</span>${t > 3.0 ? '<span class="t muted">成了一池“死水”</span>' : ''}`
          : '<span class="t">银行里的存款</span>',
    );
    this.lDep.pos.y = fill ? (this.Y19 + B + HI) / 2 : B + 2.3; // between the two level marks
    // phones: there is no room beside the tank, so the two level captions move inside it (and the big one goes)
    const nar = this.app.ui.narrow();
    const { W, D } = this;
    this.lM19.el.className = this.lM26.el.className = nar ? 'lbl left' : 'lbl right';
    this.lM19.pos.set(nar ? W / 2 - 0.3 : W / 2 + 0.55, this.Y19 + (nar ? 0.5 : 0), D / 2);
    this.lM26.pos.set(nar ? W / 2 - 0.3 : W / 2 + 0.55, B + HI - (nar ? 0.55 : 0), D / 2);
    this.lDep.target = on(fill ? t > 4.6 && !nar : true);
    this.marks[0].visible = fill && level > this.Y19 - B - 0.02;
    this.marks[1].visible = fill && level > HI - 0.06;
    this.lM19.target = on(this.marks[0].visible);
    this.lM26.target = on(this.marks[1].visible);
    const live = !fill && kd > 0.9;
    this.lShop.set(stuck ? '<span class="t red">消费：不敢花</span><span class="c">房价跌了，收入没底</span>' : '<span class="t">消费</span><span class="c">有人花钱，店里有生意</span>');
    this.lFac.set(stuck ? '<span class="t red">投资：不敢投</span><span class="c">货卖不动，不敢扩张</span>' : '<span class="t">投资</span><span class="c">有人扩张，工厂有活干</span>');
    this.lMsg.set(stuck ? '<span class="v sm red">钱流不出去</span><span class="c">市面上钱没变多，东西也就没涨价</span>' : '<span class="v sm blue">钱流到市面上</span><span class="c">生意就转起来</span>');
    // a step's captions come up once its animation has made the point
    this.lShop.target = this.lFac.target = on(live && t > 2.2);
    this.lMsg.target = on(live && (stuck ? t > 3.2 : t > 3.0));
  }
}

/* corrugated shipping-container texture (used by the FX scene's export cartons) */
export function containerTex() {
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#3b7cae';
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 18) {
      const gr = g.createLinearGradient(x, 0, x + 18, 0);
      gr.addColorStop(0, 'rgba(0,0,0,0.28)');
      gr.addColorStop(0.45, 'rgba(255,255,255,0.10)');
      gr.addColorStop(1, 'rgba(0,0,0,0.28)');
      g.fillStyle = gr;
      g.fillRect(x, 14, 18, h - 28);
    }
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(0, 0, w, 14);
    g.fillRect(0, h - 14, w, 14);
  });
}
