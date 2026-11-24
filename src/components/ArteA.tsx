// Peças gráficas da arte A (portão + faixa): monograma K/, coroa de louros, ícones de linha dourada.
import type { ReactNode } from 'react';

/** Monograma K/ em serifa romana, com a barra diagonal da arte. */
export function KMono({ className }: { className?: string }) {
  return (
    <span className={`ka-mono ${className ?? ''}`} aria-hidden="true">
      <span className="ka-mono-k">K</span>
      <span className="ka-mono-bar" />
    </span>
  );
}

/** Coroa de louros dourada em volta do monograma (faixa Manifesto). Ramo esquerdo desenhado; o direito é o espelho. */
export function Louros() {
  // caule em arco de baixo (110 graus) até o alto (212 graus); folhas em pares (fora e dentro) apontando para onde o caule cresce
  const FOLHA = 'M0 0 C3.6 -4 4 -11 0 -17 C-4 -11 -3.6 -4 0 0Z';
  const ramo = (
    <g>
      <path d="M46.4 101.8 A44 44 0 0 1 31.7 26.3" fill="none" stroke="url(#ka-ouro)" strokeWidth="1.8" />
      {Array.from({ length: 7 }, (_, i) => {
        const graus = 110 + i * 17;
        const a = (graus * Math.PI) / 180;
        const x = 60 + 44 * Math.cos(a), y = 60 + 44 * Math.sin(a);
        const cresce = graus + 180; // rotação que faz a folha (que nasce apontando para -y) seguir o caule
        return (
          <g key={i} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}>
            <path d={FOLHA} transform={`rotate(${(cresce - 42).toFixed(1)}) scale(${(1.05 - i * 0.05).toFixed(3)})`} />
            <path d={FOLHA} transform={`rotate(${(cresce + 34).toFixed(1)}) scale(${(0.85 - i * 0.045).toFixed(3)})`} />
          </g>
        );
      })}
    </g>
  );
  return (
    <svg className="ka-louros" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id="ka-ouro" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F1D39A" /><stop offset=".55" stopColor="#D9AA67" /><stop offset="1" stopColor="#8E6532" />
        </linearGradient>
      </defs>
      <g fill="url(#ka-ouro)">
        {ramo}
        <g transform="translate(120 0) scale(-1 1)">{ramo}</g>
      </g>
      <path d="M50 106 Q60 100 70 106 M60 101 L60 110" stroke="url(#ka-ouro)" strokeWidth="2" fill="none" />
    </svg>
  );
}

const Linha = ({ children, vb = '0 0 48 48' }: { children: ReactNode; vb?: string }) => (
  <svg className="ka-ico" viewBox={vb} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

export const IcoCodigo = () => <Linha><path d="M16 12 L5 24 L16 36 M32 12 L43 24 L32 36 M28 8 L20 40" /></Linha>;
export const IcoEscudo = () => <Linha><path d="M24 4 L40 10 V22 C40 33 33 40 24 44 C15 40 8 33 8 22 V10 Z" /><path d="M16 24 L22 30 L33 18" /></Linha>;
export const IcoChip = () => (
  <Linha>
    <rect x="11" y="11" width="26" height="26" rx="2" />
    <path d="M17 4v7M24 4v7M31 4v7M17 37v7M24 37v7M31 37v7M4 17h7M4 24h7M4 31h7M37 17h7M37 24h7M37 31h7" strokeWidth="1.8" />
    <text x="24" y="29" textAnchor="middle" fill="currentColor" stroke="none" fontSize="13" fontWeight="700" fontFamily="var(--font-sans)">IA</text>
  </Linha>
);
export const IcoCamadas = () => <Linha><path d="M24 6 L44 16 L24 26 L4 16 Z" /><path d="M4 24 L24 34 L44 24" /><path d="M4 32 L24 42 L44 32" /></Linha>;
export const IcoTerminal = () => <Linha><path d="M12 16 L20 24 L12 32 M24 33 H36" /></Linha>;
export const IcoEngrenagem = () => (
  <Linha>
    <circle cx="24" cy="24" r="6" />
    <path d="M24 6v6M24 36v6M6 24h6M36 24h6M11.3 11.3l4.2 4.2M32.5 32.5l4.2 4.2M11.3 36.7l4.2-4.2M32.5 15.5l4.2-4.2" />
    <circle cx="24" cy="24" r="12" />
  </Linha>
);
export const IcoConfere = () => <Linha><circle cx="24" cy="24" r="15" /><path d="M17 24 L22 29 L32 19" /></Linha>;
export const IcoInfinito = () => <Linha><path d="M24 24 C19 16 9 16 9 24 C9 32 19 32 24 24 C29 16 39 16 39 24 C39 32 29 32 24 24 Z" /></Linha>;
export const IcoPessoas = () => (
  <Linha>
    <circle cx="24" cy="16" r="5" /><circle cx="12" cy="20" r="4" /><circle cx="36" cy="20" r="4" />
    <path d="M15 36 C15 28 33 28 33 36 M5 35 C5 29 15 28 15 30 M43 35 C43 29 33 28 33 30" />
  </Linha>
);
export const IcoTela = () => <Linha><rect x="5" y="8" width="38" height="26" rx="2" /><path d="M18 42 H30 M24 34 V42 M11 16 H25 M11 22 H20" /></Linha>;
export const IcoCadeia = () => <Linha><rect x="4" y="17" width="16" height="14" rx="3" /><rect x="28" y="17" width="16" height="14" rx="3" /><path d="M20 24 H28" /><path d="M12 17 V11 M36 31 V37" /></Linha>;
export const IcoGrade = () => (
  <svg className="ka-ico" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    {[0, 6, 12].flatMap((y) => [0, 6, 12].map((x) => <rect key={`${x}${y}`} x={x} y={y} width="3.4" height="3.4" />))}
  </svg>
);
export const IcoSinal = () => (
  <svg className="ka-ico" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="2" y="6" width="2" height="5" /><rect x="6" y="3" width="2" height="11" /><rect x="10" y="5" width="2" height="7" /></svg>
);
