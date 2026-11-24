import sys; sys.path.insert(0, r'C:\Users\Gabriel Caetano\Downloads\Claud Code\batcaverna\tools\blender\oficina')
from kit import *

def carrega(pid, res='1k'):
    meta_p = os.path.join(PHM, pid, 'meta.json')
    kit_baixa = sys.modules['kit']._baixa
    kit_baixa(f'https://api.polyhaven.com/files/{pid}', meta_p)
    meta = json.load(open(meta_p, encoding='utf-8'))
    b = meta['blend'][res]['blend']
    path = kit_baixa(b['url'], os.path.join(PHM, pid, os.path.basename(b['url'].split('?')[0])))
    for rel, inc in (b.get('include') or {}).items(): kit_baixa(inc['url'], os.path.join(PHM, pid, rel))
    with bpy.data.libraries.load(path, link=False) as (src, dst): dst.objects = [n for n in src.objects]
    return [o for o in dst.objects if o is not None]

def main(args):
    C.limpa()
    for pid in ['shrub_01', 'shrub_02', 'shrub_04', 'fern_02', 'nettle_plant', 'weed_plant_02', 'picke_dirty_01', 'rusted_wheel_rim_01', 'can_rusted', 'old_military_crate', 'bull_head', 'wooden_bucket_01', 'planter_box_01', 'potted_plant_02']:
        try:
            objs = carrega(pid)
        except Exception as e:
            say(pid, 'ERRO', e); continue
        say('==', pid, len(objs))
        for o in objs:
            if o.type != 'MESH': say('   ', o.name, o.type); continue
            t = sum(len(p.vertices) - 2 for p in o.data.polygons)
            mats = [(m.name, [n.image.name for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image]) for m in o.data.materials if m and m.use_nodes]
            say('   ', o.name, 'tris', t, 'dim', tuple(round(v, 2) for v in o.dimensions), 'loc', tuple(round(v, 2) for v in o.location), 'par', o.parent.name if o.parent else '-', mats)
rodar(main)
