extends Node2D
# Sheepdog, Godot day-mode slice: find the flock in a wide meadow, herd it into the pen, ward off foxes, meet the quota.

const WX: float = 3264.0
var WY: float = 2208.0
const XMIN: float = 100.0
const XMAX: float = 3164.0
const YMIN: float = 108.0
const YMAX: float = 2112.0
const BTN_R: float = 52.0
const TYPES: Dictionary = {
	"normal": {"r": 7.0, "zone": 120.0, "flee": 1.0, "speed": 1.0, "hp": 2, "tint": Color(1, 1, 1)},
	"lamb": {"r": 4.5, "zone": 105.0, "flee": 1.0, "speed": 1.1, "hp": 1, "tint": Color(1, 1, 1)},
	"ram": {"r": 9.0, "zone": 62.0, "flee": 0.55, "speed": 0.8, "hp": 4, "tint": Color(0.8, 0.68, 0.55), "heavy": true, "bark_mul": 0.4},
	"goat": {"r": 7.0, "zone": 90.0, "flee": 0.45, "speed": 0.9, "hp": 3, "tint": Color(0.88, 0.7, 0.45)},
	"black": {"r": 7.0, "zone": 120.0, "flee": 1.0, "speed": 1.0, "hp": 2, "tint": Color(0.3, 0.28, 0.32), "coh": 0.35},
	"goose": {"r": 6.0, "zone": 150.0, "flee": 1.3, "speed": 1.35, "hp": 1, "tint": Color(1.1, 1.12, 1.2), "coh": 0.5, "bark_mul": 1.6},
	"duck": {"r": 5.0, "zone": 125.0, "flee": 1.0, "speed": 1.1, "hp": 1, "tint": Color(1.15, 1.1, 0.62), "lure": "water", "swim": 1.4},
	"pig": {"r": 8.0, "zone": 80.0, "flee": 0.6, "speed": 0.7, "hp": 3, "tint": Color(1.2, 0.78, 0.86), "heavy": true, "bark_mul": 0.5, "lure": "mud", "mud": 1.0},
}
const PERKS: Array = [
	{"id": "gust", "name": "Guiding Gust", "desc": "Every few seconds a gust pushes loose sheep around you toward the pen.", "max": 5},
	{"id": "pups", "name": "Spectral Pups", "desc": "Ghost pups run behind stray sheep and drive them to the pen.", "max": 5},
	{"id": "whistle", "name": "Rally Whistle", "desc": "A whistle sends the sheep around you trotting toward the pen.", "max": 5},
	{"id": "sniff", "name": "Keen Nose", "desc": "Finds hidden sheep and marks every sheep you have not seen.", "max": 5},
	{"id": "shadow", "name": "Long Shadow", "desc": "Your push reaches further, so you can herd from a distance.", "max": 5},
	{"id": "steady", "name": "Steady Flock", "desc": "Sheep calm down faster and stick together more.", "max": 5},
	{"id": "fleet", "name": "Fleet Paws", "desc": "Run faster and tire more slowly.", "max": 5},
	{"id": "echo", "name": "Echo Bark", "desc": "Your bark echoes after itself and reaches further.", "max": 4},
	{"id": "ward", "name": "Fox Ward", "desc": "Foxes near you are frightened off and drop what they carry.", "max": 5},
	{"id": "magnet", "name": "Gate Magnet", "desc": "Sheep near the pen gate are drawn gently inside.", "max": 5},
	{"id": "fleece", "name": "Lucky Fleece", "desc": "Every sheep that enters the pen is worth more XP.", "max": 4},
	{"id": "valley", "name": "Echo Valley", "desc": "Your bark, gust and whistle also reach sheep on other levels.", "max": 3},
	{"id": "rope", "name": "Rope Line", "desc": "Sheep hurry along ramps when you send them home.", "max": 5},
	{"id": "gold", "name": "Golden Fleece", "desc": "Sheep in the pen also give gold for the traders.", "max": 5},
	{"id": "lookout", "name": "Lookout", "desc": "From time to time every hidden sheep on the mountain is revealed.", "max": 4},
	{"id": "stride", "name": "Mountain Stride", "desc": "You climb and descend ramps faster.", "max": 5},
]
const XP_OF: Dictionary = {"normal": 10, "goat": 14, "goose": 12, "ram": 18, "black": 14}
static var run_day: int = 1
static var run_perks: Dictionary = {}
static var run_level: int = 1
static var run_xp: float = 0.0
static var run_best: int = 0
var perk_offers: Array = []
var pending_lv: int = 0
var gust_t: float = 3.0
var whistle_t: float = 4.0
var sniff_t: float = 2.0
var lookout_t: float = 4.0
var ward_t: float = 3.0
var echo_q: Array = []
var pups: Array = []
var ov_zoom: bool = false
var guide_mode: bool = false
var fit_mode: bool = false
var base_zoom: float = 1.6
var painted_mode: bool = false
var lm = null
var ysorts: Dictionary = {}
@export var summit_mode: bool = false
@export var hub_mode: bool = false
var pens: Array = []
var hub_pois: Array = []
var hub_gate_opt: Dictionary = {}
var hub_near: int = -1
var barn_offers: Array = [{"type": "normal", "name": "White sheep", "cost": 30}, {"type": "black", "name": "Black sheep", "cost": 40}, {"type": "goat", "name": "Goat", "cost": 45}, {"type": "goose", "name": "Goose", "cost": 35}, {"type": "ram", "name": "Ram", "cost": 70}]
var kind: String = "gather"
var stage: Dictionary = {}
var shop_offers: Array = []
var map_msg: String = ""
var final_kind: String = ""
const HERD: Array = ["normal", "normal", "normal", "normal", "normal", "normal", "goat", "goat", "goose", "goose", "ram", "black"]

var world: World
var ysort: Node2D
var dog: ClassicDog
var sheep: Array = []
var foxes: Array = []
var cam: Camera2D
var hud: ClassicHud
var dog_frames: SpriteFrames
var sheep_frames: SpriteFrames
var fox_frames: SpriteFrames
var shadow_tex: Texture2D
var state: String = "play"
var t_left: float = 240.0
var t_total: float = 240.0
var clock: float = 0.0
var events: Array = []
var need: int = 6
var penned: int = 0
var lost: int = 0
var result: Dictionary = {}
var banner: String = ""
var banner_t: float = 0.0
var popups: Array = []
var shake: float = 0.0
# input
var stick_on: bool = false
var stick_id: int = -99
var stick_origin: Vector2 = Vector2.ZERO
var stick_pos: Vector2 = Vector2.ZERO
var stick_vec: Vector2 = Vector2.ZERO
var calm_held: bool = false
var calm_id: int = -99
var sprint_held: bool = false
var sprint_id: int = -99

func vp() -> Vector2:
	return get_viewport_rect().size

func btn_pos(i: int) -> Vector2:
	var v: Vector2 = vp()
	return Vector2(v.x - 70.0 - 126.0 * float(i), v.y - 72.0)

func finish_rect() -> Rect2:
	return Rect2(vp().x / 2.0 - 70.0, 5.0, 140.0, 30.0)


func _ready() -> void:
	randomize()
	Mover.char_k = 1.0
	if summit_mode:
		if not Peak.active():
			Peak.new_run(hub_mode)
		stage = Peak.pending
		if OS.has_feature("web"):
			var sq: String = str(JavaScriptBridge.eval("window.location.search"))
			if sq.contains("tier="):
				stage = {"type": "herd", "tier": clampi(sq.substr(sq.find("tier=") + 5, 1).to_int(), 1, 5), "col": 0}
				if sq.contains("kind="):
					stage["kind"] = sq.substr(sq.find("kind=") + 5).get_slice("&", 0)
		for t in 5:
			if OS.get_cmdline_user_args().has("tier%d" % (t + 1)):
				stage = {"type": "herd", "tier": t + 1, "col": 0}
				for kk in ["gather", "sort", "hunt"]:
					if OS.get_cmdline_user_args().has(kk):
						stage["kind"] = kk
		run_day = int(Peak.run["done"]) + 1
		kind = String(stage.get("kind", "gather"))
	shadow_tex = U.shadow_texture()
	dog_frames = U.frames(load("res://art/chars/dog.png") as Texture2D, 48, ["east", "north", "south", "south-east", "north-east"])
	sheep_frames = U.frames(load("res://art/chars/sheep.png") as Texture2D, 40, ["east", "north", "south"])
	fox_frames = U.frames(load("res://art/chars/fox.png") as Texture2D, 52, ["east", "north", "south", "south-east", "north-east"])
	world = World.new()
	world.wx = WX
	world.wy = WY
	world.lite = summit_mode
	if summit_mode:
		RenderingServer.set_default_clear_color(Color(0.07, 0.2, 0.12))
	world.flat = false
	world.refst = true
	world.GH = int(WY / 48.0)
	world.biome_id = "sunhaven"
	world.biome = Meta.BIOMES["sunhaven"]
	add_child(world)
	ysort = Node2D.new()
	ysort.y_sort_enabled = true
	add_child(ysort)
	world.generate(ysort)
	if summit_mode:
		var sqs: String = str(JavaScriptBridge.eval("window.location.search")) if OS.has_feature("web") else ""
		guide_mode = sqs.contains("guide=1") or OS.get_cmdline_user_args().has("guide")
		painted_mode = sqs.contains("painted=1") or OS.get_cmdline_user_args().has("painted") or (hub_mode and not sqs.contains("painted=0") and not guide_mode and not OS.get_cmdline_user_args().has("flat"))
		if hub_mode and stage.is_empty() and not ResourceLoader.exists("res://art/mtn/hub_home.png"):
			painted_mode = false
		fit_mode = sqs.contains("fit=1")
		Mover.char_k = 1.8 if painted_mode else 1.0
		base_zoom = 1.25 if painted_mode else 1.6
		lm = MountainMap.new()
		lm.guide = guide_mode
		if hub_mode:
			lm.map_id = 5 if stage.is_empty() else 3
			lm.painted_path = "res://art/mtn/world.png" if stage.is_empty() else "res://art/mtn/arena.png"
		if sqs.contains("map=2") or OS.get_cmdline_user_args().has("map2"):
			lm.map_id = 2
			lm.painted_path = "res://art/mtn/test_map2.png"
			lm.paint_seed = 8
		lm.debug_blocked = sqs.contains("dbg=1")
		lm.hide_bridges = sqs.contains("nobridge=1")
		for ua in OS.get_cmdline_user_args():
			if String(ua).begins_with("pseed"):
				lm.paint_seed = String(ua).substr(5).to_int()
		if sqs.contains("pseed="):
			lm.paint_seed = sqs.substr(sqs.find("pseed=") + 6, 5).to_int()
		lm.painted = painted_mode
		lm.game = self
		add_child(lm)
		var t_build: int = Time.get_ticks_msec()
		lm.build(1 if hub_mode else (3 if (guide_mode or painted_mode) else int(stage.get("tier", 1))))
		print("MTN build ms=", Time.get_ticks_msec() - t_build)
	elif layers_mode():
		lm = LayerMap.new()
		lm.game = self
		add_child(lm)
		lm.build()
	_setup_pens()
	if hub_mode and stage.is_empty() and lm is MountainMap and (lm as MountainMap).map_id == 5 and not guide_mode:
		_setup_hub_world()
	_spawn_dog()
	if hub_mode and OS.has_feature("web") and not hub_pois.is_empty():
		var hq: String = str(JavaScriptBridge.eval("window.location.search"))
		if hq.contains("hubat="):
			dog.position = ((hub_pois[clampi(hq.substr(hq.find("hubat=") + 6, 1).to_int(), 0, hub_pois.size() - 1)] as Dictionary)["pos"] as Vector2)
	_spawn_sheep()
	_setup_camera()
	_setup_layers()
	if guide_mode:
		_guide_prepare()
	if fit_mode:
		cam.limit_left = -100000
		cam.limit_top = -100000
		cam.limit_right = 100000
		cam.limit_bottom = 100000
		hud.visible = false
	need = int(ceil(float(sheep.size()) * minf(0.7, 0.5 + 0.02 * float(run_day - 1))))
	t_total = 240.0 + 6.0 * float(maxi(0, sheep.size() - 12))
	t_left = t_total
	dog.bark_cd = 0.0
	for i in 3 + mini(run_day, 7):
		events.append({"t": randf_range(20.0, t_total - 70.0), "raid": randf() < 0.4 + 0.03 * float(run_day)})
	events.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return float(a["t"]) < float(b["t"]))
	banner = "DAY %d  -  FIND YOUR SHEEP" % run_day
	ensure_pups()
	if summit_mode:
		summit_start()
	banner_t = 3.5
	if lm is MountainMap and OS.get_cmdline_user_args().has("mtntest"):
		mtn_test.call_deferred()
	if lm is MountainMap and OS.get_cmdline_user_args().has("arenatest"):
		arena_test.call_deferred()
	if hub_mode and OS.get_cmdline_user_args().has("runtest"):
		run_test.call_deferred()
	if hub_mode and OS.get_cmdline_user_args().has("hubtest"):
		hub_test.call_deferred()

func _spawn_dog() -> void:
	dog = ClassicDog.new()
	ysort.add_child(dog)
	dog.setup(dog_frames, shadow_tex)
	dog.position = world.dog_start

func _near_pen(p: Vector2, margin: float) -> bool:
	for pn in pens:
		if ((pn as Dictionary)["rect"] as Rect2).grow(margin).has_point(p):
			return true
	return false

# the home pen at the hub: everything the run has herded so far wanders about in it
func _spawn_flock() -> void:
	var fl: Array = Peak.run.get("flock", [])
	var R: Rect2 = world.pen
	for i in mini(fl.size(), 70):
		var t: String = String(fl[i])
		if not TYPES.has(t):
			t = "normal"
		var s := ClassicSheep.new()
		ysort.add_child(s)
		s.setup(t, TYPES[t], sheep_frames, shadow_tex)
		s.position = Vector2(randf_range(R.position.x + 24.0, R.end.x - 24.0), randf_range(R.position.y + 22.0, R.end.y - 22.0))
		s.in_pen = true
		s.pen_i = 0
		s.seen = true
		sheep.append(s)

func _spawn_sheep() -> void:
	if hub_mode and stage.is_empty():
		_spawn_flock()
		return
	var cs: Array = []
	for i in 4:
		for tries in 60:
			var p := Vector2(randf_range(260.0, WX - 260.0), randf_range(260.0, WY - 260.0))
			if p.distance_to(world.dog_start) < 420.0 or p.distance_to(world.pen.get_center()) < 560.0 or world._blocked(p, 24.0) or _near_pen(p, 200.0):
				continue
			var ok: bool = true
			for q in cs:
				if (q as Vector2).distance_to(p) < 340.0:
					ok = false
			if ok:
				cs.append(p)
				break
	if cs.is_empty():
		cs.append(Vector2(WX * 0.4, WY * 0.5))
	if lm != null:
		cs = lm.cluster_centers(cs)
	var idx: int = 0
	for t in herd_list():
		var s := ClassicSheep.new()
		ysort.add_child(s)
		s.setup(String(t), TYPES[String(t)], sheep_frames, shadow_tex)
		var hide_it: bool = idx < 2 and not painted_mode and not hub_mode
		var c: Vector2 = cs[randi() % cs.size()]
		var p := c + Vector2.from_angle(randf() * TAU) * randf_range(0.0, 80.0)
		if hide_it:
			p = Vector2(randf_range(260.0, WX - 260.0), randf_range(260.0, WY - 260.0))
			if p.distance_to(world.dog_start) < 400.0 or p.distance_to(world.pen.get_center()) < 520.0 or world._blocked(p, 20.0) or (lm != null and lm.spawn_layer(p) != 0):
				p = c + Vector2(30.0, 30.0)
			s.hidden_grass = true
			s.spr.visible = false
			s.shadow.visible = false
			_add_rustle(s)
		s.position = p
		if lm != null:
			var sl: int = lm.spawn_layer(p)
			if sl < 0:
				p = c
				s.position = p
				sl = lm.spawn_layer(p)
			if sl > 0:
				s.layer = sl
		sheep.append(s)
		idx += 1

func _add_rustle(s: ClassicSheep) -> void:
	var holder := Node2D.new()
	holder.name = "Rustle"
	s.add_child(holder)
	var tuft: Texture2D = world.tex("tuft")
	for i in 4:
		var sp := Sprite2D.new()
		sp.texture = tuft
		sp.position = Vector2((float(i) - 1.5) * 9.0, float(i % 2) * 3.0)
		sp.scale = Vector2.ONE * 1.15
		sp.offset = Vector2(0, -9)
		sp.material = world.wind_mat
		holder.add_child(sp)

func _setup_camera() -> void:
	cam = Camera2D.new()
	cam.limit_left = 0
	cam.limit_top = 0
	cam.limit_right = int(WX)
	cam.limit_bottom = int(WY)
	add_child(cam)
	cam.position = dog.position
	cam.make_current()
	var pollen := CPUParticles2D.new()
	pollen.amount = 38
	pollen.lifetime = 9.0
	pollen.preprocess = 9.0
	pollen.local_coords = false
	pollen.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	pollen.emission_rect_extents = Vector2(620.0, 360.0)
	pollen.direction = Vector2(1, 0.15)
	pollen.spread = 25.0
	pollen.initial_velocity_min = 8.0
	pollen.initial_velocity_max = 26.0
	pollen.gravity = Vector2(10.0, 3.0)
	pollen.scale_amount_min = 1.4
	pollen.scale_amount_max = 2.6
	pollen.color = Color(1.0, 0.86, 0.92, 0.85)
	pollen.z_index = 40
	cam.add_child(pollen)

func _setup_layers() -> void:
	var hud_layer := CanvasLayer.new()
	hud_layer.layer = 3
	add_child(hud_layer)
	hud = ClassicHud.new()
	hud.main = self
	hud.set_anchors_preset(Control.PRESET_FULL_RECT)
	hud.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud_layer.add_child(hud)

# ---------------------------------------------------------------- input
func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		var te := event as InputEventScreenTouch
		if te.pressed:
			_press(te.position, te.index)
		else:
			_release(te.index)
	elif event is InputEventScreenDrag:
		var de := event as InputEventScreenDrag
		_drag(de.position, de.index)
	elif not DisplayServer.is_touchscreen_available():
		if event is InputEventMouseButton:
			var me := event as InputEventMouseButton
			if me.button_index == MOUSE_BUTTON_LEFT:
				if me.pressed:
					_press(me.position, -1)
				else:
					_release(-1)
		elif event is InputEventMouseMotion:
			var mm := event as InputEventMouseMotion
			if (mm.button_mask & MOUSE_BUTTON_MASK_LEFT) != 0:
				_drag(mm.position, -1)
	if event is InputEventKey:
		var ke := event as InputEventKey
		if ke.pressed and not ke.echo:
			if state == "levelup":
				if ke.keycode == KEY_1:
					pick_levelup(0)
				elif ke.keycode == KEY_2:
					pick_levelup(1)
				elif ke.keycode == KEY_3:
					pick_levelup(2)
			elif ke.keycode == KEY_SPACE:
				do_bark()
			elif ke.keycode == KEY_N and summit_mode:
				skip_stage()
			elif ke.keycode == KEY_O:
				ov_zoom = not ov_zoom
			elif ke.keycode == KEY_H:
				hud.visible = not hud.visible
			elif ke.keycode == KEY_U and lm is MountainMap:
				var top: Array = (lm as MountainMap).spawnable[(lm as MountainMap).levels - 1]
				if not top.is_empty():
					dog.position = top[top.size() / 2]
					dog.layer = (lm as MountainMap).levels - 1
			elif ke.keycode == KEY_U and lm != null:
				dog.position = Vector2(11.0, 14.0) * LayerMap.CELL
				dog.layer = 1
			elif ke.keycode == KEY_T:
				gain_xp(xp_need(), dog.position)
			elif ke.keycode == KEY_P:
				for s in loose_sheep():
					(s as ClassicSheep).position = world.pen.get_center() + Vector2(randf_range(-70.0, 70.0), randf_range(-40.0, 40.0))
			elif ke.keycode == KEY_F:
				_toggle_fullscreen()

func _toggle_fullscreen() -> void:
	var w: Window = get_window()
	if w.mode == Window.MODE_FULLSCREEN:
		w.mode = Window.MODE_WINDOWED
	else:
		w.mode = Window.MODE_FULLSCREEN

func _press(p: Vector2, id: int) -> void:
	if summit_mode and state == "play" and skip_rect().grow(6.0).has_point(p):
		skip_stage()
		return
	if state == "levelup":
		for i in perk_offers.size():
			if lv_card_rect(i).has_point(p):
				pick_levelup(i)
				return
		return
	if hub_mode and state == "map":
		if hub_near >= 0 and hub_btn_rect().has_point(p):
			hub_activate()
			return
		if Rect2(8.0, 92.0, 96.0, 28.0).grow(8.0).has_point(p):
			get_tree().change_scene_to_file("res://main.tscn")
			return
		if not stick_on and p.y > 46.0:
			stick_on = true
			stick_id = id
			stick_origin = p
			stick_pos = p
			stick_vec = Vector2.ZERO
		return
	if state == "pshop" or state == "prest" or state == "map" or state == "final" or state == "pbarn":
		summit_press(p)
		return
	if state == "result":
		if summit_mode:
			summit_result_tap()
			return
		if bool(result["ok"]):
			run_day += 1
		else:
			reset_run()
		get_tree().reload_current_scene()
		return
	if Rect2(8.0, 92.0, 96.0, 28.0).grow(8.0).has_point(p):
		get_tree().change_scene_to_file("res://main.tscn")
		return
	if penned >= need and finish_rect().grow(8.0).has_point(p):
		finish_day("called")
		return
	if p.distance_to(btn_pos(0)) < BTN_R + 14.0:
		do_bark()
		return
	if p.distance_to(btn_pos(2)) < BTN_R + 14.0:
		sprint_held = true
		sprint_id = id
		return
	if p.distance_to(btn_pos(1)) < BTN_R + 14.0:
		calm_held = true
		calm_id = id
		return
	if not stick_on and p.y > 46.0:
		stick_on = true
		stick_id = id
		stick_origin = p
		stick_pos = p
		stick_vec = Vector2.ZERO

func _drag(p: Vector2, id: int) -> void:
	if stick_on and id == stick_id:
		stick_pos = p
		var d: Vector2 = p - stick_origin
		var l: float = d.length()
		var rr: float = 62.0
		stick_vec = d / maxf(l, 0.001) * minf(1.0, l / rr)
		if l > rr:
			stick_pos = stick_origin + d / l * rr

func _release(id: int) -> void:
	if id == stick_id:
		stick_on = false
		stick_id = -99
		stick_vec = Vector2.ZERO
	if id == calm_id:
		calm_held = false
		calm_id = -99
	if id == sprint_id:
		sprint_held = false
		sprint_id = -99

var test_dir: Vector2 = Vector2.ZERO
var test_n: int = 0

func move_input() -> Vector2:
	if test_dir != Vector2.ZERO:
		return test_dir
	if stick_on:
		return stick_vec
	var v := Vector2.ZERO
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		v.x -= 1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		v.x += 1.0
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP):
		v.y -= 1.0
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN):
		v.y += 1.0
	return v.normalized() if v.length() > 0.0 else v

# ---------------------------------------------------------------- the loop
func _physics_process(delta: float) -> void:
	update_camera(delta)
	if state != "play":
		if state == "map" and hub_mode:
			var hdt: float = minf(delta, 0.05)
			clock += hdt
			banner_t = maxf(0.0, banner_t - hdt)
			update_dog(hdt)
			update_sheep(hdt)
			update_hub()
		return
	var dt: float = minf(delta, 0.05)
	clock += dt
	t_left -= dt
	banner_t = maxf(0.0, banner_t - dt)
	update_dog(dt)
	update_sheep(dt)
	if lm != null and OS.get_cmdline_user_args().has("layertest"):
		layer_test()
	update_foxes(dt)
	update_perks(dt)
	run_events()
	for pu in popups:
		pu["t"] = float(pu["t"]) - dt
	popups = popups.filter(func(q: Dictionary) -> bool: return float(q["t"]) > 0.0)
	penned = 0
	for pn in pens:
		(pn as Dictionary)["n"] = 0
	for s in sheep:
		if (s as ClassicSheep).in_pen:
			penned += 1
			var pdc: Dictionary = pens[clampi((s as ClassicSheep).pen_i, 0, pens.size() - 1)]
			pdc["n"] = int(pdc["n"]) + 1
	update_pen_signs()
	var all_in: bool = sheep.size() > 0 and penned >= sheep.size()
	if all_in:
		finish_day("all")
	elif t_left <= 0.0:
		t_left = 0.0
		finish_day("time")

var cam_pos: Vector2 = Vector2.ZERO
var cam_look: Vector2 = Vector2.ZERO
var cam_init: bool = false

func update_camera(delta: float) -> void:
	if not cam_init:
		cam_pos = dog.position
		cam_init = true
	var at_home: bool = false
	cam_look = cam_look.lerp(Vector2.ZERO if at_home else dog.vel * 0.16, 1.0 - exp(-2.5 * delta))
	cam_pos = cam_pos.lerp(world.pen.get_center() + Vector2(0.0, 60.0) if at_home else dog.position, 1.0 - exp(-5.0 * delta))
	shake = maxf(0.0, shake - delta * 2.5)
	var sh: Vector2 = Vector2(sin(clock * 63.0), cos(clock * 71.0)) * shake * shake * 3.0
	cam.position = cam_pos + cam_look + sh

func _process(delta: float) -> void:
	dog.animate(delta)
	for s in sheep:
		(s as ClassicSheep).animate(delta)
	for f in foxes:
		(f as ClassicFox).animate(delta)
	if lm != null:
		lm.sync_all()
	# camera: look ahead, ease out when sprinting, tiny shake on a bark
	var target_zoom: float = (1.0 if painted_mode else 2.0) if (hub_mode and state == "map") else (0.29 if summit_mode else 0.3) if ov_zoom else base_zoom * 0.94 if (sprint_held and not dog.winded and dog.vel.length() > 150.0) else base_zoom
	var z: float = lerpf(cam.zoom.x, target_zoom, minf(1.0, delta * 3.0))
	cam.zoom = Vector2(z, z)
	if guide_mode or fit_mode:
		var fit: float = minf(vp().x / WX, vp().y / WY)
		cam.zoom = Vector2(fit, fit)
		cam.position = Vector2(WX, WY) / 2.0
	hud.queue_redraw()
	# who has been seen
	var half: Vector2 = vp() / 2.0 * 0.9
	var c: Vector2 = cam.get_screen_center_position()
	for s in sheep:
		var sh: ClassicSheep = s
		if not sh.seen and not sh.hidden_grass and absf(sh.position.x - c.x) < half.x and absf(sh.position.y - c.y) < half.y:
			sh.seen = true

# ---------------------------------------------------------------- collisions
func seg_push(e: Mover, r: float, a: Vector2, b: Vector2, bounce: float) -> void:
	var ab: Vector2 = b - a
	var l2: float = ab.length_squared()
	var t: float = 0.0
	if l2 > 0.0:
		t = clampf((e.position - a).dot(ab) / l2, 0.0, 1.0)
	var p: Vector2 = a + ab * t
	var ex: Vector2 = e.position - p
	var d: float = ex.length()
	if d < r:
		var n: Vector2 = ex / d if d > 0.0001 else Vector2(0, -1)
		e.position = p + n * r
		var vn: float = e.vel.dot(n)
		if vn < 0.0:
			e.vel -= n * (1.0 + bounce) * vn

func collide(e: Mover, r: float, bounce: float, bounded: bool = true) -> void:
	for w in world.walls:
		if w["broken"] or e.layer >= 1:
			continue
		seg_push(e, r, w["a"], w["b"], bounce)
	for k in (world.rocks_near(e.position) if e.layer <= 0 else []):
		var kp: Vector2 = k["pos"]
		var m: float = float(k["r"]) + r
		var d: Vector2 = e.position - kp
		var dist: float = d.length()
		if dist < m:
			var n: Vector2 = d / maxf(dist, 0.001)
			e.position = kp + n * m
			var vn: float = e.vel.dot(n)
			if vn < 0.0:
				e.vel -= n * (1.0 + bounce) * vn
	if not bounded:
		return
	if e.position.x < XMIN + r:
		e.position.x = XMIN + r
		e.vel.x = absf(e.vel.x) * bounce
	if e.position.x > XMAX - r:
		e.position.x = XMAX - r
		e.vel.x = -absf(e.vel.x) * bounce
	if e.position.y < YMIN + r:
		e.position.y = YMIN + r
		e.vel.y = absf(e.vel.y) * bounce
	if e.position.y > YMAX - r:
		e.position.y = YMAX - r
		e.vel.y = -absf(e.vel.y) * bounce

func breached() -> bool:
	for w in world.walls:
		if w["pen"] and w["broken"]:
			return true
	return false

func eligible(s: ClassicSheep) -> bool:
	return (not s.carried) and ((not s.in_pen) or breached())

# ---------------------------------------------------------------- the dog
func update_dog(dt: float) -> void:
	var inp: Vector2 = move_input()
	var mag: float = minf(1.0, inp.length())
	var dir: Vector2 = inp.normalized() if mag > 0.02 else Vector2.ZERO
	dog.stun = maxf(0.0, dog.stun - dt)
	dog.bark_cd = maxf(0.0, dog.bark_cd - dt)
	var keys_sprint: bool = Input.is_key_pressed(KEY_SHIFT)
	var want_sprint: bool = sprint_held or keys_sprint
	var keys_calm: bool = Input.is_key_pressed(KEY_C)
	dog.walk = stick_on and mag > 0.12 and mag < 0.58
	dog.crouch = calm_held or keys_calm or dog.walk
	var speedk: float
	if dog.crouch:
		speedk = maxf(0.55, mag)
	elif mag < 0.12:
		speedk = 0.0
	else:
		speedk = 0.62 + 0.38 * minf(1.0, (mag - 0.12) / 0.5)
	# stamina: running costs a little, sprinting a lot; crouching recovers fast
	var run: bool = (not dog.crouch) and mag > 0.62
	if dog.winded and dog.stam > dog.stam_max * 0.25:
		dog.winded = false
	var sprinting: bool = want_sprint and (not dog.winded) and dog.stam > 0.0 and mag > 0.12 and not dog.crouch
	if sprinting:
		dog.stam -= 24.0 * dt
	elif run:
		dog.stam -= 5.0 * dt
	elif dog.crouch:
		dog.stam += 26.0 * dt
	else:
		dog.stam += (11.0 if mag < 0.12 else 6.0) * dt
	if dog.stam <= 0.0:
		dog.stam = 0.0
		dog.winded = true
	dog.stam = minf(dog.stam_max, dog.stam)
	dog.stam_max = 100.0 * (1.0 + 0.15 * float(pl("fleet")))
	var base: float = (95.0 if dog.crouch else 210.0) * (1.0 + 0.07 * float(pl("fleet"))) * ((1.0 + 0.1 * float(pl("stride"))) if (lm != null and lm.on_ramp(dog.position)) else 1.0)
	var sp: float = base * speedk * (0.72 if dog.winded else 1.0) * (1.55 if sprinting else 1.0) * (0.3 if dog.stun > 0.0 else 1.0)
	var zk: String = world.zone_kind(dog.position)
	if zk == "water":
		sp *= 0.45
	elif zk == "mud":
		sp *= 0.65
	dog.vel += (dir * sp - dog.vel) * minf(1.0, dt * 9.0)
	var old_dog: Vector2 = dog.position
	dog.position += dog.vel * dt
	collide(dog, 6.0, 0.0)
	lm_resolve(dog, old_dog)
	bump_sheep(dt)
	var v: float = dog.vel.length()
	if v > 20.0:
		dog.heading = dog.vel / v

func bump_sheep(dt: float) -> void:
	for s in sheep:
		var sh: ClassicSheep = s
		if sh.carried or sh.hidden_grass or sh.layer != dog.layer:
			continue
		var d: Vector2 = sh.position - dog.position
		var dist: float = d.length()
		var mn: float = 6.0 + sh.r
		if dist >= mn or dist < 0.01:
			continue
		var n: Vector2 = d / dist
		var pen_d: float = mn - dist
		var impact: float = maxf(0.0, dog.vel.dot(n))
		var ks: float = 0.15 if sh.heavy else 0.7
		sh.position += n * pen_d * ks
		dog.position -= n * pen_d * (1.0 - ks)
		if impact > 0.0:
			dog.vel -= n * impact * (0.85 if sh.heavy else 0.55)
		sh.vel += n * (impact * (0.15 if sh.heavy else 0.55) + 18.0)
		if impact > 115.0 and (not sh.in_pen) and sh.bump_t <= 0.0 and not sh.heavy:
			sh.bump_t = 0.6
			sh.panic = maxf(sh.panic, 0.75)
			sh.squash = 1.0
			add_popup("BUMP!", sh.position + Vector2(0, -16), Color(1.0, 0.72, 0.29))

func do_bark() -> void:
	if state != "play" or dog.bark_cd > 0.0 or dog.stun > 0.0:
		return
	dog.bark_cd = 2.4
	dog.squash = 1.0
	shake = 1.0
	var R: float = 150.0 * (1.0 + 0.15 * float(pl("echo")))
	var ring := RingFx.new()
	ring.position = dog.position
	ring.maxr = R
	add_child(ring)
	for s in sheep:
		var sh: ClassicSheep = s
		if sh.carried:
			continue
		var dd: Vector2 = sh.position - dog.position
		var dist: float = dd.length()
		if not sh.seen and dist < 420.0:
			sh.ping = 4.0
		if sh.hidden_grass and dist < 150.0:
			reveal(sh)
		if sh.in_pen or (sh.layer != dog.layer and pl("valley") == 0):
			continue
		if dist < R and dist > 0.1:
			var f: float = 1.0 - dist / R
			sh.vel += dd / dist * 190.0 * f * sh.bark_mul
			sh.panic = maxf(sh.panic, 0.9 * sh.bark_mul)
			sh.squash = 1.0
	for f in foxes:
		var fx: ClassicFox = f
		if fx.position.distance_to(dog.position) < R * 1.35:
			scare_fox(fx, 2.8)
	if pl("echo") >= 1:
		echo_q.append(0.45)
	if pl("echo") >= 3:
		echo_q.append(0.9)

func reveal(s: ClassicSheep) -> void:
	s.hidden_grass = false
	s.seen = true
	s.spr.visible = true
	s.shadow.visible = true
	var r: Node = s.get_node_or_null("Rustle")
	if r != null:
		r.queue_free()
	add_popup("FOUND!", s.position + Vector2(0, -18), Color(1.0, 0.82, 0.3))

func add_popup(text: String, pos: Vector2, col: Color) -> void:
	popups.append({"s": text, "pos": pos, "t": 1.0, "col": col})

# ---------------------------------------------------------------- the flock
func zone_mult() -> float:
	return (1.18 if dog.crouch else 1.6) * (1.0 + 0.1 * float(pl("shadow")))

func pressure_from(s: ClassicSheep, p: Vector2, h: Vector2, mult: float, calm: bool, dt: float, zone_base: float) -> float:
	var zb: float = zone_base if zone_base > 0.0 else s.zone
	var Z: float = zb * mult
	var d: Vector2 = s.position - p
	var dist: float = d.length()
	if dist >= Z or dist < 0.1:
		return 0.0
	var t: float = 1.0 - dist / Z
	var u: Vector2 = d / dist
	var side: float = 1.0 if (h.x * u.y - h.y * u.x) > 0.0 else -1.0
	var k: float = s.flee * ((0.5) if calm else 1.0) * (3.6 if (s.type == "goat" and calm) else 1.0) * (1.0 + s.panic * 0.8)
	s.vel += (u * t * t * 430.0 + Vector2(-u.y, u.x) * side * t * 95.0) * k * dt
	return t

func update_sheep(dt: float) -> void:
	for s in sheep:
		var sh: ClassicSheep = s
		if sh.carried or sh.hidden_grass:
			sh.vel = Vector2.ZERO
			continue
		var huddle: bool = false
		for f in foxes:
			var fx: ClassicFox = f
			if fx.carry != null:
				continue
			var pd: float = fx.position.distance_to(sh.position)
			if pd < 270.0:
				huddle = true
			if pd < 95.0:
				sh.panic = maxf(sh.panic, 0.6)
		sh.panic = maxf(0.0, sh.panic - dt * 0.55 * (1.0 + 0.4 * float(pl("steady"))))
		if sh.in_pen:
			sh.wa += randf_range(-1.0, 1.0) * dt * 3.0
			sh.vel += Vector2(cos(sh.wa), sin(sh.wa)) * 14.0 * dt
		else:
			var pressure: float = pressure_from(sh, dog.position, dog.heading, zone_mult(), dog.crouch, dt, 0.0) if sh.layer == dog.layer else 0.0
			for f in foxes:
				var fx2: ClassicFox = f
				if fx2.carry != null:
					continue
				if fx2.layer == sh.layer:
					pressure += pressure_from(sh, fx2.position, fx2.vel.normalized(), 1.0, false, dt, 80.0) * 0.7
			if sh.type == "ram":
				var dd: float = dog.position.distance_to(sh.position)
				if dd < 26.0 and dog.stun <= 0.0 and sh.panic < 0.2:
					dog.stun = 0.7
					dog.vel += (dog.position - sh.position) / maxf(dd, 0.01) * 260.0
					add_popup("OOF!", dog.position + Vector2(0, -16), Color(1.0, 0.72, 0.29))
			var c := Vector2.ZERO
			var vsum := Vector2.ZERO
			var n: int = 0
			var sep := Vector2.ZERO
			for o in sheep:
				var ot: ClassicSheep = o
				if ot == sh or ot.in_pen or ot.carried or ot.hidden_grass or ot.layer != sh.layer:
					continue
				var dv: Vector2 = ot.position - sh.position
				var dist: float = dv.length()
				if dist < (260.0 if huddle else 130.0):
					c += ot.position
					vsum += ot.vel
					n += 1
				var m: float = sh.r + ot.r + 5.0
				if dist < m and dist > 0.1:
					sep -= dv / dist * (1.0 - dist / m)
			if n > 0:
				c /= float(n)
				vsum /= float(n)
				var coh: float = 26.0 * (1.0 + 0.15 * float(pl("steady"))) * (2.4 if sh.type == "lamb" else sh.coh) * (1.5 if pressure > 0.0 else 1.0) * (3.0 if huddle else 1.0)
				var dc: Vector2 = c - sh.position
				var dl: float = maxf(dc.length(), 0.001)
				if dl > (20.0 if huddle else 28.0):
					sh.vel += dc / dl * coh * dt
				sh.vel += (vsum - sh.vel) * 0.7 * dt
			sh.vel += sep * 260.0 * dt
			if pressure < 0.05 and not huddle:
				var lz: Vector2 = lure_target(sh)
				if lz != Vector2.ZERO:
					var dl2: Vector2 = lz - sh.position
					if dl2.length() > 24.0:
						sh.vel += dl2.normalized() * 24.0 * dt
				sh.graze -= dt
				if sh.graze <= 0.0:
					sh.graze = randf_range(1.0, 3.5)
					sh.wa = randf() * TAU
					sh.gs = randf_range(6.0, 16.0) if randf() < 0.55 else 0.0
				sh.vel += Vector2(cos(sh.wa), sin(sh.wa)) * sh.gs * dt * 1.4
			if sh.panic > 0.5:
				for o2 in sheep:
					var o2s: ClassicSheep = o2
					if o2s != sh and not o2s.in_pen and not o2s.carried and not o2s.heavy and o2s.position.distance_to(sh.position) < 46.0 and randf() < dt * 2.2:
						o2s.panic = maxf(o2s.panic, sh.panic * 0.8)
		if not sh.in_pen:
			if sh.home_t > 0.0:
				sh.home_t -= dt
				var rk: float = (1.0 + 0.6 * float(pl("rope"))) if (lm != null and lm.on_ramp(sh.position)) else 1.0
				sh.vel += (goal_for(sh) - sh.position).normalized() * (215.0 if sh.heavy else 235.0) * rk * dt
			var mg: int = pl("magnet")
			if mg > 0:
				var mpn: Dictionary = pens[pen_for(sh)]
				var gate: Vector2 = Vector2(float(mpn["gate"]), (mpn["rect"] as Rect2).end.y)
				if sh.position.distance_to(gate) < 150.0 + 30.0 * float(mg):
					var inside: Vector2 = gate + Vector2(0.0, -50.0)
					sh.vel += (inside - sh.position).normalized() * (40.0 + 20.0 * float(mg)) * dt
		if lm is MountainMap and not sh.in_pen:
			sh.vel += (lm as MountainMap).wall_push(sh.position, sh.layer) * 170.0 * dt
		var fr: float = 3.2 if sh.in_pen else 2.0
		sh.vel *= exp(-fr * dt)
		var zk: String = world.zone_kind(sh.position)
		var zf: float = 1.0
		if zk == "water":
			zf = sh.swim_f
		elif zk == "mud":
			zf = sh.mud_f
		var cap: float = 95.0 * sh.spd * (1.0 + sh.panic * 0.5) * zf
		var v: float = sh.vel.length()
		if v > cap:
			sh.vel *= cap / v
		var old_sh: Vector2 = sh.position
		sh.position += sh.vel * dt
		collide(sh, sh.r, 0.2)
		lm_resolve(sh, old_sh)
		check_pen(sh)
		if sh.hidden_grass == false and sh.position.distance_to(dog.position) < 85.0 and false:
			reveal(sh)
	for s in sheep:
		var sh2: ClassicSheep = s
		if sh2.hidden_grass and sh2.position.distance_to(dog.position) < 85.0:
			reveal(sh2)

# which pen a sheep belongs in, and what happens when it reaches one
func pen_accepts(i: int, sh: ClassicSheep) -> bool:
	var acc: Array = pens[i]["accept"]
	return acc.is_empty() or acc.has(sh.type)

func pen_for(sh: ClassicSheep) -> int:
	var best: int = 0
	var bd: float = 1.0e9
	for i in pens.size():
		if not pen_accepts(i, sh):
			continue
		var d: float = sh.position.distance_to((pens[i]["rect"] as Rect2).get_center())
		if d < bd:
			bd = d
			best = i
	return best

func check_pen(sh: ClassicSheep) -> void:
	if not sh.in_pen:
		for i in pens.size():
			var P: Rect2 = pens[i]["rect"]
			if sh.position.x > P.position.x + 16.0 and sh.position.x < P.end.x - 6.0 and sh.position.y > P.position.y + 6.0 and sh.position.y < P.end.y - 6.0:
				if not pen_accepts(i, sh):
					sh.position.y = P.end.y + 12.0
					sh.vel = Vector2(randf_range(-40.0, 40.0), 150.0)
					sh.panic = maxf(sh.panic, 0.5)
					add_popup("WRONG PEN", sh.position + Vector2(0, -14), Color(1.0, 0.6, 0.4))
					return
				sh.in_pen = true
				sh.pen_i = i
				sh.squash = 1.0
				add_popup("+1", sh.position + Vector2(0, -14), Color(0.6, 1.0, 0.6))
				gain_xp(float(XP_OF.get(sh.type, 10)) * (1.0 + 0.25 * float(pl("fleece"))), sh.position)
				break
	if sh.in_pen:
		var P2: Rect2 = pens[clampi(sh.pen_i, 0, pens.size() - 1)]["rect"]
		sh.position.x = clampf(sh.position.x, P2.position.x + sh.r + 2.0, P2.end.x - sh.r - 2.0)
		sh.position.y = clampf(sh.position.y, P2.position.y + sh.r + 2.0, P2.end.y - sh.r - 2.0)

# the pens of this stage: the castle pen, and for a sort stage two more, each with its own kind of animal
func _setup_pens() -> void:
	if hub_mode:
		for pdn in world.pads:
			(pdn as Node2D).visible = false
	pens = [{"rect": world.pen, "gate": world.gate_x, "accept": [], "label": "", "col": Color(1, 1, 1), "n": 0, "total": 0}]
	if hub_mode and not stage.is_empty() and kind == "sort":
		var c: Vector2 = world.pen.get_center()
		(pens[0] as Dictionary)["accept"] = ["normal"]
		(pens[0] as Dictionary)["label"] = "WHITE SHEEP"
		(pens[0] as Dictionary)["col"] = Color(0.95, 0.93, 0.85)
		var extra: Array = [[Vector2(-660.0, -70.0), "black", "BLACK SHEEP", Color(0.22, 0.2, 0.26)], [Vector2(660.0, -70.0), "goat", "GOATS", Color(0.78, 0.55, 0.28)]]
		for ex in extra:
			var d: Dictionary = world.add_pen(c + (ex[0] as Vector2))
			pens.append({"rect": d["rect"], "gate": d["gate"], "accept": [ex[1]], "label": ex[2], "col": ex[3], "n": 0, "total": 0})
	if guide_mode and hub_mode and stage.is_empty():
		for b in MountainMap.HUB_BUILDINGS:
			var bd: Dictionary = b
			var mk := PenSign.new()
			mk.mode = "marker"
			mk.size = bd["size"]
			mk.col = bd["col"]
			mk.position = bd["c"]
			mk.z_index = -120
			add_child(mk)
		for g in MountainMap.HUB_GATES:
			var gk := PenSign.new()
			gk.mode = "marker"
			gk.size = Vector2(80.0, 80.0)
			gk.col = Color(0.55, 0.2, 0.75)
			gk.position = g
			gk.z_index = -120
			add_child(gk)
	var rects: Array = []
	for pn in pens:
		rects.append((pn as Dictionary)["rect"])
	if lm is MountainMap:
		(lm as MountainMap).set_pens(rects)
	for i in pens.size():
		var pd: Dictionary = pens[i]
		if not painted_mode:
			var fl := PenSign.new()
			fl.rect = pd["rect"]
			fl.position = (pd["rect"] as Rect2).get_center()
			fl.mode = "floor"
			fl.z_index = -120
			add_child(fl)
		if String(pd["label"]) != "" and not guide_mode:
			var sg := PenSign.new()
			sg.mode = "sign"
			sg.label = pd["label"]
			sg.col = pd["col"]
			sg.position = Vector2((pd["rect"] as Rect2).get_center().x, (pd["rect"] as Rect2).position.y + 4.0)
			ysort.add_child(sg)
			pd["sign"] = sg

func update_pen_signs() -> void:
	for i in pens.size():
		var pd: Dictionary = pens[i]
		if pd.has("sign"):
			var sg: PenSign = pd["sign"]
			var tot: int = 0
			for s in sheep:
				if pen_accepts(i, s as ClassicSheep):
					tot += 1
			if sg.n != int(pd["n"]) or sg.total != tot:
				sg.n = int(pd["n"])
				sg.total = tot
				sg.queue_redraw()

func lure_target(s: ClassicSheep) -> Vector2:
	if s.lure == "":
		return Vector2.ZERO
	var best: Vector2 = Vector2.ZERO
	var bd: float = 520.0
	for z in world.zones:
		if z["kind"] != s.lure:
			continue
		var cc: Vector2
		if z["kind"] == "water":
			cc = (z["rect"] as Rect2).get_center()
		else:
			cc = z["c"]
		var d: float = cc.distance_to(s.position)
		if d < bd:
			bd = d
			best = cc
	return best

# ---------------------------------------------------------------- the foxes
func run_events() -> void:
	while events.size() > 0 and float(events[0]["t"]) <= clock:
		var e: Dictionary = events.pop_front()
		spawn_fox(bool(e["raid"]))

func edge_point() -> Vector2:
	var live: Array = sheep.filter(func(q: ClassicSheep) -> bool: return not q.carried)
	var t: Vector2 = world.pen.get_center()
	if live.size() > 0 and randf() < 0.6:
		t = (live[randi() % live.size()] as ClassicSheep).position
	var ds: Array = [t.x - XMIN, XMAX - t.x, t.y - YMIN, YMAX - t.y]
	var m: float = 1.0e9
	var side: int = 0
	for i in 4:
		if float(ds[i]) < m:
			m = float(ds[i])
			side = i
	if randf() > 0.6:
		side = randi() % 4
	if side == 0:
		return Vector2(XMIN + 6.0, clampf(t.y + randf_range(-160, 160), YMIN + 10.0, YMAX - 10.0))
	if side == 1:
		return Vector2(XMAX - 6.0, clampf(t.y + randf_range(-160, 160), YMIN + 10.0, YMAX - 10.0))
	if side == 2:
		return Vector2(clampf(t.x + randf_range(-200, 200), XMIN + 10.0, XMAX - 10.0), YMIN + 6.0)
	return Vector2(clampf(t.x + randf_range(-200, 200), XMIN + 10.0, XMAX - 10.0), YMAX - 6.0)

func spawn_fox(raid: bool) -> void:
	var f := ClassicFox.new()
	ysort.add_child(f)
	f.setup(fox_frames, shadow_tex)
	f.position = edge_point()
	if summit_mode and lm != null:
		var ls: Array = loose_sheep()
		if not ls.is_empty():
			var tsh: ClassicSheep = ls[randi() % ls.size()]
			f.layer = tsh.layer
			f.position = lm.fox_spawn(tsh.position, tsh.layer)
	f.raid = raid
	foxes.append(f)
	if raid:
		banner = "A RAIDER HEADS FOR THE PEN!"
		banner_t = 2.6
		Input.vibrate_handheld(60)

func move_to(e: Mover, target: Vector2, speed: float, dt: float, k: float) -> void:
	var d: Vector2 = target - e.position
	var l: float = maxf(d.length(), 0.001)
	e.vel += (d / l * speed - e.vel) * minf(1.0, dt * k)

func nearest_wall(pos: Vector2) -> Dictionary:
	var best: Dictionary = {}
	var bd: float = 1.0e9
	for i in world.walls.size():
		var w: Dictionary = world.walls[i]
		if not w["pen"] or w["broken"]:
			continue
		var a: Vector2 = w["a"]
		var b: Vector2 = w["b"]
		var ab: Vector2 = b - a
		var t: float = clampf((pos - a).dot(ab) / maxf(ab.length_squared(), 0.001), 0.0, 1.0)
		var p: Vector2 = a + ab * t
		var d: float = pos.distance_to(p)
		if d < bd:
			bd = d
			best = {"i": i, "p": p, "d": d}
	return best

func hit_wall(f: ClassicFox, nw: Dictionary, dmg: float, dt: float) -> void:
	var w: Dictionary = world.walls[int(nw["i"])]
	w["hp"] = float(w["hp"]) - dmg * dt
	if float(w["hp"]) <= 0.0 and not w["broken"]:
		w["broken"] = true
		for n in (w["nodes"] as Array):
			(n as Sprite2D).modulate = Color(1, 0.4, 0.3, 0.35)
		add_popup("DUG THROUGH!", nw["p"], Color(1.0, 0.55, 0.4))
		Input.vibrate_handheld(60)

func drop_carry(f: ClassicFox) -> void:
	var s: ClassicSheep = f.carry
	if s == null:
		return
	s.carried = false
	s.panic = 1.0
	s.vel = Vector2(randf_range(-60, 60), randf_range(-60, 60))
	f.carry = null
	f.carry_t = 0.0
	f.scared = maxf(f.scared, 3.0)
	add_popup("SAVED!", s.position + Vector2(0, -14), Color(0.6, 1.0, 0.6))

func scare_fox(f: ClassicFox, t: float) -> void:
	f.scared = maxf(f.scared, t)
	if f.carry != null:
		drop_carry(f)

func kill_sheep(s: ClassicSheep) -> void:
	sheep.erase(s)
	lost += 1
	add_popup("CARRIED OFF", s.position + Vector2(0, -12), Color(1.0, 0.42, 0.42))
	s.queue_free()
	Input.vibrate_handheld(60)

func update_foxes(dt: float) -> void:
	for f in foxes.duplicate():
		var fx: ClassicFox = f
		fx.scared = maxf(0.0, fx.scared - dt)
		fx.hes = maxf(0.0, fx.hes - dt)
		var dd: float = fx.position.distance_to(dog.position)
		if fx.scared > 0.0 or (dd < 115.0 and not dog.crouch and fx.carry == null):
			if dd < 115.0 and not dog.crouch:
				fx.scared = maxf(fx.scared, 1.6)
				if fx.carry != null:
					drop_carry(fx)
			var away: Vector2 = (fx.position - dog.position).normalized()
			move_to(fx, fx.position + away * 100.0, 165.0, dt, 8.0)
		elif fx.carry != null:
			var e: Vector2 = nearest_edge(fx.position)
			move_to(fx, e, 100.0, dt, 6.0)
			fx.carry.position = fx.position + Vector2(0, -4)
			fx.carry_t += dt
			if fx.carry_t > 12.0 or fx.position.x < XMIN - 30.0 or fx.position.x > XMAX + 30.0 or fx.position.y < YMIN - 30.0 or fx.position.y > YMAX + 30.0:
				var cs: ClassicSheep = fx.carry
				fx.carry = null
				kill_sheep(cs)
				foxes.erase(fx)
				fx.queue_free()
				continue
		else:
			fx.tt -= dt
			if fx.raid and not breached():
				fx.tgt = null
				var nw: Dictionary = nearest_wall(fx.position)
				if not nw.is_empty():
					move_to(fx, nw["p"], 100.0, dt, 6.0)
					if float(nw["d"]) < 10.0:
						hit_wall(fx, nw, 11.0, dt)
			else:
				if fx.tgt == null or fx.tgt.carried or not sheep.has(fx.tgt) or fx.tt <= 0.0:
					fx.tt = 1.2
					var best: ClassicSheep = null
					var bs: float = -1.0e9
					for s in sheep:
						var sh: ClassicSheep = s
						if not eligible(sh) or sh.layer != fx.layer:
							continue
						var sc: float = (120.0 if sh.type == "lamb" else 0.0) + sh.position.distance_to(dog.position) * 0.5 + (260.0 if (sh.in_pen and fx.raid) else (-60.0 if sh.in_pen else 0.0))
						if sc > bs:
							bs = sc
							best = sh
					fx.tgt = best
				if fx.tgt != null:
					fx.zig += dt * 5.0
					var dv: Vector2 = fx.tgt.position - fx.position
					var l: float = maxf(dv.length(), 0.001)
					var pv := Vector2(-dv.y, dv.x) / l
					move_to(fx, fx.tgt.position + pv * sin(fx.zig) * 14.0, 115.0, dt, 6.0)
					if l < 10.0 + fx.tgt.r:
						fx.carry = fx.tgt
						fx.carry.carried = true
						fx.carry.in_pen = false
						fx.carry.vel = Vector2.ZERO
						add_popup("GOT ONE!", fx.position + Vector2(0, -14), Color(1.0, 0.6, 0.4))
				else:
					var nw2: Dictionary = nearest_wall(fx.position)
					if not nw2.is_empty():
						move_to(fx, nw2["p"], 100.0, dt, 6.0)
						if float(nw2["d"]) < 10.0:
							hit_wall(fx, nw2, 11.0, dt)
		var old_fx: Vector2 = fx.position
		fx.position += fx.vel * dt
		collide(fx, fx.r, 0.0, fx.carry == null)
		lm_resolve(fx, old_fx)
		# a tackle makes it drop what it is carrying
		if fx.position.distance_to(dog.position) < 12.0 and fx.carry != null:
			drop_carry(fx)

func nearest_edge(p: Vector2) -> Vector2:
	var cands: Array = [Vector2(XMIN - 60.0, p.y), Vector2(XMAX + 60.0, p.y), Vector2(p.x, YMIN - 60.0), Vector2(p.x, YMAX + 60.0)]
	var best: Vector2 = cands[0]
	var bd: float = 1.0e9
	for c in cands:
		var cc: Vector2 = c
		var d: float = cc.distance_to(p)
		if d < bd:
			bd = d
			best = cc
	return best

# ---------------------------------------------------------------- the end of the day
func finish_day(why: String) -> void:
	if state != "play":
		return
	state = "result"
	var ok: bool = penned >= need
	result = {"ok": ok, "penned": penned, "need": need, "total": sheep.size() + lost, "lost": lost, "why": why, "day": run_day, "level": run_level}
	if not ok:
		run_best = maxi(run_best, run_day - 1)

# ---------------------------------------------------------------- the run: xp, perks that help gather
func pl(id: String) -> int:
	return int(run_perks.get(id, 0))

func reset_run() -> void:
	run_day = 1
	run_perks = {}
	run_level = 1
	run_xp = 0.0

func herd_list() -> Array:
	if summit_mode:
		return summit_herd()
	var out: Array = HERD.duplicate()
	var extra: Array = ["normal", "goat", "goose", "ram", "black", "normal"]
	var n: int = mini(30, 12 + 2 * (run_day - 1)) - 12
	for i in n:
		out.append(extra[i % extra.size()])
	return out

func xp_need() -> float:
	return 30.0 + 20.0 * float(run_level - 1)

func gain_xp(amount: float, at: Vector2) -> void:
	run_xp += amount
	if summit_mode:
		Peak.run["gold"] = int(Peak.run["gold"]) + int(amount / 2.0 * (1.0 + 0.5 * float(pl("gold"))))
	add_popup("+%d xp" % int(amount), at + Vector2(0, -28), Color(0.6, 0.9, 1.0))
	while run_xp >= xp_need():
		run_xp -= xp_need()
		run_level += 1
		pending_lv += 1
	if pending_lv > 0 and state == "play":
		begin_levelup()

func roll_offers() -> void:
	perk_offers.clear()
	var pool: Array = []
	for p in PERKS:
		if pl(String(p["id"])) < int(p["max"]):
			pool.append(p)
	pool.shuffle()
	for i in mini(3, pool.size()):
		perk_offers.append(pool[i])

func begin_levelup() -> void:
	state = "levelup"
	stick_on = false
	stick_vec = Vector2.ZERO
	calm_held = false
	sprint_held = false
	roll_offers()
	if perk_offers.is_empty():
		pending_lv = 0
		state = "play"

func lv_card_rect(i: int) -> Rect2:
	var v: Vector2 = vp()
	var w: float = (v.x - 100.0) / 3.0
	return Rect2(30.0 + float(i) * (w + 20.0), 120.0, w, 250.0)

func pick_levelup(i: int) -> void:
	if state != "levelup" or i < 0 or i >= perk_offers.size():
		return
	var id: String = String(perk_offers[i]["id"])
	run_perks[id] = pl(id) + 1
	add_popup(String(perk_offers[i]["name"]) + "!", dog.position + Vector2(0, -44), Color(0.8, 0.95, 1.0))
	var ring := RingFx.new()
	ring.position = dog.position
	ring.maxr = 70.0
	ring.col = Color(0.7, 0.9, 1.0)
	add_child(ring)
	pending_lv -= 1
	ensure_pups()
	if pending_lv > 0:
		roll_offers()
		if perk_offers.is_empty():
			pending_lv = 0
	if pending_lv <= 0:
		state = "map" if (summit_mode and stage.is_empty()) else "play"

# ---------------------------------------------------------------- where a sheep should be sent
func pen_entrances(pi: int = 0) -> Array:
	var P: Rect2 = pens[pi]["rect"] if not pens.is_empty() else world.pen
	var out: Array = [[Vector2(float(pens[pi]["gate"]) if not pens.is_empty() else world.gate_x, P.end.y), Vector2(0.0, 1.0)]]
	if pi > 0:
		return out
	if bool(world.holes.get("north", false)):
		out.append([Vector2(P.get_center().x, P.position.y), Vector2(0.0, -1.0)])
	if bool(world.holes.get("west", false)):
		out.append([Vector2(P.position.x, P.get_center().y), Vector2(-1.0, 0.0)])
	if bool(world.holes.get("east", false)):
		out.append([Vector2(P.end.x, P.get_center().y), Vector2(1.0, 0.0)])
	return out

func seg_blocked(a: Vector2, b: Vector2, box: Rect2) -> bool:
	for i in range(1, 9):
		if box.has_point(a.lerp(b, float(i) / 9.0)):
			return true
	return false

# the way in: the nearest open gate, around the walls if need be
func pen_goal(p: Vector2, pi: int = 0) -> Vector2:
	var PR: Rect2 = pens[pi]["rect"] if not pens.is_empty() else world.pen
	var best_st := Vector2.ZERO
	var best_e := Vector2.ZERO
	var best_n := Vector2.ZERO
	var bd: float = 1.0e9
	for en in pen_entrances(pi):
		var e: Vector2 = en[0]
		var n: Vector2 = en[1]
		var st: Vector2 = e + n * 80.0
		var d: float = p.distance_to(st)
		if d < bd:
			bd = d
			best_st = st
			best_e = e
			best_n = n
	var rel: Vector2 = p - best_e
	var along: float = rel.dot(best_n)
	var lat: float = absf(rel.dot(best_n.orthogonal()))
	if along < 110.0 and along > -60.0 and lat < 45.0:
		return best_e - best_n * 50.0
	var box: Rect2 = PR.grow(8.0)
	if not seg_blocked(p, best_st, box):
		return best_st
	var cb: Rect2 = PR.grow(44.0)
	var corners: Array = [cb.position, Vector2(cb.end.x, cb.position.y), cb.end, Vector2(cb.position.x, cb.end.y)]
	var pick: Vector2 = best_st
	var pd: float = 1.0e9
	for c in corners:
		var cc: Vector2 = c
		if p.distance_to(cc) < 60.0 or seg_blocked(p, cc, box):
			continue
		var dd: float = p.distance_to(cc) + cc.distance_to(best_st)
		if dd < pd:
			pd = dd
			pick = cc
	return pick

func loose_sheep() -> Array:
	var out: Array = []
	for s in sheep:
		var sh: ClassicSheep = s
		if not sh.in_pen and not sh.carried and not sh.hidden_grass:
			out.append(sh)
	return out

func perk_ring(r: float, col: Color) -> void:
	var ring := RingFx.new()
	ring.position = dog.position
	ring.maxr = r
	ring.col = col
	add_child(ring)

# ---------------------------------------------------------------- the perks that fire by themselves
func update_perks(dt: float) -> void:
	var lg: int = pl("gust")
	if lg > 0:
		gust_t -= dt
		if gust_t <= 0.0:
			gust_t = 6.0 - 0.6 * float(lg)
			var rg: float = 200.0 + 30.0 * float(lg)
			perk_ring(rg, Color(0.7, 0.9, 1.0))
			for s in loose_sheep():
				var sh: ClassicSheep = s
				if sh.position.distance_to(dog.position) < rg and (sh.layer == dog.layer or pl("valley") > 0):
					sh.vel += (goal_for(sh) - sh.position).normalized() * 150.0
					sh.home_t = maxf(sh.home_t, 1.2)
	var lw: int = pl("whistle")
	if lw > 0:
		whistle_t -= dt
		if whistle_t <= 0.0:
			whistle_t = 9.0 - 0.8 * float(lw)
			var rw: float = 280.0 + 40.0 * float(lw)
			perk_ring(rw, Color(1.0, 0.9, 0.5))
			add_popup("WHISTLE!", dog.position + Vector2(0, -38), Color(1.0, 0.9, 0.5))
			for s2 in loose_sheep():
				var sh2: ClassicSheep = s2
				if sh2.position.distance_to(dog.position) < rw and (sh2.layer == dog.layer or pl("valley") > 0):
					sh2.home_t = maxf(sh2.home_t, 3.0 + 0.4 * float(lw))
					sh2.panic = maxf(sh2.panic, 0.3)
	var ln: int = pl("sniff")
	if ln > 0:
		sniff_t -= dt
		if sniff_t <= 0.0:
			sniff_t = 7.0 - 0.6 * float(ln)
			var rn: float = 420.0 + 90.0 * float(ln)
			for s3 in sheep:
				var sh3: ClassicSheep = s3
				if sh3.carried or sh3.in_pen:
					continue
				var d3: float = sh3.position.distance_to(dog.position)
				if sh3.hidden_grass and d3 < rn:
					reveal(sh3)
				elif not sh3.seen:
					sh3.ping = 4.0
	var lk: int = pl("lookout")
	if lk > 0:
		lookout_t -= dt
		if lookout_t <= 0.0:
			lookout_t = 7.0 - 0.8 * float(lk)
			for sl in sheep:
				var shl: ClassicSheep = sl
				if shl.hidden_grass:
					reveal(shl)
				elif not shl.seen and not shl.in_pen:
					shl.ping = 4.0
	var lf: int = pl("ward")
	if lf > 0:
		ward_t -= dt
		if ward_t <= 0.0:
			ward_t = 6.0 - 0.5 * float(lf)
			var rf: float = 220.0 + 40.0 * float(lf)
			var any: bool = false
			for f in foxes:
				var fx: ClassicFox = f
				if fx.position.distance_to(dog.position) < rf:
					scare_fox(fx, 3.0)
					any = true
			if any:
				perk_ring(rf, Color(1.0, 0.6, 0.4))
	# the bark echoes
	for i in range(echo_q.size() - 1, -1, -1):
		echo_q[i] = float(echo_q[i]) - dt
		if float(echo_q[i]) <= 0.0:
			echo_q.remove_at(i)
			var re: float = 150.0 * (1.0 + 0.15 * float(pl("echo")))
			perk_ring(re, Color(1.0, 0.95, 0.75))
			for s4 in sheep:
				var sh4: ClassicSheep = s4
				if sh4.carried or sh4.in_pen:
					continue
				var dd4: Vector2 = sh4.position - dog.position
				var dist4: float = dd4.length()
				if dist4 < re and dist4 > 0.1:
					sh4.vel += dd4 / dist4 * 190.0 * (1.0 - dist4 / re) * sh4.bark_mul * 0.7
	update_pups(dt)

func ensure_pups() -> void:
	var want: int = 0 if pl("pups") == 0 else 1 + pl("pups") / 2
	while pups.size() < want:
		var pd := ClassicDog.new()
		ysort.add_child(pd)
		pd.setup(dog_frames, shadow_tex)
		pd.spr.modulate = Color(0.6, 0.85, 1.0, 0.75)
		pd.z_index = 100
		pd.position = dog.position + Vector2(randf_range(-30.0, 30.0), randf_range(20.0, 40.0))
		pups.append(pd)
	while pups.size() > want:
		(pups.pop_back() as Node).queue_free()

# a ghost pup picks a stray, gets behind it and drives it toward the pen
func update_pups(dt: float) -> void:
	var lp: int = pl("pups")
	var taken: Array = []
	for pu in pups:
		var pd: ClassicDog = pu
		pd.animate(dt)
		var tgt: ClassicSheep = null
		var worst: float = -1.0
		for s in loose_sheep():
			var sh: ClassicSheep = s
			if taken.has(sh) or sh.position.distance_to(dog.position) > 700.0:
				continue
			var far: float = sh.position.distance_to(world.pen.get_center())
			if far > worst:
				worst = far
				tgt = sh
		var spd: float = 135.0 + 15.0 * float(lp)
		if tgt == null:
			move_to(pd, dog.position + Vector2(40.0, 40.0), spd, dt, 5.0)
		else:
			taken.append(tgt)
			var dirv: Vector2 = (goal_for(tgt) - tgt.position).normalized()
			var spot: Vector2 = tgt.position - dirv * 70.0
			move_to(pd, spot, spd, dt, 5.0)
			if pd.position.distance_to(tgt.position) < 130.0:
				pressure_from(tgt, pd.position, dirv, 0.9, true, dt, 0.0)
		pd.position += pd.vel * dt
		pd.position.x = clampf(pd.position.x, XMIN, XMAX)
		pd.position.y = clampf(pd.position.y, YMIN, YMAX)

# ---------------------------------------------------------------- levels
func layers_mode() -> bool:
	if OS.get_cmdline_user_args().has("layers"):
		return true
	return OS.has_feature("web") and str(JavaScriptBridge.eval("window.location.search")).contains("layers")

func lm_resolve(e: Mover, old: Vector2) -> void:
	if lm != null:
		lm.resolve(e, old)

# a sheep on the ground heads for the pen, one on a hill heads for the way down
func goal_for(sh: ClassicSheep) -> Vector2:
	var pi: int = pen_for(sh)
	if lm is MountainMap and (lm as MountainMap).map_id >= 3 and pi < (lm as MountainMap).pen_flow.size():
		var fm: MountainMap = lm
		var fc: Vector2i = fm._cell_of(sh.position)
		var fd: int = (fm.pen_flow[pi] as PackedInt32Array)[fm._ix(fc.x, fc.y)]
		if fd > 4 or fd < 0:
			return fm.flow_goal(sh.position, fm.pen_flow[pi])
		return pen_goal(sh.position, pi)
	if lm != null and lm.use_flow(sh.position, sh.layer):
		return lm.flow_goal(sh.position)
	return pen_goal(sh.position)

var probe: ClassicSheep = null

func layer_test() -> void:
	test_n += 1
	if OS.get_cmdline_user_args().has("sheeptest"):
		if test_n == 1:
			for s in sheep:
				if (s as ClassicSheep).layer >= 1 and not (s as ClassicSheep).hidden_grass:
					probe = s
					break
		if probe != null:
			probe.home_t = 5.0
			if test_n % 120 == 0:
				print("sheeptest pos=", probe.position, " goal=", goal_for(probe), " vel=", probe.vel, " layer=", probe.layer, " in_pen=", probe.in_pen, " home=", probe.home_t)
				if lm is MountainMap:
					var c1: Vector2i = lm._cell_of(probe.position)
					var c2: Vector2i = lm._cell_of(goal_for(probe))
					print("   cell ", c1, " lvl=", lm.lvl[lm._ix(c1.x, c1.y)], " rmp=", lm.rmp[lm._ix(c1.x, c1.y)], " dist=", lm.dist[lm._ix(c1.x, c1.y)], "  goalcell ", c2, " lvl=", lm.lvl[lm._ix(c2.x, c2.y)], " rmp=", lm.rmp[lm._ix(c2.x, c2.y)], " dist=", lm.dist[lm._ix(c2.x, c2.y)], " allowed=", lm._allowed(probe.layer, probe.position, goal_for(probe)))
		return
	var C: float = LayerMap.CELL
	var scen: int = (test_n - 1) / 260
	var f: int = (test_n - 1) % 260
	if f == 0:
		if scen == 0:
			dog.position = Vector2(21.0 * C, 11.9 * C)
			dog.layer = 0
			test_dir = Vector2.LEFT
		elif scen == 1:
			dog.position = Vector2(15.0 * C, 8.9 * C)
			dog.layer = 1
			test_dir = Vector2.RIGHT
		elif scen == 2:
			dog.position = Vector2(19.0 * C, 8.9 * C)
			dog.layer = 0
			test_dir = Vector2.RIGHT
		elif scen == 3:
			dog.position = Vector2(8.0 * C, 14.0 * C)
			dog.layer = 1
			test_dir = Vector2.RIGHT
		else:
			test_dir = Vector2.ZERO
	if f % 52 == 51 and scen < 4:
		print('layertest scen=', scen, ' x=', int(dog.position.x / C), ' y=', int(dog.position.y / C), ' layer=', dog.layer, ' elev=', int(dog.elev), ' cell=', lm.cell_type(dog.position))

# ---------------------------------------------------------------- the mountain run
func container_for(level: int) -> Node2D:
	if level <= 0:
		return ysort
	if not ysorts.has(level):
		var n := Node2D.new()
		n.y_sort_enabled = true
		n.z_index = 10 * level + 5
		add_child(n)
		ysorts[level] = n
	return ysorts[level]

func summit_herd() -> Array:
	var tier: int = int(stage.get("tier", 1))
	var typ: String = String(stage.get("type", "herd"))
	var n: int = 8 + 2 * tier + (4 if typ == "elite" else 0) + (18 if typ == "boss" else 0)
	if hub_mode and kind == "sort":
		var sl: Array = []
		for i in 3 * (3 + tier + (3 if typ == "boss" else 0)):
			sl.append(["normal", "black", "goat"][i % 3])
		return sl
	var out: Array = ["normal", "normal", "goat", "goose"]
	var cycle: Array = ["normal", "normal", "goat", "goose", "ram", "black", "normal", "goat"]
	while out.size() < n:
		out.append(cycle[out.size() % cycle.size()])
	return out

func summit_start() -> void:
	if stage.is_empty():
		state = "map"
		if int(Peak.run["picks"]) > 0:
			pending_lv = int(Peak.run["picks"])
			Peak.run["picks"] = 0
			begin_levelup()
		return
	var tier: int = int(stage["tier"])
	var typ: String = String(stage["type"])
	need = int(ceil(float(sheep.size()) * (0.5 + 0.03 * float(tier))))
	t_total = 200.0 + 8.0 * float(tier) + 6.0 * float(maxi(0, sheep.size() - 12)) + (40.0 if typ == "boss" else 0.0)
	t_left = t_total
	events.clear()
	var nf: int = 2 + tier + (3 if typ == "elite" else 0) + (6 if typ == "boss" else 0) + (4 if kind == "hunt" else 0)
	for i in nf:
		events.append({"t": randf_range(15.0, t_total - 60.0), "raid": randf() < 0.3 + 0.05 * float(tier)})
	events.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return float(a["t"]) < float(b["t"]))
	banner = "%s  -  %s" % [String(Peak.NAMES[typ]).to_upper(), String(Peak.KINDS[kind]["name"]) if hub_mode else ("THE MEADOW" if tier == 1 else ("LEVEL %d" % tier))]

func peak_pos(l: int, i: int) -> Vector2:
	var v: Vector2 = vp()
	var n: int = ((Peak.run["layers"] as Array)[l] as Array).size()
	return Vector2(64.0 + float(l) * (v.x - 128.0) / 9.0, v.y / 2.0 + 10.0 + (float(i) - (float(n) - 1.0) / 2.0) * 92.0)

func hub_card_rect(i: int, n: int) -> Rect2:
	var v: Vector2 = vp()
	var w: float = minf(250.0, (v.x - 40.0) / float(maxi(n, 1)) - 12.0)
	var total: float = float(n) * w + float(n - 1) * 12.0
	return Rect2(v.x / 2.0 - total / 2.0 + float(i) * (w + 12.0), v.y - 136.0, w, 124.0)

func popt_rect(i: int) -> Rect2:
	var v: Vector2 = vp()
	return Rect2(v.x / 2.0 - 250.0 + float(i) * 260.0, v.y / 2.0 + 30.0, 240.0, 76.0)

func pshop_row(i: int) -> Rect2:
	var v: Vector2 = vp()
	return Rect2(v.x / 2.0 - 240.0, 120.0 + float(i) * 72.0, 480.0, 62.0)

func pleave_rect() -> Rect2:
	var v: Vector2 = vp()
	return Rect2(v.x / 2.0 - 100.0, v.y - 76.0, 200.0, 46.0)

func shop_price(id: String) -> int:
	return 40 + 30 * pl(id)

func summit_press(p: Vector2) -> void:
	if Rect2(8.0, 92.0, 96.0, 28.0).grow(8.0).has_point(p) and state != "final":
		get_tree().change_scene_to_file("res://main.tscn")
		return
	map_msg = ""
	if state == "final":
		Peak.run = {}
		Peak.pending = {}
		reset_run()
		get_tree().reload_current_scene()
		return
	if state == "map":
		var opts: Array = Peak.options()
		for oi in opts.size():
			if hub_mode:
				if hub_card_rect(oi, opts.size()).has_point(p):
					enter_node(opts[oi])
					return
			elif peak_pos(int((opts[oi] as Array)[0]), int((opts[oi] as Array)[1])).distance_to(p) < 28.0:
				enter_node(opts[oi])
				return
	elif state == "pbarn":
		if pleave_rect().has_point(p):
			state = "map"
			return
		for i in barn_offers.size():
			if pshop_row(i).has_point(p):
				var bo: Dictionary = barn_offers[i]
				if int(Peak.run["gold"]) >= int(bo["cost"]):
					Peak.run["gold"] = int(Peak.run["gold"]) - int(bo["cost"])
					(Peak.run["flock"] as Array).append(String(bo["type"]))
					_add_home_sheep(String(bo["type"]))
					map_msg = "Bought a " + String(bo["name"]).to_lower()
				else:
					map_msg = "Not enough gold"
				return
	elif state == "prest":
		if hub_mode and pleave_rect().has_point(p):
			state = "map"
			return
		for i in 2:
			if popt_rect(i).has_point(p) and hub_mode:
				Peak.run["camp_used"] = true
				if i == 0:
					pending_lv = 1
					begin_levelup()
				else:
					Peak.run["gold"] = int(Peak.run["gold"]) + 50
					banner = "You forage 50 gold"
					banner_t = 3.0
					state = "map"
				return
			if popt_rect(i).has_point(p):
				if i == 0:
					Peak.run["picks"] = int(Peak.run["picks"]) + 1
				else:
					Peak.run["gold"] = int(Peak.run["gold"]) + 50
				Peak.finish_node()
				Peak.pending = {}
				get_tree().reload_current_scene()
				return
	elif state == "pshop":
		if pleave_rect().has_point(p) and hub_mode:
			state = "map"
			return
		if pleave_rect().has_point(p):
			Peak.finish_node()
			Peak.pending = {}
			get_tree().reload_current_scene()
			return
		for i in shop_offers.size():
			if pshop_row(i).has_point(p):
				var id: String = String(shop_offers[i]["id"])
				var cost: int = shop_price(id)
				if int(Peak.run["gold"]) >= cost:
					Peak.run["gold"] = int(Peak.run["gold"]) - cost
					run_perks[id] = pl(id) + 1
					map_msg = "Bought " + String(shop_offers[i]["name"])
					shop_offers.remove_at(i)
				else:
					map_msg = "Not enough gold"
				return

func enter_node(o: Array) -> void:
	Peak.run["cur"] = [int(o[0]), int(o[1])]
	var typ: String = String(Peak.node(int(o[0]), int(o[1]))["type"])
	if typ == "herd" or typ == "elite" or typ == "boss":
		Peak.pending = {"type": typ, "tier": Peak.tier_of(int(o[0])), "col": int(o[0]), "kind": String(Peak.node(int(o[0]), int(o[1])).get("kind", "gather"))}
		get_tree().reload_current_scene()
	elif typ == "rest":
		state = "prest"
	else:
		open_shop()

func open_shop() -> void:
	shop_offers.clear()
	var pool: Array = []
	for pk in PERKS:
		if pl(String(pk["id"])) < int(pk["max"]):
			pool.append(pk)
	pool.shuffle()
	for i in mini(3, pool.size()):
		shop_offers.append(pool[i])
	map_msg = ""
	state = "pshop"

func _add_home_sheep(t: String) -> void:
	var s := ClassicSheep.new()
	ysort.add_child(s)
	s.setup(t, TYPES[t], sheep_frames, shadow_tex)
	var R: Rect2 = world.pen
	s.position = Vector2(randf_range(R.position.x + 24.0, R.end.x - 24.0), randf_range(R.position.y + 22.0, R.end.y - 22.0))
	s.in_pen = true
	s.pen_i = 0
	s.seen = true
	sheep.append(s)

# ---------------------------------------------------------------- the hub world: gates, buildings, what is under the dog's paws
func hub_btn_rect() -> Rect2:
	var v: Vector2 = vp()
	return Rect2(v.x / 2.0 - 190.0, v.y - 128.0, 380.0, 104.0)

func _setup_hub_world() -> void:
	var m: MountainMap = lm
	var opts: Array = Peak.options()
	var slots: Dictionary = {1: [2], 2: [0, 1], 3: [0, 2, 1]}
	hub_gate_opt = {}
	var sl: Array = slots.get(opts.size(), [0, 2, 1])
	for i in mini(opts.size(), sl.size()):
		hub_gate_opt[int(sl[i])] = opts[i]
	hub_pois = []
	for p in m.hub_pois():
		var pd: Dictionary = p
		if String(pd["kind"]) == "gate" and not hub_gate_opt.has(int(pd["slot"])):
			continue
		hub_pois.append(pd)
		var label: String = ""
		var col := Color(1.0, 0.85, 0.3)
		match String(pd["kind"]):
			"gate":
				var o: Array = hub_gate_opt[int(pd["slot"])]
				var nd: Dictionary = Peak.node(int(o[0]), int(o[1]))
				label = String(Peak.KINDS[String(nd.get("kind", "gather"))]["name"])
				if String(nd["type"]) == "elite":
					label = "HARD " + label
				elif String(nd["type"]) == "boss":
					label = "BIG DAY: " + label
				col = Color(0.55, 0.9, 0.5)
			"shop":
				label = "TRADER"
				col = Color(0.4, 0.65, 1.0)
			"camp":
				label = "CAMP"
				col = Color(1.0, 0.65, 0.3)
			"barn":
				label = "BARN"
				col = Color(1.0, 0.45, 0.45)
		var ring := PenSign.new()
		ring.mode = "ring"
		ring.col = col
		ring.position = pd["pos"]
		ring.z_index = -119
		add_child(ring)
		var sg := PenSign.new()
		sg.mode = "sign"
		sg.label = label
		sg.col = col.darkened(0.35)
		sg.position = (pd["pos"] as Vector2) + Vector2(0.0, -62.0 if String(pd["kind"]) == "gate" else 10.0)
		ysort.add_child(sg)
	# the wool the flock grew while you were away
	var wool: int = int(Peak.run.get("wool", 0))
	if wool > 0:
		Peak.run["gold"] = int(Peak.run["gold"]) + wool
		Peak.run["wool"] = 0
		banner = "The flock's wool sells for %d gold" % wool
		banner_t = 4.0

func update_hub() -> void:
	hub_near = -1
	var best: float = 100.0
	for i in hub_pois.size():
		var d: float = dog.position.distance_to((hub_pois[i] as Dictionary)["pos"])
		if d < best:
			best = d
			hub_near = i

func hub_activate() -> void:
	if hub_near < 0:
		return
	var pd: Dictionary = hub_pois[hub_near]
	match String(pd["kind"]):
		"gate":
			stick_on = false
			enter_node(hub_gate_opt[int(pd["slot"])])
		"shop":
			open_shop()
		"camp":
			if bool(Peak.run.get("camp_used", false)):
				banner = "You already rested here. Clear another stage first."
				banner_t = 3.0
			else:
				map_msg = ""
				state = "prest"
		"barn":
			map_msg = ""
			state = "pbarn"

func summit_result_tap() -> void:
	var typ: String = String(stage.get("type", "herd"))
	var tier: int = int(stage.get("tier", 1))
	if bool(result["ok"]):
		Peak.finish_node()
		if hub_mode:
			Peak.run["wool"] = (Peak.run["flock"] as Array).size() / 5
			var fl: Array = Peak.run["flock"]
			for s in sheep:
				if (s as ClassicSheep).in_pen:
					fl.append((s as ClassicSheep).type)
		Peak.run["picks"] = int(Peak.run["picks"]) + (2 if typ == "elite" else 1)
		Peak.run["gold"] = int(Peak.run["gold"]) + 20 + 10 * tier + (30 if typ == "elite" else 0)
		Peak.pending = {}
		if typ == "boss":
			final_kind = "won"
			state = "final"
			return
		get_tree().reload_current_scene()
	else:
		final_kind = "lost"
		state = "final"

func skip_rect() -> Rect2:
	return Rect2(vp().x - 118.0, 44.0, 110.0, 30.0)

# test: count the stage as cleared and move on
func skip_stage() -> void:
	if state != "play" or not summit_mode:
		return
	result = {"ok": true, "penned": penned, "need": need, "total": sheep.size() + lost, "lost": lost, "why": "skip", "day": run_day, "level": run_level}
	summit_result_tap()

# ---------------------------------------------------------------- mountain self test (godot --headless ... -- tier4 mtntest)
func _walk(e: Mover, goal_fn: Callable, done_dist: float, max_s: float) -> bool:
	var dt: float = 1.0 / 60.0
	var t: float = 0.0
	var last: Vector2 = e.position
	var stall: float = 0.0
	while t < max_s:
		var g: Vector2 = goal_fn.call(e.position)
		if e.position.distance_to(g) < done_dist:
			return true
		var old: Vector2 = e.position
		e.position += (g - e.position).normalized() * 200.0 * dt
		lm.resolve(e, old)
		t += dt
		if int(t * 60.0) % 120 == 0:
			if e.position.distance_to(last) < 6.0:
				stall += 2.0
				if stall >= 4.0:
					return false
			else:
				stall = 0.0
			last = e.position
	return false

func mtn_test() -> void:
	var fails: Array = []
	var m: MountainMap = lm as MountainMap
	var cell: float = MountainMap.CELL
	var home: Vector2 = m.home_pos()
	# 1. every flat cell reaches the valley
	var unreach: int = 0
	var total: int = 0
	for k in m.levels:
		for p in (m.spawnable[k] as Array):
			total += 1
			var c: Vector2i = m._cell_of(p)
			if m.dist[m._ix(c.x, c.y)] < 0:
				unreach += 1
	if unreach > 0:
		fails.append("%d of %d spawn cells cannot reach the valley" % [unreach, total])
	# 2. walk down from sample cells on every level
	var down_ok: int = 0
	var down_n: int = 0
	for k in m.levels:
		var list: Array = m.spawnable[k]
		for i in mini(12, list.size()):
			var p: Vector2 = list[(i * 7919) % list.size()]
			dog.position = p
			dog.layer = k
			down_n += 1
			var fn := func(q: Vector2) -> Vector2: return m.flow_goal(q) if m.use_flow(q, dog.layer) else home
			if _walk(dog, fn, 40.0, 240.0) or dog.position.distance_to(home) < 470.0:
				down_ok += 1
			else:
				fails.append("stuck going down from level %d at %s ended %s layer %d" % [k, str(p), str(dog.position), dog.layer])
	# 3. every ramp, up then down
	var ramp_ok: int = 0
	for ri in m.ramps.size():
		var r: Dictionary = m.ramps[ri]
		if r.has("dead"):
			ramp_ok += 1
			continue
		var dir: Vector2 = ((r["b"] as Vector2) - (r["a"] as Vector2)).normalized()
		var a0: Vector2 = (r["a"] as Vector2) - dir * 50.0
		var b0: Vector2 = (r["b"] as Vector2) + dir * 50.0
		var a0c: Vector2i = m._cell_of(a0)
		var b0c: Vector2i = m._cell_of(b0)
		if m.water[m._ix(a0c.x, a0c.y)] != 0 or m.water[m._ix(b0c.x, b0c.y)] != 0:
			ramp_ok += 1
			continue
		dog.position = a0
		dog.layer = int(r["lo"])
		var up_ok: bool = _walk(dog, func(_q: Vector2) -> Vector2: return b0, 12.0, 20.0) and dog.layer == int(r["hi"])
		var up_end: String = "%s L%d" % [str(dog.position), dog.layer]
		var down_ok2: bool = _walk(dog, func(_q: Vector2) -> Vector2: return a0, 12.0, 20.0) and dog.layer == int(r["lo"])
		if up_ok and down_ok2:
			ramp_ok += 1
		else:
			fails.append("ramp %d (levels %d-%d) up=%s down=%s a=%s b=%s up_end=%s a0cell(lvl=%d rmp=%d w=%d) b0cell(lvl=%d rmp=%d w=%d)" % [ri, int(r["lo"]), int(r["hi"]), str(up_ok), str(down_ok2), str(r["a"]), str(r["b"]), up_end, int(m.lvl[m._ix(a0c.x, a0c.y)]), int(m.rmp[m._ix(a0c.x, a0c.y)]), int(m.water[m._ix(a0c.x, a0c.y)]), int(m.lvl[m._ix(m._cell_of(b0).x, m._cell_of(b0).y)]), int(m.rmp[m._ix(m._cell_of(b0).x, m._cell_of(b0).y)]), int(m.water[m._ix(m._cell_of(b0).x, m._cell_of(b0).y)])])
	# 3b. stairs stress: approach every staircase off-centre and at an angle, going up and down
	var stair_bad: int = 0
	var stair_diag: int = 0
	var stair_n: int = 0
	for ri2 in m.ramps.size():
		var rr: Dictionary = m.ramps[ri2]
		if rr.has("dead"):
			continue
		var d2: Vector2 = ((rr["b"] as Vector2) - (rr["a"] as Vector2)).normalized()
		var perp2: Vector2 = d2.orthogonal()
		var ca: Vector2i = m._cell_of((rr["a"] as Vector2) - d2 * 50.0)
		var cb: Vector2i = m._cell_of((rr["b"] as Vector2) + d2 * 50.0)
		if m.water[m._ix(ca.x, ca.y)] != 0 or m.water[m._ix(cb.x, cb.y)] != 0:
			continue
		for lat in [-1.5, -0.5, 0.5, 1.5]:
			for mode in 4:
				var from_a: bool = mode % 2 == 0
				var diag: bool = mode >= 2
				var p0: Vector2 = ((rr["a"] as Vector2) - d2 * 60.0) if from_a else ((rr["b"] as Vector2) + d2 * 60.0)
				var p1: Vector2 = ((rr["b"] as Vector2) + d2 * 60.0) if from_a else ((rr["a"] as Vector2) - d2 * 60.0)
				var l0: int = int(rr["lo"]) if from_a else int(rr["hi"])
				var l1: int = int(rr["hi"]) if from_a else int(rr["lo"])
				var off: Vector2 = perp2 * float(lat) * cell
				var start: Vector2 = p0 + off + (perp2 * float(lat) * cell * 1.5 if diag else Vector2.ZERO)
				var goal: Vector2 = p1 + (Vector2.ZERO if diag else off)
				var sc2: Vector2i = m._cell_of(start)
				var gc2: Vector2i = m._cell_of(goal)
				if m.water[m._ix(sc2.x, sc2.y)] != 0 or m.water[m._ix(gc2.x, gc2.y)] != 0 or int(m.lvl[m._ix(sc2.x, sc2.y)]) != l0 or m.rmp[m._ix(sc2.x, sc2.y)] >= 0:
					continue
				dog.position = start
				dog.layer = l0
				stair_n += 1
				var ok2: bool = _walk(dog, func(_q: Vector2) -> Vector2: return goal, 14.0, 12.0) and dog.layer == l1
				if not ok2:
					stair_bad += 1
					if diag:
						stair_diag += 1
						continue
					if stair_bad <= 6:
						fails.append("stairs %d lat=%.1f %s %s: from %s stuck at %s layer %d (wanted %d) goal %s" % [ri2, lat, "up" if from_a else "down", "diagonal" if diag else "straight", str(start), str(dog.position), dog.layer, l1, str(goal)])
	print("MTNTEST stair approaches=", stair_n, " stuck=", stair_bad - stair_diag, " (diagonal into a cliff corner: ", stair_diag, ")")
	# 3c. roomy landings: plenty of walkable ground at both ends of every staircase
	var thin: int = 0
	var roomiest: int = 99
	for ri3 in m.ramps.size():
		var r3: Dictionary = m.ramps[ri3]
		if r3.has("dead"):
			continue
		var d3: Vector2 = ((r3["b"] as Vector2) - (r3["a"] as Vector2)).normalized()
		for endp in [(r3["a"] as Vector2) - d3 * 70.0, (r3["b"] as Vector2) + d3 * 70.0]:
			var ec: Vector2i = m._cell_of(endp as Vector2)
			var open_n: int = 0
			for oy in range(-3, 4):
				for ox in range(-3, 4):
					if m._in(ec.x + ox, ec.y + oy) and m.water[m._ix(ec.x + ox, ec.y + oy)] == 0 and m.rmp[m._ix(ec.x + ox, ec.y + oy)] < 0 and m.lvl[m._ix(ec.x + ox, ec.y + oy)] == m.lvl[m._ix(ec.x, ec.y)]:
						open_n += 1
			roomiest = mini(roomiest, open_n)
			if open_n < 30:
				thin += 1
	print("MTNTEST landings thin=", thin, " least open cells of 49=", roomiest)
	if m.wide_landings and thin > 0:
		fails.append("%d staircase ends land on thin ground" % thin)
	# 4. walk from the valley up to cells on every level by the real path
	var parent: Dictionary = {}
	var start: Vector2i = m._cell_of(home)
	var queue: Array = [start]
	parent[start] = start
	var head: int = 0
	while head < queue.size():
		var cc: Vector2i = queue[head]
		head += 1
		for d in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
			var nn: Vector2i = cc + (d as Vector2i)
			if m._in(nn.x, nn.y) and not parent.has(nn) and m._can_step(cc, nn):
				parent[nn] = cc
				queue.append(nn)
	var up_paths: int = 0
	var up_total: int = 0
	for k in range(1, m.levels):
		var list2: Array = m.spawnable[k]
		for i in mini(5, list2.size()):
			var tp: Vector2 = list2[(i * 104729 + 13) % list2.size()]
			var tc: Vector2i = m._cell_of(tp)
			if not parent.has(tc):
				continue
			var path: Array = []
			var cur: Vector2i = tc
			while cur != start:
				path.push_front((Vector2(cur) + Vector2(0.5, 0.5)) * cell)
				cur = parent[cur]
			up_total += 1
			dog.position = (Vector2(start) + Vector2(0.5, 0.5)) * cell
			dog.layer = 0
			var ok: bool = true
			for wp in path:
				if not _walk(dog, func(_q: Vector2) -> Vector2: return wp, 10.0, 6.0):
					ok = false
					break
			if ok and dog.layer == k:
				up_paths += 1
			else:
				fails.append("could not climb to level %d at %s, stopped %s layer %d" % [k, str(tp), str(dog.position), dog.layer])
	# 4b. bridges can be crossed both ways, the void beside them cannot be entered
	var bridge_ok: int = 0
	for b in m.bridges:
		dog.position = b["a"]
		dog.layer = 0
		var c1: bool = _walk(dog, func(_q: Vector2) -> Vector2: return b["b"], 14.0, 25.0)
		var c2: bool = _walk(dog, func(_q: Vector2) -> Vector2: return b["a"], 14.0, 25.0)
		if c1 and c2:
			bridge_ok += 1
		else:
			fails.append("cannot cross the bridge from %s to %s (stopped at %s)" % [str(b["a"]), str(b["b"]), str(dog.position)])
	var wet: int = 0
	var tried: int = 0
	for wi in range(0, m.water.size(), 37):
		if m.water[wi] != 3:
			continue
		var wc: Vector2i = Vector2i(wi % MountainMap.GW, wi / MountainMap.GW)
		dog.position = (Vector2(wc) + Vector2(-2.5, 0.5)) * cell
		var sl: int = m.spawn_layer(dog.position)
		if sl < 0:
			continue
		dog.layer = sl
		tried += 1
		_walk(dog, func(_q: Vector2) -> Vector2: return (Vector2(wc) + Vector2(0.5, 0.5)) * cell, 6.0, 4.0)
		var dc: Vector2i = m._cell_of(dog.position)
		if m.water[m._ix(dc.x, dc.y)] != 0:
			wet += 1
			fails.append("the dog walked into the void at %s" % str(dc))
	# nothing walkable may sit right on a drop (the drawn edge is up to a cell off)
	var raw_edge: int = 0
	for yy in range(1, MountainMap.GH - 1):
		for xx in range(1, MountainMap.GW - 1):
			var ii: int = m._ix(xx, yy)
			if m.water[ii] != 0 or m.rmp[ii] >= 0:
				continue
			var near_bridge: bool = false
			for bc in m.bridge_cells:
				if absi((bc as Vector2i).x - xx) <= 3 and absi((bc as Vector2i).y - yy) <= 3:
					near_bridge = true
					break
			if near_bridge:
				continue
			for d in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
				var nn: int = m._ix(xx + (d as Vector2i).x, yy + (d as Vector2i).y)
				if m.water[nn] == 3:
					raw_edge += 1
	if raw_edge > 0:
		fails.append("%d walkable cells touch the void directly" % raw_edge)
	# pushed hard into an edge at an angle, the dog must keep sliding along it
	var slid: int = 0
	var pushed: int = 0
	for wi2 in range(0, m.water.size(), 53):
		if m.water[wi2] != 2:
			continue
		var wc2: Vector2i = Vector2i(wi2 % MountainMap.GW, wi2 / MountainMap.GW)
		var start2: Vector2 = (Vector2(wc2) + Vector2(-1.5, 0.5)) * cell
		if m.spawn_layer(start2) < 0:
			continue
		dog.position = start2
		dog.layer = m.spawn_layer(start2)
		pushed += 1
		var p0: Vector2 = dog.position
		for fr in 90:
			var o2: Vector2 = dog.position
			dog.position += Vector2(0.8, 0.6).normalized() * 200.0 / 60.0
			m.resolve(dog, o2)
		if dog.position.distance_to(p0) > 20.0:
			slid += 1
	print("MTNTEST edge pushes=", pushed, " moved=", slid)
	print("MTNTEST bridges=", bridge_ok, "/", m.bridges.size(), " void_probes=", tried, " entered_void=", wet)
	m.sync_all()
	# 5. sprites: visible, on the right level, inside the map
	var ents: Array = [dog]
	ents.append_array(sheep)
	ents.append_array(foxes)
	var vis_bad: int = 0
	for e in ents:
		var mv: Mover = e as Mover
		if mv.get_parent() != container_for(mv.layer) and not (mv is ClassicDog):
			vis_bad += 1
			fails.append("%s is in the wrong container for layer %d" % [mv.name, mv.layer])
	for s in sheep:
		var sh: ClassicSheep = s as ClassicSheep
		if not sh.hidden_grass and (not sh.spr.visible or sh.spr.sprite_frames == null or sh.spr.modulate.a < 0.9):
			vis_bad += 1
			fails.append("a sheep sprite is not visible")
		var sc: Vector2i = m._cell_of(sh.position)
		if m.rmp[m._ix(sc.x, sc.y)] < 0 and int(m.lvl[m._ix(sc.x, sc.y)]) != sh.layer:
			fails.append("a sheep stands on level %d but is marked layer %d" % [int(m.lvl[m._ix(sc.x, sc.y)]), sh.layer])
	print("MTNTEST levels=", m.levels, " ramps=", m.ramps.size(), " unreachable=", unreach, "/", total, " down=", down_ok, "/", down_n, " ramps_ok=", ramp_ok, "/", m.ramps.size(), " climbs=", up_paths, "/", up_total, " entities=", ents.size(), " visible_bad=", vis_bad)
	if m.sealed > 400:
		fails.append("%d cells had to be sealed off" % m.sealed)
	print("MTNTEST sealed=", m.sealed)
	if m.seal_log.size() > 300:
		var bb: Rect2i = Rect2i((m.seal_log[0] as Vector3i).x, (m.seal_log[0] as Vector3i).y, 0, 0)
		var lv: Dictionary = {}
		for e in m.seal_log:
			bb = bb.expand(Vector2i((e as Vector3i).x, (e as Vector3i).y))
			lv[(e as Vector3i).z] = int(lv.get((e as Vector3i).z, 0)) + 1
		print("MTNTEST sealbox=", bb, " by level=", lv)
		for r in m.ramps:
			print("MTNTEST ramp ", r["lo"], "-", r["hi"], " a=", (r["a"] as Vector2) / 24.0, " b=", (r["b"] as Vector2) / 24.0, " dead=", r.has("dead"))
	if fails.is_empty():
		print("MTNTEST PASS")
	else:
		for f in fails:
			print("MTNTEST FAIL: ", f)
	get_tree().quit(0 if fails.is_empty() else 1)

# a clean picture of the map for the painter: no sprites, no buttons, the camera fitted to the whole map
func _guide_prepare() -> void:
	dog.visible = false
	for sh in sheep:
		(sh as Node2D).visible = false
	for w in world.walls:
		for n in (w["nodes"] as Array):
			(n as Node2D).visible = false
	hud.visible = false
	cam.limit_left = -100000
	cam.limit_top = -100000
	cam.limit_right = 100000
	cam.limit_bottom = 100000
	for c in cam.get_children():
		(c as Node).queue_free()

# arena self test (godot --headless res://hub.tscn -- tier2 sort arenatest): every pen can be reached from everywhere, and a flock
# that heads for home ends up in the right pens and never in a wrong one
func arena_test() -> void:
	var m: MountainMap = lm
	var ok: bool = true
	for i in m.pen_flow.size():
		var bad: int = 0
		var tot: int = 0
		for p in m.spawnable[0]:
			var c: Vector2i = m._cell_of(p)
			if m._near_pens(p, 20.0):
				continue
			tot += 1
			if (m.pen_flow[i] as PackedInt32Array)[m._ix(c.x, c.y)] < 0:
				bad += 1
		print("ARENATEST pen ", i, " (", pens[i]["label"], ") cells that cannot reach it: ", bad, " of ", tot)
		if bad > 0:
			ok = false
	var sim: Dictionary = _sim_home(240.0)
	var t: float = float(sim["t"])
	var rejected: int = int(sim["rejected"])
	var wrong: int = 0
	for s9 in sheep:
		var st: ClassicSheep = s9
		if not st.in_pen:
			var sc: Vector2i = m._cell_of(st.position)
			var gc: Vector2i = m._cell_of(goal_for(st))
			print("ARENATEST stuck ", st.type, " at ", st.position, " cell ", sc, " water ", m.water[m._ix(sc.x, sc.y)], " goal ", goal_for(st), " goalcell water ", m.water[m._ix(gc.x, gc.y)], " flow ", (m.pen_flow[pen_for(st)] as PackedInt32Array)[m._ix(sc.x, sc.y)], " vel ", st.vel, " pen ", pen_for(st))
	var inside: int = 0
	for s3 in sheep:
		var sh: ClassicSheep = s3
		if sh.in_pen:
			inside += 1
			if not pen_accepts(sh.pen_i, sh):
				wrong += 1
	print("ARENATEST sheep home ", inside, " of ", sheep.size(), " after ", int(t), "s, in a wrong pen ", wrong, ", turned back at a wrong gate ", rejected)
	if inside < sheep.size() or wrong > 0:
		ok = false
	if pens.size() > 1:
		var bs := ClassicSheep.new()
		ysort.add_child(bs)
		bs.setup("black", TYPES["black"], sheep_frames, shadow_tex)
		bs.position = (pens[0]["rect"] as Rect2).get_center()
		check_pen(bs)
		var turned: bool = (not bs.in_pen) and bs.position.y > (pens[0]["rect"] as Rect2).end.y
		bs.position = (pens[1]["rect"] as Rect2).get_center()
		check_pen(bs)
		var taken: bool = bs.in_pen and bs.pen_i == 1
		print("ARENATEST wrong pen turns a black sheep away: ", turned, ", its own pen takes it: ", taken)
		if not (turned and taken):
			ok = false
	print("ARENATEST ", "PASS" if ok else "FAIL")
	get_tree().quit()

# the whole run, headless (godot --headless res://hub.tscn -- runtest): the hub offers stops, every stage is herded home, the
# flock at home grows with every cleared stage, camp and trader stops are passed
func run_test() -> void:
	if not (Peak.run.has("rt_log")):
		Peak.run["rt_log"] = []
	if stage.is_empty():
		var fl: int = (Peak.run["flock"] as Array).size()
		print("RUNTEST hub: flock ", fl, " (shown in the home pen: ", sheep.size(), "), gold ", Peak.run["gold"], ", stops done ", Peak.run["done"])
		if int(Peak.run["done"]) >= Peak.COLS - 1 or state == "final":
			var grew: bool = fl > 5
			print("RUNTEST ", "PASS" if (grew and sheep.size() == mini(fl, 70)) else "FAIL")
			get_tree().quit()
			return
		var opts: Array = Peak.options()
		var pick: Array = opts[0]
		for o in opts:
			var tpn: String = String(Peak.node(int((o as Array)[0]), int((o as Array)[1]))["type"])
			if tpn == "herd" or tpn == "elite" or tpn == "boss":
				pick = o
				break
		var typ: String = String(Peak.node(int(pick[0]), int(pick[1]))["type"])
		print("RUNTEST entering ", typ, " ", Peak.node(int(pick[0]), int(pick[1])).get("kind", ""))
		if typ == "rest" or typ == "shop":
			Peak.run["cur"] = [int(pick[0]), int(pick[1])]
			Peak.finish_node()
			Peak.pending = {}
			get_tree().reload_current_scene()
			return
		enter_node(pick)
		return
	_sim_home(300.0)
	pending_lv = 0
	state = "play"
	var inside: int = 0
	for s2 in sheep:
		if (s2 as ClassicSheep).in_pen:
			inside += 1
	print("RUNTEST stage ", kind, " tier ", stage.get("tier", 0), ": ", inside, " of ", sheep.size(), " home")
	penned = inside
	finish_day("all")
	if not bool(result["ok"]):
		print("RUNTEST FAIL stage not cleared")
		get_tree().quit()
		return
	summit_result_tap()

# every loose sheep heads for its own pen, the dog far away; returns how long it took
func _sim_home(max_s: float) -> Dictionary:
	dog.position = Vector2(300.0, 300.0)
	var dt: float = 1.0 / 60.0
	var t: float = 0.0
	var rejected: int = 0
	while t < max_s:
		for s in sheep:
			if not (s as ClassicSheep).in_pen:
				(s as ClassicSheep).home_t = 5.0
		update_sheep(dt)
		for pu in popups:
			if String(pu["s"]) == "WRONG PEN" and float(pu["t"]) > 0.98:
				rejected += 1
		for pu2 in popups:
			pu2["t"] = float(pu2["t"]) - dt
		popups = popups.filter(func(q: Dictionary) -> bool: return float(q["t"]) > 0.0)
		t += dt
		var all_in: bool = true
		for s2 in sheep:
			if not (s2 as ClassicSheep).in_pen:
				all_in = false
		if all_in:
			break
	return {"t": t, "rejected": rejected}

# the hub world, headless (godot --headless res://hub.tscn -- hubtest): the dog can walk to every gate and building, the right prompt
# comes up there, and the barn, camp and trader work
func hub_test() -> void:
	var m: MountainMap = lm
	var ok: bool = true
	print("HUBTEST places: ", hub_pois.size())
	for row in [45, 46, 47]:
		var line: String = ""
		for x in range(10, 126):
			line += str(m.water[m._ix(x, row)]) if m.land[m._ix(x, row)] == 1 or m.water[m._ix(x, row)] != 3 else "."
		print("HUBROW ", row, " ", line)
	for i in hub_pois.size():
		var pd: Dictionary = hub_pois[i]
		var cell: Vector2i = m._cell_of(pd["pos"])
		var field: PackedInt32Array = m._bfs([cell], m._fence_mask(m.pen_rects, 100.0))
		var sc0: Vector2i = m._cell_of(world.dog_start)
		var reach_n: int = 0
		for v in field:
			if v >= 0:
				reach_n += 1
		print("HUBTEST   field from ", cell, " water here ", m.water[m._ix(cell.x, cell.y)], " reaches ", reach_n, " cells; dog start cell ", sc0, " value ", field[m._ix(sc0.x, sc0.y)], " water there ", m.water[m._ix(sc0.x, sc0.y)])
		dog.position = world.dog_start
		var tgt: Vector2 = pd["pos"]
		var reached: bool = _walk_to(dog, tgt, field, 120.0)
		update_hub()
		var near_ok: bool = hub_near == i
		print("HUBTEST ", pd["id"], " reached ", reached, " prompt shows it ", near_ok, " dog at ", dog.position)
		if not (reached and near_ok):
			ok = false
	# the buildings
	var gold0: int = int(Peak.run["gold"])
	Peak.run["gold"] = 500
	var flock0: int = (Peak.run["flock"] as Array).size()
	var sheep0: int = sheep.size()
	for i2 in hub_pois.size():
		var kind: String = String((hub_pois[i2] as Dictionary)["kind"])
		if kind == "gate":
			continue
		hub_near = i2
		hub_activate()
		var want: String = {"shop": "pshop", "camp": "prest", "barn": "pbarn"}[kind]
		print("HUBTEST ", kind, " opens state ", state, " (want ", want, ")")
		if state != want:
			ok = false
		if kind == "barn":
			var gold_b: int = int(Peak.run["gold"])
			summit_press(pshop_row(0).get_center())
			var bought: bool = (Peak.run["flock"] as Array).size() == flock0 + 1 and sheep.size() == sheep0 + 1 and int(Peak.run["gold"]) == gold_b - int(barn_offers[0]["cost"])
			print("HUBTEST barn buy adds a sheep to the home pen and takes the gold: ", bought)
			if not bought:
				ok = false
		if kind == "shop":
			var before: int = int(Peak.run["gold"])
			summit_press(pshop_row(0).get_center())
			print("HUBTEST trader sale: gold ", before, " -> ", Peak.run["gold"])
			if int(Peak.run["gold"]) >= before:
				ok = false
		if kind == "camp":
			summit_press(popt_rect(1).get_center())
			print("HUBTEST camp forage: gold -> ", Peak.run["gold"], " state ", state, " used ", Peak.run["camp_used"])
			if state != "map" or not bool(Peak.run["camp_used"]):
				ok = false
			hub_near = i2
			hub_activate()
			if state != "map":
				print("HUBTEST camp can be used twice")
				ok = false
		state = "map"
		if state != "map":
			ok = false
	print("HUBTEST ", "PASS" if ok else "FAIL")
	get_tree().quit()

# walk a mover along a way-home field to a spot, the way the dog would; true when it gets within a body of the spot
func _walk_to(e: Mover, tgt: Vector2, field: PackedInt32Array, max_s: float) -> bool:
	var dt: float = 1.0 / 60.0
	var t: float = 0.0
	while t < max_s:
		if e.position.distance_to(tgt) < 30.0:
			return true
		var g: Vector2 = tgt if e.position.distance_to(tgt) < 60.0 else lm.flow_goal(e.position, field)
		var old: Vector2 = e.position
		e.position += (g - e.position).normalized() * 200.0 * dt
		collide(e, 6.0, 0.0)
		lm.resolve(e, old)
		t += dt
	return false
