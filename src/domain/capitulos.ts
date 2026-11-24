// Trabalhos selecionados da home: cada um ocupa um espaço do edifício (artes modeladas no ChatGPT, 23/11).
// A home mostra o trabalho, não o currículo: problema, o que foi feito e o resultado. Só fatos de projects.ts.

export type Capitulo = {
  /** nome da arte e do mapa de profundidade em public/img/mono */
  id: string;
  n: string;
  /** slug em projects.ts: título, tipo, stack e links vêm de lá */
  projeto: string;
  manchete: string;
  texto: string;
  provas: string[];
  resultado: string;
  /** lado vazio da arte, onde entra o texto */
  lado: 'esq' | 'dir';
};

export const CAPITULOS: Capitulo[] = [
  {
    id: 'engenharia',
    n: '01',
    projeto: 'lcp-consultoria',
    manchete: 'Um site que vira conversa de venda.',
    texto:
      'Consultoria financeira de Belo Horizonte com um site de vitrine: depoimentos de exemplo, logos falsos de parceiros e nenhuma presença na busca local. Troquei a vitrine por um diagnóstico em 5 perguntas que entrega o resultado pronto para o WhatsApp.',
    provas: [
      'Diagnóstico com medidor em arco (controle, atenção, crítico) que recomenda as frentes de serviço e abre a aba de cada uma.',
      'Pré-renderização e dados estruturados de serviço, pessoa e FAQ para a busca local.',
      'Cena 3D num único draw call, carregada com o navegador ocioso; consentimento LGPD em 3 categorias e CSP no build.',
    ],
    resultado: 'No ar, com deploy automático e 0 violações de acessibilidade no axe.',
    lado: 'esq',
  },
  {
    id: 'qualidade',
    n: '02',
    projeto: 'qa-intelligence',
    manchete: 'A área de QA de uma plataforma, montada do zero.',
    texto:
      'Uma plataforma SaaS B2B em plena refatoração, com Web, Android, APIs REST e GraphQL e 58 conectores com ERPs, precisava saber se o sistema novo se comportava como o legado. Montei o método, a triagem e uma fábrica de casos de teste.',
    provas: [
      'Mais de 11.600 casos de teste de API executáveis, em 208 endpoints e 59 tenants, cobrindo 67 famílias de falha.',
      'Teste de estresse com 20 mil produtos expôs uma perda silenciosa de 55% dos registros enquanto a tela dizia sucesso.',
      'IDOR e quebra de isolamento entre tenants barrados antes da produção; triagem com severidade e prioridade separadas.',
    ],
    resultado: 'Defeitos críticos encontrados antes de chegar ao cliente, com evidência para cada um.',
    lado: 'dir',
  },
  {
    id: 'automacao',
    n: '03',
    projeto: 'parity-gate',
    manchete: 'Quebra de contrato não passa do pull request.',
    texto:
      'Mudança de contrato quebra integração sem ninguém perceber até o cliente reclamar. O parity-gate compara o contrato esperado com a resposta real de qualquer API JSON ou GraphQL e barra a mudança antes do merge.',
    provas: [
      'Separa teste instável de endpoint instável, para o time não aprender a ignorar o alarme.',
      'Autoteste que exige 100% de detecção das falhas plantadas.',
      'Relatório SARIF anotado no pull request e trilha de evidências encadeada por hash; produção bloqueada por padrão.',
    ],
    resultado: 'Open source, sem dependências em tempo de execução, com 279 testes no Linux e no Windows.',
    lado: 'esq',
  },
  {
    id: 'lideranca',
    n: '04',
    projeto: 'plenario',
    manchete: 'Um júri simulado em que a IA nunca decide o rito.',
    texto:
      'Os simuladores de tribunal com IA são americanos, fechados e modelam o júri dos EUA. O Plenário simula o Tribunal do Júri brasileiro com agentes, para quem quer treinar defesa ou acusação contra eles.',
    provas: [
      'Rito do CPP descrito em YAML e executado por um motor determinístico: o modelo fala, mas nunca decide a fase.',
      'Toda fala cita a prova pela folha dos autos, e os jurados não deliberam entre si, como manda o art. 466 do CPP.',
      'Especificação RFC-0001, .NET 10 e Next.js 16, com revisão de segurança: 13 de 15 achados corrigidos.',
    ],
    resultado: 'Software implementado e coberto por 74 testes; roda local, sem depender de chave de API.',
    lado: 'dir',
  },
];
