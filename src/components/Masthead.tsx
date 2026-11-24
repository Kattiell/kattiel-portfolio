import Link from 'next/link';
import { PROFILE } from '@/domain/profile';

type Ativo = 'inicio' | 'caverna' | 'trabalho' | 'projetos' | 'metodo' | 'sobre' | 'distritos' | null;

const NAV: { id: Exclude<Ativo, null | 'inicio' | 'distritos'>; rotulo: string; href: string }[] = [
  { id: 'caverna', rotulo: 'Caverna', href: '/#caverna' },
  { id: 'trabalho', rotulo: 'Trabalho', href: '/#trabalho' },
  { id: 'projetos', rotulo: 'Projetos', href: '/projetos' },
  { id: 'metodo', rotulo: 'Método', href: '/#metodo' },
  { id: 'sobre', rotulo: 'Sobre', href: '/#sobre' },
];

/** Cabeçalho monumental (todas as páginas). Na home fica fixo e transparente até sair do átrio. */
export function HeaderA({ ativo = null }: { ativo?: Ativo; sobreArte?: boolean }) {
  return (
    <header className="m-topo" id="topo">
      <Link href="/" className="m-id" aria-label="Kattiel, Gabriel Caetano: voltar ao início">
        <span className="m-marca" aria-hidden="true">K<i>/</i></span>
        <span><b>KATTIEL</b><small>{PROFILE.name}</small></span>
      </Link>
      <nav aria-label="Navegação principal">
        <ol>
          {NAV.map((n) => (
            <li key={n.id}>
              <Link href={n.href} aria-current={ativo === n.id ? 'page' : undefined} className={ativo === n.id ? 'is-on' : undefined}>{n.rotulo}</Link>
            </li>
          ))}
        </ol>
      </nav>
      <a href="#contato" className="m-topo-cta">Contato</a>
    </header>
  );
}

/** Mantido para as páginas internas: o mesmo cabeçalho. */
export function Masthead({ ativo = null }: { ativo?: Ativo }) {
  return <HeaderA ativo={ativo} />;
}

/** Rodapé: o contato real (LinkedIn do currículo e GitHub). E-mail e telefone ficam fora do site. */
export function SiteFooter() {
  const c = PROFILE.contact;
  const principal = c.email ? `mailto:${c.email}` : c.linkedin ?? c.github;
  return (
    <footer className="m-rodape" id="contato">
      <p className="m-rot">Contato</p>
      <h2>Vamos construir<br />algo que fique de pé.</h2>
      <p>Para um projeto, uma consultoria de qualidade ou uma conversa sobre o seu sistema.</p>
      <div className="m-rodape-acoes">
        <a href={principal} target="_blank" rel="noopener noreferrer" className="m-btn m-btn-cheio">
          {c.email ? 'Enviar e-mail' : c.linkedin ? 'Falar no LinkedIn' : 'Ver o GitHub'} <span aria-hidden="true">↗</span>
        </a>
        {principal !== c.github ? (
          <a href={c.github} target="_blank" rel="noopener noreferrer" className="m-btn">GitHub <span aria-hidden="true">↗</span></a>
        ) : null}
      </div>
      <p className="m-rodape-marca" aria-hidden="true">KATTIEL<i>/</i></p>
      <div className="m-rodape-base">
        <span>KATTIEL / {PROFILE.name}</span>
        <span>Patos de Minas, MG · Brasil</span>
      </div>
    </footer>
  );
}
