# Ferramentas próprias da área f070809 (fachadas 07 Madeira, 08 Têxtil, 09 Grãos).
# Só funções desta área: nada aqui altera kit.py nem lib.py.
import sys, os, math, random
sys.path.insert(0, r'C:\Users\Gabriel Caetano\Downloads\Claud Code\batcaverna\tools\blender\oficina')
from kit import *
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(AQUI, 'tex'); os.makedirs(TEX, exist_ok=True)


# ---------------- utilidades ----------------
def dec(o, ratio):
    """Reduz um modelo pesado do Poly Haven (o glTF aplica o modificador)."""
    m = o.modifiers.new('dec', 'DECIMATE'); m.ratio = ratio; return o

def suave(o, ang=40):
    for p in o.data.polygons: p.use_smooth = True
    try:
        o.data.set_sharp_from_angle(angle=math.radians(ang))
    except Exception:
        pass
    return o

def espessura(o, t=0.015):
    m = o.modifiers.new('esp', 'SOLIDIFY'); m.thickness = t; m.offset = 0; return o

def mat_img(nome, diff, pid_normal=None, rough=0.8, metal=0.0, nor_k=0.8, emiss=None):
    """Material com difusa própria (gerada aqui) e normal/rugosidade de uma textura escaneada do Poly Haven."""
    m = bpy.data.materials.get(nome)
    if m: return m
    m = bpy.data.materials.new(nome); m.use_nodes = True; n = m.node_tree.nodes; l = m.node_tree.links
    b = n['Principled BSDF']; b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if diff:
        d = n.new('ShaderNodeTexImage'); d.image = bpy.data.images.load(diff, check_existing=True); l.new(d.outputs['Color'], b.inputs['Base Color'])
    if pid_normal:
        t = ph_textura(pid_normal)
        if 'nor' in t:
            i = n.new('ShaderNodeTexImage'); i.image = bpy.data.images.load(t['nor'], check_existing=True); i.image.colorspace_settings.name = 'Non-Color'
            nm = n.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nor_k
            l.new(i.outputs['Color'], nm.inputs['Color']); l.new(nm.outputs['Normal'], b.inputs['Normal'])
    if emiss:
        b.inputs['Emission Color'].default_value = (*emiss[0], 1); b.inputs['Emission Strength'].default_value = emiss[1]
    return m

def ouro(nome, rgb=(1.0, 0.70, 0.28), rough=0.3, emiss=0.0):
    """Metal dourado com a micro-superfície (normal) de chapa escaneada do Poly Haven."""
    m = bpy.data.materials.get(nome)
    if m: return m
    m = mat_img(nome, None, 'metal_plate_02', rough=rough, metal=1.0, nor_k=0.35)
    b = m.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value = (*rgb, 1)
    if emiss: b.inputs['Emission Color'].default_value = (*rgb, 1); b.inputs['Emission Strength'].default_value = emiss
    return m

def salva_png(nome, arr):
    """arr: float HxWx3 (0..1). Grava em tex/<nome>.png e devolve o caminho."""
    p = os.path.join(TEX, nome + '.png')
    h, w, _ = arr.shape
    img = bpy.data.images.new(nome, w, h, alpha=False)
    rgba = np.ones((h, w, 4), dtype=np.float32); rgba[..., :3] = np.clip(arr, 0, 1)
    img.pixels.foreach_set(rgba[::-1].ravel())
    img.filepath_raw = p; img.file_format = 'PNG'; img.save()
    bpy.data.images.remove(img)
    return p

def tex_anel(seed=3, N=512):
    """Topo de tora: anéis de crescimento com ruído, rachaduras radiais e casca escura na borda."""
    rnd = np.random.default_rng(seed)
    y, x = np.mgrid[0:N, 0:N].astype(np.float32); cx = cy = N / 2
    dx, dy = (x - cx) / (N / 2), (y - cy) / (N / 2)
    r = np.sqrt(dx * dx + dy * dy); a = np.arctan2(dy, dx)
    wob = 0.025 * np.sin(a * 3 + 1.3) + 0.018 * np.sin(a * 7 + 0.4) + 0.01 * np.sin(a * 13)
    rr = r + wob
    an = 0.5 + 0.5 * np.sin(rr * 62 + 4 * np.sin(rr * 9))
    an = an ** 2
    base = np.array([0.74, 0.55, 0.34]); escuro = np.array([0.42, 0.26, 0.13])
    col = base[None, None] * (1 - an[..., None] * 0.55) + escuro[None, None] * an[..., None] * 0.55
    centro = np.clip(1 - r / 0.12, 0, 1)[..., None]; col = col * (1 - 0.25 * centro)
    # rachaduras radiais
    for k in range(5):
        ak = rnd.uniform(-math.pi, math.pi); w = rnd.uniform(0.01, 0.025); L = rnd.uniform(0.35, 0.8)
        da = np.abs(np.angle(np.exp(1j * (a - ak))))
        m = (da < w * (1 - r / L)) & (r < L) & (r > 0.05)
        col[m] *= 0.35
    # alburno mais claro e casca
    alb = ((r > 0.84) & (r < 0.93))[..., None]; col = np.where(alb, col * 1.12, col)
    casca = (r >= 0.93)[..., None]; col = np.where(casca, np.array([0.17, 0.11, 0.07])[None, None], col)
    grao = rnd.normal(0, 0.03, (N, N, 1)); col = col * (1 + grao)
    return salva_png('f07_topo_tora', col)

def tex_listras(nome, cores, seed=5, N=512, faixas=14):
    """Tecido listrado (urdidura colorida) para as cortinas: faixas verticais de largura variável e fio fino."""
    rnd = np.random.default_rng(seed)
    larg = rnd.uniform(0.5, 1.6, faixas); larg = larg / larg.sum() * N
    lin = np.zeros((N, 3), np.float32); x = 0
    for i, w in enumerate(larg):
        c = np.array(cores[i % len(cores)], np.float32); x1 = int(round(x + w)); lin[int(x):x1] = c; x = x1
    lin[int(x):] = np.array(cores[0])
    col = np.repeat(lin[None], N, 0)
    fio = 0.92 + 0.08 * (np.sin(np.arange(N) * 2.1)[None, :, None] * np.sin(np.arange(N) * 1.7)[:, None, None])
    return salva_png(nome, col * fio)


# ---------------- malhas ----------------
def viga(nome, col, p0, p1, w, h, mat, bev=0.02, tam=1.6, cima=(0, 0, 1)):
    """Peça de madeira de seção w×h entre dois pontos (com chanfro), UV na escala do mundo."""
    p0, p1 = Vector(p0), Vector(p1); d = p1 - p0; L = d.length
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector((L, w, h)), verts=bm.verts)
    if bev > 0: bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bev, segments=2, affect='EDGES', profile=0.5)
    up = Vector(cima)
    if abs(d.normalized().dot(up)) > 0.98: up = Vector((0, -1, 0))
    q = d.to_track_quat('X', 'Z') if up == Vector((0, 0, 1)) else d.to_track_quat('X', 'Y')
    M = Matrix.Translation((p0 + p1) / 2) @ q.to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
    o = objeto(nome, bm, col, mat); uv_mundo(o, tam); return o

def tubo(nome, col, pts, raio, mat, lados=6, raios=None):
    """Tubo ao longo de uma polilinha (moldura de transporte paralelo). UV: U ao redor, V ao longo."""
    pts = [Vector(p) for p in pts]; n = len(pts)
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new()
    t0 = (pts[1] - pts[0]).normalized(); ref = Vector((0, 0, 1)) if abs(t0.z) < 0.9 else Vector((1, 0, 0))
    nrm = t0.cross(ref).normalized(); rings = []; comp = [0.0]
    for i in range(1, n): comp.append(comp[-1] + (pts[i] - pts[i - 1]).length)
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
        nrm = (nrm - t * nrm.dot(t)).normalized(); bi = t.cross(nrm)
        rr = raios[i] if raios else raio
        rings.append([bm.verts.new(p + (nrm * math.cos(2 * math.pi * k / lados) + bi * math.sin(2 * math.pi * k / lados)) * rr) for k in range(lados)])
    for i in range(n - 1):
        for k in range(lados):
            k2 = (k + 1) % lados
            f = bm.faces.new((rings[i][k], rings[i][k2], rings[i + 1][k2], rings[i + 1][k]))
            for lp, (uu, vv) in zip(f.loops, ((k, i), (k + 1, i), (k + 1, i + 1), (k, i + 1))):
                lp[uvl].uv = (uu / lados, comp[vv] / max(comp[-1], 1e-6))
    return objeto(nome, bm, col, mat)

def fita(nome, col, pts, larg, mat, torce=0.0):
    """Fita plana ao longo de uma polilinha (largura `larg`), com torção opcional (voltas)."""
    pts = [Vector(p) for p in pts]; n = len(pts)
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); prev = None
    t0 = (pts[1] - pts[0]).normalized(); nrm = t0.cross(Vector((0, 0, 1)) if abs(t0.z) < 0.9 else Vector((1, 0, 0))).normalized()
    row = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
        nrm = (nrm - t * nrm.dot(t)).normalized(); bi = t.cross(nrm)
        a = torce * 2 * math.pi * i / (n - 1); s = nrm * math.cos(a) + bi * math.sin(a)
        row.append((bm.verts.new(p - s * larg / 2), bm.verts.new(p + s * larg / 2)))
    for i in range(n - 1):
        f = bm.faces.new((row[i][0], row[i][1], row[i + 1][1], row[i + 1][0]))
        for lp, uvv in zip(f.loops, ((0, i / (n - 1)), (1, i / (n - 1)), (1, (i + 1) / (n - 1)), (0, (i + 1) / (n - 1)))): lp[uvl].uv = uvv
    return objeto(nome, bm, col, mat)

def tora(nome, col, c, eixo, raio, comp, casca, topo, lados=18, seed=0, conico=0.92):
    """Tora: casca escaneada ao redor (UV cilíndrico em metros) e topos com anéis (UV centrado na imagem)."""
    rnd = random.Random(seed); c = Vector(c); e = Vector(eixo).normalized()
    ref = Vector((0, 0, 1)) if abs(e.z) < 0.9 else Vector((1, 0, 0))
    a1 = e.cross(ref).normalized(); a2 = e.cross(a1)
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); nseg = 4
    irr = [1 + rnd.uniform(-0.05, 0.05) for _ in range(lados)]
    rings = []
    for j in range(nseg + 1):
        s = j / nseg; rr = raio * (1 + (conico - 1) * s) * (1 + rnd.uniform(-0.02, 0.02))
        p0 = c + e * (comp * (s - 0.5))
        rings.append([bm.verts.new(p0 + (a1 * math.cos(2 * math.pi * k / lados) + a2 * math.sin(2 * math.pi * k / lados)) * rr * irr[k]) for k in range(lados)])
    circ = 2 * math.pi * raio
    for j in range(nseg):
        for k in range(lados):
            k2 = (k + 1) % lados
            f = bm.faces.new((rings[j][k], rings[j][k2], rings[j + 1][k2], rings[j + 1][k])); f.material_index = 0
            for lp, (uu, vv) in zip(f.loops, ((k, j), (k + 1, j), (k + 1, j + 1), (k, j + 1))):
                lp[uvl].uv = (uu / lados * circ / 1.2, vv / nseg * comp / 1.2)
            f.smooth = True
    for j, sgn in ((0, -1), (nseg, 1)):
        vs = rings[j] if sgn > 0 else list(reversed(rings[j]))
        f = bm.faces.new(vs); f.material_index = 1
        rr = raio * (1 + (conico - 1) * (j / nseg))
        ang = rnd.uniform(0, 6.28)
        for lp in f.loops:
            d = lp.vert.co - (c + e * (comp * (j / nseg - 0.5)))
            u, v = d.dot(a1) / rr, d.dot(a2) / rr
            cu, su = math.cos(ang), math.sin(ang)
            lp[uvl].uv = (0.5 + 0.47 * (u * cu - v * su), 0.5 + 0.47 * (u * su + v * cu))
    o = objeto(nome, bm, col, casca); o.data.materials.append(topo); return o

def banda_U(nome, col, rin, rout, y0, esp, mat, base=0.0, seg=36, tam=1.6, mola=None):
    """Moldura em U seguindo o vão (pernas retas + arco), seção rin..rout, de y0 até y0+esp."""
    sp = mola if mola is not None else SPRING
    def caminho(r):
        p = [(-r, base)]
        for i in range(seg + 1):
            a = math.pi - math.pi * i / seg; p.append((r * math.cos(a), sp + r * math.sin(a)))
        p.append((r, base)); return p
    A, B = caminho(rin), caminho(rout)
    bm = bmesh.new()
    def anel(y): return [bm.verts.new((x, y, z)) for x, z in A], [bm.verts.new((x, y, z)) for x, z in B]
    fa, fb = anel(y0); ta, tb = anel(y0 + esp)
    for i in range(len(A) - 1):
        bm.faces.new((fa[i], fb[i], fb[i + 1], fa[i + 1]))     # frente
        bm.faces.new((ta[i + 1], tb[i + 1], tb[i], ta[i]))     # fundo
        bm.faces.new((fa[i + 1], ta[i + 1], ta[i], fa[i]))     # face interna
        bm.faces.new((fb[i], tb[i], tb[i + 1], fb[i + 1]))     # face externa
    for i in (0, len(A) - 1):
        bm.faces.new((fa[i], ta[i], tb[i], fb[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = objeto(nome, bm, col, mat); uv_mundo(o, tam); return o


# ---------------- prévia (nada disto é exportado: nomes PREV_) ----------------
def cenario_previa(tunel=(1.0, 0.55, 0.25), forca_tunel=1.5):
    """Parede de rocha, piso da galeria, boca do túnel acesa e o medalhão do site (fantasma), só para conferir."""
    sc = bpy.context.scene
    rocha = material('PREV_rocha', 'dark_rock', tint=(0.5, 0.55, 0.65))
    bm = bmesh.new()
    pts = [(-14, 0), (-14, 14), (14, 14), (14, 0), (R + 0.1, 0), (R + 0.1, SPRING)]
    for i in range(1, 32): a = math.pi * i / 32; pts.append(((R + 0.1) * math.cos(a), SPRING + (R + 0.1) * math.sin(a)))
    pts += [(-(R + 0.1), SPRING), (-(R + 0.1), 0)]
    f = bm.faces.new([bm.verts.new((x, 0.05, z)) for x, z in pts])
    o = objeto('PREV_parede', bm, sc.collection, rocha); uv_mundo(o, 4)
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=1)
    bmesh.ops.scale(bm, vec=Vector((14, 3.5, 1)), verts=bm.verts); bmesh.ops.translate(bm, vec=Vector((0, -3.5, -0.01)), verts=bm.verts)
    objeto('PREV_piso', bm, sc.collection, cor('PREV_pisoM', (0.06, 0.07, 0.08), rough=0.35, metal=0.6))
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=1)
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'X'), verts=bm.verts)
    bmesh.ops.scale(bm, vec=Vector((4, 1, 4)), verts=bm.verts); bmesh.ops.translate(bm, vec=Vector((0, 6, 3)), verts=bm.verts)
    objeto('PREV_tunel', bm, sc.collection, cor('PREV_tunelM', tunel, emiss=forca_tunel))
    bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=32, radius=0.9)
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'X'), verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector((0, -1.05, 7.35)), verts=bm.verts)
    objeto('PREV_medalhao', bm, sc.collection, cor('PREV_medM', (0.05, 0.06, 0.08), rough=0.4, metal=0.5))
    bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=False, segments=32, radius=0.9)
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'X'), verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector((0, -1.06, 7.35)), verts=bm.verts)
    o = objeto('PREV_medaro', bm, sc.collection, cor('PREV_medouro', (0.8, 0.6, 0.3), metal=1, rough=0.3))
    m = o.modifiers.new('w', 'WIREFRAME'); m.thickness = 0.12

def luz_ponto(nome, loc, cor_l=(1, 0.6, 0.3), energia=150, raio=0.1):
    l = bpy.data.objects.new(nome, bpy.data.lights.new(nome, 'POINT')); l.data.energy = energia; l.data.color = cor_l
    l.data.shadow_soft_size = raio; l.location = loc; bpy.context.scene.collection.objects.link(l); return l

def cam_arte(phi, dist=17.0, cam=(0.0, 5.0, 30.0), piso=7.0, alvo_z=3.6):
    """Câmera no mesmo ângulo da arte 1930e6a9 (vista da entrada, eixo central) para o portal em φ (graus)."""
    f = math.radians(phi); px, pz = 38 * math.sin(f), -38 * math.cos(f)
    v = Vector((cam[0] - px, cam[1] - piso, cam[2] - pz))
    nx, nz = -math.sin(f), math.cos(f); rx, rz = math.cos(f), math.sin(f)
    lx = v.x * rx + v.z * rz; ly = -(v.x * nx + v.z * nz); lz = v.y
    k = dist / math.hypot(lx, ly)
    return (lx * k, ly * k, alvo_z + lz * k), (0, 0, alvo_z)

def checa_vao(col, folga=0.02):
    """Confere se algum vértice invade o vão livre do portal (y entre -1.3 e 0.3)."""
    dg = bpy.context.evaluated_depsgraph_get(); ruins = []
    for o in col.all_objects:
        if o.type != 'MESH': continue
        me = o.evaluated_get(dg).to_mesh(); mw = o.matrix_world; n = 0
        for v in me.vertices:
            p = mw @ v.co
            if -1.3 < p.y < 0.6 and abs(p.x) < R - folga and 0.01 < p.z:
                lim = SPRING + math.sqrt(max(0, R * R - p.x * p.x)) if abs(p.x) < R else SPRING
                if p.z < lim - folga: n += 1
        o.evaluated_get(dg).to_mesh_clear()
        if n: ruins.append((o.name, n))
    say('invasao do vao:', ruins if ruins else 'nenhuma')
    bb = [1e9, -1e9, 1e9, -1e9, 1e9, -1e9]
    for o in col.all_objects:
        if o.type != 'MESH': continue
        me = o.evaluated_get(dg).to_mesh(); mw = o.matrix_world
        for v in me.vertices:
            p = mw @ v.co
            bb = [min(bb[0], p.x), max(bb[1], p.x), min(bb[2], p.y), max(bb[3], p.y), min(bb[4], p.z), max(bb[5], p.z)]
        o.evaluated_get(dg).to_mesh_clear()
    say('caixa x[%.2f,%.2f] y[%.2f,%.2f] z[%.2f,%.2f]' % tuple(bb))
    return ruins


def junta(col, prefixo):
    """Aplica modificadores e junta as peças por conjunto de materiais (menos malhas = menos chamadas no site)."""
    objs = [o for o in col.objects if o.type == 'MESH']
    for o in bpy.context.selected_objects: o.select_set(False)
    for o in objs:
        if o.modifiers:
            bpy.context.view_layer.objects.active = o
            for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
    grupos = {}
    for o in objs:
        chave = tuple(sorted(s.material.name for s in o.material_slots if s.material))
        grupos.setdefault(chave, []).append(o)
    for i, (chave, gs) in enumerate(grupos.items()):
        for o in bpy.context.selected_objects: o.select_set(False)
        for o in gs: o.select_set(True)
        bpy.context.view_layer.objects.active = gs[0]
        if len(gs) > 1: bpy.ops.object.join()
        nome = (chave[0] if chave else 'sem_mat').replace(prefixo + '_', '')
        bpy.context.active_object.name = f'{prefixo}_{nome}'
    say('malhas apos juntar', len([o for o in col.objects if o.type == 'MESH']))


def limites(col, alt=7.6, meia=6.2, frente=-1.3):
    """Lista as peças que saem do nicho (antes de juntar), para corrigir na origem."""
    dg = bpy.context.evaluated_depsgraph_get(); fora = []
    for o in col.all_objects:
        if o.type != 'MESH': continue
        me = o.evaluated_get(dg).to_mesh(); mw = o.matrix_world; e = [0, 0, 0]
        for v in me.vertices:
            p = mw @ v.co
            e[0] = max(e[0], abs(p.x) - meia); e[1] = max(e[1], frente - p.y); e[2] = max(e[2], p.z - alt)
        o.evaluated_get(dg).to_mesh_clear()
        if max(e) > 0.005: fora.append((o.name, [round(x, 2) for x in e]))
    say('fora do nicho (x, y, z):', fora if fora else 'nada')
    return fora
