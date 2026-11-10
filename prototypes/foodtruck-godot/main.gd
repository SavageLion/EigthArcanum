extends Node2D
# Hot & Hangry: Godot build. A real city: a street network (city.gd) of avenues, streets and junctions with blocks of
# shops, parks, plazas and car parks between them, shops and trees from the Pixel Lab art, ambient traffic that finds its
# way through the junctions, a physics-driven food truck, and stops that are real buildings: park on the pavement in front
# of the door to drive in. Stage 1: shifts and the stop screens. Stage 2: heat, cops, rivals, swarm, loot (combat.gd).

enum Mode { DRIVE, ENTER, SCREEN, EXIT }

const SHOPS := ["shop_orange", "shop_green", "shop_blue", "shop_bakery", "shop_pizzeria", "shop_sushi", "shop_icecream", "shop_books", "shop_florist", "shop_arcade", "shop_barber"]
const TREES := ["tree", "tree", "tree_maple", "tree_cherry", "tree_pine"]
const BLD := {
	"shift": {"img": "bld_rush", "w": 123, "h": 113, "df": 0.53},
	"kitchen": {"img": "bld_kitchen", "w": 111, "h": 129, "df": 0.47},
	"mechanic": {"img": "bld_garage", "w": 121, "h": 128, "df": 0.5},
	"gas": {"img": "bld_gas", "w": 128, "h": 112, "df": 0.45},
	"cook": {"img": "bld_cook", "w": 121, "h": 128, "df": 0.51},
}
const STOP_TYPES := ["shift", "kitchen", "shift", "gas", "mechanic", "shift", "gas", "cook"]
const VENUES := ["beach", "office", "stadium", "festival", "night"]
const BS := 1.5

var city := City.new()
var world: Node2D
var ground_layer: Node2D
var ground_fx: Node2D
var player: Vehicle
var cam: Camera2D
var cars: Array[Vehicle] = []
var dust: CPUParticles2D
var shake := 0.0
var nitro := 0.6
var crashes := 0
var last_crash := 0
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
var auto_st: Dictionary = {}
var placed: Array[Vector2] = []
var mat_cache := {}

var mode := Mode.DRIVE
var lots: Array = []
var cur_lot: Dictionary = {}
var park_t := 0.0
var enter_t := 0.0
var exit_t := 0.0
var mats: Node2D
var iris: ColorRect
var iris_mat: ShaderMaterial
var enter_label: Label
var ui_layer: CanvasLayer
var fs_layer: CanvasLayer
var screens: Screens
var shift: Shift
var combat: Combat
var on_closed: Callable = Callable()
var hud_nodes := {}
var msg_label: Label
var msg_t := 0.0
var dbg_bot := false
var last_pos := Vector2.ZERO
var map_scale := 1.0
var map_origin := Vector2.ZERO
var dbg_zoom := 0.0
var perf_log := false

func tex(n: String) -> Texture2D:
	if not tex_cache.has(n):
		tex_cache[n] = load("res://art/%s.png" % n)
	return tex_cache[n]

func _arg(name: String) -> String:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--%s=" % name):
			return a.split("=")[1]
		if a == "--" + name:
			return "1"
	if OS.has_feature("web"):
		var q = JavaScriptBridge.eval("new URLSearchParams(location.search).get('%s')" % name)
		if q != null:
			return str(q)
	return ""

func _ready() -> void:
	rng.seed = int(_arg("seed")) if _arg("seed") != "" else 12345
	auto = _arg("auto") == "1"
	perf_log = _arg("perf") == "1"
	dbg_zoom = float(_arg("zoom")) if _arg("zoom") != "" else 0.0
	dbg_bot = _arg("bot") == "1"
	if _arg("speed") != "":
		Engine.time_scale = float(_arg("speed"))
	city.generate(rng)
	_assign_cells()
	_make_ground()
	_make_roads()
	mats = Node2D.new()
	mats.draw.connect(_draw_mats)
	add_child(mats)
	ground_fx = Node2D.new()
	add_child(ground_fx)
	world = Node2D.new()
	world.y_sort_enabled = true
	add_child(world)
	_make_walls()
	_make_stops()
	_make_blocks()
	_make_street_props()
	_make_traffic()
	_make_player()
	_make_ui()
	combat = Combat.new()
	add_child(combat)
	combat.setup(self)
	if _arg("nocombat") == "1":
		combat.set_physics_process(false)
	combat.busted.connect(func(): _game_over("The Food Police boxed you in. The truck is shut down."))
	combat.wrecked.connect(func(): _game_over("The truck was wrecked."))
	_compute_map()
	last_pos = player.position
	if _arg("heat") != "":
		Run.insp = float(_arg("heat"))
		combat.grace = 0.0
	var tp := _arg("tp")
	if tp != "":
		for lot in lots:
			if lot["type"] == tp:
				player.position = lot["zone"].get_center()
				player.heading = -PI / 2.0
				last_pos = player.position
				if _arg("view") == "1":
					lot["cool"] = 999.0
				break
	var dbg := _arg("stop")
	if dbg != "":
		call_deferred("_debug_open", dbg)

# ---------- ground, blocks and streets ----------
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

func _tile_mat(kind: String) -> ShaderMaterial:
	if mat_cache.has(kind):
		return mat_cache[kind]
	var names: Array = {"grass": ["gt_grass0", "gt_grass1"], "lawn": ["gt_grass1"], "pave": ["gt_pave0", "gt_pave1"], "road": ["gt_road0", "gt_road1"], "plaza": ["gt_plaza0", "gt_plaza1"]}[kind]
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/worldtile.gdshader")
	m.set_shader_parameter("tex", _pattern(names, {"grass": 3, "lawn": 4, "pave": 5, "road": 9, "plaza": 6}[kind]))
	m.set_shader_parameter("tex_size", Vector2(112, 112))
	mat_cache[kind] = m
	return m

func _assign_cells() -> void:
	var idxs: Array = []
	for i in city.cells.size():
		idxs.append(i)
	idxs.shuffle()
	var chosen: Array = []
	var gap := 1250.0
	while chosen.size() < STOP_TYPES.size() and gap > 300.0:
		chosen = []
		for i in idxs:
			var c: Vector2 = city.cells[i]["rect"].get_center()
			if chosen.all(func(j): return city.cells[j]["rect"].get_center().distance_to(c) >= gap):
				chosen.append(i)
				if chosen.size() >= STOP_TYPES.size():
					break
		gap -= 150.0
	for k in chosen.size():
		city.cells[chosen[k]]["type"] = "stop"
		city.cells[chosen[k]]["stop"] = STOP_TYPES[k]
	for c in city.cells:
		if c["type"] == "stop":
			continue
		var r := rng.randf()
		c["type"] = "park" if r < 0.2 else ("plaza" if r < 0.3 else ("lot" if r < 0.37 else "shops"))

func _make_ground() -> void:
	var g := ColorRect.new()
	var b := city.bounds.grow(1600.0)
	g.position = b.position
	g.size = b.size
	g.material = _tile_mat("grass")
	add_child(g)
	ground_layer = Node2D.new()
	add_child(ground_layer)

func _line(pts: PackedVector2Array, w: float, mat: Material, col: Color) -> Line2D:
	var l := Line2D.new()
	l.points = pts
	l.width = w
	l.joint_mode = Line2D.LINE_JOINT_ROUND
	l.begin_cap_mode = Line2D.LINE_CAP_ROUND
	l.end_cap_mode = Line2D.LINE_CAP_ROUND
	l.default_color = col
	l.antialiased = false
	if mat != null:
		l.material = mat
	ground_layer.add_child(l)
	return l

func _make_roads() -> void:
	# block ground first (pavement for shop blocks, plaza stone, car park asphalt, lawn for parks), then the streets on top
	for c in city.cells:
		var kind: String = {"shops": "pave", "stop": "pave", "plaza": "plaza", "lot": "road", "park": "lawn"}[c["type"]]
		var r: Rect2 = c["rect"].grow(28.0)
		var g := ColorRect.new()
		g.position = r.position
		g.size = r.size
		g.material = _tile_mat(kind)
		ground_layer.add_child(g)
	for e in city.edges:
		_line(e["pts"], e["w"] + City.PAVE_EXTRA, _tile_mat("pave"), Color.WHITE)
	for e in city.edges:
		_line(e["pts"], e["w"] + 8.0, null, Color("#8a8070"))
	for e in city.edges:
		_line(e["pts"], e["w"], _tile_mat("road"), Color.WHITE)
	var d := Node2D.new()
	d.set_script(load("res://dashes.gd"))
	d.city = city
	ground_layer.add_child(d)

func _make_walls() -> void:
	var b := city.bounds.grow(260.0)
	for r in [Rect2(b.position.x - 200, b.position.y, 200, b.size.y), Rect2(b.end.x, b.position.y, 200, b.size.y), Rect2(b.position.x, b.position.y - 200, b.size.x, 200), Rect2(b.position.x, b.end.y, b.size.x, 200)]:
		var sb := StaticBody2D.new()
		sb.collision_layer = 2
		sb.collision_mask = 0
		var cs := CollisionShape2D.new()
		var rs := RectangleShape2D.new()
		rs.size = r.size
		cs.shape = rs
		cs.position = r.get_center()
		sb.add_child(cs)
		add_child(sb)

# ---------- stops: real buildings with a door you drive into ----------
func _free_spot(p: Vector2, r: float) -> bool:
	for q in placed:
		if q.distance_to(p) < r:
			return false
	return true

func _make_stops() -> void:
	var venues := VENUES.duplicate()
	venues.shuffle()
	for c in city.cells:
		if c["type"] != "stop":
			continue
		var R: Rect2 = c["rect"]
		var D: Dictionary = BLD[c["stop"]]
		var dw: float = D["w"] * BS
		var cx := rng.randf_range(R.position.x + dw / 2.0 + 20.0, maxf(R.position.x + dw / 2.0 + 21.0, R.end.x - dw / 2.0 - 20.0))
		_add_stop(c["stop"], Vector2(cx, R.end.y), venues)

func _add_stop(ty: String, base: Vector2, venues: Array) -> void:
	var D: Dictionary = BLD[ty]
	var dw: float = D["w"] * BS
	var dh: float = D["h"] * BS
	var t := tex(D["img"])
	var n := Node2D.new()
	n.position = base + Vector2(0, 14)
	world.add_child(n)
	var s := Sprite2D.new()
	s.texture = t
	s.centered = false
	s.scale = Vector2(BS, BS)
	s.offset = Vector2(-t.get_width() / 2.0, -t.get_height())
	s.position = Vector2(0, -14)
	n.add_child(s)
	var sb := StaticBody2D.new()
	sb.collision_layer = 2
	sb.collision_mask = 0
	var cs := CollisionShape2D.new()
	var rs := RectangleShape2D.new()
	rs.size = Vector2(dw - 28.0, dh * 0.66 - 8.0)
	cs.shape = rs
	cs.position = Vector2(0, -14.0 - 8.0 - rs.size.y / 2.0)
	sb.add_child(cs)
	n.add_child(sb)
	var door_x: float = base.x + (D["df"] - 0.5) * dw
	var lot := {"type": ty, "name": Data.STOPN[ty].to_upper(), "venue": "gala" if ty == "cook" else (venues.pop_back() if ty == "shift" else ""), "used": false, "cool": 0.0, "bot": base.y,
		"door": Vector2(door_x, base.y - 22.0), "zone": Rect2(door_x - 62.0, base.y - 8.0, 124.0, 76.0), "node": n, "top": base.y - dh}
	lots.append(lot)
	for dx in [-120.0, 0.0, 120.0]:
		placed.append(base + Vector2(dx, 0))
		placed.append(base + Vector2(dx, -90))
	var lab := Label.new()
	lab.text = lot["name"]
	lab.position = Vector2(base.x - 70, base.y - dh - 22)
	lab.size = Vector2(140, 14)
	lab.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lab.add_theme_font_size_override("font_size", 10)
	lab.add_theme_color_override("font_color", Color(Data.STOPC[ty]))
	lab.add_theme_color_override("font_outline_color", Color.BLACK)
	lab.add_theme_constant_override("outline_size", 4)
	lab.z_index = 60
	add_child(lab)
	lot["label"] = lab

func _draw_mats() -> void:
	var t := Time.get_ticks_msec() / 1000.0
	for lot in lots:
		var z: Rect2 = lot["zone"]
		var col := Color(Data.STOPC[lot["type"]])
		var used: bool = lot["used"] and lot["type"] != "gas"
		var r := Rect2(z.position.x + 14, lot["bot"] + 3, z.size.x - 28, 34)
		mats.draw_rect(r, Color(0.25, 0.25, 0.3, 0.4) if used else Color(col.r, col.g, col.b, 0.3))
		mats.draw_rect(r, Color(0.5, 0.5, 0.55) if used else col, false, 2.0)
		if not used:
			for k in 3:
				var p := fposmod(t * 36.0 + k * 14.0, 42.0)
				var cx: float = lot["door"].x
				var y := r.end.y - p
				mats.draw_polyline(PackedVector2Array([Vector2(cx - 9, y + 6), Vector2(cx, y - 2), Vector2(cx + 9, y + 6)]), Color(1, 1, 1, 0.85), 2.4)

func in_zone(p: Vector2) -> Dictionary:
	for lot in lots:
		if lot["zone"].has_point(p):
			return lot
	return {}

func shake_cam(v: float) -> void:
	shake = minf(shake + v, 9.0)

func add_nitro(v: float) -> void:
	nitro = clampf(nitro + v, 0.0, 1.0)

# ---------- blocks ----------
func _solid(parent: Node, size: Vector2, at: Vector2) -> void:
	var sb := StaticBody2D.new()
	sb.collision_layer = 2
	sb.collision_mask = 0
	var cs := CollisionShape2D.new()
	var rs := RectangleShape2D.new()
	rs.size = size
	cs.shape = rs
	cs.position = at
	sb.add_child(cs)
	parent.add_child(sb)

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
		_solid(n, solid, Vector2(0, -solid.y / 2.0))

func _make_blocks() -> void:
	for c in city.cells:
		var R: Rect2 = c["rect"]
		match c["type"]:
			"shops", "stop":
				_shop_rows(R)
			"park":
				_park(R)
			"plaza":
				_plaza(R)
			"lot":
				_lot(R)

func _shop_rows(R: Rect2) -> void:
	var y := R.end.y
	var row := 0
	while y - 40.0 > R.position.y + 20.0 and row < 4:
		var x := R.position.x + 62.0 + rng.randf_range(0.0, 14.0)
		while x < R.end.x - 48.0:
			var base := Vector2(x, y)
			if _free_spot(base, 100.0):
				placed.append(base)
				if rng.randf() < 0.88:
					_add_item(SHOPS[rng.randi() % SHOPS.size()], base, Vector2(98, 56))
				else:
					_add_item(TREES[rng.randi() % TREES.size()], base, Vector2(12, 10))
			x += 122.0 + (rng.randf_range(6.0, 20.0) if rng.randf() < 0.15 else 0.0)
		y -= 108.0
		row += 1

func _blob(center: Vector2, rx: float, ry: float, col: Color, parent: Node) -> Polygon2D:
	var p := Polygon2D.new()
	var pts := PackedVector2Array()
	for i in 28:
		var a := TAU * i / 28.0
		pts.append(center + Vector2(cos(a) * rx, sin(a) * ry))
	p.polygon = pts
	p.color = col
	parent.add_child(p)
	return p

func _park(R: Rect2) -> void:
	# a winding path, a pond, benches and lots of trees
	var path := Line2D.new()
	path.width = 9.0
	path.default_color = Color("#c8b484")
	path.joint_mode = Line2D.LINE_JOINT_ROUND
	path.begin_cap_mode = Line2D.LINE_CAP_ROUND
	path.end_cap_mode = Line2D.LINE_CAP_ROUND
	var c0 := Curve2D.new()
	c0.add_point(Vector2(R.position.x, R.end.y - R.size.y * 0.28), Vector2.ZERO, Vector2(R.size.x * 0.25, -R.size.y * 0.4))
	c0.add_point(Vector2(R.end.x, R.position.y + R.size.y * 0.3), Vector2(-R.size.x * 0.25, R.size.y * 0.45), Vector2.ZERO)
	path.points = c0.tessellate(5, 2.0)
	ground_layer.add_child(path)
	var pond := Vector2(-9999, -9999)
	if rng.randf() < 0.65 and R.size.x > 260.0 and R.size.y > 200.0:
		var rx := rng.randf_range(48.0, 80.0)
		var ry := rng.randf_range(32.0, 50.0)
		pond = Vector2(rng.randf_range(R.position.x + rx + 24.0, R.end.x - rx - 24.0), rng.randf_range(R.position.y + ry + 24.0, R.end.y - ry - 24.0))
		_blob(pond, rx + 7.0, ry + 6.0, Color("#b8a878"), ground_layer)
		_blob(pond, rx, ry, Color("#3a78a8"), ground_layer)
		_blob(pond + Vector2(-3, -2), rx * 0.8, ry * 0.7, Color("#4a92c0"), ground_layer)
		var holder := Node2D.new()
		holder.position = pond
		world.add_child(holder)
		_solid(holder, Vector2(rx * 1.6, ry * 1.3), Vector2.ZERO)
		placed.append(pond)
	var n := int(R.get_area() / 11000.0)
	for i in n:
		var pos := Vector2(rng.randf_range(R.position.x + 20.0, R.end.x - 20.0), rng.randf_range(R.position.y + 30.0, R.end.y - 4.0))
		if _free_spot(pos, 62.0) and (pond.x < -9000.0 or pos.distance_to(pond) > 100.0):
			placed.append(pos)
			_add_item(TREES[rng.randi() % TREES.size()], pos, Vector2(12, 10))
	for i in 3:
		var pos := Vector2(rng.randf_range(R.position.x + 30.0, R.end.x - 30.0), rng.randf_range(R.position.y + 40.0, R.end.y - 10.0))
		if _free_spot(pos, 50.0):
			placed.append(pos)
			_add_item(["prop_bench", "prop_lamp", "bush_planter"][i % 3], pos, Vector2.ZERO)

func _plaza(R: Rect2) -> void:
	var c := R.get_center()
	_blob(c + Vector2(0, 4), 36.0, 26.0, Color("#8c8272"), ground_layer)
	_blob(c + Vector2(0, 2), 31.0, 21.0, Color("#a89c88"), ground_layer)
	_blob(c + Vector2(0, 2), 26.0, 17.0, Color("#4aa8d8"), ground_layer)
	_blob(c + Vector2(0, 1), 18.0, 11.0, Color("#7ac8f0"), ground_layer)
	var holder := Node2D.new()
	holder.position = c
	world.add_child(holder)
	_solid(holder, Vector2(62, 34), Vector2(0, 4))
	var sp := CPUParticles2D.new()
	sp.position = c + Vector2(0, -2)
	sp.amount = 22
	sp.lifetime = 0.9
	sp.direction = Vector2(0, -1)
	sp.spread = 28.0
	sp.initial_velocity_min = 40.0
	sp.initial_velocity_max = 60.0
	sp.gravity = Vector2(0, 120)
	sp.scale_amount_min = 1.5
	sp.scale_amount_max = 2.5
	sp.color = Color(0.8, 0.93, 1.0, 0.85)
	ground_layer.add_child(sp)
	placed.append(c)
	for k in 2:
		var pos := Vector2(R.position.x + 60.0 + (R.size.x - 120.0) * k, R.position.y + R.size.y * 0.35)
		if _free_spot(pos, 60.0):
			placed.append(pos)
			_add_item("terrace", pos, Vector2(60, 40))
	for pos in [R.position + Vector2(36, 60), Vector2(R.end.x - 36, R.position.y + 60), Vector2(R.position.x + 36, R.end.y - 8), Vector2(R.end.x - 36, R.end.y - 8)]:
		if _free_spot(pos, 50.0):
			placed.append(pos)
			_add_item(TREES[rng.randi() % TREES.size()], pos, Vector2(12, 10))

func _lot(R: Rect2) -> void:
	var kinds := ["sedan", "hatch", "taxi", "pickup"]
	var rows := int(R.size.y / 70.0)
	for j in rows:
		var y := R.position.y + 40.0 + j * 70.0
		if y > R.end.y - 20.0:
			break
		var x := R.position.x + 40.0
		while x < R.end.x - 30.0:
			if rng.randf() < 0.55 and _free_spot(Vector2(x, y), 40.0):
				var n := Node2D.new()
				n.position = Vector2(x, y)
				var s := Sprite2D.new()
				s.texture = tex("%s_%s" % [kinds[rng.randi() % 4], "south" if rng.randf() < 0.5 else "north"])
				s.offset = Vector2(0, -10)
				n.add_child(s)
				world.add_child(n)
				_solid(n, Vector2(24, 36), Vector2.ZERO)
				placed.append(Vector2(x, y))
			x += 42.0

func _make_street_props() -> void:
	for ei in city.edges.size():
		var e: Dictionary = city.edges[ei]
		var off := 120.0
		while off < e["len"] - 120.0:
			var side := 1.0 if int(off / 170.0) % 2 == 0 else -1.0
			var pos: Vector2 = city.point(ei, off) + city.normal(ei, off) * side * (e["w"] / 2.0 + 20.0)
			var kind: String = ["prop_lamp", "prop_bench", "prop_bin", "prop_hydrant", "prop_lamp"][rng.randi() % 5]
			if in_zone(pos).is_empty():
				_add_item(kind, pos, Vector2.ZERO)
			off += 150.0

# ---------- vehicles ----------
func _follow(pos: Vector2, st: Dictionary, look: float) -> Vector2:
	var e: Dictionary = city.edges[st["e"]]
	var off: float = e["curve"].get_closest_offset(pos)
	var dir: int = st["dir"]
	var ahead: float = off + look * dir
	if ahead > e["len"] or ahead < 0.0:
		if st["next"] == null:
			st["next"] = city.pick_next(st["e"], dir, rng)
		var nx: Dictionary = st["next"]
		var over: float = (ahead - e["len"]) if dir > 0 else (-ahead)
		var ne: Dictionary = city.edges[nx["e"]]
		var noff: float = over if nx["dir"] > 0 else ne["len"] - over
		if (dir > 0 and off > e["len"] - 40.0) or (dir < 0 and off < 40.0):
			st["e"] = nx["e"]
			st["dir"] = nx["dir"]
			st["next"] = null
		return city.lane_pos(nx["e"], clampf(noff, 0.0, ne["len"]), nx["dir"])
	st["next"] = null
	return city.lane_pos(st["e"], ahead, dir)

func _make_traffic() -> void:
	var kinds := ["sedan", "hatch", "taxi", "pickup"]
	for i in (int(_arg("ncars")) if _arg("ncars") != "" else 34):
		var c := Vehicle.new()
		c.setup(kinds[i % 4], 13.0, 1.4, 12.0)
		c.max_speed = rng.randf_range(62.0, 96.0)
		c.accel = 220.0
		var s := city.random_lane_spot(rng)
		c.set_meta("st", {"e": s["e"], "dir": s["dir"], "next": null})
		c.position = s["pos"]
		c.heading = city.tangent(s["e"], s["off"]).angle() + (0.0 if s["dir"] > 0 else PI)
		world.add_child(c)
		cars.append(c)

func _make_player() -> void:
	player = Vehicle.new()
	player.is_player = true
	player.setup("truck", 17.0, 3.4, 14.0)
	player.max_speed = 175.0 * Run.perks["speed"]
	player.accel = 330.0
	player.turn_rate = 3.0
	var mid := city.bounds.get_center()
	var ei := city.nearest_edge(mid)
	var off: float = city.edges[ei]["len"] * 0.5
	player.position = city.lane_pos(ei, off, 1)
	player.heading = city.tangent(ei, off).angle()
	auto_st = {"e": ei, "dir": 1, "next": null}
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

func _on_crash(speed: float, at: Vector2, other: Node) -> void:
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
	if mode == Mode.DRIVE and player.lift <= 2.0:
		Run.hp -= clampf(speed / 60.0, 0.5, 3.0) * Run.perks["armor"]
		if other is Vehicle and cars.has(other):
			Run.insp = clampf(Run.insp + 2.0, 0.0, 100.0)

# ---------- hud, screens, iris ----------
func _make_ui() -> void:
	var layer := CanvasLayer.new()
	layer.layer = 1
	add_child(layer)
	hud = Control.new()
	hud.set_anchors_preset(Control.PRESET_FULL_RECT)
	hud.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud.draw.connect(_hud_draw)
	layer.add_child(hud)
	UI.panel(layer, Rect2(8, 6, 156, 60), "#7ae07a")
	UI.icon(layer, "i_fuel", Vector2(20, 15), 14)
	UI.icon(layer, "i_heart", Vector2(20, 28), 14)
	UI.icon(layer, "i_coin", Vector2(17, 43), 12)
	UI.icon(layer, "i_siren", Vector2(113, 43), 13)
	hud_nodes["fuel_bg"] = _bar(layer, Vector2(32, 12), Color("#1a2a1a"))
	hud_nodes["fuel"] = _bar(layer, Vector2(32, 12), Color("#7ae07a"))
	hud_nodes["hp_bg"] = _bar(layer, Vector2(32, 25), Color("#2a1018"))
	hud_nodes["hp"] = _bar(layer, Vector2(32, 25), Color("#6ad86a"))
	hud_nodes["fuel_l"] = UI.label(layer, Vector2(34, 10), "PETROL", 5, "#ffffff")
	hud_nodes["hp_l"] = UI.label(layer, Vector2(34, 23), "TRUCK", 5, "#ffffff")
	hud_nodes["cash"] = UI.label(layer, Vector2(25, 38), "$30", 7, "#ffe9a8")
	hud_nodes["stars"] = UI.stars(layer, Vector2(52, 37), 3, 10)
	hud_nodes["warn"] = UI.stars(layer, Vector2(124, 38), 0, 7, Color(1.0, 0.45, 0.4), 0.3)
	hud_nodes["lv"] = UI.label(layer, Vector2(14, 52), "", 6, "#d8c8b0")
	hud_label = Label.new()
	hud_label.position = Vector2(172, 4)
	hud_label.add_theme_font_size_override("font_size", 8)
	hud_label.add_theme_color_override("font_outline_color", Color.BLACK)
	hud_label.add_theme_constant_override("outline_size", 3)
	layer.add_child(hud_label)
	msg_label = Label.new()
	msg_label.position = Vector2(0, 92)
	msg_label.size = Vector2(480, 20)
	msg_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	msg_label.add_theme_font_size_override("font_size", 10)
	msg_label.add_theme_color_override("font_outline_color", Color.BLACK)
	msg_label.add_theme_constant_override("outline_size", 4)
	layer.add_child(msg_label)
	var il := CanvasLayer.new()
	il.layer = 5
	add_child(il)
	iris = ColorRect.new()
	iris.set_anchors_preset(Control.PRESET_FULL_RECT)
	iris.mouse_filter = Control.MOUSE_FILTER_IGNORE
	iris_mat = ShaderMaterial.new()
	iris_mat.shader = load("res://shaders/iris.gdshader")
	iris_mat.set_shader_parameter("radius", 999.0)
	iris.material = iris_mat
	il.add_child(iris)
	enter_label = Label.new()
	enter_label.position = Vector2(0, 100)
	enter_label.size = Vector2(480, 40)
	enter_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	enter_label.add_theme_font_size_override("font_size", 16)
	enter_label.add_theme_color_override("font_outline_color", Color.BLACK)
	enter_label.add_theme_constant_override("outline_size", 5)
	enter_label.visible = false
	il.add_child(enter_label)
	ui_layer = CanvasLayer.new()
	ui_layer.layer = 10
	add_child(ui_layer)
	fs_layer = CanvasLayer.new()
	fs_layer.layer = 20
	add_child(fs_layer)
	UI.button(fs_layer, Rect2(440, 4, 36, 18), "FULL", _toggle_fullscreen, false, 7)
	shift = Shift.new()
	shift.visible = false
	shift.set_process(false)
	shift.bot = dbg_bot
	shift.finished.connect(_on_shift_finished)
	shift.levelup.connect(_on_shift_levelup)
	ui_layer.add_child(shift)
	screens = Screens.new()
	screens.visible = false
	screens.closed.connect(_on_screen_closed)
	ui_layer.add_child(screens)

func _toggle_fullscreen() -> void:
	if OS.has_feature("web"):
		JavaScriptBridge.eval("(function(){var d=document;if(!d.fullscreenElement){var p=d.documentElement.requestFullscreen();if(p&&p.then){p.then(function(){try{screen.orientation.lock('landscape');}catch(e){}}).catch(function(){});}}else{d.exitFullscreen();}})()")
	else:
		var md := DisplayServer.window_get_mode()
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED if md == DisplayServer.WINDOW_MODE_FULLSCREEN else DisplayServer.WINDOW_MODE_FULLSCREEN)

var map_edges: Array = []

func _compute_map() -> void:
	var sz := city.bounds.size
	map_scale = minf(136.0 / sz.x, 78.0 / sz.y)
	map_origin = city.bounds.position - Vector2((136.0 / map_scale - sz.x) / 2.0, (78.0 / map_scale - sz.y) / 2.0)
	map_edges = []
	for e in city.edges:
		var mp := PackedVector2Array()
		for q in e["pts"]:
			mp.append(_mp(q))
		map_edges.append({"pts": mp, "w": 2.0 if e["w"] < 100.0 else 3.0})

func _mp(p: Vector2) -> Vector2:
	return Vector2(287.0, 15.0) + (p - map_origin) * map_scale

func _bar(parent: Node, pos: Vector2, col: Color) -> ColorRect:
	var r := ColorRect.new()
	r.position = pos
	r.size = Vector2(124, 6)
	r.color = col
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(r)
	return r

func _hud_draw() -> void:
	if mode != Mode.DRIVE:
		return
	if joy_on:
		hud.draw_circle(joy_origin, 26.0, Color(1, 1, 1, 0.18))
		hud.draw_circle(joy_origin + joy_vec * 26.0, 11.0, Color(1, 1, 1, 0.5))
	var b := Rect2(Vector2(480 - 58, 270 - 58), Vector2(50, 50))
	hud.draw_style_box(UI.box("panel", 12), b)
	hud.draw_rect(Rect2(b.position + Vector2(5, 5 + 40.0 * (1.0 - nitro)), Vector2(40, 40.0 * nitro)), Color(0.29, 0.85, 1.0, 0.55) if btn_boost else Color(1.0, 0.82, 0.29, 0.4))
	hud.draw_texture_rect(UI.tex("i_nitro"), Rect2(b.position + Vector2(10, 4), Vector2(30, 30)), false)
	hud.draw_string(ThemeDB.fallback_font, b.position + Vector2(8, 44), "NITRO", HORIZONTAL_ALIGNMENT_LEFT, -1, 8, Color.WHITE)
	var d := Rect2(Vector2(480 - 116, 270 - 58), Vector2(50, 50))
	hud.draw_style_box(UI.box("panel", 12), d)
	hud.draw_string(ThemeDB.fallback_font, d.position + Vector2(8, 30), "DRIFT", HORIZONTAL_ALIGNMENT_LEFT, -1, 9, Color("#ffe9a8") if btn_drift else Color.WHITE)
	# minimap: the ring, stops, rivals, cops and you
	hud.draw_rect(Rect2(280, 8, 150, 90), Color(0.06, 0.04, 0.08, 0.88))
	hud.draw_rect(Rect2(280, 8, 150, 90), Color("#ffb84a"), false, 1.5)
	for me in map_edges:
		hud.draw_polyline(me["pts"], Color("#7a857c"), me["w"])
	var LET := {"shift": "$", "kitchen": "K", "mechanic": "M", "gas": "G", "cook": "*"}
	for lot in lots:
		var lp := _mp(lot["door"])
		var used: bool = lot["used"] and lot["type"] != "gas"
		var lc := Color("#666666") if used else Color(Data.STOPC[lot["type"]])
		hud.draw_circle(lp, 6.0, Color("#161018"))
		hud.draw_circle(lp, 5.0, lc)
		hud.draw_string(ThemeDB.fallback_font, lp + Vector2(-3, 3), LET[lot["type"]], HORIZONTAL_ALIGNMENT_LEFT, -1, 7, Color("#161018"))
	for c in combat.cops:
		hud.draw_circle(_mp(c.position), 2.0, Color("#ff4a3a") if int(Time.get_ticks_msec() / 200) % 2 == 0 else Color("#4a6aff"))
	for r in combat.rivals:
		var rp := _mp(r.position)
		hud.draw_circle(rp, 5.0, Color(r.info["def"]["col"]))
		hud.draw_string(ThemeDB.fallback_font, rp + Vector2(-2.5, 3), "R", HORIZONTAL_ALIGNMENT_LEFT, -1, 7, Color("#161018"))
	var pp := _mp(player.position)
	hud.draw_arc(pp, 5.0 + 1.5 * sin(Time.get_ticks_msec() / 160.0), 0.0, TAU, 14, Color(1, 1, 1, 0.6), 1.2)
	hud.draw_circle(pp, 3.0, Color.WHITE)
	if combat.streak >= 2:
		var mu := combat.mult()
		hud.draw_string(ThemeDB.fallback_font, Vector2(172, 22), "TIP STREAK  x%.2f  (%d)" % [mu, combat.streak], HORIZONTAL_ALIGNMENT_LEFT, -1, 8, Color("#ffd24a") if mu >= 2.0 else Color("#ffe9a8"))
		hud.draw_rect(Rect2(172, 25, 96, 4), Color("#2a1a0a"))
		hud.draw_rect(Rect2(172, 25, 96.0 * clampf(combat.streak_t / 4.5, 0.0, 1.0), 4), Color("#ffb84a"))
	if combat.bust > 0.0:
		hud.draw_rect(Rect2(200, 250, 80, 6), Color("#2a1010"))
		hud.draw_rect(Rect2(200, 250, 80.0 * clampf(combat.bust / 3.2, 0.0, 1.0), 6), Color("#ff4a3a"))
		hud.draw_string(ThemeDB.fallback_font, Vector2(200, 247), "BUSTED!", HORIZONTAL_ALIGNMENT_CENTER, 80, 8, Color("#ffb0a0"))
	if park_t > 0.0:
		hud.draw_rect(Rect2(210, 236, 60, 6), Color(0, 0, 0, 0.5))
		hud.draw_rect(Rect2(210, 236, 60.0 * park_t / 0.7, 6), Color("#ffd24a"))
		hud.draw_string(ThemeDB.fallback_font, Vector2(240 - 30, 232), "PARKING...", HORIZONTAL_ALIGNMENT_CENTER, 60, 8, Color.WHITE)

func _update_hud() -> void:
	var fb: ColorRect = hud_nodes["fuel"]
	fb.size.x = 124.0 * clampf(Run.fuel / Run.fuel_max, 0.0, 1.0)
	fb.color = Color("#ff5a4a") if Run.fuel / Run.fuel_max < 0.25 else Color("#7ae07a")
	var hb: ColorRect = hud_nodes["hp"]
	hb.size.x = 124.0 * clampf(Run.hp / Run.hp_max, 0.0, 1.0)
	hb.color = Color("#6ad86a") if Run.hp / Run.hp_max > 0.4 else Color("#ff6a5a")
	hud_nodes["fuel_l"].text = "PETROL %d" % ceili(Run.fuel)
	hud_nodes["hp_l"].text = "TRUCK %d" % ceili(Run.hp)
	hud_nodes["cash"].text = "$%d" % int(Run.cash)
	UI.set_stars(hud_nodes["stars"], roundi(Run.avg_stars()), Color.WHITE, 0.22)
	UI.set_stars(hud_nodes["warn"], Run.heat_level(), Color(1.0, 0.45, 0.4), 0.3)
	hud_nodes["lv"].text = "Lunch rushes %d/3   Lv %d" % [Run.leg_shifts, Run.lv]

func show_msg(s: String, t: float = 2.0) -> void:
	msg_label.text = s
	msg_t = t

# ---------- input ----------
func _input(e: InputEvent) -> void:
	if mode != Mode.DRIVE:
		return
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
	_update_hud()
	if msg_t > 0.0:
		msg_t -= dt
		msg_label.modulate.a = clampf(msg_t, 0.0, 1.0)
	else:
		msg_label.text = ""
	var sp := player.linear_velocity.length()
	var zt := lerpf(0.9, 0.68, clampf(sp / 230.0, 0.0, 1.0))
	if mode == Mode.ENTER:
		zt = 1.5
	cam.zoom = cam.zoom.lerp(Vector2.ONE * zt, (5.0 if mode == Mode.ENTER else 2.0) * dt)
	if dbg_zoom > 0.0:
		cam.zoom = Vector2.ONE * dbg_zoom
	shake = maxf(0.0, shake - 22.0 * dt)
	cam.offset = Vector2(rng.randf_range(-1, 1), rng.randf_range(-1, 1)) * shake
	var fwd := Vector2.RIGHT.rotated(player.heading)
	dust.position = player.position - fwd * 20.0 + Vector2(0, 8)
	dust.emitting = sp > 60.0 and mode == Mode.DRIVE
	dust.color = Color(1.0, 0.7, 0.3, 0.8) if player.boost > 0.0 else Color(0.9, 0.85, 0.7, 0.6)
	hud_label.text = "%d fps" % Engine.get_frames_per_second()
	if perf_log and Engine.get_frames_drawn() % 300 == 0:
		print("PERF process=%.1fms physics=%.1fms nodes=%d objs=%d phys2d_active=%d" % [Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0, Performance.get_monitor(Performance.TIME_PHYSICS_PROCESS) * 1000.0, Performance.get_monitor(Performance.OBJECT_NODE_COUNT), Performance.get_monitor(Performance.OBJECT_COUNT), Performance.get_monitor(Performance.PHYSICS_2D_ACTIVE_OBJECTS)])
	for lot in lots:
		lot["cool"] = maxf(0.0, lot["cool"] - dt)
	_update_iris(dt)

func _screen_pos(p: Vector2) -> Vector2:
	return (p - cam.get_screen_center_position()) * cam.zoom + Vector2(240, 135)

func _update_iris(dt: float) -> void:
	var rad := 999.0
	if mode == Mode.ENTER:
		rad = 400.0 if enter_t < 0.3 else maxf(0.0, 400.0 * (1.0 - (enter_t - 0.3) / 0.65))
		enter_label.visible = true
		enter_label.modulate.a = clampf(enter_t * 4.0, 0.0, 1.0)
	elif mode == Mode.EXIT:
		exit_t += dt
		rad = 400.0 * clampf(exit_t / 0.6, 0.0, 1.0)
		enter_label.visible = false
		if exit_t >= 0.6:
			mode = Mode.DRIVE
	elif mode == Mode.SCREEN:
		rad = 0.0
		enter_label.visible = false
	else:
		enter_label.visible = false
	iris_mat.set_shader_parameter("radius", rad)
	iris_mat.set_shader_parameter("center", _screen_pos(player.position))

func _physics_process(dt: float) -> void:
	if mode == Mode.ENTER:
		enter_t += dt
		var tgt: Vector2 = cur_lot["door"]
		player.position = player.position.lerp(tgt, minf(1.0, dt * 3.2))
		if player.position.distance_to(tgt) > 8.0:
			player.heading = (tgt - player.position).angle()
		if enter_t >= 0.95:
			_open_stop()
		return
	if mode != Mode.DRIVE:
		return
	if Run.xp >= Run.need_xp():
		Run.xp -= Run.need_xp()
		Run.lv += 1
		mode = Mode.SCREEN
		world.process_mode = Node.PROCESS_MODE_DISABLED
		on_closed = _resume_drive
		screens.show_levelup()
		return
	var moved := player.position.distance_to(last_pos)
	last_pos = player.position
	Run.fuel = maxf(0.0, Run.fuel - moved * 0.0078 * Run.fuel_use)
	player.max_speed = 175.0 * Run.perks["speed"] * (0.35 if Run.fuel <= 0.0 else 1.0)
	if Run.fuel <= 0.0 and msg_t <= 0.0:
		show_msg("OUT OF PETROL! Roll to a gas station.", 2.5)
	var lot := in_zone(player.position)
	if not lot.is_empty() and player.linear_velocity.length() < 40.0 and not (lot["used"] and lot["type"] != "gas") and lot["cool"] <= 0.0 and not auto:
		if lot["type"] == "cook" and Run.leg_shifts < 3:
			if msg_t <= 0.0:
				show_msg("The cook-off needs %d more lunch rush%s first." % [3 - Run.leg_shifts, "" if 3 - Run.leg_shifts == 1 else "es"], 2.0)
			park_t = 0.0
		else:
			park_t += dt
			if park_t >= 0.7:
				park_t = 0.0
				_begin_entry(lot)
				return
	else:
		park_t = maxf(0.0, park_t - dt * 2.0)
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
		var tgt := _follow(player.position, auto_st, 150.0)
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
	for c in cars:
		var target := _follow(c.position, c.get_meta("st"), 110.0)
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

# ---------- entering a stop, the screens inside, and coming back out ----------
func _begin_entry(lot: Dictionary) -> void:
	mode = Mode.ENTER
	cur_lot = lot
	enter_t = 0.0
	player.linear_velocity = Vector2.ZERO
	player.freeze_mode = RigidBody2D.FREEZE_MODE_KINEMATIC
	player.freeze = true
	player.throttle = 0.0
	enter_label.text = "ENTERING\n" + lot["name"]
	joy_on = false
	joy_vec = Vector2.ZERO
	btn_boost = false
	btn_drift = false

func _resume_drive() -> void:
	world.process_mode = Node.PROCESS_MODE_INHERIT
	mode = Mode.DRIVE
	last_pos = player.position

func _open_stop() -> void:
	combat.clear_enemies()
	print("ENTERED ", cur_lot["type"])
	mode = Mode.SCREEN
	var lot := cur_lot
	Run.stops += 1
	Run.fuel = maxf(0.0, Run.fuel - 2.0)
	Run.insp = maxf(0.0, Run.insp - 10.0)
	lot["used"] = lot["type"] != "gas"
	lot["cool"] = 8.0
	world.process_mode = Node.PROCESS_MODE_DISABLED
	on_closed = _exit_stop
	match lot["type"]:
		"shift", "cook":
			var is_gala: bool = lot["type"] == "cook"
			shift.visible = true
			shift.set_process(true)
			shift.start("gala" if is_gala else lot["venue"], {"n": "The Local Blogger", "hp": 170.0, "spr": "pr15"}, is_gala)
		"kitchen": screens.show_kitchen()
		"mechanic": screens.show_mechanic()
		"gas": screens.show_gas()

func _on_shift_levelup() -> void:
	on_closed = func():
		shift.hold = false
		on_closed = _exit_stop
	screens.show_levelup()
	if dbg_bot:
		screens.auto_pick()

func _on_shift_finished(kind: String) -> void:
	print("SHIFT FINISHED: ", kind, " fed=", shift.fed_this, " tips=", snappedf(shift.tips_this, 0.1), " hp=", snappedf(Run.hp, 0.1), " lv=", Run.lv, " stops=", Run.stops)
	shift.visible = false
	if kind == "lose":
		_game_over()
		return
	var remaining: int = shift.E.filter(func(e): return e["state"] != "fed" and not e["dead"]).size()
	Run.shift_n += 1
	Run.leg_shifts += 1
	Run.review = Run.make_review(shift.fed_this, remaining, shift.fires_this)
	Run.rating.append(Run.review["stars"])
	Run.insp = clampf(Run.insp + 6.0 + (10.0 if Run.review["stars"] <= 2 else (-14.0 if Run.review["stars"] == 5 else 0.0)), 0.0, 100.0)
	on_closed = _exit_stop
	screens.show_results({"fed": shift.fed_this, "tips": shift.tips_this, "legdone": kind == "boss"})
	if dbg_bot:
		screens.hide_screen()

func _game_over(why: String = "The hungry crowd stormed the truck.") -> void:
	if mode == Mode.SCREEN and screens.visible:
		return
	mode = Mode.SCREEN
	world.process_mode = Node.PROCESS_MODE_DISABLED
	screens.reset("#2a0f12")
	UI.label(screens, Vector2(0, 60), "SHUT DOWN", 26, "#ff6a5a", 1, 480)
	UI.label(screens, Vector2(0, 100), why, 9, "#e8d8c0", 1, 480)
	UI.label(screens, Vector2(0, 120), "Customers fed %d     Shifts %d     Level %d" % [Run.fed, Run.shift_n, Run.lv], 9, "#ffffff", 1, 480)
	UI.button(screens, Rect2(170, 170, 140, 32), "TRY AGAIN", func():
		Run.new_run(0)
		get_tree().reload_current_scene(), true, 10)
	on_closed = Callable()

func _on_screen_closed() -> void:
	if on_closed.is_valid():
		on_closed.call()

func _exit_stop() -> void:
	print("BACK ON THE ROAD: cash=", int(Run.cash), " fuel=", int(Run.fuel), " hp=", int(Run.hp), " dishes=", Run.dishes.size(), " stops=", Run.stops)
	shift.visible = false
	shift.set_process(false)
	world.process_mode = Node.PROCESS_MODE_INHERIT
	var lot := cur_lot
	player.position = Vector2(lot["door"].x, lot["bot"] + 34.0)
	player.freeze = false
	player.linear_velocity = Vector2.ZERO
	player.heading = PI / 2.0
	last_pos = player.position
	exit_t = 0.0
	mode = Mode.EXIT
	combat.resume()
	show_msg("Back on the road", 1.4)

# ---------- debugging hooks: ?stop=shift / gas / mechanic / kitchen / results / levelup (also --stop=...) ----------
func _debug_open(what: String) -> void:
	mode = Mode.SCREEN
	world.process_mode = Node.PROCESS_MODE_DISABLED
	on_closed = Callable()
	cur_lot = lots[0] if not lots.is_empty() else {"door": Vector2.ZERO, "bot": 0.0}
	match what:
		"shift", "beach", "office", "stadium", "festival", "night", "gala":
			Run.dishes[0]["lv"] = 2
			Run.add_dish("taco")
			shift.visible = true
			shift.set_process(true)
			shift.start("beach" if what == "shift" else what, {"n": "The Local Blogger", "hp": 170.0, "spr": "pr15"}, what == "gala")
		"gas": screens.show_gas()
		"mechanic":
			Run.cash = 120.0
			screens.show_mechanic()
		"kitchen":
			Run.cash = 80.0
			Run.add_dish("taco")
			Run.add_dish("pizza")
			screens.show_kitchen()
		"levelup": screens.show_levelup()
		"results":
			Run.shift_n = 1
			Run.review = Run.make_review(40, 4, 0)
			Run.cash = 90.0
			screens.show_results({"fed": 40, "tips": 55.0, "legdone": false})
