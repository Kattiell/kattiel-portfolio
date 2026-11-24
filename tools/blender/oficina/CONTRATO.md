# Oficina multiagente da Batcaverna — contrato comum

Todos os agentes modelam a MESMA Batcaverna no Blender. Cada um cuida de uma área, num processo
Blender próprio (sem janela), e entrega peças que se encaixam pelo mesmo sistema de coordenadas.
O Blender aberto na tela do usuário é a sala de montagem: `tools/blender/oficina/monta.py` liga
todos os `.blend` de `tools/blender/cenas/` num projeto único para conferência.

## Referência visual (obrigatória — fidelidade é o critério de aceite)
Quatro artes da mesma caverna, ângulos diferentes. Leia todas antes de modelar:
- `C:\Users\Gabriel Caetano\Downloads\a7206da7-8160-46ad-8698-eba1faa12120.png` (frontal, do batcomputador)
- `C:\Users\Gabriel Caetano\Downloads\617fc1a3-36eb-4541-ab0b-5a736b160da9.png` (da garagem)
- `C:\Users\Gabriel Caetano\Downloads\1930e6a9-0ceb-4fc4-8b83-b319a7eaa32f.png` (da entrada, eixo central)
- `C:\Users\Gabriel Caetano\Downloads\8190e08c-93ef-4b1e-af0f-e7bffb6e189e.png` (diagonal, cachoeira à direita)
- Arte original: `batcaverna/docs/referencia.png`
Use `zoom` mental: recorte a região da sua área e liste o que existe nela antes de modelar.

## Ferramentas
- Kit: `tools/blender/oficina/kit.py` (leia o topo). Funções: `colecao`, `material(nome, id_polyhaven, tint)`,
  `cor`, `caixa`, `objeto`(bmesh→objeto), `uv_mundo`, `parede_arco`, `aduelas`, `ameias`, `modelo(id_polyhaven, ...)`,
  `lanterna`, `previa(nome, cam, alvo)`, `fecha(nome, col)`. Pode criar funções próprias NO SEU script.
- NÃO edite `kit.py`, `fachadas/lib.py`, nem nada em `src/` (a integração no site é feita depois, por quem coordena).
- Texturas e modelos: Poly Haven (CC0), baixados pela API pelo kit. Listas completas:
  `curl -s "https://api.polyhaven.com/assets?t=models"` e `?t=textures`. Miniatura para escolher:
  `https://cdn.polyhaven.com/asset_img/thumbs/<id>.png?width=256` (monte folhas de contato com PIL e OLHE antes de escolher).
- Rodar: `pwsh -File tools/blender/rodar.ps1 tools/blender/oficina/<area>/<area>_<algo>.py 1800`
  (o log sai em `tools/blender/oficina/<area>/saida/<nome>.log`). **Nome de script único, com prefixo da área.**
- Conferir: abra o PNG de `oficina/previas/` com Read e compare com a referência. Itere até ficar fiel.
- Antes de terminar, rode `npx vite build` NÃO é necessário; apenas garanta que o GLB existe e abre.

## Coordenadas (metros)
Blender Z para cima. Ponto three.js (x, y, z) = Blender (x, -z, y). glTF exporta +Y up automaticamente.
Salão (referencial "mundo", origem no centro da plataforma, no nível da água ≈ 0):
- Ângulo φ medido a partir de -Z(three) = +Y(Blender), positivo para +X. Ponto polar: x = r·sin φ, three z = -r·cos φ.
- Paredão dos túneis: raio 38. Água do lago: y≈0. Teto da caverna ~52 m acima.
- Plataforma central: raio 12, topo em y=1.5 (three). Batcomputador: tela curva raio 11.2, arco de 70° centrado em φ=0, consoles em r≈7.6.
- Galerias: inferior em y=7 (borda interna r=33), superior em y=15 (r=34); vão de φ=-72° a +72°. Ponte estreita na frente da cachoeira (φ entre -5.5° e 5.5°).
- Portais: 6 por nível em φ = -52, -33, -14, 14, 33, 52 (1–6 em cima, 7–12 embaixo), boca na parede r=38.
- Escadas plataforma→galeria inferior nos lados φ=±43. Garagem: centro (-24, 4) em three (x, z), laje 14×20 no nível da plataforma.
- Cachoeira central: x=0, z=-37 (three), de y=24 até a água, em três degraus. Outras: (34, 26), (38.5, 12), (-30, 24).
- Entrada/corredor: z=+40 (three), atrás do observador da arte 1930e6a9.

### Fachadas de portal (referencial do PORTAL, não do mundo)
Arquivo `public/models/fachada_NN.glb`, coleção `FNN`. Boca do portal na origem, chão da galeria em z=0,
salão para **-Y** (Blender). Vão livre do portal: largura 6.4, altura 6.2, topo em arco (raio 3.2, arranque em 3.0)
— NADA pode invadir o vão (a grade de ferro e o feitiço passam ali). Largura total ≤ 12.4 m (vizinhos a 12.6 m),
saliência para o salão ≤ 1.3 m (y ≥ -1.3), altura ≤ 7.6 m no andar de baixo (portais 7–12) e ≤ 9.5 m em cima.
O site já carrega `fachada_NN.glb` e esconde a decoração antiga. Exemplo pronto e aprovado: `tools/blender/fachadas/f02.py` (castelo).

### Áreas do salão (referencial MUNDO)
Arquivo `public/models/area_<nome>.glb`, coleção `A_<NOME>`, em coordenadas do mundo acima.
Deixe objetos de tela/LED que o site vai animar com nome começando por `TELA_` (UV 0–1 cobrindo a tela) e
peças de água corrente com nome `AGUA_` (UV com V descendo na direção do fluxo).

## Orçamento (é um site no navegador)
- Por fachada: ≤ 60 mil triângulos, ≤ 1,2 MB final. Por área: ≤ 250 mil triângulos, ≤ 4 MB.
- Texturas finais 512 px (o `fecha` já reduz). Reaproveite materiais. Sem luzes/câmeras no GLB.
- Nada de booleano em peças do Poly Haven (malhas abertas): modele por extrusão/bmesh como `parede_arco`.

## Entrega de cada agente (no relatório final)
1. Caminhos: script(s), `.blend` em `cenas/`, GLB(s) em `public/models/`, prévias PNG.
2. Triângulos e MB de cada GLB.
3. O que da arte foi reproduzido e o que ficou de fora (honesto).
4. Para áreas do mundo: quais partes procedurais atuais do site sua peça substitui (ex.: "deque, guarda-corpo do deque").
