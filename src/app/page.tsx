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
import { SECOES } from '@/experience/perfil.js';
import caverna from '../../public/img/cavern-ceiling.webp';
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
// Abertura: só na 1ª visita da sessão, sem "reduzir movimento", com WebGL2 e no topo da página.
// Roda antes do átrio ser desenhado (sem piscar o conteúdo). Prazo de segurança: aos 8 s a página aparece de qualquer jeito.
const ABRE = `try{var h=document.documentElement;if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&window.WebGL2RenderingContext&&!sessionStorage.getItem('k-abriu')&&!location.hash&&scrollY<40){h.classList.add('k-abre');h.dataset.abre='0';setTimeout(function(){h.classList.add('k-fim')},8000)}}catch(e){}`;

// A abertura conta uma inspeção: cada etapa é uma parte do trabalho de QA.
const ETAPAS = [
  ['Inicialização', 'Sistema em repouso'],
  ['Varredura estrutural', 'Lendo a geometria'],
  ['Diagnóstico', 'Falha encontrada no pilar'],
  ['Validação', 'Correção verificada'],
  ['Entrega', 'Sistema verificado'],
];
const VARREDURA = ['Contratos de API', 'Testes automatizados', 'Acessibilidade', 'Performance'];

// A caverna: o cliente vê o herói na rua, a entrega depende da caverna. Cada canto = uma atividade.
// Textos (canto e "na entrega") vêm de perfil.js, os mesmos dos painéis da caverna 3D.
// x/y = onde fica o canto na arte cavern-ceiling.webp, em % (letras: os túneis da arte já têm números).
type Secao = { id: string; canto?: [string, string]; entrega?: string };
const CANTOS = ([
  ['fullstack', 'Desenvolvimento (Full Stack)', 51, 71],
  ['qa', 'Testes e qualidade (QA)', 15, 84],
  ['lead', 'Liderança técnica', 9, 25],
  ['ia', 'Automação com IA', 50, 10],
  ['uiux', 'Design de interface (UI/UX)', 51, 91],
  ['projetos', 'Trabalhos entregues', 27, 47],
] as const).map(([id, atividade, x, y], i) => {
  const s = (SECOES as Secao[]).find((q) => q.id === id)!;
  return { id, atividade, x, y, letra: 'ABCDEF'[i], canto: s.canto!, entrega: s.entrega! };
});

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
      <script dangerouslySetInnerHTML={{ __html: ABRE }} />
      <div className="m-abre" aria-hidden="true">
        <p className="m-abre-topo"><span>K<i>/</i></span> Inspeção de sistema</p>
        <ol className="m-abre-etapas">
          {ETAPAS.map(([t, d], i) => <li key={t}><b>0{i}</b><span>{t}<small>{d}</small></span></li>)}
        </ol>
        <div className="m-abre-tempo"><span className="m-abre-tc">00:00.0</span><i /></div>
      </div>
      <button type="button" className="m-abre-pular">Pular abertura <span aria-hidden="true">→</span></button>
      <Movimento />
      <nav className="m-trilho" aria-label="Onde você está">
        <ol>
          <li><a href="#caverna"><b>00</b><span>A caverna</span></a></li>
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
            <Profundidade arte={hero.src} prof="/img/mono/hero-prof.webp" x={0.62} atrio />
            <i className="m-laser" />
            {/* os feixes saem do reflexo no piso e chegam às métricas; a mira fica presa ao pilar (Profundidade posiciona) */}
            <svg className="m-feixes">
              {NUMEROS.map((x) => <path key={x.u + x.n} className="m-feixe-base" pathLength={1} />)}
              {NUMEROS.map((x) => <path key={`p${x.u}${x.n}`} className="m-feixe-pulso" pathLength={1} />)}
              {NUMEROS.map((x) => <circle key={x.u + x.n} r="3" />)}
            </svg>
            <div className="m-falha">
              <i className="m-falha-mira" />
              <p><b>Falha identificada</b><span>Tipo · inconsistência</span><span>Status · <em className="m-falha-an">em análise</em><em className="m-falha-ok">corrigida</em></span></p>
            </div>
          </div>
          <div className="m-hud" aria-hidden="true">
            <span><i /> Inspeção ativa</span>
            <span className="m-hud-xy">X 0000 · Y 0000</span>
            <span>Status <b>verificado</b></span>
            <div className="m-varredura">
              <p>Varredura QA</p>
              <ul>{VARREDURA.map((v) => <li key={v}>{v}</li>)}</ul>
            </div>
          </div>
          <div className="m-hero-txt">
            <p className="m-olho"><span>KATTIEL /</span> Lead QA · Full Stack · IA</p>
            <h1 id="m-titulo" className="m-nome" aria-label="Gabriel Caetano"><Letras t="Gabriel" /><br /><Letras t="Caetano" d={7} /></h1>
            <p className="m-lema">Construo produtos e sites para clientes, e verifico sistemas que não podem falhar. Cada entrega vem com a prova de que funciona.</p>
            <p className="m-tese">Funcionar é aparência.<br /><em>Confiabilidade exige evidências.</em></p>
            <div className="m-acoes">
              <a href="#trabalho" className="m-btn m-btn-cheio">Ver os trabalhos <span aria-hidden="true">↓</span></a>
              <a href="#contato" className="m-btn">Falar comigo</a>
            </div>
          </div>
          <ul className="m-numeros" aria-label="Em números">
            {NUMEROS.map((x) => (
              <li key={x.u + x.n}><strong>{x.n}</strong><span><b>{x.u}</b> {x.d}</span></li>
            ))}
          </ul>
        </section>

        {/* ---------- FAIXA: a marca em movimento ---------- */}
        <div className="m-faixa" aria-hidden="true">
          <Faixa />
          <Faixa inversa />
        </div>

        {/* ---------- A CAVERNA: como cada atividade muda a entrega (a metáfora, em destaque) ---------- */}
        <section className="m-sec m-cav" id="caverna" aria-labelledby="m-cav-t">
          <div className="m-wrap">
            <header className="m-cab">
              <p className="m-rot">A metáfora</p>
              <h2 id="m-cav-t">O cliente vê o herói na rua.<br /><em>A entrega depende da caverna.</em></h2>
              <p>Todo site ou sistema que chega até você é a parte visível. Por trás existe um lugar onde ele é construído, testado e preparado para sair. Montei esse lugar em 3D: cada canto da caverna é uma parte do meu trabalho, e cada uma muda alguma coisa no que você recebe.</p>
            </header>
            <div className="m-cav-corpo">
              <figure className="m-cav-arte">
                <Image src={caverna} alt="A caverna: garagem com o carro à esquerda, computador central, emblema no piso, doze túneis em duas galerias, sacadas no alto e um óculo de luz no teto." placeholder="blur" sizes="(max-width: 1000px) 100vw, 58vw" />
                {CANTOS.map((c) => (
                  <Link key={c.id} href={`/arquivo#${c.id}`} prefetch={false} className="m-cav-pino" data-c={c.id} style={{ '--x': c.x, '--y': c.y } as CSSProperties} aria-label={`${c.canto[0]}: ${c.atividade}. Abrir na caverna 3D`}>
                    <b aria-hidden="true">{c.letra}</b><span aria-hidden="true">{c.canto[0]}</span>
                  </Link>
                ))}
              </figure>
              <ol className="m-cav-lista">
                {CANTOS.map((c) => (
                  <li key={c.id} data-c={c.id}>
                    <b className="m-cav-letra" aria-hidden="true">{c.letra}</b>
                    <div>
                      <p className="m-cav-onde">{c.canto[0]} <span>· {c.canto[1]}</span></p>
                      <h3>{c.atividade}</h3>
                      <p className="m-cav-entrega"><b>Na entrega</b> {c.entrega}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <p className="m-cav-acoes">
              <Link href="/arquivo" prefetch={false} className="m-btn m-btn-cheio">Entrar na caverna em 3D <span aria-hidden="true">→</span></Link>
              <Link href="/distritos" className="m-link">Versão sem 3D <span aria-hidden="true">→</span></Link>
            </p>
          </div>
        </section>

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

      </main>

      <SiteFooter />
    </div>
  );
}
