class_name Slash
extends Node2D
# A bright crescent swipe in front of the dog.

var ang: float = 0.0
var rad: float = 40.0
var t: float = 0.0

func _process(delta: float) -> void:
	t += delta / 0.22
	if t >= 1.0:
		queue_free()
		return
	queue_redraw()

func _draw() -> void:
	var a: float = 1.0 - t
	var r: float = rad * (0.75 + 0.35 * t)
	draw_arc(Vector2.ZERO, r, ang - 1.1, ang + 1.1, 24, Color(1.0, 0.97, 0.8, a), 9.0, true)
	draw_arc(Vector2.ZERO, r - 3.0, ang - 0.9, ang + 0.9, 24, Color(1.0, 0.8, 0.4, a * 0.8), 4.0, true)
