class_name RingFx
extends Node2D
# An expanding ring on the ground (bark, swipe, honk, poof).

var maxr: float = 150.0
var dur: float = 0.5
var col: Color = Color(1.0, 0.95, 0.75)
var width: float = 3.0
var t: float = 0.0

func _process(delta: float) -> void:
	t += delta / dur
	if t >= 1.0:
		queue_free()
		return
	queue_redraw()

func _draw() -> void:
	var k: float = 1.0 - pow(1.0 - t, 2.0)
	var a: float = (1.0 - t) * 0.7
	draw_arc(Vector2.ZERO, maxr * k, 0.0, TAU, 56, Color(col, a), width, true)
	draw_arc(Vector2.ZERO, maxr * k * 0.92, 0.0, TAU, 56, Color(col, a * 0.5), width * 2.0, true)
