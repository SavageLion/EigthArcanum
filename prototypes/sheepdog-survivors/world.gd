class_name World
extends Node2D
# The map: tiled ground (grass, river, dirt paths, wheat fields, forest floor), a dense forest ring with clearings,
# a river with a bridge, and the castle pen in the middle.

const CELL: float = 48.0
const GW: int = 50
const GH: int = 34
const T_GRASS: int = 0
const T_WATER: int = 1
const T_PATH: int = 2
const T_FIELD: int = 3
const T_FOREST: int = 4
const RIVER: Array = [Vector2(380, -80), Vector2(430, 300), Vector2(330, 620), Vector2(410, 880), Vector2(380, 1250), Vector2(450, 1720)]
const PATHS: Array = [
	[Vector2(1200, 960), Vector2(900, 930), Vector2(700, 905), Vector2(560, 880), Vector2(410, 872), Vector2(250, 850), Vector2(-80, 810)],
	[Vector2(1200, 960), Vector2(1500, 1010), Vector2(1850, 940), Vector2(2100, 1000), Vector2(2480, 960)],
	[Vector2(1200, 960), Vector2(1240, 1250), Vector2(1320, 1450), Vector2(1330, 1720)],
	[Vector2(1700, 985), Vector2(1780, 700), Vector2(1760, 300), Vector2(1800, -80)],
]
const FIELDS: Array = [Rect2(1900, 220, 330, 270), Rect2(1650, 1190, 330, 270)]
const GAPS: Array = [Vector2(60, 810), Vector2(2340, 960), Vector2(1330, 1570), Vector2(1800, 60), Vector2(700, 60), Vector2(1900, 1570), Vector2(60, 300)]

var wx: float = 2400.0
var wy: float = 1632.0
var pen: Rect2
var gate_x: float = 0.0
var gap: float = 100.0
var walls: Array = []
var rocks: Array = []
var zones: Array = []
var pads: Array = []
var dog_start: Vector2 = Vector2.ZERO
var ysort: Node2D
var wind_mat: ShaderMaterial
var shadow_tex: Texture2D
var terr: PackedInt32Array = PackedInt32Array()
var rock_grid: Dictionary = {}
var gaps: Array = []
var inner_pts: Array = []
var bridge_rect: Rect2 = Rect2(315, 840, 190, 60)
var minimap_tex: ImageTexture
var n1: FastNoiseLite
var n2: FastNoiseLite

func tex(tname: String) -> Texture2D:
	return load("res://art/" + tname + ".png") as Texture2D

func generate(ysort_node: Node2D) -> void:
	ysort = ysort_node
	shadow_tex = U.shadow_texture()
	wind_mat = ShaderMaterial.new()
	wind_mat.shader = load("res://shaders/wind.gdshader") as Shader
	n1 = FastNoiseLite.new()
	n1.seed = randi()
	n1.frequency = 0.004
	n2 = FastNoiseLite.new()
	n2.seed = randi()
	n2.frequency = 0.0035
	_layout()
	_terrain()
	_tiles()
	_minimap()
	_trees()
	_obstacles()
	_pen_visuals()
	_bridge()
	_spawn_points()

# ---------------------------------------------------------------- layout of the castle
func _layout() -> void:
	var pw: float = 210.0
	var ph: float = 160.0
	var px: float = wx / 2.0 - pw / 2.0
	var py: float = wy / 2.0 - ph / 2.0
	gate_x = px + pw / 2.0
	pen = Rect2(px, py, pw, ph)
	var hp: float = 140.0
	var by: float = py + ph
	walls = [
		_wall(Vector2(px, py), Vector2(px + pw, py), true, hp),
		_wall(Vector2(px, py), Vector2(px, by), true, hp),
		_wall(Vector2(px + pw, py), Vector2(px + pw, by), true, hp),
		_wall(Vector2(px, by), Vector2(gate_x - gap / 2.0, by), true, hp),
		_wall(Vector2(gate_x + gap / 2.0, by), Vector2(px + pw, by), true, hp),
	]
	dog_start = Vector2(gate_x, by + 120.0)
	var spots: Array = [
		Vector2(px - 18.0, py - 14.0), Vector2(px + pw + 18.0, py - 14.0),
		Vector2(px - 18.0, by + 14.0), Vector2(px + pw + 18.0, by + 14.0),
		Vector2(gate_x, py - 24.0), Vector2(px - 26.0, py + ph / 2.0), Vector2(px + pw + 26.0, py + ph / 2.0),
		Vector2(gate_x - gap / 2.0 - 40.0, by + 24.0), Vector2(gate_x + gap / 2.0 + 40.0, by + 24.0),
	]
	for sp in spots:
		var pd := Pad.new()
		pd.position = sp
		pd.z_index = -100
		add_child(pd)
		pads.append(pd)

func _wall(a: Vector2, b: Vector2, is_pen: bool, hp: float) -> Dictionary:
	return {"a": a, "b": b, "pen": is_pen, "hp": hp, "max": hp, "broken": false, "nodes": []}

# ---------------------------------------------------------------- terrain grid
func vidx(x: int, y: int) -> int:
	return y * (GW + 1) + x

func dist_poly(p: Vector2, pts: Array) -> float:
	var best: float = 1.0e9
	for i in pts.size() - 1:
		var a: Vector2 = pts[i]
		var b: Vector2 = pts[i + 1]
		var ab: Vector2 = b - a
		var t: float = clampf((p - a).dot(ab) / maxf(ab.length_squared(), 0.001), 0.0, 1.0)
		best = minf(best, p.distance_to(a + ab * t))
	return best

func _terrain() -> void:
	terr.resize((GW + 1) * (GH + 1))
	var center: Vector2 = pen.get_center()
	for vy in GH + 1:
		for vx in GW + 1:
			var p := Vector2(float(vx) * CELL, float(vy) * CELL)
			var t: int = T_GRASS
			var edge: float = minf(minf(p.x, wx - p.x), minf(p.y, wy - p.y))
			var thick: float = 230.0 + 170.0 * (n1.get_noise_2d(p.x, p.y) * 0.5 + 0.5)
			var forest: bool = edge < thick or n2.get_noise_2d(p.x, p.y) > 0.3
			if p.distance_to(center) < 480.0:
				forest = false
			var dpath: float = 1.0e9
			for pl in PATHS:
				dpath = minf(dpath, dist_poly(p, pl))
			if dpath < 105.0:
				forest = false
			for g in GAPS:
				if p.distance_to(g as Vector2) < 175.0:
					forest = false
			for fr in FIELDS:
				if (fr as Rect2).grow(115.0).has_point(p):
					forest = false
			var driver: float = dist_poly(p, RIVER)
			if driver < 120.0:
				forest = false
			if forest:
				t = T_FOREST
			if dpath < 27.0:
				t = T_PATH
			for fr in FIELDS:
				if (fr as Rect2).has_point(p):
					t = T_FIELD
			if driver < 52.0 + 16.0 * n1.get_noise_2d(p.y * 1.3, p.x):
				t = T_WATER
			if p.distance_to(center) < 300.0 and t != T_PATH:
				t = T_GRASS
			terr[vidx(vx, vy)] = t
	# two different non-grass terrains must never share a tile: the weaker one gives way
	var rank: Dictionary = {0: 0, 1: 4, 2: 1, 3: 3, 4: 2}
	var out: PackedInt32Array = terr.duplicate()
	for vy in GH + 1:
		for vx in GW + 1:
			var t2: int = terr[vidx(vx, vy)]
			if t2 == T_GRASS:
				continue
			for dy in range(-1, 2):
				for dx in range(-1, 2):
					var nx: int = vx + dx
					var ny: int = vy + dy
					if nx < 0 or ny < 0 or nx > GW or ny > GH:
						continue
					var u: int = terr[vidx(nx, ny)]
					if u != T_GRASS and u != t2 and int(rank[u]) > int(rank[t2]):
						out[vidx(vx, vy)] = T_GRASS
	terr = out

func terr_at(p: Vector2) -> int:
	var vx: int = clampi(roundi(p.x / CELL), 0, GW)
	var vy: int = clampi(roundi(p.y / CELL), 0, GH)
	return terr[vidx(vx, vy)]

func cell_corners(cx: int, cy: int) -> Array:
	return [terr[vidx(cx, cy)], terr[vidx(cx + 1, cy)], terr[vidx(cx, cy + 1)], terr[vidx(cx + 1, cy + 1)]]

func cell_all(cx: int, cy: int, t: int) -> bool:
	var c: Array = cell_corners(cx, cy)
	for v in c:
		if int(v) != t:
			return false
	return true

# ---------------------------------------------------------------- ground tiles
func _tiles() -> void:
	var f := FileAccess.open("res://art/tiles/tiles.json", FileAccess.READ)
	var data: Dictionary = JSON.parse_string(f.get_as_text())
	var order: Array = ["water", "path", "field", "forest"]
	var ts := TileSet.new()
	ts.tile_size = Vector2i(32, 32)
	var keys: Array = []
	for i in order.size():
		var nm: String = String(order[i])
		var src := TileSetAtlasSource.new()
		src.texture = load("res://art/tiles/%s.png" % nm) as Texture2D
		src.texture_region_size = Vector2i(32, 32)
		var tiles: Dictionary = (data[nm] as Dictionary)["tiles"]
		var table: Dictionary = {}
		for k in tiles.keys():
			var xy: Array = tiles[k]
			var ac := Vector2i(int(xy[0]), int(xy[1]))
			if src.get_tile_at_coords(ac) == Vector2i(-1, -1):
				src.create_tile(ac)
			table[String(k)] = ac
		ts.add_source(src, i)
		keys.append({"table": table, "upper": int((data[nm] as Dictionary)["upper"])})
	var layer := TileMapLayer.new()
	layer.tile_set = ts
	layer.scale = Vector2(1.5, 1.5)
	layer.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	layer.z_index = -200
	add_child(layer)
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	for cy in GH:
		for cx in GW:
			var c: Array = cell_corners(cx, cy)
			var special: int = T_GRASS
			for v in c:
				if int(v) != T_GRASS:
					special = int(v)
			var si: int = 0
			var key: String = ""
			if special == T_GRASS:
				si = rng.randi() % 4
				key = "uuuu" if si == 0 else "llll"
			else:
				si = special - 1
				var up: int = int(keys[si]["upper"])
				for v in c:
					key += "u" if int(v) == up else "l"
			var table2: Dictionary = keys[si]["table"]
			if not table2.has(key):
				key = "uuuu" if si == 0 else "llll"
				if not table2.has(key):
					continue
			layer.set_cell(Vector2i(cx, cy), si, table2[key])

func _minimap() -> void:
	var img := Image.create(GW, GH, false, Image.FORMAT_RGBA8)
	var cols: Dictionary = {0: Color(0.5, 0.64, 0.28), 1: Color(0.22, 0.5, 0.62), 2: Color(0.76, 0.62, 0.4), 3: Color(0.9, 0.74, 0.2), 4: Color(0.14, 0.3, 0.15)}
	var rk: Dictionary = {0: 0, 1: 4, 2: 1, 3: 3, 4: 2}
	for cy in GH:
		for cx in GW:
			var best: int = T_GRASS
			for v in cell_corners(cx, cy):
				if int(rk[int(v)]) > int(rk[best]):
					best = int(v)
			img.set_pixel(cx, cy, cols[best])
	minimap_tex = ImageTexture.create_from_image(img)

# ---------------------------------------------------------------- trees, rocks, bushes
func rock_add(p: Vector2, r: float) -> void:
	var k := Vector2i(int(floor(p.x / 96.0)), int(floor(p.y / 96.0)))
	var d: Dictionary = {"pos": p, "r": r}
	rocks.append(d)
	if not rock_grid.has(k):
		rock_grid[k] = []
	(rock_grid[k] as Array).append(d)

func rocks_near(p: Vector2) -> Array:
	var out: Array = []
	var cx: int = int(floor(p.x / 96.0))
	var cy: int = int(floor(p.y / 96.0))
	for dy in range(-1, 2):
		for dx in range(-1, 2):
			var k := Vector2i(cx + dx, cy + dy)
			if rock_grid.has(k):
				out.append_array(rock_grid[k])
	return out

func _trees() -> void:
	var ta: Texture2D = tex("tree_big_a")
	var tb: Texture2D = tex("tree_big_b")
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	for cy in GH:
		for cx in GW:
			if (cx + cy) % 2 != 0:
				continue
			var forest: int = 0
			for v in cell_corners(cx, cy):
				if int(v) == T_FOREST:
					forest += 1
			if forest < 3:
				continue
			var p := Vector2((float(cx) + 0.5) * CELL + rng.randf_range(-12.0, 12.0), (float(cy) + 0.5) * CELL + rng.randf_range(-12.0, 12.0))
			var sc: float = rng.randf_range(1.45, 1.95)
			_tree(ta if rng.randf() < 0.5 else tb, p, sc, false)
			rock_add(p, 30.0)

func _blocked(p: Vector2, r: float) -> bool:
	if pen.grow(150.0).has_point(p) or p.distance_to(dog_start) < 120.0:
		return true
	if not cell_all(clampi(int(p.x / CELL), 0, GW - 1), clampi(int(p.y / CELL), 0, GH - 1), T_GRASS):
		return true
	for k in rocks_near(p):
		var kp: Vector2 = k["pos"]
		if p.distance_to(kp) < float(k["r"]) + r + 40.0:
			return true
	return false

func random_open_point(margin: float) -> Vector2:
	for tries in 80:
		var p := Vector2(randf_range(120.0, wx - 120.0), randf_range(120.0, wy - 120.0))
		if not _blocked(p, margin):
			return p
	return Vector2(wx / 2.0, wy / 2.0 + 300.0)

func _obstacles() -> void:
	var rk: Texture2D = tex("rock2")
	for i in 14:
		var p: Vector2 = random_open_point(24.0)
		var r: float = randf_range(16.0, 26.0)
		rock_add(p, r)
		var s := Sprite2D.new()
		s.texture = rk
		s.position = p + Vector2(0, 10)
		var w: float = clampf(r * 1.7, 30.0, 52.0)
		s.scale = Vector2(w / 30.0, w / 30.0)
		s.offset = Vector2(0, -13)
		ysort.add_child(s)
	var ta: Texture2D = tex("tree_big_a")
	var tb: Texture2D = tex("tree_big_b")
	for i in 10:
		var p2: Vector2 = random_open_point(30.0)
		rock_add(p2, 16.0)
		_tree(ta if randf() < 0.5 else tb, p2, 1.3, true)
	var sh: Texture2D = tex("shrub_big")
	var bu: Texture2D = tex("bush")
	for i in 40:
		var p3: Vector2 = random_open_point(16.0)
		var big: bool = randf() < 0.6
		var s2 := Sprite2D.new()
		s2.texture = sh if big else bu
		s2.position = p3
		s2.scale = Vector2.ONE * (1.7 if big else 1.3)
		s2.offset = Vector2(0, -s2.texture.get_height() * 0.5 + 4.0)
		s2.material = wind_mat
		ysort.add_child(s2)

func _blob_shadow(p: Vector2, sx: float, sy: float) -> Sprite2D:
	var s := Sprite2D.new()
	s.texture = shadow_tex
	s.position = p
	s.scale = Vector2(sx * 2.6, sy * 2.6)
	s.z_index = -60
	return s

func _tree(t: Texture2D, p: Vector2, sc: float, shadow: bool) -> void:
	var s := Sprite2D.new()
	s.texture = t
	s.position = p + Vector2(0, 14.0 * sc)
	s.scale = Vector2(sc, sc)
	s.offset = Vector2(0, -t.get_height() * 0.5 + 4.0)
	s.material = wind_mat
	s.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	ysort.add_child(s)
	if shadow:
		add_child(_blob_shadow(p + Vector2(18.0 * sc, 12.0 * sc), 0.9 * sc, 0.32 * sc))

# ---------------------------------------------------------------- bridge and castle visuals
func _bridge() -> void:
	var b := Bridge.new()
	b.size = bridge_rect.size
	b.position = bridge_rect.position
	b.z_index = -95
	add_child(b)

func _pen_visuals() -> void:
	var dirt := Sprite2D.new()
	dirt.texture = _masked("ground/gdirt")
	dirt.position = pen.get_center()
	dirt.scale = Vector2(1.3, 1.1)
	dirt.modulate = Color(1, 1, 1, 0.85)
	dirt.z_index = -150
	add_child(dirt)
	var fence_h: Texture2D = tex("stone_wall")
	for w in walls:
		var a: Vector2 = w["a"]
		var b: Vector2 = w["b"]
		var l: float = a.distance_to(b)
		if l < 2.0:
			continue
		var nodes: Array = []
		var ang: float = atan2(b.y - a.y, b.x - a.x)
		var n2c: int = maxi(1, roundi(l / 80.0))
		var sw: float = l / float(n2c)
		var k: float = sw / float(fence_h.get_width()) + 0.01
		for i in n2c:
			var t: float = (float(i) + 0.5) / float(n2c)
			var s := Sprite2D.new()
			s.texture = fence_h
			s.position = a.lerp(b, t)
			s.rotation = ang
			s.scale = Vector2(k * 1.05, k * 0.95)
			s.offset = Vector2(0, -9)
			ysort.add_child(s)
			nodes.append(s)
		w["nodes"] = nodes

func _masked(path: String) -> Texture2D:
	var img: Image = (load("res://art/" + path + ".png") as Texture2D).get_image()
	img.convert(Image.FORMAT_RGBA8)
	var w: int = img.get_width()
	var h: int = img.get_height()
	for y in h:
		var ay: float = _ramp(float(mini(y, h - 1 - y)) / 44.0)
		for x in w:
			var ax: float = _ramp(float(mini(x, w - 1 - x)) / 44.0)
			var c: Color = img.get_pixel(x, y)
			c.a = minf(ax, ay)
			img.set_pixel(x, y, c)
	return ImageTexture.create_from_image(img)

func _ramp(t: float) -> float:
	var k: float = clampf(t, 0.0, 1.0)
	return k * k * (3.0 - 2.0 * k)

# ---------------------------------------------------------------- where raiders and strays come from
func _spawn_points() -> void:
	for g in GAPS:
		gaps.append(g)
	var center: Vector2 = pen.get_center()
	for tries in 900:
		if inner_pts.size() >= 90:
			break
		var p := Vector2(randf_range(80.0, wx - 80.0), randf_range(80.0, wy - 80.0))
		if p.distance_to(center) < 520.0 or _blocked(p, 14.0):
			continue
		var near_forest: bool = false
		var cx: int = int(p.x / CELL)
		var cy: int = int(p.y / CELL)
		for dy in range(-3, 4):
			for dx in range(-3, 4):
				var vx: int = clampi(cx + dx, 0, GW)
				var vy: int = clampi(cy + dy, 0, GH)
				if terr[vidx(vx, vy)] == T_FOREST:
					near_forest = true
		if near_forest:
			inner_pts.append(p)

# ---------------------------------------------------------------- terrain queries for movement
func in_zone(p: Vector2, _margin: float) -> bool:
	return zone_kind(p) != ""

func zone_kind(p: Vector2) -> String:
	if bridge_rect.has_point(p):
		return ""
	if terr_at(p) == T_WATER:
		return "water"
	return ""
