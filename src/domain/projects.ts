// Projetos reais. Regra: nada inventado. Sem link público confirmado, `url` fica ausente e a
// interface mostra o estado vazio. Métricas só quando documentadas.
import type { Project } from './schemas';

export const PROJECTS: Project[] = [
  {
    slug: 'lcp-consultoria',
    title: 'LCP Consultoria',
    category: 'design',
    kind: 'Cliente · no ar',
    featured: true,
    summary:
      'Consultoria financeira de Belo Horizonte. Troquei um site de vitrine por um diagnóstico financeiro em 5 perguntas que já entrega o resultado pronto para a conversa no WhatsApp.',
    challenge:
      'O site antigo tinha depoimentos de exemplo, logos falsos de parceiros e fotos de banco de imagem, usava um azul que não existe no logo e não aparecia na busca por "consultoria financeira empresarial em Belo Horizonte".',
    approach:
      'Identidade tirada do próprio logo (navy e dourado). No lugar de um formulário genérico, um diagnóstico rápido que mede a saúde financeira da empresa, recomenda as frentes de serviço e monta a mensagem para o WhatsApp, sem backend. Páginas pré-renderizadas com SSR de verdade para a busca local.',
    evidence: [
      'Diagnóstico rápido: 5 perguntas, medidor em arco com faixas controle, atenção e crítico; cada frente recomendada abre direto a aba do serviço.',
      'Pré-renderização com renderToString e dados estruturados (serviço profissional, pessoa e FAQ) para aparecer na busca local.',
      'Cena 3D do hero num único draw call, carregada só com o navegador ocioso, pausada fora da tela e estática para quem reduz movimento.',
      'Consentimento LGPD em 3 categorias: a apresentação no Google Slides só carrega com permissão. CSP aplicada no build.',
    ],
    outcome: 'No ar, com deploy automático na Vercel e 0 violações de acessibilidade no axe.',
    stack: ['React', 'Three.js', 'SSR', 'JSON-LD', 'LGPD', 'Vercel'],
    url: 'https://www.lcpconsultoria.srv.br/',
    visibility: 'public',
  },
  {
    slug: 'pettracker',
    title: 'PetTracker',
    category: 'software',
    kind: 'Projeto autoral',
    summary:
      'Aplicação full stack com autenticação, perfis de acesso e rastreamento em tempo real.',
    approach: 'React no front, Node e Prisma no back, WebSocket para as atualizações em tempo real.',
    stack: ['React', 'Node', 'Prisma', 'WebSocket'],
    visibility: 'case-study-only',
  },
  {
    slug: 'qa-intelligence',
    title: 'QA Intelligence',
    category: 'quality',
    kind: 'Processo & automação',
    featured: true,
    summary:
      'A área de QA de uma plataforma B2B montada do zero: fábrica de 11.600+ casos de teste de API, triagem de defeitos e um harness que compara o sistema legado com o refatorado.',
    challenge:
      'Numa plataforma B2B em plena refatoração, o time precisava saber se o sistema novo se comportava como o legado, sem depender de memória ou de teste manual repetido.',
    approach:
      'Método de análise de cards em seis fases (extração, estudo, lacunas, bugs, cenários ponta a ponta e especificação técnica) e um harness que compara legado e refatorado.',
    evidence: [
      'Fábrica de casos de teste de API: mais de 11.600 casos executáveis em 208 endpoints e 59 tenants, cobrindo 67 famílias de falha.',
      'Teste de estresse com 20 mil produtos expôs perda silenciosa de 55% dos registros (timeout no gateway) antes da produção.',
      'Triagem de defeitos com severidade e prioridade separadas, terminal de QA em Rust e plugin de QA para o Claude Code.',
    ],
    stack: ['Testes de API', 'Regressão', 'Carga e estresse', 'Rust', 'Node', 'Claude Code'],
    visibility: 'case-study-only',
  },
  {
    slug: 'parity-gate',
    title: 'parity-gate',
    category: 'quality',
    kind: 'Open source',
    featured: true,
    summary:
      'Gate de CI que detecta mudanças que quebram APIs (schema drift, troca de status code) em qualquer API JSON ou GraphQL, sem dependências em tempo de execução.',
    challenge:
      'Mudança de contrato quebra integração sem ninguém perceber até o cliente reclamar, e teste instável vira ruído que o time aprende a ignorar.',
    approach:
      'Compara o contrato esperado com a resposta real e barra a mudança antes do merge. Classifica a estabilidade de cada endpoint para separar teste instável de endpoint instável.',
    evidence: [
      '279 testes offline em Python 3.11 a 3.13, no Linux e no Windows, com lint, checagem de tipos e varredura de credenciais.',
      'Autoteste que exige 100% de detecção das falhas plantadas.',
      'Relatório SARIF como anotação no pull request e trilha de evidências encadeada por hash; produção bloqueada por padrão.',
    ],
    stack: ['Python', 'GitHub Actions', 'SARIF', 'Contrato de API', 'GraphQL'],
    repositoryUrl: 'https://github.com/Kattiell/parity-gate',
    visibility: 'public',
  },
  {
    slug: 'mariane-borges',
    title: 'Mariane Borges · Nutrição',
    category: 'design',
    kind: 'Cliente · em lançamento',
    summary: 'Site estático em Astro para nutricionista, idêntico à arte aprovada e leve para celular.',
    stack: ['Astro', 'UI/UX'],
    visibility: 'case-study-only',
  },
  {
    slug: 'plenario',
    title: 'Plenário',
    category: 'software',
    kind: 'Projeto autoral',
    featured: true,
    summary: 'Simulador do Tribunal do Júri brasileiro com agentes de IA, para treinar defesa ou acusação. .NET 10 e Next.js 16, 74 testes.',
    challenge:
      'Os simuladores de tribunal com IA são americanos, fechados e modelam o júri dos EUA. Não havia nada aberto que seguisse o rito brasileiro.',
    approach:
      'Especificação própria (RFC-0001) antes do código. O rito do CPP é descrito em YAML e executado por um motor determinístico: o modelo de linguagem fala, mas nunca decide a fase. No modo ensaio, a pessoa assume um papel e os agentes fazem o resto.',
    evidence: [
      'Toda fala cita a prova pela folha dos autos; os jurados não deliberam entre si, como manda o art. 466 do CPP.',
      'Revisão de segurança com 15 achados, 13 corrigidos.',
      'Provedor de teste que roda sem chave de API, para desenvolver e testar sem custo.',
    ],
    outcome: 'Software implementado em .NET 10 e Next.js 16, coberto por 74 testes.',
    stack: ['IA', 'Agentes', '.NET', 'Next.js'],
    visibility: 'case-study-only',
  },
  {
    slug: 'brasa',
    title: 'Brasa',
    category: 'software',
    kind: 'Produto privado',
    summary: 'Comunicação por voz e texto: Electron, Fastify, Postgres com RLS e LiveKit próprio.',
    stack: ['Electron', 'Fastify', 'Postgres', 'LiveKit'],
    visibility: 'private',
  },
  {
    slug: 'bancada',
    title: 'Bancada',
    category: 'automation',
    kind: 'Ferramenta interna',
    summary: 'Terminal de QA em Rust que roda os casos do time, com trava de somente leitura em produção.',
    stack: ['Rust', 'QA'],
    visibility: 'private',
  },
  {
    slug: 'laboratorio-civilizacoes',
    title: 'Laboratório de Civilizações',
    category: 'automation',
    kind: 'Pesquisa',
    summary: 'Simulação ideológica com agentes em Python e NumPy, rodando com LLM local.',
    stack: ['Python', 'NumPy', 'Agentes'],
    visibility: 'case-study-only',
  },
  {
    slug: 'ia-para-gestores',
    title: 'IA para Gestores',
    category: 'leadership',
    kind: 'Curso',
    summary: 'Curso para gestores e RH sobre uso responsável do Claude no trabalho.',
    stack: ['IA', 'Liderança'],
    visibility: 'case-study-only',
  },
  {
    slug: 'bot-trading-base',
    title: 'Bot de trading (Base)',
    category: 'software',
    kind: 'Freelance',
    summary: 'Bot para Telegram com ordens limite e taxa embutida na rede Base.',
    stack: ['Cripto', 'Telegram'],
    visibility: 'private',
  },
  {
    slug: 'asphodel',
    title: 'Asphodel',
    category: 'software',
    kind: 'Produto',
    summary: 'Launchpad de tokens na rede Elysium, com especificação e site em Next.js.',
    stack: ['Cripto', 'Next.js'],
    visibility: 'case-study-only',
  },
  {
    slug: 'gama-vans',
    title: 'Loja de peças para vans',
    category: 'design',
    kind: 'Cliente',
    summary: 'E-commerce em Next.js com UX para um público mais velho, geração estática e CSP.',
    stack: ['Next.js', 'UI/UX'],
    visibility: 'case-study-only',
  },
];

export const getProject = (slug: string) => PROJECTS.find((p) => p.slug === slug);
// ordem da home: primeiro o que mais diz sobre o trabalho
const ORDEM = ['lcp-consultoria', 'qa-intelligence', 'parity-gate', 'plenario'];
export const FEATURED = PROJECTS.filter((p) => p.featured).sort((a, b) => ORDEM.indexOf(a.slug) - ORDEM.indexOf(b.slug));
export const OTHERS = PROJECTS.filter((p) => !p.featured);
/** Os que aparecem em "Mais trabalhos" na home, nesta ordem. */
export const MAIS = ['pettracker', 'brasa', 'bancada', 'mariane-borges'].map((s) => PROJECTS.find((p) => p.slug === s)!);
/** O link que pode ser aberto, se houver (site no ar ou repositório público). */
export const publicLink = (p: Project) => p.url ?? p.repositoryUrl;

export const CATEGORY_LABEL: Record<Project['category'], string> = {
  software: 'SOFTWARE',
  quality: 'QUALIDADE',
  automation: 'AUTOMAÇÃO',
  design: 'EXPERIÊNCIA WEB',
  leadership: 'LIDERANÇA',
};
