class_name Pup
extends Mover
# The sheepdog companion: trots along behind the wizard.

var spr: AnimatedSprite2D
var shadow: Sprite2D
var heading: Vector2 = Vector2.DOWN

func setup(frames: SpriteFrames, shadow_tex: Texture2D) -> void:
	shadow = Sprite2D.new()
	shadow.texture = shadow_tex
	shadow.scale = Vector2(0.5, 0.2)
	shadow.show_behind_parent = true
	add_child(shadow)
	spr = AnimatedSprite2D.new()
	spr.sprite_frames = frames
	spr.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	spr.scale = Vector2(0.95, 0.95)
	spr.offset = Vector2(0, -14)
	spr.play("idle_south")
	add_child(spr)

func follow(target: Vector2, dt: float) -> void:
	var d: Vector2 = target - position
	var l: float = d.length()
	var want: Vector2 = Vector2.ZERO
	if l > 18.0:
		want = d / l * minf(240.0, l * 3.2)
	vel += (want - vel) * minf(1.0, dt * 7.0)
	position += vel * dt

func animate(_dt: float) -> void:
	var speed: float = vel.length()
	if speed > 10.0:
		heading = vel / speed
	var a: String = ("walk_" if speed > 14.0 else "idle_") + U.dir8(heading)
	if spr.animation != a:
		spr.play(a)
	spr.speed_scale = clampf(speed / 90.0, 0.6, 2.2)
