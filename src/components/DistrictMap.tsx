import Link from 'next/link';
import { DISTRICTS, pad2 } from '@/domain/districts';

// Mapa 2D do salão, visto de cima: as duas galerias em arco, a plataforma central e o corredor de entrada.
// Funciona sem GPU e por teclado: cada túnel é um link para o dossiê do distrito.
export function DistrictMap({ active }: { active?: number }) {
  const C = { x: 300, y: 250 };
  const pos = (r: number, phi: number) => {
    const a = (phi * Math.PI) / 180;
    return { x: C.x + r * Math.sin(a), y: C.y - r * Math.cos(a) };
  };
  const arc = (r: number) => {
    const a = pos(r, -72), b = pos(r, 72);
    return `M${a.x} ${a.y} A${r} ${r} 0 0 1 ${b.x} ${b.y}`;
  };
  return (
    <figure className="district-map">
      <svg viewBox="0 0 600 420" role="group" aria-label="Mapa do salão: distritos 1 a 6 na galeria superior, 7 a 12 na inferior">
        <path d={arc(220)} className="map-gallery" />
        <path d={arc(165)} className="map-gallery" />
        <text x={C.x} y={C.y - 228} className="map-label" textAnchor="middle">GALERIA SUPERIOR · 01—06</text>
        <text x={C.x} y={C.y - 128} className="map-label" textAnchor="middle">GALERIA INFERIOR · 07—12</text>
        <circle cx={C.x} cy={C.y} r="44" className="map-platform" />
        <text x={C.x} y={C.y + 4} className="map-label" textAnchor="middle">PLATAFORMA</text>
        <path d={`M${C.x - 14} ${C.y + 60} V410 M${C.x + 14} ${C.y + 60} V410`} className="map-corridor" />
        <text x={C.x + 24} y="400" className="map-label">ENTRADA</text>
        {DISTRICTS.map((d) => {
          const p = pos(d.upper ? 220 : 165, d.phi);
          const on = active === d.id;
          return (
            <Link key={d.id} href={`/distritos/${d.id}`} aria-label={`Distrito ${d.id}, ${d.name}`} aria-current={on ? 'page' : undefined}>
              <g className={`map-node${on ? ' is-on' : ''}`}>
                <circle cx={p.x} cy={p.y} r="17" style={{ ['--n' as string]: d.color }} />
                <text x={p.x} y={p.y + 4} textAnchor="middle">{pad2(d.id)}</text>
              </g>
            </Link>
          );
        })}
      </svg>
      <figcaption>Planta do salão vista de cima. Os números são os túneis.</figcaption>
    </figure>
  );
}
