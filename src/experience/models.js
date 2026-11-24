import { PAINEIS } from './mapa.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// Modelos gerados fora (Blender por script, Tripo) entram por aqui, por cima das
// versões procedurais. Se um arquivo faltar, a versão procedural continua na cena.
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
// nível baixa (celular): malhas simplificadas em models/lite (geradas por tools/modelos-leves.mjs)
const base = window.__qualidade === 'baixa' && !location.search.includes('lite=0') ? '/models/lite/' : '/models/';

export function load(name) {
  return new Promise((res) => loader.load(base + name, (g) => res(fixChannels(g.scene)), undefined, () => res(null)));
}

// alguns GLBs do gltfpack trazem texCoord = 4294967295 (-1 sem sinal) no KHR_texture_transform:
// o three gera `uv4294967295` e o shader não compila (fachada_01, area_garagem). Volta para o canal 0.
const TEX_KEYS = ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'alphaMap', 'bumpMap', 'lightMap',
  'transmissionMap', 'thicknessMap', 'sheenColorMap', 'sheenRoughnessMap', 'specularIntensityMap', 'specularColorMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap', 'iridescenceMap', 'iridescenceThicknessMap', 'anisotropyMap'];
function fixChannels(scene) {
  scene.traverse((o) => {
    if (!o.material) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) for (const k of TEX_KEYS) {
      const t = m[k]; if (t && t.isTexture && !(t.channel >= 0 && t.channel <= 3)) t.channel = 0;
    }
  });
  return scene;
}

export async function upgradeHall(root) {
  const done = [];
  // escultura do morcego (Blender): troca a geometria, mantém posição e material metálico
  const bat = root.getObjectByName('BAT_SCULPTURE');
  const batScene = bat ? await load('morcego.glb') : null;   // com area_teto o morcego já vem do Blender: nem baixa
  if (bat && batScene) {
    let src = null; batScene.traverse((o) => { if (o.isMesh && !src) src = o; });
    if (src) {
      const g = src.geometry.clone(); g.computeBoundingBox(); const c = g.boundingBox.getCenter(new THREE.Vector3());
      g.translate(-c.x, -c.y, -c.z);
      bat.geometry.dispose(); bat.geometry = g;
      bat.material = new THREE.MeshStandardMaterial({ color: 0x1d232a, metalness: 0.92, roughness: 0.33, envMapIntensity: 1.3 });
      done.push('morcego');
    }
  }
  // veículo (Tripo, simplificado com gltfpack): frente já em +Z; aqui só escala, centro e chão
  const car = root.getObjectByName('HERO_CAR');
  // veiculo2.glb (oficina Blender, já em 6,2 m) tem preferência; o do Tripo fica de reserva
  const carScene = (await load('veiculo2.glb')) || (await load('veiculo.glb'));
  if (car && carScene) {
    carScene.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(carScene); const size = box.getSize(new THREE.Vector3());
    const k = 6.2 / size.z; carScene.scale.multiplyScalar(k); carScene.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(carScene); const c = box.getCenter(new THREE.Vector3());
    carScene.position.x -= c.x; carScene.position.z -= c.z; carScene.position.y -= box.min.y;
    const holder = new THREE.Group(); holder.name = 'HERO_CAR'; holder.add(carScene);
    carScene.traverse((o) => {
      if (!o.isMesh) return; o.castShadow = false; o.receiveShadow = true;
      const m = o.material; if (!m) return;
      m.side = THREE.DoubleSide;          // a malha do Tripo não é fechada: sem buracos por face invertida
      m.envMapIntensity = 0.7;            // material original do Tripo (cor, normal, metálico/rugosidade)
      m.needsUpdate = true;
    });
    const shadow = car.children.find((o) => o.geometry?.type === 'PlaneGeometry'); if (shadow) holder.add(shadow);
    holder.position.copy(car.position); holder.rotation.copy(car.rotation);
    car.parent.add(holder); car.parent.remove(car); done.push('veículo');
  }
  return done;
}


/*
 * Peças protagonistas dos portais (biblioteca da comunidade Tripo, simplificadas com gltfpack).
 * Coordenadas no referencial do portal: boca em z=0, +z para o salão, x à direita de quem olha a boca.
 * fit: 'h' ajusta pela altura, 'w' pela maior medida horizontal. coll: cria caixa de colisão.
 */
const W = 6.4, H = 6.2;
const PORTAL_PROPS = {
  1: [{ size: 2.6, fit: 'h', pos: [-(W / 2 + 1.7), 0, 1.0], rot: 0.4, coll: true }, { size: 1.6, fit: 'h', pos: [W / 2 + 1.5, 0, 1.1], rot: -0.6, coll: true }],
  2: [{ size: 4.2, fit: 'h', pos: [W / 2 + 2.7, 0, 0.9], rot: -0.25, coll: true }],
  4: [{ size: 4.6, fit: 'w', pos: [0.6, 0.05, -6.5], rot: Math.PI / 2 }],
  5: [{ size: 3.0, fit: 'h', pos: [-(W / 2 + 2.3), 0, 1.0], rot: 0.5, coll: true }],
  6: [{ size: 6.5, fit: 'w', pos: [0, 0.1, -5.5], rot: 0 }],
  7: [{ size: 4.4, fit: 'w', pos: [W / 2 + 2.6, 0, 1.0], rot: -0.35, coll: true }],
  8: [{ size: 2.6, fit: 'h', pos: [0, 0, -4.2], rot: 0 }],
  9: [{ size: 6.0, fit: 'h', pos: [-(W / 2 + 2.6), 0, 0.6], rot: 0.3, coll: true }],
  10: [{ size: 4.2, fit: 'w', pos: [W / 2 + 2.6, 0, 1.0], rot: -0.4, coll: true }],
  11: [{ size: 2.8, fit: 'w', pos: [-(W / 2 + 1.6), 0, 1.0], rot: 0.3 }, { size: 2.8, fit: 'w', pos: [W / 2 + 1.6, 0, 1.0], rot: -0.3 }],
  12: [{ size: 2.0, fit: 'w', pos: [-(W / 2 + 1.5), 0, 1.3], rot: 0.5, coll: true }],
};

export async function upgradePortals(districts) {
  const done = [];
  await Promise.all(districts.portals.map(async (portal) => {
    const specs = PORTAL_PROPS[portal.d.id]; if (!specs) return;
    const src = await load(`portal_${String(portal.d.id).padStart(2, '0')}.glb`); if (!src) return;
    for (const sp of specs) {
      const obj = specs.length > 1 && sp !== specs[0] ? src.clone(true) : src;
      obj.updateMatrixWorld(true);
      let box = new THREE.Box3().setFromObject(obj); const size = box.getSize(new THREE.Vector3());
      const k = (sp.fit === 'h' ? sp.size / size.y : sp.size / Math.max(size.x, size.z)) * 1.4; // 40% maior: lê de longe, como na arte
      const holder = new THREE.Group(); holder.add(obj); obj.scale.multiplyScalar(k); obj.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(obj); const c = box.getCenter(new THREE.Vector3());
      obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= box.min.y;
      holder.position.set(...sp.pos); holder.rotation.y = sp.rot || 0;
      obj.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; const m = o.material; if (m) { m.envMapIntensity = 0.8; if (m.map) { m.emissive = new THREE.Color(0xffffff); m.emissiveMap = m.map; m.emissiveIntensity = 0.05; } if (m.metalnessMap) { m.metalnessMap = null; m.metalness = Math.min(m.metalness ?? 0, 0.3); } m.needsUpdate = true; } } });
      holder.userData.tripoProp = true; portal.grp.add(holder);
      if (sp.coll && false) { // sem colisão: as peças ficam rente à parede e nunca podem fechar o corredor da galeria
        portal.grp.updateMatrixWorld(true);
        const wb = new THREE.Box3().setFromObject(holder); const wc = wb.getCenter(new THREE.Vector3()); const ws = wb.getSize(new THREE.Vector3());
        const cm = new THREE.Mesh(new THREE.BoxGeometry(ws.x * 0.8, ws.y, ws.z * 0.8)); cm.position.copy(wc); districts.colliders.add(cm); cm.updateMatrixWorld(true);
      }
    }
    done.push(portal.d.id);
  }));
  return done.sort((a, b) => a - b);
}


/*
 * Fachadas modeladas no Blender (tools/blender/fachadas/fNN.py → public/models/fachada_NN.glb).
 * Mesmo referencial do portal: boca em z=0, salão em +z. Substituem a decoração procedural do tema.
 */
export async function upgradeFacades(districts) {
  const done = [];
  await Promise.all(districts.portals.map(async (portal) => {
    const id = String(portal.d.id).padStart(2, '0');
    const src = await load(`fachada_${id}.glb`); if (!src) return;
    for (const o of portal.themeObjs || []) o.visible = false;
    for (const o of portal.grp.children) if (o.userData.tripoProp) o.visible = false;
    src.traverse((o) => { if (o.isMesh) { o.receiveShadow = true; o.castShadow = false; if (o.material) o.material.envMapIntensity = 0.7; } });
    portal.grp.add(src);
    if (portal.medallion) portal.medallion.position.z = 1.05;
    // colisão: só os lados do vão (o vão e a galeria ficam livres)
    portal.grp.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(portal.grp.matrixWorld).invert();
    const bb = new THREE.Box3(); src.traverse((o) => { if (o.isMesh) { o.geometry.computeBoundingBox(); bb.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld.clone().premultiply(inv))); } });
    const front = Math.max(0.2, bb.max.z), hgt = bb.max.y, R = 6.4 / 2 + 0.15;
    for (const [x0, x1] of [[bb.min.x, -R], [R, bb.max.x]]) {
      if (x1 - x0 < 0.2) continue;
      const cm = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, hgt, front + 1));
      cm.position.set((x0 + x1) / 2, hgt / 2, (front - 1) / 2); portal.grp.add(cm); cm.visible = false;
      cm.updateMatrixWorld(true); const wc = cm.clone(); wc.applyMatrix4(new THREE.Matrix4()); portal.grp.remove(cm);
      wc.matrix.copy(cm.matrixWorld); wc.matrix.decompose(wc.position, wc.quaternion, wc.scale); districts.colliders.add(wc); wc.updateMatrixWorld(true);
    }
    done.push(portal.d.id);
  }));
  return done.sort((a, b) => a - b);
}


/*
 * Áreas do salão modeladas no Blender pela oficina (tools/blender/oficina, contrato em CONTRATO.md).
 * Coordenadas do MUNDO (salão = hall.root). Carregadas ANTES de buildHall: o Set com as que
 * chegaram faz buildHall/buildHub pularem o visual procedural correspondente (os colisores ficam).
 */
export const AREAS = ['caverna', 'agua', 'hub', 'garagem', 'teto'];
export async function loadAreas() {
  const scenes = await Promise.all(AREAS.map((n) => load(`area_${n}.glb`)));
  const map = new Map(); AREAS.forEach((n, i) => { if (scenes[i]) map.set(n, scenes[i]); });
  return map;
}

/** Nome do primeiro ancestral (ou o próprio) com o prefixo dado: o gltfpack põe o nome no nó pai. */
function tagged(o, re) { for (let q = o; q; q = q.parent) if (re.test(q.name || '')) return q.name; return null; }

/**
 * Copia a UV da malha já com o KHR_texture_transform da textura original (desquantização do gltfpack)
 * e com v invertido (glTF usa v=0 no topo; CanvasTexture/RenderTarget usam v=0 embaixo).
 * crop: recorte da textura [u0, u1, v0, v1] para casar com a proporção da tela.
 */
function bakeScreenUV(mesh, srcTex, crop) {
  const g = mesh.geometry.clone(); const uv = g.attributes.uv; if (!uv) return null;
  const off = srcTex?.offset || new THREE.Vector2(0, 0), rep = srcTex?.repeat || new THREE.Vector2(1, 1);
  const [u0, u1, v0, v1] = crop; const out = new Float32Array(uv.count * 2);
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i) * rep.x + off.x, v = 1 - (uv.getY(i) * rep.y + off.y);
    out[i * 2] = u0 + u * (u1 - u0); out[i * 2 + 1] = v0 + v * (v1 - v0);
  }
  g.setAttribute('uv', new THREE.BufferAttribute(out, 2)); mesh.geometry = g; return g;
}

/** Recorte centrado da textura (largura×altura em px) para a proporção da malha (tela vertical). */
function cropFor(mesh, tw, th) {
  mesh.updateWorldMatrix(true, false);
  const b = new THREE.Box3().setFromObject(mesh); const s = b.getSize(new THREE.Vector3());
  const w = Math.hypot(s.x, s.z), h = s.y; if (h < 0.05 || w < 0.05) return [0, 1, 0, 1];
  const ma = w / h, ta = tw / th;
  if (ta > ma) { const k = ma / ta; return [0.5 - k / 2, 0.5 + k / 2, 0, 1]; }
  const k = ta / ma; return [0, 1, 0.5 - k / 2, 0.5 + k / 2];
}

/**
 * Põe as áreas em hall.root e liga o que é animado: telas TELA_* (texturas vivas do hub),
 * água AGUA_* (rolagem de V), disco GIRA_* (gira com o carro). Chamar antes de markReflections.
 */
export function installAreas(hall, areas) {
  const root = hall.root; const done = [];
  for (const [name, sc] of areas) {
    sc.name = `AREA_${name}`;
    sc.traverse((o) => { if (o.isMesh) { o.receiveShadow = true; o.castShadow = false; if (o.material && o.material.envMapIntensity !== undefined) o.material.envMapIntensity = 0.7; } });
    root.add(sc); done.push(name);
  }
  root.updateMatrixWorld(true);

  /* teto: LEDs e lâmpadas no tom da arte (o bloom estourava), aço mais claro para ler a treliça, luz no anel e no morcego */
  if (areas.has('teto')) {
    areas.get('teto').traverse((o) => {
      if (/^TET_morcego(_nervura|_brilho)?$/.test(o.name) && !o.parent?.name?.startsWith('TET_morcego')) o.scale.multiplyScalar(1.35);   // na arte o morcego ocupa ~45% do vão do anel
      const m = o.material; if (!o.isMesh || !m) return;
      if (/led/.test(m.name)) m.emissiveIntensity = 1.4;
      else if (/brilho/.test(m.name)) m.emissiveIntensity = 0.12;
      else if (/luz_quente/.test(m.name)) m.emissiveIntensity = 1.6;
      else if (/TET_(aco|morcego|corrente)/.test(m.name)) { m.envMapIntensity = 1.6; m.roughness = Math.min(m.roughness, 0.45); }
    });
    const anel = new THREE.PointLight(0x7fc4ff, 260, 30, 1.4); anel.position.set(0, 31, -20); root.add(anel);
    const bat = new THREE.SpotLight(0xb8dcff, 160, 30, 0.45, 0.6, 1.2); bat.position.set(-6, 24, -24); bat.target.position.set(0, 30.5, -34.6); root.add(bat, bat.target);
  }
  /* teto: as estalactites da caverna que cairiam dentro do óculo/anel saem (o teto traz as suas) */
  if (areas.has('teto') && areas.has('caverna')) {
    let n = 0; const p = new THREE.Vector3();
    areas.get('caverna').traverse((o) => {
      if (!/^CAV_est_/.test(o.name || '') || !o.visible) return;
      o.getWorldPosition(p); const d = Math.hypot(p.x, p.z + 20);
      if (d < 22 && Math.hypot(p.x, p.z) < 34.5) { o.visible = false; n++; }
    });
    done.push(`teto(-${n} estalactites)`);
  }

  /* telas do batcomputador */
  const hubScene = areas.get('hub'); const scr = root.userData.hub?.screens;
  if (hubScene && scr) {
    const byScreen = {
      TELA_mapa: scr.main, TELA_cidade: scr.cams, TELA_texto_esq: scr.tele,
      TELA_grafico: scr.diag, TELA_radar: scr.cams, TELA_dados: scr.tele,
    };
    const consoleTex = [scr.cams, scr.tele, scr.diag];
    const meshes = []; hubScene.traverse((o) => { if (o.isMesh) meshes.push(o); });
    for (const o of meshes) {
      const tag = tagged(o, /^TELA_/); if (!tag) continue;
      const old = o.material; const src = old.emissiveMap || old.map;
      if (tag === 'TELA_emblema' || tag === 'TELA_piso_emblema') {
        // emblemas do piso: mantêm a arte do GLB e ganham o pulso do disco procedural antigo
        const m = old.clone(); o.material = m; const base = m.emissiveIntensity;
        hall.updaters.push((dt, t) => { m.emissiveIntensity = base * (0.93 + Math.sin(t * 1.2) * 0.13); });
        continue;
      }
      let tex, tw = 512, th = 300, crop;
      const painel = scr.panem && PAINEIS[tag.slice(5)];
      if (painel) { tex = scr.panem; crop = [painel[0] / 2600, painel[1] / 2600, 0, 1]; }   // parede de telas = um mapa só
      else if (byScreen[tag]) { tex = byScreen[tag]; }
      else if (tag.startsWith('TELA_console_')) {
        const n = parseInt(tag.slice(13), 10) || 1;
        if (n === 4) { tex = scr.live; tw = 384; th = 216; }   // câmera ao vivo no console central-esquerdo de baixo
        else tex = consoleTex[(n - 1) % 3];
      } else continue;
      if (painel) { /* recorte já definido */ }
      else if (tex === scr.main) { tw = 2048; th = 420; crop = [0.2, 0.8, 0, 1]; }   // o mapa é muito largo: recorte central
      else crop = cropFor(o, tw, th);
      if (!bakeScreenUV(o, src, crop)) continue;
      o.material = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide });
      o.userData.screen = tag;
    }
    done.push('telas');
  }

  /* água corrente: rola o V do mapa (o KHR_texture_transform já está no offset/repeat da textura) */
  const aguaScene = areas.get('agua');
  if (aguaScene) {
    const mats = new Map();
    aguaScene.traverse((o) => {
      if (!o.isMesh || !tagged(o, /^AGUA_/)) return;
      const src = o.material; if (!mats.has(src)) {
        const foam = /espuma/.test(src.name);
        const m = src.clone();
        m.transparent = true; m.depthWrite = false; m.side = THREE.DoubleSide;
        // água mais branca e menos saturada (antes era um pano azul chapado)
        m.color = new THREE.Color(foam ? 0xf2f9ff : 0xe6f4ff);
        m.emissive = new THREE.Color(foam ? 0xcfe6f2 : 0x8fbfd8); m.emissiveIntensity = foam ? 0.6 : 0.5;
        m.roughness = 0.15; m.metalness = 0; m.envMapIntensity = 0.9;
        const maps = [];
        for (const k of ['map', 'emissiveMap']) if (m[k]) { m[k] = m[k].clone(); m[k].wrapS = m[k].wrapT = THREE.RepeatWrapping; m[k].needsUpdate = true; maps.push([m[k], m[k].offset.y]); }
        if (!foam) m.opacity = 0.88;   // um pouco translúcida: a rocha dos degraus aparece por trás
        // o V do GLB DESCE no sentido do fluxo (vale 0 no pé, ver agua_cena.py): o offset cresce → o desenho desce.
        // (o sinal do repeat que o gltfpack grava entra na conta: o desenho anda contra o sinal de repeat.y)
        const speed = foam ? 0.08 : 0.55;
        hall.updaters.push((dt, t) => { for (const [tx, y0] of maps) tx.offset.y = y0 + Math.sign(tx.repeat.y || 1) * ((t * speed) % 1000); });
        mats.set(src, m);
      }
      o.material = mats.get(src); o.renderOrder = 1;
    });
    done.push('água');
  }

  /* garagem: GIRA_* entra no grupo giratório do site (gira junto com o carro) */
  const garScene = areas.get('garagem'); const turn = root.userData.turntable?.turn;
  if (garScene && turn) {
    const gira = []; garScene.traverse((o) => { if (/^GIRA_/.test(o.name) && !/^GIRA_/.test(o.parent?.name || '')) gira.push(o); });
    turn.updateMatrixWorld(true);
    for (const o of gira) turn.attach(o);
    if (gira.length) done.push(`gira×${gira.length}`);
  }
  return done;
}
