extends Node2D
# Sheepdog Survivors: herd animals into the pen for XP, shoo off waves of raiders, hold the fence for ten waves.

const WX: float = 3264.0
const WY: float = 2208.0
var XMIN: float = 36.0
var XMAX: float = 3228.0
var YMIN: float = 36.0
var YMAX: float = 2172.0
const BTN_R: float = 52.0
const WAVE_LEN: float = 60.0
var LAST_WAVE: int = 5
const BASE_ZOOM: float = 1.1
const TYPES: Dictionary = {
	"normal": {"r": 8.0, "zone": 120.0, "flee": 1.0, "speed": 1.0, "hp": 2, "tint": Color(1, 1, 1), "xp": 10, "set": "sheep_ref", "metric": "w", "target": 0.72},
	"lamb": {"r": 5.0, "zone": 105.0, "flee": 1.0, "speed": 1.1, "hp": 1, "tint": Color(1, 1, 1), "xp": 8, "set": "lamb8", "metric": "w", "target": 0.45},
	"ram": {"r": 10.0, "zone": 62.0, "flee": 0.9, "speed": 0.9, "hp": 4, "tint": Color(1, 1, 1), "heavy": true, "bark_mul": 0.9, "xp": 18, "set": "ram8", "metric": "w", "target": 0.85},
	"goat": {"r": 8.0, "zone": 90.0, "flee": 0.75, "speed": 0.95, "hp": 3, "tint": Color(1, 1, 1), "xp": 14, "set": "goat8", "metric": "w", "target": 0.72},
	"black": {"r": 8.0, "zone": 120.0, "flee": 1.0, "speed": 1.0, "hp": 2, "tint": Color(1, 1, 1), "coh": 0.35, "xp": 14, "set": "black8", "metric": "w", "target": 0.72},
	"goose": {"r": 6.5, "zone": 150.0, "flee": 1.3, "speed": 1.35, "hp": 1, "tint": Color(1, 1, 1), "coh": 0.5, "bark_mul": 1.6, "xp": 12, "set": "goose8", "metric": "h", "target": 0.5},
	"duck": {"r": 5.5, "zone": 125.0, "flee": 1.0, "speed": 1.1, "hp": 1, "tint": Color(1, 1, 1), "xp": 10, "set": "duck8", "metric": "h", "target": 0.34},
	"cow": {"r": 13.0, "zone": 70.0, "flee": 0.9, "speed": 0.85, "hp": 4, "tint": Color(1, 1, 1), "heavy": true, "bark_mul": 0.9, "xp": 20, "set": "cow8", "metric": "w", "target": 1.25},
	"pig": {"r": 9.0, "zone": 80.0, "flee": 0.9, "speed": 0.85, "hp": 3, "tint": Color(1, 1, 1), "heavy": true, "bark_mul": 0.9, "xp": 16, "set": "pig8", "metric": "w", "target": 0.8},
}
const STRAY_POOL: Array = ["cow", "normal", "normal", "normal", "normal", "lamb", "lamb", "goat", "goose", "ram", "black", "duck", "pig"]
const PERKS: Array = [
	{"id": "bolt", "name": "Magic Bolt", "desc": "Homing violet bolts. More bolts at levels 3 and 5.", "max": 5},
	{"id": "fire", "name": "Fireball", "desc": "Hurl an exploding fireball at the nearest raider.", "max": 5},
	{"id": "nova", "name": "Frost Nova", "desc": "A ring of frost that hurts and slows everything near you.", "max": 5},
	{"id": "zap", "name": "Chain Lightning", "desc": "Lightning jumps from raider to raider.", "max": 5},
	{"id": "orbit", "name": "Arcane Orbit", "desc": "Glowing orbs circle you and smack anything close.", "max": 5},
	{"id": "power", "name": "Spell Power", "desc": "All your spells hit harder.", "max": 5},
	{"id": "haste", "name": "Quick Cast", "desc": "All your spells recharge faster.", "max": 5},
	{"id": "wide", "name": "Wide Magic", "desc": "Bigger explosions, rings and orbits.", "max": 4},
	{"id": "bark", "name": "Arcane Howl", "desc": "Your bark reaches further and recharges faster.", "max": 4},
	{"id": "boots", "name": "Fleet Paws", "desc": "You run faster.", "max": 4},
	{"id": "vigor", "name": "Vitality", "desc": "+25 maximum health and a quick heal.", "max": 5},
	{"id": "regen", "name": "Second Wind", "desc": "You heal faster when out of danger.", "max": 4},
	{"id": "ward", "name": "Warding Robe", "desc": "You take less damage from raiders.", "max": 4},
	{"id": "magnet", "name": "Gem Magnet", "desc": "Pick up XP gems from further away.", "max": 4},
	{"id": "study", "name": "Quick Study", "desc": "Every gem gives more XP.", "max": 4},
]
const DEFS: Dictionary = {
	"archer": {"name": "Archer Tower", "cost": 20, "tex": "tower", "sc": 1.5},
	"brazier": {"name": "Fire Brazier", "cost": 30, "tex": "brazier", "sc": 1.7},
	"frost": {"name": "Frost Totem", "cost": 25, "tex": "totem", "sc": 1.9},
}
const DEF_ORDER: Array = ["archer", "brazier", "frost"]

var world: World
var ysort: Node2D
var dog: Dog
var sheep: Array = []
var foxes: Array = []
var coins: Array = []
var orbs: Array = []
var orbit_nodes: Array = []
var orbit_ang: float = 0.0
var gold: int = 0
var perk_offers: Array = []
var castle_opts: Array = []
var inter_stage: String = "wizard"
var reroll_n: int = 0
var sel_item: String = ""
var walls_lv: int = 0
var moss_lv: int = 0
var market_lv: int = 0
var cam: Camera2D
var hud: Hud
var dog_frames: SpriteFrames
var sheep_frames: SpriteFrames
var fox_frames: SpriteFrames
var imp_frames: SpriteFrames
var cow_frames: SpriteFrames
var animal_frames: Dictionary = {}
var pup_frames: SpriteFrames
var pup: Pup
var wolf_frames: SpriteFrames
var bear_frames: SpriteFrames
var shadow_tex: Texture2D
var state: String = "play"
var phase: String = "gather"
var level: int = 1
var pending_lv: int = 0
var plot: int = 0
var farm_sel: int = -1
var farm_view: String = "map"
var devmode: bool = false
var farm_msg: String = ""
var clock: float = 0.0
var wave: int = 0
var wave_t: float = 0.0
var events: Array = []
var stray_t: float = 3.0
var lost: int = 0
var herded: int = 0
var defeated: int = 0
var xp: float = 0.0
var perk_lv: Dictionary = {"bolt": 1}
var result: Dictionary = {}
var banner: String = ""
var banner_t: float = 0.0
var popups: Array = []
var shake: float = 0.0
var cloud_mat: ShaderMaterial
var bolt_t: float = 0.5
var fire_t: float = 1.5
var nova_t: float = 3.0
var zap_t: float = 2.0
var thump_t: float = 5.0
var honk_t: float = 7.0
var pen_counts: Dictionary = {}
var pen_total: int = 0
var cam_pos: Vector2 = Vector2.ZERO
var cam_look: Vector2 = Vector2.ZERO
var cam_init: bool = false
var smoke: bool = false
var demo: bool = false
var overview: bool = false
var lineup: bool = false
var interdemo: bool = false
var holesdemo: bool = false
var intercastle: bool = false
var dbg_zoom: float = 0.0
var autowalk: bool = false
var look_mode: int = 0
var style_flat: bool = false
var style_name: String = "flat"
var alarm: float = 0.0
var alarm_pos: Vector2 = Vector2.ZERO
var smoke_n: int = 0
# input
var stick_on: bool = false
var stick_id: int = -99
var stick_origin: Vector2 = Vector2.ZERO
var stick_pos: Vector2 = Vector2.ZERO
var stick_vec: Vector2 = Vector2.ZERO

func vp() -> Vector2:
	return get_viewport_rect().size

func btn_pos(i: int) -> Vector2:
	var v: Vector2 = vp()
	return Vector2(v.x - 70.0 - 126.0 * float(i), v.y - 72.0)

func pl(id: String) -> int:
	return int(perk_lv.get(id, 0))

func _ready() -> void:
	var search: String = str(JavaScriptBridge.eval("window.location.search")) if OS.has_feature("web") else ""
	if search.contains("seed="):
		seed(search.substr(search.find("seed=") + 5).to_int())
	else:
		randomize()
	style_name = "flat" if search.contains("style=flat") else ("painted" if search.contains("style=painted") else "ref")
	style_flat = style_name == "flat"
	if style_name == "ref":
		XMIN = 100.0
		XMAX = WX - 100.0
		YMIN = 108.0
		YMAX = WY - 96.0
	look_mode = search.substr(search.find("look=") + 5).to_int() if search.contains("look=") else (0 if style_name == "ref" else 6)
	smoke = OS.get_cmdline_user_args().has("smoke")
	if OS.has_feature("web"):
		demo = str(JavaScriptBridge.eval("window.location.search")).contains("demo")
		overview = str(JavaScriptBridge.eval("window.location.search")).contains("overview")
		lineup = str(JavaScriptBridge.eval("window.location.search")).contains("lineup")
		interdemo = str(JavaScriptBridge.eval("window.location.search")).contains("interdemo")
		holesdemo = str(JavaScriptBridge.eval("window.location.search")).contains("holesdemo")
		intercastle = str(JavaScriptBridge.eval("window.location.search")).contains("intercastle")
		var zs: String = str(JavaScriptBridge.eval("window.location.search"))
		if zs.contains("zoomx="):
			dbg_zoom = float(zs.substr(zs.find("zoomx=") + 6).to_float())
		autowalk = str(JavaScriptBridge.eval("window.location.search")).contains("autowalk")
	Meta.load_save()
	devmode = smoke
	if OS.has_feature("web"):
		for key in ["demo", "overview", "lineup", "interdemo", "holesdemo", "intercastle", "autowalk", "tier", "play", "lowres"]:
			if search.contains(key):
				devmode = true
	if devmode:
		Meta.all_open = true
	elif Meta.pending >= 0:
		plot = Meta.pending
	shadow_tex = U.shadow_texture()
	dog_frames = U.raven_frames("wiz_ref")
	fox_frames = U.set8("fox8", 12.0)
	imp_frames = U.set8("imp8", 12.0)
	wolf_frames = U.set8("wolf_b", 12.0)
	bear_frames = U.set8("bear_b", 10.0)
	for tk in TYPES.keys():
		var st: String = String((TYPES[tk] as Dictionary)["set"])
		if not animal_frames.has(st):
			animal_frames[st] = U.set8(st, 11.0)
	world = World.new()
	world.wx = WX
	world.wy = WY
	world.flat = style_flat
	world.refst = style_name == "ref"
	add_child(world)
	ysort = Node2D.new()
	ysort.y_sort_enabled = true
	add_child(ysort)
	world.generate(ysort)
	dog = Dog.new()
	ysort.add_child(dog)
	dog.setup(dog_frames, shadow_tex)
	dog.position = world.dog_start
	if OS.has_feature("web"):
		var srch: String = str(JavaScriptBridge.eval("window.location.search"))
		if srch.contains("startx="):
			dog.position = Vector2(float(srch.substr(srch.find("startx=") + 7).to_int()), float(srch.substr(srch.find("starty=") + 7).to_int()))
	if pup_frames != null:
		pup = Pup.new()
		ysort.add_child(pup)
		pup.setup(pup_frames, shadow_tex)
		pup.position = world.dog_start + Vector2(-30.0, 20.0)
	var spark := CPUParticles2D.new()
	spark.amount = 18
	spark.lifetime = 0.8
	spark.local_coords = false
	spark.direction = Vector2(0, -1)
	spark.spread = 70.0
	spark.initial_velocity_min = 6.0
	spark.initial_velocity_max = 22.0
	spark.gravity = Vector2(0, 14)
	spark.scale_amount_min = 1.2
	spark.scale_amount_max = 2.4
	spark.color = Color(0.85, 0.7, 1.0, 0.9)
	spark.position = Vector2(0, -12)
	spark.name = "Spark"
	dog.add_child(spark)
	for i in 24:
		spawn_stray(true)
	_setup_camera()
	_setup_layers()
	_spawn_butterflies()
	start_wave(1)
	if not devmode and Meta.pending < 0:
		state = "farm"
	if lineup:
		setup_lineup()
	if OS.has_feature("web"):
		var ts: String = str(JavaScriptBridge.eval("window.location.search"))
		if ts.contains("lowres"):
			set_low_res()
		for tt in [1, 2, 3]:
			if ts.contains("tier%d" % tt):
				world.set_tier(tt)
				dog.position = world.pen.get_center() + Vector2(0.0, 40.0)
				cam_pos = dog.position
				cam_init = true
	if holesdemo:
		dog.position = world.pen.get_center() + Vector2(0.0, 40.0)
		cam_pos = dog.position
		cam_init = true
		cam.position = dog.position
		for sd in ["north", "west", "east"]:
			world.open_hole(sd)
		for w in world.walls:
			set_wall_hp(w, float(w["hp"]))
	if interdemo:
		xp = 260.0
		gold = 220
		wave = 3
		build_on(0, "archer")
		build_on(3, "brazier")
		begin_intermission()
		if intercastle:
			inter_stage = "castle"
			sel_item = "build_frost"
	if demo or smoke:
		gold = 600
		perk_lv = {"bolt": 3, "fire": 2, "nova": 2, "zap": 2, "orbit": 2}
		for i in 4:
			build_on(i, String(DEF_ORDER[i % 3]))
		build_on(5, "brazier")
		build_on(6, "archer")
		if demo:
			perk_lv = {}
			var kinds: Array = ["fox", "imp", "wolf", "bear"]
			for i in 4:
				spawn_enemy(String(kinds[i]))
				foxes[foxes.size() - 1].position = dog.position + Vector2(-120.0 + 80.0 * float(i), 60.0 + 20.0 * float(i % 2))
				foxes[foxes.size() - 1].stun = 40.0
				world.pads[0].position = Vector2(-9999, -9999)

func _spawn_butterflies() -> void:
	var cols: Array = [Color(1.0, 0.82, 0.25), Color(1.0, 0.95, 0.95), Color(0.95, 0.5, 0.65), Color(0.45, 0.7, 1.0)]
	var made: int = 0
	for tries in 600:
		if made >= 16:
			break
		var p := Vector2(randf_range(150.0, WX - 150.0), randf_range(150.0, WY - 150.0))
		var on_flowers: bool = world.terr_at(p) == World.T_FLOWER
		if not on_flowers and made >= 10:
			continue
		if not on_flowers and tries < 300:
			continue
		if world._blocked(p, 10.0) and not on_flowers:
			continue
		var b := Butterfly.new()
		b.home = p
		b.position = p
		b.col = cols[randi() % cols.size()]
		b.z_index = 28
		add_child(b)
		made += 1

func setup_lineup() -> void:
	# every character in a row, standing still, for comparing sizes
	events.clear()
	perk_lv = {}
	for s in sheep:
		(s as Sheep).queue_free()
	sheep.clear()
	var base := Vector2(WX / 2.0, WY / 2.0 + 420.0)
	dog.position = base
	cam_pos = base
	cam_init = true
	cam.position = base
	for c in ysort.get_children():
		if c is Sprite2D and (c as Sprite2D).position.distance_to(base) < 700.0:
			(c as Sprite2D).visible = false
	var types: Array = TYPES.keys()
	for i in types.size():
		var t: String = String(types[i])
		var s := Sheep.new()
		ysort.add_child(s)
		s.setup(t, TYPES[t], animal_frames[String((TYPES[t] as Dictionary)["set"])], shadow_tex)
		s.seen = true
		s.carried = true
		s.position = base + Vector2(-360.0 + 90.0 * float(i), 90.0)
		sheep.append(s)
	var kinds: Array = ["fox", "imp", "wolf", "bear"]
	var xs: Array = [-330.0, -220.0, -110.0, 120.0]
	for i in kinds.size():
		spawn_enemy(String(kinds[i]))
		var f: Fox = foxes[foxes.size() - 1]
		f.position = base + Vector2(float(xs[i]), -70.0)
		f.stun = 9999.0

func _setup_camera() -> void:
	cam = Camera2D.new()
	cam.limit_left = 0
	cam.limit_top = 0
	cam.limit_right = int(WX)
	cam.limit_bottom = int(WY)
	cam.zoom = Vector2(BASE_ZOOM, BASE_ZOOM)
	add_child(cam)
	cam.position = dog.position
	cam.make_current()
	var pollen := CPUParticles2D.new()
	pollen.amount = 34
	pollen.lifetime = 9.0
	pollen.preprocess = 9.0
	pollen.local_coords = false
	pollen.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	pollen.emission_rect_extents = Vector2(520.0, 300.0)
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
	for kind in 2:
		var pet := CPUParticles2D.new()
		pet.amount = 10
		pet.lifetime = 9.0
		pet.preprocess = 9.0
		pet.local_coords = false
		pet.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
		pet.emission_rect_extents = Vector2(560.0, 60.0)
		pet.position = Vector2(0.0, -300.0)
		pet.direction = Vector2(0.4, 1.0)
		pet.spread = 20.0
		pet.initial_velocity_min = 10.0
		pet.initial_velocity_max = 28.0
		pet.gravity = Vector2(8.0, 6.0)
		pet.angular_velocity_min = -90.0
		pet.angular_velocity_max = 90.0
		pet.scale_amount_min = 2.4
		pet.scale_amount_max = 3.6
		pet.color = Color(1.0, 0.86, 0.9, 0.95) if kind == 0 else Color(0.78, 0.86, 0.3, 0.95)
		pet.z_index = 41
		cam.add_child(pet)

func _setup_layers() -> void:
	var clouds_layer := CanvasLayer.new()
	clouds_layer.layer = 1
	add_child(clouds_layer)
	var cr := ColorRect.new()
	cr.set_anchors_preset(Control.PRESET_FULL_RECT)
	cr.mouse_filter = Control.MOUSE_FILTER_IGNORE
	cloud_mat = ShaderMaterial.new()
	cloud_mat.shader = load("res://shaders/clouds.gdshader") as Shader
	var nt := NoiseTexture2D.new()
	var fn := FastNoiseLite.new()
	fn.frequency = 0.012
	nt.noise = fn
	nt.seamless = true
	nt.width = 256
	nt.height = 256
	cloud_mat.set_shader_parameter("noise_tex", nt)
	cr.material = cloud_mat
	clouds_layer.add_child(cr)
	clouds_layer.visible = false
	var grade_layer := CanvasLayer.new()
	grade_layer.layer = 2
	add_child(grade_layer)
	var gr := ColorRect.new()
	gr.set_anchors_preset(Control.PRESET_FULL_RECT)
	gr.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var gm := ShaderMaterial.new()
	gm.shader = load("res://shaders/look.gdshader") as Shader
	gm.set_shader_parameter("mode", look_mode)
	gr.material = gm
	grade_layer.add_child(gr)
	var hud_layer := CanvasLayer.new()
	hud_layer.layer = 3
	add_child(hud_layer)
	hud = Hud.new()
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
			elif state == "inter":
				if ke.keycode == KEY_ENTER or ke.keycode == KEY_SPACE:
					inter_next()
			elif ke.keycode == KEY_SPACE:
				do_bark()
			elif ke.keycode == KEY_F:
				toggle_fullscreen()
			elif ke.keycode == KEY_T:
				test_boost()
			elif ke.keycode == KEY_E:
				end_wave_now()

func style_rect() -> Rect2:
	return Rect2(vp().x - 92.0, 44.0, 38.0, 34.0)

func toggle_style() -> void:
	if not OS.has_feature("web"):
		return
	var order: Array = ["flat", "painted", "ref"]
	var to_style: String = String(order[(order.find(style_name) + 1) % order.size()])
	var to_look: int = 6 if to_style == "flat" else 0
	JavaScriptBridge.eval("(function(){var u=new URL(window.location.href);u.searchParams.set('style','%s');u.searchParams.set('look','%d');window.location.href=u.toString();})()" % [to_style, to_look])

func test_rect() -> Rect2:
	return Rect2(vp().x - 100.0, 44.0, 46.0, 34.0)

func test_boost() -> void:
	if state == "farm":
		for k in Meta.CROP_ORDER:
			Meta.crops[k] = int(Meta.crops.get(k, 0)) + 20
		Meta.save()
		return
	gold += 1000
	gain_xp(xp_need() / xp_mult())
	add_popup("+1000 gold  +1 level", dog.position + Vector2(0, -40), Color(1.0, 0.9, 0.5))

func endwave_rect() -> Rect2:
	return Rect2(vp().x - 176.0, 44.0, 70.0, 34.0)

func end_wave_now() -> void:
	if state != "play":
		return
	if phase == "gather":
		wave_t = WAVE_LEN
	else:
		events.clear()
		for f in foxes.duplicate():
			defeat(f)

func fs_rect() -> Rect2:
	return Rect2(vp().x - 46.0, 44.0, 38.0, 34.0)

func toggle_fullscreen() -> void:
	var w: Window = get_window()
	w.mode = Window.MODE_WINDOWED if w.mode == Window.MODE_FULLSCREEN or w.mode == Window.MODE_EXCLUSIVE_FULLSCREEN else Window.MODE_FULLSCREEN

func build_on(i: int, kind: String) -> void:
	var p: Pad = world.pads[i]
	if p.kind != "":
		return
	p.kind = kind
	p.lv = 1
	var def: Dictionary = DEFS[kind]
	var t: Texture2D = world.tex(String(def["tex"]))
	var sprt := Sprite2D.new()
	sprt.texture = t
	sprt.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	sprt.offset = Vector2(0, -t.get_height() * 0.5 + 3.0)
	sprt.position = p.position + Vector2(0, 8.0)
	ysort.add_child(sprt)
	p.sprite = sprt
	pad_scale(p)
	ring(p.position, 46.0, Color(1.0, 0.85, 0.4), 0.5, 4.0)

func pad_scale(p: Pad) -> void:
	var base: float = float(DEFS[p.kind]["sc"]) * (1.4 if world.flat else (1.0 if (not world.refst or p.kind == "archer") else 1.5))
	p.sprite.scale = Vector2.ONE * base * (1.0 + 0.1 * float(p.lv - 1))

func upgrade_pad(i: int) -> void:
	var p: Pad = world.pads[i]
	if p.kind == "" or p.lv >= 4:
		return
	p.lv += 1
	pad_scale(p)
	ring(p.position, 46.0, Color(1.0, 0.85, 0.4), 0.5, 4.0)

func _press(p: Vector2, id: int) -> void:
	if state == "play" and endwave_rect().grow(6.0).has_point(p):
		end_wave_now()
		return
	if state != "result" and test_rect().grow(6.0).has_point(p):
		test_boost()
		return
	if state != "result" and state != "farm" and fs_rect().grow(6.0).has_point(p):
		toggle_fullscreen()
		return
	if state == "farm":
		farm_press(p)
		return
	if state == "result":
		Meta.pending = -1
		get_tree().reload_current_scene()
		return
	if state == "levelup":
		for i in perk_offers.size():
			if lv_card_rect(i).has_point(p):
				pick_levelup(i)
				return
		return
	if state == "inter":
		inter_press(p)
		return
	if p.distance_to(btn_pos(0)) < BTN_R + 14.0:
		do_bark()
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

func move_input() -> Vector2:
	if autowalk:
		return Vector2.from_angle(clock * 0.9) * 0.8
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

# ---------------------------------------------------------------- stats from perks
func sp() -> float:
	return 1.0 + 0.25 * float(pl("power"))
func cdm() -> float:
	var goats: int = int(pen_counts.get("goat", 0))
	return pow(0.88, float(pl("haste"))) * (1.0 - minf(0.3, 0.03 * float(goats)))
func am() -> float:
	return 1.0 + 0.15 * float(pl("wide"))
func bark_r() -> float:
	return 250.0 * (1.0 + 0.2 * float(pl("bark")))
func bark_cd() -> float:
	var ducks: int = int(pen_counts.get("duck", 0))
	return 2.4 * pow(0.88, float(pl("bark"))) * (1.0 - minf(0.3, 0.03 * float(ducks)))
func speed_mult() -> float:
	return 1.0 + 0.08 * float(pl("boots"))
func gold_mult() -> float:
	var pigs: int = int(pen_counts.get("pig", 0))
	return 1.0 + 0.25 * float(market_lv) + 0.04 * float(pigs)
func xp_mult() -> float:
	return 1.0 + 0.15 * float(pl("study"))
func fence_regen() -> float:
	var sheepish: int = int(pen_counts.get("normal", 0)) + int(pen_counts.get("lamb", 0)) + int(pen_counts.get("black", 0))
	return 0.12 * float(sheepish) + 0.7 * float(moss_lv)
func max_hp() -> float:
	return 100.0 + 25.0 * float(pl("vigor"))
func regen_rate() -> float:
	return 4.0 + 2.5 * float(pl("regen"))
func ward_k() -> float:
	return 1.0 - 0.08 * float(pl("ward"))
func magnet_r() -> float:
	return 70.0 + 35.0 * float(pl("magnet"))

# ---------------------------------------------------------------- waves
func start_wave(n: int) -> void:
	wave = n
	phase = "gather"
	wave_t = 0.0
	events.clear()
	banner = "WAVE %d: GATHER THE ANIMALS" % n
	if n == 1:
		banner = "BARK CALLS THE ANIMALS TO THE PEN"
	banner_t = 3.5
	var pd0: Dictionary = Meta.PLOTS[plot]
	var eff0: int = n + int(pd0["bonus"])
	var ex0: String = String(pd0["extra"])
	for i in 5 + 2 * eff0 + (2 + int(pd0["bonus"]) / 2 if ex0 == "fox" else 0):
		events.append({"t": randf_range(1.0, 54.0), "k": "fox"})
	for i in ((1 + eff0 / 2) if eff0 >= 2 else 0) + (2 + int(pd0["bonus"]) / 2 if ex0 == "imp" else 0):
		events.append({"t": randf_range(3.0, 52.0), "k": "imp"})
	events.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return float(a["t"]) < float(b["t"]))
	if n > 1:
		var loose: int = 0
		for s in sheep:
			if not (s as Sheep).in_pen:
				loose += 1
		for i in maxi(0, mini(12, 30 - loose)):
			spawn_stray(false)

func start_defend() -> void:
	phase = "defend"
	wave_t = 0.0
	events.clear()
	# no more gathering: everything still loose wanders off
	for s in sheep.duplicate():
		var sh: Sheep = s
		if not sh.in_pen:
			ring(sh.position, 24.0, Color(1, 1, 1), 0.3, 3.0)
			sheep.erase(sh)
			sh.queue_free()
	# the gathering raiders (foxes) go home; imps keep coming
	for f in foxes.duplicate():
		var fo: Fox = f
		if fo.kind == "fox":
			drop_carry(fo)
			foxes.erase(fo)
			fo.queue_free()
	var pd: Dictionary = Meta.PLOTS[plot]
	var bonus: int = int(pd["bonus"])
	var eff: int = wave + bonus
	for i in (1 + eff / 2) if eff >= 2 else 0:
		events.append({"t": randf_range(2.0, 40.0), "k": "imp"})
	var wolf_n: int = 2 + eff + 1 + bonus / 2
	for i in wolf_n:
		events.append({"t": randf_range(2.0, 40.0), "k": "wolf"})
	if wave == LAST_WAVE:
		for i in 1 + bonus / 3:
			events.append({"t": 12.0 + 16.0 * float(i), "k": "bear"})
	elif wave == 3 and bonus >= 3:
		events.append({"t": 20.0, "k": "bear"})
	events.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return float(a["t"]) < float(b["t"]))
	banner = "DEFEND THE PEN!" if wave < LAST_WAVE else "LAST DEFENCE!"
	banner_t = 3.0
	dog.hp = dog.hp_max

func run_events() -> void:
	while events.size() > 0 and float(events[0]["t"]) <= wave_t:
		var e: Dictionary = events.pop_front()
		spawn_enemy(String(e["k"]))

func clamp_pt(p: Vector2) -> Vector2:
	return Vector2(clampf(p.x, XMIN, XMAX), clampf(p.y, YMIN, YMAX))

func edge_point(near_loose: bool) -> Vector2:
	var pool: Array = world.gaps if randf() < 0.5 else world.inner_pts
	if pool.is_empty():
		pool = world.gaps
	var best: Vector2 = pool[randi() % pool.size()]
	if near_loose:
		var loose: Array = sheep.filter(func(q: Sheep) -> bool: return not q.carried and not q.in_pen)
		if loose.size() > 0:
			var t: Vector2 = (loose[randi() % loose.size()] as Sheep).position
			var bd: float = best.distance_to(t)
			for i in 5:
				var c: Vector2 = pool[randi() % pool.size()]
				if c.distance_to(t) < bd:
					bd = c.distance_to(t)
					best = c
	return clamp_pt(best + Vector2(randf_range(-30.0, 30.0), randf_range(-30.0, 30.0)))

func spawn_enemy(k: String) -> void:
	var f := Fox.new()
	ysort.add_child(f)
	var fr: SpriteFrames = fox_frames
	if k == "wolf":
		fr = wolf_frames
	elif k == "bear":
		fr = bear_frames
	elif k == "imp":
		fr = imp_frames
	f.setup(k, fr, shadow_tex, 1.0 + 0.15 * float(wave - 1))
	f.position = edge_point(k == "fox")
	foxes.append(f)
	if k == "bear":
		banner = "A BEAR COMES FOR THE WALLS!"
		banner_t = 2.8
		Input.vibrate_handheld(60)

func spawn_stray(initial: bool) -> void:
	var t: String = STRAY_POOL[randi() % STRAY_POOL.size()]
	var s := Sheep.new()
	ysort.add_child(s)
	s.setup(t, TYPES[t], animal_frames[String((TYPES[t] as Dictionary)["set"])], shadow_tex)
	s.seen = true
	var p := Vector2.ZERO
	if initial:
		p = world.random_open_point(14.0)
	else:
		p = edge_point(false)
	s.position = p
	sheep.append(s)

# ---------------------------------------------------------------- the loop
func update_camera(delta: float) -> void:
	if not cam_init:
		cam_pos = dog.position
		cam_init = true
	cam_look = cam_look.lerp(dog.vel * 0.16, 1.0 - exp(-2.5 * delta))
	cam_pos = cam_pos.lerp(dog.position, 1.0 - exp(-5.0 * delta))
	shake = maxf(0.0, shake - delta * 2.5)
	var sh: Vector2 = Vector2(sin(clock * 63.0), cos(clock * 71.0)) * shake * shake * 3.0
	cam.position = cam_pos + cam_look + sh
	if overview:
		cam.position = Vector2(WX / 2.0, WY / 2.0)

func _physics_process(delta: float) -> void:
	update_camera(delta)
	if lineup:
		events.clear()
		stray_t = 99.0
	if smoke and OS.get_cmdline_user_args().has("herdtest"):
		smoke_n += 1
		events.clear()
		stray_t = 99.0
		wave_t = 0.0
		if state == "levelup":
			pick_levelup(0)
		if state == "inter":
			inter_auto()
		if smoke_n % 150 == 0:
			var far: Sheep = null
			var fd: float = -1.0
			for s in sheep:
				var sh: Sheep = s
				if not sh.in_pen and sh.position.distance_to(world.pen.get_center()) > fd:
					fd = sh.position.distance_to(world.pen.get_center())
					far = sh
			if far != null:
				var toward: Vector2 = (world.pen.get_center() - far.position).normalized()
				dog.position = far.position + toward * 110.0
				dog.bark_cd = 0.0
				do_bark()
		if smoke_n % 600 == 0:
			var loose: Array = []
			for s in sheep:
				if not (s as Sheep).in_pen:
					loose.append((s as Sheep).type)
			var dsum: float = 0.0
			for s in sheep:
				dsum += (s as Sheep).position.distance_to(world.pen.get_center())
			print("herdtest t=", smoke_n, " herded=", herded, " avgdist=", int(dsum / float(maxi(sheep.size(), 1))), " loose=", loose.size(), " dogpos=", dog.position, " pen=", world.pen)
			if smoke_n == 4800:
				for s in sheep:
					var q: Sheep = s
					print("  ", q.type, " ", q.position, " goal=", pen_goal(q.position), " home=", q.home_t, " vel=", q.vel)
	elif smoke:
		smoke_n += 1
		if state == "levelup":
			pick_levelup(0)
		if state == "inter":
			inter_auto()
		elif smoke_n % 90 == 0 and state == "play":
			gain_xp(40.0)
		if smoke_n == 300:
			damage_dog(30.0, dog.position + Vector2(10.0, 0.0))
			print("after hit hp=", dog.hp)
		if smoke_n == 900:
			dog.invuln = 0.0
			damage_dog(500.0, dog.position + Vector2(10.0, 0.0))
			print("ko=", dog.ko_t)
		if smoke_n == 1200:
			print("respawn hp=", dog.hp, " ko=", dog.ko_t, " pos=", dog.position)
		if smoke_n == 200 or smoke_n == 1500:
			spawn_enemy("imp")
			foxes[foxes.size() - 1].position = dog.position + Vector2(160.0, 0.0)
		if smoke_n % 600 == 0:
			print("smoke hp=", dog.hp, " ko=", dog.ko_t, " t=", smoke_n, " state=", state, " wave=", wave, " foxes=", foxes.size(), " sheep=", sheep.size(), " xp=", int(xp), " gold=", gold, " walls=", world.walls.size(), " perks=", perk_lv)
	if state != "play":
		return
	var dt: float = minf(delta, 0.05)
	perf_check(delta)
	clock += dt
	wave_t += dt
	if smoke:
		wave_t += dt * 6.0
	alarm = maxf(0.0, alarm - dt)
	banner_t = maxf(0.0, banner_t - dt)
	count_pen()
	update_dog(dt)
	if pup != null:
		pup.follow(dog.position - dog.heading * 38.0 + dog.heading.orthogonal() * 18.0, dt)
	update_sheep(dt)
	update_enemies(dt)
	update_weapons(dt)
	update_pen_bonus(dt)
	update_coins(dt)
	run_events()
	stray_t -= dt
	if stray_t <= 0.0 and phase == "gather":
		stray_t = maxf(1.2, 2.6 - float(wave) * 0.12)
		var loose: int = 0
		for s in sheep:
			if not (s as Sheep).in_pen:
				loose += 1
		if loose < 34:
			spawn_stray(false)
	for pu in popups:
		pu["t"] = float(pu["t"]) - dt
	popups = popups.filter(func(q: Dictionary) -> bool: return float(q["t"]) > 0.0)
	if phase == "gather":
		if wave_t >= WAVE_LEN:
			begin_intermission()
	elif events.is_empty() and (foxes.is_empty() and wave_t > 3.0 or wave_t > 150.0):
		if wave >= LAST_WAVE:
			finish_day("won")
		else:
			start_wave(wave + 1)

func count_pen() -> void:
	pen_counts.clear()
	pen_total = 0
	for s in sheep:
		var sh: Sheep = s
		if sh.in_pen:
			pen_total += 1
			pen_counts[sh.type] = int(pen_counts.get(sh.type, 0)) + 1

func update_grass_actors() -> void:
	var acts := PackedVector2Array()
	for i in 8:
		acts.append(Vector2(-9999.0, -9999.0))
	var n: int = 0
	acts[n] = dog.position
	n += 1
	if pup != null:
		acts[n] = pup.position
		n += 1
	var near: Array = []
	for s in sheep:
		var sp: Vector2 = (s as Sheep).position
		var d: float = sp.distance_to(dog.position)
		if d < 520.0:
			near.append([d, sp])
	for f in foxes:
		var fp: Vector2 = (f as Fox).position
		var d2: float = fp.distance_to(dog.position)
		if d2 < 520.0:
			near.append([d2, fp])
	near.sort_custom(func(a: Array, b: Array) -> bool: return float(a[0]) < float(b[0]))
	for e in near:
		if n >= 8:
			break
		acts[n] = e[1]
		n += 1
	world.wind_mat.set_shader_parameter("actors", acts)
	if world.grass_mat != null:
		world.grass_mat.set_shader_parameter("actors", acts)
		world.update_trail(acts)

func _process(delta: float) -> void:
	update_grass_actors()
	dog.animate(delta)
	if pup != null:
		pup.animate(delta)
	(dog.get_node("Spark") as CPUParticles2D).emitting = dog.vel.length() > 40.0
	for s in sheep:
		(s as Sheep).animate(delta)
	for f in foxes:
		(f as Fox).animate(delta)
	var target_zoom: float = BASE_ZOOM if dbg_zoom <= 0.0 else dbg_zoom
	if overview:
		target_zoom = 0.27
	var z: float = lerpf(cam.zoom.x, target_zoom, minf(1.0, delta * 3.0))
	cam.zoom = Vector2(z, z)
	cloud_mat.set_shader_parameter("cam", cam.get_screen_center_position())
	cloud_mat.set_shader_parameter("view_size", vp() / cam.zoom.x)
	hud.queue_redraw()

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

func collide(e: Mover, r: float, bounce: float) -> void:
	for w in world.walls:
		if w["broken"]:
			continue
		seg_push(e, r, w["a"], w["b"], bounce)
	for k in world.rocks_near(e.position):
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

# ---------------------------------------------------------------- the dog
func damage_dog(amount: float, from: Vector2) -> void:
	if dog.invuln > 0.0 or dog.ko_t > 0.0:
		return
	amount *= ward_k()
	dog.hp -= amount
	dog.hurt_t = 0.3
	dog.regen_t = 4.0
	dog.invuln = 0.35
	dog.stun = maxf(dog.stun, 0.2)
	dog.vel += (dog.position - from).normalized() * 260.0
	shake = 1.0
	add_popup("-%d" % int(amount), dog.position + Vector2(0, -34), Color(1.0, 0.4, 0.4))
	if dog.hp <= 0.0:
		dog.hp = 0.0
		dog.ko_t = 3.0
		dog.vel = Vector2.ZERO
		add_popup("KNOCKED OUT!", dog.position + Vector2(0, -44), Color(1.0, 0.5, 0.4))
		ring(dog.position, 60.0, Color(1.0, 0.4, 0.35), 0.5, 5.0)

func update_dog(dt: float) -> void:
	dog.invuln = maxf(0.0, dog.invuln - dt)
	dog.hurt_t = maxf(0.0, dog.hurt_t - dt)
	dog.regen_t = maxf(0.0, dog.regen_t - dt)
	dog.hp_max = max_hp()
	if dog.regen_t <= 0.0 and dog.hp < dog.hp_max:
		dog.hp = minf(dog.hp_max, dog.hp + regen_rate() * dt)
	if dog.ko_t > 0.0:
		dog.ko_t -= dt
		dog.vel = Vector2.ZERO
		if dog.ko_t <= 0.0:
			dog.position = world.dog_start
			dog.hp = dog.hp_max
			dog.invuln = 1.5
			ring(dog.position, 70.0, Color(0.7, 0.85, 1.0), 0.6, 4.0)
		return
	var inp: Vector2 = move_input()
	var mag: float = minf(1.0, inp.length())
	var dir: Vector2 = inp.normalized() if mag > 0.02 else Vector2.ZERO
	dog.stun = maxf(0.0, dog.stun - dt)
	dog.bark_cd = maxf(0.0, dog.bark_cd - dt)
	dog.walk = false
	dog.crouch = false
	var speedk: float = 0.0 if mag < 0.12 else (0.55 + 0.45 * minf(1.0, (mag - 0.12) / 0.6))
	var sp: float = 235.0 * speed_mult() * speedk * (0.3 if dog.stun > 0.0 else 1.0)
	if world.zone_kind(dog.position) == "water":
		sp *= 0.5
	dog.vel += (dir * sp - dog.vel) * minf(1.0, dt * 9.0)
	dog.position += dog.vel * dt
	collide(dog, 6.0, 0.0)
	bump_sheep()
	var v: float = dog.vel.length()
	if v > 20.0:
		dog.heading = dog.vel / v

func seg_dist(p: Vector2, a: Vector2, b: Vector2) -> float:
	var ab: Vector2 = b - a
	var t: float = clampf((p - a).dot(ab) / maxf(ab.length_squared(), 0.001), 0.0, 1.0)
	return p.distance_to(a + ab * t)

func set_wall_hp(w: Dictionary, v: float) -> void:
	w["hp"] = clampf(v, 0.0, float(w["max"]))
	var frac: float = float(w["hp"]) / float(w["max"])
	var c: float = 0.5 + 0.5 * frac
	for n in (w["nodes"] as Array):
		(n as Sprite2D).modulate = Color(1.0, c, c)

func bump_sheep() -> void:
	for s in sheep:
		var sh: Sheep = s
		if sh.carried:
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

func ring(pos: Vector2, r: float, col: Color, dur: float, w: float) -> void:
	var rg := RingFx.new()
	rg.position = pos
	rg.maxr = r
	rg.col = col
	rg.dur = dur
	rg.width = w
	add_child(rg)

func do_bark() -> void:
	if state != "play" or dog.bark_cd > 0.0 or dog.stun > 0.0:
		return
	dog.bark_cd = bark_cd()
	dog.cast_t = 0.4
	dog.squash = 1.0
	shake = 1.0
	var R: float = bark_r()
	ring(dog.position, R, Color(1.0, 0.95, 0.75), 0.55, 6.0)
	for s in sheep:
		var sh: Sheep = s
		if sh.carried or sh.in_pen:
			continue
		var dd: Vector2 = sh.position - dog.position
		var dist: float = dd.length()
		if dist < R and dist > 0.1:
			var f: float = maxf(0.45, 1.0 - dist / R)
			var gd: Vector2 = (pen_goal(sh.position) - sh.position).normalized()
			var dir: Vector2 = (dd / dist * 0.3 + gd * 0.7).normalized()
			sh.vel += dir * 170.0 * f * sh.bark_mul
			sh.panic = maxf(sh.panic, 0.45)
			sh.home_t = 5.0 if sh.heavy else 4.0
			sh.squash = 1.0
	for f in foxes.duplicate():
		var fx: Fox = f
		if fx.fleeing:
			continue
		if fx.position.distance_to(dog.position) < R * 0.68:
			hurt(fx, 2.0 * sp(), dog.position, 260.0, 1.0)

func add_popup(text: String, pos: Vector2, col: Color) -> void:
	popups.append({"s": text, "pos": pos, "t": 1.0, "col": col})

# ---------------------------------------------------------------- auto weapons
func nearest_enemy(p: Vector2, maxd: float) -> Fox:
	var best: Fox = null
	var bd: float = maxd
	for f in foxes:
		var fx: Fox = f
		if fx.fleeing:
			continue
		var d: float = fx.position.distance_to(p)
		if d < bd:
			bd = d
			best = fx
	return best

func random_enemy(p: Vector2, maxd: float) -> Fox:
	var pool: Array = []
	for f in foxes:
		var fx: Fox = f
		if not fx.fleeing and fx.position.distance_to(p) < maxd:
			pool.append(fx)
	if pool.is_empty():
		return null
	return pool[randi() % pool.size()]

func launch(kind: String, tgt: Fox, dmg: float, area: float) -> void:
	var o := Orb.new()
	o.kind = kind
	o.tgt = tgt
	o.dmg = dmg
	o.area = area
	o.speed = 400.0 if kind == "bolt" else 300.0
	o.position = dog.position + Vector2(0, -4)
	o.z_index = 30
	dog.cast_t = 0.35
	add_child(o)
	orbs.append(o)

func zig(a: Vector2, b: Vector2) -> PackedVector2Array:
	var pts := PackedVector2Array()
	pts.append(a)
	var d: Vector2 = b - a
	var n: Vector2 = Vector2(-d.y, d.x).normalized()
	for i in range(1, 5):
		pts.append(a + d * (float(i) / 5.0) + n * randf_range(-9.0, 9.0))
	pts.append(b)
	return pts

func streak(pts: PackedVector2Array, col: Color, dur: float, w: float) -> void:
	var l := LineFx.new()
	l.pts = pts
	l.col = col
	l.dur = dur
	l.width = w
	l.z_index = 30
	add_child(l)

func impact(o: Orb) -> void:
	if o.kind == "fire":
		ring(o.position, o.area, Color(1.0, 0.6, 0.2), 0.4, 6.0)
		for f in foxes.duplicate():
			var fx: Fox = f
			if not fx.fleeing and fx.position.distance_to(o.position) < o.area + fx.r:
				hurt(fx, o.dmg, o.position, 200.0, 0.25)
	else:
		ring(o.position, 14.0, Color(0.8, 0.6, 1.0), 0.25, 3.0)
		if is_instance_valid(o.tgt) and not o.tgt.fleeing:
			hurt(o.tgt, o.dmg, o.position, 110.0, 0.1)
	orbs.erase(o)
	o.queue_free()

func update_weapons(dt: float) -> void:
	for f in foxes:
		var fz: Fox = f
		fz.hit_cd = maxf(0.0, fz.hit_cd - dt)
		fz.slow = maxf(0.0, fz.slow - dt)
	if dog.ko_t > 0.0:
		update_defenses(dt)
		return
	var cm: float = cdm()
	var pw: float = sp()
	var wd: float = am()
	# magic bolt
	bolt_t -= dt
	var lb: int = pl("bolt")
	if lb > 0 and bolt_t <= 0.0:
		var tg: Fox = nearest_enemy(dog.position, 320.0)
		if tg != null:
			bolt_t = 0.75 * pow(0.9, float(lb - 1)) * cm
			var n: int = 1 + (1 if lb >= 3 else 0) + (1 if lb >= 5 else 0)
			for i in n:
				var t2: Fox = tg if i == 0 else random_enemy(dog.position, 320.0)
				launch("bolt", t2 if t2 != null else tg, (3.0 + 0.5 * float(lb)) * pw, 0.0)
		else:
			bolt_t = 0.15
	# fireball
	fire_t -= dt
	var lf: int = pl("fire")
	if lf > 0 and fire_t <= 0.0:
		var tf: Fox = nearest_enemy(dog.position, 340.0)
		if tf != null:
			fire_t = 2.6 * pow(0.9, float(lf - 1)) * cm
			launch("fire", tf, (4.0 + 2.0 * float(lf)) * pw, (46.0 + 6.0 * float(lf)) * wd)
		else:
			fire_t = 0.2
	# frost nova
	nova_t -= dt
	var ln: int = pl("nova")
	if ln > 0 and nova_t <= 0.0:
		var R: float = (95.0 + 12.0 * float(ln)) * wd
		var any: bool = false
		for f in foxes:
			var fa: Fox = f
			if not fa.fleeing and fa.position.distance_to(dog.position) < R * 0.8:
				any = true
		if any:
			nova_t = 4.5 * pow(0.92, float(ln - 1)) * cm
			dog.cast_t = 0.4
			ring(dog.position, R, Color(0.55, 0.85, 1.0), 0.55, 7.0)
			for f in foxes.duplicate():
				var fb: Fox = f
				if not fb.fleeing and fb.position.distance_to(dog.position) < R + fb.r:
					fb.slow = 3.0
					hurt(fb, (2.0 + float(ln)) * pw, dog.position, 150.0, 0.5)
		else:
			nova_t = 0.2
	# chain lightning
	zap_t -= dt
	var lz: int = pl("zap")
	if lz > 0 and zap_t <= 0.0:
		var tz: Fox = nearest_enemy(dog.position, 330.0)
		if tz != null:
			zap_t = 2.4 * pow(0.9, float(lz - 1)) * cm
			dog.cast_t = 0.4
			var hit: Array = [tz]
			var cur: Fox = tz
			var from: Vector2 = dog.position + Vector2(0, -12.0)
			for k in 2 + lz:
				streak(zig(from, cur.position + Vector2(0, -8.0)), Color(0.7, 0.85, 1.0), 0.22, 3.0)
				hurt(cur, (3.0 + float(lz)) * pw, from, 100.0, 0.15)
				from = cur.position + Vector2(0, -8.0)
				var nxt: Fox = null
				var bd: float = 130.0 * wd
				for f in foxes:
					var fc: Fox = f
					if fc.fleeing or hit.has(fc):
						continue
					var dd: float = fc.position.distance_to(cur.position)
					if dd < bd:
						bd = dd
						nxt = fc
				if nxt == null:
					break
				hit.append(nxt)
				cur = nxt
		else:
			zap_t = 0.2
	# arcane orbit
	var lo: int = pl("orbit")
	var want: int = (lo + 1) if lo > 0 else 0
	while orbit_nodes.size() < want:
		var on := Orb.new()
		on.kind = "bolt"
		on.z_index = 30
		add_child(on)
		orbit_nodes.append(on)
	orbit_ang += 3.4 * dt
	for i in orbit_nodes.size():
		var ob: Orb = orbit_nodes[i]
		var rr: float = (40.0 + 4.0 * float(lo)) * wd
		ob.position = dog.position + Vector2.from_angle(orbit_ang + TAU * float(i) / float(maxi(1, orbit_nodes.size()))) * rr
		for f in foxes:
			var fo: Fox = f
			if fo.fleeing or fo.hit_cd > 0.0:
				continue
			if fo.position.distance_to(ob.position) < 13.0 + fo.r:
				fo.hit_cd = 0.5
				hurt(fo, (2.0 + 0.5 * float(lo)) * pw, ob.position, 130.0, 0.0)
	# spell projectiles
	for o in orbs.duplicate():
		var pr: Orb = o
		pr.life -= dt
		if pr.life <= 0.0:
			orbs.erase(pr)
			pr.queue_free()
			continue
		if pr.tgt == null or not is_instance_valid(pr.tgt) or pr.tgt.fleeing:
			pr.tgt = nearest_enemy(pr.position, 260.0)
			if pr.tgt == null:
				orbs.erase(pr)
				pr.queue_free()
				continue
		var dv: Vector2 = pr.tgt.position - pr.position
		var dl: float = maxf(dv.length(), 0.001)
		var step: float = pr.speed * dt
		if dl <= step + pr.tgt.r + 3.0:
			impact(pr)
		else:
			pr.position += dv / dl * step
	update_defenses(dt)

func update_defenses(dt: float) -> void:
	for pp in world.pads:
		var p: Pad = pp
		if p.kind == "":
			continue
		p.cd -= dt
		var origin: Vector2 = p.position + Vector2(0, -26.0)
		if p.kind == "archer":
			if p.cd <= 0.0:
				var tg: Fox = nearest_enemy(p.position, 250.0 + 14.0 * float(p.lv))
				if tg != null:
					p.cd = 1.1 * pow(0.88, float(p.lv - 1))
					streak(PackedVector2Array([origin, tg.position + Vector2(0, -8.0)]), Color(1.0, 0.9, 0.55), 0.14, 2.0)
					hurt(tg, 2.0 + float(p.lv), p.position, 60.0, 0.0)
				else:
					p.cd = 0.15
		elif p.kind == "brazier":
			if p.cd <= 0.0:
				var R: float = 82.0 + 8.0 * float(p.lv)
				var any: bool = false
				for f in foxes:
					var fx: Fox = f
					if not fx.fleeing and fx.position.distance_to(p.position) < R + fx.r:
						any = true
				if any:
					p.cd = 1.5
					ring(p.position, R, Color(1.0, 0.55, 0.2), 0.45, 5.0)
					for f in foxes.duplicate():
						var fy: Fox = f
						if not fy.fleeing and fy.position.distance_to(p.position) < R + fy.r:
							hurt(fy, 1.0 + float(p.lv), p.position, 120.0, 0.0)
				else:
					p.cd = 0.2
		else:
			var R2: float = 120.0 + 10.0 * float(p.lv)
			var any2: bool = false
			for f in foxes:
				var fz: Fox = f
				if not fz.fleeing and fz.position.distance_to(p.position) < R2:
					fz.slow = 0.35
					any2 = true
			if any2 and p.cd <= 0.0:
				p.cd = 2.0
				ring(p.position, R2, Color(0.6, 0.88, 1.0), 0.6, 3.0)



func hurt(f: Fox, dmg: float, from: Vector2, power: float, stun: float) -> void:
	if f.fleeing:
		return
	f.hp -= dmg
	f.flash = 0.22
	add_popup(str(int(dmg)), f.position + Vector2(randf_range(-8, 8), -22), Color(1.0, 0.95, 0.6))
	ring(f.position, 22.0, Color(1.0, 1.0, 0.9), 0.25, 3.0)
	var resist: float = 0.25 if f.kind == "bear" else (0.6 if f.kind == "wolf" else 1.0)
	f.kb += (f.position - from).normalized() * power * resist
	f.stun = maxf(f.stun, stun * resist)
	if f.carry != null:
		drop_carry(f)
	if f.hp <= 0.0:
		defeat(f)

func bite(f: Fox, s: Sheep, dmg: float) -> void:
	s.hp -= dmg
	s.panic = 1.0
	s.squash = 1.0
	s.home_t = 0.0
	s.vel += ((s.position - f.position).normalized() + (s.position - world.pen.get_center()).normalized()).normalized() * 80.0
	add_popup("-%d" % int(dmg), s.position + Vector2(randf_range(-6, 6), -20), Color(1.0, 0.45, 0.4))
	ring(s.position, 14.0, Color(1.0, 0.4, 0.35), 0.2, 2.0)
	if s.hp <= 0.0:
		f.tgt = null
		kill_sheep(s)

func defeat(f: Fox) -> void:
	f.fleeing = true
	defeated += 1
	drop_carry(f)
	foxes.erase(f)
	f.vel = Vector2.ZERO
	add_popup("POOF!", f.position + Vector2(0, -22), Color(1.0, 0.85, 0.4))
	ring(f.position, 40.0, Color(1.0, 1.0, 1.0), 0.4, 4.0)
	var puff := CPUParticles2D.new()
	puff.position = f.position
	puff.one_shot = true
	puff.emitting = true
	puff.amount = 14
	puff.lifetime = 0.6
	puff.explosiveness = 1.0
	puff.direction = Vector2(0, -1)
	puff.spread = 180.0
	puff.initial_velocity_min = 30.0
	puff.initial_velocity_max = 90.0
	puff.gravity = Vector2.ZERO
	puff.scale_amount_min = 2.0
	puff.scale_amount_max = 4.5
	puff.color = Color(1.0, 0.95, 0.85, 0.9)
	puff.z_index = 25
	add_child(puff)
	get_tree().create_timer(1.0).timeout.connect(puff.queue_free)
	f.spr.self_modulate = Color(3, 3, 3, 1)
	var tw: Tween = f.create_tween()
	tw.set_parallel(true)
	tw.tween_property(f, "modulate:a", 0.0, 0.4)
	tw.tween_property(f.spr, "scale", f.spr.scale * 1.3, 0.4)
	tw.chain().tween_callback(f.queue_free)
	var nb: int = 1
	var val: int = 6
	if f.kind == "wolf":
		nb = 2
		val = 9
	elif f.kind == "bear":
		nb = 5
		val = 16
	for i in nb:
		var b := Coin.new()
		b.kind = "gem"
		b.value = val
		b.position = f.position + Vector2(randf_range(-18, 18), randf_range(-12, 12))
		ysort.add_child(b)
		coins.append(b)

func drop_carry(f: Fox) -> void:
	var s: Sheep = f.carry
	if s == null:
		return
	s.carried = false
	s.panic = 1.0
	s.vel = Vector2(randf_range(-60, 60), randf_range(-60, 60))
	f.carry = null
	add_popup("SAVED!", s.position + Vector2(0, -14), Color(0.6, 1.0, 0.6))

func update_coins(dt: float) -> void:
	for b in coins.duplicate():
		var bn: Coin = b
		if bn.life <= 0.0:
			coins.erase(bn)
			bn.queue_free()
			continue
		var d: float = bn.position.distance_to(dog.position)
		if d < magnet_r():
			bn.fly = true
		if bn.fly:
			bn.position += (dog.position - bn.position).normalized() * 300.0 * dt
		if d < 12.0:
			gain_xp(float(bn.value))
			add_popup("+%d XP" % bn.value, bn.position + Vector2(0, -12), Color(0.6, 0.9, 1.0))
			coins.erase(bn)
			bn.queue_free()

# ---------------------------------------------------------------- animals in the pen give side bonuses
func update_pen_bonus(dt: float) -> void:
	for s in sheep:
		var hs: Sheep = s
		if hs.hp < hs.maxhp:
			hs.hp = minf(hs.maxhp, hs.hp + (1.5 if hs.in_pen else 0.2) * dt)
	var rg: float = fence_regen()
	if rg > 0.0:
		for w in world.walls:
			if w["pen"] and not w["broken"] and float(w["hp"]) < float(w["max"]):
				set_wall_hp(w, float(w["hp"]) + rg * dt / 3.0)
	var c: Vector2 = world.pen.get_center()
	if int(pen_counts.get("ram", 0)) > 0:
		thump_t -= dt
		if thump_t <= 0.0:
			thump_t = 6.0
			ring(c, 190.0, Color(0.9, 0.7, 0.45), 0.6, 4.0)
			for f in foxes.duplicate():
				var fx: Fox = f
				if not fx.fleeing and fx.position.distance_to(c) < 190.0:
					hurt(fx, 1.0 + float(pen_counts["ram"]), c, 240.0, 0.4)
	if int(pen_counts.get("goose", 0)) > 0:
		honk_t -= dt
		if honk_t <= 0.0:
			honk_t = 8.0
			add_popup("HONK!", c + Vector2(0, -50), Color(1.0, 1.0, 0.8))
			ring(c, 230.0, Color(1.0, 1.0, 0.85), 0.5, 3.0)
			for f in foxes:
				var fx2: Fox = f
				if not fx2.fleeing and fx2.position.distance_to(c) < 230.0:
					fx2.stun = maxf(fx2.stun, 1.6)

# ---------------------------------------------------------------- xp and perks
func xp_need() -> float:
	return 40.0 + 25.0 * float(level - 1)

func gain_xp(amount: float) -> void:
	xp += amount * xp_mult()
	while xp >= xp_need():
		xp -= xp_need()
		level += 1
		pending_lv += 1
	if pending_lv > 0 and state == "play":
		begin_levelup()

func begin_levelup() -> void:
	state = "levelup"
	stick_on = false
	stick_vec = Vector2.ZERO
	roll_perk_offers(3)
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
	var pk: Dictionary = perk_offers[i]
	var id: String = String(pk["id"])
	perk_lv[id] = pl(id) + 1
	if id == "vigor":
		dog.hp_max = max_hp()
		dog.hp = minf(dog.hp_max, dog.hp + 25.0)
	ring(dog.position, 60.0, Color(0.7, 0.9, 1.0), 0.5, 4.0)
	add_popup(String(pk["name"]) + "!", dog.position + Vector2(0, -50), Color(0.8, 0.95, 1.0))
	pending_lv -= 1
	if pending_lv > 0:
		roll_perk_offers(3)
		if perk_offers.is_empty():
			pending_lv = 0
	if pending_lv <= 0:
		state = "play"

# ---------------------------------------------------------------- between waves
func perk_cost(id: String) -> int:
	return 25 + 20 * pl(id)

func reroll_cost() -> int:
	return 10 + 6 * reroll_n

func pick_new_perk() -> Dictionary:
	var pool: Array = []
	for p in PERKS:
		var already: bool = false
		for o in perk_offers:
			if String(o["id"]) == String(p["id"]):
				already = true
		if not already and pl(String(p["id"])) < int(p["max"]) and Meta.perk_ok(String(p["id"])):
			pool.append(p)
	if pool.is_empty():
		return {}
	return pool[randi() % pool.size()]

func roll_perk_offers(count: int = 3) -> void:
	perk_offers.clear()
	for i in count:
		var p: Dictionary = pick_new_perk()
		if p.is_empty():
			break
		perk_offers.append(p)

func do_reroll() -> bool:
	var c: int = reroll_cost()
	if xp < float(c):
		return false
	xp -= float(c)
	reroll_n += 1
	roll_perk_offers()
	return true

func buy_perk(i: int) -> bool:
	if i >= perk_offers.size():
		return false
	var pk: Dictionary = perk_offers[i]
	var id: String = String(pk["id"])
	var cost: int = perk_cost(id)
	if pl(id) >= int(pk["max"]) or float(cost) > xp:
		return false
	xp -= float(cost)
	perk_lv[id] = pl(id) + 1
	if id == "vigor":
		dog.hp_max = max_hp()
		dog.hp = minf(dog.hp_max, dog.hp + 25.0)
	# the bought card is replaced by a fresh choice so there are always four
	var fresh: Dictionary = {}
	if pl(id) >= int(pk["max"]):
		fresh = pick_new_perk()
	else:
		var tmp: Array = perk_offers.duplicate()
		perk_offers.remove_at(i)
		fresh = pick_new_perk()
		perk_offers = tmp
		if fresh.is_empty():
			fresh = pk
	if fresh.is_empty():
		perk_offers.remove_at(i)
	else:
		perk_offers[i] = fresh
	return true

# ---------------------------------------------------------------- the farm
func farm_cell() -> float:
	var v: Vector2 = vp()
	return minf((v.x - 24.0 - 316.0) / 3.0, (v.y - 90.0 - 76.0) / 3.0)

func farm_plot_rect(i: int) -> Rect2:
	var c: float = farm_cell()
	return Rect2(24.0 + float(i % 3) * c, 90.0 + float(i / 3) * c, c - 8.0, c - 8.0)

func farm_panel_rect() -> Rect2:
	var v: Vector2 = vp()
	return Rect2(v.x - 300.0, 90.0, 288.0, v.y - 166.0)

func farm_start_rect() -> Rect2:
	var pr: Rect2 = farm_panel_rect()
	return Rect2(pr.position.x + 19.0, pr.end.y - 64.0, 250.0, 50.0)

func farm_shop_rect() -> Rect2:
	return Rect2(24.0, vp().y - 60.0, 190.0, 46.0)

func farm_collect_rect() -> Rect2:
	return Rect2(224.0, vp().y - 60.0, 190.0, 46.0)

func shop_row_rect(i: int) -> Rect2:
	var w: float = (vp().x - 60.0) / 2.0
	var col: int = i / 8
	return Rect2(24.0 + float(col) * (w + 12.0), 84.0 + float(i % 8) * 47.0, w, 42.0)

func farm_press(p: Vector2) -> void:
	farm_msg = ""
	if farm_view == "shop":
		if farm_shop_rect().grow(6.0).has_point(p):
			farm_view = "map"
			return
		for i in Meta.UNLOCKS.size():
			if shop_row_rect(i).has_point(p):
				var u: Dictionary = Meta.UNLOCKS[i]
				if Meta.has(String(u["id"])):
					return
				if Meta.buy(u):
					farm_msg = "Unlocked " + String(u["name"]) + "!"
				else:
					farm_msg = "Not enough crops yet"
				return
		return
	if farm_shop_rect().grow(6.0).has_point(p):
		farm_view = "shop"
		return
	if farm_collect_rect().grow(6.0).has_point(p):
		var n: int = Meta.collect_all()
		farm_msg = ("Collected %d crops" % n) if n > 0 else "Nothing ripe yet"
		return
	if farm_sel >= 0 and Meta.plot_open(farm_sel) and farm_start_rect().grow(6.0).has_point(p):
		Meta.pending = farm_sel
		get_tree().reload_current_scene()
		return
	for i in Meta.PLOTS.size():
		if farm_plot_rect(i).has_point(p):
			farm_sel = i
			return

func castle_score() -> int:
	var s: int = walls_lv * 2 + moss_lv + market_lv + world.holes.size()
	for pp in world.pads:
		var p: Pad = pp
		if p.kind != "":
			s += p.lv
	return s

func tier_for_score(s: int) -> int:
	if s >= 18:
		return 3
	if s >= 10:
		return 2
	if s >= 4:
		return 1
	return 0

func check_tier() -> void:
	var t: int = mini(tier_for_score(castle_score()), Meta.tier_cap())
	if t == world.tier:
		return
	world.set_tier(t)
	for w in world.walls:
		set_wall_hp(w, float(w["hp"]))
	if t > 0:
		ring(world.pen.get_center(), 200.0, Color(1.0, 0.85, 0.4), 0.9, 6.0)
		add_popup("YOUR PEN IS NOW A " + String(world.TIER_NAMES[t]).to_upper() + "!", world.pen.get_center() + Vector2(0, -60), Color(1.0, 0.9, 0.5))

func rebuild_options() -> void:
	castle_opts.clear()
	var free: int = 0
	var upgradable: int = 0
	for pp in world.pads:
		var p: Pad = pp
		if p.kind == "":
			free += 1
		elif p.lv < 4:
			upgradable += 1
	if free > 0:
		for k in DEF_ORDER:
			if not Meta.tower_ok(String(k)):
				continue
			castle_opts.append({"id": "build_" + String(k), "name": String(DEFS[k]["name"]), "desc": "Tap an empty spot on the castle", "cost": int(DEFS[k]["cost"]), "mode": "place", "kind": String(k)})
	if upgradable > 0:
		castle_opts.append({"id": "upgrade", "name": "Upgrade a tower", "desc": "Tap one of your towers (its cost shows)", "cost": 0, "mode": "upgrade", "kind": ""})
	var closed: int = 0
	for side in ["north", "west", "east"]:
		if not bool(world.holes.get(side, false)):
			closed += 1
	if closed > 0 and Meta.castle_ok("gate"):
		castle_opts.append({"id": "gate", "name": "Open a gate", "desc": "Tap a wall to cut a gap so animals can walk in", "cost": 25, "mode": "gate", "kind": ""})
	castle_opts.append({"id": "mend", "name": "Mend the walls", "desc": "Repair every wall to full strength", "cost": 15, "mode": "now", "kind": ""})
	if walls_lv < 4 and Meta.castle_ok("walls_up"):
		castle_opts.append({"id": "walls_up", "name": "Stronger walls", "desc": "+30%% wall strength (level %d to %d)" % [walls_lv, walls_lv + 1], "cost": 40 + 30 * walls_lv, "mode": "now", "kind": ""})
	if moss_lv < 3 and Meta.castle_ok("moss"):
		castle_opts.append({"id": "moss", "name": "Healing moss", "desc": "Walls slowly mend themselves (level %d to %d)" % [moss_lv, moss_lv + 1], "cost": 35 + 25 * moss_lv, "mode": "now", "kind": ""})
	if market_lv < 3 and Meta.castle_ok("market"):
		castle_opts.append({"id": "market", "name": "Market stall", "desc": "Penned animals pay +25%% gold (level %d to %d)" % [market_lv, market_lv + 1], "cost": 50 + 40 * market_lv, "mode": "now", "kind": ""})
	if sel_item != "" and option_by_id(sel_item).is_empty():
		sel_item = ""

func option_by_id(id: String) -> Dictionary:
	for o in castle_opts:
		if String(o["id"]) == id:
			return o
	return {}

func apply_option(o: Dictionary, target: Variant) -> bool:
	var mode: String = String(o["mode"])
	var id: String = String(o["id"])
	var cost: int = int(o["cost"])
	if mode == "place":
		var i: int = int(target)
		if i < 0 or i >= world.pads.size() or (world.pads[i] as Pad).kind != "" or gold < cost:
			return false
		gold -= cost
		build_on(i, String(o["kind"]))
	elif mode == "upgrade":
		var i2: int = int(target)
		if i2 < 0 or i2 >= world.pads.size():
			return false
		var p: Pad = world.pads[i2]
		if p.kind == "" or p.lv >= 4:
			return false
		var c2: int = int(DEFS[p.kind]["cost"]) * p.lv
		if gold < c2:
			return false
		gold -= c2
		upgrade_pad(i2)
	elif mode == "gate":
		var side: String = String(target)
		if bool(world.holes.get(side, false)) or gold < cost:
			return false
		gold -= cost
		world.open_hole(side)
		for w in world.walls:
			set_wall_hp(w, float(w["hp"]))
	else:
		if gold < cost:
			return false
		gold -= cost
		if id == "mend":
			for w in world.walls:
				if w["pen"]:
					set_wall_hp(w, float(w["max"]))
		elif id == "walls_up":
			walls_lv += 1
			for w in world.walls:
				if w["pen"]:
					w["max"] = float(w["max"]) * 1.3
					set_wall_hp(w, float(w["hp"]) + 25.0)
		elif id == "moss":
			moss_lv += 1
		elif id == "market":
			market_lv += 1
	check_tier()
	rebuild_options()
	return true

func begin_intermission() -> void:
	state = "inter"
	inter_stage = "castle"
	reroll_n = 0
	sel_item = ""
	stick_on = false
	stick_vec = Vector2.ZERO
	dog.ko_t = 0.0
	dog.hp = dog.hp_max
	rebuild_options()

func end_intermission() -> void:
	if state != "inter":
		return
	state = "play"
	start_defend()

func inter_next() -> void:
	end_intermission()

# ---- screen layout
func card_rect(i: int) -> Rect2:
	var v: Vector2 = vp()
	var w: float = (v.x - 80.0) / 2.0
	return Rect2(30.0 + float(i % 2) * (w + 20.0), 96.0 + float(i / 2) * 150.0, w, 134.0)

func btn_left_rect() -> Rect2:
	var v: Vector2 = vp()
	return Rect2(v.x / 2.0 - 290.0, v.y - 84.0, 270.0, 54.0)

func btn_right_rect() -> Rect2:
	var v: Vector2 = vp()
	return Rect2(v.x / 2.0 + 20.0, v.y - 84.0, 270.0, 54.0)

func opt_list_rect() -> Rect2:
	var v: Vector2 = vp()
	return Rect2(20.0, 62.0, 340.0, v.y - 62.0 - 100.0)

func opt_row_rect(i: int) -> Rect2:
	var lr: Rect2 = opt_list_rect()
	return Rect2(lr.position.x + 8.0, lr.position.y + 38.0 + float(i) * 36.0, lr.size.x - 16.0, 33.0)

func diagram_rect() -> Rect2:
	var v: Vector2 = vp()
	return Rect2(376.0, 62.0, v.x - 376.0 - 20.0, v.y - 62.0 - 100.0)

func diagram_scale() -> float:
	var dr: Rect2 = diagram_rect()
	return minf((dr.size.x * 0.9) / (world.pen.size.x + 110.0), (dr.size.y * 0.86) / (world.pen.size.y + 100.0))

func to_view(p: Vector2) -> Vector2:
	var dr: Rect2 = diagram_rect()
	return dr.get_center() + Vector2(0.0, 6.0) + (p - world.pen.get_center()) * diagram_scale()

func side_pos(side: String) -> Vector2:
	var pr: Rect2 = world.pen
	if side == "north":
		return Vector2(pr.position.x + pr.size.x / 2.0, pr.position.y)
	if side == "west":
		return Vector2(pr.position.x, pr.position.y + pr.size.y / 2.0)
	return Vector2(pr.end.x, pr.position.y + pr.size.y / 2.0)

func inter_press(p: Vector2) -> void:
	if btn_right_rect().has_point(p):
		inter_next()
		return
	for i in castle_opts.size():
		if opt_row_rect(i).has_point(p):
			var o: Dictionary = castle_opts[i]
			if String(o["mode"]) == "now":
				apply_option(o, -1)
			else:
				sel_item = "" if sel_item == String(o["id"]) else String(o["id"])
			return
	if sel_item == "":
		return
	var sel: Dictionary = option_by_id(sel_item)
	if sel.is_empty():
		return
	var mode: String = String(sel["mode"])
	if mode == "place" or mode == "upgrade":
		for i in world.pads.size():
			if to_view((world.pads[i] as Pad).position).distance_to(p) < 26.0:
				apply_option(sel, i)
				return
	elif mode == "gate":
		for side in ["north", "west", "east"]:
			if to_view(side_pos(String(side))).distance_to(p) < 32.0:
				apply_option(sel, String(side))
				return

func auto_target(o: Dictionary) -> Variant:
	var mode: String = String(o["mode"])
	if mode == "place":
		for i in world.pads.size():
			if (world.pads[i] as Pad).kind == "":
				return i
	elif mode == "upgrade":
		for i in world.pads.size():
			var p: Pad = world.pads[i]
			if p.kind != "" and p.lv < 4:
				return i
	elif mode == "gate":
		for side in ["north", "west", "east"]:
			if not bool(world.holes.get(side, false)):
				return String(side)
	else:
		return -1
	return null

func inter_auto() -> void:
	# the scripted test spends everything it can, then starts the next wave
	gold += 400
	var guard: int = 0
	guard = 0
	while guard < 60:
		guard += 1
		var done: bool = false
		for o in castle_opts:
			var t: Variant = auto_target(o)
			if t != null and apply_option(o, t):
				done = true
				break
		if not done:
			break
	end_intermission()

# ---------------------------------------------------------------- the flock
func pen_entrances() -> Array:
	var P: Rect2 = world.pen
	var out: Array = [[Vector2(world.gate_x, P.end.y), Vector2(0.0, 1.0)]]
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

# where an animal out in the field should head to reach the pen: the nearest open gate, around the walls if need be
func pen_goal(p: Vector2) -> Vector2:
	var best_st := Vector2.ZERO
	var best_e := Vector2.ZERO
	var best_n := Vector2.ZERO
	var bd: float = 1.0e9
	for en in pen_entrances():
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
	var box: Rect2 = world.pen.grow(8.0)
	if not seg_blocked(p, best_st, box):
		return best_st
	var cb: Rect2 = world.pen.grow(44.0)
	var corners: Array = [cb.position, Vector2(cb.end.x, cb.position.y), cb.end, Vector2(cb.position.x, cb.end.y)]
	var pick: Vector2 = best_st
	var pd: float = 1.0e9
	for c in corners:
		var cc: Vector2 = c
		if p.distance_to(cc) < 16.0 or seg_blocked(p, cc, box):
			continue
		var dd: float = p.distance_to(cc) + cc.distance_to(best_st)
		if dd < pd:
			pd = dd
			pick = cc
	return pick

func zone_mult() -> float:
	return 1.18 if dog.crouch else 1.0

func pressure_from(s: Sheep, p: Vector2, h: Vector2, mult: float, calm: bool, dt: float, zone_base: float) -> float:
	var zb: float = zone_base if zone_base > 0.0 else s.zone
	var Z: float = zb * mult
	var d: Vector2 = s.position - p
	var dist: float = d.length()
	if dist >= Z or dist < 0.1:
		return 0.0
	var t: float = 1.0 - dist / Z
	var u: Vector2 = d / dist
	var side: float = 1.0 if (h.x * u.y - h.y * u.x) > 0.0 else -1.0
	var k: float = s.flee * (0.5 if calm else 1.0) * (3.6 if (s.type == "goat" and calm) else 1.0) * (1.0 + s.panic * 0.8)
	s.vel += (u * t * t * 430.0 + Vector2(-u.y, u.x) * side * t * 95.0) * k * dt
	return t

var perf_acc: float = 0.0
var perf_n: int = 0
var perf_low: bool = false

func set_low_res() -> void:
	if perf_low:
		return
	perf_low = true
	var w: Window = get_window()
	w.content_scale_mode = Window.CONTENT_SCALE_MODE_VIEWPORT
	w.content_scale_size = Vector2i(960, 540)
	w.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_EXPAND
	add_popup("Performance mode on", dog.position + Vector2(0, -50), Color(0.8, 0.9, 1.0))

func perf_check(delta: float) -> void:
	if perf_low or not OS.has_feature("web") or state != "play" or wave_t < 3.0:
		return
	perf_acc += delta
	perf_n += 1
	if perf_acc >= 3.0:
		if float(perf_n) / perf_acc < 42.0:
			set_low_res()
		perf_acc = 0.0
		perf_n = 0

func update_sheep(dt: float) -> void:
	for s in sheep:
		var sh: Sheep = s
		if sh.carried:
			sh.vel = Vector2.ZERO
			continue
		var huddle: bool = false
		for f in foxes:
			var fx: Fox = f
			if fx.fleeing or fx.carry != null:
				continue
			var pd: float = fx.position.distance_to(sh.position)
			if pd < 240.0:
				huddle = true
			if pd < 95.0:
				sh.panic = maxf(sh.panic, 0.6)
		sh.panic = maxf(0.0, sh.panic - dt * 0.55)
		if sh.in_pen:
			sh.wa += randf_range(-1.0, 1.0) * dt * 3.0
			sh.vel += Vector2(cos(sh.wa), sin(sh.wa)) * 14.0 * dt
		else:
			var pressure: float = pressure_from(sh, dog.position, dog.heading, zone_mult(), dog.crouch, dt, 0.0)
			var dog_p: float = pressure
			for f in foxes:
				var fx2: Fox = f
				if fx2.fleeing or fx2.carry != null:
					continue
				var fp: float = pressure_from(sh, fx2.position, fx2.vel.normalized(), 1.0, false, dt, 110.0) * 0.7
				if fp > 0.0:
					# raiders drive animals away from the pen and break up the call
					pressure += fp
					sh.vel += (sh.position - world.pen.get_center()).normalized() * 300.0 * fp * dt
					sh.home_t = 0.0
			var gdir: Vector2 = (pen_goal(sh.position) - sh.position).normalized()
			if dog_p > 0.0:
				sh.vel += gdir * 170.0 * dog_p * dt
			if sh.home_t > 0.0:
				sh.home_t -= dt
				sh.vel += gdir * (215.0 if sh.heavy else 235.0) * dt
			elif pressure <= 0.0 and sh.panic < 0.5 and sh.position.distance_to(world.pen.get_center()) < 420.0:
				sh.vel += gdir * 38.0 * dt
			if sh.type == "ram":
				var dd: float = dog.position.distance_to(sh.position)
				if dd < 26.0 and dog.stun <= 0.0 and sh.panic < 0.2:
					dog.stun = 0.7
					dog.vel += (dog.position - sh.position) / maxf(dd, 0.01) * 260.0
					add_popup("OOF!", dog.position + Vector2(0, -16), Color(1.0, 0.72, 0.29))
			var fdt: float = dt * 2.0
			if sh.get_instance_id() % 2 == Engine.get_process_frames() % 2:
				var c := Vector2.ZERO
				var vsum := Vector2.ZERO
				var n: int = 0
				var sep := Vector2.ZERO
				for o in sheep:
					var ot: Sheep = o
					if ot == sh or ot.in_pen or ot.carried:
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
					var coh: float = 26.0 * (2.4 if sh.type == "lamb" else sh.coh) * (1.5 if pressure > 0.0 else 1.0) * (3.0 if huddle else 1.0)
					var dc: Vector2 = c - sh.position
					var dl: float = maxf(dc.length(), 0.001)
					if dl > (20.0 if huddle else 28.0):
						sh.vel += dc / dl * coh * fdt
					sh.vel += (vsum - sh.vel) * 0.7 * fdt
				sh.vel += sep * 260.0 * fdt
			if pressure < 0.05 and not huddle:
				sh.graze -= dt
				if sh.graze <= 0.0:
					sh.graze = randf_range(1.0, 3.5)
					sh.wa = randf() * TAU
					sh.gs = randf_range(6.0, 16.0) if randf() < 0.55 else 0.0
				sh.vel += Vector2(cos(sh.wa), sin(sh.wa)) * sh.gs * dt * 1.4
			if sh.panic > 0.5:
				for o2 in sheep:
					var o2s: Sheep = o2
					if o2s != sh and not o2s.in_pen and not o2s.carried and not o2s.heavy and o2s.position.distance_to(sh.position) < 46.0 and randf() < dt * 2.2:
						o2s.panic = maxf(o2s.panic, sh.panic * 0.8)
		var fr: float = 3.2 if sh.in_pen else 2.0
		sh.vel *= exp(-fr * dt)
		var cap: float = 95.0 * sh.spd * (1.0 + sh.panic * 0.5)
		if world.zone_kind(sh.position) == "water":
			cap *= 0.5
		var v: float = sh.vel.length()
		if v > cap:
			sh.vel *= cap / v
		sh.position += sh.vel * dt
		collide(sh, sh.r, 0.2)
		var P: Rect2 = world.pen
		if (not sh.in_pen) and sh.position.x > P.position.x + 12.0 and sh.position.x < P.end.x - 12.0 and sh.position.y > P.position.y + 6.0 and sh.position.y < P.end.y - 6.0:
			sh.in_pen = true
			sh.squash = 1.0
			herded += 1
			var pay: int = maxi(1, int(round(float(TYPES[sh.type]["xp"]) * 0.5 * gold_mult())))
			gold += pay
			add_popup("+%d gold" % pay, sh.position + Vector2(0, -14), Color(1.0, 0.85, 0.3))
		if sh.in_pen:
			sh.position.x = clampf(sh.position.x, P.position.x + sh.r + 2.0, P.end.x - sh.r - 2.0)
			sh.position.y = clampf(sh.position.y, P.position.y + sh.r + 2.0, P.end.y - sh.r - 2.0)

# ---------------------------------------------------------------- the raiders
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

func imp_ai(f: Fox, dt: float) -> void:
	if dog.ko_t > 0.0:
		gnaw(f, dt)
		return
	var dd: Vector2 = dog.position - f.position
	var dist: float = dd.length()
	f.atk_cd = maxf(0.0, f.atk_cd - dt)
	if f.mode == "chase":
		move_to(f, dog.position, f.base_speed, dt, 5.0)
		if dist < 120.0 and f.atk_cd <= 0.0:
			f.mode = "wind"
			f.tt = 0.45
	elif f.mode == "wind":
		f.vel *= exp(-9.0 * dt)
		f.flash = 0.12
		f.tt -= dt
		if f.tt <= 0.0:
			f.mode = "dash"
			f.tt = 0.38
			f.dash_dir = dd.normalized()
			f.hit_done = false
	elif f.mode == "dash":
		f.vel = f.dash_dir * 400.0
		f.tt -= dt
		if dist < f.r + 10.0 and not f.hit_done:
			f.hit_done = true
			damage_dog(10.0, f.position)
		if f.tt <= 0.0:
			f.mode = "rest"
			f.tt = 0.7
			f.atk_cd = 1.0
	else:
		f.vel *= exp(-6.0 * dt)
		f.tt -= dt
		if f.tt <= 0.0:
			f.mode = "chase"

func gnaw(f: Fox, dt: float) -> void:
	var nw: Dictionary = nearest_wall(f.position)
	if nw.is_empty():
		return
	move_to(f, nw["p"], f.base_speed, dt, 6.0)
	if float(nw["d"]) < f.r + 7.0:
		var w: Dictionary = world.walls[int(nw["i"])]
		set_wall_hp(w, float(w["hp"]) - f.fence_dps * dt * (0.6 if f.slow > 0.0 else 1.0))
		alarm = 0.6
		alarm_pos = nw["p"]
		if float(w["hp"]) <= 0.0:
			w["broken"] = true
			for n in (w["nodes"] as Array):
				(n as Sprite2D).modulate = Color(1, 0.4, 0.3, 0.3)
			finish_day("fence")

func kill_sheep(s: Sheep) -> void:
	sheep.erase(s)
	lost += 1
	add_popup("OH NO!", s.position + Vector2(0, -12), Color(1.0, 0.42, 0.42))
	s.queue_free()

func nearest_edge(p: Vector2) -> Vector2:
	var cands: Array = [Vector2(XMIN - 40.0, p.y), Vector2(XMAX + 40.0, p.y), Vector2(p.x, YMIN - 40.0), Vector2(p.x, YMAX + 40.0)]
	var best: Vector2 = cands[0]
	var bd: float = 1.0e9
	for c in cands:
		var cc: Vector2 = c
		var d: float = cc.distance_to(p)
		if d < bd:
			bd = d
			best = cc
	return best

func update_enemies(dt: float) -> void:
	for f in foxes.duplicate():
		var fx: Fox = f
		fx.stun = maxf(0.0, fx.stun - dt)
		fx.kb *= exp(-6.0 * dt)
		if fx.fleeing:
			var e: Vector2 = nearest_edge(fx.position)
			move_to(fx, e, 190.0, dt, 6.0)
			fx.position += (fx.vel + fx.kb) * dt
			if fx.position.x < XMIN - 20.0 or fx.position.x > XMAX + 20.0 or fx.position.y < YMIN - 20.0 or fx.position.y > YMAX + 20.0:
				foxes.erase(fx)
				fx.queue_free()
			continue
		if fx.stun > 0.0:
			fx.vel *= exp(-8.0 * dt)
		elif fx.kind == "imp":
			imp_ai(fx, dt)
		elif fx.kind == "fox":
			fx.tt -= dt
			if fx.tgt == null or fx.tgt.in_pen or not sheep.has(fx.tgt) or fx.tt <= 0.0:
				fx.tt = 1.0
				var best: Sheep = null
				var bs: float = 1.0e9
				for s in sheep:
					var sh: Sheep = s
					if sh.in_pen:
						continue
					var sc: float = sh.position.distance_to(fx.position) + (-120.0 if sh.type == "lamb" else 0.0)
					if sc < bs:
						bs = sc
						best = sh
				fx.tgt = best
			if fx.tgt != null:
				fx.zig += dt * 5.0
				var dv: Vector2 = fx.tgt.position - fx.position
				var l: float = maxf(dv.length(), 0.001)
				var pv := Vector2(-dv.y, dv.x) / l
				var wob: float = 14.0 if l > 60.0 else 0.0
				move_to(fx, fx.tgt.position + pv * sin(fx.zig) * wob, fx.base_speed, dt, 6.0)
				if l < fx.r + fx.tgt.r + 8.0:
					fx.bite_cd -= dt
					if fx.bite_cd <= 0.0:
						fx.bite_cd = 0.5
						bite(fx, fx.tgt, 3.0 + 0.3 * float(wave - 1))
			else:
				gnaw(fx, dt)
		else:
			gnaw(fx, dt)
		var wk: float = 0.55 if world.zone_kind(fx.position) == "water" else 1.0
		fx.position += (fx.vel * (0.5 if fx.slow > 0.0 else 1.0) * wk + fx.kb) * dt
		collide(fx, fx.r, 0.0)

# ---------------------------------------------------------------- the end
func finish_day(why: String) -> void:
	if state == "result":
		return
	state = "result"
	stick_on = false
	var reward: Dictionary = {}
	if not devmode:
		reward = Meta.record_result(plot, why == "won", wave)
	result = {"reward": reward, "plot": plot, "why": why, "wave": wave, "xp": int(xp), "herded": herded, "defeated": defeated, "lost": lost}
