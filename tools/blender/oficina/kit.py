"""Kit comum da oficina multiagente da Batcaverna (roda no Blender SEM janela, um processo por agente).

Como cada agente usa:
    import sys, os; sys.path.insert(0, r'<...>/tools/blender/oficina'); from kit import *
    def main(args):
        col = colecao('AREA_x')            # tudo do agente dentro de UMA coleção com prefixo próprio
        ...modela...
        previa('nome', cam=(x,y,z), alvo=(x,y,z))   # PNG em tools/blender/oficina/previas/
        fecha('nome', col)                 # .blend em cenas/ + GLB otimizado em public/models/
    rodar(main)
Executar:  pwsh -File tools/blender/rodar.ps1 tools/blender/oficina/<area>/<script>.py 1800

Coordenadas: Blender Z para cima. Um ponto (x, y, z) do three.js é (x, -z, y) no Blender.
"""
import sys, os, json, math, urllib.request, subprocess, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
BL = os.path.dirname(HERE)
sys.path.insert(0, BL); sys.path.insert(0, os.path.join(BL, 'fachadas'))
import bpy, bmesh
from mathutils import Vector, Matrix, Euler
import bc_comum as C
import lib
from lib import (W, H, R, SPRING, material, cor, objeto, uv_mundo, caixa, parede_arco, aduelas, ameias, poe, ligar, ph_textura)

PROJ = os.path.dirname(os.path.dirname(BL))
CENAS = os.path.join(BL, 'cenas'); os.makedirs(CENAS, exist_ok=True)
PREVIAS = os.path.join(HERE, 'previas'); os.makedirs(PREVIAS, exist_ok=True)
BRUTO = os.path.join(PROJ, 'docs', 'caverna', 'blender'); os.makedirs(BRUTO, exist_ok=True)
MODELOS = os.path.join(PROJ, 'public', 'models')
PHM = os.path.join(BL, 'cache', 'ph_models'); os.makedirs(PHM, exist_ok=True)
UA = {'User-Agent': 'batcaverna-blender/1.0'}
say = C.say

def rodar(main):
    C.run(main)

def colecao(nome):
    if not bpy.context.scene.objects and len(bpy.data.objects) == 0: pass
    col = bpy.data.collections.get(nome) or bpy.data.collections.new(nome)
    if col.name not in bpy.context.scene.collection.children: bpy.context.scene.collection.children.link(col)
    return col

def _baixa(url, dst):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if not os.path.exists(dst):
        tmp = dst + '.%d.part' % os.getpid()  # atômico: vários agentes baixam em paralelo
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r, open(tmp, 'wb') as f: f.write(r.read())
        try: os.replace(tmp, dst)
        except OSError: os.remove(tmp)
    return dst

def ph_modelo(pid, col=None, res='1k'):
    """Baixa um modelo do Poly Haven (CC0) pela API e anexa à cena. Devolve UM objeto (peças unidas), base em z=0, centrado."""
    meta_p = os.path.join(PHM, pid, 'meta.json')
    _baixa(f'https://api.polyhaven.com/files/{pid}', meta_p)
    meta = json.load(open(meta_p, encoding='utf-8'))
    b = meta['blend'][res]['blend']
    path = _baixa(b['url'], os.path.join(PHM, pid, os.path.basename(b['url'].split('?')[0])))
    for rel, inc in (b.get('include') or {}).items(): _baixa(inc['url'], os.path.join(PHM, pid, rel))
    with bpy.data.libraries.load(path, link=False) as (src, dst): dst.objects = [n for n in src.objects]
    objs = [o for o in dst.objects if o is not None and o.type == 'MESH']
    for o in dst.objects:
        if o is not None and o.name not in bpy.context.scene.collection.objects: bpy.context.scene.collection.objects.link(o)
    for o in bpy.context.selected_objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(objs) > 1: bpy.ops.object.join()
    o = bpy.context.active_object; o.name = pid
    for x in list(bpy.context.scene.collection.objects):
        if x.type != 'MESH' and x.name.startswith(pid): bpy.data.objects.remove(x)
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
    bpy.context.view_layer.update()
    o.location = (0, 0, o.dimensions.z / 2)
    if col: ligar(o, col)
    return o

def copia(o, col, nome):
    c = o.copy(); c.data = o.data.copy(); c.name = nome; col.objects.link(c); return c

def luz_previa():
    """Luz neutra só para a prévia (não é exportada)."""
    sc = bpy.context.scene
    w = sc.world or bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.02, 0.03, 0.045, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0
    if 'PREV_sol' not in bpy.data.objects:
        s = bpy.data.objects.new('PREV_sol', bpy.data.lights.new('PREV_sol', 'SUN')); s.data.energy = 2.2
        s.rotation_euler = Euler((math.radians(55), 0, math.radians(-25))); sc.collection.objects.link(s)
        a = bpy.data.objects.new('PREV_quente', bpy.data.lights.new('PREV_quente', 'AREA')); a.data.energy = 1500; a.data.size = 6
        a.data.color = (1.0, 0.75, 0.5); a.location = (4, -10, 6); sc.collection.objects.link(a)
        a.rotation_euler = (Vector((0, 0, 3)) - a.location).to_track_quat('-Z', 'Y').to_euler()

def previa(nome, cam=(0, -16, 4), alvo=(0, 0, 3.5), lente=28, res=(1280, 720), luz=True):
    """Renderiza um PNG de conferência (EEVEE) em oficina/previas/<nome>.png e devolve o caminho."""
    sc = bpy.context.scene
    if luz: luz_previa()
    camo = bpy.data.objects.get('PREV_cam') or bpy.data.objects.new('PREV_cam', bpy.data.cameras.new('PREV_cam'))
    if camo.name not in sc.collection.objects: sc.collection.objects.link(camo)
    camo.location = cam; camo.data.lens = lente; camo.data.clip_end = 500
    camo.rotation_euler = (Vector(alvo) - Vector(cam)).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = camo
    for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
        try: sc.render.engine = eng; break
        except TypeError: continue
    sc.render.resolution_x, sc.render.resolution_y = res; sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'
    out = os.path.join(PREVIAS, nome + '.png'); sc.render.filepath = out
    bpy.ops.render.render(write_still=True); say('previa', out); return out

def _tris(col):
    dg = bpy.context.evaluated_depsgraph_get(); n = 0
    for o in col.all_objects:
        if o.type == 'MESH':
            m = o.evaluated_get(dg).to_mesh(); n += sum(len(p.vertices) - 2 for p in m.polygons); o.evaluated_get(dg).to_mesh_clear()
    return n

def fecha(nome, col, max_tex=512):
    """Salva o .blend do agente em cenas/<nome>.blend e exporta public/models/<nome>.glb (texturas <= max_tex, gltfpack)."""
    for o in list(bpy.data.objects):
        if o.name.startswith('PREV_'): bpy.data.objects.remove(o)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(CENAS, nome + '.blend'), copy=True)
    for img in bpy.data.images:
        w, h = img.size
        if max(w, h) > max_tex: f = max_tex / max(w, h); img.scale(max(1, int(w * f)), max(1, int(h * f)))
    for o in bpy.context.selected_objects: o.select_set(False)
    objs = [o for o in col.all_objects]
    for o in objs: o.hide_set(False); o.select_set(True)
    bruto = os.path.join(BRUTO, nome + '.glb')
    bpy.ops.export_scene.gltf(filepath=bruto, use_selection=True, export_format='GLB', export_yup=True, export_apply=True,
                              export_image_format='JPEG', export_jpeg_quality=82, export_lights=False, export_cameras=False)
    final = os.path.join(MODELOS, nome + '.glb')
    r = subprocess.run(f'npx gltfpack -i "{bruto}" -o "{final}" -cc -kn -km', shell=True, cwd=PROJ, capture_output=True, text=True)
    if not os.path.exists(final): say('gltfpack falhou', r.stdout[-300:], r.stderr[-300:]); shutil.copy(bruto, final)
    say('fechado', nome, 'tris', _tris(col), 'glb', round(os.path.getsize(final) / 1e6, 2), 'MB')
    return final

_modelos = {}
def modelo(pid, col, nome, x=0, y=0, z=0, rz=0.0, altura=None, larg=None):
    """Cópia posicionada de um modelo Poly Haven (baixa uma vez por processo, o original fica fora da cena)."""
    if pid not in _modelos:
        base = ph_modelo(pid); bpy.context.scene.collection.objects.unlink(base); _modelos[pid] = base
    o = copia(_modelos[pid], col, nome)
    return poe(o, x, y, z, rz=rz, altura=altura, larg=larg)

def lanterna(col, nome, x, y, z, altura=0.75, cor_luz=(1.0, 0.62, 0.25), forca=8.0):
    o = modelo('Lantern_01', col, nome, x, y, z, altura=altura)
    luz = cor('LUZ_chama_quente', cor_luz, rough=0.4, emiss=forca)
    for sl in o.material_slots:
        if sl.material and 'glass' in sl.material.name.lower(): sl.material = luz
    return o
