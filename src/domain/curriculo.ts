// Trajetória, números e formação: tudo tirado do currículo (Downloads/Curriculo, versão de out/2026).
// Telefone e e-mail do currículo ficam FORA do site.

export const SOBRE = {
  local: 'Patos de Minas, MG · trabalho remoto',
  bio: [
    'Sou Lead QA com 5 anos numa empresa de produto SaaS B2B, onde passei pelo suporte, pelo desenvolvimento full stack e pela qualidade de software.',
    'Hoje sou o único QA de uma plataforma com Web, Android, APIs REST e GraphQL e 58 conectores com ERPs. Estruturei a área de qualidade do zero: processo de teste, triagem de defeitos, documentação e uma fábrica de casos de teste de API.',
    'Fora do expediente, construo produtos e sites para clientes, e mantenho o parity-gate, uma ferramenta open source de teste de contrato de API.',
  ],
};

/** Os números do currículo, para quem lê o site em 30 segundos. */
export const NUMEROS = [
  { n: '5', u: 'anos', d: 'em produto SaaS B2B, do suporte à qualidade' },
  { n: '11.600+', u: 'casos', d: 'de teste de API executáveis, em 208 endpoints' },
  { n: '58', u: 'conectores', d: 'com ERPs e clientes cobertos por um único QA' },
  { n: '279', u: 'testes', d: 'automatizados no parity-gate, open source' },
];

export type Cargo = { cargo: string; empresa: string; periodo: string; resumo: string; itens: string[]; tags: string[] };

export const EXPERIENCIA: Cargo[] = [
  {
    cargo: 'Lead QA',
    empresa: 'B2list',
    periodo: 'fev 2026 — atual',
    resumo: 'Único QA de uma plataforma SaaS B2B com Web, Android, APIs REST e GraphQL e 58 conectores com ERPs, atendendo empresas com até 176 mil clientes.',
    itens: [
      'Criei uma fábrica de casos de teste de API: mais de 11.600 casos executáveis em 208 endpoints e 59 tenants, cobrindo 67 famílias de falha.',
      'Achei uma perda silenciosa de dados em teste de estresse: uma importação de 20 mil produtos falhava em 55% dos registros por timeout no gateway, enquanto a tela dizia sucesso.',
      'Expus 3 defeitos críticos com 1.200 requisições de estresse, entre eles um DELETE de 29 segundos e endpoints 6x mais lentos que o esperado.',
      'Encontrei falhas de segurança (IDOR e quebra de isolamento entre tenants) antes de chegarem à produção.',
      'Criei o processo de triagem de defeitos: severidade (S1–S4) e prioridade (P0–P3) separadas, e um padrão obrigatório de relato.',
      'Introduzi fluxos de teste assistidos por IA com Claude Code e OpenAI Codex.',
    ],
    tags: ['API REST e GraphQL', 'E2E', 'Estresse', 'Segurança', 'SQL', 'Claude Code'],
  },
  {
    cargo: 'Líder de Suporte e Desenvolvedor de Software',
    empresa: 'B2list',
    periodo: 'jun 2022 — jan 2026',
    resumo: 'Liderança do time de suporte e desenvolvimento de front-end na reconstrução da arquitetura da plataforma.',
    itens: [
      'Liderei o time de suporte: priorização de chamados, distribuição de demandas, SLA e orientação diária.',
      'Desenvolvi funcionalidades de front-end com React, TypeScript e Tailwind em ambientes Docker.',
      'Resolvi incidentes escalados (N1 a N3) com análise de logs, depuração de integrações e diagnóstico de ambientes.',
      'Fui a ponte entre clientes e engenharia, transformando problema de produção em requisito técnico claro.',
    ],
    tags: ['React', 'TypeScript', 'Tailwind', 'Docker', 'Liderança'],
  },
  {
    cargo: 'Estagiário de Suporte',
    empresa: 'B2list',
    periodo: 'jun 2021 — jun 2022',
    resumo: 'Onde tudo começou: suporte N1 e N2 e investigação de problemas em vários ambientes.',
    itens: [
      'Acompanhamento de incidentes no Jira Service Management.',
      'Investigação com Docker, Bitbucket, GitHub e Keycloak.',
    ],
    tags: ['Jira', 'Docker', 'Keycloak'],
  },
];

export const COMPETENCIAS = [
  { g: 'Testes', itens: ['UAT e planos de teste', 'E2E', 'Regressão', 'Exploratório', 'API REST e GraphQL', 'Contrato (OpenAPI)', 'Estresse', 'Segurança (IDOR, multi-tenant)'] },
  { g: 'Automação e CI', itens: ['Playwright', 'Cypress', 'Postman/Newman', 'bash + jq', 'GitHub Actions', 'Azure DevOps', 'Docker'] },
  { g: 'Código', itens: ['TypeScript', 'JavaScript', 'Python', 'Java', 'React', 'Next.js', 'Spring Boot', 'PostgreSQL', 'MongoDB'] },
  { g: 'IA e processo', itens: ['Claude Code', 'OpenAI Codex', 'Agentes e MCP', 'Triagem de defeitos', 'Scrum', 'Kanban'] },
];

export const FORMACAO = { curso: 'Bacharelado em Sistemas de Informação', onde: 'UNIPAM, Patos de Minas', ano: '2023' };

export const CERTIFICACOES = [
  { t: 'Liderança de Times de QA', o: 'QAzando', a: '2026' },
  { t: 'Inteligência Artificial para QA', o: 'QAzando', a: '2026' },
  { t: 'Gestão Ágil com Scrum, Kanban e Scaled Agile', o: 'Udemy', a: '2024' },
  { t: 'APIs RESTful até a AWS: Spring Boot 3, Java e Docker', o: 'Udemy', a: '2024' },
  { t: 'AWS Fargate e ECS: microsserviços e CloudFormation', o: 'Udemy', a: '2023' },
];

export const IDIOMAS = 'Português nativo · Inglês técnico avançado (leitura e escrita), conversação intermediária';
