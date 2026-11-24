# Prepara o veículo gerado no Tripo para o navegador:
#  - importa o GLB original (docs/conceitos/veiculo_tripo.glb)
#  - junta as malhas, reduz para ~150 mil triângulos, textura para 2K (JPEG)
#  - escala para 6,2 m de comprimento, centraliza, apoia no chão (z=0)
#  - frente para -Y no Blender (= +Z no Three.js), igual ao veículo procedural
# Argumentos: [giro_graus] para corrigir a frente depois de ver as prévias.
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bc_comum as C
import bpy
from mathutils import Vector

ORIGEM = os.path.join(C.PROJ, 'docs', 'conceitos', 'veiculo_tripo.glb')
ALVO_TRI = 150000
COMPRIMENTO = 6.2

def main(args):
    giro = float(args[0]) if args else 0.0
    C.limpa()
    bpy.ops.import_scene.gltf(filepath=ORIGEM)
    malhas = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    C.say('malhas', len(malhas), 'tri', sum(C.tris(o) for o in malhas))
    bpy.ops.object.select_all(action='DESELECT')
    for o in malhas: o.select_set(True)
    bpy.context.view_layer.objects.active = malhas[0]
    if len(malhas) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    # tira a hierarquia do importador e aplica transformações
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    t = C.tris(o)
    if t > ALVO_TRI:
        d = o.modifiers.new('reduz', 'DECIMATE'); d.ratio = ALVO_TRI / t; C.aplica(o)
    C.say('tri final', C.tris(o))
    # mede e normaliza: o eixo mais longo no plano vira o comprimento
    xs = [v.co.x for v in o.data.vertices]; ys = [v.co.y for v in o.data.vertices]; zs = [v.co.z for v in o.data.vertices]
    dx, dy, dz = max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs)
    C.say('dimensões originais', round(dx, 3), round(dy, 3), round(dz, 3))
    rot = 0.0
    if dx > dy: rot = math.pi / 2  # comprimento em X: gira para ficar em Y
    rot += math.radians(giro)
    o.rotation_euler = (0, 0, rot); bpy.ops.object.transform_apply(rotation=True)
    xs = [v.co.x for v in o.data.vertices]; ys = [v.co.y for v in o.data.vertices]; zs = [v.co.z for v in o.data.vertices]
    k = COMPRIMENTO / (max(ys) - min(ys))
    cx, cy, z0 = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, min(zs)
    for v in o.data.vertices:
        v.co = Vector(((v.co.x - cx) * k, (v.co.y - cy) * k, (v.co.z - z0) * k))
    o.name = 'veiculo'
    # texturas para 2K
    for img in bpy.data.images:
        if img.size[0] > 2048:
            img.scale(2048, 2048); C.say('textura reduzida', img.name)
    bpy.ops.object.shade_smooth() if False else None
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
    caminho = os.path.join(C.MODELS, 'veiculo.glb')
    bpy.ops.export_scene.gltf(filepath=caminho, use_selection=True, export_format='GLB', export_yup=True,
                              export_image_format='JPEG', export_jpeg_quality=88)
    C.say('exportado', caminho, round(os.path.getsize(caminho) / 1e6, 2), 'MB')
    # prévias: de frente (câmera em -Y olhando +Y) e de lado
    C.render_preview(os.path.join(C.SAIDA, 'veiculo_frente.png'), alvo=(0, 0, 0.8), dist=0.01, alt=1.2, lente=35)
    cam = bpy.context.scene.camera; cam.location = (0, -9, 1.6)
    cam.rotation_euler = (Vector((0, 0, 0.8)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.render.filepath = os.path.join(C.SAIDA, 'veiculo_frente.png'); bpy.ops.render.render(write_still=True)
    cam.location = (9, 0, 1.6)
    cam.rotation_euler = (Vector((0, 0, 0.8)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.render.filepath = os.path.join(C.SAIDA, 'veiculo_lado.png'); bpy.ops.render.render(write_still=True)
    C.say('prévias prontas')

C.run(main)
