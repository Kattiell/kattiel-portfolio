# Fachada 05 (Energia): anel de aço aparafusado com faixa de luz azul, turbina azul no interior,
# tanques/colunas polidas dos dois lados com bobinas de Tesla, canos curvos e raios azul-violeta.
import sys; sys.path.insert(0, r'C:\Users\Gabriel Caetano\Downloads\Claud Code\batcaverna\tools\blender\oficina\f0506')
from f0506_comum import *

N = 'F05'

def materiais():
    M = {}
    M['aco'] = metal_tom('F05_aco', 'metal_plate_02', (0.2, 0.235, 0.3), 1.15)
    M['aco_esc'] = metal_tom('F05_aco_esc', 'metal_plate_02', (0.08, 0.09, 0.12), 1.0)
    M['polido'] = material('F05_polido', 'blue_metal_plate', tint=(0.62, 0.72, 0.9), metal=1.0)
    M['cromo'] = metal_tom('F05_cromo', 'blue_metal_plate', (0.8, 0.82, 0.86), 0.8)
    M['cobre'] = material('F05_cobre', 'rust_coarse_01', tint=(1.25, 0.72, 0.5), metal=1.0)
    M['borracha'] = material('F05_borracha', 'rusty_metal_03', tint=(0.05, 0.05, 0.055), metal=0.0)
    M['azul'] = emissivo('F05_luz_azul', (0.05, 0.22, 1.0), 2.6)
    M['raio'] = emissivo('F05_raio', (0.32, 0.28, 1.0), 2.2)
    M['quente'] = emissivo('F05_quente', (1.0, 0.45, 0.12), 3.5)
    M['fundo_azul'] = emissivo('F05_brilho', (0.12, 0.33, 1.0), 2.2)
    return M

def arco(col, M):
    cont = contorno(3.2, 3.0, 3.2, passos=48)
    # faixa interna escura com painéis de luz azul (as "janelas" acesas da referência)
    banda(f'{N}_banda_int', col, cont, 0.1, 0.62, -0.78, 0.1, M['aco_esc'], tam=1.4)
    pecas_no_contorno(f'{N}_painel_luz', col, cont, 0.6, lambda k: bm_caixa(0.4, 0.05, 0.3, (0, -0.8, 0), bev=0.01), M['azul'], 0.36, inicio=0.25)
    pecas_no_contorno(f'{N}_painel_sep', col, cont, 0.6, lambda k: bm_caixa(0.09, 0.12, 0.5, (0, -0.82, 0), bev=0.015), M['aco'], 0.36, inicio=0.55)
    # anel externo pesado, em segmentos aparafusados
    banda(f'{N}_anel', col, cont, 0.62, 1.5, -0.86, 0.25, M['aco'], tam=1.6, bev=0.04)
    banda(f'{N}_labio', col, cont, 1.5, 1.62, -0.7, 0.25, M['cromo'], tam=1.2, bev=0.02)
    banda(f'{N}_labio_int', col, cont, 0.56, 0.66, -0.92, 0.0, M['cromo'], tam=1.2, bev=0.015)
    pecas_no_contorno(f'{N}_junta', col, cont, 1.32, lambda k: bm_caixa(0.2, 0.12, 0.98, (0, -0.9, 0), bev=0.02), M['aco_esc'], 1.06, inicio=0.66)
    def rebite_em(y):
        def f(k):
            bm = bm_rebite(0.05, 0.05); bmesh.ops.translate(bm, vec=Vector((0, y, 0)), verts=bm.verts); return bm
        return f
    pecas_no_contorno(f'{N}_rebite_a', col, cont, 0.42, rebite_em(-0.88), M['cromo'], 0.76)
    pecas_no_contorno(f'{N}_rebite_b', col, cont, 0.42, rebite_em(-0.88), M['cromo'], 1.38)
    # placa de fundo com o vão (embute o anel na rocha) e sapatas
    parede_arco(f'{N}_fundo', col, 10.2, 5.6, 0.45, M['aco_esc'], folga=0.12, frente=0.05, tam=2.4)
    for s in (-1, 1):
        caixa(f'{N}_sapata{s}', col, (1.3, 1.25, 0.5), (s * 4.08, -0.3, 0.25), M['aco_esc'], bev=0.05, tam=1.4)
    # placa de fixação do medalhão (atrás dele: o medalhão do site fica em y=-1.05, z=7.35)
    bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=8, radius=1.12)
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'X'), verts=bm.verts)
    f = [x for x in bm.faces][0]; ex = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, vec=Vector((0, 0.14, 0)), verts=[e for e in ex['geom'] if isinstance(e, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = objeto(f'{N}_placa_med', bm, col, M['aco']); o.location = (0, -0.99, 7.35); uv_mundo(o, 1.0)
    rebites(f'{N}_placa_reb', col, [(1.0 * math.cos(a), -1.0, 7.35 + 1.0 * math.sin(a)) for a in [math.pi / 8 + k * math.pi / 4 for k in range(8)]], M['cromo'], 0.05)

def coluna(col, M, s):
    x = s * 5.45; y = -0.05
    cilindro(f'{N}_base{s}', col, 0.72, 1.0, (x, y, 0.5), M['aco_esc'], lados=32, bev=0.04, tam=1.2)
    cilindro(f'{N}_base_aro{s}', col, 0.745, 0.1, (x, y, 1.0), M['cromo'], lados=32, bev=0.02)
    # janelas quentes da base (a luz âmbar no pé dos tanques)
    for k, a in enumerate((-125, -90, -55)):
        ar = math.radians(a)
        caixa(f'{N}_janela{s}_{k}', col, (0.24, 0.05, 0.36), (x + 0.74 * math.cos(ar), y + 0.74 * math.sin(ar), 0.5), M['quente'], bev=0.01, rot=(0, 0, ar + math.pi / 2))
    cilindro(f'{N}_tanque{s}', col, 0.6, 6.0, (x, y, 4.0), M['polido'], lados=40, bev=0.03, tam=1.6)
    for k, z in enumerate((1.35, 2.75, 4.3, 5.75, 6.85)):
        cilindro(f'{N}_aro{s}_{k}', col, 0.67 if k % 2 == 0 else 0.645, 0.16 if k % 2 == 0 else 0.08, (x, y, z), M['cromo'] if k % 2 == 0 else M['aco_esc'], lados=40, bev=0.02)
    rebites(f'{N}_aro_reb{s}', col, [(x + 0.68 * math.cos(math.radians(a)), y + 0.68 * math.sin(math.radians(a)), z) for z in (1.35, 4.3) for a in range(-170, 0, 20)], M['aco_esc'], 0.035)
    esfera(f'{N}_cupula{s}', col, 0.6, (x, y, 7.0), M['polido'], seg=32, anel_=12, meia=True, esc=(1, 1, 0.55))
    # bobina de Tesla: isolador, enrolamento de cobre, toroide
    cilindro(f'{N}_isolador{s}', col, 0.16, 0.35, (x, y, 7.45), M['aco_esc'], lados=16, bev=0.01)
    for k in range(4):
        cilindro(f'{N}_disco{s}_{k}', col, 0.3 - k * 0.025, 0.05, (x, y, 7.36 + k * 0.08), M['cromo'], lados=24, bev=0.0)
    cilindro(f'{N}_bobina{s}', col, 0.23, 0.9, (x, y, 8.08), M['cobre'], lados=24, bev=0.01, tam=0.4)
    for k in range(10):
        cilindro(f'{N}_espira{s}_{k}', col, 0.245, 0.03, (x, y, 7.7 + k * 0.085), M['cobre'], lados=24, bev=0.0)
    anel(f'{N}_toroide{s}', col, 0.4, 0.13, (x, y, 8.62), M['cromo'], maior=32, menor=12)
    esfera(f'{N}_topo{s}', col, 0.12, (x, y, 8.66), M['raio'], seg=12, anel_=6)
    # lâmpada industrial no pé do tanque, virada para o salão
    ph_parte('industrial_wall_lamp', 'industrial_wall_lamp', col, f'{N}_lampada{s}', x=x, y=y - 0.86, z=1.55, rz=0.0, altura=0.42, vidro=M['quente'])

def canos(col, M):
    # cano da esquerda: sai da cúpula, sobe e mergulha no topo do anel
    cano(f'{N}_cano_e', col, [(-5.45, -0.15, 7.2), (-5.45, -0.15, 8.15), (-2.3, -0.15, 8.15), (-2.3, -0.15, 6.9)], 0.19, M['polido'], curva=0.55,
         flanges=[((-5.45, -0.15, 7.75), (0, 0, 1)), ((-3.6, -0.15, 8.15), (1, 0, 0)), ((-2.3, -0.15, 7.45), (0, 0, 1))], mat_fl=M['cromo'])
    # cano da direita: cotovelo largo saindo para o lado do portal 6 (a ligação da referência)
    cano(f'{N}_cano_d', col, [(5.45, -0.15, 7.2), (5.45, -0.15, 7.95), (6.2, -0.15, 7.95)], 0.24, M['polido'], curva=0.5,
         flanges=[((5.45, -0.15, 7.55), (0, 0, 1)), ((6.02, -0.15, 7.95), (1, 0, 0))], mat_fl=M['cromo'])
    cano(f'{N}_cano_d2', col, [(5.45, 0.2, 2.2), (4.9, 0.2, 2.2), (4.9, 0.2, 5.6), (4.7, 0.2, 5.9)], 0.12, M['cromo'], curva=0.3)
    cano(f'{N}_cano_e2', col, [(-5.45, 0.2, 3.1), (-4.85, 0.2, 3.1), (-4.85, 0.2, 5.4)], 0.12, M['cromo'], curva=0.3)
    # cabos pendurados entre tanque e anel
    rnd = random.Random(5)
    for i, (a, b) in enumerate((((-5.0, -0.55, 6.5), (-4.55, -0.75, 4.9)), ((5.0, -0.55, 6.2), (4.6, -0.75, 4.3)), ((-5.05, -0.5, 5.2), (-4.62, -0.78, 3.0)))):
        a = Vector(a); b = Vector(b); pts = []
        for k in range(13):
            t = k / 12; p = a.lerp(b, t); p.y -= 0.28 * math.sin(math.pi * t); p.x += 0.12 * math.sin(math.pi * t) * (1 if a.x > 0 else -1); pts.append(tuple(p))
        curva_malha(f'{N}_cabo{i}', col, pts, 0.035, M['borracha'], res=1)

def turbina(col, M):
    yc = 2.3; zc = 3.05
    anel(f'{N}_tur_aro', col, 2.8, 0.16, (0, yc - 0.1, zc), M['aco'], maior=64, menor=10, rot=(math.radians(90), 0, 0))
    anel(f'{N}_tur_aro2', col, 2.55, 0.06, (0, yc - 0.22, zc), M['cromo'], maior=64, menor=8, rot=(math.radians(90), 0, 0))
    # segmentos de luz em volta (anel azul aceso)
    bm_all = bmesh.new()
    for k in range(28):
        a = 2 * math.pi * k / 28
        bm = bm_caixa(0.36, 0.05, 0.16, bev=0.01)
        bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(a, 3, 'Y'), verts=bm.verts)
        bmesh.ops.translate(bm, vec=Vector((2.8 * math.sin(a), yc - 0.29, zc + 2.8 * math.cos(a))), verts=bm.verts)
        me = bpy.data.meshes.new('t'); bm.to_mesh(me); bm.free(); bm_all.from_mesh(me); bpy.data.meshes.remove(me)
    objeto(f'{N}_tur_luzes', bm_all, col, M['azul'])
    # pás torcidas
    bm_all = bmesh.new()
    for k in range(30):
        a = 2 * math.pi * k / 30; bm = bmesh.new(); vs = []
        for j in range(5):
            r = 0.7 + (2.5 - 0.7) * j / 4; w = 0.12 + 0.17 * j / 4; tw = math.radians(42 - 14 * j / 4)
            for side in (-1, 1):
                vs.append(bm.verts.new((side * w * math.cos(tw), side * w * math.sin(tw), r)))
        for j in range(4): bm.faces.new((vs[2 * j], vs[2 * j + 1], vs[2 * j + 3], vs[2 * j + 2]))
        bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.025)
        bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(-a, 3, 'Y'), verts=bm.verts)
        bmesh.ops.translate(bm, vec=Vector((0, yc, zc)), verts=bm.verts)
        me = bpy.data.meshes.new('t'); bm.to_mesh(me); bm.free(); bm_all.from_mesh(me); bpy.data.meshes.remove(me)
    o = objeto(f'{N}_tur_pas', bm_all, col, M['aco']); uv_mundo(o, 1.0)
    o.data.transform(Matrix.Translation((0, -yc, -zc))); o.location = (0, yc, zc)  # pivô no cubo (o site pode girar)
    # cubo: engrenagem prateada com dentes e cone
    cilindro(f'{N}_tur_cubo', col, 0.72, 0.4, (0, yc - 0.1, zc), M['cromo'], lados=36, bev=0.03, rot=(math.radians(90), 0, 0))
    bm_all = bmesh.new()
    for k in range(20):
        a = 2 * math.pi * k / 20; bm = bm_caixa(0.16, 0.3, 0.2, bev=0.01)
        bmesh.ops.translate(bm, vec=Vector((0, 0, 0.8)), verts=bm.verts)
        bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(-a, 3, 'Y'), verts=bm.verts)
        bmesh.ops.translate(bm, vec=Vector((0, yc - 0.12, zc)), verts=bm.verts)
        me = bpy.data.meshes.new('t'); bm.to_mesh(me); bm.free(); bm_all.from_mesh(me); bpy.data.meshes.remove(me)
    o = objeto(f'{N}_tur_dentes', bm_all, col, M['cromo']); uv_mundo(o, 0.6)
    o.data.transform(Matrix.Translation((0, -yc, -zc))); o.location = (0, yc, zc)
    cilindro(f'{N}_tur_cone', col, 0.48, 0.42, (0, yc - 0.48, zc), M['polido'], lados=32, bev=0.0, r2=0.08, rot=(math.radians(90), 0, 0))
    esfera(f'{N}_tur_olho', col, 0.12, (0, yc - 0.7, zc), M['azul'], seg=16, anel_=8)
    # brilho azul atrás das pás
    bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=48, radius=2.75)
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'X'), verts=bm.verts)
    o = objeto(f'{N}_tur_brilho', bm, col, M['fundo_azul']); o.location = (0, yc + 0.45, zc)

def eletricidade(col, M):
    rnd = random.Random(55)
    trajetos = [
        ((-5.45, -0.3, 8.75), (-0.95, -1.2, 8.55), 0.22),
        ((5.45, -0.3, 8.75), (1.0, -1.2, 8.6), 0.22),
        ((-0.9, -1.2, 8.4), (1.0, -1.2, 8.9), 0.3),
        ((-5.55, -0.7, 7.1), (-5.35, -0.95, 0.4), 0.12),
        ((-4.5, -1.1, 5.9), (-2.6, -1.15, 7.55), 0.2),
        ((2.6, -1.15, 7.55), (4.55, -1.1, 5.7), 0.2),
        ((5.5, -0.7, 6.9), (5.3, -0.9, 4.2), 0.15),
        ((-5.0, -0.4, 8.9), (-3.2, -0.6, 9.3), 0.3),
        ((5.0, -0.4, 8.9), (3.0, -0.6, 9.35), 0.3),
    ]
    raios(f'{N}_raios', col, trajetos, M['raio'], rnd, raio=0.016, galhos=5)

def main(args):
    C.limpa()
    col = colecao(N)
    M = materiais()
    arco(col, M)
    for s in (-1, 1): coluna(col, M, s)
    canos(col, M)
    turbina(col, M)
    eletricidade(col, M)
    checa_limites(col); lista_tris(col)
    # luzes e medalhão só para a prévia (o site põe os dele)
    luz_prev('tur', 'POINT', (0, 1.2, 3.2), (0.3, 0.5, 1.0), 900, tam=1.5)
    luz_prev('raio', 'POINT', (0, -2.0, 8.5), (0.55, 0.55, 1.0), 400, tam=2)
    luz_prev('ambar', 'POINT', (0, -4.0, 1.0), (1.0, 0.6, 0.3), 200, tam=2)
    med = cilindro('PREV_med', col, 0.9, 0.08, (0, -1.08, 7.35), emissivo('PREV_med_m', (0.05, 0.07, 0.12), 0.3), lados=40, bev=0.0, rot=(math.radians(90), 0, 0))
    bpy.context.scene.view_settings.view_transform = 'Standard'
    previa('f05_frente', cam=(0, -17, 4.6), alvo=(0, 0, 4.4), lente=30)
    previa('f05_diag', cam=(-8.5, -12.5, 3.2), alvo=(0, 0, 4.6), lente=30)
    previa('f05_perto', cam=(3.5, -6.5, 6.5), alvo=(-1.5, 0, 6.5), lente=24)
    bpy.data.objects.remove(med)
    fecha('fachada_05', col)
    checa_limites(col)
rodar(main)
