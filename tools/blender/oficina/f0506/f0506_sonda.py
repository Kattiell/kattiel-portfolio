import sys; sys.path.insert(0, r'C:\Users\Gabriel Caetano\Downloads\Claud Code\batcaverna\tools\blender\oficina')
from kit import *
def main(args):
    C.limpa()
    for pid in ('mounted_fluorescent_lights', 'modular_industrial_pipes_01', 'power_box_01', 'industrial_wall_lamp', 'portable_generator'):
        meta_p = os.path.join(PHM, pid, 'meta.json')
        from kit import _baixa
        _baixa(f'https://api.polyhaven.com/files/{pid}', meta_p)
        meta = json.load(open(meta_p, encoding='utf-8'))
        b = meta['blend']['1k']['blend']
        path = _baixa(b['url'], os.path.join(PHM, pid, os.path.basename(b['url'].split('?')[0])))
        for rel, inc in (b.get('include') or {}).items(): _baixa(inc['url'], os.path.join(PHM, pid, rel))
        with bpy.data.libraries.load(path, link=False) as (src, dst): dst.objects = [n for n in src.objects]
        for o in dst.objects:
            if o is None: continue
            if o.type == 'MESH':
                say(pid, '|', o.name, tuple(round(v, 2) for v in o.dimensions), 'tris', sum(len(p.vertices) - 2 for p in o.data.polygons), [m.name for m in o.data.materials])
rodar(main)
