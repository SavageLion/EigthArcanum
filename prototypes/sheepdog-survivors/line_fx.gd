class_name LineFx
extends Node2D
# A short-lived streak: arrows and lightning.

var pts: PackedVector2Array = PackedVector2Array()
var col: Color = Color(1, 1, 1)
var dur: float = 0.18
var width: float = 3.0
var t: float = 0.0

func _process(delta: float) -> void:
	t += delta / dur
	if t >= 1.0:
		queue_free()
		return
	queue_redraw()

func _draw() -> void:
	if pts.size() < 2:
		return
	var a: float = 1.0 - t
	draw_polyline(pts, Color(col, a * 0.35), width * 3.0, true)
	draw_polyline(pts, Color(col, a), width, true)
	draw_polyline(pts, Color(1, 1, 1, a), maxf(1.0, width * 0.4), true)
