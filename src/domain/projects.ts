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
    kind: 'Projeto autoral · em desenvolvimento',
    summary:
      'Aplicação full stack em desenvolvimento, com autenticação, perfis de acesso e rastreamento em tempo real. Ainda não está pronta: o código está no GitHub.',
    approach: 'React no front, Node e Prisma no back, WebSocket para as atualizações em tempo real.',
    stack: ['React', 'Node', 'Prisma', 'WebSocket'],
    repositoryUrl: 'https://github.com/Kattiell/PetTracker',
    visibility: 'public',
  },

  {
    slug: 'qa-intelligence',
    title: 'Área de QA da B2List',
    category: 'quality',
    kind: 'Lead QA · B2List',
    featured: true,
    summary:
      'A área de QA de uma plataforma B2B montada do zero: método, fábrica de 11.600+ casos de teste de API, triagem de defeitos e um painel de gestão do time alimentado pelo ClickUp.',
    challenge:
      'Uma plataforma B2B de pedidos (app do vendedor, painel web e integrações com ERPs) rodando o legado e o refatorado ao mesmo tempo, com um QA só. O material de teste estava espalhado entre cards, coleções e scripts, não havia trava contra escrita acidental em produção e a liderança não via onde o tempo e o retrabalho se concentravam.',
    approach:
      'Transformei o método em ferramenta. Uma fábrica gera os casos de API a partir de requisições reais; um plugin próprio do Claude Code conduz cada card do contexto ao laudo; e um painel de acompanhamento mostra, sprint a sprint, onde cada card espera, o retrabalho, a carga de cada pessoa e as horas estimadas contra as registradas. Com estagiários entrando, tudo isso virou uma trilha de onboarding de 4 semanas.',
    evidence: [
      '11.635 casos de teste de API gerados de 322 requisições reais, em 208 blocos de endpoint; dos 1.410 executados em ambiente real, os 9 que falharam viraram achado de produto.',
      'Teste de estresse com 20 mil produtos expôs perda silenciosa de 55% dos registros (timeout no gateway) enquanto a tela dizia sucesso; IDOR e quebra de isolamento entre tenants barrados antes da produção.',
      'Painel de gestão do time (sprints 9 a 12) para liderança e diretoria: fluxo, idas e voltas por entrega, carga por pessoa, horas, backlog e impacto no cliente.',
      'Monitor de horas que cobra, uma vez por card, o registro abaixo da estimativa; triagem com severidade (S1–S4) e prioridade (P0–P3) separadas.',
      'Base de conhecimento de 252 notas (228 cobrindo 57 conectores de ERP) que a IA consulta citando a nota de origem.',
    ],
    outcome: 'O QA deixou de ser uma etapa e virou processo repetível: laudo padronizado, trava contra erro em produção e números por sprint para a gestão.',
    stack: ['Testes de API', 'Carga e estresse', 'Segurança', 'ClickUp', 'Python', 'Claude Code'],
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
    kind: 'Cliente · no ar',
    summary:
      'Site de uma página para uma nutricionista esportiva e estética: transforma a visita que chega do Instagram em agendamento no WhatsApp, idêntico à arte aprovada pela cliente.',
    challenge:
      'O público chega pelo Instagram, no celular, entre uma tarefa e outra, e precisa entender em segundos se a Mariane é para ele e como marcar. A cliente aprovou uma arte e queria o site idêntico a ela, sem cara de template de nutrição e sem promessa milagrosa.',
    approach:
      'Site estático em Astro. O banner é a própria arte, com o texto apagado por inpainting e devolvido em HTML real nas mesmas coordenadas, medido em unidades da arte para ficar idêntico em qualquer largura. Todo bloco termina perto de "Agende sua consulta", e o formulário monta a mensagem e abre o WhatsApp, sem servidor.',
    evidence: [
      'Calibração medida contra a arte: posição a no máximo 3 px e largura entre 99% e 102%.',
      'Lighthouse 100 nas quatro categorias no desktop; no celular, 99/100/100/100.',
      '0 violações no axe, 29 testes automatizados e 1,7 KB de JavaScript na página.',
      'Fontes próprias (só o subconjunto latino), CSP e cabeçalhos de segurança no host.',
    ],
    outcome: 'No ar na Vercel, com deploy automático a cada mudança.',
    stack: ['Astro', 'UI/UX', 'Acessibilidade', 'CSP', 'Vercel'],
    url: 'https://mariane-borges-nutricionista.vercel.app/',
    visibility: 'public',
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
    kind: 'Em desenvolvimento · não lançado',
    summary:
      'Comunicação por voz e texto para um grupo fechado: app desktop em Electron, API em Fastify, Postgres com acesso por linha e servidor de voz LiveKit próprio. Ainda não foi lançado e, por enquanto, só roda localmente.',
    stack: ['Electron', 'Fastify', 'Postgres', 'LiveKit'],
    visibility: 'private',
  },

  {
    slug: 'bancada',
    title: 'b2qa · o QA dentro do Claude',
    category: 'automation',
    kind: 'Plugin interno · B2List',
    summary:
      'Plugin do Claude Code criado para a empresa: conduz o teste de cada card em 9 etapas, põe um agente crítico para derrubar cada achado antes de virar bug, trava escrita em produção e mostra o laudo ao vivo num painel ao lado da conversa.',
    challenge:
      'Com estagiários entrando, o método de teste precisava ser seguido por outra pessoa no primeiro dia, e a IA não podia escrever em produção nem abrir card sozinha.',
    approach:
      'Um marketplace interno com 4 plugins: o núcleo (skills de teste, ClickUp, base de conhecimento e documentação, mais o agente crítico e os hooks de trava), os 11.635 casos de API como comandos, um acervo curado de skills de QA e o painel do laudo. As credenciais ficam fora do repositório. Para o líder, um terminal em Rust (Bancada) roda os casos com a mesma trava de ambiente.',
    evidence: [
      'Teste de card em 9 etapas, do pré-voo à entrega: o ambiente só conta como provado com 200 com token e 401 sem; a matriz parte de 16 tipos de caso extremo; a IA propõe o veredito e o líder de QA revisa.',
      'Agente crítico: cada achado responde a cinco perguntas (dado, ambiente, decisão de produto, automação, dono da regra) e só vira bug se sobreviver.',
      'Trava de produção nos hooks: POST, PUT, PATCH e DELETE em produção são recusados, host desconhecido conta como produção, e no ClickUp a IA só lê.',
      'Painel do laudo ao vivo: etapa, casos por status, achados, massa de teste a limpar e cada chamada de API com a credencial mascarada; portão de entrega que cobra evidência antes do veredito.',
      'Bancada: terminal em Rust (ratatui) com histórico em SQLite e exportação de evidência por card.',
    ],
    outcome: 'Em uso pelo time de QA, instalável por um comando a partir do repositório da empresa.',
    stack: ['Claude Code', 'TypeScript', 'Node', 'Rust', 'MCP'],
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
    kind: 'Curso · B2List',
    summary:
      'Curso interno em 7 módulos que leva gestores, diretores e coordenadores do primeiro contato com o Claude até a adoção governada de IA na própria área.',
    challenge:
      'Gestores sem base técnica lidando com volume de informação, comunicação repetida, análise sob pressão e documentação atrasada, e sem regra clara para levar a IA ao time.',
    approach:
      'Cada módulo abre com uma situação real da rotina de gestão (ata, planejamento, e-mail difícil, material institucional), passa pelo método e por uma demonstração ao vivo e fecha com um exercício no trabalho do aluno. Técnica e responsabilidade andam juntas: prompt, Projects e Skills de um lado; LGPD e validação humana do outro. O entregável final é o Mapa de Adoção da área de cada aluno.',
    evidence: [
      '7 módulos e 169 slides: por que e quando usar IA; configurar o Claude; reuniões em 15 minutos; planejamento trimestral; comunicação executiva; criação institucional; liderar a adoção.',
      'Método CRISP (Contexto, Restrição, Instrução, Saída, Persona) e um slide "quando o Claude vai errar" em todo módulo.',
      'Matriz de governança Confiar, Verificar, Nunca delegar, política mínima de uso e roadmap de 90 dias.',
      'Escrito em markdown e gerado por um pipeline em Python que produz HTML e PPTX, em versão interna e white-label, com um validador que barra termo interno vazando.',
    ],
    outcome: 'Material completo para gestores da empresa, pronto para novas turmas.',
    stack: ['IA', 'Liderança', 'Governança', 'Python'],
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
    slug: 'transmute',
    title: 'Transmute',
    category: 'software',
    kind: 'Produto · pausado',
    summary:
      'Terminal de inteligência on-chain na rede Base: um oráculo de IA caça tokens em estágio inicial, agentes com arquétipos de Jung debatem e votam a "Call of the Day", e um bot de Telegram leva tudo para os grupos.',
    challenge:
      'Publicar sinais de IA sobre tokens recém-lançados sem repassar golpe nem endereço de contrato inventado pelo modelo, controlando o custo dos modelos e respeitando os limites do Telegram (cerca de 20 mensagens por minuto por grupo).',
    approach:
      'Cada endereço de contrato exibido é confirmado em duas fontes de mercado por um resolvedor determinístico, contra golpe e alucinação. O acesso é liberado pelo saldo do token na carteira, com login por assinatura (SIWE). No Agent Arena, cada usuário cria um agente a partir de um dos 12 arquétipos; toda noite os agentes caçam, debatem e votam, e só sai uma call se houver consenso, tudo numa cidade isométrica em pixel art. Dado de token é tratado como entrada hostil.',
    evidence: [
      'Site em Next.js 16 com 314 testes Vitest passando, em 294 commits; bot com cerca de 20 comandos e cerca de 12 mil linhas de TypeScript, em 88 commits.',
      'Card automático quando alguém posta um endereço de contrato no grupo, ranking de quem fez as melhores calls e um flexcard em PNG com o multiplicador da call.',
      'Flexcard desenhado como SVG com fontes embutidas e convertido em PNG (resvg), para o texto nunca sair borrado.',
      'Cotas diárias por comando e uma caçada única do sistema distribuída a todos os holders, no lugar de uma caçada paga por usuário.',
    ],
    outcome: 'Pausado. O código do bot é público no GitHub; o site não está mais no ar, e as telas abaixo são do projeto rodando localmente.',
    stack: ['Next.js', 'Supabase', 'LangGraph', 'viem', 'Telegraf', 'Vercel'],
    repositoryUrl: 'https://github.com/Kattiell/transmute-bot',
    visibility: 'public',
  },


  {
    slug: 'lunara',
    title: 'Lunara',
    category: 'software',
    kind: 'Produto Web3 · IA',
    summary:
      'Plataforma de imagens com IA na rede Base: a pessoa descreve a imagem num chat e recebe a arte pronta, ou usa um workflow criado pela comunidade (um estilo com prompt, passos e capa). Os créditos semanais vêm do token $LUNARA que ela guarda na carteira.',
    challenge:
      'Cobrar geração de imagem sem cartão de crédito e sem deixar o custo dos modelos fugir do controle: o acesso precisava sair do token, com login por carteira ou pelo X, e cada imagem gerada tinha de ser descontada de um saldo que o usuário enxerga.',
    approach:
      'Créditos como livro-caixa no servidor (saldo, transações e uso de workflow em tabelas próprias), com a recarga semanal decidida pelo saldo de $LUNARA: Free com 100 créditos, Premium com 1.200 a partir de 400 mil tokens, VIP+ com 9.000 a partir de 1 milhão. Login por carteira com assinatura ou pelo X com OAuth 2.0 e PKCE, sessão em cookie HttpOnly. Workflows da comunidade com curtidas, visualizações e custo fixo de 100 créditos para quem não é o autor. Geração pelo gpt-image-1 da OpenAI.',
    evidence: [
      'Backend em NestJS com Prisma (95 commits): usuários, contas sociais, carteiras, staking, workflows, uso de workflow, saldo e transações de crédito, e log de auditoria.',
      'Integração com o Agent Commerce Protocol da Virtuals: outros agentes pagam em USDC e recebem a imagem por uma API com esquema de entrada e de saída.',
      'A Lunara também age sozinha: um agente na rede social de agentes Moltbook e um bot no X que classifica cada menção (informação, análise, workflow ou conversa) antes de responder, dentro do limite de 1.500 posts por mês do plano gratuito.',
      'Front em React com Vite, Tailwind e Radix (48 commits), com perfil, plano, carteiras e geração no celular.',
    ],
    outcome:
      'Os sites saíram do ar. As telas abaixo são do front real rodando localmente, com login, servidor e geração simulados e as imagens tiradas das artes deste portfólio.',
    stack: ['React', 'Vite', 'NestJS', 'Prisma', 'OpenAI', 'Base (EVM)', 'Virtuals ACP'],
    visibility: 'case-study-only',
  },
  {
    slug: 'asphodel',
    title: 'Asphodel',
    category: 'software',
    kind: 'Produto Web3 · pré-lançamento',
    summary:
      'Launchpad de memecoins para a rede Elysium: a pessoa planta uma moeda numa tela só e numa transação só, e ela nasce como semente numa curva de preço própria até florescer numa pool de DEX ao chegar em 300 HYPE. O campo de asfódelos em 3D é o mapa das moedas.',
    challenge:
      'Launchpads de memecoin costumam premiar quem compra no primeiro segundo e quem cria a moeda e vende tudo. A ideia era um lançamento justo e legível: regras fixas que ninguém muda depois, proteção contra robôs no início e tudo visível para quem chega depois.',
    approach:
      'Curva x·y=K com taxa fixa de 1% (0,90% para o criador e 0,10% para a plataforma), anti-sniper de 60 s com taxa de 50% caindo até 1%, compra do criador limitada a 1% do suprimento e 1 bilhão de tokens sem dono e sem mint. A matemática do site e a do contrato são a mesma, e um teste confere a cotação contra a rede. Pedido de lançamento passa por moderação de texto e de imagem no servidor antes de virar semente no campo.',
    evidence: [
      'Contratos em Solidity com Foundry (TokenFactory, BondingCurve, AsphodelToken e FeeVault): 26 testes e 4 invariantes com 12 mil trades aleatórios.',
      'Site em Next.js 16, TypeScript e Tailwind 4 com login por carteira (SIWE) e pelo X, perfil, lista de espera e pedidos de lançamento gravados em Postgres com RLS.',
      'Moderação no servidor: texto normalizado contra leetspeak e repetição (55 testes, incluindo falsos positivos) e imagem re-encodada sem metadados e classificada por NSFWJS.',
      'Página de cada moeda com Raio-X (compra do criador, top 10, carteiras ligadas e escudo anti-sniper), curva, compra e venda com slippage e taxas do criador.',
    ],
    outcome:
      'Em pré-lançamento: os contratos ainda não foram auditados. No ar como vitrine, com moedas e negociações simuladas e um aviso claro; lista de espera e pedidos de lançamento abrem com a testnet.',
    stack: ['Next.js', 'TypeScript', 'Tailwind', 'Solidity', 'Foundry', 'viem', 'Three.js', 'Postgres'],
    url: 'https://asphodel-three.vercel.app',
    visibility: 'public',
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
export const MAIS = ['lunara', 'asphodel', 'mariane-borges', 'transmute', 'bancada', 'ia-para-gestores', 'laboratorio-civilizacoes', 'brasa'].map((s) => PROJECTS.find((p) => p.slug === s)!);
/** O link que pode ser aberto, se houver (site no ar ou repositório público). */
export const publicLink = (p: Project) => p.url ?? p.repositoryUrl;

export const CATEGORY_LABEL: Record<Project['category'], string> = {
  software: 'SOFTWARE',
  quality: 'QUALIDADE',
  automation: 'AUTOMAÇÃO',
  design: 'EXPERIÊNCIA WEB',
  leadership: 'LIDERANÇA',
};
