// Capturas reais dos projetos. Chave = slug de projects.ts.
// CAPA: a imagem do cartão e do topo do estudo de caso. GALERIA: as telas extras do estudo de caso.
// Regra: nada com credencial, host interno, nome de cliente de terceiros ou dado pessoal.
import type { StaticImageData } from 'next/image';
import lcp from '../../public/img/lcp-consultoria.webp';
import mariane from '../../public/img/mariane-borges.webp';
import painel from '../../public/img/projetos/qa-b2list/painel-laudo-ao-vivo.webp';
import laudo from '../../public/img/projetos/qa-b2list/laudo-html-demo.webp';
import cursoCapa from '../../public/img/projetos/ia-gestores/capa.webp';
import curso2 from '../../public/img/projetos/ia-gestores/slide-2.webp';
import curso3 from '../../public/img/projetos/ia-gestores/slide-3.webp';
import curso4 from '../../public/img/projetos/ia-gestores/slide-4.webp';
import curso5 from '../../public/img/projetos/ia-gestores/slide-5.webp';
import curso6 from '../../public/img/projetos/ia-gestores/slide-6.webp';

import tmArena from '../../public/img/projetos/transmute/site-arena.webp';
import tmCidade from '../../public/img/projetos/transmute/site-cidade.webp';
import tmAgente from '../../public/img/projetos/transmute/site-criar-agente.webp';
import tmMarket from '../../public/img/projetos/transmute/site-sala-market.webp';
import tmLanding from '../../public/img/projetos/transmute/site-landing.webp';
import tmBot1 from '../../public/img/projetos/transmute/bot-1.webp';
import tmBot2 from '../../public/img/projetos/transmute/bot-2.webp';
import tmBot3 from '../../public/img/projetos/transmute/bot-3.webp';
import tmFlex from '../../public/img/projetos/transmute/bot-flexcard.webp';

import luWorkflows from '../../public/img/projetos/lunara/workflows.webp';
import luGerando from '../../public/img/projetos/lunara/chat-gerando.webp';
import luImagem from '../../public/img/projetos/lunara/chat-imagem.webp';
import luAtivo from '../../public/img/projetos/lunara/workflow-ativo.webp';
import luDetalhes from '../../public/img/projetos/lunara/workflow-detalhes.webp';
import luCriar from '../../public/img/projetos/lunara/criar-workflow.webp';
import luPerfil from '../../public/img/projetos/lunara/perfil.webp';
import luCelular from '../../public/img/projetos/lunara/celular.webp';
import asHome from '../../public/img/projetos/asphodel/home.webp';
import asPlantar from '../../public/img/projetos/asphodel/plantar.webp';
import asMoeda from '../../public/img/projetos/asphodel/moeda.webp';
import asCelular from '../../public/img/projetos/asphodel/celular.webp';

export type Tela = { src: StaticImageData; alt: string; legenda?: string };

export const PROJECT_IMAGES: Record<string, Tela> = {
  'lcp-consultoria': { src: lcp, alt: 'Página inicial do site da LCP Consultoria: "Finanças em ordem. Decisões com clareza."', legenda: 'Captura do site no ar.' },
  'mariane-borges': { src: mariane, alt: 'Página inicial do site da nutricionista Mariane Borges: "Nutrição que transforma sua rotina", com o botão "Agende sua consulta".', legenda: 'Captura do site no ar.' },
  bancada: { src: painel, alt: 'Painel do laudo ao vivo ao lado do Claude Code: etapa 4 de 8, casos por status, achados, massa de teste a limpar e as chamadas de API com status e tempo.', legenda: 'Painel do laudo ao vivo (dados de demonstração).' },
  transmute: { src: tmArena, alt: 'Painel do Transmute: o Agent Arena com a Cosmic City, a contagem para a próxima sessão e o menu do terminal de sinais.', legenda: 'O Agent Arena, com o projeto rodando localmente (sem dados).' },
  lunara: { src: luWorkflows, alt: 'Tela principal da Lunara: workflows da comunidade com capa, autor, categoria e custo em créditos, o ranking dos usuários e o gerador de imagens aberto ao lado.', legenda: 'Workflows da comunidade e o gerador ao lado (dados de demonstração).' },
  asphodel: { src: asHome, alt: 'Página inicial da Asphodel: "Plant a coin on Elysium." ao lado de um lírio dourado em 3D sobre um campo de asfódelos.', legenda: 'A página inicial com o campo em 3D (modo de prévia).' },
  'ia-para-gestores': { src: cursoCapa, alt: 'Capa do módulo 1 do curso IA para Gestores: "Por que IA, por que agora, por que Claude".', legenda: 'Capa do módulo 1.' },
};

export const PROJECT_GALLERY: Record<string, Tela[]> = {
  transmute: [
    { src: tmCidade, alt: 'A Cosmic City em pixel art, com as zonas Council, Market, Portal, Plaza, Garden e Duel.', legenda: 'Site: a Cosmic City, onde os agentes caçam, debatem e votam.' },
    { src: tmAgente, alt: 'Tela de criação de agente com o quadrante "Risk and Excellence" e os arquétipos Rebel, Magician e Hero.', legenda: 'Site: criação do agente a partir de um dos 12 arquétipos.' },
    { src: tmMarket, alt: 'Sala do Market em pixel art com o cartão explicativo.', legenda: 'Site: a sala do Market.' },
    { src: tmLanding, alt: 'Landing do Transmute com os seis cartões de funcionalidades.', legenda: 'Site: as funcionalidades na landing.' },
    { src: tmBot1, alt: 'Conversa com o bot no Telegram: /start com acesso bloqueado pelo token e /verify liberando o acesso.', legenda: 'Bot: acesso liberado pelo token (reconstituição a partir do código, dados fictícios).' },
    { src: tmBot2, alt: 'Grupo no Telegram: alguém posta um endereço de contrato, o bot responde com o card do token e, depois, /flex devolve o flexcard.', legenda: 'Bot: card automático do token e flexcard da call (reconstituição, dados fictícios).' },
    { src: tmBot3, alt: 'Grupo no Telegram: /gods 7d mostra o ranking com estatísticas, melhores callers e melhores calls.', legenda: 'Bot: ranking de quem fez as melhores calls (reconstituição, dados fictícios).' },
    { src: tmFlex, alt: 'Flexcard em PNG: DEMO a 84.0K, 6.10x, alcançou 512.0K.', legenda: 'Flexcard gerado pelo código real do bot, com dados fictícios.' },
  ],
  lunara: [
    { src: luGerando, alt: 'Chat do gerador: o pedido do usuário e a resposta "Generating your image using Lunara AI".', legenda: 'Criação de imagem pelo chat: o pedido e a geração em andamento.' },
    { src: luImagem, alt: 'Imagem pronta no chat com "Image ready", 100 créditos descontados e os botões Download, Create Workflow e Print Card.', legenda: 'Imagem pronta: o saldo cai 100 créditos e a imagem vira download, workflow ou card.' },
    { src: luAtivo, alt: 'Gerador com um workflow da comunidade selecionado como estilo, mostrando autor e custo.', legenda: 'Um workflow da comunidade selecionado como estilo da próxima imagem.' },
    { src: luDetalhes, alt: 'Detalhes de um workflow: descrição, curtidas, visualizações, tags, passos e galeria.', legenda: 'Página de um workflow: passos, números e galeria.' },
    { src: luCriar, alt: 'Formulário de criação de workflow com nome, categoria, descrição, prompt e custo para outros usuários.', legenda: 'Criação de workflow: o prompt que os outros vão usar e o custo para eles.' },
    { src: luPerfil, alt: 'Perfil do usuário com a carteira verificada, o saldo de $LUNARA e o plano Premium com a barra até o VIP+.', legenda: 'Perfil: carteira verificada, plano pelo saldo do token e progresso até o próximo nível.' },
    { src: luCelular, alt: 'A Lunara no celular: lista de workflows com os botões de uso.', legenda: 'No celular.' },
  ],
  asphodel: [
    { src: asPlantar, alt: 'Tela "Plant a coin": nome, ticker, descrição, perfil do X, e-mail privado, imagem e compra do criador limitada a 1%.', legenda: 'Plantar uma moeda: tudo numa tela e numa transação, com a compra do criador limitada a 1%.' },
    { src: asMoeda, alt: 'Página da moeda Golden Field: Raio-X com compra do criador, top 10 e escudo anti-sniper, gráfico da curva e painel de compra e venda.', legenda: 'Página da moeda: Raio-X, curva até a floração e compra e venda (simulado).' },
    { src: asCelular, alt: 'A página inicial da Asphodel no celular, com o lírio em 3D.', legenda: 'No celular.' },
  ],
  bancada: [
    { src: laudo, alt: 'Laudo exportado em HTML: veredito proposto aguardando revisão do líder, as 9 etapas e a matriz de casos com o tipo de caso extremo.', legenda: 'Laudo exportado: a IA propõe o veredito, o líder de QA revisa (exemplo fictício).' },
  ],
  'ia-para-gestores': [
    { src: curso2, alt: 'Slide com o mapa do curso: os 7 módulos, do porquê à adoção.', legenda: 'O mapa do curso: 7 módulos, do porquê à adoção.' },
    { src: curso3, alt: 'Slide com os 5 recursos configurados no Claude: instruções, Projects, Skills, Artifacts e conexões.', legenda: 'Módulo 2: os 5 recursos que deixam o Claude pronto para o trabalho.' },
    { src: curso4, alt: 'Slide do Método CRISP: Contexto, Restrição, Instrução, Saída esperada e Persona.', legenda: 'Módulo 3: o método CRISP para prompts executivos.' },
    { src: curso5, alt: 'Slide com a matriz de governança: Confiar, Verificar, Nunca delegar.', legenda: 'Módulo 7: o que confiar, o que verificar e o que nunca delegar à IA.' },
    { src: curso6, alt: 'Slide com o roadmap de 90 dias para levar a IA ao time.', legenda: 'Módulo 7: roadmap de 90 dias para levar a IA ao time.' },
  ],
};
