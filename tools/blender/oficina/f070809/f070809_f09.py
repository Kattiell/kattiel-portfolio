# Fachada 09 (Grãos): arco dourado com guirlanda de trigo subindo dos dois lados e plumas no topo,
# dois silos de chapa ondulada de cada lado (o de fora maior), feixes de trigo amarrados ao pé do arco,
# sacos de juta, cesto de vime com grãos e monte de grão derramado. Luz dourada (trigo levemente emissivo).
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from f070809_comum import *


def bez(p0, p1, p2, t):
    return p0 * (1 - t) ** 2 + p1 * 2 * t * (1 - t) + p2 * t * t


def trigo(bm, p0, p1, p2, rnd, haste=0.016, grao=0.05, nk=11, espiga=0.46):
    """Um pé de trigo: haste curva (3 lados) do ponto p0 a p2 e espiga de grãos alternados com praganas."""
    p0, p1, p2 = Vector(p0), Vector(p1), Vector(p2); n = 6
    pts = [bez(p0, p1, p2, i / n) for i in range(n + 1)]
    t0 = (pts[1] - pts[0]).normalized(); ref = Vector((0, 1, 0)) if abs(t0.y) < 0.9 else Vector((1, 0, 0))
    a = t0.cross(ref).normalized(); rings = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, n)] - pts[max(i - 1, 0)]).normalized(); a = (a - t * a.dot(t)).normalized(); b = t.cross(a)
        r = haste * (1 - 0.4 * i / n)
        rings.append([bm.verts.new(p + (a * math.cos(k * 2.094) + b * math.sin(k * 2.094)) * r) for k in range(3)])
    for i in range(n):
        for k in range(3):
            bm.faces.new((rings[i][k], rings[i][(k + 1) % 3], rings[i + 1][(k + 1) % 3], rings[i + 1][k]))
    # espiga: continua na direção da ponta
    d = (p2 - bez(p0, p1, p2, 0.93)).normalized(); s = d.cross(Vector((0, 1, 0)) if abs(d.y) < 0.9 else Vector((1, 0, 0))).normalized()
    s2 = d.cross(s)
    for k in range(nk):
        t = k / (nk - 1); c = p2 + d * (espiga * t)
        lado = 1 if k % 2 == 0 else -1; g = grao * (1 - 0.35 * t)
        cc = c + s * lado * g * 0.3
        eixo = (d + s * lado * 0.3).normalized(); lat = s2
        top = cc + eixo * g * 1.7; bot = cc - eixo * g * 0.9
        e1 = cc + lat * g * 0.75; e2 = cc - lat * g * 0.75; e3 = cc + eixo.cross(lat) * g * 0.65; e4 = cc - eixo.cross(lat) * g * 0.65
        vt, vb, v1, v2, v3, v4 = (bm.verts.new(x) for x in (top, bot, e1, e3, e2, e4))
        for q in ((v1, v2), (v2, v3), (v3, v4), (v4, v1)):
            bm.faces.new((vt, q[0], q[1])); bm.faces.new((vb, q[1], q[0]))
        if k % 2 == 0:  # pragana (barba) fina
            tip = cc + (eixo * 1.0 + s * lado * 0.35).normalized() * espiga * rnd.uniform(0.7, 1.0)
            w = s2 * 0.004
            bm.faces.new((bm.verts.new(top - w), bm.verts.new(top + w), bm.verts.new(tip)))


def dentro(p):
    """True se o ponto respeita o nicho: fora do vão, largura 12.4, altura 7.6, saliência 1.3."""
    if abs(p.x) > 6.15 or p.z > 7.56 or p.y < -1.27: return False
    if p.y < 0.6 and abs(p.x) < R + 0.06 and p.z < SPRING + math.sqrt(max(0.0, (R + 0.06) ** 2 - p.x * p.x)) + 0.06: return False
    return True


def trigo_ok(bm, *a, **k):
    """Cria o pé de trigo e o descarta inteiro se qualquer ponta sair do nicho ou entrar no vão."""
    bm.verts.ensure_lookup_table(); n0 = len(bm.verts)
    trigo(bm, *a, **k)
    bm.verts.ensure_lookup_table(); novos = [bm.verts[i] for i in range(n0, len(bm.verts))]
    if all(dentro(v.co) for v in novos): return True
    bmesh.ops.delete(bm, geom=novos, context='VERTS'); return False


def silo(nome, col, x, y, r, h, telha, chapa, aro, rnd):
    """Silo de chapa ondulada (ondas horizontais), aros, telhado cônico de chapa e respiro no topo."""
    seg = 28; bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); rows = 6
    ring = []
    for j in range(rows + 1):
        z = h * j / rows; ring.append([bm.verts.new((x + r * math.cos(2 * math.pi * k / seg), y + r * math.sin(2 * math.pi * k / seg), z)) for k in range(seg)])
    for j in range(rows):
        for k in range(seg):
            k2 = (k + 1) % seg
            f = bm.faces.new((ring[j][k], ring[j][k2], ring[j + 1][k2], ring[j + 1][k])); f.smooth = True
            for lp, (kk, jj) in zip(f.loops, ((k, j), (k + 1, j), (k + 1, j + 1), (k, j + 1))):
                lp[uvl].uv = (h * jj / rows / 1.2, kk / seg * 2 * math.pi * r / 1.2)   # ondas na horizontal
    o = objeto(nome, bm, col, chapa)
    # telhado cônico com beiral
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); rr = r + 0.1; ht = 0.42 * r + 0.25
    base = [bm.verts.new((x + rr * math.cos(2 * math.pi * k / seg), y + rr * math.sin(2 * math.pi * k / seg), h - 0.05)) for k in range(seg)]
    top = [bm.verts.new((x + 0.12 * math.cos(2 * math.pi * k / seg), y + 0.12 * math.sin(2 * math.pi * k / seg), h + ht)) for k in range(seg)]
    for k in range(seg):
        k2 = (k + 1) % seg
        f = bm.faces.new((base[k], base[k2], top[k2], top[k])); f.smooth = True
        for lp, (kk, jj) in zip(f.loops, ((k, 0), (k + 1, 0), (k + 1, 1), (k, 1))):
            lp[uvl].uv = (kk / seg * 2 * math.pi * rr / 0.9, jj * rr / 0.9)
    bm.faces.new(list(reversed(base)))
    objeto(nome + '_teto', bm, col, telha)
    # respiro (chapéu) no topo
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.13, radius2=0.13, depth=0.18)
    bmesh.ops.translate(bm, vec=Vector((x, y, h + ht + 0.09)), verts=bm.verts)
    bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.24, radius2=0.02, depth=0.16, matrix=Matrix.Translation((x, y, h + ht + 0.26)))
    objeto(nome + '_respiro', bm, col, telha)
    # aros de reforço
    for j in range(1, 6):
        z = h * j / 6 + 0.02
        pts = [(x + (r + 0.02) * math.cos(2 * math.pi * k / 24), y + (r + 0.02) * math.sin(2 * math.pi * k / 24), z) for k in range(25)]
        tubo(f'{nome}_aro{j}', col, pts, 0.022, aro, lados=4)
    return o


def saco(nome, col, mat, cord, x, y, z, rz, esc=1.0, ry=0.0):
    """Saco de juta cheio deitado (travesseiro): caixa subdividida e arredondada, costura e boca amarrada numa ponta."""
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=4, use_grid_fill=True)
    for v in bm.verts:
        c = v.co.copy(); c = c.lerp(c.normalized() * 0.5, 0.45)
        boca = max(0.0, c.x - 0.3) / 0.2                    # ponta amarrada em +x
        k = 1 - 0.32 * boca
        c.y *= k; c.z *= k
        c.x *= 0.8; c.y *= 0.5 * (1 + 0.05 * math.sin(c.x * 11)); c.z *= 0.34
        v.co = c
    bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.05, radius2=0.1, depth=0.12,
                          matrix=Matrix.Translation((0.46, 0, 0)) @ Matrix.Rotation(math.radians(90), 4, 'Y'))
    for f in bm.faces: f.smooth = True
    bmesh.ops.scale(bm, vec=Vector((esc, esc, esc)), verts=bm.verts)
    o = objeto(nome, bm, col, mat)
    o.location = (x, y, z + 0.16 * esc); o.rotation_euler = (0, ry, rz)
    bpy.context.view_layer.update(); uv_mundo(o, 0.55)
    mw = o.matrix_world.copy()
    pts = [mw @ Vector((0.4 * esc, 0.075 * esc * math.cos(a), 0.075 * esc * math.sin(a))) for a in np.linspace(0, 2 * math.pi, 11)]
    tubo(nome + '_corda', col, pts, 0.014 * esc, cord, lados=4)
    return o


def main(args):
    C.limpa()
    col = colecao('F09')
    rnd = random.Random(9)
    dourado = ouro('F09_ouro', (1.0, 0.64, 0.2), rough=0.26, emiss=0.1)
    dourado.node_tree.nodes['Normal Map'].inputs['Strength'].default_value = 0.1
    trigo_m = cor('F09_trigo', (0.95, 0.52, 0.06), rough=0.4, metal=0.45, emiss=0.7)
    chapa = material('F09_chapa', 'corrugated_iron', tint=(0.6, 0.62, 0.66), metal=0.8)
    telha = material('F09_telha', 'corrugated_iron', tint=(0.78, 0.8, 0.84), metal=0.85)
    aro = cor('F09_aro', (0.32, 0.33, 0.35), rough=0.4, metal=0.9)
    juta = material('F09_juta', 'hessian_380', tint=(0.95, 0.88, 0.74))
    corda = cor('F09_corda', (0.55, 0.42, 0.25), rough=0.9)

    # --- arco dourado: moldura principal, frisos interno e externo, rebites e pedestais ---
    banda_U('F09_arco', col, R + 0.12, R + 0.62, -0.55, 0.55, dourado, tam=1.4)
    banda_U('F09_friso_in', col, R + 0.08, R + 0.2, -0.66, 0.14, dourado, tam=1.0)
    banda_U('F09_friso_out', col, R + 0.6, R + 0.76, -0.62, 0.2, dourado, tam=1.0)
    for i in range(23):
        a = math.pi * i / 22; rr = R + 0.4
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.05)
        o = objeto(f'F09_rebite{i}', bm, col, dourado); o.location = (rr * math.cos(a), -0.58, SPRING + rr * math.sin(a))
    for s in (-1, 1):
        caixa(f'F09_pedestal{s}', col, (0.8, 0.75, 0.5), (s * (R + 0.42), -0.42, 0.25), dourado, bev=0.04, tam=1.0)
        caixa(f'F09_capitel{s}', col, (0.82, 0.72, 0.16), (s * (R + 0.42), -0.42, SPRING), dourado, bev=0.03, tam=1.0)

    # --- silos (os de fora maiores, como na arte) ---
    silo('F09_siloG-1', col, -5.3, -0.38, 0.8, 6.0, telha, chapa, aro, rnd)
    silo('F09_siloP-1', col, -4.15, 0.05, 0.6, 5.0, telha, chapa, aro, rnd)
    silo('F09_siloG1', col, 5.3, -0.38, 0.8, 6.25, telha, chapa, aro, rnd)
    silo('F09_siloP1', col, 4.15, 0.05, 0.6, 5.2, telha, chapa, aro, rnd)

    # --- trigo: guirlanda no arco, plumas no topo, feixes ao pé ---
    bm = bmesh.new()
    for s in (-1, 1):
        n = 34
        for i in range(n):
            th = math.radians(4 + 80 * i / (n - 1) + rnd.uniform(-1.5, 1.5))
            rb = R + 0.72 + rnd.uniform(-0.06, 0.1)
            base = Vector((s * rb * math.cos(th), -0.7 + rnd.uniform(-0.14, 0.05), SPRING + rb * math.sin(th)))
            tg = Vector((-s * math.sin(th), 0, math.cos(th)))   # tangente subindo pelo arco
            out = Vector((s * math.cos(th), 0, math.sin(th)))
            L = rnd.uniform(0.55, 0.85); ab = rnd.uniform(0.2, 0.6)
            p2 = base + (tg * math.cos(ab) + out * math.sin(ab)) * L
            if p2.z > 7.0: p2.z = 7.0
            trigo_ok(bm, base, base + tg * L * 0.5 + out * 0.06, p2, rnd, espiga=rnd.uniform(0.38, 0.5))
        # plumas que abrem no topo, dos dois lados do medalhão (ponta da espiga até 7.55)
        for i in range(12):
            base = Vector((s * rnd.uniform(0.6, 1.4), -0.72 + rnd.uniform(-0.12, 0.05), 6.6 + rnd.uniform(-0.05, 0.05)))
            ang = math.radians(10 + 58 * i / 11 + rnd.uniform(-4, 4))
            d = Vector((s * math.cos(ang), 0, math.sin(ang)))
            esp = 0.46; L = rnd.uniform(0.9, 1.6)
            if base.z + d.z * (L + esp) > 7.52: L = max(0.3, (7.52 - base.z) / max(d.z, 0.05) - esp)
            p2 = base + d * L
            trigo_ok(bm, base, base + d * L * 0.5 + Vector((0, 0, 0.04)), p2, rnd, espiga=esp)
        # feixe amarrado ao pé do arco, abrindo para fora do vão
        fx = s * 4.65
        for i in range(105):
            bx = fx + rnd.uniform(-0.13, 0.13); by = -0.92 + rnd.uniform(-0.12, 0.12)
            topz = rnd.uniform(1.8, 3.5)
            tx = s * rnd.uniform(R + 0.55, 5.85)
            if abs(tx) < R + 0.45: tx = s * (R + 0.45 + rnd.uniform(0, 0.25))
            if abs(tx) > 6.05: tx = s * 6.05
            mid = Vector((fx + (bx - fx) * 0.2, -0.92, 1.05))
            trigo_ok(bm, (bx, by, 0.02), mid, (tx, -0.92 + rnd.uniform(-0.25, 0.2), topz), rnd, grao=0.058, espiga=rnd.uniform(0.45, 0.58))
        pts = [(fx + 0.17 * math.cos(a), -0.92 + 0.17 * math.sin(a), 1.05) for a in np.linspace(0, 2 * math.pi, 13)]
        tubo(f'F09_amarra{s}', col, pts, 0.04, corda, lados=5)
    objeto('F09_trigo', bm, col, trigo_m)

    # --- sacos de juta, cesto com grãos, monte de grãos derramado ---
    saco('F09_saco1', col, juta, corda, -5.4, -0.85, 0.0, 0.12, 1.35)
    saco('F09_saco2', col, juta, corda, -4.55, -0.9, 0.0, -0.2, 1.25)
    saco('F09_saco3', col, juta, corda, -5.0, -0.88, 0.42, 0.05, 1.25, ry=0.06)
    saco('F09_saco4', col, juta, corda, 5.4, -0.85, 0.0, 3.0, 1.35)
    saco('F09_saco5', col, juta, corda, 5.3, -0.88, 0.43, 2.9, 1.2, ry=-0.05)
    o = modelo('wicker_basket_01', col, 'F09_cesto', -4.0, -0.9, 0, rz=0.3, larg=0.78); dec(o, 0.12)
    bpy.context.view_layer.update(); top = max((o.matrix_world @ Vector(c)).z for c in o.bound_box)
    bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=16, radius=0.34)
    for v in bm.verts: v.co.x *= 1.0; v.co.y *= 0.72
    bmesh.ops.translate(bm, vec=Vector((-4.0, -0.9, top - 0.04)), verts=bm.verts)
    objeto('F09_graos_cesto', bm, col, trigo_m)
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=10, y_segments=6, size=1)
    for v in bm.verts:
        x, y = v.co.x, v.co.y; d = math.sqrt(x * x + y * y)
        v.co.x = x * 0.45 + 4.35; v.co.y = y * 0.2 - 1.05; v.co.z = max(0.005, 0.2 * (1 - d) + rnd.uniform(-0.01, 0.01))
    for f in bm.faces: f.smooth = True
    objeto('F09_graos_monte', bm, col, trigo_m)

    # --- V2: lampiões nos capitéis, passarela e escada nos silos grandes (mais volume e luz quente na boca) ---
    ferro = cor('F09_ferro', (0.07, 0.07, 0.08), rough=0.45, metal=0.9)
    lampiao = cor('F09_lampiao', (1.0, 0.72, 0.36), rough=0.2, emiss=3.0)
    for s in (-1, 1):
        x = s * (R + 0.42)
        tubo(f'F09_braco{s}', col, [(x, -0.42, SPRING + 0.12), (x, -0.98, SPRING + 0.12), (x, -0.98, SPRING - 0.12)], 0.025, ferro, lados=6)
        caixa(f'F09_lamp_topo{s}', col, (0.28, 0.28, 0.06), (x, -0.98, SPRING - 0.16), ferro, bev=0.01, tam=1.0)
        caixa(f'F09_lamp_vidro{s}', col, (0.19, 0.19, 0.3), (x, -0.98, SPRING - 0.35), lampiao, bev=0.02, tam=1.0)
        caixa(f'F09_lamp_base{s}', col, (0.26, 0.26, 0.05), (x, -0.98, SPRING - 0.52), ferro, bev=0.01, tam=1.0)
    for nome, sx, h, a in (('E', -5.3, 6.0, math.radians(225)), ('D', 5.3, 6.25, math.radians(-45))):
        rg = 0.84; cy = -0.38
        for z in (h - 0.95, h - 0.6):
            pts = [(sx + rg * math.cos(t), cy + rg * math.sin(t), z) for t in np.linspace(0, 2 * math.pi, 25)]
            tubo(f'F09_guarda_{nome}_{int(z * 100)}', col, pts, 0.018, ferro, lados=5)
        for i, t in enumerate(np.linspace(0, 2 * math.pi, 10, endpoint=False)):
            q = (sx + rg * math.cos(t), cy + rg * math.sin(t))
            tubo(f'F09_poste_{nome}_{i}', col, [(q[0], q[1], h - 1.05), (q[0], q[1], h - 0.55)], 0.016, ferro, lados=4)
        # escada de marinheiro subindo pela face de fora
        tg = Vector((-math.sin(a), math.cos(a), 0)); base = Vector((sx + 0.83 * math.cos(a), cy + 0.83 * math.sin(a), 0))
        for k in (-1, 1):
            b0 = base + tg * 0.15 * k
            tubo(f'F09_escada_{nome}_{k}', col, [(b0.x, b0.y, 0.25), (b0.x, b0.y, h - 0.6)], 0.02, ferro, lados=4)
        z = 0.5
        while z < h - 0.9:
            p0 = base - tg * 0.15; p1 = base + tg * 0.15
            tubo(f'F09_degrau_{nome}_{int(z * 100)}', col, [(p0.x, p0.y, z), (p1.x, p1.y, z)], 0.014, ferro, lados=4)
            z += 0.32

    limites(col)
    junta(col, 'F09')
    checa_vao(col)
    cenario_previa(tunel=(1.0, 0.75, 0.35))
    luz_ponto('PREV_boca', (0, -0.6, 4.5), (1, 0.75, 0.4), energia=450, raio=1)
    for s in (-1, 1): luz_ponto(f'PREV_trigo{s}', (s * 4.6, -2.0, 2.5), (1, 0.75, 0.35), energia=90)
    previa('f09_frente', cam=(0, -15.5, 3.6), alvo=(0, 0, 3.7), lente=30)
    c, a = cam_arte(-14); say('cam arte', c)
    previa('f09_arte', cam=c, alvo=a, lente=32)
    previa('f09_perto', cam=(5.5, -6.0, 2.2), alvo=(4.4, -0.6, 2.0), lente=30)
    fecha('fachada_09', col)

rodar(main)
