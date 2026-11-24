# Escultura monumental do morcego (emblema autoral) com espessura, borda levantada,
# painel central rebaixado, frisos e chanfro. Saída: public/models/morcego.glb
# Unidade: 1 = 1 m. Envergadura ~24 m (w = 12). Frente do emblema olha para -Y no Blender (= +Z no Three.js).
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bc_comum as C
import bpy, bmesh
from mathutils import Vector

P = [
    [0, 0.17], [0.045, 0.40], [0.085, 0.19], [0.13, 0.15], [0.32, 0.27], [0.58, 0.40], [0.84, 0.52], [1.0, 0.62],
    [0.95, 0.30], [0.87, 0.07], [0.77, 0.15], [0.69, -0.02], [0.59, 0.08], [0.49, -0.11], [0.39, -0.01], [0.29, -0.17], [0.19, -0.07], [0.09, -0.22], [0, -0.40],
]
W = 12.0

def contorno(w):
    pts = [(x * w, y * w) for x, y in P]
    pts += [(-x * w, y * w) for x, y in reversed(P[1:-1])]
    return pts

def prisma(nome, pts, y0, y1):
    bm = bmesh.new()
    vs = [bm.verts.new((x, y0, z)) for x, z in pts]
    f = bm.faces.new(vs)
    bmesh.ops.recalc_face_normals(bm, faces=[f])
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    nv = [g for g in r['geom'] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=nv, vec=(0, y1 - y0, 0))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(nome); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(nome, me); bpy.context.scene.collection.objects.link(o)
    return o

def main(args):
    C.limpa()
    # corpo: chapa grossa (1,6 m) — a frente fica em y = -0.8
    corpo = prisma('morcego_corpo', contorno(W), 0.8, -0.8)
    # borda levantada: contorno externo menos um contorno interno (anel), 0,35 m à frente
    borda_ext = prisma('borda', contorno(W * 1.0), -0.8, -1.15)
    miolo = prisma('miolo', contorno(W * 0.9), -0.6, -1.4)
    bo = borda_ext.modifiers.new('rec', 'BOOLEAN'); bo.operation = 'DIFFERENCE'; bo.object = miolo; bo.solver = 'EXACT'
    C.aplica(borda_ext); bpy.data.objects.remove(miolo)
    # painel central em relevo (menor, 0,18 m à frente) com frisos diagonais nas asas
    painel = prisma('painel', contorno(W * 0.72), -0.8, -0.98)
    frisos = []
    for s in (-1, 1):
        for i, (x0, z0, x1, z1) in enumerate([(0.18, 0.12, 0.55, 0.30), (0.25, -0.02, 0.62, 0.16), (0.35, -0.10, 0.70, 0.04)]):
            a = Vector((s * x0 * W, 0, z0 * W)); b = Vector((s * x1 * W, 0, z1 * W))
            d = (b - a); L = d.length
            bpy.ops.mesh.primitive_cube_add(size=1)
            f = bpy.context.active_object; f.name = f'friso_{s}_{i}'
            f.scale = (L, 0.6, 0.12); f.location = (a + b) / 2 + Vector((0, -1.0, 0))
            f.rotation_euler = (0, -__import__('math').atan2(d.z, d.x), 0)
            frisos.append(f)
    for f in frisos:
        m = painel.modifiers.new('friso', 'BOOLEAN'); m.operation = 'DIFFERENCE'; m.object = f; m.solver = 'EXACT'
    C.aplica(painel)
    for f in frisos: bpy.data.objects.remove(f)
    # junta tudo e chanfra as arestas
    bpy.ops.object.select_all(action='DESELECT')
    for o in (corpo, borda_ext, painel): o.select_set(True)
    bpy.context.view_layer.objects.active = corpo; bpy.ops.object.join()
    bv = corpo.modifiers.new('chanfro', 'BEVEL'); bv.width = 0.09; bv.segments = 2; bv.limit_method = 'ANGLE'; bv.angle_limit = 0.6
    wn = corpo.modifiers.new('normais', 'WEIGHTED_NORMAL'); wn.keep_sharp = True
    C.aplica(corpo)
    corpo.name = 'morcego'
    C.say('triângulos:', C.tris(corpo))
    C.exporta(os.path.join(C.MODELS, 'morcego.glb'), [corpo])
    mat = bpy.data.materials.new('metal'); mat.use_nodes = True
    b = mat.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value = (0.05, 0.06, 0.07, 1); b.inputs['Metallic'].default_value = 1; b.inputs['Roughness'].default_value = 0.35
    corpo.data.materials.clear(); corpo.data.materials.append(mat)
    C.render_preview(os.path.join(C.SAIDA, 'morcego.png'), alvo=(0, 0, 0), dist=26, alt=4, lente=45)

C.run(main)
