# Fachada 08 (Têxtil): cortinas drapeadas roxas, azuis, rosa e listradas caindo dos lados do arco,
# presas por abraçadeiras douradas; bandô roxo sobre a sanefa de madeira; arco de madeira por trás;
# fio roxo luminoso em espiral subindo por uma cortina, passando por cima do arco e descendo pela outra;
# roda de fiar e tear de pé na frente, cesto e novelos.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from f070809_comum import *


def cortina(nome, col, mat, x0, x1, ztop, tx, tz, bx0, bx1, y0, dobras=7, seed=0, tam=1.4, wt=0.38, nu=44, nv=32):
    """Cortina drapeada presa por abraçadeira: dobras verticais cuja profundidade cresce onde o pano é franzido."""
    rnd = random.Random(seed)
    W0 = abs(x1 - x0); vt = 1 - tz / ztop
    fases = [rnd.uniform(0, 0.6) for _ in range(4)]
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); grid = []
    def sm(t): t = min(max(t, 0), 1); return t * t * (3 - 2 * t)
    for j in range(nv + 1):
        v = j / nv; z = ztop * (1 - v) + 0.03 * v
        if v <= vt:
            s = sm(v / vt) ** 0.8
            xa = x0 + (tx - wt / 2 - x0) * s; xb = x1 + (tx + wt / 2 - x1) * s
        else:
            s = ((v - vt) / (1 - vt)) ** 0.6
            xa = (tx - wt / 2) + (bx0 - (tx - wt / 2)) * s; xb = (tx + wt / 2) + (bx1 - (tx + wt / 2)) * s
        w = abs(xb - xa)
        A = 0.5 * math.sqrt(max(0.0, (W0 * 1.25 / dobras) ** 2 - (w / dobras) ** 2)) + 0.035
        bojo = 0.14 * math.exp(-((v - vt) / 0.07) ** 2)
        linha = []
        for i in range(nu + 1):
            u = i / nu
            ph = fases[0] + 0.25 * math.sin(v * 5 + fases[1])
            dob = 0.5 + 0.5 * math.sin(2 * math.pi * (dobras * u + ph))
            dob = dob ** 1.4
            borda = math.sin(math.pi * u) ** 0.3
            x = xa + (xb - xa) * u
            y = y0 - A * dob * borda - bojo * math.sin(math.pi * u)
            linha.append(bm.verts.new((x, y, z)))
        grid.append(linha)
    for j in range(nv):
        for i in range(nu):
            f = bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
            for lp, (ii, jj) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
                lp[uvl].uv = (ii / nu * W0 * 1.25 / tam, (ztop * (1 - jj / nv)) / tam)
            f.smooth = True
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = objeto(nome, bm, col, mat); return o


def bando(nome, col, mat, xa, xb, ztop, queda, y0, nu=40, nv=12, tam=1.4):
    """Bandô: pano em festão sobre a sanefa, com dobras horizontais acompanhando a curva."""
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); g = []
    for j in range(nv + 1):
        v = j / nv; row = []
        for i in range(nu + 1):
            u = i / nu; x = xa + (xb - xa) * u; sg = math.sin(math.pi * u)
            h = 0.2 + queda * sg
            z = ztop - v * h
            y = y0 - 0.1 * sg * v - 0.05 * math.sin(v * math.pi * 4.5) * (0.3 + sg) - 0.04
            row.append(bm.verts.new((x, y, z)))
        g.append(row)
    for j in range(nv):
        for i in range(nu):
            f = bm.faces.new((g[j][i], g[j][i + 1], g[j + 1][i + 1], g[j + 1][i])); f.smooth = True
            for lp, (ii, jj) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
                lp[uvl].uv = (ii / nu * abs(xb - xa) / tam, jj / nv * 0.9 / tam)
    o = objeto(nome, bm, col, mat); return o


def tex_fio(N=256):
    """Novelo/carretel: 4 faixas de cor, cada uma com voltas de fio finas."""
    cores = [(0.55, 0.18, 0.75), (0.2, 0.32, 0.8), (0.85, 0.35, 0.55), (0.9, 0.7, 0.35)]
    y, x = np.mgrid[0:N, 0:N].astype(np.float32)
    col = np.zeros((N, N, 3), np.float32)
    for k, c in enumerate(cores):
        m = (x >= k * N / 4) & (x < (k + 1) * N / 4)
        voltas = 0.75 + 0.25 * np.sin(y * 1.6 + np.sin(x * 0.3) * 1.5) ** 2
        col[m] = np.array(c)[None] * voltas[m][:, None]
    return salva_png('f08_fio', col)


def tex_urdume(N=256):
    """Urdidura do tear: fios verticais coloridos com frestas escuras."""
    rnd = np.random.default_rng(8)
    pal = np.array([(0.6, 0.2, 0.8), (0.25, 0.35, 0.85), (0.9, 0.5, 0.6), (0.95, 0.85, 0.7)])
    x = np.arange(N); fio = (np.sin(x * np.pi / 4) > -0.2).astype(np.float32)
    cor_x = pal[(x // 32) % 4]
    col = np.repeat((cor_x * fio[:, None] + 0.04 * (1 - fio[:, None]))[None], N, 0)
    col *= (0.9 + 0.1 * rnd.random((N, N, 1)))
    return salva_png('f08_urdume', col)


def main(args):
    C.limpa()
    col = colecao('F08')
    rnd = random.Random(8)
    roxo = material('F08_roxo', 'terlenka', tint=(0.32, 0.09, 0.55), nor_k=1.2)
    magenta = material('F08_magenta', 'terlenka', tint=(0.42, 0.04, 0.4), nor_k=1.2)
    azul = material('F08_azul', 'terlenka', tint=(0.13, 0.2, 0.62), nor_k=1.2)
    listL = mat_img('F08_listrado_a', tex_listras('f08_listras_a', [(0.25, 0.35, 0.85), (0.95, 0.72, 0.62), (0.62, 0.5, 0.9),
                    (0.12, 0.16, 0.5), (0.98, 0.88, 0.8), (0.4, 0.55, 0.95)], seed=3), 'terlenka', rough=0.75, nor_k=1.2)
    listR = mat_img('F08_listrado_b', tex_listras('f08_listras_b', [(0.2, 0.3, 0.85), (0.5, 0.15, 0.7), (0.85, 0.2, 0.5),
                    (0.15, 0.55, 0.65), (0.9, 0.7, 0.3), (0.1, 0.12, 0.45), (0.75, 0.4, 0.9)], seed=11), 'terlenka', rough=0.75, nor_k=1.2)
    madeira = material('F08_madeira', 'rough_wood', tint=(0.42, 0.28, 0.19))
    dourado = ouro('F08_ouro', emiss=0.0)
    brilho = cor('F08_fio_luz', (0.66, 0.08, 1.0), rough=0.3, emiss=1.5)
    halo = cor('F08_fio_halo', (0.45, 0.04, 0.9), rough=0.5, emiss=0.8)
    fio = mat_img('F08_novelo', tex_fio(), 'terlenka', rough=0.9, nor_k=0.6)
    urd = mat_img('F08_urdume', tex_urdume(), None, rough=0.8)

    # --- arco de madeira por trás das cortinas e sanefa no topo ---
    banda_U('F08_arco', col, R + 0.12, R + 0.62, -0.42, 0.45, madeira, tam=1.6)
    banda_U('F08_friso', col, R + 0.1, R + 0.2, -0.47, 0.08, dourado, tam=1.0)
    for s in (-1, 1):
        viga(f'F08_poste{s}', col, (s * 6.0, -0.3, 0), (s * 6.0, -0.3, 6.5), 0.28, 0.28, madeira, bev=0.03)
    caixa('F08_sanefa', col, (12.2, 0.55, 0.5), (0, -0.66, 6.72), madeira, bev=0.04, tam=1.6)
    caixa('F08_sanefa_friso', col, (12.25, 0.04, 0.06), (0, -0.95, 6.5), dourado, bev=0.0)
    tubo('F08_varao', col, [(-6.15, -0.45, 6.38), (6.15, -0.45, 6.38)], 0.045, dourado, lados=8)

    # --- cortinas: esquerda (roxa por fora, listrada azul/pêssego por dentro), direita (magenta e listrada) ---
    cortina('F08_cL_fora', col, roxo, -6.15, -4.45, 6.4, -5.45, 2.1, -6.2, -4.75, -0.42, dobras=6, seed=1)
    cortina('F08_cL_dentro', col, listL, -4.75, -3.4, 6.4, -4.55, 2.55, -4.95, -3.95, -0.62, dobras=5, seed=2, wt=0.3)
    cortina('F08_cR_fora', col, magenta, 4.45, 6.15, 6.4, 5.45, 2.3, 4.75, 6.2, -0.42, dobras=6, seed=3)
    cortina('F08_cR_dentro', col, listR, 3.4, 4.75, 6.4, 4.6, 2.8, 3.95, 5.0, -0.62, dobras=5, seed=4, wt=0.3)
    cortina('F08_cR_azul', col, azul, 5.0, 6.1, 6.4, 5.7, 2.4, 5.4, 6.2, -0.2, dobras=4, seed=5, wt=0.3)
    # abraçadeiras douradas (laço de corda dourada em volta do franzido)
    for nome, x, z, y in (('L1', -5.45, 2.1, -0.55), ('L2', -4.55, 2.55, -0.78), ('R1', 5.45, 2.3, -0.55), ('R2', 4.6, 2.8, -0.78)):
        pts = [(x + 0.34 * math.cos(a), y - 0.2 * math.sin(a), z + 0.04 * math.sin(3 * a)) for a in np.linspace(0, 2 * math.pi, 25)]
        tubo(f'F08_laco{nome}', col, pts, 0.035, dourado, lados=6)
        pts = [(x + 0.03 * i * (1 if 'R' in nome else -1), y - 0.25, z - 0.08 * i) for i in range(8)]
        tubo(f'F08_borla{nome}', col, pts, 0.04, dourado, lados=6, raios=[0.04, 0.03, 0.03, 0.04, 0.06, 0.07, 0.06, 0.01])

    # --- bandô roxo em dois festões sobre a sanefa ---
    bando('F08_bandoL', col, roxo, -6.2, -0.4, 7.0, 0.62, -0.95)
    bando('F08_bandoR', col, roxo, 0.4, 6.2, 7.0, 0.62, -0.95)

    # --- fio luminoso: sobe em espiral pela cortina esquerda, cruza por cima do arco, desce pela direita ---
    pts = []
    for i in range(70):  # espiral esquerda subindo
        t = i / 69; a = math.pi / 2 - (1 - t) * 2 * math.pi * 2
        pts.append((-4.95 + 0.9 * math.cos(a), -0.72 - 0.45 * math.sin(a), 0.35 + t * 5.05))
    for i in range(1, 40):  # arco por cima do vão, na frente do bandô
        t = i / 40; x = -4.95 + 9.9 * t
        pts.append((x, -1.15 + 0.03 * math.sin(t * math.pi * 3), 5.4 + 0.85 * math.sin(math.pi * t)))
    for i in range(70):  # espiral direita descendo
        t = i / 69; a = math.pi / 2 + t * 2 * math.pi * 1.75
        pts.append((4.95 + 0.9 * math.cos(a + math.pi), -0.72 - 0.45 * math.sin(a), 5.4 - t * 5.05))
    tubo('F08_fio_luz', col, pts, 0.03, brilho, lados=6)
    fita('F08_fio_halo', col, pts, 0.11, halo, torce=6)
    # faíscas ao longo do fio
    for i in range(34):
        while True:
            p = Vector(pts[rnd.randrange(len(pts))]) + Vector((rnd.uniform(-0.25, 0.25), rnd.uniform(-0.1, 0.1), rnd.uniform(-0.25, 0.25)))
            if abs(p.x) > R + 0.15 or p.z > SPRING + math.sqrt(max(0, R * R - p.x * p.x)) + 0.15: break
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=rnd.uniform(0.02, 0.045))
        o = objeto(f'F08_faisca{i}', bm, col, brilho); o.location = p

    # --- roda de fiar (Poly Haven) à esquerda, tear de pé à direita, cesto e novelos ---
    o = modelo('spinning_wheel_01', col, 'F08_roda', -4.75, -0.72, 0, rz=math.radians(90), altura=1.15); dec(o, 0.1)
    o = modelo('wicker_basket_02', col, 'F08_cesto', -3.7, -0.95, 0, rz=0.4, altura=0.42); dec(o, 0.12)
    for i, (x, y, z, r) in enumerate(((-3.8, -0.98, 0.42, 0.13), (-3.62, -1.08, 0.4, 0.11), (-3.95, -1.1, 0.38, 0.1),
                                      (-4.3, -1.15, 0.1, 0.1), (3.6, -1.12, 0.11, 0.11), (-3.75, -1.2, 0.08, 0.08))):
        bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=14, v_segments=10, radius=r)
        uvl = bm.loops.layers.uv.verify(); k = i % 4
        for f in bm.faces:
            for lp in f.loops:
                c = lp.vert.co; u = (math.atan2(c.y, c.x) / (2 * math.pi) + 0.5)
                lp[uvl].uv = ((k + 0.1 + 0.8 * u) / 4, (c.z / r + 1) * 1.5)
            f.smooth = True
        o = objeto(f'F08_novelo{i}', bm, col, fio); o.location = (x, y, z); o.rotation_euler = (rnd.uniform(0, 1), rnd.uniform(0, 1), 0)
    # tear: montantes, rolos, liço, urdume e o pano já tecido
    tx0, tx1, ty = 3.75, 5.55, -1.0
    for x in (tx0, tx1):
        viga(f'F08_tear_m{x}', col, (x, ty, 0), (x, ty, 2.05), 0.1, 0.1, madeira, bev=0.012)
        viga(f'F08_tear_p{x}', col, (x, ty - 0.22, 0.0), (x, ty + 0.25, 0.0), 0.1, 0.08, madeira, bev=0.01)
    for z, r in ((1.95, 0.06), (0.85, 0.07), (0.35, 0.06)):
        tubo(f'F08_tear_rolo{z}', col, [(tx0 - 0.05, ty, z), (tx1 + 0.05, ty, z)], r, madeira, lados=10)
    tubo('F08_tear_lico', col, [(tx0 + 0.05, ty - 0.08, 1.45), (tx1 - 0.05, ty - 0.08, 1.45)], 0.03, madeira, lados=6)
    def quad(nome, x0, x1, z0, z1, y, mat, u1=1.0, v1=1.0):
        bm = bmesh.new(); uvl = bm.loops.layers.uv.new()
        f = bm.faces.new([bm.verts.new(p) for p in ((x0, y, z0), (x1, y, z0), (x1, y, z1), (x0, y, z1))])
        for lp, uv in zip(f.loops, ((0, 0), (u1, 0), (u1, v1), (0, v1))): lp[uvl].uv = uv
        return objeto(nome, bm, col, mat)
    quad('F08_tear_fios', tx0 + 0.08, tx1 - 0.08, 1.12, 1.9, ty - 0.01, urd, 2.0, 1.0)
    quad('F08_tear_pano', tx0 + 0.08, tx1 - 0.08, 0.86, 1.12, ty - 0.02, listR, 1.2, 0.25)
    caixa('F08_naveta', col, (0.42, 0.06, 0.05), (4.4, ty - 0.12, 1.25), madeira, bev=0.012, tam=0.6)

    limites(col)
    junta(col, 'F08')
    checa_vao(col)
    cenario_previa(tunel=(0.9, 0.5, 0.35))
    luz_ponto('PREV_boca', (0, -0.6, 4.5), (1, 0.6, 0.45), energia=400, raio=1)
    luz_ponto('PREV_fioL', (-4.9, -1.6, 3.0), (0.8, 0.35, 1), energia=120)
    luz_ponto('PREV_fioR', (4.9, -1.6, 3.0), (0.8, 0.35, 1), energia=120)
    previa('f08_frente', cam=(0, -15.5, 3.6), alvo=(0, 0, 3.7), lente=30)
    c, a = cam_arte(-33); say('cam arte', c)
    previa('f08_arte', cam=c, alvo=a, lente=32)
    previa('f08_perto', cam=(-6.5, -6.0, 2.8), alvo=(-4.6, -0.6, 2.6), lente=30)
    fecha('fachada_08', col)

rodar(main)
