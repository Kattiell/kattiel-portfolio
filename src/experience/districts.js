import { vistaTextura } from './vistas.js';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DISTRICTS, HALL, districtSlot } from './data.js';
import { mat, glow, rockMaterial, displace, makeCanvas, plateMaterial, triMaterial, uTime } from './materials.js';
import { Batch, P, DEG, V3, collBox, rand } from './util.js';
import { motes, PORTAL_LIFE } from './vida.js';

const W = HALL.portalW, H = HALL.portalH, LEN = HALL.tunnelLen;
const WALL_H = H - W / 2; // altura reta antes do arco

function archShape(w, h, r = w / 2) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(-w / 2, h - r);
  s.absarc(0, h - r, r, Math.PI, 0, true);
  s.lineTo(w / 2, 0); s.closePath();
  return s;
}
/** Moldura em arco (anel de arco) com espessura. */
function rectShape(w, h) { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(-w / 2, h); s.lineTo(w / 2, h); s.lineTo(w / 2, 0); s.closePath(); return s; }
function archFrame(wIn, hIn, t, depth, rect = false) {
  const outer = rect ? rectShape(wIn + t * 2, hIn + t) : archShape(wIn + t * 2, hIn + t, wIn / 2 + t);
  const hole = rect ? rectShape(wIn, hIn) : archShape(wIn, hIn, wIn / 2); outer.holes.push(new THREE.Path(hole.getPoints(32)));
  return new THREE.ExtrudeGeometry(outer, { depth, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 1, curveSegments: 32 });
}

function medallion(num, color) {
  const c = makeCanvas(256, 256); const g = c.getContext('2d');
  g.fillStyle = '#0b0f14'; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill();
  g.lineWidth = 12; g.strokeStyle = '#c9a050'; g.beginPath(); g.arc(128, 128, 112, 0, 7); g.stroke();
  g.lineWidth = 3; g.strokeStyle = '#' + new THREE.Color(color).getHexString(); g.beginPath(); g.arc(128, 128, 96, 0, 7); g.stroke();
  g.fillStyle = '#f3e7c6'; g.font = 'bold 120px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(num), 128, 136);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.85, 48), new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.55, metalness: 0.6, roughness: 0.4 }));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 8, 48), mat.gold);
  const grp = new THREE.Group(); grp.add(m, ring); return grp;
}

/** Véu no fundo do túnel: redemoinho que se abre quando o feitiço termina. */
function veilMaterial(color, vista) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { t: { value: 0 }, open: { value: 0 }, c: { value: new THREE.Color(color) }, vista: { value: vista } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
    fragmentShader: `varying vec2 vUv; uniform float t; uniform float open; uniform vec3 c; uniform sampler2D vista;
      void main(){ vec2 p = vUv-0.5; p.y*=1.1; float r=length(p); float a=atan(p.y,p.x);
        float sw = sin(a*5.0 + r*18.0 - t*(1.5+open*5.0))*0.5+0.5;
        float core = smoothstep(0.55,0.0,r);
        // fechado: fundo escuro em degradê (profundidade), só um sopro da cor do tema; aberto: o redemoinho acende
        float k = mix(0.05, 1.0, open);
        vec3 col = c*(0.3+sw*0.6)*core*k + vec3(1.0)*smoothstep(0.18,0.0,r)*open*0.8;
        float a2 = mix(smoothstep(0.75, 0.1, r) * 0.92, core, open);
        // fechado: a janela para o distrito (pintura em vistas.js), com uma leve respiração de luz
        vec3 v = texture2D(vista, vUv).rgb * (0.95 + 0.06*sin(t*0.8));
        float fecha = 1.0 - smoothstep(0.0, 0.35, open);
        col = mix(col*2.0, v, fecha);
        a2 = mix(a2, 0.97, fecha);
        gl_FragColor = vec4(col, a2); }`,
  });
}

export function buildDistricts() {
  const root = new THREE.Group(); root.name = 'DISTRICTS';
  const colliders = new THREE.Group();
  const portals = [];
  for (const d of DISTRICTS) {
    const slot = districtSlot(d);
    const grp = new THREE.Group(); grp.name = `Portal_${String(d.id).padStart(2, '0')}`;
    grp.position.copy(P(HALL.wallR, slot.phi, slot.y)); grp.rotation.y = -slot.phi * DEG;
    root.add(grp);
    const b = new Batch(); const rr = rand(d.id * 97);
    const ctx = { d, b, grp, rr, updaters: [], fx: {} };
    for (const o of PORTAL_LIFE[d.id] || []) { const m = motes(o); m.position.set(...o.pos); grp.add(m); }

    // túnel: casca em arco + piso
    const rect = [3, 6, 12].includes(d.id);
    const shell = archFrame(W, H, 1.0, LEN, rect); shell.translate(0, 0, -LEN);
    const tunnelMat = d.id === 6 || d.id === 3 || d.id === 5 ? plateMaterial(2, 0x8090a0) : rockMaterial({ wetLevel: -5, scale: 0.35 });
    const tunnel = new THREE.Mesh(shell, tunnelMat); tunnel.receiveShadow = true; grp.add(tunnel);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.3, LEN + 0.8), d.id === 7 || d.id === 10 ? mat.wood : plateMaterial(2, 0x7a858d));
    floor.position.set(0, -0.15, -LEN / 2 + 0.4); grp.add(floor);
    // véu
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(W, H), veilMaterial(d.color, vistaTextura(d))); veil.position.set(0, H / 2, -LEN + 0.6); grp.add(veil);
    const tl = new THREE.PointLight(d.color, 46, 16, 1.6); tl.position.set(0, H * 0.55, -4.5); grp.add(tl);
    // luz quente no fundo do túnel: cada boca vira uma janela acesa para o distrito
    // (uma luz por túnel: a do fundo saiu por desempenho; a principal ficou mais funda e mais forte)
    tl.position.set(0, H * 0.5, -5.5); tl.distance = 24; tl.decay = 1.5;   // mais fundo: a 2,4 m ela batia de frente no ouro do arco e o bloom estourava // perto da boca: o interior acende e a luz derrama na galeria
    // derramamento de luz no piso da galeria, na frente da boca
    { const c = document.createElement('canvas'); c.width = c.height = 64; const g2 = c.getContext('2d'); const gr = g2.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64);
      const spill = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.1, 4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), color: new THREE.Color(d.color).multiplyScalar(0.55), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      spill.rotation.x = -Math.PI / 2; spill.position.set(0, 0.03, 1.4); grp.add(spill); }
    // moldura principal
    const frameMat = { 1: mat.gold, 2: mat.slate, 3: mat.darkMetal, 4: mat.wood, 5: mat.graphite, 6: mat.graphite, 7: mat.wood, 8: mat.darkMetal, 9: mat.gold, 10: mat.woodDark, 11: mat.woodDark, 12: mat.woodDark }[d.id];
    // arco genérico só onde o tema não traz moldura própria (cada distrito com silhueta diferente)
    if (![2, 3, 5, 6, 7, 10, 12].includes(d.id)) { const fr = archFrame(W, H, 0.45, 0.6); const frm = new THREE.Mesh(fr, frameMat); frm.position.z = -0.1; frm.castShadow = true; grp.add(frm); }
    // medalhão numerado
    const med = medallion(d.id, d.color); med.position.set(0, H + 1.15, 0.65); grp.add(med);
    // tema (decoração procedural: some quando a fachada modelada no Blender carrega)
    const nTheme = grp.children.length;
    THEMES[d.id](ctx);
    grp.add(b.build({ castShadow: false }));
    const themeObjs = grp.children.slice(nTheme);
    // colisão do túnel: paredes laterais e fundo
    const toWorld = (x, y, z) => grp.localToWorld(V3(x, y, z));
    grp.updateMatrixWorld(true);
    collBox(colliders, 0.4, H, LEN, toWorld(-W / 2 - 0.2, H / 2, -LEN / 2), [0, -slot.phi * DEG, 0]);
    collBox(colliders, 0.4, H, LEN, toWorld(W / 2 + 0.2, H / 2, -LEN / 2), [0, -slot.phi * DEG, 0]);
    collBox(colliders, W, 0.3, LEN, toWorld(0, -0.15, -LEN / 2), [0, -slot.phi * DEG, 0]);
    collBox(colliders, W, H, 0.4, toWorld(0, H / 2, -LEN + 1.2), [0, -slot.phi * DEG, 0]); // véu fechado
    // marcador de interação (losango)
    // grade de ferro que barra a boca até o feitiço: barras seguindo o arco, travessas e fechadura de runas
    const barrier = new THREE.Group(); barrier.position.z = 0.25; grp.add(barrier);
    {
      const iron = new THREE.MeshStandardMaterial({ color: 0x23282e, roughness: 0.55, metalness: 0.9 });
      const r = W / 2, rect = [3, 6, 12].includes(d.id);
      const heightAt = (x) => (rect ? H : (H - r) + Math.sqrt(Math.max(0, r * r - x * x)));
      // todas as barras, pontas e travessas fundidas numa malha só (1 chamada de desenho por grade)
      const parts = [];
      for (let x = -r + 0.25; x <= r - 0.24; x += 0.42) {
        const h = heightAt(x) - 0.05;
        parts.push(new THREE.CylinderGeometry(0.045, 0.045, h, 6).translate(x, h / 2, 0));
        parts.push(new THREE.ConeGeometry(0.07, 0.22, 6).rotateX(Math.PI).translate(x, 0.11, 0));
      }
      for (const y of [1.2, 2.6, WALL_H + 0.6]) { const bw = 2 * Math.sqrt(Math.max(0, r * r - Math.max(0, y - (H - r)) ** 2)) - 0.1; parts.push(new THREE.BoxGeometry(rect ? W - 0.1 : (y > H - r ? bw : W - 0.1), 0.12, 0.1).translate(0, y, 0)); }
      barrier.add(new THREE.Mesh(mergeGeometries(parts.map((g) => g.index ? g.toNonIndexed() : g), false), iron));
      const lock = new THREE.Group(); lock.position.set(0, 2.0, 0.08); barrier.add(lock);
      lock.add(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 32), iron)); lock.children[0].rotation.x = Math.PI / 2;
      const rune = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 6, 48), glow(d.color, 1.8)); rune.position.z = 0.07; lock.add(rune);
      for (let k = 0; k < 6; k++) { const g = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.02), glow(d.color, 1.6)); const a2 = k / 6 * Math.PI * 2; g.position.set(Math.cos(a2) * 0.28, Math.sin(a2) * 0.28, 0.08); g.rotation.z = a2; lock.add(g); }
      barrier.userData.lock = lock; barrier.userData.rune = rune;
    }
    const barrierColl = collBox(colliders, W, H, 0.3, toWorld(0, H / 2, 0.3), [0, -slot.phi * DEG, 0]);
    void barrierColl;
    const mk = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), glow(0x76e5f5, 2)); mk.position.set(W / 2 + 0.9, 1.3, 1.6); grp.add(mk);
    const mkRing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.02, 4, 4), glow(0x76e5f5, 1.4)); mkRing.position.copy(mk.position); grp.add(mkRing);
    const portal = {
      d, grp, veil, light: tl, marker: mk, markerRing: mkRing, slot, barrier, themeObjs, medallion: med,
      anchor: () => toWorld(0, H * 0.5, 0.6),
      front: () => toWorld(0, 0, 3.2),
      mouth: () => toWorld(0, 1.7, 0),
      deep: () => toWorld(0, 1.7, -LEN + 0.5),
      state: 'idle', open: 0, updaters: ctx.updaters, fx: ctx.fx || {},
    };
    portals.push(portal);
  }
  root.updateMatrixWorld(true); colliders.updateMatrixWorld(true);
  const update = (dt, t, focused) => {
    uTime.value = t;
    for (const p of portals) {
      p.veil.material.uniforms.t.value = t;
      p.veil.material.uniforms.open.value = p.open;
      const f = p === focused ? 1 : 0;
      p.marker.rotation.y += dt * 1.5; p.marker.position.y = 1.3 + Math.sin(t * 2 + p.d.id) * 0.08;
      p.marker.scale.setScalar(1 + f * 0.5); p.markerRing.rotation.z += dt * (0.5 + f * 3); p.markerRing.lookAt(p.marker.getWorldPosition(V3()).add(V3(0, 0, 0)));
      const fl = FIRE.has(p.d.id) ? 1 + Math.sin(t * 11 + p.d.id * 3) * 0.07 + Math.sin(t * 27 + p.d.id) * 0.05 + Math.sin(t * 4.3) * 0.04 : 1 + Math.sin(t * 1.7 + p.d.id) * 0.05;
      p.light.intensity = (32 + p.open * 12 + f * 6) * fl;   // ouro polido perto da luz estourava (D9)   // era 95: a boca estourava no bloom
      // a grade sobe para dentro da rocha conforme o feitiço abre o portal; a fechadura gira e acende
      const lift = Math.min(1, p.open * 1.25); p.barrier.position.y = lift * (H + 0.6);
      const lk = p.barrier.userData.lock; lk.rotation.z += dt * (0.3 + p.open * 8 + f * 0.8);
      p.barrier.userData.rune.material.color.setHex(p.d.color).multiplyScalar(0.8 + f * 0.8 + p.open * 1.8);
      for (const u of p.updaters) u(dt, t, p);
    }
  };
  return { root, colliders, portals, update };
}

/* ======================= fachadas temáticas ======================= */
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (r1, r2, h, s = 16) => new THREE.CylinderGeometry(r1, r2, h, s);
const OX = W / 2 + 0.9; // primeira coluna fora da boca

const FIRE = new Set([1, 2, 7, 9, 10, 12]);
const _cloth = new Map();
function clothMaterial(color) {
  if (_cloth.has(color)) return _cloth.get(color);
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.78, side: THREE.DoubleSide, envMapIntensity: 0.4 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float hang = 1.0 - uv.y; hang *= hang; // preso no alto, solto embaixo
        float ph = position.x * 1.7 + position.y * 0.9;
        transformed.z += (sin(uTime * 2.1 + ph) * 0.09 + sin(uTime * 3.7 + ph * 2.3) * 0.035) * hang;
        transformed.x += sin(uTime * 1.3 + ph) * 0.03 * hang;`);
  };
  _cloth.set(color, m); return m;
}
function banner(b, x, y, color, h = 2.6) {
  b.add(new THREE.PlaneGeometry(0.9, h, 3, 12), clothMaterial(color), V3(x, y, 0.75));
  b.add(cyl(0.04, 0.04, 1.1, 6), mat.gold, V3(x, y + h / 2 + 0.05, 0.75), [0, 0, Math.PI / 2]);
  b.add(box(0.35, 0.35, 0.02), glow(0xd9b45a, 0.7), V3(x, y + 0.3, 0.78), [0, 0, Math.PI / 4]);
}
function lantern(ctx, x, y, z, color = 0xffb060) {
  ctx.b.add(box(0.3, 0.42, 0.3), mat.darkMetal, V3(x, y, z));
  const g = new THREE.Mesh(box(0.2, 0.3, 0.2), glow(color, 2.2)); g.position.set(x, y, z + 0.01); ctx.grp.add(g);
  ctx.updaters.push((dt, t) => { g.material.color.setHex(color).multiplyScalar(2 + Math.sin(t * 9 + x) * 0.25 + Math.sin(t * 23) * 0.12); });
}

const THEMES = {
  /* 01 — Luxo: arco dourado, cristais, lustre, bandeiras */
  1(ctx) {
    const { b, grp, rr } = ctx;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(W / 2 + 0.75, 0.16, 10, 64, Math.PI), mat.gold); ring.position.set(0, WALL_H, 0.4); grp.add(ring);
    for (const s of [-1, 1]) {
      b.add(cyl(0.32, 0.38, WALL_H + 0.3, 20), new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.25, metalness: 0.05 }), V3(s * (W / 2 + 0.75), (WALL_H + 0.3) / 2, 0.4));
      b.add(cyl(0.45, 0.45, 0.25, 20), mat.gold, V3(s * (W / 2 + 0.75), WALL_H + 0.3, 0.4));
      banner(b, s * (OX + 1.6), 3.8, 0x6b1730);
    }
    const crys = new THREE.MeshPhysicalMaterial({ color: 0xeaf4ff, roughness: 0.05, metalness: 0.1, emissive: 0x6688aa, emissiveIntensity: 0.6, transparent: true, opacity: 0.9 });
    const crystals = [];
    for (let i = 0; i < 16; i++) {
      const s = i < 8 ? -1 : 1; const h = 0.6 + rr() * 2.2;
      const m = new THREE.Mesh(new THREE.ConeGeometry(0.16 + rr() * 0.12, h, 6), crys);
      m.position.set(s * (OX + 0.3 + rr() * 1.6), h / 2, 0.6 + rr() * 1.2); m.rotation.set((rr() - 0.5) * 0.5, rr() * 3, (rr() - 0.5) * 0.6); grp.add(m); crystals.push(m);
    }
    // lustre dentro do túnel
    const ch = new THREE.Group(); ch.position.set(0, H - 0.8, -3); grp.add(ch);
    ch.add(new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.05, 6, 32), mat.gold));
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const l = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), glow(0xffe2a0, 3)); l.position.set(Math.cos(a) * 0.8, -0.05, Math.sin(a) * 0.8); ch.children[0].add(l); }
    ch.children[0].rotation.x = Math.PI / 2;
    ctx.fx.crystals = crystals;
    ctx.updaters.push((dt, t) => { ch.rotation.y += dt * 0.2; });
  },
  /* 02 — Alvenaria: castelo de pedra com ameias, grade levadiça, tochas */
  2(ctx) {
    const { b, grp } = ctx;
    const stone = triMaterial({ set: 'old_stone_wall', scale: 0.5, tint: 0xc8c0b4 });
    for (let row = 0; row < 9; row++) for (let i = -6; i <= 6; i++) {
      const x = i * 0.95 + (row % 2) * 0.47; const y = row * 0.62 + 0.31;
      if (Math.abs(x) < W / 2 + 0.2 && y < H + 0.2) continue;
      b.add(box(0.9, 0.58, 0.7), stone, V3(x, y, 0.35), [0, 0, (ctx.rr() - 0.5) * 0.03]);
    }
    for (const s of [-1, 1]) {
      b.add(cyl(1.1, 1.25, 7.6, 12), stone, V3(s * (W / 2 + 2.8), 3.8, 0.5));
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; b.add(box(0.5, 0.6, 0.5), stone, V3(s * (W / 2 + 2.8) + Math.cos(a) * 1.05, 7.9, 0.5 + Math.sin(a) * 1.05)); }
      banner(ctx.b, s * (W / 2 + 0.9), 3.6, 0x7a1d1d, 2.2);
      lantern(ctx, s * (W / 2 + 1.6), 2.6, 1.0);
    }
    for (let i = -6; i <= 6; i += 2) b.add(box(0.7, 0.6, 0.7), stone, V3(i * 0.62, H + 0.3 + 1.3, 0.35));
    // grade levadiça (sobe no feitiço)
    const gate = new THREE.Group(); grp.add(gate);
    for (let i = -6; i <= 6; i++) gate.add(Object.assign(new THREE.Mesh(box(0.07, H, 0.07), mat.darkMetal), {}));
    gate.children.forEach((c, i) => c.position.set((i - 6) * (W / 13), H / 2, -0.8));
    for (let j = 1; j < 7; j++) { const h = new THREE.Mesh(box(W, 0.07, 0.07), mat.darkMetal); h.position.set(0, j * H / 7, -0.8); gate.add(h); }
    gate.position.y = H * 0.55; // meio aberta: dá para ver o túnel
    ctx.fx.gate = gate;
  },
  /* 03 — Tecnologia: moldura quadrada com circuitos, holograma de cidade */
  3(ctx) {
    const { b, grp } = ctx;
    const c = glow(0x00b9ed, 2.4);
    b.add(box(W + 2.4, 0.3, 0.5), mat.darkMetal, V3(0, H + 0.4, 0.3));
    for (const s of [-1, 1]) {
      b.add(box(0.5, H + 0.6, 0.5), mat.darkMetal, V3(s * (W / 2 + 1), (H + 0.6) / 2, 0.3));
      for (let k = 0; k < 7; k++) {
        const y = 0.6 + k * 0.9; const len = 0.6 + ((k * 37) % 5) * 0.25;
        b.add(box(len, 0.04, 0.02), c, V3(s * (W / 2 + 1.3 + len / 2), y, 0.56));
        b.add(box(0.04, 0.4, 0.02), c, V3(s * (W / 2 + 1.3 + len), y + 0.2, 0.56));
        b.add(cyl(0.06, 0.06, 0.03, 10), c, V3(s * (W / 2 + 1.3 + len), y + 0.4, 0.56), [Math.PI / 2, 0, 0]);
      }
      // painel lateral luminoso
      const pn = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), glow(0x0a87c4, 1.4)); pn.position.set(s * (W / 2 + 2.6), 4.2, 0.62); grp.add(pn);
    }
    for (const s of [-1, 1]) {
      b.add(box(1.1, H + 2.4, 0.9), mat.darkMetal, V3(s * (W / 2 + 2.1), (H + 2.4) / 2, 0.45));
      for (let k = 0; k < 9; k++) b.add(box(1.16, 0.06, 0.95), glow(0x00b9ed, k % 3 ? 0.7 : 1.6), V3(s * (W / 2 + 2.1), 0.5 + k * 0.95, 0.45));
      b.add(box(0.5, 0.5, 0.5), glow(0x76e5f5, 1.4), V3(s * (W / 2 + 2.1), H + 2.65, 0.45));
    }
    const deep = new THREE.PointLight(0x00b9ed, 30, 14, 1.4); deep.position.set(0, 2.5, -9); grp.add(deep);
    // holograma de cidade dentro
    const holo = new THREE.Group(); holo.position.set(0, 0.6, -3.5); grp.add(holo);
    const hm = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x29d4ff).multiplyScalar(1.6), wireframe: true, transparent: true, opacity: 0.6, toneMapped: false });
    for (let i = 0; i < 14; i++) { const h = 0.4 + ((i * 53) % 7) * 0.35; const m = new THREE.Mesh(box(0.35, h, 0.35), hm); m.position.set(((i % 5) - 2) * 0.6, h / 2, (Math.floor(i / 5) - 1) * 0.6); holo.add(m); }
    const rings = [];
    for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(1.8 + i * 0.35, 0.03, 6, 64), glow(0x76e5f5, 2)); r.position.set(0, 3.2, 0.5); grp.add(r); r.visible = false; rings.push(r); }
    ctx.fx.rings = rings;
    ctx.updaters.push((dt) => { holo.rotation.y += dt * 0.4; });
  },
  /* 04 — Pesca: arco de madeira, redes, cordas, boias, barco no canal */
  4(ctx) {
    const { b, grp, rr } = ctx;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(W / 2 + 0.6, 0.22, 8, 40, Math.PI), mat.wood); ring.position.set(0, WALL_H, 0.5); grp.add(ring);
    for (const s of [-1, 1]) b.add(cyl(0.22, 0.26, WALL_H + 0.2, 10), mat.wood, V3(s * (W / 2 + 0.6), WALL_H / 2, 0.5));
    // rede em losango pendurada dos dois lados
    const netMat = new THREE.LineBasicMaterial({ color: 0xc8b48a });
    for (const s of [-1, 1]) {
      const pts = [];
      for (let i = 0; i <= 8; i++) for (let j = 0; j <= 10; j++) {
        const x = s * (W / 2 + 1.0 + i * 0.25), y = H + 0.6 - j * 0.42 - Math.sin(i / 8 * Math.PI) * 0.5;
        if (i < 8) pts.push(V3(x, y, 0.8), V3(x + s * 0.25, y - 0.2, 0.8));
        if (j < 10) pts.push(V3(x, y, 0.8), V3(x, y - 0.42, 0.8));
      }
      grp.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), netMat));
      for (let k = 0; k < 4; k++) b.add(new THREE.SphereGeometry(0.18, 12, 10), new THREE.MeshStandardMaterial({ color: k % 2 ? 0xe8e2d2 : 0xc94a3a, roughness: 0.5 }), V3(s * (W / 2 + 1.2 + rr() * 1.5), H + 0.2 - k * 0.9, 0.95));
      // cordas
      b.add(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V3(s * (W / 2 + 0.6), H + 0.5, 0.7), V3(s * (W / 2 + 1.8), H - 1.2, 0.9), V3(s * (W / 2 + 3), H + 0.2, 0.7)), 16, 0.035, 5), new THREE.MeshStandardMaterial({ color: 0xb89a66, roughness: 0.9 }));
    }
    for (const s of [-1, 1]) {
      for (let k = 0; k < 3; k++) b.add(cyl(0.32, 0.36, H + 1.4 - k * 1.2, 10), mat.woodDark, V3(s * (W / 2 + 1.1 + k * 0.75), (H + 1.4 - k * 1.2) / 2, 1.1 + (k % 2) * 0.3));
      b.add(new THREE.TorusGeometry(0.55, 0.2, 10, 20), new THREE.MeshStandardMaterial({ color: 0xc94a3a, roughness: 0.6 }), V3(s * (W / 2 + 2.2), 2.4, 1.55));
      for (let k = 0; k < 4; k++) b.add(new THREE.TorusGeometry(0.33, 0.05, 6, 16), new THREE.MeshStandardMaterial({ color: 0xb89a66, roughness: 0.9 }), V3(s * (W / 2 + 1.1), 0.8 + k * 0.12, 1.1), [Math.PI / 2, 0, 0]);
    }
    b.add(box(W + 5, 0.45, 0.5), mat.woodDark, V3(0, H + 1.0, 1.1));
    // rede pesada drapeada sobre a viga
    { const pts = []; for (let i = 0; i <= 24; i++) for (let j = 0; j <= 4; j++) { const x = -W / 2 - 2 + i * ((W + 4) / 24); const y = H + 0.9 - j * 0.35 - Math.sin(i / 24 * Math.PI * 3) * 0.25; if (i < 24) pts.push(V3(x, y, 1.4), V3(x + (W + 4) / 24, y - 0.1, 1.4)); if (j < 4) pts.push(V3(x, y, 1.4), V3(x, y - 0.35, 1.4)); } grp.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xd8c49a }))); }
    // água no piso do túnel e barco
    const w = new THREE.Mesh(new THREE.PlaneGeometry(W - 1.5, LEN - 3), new THREE.MeshStandardMaterial({ color: 0x0a4d5c, emissive: 0x0b6b7a, emissiveIntensity: 0.6, roughness: 0.05, metalness: 0.3 }));
    w.rotation.x = -Math.PI / 2; w.position.set(0, 0.03, -LEN / 2 - 1); grp.add(w);
    const boat = new THREE.Group(); boat.position.set(0.8, 0.15, -6); grp.add(boat);
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.35, 3, 12, 1, false, 0, Math.PI), mat.wood); hull.rotation.set(Math.PI / 2, 0, Math.PI); boat.add(hull);
    ctx.updaters.push((dt, t) => { boat.position.y = 0.15 + Math.sin(t * 1.3) * 0.05; boat.rotation.z = Math.sin(t) * 0.04; });
  },
  /* 05 — Energia: turbina em anel, tubos, raios elétricos */
  5(ctx) {
    const { b, grp } = ctx;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(W / 2 + 0.5, 0.45, 16, 48, Math.PI * 1.5), mat.graphite); ring.position.set(0, H / 2 + 0.2, 0.4); ring.rotation.z = -Math.PI / 4; grp.add(ring);
    const coil = new THREE.Mesh(new THREE.TorusGeometry(W / 2 + 0.5, 0.12, 8, 96, Math.PI * 1.5), glow(0x6c7bff, 1.8)); coil.position.copy(ring.position); coil.position.z = 0.8; coil.rotation.z = -Math.PI / 4; grp.add(coil);
    // tampa o vão inferior do anel (o túnel é arco, o anel é círculo)
    for (const s of [-1, 1]) {
      b.add(cyl(0.45, 0.45, 7.4, 16), mat.darkMetal, V3(s * (W / 2 + 2.2), 3.7, 0.6));
      b.add(cyl(0.6, 0.6, 0.35, 16), mat.rail, V3(s * (W / 2 + 2.2), 6.2, 0.6));
      b.add(cyl(0.6, 0.6, 0.35, 16), mat.rail, V3(s * (W / 2 + 2.2), 1.2, 0.6));
      b.add(new THREE.TorusGeometry(0.5, 0.12, 8, 16, Math.PI / 2), mat.darkMetal, V3(s * (W / 2 + 1.7), 7.4, 0.6), [0, 0, s > 0 ? 0 : Math.PI / 2]);
    }
    for (const s of [-1, 1]) {
      for (let k = 0; k < 6; k++) b.add(new THREE.TorusGeometry(0.75, 0.16, 8, 24), k % 2 ? mat.bronze : mat.graphite, V3(s * (W / 2 + 2.2), 2 + k * 0.42, 0.6), [Math.PI / 2, 0, 0]);
      for (let k = 0; k < 5; k++) b.add(cyl(0.34 - k * 0.02, 0.34 - k * 0.02, 0.12, 14), new THREE.MeshStandardMaterial({ color: 0xd8dce0, roughness: 0.25 }), V3(s * (W / 2 + 2.2), 7.9 + k * 0.22, 0.6));
      b.add(box(1.4, 1.2, 1), mat.darkMetal, V3(s * (W / 2 + 2.2), 0.6, 1.3));
    }
    // turbina interna girando
    const fan = new THREE.Group(); fan.position.set(0, H / 2, -2.5); grp.add(fan);
    for (let i = 0; i < 9; i++) { const bl = new THREE.Mesh(box(0.35, 2.3, 0.05), mat.rail); bl.rotation.z = i / 9 * Math.PI * 2; bl.position.set(Math.sin(i / 9 * 6.283) * 1.15, Math.cos(i / 9 * 6.283) * 1.15, 0); bl.rotation.y = 0.4; fan.add(bl); }
    fan.add(new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), glow(0x9fb0ff, 2)));
    // raios: linhas que se redesenham
    const boltMat = new THREE.LineBasicMaterial({ color: new THREE.Color(0xc8d0ff).multiplyScalar(3), toneMapped: false, transparent: true });
    const bolts = [];
    for (let i = 0; i < 3; i++) { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 12 }, () => V3())), boltMat); grp.add(l); bolts.push(l); }
    let acc = 0;
    ctx.updaters.push((dt, t) => {
      fan.rotation.z += dt * 2.5; coil.material.color.setHex(0x6c7bff).multiplyScalar(1.5 + Math.sin(t * 7) * 0.5);
      acc += dt; if (acc < 0.08) return; acc = 0;
      for (const l of bolts) {
        const a0 = Math.random() * Math.PI, a1 = a0 + 0.5 + Math.random();
        const p = l.geometry.attributes.position; const r = W / 2 + 0.5;
        for (let k = 0; k < 12; k++) { const a = a0 + (a1 - a0) * k / 11; p.setXYZ(k, Math.cos(a) * r + (Math.random() - 0.5) * 0.4, H / 2 + 0.2 + Math.sin(a) * r + (Math.random() - 0.5) * 0.4, 0.9); }
        p.needsUpdate = true; l.visible = Math.random() > 0.3;
      }
    });
    ctx.fx.coil = coil;
  },
  /* 06 — Transporte: boca industrial zebrada, trilhos, vagão, sinal */
  6(ctx) {
    const { b, grp } = ctx;
    const hz = makeCanvas(256, 32); const g = hz.getContext('2d'); g.fillStyle = '#f5b642'; g.fillRect(0, 0, 256, 32); g.fillStyle = '#111';
    for (let x = -32; x < 256; x += 32) { g.beginPath(); g.moveTo(x, 32); g.lineTo(x + 16, 0); g.lineTo(x + 32, 0); g.lineTo(x + 16, 32); g.fill(); }
    const ht = new THREE.CanvasTexture(hz); ht.wrapS = THREE.RepeatWrapping; ht.repeat.set(3, 1); ht.colorSpace = THREE.SRGBColorSpace;
    const hzm = new THREE.MeshStandardMaterial({ map: ht, roughness: 0.6, metalness: 0.4 });
    for (const s of [-1, 1]) { b.add(box(0.6, H + 0.6, 0.6), hzm, V3(s * (W / 2 + 0.3), (H + 0.6) / 2, 0.3), [0, 0, 0]); b.add(cyl(0.3, 0.3, 4, 12), mat.darkMetal, V3(s * (W / 2 + 1.5), 5.8, 0.8)); }
    b.add(box(W + 1.8, 0.6, 0.6), hzm, V3(0, H + 0.6, 0.3));
    // tubulação de cobre
    b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(W / 2 + 1.5, 0.5, 0.9), V3(W / 2 + 1.5, H + 1.2, 0.9), V3(-W / 2 - 1.5, H + 1.2, 0.9), V3(-W / 2 - 1.5, 0.5, 0.9)]), 40, 0.16, 8), mat.bronze);
    // trilhos e dormentes saindo do túnel
    for (const x of [-0.75, 0.75]) b.add(box(0.08, 0.1, LEN + 4), mat.rail, V3(x, 0.05, -LEN / 2 + 2));
    for (let z = 2; z > -LEN; z -= 0.7) b.add(box(2.2, 0.08, 0.25), mat.woodDark, V3(0, 0.02, z));
    // vagão
    const wagon = new THREE.Group(); wagon.position.set(0, 0.2, -7); grp.add(wagon);
    const wb = new THREE.Mesh(box(2.4, 2.6, 5), new THREE.MeshStandardMaterial({ color: 0x6a5a2a, roughness: 0.6, metalness: 0.6 })); wb.position.y = 1.5; wagon.add(wb);
    for (const x of [-0.8, 0, 0.8]) { const wn = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), glow(0xffd27a, 1.4)); wn.position.set(x, 1.9, 2.51); wagon.add(wn); }
    const hl = new THREE.Mesh(new THREE.CircleGeometry(0.18, 16), glow(0xfff2c0, 4)); hl.position.set(0, 0.9, 2.52); wagon.add(hl);
    // sinal
    const sig = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), glow(0xff3b3b, 2.5)); sig.position.set(W / 2 + 1.5, 7.9, 0.9); grp.add(sig);
    ctx.fx.wagon = wagon; ctx.fx.signal = sig;
    ctx.updaters.push((dt, t) => { sig.visible = Math.floor(t * 1.5) % 2 === 0; });
  },
  /* 07 — Madeira: pórtico de vigas, toras empilhadas, serra circular */
  7(ctx) {
    const { b, grp } = ctx;
    for (const s of [-1, 1]) {
      b.add(box(0.55, H + 1, 0.55), mat.wood, V3(s * (W / 2 + 0.35), (H + 1) / 2, 0.5));
      b.add(box(0.4, 3, 0.4), mat.wood, V3(s * (W / 2 + 1.3), H - 0.4, 0.5), [0, 0, s * 0.7]);
      // pilha de toras
      for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) {
        b.add(cyl(0.32, 0.32, 2.4, 14), mat.wood, V3(s * (W / 2 + 2.0 + i * 0.66 + r * 0.33), 0.32 + r * 0.56, 1.4), [Math.PI / 2, 0, 0]);
        b.add(cyl(0.3, 0.3, 0.02, 14), new THREE.MeshStandardMaterial({ color: 0xc9a06a, roughness: 0.8 }), V3(s * (W / 2 + 2.0 + i * 0.66 + r * 0.33), 0.32 + r * 0.56, 2.61), [Math.PI / 2, 0, 0]);
      }
    }
    b.add(box(W + 2.6, 0.6, 0.6), mat.wood, V3(0, H + 0.7, 0.5));
    b.add(box(W + 1.6, 0.4, 0.5), mat.woodDark, V3(0, H + 1.4, 0.45), [0, 0, 0.03]);
    // serra circular
    const saw = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.04, 40), mat.rail); saw.rotation.x = Math.PI / 2; saw.position.set(-W / 2 - 1.8, H + 0.2, 1.0); grp.add(saw);
    for (let i = 0; i < 20; i++) { const tth = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 4), mat.rail); const a = i / 20 * 6.283; tth.position.set(Math.cos(a) * 1.15, 0, Math.sin(a) * 1.15); tth.rotation.z = -a; saw.add(tth); }
    lantern(ctx, W / 2 + 0.35, H - 0.8, 0.9);
    ctx.updaters.push((dt) => { saw.rotation.y += dt * 1.2; });
  },
  /* 08 — Têxteis: cortinas ondulando, tear, fitas */
  8(ctx) {
    const { b, grp } = ctx;
    b.add(box(W + 2.4, 0.4, 0.5), mat.darkMetal, V3(0, H + 0.7, 0.5));
    const curtains = [];
    const cols = [0x6b2fa3, 0x9d4edd, 0xd16ba5, 0x3a86ff];
    for (const s of [-1, 1]) for (let k = 0; k < 2; k++) {
      const g = new THREE.PlaneGeometry(1.4, H + 0.6, 12, 16);
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: cols[(s + 1) + k], roughness: 0.75, side: THREE.DoubleSide, emissive: cols[(s + 1) + k], emissiveIntensity: 0.12 }));
      m.position.set(s * (W / 2 + 0.6 + k * 1.1), (H + 0.6) / 2, 0.8 + k * 0.15); grp.add(m); curtains.push(m);
      m.userData.base = g.attributes.position.array.slice();
    }
    // tear dentro
    const loom = new THREE.Group(); loom.position.set(0, 0, -4); grp.add(loom);
    for (const x of [-1.4, 1.4]) { const p = new THREE.Mesh(box(0.15, 2.6, 0.15), mat.wood); p.position.set(x, 1.3, 0); loom.add(p); }
    const beam = new THREE.Mesh(cyl(0.12, 0.12, 2.9, 10), mat.wood); beam.rotation.z = Math.PI / 2; beam.position.y = 2.5; loom.add(beam);
    const threads = []; for (let i = 0; i < 14; i++) { const t = new THREE.Mesh(box(0.015, 2.2, 0.015), glow(0xd9a4ff, 1.5)); t.position.set(-1.25 + i * 0.19, 1.4, 0); loom.add(t); threads.push(t); }
    // fita espiral roxa
    const ribbon = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 30 }, (_, i) => V3(Math.cos(i * 0.5) * (W / 2 + 0.3), 0.8 + i * 0.17, 0.9 + Math.sin(i * 0.5) * 0.4))), 120, 0.035, 4), glow(0xb46cff, 2));
    grp.add(ribbon); ribbon.visible = true;
    ctx.fx.curtains = curtains; ctx.fx.ribbon = ribbon;
    ctx.updaters.push((dt, t) => {
      for (const [i, c] of curtains.entries()) {
        const p = c.geometry.attributes.position, base = c.userData.base;
        for (let k = 0; k < p.count; k++) { const y = base[k * 3 + 1]; p.setZ(k, Math.sin(base[k * 3] * 3 + t * 1.6 + i) * 0.12 * (1 - (y + (H + 0.6) / 2) / (H + 0.6))); }
        p.needsUpdate = true;
      }
      threads.forEach((th, i) => { th.position.z = Math.sin(t * 3 + i * 0.7) * 0.06; });
    });
  },
  /* 09 — Grãos: silos, feixes de trigo dourado, arco de espigas */
  9(ctx) {
    const { b, grp, rr } = ctx;
    const silo = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.4, metalness: 0.8 });
    for (const s of [-1, 1]) {
      b.add(cyl(1.0, 1.0, 6.6, 24), silo, V3(s * (W / 2 + 1.9), 3.3, 0.2));
      b.add(new THREE.ConeGeometry(1.05, 0.9, 24), silo, V3(s * (W / 2 + 1.9), 7.05, 0.2));
      for (let k = 0; k < 6; k++) b.add(new THREE.TorusGeometry(1.01, 0.03, 4, 32), mat.rail, V3(s * (W / 2 + 1.9), 0.6 + k * 1.1, 0.2), [Math.PI / 2, 0, 0]);
    }
    // feixes de trigo (lâminas finas instanciadas)
    const stalkG = new THREE.ConeGeometry(0.02, 1.3, 3); stalkG.translate(0, 0.65, 0);
    const N = 420; const inst = new THREE.InstancedMesh(stalkG, new THREE.MeshStandardMaterial({ color: 0xd9b24a, roughness: 0.7, emissive: 0x3a2a05 }), N);
    const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const e = new THREE.Euler();
    for (let i = 0; i < N; i++) {
      const s = i % 2 ? 1 : -1; const cx = s * (W / 2 + 0.6 + rr() * 0.6), cz = 1.0 + rr() * 0.8;
      const a = rr() * 6.283, r = rr() * 0.45;
      e.set((rr() - 0.5) * 0.6, 0, (rr() - 0.5) * 0.6 + s * -0.2); q.setFromEuler(e);
      m4.compose(V3(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r), q, V3(1, 0.8 + rr() * 0.8, 1)); inst.setMatrixAt(i, m4);
    }
    grp.add(inst);
    // arco de espigas douradas acima da boca
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI - i / 24 * Math.PI; const r = W / 2 + 0.7;
      b.add(new THREE.ConeGeometry(0.12, 0.7, 5), mat.gold, V3(Math.cos(a) * r, WALL_H + Math.sin(a) * r, 0.6), [0, 0, a - Math.PI / 2]);
    }
    const glyphs = new THREE.Group(); grp.add(glyphs); glyphs.visible = false;
    for (let i = 0; i < 10; i++) { const gm = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.22, 6), glow(0xffd36b, 3)); gm.position.set(-W / 2 - 1 + i * ((W + 2) / 9), 1 + (i % 3) * 2, 0.95); glyphs.add(gm); }
    ctx.fx.glyphs = glyphs;
  },
  /* 10 — Pecuária: celeiro com empena, cerca, caveira de touro */
  10(ctx) {
    const { b, grp } = ctx;
    for (const s of [-1, 1]) {
      b.add(box(0.45, H + 0.4, 0.45), mat.wood, V3(s * (W / 2 + 0.3), (H + 0.4) / 2, 0.6));
      // telhado em duas águas
      b.add(box(W / 2 + 2.2, 0.18, 2.2), mat.woodDark, V3(s * (W / 4 + 0.8), H + 1.4, 0.6), [0, 0, -s * 0.42]);
      // cerca
      for (let k = 0; k < 4; k++) b.add(box(0.12, 1.2, 0.12), mat.wood, V3(s * (W / 2 + 1.1 + k * 0.7), 0.6, 1.8));
      for (const y of [0.45, 0.95]) b.add(box(2.4, 0.1, 0.06), mat.wood, V3(s * (W / 2 + 2.15), y, 1.83));
      // fardos de feno
      b.add(cyl(0.55, 0.55, 1.1, 16), new THREE.MeshStandardMaterial({ color: 0xc9a54e, roughness: 1 }), V3(s * (W / 2 + 2.3), 0.55, 0.9), [0, 0, Math.PI / 2]);
      lantern(ctx, s * (W / 2 + 0.3), H - 0.5, 0.95);
    }
    // caveira de touro (placa entalhada) acima da boca
    const sk = new THREE.Group(); sk.position.set(0, H + 0.2, 1.0); grp.add(sk);
    const plate = new THREE.Mesh(box(1.6, 1.0, 0.1), mat.woodDark); sk.add(plate);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 5), new THREE.MeshStandardMaterial({ color: 0xe0d6c2, roughness: 0.7 })); head.rotation.x = Math.PI; head.position.z = 0.1; sk.add(head);
    for (const s of [-1, 1]) { const horn = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 6, 16, Math.PI * 0.6), new THREE.MeshStandardMaterial({ color: 0xe8dcc6 })); horn.position.set(s * 0.45, 0.25, 0.1); horn.rotation.z = s > 0 ? 0 : Math.PI * 0.4; sk.add(horn); }
    // portão de tábuas (abre no feitiço)
    const doors = [];
    for (const s of [-1, 1]) {
      const pv = new THREE.Group(); pv.position.set(s * (W / 2 - 0.05), 0, -0.4); grp.add(pv);
      const d = new THREE.Mesh(box(W / 2 - 0.1, WALL_H + 0.6, 0.12), mat.wood); d.position.set(-s * (W / 4), (WALL_H + 0.6) / 2, 0); pv.add(d);
      const x = new THREE.Mesh(box(0.12, WALL_H + 1.2, 0.05), mat.woodDark); x.rotation.z = s * 0.6; x.position.copy(d.position).setZ(0.08); pv.add(x);
      pv.rotation.y = s * 1.2; doors.push(pv);
    }
    ctx.fx.doors = doors;
  },
  /* 11 — Agricultura: arco de vinhas com folhas e uvas, estufa */
  11(ctx) {
    const { b, grp, rr } = ctx;
    const vine = new THREE.MeshStandardMaterial({ color: 0x3f6b2a, roughness: 0.8 });
    // folha de videira de verdade (lobada, com nervura no meio) que balança com o ar da caverna
    const ls = new THREE.Shape(); ls.moveTo(0, 0);
    ls.bezierCurveTo(0.12, 0.04, 0.2, 0.12, 0.16, 0.2); ls.bezierCurveTo(0.22, 0.24, 0.12, 0.34, 0.05, 0.3);
    ls.bezierCurveTo(0.04, 0.38, -0.04, 0.38, -0.05, 0.3); ls.bezierCurveTo(-0.12, 0.34, -0.22, 0.24, -0.16, 0.2);
    ls.bezierCurveTo(-0.2, 0.12, -0.12, 0.04, 0, 0);
    const leafG = new THREE.ShapeGeometry(ls, 4); { const pa = leafG.attributes.position; for (let i = 0; i < pa.count; i++) pa.setZ(i, -Math.abs(pa.getX(i)) * 0.35 + Math.sin(pa.getY(i) * 6) * 0.015); leafG.computeVertexNormals(); }
    const leafM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, side: THREE.DoubleSide, emissive: 0x0a1c05 });
    leafM.onBeforeCompile = (sh) => { sh.uniforms.uTime = uTime; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <begin_vertex>', `#include <begin_vertex>
      float ph = instanceMatrix[3].x * 2.1 + instanceMatrix[3].y * 1.3; transformed.z += sin(uTime * 2.3 + ph) * 0.05 * position.y * 4.0; transformed.x += sin(uTime * 1.7 + ph * 1.4) * 0.03 * position.y * 4.0;`); };
    const leaves = new THREE.InstancedMesh(leafG, leafM, 900);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    let li = 0;
    for (let v = 0; v < 7; v++) {
      const pts = []; for (let i = 0; i <= 20; i++) { const a = Math.PI - i / 20 * Math.PI; const r = W / 2 + 0.45 + Math.sin(i * 0.9 + v) * 0.25; pts.push(V3(Math.cos(a) * r, WALL_H + Math.sin(a) * r * 1.05, 0.55 + v * 0.07)); }
      pts.unshift(V3(-W / 2 - 0.4 - v * 0.1, 0, 0.6)); pts.push(V3(W / 2 + 0.4 + v * 0.1, 0, 0.6));
      const cv = new THREE.CatmullRomCurve3(pts); b.add(new THREE.TubeGeometry(cv, 60, 0.05 + v * 0.01, 5), vine);
      for (let k = 0; k < 125 && li < 900; k++, li++) {
        const p = cv.getPoint(rr()); e.set(rr() * 6, rr() * 6, rr() * 6); q.setFromEuler(e);
        m4.compose(p.add(V3((rr() - 0.5) * 0.3, (rr() - 0.5) * 0.3, rr() * 0.2)), q, V3(1, 1, 1).multiplyScalar(0.7 + rr() * 0.8)); leaves.setMatrixAt(li, m4);
        leaves.setColorAt(li, new THREE.Color().setHSL(0.24 + rr() * 0.08, 0.55 + rr() * 0.25, 0.18 + rr() * 0.16));
      }
    }
    leaves.count = li; grp.add(leaves);
    const bush = new THREE.MeshStandardMaterial({ color: 0x2f6a26, roughness: 0.85, emissive: 0x0a1a06 });
    void bush; // os arbustos de esfera saíram: as plantas do Tripo ocupam os lados
    for (let k = 0; k < 9; k++) { const x = -W / 2 + rr() * W; b.add(new THREE.CylinderGeometry(0.025, 0.025, 1.5 + rr() * 2.5, 4), vine, V3(x, H + 0.2 - (0.75 + rr()), 0.75)); }
    for (const s of [-1, 1]) for (let k = 0; k < 2; k++) {
      const cl = V3(s * (W / 2 + 0.9 + k * 0.4), H - 0.6 - k * 1.3, 0.9);
      for (let i = 0; i < 9; i++) b.add(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshStandardMaterial({ color: 0x5a2a8a, roughness: 0.3 }), cl.clone().add(V3((rr() - 0.5) * 0.3, -i * 0.06, (rr() - 0.5) * 0.2)));
    }
    // estufa (vidro com caixilhos) no interior
    for (let z = -2; z > -9; z -= 1.5) b.add(new THREE.TorusGeometry(W / 2 - 0.4, 0.04, 4, 24, Math.PI), mat.rail, V3(0, WALL_H - 0.4, z));
    const flowers = [];
    for (let i = 0; i < 14; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), glow(i % 2 ? 0xc77dff : 0xff8fd1, 1.8)); f.position.set((rr() - 0.5) * W, 0.4 + rr() * 2, -3 - rr() * 6); grp.add(f); flowers.push(f); }
    ctx.fx.leaves = leaves; ctx.fx.flowers = flowers;
  },
  /* 12 — Carvão: mina escorada, trilhos, vagonete com carvão, brasas */
  12(ctx) {
    const { b, grp, rr } = ctx;
    for (const s of [-1, 1]) {
      b.add(box(0.5, H + 0.2, 0.5), mat.woodDark, V3(s * (W / 2 + 0.25), (H + 0.2) / 2, 0.6));
      b.add(box(0.35, 2.6, 0.35), mat.woodDark, V3(s * (W / 2 + 1.0), H - 0.6, 0.6), [0, 0, s * 0.75]);
      lantern(ctx, s * (W / 2 + 0.25), H - 1.1, 0.95, 0xff9a40);
    }
    b.add(box(W + 1.8, 0.55, 0.55), mat.woodDark, V3(0, H + 0.4, 0.6));
    // escoras ao longo do túnel
    for (let z = -1.5; z > -LEN + 1; z -= 2.2) {
      for (const s of [-1, 1]) b.add(box(0.3, WALL_H + 1.5, 0.3), mat.woodDark, V3(s * (W / 2 - 0.4), (WALL_H + 1.5) / 2, z));
      b.add(box(W - 0.4, 0.3, 0.3), mat.woodDark, V3(0, WALL_H + 1.5, z));
    }
    for (const x of [-0.6, 0.6]) b.add(box(0.07, 0.08, LEN + 3), mat.rail, V3(x, 0.04, -LEN / 2 + 1.5));
    for (let z = 1.5; z > -LEN; z -= 0.6) b.add(box(1.7, 0.06, 0.2), mat.woodDark, V3(0, 0.02, z));
    // vagonete com carvão
    const cart = new THREE.Group(); cart.position.set(0, 0.1, 0.6); grp.add(cart);
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.6, 0.8, 4, 1), mat.darkMetal); bin.rotation.y = Math.PI / 4; bin.position.y = 0.75; bin.scale.set(1, 1, 1.5); cart.add(bin);
    for (let i = 0; i < 14; i++) { const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.17 + rr() * 0.08), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.35, metalness: 0.4 })); c.position.set((rr() - 0.5) * 0.9, 1.15 + rr() * 0.15, (rr() - 0.5) * 1.3); cart.add(c); }
    for (const [x, z] of [[-0.55, 0.5], [0.55, 0.5], [-0.55, -0.5], [0.55, -0.5]]) { const w = new THREE.Mesh(cyl(0.2, 0.2, 0.1, 12), mat.rail); w.rotation.z = Math.PI / 2; w.position.set(x, 0.2, z); cart.add(w); }
    cart.position.x = W / 2 + 1.6; cart.position.z = 1.4;
    const cart2 = cart.clone(); cart2.position.set(0, 0.1, -1.2); grp.add(cart2);
    for (const x of [-0.6, 0.6]) b.add(box(0.07, 0.08, 4), mat.rail, V3(x, 0.04, 3.3));
    for (let z = 2.2; z < 5.2; z += 0.6) b.add(box(1.7, 0.06, 0.2), mat.woodDark, V3(0, 0.02, z));
    // brasas: partículas laranja subindo na boca
    const N = 120; const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) pos.set([(rr() - 0.5) * (W + 2), rr() * H, 0.6 + rr()], i * 3);
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const embers = new THREE.Points(pg, new THREE.PointsMaterial({ color: new THREE.Color(0xff7a2a).multiplyScalar(2.5), size: 0.07, transparent: true, opacity: 0.9, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    grp.add(embers);
    ctx.updaters.push((dt, t) => {
      const p = pg.attributes.position;
      for (let i = 0; i < N; i++) { let y = p.getY(i) + dt * (0.4 + (i % 7) * 0.08); if (y > H + 1.5) y = 0; p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(t * 2 + i) * dt * 0.1); }
      p.needsUpdate = true;
    });
    ctx.fx.embers = embers;
  },
};

export { W as PORTAL_W, H as PORTAL_H, LEN as TUNNEL_LEN };
void displace;
