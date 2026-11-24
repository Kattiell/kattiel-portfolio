import sys; sys.path.insert(0, r'C:\Users\Gabriel Caetano\Downloads\Claud Code\batcaverna\tools\blender\oficina')
from kit import *
def main(args):
    say('versao', bpy.app.version_string)
    sc = bpy.context.scene
    say('engines', [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items])
    say('view', [e.identifier for e in sc.view_settings.bl_rna.properties['view_transform'].enum_items])
    say('use_nodes' , hasattr(sc, 'use_nodes'), hasattr(sc, 'compositing_node_group'))
    say('eevee props', [p.identifier for p in sc.eevee.bl_rna.properties][:200])
    L = bpy.data.lights.new('x', 'POINT'); say('light props', [p.identifier for p in L.bl_rna.properties])
    ng = bpy.data.node_groups.new('t', 'CompositorNodeTree') if hasattr(sc, 'compositing_node_group') else None
    tree = ng
    if tree is None:
        sc.use_nodes = True; tree = sc.node_tree
    g = tree.nodes.new('CompositorNodeGlare')
    say('glare props', [p.identifier for p in g.bl_rna.properties][-20:], [i.name for i in g.inputs])
    try: say('glare types', [e.identifier for e in g.bl_rna.properties['glare_type'].enum_items])
    except Exception as e: say(e)
rodar(main)
