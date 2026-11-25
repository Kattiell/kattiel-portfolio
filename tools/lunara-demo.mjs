// Lunara em modo demonstração: login, servidor e geração de imagem simulados, para fotografar as telas.
// O front roda local (npx vite --port 5173 na pasta lunaraxbt-play). Nada sai para a internet: toda chamada
// ao backend é respondida aqui, e as "imagens geradas" são artes de IA do próprio portfólio.
// uso: node tools/lunara-demo.mjs <pasta-de-saída> [--log]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const [saida = 'lunara-prints', flag] = process.argv.slice(2);
const LOG = flag === '--log';
fs.mkdirSync(saida, { recursive: true });
const IMG = path.resolve('public/img');
const CDN = 'https://demo-cdn.lunara.local/';
const arte = (f) => CDN + f;

const agora = Date.now();
const dia = (n) => new Date(agora - n * 864e5).toISOString();
const USER = {
  id: 'demo-kattiel', username: 'kattiel_dev', name: 'Kattiel', email: '', provider: 'twitter',
  avatar: arte('mono/hero.webp'), bio: 'Building AI workflows on Base.', createdAt: dia(90),
  walletAddress: '0x7a3f9c21b4e8d05a6c1e2f3b4a5d6e7f8091a2b3', walletType: 'metamask',
  credits: 2400, weeklyCredits: 1200, lifetimeCredits: 6800, plan: { name: 'Premium', minTokens: 400000, weeklyCredits: 1200 }, isVerifiedStaker: true, stakingAmount: 650000,
};
const WF = [
  ['Cinematic Brutalism', 'hyperrealistic', 'mono/hero.webp', 'Concrete monuments, crimson light shafts and wet reflective floors.', 1842, 312],
  ['Batcave Concept Art', 'gaming', 'cavern-ceiling.webp', 'Underground command center with waterfalls, tunnels and neon.', 1520, 287],
  ['Hologram Command Hub', 'design', 'command-hub.webp', 'Circular hall of glowing portals around a holographic core.', 1310, 241],
  ['Neon Portal Gallery', 'art', 'portal-hub.webp', 'Two-level gallery of themed arches, each one a different world.', 990, 176],
  ['Tactical Vehicle Render', 'nft', 'armored-vehicle.webp', 'Studio render of a futuristic armored car, ready for a card.', 870, 158],
  ['Monumental Quality', 'photography', 'mono/qualidade.webp', 'Architectural photo look: scale, fog and a single light source.', 760, 133],
  ['Engineering Atrium', 'web3', 'mono/engenharia.webp', 'Clean brutalist interiors for project covers and landing pages.', 640, 119],
  ['Automation Corridor', 'automation', 'mono/automacao.webp', 'Long corridors with rhythm and red accent lights.', 512, 97],
].map(([title, category, img, description, views, likes], i) => ({
  id: `wf-${i + 1}`, slug: title.toLowerCase().replace(/\W+/g, '-'), title, description, category,
  prompt: `${description} Ultra detailed, cinematic lighting, 35mm.`, steps: ['Describe the scene', 'Pick the style', 'Generate'], tags: [category, 'lunara'],
  status: 'ACTIVE', isPublic: true, authorId: i % 3 ? `u-${i}` : USER.id, authorName: i % 3 ? ['nova_eth', 'basedpixel', 'moonsmith', 'astra.base'][i % 4] : USER.username,
  authorAvatar: null, createdBy: i % 3 ? `u-${i}` : USER.id, createdAt: dia(30 - i * 3), updatedAt: dia(2 + i),
  creditsRequired: 100, requiresImage: false, color: ['#a855f7', '#22d3ee', '#f472b6', '#facc15'][i % 4],
  imageUrl: arte(img), performance: 90 + (i % 5), likes, likesCount: likes, views, usesCount: Math.round(views / 3), isLiked: i === 1,
  images: [{ url: arte(img), prompt: description, position: 0 }],
}));
const GERADAS = ['cavern-ceiling.webp', 'mono/lideranca.webp', 'portal-hub.webp'];
let gerada = 0;

function resposta(url, metodo) {
  const p = new URL(url).pathname;
  if (p === '/auth/profile') return USER;
  if (p === '/credits/balance') return { balance: { totalCredits: 2400 - gerada * 100, weeklyCredits: 500, lifetimeCredits: 6800, updatedAt: new Date().toISOString() }, transactions: [] };
  if (p === '/credits/spend') return { balance: { totalCredits: 2300 }, transaction: { id: 'tx-demo', type: 'SPENT', amount: 100 } };
  if (p === '/auth/ranking') return ['kattiel_dev', 'nova_eth', 'basedpixel', 'moonsmith', 'astra.base'].map((username, i) => ({ username, avatar: null, plan: ['DIAMOND', 'GOLD', 'GOLD', 'SILVER', 'SILVER'][i], daysInRank: 21 - i * 3 }));
  if (p === '/workflows/stats/me') return { total: WF.length, active: WF.length, myWorkflows: 3, likes: 523 };
  if (/^\/workflows\/[^/]+\/use$/.test(p)) { const w = WF.find((x) => x.id === p.split('/')[2]) || WF[1]; return { workflow: w, usage: { id: 'use-demo', workflowId: w.id, status: 'PENDING', creditsCharged: 0, createdAt: new Date().toISOString() }, remainingCredits: 2400 - gerada * 100, creditsRequired: 100, isAuthor: false }; }
  if (/^\/workflows\/[^/]+\/(like)$/.test(p)) return { isLiked: true, likes: 288 };
  if (/^\/workflows\/[^/]+\/(view)$/.test(p)) return { views: 1521 };
  if (/^\/workflows\/usage/.test(p)) return { ok: true };
  if (/^\/workflows\/[^/]+$/.test(p) && metodo === 'GET') return WF.find((w) => w.id === p.split('/')[2] || w.slug === p.split('/')[2]) || WF[0];
  if (p === '/workflows' && metodo === 'GET') return WF;
  if (p === '/ai/images') { const f = GERADAS[gerada++ % GERADAS.length]; return { imageUrl: arte(f), provider: 'Lunara AI', credits: { cost: 100, remaining: 2400 - gerada * 100 }, transactionId: `tx-${gerada}` }; }
  if (p.startsWith('/auth/lunara-balance')) return { walletAddress: USER.walletAddress, balance: 250000, formattedBalance: '250,000', tier: 'GOLD', isEligible: true, lastVerifiedAt: new Date().toISOString() };
  if (p === '/auth/plan-tiers') return [{ name: 'SILVER', minBalance: 50000, weeklyCredits: 250 }, { name: 'GOLD', minBalance: 200000, weeklyCredits: 500 }, { name: 'DIAMOND', minBalance: 1000000, weeklyCredits: 1500 }];
  if (p === '/auth/weekly-credits-status') return { canClaim: true, weeklyCredits: 500, nextClaimAt: null, tier: 'GOLD' };
  if (p === '/wallets') return metodo === 'GET' ? { wallets: [{ id: 'w1', address: USER.walletAddress, label: 'Main', chain: 'base', balance: 250000 }] } : {};
  if (p === '/openclaw/status') return { online: true, model: 'lunara-agent', sessions: 1 };
  if (p.startsWith('/openclaw/chat')) return { reply: 'Done. I drafted a 3-step workflow: describe the scene, lock the style, generate at 1024×1024.', sessionId: 's1' };
  if (p.startsWith('/moltbook')) return { posts: [], agents: [], items: [] };
  return {};
}

const b = await chromium.launch({ channel: 'chrome', headless: true });
// 1920×1080 sem zoom: a tela como um desktop comum vê
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
async function prepara(ctx) {
await ctx.addInitScript((u) => {
  localStorage.setItem('lunara_auth', JSON.stringify({ user: u, authType: 'social', timestamp: Date.now() }));
  localStorage.setItem('user', JSON.stringify(u));
}, USER);
await ctx.route('https://lunaraworkflow-back.onrender.com/**', async (r) => {
  const q = r.request();
  if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
  if (q.url().includes('/ai/images')) await new Promise((s) => setTimeout(s, 2500));   // o tempo de uma geração
  const corpo = resposta(q.url(), q.method());
  if (LOG) console.log(q.method(), new URL(q.url()).pathname);
  return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true' }, body: JSON.stringify(corpo) });
});
await ctx.route(CDN + '**', (r) => {
  const f = path.join(IMG, decodeURIComponent(r.request().url().slice(CDN.length)));
  return fs.existsSync(f) ? r.fulfill({ status: 200, contentType: 'image/webp', body: fs.readFileSync(f), headers: { 'access-control-allow-origin': '*' } }) : r.fulfill({ status: 404 });
});
// qualquer outra saída (fontes do Google, CDNs) passa; chamadas de terceiros de login ficam bloqueadas
await ctx.route(/(api\.twitter\.com|alchemy\.com|walletconnect|privy)/, (r) => r.abort());
}
await prepara(ctx);

const p = await ctx.newPage();
p.on('pageerror', (e) => LOG && console.log('ERRO', e.message.slice(0, 160)));
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
export { p, b, saida };
const shot = async (nome) => { await p.screenshot({ path: path.join(saida, `${nome}.png`) }); console.log('print', nome); };
await shot('01-workflows');
if (LOG) { await b.close(); process.exit(0); }
const tenta = async (nome, f) => { try { await f(); } catch (e) { console.log('falhou', nome, e.message.split(String.fromCharCode(10))[0].slice(0, 140)); } };
const fecha = async () => {
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  const x = p.locator('.fixed button:has(svg), [role="dialog"] button').filter({ hasNotText: /\w{3,}/ }).first();
  if (await x.count()) await x.click({ timeout: 2000 }).catch(() => {});
  await p.waitForTimeout(400);
};

// 02/03: criação de imagem pelo chat (gerando e pronta)
await tenta('chat', async () => {
  const caixa = p.locator('textarea').first();
  await caixa.fill('A hidden command center inside a cave: waterfalls, glowing tunnels and a holographic globe, cinematic');
  await p.waitForTimeout(300); await shot('02-chat-prompt');
  await caixa.press('Enter'); await p.waitForTimeout(1200); await shot('03-chat-gerando');
  await p.waitForTimeout(4500); await shot('04-chat-imagem');
});
// 05: usar um workflow (o estilo entra no chat) e gerar de novo
await tenta('workflow', async () => {
  await p.getByRole('button', { name: /Use for 100 credits/i }).first().click(); await p.waitForTimeout(1500);
  await shot('05-workflow-ativo');
  const caixa = p.locator('textarea').first();
  await caixa.fill('A leader standing on a concrete balcony over a foggy brutalist hall'); await caixa.press('Enter');
  await p.waitForTimeout(5500);
  await p.evaluate(() => document.querySelectorAll('*').forEach((e) => { const cs = getComputedStyle(e); if (/(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 20) e.scrollTop = e.scrollHeight; }));
  await p.waitForTimeout(800); await shot('06-workflow-gerado');
  // o painel do gerador: sobe a partir do título até achar a coluna inteira
  const clip = await p.evaluate(() => {
    let e = [...document.querySelectorAll('h1,h2,h3,span,div')].find((x) => x.childElementCount === 0 && /LUNARA AI Generator/i.test(x.textContent || ''));
    while (e && e.getBoundingClientRect().height < innerHeight * 0.8) e = e.parentElement;
    const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: Math.min(r.height, innerHeight - r.top) };
  });
  await p.screenshot({ path: path.join(saida, '06b-chat-detalhe.png'), clip }); console.log('print 06b-chat-detalhe');
});
await tenta('detalhes', async () => { await p.getByRole('button', { name: /View Details/i }).first().click(); await p.waitForTimeout(1200); await shot('07-detalhes'); await fecha(); });
await tenta('criar', async () => { await p.getByRole('button', { name: /Create Workflow/i }).first().click(); await p.waitForTimeout(1200); await shot('08-criar-workflow'); await fecha(); });
await tenta('perfil', async () => { await p.locator('header button').nth(-2).click(); await p.waitForTimeout(1500); await shot('09-perfil'); await fecha(); });
// celular
await tenta('celular', async () => {
  const cel = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await prepara(cel); const pc = await cel.newPage();
  await pc.goto('http://localhost:5173/', { waitUntil: 'networkidle' }); await pc.waitForTimeout(2500);
  await pc.screenshot({ path: path.join(saida, '10-celular.png') }); console.log('print 10-celular');
});
await b.close();
