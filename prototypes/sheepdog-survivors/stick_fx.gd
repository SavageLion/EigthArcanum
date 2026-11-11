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
	draw_set_transform(Vector2(0, -6), spin, Vector2.ONE)
	draw_line(Vector2(-8, 0), Vector2(8, 0), Color(0.35, 0.2, 0.1), 4.0)
	draw_line(Vector2(-8, -1), Vector2(8, -1), Color(0.6, 0.4, 0.2), 2.0)
	draw_line(Vector2(2, 0), Vector2(5, -4), Color(0.45, 0.28, 0.12), 2.0)
