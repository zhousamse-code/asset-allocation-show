import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* ---------- math ---------- */
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
export const seg = (t, a, b) => clamp01((t - a) / (b - a));
export const ss = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const eOut = (t) => 1 - (1 - t) ** 3;
export const eIn = (t) => t * t * t;
export const eInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const eSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
export const eOutBack = (t, s = 1.7) => {
  const c = s + 1;
  return 1 + c * (t - 1) ** 3 + s * (t - 1) ** 2;
};
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/* Fritsch–Carlson monotone cubic: no overshoot at peaks and troughs */
export function monotone(xs, ys) {
  const n = xs.length;
  const d = new Array(n - 1);
  const m = new Array(n);
  for (let i = 0; i < n - 1; i++) d[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      m[i] = tau * a * d[i];
      m[i + 1] = tau * b * d[i];
    }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid] <= x) lo = mid;
      else hi = mid;
    }
    const h = xs[lo + 1] - xs[lo];
    const t = (x - xs[lo]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[lo] + (t3 - 2 * t2 + t) * h * m[lo] + (-2 * t3 + 3 * t2) * ys[lo + 1] + (t3 - t2) * h * m[lo + 1];
  };
}

/* ---------- palette (shared with CSS tokens) ---------- */
export const COL = {
  rmb: 0xe8483c,
  usd: 0x3fd19b,
  spx: 0x2997ff,
  spxHi: 0x8cc8ff,
  gold: 0xf2c14e,
  bond: 0x48c9c2,
  cash: 0xe6e8ec,
  risk: 0xff453a,
  ok: 0x34c759,
  ndx: 0xa98bff,
  paper: 0xefe7d6,
  white: 0xece9e2,
};
export const hdr = (hex, k) => new THREE.Color(hex).multiplyScalar(k);
export const FONT =
  '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", "Helvetica Neue", Arial, sans-serif';

/* ---------- fade-to-black for every material of a piece (one shared uniform) ---------- */
const INJ = '\n\tgl_FragColor *= vec4( vec3( uFade ), uFade );\n';
export function fadeable(mat, u) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uFade = u;
    let fs = 'uniform float uFade;\n' + sh.fragmentShader;
    if (fs.includes('#include <dithering_fragment>')) fs = fs.replace('#include <dithering_fragment>', '#include <dithering_fragment>' + INJ);
    else {
      const i = fs.lastIndexOf('}');
      fs = fs.slice(0, i) + INJ + '}';
    }
    sh.fragmentShader = fs;
  };
  mat.customProgramCacheKey = () => 'fade';
  return mat;
}

/* ---------- geometry / material helpers ---------- */
export function rbox(w, h, d, r = 0.06, segs = 3) {
  const rr = Math.max(0.002, Math.min(r, w / 2 - 0.002, h / 2 - 0.002, d / 2 - 0.002));
  return new RoundedBoxGeometry(w, h, d, segs, rr);
}
export function canvasTex(w, h, draw, { srgb = true, aniso = 8 } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}
let BLOB = null;
function blobTex() {
  if (!BLOB)
    BLOB = canvasTex(
      128,
      128,
      (g) => {
        const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        gr.addColorStop(0, 'rgba(0,0,0,0.9)');
        gr.addColorStop(0.55, 'rgba(0,0,0,0.45)');
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr;
        g.fillRect(0, 0, 128, 128);
      },
      { srgb: false },
    );
  return BLOB;
}
export function blob(piece, w, d, op = 0.75) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    piece.m(new THREE.MeshBasicMaterial({ color: 0x000000, map: blobTex(), transparent: true, opacity: op, depthWrite: false })),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.015;
  m.renderOrder = 1;
  return m;
}
export function edges(piece, geo, color = 0xffffff, op = 0.2) {
  return new THREE.LineSegments(
    new THREE.EdgesGeometry(geo, 35),
    piece.m(new THREE.LineBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false })),
  );
}
export function dashLine(piece, pts, color = 0xffffff, op = 0.5, dash = 0.22, gap = 0.16) {
  const l = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    piece.m(new THREE.LineDashedMaterial({ color, transparent: true, opacity: op, dashSize: dash, gapSize: gap, depthWrite: false })),
  );
  l.computeLineDistances();
  return l;
}
/* glowing tube that can be revealed progressively along its length */
export function progTube(pts, radius, mat, radial = 8, closed = false) {
  const curve = new THREE.CatmullRomCurve3(pts, closed, 'centripetal');
  const segs = Math.max(2, pts.length * 2);
  const geo = new THREE.TubeGeometry(curve, segs, radius, radial, closed);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.curve = curve;
  mesh.setProgress = (p) => {
    const n = Math.round(clamp01(p) * segs);
    geo.setDrawRange(0, n * radial * 6);
  };
  return mesh;
}
/* text drawn to a transparent canvas, mapped on a plane */
export function textPlane(piece, text, { w = 3, h = 0.8, px = 160, color = '#ffffff', weight = 700, glow = 0, metal = false } = {}) {
  const cw = 1024;
  const ch = Math.round((cw * h) / w);
  const tex = canvasTex(cw, ch, (g) => {
    g.clearRect(0, 0, cw, ch);
    g.fillStyle = color;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `${weight} ${px}px ${FONT}`;
    g.fillText(text, cw / 2, ch / 2 + px * 0.04);
  });
  const mat = metal
    ? new THREE.MeshStandardMaterial({ map: tex, transparent: true, metalness: 0.4, roughness: 0.45, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: glow, depthWrite: false })
    : new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: new THREE.Color(1, 1, 1).multiplyScalar(1 + glow) });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), piece.m(mat));
}

/* ---------- 3D-anchored HTML labels ---------- */
export class Labels {
  constructor(el) {
    this.el = el;
    this.list = [];
    this.v = new THREE.Vector3();
  }
  add(html, pos, cls, piece, obj) {
    const l = new Label(html, pos, cls, piece, obj);
    this.el.appendChild(l.el);
    this.list.push(l);
    return l;
  }
  update(dt, cam, W, H) {
    for (const l of this.list) l.update(dt, cam, W, H, this.v);
  }
}
class Label {
  constructor(html, pos, cls, piece, obj) {
    this.el = document.createElement('div');
    this.el.className = 'lbl ' + (cls || 'up');
    this.box = document.createElement('div');
    this.el.appendChild(this.box);
    this.html = null;
    this.set(html);
    this.pos = new THREE.Vector3(...(pos || [0, 0, 0]));
    this.piece = piece;
    this.obj = obj || null;
    this.a = 0;
    this.target = 0;
    this.on = false;
  }
  set(html) {
    if (html !== this.html) {
      this.html = html;
      this.box.innerHTML = html;
    }
  }
  update(dt, cam, W, H, v) {
    this.a = damp(this.a, this.target, this.target > this.a ? 4.2 : 7, dt);
    const alpha = this.a * (this.piece ? this.piece.fade.value : 1);
    if (alpha < 0.02) {
      if (this.on) {
        this.el.style.visibility = 'hidden';
        this.on = false;
      }
      return;
    }
    v.copy(this.pos);
    (this.obj || this.piece.inner).localToWorld(v);
    v.project(cam);
    if (v.z > 1 || v.z < -1) {
      if (this.on) {
        this.el.style.visibility = 'hidden';
        this.on = false;
      }
      return;
    }
    const x = (v.x + 1) * 0.5 * W;
    const y = (1 - v.y) * 0.5 * H;
    if (!this.on) {
      this.el.style.visibility = 'visible';
      this.on = true;
    }
    const lift = (1 - this.a) * 10;
    this.el.style.transform = `translate3d(${x.toFixed(1)}px,${(y + lift).toFixed(1)}px,0)`;
    this.el.style.opacity = alpha.toFixed(3);
  }
}

/* ---------- a "set piece": one scene element group, driven by the current beat ---------- */
export class Piece {
  constructor(app, name, origin, opts = {}) {
    this.app = app;
    this.name = name;
    this.origin = new THREE.Vector3(...origin);
    this.root = new THREE.Group();
    this.root.name = name;
    this.root.position.copy(this.origin);
    this.inner = new THREE.Group();
    this.root.add(this.inner);
    app.scene.add(this.root);
    this.fade = { value: 0 };
    this.vis = 0;
    this.visT = 0;
    this.st = {};
    this.key = null;
    this.t = 0;
    this.labels = [];
    this.spot = opts.spot || [0, 0, 9, 1];
    this.rise = opts.rise ?? 1.1;
    this.root.visible = false;
  }
  m(mat) {
    return fadeable(mat, this.fade);
  }
  add(...o) {
    this.inner.add(...o);
    return o[0];
  }
  label(html, pos, cls = 'up', obj = null) {
    const l = this.app.labels.add(html, pos, cls, this, obj);
    this.labels.push(l);
    return l;
  }
  setState(st) {
    if (!st) {
      this.visT = 0;
      return;
    }
    const key = JSON.stringify(st);
    const fresh = this.vis < 0.05;
    this.visT = 1;
    if (key !== this.key || fresh) {
      const prev = this.st;
      this.st = st;
      this.key = key;
      this.t = 0;
      this.enter(st, prev, fresh);
    }
  }
  enter() {}
  tick(dt, time) {
    this.vis = damp(this.vis, this.visT, this.visT > this.vis ? 2.2 : 3.4, dt);
    if (this.visT === 0 && this.vis < 0.004) this.vis = 0;
    const on = this.vis > 0;
    this.root.visible = on;
    const e = ss(0, 1, this.vis);
    this.fade.value = e;
    if (!on) return;
    this.inner.position.y = (1 - e) * -this.rise;
    this.t += dt;
    this.update(dt, time, this.st);
  }
  update() {}
}
