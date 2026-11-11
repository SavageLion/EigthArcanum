class_name World
extends Node2D
# Builds one meadow: painted ground, dirt track, mud, a stream, trees, rocks, flowers, the pen and its fence.

var wx: float = 2100.0
var wy: float = 960.0
var pen: Rect2
var gate_y: float = 0.0
var gap: float = 84.0
var walls: Array = []
var rocks: Array = []
var zones: Array = []
var dog_start: Vector2 = Vector2.ZERO
var ysort: Node2D
var wind_mat: ShaderMaterial
var water_mat: ShaderMaterial
var shadow_tex: Texture2D

func tex(tname: String) -> Texture2D:
	return load("res://art/" + tname + ".png") as Texture2D

func generate(ysort_node: Node2D) -> void:
	ysort = ysort_node
	shadow_tex = U.shadow_texture()
	wind_mat = ShaderMaterial.new()
	wind_mat.shader = load("res://shaders/wind.gdshader") as Shader
	water_mat = ShaderMaterial.new()
	water_mat.shader = load("res://shaders/water.gdshader") as Shader
	_ground()
	_layout()
	_track()
	_mud()
	_stream()
	_obstacles()
	_deco()
	_pen_visuals()

func _ground() -> void:
	var g := ColorRect.new()
	g.size = Vector2(wx, wy)
	g.z_index = -200
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/ground.gdshader") as Shader
	m.set_shader_parameter("world_size", Vector2(wx, wy))
	g.material = m
	add_child(g)
	# painted patches, rotated and flipped so nothing visibly repeats
	var masked: Array = []
	for n in ["g0", "g0", "g2", "g1", "g3"]:
		masked.append(_masked("ground/" + String(n)))
	var gy: float = -60.0
	while gy < wy:
		var gx: float = -60.0
		while gx < wx:
			var r: float = randf()
			var idx: int = 0
			if r > 0.94:
				idx = 3
			elif r > 0.88:
				idx = 4
			elif r > 0.7:
				idx = 2
			var s := Sprite2D.new()
			s.texture = masked[idx]
			s.position = Vector2(gx + 128.0 + randf_range(-12, 12), gy + 128.0 + randf_range(-12, 12))
			var o: int = randi() % 8
			s.rotation = float(o & 3) * PI / 2.0
			s.flip_h = (o & 4) != 0
			s.z_index = -190
			add_child(s)
			gx += 176.0
		gy += 176.0

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

func _layout() -> void:
	var pw: float = 150.0
	var ph: float = 190.0
	var px: float = wx - pw - 18.0
	var py: float = randf_range(120.0, wy - ph - 120.0)
	gate_y = py + ph / 2.0 + randf_range(-30.0, 30.0)
	pen = Rect2(px, py, pw, ph)
	var hp: float = 70.0
	walls = [
		_wall(Vector2(px, py), Vector2(px + pw, py), true, hp),
		_wall(Vector2(px, py + ph), Vector2(px + pw, py + ph), true, hp),
		_wall(Vector2(px + pw, py), Vector2(px + pw, py + ph), true, hp),
		_wall(Vector2(px, py), Vector2(px, gate_y - gap / 2.0), true, hp),
		_wall(Vector2(px, gate_y + gap / 2.0), Vector2(px, py + ph), true, hp),
		_wall(Vector2(px - 70.0, gate_y - gap / 2.0 - 46.0), Vector2(px, gate_y - gap / 2.0), false, 0.0),
		_wall(Vector2(px - 70.0, gate_y + gap / 2.0 + 46.0), Vector2(px, gate_y + gap / 2.0), false, 0.0),
	]
	dog_start = Vector2(px - 260.0, gate_y)

func _wall(a: Vector2, b: Vector2, is_pen: bool, hp: float) -> Dictionary:
	return {"a": a, "b": b, "pen": is_pen, "hp": hp, "max": hp, "broken": false, "nodes": []}

func _track() -> void:
	var p0 := Vector2(-10.0, wy * 0.5 + randf_range(-120.0, 120.0))
	var p2 := Vector2(pen.position.x - 50.0, gate_y)
	var ctl := (p0 + p2) / 2.0 + Vector2(0.0, randf_range(-160.0, 160.0))
	var pts := PackedVector2Array()
	for i in range(0, 61):
		var t: float = float(i) / 60.0
		var q: Vector2 = p0 * (1.0 - t) * (1.0 - t) + ctl * 2.0 * (1.0 - t) * t + p2 * t * t
		q += Vector2(sin(t * 23.0) * 3.0, cos(t * 19.0) * 3.0)
		pts.append(q)
	var edge := Line2D.new()
	edge.points = pts
	edge.width = 46.0
	edge.default_color = Color(0.45, 0.33, 0.16, 0.28)
	edge.joint_mode = Line2D.LINE_JOINT_ROUND
	edge.begin_cap_mode = Line2D.LINE_CAP_ROUND
	edge.end_cap_mode = Line2D.LINE_CAP_ROUND
	edge.z_index = -181
	add_child(edge)
	var l := Line2D.new()
	l.points = pts
	l.width = 34.0
	l.texture = tex("ground/gdirt")
	l.texture_mode = Line2D.LINE_TEXTURE_TILE
	l.texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
	l.joint_mode = Line2D.LINE_JOINT_ROUND
	l.begin_cap_mode = Line2D.LINE_CAP_ROUND
	l.end_cap_mode = Line2D.LINE_CAP_ROUND
	l.z_index = -180
	add_child(l)

func _blob(c: Vector2, rx: float, ry: float, t: Texture2D, z: int) -> void:
	var pts := PackedVector2Array()
	var uvs := PackedVector2Array()
	var seed_v: float = randf() * 10.0
	for i in 28:
		var a: float = float(i) / 28.0 * TAU
		var k: float = 1.0 + sin(a * 3.0 + seed_v) * 0.12 + sin(a * 5.0 + seed_v * 2.0) * 0.08
		var p := Vector2(c.x + cos(a) * rx * k, c.y + sin(a) * ry * k)
		pts.append(p)
		uvs.append(p)
	var poly := Polygon2D.new()
	poly.polygon = pts
	poly.uv = uvs
	poly.texture = t
	poly.texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
	poly.z_index = z
	add_child(poly)

func _mud() -> void:
	var t: Texture2D = tex("ground/gmud")
	for i in 3:
		var c := Vector2(randf_range(260.0, wx * 0.4), randf_range(120.0, wy - 120.0))
		if c.distance_to(dog_start) < 200.0:
			continue
		var rx: float = randf_range(50.0, 78.0)
		var ry: float = randf_range(32.0, 50.0)
		_blob(c, rx, ry, t, -175)
		zones.append({"kind": "mud", "c": c, "rx": rx, "ry": ry})

func _stream() -> void:
	var t: Texture2D = tex("ground/gwater")
	var sx: float = wx * randf_range(0.4, 0.5)
	var f1: float = wy * randf_range(0.2, 0.34)
	var f2: float = wy * randf_range(0.62, 0.76)
	var spans: Array = [Vector2(40.0, f1), Vector2(f1 + 100.0, f2), Vector2(f2 + 100.0, wy)]
	for s in spans:
		var sp: Vector2 = s
		var y0: float = sp.x
		var y1: float = sp.y
		var left: Array = []
		var right: Array = []
		var y: float = y0
		while y <= y1:
			left.append(Vector2(sx + sin(y * 0.03) * 5.0 + randf_range(-2, 2), y))
			right.append(Vector2(sx + 46.0 + sin(y * 0.027 + 1.0) * 5.0 + randf_range(-2, 2), y))
			y += 14.0
		var pts := PackedVector2Array()
		for p in left:
			pts.append(p)
		for i in range(right.size() - 1, -1, -1):
			pts.append(right[i])
		var uvs := PackedVector2Array()
		for p in pts:
			uvs.append(p)
		var poly := Polygon2D.new()
		poly.polygon = pts
		poly.uv = uvs
		poly.texture = t
		poly.texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
		poly.material = water_mat
		poly.z_index = -170
		add_child(poly)
		zones.append({"kind": "water", "rect": Rect2(sx - 4.0, y0, 54.0, y1 - y0)})

func in_zone(p: Vector2, margin: float) -> bool:
	for z in zones:
		if z["kind"] == "water":
			if (z["rect"] as Rect2).grow(margin).has_point(p):
				return true
		else:
			var c: Vector2 = z["c"]
			var d: Vector2 = p - c
			var rx: float = float(z["rx"]) + margin
			var ry: float = float(z["ry"]) + margin
			if (d.x * d.x) / (rx * rx) + (d.y * d.y) / (ry * ry) < 1.0:
				return true
	return false

func zone_kind(p: Vector2) -> String:
	for z in zones:
		if z["kind"] == "water":
			if (z["rect"] as Rect2).has_point(p):
				return "water"
		else:
			var c: Vector2 = z["c"]
			var d: Vector2 = p - c
			var rx: float = float(z["rx"])
			var ry: float = float(z["ry"])
			if (d.x * d.x) / (rx * rx) + (d.y * d.y) / (ry * ry) < 1.0:
				return "mud"
	return ""

func _blocked(p: Vector2, r: float) -> bool:
	if pen.grow(120.0).has_point(p) or p.distance_to(dog_start) < 150.0 or in_zone(p, 14.0):
		return true
	for k in rocks:
		var kp: Vector2 = k["pos"]
		if p.distance_to(kp) < float(k["r"]) + r + 40.0:
			return true
	return false

func _obstacles() -> void:
	var rk: Texture2D = tex("rock2")
	for i in 5:
		for tries in 30:
			var r: float = randf_range(16.0, 28.0)
			var p := Vector2(randf_range(260.0, pen.position.x - 140.0), randf_range(80.0, wy - 60.0))
			if _blocked(p, r):
				continue
			rocks.append({"pos": p, "r": r})
			var s := Sprite2D.new()
			s.texture = rk
			s.position = p + Vector2(0, 10)
			var w: float = clampf(r * 1.7, 30.0, 52.0)
			s.scale = Vector2(w / 30.0, w / 30.0)
			s.offset = Vector2(0, -13)
			ysort.add_child(s)
			break
	var tr: Texture2D = tex("tree_big_b")
	for i in 4:
		for tries in 30:
			var p := Vector2(randf_range(260.0, pen.position.x - 140.0), randf_range(120.0, wy - 60.0))
			if _blocked(p, 14.0):
				continue
			rocks.append({"pos": p, "r": 14.0})
			_tree(tr, p, 0.7)
			break
	# a ring of big trees around the edges
	var edge_a: Texture2D = tex("tree_big_a")
	var xs: float = -10.0
	while xs < wx - 30.0:
		_tree(edge_a if randf() < 0.5 else tr, Vector2(xs, 96.0 + randf() * 12.0), 0.85)
		xs += 105.0 + randf() * 60.0
	xs = 10.0
	while xs < wx - 40.0:
		_tree(edge_a if randf() < 0.5 else tr, Vector2(xs, wy + 82.0 + randf() * 12.0), 0.85)
		xs += 115.0 + randf() * 60.0
	var ys: float = 200.0
	while ys < wy - 110.0:
		_tree(edge_a if randf() < 0.5 else tr, Vector2(-30.0 + randf() * 12.0, ys), 0.85)
		ys += 150.0 + randf() * 40.0

func _blob_shadow(p: Vector2, sx: float, sy: float) -> Sprite2D:
	var s := Sprite2D.new()
	s.texture = shadow_tex
	s.position = p
	s.scale = Vector2(sx * 2.6, sy * 2.6)
	s.z_index = -60
	return s

func _tree(t: Texture2D, p: Vector2, sc: float) -> void:
	var s := Sprite2D.new()
	s.texture = t
	s.position = p + Vector2(0, 14.0 * sc)
	s.scale = Vector2(sc, sc)
	s.offset = Vector2(0, -t.get_height() * 0.5 + 4.0)
	s.material = wind_mat
	s.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	ysort.add_child(s)
	add_child(_blob_shadow(p + Vector2(18.0 * sc, 12.0 * sc), 0.9 * sc, 0.32 * sc))

func _deco() -> void:
	var tuft: Texture2D = tex("tuft")
	var fa: Texture2D = tex("flowers_a")
	var fb: Texture2D = tex("flowers_b")
	for i in 70:
		var c := Vector2(randf_range(0.0, wx), randf_range(60.0, wy))
		for j in (3 + randi() % 4):
			var p := c + Vector2(randf_range(-30.0, 30.0), randf_range(-15.0, 15.0))
			if p.x < 0.0 or p.x > wx or p.y < 50.0 or p.y > wy or in_zone(p, 10.0) or pen.grow(10.0).has_point(p):
				continue
			var s := Sprite2D.new()
			s.texture = tuft
			s.position = p
			s.scale = Vector2.ONE * randf_range(0.65, 1.05)
			s.offset = Vector2(0, -9)
			s.material = wind_mat
			s.z_index = -120
			add_child(s)
	for i in 22:
		var c := Vector2(randf_range(0.0, wx), randf_range(80.0, wy))
		for j in 3:
			var p := c + Vector2(randf_range(-25.0, 25.0), randf_range(-13.0, 13.0))
			if in_zone(p, 10.0) or pen.grow(10.0).has_point(p):
				continue
			var s := Sprite2D.new()
			s.texture = fa if randf() < 0.5 else fb
			s.position = p
			s.scale = Vector2.ONE * 0.9
			s.offset = Vector2(0, -9)
			s.material = wind_mat
			s.z_index = -119
			add_child(s)
	var sh: Texture2D = tex("shrub_big")
	var bu: Texture2D = tex("bush")
	for i in 7:
		var p := Vector2(randf_range(80.0, wx - 80.0), randf_range(100.0, wy - 50.0))
		if _blocked(p, 30.0):
			continue
		var big: bool = randf() < 0.6
		var s := Sprite2D.new()
		s.texture = sh if big else bu
		s.position = p
		s.scale = Vector2.ONE * (0.95 if big else 1.0)
		s.offset = Vector2(0, -s.texture.get_height() * 0.5 + 4.0)
		s.material = wind_mat
		ysort.add_child(s)

func _pen_visuals() -> void:
	var dirt := Sprite2D.new()
	dirt.texture = _masked("ground/gdirt")
	dirt.position = pen.get_center()
	dirt.modulate = Color(1, 1, 1, 0.85)
	dirt.z_index = -150
	add_child(dirt)
	var fence_h: Texture2D = tex("fence")
	var fence_v: Texture2D = tex("fence_v")
	for w in walls:
		var a: Vector2 = w["a"]
		var b: Vector2 = w["b"]
		var l: float = a.distance_to(b)
		if l < 2.0:
			continue
		var nodes: Array = []
		var vertical: bool = absf(b.x - a.x) < absf(b.y - a.y) * 0.25
		if vertical:
			var n: int = maxi(1, roundi(l / 60.0))
			var shh: float = l / float(n)
			for i in n:
				var s := Sprite2D.new()
				s.texture = fence_v
				s.position = Vector2(a.x, minf(a.y, b.y) + shh * (float(i) + 0.5))
				s.scale = Vector2(1.7, shh / float(fence_v.get_height()) + 0.02)
				ysort.add_child(s)
				nodes.append(s)
		else:
			var ang: float = atan2(b.y - a.y, b.x - a.x)
			var n2: int = maxi(1, roundi(l / 88.0))
			var sw: float = l / float(n2)
			var hh: float = sw * float(fence_h.get_height()) / float(fence_h.get_width())
			for i in n2:
				var t: float = (float(i) + 0.5) / float(n2)
				var s := Sprite2D.new()
				s.texture = fence_h
				s.position = a.lerp(b, t) + Vector2(0, hh * 0.35)
				s.rotation = ang
				var k: float = sw / float(fence_h.get_width()) + 0.01
				s.scale = Vector2(k, k)
				ysort.add_child(s)
				nodes.append(s)
		w["nodes"] = nodes
