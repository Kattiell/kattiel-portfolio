import * as THREE from 'three';
import { glow } from './materials.js';

// Veículo blindado autoral: longo, baixo, chapas facetadas, rodas largas,
// aletas inspiradas em asa de morcego. Frente em +Z, chão em y = 0. ~6,2 m.

const paint = new THREE.MeshPhysicalMaterial({ color: 0x0d1014, roughness: 0.45, metalness: 0.65, clearcoat: 0.5, clearcoatRoughness: 0.35, envMapIntensity: 1.0 });
const armor = new THREE.MeshPhysicalMaterial({ color: 0x1c2127, roughness: 0.6, metalness: 0.55, clearcoat: 0.15, envMapIntensity: 1.0 });
const steel = new THREE.MeshStandardMaterial({ color: 0x7a838c, roughness: 0.3, metalness: 1, envMapIntensity: 1.5 });
const rubber = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85, metalness: 0 });
const tint = new THREE.MeshPhysicalMaterial({ color: 0x05080c, roughness: 0.06, metalness: 0.3, clearcoat: 1 });

/** Prisma a partir de um perfil lateral (y,z) extrudado na largura x. */
function sideProfile(pts, width, bevel = 0.04) {
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]);
  for (const [z, y] of pts.slice(1)) s.lineTo(z, y);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1 });
  g.translate(0, 0, -width / 2); g.rotateY(-Math.PI / 2);
  // após rotateY(-90): x do shape -> z do mundo (comprimento), z do extrude -> x (largura)
  return g;
}

function wheel(r, w, front) {
  const g = new THREE.Group();
  // pneu com sulcos: cilindro + blocos da banda
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 40, 1), rubber); tire.rotation.z = Math.PI / 2; g.add(tire);
  for (let i = 0; i < 28; i++) {
    const a = i / 28 * Math.PI * 2;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, 0.06, 0.1), rubber);
    b.position.set((i % 2 ? 1 : -1) * w * 0.22, Math.cos(a) * (r + 0.015), Math.sin(a) * (r + 0.015)); b.rotation.x = a; g.add(b);
  }
  // aro e cubo com raios próprios
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.62, w + 0.02, 32, 1, true), steel); rim.rotation.z = Math.PI / 2; g.add(rim);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r * 0.6, 0.05, 32), armor); disc.rotation.z = Math.PI / 2; disc.position.x = w / 2 - 0.02; g.add(disc);
  for (let i = 0; i < 6; i++) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.06, r * 0.95, 0.1), steel); sp.rotation.x = i * Math.PI / 3; sp.position.x = w / 2 + 0.01; g.add(sp);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.12, 6), steel); hub.rotation.z = Math.PI / 2; hub.position.x = w / 2 + 0.05; g.add(hub);
  const ringG = new THREE.Mesh(new THREE.TorusGeometry(r * 0.45, 0.012, 4, 32), glow(0x1ec8ff, front ? 1.5 : 1.1)); ringG.rotation.y = Math.PI / 2; ringG.position.x = w / 2 + 0.02; g.add(ringG);
  return g;
}

export function buildCar() {
  const car = new THREE.Group(); car.name = 'HERO_ArmoredVehicle';
  const W = 2.2;
  // chassi inferior
  const chassis = new THREE.Mesh(sideProfile([[-2.7, 0.32], [2.6, 0.32], [2.9, 0.55], [2.4, 0.8], [-2.8, 0.85], [-3.0, 0.55]], W * 0.78, 0.03), armor); car.add(chassis);
  // carroceria principal facetada
  const body = new THREE.Mesh(sideProfile([
    [3.05, 0.6], [2.2, 0.95], [1.0, 1.05], [0.3, 1.5], [-0.9, 1.62], [-1.9, 1.45], [-2.9, 1.25], [-3.1, 0.75], [-2.2, 0.62], [2.4, 0.55],
  ], W * 0.66, 0.05), paint);
  car.add(body);
  // cockpit (vidro escurecido) em cunha
  const cock = new THREE.Mesh(sideProfile([[0.9, 1.08], [0.35, 1.5], [-0.85, 1.6], [-0.6, 1.1]], W * 0.5, 0.03), tint); cock.position.y = 0.02; car.add(cock);
  // chapas de blindagem do capô (sobrepostas, levemente anguladas)
  for (let i = 0; i < 3; i++) {
    const pl = new THREE.Mesh(new THREE.BoxGeometry(W * (0.62 - i * 0.08), 0.05, 0.62), armor);
    pl.position.set(0, 0.99 - i * 0.03, 2.4 - i * 0.6); pl.rotation.x = 0.1 + i * 0.03; car.add(pl);
  }
  // para-lamas dianteiros independentes (estilo carenagem)
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(sideProfile([[2.95, 0.65], [2.6, 1.0], [1.4, 1.02], [1.0, 0.7], [1.6, 0.6]], 0.42, 0.03), paint);
    f.position.x = s * (W * 0.5 + 0.05); car.add(f);
    // para-lamas traseiros largos
    const r = new THREE.Mesh(sideProfile([[-0.9, 0.7], [-1.2, 1.25], [-2.6, 1.2], [-3.0, 0.75], [-2.2, 0.55]], 0.5, 0.04), armor);
    r.position.x = s * (W * 0.5 + 0.12); car.add(r);
    // entradas de ar laterais
    for (let k = 0; k < 4; k++) {
      const v = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.42), steel); v.position.set(s * (W * 0.33 + 0.01), 1.12 - k * 0.08, -0.4); car.add(v);
    }
    // aletas traseiras (asa de morcego, recortada)
    const fs = new THREE.Shape(); fs.moveTo(0, 0); fs.lineTo(-1.25, 0.05); fs.lineTo(-1.55, 0.62); fs.lineTo(-1.15, 0.4); fs.lineTo(-0.9, 0.55); fs.lineTo(-0.6, 0.28); fs.lineTo(-0.2, 0.3); fs.closePath();
    const fin = new THREE.Mesh(new THREE.ExtrudeGeometry(fs, { depth: 0.06, bevelEnabled: false }), paint);
    fin.rotation.y = -Math.PI / 2; fin.position.set(s * (W * 0.26) - 0.03, 1.36, -1.6); fin.rotation.z = s * 0.06; car.add(fin);
    // braços de suspensão aparentes
    for (const z of [2.0, -1.9]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.07, 0.12), steel); arm.position.set(s * (W * 0.42), 0.52, z); arm.rotation.z = s * 0.2; car.add(arm);
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), steel); sh.position.set(s * (W * 0.38), 0.72, z + 0.12); sh.rotation.z = s * 0.5; car.add(sh);
      const spring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 4, 12), glow(0xc28a2c, 0.9)); spring.position.copy(sh.position); car.add(spring);
    }
    // faróis em lâmina
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.03), glow(0xbfeaff, 3)); hl.position.set(s * 0.62, 0.86, 3.0); hl.rotation.y = s * 0.15; car.add(hl);
    const hl2 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.025, 0.03), glow(0x1ec8ff, 2.5)); hl2.position.set(s * 0.68, 0.78, 2.98); car.add(hl2);
    // lanterna traseira
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.03), glow(0xff2a2a, 2)); tl.position.set(s * 0.55, 1.05, -3.12); car.add(tl);
    // painéis de manutenção (frisos)
    const pn = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.25, 0.7), steel); pn.position.set(s * (W * 0.33 + 0.02), 0.85, 0.9); car.add(pn);
  }
  // turbina traseira com bocal luminoso
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.5, 24, 1, true), steel); nozzle.rotation.x = Math.PI / 2; nozzle.position.set(0, 0.95, -3.15); car.add(nozzle);
  const core = new THREE.Mesh(new THREE.CircleGeometry(0.27, 24), glow(0x3ac8ff, 3)); core.position.set(0, 0.95, -3.36); core.rotation.y = Math.PI; car.add(core);
  for (const s of [-1, 1]) {
    const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.3, 12), steel); ex.rotation.x = Math.PI / 2; ex.position.set(s * 0.7, 0.55, -3.0); car.add(ex);
  }
  // grade frontal e para-choque blindado
  const bump = new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, 0.22, 0.25), armor); bump.position.set(0, 0.45, 2.95); car.add(bump);
  for (let i = -3; i <= 3; i++) { const v = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.05), steel); v.position.set(i * 0.12, 0.66, 3.05); car.add(v); }
  // rodas: dianteiras menores, traseiras largas
  for (const s of [-1, 1]) {
    const fw = wheel(0.5, 0.45, true); fw.position.set(s * (W * 0.5 + 0.1), 0.5, 2.0); if (s < 0) fw.rotation.y = Math.PI; car.add(fw);
    const rw = wheel(0.6, 0.66, false); rw.position.set(s * (W * 0.5 + 0.2), 0.6, -1.9); if (s < 0) rw.rotation.y = Math.PI; car.add(rw);
  }
  // sombra de contato
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 10, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 7.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.01; car.add(sh);
  return car;
}
