'use client';
/*
 * A metáfora da caverna como cena: a arte ocupa a largura toda, um foco de luz percorre os cantos
 * e o painel de vidro conta o canto em foco (onde fica, qual atividade, o que muda na entrega).
 * Anda sozinho enquanto está na tela; para de vez quando a pessoa escolhe um canto.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Image, { type StaticImageData } from 'next/image';
import Link from 'next/link';

export type Canto = { id: string; letra: string; atividade: string; x: number; y: number; canto: [string, string]; entrega: string };

const PASSO = 6.5; // segundos por canto

export default function CavernaTour({ arte, cantos }: { arte: StaticImageData; cantos: Canto[] }) {
  const [ativo, setAtivo] = useState(0);
  const [auto, setAuto] = useState(true);
  const [naTela, setNaTela] = useState(false);
  const [pausa, setPausa] = useState(false);
  const palco = useRef<HTMLDivElement>(null);
  const c = cantos[ativo];

  useEffect(() => {
    // com "reduzir movimento" o tour não anda sozinho (conta como fora da tela)
    const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = palco.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setNaTela(e.isIntersecting && !quieto), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const rodando = auto && naTela && !pausa;
  useEffect(() => {
    if (!rodando) return;
    const t = setTimeout(() => setAtivo((i) => (i + 1) % cantos.length), PASSO * 1000);
    return () => clearTimeout(t);
  }, [rodando, ativo, cantos.length]);

  const escolhe = (i: number) => { setAuto(false); setAtivo((i + cantos.length) % cantos.length); };

  // leve paralaxe com o mouse: a arte e os pinos andam juntos
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    e.currentTarget.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };

  return (
    <div
      ref={palco}
      className={`m-tour${rodando ? ' is-rodando' : ''}`}
      style={{ '--ax': `${c.x}%`, '--ay': `${c.y}%` } as CSSProperties}
      onPointerMove={move}
      onPointerEnter={() => setPausa(true)}
      onPointerLeave={(e) => { setPausa(false); e.currentTarget.style.setProperty('--mx', '0'); e.currentTarget.style.setProperty('--my', '0'); }}
    >
      <div className="m-tour-cena">
        <Image src={arte} alt="A caverna: garagem com o carro à esquerda, computador central, emblema no piso, doze túneis em duas galerias, sacadas no alto e um óculo de luz no teto." placeholder="blur" sizes="100vw" quality={85} />
        <i className="m-tour-foco" aria-hidden="true" />
        {cantos.map((k, i) => (
          <button
            key={k.id}
            type="button"
            className={`m-tour-pino${i === ativo ? ' is-on' : ''}`}
            style={{ '--x': k.x, '--y': k.y } as CSSProperties}
            aria-pressed={i === ativo}
            aria-label={`${k.letra}: ${k.canto[0]}, ${k.atividade}`}
            onClick={() => escolhe(i)}
          >
            <b aria-hidden="true">{k.letra}</b><span aria-hidden="true">{k.canto[0]}</span>
          </button>
        ))}
      </div>

      <div className="m-tour-painel">
        <div className="m-tour-topo">
          <span className="m-tour-n"><b>{c.letra}</b> / {cantos[cantos.length - 1].letra}</span>
          <span className="m-tour-nav">
            <button type="button" onClick={() => escolhe(ativo - 1)} aria-label="Canto anterior">←</button>
            <button type="button" onClick={() => escolhe(ativo + 1)} aria-label="Próximo canto">→</button>
          </span>
        </div>
        <div className="m-tour-texto" key={c.id} aria-live="polite">
          <p className="m-tour-onde">{c.canto[0]} <span>· {c.canto[1]}</span></p>
          <h3>{c.atividade}</h3>
          <p className="m-tour-entrega"><b>Na entrega</b>{c.entrega}</p>
        </div>
        <ol className="m-tour-abas" aria-label="Cantos da caverna">
          {cantos.map((k, i) => (
            <li key={k.id}>
              <button type="button" className={i === ativo ? 'is-on' : undefined} aria-current={i === ativo ? 'step' : undefined} onClick={() => escolhe(i)}>
                <i style={i === ativo ? ({ '--t': `${PASSO}s` } as CSSProperties) : undefined} key={i === ativo ? `${ativo}-${rodando}` : k.id} />
                <span>{k.letra}</span>
              </button>
            </li>
          ))}
        </ol>
        <Link href={`/arquivo#${c.id}`} prefetch={false} className="m-tour-ir">Ver este canto em 3D <span aria-hidden="true">→</span></Link>
      </div>
    </div>
  );
}
