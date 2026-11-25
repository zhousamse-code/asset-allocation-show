import * as THREE from 'three';
import { Piece, rbox, COL, hdr, lerp, clamp, seg, ss, eOut, eInOut, blob, edges, dashLine, progTube, monotone } from '../lib.js';

/* USD/CNY, approximate key points 2015 – Nov 2026 (schematic, anchored on widely reported levels) */
const FX = [
  [2015.0, 6.21], [2015.55, 6.21], [2015.63, 6.39], [2015.99, 6.49], [2016.5, 6.65], [2016.98, 6.95],
  [2017.5, 6.78], [2017.99, 6.51], [2018.25, 6.29], [2018.6, 6.83], [2018.85, 6.96], [2019.3, 6.72],
  [2019.68, 7.15], [2019.99, 6.97], [2020.4, 7.12], [2020.95, 6.53], [2021.5, 6.47], [2021.99, 6.37],
  [2022.2, 6.33], [2022.55, 6.71], [2022.83, 7.3], [2023.05, 6.72], [2023.7, 7.3], [2023.99, 7.1],
  [2024.5, 7.27], [2024.72, 7.02], [2025.0, 7.3], [2025.27, 7.35], [2025.6, 7.17], [2025.9, 7.1], [2025.99, 6.99], [2026.9, 6.66],
];
const FX_T0 = 2015.0;
const FX_T1 = 2026.9;
const fxAt = monotone(
  FX.map((p) => p[0]),
  FX.map((p) => p[1]),
);

function makeFigure(piece, color) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const mat = piece.m(new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.06 }));
  const leg = new THREE.CapsuleGeometry(0.15, 0.78, 4, 10);
  const l1 = new THREE.Mesh(leg, mat);
  l1.position.set(0, 0.55, 0.16);
  const l2 = l1.clone();
  l2.position.z = -0.16;
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.7, 6, 14), mat);
  torso.position.y = 1.5;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 16), mat);
  head.position.y = 2.36;
  const armGeo = new THREE.CapsuleGeometry(0.095, 0.62, 4, 8);
  armGeo.translate(0, -0.41, 0);
  const sh = [0.31, -0.31].map((z) => {
    const s = new THREE.Group();
    s.position.set(0, 1.95, z);
    s.add(new THREE.Mesh(armGeo, mat));
    body.add(s);
    return s;
  });
  body.add(l1, l2, torso, head);
  return { g, body, sh };
}

/* ---------- 2.1 / 2.2  Tug of war over the RMB exchange rate ---------- */
export class Tug extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [0, 0, 14, 1.0] });
    this.ropeG = new THREE.Group();
    this.add(this.ropeG);
    const rope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 22, 12),
      this.m(new THREE.MeshStandardMaterial({ color: 0x8c7d63, roughness: 0.9 })),
    );
    rope.rotation.z = Math.PI / 2;
    rope.position.y = 1.5;
    this.ropeG.add(rope);
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.95).translate(0, -0.48, 0),
      this.m(new THREE.MeshBasicMaterial({ color: hdr(COL.risk, 1.6), side: THREE.DoubleSide })),
    );
    flag.position.y = 1.5;
    this.flag = flag;
    this.ropeG.add(flag);

    this.figs = [];
    [-1, 1].forEach((side) => {
      for (let k = 0; k < 3; k++) {
        const f = makeFigure(this, side < 0 ? 0xe2574a : 0x3fbf8f);
        f.side = side;
        f.k = k;
        f.z = k % 2 ? 0.22 : -0.22;
        this.add(f.g);
        this.figs.push(f);
      }
    });
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 6), this.m(new THREE.MeshBasicMaterial({ color: hdr(0xffffff, 1.1) })));
    line.position.y = 0.01;
    this.add(line);
    this.add(blob(this, 26, 7, 0.75));

    // chart behind
    this.chart = new THREE.Group();
    this.chart.position.set(0, 0, -4.6);
    this.add(this.chart);
    const X = (yr) => -10.5 + ((yr - FX_T0) / (FX_T1 - FX_T0)) * 21;
    const Y = (r) => 3.6 + ((r - 6.1) / 1.4) * 5.6;
    this.X = X;
    this.Y = Y;
    const band = new THREE.Mesh(
      new THREE.PlaneGeometry(21.6, Y(7.3) - Y(6.3)),
      this.m(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.045, depthWrite: false })),
    );
    band.position.set(0, (Y(7.3) + Y(6.3)) / 2, -0.02);
    this.chart.add(band);
    this.chart.add(dashLine(this, [new THREE.Vector3(-10.8, Y(7.3), 0), new THREE.Vector3(10.8, Y(7.3), 0)], 0xffffff, 0.4));
    this.chart.add(dashLine(this, [new THREE.Vector3(-10.8, Y(6.3), 0), new THREE.Vector3(10.8, Y(6.3), 0)], 0xffffff, 0.4));
    const pts = [];
    for (let i = 0; i <= 240; i++) {
      const yr = FX_T0 + ((FX_T1 - FX_T0) * i) / 240;
      pts.push(new THREE.Vector3(X(yr), Y(fxAt(yr)), 0));
    }
    this.series = progTube(pts, 0.06, this.m(new THREE.MeshBasicMaterial({ color: hdr(0xdfe9ff, 1.7) })), 8);
    this.chart.add(this.series);
    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), this.m(new THREE.MeshBasicMaterial({ color: hdr(COL.risk, 2.2) })));
    this.chart.add(this.head);
    this.lAx = [
      this.label('<span class="c">7.3</span>', [-11.1, Y(7.3), 0], 'left', this.chart),
      this.label('<span class="c">6.3</span>', [-11.1, Y(6.3), 0], 'left', this.chart),
      this.label('<span class="t">美元兑人民币</span><span class="c">2015 – 2026 年（示意）</span>', [-10.6, Y(7.6) + 0.4, 0], 'right', this.chart),
    ];
    this.lYears = [2015, 2018, 2021, 2024, 2026].map((y) => this.label(`<span class="c">${y}</span>`, [X(y + 0.0), 3.15, 0], 'down', this.chart));
    this.lHead = this.label('', [0, 0, 0], 'up', this.chart);
    this.lPeak = this.label('<span class="c">2025 年 4 月</span><span class="t">约 7.35</span>', [X(2025.27), Y(7.35) + 0.35, 0], 'up', this.chart);

    this.lL = this.label('', [0, 3.1, 0], 'up', this.figs[1].g);
    this.lR = this.label('', [0, 3.1, 0], 'up', this.figs[4].g);
    this.zoneL = this.label('<span class="c">← 人民币升值</span>', [-6, 0, 2.6], 'down');
    this.zoneR = this.label('<span class="c">人民币贬值 →</span>', [6, 0, 2.6], 'down');
    this.m0 = 0;
    this.prevM = 0;
    this.tmp = new THREE.Vector3();
    this.down = new THREE.Vector3(0, -1, 0);
  }
  update(dt, time) {
    const t = this.t;
    const chart = this.st.step === 'chart';
    let m;
    let rate = 6.82;
    if (!chart) {
      m = 1.1 * Math.sin(0.75 * t) + 0.45 * Math.sin(1.9 * t + 1.2);
    } else {
      const p = eInOut(seg(t, 0.9, 8.2));
      const pt = this.series.curve.getPointAt(Math.max(0.0001, p));
      rate = 6.1 + ((pt.y - 3.6) / 5.6) * 1.4;
      m = (rate - 6.82) * 5.0 + 0.12 * Math.sin(time * 2.3);
      this.series.setProgress(p);
      this.head.position.copy(pt);
      const yr = FX_T0 + p * (FX_T1 - FX_T0);
      this.lHead.pos.copy(pt).setY(pt.y + 0.3);
      this.lHead.set(`<span class="v">${rate.toFixed(2)}</span><span class="c">${Math.floor(yr)} 年</span>`);
      this.lHead.target = t > 1.0 ? 1 : 0;
      this.lPeak.target = p > 0.88 ? 1 : 0;
    }
    if (!chart) {
      this.lHead.target = 0;
      this.lPeak.target = 0;
    }
    this.chart.visible = chart || this.chartVis > 0.01;
    this.chartVis = lerp(this.chartVis || 0, chart ? 1 : 0, 1 - Math.exp(-3 * dt));
    this.chart.position.y = (1 - this.chartVis) * -10;
    for (const l of this.lAx) l.target = chart && t > 0.6 ? 1 : 0;
    for (const l of this.lYears) l.target = chart && t > 0.6 ? 1 : 0;

    const vel = (m - this.prevM) / Math.max(dt, 1e-3);
    this.prevM = m;
    this.ropeG.position.x = m;
    this.flag.rotation.z = clamp(-vel * 0.08, -0.4, 0.4);
    for (const f of this.figs) {
      const x = m + f.side * (3.4 + f.k * 1.9);
      f.g.position.set(x, Math.abs(Math.sin(time * 3 + f.k)) * 0.02, f.z);
      const win = f.side < 0 ? -vel : vel;
      const lean = 0.36 + clamp(win * 0.05, -0.08, 0.1) + Math.sin(time * 2.2 + f.k) * 0.02;
      f.body.rotation.z = f.side < 0 ? lean : -lean;
      f.g.rotation.y = 0;
      f.g.updateWorldMatrix(true, true);
      for (const s of f.sh) {
        const hand = this.tmp.set(x - f.side * 0.15, 1.5, f.z + (s.position.z > 0 ? 0.12 : -0.12));
        this.inner.localToWorld(hand);
        s.parent.worldToLocal(hand);
        hand.sub(s.position).normalize();
        s.quaternion.setFromUnitVectors(this.down, hand);
      }
    }
    this.lL.set(
      chart
        ? '<span class="t red">往上拉</span>'
        : '<span class="t red">往上拉 · 人民币升值</span><span class="c">出口企业把赚的美元换回人民币，发工资、付货款</span>',
    );
    this.lR.set(
      chart ? '<span class="t green">往下拽</span>' : '<span class="t green">往下拽 · 人民币贬值</span><span class="c">美元利息高，国家也想保出口</span>',
    );
    this.lL.target = this.lR.target = !chart && t > 0.9 ? 1 : 0;
    this.zoneL.target = this.zoneR.target = t > 1.3 && !chart ? 1 : 0;
  }
}

/* ---------- 2.4 / 5.2  FX wobble (±5%) vs. compounding at 7%/yr (schematic) ---------- */
export class Compound extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [0, 0, 12, 0.9] });
    const X = (yr) => -9 + yr * 1.2;
    const Y = (v) => 1.2 + (v - 0.9) * 3.4;
    const band = new THREE.Mesh(
      new THREE.PlaneGeometry(18.4, Y(1.05) - Y(0.95)),
      this.m(new THREE.MeshBasicMaterial({ color: hdr(COL.rmb, 0.9), transparent: true, opacity: 0.16, depthWrite: false })),
    );
    band.position.set(0, (Y(1.05) + Y(0.95)) / 2, -0.05);
    this.add(band);
    this.band = band;
    const wave = [];
    const curve = [];
    for (let i = 0; i <= 200; i++) {
      const yr = (15 * i) / 200;
      const v = 1 + 0.033 * Math.sin((2 * Math.PI * yr) / 2.6) + 0.013 * Math.sin((2 * Math.PI * yr) / 1.05 + 0.7);
      wave.push(new THREE.Vector3(X(yr), Y(v), 0));
      curve.push(new THREE.Vector3(X(yr), Y(1.07 ** yr), 0.05));
    }
    this.wave = progTube(wave, 0.06, this.m(new THREE.MeshBasicMaterial({ color: hdr(0xff8a6a, 1.8) })), 8);
    this.curve = progTube(curve, 0.08, this.m(new THREE.MeshBasicMaterial({ color: hdr(COL.spx, 2.2) })), 10);
    this.add(this.wave);
    this.add(this.curve);
    // area under the compounding curve
    const pos = [];
    const al = [];
    for (let i = 0; i <= 200; i++) {
      const yr = (15 * i) / 200;
      pos.push(X(yr), Y(1.0), 0, X(yr), Y(1.07 ** yr), 0);
      al.push(0, 1);
    }
    const idx = [];
    for (let i = 0; i < 200; i++) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const ag = new THREE.BufferGeometry();
    ag.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    ag.setAttribute('aA', new THREE.Float32BufferAttribute(al, 1));
    ag.setIndex(idx);
    this.areaMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uFade: this.fade, uP: { value: 0 }, uC: { value: new THREE.Color(COL.spx) } },
      vertexShader: 'attribute float aA; varying float vA; varying float vX; void main(){ vA = aA; vX = position.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader:
        'uniform float uFade; uniform float uP; uniform vec3 uC; varying float vA; varying float vX; void main(){ float on = step(vX, -9.0 + uP * 18.0); float a = pow(clamp(vA, 0.0, 1.0), 1.6) * 0.32 * on * uFade; gl_FragColor = vec4(uC, a); }',
    });
    this.area = new THREE.Mesh(ag, this.areaMat);
    this.add(this.area);
    this.add(dashLine(this, [new THREE.Vector3(-9.3, Y(1), -0.02), new THREE.Vector3(9.3, Y(1), -0.02)], 0xffffff, 0.3));
    this.lWave = this.label('<span class="t">汇率：上下几个点来回晃</span><span class="c">大约 ±5% 的范围</span>', [X(2.2), Y(0.95) - 0.1, 0], 'down');
    this.l10 = this.label('<span class="v blue">≈ 2 倍</span><span class="c">第 10 年</span>', [X(10), Y(1.07 ** 10) + 0.25, 0]);
    this.l15 = this.label('<span class="v blue">≈ 2.8 倍</span><span class="c">第 15 年</span>', [X(15), Y(1.07 ** 15) + 0.25, 0]);
    this.lNote = this.label('<span class="c">示意：好资产按年化 7% 复利计算</span>', [X(5.5), Y(1.07 ** 5.5) + 0.55, 0], 'up');
    this.lTicks = [0, 5, 10, 15].map((y) => this.label(`<span class="c">${y === 0 ? '现在' : '第 ' + y + ' 年'}</span>`, [X(y), 0.55, 0], 'down'));
  }
  update() {
    const t = this.t;
    const pw = eInOut(seg(t, 0.4, 1.9));
    const pc = eInOut(seg(t, 1.6, 4.4));
    this.wave.setProgress(pw);
    this.curve.setProgress(pc);
    this.areaMat.uniforms.uP.value = pc;
    this.band.scale.x = Math.max(0.001, ss(0.2, 0.9, t));
    this.lWave.target = pw > 0.8 ? 1 : 0;
    this.l10.target = pc > 0.66 ? 1 : 0;
    this.l15.target = pc > 0.98 ? 1 : 0;
    this.lNote.target = pc > 0.4 ? 1 : 0;
    for (const l of this.lTicks) l.target = t > 0.5 ? 1 : 0;
  }
}
