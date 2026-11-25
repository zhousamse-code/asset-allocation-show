import * as THREE from 'three';
import { Piece, rbox, COL, hdr, lerp, seg, ss, eOut, rng, blob, canvasTex, FONT } from '../lib.js';
import { cityLayout, cityMesh } from './act4.js';

function coinTex() {
  return canvasTex(512, 512, (g) => {
    g.fillStyle = '#c3382e';
    g.fillRect(0, 0, 512, 512);
    g.strokeStyle = 'rgba(255,225,215,0.55)';
    g.lineWidth = 14;
    g.beginPath();
    g.arc(256, 256, 214, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#ffe3da';
    g.font = `700 300px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('¥', 256, 272);
  });
}
function screenTex() {
  return canvasTex(512, 320, (g, w, h) => {
    g.fillStyle = '#06101e';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,180,255,0.18)';
    g.lineWidth = 2;
    for (let y = 60; y < h; y += 52) {
      g.beginPath();
      g.moveTo(24, y);
      g.lineTo(w - 24, y);
      g.stroke();
    }
    g.strokeStyle = '#4aa8ff';
    g.lineWidth = 7;
    g.beginPath();
    const R = rng(3);
    let y = 230;
    g.moveTo(30, y);
    for (let x = 30; x < w - 30; x += 22) {
      y = Math.max(70, Math.min(260, y - 7 + (R() - 0.5) * 34));
      g.lineTo(x, y);
    }
    g.stroke();
    g.fillStyle = '#ffffff';
    g.font = `700 46px ${FONT}`;
    g.fillText('标普 500 ETF', 32, 50);
  });
}

const PATHS = [
  [
    [-11.8, 0.55, 2.4],
    [-6.5, 0.8, 4.6],
    [0, 1.05, 5.3],
    [6.5, 0.8, 4.6],
    [11.6, 0.55, 2.4],
  ],
  [
    [-11.8, 0.55, 0],
    [-6, 0.95, -0.7],
    [0, 1.0, -1.3],
    [6, 0.95, -0.7],
    [11.6, 0.55, 0],
  ],
  [
    [-11.8, 0.6, -2.0],
    [-8.2, 3.0, -5.6],
    [-3.6, 2.9, -8.9],
    [0, 1.6, -10.2],
    [3.6, 2.9, -8.9],
    [8.2, 3.0, -5.6],
    [11.6, 0.6, -2.0],
  ],
];
const COUNTS = [46, 34, 12];
const SPEEDS = [0.1, 0.07, 0.045];
const TUBE_C = [COL.spx, 0xc9ced6, COL.usd];

/* ================= Act 7  Three compliant routes into the S&P 500 ================= */
export class Paths extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [0, -2, 18, 1.0] });
    const dark = this.m(new THREE.MeshStandardMaterial({ color: 0x17181d, metalness: 0.7, roughness: 0.35 }));
    const d1 = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.4, 64), dark);
    d1.position.set(-14.4, 0.2, 0);
    this.add(d1);
    const d2 = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.4, 64), dark);
    d2.position.set(14.6, 0.2, 0);
    this.add(d2);
    const ct = coinTex();
    const coinSide = this.m(new THREE.MeshStandardMaterial({ color: 0xb8342b, metalness: 0.7, roughness: 0.3 }));
    const coinFace = this.m(new THREE.MeshStandardMaterial({ map: ct, metalness: 0.45, roughness: 0.35 }));
    this.coin = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.18, 64), [coinSide, coinFace, coinFace]);
    this.coin.rotation.order = 'YXZ';
    this.coin.rotation.x = Math.PI / 2;
    this.coin.position.set(-14.4, 2.3, 0);
    this.add(this.coin);

    this.glow = { value: 1 };
    const mini = cityLayout(
      [
        ['科技', 0.33, 22],
        ['金融', 0.13, 14],
        ['可选消费', 0.1, 10],
        ['通信', 0.1, 6],
        ['医疗', 0.09, 12],
        ['工业', 0.08, 14],
        ['其他', 0.17, 22],
      ],
      4.6,
      4.0,
      12,
      0.42,
      0.18,
    );
    const hues = [208, 196, 222, 186, 232, 214, 200];
    const city = cityMesh(this, mini.towers, (tw, c) => c.setHSL(hues[tw.sector] / 360, 0.85, 0.55, THREE.SRGBColorSpace), this.glow);
    const M = new THREE.Matrix4();
    mini.towers.forEach((tw, i) => {
      M.makeScale(tw.f, tw.h, tw.f).setPosition(tw.x, 0, tw.z);
      city.setMatrixAt(i, M);
    });
    city.position.set(14.6, 0.4, 0);
    this.add(city);

    // waypoint 1: trading terminal
    const term = new THREE.Group();
    this.term = term;
    term.position.set(0, 0, 5.9);
    this.add(term);
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.2, 12), dark);
    stand.position.y = 0.6;
    term.add(stand);
    const scr = new THREE.Mesh(rbox(1.9, 1.2, 0.1, 0.05), dark);
    scr.position.y = 1.75;
    term.add(scr);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.78, 1.08), this.m(new THREE.MeshBasicMaterial({ map: screenTex(), color: hdr(0xffffff, 1.25) })));
    face.position.set(0, 1.75, 0.056);
    term.add(face);

    // waypoint 2: bank
    const marble = this.m(new THREE.MeshStandardMaterial({ color: 0x9d988f, roughness: 0.55 }));
    const bank = new THREE.Group();
    this.bank = bank;
    bank.position.set(0, 0, -1.3);
    this.add(bank);
    const bb = new THREE.Mesh(rbox(3.4, 0.25, 2.0, 0.04), marble);
    bb.position.y = 0.125;
    bank.add(bb);
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 1.5, 20), marble);
      c.position.set(-1.2 + i * 0.8, 1.0, 0.75);
      bank.add(c);
    }
    const back = new THREE.Mesh(rbox(3.0, 1.5, 0.2, 0.03), marble);
    back.position.set(0, 1.0, -0.6);
    bank.add(back);
    const roofS = new THREE.Mesh(rbox(3.6, 0.22, 2.1, 0.04), marble);
    roofS.position.y = 1.86;
    bank.add(roofS);
    const tri = new THREE.Shape();
    tri.moveTo(-1.8, 0);
    tri.lineTo(1.8, 0);
    tri.lineTo(0, 0.6);
    tri.closePath();
    const pg = new THREE.ExtrudeGeometry(tri, { depth: 2.0, bevelEnabled: false });
    pg.translate(0, 0, -1.0);
    const ped = new THREE.Mesh(pg, marble);
    ped.position.y = 1.97;
    bank.add(ped);

    // waypoint 3: Hong Kong
    const hk = new THREE.Group();
    this.hk = hk;
    hk.position.set(0, 0, -10.4);
    this.add(hk);
    const hull = new THREE.Mesh(rbox(4.8, 0.5, 2.8, 0.2), this.m(new THREE.MeshStandardMaterial({ color: 0x1b1d23, metalness: 0.6, roughness: 0.4 })));
    hull.position.y = 0.25;
    hk.add(hull);
    const twM = this.m(new THREE.MeshStandardMaterial({ color: 0x141821, metalness: 0.6, roughness: 0.3, emissive: 0xffb35c, emissiveIntensity: 0.08 }));
    const capM = this.m(new THREE.MeshBasicMaterial({ color: hdr(0xffc77a, 1.6) }));
    const R = rng(8);
    for (let i = 0; i < 9; i++) {
      const h = 0.5 + R() * 1.9;
      const x = -1.8 + (i % 5) * 0.85;
      const z = i < 5 ? -0.5 : 0.5;
      const tw = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, 0.5), twM);
      tw.position.set(x, 0.5 + h / 2, z);
      hk.add(tw);
      const cp = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.04, 0.52), capM);
      cp.position.set(x, 0.5 + h, z);
      hk.add(cp);
    }

    // paths + flowing money
    this.curves = PATHS.map((p) => new THREE.CatmullRomCurve3(p.map((q) => new THREE.Vector3(...q)), false, 'centripetal'));
    this.tubeMats = [];
    this.curves.forEach((c, i) => {
      const mat = this.m(new THREE.MeshBasicMaterial({ color: hdr(TUBE_C[i], 1.3), transparent: true, opacity: 0.5, depthWrite: false }));
      this.tubeMats.push(mat);
      this.add(new THREE.Mesh(new THREE.TubeGeometry(c, 160, 0.05, 8, false), mat));
    });
    const gateP = this.curves[2].getPointAt(0.36);
    const gateT = this.curves[2].getTangentAt(0.36);
    this.gate = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 12, 40), this.m(new THREE.MeshBasicMaterial({ color: hdr(0xffb340, 2.2) })));
    this.gate.position.copy(gateP);
    this.gate.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), gateT);
    this.add(this.gate);
    this.flows = COUNTS.map((n) => {
      const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 12, 8), this.m(new THREE.MeshBasicMaterial({ color: 0xffffff })), n);
      m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      this.add(m);
      return m;
    });
    this.add(blob(this, 34, 20, 0.5));
    this.cR = hdr(COL.rmb, 2.0);
    this.cB = hdr(COL.spx, 2.2);
    this.cG = hdr(COL.usd, 2.2);
    this.gateC = hdr(0xffb340, 2.2);
    this.c = new THREE.Color();
    this.p = new THREE.Vector3();
    this.M = new THREE.Matrix4();
    this.b = [0.8, 0.8, 0.8];
    this.w = [1, 1, 1];

    this.lStart = this.label('<span class="t">您的人民币</span>', [-14.4, 0, 2.9], 'down');
    this.lDest = this.label('<span class="t blue">标普 500</span>', [14.6, 0, 3.7], 'down');
    this.lP = [
      this.label('<span class="t">路一 · A 股证券账户</span><span class="c">买场内标普 ETF · 价格常比实际值贵 5%–10%（溢价）</span>', [0, 2.6, 5.9]),
      this.label('<span class="t">路二 · 银行 / 基金 APP</span><span class="c">买场外 QDII 基金 · 现在大多每天限购 10 元以内</span>', [0, 2.75, -1.3]),
      this.label('<span class="t green">路三 · 本人赴港开户</span><span class="c">买 VOO · 费率最低，但资金出境受严格限制</span>', [0, 2.9, -10.4]),
    ];
    this.lGate = this.label('<span class="c amber">购汇额度：每人每年 5 万美元<br>且不能用于证券投资</span>', [gateP.x - 0.6, gateP.y + 0.2, gateP.z], 'left');
  }
  update(dt, time) {
    const t = this.t;
    const f = this.st.focus || 0;
    const dim = this.st.dim ? 0.45 : 1;
    this.coin.rotation.y = Math.sin(time * 0.6) * 0.55;
    this.coin.position.y = 2.3 + Math.sin(time * 1.2) * 0.12;
    for (let i = 0; i < 3; i++) {
      const target = (f === 0 ? 0.85 : f === i + 1 ? 1 : 0.12) * dim;
      this.b[i] = lerp(this.b[i], target, 1 - Math.exp(-4 * dt));
      const b = this.b[i];
      this.tubeMats[i].opacity = 0.1 + 0.55 * b;
      const n = COUNTS[i];
      const m = this.flows[i];
      for (let k = 0; k < n; k++) {
        const u = (time * SPEEDS[i] + k / n) % 1;
        this.curves[i].getPointAt(u, this.p);
        let col;
        if (i === 2) col = u < 0.5 ? this.cR : u < 0.9 ? this.cG : this.cB;
        else col = u < 0.5 ? this.cR : this.cB;
        this.c.copy(col).multiplyScalar(0.25 + 0.75 * b);
        const s = (i === 1 && u > 0.5 ? 0.82 : 1) * Math.min(1, ss(0, 0.04, u) * ss(1, 0.96, u)) * (0.55 + 0.45 * b);
        this.M.makeScale(s, s, s).setPosition(this.p);
        m.setMatrixAt(k, this.M);
        m.setColorAt(k, this.c);
      }
      m.instanceMatrix.needsUpdate = true;
      m.instanceColor.needsUpdate = true;
      this.lP[i].target = (f === 0 || f === i + 1) && !this.st.dim && t > 0.6 ? 1 : 0;
    }
    this.glow.value = 0.6 + 0.4 * dim;
    [this.term, this.bank, this.hk].forEach((g, i) => {
      this.w[i] = lerp(this.w[i], f === 0 || f === i + 1 ? 1 : 0, 1 - Math.exp(-5 * dt));
      g.scale.setScalar(Math.max(0.001, this.w[i]));
      g.visible = this.w[i] > 0.01;
    });
    this.gate.scale.setScalar(Math.max(0.001, this.w[2]));
    this.gate.visible = this.w[2] > 0.01;
    this.gate.material.color.copy(this.gateC).multiplyScalar(0.3 + 0.7 * this.b[2]);
    this.lGate.target = f === 0 && !this.st.dim && t > 1.0 ? 1 : 0;
    this.lStart.target = this.lDest.target = t > 0.4 && !this.st.dim ? 1 : 0;
  }
}
