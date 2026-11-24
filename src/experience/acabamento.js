/*
 * Acabamento de materiais que vinham chapados do GLB (sem UV, sem textura):
 *  - piso da plataforma (HUB_piso) e aço (HUB_aco): chapa xadrez projetada pelo mundo (triplanar), com relevo e rugosidade;
 *  - vidro dos lampiões (HUB_lampiao, F09_lampiao): montantes de ferro, chama no centro, fuligem no topo, tremor suave;
 *  - portais: emissão mais contida (o bloom estourava as molduras e as runas).
 * Roda depois das fachadas e antes da fusão de malhas.
 */
import * as THREE from 'three';

const carregar = (() => {
  const L = new THREE.TextureLoader(); const cache = new Map();
  return (nome, srgb = false) => {
    if (cache.has(nome)) return cache.get(nome);
    const t = L.load(`/textures/${nome}.jpg`); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    cache.set(nome, t); return t;
  };
})();

const TRI_COMUM = `
varying vec3 vMundo; varying vec3 vNMundo; uniform sampler2D tCor; uniform sampler2D tNor; uniform sampler2D tRug; uniform float esc;
vec3 pesos(){ vec3 w = pow(abs(normalize(vNMundo)), vec3(5.0)); return w / (w.x + w.y + w.z); }
vec3 tri(sampler2D t){ vec3 w = pesos(); return texture2D(t, vMundo.zy * esc).rgb * w.x + texture2D(t, vMundo.xz * esc).rgb * w.y + texture2D(t, vMundo.xy * esc).rgb * w.z; }`;

/** Aço de piso: chapa xadrez em projeção triplanar (não depende de UV). */
function acoXadrez(original) {
  // menos espelhado que o original (0,8): o espelho refletia a caverna escura e o piso virava preto
  const m = new THREE.MeshStandardMaterial({ name: 'ACAB_aco_xadrez', color: 0xb4bcc6, metalness: 0.55, roughness: 0.7, envMapIntensity: 1.0 });
  const cor = carregar('metal_plate_diff', true), nor = carregar('metal_plate_nor'), rug = carregar('metal_plate_rough');
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { tCor: { value: cor }, tNor: { value: nor }, tRug: { value: rug }, esc: { value: 0.8 } });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMundo; varying vec3 vNMundo;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvMundo = (modelMatrix * vec4(transformed, 1.0)).xyz; vNMundo = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>' + TRI_COMUM)
      // cor: tira o verde-ferrugem da foto e deixa aço escuro com as marcas do xadrez
      .replace('#include <map_fragment>', '#include <map_fragment>\n{ vec3 c = tri(tCor); float l = dot(c, vec3(0.3, 0.59, 0.11)); diffuseColor.rgb *= mix(vec3(l), c, 0.18) * 2.3; }')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughness * (0.55 + tri(tRug).g * 0.75), 0.18, 1.0);')
      // relevo das gotas do xadrez só nas faces de piso (projeção de cima)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n{ vec3 tn = texture2D(tNor, vMundo.xz * esc).xyz * 2.0 - 1.0; float w = pesos().y; normal = normalize(normal + (viewMatrix * vec4(tn.x, 0.0, -tn.y, 0.0)).xyz * 0.9 * w); }');
  };
  m.customProgramCacheKey = () => 'acab-aco-xadrez';
  if (original?.side !== undefined) m.side = original.side;
  return m;
}

/** Vidro de lampião: montantes nos cantos, chama no centro, fuligem no topo e tremor (usa aH/aU por vértice). */
function vidroLampiao(tempo) {
  const m = new THREE.MeshStandardMaterial({ name: 'ACAB_lampiao', color: 0x3a2a18, roughness: 0.25, metalness: 0.1, emissive: new THREE.Color(0xffb35c), emissiveIntensity: 1.25 });
  const EMISSAO = `
    {
      float h = vH;                                                                   // 0 = base do vidro, 1 = topo
      float chama = exp(-pow((h - 0.42) / 0.24, 2.0));                                // núcleo quente no meio
      float fuligem = smoothstep(0.72, 1.0, h) * 0.65;                                // topo escurecido
      float barraH = 1.0 - smoothstep(0.0, 0.06, min(h, 1.0 - h));                    // aro de ferro em cima e embaixo
      float barraV = 1.0 - smoothstep(0.0, 0.035, abs(fract(vU * 4.0 + 0.125) - 0.5) - 0.0) * (1.0 - step(0.46, abs(fract(vU * 4.0 + 0.125) - 0.5)));
      barraV = step(0.455, abs(fract(vU * 4.0 + 0.125) - 0.5));                       // montantes nos cantos
      float ferro = max(barraH, barraV);
      float tremor = 0.88 + 0.08 * sin(uT * 9.0 + vMundo.x * 4.0) + 0.04 * sin(uT * 23.0 + vMundo.z * 7.0);
      totalEmissiveRadiance *= (0.3 + chama * 1.0) * (1.0 - fuligem) * (1.0 - ferro * 0.95) * tremor;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.04), ferro);
    }`;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = tempo;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aH; attribute float aU; varying vec3 vMundo; varying float vH; varying float vU;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvMundo = (modelMatrix * vec4(transformed, 1.0)).xyz; vH = aH; vU = aU;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMundo; varying float vH; varying float vU; uniform float uT;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>' + EMISSAO);
  };
  m.customProgramCacheKey = () => 'acab-lampiao';
  return m;
}

/** Separa os lampiões que vêm juntos numa malha (vértices próximos) e grava, por vértice,
 *  a altura relativa no vidro (aH) e a volta em torno do centro do lampião (aU). */
function coordenadasDeLampiao(o) {
  const g = o.geometry, pos = g.attributes.position, n = pos.count, v = new THREE.Vector3();
  const mundo = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); mundo.set([v.x, v.y, v.z], i * 3); }
  const chave = (i) => `${Math.round(mundo[i * 3] / 0.7)},${Math.round(mundo[i * 3 + 2] / 0.7)}`;
  const grupos = new Map();
  for (let i = 0; i < n; i++) {
    const k = chave(i); if (!grupos.has(k)) grupos.set(k, { y0: Infinity, y1: -Infinity, x: 0, z: 0, c: 0 });
    const q = grupos.get(k); q.y0 = Math.min(q.y0, mundo[i * 3 + 1]); q.y1 = Math.max(q.y1, mundo[i * 3 + 1]); q.x += mundo[i * 3]; q.z += mundo[i * 3 + 2]; q.c++;
  }
  const aH = new Float32Array(n), aU = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const q = grupos.get(chave(i)); const cx = q.x / q.c, cz = q.z / q.c;
    aH[i] = (mundo[i * 3 + 1] - q.y0) / Math.max(0.01, q.y1 - q.y0);
    aU[i] = (Math.atan2(mundo[i * 3 + 2] - cz, mundo[i * 3] - cx) / (Math.PI * 2) + 1) % 1;
  }
  g.setAttribute('aH', new THREE.BufferAttribute(aH, 1)); g.setAttribute('aU', new THREE.BufferAttribute(aU, 1));
}

export function aplicarAcabamento({ hall, districts }) {
  const feitos = [];
  const tempo = { value: 0 }; hall.updaters.push((dt) => { tempo.value += dt; });

  // 1. troca de materiais por nome
  const aco = new Map(); const lampioes = [];
  hall.root.updateMatrixWorld(true);
  hall.root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material)) return;
    const n = o.material.name || '';
    if (n === 'HUB_aco' || n === 'HUB_piso') { if (!aco.has(o.material)) aco.set(o.material, acoXadrez(o.material)); o.material = aco.get(o.material); }
    else if (n === 'HUB_lampiao' || n === 'F09_lampiao') lampioes.push(o);
  });
  if (aco.size) feitos.push('piso da plataforma');
  if (lampioes.length) {
    const vidro = vidroLampiao(tempo);
    for (const o of lampioes) { coordenadasDeLampiao(o); o.material = vidro; o.userData.naoFundir = true; }
    feitos.push(`lampiões×${lampioes.length}`);
  }

  // 2. portais menos estourados: tudo que brilha dentro dos portais cai para ~55%
  const vistos = new Set();
  districts.root.traverse((o) => {
    if (!o.material) return;
    for (const m of [].concat(o.material)) {
      if (vistos.has(m)) continue; vistos.add(m);
      if (m.isMeshStandardMaterial && m.emissive && m.emissive.getHex() !== 0) {
        // só o que é luz de verdade continua brilhando; ouro, trigo, pedra e madeira perdem o brilho próprio
        const luz = /led|luz|lamp|lampi|brasa|chama|nucleo|cristal|neon|runa|holo|tela|fogo|vidro_luz/i.test(m.name || '');
        m.emissiveIntensity = luz ? m.emissiveIntensity * 0.55 : Math.min(m.emissiveIntensity, 0.15);
      }
      else if (m.isMeshBasicMaterial && !m.map && m.color && Math.max(m.color.r, m.color.g, m.color.b) > 1) m.color.multiplyScalar(0.6);
    }
  });
  feitos.push('portais suavizados');
  return feitos;
}
