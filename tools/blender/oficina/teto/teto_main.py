# Área TETO (referencial MUNDO, coleção A_TETO -> public/models/area_teto.glb).
# Molde: captura 2026-11-22 190121 (parte de cima): abertura no teto com musgo e cipós, grande anel de aço
# (treliça dupla com passarela, guarda-corpo e LEDs azuis), correntes em catenária, morcego facetado
# pendurado sob o anel diante do paredão, sacadas de aço nos cantos com luz quente, luminárias pendentes,
# estalactites grandes em volta da abertura. Contexto (abóbada/paredão) só para a prévia.
import sys, os, math, random
sys.path.insert(0, r'C:\Users\Gabriel Caetano\Downloads\Claud Code\batcaverna\tools\blender\oficina')
sys.path.insert(0, r'C:\Users\Gabriel Caetano\Downloads\Claud Code\batcaverna\tools\blender\oficina\caverna')
from kit import *
from mathutils import noise
import caverna_pecas as CP
from caverna_pecas import P, teto, inst

D = math.pi / 180
CX, CY, CZ, RA = 0.0, 20.0, 37.0, 14.0      # anel: centro (Blender) e raio; three (0, 37, -20)
OCX, OCY, OR = 0.0, 20.0, 8.5                 # abertura do teto (óculo)
BAT = Vector((0.0, 34.6, 30.5))               # morcego (three (0, 30.5, -34.6))

# ------------------------------------------------------------------ primitivas em bmesh
def barra(bm, a, b, r, lados=6, tampa=False):
    a, b = Vector(a), Vector(b); d = b - a; L = d.length
    if L < 1e-4: return
    M = Matrix.Translation(a) @ d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
    v0 = [bm.verts.new(M @ Vector((r * math.cos(k * 2 * math.pi / lados), r * math.sin(k * 2 * math.pi / lados), 0))) for k in range(lados)]
    v1 = [bm.verts.new(M @ Vector((r * math.cos(k * 2 * math.pi / lados), r * math.sin(k * 2 * math.pi / lados), L))) for k in range(lados)]
    for k in range(lados):
        bm.faces.new((v0[k], v0[(k + 1) % lados], v1[(k + 1) % lados], v1[k]))
    if tampa: bm.faces.new(list(reversed(v0))); bm.faces.new(v1)

def tubo(bm, pts, r, lados=8, fechado=False):
    n = len(pts); aneis = []
    for i, p in enumerate(pts):
        if fechado: t = (pts[(i + 1) % n] - pts[i - 1]).normalized()
        else: t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
        up = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
        nn = up.cross(t).normalized(); bb = t.cross(nn)
        aneis.append([bm.verts.new(p + r * (math.cos(k * 2 * math.pi / lados) * nn + math.sin(k * 2 * math.pi / lados) * bb)) for k in range(lados)])
    m = n if fechado else n - 1
    for i in range(m):
        a, b = aneis[i], aneis[(i + 1) % n]
        for k in range(lados): bm.faces.new((a[k], a[(k + 1) % lados], b[(k + 1) % lados], b[k]))

def caixa_bm(bm, centro, dims, rot_z=0.0):
    c = Vector(centro); R = Matrix.Rotation(rot_z, 3, 'Z'); hx, hy, hz = (d / 2 for d in dims)
    vs = [bm.verts.new(c + R @ Vector((sx * hx, sy * hy, sz * hz))) for sx in (-1, 1) for sy in (-1, 1) for sz in (-1, 1)]
    for f in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
        bm.faces.new([vs[i] for i in f])

def fim(nome, bm, col, mat, liso=False, tam=2.0):
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = objeto(nome, bm, col, mat)
    for p in o.data.polygons: p.use_smooth = liso
    uv_mundo(o, tam); return o

def circulo(cx, cy, r, z, n, a0=0.0, a1=360.0):
    return [Vector((cx + r * math.sin((a0 + (a1 - a0) * i / n) * D), cy + r * math.cos((a0 + (a1 - a0) * i / n) * D), z)) for i in range(n)]

def ponto_anel(ang, r=RA, dz=0.0):
    return Vector((CX + r * math.sin(ang * D), CY + r * math.cos(ang * D), CZ + dz))

# ------------------------------------------------------------------ corrente
def elo(bm, M, s=0.16, a=0.17, w=0.055, seg=10, lados=4):
    pts = []
    for i in range(seg):
        t = i / seg * 2 * math.pi
        if t < math.pi: ang = -math.pi / 2 + t; pts.append(Vector((s + a * math.cos(ang), a * math.sin(ang), 0)))
        else: ang = math.pi / 2 + (t - math.pi); pts.append(Vector((-s + a * math.cos(ang), a * math.sin(ang), 0)))
    tubo(bm, [M @ p for p in pts], w, lados, fechado=True)

def corrente(bm, a, b, flecha, passo=0.55, k=1.0):
    a, b = Vector(a), Vector(b)
    fino = [a.lerp(b, i / 400) - Vector((0, 0, flecha * 4 * (i / 400) * (1 - i / 400))) for i in range(401)]
    acum = [0.0]
    for i in range(1, len(fino)): acum.append(acum[-1] + (fino[i] - fino[i - 1]).length)
    L = acum[-1]; n = int(L / (passo * k)); j = 0
    for e in range(n + 1):
        d = e * L / max(n, 1)
        while j < len(acum) - 2 and acum[j + 1] < d: j += 1
        f = (d - acum[j]) / max(1e-6, acum[j + 1] - acum[j]); p = fino[j].lerp(fino[j + 1], f)
        t = (fino[j + 1] - fino[j]).normalized()
        y = t.cross(Vector((0, 0, 1))); y = y.normalized() if y.length > 1e-3 else Vector((0, 1, 0))
        z = t.cross(y)
        if e % 2: y, z = z, -y
        M = Matrix((t, y, z)).transposed().to_4x4(); M.translation = p
        M = M @ Matrix.Scale(k, 4)
        elo(bm, M)
    return n + 1

def catenaria(a, b, flecha, n=40):
    a, b = Vector(a), Vector(b)
    return [a.lerp(b, i / n) - Vector((0, 0, flecha * 4 * (i / n) * (1 - i / n))) for i in range(n + 1)]

# ------------------------------------------------------------------ morcego facetado
def morcego(col, mat, mat_nervura, mat_brilho):
    S = (1.3, 1.5)
    topo = [(2.8, 2.5), (4.3, 2.95), (5.6, 3.05)]
    T = [(6.6, 2.9), (5.9, 0.2), (4.6, -1.0), (3.1, -1.8), (1.6, -2.4), (0.9, -2.75)]
    def recorte(p, q, prof=0.36, n=5):
        p, q = Vector(p), Vector(q); m = (p + q) / 2; s = Vector(S); dirv = (s - m); L = (q - p).length
        out = []
        for i in range(1, n):
            t = i / n; b = p.lerp(q, t); out.append(b + dirv.normalized() * prof * L * 4 * t * (1 - t))
        return out
    def Y(x, z, dy): return Vector((x, dy, z))
    bm = bmesh.new()
    def leque(centro, borda):
        c = bm.verts.new(centro); vs = [bm.verts.new(v) for v in borda]
        for i in range(len(vs) - 1): bm.faces.new((c, vs[i], vs[i + 1]))
    for sx in (1, -1):
        def X(p, dy): return Y(sx * p[0], p[1], dy)
        sv = X(S, -0.65)
        # painel de cima: ombro -> borda arqueada -> ponta
        leque(sv, [X(S, -0.45)] + [X(p, -0.15) for p in topo] + [X(T[0], -0.25)])
        # painéis recortados entre as nervuras
        for k in range(len(T) - 1):
            borda = [X(T[k], -0.25)]
            for q in recorte(T[k], T[k + 1]): borda.append(Y(sx * q.x, q.y, 0.18))
            borda.append(X(T[k + 1], -0.25))
            leque(sv, borda)
    corpo = [(0, 1.9), (0.25, 2.0), (0.55, 3.15), (0.85, 1.85), (1.3, 1.5), (0.9, -2.75), (0.55, -3.6), (0, -4.7)]
    borda = [Y(x, z, -0.35) for x, z in corpo] + [Y(-x, z, -0.35) for x, z in reversed(corpo[1:-1])]
    c = bm.verts.new(Vector((0, -1.25, 0.2))); vs = [bm.verts.new(v) for v in borda]
    for i in range(len(vs)): bm.faces.new((c, vs[i], vs[(i + 1) % len(vs)]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    o = objeto('TET_morcego', bm, col, mat)
    sol = o.modifiers.new('esp', 'SOLIDIFY'); sol.thickness = 0.45; sol.offset = 0.0
    bpy.context.view_layer.objects.active = o
    for x in bpy.context.selected_objects: x.select_set(False)
    o.select_set(True); bpy.ops.object.modifier_apply(modifier='esp')
    o.location = BAT; uv_mundo(o, 2.5)
    # nervuras (cantoneiras claras sobre cada costela da asa e no corpo)
    bn = bmesh.new()
    for sx in (1, -1):
        for t in T[:-1]:
            barra(bn, (sx * S[0], -0.72, S[1]), (sx * t[0], -0.32, t[1]), 0.085, 5)
        barra(bn, (sx * 0.5, -0.9, 1.6), (sx * 0.4, -0.9, -3.4), 0.07, 5)
    o2 = fim('TET_morcego_nervura', bn, col, mat_nervura); o2.location = BAT
    # contraluz azul atrás da silhueta (o halo do site soma por cima)
    contorno = [(0, 1.9), (0.25, 2.0), (0.55, 3.15), (0.85, 1.85), (1.3, 1.5)] + topo + [T[0]]
    for k in range(len(T) - 1): contorno += [(q.x, q.y) for q in recorte(T[k], T[k + 1])] + [T[k + 1]]
    contorno += [(0.55, -3.6), (0, -4.7)]
    full = contorno + [(-x, z) for x, z in reversed(contorno[1:-1])]
    bg = bmesh.new(); vs = [bg.verts.new(Vector((x * 1.07, 0.55, z * 1.07 - 0.05))) for x, z in full]
    bg.faces.new(vs)
    bmesh.ops.triangulate(bg, faces=bg.faces)
    o3 = objeto('TET_morcego_brilho', bg, col, mat_brilho); o3.location = BAT
    return o

# ------------------------------------------------------------------ contexto (só prévia)
def contexto():
    ctx = colecao('CTX_TETO'); m = cor('CTX_rocha', (0.05, 0.06, 0.075), rough=0.9)
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=96, v_segments=48, radius=64)
    for v in bm.verts: v.co.z = v.co.z * 0.78 + 4
    fora = [f for f in bm.faces if math.hypot(f.calc_center_median().x - OCX, f.calc_center_median().y - OCY) < OR + 0.5 and f.calc_center_median().z > 30]
    bmesh.ops.delete(bm, geom=fora, context='FACES')
    objeto('CTX_abobada', bm, ctx, m)
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=False, segments=96, radius1=38, radius2=38, depth=52)
    for v in bm.verts: v.co.z += 21
    objeto('CTX_paredao', bm, ctx, m)
    ag = cor('CTX_agua', (0.01, 0.03, 0.05), rough=0.1); caixa('CTX_agua', ctx, (90, 90, 0.1), (0, 0, 0), ag, bev=0)
    for o in ctx.objects:
        for p in o.data.polygons: p.use_smooth = True
    return ctx

def luzes():
    sc = bpy.context.scene; w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.006, 0.012, 0.02, 1)
    def L(nome, tipo, loc, e, c, alvo=None, size=None, spot=None):
        d = bpy.data.lights.new(nome, tipo); d.energy = e; d.color = c
        if size and tipo == 'AREA': d.size = size
        if spot: d.spot_size = spot; d.spot_blend = 0.8
        o = bpy.data.objects.new(nome, d); o.location = loc; sc.collection.objects.link(o)
        if alvo: o.rotation_euler = (Vector(alvo) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    L('PREV_oculo', 'SPOT', (OCX, OCY, 64), 9e5, (0.75, 0.88, 1.0), alvo=(0, 10, 0), spot=0.9)
    L('PREV_ceu', 'AREA', (OCX, OCY, 60), 4e4, (0.6, 0.8, 1.0), alvo=(OCX, OCY, 0), size=14)
    L('PREV_azul', 'AREA', (0, 37, 30), 2.5e4, (0.1, 0.5, 1.0), alvo=(0, 0, 30), size=14)
    L('PREV_frente', 'AREA', (0, -10, 14), 3e4, (0.35, 0.55, 0.85), alvo=(0, 25, 38), size=30)
    for s in (-1, 1): L(f'PREV_quente{s}', 'POINT', (s * 30, 14, 29), 6e3, (1.0, 0.6, 0.3))

# ------------------------------------------------------------------ área
def main(args):
    C.limpa(); rnd = random.Random(5)
    col = colecao('A_TETO')
    aco = material('TET_aco', 'metal_plate', tint=(0.32, 0.34, 0.38), metal=0.9, rough_k=0.8)
    aco_esc = cor('TET_aco_escuro', (0.04, 0.045, 0.05), rough=0.45, metal=0.9)
    grade = material('TET_grade', 'metal_grate_rusty', tint=(0.35, 0.36, 0.4), metal=0.7)
    led = cor('TET_led_azul', (0.08, 0.55, 1.0), rough=0.3, emiss=5.0)
    quente = cor('TET_luz_quente', (1.0, 0.55, 0.2), rough=0.3, emiss=6.0)
    corr = cor('TET_corrente', (0.06, 0.065, 0.07), rough=0.35, metal=1.0)
    bat_m = material('TET_morcego_metal', 'metal_plate_02', tint=(0.2, 0.22, 0.26), metal=0.95, rough_k=0.7)
    bat_n = cor('TET_morcego_nervura', (0.3, 0.33, 0.37), rough=0.25, metal=1.0)
    brilho = cor('TET_brilho_azul', (0.05, 0.45, 1.0), rough=0.5, emiss=1.4)
    cabo = cor('TET_cabo', (0.015, 0.015, 0.018), rough=0.6)
    rocha = CP.material_ph_ardosia('TET_rocha', 'dark_rock', base=(0.16, 0.18, 0.22), molhar=False)
    rocha_m = CP.material_ph_ardosia('TET_rocha_musgo', 'mossy_rock', musgo=0.75, base=(0.17, 0.19, 0.23))
    folha = CP.material_ph_ardosia('TET_folhagem', 'mossy_rock', musgo=0.0, base=(0.09, 0.2, 0.07))

    # ---------- anel principal: treliça em caixa 1.6 x 1.2 ----------
    N = 96; ri, re_, zt, zb = RA - 0.8, RA + 0.8, CZ + 0.6, CZ - 0.6
    bm = bmesh.new()
    for r_, z_ in ((ri, zt), (re_, zt), (ri, zb), (re_, zb)): tubo(bm, circulo(CX, CY, r_, z_, 192), 0.14, 8, fechado=True)
    o = fim('TET_anel_banzos', bm, col, aco, liso=True)
    bm = bmesh.new()
    for i in range(N):
        a0, a1 = i * 360 / N, (i + 1) * 360 / N
        for r_ in (ri, re_):
            barra(bm, ponto_anel(a0, r_, 0.6), ponto_anel(a0, r_, -0.6), 0.06, 5)
            if i % 2 == 0: barra(bm, ponto_anel(a0, r_, 0.6), ponto_anel(a1, r_, -0.6), 0.05, 5)
            else: barra(bm, ponto_anel(a0, r_, -0.6), ponto_anel(a1, r_, 0.6), 0.05, 5)
        barra(bm, ponto_anel(a0, ri, -0.6), ponto_anel(a0, re_, -0.6), 0.05, 5)
    fim('TET_anel_trelica', bm, col, aco_esc)
    # passarela de grade sobre o banzo de cima + guarda-corpos dos dois lados
    bm = bmesh.new(); M = 128
    for i in range(M):
        a0, a1 = i * 360 / M, (i + 1) * 360 / M
        v = [bm.verts.new(ponto_anel(a, r_, 0.68)) for a, r_ in ((a0, ri - 0.25), (a1, ri - 0.25), (a1, re_ + 0.25), (a0, re_ + 0.25))]
        bm.faces.new(v)
    fim('TET_anel_piso', bm, col, grade, tam=1.2)
    bm = bmesh.new()
    for r_ in (ri - 0.2, re_ + 0.2):
        for h in (1.15, 0.6): tubo(bm, circulo(CX, CY, r_, CZ + 0.68 + h, 160), 0.04, 5, fechado=True)
        for i in range(64): a = i * 360 / 64; barra(bm, ponto_anel(a, r_, 0.68), ponto_anel(a, r_, 1.85), 0.035, 4)
    fim('TET_anel_guarda', bm, col, aco_esc)
    # anel externo mais fino, ligado por vigas radiais
    R2 = RA + 2.8; bm = bmesh.new()
    for dr, dz in ((-0.3, -0.9), (0.3, -0.9), (-0.3, -1.5), (0.3, -1.5)): tubo(bm, circulo(CX, CY, R2 + dr, CZ + dz, 160), 0.09, 6, fechado=True)
    for i in range(48):
        a = i * 360 / 48
        barra(bm, ponto_anel(a, R2 - 0.3, -0.9), ponto_anel(a, R2 - 0.3, -1.5), 0.04, 4)
        barra(bm, ponto_anel(a, R2 + 0.3, -0.9), ponto_anel(a, R2 + 0.3, -1.5), 0.04, 4)
        barra(bm, ponto_anel(a, R2 - 0.3, -1.5), ponto_anel(a + 7.5, R2 + 0.3, -0.9), 0.035, 4)
    for i in range(12):
        a = i * 30 + 15
        barra(bm, ponto_anel(a, re_, -0.6), ponto_anel(a, R2 - 0.3, -1.2), 0.1, 6)
        barra(bm, ponto_anel(a, re_, 0.6), ponto_anel(a, R2 - 0.3, -0.9), 0.07, 6)
    fim('TET_anel_externo', bm, col, aco, liso=True)
    # LEDs azuis: faixas na face interna e externa (como na arte), lâmpadas quentes pontuais
    bm = bmesh.new()
    for i in range(10):
        a0 = i * 36 + 4; arco = circulo(CX, CY, ri - 0.16, CZ, 14, a0, a0 + 20)
        for k in range(len(arco) - 1):
            p, q = arco[k], arco[k + 1]
            v = [bm.verts.new(p + Vector((0, 0, -0.12))), bm.verts.new(q + Vector((0, 0, -0.12))), bm.verts.new(q + Vector((0, 0, 0.12))), bm.verts.new(p + Vector((0, 0, 0.12)))]
            bm.faces.new(v)
    for i in range(8):
        a0 = i * 45 + 20; arco = circulo(CX, CY, R2 + 0.42, CZ - 1.2, 10, a0, a0 + 12)
        for k in range(len(arco) - 1):
            p, q = arco[k], arco[k + 1]
            v = [bm.verts.new(p + Vector((0, 0, -0.1))), bm.verts.new(q + Vector((0, 0, -0.1))), bm.verts.new(q + Vector((0, 0, 0.1))), bm.verts.new(p + Vector((0, 0, 0.1)))]
            bm.faces.new(v)
    fim('TET_led_anel', bm, col, led)
    bm = bmesh.new()
    for a in (60, 150, 230, 300):
        p = ponto_anel(a, re_ + 0.35, -0.75); caixa_bm(bm, p, (0.5, 0.5, 0.3), -a * D)
    fim('TET_lampadas_anel', bm, col, quente)
    # tirantes até a rocha do teto, com chapa de fixação
    bm = bmesh.new(); bp = bmesh.new()
    for i in range(8):
        a = i * 45 + 22.5
        for r_ in (ri, re_):
            p = ponto_anel(a, r_, 0.6); r0 = math.hypot(p.x, p.y); top = teto(r0) + 1.0
            barra(bm, p, Vector((p.x * 1.03, p.y * 1.03, top)), 0.09, 6)
            caixa_bm(bp, Vector((p.x * 1.03, p.y * 1.03, top - 1.6)), (0.7, 0.7, 0.18), -a * D)
    fim('TET_tirantes', bm, col, aco_esc, liso=True); fim('TET_chapas', bp, col, aco)

    # ---------- correntes ----------
    bm = bmesh.new(); n = 0
    n += corrente(bm, ponto_anel(-72, RA, -0.7), ponto_anel(72, RA, -0.7), 6.5, k=1.25)       # laço grande de lado a lado
    n += corrente(bm, ponto_anel(-118, RA, -0.7), ponto_anel(118, RA, -0.7), 4.0, k=1.0)      # laço da frente, mais alto
    for s in (-1, 1):  # sustentação do morcego: do anel às pontas das asas
        n += corrente(bm, ponto_anel(s * 28, RA, -0.7), BAT + Vector((s * 4.6, 0.1, 2.6)), 0.6, k=0.9)
        n += corrente(bm, ponto_anel(s * 8, RA, -0.7), BAT + Vector((s * 0.9, 0.1, 2.9)), 0.3, k=0.9)
    fim('TET_correntes', bm, col, corr)
    # cabos pendentes do anel às paredes (como na arte)
    bm = bmesh.new()
    for a, f, z, fl in ((-95, -80, 33, 4.5), (95, 80, 33, 4.5), (-130, -110, 30, 5.0), (130, 110, 30, 5.0), (-55, -45, 31, 3.0), (55, 45, 31, 3.0), (-160, -150, 34, 3.5), (160, 150, 34, 3.5)):
        tubo(bm, catenaria(ponto_anel(a, R2, -1.4), P(37, f, z), fl, 30), 0.06, 5)
        tubo(bm, catenaria(ponto_anel(a + 4, R2, -1.4), P(37, f + 3, z - 1.2), fl * 1.3, 30), 0.045, 5)
    fim('TET_cabos', bm, col, cabo, liso=True)

    # ---------- morcego ----------
    morcego(col, bat_m, bat_n, brilho)
    bm = bmesh.new()   # suporte: viga do paredão às costas do morcego
    for s in (-1, 1):
        barra(bm, BAT + Vector((s * 2.0, 0.4, 0.8)), Vector((s * 2.6, 37.6, 33.5)), 0.12, 6)
        barra(bm, BAT + Vector((s * 4.0, 0.4, 1.4)), Vector((s * 5.2, 37.5, 35.0)), 0.1, 6)
    fim('TET_morcego_suporte', bm, col, aco_esc, liso=True)

    # ---------- óculo: garganta de rocha, beiço, musgo e cipós ----------
    bm = bmesh.new(); seg, an = 72, 22
    for j in range(an + 1):
        t = j / an; z = 44 + t * 22; r0 = OR + 5.5 * (1 - t) ** 3
        anel = []
        for i in range(seg):
            a = i * 360 / seg; dirv = Vector((math.sin(a * D), math.cos(a * D), 0))
            nz = noise.noise(Vector((dirv.x * 2.2, dirv.y * 2.2, z * 0.18))) * 1.6 + noise.noise(Vector((dirv.x * 7, dirv.y * 7, z * 0.6))) * 0.5
            p = Vector((OCX, OCY, z)) + dirv * (r0 + nz); anel.append(bm.verts.new(p))
        if j:
            for i in range(seg): bm.faces.new((prev[i], prev[(i + 1) % seg], anel[(i + 1) % seg], anel[i]))
        prev = anel
    # beiço: aba que desce e abre para fundir com a abóbada
    bm2 = bmesh.new(); prev = None
    for j in range(7):
        t = j / 6; rr = OR + 5.5 + t * 6.5; z = 44 - 0.5 * t + 3.2 * t * t
        anel = []
        for i in range(seg):
            a = i * 360 / seg; dirv = Vector((math.sin(a * D), math.cos(a * D), 0))
            zz = min(z, teto(math.hypot(OCX + dirv.x * rr, OCY + dirv.y * rr)) - 0.4) if j == 6 else z
            nz = noise.noise(Vector((dirv.x * 3, dirv.y * 3, t * 3))) * 1.2
            anel.append(bm2.verts.new(Vector((OCX, OCY, zz + nz * 0.6)) + dirv * (rr + nz)))
        if prev:
            for i in range(seg): bm2.faces.new((prev[i], prev[(i + 1) % seg], anel[(i + 1) % seg], anel[i]))
        prev = anel
    g = fim('TET_oculo_garganta', bm, col, rocha_m, liso=True, tam=3.5)
    fim('TET_oculo_beico', bm2, col, rocha, liso=True, tam=3.5)
    CIP = [CP.touceira_cipos(f'TET_cipos_{i}', folha, seed=80 + i, n=5 + i, comp=4.0 + 2.2 * i, folhas=60) for i in range(3)]
    v = 0
    for i in range(34):
        a = i * 360 / 34 + rnd.uniform(-4, 4); rr = OR + rnd.uniform(0.4, 1.6)
        z = 44 + rnd.uniform(0, 12)
        inst(CIP[i % 3], col, f'TET_cipo_{v:03d}', (OCX + rr * math.sin(a * D), OCY + rr * math.cos(a * D), z), (0, 0, -a * D + math.pi), (1.0, 1.0, rnd.uniform(0.8, 1.3))); v += 1
    say('cipos oculo', v)

    # ---------- estalactites grandes em volta da abertura e do anel ----------
    V = {'G0': [(14, 1.9, 21, (0, 0, 0))],
         'G1': [(11, 1.6, 22, (0, 0, 0)), (7, 1.0, 23, (1.8, 0.5, 0.3)), (5, 0.8, 24, (-1.4, 0.9, 0.2))],
         'G2': [(8, 1.1, 25, (0, 0, 0)), (4.5, 0.7, 26, (1.1, -0.5, 0.2))],
         'G3': [(5, 0.7, 27, (0, 0, 0))]}
    EST = {k: CP.estalactite(f'TET_est_{k}', p, rocha) for k, p in V.items()}
    COMP = {k: max(c for c, *_ in p) for k, p in V.items()}
    ne = 0; postos = []
    for i in range(160):
        if ne >= 44: break
        a = rnd.uniform(0, 360); d = rnd.uniform(OR + 1.5, 27)
        x, y = OCX + d * math.sin(a * D), OCY + d * math.cos(a * D); r0 = math.hypot(x, y)
        if r0 > 36: continue
        if any((x - px) ** 2 + (y - py) ** 2 < 4.5 ** 2 for px, py in postos): continue
        zt = teto(r0) + 0.8
        # ponta: acima do anel (com folga) perto dele; mais funda por fora; nunca na frente do morcego
        if abs(d - RA) < 4.5: lim = CZ + 3.4
        elif abs(x) < 9 and y > 27: lim = 36.0
        elif d < RA: lim = CZ + 4.5
        else: lim = 27.0
        k = rnd.choice(['G0', 'G1', 'G2', 'G3', 'G2', 'G0'])
        esc = min(rnd.uniform(1.0, 1.7), (zt - lim) / COMP[k])
        if esc < 0.45: continue
        postos.append((x, y))
        inst(EST[k], col, f'TET_est_{ne:03d}', (x, y, zt), (rnd.uniform(-0.05, 0.05), rnd.uniform(-0.05, 0.05), rnd.uniform(0, 6.28)),
             (esc * rnd.uniform(0.85, 1.15), esc * rnd.uniform(0.85, 1.15), esc)); ne += 1
    say('estalactites', ne)

    # ---------- sacadas de aço nos cantos (esq./dir.) ----------
    for s in (-1, 1):
        phi = s * 70; z0 = 27.0
        Mw = Matrix.Translation(P(38.2, phi, z0)) @ Matrix.Rotation(-phi * D, 4, 'Z')
        L = lambda x, y, z: Mw @ Vector((x, y, z))
        bm = bmesh.new()
        # piso: x -3.6..3.6, y -5..0 (0 = paredão, -Y = salão)
        for x0, x1 in ((-3.6, 3.6),):
            v = [bm.verts.new(L(x0, -5.2, 0)), bm.verts.new(L(x1, -5.2, 0)), bm.verts.new(L(x1, 0.4, 0)), bm.verts.new(L(x0, 0.4, 0))]
            bm.faces.new(v)
        fim(f'TET_sacada_piso{s}', bm, col, grade, tam=1.2)
        bm = bmesh.new()
        # moldura do piso, mãos-francesas até a rocha, pilares subindo ao teto
        for a, b in (((-3.6, -5.2, 0), (3.6, -5.2, 0)), ((-3.6, -5.2, 0), (-3.6, 0.4, 0)), ((3.6, -5.2, 0), (3.6, 0.4, 0)), ((-3.6, -2.4, 0), (3.6, -2.4, 0))):
            barra(bm, L(*a), L(*b), 0.12, 4)
        for x in (-3.4, 0, 3.4):
            barra(bm, L(x, -5.0, -0.1), L(x * 0.8, 0.6, -4.6), 0.1, 5)
            barra(bm, L(x * 0.8, 0.6, -4.6), L(x * 0.8, 0.6, -5.2), 0.18, 5)
        for x in (-3.5, 3.5):
            barra(bm, L(x, -5.1, 0), L(x, -5.1, 9.0), 0.11, 6)
            barra(bm, L(x, -5.1, 3.2), L(x * 0.6, 0.4, 7.5), 0.07, 5)
        # guarda-corpo em 3 lados
        borda = [L(-3.6, 0.2, 0), L(-3.6, -5.2, 0), L(3.6, -5.2, 0), L(3.6, 0.2, 0)]
        for h in (1.1, 0.55):
            tubo(bm, [p + Vector((0, 0, h)) for p in borda], 0.045, 6)
        for i in range(len(borda) - 1):
            a, b = borda[i], borda[i + 1]; n = max(2, int((b - a).length / 1.2))
            for k in range(n + 1): p = a.lerp(b, k / n); barra(bm, p, p + Vector((0, 0, 1.1)), 0.04, 4)
        # porta/vão iluminado no paredão (moldura)
        for a, b in (((-1.1, 0.2, 0), (-1.1, 0.2, 2.5)), ((1.1, 0.2, 0), (1.1, 0.2, 2.5)), ((-1.1, 0.2, 2.5), (1.1, 0.2, 2.5))):
            barra(bm, L(*a), L(*b), 0.12, 4)
        fim(f'TET_sacada_estrutura{s}', bm, col, aco_esc, liso=True)
        bm = bmesh.new()
        # filete quente sob o corrimão e o vão da porta aceso
        for i in range(len(borda) - 1):
            a, b = borda[i] + Vector((0, 0, 1.02)), borda[i + 1] + Vector((0, 0, 1.02))
            d = (b - a); nrm = d.cross(Vector((0, 0, 1))).normalized() * 0.03
            v = [bm.verts.new(a - nrm), bm.verts.new(b - nrm), bm.verts.new(b - nrm + Vector((0, 0, -0.06))), bm.verts.new(a - nrm + Vector((0, 0, -0.06)))]
            bm.faces.new(v)
        v = [bm.verts.new(L(-1.0, 0.35, 0.05)), bm.verts.new(L(1.0, 0.35, 0.05)), bm.verts.new(L(1.0, 0.35, 2.4)), bm.verts.new(L(-1.0, 0.35, 2.4))]
        bm.faces.new(v)
        fim(f'TET_sacada_luz{s}', bm, col, quente)
        # rocha que segura a sacada (afloramento sob o piso)
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1.0)
        for vv in bm.verts:
            vv.co = Vector((vv.co.x * 4.5, vv.co.y * 2.4, vv.co.z * 2.6)) + vv.co.normalized() * noise.noise(vv.co * 1.7 + Vector((s, 0, 0))) * 0.7
            vv.co = Mw @ (vv.co + Vector((0, 1.6, -2.6)))
        fim(f'TET_sacada_rocha{s}', bm, col, rocha, liso=True, tam=3.0)

    # ---------- luminárias pendentes (sino de aço + lâmpada quente) ----------
    bm = bmesh.new(); bl = bmesh.new(); bc = bmesh.new()
    for (x, y, z) in ((-12.5, 6, 29.5), (12.5, 6, 29.5), (-22, 20, 27.5), (22, 20, 27.5), (-27, 2, 25.5), (27, 2, 25.5)):
        top = teto(math.hypot(x, y)) + 0.5
        barra(bc, (x, y, z + 0.55), (x, y, top), 0.025, 4)
        c = Vector((x, y, z)); seg = 14
        a_ = [bm.verts.new(c + Vector((0.18 * math.cos(k * 2 * math.pi / seg), 0.18 * math.sin(k * 2 * math.pi / seg), 0.55))) for k in range(seg)]
        b_ = [bm.verts.new(c + Vector((0.6 * math.cos(k * 2 * math.pi / seg), 0.6 * math.sin(k * 2 * math.pi / seg), 0.0))) for k in range(seg)]
        for k in range(seg): bm.faces.new((a_[k], a_[(k + 1) % seg], b_[(k + 1) % seg], b_[k]))
        bm.faces.new(list(reversed(a_)))
        bmesh.ops.create_uvsphere(bl, u_segments=10, v_segments=6, radius=0.22, matrix=Matrix.Translation(c + Vector((0, 0, 0.08))))
    fim('TET_luminaria_sino', bm, col, aco_esc); fim('TET_luminaria_lampada', bl, col, quente, liso=True); fim('TET_luminaria_cabo', bc, col, cabo)

    # ---------- prévias ----------
    ctx = contexto(); luzes()
    previa('teto_entrada', cam=(0, -30, 4), alvo=(0, 20, 34), lente=15, res=(1600, 900), luz=False)
    previa('teto_baixo', cam=(0, -6, 8), alvo=(0, 22, 40), lente=14, res=(1600, 900), luz=False)
    tot = 0
    for o in col.all_objects:
        if o.type == 'MESH': tot += sum(len(p.vertices) - 2 for p in o.data.polygons)
    say('tris A_TETO', tot)
    if 'so_previa' in args: return
    for o in list(ctx.objects): bpy.data.objects.remove(o)
    bpy.data.collections.remove(ctx)
    fecha('area_teto', col)

rodar(main)
