class_name Pad
extends Node2D
# A build spot around the castle. Shows a glowing ring when empty, level pips when built.

var kind: String = ""
var lv: int = 0
var near: bool = false
var t: float = 0.0
var sprite: Sprite2D = null
var cd: float = 0.0

func _process(delta: float) -> void:
	t += delta
	queue_redraw()

func _draw() -> void:
	if kind == "":
		var a: float = 0.35 + 0.15 * sin(t * 3.0) + (0.35 if near else 0.0)
		draw_arc(Vector2.ZERO, 17.0, 0.0, TAU, 28, Color(1.0, 0.85, 0.4, a), 2.5, true)
		draw_arc(Vector2.ZERO, 11.0, 0.0, TAU, 20, Color(1.0, 0.85, 0.4, a * 0.6), 1.5, true)
		draw_line(Vector2(-4, 0), Vector2(4, 0), Color(1.0, 0.85, 0.4, a), 2.0)
		draw_line(Vector2(0, -4), Vector2(0, 4), Color(1.0, 0.85, 0.4, a), 2.0)
	else:
		for i in lv:
			draw_circle(Vector2((float(i) - float(lv - 1) / 2.0) * 7.0, 9.0), 2.4, Color(1.0, 0.85, 0.3))
		if near:
			draw_arc(Vector2.ZERO, 22.0, 0.0, TAU, 28, Color(1.0, 0.85, 0.4, 0.6), 2.0, true)
