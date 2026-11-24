import sys; sys.path.insert(0, r'C:\Users\Gabriel Caetano\Downloads\Claud Code\batcaverna\tools\blender\oficina')
from kit import *
def main(args):
    C.limpa()
    col = colecao('TESTE')
    pedra = material('TESTE_pedra', 'castle_wall_varriation')
    parede_arco('TESTE_parede', col, 8.4, 7.4, 2.0, pedra, frente=-0.55, tam=3.4)
    lanterna(col, 'TESTE_lant', 3.7, -1.0, 3.9, altura=1.1)
    modelo('bull_head', col, 'TESTE_touro', -3.7, -1.0, 5.0, altura=1.0)
    previa('teste_kit')
    fecha('teste_kit', col)
rodar(main)
