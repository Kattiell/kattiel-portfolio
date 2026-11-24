import type { Metadata } from 'next';
import Link from 'next/link';
import { Masthead, SiteFooter } from '@/components/Masthead';
import { DistrictMap } from '@/components/DistrictMap';
import { DISTRICTS, pad2 } from '@/domain/districts';

export const metadata: Metadata = {
  title: 'Mapa do salão',
  description: 'Os doze distritos do arquivo Kattiel, em planta 2D: acessível sem placa de vídeo.',
};

export default function DistrictsIndex() {
  return (
    <div className="k-site k-dark-page">
      <a href="#conteudo" className="skip">Pular para o conteúdo</a>
      <Masthead ativo="distritos" />
      <main id="conteudo" className="district-file">
        <nav className="crumbs" aria-label="Trilha"><Link href="/">← Início</Link><span>/</span><span>Mapa do salão</span></nav>
        <div className="file-grid">
          <div>
            <p className="file-code">ÍNDICE / 001—012</p>
            <h1>Mapa do salão</h1>
            <p className="file-focal">A caverna inteira em planta. Os túneis 1 a 6 ficam na galeria superior (elevadores nas pontas); 7 a 12 na inferior (escadas da plataforma).</p>
            <ol className="map-list">
              {DISTRICTS.map((d) => (
                <li key={d.id}>
                  <Link href={`/distritos/${d.id}`}>
                    <span className="district-no">{pad2(d.id)}</span>
                    <span>{d.name}</span>
                    <small>{d.spell}{d.projectSlug ? '' : ' · em curadoria'}</small>
                  </Link>
                </li>
              ))}
            </ol>
            <div className="file-actions">
              <Link href="/arquivo" prefetch={false} className="primary-cta">ENTRAR NA CAVERNA <span aria-hidden="true">↗</span></Link>
            </div>
          </div>
          <DistrictMap />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
