import * as THREE from 'three';
import { Piece, rbox, COL, hdr, lerp, clamp01, seg, ss, eOut, eInOut, blob, edges, dashLine, progTube, monotone, textPlane, rng } from '../lib.js';

/* S&P 500 price index, key closes 2000 – 24 Nov 2026 (peaks/troughs are actual closes; curve between them is smoothed) */
export const SPX = [
  [2000.0, 1469], [2000.23, 1527], [2000.99, 1320], [2001.72, 966], [2001.99, 1148], [2002.77, 777], [2002.99, 880],
  [2003.99, 1112], [2004.99, 1212], [2005.99, 1248], [2006.99, 1418], [2007.77, 1565], [2007.99, 1468],
  [2008.7, 1166], [2008.89, 752], [2008.99, 903], [2009.19, 677], [2009.99, 1115], [2010.3, 1217], [2010.51, 1022],
  [2010.99, 1258], [2011.32, 1363], [2011.76, 1099], [2011.99, 1258], [2012.99, 1426], [2013.24, 1569], [2013.99, 1848],
  [2014.99, 2059], [2015.38, 2131], [2015.65, 1868], [2015.99, 2044], [2016.11, 1829], [2016.99, 2239], [2017.99, 2674],
  [2018.07, 2873], [2018.72, 2931], [2018.98, 2351], [2019.99, 3231], [2020.13, 3386], [2020.22, 2237], [2020.63, 3390],
  [2020.99, 3756], [2021.99, 4766], [2022.0, 4797], [2022.46, 3667], [2022.62, 4305], [2022.78, 3577], [2022.99, 3840],
  [2023.5, 4450], [2023.82, 4117], [2023.99, 4770], [2024.5, 5460], [2024.99, 5882], [2025.13, 6144], [2025.27, 4983],
  [2025.5, 6205], [2025.99, 6845], [2026.07, 6979], [2026.24, 6344], [2026.62, 7799], [2026.76, 7819], [2026.885, 6910], [2026.9, 7201],
];
const T0 = 2000.0;
const T1 = 2026.9;
export const CX = (yr) => (yr - 2013.39) * 2.25;
export const CY = (v) => (Math.log10(v) - 2.78) * 10.5 + 0.5;
const logAt = monotone(
  SPX.map((p) => p[0]),
  SPX.map((p) => Math.log10(p[1])),
);

export class Coaster extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [0, 0, 30, 0.9] });
    const N = 540;
    const pts = [];
    const pos = [];
    const at = [];
    const dd = [];
    const xs = [];
    let peak = 0;
    for (let i = 0; i <= N; i++) {
      const yr = T0 + ((T1 - T0) * i) / N;
      const v = 10 ** logAt(yr);
      peak = Math.max(peak, v);
      const x = CX(yr);
      const y = CY(v);
      pts.push(new THREE.Vector3(x, y, 0));
      pos.push(x, 0.04, 0, x, y, 0);
      at.push(0, 1);
      const d = 1 - v / peak;
      dd.push(d, d);
      xs.push(x);
    }
    this.line = progTube(pts, 0.07, this.m(new THREE.MeshBasicMaterial({ color: hdr(0xe8f0ff, 1.75) })), 8);
    this.add(this.line);
    const idx = [];
    for (let i = 0; i < N; i++) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(at, 1));
    g.setAttribute('aD', new THREE.Float32BufferAttribute(dd, 1));
    g.setIndex(idx);
    this.curtainMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: { uFade: this.fade, uP: { value: 0 }, uX0: { value: CX(T0) }, uX1: { value: CX(T1) }, uRed: { value: 1 } },
      vertexShader:
        'attribute float aT; attribute float aD; varying float vT; varying float vD; varying float vX; void main(){ vT = aT; vD = aD; vX = position.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: /* glsl */ `
        uniform float uFade; uniform float uP; uniform float uX0; uniform float uX1; uniform float uRed;
        varying float vT; varying float vD; varying float vX;
        void main(){
          float on = step(vX, mix(uX0, uX1, uP) + 0.001);
          float r = smoothstep(0.1, 0.24, vD) * uRed;
          vec3 c = mix(vec3(0.16, 0.45, 1.0), vec3(1.0, 0.22, 0.18), r);
          float a = (0.03 + 0.34 * pow(clamp(vT, 0.0, 1.0), 2.2)) * on * uFade * (0.7 + 0.5 * r);
          gl_FragColor = vec4(c, a);
        }`,
    });
    this.add(new THREE.Mesh(g, this.curtainMat));
    this.base = new THREE.Mesh(new THREE.BoxGeometry(CX(T1) - CX(T0) + 1.4, 0.05, 0.6), this.m(new THREE.MeshStandardMaterial({ color: 0x1a1b20, metalness: 0.6, roughness: 0.4 })));
    this.base.position.y = 0.025;
    this.add(this.base);

    const mk = (yr, color) => {
      const v = 10 ** logAt(yr);
      const p = new THREE.Vector3(CX(yr), CY(v), 0);
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 12), this.m(new THREE.MeshBasicMaterial({ color: hdr(color, 2.4) })));
      s.position.copy(p);
      this.add(s);
      return { p, s, yr };
    };
    this.troughs = [
      { ...mk(2002.77, COL.risk), html: '<span class="v red">−49%</span><span class="c">2000 年互联网泡沫</span>', tag: '2000' },
      { ...mk(2009.19, COL.risk), html: '<span class="v red">−57%</span><span class="c">2008 年金融危机 · 差不多腰斩</span>', tag: '2008' },
      { ...mk(2020.22, COL.risk), html: '<span class="v red">−34%</span><span class="c">2020 年疫情 · 两周 4 次熔断</span>', tag: '2020' },
      { ...mk(2022.78, COL.risk), html: '<span class="v red">−25%</span><span class="c">2022 年加息</span>', tag: '2022' },
      { ...mk(2025.27, COL.risk), html: '<span class="v red">−19%</span><span class="c">2025 年关税冲击</span>', tag: '2025' },
      { ...mk(2026.885, COL.risk), html: '<span class="v red">−12%</span><span class="c">2026 年 11 月 · 还在回调中</span>', tag: '2026', cls: 'right' },
    ];
    this.troughs.forEach((q) => (q.l = q.cls === 'right' ? this.label(q.html, [q.p.x - 0.6, CY(8200), 0.3], 'up') : this.label(q.html, [q.p.x, q.p.y - 0.35, 0.3], 'down')));
    this.recs = [
      { ...mk(2013.24, COL.ok), html: '<span class="t green">2013 年收复失地</span><span class="c">此后又涨了好几倍</span>' },
      { ...mk(2020.63, COL.ok), html: '<span class="t green">5 个月后收复</span>' },
      { ...mk(2026.76, COL.ok), html: '<span class="t green">2026 年 10 月 6 日</span><span class="v">约 7,800 点</span><span class="c">历史新高</span>' },
    ];
    this.recs.forEach((q, k) => (q.l = this.label(q.html, k === 2 ? [q.p.x - 0.5, q.p.y, 0.3] : [q.p.x, q.p.y + 0.4, 0.3], k === 2 ? 'left' : 'up')));
    this.lYears = [2000, 2008, 2020, 2026].map((y) => this.label(`<span class="c">${y}</span>`, [CX(y), 0, 0.6], 'down'));
    this.lTitle = this.label('<span class="t">标普 500 指数 · 2000 – 2026 年</span><span class="c">按比例画（对数坐标），关键点位为真实收盘价</span>', [CX(2001), CY(7800), 0], 'right');
    this.p = 0;
  }
  enter(st, prev, fresh) {
    if (fresh) this.p = 0;
  }
  update(dt) {
    const t = this.t;
    const step = this.st.step;
    if (step === 'all') this.p = Math.max(this.p, eInOut(seg(t, 0.4, 3.2)));
    else this.p = 1;
    this.line.setProgress(this.p);
    this.curtainMat.uniforms.uP.value = this.p;
    const px = CX(T0) + this.p * (CX(T1) - CX(T0));
    for (const q of this.troughs) {
      const reached = q.p.x <= px;
      q.s.visible = reached;
      let on = 0;
      if (step === 'all') on = reached ? 1 : 0;
      else if (step === '2008') on = q.tag === '2008' ? 1 : 0;
      else if (step === '2020') on = q.tag === '2020' ? 1 : 0;
      q.l.target = on;
    }
    for (const q of this.recs) {
      q.s.visible = step === 'recover';
      q.l.target = step === 'recover' && t > 0.8 ? 1 : 0;
    }
    for (const l of this.lYears) l.target = t > 0.5 ? 1 : 0;
    this.lTitle.target = step === 'all' || step === 'recover' ? (t > 0.6 ? 1 : 0) : 0;
    this.curtainMat.uniforms.uRed.value = step === 'recover' ? lerp(this.curtainMat.uniforms.uRed.value, 0.35, 1 - Math.exp(-2 * dt)) : lerp(this.curtainMat.uniforms.uRed.value, 1, 1 - Math.exp(-2 * dt));
  }
}

/* ================= Liquidity stampede: everyone rushes to the same narrow exit to get cash ================= */
export class Stampede extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [1, 0, 12, 1.0] });
    const fl = new THREE.Mesh(rbox(14.5, 0.06, 10, 0.03), this.m(new THREE.MeshStandardMaterial({ color: 0x121317, roughness: 0.7, metalness: 0.2 })));
    fl.position.set(-3.6, 0.03, 0);
    this.add(fl);
    const wallMat = this.m(new THREE.MeshPhysicalMaterial({ color: 0x1c2029, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.75, clearcoat: 1 }));
    this.DW = 0.8;
    const len = 5 - this.DW;
    [1, -1].forEach((s) => {
      const geo = new THREE.BoxGeometry(0.3, 1.6, len);
      const w = new THREE.Mesh(geo, wallMat);
      w.position.set(3.5, 0.8, s * (this.DW + len / 2));
      this.add(w);
      const e = edges(this, geo, 0xffffff, 0.18);
      e.position.copy(w.position);
      this.add(e);
    });
    const glow = this.m(new THREE.MeshBasicMaterial({ color: hdr(COL.cash, 2.2) }));
    [1, -1].forEach((s) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.6, 0.06), glow);
      b.position.set(3.5, 0.8, s * this.DW);
      this.add(b);
    });
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, this.DW * 2), glow);
    top.position.set(3.5, 1.6, 0);
    this.add(top);

    this.N = 420;
    this.mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 14, 10), this.m(new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.15 })), this.N);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.N * 3), 3);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.add(this.mesh);
    const n = this.N;
    this.x = new Float32Array(n);
    this.z = new Float32Array(n);
    this.vx = new Float32Array(n);
    this.vz = new Float32Array(n);
    this.tz = new Float32Array(n);
    this.sp = new Float32Array(n);
    this.ot = new Float32Array(n);
    this.type = new Uint8Array(n);
    this.out = new Uint8Array(n);
    this.alive = new Uint8Array(n);
    this.age = new Float32Array(n);
    this.cB = new THREE.Color(COL.spx);
    this.cG = new THREE.Color(COL.gold);
    this.cC = new THREE.Color(0xc6cad1);
    this.c = new THREE.Color();
    this.M = new THREE.Matrix4();
    this.grid = new Map();
    this.add(blob(this, 22, 12, 0.5));
    this.lLegend = this.label('<span class="t"><b class="dot blue"></b>标普　<b class="dot gold"></b>黄金</span>', [-9.6, 0.2, -4.2], 'right');
    this.lPanic = this.label('<span class="t">市场一紧张，大家先卖能卖的</span><span class="c">要补保证金、要现金</span>', [-3.2, 2.0, -2.0]);
    this.lDoor = this.label('<span class="t">换现金</span><span class="c">出口就这么宽</span>', [3.5, 2.05, 0]);
    this.lCash = this.label('<span class="t">现金</span>', [8.2, 1.0, 0]);
  }
  reset(i, left) {
    this.x[i] = left ? -9.3 + Math.random() * 1.2 : -9 + Math.random() * 10.5;
    this.z[i] = (Math.random() - 0.5) * 8.8;
    this.vx[i] = 0;
    this.vz[i] = 0;
    this.out[i] = 0;
    this.ot[i] = 0;
    this.sp[i] = 2.3 + Math.random() * 1.3;
    this.type[i] = Math.random() < 0.5 ? 0 : 1;
    this.alive[i] = 1;
    this.age[i] = left ? 0 : 1;
  }
  enter() {
    for (let i = 0; i < this.N; i++) {
      if (i < 330) this.reset(i, false);
      else this.alive[i] = 0;
    }
    this.acc = 0;
  }
  update(dt) {
    dt = Math.min(dt, 1 / 30);
    const t = this.t;
    const panic = t > 1.0;
    const n = this.N;
    if (panic) {
      this.acc += dt * 38;
      for (let i = 0; i < n && this.acc >= 1; i++) {
        if (!this.alive[i]) {
          this.reset(i, true);
          this.acc -= 1;
        }
      }
      this.acc = Math.min(this.acc, 3);
    }
    const cs = 0.5;
    const grid = this.grid;
    grid.clear();
    for (let i = 0; i < n; i++) {
      if (!this.alive[i]) continue;
      const key = Math.floor(this.x[i] / cs) * 1000 + Math.floor(this.z[i] / cs);
      let a = grid.get(key);
      if (!a) grid.set(key, (a = []));
      a.push(i);
    }
    const R = 0.34;
    for (let i = 0; i < n; i++) {
      if (!this.alive[i]) {
        this.M.makeScale(0, 0, 0);
        this.mesh.setMatrixAt(i, this.M);
        continue;
      }
      let x = this.x[i];
      let z = this.z[i];
      let dx;
      let dz;
      if (this.out[i]) {
        dx = 2.4;
        dz = (this.tz[i] - z) * 0.8;
      } else if (!panic) {
        dx = Math.sin(t * 1.3 + i) * 0.4;
        dz = Math.cos(t * 1.1 + i * 1.7) * 0.4;
      } else {
        const gx = 3.6 - x;
        const gz = Math.max(-0.45, Math.min(0.45, z)) - z;
        const L = Math.hypot(gx, gz) || 1;
        dx = (gx / L) * this.sp[i];
        dz = (gz / L) * this.sp[i];
      }
      this.vx[i] += (dx - this.vx[i]) * Math.min(1, dt * 3.2);
      this.vz[i] += (dz - this.vz[i]) * Math.min(1, dt * 3.2);
      // separation
      const cx = Math.floor(x / cs);
      const cz = Math.floor(z / cs);
      let px = 0;
      let pz = 0;
      for (let ox = -1; ox <= 1; ox++)
        for (let oz = -1; oz <= 1; oz++) {
          const a = grid.get((cx + ox) * 1000 + cz + oz);
          if (!a) continue;
          for (const j of a) {
            if (j === i) continue;
            const ddx = x - this.x[j];
            const ddz = z - this.z[j];
            const d2 = ddx * ddx + ddz * ddz;
            if (d2 < R * R && d2 > 1e-6) {
              const d = Math.sqrt(d2);
              const f = (R - d) / d;
              px += ddx * f;
              pz += ddz * f;
            }
          }
        }
      x += this.vx[i] * dt + px * 0.5;
      z += this.vz[i] * dt + pz * 0.5;
      if (!this.out[i]) {
        if (x > 3.5 - 0.31 && Math.abs(z) > this.DW - 0.17) {
          x = 3.5 - 0.31;
          this.vx[i] *= 0.2;
        }
        z = Math.max(-4.8, Math.min(4.8, z));
        x = Math.max(-10.6, x);
        if (x > 3.75) {
          this.out[i] = 1;
          this.tz[i] = (Math.random() - 0.5) * 7;
        }
      } else {
        this.ot[i] = Math.min(1, this.ot[i] + dt * 2.5);
        if (x > 11) {
          if (panic) this.reset(i, true);
          else this.alive[i] = 0;
        }
      }
      this.x[i] = x;
      this.z[i] = z;
      this.age[i] = Math.min(1, this.age[i] + dt * 3);
      const s = (this.out[i] ? 1 - ss(9.5, 11, x) : 1) * ss(0, 1, this.age[i]);
      this.M.makeScale(s, s, s).setPosition(x, 0.2, z);
      this.mesh.setMatrixAt(i, this.M);
      this.c.copy(this.type[i] ? this.cG : this.cB).lerp(this.cC, this.ot[i]);
      this.mesh.setColorAt(i, this.c);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
    this.lLegend.target = t > 0.3 ? 1 : 0;
    this.lPanic.target = panic ? 1 : 0;
    this.lDoor.target = t > 0.6 ? 1 : 0;
    this.lCash.target = t > 2.2 ? 1 : 0;
  }
}

/* ================= Falling prices = buying at a discount ================= */
export class Discount extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [0, 0.5, 9, 1.0] });
    this.pivot = new THREE.Group();
    this.pivot.position.set(0.2, 5.5, -0.8);
    this.add(this.pivot);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 8, 20), this.m(new THREE.MeshStandardMaterial({ color: 0x9aa0aa, metalness: 1, roughness: 0.3 })));
    this.pivot.add(hook);
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.75, 6), this.m(new THREE.MeshBasicMaterial({ color: 0xbfc3ca })));
    str.position.y = -0.45;
    this.pivot.add(str);
    this.tag = new THREE.Group();
    this.tag.position.y = -1.85;
    this.pivot.add(this.tag);
    this.tag.add(new THREE.Mesh(rbox(3.4, 1.9, 0.07, 0.1), this.m(new THREE.MeshStandardMaterial({ color: 0xb9b2a4, roughness: 0.8 }))));
    const hole = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 8, 20), this.m(new THREE.MeshStandardMaterial({ color: 0x9aa0aa, metalness: 1, roughness: 0.3 })));
    hole.position.set(0, 0.72, 0.04);
    this.tag.add(hole);
    const f = textPlane(this, '¥100', { w: 3.0, h: 1.2, px: 300, color: '#1d1d1f', weight: 800 });
    f.position.set(0, -0.1, 0.04);
    this.tag.add(f);
    const b = textPlane(this, '¥70', { w: 3.0, h: 1.2, px: 300, color: '#d63a2f', weight: 800 });
    b.position.set(0, -0.1, -0.04);
    b.rotation.y = Math.PI;
    this.tag.add(b);
    const b2 = textPlane(this, '跌三成 · 打七折', { w: 2.6, h: 0.36, px: 110, color: '#8e2a23', weight: 700 });
    b2.position.set(0, 0.5, -0.041);
    b2.rotation.y = Math.PI;
    this.tag.add(b2);

    const geo = rbox(0.56, 0.56, 0.56, 0.06, 2);
    const blue = this.m(new THREE.MeshPhysicalMaterial({ color: COL.spx, emissive: COL.spx, emissiveIntensity: 0.25, roughness: 0.25, clearcoat: 1 }));
    const green = this.m(new THREE.MeshPhysicalMaterial({ color: COL.ok, emissive: COL.ok, emissiveIntensity: 0.35, roughness: 0.25, clearcoat: 1 }));
    this.rowA = [];
    this.rowB = [];
    const x0 = -4.9;
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(geo, blue);
      m.userData = { x: x0 + i * 0.69, z: 0.9, i };
      this.add(m);
      this.rowA.push(m);
    }
    for (let i = 0; i < 15; i++) {
      const sliver = i === 14;
      const m = new THREE.Mesh(sliver ? rbox(0.56 * 0.3, 0.56, 0.56, 0.04, 2) : geo, i >= 10 ? green : blue);
      m.userData = { x: x0 + i * 0.69 - (sliver ? 0.56 * 0.35 : 0), z: 2.4, i };
      this.add(m);
      this.rowB.push(m);
    }
    this.add(blob(this, 13, 6, 0.6));
    this.lA = this.label('<span class="t">原价</span><span class="c">1 万块买 10 份</span>', [x0 - 0.5, 0.85, 0.9], 'left');
    this.lB = this.label('<span class="t">跌了三成</span><span class="c">1 万块买 14.3 份</span>', [x0 - 0.5, 0.0, 2.4], 'left');
    this.lX = this.label('<span class="v green">+43%</span><span class="c">多买到的份额</span>', [x0 + 11.9 * 0.69, 0.75, 2.4]);
  }
  update(dt, time) {
    const t = this.t;
    const flip = eInOut(seg(t, 2.2, 3.0));
    this.tag.rotation.y = flip * Math.PI;
    this.pivot.rotation.z = Math.sin(time * 1.6) * 0.035 + Math.sin(flip * Math.PI) * 0.08;
    const place = (m, t0) => {
      const k = seg(t, t0, t0 + 0.4);
      const f = k * k;
      m.position.set(m.userData.x, lerp(3.0, 0.28, f), m.userData.z);
      m.visible = k > 0;
    };
    this.rowA.forEach((m, i) => place(m, 0.6 + i * 0.07));
    this.rowB.forEach((m, i) => place(m, 3.2 + i * 0.07));
    this.lA.target = t > 1.2 ? 1 : 0;
    this.lB.target = t > 3.4 ? 1 : 0;
    this.lX.target = t > 4.6 ? 1 : 0;
  }
}

/* ================= QDII premium: paying 110 for something worth 100 ================= */
export class Premium extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [0, 0, 8, 1.0] });
    const ped = new THREE.Mesh(rbox(7, 0.3, 3.6, 0.08), this.m(new THREE.MeshStandardMaterial({ color: 0x18191e, metalness: 0.7, roughness: 0.35 })));
    ped.position.y = 0.15;
    this.add(ped);
    const geo = new THREE.BoxGeometry(2.1, 1, 2.1);
    geo.translate(0, 0.5, 0);
    const mk = (color, em, x, body) => {
      const g = new THREE.Group();
      g.position.set(x, 0.3, 0);
      this.add(g);
      g.add(new THREE.Mesh(geo, this.m(new THREE.MeshPhysicalMaterial({ color: body, emissive: color, emissiveIntensity: em, roughness: 0.16, metalness: 0.1, transparent: true, opacity: 0.94, clearcoat: 1 }))));
      g.add(edges(this, geo, color, 0.8));
      return g;
    };
    this.A = mk(0x8fb0d6, 0.32, -1.6, 0x14202e);
    this.B = mk(0x8fb0d6, 0.32, 1.6, 0x14202e);
    const capGeo = new THREE.BoxGeometry(2.1, 1, 2.1);
    capGeo.translate(0, 0.5, 0);
    this.cap = new THREE.Mesh(capGeo, this.m(new THREE.MeshStandardMaterial({ color: COL.risk, emissive: COL.risk, emissiveIntensity: 1.1, roughness: 0.3 })));
    this.cap.position.x = 1.6;
    this.add(this.cap);
    this.H = 5.0;
    this.line = dashLine(this, [new THREE.Vector3(-2.8, 0.3 + this.H, 1.08), new THREE.Vector3(2.8, 0.3 + this.H, 1.08)], 0xffffff, 0.55);
    this.add(this.line);
    this.add(blob(this, 9, 5, 0.6));
    this.lA = this.label('<span class="c">基金实际值（净值）</span><span class="v">1.00 元</span>', [-1.6, 0, 1.9], 'down');
    this.lB = this.label('<span class="c">场内成交价</span><span class="v">1.10 元</span>', [1.6, 0, 1.9], 'down');
    this.lP = this.label('<span class="v red">溢价 10%</span><span class="c">多花的冤枉钱</span>', [2.75, 0.3 + this.H + 0.25, 0], 'right');
  }
  update(dt, time) {
    const t = this.t;
    const k = eOut(seg(t, 0.3, 1.3));
    const h = this.H * k;
    this.A.scale.y = Math.max(0.001, h);
    this.B.scale.y = Math.max(0.001, h);
    const kc = eOut(seg(t, 1.7, 2.4));
    const hc = this.H * 0.1 * kc;
    this.cap.scale.y = Math.max(0.001, hc);
    this.cap.position.y = 0.3 + h;
    this.cap.visible = kc > 0;
    this.cap.material.emissiveIntensity = 1.0;
    this.line.visible = t > 1.5;
    this.lA.target = this.lB.target = t > 1.0 ? 1 : 0;
    this.lP.target = kc > 0.9 ? 1 : 0;
  }
}
