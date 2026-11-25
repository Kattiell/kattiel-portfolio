'use client';

import { useEffect, useRef } from 'react';

// A arte vira um espaço: um mapa de profundidade (Depth Anything V2, gerado offline em public/img/mono/*-prof.webp)
// separa pilares, escadas e piso em planos, e um único shader faz, por cima da imagem:
//   1. parallax com oclusão: a câmera segue o cursor (com inércia) e a rolagem (aproximação lenta);
//   2. luz carmesim que percorre a estrutura, iluminando pelas normais tiradas da profundidade;
//   3. inspeção: de tempos em tempos uma faixa varre a cena e revela a malha (curvas de nível + arestas);
//   4. luz volumétrica (raios a partir da luz que passa) e névoa nos planos do fundo;
//   5. poeira em suspensão em três profundidades, escondida atrás do que está mais perto.
// Sem WebGL2 ou com "reduzir movimento", fica a imagem estática que já está embaixo.

const VERT = `#version 300 es
in vec2 p; out vec2 v; void main(){ v = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;

const FRAG = `#version 300 es
precision highp float;
in vec2 v; out vec4 o;
uniform sampler2D uArte, uProf;
uniform vec2 uRes, uCam, uProfTx, uArteTx;
uniform float uImgA, uPosX, uT, uScroll, uFase, uInsp;
// abertura (só no átrio): tempo em s (99 = desligada), dolly, foco no alvo e separação das camadas
uniform float uAbre, uZoomA, uFoco, uSep;
uniform vec2 uAlvo;

float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 h2(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
float ruido(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h1(i), h1(i + vec2(1, 0)), f.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ return ruido(p) * .55 + ruido(p * 2.03 + 7.1) * .3 + ruido(p * 4.01 + 3.7) * .15; }

vec2 cobre(vec2 s){                       // object-fit: cover com object-position x
  float ra = uRes.x / uRes.y;
  vec2 k = ra > uImgA ? vec2(1., uImgA / ra) : vec2(ra / uImgA, 1.);
  return (1. - k) * vec2(uPosX, .5) + s * k;
}

float lu(vec2 p){ return dot(texture(uArte, p).rgb, vec3(.3, .59, .11)); }
// desenho técnico da cena: contornos da arte (Sobel), silhuetas por salto de profundidade e prumos
float malha(vec2 q, float d, float dx, float dy){
  vec2 t = uArteTx * 2.6;
  float sx = (lu(q + t * vec2(1, -1)) + 2. * lu(q + t * vec2(1, 0)) + lu(q + t * vec2(1, 1))) - (lu(q + t * vec2(-1, -1)) + 2. * lu(q + t * vec2(-1, 0)) + lu(q + t * vec2(-1, 1)));
  float sy = (lu(q + t * vec2(-1, 1)) + 2. * lu(q + t * vec2(0, 1)) + lu(q + t * vec2(1, 1))) - (lu(q + t * vec2(-1, -1)) + 2. * lu(q + t * vec2(0, -1)) + lu(q + t * vec2(1, -1)));
  float contorno = smoothstep(.16, .38, length(vec2(sx, sy)));
  float silhueta = smoothstep(.02, .06, length(vec2(dx, dy)));
  float gx = fract(q.x * 64.); float gw = fwidth(q.x * 64.);
  float prumo = (1. - smoothstep(0., 1.2 * gw, min(gx, 1. - gx))) * .22 * (1. - d);
  return max(max(contorno * .85, silhueta), prumo);
}

void main(){
  // aproximação lenta com a rolagem + margem para o parallax não mostrar borda
  float zoom = (1.07 + .05 * (1. - uScroll)) * uZoomA;
  vec2 base = .5 + (cobre(v) - .5) / zoom;
  base.x += (uPosX - .5) * .04;
  base = uAlvo + (base - uAlvo) / uFoco;          // abertura: a câmera fecha no pilar

  // câmera: cursor + deriva lenta + rolagem (sobe/desce entre os planos)
  vec2 off = uCam * vec2(.024, .016) + vec2(0., (uScroll - .5) * .05);
  vec2 q = base; float d = 0.;
  for (int i = 0; i < 5; i++){
    d = texture(uProf, q).r;
    // abertura: a estrutura se separa em camadas de profundidade (as mais próximas abrem mais)
    float camada = floor(d * 6.) / 6.;
    q = uAlvo + (base - uAlvo) * (1. - uSep * (camada - .35) * .16) + off * (d - .38);
  }

  vec3 arte = texture(uArte, q).rgb;
  vec3 c = arte;
  float lum = dot(arte, vec3(.299, .587, .114));

  // normais a partir da profundidade
  vec2 e = uProfTx * 1.5;
  float dx = texture(uProf, q + vec2(e.x, 0)).r - texture(uProf, q - vec2(e.x, 0)).r;
  float dy = texture(uProf, q + vec2(0, e.y)).r - texture(uProf, q - vec2(0, e.y)).r;
  vec3 n = normalize(vec3(-dx * 7., -dy * 7., .22));

  // 2. luz carmesim percorrendo a estrutura
  float ciclo = fract(uT / 26. + uFase);
  vec2 lp = vec2(mix(-.15, 1.15, ciclo), .42 + .16 * sin(uT * .21 + uFase * 6.));
  vec3 L = vec3(lp, .55) - vec3(v, d * .6);
  L.x *= uRes.x / uRes.y;
  float at = 1. / (1. + dot(L, L) * 16.);
  float dif = max(dot(n, normalize(L)), 0.);
  vec3 carmim = vec3(.92, .1, .17);
  c += arte * carmim * dif * at * 2.4 + carmim * at * .02;

  // 4a. luz volumétrica: raios da luz que passa, pelas partes vermelhas da arte
  vec2 passo = (lp - v) / 22.; vec2 r = q; float raio = 0., dec = 1.;
  for (int i = 0; i < 22; i++){
    r += passo; vec3 a = texture(uArte, r).rgb;
    raio += max(a.r - max(a.g, a.b) - .18, 0.) * dec; dec *= .93;
  }
  c += carmim * raio * (.03 + at * .16);

  // 4b. névoa que deriva nos planos de trás
  float longe = 1. - d;
  float nevoa = fbm(q * vec2(3., 5.) + vec2(uT * .018, -uT * .006) + off * 4.);
  c += mix(vec3(.16, .05, .06), vec3(.42, .36, .3), .35) * nevoa * longe * longe * .2;

  // 5. poeira em suspensão: três planos, presa atrás do que está mais perto
  float ra = uRes.x / uRes.y;
  for (int k = 0; k < 3; k++){
    float z = .3 + float(k) * .25;
    float esc = 34. - float(k) * 9.;
    vec2 pp = (v + off * (z - .38) * 1.4) * vec2(ra, 1.) * esc + vec2(uT * (.05 + float(k) * .03), -uT * .08);
    vec2 cel = floor(pp); vec2 f = fract(pp) - .5;
    float hh = h1(cel + float(k) * 17.);
    if (hh > .82 && d < z + .06){
      vec2 pos = (h2(cel) - .5) * .7 + vec2(sin(uT * .7 + hh * 40.), cos(uT * .5 + hh * 30.)) * .08;
      float pt = smoothstep(.07 + float(k) * .025, 0., length(f - pos));
      float pisca = .5 + .5 * sin(uT * (1. + hh * 2.) + hh * 50.);
      c += vec3(1., .82, .72) * pt * (.12 + at * 1.6) * pisca;
    }
  }

  // 3. inspeção: dentro da faixa que varre a cena, a imagem vira desenho técnico:
  //    contornos da própria arte (Sobel na luminância), silhuetas por salto de profundidade e prumos.
  if (uInsp > -.5){
    float bx = mix(-.25, 1.25, uInsp);
    float dist = v.x - bx;
    float mFaixa = smoothstep(.24, 0., abs(dist)) * step(dist, 0.);
    float mh = malha(q, d, dx, dy);
    c = mix(c, vec3(.05, .05, .06) + c * .25, mFaixa * .8);
    c += vec3(.91, .89, .85) * mh * mFaixa * .7;
    c += vec3(1., .2, .26) * smoothstep(.005, 0., abs(dist)) * .9;
    c += vec3(1., .2, .26) * mh * smoothstep(.045, 0., abs(dist));
  }

  // ABERTURA — uma inspeção de qualidade em 5 s, terminando no próprio átrio:
  //   0–1,0  repouso: só as luzes carmesim da estrutura pulsam no escuro
  //   1,0–2,3 varredura: um plano desce pela cena e deixa a malha (geometria) para trás
  //   2,3–3,5 diagnóstico: a câmera fecha no pilar, as camadas se separam, a falha acende
  //   3,5–4,7 validação: a matéria volta da frente para o fundo (a correção atravessa a cena)
  if (uAbre < 6.){
    float A = uAbre;
    float mh = malha(q, d, dx, dy);
    float emi = max(arte.r - max(arte.g, arte.b) - .1, 0.) * 2.2 + smoothstep(.62, .9, lum) * .5;
    float pulso = smoothstep(.1, .9, A) * (.75 + .25 * sin(A * 11.));
    vec3 escuro = arte * emi * pulso * .9 + carmim * emi * pulso * .25;
    vec3 fio = vec3(.025, .025, .03) + vec3(.91, .89, .85) * mh * .62;
    // varredura (em tela, de cima para baixo)
    float sy = mix(1.06, -.06, smoothstep(1., 2.3, A));
    float lido = smoothstep(sy - .004, sy + .004, v.y);
    vec3 pre = mix(escuro, fio + escuro * .6, lido);
    float naLinha = step(1., A) * (1. - step(2.35, A));
    pre += carmim * naLinha * (smoothstep(.006, 0., abs(v.y - sy)) * 1.4 + smoothstep(.14, 0., v.y - sy) * step(sy, v.y) * .18);
    pre += vec3(1., .55, .58) * naLinha * smoothstep(.002, 0., abs(v.y - sy));
    // diagnóstico: a região do pilar acende em carmesim
    float diag = smoothstep(2.2, 2.7, A) * (1. - smoothstep(3.6, 4.3, A));
    vec2 rel = (q - uAlvo) * vec2(1.8, 1.);
    float zona = smoothstep(.13, .02, length(rel));
    pre += carmim * (mh * 1.1 + .1) * zona * diag * (.7 + .3 * sin(A * 18.));
    float borda = .5 - abs(fract(d * 6.) - .5);
    pre += carmim * smoothstep(.008, 0., borda) * smoothstep(.004, .02, length(vec2(dx, dy))) * uSep * .45;   // bordas das camadas (só onde há relevo)
    // validação: a matéria volta do primeiro plano para o fundo
    float thr = mix(-.08, 1.12, smoothstep(3.5, 4.7, A));
    float longe2 = 1. - d;
    float mat = smoothstep(thr, thr - .09, longe2);
    vec3 fim = mix(pre, c, mat);
    fim += carmim * smoothstep(.018, 0., abs(longe2 - thr)) * (1. - smoothstep(4.5, 4.8, A)) * step(3.5, A) * .9;
    c = fim;
  }

  // grão e vinheta discretos
  c += (h1(v * uRes + fract(uT) * 91.) - .5) * .025;
  c *= mix(.82, 1., smoothstep(1.05, .35, length((v - .5) * vec2(1.1, 1.3))));
  o = vec4(c, 1.);
}`;

type Props = { arte: string; prof: string; x?: number; fase?: number; atrio?: boolean };

// Pontos da arte do átrio (em coordenadas da textura, y de baixo para cima)
const ALVO: [number, number] = [0.535, 0.67];  // a fissura carmesim no pilar: a "falha" que a inspeção encontra
const ORIGEM: [number, number] = [0.81, 0.33];  // pé da escada, onde a coluna de luz toca o piso
const TOPO: [number, number] = [0.812, 0.95];   // a boca do óculo no teto: os feixes nascem aqui e descem pela coluna
const FIM_ABRE = 5.3;
const FASES = [1, 2.3, 3.5, 4.7];
const suave = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export default function Profundidade({ arte, prof, x = 0.5, fase = 0, atrio = false }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const raiz = document.documentElement;
    // aparelho fraco (toque, poucos núcleos, pouca memória, economia de dados): só o átrio anima, e mais leve;
    // nos capítulos fica a imagem parada (que já está na página por baixo do canvas)
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const leve = matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory || 8) <= 4 || !!nav.connection?.saveData;
    if (leve && !atrio) return;
    // abertura: o script do <head> marca html.k-abre em toda carga da página; aqui ela é tocada (ou encerrada)
    let abrindo = atrio && raiz.classList.contains('k-abre') && !raiz.classList.contains('k-fim');
    let A = abrindo ? 0 : 99, vel = 1, tFim = abrindo ? Infinity : -1, vivo = false;
    const desligaPulo: (() => void)[] = [];
    const encerra = (t: number) => {
      if (!abrindo) return;
      abrindo = false; A = 99; tFim = t;
      raiz.classList.add('k-fim'); raiz.dataset.abre = '4';
      // a abertura pediu rolagem manual (para começar do topo); acabou, o navegador volta a lembrar a posição
      try { if ('scrollRestoration' in history) history.scrollRestoration = 'auto'; } catch { /* sem histórico */ }
      desligaPulo.forEach((f) => f());
    };
    if (!cv || matchMedia('(prefers-reduced-motion: reduce)').matches) { encerra(0); return; }
    if (abrindo) {
      const pula = () => { if (A < 3.5) A = 3.5; vel = 2.4; };
      const tecla = (e: KeyboardEvent) => { if (e.key !== 'Tab' && e.key !== 'Shift') pula(); };
      const botao = document.querySelector('.m-abre-pular');
      botao?.addEventListener('click', pula);
      addEventListener('keydown', tecla); addEventListener('wheel', pula, { passive: true }); addEventListener('touchstart', pula, { passive: true });
      desligaPulo.push(() => { botao?.removeEventListener('click', pula); removeEventListener('keydown', tecla); removeEventListener('wheel', pula); removeEventListener('touchstart', pula); });
      // se a arte não chegar a tempo, a página aparece sem abertura
      const prazo = setTimeout(() => { if (abrindo && !vivo) encerra(0); }, 3500);
      desligaPulo.push(() => clearTimeout(prazo));
    }
    const caixa = cv.parentElement!;
    const secao = caixa.closest('section') ?? caixa;
    let gl: WebGL2RenderingContext | null = null;
    let raf = 0, visivel = false, iniciado = false, morto = false;
    let escala = 0.8;
    const cam = { x: 0, y: 0, tx: 0, ty: 0 };
    const tempos: number[] = [];
    const U: Record<string, WebGLUniformLocation | null> = {};
    let imgA = 16 / 9, profTx = [1 / 836, 1 / 470], arteTx = [1 / 1672, 1 / 941];
    const t0 = performance.now();

    const carrega = (src: string) => new Promise<HTMLImageElement>((ok, erro) => {
      const im = new Image(); im.decoding = 'async'; im.onload = () => ok(im); im.onerror = erro; im.src = src;
    });

    const inicia = async () => {
      iniciado = true;
      gl = cv.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
      if (!gl) { encerra(0); return; }
      const sh = (tipo: number, src: string) => { const s = gl!.createShader(tipo)!; gl!.shaderSource(s, src); gl!.compileShader(s);
        if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) throw new Error(gl!.getShaderInfoLog(s) ?? 'shader'); return s; };
      const pr = gl.createProgram()!;
      try { gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG)); }
      catch (e) { console.warn('[profundidade]', e); encerra(0); return; }
      gl.linkProgram(pr); gl.useProgram(pr);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const lp = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
      for (const n of ['uArte', 'uProf', 'uRes', 'uCam', 'uProfTx', 'uArteTx', 'uImgA', 'uPosX', 'uT', 'uScroll', 'uFase', 'uInsp', 'uAbre', 'uZoomA', 'uFoco', 'uSep', 'uAlvo']) U[n] = gl.getUniformLocation(pr, n);
      let ia: HTMLImageElement, ip: HTMLImageElement;
      try { [ia, ip] = await Promise.all([carrega(arte), carrega(prof)]); } catch { encerra(0); return; }
      if (morto) return;
      if (atrio) profundidadeEm(ip);
      imgA = ia.naturalWidth / ia.naturalHeight; arteTx = [1 / ia.naturalWidth, 1 / ia.naturalHeight]; profTx = [1 / ip.naturalWidth, 1 / ip.naturalHeight];
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      [ia, ip].forEach((im, i) => {
        const tx = gl!.createTexture(); gl!.activeTexture(gl!.TEXTURE0 + i); gl!.bindTexture(gl!.TEXTURE_2D, tx);
        gl!.texImage2D(gl!.TEXTURE_2D, 0, i ? gl!.R8 : gl!.RGB8, i ? gl!.RED : gl!.RGB, gl!.UNSIGNED_BYTE, im);
        gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR); gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
        gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE); gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      });
      gl.uniform1i(U.uArte, 0); gl.uniform1i(U.uProf, 1);
      vivo = true;
      if (abrindo) raiz.classList.add('k-gl');
      if (visivel) laco();
    };

    // ---- átrio: mira presa ao pilar e feixes do piso até as métricas ----
    const dProf = { alvo: 0.6, origem: 0.6, topo: 0.3 };
    const profundidadeEm = (im: HTMLImageElement) => {
      try {
        const c2 = document.createElement('canvas'); c2.width = im.naturalWidth; c2.height = im.naturalHeight;
        const g = c2.getContext('2d', { willReadFrequently: true }); if (!g) return;
        g.drawImage(im, 0, 0);
        const le = ([u, w]: [number, number]) => g.getImageData(Math.round(u * (c2.width - 1)), Math.round((1 - w) * (c2.height - 1)), 1, 1).data[0] / 255;
        dProf.alvo = le(ALVO); dProf.origem = le(ORIGEM);
        dProf.topo = le(TOPO);
      } catch { /* mantém a estimativa */ }
    };
    const hero = atrio ? secao : null;
    const falha = hero?.querySelector<HTMLElement>('.m-falha') ?? null;
    const feixes = hero ? [...hero.querySelectorAll<SVGPathElement>('.m-feixes path')] : [];
    const nos = hero ? [...hero.querySelectorAll<SVGCircleElement>('.m-feixes circle')] : [];
    const cartoes = hero ? [...hero.querySelectorAll<HTMLElement>('.m-numeros li')] : [];
    let destinos: [number, number][] = [];
    let caixaW = 1, caixaH = 1, ultimoD = '';
    // medido a cada quadro (não só no resize): os cartões entram com animação e a página reflui depois das
    // fontes; medir uma vez deixava os fios soltos, presos onde o cartão estava no meio da entrada
    const mede = () => {
      const r = caixa.getBoundingClientRect(); caixaW = r.width; caixaH = r.height;
      destinos = cartoes.map((li) => { const b = li.getBoundingClientRect(); return [b.left - r.left + b.width / 2, b.top - r.top]; });
    };
    // inverso do mapeamento do shader: ponto da textura -> pixel da caixa
    type Cam = { zoom: number; foco: number; ox: number; oy: number };
    const naTela = ([qx, qy]: [number, number], dA: number, p: Cam): [number, number] => {
      let bx = qx - p.ox * (dA - 0.38), by = qy - p.oy * (dA - 0.38);
      bx = ALVO[0] + (bx - ALVO[0]) * p.foco; by = ALVO[1] + (by - ALVO[1]) * p.foco;
      bx -= (x - 0.5) * 0.04;
      const cx = 0.5 + (bx - 0.5) * p.zoom, cy = 0.5 + (by - 0.5) * p.zoom;
      const ra = caixaW / caixaH; const k = ra > imgA ? [1, imgA / ra] : [ra / imgA, 1];
      const vx = (cx - (1 - k[0]) * x) / k[0], vy = (cy - (1 - k[1]) * 0.5) / k[1];
      return [vx * caixaW, (1 - vy) * caixaH];
    };
    const posiciona = (p: Cam) => {
      if (!hero) return;
      const [ax, ay] = naTela(ALVO, dProf.alvo, p);
      falha?.style.setProperty('transform', `translate3d(${ax.toFixed(1)}px, ${ay.toFixed(1)}px, 0)`);
      if (!feixes.length || !cartoes.length) return;
      mede();
      // como na arte do GPT: os fios nascem no óculo, descem juntos pela coluna de luz e pela escada,
      // abrem no piso em trilhos horizontais logo acima dos cartões e descem em ângulo reto até cada um
      const [tx, ty] = naTela(TOPO, dProf.topo, p);
      const [bx, by] = naTela(ORIGEM, dProf.origem, p);
      const n = destinos.length;
      const ordem = destinos.map((q, i) => i).sort((a, b) => Math.abs(destinos[b][0] - bx) - Math.abs(destinos[a][0] - bx));
      const f = (v: number) => String(Math.round(v));   // pixel inteiro: o SVG só redesenha quando o fio anda de fato
      const d = destinos.map(([dx, dy], i) => {
        const k = i - (n - 1) / 2;
        const x0 = tx + k * 5, x1 = bx + k * 9;              // feixe junto na coluna, um pouco mais aberto no piso
        const linha = ordem.indexOf(i);                       // o mais distante corre mais alto
        const topoCartao = Math.min(...destinos.map((q) => q[1]));
        const hy = Math.max(by + 30, topoCartao - 26 - (n - 1 - linha) * 11);
        const lado = dx < x1 ? -1 : 1;
        const R = Math.max(2, Math.min(34, Math.abs(dx - x1) / 2, (hy - by) / 2, (dy - hy) / 2));
        const R2 = Math.max(2, Math.min(18, Math.abs(dx - x1) / 2, (dy - hy) / 2));
        return `M${f(x0)} ${f(Math.min(ty, -20))}L${f(x0)} ${f(ty)}L${f(x1)} ${f(by)}L${f(x1)} ${f(hy - R)}`
          + `Q${f(x1)} ${f(hy)} ${f(x1 + lado * R)} ${f(hy)}L${f(dx - lado * R2)} ${f(hy)}`
          + `Q${f(dx)} ${f(hy)} ${f(dx)} ${f(hy + R2)}L${f(dx)} ${f(dy)}`;
      });
      const chave = d.join('|');
      if (chave === ultimoD) return;
      ultimoD = chave;
      feixes.forEach((f, i) => f.setAttribute('d', d[i % d.length] ?? ''));
      nos.forEach((no, i) => { const [dx, dy] = destinos[i] ?? [0, 0]; no.setAttribute('cx', String(Math.round(dx))); no.setAttribute('cy', String(Math.round(dy))); });
    };
    const tc = atrio ? document.querySelector<HTMLElement>('.m-abre-tc') : null;
    const painel = atrio ? document.querySelector<HTMLElement>('.m-abre') : null;

    const dimensiona = () => {
      const r = caixa.getBoundingClientRect();
      const k = Math.min(devicePixelRatio || 1, leve ? 1 : 1.25) * escala;
      const w = Math.max(2, Math.round(r.width * k)), h = Math.max(2, Math.round(r.height * k));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    };

    let ultimo = performance.now();
    const laco = () => {
      if (!gl || !vivo || !visivel || document.hidden) { raf = 0; return; }
      // contexto perdido sem o evento chegar (driver, aba em segundo plano): mostra a imagem parada
      if (gl.isContextLost()) { vivo = false; raf = 0; cv.classList.remove('is-on'); if (abrindo) encerra(0); return; }
      const agora = performance.now();
      // a cena se mexe devagar: 30 quadros por segundo bastam (a abertura roda cheia). Metade da GPU e da CPU.
      if (!abrindo && agora - ultimo < 31) { raf = requestAnimationFrame(laco); return; }
      const dt = Math.min(0.05, (agora - ultimo) / 1000); ultimo = agora;
      const t = (agora - t0) / 1000;
      // resolução que se ajusta: se o quadro passa de ~22 ms, renderiza menor
      tempos.push(dt); if (tempos.length > 40) tempos.shift();
      if (tempos.length === 40) { const m = tempos.reduce((a, b) => a + b) / 40;
        if (m > (abrindo ? 0.022 : 0.045) && escala > 0.5) { escala -= 0.1; tempos.length = 0; } else if (m < (abrindo ? 0.012 : 0.036) && escala < 0.9) { escala += 0.05; tempos.length = 0; } }
      dimensiona();
      // câmera com inércia; parada, deriva sozinha
      const k = 1 - Math.exp(-dt * 2.4);
      cam.x += (cam.tx + Math.sin(t * 0.13 + fase * 5) * 0.25 - cam.x) * k;
      cam.y += (cam.ty + Math.sin(t * 0.17 + fase * 3) * 0.2 - cam.y) * k;
      const r = secao.getBoundingClientRect();
      const rolagem = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height)));
      // abertura: avança pelo tempo de quadro (aba escondida não pula etapas)
      if (abrindo && raiz.classList.contains('k-fim')) encerra(t); // prazo de segurança do <head>
      if (abrindo) {
        A += dt * vel;
        const fixoA = (window as unknown as { __abreFixo?: number }).__abreFixo;
        if (typeof fixoA === 'number') A = fixoA;
        const f = String(FASES.filter((x) => A >= x).length);
        if (raiz.dataset.abre !== f) raiz.dataset.abre = f;
        if (tc) tc.textContent = `00:0${Math.min(A, 5).toFixed(1)}`;
        painel?.style.setProperty('--p', Math.min(1, A / FIM_ABRE).toFixed(3));
        if (A >= FIM_ABRE) encerra(t);
      }
      const zoomA = A < 99 ? 1 + 0.2 * (1 - suave(0, 5, A)) : 1;
      const diag = A < 99 ? suave(2.2, 2.9, A) * (1 - suave(3.4, 4.4, A)) : 0;
      const foco = 1 + 0.5 * diag;
      const sep = A < 99 ? suave(2.4, 3, A) * (1 - suave(3.5, 4.3, A)) : 0;
      // inspeção: 2,8 s a cada 9 s (a primeira logo ao entrar; depois da abertura, 6 s depois dela)
      const ci = tFim === Infinity ? -1 : tFim >= 0 ? (t - tFim + 2.8) % 9 : (t + 7.2) % 9;
      const fixo = (window as unknown as { __inspFixo?: number }).__inspFixo;
      const insp = typeof fixo === 'number' ? fixo : ci >= 0 && ci < 2.8 && (tFim < 0 || t - tFim > 6) ? ci / 2.8 : -1;
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform2f(U.uRes, cv.width, cv.height); gl.uniform2f(U.uCam, cam.x, cam.y); gl.uniform2f(U.uProfTx, profTx[0], profTx[1]); gl.uniform2f(U.uArteTx, arteTx[0], arteTx[1]);
      gl.uniform1f(U.uImgA, imgA); gl.uniform1f(U.uPosX, x); gl.uniform1f(U.uT, t); gl.uniform1f(U.uScroll, rolagem);
      gl.uniform1f(U.uFase, fase); gl.uniform1f(U.uInsp, insp);
      gl.uniform1f(U.uAbre, A); gl.uniform1f(U.uZoomA, zoomA); gl.uniform1f(U.uFoco, foco); gl.uniform1f(U.uSep, sep); gl.uniform2f(U.uAlvo, ALVO[0], ALVO[1]);
      if (atrio) {
        const zoom = (1.07 + 0.05 * (1 - rolagem)) * zoomA;
        posiciona({ zoom, foco, ox: cam.x * 0.024, oy: cam.y * 0.016 + (rolagem - 0.5) * 0.05 });
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!cv.classList.contains('is-on')) cv.classList.add('is-on');
      raf = requestAnimationFrame(laco);
    };

    // a GPU pode descartar o contexto (outra aba pesada, driver, muitos canvas): o canvas virava um painel
    // cinza-claro por cima da arte. Perdeu: some e a imagem parada aparece; voltou: monta de novo
    const perdeu = (e: Event) => {
      e.preventDefault(); vivo = false; cancelAnimationFrame(raf); raf = 0;
      cv.classList.remove('is-on'); if (abrindo) encerra(0);
    };
    const voltou = () => { iniciado = false; if (visivel && !morto) inicia(); else gl = null; };
    cv.addEventListener('webglcontextlost', perdeu);
    cv.addEventListener('webglcontextrestored', voltou);

    // longe da tela por uns segundos, o contexto dorme (libera a memória da GPU); ao voltar, acorda.
    // assim só 1 ou 2 dos 5 canvas da página existem na GPU ao mesmo tempo
    // (a extensão é guardada antes de dormir: com o contexto perdido, getExtension devolve null)
    let dormindo = false, sono = 0, extSono: WEBGL_lose_context | null = null;
    const adormece = () => { extSono = gl?.getExtension('WEBGL_lose_context') ?? null; if (extSono && !visivel && !morto) { dormindo = true; extSono.loseContext(); } };
    const acorda = () => { if (!dormindo) return; dormindo = false; if (extSono) extSono.restoreContext(); else voltou(); };

    const io = new IntersectionObserver(([e]) => {
      visivel = e.isIntersecting;
      clearTimeout(sono);
      if (visivel) acorda(); else if (gl && !abrindo) sono = window.setTimeout(adormece, 4000);
      if (visivel && !iniciado) inicia();
      if (visivel && vivo && !raf) { ultimo = performance.now(); laco(); }
    }, { rootMargin: '150px 0px' });
    io.observe(caixa);
    const move = (e: PointerEvent) => { cam.tx = (e.clientX / innerWidth - 0.5) * 2; cam.ty = -(e.clientY / innerHeight - 0.5) * 2; };
    const sai = () => { cam.tx = 0; cam.ty = 0; };
    const vis = () => { if (!document.hidden && visivel && vivo && !raf) { ultimo = performance.now(); laco(); } };
    addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', sai);
    document.addEventListener('visibilitychange', vis);

    return () => {
      morto = true; vivo = false; cancelAnimationFrame(raf); io.disconnect(); clearTimeout(sono);
      cv.removeEventListener('webglcontextlost', perdeu); cv.removeEventListener('webglcontextrestored', voltou);
      desligaPulo.forEach((f) => f());
      removeEventListener('pointermove', move); document.documentElement.removeEventListener('pointerleave', sai);
      document.removeEventListener('visibilitychange', vis);
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [arte, prof, x, fase, atrio]);

  return <canvas ref={ref} className="m-gl" aria-hidden="true" />;
}
