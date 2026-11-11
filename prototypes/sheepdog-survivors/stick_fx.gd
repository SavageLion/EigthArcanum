class_name StickFx
extends Node2D
# A thrown stick that spins out and comes back.

var spin: float = 0.0
var back: bool = false
var vel: Vector2 = Vector2.ZERO
var t: float = 0.0
var hit: Array = []

func _process(delta: float) -> void:
	spin += delta * 18.0
	queue_redraw()

func _draw() -> void:
	draw_circle(Vector2(0, -6), 14.0, Color(1.0, 0.95, 0.7, 0.18))
	draw_set_transform(Vector2(0, -6), spin, Vector2(1.9, 1.9))
	draw_line(Vector2(-8, 0), Vector2(8, 0), Color(0.3, 0.17, 0.08), 4.0)
	draw_line(Vector2(-8, -1), Vector2(8, -1), Color(0.75, 0.5, 0.25), 2.0)
	draw_line(Vector2(2, 0), Vector2(5, -4), Color(0.5, 0.3, 0.14), 2.0)
