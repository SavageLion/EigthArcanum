class_name Bridge
extends Node2D
# A wooden plank bridge over the river (drawn in code until it has proper art).

var size: Vector2 = Vector2(190, 60)

func _draw() -> void:
	var w: float = size.x
	var h: float = size.y
	draw_rect(Rect2(-2, 4, w + 4, h + 6), Color(0, 0, 0, 0.22))
	draw_rect(Rect2(0, 0, w, h), Color(0.56, 0.39, 0.2))
	var x: float = 0.0
	var i: int = 0
	while x < w:
		var c: Color = Color(0.62, 0.44, 0.24) if i % 2 == 0 else Color(0.5, 0.34, 0.18)
		draw_rect(Rect2(x, 4, 9.0, h - 8), c)
		draw_line(Vector2(x + 9.0, 4), Vector2(x + 9.0, h - 4), Color(0.3, 0.2, 0.1), 1.0)
		x += 10.0
		i += 1
	draw_rect(Rect2(0, 0, w, 6), Color(0.38, 0.25, 0.12))
	draw_rect(Rect2(0, h - 6, w, 6), Color(0.38, 0.25, 0.12))
	for px in [4.0, w / 2.0, w - 8.0]:
		draw_rect(Rect2(px - 3.0, -6, 7, 10), Color(0.3, 0.2, 0.1))
		draw_rect(Rect2(px - 3.0, h - 4, 7, 10), Color(0.3, 0.2, 0.1))
