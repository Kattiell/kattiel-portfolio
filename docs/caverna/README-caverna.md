# Batcaverna — Os Doze Distritos

Experiência 3D navegável em Three.js: uma Batcaverna com os 12 distritos de Jogos Vorazes em duas galerias. Cada túnel lança um feitiço de Harry Potter e leva ao ambiente daquele distrito, onde fica o projeto do portfólio.

Referência visual: `docs/referencia.png`. Acordo de escopo com o GPT: `docs/ACORDO_GPT.md`.

## Rodar

```bash
npm install
npm run dev        # http://127.0.0.1:5190
npm run build      # gera dist/ (site estático)
npm run preview    # serve dist/ em http://127.0.0.1:5191
```

Parâmetros de URL: `?semintro` pula a introdução · `?reduzido` força o modo de movimento reduzido · `?q=media` qualidade média.

## Controles

| Tecla | Ação |
|---|---|
| W A S D / setas | andar |
| Shift | correr |
| Mouse | olhar (clique na tela para prender o cursor) |
| E | interagir: conjurar o feitiço na boca do túnel, elevador, Batcomputador, revelar o projeto, voltar |
| Q | alternar qualidade alta/média |
| M | som |
| H | ajuda |
| Esc | soltar o cursor |

No celular: joystick à esquerda, arrastar à direita para olhar, botão **E**.

## Como chegar a cada distrito

- **7 a 12**: galeria inferior, pelas escadas laterais da plataforma central.
- **1 a 6**: galeria superior, pelos elevadores nas pontas das galerias.
- O **Batcomputador** (centro da plataforma) marca a rota até qualquer distrito.

## Ligar os projetos do portfólio

Em `src/data.js`, cada distrito tem `project: { id, title, url }`. Com `url` preenchida, a interação dentro do distrito revela o painel e um segundo **E** abre o projeto em nova aba.

## Estrutura

| Arquivo | O que faz |
|---|---|
| `src/main.js` | render, bloom, introdução (6 cenas), máquina de estados do portal, travessia, retorno, elevadores, Batcomputador |
| `src/hall.js` | caverna, paredão com as 12 bocas, galerias, plataforma, Batcomputador, morcego, cachoeiras, lago, garagem |
| `src/districts.js` | os 12 portais: túnel 3D, véu, medalhão, fachada temática |
| `src/spells.js` | os 12 feitiços (coreografia combinada com o GPT) |
| `src/destinations.js` | os 12 ambientes de destino (focal, 3 grupos, interação, retorno) |
| `src/player.js` | primeira pessoa com colisão (Octree + Cápsula) |
| `src/car.js` | veículo blindado autoral |
| `src/materials.js` | rocha triplanar, chapas, emblema autoral |
| `src/audio.js` | som ambiente e dos feitiços, sintetizado (WebAudio) |

Tudo é gerado por código: não há modelo, textura nem áudio baixado. O emblema e o veículo são desenhos autorais, não cópias dos oficiais.

## Teste automatizado no navegador

`window.__bc` expõe estado e funções (`startCast`, `returnToHall`, `view([x,y,z],[lx,ly,lz],fov)`) para os roteiros de teste de travessia e as capturas de câmera.
