// uso: node vistas.mjs <saida> <prefixo> [ids...]  (ids = índices de SECOES: 0 heroi,1 computador,2 garagem,3 sacada,4 teto,5 cachoeira,6 emblema,7 galerias)
import { chromium } from 'playwright';
const [out, pre, ...ids] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
p.on('console', (m) => { if (m.type() === 'error') console.log('ERR', m.text().slice(0, 200)); });
await p.goto('http://127.0.0.1:5193/arquivo?q=alta');
await p.waitForSelector('#ap-nav button[data-sec]', { timeout: 120000 });
await p.waitForTimeout(6000);
await p.addStyleTag({ content: '#apres{visibility:hidden!important} #hud,#fps,.hud{display:none!important}' });
for (const i of (ids.length ? ids : ['0', '1', '2', '5', '6', '7'])) {
  await p.evaluate((i) => document.querySelector(`#ap-nav button[data-sec="${i}"]`)?.click(), i);
  await p.waitForTimeout(5500);
  await p.screenshot({ path: `${out}/${pre}-${i}.png` });
}
console.log(await p.evaluate(() => { const r = window.__bc.renderer.info.render; return `calls ${r.calls} tris ${r.triangles}`; }));
await b.close();
