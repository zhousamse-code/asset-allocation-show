import * as THREE from 'three';
import { Piece, COL, hdr, damp, clamp, blob } from '../lib.js';
import { SPX_M, SPX_ASOF } from './spxdata.js';

/* ================= 2.x  "Work it out yourself": pick a start year, lump sum or one payment a year, and a total =================
   Shows what the money is worth today and when it was hardest to hold.
   Data: monthly S&P 500 total return (dividends reinvested, in USD; see spxdata.js). Exchange rate and fund
   fees are not included, the page says so.

   How it is counted
   - A payment "at the start of year Y" buys at the last close of year Y-1.
   - 每年投一笔: the total is split evenly over one payment at the start of every year from Y to this year.
   - "Hardest moment": the largest fall below the account's earlier high. Money paid in later is added to that
     high, so new payments do not hide a fall. For a lump sum this is the ordinary peak-to-trough fall.
     The month's lowest daily close is used for the low, its highest close for the high.
   - 平均每年: the yearly rate at which all payments together would have grown to today's value. */
const NM = SPX_M.length / 3; // months; index 0 = Dec 1927
const E = (i) => SPX_M[i * 3];
const LO = (i) => SPX_M[i * 3 + 1];
const HI = (i) => SPX_M[i * 3 + 2];
export const Y_MIN = 1928;
export const Y_MAX = SPX_ASOF[0] - 1;
const T_END = NM - 2 + SPX_ASOF[2] / 30; // "today" on the month-end axis (the last month is still running)
const ymOf = (i) => [Y_MIN + Math.floor((i - 1) / 12), ((i - 1) % 12) + 1];

export function simulate(y0, mode, total) {
  const s = (y0 - Y_MIN) * 12; // index of the buy point: the December close before the start year
  const nPay = mode === 'year' ? SPX_ASOF[0] - y0 + 1 : 1;
  const per = total / nPay;
  const n = NM - 1 - s;
  const val = new Float64Array(n + 1);
  const inv = new Float64Array(n + 1);
  const top = new Float64Array(n + 1); // the month's high, before any payment made at its close
  const invB = new Float64Array(n + 1);
  const flows = [];
  let units = 0;
  let invested = 0;
  let hw = 0;
  let worst = { dd: 0, j: 0, i: s, v: per, hw: per, inv: per };
  for (let i = s; i < NM; i++) {
    const j = i - s;
    if (j > 0) {
      const lo = units * LO(i);
      top[j] = units * HI(i);
      invB[j] = invested;
      const dd = 1 - lo / hw;
      if (dd > worst.dd) worst = { dd, j, i, v: lo, hw, inv: invested };
      if (top[j] > hw) hw = top[j];
    }
    if (j === 0 || (mode === 'year' && i % 12 === 0 && flows.length < nPay)) {
      units += per / E(i);
      invested += per;
      hw += per;
      flows.push(i);
    }
    val[j] = units * E(i);
    inv[j] = invested;
  }
  // when the account was back at that earlier high (plus whatever was paid in since)
  let rec = -1;
  for (let j = worst.j + 1; j <= n; j++) {
    if (top[j] >= worst.hw + (invB[j] - worst.inv)) {
      rec = j;
      break;
    }
  }
  const now = val[n];
  // yearly rate that turns all the payments into today's value
  const f = (r) => flows.reduce((a, i) => a + per * (1 + r) ** ((T_END - i) / 12), 0) - now;
  let a = -0.95;
  let b = 1.5;
  for (let k = 0; k < 60; k++) {
    const m = (a + b) / 2;
    if (f(m) > 0) b = m;
    else a = m;
  }
  return { s, n, nPay, per, val, inv, now, total, rate: (a + b) / 2, worst, rec, when: ymOf(worst.i), recMonths: rec < 0 ? -1 : rec - worst.j };
}

const sep = (x) => Math.round(x).toLocaleString('en-US');
export function wan(v) {
  if (v >= 99999.5) return `${v >= 9999950 ? sep(v / 10000) : (v / 10000).toFixed(v >= 999950 ? 1 : 2)} 亿`;
  return `${v < 9.95 ? v.toFixed(1) : sep(v)} 万`;
}
const span = (m) => (m < 12 ? `${m} 个月` : m % 12 === 0 ? `${m / 12} 年` : `${Math.floor(m / 12)} 年 ${m % 12} 个月`);

const M = 320; // chart samples
const X0 = -6;
const CW = 12;
const Y0 = 0.5;
const CH = 9;
const LW = 0.075;
const HARD = [1929, 1973, 2000, 2008];

export class Calc extends Piece {
  constructor(app, name, origin) {
    super(app, name, origin, { spot: [1.2, 0, 14, 0.95] });
    this.p = { year: 2000, mode: 'lump', total: 200 };
    this.cur = new Float32Array(M + 1);
    this.tgt = new Float32Array(M + 1);
    this.curI = new Float32Array(M + 1);
    this.tgtI = new Float32Array(M + 1);
    this.mk = { wx: 0, wy: 0, hy: 0, ey: 0, iy: 0 }; // marker positions (chart units), eased
    this.mkT = { ...this.mk };

    // value curve: a ribbon in the chart plane, and the area under it
    const lp = new Float32Array((M + 1) * 6);
    const lidx = [];
    for (let k = 0; k < M; k++) {
      const a = k * 2;
      lidx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    this.lineGeo = new THREE.BufferGeometry();
    this.lineGeo.setAttribute('position', new THREE.BufferAttribute(lp, 3).setUsage(THREE.DynamicDrawUsage));
    this.lineGeo.setIndex(lidx);
    const line = new THREE.Mesh(this.lineGeo, this.m(new THREE.MeshBasicMaterial({ color: hdr(0xa9d4ff, 1.35), side: THREE.DoubleSide })));
    line.frustumCulled = false;
    line.position.z = 0.02;
    this.add(line);
    const ap = new Float32Array((M + 1) * 6);
    const at = new Float32Array((M + 1) * 2);
    for (let k = 0; k <= M; k++) at[k * 2 + 1] = 1;
    this.areaGeo = new THREE.BufferGeometry();
    this.areaGeo.setAttribute('position', new THREE.BufferAttribute(ap, 3).setUsage(THREE.DynamicDrawUsage));
    this.areaGeo.setAttribute('aT', new THREE.BufferAttribute(at, 1));
    this.areaGeo.setIndex(lidx);
    const area = new THREE.Mesh(
      this.areaGeo,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: { uFade: this.fade, uH: { value: CH } },
        vertexShader: 'attribute float aT; varying float vT; varying float vY; void main(){ vT = aT; vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: /* glsl */ `
          uniform float uFade; uniform float uH;
          varying float vT; varying float vY;
          void main(){
            float h = clamp((vY - ${Y0.toFixed(2)}) / uH, 0.0, 1.0);
            float a = (0.10 + 0.34 * h) * uFade;
            gl_FragColor = vec4(vec3(0.16, 0.59, 1.0), a);
          }`,
      }),
    );
    area.frustumCulled = false;
    this.add(area);
    // money paid in so far: a dashed line
    const ip = new Float32Array((M + 1) * 3);
    this.invGeo = new THREE.BufferGeometry();
    this.invGeo.setAttribute('position', new THREE.BufferAttribute(ip, 3).setUsage(THREE.DynamicDrawUsage));
    // filled by hand in rebuild(): Line.computeLineDistances() would allocate a new attribute on every frame
    this.invGeo.setAttribute('lineDistance', new THREE.BufferAttribute(new Float32Array(M + 1), 1).setUsage(THREE.DynamicDrawUsage));
    this.invLine = new THREE.Line(this.invGeo, this.m(new THREE.LineDashedMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, dashSize: 0.2, gapSize: 0.14, depthWrite: false })));
    this.invLine.frustumCulled = false;
    this.invLine.position.z = 0.04;
    this.add(this.invLine);

    const axis = new THREE.Mesh(new THREE.BoxGeometry(CW + 0.3, 0.04, 0.04), this.m(new THREE.MeshBasicMaterial({ color: hdr(0xdfe9ff, 0.9) })));
    axis.position.set(X0 + CW / 2, Y0, 0);
    this.add(axis);
    const gm = this.m(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.13, depthWrite: false }));
    this.grid = Array.from({ length: 5 }, () => {
      const g = new THREE.Mesh(new THREE.BoxGeometry(CW, 0.02, 0.02), gm);
      g.position.set(X0 + CW / 2, Y0, -0.03);
      this.add(g);
      return { g, y: 0, yT: 0, lab: this.label('', [X0 - 0.25, Y0, 0], 'left') };
    });
    this.ticks = Array.from({ length: 9 }, () => this.label('', [X0, Y0 - 0.12, 0], 'down'));

    this.dotW = new THREE.Mesh(new THREE.SphereGeometry(0.19, 20, 14), this.m(new THREE.MeshBasicMaterial({ color: hdr(COL.risk, 2.0) })));
    this.add(this.dotW);
    this.drop = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1, 0.05), this.m(new THREE.MeshBasicMaterial({ color: hdr(COL.risk, 1.5) })));
    this.add(this.drop);
    this.dotE = new THREE.Mesh(new THREE.SphereGeometry(0.19, 20, 14), this.m(new THREE.MeshBasicMaterial({ color: hdr(COL.spx, 2.2) })));
    this.add(this.dotE);
    this.add(blob(this, 18, 5, 0.55));

    this.lEnd = this.label('', [X0 + CW + 0.35, Y0, 0.1], 'right');
    this.lInv = this.label('', [X0 + CW + 0.35, Y0, 0.1], 'right');
    this.lWorst = this.label('', [X0, Y0, 0.1], 'up');

    this.buildPanel();
    this.recompute();
    this.cur.fill(0);
    this.curI.fill(0);
  }

  /* ---------- the control panel (HTML; it is moved into the slide's text block when the page is shown) ---------- */
  buildPanel() {
    const el = document.createElement('div');
    el.className = 'calc';
    el.innerHTML = `
      <div class="calc-row">
        <span class="calc-k">哪年开始</span>
        <div class="calc-year">
          <button type="button" class="calc-step" data-step="-1" aria-label="早一年">−</button>
          <input type="range" min="${Y_MIN}" max="${Y_MAX}" step="1" value="${this.p.year}" aria-label="开始投资的年份">
          <button type="button" class="calc-step" data-step="1" aria-label="晚一年">+</button>
          <output>${this.p.year} 年</output>
        </div>
      </div>
      <div class="calc-row">
        <span class="calc-k"></span>
        <div class="calc-chips"><span>试试最倒霉的年份</span>${HARD.map((y) => `<button type="button" data-year="${y}">${y}</button>`).join('')}</div>
      </div>
      <div class="calc-row">
        <span class="calc-k">怎么投</span>
        <div class="calc-seg" role="group" aria-label="怎么投">
          <button type="button" data-mode="lump">一次性投入</button><button type="button" data-mode="year">每年投一笔</button>
        </div>
      </div>
      <div class="calc-row">
        <span class="calc-k">一共投</span>
        <div class="calc-amt">
          <input type="number" inputmode="numeric" min="1" max="100000" step="10" value="${this.p.total}" aria-label="一共投多少万元"><span>万</span>
          <div class="calc-chips">${[100, 200, 500].map((v) => `<button type="button" data-amt="${v}">${v} 万</button>`).join('')}</div>
        </div>
      </div>
      <div class="calc-out">
        <div class="calc-res"><span class="k" data-o="k1"></span><b class="blue" data-o="v1"></b><span class="d" data-o="d1"></span></div>
        <div class="calc-res"><span class="k">最难熬的时候</span><b class="red" data-o="v2"></b><span class="d" data-o="d2"></span></div>
      </div>
      <p class="calc-foot">按美元算、含分红；没算汇率和基金费用。历史不代表未来。</p>`;
    this.panel = el;
    this.range = el.querySelector('input[type=range]');
    this.amt = el.querySelector('input[type=number]');
    this.yearOut = el.querySelector('output');
    this.o = {};
    el.querySelectorAll('[data-o]').forEach((n) => (this.o[n.dataset.o] = n));
    const stop = (e) => e.stopPropagation();
    // keep the show's own navigation (click = next page, swipe, keys) away from the controls
    for (const t of ['click', 'touchstart', 'touchend', 'pointerdown']) el.addEventListener(t, stop);
    el.addEventListener('keydown', (e) => {
      if (e.target.tagName !== 'INPUT') return;
      e.stopPropagation();
      if (e.key === 'Enter' || e.key === 'Escape') e.target.blur();
    });
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const d = b.dataset;
      if (d.step) this.p.year = clamp(this.p.year + +d.step, Y_MIN, Y_MAX);
      else if (d.year) this.p.year = +d.year;
      else if (d.mode) this.p.mode = d.mode;
      else if (d.amt) this.p.total = +d.amt;
      b.blur(); // so the arrow keys go back to turning pages
      this.recompute();
    });
    this.range.addEventListener('input', () => {
      this.p.year = +this.range.value;
      this.recompute();
    });
    this.range.addEventListener('change', () => this.range.blur());
    this.amt.addEventListener('input', () => {
      const v = +this.amt.value;
      if (v >= 1 && v <= 100000) {
        this.p.total = v;
        this.recompute(true);
      }
    });
    this.amt.addEventListener('change', () => {
      this.amt.value = this.p.total;
    });
  }

  recompute(typing = false) {
    const p = this.p;
    const r = simulate(p.year, p.mode, p.total);
    this.r = r;
    // panel
    this.range.value = p.year;
    this.yearOut.textContent = `${p.year} 年`;
    if (!typing) this.amt.value = p.total;
    this.panel.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === p.mode));
    this.panel.querySelectorAll('[data-year]').forEach((b) => b.classList.toggle('on', +b.dataset.year === p.year));
    this.panel.querySelectorAll('[data-amt]').forEach((b) => b.classList.toggle('on', +b.dataset.amt === p.total));
    const gain = r.now - r.total;
    const how = p.mode === 'year' ? `每年年初投 ${wan(r.per)}，投了 ${r.nPay} 年` : `${p.year} 年年初一次投入 ${wan(r.total)}`;
    this.o.k1.textContent = `到今天（${SPX_ASOF[0]} 年 ${SPX_ASOF[1]} 月）`;
    this.o.v1.textContent = `≈ ${wan(r.now)}`;
    this.o.d1.textContent = `${how}。${gain >= 0 ? '赚了' : '亏了'} ${wan(Math.abs(gain))}，平均每年 ${r.rate >= 0 ? '+' : '−'}${Math.abs(r.rate * 100).toFixed(1)}%。`;
    const w = r.worst;
    const [wy, wm] = r.when;
    this.o.v2.textContent = `${wy} 年 ${wm} 月`;
    const left =
      w.v < w.inv
        ? p.mode === 'year'
          ? `已经投进去 ${wan(w.inv)}，账户只剩 ${wan(w.v)}`
          : `${wan(w.inv)} 只剩 ${wan(w.v)}`
        : `账户从 ${wan(w.hw)} 跌到 ${wan(w.v)}`;
    const back = r.recMonths < 0 ? '到今天还没涨回来' : `之后 ${span(r.recMonths)}涨回原来的高点`;
    this.o.d2.textContent = `比之前的最高点跌了 ${Math.round(w.dd * 100)}%：${left}。${back}。`;

    // chart targets
    const n = r.n;
    let vmax = r.total;
    for (let j = 0; j <= n; j++) if (r.val[j] > vmax) vmax = r.val[j];
    // gridlines at round amounts; the top of the chart is the next round amount above the highest value
    const raw = vmax / 4.5;
    const pow = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 5, 10].map((k) => k * pow).find((k) => k >= raw);
    const ymax = Math.max(vmax * 1.04, step * Math.ceil((vmax * 0.98) / step));
    const sy = (v) => (v / ymax) * CH;
    const kw = Math.round((w.j / n) * M);
    for (let k = 0; k <= M; k++) {
      const x = (k / M) * n;
      const j0 = Math.floor(x);
      const j1 = Math.min(n, j0 + 1);
      const u = x - j0;
      this.tgt[k] = sy(r.val[j0] * (1 - u) + r.val[j1] * u);
      this.tgtI[k] = sy(r.inv[Math.min(n, Math.round(x))]);
    }
    if (w.dd > 0) this.tgt[kw] = sy(w.v);
    this.kw = kw;
    Object.assign(this.mkT, { wx: (kw / M) * CW, wy: sy(w.v), hy: sy(w.hw), ey: sy(r.now), iy: sy(r.total) });
    this.grid.forEach((g, i) => {
      const v = step * (i + 1);
      g.on = v <= ymax * 1.001;
      g.yT = sy(v);
      g.lab.set(`<span class="c">${v >= 10000 ? `${+(v / 10000).toFixed(2)} 亿` : `${sep(v)} 万`}</span>`); // round amounts: no padding zeros
    });
    // year ticks
    const yrs = n / 12;
    const ts = yrs <= 7 ? 1 : yrs <= 16 ? 2 : yrs <= 36 ? 5 : yrs <= 70 ? 10 : 20;
    let ty = Math.ceil(p.year / ts) * ts;
    if (ty - p.year < ts * 0.7) ty += ts; // keep clear of the start-year label
    const list = [p.year];
    for (; ty <= SPX_ASOF[0] && list.length < this.ticks.length; ty += ts) list.push(ty);
    this.ticks.forEach((l, i) => {
      l.use = i < list.length;
      if (!l.use) return;
      const j = (list[i] - p.year) * 12;
      l.pos.x = X0 + (j / n) * CW;
      l.set(`<span class="c">${list[i]}${i === 0 ? ' 年初' : ''}</span>`);
    });
    this.lEnd.set(`<span class="v sm blue">≈ ${wan(r.now)}</span><span class="c">今天</span>`);
    this.lInv.set(`<span class="t muted">本金 ${wan(r.total)}</span>`);
    this.lWorst.set(`<span class="t red">最难熬：${wy} 年 ${wm} 月</span><span class="c">比最高点跌了 ${Math.round(w.dd * 100)}%</span>`);
    this.dirty = true;
  }

  enter(st, prev, fresh) {
    if (fresh) {
      // the curve grows up from the axis on arrival
      this.cur.fill(0);
      this.curI.fill(0);
      Object.assign(this.mk, this.mkT, { wy: 0, hy: 0, ey: 0, iy: 0 });
      for (const g of this.grid) g.y = 0;
      this.rebuild();
      this.dirty = true;
    }
  }

  update(dt) {
    const t = this.t;
    if (this.visT === 1) {
      const slot = document.querySelector('#slides .slide:last-child .calc-slot');
      if (slot && this.panel.parentNode !== slot) slot.appendChild(this.panel);
    }
    const go = t > 0.5;
    if (go && this.dirty) {
      let moving = false;
      const k = 1 - Math.exp(-7 * dt);
      for (let i = 0; i <= M; i++) {
        const d = this.tgt[i] - this.cur[i];
        const e = this.tgtI[i] - this.curI[i];
        if (Math.abs(d) > 0.002 || Math.abs(e) > 0.002) moving = true;
        this.cur[i] += d * k;
        this.curI[i] += e * k;
      }
      for (const key in this.mk) this.mk[key] += (this.mkT[key] - this.mk[key]) * k;
      for (const g of this.grid) g.y += (g.yT - g.y) * k;
      if (!moving) {
        this.cur.set(this.tgt);
        this.curI.set(this.tgtI);
        Object.assign(this.mk, this.mkT);
        for (const g of this.grid) g.y = g.yT;
        this.dirty = false;
      }
      this.rebuild();
    }
    const mk = this.mk;
    const wx = X0 + mk.wx;
    this.dotW.position.set(wx, Y0 + mk.wy, 0.08);
    const dh = Math.max(0.001, mk.hy - mk.wy);
    this.drop.position.set(wx, Y0 + mk.wy + dh / 2, 0.06);
    this.drop.scale.y = dh;
    this.dotE.position.set(X0 + CW, Y0 + mk.ey, 0.08);
    const shown = go && t > 1.0;
    this.dotW.visible = this.drop.visible = this.dotE.visible = shown;
    for (const g of this.grid) {
      g.g.position.y = Y0 + g.y;
      g.g.visible = g.on && go;
      g.lab.pos.y = Y0 + g.y;
      g.lab.target = g.on && shown ? 1 : 0;
    }
    for (const l of this.ticks) l.target = l.use && go ? 1 : 0;
    // captions at the right edge: today's value, and the money paid in (kept apart when the two are close)
    const nar = this.app.ui.narrow();
    this.lEnd.pos.y = Y0 + mk.ey;
    let iy = mk.iy;
    if (Math.abs(iy - mk.ey) < 0.75) iy = mk.ey - 0.75;
    this.lInv.pos.y = Y0 + Math.max(0.25, iy);
    this.lEnd.target = shown ? 1 : 0;
    this.lInv.target = shown && !nar ? 1 : 0;
    // the hardest moment: caption above the earlier high; beside the dot when that is at the right edge
    const late = mk.wx > CW * 0.72;
    this.lWorst.el.className = late ? 'lbl left' : 'lbl up';
    if (late) this.lWorst.pos.set(wx - 0.3, Y0 + mk.wy, 0.1);
    else this.lWorst.pos.set(Math.max(X0 + 1.6, wx), Y0 + mk.hy + 0.15, 0.1);
    this.lWorst.target = shown && this.r.worst.dd > 0.005 ? 1 : 0;
  }

  rebuild() {
    const lp = this.lineGeo.attributes.position.array;
    const ap = this.areaGeo.attributes.position.array;
    const ip = this.invGeo.attributes.position.array;
    const dx = CW / M;
    const c = this.cur;
    for (let k = 0; k <= M; k++) {
      const x = X0 + k * dx;
      const y = Y0 + c[k];
      // ribbon: offset along the normal of the local direction
      const ya = c[Math.max(0, k - 1)];
      const yb = c[Math.min(M, k + 1)];
      let tx = k === 0 || k === M ? dx : 2 * dx;
      let ty = yb - ya;
      const len = Math.hypot(tx, ty);
      tx /= len;
      ty /= len;
      const nx = (-ty * LW) / 2;
      const ny = (tx * LW) / 2;
      const o = k * 6;
      lp[o] = x + nx;
      lp[o + 1] = y + ny;
      lp[o + 2] = 0;
      lp[o + 3] = x - nx;
      lp[o + 4] = y - ny;
      lp[o + 5] = 0;
      ap[o] = x;
      ap[o + 1] = Y0;
      ap[o + 2] = 0;
      ap[o + 3] = x;
      ap[o + 4] = y;
      ap[o + 5] = 0;
      ip[k * 3] = x;
      ip[k * 3 + 1] = Y0 + this.curI[k];
      ip[k * 3 + 2] = 0;
    }
    this.lineGeo.attributes.position.needsUpdate = true;
    this.areaGeo.attributes.position.needsUpdate = true;
    const ld = this.invGeo.attributes.lineDistance.array;
    ld[0] = 0;
    for (let k = 1; k <= M; k++) ld[k] = ld[k - 1] + Math.hypot(dx, this.curI[k] - this.curI[k - 1]);
    this.invGeo.attributes.position.needsUpdate = true;
    this.invGeo.attributes.lineDistance.needsUpdate = true;
  }
}
