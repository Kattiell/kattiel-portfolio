"""Funções próprias das fachadas 01, 03 e 04 (andar de cima). Importado pelos scripts f010304_fNN.py.
Referencial do PORTAL: boca na origem, chão z=0, salão para -Y. Vão: |x|<3.2, arco raio 3.2 com arranque em 3.0.
"""
import sys, os, math, random
sys.path.insert(0, r'C:\Users\Gabriel Caetano\Downloads\Claud Code\batcaverna\tools\blender\oficina')
from kit import *

AQUI = os.path.dirname(os.path.abspath(__file__))


def caminho_u(r, n_arco=40, base=0.0, sp=None):
    """Pontos e normais (no plano xz) de um contorno em U invertido: perna esquerda, arco, perna direita."""
    sp = SPRING if sp is None else sp
    pts, nrm = [], []
    for k in range(4):
        z = base + (sp - base) * k / 4
        pts.append((-r, z)); nrm.append((-1, 0))
    for i in range(n_arco + 1):
        a = math.pi - math.pi * i / n_arco
        pts.append((r * math.cos(a), sp + r * math.sin(a))); nrm.append((math.cos(a), math.sin(a)))
    for k in range(1, 5):
        z = sp - (sp - base) * k / 4
        pts.append((r, z)); nrm.append((1, 0))
    return pts, nrm


def varre(nome, col, pts, nrm, secao, mat, tam=1.2, fecha_pontas=True):
    """Varre uma seção (lista de (desloc_radial, y), em laço fechado) ao longo do caminho no plano xz."""
    bm = bmesh.new(); aneis = []
    for (x, z), (nx, nz) in zip(pts, nrm):
        aneis.append([bm.verts.new((x + nx * d, y, z + nz * d)) for d, y in secao])
    m = len(secao)
    for a, b in zip(aneis, aneis[1:]):
        for j in range(m):
            bm.faces.new((a[j], a[(j + 1) % m], b[(j + 1) % m], b[j]))
    if fecha_pontas:
        bm.faces.new(aneis[0][::-1]); bm.faces.new(aneis[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = objeto(nome, bm, col, mat); uv_mundo(o, tam)
    for p in o.data.polygons: p.use_smooth = True
    return o


def secao_retangular(d0, d1, y0, y1, chanfro=0.04):
    """Seção retangular chanfrada (d radial de d0 a d1, y de y0 a y1)."""
    c = chanfro
    return [(d0 + c, y0), (d1 - c, y0), (d1, y0 + c), (d1, y1 - c), (d1 - c, y1), (d0 + c, y1), (d0, y1 - c), (d0, y0 + c)]


def secao_redonda(d, y, raio, n=8):
    return [(d + raio * math.cos(2 * math.pi * i / n), y + raio * math.sin(2 * math.pi * i / n)) for i in range(n)]


def tubo(nome, col, pontos, raio, mat, res=6, tam=0.6, fechado=False):
    """Tubo por uma polilinha 3D (curva POLY com bevel, convertida em malha)."""
    cu = bpy.data.curves.new(nome, 'CURVE'); cu.dimensions = '3D'
    cu.bevel_depth = raio; cu.bevel_resolution = max(0, res // 2 - 1); cu.use_fill_caps = True
    sp = cu.splines.new('POLY'); sp.points.add(len(pontos) - 1)
    for p, q in zip(sp.points, pontos): p.co = (*q, 1)
    sp.use_cyclic_u = fechado
    ob = bpy.data.objects.new(nome + '_c', cu); bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob); bpy.data.curves.remove(cu)
    o = bpy.data.objects.new(nome, me); col.objects.link(o)
    me.materials.clear(); me.materials.append(mat)
    for p in me.polygons: p.use_smooth = True
    uv_mundo(o, tam); return o


def catenaria(a, b, queda, n=14):
    """Pontos de uma corda pendurada entre a e b (parábola com queda no meio)."""
    pts = []
    for i in range(n + 1):
        t = i / n
        p = [a[k] + (b[k] - a[k]) * t for k in range(3)]
        p[2] -= queda * 4 * t * (1 - t)
        pts.append(tuple(p))
    return pts


def junta(nome, objs):
    """Une objetos de malha num só (menos chamadas de desenho no site)."""
    objs = [o for o in objs if o is not None]
    if len(objs) == 1: objs[0].name = nome; return objs[0]
    for o in bpy.context.selected_objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join(); o = bpy.context.active_object; o.name = nome; return o


def decima(o, alvo_tris):
    me = o.data; n = sum(len(p.vertices) - 2 for p in me.polygons)
    if n > alvo_tris:
        md = o.modifiers.new('dec', 'DECIMATE'); md.ratio = alvo_tris / n
        bpy.context.view_layer.objects.active = o
        for x in bpy.context.selected_objects: x.select_set(False)
        o.select_set(True); bpy.ops.object.modifier_apply(modifier='dec')
    return o


def mat_emissivo(nome, rgb, forca, base=None, rough=0.3, alpha=1.0, metal=0.0, transm=0.0):
    m = bpy.data.materials.get(nome)
    if m: return m
    m = bpy.data.materials.new(nome); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*(base or rgb), 1)
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    b.inputs['Emission Color'].default_value = (*rgb, 1); b.inputs['Emission Strength'].default_value = forca
    if transm: b.inputs['Transmission Weight'].default_value = transm
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
        try: m.surface_render_method = 'BLENDED'
        except Exception: pass
        try: m.blend_method = 'BLEND'
        except Exception: pass
    return m


def confere_vao(col, folga=0.02, ymin=-1.35, larg_max=6.2, alt_max=9.5, ignora=()):
    """Acusa vértices dentro do vão (perto da boca, y<0.6), atrás da saliência, ou fora da caixa."""
    ruins = []; bb = [9e9, -9e9, 9e9, -9e9, 9e9, -9e9]
    for o in col.all_objects:
        if o.type != 'MESH' or any(o.name.startswith(p) for p in ignora): continue
        mw = o.matrix_world; dentro = 0
        for v in o.data.vertices:
            p = mw @ v.co
            bb = [min(bb[0], p.x), max(bb[1], p.x), min(bb[2], p.y), max(bb[3], p.y), min(bb[4], p.z), max(bb[5], p.z)]
            if -1.4 < p.y < 0.6 and 0.05 < p.z:
                if (abs(p.x) < R - folga and p.z < SPRING) or (math.hypot(p.x, p.z - SPRING) < R - folga and p.z >= SPRING): dentro += 1
        if dentro: ruins.append((o.name, dentro))
        ys = min((mw @ v.co).y for v in o.data.vertices) if o.data.vertices else 0
        if ys < ymin + 0.05: say('  saliente:', o.name, round(ys, 2))
        zs = max((mw @ v.co).z for v in o.data.vertices) if o.data.vertices else 0
        if zs > alt_max: say('  alto:', o.name, round(zs, 2))
    say('caixa x', round(bb[0], 2), round(bb[1], 2), 'y', round(bb[2], 2), round(bb[3], 2), 'z', round(bb[4], 2), round(bb[5], 2))
    if ruins: say('INVADE O VAO:', ruins)
    if bb[0] < -larg_max or bb[1] > larg_max: say('LARGURA EXCEDIDA')
    if bb[2] < ymin: say('SALIENCIA EXCEDIDA')
    if bb[5] > alt_max: say('ALTURA EXCEDIDA')
    return ruins


def contexto_previa(col, tunel_mat=None, fundo=True):
    """Cenário só de prévia (PREV_*): túnel em arco, piso da galeria e paredão, para julgar a fachada no lugar."""
    rocha = material('PREV_rocha', 'stone_wall_04', tint=(0.35, 0.4, 0.48))
    piso = cor('PREV_piso', (0.06, 0.07, 0.08), rough=0.35, metal=0.6)
    pc = bpy.data.collections.get('PREV') or _prev_col()
    # paredão com o furo do túnel
    o = parede_arco('PREV_paredao', pc, 26, 14, 0.6, rocha, frente=0.25, tam=4.0)
    # túnel: casca em arco de 13 m
    pts, nrm = caminho_u(R, 32)
    t = varre('PREV_tunel', bpy.data.collections['PREV'], pts, nrm, [(0, 0.3), (0, 13.3), (1.0, 13.3), (1.0, 0.3)], tunel_mat or rocha, tam=3)
    for p in t.data.polygons: p.use_smooth = False
    # piso da galeria e do túnel
    caixa('PREV_galeria', bpy.data.collections['PREV'], (26, 7, 0.3), (0, -3.5, -0.15), piso, bev=0)
    caixa('PREV_pisotunel', bpy.data.collections['PREV'], (6.4, 13.3, 0.3), (0, 6.6, -0.15), piso, bev=0)
    # medalhão do site (só para julgar a composição): disco escuro com aro dourado em (0, -1.05, H+1.15)
    bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=40, radius=0.85)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'))
    bmesh.ops.translate(bm, vec=(0, -1.05, H + 1.15), verts=bm.verts)
    objeto('PREV_med', bm, pc, mat_emissivo('PREV_med', (0.05, 0.06, 0.08), 0.2, base=(0.04, 0.05, 0.06)))
    tubo('PREV_medaro', pc, [(0.9 * math.cos(a), -1.07, H + 1.15 + 0.9 * math.sin(a)) for a in [i * 2 * math.pi / 40 for i in range(41)]], 0.08, cor('PREV_ouro', (0.79, 0.63, 0.31), rough=0.3, metal=1))
    if fundo:
        caixa('PREV_veu', bpy.data.collections['PREV'], (6.4, 0.05, 6.2), (0, 12.7, 3.1), mat_emissivo('PREV_veu', (0.3, 0.5, 0.9), 0.4), bev=0)


def _prev_col():
    c = bpy.data.collections.new('PREV'); bpy.context.scene.collection.children.link(c); return c


def luzes(cor_int=(1, 0.8, 0.5), forca_int=400):
    """Luz de prévia parecida com a do site: luz pontual dentro da boca + preenchimento frio do salão."""
    sc = bpy.context.scene.collection
    def L(nome, tipo, loc, e, c, size=1.0):
        o = bpy.data.objects.new('PREV_' + nome, bpy.data.lights.new('PREV_' + nome, tipo)); o.data.energy = e; o.data.color = c
        if tipo != 'SUN': o.data.shadow_soft_size = size
        o.location = loc; sc.objects.link(o); return o
    L('boca', 'POINT', (0, 2.4, 3.8), forca_int, cor_int, 1.0)
    L('salao', 'POINT', (0, -9, 6), 2500, (0.45, 0.7, 1.0), 3.0)
    L('salao2', 'POINT', (-9, -6, 2.5), 900, (0.4, 0.6, 1.0), 2.0)
    L('salao3', 'POINT', (9, -6, 2.5), 900, (0.4, 0.6, 1.0), 2.0)
    w = bpy.context.scene.world or bpy.data.worlds.new('W'); bpy.context.scene.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.01, 0.015, 0.025, 1)
    sc_ = bpy.context.scene
    try:
        sc_.eevee.use_bloom = True
    except Exception: pass
    try:
        sc_.view_settings.view_transform = 'AgX'; sc_.view_settings.look = 'AgX - Punchy'
    except Exception: pass


# câmera da arte 1930e6a9 (da entrada, eixo central) levada ao referencial de cada portal
ARTE = {'01': (-31.5, -62.6, -4.0), '03': (-9.7, -76.8, -4.0), '04': (9.7, -76.8, -4.0)}


def previa_arte(nome, pid):
    c = Vector(ARTE[pid]); d = c.length
    return previa(nome + '_arte', cam=tuple(c), alvo=(0, 0, 4.2), lente=36 * d / 14.0, luz=False)


def previas(nome, extra=()):
    """Frente (como a arte 1930e6a9, de baixo e de longe) e diagonal; luz própria (luz=False no kit)."""
    out = [previa(nome + '_frente', cam=(0, -17, 3.2), alvo=(0, 0, 4.3), lente=32, luz=False)]
    out.append(previa(nome + '_diag', cam=(9, -12, 4.5), alvo=(0, 0, 4.0), lente=30, luz=False))
    for i, (cam, alvo, lente) in enumerate(extra):
        out.append(previa(f'{nome}_x{i}', cam=cam, alvo=alvo, lente=lente, luz=False))
    return out


def tira_previa():
    for o in list(bpy.data.objects):
        if o.name.startswith('PREV_'): bpy.data.objects.remove(o)
    c = bpy.data.collections.get('PREV')
    if c: bpy.data.collections.remove(c)


def bloom(forca=1.0):
    """Brilho (glare) só na prévia, para julgar os emissivos como no site (que usa bloom)."""
    sc = bpy.context.scene
    try:
        sc.eevee.use_raytracing = True
    except Exception: pass
    try:
        ng = bpy.data.node_groups.get('PREV_comp') or bpy.data.node_groups.new('PREV_comp', 'CompositorNodeTree')
        n = ng.nodes; l = ng.links
        for x in list(n): n.remove(x)
        if not any(s.in_out == 'OUTPUT' for s in ng.interface.items_tree):
            ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
        ri = n.new('CompositorNodeRLayers'); gl = n.new('CompositorNodeGlare'); out = n.new('NodeGroupOutput')
        try: gl.inputs['Type'].default_value = 'Bloom'
        except Exception:
            try: gl.glare_type = 'BLOOM'
            except Exception: pass
        for k, v in (('Strength', forca), ('Size', 0.6), ('Threshold', 0.9)):
            try: gl.inputs[k].default_value = v
            except Exception: pass
        l.new(ri.outputs['Image'], gl.inputs['Image']); l.new(gl.outputs['Image'], out.inputs[0])
        sc.compositing_node_group = ng
        sc.render.use_compositing = True
    except Exception as e:
        say('bloom indisponivel:', e)
