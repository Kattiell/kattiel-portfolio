import sys; sys.path.insert(0, r'C:\Users\Gabriel Caetano\Downloads\Claud Code\batcaverna\tools\blender\oficina')
from kit import *

def orto(nome, cam, alvo, escala):
    luz_previa(); sc = bpy.context.scene
    camo = bpy.data.objects.get('PREV_cam') or bpy.data.objects.new('PREV_cam', bpy.data.cameras.new('PREV_cam'))
    if camo.name not in sc.collection.objects: sc.collection.objects.link(camo)
    camo.location = cam; camo.data.type = 'ORTHO'; camo.data.ortho_scale = escala
    camo.rotation_euler = (Vector(alvo) - Vector(cam)).to_track_quat('-Z', 'Y').to_euler(); sc.camera = camo
    sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
    sc.render.resolution_x, sc.render.resolution_y = 1400, 1400
    sc.render.filepath = os.path.join(PREVIAS, nome + '.png'); bpy.ops.render.render(write_still=True)

def main(args):
    C.limpa()
    bpy.ops.import_scene.gltf(filepath=os.path.join(MODELOS, 'veiculo.glb'))
    o = [x for x in bpy.context.scene.objects if x.type == 'MESH'][0]
    for x in bpy.context.selected_objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM'); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    vs = o.data.vertices
    xs = [v.co.x for v in vs]; ys = [v.co.y for v in vs]; zs = [v.co.z for v in vs]
    say('dims', max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs))
    k = 6.2 / (max(ys) - min(ys)); cx = (max(xs) + min(xs)) / 2; cy = (max(ys) + min(ys)) / 2; z0 = min(zs)
    for v in vs: v.co = Vector(((v.co.x - cx) * k, (v.co.y - cy) * k, (v.co.z - z0) * k))
    xs = [v.co.x for v in vs]; zs = [v.co.z for v in vs]
    say('W', max(xs) - min(xs), 'H', max(zs))
    orto('garagem_carro_lado', (12, 0, 1.2), (0, 0, 1.2), 7.0)
    orto('garagem_carro_topo', (0, 0, 12), (0, 0.001, 0), 7.0)
    orto('garagem_carro_frente', (0, -12, 1.2), (0, 0, 1.2), 3.6)
rodar(main)
