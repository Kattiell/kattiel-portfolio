"""Cliente mínimo do addon blender-mcp (localhost:9876): manda código Python para o Blender ABERTO.
Uso: python bmcp.py arquivo.py      (roda o arquivo dentro do Blender)
     python bmcp.py -c "print(1)"   (roda o trecho)
     python bmcp.py --info          (informações da cena)
"""
import json, socket, sys

def call(kind, params, timeout=600):
    s = socket.create_connection(('localhost', 9876), timeout=timeout)
    s.sendall(json.dumps({'type': kind, 'params': params}).encode('utf-8'))
    buf = b''
    while True:
        part = s.recv(65536)
        if not part: break
        buf += part
        try: return json.loads(buf.decode('utf-8'))
        except ValueError: continue
    return json.loads(buf.decode('utf-8'))

if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == '--info': r = call('get_scene_info', {})
    elif a and a[0] == '-c': r = call('execute_code', {'code': a[1]})
    else: r = call('execute_code', {'code': open(a[0], encoding='utf-8').read()})
    out = r.get('result', r)
    if isinstance(out, dict) and 'result' in out: out = out['result']
    print(out if isinstance(out, str) else json.dumps(out, ensure_ascii=False, indent=1)[:4000])
