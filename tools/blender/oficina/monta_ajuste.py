import bpy, math
from mathutils import Vector, Euler
m = bpy.data.collections['BATCAVERNA']
luz = bpy.data.collections.get('A_LUZ')
if luz:
    for o in list(luz.all_objects): bpy.data.objects.remove(o)
    bpy.data.collections.remove(luz)
f2 = bpy.data.collections.get('F02')
if f2 and f2.name not in m.children:
    bpy.context.scene.collection.children.unlink(f2); m.children.link(f2)
    phi = math.radians(-33); emp = bpy.data.objects.new('F02_ancora', None); m.objects.link(emp)
    emp.location = (38 * math.sin(phi), 38 * math.cos(phi), 15); emp.rotation_euler = (0, 0, -phi)
    for o in f2.objects:
        if o.parent is None: o.parent = emp
car = bpy.data.collections.get('A_CARRO')
if car:
    for o in car.objects:
        if o.parent is None: o.location = (-23.5, -5.0, 1.5); o.rotation_euler = (0, 0, math.radians(110))
# esconde sobras fora do projeto (peças do Poly Haven baixadas antes)
for o in bpy.context.scene.collection.objects: o.hide_set(True)
for a in bpy.context.screen.areas:
    if a.type == 'VIEW_3D':
        sp = a.spaces[0]; sp.shading.type = 'MATERIAL'; sp.clip_end = 1000
        r3 = sp.region_3d; r3.view_perspective = 'PERSP'
        r3.view_location = Vector((0, 10, 10)); r3.view_distance = 58
        r3.view_rotation = Euler((math.radians(80), 0, 0)).to_quaternion()
print('ok')
