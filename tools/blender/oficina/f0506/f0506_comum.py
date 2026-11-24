# Funções próprias da área f0506 (fachadas 05 Energia e 06 Transporte). Só usadas pelos scripts f0506_*.
import sys, os, math, random, json
sys.path.insert(0, r'C:\Users\Gabriel Caetano\Downloads\Claud Code\batcaverna\tools\blender\oficina')
from kit import *
from kit import _baixa
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(AQUI, 'tex'); os.makedirs(TEX, exist_ok=True)


# ---------------- materiais ----------------
def _img(n, path, cs):
    node = n.new('ShaderNodeTexImage'); node.image = bpy.data.images.load(path, check_existing=True)
    node.image.colorspace_settings.name = cs; return node

def mat_img(nome, diff_path, pid_relevo, metal=0.0, nor_k=1.0):
    """Principled com difusa própria (gerada) + rugosidade/normal de uma textura Poly Haven."""
    m = bpy.data.materials.get(nome)
    if m: return m
    t = ph_textura(pid_relevo)
    m = bpy.data.materials.new(nome); m.use_nodes = True
    nt = m.node_tree; n = nt.nodes; l = nt.links; b = n['Principled BSDF']
    b.inputs['Metallic'].default_value = metal
    l.new(_img(n, diff_path, 'sRGB').outputs['Color'], b.inputs['Base Color'])
    if 'rough' in t: l.new(_img(n, t['rough'], 'Non-Color').outputs['Color'], b.inputs['Roughness'])
    if 'nor' in t:
        nm = n.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nor_k
        l.new(_img(n, t['nor'], 'Non-Color').outputs['Color'], nm.inputs['Color']); l.new(nm.outputs['Normal'], b.inputs['Normal'])
    return m

def _px(path):
    im = bpy.data.images.load(path, check_existing=True)
    w, h = im.size; a = np.empty(w * h * 4, dtype=np.float32); im.pixels.foreach_get(a)
    return a.reshape(h, w, 4)

def _salva(nome, arr):
    h, w, _ = arr.shape
    im = bpy.data.images.new(nome, w, h); im.pixels.foreach_set(arr.astype(np.float32).ravel())
    p = os.path.join(TEX, nome + '.png'); im.filepath_raw = p; im.file_format = 'PNG'; im.save()
    bpy.data.images.remove(im); return p

def textura_faixa(nome='f06_faixa', periodos=2, amarelo=(0.95, 0.66, 0.08), preto=(0.025, 0.025, 0.028)):
    """Faixa de perigo diagonal amarela/preta, sujada pela luminância do metal_plate_02 (desgaste e manchas)."""
    base = _px(ph_textura('metal_plate_02')['diff'])
    sujo = _px(ph_textura('rusty_metal_03')['diff'])
    h, w, _ = base.shape
    lum = base[..., :3].mean(axis=2); lum = lum / max(1e-4, lum.mean())
    rs = sujo[..., :3].mean(axis=2); rs = rs / max(1e-4, rs.mean())
    v, u = np.mgrid[0:h, 0:w] / float(w)
    lado = ((u + v) * periodos) % 1.0 < 0.5
    # borda levemente irregular (tinta pintada a mão)
    out = np.zeros((h, w, 4), np.float32); out[..., 3] = 1
    for c in range(3):
        y = amarelo[c] * np.clip(0.55 + 0.45 * rs, 0.35, 1.25) * np.clip(lum, 0.6, 1.2)
        k = preto[c] * np.clip(lum * 1.6, 0.4, 2.4)
        out[..., c] = np.where(lado, y, k)
    return _salva(nome, np.clip(out, 0, 1))

def textura_tom(nome, pid, rgb, contraste=1.0):
    """Difusa = luminância da textura PH (manchas, emendas, desgaste) x um tom (aço azulado, cromo...)."""
    base = _px(ph_textura(pid)['diff'])
    lum = base[..., :3].mean(axis=2); lum = lum / max(1e-4, lum.mean()); lum = np.clip(1 + (lum - 1) * contraste, 0.2, 2.0)
    out = np.ones(base.shape, np.float32)
    for c in range(3): out[..., c] = rgb[c] * lum
    return _salva(nome, np.clip(out, 0, 1))

def metal_tom(nome, pid, rgb, contraste=1.0, metal=1.0, nor_k=1.0):
    m = bpy.data.materials.get(nome)
    if m: return m
    return mat_img(nome, textura_tom(nome.lower(), pid, rgb, contraste), pid, metal=metal, nor_k=nor_k)

def emissivo(nome, rgb, forca):
    return cor(nome, rgb, rough=0.35, emiss=forca)


# ---------------- malha utilitária ----------------
def uv_cil(o, tam=1.5, eixo='Z'):
    """UV cilíndrico em escala de mundo (u = arco, v = altura) para tanques e tubos verticais."""
    bm = bmesh.new(); bm.from_mesh(o.data); uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        cx = sum(math.atan2(l.vert.co.y, l.vert.co.x) for l in f.loops) / len(f.loops)
        for lp in f.loops:
            p = lp.vert.co; r = math.hypot(p.x, p.y); a = math.atan2(p.y, p.x)
            if abs(a - cx) > math.pi: a += 2 * math.pi if a < cx else -2 * math.pi
            if abs(f.normal.z) > 0.7: lp[uv].uv = (p.x / tam, p.y / tam)
            else: lp[uv].uv = (a * max(r, 0.2) / tam, p.z / tam)
    bm.to_mesh(o.data); bm.free(); return o

def cilindro(nome, col, r, h, loc, mat, lados=32, bev=0.02, r2=None, tam=1.5, rot=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=lados, radius1=r, radius2=r if r2 is None else r2, depth=h)
    if bev > 0:
        ed = [e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) < 1e-5 and abs(abs(e.verts[0].co.z) - h / 2) < 1e-5]
        bmesh.ops.bevel(bm, geom=ed, offset=bev, segments=2, affect='EDGES', profile=0.5)
    o = objeto(nome, bm, col, mat); uv_cil(o, tam)
    o.location = loc
    if rot: o.rotation_euler = rot
    return o

def anel(nome, col, R_, r_, loc, mat, maior=32, menor=10, rot=(0, 0, 0)):
    bm = bmesh.new(); vs = []
    for i in range(maior):
        a = 2 * math.pi * i / maior; row = []
        for j in range(menor):
            b = 2 * math.pi * j / menor
            row.append(bm.verts.new(((R_ + r_ * math.cos(b)) * math.cos(a), (R_ + r_ * math.cos(b)) * math.sin(a), r_ * math.sin(b))))
        vs.append(row)
    for i in range(maior):
        for j in range(menor):
            bm.faces.new((vs[i][j], vs[(i + 1) % maior][j], vs[(i + 1) % maior][(j + 1) % menor], vs[i][(j + 1) % menor]))
    o = objeto(nome, bm, col, mat); o.location = loc; o.rotation_euler = rot
    bpy.context.view_layer.update(); uv_mundo(o, 1.0); return o

def esfera(nome, col, r, loc, mat, seg=16, anel_=8, meia=False, esc=(1, 1, 1)):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=anel_, radius=r)
    if meia: bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -1e-4], context='VERTS')
    bmesh.ops.scale(bm, vec=Vector(esc), verts=bm.verts)
    o = objeto(nome, bm, col, mat); o.location = loc; bpy.context.view_layer.update(); uv_mundo(o, 1.0); return o

def curva_malha(nome, col, pontos, raio, mat, res=3, tampa=True, tam=1.2):
    cu = bpy.data.curves.new(nome + '_c', 'CURVE'); cu.dimensions = '3D'
    cu.bevel_depth = raio; cu.bevel_resolution = res; cu.use_fill_caps = tampa
    sp = cu.splines.new('POLY'); sp.points.add(len(pontos) - 1)
    for p, q in zip(sp.points, pontos): p.co = (q[0], q[1], q[2], 1)
    tmp = bpy.data.objects.new(nome + '_tmp', cu); bpy.context.scene.collection.objects.link(tmp)
    dg = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    bpy.data.objects.remove(tmp); bpy.data.curves.remove(cu)
    me.name = nome; o = bpy.data.objects.new(nome, me); col.objects.link(o)
    me.materials.clear()
    if mat: me.materials.append(mat)
    uv_mundo(o, tam); return o

def arredonda(pts, raio, passos=8):
    """Polilinha com cantos arredondados (cotovelos de cano)."""
    pts = [Vector(p) for p in pts]; out = [pts[0]]
    for i in range(1, len(pts) - 1):
        a, b, c = pts[i - 1], pts[i], pts[i + 1]
        d1 = (a - b).normalized(); d2 = (c - b).normalized()
        r = min(raio, (a - b).length * 0.5, (c - b).length * 0.5)
        p1 = b + d1 * r; p2 = b + d2 * r
        for k in range(passos + 1):
            t = k / passos  # bézier quadrática p1 → b → p2
            out.append((1 - t) ** 2 * p1 + 2 * (1 - t) * t * b + t * t * p2)
    out.append(pts[-1]); return out

def cano(nome, col, pts, raio, mat, curva=0.6, flanges=None, mat_fl=None, res=3):
    """Cano grosso com cotovelos e flanges (anéis) nos pontos dados."""
    p = arredonda(pts, curva, 10)
    o = curva_malha(nome, col, [tuple(v) for v in p], raio, mat, res=res)
    for i, (pt, d) in enumerate(flanges or []):
        f = cilindro(f'{nome}_fl{i}', col, raio * 1.28, 0.12, pt, mat_fl or mat, lados=24, bev=0.015)
        f.rotation_euler = Vector(d).to_track_quat('Z', 'Y').to_euler()
    return o

def raio_eletrico(pts0, pts1, rnd, desvio=0.35, niveis=5):
    """Pontos de um raio entre dois pontos (deslocamento do ponto médio)."""
    seg = [Vector(pts0), Vector(pts1)]
    for n in range(niveis):
        novo = [seg[0]]
        for a, b in zip(seg, seg[1:]):
            m = (a + b) / 2; L = (b - a).length
            m += Vector((rnd.uniform(-1, 1), rnd.uniform(-0.3, 0.3), rnd.uniform(-1, 1))) * L * desvio
            novo += [m, b]
        seg = novo
    for v in seg:  # dentro do envelope da fachada
        v.x = max(-6.1, min(6.1, v.x)); v.y = max(-1.28, min(0.6, v.y)); v.z = max(0.05, min(9.4, v.z))
    return seg

def raios(nome, col, trajetos, mat, rnd, raio=0.022, galhos=3):
    """Vários raios (com galhos) numa malha só, tubos finos de 4 lados emissivos."""
    linhas = []
    for (a, b, dv) in trajetos:
        tronco = raio_eletrico(a, b, rnd, dv); linhas.append((tronco, raio))
        for g in range(galhos):
            i = rnd.randrange(3, len(tronco) - 3); p = tronco[i]
            d = Vector((rnd.uniform(-1, 1), rnd.uniform(-0.2, 0.1), rnd.uniform(-0.6, 1))).normalized() * rnd.uniform(0.6, 1.5)
            linhas.append((raio_eletrico(p, p + d, rnd, 0.3, 3), raio * 0.6))
    objs = [curva_malha(f'{nome}_{i}', col, [tuple(v) for v in ln], r, mat, res=0, tampa=False) for i, (ln, r) in enumerate(linhas)]
    for o in bpy.context.selected_objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); objs[0].name = nome
    return objs[0]


# ---------------- banda em arco (perfil do portal) ----------------
def contorno(meia_larg, arranque, alt_arco, passos=40, pe=0.0, divs_reta=6):
    """Contorno interno do vão: pé esquerdo -> arco (elipse a=meia_larg, b=alt_arco) -> pé direito.
    Devolve lista de (ponto(x,z), normal_para_fora(x,z))."""
    pts = []
    for k in range(divs_reta):
        z = pe + (arranque - pe) * k / divs_reta; pts.append(((-meia_larg, z), (-1.0, 0.0)))
    for k in range(passos + 1):
        t = math.pi * (1 - k / passos)
        x = meia_larg * math.cos(t); z = arranque + alt_arco * math.sin(t)
        nx = math.cos(t) / meia_larg; nz = math.sin(t) / max(alt_arco, 1e-6); L = math.hypot(nx, nz)
        pts.append(((x, z), (nx / L, nz / L)))
    for k in range(1, divs_reta + 1):
        z = arranque - (arranque - pe) * k / divs_reta; pts.append(((meia_larg, z), (1.0, 0.0)))
    return pts

def banda(nome, col, cont, d0, d1, y0, y1, mat, tam=1.6, bev=0.025, uv_norm=False):
    """Banda maciça que acompanha o contorno, de d0 a d1 para fora, de y0 (frente) a y1 (fundo).
    UV na face da frente: u = comprimento de arco, v = distância radial (para faixas de perigo)."""
    bm = bmesh.new(); uv = bm.loops.layers.uv.verify()
    aneis = []; s = [0.0]
    for i in range(1, len(cont)):
        (a, _), (b, _) = cont[i - 1], cont[i]; s.append(s[-1] + math.hypot(b[0] - a[0], b[1] - a[1]) + 1e-9)
    for (p, n) in cont:
        q0 = (p[0] + n[0] * d0, p[1] + n[1] * d0); q1 = (p[0] + n[0] * d1, p[1] + n[1] * d1)
        aneis.append([bm.verts.new((q0[0], y0, q0[1])), bm.verts.new((q1[0], y0, q1[1])),
                      bm.verts.new((q1[0], y1, q1[1])), bm.verts.new((q0[0], y1, q0[1]))])
    largura = d1 - d0
    for i in range(len(aneis) - 1):
        A, B = aneis[i], aneis[i + 1]
        for j in range(4):
            f = bm.faces.new((A[j], B[j], B[(j + 1) % 4], A[(j + 1) % 4]))
            for lp in f.loops:
                ii = i if lp.vert in A else i + 1; jj = (A if lp.vert in A else B).index(lp.vert)
                u = s[ii] / tam
                if j == 0:  # frente (y0): v radial
                    v = (0.0 if jj in (0, 3) else largura) / tam
                elif j == 2:  # fundo
                    v = (0.0 if jj in (0, 3) else largura) / tam
                else:  # laterais: v profundidade
                    v = (y0 if jj in (0, 1) else y1) / tam
                lp[uv].uv = (u, v)
    # tampas nos pés
    for R_ in (aneis[0], aneis[-1][::-1]): bm.faces.new(R_)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bev > 0:
        longas = [e for e in bm.edges if len(e.link_faces) == 2 and abs(e.link_faces[0].normal.dot(e.link_faces[1].normal)) < 0.5]
        bmesh.ops.bevel(bm, geom=longas, offset=bev, segments=2, affect='EDGES', profile=0.5)
    return objeto(nome, bm, col, mat)

def pousa(bm, origem, t, n):
    """Leva uma peça montada na origem (x = tangente, z = radial, y = profundidade) para um ponto do contorno."""
    T = Vector((t[0], 0, t[1])); N = Vector((n[0], 0, n[1])); Y = Vector((0, 1, 0))
    M = Matrix((T, Y, N)).transposed().to_4x4(); M.translation = Vector((origem[0], 0, origem[1]))
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)

def ao_longo(cont, passo, inicio=0.0):
    """Pontos igualmente espaçados ao longo do contorno: (ponto, tangente, normal)."""
    out = []; acc = -inicio
    for i in range(1, len(cont)):
        (a, na), (b, nb) = cont[i - 1], cont[i]
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        if L < 1e-9: continue
        t = ((b[0] - a[0]) / L, (b[1] - a[1]) / L)
        while acc <= L:
            if acc >= 0:
                f = acc / L; p = (a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f)
                n = (na[0] + (nb[0] - na[0]) * f, na[1] + (nb[1] - na[1]) * f); ln = math.hypot(*n)
                out.append((p, t, (n[0] / ln, n[1] / ln)))
            acc += passo
        acc -= L
    return out

def pecas_no_contorno(nome, col, cont, passo, faz, mat, d, inicio=0.0, pula=None):
    """Repete uma peça (bmesh feito por `faz()`) ao longo do contorno, à distância d, numa malha só."""
    bm_all = bmesh.new()
    for k, (p, t, n) in enumerate(ao_longo(cont, passo, inicio)):
        if pula and pula(k, p): continue
        bm = faz(k); pousa(bm, (p[0] + n[0] * d, p[1] + n[1] * d), t, n)
        me = bpy.data.meshes.new('tmp'); bm.to_mesh(me); bm.free(); bm_all.from_mesh(me); bpy.data.meshes.remove(me)
    o = objeto(nome, bm_all, col, mat); uv_mundo(o, 1.0); return o

def bm_caixa(dx, dy, dz, centro=(0, 0, 0), bev=0.0):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector((dx, dy, dz)), verts=bm.verts)
    if bev > 0: bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bev, segments=1, affect='EDGES')
    bmesh.ops.translate(bm, vec=Vector(centro), verts=bm.verts); return bm

def bm_rebite(r=0.045, h=0.04, lados=8):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=lados, radius1=r, radius2=r * 0.6, depth=h)
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'X'), verts=bm.verts)
    return bm

def rebites(nome, col, pontos_y, mat, r=0.045):
    """Rebites (cabeça cônica virada para -Y) em pontos (x, y, z)."""
    bm_all = bmesh.new()
    for (x, y, z) in pontos_y:
        bm = bm_rebite(r); bmesh.ops.translate(bm, vec=Vector((x, y - 0.02, z)), verts=bm.verts)
        me = bpy.data.meshes.new('tmp'); bm.to_mesh(me); bm.free(); bm_all.from_mesh(me); bpy.data.meshes.remove(me)
    o = objeto(nome, bm_all, col, mat); uv_mundo(o, 0.5); return o


# ---------------- peças Poly Haven (uma parte de um modelo) ----------------
_partes = {}
def ph_parte(pid, obj, col, nome, x=0, y=0, z=0, rz=0.0, rx=0.0, altura=None, larg=None, vidro=None):
    """Uma peça específica de um modelo Poly Haven (ex.: uma luminária do conjunto). Vidro vira o material `vidro`."""
    key = (pid, obj)
    if key not in _partes:
        meta_p = os.path.join(PHM, pid, 'meta.json'); _baixa(f'https://api.polyhaven.com/files/{pid}', meta_p)
        b = json.load(open(meta_p, encoding='utf-8'))['blend']['1k']['blend']
        path = _baixa(b['url'], os.path.join(PHM, pid, os.path.basename(b['url'].split('?')[0])))
        for rel, inc in (b.get('include') or {}).items(): _baixa(inc['url'], os.path.join(PHM, pid, rel))
        with bpy.data.libraries.load(path, link=False) as (src, dst): dst.objects = [n for n in src.objects]
        alvo = None
        for o in dst.objects:
            if o is None: continue
            bpy.context.scene.collection.objects.link(o)
            if o.name.startswith(obj) and o.type == 'MESH' and alvo is None: alvo = o
        bpy.context.view_layer.update()
        mw = alvo.matrix_world.copy(); alvo.parent = None; alvo.matrix_world = mw
        alvo.data = alvo.data.copy(); alvo.data.transform(alvo.matrix_world); alvo.matrix_world = Matrix.Identity(4)
        for o in list(dst.objects):
            if o is not None and o != alvo: bpy.data.objects.remove(o)
        bpy.context.scene.collection.objects.unlink(alvo)
        # origem no centro da caixa
        bb = [Vector(c) for c in alvo.bound_box]; c = sum(bb, Vector()) / 8
        alvo.data.transform(Matrix.Translation(-c))
        _partes[key] = alvo
    o = copia(_partes[key], col, nome)
    if vidro:
        for sl in o.material_slots:
            if sl.material and 'glass' in sl.material.name.lower(): sl.material = vidro
    o.rotation_euler = (rx, 0, rz)
    bpy.context.view_layer.update()
    if altura or larg:
        d = o.dimensions; s = (altura / d.z) if altura else (larg / max(d.x, d.y)); o.scale = (s, s, s)
    o.location = (x, y, z); bpy.context.view_layer.update(); return o


def junta(nome, objs):
    objs = [o for o in objs if o]
    for o in bpy.context.selected_objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join(); objs[0].name = nome; return objs[0]

def luz_prev(nome, tipo, loc, cor_, energia, tam=1.0, alvo=None):
    """Luz só da prévia (prefixo PREV_, o fecha remove)."""
    L = bpy.data.lights.new('PREV_' + nome, tipo); L.energy = energia; L.color = cor_
    if tipo == 'AREA': L.size = tam
    if tipo in ('POINT', 'SPOT'): L.shadow_soft_size = tam
    o = bpy.data.objects.new('PREV_' + nome, L); bpy.context.scene.collection.objects.link(o); o.location = loc
    if alvo: o.rotation_euler = (Vector(alvo) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return o

def checa_limites(col, rect=False, alt_max=9.5):
    """Confere o contrato: largura <= 12.4, y >= -1.3, altura, e nada dentro do vão (perto da boca)."""
    dg = bpy.context.evaluated_depsgraph_get(); mn = Vector((1e9,) * 3); mx = Vector((-1e9,) * 3); inv = 0; quem = set()
    for o in col.all_objects:
        if o.type != 'MESH': continue
        me = o.evaluated_get(dg).to_mesh(); mw = o.matrix_world
        for v in me.vertices:
            p = mw @ v.co
            mn = Vector(map(min, mn, p)); mx = Vector(map(max, mx, p))
            if -1.3 < p.y < 0.6 and abs(p.x) < 3.19 and 0.02 < p.z < 6.18:
                dentro = True if rect else (p.z < 3.0 or (p.x ** 2 + (p.z - 3.0) ** 2) < 3.19 ** 2)
                if dentro and not o.name.split('_')[1].startswith(('trilho', 'dorm')): inv += 1; quem.add(o.name)
        o.evaluated_get(dg).to_mesh_clear()
    say('LIMITES min', tuple(round(v, 2) for v in mn), 'max', tuple(round(v, 2) for v in mx), 'invasao_boca', inv, sorted(quem)[:8])


def varre(nome, col, caminho, perfil, mat, fechado=False, tam=1.0):
    """Varre um perfil 2D (lateral, altura) ao longo de um caminho no plano XY (trilhos, vigas)."""
    bm = bmesh.new(); aneis = []
    P = [Vector(p) for p in caminho]
    for i, p in enumerate(P):
        a = P[max(0, i - 1)]; b = P[min(len(P) - 1, i + 1)]
        t = (b - a); t.z = 0; t.normalize(); n = Vector((-t.y, t.x, 0))
        aneis.append([bm.verts.new(p + n * px + Vector((0, 0, pz))) for (px, pz) in perfil])
    m = len(perfil)
    for i in range(len(aneis) - 1):
        for j in range(m if fechado else m - 1):
            bm.faces.new((aneis[i][j], aneis[i + 1][j], aneis[i + 1][(j + 1) % m], aneis[i][(j + 1) % m]))
    bm.faces.new(aneis[0]); bm.faces.new(aneis[-1][::-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = objeto(nome, bm, col, mat); uv_mundo(o, tam); return o

def lista_tris(col, n=14):
    dg = bpy.context.evaluated_depsgraph_get()
    r = sorted(((sum(len(p.vertices) - 2 for p in o.evaluated_get(dg).data.polygons), o.name) for o in col.all_objects if o.type == 'MESH'), reverse=True)
    grupos = {}
    for t, nm in r:
        k = ''.join(ch for ch in nm.split('.')[0] if not ch.isdigit()).rstrip('_-')
        grupos[k] = grupos.get(k, 0) + t
    say('TRIS por grupo', sorted(((v, k) for k, v in grupos.items()), reverse=True)[:n])
