/*
 * Tela panorâmica do Batcomputador: mapa holográfico de Panem com os 12 distritos e a Capital.
 * A textura cobre a parede inteira de telas (seis painéis lado a lado, x de -6,42 a 6,42 m): cada quadro cai num painel.
 * Da esquerda para a direita: telemetria, cidade em wireframe, mapa (painel central), distrito em foco, radar, lista.
 * O que é estático (continente, relevo, malha, rotas) é desenhado uma vez numa camada própria;
 * a cada quadro só entram os pulsos, os pacotes nas rotas, a varredura e o foco do distrito.
 * window.__mapaFoco = id (1..12) destaca um distrito (o Batcomputador usa ao marcar uma rota).
 */
import * as THREE from 'three';
import { DISTRICTS } from './data.js';
import { fbm, makeCanvas } from './materials.js';
import { rand } from './util.js';

const W = 2600, H = 526;
const PERTO = new THREE.Vector3(0, 5, -10);
const CIANO = '#3fd8ff', CIANO_CLARO = '#bff4ff', BRANCO = '#eafcff', AMBAR = '#ffc15a';
const MONO = '600 15px "IBM Plex Mono", ui-monospace, Consolas, monospace';

// quadro do mapa (centro)
const MX = 800, MY = 58, MW = 1000, MH = 430;
// faixas dos painéis na textura (px), medidas na cena: u = (x + 6,42) / 12,84
export const PAINEIS = { texto_esq: [0, 248], cidade: [250, 623], mapa: [638, 1963], grafico: [1970, 2207], radar: [2215, 2428], dados: [2434, 2600] };

// contorno do continente (Panem: América do Norte estilizada), em coordenadas normalizadas do quadro
const CONTORNO = [
  [0.05, 0.25], [0.1, 0.17], [0.18, 0.13], [0.27, 0.11], [0.35, 0.13], [0.41, 0.08], [0.49, 0.1], [0.56, 0.06], [0.63, 0.1],
  [0.7, 0.08], [0.76, 0.13], [0.81, 0.19], [0.87, 0.23], [0.92, 0.3], [0.89, 0.36], [0.85, 0.4], [0.88, 0.46], [0.83, 0.52],
  [0.79, 0.58], [0.77, 0.66], [0.73, 0.73], [0.71, 0.82], [0.66, 0.79], [0.61, 0.72], [0.55, 0.74], [0.5, 0.79], [0.46, 0.87],
  [0.42, 0.93], [0.38, 0.88], [0.36, 0.8], [0.3, 0.74], [0.25, 0.66], [0.21, 0.58], [0.18, 0.5], [0.15, 0.42], [0.1, 0.37], [0.05, 0.31],
];
// lagos e um golfo, para o relevo não ficar liso
const LAGOS = [[0.6, 0.3, 0.035], [0.66, 0.34, 0.025], [0.42, 0.2, 0.02]];
const CAPITAL = [0.27, 0.47];
const POS = {
  1: [0.4, 0.3], 2: [0.21, 0.31], 3: [0.54, 0.2], 4: [0.8, 0.3], 5: [0.66, 0.42], 6: [0.48, 0.44],
  7: [0.15, 0.21], 8: [0.74, 0.54], 9: [0.53, 0.6], 10: [0.36, 0.64], 11: [0.6, 0.73], 12: [0.7, 0.66],
};
// ligações entre distritos vizinhos (além de todos para a Capital)
const VIZINHOS = [[7, 2], [2, 1], [1, 3], [3, 6], [6, 5], [5, 4], [5, 8], [8, 12], [12, 11], [11, 9], [9, 10], [9, 6], [1, 6], [10, 2]];

const px = ([x, y]) => [MX + x * MW, MY + y * MH];
const curva = (a, b, k = 0.18) => {   // ponto de controle: arco para o "norte" do segmento
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
  return [mx - dy * k, my + dx * k - Math.hypot(dx, dy) * 0.08];
};
const naCurva = (a, c, b, t) => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];

function costa() {
  // subdivide o contorno e empurra cada ponto pela normal com ruído: litoral recortado
  const pts = [];
  for (let i = 0; i < CONTORNO.length; i++) {
    const a = CONTORNO[i], b = CONTORNO[(i + 1) % CONTORNO.length];
    const nx = -(b[1] - a[1]), ny = b[0] - a[0], nl = Math.hypot(nx, ny) || 1;
    for (let k = 0; k < 10; k++) {
      const t = k / 10, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
      const d = fbm(x * 9, y * 9, 4.1, 4) * 0.03;   // fbm vai de -1 a 1
      pts.push([x + (nx / nl) * d, y + (ny / nl) * d]);
    }
  }
  return pts;
}

function caminho(g, pts, escala = 1, centro = [0.5, 0.48]) {
  g.beginPath();
  pts.forEach((p, i) => {
    const q = px([centro[0] + (p[0] - centro[0]) * escala, centro[1] + (p[1] - centro[1]) * escala]);
    i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]);
  });
  g.closePath();
}

function moldura(g, x, y, w, h, titulo) {
  g.fillStyle = 'rgba(4,20,34,0.85)'; g.fillRect(x, y, w, h);
  g.strokeStyle = 'rgba(63,216,255,0.45)'; g.lineWidth = 2; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  // cantoneiras
  g.strokeStyle = CIANO; g.lineWidth = 4; const c = 22;
  for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
    g.beginPath(); g.moveTo(cx + sx * c, cy); g.lineTo(cx, cy); g.lineTo(cx, cy + sy * c); g.stroke();
  }
  if (titulo) { g.fillStyle = CIANO_CLARO; g.font = MONO; g.fillText(titulo, x + 16, y + 26); }
}

/** Camada estática: fundo, molduras, continente com relevo, malha de pontos, rotas e cidade em wireframe. */
function camadaBase() {
  const c = makeCanvas(W, H); const g = c.getContext('2d');
  const rr = rand(1312);
  const bg = g.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, W * 0.7);
  bg.addColorStop(0, '#062038'); bg.addColorStop(1, '#010810');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);

  /* ---- quadro central: o mapa ---- */
  moldura(g, MX - 14, MY - 30, MW + 28, MH + 50, 'PANEM · REDE DOS DOZE DISTRITOS');
  // grade de latitude/longitude
  g.strokeStyle = 'rgba(63,216,255,0.08)'; g.lineWidth = 1;
  for (let x = 0; x <= 1; x += 1 / 16) { const [a] = px([x, 0]); g.beginPath(); g.moveTo(a, MY); g.lineTo(a, MY + MH); g.stroke(); }
  for (let y = 0; y <= 1; y += 1 / 9) { const [, b] = px([0, y]); g.beginPath(); g.moveTo(MX, b); g.lineTo(MX + MW, b); g.stroke(); }

  const litoral = costa();
  // massa de terra
  caminho(g, litoral);
  const terra = g.createLinearGradient(MX, MY, MX + MW, MY + MH);
  terra.addColorStop(0, 'rgba(22,120,180,0.42)'); terra.addColorStop(1, 'rgba(10,70,130,0.32)');
  g.fillStyle = terra; g.fill();
  // relevo: curvas de nível concêntricas (contorno encolhido para o interior)
  g.save(); caminho(g, litoral); g.clip();
  for (let k = 1; k <= 6; k++) {
    caminho(g, litoral, 1 - k * 0.11, [0.34 + k * 0.012, 0.46]);
    g.strokeStyle = `rgba(110,225,255,${0.16 - k * 0.018})`; g.lineWidth = 1.2; g.stroke();
  }
  // malha de pontos (hexagonal) só dentro da terra
  for (let y = MY + 6; y < MY + MH; y += 11) {
    for (let x = MX + ((y / 11) % 2) * 5.5; x < MX + MW; x += 11) {
      const n = fbm((x - MX) / MW * 6, (y - MY) / MH * 4, 2.2, 3);
      g.fillStyle = `rgba(140,230,255,${0.12 + Math.max(0, n) * 0.3})`; g.fillRect(x, y, 2, 2);
    }
  }
  // cadeia de montanhas a oeste (onde fica a Capital)
  g.strokeStyle = 'rgba(190,240,255,0.35)'; g.lineWidth = 1.4;
  for (let i = 0; i < 26; i++) {
    const [x, y] = px([0.2 + rr() * 0.12 + i * 0.002, 0.18 + i * 0.022 + rr() * 0.02]);
    g.beginPath(); g.moveTo(x - 9, y + 6); g.lineTo(x, y - 6); g.lineTo(x + 9, y + 6); g.stroke();
  }
  g.restore();
  // lagos
  for (const [x, y, r] of LAGOS) {
    const [a, b] = px([x, y]); g.beginPath(); g.ellipse(a, b, r * MW, r * MH * 0.8, 0.3, 0, 7);
    g.fillStyle = 'rgba(1,10,20,0.9)'; g.fill(); g.strokeStyle = 'rgba(110,225,255,0.6)'; g.lineWidth = 1.5; g.stroke();
  }
  // litoral: brilho largo + linha fina
  caminho(g, litoral); g.strokeStyle = 'rgba(63,216,255,0.22)'; g.lineWidth = 9; g.stroke();
  caminho(g, litoral); g.strokeStyle = 'rgba(160,240,255,0.95)'; g.lineWidth = 2; g.stroke();

  // rotas: vizinhos (finas) e Capital (mais fortes)
  const cap = px(CAPITAL);
  g.lineWidth = 1.3; g.strokeStyle = 'rgba(120,225,255,0.35)'; g.setLineDash([5, 6]);
  for (const [a, b] of VIZINHOS) { const A = px(POS[a]), B = px(POS[b]); const C = curva(A, B, 0.1); g.beginPath(); g.moveTo(...A); g.quadraticCurveTo(...C, ...B); g.stroke(); }
  g.setLineDash([]);
  g.lineWidth = 2; g.strokeStyle = 'rgba(63,216,255,0.5)';
  for (const d of DISTRICTS) { const B = px(POS[d.id]); const C = curva(cap, B); g.beginPath(); g.moveTo(...cap); g.quadraticCurveTo(...C, ...B); g.stroke(); }

  // escala e rosa dos ventos
  g.fillStyle = 'rgba(191,244,255,0.7)'; g.font = '500 13px "IBM Plex Mono", monospace';
  g.fillText('0      500     1000 KM', MX + 12, MY + MH - 14);
  g.strokeStyle = 'rgba(191,244,255,0.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(MX + 12, MY + MH - 30); g.lineTo(MX + 172, MY + MH - 30); g.stroke();
  const [rx, ry] = [MX + MW - 50, MY + MH - 56];
  g.beginPath(); g.arc(rx, ry, 26, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(rx, ry - 34); g.lineTo(rx + 7, ry); g.lineTo(rx, ry + 34); g.lineTo(rx - 7, ry); g.closePath(); g.stroke();
  g.fillText('N', rx - 5, ry - 40);

  /* ---- painel da cidade em wireframe ---- */
  moldura(g, 262, 14, 350, H - 28, 'CAPITAL · VISTA 3D');
  g.save(); g.translate(276, 0);
  const chao = H - 110;
  g.strokeStyle = 'rgba(63,216,255,0.25)'; g.lineWidth = 1;
  for (let i = 0; i <= 12; i++) { g.beginPath(); g.moveTo(30 + i * 22, chao); g.lineTo(160 + (i - 6) * 40, H - 40); g.stroke(); }
  for (let j = 0; j < 4; j++) { const y = chao + j * 22; g.beginPath(); g.moveTo(30 - j * 10, y); g.lineTo(294 + j * 10, y); g.stroke(); }
  // prédios em perspectiva (caixas em arame)
  const predios = [[50, 100], [80, 170], [112, 240], [146, 310], [178, 210], [206, 150], [236, 115], [262, 75]];
  for (const [x, h] of predios) {
    const w = 24, d = 10;
    g.strokeStyle = 'rgba(120,230,255,0.85)'; g.lineWidth = 1.4;
    g.strokeRect(x, chao - h, w, h);
    g.beginPath(); g.moveTo(x, chao - h); g.lineTo(x + d, chao - h - d); g.lineTo(x + w + d, chao - h - d); g.lineTo(x + w, chao - h);
    g.moveTo(x + w + d, chao - h - d); g.lineTo(x + w + d, chao - d); g.lineTo(x + w, chao); g.stroke();
    g.strokeStyle = 'rgba(120,230,255,0.25)';
    for (let y = chao - h + 12; y < chao - 4; y += 12) { g.beginPath(); g.moveTo(x + 3, y); g.lineTo(x + w - 3, y); g.stroke(); }
  }
  g.fillStyle = 'rgba(191,244,255,0.75)'; g.font = '500 13px "IBM Plex Mono", monospace';
  g.fillText('SETOR CENTRAL', 32, H - 40); g.fillText('ALT. 1.840 M', 196, H - 40);
  g.restore();

  /* ---- demais painéis ---- */
  moldura(g, 8, 14, 234, H - 28, 'TELEMETRIA');
  moldura(g, 1976, 14, 226, H - 28, 'DISTRITO EM FOCO');
  moldura(g, 2220, 14, 204, H - 28, 'VARREDURA');
  moldura(g, 2438, 14, 156, H - 28, 'STATUS');
  return c;
}

export function mapaPanem() {
  const c = makeCanvas(W, H); const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const base = camadaBase();
  const cap = px(CAPITAL);
  const rotas = DISTRICTS.map((d) => { const B = px(POS[d.id]); return { d, B, C: curva(cap, B) }; });
  const RX = 2322, RY = 250, RR = 88;
  let acc = 0;

  function draw(t) {
    g.drawImage(base, 0, 0);
    const foco = Number(window.__mapaFoco) || (Math.floor(t / 3) % 12) + 1;   // sem rota marcada: percorre os 12

    // pacotes nas rotas da Capital
    for (const { d, B, C } of rotas) {
      for (let k = 0; k < 2; k++) {
        const u = ((t * 0.22 + d.id * 0.083 + k * 0.5) % 1);
        const [x, y] = naCurva(cap, C, B, u);
        g.fillStyle = d.id === foco ? AMBAR : CIANO_CLARO; g.beginPath(); g.arc(x, y, d.id === foco ? 4 : 2.6, 0, 7); g.fill();
      }
    }
    // rota em foco, mais forte
    const rf = rotas[foco - 1];
    g.strokeStyle = AMBAR; g.lineWidth = 3; g.beginPath(); g.moveTo(...cap); g.quadraticCurveTo(...rf.C, ...rf.B); g.stroke();

    // distritos
    for (const { d, B } of rotas) {
      const on = d.id === foco; const pulso = 0.5 + 0.5 * Math.sin(t * 3 + d.id);
      const cor = '#' + d.color.toString(16).padStart(6, '0');
      g.fillStyle = `rgba(63,216,255,${0.12 + pulso * 0.12})`; g.beginPath(); g.arc(B[0], B[1], 16 + pulso * 4, 0, 7); g.fill();
      g.fillStyle = on ? AMBAR : cor; g.beginPath(); g.arc(B[0], B[1], on ? 9 : 7, 0, 7); g.fill();
      g.strokeStyle = BRANCO; g.lineWidth = 1.5; g.stroke();
      if (on) { const r = 14 + ((t * 30) % 30); g.strokeStyle = `rgba(255,193,90,${1 - (r - 14) / 30})`; g.lineWidth = 2; g.beginPath(); g.arc(B[0], B[1], r, 0, 7); g.stroke(); }
      g.font = on ? '700 18px "IBM Plex Mono", monospace' : MONO;
      const rot = `D${String(d.id).padStart(2, '0')}` + (on ? ` ${d.name.toUpperCase()}` : '');
      const tw = g.measureText(rot).width;
      g.fillStyle = 'rgba(1,10,20,0.75)'; g.fillRect(B[0] + 12, B[1] - 28, tw + 10, 22);
      g.fillStyle = on ? AMBAR : BRANCO; g.fillText(rot, B[0] + 17, B[1] - 12);
    }
    // Capital
    const pc = 0.5 + 0.5 * Math.sin(t * 2);
    g.fillStyle = `rgba(255,255,255,${0.15 + pc * 0.15})`; g.beginPath(); g.arc(cap[0], cap[1], 22 + pc * 6, 0, 7); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cap[0], cap[1], 11, 0, 7); g.fill();
    g.strokeStyle = CIANO; g.lineWidth = 2; g.beginPath(); g.arc(cap[0], cap[1], 16, 0, 7); g.stroke();
    g.font = '700 17px "IBM Plex Mono", monospace'; g.fillStyle = BRANCO; g.fillText('CAPITAL', cap[0] - 34, cap[1] + 40);

    // varredura vertical no mapa
    const sx = MX + ((t * 140) % MW);
    const sg = g.createLinearGradient(sx - 60, 0, sx, 0); sg.addColorStop(0, 'rgba(63,216,255,0)'); sg.addColorStop(1, 'rgba(63,216,255,0.22)');
    g.fillStyle = sg; g.fillRect(sx - 60, MY, 60, MH); g.fillStyle = 'rgba(191,244,255,0.6)'; g.fillRect(sx, MY, 2, MH);

    // radar
    g.strokeStyle = 'rgba(63,216,255,0.55)'; g.lineWidth = 1.4;
    for (let r = 30; r <= RR; r += 30) { g.beginPath(); g.arc(RX, RY, r, 0, 7); g.stroke(); }
    g.beginPath(); g.moveTo(RX - RR, RY); g.lineTo(RX + RR, RY); g.moveTo(RX, RY - RR); g.lineTo(RX, RY + RR); g.stroke();
    const a = t * 1.3; const rg = g.createRadialGradient(RX, RY, 0, RX, RY, RR);
    rg.addColorStop(0, 'rgba(63,216,255,0.05)'); rg.addColorStop(1, 'rgba(63,216,255,0.35)');
    g.fillStyle = rg; g.beginPath(); g.moveTo(RX, RY); g.arc(RX, RY, RR, a, a + 0.6); g.closePath(); g.fill();
    for (const d of DISTRICTS) {
      const b = d.id * 0.52, r = 26 + (d.id * 37) % 90; const x = RX + Math.cos(b) * r, y = RY + Math.sin(b) * r;
      const brilho = Math.max(0.25, 1 - (((a - b) % 6.283) + 6.283) % 6.283 / 2);
      g.fillStyle = d.id === foco ? AMBAR : `rgba(191,244,255,${brilho})`; g.fillRect(x - 2.5, y - 2.5, 5, 5);
    }
    // lista de estado
    g.font = '500 14px "IBM Plex Mono", monospace';
    DISTRICTS.forEach((d, i) => {
      const y = 76 + i * 35, on = d.id === foco;
      g.fillStyle = on ? AMBAR : 'rgba(191,244,255,0.85)';
      g.fillText(`D${String(d.id).padStart(2, '0')}`, 2452, y);
      g.fillStyle = on ? AMBAR : '#5ff0a0'; g.fillText(on ? 'ROTA' : 'OK', 2540, y);
      g.fillStyle = 'rgba(63,216,255,0.25)'; g.fillRect(2452, y + 8, 128, 1);
    });
    // telemetria: três ondas e leituras
    g.strokeStyle = CIANO; g.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      g.beginPath();
      for (let x = 0; x <= 210; x += 3) { const y = 120 + k * 120 + Math.sin(x * 0.05 + t * (1.2 + k * 0.6) + k) * 22 + Math.sin(x * 0.17 + t * 3) * 5; x ? g.lineTo(20 + x, y) : g.moveTo(20 + x, y); }
      g.stroke();
      g.fillStyle = CIANO_CLARO; g.font = '500 13px "IBM Plex Mono", monospace';
      g.fillText(['FLUXO', 'CARGA', 'SINAL'][k] + ' ' + (82 + Math.sin(t * 0.7 + k) * 9).toFixed(1) + '%', 22, 72 + k * 120);
    }
    // distrito em foco: ficha
    const df = DISTRICTS[foco - 1];
    g.fillStyle = AMBAR; g.font = '700 46px "IBM Plex Mono", monospace'; g.fillText(String(df.id).padStart(2, '0'), 1992, 104);
    g.fillStyle = BRANCO; g.font = '700 20px "IBM Plex Mono", monospace';
    const nome = df.name.toUpperCase(); const quebra = nome.length > 16 ? nome.lastIndexOf(' ', 16) : -1;
    if (quebra > 0) { g.fillText(nome.slice(0, quebra), 1992, 144); g.fillText(nome.slice(quebra + 1), 1992, 168); } else g.fillText(nome, 1992, 144);
    g.font = '500 13px "IBM Plex Mono", monospace'; g.fillStyle = 'rgba(191,244,255,0.85)';
    const linhas = [['FEITIÇO', df.spell.toUpperCase()], ['GALERIA', df.id <= 6 ? 'SUPERIOR' : 'INFERIOR'], ['ACESSO', 'BARRADO'], ['PROJETO', 'CURADORIA']];
    linhas.forEach(([k, v], i) => { g.fillStyle = 'rgba(63,216,255,0.8)'; g.fillText(k, 1992, 214 + i * 56); g.fillStyle = BRANCO; g.fillText(v.slice(0, 22), 1992, 234 + i * 56); });
    const prog = (t * 0.33) % 1; g.strokeStyle = 'rgba(63,216,255,0.5)'; g.strokeRect(1992, H - 52, 194, 10); g.fillStyle = AMBAR; g.fillRect(1993, H - 51, 192 * prog, 8);
    tex.needsUpdate = true;
  }
  draw(0);
  // só redesenha com a câmera perto do Batcomputador (o upload de 2600×526 é o custo, não o desenho)
  return { tex, update: (dt, t) => {
    acc += dt; const passo = window.__qualidadeAtual === 'baixa' ? 0.2 : 0.1;
    if (acc < passo) return; acc = 0;
    const c = window.__cam; if (c && c.position.distanceToSquared(PERTO) > 1600) return;
    draw(t);
  } };
}
