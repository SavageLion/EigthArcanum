extends Node2D
# Hot & Hangry: Godot driving slice. A closed, curvy ring road (a Curve2D, not a grid) with textured roads and pavement,
# shops and trees from the Pixel Lab art, ambient traffic that follows the curve, and a physics-driven food truck.

const SHOPS := ["shop_orange", "shop_green", "shop_blue", "shop_bakery", "shop_pizzeria", "shop_sushi", "shop_icecream", "shop_books", "shop_florist", "shop_arcade", "shop_barber"]
const TREES := ["tree", "tree", "tree_maple", "tree_cherry", "tree_pine"]
const ROAD_W := 96.0
const WALK_W := 190.0
const LANE := 22.0

var curve := Curve2D.new()
var length := 0.0
var world: Node2D
var player: Vehicle
var cam: Camera2D
var cars: Array[Vehicle] = []
var dust: CPUParticles2D
var shake := 0.0
var nitro := 0.6
var crashes := 0
var rng := RandomNumberGenerator.new()
var tex_cache := {}
var hud: Control
var hud_label: Label
var joy_on := false
var joy_origin := Vector2.ZERO
var joy_vec := Vector2.ZERO
var btn_boost := false
var btn_drift := false
var auto := false
var auto_t := 0.0
var placed: Array[Vector2] = []
var last_crash := 0

func tex(n: String) -> Texture2D:
	if not tex_cache.has(n):
		tex_cache[n] = load("res://art/%s.png" % n)
	return tex_cache[n]

func _ready() -> void:
	rng.seed = 12345
	if "--auto" in OS.get_cmdline_user_args():
		auto = true
	elif OS.has_feature("web"):
		var q = JavaScriptBridge.eval("new URLSearchParams(location.search).get('auto')")
		auto = q != null and str(q) == "1"
	_make_curve()
	_make_ground()
	_make_roads()
	world = Node2D.new()
	world.y_sort_enabled = true
	add_child(world)
	_make_scenery()
	_make_traffic()
	_make_player()
	_make_hud()

# ---------- geometry ----------
func _make_curve() -> void:
	var n := 18
	var pts: Array[Vector2] = []
	for i in n:
		var a := TAU * i / n
		var r := 1000.0 + 260.0 * sin(2.0 * a + 0.7) + 170.0 * cos(3.0 * a + 0.3)
		pts.append(Vector2(cos(a) * r * 1.5, sin(a) * r * 0.9))
	for i in n:
		var h := (pts[(i + 1) % n] - pts[(i - 1 + n) % n]) / 6.0
		curve.add_point(pts[i], -h, h)
	var h0 := (pts[1] - pts[n - 1]) / 6.0
	curve.add_point(pts[0], -h0, h0)
	length = curve.get_baked_length()

func _pattern(names: Array, seed_i: int) -> ImageTexture:
	var cells := 4
	var img := Image.create(cells * 28, cells * 28, false, Image.FORMAT_RGBA8)
	var r := RandomNumberGenerator.new()
	r.seed = seed_i
	for j in cells:
		for i in cells:
			var src: Image = tex(names[r.randi() % names.size()]).get_image()
			src.convert(Image.FORMAT_RGBA8)
			img.blit_rect(src, Rect2i(0, 0, 28, 28), Vector2i(i * 28, j * 28))
	return ImageTexture.create_from_image(img)

func _tile_mat(names: Array, seed_i: int) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/worldtile.gdshader")
	m.set_shader_parameter("tex", _pattern(names, seed_i))
	m.set_shader_parameter("tex_size", Vector2(112, 112))
	return m

func _make_ground() -> void:
	var g := ColorRect.new()
	g.position = Vector2(-5200, -3600)
	g.size = Vector2(10400, 7200)
	g.material = _tile_mat(["gt_grass0", "gt_grass1"], 3)
	add_child(g)

func _line(pts: PackedVector2Array, w: float, mat: Material, col: Color) -> Line2D:
	var l := Line2D.new()
	l.points = pts
	l.closed = true
	l.width = w
	l.joint_mode = Line2D.LINE_JOINT_ROUND
	l.default_color = col
	l.antialiased = false
	if mat != null:
		l.material = mat
	add_child(l)
	return l

func _make_roads() -> void:
	var pts := curve.tessellate(5, 2.0)
	pts.remove_at(pts.size() - 1)
	_line(pts, WALK_W, _tile_mat(["gt_pave0", "gt_pave1"], 5), Color.WHITE)
	_line(pts, ROAD_W + 8.0, null, Color("#8a8070"))
	_line(pts, ROAD_W, _tile_mat(["gt_road0", "gt_road1"], 9), Color.WHITE)
	var d := Node2D.new()
	d.set_script(load("res://dashes.gd"))
	d.curve = curve
	d.length = length
	add_child(d)

# ---------- scenery ----------
func _tangent(off: float) -> Vector2:
	return (curve.sample_baked(fposmod(off + 8.0, length)) - curve.sample_baked(off)).normalized()

func _add_item(tname: String, base: Vector2, solid: Vector2) -> void:
	var t := tex(tname)
	var n := Node2D.new()
	n.position = base
	world.add_child(n)
	var s := Sprite2D.new()
	s.texture = t
	s.centered = false
	s.offset = Vector2(-t.get_width() / 2.0, -t.get_height() + 4.0)
	n.add_child(s)
	if solid.x > 0.0:
		var sb := StaticBody2D.new()
		var cs := CollisionShape2D.new()
		var rs := RectangleShape2D.new()
		rs.size = solid
		cs.shape = rs
		cs.position = Vector2(0, -solid.y / 2.0)
		sb.add_child(cs)
		n.add_child(sb)

func _free_spot(p: Vector2, r: float) -> bool:
	for q in placed:
		if q.distance_to(p) < r:
			return false
	return true

func _make_scenery() -> void:
	var off := 30.0
	while off < length:
		var p := curve.sample_baked(off)
		var tg := _tangent(off)
		var nm := Vector2(-tg.y, tg.x)
		for side in [-1.0, 1.0]:
			var out: Vector2 = nm * side
			var base: Vector2 = p + out * (WALK_W / 2.0 + 6.0)
			if out.y > 0.35:
				base += out * 100.0   # buildings south of the road sit behind their own pavement strip
			if _free_spot(base, 118.0):
				placed.append(base)
				if rng.randf() < 0.82:
					_add_item(SHOPS[rng.randi() % SHOPS.size()], base, Vector2(98, 56))
				else:
					_add_item(TREES[rng.randi() % TREES.size()], base + out * 20.0, Vector2(12, 10))
		off += 62.0
	# lamps, benches and bins along the pavement
	off = 20.0
	while off < length:
		var p := curve.sample_baked(off)
		var tg := _tangent(off)
		var nm := Vector2(-tg.y, tg.x)
		var side := 1.0 if int(off / 180.0) % 2 == 0 else -1.0
		var kind: String = ["prop_lamp", "prop_bench", "prop_bin", "prop_hydrant"][rng.randi() % 4]
		_add_item(kind, p + nm * side * (ROAD_W / 2.0 + 20.0), Vector2.ZERO)
		off += 150.0
	# park trees and planters in the middle of the ring and out beyond the shops
	for i in 260:
		var pos := Vector2(rng.randf_range(-2600.0, 2600.0), rng.randf_range(-1700.0, 1700.0))
		var cp := curve.get_closest_point(pos)
		if pos.distance_to(cp) < 260.0 and pos.distance_to(cp) > 130.0 and _free_spot(pos, 60.0):
			placed.append(pos)
			_add_item(TREES[rng.randi() % TREES.size()], pos, Vector2(12, 10))
		elif pos.distance_to(cp) >= 260.0 and rng.randf() < 0.25 and _free_spot(pos, 90.0):
			placed.append(pos)
			_add_item(TREES[rng.randi() % TREES.size()], pos, Vector2(12, 10))

# ---------- vehicles ----------
func _lane_pos(off: float, lane: float) -> Vector2:
	var tg := _tangent(off)
	return curve.sample_baked(off) + Vector2(-tg.y, tg.x) * LANE * lane

func _make_traffic() -> void:
	var kinds := ["sedan", "hatch", "taxi", "pickup"]
	for i in 16:
		var c := Vehicle.new()
		c.setup(kinds[i % 4], 13.0, 1.4, 12.0)
		c.max_speed = rng.randf_range(62.0, 96.0)
		c.accel = 220.0
		var off := length * float(i) / 16.0 + 400.0
		var lane := 1.0 if i % 2 == 0 else -1.0
		c.set_meta("lane", lane)
		c.position = _lane_pos(off, lane)
		c.heading = _tangent(off).angle() + (0.0 if lane > 0.0 else PI)
		world.add_child(c)
		cars.append(c)

func _make_player() -> void:
	player = Vehicle.new()
	player.is_player = true
	player.setup("truck", 17.0, 3.4, 14.0)
	player.max_speed = 175.0
	player.accel = 330.0
	player.turn_rate = 3.0
	player.position = _lane_pos(0.0, 1.0)
	player.heading = _tangent(0.0).angle()
	player.crashed.connect(_on_crash)
	world.add_child(player)
	cam = Camera2D.new()
	cam.position_smoothing_enabled = true
	cam.position_smoothing_speed = 6.0
	player.add_child(cam)
	cam.make_current()
	dust = CPUParticles2D.new()
	dust.local_coords = false
	dust.amount = 18
	dust.lifetime = 0.55
	dust.direction = Vector2.ZERO
	dust.spread = 180.0
	dust.initial_velocity_min = 10.0
	dust.initial_velocity_max = 28.0
	dust.gravity = Vector2.ZERO
	dust.scale_amount_min = 2.0
	dust.scale_amount_max = 4.0
	dust.color = Color(0.9, 0.85, 0.7, 0.6)
	dust.emitting = false
	world.add_child(dust)

func _on_crash(speed: float, at: Vector2) -> void:
	if Time.get_ticks_msec() - last_crash < 600:
		return
	last_crash = Time.get_ticks_msec()
	crashes += 1
	shake = minf(shake + clampf(speed / 40.0, 2.0, 8.0), 9.0)
	var lab := Label.new()
	lab.text = "CRASH!" if speed > 150.0 else "BUMP!"
	lab.position = at + Vector2(-20, -50)
	lab.add_theme_color_override("font_color", Color("#ffb84a"))
	lab.add_theme_color_override("font_outline_color", Color.BLACK)
	lab.add_theme_constant_override("outline_size", 3)
	lab.z_index = 100
	add_child(lab)
	var tw := create_tween()
	tw.tween_property(lab, "position:y", lab.position.y - 28.0, 0.7)
	tw.parallel().tween_property(lab, "modulate:a", 0.0, 0.7)
	tw.tween_callback(lab.queue_free)
	var p := CPUParticles2D.new()
	p.position = at
	p.one_shot = true
	p.explosiveness = 1.0
	p.amount = 14
	p.lifetime = 0.45
	p.spread = 180.0
	p.direction = Vector2.ZERO
	p.initial_velocity_min = 50.0
	p.initial_velocity_max = 120.0
	p.gravity = Vector2.ZERO
	p.scale_amount_min = 2.0
	p.scale_amount_max = 3.5
	p.color = Color("#ffd24a")
	add_child(p)
	p.emitting = true
	get_tree().create_timer(1.0).timeout.connect(p.queue_free)

# ---------- hud and input ----------
func _make_hud() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	hud = Control.new()
	hud.set_anchors_preset(Control.PRESET_FULL_RECT)
	hud.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud.draw.connect(_hud_draw)
	layer.add_child(hud)
	hud_label = Label.new()
	hud_label.position = Vector2(8, 6)
	hud_label.add_theme_font_size_override("font_size", 10)
	hud_label.add_theme_color_override("font_outline_color", Color.BLACK)
	hud_label.add_theme_constant_override("outline_size", 3)
	layer.add_child(hud_label)

func _hud_draw() -> void:
	if joy_on:
		hud.draw_circle(joy_origin, 26.0, Color(1, 1, 1, 0.18))
		hud.draw_circle(joy_origin + joy_vec * 26.0, 11.0, Color(1, 1, 1, 0.5))
	var b := Rect2(Vector2(480 - 58, 270 - 58), Vector2(50, 50))
	hud.draw_rect(b, Color(0.1, 0.05, 0.12, 0.7))
	hud.draw_rect(Rect2(b.position + Vector2(4, 4 + 42.0 * (1.0 - nitro)), Vector2(42, 42.0 * nitro)), Color("#4ad8ff") if btn_boost else Color("#ffd24a"))
	hud.draw_string(ThemeDB.fallback_font, b.position + Vector2(6, 30), "NITRO", HORIZONTAL_ALIGNMENT_LEFT, -1, 9, Color.WHITE)
	var d := Rect2(Vector2(480 - 116, 270 - 58), Vector2(50, 50))
	hud.draw_rect(d, Color(0.1, 0.05, 0.12, 0.7))
	hud.draw_string(ThemeDB.fallback_font, d.position + Vector2(8, 30), "DRIFT", HORIZONTAL_ALIGNMENT_LEFT, -1, 9, Color("#ffe9a8") if btn_drift else Color.WHITE)

func _input(e: InputEvent) -> void:
	if e is InputEventMouseButton and e.button_index == MOUSE_BUTTON_LEFT:
		var p: Vector2 = e.position
		if e.pressed:
			if Rect2(Vector2(480 - 58, 270 - 58), Vector2(50, 50)).has_point(p):
				btn_boost = true
			elif Rect2(Vector2(480 - 116, 270 - 58), Vector2(50, 50)).has_point(p):
				btn_drift = true
			else:
				joy_on = true
				joy_origin = p
				joy_vec = Vector2.ZERO
		else:
			joy_on = false
			joy_vec = Vector2.ZERO
			btn_boost = false
			btn_drift = false
	elif e is InputEventMouseMotion and joy_on:
		joy_vec = ((e.position - joy_origin) / 40.0).limit_length(1.0)

func _process(dt: float) -> void:
	if hud != null:
		hud.queue_redraw()
	var sp := player.linear_velocity.length()
	cam.zoom = cam.zoom.lerp(Vector2.ONE * lerpf(0.9, 0.68, clampf(sp / 230.0, 0.0, 1.0)), 2.0 * dt)
	shake = maxf(0.0, shake - 22.0 * dt)
	cam.offset = Vector2(rng.randf_range(-1, 1), rng.randf_range(-1, 1)) * shake
	var fwd := Vector2.RIGHT.rotated(player.heading)
	dust.position = player.position - fwd * 20.0 + Vector2(0, 8)
	dust.emitting = sp > 60.0
	dust.color = Color(1.0, 0.7, 0.3, 0.8) if player.boost > 0.0 else Color(0.9, 0.85, 0.7, 0.6)
	hud_label.text = "GODOT SLICE   %d fps   speed %d   crashes %d   [WASD/arrows, Space drift, Shift nitro, or drag]" % [Engine.get_frames_per_second(), int(sp), crashes]

func _physics_process(dt: float) -> void:
	# player controls
	var v := Vector2.ZERO
	v.x = Input.get_axis("ui_left", "ui_right")
	v.y = Input.get_axis("ui_up", "ui_down")
	if Input.is_key_pressed(KEY_A): v.x -= 1.0
	if Input.is_key_pressed(KEY_D): v.x += 1.0
	if Input.is_key_pressed(KEY_W): v.y -= 1.0
	if Input.is_key_pressed(KEY_S): v.y += 1.0
	v = v.limit_length(1.0)
	if joy_vec.length() > 0.1:
		v = joy_vec
	if auto:
		auto_t += dt
		var off := curve.get_closest_offset(player.position)
		var tgt := _lane_pos(fposmod(off + 150.0, length), 1.0)
		v = (tgt - player.position).normalized()
	player.want_dir = v
	player.throttle = v.length()
	player.handbrake = btn_drift or Input.is_key_pressed(KEY_SPACE)
	var want_boost := btn_boost or Input.is_key_pressed(KEY_SHIFT) or (auto and int(auto_t) % 8 > 5)
	if want_boost and nitro > 0.02:
		player.boost = 1.0
		nitro = maxf(0.0, nitro - 0.4 * dt)
	else:
		player.boost = 0.0
		if player.linear_velocity.length() > 80.0:
			nitro = minf(1.0, nitro + 0.05 * dt)
	# traffic follows the road curve, brakes for anything in front
	for c in cars:
		var lane: float = c.get_meta("lane")
		var off := curve.get_closest_offset(c.position)
		var o2 := fposmod(off + 110.0 * lane, length)
		var p := curve.sample_baked(o2)
		var tg := (curve.sample_baked(fposmod(o2 + 6.0, length)) - p).normalized()
		var target := p + Vector2(-tg.y, tg.x) * LANE * lane
		c.want_dir = target - c.position
		var fwd := Vector2.RIGHT.rotated(c.heading)
		var ahead := false
		for o in cars + [player]:
			if o == c:
				continue
			var d: Vector2 = o.position - c.position
			if d.length() < 70.0 and d.dot(fwd) > 0.0 and absf(d.dot(fwd.orthogonal())) < 24.0:
				ahead = true
		c.throttle = 0.0 if ahead else 0.6
		c.brake = 3.0 if ahead else 0.0
