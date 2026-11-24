# Prévia de conjunto: fachadas 05 e 06 montadas nas posições do mundo (galeria superior), no ângulo das artes.
import sys; sys.path.insert(0, r'C:\Users\Gabriel Caetano\Downloads\Claud Code\batcaverna\tools\blender\oficina\f0506')
from f0506_comum import *

def monta(nome, phi, col_dst):
    path = os.path.join(CENAS, nome + '.blend')
    with bpy.data.libraries.load(path, link=False) as (src, dst): dst.collections = [c for c in src.collections if c.startswith('F0')]
    c = dst.collections[0]; bpy.context.scene.collection.children.link(c)
    a = math.radians(phi); M = Matrix.Translation((38 * math.sin(a), 38 * math.cos(a), 15)) @ Matrix.Rotation(-a, 4, 'Z')
    bpy.context.view_layer.update()
    mats = {o.name: o.matrix_world.copy() for o in c.all_objects}
    for o in c.all_objects:
        if o.parent is None: o.matrix_world = M @ mats[o.name]
    # piso da galeria e paredão de rocha em volta da boca (só prévia)
    rocha = material('PREV_rocha', 'rock_wall_08' if False else 'castle_wall_varriation', tint=(0.18, 0.2, 0.24))
    bm = bm_caixa(12.6, 5.0, 0.4, (0, -2.5, -0.2))
    for (dx, dz, cx, cz) in ((3.0, 14, -4.8, 4), (3.0, 14, 4.8, 4), (6.6, 6, 0, 9.2)):
        b2 = bm_caixa(dx, 1.0, dz, (cx, 0.9, cz)); me = bpy.data.meshes.new('t'); b2.to_mesh(me); b2.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)
    o = objeto('PREV_entorno_' + nome, bm, col_dst, rocha); o.matrix_world = M; bpy.context.view_layer.update(); uv_mundo(o, 4.0)
    return M

def main(args):
    C.limpa()
    col = colecao('PREV_conjunto')
    monta('fachada_05', 33, col); monta('fachada_06', 52, col)
    for phi, cor_ in ((33, (0.3, 0.45, 1.0)), (52, (1.0, 0.8, 0.5))):
        a = math.radians(phi); luz_prev(f'p{phi}', 'POINT', (36 * math.sin(a), 36 * math.cos(a), 19), cor_, 1500, tam=2)
    luz_prev('chave', 'AREA', (0, -10, 30), (0.6, 0.75, 1.0), 6000, tam=20, alvo=(25, 28, 18))
    bpy.context.scene.view_settings.view_transform = 'Standard'
    previa('f0506_conjunto_entrada', cam=(-2, -34, 11), alvo=(25.5, 27.5, 19.5), lente=72, luz=False)
    previa('f0506_conjunto_diag', cam=(-12, -6, 13), alvo=(25.5, 27.5, 19.5), lente=60, luz=False)
    previa('f0506_conjunto_frente', cam=(9, 3, 16.5), alvo=(25.5, 27.5, 19.0), lente=42, luz=False)
rodar(main)
