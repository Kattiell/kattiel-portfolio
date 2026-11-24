"""Garagem + sala de trajes (area_garagem.glb, coleção A_GARAGEM), referencial MUNDO.
Blender: X = x three, Y = -z three, Z = y three. Laje 14x20 centrada em three (-24, z=4) => X -31..-17, Y -14..6, topo Z=1.5.
Baia em abóbada (eixo ao longo de Y), boca aberta para a frente (Y=-14, lado da entrada) e lado +X aberto para a plataforma.
Plataforma giratória em three (-23.5, z=5) => (-23.5, -5). Sala de trajes no fundo (Y≈5)."""
import sys; sys.path.insert(0, r'C:\Users\Gabriel Caetano\Downloads\Claud Code\batcaverna\tools\blender\oficina')
from kit import *
import kit
from mathutils import noise
import random

G = os.path.dirname(os.path.abspath(__file__)); TEX = os.path.join(G, 'tex')
X0, X1, Y0, Y1, PISO = -31.0, -17.0, -14.0, 6.0, 1.5
TT = (-23.5, -5.0)
PE, ARQ_A, ARQ_B = 5.0, 7.0, 3.6      # pé-direito vertical até Z=5, abóbada elíptica (meia-largura 7, flecha 3.6) => topo 8.6
RIBS = [-14.0, -10.0, -6.4, -2.6, 2.6, 6.0]   # costelas; vão livre Y -2.4..2.4 para a passagem da plataforma

# ---------------- materiais ----------------
def ph_mat(nome, pid, tint=(1, 1, 1), rough=None, metal=0.0, nor=1.0, emiss=None):
    m = bpy.data.materials.get(nome)
    if m: return m
    t = ph_textura(pid)
    m = bpy.data.materials.new(nome); m.use_nodes = True
    n = m.node_tree.nodes; l = m.node_tree.links; b = n['Principled BSDF']
    b.inputs['Metallic'].default_value = metal
    def img(path, cs):
        nd = n.new('ShaderNodeTexImage'); nd.image = bpy.data.images.load(path, check_existing=True); nd.image.colorspace_settings.name = cs; return nd
    d = img(t['diff'], 'sRGB')
    mx = n.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 1
    mx.inputs['B'].default_value = (*tint, 1); l.new(d.outputs['Color'], mx.inputs['A']); l.new(mx.outputs['Result'], b.inputs['Base Color'])
    if rough is None and 'rough' in t: r = img(t['rough'], 'Non-Color'); l.new(r.outputs['Color'], b.inputs['Roughness'])
    else: b.inputs['Roughness'].default_value = rough if rough is not None else 0.5
    if 'nor' in t and nor > 0:
        nn = img(t['nor'], 'Non-Color'); nm = n.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nor
        l.new(nn.outputs['Color'], nm.inputs['Color']); l.new(nm.outputs['Normal'], b.inputs['Normal'])
    if emiss: b.inputs['Emission Color'].default_value = (*emiss[0], 1); b.inputs['Emission Strength'].default_value = emiss[1]
    return m

def ph_pintado(nome, pid, rgb, metal=0.3, nor=1.0):
    """Tinta de cor fixa sobre o relevo e a rugosidade escaneados (glTF não aceita fator de cor > 1)."""
    m = ph_mat(nome, pid, metal=metal, nor=nor); b = m.node_tree.nodes['Principled BSDF']
    for lk in list(b.inputs['Base Color'].links): m.node_tree.links.remove(lk)
    b.inputs['Base Color'].default_value = (*rgb, 1); return m

def vidro(nome):
    m = bpy.data.materials.get(nome)
    if m: return m
    m = cor(nome, (0.55, 0.75, 0.85), rough=0.04)
    b = m.node_tree.nodes['Principled BSDF']; b.inputs['Alpha'].default_value = 0.07
    if hasattr(m, 'surface_render_method'): m.surface_render_method = 'BLENDED'
    else: m.blend_method = 'BLEND'
    return m

def tela_mat(nome, arquivo, forca=2.2):
    m = bpy.data.materials.get(nome)
    if m: return m
    m = bpy.data.materials.new(nome); m.use_nodes = True; n = m.node_tree.nodes; b = n['Principled BSDF']
    t = n.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(os.path.join(TEX, arquivo), check_existing=True)
    m.node_tree.links.new(t.outputs['Color'], b.inputs['Base Color']); m.node_tree.links.new(t.outputs['Color'], b.inputs['Emission Color'])
    b.inputs['Emission Strength'].default_value = forca; b.inputs['Roughness'].default_value = 0.2
    return m

# ---------------- geometria ----------------
def perfil(nseg=28, aberto_dir=False):
    """Linha interna da baia no plano XZ: pé esquerdo, abóbada elíptica, pé direito."""
    pts = [(X0, PISO), (X0, PISO + 1.75), (X0, PE)]
    cx = (X0 + X1) / 2
    for i in range(1, nseg):
        a = math.pi - math.pi * i / nseg; pts.append((cx + ARQ_A * math.cos(a), PE + ARQ_B * math.sin(a)))
    pts.append((X1, PE))
    if not aberto_dir: pts += [(X1, PISO + 1.75), (X1, PISO)]
    return pts

def normais_in(pts):
    ns = []
    for i in range(len(pts)):
        a = Vector(pts[max(i - 1, 0)]); b = Vector(pts[min(i + 1, len(pts) - 1)]); t = (b - a).normalized()
        ns.append(Vector((t.y, -t.x)))
    return ns

def varre(nome, col, pts, secao, mat, tam=2.0):
    """Varre uma seção fechada [(off_normal_dentro, y)] ao longo do perfil XZ (costelas, pele, filetes)."""
    ns = normais_in(pts); bm = bmesh.new(); anel = []
    for p, nrm in zip(pts, ns):
        anel.append([bm.verts.new((p[0] + nrm.x * o, y, p[1] + nrm.y * o)) for o, y in secao])
    k = len(secao)
    for i in range(len(anel) - 1):
        for j in range(k):
            bm.faces.new((anel[i][j], anel[i][(j + 1) % k], anel[i + 1][(j + 1) % k], anel[i + 1][j]))
    bm.faces.new(list(reversed(anel[0]))); bm.faces.new(anel[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = objeto(nome, bm, col, mat); uv_mundo(o, tam); return o

def secao_viga(y, larg=0.36, prof=0.5, ch=0.05):
    """Seção em I chanfrada (alma + mesas) — off 0 = face colada na pele, prof = face interna."""
    h = larg / 2; w = 0.08
    return [(0, y - h + ch), (ch, y - h), (0.12, y - h), (0.12, y - w), (prof - 0.12, y - w), (prof - 0.12, y - h), (prof - ch, y - h),
            (prof, y - h + ch), (prof, y + h - ch), (prof - ch, y + h), (prof - 0.12, y + h), (prof - 0.12, y + w), (0.12, y + w),
            (0.12, y + h), (ch, y + h), (0, y + h - ch)]

def secao_ret(o0, o1, y0, y1):
    return [(o0, y0), (o1, y0), (o1, y1), (o0, y1)]

MEIA = [(0.00, 0.10), (0.05, 0.14), (0.085, 0.32), (0.115, 0.12), (0.20, 0.10), (0.45, 0.22), (0.75, 0.31), (1.00, 0.38),
        (0.88, 0.15), (0.86, -0.01), (0.74, 0.04), (0.66, -0.12), (0.52, -0.06), (0.40, -0.22), (0.25, -0.12), (0.12, -0.20), (0.00, -0.38)]
def morcego(nome, col, mat, loc, s, esp=0.03, eixo='Y', sinal=-1):
    """Emblema do morcego extrudado. eixo = normal do emblema (Y: parede de frente/fundo; X: parede lateral)."""
    pts = [(x, y) for x, y in MEIA] + [(-x, y) for x, y in reversed(MEIA[1:-1])]
    bm = bmesh.new(); vs = [bm.verts.new((x * s, 0, y * s)) for x, y in pts]
    f = bm.faces.new(vs); ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, vec=Vector((0, esp, 0)), verts=[e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bmesh.ops.triangulate(bm, faces=bm.faces)
    o = objeto(nome, bm, col, mat); o.location = loc
    if eixo == 'X': o.rotation_euler = (0, 0, math.pi / 2 * (-sinal))
    elif eixo == 'Z': o.rotation_euler = (math.pi / 2, 0, 0)
    elif sinal > 0: o.rotation_euler = (0, 0, math.pi)
    return o

def plano_uv(nome, col, w, h, mat):
    bm = bmesh.new(); bm.loops.layers.uv.verify(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5, calc_uvs=True)
    bmesh.ops.scale(bm, vec=Vector((w, h, 1)), verts=bm.verts)
    return objeto(nome, bm, col, mat)

def tela(nome, col, w, h, loc, rz, arquivo, moldura, incl=0.0):
    """Monitor: moldura chanfrada + TELA_ (UV 0–1). rz: para onde a tela olha (0 = -Y); incl: deitar para trás (rad)."""
    fr = caixa(nome + '_moldura', col, (w + 0.16, 0.09, h + 0.16), (0, 0, 0), moldura, bev=0.025)
    sc = plano_uv('TELA_' + nome, col, w, h, tela_mat('GAR_tela_' + arquivo[:-4], arquivo))
    sc.rotation_euler = (math.pi / 2, 0, 0); sc.location = (0, -0.05, 0)
    M = Matrix.Translation(Vector(loc)) @ Matrix.Rotation(rz, 4, 'Z') @ Matrix.Rotation(-incl, 4, 'X')
    bpy.context.view_layer.update()
    for o in (fr, sc): o.matrix_world = M @ o.matrix_world
    return fr, sc

def toro(nome, col, R_, r_, loc, rot, mat, seg=48, mseg=8):
    bpy.ops.mesh.primitive_torus_add(major_radius=R_, minor_radius=r_, major_segments=seg, minor_segments=mseg, location=loc, rotation=rot)
    o = bpy.context.active_object; o.name = nome; ligar(o, col); o.data.materials.append(mat); return o

def cilindro(nome, col, r, h, loc, mat, rot=(0, 0, 0), seg=24, r2=None):
    bpy.ops.mesh.primitive_cone_add(vertices=seg, radius1=r, radius2=r if r2 is None else r2, depth=h, location=loc, rotation=rot)
    o = bpy.context.active_object; o.name = nome; ligar(o, col); o.data.materials.append(mat)
    bpy.ops.object.shade_smooth(); return o

# ---------------- modelos Poly Haven ----------------
def ph_modelo_unico(pid, filtro=None, res='1k'):
    """Como kit.ph_modelo, mas aceita malhas compartilhadas (variantes _a/_b) e filtra objetos pelo sufixo."""
    meta_p = os.path.join(kit.PHM, pid, 'meta.json'); kit._baixa(f'https://api.polyhaven.com/files/{pid}', meta_p)
    meta = json.load(open(meta_p, encoding='utf-8')); b = meta['blend'][res]['blend']
    path = kit._baixa(b['url'], os.path.join(kit.PHM, pid, os.path.basename(b['url'].split('?')[0])))
    for rel, inc in (b.get('include') or {}).items(): kit._baixa(inc['url'], os.path.join(kit.PHM, pid, rel))
    with bpy.data.libraries.load(path, link=False) as (src, dst): dst.objects = [n for n in src.objects]
    todos = [o for o in dst.objects if o is not None]
    objs = [o for o in todos if o.type == 'MESH' and (filtro is None or o.name.endswith(filtro))] or [o for o in todos if o.type == 'MESH']
    for o in objs:
        bpy.context.scene.collection.objects.link(o); o.data = o.data.copy()
    for o in bpy.context.selected_objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(objs) > 1: bpy.ops.object.join()
    o = bpy.context.active_object; o.name = pid
    for x in todos:
        if x not in objs and x.name in bpy.data.objects: bpy.data.objects.remove(x)
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS'); bpy.context.view_layer.update()
    o.location = (0, 0, o.dimensions.z / 2); return o

def prep(pid, alvo=None, tint=None, base=None, rough=None, filtro=None):
    """Baixa uma vez, reduz a malha para `alvo` triângulos e ajusta a cor (tinta multiplicada ou cor fixa)."""
    if pid in kit._modelos: return kit._modelos[pid]
    b = ph_modelo(pid) if filtro is None else ph_modelo_unico(pid, filtro); t = C.tris(b)
    if alvo and t > alvo:
        for o in bpy.context.selected_objects: o.select_set(False)
        b.select_set(True); bpy.context.view_layer.objects.active = b
        d = b.modifiers.new('reduz', 'DECIMATE'); d.ratio = alvo / t; C.aplica(b)
    bpy.context.scene.collection.objects.unlink(b); kit._modelos[pid] = b
    for sl in b.material_slots:
        m = sl.material
        if not m or not m.use_nodes: continue
        m = m.copy(); m.name = 'GAR_' + pid + '_' + sl.material.name[:20]; sl.material = m
        bs = [n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED']
        if not bs: continue
        bsdf = bs[0]; inp = bsdf.inputs['Base Color']
        if base is not None:
            for lk in list(inp.links): m.node_tree.links.remove(lk)
            inp.default_value = (*base, 1)
        elif tint is not None and inp.links:
            src = inp.links[0].from_socket
            mx = m.node_tree.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 1
            mx.inputs['B'].default_value = (*tint, 1); m.node_tree.links.new(src, mx.inputs['A']); m.node_tree.links.new(mx.outputs['Result'], inp)
        if rough is not None:
            for lk in list(bsdf.inputs['Roughness'].links): m.node_tree.links.remove(lk)
            bsdf.inputs['Roughness'].default_value = rough
    say('modelo', pid, t, '->', C.tris(b))
    return b

def pendura(pid, col, nome, x, y, z, comp, rz=0.0):
    """Ferramenta pendurada na parede X=X0: eixo mais longo em Z, mais fino em X (encostado)."""
    base = kit._modelos[pid]; o = copia(base, col, nome)
    d = base.dimensions; ix = sorted(range(3), key=lambda i: d[i])   # fino, médio, longo
    R = Matrix.Identity(3); E = [Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))]
    cols = [None] * 3; cols[ix[2]] = E[2]; cols[ix[0]] = E[0]; cols[ix[1]] = E[1]
    for i in range(3):
        for j in range(3): R[j][i] = cols[i][j]
    if R.determinant() < 0:
        for j in range(3): R[j][ix[1]] *= -1
    k = comp / d[ix[2]]
    o.matrix_world = Matrix.Rotation(rz, 4, 'X') @ R.to_4x4() @ Matrix.Scale(k, 4)
    bpy.context.view_layer.update()
    bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
    o.location += Vector((x - min(v.x for v in bb), y - (min(v.y for v in bb) + max(v.y for v in bb)) / 2, z - (min(v.z for v in bb) + max(v.z for v in bb)) / 2))
    return o

# ---------------- traje (manequim modelado por esqueleto + armadura) ----------------
def traje(nome, col, x, y, z, rz, tecido, placa, ouro, capa=False, cinto_ouro=True):
    pts = {'pel': (0, 0, 1.0, .17), 'col': (0, 0, 1.24, .16), 'pei': (0, 0, 1.45, .2), 'pes': (0, 0, 1.62, .075), 'cab': (0, 0, 1.74, .115), 'top': (0, 0.01, 1.86, .095),
           'omE': (-.23, 0, 1.52, .095), 'cotE': (-.3, .02, 1.22, .065), 'puE': (-.33, 0, 0.98, .05),
           'omD': (.23, 0, 1.52, .095), 'cotD': (.3, .02, 1.22, .065), 'puD': (.33, 0, 0.98, .05),
           'quE': (-.11, 0, 0.97, .095), 'joE': (-.13, 0, 0.55, .075), 'toE': (-.13, 0, 0.12, .06), 'peE': (-.13, -.15, 0.05, .05),
           'quD': (.11, 0, 0.97, .095), 'joD': (.13, 0, 0.55, .075), 'toD': (.13, 0, 0.12, .06), 'peD': (.13, -.15, 0.05, .05)}
    arestas = [('pel', 'col'), ('col', 'pei'), ('pei', 'pes'), ('pes', 'cab'), ('cab', 'top'), ('pei', 'omE'), ('omE', 'cotE'), ('cotE', 'puE'),
               ('pei', 'omD'), ('omD', 'cotD'), ('cotD', 'puD'), ('pel', 'quE'), ('quE', 'joE'), ('joE', 'toE'), ('toE', 'peE'),
               ('pel', 'quD'), ('quD', 'joD'), ('joD', 'toD'), ('toD', 'peD')]
    nomes = list(pts); me = bpy.data.meshes.new(nome)
    me.from_pydata([p[:3] for p in pts.values()], [(nomes.index(a), nomes.index(b)) for a, b in arestas], [])
    o = bpy.data.objects.new(nome, me); col.objects.link(o)
    sk = o.modifiers.new('pele', 'SKIN'); sk.use_smooth_shade = True
    for i, k in enumerate(nomes):
        r = pts[k][3]; o.data.skin_vertices[0].data[i].radius = (r, r * (0.8 if k in ('pei', 'col', 'pel') else 1.0))
    o.data.skin_vertices[0].data[0].use_root = True
    o.modifiers.new('sub', 'SUBSURF').levels = 1
    o.data.materials.append(tecido)
    pecas = [o]
    # armadura: peitoral, abdômen em gomos, ombreiras, caneleiras, cinto, orelhas do capuz, emblema
    pecas.append(caixa(nome + '_peito', col, (.40, .10, .26), (0, -.17, 1.47), placa, bev=.035, rot=(math.radians(-6), 0, 0), tam=.6))
    for i in range(3):
        for s in (-1, 1): pecas.append(caixa(f'{nome}_gomo{i}{s}', col, (.12, .06, .075), (s * .07, -.15, 1.3 - i * .085), placa, bev=.015, tam=.6))
    for s in (-1, 1):
        bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=.13)
        for v in bm.verts:
            if v.co.z < -0.02: v.co.z = -0.02
        po = objeto(f'{nome}_ombro{s}', bm, col, placa); po.location = (s * .25, 0, 1.55); po.scale = (1.15, 1.0, .8); pecas.append(po)
        pecas.append(caixa(f'{nome}_canela{s}', col, (.15, .1, .32), (s * .13, -.06, .32), placa, bev=.03, tam=.6))
        pecas.append(caixa(f'{nome}_luva{s}', col, (.1, .1, .2), (s * .325, 0, 1.05), placa, bev=.03, tam=.6))
        orelha = cilindro(f'{nome}_orelha{s}', col, .035, .12, (s * .06, 0.01, 1.93), tecido, seg=8, r2=0.004); pecas.append(orelha)
    pecas.append(caixa(nome + '_cinto', col, (.38, .27, .07), (0, 0, 1.03), ouro if cinto_ouro else placa, bev=.02, tam=.6))
    for s in (-1, 0, 1): pecas.append(caixa(f'{nome}_bolsa{s}', col, (.07, .05, .08), (s * .13, -.14, 1.03), ouro if cinto_ouro else placa, bev=.012, tam=.6))
    pecas.append(morcego(nome + '_emblema', col, ouro if cinto_ouro else placa, (0, -.225, 1.5), .13, esp=.012))
    if capa:
        bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=10, y_segments=14, size=0.5, calc_uvs=True)
        for v in bm.verts:
            u, t = v.co.x, v.co.y + 0.5     # t 0 (baixo) .. 1 (ombro)
            larg = 0.42 + 0.5 * (1 - t)
            v.co = Vector((u * 2 * larg, .17 + 0.12 * (1 - t) + 0.05 * math.cos(u * 9) * (1 - t) - 0.08 * (abs(u * 2) ** 2) * (1 - t) * -1, 0.12 + t * 1.45))
        cp = objeto(nome + '_capa', bm, col, tecido); pecas.append(cp)
    # suporte do manequim (haste + disco)
    pecas.append(cilindro(nome + '_haste', col, .03, .9, (0, .12, .45), placa, seg=10))
    for p in pecas:
        p.location = Matrix.Rotation(rz, 3, 'Z') @ Vector(p.location) + Vector((x, y, z)); p.rotation_euler.z += rz
    return pecas

# ---------------- cena ----------------
def main(args):
    C.limpa()
    col = colecao('A_GARAGEM')
    # materiais (Poly Haven, escala de mundo via uv_mundo)
    piso = ph_mat('GAR_piso', 'rubber_tiles', tint=(0.42, 0.46, 0.52), rough=0.2, metal=0.35)
    chapa = ph_mat('GAR_chapa', 'metal_plate_02', tint=(0.32, 0.34, 0.38), metal=0.6)
    aco = ph_mat('GAR_aco', 'blue_metal_plate', tint=(0.16, 0.17, 0.19), rough=0.38, metal=0.85)
    grafite = ph_mat('GAR_grafite', 'metal_plate_02', tint=(0.12, 0.125, 0.14), metal=0.75)
    grade = ph_mat('GAR_grade', 'metal_grate_rusty', tint=(0.18, 0.19, 0.22), metal=0.7, rough=0.45)
    rocha = ph_mat('GAR_rocha', 'rock_face', tint=(0.17, 0.2, 0.25), nor=1.4)
    xadrez = ph_mat('GAR_xadrez', 'metal_plate', tint=(0.3, 0.32, 0.36), metal=0.7)
    estand = ph_mat('GAR_estandarte', 'fabric_pattern_07', tint=(0.2, 0.08, 0.32))
    couro = ph_mat('GAR_couro_traje', 'fabric_leather_01', tint=(0.07, 0.075, 0.085), rough=0.42, nor=1.5)
    couro_l = ph_mat('GAR_couro_livro', 'fabric_leather_02', tint=(0.25, 0.12, 0.08))
    placa = cor('GAR_placa_armadura', (0.035, 0.037, 0.042), rough=0.33, metal=0.75)
    ouro = cor('GAR_ouro', (0.85, 0.6, 0.22), rough=0.28, metal=1.0)
    latao = cor('GAR_latao', (0.78, 0.55, 0.24), rough=0.32, metal=1.0)
    amarelo = cor('GAR_amarelo', (0.95, 0.62, 0.04), rough=0.4, metal=0.2)
    amarelo_g = ph_pintado('GAR_amarelo_guindaste', 'metal_plate_02', (0.85, 0.52, 0.04), metal=0.35)
    preto = cor('GAR_preto', (0.012, 0.012, 0.014), rough=0.55)
    ciano = cor('GAR_led_ciano', (0.02, 0.6, 1.0), rough=0.3, emiss=2.2)
    ciano_f = cor('GAR_led_ciano_fraco', (0.03, 0.5, 0.9), rough=0.3, emiss=1.2)
    branco = cor('GAR_luz_teto', (0.86, 0.94, 1.0), rough=0.3, emiss=6.0)
    luz_vit = cor('GAR_luz_vitrine', (0.6, 0.85, 1.0), rough=0.3, emiss=3.0)
    fundo_vit = cor('GAR_fundo_vitrine', (0.02, 0.2, 0.38), rough=0.5, emiss=0.3)
    chama = cor('GAR_chama', (1.0, 0.62, 0.25), rough=0.4, emiss=10.0)
    ouro_luz = cor('GAR_ouro_luz', (1.0, 0.7, 0.3), rough=0.3, emiss=1.0)
    vid = vidro('GAR_vidro')

    # ---- laje e piso
    caixa('GAR_laje', col, (X1 - X0, Y1 - Y0, 0.6), ((X0 + X1) / 2, (Y0 + Y1) / 2, PISO - 0.3), piso, bev=0.04, tam=4.0)
    for gx in (-27.2, -20.6):   # grelhas de drenagem na boca
        caixa(f'GAR_grelha{gx}', col, (2.4, 1.1, 0.03), (gx, -12.9, PISO + 0.006), grade, bev=0.0, tam=1.0)
        caixa(f'GAR_grelha_aro{gx}', col, (2.55, 1.25, 0.02), (gx, -12.9, PISO + 0.002), aco, bev=0.0)
    # faixas zebradas amarelo/preto no piso (borda da boca e corredor para a plataforma)
    def zebra(nome, xa, xb, y, larg, ang=0.0):
        bm = bmesh.new(); n = int(abs(xb - xa) / 0.32); w = (xb - xa) / n
        for i in range(n):
            x = xa + i * w; e = larg * 0.5
            vs = [bm.verts.new(v) for v in ((x, y - e, 0), (x + w, y - e, 0), (x + w + 0.18, y + e, 0), (x + 0.18, y + e, 0))]
            f = bm.faces.new(vs); f.material_index = i % 2
        o = objeto(nome, bm, col, amarelo); o.data.materials.append(preto)
        o.rotation_euler.z = ang; o.location.z = PISO + 0.004; uv_mundo(o, 1.0); return o
    zebra('GAR_zebra_boca', X0 + 0.2, X1 - 0.4, Y0 + 0.35, 0.32)
    z1 = zebra('GAR_zebra_corredor', 0, 9.0, 0, 0.3); z1.location = (X1 - 0.3, -11.6, PISO + 0.004); z1.rotation_euler.z = math.pi / 2
    # ---- plataforma giratória rente ao piso (centro livre: o site põe o carro e gira o disco)
    def anel(nome, r0, r1, mat, n=96, zebrado=False, dz=0.0):
        bm = bmesh.new()
        for i in range(n):
            a0 = 2 * math.pi * i / n; a1 = 2 * math.pi * (i + 1) / n; sk = 0.035 if zebrado else 0
            vs = [bm.verts.new((math.cos(a) * r, math.sin(a) * r, 0)) for a, r in ((a0, r0), (a1, r0), (a1 + sk, r1), (a0 + sk, r1))]
            f = bm.faces.new(vs); f.material_index = (i % 2) if zebrado else 0
        o = objeto(nome, bm, col, mat)
        if zebrado: o.data.materials.append(preto)
        o.location = (TT[0], TT[1], PISO + 0.008 + dz); uv_mundo(o, 1.2); return o
    bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=96, radius=4.3)
    ext = bmesh.ops.extrude_face_region(bm, geom=list(bm.faces)); bmesh.ops.translate(bm, vec=Vector((0, 0, -0.04)), verts=[e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    d = objeto('GIRA_disco', bm, col, xadrez); d.location = (TT[0], TT[1], PISO + 0.035); uv_mundo(d, 1.4)
    for r in (1.6, 3.1):
        a = anel(f'GIRA_sulco{r}', r, r + 0.03, aco, dz=0.03)
    anel('GAR_gira_linha', 4.3, 4.38, amarelo)
    anel('GAR_gira_zebra', 4.45, 4.95, amarelo, n=72, zebrado=True)
    anel('GAR_gira_lábio', 4.95, 5.08, aco, dz=0.004)
    anel('GAR_gira_led', 4.39, 4.44, ciano_f, dz=0.002)

    # ---- abóbada: pele de chapas, costelas em I com filete de LED ciano, longarinas
    pf = perfil()
    pele = perfil(aberto_dir=True)
    varre('GAR_pele', col, pele, secao_ret(-0.14, 0.0, Y0 - 0.05, Y1 + 0.05), chapa, tam=3.0)
    arco_int = [p for p in pf if p[1] >= PE - 0.01]
    for i, y in enumerate(RIBS):
        frente = (y == Y0)
        varre(f'GAR_costela{i}', col, pf, secao_viga(y, larg=0.6 if frente else 0.36, prof=0.75 if frente else 0.5), aco, tam=1.5)
        varre(f'GAR_led_costela{i}', col, arco_int, secao_ret(0.75 if frente else 0.5, (0.77 if frente else 0.52), y - 0.05, y + 0.05), ciano, tam=1.0)
        for s, xx in ((-1, X0 + 0.25), (1, X1 - 0.25)):   # sapatas
            caixa(f'GAR_sapata{i}{s}', col, (0.9, 0.7, 0.3), (xx + (0.15 if s < 0 else -0.15), y, PISO + 0.15), grafite, bev=0.04)
    pts_ab = [p for p in pf if p[1] >= PE + 0.5]
    for k, (px, pz) in enumerate([pts_ab[4], pts_ab[len(pts_ab) // 2], pts_ab[-5]]):
        caixa(f'GAR_longarina{k}', col, (0.28, Y1 - Y0, 0.28), (px, (Y0 + Y1) / 2, pz - 0.5), grafite, bev=0.03, tam=2.0)
    caixa('GAR_viga_borda', col, (0.5, Y1 - Y0 + 0.4, 0.6), (X1 - 0.25, (Y0 + Y1) / 2, PE + 0.1), aco, bev=0.04, tam=2.0)
    caixa('GAR_led_borda', col, (0.06, Y1 - Y0, 0.08), (X1 + 0.02, (Y0 + Y1) / 2, PE - 0.12), ciano, bev=0.0)
    # luminárias retangulares no teto (fileira central, como na arte)
    for j, y in enumerate([-12.0, -8.2, -4.5, -0.0, 4.3]):
        caixa(f'GAR_luminaria{j}', col, (2.8, 0.55, 0.12), (-24.0, y, PE + ARQ_B - 0.62), grafite, bev=0.02)
        caixa(f'GAR_luz_teto{j}', col, (2.6, 0.42, 0.03), (-24.0, y, PE + ARQ_B - 0.69), branco, bev=0.0)
    # parede do fundo (Y1): chapas + filetes verticais de LED
    fundo = [p for p in pf]
    bm = bmesh.new(); vs = [bm.verts.new((x, 0, z)) for x, z in fundo]
    f = bm.faces.new(vs); ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, vec=Vector((0, 0.3, 0)), verts=[e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    pf_o = objeto('GAR_parede_fundo', bm, col, chapa); pf_o.location.y = Y1 + 0.05; uv_mundo(pf_o, 3.0)
    # ---- rocha por cima e em volta da boca ("baia em arco sob a rocha")
    rnd = random.Random(7)
    nx, ny = 40, 48; xa, xb, ya, yb = X0 - 2.6, X1 + 1.2, Y0 - 1.6, Y1 + 1.8
    bm = bmesh.new(); grid = []
    for j in range(ny + 1):
        lin = []
        for i in range(nx + 1):
            x = xa + (xb - xa) * i / nx; y = ya + (yb - ya) * j / ny
            xc = min(max(x, X0), X1); u = (xc - (X0 + X1) / 2) / ARQ_A
            ztop = PE + ARQ_B * math.sqrt(max(0.0, 1 - u * u)) + 0.25
            if x < X0: ztop = PISO + (ztop - PISO) * max(0.0, 1 - ((X0 - x) / 2.6) ** 1.6) - 0.6 * (X0 - x) / 2.6
            if x > X1: ztop = PE + 0.45 - 0.6 * (x - X1)
            nz = noise.fractal(Vector((x * 0.32, y * 0.32, 3.1)), 0.6, 2.1, 4)
            h = ztop + 0.15 + max(0.0, nz + 0.35) * 0.75
            yy = y
            if y < Y0 - 0.2: h += (Y0 - 0.2 - y) * 0.3; yy = y + 0.25 * nz
            lin.append(bm.verts.new((x + 0.25 * noise.noise(Vector((x, y, 1.0))), yy, h)))
        grid.append(lin)
    for j in range(ny):
        for i in range(nx): bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ro = objeto('GAR_rocha_teto', bm, col, rocha); uv_mundo(ro, 4.0)
    for p in ro.data.polygons: p.use_smooth = True
    # ombreira de rocha + chapa à esquerda da boca (onde fica o estandarte, como na arte)
    caixa('GAR_ombreira', col, (2.4, 0.5, 8.0), (X0 - 1.2, Y0 - 0.25, 4.0), rocha, bev=0.12, tam=3.0)
    caixa('GAR_ombreira_chapa', col, (1.9, 0.08, 6.4), (X0 - 1.15, Y0 - 0.54, 4.4), chapa, bev=0.02, tam=2.0)

    # ---- estandarte com o morcego (roxo com borda dourada), na ombreira
    bm = bmesh.new(); bm.loops.layers.uv.verify(); bmesh.ops.create_grid(bm, x_segments=6, y_segments=18, size=0.5, calc_uvs=True)
    for v in bm.verts:
        u = v.co.x; t = v.co.y
        v.co = Vector((u * 1.3, -0.04 * math.sin(t * 6 + u * 3) * (0.5 - t), t * 3.6))
        if t < -0.42: v.co.z -= 0.5 * (1 - abs(u) * 2)
    o = objeto('GAR_estandarte', bm, col, estand); o.location = (X0 - 1.15, Y0 - 0.66, 5.0); uv_mundo(o, 1.2)
    caixa('GAR_estandarte_haste', col, (1.6, 0.07, 0.07), (X0 - 1.15, Y0 - 0.66, 6.85), ouro, bev=0.0)
    for s in (-1, 1): caixa(f'GAR_estandarte_borda{s}', col, (0.05, 0.03, 3.5), (X0 - 1.15 + s * 0.63, Y0 - 0.7, 5.0), ouro, bev=0.0)
    morcego('GAR_estandarte_morcego', col, ouro, (X0 - 1.15, Y0 - 0.71, 5.4), 0.55, esp=0.02)
    prep('Lantern_01', 5000)
    lanterna(col, 'GAR_lanterna_boca', X0 + 0.15, Y0 - 0.8, 5.0, altura=0.7)
    caixa('GAR_lanterna_braco', col, (0.06, 0.5, 0.06), (X0 + 0.15, Y0 - 0.55, 5.75), grafite, bev=0.0)

    # ---- parede de ferramentas (fundo X0, perto da boca) + bancada
    caixa('GAR_painel_ferr', col, (0.06, 3.2, 2.3), (X0 + 0.04, -11.95, 3.75), grafite, bev=0.02, tam=1.0)
    caixa('GAR_bancada', col, (0.8, 3.3, 0.9), (X0 + 0.42, -11.95, PISO + 0.45), chapa, bev=0.03, tam=1.5)
    caixa('GAR_bancada_tampo', col, (0.9, 3.4, 0.06), (X0 + 0.46, -11.95, PISO + 0.93), aco, bev=0.015)
    for k in range(3):
        caixa(f'GAR_gaveta{k}', col, (0.03, 0.95, 0.24), (X0 + 0.83, -13.0 + k * 1.05, PISO + 0.65), grafite, bev=0.01)
        caixa(f'GAR_puxador{k}', col, (0.03, 0.4, 0.03), (X0 + 0.855, -13.0 + k * 1.05, PISO + 0.7), latao, bev=0.0)
    caixa('GAR_bancada_luz', col, (0.12, 3.0, 0.05), (X0 + 0.25, -11.95, 5.0), cor('GAR_luz_quente', (1.0, 0.68, 0.35), rough=0.3, emiss=6.0), bev=0.0)
    prep('combination_wrench', 700); prep('adjustable_wrench', 1200, tint=(0.8, 0.82, 0.86)); prep('pipe_wrench', 1800); prep('screwdrivers_02', 1500)
    for j in range(8):
        pendura('combination_wrench', col, f'GAR_chave{j}', X0 + 0.08, -13.25 + j * 0.3, 4.5, 0.42 + 0.04 * (j % 4))
    for j in range(3):
        pendura('adjustable_wrench', col, f'GAR_inglesa{j}', X0 + 0.08, -13.25 + j * 0.38, 3.45, 0.5)
    for j in range(2):
        pendura('pipe_wrench', col, f'GAR_grifo{j}', X0 + 0.08, -11.95 + j * 0.5, 3.5, 0.62)
    for j in range(3):
        pendura('screwdrivers_02', col, f'GAR_chaves_fenda{j}', X0 + 0.08, -12.4 + j * 0.25, 3.3, 0.38)
    tela('ferramentas', col, 0.9, 0.62, (X0 + 0.12, -10.85, 3.5), math.pi / 2, 'tela_morcego.png', grafite)
    prep('metal_toolbox', 3000, base=(0.05, 0.055, 0.06), rough=0.4)
    modelo('metal_toolbox', col, 'GAR_caixa_ferr', X0 + 0.45, -12.6, PISO + 0.96, rz=math.pi / 2, larg=0.5)

    # ---- monitor do emblema + gaveteiros no fundo X0 (vão central)
    tela('emblema', col, 2.4, 1.4, (X0 + 0.12, 0.0, 4.4), math.pi / 2, 'tela_morcego.png', grafite)
    prep('metal_tool_chest', 5000, base=(0.06, 0.065, 0.075), rough=0.35)
    modelo('metal_tool_chest', col, 'GAR_gaveteiro0', X0 + 0.55, -1.2, PISO, rz=-math.pi / 2, altura=1.1)
    modelo('metal_tool_chest', col, 'GAR_gaveteiro1', X0 + 0.55, 1.2, PISO, rz=-math.pi / 2, altura=1.1)
    prep('tool_cart', 8000, base=(0.07, 0.075, 0.085), rough=0.4)
    modelo('tool_cart', col, 'GAR_carrinho', X0 + 0.9, -4.6, PISO, rz=math.pi / 2, altura=0.95)

    # ---- guindaste articulado amarelo com garra-morcego (como na arte) + ponte rolante no teto
    gx, gy = X0 + 0.9, -8.2
    cilindro('GAR_guind_base', col, 0.55, 0.35, (gx, gy, PISO + 0.175), grafite, seg=24)
    caixa('GAR_guind_coluna', col, (0.42, 0.42, 4.2), (gx, gy, PISO + 2.35), amarelo_g, bev=0.05)
    p0 = Vector((gx, gy, PISO + 4.3)); p1 = Vector((-26.0, -6.6, 6.8)); p2 = Vector((-23.6, -5.2, 6.0))
    for nome, a, b, lar in (('GAR_guind_lanca', p0, p1, 0.36), ('GAR_guind_braco', p1, p2, 0.28)):
        dv = b - a; o = caixa(nome, col, (lar, lar, dv.length), (a + b) / 2, amarelo_g, bev=0.04)
        o.rotation_euler = dv.to_track_quat('Z', 'Y').to_euler()
        pist = cilindro(nome + '_pistao', col, 0.07, dv.length * 0.7, (a + b) / 2 + Vector((0, 0, -lar * 0.9)), aco, seg=12)
        pist.rotation_euler = dv.to_track_quat('Z', 'Y').to_euler()
    for p in (p0, p1, p2):
        cilindro('GAR_guind_junta', col, 0.22, 0.5, p, grafite, rot=(math.pi / 2, 0, 0), seg=16)
    for s in (-1, 1):   # correntes até a garra
        for i in range(9):
            toro(f'GAR_corrente{s}_{i}', col, 0.05, 0.012, (p2.x + s * 0.18 * i / 9, p2.y, p2.z - 0.15 - i * 0.12), (0, (i % 2) * math.pi / 2, 0), aco, seg=10, mseg=4)
    morcego('GAR_garra', col, ouro, (p2.x, p2.y, p2.z - 1.35), 0.75, esp=0.12)
    cilindro('GAR_garra_cubo', col, 0.12, 0.25, (p2.x, p2.y + 0.06, p2.z - 1.2), grafite, seg=12)
    caixa('GAR_trilho_teto', col, (0.35, Y1 - Y0 - 1.0, 0.3), (-24.0, (Y0 + Y1) / 2, PE + ARQ_B - 0.25), grafite, bev=0.03)
    prep('overhead_crane', 9000, base=(0.55, 0.36, 0.04), rough=0.45)
    pr = modelo('overhead_crane', col, 'GAR_ponte_rolante', -24.0, -10.6, 0, rz=math.pi / 2, larg=3.0)
    pr.location.z += (PE + ARQ_B - 0.42) - pr.dimensions.z

    # ---- caixas pretas com morcego ciano + caixote de madeira
    prep('old_military_crate', 3500, tint=(0.16, 0.16, 0.17), rough=0.45, filtro='_a')
    c1 = modelo('old_military_crate', col, 'GAR_caixa0', -28.6, -10.4, PISO, rz=0.0, larg=1.35)
    c2 = modelo('old_military_crate', col, 'GAR_caixa1', -27.1, -10.5, PISO, rz=0.15, larg=0.95)
    bpy.context.view_layer.update()
    for c, nm in ((c1, 0), (c2, 1)):
        bb = [c.matrix_world @ Vector(v) for v in c.bound_box]; ymin = min(v.y for v in bb); zc = (min(v.z for v in bb) + max(v.z for v in bb)) / 2
        morcego(f'GAR_caixa_morcego{nm}', col, ciano, (c.location.x, ymin - 0.012, zc), 0.24 if nm == 0 else 0.17, esp=0.01)
    prep('wooden_military_crate', 6000, tint=(0.45, 0.42, 0.4), filtro='_a')
    modelo('wooden_military_crate', col, 'GAR_caixote', -18.6, 3.9, PISO, rz=math.pi / 2, larg=1.4)
    modelo('old_military_crate', col, 'GAR_caixa2', -18.5, 2.75, PISO, rz=0.0, larg=1.1)

    # ---- sala de trajes: três vitrines de vidro iluminadas no fundo (Y1)
    yv = Y1 - 0.95
    for i, xv in enumerate((-28.6, -25.9, -23.2)):
        caixa(f'GAR_vit{i}_base', col, (2.1, 1.5, 0.3), (xv, yv, PISO + 0.15), grafite, bev=0.03)
        caixa(f'GAR_vit{i}_led', col, (1.9, 0.03, 0.05), (xv, yv - 0.76, PISO + 0.2), ciano, bev=0.0)
        caixa(f'GAR_vit{i}_topo', col, (2.1, 1.5, 0.25), (xv, yv, PISO + 3.25), grafite, bev=0.03)
        caixa(f'GAR_vit{i}_luz', col, (1.7, 1.1, 0.02), (xv, yv, PISO + 3.115), luz_vit, bev=0.0)
        caixa(f'GAR_vit{i}_fundo', col, (1.9, 0.05, 2.8), (xv, yv + 0.68, PISO + 1.7), fundo_vit, bev=0.0)
        for s in (-1, 1):
            for t in (-1, 1): caixa(f'GAR_vit{i}_poste{s}{t}', col, (0.07, 0.07, 2.85), (xv + s * 0.99, yv + t * 0.69, PISO + 1.72), aco, bev=0.015)
        caixa(f'GAR_vit{i}_vidro_f', col, (1.92, 0.02, 2.8), (xv, yv - 0.7, PISO + 1.72), vid, bev=0.0)
        for s in (-1, 1): caixa(f'GAR_vit{i}_vidro_l{s}', col, (0.02, 1.36, 2.8), (xv + s * 0.99, yv, PISO + 1.72), vid, bev=0.0)
        caixa(f'GAR_vit{i}_placa', col, (0.5, 0.03, 0.1), (xv, yv - 0.77, PISO + 0.08 + 0.2), ouro, bev=0.0)
        cilindro(f'GAR_vit{i}_pedestal', col, 0.42, 0.08, (xv, yv, PISO + 0.34), aco, seg=32)
        traje(f'GAR_traje{i}', col, xv, yv - 0.05, PISO + 0.38, 0.0, couro, placa, ouro, capa=(i == 0), cinto_ouro=(i != 2))
    morcego('GAR_morcego_fundo', col, luz_vit, (-25.9, Y1 + 0.02, 6.1), 0.85, esp=0.03)
    for xv in (-30.1, -27.25, -24.55, -21.9):
        caixa(f'GAR_led_vert{xv}', col, (0.06, 0.04, 3.6), (xv, Y1 + 0.02, PISO + 2.0), ciano, bev=0.0)
    # estante de equipamentos iluminada ao lado das vitrines
    prep('worn_metal_rack', 3000, base=(0.05, 0.055, 0.06), rough=0.4)
    modelo('worn_metal_rack', col, 'GAR_estante', -20.4, Y1 - 0.5, PISO, rz=0.0, altura=2.3)
    for k2 in range(3):
        caixa(f'GAR_estante_luz{k2}', col, (1.0, 0.03, 0.03), (-20.4, Y1 - 0.75, PISO + 0.6 + k2 * 0.7), ciano_f, bev=0.0)

    # ---- bancada da frente: lanterna, esfera armilar, tablet com a planta do carro, livro das Relíquias, varinha
    bx, by = -27.6, -13.2
    caixa('GAR_bancada2', col, (2.4, 0.95, 0.95), (bx, by, PISO + 0.475), grafite, bev=0.04, tam=1.5)
    caixa('GAR_bancada2_tampo', col, (2.55, 1.05, 0.07), (bx, by, PISO + 0.985), aco, bev=0.02)
    for k2 in range(2):
        caixa(f'GAR_bancada2_gav{k2}', col, (1.0, 0.03, 0.3), (bx - 0.6 + k2 * 1.2, by - 0.49, PISO + 0.62), chapa, bev=0.01)
        caixa(f'GAR_bancada2_pux{k2}', col, (0.4, 0.03, 0.03), (bx - 0.6 + k2 * 1.2, by - 0.51, PISO + 0.68), latao, bev=0.0)
    zt = PISO + 1.02
    lanterna(col, 'GAR_lanterna_bancada', bx - 0.95, by - 0.05, zt, altura=0.5)
    ax, ay = bx - 0.25, by + 0.05
    cilindro('GAR_armilar_base', col, 0.14, 0.04, (ax, ay, zt + 0.02), latao, seg=24)
    cilindro('GAR_armilar_haste', col, 0.02, 0.28, (ax, ay, zt + 0.17), latao, seg=10)
    zc = zt + 0.52
    toro('GAR_armilar_meridiano', col, 0.25, 0.011, (ax, ay, zc), (math.pi / 2, 0, 0.3), latao)
    toro('GAR_armilar_equador', col, 0.25, 0.011, (ax, ay, zc), (0, 0, 0), latao)
    toro('GAR_armilar_ecliptica', col, 0.24, 0.009, (ax, ay, zc), (math.radians(23), 0, 0), latao)
    toro('GAR_armilar_coluro', col, 0.235, 0.008, (ax, ay, zc), (math.pi / 2, 0, 1.87), latao)
    toro('GAR_armilar_suporte', col, 0.29, 0.012, (ax, ay, zc), (math.pi / 2, 0, 0.3 + math.pi / 2), latao)
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=0.05); objeto('GAR_armilar_nucleo', bm, col, ouro_luz).location = (ax, ay, zc)
    tela('tablet', col, 0.44, 0.3, (bx + 0.35, by - 0.12, zt + 0.13), 0.25, 'tela_carro.png', grafite, incl=math.radians(62))
    caixa('GAR_livro', col, (0.36, 0.27, 0.07), (bx + 0.85, by - 0.2, zt + 0.035), couro_l, bev=0.012, rot=(0, 0, -0.2), tam=0.5)
    caixa('GAR_livro_folhas', col, (0.34, 0.25, 0.05), (bx + 0.855, by - 0.19, zt + 0.035), cor('GAR_papel', (0.75, 0.68, 0.52), rough=0.8), bev=0.0, rot=(0, 0, -0.2))
    # Relíquias da Morte em ouro na capa
    lx, ly, lz = bx + 0.85, by - 0.2, zt + 0.072
    tri = [Vector((0, 0.1, 0)), Vector((-0.087, -0.05, 0)), Vector((0.087, -0.05, 0))]
    R2 = Matrix.Rotation(-0.2, 3, 'Z')
    for a_, b_ in ((0, 1), (1, 2), (2, 0)):
        pa, pb = R2 @ tri[a_], R2 @ tri[b_]; dv = pb - pa
        o = caixa(f'GAR_reliquia_tri{a_}', col, (0.007, dv.length, 0.004), (lx + (pa.x + pb.x) / 2, ly + (pa.y + pb.y) / 2, lz), ouro_luz, bev=0.0)
        o.rotation_euler = (0, 0, math.atan2(dv.y, dv.x) - math.pi / 2)
    o = caixa('GAR_reliquia_varinha', col, (0.007, 0.15, 0.004), (lx, ly + 0.025, lz), ouro_luz, bev=0.0, rot=(0, 0, -0.2))
    toro('GAR_reliquia_pedra', col, 0.043, 0.0035, (lx, ly, lz), (0, 0, 0), ouro_luz, seg=24, mseg=4).location = (lx + R2[0][1] * -0.01, ly - 0.01, lz)
    v = cilindro('GAR_varinha', col, 0.011, 0.36, (bx + 0.5, by + 0.25, zt + 0.012), cor('GAR_madeira_escura', (0.12, 0.06, 0.03), rough=0.5), rot=(0, math.pi / 2, 0.5), seg=8, r2=0.006)
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=0.015); objeto('GAR_varinha_ponta', bm, col, chama).location = (bx + 0.5 + 0.18 * math.cos(0.5), by + 0.25 + 0.18 * math.sin(0.5), zt + 0.012)

    # shading suave nas peças curvas
    for o in col.objects:
        if o.type == 'MESH' and o.name.startswith(('GAR_traje', 'GAR_armilar', 'GAR_corrente')):
            for p in o.data.polygons: p.use_smooth = True
    say('objetos', len(col.objects), 'tris', kit._tris(col))

    # ---------------- prévias (contexto e luzes só de conferência, prefixo PREV_) ----------------
    sc = bpy.context.scene
    ctx = bpy.data.collections.new('PREV_ctx'); sc.collection.children.link(ctx)
    agua = caixa('PREV_agua', ctx, (90, 90, 0.1), (0, 0, -0.05), cor('PREV_agua_m', (0.0, 0.05, 0.08), rough=0.05, metal=0.2), bev=0)
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=64, radius1=12, radius2=12, depth=1.5)
    plat = objeto('PREV_plataforma', bm, ctx, cor('PREV_plat_m', (0.12, 0.14, 0.17), rough=0.3, metal=0.6)); plat.location = (0, 0, 0.75)
    caixa('PREV_passarela', ctx, (6, 4.4, 0.4), (-14.5, 0, 1.3), cor('PREV_plat_m2', (0.12, 0.14, 0.17), rough=0.3, metal=0.6), bev=0)
    bruto = os.path.join(BRUTO, 'veiculo2.glb')
    if os.path.exists(bruto):
        antes = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=bruto)
        novos = [o for o in bpy.data.objects if o not in antes]
        raiz = bpy.data.objects.new('PREV_carro_raiz', None); ctx.objects.link(raiz)
        for o in novos:
            o.name = 'PREV_carro_' + o.name
            if o.parent is None: o.parent = raiz
        raiz.location = (TT[0], TT[1], PISO + 0.04); raiz.rotation_euler = (0, 0, math.radians(-100))
    def luz(nome, tipo, loc, energia, corl, tam=1.0, alvo=None, ang=None):
        L = bpy.data.lights.new(nome, tipo); L.energy = energia; L.color = corl
        if tipo == 'AREA': L.size = tam
        if tipo == 'SPOT': L.spot_size = ang or 1.0; L.spot_blend = 0.6
        ob = bpy.data.objects.new(nome, L); ctx.objects.link(ob); ob.location = loc
        if alvo: ob.rotation_euler = (Vector(alvo) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        return ob
    for j, y in enumerate([-12.0, -8.2, -4.5, 0.0, 4.3]):
        luz(f'PREV_teto{j}', 'AREA', (-24.0, y, PE + ARQ_B - 0.75), 900, (0.85, 0.93, 1.0), tam=2.6, alvo=(-24.0, y, 0))
    luz('PREV_spot_carro', 'SPOT', (-23.5, -5, 8.0), 2500, (0.86, 0.92, 1.0), alvo=(-23.5, -5, 1.5), ang=1.0)
    luz('PREV_vitrines', 'AREA', (-25.9, 1.0, 5.5), 160, (0.5, 0.8, 1.0), tam=6, alvo=(-25.9, 5.5, 2.5))
    luz('PREV_lanterna', 'POINT', (bx - 0.95, by - 0.05, zt + 0.3), 60, (1.0, 0.6, 0.25))
    luz('PREV_lanterna2', 'POINT', (X0 + 0.15, Y0 - 1.1, 5.3), 120, (1.0, 0.6, 0.25))
    luz('PREV_ciano', 'AREA', (-12, -6, 6), 1800, (0.2, 0.6, 1.0), tam=8, alvo=(-24, -4, 2))
    luz('PREV_frente', 'AREA', (-20, -22, 7), 1500, (0.7, 0.8, 1.0), tam=8, alvo=(-25, -8, 2))
    w = sc.world or bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.004, 0.008, 0.014, 1)
    try:
        sc.eevee.use_bloom = True
    except Exception: pass
    try: sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
    except Exception: pass
    vistas = {
        'garagem_arte617': dict(cam=(-21.0, -19.5, 4.0), alvo=(-25.6, -4.0, 3.2), lente=17),
        'garagem_trajes': dict(cam=(-23.5, -3.0, 2.9), alvo=(-25.9, 5.5, 2.4), lente=24),
        'garagem_bancada': dict(cam=(-25.6, -15.2, 2.9), alvo=(-27.6, -13.0, 2.45), lente=30),
        'garagem_ferramentas': dict(cam=(-26.0, -9.0, 3.3), alvo=(-31, -11.8, 3.6), lente=26),
        'garagem_entrada': dict(cam=(-4.0, -38.0, 9.0), alvo=(-24.0, -4.0, 4.0), lente=30),
    }
    so = next((a for a in args if a != 'sem_fecha'), None)
    for nome, v in vistas.items():
        if so and so not in nome: continue
        previa(nome, luz=False, **v)
    if 'sem_fecha' not in args:
        for o in list(ctx.all_objects): bpy.data.objects.remove(o)
        bpy.data.collections.remove(ctx)
        fecha('area_garagem', col)
rodar(main)
