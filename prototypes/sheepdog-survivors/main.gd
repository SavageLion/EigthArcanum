extends Node2D
# Sheepdog Survivors: herd animals into the pen for XP, shoo off waves of raiders, hold the fence for ten waves.

const WX: float = 1800.0
const WY: float = 1200.0
const XMIN: float = 36.0
const XMAX: float = 1764.0
const YMIN: float = 56.0
const YMAX: float = 1166.0
const BTN_R: float = 52.0
const WAVE_LEN: float = 60.0
const LAST_WAVE: int = 10
const BASE_ZOOM: float = 1.3
const TYPES: Dictionary = {
	"normal": {"r": 7.0, "zone": 120.0, "flee": 1.0, "speed": 1.0, "hp": 2, "tint": Color(1, 1, 1), "xp": 10},
	"lamb": {"r": 4.5, "zone": 105.0, "flee": 1.0, "speed": 1.1, "hp": 1, "tint": Color(1, 1, 1), "xp": 8},
	"ram": {"r": 9.0, "zone": 62.0, "flee": 0.55, "speed": 0.8, "hp": 4, "tint": Color(0.8, 0.68, 0.55), "heavy": true, "bark_mul": 0.4, "xp": 18},
	"goat": {"r": 7.0, "zone": 90.0, "flee": 0.45, "speed": 0.9, "hp": 3, "tint": Color(0.88, 0.7, 0.45), "xp": 14},
	"black": {"r": 7.0, "zone": 120.0, "flee": 1.0, "speed": 1.0, "hp": 2, "tint": Color(0.3, 0.28, 0.32), "coh": 0.35, "xp": 14},
	"goose": {"r": 6.0, "zone": 150.0, "flee": 1.3, "speed": 1.35, "hp": 1, "tint": Color(1.1, 1.12, 1.2), "coh": 0.5, "bark_mul": 1.6, "xp": 12},
	"duck": {"r": 5.0, "zone": 125.0, "flee": 1.0, "speed": 1.1, "hp": 1, "tint": Color(1.15, 1.1, 0.62), "xp": 10},
	"pig": {"r": 8.0, "zone": 80.0, "flee": 0.6, "speed": 0.7, "hp": 3, "tint": Color(1.2, 0.78, 0.86), "heavy": true, "bark_mul": 0.5, "xp": 16},
}
const STRAY_POOL: Array = ["normal", "normal", "normal", "normal", "lamb", "lamb", "goat", "goose", "ram", "black", "duck", "pig"]
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
	{"id": "boots", "name": "Fleet Paws", "desc": "Run faster.", "max": 4},
	{"id": "lungs", "name": "Deep Lungs", "desc": "A longer sprint bar that refills faster.", "max": 3},
	{"id": "charm", "name": "Shepherd's Purse", "desc": "Every animal you pen pays more gold.", "max": 3},
	{"id": "posts", "name": "Castle Walls", "desc": "Walls get stronger and mend a little.", "max": 4},
	{"id": "moss", "name": "Mending Moss", "desc": "The walls slowly heal themselves.", "max": 3},
	{"id": "paw2", "name": "Busy Paws", "desc": "Mend walls faster while you crouch beside them.", "max": 3},
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
var near_pad: int = -1
var cam: Camera2D
var hud: Hud
var dog_frames: SpriteFrames
var sheep_frames: SpriteFrames
var fox_frames: SpriteFrames
var imp_frames: SpriteFrames
var wolf_frames: SpriteFrames
var bear_frames: SpriteFrames
var shadow_tex: Texture2D
var state: String = "play"
var clock: float = 0.0
var wave: int = 0
var wave_t: float = 0.0
var events: Array = []
var stray_t: float = 3.0
var lost: int = 0
var herded: int = 0
var defeated: int = 0
var level: int = 1
var xp: float = 0.0
var xp_need: float = 30.0
var pending: int = 0
var perk_lv: Dictionary = {"bolt": 1}
var choices: Array = []
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
var alarm: float = 0.0
var alarm_pos: Vector2 = Vector2.ZERO
var smoke_n: int = 0
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

func card_rect(i: int) -> Rect2:
	var v: Vector2 = vp()
	var x0: float = (v.x - 778.0) / 2.0
	return Rect2(x0 + float(i) * 264.0, v.y / 2.0 - 88.0, 250.0, 176.0)

func pl(id: String) -> int:
	return int(perk_lv.get(id, 0))

func _ready() -> void:
	randomize()
	smoke = OS.get_cmdline_user_args().has("smoke")
	if OS.has_feature("web"):
		demo = str(JavaScriptBridge.eval("window.location.search")).contains("demo")
	shadow_tex = U.shadow_texture()
	var names: Array = ["east", "north", "south", "south-east", "north-east"]
	dog_frames = U.raven_frames()
	sheep_frames = U.sheep8_frames()
	fox_frames = U.set8("fox8", 12.0)
	imp_frames = U.set8("imp8", 12.0)
	wolf_frames = U.frames(load("res://art/chars/wolf.png") as Texture2D, 76, names)
	bear_frames = U.frames(load("res://art/chars/bear.png") as Texture2D, 76, names)
	world = World.new()
	world.wx = WX
	world.wy = WY
	add_child(world)
	ysort = Node2D.new()
	ysort.y_sort_enabled = true
	add_child(ysort)
	world.generate(ysort)
	dog = Dog.new()
	ysort.add_child(dog)
	dog.setup(dog_frames, shadow_tex)
	dog.position = world.dog_start
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
	for i in 18:
		spawn_stray(true)
	_setup_camera()
	_setup_layers()
	start_wave(1)
	if demo or smoke:
		gold = 600
		perk_lv = {"bolt": 3, "fire": 2, "nova": 2, "zap": 2, "orbit": 2}
		for i in 4:
			near_pad = i
			world.pads[i].position = world.pads[i].position
			try_build(i % 3)
		near_pad = 5
		try_build(1)
		try_build(0)
		near_pad = -1
		if demo:
			perk_lv = {}
			var kinds: Array = ["fox", "imp", "wolf", "bear"]
			for i in 4:
				spawn_enemy(String(kinds[i]))
				foxes[foxes.size() - 1].position = dog.position + Vector2(-120.0 + 80.0 * float(i), 60.0 + 20.0 * float(i % 2))
				foxes[foxes.size() - 1].stun = 40.0
				world.pads[0].position = Vector2(-9999, -9999)

func _setup_camera() -> void:
	cam = Camera2D.new()
	cam.limit_left = -60
	cam.limit_top = -60
	cam.limit_right = int(WX + 60.0)
	cam.limit_bottom = int(WY + 70.0)
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
	var grade_layer := CanvasLayer.new()
	grade_layer.layer = 2
	add_child(grade_layer)
	var gr := ColorRect.new()
	gr.set_anchors_preset(Control.PRESET_FULL_RECT)
	gr.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var gm := ShaderMaterial.new()
	gm.shader = load("res://shaders/grade.gdshader") as Shader
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
					pick_perk(0)
				elif ke.keycode == KEY_2:
					pick_perk(1)
				elif ke.keycode == KEY_3:
					pick_perk(2)
			elif ke.keycode == KEY_1 and near_pad >= 0:
				try_build(0)
			elif ke.keycode == KEY_2 and near_pad >= 0 and build_count() > 1:
				try_build(1)
			elif ke.keycode == KEY_3 and near_pad >= 0 and build_count() > 1:
				try_build(2)
			elif ke.keycode == KEY_SPACE:
				do_bark()
			elif ke.keycode == KEY_F:
				toggle_fullscreen()

func fs_rect() -> Rect2:
	return Rect2(vp().x - 46.0, 44.0, 38.0, 34.0)

func toggle_fullscreen() -> void:
	var w: Window = get_window()
	w.mode = Window.MODE_WINDOWED if w.mode == Window.MODE_FULLSCREEN or w.mode == Window.MODE_EXCLUSIVE_FULLSCREEN else Window.MODE_FULLSCREEN

func build_rect(i: int) -> Rect2:
	var v: Vector2 = vp()
	if near_pad >= 0 and (world.pads[near_pad] as Pad).kind != "":
		return Rect2(v.x / 2.0 - 110.0, 116.0, 220.0, 54.0)
	return Rect2(v.x / 2.0 - 192.0 + float(i) * 130.0, 116.0, 124.0, 54.0)

func build_count() -> int:
	if near_pad < 0:
		return 0
	return 1 if (world.pads[near_pad] as Pad).kind != "" else 3

func def_cost(p: Pad, i: int) -> int:
	if p.kind == "":
		return int(DEFS[DEF_ORDER[i]]["cost"])
	if p.lv >= 4:
		return -1
	return int(DEFS[p.kind]["cost"]) * p.lv

func try_build(i: int) -> void:
	if near_pad < 0 or state != "play":
		return
	var p: Pad = world.pads[near_pad]
	var c: int = def_cost(p, i)
	if c < 0 or gold < c:
		add_popup("NOT ENOUGH GOLD" if c > 0 else "MAX LEVEL", p.position + Vector2(0, -34), Color(1.0, 0.5, 0.4))
		return
	gold -= c
	if p.kind == "":
		p.kind = DEF_ORDER[i]
		p.lv = 1
		var def: Dictionary = DEFS[p.kind]
		var t: Texture2D = world.tex(String(def["tex"]))
		var sprt := Sprite2D.new()
		sprt.texture = t
		sprt.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
		sprt.offset = Vector2(0, -t.get_height() * 0.5 + 3.0)
		sprt.position = p.position + Vector2(0, 8.0)
		ysort.add_child(sprt)
		p.sprite = sprt
	else:
		p.lv += 1
	var base: float = float(DEFS[p.kind]["sc"])
	p.sprite.scale = Vector2.ONE * base * (1.0 + 0.1 * float(p.lv - 1))
	add_popup("BUILT!" if p.lv == 1 else "LEVEL %d!" % p.lv, p.position + Vector2(0, -40), Color(1.0, 0.9, 0.4))
	ring(p.position, 46.0, Color(1.0, 0.85, 0.4), 0.5, 4.0)

func _press(p: Vector2, id: int) -> void:
	if state == "play" and near_pad >= 0:
		for i in build_count():
			if build_rect(i).has_point(p):
				try_build(i)
				return
	if state != "result" and fs_rect().grow(6.0).has_point(p):
		toggle_fullscreen()
		return
	if state == "result":
		get_tree().reload_current_scene()
		return
	if state == "levelup":
		for i in choices.size():
			if card_rect(i).has_point(p):
				pick_perk(i)
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

func move_input() -> Vector2:
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
	return 150.0 * (1.0 + 0.2 * float(pl("bark")))
func bark_cd() -> float:
	var ducks: int = int(pen_counts.get("duck", 0))
	return 2.4 * pow(0.88, float(pl("bark"))) * (1.0 - minf(0.3, 0.03 * float(ducks)))
func speed_mult() -> float:
	return 1.0 + 0.08 * float(pl("boots"))
func gold_mult() -> float:
	var pigs: int = int(pen_counts.get("pig", 0))
	return 1.0 + 0.25 * float(pl("charm")) + 0.04 * float(pigs)
func xp_mult() -> float:
	return 1.0
func fence_regen() -> float:
	var sheepish: int = int(pen_counts.get("normal", 0)) + int(pen_counts.get("lamb", 0)) + int(pen_counts.get("black", 0))
	return 0.12 * float(sheepish) + 0.7 * float(pl("moss"))
func repair_rate() -> float:
	return 5.0 * (1.0 + 0.6 * float(pl("paw2")))

# ---------------------------------------------------------------- waves
func start_wave(n: int) -> void:
	wave = n
	wave_t = 0.0
	events.clear()
	var fox_n: int = 5 + 2 * n
	var wolf_n: int = n - 1
	var imp_n: int = (1 + n / 2) if n >= 2 else 0
	for i in imp_n:
		events.append({"t": randf_range(3.0, 52.0), "k": "imp"})
	for i in fox_n:
		events.append({"t": randf_range(1.0, 54.0), "k": "fox"})
	for i in wolf_n:
		events.append({"t": randf_range(4.0, 52.0), "k": "wolf"})
	if n == 5:
		events.append({"t": 20.0, "k": "bear"})
	if n == 8:
		events.append({"t": 15.0, "k": "bear"})
	if n == 10:
		events.append({"t": 10.0, "k": "bear"})
		events.append({"t": 32.0, "k": "bear"})
	events.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return float(a["t"]) < float(b["t"]))
	banner = "WAVE %d" % n if n < LAST_WAVE else "LAST WAVE!"
	banner_t = 3.0

func run_events() -> void:
	while events.size() > 0 and float(events[0]["t"]) <= wave_t:
		var e: Dictionary = events.pop_front()
		spawn_enemy(String(e["k"]))

func clamp_pt(p: Vector2) -> Vector2:
	return Vector2(clampf(p.x, XMIN, XMAX), clampf(p.y, YMIN, YMAX))

func edge_point(near_loose: bool) -> Vector2:
	var t := Vector2(randf_range(XMIN, XMAX), randf_range(YMIN, YMAX))
	if near_loose:
		var loose: Array = sheep.filter(func(q: Sheep) -> bool: return not q.carried and not q.in_pen)
		if loose.size() > 0:
			t = (loose[randi() % loose.size()] as Sheep).position
	var ds: Array = [t.x - XMIN, XMAX - t.x, t.y - YMIN, YMAX - t.y]
	var m: float = 1.0e9
	var side: int = 0
	for i in 4:
		if float(ds[i]) < m:
			m = float(ds[i])
			side = i
	if not near_loose or randf() < 0.3:
		side = randi() % 4
	if side == 0:
		return clamp_pt(Vector2(XMIN, t.y + randf_range(-150, 150)))
	if side == 1:
		return clamp_pt(Vector2(XMAX, t.y + randf_range(-150, 150)))
	if side == 2:
		return clamp_pt(Vector2(t.x + randf_range(-200, 200), YMIN))
	return clamp_pt(Vector2(t.x + randf_range(-200, 200), YMAX))

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
	s.setup(t, TYPES[t], sheep_frames, shadow_tex)
	s.seen = true
	var p := Vector2.ZERO
	if initial:
		for tries in 30:
			p = Vector2(randf_range(120.0, WX - 120.0), randf_range(120.0, WY - 120.0))
			if not world.pen.grow(120.0).has_point(p) and p.distance_to(dog.position) > 160.0:
				break
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

func _physics_process(delta: float) -> void:
	update_camera(delta)
	if smoke:
		smoke_n += 1
		if state == "levelup":
			pick_perk(0)
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
			print("smoke hp=", dog.hp, " ko=", dog.ko_t, " t=", smoke_n, " state=", state, " wave=", wave, " foxes=", foxes.size(), " sheep=", sheep.size(), " lvl=", level, " perks=", perk_lv)
	if state != "play":
		return
	var dt: float = minf(delta, 0.05)
	clock += dt
	wave_t += dt
	alarm = maxf(0.0, alarm - dt)
	banner_t = maxf(0.0, banner_t - dt)
	count_pen()
	update_dog(dt)
	update_sheep(dt)
	update_enemies(dt)
	update_weapons(dt)
	update_pen_bonus(dt)
	update_coins(dt)
	run_events()
	stray_t -= dt
	if stray_t <= 0.0:
		stray_t = maxf(1.2, 2.6 - float(wave) * 0.12)
		var loose: int = 0
		for s in sheep:
			if not (s as Sheep).in_pen:
				loose += 1
		if loose < 26:
			spawn_stray(false)
	for pu in popups:
		pu["t"] = float(pu["t"]) - dt
	popups = popups.filter(func(q: Dictionary) -> bool: return float(q["t"]) > 0.0)
	if wave_t >= WAVE_LEN:
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

func _process(delta: float) -> void:
	dog.animate(delta)
	(dog.get_node("Spark") as CPUParticles2D).emitting = dog.vel.length() > 40.0
	for s in sheep:
		(s as Sheep).animate(delta)
	for f in foxes:
		(f as Fox).animate(delta)
	var target_zoom: float = BASE_ZOOM * 0.95 if (sprint_held and not dog.winded and dog.vel.length() > 150.0) else BASE_ZOOM
	var z: float = lerpf(cam.zoom.x, target_zoom, minf(1.0, delta * 3.0))
	cam.zoom = Vector2(z, z)
	cloud_mat.set_shader_parameter("cam", cam.get_screen_center_position())
	cloud_mat.set_shader_parameter("view_size", vp())
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
	for k in world.rocks:
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
	if dog.regen_t <= 0.0 and dog.hp < dog.hp_max:
		dog.hp = minf(dog.hp_max, dog.hp + 4.0 * dt)
	if dog.ko_t > 0.0:
		dog.ko_t -= dt
		dog.vel = Vector2.ZERO
		if dog.ko_t <= 0.0:
			dog.position = world.dog_start
			dog.hp = dog.hp_max
			dog.invuln = 1.5
			dog.stam = dog.stam_max
			ring(dog.position, 70.0, Color(0.7, 0.85, 1.0), 0.6, 4.0)
		return
	var inp: Vector2 = move_input()
	var mag: float = minf(1.0, inp.length())
	var dir: Vector2 = inp.normalized() if mag > 0.02 else Vector2.ZERO
	dog.stun = maxf(0.0, dog.stun - dt)
	dog.bark_cd = maxf(0.0, dog.bark_cd - dt)
	var want_sprint: bool = sprint_held or Input.is_key_pressed(KEY_SHIFT)
	dog.walk = stick_on and mag > 0.12 and mag < 0.58
	dog.crouch = calm_held or Input.is_key_pressed(KEY_C) or dog.walk
	dog.stam_max = 100.0 + 25.0 * float(pl("lungs"))
	var speedk: float
	if dog.crouch:
		speedk = maxf(0.55, mag)
	elif mag < 0.12:
		speedk = 0.0
	else:
		speedk = 0.62 + 0.38 * minf(1.0, (mag - 0.12) / 0.5)
	if dog.winded and dog.stam > dog.stam_max * 0.3:
		dog.winded = false
	var sprinting: bool = want_sprint and (not dog.winded) and dog.stam > 0.0 and mag > 0.12 and not dog.crouch
	var regen: float = 1.0 + 0.3 * float(pl("lungs"))
	if sprinting:
		dog.stam -= 28.0 * dt
	else:
		dog.stam += 18.0 * regen * dt
	if dog.stam <= 0.0:
		dog.stam = 0.0
		dog.winded = true
	dog.stam = minf(dog.stam_max, dog.stam)
	var base: float = (95.0 if dog.crouch else 210.0) * speed_mult()
	var sp: float = base * speedk * (0.72 if dog.winded else 1.0) * (1.55 if sprinting else 1.0) * (0.3 if dog.stun > 0.0 else 1.0)
	dog.vel += (dir * sp - dog.vel) * minf(1.0, dt * 9.0)
	dog.position += dog.vel * dt
	collide(dog, 6.0, 0.0)
	bump_sheep()
	var v: float = dog.vel.length()
	if v > 20.0:
		dog.heading = dog.vel / v
	# which build pad am I standing on?
	near_pad = -1
	var bd: float = 38.0
	for i in world.pads.size():
		var pd: Pad = world.pads[i]
		var d: float = pd.position.distance_to(dog.position)
		pd.near = false
		if d < bd:
			bd = d
			near_pad = i
	if near_pad >= 0:
		(world.pads[near_pad] as Pad).near = true
	# crouching beside a damaged fence mends it
	if dog.crouch:
		for w in world.walls:
			if not w["pen"] or w["broken"] or float(w["hp"]) >= float(w["max"]):
				continue
			if seg_dist(dog.position, w["a"], w["b"]) < 46.0:
				set_wall_hp(w, float(w["hp"]) + repair_rate() * dt)

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
			var f: float = 1.0 - dist / R
			sh.vel += dd / dist * 190.0 * f * sh.bark_mul
			sh.panic = maxf(sh.panic, 0.9 * sh.bark_mul)
			sh.squash = 1.0
	for f in foxes.duplicate():
		var fx: Fox = f
		if fx.fleeing:
			continue
		if fx.position.distance_to(dog.position) < R * 1.1:
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
	s.vel += (s.position - f.position).normalized() * 70.0
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
		if d < 70.0:
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
func gain_xp(amount: float) -> void:
	xp += amount * xp_mult()
	while xp >= xp_need:
		xp -= xp_need
		level += 1
		xp_need = 30.0 + 20.0 * float(level - 1)
		pending += 1
		add_popup("LEVEL UP!", dog.position + Vector2(0, -26), Color(1.0, 0.9, 0.4))
		ring(dog.position, 70.0, Color(1.0, 0.9, 0.4), 0.7, 3.0)
	if pending > 0 and state == "play":
		open_levelup()

func open_levelup() -> void:
	var pool: Array = []
	for p in PERKS:
		if pl(String(p["id"])) < int(p["max"]):
			pool.append(p)
	pool.shuffle()
	choices = pool.slice(0, 3)
	if choices.is_empty():
		pending = 0
		return
	state = "levelup"
	stick_on = false
	stick_vec = Vector2.ZERO
	calm_held = false
	sprint_held = false

func pick_perk(i: int) -> void:
	if state != "levelup" or i >= choices.size():
		return
	var id: String = String(choices[i]["id"])
	perk_lv[id] = pl(id) + 1
	if id == "posts":
		for w in world.walls:
			if w["pen"]:
				w["max"] = float(w["max"]) * 1.3
				set_wall_hp(w, float(w["hp"]) + 25.0)
	pending -= 1
	state = "play"
	if pending > 0:
		open_levelup()

# ---------------------------------------------------------------- the flock
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
			for f in foxes:
				var fx2: Fox = f
				if fx2.fleeing or fx2.carry != null:
					continue
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
					sh.vel += dc / dl * coh * dt
				sh.vel += (vsum - sh.vel) * 0.7 * dt
			sh.vel += sep * 260.0 * dt
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
	add_popup("CARRIED OFF", s.position + Vector2(0, -12), Color(1.0, 0.42, 0.42))
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
						fx.bite_cd = 0.7
						bite(fx, fx.tgt, 2.0)
			else:
				gnaw(fx, dt)
		else:
			gnaw(fx, dt)
		fx.position += (fx.vel * (0.5 if fx.slow > 0.0 else 1.0) + fx.kb) * dt
		collide(fx, fx.r, 0.0)

# ---------------------------------------------------------------- the end
func finish_day(why: String) -> void:
	if state == "result":
		return
	state = "result"
	stick_on = false
	result = {"why": why, "wave": wave, "level": level, "herded": herded, "defeated": defeated, "lost": lost}
