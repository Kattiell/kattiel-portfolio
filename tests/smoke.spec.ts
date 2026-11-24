import { expect, test } from '@playwright/test';

test('home: marca e nome legíveis na primeira tela, sem Three.js', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  const pedidos: string[] = [];
  page.on('request', (r) => pedidos.push(r.url()));
  await page.goto('/');
  await expect(page.locator('.m-nome')).toBeInViewport();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Gabriel\s*Caetano/);
  await expect(page.getByText('KATTIEL', { exact: false }).first()).toBeVisible();
  // a caverna não é baixada na home
  expect(pedidos.some((u) => u.includes('/models/') || u.includes('/textures/'))).toBe(false);
  expect(erros).toEqual([]);
});

test('mapa do salão: 12 distritos, de 01 a 12, navegáveis por teclado', async ({ page }) => {
  await page.goto('/distritos');
  const links = page.locator('.map-list a');
  await expect(links).toHaveCount(12);
  for (let i = 0; i < 12; i++) await expect(links.nth(i)).toHaveAttribute('href', `/distritos/${i + 1}`);
  await links.first().focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/distritos\/1$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Luxo');
});

test('nenhum link externo falso: projeto sem URL mostra estado vazio', async ({ page }) => {
  await page.goto('/projetos/pettracker');
  await expect(page.getByText('Link público não definido')).toBeVisible();
  await expect(page.locator('main a[target="_blank"]')).toHaveCount(0);
  await page.goto('/projetos/lcp-consultoria');
  await expect(page.locator('main a[target="_blank"]').first()).toHaveAttribute('href', 'https://www.lcpconsultoria.srv.br/');
});

test('projetos: a home leva à lista completa e cada item ao dossiê', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.m-projeto')).toHaveCount(4);
  // a travessia: um trabalho selecionado por espaço do edifício
  await expect(page.locator('.m-cap')).toHaveCount(4);
  // a home mostra trabalho, não currículo: números dos trabalhos, método e sobre curto; distritos só na caverna e em /distritos
  await expect(page.locator('.m-numeros li')).toHaveCount(4);
  await expect(page.locator('.m-xp > li')).toHaveCount(4);
  await expect(page.locator('#experiencia')).toHaveCount(0);
  await expect(page.locator('#sobre')).toContainText('Trajetória no LinkedIn');
  await expect(page.getByText(/distrito/i)).toHaveCount(0);
  await page.getByRole('link', { name: /Ver os \d+ projetos/i }).click();
  await expect(page).toHaveURL(/\/projetos$/);
  const itens = page.locator('.ka-lista-itens a');
  expect(await itens.count()).toBeGreaterThan(10);
  await expect(page.locator('#contato a[target="_blank"]:visible').first()).toHaveAttribute('href', 'https://www.linkedin.com/in/gabrielcaetanopf');
});

test('distrito ligado ao projeto e caminho para o túnel em 3D', async ({ page }) => {
  await page.goto('/distritos/6');
  await expect(page.locator('.file-project a[href="/projetos/gama-vans"]')).toBeVisible();
  await expect(page.getByRole('link', { name: /IR ATÉ O TÚNEL EM 3D/ })).toHaveAttribute('href', '/arquivo?distrito=6');
  await expect(page.locator('.district-map a')).toHaveCount(12);
});

test('arquivo: abre a caverna e sair não deixa canvas vivo', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/arquivo?modo=explorar');
  // ou a caverna sobe, ou (sem WebGL 2) aparece o aviso com o mapa 2D
  await expect(page.locator('#app canvas, #sem-gl:not(.hide)').first()).toBeAttached({ timeout: 90_000 });
  if (await page.locator('#app canvas').count()) {
    await page.waitForFunction(() => (window as unknown as { __bc?: { state: { mode: string } } }).__bc?.state.mode === 'hall', null, { timeout: 90_000 });
  }
  await page.evaluate(() => document.getElementById('sair-arquivo')?.click());
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('canvas:not(.m-gl)')).toHaveCount(0); // .m-gl = cenas de profundidade da home (Profundidade.tsx)
  expect(await page.evaluate(() => typeof (window as unknown as { __bc?: unknown }).__bc)).toBe('undefined');
  expect(erros).toEqual([]);
});

for (const [nome, w, h] of [['desktop', 1440, 900], ['tablet', 820, 1180], ['mobile', 390, 844]] as const) {
  test(`captura ${nome} (${w}px): sem rolagem horizontal`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `docs/capturas/home-${nome}.png` });
    await page.goto('/distritos/6');
    await page.screenshot({ path: `docs/capturas/distrito-${nome}.png` });
  });
}
