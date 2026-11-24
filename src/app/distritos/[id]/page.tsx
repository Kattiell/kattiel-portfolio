import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Masthead, SiteFooter } from '@/components/Masthead';
import { DistrictMap } from '@/components/DistrictMap';
import { DISTRICTS, getDistrict, pad2 } from '@/domain/districts';
import { getProject, publicLink } from '@/domain/projects';

export function generateStaticParams() {
  return DISTRICTS.map((d) => ({ id: String(d.id) }));
}

export async function generateMetadata({ params }: PageProps<'/distritos/[id]'>): Promise<Metadata> {
  const d = getDistrict(Number((await params).id));
  return d ? { title: `Distrito ${pad2(d.id)} · ${d.name}`, description: `${d.focal}. Feitiço: ${d.spell}.` } : {};
}

export default async function DistrictPage({ params }: PageProps<'/distritos/[id]'>) {
  const d = getDistrict(Number((await params).id));
  if (!d) notFound();
  const project = d.projectSlug ? getProject(d.projectSlug) : undefined;
  const prev = getDistrict(d.id === 1 ? 12 : d.id - 1)!, next = getDistrict(d.id === 12 ? 1 : d.id + 1)!;
  const link = project ? publicLink(project) : undefined;

  return (
    <div className="k-site k-dark-page">
      <a href="#conteudo" className="skip">Pular para o conteúdo</a>
      <Masthead ativo="distritos" />
      <main id="conteudo" className="district-file" style={{ ['--n' as string]: d.color }}>
        <nav className="crumbs" aria-label="Trilha"><Link href="/distritos">← Mapa do salão</Link><span>/</span><span>Distrito {pad2(d.id)}</span></nav>
        <div className="file-grid">
          <div>
            <p className="file-code">ARQUIVO {pad2(d.id)} / OS DOZE DISTRITOS · {d.upper ? 'GALERIA SUPERIOR' : 'GALERIA INFERIOR'}</p>
            <h1>{d.name}</h1>
            <p className="file-focal">{d.focal}.</p>
            <dl className="file-facts">
              <dt>Material</dt><dd>{d.materialTheme}</dd>
              <dt>Feitiço</dt><dd><b>{d.spell}</b> — {d.spellFx.toLowerCase()}.</dd>
              <dt>Grupos</dt><dd>{d.groups.join(' · ')}</dd>
              <dt>Interação</dt><dd>{d.interaction}</dd>
            </dl>
            <section className="file-project" aria-labelledby="proj-t">
              <h2 id="proj-t">Projeto do distrito</h2>
              {project ? (
                <p><Link href={`/projetos/${project.slug}`}>{project.title}</Link> — {project.summary} {link ? <a href={link} target="_blank" rel="noopener noreferrer">Abrir ↗</a> : null}</p>
              ) : (
                <p className="link-empty" role="note">Projeto em curadoria. Este túnel ainda não tem um caso ligado, e nada foi inventado para preenchê-lo.</p>
              )}
            </section>
            <div className="file-actions">
              <Link href={`/arquivo?distrito=${d.id}`} prefetch={false} className="primary-cta">IR ATÉ O TÚNEL EM 3D <span aria-hidden="true">↗</span></Link>
              <span className="file-hint">Abre a caverna na boca do túnel. Aperte E para conjurar {d.spell}.</span>
            </div>
            <nav className="file-pager" aria-label="Outros distritos">
              <Link href={`/distritos/${prev.id}`}>← {pad2(prev.id)} {prev.name}</Link>
              <Link href={`/distritos/${next.id}`}>{pad2(next.id)} {next.name} →</Link>
            </nav>
          </div>
          <DistrictMap active={d.id} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
