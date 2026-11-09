import bpy, bmesh, json, math, random, os, sys
import numpy as np
from mathutils import Vector

D = 'C:/Users/Jason/AppData/Local/Temp/claude/b2bb479dfac4ceff/a4c47892-cdab-455f-8e01-d5c22e409fee/scratchpad/blender/'
OUT = 'C:/Users/Jason/Desktop/Games/eighth-arcanum/prototypes/trail/concepts/'
os.makedirs(OUT, exist_ok=True)
W = json.load(open(D + 'world.json'))
N, CS = W['N'], W['CS']
VX = 3.0
H = np.array(W['H'], dtype=np.float32).reshape(N, N)
nat = np.array(W['nat'], dtype=np.uint8).reshape(N, N)
SPAN = N * CS - 8
random.seed(7)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def gy(z):  # game z -> blender y
    return 1024.0 - z

def height_at(x, z):
    fx = min(max(x / CS - .5, 0), N - 1.001); fz = min(max(z / CS - .5, 0), N - 1.001)
    xi, zi = int(fx), int(fz); tx, tz = fx - xi, fz - zi
    return (H[zi, xi] * (1 - tx) * (1 - tz) + H[zi, xi + 1] * tx * (1 - tz) + H[zi + 1, xi] * (1 - tx) * tz + H[zi + 1, xi + 1] * tx * tz)

lake_h = H[nat == 6].mean() if (nat == 6).any() else -1e9

# ---- terrain mesh with the painted ground texture as colour
M = 160
bm = bmesh.new()
uv_layer = bm.loops.layers.uv.new('UV')
verts = []
for j in range(M + 1):
    row = []
    for i in range(M + 1):
        x = 4 + i * SPAN / M; z = 4 + j * SPAN / M
        h = height_at(x, z)
        ci = nat[min(N - 1, int(z / CS)), min(N - 1, int(x / CS))]
        if ci == 6: h = lake_h - .6
        row.append(bm.verts.new((x, gy(z), h * VX)))
    verts.append(row)
for j in range(M):
    for i in range(M):
        f = bm.faces.new((verts[j][i], verts[j][i + 1], verts[j + 1][i + 1], verts[j + 1][i]))
        f.smooth = True
        for l, (u, v) in zip(f.loops, [(i / M, 1 - j / M), ((i + 1) / M, 1 - j / M), ((i + 1) / M, 1 - (j + 1) / M), (i / M, 1 - (j + 1) / M)]):
            l[uv_layer].uv = (u, v)
mesh = bpy.data.meshes.new('terrain'); bm.to_mesh(mesh); bm.free()
terrain = bpy.data.objects.new('terrain', mesh); scene.collection.objects.link(terrain)
mat = bpy.data.materials.new('ground'); mat.use_nodes = True
nt = mat.node_tree; bsdf = nt.nodes['Principled BSDF']
tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(D + 'ground.png'); tex.interpolation = 'Closest'
nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color']); bsdf.inputs['Roughness'].default_value = 1.0
terrain.data.materials.append(mat)

# ---- low-poly pines and rocks
def add_pines(items, name):
    bm2 = bmesh.new(); col = bm2.loops.layers.color.new('col')
    for (x, z, h, tone) in items:
        y = gy(z); base = height_at(x, z) * VX
        rad = h * .26
        for layer in range(3):
            r = rad * (1 - layer * .3); z0 = base + h * (.22 + layer * .26); z1 = z0 + h * .46
            ring = [bm2.verts.new((x + math.cos(a / 7 * math.tau) * r, y + math.sin(a / 7 * math.tau) * r, z0)) for a in range(7)]
            tip = bm2.verts.new((x, y, z1))
            for a in range(7):
                f = bm2.faces.new((ring[a], ring[(a + 1) % 7], tip)); f.smooth = False
                for l in f.loops: l[col] = (.10 * tone, .30 * tone, .17 * tone, 1)
        tr = [bm2.verts.new((x + math.cos(a / 4 * math.tau) * rad * .12, y + math.sin(a / 4 * math.tau) * rad * .12, base)) for a in range(4)]
        tp = [bm2.verts.new((x + math.cos(a / 4 * math.tau) * rad * .12, y + math.sin(a / 4 * math.tau) * rad * .12, base + h * .3)) for a in range(4)]
        for a in range(4):
            f = bm2.faces.new((tr[a], tr[(a + 1) % 4], tp[(a + 1) % 4], tp[a]))
            for l in f.loops: l[col] = (.2, .12, .06, 1)
    me = bpy.data.meshes.new(name); bm2.to_mesh(me); bm2.free()
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
    m2 = bpy.data.materials.new(name + 'm'); m2.use_nodes = True
    b2 = m2.node_tree.nodes['Principled BSDF']; an = m2.node_tree.nodes.new('ShaderNodeVertexColor'); an.layer_name = 'col'
    m2.node_tree.links.new(an.outputs['Color'], b2.inputs['Base Color']); b2.inputs['Roughness'].default_value = 1.0
    ob.data.materials.append(m2)

pines = []
for t in W['trees']:
    pines.append((t[0], t[1], t[2] * 1.15, .8 + random.random() * .5))
for d in W['decor']:
    if d[2] == 10: pines.append((d[0], d[1], d[3] * 1.3, .8 + random.random() * .5))
add_pines(pines, 'pines')

bm3 = bmesh.new()
for d in W['decor']:
    if d[2] in (6, 14):
        s = d[3] * (.9 if d[2] == 6 else 1.3)
        r = bmesh.ops.create_icosphere(bm3, subdivisions=1, radius=1.0)
        for v in r['verts']:
            v.co.x = d[0] + v.co.x * s * .8; v.co.y = gy(d[1]) + v.co.y * s * .8; v.co.z = height_at(d[0], d[1]) * VX + (v.co.z * .6 + .3) * s
me3 = bpy.data.meshes.new('rocks'); bm3.to_mesh(me3); bm3.free()
rocks = bpy.data.objects.new('rocks', me3); scene.collection.objects.link(rocks)
rm = bpy.data.materials.new('rock'); rm.use_nodes = True
rb = rm.node_tree.nodes['Principled BSDF']; rb.inputs['Base Color'].default_value = (.42, .40, .42, 1); rb.inputs['Roughness'].default_value = 1
rocks.data.materials.append(rm)

# ---- sun, sky, camera
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); scene.collection.objects.link(sun)
sun.data.energy = 4.2; sun.data.angle = math.radians(2.2); sun.data.color = (1, .93, .8)
sun.rotation_euler = (math.radians(52), 0, math.radians(-135))  # from the north-west
world = bpy.data.worlds.new('w'); world.use_nodes = True; scene.world = world
world.node_tree.nodes['Background'].inputs['Color'].default_value = (.55, .68, .88, 1); world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.55

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); scene.collection.objects.link(cam); scene.camera = cam
xs = [p[0] for p in W['pts']]; zs = [p[1] for p in W['pts']]
cx, cz = (min(xs) + max(xs)) / 2, (min(zs) + max(zs)) / 2
tgt = Vector((cx, gy(cz), height_at(cx, cz) * VX))
span = max(max(xs) - min(xs), max(zs) - min(zs)) + 170
dist = span * 2.35; pitch = 1.08
sx, sz = (W['start']['x'] + .5) * CS, (W['start']['y'] + .5) * CS; fx, fz = (W['fin']['x'] + .5) * CS, (W['fin']['y'] + .5) * CS
fwd = Vector((fx - sx, -(fz - sz), 0))
best, bt = -1e9, 0
for k in range(4):
    th = k * math.pi / 2; f = Vector((-math.sin(th), math.cos(th), 0)); d = f.dot(fwd)
    if d > best: best, bt = d, th
off = Vector((math.sin(bt) * dist * math.cos(pitch), -math.cos(bt) * dist * math.cos(pitch), dist * math.sin(pitch)))
cam.location = tgt + off
dirv = tgt - cam.location; cam.rotation_euler = dirv.to_track_quat('-Z', 'Y').to_euler()
cam.data.angle = math.radians(40); cam.data.sensor_fit = 'VERTICAL'; cam.data.clip_start = 10; cam.data.clip_end = 20000

# ---- render
r = scene.render; r.resolution_x, r.resolution_y = 1080, 1200; r.resolution_percentage = 100
r.engine = 'CYCLES'; scene.cycles.device = 'CPU'; scene.cycles.samples = 40; scene.cycles.use_denoising = True
scene.view_settings.view_transform = 'Standard'
r.image_settings.file_format = 'PNG'; r.filepath = D + 'render.png'
bpy.ops.render.render(write_still=True)
print('rendered')

# ---- pixel pass: box-downscale, ordered dither, palette, outlines
img = bpy.data.images.load(D + 'render.png'); w, h = img.size
a = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1, :, :3]
a = np.clip(a, 0, 1) ** (1 / 2.2) if False else np.clip(a, 0, 1)
TW, TH = 270, 300
b = a.reshape(TH, h // TH, TW, w // TW, 3).mean(axis=(1, 3))
# gentle contrast and saturation
lum = b.mean(axis=2, keepdims=True); b = np.clip(lum + (b - lum) * 1.08, 0, 1); b = np.clip((b - .5) * 1.06 + .5, 0, 1)
bayer = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=np.float32) / 16 - .5
thr = np.tile(bayer, (TH // 4 + 1, TW // 4 + 1))[:TH, :TW, None]
bd = np.clip(b + thr * .035, 0, 1)
# k-means palette
K = 56; px = bd.reshape(-1, 3); rng = np.random.default_rng(3)
cent = px[rng.choice(len(px), K, replace=False)]
for _ in range(10):
    d = ((px[:, None, :] - cent[None, :, :]) ** 2).sum(axis=2); lab = d.argmin(axis=1)
    for k in range(K):
        m = lab == k
        if m.any(): cent[k] = px[m].mean(axis=0)
q = cent[lab].reshape(TH, TW, 3)
# outlines where neighbouring pixels differ a lot
L = q.mean(axis=2); e = np.zeros((TH, TW), bool)
e[:, :-1] |= np.abs(L[:, :-1] - L[:, 1:]) > .17; e[:-1, :] |= np.abs(L[:-1, :] - L[1:, :]) > .17
q2 = q.copy(); q2[e] *= .72
def save(arr, path, scale=1):
    arr = np.clip(arr, 0, 1)
    if scale > 1: arr = arr.repeat(scale, axis=0).repeat(scale, axis=1)
    hh, ww = arr.shape[:2]
    im = bpy.data.images.new('o', ww, hh, alpha=False)
    rgba = np.concatenate([arr[::-1], np.ones((hh, ww, 1), np.float32)], axis=2)
    im.pixels = rgba.flatten().tolist(); im.filepath_raw = path; im.file_format = 'PNG'; im.save()
save(q2, OUT + 'path2_blender_pixel_native.png', 1)
save(q2, OUT + 'path2_blender_pixel.png', 4)
save(a[::4, ::4] if False else b, OUT + 'path2_blender_downscale_only.png', 4)
print('done')
