# Fachada 01 (Luxo): arco dourado com faixa de aço escuro cravejada de luzes, coroa de filigrana e louros
# em volta do medalhão, aglomerados de cristais lilás (grande à esquerda, menor à direita), estandarte vinho
# com emblema dourado, grade dourada e lustre de cristal por dentro.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from f010304_comum import *


def cristal(bm_alvo, base, direcao, comp, raio, gira, rnd, m_topo=0, m_base=2):
    """Prisma hexagonal com ponta facetada, ao longo de `direcao`, base enterrada.
    O terço de baixo leva o material de brilho âmbar (a luz quente dentro dos cristais da arte)."""
    d = Vector(direcao).normalized()
    q = d.to_track_quat('Z', 'Y')
    rot = q.to_matrix() @ Matrix.Rotation(gira, 3, 'Z')
    corpo = comp * rnd.uniform(0.62, 0.74); afina = rnd.uniform(0.78, 0.92); meio = corpo * rnd.uniform(0.25, 0.4)
    def P(x, y, z): return Vector(base) + rot @ Vector((x, y, z))
    angs = [i * math.pi / 3 for i in range(6)]
    anel0 = [bm_alvo.verts.new(P(raio * math.cos(a), raio * math.sin(a), -0.25)) for a in angs]
    k = 1 - (1 - afina) * meio / corpo
    anelm = [bm_alvo.verts.new(P(raio * k * math.cos(a), raio * k * math.sin(a), meio)) for a in angs]
    anel1 = [bm_alvo.verts.new(P(raio * afina * math.cos(a), raio * afina * math.sin(a), corpo)) for a in angs]
    ponta = bm_alvo.verts.new(P(raio * rnd.uniform(-0.25, 0.25), raio * rnd.uniform(-0.25, 0.25), comp))
    for i in range(6):
        j = (i + 1) % 6
        bm_alvo.faces.new((anel0[i], anel0[j], anelm[j], anelm[i])).material_index = m_base
        bm_alvo.faces.new((anelm[i], anelm[j], anel1[j], anel1[i])).material_index = m_topo
        bm_alvo.faces.new((anel1[i], anel1[j], ponta)).material_index = m_topo
    bm_alvo.faces.new(anel0[::-1]).material_index = m_base


def aglomerado(nome, col, mats, x_in, x_out, cy, escala, n, seed):
    """Leque de cristais: os maiores perto do centro do leque, abrindo para fora do arco.
    x_in = borda do lado do arco, x_out = borda de fora (o sinal diz o lado)."""
    rnd = random.Random(seed); bms = [bmesh.new() for _ in mats]
    s = 1 if x_out > x_in else -1
    cx = x_in + (x_out - x_in) * 0.42
    feitos = 0; tent = 0
    while feitos < n and tent < n * 20:
        tent += 1
        lim_in = min(abs(x_in), abs(x_out)); lim_out = max(abs(x_in), abs(x_out))
        ang = rnd.uniform(-0.15, 1.25)   # radianos a partir da vertical; positivo = abre para fora
        if feitos < 6: ang = rnd.uniform(0.0, 0.3)
        bx = s * (lim_in + 0.25 + (lim_out - lim_in - 0.4) * rnd.uniform(0.0, 0.6) * (0.4 + 0.6 * min(1, max(0, ang))))
        cabe = (lim_out - 0.05 - abs(bx)) / max(0.05, math.sin(ang)) if ang > 0 else (abs(bx) - lim_in - 0.2) / max(0.05, math.sin(-ang))
        comp = min(escala * (1.0 - 0.45 * max(0, ang)) * rnd.uniform(0.55, 1.0), cabe)
        if feitos < 6: comp = min(escala * rnd.uniform(0.85, 1.0), cabe)
        if comp < 0.5: continue
        by = cy + rnd.uniform(-0.3, 0.35)
        dx = s * math.sin(ang); dz = math.cos(ang); dy = rnd.uniform(-0.35, 0.1)
        raio = 0.12 + comp * 0.075 * rnd.uniform(0.8, 1.3)
        tip = Vector((bx, by, 0)) + Vector((dx, dy, dz)).normalized() * comp
        if abs(tip.x) < lim_in + 0.15 or abs(tip.x) > lim_out or abs(bx) - raio < lim_in or abs(bx) + raio > lim_out or tip.y < -1.2 or by - raio < -1.15: continue
        m = 1 if (feitos % 3 == 1 or comp < escala * 0.35) else 0
        cristal(bms[0], (bx, by, 0.0), (dx, dy, dz), comp, raio, rnd.uniform(0, 1), rnd, m_topo=m, m_base=2)
        feitos += 1
    bm = bms[0]
    for x in bms[1:]: x.free()
    for v in bm.verts:
        v.co.y = max(v.co.y, -1.27); v.co.z = max(v.co.z, -0.22)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = objeto(nome, bm, col, mats[0])
    for m in mats[1:]: o.data.materials.append(m)
    uv_mundo(o, 1.0)
    return [o]


def folha(bm, c, direcao, comp, larg, normal=(0, -1, 0)):
    """Folha de louro: losango curvo com espessura (8 faces)."""
    d = Vector(direcao).normalized(); n = Vector(normal).normalized(); s = d.cross(n).normalized()
    c = Vector(c)
    pts = [c, c + d * comp * 0.45 + s * larg / 2 - n * 0.02, c + d * comp, c + d * comp * 0.45 - s * larg / 2 - n * 0.02]
    meio = c + d * comp * 0.45 - n * 0.05
    vs = [bm.verts.new(p) for p in pts]; vm = bm.verts.new(meio)
    tras = [bm.verts.new(p + n * 0.03) for p in pts]
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((vs[i], vs[j], vm))
        bm.faces.new((tras[j], tras[i], vs[i], vs[j]))
    bm.faces.new(tras[::-1])


def main(args):
    C.limpa()
    col = colecao('F01')
    ouro = material('F01_ouro', 'metal_plate_02', tint=(1.0, 0.72, 0.32), metal=1.0, rough_k=0.6)
    ouro_liso = mat_emissivo('F01_ouro_liso', (1.0, 0.55, 0.18), 0.35, base=(1.0, 0.74, 0.34), rough=0.2, metal=1.0)
    aco = material('F01_aco', 'metal_plate_02', tint=(0.22, 0.22, 0.25), metal=0.85)
    luz = mat_emissivo('F01_luz', (1.0, 0.72, 0.38), 9.0, base=(1.0, 0.85, 0.6), rough=0.2)
    cris = mat_emissivo('F01_cristal', (0.34, 0.18, 0.95), 0.8, base=(0.42, 0.28, 0.92), rough=0.05)
    cris2 = mat_emissivo('F01_cristal_claro', (0.7, 0.58, 1.0), 0.9, base=(0.82, 0.76, 1.0), rough=0.04)
    cris3 = mat_emissivo('F01_cristal_ambar', (1.0, 0.55, 0.22), 2.2, base=(1.0, 0.8, 0.55), rough=0.05)
    vinho = material('F01_veludo', 'velour_velvet', tint=(0.5, 0.14, 0.36))
    for m in (ouro, aco):
        for n in m.node_tree.nodes:
            if n.type == 'BSDF_PRINCIPLED': n.inputs['Roughness'].default_value = 0.28
    b = ouro.node_tree.nodes['Principled BSDF']; b.inputs['Emission Color'].default_value = (1.0, 0.55, 0.18, 1); b.inputs['Emission Strength'].default_value = 0.25

    # ---------- arco: friso de ouro interno, faixa de aço com luzes, friso de ouro externo ----------
    r0 = R + 0.1
    pts, nrm = caminho_u(r0, 48)
    varre('F01_friso_in', col, pts, nrm, secao_retangular(0.0, 0.24, -0.72, 0.35, 0.05), ouro)
    varre('F01_cordao_in', col, pts, nrm, secao_redonda(0.12, -0.74, 0.08), ouro_liso)
    varre('F01_faixa', col, pts, nrm, secao_retangular(0.22, 0.78, -0.56, 0.35, 0.03), aco, tam=1.6)
    varre('F01_friso_out', col, pts, nrm, secao_retangular(0.76, 1.0, -0.72, 0.35, 0.05), ouro)
    varre('F01_cordao_out', col, pts, nrm, secao_redonda(0.88, -0.74, 0.075), ouro_liso)
    # cravos de luz ao longo da faixa (como as lâmpadas da arte), com engaste de ouro
    lamp = bmesh.new(); eng = bmesh.new()
    pts2, nrm2 = caminho_u(r0 + 0.5, 64)
    acum = 0.0; ultimo = None
    for (x, z), _ in zip(pts2, nrm2):
        if ultimo: acum += math.hypot(x - ultimo[0], z - ultimo[1])
        ultimo = (x, z)
        if acum >= 0.42 or ultimo == pts2[0]:
            acum = 0.0
            bmesh.ops.create_icosphere(lamp, subdivisions=1, radius=0.075, matrix=Matrix.Translation((x, -0.6, z)))
            bmesh.ops.create_cone(eng, cap_ends=True, segments=10, radius1=0.12, radius2=0.1, depth=0.06, matrix=Matrix.Translation((x, -0.57, z)) @ Matrix.Rotation(math.pi / 2, 4, 'X'))
    objeto('F01_lampadas', lamp, col, luz); o = objeto('F01_engastes', eng, col, ouro_liso)
    # bases e capitéis das pernas do arco
    for s in (-1, 1):
        x = s * (r0 + 0.5)
        caixa(f'F01_base{s}', col, (1.2, 1.25, 0.55), (s * (r0 + 0.62), -0.2, 0.275), ouro, bev=0.06, tam=1.0)
        caixa(f'F01_base2{s}', col, (1.05, 1.1, 0.25), (s * (r0 + 0.58), -0.2, 0.67), aco, bev=0.04, tam=1.0)
        caixa(f'F01_capitel{s}', col, (1.15, 1.2, 0.3), (s * (r0 + 0.6), -0.2, SPRING + 0.05), ouro, bev=0.05, tam=1.0)

    # ---------- coroa: filigrana em volta do medalhão (o site põe o medalhão em (0, -1.05, 7.35), r≈0.9) ----------
    MZ = H + 1.15
    tubo('F01_aro_med', col, [(0.98 * math.cos(a), -0.62, MZ + 0.98 * math.sin(a)) for a in [i * 2 * math.pi / 48 for i in range(49)]], 0.09, ouro_liso)
    tubo('F01_aro_med2', col, [(1.1 * math.cos(a), -0.58, MZ + 1.1 * math.sin(a)) for a in [i * 2 * math.pi / 48 for i in range(49)]], 0.035, ouro_liso)
    fol = bmesh.new()
    for s in (-1, 1):
        # ramo de louro: de baixo do medalhão subindo pelo lado
        ramo = [(s * 1.35 * math.cos(a), -0.62, MZ + 1.35 * math.sin(a)) for a in [math.radians(-52 + i * 8) for i in range(15)]]
        ramo = [(s * abs(p[0]), p[1], p[2]) for p in ramo]
        tubo(f'F01_ramo{s}', col, ramo, 0.03, ouro_liso)
        for i, p in enumerate(ramo[1:-1]):
            a = math.radians(-52 + (i + 1) * 8)
            tang = Vector((s * -math.sin(a), 0, math.cos(a)))
            radial = Vector((s * math.cos(a), 0, math.sin(a)))
            for lado in (1, -1):
                dvec = (tang * 0.8 + radial * 0.75 * lado).normalized()
                folha(fol, p, dvec, 0.42 - i * 0.012, 0.16)
        # volutas (C) apoiadas no arco, saindo do medalhão para os lados
        vol = []
        for i in range(34):
            t = i / 33; a = math.pi * 2.2 * t; rr = 0.55 * (1 - 0.72 * t)
            vol.append((s * (1.6 + 1.2 * t - rr * math.sin(a) * 0.6), -0.5, 6.95 + 0.25 * t + rr * math.cos(a) * 0.55))
        tubo(f'F01_voluta{s}', col, vol, 0.065, ouro_liso)
        vol2 = []
        for i in range(30):
            t = i / 29; a = math.pi * 2.0 * t; rr = 0.38 * (1 - 0.7 * t)
            vol2.append((s * (2.9 + 0.7 * t + rr * math.sin(a) * 0.5), -0.48, 6.35 + 0.2 * t - rr * math.cos(a) * 0.5))
        tubo(f'F01_voluta2{s}', col, vol2, 0.055, ouro_liso)
        # ramos externos (labaredas de folhagem dourada que sobem e abrem, como na arte)
        for k, (ang, comp, curva) in enumerate([(16, 1.05, 0.45), (36, 1.1, 0.4), (58, 0.9, 0.3), (80, 0.6, 0.2)]):
            a = math.radians(ang)
            p0 = Vector((s * 1.18 * math.cos(a), -0.45, MZ + 1.18 * math.sin(a)))
            dv = Vector((s * math.cos(a), 0, math.sin(a))); tg = Vector((-dv.z * s, 0, abs(dv.x))).normalized() if k < 3 else Vector((0, 0, 1))
            pts_r = []
            for j in range(9):
                t = j / 8
                q = p0 + dv * comp * t + Vector((s * curva * t * t, 0, curva * 0.6 * t * t))
                pts_r.append(q)
            tubo(f'F01_galho{s}_{k}', col, [tuple(q) for q in pts_r], 0.04 - k * 0.005, ouro_liso)
            for j in range(1, 9):
                q = pts_r[j]; dd = (pts_r[min(8, j + 1)] - pts_r[j - 1]).normalized()
                lado = Vector((-dd.z, 0, dd.x)); sg = 1 if j % 2 else -1
                folha(fol, q, (dd * 0.75 + lado * 0.65 * sg).normalized(), 0.3 - j * 0.017, 0.12 - j * 0.004)
            pass
    # pináculo no topo
    bmesh.ops.create_cone(fol, cap_ends=True, segments=8, radius1=0.12, radius2=0.0, depth=0.5, matrix=Matrix.Translation((0, -0.55, MZ + 1.45)))
    bmesh.ops.create_icosphere(fol, subdivisions=2, radius=0.13, matrix=Matrix.Translation((0, -0.55, MZ + 1.17)))
    o = objeto('F01_folhas', fol, col, ouro_liso)
    # placa de fundo da coroa (aço com friso), atrás do medalhão
    pc = bmesh.new()
    bmesh.ops.create_circle(pc, cap_ends=True, segments=40, radius=1.05)
    bmesh.ops.rotate(pc, verts=pc.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'))
    pc.faces.ensure_lookup_table(); f = pc.faces[0]; ex = bmesh.ops.extrude_face_region(pc, geom=[f])
    bmesh.ops.translate(pc, vec=(0, 0.25, 0), verts=[v for v in ex['geom'] if isinstance(v, bmesh.types.BMVert)])
    bmesh.ops.translate(pc, vec=(0, -0.6, MZ), verts=pc.verts)
    bmesh.ops.recalc_face_normals(pc, faces=pc.faces)
    objeto('F01_placa_med', pc, col, aco)

    # ---------- cristais lilás ----------
    aglomerado('F01_cristais_esq', col, [cris, cris2, cris3], -(R + 0.3), -6.15, -0.82, 5.3, 48, 11)
    aglomerado('F01_cristais_dir', col, [cris, cris2, cris3], R + 0.5, 6.1, -0.85, 2.7, 22, 5)
    # pedra-base escura dos cristais (drusa)
    for s, cx, rr_ in ((-1, -4.75, 1.05), (1, 4.95, 0.75)):
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
        rnd = random.Random(3 + s)
        for v in bm.verts:
            v.co = Vector((v.co.x * rr_ * 1.2, v.co.y * rr_ * 0.6, max(v.co.z, -0.35) * rr_ * 0.45)) * rnd.uniform(0.85, 1.1)
        bmesh.ops.translate(bm, vec=(cx, -0.6, 0.0), verts=bm.verts)
        objeto(f'F01_drusa{s}', bm, col, cor('F01_drusa', (0.08, 0.06, 0.12), rough=0.7))
        uv_mundo(col.objects[f'F01_drusa{s}'], 1.5)

    # ---------- estandarte vinho com emblema dourado (à direita, como na arte de frente) ----------
    xb = 5.2
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=6, y_segments=18, size=0.5)
    for v in bm.verts:
        u = v.co.x; t = v.co.y
        v.co = Vector((u * 1.15, -0.95 - 0.06 * math.sin(t * 6 + u * 2.5) * (0.5 - t), 5.1 + t * 3.4))
        if t < -0.45: v.co.z -= 0.32 * (1 - abs(u) * 2)
    o = objeto('F01_estandarte', bm, col, vinho); o.location.x = xb; uv_mundo(o, 1.0)
    for p in o.data.polygons: p.use_smooth = True
    # debrum dourado
    borda = [(xb - 0.575, -0.99, 6.8), (xb - 0.575, -0.99, 3.38), (xb, -0.99, 3.06), (xb + 0.575, -0.99, 3.38), (xb + 0.575, -0.99, 6.8)]
    tubo('F01_debrum', col, borda, 0.025, ouro_liso)
    tubo('F01_debrum2', col, [(p[0] + (0.1 if p[0] < xb else -0.1 if p[0] > xb else 0), p[1] - 0.01, p[2] + (0.12 if p[2] < 3.5 else -0.08 if p[2] > 6 else 0)) for p in borda], 0.012, ouro_liso)
    tubo('F01_haste', col, [(xb - 0.8, -0.98, 6.86), (xb + 0.8, -0.98, 6.86)], 0.04, ouro_liso)
    tubo('F01_suporte', col, [(xb, -0.98, 6.86), (xb, -0.45, 7.05), (xb, -0.1, 7.05)], 0.035, ouro_liso)
    for s in (-1, 1):
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=0.07, matrix=Matrix.Translation((xb + s * 0.84, -0.98, 6.86)))
        objeto(f'F01_ponteira{s}', bm, col, ouro_liso)
    # emblema: coração de ouro com espada/cruz no meio (como na arte)
    cor_pts = []
    for i in range(41):
        t = math.pi * 2 * i / 40
        hx = 16 * math.sin(t) ** 3; hz = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        cor_pts.append((xb + hx * 0.024, -1.02, 4.95 + hz * 0.024))
    tubo('F01_emb_coracao', col, cor_pts, 0.03, ouro_liso)
    tubo('F01_emb_espada', col, [(xb, -1.03, 4.35), (xb, -1.03, 5.55)], 0.03, ouro_liso)
    tubo('F01_emb_guarda', col, [(xb - 0.22, -1.03, 5.3), (xb + 0.22, -1.03, 5.3)], 0.028, ouro_liso)
    tubo('F01_emb_rama', col, [(xb - 0.25, -1.03, 5.6), (xb, -1.03, 5.45), (xb + 0.25, -1.03, 5.6)], 0.02, ouro_liso)

    # ---------- por dentro: grade dourada nas paredes do túnel e lustre de cristal ----------
    gr = []
    for s in (-1, 1):
        for k in range(9):
            y = 0.9 + k * 0.55
            gr.append(tubo(f'F01_barra{s}_{k}', col, [(s * 3.02, y, 0.0), (s * 3.02, y, SPRING + 0.4)], 0.03, ouro_liso))
    for y in (0.9, 3.1, 5.3):
        gr.append(tubo(f'F01_aro_int{y}', col, [(3.02 * math.cos(a), y, SPRING + 3.02 * math.sin(a)) for a in [math.pi * i / 32 for i in range(33)]] , 0.035, ouro_liso))
    junta('F01_grade_int', gr)
    gr = []
    for s in (-1, 1):
        for zz in (1.2, 2.6):
            gr.append(tubo(f'F01_trav{s}{zz}', col, [(s * 3.0, 0.9, zz), (s * 3.0, 5.3, zz)], 0.03, ouro_liso))
    junta('F01_grade_trav', gr)
    # cortinas de veludo roxo forrando o túnel atrás da grade dourada (o fundo violeta da arte)
    roxo_v = material('F01_veludo_roxo', 'rough_linen', tint=(0.55, 0.22, 0.95))
    for s in (-1, 1):
        bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=24, y_segments=4, size=0.5)
        for v in bm.verts:
            u = v.co.x + 0.5; t = v.co.y + 0.5
            v.co = Vector((s * (3.1 - 0.06 * (1 + math.sin(u * 2 * math.pi * 9)) * 0.5), 0.75 + u * 4.8, t * (SPRING + 0.6)))
        o = objeto(f'F01_cortina{s}', bm, col, roxo_v); uv_mundo(o, 0.9)
        for p in o.data.polygons: p.use_smooth = True
    lus = modelo('Chandelier_03', col, 'F01_lustre', 0, 1.9, 0, larg=2.6)
    decima(lus, 9000)
    bpy.context.view_layer.update()
    bb = [lus.matrix_world @ Vector(c) for c in lus.bound_box]
    lus.location.z += (H - 0.25) - max(v.z for v in bb)
    say('lustre mats', [s.material.name for s in lus.material_slots if s.material])
    for sl in lus.material_slots:
        nm = sl.material.name.lower() if sl.material else ''
        if any(k in nm for k in ('bulb', 'candle', 'glass', 'light', 'flame', 'crystal')):
            sl.material = luz if 'crystal' not in nm else cris2

    # ---------- conferência ----------
    bpy.context.view_layer.update()
    confere_vao(col, ignora=('F01_grade', 'F01_lustre', 'F01_barra', 'F01_aro_int', 'F01_trav', 'F01_cortina'))
    say('tris', sum(len(p.vertices) - 2 for o in col.all_objects if o.type == 'MESH' for p in o.data.polygons))
    contexto_previa(col)
    luzes((1.0, 0.72, 0.4), 900)
    bloom(0.8)
    previas('f01', extra=[((-3.5, -9, 2.2), (-3.5, 0, 3.0), 35)])
    previa_arte('f01', '01')
    tira_previa()
    fecha('fachada_01', col)


rodar(main)
