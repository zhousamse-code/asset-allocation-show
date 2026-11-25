import * as THREE from 'three';
import { Piece, rbox, COL, hdr, lerp, seg, ss, eOut, eIn, eInOut, canvasTex, blob, edges } from '../lib.js';

/* ---------- 1.1  Deposit-rate staircase: 5.50% -> 2.75% -> 1.30% ---------- */
export class Stairs extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [0, 0, 10, 1.15] });
    const data = [
      ['2011 年', 5.5, '5.50%'],
      ['2015 年', 2.75, '2.75%'],
      ['如今', 1.3, '1.30%'],
    ];
    const W = 3.1;
    const D = 3.2;
    this.steps = data.map(([yr, r, txt], i) => {
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
      const lab = this.label(`<span class="c">${yr}</span><span class="v">${txt}</span>`, [g.position.x, h + 0.2, D / 2 - 0.3]);
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

/* ---------- 1.2  Central bank keeps pouring, money sits still: "a pool of dead water" ---------- */
const W_BLUE = new THREE.Color(0x1f6ff0);
const W_EM = new THREE.Color(0x0c3a9a);
const S_BLUE = new THREE.Color(0x4a95ff);
const S_EM = new THREE.Color(0x1d56c4);
const W_DULL = new THREE.Color(0x2c4250);
const W_DEM = new THREE.Color(0x0a151b);
const S_DULL = new THREE.Color(0x3b5563);
const S_DEM = new THREE.Color(0x0e1a20);

export class Tank extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [0, 0, 11, 1.0] });
    const W = 8.2;
    const H = 6.4;
    const D = 4.6;
    const B = 0.36;
    Object.assign(this, { W, H, D, B });
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
    this.col = new THREE.Mesh(
      cg,
      this.m(new THREE.MeshBasicMaterial({ color: hdr(0x5aa2ff, 1.2), transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false })),
    );
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

    const thin = this.m(new THREE.MeshStandardMaterial({ color: 0x7d838d, metalness: 1, roughness: 0.35 }));
    this.outs = [B + 2.6, B + 1.0].map((yy) => {
      const p = new THREE.CatmullRomCurve3([
        new THREE.Vector3(W / 2 - 0.1, yy, 0.8),
        new THREE.Vector3(W / 2 + 1.3, yy, 0.8),
        new THREE.Vector3(W / 2 + 1.85, yy - 0.35, 0.8),
        new THREE.Vector3(W / 2 + 1.95, yy - 0.8, 0.8),
      ]);
      this.add(new THREE.Mesh(new THREE.TubeGeometry(p, 40, 0.15, 14), thin));
      return new THREE.Vector3(W / 2 + 1.95, yy - 0.85, 0.8);
    });
    this.drip = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 8, 6), this.m(new THREE.MeshBasicMaterial({ color: hdr(0x7ab8ff, 1.5) })), 2);
    this.drip.frustumCulled = false;
    this.add(this.drip);
    this.add(blob(this, 15, 8, 0.8));

    this.lTap = this.label('<span class="t">央行放水</span><span class="c">钱一直在往里放</span>', [-1.3, B + H + 2.9, -4.2], 'left');
    this.lOut1 = this.label('<span class="t">消费</span><span class="c">不敢花</span>', [W / 2 + 2.25, B + 2.2, 0.8], 'right');
    this.lOut2 = this.label('<span class="t">投资</span><span class="c">不敢投</span>', [W / 2 + 2.25, B + 0.55, 0.8], 'right');
    this.lDep = this.label('<span class="c">居民存款 · 2026 年 6 月</span><span class="v">超 170 万亿</span>', [0.4, B + 2.3, D / 2 + 0.05], 'mid');
    this.lDead = this.label('<span class="t muted">一池“死水”</span>', [0.4, B + H + 0.2, D / 2]);
  }
  enter() {
    this.alive.fill(0);
  }
  update(dt, time) {
    const t = this.t;
    const { B, H } = this;
    const level = lerp(0.45, H - 1.05, eInOut(seg(t, 0.6, 4.8)));
    const top = B + level;
    this.water.scale.y = level;
    const sg = ss(5.2, 7.6, t);
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

    const pouring = t > 0.35;
    this.col.scale.set(1, pouring ? Math.max(0.01, (this.mouth.y - top) * ss(0.35, 0.8, t)) : 0.001, 1);

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

    // outflow pipes barely drip
    for (let j = 0; j < 2; j++) {
      const per = lerp(1.6, 3.4, sg) + j * 0.4;
      const u = ((t + j * 0.7) % per) / per;
      const o = this.outs[j];
      const fall = u * u * (o.y + 0.2) * 1.0;
      this.M.makeTranslation(o.x, o.y - fall, o.z);
      this.drip.setMatrixAt(j, t > 1.2 && u < 0.6 ? this.M : this.zero);
    }
    this.drip.instanceMatrix.needsUpdate = true;

    this.lTap.target = t > 0.5 ? 1 : 0;
    this.lOut1.target = this.lOut2.target = t > 1.4 ? 1 : 0;
    this.lDep.target = t > 3.6 ? 1 : 0;
    this.lDead.target = t > 6.0 ? 1 : 0;
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
