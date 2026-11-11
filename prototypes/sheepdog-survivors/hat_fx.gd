class_name Hat
extends Node2D
# The dog's wizard hat.

var t: float = 0.0

func _process(delta: float) -> void:
	t += delta
	queue_redraw()

func _draw() -> void:
	var sway: float = sin(t * 3.0) * 1.2
	# brim
	draw_colored_polygon(PackedVector2Array([Vector2(-9, 1), Vector2(-5, -1.5), Vector2(5, -1.5), Vector2(9, 1), Vector2(5, 3), Vector2(-5, 3)]), Color(0.22, 0.16, 0.5))
	# cone
	var tip: Vector2 = Vector2(4.0 + sway * 2.0, -15.0)
	draw_colored_polygon(PackedVector2Array([Vector2(-6, 0), tip, Vector2(6, 0)]), Color(0.34, 0.26, 0.72))
	draw_colored_polygon(PackedVector2Array([Vector2(-6, 0), tip, Vector2(0, 0)]), Color(0.42, 0.34, 0.82))
	draw_line(Vector2(-6, -0.5), Vector2(6, -0.5), Color(1.0, 0.82, 0.3), 1.6)
	var sc: Vector2 = Vector2(0.5, -6.0)
	draw_circle(sc, 1.7, Color(1.0, 0.9, 0.4))
	draw_circle(Vector2(5.0 + sway * 2.0, -15.0), 1.3, Color(1.0, 0.9, 0.4))
