/*
 * Desempenho: o que faz a caverna passar de ~27 fps (RTX 5070, 2560 px) para a meta de 45+ e rodar no celular.
 *
 * 1. fundirEstaticos: junta as malhas paradas que dividem o mesmo material num só desenho, por setor da caverna
 *    (12 fatias de 30° × centro/borda × baixo/alto), para o descarte por tela continuar valendo.
 *    Só funde o que comprovadamente não se mexe: a cena é "ensaiada" alguns quadros e quem mudou de lugar fica de fora.
 * 2. poolDeLuzes: as dezenas de luzes do salão viram um número fixo de luzes reais que seguem as virtuais mais
 *    importantes perto da câmera (com fade). O número de luzes nunca muda, então nenhum shader recompila.
 * 3. resolucaoDinamica: ajusta a resolução interna a cada segundo para segurar ~45 fps.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const EXCLUI_NOME = /^(GIRA_|TELA_|TET_morcego|APR_halo|BC_CHAIR|HERO_CAR)/;

function ancestrais(o, fn) { for (let p = o; p; p = p.parent) if (fn(p)) return true; return false; }
// retrato do que pode ser animado num material (cor, brilho, opacidade)
const retratoMat = (m) => [m.color?.getHex(), m.emissive?.getHex(), m.emissiveIntensity, m.opacity, m.visible].join();
/** Assinatura para unificar materiais idênticos criados um a um (ex.: glow(cor) gera um material por chamada). */
function assinatura(m, semCor = false) {
  if (m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) return m.uuid;   // shader com uniformes próprios: não unifica
  const r = (v) => (typeof v === 'number' ? +v.toFixed(4) : v);
  const tex = ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'alphaMap', 'bumpMap', 'lightMap', 'envMap']
    .map((k) => (m[k] ? m[k].uuid : '-')).join(',');
  return [m.type, semCor ? '*' : m.color?.toArray().map(r), m.emissive?.toArray().map(r), r(m.emissiveIntensity), r(m.roughness), r(m.metalness), r(m.opacity),
    m.transparent, m.side, m.blending, m.toneMapped, m.depthWrite, m.depthTest, r(m.alphaTest), m.vertexColors, m.fog, m.flatShading,
    r(m.envMapIntensity), m.polygonOffset, m.polygonOffsetFactor, m.polygonOffsetUnits, m.colorWrite, tex].join('|');
}
function visivelDeFato(o) { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; }

/** Cópia da geometria em float32, já no espaço `rel` (quantização do gltfpack desfeita). */
function geometriaNoEspaco(geo, rel, cor = null, manter = null) {
  const g = new THREE.BufferGeometry();
  for (const [nome, a] of Object.entries(geo.attributes)) {
    if (nome === 'tangent' || (manter && !manter.includes(nome))) continue;   // tangente não sobrevive bem à fusão; o three recalcula no shader
    const n = a.count, k = a.itemSize, arr = new Float32Array(n * k);
    for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) arr[i * k + j] = a.getComponent ? a.getComponent(i, j) : [a.getX, a.getY, a.getZ, a.getW][j].call(a, i);
    g.setAttribute(nome, new THREE.BufferAttribute(arr, k));
  }
  if (cor) {   // cor do material vira cor de vértice (multiplica a que já houver)
    const n = g.attributes.position.count, c = new Float32Array(n * 3), ant = g.attributes.color;
    for (let i = 0; i < n; i++) { const k = ant ? [ant.getX(i), ant.getY(i), ant.getZ(i)] : [1, 1, 1]; c[i * 3] = cor.r * k[0]; c[i * 3 + 1] = cor.g * k[1]; c[i * 3 + 2] = cor.b * k[2]; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  }
  // todas indexadas: assim geometria com e sem índice cai no mesmo grupo
  g.setIndex(geo.index ? Array.from(geo.index.array) : Array.from({ length: geo.attributes.position.count }, (_, i) => i));
  g.applyMatrix4(rel);
  if (rel.determinant() < 0) {   // espelhado: inverte a ordem dos triângulos para não virar do avesso
    if (g.index) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } }
    else for (const a of Object.values(g.attributes)) { const k = a.itemSize, arr = a.array; for (let i = 0; i < a.count; i += 3) for (let j = 0; j < k; j++) { const t = arr[(i + 1) * k + j]; arr[(i + 1) * k + j] = arr[(i + 2) * k + j]; arr[(i + 2) * k + j] = t; } }
  }
  return g;
}

/**
 * @param raiz   grupo a otimizar (hall.root)
 * @param ensaio função que avança a animação (chamada algumas vezes antes de decidir o que está parado)
 * @param fora   grupos cujo conteúdo nunca é fundido (portais, com grades e feitiços)
 */
const MAPAS = ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'alphaMap', 'bumpMap', 'lightMap', 'specularMap'];
const semTextura = (m) => !MAPAS.some((k) => m[k]);

export function fundirEstaticos(raiz, { ensaio, fora = [], semSombra = false } = {}) {
  raiz.updateMatrixWorld(true);
  const cands = [];
  raiz.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.morphTargetInfluences) return;
    if (Array.isArray(o.material) || !o.geometry?.attributes?.position) return;
    if (o.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender) return;   // reflexo do lago e afins
    if (o.material.isShaderMaterial || o.userData.screen || o.userData.naoFundir) return;
    if (!visivelDeFato(o)) return;
    if (ancestrais(o, (p) => EXCLUI_NOME.test(p.name || '') || fora.includes(p))) return;
    cands.push({ o, m0: o.matrixWorld.clone(), v0: o.geometry.attributes.position.version, mat0: retratoMat(o.material) });
  });
  // ensaio: quem se mexe (carro girando, morcegos, elevadores...) sai da lista
  if (ensaio) { for (let i = 0; i < 6; i++) ensaio(i); raiz.updateMatrixWorld(true); }
  // parado = mesma posição, mesmos vértices (raios, cortinas) e mesmo material (chamas, bobinas)
  const parados = cands.filter(({ o, m0, v0, mat0 }) => o.matrixWorld.equals(m0) && visivelDeFato(o)
    && o.geometry.attributes.position.version === v0 && retratoMat(o.material) === mat0);
  const animados = new Set(cands.filter((c) => !parados.includes(c)).map((c) => c.o.material));
  const canon = new Map();
  // material sem shader próprio e sem brilho por uniforme: a cor desce para o vértice e o material passa a ser
  // compartilhado por todos os tons (os 'glow(cor)' e os metais tingidos viram um material só)
  const podeCorVertice = (m) => !animados.has(m) && m.color && !m.isShaderMaterial && m.onBeforeCompile === THREE.Material.prototype.onBeforeCompile
    && (m.isMeshBasicMaterial || !m.emissive || m.emissive.getHex() === 0 || m.emissiveIntensity === 0);
  const materialDe = (m) => {
    if (animados.has(m)) return m;
    if (podeCorVertice(m)) {
      const k = 'vc|' + assinatura(m, true);
      if (!canon.has(k)) { const c2 = m.clone(); c2.color = new THREE.Color(1, 1, 1); c2.vertexColors = true; c2.name = `VC_${m.type}`; canon.set(k, c2); }
      return canon.get(k);
    }
    const k = assinatura(m); if (!canon.has(k)) canon.set(k, m); return canon.get(k);
  };

  const inv = raiz.matrixWorld.clone().invert();
  const grupos = new Map(), c = new THREE.Vector3(), caixa = new THREE.Box3();
  for (const { o } of parados) {
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    caixa.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld).getCenter(c);
    const fatia = Math.floor((Math.atan2(c.x, -c.z) + Math.PI) / (Math.PI / 6));
    const setor = `${fatia}/${Math.hypot(c.x, c.z) < 14 ? 'c' : 'b'}/${c.y < 12 ? 'l' : 'h'}`;
    o.userData._setor = setor;
    const mat = materialDe(o.material); o.userData._matFundido = mat;
    // material sem textura não usa UV: fica só posição, normal (e cor) e o grupo cresce
    let nomesAttr = new Set(Object.keys(o.geometry.attributes).filter((n) => n !== 'tangent'));
    if (semTextura(mat)) nomesAttr = new Set(['position', 'normal', ...(nomesAttr.has('color') ? ['color'] : [])].filter((n) => o.geometry.attributes[n] || n === 'color'));
    if (mat.vertexColors && mat.name?.startsWith('VC_')) nomesAttr.add('color');
    o.userData._attrs = [...nomesAttr];
    const attrs = [...nomesAttr].sort().join(',');
    const chave = [mat.uuid, o.layers.mask, semSombra ? '' : o.castShadow, semSombra ? '' : o.receiveShadow, o.renderOrder, attrs].join('|');
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(o);
  }
  // grupo leve (< 40 mil triângulos) vira um desenho só; grupo pesado é repartido por setor da caverna
  const tri = (o) => (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
  const finais = [];
  for (const lista of grupos.values()) {
    if (lista.reduce((s2, o) => s2 + tri(o), 0) < 40000) { finais.push(lista); continue; }
    const porSetor = new Map(); for (const o of lista) { const k = o.userData._setor; if (!porSetor.has(k)) porSetor.set(k, []); porSetor.get(k).push(o); }
    finais.push(...porSetor.values());
  }
  let antes = 0, depois = 0;
  const rel = new THREE.Matrix4();
  for (const lista of finais) {
    antes += lista.length;
    if (lista.length < 2 && !lista[0].userData._matFundido?.name?.startsWith('VC_')) { depois++; continue; }
    const vc = lista[0].userData._matFundido?.name?.startsWith('VC_');
    const geos = lista.map((o) => geometriaNoEspaco(o.geometry, rel.multiplyMatrices(inv, o.matrixWorld), vc ? o.material.color : null, o.userData._attrs.filter((n) => n !== 'color' || o.geometry.attributes.color)));
    const g = mergeGeometries(geos, false); geos.forEach((x) => x.dispose());
    if (!g) { depois += lista.length; continue; }
    g.computeBoundingSphere(); g.computeBoundingBox();
    const a = lista[0];
    const m = new THREE.Mesh(g, a.userData._matFundido || a.material);
    m.name = `FUNDIDO_${a.name || a.material.name}`; m.castShadow = a.castShadow; m.receiveShadow = a.receiveShadow;
    m.layers.mask = a.layers.mask; m.renderOrder = a.renderOrder; m.matrixAutoUpdate = false;
    raiz.add(m); m.updateMatrixWorld(true);
    for (const o of lista) o.visible = false;
    depois++;
  }
  // transparente de dupla face: o three desenha duas vezes (verso e frente); uma passada basta aqui
  raiz.traverse((o) => { if (!o.isMesh || Array.isArray(o.material)) return; const m = o.material; if (m.transparent && m.side === THREE.DoubleSide && !m.isShaderMaterial) m.forceSinglePass = true; });
  return { antes, depois };
}

/** O reflexo do lago só é refeito a cada `n` quadros (é um segundo desenho da cena). */
export function reflexoEspacado(agua, n) {
  const orig = agua.onBeforeRender; let k = 0;
  const f = function (...a) { if (k++ % n === 0) orig.apply(this, a); };
  return { aplicar: (m) => { n = m; agua.onBeforeRender = m <= 1 ? orig : f; }, orig };
}

/** Pool de luzes: `n` pontuais e `s` spots reais seguem as luzes virtuais mais fortes perto da câmera. */
export function poolDeLuzes(cena, raiz, camera, { pontos = 8, spots = 4, fora = [] } = {}) {
  const virtuais = { p: [], s: [] };
  raiz.traverse((o) => {
    if (!(o.isPointLight || o.isSpotLight) || o.castShadow || fora.includes(o)) return;
    (o.isSpotLight ? virtuais.s : virtuais.p).push(o);
  });
  // as originais saem do cálculo de luz (de uma vez só, aqui na carga) mas continuam sendo animadas pelo jogo
  for (const v of [...virtuais.p, ...virtuais.s]) { v.userData.intensidadeBase = v.intensity; v.visible = false; }
  const cria = (tipo, n) => Array.from({ length: n }, () => {
    const l = tipo === 's' ? new THREE.SpotLight(0xffffff, 0) : new THREE.PointLight(0xffffff, 0);
    if (l.isSpotLight) cena.add(l.target);
    cena.add(l); return { l, v: null, a: 0 };
  });
  const slots = { p: cria('p', Math.min(pontos, virtuais.p.length)), s: cria('s', Math.min(spots, virtuais.s.length)) };
  const pos = new THREE.Vector3(), cam = new THREE.Vector3();
  let acc = 1;
  const melhores = { p: new Set(), s: new Set() };

  function escolhe() {
    camera.getWorldPosition(cam);
    for (const t of ['p', 's']) {
      const pont = virtuais[t].filter((v) => v.parent && visivelDeFato(v.parent) && v.intensity > 0.01).map((v) => {
        v.getWorldPosition(pos); const d = pos.distanceTo(cam), alc = Math.max(6, v.distance || 25);
        return [v.intensity / (1 + (d / alc) ** 2 * 4), v];
      }).sort((a, b) => b[0] - a[0]);
      melhores[t] = new Set(pont.slice(0, slots[t].length).map((x) => x[1]));
    }
  }

  return {
    total: virtuais.p.length + virtuais.s.length,
    reais: slots.p.length + slots.s.length,
    update(dt) {
      if (!visivelDeFato(raiz)) { for (const t of ['p', 's']) for (const sl of slots[t]) sl.l.intensity = 0; return; }
      acc += dt; if (acc > 0.25) { acc = 0; escolhe(); }
      for (const t of ['p', 's']) {
        const livres = [...melhores[t]].filter((v) => !slots[t].some((sl) => sl.v === v));
        for (const sl of slots[t]) {
          if (sl.v && !melhores[t].has(sl.v)) { sl.a -= dt * 4; if (sl.a <= 0) { sl.a = 0; sl.v = null; } }
          if (!sl.v && livres.length) { sl.v = livres.shift(); sl.a = 0; }
          if (sl.v && melhores[t].has(sl.v)) sl.a = Math.min(1, sl.a + dt * 4);
          const v = sl.v, l = sl.l;
          if (!v) { l.intensity = 0; continue; }
          v.getWorldPosition(l.position); l.color.copy(v.color); l.distance = v.distance; l.decay = v.decay;
          l.intensity = v.intensity * sl.a;
          if (l.isSpotLight) { l.angle = v.angle; l.penumbra = v.penumbra; v.target.getWorldPosition(l.target.position); l.target.updateMatrixWorld(); }
        }
      }
    },
  };
}

/** Resolução dinâmica: escala o pixel ratio entre `min` e 1 × base do nível para segurar ~`alvo` fps. */
export function resolucaoDinamica({ aplicar, alvo = 45, min = 0.55, gpu = null }) {
  let escala = 1, acc = 0, n = 0, espera = 3, somaGpu = 0, nGpu = 0;
  return {
    get escala() { return escala; },
    reset() { escala = 1; espera = 3; acc = 0; n = 0; },
    update(dt) {
      if (document.hidden) return null;
      if (espera > 0) { espera -= dt; return null; }
      acc += dt; n++; const g = gpu?.ms(); if (g != null) { somaGpu += g; nGpu++; }
      if (acc < 1) return null;
      const fps = n / acc; acc = 0; n = 0;
      const gpuMs = nGpu ? somaGpu / nGpu : null; somaGpu = 0; nGpu = 0;
      const antes = escala, orcamento = 1000 / alvo;
      if (gpuMs != null) {   // decide pela GPU: limite do navegador não derruba a resolução
        if (gpuMs > orcamento * 0.85) escala = Math.max(min, escala * (gpuMs > orcamento * 1.3 ? 0.8 : 0.9));
        else if (gpuMs < orcamento * 0.5 && escala < 1) escala = Math.min(1, escala * 1.06);
      } else if (fps < alvo - 3) escala = Math.max(min, escala * (fps < alvo * 0.7 ? 0.8 : 0.9));
      else if (fps > alvo + 12 && escala < 1) escala = Math.min(1, escala * 1.06);
      if (escala !== antes) { aplicar(escala); espera = 1; }
      return fps;
    },
  };
}

/**
 * Descarte por distância: malha pequena longe da câmera sai do desenho (camadas 0 e 1 desligadas),
 * sem tocar em `visible`, que o jogo usa para outras coisas. Checado 5× por segundo.
 * fator = quantos raios de distância o objeto aguenta antes de sumir (alta 70, media 45, baixa 28).
 */
export function descartePorDistancia(raiz, camera, { fator = 45, raioMax = 2.5 } = {}) {
  const itens = [];
  raiz.traverse((o) => {
    if (!o.isMesh || o.userData.screen || /^FUNDIDO_/.test(o.name)) return;
    const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
    const s = new THREE.Vector3(); o.getWorldScale(s);
    const r = g.boundingSphere.radius * Math.max(s.x, s.y, s.z);
    if (r > raioMax) return;
    itens.push({ o, r, c: g.boundingSphere.center, mask: o.layers.mask, fora: false });
  });
  const p = new THREE.Vector3(), cam = new THREE.Vector3();
  let acc = 1;
  return {
    total: itens.length,
    set fator(f) { fator = f; acc = 1; },
    update(dt) {
      acc += dt; if (acc < 0.2) return; acc = 0;
      camera.getWorldPosition(cam);
      for (const it of itens) {
        p.copy(it.c).applyMatrix4(it.o.matrixWorld);
        const fora = p.distanceTo(cam) > Math.max(10, it.r * fator);
        if (fora !== it.fora) { it.fora = fora; it.o.layers.mask = fora ? 0 : it.mask; }
      }
    },
  };
}

/** Junta, no espaço do próprio grupo, os filhos parados que dividem material (o grupo pode girar à vontade). */
export function fundirLocal(grupo, pular = []) {
  const por = new Map();
  for (const o of grupo.children) {
    if (!o.isMesh || pular.includes(o) || o.children.length || Array.isArray(o.material)) continue;
    const k = assinatura(o.material) + '|' + Object.keys(o.geometry.attributes).sort().join() + '|' + !!o.geometry.index;
    if (!por.has(k)) por.set(k, []); por.get(k).push(o);
  }
  let n = 0;
  for (const lista of por.values()) {
    if (lista.length < 2) continue;
    const geos = lista.map((o) => { o.updateMatrix(); return geometriaNoEspaco(o.geometry, o.matrix); });
    const g = mergeGeometries(geos, false); if (!g) continue;
    const m = new THREE.Mesh(g, lista[0].material); m.layers.mask = lista[0].layers.mask; grupo.add(m);
    for (const o of lista) grupo.remove(o);
    n += lista.length - 1;
  }
  return n;
}

/**
 * Tempo real de GPU por quadro (EXT_disjoint_timer_query_webgl2). Sem a extensão (muitos celulares), devolve null
 * e a resolução dinâmica usa só o fps. Com ela, a resolução só cai quando a GPU é o gargalo: se o navegador limita
 * o quadro (economia de energia em 30 fps, vsync), baixar a resolução não ajuda e só pioraria a imagem.
 */
export function cronometroGpu(gl) {
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  if (!ext) return { inicio() {}, fim() {}, ms: () => null };
  const fila = []; let ultimo = null, ativo = null;
  return {
    inicio() { if (ativo || fila.length > 3) return; ativo = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, ativo); },
    fim() {
      if (ativo) { gl.endQuery(ext.TIME_ELAPSED_EXT); fila.push(ativo); ativo = null; }
      while (fila.length) {
        const q = fila[0];
        if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
        if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) ultimo = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6;
        gl.deleteQuery(q); fila.shift();
      }
    },
    ms: () => ultimo,
  };
}
