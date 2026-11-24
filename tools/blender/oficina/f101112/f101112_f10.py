# Fachada 10 (Pecuária): celeiro de madeira em enxaimel, empena com telhado de ardósia, arco de mãos-francesas
# curvas em volta da boca, crânio de touro dourado, cercas na frente, fardos de feno e lanternas.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from f101112_comum import *

S = math.tan(math.radians(30))       # inclinação do telhado
TOPO = 7.56                           # topo da telha na cumeeira (a capa chega a 7.6)
ESP = 0.25                            # espessura do telhado (a borda de ardósia aparece na frente)
def sob(x): return TOPO - ESP - abs(x) * S   # face de baixo do telhado

def cranio(col, nome, x, y, z, k, ouro, escuro):
    """Crânio de touro de chifres longos: placa escura com contorno, olhos e focinho dourados."""
    meia = [(0, 0.42), (0.14, 0.42), (0.26, 0.36), (0.31, 0.22), (0.27, 0.06), (0.21, -0.12), (0.16, -0.32), (0.12, -0.48), (0.07, -0.56), (0, -0.58)]
    cont = [(px, pz) for px, pz in meia] + [(-px, pz) for px, pz in reversed(meia[1:-1])]
    cont = [(x + px * k, z + pz * k) for px, pz in cont]
    partes = [prisma(nome + '_placa', col, list(reversed(cont)), y, y + 0.08 * k, escuro, bev=0.01 * k, tam=0.8)]
    aro = [(cx, y - 0.01, cz) for cx, cz in cont] + [(cont[0][0], y - 0.01, cont[0][1])]
    partes.append(tubo(nome + '_aro', col, aro, 0.028 * k, ouro, lados=6))
    for s in (-1, 1):
        olho = [(x + s * 0.13 * k + 0.07 * k * math.cos(t * math.pi / 6), y - 0.02, z + 0.13 * k + 0.05 * k * math.sin(t * math.pi / 6)) for t in range(13)]
        partes.append(tubo(f'{nome}_olho{s}', col, olho, 0.018 * k, ouro, lados=5))
        chifre = [(0.27, 0.30), (0.42, 0.36), (0.58, 0.37), (0.74, 0.42), (0.86, 0.53), (0.94, 0.68), (0.97, 0.8)]
        partes.append(tubo(f'{nome}_chifre{s}', col, [(x + s * cx * k, y + 0.03 * k, z + cz * k) for cx, cz in chifre],
                           [0.075 * k * (1 - i / 7.5) + 0.008 for i in range(7)], ouro, lados=8))
        partes.append(tubo(f'{nome}_narina{s}', col, [(x + s * 0.05 * k, y - 0.02, z - 0.38 * k), (x + s * 0.09 * k, y - 0.02, z - 0.47 * k), (x + s * 0.05 * k, y - 0.02, z - 0.53 * k)], 0.016 * k, ouro, lados=5))
    partes.append(tubo(nome + '_focinho', col, [(x, y - 0.02, z + 0.3 * k), (x, y - 0.02, z - 0.3 * k)], 0.018 * k, ouro, lados=5))
    return partes

def fardo(col, nome, x, y, z, feno, corda, rz=0.0, d=(1.05, 0.55, 0.45)):
    o = caixa(nome, col, d, (x, y, z + d[2] / 2), feno, bev=0.07, tam=0.9, rot=(0, 0, rz))
    for i, dx in enumerate((-0.25, 0.25)):
        c = caixa(f'{nome}_corda{i}', col, (0.035, d[1] + 0.02, d[2] + 0.02), (dx, 0, 0), corda, bev=0.0)
        c.parent = o; c.location = (dx / 1.0, 0, 0)
    return o

def main(args):
    C.limpa()
    col = colecao('F10')
    madeira = material('F10_madeira', 'rough_wood', tint=(0.78, 0.48, 0.28))
    tabuas = material('F10_tabuas', 'weathered_planks', tint=(0.55, 0.38, 0.26))
    telha = material('F10_telha', 'roof_slates_02', tint=(0.5, 0.53, 0.58))
    feno = material('F10_feno', 'reed_roof_04', tint=(1.0, 0.82, 0.48))
    escuro = material('F10_cranio', 'rough_wood', tint=(0.32, 0.2, 0.13))
    ouro = cor('F10_ouro', (0.85, 0.62, 0.25), rough=0.3, metal=1.0)
    ferro = cor('F10_ferro', (0.05, 0.05, 0.055), rough=0.5, metal=0.9)
    corda = cor('F10_corda', (0.45, 0.33, 0.18), rough=0.9)

    # --- parede de tábuas da empena (atrás do enxaimel), com o vão em arco ---
    r = R + 0.1
    cont = [(-6.15, 0), (-6.15, sob(6.15) - 0.02), (0, sob(0) - 0.02), (6.15, sob(6.15) - 0.02), (6.15, 0), (r, 0), (r, SPRING)]
    cont += [(r * math.cos(math.pi * i / 32), SPRING + r * math.sin(math.pi * i / 32)) for i in range(1, 32)] + [(-r, SPRING), (-r, 0)]
    prisma('F10_parede', col, list(reversed(cont)), -0.5, -0.1, tabuas, tam=2.4)

    # --- telhado em duas águas: ardósia por cima, forro de tábuas por baixo ---
    for s in (-1, 1):
        c = [(0, TOPO), (s * 6.2, TOPO - 6.2 * S), (s * 6.2, TOPO - 6.2 * S - ESP), (0, TOPO - ESP)]
        if s > 0: c = list(reversed(c))
        o = prisma(f'F10_telhado{s}', col, c, -0.93, 1.3, telha, tam=2.0)
        o.data.materials.append(tabuas)
        for f in o.data.polygons:
            if f.normal.z < -0.3: f.material_index = 1
        # beiral: tábua de testeira na frente, cobrindo a ponta da telha
        tb = [(0, TOPO - ESP + 0.02), (s * 6.2, TOPO - 6.2 * S - ESP + 0.02), (s * 6.2, TOPO - 6.2 * S - ESP - 0.2), (0, TOPO - ESP - 0.2)]
        if s > 0: tb = list(reversed(tb))
        prisma(f'F10_testeira{s}', col, tb, -0.98, -0.88, madeira, bev=0.012, tam=1.6)
        # terças por baixo do telhado (correm para dentro, como no celeiro da arte)
        for i, x in enumerate((1.6, 3.1, 4.6, 5.9)):
            z = sob(x) - 0.3
            caixa(f'F10_terca{s}_{i}', col, (0.16, 2.1, 0.18), (s * x, 0.15, z), madeira, bev=0.02, tam=1.6)
    viga('F10_cumeeira', col, (0, -0.95, 7.52), (0, 1.3, 7.52), 0.22, 0.16, madeira)

    # --- enxaimel da frente ---
    for s in (-1, 1):
        xp = s * 3.55; xo = s * 5.85
        caixa(f'F10_poste{s}', col, (0.4, 0.4, sob(3.55) - 0.25), (xp, -0.75, (sob(3.55) - 0.25) / 2 + 0.25), madeira, bev=0.035, tam=1.6)
        caixa(f'F10_postef{s}', col, (0.32, 0.32, sob(5.85) - 0.2), (xo, -0.75, (sob(5.85) - 0.2) / 2 + 0.2), madeira, bev=0.03, tam=1.6)
        for nm, x, w in (('sapata', xp, 0.6), ('sapataf', xo, 0.48)):
            caixa(f'F10_{nm}{s}', col, (w, w, 0.26), (x, -0.75, 0.13), escuro, bev=0.03, tam=1.2)
        # frechal entre os postes, mãos-francesas em X debaixo dele
        zf = sob(6.2) - 0.22
        caixa(f'F10_frechal{s}', col, (2.65, 0.3, 0.28), (s * 4.85, -0.78, zf), madeira, bev=0.025, tam=1.6)
        viga(f'F10_maoA{s}', col, (s * 3.8, -0.78, zf - 1.05), (s * 4.75, -0.78, zf - 0.12), 0.2, 0.16, madeira)
        viga(f'F10_maoB{s}', col, (s * 5.65, -0.78, zf - 1.05), (s * 4.95, -0.78, zf - 0.12), 0.2, 0.16, madeira)
        # caibro principal sob a testeira (dá espessura à empena)
        viga(f'F10_caibro{s}', col, (s * 0.3, -0.75, sob(0.3) - 0.32), (s * 6.1, -0.75, sob(6.1) - 0.32), 0.22, 0.2, madeira)
        # escora radial do arco até o caibro
        a = math.radians(90 - s * 55)
        p0 = (3.55 * math.cos(a), -0.78, SPRING + 3.55 * math.sin(a))
        t = (sob(0) - 0.35 - SPRING) / (math.sin(a) + abs(math.cos(a)) * S)
        viga(f'F10_escora{s}', col, p0, (t * math.cos(a), -0.78, SPRING + t * math.sin(a)), 0.18, 0.16, madeira)
        # arco: duas mãos-francesas curvas saindo dos postes
        setor(f'F10_arco{s}', col, R + 0.1, 3.55, 0 if s > 0 else 91, 89 if s > 0 else 180, -0.96, -0.6, madeira, n=20, bev=0.02)
        # cerca de três réguas na frente
        xs = [3.95, 4.7, 5.45, 6.1]
        for i, x in enumerate(xs):
            caixa(f'F10_mourao{s}_{i}', col, (0.16, 0.16, 1.35), (s * x, -1.1, 0.675), madeira, bev=0.02, tam=1.2)
        for j, z in enumerate((0.4, 0.78, 1.15)):
            caixa(f'F10_regua{s}_{j}', col, (2.3, 0.08, 0.16), (s * 5.03, -1.22, z), tabuas, bev=0.012, tam=1.2)
        viga(f'F10_xis{s}', col, (s * 3.98, -1.17, 0.3), (s * 4.68, -1.17, 1.0), 0.11, 0.05, tabuas)
        # crânio de touro no poste principal
        cranio(col, f'F10_cranio{s}', s * 3.75, -1.1, 4.0, 0.9, ouro, escuro)
        # lanterna pendurada num braço de ferro, por fora do poste
        viga(f'F10_braco{s}', col, (s * 3.76, -0.9, 3.22), (s * 4.3, -1.08, 3.22), 0.05, 0.05, ferro, bev=0.0)
        lanterna_leve(col, f'F10_lanterna{s}', s * 4.3, -1.08, 2.25, altura=0.92, forca=14.0)
    # pendural do centro (fica atrás do medalhão)
    caixa('F10_pendural', col, (0.3, 0.3, sob(0) - 6.55), (0, -0.78, 6.55 + (sob(0) - 6.55) / 2), madeira, bev=0.02)

    # --- fardos de feno ---
    fardo(col, 'F10_fardo1', 4.95, -0.42, 0.0, feno, corda)
    fardo(col, 'F10_fardo2', 4.95, -0.42, 0.45, feno, corda, rz=0.08)
    fardo(col, 'F10_fardo3', 5.5, 0.05, 0.9, feno, corda, rz=-0.05, d=(1.0, 0.5, 0.42))
    fardo(col, 'F10_fardo5', 5.0, -0.5, 0.9, feno, corda, rz=0.12, d=(0.95, 0.5, 0.42))
    fardo(col, 'F10_fardo4', -4.9, -0.45, 0.0, feno, corda, rz=-0.06)
    fardo(col, 'F10_fardo6', -5.2, -0.45, 0.45, feno, corda, rz=0.1, d=(0.95, 0.5, 0.42))
    # balde de madeira e samambaias no telhado (verde na arte)
    parte('wooden_bucket_01', ['wooden_bucket_01', 'wooden_bucket_01_handle'], col, 'F10_balde', -4.25, -0.5, 0.0, altura=0.42)

    # mato e trepadeira sobre o telhado (o verde que aparece no alto da arte)
    rnd = random.Random(10); lista = []
    for i in range(150):
        s = rnd.choice((-1, 1)) if i > 20 else -1
        x = s * rnd.uniform(1.4, 5.6); y = rnd.uniform(-0.85, 0.9)
        z = TOPO - abs(x) * S + 0.02
        if x * x + (z - 7.35) ** 2 < 2.4 and y < -0.4: continue
        nrm = (s * S * 0.7 + rnd.uniform(-0.3, 0.3), rnd.uniform(-0.9, -0.2), 1.0)
        lista.append(((x, y, z), nrm, rnd.uniform(0.28, 0.5), rnd.uniform(-2.5, 2.5), rnd.randrange(8)))
    for i in range(26):   # pendendo da testeira à esquerda, como na arte
        x = -rnd.uniform(2.9, 4.4); z = TOPO - ESP - abs(x) * S - rnd.uniform(0.0, 0.25)
        lista.append(((x, -1.0, z), (rnd.uniform(-0.3, 0.3), -1, rnd.uniform(-0.2, 0.3)), rnd.uniform(0.25, 0.4), math.pi + rnd.uniform(-0.8, 0.8), rnd.randrange(8)))
    folhas('F10_mato', col, lista, mat_folhas('F10_folha'))

    confere(col)
    agrupa(col, 'F10')
    fundo()
    previas('f101112_f10', 14)
    fecha('fachada_10', col)

rodar(main)
