import type { CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HeaderA, SiteFooter } from '@/components/Masthead';
import Movimento from '@/components/Movimento';
import Profundidade from '@/components/Profundidade';
import { CAPITULOS } from '@/domain/capitulos';
import { METODO, NUMEROS, SOBRE } from '@/domain/apresentacao';
import { CATEGORY_LABEL, getProject, MAIS, PROJECTS, publicLink } from '@/domain/projects';
import { PROFILE } from '@/domain/profile';
import { PROJECT_IMAGES } from '@/domain/projectImages';
import hero from '../../public/img/mono/hero.webp';
import engenharia from '../../public/img/mono/engenharia.webp';
import qualidade from '../../public/img/mono/qualidade.webp';
import automacao from '../../public/img/mono/automacao.webp';
import lideranca from '../../public/img/mono/lideranca.webp';

// Home "arquitetura monumental": uma travessia por um único edifício de concreto. Portfólio, não currículo:
// cada espaço do edifício mostra um trabalho (problema, o que foi feito, resultado). Artes modeladas no ChatGPT
// (sem texto, sem religião). Trajetória, formação e certificações ficam no LinkedIn.

const ARTE = { engenharia, qualidade, automacao, lideranca } as const;

// Faixa = o contraste do trabalho de QA. Em cima (vermelho): o que eu achei, tudo tirado dos trabalhos.
// Embaixo (contorno, riscado): o que a tela dizia sobre os mesmos casos.
const ACHADOS = ['55% de 20 mil produtos perdidos', 'IDOR entre tenants', 'DELETE de 29 segundos', 'Endpoint 6× mais lento', '11.600+ casos de API', '208 endpoints · 59 tenants'];
const APARENCIA = ['Importação concluída', 'Tenant isolado', 'DELETE executado', 'Status 200 OK', 'Tempo de resposta normal'];

function Letras({ t, d = 0 }: { t: string; d?: number }) {
  return (
    <span className="m-palavra" aria-hidden="true">
      {[...t].map((c, i) => <span key={i} className="m-l" style={{ ['--i' as string]: i + d }}>{c}</span>)}
    </span>
  );
}

function Faixa({ inversa = false }: { inversa?: boolean }) {
  const base = inversa ? APARENCIA : ACHADOS;
  const itens = [...base, ...base];
  return (
    <div className={`m-faixa-linha${inversa ? ' is-inversa' : ''}`}>
      <b className="m-faixa-rot">{inversa ? 'A tela dizia' : 'O que eu achei'}</b>
      <div className="m-faixa-trilha">
        {[0, 1].map((k) => (
          <span key={k}>{itens.map((t, i) => <span key={i}><s>{t}</s><i>{inversa ? '✕' : 'K/'}</i></span>)}</span>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="k-site km">
      <a href="#conteudo" className="skip">Pular para o conteúdo</a>
      <div className="m-intro" aria-hidden="true"><span>K<i>/</i></span></div>
      <Movimento />
      <nav className="m-trilho" aria-label="Onde você está">
        <ol>
          {CAPITULOS.map((c) => <li key={c.id}><a href={`#${c.id}`}><b>{c.n}</b><span>{getProject(c.projeto)?.title}</span></a></li>)}
          <li><a href="#projetos"><b>05</b><span>Mais trabalhos</span></a></li>
          <li><a href="#metodo"><b>06</b><span>Método</span></a></li>
          <li><a href="#sobre"><b>07</b><span>Sobre</span></a></li>
        </ol>
      </nav>
      <HeaderA ativo="inicio" sobreArte />
      <main id="conteudo">
        {/* ---------- ÁTRIO ---------- */}
        <section className="m-hero" id="inicio" aria-labelledby="m-titulo">
          <div className="m-hero-arte" aria-hidden="true">
            <Image src={hero} alt="" priority placeholder="blur" sizes="100vw" />
            <Profundidade arte={hero.src} prof="/img/mono/hero-prof.webp" x={0.62} />
            <i className="m-laser" />
          </div>
          <div className="m-hud" aria-hidden="true">
            <span><i /> Inspeção ativa</span>
            <span className="m-hud-xy">X 0000 · Y 0000</span>
            <span>Status <b>verificado</b></span>
          </div>
          <div className="m-hero-txt">
            <p className="m-olho"><span>KATTIEL /</span> Lead QA · Full Stack · IA</p>
            <h1 id="m-titulo" className="m-nome" aria-label="Gabriel Caetano"><Letras t="Gabriel" /><br /><Letras t="Caetano" d={7} /></h1>
            <p className="m-lema">Construo produtos e sites para clientes, e verifico sistemas que não podem falhar. Cada entrega vem com a prova de que funciona.</p>
            <div className="m-acoes">
              <a href="#trabalho" className="m-btn m-btn-cheio">Ver os trabalhos <span aria-hidden="true">↓</span></a>
              <a href="#contato" className="m-btn">Falar comigo</a>
            </div>
          </div>
          <ul className="m-numeros" aria-label="Em números">
            {NUMEROS.map((x) => (
              <li key={x.u}><strong>{x.n}</strong><span><b>{x.u}</b> {x.d}</span></li>
            ))}
          </ul>
        </section>

        {/* ---------- FAIXA: a marca em movimento ---------- */}
        <div className="m-faixa" aria-hidden="true">
          <Faixa />
          <Faixa inversa />
        </div>

        {/* ---------- TRABALHOS SELECIONADOS: um espaço do edifício por trabalho ---------- */}
        <div id="trabalho" className="m-travessia">
          <header className="m-wrap m-cab">
            <p className="m-rot">Trabalhos selecionados</p>
            <h2>Quatro trabalhos,<br />do problema ao resultado.</h2>
            <p>Um site de cliente, uma área de qualidade, uma ferramenta open source e um produto com IA. Em cada um: o que estava em jogo, o que eu fiz e o que ficou de pé.</p>
          </header>
          {CAPITULOS.map((c, k) => {
            const p = getProject(c.projeto)!;
            const link = publicLink(p);
            const arte = ARTE[c.id as keyof typeof ARTE];
            return (
              <section key={c.id} id={c.id} className={`m-cap m-cap-${c.lado}`} aria-labelledby={`m-cap-${c.id}`}>
                <div className="m-cap-arte" aria-hidden="true">
                  <Image src={arte} alt="" placeholder="blur" sizes="100vw" />
                  <Profundidade arte={arte.src} prof={`/img/mono/${c.id}-prof.webp`} x={c.lado === 'esq' ? 0.7 : 0.3} fase={(k + 1) * 0.23} />
                  <i className="m-laser" />
                </div>
                <span className="m-cap-gigante" aria-hidden="true">{c.n}</span>
                <div className="m-cap-txt">
                  <p className="m-cap-n"><b>{c.n}</b> {CATEGORY_LABEL[p.category]} · {p.kind}</p>
                  <h2 id={`m-cap-${c.id}`}>{p.title}</h2>
                  <p className="m-cap-manchete">{c.manchete}</p>
                  <p className="m-cap-texto">{c.texto}</p>
                  <ul className="m-provas">{c.provas.map((x) => <li key={x}>{x}</li>)}</ul>
                  <p className="m-cap-res"><b>Resultado</b> {c.resultado}</p>
                  <ul className="m-chips" aria-label="Tecnologias">{(p.stack ?? []).slice(0, 5).map((t) => <li key={t}>{t}</li>)}</ul>
                  <p className="m-cap-proj">
                    <Link href={`/projetos/${p.slug}`}>Estudo de caso <span aria-hidden="true">→</span></Link>
                    {link ? <a href={link} target="_blank" rel="noopener noreferrer">{p.url ? 'Site no ar' : 'Repositório'} <span aria-hidden="true">↗</span></a> : null}
                  </p>
                </div>
              </section>
            );
          })}
        </div>

        {/* ---------- MAIS TRABALHOS ---------- */}
        <section className="m-sec" id="projetos" aria-labelledby="m-proj-t">
          <div className="m-wrap">
            <header className="m-cab m-cab-linha">
              <div>
                <p className="m-rot">Mais trabalhos</p>
                <h2 id="m-proj-t">Produtos, ferramentas e sites.</h2>
              </div>
              <Link href="/projetos" className="m-link">Ver os {PROJECTS.length} projetos <span aria-hidden="true">→</span></Link>
            </header>
            <ul className="m-projetos">
              {MAIS.map((p, i) => {
                const foto = PROJECT_IMAGES[p.slug];
                const link = publicLink(p);
                return (
                  <li key={p.slug} className="m-projeto" style={{ '--i': i } as CSSProperties}>
                    <Link href={`/projetos/${p.slug}`} className="m-projeto-capa" aria-label={`${p.title}: abrir o estudo de caso`}>
                      {foto ? (
                        <Image src={foto.src} alt={foto.alt} placeholder="blur" quality={90} sizes="(max-width: 1000px) 100vw, (min-width: 1500px) 25vw, 50vw" />
                      ) : (
                        <span className="m-capa-tipo" aria-hidden="true">
                          <i>{String(i + 5).padStart(2, '0')}</i>
                          <b>{p.title}</b>
                          <small>{p.evidence?.[0] ?? p.approach ?? p.summary}</small>
                        </span>
                      )}
                    </Link>
                    <p className="m-projeto-tipo">{CATEGORY_LABEL[p.category]} · {p.kind}</p>
                    <h3><Link href={`/projetos/${p.slug}`}>{p.title}</Link></h3>
                    <p>{p.summary}</p>
                    <ul className="m-chips">{(p.stack ?? []).slice(0, 4).map((x) => <li key={x}>{x}</li>)}</ul>
                    <p className="m-projeto-links">
                      <Link href={`/projetos/${p.slug}`}>Estudo de caso <span aria-hidden="true">→</span></Link>
                      {link ? <a href={link} target="_blank" rel="noopener noreferrer">{p.url ? 'Site no ar' : 'Repositório'} <span aria-hidden="true">↗</span></a> : null}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ---------- MÉTODO ---------- */}
        <section className="m-sec m-sec-escura" id="metodo" aria-labelledby="m-met-t">
          <div className="m-wrap">
            <header className="m-cab">
              <p className="m-rot">Método</p>
              <h2 id="m-met-t">Como um trabalho sai daqui.</h2>
              <p>Quatro etapas, as mesmas num site de cliente ou numa plataforma inteira. Cada uma com o que já produziu nos trabalhos acima.</p>
            </header>
            <ol className="m-xp">
              {METODO.map((e) => (
                <li key={e.n}>
                  <div className="m-xp-quando"><span>{e.n}</span><b>{e.nome}</b></div>
                  <div className="m-xp-corpo">
                    <h3>{e.titulo}</h3>
                    <p className="m-xp-resumo">{e.texto}</p>
                    <ul className="m-provas">{e.provas.map((x) => <li key={x}>{x}</li>)}</ul>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- SOBRE ---------- */}
        <section className="m-sec" id="sobre" aria-labelledby="m-sobre-t">
          <div className="m-wrap m-sobre">
            <div className="m-sobre-txt">
              <p className="m-rot">Sobre</p>
              <h2 id="m-sobre-t">{PROFILE.name}</h2>
              <p className="m-sobre-local">{SOBRE.local}</p>
              {SOBRE.bio.map((t) => <p key={t} className="m-sobre-p">{t}</p>)}
              <p className="m-sobre-redes">
                {PROFILE.contact.linkedin ? <a href={PROFILE.contact.linkedin} target="_blank" rel="noopener noreferrer">Trajetória no LinkedIn <span aria-hidden="true">↗</span></a> : null}
                <a href={PROFILE.contact.github} target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden="true">↗</span></a>
              </p>
            </div>
            <div className="m-sobre-lado">
              <h3>O que eu faço</h3>
              <ul className="m-certs m-servicos">
                <li><span>Sites e produtos sob medida</span><small>Do design ao deploy, com acessibilidade e segurança</small></li>
                <li><span>Qualidade de software</span><small>Estratégia de teste, testes de API, carga e segurança</small></li>
                <li><span>Automação com IA</span><small>Agentes e ferramentas no fluxo real de engenharia</small></li>
              </ul>
            </div>
          </div>
        </section>

        {/* ---------- LAB (a caverna 3D, secundária) ---------- */}
        <section className="m-wrap m-lab" aria-labelledby="m-lab-t">
          <p className="m-rot">Lab 01</p>
          <h2 id="m-lab-t">Um arquivo navegável em 3D.</h2>
          <p>Um experimento em Three.js, modelado com uma oficina de agentes de IA. Fora do caminho principal, para quem quiser explorar.</p>
          <Link href="/arquivo" prefetch={false} className="m-link">Entrar no lab <span aria-hidden="true">→</span></Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
