# KATTIEL — portfólio de Gabriel Caetano (Next.js)

Home editorial (identidade V2) + a Batcaverna Three.js existente, plugada sem ser reescrita.

```bash
npm run dev            # desenvolvimento
npm run build && npx next start -p 5192   # produção local
npm run lint
npm test               # smoke tests Playwright (usa o Chrome instalado; sobe next start na 5193)
```

## Rotas

| Rota | O que é |
|---|---|
| `/` | Home: hero KATTIEL, perfil (4 verbos), atuação (6 frentes), o arquivo (12 distritos), trabalhos, contato. Sem Three.js. |
| `/projetos/[slug]` | Dossiê textual do projeto. Sem link público → estado vazio explícito. |
| `/distritos` e `/distritos/[id]` | Mapa 2D do salão e ficha de cada distrito (funciona sem GPU). |
| `/arquivo` | A caverna 3D. `?distrito=N` abre na boca do túnel N; `?modo=explorar` abre direto no salão; `?q=alta|media|baixa` força a qualidade. |

## Onde mexer

- **Projetos:** `src/domain/projects.ts` (nada inventado: `url` só com link público confirmado).
- **Ligar projeto a um distrito:** `src/experience/data.js` → `project.id` do distrito = `slug` do projeto. É a fonte única: as páginas leem dali (`src/domain/districts.ts`).
- **Perfil / contato:** `src/domain/profile.ts` (LinkedIn e e-mail ficam `null` até serem confirmados).
- **Tokens e marca:** `src/app/globals.css` (`--k-*`), `src/brand/KattielMark.tsx`.

## A ponte 2D → 3D

`src/app/arquivo/ArchiveExperience.tsx` monta a marcação que a caverna espera (`skeleton.ts`) e só então importa
`src/experience/main.js` (cópia do app Vite `../batcaverna`, com duas adaptações: `BASE_URL` → `/` e o deep link de distrito).
A entrada é navegação interna (sem recarga). A saída — botão "Portfólio", "Sair para o portfólio" ou o voltar do navegador —
recarrega o destino: o runtime não tem desmontagem, e a recarga é o que garante zero GPU/rAF/listeners vivos depois.

O app Vite original continua em `../batcaverna`, intocado, como rollback.

## Tudo num projeto só (Vercel)

- `src/` app Next + a caverna (`src/experience`) · `public/` o que vai ao ar (53 MB: modelos, `models/lite`, texturas)
- `tools/blender/` a oficina do Blender (scripts versionados; `cache/`, `cenas/`, `saida/` e `.blend` ficam fora do git)
  - `pwsh -File tools/blender/rodar.ps1 tools/blender/oficina/<pasta>/<script>.py` exporta direto para `public/models/`
  - depois rode `node tools/modelos-leves.mjs` para refazer as versões leves de celular
- `docs/caverna/` referências, GLBs brutos e modelos que o app não usa
- `.vercelignore` deixa `tools/`, `docs/` e `tests/` fora do deploy

## Desempenho (src/experience/desempenho.js)

| | antes | agora |
|---|---|---|
| vista geral, RTX 5070, 2560 px | 26 fps · 3.939 draw calls | 63–107 fps · ~820 draw calls |
| luzes dinâmicas | 39 | pool fixo: 20 (alta) / 12 (media) / 6 (baixa) |
| celular (nível baixa, auto por toque/GPU) | 2,7 M triângulos | 1,7 M (models/lite) · ~365–600 draw calls |

- fusão de malhas paradas (ensaio detecta o que se mexe), cor no vértice para unificar materiais, fechaduras fundidas no espaço local
- pool de luzes com fade (contagem fixa: nada recompila), descarte de peças pequenas por distância
- resolução dinâmica mirando 45 fps antes de rebaixar o nível · reflexo do lago a cada 2–3 quadros · telas só atualizam perto do Batcomputador
- celular: modelos simplificados, sem pós-processo, sem reflexo, sem neblina/halos/partículas
