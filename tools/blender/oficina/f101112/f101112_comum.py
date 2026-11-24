"""Ferramentas comuns das fachadas 10, 11 e 12 (só desta área; o kit fica intocado).

Referencial do PORTAL: boca na origem, chão em z=0, salão para -Y. Vão livre: largura 6.4, altura 6.2,
arco de raio 3.2 com arranque em 3.0 (o 12 é retangular). Largura <= 12.4, y >= -1.3, z <= 7.6.
O medalhão numerado do site fica em (0, -1.05, 7.35), raio ~1.0: nada na frente dele.
"""
import sys, os, math, random, json
sys.path.insert(0, r'C:\Users\Gabriel Caetano\Downloads\Claud Code\batcaverna\tools\blender\oficina')
from kit import *
import kit as _kit

AQUI = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(AQUI, 'tex')

# ---------------- modelos Poly Haven: uma peça escolhida (sem juntar LODs) ----------------
_libs = {}
def _carrega(pid, res='1k'):
    if pid in _libs: return _libs[pid]
    meta_p = os.path.join(PHM, pid, 'meta.json')
    _kit._baixa(f'https://api.polyhaven.com/files/{pid}', meta_p)
    meta = json.load(open(meta_p, encoding='utf-8'))
    b = meta['blend'][res]['blend']
    path = _kit._baixa(b['url'], os.path.join(PHM, pid, os.path.basename(b['url'].split('?')[0])))
    for rel, inc in (b.get('include') or {}).items(): _kit._baixa(inc['url'], os.path.join(PHM, pid, rel))
    with bpy.data.libraries.load(path, link=False) as (src, dst): dst.objects = [n for n in src.objects]
    _libs[pid] = {o.name: o for o in dst.objects if o is not None}
    return _libs[pid]

def parte(pid, obj, col, nome, x=0, y=0, z=0, rz=0.0, rx=0.0, altura=None, larg=None, escala=None):
    """Cópia de UM objeto de um asset Poly Haven (ex.: 'shrub_02', 'shrub_02_b_LOD2'), base em z, centrado em x,y."""
    objs = _carrega(pid)
    nomes = [obj] if isinstance(obj, str) else list(obj)
    bm = bmesh.new(); mats = []
    for nm in nomes:
        src = objs[nm]; tmp = src.data.copy()
        m = src.matrix_world.copy(); m.translation = src.matrix_world.translation if len(nomes) > 1 else Vector((0, 0, 0))
        tmp.transform(m)
        base = len(mats)
        for mt in tmp.materials:
            if mt not in mats: mats.append(mt)
        remap = [mats.index(mt) for mt in tmp.materials]
        for p in tmp.polygons: p.material_index = remap[p.material_index] if remap else 0
        bm.from_mesh(tmp); bpy.data.meshes.remove(tmp)
    me = bpy.data.meshes.new(nome); bm.to_mesh(me); bm.free()
    for mt in mats: me.materials.append(mt)
    o = bpy.data.objects.new(nome, me); col.objects.link(o)
    vs = [v.co for v in me.vertices]
    cx = (min(v.x for v in vs) + max(v.x for v in vs)) / 2; cy = (min(v.y for v in vs) + max(v.y for v in vs)) / 2; mz = min(v.z for v in vs)
    me.transform(Matrix.Translation((-cx, -cy, -mz)))
    vs = [v.co for v in me.vertices]
    dz = max(v.z for v in vs) - min(v.z for v in vs)
    dxy = max(max(v.x for v in vs) - min(v.x for v in vs), max(v.y for v in vs) - min(v.y for v in vs))
    s = escala or (altura / dz if altura else (larg / dxy if larg else 1.0))
    o.scale = (s, s, s); o.rotation_euler = (rx, 0, rz); o.location = (x, y, z)
    bpy.context.view_layer.update()
    return o

def assenta(o, z=0.0):
    """Depois de girar, recoloca a peça com a base no chão."""
    bpy.context.view_layer.update()
    mz = min((o.matrix_world @ v.co).z for v in o.data.vertices); o.location.z += z - mz
    bpy.context.view_layer.update(); return o

def leve(o, razao):
    """Reduz a malha de um modelo Poly Haven (decimate aplicado na exportação)."""
    m = o.modifiers.new('leve', 'DECIMATE'); m.ratio = razao; return o

def lanterna_leve(col, nome, x, y, z, altura=0.75, forca=8.0, razao=0.07):
    """Lantern_01 (34 mil triângulos) reduzida para ~2.4 mil, vidro trocado por chama."""
    return leve(lanterna(col, nome, x, y, z, altura=altura, forca=forca), razao)

# ---------------- conferência do vão e dos limites ----------------
def dentro_vao(x, z, rect=False, folga=0.04):
    if z < -0.01 or abs(x) >= W / 2 + folga: return False
    if rect: return z < H + folga
    if z <= SPRING: return True
    return x * x + (z - SPRING) ** 2 < (R + folga) ** 2

def confere(col, rect=False, zmax=7.6):
    dg = bpy.context.evaluated_depsgraph_get(); ruins = {}; bb = [1e9, -1e9, 1e9, -1e9, 1e9, -1e9]; med = {}
    for o in col.all_objects:
        if o.type != 'MESH': continue
        ev = o.evaluated_get(dg); m = ev.to_mesh(); mw = o.matrix_world
        for v in m.vertices:
            p = mw @ v.co
            bb[0] = min(bb[0], p.x); bb[1] = max(bb[1], p.x); bb[2] = min(bb[2], p.y); bb[3] = max(bb[3], p.y); bb[4] = min(bb[4], p.z); bb[5] = max(bb[5], p.z)
            if p.y < 2.0 and dentro_vao(p.x, p.z, rect): ruins[o.name] = ruins.get(o.name, 0) + 1
            if p.y < -1.0 and p.x * p.x + (p.z - 7.35) ** 2 < 1.0: med[o.name] = med.get(o.name, 0) + 1
        ev.to_mesh_clear()
    pesos = []
    for o in col.all_objects:
        if o.type == 'MESH':
            mm = o.evaluated_get(dg).to_mesh(); pesos.append((sum(len(p.vertices) - 2 for p in mm.polygons), o.name)); o.evaluated_get(dg).to_mesh_clear()
    pesos.sort(reverse=True); say('TRIS total', sum(p[0] for p in pesos), 'maiores', pesos[:8])
    say('MATERIAIS', sorted({s.material.name for o in col.all_objects if o.type == 'MESH' for s in o.material_slots if s.material}))
    say('LIMITES x %.2f..%.2f  y %.2f..%.2f  z %.2f..%.2f' % tuple(bb))
    if bb[0] < -6.205 or bb[1] > 6.205 or bb[2] < -1.305 or bb[5] > zmax + 0.005: say('!! FORA DO LIMITE')
    fora = []
    for o in col.all_objects:
        if o.type != 'MESH': continue
        b = [o.matrix_world @ Vector(c) for c in o.bound_box]
        if min(v.x for v in b) < -6.205 or max(v.x for v in b) > 6.205 or min(v.y for v in b) < -1.305 or max(v.z for v in b) > zmax + 0.005 or min(v.z for v in b) < -0.03: fora.append(o.name)
    if fora: say('objetos fora (bbox):', fora)
    say('VAO invadido por:', ruins if ruins else 'nada')
    say('na frente do medalhao:', med if med else 'nada')
    return ruins

# ---------------- malhas ----------------
def tubo(nome, col, pts, raios, mat, lados=8, tam=1.0, fechar=True):
    """Tubo ao longo de uma polilinha 3D com raio por ponto (cipó, chifre, brasa, corrimão)."""
    pts = [Vector(p) for p in pts]; n = len(pts)
    if not hasattr(raios, '__len__'): raios = [raios] * n
    bm = bmesh.new(); aneis = []; up = Vector((0, 0, 1))
    prev_side = None
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
        side = t.cross(up) if abs(t.dot(up)) < 0.95 else t.cross(Vector((0, 1, 0)))
        side.normalize()
        if prev_side is not None and side.dot(prev_side) < 0: side = -side
        prev_side = side
        b2 = side.cross(t).normalized()
        aneis.append([bm.verts.new(p + raios[i] * (math.cos(2 * math.pi * k / lados) * side + math.sin(2 * math.pi * k / lados) * b2)) for k in range(lados)])
    uv = bm.loops.layers.uv.verify(); L = [0.0]
    for i in range(1, n): L.append(L[-1] + (pts[i] - pts[i - 1]).length)
    for i in range(n - 1):
        for k in range(lados):
            k2 = (k + 1) % lados
            f = bm.faces.new((aneis[i][k], aneis[i][k2], aneis[i + 1][k2], aneis[i + 1][k]))
            for lp, (uu, vv) in zip(f.loops, ((k, L[i]), (k + 1, L[i]), (k + 1, L[i + 1]), (k, L[i + 1]))):
                lp[uv].uv = (uu / lados * 0.5, vv / tam)
    if fechar:
        for a in (aneis[0], aneis[-1]):
            if len(a) >= 3: bm.faces.new(a if a is aneis[-1] else list(reversed(a)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return objeto(nome, bm, col, mat)

def prisma(nome, col, contorno, y0, y1, mat, bev=0.0, tam=1.5):
    """Contorno (x, z) extrudado em Y de y0 a y1 (peça com volume, sem booleano)."""
    bm = bmesh.new(); vs = [bm.verts.new((x, y0, z)) for x, z in contorno]
    f = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f]); nv = [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=Vector((0, y1 - y0, 0)), verts=nv)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bev > 0:
        try: bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bev, segments=2, affect='EDGES', clamp_overlap=True)
        except TypeError: bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bev, segments=2, affect='EDGES')
    o = objeto(nome, bm, col, mat); bpy.context.view_layer.update(); uv_mundo(o, tam); return o

def viga(nome, col, a, b, larg, alt, mat, bev=0.025, tam=1.6, rolo=0.0):
    """Viga de seção larg x alt entre os pontos a e b (madeira com chanfro)."""
    a = Vector(a); b = Vector(b); d = b - a; L = d.length
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector((larg, alt, L)), verts=bm.verts)
    if bev > 0: bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bev, segments=2, affect='EDGES', profile=0.5)
    o = objeto(nome, bm, col, mat)
    q = d.normalized().to_track_quat('Z', 'Y'); o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = q @ Matrix.Rotation(rolo, 4, 'Z').to_quaternion()
    o.location = (a + b) / 2; bpy.context.view_layer.update(); uv_mundo(o, tam); return o

def setor(nome, col, r0, r1, a0, a1, y0, y1, mat, cz=None, n=16, bev=0.02, tam=1.6):
    """Setor de anel (peça curva) no plano XZ, centro (0, cz), ângulos em graus."""
    cz = SPRING if cz is None else cz
    pts = [(r1 * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cz + r1 * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]
    pts += [(r0 * math.cos(math.radians(a1 - (a1 - a0) * i / n)), cz + r0 * math.sin(math.radians(a1 - (a1 - a0) * i / n))) for i in range(n + 1)]
    return prisma(nome, col, pts, y0, y1, mat, bev=bev, tam=tam)

def trechos(pts, ok, minimo=3):
    """Quebra uma polilinha em trechos contínuos de pontos válidos (nenhuma aresta atravessa o vão)."""
    runs, cur = [], []
    for p in pts:
        if ok(p): cur.append(p)
        else:
            if len(cur) >= minimo: runs.append(cur)
            cur = []
    if len(cur) >= minimo: runs.append(cur)
    return runs

def junta(objs, nome):
    """Une objetos (mesmo material ou não) em um só, para economizar chamadas de desenho."""
    objs = [o for o in objs if o is not None]
    for o in bpy.context.selected_objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join(); o = bpy.context.active_object; o.name = nome; return o

def agrupa(col, nome):
    """Aplica modificadores e une tudo da coleção numa malha só (uma primitiva por material no glTF)."""
    objs = [o for o in col.all_objects if o.type == 'MESH']
    for o in bpy.context.selected_objects: o.select_set(False)
    for o in objs:
        o.select_set(True); bpy.context.view_layer.objects.active = o
        for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
        o.select_set(False)
    for o in objs:
        if o.parent:
            mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    o = junta(objs, nome); return o

def mat_folhas(nome):
    """Folhas escaneadas (urtiga Poly Haven, recortadas num atlas 4x2) com recorte alfa (glTF MASK)."""
    m = bpy.data.materials.get(nome)
    if m: return m
    m = bpy.data.materials.new(nome); m.use_nodes = True
    nt = m.node_tree; n = nt.nodes; l = nt.links; b = n['Principled BSDF']
    img = n.new('ShaderNodeTexImage'); img.image = bpy.data.images.load(os.path.join(TEX, 'f11_folhas.png'), check_existing=True)
    l.new(img.outputs['Color'], b.inputs['Base Color'])
    lt = n.new('ShaderNodeMath'); lt.operation = 'LESS_THAN'; lt.inputs[1].default_value = 0.5
    sb = n.new('ShaderNodeMath'); sb.operation = 'SUBTRACT'; sb.inputs[0].default_value = 1.0
    l.new(img.outputs['Alpha'], lt.inputs[0]); l.new(lt.outputs[0], sb.inputs[1]); l.new(sb.outputs[0], b.inputs['Alpha'])
    b.inputs['Roughness'].default_value = 0.6
    try: b.inputs['Specular IOR Level'].default_value = 0.25
    except KeyError: pass
    try: b.inputs['Subsurface Weight'].default_value = 0.0
    except KeyError: pass
    for attr, val in (('blend_method', 'CLIP'), ('surface_render_method', 'DITHERED'), ('use_backface_culling', False)):
        try: setattr(m, attr, val)
        except Exception: pass
    return m

def folhas(nome, col, lista, mat):
    """Cartões de folha (4 triângulos, nervura dobrada). lista: (pos, normal, tamanho, giro, celula)."""
    bm = bmesh.new(); uv = bm.loops.layers.uv.verify()
    for pos, nrm, s, giro, cel in lista:
        p = Vector(pos); nz = Vector(nrm).normalized()
        up = Vector((0, 0, 1)) if abs(nz.z) < 0.9 else Vector((0, 1, 0))
        ax = up.cross(nz).normalized(); ay = nz.cross(ax).normalized()
        rot = Matrix.Rotation(giro, 3, nz); ax = rot @ ax; ay = rot @ ay
        # base (cabo) em p; folha cresce em +ay
        cu = (cel % 4) * 0.25; cv = 1.0 - (cel // 4 + 1) * 0.5
        dobra = nz * s * 0.12
        P = [p - ax * s * 0.5, p + ax * s * 0.5, p + ax * s * 0.5 + ay * s, p - ax * s * 0.5 + ay * s, p + dobra, p + ay * s + dobra]
        U = [(cu, cv), (cu + 0.25, cv), (cu + 0.25, cv + 0.5), (cu, cv + 0.5), (cu + 0.125, cv), (cu + 0.125, cv + 0.5)]
        vs = [bm.verts.new(q) for q in P]
        for tri in ((0, 4, 5, 3), (4, 1, 2, 5)):
            f = bm.faces.new([vs[i] for i in tri])
            for lp, i in zip(f.loops, tri): lp[uv].uv = U[i]
    return objeto(nome, bm, col, mat)

def pedra_bruta(bm, c, r, rnd, sub=1, achata=1.0):
    """Pedaço irregular (carvão, cascalho) adicionado a um bmesh existente."""
    g = bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    sx, sy, sz = rnd.uniform(0.7, 1.3), rnd.uniform(0.7, 1.3), rnd.uniform(0.6, 1.0) * achata
    for v in g['verts']:
        v.co = Vector((v.co.x * sx, v.co.y * sy, v.co.z * sz)) * rnd.uniform(0.82, 1.12) + Vector(c)
    return g['verts']

# ---------------- prévia: fundo de caverna só para conferência (PREV_ não é exportado) ----------------
def fundo(rect=False):
    col = bpy.context.scene.collection
    rocha = material('PREV_rocha', 'dark_rock', tint=(0.55, 0.6, 0.7))
    escuro = cor('PREV_breu', (0.01, 0.012, 0.016), rough=0.9)
    # paredão atrás da fachada com a boca do túnel
    bm = bmesh.new()
    pts = [(-16, 0), (-16, 14), (16, 14), (16, 0), (W / 2, 0)]
    if rect: pts += [(W / 2, H), (-W / 2, H)]
    else:
        pts += [(R, SPRING)] + [(R * math.cos(math.pi * i / 24), SPRING + R * math.sin(math.pi * i / 24)) for i in range(1, 24)] + [(-R, SPRING)]
    pts += [(-W / 2, 0)]
    vs = [bm.verts.new((x, 0.05, z)) for x, z in pts]; bm.faces.new(vs)
    o = objeto('PREV_paredao', bm, col, rocha); bpy.context.view_layer.update(); uv_mundo(o, 4.0)
    # túnel escuro e piso da galeria
    caixa('PREV_tunel', col, (W + 0.4, 0.2, H + 0.4), (0, 9.0, H / 2), escuro, bev=0)
    caixa('PREV_piso', col, (34, 7, 0.3), (0, -2.5, -0.15), material('PREV_chapa', 'metal_plate', tint=(0.35, 0.38, 0.42)), bev=0, tam=2.0)
    for nm, x in (('PREV_tunelE', -W / 2 - 0.1), ('PREV_tunelD', W / 2 + 0.1)):
        caixa(nm, col, (0.2, 9, H), (x, 4.6, H / 2), rocha, bev=0)
    caixa('PREV_tunelT', col, (W + 0.4, 9, 0.2), (0, 4.6, H + 0.1), rocha, bev=0)
    caixa('PREV_tunelP', col, (W, 9, 0.2), (0, 4.6, -0.1), rocha, bev=0)
    # medalhão do site (só para ver a composição)
    md = cor('PREV_medalhao', (0.05, 0.06, 0.08), rough=0.4)
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.95, depth=0.12, location=(0, -1.05, 7.35), rotation=(math.pi / 2, 0, 0))
    m = bpy.context.active_object; m.name = 'PREV_medalhao'; m.data.materials.append(md)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.9, minor_radius=0.08, location=(0, -1.12, 7.35), rotation=(math.pi / 2, 0, 0))
    t = bpy.context.active_object; t.name = 'PREV_medalhaoAro'; t.data.materials.append(cor('PREV_ouro', (0.85, 0.62, 0.25), rough=0.3, metal=1.0))

def luzes(quente=(1.0, 0.7, 0.4), forca=1.0):
    sc = bpy.context.scene
    w = sc.world or bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.012, 0.02, 0.035, 1)
    try: sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    except Exception: pass
    def area(nm, loc, en, cor_, tam):
        a = bpy.data.objects.new(nm, bpy.data.lights.new(nm, 'AREA')); a.data.energy = en * forca; a.data.size = tam; a.data.color = cor_
        a.location = loc; sc.collection.objects.link(a)
        a.rotation_euler = (Vector((0, 0, 3.5)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    area('PREV_chave', (-5, -12, 9), 2600, (0.75, 0.85, 1.0), 8)     # luz fria do salão
    area('PREV_quente', (3, -6, 3), 900, quente, 4)                  # luz quente do portal/lanternas
    area('PREV_tunelL', (0, 3, 3), 600, quente, 4)                   # brilho do túnel aceso
    s = bpy.data.objects.new('PREV_sol', bpy.data.lights.new('PREV_sol', 'SUN')); s.data.energy = 0.6; s.data.color = (0.6, 0.75, 1.0)
    s.rotation_euler = Euler((math.radians(60), 0, math.radians(-20))); sc.collection.objects.link(s)

def cam_arte(phi, cam3=(0.0, 11.0, 33.0), y_portal=7.0, r=38.0):
    """Câmera da arte 1930e6a9 (da entrada, eixo central) levada para o referencial do portal."""
    p = Vector((r * math.sin(math.radians(phi)), y_portal, -r * math.cos(math.radians(phi))))
    d = Vector(cam3) - p; f = math.radians(phi)
    lx = d.x * math.cos(f) + d.z * math.sin(f); lz = -d.x * math.sin(f) + d.z * math.cos(f)
    return (lx, -lz, d.y)

def previas(nome, phi, rect=False):
    luzes()
    previa(nome + '_frente', cam=(0.6, -15.5, 3.6), alvo=(0, 0, 3.6), lente=30, luz=False)
    previa(nome + '_perto', cam=(-4.5, -8.5, 2.2), alvo=(0.5, 0, 3.4), lente=26, luz=False)
    c = cam_arte(phi)
    say('camera da arte', tuple(round(v, 2) for v in c))
    dist = Vector(c).length
    previa(nome + '_arte', cam=c, alvo=(0, 0, 3.6), lente=36 * dist / 15.0, luz=False)
