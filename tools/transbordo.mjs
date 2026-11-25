// Procura componentes que estouram a caixa em várias larguras de tela: texto que passa da borda do pai,
// elementos maiores que a viewport e rolagem lateral. uso: node tools/transbordo.mjs [url] [larguras...]
import { chromium } from 'playwright';
const [url = 'http://127.0.0.1:5193/', ...ls] = process.argv.slice(2);
const larguras = ls.length ? ls.map(Number) : [360, 390, 768, 1024, 1280, 1366, 1600, 1920, 2560];
const b = await chromium.launch({ channel: 'chrome' });
for (const w of larguras) {
  const ctx = await b.newContext({ viewport: { width: w, height: Math.round(w * 0.6) + 200 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('k-abriu', '1'); } catch {} });
  const p = await ctx.newPage();
  await p.goto(url + '#trabalho', { waitUntil: 'networkidle' });
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
  await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    const out = []; const vw = document.documentElement.clientWidth;
    const nome = (e) => (e.id ? '#' + e.id : '') + '.' + String(e.className?.baseVal ?? e.className).trim().split(/\s+/).slice(0, 2).join('.');
    for (const e of document.querySelectorAll('main *, header *, footer *')) {
      const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || e.closest('[aria-hidden="true"]') || e.closest('.m-faixa,.m-feixes,.m-abre,svg')) continue;
      const rc = e.getBoundingClientRect(); if (!rc.width) continue;
      const pai = e.parentElement; if (!pai) continue; const rp = pai.getBoundingClientRect();
      const texto = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (texto && (rc.right > rp.right + 2 || rc.left < rp.left - 2) && getComputedStyle(pai).overflow === 'visible') out.push(`texto fora do pai: ${nome(e)} (${Math.round(rc.right - rp.right)}px) "${e.textContent.trim().slice(0, 30)}"`);
      if (texto && e.scrollWidth > e.clientWidth + 2 && cs.overflowX !== 'visible' && cs.whiteSpace !== 'nowrap') out.push(`texto cortado: ${nome(e)} "${e.textContent.trim().slice(0, 30)}"`);
      if (rc.right > vw + 2 && cs.position !== 'fixed') out.push(`passa da tela: ${nome(e)} (${Math.round(rc.right - vw)}px)`);
    }
    if (document.documentElement.scrollWidth > vw + 1) out.unshift(`ROLAGEM LATERAL ${document.documentElement.scrollWidth - vw}px`);
    return [...new Set(out)].slice(0, 14);
  });
  console.log(`\n== ${w}px`, r.length ? '' : 'ok'); r.forEach((x) => console.log('  ' + x));
  await ctx.close();
}
await b.close();
