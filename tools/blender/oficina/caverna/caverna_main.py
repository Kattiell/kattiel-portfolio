# Área CAVERNA (referencial MUNDO, coleção A_CAVERNA -> public/models/area_caverna.glb):
# estalactites do teto e das bordas, afloramentos de rocha acima/entre os portais (sem cobrir as fachadas),
# rochas das margens e dentro do lago, ilhotas com espigões, musgo e cipós pendentes, cristais ciano
# junto às bases das cachoeiras. Contexto (abóbada, paredão, galerias, água) só para as prévias; não exporta.
import sys, os, math, random
sys.path.insert(0, r'C:\Users\Gabriel Caetano\Downloads\Claud Code\batcaverna\tools\blender\oficina')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from mathutils import noise
import caverna_pecas as CP
from caverna_pecas import P, teto, em_fachada, inst, D

PREVIAS_SO = '--sem-glb' in sys.argv
SO_VISTA = None
for a in sys.argv:
    if a.startswith('--vista='): SO_VISTA = a.split('=')[1]

# ---------------------------------------------------------------- contexto (não exportado)
def contexto(rocha):
    cx = colecao('CTX_CAV')
    # abóbada
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=96, v_segments=48, radius=64)
    for v in bm.verts:
        n = noise.fractal(v.co * 0.05, 1.0, 2.0, 5)
        v.co *= 1 + 0.05 * n
        v.co.z = v.co.z * 0.78 + 4
    bmesh.ops.reverse_faces(bm, faces=bm.faces)
    o = objeto('CTX_abobada', bm, cx, rocha); uv_mundo(o, 6)
    # paredão r=38 de φ -84..84 com as 12 bocas
    bm = bmesh.new(); N, M = 168, 52; vs = {}
    for i in range(N + 1):
        f = -84 + 168 * i / N
        for j in range(M + 1):
            z = -5 + 52 * j / M; p = P(38, f, z); n = noise.fractal(p * 0.11, 1.0, 2.0, 4)
            vs[i, j] = bm.verts.new(P(38 + 1.2 * n, f, z))
    for i in range(N):
        for j in range(M):
            fm = -84 + 168 * (i + 0.5) / N; zm = -5 + 52 * (j + 0.5) / M
            if any(abs(fm - a) < 4.8 and y0 - 0.3 < zm < y0 + 6.2 for a in CP.PORTAIS for y0 in (7, 15)): continue
            bm.faces.new((vs[i, j], vs[i + 1, j], vs[i + 1, j + 1], vs[i, j + 1]))
    o = objeto('CTX_parede', bm, cx, rocha); uv_mundo(o, 6)
    # fachadas: caixas-limite (o que NÃO pode ser coberto), cor por andar
    for k, a in enumerate(CP.PORTAIS):
        for y0, h, c in ((7, 7.6, (0.9, 0.55, 0.2)), (15, 9.5, (0.75, 0.45, 0.95))):
            m = cor(f'CTX_fach{y0}', tuple(x * 0.35 for x in c), rough=0.6, emiss=0.25)
            b = caixa(f'CTX_fach_{k}_{y0}', cx, (12.2, 1.3, h), P(37.35, a, y0 + h / 2), m, bev=0)
            b.rotation_euler = (0, 0, -a * D)
            boca = cor('CTX_boca', (0.02, 0.05, 0.08), rough=0.9)
            bb = caixa(f'CTX_boca_{k}_{y0}', cx, (6.4, 0.2, 6.2), P(36.6, a, y0 + 3.1), boca, bev=0); bb.rotation_euler = (0, 0, -a * D)
    # galerias (anel) e plataforma
    metal = cor('CTX_metal', (0.18, 0.2, 0.23), rough=0.35, metal=0.8); led = cor('CTX_led', (0.2, 0.8, 1.0), emiss=4)
    for zz, rin in ((7, 33), (15, 34)):
        bm = bmesh.new(); prev = None
        for i in range(73):
            f = -72 + 2 * i; q = [bm.verts.new(P(rin, f, zz)), bm.verts.new(P(38, f, zz)), bm.verts.new(P(38, f, zz - 0.5)), bm.verts.new(P(rin, f, zz - 0.5))]
            if prev:
                for k in range(4): bm.faces.new((prev[k], prev[(k + 1) % 4], q[(k + 1) % 4], q[k]))
            prev = q
        objeto(f'CTX_galeria{zz}', bm, cx, metal)
        bm = bmesh.new(); prev = None
        for i in range(73):
            f = -72 + 2 * i; q = [bm.verts.new(P(rin - 0.05, f, zz - 0.15)), bm.verts.new(P(rin - 0.05, f, zz - 0.3))]
            if prev: bm.faces.new((prev[0], prev[1], q[1], q[0]))
            prev = q
        objeto(f'CTX_led{zz}', bm, cx, led)
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=64, radius1=12, radius2=12, depth=1.5)
    bmesh.ops.translate(bm, vec=Vector((0, 0, 0.75)), verts=bm.verts); objeto('CTX_plataforma', bm, cx, metal)
    # água
    agua = cor('CTX_agua', (0.01, 0.035, 0.06), rough=0.04)
    bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=96, radius=66); objeto('CTX_agua', bm, cx, agua)
    # cachoeiras (lâminas emissivas)
    q = cor('CTX_queda', (0.65, 0.85, 1.0), rough=0.2, emiss=2.2)
    for (x, y, z0, z1, w, yaw) in [(0, 36.6, 16.2, 24, 6.5, 0), (0, 36.0, 7.6, 15.6, 5.4, 0), (0, 35.2, -1, 7.2, 7.2, 0),
                                   (34, -26, -0.5, 18, 4.5, -2.2), (38.5, -12, 8.2, 14, 3.2, -1.9), (37.2, -15.5, 3.6, 8, 3.8, -1.9),
                                   (35.8, -19, -0.4, 3.4, 4.4, -1.9), (-30, -24, -0.5, 6, 5, 2.3)]:
        b = caixa(f'CTX_queda_{x}_{z0}', cx, (w, 0.3, z1 - z0), (x, y, (z0 + z1) / 2), q, bev=0)
        b.rotation_euler = (0, 0, yaw if yaw else 0)
    # morcego (silhueta) e garagem (volume)
    caixa('CTX_morcego', cx, (24, 1.8, 6), (0, 34.6, 30.5), cor('CTX_morc', (0.1, 0.12, 0.15), rough=0.4, metal=0.9), bev=0.2)
    caixa('CTX_garagem', cx, (14, 20, 8.6), (-24, -4, 4.3), metal, bev=0)
    caixa('CTX_ponte', cx, (5, 35, 0.4), (0, -29.5, 1.3), metal, bev=0)
    return cx

def luzes():
    sc = bpy.context.scene; w = sc.world or bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (0.006, 0.012, 0.02, 1); bg.inputs['Strength'].default_value = 1
    def L(nome, tipo, loc, e, c, alvo=None, size=None):
        if nome in bpy.data.objects: return
        o = bpy.data.objects.new(nome, bpy.data.lights.new(nome, tipo)); o.data.energy = e; o.data.color = c; o.location = loc
        if size and tipo == 'AREA': o.data.size = size
        if alvo: o.rotation_euler = (Vector(alvo) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        sc.collection.objects.link(o)
    L('PREV_luaceu', 'SPOT', (17, -16, 52), 6e4, (0.7, 0.85, 1.0), alvo=(5, 10, 0))
    bpy.data.objects['PREV_luaceu'].data.spot_size = 1.1
    L('PREV_azul', 'AREA', (0, 0, 44), 1.6e4, (0.35, 0.6, 1.0), alvo=(0, 0, 0), size=40)
    L('PREV_paredao', 'AREA', (0, -6, 22), 2.6e4, (0.45, 0.7, 1.0), alvo=(0, 34, 26), size=30)
    L('PREV_queda', 'POINT', (0, 31, 3), 1.2e4, (0.5, 0.9, 1.0))
    L('PREV_queda2', 'POINT', (31, -18, 4), 8e3, (0.5, 0.9, 1.0))
    L('PREV_queda3', 'POINT', (-27, -21, 3), 6e3, (0.5, 0.9, 1.0))
    L('PREV_galeria', 'POINT', (0, 0, 10), 4e3, (0.4, 0.75, 1.0))
    L('PREV_quente', 'POINT', (0, 30, 18), 3e3, (1.0, 0.7, 0.4))
    L('PREV_teto', 'AREA', (0, -20, 8), 2.4e4, (0.4, 0.65, 1.0), alvo=(0, 10, 50), size=30)
    try:
        sc.eevee.use_raytracing = True
        sc.view_settings.look = 'AgX - Punchy'
    except Exception: pass

# ---------------------------------------------------------------- área
def main(args):
    C.limpa(); random.seed(7); rnd = random.Random(11)
    col = colecao('A_CAVERNA')
    rocha_teto = CP.material_ph_ardosia('CAV_rocha_teto', 'dark_rock', base=(0.16, 0.18, 0.22), molhar=False)
    rocha_musgo = CP.material_ph_ardosia('CAV_rocha_musgo', 'mossy_rock', musgo=0.85, base=(0.17, 0.19, 0.23))
    ctx_rocha = CP.material_ph_ardosia('CTX_rocha', 'dark_rock_02', base=(0.12, 0.14, 0.17))
    contexto(ctx_rocha)
    R = CP.prepara_rochas()
    tris = {}

    # ---------- estalactites: 8 variantes, instanciadas ----------
    V = {
        'E0': [(12, 1.7, 1, (0, 0, 0))],
        'E1': [(10, 1.5, 2, (0, 0, 0)), (6, 0.9, 3, (1.7, 0.4, 0.3)), (4.5, 0.75, 4, (-1.3, 0.9, 0.2))],
        'E2': [(7, 1.0, 5, (0, 0, 0))],
        'E3': [(6, 0.9, 6, (0, 0, 0)), (3.5, 0.6, 7, (1.0, -0.4, 0.2)), (4.2, 0.55, 8, (-0.8, -0.6, 0.1))],
        'E4': [(9, 0.62, 9, (0, 0, 0))],
        'E5': [(3.5, 0.45, 10, (0, 0, 0))],
        'E6': [(3, 0.42, 11, (0, 0, 0)), (2.2, 0.35, 12, (0.55, 0.2, 0.1)), (2.6, 0.3, 13, (-0.45, 0.35, 0.1))],
        'E7': [(2.0 + 1.6 * abs(math.sin(i * 1.7)), 0.42, 14 + i, (i * 0.62 - 1.55, 0.25 * math.sin(i * 2.1), 0.1)) for i in range(6)],
    }
    EST = {k: CP.estalactite(f'CAV_est_{k}', p, rocha_teto) for k, p in V.items()}
    COMP = {k: max(c for c, *_ in p) for k, p in V.items()}
    RAIO = {k: max(abs(o[0]) + r for c, r, s, o in p) for k, p in V.items()}

    def limite_ponta(x, y, r, phi):
        if (x - 17) ** 2 + (y + 16) ** 2 < 7 ** 2: return None  # abertura do teto (feixe de luz)
        if abs(x) < 14 and y > 26 and r > 26: return 37.5        # acima do morcego
        if abs(phi) < 84 and r > 29: return 27.5                 # acima das fachadas / galerias
        if x < -14 and -17 < y < 9: return 13.0                  # garagem
        if abs(x) < 6 and y < -38: return 11.0                   # boca do corredor de entrada
        if r < 14: return 22.0                                   # acima do batcomputador
        return 14.0

    colocados = []
    def poe_est(k, x, y, esc, nome):
        r = math.hypot(x, y); phi = math.atan2(x, y) / D
        lim = limite_ponta(x, y, r, phi)
        if lim is None: return False
        zt = teto(r) + 0.6
        if abs(phi) < 84 and r > 37.6: return False
        esc = min(esc, (zt - lim) / COMP[k])
        if esc < 0.35: return False
        rad = RAIO[k] * esc
        if any((x - a) ** 2 + (y - b) ** 2 < (rad + rb) ** 2 * 0.55 for a, b, rb in colocados): return False
        colocados.append((x, y, rad))
        inst(EST[k], col, nome, (x, y, zt), (rnd.uniform(-0.06, 0.06), rnd.uniform(-0.06, 0.06), rnd.uniform(0, 6.28)),
             (esc * rnd.uniform(0.85, 1.15), esc * rnd.uniform(0.85, 1.15), esc))
        return True

    n = 0
    # borda do paredão (onde a abóbada encontra a parede): cortina densa, silhueta forte no topo da arte
    f = -86.0
    while f < 86:
        r = rnd.uniform(34.5, 37.3); p = P(r, f)
        k = rnd.choice(['E0', 'E1', 'E4', 'E3', 'E7', 'E2', 'E1', 'E0'])
        if poe_est(k, p.x, p.y, rnd.uniform(1.1, 1.8), f'CAV_est_borda_{n:03d}'): n += 1
        f += rnd.uniform(2.6, 4.2)
    # teto inteiro: grandes na frente/laterais, pequenas preenchendo
    for i in range(900):
        if n > 142: break
        r = math.sqrt(rnd.uniform(5 ** 2, 59 ** 2)); f = rnd.uniform(-180, 180); p = P(r, f)
        big = rnd.random() < 0.45
        k = rnd.choice(['E0', 'E1', 'E2', 'E4']) if big else rnd.choice(['E3', 'E5', 'E6', 'E7', 'E5'])
        if poe_est(k, p.x, p.y, rnd.uniform(1.1, 2.0) if big else rnd.uniform(0.9, 1.6), f'CAV_est_{n:03d}'): n += 1
    say('estalactites', n)

    # ---------- afloramentos de rocha no paredão (acima e entre os portais, nas pontas) ----------
    FACE = [R['rock_face_01'], R['rock_face_02']]
    def aflora(src, nome, phi, z0, esc, rmeio=38.6, giro=0.0, inclina=0.0, rolo=0.0):
        """Encosta a face de rocha no paredão (local -Y para o centro). z0 = base desejada."""
        d = src.dimensions
        o = inst(src, col, nome, (0, 0, 0), (inclina, rolo, -phi * D + giro), esc)
        bpy.context.view_layer.update()
        bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
        cz = min(v.z for v in bb)
        p = P(rmeio, phi); o.location = (p.x, p.y, z0 - cz)
        return o
    k = 0
    for row, (zlo, zhi, passo) in enumerate([(25.6, 28.5, 11.0), (31.5, 36.5, 15.0)]):
        f = -90 + rnd.uniform(0, passo)
        while f < 90:
            z0 = rnd.uniform(zlo, zhi)
            if abs(f) < 20 and z0 < 37.2: f += passo * 0.6; continue  # morcego
            if abs(f) > 84: z0 -= 4
            src = FACE[k % 2]; esc = rnd.uniform(1.2, 1.8)
            aflora(src, f'CAV_aflora_{k:03d}', f, z0, esc, rmeio=38.9 + rnd.uniform(-0.3, 0.8), giro=rnd.uniform(-0.35, 0.35) + (math.pi if k % 3 == 0 else 0),
                   inclina=rnd.uniform(-0.15, 0.1), rolo=rnd.choice([0, 0.5, 1.57, -1.2]) + rnd.uniform(-0.2, 0.2))
            k += 1; f += passo * rnd.uniform(0.8, 1.15)
    # pontas das galerias (φ além de ±74): pilhas de rocha do chão ao teto
    for s in (-1, 1):
        for j, (f, z0) in enumerate([(76, -1.0), (78, 8.0), (79, 17.0), (88, -1.0), (90, 8), (85, 22)]):
            src = FACE[(j + (s > 0)) % 2]
            aflora(src, f'CAV_ponta_{s}_{j}', s * f, z0, rnd.uniform(1.3, 1.9), rmeio=39.5 + (f - 76) * 0.25, giro=rnd.uniform(-0.4, 0.4))
            k += 1
    say('afloramentos', k)

    # ---------- rochas das margens (pé do plinto sob a galeria de baixo) ----------
    BLOC = [R['boulder_01'], R['namaqualand_boulder_03'], R['namaqualand_boulder_02'], R['rock_07'], R['rock_09']]
    def pedra(src, nome, x, y, alt, z=-0.9, giro=None, larg=None, inclina=0.0):
        d = src.dimensions; esc = alt / d.z if larg is None else larg / max(d.x, d.y)
        return inst(src, col, nome, (x, y, z + d.z * esc * 0.5),
                    (inclina, rnd.uniform(-0.12, 0.12), rnd.uniform(0, 6.28) if giro is None else giro), esc)
    j = 0
    for a, b in [(-70, -50), (-36.5, -9), (9, 36.5), (50, 70)]:
        f = a + rnd.uniform(0, 3)
        while f < b:
            r = rnd.uniform(29.6, 31.6); p = P(r, f)
            src = BLOC[j % 3]; alt = rnd.uniform(3.4, 5.4)
            pedra(src, f'CAV_margem_{j:03d}', p.x, p.y, alt, z=-1.0)
            if rnd.random() < 0.25:
                p2 = P(r - rnd.uniform(1.5, 3.2), f + rnd.uniform(-2, 2))
                pedra(BLOC[3 + j % 2], f'CAV_margemp_{j:03d}', p2.x, p2.y, rnd.uniform(0.9, 1.8), z=-0.5)
            j += 1; f += rnd.uniform(5.0, 8.0)
    # costão de trás (φ 95..265) e laterais fora das galerias
    for i in range(20):
        f = rnd.uniform(88, 272)
        if abs(f - 180) < 10: continue
        r = rnd.uniform(46, 60)
        p = P(r, f)
        if p.x < -12 and -18 < p.y < 10: continue  # garagem
        src = BLOC[i % 3] if r > 52 else BLOC[i % 5]
        pedra(src, f'CAV_costao_{i:03d}', p.x, p.y, rnd.uniform(3, 7) * (1.3 if r > 54 else 1), z=-1.2)
        j += 1
    say('margem', j)

    # ---------- ilhotas no lago (rochas grandes + espigões + musgo) ----------
    MOSS_SET = R['rock_moss_set_01']
    MB = [CP.variante_musgo(BLOC[0], rocha_musgo, 'CAV_boulder_musgo'), CP.variante_musgo(BLOC[1], rocha_musgo, 'CAV_bloco_musgo')]
    def topo(o):
        bpy.context.view_layer.update(); return max((o.matrix_world @ Vector(cc)).z for cc in o.bound_box)
    ilhas = [P(24, -27), P(25.5, 31), (-20, -22), (22, -20), (12, -34), P(22, 64), P(23, -64)]
    for i, c in enumerate(ilhas):
        cx_, cy_ = c[0], c[1]
        pedra((MB if i % 2 == 0 else BLOC)[i % 2], f'CAV_ilha_{i}_a', cx_, cy_, rnd.uniform(3.2, 4.6), z=-1.0)
        for m in range(2):
            src = MB[m % 2] if m == 0 else BLOC[3 + i % 2]
            pedra(src, f'CAV_ilha_{i}_{m}', cx_ + rnd.uniform(-3.5, 3.5), cy_ + rnd.uniform(-3.5, 3.5), rnd.uniform(1.2, 2.6), z=-0.6)
        if i in (0, 1):  # espigões (estalagmites) como na ilhota da arte
            for m in range(3 if i == 0 else 2):
                kk = ['E4', 'E2', 'E5'][m]
                inst(EST[kk], col, f'CAV_espigao_{i}_{m}', (cx_ + rnd.uniform(-1.6, 1.6), cy_ + rnd.uniform(-1.6, 1.6), 1.2),
                     (math.pi + rnd.uniform(-0.1, 0.1), rnd.uniform(-0.1, 0.1), rnd.uniform(0, 6)), rnd.uniform(0.55, 0.9))
    for i, (x, y) in enumerate([(-11, -40), (-15, -44.5), (11, -41), (15.5, -44.5)]):
        pedra(BLOC[i % 2], f'CAV_entrada_{i}', x, y, rnd.uniform(3.5, 6.0), z=-1.2)
    pedra(MOSS_SET, 'CAV_musgoset_0', 24, 2, 1.6, z=-0.7, larg=9)
    pedra(MOSS_SET, 'CAV_musgoset_1', -25, 17, 1.6, z=-0.7, larg=9)

    # ---------- bases das cachoeiras: rochas musgosas + cristais ciano por cima ----------
    cr = CP.material_cristal('CAV_cristal', (0.0, 0.08, 0.2), (0.0, 0.5, 1.0), 1.3)
    cr2 = CP.material_cristal('CAV_cristal_ponta', (0.05, 0.25, 0.4), (0.2, 0.85, 1.0), 2.0)
    CRI = [CP.cacho_cristais(f'CAV_cristais_{i}', cr, cr2, seed=30 + i, n=7 + 2 * i, alt=1.4 + 0.5 * i) for i in range(3)]
    bases = [  # (x, y, direção tangente (rad), largura da queda)
        (0, 34.0, 0.0, 7.2), (35.8, -19, -1.9, 4.4), (34, -26, -2.2, 4.5), (-30, -24, 2.3, 5.0), (37.2, -15.5, -1.9, 3.8)]
    c = 0
    def cristais_em(o, n_):
        nonlocal c
        bpy.context.view_layer.update(); bb = [o.matrix_world @ Vector(cc) for cc in o.bound_box]
        x0, x1 = min(q.x for q in bb), max(q.x for q in bb); y0, y1 = min(q.y for q in bb), max(q.y for q in bb); zt = max(q.z for q in bb)
        for m in range(n_):
            u, w_ = rnd.uniform(0.3, 0.7), rnd.uniform(0.3, 0.7)
            px_, py_ = x0 + (x1 - x0) * u, y0 + (y1 - y0) * w_; pz_ = zt - rnd.uniform(0.5, 0.9)
            esc = rnd.uniform(0.9, 1.5); hmax = CRI[(c + m) % 3].dimensions.z
            if math.hypot(px_, py_) > 32.3: esc = min(esc, (6.2 - pz_) / hmax)  # nada fura o piso da galeria
            if esc < 0.4: continue
            inst(CRI[(c + m) % 3], col, f'CAV_cristal_{c:03d}', (px_, py_, pz_),
                 (rnd.uniform(-0.3, 0.3), rnd.uniform(-0.3, 0.3), rnd.uniform(0, 6)), esc); c += 1
    for bi, (x, y, yaw, w) in enumerate(bases):
        t = Vector((math.cos(yaw), math.sin(yaw), 0)); cen = Vector((x, y, 0))
        dentro = -cen.normalized()
        for s in (-1, 1):
            p = cen + t * s * (w / 2 + 2.6) + dentro * 1.2
            zb = 3.4 if bi == 4 else -1.0
            o = pedra(MB[(bi + s) % 2], f'CAV_queda_rocha_{bi}_{s}', p.x, p.y, rnd.uniform(3.4, 4.8), z=zb)
            cristais_em(o, 2)
    # degraus de rocha nos dois lados da queda central, com cristais (como na arte frontal)
    for s in (-1, 1):
        for m, (r, ff, z, alt) in enumerate([(33.6, 10.0, 0.3, 3.4), (34.6, 12.6, 1.0, 2.8)]):
            p = P(r, s * ff)
            o = pedra(MB[m % 2], f'CAV_queda_degrau_{s}_{m}', p.x, p.y, alt, z=z)
            cristais_em(o, 2)
    say('cristais', c)

    # ---------- cipós pendentes ----------
    m_folha = CP.material_ph_ardosia('CAV_folhagem', 'mossy_rock', musgo=0.0, base=(0.09, 0.2, 0.07))
    CIP = [CP.touceira_cipos(f'CAV_cipos_{i}', m_folha, seed=50 + i, n=4 + i, comp=3.0 + 1.6 * i, folhas=52) for i in range(3)]
    CCOMP = [3.0, 4.6, 6.2]
    v = 0
    # sob os afloramentos acima das fachadas: a ponta nunca desce abaixo de z=25.2 nas colunas das fachadas
    for o in [o for o in col.objects if o.name.startswith('CAV_aflora_')]:
        bpy.context.view_layer.update(); bb = [o.matrix_world @ Vector(cc) for cc in o.bound_box]; zb = min(q.z for q in bb)
        phi = math.atan2(o.location.x, o.location.y) / D
        if rnd.random() < 0.6:
            for kk in (1, 0):
                if not em_fachada(phi, zb + 0.6 - CCOMP[kk] * 1.05) and not em_fachada(phi, zb):
                    p = P(36.4, phi + rnd.uniform(-2, 2))
                    inst(CIP[kk], col, f'CAV_cipo_{v:03d}', (p.x, p.y, zb + 0.6), (0, 0, -phi * D), 1.0); v += 1; break
    # na face do plinto sob a galeria de baixo (descendo até perto da água)
    for f in [-66, -58, -31, -24, -17, 19, 26, 31, 57, 66]:
        p = P(32.7, f + rnd.uniform(-2, 2))
        inst(CIP[2], col, f'CAV_cipo_{v:03d}', (p.x, p.y, 6.1), (0, 0, -f * D), (1.0, 1.0, rnd.uniform(0.7, 1.0))); v += 1
    # junto às quedas laterais e nas pontas das galerias
    for (x, y, z) in [(33.5, -21.5, 10), (36.5, -9.5, 15.5), (-28, -27, 9), (-33, -20, 8)]:
        inst(CIP[1], col, f'CAV_cipo_{v:03d}', (x, y, z), (0, 0, rnd.uniform(0, 6)), 1.0); v += 1
    for s in (-1, 1):
        for zz in (40, 30, 20):
            p = P(36.5, s * 76)
            inst(CIP[zz % 3], col, f'CAV_cipo_{v:03d}', (p.x, p.y, zz), (0, 0, s * 76 * -D), 1.0); v += 1
    say('cipos', v)
    CP.limpa_violacoes(col, ['CAV_'], say)

    # ---------- prévias ----------
    luzes()
    vistas = {
        'entrada': dict(cam=(0, -45, 6.5), alvo=(0, 10, 17), lente=14),
        'frontal': dict(cam=(0, -6, 5.5), alvo=(0, 36, 19), lente=15),
        'diagonal': dict(cam=(30, -30, 11), alvo=(-6, 22, 14), lente=16),
        'garagem': dict(cam=(-14, -17, 7), alvo=(16, 26, 16), lente=16),
        'detalhe': dict(cam=(9, 20, 5), alvo=(-1, 34, 4), lente=24),
        'teto': dict(cam=(0, -20, 6), alvo=(0, 20, 45), lente=16),
    }
    for nome, v_ in vistas.items():
        if SO_VISTA and nome not in SO_VISTA.split(','): continue
        previa(f'caverna_{nome}', res=(1600, 900), luz=False, **v_)
    # tris da área
    cat = {}
    for o in col.objects:
        if o.type != 'MESH': continue
        kcat = o.name.split('_')[1]; cat[kcat] = cat.get(kcat, 0) + sum(len(p.vertices) - 2 for p in o.data.polygons)
    say('tris por grupo', sorted(cat.items(), key=lambda x: -x[1]))
    say('tris A_CAVERNA', sum(cat.values()))
    if PREVIAS_SO: return
    for o in list(bpy.data.collections['CTX_CAV'].objects): bpy.data.objects.remove(o)
    bpy.data.collections.remove(bpy.data.collections['CTX_CAV'])
    fecha('area_caverna', col)

rodar(main)
