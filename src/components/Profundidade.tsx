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

void main(){
  // aproximação lenta com a rolagem + margem para o parallax não mostrar borda
  float zoom = 1.07 + .05 * (1. - uScroll);
  vec2 base = .5 + (cobre(v) - .5) / zoom;
  base.x += (uPosX - .5) * .04;

  // câmera: cursor + deriva lenta + rolagem (sobe/desce entre os planos)
  vec2 off = uCam * vec2(.024, .016) + vec2(0., (uScroll - .5) * .05);
  vec2 q = base; float d = 0.;
  for (int i = 0; i < 5; i++){ d = texture(uProf, q).r; q = base + off * (d - .38); }

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
    vec2 t = uArteTx * 2.6;
    float l00 = dot(texture(uArte, q + t * vec2(-1, -1)).rgb, vec3(.3, .59, .11)), l10 = dot(texture(uArte, q + t * vec2(0, -1)).rgb, vec3(.3, .59, .11)), l20 = dot(texture(uArte, q + t * vec2(1, -1)).rgb, vec3(.3, .59, .11));
    float l01 = dot(texture(uArte, q + t * vec2(-1, 0)).rgb, vec3(.3, .59, .11)), l21 = dot(texture(uArte, q + t * vec2(1, 0)).rgb, vec3(.3, .59, .11));
    float l02 = dot(texture(uArte, q + t * vec2(-1, 1)).rgb, vec3(.3, .59, .11)), l12 = dot(texture(uArte, q + t * vec2(0, 1)).rgb, vec3(.3, .59, .11)), l22 = dot(texture(uArte, q + t * vec2(1, 1)).rgb, vec3(.3, .59, .11));
    float sx = (l20 + 2. * l21 + l22) - (l00 + 2. * l01 + l02);
    float sy = (l02 + 2. * l12 + l22) - (l00 + 2. * l10 + l20);
    float contorno = smoothstep(.16, .38, length(vec2(sx, sy)));
    float silhueta = smoothstep(.02, .06, length(vec2(dx, dy)));
    float gx = fract(q.x * 64.); float gw = fwidth(q.x * 64.);
    float prumo = (1. - smoothstep(0., 1.2 * gw, min(gx, 1. - gx))) * .22 * (1. - d);
    float malha = max(max(contorno * .85, silhueta), prumo);
    c = mix(c, vec3(.05, .05, .06) + c * .25, mFaixa * .8);
    c += vec3(.91, .89, .85) * malha * mFaixa * .7;
    c += vec3(1., .2, .26) * smoothstep(.005, 0., abs(dist)) * .9;
    c += vec3(1., .2, .26) * malha * smoothstep(.045, 0., abs(dist));
  }

  // grão e vinheta discretos
  c += (h1(v * uRes + fract(uT) * 91.) - .5) * .025;
  c *= mix(.82, 1., smoothstep(1.05, .35, length((v - .5) * vec2(1.1, 1.3))));
  o = vec4(c, 1.);
}`;

type Props = { arte: string; prof: string; x?: number; fase?: number };

export default function Profundidade({ arte, prof, x = 0.5, fase = 0 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const caixa = cv.parentElement!;
    const secao = caixa.closest('section') ?? caixa;
    let gl: WebGL2RenderingContext | null = null;
    let raf = 0, vivo = false, visivel = false, iniciado = false, morto = false;
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
      if (!gl) return;
      const sh = (tipo: number, src: string) => { const s = gl!.createShader(tipo)!; gl!.shaderSource(s, src); gl!.compileShader(s);
        if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) throw new Error(gl!.getShaderInfoLog(s) ?? 'shader'); return s; };
      const pr = gl.createProgram()!;
      try { gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG)); }
      catch (e) { console.warn('[profundidade]', e); return; }
      gl.linkProgram(pr); gl.useProgram(pr);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const lp = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
      for (const n of ['uArte', 'uProf', 'uRes', 'uCam', 'uProfTx', 'uArteTx', 'uImgA', 'uPosX', 'uT', 'uScroll', 'uFase', 'uInsp']) U[n] = gl.getUniformLocation(pr, n);
      const [ia, ip] = await Promise.all([carrega(arte), carrega(prof)]);
      if (morto) return;
      imgA = ia.naturalWidth / ia.naturalHeight; arteTx = [1 / ia.naturalWidth, 1 / ia.naturalHeight]; profTx = [1 / ip.naturalWidth, 1 / ip.naturalHeight];
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      [ia, ip].forEach((im, i) => {
        const tx = gl!.createTexture(); gl!.activeTexture(gl!.TEXTURE0 + i); gl!.bindTexture(gl!.TEXTURE_2D, tx);
        gl!.texImage2D(gl!.TEXTURE_2D, 0, i ? gl!.R8 : gl!.RGB8, i ? gl!.RED : gl!.RGB, gl!.UNSIGNED_BYTE, im);
        gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR); gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
        gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE); gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      });
      gl.uniform1i(U.uArte, 0); gl.uniform1i(U.uProf, 1);
      vivo = true; if (visivel) laco();
    };

    const dimensiona = () => {
      const r = caixa.getBoundingClientRect();
      const k = Math.min(devicePixelRatio || 1, 1.25) * escala;
      const w = Math.max(2, Math.round(r.width * k)), h = Math.max(2, Math.round(r.height * k));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    };

    let ultimo = performance.now();
    const laco = () => {
      if (!gl || !vivo || !visivel || document.hidden) { raf = 0; return; }
      const agora = performance.now();
      const dt = Math.min(0.05, (agora - ultimo) / 1000); ultimo = agora;
      const t = (agora - t0) / 1000;
      // resolução que se ajusta: se o quadro passa de ~22 ms, renderiza menor
      tempos.push(dt); if (tempos.length > 40) tempos.shift();
      if (tempos.length === 40) { const m = tempos.reduce((a, b) => a + b) / 40;
        if (m > 0.022 && escala > 0.5) { escala -= 0.1; tempos.length = 0; } else if (m < 0.012 && escala < 0.9) { escala += 0.05; tempos.length = 0; } }
      dimensiona();
      // câmera com inércia; parada, deriva sozinha
      const k = 1 - Math.exp(-dt * 2.4);
      cam.x += (cam.tx + Math.sin(t * 0.13 + fase * 5) * 0.25 - cam.x) * k;
      cam.y += (cam.ty + Math.sin(t * 0.17 + fase * 3) * 0.2 - cam.y) * k;
      const r = secao.getBoundingClientRect();
      const rolagem = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height)));
      // inspeção: 2,8 s a cada 9 s (a primeira logo ao entrar)
      const ci = (t + 7.2) % 9;
      const fixo = (window as unknown as { __inspFixo?: number }).__inspFixo;
      const insp = typeof fixo === 'number' ? fixo : ci < 2.8 ? ci / 2.8 : -1;
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform2f(U.uRes, cv.width, cv.height); gl.uniform2f(U.uCam, cam.x, cam.y); gl.uniform2f(U.uProfTx, profTx[0], profTx[1]); gl.uniform2f(U.uArteTx, arteTx[0], arteTx[1]);
      gl.uniform1f(U.uImgA, imgA); gl.uniform1f(U.uPosX, x); gl.uniform1f(U.uT, t); gl.uniform1f(U.uScroll, rolagem);
      gl.uniform1f(U.uFase, fase); gl.uniform1f(U.uInsp, insp);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!cv.classList.contains('is-on')) cv.classList.add('is-on');
      raf = requestAnimationFrame(laco);
    };

    const io = new IntersectionObserver(([e]) => {
      visivel = e.isIntersecting;
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
      morto = true; vivo = false; cancelAnimationFrame(raf); io.disconnect();
      removeEventListener('pointermove', move); document.documentElement.removeEventListener('pointerleave', sai);
      document.removeEventListener('visibilitychange', vis);
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [arte, prof, x, fase]);

  return <canvas ref={ref} className="m-gl" aria-hidden="true" />;
}
