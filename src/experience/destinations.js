import * as THREE from 'three';
import { mat, glow, rockMaterial, displace, makeCanvas, plateMaterial, triMaterial } from './materials.js';
import { Batch, V3, collBox, rand, stair } from './util.js';
import { softTexture } from './hall.js';

/*
 * Cada destino: chegada em (0,0,6) olhando para -Z, portal de retorno atrás (z = 10),
 * ponto focal por volta de z = -16, raio caminhável ~22 m.
 */

const RAD = 24;

function base(d, { cave = true, floorMat, skyTop = 0x0b1a2a, skyBot = 0x02050a, fog = 0x05090e, fogD = 0.022, rockTint = 0xffffff } = {}) {
  const root = new THREE.Group(); root.name = `District_${String(d.id).padStart(2, '0')}`;
  const colliders = new THREE.Group(); const b = new Batch(); const updaters = []; const rr = rand(d.id * 7919);
  // chão
  const fl = new THREE.Mesh(new THREE.CircleGeometry(RAD + 6, 64), floorMat || rockMaterial({ wetLevel: -3, scale: 0.3, tint: rockTint })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; root.add(fl);
  collBox(colliders, 80, 0.4, 80, V3(0, -0.2, 0));
  // limite circular (paredes de colisão)
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; collBox(colliders, 7, 6, 0.5, V3(Math.cos(a) * RAD, 3, Math.sin(a) * RAD), [0, -a + Math.PI / 2, 0]); }
  if (cave) {
    let g = new THREE.SphereGeometry(RAD + 8, 96, 48, 0, Math.PI * 2, 0, Math.PI * 0.55); g.scale(1, 0.7, 1);
    g = displace(g, { scale: 0.12, amp: 2.2, seed: d.id * 3, ridge: 0.5 });
    const dome = new THREE.Mesh(g, rockMaterial({ wetLevel: -3, scale: 0.15, tint: rockTint })); dome.material.side = THREE.BackSide; root.add(dome);
  } else {
    const sky = new THREE.Mesh(new THREE.SphereGeometry(120, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, uniforms: { a: { value: new THREE.Color(skyTop) }, b: { value: new THREE.Color(skyBot) } },
      vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
      fragmentShader: 'varying vec3 vP; uniform vec3 a; uniform vec3 b; void main(){ float h=normalize(vP).y; gl_FragColor=vec4(mix(b,a,smoothstep(-0.05,0.6,h)),1.0);} ',
    }));
    root.add(sky);
    // horizonte de rochas/colinas
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; let g = new THREE.IcosahedronGeometry(1, 3); g = displace(g, { scale: 1, amp: 0.3, seed: i }); const m = new THREE.Mesh(g, rockMaterial({ scale: 0.2, wetLevel: -5 })); m.position.set(Math.cos(a) * (RAD + 14), -2, Math.sin(a) * (RAD + 14)); m.scale.set(9 + rr() * 8, 6 + rr() * 9, 9); root.add(m); }
  }
  const tint = new THREE.Color(d.color);
  root.add(new THREE.HemisphereLight(tint.clone().lerp(new THREE.Color(skyTop), 0.5).multiplyScalar(0.8), 0x0a0a0a, d.id === 1 ? 0.5 : cave ? 1.1 : 0.7));
  // preenchimento na cor do distrito: o ambiente lê sem estourar
  const fillL = new THREE.PointLight(d.color, d.id === 1 ? 0 : 80, 70, 1.2); fillL.position.set(0, 12, -6); root.add(fillL);
  const key = new THREE.SpotLight(tint.clone().lerp(new THREE.Color(0xffffff), 0.6), d.id === 1 || !cave ? 0 : 420, 80, 0.8, 0.7, 1.2); key.position.set(-8, 16, 10); key.target.position.set(0, 2, -16); root.add(key, key.target);
  // portal de retorno
  const ret = new THREE.Group(); ret.position.set(0, 0, 10); root.add(ret);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.22, 10, 48, Math.PI), mat.darkMetal); arch.position.y = 2; ret.add(arch);
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.44, 2, 0.44), mat.darkMetal); c.position.set(s * 2.2, 1, 0); ret.add(c); }
  const veil = new THREE.Mesh(new THREE.CircleGeometry(2.1, 48), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { t: { value: 0 }, c: { value: new THREE.Color(0x1ec8ff) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
    fragmentShader: 'varying vec2 vUv; uniform float t; uniform vec3 c; void main(){ vec2 p=vUv-0.5; float r=length(p); float a=atan(p.y,p.x); float s=sin(a*4.0+r*20.0-t*3.0)*0.5+0.5; gl_FragColor=vec4(c*(0.6+s)*2.0*smoothstep(0.5,0.0,r), smoothstep(0.5,0.1,r)*0.8);} ',
  }));
  veil.position.y = 2; veil.scale.y = 1; ret.add(veil);
  const vb = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2), veil.material); vb.position.y = 1; ret.add(vb);
  collBox(colliders, 5, 4, 0.6, V3(0, 2, 10.4));
  const rl = new THREE.PointLight(0x1ec8ff, 20, 10, 1.6); rl.position.set(0, 2.5, 9); root.add(rl);
  updaters.push((dt, t) => { veil.material.uniforms.t.value = t; });
  return { root, colliders, b, updaters, rr, d, interactables: [{ kind: 'return', label: () => 'E — voltar à Batcaverna', pos: () => V3(0, 0, 9), radius: 2.2 }] };
}

/** Painel do projeto do portfólio (aparece após a interação contextual). */
function projectPanel(ctx, pos, yaw = 0) {
  const { d } = ctx;
  const c = makeCanvas(1024, 640); const g = c.getContext('2d');
  const accent = '#' + new THREE.Color(d.color).getHexString();
  g.fillStyle = 'rgba(4,10,16,0.92)'; g.fillRect(0, 0, 1024, 640);
  g.strokeStyle = accent; g.lineWidth = 6; g.strokeRect(12, 12, 1000, 616);
  g.fillStyle = accent; g.font = 'bold 34px Inter, Arial'; g.fillText(`DISTRITO ${String(d.id).padStart(2, '0')} · ${d.name.toUpperCase()}`, 48, 80);
  g.fillStyle = '#e5edf3'; g.font = 'bold 64px Inter, Arial'; g.fillText(d.project.title, 48, 170);
  g.font = '30px Inter, Arial'; g.fillStyle = '#aebdca';
  const lines = d.project.url ? ['Apresentação do projeto, tecnologias e demonstração.', 'Aperte E para abrir o projeto em nova aba.'] : ['Projeto do portfólio ainda não definido.', 'Configure projectId / projectUrl em src/data.js.'];
  lines.forEach((l, i) => g.fillText(l, 48, 250 + i * 46));
  g.fillStyle = accent; g.font = '26px Inter, Arial'; g.fillText(`Feitiço: ${d.spell}  ·  ${d.theme}`, 48, 560);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 3.25), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide, opacity: 0 }));
  m.position.copy(pos); m.rotation.y = yaw; m.scale.setScalar(0.01); ctx.root.add(m);
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 3.55), glow(d.color, 0.6)); frame.position.z = -0.02; m.add(frame);
  const st = { shown: false, k: 0 };
  ctx.updaters.push((dt, t) => { if (!st.shown) return; st.k = Math.min(1, st.k + dt * 1.5); const e = 1 - Math.pow(1 - st.k, 3); m.scale.setScalar(e); m.material.opacity = e; m.position.y = pos.y + Math.sin(t * 1.2) * 0.05; });
  return { show() { st.shown = true; }, get shown() { return st.shown; }, mesh: m };
}

/** Registra a interação contextual: 1º E executa a ação e revela o painel; depois, abre o projeto (se houver URL). */
function contextual(ctx, pos, radius, action, panelPos, panelYaw = 0) {
  const panel = projectPanel(ctx, panelPos, panelYaw);
  let done = false;
  ctx.interactables.push({
    kind: 'context', pos: () => pos, radius,
    label: () => (!done ? `E — ${ctx.d.interaction.toLowerCase()}` : ctx.d.project.url ? 'E — abrir projeto (nova aba)' : 'Projeto a definir — configure em src/data.js'),
    run: () => {
      if (!done) { done = true; action(); panel.show(); return 'revealed'; }
      if (ctx.d.project.url) { window.open(ctx.d.project.url, '_blank', 'noopener'); return 'opened'; }
      return null;
    },
  });
}

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (a, b, h, s = 16) => new THREE.CylinderGeometry(a, b, h, s);
function addLight(ctx, color, i, dist, pos) { const l = new THREE.PointLight(color, i, dist, 1.5); l.position.copy(pos); ctx.root.add(l); return l; }

const BUILDERS = {
  1(d) { // Luxo — galeria imperial com cristal dourado
    const ctx = base(d, { floorMat: new THREE.MeshStandardMaterial({ color: 0xcfc8bb, roughness: 0.38, metalness: 0.05 }), rockTint: 0xb0a090 });
    const { b, root, rr } = ctx;
    const marble = new THREE.MeshStandardMaterial({ color: 0xd8d2c6, roughness: 0.35 });
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { const z = 4 - i * 5; b.add(cyl(0.6, 0.7, 9, 24), marble, V3(s * 8, 4.5, z)); b.add(cyl(0.9, 0.9, 0.5, 24), mat.gold, V3(s * 8, 9.2, z)); b.add(cyl(0.9, 0.9, 0.5, 24), mat.gold, V3(s * 8, 0.25, z)); }
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const z = 1 - i * 5; b.add(box(1.2, 1.4, 0.8), mat.darkMetal, V3(s * 10.5, 0.7, z)); const v = new THREE.Mesh(box(1, 1, 0.7), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.22, clearcoat: 1 })); v.position.set(s * 10.5, 1.9, z); root.add(v); const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), glow([0x7ad7ff, 0xff7ad9, 0x9cff7a, 0xffd36b][i], 2)); gem.position.set(s * 10.5, 1.9, z); root.add(gem); ctx.updaters.push((dt) => { gem.rotation.y += dt; }); }
    for (let i = 0; i < 3; i++) { const ch = new THREE.Group(); ch.position.set(0, 9, 2 - i * 8); root.add(ch); ch.add(new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.06, 6, 40), mat.gold)); ch.children[0].rotation.x = Math.PI / 2; for (let k = 0; k < 14; k++) { const a = k / 14 * 6.283; const l = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), glow(0xffe2a0, 1.6)); l.position.set(Math.cos(a) * 1.4, 0, Math.sin(a) * 1.4); ch.add(l); } addLight(ctx, 0xffd9a0, 14, 16, ch.position.clone().setY(8)); }
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) b.add(box(1.6, 4, 0.05), new THREE.MeshStandardMaterial({ color: 0x6b1730, roughness: 0.8 }), V3(s * 7, 6, 1.5 - i * 5));
    const crys = new THREE.Mesh(new THREE.OctahedronGeometry(2.2, 0), new THREE.MeshPhysicalMaterial({ color: 0xffe9a8, roughness: 0.05, metalness: 0.3, emissive: 0xc9a050, emissiveIntensity: 0.25 }));
    crys.position.set(0, 3.6, -16); crys.scale.y = 1.6; root.add(crys);
    b.add(cyl(2.2, 2.6, 1, 32), mat.gold, V3(0, 0.5, -16)); collBox(ctx.colliders, 4.4, 4, 4.4, V3(0, 2, -16));
    const cl = addLight(ctx, 0xffe2a0, 25, 18, V3(0, 4, -13));
    let spin = 0.2;
    ctx.updaters.push((dt) => { crys.rotation.y += dt * spin; });
    contextual(ctx, V3(0, 0, -13), 3.2, () => { spin = 2.2; cl.intensity = 70; crys.material.emissiveIntensity = 0.9; setTimeout(() => { spin = 0.5; }, 2500); }, V3(4.2, 3.4, -12), -0.5);
    return ctx;
  },
  2(d) { // Alvenaria — portão colossal da fortaleza
    const ctx = base(d, { rockTint: 0xc8b8a0 }); const { b, root } = ctx;
    const stone = triMaterial({ set: 'old_stone_wall', scale: 0.45, tint: 0xc8c0b4 });
    for (let x = -18; x <= 18; x += 1.6) for (let y = 0; y < 12; y += 1) { if (Math.abs(x) < 3.2 && y < 8) continue; b.add(box(1.55, 0.95, 2.2), stone, V3(x + ((y % 2) * 0.8), y + 0.5, -18), [0, 0, (Math.random() - 0.5) * 0.02]); }
    for (let x = -18; x <= 18; x += 2.4) b.add(box(1.2, 1.2, 2.2), stone, V3(x, 12.6, -18));
    for (const s of [-1, 1]) { b.add(cyl(2.6, 3, 16, 12), stone, V3(s * 6, 8, -17)); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; b.add(box(0.9, 1.1, 0.9), stone, V3(s * 6 + Math.cos(a) * 2.6, 16.5, -17 + Math.sin(a) * 2.6)); } b.add(box(1.8, 6, 0.05), new THREE.MeshStandardMaterial({ color: 0x7a1d1d }), V3(s * 6, 10, -14.2)); }
    collBox(ctx.colliders, 40, 14, 2.4, V3(0, 7, -18));
    const gate = new THREE.Group(); gate.position.set(0, 0, -17.4); root.add(gate);
    for (let i = -5; i <= 5; i++) { const bar = new THREE.Mesh(box(0.14, 8, 0.14), mat.darkMetal); bar.position.set(i * 0.6, 4, 0); gate.add(bar); }
    for (let j = 1; j < 8; j++) { const bar = new THREE.Mesh(box(6.4, 0.14, 0.14), mat.darkMetal); bar.position.set(0, j, 0); gate.add(bar); }
    // mecanismos: catapulta e contrapesos
    for (const s of [-1, 1]) { b.add(box(2.4, 0.4, 3.4), mat.wood, V3(s * 13, 0.6, -6)); const armm = new THREE.Mesh(box(0.25, 5, 0.25), mat.wood); armm.position.set(s * 13, 2.5, -6); armm.rotation.x = -0.6; root.add(armm); b.add(new THREE.SphereGeometry(0.6, 12, 10), stone, V3(s * 15.5, 0.6, -3)); b.add(new THREE.SphereGeometry(0.6, 12, 10), stone, V3(s * 16, 0.6, -4.2)); }
    for (const s of [-1, 1]) { const t = new THREE.Mesh(box(0.25, 0.6, 0.25), glow(0xff9a40, 2.4)); t.position.set(s * 3.6, 5, -16.8); root.add(t); addLight(ctx, 0xff9a40, 35, 14, V3(s * 3.6, 5, -15.5)); }
    const lever = new THREE.Group(); lever.position.set(4.5, 0, -12); root.add(lever); lever.add(new THREE.Mesh(box(0.8, 1, 0.8), mat.darkMetal)); const h = new THREE.Mesh(cyl(0.06, 0.06, 1.4, 8), mat.rail); h.position.y = 1; h.rotation.z = 0.6; lever.add(h);
    let open = 0; let opening = false;
    ctx.updaters.push((dt) => { if (opening) { open = Math.min(1, open + dt * 0.35); gate.position.y = open * 7.5; h.rotation.z = 0.6 - open * 1.2; } });
    contextual(ctx, V3(4.5, 0, -11), 2.6, () => { opening = true; }, V3(-4.5, 3.3, -12), 0.5);
    return ctx;
  },
  3(d) { // Tecnologia — supercomputador cilíndrico
    const ctx = base(d, { floorMat: plateMaterial(8, 0x8fa0b0), rockTint: 0x8090a0 }); const { b, root } = ctx;
    const core = new THREE.Mesh(cyl(2.2, 2.2, 10, 32), mat.darkMetal); core.position.set(0, 5, -16); root.add(core);
    for (let i = 0; i < 24; i++) { const s = new THREE.Mesh(box(0.08, 9, 0.04), glow(0x00b9ed, 1.6)); const a = i / 24 * 6.283; s.position.set(Math.cos(a) * 2.22, 5, -16 + Math.sin(a) * 2.22); s.rotation.y = -a; root.add(s); }
    collBox(ctx.colliders, 5, 10, 5, V3(0, 5, -16));
    const holo = new THREE.Group(); holo.position.set(0, 11.5, -16); root.add(holo);
    const hm = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x76e5f5).multiplyScalar(1.5), wireframe: true, transparent: true, opacity: 0.5, toneMapped: false });
    holo.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 1), hm)); for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(2.4 + i * 0.4, 0.02, 4, 80), hm); r.rotation.x = 1 + i * 0.6; holo.add(r); }
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) { const z = 2 - i * 3.5; b.add(box(1.2, 3, 1.4), mat.darkMetal, V3(s * 11, 1.5, z)); for (let k = 0; k < 10; k++) b.add(box(1.0, 0.03, 0.02), glow(k % 3 ? 0x0a87c4 : 0x2fff9a, 1.6), V3(s * 11 - s * 0.71, 0.3 + k * 0.27, z), [0, Math.PI / 2, 0]); collBox(ctx.colliders, 1.3, 3, 1.5, V3(s * 11, 1.5, z)); }
    const arms = []; for (const s of [-1, 1]) { const a = new THREE.Group(); a.position.set(s * 5, 0, -12); root.add(a); a.add(new THREE.Mesh(cyl(0.5, 0.6, 0.6, 16), mat.graphite)); const j = new THREE.Group(); j.position.y = 0.6; a.add(j); const s1 = new THREE.Mesh(box(0.3, 2.6, 0.3), new THREE.MeshStandardMaterial({ color: 0xe8eef3, roughness: 0.4, metalness: 0.5 })); s1.position.y = 1.3; j.add(s1); const tip = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), glow(0x00b9ed, 3)); tip.position.y = 2.6; j.add(tip); arms.push(j); }
    // circuito no piso
    for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283; const len = 6 + (i % 4) * 2; b.add(box(0.06, 0.02, len), glow(0x00b9ed, 1.2), V3(Math.cos(a) * (3 + len / 2), 0.02, -16 + Math.sin(a) * (3 + len / 2)), [0, -a + Math.PI / 2, 0]); }
    const l = addLight(ctx, 0x00b9ed, 60, 24, V3(0, 6, -12)); let boost = 0;
    ctx.updaters.push((dt, t) => { holo.rotation.y += dt * (0.3 + boost * 2); arms.forEach((j, i) => { j.rotation.z = Math.sin(t * 0.8 + i * 2) * 0.6; }); l.intensity = 60 + boost * 160; boost = Math.max(0, boost - dt * 0.15); });
    contextual(ctx, V3(0, 0, -12.5), 3, () => { boost = 1; }, V3(0, 3.6, -11.5), 0);
    return ctx;
  },
  4(d) { // Pesca — porto subterrâneo com embarcação
    const ctx = base(d, { rockTint: 0x90a8b0 }); const { b, root } = ctx;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshStandardMaterial({ color: 0x03222c, roughness: 0.04, metalness: 0.6, emissive: 0x021820 })); water.rotation.x = -Math.PI / 2; water.position.set(0, 0.04, -20); root.add(water);
    // borda da água: bloqueia tudo menos a entrada do píer (x de -4,5 a -1,5)
    collBox(ctx.colliders, 25.5, 4, 1, V3(-17.25, 2, -6.6)); collBox(ctx.colliders, 31.5, 4, 1, V3(14.25, 2, -6.6));
    for (let x = -14; x <= 14; x += 1.1) b.add(box(1, 0.15, 6), mat.wood, V3(x, 0.0, -3));
    for (let x = -14; x <= 14; x += 3) for (const z of [-0.2, -5.8]) b.add(cyl(0.18, 0.18, 2.4, 8), mat.woodDark, V3(x, -0.4, z));
    b.add(box(3, 0.15, 10), mat.wood, V3(-3, 0.0, -11));
    collBox(ctx.colliders, 0.3, 2, 10, V3(-4.65, 1, -11)); collBox(ctx.colliders, 0.3, 2, 10, V3(-1.35, 1, -11)); collBox(ctx.colliders, 3.4, 2, 0.3, V3(-3, 1, -16.2));
    const boat = new THREE.Group(); boat.position.set(3, 0.1, -13); root.add(boat);
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 0.9, 8, 16, 1, false, 0, Math.PI), mat.wood); hull.rotation.set(Math.PI / 2, 0, Math.PI); boat.add(hull);
    const mast = new THREE.Mesh(cyl(0.1, 0.12, 7, 8), mat.woodDark); mast.position.y = 3.5; boat.add(mast);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(3, 4.5), new THREE.MeshStandardMaterial({ color: 0x7a705c, side: THREE.DoubleSide, roughness: 0.95 })); sail.position.set(0, 4, 0.1); sail.rotation.y = Math.PI / 2; boat.add(sail);
    const netMat = new THREE.LineBasicMaterial({ color: 0xc8b48a }); const pts = [];
    for (let i = 0; i < 10; i++) for (let j = 0; j < 8; j++) { const x = 8 + i * 0.3, y = 3 - j * 0.35 - Math.sin(i / 9 * Math.PI) * 0.4; pts.push(V3(x, y, -1), V3(x + 0.3, y - 0.15, -1), V3(x, y, -1), V3(x, y - 0.35, -1)); }
    root.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), netMat));
    for (let i = 0; i < 8; i++) b.add(new THREE.SphereGeometry(0.25, 10, 8), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xe8e2d2 : 0xc94a3a }), V3(-10 + i * 0.7, 0.3, -6.3));
    for (let i = 0; i < 6; i++) b.add(box(1, 0.8, 1), mat.wood, V3(-12 + (i % 3) * 1.05, 0.9 + Math.floor(i / 3) * 0.82, -2));
    // farol
    const tower = new THREE.Mesh(cyl(0.7, 1, 6, 16), new THREE.MeshStandardMaterial({ color: 0x8a857a, roughness: 0.8 })); tower.position.set(-6, 3, -14); root.add(tower);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), glow(0xfff2c0, 0.4)); lamp.position.set(-6, 6.5, -14); root.add(lamp);
    const beam = new THREE.SpotLight(0xfff2c0, 0, 50, 0.3, 0.5, 1.2); beam.position.copy(lamp.position); root.add(beam, beam.target);
    addLight(ctx, 0x4fd1c5, 40, 26, V3(0, 6, -10));
    let on = false;
    ctx.updaters.push((dt, t) => { boat.position.y = 0.1 + Math.sin(t) * 0.08; boat.rotation.z = Math.sin(t * 0.8) * 0.03; if (on) { beam.target.position.set(-6 + Math.cos(t * 0.6) * 20, 0, -14 + Math.sin(t * 0.6) * 12); } });
    contextual(ctx, V3(-3, 0, -14.5), 2.6, () => { on = true; beam.intensity = 900; lamp.material.color.setHex(0xfff2c0).multiplyScalar(4); water.material.emissive.setHex(0x0a5a6a); }, V3(2.5, 3.2, -9), -0.3);
    return ctx;
  },
  5(d) { // Energia — gerador com núcleo suspenso
    const ctx = base(d, { floorMat: plateMaterial(8, 0x707a88) }); const { b, root } = ctx;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.8, 16, 64), mat.graphite); ring.position.set(0, 7, -16); root.add(ring);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 3), glow(0x8090ff, 1.2)); core.position.copy(ring.position); root.add(core);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; b.add(cyl(0.3, 0.3, 4, 8), mat.rail, V3(Math.cos(a) * 3.3, 7 + Math.sin(a) * 3.3, -16), [0, 0, a + Math.PI / 2]); }
    b.add(box(3, 1.5, 3), mat.darkMetal, V3(0, 0.75, -16)); b.add(cyl(0.6, 0.8, 5, 12), mat.darkMetal, V3(0, 3, -16)); collBox(ctx.colliders, 3, 4, 3, V3(0, 2, -16));
    const fans = []; for (const s of [-1, 1]) for (let i = 0; i < 2; i++) { const g = new THREE.Group(); g.position.set(s * 11, 3, -4 - i * 7); root.add(g); g.add(new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.3, 10, 32), mat.graphite)); for (let k = 0; k < 7; k++) { const bl = new THREE.Mesh(box(0.4, 2.1, 0.05), mat.rail); bl.rotation.z = k / 7 * 6.283; bl.position.set(Math.sin(k / 7 * 6.283) * 1.05, Math.cos(k / 7 * 6.283) * 1.05, 0); bl.rotation.y = 0.4; g.add(bl); } g.rotation.y = Math.PI / 2; fans.push(g); collBox(ctx.colliders, 1.2, 6, 5.4, g.position); }
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { b.add(box(1.6, 2.4, 1.6), mat.darkMetal, V3(s * 6, 1.2, 2 - i * 3)); for (let k = 0; k < 3; k++) b.add(cyl(0.16, 0.2, 0.25, 10), new THREE.MeshStandardMaterial({ color: 0xd8dce0, roughness: 0.3 }), V3(s * 6, 2.55 + k * 0.25, 2 - i * 3)); }
    const conds = []; for (let i = 0; i < 3; i++) { const a = -0.6 + i * 0.6; const p = V3(Math.sin(a) * 9, 0, -16 + Math.cos(a) * 9); const c = new THREE.Mesh(cyl(0.3, 0.4, 2.4, 12), mat.darkMetal); c.position.copy(p).setY(1.2); root.add(c); const top = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), glow(0x6c7bff, 0.6)); top.position.copy(p).setY(2.6); root.add(top); conds.push(top); }
    const boltM = new THREE.LineBasicMaterial({ color: new THREE.Color(0xc8d0ff).multiplyScalar(3), toneMapped: false }); const bolts = conds.map(() => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 10 }, () => V3())), boltM); l.visible = false; root.add(l); return l; });
    const l = addLight(ctx, 0x6c7bff, 60, 28, V3(0, 7, -12)); let powered = 0;
    ctx.updaters.push((dt, t) => {
      fans.forEach((f) => { f.children.forEach((c, i) => { if (i) { c.position.set(Math.sin(c.rotation.z + t * 3) * 1.05, Math.cos(c.rotation.z + t * 3) * 1.05, 0); } }); });
      core.rotation.y += dt * (0.4 + powered * 3); core.scale.setScalar(1 + Math.sin(t * 6) * 0.03 * (1 + powered * 3)); ring.rotation.z += dt * powered * 0.5;
      l.intensity = 60 + powered * 200;
      bolts.forEach((bl, i) => { if (!bl.visible) return; const p = bl.geometry.attributes.position; const a = conds[i].position, c = core.position; for (let k = 0; k < 10; k++) { const u = k / 9; p.setXYZ(k, a.x + (c.x - a.x) * u + (Math.random() - 0.5) * 0.5 * Math.sin(u * Math.PI), a.y + (c.y - a.y) * u + (Math.random() - 0.5) * 0.5 * Math.sin(u * Math.PI), a.z + (c.z - a.z) * u); } p.needsUpdate = true; });
    });
    contextual(ctx, V3(0, 0, -8.5), 3, () => { let i = 0; const step = () => { if (i < 3) { conds[i].material.color.setHex(0xc8d0ff).multiplyScalar(4); bolts[i].visible = true; i++; setTimeout(step, 500); } else powered = 1; }; step(); }, V3(-5, 3.4, -9), 0.5);
    return ctx;
  },
  6(d) { // Transporte — estação com locomotiva
    const ctx = base(d, { floorMat: plateMaterial(8, 0x6a6f74) }); const { b, root } = ctx;
    b.add(box(30, 1, 6), new THREE.MeshStandardMaterial({ color: 0x55595e, roughness: 0.9 }), V3(0, 0.5, -3)); collBox(ctx.colliders, 30, 1, 6, V3(0, 0.5, -3));
    b.add(box(30, 0.05, 0.3), glow(0xf5b642, 1.2), V3(0, 1.03, -5.85));
    stair({ batch: b, colliders: ctx.colliders, start: V3(0, 0, 1.75), yaw: Math.PI, rise: 1, width: 6 });
    collBox(ctx.colliders, 30, 3, 0.4, V3(0, 2.5, -6.2));
    for (const z of [-8, -9.5, -13, -14.5]) b.add(box(46, 0.12, 0.1), mat.rail, V3(0, 0.06, z));
    for (let x = -23; x < 23; x += 0.8) { b.add(box(0.25, 0.08, 2.3), mat.woodDark, V3(x, 0.02, -8.75)); b.add(box(0.25, 0.08, 2.3), mat.woodDark, V3(x, 0.02, -13.75)); }
    const loco = new THREE.Group(); loco.position.set(-3, 0, -8.75); root.add(loco);
    const lb = new THREE.Mesh(box(10, 3.2, 2.8), new THREE.MeshStandardMaterial({ color: 0x3a3f2a, roughness: 0.5, metalness: 0.7 })); lb.position.y = 2; loco.add(lb);
    const boiler = new THREE.Mesh(cyl(1.3, 1.3, 6, 20), mat.darkMetal); boiler.rotation.z = Math.PI / 2; boiler.position.set(1.5, 2.4, 0); loco.add(boiler);
    const stack = new THREE.Mesh(cyl(0.4, 0.5, 1.6, 12), mat.darkMetal); stack.position.set(3.6, 4.2, 0); loco.add(stack);
    for (let i = 0; i < 5; i++) for (const s of [-1, 1]) { const w = new THREE.Mesh(cyl(0.55, 0.55, 0.2, 18), mat.rail); w.rotation.x = Math.PI / 2; w.position.set(-3.6 + i * 1.8, 0.55, s * 1.45); loco.add(w); }
    const head = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16), glow(0xfff2c0, 0.6)); head.position.set(5.01, 2.6, 0); head.rotation.y = Math.PI / 2; loco.add(head);
    b.add(box(30, 0.3, 7), mat.graphite, V3(0, 7.5, -3)); for (let x = -14; x <= 14; x += 4) b.add(cyl(0.2, 0.2, 7, 10), mat.graphite, V3(x, 4, -0.2));
    const clock = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), new THREE.MeshBasicMaterial({ color: 0xf0e8d0 })); clock.position.set(0, 6.2, 0.1); root.add(clock);
    const hand = new THREE.Mesh(box(0.06, 0.7, 0.02), mat.matteBlack); hand.position.set(0, 6.2, 0.13); root.add(hand);
    for (const s of [-1, 1]) { const sig = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), glow(0xff3b3b, 2.5)); sig.position.set(s * 13, 4, -6.5); root.add(sig); b.add(cyl(0.08, 0.08, 4, 8), mat.rail, V3(s * 13, 2, -6.5)); }
    for (let i = 0; i < 3; i++) b.add(box(1.4, 1.2, 1.4), new THREE.MeshStandardMaterial({ color: 0xa06a20 }), V3(9 + i * 1.5, 1.6, -1));
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), glow(0xf5b642, 0.5)); board.position.set(-8, 2.4, -0.2); root.add(board);
    addLight(ctx, 0xf5b642, 60, 30, V3(0, 6.5, -3)); let go = false;
    ctx.updaters.push((dt, t) => { hand.rotation.z = -t * 0.5; if (go) { loco.position.x += dt * 4; if (loco.position.x > 30) loco.position.x = -30; stack.scale.y = 1 + Math.sin(t * 10) * 0.05; } });
    contextual(ctx, V3(-8, 1, -1.2), 2.4, () => { go = true; head.material.color.setHex(0xfff2c0).multiplyScalar(4); board.material.color.setHex(0xffd27a).multiplyScalar(2); }, V3(-3, 4.2, -3.2), 0);
    return ctx;
  },
  7(d) { // Madeira — serraria com roda dentada
    const ctx = base(d, { cave: false, skyTop: 0x1d3a2a, skyBot: 0x0a1208, floorMat: new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 1 }) }); const { b, root, rr } = ctx;
    const trunk = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.95 }); const leaf = new THREE.MeshStandardMaterial({ color: 0x1f4a24, roughness: 0.9 });
    for (let i = 0; i < 26; i++) { const a = rr() * 6.283, r = 14 + rr() * 9; const x = Math.cos(a) * r, z = Math.sin(a) * r; if (z > 6) continue; const h = 8 + rr() * 6; b.add(cyl(0.4, 0.6, h, 10), trunk, V3(x, h / 2, z)); b.add(new THREE.ConeGeometry(2.6, h * 0.8, 9), leaf, V3(x, h * 0.95, z)); b.add(new THREE.ConeGeometry(2, h * 0.6, 9), leaf, V3(x, h * 1.25, z)); }
    b.add(box(14, 0.4, 10), mat.wood, V3(0, 0.2, -15)); for (const [x, z] of [[-6.5, -10.5], [6.5, -10.5], [-6.5, -19.5], [6.5, -19.5]]) b.add(box(0.5, 8, 0.5), mat.wood, V3(x, 4, z));
    b.add(box(15, 0.3, 11), mat.woodDark, V3(0, 8.2, -15), [0, 0, 0.05]);
    const wheel = new THREE.Group(); wheel.position.set(-7.6, 4, -15); root.add(wheel);
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.3, 8, 40), mat.wood)); for (let i = 0; i < 8; i++) { const s = new THREE.Mesh(box(0.25, 6.6, 0.25), mat.wood); s.rotation.z = i / 8 * Math.PI; wheel.add(s); } for (let i = 0; i < 24; i++) { const tth = new THREE.Mesh(box(0.4, 0.5, 0.5), mat.woodDark); const a = i / 24 * 6.283; tth.position.set(Math.cos(a) * 3.75, Math.sin(a) * 3.75, 0); tth.rotation.z = a; wheel.add(tth); }
    wheel.rotation.y = Math.PI / 2;
    const saw = new THREE.Mesh(cyl(1.4, 1.4, 0.05, 40), mat.rail); saw.rotation.x = Math.PI / 2; saw.position.set(0, 1.8, -14); root.add(saw);
    b.add(box(1.2, 1.2, 8), mat.darkMetal, V3(0, 0.9, -14)); collBox(ctx.colliders, 1.4, 2, 8, V3(0, 1, -14));
    const log = new THREE.Mesh(cyl(0.45, 0.45, 6, 14), mat.wood); log.rotation.x = Math.PI / 2; log.position.set(0, 1.95, -10); root.add(log);
    for (let r = 0; r < 4; r++) for (let i = 0; i < 6 - r; i++) b.add(cyl(0.4, 0.4, 5, 12), mat.wood, V3(9 + i * 0.8 + r * 0.4, 0.4 + r * 0.7, -6), [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 10; i++) { const root2 = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(-12 + i * 2.5, 0, -20), V3(-11 + i * 2.5, 1, -18), V3(-12 + i * 2.5 + rr(), 0.1, -15)]), 12, 0.15, 6); b.add(root2, trunk); }
    const sun = new THREE.DirectionalLight(0xffd8a0, 1.6); sun.position.set(10, 20, 8); root.add(sun);
    addLight(ctx, 0xe0a060, 40, 20, V3(0, 6, -12)); let run = 0;
    const carved = new THREE.Mesh(box(4, 0.1, 2.6), mat.wood); carved.position.set(5, 0.05, -9); carved.rotation.x = 0; root.add(carved);
    ctx.updaters.push((dt) => { wheel.rotation.x += dt * (0.1 + run * 0.6); saw.rotation.y += dt * (0.5 + run * 15); if (run) { log.position.z = Math.max(-18, log.position.z - dt * 1.2); } });
    contextual(ctx, V3(2, 0, -10), 2.8, () => { run = 1; carved.rotation.x = -1.2; carved.position.y = 1.2; }, V3(5, 3.2, -9.8), -0.4);
    return ctx;
  },
  8(d) { // Têxteis — tear gigantesco com pano luminoso
    const ctx = base(d, { floorMat: new THREE.MeshStandardMaterial({ color: 0x2a1f30, roughness: 0.8 }), rockTint: 0xa090b0 }); const { b, root } = ctx;
    for (const x of [-6, 6]) b.add(box(0.6, 10, 0.6), mat.wood, V3(x, 5, -16));
    b.add(cyl(0.4, 0.4, 13, 12), mat.wood, V3(0, 9.6, -16), [0, 0, Math.PI / 2]); b.add(cyl(0.4, 0.4, 13, 12), mat.wood, V3(0, 1.2, -15), [0, 0, Math.PI / 2]);
    collBox(ctx.colliders, 13, 10, 2, V3(0, 5, -16));
    const N = 48; const threads = [];
    for (let i = 0; i < N; i++) { const t = new THREE.Mesh(box(0.02, 8.2, 0.02), glow(0xd9a4ff, 1.2)); t.position.set(-5.6 + i * (11.2 / (N - 1)), 5.4, -16); root.add(t); threads.push(t); }
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(11.2, 1, 40, 4), new THREE.ShaderMaterial({ transparent: true, side: THREE.DoubleSide, uniforms: { t: { value: 0 }, h: { value: 0.05 } }, vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} ', fragmentShader: 'varying vec2 vUv; uniform float t; void main(){ float w = step(0.5, fract(vUv.x*48.0)) ; float s = sin(vUv.x*30.0+vUv.y*12.0 - t*2.0)*0.5+0.5; vec3 c = mix(vec3(0.6,0.2,0.9), vec3(1.0,0.5,0.85), s); gl_FragColor=vec4(c*(0.8+w*0.3), 0.92);} ' }));
    cloth.position.set(0, 1.7, -15.9); root.add(cloth);
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) b.add(cyl(0.5, 0.5, 2.4, 16), new THREE.MeshStandardMaterial({ color: [0x6b2fa3, 0xd16ba5, 0x3a86ff, 0xe8d0a0][i], roughness: 0.8 }), V3(s * 10, 0.5 + (i % 2) * 1, -4 - i * 2.5), [Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const m = new THREE.Group(); m.position.set(s * 6, 0, 2 - i * 4); root.add(m); m.add(Object.assign(new THREE.Mesh(box(1.4, 1, 0.8), mat.darkMetal))); m.children[0].position.y = 0.5; const arm = new THREE.Mesh(box(0.2, 0.2, 0.9), mat.darkMetal); arm.position.set(0, 1.2, 0); m.add(arm); const needle = new THREE.Mesh(box(0.03, 0.4, 0.03), mat.rail); needle.position.set(0, 0.95, 0.35); m.add(needle); ctx.updaters.push((dt, t) => { needle.position.y = 0.95 + Math.sin(t * 18 + i) * 0.08; }); }
    const curtains = []; for (let i = 0; i < 8; i++) { const g = new THREE.PlaneGeometry(2.2, 9, 8, 12); const c = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: [0x6b2fa3, 0x9d4edd, 0xd16ba5, 0x3a86ff][i % 4], side: THREE.DoubleSide, roughness: 0.8 })); const a = -1 + i * 0.28; c.position.set(Math.sin(a) * 19, 6, -6 - Math.cos(a) * 12); c.lookAt(0, 6, 0); root.add(c); c.userData.base = g.attributes.position.array.slice(); curtains.push(c); }
    addLight(ctx, 0xb46cff, 30, 26, V3(0, 6, -11)); let weave = 0.05;
    ctx.updaters.push((dt, t) => { cloth.material.uniforms.t.value = t; threads.forEach((th, i) => { th.position.z = -16 + Math.sin(t * 4 + i * 0.5) * 0.1 * (1 + weave * 10); }); cloth.scale.y = 1 + weave * 5; cloth.position.y = 1.7 + weave * 2.5; if (weave > 0.05 && weave < 1) weave = Math.min(1, weave + dt * 0.2); curtains.forEach((c, i) => { const p = c.geometry.attributes.position, bse = c.userData.base; for (let k = 0; k < p.count; k++) p.setZ(k, Math.sin(bse[k * 3] * 2 + t + i) * 0.2); p.needsUpdate = true; }); });
    contextual(ctx, V3(0, 0, -12.5), 3, () => { weave = 0.06; }, V3(4.6, 3.6, -11.5), -0.3);
    return ctx;
  },
  9(d) { // Grãos — moinho central com silos
    const ctx = base(d, { cave: false, skyTop: 0x3a2a40, skyBot: 0xc07a40, floorMat: new THREE.MeshStandardMaterial({ color: 0x5a4524, roughness: 1 }) }); const { b, root, rr } = ctx;
    const silo = new THREE.MeshStandardMaterial({ color: 0x7c8288, roughness: 0.6, metalness: 0.5, envMapIntensity: 0.4 });
    for (const [x, z, r] of [[-9, -18, 2.4], [-4, -21, 2.8], [9, -18, 2.4], [4, -21, 2.8]]) { b.add(cyl(r, r, 14, 28), silo, V3(x, 7, z)); b.add(new THREE.ConeGeometry(r * 1.05, 2, 28), silo, V3(x, 15, z)); collBox(ctx.colliders, r * 2, 14, r * 2, V3(x, 7, z)); }
    const mill = new THREE.Mesh(cyl(2.2, 3, 12, 12), new THREE.MeshStandardMaterial({ color: 0x9a8a6c, roughness: 0.95 })); mill.position.set(0, 6, -14); root.add(mill); collBox(ctx.colliders, 5, 12, 5, V3(0, 6, -14));
    const cap = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.4, 12), mat.woodDark); cap.position.set(0, 13.2, -14); root.add(cap);
    const blades = new THREE.Group(); blades.position.set(0, 10.5, -11.4); root.add(blades);
    for (let i = 0; i < 4; i++) { const bl = new THREE.Mesh(box(1.3, 7, 0.1), new THREE.MeshStandardMaterial({ color: 0xa89c84, roughness: 0.95 })); bl.position.y = 3.6; const arm = new THREE.Group(); arm.rotation.z = i * Math.PI / 2; arm.add(bl); blades.add(arm); }
    const gear = new THREE.Group(); gear.position.set(3.4, 1.4, -10); root.add(gear); gear.add(new THREE.Mesh(cyl(1.2, 1.2, 0.3, 24), mat.bronze)); for (let i = 0; i < 16; i++) { const tt = new THREE.Mesh(box(0.3, 0.3, 0.3), mat.bronze); const a = i / 16 * 6.283; tt.position.set(Math.cos(a) * 1.3, 0, Math.sin(a) * 1.3); gear.add(tt); } gear.rotation.x = Math.PI / 2;
    const stalkG = new THREE.ConeGeometry(0.03, 1.3, 3); stalkG.translate(0, 0.65, 0);
    const N = 3500; const wheat = new THREE.InstancedMesh(stalkG, new THREE.MeshStandardMaterial({ color: 0xb08a32, roughness: 0.8 }), N);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); let k = 0;
    for (let i = 0; i < N; i++) { const x = (rr() - 0.5) * 44, z = (rr() - 0.5) * 44; if (Math.abs(x) < 4 && z > -12) continue; if (Math.hypot(x, z) > RAD) continue; e.set((rr() - 0.5) * 0.3, rr() * 3, (rr() - 0.5) * 0.3); q.setFromEuler(e); m4.compose(V3(x, 0, z), q, V3(1, 0.7 + rr() * 0.6, 1)); wheat.setMatrixAt(k++, m4); }
    wheat.count = k; root.add(wheat);
    for (let i = 0; i < 10; i++) b.add(new THREE.SphereGeometry(0.5, 10, 8), new THREE.MeshStandardMaterial({ color: 0xc8b080, roughness: 1 }), V3(-6 + (i % 5) * 0.9, 0.4 + Math.floor(i / 5) * 0.7, -6), [0, 0, 0], [1, 0.8, 1.3]);
    b.add(box(1.2, 0.3, 10), mat.darkMetal, V3(-3, 1.6, -12), [0, 0.3, 0]);
    const sun = new THREE.DirectionalLight(0xffb070, 1.1); sun.position.set(-20, 10, -30); root.add(sun);
    addLight(ctx, 0xf0c75a, 15, 22, V3(0, 5, -9)); let turn = 0;
    ctx.updaters.push((dt) => { blades.rotation.z += dt * (0.1 + turn * 1.4); gear.rotation.y += dt * turn * 2; });
    contextual(ctx, V3(3.4, 0, -8.6), 2.6, () => { turn = 1; }, V3(-3.6, 3.4, -8.5), 0.4);
    return ctx;
  },
  10(d) { // Pecuária — estábulo com portão reforçado
    const ctx = base(d, { cave: false, skyTop: 0x2a2440, skyBot: 0x8a5030, floorMat: new THREE.MeshStandardMaterial({ color: 0x4a3a22, roughness: 1 }) }); const { b, root, rr } = ctx;
    const barnW = new THREE.MeshStandardMaterial({ color: 0x7a2e22, roughness: 0.85 });
    b.add(box(14, 7, 10), barnW, V3(0, 3.5, -19)); collBox(ctx.colliders, 14, 7, 10, V3(0, 3.5, -19));
    for (const s of [-1, 1]) b.add(box(8.2, 0.3, 11), mat.woodDark, V3(s * 3.6, 8.8, -19), [0, 0, -s * 0.6]);
    const gate = []; for (const s of [-1, 1]) { const pv = new THREE.Group(); pv.position.set(s * 2.6, 0, -13.9); root.add(pv); const dd = new THREE.Mesh(box(2.6, 4.6, 0.2), mat.wood); dd.position.set(-s * 1.3, 2.3, 0); pv.add(dd); const x = new THREE.Mesh(box(0.2, 5.2, 0.1), mat.woodDark); x.position.set(-s * 1.3, 2.3, 0.12); x.rotation.z = s * 0.55; pv.add(x); for (const y of [0.8, 3.8]) { const st = new THREE.Mesh(box(2.6, 0.18, 0.08), mat.darkMetal); st.position.set(-s * 1.3, y, 0.14); pv.add(st); } gate.push(pv); }
    const inside = addLight(ctx, 0xffc080, 0, 12, V3(0, 3, -17));
    for (let i = 0; i < 18; i++) { const a = 0.4 + i / 17 * (Math.PI - 0.8); const p = V3(Math.cos(a) * 15, 0, -Math.sin(a) * 15 + 4); b.add(box(0.15, 1.3, 0.15), mat.wood, p.clone().setY(0.65)); if (i < 17) { const a2 = 0.4 + (i + 1) / 17 * (Math.PI - 0.8); const p2 = V3(Math.cos(a2) * 15, 0, -Math.sin(a2) * 15 + 4); const mid = p.clone().add(p2).multiplyScalar(0.5); const len = p.distanceTo(p2); for (const y of [0.5, 1.05]) b.add(box(len, 0.1, 0.06), mat.wood, mid.clone().setY(y), [0, -Math.atan2(p2.z - p.z, p2.x - p.x), 0]); } }
    for (let i = 0; i < 8; i++) b.add(cyl(0.6, 0.6, 1.2, 16), new THREE.MeshStandardMaterial({ color: 0xc9a54e, roughness: 1 }), V3(-10 + (i % 4) * 1.3, 0.6 + Math.floor(i / 4) * 1.15, -8), [0, 0, Math.PI / 2]);
    b.add(box(2.4, 0.9, 1.2), mat.woodDark, V3(8, 0.45, -8)); b.add(cyl(0.6, 0.6, 0.3, 14), mat.darkMetal, V3(10, 0.5, -6), [Math.PI / 2, 0, 0]);
    // animais estilizados (silhuetas volumétricas simples)
    for (let i = 0; i < 4; i++) { const c = new THREE.Group(); c.position.set(-6 + i * 4, 0, -4 - (i % 2) * 3); c.rotation.y = rr() * 6; root.add(c); const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.2, 4, 10), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x5a3a22 : 0x2a2a2a, roughness: 0.9 })); body.rotation.z = Math.PI / 2; body.position.y = 1.1; c.add(body); const hd = new THREE.Mesh(box(0.45, 0.45, 0.6), body.material); hd.position.set(1.1, 1.4, 0); c.add(hd); for (const [x, z] of [[-0.6, -0.3], [-0.6, 0.3], [0.6, -0.3], [0.6, 0.3]]) { const lg = new THREE.Mesh(cyl(0.08, 0.08, 0.8, 6), body.material); lg.position.set(x, 0.4, z); c.add(lg); } ctx.updaters.push((dt, t) => { hd.rotation.z = Math.sin(t * 0.7 + i) * 0.2 - 0.2; }); }
    const sun = new THREE.DirectionalLight(0xff9a60, 1.6); sun.position.set(20, 8, -20); root.add(sun);
    addLight(ctx, 0xe8b07a, 40, 22, V3(0, 5, -8)); let open = 0, opening = false;
    ctx.updaters.push((dt) => { if (opening) { open = Math.min(1, open + dt * 0.5); gate[0].rotation.y = -open * 1.6; gate[1].rotation.y = open * 1.6; inside.intensity = open * 80; } });
    contextual(ctx, V3(0, 0, -11.5), 2.8, () => { opening = true; }, V3(5, 3.2, -10.5), -0.4);
    return ctx;
  },
  11(d) { // Agricultura — estufa com árvore bioluminescente
    const ctx = base(d, { floorMat: new THREE.MeshStandardMaterial({ color: 0x1f2a14, roughness: 1 }), rockTint: 0x90b090 }); const { b, root, rr } = ctx;
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xcfe8d8, roughness: 0.05, transmission: 0.0, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false });
    for (let z = -2; z >= -24; z -= 3) b.add(new THREE.TorusGeometry(11, 0.08, 4, 40, Math.PI), mat.rail, V3(0, 0, z));
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 22, 32, 1, true, -Math.PI / 2, Math.PI), glass); dome.rotation.x = Math.PI / 2; dome.rotation.z = Math.PI / 2; dome.position.set(0, 0, -13); root.add(dome);
    const tr = new THREE.MeshStandardMaterial({ color: 0x3a2a3a, roughness: 0.8, emissive: 0x200a30, emissiveIntensity: 0.6 });
    b.add(cyl(0.8, 1.4, 6, 12), tr, V3(0, 3, -16)); collBox(ctx.colliders, 2.6, 6, 2.6, V3(0, 3, -16));
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283; b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(0, 5, -16), V3(Math.cos(a) * 2.4, 7, -16 + Math.sin(a) * 2.4), V3(Math.cos(a) * 4.5, 8.5 + rr(), -16 + Math.sin(a) * 4.5)]), 12, 0.25, 6), tr); b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(0, 0.6, -16), V3(Math.cos(a + 0.4) * 2, 0.2, -16 + Math.sin(a + 0.4) * 2), V3(Math.cos(a + 0.4) * 4, 0.05, -16 + Math.sin(a + 0.4) * 4)]), 10, 0.2, 6), tr); }
    const canopy = []; for (let i = 0; i < 46; i++) { const a = rr() * 6.283, r = rr() * 4.5; const m = new THREE.Mesh(new THREE.SphereGeometry(0.5 + rr() * 0.6, 10, 8), glow(i % 3 ? 0x7bd96a : 0xc77dff, 0.6)); m.position.set(Math.cos(a) * r, 8 + rr() * 2.5, -16 + Math.sin(a) * r); root.add(m); canopy.push(m); }
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) { const z = 2 - i * 4; b.add(box(1.6, 0.25, 2.6), mat.woodDark, V3(s * 7, 3.5, z)); for (let k = 0; k < 6; k++) b.add(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshStandardMaterial({ color: 0x3f8a2a }), V3(s * 7 + (rr() - 0.5) * 1.2, 3.8, z + (rr() - 0.5) * 2)); b.add(cyl(0.03, 0.03, 4, 4), mat.rail, V3(s * 7, 5.6, z)); }
    for (const s of [-1, 1]) { const ch = new THREE.Mesh(new THREE.PlaneGeometry(1, 30), new THREE.MeshStandardMaterial({ color: 0x0a3a40, emissive: 0x06303a, roughness: 0.05, metalness: 0.5 })); ch.rotation.x = -Math.PI / 2; ch.position.set(s * 4, 0.03, -8); root.add(ch); }
    const flowers = []; for (let i = 0; i < 60; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), glow(i % 2 ? 0xff8fd1 : 0xc77dff, 1.8)); f.position.set((rr() - 0.5) * 18, 0.2, -2 - rr() * 20); f.scale.setScalar(0.3); root.add(f); flowers.push(f); }
    const l = addLight(ctx, 0x9cff7a, 40, 24, V3(0, 9, -14)); let bloom = 0, blooming = false;
    ctx.updaters.push((dt, t) => { if (blooming) bloom = Math.min(1, bloom + dt * 0.4); canopy.forEach((c, i) => c.material.color.setHex(i % 3 ? 0x7bd96a : 0xc77dff).multiplyScalar(0.6 + bloom * 2 + Math.sin(t * 2 + i) * 0.15)); flowers.forEach((f, i) => f.scale.setScalar(0.3 + bloom * (1 + Math.sin(t * 3 + i) * 0.2))); l.intensity = 40 + bloom * 140; });
    contextual(ctx, V3(0, 0, -12.6), 2.8, () => { blooming = true; }, V3(4.5, 3.4, -11.5), -0.35);
    return ctx;
  },
  12(d) { // Carvão — mina profunda com elevador e veio
    const ctx = base(d, { rockTint: 0x605858, fog: 0x050403 }); const { b, root, rr } = ctx;
    for (let z = 4; z > -22; z -= 3) { for (const s of [-1, 1]) b.add(box(0.4, 6, 0.4), mat.woodDark, V3(s * 5, 3, z)); b.add(box(10.4, 0.45, 0.45), mat.woodDark, V3(0, 6.1, z)); }
    for (const s of [-1, 1]) collBox(ctx.colliders, 0.6, 6, 30, V3(s * 5.4, 3, -9));
    for (const x of [-0.7, 0.7]) b.add(box(0.08, 0.1, 30), mat.rail, V3(x, 0.05, -8));
    for (let z = 6; z > -23; z -= 0.6) b.add(box(1.9, 0.07, 0.22), mat.woodDark, V3(0, 0.02, z));
    for (let i = 0; i < 3; i++) { const c = new THREE.Group(); c.position.set(0, 0.1, -2 - i * 2.6); root.add(c); const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.6, 0.8, 4), mat.darkMetal); bin.rotation.y = Math.PI / 4; bin.position.y = 0.75; bin.scale.z = 1.5; c.add(bin); for (let k = 0; k < 10; k++) { const co = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.4 })); co.position.set((rr() - 0.5) * 0.9, 1.15, (rr() - 0.5) * 1.3); c.add(co); } }
    // elevador industrial
    const shaft = new THREE.Group(); shaft.position.set(-3, 0, -19); root.add(shaft);
    for (const [x, z] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) { const p = new THREE.Mesh(box(0.25, 14, 0.25), mat.graphite); p.position.set(x, 7, z); shaft.add(p); }
    const wheelTop = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.12, 6, 24), mat.rail); wheelTop.position.set(0, 14.5, 0); shaft.add(wheelTop);
    const cage = new THREE.Mesh(box(2.6, 2.6, 2.6), new THREE.MeshStandardMaterial({ color: 0x3a3a3a, wireframe: true })); cage.position.y = 9; shaft.add(cage);
    collBox(ctx.colliders, 3.4, 14, 3.4, V3(-3, 7, -19));
    // veio de carvão na parede do fundo
    const vein = new THREE.Mesh(displace(new THREE.SphereGeometry(5, 32, 20), { scale: 0.6, amp: 0.8, seed: 3 }), new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.25, metalness: 0.5, emissive: 0xff4a10, emissiveIntensity: 0.0 }));
    vein.position.set(4, 3, -24); vein.scale.set(1.4, 0.8, 0.6); root.add(vein);
    for (let i = 0; i < 14; i++) b.add(new THREE.OctahedronGeometry(0.3 + rr() * 0.3), new THREE.MeshStandardMaterial({ color: 0x8090a0, roughness: 0.2, metalness: 0.9 }), V3(-8 + rr() * 16, 0.3, -12 - rr() * 10));
    const lamps = []; for (let z = 3; z > -22; z -= 6) for (const s of [-1, 1]) { const l = new THREE.Mesh(box(0.25, 0.35, 0.25), glow(0xff9a40, 2.4)); l.position.set(s * 4.7, 4.6, z); root.add(l); lamps.push(l); }
    for (let z = 0; z > -24; z -= 8) addLight(ctx, 0xff9a40, 30, 12, V3(0, 4.5, z));
    const det = new THREE.Group(); det.position.set(3.5, 0, -10); root.add(det); det.add(new THREE.Mesh(box(0.8, 0.6, 0.5), new THREE.MeshStandardMaterial({ color: 0x8a1a1a }))); det.children[0].position.y = 0.3; const plunger = new THREE.Mesh(cyl(0.05, 0.05, 0.8, 8), mat.rail); plunger.position.y = 0.95; det.add(plunger); const hnd = new THREE.Mesh(box(0.6, 0.08, 0.08), mat.rail); hnd.position.y = 1.35; det.add(hnd);
    // poeira
    const N = 500; const pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) pos.set([(rr() - 0.5) * 10, rr() * 6, -rr() * 26 + 4], i * 3);
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dust = new THREE.Points(pg, new THREE.PointsMaterial({ map: softTexture(), color: 0x806a50, size: 0.12, transparent: true, opacity: 0.3, depthWrite: false })); root.add(dust);
    const veinL = addLight(ctx, 0xff5a1a, 0, 26, V3(4, 3, -20)); let blast = -1;
    ctx.updaters.push((dt, t) => { cage.position.y = 7 + Math.sin(t * 0.3) * 5; wheelTop.rotation.z = Math.sin(t * 0.3) * 4; dust.rotation.y = Math.sin(t * 0.05) * 0.1; lamps.forEach((l, i) => l.material.color.setHex(0xff9a40).multiplyScalar(2.2 + Math.sin(t * 9 + i) * 0.2)); if (blast >= 0) { blast += dt; const k = Math.min(1, blast / 1.2); vein.material.emissiveIntensity = k * 1.6 * (1 + Math.sin(t * 8) * 0.1); veinL.intensity = 140 * k; dust.material.opacity = 0.25 + Math.max(0, 0.5 - blast * 0.3); } });
    contextual(ctx, V3(3.5, 0, -8.8), 2.4, () => { blast = 0; hnd.position.y = 1.05; }, V3(-0.5, 3.4, -13), 0.15);
    return ctx;
  },
};

export function buildDestination(d) {
  const ctx = BUILDERS[d.id](d);
  ctx.root.add(ctx.b.build({ castShadow: false }));
  ctx.root.updateMatrixWorld(true); ctx.colliders.updateMatrixWorld(true);
  return {
    root: ctx.root, colliders: ctx.colliders, interactables: ctx.interactables,
    update: (dt, t) => { for (const u of ctx.updaters) u(dt, t); },
    spawn: V3(0, 0, 5), yaw: 0,
    fog: { color: d.id === 9 ? 0x6a4a30 : d.id === 10 ? 0x3a2a2a : d.id === 7 ? 0x0e1a10 : 0x05090e, density: d.id === 9 || d.id === 10 ? 0.012 : 0.024 },
  };
}
