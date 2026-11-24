# Área HUB: plataforma central (deque, guarda-corpo, escadaria frontal e píer) + Batcomputador (tela curva, consoles, cadeiras).
# Referencial MUNDO (Blender Z para cima; three (x, y, z) = Blender (x, -z, y)). φ a partir de +Y (Blender), positivo para +X.
# Saída: cenas/area_hub.blend, public/models/area_hub.glb (coleção A_HUB), prévias em oficina/previas/hub_*.png
import sys, os, math
sys.path.insert(0, r'C:\Users\Gabriel Caetano\Downloads\Claud Code\batcaverna\tools\blender\oficina')
from kit import *
AQUI = os.path.join(HERE, 'hub'); sys.path.insert(0, AQUI)
from hub_forma import contorno
TELAS = os.path.join(AQUI, 'telas')

RAD = math.radians
TOP = 1.5            # topo do deque (three y)
RD = 12.0            # raio do deque
RR = 11.72           # raio do guarda-corpo
ABERTURAS = [(-96, -84), (-47, -39), (39, 47), (166, 194)]   # garagem, escadas laterais, escadaria frontal
COMP = (-39, 39)     # setor fechado pelo batcomputador (sem guarda-corpo)
PIER_Z = 0.6         # nível do píer
PIER_FIM = -25.0     # ponta do píer (Blender y)

def P(r, f, z=0.0):
    return Vector((r * math.sin(RAD(f)), r * math.cos(RAD(f)), z))

# ---------------- materiais ----------------
def fosco(m, rough):
    """Tira o mapa de rugosidade e usa valor fixo (piso molhado/polido como na arte)."""
    b = m.node_tree.nodes['Principled BSDF']
    for l in list(b.inputs['Roughness'].links): m.node_tree.links.remove(l)
    b.inputs['Roughness'].default_value = rough; return m

def tela_mat(nome, png, forca=2.2):
    m = bpy.data.materials.get(nome)
    if m: return m
    m = bpy.data.materials.new(nome); m.use_nodes = True; n = m.node_tree.nodes; b = n['Principled BSDF']
    t = n.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(os.path.join(TELAS, png), check_existing=True)
    b.inputs['Base Color'].default_value = (0.0, 0.0, 0.0, 1); b.inputs['Roughness'].default_value = 0.25
    m.node_tree.links.new(t.outputs['Color'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = forca
    return m

def vidro(nome, rgb=(0.25, 0.5, 0.7), alfa=0.12):
    m = cor(nome, rgb, rough=0.05, metal=0.0)
    b = m.node_tree.nodes['Principled BSDF']; b.inputs['Alpha'].default_value = alfa
    for attr, val in (('surface_render_method', 'BLENDED'), ('blend_method', 'BLEND')):
        try: setattr(m, attr, val)
        except Exception: pass
    m.use_backface_culling = False
    return m

# ---------------- geometria ----------------
def _bevel(bm, off, segs=2, ang=0.5):
    es = [e for e in bm.edges if len(e.link_faces) == 2 and e.calc_face_angle(0) > ang]
    if es and off > 0: bmesh.ops.bevel(bm, geom=es, offset=off, segments=segs, affect='EDGES', profile=0.5, clamp_overlap=True)

def setor(nome, col, r0, r1, a0, a1, z0, z1, mat, passo=2.0, bev=0.0, tam=2.0, cx=0.0, cy=0.0):
    """Sólido em setor de anel (r0..r1, a0..a1 graus, z0..z1)."""
    n = max(1, int(math.ceil(abs(a1 - a0) / passo)))
    bm = bmesh.new(); an = []
    for i in range(n + 1):
        a = RAD(a0 + (a1 - a0) * i / n); s, c = math.sin(a), math.cos(a)
        an.append([bm.verts.new((cx + r * s, cy + r * c, z)) for r, z in ((r0, z0), (r1, z0), (r1, z1), (r0, z1))])
    for i in range(n):
        A, B = an[i], an[i + 1]
        for k in range(4): bm.faces.new((A[k], A[(k + 1) % 4], B[(k + 1) % 4], B[k]))
    bm.faces.new(an[0][::-1]); bm.faces.new(an[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); _bevel(bm, bev)
    o = objeto(nome, bm, col, mat); uv_mundo(o, tam); return o

def cilindro(nome, col, r, z0, z1, mat, lados=64, r_topo=None, bev=0.0, tam=2.0, loc=(0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=lados, radius1=r, radius2=r if r_topo is None else r_topo, depth=z1 - z0)
    bmesh.ops.translate(bm, vec=Vector((loc[0], loc[1], (z0 + z1) / 2)), verts=bm.verts)
    _bevel(bm, bev)
    o = objeto(nome, bm, col, mat); uv_mundo(o, tam); return o

def tubo_pts(nome, col, pts, raio, mat, lados=8, tam=1.0, fecha_ponta=True):
    """Tubo varrido por uma polilinha de pontos 3D (corrimão)."""
    bm = bmesh.new(); aneis = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        up = Vector((0, 0, 1)) if abs(t.z) < 0.95 else Vector((1, 0, 0))
        nx = t.cross(up).normalized(); ny = nx.cross(t).normalized()
        aneis.append([bm.verts.new(p + raio * (math.cos(k / lados * math.tau) * nx + math.sin(k / lados * math.tau) * ny)) for k in range(lados)])
    for i in range(len(aneis) - 1):
        A, B = aneis[i], aneis[i + 1]
        for k in range(lados): bm.faces.new((A[k], A[(k + 1) % lados], B[(k + 1) % lados], B[k]))
    if fecha_ponta: bm.faces.new(aneis[0][::-1]); bm.faces.new(aneis[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = objeto(nome, bm, col, mat); uv_mundo(o, tam); return o

def arco_pts(r, a0, a1, z, passo=2.0):
    n = max(1, int(math.ceil(abs(a1 - a0) / passo)))
    return [P(r, a0 + (a1 - a0) * i / n, z) for i in range(n + 1)]

def faixa_curva(nome, col, r, a0, a1, z0, z1, mat, passo=1.0, dentro=True, uv01=False, tam=2.0):
    """Superfície curva (sem espessura) virada para o centro; com uv01 a UV cobre 0–1 (u da esquerda p/ direita de quem olha do centro)."""
    n = max(1, int(math.ceil(abs(a1 - a0) / passo)))
    bm = bmesh.new(); uv = bm.loops.layers.uv.verify(); col_v = []
    for i in range(n + 1):
        f = a0 + (a1 - a0) * i / n; col_v.append((bm.verts.new(P(r, f, z0)), bm.verts.new(P(r, f, z1)), i / n))
    for i in range(n):
        (a, b, u0), (c, d, u1) = col_v[i], col_v[i + 1]
        face = bm.faces.new((a, c, d, b) if dentro else (a, b, d, c))
        for lp in face.loops:
            vv = 0.0 if lp.vert in (a, c) else 1.0; uu = u0 if lp.vert in (a, b) else u1
            lp[uv].uv = (uu, vv)
    o = objeto(nome, bm, col, mat)
    if not uv01: uv_mundo(o, tam)
    return o

def placa(nome, col, w, h, mat, centro, yaw, tilt=0.0, uv01=True):
    """Retângulo w×h (UV 0–1) com a frente virada para a direção yaw (rad, a partir de -Y), inclinado tilt para trás."""
    bm = bmesh.new(); uv = bm.loops.layers.uv.verify()
    vs = [bm.verts.new((x, 0, z)) for x, z in ((-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2))]
    f = bm.faces.new(vs)
    for lp, (u, v) in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))): lp[uv].uv = (u, v)
    o = objeto(nome, bm, col, mat); o.location = centro; o.rotation_euler = Euler((tilt, 0, yaw), 'XYZ')
    return o

def bloco(nome, col, dims, centro, yaw, mat, bev=0.02, tilt=0.0, tam=1.5, deslocar=(0, 0, 0)):
    """Caixa com bevel orientada por yaw (rotação Z) — usa caixa do kit e aplica rotação."""
    o = caixa(nome, col, dims, (0, 0, 0), mat, bev=bev, tam=tam)
    o.data.transform(Matrix.Translation(Vector(deslocar)))
    o.location = centro; o.rotation_euler = Euler((tilt, 0, yaw), 'XYZ'); bpy.context.view_layer.update(); uv_mundo(o, tam)
    return o

def poligono_extrudado(nome, col, pts2, z0, z1, mat, uv01=False, bbox=None):
    bm = bmesh.new(); uv = bm.loops.layers.uv.verify()
    base = [bm.verts.new((x, y, z0)) for x, y in pts2]
    f = bm.faces.new(base)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f]); nv = [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=Vector((0, 0, z1 - z0)), verts=nv)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if uv01:
        x0, x1, y0, y1 = bbox
        for fc in bm.faces:
            for lp in fc.loops: lp[uv].uv = ((lp.vert.co.x - x0) / (x1 - x0), (lp.vert.co.y - y0) / (y1 - y0))
    o = objeto(nome, bm, col, mat)
    if not uv01: uv_mundo(o, 1.0)
    return o

def juntar(objs, nome):
    """Une várias peças com o mesmo papel num objeto só (menos draw calls no site)."""
    objs = [o for o in objs if o]
    if len(objs) == 1: objs[0].name = nome; return objs[0]
    for o in bpy.context.selected_objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join(); o = bpy.context.active_object; o.name = nome; return o

# ---------------- peças ----------------
def lanterna_poste(col, nome, x, y, z, M):
    """Poste de pedra-metal com lanterna quadrada acesa (como nas pontas da escadaria e do píer da arte)."""
    ps = []
    ps.append(bloco(nome + '_base', col, (0.62, 0.62, 0.22), (x, y, z + 0.11), 0, M['estr'], bev=0.03))
    ps.append(bloco(nome + '_fuste', col, (0.42, 0.42, 0.55), (x, y, z + 0.495), 0, M['estr'], bev=0.03))
    ps.append(bloco(nome + '_capitel', col, (0.6, 0.6, 0.1), (x, y, z + 0.82), 0, M['aco'], bev=0.02))
    # lanterna: base, 4 montantes, cúpula em pirâmide, núcleo aceso
    ps.append(bloco(nome + '_lbase', col, (0.40, 0.40, 0.06), (x, y, z + 0.9), 0, M['preto'], bev=0.01))
    for sx in (-1, 1):
        for sy in (-1, 1):
            ps.append(bloco(nome + f'_m{sx}{sy}', col, (0.045, 0.045, 0.42), (x + sx * 0.17, y + sy * 0.17, z + 1.14), 0, M['preto'], bev=0.005))
    ps.append(bloco(nome + '_ltopo', col, (0.44, 0.44, 0.05), (x, y, z + 1.37), 0, M['preto'], bev=0.01))
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=4, radius1=0.3, radius2=0.04, depth=0.2)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(RAD(45), 3, 'Z'))
    c = objeto(nome + '_cupula', bm, col, M['preto']); c.location = (x, y, z + 1.49); ps.append(c)
    ps.append(bloco(nome + '_aneltopo', col, (0.08, 0.08, 0.08), (x, y, z + 1.62), 0, M['preto'], bev=0.01))
    luz = bloco(nome + '_chama', col, (0.29, 0.29, 0.36), (x, y, z + 1.14), 0, M['lampiao'], bev=0.02)
    return juntar(ps, nome), luz

def guarda_corpo_arco(col, nome, a0, a1, M, partes):
    """Guarda-corpo do deque entre a0..a1: montantes, vidro, corrimão de aço, LED ciano na base e sob o corrimão."""
    zc = TOP + 1.1
    partes['corr'].append(tubo_pts(nome + '_corrimao', col, arco_pts(RR, a0, a1, zc, 1.5), 0.045, M['aco']))
    partes['corr'].append(tubo_pts(nome + '_meio', col, arco_pts(RR + 0.02, a0, a1, TOP + 0.55, 1.5), 0.022, M['aco']))
    partes['vidro'].append(faixa_curva(nome + '_vidro', col, RR - 0.03, a0, a1, TOP + 0.12, TOP + 1.02, M['vidro'], passo=1.5))
    partes['led'].append(setor(nome + '_ledbase', col, RR - 0.06, RR + 0.06, a0, a1, TOP + 0.02, TOP + 0.06, M['led'], passo=1.5))
    n = max(1, int(round((a1 - a0) / 6.0)))
    for i in range(n + 1):
        f = a0 + (a1 - a0) * i / n; p = P(RR, f, TOP)
        partes['mont'].append(bloco(f'{nome}_mont{i}', col, (0.08, 0.1, 1.1), (p.x, p.y, TOP + 0.55), -RAD(f), M['aco_esc'], bev=0.012))
        partes['mont'].append(bloco(f'{nome}_sapata{i}', col, (0.16, 0.2, 0.05), (p.x, p.y, TOP + 0.025), -RAD(f), M['aco_esc'], bev=0.01))

def guarda_corpo_reto(col, nome, p0, p1, M, partes, alt=1.1, espaco=1.6):
    """Guarda-corpo reto (escadaria/píer) entre p0 e p1 (Vector com z do piso em cada ponta)."""
    d = p1 - p0; L = d.length; yaw = math.atan2(-d.x, d.y)
    up = Vector((0, 0, alt))
    partes['corr'].append(tubo_pts(nome + '_corrimao', col, [p0 + up, p1 + up], 0.045, M['aco']))
    partes['corr'].append(tubo_pts(nome + '_meio', col, [p0 + up * 0.5, p1 + up * 0.5], 0.022, M['aco']))
    bm = bmesh.new(); uv = bm.loops.layers.uv.verify()
    a, b = p0 + Vector((0, 0, 0.12)), p1 + Vector((0, 0, 0.12)); c, e = p1 + up * 0.93, p0 + up * 0.93
    bm.faces.new([bm.verts.new(v) for v in (a, b, c, e)])
    partes['vidro'].append(objeto(nome + '_vidro', bm, col, M['vidro']))
    partes['led'].append(tubo_pts(nome + '_led', col, [p0 + Vector((0, 0, 0.04)), p1 + Vector((0, 0, 0.04))], 0.025, M['led'], lados=6))
    partes['led'].append(tubo_pts(nome + '_ledmeio', col, [p0 + up * 0.5 + Vector((0, 0, 0.05)), p1 + up * 0.5 + Vector((0, 0, 0.05))], 0.016, M['led'], lados=6))
    n = max(1, int(round(L / espaco)))
    for i in range(n + 1):
        p = p0 + d * (i / n)
        partes['mont'].append(bloco(f'{nome}_mont{i}', col, (0.1, 0.08, alt), (p.x, p.y, p.z + alt / 2), yaw, M['aco_esc'], bev=0.012))

def cadeira(col, nome, p, yaw, M):
    """Cadeira preta de couro (encosto alto, apoio de cabeça) com o morcego prateado nas costas. Frente para yaw."""
    ps = []
    def lp(x, y, z):  # local -> mundo (frente da cadeira = -Y local)
        v = Matrix.Rotation(yaw, 3, 'Z') @ Vector((x, y, z)); return p + v
    # base em estrela
    for k in range(5):
        a = k / 5 * math.tau; tip = Vector((math.cos(a) * 0.34, math.sin(a) * 0.34, 0.08))
        ps.append(tubo_pts(f'{nome}_pe{k}', col, [lp(0, 0, 0.11), lp(tip.x, tip.y, tip.z)], 0.028, M['preto'], lados=6))
        ps.append(cilindro(f'{nome}_rod{k}', col, 0.035, p.z, p.z + 0.07, M['preto'], lados=8, loc=lp(tip.x, tip.y, 0).xy))
    ps.append(cilindro(f'{nome}_coluna', col, 0.035, p.z + 0.1, p.z + 0.48, M['aco'], lados=10, loc=p.xy))
    ps.append(bloco(f'{nome}_assento', col, (0.56, 0.54, 0.12), lp(0, 0, 0.53), yaw, M['couro'], bev=0.04))
    ps.append(bloco(f'{nome}_almof', col, (0.48, 0.48, 0.05), lp(0, -0.01, 0.6), yaw, M['couro'], bev=0.02))
    enc = bloco(f'{nome}_encosto', col, (0.54, 0.11, 0.78), lp(0, 0.29, 0.98), yaw, M['couro'], bev=0.045, tilt=RAD(-10))
    ps.append(enc)
    ps.append(bloco(f'{nome}_lombar', col, (0.40, 0.05, 0.5), lp(0, 0.24, 0.92), yaw, M['couro'], bev=0.02, tilt=RAD(-10)))
    for s in (-1, 1):  # abas laterais do encosto (cadeira tipo concha, como na arte)
        ps.append(bloco(f'{nome}_aba{s}', col, (0.09, 0.16, 0.72), lp(s * 0.28, 0.26, 1.0), yaw - s * RAD(18), M['couro'], bev=0.035, tilt=RAD(-10)))
    ps.append(bloco(f'{nome}_cabeca', col, (0.34, 0.1, 0.2), lp(0, 0.35, 1.46), yaw, M['couro'], bev=0.04, tilt=RAD(-10)))
    for s in (-1, 1):
        ps.append(bloco(f'{nome}_braco{s}', col, (0.06, 0.38, 0.05), lp(s * 0.31, 0.02, 0.8), yaw, M['preto'], bev=0.015))
        ps.append(bloco(f'{nome}_bracop{s}', col, (0.05, 0.05, 0.22), lp(s * 0.31, 0.12, 0.68), yaw, M['aco_esc'], bev=0.01))
    out = juntar(ps, nome)
    # morcego prateado nas costas do encosto
    pts = [(x * 0.2, y * 0.2) for x, y in contorno()]
    em = poligono_extrudado(nome + '_morcego', col, pts, 0.0, 0.012, M['prata'])
    em.rotation_euler = (Matrix.Rotation(yaw, 4, 'Z') @ Matrix.Rotation(RAD(-10), 4, 'X') @ Matrix.Rotation(RAD(90), 4, 'X')).to_euler()
    em.location = lp(0, 0.372, 1.08)
    return out, em

def monitor(col, nome, centro, yaw, w, h, tela_m, M, tilt=RAD(8), pe=0.0):
    """Monitor: moldura com bevel, tela TELA_ (UV 0–1) e pé. A frente olha para yaw."""
    R3 = Matrix.Rotation(yaw, 3, 'Z')
    ps = [bloco(nome + '_moldura', col, (w + 0.08, 0.06, h + 0.08), centro, yaw, M['preto'], bev=0.015, tilt=tilt)]
    ps.append(bloco(nome + '_costas', col, (w * 0.6, 0.06, h * 0.5), centro + R3 @ Vector((0, 0.06, 0)), yaw, M['estr'], bev=0.02, tilt=tilt))
    if pe > 0:
        ps.append(bloco(nome + '_pe', col, (0.07, 0.07, pe), centro + R3 @ Vector((0, 0.08, -h / 2 - pe / 2 + 0.05)), yaw, M['aco_esc'], bev=0.01))
    off = R3 @ Vector((0, -0.032, 0))
    t = placa('TELA_' + nome, col, w, h, tela_m, centro + off, yaw, tilt=tilt)
    return juntar(ps, nome + '_corpo'), t

def mesa_curva(col, nome, r0, r1, a0, a1, M, partes):
    """Mesa de console em arco: corpo, tampo inclinado, frisos de LED e teclados acesos."""
    partes['mesa'].append(setor(nome + '_corpo', col, r0 + 0.08, r1, a0, a1, TOP, TOP + 0.86, M['estr'], passo=2, bev=0.03, tam=1.2))
    partes['mesa'].append(setor(nome + '_rodape', col, r0 + 0.14, r1 - 0.05, a0 + 0.3, a1 - 0.3, TOP, TOP + 0.08, M['preto'], passo=2))
    partes['mesa'].append(setor(nome + '_tampo', col, r0 - 0.06, r1 + 0.04, a0 - 0.3, a1 + 0.3, TOP + 0.86, TOP + 0.93, M['aco_esc'], passo=2, bev=0.02))
    partes['led'].append(setor(nome + '_friso', col, r0 + 0.04, r0 + 0.07, a0, a1, TOP + 0.72, TOP + 0.76, M['led'], passo=2))
    partes['led'].append(setor(nome + '_frisob', col, r0 + 0.1, r0 + 0.13, a0 + 0.5, a1 - 0.5, TOP + 0.1, TOP + 0.13, M['led2'], passo=2))
    # painéis frontais com recortes acesos (como os consoles da arte)
    n = max(1, int((a1 - a0) / 4.5))
    for i in range(n):
        f = a0 + (a1 - a0) * (i + 0.5) / n
        p = P(r0 + 0.07, f, TOP + 0.42)
        partes['led'].append(bloco(f'{nome}_fenda{i}', col, (0.05, 0.02, 0.4), p, -RAD(f), M['led2'], bev=0.0))
        # teclado aceso sobre o tampo
        k = P(r0 + 0.32, f, TOP + 0.935)
        partes['teclado'].append(placa(f'{nome}_tecl{i}', col, 0.62, 0.24, M['teclado'], k, -RAD(f) + math.pi, tilt=RAD(-90)))

def main(args):
    C.limpa()
    col = colecao('A_HUB')
    M = {
        'piso': fosco(material('HUB_piso', 'blue_metal_plate', tint=(0.50, 0.56, 0.64), metal=0.8), 0.3),
        'estr': material('HUB_estrutura', 'metal_plate_02', tint=(0.30, 0.32, 0.36), metal=0.8),
        'degrau': material('HUB_degrau', 'metal_plate', tint=(0.32, 0.35, 0.40), metal=0.85),
        'pier': fosco(material('HUB_pier', 'rubber_tiles', tint=(0.62, 0.68, 0.78), metal=0.3), 0.22),
        'grade': material('HUB_grade', 'metal_grate_rusty', tint=(0.28, 0.30, 0.34), metal=0.9),
        'couro': material('HUB_couro', 'fabric_leather_02', tint=(0.06, 0.06, 0.07)),
        'aco': cor('HUB_aco', (0.62, 0.66, 0.72), rough=0.22, metal=1.0),
        'aco_esc': cor('HUB_aco_escuro', (0.10, 0.11, 0.13), rough=0.35, metal=0.9),
        'preto': cor('HUB_preto', (0.015, 0.016, 0.02), rough=0.4, metal=0.3),
        'prata': cor('HUB_prata', (0.62, 0.68, 0.75), rough=0.3, metal=0.6, emiss=0.35),
        'led': cor('HUB_led_ciano', (0.10, 0.78, 1.0), rough=0.3, emiss=3.5),
        'led2': cor('HUB_led_azul', (0.05, 0.42, 1.0), rough=0.3, emiss=2.5),
        'lampiao': cor('HUB_lampiao', (1.0, 0.72, 0.38), rough=0.4, emiss=5.0),
        'vidro': vidro('HUB_vidro'),
        'teclado': tela_mat('HUB_teclado', 'teclado.png', 1.2),
    }
    partes = {k: [] for k in ('corr', 'vidro', 'led', 'mont', 'mesa', 'teclado', 'deque', 'saia', 'tela_estr', 'escada', 'pier', 'lant')}

    # ======== DEQUE ========
    partes['deque'].append(cilindro('HUB_laje', col, RD - 0.15, TOP - 0.55, TOP - 0.03, M['estr'], lados=96))
    # disco holográfico sob o morcego (TELA_piso_emblema, UV 0–1) + morcego (TELA_emblema, UV 0–1 no retângulo do contorno)
    bm = bmesh.new(); uv = bm.loops.layers.uv.verify(); R_EM = 7.0
    ret = bmesh.ops.create_circle(bm, cap_ends=True, segments=96, radius=R_EM)
    for f in bm.faces:
        for lp in f.loops: lp[uv].uv = (lp.vert.co.x / (2 * R_EM) + 0.5, lp.vert.co.y / (2 * R_EM) + 0.5)
    disco = objeto('TELA_piso_emblema', bm, col, tela_mat('HUB_tela_piso', 'piso.png', 0.9)); disco.location.z = TOP + 0.005
    S = 6.3; pts = [(x * S, y * S) for x, y in contorno()]
    ys = [p[1] for p in pts]
    poligono_extrudado('TELA_emblema', col, pts, TOP + 0.006, TOP + 0.03, tela_mat('HUB_tela_emblema', 'emblema.png', 1.3), uv01=True, bbox=(-S, S, min(ys), max(ys)))
    # aro de metal em volta do disco, anel aceso e placas segmentadas com juntas (bevel), faixa de borda
    partes['deque'].append(setor('HUB_aro', col, R_EM, R_EM + 0.22, 0, 359.99, TOP - 0.05, TOP + 0.03, M['aco_esc'], passo=3, bev=0.015))
    partes['led'].append(setor('HUB_anel_led', col, R_EM + 0.22, R_EM + 0.34, 0, 359.99, TOP - 0.05, TOP + 0.01, M['led'], passo=3))
    for i in range(24):
        a0 = i * 15 + 0.12; a1 = (i + 1) * 15 - 0.12
        partes['deque'].append(setor(f'HUB_placa_a{i}', col, R_EM + 0.38, 9.25, a0, a1, TOP - 0.1, TOP, M['piso'], passo=3, bev=0.018, tam=3))
        partes['deque'].append(setor(f'HUB_placa_b{i}', col, 9.31, 10.55, a0, a1, TOP - 0.1, TOP, M['piso'], passo=3, bev=0.018, tam=3))
    partes['led'].append(setor('HUB_anel_led2', col, 10.58, 10.66, 0, 359.99, TOP - 0.05, TOP - 0.005, M['led2'], passo=3))
    for i in range(48):
        a0 = i * 7.5 + 0.1; a1 = (i + 1) * 7.5 - 0.1
        partes['deque'].append(setor(f'HUB_placa_c{i}', col, 10.69, RD - 0.12, a0, a1, TOP - 0.1, TOP, M['piso'], passo=2.5, bev=0.015, tam=3))
    # borda (testeira) de aço e saia até a água, com frisos de LED tracejados (como na arte)
    partes['deque'].append(setor('HUB_testeira', col, RD - 0.14, RD + 0.06, 0, 359.99, TOP - 0.32, TOP + 0.02, M['aco_esc'], passo=2, bev=0.02))
    partes['saia'].append(cilindro('HUB_saia', col, RD - 0.1, -1.0, TOP - 0.32, M['estr'], lados=96, r_topo=RD - 0.1, tam=2.5))
    partes['saia'].append(cilindro('HUB_saia_base', col, RD + 0.15, -1.0, 0.25, M['estr'], lados=96, r_topo=RD - 0.05, tam=2.5))
    for i in range(36):
        f = i * 10 + 2
        if 166 <= (f % 360) <= 194: continue
        partes['led'].append(setor(f'HUB_saia_led{i}', col, RD - 0.12, RD - 0.06, f, f + 6, TOP - 0.62, TOP - 0.56, M['led'], passo=2))
    # pilares de sustentação na água
    for i in range(12):
        p = P(RD * 0.72, i * 30 + 15)
        partes['saia'].append(cilindro(f'HUB_pilar{i}', col, 0.55, -1.5, TOP - 0.55, M['estr'], lados=16, r_topo=0.45, loc=p.xy))

    # ======== GUARDA-CORPO (aberturas: garagem -96..-84, escadas ±39..47, escadaria frontal 166..194; atrás o batcomputador) ========
    trechos = [(-166, -96), (-84, -47), (47, 166)]
    for k, (a0, a1) in enumerate(trechos): guarda_corpo_arco(col, f'HUB_gc{k}', a0, a1, M, partes)
    # cabeceiras das aberturas laterais (postes um pouco mais grossos)
    for f in (-96, -84, -47, -39, 39, 47):
        p = P(RR, f)
        partes['mont'].append(bloco(f'HUB_cab{f}', col, (0.2, 0.22, 1.2), (p.x, p.y, TOP + 0.6), -RAD(f), M['estr'], bev=0.03))
        partes['led'].append(bloco(f'HUB_cabled{f}', col, (0.04, 0.24, 0.9), (p.x, p.y, TOP + 0.62), -RAD(f), M['led'], bev=0.0))

    # ======== ESCADARIA FRONTAL e PÍER (φ=180, Blender -Y) ========
    LARG = 5.6; N = 6; ESP = (TOP - PIER_Z) / N; PISO = 0.44
    y0 = -(RD - 0.35)
    partes['escada'].append(bloco('HUB_patamar', col, (LARG, 0.9, 0.5), (0, y0 - 0.0, TOP - 0.25), 0, M['piso'], bev=0.02, tam=3))
    for i in range(N):
        zt = TOP - (i + 1) * ESP; yc = y0 - 0.45 - (i + 0.5) * PISO
        partes['escada'].append(bloco(f'HUB_degrau{i}', col, (LARG, PISO + 0.02, zt + 0.6), (0, yc, (zt - 0.6) / 2), 0, M['degrau'], bev=0.02, tam=1.2))
        partes['led'].append(bloco(f'HUB_degrau_led{i}', col, (LARG - 0.3, 0.05, 0.04), (0, yc - PISO / 2 - 0.015, zt - 0.05), 0, M['led'], bev=0.0))
    y_fim_esc = y0 - 0.45 - N * PISO
    # muretas laterais (cheeks) em rampa, com LED ciano
    for s in (-1, 1):
        x = s * (LARG / 2 + 0.22)
        bm = bmesh.new()
        prof = [(y0 + 0.45, TOP + 0.25), (y0 - 0.45, TOP + 0.25), (y_fim_esc, PIER_Z + 0.25), (y_fim_esc - 0.3, PIER_Z + 0.25), (y_fim_esc - 0.3, -0.6), (y0 + 0.45, -0.6)]
        vs = [bm.verts.new((x - 0.22, y, z)) for y, z in prof]; f = bm.faces.new(vs)
        ext = bmesh.ops.extrude_face_region(bm, geom=[f]); nv = [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]
        bmesh.ops.translate(bm, vec=Vector((0.44, 0, 0)), verts=nv); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); _bevel(bm, 0.03)
        o = objeto(f'HUB_mureta{s}', bm, col, M['estr']); uv_mundo(o, 1.5); partes['escada'].append(o)
        partes['led'].append(tubo_pts(f'HUB_mureta_led{s}', col, [Vector((x - s * 0.225, y0 - 0.45, TOP + 0.05)), Vector((x - s * 0.225, y_fim_esc, PIER_Z + 0.05))], 0.025, M['led'], lados=6))
        guarda_corpo_reto(col, f'HUB_gcesc{s}', Vector((x, y0 - 0.45, TOP + 0.25)), Vector((x, y_fim_esc, PIER_Z + 0.25)), M, partes, alt=0.95, espaco=1.0)
    # píer: laje com piso escuro, calhas de grade dos dois lados, muretas, guarda-corpo, postes de lanterna e pilares na água
    PL = 6.6; yp0 = y_fim_esc + 0.02
    comp = yp0 - PIER_FIM; ym = (yp0 + PIER_FIM) / 2
    partes['pier'].append(bloco('HUB_pier_laje', col, (PL + 1.0, comp, 0.6), (0, ym, PIER_Z - 0.32), 0, M['estr'], bev=0.03, tam=2.5))
    partes['pier'].append(bloco('HUB_pier_piso', col, (PL - 1.3, comp, 0.06), (0, ym, PIER_Z - 0.02), 0, M['pier'], bev=0.01, tam=1.6))
    for s in (-1, 1):
        partes['pier'].append(bloco(f'HUB_pier_calha{s}', col, (0.5, comp, 0.04), (s * (PL / 2 - 0.4), ym, PIER_Z - 0.03), 0, M['grade'], bev=0.0, tam=0.5))
        partes['pier'].append(bloco(f'HUB_pier_meio_fio{s}', col, (0.36, comp, 0.22), (s * (PL / 2 + 0.2), ym, PIER_Z + 0.08), 0, M['estr'], bev=0.03, tam=1.5))
        partes['led'].append(bloco(f'HUB_pier_led{s}', col, (0.03, comp, 0.04), (s * (PL / 2 + 0.01), ym, PIER_Z + 0.12), 0, M['led'], bev=0.0))
        partes['led'].append(bloco(f'HUB_pier_ledlat{s}', col, (0.03, comp, 0.05), (s * (PL / 2 + 0.52), ym, PIER_Z - 0.3), 0, M['led2'], bev=0.0))
        guarda_corpo_reto(col, f'HUB_gcpier{s}', Vector((s * (PL / 2 + 0.2), yp0 - 0.7, PIER_Z + 0.19)), Vector((s * (PL / 2 + 0.2), PIER_FIM + 0.2, PIER_Z + 0.19)), M, partes, alt=1.0, espaco=1.6)
        # postes de lanterna: topo da escadaria (sobre as muretas) e no píer
        for nm, (x, y, z) in (('alto', (s * (LARG / 2 + 0.22), y0 + 0.2, TOP + 0.25)), ('pe', (s * (PL / 2 + 0.2), yp0 - 0.3, PIER_Z + 0.19)), ('meio', (s * (PL / 2 + 0.2), PIER_FIM + 3.5, PIER_Z + 0.19))):
            corpo, luz = lanterna_poste(col, f'HUB_lant_{nm}{s}', x, y, z, M); partes['lant'].append(corpo); partes['led'].append(luz)
    for y in [yp0 - 1.5 - 3.6 * k for k in range(4)]:
        if y < PIER_FIM + 0.6: break
        for s in (-1, 1): partes['pier'].append(cilindro(f'HUB_pier_pilar{y:.0f}{s}', col, 0.35, -1.5, PIER_Z - 0.6, M['estr'], lados=12, loc=(s * 2.6, y)))

    # ======== BATCOMPUTADOR ========
    RT = 11.2; A = 35.0; ZB = TOP + 2.55; ZT = TOP + 5.15
    paineis = [('texto_esq', -35.0, -27.6, 'texto.png'), ('cidade', -27.4, -17.2, 'cidade.png'), ('mapa', -17.0, 17.0, 'mapa.png'),
               ('grafico', 17.2, 23.6, 'grafico.png'), ('radar', 23.8, 29.8, 'radar.png'), ('dados', 30.0, 35.0, 'dados.png')]
    for nm, a0, a1, png in paineis:
        faixa_curva('TELA_' + nm, col, RT, a0, a1, ZB, ZT, tela_mat('HUB_tela_' + nm, png, 1.5), passo=1.0, uv01=True)
    # moldura: travessas de cima/baixo, montantes entre painéis, caixa traseira, cornija, torres laterais, base com frestas acesas
    partes['tela_estr'].append(setor('HUB_tela_trav_baixo', col, RT - 0.12, RT + 0.3, -A - 0.8, A + 0.8, ZB - 0.28, ZB + 0.02, M['aco_esc'], passo=1.5, bev=0.03))
    partes['tela_estr'].append(setor('HUB_tela_trav_cima', col, RT - 0.12, RT + 0.3, -A - 0.8, A + 0.8, ZT - 0.02, ZT + 0.3, M['aco_esc'], passo=1.5, bev=0.03))
    partes['led'].append(setor('HUB_tela_led_baixo', col, RT - 0.14, RT - 0.11, -A, A, ZB - 0.2, ZB - 0.15, M['led'], passo=1.5))
    partes['led'].append(setor('HUB_tela_led_cima', col, RT - 0.14, RT - 0.11, -A, A, ZT + 0.15, ZT + 0.2, M['led'], passo=1.5))
    for f in (-35.1, -27.5, -17.1, 17.1, 23.7, 29.9, 35.1):
        p = P(RT - 0.05, f, (ZB + ZT) / 2)
        partes['tela_estr'].append(bloco(f'HUB_tela_mont{f}', col, (0.16, 0.18, ZT - ZB + 0.1), p, -RAD(f), M['aco_esc'], bev=0.02))
    partes['tela_estr'].append(setor('HUB_tela_caixa', col, RT + 0.3, RT + 0.75, -A - 2.2, A + 2.2, TOP, ZT + 0.95, M['estr'], passo=1.5, bev=0.04, tam=2.0))
    partes['tela_estr'].append(setor('HUB_tela_cornija', col, RT - 0.35, RT + 0.85, -A - 2.6, A + 2.6, ZT + 0.95, ZT + 1.2, M['aco_esc'], passo=1.5, bev=0.04))
    partes['led'].append(setor('HUB_tela_led_cornija', col, RT - 0.37, RT - 0.33, -A - 2.6, A + 2.6, ZT + 1.0, ZT + 1.05, M['led'], passo=1.5))
    partes['tela_estr'].append(setor('HUB_tela_base', col, RT - 0.1, RT + 0.3, -A - 0.8, A + 0.8, TOP, ZB - 0.28, M['estr'], passo=1.5, bev=0.03, tam=1.5))
    for i in range(-12, 13):
        f = i * 2.7
        p = P(RT - 0.12, f, TOP + 0.55 + (ZB - 0.28 - TOP - 0.55) / 2)
        if abs(i) <= 1: continue
        partes['led'].append(bloco(f'HUB_base_fresta{i}', col, (0.07, 0.03, (ZB - 0.28 - TOP) * 0.62), p, -RAD(f), M['led2'] if i % 3 else M['led'], bev=0.0))
    for s in (-1, 1):
        f = s * 37.0
        for k, (r0, r1) in enumerate(((10.6, 11.95),)):
            partes['tela_estr'].append(setor(f'HUB_torre{s}', col, r0, r1, f - 1.7, f + 1.7, TOP, ZT + 1.75, M['estr'], passo=1.0, bev=0.05, tam=1.6))
            partes['tela_estr'].append(setor(f'HUB_torre_topo{s}', col, r0 - 0.1, r1 + 0.1, f - 1.9, f + 1.9, ZT + 1.75, ZT + 1.95, M['aco_esc'], passo=1.0, bev=0.03))
        for d in (-1.0, 0.0, 1.0):
            p = P(10.57, f + d, (TOP + ZT + 1.6) / 2)
            partes['led'].append(bloco(f'HUB_torre_led{s}{d}', col, (0.06, 0.03, ZT + 1.2 - TOP), p, -RAD(f + d), M['led'], bev=0.0))
    # console central baixo, colado à base da tela (passagem livre até ele)
    partes['mesa'].append(setor('HUB_central', col, 9.75, 10.95, -4.5, 4.5, TOP, TOP + 1.0, M['estr'], passo=1.5, bev=0.03, tam=1.2))
    partes['mesa'].append(setor('HUB_central_tampo', col, 9.65, 11.0, -4.7, 4.7, TOP + 1.0, TOP + 1.06, M['aco_esc'], passo=1.5, bev=0.015))
    for k in range(3):
        partes['teclado'].append(placa(f'HUB_central_tecl{k}', col, 0.5, 0.26, M['teclado'], P(9.98, -2.8 + k * 2.8, TOP + 1.065), math.pi, tilt=RAD(-90)))
    for k in range(5):
        partes['led'].append(setor(f'HUB_central_degrau{k}', col, 9.74, 9.77, -4.0, 4.0, TOP + 0.12 + k * 0.17, TOP + 0.15 + k * 0.17, M['led'], passo=1.5))

    # consoles: 2 fileiras por lado (frente baixa r≈8.4 e de trás alta r≈9.9), monitores TELA_console_xx, cadeiras
    imgs = ['c_morcego.png', 'c_hud.png', 'c_barras.png', 'c_mundo.png', 'c_ondas.png']
    tm = [tela_mat('HUB_tela_c%d' % i, p, 1.4) for i, p in enumerate(imgs)]
    nmon = 0; corpos = []
    for s in (-1, 1):
        a0, a1 = (9.0, 33.0) if s > 0 else (-33.0, -9.0)
        mesa_curva(col, f'HUB_mesa{s}', 8.15, 9.0, a0, a1, M, partes)
        for k in range(4):
            f = a0 + 2.2 + k * (a1 - a0 - 4.4) / 3
            nmon += 1; yaw = -RAD(f) + math.pi
            c, _t = monitor(col, 'console_%02d' % nmon, P(8.78, f, TOP + 1.24), -RAD(f), 0.92, 0.56, tm[(nmon - 1) % 5], M, tilt=RAD(-6), pe=0.3)
            corpos.append(c)
        # fileira de trás: consoles altos com monitores maiores em pedestal
        partes['mesa'].append(setor(f'HUB_rack{s}', col, 9.75, 10.4, a0 + 1.0, a1 - 1.0, TOP, TOP + 1.25, M['estr'], passo=2, bev=0.03, tam=1.2))
        partes['mesa'].append(setor(f'HUB_rack_tampo{s}', col, 9.68, 10.45, a0 + 0.8, a1 - 0.8, TOP + 1.25, TOP + 1.31, M['aco_esc'], passo=2, bev=0.015))
        partes['led'].append(setor(f'HUB_rack_led{s}', col, 9.72, 9.75, a0 + 1.0, a1 - 1.0, TOP + 1.12, TOP + 1.15, M['led'], passo=2))
        for k in range(4):
            f = a0 + 2.6 + k * (a1 - a0 - 5.2) / 3
            nmon += 1; yaw = -RAD(f) + math.pi
            c, _t = monitor(col, 'console_%02d' % nmon, P(10.05, f, TOP + 2.13), -RAD(f), 1.04, 0.62, tm[(nmon + 1) % 5], M, tilt=RAD(-3), pe=0.42)
            corpos.append(c)
        # duas cadeiras por lado, de frente para a mesa (costas com o morcego para o centro)
        for f in ((a0 + 7.0, a1 - 7.0)):
            out, em = cadeira(col, f'HUB_cadeira{s}_{int(f)}', P(7.05, f, TOP), -RAD(f) + math.pi, M)
            corpos.append(out); partes['mont'].append(em)

    # ======== une peças por papel (menos objetos no site) ========
    juntar(partes['deque'], 'HUB_deque'); juntar(partes['saia'], 'HUB_saia_pilares')
    juntar(partes['corr'], 'HUB_corrimaos'); juntar(partes['vidro'], 'HUB_vidros'); juntar(partes['mont'], 'HUB_montantes')
    juntar(partes['led'], 'HUB_leds'); juntar(partes['mesa'], 'HUB_mesas'); juntar(partes['teclado'], 'HUB_teclados')
    juntar(partes['tela_estr'], 'HUB_tela_estrutura'); juntar(partes['escada'], 'HUB_escadaria'); juntar(partes['pier'], 'HUB_pier')
    juntar(partes['lant'], 'HUB_lanternas'); juntar(corpos, 'HUB_consoles_cadeiras')
    say('objetos', len(col.objects), 'tris', kit_tris(col))

    previas_hub(args)
    if 'sem_fecha' not in args: fecha('area_hub', col)

def kit_tris(col):
    import kit; return kit._tris(col)

# ---------------- prévias (luz e água só de conferência, prefixo PREV_) ----------------
def cena_previa():
    sc = bpy.context.scene
    w = sc.world or bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.006, 0.012, 0.025, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=60)
    ag = objeto('PREV_agua', bm, sc.collection, None)
    m = bpy.data.materials.new('PREV_agua_m'); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.01, 0.05, 0.08, 1); b.inputs['Roughness'].default_value = 0.06; ag.data.materials.append(m)
    # paredão escuro de fundo
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=False, segments=64, radius1=38, radius2=38, depth=50)
    pw = objeto('PREV_parede', bm, sc.collection, None); pw.location.z = 20
    m2 = bpy.data.materials.new('PREV_parede_m'); m2.use_nodes = True; m2.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.02, 0.025, 0.03, 1); pw.data.materials.append(m2)
    def luz(nome, tipo, loc, alvo, e, cor_, tam=8):
        l = bpy.data.objects.new(nome, bpy.data.lights.new(nome, tipo)); l.data.energy = e; l.data.color = cor_
        if tipo == 'AREA': l.data.size = tam
        l.location = loc; l.rotation_euler = (Vector(alvo) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); sc.collection.objects.link(l)
    luz('PREV_l1', 'AREA', (0, -6, 16), (0, 0, 0), 2500, (0.55, 0.75, 1.0), 14)
    luz('PREV_l2', 'AREA', (-14, -18, 14), (0, 0, 2), 1400, (0.5, 0.7, 1.0), 4)
    luz('PREV_l3', 'AREA', (14, -18, 14), (0, 0, 2), 1000, (0.6, 0.75, 1.0), 4)
    luz('PREV_l4', 'AREA', (0, 6, 8), (0, 10, 3), 600, (0.4, 0.7, 1.0), 6)
    try:
        sc.eevee.use_raytracing = True
    except Exception: pass
    try: sc.view_settings.view_transform = 'Standard'
    except Exception: pass

def previas_hub(args):
    cena_previa()
    tag = next((a.split('=')[1] for a in args if a.startswith('tag=')), 'v')
    previa(f'hub_{tag}_entrada', cam=(0, -27.0, 5.4), alvo=(0, 0, 2.7), lente=27, res=(1672, 941), luz=False)          # arte 1930e6a9
    previa(f'hub_{tag}_computador', cam=(0, 9.6, 3.6), alvo=(0, -6, 0.6), lente=17, luz=False)        # arte a7206da7
    previa(f'hub_{tag}_garagem', cam=(-21, -12, 8.5), alvo=(2, 2, 2), lente=24, luz=False)           # arte 617fc1a3
    previa(f'hub_{tag}_consoles', cam=(0, -2, 3.4), alvo=(0, 10, 3.2), lente=20, luz=False)
    previa(f'hub_{tag}_cima', cam=(0, -6, 40), alvo=(0, -4, 0), lente=24, luz=False)

rodar(main)
