import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bc_comum as C, bpy
def main(a):
    C.say('blender', bpy.app.version_string)
C.run(main)
