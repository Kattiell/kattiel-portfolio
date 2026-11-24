// Converte as folhas "medidas da arte" em CSS com calc():
//   arte-a.src.css: "u" = 1 px da arte A (1024 px)  -> arte-a.css
//   arte-b.src.css: "v" = 1 px da arte B (1672 px)  -> arte-b.css
import { readFileSync, writeFileSync } from 'node:fs';
for (const [nome, un] of [['arte-a', 'u'], ['arte-b', 'v']]) {
  const src = readFileSync(`src/app/${nome}.src.css`, 'utf8');
  // só números com o sufixo isolado (não mexe em "url(", "vw", "vh" etc.)
  const re = new RegExp(String.raw`(-?\d*\.?\d+)`+un+String.raw`\b`, 'g');
  const out = src.replace(re, (_, n) => `calc(${n} * var(--${un}))`);
  writeFileSync(`src/app/${nome}.css`, `/* GERADO por tools/arte-css.mjs a partir de ${nome}.src.css: não editar à mão */\n` + out);
  console.log(`${nome}.css ok`);
}
