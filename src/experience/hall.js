import { Reflector } from 'three/addons/objects/Reflector.js';
import * as THREE from 'three';
import { PALETTE, mat, rockMaterial, displace, fbm, plateMaterial, batShape, drawBat, makeCanvas, glow } from './materials.js';
import { Batch, P, DEG, V3, ringSectorGeo, arcPoints, railing, stair, bridge, collBox, rand } from './util.js';
import { HALL, DISTRICTS, districtSlot } from './data.js';
import { buildHub } from './hub.js';

const R = rand(7);
export const REFLECT_LAYER = 1;

/** Marca para o reflexo do lago tudo o que emite luz própria (barato: sem iluminação). */
export function markReflections(root) {
  root.traverse((o) => {
    const m = o.material; if (!m || o.name === 'UndergroundLake' || o.userData.noReflect) return;
    const ms = Array.isArray(m) ? m : [m];
    if (ms.some((x) => x.isMeshBasicMaterial || (x.isShaderMaterial && x.name !== 'LagoBatcaverna') || (x.emissive && x.emissiveIntensity > 0.3 && x.emissive.getHex() !== 0))) { o.layers.enable(REFLECT_LAYER); return; }
    // estruturas grandes também aparecem no espelho (escuras, iluminadas só pelas luzes marcadas abaixo)
    // só a arquitetura metálica grande (deque, torre, galerias); a rocha fica fora do espelho (custo)
    if (o.isMesh && o.geometry && ms.some((x) => x.metalness >= 0.75)) {
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      if (o.geometry.boundingSphere.radius > 3.5 && o.geometry.boundingSphere.radius < 60) o.layers.enable(REFLECT_LAYER);
    }
  });
  root.traverse((o) => { if (o.isHemisphereLight || o.isDirectionalLight) o.layers.enable(REFLECT_LAYER); });
}

/** Remove triângulos cujo centróide satisfaz `cut` (abre buracos em malhas). */
function cutTriangles(geo, cut) {
  geo = geo.index ? geo.toNonIndexed() : geo;
  const p = geo.attributes.position; const keep = [];
  const a = V3(), b = V3(), c = V3(), m = V3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    m.copy(a).add(b).add(c).multiplyScalar(1 / 3);
    if (!cut(m)) keep.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3));
  return g;
}

/** Como cutTriangles, mas preserva todos os atributos (normal, uv) de uma malha já pronta. */
function dropTriangles(geo, cut) {
  geo = geo.index ? geo.toNonIndexed() : geo;
  const p = geo.attributes.position; const keep = [];
  const a = V3(), b = V3(), c = V3(), m = V3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    m.copy(a).add(b).add(c).multiplyScalar(1 / 3);
    if (!cut(m)) keep.push(i, i + 1, i + 2);
  }
  const g = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(geo.attributes)) {
    const n = attr.itemSize; const out = new Float32Array(keep.length * n);
    keep.forEach((v, k) => { for (let j = 0; j < n; j++) out[k * n + j] = attr.array[v * n + j]; });
    g.setAttribute(name, new THREE.BufferAttribute(out, n));
  }
  return g;
}

function phiOf(v) { return Math.atan2(v.x, -v.z) / DEG; }

/** Abertura de cada boca de túnel no paredão (em φ e y). */
export function portalOpenings() {
  const half = (HALL.portalW / 2) / HALL.wallR / DEG;
  return DISTRICTS.map((d) => { const s = districtSlot(d); return { phi: s.phi, y0: s.y - 0.3, y1: s.y + HALL.portalH, half }; });
}

export function buildHall(renderer, areas = new Set()) {
  // areas: peças do Blender já carregadas (caverna, agua, hub, garagem). Para cada uma, o visual
  // procedural que ela substitui vai para um grupo/lote descartado; os colisores ficam sempre.
  const hasCav = areas.has('caverna'), hasAgua = areas.has('agua'), hasHubArea = areas.has('hub'), hasTeto = areas.has('teto');
  const OCULO = { x: 0, z: -20 };   // centro do óculo e do anel de aço (three), ver tools/blender/oficina/teto
  const root = new THREE.Group(); root.name = 'BATCAVE';
  const colliders = new THREE.Group(); colliders.name = 'COLLIDERS';
  const batch = new Batch();
  const updaters = [];
  const interactables = [];
  const rock = rockMaterial({ wetLevel: 1.5, moss: 0.35 });
  const rockHigh = rockMaterial({ wetLevel: -10, moss: 0.0, scale: 0.12 });
  mat.stone = rock;
  const openings = portalOpenings();
  const cavRoot = hasCav ? new THREE.Group() : root, cavB = hasCav ? new Batch() : batch;
  const aguaRoot = hasAgua ? new THREE.Group() : root, aguaB = hasAgua ? new Batch() : batch;

  /* ---------------- ENV_Cavern: abóbada ---------------- */
  {
    let g = new THREE.SphereGeometry(64, 160, 90);
    g.scale(1, 0.78, 1); g.translate(0, 4, 0);
    // abertura da entrada (corredor vem de +Z)
    g = cutTriangles(g, (m) => m.z > 40 && Math.abs(m.x) < 5.2 && m.y > -1 && m.y < 9.5);
    // óculo do teto (area_teto): a garganta de rocha do Blender sobe por este furo
    if (hasTeto) g = cutTriangles(g, (m) => m.y > 30 && Math.hypot(m.x - OCULO.x, m.z - OCULO.z) < 13);
    g = displace(g, { scale: 0.05, amp: 7, seed: 2, oct: 5, ridge: 0.6 });
    const dome = new THREE.Mesh(g, rockHigh); dome.material.side = THREE.BackSide;
    dome.receiveShadow = true; dome.name = 'CaveCeiling';
    root.add(dome);
    // abertura no teto: um disco de céu noturno pálido de onde cai a luz
    const sky = new THREE.Mesh(new THREE.CircleGeometry(hasTeto ? 10 : 5, 32), glow(hasTeto ? 0xa9c8e0 : 0x9fc4dd, 0.7));
    if (hasTeto) sky.position.set(OCULO.x, 65.5, OCULO.z); else sky.position.set(17, 50, 16);
    sky.rotation.x = Math.PI / 2; root.add(sky);
  }

  /* ---------------- paredão com as 12 bocas ---------------- */
  {
    let g = new THREE.CylinderGeometry(HALL.wallR, HALL.wallR, 52, 260, 90, true, (180 - 84) * DEG, 168 * DEG);
    g.translate(0, 21, 0);
    g = cutTriangles(g, (m) => {
      const f = phiOf(m);
      return openings.some((o) => Math.abs(f - o.phi) < o.half * 0.98 && m.y > o.y0 && m.y < o.y1);
    });
    g = displace(g, { scale: 0.11, amp: 1.6, seed: 9, oct: 5, ridge: 0.5 });
    // achata o relevo junto às bocas para a moldura assentar
    const p = g.attributes.position; const v = V3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); const f = phiOf(v);
      let k = 1;
      for (const o of openings) {
        const dphi = Math.max(0, Math.abs(f - o.phi) - o.half) * DEG * HALL.wallR;
        const dy = Math.max(0, o.y0 - v.y, v.y - o.y1);
        k = Math.min(k, Math.min(1, Math.hypot(dphi, dy) / 2.5));
      }
      const r = Math.hypot(v.x, v.z); const target = HALL.wallR + (r - HALL.wallR) * k + (1 - k) * 0.15;
      v.x *= target / r; v.z *= target / r; p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    // a garganta da cachoeira central (area_agua) fica em r 35,6–37,7: o paredão VISUAL abre ali
    const gv = hasAgua ? dropTriangles(g, (m) => Math.abs(phiOf(m)) < 7 && m.y > -1 && m.y < 26) : g;
    const wall = new THREE.Mesh(gv, rock); wall.material = rockMaterial({ wetLevel: 0.5, moss: 0.25 });
    wall.material.side = THREE.DoubleSide; wall.receiveShadow = true; wall.name = 'RockWalls';
    root.add(wall);
    // colisão do paredão: o próprio relevo (simplificado) — usa a mesma malha
    const wc = new THREE.Mesh(g); colliders.add(wc);
  }

  /* ---------------- pilares naturais, estalactites, rochas da margem ---------------- */
  {
    const stal = [];
    for (let k = 0; k < 4; k++) {
      let g = new THREE.ConeGeometry(1.6 + k * 0.4, 9 + k * 3, 12, 10);
      g.rotateX(Math.PI); g = displace(g, { scale: 0.4, amp: 0.55, seed: k * 3 + 1, ridge: 0.2 });
      stal.push(g);
    }
    for (let i = 0; i < 70; i++) {
      const r = 8 + R() * 50, f = -180 + R() * 360; const pos = P(r, f);
      const top = 4 + 0.78 * Math.sqrt(Math.max(0, 64 * 64 - r * r)) - 3;
      if (top < 26) continue;
      const g = stal[i % 4]; const s = 0.5 + R() * 1.3;
      const m = new THREE.Mesh(g, rockHigh); m.position.set(pos.x, top - (g.parameters?.height || 8) * 0.3, pos.z);
      m.scale.set(s, s * (0.8 + R()), s); m.rotation.y = R() * 6; cavRoot.add(m);
    }
    // grandes pilares naturais sustentando o teto (laterais e frente)
    for (const [r, f, w] of [[46, -110, 4.2], [47, 118, 4.6], [52, -150, 3.6], [53, 155, 3.8], [44, -88, 2.6]]) {
      let g = new THREE.CylinderGeometry(w * 0.7, w * 1.25, 70, 22, 40); g = displace(g, { scale: 0.18, amp: 1.3, seed: f, ridge: 0.8 });
      const m = new THREE.Mesh(g, rock); const p = P(r, f, 22); m.position.copy(p); root.add(m);
      m.castShadow = true;
    }
    // rochas na margem do lago e junto ao paredão
    const boulders = [];
    for (let k = 0; k < 5; k++) boulders.push(displace(new THREE.IcosahedronGeometry(1, 4), { scale: 0.9, amp: 0.35, seed: 11 + k, ridge: 0.15 }));
    const place = (pos, s, sy = 0.7) => {
      const m = new THREE.Mesh(boulders[Math.floor(R() * 5)], rock);
      m.position.copy(pos); m.scale.set(s * (0.8 + R() * 0.6), s * sy, s * (0.8 + R() * 0.6)); m.rotation.y = R() * 6;
      m.castShadow = true; m.receiveShadow = true; cavRoot.add(m);
    };
    for (let i = 0; i < 46; i++) { const f = -100 + R() * 200; place(P(34 + R() * 5, f, -1.2), 2 + R() * 3.5, 0.9); }
    for (let i = 0; i < 40; i++) { const f = 100 + R() * 160; place(P(36 + R() * 16, f, -0.8), 2 + R() * 4); }
    // base rochosa das galerias (plinto) — a galeria inferior apoia numa saliência de rocha
    let pl = ringSectorGeo(HALL.lower.rIn - 0.4, HALL.wallR + 0.6, -HALL.galleryEnd - 4, HALL.galleryEnd + 4, 9, 120);
    pl.translate(0, HALL.lower.y - 0.4, 0);
    pl = displace(pl, { scale: 0.3, amp: 0.45, seed: 4, ridge: 0.4 });
    // abre o canal da cachoeira no plinto
    pl = cutTriangles(pl, (m) => Math.abs(phiOf(m)) < 4.5 && Math.hypot(m.x, m.z) > HALL.lower.rIn + 0.8);
    pl = displace(pl, { scale: 0.5, amp: 0.05, seed: 1 });
    const plinth = new THREE.Mesh(pl, rock); plinth.receiveShadow = true; root.add(plinth);
  }

  /* ---------------- contrafortes e saliências de rocha entre os túneis ---------------- */
  {
    const mids = [-62, -42.5, -23.5, 23.5, 42.5, 62];
    for (const [i, f] of mids.entries()) {
      let g = new THREE.CylinderGeometry(0.55, 0.9, 30, 12, 24); g = displace(g, { scale: 0.35, amp: 0.35, seed: 40 + i, ridge: 0.6 });
      // contraforte fino e recuado: as fachadas dos portais dominam o paredão (como na referência)
      const m = new THREE.Mesh(g, rock); m.position.copy(P(HALL.wallR + 0.5, f, 11)); m.scale.set(1, 1, 0.8); m.rotation.y = -f * DEG; m.castShadow = true; root.add(m);
      collBox(colliders, 1.2, 30, 1.2, P(HALL.wallR + 0.4, f, 11), [0, -f * DEG, 0]);
    }
    // saliências acima da galeria superior, em profundidades diferentes
    for (let i = 0; i < 22; i++) {
      const f = -78 + i * 7.4 + (R() - 0.5) * 3; if (Math.abs(f) < 7) continue;
      let g = new THREE.IcosahedronGeometry(1, 3); g = displace(g, { scale: 0.8, amp: 0.3, seed: 60 + i, ridge: 0.3 });
      const m = new THREE.Mesh(g, rock); m.position.copy(P(HALL.wallR + 1.2 - R() * 1.5, f, 27.5 + R() * 5)); m.scale.set(3 + R() * 3, 1.4 + R() * 2.2, 2.4 + R() * 1.5); m.rotation.y = -f * DEG; cavRoot.add(m);
    }
  }

  /* ---------------- galerias (HUB_Architecture) ---------------- */
  const floorMat = plateMaterial(1, 0xb8c4cc);
  const ledSeg = glow(PALETTE.electric, 0.78);
  for (const lvl of ['lower', 'upper']) {
    const L = HALL[lvl]; const rOut = HALL.wallR - 0.1; const E = HALL.galleryEnd;
    const sectors = [[-E, -5.5, L.rIn], [-5.5, 5.5, L.rIn], [5.5, E, L.rIn]];
    for (const [a, b, rIn] of sectors) {
      const center = a === -5.5;
      const vRoot = center ? aguaRoot : root, vB = center ? aguaB : batch; // ponte central: area_agua
      const rO = center ? rIn + 2.4 : rOut; // no centro vira ponte estreita na frente da cachoeira
      const g = ringSectorGeo(rIn, rO, a, b, 0.8, Math.ceil((b - a) / 1.2));
      const m = new THREE.Mesh(g, floorMat); m.position.y = L.y; m.receiveShadow = true; m.castShadow = true; vRoot.add(m);
      const c = new THREE.Mesh(g); c.position.y = L.y; colliders.add(c);
      // viga de borda com LED (a linha ciano da imagem)
      vB.addMatrix(ringSectorGeo(rIn - 0.05, rIn + 0.22, a, b, 0.75, 48), mat.graphite, new THREE.Matrix4().makeTranslation(0, L.y - 0.05, 0));
      // LED em segmentos (não uma linha contínua) e bem mais fraco: a luz revela a estrutura
      for (let f = a + 0.6; f < b - 1.6; f += 3.2) {
        const led = ringSectorGeo(rIn - 0.08, rIn - 0.03, f, f + 1.6, 0.05, 3);
        vB.addMatrix(led, ledSeg, new THREE.Matrix4().makeTranslation(0, L.y - 0.42, 0));
      }
      // vigas por baixo do piso (juntas e suportes)
      for (let f = a + 1; f < b; f += 4) {
        const j0 = P(rIn + 0.1, f, L.y - 0.8), j1 = P(rO - 0.2, f, L.y - 0.8);
        vB.addMatrix(new THREE.BoxGeometry(0.22, 0.5, j0.distanceTo(j1)), mat.graphite, new THREE.Matrix4().lookAt(j0, j1, V3(0, 1, 0)).setPosition(j0.clone().add(j1).multiplyScalar(0.5)));
      }
      if (center) {
        // parapeito do lado da cachoeira
        railing(arcPoints(rO - 0.1, a, b, L.y, 1.2), { batch: vB, colliders });
      }
    }
    // guarda-corpo interno, com vãos onde chegam as escadas
    const gaps = lvl === 'lower' ? [[-45.6, -40.4], [40.4, 45.6]] : [];
    let cur = -E;
    // com area_agua, o trecho φ[-5,5; 5,5] vira só colisão (o guarda-corpo visual é o da ponte nova)
    const marks = gaps.map(([g0, g1]) => [g0, g1, 'gap']);
    if (hasAgua) marks.push([-5.5, -5.5, 'in'], [5.5, 5.5, 'out']);
    marks.sort((p, q) => p[0] - q[0]);
    let inside = false;
    for (const [g0, g1, kind] of [...marks, [E, E, 'end']]) {
      if (g0 > cur) railing(arcPoints(L.rIn + 0.15, cur, g0, L.y, 1.3), { batch: inside ? aguaB : batch, colliders });
      cur = g1; if (kind === 'in') inside = true; else if (kind === 'out') inside = false;
    }
    // suportes da galeria superior (mãos-francesas no paredão)
    if (lvl === 'upper') {
      for (let f = -E + 3; f <= E - 3; f += 6) {
        if (Math.abs(f) < 6) continue;
        const a0 = P(HALL.wallR - 0.3, f, L.y - 3.2), a1 = P(L.rIn + 0.4, f, L.y - 0.5);
        const d = a1.clone().sub(a0); const len = d.length();
        const b = new THREE.BoxGeometry(0.3, 0.3, len);
        const m4 = new THREE.Matrix4().lookAt(a0, a1, V3(0, 1, 0)).setPosition(a0.clone().add(a1).multiplyScalar(0.5));
        batch.addMatrix(b, mat.graphite, m4);
      }
    }
    // extremidades: muro de pedra fecha as galerias
    for (const s of [-1, 1]) {
      const pc = P((L.rIn + rOut) / 2, s * (E + 0.6), L.y + 1.2);
      collBox(colliders, rOut - L.rIn + 1, 2.6, 0.6, pc, [0, -s * E * DEG + Math.PI / 2, 0]);
    }
  }

  /* ---------------- elevadores entre os níveis (extremidades) ---------------- */
  const lifts = [];
  for (const s of [-1, 1]) {
    const f = s * (HALL.galleryEnd - 3.5); const r = HALL.wallR - 2.3;
    const base = P(r, f, HALL.lower.y);
    const g = new THREE.Group(); g.position.copy(base); g.rotation.y = -f * DEG; root.add(g);
    // torre: 4 colunas + travessas
    for (const [x, z] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.22, 13, 0.22), mat.graphite); c.position.set(x, 5.5, z); g.add(c);
    }
    for (let y = 0; y < 12; y += 2) for (const [x, z, ry] of [[0, -1.6, 0], [0, 1.6, 0], [-1.6, 0, Math.PI / 2], [1.6, 0, Math.PI / 2]]) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.08, 0.08), mat.rail); t.position.set(x, y + 1, z); t.rotation.y = ry; g.add(t);
    }
    const cage = new THREE.Group(); g.add(cage);
    const fl = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 3), plateMaterial(1)); cage.add(fl);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.04, 6, 4), mat.glowCyan); ring.rotation.set(Math.PI / 2, 0, Math.PI / 4); ring.position.y = 0.12; cage.add(ring);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.2), mat.glowCyanSoft); lamp.position.y = 2.6; cage.add(lamp);
    // pisos de colisão do poço nos dois níveis
    collBox(colliders, 3, 0.3, 3, P(r, f, HALL.lower.y - 0.15));
    collBox(colliders, 3, 0.3, 3, P(r, f, HALL.upper.y - 0.15));
    const lift = { group: g, cage, level: 'lower', moving: false, t: 0, f, r, pos: base, name: s < 0 ? 'Elevador oeste' : 'Elevador leste' };
    lifts.push(lift);
    interactables.push({ kind: 'lift', lift, label: () => `E — ${lift.level === 'lower' ? 'subir' : 'descer'} (${lift.name})`, pos: () => P(r, f, lift.level === 'lower' ? HALL.lower.y : HALL.upper.y), radius: 1.9 });
  }

  /* ---------------- hub central (deque, plataforma giratória, torre de comando, laboratório, arsenal) ---------------- */
  const PL = HALL.platform;
  const hub = buildHub({ root, batch, colliders, updaters, interactables, screenTexture, renderer, areas });
  root.userData.hub = hub;

  /* ---------------- pontes e escadas ---------------- */
  for (const s of [-1, 1]) {
    const f = s * 43;
    const a = P(PL.r - 0.3, f, PL.y), b = P(HALL.lower.rIn - 8.95, f, PL.y);
    bridge({ batch, colliders, a, b, width: 3.4 });
    const st = stair({ batch, colliders, start: b, yaw: Math.atan2(b.x, b.z), rise: HALL.lower.y - PL.y, width: 3.4 });
    void st;
  }
  // ponte de entrada (frente) e ponte da garagem (esquerda)
  if (!hasHubArea) bridge({ batch, colliders, a: P(PL.r - 0.3, 180, PL.y), b: V3(0, PL.y, 47), width: 5 });
  else entranceToPier({ batch, colliders, y: PL.y });
  bridge({ batch, colliders, a: P(PL.r - 0.3, -90, PL.y), b: V3(-17.6, PL.y, 0), width: 4 });

  /* ---------------- corredor de entrada (para a introdução) ---------------- */
  {
    const curve = new THREE.CatmullRomCurve3([V3(0, 4, 47), V3(0, 4.2, 58), V3(2, 4.4, 70), V3(-1, 4.6, 84), V3(0, 4.8, 100)]);
    let g = new THREE.TubeGeometry(curve, 80, 4.6, 24, false);
    g = cutTriangles(g, (m) => m.y < 0.15);
    g = displace(g, { scale: 0.35, amp: 0.7, seed: 21, ridge: 0.3 });
    const tunnel = new THREE.Mesh(g, rock); tunnel.material.side = THREE.DoubleSide; root.add(tunnel);
    colliders.add(new THREE.Mesh(g));
    const floor = new THREE.Mesh(new THREE.BoxGeometry(6, 0.4, 56), plateMaterial(3)); floor.position.set(0, PL.y - 0.2, 74); root.add(floor);
    collBox(colliders, 6, 0.4, 56, V3(0, PL.y - 0.2, 74));
    collBox(colliders, 8, 4, 1, V3(0, PL.y + 2, 101));
    // luzes técnicas ao longo do corredor (acendem na introdução)
    const strips = [];
    for (let z = 50; z < 100; z += 5) {
      for (const sx of [-1, 1]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 2.2), mat.glowCyan.clone()); m.position.set(sx * 2.85, PL.y + 0.15, z); root.add(m); strips.push(m);
      }
    }
    root.userData.corridorStrips = strips;
  }

  /* ---------------- escultura do morcego ---------------- */
  {
    // com area_teto o morcego facetado vem do Blender (pendurado no anel); ficam o halo e as luzes
    const batRoot = hasTeto ? new THREE.Group() : root;
    const shape = batShape(12);
    const g = new THREE.ExtrudeGeometry(shape, { depth: 1.8, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.35, bevelSegments: 3 });
    g.center();
    const metal = new THREE.MeshStandardMaterial({ color: 0x1c232b, roughness: 0.38, metalness: 0.95 });
    const bat = new THREE.Mesh(g, metal); bat.position.set(0, 30.5, -34.6); bat.castShadow = true; bat.name = 'BAT_SCULPTURE'; batRoot.add(bat);
    // contorno azul atrás da silhueta (lê de longe, como na arte)
    const rimG = new THREE.ShapeGeometry(batShape(12.6)); rimG.center();
    const rim = new THREE.Mesh(rimG, glow(0x1ea8ff, 1.3)); rim.position.set(0, 30.5, -35.4); batRoot.add(rim);
    const fill = new THREE.SpotLight(0x8fd0ff, hasTeto ? 140 : 600, 40, 0.5, 0.6, 1.2); fill.position.set(0, 22, -16); fill.target.position.set(0, 30.5, -34.6); root.add(fill, fill.target);
    // nervuras metálicas sobre as asas
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(5 - i * 1, 0.3, 0.4), mat.rail); rib.position.set(s * (3.5 + i * 2.8), 31.5 - i * 0.6, -33.3); rib.rotation.z = s * (0.35 - i * 0.12); batRoot.add(rib);
    }
    // contraluz azul por trás (halo)
    const c = makeCanvas(256, 256); const cg = c.getContext('2d'); const grad = cg.createRadialGradient(128, 128, 10, 128, 128, 128);
    grad.addColorStop(0, 'rgba(60,190,255,0.9)'); grad.addColorStop(0.5, 'rgba(20,110,200,0.35)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    cg.fillStyle = grad; cg.fillRect(0, 0, 256, 256);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(54, 26), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: hasTeto ? 0.22 : 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    halo.position.set(0, 30.5, hasTeto ? -36.6 : -35.8); root.add(halo);
    const back = new THREE.PointLight(0x1ea8ff, 120, 26, 1.6); back.position.set(0, 30.5, -35.2); root.add(back);
    // cabos e suportes estruturais
    // vigas de ancoragem até a rocha do teto + chapas de fixação
    for (const [x, rz] of [[-8, 0.3], [-3, 0.08], [3, -0.08], [8, -0.3]]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.45, 10, 0.6), mat.graphite); beam.position.set(x, 36.5, -35.2); beam.rotation.z = rz; batRoot.add(beam);
      const plate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 1.2), mat.darkMetal); plate.position.set(x + Math.sin(rz) * -5, 36.5 + 5 * Math.cos(rz), -35.2); batRoot.add(plate);
    }
  }

  /* ---------------- cachoeiras ---------------- */
  const falls = [];
  falls.push(waterfall({ x: 0, z: -37.1, top: 24, bottom: 16.2, width: 6.5, curveR: HALL.wallR - 0.9 }));
  falls.push(waterfall({ x: 0, z: -37.1, top: 15.6, bottom: 7.6, width: 5.4, curveR: HALL.wallR - 1.6 }));
  falls.push(waterfall({ x: 0, z: -37.1, top: 7.2, bottom: -1, width: 7.2, curveR: HALL.wallR - 2.2 }));
  // rochas que quebram a queda em degraus
  for (const [y, r, sx] of [[15.9, HALL.wallR - 1.2, 4.2], [7.4, HALL.wallR - 1.9, 4.8], [-0.6, HALL.wallR - 3, 6]]) {
    let g = new THREE.IcosahedronGeometry(1, 3); g = displace(g, { scale: 0.9, amp: 0.25, seed: y });
    const m = new THREE.Mesh(g, rockMaterial({ wetLevel: 40, moss: 0.4 })); m.position.copy(P(r, 0, y)); m.scale.set(sx, 0.9, 1.6); aguaRoot.add(m);
  }
  falls.push(waterfall({ x: 34, z: 26, top: 18, bottom: -0.5, width: 4.5, yaw: -2.2 }));
  // cascata em degraus à direita (como na arte): três quedas curtas sobre blocos de rocha
  for (const [x, z, top, bot, w] of [[38.5, 12, 14, 8.2, 3.2], [37.2, 15.5, 8, 3.6, 3.8], [35.8, 19, 3.4, -0.4, 4.4]]) {
    falls.push(waterfall({ x, z, top, bottom: bot, width: w, yaw: -1.9 }));
    let g = new THREE.IcosahedronGeometry(1, 3); g = displace(g, { scale: 0.9, amp: 0.25, seed: x + z });
    const m = new THREE.Mesh(g, rockMaterial({ wetLevel: 40, moss: 0.5 })); m.position.set(x + 1.2, bot - 0.6, z + 0.8); m.scale.set(3.2, 1.6, 2.6); m.rotation.y = -1.9; aguaRoot.add(m);
  }
  falls.push(waterfall({ x: -30, z: 24, top: 6, bottom: -0.5, width: 5, yaw: 2.3 }));
  // com area_agua as lâminas saem (AGUA_* do GLB); a névoa em partículas de cada queda fica
  for (const w of falls) { if (hasAgua) w.sheet.visible = false; root.add(w.group); updaters.push(w.update); }
  // a água precisa nascer de algum lugar: boca de rocha saliente + respingo no topo de cada queda
  {
    const lipMat = rockMaterial({ wetLevel: 60, moss: 0.6, scale: 0.18 });
    const lipGeo = displace(new THREE.IcosahedronGeometry(1, 4), { scale: 0.8, amp: 0.3, seed: 77, ridge: 0.4 });
    const sources = [
      [0, 24.4, -37.0, 8.5, 0],           // queda central, logo abaixo do morcego
      [34, 18.3, 26, 5.6, -2.2],           // queda lateral direita
      [38.5, 14.3, 12, 4.4, -1.9],         // cascata em degraus (topo)
      [-30, 6.3, 24, 6, 2.3],              // queda da esquerda
    ];
    for (const [x, y, z, w, yaw] of sources) {
      const back = yaw === 0 ? V3(0, 0, -0.6) : V3(-Math.sin(yaw), 0, -Math.cos(yaw)).multiplyScalar(0.9);
      const lip = new THREE.Mesh(lipGeo, lipMat); lip.position.set(x, y + 0.5, z).add(back);
      lip.scale.set(w * 0.62, 1.3, 1.9); lip.rotation.y = yaw; aguaRoot.add(lip);
      // fenda escura de onde a água sai
      const slit = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.85, 0.7), new THREE.MeshBasicMaterial({ color: 0x020406 }));
      slit.position.set(x, y + 0.15, z).add(back.clone().multiplyScalar(0.4)); slit.rotation.y = yaw; aguaRoot.add(slit);
      // respingo/névoa no topo
      const N = 60; const pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) pos.set([x + (Math.random() - 0.5) * w * 0.8, y + Math.random() * 0.6, z + (Math.random() - 0.5) * 0.8], i * 3);
      const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const spray = new THREE.Points(pg, new THREE.PointsMaterial({ map: softTexture(), color: 0xdff4ff, size: 0.5, transparent: true, opacity: 0.25, depthWrite: false })); root.add(spray);
      updaters.push((dt) => { const p2 = pg.attributes.position; for (let i = 0; i < N; i++) { let yy = p2.getY(i) - dt * (0.3 + (i % 5) * 0.1); if (yy < y - 0.8) yy = y + 0.4; p2.setY(i, yy); } p2.needsUpdate = true; });
    }
  }
  {
    const l = new THREE.PointLight(0x9fe8ff, 60, 22, 1.8); l.position.set(0, 2, -33); root.add(l);
  }

  /* ---------------- ilhotas de rocha no lago, névoa baixa, vegetação ---------------- */
  {
    const mossy = rockMaterial({ wetLevel: 0.8, moss: 0.85, scale: 0.16 });
    const boulder = (seed) => displace(new THREE.IcosahedronGeometry(1, 4), { scale: 0.7, amp: 0.32, seed, ridge: 0.35 });
    const geos = [boulder(101), boulder(102), boulder(103), boulder(104)];
    const outcrop = (cx, cz, k) => {
      for (let i = 0; i < 4 + (k % 3); i++) {
        const m = new THREE.Mesh(geos[(i + k) % 4], mossy);
        const sc = (1.4 + R() * 2.2) * (i === 0 ? 1.6 : 1);
        m.position.set(cx + (R() - 0.5) * 5, -0.6 + R() * 0.6, cz + (R() - 0.5) * 5);
        m.scale.set(sc * (1 + R() * 0.6), sc * (0.55 + R() * 0.5), sc * (1 + R() * 0.4)); m.rotation.y = R() * 6;
        m.castShadow = true; m.receiveShadow = true; cavRoot.add(m);
      }
    };
    [[-20, 22], [-27, 12], [22, 20], [28, 30], [-34, 32], [12, 34]].forEach(([x, z], k) => outcrop(x, z, k));
    // névoa baixa em camadas (shader de ruído animado, aditivo e bem sutil)
    const fogMat = (k) => new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: { t: { value: 0 }, k: { value: k } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
      fragmentShader: `varying vec3 vW; uniform float t; uniform float k;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
        void main(){ vec2 p = vW.xz * 0.06 * k + vec2(t * 0.02, t * 0.013);
          float f = n(p) * 0.55 + n(p * 2.3 + 7.0) * 0.3 + n(p * 5.1 - t * 0.05) * 0.15;
          float r = length(vW.xz); float m = smoothstep(62.0, 40.0, r) * smoothstep(11.0, 16.0, r);
          float a = smoothstep(0.45, 0.85, f) * m * 0.22;
          gl_FragColor = vec4(vec3(0.55, 0.72, 0.85) * 0.9, a); }`,
    });
    for (const [y, k] of [[0.5, 1.0], [1.3, 0.7], [2.4, 0.5]]) {
      const fm = fogMat(k); const pl = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), fm); pl.rotation.x = -Math.PI / 2; pl.position.y = y; pl.renderOrder = 2; pl.userData.noReflect = true; root.add(pl);
      updaters.push((dt, t) => { fm.uniforms.t.value = t; });
    }
    // espuma em volta da base do deque
    const ringFoam = new THREE.Mesh(new THREE.RingGeometry(HALL.platform.r * 0.97, HALL.platform.r * 1.12, 128, 1), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: { t: { value: 0 } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
      fragmentShader: `varying vec3 vW; uniform float t;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
        void main(){ float r = length(vW.xz); float a = atan(vW.z, vW.x);
          float f = n(vec2(a * 18.0, r * 3.0 - t * 0.6)) * 0.6 + n(vec2(a * 40.0 + 3.0, r * 8.0 - t)) * 0.4;
          float edge = smoothstep(${(HALL.platform.r * 1.12).toFixed(2)}, ${(HALL.platform.r * 0.99).toFixed(2)}, r);
          gl_FragColor = vec4(vec3(0.8, 0.92, 1.0), smoothstep(0.5, 0.8, f) * edge * 0.5); }`,
    }));
    ringFoam.rotation.x = -Math.PI / 2; ringFoam.position.y = 0.0; ringFoam.userData.noReflect = true; root.add(ringFoam);
    updaters.push((dt, t) => { ringFoam.material.uniforms.t.value = t; });
    // vegetação: tufos de folhas e cipós pendurados nas pedras e no paredão (folhas instanciadas)
    const leaf = new THREE.PlaneGeometry(0.5, 0.32); leaf.translate(0, -0.16, 0);
    const lm = new THREE.MeshStandardMaterial({ color: 0x2d5a2a, roughness: 0.85, side: THREE.DoubleSide, emissive: 0x081a06 });
    const NL = 2600; const leaves = new THREE.InstancedMesh(leaf, lm, NL);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); let li = 0;
    const vines = [];
    for (let c = 0; c < 34 && li < NL; c++) {
      // cachos ao longo das bordas: paredão abaixo da galeria inferior, margens e cantos da caverna
      const f = -95 + R() * 190; const r = c < 20 ? HALL.wallR - 1.2 : 44 + R() * 6; const y0 = c < 20 ? 6.2 + R() * 1.5 : 1 + R() * 10;
      const top = P(r, f, y0); const len = 2 + R() * 5;
      for (let i = 0; i < 70 && li < NL; i++) {
        const k = R(); const pos = top.clone().add(V3((R() - 0.5) * 1.6, -k * len, (R() - 0.5) * 1.6));
        e.set((R() - 0.5) * 1.2, R() * 6.28, (R() - 0.5) * 0.8); q.setFromEuler(e);
        m4.compose(pos, q, V3(1, 1, 1).multiplyScalar(0.7 + R() * 0.8)); leaves.setMatrixAt(li++, m4);
      }
      vines.push([top, len]);
    }
    leaves.count = li; cavRoot.add(leaves);
    for (const [top, len] of vines) for (let v = 0; v < 3; v++) cavB.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([top.clone().add(V3((R() - 0.5), 0, (R() - 0.5))), top.clone().add(V3((R() - 0.5) * 1.2, -len * 0.5, (R() - 0.5) * 1.2)), top.clone().add(V3((R() - 0.5), -len, (R() - 0.5)))]), 10, 0.03, 4), new THREE.MeshStandardMaterial({ color: 0x2a3a1c, roughness: 0.9 }));
  }

  /* ---------------- lago ---------------- */
  const water = buildWater();
  root.add(water); updaters.push((dt, t) => water.userData.scroll(dt, t, water.parent?.parent));
  // espuma onde as cachoeiras tocam a água
  for (const [x, z, r] of [[0, -35.2, 4.2], [34, 26, 3.2], [-30, 24, 3.4]]) { const f = foam(r); f.position.set(x, 0.02, z); aguaRoot.add(f); updaters.push((dt, t) => { f.material.uniforms.t.value = t; }); }

  /* ---------------- teto: cabos, tubulações, luminárias ---------------- */
  {
    for (let i = 0; i < 14; i++) {
      const a = P(20 + R() * 25, -120 + R() * 240, 32 + R() * 10), b = P(20 + R() * 25, -120 + R() * 240, 32 + R() * 10);
      const mid = a.clone().add(b).multiplyScalar(0.5); mid.y -= 3 + R() * 5;
      const cv = new THREE.QuadraticBezierCurve3(a, mid, b);
      batch.add(new THREE.TubeGeometry(cv, 24, 0.07, 5), mat.matteBlack);
      if (i % 3 === 0) { const lp = cv.getPoint(0.5); batch.add(new THREE.CylinderGeometry(0.25, 0.4, 0.3, 10), mat.darkMetal, lp); batch.add(new THREE.SphereGeometry(0.16, 8, 8), glow(0xbfe9ff, 2), lp.clone().setY(lp.y - 0.2)); }
    }
    // tubulações industriais ao longo do topo do paredão
    for (const [y, r] of [[25, HALL.wallR - 0.6], [26.2, HALL.wallR - 0.7]]) {
      const pts = arcPoints(r, -80, 80, y, 2);
      batch.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 140, 0.32, 10), mat.darkMetal);
    }
    for (let f = -76; f <= 76; f += 8) batch.add(new THREE.BoxGeometry(0.2, 1.4, 0.8), mat.graphite, P(HALL.wallR - 0.5, f, 25.6), [0, -f * DEG, 0]);
  }

  /* ---------------- morcegos voando ---------------- */
  {
    const bs = new THREE.Shape(); const w = 0.35;
    bs.moveTo(0, 0.05); bs.lineTo(w, 0.15); bs.lineTo(w * 0.7, -0.02); bs.lineTo(w * 0.4, 0.02); bs.lineTo(0, -0.1); bs.lineTo(-w * 0.4, 0.02); bs.lineTo(-w * 0.7, -0.02); bs.lineTo(-w, 0.15); bs.closePath();
    const bg = new THREE.ShapeGeometry(bs); bg.rotateX(-Math.PI / 2);
    const N = 170; const inst = new THREE.InstancedMesh(bg, new THREE.MeshBasicMaterial({ color: 0x050608, side: THREE.DoubleSide }), N);
    const params = Array.from({ length: N }, (_, i) => i < 110
      ? ({ r: 3 + R() * 9, y: 34 + R() * 12, sp: (0.25 + R() * 0.3) * (R() > 0.3 ? 1 : -1), ph: R() * 7, cx: (hasTeto ? 0 : 17) + (R() - 0.5) * 6, cz: (hasTeto ? -20 : 16) + (R() - 0.5) * 6, s: 0.8 + R() * 1.0 }) // enxame junto à abertura do teto
      : ({ r: 10 + R() * 30, y: 28 + R() * 14, sp: (0.08 + R() * 0.12) * (R() > 0.5 ? 1 : -1), ph: R() * 7, cx: -10 + R() * 20, cz: -10 + R() * 10, s: 1 + R() * 1.5 }));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    updaters.push((dt, t) => {
      params.forEach((p, i) => {
        const a = t * p.sp + p.ph; const x = p.cx + Math.cos(a) * p.r, z = p.cz + Math.sin(a) * p.r * 0.7;
        e.set(Math.sin(t * 14 + i) * 0.25, -a + (p.sp > 0 ? 0 : Math.PI), 0);
        q.setFromEuler(e);
        const flap = 0.4 + 0.6 * Math.abs(Math.sin(t * 12 + i));
        m4.compose(V3(x, p.y + Math.sin(t + i) * 1.2, z), q, V3(p.s * flap, p.s, p.s));
        inst.setMatrixAt(i, m4);
      });
      inst.instanceMatrix.needsUpdate = true;
    });
    root.add(inst);
  }

  /* ---------------- partículas suspensas / névoa ---------------- */
  {
    const N = 1600; const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const r = R() * 45, f = R() * 360; const p = P(r, f, R() * 40); pos.set([p.x, p.y, p.z], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dust = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9fd8ff, size: 0.035, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
    root.add(dust);
    updaters.push((dt, t) => { dust.rotation.y = t * 0.004; dust.position.y = Math.sin(t * 0.1) * 0.6; });
    // feixe de luz do teto
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(3, 8, 52, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0x8fc3e6, transparent: true, opacity: 0.018, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    shaft.position.set(17, 26, 16); if (!hasTeto) root.add(shaft);
    if (hasTeto) { const gr = godRays(); root.add(gr.mesh); updaters.push(gr.update); }
    if (hasTeto) {
      // luz fria caindo do óculo sobre o morcego, a cachoeira e a plataforma
      const sun = new THREE.SpotLight(0xcfe4ff, 2600, 95, 0.36, 0.75, 1.15); sun.position.set(0, 63, -20); sun.target.position.set(0, 0, -14); root.add(sun, sun.target);
      // sacadas dos cantos: luz quente de serviço
      for (const s of [-1, 1]) { const l = new THREE.PointLight(0xffa04a, 70, 16, 1.6); l.position.set(s * 32.6, 29, -11.9); root.add(l); }
    }
  }

  /* ---------------- iluminação do salão ---------------- */
  {
    root.add(new THREE.HemisphereLight(0x55606b, 0x1c140e, 0.62));   // base neutra (a arte é rocha escura, não azul): o ciano fica para as luzes
    // luz azul rasante no paredão e no teto: a rocha precisa ler (como na arte), não sumir no preto
    for (const [f, y, tf, ty] of [[-60, 4, -40, 30], [60, 4, 40, 30], [0, 2, 0, 40], [-150, 10, -100, 20], [150, 10, 100, 20]]) {
      const l = new THREE.SpotLight(0x2a8fd0, 560, 90, 0.7, 0.8, 1.3); l.position.copy(P(14, f, y)); l.target.position.copy(P(46, tf, ty)); root.add(l, l.target);
    }
    const key = new THREE.DirectionalLight(0xc3d0db, 1.35); key.position.set(-14, 60, 4); key.target.position.set(0, 0, -10);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 10, far: 120 });
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.04;
    root.add(key, key.target);
    const plat = new THREE.PointLight(0x1ec8ff, 35, 26, 1.5); plat.position.set(0, 7, 0); root.add(plat);
    const scr = new THREE.PointLight(0x2aa8ff, 28, 14, 1.6); scr.position.set(0, 8.5, -9.5); root.add(scr);
    // luz rasante fria nas galerias
    for (const s of [-1, 1]) { const l = new THREE.SpotLight(0x7fb8e0, 260, 70, 0.5, 0.6, 1.4); l.position.copy(P(10, s * 120, 22)); l.target.position.copy(P(36, s * 30, 10)); root.add(l, l.target); }
    for (const s2 of [-1, 1]) { const l = new THREE.SpotLight(0x6d8aa3, 380, 80, 0.6, 0.9, 1.3); l.position.copy(P(8, s2 * 60, 14)); l.target.position.copy(P(48, s2 * 95, 14)); root.add(l, l.target); }
    // luz da entrada
    const ent = new THREE.PointLight(0x5f8fb8, 40, 30, 1.6); ent.position.set(0, 6, 40); root.add(ent);
  }

  root.add(batch.build({ castShadow: false }));
  root.updateMatrixWorld(true);
  colliders.updateMatrixWorld(true);
  return { root, colliders, updaters, interactables, lifts, water };
}

/* ======================= peças auxiliares ======================= */

/**
 * Com area_hub.glb a frente do deque desce por escadaria até um píer em y≈0,6 (z 14,7–25), como na arte.
 * O GLB traz o visual da escadaria e do píer; aqui ficam os colisores deles e a ligação até o corredor
 * (z 47, y 1,5): rampa suave 25→33 e ponte plana 33→47.
 */
function entranceToPier({ batch, colliders, y }) {
  const PIER = 0.6, W = 5;
  const slope = (z0, y0, z1, y1, w) => {
    const len = Math.hypot(z1 - z0, y1 - y0), ang = Math.atan2(y1 - y0, z1 - z0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, len));
    m.position.set(0, (y0 + y1) / 2 - 0.15 / Math.cos(ang), (z0 + z1) / 2); m.rotation.set(-ang, 0, 0, 'YXZ'); colliders.add(m);
  };
  // patamar do GLB (z 11,2–12,1, topo no nível do deque) e escadaria (z 12,1 → 14,7): rampa invisível
  collBox(colliders, 5.6, 0.4, 1.3, V3(0, y - 0.2, 11.55));
  slope(12.1, y, 14.7, PIER, 5.4);
  // píer (z 14,7 → 25): piso e guardas laterais invisíveis (o GLB tem corrimãos até z≈24,8)
  collBox(colliders, 5.4, 0.4, 10.6, V3(0, PIER - 0.2, 19.85));
  for (const s of [-1, 1]) collBox(colliders, 0.2, 2.4, 10.6, V3(s * 2.75, PIER + 1.2, 19.85));
  // rampa visível 25 → 33 e ponte plana 33 → 47
  const z0 = 25, z1 = 33; const len = Math.hypot(z1 - z0, y - PIER), ang = Math.atan2(y - PIER, z1 - z0);
  const midY = (PIER + y) / 2, midZ = (z0 + z1) / 2;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-ang, 0, 0, 'YXZ'));
  const tilt = (dy, dx = 0) => new THREE.Matrix4().compose(V3(dx, midY + dy, midZ), q, V3(1, 1, 1));
  batch.addMatrix(new THREE.BoxGeometry(W, 0.35, len), mat.darkMetal, tilt(-0.175));
  for (const s of [-1, 1]) {
    batch.addMatrix(new THREE.BoxGeometry(0.22, 0.6, len), mat.graphite, tilt(-0.45, s * W / 2));
    batch.addMatrix(new THREE.BoxGeometry(0.08, 0.07, len), mat.rail, tilt(1.1, s * (W / 2 - 0.05)));
    batch.addMatrix(new THREE.BoxGeometry(0.05, 0.035, len), mat.glowCyanSoft, tilt(0.06, s * (W / 2 - 0.05)));
    for (let k = 0; k <= 4; k++) { const t = k / 4; batch.add(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8), mat.rail, V3(s * (W / 2 - 0.05), PIER + (y - PIER) * t + 0.55, z0 + (z1 - z0) * t)); }
    const rc = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.4, len)); rc.position.set(s * (W / 2 - 0.05), midY + 1.2, midZ); rc.rotation.set(-ang, 0, 0, 'YXZ'); colliders.add(rc);
  }
  slope(z0, PIER, z1, y, W);
  bridge({ batch, colliders, a: V3(0, y, z1), b: V3(0, y, 47), width: W });
}

/** Feixes de luz do óculo: cone aberto com raios em faixas que respiram devagar (aditivo, sem luz real). */
function godRays() {
  const top = new THREE.Vector3(0, 64, -20), bot = new THREE.Vector3(0, 1, -11);
  const L = top.distanceTo(bot);
  const mk = (r0, r1, k, seed) => {
    const g = new THREE.CylinderGeometry(r0, r1, L, 96, 1, true);
    const m = new THREE.ShaderMaterial({
      uniforms: { t: { value: 0 }, k: { value: k }, seed: { value: seed } },
      vertexShader: `varying float h; varying float ang; varying vec3 wp; uniform float seed;
        void main(){ h = position.y / ${L.toFixed(2)} + 0.5; ang = atan(position.z, position.x);
          vec4 w = modelMatrix * vec4(position,1.0); wp = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `varying float h; varying float ang; varying vec3 wp; uniform float t; uniform float k; uniform float seed;
        float n1(float x){ return fract(sin(x*127.1+seed)*43758.5453); }
        float vn(float x){ float i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f); return mix(n1(i), n1(i+1.0), f); }
        void main(){
          float a = ang * 3.0;   // ~19 faixas na volta
          float s = vn(a + t*0.05) * 0.7 + vn(a*2.3 - t*0.03 + 7.0) * 0.5;
          s = pow(clamp(s - 0.25, 0.0, 1.0) * 1.6, 2.2);
          float fade = pow(h, 1.4) * smoothstep(1.0, 0.93, h) * (0.75 + 0.25*sin(t*0.4 + seed));
          vec3 c = mix(vec3(0.45,0.7,1.0), vec3(0.85,0.93,1.0), h);
          gl_FragColor = vec4(c * s * fade * k, 1.0);
        }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; return mesh;
  };
  const grp = new THREE.Group(); grp.name = 'RAIOS_OCULO';
  const outer = mk(8.5, 17, 0.07, 1.0), inner = mk(5.5, 10, 0.1, 4.0);
  grp.add(outer, inner);
  grp.position.copy(top).add(bot).multiplyScalar(0.5);
  grp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(bot).normalize());
  return { mesh: grp, update: (dt, t) => { outer.material.uniforms.t.value = t; inner.material.uniforms.t.value = t; } };
}

function foam(radius) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { t: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vUv; uniform float t;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){ vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.y, p.x);
        float rings = n(vec2(a * 3.0, r * 6.0 - t * 1.6)) * 0.6 + n(vec2(a * 7.0 + 3.0, r * 14.0 - t * 2.4)) * 0.4;
        float k = smoothstep(1.0, 0.25, r) * smoothstep(0.45, 0.75, rings);
        gl_FragColor = vec4(vec3(0.85, 0.95, 1.0) * 1.2, k * 0.75); }`,
  });
  const g = new THREE.CircleGeometry(radius, 48); g.rotateX(-Math.PI / 2);
  return new THREE.Mesh(g, m);
}

function softTexture() {
  const c = makeCanvas(128, 128); const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
export { softTexture };

/** Cachoeira: lâmina com shader de fluxo + espuma + névoa de partículas. */
function waterfall({ x, z, top, bottom, width, yaw = 0, curveR = 0 }) {
  const group = new THREE.Group();
  const h = top - bottom;
  let g;
  if (curveR) {
    const arc = width / curveR;
    g = new THREE.CylinderGeometry(curveR, curveR + 0.6, h, 32, 40, true, Math.PI - arc / 2, arc);
    g.translate(0, (top + bottom) / 2, 0);
    // pequenas ondulações de queda
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const yy = p.getY(i); const k = 1 + Math.sin(yy * 0.7) * 0.004; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
  } else {
    g = new THREE.PlaneGeometry(width, h, 16, 40);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const t = (p.getY(i) + h / 2) / h; p.setZ(i, Math.pow(1 - t, 2) * 2.2 + Math.sin(p.getX(i) * 1.7) * 0.2); }
    g.translate(0, (top + bottom) / 2, 0);
  }
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { t: { value: 0 } },
    vertexShader: 'varying vec2 vUv; varying vec3 vP; void main(){ vUv=uv; vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
    fragmentShader: `varying vec2 vUv; varying vec3 vP; uniform float t;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){
        vec2 uv=vec2(vUv.x*14.0, vUv.y*3.0 + t*2.2);
        float s = n(uv*vec2(1.0,1.0))*0.6 + n(uv*vec2(2.3,4.0)+3.1)*0.4;
        float streak = smoothstep(0.35,0.9,s);
        float edge = smoothstep(0.0,0.12,vUv.x)*smoothstep(1.0,0.88,vUv.x);
        float foam = smoothstep(0.12,0.0,vUv.y);
        vec3 c = mix(vec3(0.25,0.55,0.72), vec3(0.85,0.97,1.0), streak);
        float a = (0.25 + streak*0.6 + foam*0.5) * edge;
        gl_FragColor = vec4(c*0.72, a*0.75);
      }`,
  });
  const sheet = new THREE.Mesh(g, m); group.add(sheet);
  // névoa na base
  const N = 260; const pos = new Float32Array(N * 3); const seeds = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos.set([(Math.random() - 0.5) * width, bottom + Math.random() * 3, (Math.random() - 0.5) * 2], i * 3); seeds[i] = Math.random(); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mist = new THREE.Points(pg, new THREE.PointsMaterial({ map: softTexture(), color: 0xcfefff, size: 0.5, transparent: true, opacity: 0.12, depthWrite: false }));
  group.add(mist);
  if (curveR) { mist.position.set(0, 0, -curveR + 0.8); }
  group.position.set(curveR ? 0 : x, 0, curveR ? 0 : z); group.rotation.y = yaw;
  const update = (dt) => {
    m.uniforms.t.value += dt;
    const p = pg.attributes.position;
    for (let i = 0; i < N; i++) {
      let yy = p.getY(i) + dt * (0.6 + seeds[i]);
      if (yy > bottom + 4) yy = bottom;
      p.setY(i, yy); p.setX(i, p.getX(i) + Math.sin(yy + seeds[i] * 9) * dt * 0.3);
    }
    p.needsUpdate = true;
  };
  return { group, update, sheet };
}

function buildWater() {
  // mapa normal de ondas gerado em canvas (tileável)
  // 512 px e 5 oitavas: ondas grandes + marola fina (antes 256 / 4)
  const S = window.__qualidade === 'baixa' ? 256 : 512; const c = makeCanvas(S, S); const g = c.getContext('2d'); const img = g.createImageData(S, S);
  const hgt = (x, y) => fbm(Math.cos(x / S * 6.283) * 2 + 5, Math.sin(x / S * 6.283) * 2, Math.cos(y / S * 6.283) * 2 + Math.sin(y / S * 6.283) * 1.3, 5);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = hgt(x + 1, y) - hgt(x - 1, y), dy = hgt(x, y + 1) - hgt(x, y - 1);
    let nx = -dx * 6, ny = -dy * 6, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * S + x) * 4; img.data[i] = (nx * 0.5 + 0.5) * 255; img.data[i + 1] = (ny * 0.5 + 0.5) * 255; img.data[i + 2] = (nz * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const normals = new THREE.CanvasTexture(c); normals.wrapS = normals.wrapT = THREE.RepeatWrapping; normals.anisotropy = 8;
  // Espelho em tempo real, mas barato: a câmera refletida só enxerga a camada 1 (LEDs, telas,
  // cachoeiras, véus — materiais sem iluminação), em meia resolução. É o que a água da arte reflete.
  const shader = {
    name: 'LagoBatcaverna',
    uniforms: {
      color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
      tNormal: { value: null }, time: { value: 0 },
      deep: { value: new THREE.Color(0x020d14) }, shallow: { value: new THREE.Color(0x064356) }, glowC: { value: new THREE.Color(0x19c6ee) },
      fogColor: { value: new THREE.Color() }, fogDensity: { value: 0 },
      // pés das quedas d'água (x, z, raio): espuma e anéis de ondulação
      quedas: { value: [new THREE.Vector3(0, -34.2, 6), new THREE.Vector3(34, 26.3, 4.5), new THREE.Vector3(-30.3, 24.2, 4.2), new THREE.Vector3(32.6, 17.3, 3.4)] },
    },
    vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW; varying float vDepth;
      void main(){ vUv = textureMatrix * vec4(position, 1.0); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
        vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform sampler2D tNormal; uniform float time;
      uniform vec3 deep; uniform vec3 shallow; uniform vec3 glowC; uniform vec3 fogColor; uniform float fogDensity; uniform vec3 quedas[4];
      varying vec4 vUv; varying vec3 vW; varying float vDepth;
      void main(){
        vec2 p = vW.xz;
        vec3 n1 = texture2D(tNormal, p * 0.045 + vec2(time * 0.010, time * 0.006)).xyz * 2.0 - 1.0;
        vec3 n2 = texture2D(tNormal, p * 0.12 - vec2(time * 0.007, -time * 0.011)).xyz * 2.0 - 1.0;
        vec3 n3 = texture2D(tNormal, p * 0.31 + vec2(-time * 0.02, time * 0.015)).xyz * 2.0 - 1.0;
        vec3 n4 = texture2D(tNormal, p * 0.83 + vec2(time * 0.05, -time * 0.035)).xyz * 2.0 - 1.0;   // marola fina
        vec2 nn = n1.xy * 0.45 + n2.xy * 0.3 + n3.xy * 0.15 + n4.xy * 0.1;
        // anéis de ondulação no pé de cada queda
        float espumaQ = 0.0;
        for (int i = 0; i < 4; i++) { vec2 dq = p - quedas[i].xy; float r = length(dq); float raio = quedas[i].z;
          float anel = sin(r * 5.5 - time * 4.0) * exp(-r / raio) ; nn += normalize(dq + 1e-4) * anel * 0.22;
          espumaQ += smoothstep(raio * 1.1, raio * 0.25, r) * (0.55 + 0.45 * n3.x); }
        vec3 N = normalize(vec3(nn.x, 1.6, nn.y));
        float far = clamp(vDepth / 60.0, 0.0, 1.0);
        vec4 uv = vUv; uv.xy += nn * mix(0.05, 0.015, far) * uv.w;
        // luzes refletidas em água se esticam na vertical: 5 amostras ao longo do eixo da tela
        vec3 refl = vec3(0.0);
        for (int k = -1; k <= 1; k++) { vec4 u2 = uv; u2.y += float(k) * 0.018 * uv.w * (0.6 + abs(nn.y) * 2.0); refl += texture2DProj(tDiffuse, u2).rgb * (k == 0 ? 0.46 : 0.27); }   // 3 amostras (eram 5)
        vec3 V = normalize(cameraPosition - vW);
        float fres = 0.12 + 0.88 * pow(1.0 - max(dot(V, N), 0.0), 3.0);
        float d = length(vW.xz);
        float near = smoothstep(42.0, 8.0, d);               // água iluminada pela plataforma
        float shore = smoothstep(46.0, 60.0, d);               // margens mais escuras
        vec3 base = mix(deep, shallow, near * 0.45) * (1.0 - shore * 0.6);
        // manchas de profundidade (água mais funda e mais rasa)
        float patchN = texture2D(tNormal, p * 0.008 + 0.3).r;
        base *= mix(0.7, 1.15, patchN);
        // cáusticas: filetes de luz que dançam perto do deque
        float ca = pow(abs(sin((n2.x + n3.y) * 6.0 + time * 0.8)), 18.0) * smoothstep(20.0, 12.5, d) * smoothstep(11.8, 12.6, d);
        base += glowC * ca * 0.6;
        // cintilação: picos das ondas pegam a luz ciano
        float spark = pow(max(nn.x + nn.y, 0.0), 6.0) * near * 2.5;
        // brilho especular da luz do óculo (de cima, levemente ao fundo) e do deque iluminado
        vec3 L = normalize(vec3(0.0, 1.0, -0.35)); vec3 Hh = normalize(L + V);
        float spec = pow(max(dot(N, Hh), 0.0), 260.0) * 1.8 + pow(max(dot(N, normalize(normalize(vec3(-vW.x, 6.0, -vW.z)) + V)), 0.0), 120.0) * near * 0.6;
        // espuma: anel na borda da plataforma (r 12–13,5) e nos pés das quedas, rasgada pelo ruído
        float d0 = length(vW.xz);
        float borda = smoothstep(11.9, 12.4, d0) * smoothstep(14.2, 12.6, d0);
        float rasgo = smoothstep(0.35, 0.75, n2.x * 0.5 + 0.5 + n4.y * 0.3);
        float espuma = clamp((borda * 0.8 + espumaQ) * rasgo, 0.0, 1.0);
        vec3 col = base + refl * (0.35 + fres * 1.4) + glowC * spark + vec3(0.75, 0.88, 1.0) * spec;
        col = mix(col, vec3(0.62, 0.74, 0.8), espuma * 0.55);
        float f = 1.0 - exp(-fogDensity * fogDensity * vDepth * vDepth);
        gl_FragColor = vec4(mix(col, fogColor, f), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  };
  const water = new Reflector(new THREE.CircleGeometry(70, 96), {
    shader, clipBias: 0.003, multisample: 0,
    textureWidth: Math.round(innerWidth * 0.4), textureHeight: Math.round(innerHeight * 0.4),
  });
  water.camera.layers.set(REFLECT_LAYER);
  water.material.uniforms.tNormal.value = normals;
  water.rotation.x = -Math.PI / 2; water.position.y = -0.05; water.name = 'UndergroundLake';
  water.userData.scroll = (dt, t, scene) => {
    const u = water.material.uniforms; u.time.value += dt;
    if (scene?.fog) { u.fogColor.value.copy(scene.fog.color); u.fogDensity.value = scene.fog.density; }
  };
  return water;
}

/** Telas animadas originais: mapa dos 12 distritos, telemetria, câmeras, diagnóstico. */
export function screenTexture(kind) {
  const W = kind === 'map' ? 2048 : 512, H = kind === 'map' ? 420 : 300;
  const c = makeCanvas(W, H); const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const rr = rand(kind.length * 31);
  // nós do mapa: um "continente" estilizado com 12 distritos + Capital
  const nodes = Array.from({ length: 12 }, (_, i) => ({ x: 0.3 + 0.4 * (Math.cos(i * 0.52) * 0.5 + 0.5) + (rr() - 0.5) * 0.08, y: 0.2 + 0.6 * ((i * 0.37) % 1) }));
  let acc = 0; let frame = 0;
  const bars = Array.from({ length: 24 }, () => rr());
  function draw(t) {
    g.fillStyle = '#020a12'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(30,200,255,0.10)'; g.lineWidth = 1;
    for (let x = 0; x < W; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y < H; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    if (kind === 'map') {
      // painéis laterais
      const panel = (x, y, w, h) => { g.strokeStyle = 'rgba(40,200,255,0.7)'; g.lineWidth = 2; g.strokeRect(x, y, w, h); };
      panel(20, 20, 380, H - 40); panel(W - 400, 20, 380, H - 40); panel(420, 20, W - 840, H - 40);
      // continente
      const mx = 420, mw = W - 840;
      g.save(); g.beginPath();
      for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2; const r = 0.36 + fbm(Math.cos(a) * 1.5, Math.sin(a) * 1.5, 3.3, 3) * 0.12; const px = mx + mw / 2 + Math.cos(a) * r * mw * 0.95, py = H / 2 + Math.sin(a) * r * H * 1.1; i ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.closePath(); g.fillStyle = 'rgba(20,120,190,0.25)'; g.fill(); g.strokeStyle = 'rgba(90,220,255,0.9)'; g.lineWidth = 3; g.stroke(); g.restore();
      const cap = { x: mx + mw * 0.5, y: H * 0.45 };
      nodes.forEach((n, i) => {
        const px = mx + n.x * mw, py = 40 + n.y * (H - 80);
        g.strokeStyle = `rgba(90,220,255,${0.3 + 0.3 * Math.sin(t * 2 + i)})`; g.lineWidth = 2; g.beginPath(); g.moveTo(cap.x, cap.y); g.lineTo(px, py); g.stroke();
        const k = (t * 0.4 + i / 12) % 1; g.fillStyle = '#9ff0ff'; g.beginPath(); g.arc(cap.x + (px - cap.x) * k, cap.y + (py - cap.y) * k, 3, 0, 7); g.fill();
        g.fillStyle = '#29d4ff'; g.beginPath(); g.arc(px, py, 9 + Math.sin(t * 3 + i) * 2, 0, 7); g.fill();
        g.fillStyle = '#e5f7ff'; g.font = 'bold 18px Inter, Arial'; g.fillText(String(i + 1).padStart(2, '0'), px + 12, py - 10);
      });
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cap.x, cap.y, 12, 0, 7); g.fill();
      // varredura
      const sx = mx + ((t * 120) % mw); g.fillStyle = 'rgba(120,230,255,0.15)'; g.fillRect(sx, 22, 40, H - 44);
      // painel esquerdo: skyline + barras
      g.strokeStyle = '#29d4ff'; g.lineWidth = 2; g.beginPath(); g.moveTo(40, H - 60);
      for (let i = 0; i < 18; i++) { const bh = 40 + bars[i] * 160; g.lineTo(40 + i * 19, H - 60 - bh); g.lineTo(40 + (i + 1) * 19, H - 60 - bh); }
      g.lineTo(380, H - 60); g.stroke();
      g.fillStyle = 'rgba(41,212,255,0.8)'; for (let i = 0; i < 16; i++) { const v = 0.5 + 0.5 * Math.sin(t * 1.5 + i); g.fillRect(40 + i * 21, H - 50, 14, -v * 26); }
      // painel direito: radar
      const cx = W - 210, cy = H / 2; g.strokeStyle = 'rgba(41,212,255,0.7)';
      for (let r = 30; r <= 150; r += 40) { g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); }
      const a = t * 1.4; g.fillStyle = 'rgba(41,212,255,0.25)'; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 150, a, a + 0.5); g.closePath(); g.fill();
      for (let i = 0; i < 6; i++) { const b = i * 1.1 + 0.3; g.fillStyle = '#9ff0ff'; g.fillRect(cx + Math.cos(b) * (50 + i * 15), cy + Math.sin(b) * (50 + i * 15), 4, 4); }
    } else if (kind === 'tele') {
      g.strokeStyle = '#29d4ff'; g.lineWidth = 2;
      for (let k = 0; k < 3; k++) { g.beginPath(); for (let x = 0; x < W; x += 4) { const y = 60 + k * 85 + Math.sin(x * 0.03 + t * (1 + k) + k) * 18 + Math.sin(x * 0.11 + t * 3) * 5; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
      g.fillStyle = '#e5f7ff'; g.font = '14px monospace'; g.fillText('SYS ' + (98 + Math.sin(t) * 1.5).toFixed(1) + '%', 12, 20);
    } else if (kind === 'cams') {
      for (let i = 0; i < 4; i++) {
        const x = (i % 2) * W / 2, y = Math.floor(i / 2) * H / 2;
        g.fillStyle = `rgb(${10 + i * 4},${24 + i * 3},${32 + i * 5})`; g.fillRect(x + 4, y + 4, W / 2 - 8, H / 2 - 8);
        g.strokeStyle = 'rgba(41,212,255,0.6)'; g.strokeRect(x + 4, y + 4, W / 2 - 8, H / 2 - 8);
        g.fillStyle = 'rgba(160,220,255,0.2)'; for (let k = 0; k < 6; k++) g.fillRect(x + 20 + k * 36, y + H / 2 - 30 - ((k * 37 + i * 11) % 60), 24, 30 + ((k * 37 + i * 11) % 60));
        if ((Math.floor(t * 2) + i) % 2) { g.fillStyle = '#ff3b3b'; g.beginPath(); g.arc(x + 20, y + 20, 5, 0, 7); g.fill(); }
        g.fillStyle = '#e5f7ff'; g.font = '12px monospace'; g.fillText('CAM 0' + (i + 1), x + 32, y + 24);
      }
      const sy = (t * 60) % H; g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(0, sy, W, 6);
    } else {
      // diagnóstico do veículo
      g.strokeStyle = '#29d4ff'; g.lineWidth = 2; g.strokeRect(60, 110, 380, 90); g.beginPath(); g.arc(140, 210, 34, 0, 7); g.arc(360, 210, 34, 0, 7); g.stroke();
      for (let i = 0; i < 6; i++) { const v = 0.5 + 0.5 * Math.sin(t + i); g.fillStyle = v > 0.85 ? '#ffb347' : '#29d4ff'; g.fillRect(30 + i * 75, 40, 60 * v, 12); }
      g.fillStyle = '#e5f7ff'; g.font = '13px monospace'; g.fillText('PRESSAO PNEUS OK  /  TURBINA ' + Math.round(70 + Math.sin(t) * 8) + '%', 30, 280);
    }
    tex.needsUpdate = true;
  }
  draw(0);
  const perto = new THREE.Vector3(0, 5, -8);
  return { tex, update: (dt, t) => {
    acc += dt; if (acc < (window.__qualidadeAtual === 'baixa' ? 0.3 : 0.15)) return; acc = 0;
    const c = window.__cam; if (c && c.position.distanceToSquared(perto) > 1600) return;   // telas longe da câmera não sobem textura
    frame++; draw(t);
  } };
}
