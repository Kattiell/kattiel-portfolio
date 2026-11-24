// A travessia da home: cada especialização é um espaço do edifício (artes modeladas no ChatGPT, 23/11).
// Só fatos do currículo e de projects.ts.

export type Capitulo = {
  id: string;
  n: string;
  area: string;
  espaco: string;
  titulo: string;
  texto: string;
  provas: string[];
  projetos: string[];
  /** lado vazio da arte, onde entra o texto */
  lado: 'esq' | 'dir';
};

export const CAPITULOS: Capitulo[] = [
  {
    id: 'engenharia',
    n: '01',
    area: 'Engenharia full stack',
    espaco: 'A estrutura',
    titulo: 'O que sustenta tudo fica embaixo.',
    texto:
      'Do banco de dados à interface, com segurança pensada desde o primeiro commit. Foi construindo telas na reconstrução da plataforma que eu aprendi onde os sistemas cedem.',
    provas: [
      'Front-end em React, TypeScript e Tailwind na reconstrução da arquitetura da plataforma, em ambientes Docker.',
      'Next.js e Postgres com acesso por linha (RLS), APIs em Node e .NET, app desktop em Electron.',
      'Sites para clientes no ar, com CSP rígida, pré-renderização e auditoria de acessibilidade.',
    ],
    projetos: ['lcp-consultoria', 'pettracker', 'brasa'],
    lado: 'esq',
  },
  {
    id: 'qualidade',
    n: '02',
    area: 'Qualidade de software',
    espaco: 'A inspeção',
    titulo: 'Só passa o que foi verificado.',
    texto:
      'Único QA de uma plataforma SaaS B2B com Web, Android, APIs REST e GraphQL e 58 conectores com ERPs. Estruturei a área do zero: processo, triagem e uma fábrica de casos de teste.',
    provas: [
      'Mais de 11.600 casos de teste de API executáveis, em 208 endpoints e 59 tenants, cobrindo 67 famílias de falha.',
      'Perda silenciosa de 55% numa importação de 20 mil produtos, achada em teste de estresse antes da produção.',
      'IDOR e quebra de isolamento entre tenants barrados antes de chegar ao cliente.',
    ],
    projetos: ['qa-intelligence', 'parity-gate'],
    lado: 'dir',
  },
  {
    id: 'automacao',
    n: '03',
    area: 'IA & automação',
    espaco: 'O mecanismo',
    titulo: 'O repetitivo roda sozinho.',
    texto:
      'IA aplicada ao fluxo real de engenharia: agentes, ferramentas e automações que tiram o trabalho braçal do caminho e deixam a decisão com quem decide.',
    provas: [
      'Fluxos de teste assistidos por IA com Claude Code e OpenAI Codex no dia a dia do time.',
      'Plugin de QA para o Claude Code e um terminal de QA em Rust com trava de somente leitura em produção.',
      'Agentes que transformaram 200 repositórios e os cards do time numa base de conhecimento.',
    ],
    projetos: ['bancada', 'plenario', 'laboratorio-civilizacoes'],
    lado: 'esq',
  },
  {
    id: 'lideranca',
    n: '04',
    area: 'Liderança',
    espaco: 'A conexão',
    titulo: 'Ligar quem usa a quem constrói.',
    texto:
      'Liderei o time de suporte e fui a ponte entre clientes e engenharia: transformar problema de produção em requisito claro e fazer pessoas e processo andarem na mesma direção.',
    provas: [
      'Liderança do time de suporte: priorização, distribuição de demandas, SLA e orientação diária.',
      'Processo de triagem de defeitos com severidade (S1–S4) e prioridade (P0–P3) separadas.',
      'Curso de IA para gestores e RH, sobre uso responsável no trabalho.',
    ],
    projetos: ['ia-para-gestores'],
    lado: 'dir',
  },
];
