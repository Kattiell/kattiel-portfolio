import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Octree } from 'three/addons/math/Octree.js';
import { buildHall, markReflections } from './hall.js';
import { upgradeHall, upgradePortals, upgradeFacades, loadAreas, installAreas } from './models.js';
import { buildDistricts } from './districts.js';
import { buildDestination } from './destinations.js';
import { criarFeiticos } from './feiticos.js';
import { Player } from './player.js';
import { DISTRICTS, HALL } from './data.js';
import { COMMAND_TOP } from './hub.js';
import { disposeTree, V3, P, DEG } from './util.js';
import { Sound } from './audio.js';
import { motes, setMotesScale } from './vida.js';
import { criarApresentacao } from './apresentacao.js';
import { aprimorar } from './aprimora.js';
import { aplicarAcabamento } from './acabamento.js';
import { fundirEstaticos, poolDeLuzes, resolucaoDinamica, reflexoEspacado, descartePorDistancia, fundirLocal, cronometroGpu } from './desempenho.js';

/* ---------------- infraestrutura ---------------- */
const params = new URLSearchParams(location.search);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches || params.has('reduzido');
const $ = (id) => document.getElementById(id);
const ui = { prompt: $('prompt'), toast: $('toast'), fade: $('fade'), intro: $('intro'), skip: $('skip'), pause: $('pause'), help: $('help'), loading: $('loading'), bar: $('bar'), computer: $('computer'), list: $('district-list'), hud: $('hud'), where: $('where') };

let renderer;
try {
  // sem MSAA no canvas: o antisserrilhado (quando há) fica no alvo do compositor, que é onde a cena é desenhada
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
} catch (e) {
  window.__trocarModo?.('site');   // sem WebGL utilizável: abre a versão site
  throw e;
}
// nível de qualidade: escolhido em entrada.js pelo hardware; o laço principal ainda rebaixa se o quadro cair
const NIVEIS = ['baixa', 'media', 'alta'];
const quality = { level: NIVEIS.includes(window.__qualidade) ? window.__qualidade : 'media' };
let drsEscala = 1, luzes = null, descarte = null;
const FATOR_DESCARTE = { alta: 70, media: 45, baixa: 28 };   // escala da resolução dinâmica · pool de luzes (montado antes do 1º quadro)
const pixelRatioPara = (n) => drsEscala * (n === 'alta' ? Math.min(devicePixelRatio, 1.5) : n === 'media' ? Math.min(devicePixelRatio, 1) : Math.min(devicePixelRatio, 0.85));
renderer.setPixelRatio(pixelRatioPara(quality.level));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.98;   // cinematográfico: nem lavado nem fechado
renderer.shadowMap.enabled = quality.level === 'alta'; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020406);
scene.fog = new THREE.FogExp2(0x030a12, 0.0062);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 400);
window.__cam = camera;
// título e link de cada túnel vêm de src/domain/projects.ts (passados pela página /arquivo)
for (const d of DISTRICTS) { const p = window.__projetosDistrito?.[d.id]; if (p) Object.assign(d.project, { title: p.title, url: p.url || p.repo || null }); }
const feiticos = criarFeiticos(scene, { renderer, camera });

// (MSAA no alvo do compositor deixou um retângulo preto ao redimensionar em alguns drivers: fica sem, a nitidez vem do pixel ratio)
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
// brilho suave: só os pontos realmente fortes florescem (o resto fica nítido e descansado para o olho)
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.42, 0.35, 0.93);   // limiar alto: só o que é luz de verdade floresce
composer.addPass(bloom);
// vinheta leve e um véu de contraste suave: direciona o olhar ao centro sem escurecer as bordas de vez
const vignette = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, forca: { value: 0.32 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float forca; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 d = vUv - 0.5; float v = smoothstep(0.85, 0.2, length(d * vec2(1.0, 1.25)));
      c.rgb *= mix(1.0 - forca, 1.0, v);
      c.rgb = c.rgb / (1.0 + max(c.r, max(c.g, c.b)) * 0.06);   // suaviza picos antes do tom de filme
      gl_FragColor = c; }`,
});
composer.addPass(vignette);
composer.addPass(new OutputPass());

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  setMotesScale(scene, innerHeight);
});

const sound = new Sound();
const progress = (k, label) => { ui.bar.style.width = `${Math.round(k * 100)}%`; if (label) $('load-label').textContent = label; };
const frame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

/* ---------------- construção do salão ---------------- */
progress(0.02, 'Trazendo as áreas do Blender…'); await frame();
// áreas da oficina (Blender): carregadas antes para o salão pular o visual procedural que elas substituem
const areas = await loadAreas();
progress(0.05, 'Escavando a caverna…'); await frame();
const hall = buildHall(renderer, areas);
progress(0.45, 'Abrindo os doze túneis…'); await frame();
const districts = buildDistricts();
hall.root.add(districts.root);
scene.add(hall.root);
console.info('[áreas Blender]', installAreas(hall, areas));
// brilho das peças da plataforma calibrado para o bloom (os LEDs do GLB vinham fortes demais e estouravam em branco)
hall.root.traverse((o) => { if (!o.isMesh || !o.material) return; for (const m of [].concat(o.material)) { const n = (m.name || '').toLowerCase();
  if (n.startsWith('hub_') && (n.includes('led') || n.includes('lampiao') || n.includes('lampião'))) { if (m.emissiveIntensity !== undefined) m.emissiveIntensity *= 0.22; }
  else if (n.startsWith('hub_') && m.emissiveIntensity > 1) m.emissiveIntensity *= 0.5; } });
// teto de brilho para todo emissivo: LEDs e lâmpadas acendem, mas nenhum vira um ponto branco que cansa o olho
hall.root.traverse((o) => { if (!o.material) return; for (const m of [].concat(o.material)) if (m.emissiveIntensity > 1.6) m.emissiveIntensity = 1.6; });
// acabamento: névoa das quedas, neblina rasteira, halos dos túneis, rochas da margem
const apr = aprimorar({ scene, hall, districts }); console.info('[acabamento]', apr.feitos.join(', '));
markReflections(hall.root);
// poeira suspensa no ar da caverna: pega a luz dos feixes e dá profundidade
{ const dust = motes({ n: 1400, box: [90, 34, 90], color: 0xa8d8ff, intensity: 0.9, size: 0.035, drift: 1.4, flick: 1.1 }); dust.position.set(0, 14, -6); hall.root.add(dust);
  const mist = motes({ n: 60, box: [70, 1.6, 50], color: 0x6fb8e0, intensity: 0.06, size: 6, drift: 3, soft: 3 }); mist.position.set(0, 0.7, -8); hall.root.add(mist); }
setMotesScale(scene, innerHeight);
progress(0.5, 'Trazendo as peças do Blender e do Tripo…'); await frame();
console.info('[modelos]', await upgradeHall(hall.root));
console.info('[fachadas Blender]', await upgradeFacades(districts));
// acabamento depois das fachadas: elas também ganham o brilho contido e o lampião novo
console.info('[acabamento]', aplicarAcabamento({ hall, districts }).join(', '));
scene.traverse((o) => { if (!o.material) return; for (const m of [].concat(o.material)) if (m.emissiveIntensity > 1.6) m.emissiveIntensity = 1.6; });
progress(0.65, 'Calculando colisões…'); await frame();
const hallColl = new THREE.Group(); hallColl.add(hall.colliders, districts.colliders); hallColl.updateMatrixWorld(true);
const hallOctree = new Octree(); hallOctree.fromGraphNode(hallColl);
progress(0.85, 'Compilando materiais…'); await frame();
const player = new Player(camera, renderer.domElement);
player.octree = hallOctree;
// mapa de ambiente: captura cúbica do lugar (salão ou distrito) — metais e lago refletem as luzes reais
function captureEnv(pos, hide = []) {
  const rt = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
  const cube = new THREE.CubeCamera(0.5, 300, rt); cube.position.copy(pos);
  hide.forEach((o) => { o.visible = false; }); cube.update(renderer, scene); hide.forEach((o) => { o.visible = true; });
  const pm = new THREE.PMREMGenerator(renderer); const env = pm.fromCubemap(rt.texture).texture; pm.dispose(); rt.dispose();
  return env;
}
const hallEnv = captureEnv(V3(0, 3, 8), [hall.water]);
hall.water.material.envMap = hallEnv; hall.water.material.needsUpdate = true;
scene.environment = hallEnv; scene.environmentIntensity = 0.55;
renderer.compile(scene, camera);
progress(1, 'Pronto.'); await frame();

/* ---------------- estado ---------------- */
const START = { pos: V3(0, HALL.platform.y, 40), yaw: 0 };
const state = { mode: 'intro', focused: null, interact: null, dest: null, destPortal: null, spell: null, anim: null, t: 0, lift: null };
let clock = new THREE.Clock();

function toast(text, ms = 2600) { ui.toast.textContent = text; ui.toast.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => ui.toast.classList.remove('on'), ms); }
function fadeTo(v, ms = 500, color = '#000') { ui.fade.style.background = color; ui.fade.style.transitionDuration = `${ms}ms`; ui.fade.style.opacity = v; return new Promise((r) => setTimeout(r, ms)); }
function setWhere(t) { ui.where.textContent = t; }

/* ---------------- introdução cinematográfica ---------------- */
// 1 escuridão · 2 corredor secreto · 3 revelação · 4 identidade · 5 ativação dos distritos · 6 controle
const shots = [
  { t: 0, pos: V3(0, 3.4, 99), look: V3(0, 3.3, 80) },
  { t: 1.6, pos: V3(0, 3.4, 98), look: V3(0, 3.3, 80) },
  { t: 7.5, pos: V3(0, 3.6, 56), look: V3(0, 4, 30) },
  { t: 11, pos: V3(0, 8, 33), look: V3(0, 12.5, -30) },
  { t: 14, pos: V3(-10, 6, 22), look: V3(-24, 2, 4) },          // veículo
  { t: 17, pos: V3(0, 5, 8), look: V3(0, 5, -12) },              // Batcomputador
  { t: 20, pos: V3(0, 14, 10), look: V3(0, 30, -36) },           // morcego
  { t: 25, pos: V3(0, 7.5, 32), look: V3(0, 12, -34) },           // distritos despertam
  { t: 28, pos: V3(0, HALL.platform.y + 1.75, 40), look: V3(0, HALL.platform.y + 1.6, 20) },
];
const posCurve = new THREE.CatmullRomCurve3(shots.map((s) => s.pos), false, 'centripetal');
const lookCurve = new THREE.CatmullRomCurve3(shots.map((s) => s.look), false, 'centripetal');
const INTRO_T = shots[shots.length - 1].t;
// time → curve parameter with a monotone cubic (Fritsch–Carlson): keeps the shot times, but the camera
// never stops between shots; it only eases in at the start and settles at the end.
const introWarp = (() => {
  const n = shots.length, xs = shots.map((s) => s.t), ys = shots.map((_, i) => i / (n - 1));
  const d = []; for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / Math.max(1e-6, xs[i + 1] - xs[i]));
  const m = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]);
  m[0] = 0; m[n - 1] = 0;   // starts and ends at rest
  return (t) => {
    if (t <= xs[0]) return 0; if (t >= xs[n - 1]) return 1;
    let i = 0; while (i < n - 2 && t > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], s = (t - xs[i]) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * ys[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * ys[i + 1] + (s3 - s2) * h * m[i + 1];
  };
})();
function introAt(t) {
  // lente ~35 mm na apresentação (mais fechada e cinematográfica)
  if (camera.fov !== 42) { camera.fov = 42; camera.updateProjectionMatrix(); }
  // mapeia o tempo para o parâmetro das curvas respeitando os tempos dos planos
  const u = introWarp(t);
  camera.position.copy(posCurve.getPoint(u)); camera.lookAt(lookCurve.getPoint(u));
  // luzes do corredor acendem conforme a câmera passa
  for (const s of hall.root.userData.corridorStrips) { const on = camera.position.z < s.position.z + 8 || t > 7.5; s.visible = t > 1.6 && on; }
  // escuridão inicial
  ui.fade.style.transitionDuration = '0ms'; ui.fade.style.opacity = t < 1.6 ? 1 - t / 1.6 * 0.6 : Math.max(0, 0.4 - (t - 1.6) * 0.25);
  // distritos despertam em sequência
  districts.portals.forEach((p, k2) => { p.wake = THREE.MathUtils.clamp((t - 20.5 - k2 * 0.35) / 0.6, 0, 1); });
  const caption = t < 1.6 ? '' : t < 7.5 ? 'Uma passagem esquecida sob a mansão…' : t < 11 ? 'A Batcaverna.' : t < 14 ? '' : t < 17 ? 'O veículo blindado.' : t < 20 ? 'O Batcomputador.' : t < 25 ? 'Doze distritos. Doze feitiços.' : '';
  $('caption').textContent = caption;
}
function endIntro() {
  if (state.mode !== 'intro') return;
  ui.intro.classList.add('hide'); $('caption').textContent = '';
  districts.portals.forEach((p) => { p.wake = 1; });
  hall.root.userData.corridorStrips.forEach((s) => { s.visible = true; });
  fadeTo(0, 600);
  entrarApresentacao();
}
// o site abre na apresentação (portfólio); a caverna jogável é opcional
function entrarApresentacao() {
  if (state.mode === 'district' || state.mode === 'casting' || state.mode === 'crossing' || state.mode === 'returning' || state.mode === 'lift') return;
  if (state.mode === 'computer') closeComputer();
  document.exitPointerLock?.(); player.enabled = false;
  ui.hud.classList.add('hide'); ui.pause.classList.add('hide'); ui.help.classList.add('hide'); $('touch').classList.add('hide');
  state.mode = 'apres'; apres.entrar();
}
function explorar() {
  apres.sair(); sound.start();
  for (const p of districts.portals) resetPortal(p);
  state.mode = 'hall'; camera.fov = 70; camera.updateProjectionMatrix();
  player.teleport(START.pos, START.yaw);
  ui.hud.classList.remove('hide'); setWhere('Batcaverna — salão principal');
  ui.pause.classList.remove('hide');
}
ui.skip.addEventListener('click', (e) => { e.stopPropagation(); endIntro(); });
addEventListener('keydown', (e) => { if (state.mode === 'intro' && (e.code === 'Space' || e.code === 'Escape' || e.code === 'Enter')) endIntro(); });
if (reducedMotion || !params.has('intro')) setTimeout(endIntro, 50);   // abertura cinematográfica só com ?intro

/* ---------------- entrada / ponteiro ---------------- */
const isTouch = matchMedia('(pointer: coarse)').matches;
ui.pause.addEventListener('click', () => {
  sound.start();
  if (isTouch) { player.enabled = true; ui.pause.classList.add('hide'); $('touch').classList.remove('hide'); return; }
  renderer.domElement.requestPointerLock();
});
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === renderer.domElement;
  player.enabled = locked && (state.mode === 'hall' || state.mode === 'district');
  ui.pause.classList.toggle('hide', locked || state.mode === 'intro' || state.mode === 'computer' || state.mode === 'apres' || state.mode === 'cartao');
});
ui.intro.addEventListener('click', () => sound.start());

addEventListener('keydown', (e) => {
  if (state.mode === 'apres') return;
  if (state.mode === 'cartao') { teclaCartao(e); return; }
  if (e.code === 'KeyP') { entrarApresentacao(); return; }
  if (e.code === 'KeyE' || e.code === 'KeyF') tryInteract();
  if (e.code === 'KeyH') ui.help.classList.toggle('hide');
  if (e.code === 'KeyM') toast(sound.toggle() ? 'Som ligado' : 'Som desligado');
  if (e.code === 'KeyQ') { const i = NIVEIS.indexOf(quality.level); aplicarNivel(NIVEIS[(i + 1) % 3]); toast(`Qualidade: ${quality.level}`); }
  if (e.code === 'Escape' && state.mode === 'computer') closeComputer();
});
/* ---------------- níveis de qualidade ---------------- */
// alta: sombras, bloom, reflexo do lago · media: sem sombras/MSAA, reflexo menor · baixa: direto na tela, sem pós, sem reflexo nem poeira
const reflexoOriginal = hall.water.onBeforeRender;
const espacado = reflexoEspacado(hall.water, 2);   // alta: reflexo a cada 2 quadros · media: a cada 3
function aplicarNivel(n) {
  quality.level = n; window.__qualidadeAtual = n; apr.nivel(n); if (descarte) descarte.fator = FATOR_DESCARTE[n];
  renderer.setPixelRatio(pixelRatioPara(n));
  if (renderer.shadowMap.enabled !== (n === 'alta')) { renderer.shadowMap.enabled = n === 'alta'; scene.traverse((o) => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; }); }
  composer.setPixelRatio(pixelRatioPara(n));
  bloom.strength = n === 'alta' ? 0.42 : 0.36;
  if (n === 'baixa') hall.water.onBeforeRender = () => {}; else espacado.aplicar(n === 'alta' ? 2 : 3);
  const rt = hall.water.getRenderTarget?.(); if (rt) rt.setSize(Math.round(innerWidth * (n === 'alta' ? 0.4 : 0.25)), Math.round(innerHeight * (n === 'alta' ? 0.4 : 0.25)));
  scene.traverse((o) => { if (o.isPoints) o.visible = n !== 'baixa'; });
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
}
// governador: se a média cair abaixo de ~30 fps por 3 s, desce um nível (nunca sobe sozinho, para não oscilar)
const gov = { acc: 0, n: 0, espera: 4 };
function governar(dt) {
  if (document.hidden) return;
  if (gov.espera > 0) { gov.espera -= dt; return; }
  gov.acc += dt; gov.n++;
  if (gov.acc < 3) return;
  const fps = gov.n / gov.acc; gov.acc = 0; gov.n = 0;
  const i = NIVEIS.indexOf(quality.level);
  if (fps < 30 && i > 0 && drs.escala <= 0.56) { aplicarNivel(NIVEIS[i - 1]); gov.espera = 3; console.info('[qualidade] rebaixada para', quality.level, `(${fps.toFixed(0)} fps)`); }
}
// resolução dinâmica: antes de perder um nível inteiro, a resolução interna cede (meta: 45 fps)
const gpuTempo = cronometroGpu(renderer.getContext());
const drs = resolucaoDinamica({ alvo: 45, min: 0.55, gpu: gpuTempo, aplicar: (e) => {
  drsEscala = e; renderer.setPixelRatio(pixelRatioPara(quality.level)); composer.setPixelRatio(pixelRatioPara(quality.level));
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
} });
aplicarNivel(quality.level);
console.info('[qualidade]', quality.level, '·', window.__gpu);

// controles de toque: joystick à esquerda, olhar arrastando à direita, botão E
if (isTouch) {
  const stick = $('stick'), knob = $('knob'); let sid = null, sc = null, lid = null, lp = null;
  addEventListener('touchstart', (e) => { for (const t of e.changedTouches) { if (t.target.id === 'btn-e') continue; if (t.clientX < innerWidth / 2 && sid === null) { sid = t.identifier; sc = [t.clientX, t.clientY]; stick.style.left = `${t.clientX - 60}px`; stick.style.top = `${t.clientY - 60}px`; stick.classList.add('on'); } else if (lid === null) { lid = t.identifier; lp = [t.clientX, t.clientY]; } } }, { passive: true });
  addEventListener('touchmove', (e) => { for (const t of e.changedTouches) { if (t.identifier === sid) { const dx = (t.clientX - sc[0]) / 50, dy = (t.clientY - sc[1]) / 50; player.touch.x = THREE.MathUtils.clamp(dx, -1, 1); player.touch.y = THREE.MathUtils.clamp(dy, -1, 1); knob.style.transform = `translate(${player.touch.x * 40}px, ${player.touch.y * 40}px)`; } if (t.identifier === lid) { player.yaw -= (t.clientX - lp[0]) * 0.005; player.pitch = THREE.MathUtils.clamp(player.pitch - (t.clientY - lp[1]) * 0.004, -1.4, 1.4); lp = [t.clientX, t.clientY]; } } }, { passive: true });
  addEventListener('touchend', (e) => { for (const t of e.changedTouches) { if (t.identifier === sid) { sid = null; player.touch.x = player.touch.y = 0; stick.classList.remove('on'); knob.style.transform = ''; } if (t.identifier === lid) lid = null; } });
  $('btn-e').addEventListener('touchstart', (e) => { e.preventDefault(); tryInteract(); });
}

/* ---------------- interação ---------------- */
const lookDir = new THREE.Vector3();
function findInteract() {
  const feet = player.feet; camera.getWorldDirection(lookDir);
  let best = null, bestD = Infinity;
  const consider = (it, pos, radius) => {
    const dx = pos.x - feet.x, dz = pos.z - feet.z, dy = Math.abs(pos.y - feet.y);
    const d = Math.hypot(dx, dz); if (d > radius || dy > 2.2) return;
    if (d < bestD) { best = it; bestD = d; }
  };
  if (state.mode === 'hall') {
    for (const p of districts.portals) {
      const f = p.front(); consider({ kind: 'portal', portal: p }, f, 4.2);
    }
    for (const it of hall.interactables) consider(it, it.pos(), it.radius);
  } else if (state.mode === 'district' && state.dest) {
    for (const it of state.dest.interactables) consider(it, it.pos(), it.radius);
  }
  return best;
}
function tryInteract() {
  if (!player.enabled && !isTouch) return;
  const it = state.interact; if (!it) return;
  if (it.kind === 'portal') startCast(it.portal);
  else if (it.kind === 'lift') useLift(it.lift);
  else if (it.kind === 'computer') openComputer();
  else if (it.kind === 'return') returnToHall();
  else if (it.kind === 'context') { const r = it.run(); if (r === 'revealed') { sound.chime(); toast(`Projeto revelado — ${state.dest.d.project.title}`); } }
}

/* ---------------- feitiço → travessia → distrito ---------------- */
const hallLights = []; hall.root.traverse((o) => { if (o.isHemisphereLight || o.isDirectionalLight) hallLights.push([o, o.intensity]); });
function setHallDim(k) { for (const [l, i0] of hallLights) l.intensity = i0 * k; }
function startCast(portal) {
  if (state.mode !== 'hall') return;
  state.mode = 'casting'; player.enabled = false; state.destPortal = portal;
  toast(`${portal.d.spell}!`, 2200);
  sound.ping(1800, 0.05, 0.5); setTimeout(() => sound.spell(portal.d.id), 180); // pré-eco curto, depois a assinatura
  setHallDim(0.85);
  const wand = camera.position.clone().add(V3(0.25, -0.25, 0).applyQuaternion(camera.quaternion)).add(camera.getWorldDirection(V3()).multiplyScalar(0.6));
  state.spell = feiticos.lancar(portal, wand, { reduced: reducedMotion || quality.level === 'media', onFlash: (k) => { ui.fade.style.transitionDuration = '60ms'; ui.fade.style.background = '#fff'; ui.fade.style.opacity = k * 0.6; setTimeout(() => { ui.fade.style.transitionDuration = '300ms'; ui.fade.style.opacity = 0; }, 80); } });
  // a câmera se vira suavemente para o portal durante o feitiço
  const from = { yaw: player.yaw, pitch: player.pitch };
  const a = portal.anchor(); const d = a.clone().sub(camera.position);
  const to = { yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) };
  let dy = to.yaw - from.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
  const dolly = d.clone().setY(0).normalize().multiplyScalar(0.35); const base = camera.position.clone();
  state.anim = { t: 0, u: 0, update(dt) {
    this.t = Math.min(1, this.t + dt * 1.6); const e = 1 - Math.pow(1 - this.t, 3); player.yaw = from.yaw + dy * e; player.pitch = from.pitch + (to.pitch - from.pitch) * e; player.sync();
    this.u = Math.min(1, this.u + dt / (portal.d.duration + 0.5)); const eu = this.u * this.u * (3 - 2 * this.u); camera.position.copy(base).addScaledVector(dolly, eu);
  } };
}

async function crossPortal(portal) {
  state.mode = 'crossing';
  sound.whoosh();
  const path = new THREE.CatmullRomCurve3([camera.position.clone(), portal.front().add(V3(0, 1.7, 0)), portal.mouth(), portal.deep()]);
  const c = '#' + new THREE.Color(portal.d.color).getHexString();
  const dur = reducedMotion ? 0.4 : 1.25; let t = 0; let hold = reducedMotion ? 0 : 0.28;
  await new Promise((resolve) => {
    state.anim = { update(dt) {
      if (hold > 0) { hold -= dt; return; }
      t = Math.min(1, t + dt / dur); const e = t * t * t; // acelera entrando
      camera.position.copy(path.getPoint(e)); camera.lookAt(path.getPoint(Math.min(1, e + 0.05)).add(V3(0, 0, 0)));
      camera.fov = 70 + Math.sin(e * Math.PI) * 25; camera.updateProjectionMatrix();
      if (t > 0.7) { ui.fade.style.transitionDuration = '0ms'; ui.fade.style.background = c; ui.fade.style.opacity = (t - 0.7) / 0.3; }
      if (t >= 1) { state.anim = null; resolve(); }
    } };
  });
  // carregamento do destino escondido pela travessia
  ui.fade.style.opacity = 1; ui.fade.style.background = c;
  $('caption').textContent = `Distrito ${portal.d.id} — ${portal.d.name}`;
  await frame();
  const dest = buildDestination(portal.d);
  hall.root.visible = false; scene.add(dest.root);
  scene.fog.color.setHex(dest.fog.color); scene.fog.density = dest.fog.density; scene.background.setHex(dest.fog.color);
  const oct = new Octree(); oct.fromGraphNode(dest.colliders); player.octree = oct;
  scene.environment = null; dest.env = captureEnv(V3(0, 3, 0)); scene.environment = dest.env; scene.environmentIntensity = 0.8;
  state.dest = Object.assign(dest, { d: portal.d });
  player.teleport(dest.spawn, dest.yaw);
  camera.fov = 70; camera.updateProjectionMatrix();
  renderer.compile(scene, camera);
  await frame();
  state.mode = 'district';
  player.enabled = document.pointerLockElement === renderer.domElement || isTouch;
  setWhere(`Distrito ${String(portal.d.id).padStart(2, '0')} — ${portal.d.name}`);
  await fadeTo(0, 700, c);
  $('caption').textContent = '';
  toast(`${portal.d.focal}. Procure: ${portal.d.interaction.toLowerCase()}.`, 5000);
}

async function returnToHall() {
  if (state.mode !== 'district') return;
  state.mode = 'returning'; player.enabled = false; sound.whoosh();
  const p = state.destPortal; const c = '#' + new THREE.Color(p.d.color).getHexString();
  await fadeTo(1, 600, c);
  scene.remove(state.dest.root); disposeTree(state.dest.root); state.dest.env?.dispose(); state.dest = null;
  scene.environment = hallEnv; scene.environmentIntensity = 0.55;
  hall.root.visible = true;
  scene.fog.color.setHex(0x030a12); scene.fog.density = 0.0062; scene.background.setHex(0x020406);
  player.octree = hallOctree;
  resetPortal(p); setHallDim(1);
  // volta de frente para o centro do salão, na boca do túnel
  const yaw = Math.PI - p.slot.phi * DEG;
  player.teleport(p.front(), yaw);
  state.mode = 'hall'; player.enabled = document.pointerLockElement === renderer.domElement || isTouch;
  setWhere('Batcaverna — salão principal');
  await fadeTo(0, 700, c);
}

/* ---------------- cartão do projeto (depois do feitiço) ---------------- */
// O navegador só deixa abrir aba nova a partir de um gesto (clique/tecla): por isso o feitiço termina num cartão,
// e Enter/E/clique abre o site do projeto (ou o GitHub). Dali também dá para entrar no distrito.
const cartao = { el: $('cartao-projeto'), portal: null, link: null };
function abrirCartao(p) {
  const info = window.__projetosDistrito?.[p.d.id] || {};
  const github = 'https://github.com/Kattiell';
  const link = info.url || info.repo || github;
  const rotulo = info.url ? 'Abrir o projeto' : info.repo ? 'Ver o código no GitHub' : 'Ver meu GitHub';
  cartao.portal = p; cartao.link = link;
  state.mode = 'cartao'; player.enabled = false; document.exitPointerLock?.();
  ui.hud.classList.add('hide'); ui.pause.classList.add('hide');
  const esc = (x) => String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  cartao.el.style.setProperty('--cor', '#' + new THREE.Color(p.d.color).getHexString());
  cartao.el.innerHTML = `
    <p class="cp-codigo">DISTRITO ${String(p.d.id).padStart(2, '0')} · ${esc(p.d.name.toUpperCase())} · ${esc(p.d.spell.toUpperCase())}</p>
    <h2>${esc(info.title || 'Projeto em curadoria')}</h2>
    ${info.kind ? `<p class="cp-tipo">${esc(info.kind)}</p>` : ''}
    <p class="cp-resumo">${esc(info.summary || 'Este túnel ainda não tem um projeto público.')}</p>
    ${!info.url && !info.repo ? '<p class="cp-nota">Sem link público ainda: o botão leva ao meu GitHub.</p>' : ''}
    <div class="cp-acoes">
      <a class="cp-prim" href="${esc(link)}" target="_blank" rel="noopener noreferrer" data-abrir>${rotulo} <span aria-hidden="true">↗</span></a>
      <button type="button" data-entrar>Entrar no distrito</button>
      <button type="button" data-fechar>Fechar <kbd>Esc</kbd></button>
    </div>
    <p class="cp-dica"><kbd>Enter</kbd> abre o link · <kbd>Esc</kbd> volta ao salão</p>`;
  cartao.el.classList.remove('hide');
  cartao.el.querySelector('[data-abrir]').focus();
}
function fecharCartao(entrar = false) {
  const p = cartao.portal; cartao.el.classList.add('hide'); cartao.portal = null;
  if (entrar) { crossPortal(p); return; }
  resetPortal(p); setHallDim(1); state.mode = 'hall'; ui.hud.classList.remove('hide');
  if (isTouch) player.enabled = true; else ui.pause.classList.remove('hide');   // um clique devolve o mouse
}
function teclaCartao(e) {
  if (e.code === 'Escape') { e.preventDefault(); fecharCartao(false); }
  else if (e.code === 'Enter' || e.code === 'KeyE') { e.preventDefault(); window.open(cartao.link, '_blank', 'noopener'); }
}
cartao.el?.addEventListener('click', (e) => {
  if (e.target.closest('[data-entrar]')) fecharCartao(true);
  else if (e.target.closest('[data-fechar]')) fecharCartao(false);
});

function resetPortal(p) {
  p.open = 0; const fx = p.fx;
  if (fx.gate) fx.gate.position.y = HALL.portalH * 0.55;
  if (fx.rings) fx.rings.forEach((r) => { r.visible = false; r.rotation.set(0, 0, 0); });
  if (fx.curtains) fx.curtains.forEach((c) => { c.position.x = c.userData.x0 ?? (c.userData.x0 = c.position.x); });
  if (fx.ribbon) fx.ribbon.visible = true;
  if (fx.glyphs) fx.glyphs.visible = false;
  if (fx.wagon) fx.wagon.position.z = -7;
  if (fx.crystals) fx.crystals.forEach((c) => { c.material.emissiveIntensity = 0.6; });
  if (fx.leaves && fx.leaves.userData.full) fx.leaves.count = fx.leaves.userData.full;
}
// guarda os valores iniciais que os feitiços alteram
for (const p of districts.portals) {
  if (p.fx.curtains) p.fx.curtains.forEach((c) => { c.userData.x0 = c.position.x; });
  if (p.fx.leaves) p.fx.leaves.userData.full = p.fx.leaves.count;
}

/* ---------------- elevadores ---------------- */
function useLift(lift) {
  if (state.mode !== 'hall') return;
  state.mode = 'lift'; player.enabled = false; sound.lift();
  const up = lift.level === 'lower'; const y0 = up ? HALL.lower.y : HALL.upper.y, y1 = up ? HALL.upper.y : HALL.lower.y;
  const base = P(lift.r, lift.f, 0); let t = 0;
  player.teleport(base.clone().setY(y0), player.yaw);
  state.anim = { update(dt) {
    t = Math.min(1, t + dt / 3.2); const e = t * t * (3 - 2 * t); const y = y0 + (y1 - y0) * e;
    lift.cage.position.y = y - HALL.lower.y; camera.position.set(base.x, y + 1.75, base.z); camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
    if (t >= 1) { lift.level = up ? 'upper' : 'lower'; player.teleport(base.clone().setY(y1), player.yaw); state.mode = 'hall'; player.enabled = document.pointerLockElement === renderer.domElement || isTouch; state.anim = null; toast(up ? 'Galeria superior — distritos 1 a 6' : 'Galeria inferior — distritos 7 a 12'); }
  } };
}

/* ---------------- Batcomputador (interativo) ---------------- */
let beacon = null;
const hub = hall.root.userData.hub;
const apres = criarApresentacao({ camera, districts, hub, reducedMotion, onExplorar: explorar });
$('voltar-apres').addEventListener('click', (e) => { e.stopPropagation(); entrarApresentacao(); });
addEventListener('pointerdown', () => sound.start(), { once: true });
const T3 = COMMAND_TOP; const bcZ = T3.z1 + 0.5;
// câmera ao vivo: alvo padrão = portal 1
let liveSel = { kind: 'portal', id: 1 };
const camTargets = () => {
  if (liveSel.kind === 'portal') {
    const p = districts.portals.find((x) => x.d.id === liveSel.id); const f = p.front(); const m = p.mouth();
    return { from: f.clone().add(f.clone().sub(m).setY(0).normalize().multiplyScalar(5)).setY(f.y + 3.2), at: m.clone().setY(m.y + 1.5) };
  }
  if (liveSel.kind === 'car') return { from: hub.TT.clone().add(V3(7, 3.5, 6)), at: hub.TT.clone().setY(1.5) };
  return { from: V3(0, 6, -20), at: V3(0, 12, -37) };
};
hub.live.target = camTargets;
function openComputer() {
  state.mode = 'computer'; player.enabled = false; document.exitPointerLock?.();
  ui.computer.classList.remove('hide'); ui.pause.classList.add('hide'); ui.prompt.classList.remove('on');
  const chairObj = hall.root.getObjectByName('BC_CHAIR'); if (chairObj) chairObj.visible = false;
  // a câmera se senta na cadeira e enquadra o banco de monitores (à esquerda do painel)
  const to = hub.camPose.to.clone().add(V3(1.2, 0, 0)), look = hub.camPose.look.clone().add(V3(1.2, 0, 0)); // painel à direita: tela no centro-esquerda
  const from = camera.position.clone(); const q0 = camera.quaternion.clone();
  const tmp = new THREE.PerspectiveCamera(); tmp.position.copy(to); tmp.lookAt(look); const q1 = tmp.quaternion.clone(); // câmera: -Z aponta para o alvo
  let t = 0;
  // sits down in ~1.4 s: C2 ease, rotation slightly ahead of the body
  state.anim = { update(dt) { t = Math.min(1, t + dt / 1.4); const e = t * t * t * (t * (t * 6 - 15) + 10); const r = Math.min(1, t * 1.2); const er = r * r * r * (r * (r * 6 - 15) + 10); camera.position.lerpVectors(from, to, e); camera.quaternion.slerpQuaternions(q0, q1, er); if (t >= 1) state.anim = null; } };
  sound.chime();
}
function closeComputer() {
  ui.computer.classList.add('hide'); state.mode = 'hall'; ui.pause.classList.remove('hide');
  const chairObj = hall.root.getObjectByName('BC_CHAIR'); if (chairObj) chairObj.visible = true;
  state.anim = null; player.sync();
}
$('computer-close').addEventListener('click', closeComputer);
// abas
document.querySelectorAll('#computer .tabs button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('#computer .tabs button').forEach((x) => x.classList.toggle('on', x === b));
  document.querySelectorAll('#computer section').forEach((s2) => s2.classList.toggle('hide', s2.dataset.pane !== b.dataset.tab));
}));
// distritos
ui.list.innerHTML = DISTRICTS.map((d) => `<li><button data-id="${d.id}"><b>${String(d.id).padStart(2, '0')}</b> ${d.name}<small>${d.spell} · ${d.id <= 6 ? 'galeria superior' : 'galeria inferior'}</small></button></li>`).join('');
ui.list.addEventListener('click', (e) => {
  const btn = e.target.closest('button'); if (!btn) return;
  const p = districts.portals.find((x) => x.d.id === Number(btn.dataset.id));
  if (beacon) { scene.remove(beacon); beacon.geometry.dispose(); }
  beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 40, 16, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(p.d.color).multiplyScalar(2), transparent: true, opacity: 0.35, toneMapped: false, depthWrite: false, side: THREE.DoubleSide }));
  beacon.position.copy(p.front()).setY(p.front().y + 20); scene.add(beacon);
  liveSel = { kind: 'portal', id: p.d.id }; window.__mapaFoco = p.d.id;   // a tela grande destaca a rota
  sound.ping(880, 0.08, 0.3);
  toast(`Rota marcada: Distrito ${p.d.id} — ${p.d.name} (${p.d.id <= 6 ? 'suba pelo elevador' : 'escadas laterais'}). Câmera ao vivo no monitor.`, 4200);
});
// câmeras
const camList = $('cam-list'); const camCv = $('cam-view'); const camCtx = camCv.getContext('2d');
camList.innerHTML = [['car', 'Plataforma'], ['fall', 'Cachoeira'], ...DISTRICTS.map((d) => [`p${d.id}`, `Portal ${d.id}`])].map(([k, l]) => `<button data-k="${k}">${l}</button>`).join('');
camList.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return; const k = b.dataset.k;
  liveSel = k === 'car' ? { kind: 'car' } : k === 'fall' ? { kind: 'fall' } : { kind: 'portal', id: Number(k.slice(1)) };
  camList.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
});
const camPix = new Uint8Array(384 * 216 * 4); const camImg = camCtx.createImageData(384, 216);
let camAcc = 0;
function updateCamPanel(dt) {
  camAcc += dt; if (camAcc < 0.25) return; camAcc = 0;
  renderer.readRenderTargetPixels(hub.live.rt, 0, 0, 384, 216, camPix);
  // o alvo vem em linear e de cabeça para baixo: gama simples + inversão vertical
  for (let y = 0; y < 216; y++) for (let x = 0; x < 384; x++) {
    const si = ((215 - y) * 384 + x) * 4, di = (y * 384 + x) * 4;
    for (let c = 0; c < 3; c++) camImg.data[di + c] = Math.min(255, Math.pow(camPix[si + c] / 255, 1 / 2.2) * 255 * 1.15);
    camImg.data[di + 3] = 255;
  }
  camCtx.putImageData(camImg, 0, 0);
  camCtx.fillStyle = 'rgba(255,60,60,.9)'; if (Math.floor(state.t * 2) % 2) { camCtx.beginPath(); camCtx.arc(14, 14, 5, 0, 7); camCtx.fill(); }
  camCtx.fillStyle = '#e5f7ff'; camCtx.font = '12px monospace';
  camCtx.fillText('AO VIVO · ' + (liveSel.kind === 'portal' ? 'PORTAL ' + liveSel.id : liveSel.kind === 'car' ? 'PLATAFORMA' : 'CACHOEIRA'), 26, 18);
  $('bc-clock').textContent = new Date().toLocaleTimeString('pt-BR');
}
// veículo
let turning = true, ignition = false;
// luz de recorte suave sobre o carro (a garagem lia escura demais)
{ const l = new THREE.SpotLight(0xcfe2ff, 260, 24, 0.55, 0.75, 1.4); l.position.copy(hub.TT).add(V3(5, 9, 3)); l.target.position.copy(hub.TT); scene.add(l, l.target); }
const ign = new THREE.PointLight(0x3ac8ff, 40, 7, 1.8); ign.position.copy(hub.TT).setY(1.4); ign.intensity = 0; scene.add(ign);
$('bc-turn').addEventListener('click', () => { turning = !turning; hall.root.userData.turntable.speed = turning ? 0.06 : 0; $('bc-turn').innerHTML = `Girar plataforma: <b>${turning ? 'ligado' : 'desligado'}</b>`; sound.lift(); });
$('bc-ign').addEventListener('click', () => {
  ignition = !ignition; $('bc-ign').innerHTML = `Ignição: <b>${ignition ? 'ligada' : 'desligada'}</b>`; $('st-tur').textContent = ignition ? 'ativa · 72%' : 'em espera';
  ign.intensity = ignition ? 40 : 0; if (ignition) { sound.sweep(60, 220, 1.6, 0.35, 2); liveSel = { kind: 'car' }; }
});
// sistemas
let alertOn = false, dim = false;
const baseExposure = renderer.toneMappingExposure;
$('bc-alert').addEventListener('click', () => { alertOn = !alertOn; $('bc-alert').innerHTML = `Modo alerta: <b>${alertOn ? 'ligado' : 'desligado'}</b>`; if (alertOn) sound.sweep(400, 900, 0.8, 0.25, 4); });
$('bc-light').addEventListener('click', () => { dim = !dim; renderer.toneMappingExposure = dim ? baseExposure * 0.6 : baseExposure; $('bc-light').innerHTML = `Iluminação: <b>${dim ? 'reduzida' : 'normal'}</b>`; });
const alertLight = new THREE.PointLight(0xff2020, 0, 80, 1.2); alertLight.position.set(0, 20, -5); scene.add(alertLight);
function updateSystems(t) { alertLight.intensity = alertOn ? 220 * (0.55 + 0.45 * Math.sin(t * 4)) : 0; hub.live.active = state.mode === 'computer'; }

/* ---------------- laço principal ---------------- */
let introT = 0; let fpsAcc = 0, fpsN = 0;
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05); state.t += dt; const t = state.t;
  if (state.mode === 'intro') { introT += dt; introAt(introT); if (introT >= INTRO_T) endIntro(); }
  else if (state.mode === 'apres') apres.update(dt, t);
  else if (state.mode === 'hall' || state.mode === 'district') player.update(dt);
  if (state.anim) state.anim.update(dt);
  if (state.mode === 'casting' && state.spell) {
    if (state.spell.update(dt)) { const p = state.destPortal; state.spell.dispose(); state.spell = null; state.anim = null; abrirCartao(p); }
  }
  if (hall.root.visible) {
    for (const u of hall.updaters) u(dt, t);
    districts.update(dt, t, state.interact?.portal);
    for (const p of districts.portals) if (p.wake !== undefined && p.wake < 1) p.light.intensity *= p.wake;
  }
  if (state.dest) state.dest.update(dt, t);
  updateSystems(t);
  if (state.mode === 'computer') updateCamPanel(dt);
  if (beacon) { beacon.material.opacity = 0.25 + Math.sin(t * 3) * 0.1; if (state.destPortal && state.mode === 'district') { scene.remove(beacon); beacon = null; } }
  // prompt de interação
  if (state.mode === 'hall' || state.mode === 'district') {
    state.interact = findInteract();
    const lbl = !state.interact ? '' : state.interact.kind === 'portal' ? `E — conjurar ${state.interact.portal.d.spell} · Distrito ${state.interact.portal.d.id}: ${state.interact.portal.d.name}` : state.interact.label();
    ui.prompt.textContent = lbl; ui.prompt.classList.toggle('on', !!lbl);
  } else { ui.prompt.classList.remove('on'); }
  gpuTempo.inicio();
  if (quality.level === 'baixa') renderer.render(scene, camera); else composer.render();
  gpuTempo.fim();
  luzes?.update(dt); descarte?.update(dt); drs.update(dt);
  governar(dt);
  fpsAcc += dt; fpsN++; if (fpsAcc > 1) { $('fps').textContent = `${Math.round(fpsN / fpsAcc)} fps · ${renderer.info.render.calls} draw calls`; fpsAcc = 0; fpsN = 0; }
  requestAnimationFrame(loop);
}
/* ---------------- desempenho: fusão de estáticos, pool de luzes, resolução dinâmica ---------------- */
{
  const t0 = performance.now();
  const fora = [...districts.portals.flatMap((p) => [p.barrier, p.marker, p.markerRing, p.veil, p.medallion, p.light]), hall.root.userData.turntable?.turn, ...(hall.lifts || []).flatMap((l) => [l.group, l.cage]), ...(hall.root.userData.corridorStrips || [])].filter(Boolean);
  const r = fundirEstaticos(hall.root, { fora, semSombra: quality.level !== 'alta', ensaio: (i) => { const t = 2 + i * 0.53; for (const u of hall.updaters) u(0.11, t); districts.update(0.11, t, null); } });
  const orc = { alta: [14, 6], media: [8, 4], baixa: [4, 2] }[quality.level];
  luzes = poolDeLuzes(scene, hall.root, camera, { pontos: orc[0], spots: orc[1] });
  feiticos.aquecer();   // compila os shaders do feitiço (e de todo o salão) antes do primeiro quadro
  // fechaduras das grades: as peças giram juntas, então fundem no espaço da própria fechadura (a runa anima à parte)
  let nLocal = 0; for (const p of districts.portals) { const lk = p.barrier.userData.lock; nLocal += fundirLocal(lk, [p.barrier.userData.rune]); }
  descarte = descartePorDistancia(hall.root, camera, { fator: FATOR_DESCARTE[quality.level] });
  console.info('[desempenho]', `fechaduras −${nLocal}`, `descarte por distância: ${descarte.total} peças pequenas`);
  console.info('[desempenho]', `malhas ${r.antes}→${r.depois}`, `luzes ${luzes.total}→${luzes.reais}`, `${(performance.now() - t0).toFixed(0)} ms`);
}
ui.loading.classList.add('hide');
ui.intro.classList.remove('hide');
loop();

/* ---------------- entrada pelo portfólio (Next) ---------------- */
// /arquivo?modo=explorar abre direto no salão; /arquivo?distrito=N leva até a boca do túnel N (1 a 6 na galeria superior)
function irAoDistrito(id) {
  const p = districts.portals.find((x) => x.d.id === id); if (!p) return;
  explorar();
  if (p.slot.upper) for (const l of hall.lifts || []) { l.level = 'upper'; l.cage.position.y = HALL.upper.y - HALL.lower.y; }
  player.teleport(p.front(), -p.slot.phi * DEG);   // de frente para o túnel
  setWhere(`Distrito ${p.d.id} — ${p.d.name}`);
  toast(`Distrito ${p.d.id}: ${p.d.name} · conjure ${p.d.spell} com E`);
}
{
  const alvo = Number(params.get('distrito'));
  if (alvo >= 1 && alvo <= 12) setTimeout(() => irAoDistrito(alvo), 120);
  else if (params.get('modo') === 'explorar') setTimeout(explorar, 120);
}

// ganchos para teste automatizado (window.__bc)
window.__bc = {
  nivel: (n) => aplicarNivel(n), composer, state, player, camera, districts, hall, startCast, returnToHall, endIntro, renderer, scene, tryInteract, findInteract,
  // câmera de inspeção: __bc.view([x,y,z],[lx,ly,lz]) congela o jogador e enquadra
  view(p, l, fov = 70) { state.mode = 'debug'; ui.pause.classList.add('hide'); camera.fov = fov; camera.updateProjectionMatrix(); camera.position.set(...p); camera.lookAt(...l); },
  play() { state.mode = 'hall'; camera.fov = 70; camera.updateProjectionMatrix(); },
};
