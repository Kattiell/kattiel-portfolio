import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Masthead, SiteFooter } from '@/components/Masthead';
import { DISTRICTS, pad2 } from '@/domain/districts';
import Image from 'next/image';
import { CATEGORY_LABEL, PROJECTS, getProject, publicLink } from '@/domain/projects';
import { PROJECT_GALLERY, PROJECT_IMAGES } from '@/domain/projectImages';

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<'/projetos/[slug]'>): Promise<Metadata> {
  const p = getProject((await params).slug);
  return p ? { title: p.title, description: p.summary } : {};
}

const VISIBILIDADE = {
  public: 'Público',
  'case-study-only': 'Estudo de caso (sem link público)',
  private: 'Privado',
} as const;

export default async function ProjectPage({ params }: PageProps<'/projetos/[slug]'>) {
  const p = getProject((await params).slug);
  if (!p) notFound();
  const link = publicLink(p);
  const district = DISTRICTS.find((d) => d.projectSlug === p.slug);
  const blocks = [
    ['Contexto', p.challenge],
    ['Decisão e implementação', p.approach],
    ['Resultado verificável', p.outcome],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <div className="k-site">
      <a href="#conteudo" className="skip">Pular para o conteúdo</a>
      <Masthead ativo="projetos" />
      <main id="conteudo" className="dossier">
        <nav className="crumbs" aria-label="Trilha"><Link href="/projetos">← Projetos</Link><span>/</span><span>{p.title}</span></nav>
        <header className="dossier-head">
          <span className="section-index"><span>DOSSIÊ / {CATEGORY_LABEL[p.category]}</span><span className="section-tick" /><span>{p.kind.toUpperCase()}</span></span>
          <h1>{p.title}</h1>
          <p className="dossier-sum">{p.summary}</p>
        </header>
        {PROJECT_IMAGES[p.slug] ? (
          <figure className="dossier-shot">
            <Image src={PROJECT_IMAGES[p.slug].src} alt={PROJECT_IMAGES[p.slug].alt} placeholder="blur" priority quality={90} sizes="(max-width: 1100px) 100vw, 70vw" />
            <figcaption>{PROJECT_IMAGES[p.slug].legenda ?? 'Captura do projeto.'}</figcaption>
          </figure>
        ) : null}
        <div className="dossier-grid">
          <div className="dossier-body">
            {blocks.length ? blocks.map(([t, v]) => (
              <section key={t}><h2>{t}</h2><p>{v}</p></section>
            )) : (
              <section><h2>Em curadoria</h2><p>O estudo completo deste projeto ainda está sendo escrito. Por enquanto, fica o resumo acima: sem números ou resultados que não estejam documentados.</p></section>
            )}
            {p.evidence?.length ? (
              <section><h2>Evidências</h2><ul>{p.evidence.map((e) => <li key={e}>{e}</li>)}</ul></section>
            ) : null}
            {PROJECT_GALLERY[p.slug]?.length ? (
              <section><h2>Telas</h2>
                {PROJECT_GALLERY[p.slug].map((t) => (
                  <figure key={t.alt} className="dossier-shot">
                    <Image src={t.src} alt={t.alt} placeholder="blur" quality={88} sizes="(max-width: 1100px) 100vw, 60vw" />
                    {t.legenda ? <figcaption>{t.legenda}</figcaption> : null}
                  </figure>
                ))}
              </section>
            ) : null}
          </div>
          <aside className="dossier-side" aria-label="Ficha do projeto">
            <dl>
              <dt>Tipo</dt><dd>{p.kind}</dd>
              <dt>Visibilidade</dt><dd>{VISIBILIDADE[p.visibility]}</dd>
              {p.stack?.length ? (<><dt>Stack</dt><dd className="k-chips">{p.stack.map((s) => <span key={s}>{s}</span>)}</dd></>) : null}
              <dt>Distrito</dt>
              <dd>{district ? <Link href={`/distritos/${district.id}`}>{pad2(district.id)} · {district.name}</Link> : 'Ainda sem túnel na caverna'}</dd>
            </dl>
            {link ? (
              <a className="primary-cta" href={link} target="_blank" rel="noopener noreferrer">{p.url ? 'VISITAR O SITE' : 'VER O CÓDIGO'} <span aria-hidden="true">↗</span></a>
            ) : (
              <p className="link-empty" role="note">Link público não definido. Nenhum endereço foi inventado.</p>
            )}
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
