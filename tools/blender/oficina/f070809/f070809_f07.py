# Fachada 07 (Madeira): boca de serraria/mina em madeira bruta. Esteios, verga, escoras diagonais,
# cambota em arco por dentro, telhado de tábuas, pilha de toras à esquerda, bancada com serra circular
# à direita, machados e serrote na estrutura, lascas no chão, lanternas de luz quente.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from f070809_comum import *

def main(args):
    C.limpa()
    col = colecao('F07')
    rnd = random.Random(7)
    madeira = material('F07_madeira', 'rough_wood', tint=(0.66, 0.47, 0.31))
    tabua = material('F07_tabua', 'weathered_planks', tint=(0.82, 0.6, 0.4))
    escura = material('F07_tabua_esc', 'weathered_planks', tint=(0.36, 0.25, 0.17))
    casca = material('F07_casca', 'bark_brown_02', tint=(0.72, 0.56, 0.42))
    topo = mat_img('F07_topo', tex_anel(), 'rough_wood', rough=0.85, nor_k=0.4)
    ferro = cor('F07_ferro', (0.09, 0.085, 0.08), rough=0.5, metal=0.9)
    aco = cor('F07_aco', (0.78, 0.79, 0.8), rough=0.28, metal=1.0)
    serragem = material('F07_serragem', 'rough_wood', tint=(1.0, 0.78, 0.5))

    # --- tapume de tábuas atrás da estrutura (vertical, em volta do vão) ---
    parede_arco('F07_tapume', col, 8.9, 6.35, 0.25, escura, folga=0.12, frente=-0.18, tam=2.2)

    # --- cambota: arco de peças retas (como escoramento de mina) com pernas até o chão ---
    rc = R + 0.45; n = 6; wv = 0.3
    for s in (-1, 1):
        viga(f'F07_perna{s}', col, (s * rc, -0.32, 0), (s * rc, -0.32, SPRING + 0.05), wv, 0.34, madeira, bev=0.03)
    for i in range(n):
        a0 = math.pi * i / n; a1 = math.pi * (i + 1) / n
        p0 = (rc * math.cos(a0), -0.32, SPRING + rc * math.sin(a0)); p1 = (rc * math.cos(a1), -0.32, SPRING + rc * math.sin(a1))
        e0 = Vector(p0) - (Vector(p1) - Vector(p0)).normalized() * 0.1; e1 = Vector(p1) + (Vector(p1) - Vector(p0)).normalized() * 0.1
        viga(f'F07_cambota{i}', col, e0, e1, 0.34, wv, madeira, bev=0.03, cima=(0, -1, 0))

    # --- esteios (pilares), verga, escoras ---
    xe = 4.25
    for s in (-1, 1):
        viga(f'F07_esteio{s}', col, (s * xe, -0.5, 0), (s * xe, -0.5, 6.35), 0.46, 0.46, madeira, bev=0.04)
        viga(f'F07_esteio2{s}', col, (s * 5.55, -0.35, 0), (s * 5.55, -0.35, 6.25), 0.36, 0.36, madeira, bev=0.035)
        caixa(f'F07_sapata{s}', col, (0.62, 0.62, 0.22), (s * xe, -0.5, 0.11), madeira, bev=0.03, tam=1.6)
        # mão-francesa entre esteio e verga (fora do vão, no canto)
        viga(f'F07_mao{s}', col, (s * (xe - 0.2), -0.62, 4.75), (s * 2.55, -0.62, 6.32), 0.24, 0.24, madeira, bev=0.025, cima=(0, -1, 0))
        # escora diagonal externa até o chão
        viga(f'F07_escora{s}', col, (s * 5.95, -0.7, 0.0), (s * (xe + 0.2), -0.7, 3.6), 0.26, 0.26, madeira, bev=0.025, cima=(0, -1, 0))
        # travessa entre os dois esteios
        viga(f'F07_trav{s}', col, (s * (xe + 0.2), -0.42, 4.6), (s * 5.4, -0.42, 4.6), 0.2, 0.22, madeira, bev=0.02)
        # grampos de ferro nas emendas
        for z in (4.6, 6.1):
            caixa(f'F07_grampo{s}_{z}', col, (0.5, 0.05, 0.06), (s * xe, -0.75, z), ferro, bev=0.0)
    viga('F07_verga', col, (-6.05, -0.55, 6.55), (6.05, -0.55, 6.55), 0.55, 0.46, madeira, bev=0.04)
    viga('F07_verga2', col, (-5.9, -0.2, 6.05), (5.9, -0.2, 6.05), 0.3, 0.3, madeira, bev=0.03)
    # pontas da verga com tábua de testeira
    caixa('F07_testeira', col, (11.8, 0.06, 0.22), (0, -0.86, 6.9), tabua, bev=0.01, tam=1.6)

    # --- empena de tábuas (frontão) e telhado de duas águas com caibros cruzados na cumeeira ---
    zc, ze, xb = 7.3, 6.8, 5.95
    yf = -0.78
    xs = -xb + 0.15
    while xs < xb - 0.1:
        w = rnd.uniform(0.24, 0.32); xm = xs + w / 2
        hz = ze + (zc - ze) * (1 - abs(xm) / xb) - 0.04
        if hz - ze > 0.06:
            caixa(f'F07_empena{xs:.2f}', col, (w - 0.025, 0.05, hz - ze + 0.06), (xm, yf + 0.06, (ze + hz) / 2 - 0.02),
                  escura if rnd.random() < 0.4 else tabua, bev=0.008, rot=(0, rnd.uniform(-0.015, 0.015), 0), tam=1.4)
        xs += w
    for s in (-1, 1):
        # caibro de frente: passa da cumeeira e cruza o outro (chifres)
        d = Vector((-s * xb, 0, zc - ze)).normalized()
        p0 = Vector((s * (xb + 0.05), yf - 0.08, ze - 0.06)); p1 = Vector((0, yf - 0.08, zc)) + d * 0.42
        viga(f'F07_caibro{s}', col, p0, p1, 0.16, 0.2, madeira, bev=0.025, cima=(0, -1, 0))
        viga(f'F07_caibroT{s}', col, (s * xb, 0.15, ze), (0, 0.15, zc), 0.12, 0.16, madeira, bev=0.015)
        L = math.hypot(xb, zc - ze); nt = 16; ang = math.atan2(zc - ze, xb)
        for i in range(nt):
            t = (i + 0.5) / nt; x = s * xb * (1 - t); z = ze + (zc - ze) * t + 0.1
            w = L / nt - 0.03 + rnd.uniform(-0.03, 0.0)
            prof = 1.3 + rnd.uniform(-0.1, 0.12)
            caixa(f'F07_telha{s}_{i}', col, (w, prof, 0.06), (x, -0.35 + rnd.uniform(-0.05, 0.05), z),
                  tabua if i % 3 else escura, bev=0.01, rot=(rnd.uniform(-0.03, 0.03), -s * ang + rnd.uniform(-0.04, 0.04), 0), tam=1.4)
    # tábuas soltas pregadas na diagonal sobre os cantos do tapume (como na arte)
    for s in (-1, 1):
        for j, (x, z, a, L) in enumerate(((3.55, 6.35, 35, 1.2), (5.0, 5.55, -55, 0.9), (4.95, 3.9, 20, 0.8))):
            caixa(f'F07_avulsa{s}_{j}', col, (L, 0.04, 0.2), (s * x, -0.84 if j else -0.9, z), tabua, bev=0.008,
                  rot=(0, math.radians(s * a), 0), tam=1.2)

    # --- pilha de toras à esquerda (topos voltados para o salão) ---
    rows = [(4, 0.3), (3, 0.3), (2, 0.3), (1, 0.29)]
    x0 = -6.08; k = 0
    for j, (cnt, r) in enumerate(rows):
        for i in range(cnt):
            x = x0 + r + i * 2 * r + j * r; z = r + j * r * 1.73
            rr = r * rnd.uniform(0.9, 1.04)
            tora(f'F07_tora{k}', col, (x, -0.66 + rnd.uniform(-0.05, 0.04), z), (0, 1, 0), rr, 1.1 + rnd.uniform(-0.08, 0.06),
                 casca, topo, seed=k); k += 1
    # duas toras compridas deitadas por cima e um toco


    # --- bancada de serraria com serra circular (à direita, fora do vão) ---
    bx, by, bz = 5.05, -0.72, 0.92
    caixa('F07_bancada', col, (1.75, 0.8, 0.09), (bx, by, bz), tabua, bev=0.012, tam=1.4)
    for sx in (-1, 1):
        for sy in (-1, 1):
            viga(f'F07_pe{sx}{sy}', col, (bx + sx * 0.75, by + sy * 0.3, 0), (bx + sx * 0.75, by + sy * 0.3, bz - 0.04), 0.1, 0.1, madeira, bev=0.012)
        viga(f'F07_trv{sx}', col, (bx + sx * 0.75, by - 0.3, 0.3), (bx + sx * 0.75, by + 0.3, 0.3), 0.08, 0.08, madeira, bev=0.01)
    viga('F07_trvL', col, (bx - 0.75, by, 0.3), (bx + 0.75, by, 0.3), 0.08, 0.08, madeira, bev=0.01)
    # lâmina: disco com dentes, de frente para o salão, meio acima da bancada
    rl = 0.74; nd = 44; bm = bmesh.new(); vs = []
    for i in range(nd * 2):
        a = math.pi * 2 * i / (nd * 2); rr = rl if i % 2 == 0 else rl * 0.9
        a += (0.03 if i % 2 == 0 else 0)
        vs.append(bm.verts.new((rr * math.cos(a), 0, rr * math.sin(a))))
    f = bm.faces.new(vs); ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, vec=Vector((0, 0.012, 0)), verts=[e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = objeto('F07_serra', bm, col, aco); o.location = (bx - 0.05, by - 0.02, bz + 0.26); uv_mundo(o, 1.0)
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=0.12, radius2=0.12, depth=0.06)
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'X'), verts=bm.verts)
    o = objeto('F07_cubo', bm, col, ferro); o.location = (bx - 0.05, by - 0.02, bz + 0.26)
    caixa('F07_capa', col, (0.22, 0.5, 0.06), (bx - 0.05, by + 0.05, bz + 1.07), ferro, bev=0.01)
    # tábua sendo serrada
    caixa('F07_tabua_corte', col, (1.6, 0.32, 0.06), (bx + 0.05, by - 0.12, bz + 0.08), tabua, bev=0.01, rot=(0, 0, 0.04), tam=1.2)
    # serragem e lascas
    bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=20, radius=1.0)
    for v in bm.verts: v.co.x *= 1.05 + rnd.uniform(-0.1, 0.1); v.co.y *= 0.4 + rnd.uniform(-0.06, 0.06); v.co.z = 0.012
    o = objeto('F07_serragem', bm, col, serragem); o.location = (bx - 0.1, -0.8, 0); uv_mundo(o, 0.8)
    for i in range(46):
        x = rnd.choice([rnd.uniform(-6.0, -3.6), rnd.uniform(3.6, 6.1)]); y = rnd.uniform(-1.25, -0.6)
        caixa(f'F07_lasca{i}', col, (rnd.uniform(0.07, 0.2), rnd.uniform(0.025, 0.05), rnd.uniform(0.008, 0.02)),
              (x, y, 0.012), tabua, bev=0.0, rot=(rnd.uniform(-0.3, 0.3), rnd.uniform(-0.3, 0.3), rnd.uniform(0, 3.14)), tam=0.6)

    # --- ferramentas na estrutura: machados cravados na verga, machadinha e serrote no esteio ---
    # machado e machadinha cruzados sobre cada ponta do telhado; machadinha cravada no esteio; machado encostado
    for s in (-1, 1):
        o = modelo('wooden_axe', col, f'F07_machado{s}', s * 5.15, -1.0, 6.1, altura=1.55)
        o.rotation_mode = 'ZYX'; o.rotation_euler = (0, math.radians(s * 38), math.radians(90 * s))
        o = modelo('hatchet', col, f'F07_machadinhaX{s}', s * 5.15, -1.06, 6.4, altura=1.0)
        o.rotation_mode = 'ZYX'; o.rotation_euler = (0, math.radians(-s * 40), math.radians(-90 * s))
    o = modelo('hatchet', col, 'F07_machadinha', -4.25, -0.9, 3.0, altura=0.5)
    o.rotation_euler = (0, math.radians(-18), 0)
    o = modelo('wooden_axe', col, 'F07_machado_pe', 5.95, -1.0, 0, altura=0.85)
    o.rotation_euler = (0, math.radians(14), 0)

    # --- lanternas penduradas em braços de ferro nos esteios ---
    for s in (-1, 1):
        caixa(f'F07_braco{s}', col, (0.05, 0.45, 0.05), (s * xe, -0.92, 5.3), ferro, bev=0.0)
        caixa(f'F07_mao_f{s}', col, (0.04, 0.04, 0.3), (s * xe, -1.1, 5.15), ferro, bev=0.0)
        o = lanterna(col, f'F07_lanterna{s}', s * xe, -1.1, 4.25, altura=0.95)
        dec(o, 0.12)

    for o in col.objects:
        if o.name.startswith(('F07_tora', 'F07_toraL')): suave(o, 60)

    limites(col)
    junta(col, 'F07')
    checa_vao(col)
    cenario_previa()
    for s in (-1, 1): luz_ponto(f'PREV_lant{s}', (s * xe, -1.6, 4.5), energia=60)
    luz_ponto('PREV_boca', (0, -0.5, 4.5), (1, 0.6, 0.3), energia=400, raio=1)
    previa('f07_frente', cam=(0, -15.5, 3.6), alvo=(0, 0, 3.7), lente=30)
    c, a = cam_arte(-52); say('cam arte', c)
    previa('f07_arte', cam=c, alvo=a, lente=32)
    previa('f07_perto', cam=(-7.5, -6.5, 2.0), alvo=(-4.5, -0.5, 1.6), lente=30)
    fecha('fachada_07', col)

rodar(main)
