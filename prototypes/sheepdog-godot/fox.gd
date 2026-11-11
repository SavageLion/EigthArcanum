class_name Fox
extends Mover

var raid: bool = false
var scared: float = 0.0
var hes: float = 0.0
var tgt: Sheep = null
var carry: Sheep = null
var wall_i: int = -1
var tt: float = 0.0
var zig: float = 0.0
var r: float = 6.0
var spr: AnimatedSprite2D
var shadow: Sprite2D
var dead: bool = false

func setup(frames: SpriteFrames, shadow_tex: Texture2D) -> void:
	zig = randf() * TAU
	shadow = Sprite2D.new()
	shadow.texture = shadow_tex
	shadow.scale = Vector2(0.4, 0.17)
	shadow.show_behind_parent = true
	add_child(shadow)
	spr = AnimatedSprite2D.new()
	spr.sprite_frames = frames
	spr.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	spr.scale = Vector2(0.62, 0.62)
	spr.offset = Vector2(0, -14)
	spr.play("idle_east")
	add_child(spr)

func animate(_dt: float) -> void:
	var speed: float = vel.length()
	var row: String = U.row_for(vel, true)
	if absf(vel.x) > 8.0:
		face = 1 if vel.x > 0.0 else -1
	var a: String = ("walk_" if speed > 8.0 else "idle_") + row
	if spr.animation != a:
		spr.play(a)
	spr.flip_h = (face < 0 and row.ends_with("east"))
	spr.speed_scale = clampf(speed / 100.0, 0.6, 2.4)
