// Mede quanto a home pesa no navegador: CPU da thread principal (script, layout, estilo, pintura) e quadros,
// parada no átrio e rolando a página, com a CPU 4× mais lenta (celular médio). Usa a GPU de verdade.
// uso: node tools/medir-peso.mjs [url]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://127.0.0.1:5193/';
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Performance.enable');
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await p.goto(url, { waitUntil: 'load' });
await p.waitForTimeout(9000); // abertura + assentar
const metr = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
const quadros = (ms) => p.evaluate((ms) => new Promise((r) => { const ts = []; const t0 = performance.now(); const f = (t) => { ts.push(t); if (t - t0 < ms) requestAnimationFrame(f); else { const d = ts.slice(1).map((x, i) => x - ts[i]); d.sort((a, c) => a - c); r({ fps: (d.length / (ms / 1000)).toFixed(0), p95: d[Math.floor(d.length * 0.95)].toFixed(1) }); } }; requestAnimationFrame(f); }), ms);
async function trecho(nome, acao, ms) {
  const a = await metr();
  const [q] = await Promise.all([quadros(ms), acao()]);
  const z = await metr();
  const s = (k) => ((z[k] - a[k]) / (ms / 1000) * 100).toFixed(0) + '%';
  console.log(`${nome.padEnd(10)} fps ${q.fps} p95 ${q.p95}ms | ocupação: script ${s('ScriptDuration')} layout ${s('LayoutDuration')} estilo ${s('RecalcStyleDuration')} tarefas ${s('TaskDuration')}`);
}
await trecho('parado', async () => {}, 5000);
await trecho('mouse', async () => { for (let i = 0; i < 50; i++) { await p.mouse.move(300 + i * 18, 300 + (i % 7) * 30); await p.waitForTimeout(90); } }, 5000);
await trecho('rolando', async () => { for (let i = 0; i < 50; i++) { await p.mouse.wheel(0, 140); await p.waitForTimeout(95); } }, 5000);
console.log('canvas WebGL vivos:', await p.evaluate(() => document.querySelectorAll('canvas').length));
await b.close();
