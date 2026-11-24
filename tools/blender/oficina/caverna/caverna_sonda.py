import sys; sys.path.insert(0, r'C:\Users\Gabriel Caetano\Downloads\Claud Code\batcaverna\tools\blender\oficina')
from kit import *
IDS = ['rock_face_01','rock_face_02','boulder_01','rock_moss_set_01','rock_moss_set_02','namaqualand_boulder_02','namaqualand_boulder_03','namaqualand_boulder_05','coast_rocks_05','rock_07','rock_09','moss_01','namaqualand_cliff_02']
def main(args):
    C.limpa(); say('blender', bpy.app.version_string)
    for pid in IDS:
        try:
            o = ph_modelo(pid)
            mats = [s.material.name for s in o.material_slots if s.material]
            say(pid, 'tris', C.tris(o), 'dims', tuple(round(v,2) for v in o.dimensions), 'mats', mats)
            bpy.data.objects.remove(o)
        except Exception as e: say(pid, 'ERRO', e)
rodar(main)
