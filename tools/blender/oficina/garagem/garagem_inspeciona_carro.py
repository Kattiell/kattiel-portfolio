import sys; sys.path.insert(0, r'C:\Users\Gabriel Caetano\Downloads\Claud Code\batcaverna\tools\blender\oficina')
from kit import *

def main(args):
    C.limpa()
    bpy.ops.import_scene.gltf(filepath=os.path.join(MODELOS, 'veiculo.glb'))
    for o in bpy.context.scene.objects:
        say(o.name, o.type, tuple(round(v, 3) for v in o.dimensions), o.location[:], o.rotation_euler[:])
        if o.type == 'MESH':
            say(' tris', C.tris(o), 'mats', [m.name for m in o.data.materials], 'uv', [u.name for u in o.data.uv_layers], 'attrs', [a.name for a in o.data.attributes])
            xs = [v.co.x for v in o.data.vertices]; ys = [v.co.y for v in o.data.vertices]; zs = [v.co.z for v in o.data.vertices]
            say(' bb', min(xs), max(xs), min(ys), max(ys), min(zs), max(zs))
    for m in bpy.data.materials:
        if m.use_nodes:
            say('mat', m.name, [(n.type, getattr(n, 'image', None) and n.image.name) for n in m.node_tree.nodes])
    for im in bpy.data.images: say('img', im.name, im.size[:])
    # salva a textura para olhar
    for im in bpy.data.images:
        if im.size[0] > 0:
            im.filepath_raw = os.path.join(HERE, 'garagem', 'saida', 'veiculo_tex.png'); im.file_format = 'PNG'; im.save(); break
    previa('garagem_carro_orig_34', cam=(8, -8, 3.2), alvo=(0, 0, 0.9), lente=35)
    previa('garagem_carro_orig_lado', cam=(10, 0, 1.6), alvo=(0, 0, 0.9), lente=35)
rodar(main)
