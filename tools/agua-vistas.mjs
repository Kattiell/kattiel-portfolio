// Fotografa o lago de três pontos de vista do visitante (GPU de verdade). uso: node tools/agua-vistas.mjs <saida> <prefixo>
import { chromium } from 'playwright';
const [out, pre] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
await p.goto('http://127.0.0.1:5193/arquivo?modo=explorar');
await p.waitForFunction(() => window.__bc?.state?.mode === 'hall', null, { timeout: 120000 }); await p.waitForTimeout(3000);
const V = [
  ['deque', [9, 2.4, 14], [24, 0.2, -8]],          // da borda da plataforma olhando o lago
  ['entrada', [0, 3.2, 30], [0, 0.5, 0]],          // chegando pelo píer
  ['cachoeira', [-6, 2.2, -16], [0, 2, -34]],      // perto da queda central
];
for (const [n, pos, alvo] of V) { await p.evaluate(([a, c]) => window.__bc.view(a, c, 62), [pos, alvo]); await p.waitForTimeout(1800); await p.screenshot({ path: `${out}/${pre}-${n}.png` }); }
await b.close();
