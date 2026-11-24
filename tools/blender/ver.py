"""Mostra uma coleção no viewport do Blender aberto e salva a captura.
Uso: python ver.py F02 [dist] [alt] [yaw] [pitch]"""
import sys
from bmcp import call
col = sys.argv[1]; extra = [float(a) for a in sys.argv[2:]]
keys = ['dist', 'alt', 'yaw', 'pitch']; kw = ', '.join(f'{k}={v}' for k, v in zip(keys, extra))
LIB = r'C:\Users\Gabriel Caetano\Downloads\Claud Code\batcaverna\tools\blender\fachadas'
code = f"import sys, importlib\nsys.path.insert(0, {LIB!r})\nimport lib; importlib.reload(lib)\nlib.mostra({col!r}{', ' + kw if kw else ''})\nprint('ok')"
print(call('execute_code', {'code': code}).get('result'))
out = r'C:\Users\Gabriel Caetano\AppData\Local\Temp\claude\87722a17983453bc\9173a8da-0465-48bd-9c32-21199ea59bdf\scratchpad\blendermcp\vp.png'
print(call('get_viewport_screenshot', {'max_size': 1400, 'filepath': out, 'format': 'png'})['status'])
