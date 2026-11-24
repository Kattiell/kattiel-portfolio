# Fachada 06 (Transporte): boca de túnel de aço com moldura em faixas de perigo amarelo/preto, rebites,
# luminárias fluorescentes no teto do túnel, trilhos que saem do túnel e passam na frente, locomotiva dentro.
# O túnel 06 do site é RETANGULAR (6.4 x 6.2): o arco da moldura sobe acima de 6.2 para não invadir os cantos.
import sys; sys.path.insert(0, r'C:\Users\Gabriel Caetano\Downloads\Claud Code\batcaverna\tools\blender\oficina\f0506')
from f0506_comum import *

N = 'F06'
MEIA, ARR, ALT = 3.35, 6.3, 1.5          # contorno interno: pés retos até 6.3, coroa elíptica de 1.5
TRILHO = [(-0.055, 0), (0.055, 0), (0.055, 0.014), (0.014, 0.024), (0.014, 0.066), (0.032, 0.074), (0.032, 0.1),
          (-0.032, 0.1), (-0.032, 0.074), (-0.014, 0.066), (-0.014, 0.024), (-0.055, 0.014)]
BITOLA = 0.8; ZD = 0.07                   # bitola e altura do dormente

def materiais():
    M = {}
    M['aco'] = metal_tom('F06_aco', 'metal_plate_02', (0.2, 0.22, 0.26), 1.15)
    M['aco_esc'] = metal_tom('F06_aco_esc', 'metal_plate_02', (0.075, 0.08, 0.095), 1.0)
    M['cromo'] = metal_tom('F06_cromo', 'blue_metal_plate', (0.78, 0.8, 0.84), 0.8)
    M['polido'] = material('F06_polido', 'blue_metal_plate', tint=(0.55, 0.62, 0.78), metal=1.0)
    M['faixa'] = mat_img('F06_faixa', textura_faixa('f06_faixa', periodos=2), 'metal_plate_02', metal=0.35)
    M['trem'] = metal_tom('F06_trem', 'metal_plate_02', (0.3, 0.25, 0.13), 1.2)
    M['madeira'] = material('F06_madeira', 'dark_wood', tint=(0.35, 0.3, 0.28))
    M['branca'] = emissivo('F06_fluor', (1.0, 0.93, 0.8), 6.0)
    M['farol'] = emissivo('F06_farol', (1.0, 0.85, 0.55), 12.0)
    M['janela'] = emissivo('F06_janela', (1.0, 0.55, 0.18), 1.1)
    M['quente'] = emissivo('F06_quente', (1.0, 0.5, 0.15), 3.5)
    M['sinal'] = emissivo('F06_sinal', (1.0, 0.12, 0.08), 6.0)
    return M

def moldura(col, M):
    cont = contorno(MEIA, ARR, ALT, passos=44, divs_reta=8)
    banda(f'{N}_aro_int', col, cont, 0.0, 0.3, -1.25, 0.2, M['aco'], tam=1.4, bev=0.03)
    banda(f'{N}_faixa', col, cont, 0.3, 0.98, -1.1, 0.2, M['faixa'], tam=1.6, bev=0.02)
    banda(f'{N}_aro_ext', col, cont, 0.98, 1.3, -1.25, 0.2, M['aco'], tam=1.4, bev=0.03)
    banda(f'{N}_labio', col, cont, 1.3, 1.45, -0.85, 0.2, M['aco_esc'], tam=1.4, bev=0.015)
    # presilhas de aço que interrompem a faixa (como as cintas da referência)
    pecas_no_contorno(f'{N}_presilha', col, cont, 2.05, lambda k: bm_caixa(0.2, 0.1, 0.74, (0, -1.13, 0), bev=0.02), M['aco_esc'], 0.64, inicio=0.6)
    def reb(k):
        bm = bm_rebite(0.045, 0.045); bmesh.ops.translate(bm, vec=Vector((0, -1.27, 0)), verts=bm.verts); return bm
    pecas_no_contorno(f'{N}_rebite_i', col, cont, 0.38, reb, M['cromo'], 0.15)
    pecas_no_contorno(f'{N}_rebite_e', col, cont, 0.38, reb, M['cromo'], 1.14)
    # tímpano: chapa entre o topo retangular do túnel (6.2) e a coroa do arco, com nervuras e luminárias
    bm = bmesh.new(); pts = [(-MEIA, 6.25)]
    for k in range(33):
        t = math.pi * (1 - k / 32); pts.append((MEIA * math.cos(t), ARR + ALT * math.sin(t)))
    pts.append((MEIA, 6.25))
    vs = [bm.verts.new((x, -0.1, z)) for x, z in pts]; f = bm.faces.new(vs)
    ex = bmesh.ops.extrude_face_region(bm, geom=[f]); bmesh.ops.translate(bm, vec=Vector((0, 0.3, 0)), verts=[e for e in ex['geom'] if isinstance(e, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = objeto(f'{N}_timpano', bm, col, M['aco_esc']); uv_mundo(o, 1.6)
    for k, x in enumerate((-2.6, -1.3, 1.3, 2.6)):
        top = ARR + ALT * math.sqrt(max(0, 1 - (x / MEIA) ** 2)) - 0.03; h = top - 6.42
        caixa(f'{N}_nervura{k}', col, (0.1, 0.12, h), (x, -0.16, 6.42 + h / 2), M['aco'], bev=0.015)
    caixa(f'{N}_verga', col, (2 * MEIA, 0.3, 0.16), (0, -0.25, 6.33), M['aco'], bev=0.03)
    rebites(f'{N}_verga_reb', col, [(x * 0.42, -0.4, 6.33) for x in range(-7, 8)], M['cromo'], 0.04)
    # luminária de faixa sob a verga (ilumina a boca, como as luzes do teto do túnel na referência)
    caixa(f'{N}_verga_luz', col, (2 * MEIA - 0.6, 0.12, 0.04), (0, -0.25, 6.24), M['branca'], bev=0.0)
    # sapatas no pé da moldura
    for s in (-1, 1):
        caixa(f'{N}_sapata{s}', col, (1.65, 1.5, 0.35), (s * (MEIA + 0.72), -0.5, 0.175), M['aco_esc'], bev=0.04)

def lados(col, M):
    # esquerda (entre o 5 e o 6): tanque polido, cano grosso que entra no topo do arco e a ligação com o portal 5
    x = -5.55
    cilindro(f'{N}_tanque', col, 0.5, 7.0, (x, -0.1, 3.5), M['polido'], lados=36, bev=0.03, tam=1.6)
    for k, z in enumerate((0.35, 1.6, 3.4, 5.2, 6.9)):
        cilindro(f'{N}_aro{k}', col, 0.56, 0.14 if k % 2 == 0 else 0.07, (x, -0.1, z), M['cromo'] if k % 2 == 0 else M['aco_esc'], lados=36, bev=0.015)
    esfera(f'{N}_cupula', col, 0.5, (x, -0.1, 7.0), M['polido'], seg=32, anel_=10, meia=True, esc=(1, 1, 0.5))
    cano(f'{N}_cano', col, [(x, -0.2, 7.1), (x, -0.2, 8.85), (-2.55, -0.2, 8.85), (-2.55, -0.2, 8.4)], 0.27, M['polido'], curva=0.6,
         flanges=[((x, -0.2, 7.6), (0, 0, 1)), ((-4.0, -0.2, 8.85), (1, 0, 0)), ((-2.55, -0.2, 8.5), (0, 0, 1))], mat_fl=M['cromo'])
    cano(f'{N}_cano_lig', col, [(-6.2, -0.15, 7.95), (x, -0.15, 7.95)], 0.24, M['polido'], curva=0.1,
         flanges=[((-6.02, -0.15, 7.95), (1, 0, 0)), ((x - 0.33, -0.15, 7.95), (1, 0, 0))], mat_fl=M['cromo'])
    caixa(f'{N}_suporte_lant', col, (0.5, 0.08, 0.08), (-4.95, -0.75, 4.35), M['aco_esc'], bev=0.0, rot=(math.radians(90), 0, 0))
    caixa(f'{N}_suporte_lant2', col, (0.08, 0.08, 0.5), (-4.95, -0.98, 4.15), M['aco_esc'], bev=0.0)
    lt = lanterna(col, f'{N}_lanterna', -4.95, -1.0, 3.05, altura=0.95)
    dm = lt.modifiers.new('reduz', 'DECIMATE'); dm.ratio = 0.18  # 34 mil tris -> ~6 mil
    # direita: eletrodutos, caixa de força, lâmpada e sinal ferroviário
    for k, xx in enumerate((5.15, 5.45)):
        cilindro(f'{N}_conduite{k}', col, 0.07, 8.2, (xx, -0.05, 4.1), M['cromo'], lados=12, bev=0.0)
    caixa(f'{N}_caixa_forca', col, (0.85, 0.32, 1.1), (5.35, -0.3, 2.1), M['aco'], bev=0.03, tam=1.0)
    caixa(f'{N}_caixa_tampa', col, (0.7, 0.04, 0.9), (5.35, -0.48, 2.1), M['aco_esc'], bev=0.01)
    caixa(f'{N}_caixa_aviso', col, (0.36, 0.02, 0.2), (5.35, -0.51, 2.35), M['faixa'], bev=0.0, tam=0.5)
    ph_parte('industrial_wall_lamp', 'industrial_wall_lamp', col, f'{N}_lampada', x=5.3, y=-0.25, z=4.9, altura=0.45, vidro=M['quente'])
    cilindro(f'{N}_sinal_poste', col, 0.06, 1.2, (5.85, -0.6, 6.4), M['aco_esc'], lados=12, bev=0.0)
    caixa(f'{N}_sinal_caixa', col, (0.42, 0.3, 0.95), (5.85, -0.62, 7.3), M['aco_esc'], bev=0.04)
    for k, (z, m) in enumerate(((7.5, M['sinal']), (7.1, M['aco_esc']))):
        cilindro(f'{N}_sinal_luz{k}', col, 0.12, 0.06, (5.85, -0.8, z), m, lados=16, bev=0.0, rot=(math.radians(90), 0, 0))
        cilindro(f'{N}_sinal_aba{k}', col, 0.15, 0.14, (5.85, -0.86, z + 0.04), M['aco_esc'], lados=16, bev=0.0, r2=0.15, rot=(math.radians(90), 0, 0))

def via(col, M, nome, centro):
    """Dois trilhos varridos + dormentes ao longo de uma linha central (lista de pontos XY)."""
    C_ = [Vector((p[0], p[1], 0)) for p in centro]
    for s in (-1, 1):
        cam = []
        for i, p in enumerate(C_):
            a = C_[max(0, i - 1)]; b = C_[min(len(C_) - 1, i + 1)]; t = (b - a).normalized(); n = Vector((-t.y, t.x, 0))
            cam.append(p + n * (s * BITOLA / 2) + Vector((0, 0, ZD)))
        varre(f'{N}_trilho_{nome}{s}', col, cam, TRILHO, M['cromo'], fechado=True, tam=0.6)
    # dormentes a cada 0.6 m
    bm_all = bmesh.new(); acc = 0.0
    for i in range(1, len(C_)):
        a, b = C_[i - 1], C_[i]; L = (b - a).length; t = (b - a).normalized()
        while acc <= L:
            p = a + t * acc; bm = bm_caixa(0.94, 0.2, ZD, (0, 0, ZD / 2), bev=0.01)
            bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.atan2(t.y, t.x) + math.pi / 2, 3, 'Z'), verts=bm.verts)
            bmesh.ops.translate(bm, vec=p, verts=bm.verts)
            me = bpy.data.meshes.new('t'); bm.to_mesh(me); bm.free(); bm_all.from_mesh(me); bpy.data.meshes.remove(me)
            acc += 0.6
        acc -= L
    o = objeto(f'{N}_dorm_{nome}', bm_all, col, M['madeira']); uv_mundo(o, 1.2)

def trilhos(col, M):
    yf = -0.82; Rc = 2.97; y0 = yf + Rc
    via(col, M, 'frente', [(x * 0.25, yf) for x in range(-24, 25)])           # passa na frente da boca
    via(col, M, 'tunel', [(0, 12.2 - k * 0.5) for k in range(int((12.2 - y0) / 0.5) + 1)] + [(0, y0)])
    via(col, M, 'curva', [(-Rc + Rc * math.cos(math.radians(a)), y0 - Rc * math.sin(math.radians(a))) for a in range(0, 91, 5)])
    # para-choque no fim da linha (lado direito)
    caixa(f'{N}_trilho_batente', col, (0.25, 0.9, 0.45), (6.05, yf, 0.3), M['faixa'], bev=0.03, tam=0.8)

def tunel(col, M):
    # cambotas de aço e luminárias no teto do túnel (o túnel do site é retangular 6.4 x 6.2, LEN 13)
    for k, y in enumerate((1.4, 3.6, 5.8, 8.0, 10.2)):
        for s in (-1, 1): caixa(f'{N}_cambota{k}_{s}', col, (0.1, 0.22, 6.2), (s * 3.15, y, 3.1), M['aco'], bev=0.015)
        caixa(f'{N}_cambota{k}_t', col, (6.4, 0.22, 0.1), (0, y, 6.15), M['aco'], bev=0.015)
    for k, y in enumerate((2.5, 4.7, 6.9, 9.1, 11.2)):
        for s in (-1, 1):
            ph_parte('mounted_fluorescent_lights', 'mounted_fluorescent_lights_g', col, f'{N}_fluor{k}_{s}', x=s * 1.35, y=y, z=6.03, rz=math.radians(90), larg=1.9, vidro=M['branca'])

def locomotiva(col, M):
    y0 = 5.4; L = 4.8; yc = y0 + L / 2
    caixa(f'{N}_loc_chassi', col, (2.1, L, 0.32), (0, yc, 0.82), M['aco_esc'], bev=0.03)
    for s in (-1, 1):
        for k in range(3):
            cilindro(f'{N}_loc_roda{s}_{k}', col, 0.34, 0.12, (s * (BITOLA / 2 + 0.02), y0 + 0.9 + k * 1.5, 0.51), M['aco_esc'], lados=20, bev=0.015, rot=(0, math.radians(90), 0))
        caixa(f'{N}_loc_longarina{s}', col, (0.1, L - 0.4, 0.3), (s * 0.62, yc, 0.55), M['aco'], bev=0.02)
    # caixa com cantos bem arredondados (teto abaulado)
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bmesh.ops.scale(bm, vec=Vector((2.3, L, 2.3)), verts=bm.verts)
    topo = [e for e in bm.edges if all(v.co.z > 0 for v in e.verts) and abs(e.verts[0].co.y - e.verts[1].co.y) > 1]
    bmesh.ops.bevel(bm, geom=topo, offset=0.45, segments=5, affect='EDGES', profile=0.5)
    resto = [e for e in bm.edges if e.calc_face_angle(0) > 0.6]
    bmesh.ops.bevel(bm, geom=resto, offset=0.04, segments=1, affect='EDGES')
    o = objeto(f'{N}_loc_corpo', bm, col, M['trem']); o.location = (0, yc, 2.13); bpy.context.view_layer.update(); uv_mundo(o, 1.6)
    # frente: para-brisa, faróis, para-choque zebrado, lanterna de teto
    for s in (-1, 1):
        caixa(f'{N}_loc_vidro{s}', col, (0.82, 0.04, 0.62), (s * 0.5, y0 - 0.02, 2.55), M['janela'], bev=0.01)
        caixa(f'{N}_loc_vidro_moldura{s}', col, (0.95, 0.06, 0.75), (s * 0.5, y0 + 0.005, 2.55), M['aco_esc'], bev=0.02)
        cilindro(f'{N}_loc_farol{s}', col, 0.17, 0.06, (s * 0.72, y0 - 0.11, 1.45), M['farol'], lados=20, bev=0.0, rot=(math.radians(90), 0, 0))
        cilindro(f'{N}_loc_aro_farol{s}', col, 0.23, 0.14, (s * 0.72, y0 - 0.01, 1.45), M['cromo'], lados=20, bev=0.01, rot=(math.radians(90), 0, 0))
        for k in range(4):
            caixa(f'{N}_loc_janela_lat{s}_{k}', col, (0.04, 0.62, 0.55), (s * 1.16, y0 + 1.1 + k * 0.9, 2.45), M['janela'], bev=0.01)
    caixa(f'{N}_loc_coluna', col, (0.14, 0.05, 0.75), (0, y0 - 0.01, 2.55), M['aco_esc'], bev=0.01)
    caixa(f'{N}_loc_parachoque', col, (2.4, 0.32, 0.34), (0, y0 - 0.2, 0.86), M['faixa'], bev=0.03, tam=0.8)
    for s in (-1, 1): cilindro(f'{N}_loc_tampao{s}', col, 0.14, 0.2, (s * 0.85, y0 - 0.42, 0.86), M['cromo'], lados=16, bev=0.02, rot=(math.radians(90), 0, 0))
    cilindro(f'{N}_loc_farol_teto', col, 0.14, 0.05, (0, y0 - 0.06, 3.0), M['farol'], lados=16, bev=0.0, rot=(math.radians(90), 0, 0))
    caixa(f'{N}_loc_teto', col, (1.3, 2.8, 0.22), (0, yc + 0.4, 3.38), M['aco'], bev=0.04)
    for s in (-1, 1): cilindro(f'{N}_loc_buzina{s}', col, 0.07, 0.5, (s * 0.3, y0 + 0.8, 3.45), M['cromo'], lados=12, bev=0.0, r2=0.12, rot=(math.radians(90), 0, 0))
    # vagão atrás, começando a aparecer
    caixa(f'{N}_vagao', col, (2.3, 1.7, 2.6), (0, 11.25, 1.95), M['trem'], bev=0.08, tam=1.6)
    caixa(f'{N}_vagao_chassi', col, (2.1, 1.7, 0.3), (0, 11.25, 0.8), M['aco_esc'], bev=0.03)
    caixa(f'{N}_engate', col, (0.2, 0.5, 0.18), (0, 10.4, 0.85), M['aco_esc'], bev=0.02)

def main(args):
    C.limpa()
    col = colecao(N)
    M = materiais()
    moldura(col, M)
    lados(col, M)
    trilhos(col, M)
    tunel(col, M)
    locomotiva(col, M)
    checa_limites(col, rect=True); lista_tris(col)
    # prévia: túnel retangular provisório (o do site), luzes e medalhão provisórios
    casca = bmesh.new()
    for (dx, dy, dz, c) in ((0.3, 13, 6.4, (-3.35, 6.5, 3.1)), (0.3, 13, 6.4, (3.35, 6.5, 3.1)), (7.0, 13, 0.3, (0, 6.5, 6.35)), (7.0, 13, 0.2, (0, 6.5, -0.1)), (7, 0.2, 6.4, (0, 12.9, 3.1))):
        b = bm_caixa(dx, dy, dz, c); me = bpy.data.meshes.new('t'); b.to_mesh(me); b.free(); casca.from_mesh(me); bpy.data.meshes.remove(me)
    t = objeto('PREV_tunel', casca, bpy.context.scene.collection, M['aco_esc']); uv_mundo(t, 2.0)
    luz_prev('tun1', 'POINT', (0, 3.0, 5.3), (1.0, 0.85, 0.65), 700, tam=1.0)
    luz_prev('tun2', 'POINT', (0, 8.5, 5.3), (1.0, 0.85, 0.65), 500, tam=1.0)
    luz_prev('frente', 'POINT', (0, -3.5, 7.5), (1.0, 0.8, 0.55), 300, tam=2)
    med = cilindro('PREV_med', bpy.context.scene.collection, 0.9, 0.08, (0, -1.08, 7.35), emissivo('PREV_med_m', (0.05, 0.07, 0.12), 0.3), lados=40, bev=0.0, rot=(math.radians(90), 0, 0))
    bpy.context.scene.view_settings.view_transform = 'Standard'
    previa('f06_frente', cam=(0, -17, 4.6), alvo=(0, 0, 4.4), lente=30)
    previa('f06_diag', cam=(9.0, -12.0, 3.6), alvo=(-0.5, 1.0, 4.0), lente=30)
    previa('f06_perto', cam=(-2.5, -6.0, 2.2), alvo=(0.3, 4.0, 2.4), lente=26)
    for o in (med, t): bpy.data.objects.remove(o)
    fecha('fachada_06', col)
rodar(main)
