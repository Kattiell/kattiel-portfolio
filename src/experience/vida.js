/*
 * Vida do cenário: partículas animadas inteiramente na GPU (zero custo de CPU por quadro).
 * Um único shader serve para fagulhas, faíscas, vapor, poeira, vaga-lumes e pólen:
 * cada nuvem é uma caixa onde as partículas sobem (rise > 0) ou flutuam (rise = 0).
 */
import * as THREE from 'three';
import { uTime } from './materials.js';

const VS = /* glsl */`
  attribute vec4 seed;
  uniform float uTime, uRise, uSize, uDrift, uFlick, uPx;
  uniform vec3 uBox;
  varying float vA;
  void main() {
    vec3 p = (seed.xyz - 0.5) * uBox;
    float a = 1.0;
    if (uRise > 0.0) {
      float life = fract(uTime * uRise / uBox.y + seed.w);
      p.y = life * uBox.y - uBox.y * 0.5;
      p.x += sin(uTime * 1.7 + seed.w * 40.0) * uDrift * life;
      p.z += cos(uTime * 1.3 + seed.w * 23.0) * uDrift * life;
      a = sin(life * 3.14159) * (1.0 - life * 0.4);
    } else {
      p.x += sin(uTime * 0.31 + seed.w * 40.0) * uDrift;
      p.y += sin(uTime * 0.23 + seed.w * 17.0) * uDrift * 0.6;
      p.z += cos(uTime * 0.27 + seed.w * 29.0) * uDrift;
    }
    if (uFlick > 0.0) a *= 0.35 + 0.65 * smoothstep(0.2, 1.0, sin(uTime * uFlick + seed.w * 61.0) * 0.5 + 0.5);
    vA = a;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPx * (0.55 + seed.w * 0.9) / max(0.5, -mv.z);
  }`;
const FS = /* glsl */`
  uniform vec3 uColor; uniform float uSoft;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float m = pow(max(0.0, 1.0 - d), uSoft);
    if (m * vA < 0.01) discard;
    gl_FragColor = vec4(uColor * m * vA, m * vA);
  }`;

/**
 * Cria uma nuvem de partículas.
 * @param {object} o  n, box [x,y,z], color, intensity, size (m aprox.), rise (m/s), drift (m), flick (Hz*2π), soft (borda), additive
 */
export function motes(o) {
  const n = o.n ?? 60; const seed = new Float32Array(n * 4);
  for (let i = 0; i < seed.length; i++) seed[i] = Math.random();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
  const [bx, by, bz] = o.box ?? [2, 3, 2];
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Math.hypot(bx, by, bz) * 0.6 + (o.drift ?? 0.3) * 2);
  const m = new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false,
    blending: o.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending,
    uniforms: {
      uTime, uRise: { value: o.rise ?? 0 }, uSize: { value: o.size ?? 0.08 }, uDrift: { value: o.drift ?? 0.3 },
      uFlick: { value: o.flick ?? 0 }, uPx: { value: 800 }, uBox: { value: new THREE.Vector3(bx, by, bz) },
      uColor: { value: new THREE.Color(o.color ?? 0xffa040).multiplyScalar(o.intensity ?? 2) }, uSoft: { value: o.soft ?? 1.6 },
    },
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = true; pts.renderOrder = 5;
  pts.userData.noReflect = true;
  return pts;
}

/** Ajusta o tamanho em pixels ao tamanho da tela (chamar no resize). */
export function setMotesScale(root, heightPx) {
  root.traverse((o) => { if (o.isPoints && o.material.uniforms?.uPx) o.material.uniforms.uPx.value = heightPx * 0.9; });
}

/* Receita de vida por distrito, no referencial do portal (boca em z=0, +z para o salão). */
export const PORTAL_LIFE = {
  1: [{ n: 50, box: [7, 5, 2], pos: [0, 3, 0.6], color: 0xffd88a, intensity: 2.6, size: 0.06, drift: 0.4, flick: 6 }],                       // brilho dourado
  2: [{ n: 40, box: [0.5, 1.6, 0.5], pos: [-(6.4 / 2 + 1.6), 3.4, 1.0], color: 0xff8a2a, intensity: 3, size: 0.05, rise: 0.9, drift: 0.12 },   // tochas
      { n: 40, box: [0.5, 1.6, 0.5], pos: [6.4 / 2 + 1.6, 3.4, 1.0], color: 0xff8a2a, intensity: 3, size: 0.05, rise: 0.9, drift: 0.12 }],
  3: [{ n: 90, box: [6, 6, 3], pos: [0, 3, -1.5], color: 0x40e8ff, intensity: 2.2, size: 0.045, rise: 0.5, drift: 0.05, flick: 9 }],       // dados subindo
  4: [{ n: 70, box: [6, 1.4, 6], pos: [0, 0.7, -3], color: 0x9fe8e0, intensity: 0.5, size: 0.9, drift: 0.6, soft: 2.5 }],                    // névoa do mar
  5: [{ n: 60, box: [7, 6, 2], pos: [0, 3, 0.4], color: 0x8fb8ff, intensity: 4, size: 0.05, drift: 0.9, flick: 30 }],                         // faíscas elétricas
  6: [{ n: 45, box: [2.5, 4, 2.5], pos: [0, 4.5, -4.5], color: 0xc8d2dc, intensity: 0.35, size: 1.4, rise: 0.7, drift: 0.8, soft: 2.5, additive: true }], // vapor da locomotiva
  7: [{ n: 70, box: [6, 4, 3], pos: [0, 2.2, 0], color: 0xe0b070, intensity: 1.3, size: 0.05, drift: 0.7 }],                               // serragem no ar
  8: [{ n: 60, box: [6, 5, 2], pos: [0, 3, 0.4], color: 0xd08cff, intensity: 2.4, size: 0.05, drift: 0.5, flick: 5 }],                        // fios brilhando
  9: [{ n: 80, box: [8, 5, 3], pos: [0, 2.5, 0.4], color: 0xffd060, intensity: 1.6, size: 0.05, drift: 0.8 }],                              // palha e pólen
  10: [{ n: 60, box: [7, 4, 3], pos: [0, 2, 0.4], color: 0xf0c890, intensity: 1.1, size: 0.05, drift: 0.6 }],                               // poeira de feno
  11: [{ n: 40, box: [8, 5, 3], pos: [0, 2.5, 0.6], color: 0xb8ff60, intensity: 3.2, size: 0.07, drift: 0.9, flick: 2.5 }],                  // vaga-lumes
  12: [{ n: 120, box: [3, 5, 2], pos: [0, 2.5, -1.2], color: 0xff6a1a, intensity: 3.5, size: 0.05, rise: 1.6, drift: 0.5 }],                // fagulhas da forja
};
