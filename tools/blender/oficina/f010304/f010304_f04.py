# Fachada 04 (Pesca): arco de madeira azulada em aduelas com cintas de ferro, dois mastros com pomo,
# cordas em catenária, redes de malha em losango drapeadas por cima e caindo nas laterais, boias brancas,
# cerca de madeira na frente; por dentro, canal de água turquesa brilhante, cais lateral, barco a remo e lanterna.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from f010304_comum import *


def rede(nome, col, F, n=22, espessura=0.022, mat=None, recorte=None):
    """Rede de malha em losango: F(u, v) -> ponto 3D, u,v em [0,1]. Wireframe aplicado (cordas com volume)."""
    bm = bmesh.new(); vs = {}
    def V(a, b):
        u = (a + b) / (2 * n); v = (a - b) / (2 * n) + 0.5
        if not (-1e-6 <= u <= 1 + 1e-6 and -1e-6 <= v <= 1 + 1e-6): return None
        if (a, b) not in vs:
            p = F(u, v)
            if p is None: return None
            vs[(a, b)] = bm.verts.new(p)
        return vs[(a, b)]
    for a in range(0, 2 * n):
        for b in range(-n, n):
            q = [V(a, b), V(a + 1, b), V(a + 1, b + 1), V(a, b + 1)]
            if None in q: continue
            if recorte and not recorte(*[c for c in q]): continue
            try: bm.faces.new(q)
            except ValueError: pass
    o = objeto(nome, bm, col, mat)
    wf = o.modifiers.new('wf', 'WIREFRAME'); wf.thickness = espessura; wf.use_replace = True; wf.use_even_offset = True
    for x in bpy.context.selected_objects: x.select_set(False)
    bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.modifier_apply(modifier='wf'); o.select_set(False)
    uv_mundo(o, 0.25); return o


def barco(nome, col, mat, mat_borda, L=3.4, W=1.25, D=0.55):
    """Barco a remo: casco loftado em U (ponta na proa e popa estreita), costado com espessura, bancos."""
    bm = bmesh.new(); aneis = []; nl = 14
    for i in range(nl + 1):
        t = i / nl; y = (t - 0.5) * L
        larg = W / 2 * (math.sin(math.pi * min(1, t * 1.05)) ** 0.55 if t < 0.95 else 0.25 + 0.0) if t > 0.02 else 0.02
        larg = max(0.05, W / 2 * (math.sin(math.pi * t) ** 0.6) * (1 - 0.35 * t) + (0.14 if t > 0.9 else 0))
        prof = D * (0.75 + 0.25 * math.sin(math.pi * t)); sobe = 0.18 * (abs(t - 0.45) * 2) ** 2.5
        anel = []
        for k in range(7):
            a = math.pi * k / 6
            anel.append(bm.verts.new((-larg * math.cos(a), y, sobe + D - prof * math.sin(a) ** 0.8)))
        aneis.append(anel)
    for a, b in zip(aneis, aneis[1:]):
        for k in range(6): bm.faces.new((a[k], a[k + 1], b[k + 1], b[k]))
    bm.faces.new([aneis[-1][k] for k in range(7)][::-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    borda_e = [tuple(a[0].co) for a in aneis]; borda_d = [tuple(a[6].co) for a in aneis]
    o = objeto(nome, bm, col, mat)
    sd = o.modifiers.new('sd', 'SOLIDIFY'); sd.thickness = 0.05
    for x in bpy.context.selected_objects: x.select_set(False)
    bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.modifier_apply(modifier='sd'); o.select_set(False)
    uv_mundo(o, 0.8)
    for p in o.data.polygons: p.use_smooth = True
    partes = [o]
    for yy in (-0.55, 0.45):
        partes.append(caixa(nome + f'_banco{yy}', col, (W * 0.85, 0.28, 0.05), (0, yy, D * 0.72), mat_borda, bev=0.01, tam=0.6))
    # amurada (borda) de madeira escura
    partes.append(tubo(nome + '_amur_e', col, [(p[0], p[1], p[2] + 0.02) for p in borda_e], 0.035, mat_borda))
    partes.append(tubo(nome + '_amur_d', col, [(p[0], p[1], p[2] + 0.02) for p in borda_d], 0.035, mat_borda))
    # remos
    for s in (-1, 1):
        partes.append(tubo(nome + f'_remo{s}', col, [(s * 0.3, -0.2, D * 0.8), (s * 1.0, 0.9, D * 0.45)], 0.025, mat_borda))
        partes.append(caixa(nome + f'_pa{s}', col, (0.16, 0.5, 0.02), (s * 1.08, 1.12, D * 0.42), mat_borda, bev=0.0, rot=(0, 0, -s * 0.55)))
    return junta(nome, partes)


def main(args):
    C.limpa()
    col = colecao('F04')
    madeira = material('F04_madeira', 'weathered_planks', tint=(0.62, 0.74, 0.82))
    madeira2 = material('F04_madeira_esc', 'weathered_brown_planks', tint=(0.85, 0.75, 0.62))
    poste = madeira2
    corda = cor('F04_corda', (0.36, 0.25, 0.13), rough=0.95)
    ferro = cor('F04_ferro', (0.06, 0.08, 0.09), rough=0.6, metal=0.85)
    boia = cor('F04_boia', (0.86, 0.85, 0.8), rough=0.45)
    agua = mat_emissivo('F04_agua', (0.0, 0.42, 0.5), 0.45, base=(0.0, 0.16, 0.2), rough=0.03)
    agua_luz = mat_emissivo('F04_agua_brilho', (0.15, 0.85, 1.0), 1.6, base=(0.2, 0.8, 1.0), rough=0.05, alpha=0.7)
    luz = mat_emissivo('F04_chama', (1.0, 0.62, 0.25), 8.0, base=(1.0, 0.8, 0.5))

    # ---------- arco de madeira em aduelas (tábuas grossas) com cintas de ferro ----------
    aduelas('F04_aduela', col, madeira, n=13, prof=0.85, alt=0.95, frente=-0.72, chave=1.12, seed=4)
    r0 = R + 0.1
    pts, nrm = caminho_u(r0, 48)
    varre('F04_cinta_in', col, pts, nrm, secao_retangular(0.02, 0.12, -0.8, -0.7, 0.01), ferro)
    varre('F04_cinta_out', col, pts, nrm, secao_retangular(0.82, 0.94, -0.8, -0.7, 0.01), ferro)
    # cravos de ferro nas cintas
    cr = bmesh.new()
    for (x, z), (nx, nz) in list(zip(*caminho_u(r0 + 0.07, 26)))[::2] + list(zip(*caminho_u(r0 + 0.88, 30)))[::2]:
        bmesh.ops.create_icosphere(cr, subdivisions=1, radius=0.045, matrix=Matrix.Translation((x, -0.82, z)))
    objeto('F04_cravos', cr, col, ferro)
    # soleira de madeira
    for s in (-1, 1):
        caixa(f'F04_soleira{s}', col, (1.25, 1.1, 0.3), (s * (r0 + 0.55), -0.25, 0.15), madeira2, bev=0.04, tam=1.0)

    # ---------- mastros com pomo e travessas ----------
    PX, PY, PTOPO = 4.95, -0.62, 8.15
    for s in (-1, 1):
        bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.2, radius2=0.16, depth=PTOPO, matrix=Matrix.Translation((s * PX, PY, PTOPO / 2)))
        rnd = random.Random(7 + s)
        for v in bm.verts: v.co.x += rnd.uniform(-0.015, 0.015); v.co.y += rnd.uniform(-0.015, 0.015)
        o = objeto(f'F04_mastro{s}', bm, col, poste); uv_mundo(o, 1.0)
        for p in o.data.polygons: p.use_smooth = True
        bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=0.27, matrix=Matrix.Translation((s * PX, PY, PTOPO + 0.18)))
        o = objeto(f'F04_pomo{s}', bm, col, poste); uv_mundo(o, 0.6)
        for p in o.data.polygons: p.use_smooth = True
        # amarras de corda no mastro
        for zz in (2.0, 5.6, PTOPO - 0.35):
            tubo(f'F04_amarra{s}{zz}', col, [(s * PX + 0.215 * math.cos(a), PY + 0.215 * math.sin(a), zz + 0.025 * a) for a in [i * 2 * math.pi / 12 for i in range(37)]], 0.03, corda)
        # travessa curta ligando o mastro ao arco (apoio das redes)
        tubo(f'F04_travessa{s}', col, [(s * PX, PY, 6.4), (s * 4.0, -0.62, 6.55), (s * 3.2, -0.66, 7.05)], 0.08, poste)

    # ---------- cordas em catenária entre mastros e o topo (em volta do medalhão do site) ----------
    cordas = []
    TOPO = (0, -0.7, H + 2.05)
    for s in (-1, 1):
        a = (s * PX, PY - 0.05, PTOPO - 0.3)
        cordas.append(tubo(f'F04_corda_top{s}', col, catenaria(a, (s * 1.0, -0.72, H + 2.0), 0.55, 16), 0.04, corda))
        cordas.append(tubo(f'F04_corda_mid{s}', col, catenaria((s * PX, PY - 0.05, 6.9), (s * 1.15, -0.75, H + 0.45), 0.45, 16), 0.035, corda))
        cordas.append(tubo(f'F04_corda_bx{s}', col, catenaria((s * PX, PY - 0.05, 5.6), (s * 3.4, -0.8, 6.6), 0.35, 12), 0.03, corda))
    cordas.append(tubo('F04_corda_cume', col, catenaria((-1.0, -0.72, H + 2.0), (1.0, -0.72, H + 2.0), 0.12, 10), 0.04, corda))
    junta('F04_cordas', cordas)

    # ---------- redes ----------
    redes = []
    for s in (-1, 1):
        # rede de cima: entre a corda de cima e a corda do meio, drapeada sobre o arco
        def F_cima(u, v, s=s):
            topo = catenaria((s * PX, 0, PTOPO - 0.3), (s * 1.0, 0, H + 2.0), 0.55, 40)[int(u * 40)]
            baixo = catenaria((s * PX, 0, 6.9), (s * 1.15, 0, H + 0.45), 0.45, 40)[int(u * 40)]
            x = topo[0] + (baixo[0] - topo[0]) * v; z = topo[2] + (baixo[2] - topo[2]) * v - 0.25 * math.sin(math.pi * v) * math.sin(math.pi * u)
            return (x, -0.76 - 0.06 * math.sin(math.pi * v), z)
        redes.append(rede(f'F04_rede_cima{s}', col, F_cima, n=11, espessura=0.03, mat=corda))
    # rede grande caindo pela direita até o chão (franzida), e saco de rede à esquerda
    def F_dir(u, v):
        x0 = 4.35 + 1.55 * u; z = 7.6 - 7.45 * v - 0.6 * math.sin(math.pi * u) * (1 - v)
        x = x0 - 0.35 * v * (u - 0.5) + 0.12 * math.sin(v * 9 + u * 4)
        return (min(6.08, max(3.65, x)), -1.02 + 0.12 * math.sin(u * 7 + v * 5) * v, max(0.05, z))
    redes.append(rede('F04_rede_dir', col, F_dir, n=14, espessura=0.03, mat=corda))
    def F_esq(u, v):
        x = -4.55 - 1.2 * u + 0.25 * math.sin(math.pi * v) * (u - 0.5)
        z = 6.5 - 4.6 * v - 0.45 * math.sin(math.pi * u)
        return (max(-6.05, x), -0.98 + 0.1 * math.sin(math.pi * u) * v, z)
    redes.append(rede('F04_rede_esq', col, F_esq, n=10, espessura=0.03, mat=corda))
    junta('F04_redes', redes)

    # ---------- boias brancas penduradas (pares), com a corda e a costura ----------
    bo = bmesh.new(); pend = []
    for (x, z, r) in ((-4.4, 4.4, 0.36), (-3.95, 4.0, 0.32), (-5.35, 1.3, 0.28), (4.2, 5.6, 0.37), (4.72, 5.0, 0.34), (5.7, 2.6, 0.26)):
        bmesh.ops.create_uvsphere(bo, u_segments=16, v_segments=10, radius=r, matrix=Matrix.Translation((x, -0.88, z)))
        pend.append(tubo(f'F04_pend{x}', col, [(x, -0.88, z + r), (x + 0.05, -0.86, z + r + 0.75)], 0.022, corda))
        pend.append(tubo(f'F04_cost{x}', col, [(x + r * 1.01 * math.cos(a), -0.88 + r * 1.01 * math.sin(a), z) for a in [i * 2 * math.pi / 20 for i in range(21)]], 0.018, corda))
    o = objeto('F04_boias', bo, col, boia); uv_mundo(o, 0.5)
    for p in o.data.polygons: p.use_smooth = True
    junta('F04_pendurais', pend)
    # cordas soltas penduradas do arco (fora do vão)
    sol = []
    for k, (ang, L) in enumerate(((35, 1.1), (55, 0.8), (125, 0.9), (148, 1.2))):
        a = math.radians(ang); x = (R + 0.75) * math.cos(a); z = SPRING + (R + 0.75) * math.sin(a)
        sol.append(tubo(f'F04_solta{k}', col, [(x, -0.86, z), (x * 1.03, -0.9, z - L * 0.5), (x * 1.06, -0.88, z - L)], 0.025, corda))
    junta('F04_soltas', sol)
    # boia salva-vidas no mastro esquerdo
    sv = modelo('lifebuoy', col, 'F04_salvavidas', -PX, -0.9, 2.3, larg=0.95)
    decima(sv, 3000); bpy.context.view_layer.update()
    say('salvavidas dims', tuple(round(d, 2) for d in sv.dimensions))
    d = sv.dimensions
    if d.z < 0.5 * max(d.x, d.y):  # deitada: põe de pé, de frente para o salão
        sv.data.transform(Matrix.Rotation(math.pi / 2, 4, 'X' if d.x >= d.y else 'Y'))
    poe(sv, -PX + 0.1, -0.95, 2.3, rz=0.0, larg=0.95)

    # ---------- cerca de madeira na frente (dos dois lados) ----------
    cerca = []
    for s in (-1, 1):
        xs = [3.55, 4.4, 5.25, 6.0]
        for i, x in enumerate(xs):
            cerca.append(caixa(f'F04_cpost{s}{i}', col, (0.14, 0.14, 1.35), (s * x, -1.1, 0.675), madeira2, bev=0.02, rot=(0, 0, 0.05 * (i - 1.5)), tam=0.8))
        for zz in (0.55, 1.05):
            cerca.append(caixa(f'F04_crail{s}{zz}', col, (2.6, 0.08, 0.16), (s * 4.775, -1.18, zz), madeira2, bev=0.015, rot=(0, s * 0.015, 0), tam=1.0))
    junta('F04_cerca', cerca)

    # ---------- por dentro: costelas de madeira, água turquesa, cais, barco, lanterna ----------
    cost = []
    for y in (1.2, 3.8, 6.4, 9.0):
        p2, n2 = caminho_u(R - 0.05, 32)
        cost.append(varre(f'F04_costela{y}', col, p2, n2, secao_retangular(-0.12, 0.08, y - 0.15, y + 0.15, 0.02), madeira2, tam=1.0))
    junta('F04_costelas', cost)
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=6, y_segments=20, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * 3.05, 6.8 + v.co.y * 6.1, 0.035))
    o = objeto('F04_agua', bm, col, agua); uv_mundo(o, 4)
    # reflexos/correnteza brilhando na água (fitas sinuosas)
    rib = []
    for k, (x0, amp, ph, w) in enumerate(((-0.2, 0.9, 0.0, 0.07), (0.35, 0.7, 0.6, 0.03), (-0.75, 0.5, 2.2, 0.025))):
        pts_r = [(x0 + amp * math.sin(y * 0.55 + ph) * (0.4 + 0.6 * y / 12), y, 0.045) for y in [0.9 + i * 0.4 for i in range(29)]]
        rib.append(tubo(f'F04_correnteza{k}', col, pts_r, w, agua_luz, res=4))
    for o in rib:
        for v in o.data.vertices: v.co.z = max(0.04, v.co.z * 0.25 + 0.035)
    junta('F04_correnteza', rib)
    # cais à esquerda
    cais = []
    for i in range(10):
        cais.append(caixa(f'F04_tabua{i}', col, (1.15, 0.3, 0.06), (-2.35, 1.6 + i * 0.34, 0.42), madeira2, bev=0.01, rot=(0, 0, random.Random(i).uniform(-0.03, 0.03)), tam=0.9))
    for (x, y) in ((-2.85, 1.5), (-1.85, 1.5), (-2.85, 4.75), (-1.85, 4.75)):
        bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.09, radius2=0.08, depth=1.25, matrix=Matrix.Translation((x, y, 0.62)))
        o = objeto(f'F04_estaca{x}{y}', bm, col, poste); uv_mundo(o, 0.6); cais.append(o)
    cais.append(tubo('F04_cais_corda', col, catenaria((-1.85, 1.5, 1.15), (-1.85, 4.75, 1.15), 0.25, 12), 0.025, corda))
    junta('F04_cais', cais)
    b = barco('F04_barco', col, madeira2, madeira)
    b.scale = (1.25, 1.25, 1.25); b.rotation_euler = (0, 0, 0.18); b.location = (1.05, 5.0, -0.18)
    lt = modelo('wooden_lantern_01', col, 'F04_lanterna', -2.72, 1.1, 3.2, altura=0.55)
    decima(lt, 2500)
    say('lanterna mats', [s.material.name for s in lt.material_slots if s.material])
    for sl in lt.material_slots:
        if sl.material and any(k in sl.material.name.lower() for k in ('glass', 'candle', 'flame', 'light', 'emis')): sl.material = luz
    tubo('F04_gancho', col, [(-2.72, 1.1, 3.75), (-2.72, 1.1, 4.0), (-3.1, 1.1, 4.0)], 0.02, ferro)

    bpy.context.view_layer.update()
    confere_vao(col, ignora=('F04_agua', 'F04_correnteza', 'F04_cais', 'F04_barco', 'F04_lanterna', 'F04_costela', 'F04_gancho'))
    say('tris', sum(len(p.vertices) - 2 for o in col.all_objects if o.type == 'MESH' for p in o.data.polygons))
    contexto_previa(col)
    luzes((0.2, 0.85, 1.0), 600)
    bloom(0.8)
    previas('f04', extra=[((0, -6, 2.2), (0, 6, 1.2), 30)])
    previa_arte('f04', '04')
    tira_previa()
    fecha('fachada_04', col)


rodar(main)
