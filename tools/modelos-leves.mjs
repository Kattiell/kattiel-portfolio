// Gera public/models/lite/*.glb: as mesmas cenas com a malha simplificada, para o nível "baixa" (celular).
// Usa o GLB bruto do Blender (docs/caverna/blender) quando existe; senão, o próprio GLB publicado.
//   node tools/modelos-leves.mjs [proporção=0.4]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(raiz, 'public', 'models'), lite = join(pub, 'lite'), bruto = join(raiz, 'docs', 'caverna', 'blender');
const prop = process.argv[2] || '0.4';
mkdirSync(lite, { recursive: true });
const gltfpack = join(raiz, 'node_modules', 'gltfpack', 'cli.js');   // chamado pelo node: sem shell, caminho com espaço não quebra

let antes = 0, depois = 0;
for (const f of readdirSync(pub).filter((x) => x.endsWith('.glb'))) {
  const src = existsSync(join(bruto, f)) ? join(bruto, f) : join(pub, f);
  const out = join(lite, f);
  // -si: simplifica · -kn/-km: mantém nomes de nós e materiais (o código acha TELA_, AGUA_, GIRA_ pelos nomes) · -cc: compressão
  try {
    execFileSync(process.execPath, [gltfpack, '-i', src, '-o', out, '-si', prop, '-cc', '-kn', '-km'], { stdio: 'pipe' });
  } catch (e) { console.log('FALHOU', f, String(e.stderr || e).slice(0, 200)); continue; }
  const a = statSync(join(pub, f)).size, b = statSync(out).size; antes += a; depois += b;
  console.log(f.padEnd(22), (a / 1e6).toFixed(2), '→', (b / 1e6).toFixed(2), 'MB', src.includes('blender') ? '(bruto)' : '');
}
console.log('total', (antes / 1e6).toFixed(1), '→', (depois / 1e6).toFixed(1), 'MB');
