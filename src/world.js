import * as THREE from 'three';

export const FOG = 0.0105;

/* Stage floor: near-black, with soft "spotlight pools" under the active set pieces
   and a faint grid that only shows inside the lit pools. */
export function makeFloor(scene) {
  const geo = new THREE.PlaneGeometry(4200, 700, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const spots = Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, 1, 0));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uSpots: { value: spots }, uCam: { value: new THREE.Vector3() }, uFog: { value: FOG } },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform vec4 uSpots[6];
      uniform vec3 uCam;
      uniform float uFog;
      varying vec3 vW;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        float L = 0.0;
        for (int i = 0; i < 6; i++) {
          vec4 s = uSpots[i];
          vec2 d = vW.xz - s.xy;
          L += s.w * exp(-dot(d, d) / (s.z * s.z));
        }
        vec3 col = vec3(0.006, 0.0065, 0.008) + vec3(0.046, 0.048, 0.056) * L;
        vec2 q = vW.xz / 2.0;
        vec2 gq = abs(fract(q - 0.5) - 0.5) / max(fwidth(q), vec2(1e-4));
        float line = 1.0 - min(min(gq.x, gq.y), 1.0);
        col += line * 0.016 * smoothstep(0.03, 0.7, L);
        float dist = length(vW - uCam);
        col *= exp(-pow(uFog * dist, 2.0));
        col += (hash(gl_FragCoord.xy) - 0.5) / 420.0;
        gl_FragColor = vec4(max(col, 0.0), 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(1500, 0, 0);
  mesh.renderOrder = -10;
  scene.add(mesh);
  return {
    mesh,
    update(list, camPos, focus) {
      mat.uniforms.uCam.value.copy(camPos);
      list.sort((a, b) => Math.hypot(a[0] - focus.x, a[1] - focus.z) - Math.hypot(b[0] - focus.x, b[1] - focus.z));
      for (let i = 0; i < 6; i++) {
        const s = list[i];
        if (s) spots[i].set(s[0], s[1], s[2], s[3]);
        else spots[i].set(0, 0, 1, 0);
      }
    },
  };
}

/* Floating dust: an endless field that wraps around the camera, for parallax during camera moves */
export function makeDust(scene, count = 2200) {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 110;
    pos[i * 3 + 1] = Math.random() * 40;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 110;
    seed[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uPx: { value: 1 }, uBoost: { value: 0 } },
    vertexShader: /* glsl */ `
      uniform vec3 uCam; uniform float uTime; uniform float uPx; uniform float uBoost;
      attribute float aSeed;
      varying float vA;
      void main(){
        vec3 p = position;
        p.x += sin(uTime * 0.07 + aSeed * 40.0) * 1.5;
        p.z += cos(uTime * 0.05 + aSeed * 23.0) * 1.5;
        float y = mod(p.y + uTime * (0.08 + aSeed * 0.12), 40.0);
        vec2 box = vec2(110.0, 110.0);
        vec2 rel = mod(p.xz - uCam.xz + box * 0.5, box) - box * 0.5;
        vec3 w = vec3(uCam.x + rel.x, y, uCam.z + rel.y);
        vec4 mv = viewMatrix * vec4(w, 1.0);
        gl_Position = projectionMatrix * mv;
        float d = -mv.z;
        gl_PointSize = uPx * (1.0 + aSeed * 2.4) * (15.0 + uBoost * 10.0) / max(d, 1.0);
        float edge = 1.0 - smoothstep(0.36, 0.5, max(abs(rel.x) / box.x, abs(rel.y) / box.y));
        vA = edge * smoothstep(1.5, 7.0, d) * (1.0 - smoothstep(25.0, 85.0, d)) * (0.25 + 0.75 * aSeed) * (1.0 + uBoost * 2.2);
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main(){
        float r = length(gl_PointCoord - 0.5);
        float a = (1.0 - smoothstep(0.0, 0.5, r)) * vA * 0.42;
        gl_FragColor = vec4(vec3(0.78, 0.84, 1.0) * a, a);
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 50;
  scene.add(pts);
  return {
    update(camPos, time, px, boost = 0) {
      mat.uniforms.uBoost.value = boost;
      mat.uniforms.uCam.value.copy(camPos);
      mat.uniforms.uTime.value = time;
      mat.uniforms.uPx.value = px;
    },
  };
}
