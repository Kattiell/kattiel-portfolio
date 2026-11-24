# Kit de rochas da caverna: 8 blocos com fraturas (Voronoi), massa (nuvens) e estratos
# horizontais (ondas), reduzidos para ~2.500 triângulos, com oclusão assada nas cores de vértice.
# Saída: public/models/rochas.glb (objetos rocha_0..rocha_7, ~2 m de diâmetro, base em z=0).
import sys, os, math, random; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bc_comum as C
import bpy

FORMAS = [  # (escala x, y, z) — blocos, lajes, pilares
    (1.0, 1.0, 0.8), (1.4, 0.9, 0.6), (0.8, 0.8, 1.6), (1.2, 1.1, 0.5),
    (1.0, 0.7, 1.1), (1.6, 1.0, 0.7), (0.7, 0.7, 2.2), (1.1, 1.3, 0.9),
]

def textura(nome, tipo, **kw):
    t = bpy.data.textures.new(nome, tipo)
    for k, v in kw.items(): setattr(t, k, v)
    return t

def main(args):
    C.limpa(); random.seed(7)
    objs = []
    import bmesh
    from mathutils import Vector
    for i, (sx, sy, sz) in enumerate(FORMAS):
        # 1) fratura: esfera cortada por planos aleatórios -> faces lisas de quebra e arestas vivas
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1.0)
        for k in range(10 + i % 5):
            n = Vector((random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(-0.6, 1))).normalized()
            d = random.uniform(0.7, 0.95)
            geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
            r = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=n * d, plane_no=n, clear_outer=True)
            edges = [e for e in r['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
            if edges: bmesh.ops.holes_fill(bm, edges=edges)
        bmesh.ops.triangulate(bm, faces=bm.faces)
        me = bpy.data.meshes.new(f'rocha_{i}'); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new(f'rocha_{i}', me); bpy.context.scene.collection.objects.link(o)
        o.scale = (sx, sy, sz); bpy.context.view_layer.objects.active = o; o.select_set(True)
        bpy.ops.object.transform_apply(scale=True)
        # 2) densidade para o detalhe
        rm = o.modifiers.new('remalha', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = 0.06
        # 3) massa leve, lascas e estratos horizontais
        nuv = textura(f'nuv{i}', 'CLOUDS', noise_scale=0.7, noise_depth=2)
        d2 = o.modifiers.new('massa', 'DISPLACE'); d2.texture = nuv; d2.strength = 0.12; d2.mid_level = 0.5
        vor = textura(f'vor{i}', 'VORONOI', distance_metric='DISTANCE', noise_scale=0.22, intensity=1.0)
        d1 = o.modifiers.new('lascas', 'DISPLACE'); d1.texture = vor; d1.strength = 0.07; d1.mid_level = 0.5
        onda = textura(f'onda{i}', 'WOOD', wood_type='BANDNOISE', noise_basis_2='SAW', turbulence=3, noise_scale=0.18)
        d3 = o.modifiers.new('estratos', 'DISPLACE'); d3.texture = onda; d3.strength = 0.06; d3.mid_level = 0.5
        dec = o.modifiers.new('reduz', 'DECIMATE'); dec.ratio = 0.22
        C.aplica(o)
        if C.tris(o) > 3200:
            dec = o.modifiers.new('reduz2', 'DECIMATE'); dec.ratio = 2800 / C.tris(o); C.aplica(o)
        # base plana para assentar e pivô no chão
        bpy.ops.object.shade_auto_smooth(angle=0.6) if hasattr(bpy.ops.object, 'shade_auto_smooth') else bpy.ops.object.shade_flat()
        me = o.data
        zmin = min(v.co.z for v in me.vertices)
        for v in me.vertices:
            if v.co.z < zmin + 0.25 * sz: v.co.z = zmin + 0.25 * sz + (v.co.z - zmin - 0.25 * sz) * 0.15
        zmin = min(v.co.z for v in me.vertices)
        for v in me.vertices: v.co.z -= zmin
        o.location = ((i % 4) * 4.5, (i // 4) * 4.5, 0)
        objs.append(o)
        C.say(o.name, 'tri', C.tris(o), 'dim', [round(x, 2) for x in o.dimensions])
    C.bake_ao_vertex(objs, samples=64, distance=1.2)
    for o in objs: o.location = (0, 0, 0)
    C.exporta(os.path.join(C.MODELS, 'rochas.glb'), objs)
    for i, o in enumerate(objs): o.location = ((i % 4) * 4.5 - 6.75, (i // 4) * 4.5 - 2.25, 0)
    mat = bpy.data.materials.new('pedra'); mat.use_nodes = True
    nt = mat.node_tree; att = nt.nodes.new('ShaderNodeVertexColor'); att.layer_name = 'AO'
    nt.links.new(att.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color'])
    for o in objs: o.data.materials.clear(); o.data.materials.append(mat)
    C.render_preview(os.path.join(C.SAIDA, 'rochas.png'), alvo=(0, 0, 0.8), dist=14, alt=7, lente=35)

C.run(main)
