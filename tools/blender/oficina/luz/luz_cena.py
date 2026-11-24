# Área ILUMINAÇÃO: monta a caverna com TODOS os GLBs entregues pelas outras áreas (sem alterá-los),
# acende o plano de luz em tempo real (<= 28 luzes, em coordenadas THREE) e renderiza os ângulos das 4 artes.
# Saídas: public/models/luzes.json, oficina/previas/luz_<vista>.png, cenas/luz_cena.blend (só a coleção A_LUZ).
# Args (depois do "--" do rodar.ps1): vistas=entrada,frontal,diagonal,garagem,...  json  emiss  res=1600x900
import sys, os, math, json, time
sys.path.insert(0, r'C:\Users\Gabriel Caetano\Downloads\Claud Code\batcaverna\tools\blender\oficina')
from kit import *
from mathutils import noise
sys.path.insert(0, os.path.join(HERE, 'hub'))
import hub_forma

D = math.pi / 180
ANG = [-52, -33, -14, 14, 33, 52]
DOCS = os.path.join(PROJ, 'docs')

def T(x, y, z):
    """three (x, y, z) -> Blender."""
    return Vector((x, -z, y))

def Pt(r, phi, y=0.0):
    """ponto polar do salão em coordenadas THREE."""
    return (r * math.sin(phi * D), y, -r * math.cos(phi * D))

def hexrgb(h):
    """hex sRGB -> linear (Blender usa cor linear; three converte a cor hex de sRGB para linear também)."""
    c = [((h >> s) & 255) / 255 for s in (16, 8, 0)]
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c)

# ------------------------------------------------------------------ plano de luz (coordenadas THREE)
# Cada portal: luz quente/temática DENTRO da boca (2 m para dentro do túnel, a 0.55·H) que acende o
# interior e derrama pela boca no piso da galeria. Cor por distrito, puxada para o tom que a arte mostra.
PORTAL_COR = {1: 0xffc46a, 2: 0xffa04a, 3: 0x35c4ff, 4: 0x3fe0cf, 5: 0x6f78ff, 6: 0xffb048,
              7: 0xffa64e, 8: 0xd078ff, 9: 0xffcc55, 10: 0xffae66, 11: 0x8cf060, 12: 0xff5a1e}
PORTAL_CD = {1: 95, 2: 85, 3: 85, 4: 80, 5: 90, 6: 90, 7: 90, 8: 85, 9: 95, 10: 85, 11: 80, 12: 100}

def plano():
    L = []
    def add(**k): L.append(k)
    add(id='hemi_caverna', tipo='hemi', cor=0x3f86b8, cor_chao=0x081018, three=5.0, sombra=False,
        papel='preenchimento frio da caverna (a rocha lê azul-ardósia, nunca preto puro)')
    add(id='lua_abertura', tipo='dir', cor=0xa9c8e6, three=1.0, pos=(17, 60, 16), alvo=(0, 0, -10), sombra=True,
        papel='luar frio que entra pela abertura do teto (17, 16): única sombra do salão')
    add(id='feixe_cachoeira', tipo='spot', cor=0xbfe8ff, three=2600, pos=(0, 47, -27), alvo=(0, 8, -37),
        angulo=0.30, penumbra=0.75, alcance=75, sombra=False,
        papel='feixe do teto sobre o morcego e a cachoeira central (somar cone aditivo/god-rays no site)')
    add(id='paredao_centro', tipo='spot', cor=0x6fb8f0, three=2600, pos=(0, 9.5, -14.5), alvo=(0, 27, -37),
        angulo=0.62, penumbra=0.8, alcance=60, sombra=False,
        papel='recorta o morcego esculpido e a rocha atrás da cachoeira, de baixo para cima')
    add(id='morcego_contraluz', tipo='point', cor=0x1ea8ff, three=160, pos=(0, 31, -36.2), alcance=26, sombra=False,
        papel='halo azul atrás do morcego, lava a rocha em volta')
    for s, nm in ((-1, 'esq'), (1, 'dir')):
        add(id=f'paredao_{nm}', tipo='spot', cor=0x2a8fd0, three=9000, pos=Pt(12, -s * 35, 3), alvo=Pt(38, s * 35, 27),
            angulo=0.70, penumbra=0.85, alcance=90, sombra=False,
            papel='luz azul rasante no paredão e nas estalactites acima das fachadas')
    for n in range(1, 13):
        phi = ANG[(n - 1) % 6]; y0 = 15 if n <= 6 else 7
        add(id=f'portal_{n:02d}', tipo='point', cor=PORTAL_COR[n], three=PORTAL_CD[n], pos=Pt(37.0, phi, y0 + 4.2),
            alcance=22, sombra=False, papel=f'interior do portal {n} aceso, derrama na galeria')
    add(id='emblema_plataforma', tipo='point', cor=0x1ec8ff, three=45, pos=(0, 3.2, 1.5), alcance=18, sombra=False,
        papel='brilho ciano do emblema no deque (reflexo molhado)')
    add(id='telas_batcomputador', tipo='point', cor=0x2aa8ff, three=40, pos=(0, 4.6, -8.2), alcance=16, sombra=False,
        papel='luz azul das telas nas mesas, cadeiras e piso')
    add(id='garagem_teto', tipo='spot', cor=0xeef4ff, three=420, pos=(-23.5, 7.3, 4.0), alvo=(-23.5, 1.5, 5),
        angulo=0.95, penumbra=0.65, alcance=22, sombra=True, papel='luminárias brancas do teto da garagem sobre o carro')
    add(id='garagem_fundo', tipo='point', cor=0xdce8ff, three=60, pos=(-28.5, 5.0, -2), alcance=16, sombra=False,
        papel='preenchimento branco na parede de ferramentas e vitrines')
    add(id='cachoeira_central', tipo='point', cor=0x8fe6ff, three=130, pos=(0, 3, -32.5), alcance=24, sombra=False,
        papel='pé da cachoeira central: espuma e lago acendem ciano')
    add(id='cachoeira_direita', tipo='point', cor=0x7fdcff, three=150, pos=(31.5, 7, 19.5), alcance=26, sombra=False,
        papel='queda (34,26) e cascata (38.5,12)')
    add(id='cachoeira_esquerda', tipo='point', cor=0x7fdcff, three=70, pos=(-27, 3.5, 21), alcance=18, sombra=False,
        papel='queda (-30,24)')
    add(id='pier_lanternas', tipo='point', cor=0xffc48a, three=18, pos=(0, 3.2, 19), alcance=12, sombra=False,
        papel='lanternas quentes do píer (reflexo âmbar no piso molhado)')
    return L

EMISS_K = {'A_AGUA_agua': 2.0, 'A_AGUA_espuma': 1.4, 'F01_cristal': 0.5, 'F01_cristal_claro': 0.45,
           'CAV_cristal': 0.7, 'CAV_cristal_ponta': 0.7}   # multiplicadores de prévia por nome de material (preenchido nas iterações; vira recomendação)

# recomendação para o site (fator sobre a força emissiva atual do GLB; os da EMISS_K já foram conferidos na prévia)
EMISS_REC = [
    ('A_AGUA_agua', 2.0, 'cachoeiras leem como pedra cinza; dobrar e tingir o emissivo de 0xbfefff (água branca-ciano da arte)'),
    ('A_AGUA_espuma', 1.4, 'espuma no pé das quedas precisa estourar no bloom'),
    ('F01_cristal / F01_cristal_claro', 0.5, 'cristais lilás saem chapados e brancos; metade deixa a faceta ler'),
    ('CAV_cristal / CAV_cristal_ponta', 0.7, 'o próprio agente da caverna achou claros demais'),
    ('HUB_tela_emblema / HUB_tela_piso', 0.8, 'o morcego do deque estoura para branco sob o bloom; na arte é ciano saturado'),
    ('industrial_wall_lamp (F05, F06)', 0.08, 'força 100 vinda do Poly Haven: no EEVEE a textura é escura e passa, mas no three com bloom 0.82 vira mancha; usar ~8'),
    ('F06_farol', 0.6, 'força 12: faróis da locomotiva dominam a boca do 6'),
    ('F08_fio_luz / F08_fio_halo', 1.6, 'o anel roxo do 8 é o elemento-assinatura do portal na arte e fica apagado'),
    ('F09_trigo', 1.5, 'o trigo da arte brilha dourado; com força 1 e cor escura não chega ao bloom'),
    ('F12_brasa / F12_nucleo', 1.4, 'o anel de brasa do 12 é a assinatura; na arte é laranja intenso'),
    ('F11_brilho', 1.3, 'fio verde-lima com vaga-lumes some contra a parede da estufa'),
    ('LUZ_chama_quente (F10 14, F12 16)', 0.6, 'lanternas com força 14–16 são 2x as das outras fachadas (8); igualar em ~8–9'),
    ('HUB_led_ciano / A_AGUA_led / GAR_led_ciano', 1.0, 'ok como estão: dão as linhas ciano da arte com bloom'),
    ('HUB_tela_* / GAR_tela_* / F03_tela_*', 1.0, 'ok: telas azuis legíveis sem estourar'),
]

# ------------------------------------------------------------------ importação
def importa(path, nome):
    col = colecao(nome)
    lc = bpy.context.view_layer.layer_collection.children[col.name]
    bpy.context.view_layer.active_layer_collection = lc
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    novos = [o for o in bpy.data.objects if o not in antes]
    return col, novos

def ancora(nome, loc, rz):
    e = bpy.data.objects.new(nome, None); bpy.context.scene.collection.objects.link(e)
    e.location = loc; e.rotation_euler = (0, 0, rz); return e

def importa_tudo():
    t0 = time.time()
    for n in range(1, 13):
        p = os.path.join(DOCS, 'blender', f'fachada_{n:02d}.glb')
        if not os.path.exists(p): p = os.path.join(DOCS, 'fachadas', f'fachada_{n:02d}.glb')
        col, novos = importa(p, f'IMP_F{n:02d}')
        phi = ANG[(n - 1) % 6] * D; z = 15 if n <= 6 else 7
        e = ancora(f'PREV_anc_{n:02d}', (38 * math.sin(phi), 38 * math.cos(phi), z), -phi)
        for o in novos:
            if o.parent is None: o.parent = e
    for a in ('caverna', 'agua', 'hub', 'garagem'):
        importa(os.path.join(DOCS, 'blender', f'area_{a}.glb'), f'IMP_{a}')
    col, novos = importa(os.path.join(DOCS, 'blender', 'veiculo2.glb'), 'IMP_carro')
    e = ancora('PREV_anc_carro', T(-23.5, 1.5, 5), math.radians(-35))
    for o in novos:
        if o.parent is None: o.parent = e
    say('importado em', round(time.time() - t0, 1), 's', 'objetos', len(bpy.data.objects))

# ------------------------------------------------------------------ contexto (o que o site desenha proceduralmente)
def P(r, phi, z=0.0):
    return Vector((r * math.sin(phi * D), r * math.cos(phi * D), z))

def contexto():
    cx = colecao('PREV_CTX')
    rocha = material('PREV_rocha', 'cliff_side', tint=(0.26, 0.29, 0.35))  # = rockMaterial do site (cliff_side × 0x8c95a0)
    placa = cor('PREV_placa', (0.16, 0.18, 0.21), rough=0.35, metal=0.85)
    # abóbada
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=96, v_segments=48, radius=64)
    for v in bm.verts:
        v.co *= 1 + 0.05 * noise.fractal(v.co * 0.05, 1.0, 2.0, 5); v.co.z = v.co.z * 0.78 + 4
    bmesh.ops.reverse_faces(bm, faces=bm.faces)
    uv_mundo(objeto('PREV_abobada', bm, cx, rocha), 6)
    # paredão r≈38.4 com as 12 bocas (fachadas cobrem a moldura)
    bm = bmesh.new(); N, M = 180, 56; vs = {}
    for i in range(N + 1):
        f = -90 + 180 * i / N
        for j in range(M + 1):
            z = -3 + 52 * j / M; p = P(38, f, z); nn = noise.fractal(p * 0.11, 1.0, 2.0, 4)
            vs[i, j] = bm.verts.new(P(38.5 + 0.9 * nn, f, z))
    for i in range(N):
        for j in range(M):
            fm = -90 + 180 * (i + 0.5) / N; zm = -3 + 52 * (j + 0.5) / M
            if any(abs(fm - a) < 4.9 and y0 - 0.2 < zm < y0 + 6.25 for a in ANG for y0 in (7, 15)): continue
            bm.faces.new((vs[i, j], vs[i, j + 1], vs[i + 1, j + 1], vs[i + 1, j]))
    uv_mundo(objeto('PREV_paredao', bm, cx, rocha), 6)
    # túneis (13 m) com véu no fundo, como districts.js
    for n in range(1, 13):
        e = bpy.data.objects[f'PREV_anc_{n:02d}']
        tm = placa if n in (3, 5, 6) else rocha
        bm = bmesh.new()
        q = [(-3.2, 0), (3.2, 0), (3.2, 6.2), (-3.2, 6.2)]
        for k in range(4):
            a, b = q[k], q[(k + 1) % 4]
            vv = [bm.verts.new((a[0], 0.2, a[1])), bm.verts.new((b[0], 0.2, b[1])), bm.verts.new((b[0], 13, b[1])), bm.verts.new((a[0], 13, a[1]))]
            bm.faces.new(vv)
        bm.normal_update()
        o = objeto(f'PREV_tunel_{n:02d}', bm, cx, tm); o.parent = e; uv_mundo(o, 3)
        veu = cor(f'PREV_veu_{n:02d}', tuple(c * 0.02 for c in hexrgb(PORTAL_COR[n])), rough=0.8, emiss=0.0)
        veu.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value = (*hexrgb(PORTAL_COR[n]), 1)
        veu.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 0.22
        v = caixa(f'PREV_veu_{n:02d}', cx, (6.4, 0.05, 6.2), (0, 12.4, 3.1), veu, bev=0); v.parent = e
    # galerias (piso de chapa + LED ciano na borda) com o vão das pontes em |φ|<5.5
    led = cor('PREV_led', (0.15, 0.75, 1.0), emiss=5)
    for zz, rin in ((7, 33), (15, 34)):
        for lado in (-1, 1):
            bm = bmesh.new(); prev = None; bl = bmesh.new(); pl = None
            for i in range(34):
                f = lado * (5.5 + (72 - 5.5) * i / 33)
                qd = [bm.verts.new(P(rin, f, zz)), bm.verts.new(P(38.6, f, zz)), bm.verts.new(P(38.6, f, zz - 0.6)), bm.verts.new(P(rin, f, zz - 0.6))]
                ql = [bl.verts.new(P(rin - 0.04, f, zz - 0.18)), bl.verts.new(P(rin - 0.04, f, zz - 0.3))]
                if prev:
                    for k in range(4):
                        try: bm.faces.new((prev[k], prev[(k + 1) % 4], qd[(k + 1) % 4], qd[k]))
                        except ValueError: pass
                    bl.faces.new((pl[0], pl[1], ql[1], ql[0]))
                prev, pl = qd, ql
            bm.normal_update(); o = objeto(f'PREV_galeria{zz}_{lado}', bm, cx, placa); uv_mundo(o, 2)
            objeto(f'PREV_galled{zz}_{lado}', bl, cx, led)
            # corrimão simples com LED (o site desenha o guarda-corpo)
            bm = bmesh.new(); prev = None
            for i in range(34):
                f = lado * (5.5 + (72 - 5.5) * i / 33)
                qq = [bm.verts.new(P(rin + 0.1, f, zz + 1.05)), bm.verts.new(P(rin + 0.1, f, zz + 1.12))]
                if prev: bm.faces.new((prev[0], prev[1], qq[1], qq[0]))
                prev = qq
            objeto(f'PREV_corrimao{zz}_{lado}', bm, cx, led)
    # plinto de rocha sob a galeria de baixo
    bm = bmesh.new(); vs = {}
    for i in range(73):
        f = -72 + 2 * i
        for j in range(8):
            z = -1 + j; nn = noise.fractal(P(33, f, z) * 0.2, 1.0, 2.0, 3)
            vs[i, j] = bm.verts.new(P(32.8 + 0.5 * nn, f, z))
    for i in range(72):
        if abs(-72 + 2 * i + 1) < 6: continue
        for j in range(7): bm.faces.new((vs[i, j], vs[i + 1, j], vs[i + 1, j + 1], vs[i, j + 1]))
    uv_mundo(objeto('PREV_plinto', bm, cx, rocha), 4)
    # lago (superfície: no site é Reflector/shader escuro)
    agua = bpy.data.materials.new('PREV_lago'); agua.use_nodes = True; b = agua.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.004, 0.02, 0.03, 1); b.inputs['Roughness'].default_value = 0.04
    b.inputs['Emission Color'].default_value = (*hexrgb(0x064356), 1); b.inputs['Emission Strength'].default_value = 0.35  # shader do lago do site é 'sem luz': deep/shallow + glow
    bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=128, radius=66); objeto('PREV_lago', bm, cx, agua)
    # ponte de entrada até o corredor (y=0.6)
    caixa('PREV_ponte', cx, (6.6, 16, 0.4), T(0, 0.4, 33), placa, bev=0)
    # morcego esculpido (hall.js: metal escuro + contorno azul atrás)
    pts = hub_forma.contorno(12.0)
    for nome, dy, esp, m in (('PREV_morcego', 34.6, 1.8, cor('PREV_morc', (0.10, 0.13, 0.16), rough=0.38, metal=0.95)),
                             ('PREV_morc_aro', 35.5, 0.1, cor('PREV_morc_aro', hexrgb(0x1ea8ff), emiss=1.3))):
        bm = bmesh.new(); vv = [bm.verts.new((x * (1.04 if 'aro' in nome else 1), 0, y * (1.04 if 'aro' in nome else 1))) for x, y in pts]
        f = bm.faces.new(vv); r = bmesh.ops.extrude_face_region(bm, geom=[f])
        bmesh.ops.translate(bm, vec=Vector((0, esp, 0)), verts=[v for v in r['geom'] if isinstance(v, bmesh.types.BMVert)])
        bm.normal_update(); o = objeto(nome, bm, cx, m); o.location = (0, dy - esp / 2, 30.5)
    # volume só no cone do feixe (no site: cone aditivo); as outras luzes não espalham
    vol = bpy.data.materials.new('PREV_vol'); vol.use_nodes = True; nt = vol.node_tree
    nt.nodes.remove(nt.nodes['Principled BSDF']); pv = nt.nodes.new('ShaderNodeVolumePrincipled')
    pv.inputs['Density'].default_value = 0.012; pv.inputs['Color'].default_value = (0.7, 0.85, 1.0, 1)
    nt.links.new(pv.outputs[0], nt.nodes['Material Output'].inputs['Volume'])
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=32, radius1=13, radius2=4, depth=44)
    o = objeto('PREV_volfeixe', bm, cx, vol); o.location = T(0, 25, -33)
    return cx

# ------------------------------------------------------------------ luzes no Blender (prévia) a partir do plano
def acende(L):
    col = colecao('A_LUZ')
    sc = bpy.context.scene
    w = bpy.data.worlds.new('PREV_mundo'); sc.world = w; w.use_nodes = True; nt = w.node_tree
    for l in L:
        nome = 'LUZ_' + l['id']
        if l['tipo'] == 'hemi':
            # hemisfério -> mundo em gradiente (céu em cima, chão embaixo); three: hemi I ≈ π · força do mundo
            bg = nt.nodes['Background']; tc = nt.nodes.new('ShaderNodeTexCoord'); sx = nt.nodes.new('ShaderNodeSeparateXYZ')
            mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = -1
            mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'
            mx.inputs['A'].default_value = (*hexrgb(l['cor_chao']), 1); mx.inputs['B'].default_value = (*hexrgb(l['cor']), 1)
            nt.links.new(tc.outputs['Generated'], sx.inputs[0]); nt.links.new(sx.outputs['Z'], mr.inputs['Value'])
            nt.links.new(mr.outputs[0], mx.inputs['Factor']); nt.links.new(mx.outputs['Result'], bg.inputs['Color'])
            bg.inputs['Strength'].default_value = l['three'] / math.pi
            continue
        tipo = {'point': 'POINT', 'spot': 'SPOT', 'dir': 'SUN'}[l['tipo']]
        ld = bpy.data.lights.new(nome, tipo); o = bpy.data.objects.new(nome, ld); col.objects.link(o)
        ld.color = hexrgb(l['cor']); ld.use_shadow = l['sombra']
        try: ld.use_soft_falloff = False
        except Exception: pass
        o.location = T(*l['pos'])
        if tipo == 'SUN':
            ld.energy = l['three']; ld.angle = 0.02
        else:
            ld.energy = l['three'] * 4 * math.pi; ld.shadow_soft_size = 0.15   # three cd = W/(4π) (modo COMPAT do glTF)
            ld.use_custom_distance = True; ld.cutoff_distance = l['alcance']
        if tipo == 'SPOT':
            ld.spot_size = 2 * l['angulo']; ld.spot_blend = l['penumbra']
        ld.volume_factor = 1.0 if l['id'] in ('feixe_cachoeira',) else 0.0
        if 'alvo' in l:
            o.rotation_euler = (T(*l['alvo']) - T(*l['pos'])).to_track_quat('-Z', 'Y').to_euler()
    return col

# ------------------------------------------------------------------ emissivos: inventário e ajuste de prévia
def emissivos():
    rel = {}
    for m in bpy.data.materials:
        if not m.use_nodes or m.name.startswith('PREV_'): continue
        b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if not b: continue
        s = b.inputs['Emission Strength'].default_value; ci = b.inputs['Emission Color']
        cval = tuple(ci.default_value)[:3]; tex = ci.is_linked
        if s <= 0 or (not tex and max(cval) < 0.01): continue
        k = next((v for kk, v in EMISS_K.items() if m.name == kk or m.name.startswith(kk + '.')), 1.0)
        if k != 1.0: b.inputs['Emission Strength'].default_value = s * k
        users = sorted({o.users_collection[0].name for o in bpy.data.objects if o.type == 'MESH' and any(sl.material == m for sl in o.material_slots)})
        rel[m.name] = dict(forca=round(s, 2), cor=[round(x, 3) for x in cval], textura=tex, k=k, onde=users)
    return rel

# ------------------------------------------------------------------ render
def render_setup(res):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.eevee.taa_render_samples = 48
    sc.eevee.use_raytracing = True
    sc.eevee.use_shadows = True
    sc.eevee.volumetric_end = 140; sc.eevee.volumetric_tile_size = '8'; sc.eevee.volumetric_samples = 64
    try: sc.eevee.use_fast_gi = True
    except Exception: pass
    for vt, lk in (('AgX', 'AgX - Punchy'), ('AgX', None)):
        try:
            sc.view_settings.view_transform = vt
            if lk: sc.view_settings.look = lk
            break
        except Exception: continue
    sc.view_settings.exposure = 0.9   # ~ ACES do site (three ACES pré-escala 1/0.6, exposure 1.05)
    sc.render.resolution_x, sc.render.resolution_y = res
    # bloom do site (UnrealBloom 0.85, raio 0.55, limiar 0.82) ~ Glare Bloom no compositor
    ng = bpy.data.node_groups.new('PREV_comp', 'CompositorNodeTree')
    ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    rl = ng.nodes.new('CompositorNodeRLayers'); gl = ng.nodes.new('CompositorNodeGlare'); out = ng.nodes.new('NodeGroupOutput')
    for k, v in (('Type', 'Bloom'), ('Quality', 'High'), ('Threshold', 0.82), ('Strength', 0.55), ('Size', 0.6)):
        try: gl.inputs[k].default_value = v
        except Exception as e: say('glare', k, e)
    ng.links.new(rl.outputs['Image'], gl.inputs['Image']); ng.links.new(gl.outputs['Image'], out.inputs[0])
    sc.compositing_node_group = ng; sc.render.use_compositing = True

VISTAS = {
    'entrada': dict(cam=(0, -26, 9), alvo=(0, 30, 12), lente=15),          # arte 1930e6a9 (do píer)
    'entrada_longe': dict(cam=(0, -45, 6.5), alvo=(0, 10, 17), lente=14),
    'frontal': dict(cam=(0, -6, 5.5), alvo=(0, 36, 19), lente=15),         # arte a7206da7
    'diagonal': dict(cam=(23, -24, 8.5), alvo=(-8, 24, 12), lente=14),     # arte 8190e08c
    'garagem': dict(cam=(-12, -20, 8), alvo=(-2, 30, 13), lente=13),       # arte 617fc1a3
    'portais': dict(cam=(0, 2, 11), alvo=(0, 37, 12), lente=14),
    'f0506': dict(cam=(14.5, 21.5, 18.5), alvo=(28, 30, 17.5), lente=18),
    'f1112': dict(cam=(14.5, 21.5, 10.5), alvo=(28, 30, 9.5), lente=18),
    'f0102': dict(cam=(-14.5, 21.5, 18.5), alvo=(-28, 30, 17.5), lente=18),
    'garagem_perto': dict(cam=(-12, -4, 5), alvo=(-26, -5, 2), lente=20),
}

def main(args):
    C.limpa()
    vistas = ['entrada', 'frontal', 'diagonal', 'garagem']; res = (1600, 900)
    for a in args:
        if a.startswith('vistas='): vistas = a.split('=')[1].split(',')
        if a.startswith('res='): res = tuple(int(x) for x in a.split('=')[1].split('x'))
    L = plano()
    assert len(L) <= 28, len(L)
    say('luzes', len(L))
    importa_tudo()
    contexto()
    acende(L)
    rel = emissivos()
    say('EMISSIVOS', json.dumps(rel, ensure_ascii=False))
    if 'json' in args: grava_json(L)
    render_setup(res)
    for v in [v for v in vistas if v in VISTAS]:
        previa('luz_' + v, res=res, luz=False, **VISTAS[v])
    if 'blend' in args:
        for o in list(bpy.data.objects):
            if o.name.startswith('LUZ_'): continue
            bpy.data.objects.remove(o)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(CENAS, 'luz_cena.blend'), copy=True)

def grava_json(L):
    mx = {t: max(l['three'] for l in L if l['tipo'] == t) for t in ('point', 'spot', 'dir', 'hemi')}
    out = []
    for l in L:
        d = dict(id=l['id'], tipo=l['tipo'], cor='#%06x' % l['cor'], intensidade=round(l['three'] / mx[l['tipo']], 3),
                 intensidade_three=l['three'], sombra=l['sombra'], papel=l['papel'])
        if l['tipo'] == 'hemi': d['cor_chao'] = '#%06x' % l['cor_chao']
        if 'pos' in l: d['pos'] = [round(x, 3) for x in l['pos']]
        if 'alvo' in l: d['alvo'] = [round(x, 3) for x in l['alvo']]
        if l['tipo'] in ('point', 'spot'): d['alcance'] = l['alcance']; d['decay'] = 2
        if l['tipo'] == 'spot': d['angulo'] = l['angulo']; d['penumbra'] = l['penumbra']
        out.append(d)
    doc = dict(
        versao=1, referencial='three.js mundo (y para cima, origem no centro da plataforma, água em y=0)',
        unidades='point/spot: candela (physically correct, decay 2, distance = alcance); dir: lux (intensity); hemi: intensity',
        render_site='ACESFilmic exposure 1.05 + UnrealBloom(0.85, 0.55, 0.82): conferido em EEVEE com AgX Punchy +0.6 EV e Glare Bloom',
        intensidade='relativa 0–1 = intensidade_three / maior do mesmo tipo',
        luzes=out,
        emissivos=[dict(material=a, fator=k, motivo=m) for a, k, m in EMISS_REC])
    p = os.path.join(MODELOS, 'luzes.json')
    with open(p, 'w', encoding='utf-8') as f: json.dump(doc, f, ensure_ascii=False, indent=1)
    say('json', p, len(out))

rodar(main)
