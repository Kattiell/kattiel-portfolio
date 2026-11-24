"""Exporta a coleção FNN do Blender aberto para public/models/fachada_NN.glb (via gltfpack).
Uso: python exporta.py 02"""
import sys, subprocess, os
from bmcp import call
n = sys.argv[1]; LIB = r'C:\Users\Gabriel Caetano\Downloads\Claud Code\batcaverna\tools\blender\fachadas'
raw = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'docs', 'fachadas', f'fachada_{n}.glb'))
os.makedirs(os.path.dirname(raw), exist_ok=True)
code = f"import sys, importlib\nsys.path.insert(0, {LIB!r})\nimport lib; importlib.reload(lib)\nprint(lib.exporta('F{n}', {raw!r}))"
print(call('execute_code', {'code': code}, timeout=900).get('result'))
dst = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'models', f'fachada_{n}.glb'))
small = raw.replace('.glb', '_512.glb')
proj = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
subprocess.run(['pwsh', '-File', 'tools/blender/rodar.ps1', 'tools/blender/reduz_texturas.py', '300', raw, small, '512'], cwd=proj, capture_output=True, text=True)
r = subprocess.run(['npx', 'gltfpack', '-i', small, '-o', dst, '-cc', '-kn', '-km'], capture_output=True, text=True, shell=True,
                   cwd=os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
print(r.stdout[-400:], r.stderr[-400:])
print('final', round(os.path.getsize(dst) / 1e6, 2), 'MB')
