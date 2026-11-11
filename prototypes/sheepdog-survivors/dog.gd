class_name Dog
extends Mover

var heading: Vector2 = Vector2.RIGHT
var crouch: bool = false
var walk: bool = false
var stam: float = 100.0
var stam_max: float = 100.0
var winded: bool = false
var bark_cd: float = 0.0
var stun: float = 0.0
var run_phase: float = 0.0
var spr: AnimatedSprite2D
var shadow: Sprite2D
var dust: CPUParticles2D
var squash: float = 0.0
var cast_t: float = 0.0
const SC: float = 0.85

func setup(frames: SpriteFrames, shadow_tex: Texture2D) -> void:
	shadow = Sprite2D.new()
	shadow.texture = shadow_tex
	shadow.scale = Vector2(0.55, 0.22)
	shadow.show_behind_parent = true
	add_child(shadow)
	spr = AnimatedSprite2D.new()
	spr.sprite_frames = frames
	spr.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	spr.scale = Vector2(SC, SC)
	spr.offset = Vector2(0, -26)
	spr.play("idle_east")
	add_child(spr)
	dust = CPUParticles2D.new()
	dust.emitting = false
	dust.amount = 14
	dust.lifetime = 0.5
	dust.direction = Vector2(0, -1)
	dust.spread = 60.0
	dust.initial_velocity_min = 8.0
	dust.initial_velocity_max = 28.0
	dust.gravity = Vector2.ZERO
	dust.scale_amount_min = 1.2
	dust.scale_amount_max = 2.6
	dust.color = Color(0.82, 0.72, 0.5, 0.55)
	dust.show_behind_parent = true
	add_child(dust)

func animate(dt: float) -> void:
	var speed: float = vel.length()
	var moving: bool = speed > 14.0
	cast_t = maxf(0.0, cast_t - dt)
	var dir: String = U.dir8(heading)
	var clip: String = "cast" if cast_t > 0.0 else ("walk" if moving else "idle")
	var a: String = clip + "_" + dir
	if spr.animation != a:
		var keep: int = spr.frame if (clip != "cast" and spr.animation.begins_with(clip)) else 0
		spr.play(a)
		spr.frame = keep
	spr.speed_scale = clampf(speed / 150.0, 0.7, 2.0) if clip == "walk" else 1.0
	var lowered: float = 0.9 if crouch else 1.0
	squash = move_toward(squash, 0.0, dt * 4.0)
	var sq: float = 1.0 + squash * 0.15
	spr.scale = Vector2(SC / sq, SC * lowered * sq)
	spr.modulate = Color(0.75, 0.85, 1.0) if winded else Color(1, 1, 1)
	dust.emitting = speed > 140.0
	dust.position = Vector2(-face * 6.0, 0)
