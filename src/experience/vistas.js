/*
 * O que se vê no fundo de cada túnel enquanto ele está barrado: uma janela acesa para o distrito.
 * Pintura procedural 512×512 por tema (silhuetas contra um horizonte na cor do distrito), lida pelo véu.
 */
import * as THREE from 'three';
import { makeCanvas } from './materials.js';
import { rand } from './util.js';

const S = 512, HZ = 330;   // horizonte

const rgb = (n, a = 1, k = 1) => `rgba(${Math.min(255, ((n >> 16) & 255) * k) | 0},${Math.min(255, ((n >> 8) & 255) * k) | 0},${Math.min(255, (n & 255) * k) | 0},${a})`;

function ceuEChao(g, cor) {
  const ceu = g.createLinearGradient(0, 0, 0, HZ);
  ceu.addColorStop(0, '#05070b'); ceu.addColorStop(0.55, rgb(cor, 1, 0.28)); ceu.addColorStop(1, rgb(cor, 1, 0.95));
  g.fillStyle = ceu; g.fillRect(0, 0, S, HZ);
  const chao = g.createLinearGradient(0, HZ, 0, S);
  chao.addColorStop(0, rgb(cor, 1, 0.45)); chao.addColorStop(1, '#040506');
  g.fillStyle = chao; g.fillRect(0, HZ, S, S - HZ);
  // brilho do horizonte
  const sol = g.createRadialGradient(S / 2, HZ, 4, S / 2, HZ, 230);
  sol.addColorStop(0, 'rgba(255,255,255,0.85)'); sol.addColorStop(0.15, rgb(cor, 0.8, 1.3)); sol.addColorStop(1, rgb(cor, 0));
  g.fillStyle = sol; g.fillRect(0, 0, S, S);
}
const sombra = (g) => { g.fillStyle = 'rgba(6,8,12,0.92)'; };
function luzes(g, pts, cor, r = 3) {
  for (const [x, y] of pts) {
    const h = g.createRadialGradient(x, y, 0, x, y, r * 5); h.addColorStop(0, 'rgba(255,240,200,0.9)'); h.addColorStop(1, rgb(cor, 0));
    g.fillStyle = h; g.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);
  }
}
function perspectiva(g, cor) {   // trilhas de chão que fogem para o horizonte
  g.strokeStyle = rgb(cor, 0.25, 1.2); g.lineWidth = 1;
  for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(S / 2 + i * 6, HZ); g.lineTo(S / 2 + i * 90, S); g.stroke(); }
}

const TEMAS = {
  1(g, c, r) {   // Luxo: cristais e um palácio dourado
    sombra(g); g.fillRect(150, 200, 212, 130); for (const x of [150, 206, 262, 318]) { g.fillRect(x, 170, 44, 40); g.beginPath(); g.arc(x + 22, 170, 22, Math.PI, 0); g.fill(); }
    for (let i = 0; i < 14; i++) { const x = r() * S, h = 40 + r() * 140, w = 8 + r() * 18; g.fillStyle = `rgba(220,200,255,${0.25 + r() * 0.4})`; g.beginPath(); g.moveTo(x - w, HZ + 40); g.lineTo(x, HZ + 40 - h); g.lineTo(x + w, HZ + 40); g.fill(); }
    luzes(g, [[184, 260], [240, 250], [296, 250], [340, 262], [256, 190]], c);
  },
  2(g, c) {   // Alvenaria: muralha com torres
    sombra(g); g.fillRect(40, 240, 432, 90);
    for (const [x, w, h] of [[60, 60, 170], [226, 60, 210], [392, 60, 170]]) { g.fillRect(x, HZ - h, w, h); for (let k = 0; k < 4; k++) g.fillRect(x + k * 17, HZ - h - 14, 10, 14); }
    for (let k = 0; k < 24; k++) g.fillRect(40 + k * 18, 228, 10, 12);
    luzes(g, [[90, 210], [256, 170], [422, 210], [150, 290], [360, 290]], c);
  },
  3(g, c) {   // Tecnologia: torres de dados e circuitos
    for (let i = 0; i < 11; i++) { const x = 30 + i * 44, h = 60 + ((i * 53) % 170); sombra(g); g.fillRect(x, HZ - h, 30, h); g.fillStyle = rgb(c, 0.8, 1.4); for (let y = HZ - h + 8; y < HZ - 6; y += 12) g.fillRect(x + 4, y, 22, 2); }
    g.strokeStyle = rgb(c, 0.6, 1.5); g.lineWidth = 2; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(40 + i * 50, S); g.lineTo(40 + i * 50, 420 - i * 6); g.lineTo(S / 2, HZ + 10); g.stroke(); }
  },
  4(g, c) {   // Pesca: porto com mastros e água
    g.fillStyle = rgb(c, 0.5, 0.6); g.fillRect(0, HZ, S, 40);
    sombra(g); g.beginPath(); g.moveTo(140, HZ); g.lineTo(380, HZ); g.lineTo(350, HZ + 30); g.lineTo(170, HZ + 30); g.fill();
    for (const x of [200, 260, 320]) g.fillRect(x, 150, 5, HZ - 150);
    g.strokeStyle = 'rgba(6,8,12,0.9)'; g.lineWidth = 1.5; for (const x of [200, 260, 320]) { g.beginPath(); g.moveTo(x, 150); g.lineTo(x - 50, HZ); g.moveTo(x, 150); g.lineTo(x + 50, HZ); g.stroke(); }
    luzes(g, [[90, HZ - 10], [430, HZ - 12], [262, 150]], c, 4);
  },
  5(g, c) {   // Energia: torres de transmissão e bobinas
    sombra(g); for (const x of [90, 256, 420]) { g.beginPath(); g.moveTo(x - 40, HZ); g.lineTo(x, 120); g.lineTo(x + 40, HZ); g.fill(); g.fillRect(x - 60, 170, 120, 8); }
    g.strokeStyle = rgb(c, 0.9, 1.6); g.lineWidth = 2;
    for (let k = 0; k < 3; k++) { g.beginPath(); let x = 90, y = 174; g.moveTo(x, y); while (x < 420) { x += 22; y = 174 + (Math.sin(x * 0.3 + k) * 14); g.lineTo(x, y); } g.stroke(); }
    luzes(g, [[90, 120], [256, 120], [420, 120]], c, 5);
  },
  6(g, c) {   // Transporte: túnel de trem com trilhos e luzes
    sombra(g); g.fillRect(0, 0, S, 120); g.fillRect(0, 0, 110, HZ); g.fillRect(402, 0, 110, HZ);
    g.strokeStyle = 'rgba(220,220,220,0.7)'; g.lineWidth = 3; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(S / 2 + s * 10, HZ); g.lineTo(S / 2 + s * 150, S); g.stroke(); }
    for (let k = 0; k < 9; k++) { g.fillStyle = 'rgba(30,30,30,0.9)'; const y = HZ + 6 + k * k * 2.2, w = 20 + k * 30; g.fillRect(S / 2 - w / 2, y, w, 3 + k * 0.6); }
    luzes(g, [[256, HZ - 20], [150, 140], [362, 140], [190, 200], [322, 200]], c, 5);
  },
  7(g, c, r) {   // Madeira: pinheiros e serraria
    for (let i = 0; i < 16; i++) { const x = r() * S, h = 90 + r() * 160; sombra(g); g.beginPath(); g.moveTo(x - 26, HZ); g.lineTo(x, HZ - h); g.lineTo(x + 26, HZ); g.fill(); }
    sombra(g); g.fillRect(190, 250, 140, 80); g.beginPath(); g.moveTo(180, 250); g.lineTo(260, 200); g.lineTo(340, 250); g.fill();
    luzes(g, [[220, 280], [300, 280]], c, 4);
  },
  8(g, c) {   // Têxteis: teares e tecidos pendurados
    for (let i = 0; i < 7; i++) { const x = 40 + i * 66; g.fillStyle = rgb(c, 0.55 + (i % 2) * 0.2, 0.9 + (i % 3) * 0.2); g.beginPath(); g.moveTo(x, 80); g.quadraticCurveTo(x + 30, 200, x + 6, HZ); g.lineTo(x + 40, HZ); g.quadraticCurveTo(x + 60, 200, x + 46, 80); g.fill(); }
    sombra(g); g.fillRect(0, 70, S, 14); for (const x of [120, 300]) { g.fillRect(x, 250, 110, 8); g.fillRect(x, 250, 8, 80); g.fillRect(x + 102, 250, 8, 80); }
    luzes(g, [[90, 100], [256, 100], [420, 100]], c);
  },
  9(g, c) {   // Grãos: silos e trigal
    sombra(g); for (const [x, w, h] of [[110, 70, 180], [190, 80, 220], [280, 70, 170]]) { g.fillRect(x, HZ - h, w, h); g.beginPath(); g.arc(x + w / 2, HZ - h, w / 2, Math.PI, 0); g.fill(); }
    g.strokeStyle = rgb(c, 0.85, 1.3); g.lineWidth = 2; for (let x = 0; x < S; x += 7) { const h = 30 + Math.sin(x * 0.2) * 8; g.beginPath(); g.moveTo(x, S - 120); g.quadraticCurveTo(x + 4, S - 120 - h * 0.5, x + 2, S - 120 - h); g.stroke(); }
    luzes(g, [[150, 200], [230, 160], [315, 210]], c);
  },
  10(g, c) {   // Pecuária: celeiro, cerca e colinas
    g.fillStyle = 'rgba(8,10,12,0.75)'; g.beginPath(); g.moveTo(0, HZ); g.quadraticCurveTo(130, 240, 260, HZ - 20); g.quadraticCurveTo(380, 250, S, HZ); g.fill();
    sombra(g); g.fillRect(180, 230, 150, 100); g.beginPath(); g.moveTo(166, 232); g.lineTo(255, 160); g.lineTo(344, 232); g.fill();
    for (let x = 0; x < S; x += 40) g.fillRect(x, HZ + 40, 5, 40); g.fillRect(0, HZ + 50, S, 4); g.fillRect(0, HZ + 66, S, 4);
    luzes(g, [[255, 270], [210, 255]], c, 4);
  },
  11(g, c, r) {   // Agricultura: estufa em arco e vinhas
    g.strokeStyle = rgb(c, 0.8, 1.4); g.lineWidth = 3; for (let k = 0; k < 6; k++) { const w = 260 - k * 30; g.beginPath(); g.arc(S / 2, HZ, w, Math.PI, 0); g.stroke(); }
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(10,30,14,${0.6 + r() * 0.3})`; g.beginPath(); g.arc(r() * S, HZ - 20 - r() * 200, 8 + r() * 20, 0, 7); g.fill(); }
    luzes(g, [[256, 120], [150, 220], [362, 220]], c);
  },
  12(g, c) {   // Carvão: boca de mina, trilho e lanternas
    sombra(g); g.fillRect(0, 0, S, S); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(140, S); g.lineTo(190, 160); g.lineTo(322, 160); g.lineTo(372, S); g.fill(); g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(40,24,14,0.95)'; for (const x of [180, 318]) g.fillRect(x, 150, 14, 260); g.fillRect(170, 150, 172, 16);
    g.strokeStyle = 'rgba(200,170,140,0.7)'; g.lineWidth = 3; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(S / 2 + s * 8, HZ); g.lineTo(S / 2 + s * 110, S); g.stroke(); }
    luzes(g, [[200, 200], [312, 200], [256, HZ - 10]], c, 5);
  },
};

export function vistaTextura(d) {
  const c = makeCanvas(S, S); const g = c.getContext('2d');
  ceuEChao(g, d.color); perspectiva(g, d.color);
  TEMAS[d.id]?.(g, d.color, rand(d.id * 131));
  // névoa baixa na frente
  const nv = g.createLinearGradient(0, HZ - 40, 0, HZ + 80); nv.addColorStop(0, rgb(d.color, 0)); nv.addColorStop(0.5, rgb(d.color, 0.35, 1.2)); nv.addColorStop(1, rgb(d.color, 0));
  g.fillStyle = nv; g.fillRect(0, HZ - 40, S, 120);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
