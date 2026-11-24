# Utilidades comuns dos scripts Blender da Batcaverna.
# Convenção: Blender é Z para cima; exportamos glTF com +Y para cima (padrão do exportador),
# então um ponto (x, y, z) do Three.js é (x, -z, y) no Blender.
import os, sys, traceback, math
import bpy, bmesh
from mathutils import Vector, Matrix

PROJ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODELS = os.path.join(PROJ, 'public', 'models')
SAIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'saida')
_log = None; _fim = None

def say(*p):
    t = ' '.join(str(x) for x in p); print(t)
    if _log: _log.write(t + '\n'); _log.flush()

def run(main):
    global _log, _fim
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if args: _log = open(args[0], 'w', encoding='utf-8')
    _fim = args[1] if len(args) > 1 else None
    ok = 'ok'
    try:
        main(args[2:])
    except Exception:
        say(traceback.format_exc()); ok = 'erro'
    if _log: _log.close()
    if _fim: open(_fim, 'w').write(ok)

def limpa():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def aplica(obj):
    bpy.context.view_layer.objects.active = obj
    for m in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)

def tris(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)

def exporta(caminho, objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(filepath=caminho, use_selection=True, export_format='GLB',
                              export_apply=True, export_yup=True, export_attributes=True)
    say('exportado', caminho, round(os.path.getsize(caminho) / 1e6, 2), 'MB')

def bake_ao_vertex(objs, samples=48, distance=1.5):
    """Assa oclusão ambiente nas cores de vértice (atributo 'AO'), barato no navegador."""
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = samples; sc.cycles.device = 'CPU'
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'OPTIX'; prefs.get_devices()
        for d in prefs.devices: d.use = True
        sc.cycles.device = 'GPU'
    except Exception as e:
        say('GPU indisponível, CPU:', e)
    sc.world = sc.world or bpy.data.worlds.new('W')
    sc.render.bake.margin = 0
    for o in objs:
        me = o.data
        if 'AO' not in me.color_attributes:
            me.color_attributes.new(name='AO', type='BYTE_COLOR', domain='CORNER')
        me.color_attributes.active_color = me.color_attributes['AO']
        if not me.materials:
            m = bpy.data.materials.new('base'); m.use_nodes = True; me.materials.append(m)
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
        sc.world.light_settings.distance = distance
        bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
    say('AO assado em', len(objs), 'objetos')

def render_preview(caminho, alvo=(0, 0, 0), dist=8, alt=3, lente=40, res=(900, 600)):
    sc = bpy.context.scene; sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
    sc.render.resolution_x, sc.render.resolution_y = res
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.lens = lente
    cam.location = Vector(alvo) + Vector((dist * 0.8, -dist, alt))
    d = Vector(alvo) - cam.location; cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    for loc, en in [((5, -5, 8), 900), ((-6, 3, 4), 400)]:
        l = bpy.data.objects.new('l', bpy.data.lights.new('l', 'AREA')); l.data.energy = en; l.data.size = 4; l.location = loc
        l.rotation_euler = (Vector(alvo) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); sc.collection.objects.link(l)
    sc.world = sc.world or bpy.data.worlds.new('W'); sc.world.use_nodes = True
    sc.world.node_tree.nodes['Background'].inputs[0].default_value = (0.05, 0.06, 0.07, 1)
    sc.render.filepath = caminho; bpy.ops.render.render(write_still=True)
    say('preview', caminho)
