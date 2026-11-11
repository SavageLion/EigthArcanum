extends Node2D
# Sheepdog, Godot day-mode slice: find the flock in a wide meadow, herd it into the pen, ward off foxes, meet the quota.

const WX: float = 2100.0
const WY: float = 960.0
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
const HERD: Array = ["normal", "normal", "normal", "normal", "normal", "normal", "goat", "goat", "goose", "goose", "ram", "black"]

var world: World
var ysort: Node2D
var dog: Dog
var sheep: Array = []
var foxes: Array = []
var cam: Camera2D
var hud: Hud
var dog_frames: SpriteFrames
var sheep_frames: SpriteFrames
var fox_frames: SpriteFrames
var shadow_tex: Texture2D
var state: String = "play"
var t_left: float = 170.0
var t_total: float = 170.0
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
var cloud_mat: ShaderMaterial
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
	shadow_tex = U.shadow_texture()
	dog_frames = U.frames(load("res://art/chars/dog.png") as Texture2D, 48, ["east", "north", "south", "south-east", "north-east"])
	sheep_frames = U.frames(load("res://art/chars/sheep.png") as Texture2D, 40, ["east", "north", "south"])
	fox_frames = U.frames(load("res://art/chars/fox.png") as Texture2D, 52, ["east", "north", "south", "south-east", "north-east"])
	world = World.new()
	world.wx = WX
	world.wy = WY
	add_child(world)
	ysort = Node2D.new()
	ysort.y_sort_enabled = true
	add_child(ysort)
	world.generate(ysort)
	_spawn_dog()
	_spawn_sheep()
	_setup_camera()
	_setup_layers()
	need = int(ceil(float(sheep.size()) * 0.5))
	for i in 3:
		events.append({"t": randf_range(18.0, 120.0), "raid": randf() < 0.4})
	events.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return float(a["t"]) < float(b["t"]))
	banner = "FIND YOUR SHEEP"
	banner_t = 3.5

func _spawn_dog() -> void:
	dog = Dog.new()
	ysort.add_child(dog)
	dog.setup(dog_frames, shadow_tex)
	dog.position = world.dog_start

func _spawn_sheep() -> void:
	var cs: Array = []
	for i in 4:
		for tries in 60:
			var p := Vector2(randf_range(200.0, WX * 0.62), randf_range(150.0, WY - 120.0))
			if p.distance_to(world.dog_start) < 420.0 or world.in_zone(p, 30.0):
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
	var idx: int = 0
	for t in HERD:
		var s := Sheep.new()
		ysort.add_child(s)
		s.setup(String(t), TYPES[String(t)], sheep_frames, shadow_tex)
		var hide_it: bool = idx < 2
		var c: Vector2 = cs[randi() % cs.size()]
		var p := c + Vector2.from_angle(randf() * TAU) * randf_range(0.0, 80.0)
		if hide_it:
			p = Vector2(randf_range(240.0, WX * 0.6), randf_range(160.0, WY - 140.0))
			if p.distance_to(world.dog_start) < 400.0 or world.in_zone(p, 20.0):
				p = c + Vector2(30.0, 30.0)
			s.hidden_grass = true
			s.spr.visible = false
			s.shadow.visible = false
			_add_rustle(s)
		s.position = p
		sheep.append(s)
		idx += 1

func _add_rustle(s: Sheep) -> void:
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
	cam.position_smoothing_enabled = true
	cam.position_smoothing_speed = 5.5
	cam.limit_left = 0
	cam.limit_top = 0
	cam.limit_right = int(WX)
	cam.limit_bottom = int(WY + 60.0)
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
			if ke.keycode == KEY_SPACE:
				do_bark()
			elif ke.keycode == KEY_F:
				_toggle_fullscreen()

func _toggle_fullscreen() -> void:
	var w: Window = get_window()
	if w.mode == Window.MODE_FULLSCREEN:
		w.mode = Window.MODE_WINDOWED
	else:
		w.mode = Window.MODE_FULLSCREEN

func _press(p: Vector2, id: int) -> void:
	if state == "result":
		get_tree().reload_current_scene()
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

# ---------------------------------------------------------------- the loop
func _physics_process(delta: float) -> void:
	if state != "play":
		return
	var dt: float = minf(delta, 0.05)
	clock += dt
	t_left -= dt
	banner_t = maxf(0.0, banner_t - dt)
	update_dog(dt)
	update_sheep(dt)
	update_foxes(dt)
	run_events()
	for pu in popups:
		pu["t"] = float(pu["t"]) - dt
	popups = popups.filter(func(q: Dictionary) -> bool: return float(q["t"]) > 0.0)
	penned = 0
	for s in sheep:
		if (s as Sheep).in_pen:
			penned += 1
	var all_in: bool = sheep.size() > 0 and penned >= sheep.size()
	if all_in:
		finish_day("all")
	elif t_left <= 0.0:
		t_left = 0.0
		finish_day("time")

func _process(delta: float) -> void:
	dog.animate(delta)
	for s in sheep:
		(s as Sheep).animate(delta)
	for f in foxes:
		(f as Fox).animate(delta)
	# camera: look ahead, ease out when sprinting, tiny shake on a bark
	shake = maxf(0.0, shake - delta * 3.0)
	cam.offset = dog.vel * 0.28 + Vector2(randf_range(-1, 1), randf_range(-1, 1)) * shake * 4.0
	cam.position = dog.position
	var target_zoom: float = 1.6 * 0.94 if (sprint_held and not dog.winded and dog.vel.length() > 150.0) else 1.6
	var z: float = lerpf(cam.zoom.x, target_zoom, minf(1.0, delta * 3.0))
	cam.zoom = Vector2(z, z)
	cloud_mat.set_shader_parameter("cam", cam.get_screen_center_position())
	cloud_mat.set_shader_parameter("view_size", vp())
	hud.queue_redraw()
	# who has been seen
	var half: Vector2 = vp() / 2.0 * 0.9
	var c: Vector2 = cam.get_screen_center_position()
	for s in sheep:
		var sh: Sheep = s
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
	if e.position.x < r:
		e.position.x = r
		e.vel.x = absf(e.vel.x) * bounce
	if e.position.x > WX - r:
		e.position.x = WX - r
		e.vel.x = -absf(e.vel.x) * bounce
	if e.position.y < r + 20.0:
		e.position.y = r + 20.0
		e.vel.y = absf(e.vel.y) * bounce
	if e.position.y > WY - r:
		e.position.y = WY - r
		e.vel.y = -absf(e.vel.y) * bounce

func breached() -> bool:
	for w in world.walls:
		if w["pen"] and w["broken"]:
			return true
	return false

func eligible(s: Sheep) -> bool:
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
	var base: float = 95.0 if dog.crouch else 210.0
	var sp: float = base * speedk * (0.72 if dog.winded else 1.0) * (1.55 if sprinting else 1.0) * (0.3 if dog.stun > 0.0 else 1.0)
	var zk: String = world.zone_kind(dog.position)
	if zk == "water":
		sp *= 0.45
	elif zk == "mud":
		sp *= 0.65
	dog.vel += (dir * sp - dog.vel) * minf(1.0, dt * 9.0)
	dog.position += dog.vel * dt
	collide(dog, 6.0, 0.0)
	bump_sheep(dt)
	var v: float = dog.vel.length()
	if v > 20.0:
		dog.heading = dog.vel / v

func bump_sheep(dt: float) -> void:
	for s in sheep:
		var sh: Sheep = s
		if sh.carried or sh.hidden_grass:
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
	var R: float = 150.0
	var ring := RingFx.new()
	ring.position = dog.position
	ring.maxr = R
	add_child(ring)
	for s in sheep:
		var sh: Sheep = s
		if sh.carried:
			continue
		var dd: Vector2 = sh.position - dog.position
		var dist: float = dd.length()
		if not sh.seen and dist < 420.0:
			sh.ping = 4.0
		if sh.hidden_grass and dist < 150.0:
			reveal(sh)
		if sh.in_pen:
			continue
		if dist < R and dist > 0.1:
			var f: float = 1.0 - dist / R
			sh.vel += dd / dist * 190.0 * f * sh.bark_mul
			sh.panic = maxf(sh.panic, 0.9 * sh.bark_mul)
			sh.squash = 1.0
	for f in foxes:
		var fx: Fox = f
		if fx.position.distance_to(dog.position) < R * 1.35:
			scare_fox(fx, 2.8)

func reveal(s: Sheep) -> void:
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
	return 1.18 if dog.crouch else 1.6

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
	var k: float = s.flee * ((0.5) if calm else 1.0) * (3.6 if (s.type == "goat" and calm) else 1.0) * (1.0 + s.panic * 0.8)
	s.vel += (u * t * t * 430.0 + Vector2(-u.y, u.x) * side * t * 95.0) * k * dt
	return t

func update_sheep(dt: float) -> void:
	for s in sheep:
		var sh: Sheep = s
		if sh.carried or sh.hidden_grass:
			sh.vel = Vector2.ZERO
			continue
		var huddle: bool = false
		for f in foxes:
			var fx: Fox = f
			if fx.carry != null:
				continue
			var pd: float = fx.position.distance_to(sh.position)
			if pd < 270.0:
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
				if fx2.carry != null:
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
				if ot == sh or ot.in_pen or ot.carried or ot.hidden_grass:
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
					var o2s: Sheep = o2
					if o2s != sh and not o2s.in_pen and not o2s.carried and not o2s.heavy and o2s.position.distance_to(sh.position) < 46.0 and randf() < dt * 2.2:
						o2s.panic = maxf(o2s.panic, sh.panic * 0.8)
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
		sh.position += sh.vel * dt
		collide(sh, sh.r, 0.2)
		var P: Rect2 = world.pen
		if (not sh.in_pen) and sh.position.x > P.position.x + 16.0 and sh.position.x < P.end.x - 6.0 and sh.position.y > P.position.y + 6.0 and sh.position.y < P.end.y - 6.0:
			sh.in_pen = true
			sh.squash = 1.0
			add_popup("+1", sh.position + Vector2(0, -14), Color(0.6, 1.0, 0.6))
		if sh.in_pen:
			sh.position.x = clampf(sh.position.x, P.position.x + sh.r + 2.0, P.end.x - sh.r - 2.0)
			sh.position.y = clampf(sh.position.y, P.position.y + sh.r + 2.0, P.end.y - sh.r - 2.0)
		if sh.hidden_grass == false and sh.position.distance_to(dog.position) < 85.0 and false:
			reveal(sh)
	for s in sheep:
		var sh2: Sheep = s
		if sh2.hidden_grass and sh2.position.distance_to(dog.position) < 85.0:
			reveal(sh2)

func lure_target(s: Sheep) -> Vector2:
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
	var live: Array = sheep.filter(func(q: Sheep) -> bool: return not q.carried)
	var t: Vector2 = world.pen.get_center()
	if live.size() > 0 and randf() < 0.6:
		t = (live[randi() % live.size()] as Sheep).position
	var ds: Array = [t.x, WX - t.x, t.y - 44.0, WY - t.y]
	var m: float = 1.0e9
	var side: int = 0
	for i in 4:
		if float(ds[i]) < m:
			m = float(ds[i])
			side = i
	if randf() > 0.6:
		side = randi() % 4
	if side == 0:
		return Vector2(8.0, clampf(t.y + randf_range(-160, 160), 60.0, WY - 20.0))
	if side == 1:
		return Vector2(WX - 8.0, clampf(t.y + randf_range(-160, 160), 60.0, WY - 20.0))
	if side == 2:
		return Vector2(clampf(t.x + randf_range(-200, 200), 20.0, WX - 20.0), 50.0)
	return Vector2(clampf(t.x + randf_range(-200, 200), 20.0, WX - 20.0), WY - 8.0)

func spawn_fox(raid: bool) -> void:
	var f := Fox.new()
	ysort.add_child(f)
	f.setup(fox_frames, shadow_tex)
	f.position = edge_point()
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

func hit_wall(f: Fox, nw: Dictionary, dmg: float, dt: float) -> void:
	var w: Dictionary = world.walls[int(nw["i"])]
	w["hp"] = float(w["hp"]) - dmg * dt
	if float(w["hp"]) <= 0.0 and not w["broken"]:
		w["broken"] = true
		for n in (w["nodes"] as Array):
			(n as Sprite2D).modulate = Color(1, 0.4, 0.3, 0.35)
		add_popup("DUG THROUGH!", nw["p"], Color(1.0, 0.55, 0.4))
		Input.vibrate_handheld(60)

func drop_carry(f: Fox) -> void:
	var s: Sheep = f.carry
	if s == null:
		return
	s.carried = false
	s.panic = 1.0
	s.vel = Vector2(randf_range(-60, 60), randf_range(-60, 60))
	f.carry = null
	f.scared = maxf(f.scared, 3.0)
	add_popup("SAVED!", s.position + Vector2(0, -14), Color(0.6, 1.0, 0.6))

func scare_fox(f: Fox, t: float) -> void:
	f.scared = maxf(f.scared, t)
	if f.carry != null:
		drop_carry(f)

func kill_sheep(s: Sheep) -> void:
	sheep.erase(s)
	lost += 1
	add_popup("CARRIED OFF", s.position + Vector2(0, -12), Color(1.0, 0.42, 0.42))
	s.queue_free()
	Input.vibrate_handheld(60)

func update_foxes(dt: float) -> void:
	for f in foxes.duplicate():
		var fx: Fox = f
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
			if fx.position.x < 5.0 or fx.position.x > WX - 5.0 or fx.position.y < 48.0 or fx.position.y > WY - 5.0:
				var cs: Sheep = fx.carry
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
					var best: Sheep = null
					var bs: float = -1.0e9
					for s in sheep:
						var sh: Sheep = s
						if not eligible(sh):
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
		fx.position += fx.vel * dt
		collide(fx, fx.r, 0.0)
		# a tackle makes it drop what it is carrying
		if fx.position.distance_to(dog.position) < 12.0 and fx.carry != null:
			drop_carry(fx)

func nearest_edge(p: Vector2) -> Vector2:
	var cands: Array = [Vector2(0.0, p.y), Vector2(WX, p.y), Vector2(p.x, 46.0), Vector2(p.x, WY)]
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
	result = {"ok": ok, "penned": penned, "need": need, "total": sheep.size() + lost, "lost": lost, "why": why}
