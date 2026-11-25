import { mapaPanem } from './mapa.js';
import * as THREE from 'three';
import { PALETTE, mat, glow, plateMaterial, makeCanvas, drawBat } from './materials.js';
import { P, DEG, V3, railing, collBox, arcPoints, Batch } from './util.js';
import { HALL } from './data.js';
import { buildCar } from './car.js';

/*
 * Hub central fiel à referência original (docs/referencia.png):
 *  - plataforma redonda com o grande morcego aceso no piso
 *  - Batcomputador ao fundo: tela panorâmica curva com o mapa, fileira de monitores e consoles com cadeiras
 *  - garagem à esquerda (sob o arco de rocha) com o veículo numa plataforma giratória rente ao piso
 */

const PL = HALL.platform;
export const COMMAND_TOP = { top: PL.y, z1: -12 }; // compatibilidade com main.js

function monitor(hubVis, tex, w, h, pos, yaw, tilt = 0.15) {
  const g = new THREE.Group(); g.position.copy(pos); g.rotation.set(0, yaw, 0, 'YXZ'); hubVis.add(g);
  const fr = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.1), mat.matteBlack); g.add(fr);
  const sc = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); sc.position.z = 0.055; g.add(sc);
  g.rotateX(-tilt);
  return g;
}

export function buildHub({ root, batch, colliders, updaters, interactables, screenTexture, renderer, areas = new Set() }) {
  // Quando a peça do Blender existe (area_hub.glb / area_garagem.glb), o visual procedural vai para
  // um grupo e um lote descartados; colisores, luzes e interações continuam iguais.
  const hasHub = areas.has('hub'), hasGar = areas.has('garagem');
  const hubVis = hasHub ? new THREE.Group() : root, hubBatch = hasHub ? new Batch() : batch;
  const garVis = hasGar ? new THREE.Group() : root, garBatch = hasGar ? new Batch() : batch;
  /* ---------- plataforma redonda ---------- */
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(PL.r, PL.r * 0.97, 0.6, 96), plateMaterial(6, 0x8f9aa2));
  deck.position.y = PL.y - 0.3; deck.receiveShadow = true; hubVis.add(deck);
  const dc = new THREE.Mesh(new THREE.CylinderGeometry(PL.r, PL.r, 0.6, 48)); dc.position.y = PL.y - 0.3; colliders.add(dc);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(PL.r * 0.97, PL.r * 0.78, 3.4, 64, 1, true), mat.graphite); skirt.position.y = PL.y - 2.3; hubVis.add(skirt);
  for (const [y, k] of [[PL.y + 0.02, 1.2], [PL.y - 0.7, 0.8], [PL.y - 1.6, 0.55]]) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(PL.r * (y > PL.y ? 0.995 : 0.95), 0.045, 6, 128), glow(PALETTE.electric, k)); r.rotation.x = Math.PI / 2; r.position.y = y; hubVis.add(r);
  }
  for (let i = 0; i < 12; i++) { const p = P(PL.r * 0.74, i * 30 + 15, PL.y - 4.2); hubBatch.add(new THREE.CylinderGeometry(0.5, 0.7, 7.4, 12), mat.graphite, p); }
  // grande morcego aceso no piso (como na arte), com anéis concêntricos
  {
    const c = makeCanvas(1024, 1024); const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, 1024, 1024);
    g.strokeStyle = '#1ec8ff'; g.lineWidth = 9; g.beginPath(); g.arc(512, 512, 480, 0, 7); g.stroke();
    g.lineWidth = 3; g.globalAlpha = 0.7; for (const r of [440, 400]) { g.beginPath(); g.arc(512, 512, r, 0, 7); g.stroke(); }
    g.globalAlpha = 0.45; g.beginPath(); g.ellipse(512, 512, 360, 190, 0, 0, 7); g.stroke(); g.globalAlpha = 1;
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; g.fillStyle = i % 5 ? '#0a6d99' : '#1ec8ff'; g.fillRect(512 + Math.cos(a) * 460 - 4, 512 + Math.sin(a) * 460 - 4, 8, 8); }
    const grd = g.createRadialGradient(512, 512, 40, 512, 512, 330); grd.addColorStop(0, 'rgba(60,200,255,0.9)'); grd.addColorStop(1, 'rgba(20,120,200,0.35)');
    drawBat(g, 512, 512, 300, grd);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const emb = new THREE.Mesh(new THREE.CircleGeometry(PL.r * 0.84, 96), new THREE.MeshStandardMaterial({ color: 0x0f161d, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.75, roughness: 0.45, metalness: 0.7, envMapIntensity: 0.6 }));
    emb.rotation.x = -Math.PI / 2; emb.position.y = PL.y + 0.012; hubVis.add(emb);
    updaters.push((dt, t) => { emb.material.emissiveIntensity = 0.7 + Math.sin(t * 1.2) * 0.1; });
  }
  // balizas de luz na borda
  for (let i = 0; i < 16; i++) { const p = P(PL.r - 0.9, i * 22.5 + 11, PL.y); hubBatch.add(new THREE.CylinderGeometry(0.09, 0.11, 0.45, 10), mat.rail, p.clone().setY(PL.y + 0.22)); hubBatch.add(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 10), glow(PALETTE.cyan, 1.6), p.clone().setY(PL.y + 0.48)); }
  // guarda-corpo: aberturas na frente (ponte de entrada), laterais (escadas das galerias) e esquerda (garagem)
  for (const [a0, a1] of [[-172, -96], [-84, -47], [-39, 39], [47, 172]]) railing(arcPoints(PL.r - 0.25, a0, a1, PL.y, 1.2), { batch: hubBatch, colliders });

  /* ---------- Batcomputador: tela panorâmica curva + monitores + consoles ---------- */
  const main = screenTexture('map'); updaters.push(main.update);
  const tele = screenTexture('tele'); updaters.push(tele.update);
  const cams = screenTexture('cams'); updaters.push(cams.update);
  const diag = screenTexture('diag'); updaters.push(diag.update);
  const panem = mapaPanem(); updaters.push(panem.update);
  const liveRT = new THREE.WebGLRenderTarget(384, 216); liveRT.texture.colorSpace = THREE.SRGBColorSpace;
  const liveCam = new THREE.PerspectiveCamera(55, 16 / 9, 0.3, 200);
  const live = { rt: liveRT, cam: liveCam, target: null, acc: 0, active: false };
  {
    const R0 = 11.2, arc = 70;
    if (!hasHub) { main.tex.wrapS = THREE.RepeatWrapping; main.tex.repeat.x = -1; } // só o cilindro procedural (BackSide) precisa espelhar
    const scr = new THREE.Mesh(new THREE.CylinderGeometry(R0, R0, 4.2, 72, 1, true, (180 - arc / 2) * DEG, arc * DEG), new THREE.MeshBasicMaterial({ map: main.tex, toneMapped: false, side: THREE.BackSide }));
    scr.position.y = PL.y + 4.4; hubVis.add(scr);
    for (const y of [PL.y + 2.2, PL.y + 6.6]) { const fr = new THREE.Mesh(new THREE.CylinderGeometry(R0 + 0.2, R0 + 0.2, 0.28, 72, 1, true, (180 - arc / 2 - 1) * DEG, (arc + 2) * DEG), mat.darkMetal); fr.position.y = y; hubVis.add(fr); }
    const backP = new THREE.Mesh(new THREE.CylinderGeometry(R0 + 0.45, R0 + 0.45, 7.2, 72, 1, true, (180 - arc / 2 - 3) * DEG, (arc + 6) * DEG), mat.graphite); backP.position.y = PL.y + 4.1; hubVis.add(backP);
    for (const y of [PL.y + 2.0, PL.y + 6.85]) { const led = new THREE.Mesh(new THREE.CylinderGeometry(R0 - 0.02, R0 - 0.02, 0.05, 72, 1, true, (180 - arc / 2) * DEG, arc * DEG), new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.electric).multiplyScalar(1.4), toneMapped: false, side: THREE.BackSide })); led.position.y = y; hubVis.add(led); }
    for (const f of [-28, -10, 10, 28]) collBox(colliders, 5, 7, 0.8, P(R0 + 0.3, f, PL.y + 3.5), [0, -f * DEG, 0]);
    for (const s of [-1, 1]) monitor(hubVis, tele.tex, 2.6, 2.6, P(R0 - 0.6, s * 44, PL.y + 4.3), -s * 44 * DEG + Math.PI, 0);
  }
  // fileira de consoles em arco com monitores e cadeiras
  for (let i = -4; i <= 4; i++) {
    if (i === 0) continue;
    const f = i * 8.5; const desk = new THREE.Group(); desk.position.copy(P(7.6, f, PL.y)); desk.rotation.y = -f * DEG + Math.PI; hubVis.add(desk);
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.95, 0.9), mat.darkMetal); body.position.y = 0.48; desk.add(body);
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.06, 1.05), mat.graphite); top.position.y = 0.98; top.rotation.x = -0.12; desk.add(top);
    const keys = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.35), glow(0x0a87c4, 0.8)); keys.rotation.x = -Math.PI / 2 - 0.12; keys.position.set(0, 1.02, 0.12); desk.add(keys);
    const tex = i === -1 ? liveRT.texture : [cams.tex, tele.tex, diag.tex][(i + 4) % 3];
    const mon = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.0), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); mon.position.set(0, 1.8, -0.3); mon.rotation.set(-0.2, Math.PI, 0); desk.add(mon);
    const monB = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 0.06), mat.matteBlack); monB.position.set(0, 1.8, -0.34); monB.rotation.x = -0.2; desk.add(monB);
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), mat.rail); stand.position.set(0, 1.25, -0.36); desk.add(stand);
    const ch = new THREE.Group(); ch.position.set(0, 0, 1.15); desk.add(ch);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.6), mat.matteBlack); seat.position.y = 0.55; ch.add(seat);
    const bk = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.1), mat.matteBlack); bk.position.set(0, 1, 0.3); ch.add(bk);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), mat.rail); pole.position.y = 0.27; ch.add(pole);
    collBox(colliders, 2.1, 1.2, 1.0, desk.position.clone().setY(PL.y + 0.6), [0, desk.rotation.y, 0]);
  }
  // console central (de onde se opera) e racks de servidores nas pontas
  {
    const desk = new THREE.Group(); desk.position.copy(P(7.0, 0, PL.y)); desk.rotation.y = Math.PI; hubVis.add(desk);
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.0, 1.1), mat.darkMetal); body.position.y = 0.5; desk.add(body);
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.07, 1.25), mat.graphite); top.position.y = 1.03; top.rotation.x = -0.12; desk.add(top);
    for (let k = 0; k < 3; k++) { const kb = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.35), glow(k === 1 ? 0x1ec8ff : 0x0a87c4, 0.9)); kb.rotation.x = -Math.PI / 2 - 0.12; kb.position.set(-0.95 + k * 0.95, 1.08, 0.15); desk.add(kb); }
    collBox(colliders, 3.1, 1.2, 1.2, desk.position.clone().setY(PL.y + 0.6));
    const sl = new THREE.PointLight(0x2aa8ff, 26, 10, 1.6); sl.position.set(0, PL.y + 3, -6); root.add(sl);
  }
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
    const f = s * (58 + k * 4); const rk = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.6, 1), mat.darkMetal); rk.position.copy(P(10.4, f, PL.y + 1.3)); // fora das aberturas das pontes (39–47°) rk.rotation.y = -f * DEG; hubVis.add(rk);
    for (let j = 0; j < 9; j++) { const led = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.02), glow(j % 3 ? 0x0a87c4 : 0x2fff9a, 1.6)); led.position.set(0, -1.1 + j * 0.27, 0.51); rk.add(led); }
    collBox(colliders, 1.2, 2.6, 1.1, rk.position.clone(), [0, rk.rotation.y, 0]);
  }
  interactables.push({ kind: 'computer', label: () => 'E — operar o Batcomputador', pos: () => P(5.8, 0, PL.y), radius: 2.6 });
  const camPose = { to: V3(0, PL.y + 2.6, -3.2), look: V3(0, PL.y + 4.0, -11) };
  updaters.push((dt) => {
    live.acc += dt; if (live.acc < 0.25 || !live.target || !live.active) return; live.acc = 0;
    const tgt = live.target(); if (!tgt) return; const sc = root.parent; if (!sc) return;
    liveCam.position.copy(tgt.from); liveCam.lookAt(tgt.at);
    const prev = renderer.getRenderTarget(); renderer.setRenderTarget(liveRT); renderer.render(sc, liveCam); renderer.setRenderTarget(prev);
  });

  /* ---------- garagem à esquerda (sob o arco de rocha), carro em plataforma giratória rente ao piso ---------- */
  const gx = -24, gz = 4; const TT = V3(gx + 0.5, PL.y, gz + 1);
  {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(14, 0.6, 20), plateMaterial(4, 0x8b969e)); slab.position.set(gx, PL.y - 0.3, gz); slab.receiveShadow = true; garVis.add(slab);
    collBox(colliders, 14, 0.6, 20, V3(gx, PL.y - 0.3, gz));
    for (const z of [-5.9, 13.9]) garBatch.add(new THREE.BoxGeometry(13, 0.02, 0.3), glow(0xf5b642, 0.9), V3(gx, PL.y + 0.01, z));
    const turn = new THREE.Group(); turn.position.copy(TT).setY(PL.y + 0.02); root.add(turn);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4.3, 0.04, 96), plateMaterial(3, 0x6d7880)); garVis === root ? turn.add(disc) : garVis.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.3, 0.04, 6, 96), glow(PALETTE.electric, 0.9)); ring.rotation.x = Math.PI / 2; ring.position.copy(TT).setY(PL.y + 0.05); garVis.add(ring);
    const car = buildCar(); car.name = 'HERO_CAR'; car.position.copy(TT).setY(PL.y + 0.04); car.rotation.y = Math.PI * 0.62; root.add(car);
    { const cc = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 2.4, 24)); cc.position.copy(TT).setY(PL.y + 1.2); colliders.add(cc); }
    root.userData.turntable = { turn, speed: 0.06, TT };
    let carro = null;   // o GLB troca o carro depois da carga: busca de novo só se o guardado saiu da cena
    updaters.push((dt) => { const s = root.userData.turntable.speed; turn.rotation.y += dt * s; if (!carro || !carro.parent) carro = root.getObjectByName('HERO_CAR'); if (carro) carro.rotation.y += dt * s; });
    interactables.push({ kind: 'info', label: () => 'Veículo blindado — comande a plataforma pelo Batcomputador', pos: () => TT.clone(), radius: 6 });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(15, 0.8, 21), mat.graphite); roof.position.set(gx - 0.5, 8.6, gz); garVis.add(roof);
    for (let z = -4; z <= 12; z += 4) garBatch.add(new THREE.BoxGeometry(7, 0.05, 0.12), glow(0xdff6ff, 0.55), V3(gx, 8.18, z));
    for (const [x, z] of [[-17.5, -5.5], [-17.5, 13.5]]) garBatch.add(new THREE.BoxGeometry(0.6, 7.6, 0.6), mat.graphite, V3(x, 4.8, z));
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 7, 20), plateMaterial(3, 0x56616a)); back.position.set(-31.2, 5, gz); garVis.add(back);
    collBox(colliders, 0.6, 7, 20, V3(-31.2, 5, gz));
    collBox(colliders, 14, 3, 0.4, V3(gx, PL.y + 1.5, -6.1)); collBox(colliders, 14, 3, 0.4, V3(gx, PL.y + 1.5, 14.1));
    for (let i = 0; i < 14; i++) garBatch.add(new THREE.BoxGeometry(0.06, 0.6 + (i % 3) * 0.2, 0.08), mat.rail, V3(-30.85, 3.0 + (i % 2) * 0.9, gz - 6 + i * 0.85));
    garBatch.add(new THREE.BoxGeometry(0.1, 2.2, 12), mat.slate, V3(-30.95, 3.4, gz));
    for (const z of [-3, 9]) monitor(garVis, diag.tex, 2.4, 1.4, V3(-30.8, 4.4, z), Math.PI / 2, 0);
    garBatch.add(new THREE.BoxGeometry(1.2, 1, 5), mat.darkMetal, V3(-30, PL.y + 0.5, gz + 9));
    for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.22, 10, 24), mat.matteBlack); t.position.set(-29.8, PL.y + 0.8, gz - 4 + i * 0.6); t.rotation.y = Math.PI / 2; garVis.add(t); }
    const arm = new THREE.Group(); arm.position.set(-29.5, PL.y, gz + 5.5); garVis.add(arm);
    arm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.6, 16), mat.graphite)); arm.children[0].position.y = 0.3;
    const j1 = new THREE.Group(); j1.position.y = 0.6; arm.add(j1);
    const armM = new THREE.MeshStandardMaterial({ color: 0xc28a2c, roughness: 0.5, metalness: 0.6 });
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.2, 0.25), armM); s1.position.y = 1.1; j1.add(s1);
    const j2 = new THREE.Group(); j2.position.y = 2.2; j1.add(j2);
    const s2 = s1.clone(); s2.scale.y = 0.8; s2.position.y = 0.88; j2.add(s2);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), mat.glowCyan); tip.position.y = 1.8; j2.add(tip);
    updaters.push((dt, t) => { j1.rotation.z = -0.5 + Math.sin(t * 0.4) * 0.25; j2.rotation.z = 1.1 + Math.sin(t * 0.55 + 1) * 0.35; arm.rotation.y = Math.sin(t * 0.2) * 0.6; });
    const key = new THREE.SpotLight(0xdbe9f7, 110, 24, 0.8, 0.8, 1.5); key.position.set(gx, 8, gz + 1); key.target.position.copy(TT); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); root.add(key, key.target);
    const rim = new THREE.SpotLight(0x2a9ff0, 50, 18, 0.8, 0.9, 1.5); rim.position.copy(TT).add(V3(4, 3.5, -6)); rim.target.position.copy(TT); root.add(rim, rim.target);
  }

  return { live, TT, camPose, screens: { panem: panem.tex, main: main.tex, tele: tele.tex, cams: cams.tex, diag: diag.tex, live: liveRT.texture } };
}
