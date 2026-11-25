// Mede o peso da caverna 3D: quadros e ocupação da thread principal no modo apresentação (o que o visitante vê)
// e explorando. CPU real (sem redução) e GPU de verdade. uso: node tools/medir-caverna.mjs [url]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://127.0.0.1:5193/arquivo';
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p); await cdp.send('Performance.enable');
await p.goto(url); await p.waitForSelector('#ap-nav button[data-sec]', { timeout: 120000 }); await p.waitForTimeout(8000);
const metr = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
const trecho = async (nome, ms = 5000) => {
  const a = await metr();
  const q = await p.evaluate((ms) => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else r(n / (ms / 1000)); }; requestAnimationFrame(f); }), ms);
  const z = await metr();
  const info = await p.evaluate(() => { const r = window.__bc.renderer.info.render; return `${window.__qualidade} · ${r.calls} calls`; });
  console.log(`${nome.padEnd(12)} rAF ${q.toFixed(0)}/s · thread principal ${((z.TaskDuration - a.TaskDuration) / (ms / 1000) * 100).toFixed(0)}% · ${info}`);
};
await trecho('apresentação');
await p.evaluate(() => document.querySelector('#ap-nav button[data-sec="2"]').click()); await trecho('voando', 3000);
await b.close();
