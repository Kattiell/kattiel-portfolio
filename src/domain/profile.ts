// Quem é, o que faz e como falar com ele. Campos null não aparecem no site.

export const PROFILE = {
  brand: 'KATTIEL',
  name: 'Gabriel Caetano',
  role: 'Full Stack • Quality Engineering • IA',
  headline: 'O lado invisível de cada sistema.',
  intro:
    'Construo experiências digitais, valido sistemas complexos e automatizo o que precisa funcionar. ' +
    'Meu trabalho vive entre o que as pessoas veem e o que torna tudo possível.',
  about:
    'Sou Gabriel Caetano. Minha atuação cruza desenvolvimento full stack, qualidade de software, automação, ' +
    'inteligência artificial e liderança técnica: transformar complexidade em decisões claras e produtos confiáveis.',
  contact: {
    github: 'https://github.com/Kattiell',
    linkedin: 'https://www.linkedin.com/in/gabrielcaetanopf' as string | null, // do currículo
    email: null as string | null,
  },
};

export const CAPABILITIES = [
  { index: 'I / CONSTRUIR', title: 'Construir.', text: 'Arquitetura, APIs, aplicações e experiências digitais, do banco à interface.', fine: 'ENGENHARIA' },
  { index: 'II / VERIFICAR', title: 'Questionar.', text: 'Qualidade orientada a risco, evidência e decisão.', fine: 'QUALITY ENGINEERING' },
  { index: 'III / AMPLIAR', title: 'Amplificar.', text: 'Automação, agentes e fluxos com IA, com método e verificação.', fine: 'AUTOMAÇÃO & IA' },
  { index: 'IV / CONDUZIR', title: 'Conduzir.', text: 'Organização técnica, processo e pessoas andando na mesma linha.', fine: 'LIDERANÇA' },
];

/** Frentes de atuação: o que já foi feito em cada uma (fatos verificáveis). */
export const PRACTICES = [
  {
    id: 'fullstack',
    title: 'Full Stack',
    lead: 'Do banco de dados à interface, com segurança pensada desde o primeiro commit.',
    items: [
      'Next.js, React e TypeScript sobre Postgres e Supabase, com políticas de acesso por linha (RLS).',
      'APIs em Node (Fastify) e .NET, app desktop em Electron, sites estáticos em Astro.',
      'Pagamentos com Mercado Pago, CSP rígida e deploy na Cloudflare.',
    ],
    stack: ['Next.js', 'React', 'TypeScript', 'Node', '.NET', 'Postgres', 'Three.js'],
  },
  {
    id: 'qa',
    title: 'Automação de QA',
    lead: 'Testes que encontram o defeito antes do cliente.',
    items: [
      'QA numa plataforma B2B: API, ponta a ponta e regressão entre o sistema legado e o refatorado.',
      'Carga e estresse: um lote de 20 mil produtos expôs o limite de tempo do gateway antes da produção.',
      'Ferramentas próprias para o time: terminal de QA em Rust e plugin de QA para o Claude Code.',
    ],
    stack: ['API', 'Contrato', 'E2E', 'Carga', 'Regressão', 'Rust'],
  },
  {
    id: 'lead',
    title: 'Tech Lead',
    lead: 'Processo, ferramenta e pessoas na mesma direção.',
    items: [
      'Reestruturação do setor de QA com uma única fonte de verdade para o trabalho.',
      'Método de análise de cards em seis fases, da extração à especificação técnica.',
      'Documentação em escala: 200 repositórios descritos num cofre de conhecimento do time.',
    ],
    stack: ['Processo', 'Revisão técnica', 'Documentação', 'Mentoria'],
  },
  {
    id: 'ia',
    title: 'Integrações de IA',
    lead: 'IA aplicada a produto e a processo.',
    items: [
      'Sistemas multiagentes: o cenário 3D deste site foi modelado no Blender por uma oficina de agentes.',
      'Agentes ligados ao ClickUp que transformaram repositórios e cards em base de conhecimento.',
      'Plugins, skills e servidores MCP para o Claude Code no fluxo diário de QA.',
    ],
    stack: ['Claude', 'Agentes', 'MCP', 'Ollama', 'Python'],
  },
  {
    id: 'cripto',
    title: 'Cripto e Web3',
    lead: 'Produto, segurança e execução.',
    items: [
      'Bot de trading para Telegram na rede Base, com ordens limite e taxa embutida.',
      'Transmute: oráculo de IA na rede Base em que agentes debatem e votam a call do dia, com bot de Telegram.',
      'Estudo crítico de agentes de trading autônomos, com foco nos riscos de segurança.',
    ],
    stack: ['Base (EVM)', 'Telegram', 'Next.js', 'Segurança'],
  },
  {
    id: 'uiux',
    title: 'UI/UX sob medida',
    lead: 'Interfaces desenhadas a partir de quem usa e do que o negócio precisa vender.',
    items: [
      'Loja de peças pensada para um público mais velho: tipografia legível e carrinho enxuto.',
      'Sites para advocacia, nutrição e consultoria, fiéis à arte aprovada e conferidos pixel a pixel.',
      'Experiências imersivas em 3D para apresentar marcas e portfólios.',
    ],
    stack: ['Acessibilidade', 'Responsivo', 'Fidelidade à arte', 'Astro', 'Three.js'],
  },
];
