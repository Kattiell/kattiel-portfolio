/*
 * Camada de acabamento do salão (feita depois que as áreas do Blender entram):
 *  - névoa de cachoeira: partículas que sobem e se abrem no pé de cada queda (lidas das espumas AGUA_espuma_*);
 *  - neblina rasteira em camadas sobre o lago;
 *  - halo da cor do distrito na boca de cada túnel;
 *  - rochas molhadas na linha d'água, ao pé das galerias, com fios de água escorrendo.
 * Tudo é visual (sem colisão) e barato: poucas chamadas de desenho, nada de luz nova.
 * O nível "baixa" desliga névoa e neblina (Points ficam ocultos no aplicarNivel; os planos saem aqui).
 */
import * as THREE from 'three';
import { DISTRICTS, HALL, districtSlot } from './data.js';
import { displace, rockMaterial, makeCanvas, fbm } from './materials.js';
import { P, DEG, rand } from './util.js';

const rr = rand(4242);

function texturaSuave(tam = 128, nuvem = false) {
  const c = makeCanvas(tam, tam); const g = c.getContext('2d');
  if (!nuvem) {
    const gr = g.createRadialGradient(tam / 2, tam / 2, 0, tam / 2, tam / 2, tam / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, tam, tam);
  } else {
    const img = g.createImageData(tam, tam);
    for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) {
      // ruído tileável: amostra num toro
      const a = (x / tam) * Math.PI * 2, b = (y / tam) * Math.PI * 2;
      const n = fbm(Math.cos(a) * 1.2, Math.sin(a) * 1.2 + Math.cos(b) * 1.2, Math.sin(b) * 1.2, 5) * 0.5 + 0.5;
      const v = Math.max(0, Math.min(255, (n - 0.35) * 2.2 * 255));
      const i = (y * tam + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = v;
    }
    g.putImageData(img, 0, 0);
  }
  const t = new THREE.CanvasTexture(c); if (nuvem) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

/** Névoa de cachoeira: cada emissor solta partículas que sobem, crescem e somem (tudo no shader). */
function nevoa(emissores, sprite) {
  const N = emissores.reduce((s, e) => s + e.n, 0);
  const pos = new Float32Array(N * 3), seed = new Float32Array(N * 4);
  let k = 0;
  for (const e of emissores) for (let i = 0; i < e.n; i++, k++) {
    pos.set([e.c.x, e.c.y, e.c.z], k * 3);
    seed.set([(rr() - 0.5) * e.w, (rr() - 0.5) * e.d, rr(), e.s], k * 4);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 10, 0), 80);
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { t: { value: 0 }, mapa: { value: sprite }, escala: { value: innerHeight / 2 } },
    vertexShader: `attribute vec4 seed; uniform float t; uniform float escala; varying float vA;
      void main(){
        float vida = fract(t * 0.16 + seed.z);
        vec3 p = position + vec3(seed.x * (0.6 + vida), vida * 3.2 * seed.w, seed.y * (0.6 + vida));
        p.x += sin(t * 0.7 + seed.z * 20.0) * 0.4 * vida;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (1.6 + vida * 4.2) * seed.w * escala / -mv.z;
        vA = smoothstep(0.0, 0.15, vida) * (1.0 - vida) * 0.5;
      }`,
    fragmentShader: `uniform sampler2D mapa; varying float vA;
      void main(){ float a = texture2D(mapa, gl_PointCoord).a * vA; gl_FragColor = vec4(vec3(0.78, 0.9, 1.0) * a, a); }`,
  });
  const pts = new THREE.Points(geo, m); pts.frustumCulled = false; pts.renderOrder = 3; pts.name = 'APR_nevoa';
  return pts;
}

/** Neblina rasteira: dois planos de nuvem que derivam devagar em sentidos opostos. */
function neblina(nuvem) {
  const g = new THREE.Group(); g.name = 'APR_neblina';
  const camadas = [];
  for (const [y, op, rep, vel] of [[0.5, 0.11, 3, 0.006], [1.7, 0.07, 2, -0.004], [3.4, 0.04, 1.5, 0.003]]) {
    const t = nuvem.clone(); t.needsUpdate = true; t.repeat.set(rep, rep);
    const m = new THREE.MeshBasicMaterial({ map: t, color: 0x9fc6e0, transparent: true, opacity: op, depthWrite: false, fog: true });
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(34, 48), m); mesh.rotation.x = -Math.PI / 2; mesh.position.y = y; mesh.renderOrder = 2;
    g.add(mesh); camadas.push([t, vel]);
  }
  return { g, update: (dt, t) => { for (const [tx, v] of camadas) { tx.offset.x = t * v; tx.offset.y = t * v * 0.6; } } };
}

/** Halo na boca de cada túnel: um brilho suave na cor do distrito, que respira. */
function halos(districts, sprite) {
  const out = [];
  for (const p of districts.portals) {
    const m = new THREE.MeshBasicMaterial({ map: sprite, color: new THREE.Color(p.d.color).multiplyScalar(0.4), transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const h = new THREE.Mesh(new THREE.PlaneGeometry(HALL.portalW * 2.1, HALL.portalH * 1.7), m);
    h.position.set(0, HALL.portalH * 0.5, 1.1); h.renderOrder = 2; h.name = 'APR_halo';
    p.grp.add(h); out.push([m, p]);
  }
  return (dt, t) => { for (const [m, p] of out) { const c = window.__cam?.position; const perto = c ? Math.min(1, Math.max(0, (p.front().distanceTo(c) - 3) / 8)) : 1;
    m.opacity = (0.2 + Math.sin(t * 0.9 + p.d.id) * 0.04) * (1 - (p.open || 0)) * perto; } };   // de perto e aberto: sem véu de luz
}

/** Rochas molhadas na linha d'água, ao pé das galerias (só nos vãos entre túneis da galeria de baixo). */
function rochasDaMargem() {
  const g = new THREE.Group(); g.name = 'APR_rochas';
  const matR = rockMaterial({ wetLevel: 1.2, scale: 0.3, moss: 0.25 });
  const ocupados = DISTRICTS.filter((d) => !districtSlot(d).upper).map((d) => districtSlot(d).phi);
  const vaos = [];
  for (let i = 0; i < ocupados.length - 1; i++) { const a = ocupados[i], b = ocupados[i + 1]; if (Math.abs(a) > 1 && Math.abs(b) > 1 && Math.sign(a) === Math.sign(b)) vaos.push((a + b) / 2); }
  vaos.push(-64, 64);   // pontas das galerias
  let seed = 1;
  for (const phi of vaos) {
    for (let k = 0; k < 3; k++) {
      const geo = new THREE.IcosahedronGeometry(1, 3);
      displace(geo, { scale: 0.7, amp: 0.45, seed: seed++, oct: 4, ridge: 0.5 });
      const r = HALL.lower.rIn - 3.4 - k * 1.3 - rr() * 0.6;
      const s = [2.6, 1.8, 1.2][k] * (0.85 + rr() * 0.3);
      const m = new THREE.Mesh(geo, matR);
      m.scale.set(s * 1.3, s * (0.9 + rr() * 0.5), s);
      m.position.copy(P(r, phi + (rr() - 0.5) * 4 + (k - 1) * 2.2, -s * 0.35));
      m.rotation.set(rr() * 0.4, rr() * 6.28, rr() * 0.3);
      m.receiveShadow = true; g.add(m);
    }
  }
  return g;
}

export function aprimorar({ scene, hall, districts }) {
  const sprite = texturaSuave(128), nuvem = texturaSuave(256, true);
  const feitos = [];

  // emissores de névoa nas espumas do GLB (tamanho pela área da espuma)
  const emissores = [];
  hall.root.updateMatrixWorld(true);
  hall.root.traverse((o) => {
    if (!o.isMesh) return;
    let n = o, nome = ''; while (n) { if (/^AGUA_espuma/.test(n.name)) { nome = n.name; break; } n = n.parent; }
    if (!nome) return;
    o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
    const c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
    const area = s.x * s.z; const grande = area > 20;
    emissores.push({ c, w: s.x * 0.9, d: s.z * 0.9, n: Math.min(90, Math.round(18 + area * 2.2)), s: grande ? 1.6 : 1.0 });
  });
  if (emissores.length) { const nv = nevoa(emissores, sprite); hall.root.add(nv); hall.updaters.push((dt, t) => { nv.material.uniforms.t.value = t; }); feitos.push(`névoa×${emissores.length}`); }
  addEventListener('resize', () => { scene.traverse((o) => { if (o.name === 'APR_nevoa') o.material.uniforms.escala.value = innerHeight / 2; }); });

  const nb = neblina(nuvem); hall.root.add(nb.g); hall.updaters.push(nb.update); feitos.push('neblina');
  hall.updaters.push(halos(districts, sprite)); feitos.push('halos');
  hall.root.add(rochasDaMargem()); feitos.push('rochas');

  return {
    feitos,
    /** baixa: sem neblina (a névoa é Points e já some com o nível) */
    nivel: (n) => { nb.g.visible = n !== 'baixa'; hall.root.traverse((o) => { if (o.name === 'APR_halo') o.visible = n !== 'baixa'; }); },   // celular: sem neblina e sem halos (12 desenhos a menos)
  };
}
