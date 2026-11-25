import * as THREE from 'three';
import { Piece, rbox, COL, hdr, lerp, clamp01, seg, ss, eOut, eIn, eInOut, eOutBack, rng, blob, edges } from '../lib.js';
import { FOG } from '../world.js';

/* ================= 3.1 / 3.2  One boat on one economic cycle -> a second island across the sea ================= */
function seaH(x, z, t, amp, sx, sz, ss_) {
  let h = amp * (0.35 * Math.sin(x * 0.35 + t * 0.9) + 0.25 * Math.sin(z * 0.5 - t * 0.7 + x * 0.2) + 0.12 * Math.sin((x + z) * 0.9 + t * 1.6));
  const dx = x - sx;
  const dz = z - sz;
  h += ss_ * Math.exp(-(dx * dx + dz * dz) / 40) * 0.5 * Math.sin(x * 0.8 + t * 2.2);
  return h;
}
const SEA_Y = 0.62;

function factory(piece, mat, win) {
  const g = new THREE.Group();
  const main = new THREE.Mesh(rbox(2.8, 1.3, 2.0, 0.05), mat);
  main.position.y = 0.65;
  g.add(main);
  const tri = new THREE.Shape();
  tri.moveTo(0, 0);
  tri.lineTo(0.93, 0);
  tri.lineTo(0, 0.55);
  tri.closePath();
  const tg = new THREE.ExtrudeGeometry(tri, { depth: 2.0, bevelEnabled: false });
  tg.translate(0, 0, -1.0);
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(tg, mat);
    r.position.set(-1.4 + i * 0.93, 1.3, 0);
    g.add(r);
  }
  const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 1.7, 20), mat);
  ch.position.set(-1.0, 1.95, -0.55);
  g.add(ch);
  const w = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.16, 0.02), win);
  w.position.set(0, 0.75, 1.01);
  g.add(w);
  return g;
}
function house(piece, mat, roofMat, win) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(rbox(1.6, 1.1, 1.4, 0.04), mat);
  b.position.y = 0.55;
  g.add(b);
  const tri = new THREE.Shape();
  tri.moveTo(-0.92, 0);
  tri.lineTo(0.92, 0);
  tri.lineTo(0, 0.75);
  tri.closePath();
  const rg = new THREE.ExtrudeGeometry(tri, { depth: 1.55, bevelEnabled: false });
  rg.translate(0, 0, -0.775);
  const roof = new THREE.Mesh(rg, roofMat);
  roof.position.y = 1.1;
  g.add(roof);
  const w = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.02), win);
  w.position.set(0.35, 0.65, 0.71);
  g.add(w);
  const d = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 0.02), win);
  d.position.set(-0.35, 0.28, 0.71);
  g.add(d);
  return g;
}

export class Islands extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [0, 0, 1, 0], rise: 1.4 });
    // --- sea ---
    const sg = new THREE.PlaneGeometry(90, 56, 180, 112);
    sg.rotateX(-Math.PI / 2);
    this.seaMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAmp: { value: 0.8 },
        uStorm: { value: new THREE.Vector3(-6.5, 1.5, 0) },
        uCam: { value: new THREE.Vector3() },
        uFade: this.fade,
        uDeep: { value: new THREE.Color(0.004, 0.011, 0.026) },
        uSky: { value: new THREE.Color(0.07, 0.11, 0.19) },
        uL: { value: new THREE.Vector3(-0.3, 0.55, -1.0) },
        uFog: { value: FOG },
      },
      vertexShader: /* glsl */ `
        uniform float uTime; uniform float uAmp; uniform vec3 uStorm;
        varying vec3 vW; varying vec3 vN; varying vec2 vUv;
        float H(vec2 p){
          float h = uAmp * (0.35*sin(p.x*0.35 + uTime*0.9) + 0.25*sin(p.y*0.5 - uTime*0.7 + p.x*0.2) + 0.12*sin((p.x+p.y)*0.9 + uTime*1.6));
          vec2 d = p - uStorm.xy;
          h += uStorm.z * exp(-dot(d,d)/40.0) * 0.5 * sin(p.x*0.8 + uTime*2.2);
          return h;
        }
        void main(){
          vec3 p = position;
          float e = 0.2;
          float hx = H(p.xz + vec2(e,0.)) - H(p.xz - vec2(e,0.));
          float hz = H(p.xz + vec2(0.,e)) - H(p.xz - vec2(0.,e));
          vN = normalize(vec3(-hx, 2.0*e, -hz));
          p.y += H(p.xz);
          vec4 w = modelMatrix * vec4(p, 1.0);
          vW = w.xyz; vUv = uv;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uCam; uniform float uFade; uniform vec3 uDeep; uniform vec3 uSky; uniform vec3 uL; uniform float uFog;
        varying vec3 vW; varying vec3 vN; varying vec2 vUv;
        void main(){
          vec3 N = normalize(vN); vec3 V = normalize(uCam - vW);
          float fres = pow(clamp(1.0 - dot(N, V), 0.0, 1.0), 5.0);
          vec3 col = mix(uDeep, uSky, 0.06 + 0.94 * fres);
          vec3 Hh = normalize(normalize(uL) + V);
          col += vec3(1.0, 0.95, 0.88) * pow(max(dot(N, Hh), 0.0), 260.0) * 0.45;
          vec2 q = vUv * 2.0 - 1.0;
          float edge = 1.0 - smoothstep(0.55, 1.0, length(q * vec2(1.0, 1.1)));
          float fog = exp(-pow(uFog * length(uCam - vW), 2.0));
          gl_FragColor = vec4(col * edge * fog * uFade, 1.0);
        }`,
    });
    this.sea = new THREE.Mesh(sg, this.seaMat);
    this.sea.position.y = SEA_Y;
    this.add(this.sea);

    const white = this.m(new THREE.MeshStandardMaterial({ color: 0xa9a49a, roughness: 0.6, metalness: 0.04 }));
    const roof = this.m(new THREE.MeshStandardMaterial({ color: 0x8c6f58, roughness: 0.6 }));
    const win = this.m(new THREE.MeshBasicMaterial({ color: hdr(0xffd9a0, 1.6) }));
    const gold = this.m(new THREE.MeshStandardMaterial({ color: COL.gold, metalness: 1, roughness: 0.25 }));

    // --- island 1: home business ---
    this.i1 = new THREE.Group();
    this.i1.base = new THREE.Vector3(-6.5, 0, 1.5);
    this.add(this.i1);
    const hull = new THREE.Mesh(rbox(9, 0.8, 5.6, 0.28), white);
    this.i1.add(hull);
    const stripe = new THREE.Mesh(rbox(9.06, 0.12, 5.66, 0.05), this.m(new THREE.MeshStandardMaterial({ color: COL.rmb, roughness: 0.4 })));
    stripe.position.y = -0.18;
    this.i1.add(stripe);
    const fac = factory(this, white, win);
    fac.position.set(-2.1, 0.4, -0.7);
    this.i1.add(fac);
    const hs = house(this, white, roof, win);
    hs.position.set(1.9, 0.4, -1.0);
    this.i1.add(hs);
    const net = new THREE.Group();
    net.position.set(1.7, 0.4, 1.4);
    this.i1.add(net);
    const nodeMat = this.m(new THREE.MeshBasicMaterial({ color: hdr(COL.spxHi, 1.8) }));
    const np = [
      [-0.7, 0.5, 0],
      [0.1, 1.2, -0.3],
      [0.8, 0.7, 0.2],
      [-0.2, 0.35, 0.6],
      [0.5, 1.6, 0.4],
    ];
    np.forEach((p) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), nodeMat);
      s.position.set(...p);
      net.add(s);
    });
    const lp = [];
    [
      [0, 1],
      [1, 2],
      [0, 3],
      [3, 2],
      [1, 4],
      [2, 4],
      [0, 2],
    ].forEach(([a, b]) => lp.push(new THREE.Vector3(...np[a]), new THREE.Vector3(...np[b])));
    net.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lp), this.m(new THREE.LineBasicMaterial({ color: COL.spxHi, transparent: true, opacity: 0.7 }))));
    const coins = new THREE.Group();
    coins.position.set(-2.6, 0.4, 1.6);
    this.i1.add(coins);
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 40), gold);
      c.position.set((i % 2) * 0.03, 0.06 + i * 0.11, 0);
      coins.add(c);
    }

    // --- island 2: global assets ---
    this.i2 = new THREE.Group();
    this.i2.base = new THREE.Vector3(9.5, 0, -4.5);
    this.add(this.i2);
    this.i2.add(new THREE.Mesh(rbox(6.6, 0.7, 4.2, 0.25), white));
    const st2 = new THREE.Mesh(rbox(6.66, 0.12, 4.26, 0.05), this.m(new THREE.MeshStandardMaterial({ color: COL.spx, roughness: 0.4 })));
    st2.position.y = -0.16;
    this.i2.add(st2);
    const towerMat = this.m(new THREE.MeshStandardMaterial({ color: 0x0d1a2c, roughness: 0.3, metalness: 0.6, emissive: COL.spx, emissiveIntensity: 0.25 }));
    const capMat = this.m(new THREE.MeshBasicMaterial({ color: hdr(COL.spx, 2.2) }));
    const R = rng(5);
    for (let i = 0; i < 9; i++) {
      const h = 0.6 + R() * 2.2;
      const x = -2.4 + (i % 3) * 0.75 + R() * 0.1;
      const z = -1.2 + Math.floor(i / 3) * 0.8;
      const tw = new THREE.Mesh(new THREE.BoxGeometry(0.55, h, 0.55), towerMat);
      tw.position.set(x, 0.35 + h / 2, z);
      this.i2.add(tw);
      const cp = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.05, 0.57), capMat);
      cp.position.set(x, 0.35 + h, z);
      this.i2.add(cp);
    }
    const barGeo = rbox(1.4, 0.4, 0.62, 0.05);
    [
      [1.3, 0.55, -0.5],
      [1.3, 0.55, 0.3],
      [1.3, 0.95, -0.1],
    ].forEach((p) => {
      const b = new THREE.Mesh(barGeo, gold);
      b.position.set(...p);
      this.i2.add(b);
    });

    // --- bridge of light ---
    this.NB = 64;
    this.bridgeGeo = new THREE.BufferGeometry();
    this.bridgeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.NB * 3), 3));
    this.bridge = new THREE.Line(this.bridgeGeo, this.m(new THREE.LineBasicMaterial({ color: hdr(COL.gold, 1.4), transparent: true, opacity: 0.85 })));
    this.bridge.frustumCulled = false;
    this.add(this.bridge);
    this.pulses = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 12, 8), this.m(new THREE.MeshBasicMaterial({ color: hdr(COL.gold, 2.6) })), 10);
    this.pulses.frustumCulled = false;
    this.add(this.pulses);
    this.M = new THREE.Matrix4();
    this.a = new THREE.Vector3();
    this.b = new THREE.Vector3();
    this.c = new THREE.Vector3();
    this.p = new THREE.Vector3();

    this.lMain = this.label('<span class="t">国内主业</span>', [-0.2, 3.3, -0.4], 'up', this.i1);
    this.lSea = this.label('<span class="c">海面起伏 = 国内经济周期</span>', [-1.2, 0.9, 6.2], 'mid');
    this.lI2 = this.label('<span class="t blue">全球资产</span><span class="c">美股指数 · 黄金</span>', [-0.5, 3.4, 0], 'up', this.i2);
    this.lBridge = this.label('<span class="t gold">跨海保险</span>', [0, 0, 0]);
    this.i2v = 0;
  }
  update(dt, time) {
    const t = this.t;
    const step = this.st.step || 1;
    const storm = step === 2 ? 0.55 + 0.45 * Math.sin(t * 0.7) : 0.35;
    const amp = 0.75;
    const u = this.seaMat.uniforms;
    u.uTime.value = time;
    u.uAmp.value = amp;
    u.uStorm.value.set(this.i1.base.x, this.i1.base.z, storm * 1.2);
    u.uCam.value.copy(this.app.camera.position);

    const place = (g, extra, phase, v) => {
      const b = g.base;
      const h = seaH(b.x, b.z, time, amp, this.i1.base.x, this.i1.base.z, storm * 1.2);
      const hx = seaH(b.x + 1.5, b.z, time, amp, this.i1.base.x, this.i1.base.z, storm * 1.2) - seaH(b.x - 1.5, b.z, time, amp, this.i1.base.x, this.i1.base.z, storm * 1.2);
      const hz = seaH(b.x, b.z + 1.5, time, amp, this.i1.base.x, this.i1.base.z, storm * 1.2) - seaH(b.x, b.z - 1.5, time, amp, this.i1.base.x, this.i1.base.z, storm * 1.2);
      g.position.set(b.x, SEA_Y + 0.12 + h * 0.8 + extra + (1 - v) * -3.2, b.z);
      g.rotation.z = -hx * 0.18 + Math.sin(time * 1.1 + phase) * 0.02;
      g.rotation.x = hz * 0.18;
    };
    place(this.i1, step === 2 ? Math.sin(time * 1.7) * 0.32 * storm : Math.sin(time * 1.2) * 0.12, 0, 1);
    this.i2v = lerp(this.i2v, step === 2 ? ss(0.2, 1.6, t) : 0, 1 - Math.exp(-4 * dt));
    this.i2.visible = this.i2v > 0.01;
    if (this.i2.visible) place(this.i2, Math.sin(time * 1.1 + Math.PI) * 0.08, 1.7, this.i2v);
    this.i2.scale.setScalar(Math.max(0.001, this.i2v));

    // bridge between the two decks
    const bv = step === 2 ? ss(1.4, 2.4, t) : 0;
    this.bridge.visible = this.pulses.visible = bv > 0.01;
    if (this.bridge.visible) {
      this.i1.updateMatrix();
      this.i2.updateMatrix();
      this.a.set(-3.6, 0.6, 0).applyMatrix4(this.i1.matrix);
      this.c.set(-2.2, 0.5, 0.8).applyMatrix4(this.i2.matrix);
      this.b.copy(this.a).add(this.c).multiplyScalar(0.5);
      this.b.y += 5.2;
      const arr = this.bridgeGeo.attributes.position.array;
      const n = Math.max(2, Math.round(this.NB * bv));
      for (let i = 0; i < this.NB; i++) {
        const s = Math.min(i, n - 1) / (this.NB - 1);
        const q = (1 - s) * (1 - s);
        const w = 2 * (1 - s) * s;
        const r = s * s;
        arr[i * 3] = q * this.a.x + w * this.b.x + r * this.c.x;
        arr[i * 3 + 1] = q * this.a.y + w * this.b.y + r * this.c.y;
        arr[i * 3 + 2] = q * this.a.z + w * this.b.z + r * this.c.z;
      }
      this.bridgeGeo.attributes.position.needsUpdate = true;
      for (let i = 0; i < 10; i++) {
        const s = (time * 0.18 + i / 10) % 1;
        const q = (1 - s) * (1 - s);
        const w = 2 * (1 - s) * s;
        const r = s * s;
        this.p.set(q * this.a.x + w * this.b.x + r * this.c.x, q * this.a.y + w * this.b.y + r * this.c.y, q * this.a.z + w * this.b.z + r * this.c.z);
        const sc = s < bv ? 1 : 0;
        this.M.makeScale(sc, sc, sc).setPosition(this.p);
        this.pulses.setMatrixAt(i, this.M);
      }
      this.pulses.instanceMatrix.needsUpdate = true;
      this.lBridge.pos.copy(this.b).setY(this.b.y * 0.5 + this.a.y * 0.25 + this.c.y * 0.25 + 0.35);
    }

    this.lMain.target = step === 2 && t > 0.8 ? 1 : 0;
    this.lSea.target = t > 1.0 ? 1 : 0;
    this.lI2.target = step === 2 && t > 1.3 ? 1 : 0;
    this.lBridge.target = step === 2 && t > 2.2 ? 1 : 0;
  }
}

/* ================= 3.4  Buffett's ten-year bet (2008 – 2017) ================= */
export class Bet extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [0, 0, 8, 1.0] });
    const ped = new THREE.Mesh(rbox(7.4, 0.3, 3.8, 0.08), this.m(new THREE.MeshStandardMaterial({ color: 0x18191e, metalness: 0.7, roughness: 0.35 })));
    ped.position.y = 0.15;
    this.add(ped);
    const geo = new THREE.BoxGeometry(2.2, 1, 2.2);
    geo.translate(0, 0.5, 0);
    const col = (color, em, x, body) => {
      const g = new THREE.Group();
      g.position.set(x, 0.3, 0);
      this.add(g);
      const m = new THREE.Mesh(
        geo,
        this.m(new THREE.MeshPhysicalMaterial({ color: body, emissive: color, emissiveIntensity: em, roughness: 0.16, metalness: 0.1, transparent: true, opacity: 0.94, clearcoat: 1 })),
      );
      g.add(m);
      const e = edges(this, geo, color, 0.85);
      g.add(e);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.05, 2.22), this.m(new THREE.MeshBasicMaterial({ color: hdr(color, 2.0) })));
      this.add(cap);
      return { g, cap };
    };
    this.A = col(COL.spx, 0.5, -1.7, 0x0a2342);
    this.B = col(0xa9a9b2, 0.18, 1.7, 0x1d1d22);
    this.add(blob(this, 9, 5, 0.6));
    this.lA = this.label('', [-1.7, 0, 0]);
    this.lB = this.label('', [1.7, 0, 0]);
    this.lAn = this.label('<span class="t">标普 500 指数基金</span><span class="c">什么都不挑，买下整个指数</span>', [-1.7, 0, 1.9], 'down');
    this.lBn = this.label('<span class="t">对冲基金组合</span><span class="c">华尔街专业人士精选的 5 个组合（平均）</span>', [1.7, 0, 1.9], 'down');
    this.lYear = this.label('', [0, 5.7, 0]);
  }
  update() {
    const t = this.t;
    const base = 2.0;
    const k0 = eOut(seg(t, 0.3, 0.9));
    const k = eInOut(seg(t, 1.0, 4.0));
    const gA = 1.258 * k;
    const gB = 0.363 * k;
    const hA = base * k0 * (1 + gA);
    const hB = base * k0 * (1 + gB);
    this.A.g.scale.y = Math.max(0.001, hA);
    this.B.g.scale.y = Math.max(0.001, hB);
    this.A.cap.position.set(-1.7, 0.3 + hA, 0);
    this.B.cap.position.set(1.7, 0.3 + hB, 0);
    this.lA.pos.y = 0.3 + hA + 0.2;
    this.lB.pos.y = 0.3 + hB + 0.2;
    this.lA.set(`<span class="v blue">+${(gA * 100).toFixed(1)}%</span>`);
    this.lB.set(`<span class="v silver">+${(gB * 100).toFixed(1)}%</span>`);
    this.lA.target = this.lB.target = t > 1.0 ? 1 : 0;
    this.lAn.target = this.lBn.target = t > 0.5 ? 1 : 0;
    const yr = 2008 + Math.round(9 * k);
    this.lYear.set(`<span class="c">十年累计收益</span><span class="t">2008 → ${yr}</span>`);
    this.lYear.target = t > 0.8 ? 1 : 0;
  }
}
