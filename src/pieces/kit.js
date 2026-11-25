import * as THREE from 'three';
import { rbox } from '../lib.js';
import { BW, BH, BD, noteTex } from './bundles.js';

/* Instanced money bundles (same look as the 200 bundles on the cover): body + paper band.
   set(i, x, y, z, s, color, rotY) places one bundle; hide(i) removes it; commit() uploads. */
export function bundleSet(piece, n, { w = BW, h = BH, d = BD } = {}) {
  const mat = piece.m(new THREE.MeshStandardMaterial({ color: 0xffffff, map: noteTex(), roughness: 0.5, metalness: 0.05 }));
  const mesh = new THREE.InstancedMesh(rbox(w, h, d, 0.035, 2), mat, n);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
  mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  const band = new THREE.InstancedMesh(
    new THREE.BoxGeometry(w * 0.19, h + 0.014, d + 0.016),
    piece.m(new THREE.MeshStandardMaterial({ color: 0xcdbf9f, roughness: 0.78 })),
    n,
  );
  band.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  band.frustumCulled = false;
  const M = new THREE.Matrix4();
  const Q = new THREE.Quaternion();
  const E = new THREE.Euler();
  const P = new THREE.Vector3();
  const S = new THREE.Vector3();
  const Z = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < n; i++) {
    mesh.setMatrixAt(i, Z);
    band.setMatrixAt(i, Z);
  }
  return {
    mesh,
    band,
    h,
    set(i, x, y, z, s = 1, color = null, rotY = 0, rotZ = 0) {
      if (s <= 0.001) {
        mesh.setMatrixAt(i, Z);
        band.setMatrixAt(i, Z);
        return;
      }
      E.set(0, rotY, rotZ);
      Q.setFromEuler(E);
      M.compose(P.set(x, y, z), Q, S.setScalar(s));
      mesh.setMatrixAt(i, M);
      band.setMatrixAt(i, M);
      if (color) mesh.setColorAt(i, color);
    },
    hide(i) {
      mesh.setMatrixAt(i, Z);
      band.setMatrixAt(i, Z);
    },
    commit() {
      mesh.instanceMatrix.needsUpdate = true;
      band.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
    },
  };
}

/* simple glowing "tower": dark glass body + bright cap; height set via setH() */
export function glowTower(piece, color, { w = 1.3, d = 1.3, em = 0.35 } = {}) {
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(w, 1, d);
  geo.translate(0, 0.5, 0);
  const bm = piece.m(
    new THREE.MeshPhysicalMaterial({ color: 0x0b1626, emissive: new THREE.Color(color), emissiveIntensity: em, roughness: 0.22, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.25 }),
  );
  const body = new THREE.Mesh(geo, bm);
  g.add(body);
  const cm = piece.m(new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.0) }));
  const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.06, d + 0.02), cm);
  g.add(cap);
  const t = { g, body, cap, bm, cm, h: 1 };
  t.setH = (h) => {
    t.h = h;
    body.scale.y = Math.max(0.001, h);
    cap.position.y = h;
  };
  return t;
}
