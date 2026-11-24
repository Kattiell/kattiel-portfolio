// Fichas combinadas com o GPT (docs/ACORDO_GPT.md).
// project.id = slug de src/domain/projects.ts (fonte única do projeto: título, link do site, repositório).
// Título e link entram em tempo de execução (main.js) a partir de projects.ts; aqui fica só o vínculo túnel → projeto.

export const DISTRICTS = [
  {
    id: 1, name: 'Luxo', theme: 'Mármore, cristais, ouro envelhecido', color: 0xf2c46b, accent: 0xfff1c4,
    spell: 'Lumos Maxima', spellFx: 'Orbe branco-dourado cresce, raios radiais, cristais acendem em sequência', duration: 1.6,
    focal: 'Galeria imperial com um cristal dourado monumental',
    groups: ['Colunas ornamentadas', 'Cristais e vitrines', 'Lustres e bandeiras'],
    interaction: 'Girar o cristal central', project: { id: 'lcp-consultoria', title: null, url: null },
  },
  {
    id: 2, name: 'Alvenaria e Defesa', theme: 'Pedra maciça, fortalezas', color: 0xd9a066, accent: 0xb33a3a,
    spell: 'Protego', spellFx: 'Hexágonos formam um escudo esférico, expandem e se fragmentam', duration: 1.8,
    focal: 'Portão colossal de uma fortaleza escavada na rocha',
    groups: ['Muralhas', 'Mecanismos defensivos', 'Esculturas e bandeiras'],
    interaction: 'Acionar a alavanca do portão', project: { id: 'parity-gate', title: null, url: null },
  },
  {
    id: 3, name: 'Tecnologia', theme: 'Circuitos, hologramas, painéis', color: 0x00b9ed, accent: 0x76e5f5,
    spell: 'Alohomora', spellFx: 'Três anéis rúnicos giram em sentidos alternados e destravam a entrada', duration: 1.8,
    focal: 'Supercomputador cilíndrico com holograma giratório',
    groups: ['Servidores', 'Braços robóticos', 'Circuitos e interfaces'],
    interaction: 'Ativar o supercomputador', project: { id: 'plenario', title: null, url: null },
  },
  {
    id: 4, name: 'Pesca', theme: 'Redes, água, cordas, estruturas náuticas', color: 0x4fd1c5, accent: 0xe8d5a8,
    spell: 'Aguamenti', spellFx: 'Dois jatos em curva se entrelaçam num arco líquido e viram gotas', duration: 2.0,
    focal: 'Porto subterrâneo com embarcação ancorada',
    groups: ['Docas', 'Redes e boias', 'Caixas e equipamentos náuticos'],
    interaction: 'Acender o farol', project: { id: 'bot-trading-base', title: null, url: null },
  },
  {
    id: 5, name: 'Energia', theme: 'Turbinas, geradores, alta tensão', color: 0x6c7bff, accent: 0xc8d0ff,
    spell: 'Confringo', spellFx: 'Pulso elétrico percorre as bobinas e libera uma onda de choque', duration: 1.6,
    focal: 'Gerador colossal com núcleo elétrico suspenso',
    groups: ['Turbinas', 'Transformadores', 'Cabos e isoladores'],
    interaction: 'Sincronizar os três condutores', project: { id: 'brasa', title: null, url: null },
  },
  {
    id: 6, name: 'Transporte', theme: 'Trilhos, vagões, máquinas', color: 0xf5b642, accent: 0x1a1a1a,
    spell: 'Accio', spellFx: 'Fragmentos metálicos voam em curva e montam a abertura', duration: 1.9,
    focal: 'Plataforma ferroviária com locomotiva industrial',
    groups: ['Trilhos', 'Máquinas de manutenção', 'Sinais e relógios'],
    interaction: 'Escolher o destino no painel da estação', project: { id: 'gama-vans', title: null, url: null },
  },
  {
    id: 7, name: 'Madeira', theme: 'Troncos, vigas, ferramentas', color: 0xe0a060, accent: 0x7a4a24,
    spell: 'Wingardium Leviosa', spellFx: 'Lascas e troncos flutuam, orbitam e desenham o portal', duration: 2.0,
    focal: 'Serraria monumental com roda dentada de madeira',
    groups: ['Troncos', 'Máquinas de corte', 'Vigas e raízes'],
    interaction: 'Ligar a serraria', project: { id: 'bancada', title: null, url: null },
  },
  {
    id: 8, name: 'Têxteis', theme: 'Tecidos suspensos, teares', color: 0xb46cff, accent: 0xff7ad9,
    spell: 'Diffindo', spellFx: 'Corte luminoso diagonal separa as fitas suspensas', duration: 1.5,
    focal: 'Tear gigantesco tecendo um pano luminoso',
    groups: ['Rolos de tecido', 'Máquinas de costura', 'Cortinas e fios'],
    interaction: 'Ativar o tear', project: { id: 'mariane-borges', title: null, url: null },
  },
  {
    id: 9, name: 'Grãos', theme: 'Silos, trigo, máquinas agrícolas', color: 0xf0c75a, accent: 0xa07a2a,
    spell: 'Revelio', spellFx: 'Onda circular revela glifos dourados escondidos', duration: 1.7,
    focal: 'Moinho central com silos gigantes',
    groups: ['Sacos de grãos', 'Trigo', 'Esteiras'],
    interaction: 'Girar a engrenagem principal', project: { id: 'qa-intelligence', title: null, url: null },
  },
  {
    id: 10, name: 'Pecuária', theme: 'Madeira rústica, couro, criação', color: 0xe8b07a, accent: 0x8a5a3a,
    spell: 'Expecto Patronum', spellFx: 'Partículas prateadas formam um cervo etéreo que dissolve a barreira', duration: 2.2,
    focal: 'Grande estábulo com portão reforçado',
    groups: ['Cercas', 'Fardos de feno', 'Equipamentos rurais'],
    interaction: 'Abrir o portão do estábulo', project: { id: 'pettracker', title: null, url: null },
  },
  {
    id: 11, name: 'Agricultura', theme: 'Vegetação, raízes, flores', color: 0x7bd96a, accent: 0xc77dff,
    spell: 'Herbivicus', spellFx: 'Vinhas crescem em curva, folhas brotam e flores abrem', duration: 2.1,
    focal: 'Estufa monumental com árvore bioluminescente',
    groups: ['Jardins suspensos', 'Canais de irrigação', 'Plantas e raízes'],
    interaction: 'Tocar a árvore', project: { id: 'ia-para-gestores', title: null, url: null },
  },
  {
    id: 12, name: 'Carvão', theme: 'Mina, trilhos, lanternas, fumaça', color: 0xff6a2a, accent: 0xffb070,
    spell: 'Incendio', spellFx: 'Brasas correm pelas fissuras, sobem em espiral e explodem controladas', duration: 1.8,
    focal: 'Mina profunda com elevador industrial e veio de carvão',
    groups: ['Vagões', 'Vigas de sustentação', 'Depósitos minerais e lanternas'],
    interaction: 'Acionar o detonador', project: { id: 'asphodel', title: null, url: null },
  },
];

// Geometria do salão (metros). Ângulo φ medido a partir de -Z, positivo para +X (direita de quem entra).
export const HALL = {
  wallR: 38,            // paredão onde ficam as bocas dos túneis
  lower: { y: 7, rIn: 33 },
  upper: { y: 15, rIn: 34 },
  angles: [-52, -33, -14, 14, 33, 52], // 6 por nível, da esquerda para a direita
  galleryEnd: 72,       // galerias vão de -72° a +72°
  platform: { y: 1.5, r: 12 },
  portalW: 6.4, portalH: 6.2, tunnelLen: 13,
};

export function districtSlot(d) {
  const upper = d.id <= 6;
  const idx = upper ? d.id - 1 : d.id - 7;
  return { upper, phi: HALL.angles[idx], y: upper ? HALL.upper.y : HALL.lower.y };
}

export function polar(r, phiDeg, y = 0) {
  const p = phiDeg * Math.PI / 180;
  return { x: r * Math.sin(p), y, z: -r * Math.cos(p) };
}
