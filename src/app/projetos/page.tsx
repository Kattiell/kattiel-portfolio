import type { Metadata } from 'next';
import Link from 'next/link';
import { Masthead, SiteFooter } from '@/components/Masthead';
import { CATEGORY_LABEL, COLABORACOES, PROPRIOS, publicLink } from '@/domain/projects';
import type { Project } from '@/domain/schemas';

export const metadata: Metadata = { title: 'Projetos', description: 'Todos os projetos do arquivo Kattiel: produtos no ar, ferramentas internas e investigações técnicas.' };

function Lista({ itens }: { itens: Project[] }) {
  return (
    <ol className="ka-lista-itens">
      {itens.map((p, i) => (
        <li key={p.slug}>
          <Link href={`/projetos/${p.slug}`}>
            <span className="ka-lista-n">{String(i + 1).padStart(2, '0')}</span>
            <span className="ka-lista-nome">{p.title}</span>
            <span className="ka-lista-tipo">{p.colaboracao ? `PROJETO DE ${p.colaboracao.dono.toUpperCase()} · minha parte: ${p.colaboracao.papel.toLowerCase()}` : `${CATEGORY_LABEL[p.category]} · ${p.kind}`}{publicLink(p) ? ' · link público' : ''}</span>
            <span className="ka-lista-sum">{p.summary}</span>
            <span aria-hidden="true" className="ka-lista-seta">→</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export default function ProjetosPage() {
  return (
    <div className="k-site ka">
      <a href="#conteudo" className="skip">Pular para o conteúdo</a>
      <Masthead ativo="projetos" />
      <main id="conteudo" className="ka-lista">
        <p className="ka-rotulo ka-secao">ARQUIVO  ·  PROJETOS</p>
        <h1>Projetos</h1>
        <p className="ka-lista-intro">Produtos no ar, ferramentas internas e investigações técnicas. Cada um tem contexto, decisões e limites, sem métrica inventada.</p>
        {/* abas: os meus e os de outras pessoas em que colaboro (âncoras: funciona sem JS e o link é compartilhável) */}
        <nav className="ka-abas" aria-label="Tipo de projeto">
          <a href="#meus">Meus projetos <b>{PROPRIOS.length}</b></a>
          <a href="#colaboracoes">Colaborações <b>{COLABORACOES.length}</b></a>
        </nav>
        <section id="meus" aria-label="Meus projetos" className="ka-aba">
          <Lista itens={PROPRIOS} />
        </section>
        <section id="colaboracoes" aria-labelledby="ka-colab-t" className="ka-aba">
          <h2 id="ka-colab-t" className="ka-aba-t">Colaborações</h2>
          <p className="ka-lista-intro">Projetos de outras pessoas em que eu participo. O dono é quem decide o rumo; aqui está a minha parte em cada um.</p>
          <Lista itens={COLABORACOES} />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
