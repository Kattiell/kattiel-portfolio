# Fachada 03 (Tecnologia/Eletrônicos): moldura em arco de painéis de metal escuro segmentados, placa de fundo
# recortada em degraus com trilhas de circuito ciano brilhantes e pads, telas laterais (TELA_) e,
# por dentro, holograma azul de cidade sobre um pedestal, com anéis flutuantes.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from f010304_comum import *

TEX = os.path.join(AQUI, 'tex')


def placa_recortada(nome, col, contorno_esq, r_furo, y0, y1, mat, tam=2.0):
    """Placa extrudada: contorno externo (lado esquerdo, de baixo para cima, espelhado) com o furo do arco."""
    out = list(contorno_esq) + [(-x, z) for x, z in reversed(contorno_esq)]
    sp = SPRING; hole = [(r_furo, 0), (r_furo, sp)]
    for i in range(1, 32): a = math.pi * i / 32; hole.append((r_furo * math.cos(a), sp + r_furo * math.sin(a)))
    hole += [(-r_furo, sp), (-r_furo, 0)]
    pts = out + hole
    bm = bmesh.new(); vs = [bm.verts.new((x, y0, z)) for x, z in pts]
    f = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f]); nv = [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=Vector((0, y1 - y0, 0)), verts=nv)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.bevel(bm, geom=[e for e in bm.edges if e.calc_face_angle(0) > 0.5], offset=0.03, segments=1, affect='EDGES')
    o = objeto(nome, bm, col, mat); uv_mundo(o, tam); return o


def rota(rnd, x0, z0, s, limites, passos=6):
    """Trilha de circuito: sai para fora, depois alterna subir / diagonal 45° / horizontal. Devolve pontos."""
    pts = [(x0, z0)]; x, z = x0, z0
    dirs = [(1, 0)]  # primeiro passo: para fora
    for k in range(passos):
        if k == 0: d = (1, 0); L = rnd.uniform(0.25, 0.55)
        else:
            d = rnd.choice([(0, 1), (0, 1), (1, 1), (1, 0)] if dirs[-1] != (0, 1) else [(1, 1), (1, 0), (0, 1)])
            L = rnd.uniform(0.35, 1.3) if d == (0, 1) else rnd.uniform(0.25, 0.6)
        n = math.hypot(*d); nx, nz = x + s * d[0] / n * L, z + d[1] / n * L
        if not limites(nx, nz): break
        x, z = nx, nz; pts.append((x, z)); dirs.append(d)
    return pts


def main(args):
    C.limpa()
    col = colecao('F03')
    painel = material('F03_painel', 'metal_plate_02', tint=(0.2, 0.23, 0.28), metal=0.85)
    aro = material('F03_aro', 'blue_metal_plate', tint=(0.32, 0.38, 0.46), metal=0.9)
    escuro = material('F03_escuro', 'metal_plate', tint=(0.12, 0.13, 0.15), metal=0.8)
    for m in (painel, aro, escuro):
        m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.35
    ciano = mat_emissivo('F03_ciano', (0.0, 0.62, 1.0), 3.2, base=(0.1, 0.8, 1.0), rough=0.3)
    ciano_f = mat_emissivo('F03_ciano_fraco', (0.0, 0.4, 0.9), 1.6, base=(0.05, 0.45, 0.85), rough=0.3)
    roxo = mat_emissivo('F03_roxo', (0.45, 0.2, 1.0), 1.8, base=(0.4, 0.25, 0.9))
    holo = mat_emissivo('F03_holo', (0.03, 0.3, 1.0), 2.8, base=(0.05, 0.4, 1.0))
    holo_vidro = mat_emissivo('F03_holo_vidro', (0.04, 0.25, 0.95), 1.0, base=(0.05, 0.3, 0.95), alpha=0.2)

    # ---------- placa de fundo recortada em degraus (silhueta tech) ----------
    contorno = [(-6.05, 0), (-6.05, 4.6), (-5.75, 4.9), (-5.75, 7.4), (-5.2, 7.95), (-3.9, 7.95), (-3.5, 8.25), (-1.55, 8.25), (-1.15, 8.9)]
    contorno = contorno + [(-0.35, 8.9)]
    placa_recortada('F03_placa', col, contorno, R + 0.15, -0.38, 0.25, painel, tam=1.6)
    # costuras dos painéis (frisos escuros verticais e horizontais na placa)
    cost = []
    for s in (-1, 1):
        for x in (4.9, 5.45):
            cost.append(caixa(f'F03_cost{s}{x}', col, (0.05, 0.05, 4.4 if x > 5 else 6.6), (s * x, -0.4, 2.2 if x > 5 else 3.3), escuro, bev=0.0))
        for z in (1.6, 3.2, 5.6):
            cost.append(caixa(f'F03_costh{s}{z}', col, (1.7, 0.05, 0.05), (s * 5.15, -0.4, z), escuro, bev=0.0))
    junta('F03_costuras', cost)

    # ---------- moldura em arco: anel de metal com lábio interno, segmentos e frisos ciano ----------
    r0 = R + 0.1
    pts, nrm = caminho_u(r0, 48)
    varre('F03_aro', col, pts, nrm, secao_retangular(0.0, 0.95, -0.72, 0.3, 0.06), aro, tam=1.4)
    varre('F03_labio', col, pts, nrm, secao_retangular(-0.02, 0.2, -0.86, -0.6, 0.03), escuro, tam=1.0)
    varre('F03_friso_roxo', col, pts, nrm, secao_retangular(-0.06, -0.01, -0.5, 0.25, 0.0), roxo)
    varre('F03_friso1', col, pts, nrm, secao_retangular(0.36, 0.42, -0.77, -0.7, 0.0), ciano)
    varre('F03_friso2', col, pts, nrm, secao_retangular(0.74, 0.78, -0.76, -0.7, 0.0), ciano_f)
    varre('F03_aro_ext', col, pts, nrm, secao_retangular(0.93, 1.12, -0.6, 0.28, 0.04), escuro, tam=1.0)
    # segmentos (nervuras) ao longo do arco, com um led em cada
    seg = []; leds = bmesh.new()
    for i in range(15):
        a = math.pi * (i + 0.5) / 15
        cx, cz = (r0 + 0.55) * math.cos(a), SPRING + (r0 + 0.55) * math.sin(a)
        seg.append(caixa(f'F03_nerv{i}', col, (0.16, 0.18, 1.0), (cx, -0.76, cz), escuro, bev=0.03, rot=(0, -(a - math.pi / 2), 0)))
        bmesh.ops.create_cube(leds, size=1.0, matrix=Matrix.Translation(((r0 + 0.9) * math.cos(a), -0.86, SPRING + (r0 + 0.9) * math.sin(a))) @ Matrix.Diagonal((0.07, 0.05, 0.07, 1)))
    for s in (-1, 1):
        for z in (0.9, 2.0):
            seg.append(caixa(f'F03_nervp{s}{z}', col, (1.0, 0.18, 0.16), (s * (r0 + 0.55), -0.76, z), escuro, bev=0.03))
    junta('F03_nervuras', seg); objeto('F03_leds', leds, col, ciano)
    # pés (bases) escalonados
    for s in (-1, 1):
        caixa(f'F03_pe{s}', col, (1.5, 1.2, 0.45), (s * (r0 + 0.66), -0.25, 0.225), escuro, bev=0.05, tam=1.0)
        caixa(f'F03_pe2{s}', col, (1.25, 1.0, 0.25), (s * (r0 + 0.6), -0.25, 0.57), painel, bev=0.04, tam=1.0)
        caixa(f'F03_pefaixa{s}', col, (1.2, 0.04, 0.05), (s * (r0 + 0.66), -0.86, 0.3), ciano, bev=0.0)
    # bloco do topo (apoio do medalhão) com aletas
    caixa('F03_topo', col, (2.4, 0.7, 0.55), (0, -0.4, 7.45), aro, bev=0.05, tam=1.0)
    for s in (-1, 1):
        for k in range(3):
            caixa(f'F03_aleta{s}{k}', col, (0.1, 0.5, 0.9 - k * 0.2), (s * (1.4 + k * 0.22), -0.45, 7.55 - k * 0.05), escuro, bev=0.02)

    # ---------- trilhas de circuito ciano ----------
    rnd = random.Random(31)
    trilhas = []; pads = bmesh.new(); padsf = bmesh.new()
    def dentro(x, z):
        ax = abs(x)
        if ax > 5.8 or z < 0.35: return False
        if math.hypot(x, z - SPRING) < R + 1.25 and z > SPRING - 0.01: return False
        if ax < R + 1.25 and z <= SPRING: return False
        if ax > 5.5 and z > 7.2: return False
        if ax > 3.7 and z > 7.7: return False
        if ax > 1.4 and z > 8.0: return False
        return z < 8.6
    YT = -0.43
    n = 0
    for s in (-1, 1):
        inicios = []
        for zz in (0.7, 1.25, 1.8, 2.4, 2.9):
            inicios.append((s * (R + 1.25), zz))
        for ang in (105, 122, 140, 158):
            a = math.radians(ang if s < 0 else 180 - ang)
            inicios.append(((R + 1.25) * math.cos(a), SPRING + (R + 1.25) * math.sin(a)))
        for ang in (72, 84):
            a = math.radians(180 - ang if s < 0 else ang)
            inicios.append(((R + 1.25) * math.cos(a), SPRING + (R + 1.25) * math.sin(a)))
        for x0, z0 in inicios:
            p = rota(rnd, x0, z0, s, dentro, passos=rnd.randint(4, 8))
            if len(p) < 2: continue
            forte = rnd.random() < 0.6
            trilhas.append(tubo(f'F03_trilha{n}', col, [(x, YT, z) for x, z in p], 0.035 if forte else 0.025, ciano if forte else ciano_f, res=4))
            x, z = p[-1]
            bm = pads if forte else padsf
            bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.1, radius2=0.1, depth=0.05, matrix=Matrix.Translation((x, YT - 0.02, z)) @ Matrix.Rotation(math.pi / 2, 4, 'X'))
            n += 1
        # barramento: 4 trilhas paralelas descendo pela lateral até o chão
        for k in range(4):
            xb = s * (5.85 - k * 0.12)
            trilhas.append(tubo(f'F03_bus{s}{k}', col, [(xb, YT, 0.05), (xb, YT, 4.2 - k * 0.12), (xb - s * 0.35, YT, 4.55 - k * 0.12), (xb - s * 0.35, YT, 6.3 - k * 0.3)], 0.022, ciano_f, res=4))
    # trilhas do topo, saindo do bloco do medalhão para os lados
    for s in (-1, 1):
        for k, zz in enumerate((7.95, 8.2)):
            p = [(s * 1.25, zz), (s * (2.0 + k * 0.3), zz), (s * (2.35 + k * 0.3), zz - 0.35), (s * (3.4 - k * 0.2), zz - 0.35)]
            trilhas.append(tubo(f'F03_topo_tr{s}{k}', col, [(x, YT, z) for x, z in p], 0.03, ciano, res=4))
            x, z = p[-1]
            bmesh.ops.create_cone(pads, cap_ends=True, segments=12, radius1=0.1, radius2=0.1, depth=0.05, matrix=Matrix.Translation((x, YT - 0.02, z)) @ Matrix.Rotation(math.pi / 2, 4, 'X'))
    junta('F03_trilhas', trilhas)
    objeto('F03_pads', pads, col, ciano); objeto('F03_pads_f', padsf, col, ciano_f)
    # chips na placa (componentes)
    chips = []
    for i, (x, z, w, h) in enumerate([(-5.15, 1.0, 0.6, 0.45), (5.2, 1.1, 0.5, 0.5), (-5.2, 6.1, 0.55, 0.4), (5.1, 6.0, 0.6, 0.35), (-2.6, 7.4, 0.5, 0.3), (2.6, 7.4, 0.5, 0.3)]):
        chips.append(caixa(f'F03_chip{i}', col, (w, 0.1, h), (x, -0.45, z), escuro, bev=0.015, tam=0.5))
        for k in range(4):
            for sg in (-1, 1):
                chips.append(caixa(f'F03_pino{i}{k}{sg}', col, (0.04, 0.04, 0.08), (x - w / 2 + (k + 0.5) * w / 4, -0.45, z + sg * (h / 2 + 0.04)), ciano_f, bev=0.0))
    junta('F03_chips', chips)

    # ---------- telas laterais (TELA_: UV 0–1 cobrindo a tela) ----------
    for s, zc, img in ((-1, 3.85, 'tela_f03_a'), (1, 3.05, 'tela_f03_b')):
        xc = s * 5.12; w, h = 1.42, 0.98
        caixa(f'F03_moldura_tela{s}', col, (w + 0.16, 0.16, h + 0.16), (xc, -0.5, zc), escuro, bev=0.03, tam=0.6)
        caixa(f'F03_suporte_tela{s}', col, (0.3, 0.2, 0.3), (xc, -0.4, zc - h / 2 - 0.15), painel, bev=0.02)
        bm = bmesh.new()
        vs = [bm.verts.new((xc + dx * w / 2, -0.585, zc + dz * h / 2)) for dx, dz in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        f = bm.faces.new(vs); uv = bm.loops.layers.uv.new()
        for lp, (u, v) in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))): lp[uv].uv = (u, v)
        f.normal_update()
        if f.normal.y > 0: f.normal_flip()
        m = bpy.data.materials.new(f'F03_tela_{img}'); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
        tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = bpy.data.images.load(os.path.join(TEX, img + '.png'))
        nt.links.new(tx.outputs['Color'], b.inputs['Base Color']); nt.links.new(tx.outputs['Color'], b.inputs['Emission Color'])
        b.inputs['Emission Strength'].default_value = 2.5; b.inputs['Roughness'].default_value = 0.2
        objeto(f'TELA_F03_{"esq" if s < 0 else "dir"}', bm, col, m)

    # ---------- por dentro: holograma de cidade sobre pedestal ----------
    YH = 3.9
    ped = bmesh.new()
    bmesh.ops.create_cone(ped, cap_ends=True, segments=40, radius1=2.65, radius2=2.5, depth=0.3, matrix=Matrix.Translation((0, YH, 0.15)))
    objeto('F03_pedestal', ped, col, escuro); uv_mundo(col.objects['F03_pedestal'], 1.0)
    for k, (rr, zz, mm) in enumerate(((2.57, 0.31, ciano), (2.0, 0.31, ciano_f), (1.3, 0.31, ciano_f))):
        tubo(f'F03_ped_anel{k}', col, [(rr * math.cos(a), YH + rr * math.sin(a), zz) for a in [i * 2 * math.pi / 48 for i in range(49)]], 0.025, mm, res=4)
    # prédios: arestas (wireframe aplicado) + faces de vidro holográfico
    rh = random.Random(5); arestas = bmesh.new(); vidros = bmesh.new()
    for i in range(42):
        while True:
            x, y = rh.uniform(-2.2, 2.2), rh.uniform(-1.9, 1.9)
            if math.hypot(x / 2.2, y / 1.9) < 1.0: break
        d = math.hypot(x / 2.2, y / 1.9) * 1.5
        h = (0.4 + (1.5 - d) * 1.7) * rh.uniform(0.6, 1.25) + 0.2
        w = rh.uniform(0.22, 0.42); dd = rh.uniform(0.22, 0.42)
        mtx = Matrix.Translation((x, YH + y, 0.32 + h / 2)) @ Matrix.Diagonal((w, dd, h, 1))
        bmesh.ops.create_cube(arestas, size=1.0, matrix=mtx); bmesh.ops.create_cube(vidros, size=1.0, matrix=mtx)
        if h > 1.6 and rh.random() < 0.6:  # torre com coroa/antena
            m2 = Matrix.Translation((x, YH + y, 0.32 + h + 0.25)) @ Matrix.Diagonal((w * 0.55, dd * 0.55, 0.5, 1))
            bmesh.ops.create_cube(arestas, size=1.0, matrix=m2); bmesh.ops.create_cube(vidros, size=1.0, matrix=m2)
    oa = objeto('F03_holo_arestas', arestas, col, holo)
    wf = oa.modifiers.new('wf', 'WIREFRAME'); wf.thickness = 0.03; wf.use_replace = True
    bpy.context.view_layer.objects.active = oa; oa.select_set(True); bpy.ops.object.modifier_apply(modifier='wf'); oa.select_set(False)
    objeto('F03_holo_vidros', vidros, col, holo_vidro)
    # anéis flutuantes (discos de varredura) e feixes
    for k, (zz, rr) in enumerate(((2.9, 2.4), (4.7, 2.0))):
        tubo(f'F03_holo_anel{k}', col, [(rr * math.cos(a), YH + rr * math.sin(a), zz) for a in [i * 2 * math.pi / 56 for i in range(57)]], 0.045, holo, res=6)
        tubo(f'F03_holo_anel{k}b', col, [((rr - 0.18) * math.cos(a), YH + (rr - 0.18) * math.sin(a), zz - 0.06) for a in [i * 2 * math.pi / 56 for i in range(57)]], 0.02, roxo if k else holo, res=4)
        dsk = bmesh.new(); bmesh.ops.create_circle(dsk, cap_ends=True, segments=40, radius=rr - 0.05, matrix=Matrix.Translation((0, YH, zz)))
        objeto(f'F03_holo_disco{k}', dsk, col, holo_vidro)
    feixes = []
    for k in range(6):
        a = k * math.pi / 3 + 0.3
        feixes.append(tubo(f'F03_feixe{k}', col, [(2.3 * math.cos(a), YH + 2.3 * math.sin(a), 0.32), (1.95 * math.cos(a), YH + 1.95 * math.sin(a), 4.7)], 0.012, holo, res=4))
    junta('F03_feixes', feixes)

    bpy.context.view_layer.update()
    confere_vao(col, ignora=('F03_holo', 'F03_ped', 'F03_feixe'))
    say('tris', sum(len(p.vertices) - 2 for o in col.all_objects if o.type == 'MESH' for p in o.data.polygons))
    contexto_previa(col, tunel_mat=material('PREV_placa', 'metal_plate', tint=(0.35, 0.38, 0.42), metal=0.7))
    luzes((0.1, 0.6, 1.0), 700)
    bloom(0.8)
    previas('f03', extra=[((0, -6, 2.2), (0, 3.9, 2.4), 30)])
    previa_arte('f03', '03')
    tira_previa()
    fecha('fachada_03', col)


rodar(main)
