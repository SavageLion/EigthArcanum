class_name Fox
extends Mover
# Any wild attacker: fox (steals sheep), wolf (gnaws the fence), bear (big, slow, gnaws hard).

var kind: String = "fox"
var heading: Vector2 = Vector2.RIGHT
var hp: float = 2.0
var maxhp: float = 2.0
var base_speed: float = 120.0
var fence_dps: float = 4.0
var flash: float = 0.0
var kb: Vector2 = Vector2.ZERO
var stun: float = 0.0
var fleeing: bool = false
var hit_cd: float = 0.0
var bite_cd: float = 0.0
var atk_cd: float = 0.0
var mode: String = "chase"
var dash_dir: Vector2 = Vector2.ZERO
var hit_done: bool = false
var slow: float = 0.0
var tgt: Sheep = null
var carry: Sheep = null
var tt: float = 0.0
var zig: float = 0.0
var r: float = 6.0
var spr: AnimatedSprite2D
var shadow: Sprite2D

const KINDS: Dictionary = {
	"fox": {"set": "fox8", "target": 0.92, "r": 10.0, "hp": 6.0, "spd": 125.0, "dps": 4.0},
	"imp": {"set": "imp8", "target": 0.78, "r": 9.0, "hp": 10.0, "spd": 140.0, "dps": 0.0},
	"wolf": {"set": "wolf_b", "target": 1.0, "r": 11.0, "hp": 16.0, "spd": 108.0, "dps": 11.0},
	"bear": {"set": "bear_b", "target": 1.45, "r": 17.0, "hp": 80.0, "spd": 58.0, "dps": 26.0},
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
	var ft: Dictionary = U.fit(String(d["set"]), "h", float(d["target"]) * U.WH)
	shadow = Sprite2D.new()
	shadow.texture = shadow_tex
	var sw: float = float(ft["w"]) if not ft.is_empty() else 40.0
	shadow.scale = Vector2(sw / 64.0 * 1.3, sw / 64.0 * 0.55)
	shadow.show_behind_parent = true
	add_child(shadow)
	spr = AnimatedSprite2D.new()
	spr.sprite_frames = frames
	spr.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	if not ft.is_empty():
		var sc: float = ft["scale"]
		spr.scale = Vector2(sc, sc)
		spr.offset = ft["offset"]
	spr.play("idle_east")
	add_child(spr)

func animate(dt: float) -> void:
	var speed: float = vel.length() + kb.length() * 0.3
	if vel.length() > 8.0:
		heading = vel.normalized()
	var a: String = ("walk_" if speed > 8.0 else "idle_") + U.dir8(heading)
	if spr.animation != a:
		spr.play(a)
	spr.speed_scale = clampf(speed / 100.0, 0.6, 2.4)
	flash = maxf(0.0, flash - dt)
	var fl: float = 1.0 + flash * 7.0
	spr.self_modulate = Color(fl, fl, fl, 0.7 if fleeing else 1.0)
