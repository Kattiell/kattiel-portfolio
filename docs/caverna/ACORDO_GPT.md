# Acordo Claude × GPT (22/11/2026)

Fonte: chat do ChatGPT "Reestruture o design 3D" (briefing mestre A–G + imagem de referência `referencia.png`).

## Decisão
O Higgsfield 3D Jutsu travou na rev 74 (11,78 créditos, render limitado a 560×350, carro barrado).
A experiência é construída direto em Three.js (este repositório), fiel à imagem de referência.
Higgsfield/Tripo só para peças pontuais, com custo aprovado pelo Gabriel antes.

## Ajustes pedidos pelo GPT (aceitos)
1. Câmera cinematográfica na revelação (mostra os 12 túneis, cachoeira, Batcomputador e garagem) e câmera em primeira pessoa na exploração.
2. Cada distrito apresenta um projeto do portfólio: mapa configurável `districtId → projectId → projectUrl` (em `src/data.js`). Não abrir URL ao apertar E: primeiro entrar, revelar o projeto, depois "Abrir projeto".
3. Um sistema único de portais (máquina de estados, câmera, carregamento) com 12 comportamentos mágicos próprios (geometria, trajetória, tempo).
4. Fatia vertical primeiro: salão → Distrito 12 → projeto → retorno. Escadas com superfície de colisão contínua invisível.
5. Versão simplificada das magias para movimento reduzido / máquinas fracas.
6. O salão fica carregado; só o distrito ativo é montado, e é descartado ao voltar.

## Estados do portal
idle → focused → casting → open → crossing → loading → arrived → returning

As fichas dos 12 distritos e a coreografia dos feitiços estão codificadas em `src/data.js`.
