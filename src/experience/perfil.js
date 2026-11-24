// Conteúdo da apresentação do Gabriel Caetano. Tudo o que aparece nos painéis sai daqui.
// Regra: só fatos verificáveis. Campos `null` não aparecem no site (preencher: linkedin, email, links dos projetos).
// `vista`: o canto da caverna onde a câmera para (os 12 túneis ficam reservados para os projetos).
// 'heroi' | 'computador' | 'garagem' | 'sacada' | 'teto' | 'cachoeira' | 'emblema' | 'galerias' | 'entrada'.

export const PERFIL = {
  nome: 'Gabriel Caetano',
  papel: 'Full Stack · Automação de QA · Tech Lead · IA',
  resumo:
    'Construo produtos web de ponta a ponta e cuido para que eles não quebrem: desenvolvimento full stack, ' +
    'automação de testes, liderança técnica e IA aplicada ao dia a dia da engenharia.',
  contato: {
    github: 'https://github.com/Kattiell',
    linkedin: null,
    email: null,
  },
};

export const SECOES = [
  {
    id: 'sobre', menu: 'Sobre', vista: 'heroi',
    titulo: 'Engenharia que entrega e qualidade que sustenta',
    lead:
      'Mais de três anos em qualidade de software numa plataforma B2B, somados a produtos próprios e de clientes ' +
      'construídos do banco de dados à interface. Uso IA como ferramenta de engenharia, com método e verificação.',
    pilares: [
      ['fullstack', 'Full Stack'], ['qa', 'Automação de QA'], ['lead', 'Tech Lead'],
      ['ia', 'Integrações de IA'], ['cripto', 'Cripto e Web3'], ['uiux', 'UI/UX sob medida'],
    ],
  },
  {
    id: 'fullstack', menu: 'Full Stack', vista: 'computador',
    titulo: 'Full Stack',
    lead: 'Do banco de dados à interface: produtos completos, com segurança pensada desde o primeiro commit.',
    itens: [
      'Aplicações em Next.js, React e TypeScript sobre Postgres e Supabase, com políticas de acesso por linha (RLS).',
      'APIs em Node (Fastify) e .NET, app desktop em Electron e sites estáticos rápidos em Astro.',
      'Pagamentos com Mercado Pago, Content Security Policy rígida, fontes próprias e deploy na Cloudflare.',
      'Experiências 3D em Three.js, como esta caverna.',
    ],
    projetos: ['lcp', 'plenario', 'brasa'],
    stack: ['Next.js', 'React', 'TypeScript', 'Node / Fastify', '.NET', 'Postgres', 'Supabase', 'Electron', 'Astro', 'Three.js', 'Cloudflare'],
  },
  {
    id: 'qa', menu: 'QA', vista: 'garagem',
    titulo: 'Automação de QA',
    lead: 'Qualidade como engenharia: testes que encontram o defeito antes do cliente.',
    itens: [
      'QA na B2List, plataforma B2B: testes de API, ponta a ponta e regressão entre o sistema legado e o refatorado.',
      'Testes de carga e estresse: um lote de 20 mil produtos expôs o limite de tempo do gateway antes de chegar à produção.',
      '322 requisições de teste destiladas em fixtures JSON e organizadas em 49 famílias, com mapa de cobertura.',
      'Ferramentas próprias para o time: um terminal de QA em Rust e um plugin de QA para o Claude Code.',
    ],
    projetos: ['parity-gate', 'bancada', 'b2qa'],
    stack: ['Testes de API', 'Testes de contrato', 'E2E', 'Carga e estresse', 'Regressão', 'Rust', 'Node'],
  },
  {
    id: 'lead', menu: 'Tech Lead', vista: 'sacada',
    titulo: 'Tech Lead',
    lead: 'Direção técnica: processo, ferramenta e pessoas andando na mesma linha.',
    itens: [
      'Reestruturação do setor de QA: uma única fonte de verdade para o trabalho e um harness que compara legado e refatorado.',
      'Método de análise de cards em seis fases: extração, estudo, lacunas, bugs, cenários ponta a ponta e especificação técnica.',
      'Documentação em escala: 200 repositórios descritos num cofre de conhecimento consultável pelo time.',
      'Formação de lideranças: curso “IA para Gestores”, voltado a gestores e RH.',
    ],
    projetos: ['bancada', 'curso-ia'],
    stack: ['Processo de QA', 'Revisão técnica', 'Documentação', 'Mentoria', 'ClickUp'],
  },
  {
    id: 'ia', menu: 'IA', vista: 'teto',
    titulo: 'Integrações de IA',
    lead: 'IA aplicada a produto e a processo, com método e verificação.',
    itens: [
      'Sistemas multiagentes: agentes especialistas trabalhando no mesmo projeto. Esta caverna foi modelada no Blender por uma oficina de agentes.',
      'Agentes ligados ao ClickUp que transformaram centenas de repositórios e cards em base de conhecimento.',
      'Simulações com agentes: um Tribunal do Júri e um laboratório de civilizações rodando com modelo local (Ollama).',
      'Plugins, skills e servidores MCP para o Claude Code no fluxo diário de QA.',
    ],
    projetos: ['plenario', 'laboratorio', 'b2qa', 'curso-ia'],
    stack: ['Claude / Anthropic', 'Agentes', 'MCP', 'Ollama', 'Python', 'Blender (automação)'],
  },
  {
    id: 'cripto', menu: 'Cripto', vista: 'cachoeira',
    titulo: 'Cripto e Web3',
    lead: 'Web3 com os pés no chão: produto, segurança e execução.',
    itens: [
      'Bot de trading para Telegram na rede Base, com ordens limite e taxa embutida via API de execução.',
      'Asphodel: launchpad de tokens na rede Elysium, da especificação ao site.',
      'Estudo crítico de agentes de trading autônomos, com foco nos riscos de segurança.',
    ],
    projetos: ['bot-telegram', 'asphodel'],
    stack: ['Base (EVM)', 'Telegram Bot API', 'Next.js', 'Segurança'],
  },
  {
    id: 'uiux', menu: 'UI/UX', vista: 'emblema',
    titulo: 'UI/UX moldado ao seu negócio',
    lead: 'Interfaces desenhadas a partir de quem vai usar e do que o negócio precisa vender.',
    itens: [
      'Loja de peças automotivas pensada para um público mais velho: tipografia legível, base de 18 px e carrinho enxuto.',
      'Sites institucionais e landing pages para advocacia, nutrição e consultoria, fiéis à arte aprovada e conferidos pixel a pixel.',
      'E-commerce com checkout e proteção de dados.',
      'Experiências imersivas em 3D para apresentar marcas e portfólios.',
    ],
    projetos: ['lcp', 'mariane', 'gama-vans'],
    stack: ['Acessibilidade', 'Design responsivo', 'Fidelidade à arte', 'Next.js', 'Astro', 'Three.js'],
  },
  {
    id: 'projetos', menu: 'Projetos', vista: 'galerias',
    titulo: 'Projetos',
    lead: 'Uma seleção do que construí. Cada um dos doze túneis da caverna vai abrir um projeto; os links públicos já estão marcados.',
    todos: true,
  },
  {
    id: 'contato', menu: 'Contato', vista: 'entrada',
    titulo: 'Vamos conversar',
    lead: 'Projetos, vagas ou parcerias: me chame pelo canal que preferir.',
    contato: true,
  },
];

export const PROJETOS = {
  'parity-gate': { nome: 'parity-gate', tipo: 'Open source', desc: 'Gate de contrato de API em três modos, sem dependências, coberto por 279 testes.', tags: ['QA', 'API'], url: 'https://github.com/Kattiell/parity-gate' },
  bancada: { nome: 'Bancada', tipo: 'Ferramenta interna', desc: 'Terminal de QA em Rust que roda os casos do time, com trava de somente leitura em produção.', tags: ['Rust', 'QA'], url: null },
  b2qa: { nome: 'Plugin de QA para Claude Code', tipo: 'Ferramenta interna', desc: 'Fluxo de teste de card, do contexto ao laudo, com credenciais fora do repositório.', tags: ['IA', 'QA'], url: null },
  lcp: { nome: 'LCP Consultoria', tipo: 'Cliente · no ar', desc: 'Site de consultoria financeira em React com pré-renderização para SEO, hero em Three.js, CSP e acessibilidade sem violações no axe.', tags: ['Full Stack', 'UI/UX'], url: 'https://www.lcpconsultoria.srv.br/' },
  mariane: { nome: 'Mariane Borges · Nutrição', tipo: 'Cliente · em lançamento', desc: 'Site estático em Astro para nutricionista, idêntico à arte aprovada e leve para celular.', tags: ['UI/UX'], url: null },
  plenario: { nome: 'Plenário', tipo: 'Open source', desc: 'Simulador de Tribunal do Júri com agentes de IA. .NET 10 e Next.js, 74 testes.', tags: ['IA', 'Full Stack'], url: null },
  brasa: { nome: 'Brasa', tipo: 'Produto privado', desc: 'Comunicação por voz e texto: Electron, Fastify, Postgres com RLS e LiveKit próprio.', tags: ['Full Stack'], url: null },
  laboratorio: { nome: 'Laboratório de Civilizações', tipo: 'Pesquisa', desc: 'Simulação ideológica com agentes em Python e NumPy, rodando com LLM local.', tags: ['IA'], url: null },
  'curso-ia': { nome: 'IA para Gestores', tipo: 'Curso', desc: 'Curso para gestores e RH sobre uso responsável do Claude no trabalho.', tags: ['IA', 'Liderança'], url: null },
  'bot-telegram': { nome: 'Bot de trading (Base)', tipo: 'Freelance', desc: 'Bot para Telegram com ordens limite e taxa embutida na rede Base.', tags: ['Cripto'], url: null },
  asphodel: { nome: 'Asphodel', tipo: 'Produto', desc: 'Launchpad de tokens na rede Elysium, com especificação e site em Next.js.', tags: ['Cripto', 'Full Stack'], url: null },
  'gama-vans': { nome: 'Loja de peças para vans', tipo: 'Cliente', desc: 'E-commerce em Next.js com UX para idosos, geração estática e CSP.', tags: ['UI/UX', 'Full Stack'], url: null },
};
