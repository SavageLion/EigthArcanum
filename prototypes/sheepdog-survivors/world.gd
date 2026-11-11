class_name World
extends Node2D
# The arena: one painted meadow, the pen right in the middle, a ring of trees around the edge.

var wx: float = 1800.0
var wy: float = 1200.0
var pen: Rect2
var gate_x: float = 0.0
var gap: float = 100.0
var walls: Array = []
var rocks: Array = []
var zones: Array = []
var dog_start: Vector2 = Vector2.ZERO
var ysort: Node2D
var wind_mat: ShaderMaterial
var shadow_tex: Texture2D

func tex(tname: String) -> Texture2D:
	return load("res://art/" + tname + ".png") as Texture2D

func generate(ysort_node: Node2D) -> void:
	ysort = ysort_node
	shadow_tex = U.shadow_texture()
	wind_mat = ShaderMaterial.new()
	wind_mat.shader = load("res://shaders/wind.gdshader") as Shader
	_ground()
	_layout()
	_obstacles()
	_deco()
	_pen_visuals()

func _ground() -> void:
	var g := ColorRect.new()
	g.position = Vector2(-300.0, -300.0)
	g.size = Vector2(wx + 600.0, wy + 600.0)
	g.z_index = -200
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/ground.gdshader") as Shader
	m.set_shader_parameter("world_size", g.size)
	g.material = m
	add_child(g)
	var masked: Array = []
	for n in ["g0", "g0", "g2", "g1", "g3"]:
		masked.append(_masked("ground/" + String(n)))
	var gy: float = -300.0
	while gy < wy + 300.0:
		var gx: float = -300.0
		while gx < wx + 300.0:
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
			s.modulate = Color(1, 1, 1, 0.32)
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
	var pw: float = 210.0
	var ph: float = 160.0
	var px: float = wx / 2.0 - pw / 2.0
	var py: float = wy / 2.0 - ph / 2.0
	gate_x = px + pw / 2.0
	pen = Rect2(px, py, pw, ph)
	var hp: float = 90.0
	var by: float = py + ph
	walls = [
		_wall(Vector2(px, py), Vector2(px + pw, py), true, hp),
		_wall(Vector2(px, py), Vector2(px, by), true, hp),
		_wall(Vector2(px + pw, py), Vector2(px + pw, by), true, hp),
		_wall(Vector2(px, by), Vector2(gate_x - gap / 2.0, by), true, hp),
		_wall(Vector2(gate_x + gap / 2.0, by), Vector2(px + pw, by), true, hp),
	]
	dog_start = Vector2(gate_x, by + 120.0)

func _wall(a: Vector2, b: Vector2, is_pen: bool, hp: float) -> Dictionary:
	return {"a": a, "b": b, "pen": is_pen, "hp": hp, "max": hp, "broken": false, "nodes": []}

func in_zone(_p: Vector2, _margin: float) -> bool:
	return false

func zone_kind(_p: Vector2) -> String:
	return ""

func _blocked(p: Vector2, r: float) -> bool:
	if pen.grow(150.0).has_point(p) or p.distance_to(dog_start) < 120.0:
		return true
	for k in rocks:
		var kp: Vector2 = k["pos"]
		if p.distance_to(kp) < float(k["r"]) + r + 50.0:
			return true
	return false

func _obstacles() -> void:
	var rk: Texture2D = tex("rock2")
	for i in 7:
		for tries in 30:
			var r: float = randf_range(16.0, 26.0)
			var p := Vector2(randf_range(120.0, wx - 120.0), randf_range(120.0, wy - 100.0))
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
	var tb: Texture2D = tex("tree_big_b")
	var ta: Texture2D = tex("tree_big_a")
	for i in 5:
		for tries in 30:
			var p := Vector2(randf_range(160.0, wx - 160.0), randf_range(180.0, wy - 120.0))
			if _blocked(p, 14.0):
				continue
			rocks.append({"pos": p, "r": 14.0})
			_tree(tb, p, 1.25)
			break
	var xs: float = -20.0
	while xs < wx + 20.0:
		_tree(ta if randf() < 0.5 else tb, Vector2(xs, 40.0 + randf() * 14.0), 1.7)
		xs += 120.0 + randf() * 60.0
	xs = -10.0
	while xs < wx + 20.0:
		_tree(ta if randf() < 0.5 else tb, Vector2(xs, wy + 40.0 + randf() * 14.0), 1.7)
		xs += 120.0 + randf() * 60.0
	var ys: float = 160.0
	while ys < wy - 60.0:
		_tree(ta if randf() < 0.5 else tb, Vector2(-14.0 + randf() * 12.0, ys), 1.7)
		_tree(ta if randf() < 0.5 else tb, Vector2(wx + 6.0 + randf() * 12.0, ys + 30.0), 1.7)
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
	for i in 40:
		var c := Vector2(randf_range(0.0, wx), randf_range(60.0, wy))
		for j in (2 + randi() % 3):
			var p := c + Vector2(randf_range(-30.0, 30.0), randf_range(-15.0, 15.0))
			if p.x < 0.0 or p.x > wx or p.y < 50.0 or p.y > wy or pen.grow(14.0).has_point(p):
				continue
			var s := Sprite2D.new()
			s.texture = tuft
			s.position = p
			s.scale = Vector2.ONE * randf_range(0.65, 1.05)
			s.offset = Vector2(0, -9)
			s.material = wind_mat
			s.z_index = -120
			add_child(s)
	for i in 28:
		var c := Vector2(randf_range(0.0, wx), randf_range(80.0, wy))
		for j in 3:
			var p := c + Vector2(randf_range(-25.0, 25.0), randf_range(-13.0, 13.0))
			if pen.grow(14.0).has_point(p):
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
	for i in 22:
		var p := Vector2(randf_range(80.0, wx - 80.0), randf_range(100.0, wy - 50.0))
		if _blocked(p, 30.0):
			continue
		var big: bool = randf() < 0.6
		var s := Sprite2D.new()
		s.texture = sh if big else bu
		s.position = p
		s.scale = Vector2.ONE * (1.7 if big else 1.3)
		s.offset = Vector2(0, -s.texture.get_height() * 0.5 + 4.0)
		s.material = wind_mat
		ysort.add_child(s)

func _pen_visuals() -> void:
	var dirt := Sprite2D.new()
	dirt.texture = _masked("ground/gdirt")
	dirt.position = pen.get_center()
	dirt.scale = Vector2(1.3, 1.1)
	dirt.modulate = Color(1, 1, 1, 0.85)
	dirt.z_index = -150
	add_child(dirt)
	var fence_h: Texture2D = tex("fence")
	for w in walls:
		var a: Vector2 = w["a"]
		var b: Vector2 = w["b"]
		var l: float = a.distance_to(b)
		if l < 2.0:
			continue
		var nodes: Array = []
		var ang: float = atan2(b.y - a.y, b.x - a.x)
		var n2: int = maxi(1, roundi(l / 80.0))
		var sw: float = l / float(n2)
		var k: float = sw / float(fence_h.get_width()) + 0.01
		for i in n2:
			var t: float = (float(i) + 0.5) / float(n2)
			var s := Sprite2D.new()
			s.texture = fence_h
			s.position = a.lerp(b, t)
			s.rotation = ang
			s.scale = Vector2(k, k * 1.15)
			s.offset = Vector2(0, -3)
			ysort.add_child(s)
			nodes.append(s)
		w["nodes"] = nodes
