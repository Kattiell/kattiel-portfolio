'use client';

import { useEffect } from 'react';

// Identidade em movimento: a "linha de inspeção" do QA.
// Retícula no lugar do cursor, leitura de coordenadas no átrio, contadores, faixa que acelera com a rolagem,
// trilho de progresso e revelação dos blocos (uma vez, por máscara, sem deslize lateral). Tudo desligado com prefers-reduced-motion (os números ficam fixos).

export default function Movimento() {
  useEffect(() => {
    const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fino = matchMedia('(pointer: fine)').matches;
    const raiz = document.documentElement;
    const limpar: (() => void)[] = [];
    const on = <K extends keyof WindowEventMap>(t: K, f: (e: WindowEventMap[K]) => void) => {
      window.addEventListener(t, f as EventListener, { passive: true });
      limpar.push(() => window.removeEventListener(t, f as EventListener));
    };

    // ---- contadores: sobem de 0 ao valor real quando entram na tela ----
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          const el = e.target as HTMLElement;
          const final = el.textContent ?? '';
          const m = final.match(/^([\d.]+)(.*)$/);
          if (!m || reduz) return;
          const alvo = Number(m[1].replace(/\./g, ''));
          const t0 = performance.now();
          const dur = 1600;
          const passo = (t: number) => {
            const p = Math.min(1, (t - t0) / dur);
            const v = Math.round(alvo * (1 - Math.pow(1 - p, 4)));
            el.textContent = v.toLocaleString('pt-BR') + m[2];
            if (p < 1) requestAnimationFrame(passo);
            else el.textContent = final;
          };
          requestAnimationFrame(passo);
        }),
      { threshold: 0.6 },
    );
    document.querySelectorAll('.m-numeros strong').forEach((n) => io.observe(n));
    limpar.push(() => io.disconnect());

    // ---- trilho: qual espaço do edifício está na tela ----
    const marcas = [...document.querySelectorAll<HTMLAnchorElement>('.m-trilho a')];
    const io2 = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          marcas.forEach((a) => a.classList.toggle('is-on', a.hash === `#${e.target.id}`));
        }),
      { rootMargin: '-45% 0px -45% 0px' },
    );
    document.querySelectorAll('.m-cap, #projetos, #metodo, #sobre').forEach((s) => io2.observe(s));
    limpar.push(() => io2.disconnect());

    if (reduz) return () => limpar.forEach((f) => f());
    raiz.classList.add('m-vivo');
    limpar.push(() => raiz.classList.remove('m-vivo'));

    // ---- revelação: cada bloco entra uma vez quando aparece; depois fica parado ----
    const io3 = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          io3.unobserve(e.target);
          e.target.classList.add('is-visto');
        }),
      { rootMargin: '0px 0px -12% 0px' },
    );
    document.querySelectorAll('.m-projeto, .m-cap-txt, .m-cab, .m-sobre, .m-lab, .m-xp>li, .m-rodape').forEach((el) => io3.observe(el));
    limpar.push(() => io3.disconnect());

    // ---- velocidade da rolagem: a faixa acelera e inclina ----
    // a variável vai só na faixa (no <html> ela recalculava o estilo da página inteira a cada quadro),
    // e o laço só roda enquanto a página rola: parada, a CPU fica livre
    const faixa = document.querySelector<HTMLElement>('.m-faixa');
    let ultimoY = scrollY;
    let vel = 0;
    let raf = 0;
    let escrito = '';
    const laco = () => {
      const y = scrollY;
      vel += (y - ultimoY - vel) * 0.12;
      ultimoY = y;
      vel *= 0.9;
      const v = Math.abs(vel) < 0.05 ? '0' : vel.toFixed(1);
      if (v !== escrito && faixa) { faixa.style.setProperty('--m-vel', v); escrito = v; }
      raf = v === '0' ? 0 : requestAnimationFrame(laco);
    };
    on('scroll', () => { if (!raf) { ultimoY = scrollY; raf = requestAnimationFrame(laco); } });
    limpar.push(() => cancelAnimationFrame(raf));

    if (!fino) return () => limpar.forEach((f) => f());

    // ---- retícula + leitura de coordenadas ----
    const ret = document.createElement('div');
    ret.className = 'm-reticula';
    ret.setAttribute('aria-hidden', 'true');
    ret.innerHTML = '<i></i><b></b>';
    document.body.appendChild(ret);
    raiz.classList.add('m-mira');
    limpar.push(() => raiz.classList.remove('m-mira'));
    limpar.push(() => ret.remove());
    const rotulo = ret.querySelector('b')!;
    const leitura = document.querySelector<HTMLElement>('.m-hud-xy');
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    on('pointermove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      ret.classList.add('is-on');
      if (leitura) leitura.textContent = `X ${String(Math.round(mx)).padStart(4, '0')} · Y ${String(Math.round(my + scrollY)).padStart(4, '0')}`;
      const alvo = (e.target as Element | null)?.closest?.('a, button, [data-cursor]');
      ret.classList.toggle('is-alvo', !!alvo);
      rotulo.textContent = alvo ? (alvo.getAttribute('data-cursor') ?? (alvo.matches('.m-projeto-capa') ? 'Abrir' : '')) : '';
      if (!raf2) raf2 = requestAnimationFrame(segue);
    });
    on('pointerdown', () => ret.classList.add('is-clique'));
    on('pointerup', () => ret.classList.remove('is-clique'));
    const segue = () => {
      rx += (mx - rx) * 0.22;
      ry += (my - ry) * 0.22;
      ret.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      // chegou no cursor: para até o próximo movimento
      raf2 = Math.abs(mx - rx) + Math.abs(my - ry) < 0.4 ? 0 : requestAnimationFrame(segue);
    };
    let raf2 = 0;
    limpar.push(() => cancelAnimationFrame(raf2));

    return () => limpar.forEach((f) => f());
  }, []);

  return null;
}
