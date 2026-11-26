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
    funcionamento:
      'O visitante responde 5 perguntas sobre a empresa e vê na hora um medidor da saúde financeira (controle, atenção ou crítico) com as frentes de serviço recomendadas. Um botão leva o resultado pronto para o WhatsApp da consultoria, sem formulário nem servidor no meio.',
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
      'Painel web para acompanhar pets: o login separa administrador e tutor, cada um com o seu painel, e o tutor vê no mapa onde o pet está. Em desenvolvimento: por enquanto é só o front.',
    funcionamento:
      'A pessoa entra e o sistema decide, pelo perfil, se mostra o painel do administrador ou o do tutor. Na tela de rastreamento, a posição do pet aparece num mapa do OpenStreetMap com o histórico de pontos; ela deveria chegar por WebSocket, mas hoje o próprio código simula o movimento a cada 15 segundos.',
    approach: 'React com Vite, mapa com Leaflet e uma conexão WebSocket preparada para receber a posição em tempo real. O servidor ainda não existe: login e posição são simulados.',
    stack: ['React', 'Vite', 'Leaflet', 'WebSocket'],
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
    funcionamento:
      'Cada card que chega ao QA passa por um roteiro fixo: prova que o ambiente está certo, monta os casos extremos, executa e entrega um laudo. Os casos de API saem de uma fábrica que os gera a partir de requisições reais, e um painel mostra à gestão, sprint a sprint, onde as entregas travam e quanto voltam.',
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
    funcionamento:
      'Antes de uma mudança entrar no código, o gate chama a API e compara a resposta com o contrato combinado: se um campo sumiu, mudou de tipo ou o status code trocou, ele barra o merge e explica o que quebrou. Também separa endpoint instável de teste instável.',
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
    funcionamento:
      'Quem chega pelo Instagram cai numa página só, idêntica à arte aprovada, que conta o trabalho da nutricionista e termina sempre perto de "Agende sua consulta". O formulário monta a mensagem e abre o WhatsApp dela já com o texto pronto.',
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
    funcionamento:
      'A pessoa escolhe um processo e um papel (defesa ou acusação) e os agentes de IA fazem o resto do júri: juiz, promotor, testemunhas e jurados. Quem decide a fase do rito é um motor com as regras do Código de Processo Penal; a IA só fala, sempre citando a prova dos autos.',
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
    funcionamento:
      'É um app de computador para um grupo de amigos, no estilo Discord, em que só entra quem tem convite e está na lista de liberação, com login pelo Discord. As mensagens e o "digitando" chegam em tempo real, e quem vê o quê é decidido pelo próprio banco de dados. Voz, câmera e tela passam por um servidor de voz do próprio grupo, com uma chave que vale para uma sala só por 5 minutos.',
    stack: ['Electron', 'React', 'Fastify', 'Postgres', 'LiveKit'],
    visibility: 'private',
  },

  {
    slug: 'bancada',
    title: 'b2qa · o QA dentro do Claude',
    category: 'automation',
    kind: 'Plugin interno · B2List',
    summary:
      'Plugin do Claude Code criado para a empresa: conduz o teste de cada card em 9 etapas, põe um agente crítico para derrubar cada achado antes de virar bug, trava escrita em produção e mostra o laudo ao vivo num painel ao lado da conversa.',
    funcionamento:
      'O QA abre um card no Claude Code e o plugin conduz o teste em 9 etapas, com um agente crítico que tenta derrubar cada achado antes de ele virar bug. Escrita em produção é bloqueada, e um painel ao lado da conversa mostra o laudo se montando ao vivo.',
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
    summary: 'Simulação que põe a mesma população, no mesmo mundo e sob os mesmos choques, para viver sob dez conjuntos de regras ideológicas, e compara o que acontece com cada sociedade em 100 anos.',
    funcionamento:
      'Um motor em Python simula 1.500 cidadãos por sociedade sob dez modelos ideológicos, com os mesmos choques para todos. Agentes como líder, legisladores, juiz e imprensa propõem leis, que o motor confere antes da votação; eles podem ser movidos por regras ou por um modelo de linguagem local. Uma interface web desenha cada sociedade como uma vila em pixel art e compara tudo em gráficos, inclusive o Brasil de 1500 a 2076 contra dados reais.',
    stack: ['Python', 'NumPy', 'Agentes', 'Ollama'],
    visibility: 'case-study-only',
  },
  {
    slug: 'ia-para-gestores',
    title: 'IA para Gestores',
    category: 'leadership',
    kind: 'Curso · B2List',
    summary:
      'Curso interno em 7 módulos que leva gestores, diretores e coordenadores do primeiro contato com o Claude até a adoção governada de IA na própria área.',
    funcionamento:
      'São 7 módulos, cada um começando por uma situação real da rotina do gestor (uma ata, um planejamento, um e-mail difícil), passando por uma demonstração ao vivo e terminando num exercício no trabalho do próprio aluno. No fim, cada um sai com o mapa de adoção de IA da sua área.',
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
    kind: 'Freelance · em desenvolvimento (fase 0)',
    summary: 'Bot de trading para Telegram na rede Base, no estilo do BasedBot. Está na fase 0: a estrutura, o /start, o menu e os convites funcionam; compra, venda e ordens limite são as próximas fases.',
    funcionamento:
      'O Telegram entrega cada mensagem a um webhook numa aplicação Next.js, e o bot responde ao /start com um menu de 9 botões; o /start também aceita um código de convite. Pelo plano, as ordens vão ser executadas pela Definitive Flash API com a taxa do bot descontada em cada operação, e as chaves das carteiras ficam cifradas com AES-256-GCM.',
    stack: ['Next.js', 'Telegram Bot API', 'Base (EVM)'],
    visibility: 'private',
  },
  {
    slug: 'transmute',
    title: 'Transmute',
    category: 'software',
    kind: 'Produto · pausado',
    summary:
      'Terminal de inteligência on-chain na rede Base: um oráculo de IA caça tokens em estágio inicial, agentes com arquétipos de Jung debatem e votam a "Call of the Day", e um bot de Telegram leva tudo para os grupos.',
    funcionamento:
      'Toda noite um oráculo de IA caça tokens novos na rede Base, e agentes com arquétipos diferentes debatem e votam se vale uma "Call of the Day". O resultado vai para o site e para um bot de Telegram, que também responde quando alguém posta um endereço de contrato no grupo.',
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
    kind: 'Produto Web3 · pausado',
    summary:
      'Plataforma de imagens com IA na rede Base: a pessoa descreve a imagem num chat e recebe a arte pronta, ou usa um workflow criado pela comunidade (um estilo com prompt, passos e capa). Os créditos semanais vêm do token $LUNARA que ela guarda na carteira.',
    funcionamento:
      'A pessoa entra com a carteira ou com o X, descreve a imagem num chat e recebe a arte pronta; cada geração desconta 100 créditos do saldo. Ela também pode escolher um workflow da comunidade (um estilo pronto) e os créditos da semana vêm de quanto token $LUNARA ela guarda.',
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
      'Pausado. Os sites saíram do ar; as telas abaixo são do front real rodando localmente, com login, servidor e geração simulados e as imagens tiradas das artes deste portfólio.',
    stack: ['React', 'Vite', 'NestJS', 'Prisma', 'OpenAI', 'Base (EVM)', 'Virtuals ACP'],
    visibility: 'case-study-only',
  },
  {
    slug: 'asphodel',
    title: 'Asphodel',
    category: 'software',
    kind: 'Produto Web3 · pausado',
    summary:
      'Launchpad de memecoins para a rede Elysium: a pessoa planta uma moeda numa tela só e numa transação só, e ela nasce como semente numa curva de preço própria até florescer numa pool de DEX ao chegar em 300 HYPE. O campo de asfódelos em 3D é o mapa das moedas.',
    funcionamento:
      'Quem quer lançar uma moeda preenche uma tela só e assina uma transação; a moeda nasce numa curva de preço própria, com regras fixas e proteção contra robôs no primeiro minuto. Quando a curva junta 300 HYPE, a moeda "floresce" e vai para uma pool de DEX.',
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
      'Pausado antes do lançamento: os contratos não chegaram a ser auditados. A vitrine segue no ar, com moedas e negociações simuladas e um aviso claro; lista de espera e pedidos de lançamento estão fechados.',
    stack: ['Next.js', 'TypeScript', 'Tailwind', 'Solidity', 'Foundry', 'viem', 'Three.js', 'Postgres'],
    url: 'https://asphodel-three.vercel.app',
    visibility: 'public',
  },

  {
    slug: 'eatmate',
    title: 'EatMate',
    category: 'software',
    kind: 'Colaboração · open source',
    summary:
      'Diário alimentar que roda no navegador: a pessoa anota as refeições em linguagem natural e recebe uma nota semanal de A a E no estilo Nutri-Score e um relatório para compartilhar. Sem conta, sem servidor, funciona offline e em 6 idiomas.',
    funcionamento:
      'A pessoa anota o que comeu do jeito que fala ("café com leite e pão na chapa") e o app separa os alimentos e dá uma nota de A a E para cada refeição. Depois de 7 dias registrados sai uma nota da semana e um relatório para mostrar ao nutricionista; tudo fica só no aparelho.',
    approach:
      'Entrei na segurança e na robustez do app, que guarda tudo no próprio aparelho: o que entra de fora (backup importado, iframe, scripts) passou a ter limite, e o que pesa passou a carregar só quando a pessoa precisa.',
    evidence: [
      'Content Security Policy, bibliotecas separadas e GitHub Actions fixadas por SHA (contra ataque à cadeia de dependências).',
      'Abertura dentro de iframe bloqueada (contra clickjacking) e idiomas e telas baixados sob demanda.',
      'Backup importado com limite de tamanho, de quantidade e de texto, e a cópia local compactada quando o armazenamento do navegador enche.',
      'Telas estreitas ajustadas, com um teste automático que falha se aparecer rolagem lateral.',
    ],
    outcome: 'No ar no GitHub Pages. Minha parte: 5 commits de segurança, desempenho e responsividade.',
    stack: ['TypeScript', 'PWA', 'CSP', 'GitHub Actions'],
    url: 'https://malonefreak.github.io/EatMate/',
    repositoryUrl: 'https://github.com/MaloneFreak/EatMate',
    visibility: 'public',
    colaboracao: { dono: 'MaloneFreak', donoUrl: 'https://github.com/MaloneFreak', papel: 'Segurança, desempenho e responsividade' },
  },
  {
    slug: 'jobeval',
    title: 'JobEval',
    category: 'automation',
    kind: 'Colaboração · open source',
    summary:
      'Prompts de operação que transformam um LLM num consultor de recrutamento de um mercado específico: nota de aderência à vaga baseada em evidência, currículo ajustado e carta de apresentação opcional, entregues como código Typst.',
    funcionamento:
      'A pessoa copia o assistente do país da vaga, cola no ChatGPT, Claude ou Gemini e manda o currículo e a vaga. O assistente avalia a aderência com base no que está comprovado, espera a escolha da pessoa e escreve o currículo ajustado, que vira PDF numa página do próprio site.',
    approach:
      'Escrevi a edição brasileira: a persona Helena Duarte, uma consultora que conhece o mercado de trabalho do Brasil, para que a avaliação e o currículo sigam o que recrutadores daqui esperam.',
    evidence: [
      'Edição Brasil: a persona Helena Duarte, consultora que avalia a vaga e ajusta o currículo pelo que o mercado brasileiro espera.',
    ],
    outcome: 'No ar no GitHub Pages. Minha parte: a edição brasileira.',
    stack: ['Engenharia de prompt', 'LLM', 'Typst'],
    url: 'https://malonefreak.github.io/JobEval/',
    repositoryUrl: 'https://github.com/MaloneFreak/JobEval',
    visibility: 'public',
    colaboracao: { dono: 'MaloneFreak', donoUrl: 'https://github.com/MaloneFreak', papel: 'Edição brasileira' },
  },

  {
    slug: 'gama-vans',
    title: 'Loja de peças para vans',
    category: 'design',
    kind: 'Cliente · proposta',
    summary: 'Loja de peças para a Gama Vans, oficina de vans de Uberlândia, desenhada para um público mais velho: letra grande, passos numerados e um carrinho enxuto. Catálogo por modelo de van e busca por peça.',
    funcionamento:
      'O cliente escolhe o modelo da van (Sprinter, Ducato, Master ou HR) ou busca a peça pelo nome ou código e vai adicionando ao carrinho. As páginas do catálogo são geradas antes do acesso a partir de um banco SQLite; o carrinho guarda no navegador só a peça e a quantidade, e o preço sempre vem do catálogo. A finalização ainda é uma simulação, sem pagamento.',
    stack: ['Next.js', 'SQLite', 'Acessibilidade', 'CSP'],
    visibility: 'case-study-only',
  },
];

export const getProject = (slug: string) => PROJECTS.find((p) => p.slug === slug);
/** Os meus (sou dono) e as colaborações (projetos de outras pessoas em que participo). */
export const PROPRIOS = PROJECTS.filter((p) => !p.colaboracao);
export const COLABORACOES = PROJECTS.filter((p) => p.colaboracao);
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
