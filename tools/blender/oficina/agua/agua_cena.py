"""ÁGUA e CACHOEIRAS da Batcaverna (referencial MUNDO, coleção A_AGUA, public/models/area_agua.glb).

Cachoeira central em três degraus (x=0, z=-37 three) com rochas escalonadas e bacias, as duas pontes em
arco com LED ciano e o morcego na chave do arco (galerias y=7 e y=15), cachoeiras laterais (34,26),
cascata em degraus (38.5,12)->(35.8,19), queda da esquerda (-30,24) e o fundo do lago com rochas.
Lâminas de água = malhas AGUA_* com U 0..1 na largura e V (no three/glTF) = metros até o fim da queda / 4,
ou seja, o V DESCE no sentido do fluxo e vale 0 no pé (a espuma do shader do site fica embaixo).
A superfície do lago NÃO é modelada (o site tem o reflexo); PREV_* é só contexto da prévia e não é exportado.

Rodar: pwsh -File tools/blender/rodar.ps1 tools/blender/oficina/agua/agua_cena.py 1800 [frente perto entrada diagonal lados glb]
"""
import sys; sys.path.insert(0, r'C:\Users\Gabriel Caetano\Downloads\Claud Code\batcaverna\tools\blender\oficina')
from kit import *
import random
from mathutils import noise

AQUI = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(AQUI, 'tex')
NOME = 'area_agua'
CYAN = (0.12, 0.78, 1.0)

# ---------------------------------------------------------------- coordenadas
def P(r, phi, z):
    a = math.radians(phi); return Vector((r * math.sin(a), r * math.cos(a), z))

def B(x3, z3, y3=0.0):
    """Ponto do three.js (x, y, z) -> Blender (x, -z, y)."""
    return Vector((x3, -z3, y3))

def phi_x(x, r):
    return math.degrees(math.asin(max(-1, min(1, x / r))))

# ---------------------------------------------------------------- materiais
def _blend(m):
    try: m.surface_render_method = 'BLENDED'
    except Exception: pass
    try: m.blend_method = 'BLEND'
    except Exception: pass
    m.use_backface_culling = False

def mat_img(nome, arquivo, emiss=1.0, rough=0.12, tint=None):
    m = bpy.data.materials.get(nome)
    if m: return m
    m = bpy.data.materials.new(nome); m.use_nodes = True; n = m.node_tree.nodes; l = m.node_tree.links
    b = n['Principled BSDF']
    t = n.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(os.path.join(TEX, arquivo), check_existing=True)
    l.new(t.outputs['Color'], b.inputs['Base Color']); l.new(t.outputs['Alpha'], b.inputs['Alpha'])
    l.new(t.outputs['Color'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = emiss
    b.inputs['Roughness'].default_value = rough
    _blend(m); return m

def mat_vidro(nome):
    m = bpy.data.materials.get(nome)
    if m: return m
    m = bpy.data.materials.new(nome); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.55, 0.8, 0.95, 1); b.inputs['Roughness'].default_value = 0.05
    b.inputs['Alpha'].default_value = 0.08; b.inputs['Metallic'].default_value = 0.0
    _blend(m); return m

def materiais():
    M = {}
    M['rocha'] = material('A_AGUA_rocha', 'dark_rock', tint=(0.36, 0.4, 0.5), rough_k=1.0, nor_k=1.6)
    M['musgo'] = material('A_AGUA_musgo', 'mossy_rock', tint=(0.13, 0.26, 0.15), nor_k=1.2)
    M['metal'] = material('A_AGUA_metal', 'metal_plate', tint=(0.16, 0.19, 0.23), metal=0.85, nor_k=0.8)
    M['piso'] = material('A_AGUA_piso', 'metal_plate_02', tint=(0.32, 0.36, 0.42), metal=0.8)
    M['grafite'] = cor('A_AGUA_grafite', (0.035, 0.042, 0.052), rough=0.35, metal=0.9)
    M['led'] = cor('A_AGUA_led', CYAN, rough=0.3, emiss=4.0)
    M['cristal'] = cor('A_AGUA_cristal', (0.08, 0.42, 1.0), rough=0.1, emiss=2.0)
    M['vidro'] = mat_vidro('A_AGUA_vidro')
    M['agua'] = mat_img('A_AGUA_agua', 'agua_fluxo.png', emiss=0.75)
    M['espuma'] = mat_img('A_AGUA_espuma', 'agua_espuma.png', emiss=1.4, rough=0.5)
    return M

# ---------------------------------------------------------------- utilidades de malha
def suaviza(o, ang=0.75):
    for p in o.data.polygons: p.use_smooth = True
    try:
        bpy.context.view_layer.objects.active = o
        for x in bpy.context.selected_objects: x.select_set(False)
        o.select_set(True); bpy.ops.object.shade_smooth_by_angle(angle=ang)
    except Exception:
        try: o.data.use_auto_smooth = True; o.data.auto_smooth_angle = ang
        except Exception: pass

def aplica_mods(o):
    for x in bpy.context.selected_objects: x.select_set(False)
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)

def ntri(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)

# ---------------------------------------------------------------- rochas
ROCHAS = []
def rocha(nome, col, M, loc, dims, seed=0, rz=0.0, cortes=7, alvo=900, musgo=0.3, topo=False, base=True, estrato=0.07, liso=0.16, caixa=1.0):
    """Rocha fraturada com estratos horizontais (basalto escuro molhado), base e topo opcionais planos.
    dims = tamanho total (x, y, z) em metros. Faces viradas para cima ganham musgo em manchas."""
    rnd = random.Random(seed)
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=4, radius=1.0)
    off = Vector((rnd.uniform(0, 90), rnd.uniform(0, 90), rnd.uniform(0, 90)))
    sx, sy, sz = dims
    if caixa != 1.0:   # superelipsoide: blocos de quinas vivas em vez de seixos redondos
        for v in bm.verts:
            v.co = Vector([math.copysign(abs(c) ** caixa, c) for c in v.co])
    for v in bm.verts:
        p = v.co.copy()
        n = noise.fractal(p * 1.15 + off, 1.0, 2.0, 4)
        # estratos: degraus horizontais (serra em z, quebrada por ruído) — leitura de rocha em camadas
        zz = p.z * (sz / 0.9) + 0.35 * noise.noise(p * 0.8 + off)
        saw = (zz % 1.0) - 0.5
        v.co = p * (1.0 + liso * n + estrato * saw)
    for k in range(cortes):
        nv = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.45, 0.8))).normalized()
        d = rnd.uniform(0.66, 0.92)
        g = bm.verts[:] + bm.edges[:] + bm.faces[:]
        r = bmesh.ops.bisect_plane(bm, geom=g, plane_co=nv * d, plane_no=nv, clear_outer=True)
        ed = [e for e in r['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
        if ed: bmesh.ops.holes_fill(bm, edges=ed)
    for flag, z0, nz in ((topo, 0.62, 1), (base, -0.6, -1)):
        if not flag: continue
        nv = Vector((rnd.uniform(-0.06, 0.06), rnd.uniform(-0.06, 0.06), nz)).normalized()
        g = bm.verts[:] + bm.edges[:] + bm.faces[:]
        r = bmesh.ops.bisect_plane(bm, geom=g, plane_co=Vector((0, 0, z0)), plane_no=nv, clear_outer=True)
        ed = [e for e in r['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
        if ed: bmesh.ops.holes_fill(bm, edges=ed)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    # normaliza para caber em dims
    xs = [v.co.x for v in bm.verts]; ys = [v.co.y for v in bm.verts]; zs = [v.co.z for v in bm.verts]
    cx, cy, cz = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, (max(zs) + min(zs)) / 2
    kx, ky, kz = sx / (max(xs) - min(xs)), sy / (max(ys) - min(ys)), sz / (max(zs) - min(zs))
    rot = Matrix.Rotation(rz, 3, 'Z')
    for v in bm.verts:
        q = Vector(((v.co.x - cx) * kx, (v.co.y - cy) * ky, (v.co.z - cz) * kz))
        v.co = rot @ q + Vector(loc)
    o = objeto(nome, bm, col, M['rocha'])
    o.data.materials.append(M['musgo'])
    t = ntri(o)
    if t > alvo:
        dm = o.modifiers.new('reduz', 'DECIMATE'); dm.ratio = alvo / t; aplica_mods(o)
    if musgo > 0:
        for p in o.data.polygons:
            c = p.center
            if p.normal.z > 0.62 and noise.noise(c * 0.45 + off) > 0.5 - musgo: p.material_index = 1
    uv_mundo(o, 3.0); suaviza(o)
    ROCHAS.append(o)
    return o

# ---------------------------------------------------------------- lâmina de água (fita ao longo de um caminho)
def lamina(nome, col, mat, pts, larg, lado, frente, nu=10, passo=0.3, tile=4.0, bojo=0.22, seed=1, ondula=0.06):
    """pts: centro da água (Vector, de cima para baixo / montante->jusante). larg: largura em cada ponto.
    lado: vetor horizontal da largura (+U). frente: para onde a lâmina estufa (salão).
    UV: U 0..1 na largura; V no glTF = (comprimento restante)/tile -> desce no sentido do fluxo, 0 no pé."""
    lado = Vector(lado).normalized(); frente = Vector(frente).normalized()
    L = [0.0]
    for a, b in zip(pts, pts[1:]): L.append(L[-1] + (b - a).length)
    S = L[-1]; n = max(2, int(S / passo) + 1)
    def at(s):
        for i in range(len(pts) - 1):
            if s <= L[i + 1] or i == len(pts) - 2:
                f = 0 if L[i + 1] == L[i] else (s - L[i]) / (L[i + 1] - L[i]); f = max(0, min(1, f))
                return pts[i].lerp(pts[i + 1], f), larg[i] + (larg[i + 1] - larg[i]) * f
    amostras = [at(S * k / (n - 1)) for k in range(n)]
    cs = [a[0] for a in amostras]; ws = [a[1] for a in amostras]
    for _ in range(3):  # suaviza as quinas do caminho (curva de queda)
        cs = [cs[0]] + [(cs[i - 1] + cs[i] * 2 + cs[i + 1]) / 4 for i in range(1, n - 1)] + [cs[-1]]
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap')
    grid = []
    for i, c in enumerate(cs):
        tng = (cs[min(n - 1, i + 1)] - cs[max(0, i - 1)]).normalized()
        nrm = tng.cross(lado).normalized()
        if nrm.dot(frente) < 0: nrm = -nrm
        s = S * i / (n - 1); row = []
        for j in range(nu + 1):
            u = j / nu; x = u - 0.5
            w = ws[i] * (1 + 0.1 * noise.noise(Vector((s * 0.6, x * 2, seed))))
            bulge = bojo * (1 - (2 * x) ** 2) + ondula * noise.noise(Vector((s * 0.9, x * 5, seed + 3)))
            row.append((bm.verts.new(c + lado * (x * w) + nrm * bulge), u, s))
        grid.append(row)
    for i in range(n - 1):
        for j in range(nu):
            q = [grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]]
            f = bm.faces.new([a[0] for a in q])
            for lp, (_, u, s) in zip(f.loops, q):
                lp[uvl].uv = (u, 1.0 - (S - s) / tile)   # Blender v = 1 - v_glTF
    o = objeto(nome, bm, col, mat)
    for p in o.data.polygons: p.use_smooth = True
    return o

def bacia(nome, col, mat, phi0, phi1, r_fundo, r_borda, z, tile=4.0):
    """Superfície de uma bacia entre degraus: escoa para a borda (V desce até 0 na borda)."""
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap'); nf, nr = 12, 3
    vs = [[bm.verts.new(P(r_fundo + (r_borda - r_fundo) * k / nr, phi0 + (phi1 - phi0) * j / nf, z)) for j in range(nf + 1)] for k in range(nr + 1)]
    prof = abs(r_borda - r_fundo)
    for k in range(nr):
        for j in range(nf):
            f = bm.faces.new([vs[k][j], vs[k][j + 1], vs[k + 1][j + 1], vs[k + 1][j]])
            for lp, (kk, jj) in zip(f.loops, [(k, j), (k, j + 1), (k + 1, j + 1), (k + 1, j)]):
                lp[uvl].uv = (jj / nf, 1.0 - (prof * (1 - kk / nr)) / tile)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        if f.normal.z < 0: f.normal_flip()
    return objeto(nome, bm, col, mat)

def espuma(nome, col, mat, centro, raio, seed=0, alt=0.35, esc=(1.0, 1.0), rz=0.0, nr=6, na=32):
    """Espuma batida no pé da queda: disco irregular com um morrote de água revolta no meio."""
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap'); c = Vector(centro)
    rot = Matrix.Rotation(rz, 3, 'Z'); ring = []
    centro_v = bm.verts.new(c + Vector((0, 0, alt)))
    for k in range(1, nr + 1):
        row = []
        for j in range(na):
            a = 2 * math.pi * j / na; f = k / nr
            rr = raio * f * (1 + 0.28 * noise.noise(Vector((math.cos(a) * 2, math.sin(a) * 2, seed))) * f)
            h = alt * (1 - f ** 1.6) * (0.65 + 0.35 * noise.noise(Vector((math.cos(a) * 3, k, seed + 1))))
            p = rot @ Vector((math.cos(a) * rr * esc[0], math.sin(a) * rr * esc[1], 0))
            row.append(bm.verts.new(c + p + Vector((0, 0, max(0.02, h)))))
        ring.append(row)
    def uvp(v): return ((v.co.x - c.x) / 3.0, (v.co.y - c.y) / 3.0)
    for j in range(na):
        f = bm.faces.new([centro_v, ring[0][j], ring[0][(j + 1) % na]])
    for k in range(nr - 1):
        for j in range(na):
            bm.faces.new([ring[k][j], ring[k + 1][j], ring[k + 1][(j + 1) % na], ring[k][(j + 1) % na]])
    for f in bm.faces:
        for lp in f.loops: lp[uvl].uv = uvp(lp.vert)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        if f.normal.z < 0: f.normal_flip()
    o = objeto(nome, bm, col, mat)
    for p in o.data.polygons: p.use_smooth = True
    return o

# ---------------------------------------------------------------- ponte em arco (coordenadas desenroladas s,d,z -> cilindro)
def entorta(bm, r0):
    """(s, d, z) -> mundo: s = arco no raio r0 (positivo para +X), d = recuo radial (0 = face do salão)."""
    for v in bm.verts:
        s, d, z = v.co
        a = s / r0; r = r0 + d
        v.co = Vector((r * math.sin(a), r * math.cos(a), z))

def varre(bm, s0, s1, perfil, ns=None, passo=0.3):
    """Prisma: perfil fechado [(d, z)] varrido ao longo de s (com divisões para curvar)."""
    ns = ns or max(1, int(abs(s1 - s0) / passo))
    rings = [[bm.verts.new((s0 + (s1 - s0) * i / ns, d, z)) for d, z in perfil] for i in range(ns + 1)]
    m = len(perfil)
    for i in range(ns):
        for j in range(m):
            bm.faces.new([rings[i][j], rings[i][(j + 1) % m], rings[i + 1][(j + 1) % m], rings[i + 1][j]])
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])

def caixa_l(bm, s0, s1, d0, d1, z0, z1, passo=0.3):
    varre(bm, s0, s1, [(d0, z0), (d1, z0), (d1, z1), (d0, z1)], passo=passo)

def placa_xz(bm, pts, d0, d1):
    """Polígono no plano (s, z) extrudado em d (para emblema e chapas)."""
    f = bm.faces.new([bm.verts.new((s, d0, z)) for s, z in pts])
    bmesh.ops.recalc_face_normals(bm, faces=[f])
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    nv = [g for g in r['geom'] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=nv, vec=(0, d1 - d0, 0))

BAT = [[0, 0.17], [0.045, 0.40], [0.085, 0.19], [0.13, 0.15], [0.32, 0.27], [0.58, 0.40], [0.84, 0.52], [1.0, 0.62],
       [0.95, 0.30], [0.87, 0.07], [0.77, 0.15], [0.69, -0.02], [0.59, 0.08], [0.49, -0.11], [0.39, -0.01], [0.29, -0.17], [0.19, -0.07], [0.09, -0.22], [0, -0.40]]
def morcego_pts(w, cs=0.0, cz=0.0):
    pts = [(x * w, y * w) for x, y in BAT] + [(-x * w, y * w) for x, y in reversed(BAT[1:-1])]
    return [(cs + x, cz + z) for x, z in pts]

def fecha_obj(nome, bm, col, mat, r0, bev=0.0):
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bev > 0:
        ed = [e for e in bm.edges if e.is_manifold and e.calc_face_angle(0) > 0.9]
        if ed: bmesh.ops.bevel(bm, geom=ed, offset=bev, segments=2, affect='EDGES', profile=0.5, clamp_overlap=True)
    entorta(bm, r0)
    o = objeto(nome, bm, col, mat)
    return o

def ponte(tag, col, M, r0, ytop, z_pe, D=2.4, flecha=2.8, phi_meio=5.5, pilar=0.85):
    """Ponte em arco na frente da cachoeira: tabuleiro (r0..r0+D, |φ|<=phi_meio, topo em ytop), corpo com arco
    vazado, arquivolta, LEDs ciano verticais nos tímpanos, chave com o morcego, guarda-corpos de vidro nos dois lados."""
    ss = r0 * math.radians(phi_meio); so = ss + pilar
    zb = ytop - 0.8; zc = zb - 0.75; zs = zc - flecha
    misula = z_pe is None
    na = 28
    arco = [(ss * math.cos(math.pi * (1 - k / na)), zs + flecha * math.sin(math.pi * (1 - k / na))) for k in range(na + 1)]
    # --- corpo (aço escuro): contorno inferior da esquerda para a direita
    if z_pe is None:   # sem pilar até embaixo: mísula inclinada do pé do arco até o tabuleiro
        cont = [(-so, zb - 0.55), (-ss, zs - 0.25)] + arco + [(ss, zs - 0.25), (so, zb - 0.55)]
    else:
        cont = [(-so, z_pe), (-ss, z_pe)] + arco + [(ss, z_pe), (so, z_pe)]
    den = []
    for a, b in zip(cont, cont[1:]):
        k = max(1, int(abs(b[0] - a[0]) / 0.3))
        for i in range(k): den.append((a[0] + (b[0] - a[0]) * i / k, a[1] + (b[1] - a[1]) * i / k))
    den.append(cont[-1])
    bm = bmesh.new(); topo = {}
    def tv(s, d):
        k = (round(s, 4), d)
        if k not in topo: topo[k] = bm.verts.new((s, d, zb))
        return topo[k]
    fr = [bm.verts.new((s, 0.0, z)) for s, z in den]; bk = [bm.verts.new((s, D, z)) for s, z in den]
    for i in range(len(den) - 1):
        (s0, z0), (s1, z1) = den[i], den[i + 1]
        if abs(s1 - s0) > 1e-5:
            bm.faces.new([fr[i], fr[i + 1], tv(s1, 0.0), tv(s0, 0.0)])
            bm.faces.new([bk[i + 1], bk[i], tv(s0, D), tv(s1, D)])
            bm.faces.new([tv(s0, 0.0), tv(s1, 0.0), tv(s1, D), tv(s0, D)])
        bm.faces.new([fr[i + 1], fr[i], bk[i], bk[i + 1]])
    bm.faces.new([fr[0], tv(den[0][0], 0.0), tv(den[0][0], D), bk[0]])
    bm.faces.new([bk[-1], tv(den[-1][0], D), tv(den[-1][0], 0.0), fr[-1]])
    corpo = fecha_obj(f'A_AGUA_ponte{tag}_corpo', bm, col, M['metal'], r0, bev=0.05); uv_mundo(corpo, 2.0)
    # --- tabuleiro (chapa de piso em cima), só dentro do vão |φ|<=phi_meio (as galerias seguem fora)
    bm = bmesh.new(); caixa_l(bm, -ss, ss, -0.18, D + 0.12, zb, ytop, passo=0.3)
    tab = fecha_obj(f'A_AGUA_ponte{tag}_tabuleiro', bm, col, M['metal'], r0)
    tab.data.materials.append(M['piso'])
    for p in tab.data.polygons:
        if p.normal.z > 0.9: p.material_index = 1
    uv_mundo(tab, 1.6)
    # --- arquivolta (anel saliente em volta do arco) e nervura da borda do tabuleiro
    bm = bmesh.new()
    def anel(off0, off1, d0, d1):
        pin, pout = [], []
        for k in range(na + 1):
            t = math.pi * (1 - k / na); s, z = ss * math.cos(t), zs + flecha * math.sin(t)
            nx, nz = math.cos(t) / ss, math.sin(t) / flecha; ln = math.hypot(nx, nz); nx, nz = nx / ln, nz / ln
            pin.append((s + nx * off0, z + nz * off0)); pout.append((s + nx * off1, z + nz * off1))
        for k in range(na):
            q = [(pin[k], pin[k + 1], pout[k + 1], pout[k])]
            for a_, b_, c_, d_ in q:
                vf = [bm.verts.new((p[0], d0, p[1])) for p in (a_, b_, c_, d_)]
                vb = [bm.verts.new((p[0], d1, p[1])) for p in (a_, b_, c_, d_)]
                bm.faces.new(vf[::-1]); bm.faces.new(vb)
                for i in range(4): bm.faces.new([vf[i], vf[(i + 1) % 4], vb[(i + 1) % 4], vb[i]])
    anel(0.0, 0.5, -0.22, 0.02)
    caixa_l(bm, -so, so, -0.32, -0.12, zb - 0.12, zb + 0.15)          # cornija sob o tabuleiro
    for sgn in (-1, 1):                                                 # pilastras nos pés do arco
        zp = zs - 0.9 if misula else z_pe
        caixa_l(bm, sgn * ss - 0.05 if sgn > 0 else -ss - 0.55, sgn * ss + 0.55 if sgn > 0 else -ss + 0.05, -0.3, 0.05, zp, zs + 0.1, passo=1)
    arq = fecha_obj(f'A_AGUA_ponte{tag}_arquivolta', bm, col, M['grafite'], r0, bev=0.02)
    # --- LEDs: fio no intradorso, réguas verticais nos tímpanos e nas pilastras, linha na borda do tabuleiro
    bm = bmesh.new()
    pin = []
    for k in range(na + 1):
        t = math.pi * (1 - k / na); s, z = ss * math.cos(t), zs + flecha * math.sin(t)
        nx, nz = math.cos(t) / ss, math.sin(t) / flecha; ln = math.hypot(nx, nz)
        pin.append((s + nx / ln * 0.08, z + nz / ln * 0.08))
    for k in range(na):
        (s0, z0), (s1, z1) = pin[k], pin[k + 1]
        vf = [bm.verts.new((s0, -0.25, z0)), bm.verts.new((s1, -0.25, z1)), bm.verts.new((s1, -0.25, z1 + 0.07)), bm.verts.new((s0, -0.25, z0 + 0.07))]
        bm.faces.new(vf)
    def z_arco(s):
        if abs(s) >= ss: return (zs - 0.25 + (zb - 0.55 - zs + 0.25) * (abs(s) - ss) / pilar) if misula else z_pe
        return zs + flecha * math.sqrt(max(0, 1 - (s / ss) ** 2))
    s = ss * 0.5
    while s < so - 0.15:
        for sgn in (-1, 1):
            z0 = max(z_arco(s), z_arco(s + 0.09)) + 0.65; z1 = zb - 0.35
            if abs(s) > ss and not misula: z0 = max(z0, z_pe + 0.4)
            if z1 - z0 > 0.4: caixa_l(bm, sgn * s - 0.045, sgn * s + 0.045, -0.06, -0.02, z0, z1, passo=1)
        s += 0.34
    caixa_l(bm, -ss, ss, -0.34, -0.3, zb + 0.0, zb + 0.06)            # linha de LED na borda
    for d in (-0.06, D + 0.0):
        caixa_l(bm, -ss, ss, d - 0.03 if d < 0 else d, d + 0.0 if d < 0 else d + 0.03, ytop + 0.08, ytop + 0.12)  # pé do vidro
    led = fecha_obj(f'A_AGUA_ponte{tag}_led', bm, col, M['led'], r0)
    # --- chave do arco: chapa sextavada com borda de LED e o morcego aceso
    zm = zc + 0.05
    hexa = [(-1.45, zm), (-1.15, zm + 0.62), (1.15, zm + 0.62), (1.45, zm), (1.15, zm - 0.62), (-1.15, zm - 0.62)]
    grande = [(x * 1.07, zm + (z - zm) * 1.14) for x, z in hexa]
    bm = bmesh.new(); placa_xz(bm, hexa, -0.42, 0.6)
    chave = fecha_obj(f'A_AGUA_ponte{tag}_chave', bm, col, M['grafite'], r0, bev=0.03)
    bm = bmesh.new(); placa_xz(bm, grande, -0.36, 0.55); placa_xz(bm, morcego_pts(1.08, 0.0, zm - 0.02), -0.5, -0.4)
    fecha_obj(f'A_AGUA_ponte{tag}_emblema', bm, col, M['led'], r0)
    # --- guarda-corpos: montantes, corrimão, travessa, vidro (os dois lados)
    bm = bmesh.new(); bmv = bmesh.new()
    for d in (0.02, D - 0.12):
        n = max(2, int(2 * ss / 1.15))
        for i in range(n + 1):
            s = -ss + 2 * ss * i / n
            caixa_l(bm, s - 0.05, s + 0.05, d, d + 0.1, ytop, ytop + 1.12, passo=1)
        varre(bm, -ss, ss, [(d - 0.02, ytop + 1.1), (d + 0.12, ytop + 1.1), (d + 0.12, ytop + 1.2), (d - 0.02, ytop + 1.2)])
        caixa_l(bm, -ss, ss, d + 0.02, d + 0.08, ytop + 0.1, ytop + 0.16)
        caixa_l(bmv, -ss, ss, d + 0.04, d + 0.06, ytop + 0.16, ytop + 1.08)
    fecha_obj(f'A_AGUA_ponte{tag}_guarda', bm, col, M['grafite'], r0)
    fecha_obj(f'A_AGUA_ponte{tag}_vidro', bmv, col, M['vidro'], r0)
    # --- vigas por baixo do tabuleiro (na sombra do arco)
    bm = bmesh.new()
    for s in (-ss * 0.66, -ss * 0.33, 0, ss * 0.33, ss * 0.66):
        caixa_l(bm, s - 0.1, s + 0.1, 0.1, D - 0.1, zb - 0.32, zb, passo=1)
    fecha_obj(f'A_AGUA_ponte{tag}_vigas', bm, col, M['grafite'], r0)
    return dict(ss=ss, so=so, zb=zb, zc=zc, zs=zs)

# ---------------------------------------------------------------- leito rochoso atrás da queda central
def leito(nome, col, M, phi0=-9.5, phi1=9.5, z0=-1.5, z1=27.0):
    def rb(z):  # recuo do fundo: três degraus que avançam para baixo
        def sm(a, b, x): t = max(0, min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t)
        return 36.75 + 0.55 * sm(6.6, 8.2, z) + 0.75 * sm(14.6, 16.2, z)
    bm = bmesh.new(); nf, nz = 36, 62
    vs = []
    for i in range(nz + 1):
        z = z0 + (z1 - z0) * i / nz; row = []
        for j in range(nf + 1):
            f = phi0 + (phi1 - phi0) * j / nf
            x = abs(f) / max(abs(phi0), abs(phi1))
            n = noise.fractal(Vector((f * 0.35, z * 0.32, 4.0)), 1.0, 2.0, 4)
            saw = ((z * 0.9 + 0.6 * noise.noise(Vector((f * 0.2, z * 0.1, 9)))) % 1.0) - 0.5
            r = rb(z) + 0.45 * n + 0.16 * saw - 1.6 * max(0, x - 0.55) ** 1.5 * (1 if z > 0 else 0)
            row.append(bm.verts.new(P(r, f, z)))
        vs.append(row)
    for i in range(nz):
        for j in range(nf):
            bm.faces.new([vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = objeto(nome, bm, col, M['rocha']); o.data.materials.append(M['musgo'])
    # face do leito olha para o salão (-radial)
    me = o.data; me.update()
    if sum(p.normal.y for p in me.polygons) > 0:
        for p in me.polygons: p.flip()
    for p in me.polygons:
        if p.normal.z > 0.45 and noise.noise(p.center * 0.4) > 0.05: p.material_index = 1
    uv_mundo(o, 3.0); suaviza(o); return o

# ---------------------------------------------------------------- fundo do lago
def fundo_lago(nome, col, M):
    bm = bmesh.new(); nr, na = 26, 96; r0, r1 = 11.6, 47.0
    vs = []
    for k in range(nr + 1):
        r = r0 + (r1 - r0) * (k / nr) ** 0.9; row = []
        for j in range(na):
            a = 2 * math.pi * j / na
            x, y = r * math.sin(a), r * math.cos(a)
            n = noise.fractal(Vector((x * 0.09, y * 0.09, 2.0)), 1.0, 2.0, 4)
            z = -2.6 + 0.7 * n + 1.8 * max(0, (r - 37) / 10) + 1.4 * max(0, (13.5 - r) / 2)
            row.append(bm.verts.new((x, y, min(z, -0.7))))
        vs.append(row)
    for k in range(nr):
        for j in range(na):
            bm.faces.new([vs[k][j], vs[k][(j + 1) % na], vs[k + 1][(j + 1) % na], vs[k + 1][j]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        if f.normal.z < 0: f.normal_flip()
    o = objeto(nome, bm, col, M['rocha']); uv_mundo(o, 4.0); suaviza(o, 1.0); return o

# ---------------------------------------------------------------- cristais
def cristais(nome, col, M, centros, seed=3):
    rnd = random.Random(seed); bm = bmesh.new()
    for (c, esc) in centros:
        for k in range(rnd.randint(4, 7)):
            h = esc * rnd.uniform(0.5, 1.3); rr = esc * rnd.uniform(0.07, 0.13)
            g = bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=rr, radius2=rr * 0.9, depth=h)
            tip = bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=rr * 0.9, radius2=0.0, depth=h * 0.35)
            vs = g['verts'] + tip['verts']
            bmesh.ops.translate(bm, verts=tip['verts'], vec=(0, 0, h * 0.5 + h * 0.175))
            m = Matrix.Translation(c) @ Matrix.Rotation(rnd.uniform(0, 6.28), 4, 'Z') @ Matrix.Rotation(rnd.uniform(-0.55, 0.55), 4, 'X') @ Matrix.Translation((0, 0, h * 0.45))
            bmesh.ops.transform(bm, matrix=m, verts=vs)
    o = objeto(nome, bm, col, M['cristal']); return o

def topo_em(x, y, z_alto=40.0, ign=()):
    dg = bpy.context.evaluated_depsgraph_get(); bpy.context.view_layer.update()
    ok, loc, nrm, idx, ob, mtx = bpy.context.scene.ray_cast(dg, Vector((x, y, z_alto)), Vector((0, 0, -1)))
    return loc.z if ok else None

# ================================================================= CENA
def cachoeira_central(col, M):
    leito('A_AGUA_leito_central', col, M)
    # --- topo: boca de rocha sob o morcego, com laje saliente (a água nasce por baixo dela)
    rocha('A_AGUA_r_boca', col, M, P(37.3, 0, 25.15), (8.2, 2.6, 1.5), seed=11, rz=0, topo=True, estrato=0.1, alvo=1100, caixa=0.5)
    rocha('A_AGUA_r_boca_e', col, M, P(37.9, -5.2, 25.6), (4.4, 2.8, 2.8), seed=12, rz=0.15, alvo=900)
    rocha('A_AGUA_r_boca_d', col, M, P(37.9, 5.4, 25.4), (4.2, 2.8, 2.6), seed=13, rz=-0.15, alvo=900)
    rocha('A_AGUA_r_boca_c', col, M, P(38.2, 0.0, 26.9), (6.0, 2.4, 1.6), seed=14, alvo=700)
    # --- degrau 1 (24 -> 15.5): três fios entre pilares de rocha
    xs1 = [(-2.25, 2.3), (0.05, 2.9), (2.3, 2.1)]
    for i, (x, w) in enumerate(xs1):
        f = phi_x(x, 37.2); lado = P(1, f + 90, 0); lado.z = 0; fr = -P(1, f, 0)
        pts = [P(37.7, f, 24.45), P(37.05, f, 24.2), P(36.95, f, 22.4), P(37.0, f, 20.3), P(36.7, f, 19.7), P(36.85, f, 18.9), P(36.95, f, 15.55)]
        lamina(f'AGUA_central_1_{i}', col, M['agua'], pts, [w * 0.85, w * 0.9, w, w, w * 1.05, w * 1.05, w * 1.1], lado, fr, seed=i + 1, bojo=0.18)
    for i, x in enumerate((-1.1, 1.15)):
        rocha(f'A_AGUA_r_pilar1_{i}', col, M, P(37.35, phi_x(x, 37.3), 19.6), (0.9, 1.4, 7.6), seed=20 + i, alvo=700, estrato=0.12, musgo=0.4)
    rocha('A_AGUA_r_faixa1', col, M, P(37.45, 0, 20.1), (6.6, 1.3, 0.75), seed=23, alvo=600, topo=True, musgo=0.5, caixa=0.5)
    # ombreiras do degrau 1: lajes empilhadas (não invadem o passeio da galeria superior abaixo de z=18)
    for sgn in (-1, 1):
        f = sgn * 6.3; pilha(f'omb1_{sgn + 1}', col, M, P(38.8, f, 0), 15.3, 26.6, 3.2, 2.4, -math.radians(f), 30 + sgn, frente=-P(1, f, 0))
        f = sgn * 4.4; pilha(f'omb1i_{sgn + 1}', col, M, P(37.95, f, 0), 18.2, 24.6, 1.7, 1.8, -math.radians(f), 40 + sgn, frente=-P(1, f, 0), musgo=0.5)
    # bacia 1 (laje escalonada atrás da ponte superior)
    rocha('A_AGUA_r_bacia1', col, M, P(37.55, 0, 14.95), (7.6, 1.8, 1.1), seed=40, topo=True, alvo=1000, musgo=0.45, estrato=0.1, caixa=0.5)
    rocha('A_AGUA_r_bacia1_e', col, M, P(37.3, -4.2, 14.55), (2.5, 2.2, 1.5), seed=41, topo=True, alvo=700, musgo=0.6, caixa=0.5)
    rocha('A_AGUA_r_bacia1_d', col, M, P(37.3, 4.3, 14.6), (2.4, 2.1, 1.4), seed=42, topo=True, alvo=700, musgo=0.6, caixa=0.5)
    bacia('AGUA_bacia_1', col, M['agua'], -4.0, 4.0, 37.75, 36.8, 15.52)
    # --- degrau 2 (15.5 -> 7.4): três fios, faixa de rocha no meio da queda
    xs2 = [(-1.95, 2.1), (0.0, 2.3), (1.95, 2.0)]
    for i, (x, w) in enumerate(xs2):
        f = phi_x(x, 36.6); lado = P(1, f + 90, 0); lado.z = 0; fr = -P(1, f, 0)
        pts = [P(37.1, f, 15.56), P(36.72, f, 15.46), P(36.6, f, 14.8), P(36.6, f, 12.4), P(36.62, f, 11.4), P(36.25, f, 10.75), P(36.2, f, 10.2), P(36.18, f, 7.45)]
        lamina(f'AGUA_central_2_{i}', col, M['agua'], pts, [w * 0.9, w, w, w * 1.05, w * 1.1, w * 1.1, w * 1.15, w * 1.2], lado, fr, seed=10 + i, bojo=0.16)
    for i, x in enumerate((-0.98, 0.98)):
        rocha(f'A_AGUA_r_pilar2_{i}', col, M, P(36.95, phi_x(x, 36.9), 12.6), (0.75, 1.3, 5.2), seed=50 + i, alvo=650, estrato=0.12, musgo=0.4)
    rocha('A_AGUA_r_faixa2', col, M, P(36.95, 0, 10.55), (6.4, 1.45, 0.8), seed=53, alvo=650, topo=True, musgo=0.55, caixa=0.5)
    for sgn in (-1, 1):
        f = sgn * 6.0; pilha(f'omb2_{sgn + 1}', col, M, P(38.3, f, 0), 9.9, 14.25, 2.8, 2.3, -math.radians(f), 60 + sgn, frente=-P(1, f, 0))
        f = sgn * 4.25; pilha(f'omb2i_{sgn + 1}', col, M, P(37.45, f, 0), 9.95, 14.0, 1.5, 1.6, -math.radians(f), 64 + sgn, frente=-P(1, f, 0), musgo=0.5)
    # bacia 2 (laje atrás da ponte inferior)
    rocha('A_AGUA_r_bacia2', col, M, P(36.8, 0, 6.85), (8.2, 2.0, 1.1), seed=70, topo=True, alvo=1000, musgo=0.45, estrato=0.1, caixa=0.5)
    rocha('A_AGUA_r_bacia2_e', col, M, P(36.6, -5.0, 6.4), (2.6, 2.3, 1.7), seed=71, topo=True, alvo=700, musgo=0.6, caixa=0.5)
    rocha('A_AGUA_r_bacia2_d', col, M, P(36.6, 5.1, 6.5), (2.5, 2.3, 1.6), seed=72, topo=True, alvo=700, musgo=0.6, caixa=0.5)
    bacia('AGUA_bacia_2', col, M['agua'], -4.4, 4.4, 37.0, 35.85, 7.43)
    # --- degrau 3 (7.4 -> lago): lâmina larga entre os pilares da ponte inferior
    f = 0.0; lado = Vector((1, 0, 0)); fr = Vector((0, -1, 0))
    pts = [Vector((0, 36.4, 7.44)), Vector((0, 35.82, 7.38)), Vector((0, 35.72, 6.9)), Vector((0, 35.68, 4.2)), Vector((0, 35.62, 2.7)),
           Vector((0, 35.3, 2.0)), Vector((0, 35.05, 1.0)), Vector((0, 34.9, -0.35))]
    lamina('AGUA_central_3', col, M['agua'], pts, [6.4, 6.6, 6.8, 6.9, 7.0, 7.1, 7.3, 7.5], lado, fr, nu=16, seed=21, bojo=0.25)
    rocha('A_AGUA_r_faixa3', col, M, P(36.35, 0, 3.15), (5.6, 1.3, 0.7), seed=73, alvo=600, topo=True, musgo=0.4, caixa=0.5)
    # fios laterais do pé (escorrem pelas rochas grandes, fora dos pilares)
    for sgn, x, w, ztop in ((-1, -7.2, 2.0, 5.2), (1, 7.6, 2.4, 5.4)):
        fl = phi_x(x, 35.0); lado = P(1, fl + 90, 0); lado.z = 0; fr = -P(1, fl, 0)
        pts = [P(36.6, fl, ztop + 0.05), P(35.7, fl, ztop - 0.1), P(35.3, fl, ztop - 1.2), P(34.95, fl, 2.1), P(34.2, fl, 1.2), P(33.6, fl, -0.3)]
        lamina(f'AGUA_central_pe_{"e" if sgn < 0 else "d"}', col, M['agua'], pts, [w * 0.8, w, w, w * 1.1, w * 1.2, w * 1.3], lado, fr, seed=30 + sgn, bojo=0.12)
    # --- massas de rocha nos dois lados do pé (sob a galeria inferior, topo < 5.8), com musgo e cristais
    lados = {
        -1: [((35.9, -9.4, 2.0), (4.8, 4.2, 6.2)), ((33.2, -12.4, 0.9), (4.6, 4.0, 3.8)), ((30.9, -8.6, -0.1), (3.6, 3.2, 2.2)),
             ((32.0, -16.4, 0.2), (3.2, 3.0, 2.6)), ((34.7, -6.8, 1.6), (2.6, 2.4, 5.4)),
             ((33.6, -5.4, -0.1), (2.0, 2.0, 1.6)), ((28.6, -9.6, -0.4), (4.0, 3.4, 2.2)), ((27.6, -13.2, -0.6), (3.0, 2.8, 1.6))],
        1: [((35.8, 9.9, 1.9), (4.6, 4.4, 6.0)), ((33.0, 12.0, 0.8), (4.4, 4.0, 3.6)), ((31.2, 9.0, 0.1), (3.4, 3.4, 2.6)),
            ((32.1, 15.8, 0.0), (3.4, 2.8, 2.4)), ((34.8, 7.0, 1.5), (2.6, 2.4, 5.2)),
            ((33.7, 5.5, -0.15), (2.0, 1.9, 1.5)), ((28.8, 9.8, -0.4), (3.8, 3.4, 2.1)), ((27.4, 13.0, -0.6), (3.2, 2.6, 1.7))],
    }
    for sgn in (-1, 1):
        f = sgn * 14.2; pilha(f'pe_pen_{sgn + 1}', col, M, P(36.9, f, 0), -1.4, 5.7, 4.8, 3.4, -math.radians(f), 90 + sgn, frente=-P(1, f, 0), musgo=0.45, alvo=1100)
    sd = 80
    for sgn, lst in lados.items():
        for (r, f, z), dims in lst:
            zz = min(z, 5.8 - dims[2] / 2)
            rocha(f'A_AGUA_r_pe_{sd}', col, M, P(r, f, zz), dims, seed=sd, rz=sd * 0.7, alvo=1300, musgo=0.55, estrato=0.09); sd += 1
    # agulhas de rocha nos flancos do pé (as pontas escuras ao lado da queda na arte)
    for k, (r, f, h) in enumerate([(31.2, -11.6, 4.2), (30.6, -12.6, 3.0), (31.9, -10.4, 2.6), (31.0, 12.4, 3.4), (30.4, 13.4, 2.4)]):
        p = P(r, f, 0); z = topo_em(p.x, p.y, 6.5); z = (z if z is not None else 0.0) - 0.4
        rocha(f'A_AGUA_r_agulha_{k}', col, M, (p.x, p.y, z + h / 2), (0.9 + h * 0.12, 0.9 + h * 0.1, h), seed=140 + k, rz=k, cortes=9, alvo=420, musgo=0.2, estrato=0.12, base=True)
    # pedras soltas no pé da queda (meio afogadas)
    for k, (x, y, z, s) in enumerate([(-2.6, 33.6, -0.25, 1.1), (2.9, 33.4, -0.3, 1.25), (-1.0, 32.6, -0.55, 0.8), (1.6, 32.2, -0.6, 0.7),
                                      (-4.3, 32.2, -0.35, 1.0), (4.6, 32.0, -0.4, 1.1)]):
        rocha(f'A_AGUA_r_solta_{k}', col, M, (x, y, z), (s * 1.5, s * 1.2, s), seed=120 + k, rz=k, alvo=500, musgo=0.3)
    espuma('AGUA_espuma_central', col, M['espuma'], (0, 34.1, 0.02), 3.4, seed=1, alt=0.45, esc=(1.35, 0.75))
    espuma('AGUA_espuma_central_pe_e', col, M['espuma'], P(33.4, phi_x(-6.9, 33.4), 0.02), 1.3, seed=2, alt=0.25)
    espuma('AGUA_espuma_central_pe_d', col, M['espuma'], P(33.4, phi_x(7.3, 33.4), 0.02), 1.5, seed=3, alt=0.25)
    espuma('AGUA_espuma_bacia_1', col, M['espuma'], P(37.05, 0, 15.53), 1.3, seed=4, alt=0.18, esc=(2.6, 0.45))
    espuma('AGUA_espuma_bacia_2', col, M['espuma'], P(36.3, 0, 7.44), 1.3, seed=5, alt=0.18, esc=(2.9, 0.45))

def cristais_pe(col, M):
    alvos = []
    for (r, f, esc) in [(31.6, -10.2, 1.1), (33.6, -7.4, 0.8), (31.8, 10.6, 1.2), (34.0, 7.8, 0.75), (30.8, -15.8, 0.8), (31.3, 15.4, 0.9)]:
        p = P(r, f, 0); z = topo_em(p.x, p.y, 6.0)
        if z is not None: alvos.append((Vector((p.x, p.y, z - 0.1)), esc))
    if alvos: cristais('A_AGUA_cristais', col, M, alvos)

def pilha(tag, col, M, base, z0, z1, w, d, rz, seed, frente=None, musgo=0.35, alvo=900):
    """Rocha escalonada: lajes empilhadas de 1.1–2.3 m, cada uma deslocada (basalto em camadas)."""
    rnd = random.Random(seed); z = z0; k = 0
    fr = Vector(frente) if frente is not None else Vector((math.sin(rz + math.pi / 2), -math.cos(rz + math.pi / 2), 0))
    lado = Vector((math.cos(rz), math.sin(rz), 0))
    while z < z1 - 0.4:
        h = min(z1 - z, rnd.uniform(0.9, 2.6))
        c = Vector(base) + fr * rnd.uniform(-0.5, 0.45) + lado * rnd.uniform(-0.45, 0.45) + Vector((0, 0, z + h / 2))
        rocha(f'A_AGUA_r_{tag}_{k}', col, M, c, (w * rnd.uniform(0.72, 1.12), d * rnd.uniform(0.8, 1.15), h * 1.1), seed=seed * 31 + k,
              rz=rz + rnd.uniform(-0.2, 0.2), topo=True, cortes=8, alvo=alvo, musgo=musgo, estrato=0.06, liso=0.1, caixa=0.42)
        z += h; k += 1

def queda_degraus(tag, col, M, lips, pe, larg, h=None, frente=None, seed=1, extra_borda=2.2, fundo=3.0, topo_extra=3.5, larg_rocha=3.4):
    """Queda que desce por lajes escalonadas. lips = [(xy, z_topo_do_degrau)] de cima para baixo; pe = xy do pé no lago.
    h = direção horizontal do fluxo (default: do primeiro lábio para o pé). Cada degrau é um bloco que vai do
    ponto onde a água cai (ou do fundo) até o lábio; bordas de rocha mais altas dos dois lados; penhasco aatras e acima."""
    xy = [Vector((p.x, p.y, 0)) for p, _ in lips]; zs_ = [z for _, z in lips]
    pe = Vector((pe.x, pe.y, 0))
    h = (h or (pe - xy[0])).normalized(); lado = Vector((-h.y, h.x, 0)); rz = math.atan2(lado.y, lado.x)
    fr = Vector(frente).normalized() if frente is not None else h
    # caminho da água
    pts = [xy[0] - h * 1.3 + Vector((0, 0, zs_[0] + 0.14)), xy[0] - h * 0.3 + Vector((0, 0, zs_[0] + 0.1))]
    ws = [larg[0] * 0.85, larg[0] * 0.95]; pousos = []
    for i in range(len(xy)):
        z_baixo = zs_[i + 1] if i + 1 < len(xy) else -0.4
        lip = xy[i]
        pts += [lip + h * 0.12 + Vector((0, 0, zs_[i] + 0.04)), lip + h * 0.42 + Vector((0, 0, zs_[i] - 0.55))]
        pouso = lip + h * 0.62
        pts += [pouso + Vector((0, 0, z_baixo + (0.6 if i + 1 < len(xy) else 0.2)))]
        if i + 1 < len(xy): pts += [pouso + h * 0.35 + Vector((0, 0, z_baixo + 0.08))]
        else: pts += [pouso + h * 0.25 + Vector((0, 0, -0.4))]
        pousos.append(pouso)
        w0 = larg[min(i, len(larg) - 1)]; w1 = larg[min(i + 1, len(larg) - 1)]
        ws += [w0, w0 * 1.04, w1 * 0.97, w1]
    lamina(f'AGUA_{tag}', col, M['agua'], pts, ws, lado, fr, nu=12, seed=seed, bojo=0.22, ondula=0.08)
    # blocos dos degraus
    for i in range(len(xy)):
        ini = (pousos[i - 1] - h * 1.0) if i > 0 else (xy[0] - h * fundo)
        fim = xy[i]
        dlen = max(1.6, (fim - ini).dot(h)); c = fim - h * (dlen / 2)
        zt = zs_[i]; zb = (zs_[i + 1] - 0.6) if i + 1 < len(xy) else -1.6
        W = larg[min(i, len(larg) - 1)] + larg_rocha
        rocha(f'A_AGUA_r_{tag}_deg{i}', col, M, Vector((c.x, c.y, (zt + zb) / 2)), (W, dlen, zt - zb), seed=seed * 50 + i, rz=rz,
              topo=True, alvo=1200, musgo=0.65, estrato=0.06, liso=0.1, cortes=8, caixa=0.45)
        # bordas (dos dois lados do canal), mais altas que o degrau
        for sgn in (-1, 1):
            wb = 1.8 + (i % 2) * 0.5
            dentro = (lado * sgn).dot(fr) > 0.35        # margem do lado do salão fica baixa (a água aparece)
            hb = (zt - zb) + (0.35 if dentro else extra_borda + (0.8 if sgn > 0 else 0))
            cb = c + lado * sgn * (W / 2 + wb / 2 - 0.9) - h * 0.3
            rocha(f'A_AGUA_r_{tag}_borda{i}_{sgn + 1}', col, M, Vector((cb.x, cb.y, zb + hb / 2)), (wb, dlen + 0.8, hb), seed=seed * 70 + i * 3 + sgn,
                  rz=rz + sgn * 0.08, topo=True, alvo=900, musgo=0.5, estrato=0.07, liso=0.12, cortes=8, caixa=0.5)
    # penhasco aatras e acima da nascente (lajes empilhadas)
    atras = xy[0] - h * (fundo + 0.9)
    pilha(f'{tag}_pen', col, M, atras, -1.0, zs_[0] + topo_extra, larg[0] + 5.5, 2.6, rz, seed * 9, frente=h, musgo=0.25, alvo=1000)
    topo = xy[0] - h * (fundo * 0.55)
    rocha(f'A_AGUA_r_{tag}_boca', col, M, Vector((topo.x, topo.y, zs_[0] + 0.95)), (larg[0] + 2.6, fundo * 0.9, 1.6), seed=seed * 13, rz=rz,
          topo=True, alvo=900, musgo=0.4, estrato=0.08, cortes=5)
    espuma(f'AGUA_espuma_{tag}', col, M['espuma'], pousos[-1] + h * 0.5 + Vector((0, 0, 0.02)), max(larg) * 0.6, seed=seed, alt=0.4)
    for i in range(len(xy) - 1):
        espuma(f'AGUA_espuma_{tag}_{i + 1}', col, M['espuma'], pousos[i] + Vector((0, 0, zs_[i + 1] + 0.05)), larg[i] * 0.45, seed=seed + i, alt=0.15, nr=4, na=20)
    return h, lado

def laterais(col, M):
    # (34, 26) three: queda alta da direita, quatro degraus que avançam para o lago
    pe = B(34, 26); o = Vector((pe.x, pe.y, 0)).normalized(); fr = -o
    lips = [(pe - fr * (6.0 - a), z) for a, z in ((0.0, 19.6), (1.6, 14.0), (3.2, 8.9), (4.8, 3.6))]
    queda_degraus('direita', col, M, lips, pe, [3.3, 3.8, 4.3, 4.9, 5.4], h=fr, frente=fr, seed=7, topo_extra=4.0)
    # (-30, 24) three: queda curta da esquerda (perto da garagem)
    pe = B(-30, 24); o = Vector((pe.x, pe.y, 0)).normalized(); fr = -o
    lips = [(pe - fr * (2.9 - a), z) for a, z in ((0.0, 6.5), (1.5, 2.9))]
    queda_degraus('esquerda', col, M, lips, pe, [3.8, 4.5, 5.2], h=fr, frente=fr, seed=9, topo_extra=2.5)
    cascata(col, M)

def cascata(col, M):
    """Cascata da direita: três blocos escalonados ao longo do penhasco (φ≈104–120°), cada degrau mais à frente.
    Cada queda olha para o salão; entre as quedas a água corre por cima do bloco (lâminas AGUA_cascata_corr_*)."""
    degs = [  # (φ do lábio, r da aresta, z do topo, φ0 do bloco, φ1 do bloco, largura da queda)
        (107.3, 40.6, 14.1, 103.5, 110.0, 2.9),
        (112.6, 39.3, 7.95, 105.0, 115.2, 3.3),
        (118.0, 38.0, 3.3, 110.0, 121.0, 3.8),
    ]
    prof = 3.8
    for i, (f, re, zt, f0, f1, w) in enumerate(degs):
        fm = (f0 + f1) / 2; rm = re + prof / 2
        arco = math.radians(f1 - f0) * rm
        pilha(f'cascata_bloco{i}', col, M, P(rm, fm, 0), -1.6, zt + 0.02, arco, prof, -math.radians(fm), 300 + i,
              frente=-P(1, fm, 0), musgo=0.55, alvo=1100)
        # queda: corre por cima até a aresta e despenca para o degrau de baixo (ou o lago)
        zb = degs[i + 1][2] if i + 1 < len(degs) else -0.4
        lado = P(1, f + 90, 0); lado.z = 0; fr = -P(1, f, 0)
        pts = [P(re + 1.0, f, zt + 0.16), P(re + 0.1, f, zt + 0.13), P(re - 0.2, f, zt - 0.3), P(re - 0.45, f, zt - 1.2),
               P(re - 0.6, f, zb + (0.6 if i + 1 < len(degs) else 0.3)), P(re - 0.75, f, zb + 0.15)]
        lamina(f'AGUA_cascata_{i}', col, M['agua'], pts, [w * 0.9, w, w * 1.03, w * 1.06, w * 1.12, w * 1.15], lado, fr, nu=12, seed=40 + i, bojo=0.2, ondula=0.07)
        if i + 1 < len(degs):
            fn, ren, ztn = degs[i + 1][0], degs[i + 1][1], degs[i + 1][2]
            # corredeira: do pouso até o lábio seguinte, por cima do bloco de baixo
            rr = ren + 0.95; n = 10
            pts = [P(rr, f + (fn - f) * k / n, ztn + 0.14) for k in range(n + 1)]
            lado_c = Vector((0, 0, 0)); 
            mid = P(1, (f + fn) / 2, 0); lado_c = Vector((mid.x, mid.y, 0))
            lamina(f'AGUA_cascata_corr_{i}', col, M['agua'], pts, [w * 0.7] * (n + 1), lado_c, Vector((0, 0, 1)), nu=8, seed=50 + i, bojo=0.05, ondula=0.03)
            espuma(f'AGUA_espuma_cascata_{i + 1}', col, M['espuma'], P(re - 0.75, f, ztn + 0.06), w * 0.42, seed=60 + i, alt=0.18, nr=4, na=20)
    # paredão atrás (borda de fora, alta) e boca de onde a água nasce
    for k, (f0, f1, z1) in enumerate([(101.0, 108.0, 19.0), (108.0, 115.0, 15.0), (115.0, 123.5, 9.5)]):
        fm = (f0 + f1) / 2; pilha(f'cascata_paredao{k}', col, M, P(45.6, fm, 0), -1.6, z1, math.radians(f1 - f0) * 45.6, 3.0,
                                 -math.radians(fm), 320 + k, frente=-P(1, fm, 0), musgo=0.3, alvo=1000)
    rocha('A_AGUA_r_cascata_boca', col, M, P(44.0, 107.3, 15.25), (4.6, 2.6, 2.3), seed=331, rz=-math.radians(107.3), topo=True, alvo=900, musgo=0.4)
    # margens do lado de dentro (baixas, para a água aparecer) nas pontas
    rocha('A_AGUA_r_cascata_ponta', col, M, P(38.6, 122.2, 0.6), (2.6, 2.6, 3.4), seed=332, rz=-math.radians(122), alvo=800, musgo=0.6)
    espuma('AGUA_espuma_cascata', col, M['espuma'], P(37.0, 118.0, 0.02), 2.4, seed=12, alt=0.35)

def lago(col, M):
    fundo_lago('A_AGUA_fundo_lago', col, M)
    rnd = random.Random(5); k = 0
    for i in range(60):
        r = rnd.uniform(14.5, 36); f = rnd.uniform(-180, 180)
        p = P(r, f, 0)
        # evita pontes (entrada, garagem, escadas φ=±43), a laje da garagem e o pé da cachoeira central
        if abs(p.x) < 4.5 and p.y < -10: continue
        if abs(p.y) < 3.5 and p.x < -10: continue
        if any(abs(((f - g + 180) % 360) - 180) < 8 and r < 26 for g in (43, -43)): continue
        if -31 < p.x < -17 and -14 < p.y < 6: continue
        s = rnd.uniform(0.7, 2.0); z = rnd.uniform(-1.6, -0.35) if rnd.random() < 0.7 else rnd.uniform(-0.6, -0.1)
        rocha(f'A_AGUA_r_lago_{k}', col, M, (p.x, p.y, z), (s * 1.6, s * 1.3, s), seed=500 + i, rz=i, alvo=380, musgo=0.25)
        k += 1
        if k >= 22: break

# ================================================================= contexto da prévia (PREV_*, não exportado)
def contexto(M):
    pc = bpy.data.collections.new('PREV_contexto'); bpy.context.scene.collection.children.link(pc)
    rk = material('PREV_rocha', 'dark_rock', tint=(0.35, 0.4, 0.5))
    # paredão r=38 com o vão da garganta
    bm = bmesh.new(); vs = {}
    for i in range(0, 47):
        z = -1 + i
        for j in range(0, 201):
            f = -150 + j * 1.5
            if abs(f) < 7.5 and z < 27: continue
            if abs(f) > 96: continue
            r = 38.3 + 0.9 * abs(noise.fractal(Vector((f * 0.2, z * 0.2, 1)), 1, 2, 3)) + 8.0 * min(1, max(0, (abs(f) - 84) / 16))
            vs[(i, j)] = bm.verts.new(P(r, f, z))
    for i in range(46):
        for j in range(200):
            q = [(i, j), (i, j + 1), (i + 1, j + 1), (i + 1, j)]
            if all(k in vs for k in q): bm.faces.new([vs[k] for k in q])
    o = objeto('PREV_parede', bm, pc, rk); uv_mundo(o, 4.0)
    gr = cor('PREV_grafite', (0.05, 0.06, 0.07), rough=0.4, metal=0.8)
    led = M['led']
    for y, rin in ((7, 33.0), (15, 34.0)):
        for sgn in (-1, 1):
            bm = bmesh.new(); caixa_l(bm, 0, 66 * math.radians(1) * rin, 0, 37.9 - rin, y - 0.8, y, passo=1.0)
            caixa_l(bm, 0, 66 * math.radians(1) * rin, 0.1, 0.2, y + 1.1, y + 1.2, passo=1.0)
            for k in range(0, 66, 3): caixa_l(bm, k * math.radians(1) * rin, k * math.radians(1) * rin + 0.08, 0.1, 0.18, y, y + 1.15, passo=1)
            if sgn < 0:
                for v in bm.verts: v.co.x = -v.co.x
            bm2 = bm
            for v in bm2.verts: v.co.x += sgn * 5.5 * math.radians(1) * rin
            bmesh.ops.recalc_face_normals(bm2, faces=bm2.faces)
            entorta(bm2, rin); objeto(f'PREV_galeria_{y}_{sgn}', bm2, pc, gr)
            bm = bmesh.new(); caixa_l(bm, 0, 66 * math.radians(1) * rin, -0.05, 0.0, y - 0.45, y - 0.38, passo=1.0)
            if sgn < 0:
                for v in bm.verts: v.co.x = -v.co.x
            for v in bm.verts: v.co.x += sgn * 5.5 * math.radians(1) * rin
            entorta(bm, rin); objeto(f'PREV_galeria_led_{y}_{sgn}', bm, pc, led)
    # escultura do morcego (proxy)
    bm = bmesh.new(); placa_xz(bm, morcego_pts(12.0, 0, 30.5), 34.0, 35.6)
    objeto('PREV_morcego', bm, pc, cor('PREV_metal', (0.06, 0.08, 0.1), rough=0.35, metal=0.95))
    bm = bmesh.new(); placa_xz(bm, morcego_pts(12.7, 0, 30.5), 35.7, 35.8)
    objeto('PREV_morcego_halo', bm, pc, cor('PREV_halo', (0.1, 0.55, 1.0), emiss=4.0))
    # plataforma central e lago espelhado
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=96, radius1=12, radius2=12, depth=1.6)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, 0.7)); objeto('PREV_plataforma', bm, pc, cor('PREV_piso', (0.05, 0.06, 0.07), rough=0.55, metal=0.6))
    bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=96, radius=70)
    lg = bpy.data.materials.new('PREV_lago_m'); lg.use_nodes = True; b = lg.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.004, 0.02, 0.035, 1); b.inputs['Roughness'].default_value = 0.04; b.inputs['Metallic'].default_value = 0.0
    try:
        b.inputs['Transmission Weight'].default_value = 0.0
    except Exception: pass
    objeto('PREV_lago', bm, pc, lg)
    return pc

def luzes_previa():
    sc = bpy.context.scene
    w = sc.world or bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.012, 0.022, 0.04, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0
    def luz(nome, tipo, loc, en, cor_, alvo=None, size=1.0, spot=None):
        L = bpy.data.lights.new(nome, tipo); L.energy = en; L.color = cor_
        if tipo == 'AREA': L.size = size
        if tipo == 'SPOT' and spot: L.spot_size = spot
        if tipo in ('POINT', 'SPOT'): L.shadow_soft_size = 0.15
        L.specular_factor = 0.15
        o = bpy.data.objects.new(nome, L); o.location = loc; sc.collection.objects.link(o)
        if alvo: o.rotation_euler = (Vector(alvo) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    luz('PREV_l_frente', 'AREA', (0, 8, 22), 26000, (0.55, 0.75, 1.0), alvo=(0, 36, 11), size=14)
    for sg in (-1, 1):
        luz(f'PREV_l_flanco_{sg}', 'AREA', (sg * 9, 22, 7), 6000, (0.45, 0.8, 1.0), alvo=(sg * 9, 34, 2), size=6)
    luz('PREV_l_pe', 'POINT', (0, 31.5, 2.0), 9000, (0.35, 0.8, 1.0), size=2)
    luz('PREV_l_b2', 'POINT', (0, 33.5, 9.5), 4000, (0.35, 0.8, 1.0), size=2)
    luz('PREV_l_b1', 'POINT', (0, 34.2, 17.5), 4000, (0.35, 0.8, 1.0), size=2)
    luz('PREV_l_topo', 'POINT', (0, 33.5, 27.5), 6000, (0.3, 0.6, 1.0), size=3)
    for f, z in [(-14, 9), (14, 9), (-33, 9), (33, 9), (-14, 17), (14, 17), (-33, 17), (33, 17), (-52, 9), (52, 17)]:
        luz(f'PREV_l_portal_{f}_{z}', 'POINT', P(35.5, f, z), 2500, (1.0, 0.62, 0.3), size=1.5)
    luz('PREV_l_dir', 'AREA', B(24, 16, 14), 9000, (0.5, 0.75, 1.0), alvo=B(34, 26, 8), size=8)
    luz('PREV_l_cas', 'AREA', B(28, 8, 12), 7000, (0.5, 0.75, 1.0), alvo=B(37, 15.5, 6), size=8)
    luz('PREV_l_esq', 'AREA', B(-20, 14, 8), 6000, (0.5, 0.75, 1.0), alvo=B(-30, 24, 3), size=8)
    luz('PREV_l_dirpe', 'POINT', B(31, 22, 1.5), 3000, (0.35, 0.8, 1.0))
    sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
    try:
        sc.eevee.taa_render_samples = 48; sc.eevee.use_raytracing = True
        sc.eevee.ray_tracing_options.resolution_scale = '2'
    except Exception as e: say('eevee', e)
    try: sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Punchy'
    except Exception:
        try: sc.view_settings.view_transform = 'Filmic'
        except Exception: pass
    sc.view_settings.exposure = 0.9
    _glare(sc)

def _glare(sc):
    try:
        ng = bpy.data.node_groups.new('PREV_comp', 'CompositorNodeTree')
        ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
        rl = ng.nodes.new('CompositorNodeRLayers'); g = ng.nodes.new('CompositorNodeGlare'); out = ng.nodes.new('NodeGroupOutput')
        for nm, v in (('Type', 'Fog Glow'), ('Quality', 'High'), ('Threshold', 0.9), ('Size', 0.6), ('Strength', 0.7)):
            if nm in g.inputs:
                try: g.inputs[nm].default_value = v
                except Exception as e: say('glare', nm, e)
        ng.links.new(rl.outputs['Image'], g.inputs['Image']); ng.links.new(g.outputs['Image'], out.inputs[0])
        sc.compositing_node_group = ng; say('glare ok', [i.name for i in g.inputs]); return
    except Exception as e:
        say('glare5', e)
    try:
        sc.use_nodes = True; nt = sc.node_tree
        rl = nt.nodes.get('Render Layers') or nt.nodes.new('CompositorNodeRLayers')
        comp = nt.nodes.get('Composite') or nt.nodes.new('CompositorNodeComposite')
        g = nt.nodes.new('CompositorNodeGlare'); g.glare_type = 'FOG_GLOW'
        try: g.quality = 'HIGH'; g.threshold = 0.8; g.size = 8
        except Exception: pass
        nt.links.new(rl.outputs['Image'], g.inputs['Image']); nt.links.new(g.outputs['Image'], comp.inputs['Image'])
    except Exception as e:
        say('glare indisponível', e)

CAMS = {
    'frente':   dict(cam=(0, -3.0, 8.0), alvo=(0, 36, 8.5), lente=14),            # a7206 (do batcomputador)
    'perto':    dict(cam=(0, 14.0, 9.0), alvo=(0, 37, 11.5), lente=20),
    'entrada':  dict(cam=(0, -40, 4.6), alvo=(0, 30, 9.5), lente=17),               # 1930 (da entrada)
    'diagonal': dict(cam=(24, -46, 9.0), alvo=(5, 30, 8.0), lente=17),              # 8190 (cascata à direita)
    'lados':    dict(cam=(10, -2, 7), alvo=(35, -18, 7), lente=20),
    'direita':  dict(cam=(22, -12, 9), alvo=(34, -26, 9), lente=22),
    'esquerda': dict(cam=(-12, -6, 4), alvo=(-30, -24, 3), lente=24),
    'ponte':    dict(cam=(5.5, 24.0, 6.0), alvo=(0, 34, 9.0), lente=24),
}

def main(args):
    C.limpa(); random.seed(1)
    say('blender', bpy.app.version_string)
    col = colecao('A_AGUA')
    M = materiais()
    cachoeira_central(col, M)
    cristais_pe(col, M)
    ponte('_sup', col, M, 34.0, 15.0, z_pe=None)
    ponte('_inf', col, M, 33.0, 7.0, z_pe=-0.8)
    laterais(col, M)
    lago(col, M)
    tot = sum(ntri(o) for o in col.all_objects if o.type == 'MESH')
    say('objetos', len(col.all_objects), 'triangulos', tot)
    pedidos = [a for a in args if a in CAMS] or ['frente']
    if pedidos:
        pc = contexto(M); luzes_previa()
        for k in pedidos:
            c = CAMS[k]; previa(f'agua_{k}', cam=c['cam'], alvo=c['alvo'], lente=c['lente'], luz=False)
        for o in list(pc.all_objects): bpy.data.objects.remove(o)
        bpy.data.collections.remove(pc)
    if 'glb' in args:
        fecha(NOME, col)

rodar(main)
