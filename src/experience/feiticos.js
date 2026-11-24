/*
 * Feitiços no estilo do Pottermore: a varinha desenha no ar o gesto do feitiço (um traço de luz contínuo,
 * com faíscas soltando da ponta), o desenho completo acende, se recolhe na fechadura e a grade sobe.
 *
 * Fluido e sem engasgo:
 *  - tudo é desenhado com 3 objetos criados UMA vez (fita do traço, brilho da ponta, partículas);
 *  - nenhuma luz é criada (trocar a contagem de luzes recompila todos os shaders): usa a luz do próprio portal;
 *  - os shaders compilam na carga (aquecer); por feitiço só muda a geometria da fita e os uniformes;
 *  - as partículas são calculadas na GPU a partir do instante em que nasceram (o JS só grava o nascimento).
 */
import * as THREE from 'three';
import { makeCanvas } from './materials.js';

const N_PART = 900;

/* ---------------- gestos (coordenadas no plano do portal, de -1 a 1) ---------------- */
const amostra = (f, n = 140) => Array.from({ length: n }, (_, i) => f(i / (n - 1)));
const poli = (pts) => { // polilinha → curva suave (Catmull-Rom) com pontos espaçados
  const c = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal', 0.5);
  return c.getSpacedPoints(160).map((v) => [v.x, v.y]);
};
const GESTOS = {
  1: () => amostra((t) => { const a = t * Math.PI * 5.2, r = 0.08 + t * 0.78; return [Math.cos(a) * r, Math.sin(a) * r * 0.9 + t * 0.08]; }),   // Lumos Maxima: espiral que abre
  2: () => poli([[0, 0.92], [-0.75, 0.55], [-0.7, -0.35], [0, -0.92], [0.7, -0.35], [0.75, 0.55], [0, 0.92], [0, -0.6]]),                       // Protego: escudo e o golpe no meio
  3: () => poli([[-0.1, 0.9], [-0.1, -0.2], [0.25, -0.45], [0.05, -0.8], [-0.35, -0.55], [-0.1, -0.2], [0.55, 0.15]]),                          // Alohomora: haste e argola da chave
  4: () => amostra((t) => [-0.95 + t * 1.9, Math.sin(t * Math.PI * 3) * 0.42 * (1 - t * 0.3) - t * 0.15]),                                     // Aguamenti: onda
  5: () => poli([[-0.7, 0.85], [0.15, 0.3], [-0.35, 0.1], [0.45, -0.35], [-0.05, -0.45], [0.7, -0.9]]),                                         // Confringo: raio
  6: () => poli([[-0.85, 0.6], [0.0, -0.15], [0.85, 0.6], [0.0, -0.15], [0.0, -0.95]]),                                                          // Accio: puxa para si
  7: () => poli([[-0.9, 0.2], [-0.45, -0.55], [0.15, -0.6], [0.55, -0.05], [0.7, 0.75], [0.85, 0.25]]),                                         // Wingardium Leviosa: "girar e sacudir"
  8: () => poli([[-0.75, 0.8], [0.75, -0.8], [0.6, -0.55], [-0.6, 0.0], [0.75, 0.75]]),                                                         // Diffindo: cortes cruzados
  9: () => amostra((t) => { const a = t * Math.PI * 2; return [Math.cos(a) * 0.85, Math.sin(a) * 0.42 * Math.abs(Math.cos(a * 0.5)) * 1.6]; }).concat(amostra((t) => { const a = t * Math.PI * 2; return [Math.cos(a) * 0.18, Math.sin(a) * 0.18]; }, 40)), // Revelio: olho e pupila
  10: () => amostra((t) => { const a = t * Math.PI * 2 + Math.PI / 2, s = 1 + Math.sin(a) ** 2; return [Math.cos(a) / s * 0.95, Math.sin(a) * Math.cos(a) / s * 1.3]; }, 180), // Expecto Patronum: laço infinito
  11: () => amostra((t) => { const a = t * Math.PI * 3; return [Math.sin(a) * 0.35 * (1 - t), -0.9 + t * 1.75]; }).concat(poli([[0, 0.85], [-0.45, 0.45], [0, 0.6], [0.45, 0.45], [0, 0.85]]).slice(0, 60)), // Herbivicus: broto subindo e folha
  12: () => poli([[-0.75, -0.85], [-0.35, 0.1], [-0.15, -0.3], [0.05, 0.8], [0.25, -0.3], [0.45, 0.1], [0.75, -0.85]]),                          // Incendio: chama
};

/* ---------------- materiais (criados uma vez) ---------------- */
function matFita() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    uniforms: { uProg: { value: 0 }, uFlare: { value: 0 }, uFade: { value: 1 }, uT: { value: 0 }, uCor: { value: new THREE.Color() } },
    vertexShader: `attribute float aS; attribute float aLado; varying float vS; varying float vLado;
      void main(){ vS = aS; vLado = aLado; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uProg; uniform float uFlare; uniform float uFade; uniform float uT; uniform vec3 uCor;
      varying float vS; varying float vLado;
      void main(){
        if (vS > uProg) discard;
        float x = abs(vLado);
        float nucleo = pow(1.0 - x, 5.0);                               // fio branco no centro
        float halo = pow(1.0 - x, 1.6) * 0.45;                          // aura colorida em volta
        float cauda = mix(0.45, 1.0, smoothstep(uProg - 0.35, uProg, vS)); // o começo do traço esfria um pouco
        float ponta = smoothstep(uProg - 0.03, uProg, vS);              // ponta quente
        float cint = 0.85 + 0.15 * sin(vS * 140.0 - uT * 18.0);          // cintilação correndo pelo traço
        vec3 c = mix(uCor * 1.4, vec3(1.0), nucleo * 0.8 + ponta * 0.5) * (1.0 + uFlare * 1.1);
        float a = (nucleo + halo) * cauda * cint * uFade;
        gl_FragColor = vec4(c * a, a);
      }`,
  });
}

function texPonto() {
  const c = makeCanvas(64, 64); const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}

function particulas(tex) {
  const g = new THREE.BufferGeometry();
  const nasc = new Float32Array(N_PART * 4).fill(-99), vel = new Float32Array(N_PART * 4);
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N_PART * 3), 3));   // origem
  g.setAttribute('aNasc', new THREE.BufferAttribute(nasc, 4));   // instante, vida, tamanho, brilho
  g.setAttribute('aVel', new THREE.BufferAttribute(vel, 4));     // velocidade (xyz) + gravidade
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: { uT: { value: 0 }, uMapa: { value: tex }, uCor: { value: new THREE.Color() }, uEscala: { value: innerHeight / 2 } },
    vertexShader: `attribute vec4 aNasc; attribute vec4 aVel; uniform float uT; uniform float uEscala; varying float vA; varying float vB;
      void main(){
        float idade = uT - aNasc.x; float k = idade / aNasc.y;
        if (k < 0.0 || k > 1.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return; }
        float arrasto = (1.0 - exp(-idade * 2.2)) / 2.2;                // velocidade que se esvai
        vec3 p = position + aVel.xyz * arrasto + vec3(0.0, -aVel.w * idade * idade * 0.5, 0.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = aNasc.z * (1.0 - k * 0.6) * uEscala / -mv.z;
        vA = (1.0 - k) * (1.0 - k); vB = aNasc.w;
      }`,
    fragmentShader: `uniform sampler2D uMapa; uniform vec3 uCor; varying float vA; varying float vB;
      void main(){ float a = texture2D(uMapa, gl_PointCoord).a * vA; gl_FragColor = vec4(mix(uCor, vec3(1.0), 0.35) * vB * a, a); }`,
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 5;
  let k = 0;
  return {
    pts, m,
    solta(p, v, vida, tam, brilho, grav, t) {
      const i = k; k = (k + 1) % N_PART;
      g.attributes.position.setXYZ(i, p.x, p.y, p.z);
      g.attributes.aNasc.setXYZW(i, t, vida, tam, brilho);
      g.attributes.aVel.setXYZW(i, v.x, v.y, v.z, grav);
      g.attributes.position.needsUpdate = g.attributes.aNasc.needsUpdate = g.attributes.aVel.needsUpdate = true;
    },
  };
}

/* ---------------- sistema ---------------- */
export function criarFeiticos(scene, { renderer, camera } = {}) {
  const tex = texPonto();
  const fita = new THREE.Mesh(new THREE.BufferGeometry(), matFita()); fita.frustumCulled = false; fita.renderOrder = 6; fita.visible = false;
  const ponta = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  ponta.visible = false; ponta.renderOrder = 7;
  const part = particulas(tex);
  scene.add(fita, ponta, part.pts);
  addEventListener('resize', () => { part.m.uniforms.uEscala.value = innerHeight / 2; });
  let relogio = 0;   // tempo próprio das partículas (continua correndo entre feitiços)

  /** Compila os shaders agora (na carga), para o primeiro feitiço não engasgar. */
  function aquecer() {
    if (!renderer || !camera) return;
    fita.geometry = fitaGeo([[0, 0], [0.1, 0.1], [0.2, 0]], new THREE.Matrix4(), 0.1).g; fita.visible = ponta.visible = true;
    renderer.compile(scene, camera);
    fita.visible = ponta.visible = false;
  }

  function fitaGeo(gesto, mat, larg) {
    const n = gesto.length, pos = new Float32Array(n * 2 * 3), s = new Float32Array(n * 2), lado = new Float32Array(n * 2), idx = [];
    let tot = 0; const comp = [0];
    for (let i = 1; i < n; i++) { tot += Math.hypot(gesto[i][0] - gesto[i - 1][0], gesto[i][1] - gesto[i - 1][1]); comp.push(tot); }
    const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const a = gesto[Math.max(0, i - 1)], b = gesto[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      const afina = 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, comp[i] / tot * 1.05));   // mais fino nas pontas
      for (const [j, sg] of [[0, -1], [1, 1]]) {
        v.set(gesto[i][0] - ty * larg * afina * sg, gesto[i][1] + tx * larg * afina * sg, 0).applyMatrix4(mat);
        pos.set([v.x, v.y, v.z], (i * 2 + j) * 3); s[i * 2 + j] = comp[i] / tot; lado[i * 2 + j] = sg;
      }
      if (i < n - 1) { const q = i * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aS', new THREE.BufferAttribute(s, 1)); g.setAttribute('aLado', new THREE.BufferAttribute(lado, 1));
    g.setIndex(idx); return { g, comp, tot };
  }

  /**
   * Lança o feitiço do portal. Devolve { update(dt) → true quando o portal terminou de abrir, dispose() }.
   * onFlash(k): clarão de tela opcional · reduced: versão curta, sem câmera e com menos partículas.
   */
  function lancar(portal, varinha, { reduced = false, onFlash } = {}) {
    const d = portal.d, cor = new THREE.Color(d.color);
    const escala = 1.6;   // o gesto ocupa ~3,2 m, logo na frente da grade
    // plano do gesto: na frente da boca, voltado para o salão
    const base = new THREE.Matrix4().makeTranslation(0, 3.0, 0.75).premultiply(portal.grp.matrixWorld)
      .multiply(new THREE.Matrix4().makeScale(escala, escala, 1));
    const gesto = (GESTOS[d.id] || GESTOS[1])();
    const { g, comp, tot } = fitaGeo(gesto, base, 0.12);
    fita.geometry.dispose(); fita.geometry = g; fita.visible = true;
    const u = fita.material.uniforms; u.uCor.value.copy(cor); u.uProg.value = 0; u.uFlare.value = 0; u.uFade.value = 1;
    part.m.uniforms.uCor.value.copy(cor);
    ponta.visible = true; ponta.material.color.copy(cor).lerp(new THREE.Color(1, 1, 1), 0.5);

    const pontoEm = (s) => {   // posição no mundo a uma fração s do comprimento do traço
      const alvo = s * tot; let i = 1; while (i < comp.length - 1 && comp[i] < alvo) i++;
      const a = gesto[i - 1], b = gesto[i], f = (alvo - comp[i - 1]) / Math.max(1e-6, comp[i] - comp[i - 1]);
      return new THREE.Vector3(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, 0).applyMatrix4(base);
    };
    const inicio = pontoEm(0), fechadura = portal.grp.localToWorld(new THREE.Vector3(0, 2.0, 0.4));
    const T = reduced ? { voo: 0.12, traco: 0.55, brilho: 0.18, fecha: 0.35 } : { voo: 0.28, traco: 1.15, brilho: 0.32, fecha: 0.7 };
    const fim = T.voo + T.traco + T.brilho + T.fecha;
    let t = 0, explodiu = false, acumulo = 0;
    const tmp = new THREE.Vector3(), v = new THREE.Vector3();
    const rnd = (a, b) => a + Math.random() * (b - a);

    return {
      update(dt) {
        dt *= window.__feiticoLento || 1;   // câmera lenta para conferência (__feiticoLento = 0.2)
        t += dt; relogio += dt; part.m.uniforms.uT.value = relogio; u.uT.value = relogio;
        const taxa = reduced ? 0.35 : 1;
        if (t < T.voo) {   // 1. a faísca sai da varinha até o começo do gesto
          const k = t / T.voo, e = k * k * (3 - 2 * k);
          tmp.copy(varinha).lerp(inicio, e).y += Math.sin(k * Math.PI) * 0.6;
          ponta.position.copy(tmp); ponta.scale.setScalar(0.35);
          acumulo += dt * 120 * taxa;
        } else if (t < T.voo + T.traco) {   // 2. o gesto é desenhado
          const k = (t - T.voo) / T.traco, e = 1 - Math.pow(1 - k, 2.2) * (1 - k * 0.2);
          u.uProg.value = e; tmp.copy(pontoEm(Math.min(1, e))); ponta.position.copy(tmp);
          ponta.scale.setScalar(0.42 + Math.sin(relogio * 30) * 0.05);
          acumulo += dt * 150 * taxa;
        } else if (t < T.voo + T.traco + T.brilho) {   // 3. o desenho inteiro acende e solta faíscas
          const k = (t - T.voo - T.traco) / T.brilho;
          u.uProg.value = 1.001; u.uFlare.value = Math.sin(k * Math.PI);
          ponta.scale.setScalar(0.42 + k * 0.5); ponta.material.opacity = 1 - k;
          if (!explodiu) {
            explodiu = true; onFlash?.(0.35);
            const n = reduced ? 120 : 340;
            for (let i = 0; i < n; i++) { const p = pontoEm(Math.random()); v.set(rnd(-1, 1), rnd(-0.6, 1.2), rnd(-0.4, 1)).multiplyScalar(rnd(1.2, 3.2)); part.solta(p, v, rnd(0.6, 1.3), rnd(0.06, 0.14), rnd(1.2, 2.2), 2.5, relogio); }
          }
        } else {   // 4. o desenho se recolhe na fechadura e a grade sobe
          const k = Math.min(1, (t - T.voo - T.traco - T.brilho) / T.fecha), e = k * k;
          u.uFade.value = 1 - e; u.uFlare.value = (1 - e) * 0.4;
          ponta.visible = false;
          fita.scale.setScalar(1);   // a fita está em coordenadas de mundo
          portal.open = Math.max(portal.open, k);
        }
        // faíscas soltando da ponta, distribuídas no tempo (sem picos)
        while (acumulo >= 1) {
          acumulo -= 1;
          v.set(rnd(-0.5, 0.5), rnd(-0.2, 0.7), rnd(-0.3, 0.5));
          part.solta(ponta.position, v, rnd(0.35, 0.8), rnd(0.04, 0.09), rnd(1, 1.8), 1.6, relogio);
        }
        // a luz do próprio portal acompanha (luz já existente: nada recompila)
        // (a luz do portal é controlada em districts.js: subir aqui estourava o bloom)
        // atração da fechadura: últimas faíscas correm para ela
        if (t > T.voo + T.traco + T.brilho && Math.random() < 0.6 * taxa) { const p = pontoEm(Math.random()); v.copy(fechadura).sub(p).multiplyScalar(1.4); part.solta(p, v, 0.55, 0.07, 1.6, 0, relogio); }
        return t >= fim;
      },
      dispose() { fita.visible = false; ponta.visible = false; ponta.material.opacity = 1; },
    };
  }

  return { lancar, aquecer };
}
