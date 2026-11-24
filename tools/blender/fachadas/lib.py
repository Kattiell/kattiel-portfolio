"""Biblioteca das fachadas dos portais (roda dentro do Blender aberto, via bmcp.py).

Referencial de cada fachada: boca do portal na origem, chão em z=0, salão para -Y
(o glTF exporta +Y up, então no three o salão fica em +Z, igual ao grupo do portal).
Regras do nicho: largura útil ~12 m, altura <= 7 m no andar de baixo, saliência <= 1.3 m (y >= -1.3).
"""
import bpy, bmesh, math, os, json, random, urllib.request
from mathutils import Vector, Matrix

W, H = 6.4, 6.2
R = W / 2; SPRING = H - R
ROOT = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(ROOT, '..', 'cache', 'ph'); os.makedirs(CACHE, exist_ok=True)
UA = {'User-Agent': 'batcaverna-blender/1.0'}

# ---------------- coleção ----------------
def colecao(nome):
    col = bpy.data.collections.get(nome) or bpy.data.collections.new(nome)
    if col.name not in bpy.context.scene.collection.children: bpy.context.scene.collection.children.link(col)
    for o in list(col.objects): bpy.data.objects.remove(o)
    for m in list(bpy.data.materials):
        if m.name.startswith(nome + '_'): bpy.data.materials.remove(m)
    return col

def ligar(o, col):
    for c in list(o.users_collection): c.objects.unlink(o)
    col.objects.link(o); return o

# ---------------- texturas Poly Haven ----------------
def _baixa(url, dst):
    if not os.path.exists(dst):
        tmp = dst + '.%d.part' % os.getpid()  # atômico: vários agentes baixam em paralelo
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r, open(tmp, 'wb') as f: f.write(r.read())
        try: os.replace(tmp, dst)
        except OSError: os.remove(tmp)
    return dst

def ph_textura(pid, res='1k'):
    meta_p = os.path.join(CACHE, pid + '.json')
    if not os.path.exists(meta_p): _baixa(f'https://api.polyhaven.com/files/{pid}', meta_p)
    meta = json.load(open(meta_p, encoding='utf-8'))
    out = {}
    if 'Diffuse' not in meta:  # tecidos têm variações de cor col_1, col_2...
        for alt in ('col_1', 'col_01', 'col_2', 'col_03'):
            if alt in meta: meta['Diffuse'] = meta[alt]; break
    for k, key in (('diff', 'Diffuse'), ('nor', 'nor_gl'), ('rough', 'Rough'), ('ao', 'AO'), ('arm', 'arm')):
        if key in meta and res in meta[key]:
            fmt = 'jpg' if 'jpg' in meta[key][res] else 'png'
            out[k] = _baixa(meta[key][res][fmt]['url'], os.path.join(CACHE, f'{pid}_{k}_{res}.{fmt}'))
    return out

def material(nome, pid, tint=(1, 1, 1), rough_k=1.0, metal=0.0, nor_k=1.0, emiss=None):
    """Principled com mapas PH ligados direto (o exportador glTF entende sem nó de mapeamento)."""
    m = bpy.data.materials.get(nome)
    if m: return m
    t = ph_textura(pid)
    m = bpy.data.materials.new(nome); m.use_nodes = True
    nt = m.node_tree; n = nt.nodes; l = nt.links
    bsdf = n['Principled BSDF']; bsdf.inputs['Metallic'].default_value = metal
    def img(path, cs):
        node = n.new('ShaderNodeTexImage'); node.image = bpy.data.images.load(path, check_existing=True)
        node.image.colorspace_settings.name = cs; return node
    d = img(t['diff'], 'sRGB')
    if tint != (1, 1, 1):
        mix = n.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = 1
        mix.inputs['B'].default_value = (*tint, 1); l.new(d.outputs['Color'], mix.inputs['A']); l.new(mix.outputs['Result'], bsdf.inputs['Base Color'])
    else:
        l.new(d.outputs['Color'], bsdf.inputs['Base Color'])
    if 'rough' in t:
        r = img(t['rough'], 'Non-Color'); l.new(r.outputs['Color'], bsdf.inputs['Roughness'])
    if 'nor' in t:
        nn = img(t['nor'], 'Non-Color'); nm = n.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nor_k
        l.new(nn.outputs['Color'], nm.inputs['Color']); l.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    if emiss:
        bsdf.inputs['Emission Color'].default_value = (*emiss[0], 1); bsdf.inputs['Emission Strength'].default_value = emiss[1]
    return m

def cor(nome, rgb, rough=0.5, metal=0.0, emiss=0.0):
    m = bpy.data.materials.get(nome)
    if m: return m
    m = bpy.data.materials.new(nome); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emiss: b.inputs['Emission Color'].default_value = (*rgb, 1); b.inputs['Emission Strength'].default_value = emiss
    return m

# ---------------- malha ----------------
def objeto(nome, bm, col, mat=None):
    me = bpy.data.meshes.new(nome); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(nome, me); col.objects.link(o)
    if mat: me.materials.append(mat)
    return o

def uv_mundo(o, tam=2.0):
    """UV em caixa na escala do mundo: 1 repetição da textura a cada `tam` metros."""
    bm = bmesh.new(); bm.from_mesh(o.data); uv = bm.loops.layers.uv.verify()
    mw = o.matrix_world
    for f in bm.faces:
        nrm = (mw.to_3x3() @ f.normal).normalized(); ax = max(range(3), key=lambda i: abs(nrm[i]))
        for lp in f.loops:
            p = mw @ lp.vert.co
            u, v = ((p.y, p.z) if ax == 0 else (p.x, p.z) if ax == 1 else (p.x, p.y))
            if ax == 0 and nrm.x < 0: u = -u
            if ax == 1 and nrm.y > 0: u = -u
            lp[uv].uv = (u / tam, v / tam)
    bm.to_mesh(o.data); bm.free()
    return o

def caixa(nome, col, dims, loc, mat, bev=0.03, rot=(0, 0, 0), tam=2.0):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(dims), verts=bm.verts)
    if bev > 0: bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bev, segments=2, affect='EDGES', profile=0.5)
    o = objeto(nome, bm, col, mat); o.location = loc; o.rotation_euler = rot
    bpy.context.view_layer.update(); uv_mundo(o, tam); return o

def parede_arco(nome, col, larg, alt, esp, mat, folga=0.1, frente=-0.6, tam=2.5):
    """Parede com o vão em arco do portal (n-gon em U extrudado, sem booleano)."""
    r = R + folga; sp = SPRING
    pts = [(-larg / 2, 0), (-larg / 2, alt), (larg / 2, alt), (larg / 2, 0), (r, 0), (r, sp)]
    for i in range(1, 32): a = math.pi * i / 32; pts.append((r * math.cos(a), sp + r * math.sin(a)))
    pts += [(-r, sp), (-r, 0)]
    bm = bmesh.new(); vs = [bm.verts.new((x, frente, z)) for x, z in pts]
    f = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f]); nv = [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=Vector((0, esp, 0)), verts=nv)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = objeto(nome, bm, col, mat); uv_mundo(o, tam); return o

def aduelas(nome, col, mat, n=15, folga=0.1, prof=0.5, alt=0.62, frente=-0.75, chave=1.35, seed=2):
    """Blocos de pedra em volta do arco (aduelas), com pedra-chave maior."""
    rnd = random.Random(seed); r0 = R + folga; objs = []
    for i in range(n):
        a0 = math.pi * i / n; a1 = math.pi * (i + 1) / n; am = (a0 + a1) / 2
        k = chave if i == n // 2 else 1.0
        rin = r0 - 0.02; rout = r0 + alt * k * rnd.uniform(0.92, 1.08)
        bm = bmesh.new(); g = 0.018
        quad = [(rin, a0 + g), (rout, a0 + g), (rout, a1 - g), (rin, a1 - g)]
        vf = [bm.verts.new((rr * math.cos(a), frente, SPRING + rr * math.sin(a))) for rr, a in quad]
        f = bm.faces.new(vf)
        ext = bmesh.ops.extrude_face_region(bm, geom=[f]); nv = [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]
        bmesh.ops.translate(bm, vec=Vector((0, prof * (1.15 if k > 1 else 1), 0)), verts=nv)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=0.025, segments=2, affect='EDGES')
        if k > 1: bmesh.ops.translate(bm, vec=Vector((0, -0.08, 0)), verts=bm.verts)
        o = objeto(f'{nome}_{i:02d}', bm, col, mat); uv_mundo(o, 1.6); objs.append(o)
    # pés-direitos (ombreiras) de blocos alternados
    for s in (-1, 1):
        z = 0.0; j = 0
        while z < SPRING - 0.05:
            h = min(rnd.uniform(0.5, 0.7), SPRING - z); w = 0.55 if j % 2 == 0 else 0.8
            objs.append(caixa(f'{nome}_omb{s}_{j}', col, (w, prof, h - 0.03), (s * (r0 + w / 2 - 0.02), frente + prof / 2, z + h / 2), mat, bev=0.025, tam=1.6))
            z += h; j += 1
    return objs

def ameias(nome, col, mat, x0, x1, z, y0, prof, alt=0.75, larg=0.7, vao=0.45):
    objs = []; x = x0; i = 0
    while x + larg <= x1 + 1e-3:
        objs.append(caixa(f'{nome}_{i}', col, (larg, prof, alt), (x + larg / 2, y0 + prof / 2, z + alt / 2), mat, bev=0.03, tam=1.6)); x += larg + vao; i += 1
    return objs

# ---------------- modelos Poly Haven (já importados pelo addon) ----------------
def pega(prefixo, col, nome=None):
    """Junta os objetos importados cujo nome começa com o prefixo e devolve um só, com a origem na base."""
    objs = [o for o in bpy.data.objects if o.name.startswith(prefixo) and o.type == 'MESH' and not any(c.name.startswith('F') for c in o.users_collection)]
    if not objs: raise RuntimeError('modelo ausente: ' + prefixo)
    cp = []
    for o in objs:
        c = o.copy(); c.data = o.data.copy(); bpy.context.scene.collection.objects.link(c); cp.append(c)
    for o in bpy.context.selected_objects: o.select_set(False)
    for c in cp: c.select_set(True)
    bpy.context.view_layer.objects.active = cp[0]
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(cp) > 1: bpy.ops.object.join()
    o = bpy.context.active_object; o.name = nome or prefixo
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
    bpy.context.view_layer.update()
    bb = [o.matrix_world @ Vector(c) for c in o.bound_box]; mz = min(v.z for v in bb)
    o.location.z -= mz; o.data.transform(Matrix.Translation((0, 0, 0))); ligar(o, col)
    # origem para a base
    bpy.context.view_layer.update(); return o

def poe(o, x, y, z=0.0, rz=0.0, altura=None, larg=None):
    bpy.context.view_layer.update()
    d = o.dimensions
    if altura: o.scale = (o.scale[0] * altura / d.z,) * 3
    elif larg: o.scale = (o.scale[0] * larg / max(d.x, d.y),) * 3
    o.rotation_euler = (0, 0, rz)
    bpy.context.view_layer.update()
    bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
    o.location.x += x - (min(v.x for v in bb) + max(v.x for v in bb)) / 2
    o.location.y += y - (min(v.y for v in bb) + max(v.y for v in bb)) / 2
    o.location.z += z - min(v.z for v in bb)
    bpy.context.view_layer.update(); return o

# ---------------- câmera de conferência e exportação ----------------
def mostra(col_nome, dist=19, alt=3.6, yaw=-8, pitch=84):
    for o in bpy.data.objects: o.hide_set(not any(c.name == col_nome for c in o.users_collection))
    for a in bpy.context.screen.areas:
        if a.type == 'VIEW_3D':
            sp = a.spaces[0]; sp.shading.type = 'MATERIAL'
            r3 = sp.region_3d; r3.view_location = Vector((0, 0, alt)); r3.view_distance = dist; r3.view_perspective = 'PERSP'
            from mathutils import Euler
            r3.view_rotation = Euler((math.radians(pitch), 0, math.radians(yaw))).to_quaternion()

def exporta(col_nome, caminho):
    col = bpy.data.collections[col_nome]
    for o in bpy.context.selected_objects: o.select_set(False)
    for o in col.objects: o.hide_set(False); o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=caminho, use_selection=True, export_format='GLB', export_yup=True,
                              export_apply=True, export_image_format='JPEG', export_jpeg_quality=82)
    return os.path.getsize(caminho)

def lanterna(col, nome, x, y, z, altura=0.75, cor_luz=(1.0, 0.62, 0.25), forca=8.0):
    """Lanterna de latão do Poly Haven (Lantern_01) com o vidro trocado por luz quente (vira emissivo no glTF)."""
    o = pega('Lantern_01', col, nome)
    luz = cor(nome.split('_')[0] + '_chama', cor_luz, rough=0.4, emiss=forca)
    for i, sl in enumerate(o.material_slots):
        if sl.material and 'glass' in sl.material.name.lower(): o.material_slots[i].material = luz
    return poe(o, x, y, z, altura=altura)
