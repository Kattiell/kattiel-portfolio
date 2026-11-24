// O que a home diz além dos trabalhos: números do próprio trabalho, o método e um "sobre" curto.
// O portfólio mostra trabalho, não currículo: trajetória, formação e certificações ficam no LinkedIn.
// Telefone e e-mail ficam FORA do site.

/** Cada número sai de um trabalho mostrado na página. */
export const NUMEROS = [
  { n: '11.600+', u: 'casos', d: 'de teste de API na área de QA montada do zero' },
  { n: '279', u: 'testes', d: 'automatizados no parity-gate, open source' },
  { n: '74', u: 'testes', d: 'no Plenário, simulador de júri com agentes' },
  { n: '0', u: 'violações', d: 'de acessibilidade no site da LCP, no ar' },
];

export type Etapa = { n: string; nome: string; titulo: string; texto: string; provas: string[] };

/** Como o trabalho é feito: cada etapa com o que ela já produziu nos projetos acima. */
export const METODO: Etapa[] = [
  {
    n: '01',
    nome: 'Entender',
    titulo: 'Antes do código, o problema.',
    texto: 'Leio o negócio, mapeio o risco e escrevo o que precisa ser verdade para o trabalho estar pronto.',
    provas: [
      'Análise em seis fases: extração, estudo, lacunas, bugs, cenários ponta a ponta e especificação técnica.',
      'Na LCP, o problema era conversão e busca local, não layout: o diagnóstico nasceu daí.',
    ],
  },
  {
    n: '02',
    nome: 'Construir',
    titulo: 'Do banco à interface, seguro desde o início.',
    texto: 'Next.js, React e TypeScript na frente; Node, .NET e Postgres atrás. Segurança e acessibilidade entram no primeiro commit, não no fim.',
    provas: [
      'CSP rígida, acesso por linha (RLS) no Postgres e consentimento LGPD por categoria.',
      'Desempenho medido: cenas 3D que pausam fora da tela e resolução que se ajusta ao aparelho.',
    ],
  },
  {
    n: '03',
    nome: 'Verificar',
    titulo: 'Só passa o que foi provado.',
    texto: 'Teste é parte da entrega. Contrato, carga, segurança e regressão, com evidência que outra pessoa consegue conferir.',
    provas: [
      'Estresse com 20 mil registros, IDOR entre tenants e contratos de API checados antes da produção.',
      'Ferramentas que se testam: o parity-gate exige 100% de detecção das falhas plantadas.',
    ],
  },
  {
    n: '04',
    nome: 'Entregar',
    titulo: 'No ar, e continuando de pé.',
    texto: 'Deploy automático, documentação de quem vai manter e um caminho claro para a próxima mudança.',
    provas: [
      'Deploy contínuo na Vercel e na Cloudflare; relatório SARIF anotado direto no pull request.',
      'Fluxos com IA (Claude Code, agentes e MCP) para o trabalho repetitivo, com a decisão nas mãos de quem decide.',
    ],
  },
];

export const SOBRE = {
  local: 'Patos de Minas, MG · trabalho remoto',
  bio: [
    'Sou Gabriel Caetano, Lead QA e desenvolvedor full stack. Construo produtos e sites para clientes, e verifico sistemas que não podem falhar.',
    'Trabalho onde a engenharia e a qualidade se encontram: o que eu entrego vem com o teste que prova que funciona.',
  ],
};
