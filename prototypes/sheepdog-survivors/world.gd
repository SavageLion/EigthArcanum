class_name World
extends Node2D
# The map: tiled ground (grass, river, dirt paths, wheat fields, forest floor), a dense forest ring with clearings,
# a river with a bridge, and the castle pen in the middle.

const CELL: float = 48.0
const GW: int = 68
const GH: int = 46
const T_GRASS: int = 0
const T_WATER: int = 1
const T_PATH: int = 2
const T_FIELD: int = 3
const T_FOREST: int = 4
const T_DRY: int = 5
const T_LUSH: int = 6
const T_FLOWER: int = 7
const T_DIRT: int = 8
const RIVER0: Array = [Vector2(380, -80), Vector2(430, 300), Vector2(330, 620), Vector2(410, 880), Vector2(380, 1250), Vector2(450, 1720)]
const PATHS0: Array = [
	[Vector2(1200, 960), Vector2(900, 930), Vector2(700, 905), Vector2(540, 880), Vector2(430, 872)],
	[Vector2(1200, 960), Vector2(1500, 1010), Vector2(1850, 940), Vector2(2010, 985)],
	[Vector2(1200, 960), Vector2(1240, 1250), Vector2(1300, 1390)],
	[Vector2(1700, 985), Vector2(1780, 700), Vector2(1765, 430)],
]
const FIELDS0: Array = [Rect2(1900, 220, 330, 270), Rect2(1650, 1190, 330, 270)]
const GAPS0: Array = [Vector2(60, 810), Vector2(2340, 960), Vector2(1330, 1570), Vector2(1800, 60), Vector2(700, 60), Vector2(1900, 1570), Vector2(60, 300)]

var wx: float = 3264.0
var wy: float = 2208.0
var river_ctrl: Array = []
var paths_ctrl: Array = []
var fields_r: Array = []
var gap_ctrl: Array = []
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
var n3: FastNoiseLite
var n4: FastNoiseLite
var river_pts: Array = []
var flat: bool = false
var refst: bool = false
var ell_tex: Texture2D
var path_pts: Array = []
var rngw := RandomNumberGenerator.new()

func tex(tname: String) -> Texture2D:
	if refst and tname == "stone_wall":
		return load("res://art/fence.png") as Texture2D
	if flat and ResourceLoader.exists("res://art/flat/" + tname + ".png"):
		return load("res://art/flat/" + tname + ".png") as Texture2D
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
	n3 = FastNoiseLite.new()
	n3.seed = randi()
	n3.frequency = 0.0012
	n4 = FastNoiseLite.new()
	n4.seed = randi()
	n4.frequency = 0.0015
	_scale_layout()
	_layout()
	_terrain()
	rngw.seed = randi()
	_tiles()
	_ground_patches()
	_ribbons()
	_minimap()
	_trees()
	_obstacles()
	_pen_visuals()
	_bridge()
	_decals()
	_spawn_points()

# ---------------------------------------------------------------- layout of the castle
func _scale_layout() -> void:
	var sv := Vector2(wx / 2400.0, wy / 1632.0)
	for pl in PATHS0:
		var a: Array = []
		for p in pl:
			a.append((p as Vector2) * sv)
		paths_ctrl.append(a)
	for r in FIELDS0:
		var rr: Rect2 = r
		fields_r.append(Rect2(rr.position * sv, rr.size * sv))
	for i in 14:
		var ang: float = TAU * float(i) / 14.0
		var ctr := Vector2(wx / 2.0, wy / 2.0)
		var rad := Vector2(wx / 2.0 - 300.0, wy / 2.0 - 300.0)
		gap_ctrl.append(ctr + Vector2(cos(ang) * rad.x, sin(ang) * rad.y))
	bridge_rect = Rect2(-500, -500, 1, 1)

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
			var thick: float = 125.0 + 75.0 * (n1.get_noise_2d(p.x, p.y) * 0.5 + 0.5)
			var forest: bool = edge < thick
			if p.distance_to(center) < 480.0:
				forest = false
			var dpath: float = 1.0e9
			for pl in paths_ctrl:
				dpath = minf(dpath, dist_poly(p, pl))
			if dpath < 105.0:
				forest = false
			for g in gap_ctrl:
				if p.distance_to(g as Vector2) < 175.0:
					forest = false
			for fr in fields_r:
				if (fr as Rect2).grow(115.0).has_point(p):
					forest = false
			var driver: float = dist_poly(p, river_ctrl)
			if driver < 120.0:
				forest = false
			if forest:
				t = T_FOREST
			if dpath < 27.0:
				t = T_PATH
			for fr in fields_r:
				if (fr as Rect2).has_point(p):
					t = T_FIELD
			if driver < 52.0 + 16.0 * n1.get_noise_2d(p.y * 1.3, p.x):
				t = T_WATER
			if p.distance_to(center) < 300.0 and t != T_PATH:
				t = T_GRASS
			if flat and t == T_GRASS and p.distance_to(center) > 420.0 and dpath > 70.0:
				var a3: float = n3.get_noise_2d(p.x, p.y)
				var a4: float = n4.get_noise_2d(p.x, p.y)
				if a3 > 0.2:
					t = T_DRY
				elif a3 < -0.36:
					t = T_LUSH
				elif a4 > 0.26:
					t = T_FLOWER
				elif a4 < -0.47:
					t = T_DIRT
			terr[vidx(vx, vy)] = t
	# two different non-grass terrains must never share a tile: the weaker one gives way
	var rank: Dictionary = {0: 0, 1: 4, 2: 1, 3: 9, 4: 8, 5: 5, 6: 6, 7: 7, 8: 3}
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

func cell_open(cx: int, cy: int) -> bool:
	for v in cell_corners(cx, cy):
		var t: int = int(v)
		if t != T_GRASS and t < T_DRY:
			return false
	return true

func cell_all(cx: int, cy: int, t: int) -> bool:
	var c: Array = cell_corners(cx, cy)
	for v in c:
		if int(v) != t:
			return false
	return true

# ---------------------------------------------------------------- ground tiles
func _tiles_flat() -> void:
	var f := FileAccess.open("res://art/flat/flat.json", FileAccess.READ)
	var d: Dictionary = JSON.parse_string(f.get_as_text())
	var g: Array = d["grass"]
	var ac := Vector2i(int(g[0]), int(g[1]))
	var ts := TileSet.new()
	ts.tile_size = Vector2i(32, 32)
	var src := TileSetAtlasSource.new()
	src.texture = load("res://art/flat/tiles.png") as Texture2D
	src.texture_region_size = Vector2i(32, 32)
	src.create_tile(ac)
	for a in range(1, 8):
		var aid: int = src.create_alternative_tile(ac, a)
		var td: TileData = src.get_tile_data(ac, aid)
		td.transpose = (a & 1) != 0
		td.flip_h = (a & 2) != 0
		td.flip_v = (a & 4) != 0
	ts.add_source(src, 0)
	# terrain id -> {source id, key table}
	var sets: Dictionary = {}
	var names: Array = [[T_FIELD, "field"], [T_DRY, "dry"], [T_LUSH, "lush"], [T_FLOWER, "flower"], [T_DIRT, "dirt"]]
	for i in names.size():
		var tid: int = int(names[i][0])
		var nm: String = String(names[i][1])
		if not FileAccess.file_exists("res://art/flat/%s.json" % nm):
			continue
		var f2 := FileAccess.open("res://art/flat/%s.json" % nm, FileAccess.READ)
		var fd: Dictionary = JSON.parse_string(f2.get_as_text())
		var s2 := TileSetAtlasSource.new()
		s2.texture = load("res://art/flat/%s.png" % nm) as Texture2D
		s2.texture_region_size = Vector2i(32, 32)
		var tl: Dictionary = fd["tiles"]
		var table: Dictionary = {}
		for k in tl.keys():
			var xy: Array = tl[k]
			var c2 := Vector2i(int(xy[0]), int(xy[1]))
			if s2.get_tile_at_coords(c2) == Vector2i(-1, -1):
				s2.create_tile(c2)
			table[String(k)] = c2
		ts.add_source(s2, i + 1)
		sets[tid] = {"sid": i + 1, "table": table}
	var layer := TileMapLayer.new()
	layer.tile_set = ts
	layer.scale = Vector2(1.5, 1.5)
	layer.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	layer.z_index = -200
	add_child(layer)
	for cy in GH:
		for cx in GW:
			var cc: Array = cell_corners(cx, cy)
			var special: int = T_GRASS
			for v in cc:
				if sets.has(int(v)):
					special = int(v)
			if special != T_GRASS:
				var key: String = ""
				for v in cc:
					key += "u" if int(v) == special else "l"
				var tb: Dictionary = (sets[special] as Dictionary)["table"]
				if tb.has(key):
					layer.set_cell(Vector2i(cx, cy), int((sets[special] as Dictionary)["sid"]), tb[key])
					continue
			layer.set_cell(Vector2i(cx, cy), 0, ac, rngw.randi() % 8)

func _tiles() -> void:
	if flat:
		_tiles_flat()
		return
	if refst:
		var base := ColorRect.new()
		base.position = Vector2.ZERO
		base.size = Vector2(wx, wy)
		base.color = Color(0.52, 0.65, 0.27)
		base.z_index = -201
		base.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(base)
		var im := Image.create(64, 64, false, Image.FORMAT_RGBA8)
		for yy in 64:
			for xx in 64:
				var dx: float = (float(xx) - 31.5) / 32.0
				var dy: float = (float(yy) - 31.5) / 32.0
				if dx * dx + dy * dy <= 1.0:
					im.set_pixel(xx, yy, Color(1, 1, 1, 1))
		ell_tex = ImageTexture.create_from_image(im)
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
			if String(k) == ("uuuu" if i == 0 else "llll"):
				for a in range(1, 8):
					var aid: int = src.create_alternative_tile(ac, a)
					var td: TileData = src.get_tile_data(ac, aid)
					td.transpose = (a & 1) != 0
					td.flip_h = (a & 2) != 0
					td.flip_v = (a & 4) != 0
		ts.add_source(src, i)
		keys.append({"table": table, "upper": int((data[nm] as Dictionary)["upper"])})
	var layer := TileMapLayer.new()
	layer.tile_set = ts
	layer.scale = Vector2(1.5, 1.5)
	layer.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	layer.z_index = -200
	add_child(layer)
	var rng := RandomNumberGenerator.new()
	rng.seed = randi()
	for cy in GH:
		for cx in GW:
			var c: Array = cell_corners(cx, cy)
			var special: int = T_GRASS
			for v in c:
				if int(v) == T_FIELD or int(v) == T_FOREST:
					special = int(v)
			if refst and special == T_GRASS:
				continue
			var si: int = 0
			var alt: int = 0
			var key: String = ""
			if special == T_GRASS:
				si = 0
				key = "uuuu" if si == 0 else "llll"
				alt = rng.randi() % 8
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
			layer.set_cell(Vector2i(cx, cy), si, table2[key], alt)

func _minimap() -> void:
	var img := Image.create(GW, GH, false, Image.FORMAT_RGBA8)
	var cols: Dictionary = {0: Color(0.5, 0.64, 0.28), 1: Color(0.22, 0.5, 0.62), 2: Color(0.76, 0.62, 0.4), 3: Color(0.9, 0.74, 0.2), 4: Color(0.14, 0.3, 0.15), 5: Color(0.72, 0.68, 0.32), 6: Color(0.3, 0.52, 0.22), 7: Color(0.58, 0.68, 0.36), 8: Color(0.74, 0.6, 0.42)}
	var rk: Dictionary = {0: 0, 1: 4, 2: 1, 3: 9, 4: 8, 5: 5, 6: 6, 7: 7, 8: 3}
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
	rng.seed = randi()
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
			_tree(ta if rng.randf() < 0.5 else tb, p, sc, flat)
			rock_add(p, 30.0)

func _blocked(p: Vector2, r: float) -> bool:
	if pen.grow(150.0).has_point(p) or p.distance_to(dog_start) < 120.0:
		return true
	if not cell_open(clampi(int(p.x / CELL), 0, GW - 1), clampi(int(p.y / CELL), 0, GH - 1)):
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
	for i in 16:
		var p: Vector2 = random_open_point(24.0)
		var r: float = randf_range(16.0, 26.0)
		rock_add(p, r)
		var s := Sprite2D.new()
		s.texture = rk
		s.position = p + Vector2(0, 10)
		var w: float = clampf(r * 2.4, 40.0, 70.0)
		s.scale = Vector2.ONE * (w / float(rk.get_width()))
		s.offset = Vector2(0, -float(rk.get_height()) * 0.5 + 3.0)
		ysort.add_child(s)
	var ta: Texture2D = tex("tree_big_a")
	var tb: Texture2D = tex("tree_big_b")
	for i in 0:
		var p2: Vector2 = random_open_point(30.0)
		rock_add(p2, 16.0)
		_tree(ta if randf() < 0.5 else tb, p2, 1.3, true)
	var sh: Texture2D = tex("shrub_big")
	var bu: Texture2D = tex("bush")
	for i in 45:
		var p3: Vector2 = random_open_point(16.0)
		var big: bool = randf() < 0.6
		var s2 := Sprite2D.new()
		s2.texture = sh if big else bu
		s2.position = p3
		s2.scale = Vector2.ONE * ((2.1 if big else 1.7) if flat else (1.7 if big else 1.3))
		s2.offset = Vector2(0, -s2.texture.get_height() * 0.5 + 4.0)
		s2.material = wind_mat
		ysort.add_child(s2)

func _blob_shadow(p: Vector2, sx: float, sy: float) -> Sprite2D:
	if refst:
		var e := Sprite2D.new()
		e.texture = ell_tex
		e.position = p
		e.scale = Vector2(sx * 1.25, sy * 1.2)
		e.modulate = Color(0.16, 0.34, 0.14, 0.5)
		e.z_index = -60
		return e
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
	elif refst:
		add_child(_blob_shadow(p + Vector2(26.0 * sc, 14.0 * sc), 0.9 * sc, 0.45 * sc))

# ---------------------------------------------------------------- bridge and castle visuals
func _bridge() -> void:
	return
	var b := Bridge.new()
	b.size = bridge_rect.size
	b.position = bridge_rect.position
	b.z_index = -95
	add_child(b)

func _pen_visuals() -> void:
	if flat:
		var fl := Sprite2D.new()
		fl.texture = load("res://art/flat/path_tex.png") as Texture2D
		fl.region_enabled = true
		fl.region_rect = Rect2(0, 0, (pen.size.x + 70.0) / 1.5, (pen.size.y + 60.0) / 1.5)
		fl.scale = Vector2(1.5, 1.5)
		fl.texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
		fl.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		fl.position = pen.get_center() + Vector2(0, 14)
		fl.z_index = -150
		add_child(fl)
	var dirt := Sprite2D.new()
	dirt.texture = _masked("ground/gdirt")
	dirt.position = pen.get_center()
	dirt.scale = Vector2(1.3, 1.1)
	dirt.modulate = Color(1, 1, 1, 0.85)
	dirt.z_index = -150
	if not flat:
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
	for g in gap_ctrl:
		gaps.append(g)
	var center: Vector2 = pen.get_center()
	for tries in 1600:
		if inner_pts.size() >= 150:
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
	if river_pts.size() > 1 and dist_poly(p, river_pts) < 46.0:
		return "water"
	return ""

# ---------------------------------------------------------------- smooth river and paths
func _meander(pts: Array, jitter: float) -> Array:
	var out: Array = []
	for i in pts.size() - 1:
		var a: Vector2 = pts[i]
		var b: Vector2 = pts[i + 1]
		var l: float = a.distance_to(b)
		var n: int = maxi(1, int(l / 90.0))
		var perp: Vector2 = (b - a).normalized().orthogonal()
		for s in n:
			var t: float = float(s) / float(n)
			var off: float = 0.0 if s == 0 else rngw.randf_range(-jitter, jitter)
			out.append(a.lerp(b, t) + perp * off)
	out.append(pts[pts.size() - 1])
	return out

func _smooth(pts: Array, seg: int) -> Array:
	var out: Array = []
	for i in pts.size() - 1:
		var p0: Vector2 = pts[maxi(i - 1, 0)]
		var p1: Vector2 = pts[i]
		var p2: Vector2 = pts[i + 1]
		var p3: Vector2 = pts[mini(i + 2, pts.size() - 1)]
		for s in seg:
			var t: float = float(s) / float(seg)
			out.append(0.5 * ((2.0 * p1) + (-p0 + p2) * t + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t * t + (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t * t * t))
	out.append(pts[pts.size() - 1])
	return out

func _ribbon(pts: Array, width: float, tex_path: String, tint: Color, edge_col: Color, edge_w: float, fringe: float, flow: float, sparkle: float, z: int, taper: bool = false) -> void:
	var white := Image.create(4, 4, false, Image.FORMAT_RGBA8)
	white.fill(Color(1, 1, 1, 1))
	var l := Line2D.new()
	l.points = PackedVector2Array(pts)
	l.width = width
	l.texture = ImageTexture.create_from_image(white)
	l.texture_mode = Line2D.LINE_TEXTURE_STRETCH
	l.joint_mode = Line2D.LINE_JOINT_ROUND
	l.begin_cap_mode = Line2D.LINE_CAP_ROUND
	l.end_cap_mode = Line2D.LINE_CAP_ROUND
	l.z_index = z
	var c := Curve.new()
	for i in 9:
		var k: float = 1.0
		if taper and i >= 6:
			k = [0.75, 0.5, 0.28][i - 6]
		c.add_point(Vector2(float(i) / 8.0, rngw.randf_range(0.86, 1.14) * k))
	l.width_curve = c
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/ribbon.gdshader") as Shader
	m.set_shader_parameter("tex", load(tex_path) as Texture2D)
	m.set_shader_parameter("tex_scale", 48.0)
	m.set_shader_parameter("tint", Vector3(tint.r, tint.g, tint.b))
	m.set_shader_parameter("edge_col", Vector3(edge_col.r, edge_col.g, edge_col.b))
	m.set_shader_parameter("edge_w", edge_w)
	m.set_shader_parameter("fringe", fringe)
	m.set_shader_parameter("flow", flow)
	m.set_shader_parameter("sparkle", sparkle)
	l.material = m
	add_child(l)

func _ribbons() -> void:
	var ptex: String = "res://art/flat/path_tex.png" if flat else "res://art/tiles/path_tex.png"
	if river_ctrl.size() > 1:
		river_pts = _smooth(_meander(river_ctrl, 22.0), 10)
	# muddy bank under the water, then the water itself
	if river_pts.size() > 1:
		_ribbon(river_pts, 150.0, "res://art/tiles/path_tex.png", Color(0.5, 0.42, 0.28), Color(0.3, 0.24, 0.14), 0.0, 0.34, 0.0, 0.0, -193)
	if river_pts.size() > 1:
		_ribbon(river_pts, 104.0, "res://art/tiles/water_tex.png", Color(1, 1, 1), Color(0.16, 0.3, 0.3), 0.16, 0.12, 1.0, 1.0, -192)
	for pl in paths_ctrl:
		var sm: Array = _smooth(_meander(pl, 12.0), 8)
		path_pts.append(sm)
		if refst:
			_ribbon(sm, 92.0, ptex, Color(0.95, 0.84, 0.66), Color(0.6, 0.45, 0.25), 0.0, 0.55, 0.0, 0.0, -191, true)
			_ribbon(sm, 74.0, ptex, Color(1.12, 0.98, 0.78), Color(0.6, 0.45, 0.25), 0.0, 0.42, 0.0, 0.0, -190, true)
		else:
			_ribbon(sm, 60.0, ptex, Color(0.82, 0.7, 0.55) if flat else Color(0.5, 0.36, 0.22), Color(0.4, 0.28, 0.16), 0.0, 0.4, 0.0, 0.0, -191, true)
			_ribbon(sm, 48.0, ptex, Color(1, 1, 1), Color(0.5, 0.36, 0.2), 0.0, 0.22, 0.0, 0.0, -190, true)

func _ground_patches() -> void:
	if flat:
		return
	var g := ColorRect.new()
	g.position = Vector2.ZERO
	g.size = Vector2(wx, wy)
	g.z_index = -199
	g.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/patches.gdshader") as Shader
	m.set_shader_parameter("world_size", Vector2(wx, wy))
	var fn := FastNoiseLite.new()
	fn.seed = randi()
	fn.frequency = 0.012
	fn.fractal_octaves = 3
	var nt := NoiseTexture2D.new()
	nt.noise = fn
	nt.seamless = true
	nt.width = 512
	nt.height = 512
	m.set_shader_parameter("noise_tex", nt)
	m.set_shader_parameter("amt", 0.12 if refst else 1.0)
	g.material = m
	add_child(g)

# ---------------------------------------------------------------- decals: tufts, flowers, pebbles, reeds, lily pads
func _decal_tex(name: String, fallback: String) -> Texture2D:
	var p: String = "res://art/decals/%s.png" % name
	if ResourceLoader.exists(p):
		return load(p) as Texture2D
	return tex(fallback)

func _on_open_grass(p: Vector2) -> bool:
	if p.x < 20.0 or p.y < 20.0 or p.x > wx - 20.0 or p.y > wy - 20.0:
		return false
	if not cell_open(int(p.x / CELL), int(p.y / CELL)):
		return false
	if pen.grow(30.0).has_point(p) or dist_poly(p, river_pts) < 84.0:
		return false
	for pp in path_pts:
		if dist_poly(p, pp) < 38.0:
			return false
	return true

func _decal(t: Texture2D, p: Vector2, sc: float, z: int, sway: bool, in_ysort: bool) -> void:
	var s := Sprite2D.new()
	s.texture = t
	s.position = p
	s.scale = Vector2.ONE * sc
	s.offset = Vector2(0, -t.get_height() * 0.5 + 3.0)
	if sway:
		s.material = wind_mat
	s.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST if t.get_width() <= 40 else CanvasItem.TEXTURE_FILTER_LINEAR
	if in_ysort:
		ysort.add_child(s)
	else:
		s.z_index = z
		add_child(s)

func _decals() -> void:
	if flat:
		return
	if refst:
		var fa0: Texture2D = tex("flowers_a")
		var fb0: Texture2D = tex("flowers_b")
		var tf0: Texture2D = tex("tuft")
		for i in 110:
			var c0 := Vector2(rngw.randf_range(30.0, wx - 30.0), rngw.randf_range(30.0, wy - 30.0))
			if not _on_open_grass(c0):
				continue
			for j in (2 + rngw.randi() % 3):
				var p0: Vector2 = c0 + Vector2(rngw.randf_range(-24.0, 24.0), rngw.randf_range(-12.0, 12.0))
				var pk: float = rngw.randf()
				if pk < 0.7:
					_decal(fa0 if pk < 0.35 else fb0, p0, 0.9, -119, true, false)
				else:
					_decal(tf0, p0, rngw.randf_range(0.5, 0.8), -120, true, false)
		return
	var tuft: Texture2D = _decal_tex("tuft", "tuft")
	var tuft_old: Texture2D = tex("tuft")
	var fa: Texture2D = tex("flowers_a")
	var fb: Texture2D = tex("flowers_b")
	var pebbles: Texture2D = _decal_tex("pebbles", "rock2")
	var reeds: Texture2D = _decal_tex("reeds", "tuft")
	var lily: Texture2D = _decal_tex("lily", "tuft")
	for i in 420:
		var c := Vector2(rngw.randf_range(30.0, wx - 30.0), rngw.randf_range(30.0, wy - 30.0))
		if not _on_open_grass(c):
			continue
		for j in 3:
			var p: Vector2 = c + Vector2(rngw.randf_range(-26.0, 26.0), rngw.randf_range(-14.0, 14.0))
			var pick: float = rngw.randf()
			if pick < 0.45:
				_decal(tuft, p, rngw.randf_range(1.0, 1.5), -120, true, false)
			elif pick < 0.65:
				_decal(tuft_old, p, rngw.randf_range(0.7, 1.0), -120, true, false)
			else:
				_decal(fa if pick < 0.83 else fb, p, 0.85, -119, true, false)
	for pp in path_pts:
		for i in range(0, pp.size(), 3):
			if rngw.randf() < 0.55:
				var q: Vector2 = pp[i]
				var side: float = 1.0 if rngw.randf() < 0.5 else -1.0
				var off: Vector2 = (pp[mini(i + 1, pp.size() - 1)] - q).normalized().orthogonal() * side * rngw.randf_range(20.0, 40.0)
				_decal(pebbles, q + off, rngw.randf_range(0.6, 0.9), -140, false, false)
	for i in range(0, river_pts.size(), 2):
		var q2: Vector2 = river_pts[i]
		var dir: Vector2 = (river_pts[mini(i + 1, river_pts.size() - 1)] - q2).normalized()
		var nrm: Vector2 = dir.orthogonal()
		for side in [-1.0, 1.0]:
			if rngw.randf() < 0.75 and not bridge_rect.grow(30.0).has_point(q2):
				var rp: Vector2 = q2 + nrm * float(side) * rngw.randf_range(54.0, 66.0)
				if rp.x > 0.0 and rp.x < wx and rp.y > 0.0 and rp.y < wy:
					_decal(reeds, rp, rngw.randf_range(1.0, 1.5), 0, true, true)
		if rngw.randf() < 0.22 and not bridge_rect.grow(40.0).has_point(q2):
			_decal(lily, q2 + nrm * rngw.randf_range(-26.0, 26.0), rngw.randf_range(1.0, 1.4), -92, false, false)
