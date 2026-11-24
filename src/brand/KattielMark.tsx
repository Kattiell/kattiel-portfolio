// Insígnia K autoral: selo circular com 12 marcas e K de três traços (porta de cofre), cobre separando os traços.
type Props = { className?: string; size?: number; ticks?: boolean };

export function KattielMark({ className, size, ticks = true }: Props) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 62 62" aria-hidden="true" focusable="false">
      <circle cx="31" cy="31" r="28" fill="none" stroke="currentColor" strokeWidth="1.6" />
      {ticks
        ? Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            const r1 = 23.2, r2 = 25.6;
            return (
              <line key={i} x1={31 + r1 * Math.sin(a)} y1={31 - r1 * Math.cos(a)} x2={31 + r2 * Math.sin(a)} y2={31 - r2 * Math.cos(a)}
                stroke="currentColor" strokeOpacity=".35" strokeWidth="1" />
            );
          })
        : null}
      <path d="M23 15v32 M37 16L25 31L40 46" fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="bevel" />
      <path d="M30 27L43 13" stroke="var(--k-oxide)" strokeWidth="2.6" />
      <path d="M30 35L45 49" stroke="var(--k-oxide)" strokeWidth="2.6" />
    </svg>
  );
}
