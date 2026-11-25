/*
 * Realce: aproxima a caverna da arte de referência (public/img/cavern-ceiling.webp).
 *  - carro: pintura escura com verniz (clearcoat) que pega o mapa de ambiente, faróis acesos e luz ciano por baixo;
 *  - piso da plataforma: reflexo molhado em tempo real (só a camada 1: telas, LEDs, cachoeiras), como na arte;
 *  - cachoeiras: filetes de espuma branca correndo sobre a textura, topo mais claro, bordas que se desfazem;
 *  - computador: globo holográfico girando sobre a mesa, com cone de projeção;
 *  - lampiões e interiores dos túneis mais quentes (a arte é ciano nas sombras e âmbar nas luzes).
 * Roda depois do acabamento e do teto de emissivo; nada aqui entra na fusão de estáticos (naoFundir).
 */
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { REFLECT_LAYER, texturaAgua } from './hall.js';

const ADITIVO = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false };
const fixo = (o) => { o.traverse((q) => { q.userData.naoFundir = true; q.layers.enable(REFLECT_LAYER); }); return o; };

function gradiente(cor, borda = 0) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, cor); r.addColorStop(borda || 0.45, cor.replace(/[\d.]+\)$/, '0.35)')); r.addColorStop(1, cor.replace(/[\d.]+\)$/, '0)'));
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const caixaDe = (o) => new THREE.Box3().setFromObject(o);

/* ---------------- carro ---------------- */
function carro(raiz, updaters) {
  const pecas = [];
  raiz.traverse((o) => { if (o.isMesh && /^CARRO_/.test([].concat(o.material)[0]?.name || '')) pecas.push(o); });
  if (!pecas.length) return false;
  const troca = new Map();
  for (const o of pecas) {
    const m = o.material; const n = m.name;
    if (!troca.has(m)) {
      let novo = m;
      if (n === 'CARRO_carroceria') {
        novo = new THREE.MeshPhysicalMaterial({
          name: n, color: 0x16191e, map: m.map, normalMap: m.normalMap, aoMap: m.aoMap,
          metalness: 0.42, roughness: 0.36, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.95, side: m.side,
        });
      } else if (/aro/.test(n)) { novo = m.clone(); novo.metalness = 0.92; novo.roughness = 0.22; novo.envMapIntensity = 1.6; }
      else if (/pneu/.test(n)) { novo = m.clone(); novo.color = new THREE.Color(0x0d0e10); novo.roughness = 0.75; }
      else if (/vidro/.test(n)) { novo = m.clone(); novo.color = new THREE.Color(0x05080b); novo.metalness = 0.3; novo.roughness = 0.05; novo.envMapIntensity = 2; }
      else if (/luz/.test(n)) { novo = m.clone(); novo.emissive = new THREE.Color(/farol/.test(n) ? 0xd8f4ff : 0x38c8ff); novo.emissiveIntensity = 1.6; novo.toneMapped = false; }
      troca.set(m, novo);
    }
    o.material = troca.get(m); o.userData.naoFundir = true;
    if (/luz/.test(o.material.name)) o.layers.enable(REFLECT_LAYER);
  }
  // luz ciano por baixo e anel no piso (o carro gira no próprio eixo: o brilho redondo não precisa girar)
  const corpo = pecas.find((o) => o.material.name === 'CARRO_carroceria') || pecas[0];
  const bb = caixaDe(corpo); const c = bb.getCenter(new THREE.Vector3()); const raio = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * 0.62;
  const brilho = new THREE.Mesh(new THREE.PlaneGeometry(raio * 2.4, raio * 2.4), new THREE.MeshBasicMaterial({ map: gradiente('rgba(40,200,255,0.9)'), ...ADITIVO, opacity: 0.85 }));
  brilho.rotation.x = -Math.PI / 2; brilho.position.set(c.x, bb.min.y + 0.03, c.z); brilho.renderOrder = 2;
  const luz = new THREE.PointLight(0x2bc4ff, 7, raio * 2.2, 1.6); luz.position.set(c.x, bb.min.y + 0.35, c.z);
  // faixa de luz de cima, como o spot da garagem na arte
  const spot = new THREE.SpotLight(0xdff2ff, 60, 18, 0.55, 0.6, 1.4); spot.position.set(c.x + 1.5, bb.max.y + 7, c.z + 2); spot.target.position.copy(c);
  const g = fixo(new THREE.Group()); g.name = 'REALCE_carro'; g.add(brilho, luz, spot, spot.target); raiz.add(g);
  updaters.push((dt, t) => { brilho.material.opacity = 0.5 + Math.sin(t * 1.3) * 0.07; });
  return true;
}

/* ---------------- piso molhado da plataforma ---------------- */
function pisoMolhado(raiz, updaters, nivel) {
  let piso = null;
  raiz.traverse((o) => { if (!piso && o.isMesh && [].concat(o.material)[0]?.name === 'HUB_tela_piso') piso = o; });
  const y = piso ? caixaDe(piso).max.y + 0.012 : 1.512;
  const R = 11.6;
  const shader = {
    name: 'PisoMolhado',
    uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, time: { value: 0 }, raio: { value: R } },
    vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
      void main(){ vUv = textureMatrix * vec4(position, 1.0); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float time; uniform float raio; varying vec4 vUv; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        // manchas de umidade: onde o piso está mais molhado o reflexo fica nítido; no resto, borrado e fraco
        float poca = smoothstep(0.42, 0.7, n(vW.xz * 0.35) * 0.7 + n(vW.xz * 1.3) * 0.3);
        vec4 uv = vUv; vec2 tremor = vec2(n(vW.xz * 3.0 + time * 0.15) - 0.5, 0.0) * 0.004 * uv.w;
        float esp = mix(0.016, 0.004, poca) * uv.w;
        vec3 r = vec3(0.0);
        for (int k = -2; k <= 2; k++) { vec4 u2 = uv; u2.xy += tremor; u2.y += float(k) * esp; r += texture2DProj(tDiffuse, u2).rgb; }
        r /= 5.0;
        vec3 V = normalize(cameraPosition - vW);
        float fres = 0.25 + 0.75 * pow(1.0 - max(V.y, 0.0), 2.0);
        float borda = smoothstep(raio, raio - 1.6, length(vW.xz));
        float forca = mix(0.38, 0.95, poca) * fres * borda;
        gl_FragColor = vec4(r * forca, 1.0);
      }`,
  };
  const esc = nivel === 'alta' ? 0.45 : 0.3;
  const espelho = new Reflector(new THREE.CircleGeometry(R, 96), { shader, clipBias: 0.002, multisample: 0, textureWidth: Math.round(innerWidth * esc), textureHeight: Math.round(innerHeight * esc) });
  espelho.camera.layers.set(REFLECT_LAYER);
  Object.assign(espelho.material, ADITIVO); espelho.material.toneMapped = true;
  espelho.rotation.x = -Math.PI / 2; espelho.position.y = y; espelho.renderOrder = 3; espelho.name = 'REALCE_piso';
  espelho.userData.naoFundir = true;
  raiz.add(espelho);
  updaters.push((dt) => { espelho.material.uniforms.time.value += dt; });
  return true;
}

/* ---------------- cachoeiras: filetes de espuma ---------------- */
function cachoeiras(raiz, updaters) {
  const feitos = new Set();
  // relevo do vídeo (o mesmo do lago, gravado no Blender) esticado no sentido da queda e descendo com a água:
  // uma leitura de textura a mais por pixel de cachoeira, sem geometria nova
  const relevo = texturaAgua(); relevo.repeat.set(6, 1.4);
  raiz.traverse((o) => {
    if (!o.isMesh) return; const m = o.material; if (!m || feitos.has(m) || m.name !== 'A_AGUA_agua' || !m.map) return;
    feitos.add(m);
    m.normalMap = relevo; m.normalScale = new THREE.Vector2(0.75, 0.75);
    const sentido = Math.sign(m.map.repeat.y || 1);
    if (!relevo.userData.anda) { relevo.userData.anda = true; updaters.push((dt, t) => { relevo.offset.y = sentido * ((t * 0.7) % 1000); }); }
    m.emissiveIntensity = 0.7; m.opacity = 0.94; m.emissive = new THREE.Color(0xe6f0f4); m.color = new THREE.Color(0xffffff);
    m.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          float rH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float rN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(rH(i), rH(i + vec2(1, 0)), f.x), mix(rH(i + vec2(0, 1)), rH(i + vec2(1, 1)), f.x), f.y); }`)
        .replace('#include <map_fragment>', `#include <map_fragment>
          // filetes: ruído esticado ao longo do fluxo (V já rola com o tempo), em duas escalas
          float fil = rN(vec2(vMapUv.x * 22.0, vMapUv.y * 1.6)) * 0.5 + rN(vec2(vMapUv.x * 64.0, vMapUv.y * 4.0)) * 0.35 + rN(vec2(vMapUv.x * 160.0, vMapUv.y * 9.0)) * 0.15;
          float esp = smoothstep(0.45, 0.85, fil);
          // água da arte: quase branca, com o ciano só nos vãos entre os filetes
          vec3 vao = mix(vec3(0.34, 0.52, 0.6), diffuseColor.rgb * vec3(0.55, 0.7, 0.78), 0.3);
          diffuseColor.rgb = mix(vao, vec3(0.97, 0.99, 1.0), clamp(esp * 0.95 + 0.18, 0.0, 1.0));
          diffuseColor.a *= mix(0.55, 1.0, smoothstep(0.25, 0.6, fil));`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          totalEmissiveRadiance *= 0.6 + esp * 1.7;`);
    };
    m.customProgramCacheKey = () => 'realce-cachoeira';
    m.needsUpdate = true;
  });
  return feitos.size > 0;
}

/* ---------------- computador: globo holográfico ---------------- */
function globo(raiz, updaters) {
  let mesa = null;
  raiz.traverse((o) => { if (!mesa && o.isMesh && [].concat(o.material)[0]?.name === 'HUB_prata') mesa = o; });
  const base = mesa ? caixaDe(mesa) : new THREE.Box3(new THREE.Vector3(-3, 2.5, -7.6), new THREE.Vector3(3, 2.7, -4.4));
  const c = base.getCenter(new THREE.Vector3()); const r = 0.78;
  const g = fixo(new THREE.Group()); g.name = 'REALCE_globo'; g.position.set(c.x, base.max.y + 1.25, c.z);
  // pontos numa esfera de Fibonacci; os "continentes" acendem mais (ruído na direção)
  const N = 1400, pos = new Float32Array(N * 3), cor = new Float32Array(N * 3);
  const s = (x, y, z) => Math.sin(x * 3.1 + Math.sin(y * 2.3)) * Math.cos(z * 2.7 - x) + Math.sin(y * 4.2 + z);
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, rr = Math.sqrt(1 - y * y), th = i * 2.39996;
    const x = Math.cos(th) * rr, z = Math.sin(th) * rr; pos.set([x * r, y * r, z * r], i * 3);
    const terra = s(x, y, z) > 0.35; const k = terra ? 1 : 0.28;
    cor.set([0.35 * k, 0.85 * k, 1.0 * k], i * 3);
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(cor, 3));
  const pontos = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.045, vertexColors: true, ...ADITIVO }));
  const casca = new THREE.Mesh(new THREE.SphereGeometry(r * 0.985, 32, 20), new THREE.MeshBasicMaterial({ color: 0x0a4a66, ...ADITIVO, opacity: 0.35 }));
  const arame = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(r * 1.01, 18, 10)), new THREE.LineBasicMaterial({ color: 0x2fb8e6, ...ADITIVO, opacity: 0.18 }));
  const anel = (rad, inc, op) => { const a = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.008, 6, 120), new THREE.MeshBasicMaterial({ color: 0x6fe3ff, ...ADITIVO, opacity: op })); a.rotation.x = Math.PI / 2 + inc; return a; };
  const aneis = [anel(r * 1.32, 0.35, 0.7), anel(r * 1.5, -0.22, 0.4)];
  // cone de projeção da mesa até o globo
  const alt = 1.25 - r * 0.3;
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, 0.25, alt, 40, 1, true), new THREE.MeshBasicMaterial({ map: (() => {
    const cv = document.createElement('canvas'); cv.width = 4; cv.height = 128; const x = cv.getContext('2d'); const l = x.createLinearGradient(0, 0, 0, 128);
    l.addColorStop(0, 'rgba(60,200,255,0)'); l.addColorStop(1, 'rgba(60,200,255,0.55)'); x.fillStyle = l; x.fillRect(0, 0, 4, 128);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })(), side: THREE.DoubleSide, ...ADITIVO }));
  cone.position.y = -r * 0.3 - alt / 2 + alt * 0.02;
  const disco = new THREE.Mesh(new THREE.CircleGeometry(0.55, 48), new THREE.MeshBasicMaterial({ map: gradiente('rgba(90,220,255,1)', 0.3), ...ADITIVO }));
  disco.rotation.x = -Math.PI / 2; disco.position.y = -1.25 + 0.02;
  const esfera = new THREE.Group(); esfera.add(casca, pontos, arame);
  g.add(esfera, ...aneis, cone, disco);
  fixo(g); raiz.add(g);
  updaters.push((dt, t) => {
    esfera.rotation.y += dt * 0.22; aneis[0].rotation.z += dt * 0.35; aneis[1].rotation.z -= dt * 0.2;
    g.position.y = base.max.y + 1.25 + Math.sin(t * 0.9) * 0.04;
    pontos.material.opacity = 0.85 + Math.sin(t * 7.3) * 0.06 * Math.sin(t * 1.7);
  });
  return true;
}

/* ---------------- calor: lampiões e interiores dos túneis ---------------- */
function calor(raiz) {
  let n = 0;
  raiz.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) {
      const nm = m.name || ''; if (m.userData.realce) continue;
      if (/lampiao|luz_quente|_quente$|_chama|F01_luz|F06_janela|F11_interior|F12_brasa|F09_ouro/.test(nm) && m.emissive) {
        m.emissive.lerp(new THREE.Color(0xffa64d), 0.35); m.emissiveIntensity = Math.min(1.6, (m.emissiveIntensity || 1) * 1.45); m.userData.realce = 1; n++;
      }
    }
  });
  return n;
}

/* ---------------- lampiões âmbar ao longo das galerias (os pontos quentes da arte) ---------------- */
function lampioes(raiz, updaters, HALL) {
  const pts = [];
  for (const [nv, r] of [[HALL.lower, HALL.lower.rIn + 0.25], [HALL.upper, HALL.upper.rIn + 0.25]]) {
    for (let a = -HALL.galleryEnd + 3; a <= HALL.galleryEnd - 3; a += 7.5) {
      if (Math.abs(a) < 9) continue;                         // a cachoeira central fica limpa
      const p = a * Math.PI / 180; pts.push([r * Math.sin(p), nv.y + 1.35, -r * Math.cos(p)]);
    }
  }
  const N = pts.length; const pos = new Float32Array(N * 3); pts.forEach((q, i) => pos.set(q, i * 3));
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const fase = new Float32Array(N).map((_, i) => (i * 0.618) % 1); geo.setAttribute('fase', new THREE.BufferAttribute(fase, 1));
  const halo = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, mapa: { value: gradiente('rgba(255,170,80,1)', 0.18) }, escala: { value: innerHeight * 0.5 } },
    vertexShader: `attribute float fase; uniform float t; uniform float escala; varying float vB;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vB = 0.82 + 0.18 * sin(t * (2.0 + fase * 3.0) + fase * 40.0) * sin(t * 1.3 + fase * 9.0);
        gl_PointSize = 1.5 * escala / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D mapa; varying float vB; void main(){ vec4 c = texture2D(mapa, gl_PointCoord); gl_FragColor = vec4(c.rgb * c.a * vB * 1.3, 1.0); }`,
    ...ADITIVO,
  }));
  // a lâmpada em si: um ponto pequeno quase branco no meio do halo
  const nucleo = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffe2b0, size: 0.16, sizeAttenuation: true, ...ADITIVO }));
  const g = fixo(new THREE.Group()); g.name = 'REALCE_lampioes'; g.add(halo, nucleo); raiz.add(g);
  updaters.push((dt, t) => { halo.material.uniforms.t.value = t; halo.material.uniforms.escala.value = innerHeight * 0.5; });
  return N;
}

export function realcar({ hall, nivel = 'media', HALL }) {
  const feitos = []; const { root, updaters } = hall;
  if (carro(root, updaters)) feitos.push('carro');
  // piso molhado (segundo Reflector) saiu: custava um desenho a mais da cena por quadro
  void pisoMolhado; void nivel;
  if (cachoeiras(root, updaters)) feitos.push('cachoeiras');
  if (globo(root, updaters)) feitos.push('globo');
  const q = calor(root); if (q) feitos.push(`calor×${q}`);
  if (HALL) feitos.push(`lampiões×${lampioes(root, updaters, HALL)}`);
  return feitos;
}
