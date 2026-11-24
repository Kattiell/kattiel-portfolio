# Fachada 11 (Agricultura): arco de madeira tomado por videiras de folhas largas e cachos de uva roxos,
# na frente da parede de uma estufa de vidro com caixilhos (abóbada), canteiros e um fio verde brilhante.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from f101112_comum import *

RA0, RA1 = R + 0.1, 3.85          # arco de madeira
VC, VR = 1.62, 5.95               # abóbada da estufa: centro (0, VC), raio VR (topo 7.57)

def vault_z(x):
    return VC + math.sqrt(max(0.0, VR * VR - x * x)) if abs(x) < VR else 0.0

def livre(p, rect=False):
    """Ponto fora do vão (com folga) e fora da frente do medalhão."""
    if dentro_vao(p.x, p.z, rect, folga=0.1): return False
    if p.y < -0.97 and p.x * p.x + (p.z - 7.35) ** 2 < 1.15: return False
    return abs(p.x) < 6.15 and p.z < 7.55 and p.z > 0.02 and p.y > -1.27

def main(args):
    C.limpa()
    col = colecao('F11')
    rnd = random.Random(11)
    madeira = material('F11_madeira', 'rough_wood', tint=(0.22, 0.17, 0.12))
    casca = material('F11_casca', 'bark_willow', tint=(0.62, 0.5, 0.36))
    caixilho = material('F11_caixilho', 'green_metal_rust', tint=(0.32, 0.42, 0.34), metal=0.6)
    vidro = bpy.data.materials.new('F11_vidro'); vidro.use_nodes = True
    b = vidro.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.45, 0.75, 0.6, 1); b.inputs['Roughness'].default_value = 0.06; b.inputs['Alpha'].default_value = 0.28
    b.inputs['Emission Color'].default_value = (0.3, 0.85, 0.4, 1); b.inputs['Emission Strength'].default_value = 0.35
    for attr, val in (('blend_method', 'BLEND'), ('surface_render_method', 'BLENDED'), ('use_backface_culling', False)):
        try: setattr(vidro, attr, val)
        except Exception: pass
    interior = cor('F11_interior', (0.06, 0.22, 0.09), rough=0.9, emiss=0.9)
    folha = mat_folhas('F11_folha')
    uva = cor('F11_uva', (0.15, 0.025, 0.28), rough=0.2, emiss=0.05)
    brilho = cor('F11_brilho', (0.5, 1.0, 0.18), rough=0.4, emiss=1.3)

    # --- estufa: fundo aceso, vidro em abóbada e caixilhos ---
    hole = 3.6
    cont = [(-VR, 0), (-VR, VC)] + [(VR * math.cos(math.pi * (1 - i / 40)), VC + VR * math.sin(math.pi * (1 - i / 40))) for i in range(1, 40)] + [(VR, VC), (VR, 0), (hole, 0), (hole, SPRING)]
    cont += [(hole * math.cos(math.pi * i / 32), SPRING + hole * math.sin(math.pi * i / 32)) for i in range(1, 32)] + [(-hole, SPRING), (-hole, 0)]
    prisma('F11_fundo', col, cont, -0.42, -0.34, interior, tam=3.0)
    prisma('F11_vidro', col, cont, -0.56, -0.54, vidro, tam=3.0)
    # contorno da abóbada (perfil grosso) e soleira
    setor('F11_abobada', col, VR - 0.16, VR + 0.02, 0, 180, -0.68, -0.36, caixilho, cz=VC, n=40, bev=0.015, tam=1.2)
    for s in (-1, 1):
        caixa(f'F11_pe{s}', col, (0.18, 0.32, VC), (s * (VR - 0.07), -0.52, VC / 2), caixilho, bev=0.015, tam=1.2)
        caixa(f'F11_soleira{s}', col, (VR - hole, 0.36, 0.3), (s * (hole + VR) / 2, -0.52, 0.15), caixilho, bev=0.02, tam=1.2)
    # montantes verticais e travessas, recortados pelo vão e pela abóbada
    barras = []
    x = -VR + 0.6
    while x < VR - 0.3:
        z0 = 0.3 if abs(x) >= hole else SPRING + math.sqrt(hole * hole - x * x)
        z1 = vault_z(x) - 0.1
        if z1 - z0 > 0.2: barras.append(viga(f'F11_montante{len(barras)}', col, (x, -0.57, z0), (x, -0.57, z1), 0.07, 0.1, caixilho, bev=0.01))
        x += 0.62
    for z in (1.4, 2.8, 4.2, 5.4, 6.5):
        xv = math.sqrt(max(0.0, VR * VR - (z - VC) ** 2)) - 0.1 if z > VC else VR - 0.1
        xh = 0.0 if z >= SPRING + hole else (hole if z <= SPRING else math.sqrt(hole * hole - (z - SPRING) ** 2))
        for s in (-1, 1):
            if xv - xh > 0.2: barras.append(viga(f'F11_travessa{z}_{s}', col, (s * xh, -0.57, z), (s * xv, -0.57, z), 0.07, 0.1, caixilho, bev=0.01))
    junta(barras, 'F11_caixilhos')

    # --- arco de madeira (pernas + meia-lua) ---
    setor('F11_arco', col, RA0, RA1, 0, 180, -0.8, -0.4, madeira, n=36, bev=0.03, tam=1.6)
    for s in (-1, 1):
        caixa(f'F11_perna{s}', col, (RA1 - RA0, 0.52, SPRING), (s * (RA0 + RA1) / 2, -0.66, SPRING / 2), madeira, bev=0.03, tam=1.6)
        caixa(f'F11_base{s}', col, (0.6, 0.75, 0.3), (s * (RA0 + RA1) / 2, -0.72, 0.15), madeira, bev=0.03, tam=1.2)

    # --- videiras: dois troncos torcidos subindo pelo arco até o topo ---
    caminhos = []
    for s in (-1, 1):
        pts = [Vector((s * 4.75, -1.1, 0.08)), Vector((s * 4.5, -1.12, 0.7)), Vector((s * 4.22, -1.14, 1.6)), Vector((s * 4.08, -1.12, 2.5))]
        for i in range(0, 16):
            a = math.radians(i * 90 / 15) if s > 0 else math.radians(180 - i * 90 / 15)
            rr = 4.08 + 0.12 * math.sin(i * 1.3)
            q = Vector((rr * math.cos(a), -1.1 - 0.04 * math.sin(i * 0.9), SPRING + rr * math.sin(a)))
            if abs(q.x) < 1.4 and q.z > 6.0: q.y = -0.9   # passa por trás do medalhão
            pts.append(q)
        caminhos.append(pts)
        for fio in range(2):
            hel = []
            for i, p in enumerate(pts):
                t = i * 0.9 + fio * math.pi
                hel.append(p + Vector((0.07 * math.cos(t), 0.06 * math.sin(t), 0.07 * math.sin(t))))
            n = len(hel)
            tubo(f'F11_tronco{s}_{fio}', col, hel, [0.085 * (1 - i / n) + 0.03 for i in range(n)], casca, lados=7, tam=0.8)
        # galhos para fora e por cima da estufa
        for j in range(7):
            k = rnd.randint(3, len(pts) - 2); p0 = pts[k]
            out = Vector((p0.x, 0, p0.z - SPRING)).normalized() if p0.z > SPRING else Vector((s, 0, 0.3)).normalized()
            g = [p0]
            for m in range(1, 5):
                g.append(p0 + out * (0.32 * m) + Vector((rnd.uniform(-0.12, 0.12), 0.08 * m, rnd.uniform(-0.2, 0.15) * m * 0.5)))
            for u, g in enumerate(trechos(g, livre)):
                tubo(f'F11_galho{s}_{j}_{u}', col, g, [0.035 * (1 - i / len(g)) + 0.012 for i in range(len(g))], casca, lados=5, tam=0.6)
                caminhos.append(g)
        # gavinhas em espiral
        for j in range(4):
            p0 = pts[rnd.randint(4, len(pts) - 2)]
            esp = [p0 + Vector((0.12 * math.cos(t * 0.9) * (1 - t / 14), -0.06 - t * 0.01, -0.03 * t + 0.12 * math.sin(t * 0.9) * (1 - t / 14))) for t in range(14)]
            for u, e in enumerate(trechos(esp, livre)): tubo(f'F11_gavinha{s}_{j}_{u}', col, e, 0.01, casca, lados=4, tam=0.3)

    # --- folhas: ao longo dos troncos/galhos e cobrindo a faixa do arco e a coroa ---
    lista = []
    def poe_folha(p, frente=True, rumo=None, tam=(0.42, 0.72), plana=False):
        nrm = Vector((rnd.uniform(-0.75, 0.75), -1.0 if frente else -0.6, rnd.uniform(-0.35, 0.8)))
        if plana: nrm = Vector((rnd.uniform(-0.15, 0.15), -1.0, rnd.uniform(-0.1, 0.15)))
        s = rnd.uniform(*tam); giro = rnd.uniform(-2.4, 2.4)
        # confere os cantos do cartão antes de aceitar
        nz = nrm.normalized(); up = Vector((0, 0, 1)); ax = up.cross(nz).normalized(); ay = nz.cross(ax).normalized()
        if rumo is not None:   # folha crescendo para fora do arco
            d = Vector(rumo); d = (d - nz * d.dot(nz)).normalized()
            giro = math.atan2(ay.cross(d).dot(nz), ay.dot(d)) + rnd.uniform(-0.5, 0.5)
        rot = Matrix.Rotation(giro, 3, nz); ax = rot @ ax; ay = rot @ ay
        cantos = [p - ax * s * 0.5, p + ax * s * 0.5, p + ax * s * 0.5 + ay * s, p - ax * s * 0.5 + ay * s]
        if all(livre(c) for c in cantos) and livre(p) and livre(p + nz * s * 0.12) and livre(p + ay * s + nz * s * 0.12):
            lista.append((p, nrm, s, giro, rnd.randrange(8)))
    for cam in caminhos:
        for i in range(len(cam) - 1):
            for k in range(3):
                t = rnd.random(); p = cam[i].lerp(cam[i + 1], t)
                poe_folha(p + Vector((rnd.uniform(-0.3, 0.3), rnd.uniform(-0.12, 0.08), rnd.uniform(-0.3, 0.3))))
    n0 = len(lista); topo_ok = [0, 0]
    for i in range(260):   # folhas sobre a face do arco, crescendo para fora
        a = math.radians(rnd.uniform(-5, 185)); rr = rnd.uniform(3.48, 3.95)
        p = Vector((rr * math.cos(a), rnd.uniform(-1.2, -1.05), SPRING + rr * math.sin(a)))
        if p.x * p.x + (p.z - 7.35) ** 2 < 2.2:   # atrás do medalhão, de frente
            p.y = rnd.uniform(-0.88, -0.84); n1 = len(lista); poe_folha(p, rumo=(math.cos(a), 0, math.sin(a)), tam=(0.3, 0.48), plana=True)
            topo_ok[0] += len(lista) - n1; topo_ok[1] += 1; continue
        poe_folha(p, rumo=(math.cos(a), 0, math.sin(a)), tam=(0.38, 0.62))
    for i in range(110):   # pernas do arco
        sx = rnd.choice((-1, 1))
        p = Vector((sx * rnd.uniform(3.6, 3.95), rnd.uniform(-1.2, -0.98), rnd.uniform(0.2, 3.1)))
        poe_folha(p, rumo=(sx * 0.9, 0, 0.35), tam=(0.34, 0.55))
    say('folhas na face do arco', len(lista) - n0, 'topo', topo_ok)
    for i in range(70):    # moita nos canteiros
        s = rnd.choice((-1, 1)); a = rnd.uniform(0, math.pi)
        p = Vector((s * 5.25 + 0.6 * math.cos(a) * rnd.random(), rnd.uniform(-1.15, -0.6), 0.42 + 0.55 * math.sin(a) * rnd.random()))
        poe_folha(p)
    for i in range(950):
        a = math.radians(rnd.uniform(-8, 188)); rr = rnd.uniform(3.75, 5.6) if rnd.random() < 0.8 else rnd.uniform(5.6, 6.6)
        p = Vector((rr * math.cos(a), rnd.uniform(-1.22, -1.03), SPRING + rr * math.sin(a)))
        if p.z < 0.3: continue
        poe_folha(p)
    for i in range(140):   # pés cheios dos dois lados
        s = rnd.choice((-1, 1))
        p = Vector((s * rnd.uniform(3.95, 6.05), rnd.uniform(-1.22, -0.7), rnd.uniform(0.6, 3.6)))
        poe_folha(p)
    for i in range(80):    # plantas por dentro da estufa (atrás do vidro)
        x = rnd.uniform(-5.6, 5.6); z = rnd.uniform(0.2, 2.2)
        p = Vector((x, rnd.uniform(-0.5, -0.45), z))
        if abs(x) > hole + 0.2: lista.append((p, (rnd.uniform(-0.5, 0.5), -1, rnd.uniform(0, 0.6)), rnd.uniform(0.3, 0.5), rnd.uniform(-2, 2), rnd.randrange(8)))
    folhas('F11_folhas', col, lista, folha)
    say('folhas', len(lista))

    # --- cachos de uva ---
    def cacho(nome, x, y, z, alt=0.75, larg=0.68):
        bm = bmesh.new(); n = 0
        for i in range(58):
            t = rnd.random() ** 0.8
            rz = z - t * alt; w = larg * 0.5 * (1 - t * 0.75)
            ang = rnd.uniform(0, 2 * math.pi); rr = w * math.sqrt(rnd.random())
            q = Vector((x + rr * math.cos(ang), y + rr * math.sin(ang) * 0.7 - 0.05, rz))
            if not livre(q) or q.y < -1.2: continue
            g = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=rnd.uniform(0.075, 0.095))
            bmesh.ops.translate(bm, vec=q, verts=g['verts']); n += 1
        if n:
            o = objeto(nome, bm, col, uva)
            for p in o.data.polygons: p.use_smooth = True
        tubo(nome + '_cabo', col, [(x, y, z + 0.18), (x + 0.03, y - 0.02, z + 0.05), (x, y, z - 0.05)], 0.015, casca, lados=4)
    for k, (a, rr, alt) in enumerate(((143, 4.55, 0.85), (40, 4.45, 0.8), (170, 4.4, 0.65), (12, 4.55, 0.7), (68, 4.3, 0.6), (115, 4.25, 0.55))):
        x = rr * math.cos(math.radians(a)); z = SPRING + rr * math.sin(math.radians(a))
        cacho(f'F11_uva{k}', x, -1.1, z, alt=alt * 1.45)

    # --- canteiros na base com plantas ---
    for s in (-1, 1):
        o = parte('planter_box_01', 'planter_box_01', col, f'F11_canteiro{s}', s * 5.25, -0.86, 0.0, larg=1.5)
        leve(o, 0.25)

    # --- fio de luz verde (a magia da colheita) em espiral pelo lado direito ---
    esp = []
    for i in range(70):
        t = i / 69
        a = math.radians(-20 + 120 * t)
        rr = 4.35 + 0.35 * math.sin(t * 9)
        esp.append(Vector((rr * math.cos(a) * (1 if t < 0.9 else 1), -1.18 + 0.05 * math.sin(t * 13), SPRING - 1.6 + 5.0 * t)))
    runs = trechos(esp, livre); esp = [p for r_ in runs for p in r_]
    for u, r_ in enumerate(runs): tubo(f'F11_fio_verde{u}', col, r_, 0.025, brilho, lados=5, tam=1.0)
    vag = bmesh.new()
    for i in range(40):
        p = esp[rnd.randrange(len(esp))] + Vector((rnd.uniform(-0.4, 0.4), rnd.uniform(-0.05, 0.08), rnd.uniform(-0.4, 0.4)))
        if livre(p) and p.y > -1.22:
            g = bmesh.ops.create_icosphere(vag, subdivisions=0, radius=rnd.uniform(0.015, 0.035)); bmesh.ops.translate(vag, vec=p, verts=g['verts'])
    objeto('F11_vagalumes', vag, col, brilho)

    confere(col)
    agrupa(col, 'F11')
    fundo()
    previas('f101112_f11', 33)
    fecha('fachada_11', col)

rodar(main)
