import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat } from './materials.js';

export const DEG = Math.PI / 180;
export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/** Ponto em coordenadas polares do salão: φ a partir de -Z, positivo para +X. */
export function P(r, phiDeg, y = 0) {
  const p = phiDeg * DEG;
  return new THREE.Vector3(r * Math.sin(p), y, -r * Math.cos(p));
}

/** Normaliza atributos para poder fundir geometrias diferentes. */
function normGeo(g) {
  g = g.index ? g.toNonIndexed() : g.clone();
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  g.morphAttributes = {};
  g.clearGroups();
  return g;
}

/**
 * Agrupa peças estáticas por material e funde num só mesh por material:
 * centenas de postes, degraus e parafusos viram poucas chamadas de desenho.
 */
export class Batch {
  constructor() { this.buckets = new Map(); this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); }
  add(geo, material, pos = V3(), rot = [0, 0, 0], scale = [1, 1, 1]) {
    const g = normGeo(geo);
    this._e.set(rot[0], rot[1], rot[2], 'YXZ');
    this._m.compose(pos, this._q.setFromEuler(this._e), new THREE.Vector3(...scale));
    g.applyMatrix4(this._m);
    if (!this.buckets.has(material)) this.buckets.set(material, []);
    this.buckets.get(material).push(g);
    return g;
  }
  addMatrix(geo, material, matrix) {
    const g = normGeo(geo); g.applyMatrix4(matrix);
    if (!this.buckets.has(material)) this.buckets.set(material, []);
    this.buckets.get(material).push(g);
  }
  build({ castShadow = false, receiveShadow = true } = {}) {
    const group = new THREE.Group();
    for (const [m, list] of this.buckets) {
      const merged = mergeGeometries(list, false);
      const mesh = new THREE.Mesh(merged, m);
      mesh.castShadow = castShadow; mesh.receiveShadow = receiveShadow;
      group.add(mesh);
    }
    this.buckets.clear();
    return group;
  }
}

/** Setor de anel com espessura (piso de galeria). Topo em y=0. */
export function ringSectorGeo(rIn, rOut, phi0, phi1, thick = 0.45, seg = 64) {
  const s = new THREE.Shape();
  const pt = (r, f) => [r * Math.sin(f * DEG), r * Math.cos(f * DEG)];
  s.moveTo(...pt(rIn, phi0));
  for (let i = 0; i <= seg; i++) s.lineTo(...pt(rOut, phi0 + (phi1 - phi0) * i / seg));
  for (let i = seg; i >= 0; i--) s.lineTo(...pt(rIn, phi0 + (phi1 - phi0) * i / seg));
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false, curveSegments: 1 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -thick, 0);
  // UV planar em XZ para a textura de chapa
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * 0.25, p.getZ(i) * 0.25);
  return g;
}

/** Pontos ao longo de um arco do salão. */
export function arcPoints(r, phi0, phi1, y, step = 1.5) {
  const len = Math.abs(phi1 - phi0) * DEG * r; const n = Math.max(2, Math.ceil(len / step));
  const out = [];
  for (let i = 0; i <= n; i++) out.push(P(r, phi0 + (phi1 - phi0) * i / n, y));
  return out;
}

const postGeo = new THREE.BoxGeometry(0.14, 1.1, 0.14);
const glassMat = new THREE.MeshStandardMaterial({ color: 0x3a6a8a, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });

/**
 * Guarda-corpo ao longo de uma polilinha: postes, corrimão, vidro e fita de LED no pé.
 * Também cria a parede de colisão invisível (1,3 m) em `colliders`.
 */
export function railing(points, { batch, colliders, glass = true, led = true, ledMat = mat.glowCyanSoft, height = 1.1 }) {
  let acc = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const d = b.clone().sub(a); const len = d.length(); if (len < 1e-3) continue;
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const yaw = Math.atan2(d.x, d.z);
    // corrimão
    batch.add(new THREE.BoxGeometry(0.08, 0.07, len + 0.02), mat.rail, mid.clone().setY(mid.y + height), [0, yaw, 0]);
    batch.add(new THREE.BoxGeometry(0.04, 0.04, len), mat.rail, mid.clone().setY(mid.y + 0.45), [0, yaw, 0]);
    if (led) batch.add(new THREE.BoxGeometry(0.05, 0.035, len), ledMat, mid.clone().setY(mid.y + 0.06), [0, yaw, 0]);
    if (glass) batch.add(new THREE.PlaneGeometry(len, height - 0.15), glassMat, mid.clone().setY(mid.y + height / 2), [0, yaw + Math.PI / 2, 0]);
    // postes a cada ~1,6 m
    acc += len;
    if (acc > 1.1 || i === 0) { acc = 0; batch.add(postGeo, mat.rail, a.clone().setY(a.y + 0.55)); }
    if (colliders) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.4, len + 0.1));
      m.position.copy(mid).setY(mid.y + 1.2); m.rotation.y = yaw; colliders.add(m);
    }
  }
  const last = points[points.length - 1];
  batch.add(postGeo, mat.rail, last.clone().setY(last.y + 0.55));
}

export function collBox(colliders, w, h, d, pos, rot = [0, 0, 0]) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
  m.position.copy(pos); m.rotation.set(rot[0], rot[1], rot[2], 'YXZ'); colliders.add(m); return m;
}

/**
 * Escada reta: degraus reais de 0,18 × 0,28, longarinas, guarda-corpos com LED
 * e rampa contínua invisível para a colisão (sem tremor nos degraus).
 * start: base (Vector3), dir: yaw em rad (direção de subida no plano), rise: altura total.
 */
export function stair({ batch, colliders, start, yaw, rise, width = 3, stepMat = mat.darkMetal }) {
  const n = Math.round(rise / 0.18); const h = rise / n; const run = 0.28; const L = n * run;
  const fwd = V3(Math.sin(yaw), 0, Math.cos(yaw));
  const side = V3(fwd.z, 0, -fwd.x);
  for (let i = 0; i < n; i++) {
    const c = start.clone().addScaledVector(fwd, run * (i + 0.5)).setY(start.y + h * (i + 1) - 0.06);
    batch.add(new THREE.BoxGeometry(width, 0.12, run + 0.02), stepMat, c, [0, yaw, 0]);
    batch.add(new THREE.BoxGeometry(width * 0.96, 0.02, 0.03), mat.glowCyanSoft, c.clone().addScaledVector(fwd, run / 2 - 0.02).setY(c.y + 0.065), [0, yaw, 0]);
  }
  const slope = Math.atan2(rise, L);
  const midC = start.clone().addScaledVector(fwd, L / 2).setY(start.y + rise / 2);
  for (const s of [-1, 1]) {
    const sc = midC.clone().addScaledVector(side, s * (width / 2 + 0.08));
    batch.add(new THREE.BoxGeometry(0.16, 0.42, Math.hypot(L, rise) + 0.3), mat.graphite, sc.clone().setY(sc.y - 0.15), [-slope, yaw, 0]);
    const pts = [];
    for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push(start.clone().addScaledVector(fwd, L * t).addScaledVector(side, s * (width / 2 + 0.05)).setY(start.y + rise * t)); }
    railing(pts, { batch, colliders, glass: false });
  }
  // rampa de colisão: caixa inclinada cujo topo coincide com a linha dos bocais
  const m = new THREE.Mesh(new THREE.BoxGeometry(width, 0.3, Math.hypot(L, rise)));
  m.position.copy(midC).setY(midC.y - 0.15 / Math.cos(slope));
  m.rotation.set(-slope, yaw, 0, 'YXZ');
  colliders.add(m);
  return { end: start.clone().addScaledVector(fwd, L).setY(start.y + rise), length: L };
}

/** Ponte reta entre dois pontos de mesmo nível. */
export function bridge({ batch, colliders, a, b, width = 3.4, rails = true, floorMat }) {
  const d = b.clone().sub(a); const len = d.length(); const yaw = Math.atan2(d.x, d.z);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  batch.add(new THREE.BoxGeometry(width, 0.35, len), floorMat || mat.darkMetal, mid.clone().setY(a.y - 0.175), [0, yaw, 0]);
  // vigas laterais e treliça por baixo
  const side = V3(Math.cos(yaw), 0, -Math.sin(yaw));
  for (const s of [-1, 1]) batch.add(new THREE.BoxGeometry(0.22, 0.6, len), mat.graphite, mid.clone().addScaledVector(side, s * width / 2).setY(a.y - 0.45), [0, yaw, 0]);
  const fwd = d.clone().normalize();
  for (let t = 1.5; t < len - 0.5; t += 3) batch.add(new THREE.BoxGeometry(width, 0.12, 0.12), mat.graphite, a.clone().addScaledVector(fwd, t).setY(a.y - 0.7), [0, yaw, 0]);
  collBox(colliders, width, 0.4, len, mid.clone().setY(a.y - 0.2), [0, yaw, 0]);
  if (rails) for (const s of [-1, 1]) {
    const pa = a.clone().addScaledVector(side, s * (width / 2 - 0.05)), pb = b.clone().addScaledVector(side, s * (width / 2 - 0.05));
    railing([pa, pb], { batch, colliders });
  }
}

export function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of ms) { for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); } m.dispose(); }
    }
  });
}

export function rand(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
}
