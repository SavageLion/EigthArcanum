class_name Berry
extends Node2D
# A berry dropped by a shooed-off raider. Pick it up to mend the fence.

var life: float = 16.0
var t: float = 0.0

func _process(delta: float) -> void:
	t += delta
	life -= delta
	queue_redraw()

func _draw() -> void:
	var y: float = -4.0 + sin(t * 4.0) * 1.5
	var a: float = 1.0 if life > 3.0 else (0.5 + 0.5 * sin(t * 18.0))
	draw_circle(Vector2(0, y + 5.0), 5.0, Color(0, 0, 0, 0.18 * a))
	draw_circle(Vector2(-2, y), 4.0, Color(0.85, 0.18, 0.28, a))
	draw_circle(Vector2(3, y + 1), 3.4, Color(0.95, 0.3, 0.38, a))
	draw_circle(Vector2(-3, y - 1), 1.2, Color(1, 0.8, 0.85, a))
	draw_colored_polygon(PackedVector2Array([Vector2(0, y - 3), Vector2(4, y - 8), Vector2(-1, y - 6)]), Color(0.3, 0.7, 0.3, a))
