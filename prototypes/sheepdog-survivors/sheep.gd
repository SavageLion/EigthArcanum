class_name Sheep
extends Mover

var type: String = "normal"
var r: float = 7.0
var zone: float = 120.0
var flee: float = 1.0
var spd: float = 1.0
var hp: float = 6.0
var maxhp: float = 6.0
var panic: float = 0.0
var home_t: float = 0.0
var wa: float = 0.0
var graze: float = 0.0
var gs: float = 0.0
var in_pen: bool = false
var carried: bool = false
var seen: bool = false
var hidden_grass: bool = false
var ping: float = 0.0
var hop: float = 0.0
var bump_t: float = 0.0
var heavy: bool = false
var coh: float = 1.0
var bark_mul: float = 1.0
var lure: String = ""
var mud_f: float = 0.7
var swim_f: float = 0.5
var spr: AnimatedSprite2D
var shadow: Sprite2D
var base_scale: float = 0.64
var squash: float = 0.0
var heading: Vector2 = Vector2.RIGHT

func setup(t: String, def: Dictionary, frames: SpriteFrames, shadow_tex: Texture2D) -> void:
	type = t
	r = def["r"]
	zone = def["zone"]
	flee = def["flee"]
	spd = def["speed"]
	maxhp = float(def["hp"]) * 3.0
	hp = maxhp
	heavy = def.get("heavy", false)
	coh = def.get("coh", 1.0)
	bark_mul = def.get("bark_mul", 1.0)
	lure = def.get("lure", "")
	mud_f = def.get("mud", 0.7)
	swim_f = def.get("swim", 0.5)
	wa = randf() * TAU
	graze = randf() * 3.0
	hop = randf() * 6.0
	var fit: Dictionary = {}
	if def.has("set"):
		fit = U.fit(String(def["set"]), String(def["metric"]), float(def["target"]) * U.WH)
	shadow = Sprite2D.new()
	shadow.texture = shadow_tex
	shadow.scale = Vector2(r * 0.34, r * 0.16)
	if not fit.is_empty():
		shadow.scale = Vector2(float(fit["w"]) / 64.0 * 1.2, float(fit["w"]) / 64.0 * 0.5)
	shadow.show_behind_parent = true
	add_child(shadow)
	spr = AnimatedSprite2D.new()
	spr.sprite_frames = frames
	spr.modulate = def["tint"]
	spr.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	base_scale = 0.85 * r / 7.0 * (1.2 if t == "lamb" else 1.0) * float(def.get("sc", 1.0))
	spr.scale = Vector2(base_scale, base_scale)
	spr.offset = Vector2(0, -13)
	if not fit.is_empty():
		base_scale = float(fit["scale"])
		spr.scale = Vector2(base_scale, base_scale)
		spr.offset = fit["offset"]
	spr.play("idle_east")
	add_child(spr)

func animate(dt: float) -> void:
	var speed: float = vel.length()
	if speed > 6.0:
		heading = vel / speed
	var row: String = U.dir8(heading)
	var a: String = ("walk_" if speed > 8.0 else "idle_") + row
	if spr.animation != a:
		spr.play(a)
	spr.speed_scale = clampf(speed / 40.0, 0.5, 2.4)
	# a little hop with each step and a squash when startled
	hop += dt * speed / 16.0
	var bob: float = absf(sin(hop)) * 2.2 if speed > 8.0 else 0.0
	spr.position.y = -bob
	squash = move_toward(squash, 0.0, dt * 3.0)
	var sq: float = 1.0 + squash * 0.18
	spr.scale = Vector2(base_scale / sq, base_scale * sq)
	var tint: Color = spr.modulate
	spr.self_modulate = Color(1.0, 1.0 - panic * 0.22, 1.0 - panic * 0.22)
