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

func setup(frames: SpriteFrames, shadow_tex: Texture2D) -> void:
	shadow = Sprite2D.new()
	shadow.texture = shadow_tex
	shadow.scale = Vector2(0.55, 0.22)
	shadow.show_behind_parent = true
	add_child(shadow)
	spr = AnimatedSprite2D.new()
	spr.sprite_frames = frames
	spr.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	spr.scale = Vector2(0.74, 0.74)
	spr.offset = Vector2(0, -14)
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
	var row: String = U.row_for(vel, true)
	if absf(vel.x) > 10.0:
		face = 1 if vel.x > 0.0 else -1
	var moving: bool = speed > 14.0
	var a: String = ("walk_" if moving else "idle_") + row
	if spr.animation != a:
		spr.play(a)
	spr.flip_h = (face < 0 and (row == "east" or row.ends_with("east")))
	spr.speed_scale = clampf(speed / 120.0, 0.6, 2.2)
	var lowered: float = 0.82 if crouch else 1.0
	squash = move_toward(squash, 0.0, dt * 4.0)
	var sq: float = 1.0 + squash * 0.2
	spr.scale = Vector2(0.74 / sq, 0.74 * lowered * sq)
	dust.emitting = speed > 140.0
	dust.position = Vector2(-face * 6.0, 0)
