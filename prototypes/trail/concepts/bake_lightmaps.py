"""Bakes a top-down light map (sun shadows plus soft sky occlusion) for each Ridgeline race world.
Run:  blender -b -P bake_lightmaps.py -- <worlds_dir> <out_dir>
The game multiplies the Pixel Lab tile texture by this map, so the relief gets Blender-quality shading while the camera stays free."""
import bpy, bmesh, json, math, os, sys, random
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
WORLDS, OUT = argv[0], argv[1]
os.makedirs(OUT, exist_ok=True)
VX = 6.5
IDS = ['pine', 'lake', 'canyon', 'fog', 'sky', 'glacier', 'summit']
SIZE = 1024

def bake(rid):
    W = json.load(open(os.path.join(WORLDS, 'world_%s.json' % rid)))
    N, CS = W['N'], W['CS']; SPAN = N * CS - 8
    H = np.array(W['H'], dtype=np.float32).reshape(N, N); nat = np.array(W['nat'], dtype=np.uint8).reshape(N, N)
    lake_h = H[nat == 6].mean() if (nat == 6).any() else -1e9
    bpy.ops.wm.read_factory_settings(use_empty=True); scene = bpy.context.scene
    def hat(x, z):
        fx = min(max(x / CS - .5, 0), N - 1.001); fz = min(max(z / CS - .5, 0), N - 1.001); xi, zi = int(fx), int(fz); tx, tz = fx - xi, fz - zi
        return float(H[zi, xi] * (1 - tx) * (1 - tz) + H[zi, xi + 1] * tx * (1 - tz) + H[zi + 1, xi] * (1 - tx) * tz + H[zi + 1, xi + 1] * tx * tz)
    gy = lambda z: 1024.0 - z
    # terrain
    M = 200; bm = bmesh.new(); verts = []
    for j in range(M + 1):
        row = []
        for i in range(M + 1):
            x = 4 + i * SPAN / M; z = 4 + j * SPAN / M; h = hat(x, z)
            if nat[min(N - 1, int(z / CS)), min(N - 1, int(x / CS))] == 6: h = lake_h - .6
            row.append(bm.verts.new((x, gy(z), h * VX)))
        verts.append(row)
    for j in range(M):
        for i in range(M):
            f = bm.faces.new((verts[j][i], verts[j][i + 1], verts[j + 1][i + 1], verts[j + 1][i])); f.smooth = True
    me = bpy.data.meshes.new('t'); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new('t', me); scene.collection.objects.link(ob)
    # trees and rocks cast shadows
    bm2 = bmesh.new()
    items = [(t[0], t[1], t[2] * 1.15) for t in W['trees']] + [(d[0], d[1], d[3] * 1.3) for d in W['decor'] if d[2] == 10]
    for (x, z, h) in items:
        y = gy(z); base = hat(x, z) * VX; rad = h * .26
        for layer in range(3):
            r = rad * (1 - layer * .3); z0 = base + h * (.22 + layer * .26); z1 = z0 + h * .46
            ring = [bm2.verts.new((x + math.cos(a / 7 * math.tau) * r, y + math.sin(a / 7 * math.tau) * r, z0)) for a in range(7)]
            tip = bm2.verts.new((x, y, z1))
            for a in range(7): bm2.faces.new((ring[a], ring[(a + 1) % 7], tip))
    for d in W['decor']:
        if d[2] in (6, 14):
            s = d[3] * (.9 if d[2] == 6 else 1.3); r = bmesh.ops.create_icosphere(bm2, subdivisions=1, radius=1.0)
            for v in r['verts']:
                v.co.x = d[0] + v.co.x * s * .8; v.co.y = gy(d[1]) + v.co.y * s * .8; v.co.z = hat(d[0], d[1]) * VX + (v.co.z * .6 + .3) * s
    me2 = bpy.data.meshes.new('o'); bm2.to_mesh(me2); bm2.free(); ob2 = bpy.data.objects.new('o', me2); scene.collection.objects.link(ob2)
    # every surface is plain white, so the render is pure light and shadow
    mat = bpy.data.materials.new('w'); mat.use_nodes = True; b = mat.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (1, 1, 1, 1); b.inputs['Roughness'].default_value = 1
    ob.data.materials.append(mat); ob2.data.materials.append(mat)
    # the sun matches the game's hill-shading direction (from the north-west, about 45 degrees up)
    travel = Vector((.62, -.6, -.5))
    sun = bpy.data.objects.new('s', bpy.data.lights.new('s', 'SUN')); scene.collection.objects.link(sun)
    sun.data.energy = 4.4; sun.data.angle = math.radians(2.5); sun.rotation_euler = travel.to_track_quat('-Z', 'Y').to_euler()
    world = bpy.data.worlds.new('w'); world.use_nodes = True; scene.world = world
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (1, 1, 1, 1); world.node_tree.nodes['Background'].inputs['Strength'].default_value = .22
    # a camera looking straight down over the whole map
    cam = bpy.data.objects.new('c', bpy.data.cameras.new('c')); scene.collection.objects.link(cam); scene.camera = cam
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = SPAN; cam.data.clip_start = 1; cam.data.clip_end = 20000
    cam.location = (4 + SPAN / 2, gy(4 + SPAN / 2), 5000); cam.rotation_euler = (0, 0, 0)
    r = scene.render; r.resolution_x = r.resolution_y = SIZE; r.engine = 'CYCLES'; scene.cycles.device = 'CPU'; scene.cycles.samples = 56; scene.cycles.use_denoising = True
    scene.view_settings.view_transform = 'Standard'; r.image_settings.file_format = 'PNG'; r.filepath = os.path.join(OUT, '_tmp_%s.png' % rid)
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(r.filepath); w, h = img.size
    a = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1, :, :3].mean(axis=2)
    med = float(np.median(a)); a = np.clip(a / med * .62, 0, 1)   # the typical lit ground sits at 0.62
    out = bpy.data.images.new('lm', w, h, alpha=False); rgba = np.stack([a[::-1], a[::-1], a[::-1], np.ones_like(a)], axis=2)
    out.pixels = rgba.flatten().tolist(); out.filepath_raw = os.path.join(OUT, 'lm_%s.png' % rid); out.file_format = 'PNG'; out.save()
    os.remove(r.filepath)
    print('baked', rid, 'median', med)

ONLY = os.environ.get('ONLY')
for rid in IDS:
    if ONLY and rid != ONLY: continue
    bake(rid)
print('all done')
