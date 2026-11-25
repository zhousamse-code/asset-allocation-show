import * as THREE from 'three';
import { Piece, rbox, COL, hdr, lerp, clamp01, seg, ss, eOut, eIn, eInOut, rng, blob, canvasTex, FONT } from '../lib.js';

/* ---------- squarified treemap ---------- */
function squarify(items, x, y, w, h) {
  const total = items.reduce((s, it) => s + it.v, 0);
  const sc = (w * h) / total;
  const list = items.map((it) => ({ ...it, a: it.v * sc })).sort((a, b) => b.a - a.a);
  const out = [];
  let rect = { x, y, w, h };
  let row = [];
  const worst = (r, side) => {
    const s = r.reduce((a, q) => a + q.a, 0);
    let mx = 0;
    let mn = Infinity;
    for (const q of r) {
      mx = Math.max(mx, q.a);
      mn = Math.min(mn, q.a);
    }
    return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn));
  };
  const lay = (r, rc) => {
    const s = r.reduce((a, q) => a + q.a, 0);
    if (rc.w >= rc.h) {
      const cw = s / rc.h;
      let yy = rc.y;
      for (const q of r) {
        const rh = q.a / cw;
        out.push({ ...q, x: rc.x, y: yy, w: cw, h: rh });
        yy += rh;
      }
      return { x: rc.x + cw, y: rc.y, w: rc.w - cw, h: rc.h };
    }
    const rh = s / rc.w;
    let xx = rc.x;
    for (const q of r) {
      const rw = q.a / rh;
      out.push({ ...q, x: xx, y: rc.y, w: rw, h: rh });
      xx += rw;
    }
    return { x: rc.x, y: rc.y + rh, w: rc.w, h: rc.h - rh };
  };
  let i = 0;
  while (i < list.length) {
    const side = Math.min(rect.w, rect.h);
    if (row.length === 0 || worst([...row, list[i]], side) <= worst(row, side)) {
      row.push(list[i]);
      i++;
    } else {
      rect = lay(row, rect);
      row = [];
    }
  }
  if (row.length) lay(row, rect);
  return out;
}

/* S&P 500 sectors: name, approx. weight, number of companies (sums to 500) */
const SPX = [
  ['科技', 0.33, 68],
  ['金融', 0.13, 72],
  ['可选消费', 0.1, 50],
  ['通信', 0.1, 23],
  ['医疗', 0.09, 60],
  ['工业', 0.08, 78],
  ['必需消费', 0.05, 37],
  ['能源', 0.03, 22],
  ['公用事业', 0.025, 31],
  ['地产', 0.02, 31],
  ['材料', 0.02, 28],
];
/* Nasdaq-100: tech-heavy (sums to 100) */
const NDX = [
  ['科技', 0.52, 40],
  ['通信', 0.15, 10],
  ['可选消费', 0.14, 14],
  ['医疗', 0.06, 13],
  ['必需消费', 0.06, 11],
  ['工业', 0.05, 10],
  ['其他', 0.02, 2],
];

export function cityLayout(sectors, W, D, seed, scaleH = 1, gap = 0.4) {
  const R = rng(seed);
  const wsum = sectors.reduce((s, q) => s + q[1], 0);
  const rects = squarify(
    sectors.map(([name, w, n], i) => ({ name, v: w / wsum, n, i })),
    -W / 2,
    -D / 2,
    W,
    D,
  );
  const towers = [];
  const labels = [];
  for (const r of rects) {
    const rx = r.x + gap / 2;
    const rz = r.y + gap / 2;
    const rw = Math.max(0.2, r.w - gap);
    const rd = Math.max(0.2, r.h - gap);
    const n = r.n;
    const cols = Math.max(1, Math.round(Math.sqrt((n * rw) / rd)));
    let rows = Math.ceil(n / cols);
    while (cols * rows < n) rows++;
    const cw = rw / cols;
    const cd = rd / rows;
    const f = Math.min(cw, cd) * 0.74;
    const sh = [];
    let sum = 0;
    for (let k = 1; k <= n; k++) {
      const s = 1 / k ** 1.15;
      sh.push(s);
      sum += s;
    }
    const cells = [...Array(cols * rows).keys()];
    for (let k = cells.length - 1; k > 0; k--) {
      const j = Math.floor(R() * (k + 1));
      [cells[k], cells[j]] = [cells[j], cells[k]];
    }
    let maxH = 0;
    for (let k = 0; k < n; k++) {
      const c = cells[k];
      const cap = (r.v * sh[k]) / sum;
      const h = (0.35 + 24 * cap ** 0.6) * scaleH;
      maxH = Math.max(maxH, h);
      towers.push({ x: rx + ((c % cols) + 0.5) * cw, z: rz + (Math.floor(c / cols) + 0.5) * cd, f, h, sector: r.i, d: 0 });
    }
    labels.push({ name: r.name, x: rx + rw / 2, z: rz + rd / 2, maxH, i: r.i, v: r.v });
  }
  for (const t of towers) t.d = Math.hypot(t.x, t.z);
  return { towers, labels };
}

/* instanced glowing towers: dark glass bodies, lit crowns, faint window bands */
export function cityMesh(piece, towers, tintFn, glowU) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, 0);
  const n = towers.length;
  const tint = new Float32Array(n * 3);
  const hh = new Float32Array(n);
  const c = new THREE.Color();
  towers.forEach((t, i) => {
    tintFn(t, c);
    tint[i * 3] = c.r;
    tint[i * 3 + 1] = c.g;
    tint[i * 3 + 2] = c.b;
    hh[i] = t.h;
  });
  geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 3));
  geo.setAttribute('aH', new THREE.InstancedBufferAttribute(hh, 1));
  const mat = new THREE.MeshStandardMaterial({ color: 0x0a111d, roughness: 0.3, metalness: 0.55, envMapIntensity: 0.8 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uFade = piece.fade;
    sh.uniforms.uGlow = glowU;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aTint;\nattribute float aH;\nvarying vec3 vTint;\nvarying float vY;\nvarying float vHH;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvTint = aTint; vY = position.y; vHH = aH;');
    sh.fragmentShader =
      'uniform float uFade;\nuniform float uGlow;\nvarying vec3 vTint;\nvarying float vY;\nvarying float vHH;\n' +
      sh.fragmentShader
        .replace(
          '#include <emissivemap_fragment>',
          '#include <emissivemap_fragment>\n\tfloat topG = pow(clamp(vY, 0.0, 1.0), 7.0);\n\tfloat win = step(0.55, fract(vY * vHH * 2.4)) * smoothstep(0.02, 0.25, vY) * 0.1;\n\ttotalEmissiveRadiance += vTint * (topG * 1.9 + win + 0.05) * uGlow;',
        )
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n\tgl_FragColor *= vec4(vec3(uFade), uFade);');
  };
  mat.customProgramCacheKey = () => 'city';
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  return mesh;
}

/* ================= 4.1 – 4.3  S&P 500 "city", money streams, Nasdaq comparison ================= */
export class City extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [6, 0, 22, 1.0] });
    this.glow = { value: 1 };
    const s = cityLayout(SPX, 26, 18, 3);
    this.spx = s;
    const hues = [208, 196, 222, 186, 232, 214, 200, 190, 226, 218, 204];
    this.spxMesh = cityMesh(this, s.towers, (t, c) => c.setHSL(hues[t.sector] / 360, 0.85, t.sector === 0 ? 0.6 : 0.5, THREE.SRGBColorSpace), this.glow);
    this.add(this.spxMesh);
    const plot = new THREE.Mesh(rbox(27.2, 0.12, 19.2, 0.05), this.m(new THREE.MeshStandardMaterial({ color: 0x0c0d11, metalness: 0.6, roughness: 0.5 })));
    plot.position.y = 0.06;
    this.add(plot);

    const q = cityLayout(NDX, 12, 11, 9, 1.0);
    this.ndx = q;
    this.ndxG = new THREE.Group();
    this.ndxG.position.set(26, 0, 1.5);
    this.add(this.ndxG);
    const vh = [272, 286, 262, 296, 280, 266, 290];
    this.ndxMesh = cityMesh(this, q.towers, (t, c) => c.setHSL(vh[t.sector] / 360, 0.75, t.sector === 0 ? 0.64 : 0.52, THREE.SRGBColorSpace), this.glow);
    this.ndxG.add(this.ndxMesh);
    const plot2 = new THREE.Mesh(rbox(13.2, 0.12, 12.2, 0.05), this.m(new THREE.MeshStandardMaterial({ color: 0x0c0d11, metalness: 0.6, roughness: 0.5 })));
    plot2.position.y = 0.06;
    this.ndxG.add(plot2);

    // money streams pouring into the reservoir
    this.NS = 12;
    this.NPS = 40;
    const NP = this.NS * this.NPS;
    const pg = new THREE.BufferGeometry();
    this.sp = new Float32Array(NP * 3);
    this.sa = new Float32Array(NP);
    pg.setAttribute('position', new THREE.BufferAttribute(this.sp, 3));
    pg.setAttribute('aA', new THREE.BufferAttribute(this.sa, 1));
    this.streamMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uFade: this.fade, uOn: { value: 0 }, uPx: { value: 1 } },
      vertexShader:
        'attribute float aA; varying float vA; uniform float uPx; void main(){ vA = aA; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uPx * 150.0 / max(1.0, -mv.z); }',
      fragmentShader:
        'uniform float uFade; uniform float uOn; varying float vA; void main(){ float r = length(gl_PointCoord - 0.5); float a = (1.0 - smoothstep(0.05, 0.5, r)) * vA * uFade * uOn; gl_FragColor = vec4(vec3(1.0, 0.84, 0.5) * a * 1.6, a); }',
    });
    this.streams = new THREE.Points(pg, this.streamMat);
    this.streams.frustumCulled = false;
    this.add(this.streams);
    const R = rng(4);
    this.curves = Array.from({ length: this.NS }, (_, i) => {
      const a = (i / this.NS) * Math.PI * 2 + R() * 0.3;
      const p0 = new THREE.Vector3(Math.cos(a) * 46, 12 + R() * 10, Math.sin(a) * 38);
      const p3 = new THREE.Vector3((R() - 0.5) * 6, 3, (R() - 0.5) * 4);
      const p1 = p0.clone().multiplyScalar(0.55).setY(p0.y + 4);
      const p2 = p3.clone().setY(13);
      return { p0, p1, p2, p3, sp: 0.07 + R() * 0.05 };
    });

    this.M = new THREE.Matrix4();
    this.lSec = s.labels
      .filter((l) => ['科技', '金融', '医疗', '可选消费', '通信', '工业'].includes(l.name))
      .map((l) => this.label(`<span class="t">${l.name}</span>`, [l.x, l.maxH + 0.45, l.z]));
    this.lSpx = this.label('<span class="t blue">标普 500</span><span class="c">11 个行业 · 500 家公司</span>', [0, 0, 10.2], 'down');
    this.lNdx = this.label('<span class="t violet">纳斯达克 100</span><span class="c">科技股占一半以上</span>', [0, 0, 6.6], 'down', this.ndxG);
    this.lQs = this.label('', [0, 0, 0]);
    this.lQn = this.label('', [0, 0, 0], 'up', this.ndxG);
    this.spxTop = Math.max(...s.towers.map((t) => t.h));
    this.ndxTop = Math.max(...q.towers.map((t) => t.h));
    this.ndxV = 0;
  }
  enter(st, prev, fresh) {
    if (fresh) this.ndxV = 0;
  }
  setTowers(mesh, towers, grow, drop, jitter, t, time) {
    const M = this.M;
    for (let i = 0; i < towers.length; i++) {
      const tw = towers[i];
      const k = eOut(seg(grow, 0.1 + tw.d / 26, 1.1 + tw.d / 26));
      const h = Math.max(0.001, tw.h * k * (1 - drop * (0.85 + 0.3 * ((i * 0.618) % 1))));
      const jx = jitter ? Math.sin(time * 37 + i) * jitter : 0;
      const jz = jitter ? Math.cos(time * 41 + i * 1.7) * jitter : 0;
      M.makeScale(tw.f, h, tw.f).setPosition(tw.x + jx, 0.12, tw.z + jz);
      mesh.setMatrixAt(i, M);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  update(dt, time) {
    const t = this.t;
    const step = this.st.step;
    const vs = step === 'vs';
    // quake loop for the comparison
    let qs = 0;
    let qn = 0;
    let jit = 0;
    if (vs) {
      const ph = (t - 1.6) % 9;
      if (t > 1.6) {
        const d = eIn(seg(ph, 0, 0.6));
        const r = eInOut(seg(ph, 4.4, 6.2));
        const k = d * (1 - r);
        qs = 0.16 * k;
        qn = 0.3 * k;
        jit = ph < 0.9 ? 0.05 * (1 - ph / 0.9) : 0;
        if (ph < 0.05 && !this.shook) {
          this.shook = true;
          this.app.shake = 0.5;
        }
        if (ph > 1) this.shook = false;
      }
    }
    this.setTowers(this.spxMesh, this.spx.towers, step === 'rise' ? t : 99, qs, jit, t, time);
    this.ndxV = lerp(this.ndxV, vs ? 1 : 0, 1 - Math.exp(-3 * dt));
    this.ndxG.visible = this.ndxV > 0.01;
    if (this.ndxG.visible) this.setTowers(this.ndxMesh, this.ndx.towers, vs ? t * 1.2 : 99, qn, jit * 1.6, t, time);
    this.ndxG.position.y = (1 - this.ndxV) * -2;

    // streams
    const on = step === 'vs' ? 0 : ss(0.6, 2.0, t);
    const u = this.streamMat.uniforms;
    u.uOn.value = lerp(u.uOn.value, on, 1 - Math.exp(-3 * dt));
    u.uPx.value = this.app.px;
    if (u.uOn.value > 0.01) {
      let o = 0;
      for (const c of this.curves) {
        for (let j = 0; j < this.NPS; j++) {
          const s = (time * c.sp + j / this.NPS) % 1;
          const a = 1 - s;
          const p0 = a * a * a;
          const p1 = 3 * a * a * s;
          const p2 = 3 * a * s * s;
          const p3 = s * s * s;
          this.sp[o * 3] = p0 * c.p0.x + p1 * c.p1.x + p2 * c.p2.x + p3 * c.p3.x;
          this.sp[o * 3 + 1] = p0 * c.p0.y + p1 * c.p1.y + p2 * c.p2.y + p3 * c.p3.y;
          this.sp[o * 3 + 2] = p0 * c.p0.z + p1 * c.p1.z + p2 * c.p2.z + p3 * c.p3.z;
          this.sa[o] = Math.sin(Math.PI * s) * (0.5 + 0.5 * ((j * 0.37) % 1));
          o++;
        }
      }
      this.streams.geometry.attributes.position.needsUpdate = true;
      this.streams.geometry.attributes.aA.needsUpdate = true;
    }
    this.glow.value = step === 'aerial' ? 1.25 : 1;

    for (const l of this.lSec) l.target = step === 'rise' && t > 2.2 ? 1 : 0;
    this.lSpx.target = vs && t > 0.9 ? 1 : 0;
    this.lNdx.target = vs && t > 0.9 ? 1 : 0;
    this.lQs.pos.set(0, this.spxTop + 1.2, 0);
    this.lQn.pos.set(0, this.ndxTop + 1.2, 0);
    this.lQs.set('<span class="c">今年 10–11 月最多跌了</span><span class="v blue">−12%</span><span class="c">2000 年泡沫：最深 −49%，7 年回本</span>');
    this.lQn.set('<span class="c">今年 10–11 月最多跌了</span><span class="v violet">−20%</span><span class="c">2000 年泡沫：最深 −83%，15 年才回本</span>');
    const showQ = vs && t > 1.9 ? 1 : 0;
    this.lQs.target = this.lQn.target = showQ;
  }
}

/* ================= 4.4  Gold ================= */
export function goldBarGeo() {
  const g = rbox(2.3, 0.62, 1.05, 0.07, 3);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = (p.getY(i) + 0.31) / 0.62;
    p.setX(i, p.getX(i) * lerp(1, 0.85, k));
    p.setZ(i, p.getZ(i) * lerp(1, 0.78, k));
  }
  g.computeVertexNormals();
  return g;
}
export function stampTex() {
  return canvasTex(512, 200, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `700 78px ${FONT}`;
    g.fillText('AU 999.9', w / 2, 82);
    g.font = `600 30px ${FONT}`;
    g.fillText('FINE GOLD · 1000 g', w / 2, 150);
  });
}

export class Gold extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [1.5, 0, 9, 1.15] });
    const geo = goldBarGeo();
    const mat = this.m(new THREE.MeshPhysicalMaterial({ color: 0xffd27a, metalness: 1, roughness: 0.22, clearcoat: 0.3, clearcoatRoughness: 0.2, envMapIntensity: 1.6 }));
    const stampMat = this.m(new THREE.MeshStandardMaterial({ map: stampTex(), transparent: true, metalness: 1, roughness: 0.55, color: 0x6e4e18, envMapIntensity: 0.6, depthWrite: false }));
    const spots = [
      [0, 0.31, -1.12, 0],
      [0, 0.31, 0, 0],
      [0, 0.31, 1.12, 0],
      [-0.62, 0.93, 0, 1],
      [0.62, 0.93, 0, 1],
      [0, 1.55, 0, 0],
    ];
    this.bars = spots.map(([x, y, z, rot], i) => {
      const g = new THREE.Group();
      g.rotation.y = rot ? Math.PI / 2 : 0;
      const m = new THREE.Mesh(geo, mat);
      g.add(m);
      const s = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.6), stampMat);
      s.rotation.x = -Math.PI / 2;
      s.position.y = 0.313;
      g.add(s);
      this.add(g);
      return { g, x, y, z, i };
    });
    this.add(blob(this, 7, 6, 0.85));

    // 2008 mini comparison
    this.mini = new THREE.Group();
    this.mini.position.set(4.6, 0, 0.6);
    this.add(this.mini);
    const base = 2.4;
    const ln = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.02, 0.02), this.m(new THREE.MeshBasicMaterial({ color: hdr(0xffffff, 0.8) })));
    ln.position.y = base;
    this.mini.add(ln);
    const bg = new THREE.BoxGeometry(0.9, 1, 0.9);
    this.sBar = new THREE.Mesh(bg, this.m(new THREE.MeshStandardMaterial({ color: COL.spx, emissive: COL.spx, emissiveIntensity: 0.5, roughness: 0.3 })));
    this.gBar = new THREE.Mesh(bg, this.m(new THREE.MeshStandardMaterial({ color: COL.gold, emissive: COL.gold, emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.3 })));
    this.sBar.position.x = -0.7;
    this.gBar.position.x = 0.7;
    this.mini.add(this.sBar, this.gBar);
    this.base = base;
    this.lYear = this.label('<span class="t">2008 年金融危机</span>', [0, base + 1.15, 0], 'up', this.mini);
    this.lS = this.label('<span class="v blue">−37%</span><span class="c">标普 500</span>', [-0.7, 0, 0.5], 'down', this.mini);
    this.lG = this.label('<span class="v gold">+4%</span><span class="c">黄金</span>', [0.7, base + 0.5, 0.5], 'up', this.mini);
    this.lT0 = this.label('<span class="pill">国内黄金 ETF · T+0：当天买，当天就能卖</span>', [0, 0, 2.2], 'down');
  }
  update(dt, time) {
    const t = this.t;
    for (const b of this.bars) {
      const k = seg(t, 0.3 + b.i * 0.24, 0.85 + b.i * 0.24);
      const f = k < 0.85 ? (k / 0.85) ** 2 : 1;
      let y = lerp(b.y + 7, b.y, f);
      if (k >= 0.85) {
        const q = (k - 0.85) / 0.15;
        y += Math.sin(q * Math.PI) * 0.05 * (1 - q);
      }
      b.g.position.set(b.x, y, b.z);
      b.g.visible = k > 0;
    }
    this.inner.rotation.y = Math.sin(time * 0.18) * 0.12;
    const kS = eOut(seg(t, 2.2, 3.0));
    const kG = eOut(seg(t, 2.6, 3.2));
    const hS = 0.37 * 4 * kS;
    const hG = 0.3 * kG;
    this.sBar.scale.y = Math.max(0.001, hS);
    this.sBar.position.y = this.base - hS / 2;
    this.gBar.scale.y = Math.max(0.001, hG);
    this.gBar.position.y = this.base + hG / 2;
    this.lS.pos.y = this.base - hS - 0.1;
    this.lYear.target = t > 2.0 ? 1 : 0;
    this.lS.target = kS > 0.9 ? 1 : 0;
    this.lG.target = kG > 0.9 ? 1 : 0;
    this.lT0.target = t > 1.8 ? 1 : 0;
  }
}
