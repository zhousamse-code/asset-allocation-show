import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Labels, clamp, damp, eInOut } from './lib.js';
import { makeFloor, makeDust, FOG } from './world.js';
import { buildPieces } from './pieces/index.js';
import { BEATS, ACTS } from './beats.js';
import { UI } from './ui.js';

const QA = /[?&]qa\b/.test(location.search);
if (QA) document.documentElement.classList.add('qa');
const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const app = {
  time: 0,
  beat: -1,
  beatTime: 0,
  shake: 0,
  W: 1,
  H: 1,
  px: 1,
  mouse: { x: 0, y: 0, tx: 0, ty: 0 },
};

function boot() {
  const canvas = document.getElementById('gl');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false, preserveDrawingBuffer: QA });
    if (!renderer.capabilities.isWebGL2) throw new Error('WebGL2 unavailable');
  } catch (err) {
    document.documentElement.classList.add('nogl');
    document.getElementById('loading').classList.add('gone');
    return;
  }
  renderer.setClearColor(0x000000, 1);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  app.renderer = renderer;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.FogExp2(0x000000, FOG);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.42;
  app.scene = scene;

  scene.add(new THREE.HemisphereLight(0x9aa8c8, 0x0a0a10, 0.42));
  const key = new THREE.DirectionalLight(0xfff0de, 2.5);
  key.position.set(-0.55, 1.0, 0.75);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fb6ff, 1.9);
  rim.position.set(0.8, 0.55, -1.0);
  scene.add(rim);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 700);
  app.camera = camera;

  app.labels = new Labels(document.getElementById('labels'));
  app.floor = makeFloor(scene);
  app.dust = makeDust(scene);
  const { list, map } = buildPieces(app);
  app.pieces = map;
  app.list = list;

  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  // safety net: a single NaN/Inf pixel would be smeared over the whole screen by the bloom blur
  // (black flashing frames on real GPUs), so scrub them before bloom.
  composer.addPass(
    new ShaderPass({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader:
        'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); bvec4 bad = bvec4(isnan(c.r) || isinf(c.r), isnan(c.g) || isinf(c.g), isnan(c.b) || isinf(c.b), isnan(c.a) || isinf(c.a)); if (any(bad)) c = vec4(0.0, 0.0, 0.0, 1.0); gl_FragColor = clamp(c, vec4(0.0), vec4(48.0)); }',
    }),
  );
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.45, 1.35);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  app.composer = composer;
  app.bloom = bloom;

  const ui = new UI(app, BEATS, ACTS);
  app.ui = ui;

  /* ---------- sizing & adaptive quality ---------- */
  let dprCap = Math.min(window.devicePixelRatio || 1, 2);
  if (QA) dprCap = 1;
  const resize = () => {
    app.W = window.innerWidth;
    app.H = window.innerHeight;
    app.px = dprCap;
    renderer.setPixelRatio(dprCap);
    renderer.setSize(app.W, app.H, false);
    composer.setPixelRatio(dprCap);
    composer.setSize(app.W, app.H);
    camera.aspect = app.W / app.H;
    camera.updateProjectionMatrix();
    if (app.beat >= 0) camTo(BEATS[app.beat], false, true);
  };
  window.addEventListener('resize', resize);

  /* ---------- camera ---------- */
  const cs = {
    pos: new THREE.Vector3(-30, 14, 40),
    tgt: new THREE.Vector3(0, 1, 0),
    fov: 34,
    fovT: 34,
    sx: 0,
    sy: 0,
    sxT: 0,
    syT: 0,
    tw: null,
  };
  const UP = new THREE.Vector3(0, 1, 0);
  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up2 = new THREE.Vector3();
  function camGoal(b) {
    const c = b.cam;
    const o = map[c.at] ? map[c.at].origin : new THREE.Vector3();
    const P = new THREE.Vector3(...c.p).add(o);
    const T = new THREE.Vector3(...c.t).add(o);
    const asp = app.W / app.H;
    const narrow = ui.narrow();
    let k = 1;
    if (asp < 1.6) k = clamp((1.6 / asp) ** 1.3, 1, 2.8);
    if (k !== 1) P.sub(T).multiplyScalar(k).add(T);
    return { P, T, fov: c.fov || 34, sx: narrow ? 0 : c.shift ? c.shift[0] : 0, sy: narrow ? 0.16 : c.shift ? c.shift[1] : 0 };
  }
  function camTo(b, instant, keepTween) {
    const g = camGoal(b);
    cs.fovT = g.fov;
    cs.sxT = g.sx;
    cs.syT = g.sy;
    if (instant) {
      cs.pos.copy(g.P);
      cs.tgt.copy(g.T);
      cs.tw = null;
      cs.fov = g.fov;
      cs.sx = g.sx;
      cs.sy = g.sy;
      return;
    }
    if (keepTween && cs.tw) {
      cs.tw.p1 = g.P;
      cs.tw.t1 = g.T;
      return;
    }
    const d = cs.pos.distanceTo(g.P) + 0.5 * cs.tgt.distanceTo(g.T);
    const dur = clamp(1.25 + d / 150, 1.35, 2.7);
    cs.tw = { p0: cs.pos.clone(), t0: cs.tgt.clone(), p1: g.P, t1: g.T, dur, k: 0, arc: Math.min(d * 0.085, 13) };
  }
  app.camTo = camTo;
  function updateCam(dt) {
    const tw = cs.tw;
    if (tw) {
      tw.k += dt / tw.dur;
      const k = Math.min(1, tw.k);
      const e = eInOut(k);
      cs.pos.lerpVectors(tw.p0, tw.p1, e);
      cs.pos.y += Math.sin(Math.PI * e) * tw.arc;
      cs.tgt.lerpVectors(tw.t0, tw.t1, eInOut(Math.min(1, k * 1.07)));
      if (k >= 1) cs.tw = null;
    }
    cs.fov = damp(cs.fov, cs.fovT, 2.5, dt);
    cs.sx = damp(cs.sx, cs.sxT, 2.5, dt);
    cs.sy = damp(cs.sy, cs.syT, 2.5, dt);
    const m = app.mouse;
    m.x = damp(m.x, m.tx, 2.5, dt);
    m.y = damp(m.y, m.ty, 2.5, dt);
    fwd.subVectors(cs.tgt, cs.pos);
    const dist = fwd.length();
    fwd.normalize();
    right.crossVectors(fwd, UP).normalize();
    up2.crossVectors(right, fwd);
    const amp = dist * (REDUCED ? 0.004 : 0.016);
    const t = app.time;
    const dx = Math.sin(t * 0.21) * amp + m.x * dist * 0.03;
    const dy = Math.sin(t * 0.17 + 1.3) * amp * 0.6 + m.y * dist * 0.018;
    camera.position.copy(cs.pos).addScaledVector(right, dx).addScaledVector(up2, dy);
    if (app.shake > 0.002 && !REDUCED) {
      const s = app.shake * 0.28;
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s;
      app.shake = damp(app.shake, 0, 4.5, dt);
    }
    camera.lookAt(cs.tgt);
    camera.fov = cs.fov;
    camera.setViewOffset(app.W, app.H, -cs.sx * app.W, -cs.sy * app.H, app.W, app.H);
  }
  app.settled = () => !cs.tw;

  /* ---------- navigation ---------- */
  app.go = (i, instant = false) => {
    i = clamp(i, 0, BEATS.length - 1);
    if (i === app.beat && !instant) return;
    app.beat = i;
    app.beatTime = 0;
    const b = BEATS[i];
    for (const p of list) p.setState(b.pieces[p.name] || null);
    camTo(b, instant);
    ui.show(b, i);
    try {
      history.replaceState(null, '', '#b' + (i + 1));
    } catch (e) {
      /* sandboxed frames may refuse; the presentation works without it */
    }
  };
  app.toggleFullscreen = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(() => {});
    } catch (e) {
      /* optional feature */
    }
  };

  /* ---------- simulation step & render ---------- */
  const focus = new THREE.Vector3();
  const lastCam = new THREE.Vector3();
  let boost = 0;
  function step(dt) {
    app.time += dt;
    app.beatTime += dt;
    updateCam(dt);
    for (const p of list) p.tick(dt, app.time);
    const spots = [];
    for (const p of list) {
      if (p.vis <= 0.01) continue;
      spots.push([p.origin.x + p.spot[0], p.origin.z + p.spot[1], p.spot[2], p.spot[3] * p.fade.value]);
    }
    focus.copy(cs.tgt);
    app.floor.update(spots, camera.position, focus);
    const spd = dt > 0 ? lastCam.distanceTo(camera.position) / dt : 0;
    lastCam.copy(camera.position);
    boost = damp(boost, clamp(spd / 45, 0, 1.6), 4, dt);
    app.dust.update(camera.position, app.time, app.px, boost);
    scene.updateMatrixWorld();
    app.labels.update(dt, camera, app.W, app.H);
    document.body.classList.toggle('settled', !cs.tw && app.beatTime > 1.6);
  }
  function render() {
    composer.render();
  }

  resize();
  // compile every material once so the first visit to a scene does not stutter
  for (const p of list) p.root.visible = true;
  camera.position.set(0, 10, 30);
  camera.lookAt(0, 0, 0);
  try {
    renderer.compile(scene, camera);
  } catch (e) {
    /* compile is an optimisation only */
  }
  for (const p of list) p.root.visible = false;

  const m = /^#b(\d+)$/.exec(location.hash);
  const start = m ? clamp(parseInt(m[1], 10) - 1, 0, BEATS.length - 1) : 0;
  app.go(start, start !== 0);
  if (start === 0) {
    // opening move: glide in towards the cover
    cs.pos.set(-14, 16, 40);
    cs.tgt.set(0, 2, 0);
    camTo(BEATS[0], false);
    cs.tw.dur = 3.2;
    cs.tw.arc = 0;
  }

  /* ---------- input ---------- */
  const wheel = { last: 0, acc: 0, used: false };
  window.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const now = performance.now();
      if (now - wheel.last > 240) {
        wheel.acc = 0;
        wheel.used = false;
      }
      wheel.last = now;
      if (wheel.used) return;
      let d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (e.deltaMode === 1) d *= 16;
      else if (e.deltaMode === 2) d *= 400;
      wheel.acc += d;
      if (Math.abs(wheel.acc) > 26) {
        app.go(app.beat + (wheel.acc > 0 ? 1 : -1));
        wheel.used = true;
      }
    },
    { passive: false },
  );
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === ' ' || k === 'Enter') {
      if ((k === 'Enter' || k === ' ') && e.target.closest && e.target.closest('button')) return;
      e.preventDefault();
      app.go(app.beat + 1);
    } else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace') {
      e.preventDefault();
      app.go(app.beat - 1);
    } else if (k === 'Home') app.go(0);
    else if (k === 'End') app.go(BEATS.length - 1);
    else if (/^[0-9]$/.test(k) && +k < ACTS.length) app.go(ui.actFirst[+k]);
    else if (k === 'f' || k === 'F') app.toggleFullscreen();
  });
  const stage = document.getElementById('stage');
  stage.addEventListener('click', (e) => {
    if (e.target.closest('button, a, .cmpwrap')) return;
    app.go(app.beat + 1);
  });
  let touch = null;
  stage.addEventListener(
    'touchstart',
    (e) => {
      const t = e.touches[0];
      touch = { x: t.clientX, y: t.clientY, time: performance.now() };
    },
    { passive: true },
  );
  stage.addEventListener(
    'touchend',
    (e) => {
      if (!touch) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touch.x;
      const dy = t.clientY - touch.y;
      touch = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 40) {
        const v = Math.abs(dy) > Math.abs(dx) ? dy : dx;
        app.go(app.beat + (v < 0 ? 1 : -1));
        e.preventDefault();
      }
    },
    { passive: false },
  );
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    app.mouse.tx = (e.clientX / app.W - 0.5) * 2;
    app.mouse.ty = -(e.clientY / app.H - 0.5) * 2;
  });
  window.addEventListener('hashchange', () => {
    const mm = /^#b(\d+)$/.exec(location.hash);
    if (mm) app.go(clamp(parseInt(mm[1], 10) - 1, 0, BEATS.length - 1));
  });

  /* ---------- loop ---------- */
  let last = performance.now();
  let frames = 0;
  let acc = 0;
  let firstFrame = true;
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    render();
    if (firstFrame) {
      firstFrame = false;
      document.getElementById('loading').classList.add('gone');
    }
    // adaptive resolution: step down if the machine struggles
    frames++;
    acc += dt;
    if (frames >= 90) {
      const avg = acc / frames;
      if (avg > 0.026 && dprCap > 1) {
        dprCap = Math.max(1, dprCap - 0.25);
        resize();
      } else if (avg > 0.034 && dprCap <= 1 && bloom.enabled) {
        bloom.enabled = false;
      }
      frames = 0;
      acc = 0;
    }
  }
  if (QA) {
    document.getElementById('loading').classList.add('gone');
    window.__qa = {
      n: BEATS.length,
      shot(i, settle = 4) {
        app.go(i, true);
        const steps = Math.round(settle * 30);
        for (let s = 0; s < steps; s++) step(1 / 30);
        render();
        return true;
      },
      size() {
        resize();
      },
      go(i) {
        app.go(i);
      },
      adv(sec) {
        const steps = Math.round(sec * 30);
        for (let s = 0; s < steps; s++) step(1 / 30);
        render();
      },
    };
  } else requestAnimationFrame(loop);
}

boot();
