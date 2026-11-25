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

import emInicio from '../../public/img/projetos/eatmate/inicio.webp';
import emHoje from '../../public/img/projetos/eatmate/hoje.webp';
import emRegistrar from '../../public/img/projetos/eatmate/registrar.webp';
import emRelatorio from '../../public/img/projetos/eatmate/relatorio.webp';
import jeInicio from '../../public/img/projetos/jobeval/inicio.webp';
import jeAssistentes from '../../public/img/projetos/jobeval/assistentes.webp';
import jePdf from '../../public/img/projetos/jobeval/pdf.webp';

import lenario_debates from '../../public/img/projetos/plenario/debates.webp';
import lenario_votacao from '../../public/img/projetos/plenario/votacao.webp';
import lenario_relatorio from '../../public/img/projetos/plenario/relatorio.webp';
import lenario_ensaio from '../../public/img/projetos/plenario/ensaio.webp';
import rasa_canal from '../../public/img/projetos/brasa/canal.webp';
import rasa_tela from '../../public/img/projetos/brasa/tela.webp';
import rasa_audio from '../../public/img/projetos/brasa/audio.webp';
import rasa_login from '../../public/img/projetos/brasa/login.webp';
import aboratorioivilizacoes_mundos from '../../public/img/projetos/laboratorio-civilizacoes/mundos.webp';
import aboratorioivilizacoes_brasil from '../../public/img/projetos/laboratorio-civilizacoes/brasil.webp';
import aboratorioivilizacoes_dados_reais from '../../public/img/projetos/laboratorio-civilizacoes/dados-reais.webp';
import aboratorioivilizacoes_comparar from '../../public/img/projetos/laboratorio-civilizacoes/comparar.webp';
import amaans_home from '../../public/img/projetos/gama-vans/home.webp';
import amaans_catalogo from '../../public/img/projetos/gama-vans/catalogo.webp';
import amaans_busca from '../../public/img/projetos/gama-vans/busca.webp';
import amaans_carrinho from '../../public/img/projetos/gama-vans/carrinho.webp';
import amaans_celular from '../../public/img/projetos/gama-vans/celular.webp';
import arityate_gate from '../../public/img/projetos/parity-gate/gate.webp';
import arityate_relatorio from '../../public/img/projetos/parity-gate/relatorio.webp';
import arityate_diferencial from '../../public/img/projetos/parity-gate/diferencial.webp';
import arityate_testes from '../../public/img/projetos/parity-gate/testes.webp';
import ettracker_mapa from '../../public/img/projetos/pettracker/mapa.webp';
import ettracker_admin from '../../public/img/projetos/pettracker/admin.webp';
import ettracker_tutor from '../../public/img/projetos/pettracker/tutor.webp';
import ettracker_login from '../../public/img/projetos/pettracker/login.webp';
import otradingase_start from '../../public/img/projetos/bot-trading-base/start.webp';
import otradingase_botoes from '../../public/img/projetos/bot-trading-base/botoes.webp';
import antelligence_painel from '../../public/img/projetos/qa-intelligence/painel.webp';
import antelligence_demandas from '../../public/img/projetos/qa-intelligence/demandas.webp';
import antelligence_cobertura from '../../public/img/projetos/qa-intelligence/cobertura.webp';

export type Tela = { src: StaticImageData; alt: string; legenda?: string };

export const PROJECT_IMAGES: Record<string, Tela> = {
  'plenario': { src: lenario_debates, alt: 'Debates no Plenário: cada fala com a folha dos autos que cita; uma fala da acusação é retirada por violar o art. 478 e o juiz adverte.', legenda: 'Debates: toda fala cita a prova, e a fala que viola o art. 478 é retirada (caso de exemplo, sem IA paga).' },
  'brasa': { src: rasa_canal, alt: 'Brasa: servidor com o canal #geral, salas de voz com quem está em cada uma, lista de membros e o aviso de alguém digitando.', legenda: 'Canal de texto e salas de voz (interface real, dados de demonstração).' },
  'laboratorio-civilizacoes': { src: aboratorioivilizacoes_mundos, alt: 'Aba Mundos no ano 100: dez sociedades, uma por modelo ideológico, desenhadas como vilas em pixel art a partir dos números da simulação.', legenda: 'Dez sociedades lado a lado, cada uma uma vila desenhada pelos números (execução real, seed 42).' },
  'gama-vans': { src: amaans_home, alt: 'Página inicial da Gama Vans: busca por peça, botões de WhatsApp e telefone e os números da oficina.', legenda: 'Página inicial (catálogo de demonstração; o telefone foi mascarado).' },
  'parity-gate': { src: arityate_gate, alt: 'Terminal: o modo contrato reprova o deploy com 3 de 4 casos falhando e 7 quebras de contrato; em seguida o verify confirma o pacote de evidências.', legenda: 'O gate reprovando o deploy (saída real do terminal, API de exemplo do projeto).' },
  'pettracker': { src: ettracker_mapa, alt: 'Rastreamento do pet no mapa (Leaflet e OpenStreetMap) com latitude, longitude, última atualização, ficha do pet e histórico.', legenda: 'Rastreamento no mapa (cópia local em desenvolvimento, dados de demonstração).' },
  'bot-trading-base': { src: otradingase_start, alt: 'Reconstituição no visual do Telegram: o /start abre a boas-vindas e o menu de 9 botões do bot.', legenda: 'O /start e o menu de 9 botões (reconstituição com os textos reais do código, dados fictícios).' },
  'qa-intelligence': { src: antelligence_painel, alt: 'Painel de gestão do QA por sprint: entregas sem devolução, idas e voltas, tempo em QA e BUG/AJUSTE abertos.', legenda: 'Painel de gestão do time por sprint (dados de demonstração: nomes, cards e números trocados).' },
  'lcp-consultoria': { src: lcp, alt: 'Página inicial do site da LCP Consultoria: "Finanças em ordem. Decisões com clareza."', legenda: 'Captura do site no ar.' },
  'mariane-borges': { src: mariane, alt: 'Página inicial do site da nutricionista Mariane Borges: "Nutrição que transforma sua rotina", com o botão "Agende sua consulta".', legenda: 'Captura do site no ar.' },
  bancada: { src: painel, alt: 'Painel do laudo ao vivo ao lado do Claude Code: etapa 4 de 8, casos por status, achados, massa de teste a limpar e as chamadas de API com status e tempo.', legenda: 'Painel do laudo ao vivo (dados de demonstração).' },
  transmute: { src: tmArena, alt: 'Painel do Transmute: o Agent Arena com a Cosmic City, a contagem para a próxima sessão e o menu do terminal de sinais.', legenda: 'O Agent Arena, com o projeto rodando localmente (sem dados).' },
  lunara: { src: luWorkflows, alt: 'Tela principal da Lunara: workflows da comunidade com capa, autor, categoria e custo em créditos, o ranking dos usuários e o gerador de imagens aberto ao lado.', legenda: 'Workflows da comunidade e o gerador ao lado (dados de demonstração).' },
  asphodel: { src: asHome, alt: 'Página inicial da Asphodel: "Plant a coin on Elysium." ao lado de um lírio dourado em 3D sobre um campo de asfódelos.', legenda: 'A página inicial com o campo em 3D (modo de prévia).' },
  eatmate: { src: emRegistrar, alt: 'EatMate no celular registrando um café da manhã: café com leite (B), pão na chapa (C) e banana (A), separados de uma frase só, com a nota média da refeição.', legenda: 'Uma frase vira três alimentos, cada um com a sua nota (site no ar).' },
  jobeval: { src: jeAssistentes, alt: 'Página do JobEval com os assistentes por país: Brasil (Helena Duarte), Estados Unidos, Alemanha e Espanha, cada um com Copiar assistente, Baixar .txt e Ver no GitHub.', legenda: 'Os assistentes por país; o do Brasil, Helena Duarte, é a minha parte (site no ar).' },
  'ia-para-gestores': { src: cursoCapa, alt: 'Capa do módulo 1 do curso IA para Gestores: "Por que IA, por que agora, por que Claude".', legenda: 'Capa do módulo 1.' },
};

export const PROJECT_GALLERY: Record<string, Tela[]> = {
  'plenario': [
    { src: lenario_votacao, alt: 'Réplica, tréplica, quesitos e a contagem dos votos dos jurados, que para quando a maioria é atingida.', legenda: 'Réplica, tréplica e votação dos quesitos.' },
    { src: lenario_relatorio, alt: 'Relatório final com o resultado, os pontos fracos da tese, a votação de cada quesito e as provas não rebatidas.', legenda: 'Relatório de pontos fracos ao fim do júri.' },
    { src: lenario_ensaio, alt: 'Modo ensaio: o julgamento para na vez do usuário, que está na defesa, e mostra as provas que ele pode citar.', legenda: 'Modo ensaio: a pessoa assume a defesa e o júri espera a vez dela.' },
  ],
  'brasa': [
    { src: rasa_tela, alt: 'Configurações do compartilhamento de tela: 30, 45 ou 60 fps e 720p, 1080p ou 1440p, com a estimativa de upload.', legenda: 'Qualidade do compartilhamento de tela (dados de demonstração).' },
    { src: rasa_audio, alt: 'Configurações de áudio com teste do microfone, portão de ruído, correção de cor HDR e frase secreta para criptografia de ponta a ponta.', legenda: 'Áudio, HDR e criptografia de ponta a ponta (dados de demonstração).' },
    { src: rasa_login, alt: 'Tela de entrada do Brasa com código de convite e "Entrar com Discord".', legenda: 'Entrada só com convite (dados de demonstração).' },
  ],
  'laboratorio-civilizacoes': [
    { src: aboratorioivilizacoes_brasil, alt: 'Aba Brasil 500 anos: linha do tempo de Pindorama a 2076 e a vila no ano escolhido com os indicadores.', legenda: 'O Brasil de 1500 a 2076 numa linha do tempo.' },
    { src: aboratorioivilizacoes_dados_reais, alt: 'Gráficos do Brasil simulado contra dados reais (IBGE, censos, TSE, Receita): expectativa de vida, alfabetização, Gini, carga tributária.', legenda: 'Simulado contra dados reais de 1500 a 2076.' },
    { src: aboratorioivilizacoes_comparar, alt: 'Aba Comparar: seis dimensões de 0 a 100 para os dez modelos ao longo de 100 anos.', legenda: 'As seis dimensões comparadas entre os dez modelos.' },
  ],
  'gama-vans': [
    { src: amaans_catalogo, alt: 'Catálogo da Sprinter com selo de estoque, compatibilidade e três peças adicionadas ao carrinho.', legenda: 'Catálogo por modelo de van, com estoque e compatibilidade.' },
    { src: amaans_busca, alt: 'Busca por "pastilha" encontrando peças de modelos diferentes; a busca ignora acentos.', legenda: 'Busca por nome ou código da peça.' },
    { src: amaans_carrinho, alt: 'Tela "Confira e finalize seu pedido" com passos numerados, rótulos sempre visíveis e botões grandes de + e −.', legenda: 'Carrinho pensado para um público mais velho: passos numerados e botões grandes.' },
    { src: amaans_celular, alt: 'Página inicial da Gama Vans no celular.', legenda: 'No celular.' },
  ],
  'parity-gate': [
    { src: arityate_relatorio, alt: 'Relatório HTML com as quebras: preço virou string, estoque sumiu, desconto passou a aceitar null e um 404 virou 200.', legenda: 'O relatório explica cada quebra de contrato.' },
    { src: arityate_diferencial, alt: 'Modo diferencial comparando a API legada com a reescrita: 4 falhas, 2 avisos de instabilidade e 1 aprovado.', legenda: 'Legado contra reescrita, separando quebra de instabilidade.' },
    { src: arityate_testes, alt: 'Terminal com a suíte do projeto: 279 testes passando.', legenda: 'A suíte: 279 testes passando.' },
  ],
  'pettracker': [
    { src: ettracker_admin, alt: 'Painel do administrador com totais e atividades recentes.', legenda: 'Painel do administrador (dados de demonstração).' },
    { src: ettracker_tutor, alt: 'Painel do tutor com pets, consultas, alertas de vacina e ações rápidas.', legenda: 'Painel do tutor (dados de demonstração).' },
    { src: ettracker_login, alt: 'Tela de login ilustrada do PetTracker.', legenda: 'Login com dois perfis: administrador e tutor.' },
  ],
  'bot-trading-base': [
    { src: otradingase_botoes, alt: 'Reconstituição: respostas dos botões Buy, Wallets, Rewards e Orders, cada uma dizendo a fase prevista, e o aviso do Refresh.', legenda: 'Os botões já respondem e dizem em que fase cada recurso fica pronto (reconstituição).' },
  ],
  'qa-intelligence': [
    { src: antelligence_demandas, alt: 'Demandas do time: cards parados há mais tempo, em dependência e na vez do QA, e as ações do dia.', legenda: 'Demandas de cada pessoa e as ações do dia (dados de demonstração).' },
    { src: antelligence_cobertura, alt: 'Cobertura da fábrica de casos: rotas sem evidência para testar primeiro, sem caso ainda e já cobertas.', legenda: 'Cobertura da fábrica de casos de API (contagens reais, nomes anonimizados).' },
  ],
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
  eatmate: [
    { src: emInicio, alt: 'Tela de boas-vindas do EatMate: registre o que comeu, termômetro da alimentação, relatórios e "seus dados ficam guardados só neste aparelho".', legenda: 'Boas-vindas: sem conta, os dados ficam no aparelho.' },
    { src: emHoje, alt: 'Tela Hoje do EatMate com as seis refeições do dia, o termômetro de 7 dias e a dica do dia.', legenda: 'O dia: seis refeições para preencher e o termômetro de 7 dias.' },
    { src: emRelatorio, alt: 'Relatório de exemplo do EatMate: nota B, 76 de 100, 7 de 7 dias, 30 refeições, 2,6 porções de frutas e verduras por dia e 11% de ultraprocessados.', legenda: 'O relatório da semana (exemplo do próprio app, com dados fictícios).' },
  ],
  jobeval: [
    { src: jeInicio, alt: 'Página inicial do JobEval: assistentes de candidatura por país e o passo a passo em três etapas.', legenda: 'Como usar: escolher o país, colar no chat e transformar o código em PDF.' },
    { src: jePdf, alt: 'Página "Do código ao PDF" com o exemplo de currículo em Typst carregado e o botão Gerar PDF.', legenda: 'O currículo chega como código e vira PDF no próprio navegador.' },
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
