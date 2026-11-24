import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

export const PALETTE = {
  basalt: 0x0a0e13,
  graphite: 0x202a33,
  slate: 0x434b54,
  techBlue: 0x087bba,
  electric: 0x00b9ed,
  cyan: 0x76e5f5,
  bronze: 0x77553a,
  amber: 0xda904f,
  coldWhite: 0xe5edf3,
};

export const noise = new ImprovedNoise();
/** Relógio compartilhado pelos shaders animados (tecido, partículas). Atualizado pelo laço principal. */
export const uTime = { value: 0 };

/** fBm 3D em [-1, 1] aprox. */
export function fbm(x, y, z, oct = 4) {
  let a = 1, f = 1, s = 0, n = 0;
  for (let i = 0; i < oct; i++) {
    s += a * noise.noise(x * f, y * f, z * f);
    n += a; a *= 0.5; f *= 2.03;
  }
  return s / n;
}

/** Desloca os vértices de uma geometria ao longo da normal com ruído (rocha). */
export function displace(geo, { scale = 0.35, amp = 1, seed = 0, oct = 4, ridge = 0.35 } = {}) {
  geo = geo.index ? geo.toNonIndexed() : geo;
  geo = mergeByPosition(geo);
  geo.computeVertexNormals();
  const p = geo.attributes.position, n = geo.attributes.normal;
  const v = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); nn.fromBufferAttribute(n, i);
    let d = fbm(v.x * scale + seed, v.y * scale + seed * 1.7, v.z * scale - seed, oct);
    // estratos: camadas horizontais quebradas
    d += ridge * Math.abs(Math.sin(v.y * 1.3 + fbm(v.x * 0.1, seed, v.z * 0.1, 2) * 4)) - ridge * 0.5;
    v.addScaledVector(nn, d * amp);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Junta vértices duplicados por posição para o deslocamento não rasgar a malha. */
export function mergeByPosition(geo, tol = 1e-4) {
  const pos = geo.attributes.position;
  const map = new Map(); const remap = []; const verts = [];
  for (let i = 0; i < pos.count; i++) {
    const k = `${Math.round(pos.getX(i) / tol)}_${Math.round(pos.getY(i) / tol)}_${Math.round(pos.getZ(i) / tol)}`;
    let idx = map.get(k);
    if (idx === undefined) { idx = verts.length / 3; map.set(k, idx); verts.push(pos.getX(i), pos.getY(i), pos.getZ(i)); }
    remap.push(idx);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(remap);
  return g;
}

/* ---------------- texturas procedurais (canvas) ---------------- */

function canvasTex(size, draw, { repeat = 1, srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Mapa de altura tileável de rocha -> usado para cor, rugosidade e normal. */
function rockHeight(size, seed) {
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size * Math.PI * 2, v = y / size * Math.PI * 2;
    // amostragem toroidal para ficar tileável
    const nx = Math.cos(u) * 1.6, ny = Math.sin(u) * 1.6, nz = Math.cos(v) * 1.6 + seed, nw = Math.sin(v) * 1.6;
    let val = fbm(nx + nw * 0.7, ny + seed, nz, 6);
    val += 0.35 * Math.abs(fbm(nx * 3, ny * 3 + nw, nz * 3, 3)); // fissuras
    h[y * size + x] = val;
  }
  return h;
}

function normalFromHeight(h, size, strength = 3) {
  return canvasTex(size, (g) => {
    const img = g.createImageData(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const l = h[y * size + ((x - 1 + size) % size)], r = h[y * size + ((x + 1) % size)];
      const u = h[((y - 1 + size) % size) * size + x], d = h[((y + 1) % size) * size + x];
      let nx = (l - r) * strength, ny = (u - d) * strength, nz = 1;
      const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len;
      const i = (y * size + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255; img.data[i + 1] = (ny * 0.5 + 0.5) * 255; img.data[i + 2] = (nz * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, { srgb: false });
}

/* ---------------- texturas PBR reais (Poly Haven, CC0) ---------------- */
// Ficam em public/textures/<nome>_{diff,nor,rough,ao}.jpg (1K). Créditos em public/textures/CREDITOS.md.
const loader = new THREE.TextureLoader();
const _sets = new Map();
export function texSet(name) {
  if (_sets.has(name)) return _sets.get(name);
  const ld = (suffix, srgb) => {
    const t = loader.load(`${'/'}textures/${name}_${suffix}.jpg`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const set = { diff: ld('diff', true), nor: ld('nor', false), rough: ld('rough', false), ao: ld('ao', false) };
  _sets.set(name, set); return set;
}

/**
 * Material PBR com projeção triplanar em coordenadas do mundo (sem UV): a textura mantém
 * a escala real em qualquer peça. Opcional: umidade pela altura e musgo nas faces de cima (rocha).
 * detail: segunda textura em escala grande, quebra a repetição.
 */
export function triMaterial({ set = 'cliff_side', detail = null, scale = 0.25, tint = 0xffffff, metalness = 0, roughness = 1, wetLevel = -100, moss = 0, normalK = 1, aoK = 1, envMapIntensity = 1 } = {}) {
  const T = texSet(set); const D = texSet(detail || set);
  const m = new THREE.MeshStandardMaterial({ color: tint, roughness, metalness, envMapIntensity });
  m.userData.uniforms = { uScale: { value: scale }, uWet: { value: wetLevel }, uMoss: { value: moss }, uNK: { value: normalK }, uAOK: { value: aoK } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.uniforms, { tC: { value: T.diff }, tR: { value: T.rough }, tN: { value: T.nor }, tA: { value: T.ao }, tD: { value: D.diff } });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos; varying vec3 vWNrm;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed,1.0)).xyz; vWNrm = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWPos; varying vec3 vWNrm;
        uniform sampler2D tC; uniform sampler2D tR; uniform sampler2D tN; uniform sampler2D tA; uniform sampler2D tD;
        uniform float uScale; uniform float uWet; uniform float uMoss; uniform float uNK; uniform float uAOK;
        // projeção pelo eixo dominante: 1 leitura por mapa (a rocha irregular esconde a emenda)
        vec2 triUV(vec3 p){ vec3 a = abs(normalize(vWNrm));
          return (a.x > a.y && a.x > a.z) ? p.zy : (a.y > a.z ? p.xz : p.xy); }
        vec3 triW(){ vec3 a = abs(normalize(vWNrm)); return (a.x > a.y && a.x > a.z) ? vec3(1,0,0) : (a.y > a.z ? vec3(0,1,0) : vec3(0,0,1)); }
        vec4 tri(sampler2D t){ return texture2D(t, triUV(vWPos*uScale)); }
        vec4 triBig(sampler2D t){ return texture2D(t, triUV(vWPos*uScale*0.17) + 0.37); }
      `)
      .replace('#include <map_fragment>', `
        vec3 rc = tri(tC).rgb;
        // variação em escala grande (quebra a repetição do ladrilho)
        rc *= mix(0.72, 1.25, dot(triBig(tD).rgb, vec3(0.333)) * 1.6);
        rc *= mix(1.0, tri(tA).r, uAOK);
        // micro-detalhe: a mesma superfície em escala 4x mais fina, só de perto ela aparece de fato
        vec3 microC = texture2D(tD, triUV(vWPos*uScale*4.3) + 0.21).rgb;
        rc *= mix(0.82, 1.18, dot(microC, vec3(0.333)) * 1.5);
        float wet = 1.0 - smoothstep(uWet-1.5, uWet+1.5, vWPos.y);
        float up = smoothstep(0.55, 0.9, normalize(vWNrm).y);
        rc = mix(rc, vec3(0.05,0.09,0.045), up * uMoss * smoothstep(0.3, 0.7, triBig(tR).r));
        rc *= mix(1.0, 0.5, wet);
        diffuseColor.rgb *= rc;
      `)
      .replace('#include <roughnessmap_fragment>', `
        float roughnessFactor = roughness * tri(tR).r;
        roughnessFactor = mix(roughnessFactor, 0.15, wet);
      `)
      .replace('#include <normal_fragment_maps>', `
        { vec3 w = triW(); vec3 n = normalize(vWNrm); vec3 p = vWPos*uScale;
          // normal map triplanar (Whiteout blend) em espaço do mundo -> espaço de visão
          vec3 t = texture2D(tN, triUV(p)).xyz*2.0-1.0; t.xy *= uNK;
          vec3 t2 = texture2D(tN, triUV(p*4.3) + 0.21).xyz*2.0-1.0; t.xy += t2.xy * uNK * 0.55; // relevo fino
          vec3 d = w.x > 0.5 ? vec3(0.0, t.y, t.x) * sign(n.x) : (w.y > 0.5 ? vec3(t.x, 0.0, t.y) * sign(n.y) : vec3(t.x, t.y, 0.0) * sign(n.z));
          vec3 wn = normalize(n + d);
          normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz); }
      `);
  };
  m.customProgramCacheKey = () => 'tri';
  return m;
}

/** Rocha da caverna: cliff_side com variação de dark_rock, umidade e musgo. */
export function rockMaterial({ tint = 0xffffff, scale = 0.21, wetLevel = 2.5, moss = 0.0 } = {}) {
  return triMaterial({ set: 'cliff_side', detail: 'dark_rock', scale, tint: new THREE.Color(tint).multiply(new THREE.Color(0x8c95a0)), wetLevel, moss, normalK: 2.2, aoK: 1.2 });
}

/** Chapa metálica (pisos da plataforma, galerias, garagem). `repeat` antigo vira escala. */
export function plateMaterial(repeat = 4, tint = 0xffffff) {
  void repeat;
  return triMaterial({ set: 'metal_plate', detail: 'metal_plate_02', scale: 0.42, tint: new THREE.Color(tint).multiplyScalar(0.62), metalness: 0.8, roughness: 1, normalK: 1, aoK: 1, envMapIntensity: 0.55 });
}

export const mat = {
  graphite: triMaterial({ set: 'metal_plate_02', scale: 0.6, tint: 0x5d6670, metalness: 0.75, roughness: 0.9, envMapIntensity: 0.8 }),
  darkMetal: triMaterial({ set: 'metal_plate_02', scale: 0.7, tint: 0x3a4148, metalness: 0.85, roughness: 0.8, envMapIntensity: 0.8 }),
  matteBlack: new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.62, metalness: 0.55 }),
  slate: triMaterial({ set: 'old_stone_wall', scale: 0.45, tint: 0xb0b0b0 }),
  bronze: new THREE.MeshStandardMaterial({ color: PALETTE.bronze, roughness: 0.45, metalness: 0.9 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xc9a050, roughness: 0.28, metalness: 1.0, emissive: 0x2a1a05 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x0a1218, roughness: 0.05, metalness: 0.2, transmission: 0.0, clearcoat: 1, opacity: 0.85, transparent: true }),
  rail: new THREE.MeshStandardMaterial({ color: 0x2d3842, roughness: 0.35, metalness: 0.95 }),
  glowCyan: new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.electric).multiplyScalar(2.2), toneMapped: false }),
  glowCyanSoft: new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.electric).multiplyScalar(1.05), toneMapped: false }),
  glowAmber: new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.amber).multiplyScalar(2.5), toneMapped: false }),
  wood: triMaterial({ set: 'dark_wooden_planks', scale: 0.55, tint: 0xd8a070, roughness: 0.95 }),
  woodDark: triMaterial({ set: 'dark_wooden_planks', scale: 0.55, tint: 0x9a7050, roughness: 0.95 }),
  stone: null, // preenchido por rockMaterial em hall
};

export function glow(color, k = 2.2) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: false });
}

/* ---------------- forma do morcego (original, angular) ---------------- */
export function batShape(w = 2) {
  // emblema autoral: asas em 3 recortes, cabeça com orelhas curtas
  const s = new THREE.Shape();
  const P = [
    [0, 0.17], [0.045, 0.40], [0.085, 0.19], [0.13, 0.15], [0.32, 0.27], [0.58, 0.40], [0.84, 0.52], [1.0, 0.62],
    [0.95, 0.30], [0.87, 0.07], [0.77, 0.15], [0.69, -0.02], [0.59, 0.08], [0.49, -0.11], [0.39, -0.01], [0.29, -0.17], [0.19, -0.07], [0.09, -0.22], [0, -0.40],
  ];
  s.moveTo(P[0][0] * w, P[0][1] * w);
  for (const [x, y] of P.slice(1)) s.lineTo(x * w, y * w);
  for (const [x, y] of P.slice(1, -1).reverse()) s.lineTo(-x * w, y * w);
  s.closePath();
  return s;
}

/** Desenha o morcego num canvas 2D (para piso/telas). */
export function drawBat(g, cx, cy, w, fill) {
  const P = [
    [0, 0.17], [0.045, 0.40], [0.085, 0.19], [0.13, 0.15], [0.32, 0.27], [0.58, 0.40], [0.84, 0.52], [1.0, 0.62],
    [0.95, 0.30], [0.87, 0.07], [0.77, 0.15], [0.69, -0.02], [0.59, 0.08], [0.49, -0.11], [0.39, -0.01], [0.29, -0.17], [0.19, -0.07], [0.09, -0.22], [0, -0.40],
  ];
  g.beginPath();
  g.moveTo(cx + P[0][0] * w, cy - P[0][1] * w);
  for (const [x, y] of P.slice(1)) g.lineTo(cx + x * w, cy - y * w);
  for (const [x, y] of P.slice(1, -1).reverse()) g.lineTo(cx - x * w, cy - y * w);
  g.closePath(); g.fillStyle = fill; g.fill();
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return c;
}
