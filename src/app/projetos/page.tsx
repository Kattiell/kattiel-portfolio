import type { Metadata } from 'next';
import Link from 'next/link';
import { Masthead, SiteFooter } from '@/components/Masthead';
import { CATEGORY_LABEL, PROJECTS, publicLink } from '@/domain/projects';

export const metadata: Metadata = { title: 'Projetos', description: 'Todos os projetos do arquivo Kattiel: produtos no ar, ferramentas internas e investigações técnicas.' };

export default function ProjetosPage() {
  return (
    <div className="k-site ka">
      <a href="#conteudo" className="skip">Pular para o conteúdo</a>
      <Masthead ativo="projetos" />
      <main id="conteudo" className="ka-lista">
        <p className="ka-rotulo ka-secao">ARQUIVO  ·  PROJETOS</p>
        <h1>Projetos</h1>
        <p className="ka-lista-intro">Produtos no ar, ferramentas internas e investigações técnicas. Cada um tem contexto, decisões e limites, sem métrica inventada.</p>
        <ol className="ka-lista-itens">
          {PROJECTS.map((p, i) => (
            <li key={p.slug}>
              <Link href={`/projetos/${p.slug}`}>
                <span className="ka-lista-n">{String(i + 1).padStart(2, '0')}</span>
                <span className="ka-lista-nome">{p.title}</span>
                <span className="ka-lista-tipo">{CATEGORY_LABEL[p.category]} · {p.kind}{publicLink(p) ? ' · link público' : ''}</span>
                <span className="ka-lista-sum">{p.summary}</span>
                <span aria-hidden="true" className="ka-lista-seta">→</span>
              </Link>
            </li>
          ))}
        </ol>
      </main>
      <SiteFooter />
    </div>
  );
}
