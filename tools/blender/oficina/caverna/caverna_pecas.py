"""Peças da área CAVERNA (referencial MUNDO, Blender Z para cima).
Polar: φ a partir de +Y (Blender) positivo para +X  ->  P(r, φ, z) = (r·sinφ, r·cosφ, z).
Módulo importado por caverna_main.py; não exporta nada sozinho.
"""
import os, math, random
import numpy as np
import bpy, bmesh
from mathutils import Vector, Matrix, Euler, noise
from kit import ph_modelo, ligar, say, uv_mundo, objeto, cor
import lib

AQUI = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(AQUI, 'tex'); os.makedirs(TEX, exist_ok=True)
CACHE = os.path.join(AQUI, 'cache'); os.makedirs(CACHE, exist_ok=True)
CACHE_BLEND = os.path.join(CACHE, 'caverna_rochas_v3.blend')

D = math.pi / 180
def P(r, phi, z=0.0):
    return Vector((r * math.sin(phi * D), r * math.cos(phi * D), z))

def teto(r):
    """Altura nominal da abóbada (Blender z) no raio r: esfera 64 achatada 0.78, +4."""
    return 4 + 0.78 * math.sqrt(max(0.0, 64 * 64 - r * r))

PORTAIS = [-52, -33, -14, 14, 33, 52]
MEIA_FACHADA = 6.2 / 38 / D  # ±6.2 m de arco em r=38 -> ~9.35°

def em_fachada(phi, z, folga=0.4):
    """True se (φ, z) cai no retângulo livre de alguma fachada (andar de baixo 7–14.6, de cima 15–24.5, +folga)."""
    for a in PORTAIS:
        if abs(phi - a) < MEIA_FACHADA + folga / 38 / D and 6.4 - folga < z < 25.0 + folga: return True
    return False

# ------------------------------------------------------------------ texturas recoloridas
def _px(img):
    w, h = img.size; a = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(a); return a.reshape(-1, 4), w, h

def _salva(nome, a, w, h, dst):
    im = bpy.data.images.new(nome, w, h); im.pixels.foreach_set(a.ravel()); im.filepath_raw = dst
    im.file_format = 'JPEG'; bpy.context.scene.render.image_settings.quality = 90; im.save(); bpy.data.images.remove(im)

ARDOSIA = np.array([0.125, 0.14, 0.17], np.float32)  # sRGB da rocha da arte (ardósia azulada, molhada)

def recolore_diff(src, dst, musgo=0.0, base=ARDOSIA, contraste=1.25):
    """Rocha escaneada -> ardósia azul-escura (mantém o relevo de luminância); verde do musgo preservado."""
    if os.path.exists(dst): return dst
    im = bpy.data.images.load(src); a, w, h = _px(im); bpy.data.images.remove(im)
    rgb = a[:, :3]; L = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
    Ln = np.clip(L / (np.median(L) + 1e-4), 0, 2.2) ** contraste
    rocha = np.clip(base[None, :] * Ln[:, None], 0, 1)
    if musgo > 0:
        g = np.clip((rgb[:, 1] - rgb[:, 2]) * 5.0, 0, 1) * (rgb[:, 1] >= rgb[:, 0] * 0.85) * musgo
        verde = np.clip(rgb * np.array([0.4, 0.78, 0.32], np.float32), 0, 1)
        rocha = rocha * (1 - g[:, None]) + verde * g[:, None]
    a[:, :3] = rocha; _salva(os.path.basename(dst), a, w, h, dst); return dst

def molhada(src, dst, k=0.55, soma=0.06):
    """Rugosidade menor (rocha molhada brilha como na arte)."""
    if os.path.exists(dst): return dst
    im = bpy.data.images.load(src); a, w, h = _px(im); bpy.data.images.remove(im)
    a[:, :3] = np.clip(a[:, :3] * k + soma, 0, 1); _salva(os.path.basename(dst), a, w, h, dst); return dst

def material_tex(nome, diff, nor=None, rough=None, nor_k=1.0, emiss=None):
    m = bpy.data.materials.get(nome)
    if m: return m
    m = bpy.data.materials.new(nome); m.use_nodes = True; n = m.node_tree.nodes; l = m.node_tree.links
    b = n['Principled BSDF']
    def img(p, cs):
        t = n.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(p, check_existing=True); t.image.colorspace_settings.name = cs; return t
    l.new(img(diff, 'sRGB').outputs['Color'], b.inputs['Base Color'])
    if rough: l.new(img(rough, 'Non-Color').outputs['Color'], b.inputs['Roughness'])
    if nor:
        nm = n.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nor_k
        l.new(img(nor, 'Non-Color').outputs['Color'], nm.inputs['Color']); l.new(nm.outputs['Normal'], b.inputs['Normal'])
    if emiss:
        b.inputs['Emission Color'].default_value = (*emiss[0], 1); b.inputs['Emission Strength'].default_value = emiss[1]
    return m

def material_ph_ardosia(nome, pid, musgo=0.0, base=ARDOSIA, nor_k=1.2, molhar=True):
    t = lib.ph_textura(pid)
    tag = f'{pid}_m{int(musgo * 100)}_{int(base[0] * 100)}_v2'
    d = recolore_diff(t['diff'], os.path.join(TEX, f'{tag}_diff.jpg'), musgo=musgo, base=np.array(base, np.float32))
    r = (molhada(t['rough'], os.path.join(TEX, f'{pid}_rough_molhada.jpg')) if molhar else t['rough']) if 'rough' in t else None
    return material_tex(nome, d, t.get('nor'), r, nor_k=nor_k)

# ------------------------------------------------------------------ modelos Poly Haven reduzidos (cache)
ROCHAS = {  # id: (triângulos alvo, musgo preservado)
    'rock_face_01': (1600, 0.35), 'rock_face_02': (1600, 0.6), 'boulder_01': (1600, 0.0),
    'namaqualand_boulder_03': (1600, 0.0), 'namaqualand_boulder_02': (900, 0.0), 'rock_07': (800, 0.0),
    'rock_09': (800, 0.0), 'rock_moss_set_01': (2200, 0.9), 'moss_01': (520, 1.0),
}

def _recolore_material_do_modelo(o, pid, musgo):
    for sl in o.material_slots:
        m = sl.material
        if not m or not m.use_nodes: continue
        for nd in m.node_tree.nodes:
            if nd.type != 'TEX_IMAGE' or not nd.image: continue
            p = bpy.path.abspath(nd.image.filepath); nm = os.path.basename(p).lower()
            if not os.path.exists(p): continue
            if 'diff' in nm or 'col' in nm:
                if pid == 'moss_01':  # musgo fica verde, só escurece e esfria um pouco
                    dst = os.path.join(TEX, f'{pid}_diff_cav3.jpg')
                    if not os.path.exists(dst):
                        im = bpy.data.images.load(p); a, w, h = _px(im); bpy.data.images.remove(im)
                        a[:, :3] = np.clip(a[:, :3] * np.array([0.62, 0.8, 0.62], np.float32), 0, 1); _salva('x', a, w, h, dst)
                else:
                    dst = recolore_diff(p, os.path.join(TEX, f'{pid}_diff_cav3.jpg'), musgo=musgo)
                nd.image = bpy.data.images.load(dst, check_existing=True); nd.image.colorspace_settings.name = 'sRGB'
            elif 'rough' in nm:
                dst = molhada(p, os.path.join(TEX, f'{pid}_rough_cav.jpg'))
                nd.image = bpy.data.images.load(dst, check_existing=True); nd.image.colorspace_settings.name = 'Non-Color'
        m.name = f'CAV_{pid}'

def prepara_rochas():
    """Baixa, reduz e recolore os modelos uma vez; guarda num .blend de cache. Devolve {pid: objeto fora da cena}."""
    out = {}
    if os.path.exists(CACHE_BLEND):
        with bpy.data.libraries.load(CACHE_BLEND, link=False) as (src, dst):
            dst.objects = [n for n in src.objects if n.startswith('DEC_')]
        for o in dst.objects:
            if o: out[o.name[4:]] = o
        if all(k in out for k in ROCHAS): return out
        for o in out.values(): bpy.data.objects.remove(o)
        out = {}
    for pid, (alvo, musgo) in ROCHAS.items():
        o = ph_modelo(pid)
        t = sum(len(p.vertices) - 2 for p in o.data.polygons)
        if t > alvo:
            dm = o.modifiers.new('reduz', 'DECIMATE'); dm.ratio = alvo / t; dm.use_collapse_triangulate = True
            bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='reduz')
        for p in o.data.polygons: p.use_smooth = True
        _recolore_material_do_modelo(o, pid, musgo)
        o.name = 'DEC_' + pid; o.data.name = 'DEC_' + pid
        bpy.context.scene.collection.objects.unlink(o)
        out[pid] = o
        say('reduzido', pid, sum(len(p.vertices) - 2 for p in o.data.polygons), 'tris', tuple(round(v, 2) for v in o.dimensions))
    bpy.data.libraries.write(CACHE_BLEND, set(out.values()), fake_user=True)
    return out

# ------------------------------------------------------------------ instâncias (malha compartilhada)
def inst(src, col, nome, loc, rot=(0, 0, 0), esc=1.0):
    o = bpy.data.objects.new(nome, src.data); col.objects.link(o)
    o.location = loc; o.rotation_euler = rot
    o.scale = (esc, esc, esc) if isinstance(esc, (int, float)) else esc
    return o

# ------------------------------------------------------------------ estalactites
def _estalactite_bm(bm, comp, raio, lados, aneis, seed, off=(0, 0, 0), flutes=5, curva=0.12, raiz=5.0):
    rnd = random.Random(seed)
    ph = rnd.uniform(0, 6.28); bx = rnd.uniform(-1, 1) * curva * comp; by = rnd.uniform(-1, 1) * curva * comp
    ox, oy, oz = off; rings = []
    # anéis mais densos perto da ponta (onde a silhueta afina)
    ts = [i / aneis for i in range(aneis + 1)]
    for i, t in enumerate(ts):
        z = raiz - (t ** 0.85) * (raiz + comp)
        s = max(0.0, -z / comp)
        if z > 0: rr = raio * (1.45 + 0.3 * z / raiz)
        else: rr = raio * (1 - s) ** 1.55 * (1 + 0.45 * math.exp(-s * 7)) * (1 + 0.07 * math.sin(s * comp * 1.9 + ph))
        rr = max(rr, raio * 0.02)
        cx, cy = bx * s * s, by * s * s
        ring = []
        for k in range(lados):
            a = 2 * math.pi * k / lados
            nz = noise.noise(Vector((math.cos(a) * 1.4 + seed * 3.1, math.sin(a) * 1.4, z * 0.45)))
            fl = 1 + 0.17 * math.sin(flutes * a + ph + s * 2.5) + 0.22 * nz
            ring.append(bm.verts.new((ox + cx + rr * fl * math.cos(a), oy + cy + rr * fl * math.sin(a), oz + z)))
        rings.append(ring)
    for i in range(len(rings) - 1):
        a, b = rings[i], rings[i + 1]
        for k in range(lados):
            bm.faces.new((a[k], a[(k + 1) % lados], b[(k + 1) % lados], b[k]))
    ponta = bm.verts.new((ox + bx, oy + by, oz - comp - raio * 0.08))
    last = rings[-1]
    for k in range(lados): bm.faces.new((last[k], last[(k + 1) % lados], ponta))
    bm.faces.new(list(reversed(rings[0])))

def estalactite(nome, partes, mat, lados=10, aneis=15):
    """partes = [(comp, raio, seed, (ox, oy, oz))...]: um ou vários cones fundidos (cacho). Raiz em z=0..+5 (enterrada no teto)."""
    bm = bmesh.new()
    for comp, raio, seed, off in partes:
        _estalactite_bm(bm, comp, raio, lados if raio > 0.5 else max(6, lados - 3), aneis if comp > 4 else max(8, aneis - 6), seed, off)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(nome); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new(nome, me); bpy.context.scene.collection.objects.link(o)
    me.materials.append(mat); uv_mundo(o, 3.0)
    bpy.context.scene.collection.objects.unlink(o)
    return o

# ------------------------------------------------------------------ cristais
def cacho_cristais(nome, mat, mat2, seed, n=9, alt=1.6):
    """Cacho de prismas hexagonais com ponta, saindo de um centro (base em z=0)."""
    rnd = random.Random(seed); bm = bmesh.new()
    for i in range(n):
        h = alt * rnd.uniform(0.35, 1.0) * (1.25 if i == 0 else 1); r = h * rnd.uniform(0.09, 0.15)
        inc = 0 if i == 0 else rnd.uniform(0.25, 0.75); az = rnd.uniform(0, 6.28)
        M = Matrix.Translation((rnd.uniform(-0.25, 0.25) * alt * 0.3, rnd.uniform(-0.25, 0.25) * alt * 0.3, -0.05)) @ \
            Euler((inc * math.cos(az), inc * math.sin(az), rnd.uniform(0, 1))).to_matrix().to_4x4()
        base = [M @ Vector((r * math.cos(k * math.pi / 3), r * math.sin(k * math.pi / 3), 0)) for k in range(6)]
        topo = [M @ Vector((r * 0.92 * math.cos(k * math.pi / 3), r * 0.92 * math.sin(k * math.pi / 3), h * 0.78)) for k in range(6)]
        pt = M @ Vector((0, 0, h))
        vb = [bm.verts.new(v) for v in base]; vt = [bm.verts.new(v) for v in topo]; vp = bm.verts.new(pt)
        for k in range(6):
            f = bm.faces.new((vb[k], vb[(k + 1) % 6], vt[(k + 1) % 6], vt[k])); f.material_index = 0
            f2 = bm.faces.new((vt[k], vt[(k + 1) % 6], vp)); f2.material_index = 1
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(nome); bm.to_mesh(me); bm.free()
    me.materials.append(mat); me.materials.append(mat2)
    o = bpy.data.objects.new(nome, me)
    return o

# ------------------------------------------------------------------ plantas pendentes
def cipo(bm, topo, comp, rnd, folhas=40, larg_folha=0.42):
    """Um cipó: talo fino (tubo de 4 lados) + folhas em losango dobrado (2 tris) ao longo dele."""
    n = max(5, int(comp * 1.6)); pts = []
    sx, sy = rnd.uniform(-1, 1), rnd.uniform(-1, 1)
    for i in range(n + 1):
        t = i / n
        pts.append(Vector(topo) + Vector((0.35 * sx * math.sin(t * 3.0) + 0.15 * math.sin(t * 9 + sx * 5),
                                          0.35 * sy * math.sin(t * 2.6) + 0.15 * math.cos(t * 8 + sy * 5), -comp * t)))
    rr = 0.025; prev = None
    for i, p in enumerate(pts):
        ring = [bm.verts.new(p + Vector((rr * math.cos(k * math.pi / 2), rr * math.sin(k * math.pi / 2), 0))) for k in range(4)]
        if prev:
            for k in range(4): bm.faces.new((prev[k], prev[(k + 1) % 4], ring[(k + 1) % 4], ring[k]))
        prev = ring
    for j in range(folhas):
        t = rnd.random() ** 0.8; i = min(n - 1, int(t * n)); p = pts[i].lerp(pts[i + 1], rnd.random())
        a = rnd.uniform(0, 6.28); L = larg_folha * rnd.uniform(0.7, 1.4)
        d = Vector((math.cos(a), math.sin(a), rnd.uniform(-0.6, 0.2))).normalized()
        lado = d.cross(Vector((0, 0, 1))).normalized() * L * 0.55
        base = p; tip = p + d * L; mid = p + d * L * 0.5 + Vector((0, 0, L * 0.12))
        v = [bm.verts.new(x) for x in (base, mid + lado, tip, mid - lado)]
        bm.faces.new((v[0], v[1], v[2])); bm.faces.new((v[0], v[2], v[3]))

def touceira_cipos(nome, mat, seed, n=5, comp=4.0, folhas=45):
    rnd = random.Random(seed); bm = bmesh.new()
    for i in range(n):
        cipo(bm, (rnd.uniform(-0.8, 0.8), rnd.uniform(-0.3, 0.3), 0), comp * rnd.uniform(0.45, 1.0), rnd, folhas=folhas)
    me = bpy.data.meshes.new(nome); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new(nome, me); me.materials.append(mat)
    bpy.context.scene.collection.objects.link(o); uv_mundo(o, 0.6); bpy.context.scene.collection.objects.unlink(o)
    return o


def variante_musgo(src, mat, nome):
    """Cópia da malha com UV de mundo e material de rocha musgosa (para rochas junto às quedas e ilhotas)."""
    me = src.data.copy(); me.name = nome; me.materials.clear(); me.materials.append(mat)
    o = bpy.data.objects.new(nome, me); bpy.context.scene.collection.objects.link(o)
    uv_mundo(o, 1.2); bpy.context.scene.collection.objects.unlink(o)
    return o

def material_cristal(nome, base, emiss, forca, rough=0.06):
    m = bpy.data.materials.get(nome)
    if m: return m
    m = bpy.data.materials.new(nome); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*base, 1); b.inputs['Roughness'].default_value = rough
    b.inputs['Emission Color'].default_value = (*emiss, 1); b.inputs['Emission Strength'].default_value = forca
    return m

# ------------------------------------------------------------------ zonas proibidas (o que é de outros agentes / passagem)
_vcache = {}
def _verts(me):
    if me.name not in _vcache:
        a = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('co', a); _vcache[me.name] = a.reshape(-1, 3)
    return _vcache[me.name]

def violacoes(o):
    """Conta vértices do objeto (em mundo) dentro de volumes reservados: fachadas e bocas dos túneis, piso e pé-direito
    das galerias, elevadores, plataforma, pontes/escadas, garagem, lâmina da queda central, morcego, corredor de entrada."""
    v = _verts(o.data); M = np.array(o.matrix_world, np.float32)
    w = v @ M[:3, :3].T + M[:3, 3]
    x, y, z = w[:, 0], w[:, 1], w[:, 2]
    r = np.hypot(x, y); phi = np.degrees(np.arctan2(x, y))
    bad = np.zeros(len(w), bool)
    for a in PORTAIS:
        dphi = np.abs(phi - a)
        bad |= (dphi < MEIA_FACHADA + 0.4) & (z > 6.5) & (z < 25.0) & (r > 35.4) & (r < 38.3)   # fachada
        bad |= (dphi < 5.2) & (((z > 6.6) & (z < 13.4)) | ((z > 14.6) & (z < 21.4))) & (r > 35.0) & (r < 52)  # boca + túnel
    gal = (np.abs(phi) < 72.6) & (r > 32.8) & (r < 38.4)
    bad |= gal & (((z > 6.4) & (z < 10.2)) | ((z > 14.4) & (z < 18.2)))
    for s in (-1, 1):
        e = P(35.7, s * 68.5); bad |= (np.hypot(x - e.x, y - e.y) < 3.2) & (z > -0.5) & (z < 19)
        bad |= (np.abs(phi - s * 43) < 5.0) & (r > 11) & (r < 33.6) & (z > -0.4)             # ponte + escada
    bad |= (r < 13.2) & (z > -0.6) & (z < 21)                                             # plataforma + batcomputador
    bad |= (np.abs(x) < 3.6) & (y < -11) & (z > -0.3) & (z < 9)                               # ponte/corredor de entrada
    bad |= (x < -10.5) & (x > -18.5) & (np.abs(y) < 2.8) & (z > -0.3) & (z < 6)               # ponte da garagem
    bad |= (x > -32.5) & (x < -15.8) & (y > -15.5) & (y < 7.5) & (z < 10.5)                   # garagem
    bad |= (np.abs(x) < 3.9) & (y > 30.5) & (z > -0.6) & (z < 25)                             # lâmina da queda central
    bad |= (np.abs(x) < 13.5) & (y > 29.5) & (z > 25.5) & (z < 36.5)                          # morcego
    return int(bad.sum())

def limpa_violacoes(col, prefixos, say=print):
    rem = enc = 0
    bpy.context.view_layer.update()
    for o in list(col.objects):
        if o.type != 'MESH' or not any(o.name.startswith(p) for p in prefixos): continue
        n = violacoes(o)
        tent = 0
        while n and tent < 3:
            o.scale = tuple(s * 0.8 for s in o.scale); bpy.context.view_layer.update(); n = violacoes(o); tent += 1
        if n: say('  removido', o.name, n); bpy.data.objects.remove(o); rem += 1
        elif tent: enc += 1
    say('zonas reservadas: encolhidos', enc, 'removidos', rem)
