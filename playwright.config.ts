import { defineConfig } from '@playwright/test';

// Usa o Chrome já instalado (channel: 'chrome'): não baixa navegadores.
// Roda contra o build de produção: `npm run build` antes, ou deixe o webServer subir `next start`.
export default defineConfig({
  testDir: 'tests',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5193', channel: 'chrome', headless: true },
  webServer: { command: 'npx next start -p 5193 -H 127.0.0.1', url: 'http://127.0.0.1:5193', reuseExistingServer: true, timeout: 60_000 },
});
