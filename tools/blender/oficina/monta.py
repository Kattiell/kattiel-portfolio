"""Sala de montagem: junta no Blender ABERTO tudo o que os agentes entregaram (cenas/*.blend).
Fachadas (coleções FNN) vão para r=38 no φ do portal, viradas para o centro; áreas (A_*) entram como estão.
Rodar no Blender aberto:  python tools/blender/bmcp.py tools/blender/oficina/monta.py
"""
import bpy, os, math
from mathutils import Vector
CENAS = r'C:\Users\Gabriel Caetano\Downloads\Claud Code\batcaverna\tools\blender\cenas'
ANG = [-52, -33, -14, 14, 33, 52]

master = bpy.data.collections.get('BATCAVERNA') or bpy.data.collections.new('BATCAVERNA')
if master.name not in bpy.context.scene.collection.children: bpy.context.scene.collection.children.link(master)
for c in list(master.children):  # remonta do zero
    for o in list(c.all_objects): bpy.data.objects.remove(o)
    bpy.data.collections.remove(c)

feitos = []
for fn in sorted(os.listdir(CENAS)):
    if not fn.endswith('.blend'): continue
    path = os.path.join(CENAS, fn)
    with bpy.data.libraries.load(path, link=False) as (src, dst):
        dst.collections = [n for n in src.collections if n.startswith('F') and n[1:3].isdigit() or n.startswith('A_')]
    for col in dst.collections:
        if col is None: continue
        master.children.link(col); feitos.append(col.name)
        if col.name.startswith('F') and col.name[1:3].isdigit():
            n = int(col.name[1:3]); phi = math.radians(ANG[(n - 1) % 6]); z = 15 if n <= 6 else 7
            # referencial do portal → mundo: salão em -Y local; mundo Blender: three(x,y,z)=(x,-z,y); boca em r=38
            px, pz3 = 38 * math.sin(phi), -38 * math.cos(phi)
            emp = bpy.data.objects.new(f'{col.name}_ancora', None); master.objects.link(emp)
            emp.location = (px, -pz3, z); emp.rotation_euler = (0, 0, -phi)
            for o in col.objects:
                if o.parent is None: o.parent = emp
print('montado:', feitos)
