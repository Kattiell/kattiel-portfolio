# Fachada 12 (Carvão/Mineração): boca de mina escorada com vigas num paredão de rocha com veios em brasa,
# anel de brasas laranja-vermelho em volta, vagonete com carvão incandescente nos trilhos, estandarte preto
# com picaretas douradas, lanternas, picaretas, caixote, lata e roda enferrujada.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from f101112_comum import *
from mathutils import noise

RECT = True

def livre(p):
    if dentro_vao(p.x, p.z, RECT, folga=0.08): return False
    if p.y < -0.97 and p.x * p.x + (p.z - 7.35) ** 2 < 1.15: return False
    return abs(p.x) < 6.15 and 0.0 <= p.z < 7.55 and p.y > -1.26

def rocha(col, mat, brasa):
    """Paredão de rocha em volta da boca: grade deslocada por ruído, topo irregular, veios em brasa."""
    nx, nz = 84, 52; x0, x1, z0, z1 = -6.2, 6.2, 0.0, 7.6
    bm = bmesh.new(); V = {}
    def yf(x, z):
        n = noise.fractal(Vector((x * 0.7, 3.1, z * 0.7)), 0.55, 2.3, 5)
        r2 = noise.ridged_multi_fractal(Vector((x * 1.3, 5.3, z * 1.3)), 0.8, 2.0, 3, 0.6, 2.0)
        perto = max(0.0, 1.0 - max(abs(x) - 3.9, 0, z - 6.9) / 1.6)   # relevo mais alto junto da moldura
        y = -0.5 - 0.45 * (n + 0.5) - 0.12 * r2 - 0.22 * perto + 0.3 * (abs(x) / 6.2) ** 2
        y = max(-1.22, min(-0.05, y))
        if x * x + (z - 7.35) ** 2 < 1.3: y = max(y, -0.85)
        return y
    for i in range(nx + 1):
        for k in range(nz + 1):
            x = x0 + (x1 - x0) * i / nx; z = z0 + (z1 - z0) * k / nz
            V[i, k] = bm.verts.new((x, yf(x, z), z))
    def topo(x):
        return 7.55 - 1.1 * (abs(x) / 6.2) ** 2.2 - 0.35 * (noise.noise(Vector((x * 0.9, 7.7, 0))) + 0.5)
    for i in range(nx):
        for k in range(nz):
            cx = x0 + (x1 - x0) * (i + 0.5) / nx; cz = z0 + (z1 - z0) * (k + 0.5) / nz
            if abs(cx) < 3.9 and cz < 6.95: continue      # boca + moldura de vigas
            if cz > topo(cx): continue
            bm.faces.new((V[i, k], V[i + 1, k], V[i + 1, k + 1], V[i, k + 1]))
    for v in [v for v in bm.verts if not v.link_faces]: bm.verts.remove(v)
    # espessura para trás (+Y) só em Y: não estoura a largura nem a altura
    ext = bmesh.ops.extrude_face_region(bm, geom=list(bm.faces)); nv = [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=Vector((0, 0.45, 0)), verts=nv)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = objeto('F12_rocha', bm, col, mat)
    for p in o.data.polygons: p.use_smooth = True
    bpy.context.view_layer.update(); uv_mundo(o, 3.0)
    # veios em brasa: rachaduras finas (passeios aleatórios sobre a rocha), um pouco à frente da superfície
    rnd = random.Random(7); n = 0
    def na_rocha(x, z): return not (abs(x) < 4.0 and z < 7.05) and z < topo(x) - 0.15 and abs(x) < 6.05 and z > 0.15
    for c in range(46):
        x, z = rnd.uniform(-6, 6), rnd.uniform(0.3, 7.2)
        if not na_rocha(x, z): continue
        ang = rnd.uniform(0, 2 * math.pi); pts = []
        for k in range(rnd.randint(6, 14)):
            if not na_rocha(x, z): break
            pts.append(Vector((x, yf(x, z) - 0.035, z)))
            ang += rnd.uniform(-0.7, 0.7); st = rnd.uniform(0.14, 0.28); x += st * math.cos(ang); z += st * math.sin(ang)
        if len(pts) >= 3:
            tubo(f'F12_veio{n}', col, pts, [0.018 * (1 - i / len(pts)) + 0.008 for i in range(len(pts))], brasa, lados=4, tam=0.5); n += 1
    return o

def main(args):
    C.limpa()
    col = colecao('F12')
    rnd = random.Random(12)
    pedra = material('F12_rocha', 'dark_rock', tint=(0.85, 0.7, 0.58))
    madeira = material('F12_madeira', 'rough_wood', tint=(0.55, 0.38, 0.26))
    ferrugem = material('F12_ferrugem', 'rusty_metal_02', tint=(0.4, 0.38, 0.38), metal=0.6)
    tecido = material('F12_tecido', 'denim_fabric', tint=(0.035, 0.035, 0.04))
    carvao = material('F12_carvao', 'dark_rock', tint=(0.18, 0.16, 0.15))
    brasa = cor('F12_brasa', (0.95, 0.1, 0.008), rough=0.6, emiss=1.6)
    nucleo = cor('F12_nucleo', (1.0, 0.24, 0.02), rough=0.5, emiss=1.5)
    ouro = cor('F12_ouro', (0.85, 0.62, 0.25), rough=0.3, metal=1.0)
    ferro = cor('F12_ferro', (0.05, 0.05, 0.055), rough=0.5, metal=0.9)

    rocha(col, pedra, brasa)

    # --- escoramento de vigas: quadro da frente + quadro recuado ---
    for s in (-1, 1):
        caixa(f'F12_esteio{s}', col, (0.5, 0.52, 6.27), (s * 3.56, -0.74, 3.135), madeira, bev=0.04, tam=1.6)
        caixa(f'F12_esteioB{s}', col, (0.38, 0.4, 6.25), (s * 3.5, -0.1, 3.125), madeira, bev=0.03, tam=1.6)
        caixa(f'F12_sapata{s}', col, (0.6, 0.7, 0.18), (s * 3.56, -0.74, 0.09), madeira, bev=0.03, tam=1.2)
        viga(f'F12_mao{s}', col, (s * 3.85, -0.74, 5.05), (s * 4.75, -0.74, 6.3), 0.24, 0.3, madeira)
        for j, z in enumerate((1.6, 3.4)):   # cunhas/calços presos no esteio
            caixa(f'F12_calco{s}_{j}', col, (0.12, 0.56, 0.32), (s * 3.86, -0.74, z), madeira, bev=0.02)
    caixa('F12_cumeeira', col, (9.6, 0.5, 0.6), (0, -0.74, 6.56), madeira, bev=0.05, tam=1.6)
    caixa('F12_cumeeiraB', col, (7.6, 0.42, 0.42), (0, -0.1, 6.44), madeira, bev=0.04, tam=1.6)
    caixa('F12_tampo', col, (6.2, 0.42, 0.3), (0, -0.62, 7.0), madeira, bev=0.04, tam=1.6)
    for x in (-2.2, 0.0, 2.2):     # pranchas do teto da galeria entre os dois quadros
        caixa(f'F12_prancha{x}', col, (0.5, 0.64, 0.12), (x, -0.42, 6.3), madeira, bev=0.02)
    # pregos/placas de ferro nas juntas
    for s in (-1, 1):
        caixa(f'F12_placa{s}', col, (0.36, 0.03, 0.5), (s * 3.56, -1.01, 6.3), ferro, bev=0.0)

    # --- anel de brasas em volta da boca (elipse aberta embaixo, pontas em espiral) ---
    def anel(fase, dy, ra, rb):
        pts = []
        for i in range(181):
            t = math.radians(-58 + 296 * i / 180)
            extra = max(0.0, abs(math.degrees(t) - 90) - 112) / 36.0
            a = ra + 0.55 * extra; b = rb + 0.2 * extra
            x = a * math.cos(t); z = 3.6 + b * math.sin(t) - 1.4 * extra * extra
            y = -1.14 + dy + 0.05 * math.sin(t * 7 + fase)
            if abs(x) < 1.5 and z > 6.6: y = -0.7       # por trás do medalhão
            pts.append(Vector((x, y, z)))
        return pts
    nucleos = []
    for k, (fase, dy, ra, rb, rr) in enumerate(((0.0, 0.0, 5.35, 3.82, 0.04), (1.7, 0.05, 5.6, 3.7, 0.022), (3.1, -0.04, 5.2, 3.88, 0.015))):
        for u, tr in enumerate(trechos(anel(fase, dy, ra, rb), livre)):
            nucleos.append(tr)
            tubo(f'F12_anel{k}_{u}', col, tr, rr, nucleo, lados=6, tam=0.5)
    fa = bmesh.new()
    for i in range(230):
        tr = nucleos[rnd.randrange(len(nucleos))]; p = tr[rnd.randrange(len(tr))]
        q = p + Vector((rnd.gauss(0, 0.22), rnd.uniform(-0.06, 0.1), rnd.gauss(0, 0.22)))
        if livre(q) and q.y > -1.24:
            g = bmesh.ops.create_icosphere(fa, subdivisions=0, radius=rnd.uniform(0.012, 0.04))
            bmesh.ops.translate(fa, vec=q, verts=g['verts'])
    objeto('F12_fagulhas', fa, col, nucleo)

    # --- trilhos e vagonete à esquerda ---
    xa, xb, yc = -6.15, -3.95, -0.74
    for j in range(5):
        x = xa + 0.25 + j * 0.47
        caixa(f'F12_dormente{j}', col, (0.16, 0.98, 0.09), (x, yc, 0.045), madeira, bev=0.015)
    for s in (-1, 1):
        caixa(f'F12_trilho{s}', col, (xb - xa, 0.06, 0.09), ((xa + xb) / 2, yc + s * 0.3, 0.135), ferrugem, bev=0.01, tam=1.0)
        caixa(f'F12_patim{s}', col, (xb - xa, 0.13, 0.025), ((xa + xb) / 2, yc + s * 0.3, 0.1), ferrugem, bev=0.0, tam=1.0)
    cx = -5.02
    bm = bmesh.new()
    bot = [(-0.7, -0.36), (0.7, -0.36), (0.7, 0.36), (-0.7, 0.36)]; top = [(-0.86, -0.47), (0.86, -0.47), (0.86, 0.47), (-0.86, 0.47)]
    vb = [bm.verts.new((cx + x, yc + y, 0.4)) for x, y in bot]; vt = [bm.verts.new((cx + x, yc + y, 1.12)) for x, y in top]
    bm.faces.new(vb[::-1])
    for i in range(4): bm.faces.new((vb[i], vb[(i + 1) % 4], vt[(i + 1) % 4], vt[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    cacamba = objeto('F12_vagonete', bm, col, ferrugem); bpy.context.view_layer.update(); uv_mundo(cacamba, 1.0)
    so = cacamba.modifiers.new('esp', 'SOLIDIFY'); so.thickness = 0.045; so.offset = -1
    for i, x in enumerate((-0.28, 0.28)):   # cintas de ferro nas laterais
        for s in (-1, 1):
            viga(f'F12_cinta{i}{s}', col, (cx + x * 0.81, yc + s * 0.375, 0.4), (cx + x, yc + s * 0.485, 1.12), 0.06, 0.03, ferro, bev=0.0)
    for s in (-1, 1):
        viga(f'F12_borda{s}', col, (cx - 0.88, yc + s * 0.48, 1.12), (cx + 0.88, yc + s * 0.48, 1.12), 0.05, 0.07, ferro, bev=0.0)
        viga(f'F12_bordaL{s}', col, (cx + s * 0.87, yc - 0.48, 1.12), (cx + s * 0.87, yc + 0.48, 1.12), 0.07, 0.05, ferro, bev=0.0)
        for j in range(5):   # rebites
            bpy.ops.mesh.primitive_uv_sphere_add(segments=6, ring_count=4, radius=0.022, location=(cx - 0.6 + j * 0.3, yc + s * 0.46, 1.04))
            rb = bpy.context.active_object; rb.name = f'F12_rebite{s}{j}'; rb.data.materials.append(ferro); ligar(rb, col)
    caixa('F12_chassi', col, (1.45, 0.56, 0.1), (cx, yc, 0.36), ferro, bev=0.0)
    for sx in (-1, 1):
        caixa(f'F12_eixo{sx}', col, (0.06, 0.72, 0.06), (cx + sx * 0.48, yc, 0.25), ferro, bev=0.0)
        for sy in (-1, 1):
            bpy.ops.mesh.primitive_cylinder_add(vertices=18, radius=0.21, depth=0.07, location=(cx + sx * 0.48, yc + sy * 0.3, 0.25), rotation=(math.pi / 2, 0, 0))
            w = bpy.context.active_object; w.name = f'F12_roda{sx}{sy}'; w.data.materials.append(ferrugem); ligar(w, col)
            bpy.ops.mesh.primitive_cylinder_add(vertices=18, radius=0.245, depth=0.025, location=(cx + sx * 0.48, yc + sy * 0.265, 0.25), rotation=(math.pi / 2, 0, 0))
            w = bpy.context.active_object; w.name = f'F12_friso{sx}{sy}'; w.data.materials.append(ferro); ligar(w, col)
    # carvão: monte de pedaços, os de cima em brasa
    bmc = bmesh.new(); bmq = bmesh.new()
    for i in range(190):
        rr = rnd.random() ** 0.6
        a = rnd.uniform(0, 2 * math.pi)
        px = cx + 0.8 * rr * math.cos(a); py = yc + 0.42 * rr * math.sin(a)
        pz = 1.07 + 0.42 * (1 - rr ** 2) + rnd.uniform(-0.06, 0.04)
        alvo = bmq if (rnd.random() < 0.3 or (pz > 1.35 and rnd.random() < 0.45)) else bmc
        pedra_bruta(alvo, (px, py, pz), rnd.uniform(0.07, 0.12), rnd, sub=1 if rnd.random() < 0.5 else 0)
    objeto('F12_carvao', bmc, col, carvao); objeto('F12_carvaoBrasa', bmq, col, brasa)

    # --- estandarte preto com picaretas douradas, à direita ---
    bx, bw, ztop, blen = 5.15, 1.12, 5.95, 2.9
    bm = bmesh.new(); uvl = bm.loops.layers.uv.verify(); G = {}
    nu, nv = 6, 18
    for i in range(nu + 1):
        for j in range(nv + 1):
            u = i / nu; v = j / nv
            x = bx + (u - 0.5) * bw
            z = ztop - v * blen
            if v > 0.82: z -= (1 - abs(u - 0.5) * 2) * 0.0 + 0.0
            ponta = max(0.0, (v - 0.85) / 0.15)
            z = ztop - v * blen - (1 - abs(u - 0.5) * 2) * 0.4 * ponta
            y = -1.2 + 0.04 * math.sin(v * 9 + u * 2) * v
            G[i, j] = bm.verts.new((x, y, z))
    for i in range(nu):
        for j in range(nv):
            f = bm.faces.new((G[i, j + 1], G[i + 1, j + 1], G[i + 1, j], G[i, j]))
            for lp in f.loops: lp[uvl].uv = ((lp.vert.co.x - bx) / 1.0, lp.vert.co.z / 1.0)
    Gc = {k: v.co.copy() for k, v in G.items()}
    estd = objeto('F12_estandarte', bm, col, tecido)
    so = estd.modifiers.new('esp', 'SOLIDIFY'); so.thickness = 0.02
    def borda(dx):
        pts = []
        for j in range(nv + 1): pts.append(Gc[0, j] + Vector((dx, -0.02, 0)))
        pts.append(Gc[nu // 2, nv] + Vector((0, -0.02, 0.1)))
        for j in range(nv, -1, -1): pts.append(Gc[nu, j] + Vector((-dx, -0.02, 0)))
        pts.append(Gc[0, 0] + Vector((dx, -0.02, 0)))
        return pts
    tubo('F12_franja', col, borda(0.07), 0.018, ouro, lados=5)
    # picaretas cruzadas
    ce = Vector((bx, -1.25, 4.7)); K = 1.45
    for s in (-1, 1):
        d = Vector((s * 0.55, 0, 0.82)).normalized()
        a = ce - d * 0.42 * K; b = ce + d * 0.42 * K
        viga(f'F12_cabo{s}', col, a, b, 0.06, 0.03, ouro, bev=0.0)
        perp = Vector((d.z, 0, -d.x)) * (1 if s > 0 else -1)
        cab = [b + (perp * (-0.22) - d * 0.06) * K, b + perp * (-0.1) * K, b + d * 0.02 * K, b + perp * 0.1 * K, b + (perp * 0.22 - d * 0.06) * K]
        tubo(f'F12_ponta{s}', col, cab, [0.014, 0.035, 0.045, 0.035, 0.014], ouro, lados=6)
    viga('F12_haste', col, (bx - 0.75, -1.2, ztop + 0.05), (bx + 0.72, -1.2, ztop + 0.05), 0.05, 0.05, ouro, bev=0.0)
    for s in (-1, 1):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=6, radius=0.06, location=(bx + s * 0.75, -1.2, ztop + 0.05))
        b = bpy.context.active_object; b.name = f'F12_pomo{s}'; b.data.materials.append(ouro); ligar(b, col)
    viga('F12_suporte', col, (bx - 0.75, -0.75, ztop + 0.05), (bx - 0.75, -1.2, ztop + 0.05), 0.05, 0.05, ferro, bev=0.0)

    # --- lanternas penduradas na viga mestra, fora do vão ---
    for s in (-1, 1):
        viga(f'F12_corrente{s}', col, (s * 4.05, -1.0, 6.27), (s * 4.05, -1.0, 5.7), 0.025, 0.025, ferro, bev=0.0)
        lanterna_leve(col, f'F12_lanterna{s}', s * 4.05, -1.0, 4.75, altura=1.0, forca=16.0)

    # --- tralha de mina ---
    o = leve(parte('picke_dirty_01', 'picke_dirty_01', col, 'F12_picareta1', 4.25, -0.85, 0.0, altura=1.1, rz=0.3), 0.3); o.rotation_euler = (math.radians(-12), math.radians(8), 0.3); assenta(o)
    o = leve(parte('picke_dirty_01', 'picke_dirty_01', col, 'F12_picareta2', -3.98, -0.88, 0.0, altura=1.1, rz=-0.2), 0.3); o.rotation_euler = (math.radians(-10), math.radians(-14), -0.2); assenta(o)
    leve(parte('old_military_crate', 'old_military_crate_a', col, 'F12_caixote', 5.45, -0.72, 0.0, larg=0.95, rz=0.15), 0.35)
    o = leve(parte('rusted_wheel_rim_01', 'rusted_wheel_rim_01', col, 'F12_aro', 4.75, -0.6, 0.0, altura=0.62, rz=0.25), 0.12); o.rotation_euler = (math.radians(-14), 0, 0.25); assenta(o)

    confere(col, rect=True)
    agrupa(col, 'F12')
    fundo(rect=True)
    previas('f101112_f12', 52, rect=True)
    fecha('fachada_12', col)

rodar(main)
