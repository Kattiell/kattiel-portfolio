// Prova de movimento da água: 10 quadros a cada 0,25 s no pé da cachoeira e no lago; mede quanto a imagem muda.
import { chromium } from 'playwright';
const [out, pre] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
await p.goto('http://127.0.0.1:5193/arquivo?modo=explorar');
await p.waitForFunction(() => window.__bc?.state?.mode === 'hall', null, { timeout: 120000 }); await p.waitForTimeout(3000);
for (const [n, pos, alvo] of [['pe', [-11, 5.5, -17], [0, 0, -32]], ['lago', [10, 2.2, 13], [26, 0, -6]]]) {
  await p.evaluate(([a, c]) => window.__bc.view(a, c, 60), [pos, alvo]); await p.waitForTimeout(1500);
  for (let i = 0; i < 10; i++) { await p.screenshot({ path: `${out}/${pre}-${n}-${String(i).padStart(2, '0')}.png` }); await p.waitForTimeout(250); }
}
await b.close();
