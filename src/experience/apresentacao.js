/*
 * Modo apresentação: a caverna vira o cenário do portfólio do Gabriel Caetano.
 * Uma barra de navegação fixa lista as seções. Cada seção leva a câmera até um lugar da caverna
 * (batcomputador, garagem, sacada, teto, cachoeira...) e mostra o conteúdo num painel ao lado.
 * Os 12 túneis ficam fechados: são reservados para os projetos.
 * Não exige jogar: tudo é clicável, navegável por teclado (← →) e funciona no toque.
 */
import * as THREE from 'three';
import { PERFIL, SECOES, PROJETOS } from './perfil.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// C2 smooth: zero speed and zero acceleration at both ends (no visible "start" or "brake")
const smoother = (k) => k * k * k * (k * (k * 6 - 15) + 10);
// quintic Hermite: leaves p0 with velocity v0 (seconds·T) and arrives at p1 at rest
function hermite5(out, p0, v0T, p1, s) {
  const s3 = s * s * s, s4 = s3 * s, s5 = s4 * s;
  const h0 = 1 - 10 * s3 + 15 * s4 - 6 * s5, h1 = s - 6 * s3 + 8 * s4 - 3 * s5, h5 = 10 * s3 - 15 * s4 + 6 * s5;
  return out.set(0, 0, 0).addScaledVector(p0, h0).addScaledVector(v0T, h1).addScaledVector(p1, h5);
}
// frame-rate independent exponential damping
const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));

export function criarApresentacao({ camera, districts, hub, reducedMotion, onExplorar, onSom }) {
  const $ = (id) => document.getElementById(id);
  const ui = { raiz: $('apres'), nav: $('ap-nav'), heroi: $('ap-heroi'), painel: $('ap-painel'), corpo: $('ap-corpo'), menuBtn: $('ap-menu'), indice: $('ap-indice') };
  const movel = () => innerWidth < 860;
  let ativo = false, atual = 0, anim = null, idle = 0;
  // cam = the "ideal" shot (path); rig = what is rendered, following the ideal with damping
  const cam = { pos: V3(), look: V3(), vPos: V3(), vLook: V3() };
  const rig = { pos: V3(), quat: new THREE.Quaternion(), fov: 50, roll: 0, ok: false };
  const prev = { pos: V3(), look: V3() };
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpV = V3(), fwd = V3(), right = V3(), UP = V3(0, 1, 0);
  let lastYaw = null;
  let deslocAlvo = { x: 0, y: 0 }, desloc = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  /* ---------------- vistas da câmera ---------------- */
  function vista(sec) {
    const lk = hub.camPose.look.clone(), tt = hub.TT.clone();
    const V = {
      heroi: { pos: V3(0, 7.2, 33), look: V3(0, 15, -30), fov: 52 },
      computador: { pos: lk.clone().add(V3(-1.5, 2.4, 14)), look: lk.clone().add(V3(0, 0.6, 0)), fov: 50 },
      garagem: { pos: tt.clone().add(V3(12.5, 3.4, -1.5)), look: tt.clone().add(V3(0, 1.0, 0.5)), fov: 44 },
      sacada: { pos: V3(30.5, 30.5, -8), look: V3(-6, 6, 6), fov: 60 },
      teto: { pos: V3(0, 11, 16), look: V3(0, 31, -26), fov: 58 },
      cachoeira: { pos: V3(-4, 8.5, -12), look: V3(0, 13, -37), fov: 52 },
      emblema: { pos: V3(7, 11, 10), look: V3(0, 1.5, -1), fov: 50 },
      galerias: { pos: V3(0, 11, 24), look: V3(0, 11.5, -36), fov: 56 },
      entrada: { pos: V3(0, 4.2, 24), look: V3(0, 3.6, 46), fov: 50 },
    };
    return V[sec.vista] || V.heroi;
  }
  // the shot's fov: kept apart from camera.fov because the flight adds a light "speed" widening on top
  let fovAlvo = 50;
  function voar(sec, instantaneo = false) {
    const v = vista(sec);
    if (instantaneo || reducedMotion) {
      cam.pos.copy(v.pos); cam.look.copy(v.look); cam.vPos.set(0, 0, 0); cam.vLook.set(0, 0, 0);
      fovAlvo = v.fov; camera.fov = v.fov; camera.updateProjectionMatrix(); anim = null; rig.ok = false; return;
    }
    const p0 = cam.pos.clone(), l0 = cam.look.clone(), f0 = fovAlvo;
    const dist = p0.distanceTo(v.pos);
    // longer flights take longer, but never drag: 2 s to 4.2 s
    const dur = THREE.MathUtils.clamp(2 + dist / 24, 2, 4.2);
    // leaves with the speed it already had (switching section mid-flight does not cut the move)
    const vp = cam.vPos.clone().multiplyScalar(dur), vl = cam.vLook.clone().multiplyScalar(dur);
    // arc: rises in the middle so it does not cross the platform (same rule as before, now smooth)
    const lift = Math.max(0, Math.max(p0.y, v.pos.y) + Math.min(6, dist * 0.12) - (p0.y + v.pos.y) / 2);
    const lookLift = Math.min(2.5, l0.distanceTo(v.look) * 0.04);
    const widen = Math.min(6, dist * 0.12);   // slight wide-angle while moving: sense of speed
    let t = 0;
    anim = (dt) => {
      t = Math.min(1, t + dt / dur);
      const bump = 16 * t * t * (1 - t) * (1 - t);   // 0 at the ends, 1 in the middle, zero slope at the ends
      hermite5(cam.pos, p0, vp, v.pos, t).y += lift * bump;
      // the look leads the body a little: turns first, then travels (reads as intention)
      const tl = Math.min(1, t * 1.18);
      hermite5(cam.look, l0, vl, v.look, tl).y += lookLift * bump;
      fovAlvo = f0 + (v.fov - f0) * smoother(t);
      if (t >= 1) { anim = null; cam.vPos.set(0, 0, 0); cam.vLook.set(0, 0, 0); }
      return widen * bump;
    };
    idle = 0;
  }

  /* ---------------- portais: só o da seção fica aberto ---------------- */
  // os túneis ficam fechados: serão as portas dos projetos (abrem quando cada projeto for ligado)
  function portaisPara() { for (const p of districts.portals) p.alvoAberto = 0; }

  /* ---------------- conteúdo ---------------- */
  const cartao = (id) => {
    const p = PROJETOS[id]; if (!p) return '';
    const tag = p.url ? 'a' : 'div'; const href = p.url ? ` href="${esc(p.url)}" target="_blank" rel="noopener"` : '';
    return `<${tag} class="ap-proj${p.url ? ' link' : ''}"${href}><span class="tipo">${esc(p.tipo)}${p.url ? ' · abrir ↗' : ''}</span><b>${esc(p.nome)}</b><p>${esc(p.desc)}</p><span class="tags">${p.tags.map((t) => `<i>${esc(t)}</i>`).join('')}</span></${tag}>`;
  };
  function render(i) {
    const s = SECOES[i]; const n = String(i).padStart(2, '0');
    let h = `<p class="ap-kicker">${n} · ${esc(s.menu)}</p><h2 id="ap-titulo">${esc(s.titulo)}</h2><p class="ap-lead">${esc(s.lead)}</p>`;
    if (s.itens) h += `<ul class="ap-itens">${s.itens.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    if (s.projetos) h += `<h3>Projetos</h3><div class="ap-projs">${s.projetos.map(cartao).join('')}</div>`;
    if (s.todos) h += `<div class="ap-projs grade">${Object.keys(PROJETOS).map(cartao).join('')}</div>`;
    if (s.stack) h += `<h3>Ferramentas</h3><p class="ap-stack">${s.stack.map((x) => `<i>${esc(x)}</i>`).join('')}</p>`;
    if (s.contato) {
      const c = PERFIL.contato; const l = [];
      if (c.email) l.push(`<a class="ap-btn prim" href="mailto:${esc(c.email)}">E-mail</a>`);
      if (c.linkedin) l.push(`<a class="ap-btn" href="${esc(c.linkedin)}" target="_blank" rel="noopener">LinkedIn ↗</a>`);
      if (c.github) l.push(`<a class="ap-btn" href="${esc(c.github)}" target="_blank" rel="noopener">GitHub ↗</a>`);
      h += `<div class="ap-acoes">${l.join('')}</div>`;
    }
    const ant = SECOES[i - 1], prox = SECOES[i + 1];
    h += `<nav class="ap-passo">${ant ? `<button data-ir="${i - 1}">← ${esc(ant.menu)}</button>` : '<span></span>'}${prox ? `<button class="prim" data-ir="${i + 1}">${esc(prox.menu)} →</button>` : `<button data-ir="0">Voltar ao início</button>`}</nav>`;
    ui.corpo.innerHTML = h; ui.corpo.scrollTop = 0;
  }

  function ir(i, instantaneo = false) {
    i = (i + SECOES.length) % SECOES.length; atual = i; const s = SECOES[i];
    ui.nav.querySelectorAll('button[data-sec]').forEach((b) => { const on = Number(b.dataset.sec) === i; b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'page' : 'false'); });
    const heroi = s.vista === 'heroi';
    ui.heroi.classList.toggle('hide', !heroi); ui.raiz.classList.toggle('com-heroi', heroi); ui.painel.classList.toggle('hide', heroi);
    if (!heroi) { render(i); ui.painel.classList.remove('entra'); void ui.painel.offsetWidth; ui.painel.classList.add('entra'); }
    ui.indice.textContent = `${String(i + 1).padStart(2, '0')} / ${String(SECOES.length).padStart(2, '0')}`;
    ui.raiz.classList.remove('menu-aberto'); ui.menuBtn.setAttribute('aria-expanded', 'false');
    portaisPara(s); voar(s, instantaneo); recalcDesloc();
    history.replaceState(null, '', `#${s.id}`);
    onSom?.(i);
  }

  /* ---------------- o painel ocupa um lado: a cena se desloca para o outro ---------------- */
  function recalcDesloc() {
    const heroi = SECOES[atual].vista === 'heroi';
    if (movel()) deslocAlvo = { x: 0, y: heroi ? 0 : Math.min(innerHeight * 0.26, 260) };
    else deslocAlvo = { x: heroi ? -innerWidth * 0.12 : Math.min(250, innerWidth * 0.17), y: 0 };
  }
  addEventListener('resize', () => { if (ativo) recalcDesloc(); });

  /* ---------------- montagem da interface ---------------- */
  $('ap-nome').textContent = PERFIL.nome; $('ap-papel').textContent = PERFIL.papel;
  $('ap-h1').textContent = PERFIL.nome; $('ap-sub').textContent = PERFIL.papel; $('ap-resumo').textContent = PERFIL.resumo;
  ui.nav.innerHTML = SECOES.map((s, i) => `<button type="button" data-sec="${i}">${esc(s.menu)}</button>`).join('') +
    '<button type="button" class="ap-explorar" data-explorar>Explorar em 3D</button>' +
    '<button type="button" class="ap-explorar ap-site" data-site title="Voltar ao portfólio, sem o cenário 3D">← Portfólio</button>';
  $('ap-pilares').innerHTML = SECOES[0].pilares.map(([id, nome]) => `<button type="button" data-id="${id}">${esc(nome)}</button>`).join('');
  const porId = (id) => SECOES.findIndex((s) => s.id === id);
  ui.nav.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-explorar')) { onExplorar(); return; }
    if (b.hasAttribute('data-site')) { window.__sairArquivo?.(); return; }
    ir(Number(b.dataset.sec));
  });
  $('ap-pilares').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) ir(porId(b.dataset.id)); });
  $('ap-comecar').addEventListener('click', () => ir(1));
  $('ap-explorar2').addEventListener('click', () => onExplorar());
  ui.corpo.addEventListener('click', (e) => { const b = e.target.closest('button[data-ir]'); if (b) ir(Number(b.dataset.ir)); });
  $('ap-fechar').addEventListener('click', () => ir(0));
  ui.menuBtn.addEventListener('click', () => { const on = !ui.raiz.classList.contains('menu-aberto'); ui.raiz.classList.toggle('menu-aberto', on); ui.menuBtn.setAttribute('aria-expanded', String(on)); });
  $('ap-marca').addEventListener('click', () => ir(0));
  addEventListener('keydown', (e) => {
    if (!ativo || e.target.closest?.('input,textarea')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); ir(atual + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); ir(atual - 1); }
    if (e.key === 'Escape') ir(0);
  });
  // gesto: arrastar na cena troca de seção no toque
  let tx = null;
  addEventListener('touchstart', (e) => { if (ativo && e.target.tagName === 'CANVAS') tx = e.touches[0].clientX; }, { passive: true });
  addEventListener('touchend', (e) => { if (tx === null) return; const dx = e.changedTouches[0].clientX - tx; tx = null; if (Math.abs(dx) > 60) ir(atual + (dx < 0 ? 1 : -1)); });

  return {
    get ativo() { return ativo; },
    entrar() {
      ativo = true; ui.raiz.classList.remove('hide'); document.body.classList.add('modo-apres');
      const h = location.hash.slice(1); const i = porId(h);
      cam.pos.copy(camera.position); cam.look.copy(camera.getWorldDirection(V3()).multiplyScalar(10).add(camera.position));
      cam.vPos.set(0, 0, 0); cam.vLook.set(0, 0, 0); fovAlvo = camera.fov; rig.ok = false; lastYaw = null;
      ir(i >= 0 ? i : atual, !camera.userData.veio);   // na primeira entrada a câmera já nasce no lugar
      camera.userData.veio = true;
    },
    sair() {
      ativo = false; ui.raiz.classList.add('hide'); document.body.classList.remove('modo-apres');
      camera.clearViewOffset(); desloc = { x: 0, y: 0 };
      for (const p of districts.portals) p.alvoAberto = undefined;
    },
    update(dt, t) {
      if (!ativo) return;
      dt = Math.max(dt, 1e-4);
      prev.pos.copy(cam.pos); prev.look.copy(cam.look);
      const abertura = anim ? anim(dt) || 0 : 0;
      // velocity of the ideal shot (used to hand over to the next flight without a jolt)
      if (anim) { cam.vPos.subVectors(cam.pos, prev.pos).divideScalar(dt); cam.vLook.subVectors(cam.look, prev.look).divideScalar(dt); }
      idle += dt;
      const k = reducedMotion ? 0 : 1;

      // --- ideal shot + life: slow push-in when idle, layered breathing, mouse parallax ---
      fwd.subVectors(cam.look, cam.pos).normalize();
      right.crossVectors(fwd, UP).normalize();
      const up = tmpV.crossVectors(right, fwd);
      const push = (anim ? 0 : 1) * (1 - Math.exp(-idle / 7)) * 0.9 * k;   // up to ~0.9 m in ~15 s, like a dolly
      mouse.sx = damp(mouse.sx, mouse.x, 2.2, dt); mouse.sy = damp(mouse.sy, mouse.y, 2.2, dt);
      const bx = (Math.sin(t * 0.21) * 0.6 + Math.sin(t * 0.47 + 1.3) * 0.25) * 0.28 * k;
      const by = (Math.sin(t * 0.33 + 0.7) * 0.6 + Math.sin(t * 0.61) * 0.2) * 0.16 * k;
      const alvoPos = V3().copy(cam.pos).addScaledVector(fwd, push)
        .addScaledVector(right, bx + mouse.sx * 0.55 * k).addScaledVector(up, by - mouse.sy * 0.3 * k);
      const alvoLook = V3().copy(cam.look).addScaledVector(right, mouse.sx * 0.9 * k).addScaledVector(up, -mouse.sy * 0.5 * k);
      tmpM.lookAt(alvoPos, alvoLook, UP); tmpQ.setFromRotationMatrix(tmpM);

      // --- banking: leans a little into the turn, like a camera on a crane ---
      const yaw = Math.atan2(fwd.x, fwd.z);
      let yawRate = 0;
      if (lastYaw !== null) { let d = yaw - lastYaw; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; yawRate = d / dt; }
      lastYaw = yaw;
      rig.roll = damp(rig.roll, THREE.MathUtils.clamp(-yawRate * 0.05, -0.05, 0.05) * k, 3, dt);
      tmpQ.multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), rig.roll));

      // --- rendered rig follows the ideal with damping: absorbs any kink (clicks mid-flight, resize) ---
      if (!rig.ok || reducedMotion) { rig.pos.copy(alvoPos); rig.quat.copy(tmpQ); rig.fov = fovAlvo; rig.ok = true; }
      else {
        const a = 1 - Math.exp(-9 * dt);
        rig.pos.lerp(alvoPos, a); rig.quat.slerp(tmpQ, 1 - Math.exp(-7 * dt));
        rig.fov = damp(rig.fov, fovAlvo + abertura * k, 6, dt);
      }
      camera.position.copy(rig.pos); camera.quaternion.copy(rig.quat);
      if (Math.abs(camera.fov - rig.fov) > 1e-3) { camera.fov = rig.fov; camera.updateProjectionMatrix(); }
      // portais abrem/fecham suavemente
      for (const p of districts.portals) if (p.alvoAberto !== undefined) p.open += (p.alvoAberto - p.open) * Math.min(1, dt * 2.2);
      desloc.x += (deslocAlvo.x - desloc.x) * Math.min(1, dt * 4); desloc.y += (deslocAlvo.y - desloc.y) * Math.min(1, dt * 4);
      if (Math.abs(desloc.x) + Math.abs(desloc.y) > 0.5) camera.setViewOffset(innerWidth, innerHeight, desloc.x, desloc.y, innerWidth, innerHeight);
      else camera.clearViewOffset();
    },
  };
}
