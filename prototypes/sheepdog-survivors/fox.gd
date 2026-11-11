class_name Fox
extends Mover
# Any wild attacker: fox (steals sheep), wolf (gnaws the fence), bear (big, slow, gnaws hard).

var kind: String = "fox"
var hp: float = 2.0
var maxhp: float = 2.0
var base_speed: float = 120.0
var fence_dps: float = 4.0
var flash: float = 0.0
var kb: Vector2 = Vector2.ZERO
var stun: float = 0.0
var fleeing: bool = false
var hit_cd: float = 0.0
var slow: float = 0.0
var tgt: Sheep = null
var carry: Sheep = null
var tt: float = 0.0
var zig: float = 0.0
var r: float = 6.0
var spr: AnimatedSprite2D
var shadow: Sprite2D

const KINDS: Dictionary = {
	"fox": {"cell": 52, "scale": 0.62, "r": 6.0, "hp": 2.0, "spd": 125.0, "dps": 4.0, "sh": 0.4},
	"wolf": {"cell": 76, "scale": 0.5, "r": 9.0, "hp": 5.0, "spd": 108.0, "dps": 11.0, "sh": 0.6},
	"bear": {"cell": 76, "scale": 0.8, "r": 15.0, "hp": 24.0, "spd": 58.0, "dps": 26.0, "sh": 1.0},
}

func setup(k: String, frames: SpriteFrames, shadow_tex: Texture2D, hp_mult: float) -> void:
	kind = k
	var d: Dictionary = KINDS[k]
	r = d["r"]
	maxhp = float(d["hp"]) * hp_mult
	hp = maxhp
	base_speed = d["spd"]
	fence_dps = d["dps"]
	zig = randf() * TAU
	shadow = Sprite2D.new()
	shadow.texture = shadow_tex
	shadow.scale = Vector2(float(d["sh"]), float(d["sh"]) * 0.42)
	shadow.show_behind_parent = true
	add_child(shadow)
	spr = AnimatedSprite2D.new()
	spr.sprite_frames = frames
	spr.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	var sc: float = d["scale"]
	spr.scale = Vector2(sc, sc)
	spr.offset = Vector2(0, -float(d["cell"]) * 0.27)
	spr.play("idle_east")
	add_child(spr)

func animate(dt: float) -> void:
	var speed: float = vel.length() + kb.length() * 0.3
	var row: String = U.row_for(vel, true)
	if absf(vel.x) > 8.0:
		face = 1 if vel.x > 0.0 else -1
	var a: String = ("walk_" if speed > 8.0 else "idle_") + row
	if spr.animation != a:
		spr.play(a)
	spr.flip_h = (face < 0 and row.ends_with("east"))
	spr.speed_scale = clampf(speed / 100.0, 0.6, 2.4)
	flash = maxf(0.0, flash - dt)
	var f: float = 1.0 + flash * 7.0
	spr.self_modulate = Color(f, f, f, 0.7 if fleeing else 1.0)
