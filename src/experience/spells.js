import * as THREE from 'three';
import { glow, makeCanvas } from './materials.js';
import { V3 } from './util.js';
import { PORTAL_W as W, PORTAL_H as H } from './districts.js';

/* -------- partículas genéricas (aditivas, com vida e cor) -------- */
let _dot = null;
function dotTex() {
  if (_dot) return _dot;
  const c = makeCanvas(64, 64); const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); _dot = new THREE.CanvasTexture(c); return _dot;
}

class Particles {
  constructor(n, { size = 0.25, color = 0xffffff, blending = THREE.AdditiveBlending } = {}) {
    this.n = n;
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.vel = new Float32Array(n * 3);
    this.life = new Float32Array(n); this.max = new Float32Array(n);
    this.target = null; // opcional: Float32Array de alvos
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.points = new THREE.Points(g, new THREE.PointsMaterial({ size, map: dotTex(), vertexColors: true, transparent: true, depthWrite: false, blending, toneMapped: false }));
    this.base = new THREE.Color(color);
    this.points.frustumCulled = false;
  }
  spawn(i, p, v, life, color = this.base, k = 2.5) {
    this.pos.set([p.x, p.y, p.z], i * 3); this.vel.set([v.x, v.y, v.z], i * 3);
    this.life[i] = life; this.max[i] = life; this.col.set([color.r * k, color.g * k, color.b * k], i * 3);
  }
  step(dt, { drag = 0, gravity = 0, attract = null, attractK = 0 } = {}) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -9999; continue; }
      this.life[i] -= dt;
      const o = i * 3;
      if (attract) {
        const tx = attract[o] - this.pos[o], ty = attract[o + 1] - this.pos[o + 1], tz = attract[o + 2] - this.pos[o + 2];
        this.vel[o] += tx * attractK * dt; this.vel[o + 1] += ty * attractK * dt; this.vel[o + 2] += tz * attractK * dt;
      }
      this.vel[o + 1] -= gravity * dt;
      const d = Math.max(0, 1 - drag * dt); this.vel[o] *= d; this.vel[o + 1] *= d; this.vel[o + 2] *= d;
      this.pos[o] += this.vel[o] * dt; this.pos[o + 1] += this.vel[o + 1] * dt; this.pos[o + 2] += this.vel[o + 2] * dt;
      const f = Math.min(1, this.life[i] / (this.max[i] * 0.35));
      this.col[o] *= 0.0 + 1; this.col[o + 1] *= 1; this.col[o + 2] *= 1; // cor estável
      if (f < 1) { this.col[o] *= 0.97; this.col[o + 1] *= 0.97; this.col[o + 2] *= 0.97; }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
  dispose() { this.points.geometry.dispose(); this.points.material.dispose(); }
}

const rnd = (a = -1, b = 1) => a + Math.random() * (b - a);

/** Disparo da varinha: rastro do jogador até o portal (0,45 s). */
function wandBolt(scene, from, to, color) {
  const pt = new Particles(160, { size: 0.18, color });
  scene.add(pt.points);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), glow(color, 4)); scene.add(head);
  const ctrl = from.clone().lerp(to, 0.5).add(V3(0, 1.6, 0));
  const curve = new THREE.QuadraticBezierCurve3(from.clone(), ctrl, to.clone());
  let t = 0, k = 0;
  return {
    update(dt) {
      t += dt / 0.45; const p = curve.getPoint(Math.min(1, t)); head.position.copy(p);
      for (let j = 0; j < 6; j++) { pt.spawn(k, p, V3(rnd(-0.3, 0.3), rnd(-0.3, 0.3), rnd(-0.3, 0.3)), 0.35); k = (k + 1) % pt.n; }
      pt.step(dt, { drag: 2 });
      return t >= 1;
    },
    dispose() { scene.remove(pt.points, head); pt.dispose(); head.geometry.dispose(); },
  };
}

/**
 * Cria o efeito de um feitiço. Devolve { update(dt) -> boolean (terminou), dispose() }.
 * `portal`: objeto de districts.js (grp, anchor(), fx...). Coordenadas locais do portal: boca em z=0, +z para o salão.
 */
export function castSpell(scene, portal, from, { reduced = false, onFlash } = {}) {
  const d = portal.d; const color = new THREE.Color(d.color);
  const anchor = portal.anchor();
  const L = (x, y, z) => portal.grp.localToWorld(V3(x, y, z));
  const parts = []; const meshes = [];
  const add = (o) => { scene.add(o); meshes.push(o); return o; };
  const light = add(new THREE.PointLight(d.color, 0, 22, 1.5)); light.position.copy(anchor).add(portal.grp.localToWorld(V3(0, 0, 2)).sub(portal.grp.localToWorld(V3())));
  const bolt = reduced ? null : wandBolt(scene, from, anchor, color);
  let boltDone = reduced; let t = 0; const T = reduced ? 0.6 : d.duration;
  let st = null; // estado do efeito específico
  let pulse = null; // onda de pressão comum a todos os feitiços

  const P = (n, o) => { const p = new Particles(n, { color, ...o }); add(p.points); parts.push(p); return p; };

  const effects = {
    1() { // Lumos Maxima
      const orb = add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), glow(0xfff1c4, 4))); orb.position.copy(anchor);
      const rays = []; for (let i = 0; i < 16; i++) { const r = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1), glow(0xffe3a0, 3))); r.position.copy(anchor); rays.push(r); }
      const crys = portal.fx.crystals || [];
      return (k) => {
        orb.scale.setScalar(0.2 + Math.min(1, k * 1.6) * 2.2 * (1 - Math.max(0, k - 0.8) * 4));
        rays.forEach((r, i) => { const a = i / 16 * Math.PI * 2 + k * 2; r.lookAt(L(Math.cos(a) * 6, H / 2 + Math.sin(a) * 6, 1.5)); r.scale.z = Math.min(1, k * 2) * 9; r.position.copy(anchor); r.translateZ(r.scale.z / 2); });
        crys.forEach((c, i) => { const on = k > i / crys.length * 0.8; c.material.emissiveIntensity = on ? 2.5 : 0.6; });
        light.intensity = 300 * Math.sin(Math.min(1, k) * Math.PI);
      };
    },
    2() { // Protego
      const sh = add(new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xa8d8ff).multiplyScalar(1.8), wireframe: true, transparent: true, opacity: 0.8, toneMapped: false })));
      sh.position.copy(anchor);
      const shards = P(220, { size: 0.3, color: 0xbfe4ff }); let burst = false;
      return (k) => {
        const s = k < 0.7 ? 0.5 + k * 6 : 4.7; sh.scale.setScalar(s); sh.rotation.y += 0.02; sh.material.opacity = k < 0.7 ? 0.8 : Math.max(0, 0.8 - (k - 0.7) * 4);
        if (k > 0.7 && !burst) { burst = true; for (let i = 0; i < shards.n; i++) { const v = V3(rnd(), rnd(), rnd()).normalize(); shards.spawn(i, anchor.clone().addScaledVector(v, 4.6), v.multiplyScalar(rnd(3, 8)), rnd(0.5, 1.1)); } }
        shards.step(1 / 60, { drag: 1.5, gravity: 3 });
        if (portal.fx.gate) portal.fx.gate.position.y = H * 0.55 + Math.max(0, k - 0.6) * 2.5 * H;
        light.intensity = 140 * Math.sin(Math.min(1, k) * Math.PI);
      };
    },
    3() { // Alohomora
      const rings = portal.fx.rings || []; rings.forEach((r) => { r.visible = true; });
      const sig = P(160, { size: 0.16, color: 0x76e5f5 });
      return (k) => {
        const align = Math.max(0, (k - 0.6) / 0.4);
        rings.forEach((r, i) => { r.rotation.z += (i % 2 ? -1 : 1) * (1 - align) * 0.18; r.rotation.x = (1 - align) * (0.6 - i * 0.3); r.scale.setScalar(1 + Math.sin(k * 10 + i) * 0.03); });
        for (let j = 0; j < 4; j++) { const i = Math.floor(Math.random() * sig.n); const a = Math.random() * 6.28; const r = 1.8 + Math.floor(Math.random() * 3) * 0.35; sig.spawn(i, L(Math.cos(a) * r, 3.2 + Math.sin(a) * r, 0.6), V3(0, 0, 0), 0.4); }
        sig.step(1 / 60);
        if (k > 0.97) rings.forEach((r) => { r.visible = false; });
        light.intensity = 90 + align * 120;
      };
    },
    4() { // Aguamenti
      const jets = P(700, { size: 0.2, color: 0x7fe3ff }); let k0 = 0;
      const c1 = new THREE.CubicBezierCurve3(L(-W / 2 - 2, 0.3, 1.5), L(-W / 2 - 2, H + 2, 2), L(W / 2, H + 2.5, 1.5), L(W / 2 + 1, 0.2, 1));
      const c2 = new THREE.CubicBezierCurve3(L(W / 2 + 2, 0.3, 1.5), L(W / 2 + 2, H + 2, 1), L(-W / 2, H + 2.5, 2), L(-W / 2 - 1, 0.2, 1));
      return (k) => {
        const head = Math.min(1, k * 1.5);
        for (let j = 0; j < 14; j++) {
          const c = j % 2 ? c1 : c2; const u = Math.random() * head; const p = c.getPoint(u);
          jets.spawn(k0, p.add(V3(rnd(-0.08, 0.08), rnd(-0.08, 0.08), rnd(-0.08, 0.08))), V3(0, 0, 0), k > 0.75 ? 0.6 : 0.25); k0 = (k0 + 1) % jets.n;
        }
        jets.step(1 / 60, { gravity: k > 0.75 ? 9 : 0 });
        light.intensity = 120 * Math.sin(Math.min(1, k) * Math.PI);
      };
    },
    5() { // Confringo
      const core = add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), glow(0xd8deff, 5))); core.position.copy(anchor);
      const wave = add(new THREE.Mesh(new THREE.RingGeometry(0.9, 1.1, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xc8d0ff).multiplyScalar(3), transparent: true, side: THREE.DoubleSide, toneMapped: false, depthWrite: false })));
      wave.position.copy(anchor); wave.quaternion.copy(portal.grp.quaternion);
      const sp = P(300, { size: 0.15, color: 0xb0bcff });
      return (k) => {
        const conc = Math.min(1, k / 0.65);
        core.scale.setScalar(k < 0.65 ? 0.3 + conc * 1.4 : Math.max(0.01, 1.7 - (k - 0.65) * 8));
        for (let j = 0; j < 8 && k < 0.65; j++) { const i = Math.floor(Math.random() * sp.n); const a = Math.random() * 6.28; sp.spawn(i, L(Math.cos(a) * (W / 2 + 0.5), H / 2 + 0.2 + Math.sin(a) * (W / 2 + 0.5), 0.9), V3(0, 0, 0), 0.5); }
        sp.step(1 / 60, { attract: new Float32Array(sp.n * 3).fill(0).map((_, i) => [anchor.x, anchor.y, anchor.z][i % 3]), attractK: 18, drag: 3 });
        if (portal.fx.coil) portal.fx.coil.material.color.setHex(0xc8d0ff).multiplyScalar(1.5 + conc * 3);
        const wk = Math.max(0, (k - 0.65) / 0.35); wave.scale.setScalar(1 + wk * 12); wave.material.opacity = 1 - wk;
        light.intensity = k < 0.65 ? 60 * conc : 400 * (1 - wk);
        if (k > 0.65 && k < 0.7) onFlash?.(0.6);
      };
    },
    6() { // Accio
      const frags = []; for (let i = 0; i < 36; i++) {
        const m = add(new THREE.Mesh(new THREE.BoxGeometry(rnd(0.15, 0.5), rnd(0.1, 0.3), rnd(0.1, 0.4)), new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: 1, roughness: 0.3, emissive: 0x332200 })));
        const a = Math.PI - i / 35 * Math.PI; const target = L(Math.cos(a) * (W / 2 + 0.6), H - W / 2 + Math.sin(a) * (W / 2 + 0.6) + (a > 0 ? 0 : 0), 1.0);
        const start = L(rnd(-9, 9), rnd(-1, 1), rnd(3, 8));
        const ctrl = start.clone().lerp(target, 0.5).add(V3(rnd(-3, 3), rnd(2, 5), rnd(-3, 3)));
        frags.push({ m, curve: new THREE.QuadraticBezierCurve3(start, ctrl, target), delay: rnd(0, 0.35), spin: V3(rnd(), rnd(), rnd()) });
      }
      return (k) => {
        for (const f of frags) { const u = Math.min(1, Math.max(0, (k - f.delay) / 0.55)); f.m.position.copy(f.curve.getPoint(u * u * (3 - 2 * u))); f.m.rotation.x += f.spin.x * 0.2 * (1 - u); f.m.rotation.y += f.spin.y * 0.2 * (1 - u); f.m.material.emissiveIntensity = u > 0.98 ? 2 : 0.3; }
        if (portal.fx.wagon) portal.fx.wagon.position.z = -7 - Math.max(0, k - 0.5) * 6;
        light.intensity = 80 + 120 * Math.max(0, k - 0.8) * 5;
      };
    },
    7() { // Wingardium Leviosa
      const logs = []; for (let i = 0; i < 22; i++) {
        const m = add(new THREE.Mesh(new THREE.CylinderGeometry(rnd(0.06, 0.16), rnd(0.06, 0.16), rnd(0.6, 1.6), 8), new THREE.MeshStandardMaterial({ color: 0x8a5a30, roughness: 0.8, emissive: 0x2a1505 })));
        const start = L(rnd(-W, W), 0.2, rnd(1, 4)); m.position.copy(start);
        const a = Math.PI - i / 21 * Math.PI; const target = L(Math.cos(a) * (W / 2 + 0.9), H - W / 2 + Math.sin(a) * (W / 2 + 0.9), 1.2);
        logs.push({ m, start, target, ph: rnd(0, 6), a });
      }
      const dust = P(200, { size: 0.12, color: 0xffd9a0 });
      return (k) => {
        for (const l of logs) {
          const lift = Math.min(1, k / 0.35); const orbit = Math.max(0, Math.min(1, (k - 0.3) / 0.35)); const settle = Math.max(0, (k - 0.65) / 0.35);
          const float = l.start.clone().add(V3(0, lift * 2.5 + Math.sin(k * 12 + l.ph) * 0.2, 0));
          const orb = anchor.clone().add(V3(Math.cos(k * 8 + l.ph) * 4, Math.sin(k * 6 + l.ph) * 2, Math.sin(k * 8 + l.ph) * 2));
          l.m.position.copy(float.lerp(orb, orbit * (1 - settle)).lerp(l.target, settle));
          l.m.rotation.set(k * 4 + l.ph, k * 3, settle * (l.a - Math.PI / 2));
          l.m.material.emissiveIntensity = 0.5 + settle * 2;
        }
        for (let j = 0; j < 3; j++) { const i = Math.floor(Math.random() * dust.n); dust.spawn(i, anchor.clone().add(V3(rnd(-4, 4), rnd(-3, 3), rnd(-1, 2))), V3(0, rnd(0.2, 0.8), 0), 0.8); }
        dust.step(1 / 60);
        light.intensity = 60 + 100 * k;
      };
    },
    8() { // Diffindo
      const slash = add(new THREE.Mesh(new THREE.PlaneGeometry(0.18, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd6ff).multiplyScalar(4), transparent: true, toneMapped: false, side: THREE.DoubleSide, depthWrite: false })));
      slash.quaternion.copy(portal.grp.quaternion); slash.rotateZ(-0.7);
      const fibers = P(300, { size: 0.12, color: 0xd9a4ff }); let cut = false;
      const curtains = portal.fx.curtains || [];
      const base = curtains.map((c) => c.position.x);
      return (k) => {
        const u = Math.min(1, k / 0.35); slash.position.copy(L(-W + u * W * 2, H / 2 + 2 - u * 4, 1.4)); slash.material.opacity = 1 - Math.max(0, k - 0.35) * 3;
        if (k > 0.3 && !cut) { cut = true; for (let i = 0; i < fibers.n; i++) fibers.spawn(i, L(rnd(-W / 2, W / 2), rnd(0, H), 1.2), V3(rnd(-2, 2), rnd(-1, 2), rnd(0, 2)), rnd(0.6, 1.2)); }
        fibers.step(1 / 60, { drag: 1, gravity: 1.5 });
        curtains.forEach((c, i) => { const s = Math.sign(base[i]); c.position.x = base[i] + s * Math.max(0, k - 0.35) * 2.5; });
        if (portal.fx.ribbon) portal.fx.ribbon.visible = k < 0.35;
        light.intensity = 160 * Math.sin(Math.min(1, k) * Math.PI);
      };
    },
    9() { // Revelio
      const wave = add(new THREE.Mesh(new THREE.RingGeometry(0.95, 1.0, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd36b).multiplyScalar(3), transparent: true, side: THREE.DoubleSide, toneMapped: false, depthWrite: false })));
      wave.position.copy(portal.front()).setY(portal.front().y + 0.05); wave.rotation.x = -Math.PI / 2;
      const wave2 = add(wave.clone()); wave2.material = wave.material.clone(); wave2.position.copy(anchor); wave2.quaternion.copy(portal.grp.quaternion);
      const glyphs = portal.fx.glyphs; if (glyphs) { glyphs.visible = true; glyphs.children.forEach((g) => g.scale.setScalar(0.001)); }
      return (k) => {
        wave.scale.setScalar(1 + k * 18); wave.material.opacity = 1 - k; wave2.scale.setScalar(1 + k * 10); wave2.material.opacity = 1 - k;
        if (glyphs) glyphs.children.forEach((g, i) => { const on = Math.min(1, Math.max(0, k * 1.6 - i * 0.06)); g.scale.setScalar(on); g.rotation.z += 0.03; });
        light.intensity = 140 * Math.sin(Math.min(1, k) * Math.PI);
      };
    },
    10() { // Expecto Patronum — partículas formam um cervo
      const targets = stagPoints(900, 3.2);
      const silver = P(targets.length / 3, { size: 0.12, color: 0xdfefff });
      const tgt = new Float32Array(targets.length);
      for (let i = 0; i < silver.n; i++) silver.spawn(i, from.clone().add(V3(rnd(-1.5, 1.5), rnd(-1, 1.5), rnd(-1.5, 1.5))), V3(rnd(), rnd(), rnd()), 9, new THREE.Color(0xdfefff), 2.2);
      return (k) => {
        const run = Math.max(0, (k - 0.6) / 0.4);
        const center = portal.front().clone().add(V3(0, 1.5, 0)).lerp(portal.deep().clone().add(V3(0, 0.3, 0)), run);
        const q = portal.grp.quaternion;
        for (let i = 0; i < silver.n; i++) { const v = V3(targets[i * 3], targets[i * 3 + 1], targets[i * 3 + 2]).applyQuaternion(q).add(center); tgt[i * 3] = v.x; tgt[i * 3 + 1] = v.y + Math.sin(k * 20 + i) * 0.02; tgt[i * 3 + 2] = v.z; }
        silver.step(1 / 60, { attract: tgt, attractK: 30, drag: 6 });
        if (k > 0.9) for (let i = 0; i < silver.n; i++) silver.life[i] = Math.min(silver.life[i], 0.2);
        light.intensity = 120 + 80 * Math.sin(k * 12);
      };
    },
    11() { // Herbivicus
      const leaves = portal.fx.leaves; const total = leaves ? leaves.count : 0;
      const vines = []; for (let v = 0; v < 6; v++) {
        const pts = []; for (let i = 0; i <= 24; i++) { const a = Math.PI + 0.2 - i / 24 * (Math.PI + 0.4); const r = W / 2 + 0.2 + Math.sin(i + v) * 0.3; pts.push(L(Math.cos(a) * r, H - W / 2 + Math.sin(a) * r, 1.0 + v * 0.05)); }
        const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.05, 5); const m = add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x5fbf3a, emissive: 0x1a4a0a, emissiveIntensity: 1.5 }))); vines.push(m);
      }
      const fl = portal.fx.flowers || [];
      return (k) => {
        vines.forEach((m, i) => { m.geometry.setDrawRange(0, Math.floor(m.geometry.index.count * Math.min(1, k * 1.4 - i * 0.05))); });
        if (leaves) leaves.count = Math.max(1, Math.floor(total * Math.min(1, 0.3 + k)));
        fl.forEach((f, i) => f.scale.setScalar(1 + Math.max(0, k - 0.6 - i * 0.01) * 6));
        light.intensity = 140 * Math.min(1, k * 1.5);
      };
    },
    12() { // Incendio
      const em = P(600, { size: 0.16, color: 0xff7a2a }); let k0 = 0; let burst = false;
      const cracks = [];
      for (let c = 0; c < 6; c++) { const pts = []; let p = V3(rnd(-W / 2 - 2, W / 2 + 2), 0, 0.7); for (let i = 0; i < 8; i++) { pts.push(L(p.x, p.y, p.z)); p = p.clone().add(V3(rnd(-0.6, 0.6), rnd(0.6, 1.1), 0)); } cracks.push(new THREE.CatmullRomCurve3(pts)); }
      return (k) => {
        const run = Math.min(1, k / 0.5);
        for (let j = 0; j < 12; j++) { const c = cracks[j % cracks.length]; em.spawn(k0, c.getPoint(Math.random() * run), V3(rnd(-0.2, 0.2), rnd(0, 0.5), rnd(0, 0.3)), 0.6); k0 = (k0 + 1) % em.n; }
        if (k > 0.5) for (let j = 0; j < 10; j++) { const a = k * 30 + j; em.spawn(k0, anchor.clone().add(V3(Math.cos(a) * (2 - (k - 0.5) * 3), (k - 0.5) * 6 - 2, Math.sin(a))), V3(0, 1, 0), 0.5); k0 = (k0 + 1) % em.n; }
        if (k > 0.85 && !burst) { burst = true; onFlash?.(0.5); for (let i = 0; i < 200; i++) { const v = V3(rnd(), rnd(0, 1), rnd()).normalize(); em.spawn(k0, anchor.clone(), v.multiplyScalar(rnd(4, 10)), rnd(0.4, 1)); k0 = (k0 + 1) % em.n; } }
        em.step(1 / 60, { drag: 1.2, gravity: -0.5 });
        light.intensity = 200 * Math.min(1, k * 1.5) * (0.8 + Math.random() * 0.2);
      };
    },
  };

  return {
    update(dt) {
      if (!boltDone) { boltDone = bolt.update(dt); if (boltDone) { st = effects[d.id](); } return false; }
      if (!st) st = reduced ? (k) => { light.intensity = 200 * Math.sin(k * Math.PI); } : effects[d.id]();
      t += dt; const k = Math.min(1, t / T);
      st(k);
      portal.open = Math.max(portal.open, Math.max(0, (k - 0.7) / 0.3));
      if (!reduced && !pulse && k > 0.68) {
        pulse = { t: 0, floor: add(new THREE.Mesh(new THREE.RingGeometry(0.9, 1.15, 64), new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(3), transparent: true, side: THREE.DoubleSide, toneMapped: false, depthWrite: false }))),
          frame: add(new THREE.Mesh(new THREE.TorusGeometry(W / 2 + 0.4, 0.06, 6, 64, Math.PI), new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(4), transparent: true, toneMapped: false, depthWrite: false }))) };
        pulse.floor.rotation.x = -Math.PI / 2; pulse.floor.position.copy(portal.front()).setY(portal.front().y + 0.05);
        pulse.frame.position.copy(L(0, H - W / 2, 0.4)); pulse.frame.quaternion.copy(portal.grp.quaternion);
      }
      if (pulse) { pulse.t += dt; const u = Math.min(1, pulse.t / 0.3); pulse.floor.scale.setScalar(1 + u * 6); pulse.floor.material.opacity = 1 - u; pulse.frame.scale.setScalar(1 + u * 0.15); pulse.frame.material.opacity = 1 - u; }
      return k >= 1;
    },
    dispose() {
      bolt?.dispose();
      for (const m of meshes) { scene.remove(m); m.geometry?.dispose(); if (m.material && !m.material.isShared) m.material.dispose?.(); }
      for (const p of parts) p.dispose();
    },
  };
}

/** Pontos de uma silhueta de cervo (desenhada em canvas) para o Patrono. */
function stagPoints(n, size) {
  const c = makeCanvas(200, 200); const g = c.getContext('2d'); g.fillStyle = '#fff';
  // corpo, pescoço, cabeça, pernas e galhada — formas simples
  g.beginPath(); g.ellipse(95, 110, 48, 22, 0, 0, 7); g.fill();
  g.beginPath(); g.moveTo(130, 100); g.lineTo(150, 60); g.lineTo(162, 64); g.lineTo(146, 108); g.fill();
  g.beginPath(); g.ellipse(160, 58, 14, 8, -0.4, 0, 7); g.fill();
  for (const x of [60, 75, 115, 130]) { g.fillRect(x, 118, 7, 50); }
  g.strokeStyle = '#fff'; g.lineWidth = 4;
  const ant = (x0, y0, dir) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + dir * 10, y0 - 30); g.lineTo(x0 + dir * 22, y0 - 44); g.moveTo(x0 + dir * 6, y0 - 18); g.lineTo(x0 + dir * 20, y0 - 22); g.moveTo(x0 + dir * 12, y0 - 34); g.lineTo(x0 + dir * 2, y0 - 46); g.stroke(); };
  ant(156, 52, -1); ant(164, 52, 1);
  const img = g.getImageData(0, 0, 200, 200).data; const pts = [];
  let guard = 0;
  while (pts.length < n * 3 && guard++ < 200000) {
    const x = Math.random() * 200, y = Math.random() * 200;
    if (img[(Math.floor(y) * 200 + Math.floor(x)) * 4] > 128) pts.push((x / 200 - 0.5) * size * 1.6, (1 - y / 200) * size * 1.2 - 0.6, (Math.random() - 0.5) * 0.4);
  }
  // o cervo olha para dentro do túnel (eixo -Z local): gira no plano
  const out = new Float32Array(pts.length);
  for (let i = 0; i < pts.length; i += 3) { out[i] = pts[i + 2]; out[i + 1] = pts[i + 1]; out[i + 2] = -pts[i]; }
  return out;
}
