"""Batcarro (veiculo2.glb, coleção A_CARRO): parte do modelo Tripo (public/models/veiculo.glb),
normaliza (6,2 m, frente em -Y Blender = +Z three, base em z=0, centrado), reduz para <=150 mil triângulos
e REFAZ os materiais por região geométrica: carroceria preta fosca (painéis do normal map do Tripo),
pneus de borracha, aros grafite, vidro escuro e luzes azuis emissivas (faces + filetes modelados)."""
import sys; sys.path.insert(0, r'C:\Users\Gabriel Caetano\Downloads\Claud Code\batcaverna\tools\blender\oficina')
from kit import *

ALVO = 145000
# rodas medidas nas vistas ortográficas (garagem_carro_lado/topo/frente)
RODAS = [(-1.30, -1.90, 0.55, 0.54, 0.30), (1.30, -1.90, 0.55, 0.54, 0.30),
         (-1.25, 1.66, 0.79, 0.71, 0.32), (1.25, 1.66, 0.79, 0.71, 0.32)]

def mat_tripo(nome, imgs, tint, rough, metal, nor=1.0, emiss=None):
    m = bpy.data.materials.new(nome); m.use_nodes = True
    n = m.node_tree.nodes; l = m.node_tree.links; b = n['Principled BSDF']
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if imgs.get('base') and tint is not None:
        t = n.new('ShaderNodeTexImage'); t.image = imgs['base']
        mx = n.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 1
        mx.inputs['B'].default_value = (*tint, 1); l.new(t.outputs['Color'], mx.inputs['A']); l.new(mx.outputs['Result'], b.inputs['Base Color'])
    elif tint is not None:
        b.inputs['Base Color'].default_value = (*tint, 1)
    if imgs.get('nor') and nor > 0:
        t = n.new('ShaderNodeTexImage'); t.image = imgs['nor']; t.image.colorspace_settings.name = 'Non-Color'
        nm = n.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nor
        l.new(t.outputs['Color'], nm.inputs['Color']); l.new(nm.outputs['Normal'], b.inputs['Normal'])
    if emiss:
        b.inputs['Emission Color'].default_value = (*emiss[0], 1); b.inputs['Emission Strength'].default_value = emiss[1]
    return m

def classe(c, nrm):
    x, y, z = c
    for (wx, wy, wz, r, hw) in RODAS:
        if abs(x - wx) < hw + 0.04:
            d = math.hypot(y - wy, z - wz)
            if d < r + 0.04:
                return 1 if d > 0.64 * r else 2          # pneu / aro
    # cabine: vidros escuros (para-brisa inclinado e teto da cabine)
    if -1.15 < y < 0.25 and abs(x) < 0.62 and z > 1.28 and nrm.z > 0.2 and abs(nrm.x) < 0.75: return 3
    return 0

def main(args):
    C.limpa()
    col = colecao('A_CARRO')
    bpy.ops.import_scene.gltf(filepath=os.path.join(MODELOS, 'veiculo.glb'))
    o = [x for x in bpy.context.scene.objects if x.type == 'MESH'][0]
    for x in bpy.context.selected_objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM'); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for x in list(bpy.context.scene.objects):
        if x is not o: bpy.data.objects.remove(x)
    ligar(o, col); o.name = 'CARRO_corpo'
    vs = o.data.vertices
    xs = [v.co.x for v in vs]; ys = [v.co.y for v in vs]; zs = [v.co.z for v in vs]
    k = 6.2 / (max(ys) - min(ys)); cx = (max(xs) + min(xs)) / 2; cy = (max(ys) + min(ys)) / 2; z0 = min(zs)
    for v in vs: v.co = Vector(((v.co.x - cx) * k, (v.co.y - cy) * k, (v.co.z - z0) * k))
    say('tris orig', C.tris(o))
    # junta vértices soltos (a malha do Tripo vem em ilhas) e reduz
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0006)
    bm.to_mesh(o.data); bm.free()
    t = C.tris(o)
    if t > ALVO:
        d = o.modifiers.new('reduz', 'DECIMATE'); d.ratio = ALVO / t; d.use_collapse_triangulate = True; C.aplica(o)
    say('tris reduzido', C.tris(o))
    # imagens do Tripo
    old = o.data.materials[0]; imgs = {}
    for nd in old.node_tree.nodes:
        if nd.type == 'TEX_IMAGE' and nd.image:
            nm = nd.image.name
            if nm.endswith('basecolor'): imgs['base'] = nd.image
            elif nm.endswith('normal'): imgs['nor'] = nd.image
    mats = [mat_tripo('CARRO_carroceria', {'nor': imgs.get('nor')}, (0.028, 0.03, 0.034), 0.45, 0.45, nor=0.8),
            mat_tripo('CARRO_pneu', imgs, (0.16, 0.16, 0.17), 0.9, 0.0, nor=1.3),
            mat_tripo('CARRO_aro', imgs, (0.55, 0.57, 0.62), 0.35, 0.85, nor=1.0),
            mat_tripo('CARRO_vidro', {}, (0.010, 0.014, 0.022), 0.06, 0.0, nor=0),
            mat_tripo('CARRO_luz_farol', {}, (0.02, 0.3, 1.0), 0.3, 0.0, nor=0, emiss=((0.02, 0.32, 1.0), 5.0)),
            mat_tripo('CARRO_luz_grade', {}, (0.02, 0.3, 1.0), 0.3, 0.0, nor=0, emiss=((0.02, 0.32, 1.0), 4.0))]
    o.data.materials.clear()
    for m in mats: o.data.materials.append(m)
    bpy.data.materials.remove(old)
    cont = [0] * 6
    for p in o.data.polygons:
        c = classe(p.center, p.normal); p.material_index = c; cont[c] += 1
    say('faces por material', cont)
    # filetes de LED modelados (borda chanfrada), colados na superfície achada por raio: faróis nos para-lamas e brilho sob o bico
    def filete(nome, x, z, comp, alt, m, giro=0.0):
        ok, loc, nrm, _ = o.ray_cast(Vector((x, -6, z)), Vector((0, 1, 0)))
        if not ok: say('sem superficie', nome); return
        bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=Vector((comp, 0.04, alt)), verts=bm.verts)
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=min(alt, 0.04) * 0.3, segments=2, affect='EDGES')
        f = objeto(nome, bm, col, m)
        f.location = loc + Vector((0, 0.005, 0)); f.rotation_euler = (0, giro, 0)
        say('filete', nome, tuple(round(v, 2) for v in loc))
    for s in (-1, 1):
        filete(f'CARRO_farol{s}', s * 1.25, 0.80, 0.5, 0.06, mats[4], giro=s * math.radians(-6))
        filete(f'CARRO_grade{s}', s * 0.52, 0.30, 0.46, 0.04, mats[5])
    bpy.ops.object.select_all(action='DESELECT')
    for x in col.objects: x.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35)) if hasattr(bpy.ops.object, 'shade_smooth_by_angle') else None
    say('tris final', sum(C.tris(x) for x in col.objects))
    # prévias: 3/4 dianteira (como na arte), lado e frente
    chao = caixa('PREV_chao', bpy.context.scene.collection, (30, 30, 0.1), (0, 0, -0.05), cor('PREV_piso', (0.06, 0.065, 0.075), rough=0.25, metal=0.6), bev=0)
    previa('garagem_carro_34', cam=(6.5, -7.0, 2.4), alvo=(0, -0.3, 0.9), lente=38)
    previa('garagem_carro_34b', cam=(-7.5, -5.5, 3.0), alvo=(0, 0, 0.9), lente=38)
    previa('garagem_carro_frente2', cam=(0.4, -9.0, 1.3), alvo=(0, 0, 0.9), lente=40)
    bpy.data.objects.remove(chao)
    fecha('veiculo2', col, max_tex=1024)
rodar(main)
