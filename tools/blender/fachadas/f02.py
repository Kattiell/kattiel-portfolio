# Fachada 02 (Alvenaria): portão de castelo como na referência — muralha de pedra com arco de aduelas,
# torres laterais com ameias e seteiras, estandartes vinho, tochas. Andar de cima (altura livre ~9 m).
import sys, importlib, math
sys.path.insert(0, r'C:\Users\Gabriel Caetano\Downloads\Claud Code\batcaverna\tools\blender\fachadas')
import lib; importlib.reload(lib)
from lib import *

col = colecao('F02')
pedra = material('F02_pedra', 'castle_wall_varriation', tint=(1.0, 1.0, 1.0))
bloco = material('F02_bloco', 'medieval_blocks_03', tint=(1.0, 1.0, 1.0))
escura = cor('F02_escuro', (0.02, 0.02, 0.025), rough=0.9)
vinho = material('F02_tecido', 'fabric_pattern_07', tint=(0.55, 0.09, 0.14))
ouro = cor('F02_ouro', (0.85, 0.62, 0.25), rough=0.3, metal=1.0)

# muralha central com o vão
parede_arco('F02_muralha', col, 8.4, 7.4, 2.0, pedra, frente=-0.55, tam=3.4)
aduelas('F02_aduela', col, bloco, frente=-0.75)
# cornija + ameias por cima da muralha
caixa('F02_cornija', col, (8.6, 0.9, 0.35), (0, -0.45, 7.55), bloco, bev=0.04, tam=1.6)
ameias('F02_ameia', col, bloco, -3.95, 3.95, 7.72, -0.85, 0.7)

# torres: corpo, base mais larga, coroamento saliente com ameias e seteiras
for s in (-1, 1):
    x = s * 5.05
    caixa(f'F02_torre{s}', col, (2.3, 2.6, 8.4), (x, 0.0, 4.2), pedra, bev=0.05, tam=3.4)
    caixa(f'F02_base{s}', col, (2.6, 2.9, 1.0), (x, 0.0, 0.5), bloco, bev=0.06, tam=1.6)
    caixa(f'F02_coroa{s}', col, (2.7, 3.0, 0.4), (x, 0.0, 8.6), bloco, bev=0.04, tam=1.6)
    ameias(f'F02_tameia{s}', col, bloco, x - 1.35, x + 1.35, 8.8, -1.5, 0.6, larg=0.6, vao=0.36)
    for z in (2.1, 7.35):
        caixa(f'F02_seteira{s}_{z}', col, (0.16, 0.2, 0.95), (x, -1.31, z), escura, bev=0.0)
    # estandarte vinho, pendurado na torre, com leve ondulação e ponta em V
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=6, y_segments=16, size=0.5)
    for v in bm.verts:
        u = v.co.x; t = v.co.y
        v.co = Vector((u * 1.1, -1.38 - 0.05 * math.sin(t * 7 + u * 3) * (0.5 - t), 4.7 + t * 3.2))
        if t < -0.45: v.co.z -= 0.25 * (1 - abs(u) * 2)
    o = objeto(f'F02_estandarte{s}', bm, col, vinho); o.location.x = x; uv_mundo(o, 1.2)
    caixa(f'F02_haste{s}', col, (1.4, 0.08, 0.08), (x, -1.4, 6.35), ouro, bev=0.0)
    caixa(f'F02_suporte{s}', col, (0.08, 0.45, 0.08), (s * 3.75, -0.75, 4.95), escura, bev=0.0)
    lanterna(col, f'F02_lanterna{s}', s * 3.75, -1.0, 3.9, altura=1.1)

# emblema dourado (losango com cruz) no estandarte, como na referência
for s in (-1, 1):
    caixa(f'F02_emblema{s}', col, (0.5, 0.04, 0.5), (s * 5.05, -1.43, 5.2), ouro, bev=0.0, rot=(0, math.radians(45), 0))
    caixa(f'F02_emblemaX{s}', col, (0.06, 0.05, 0.62), (s * 5.05, -1.46, 5.2), escura, bev=0.0)
print('F02 ok', len(col.objects))
