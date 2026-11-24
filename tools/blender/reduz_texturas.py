# Reduz todas as texturas de um GLB para no máximo N px e regrava (JPEG).
# Argumentos: entrada.glb saida.glb [N=512]
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bc_comum as C
import bpy

def main(args):
    src, dst = args[0], args[1]; n = int(args[2]) if len(args) > 2 else 512
    C.limpa()
    bpy.ops.import_scene.gltf(filepath=src)
    k = 0
    for img in bpy.data.images:
        w, h = img.size
        if max(w, h) > n:
            f = n / max(w, h); img.scale(max(1, int(w * f)), max(1, int(h * f))); k += 1
    C.say('texturas reduzidas', k, 'de', len(bpy.data.images))
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=dst, use_selection=True, export_format='GLB', export_yup=True, export_image_format='JPEG', export_jpeg_quality=85)
    C.say('ok', dst, round(os.path.getsize(dst) / 1e6, 2), 'MB')

C.run(main)
