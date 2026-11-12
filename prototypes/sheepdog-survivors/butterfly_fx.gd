class_name Butterfly
extends Node2D
# A small flat-coloured butterfly that wanders around a home spot.

var home: Vector2 = Vector2.ZERO
var col: Color = Color(1.0, 0.85, 0.3)
var t: float = 0.0
var target: Vector2 = Vector2.ZERO
var heading: float = 0.0
var speed: float = 22.0

func _ready() -> void:
	t = randf() * 10.0
	target = home

func _process(delta: float) -> void:
	t += delta
	if position.distance_to(target) < 12.0:
		target = home + Vector2(randf_range(-110.0, 110.0), randf_range(-80.0, 80.0))
	var d: Vector2 = target - position
	heading = lerp_angle(heading, d.angle(), minf(1.0, delta * 2.5))
	position += Vector2.from_angle(heading) * speed * delta
	queue_redraw()

func _draw() -> void:
	var flap: float = absf(sin(t * 16.0))
	var wy: float = -9.0 + sin(t * 3.0) * 2.0
	var w: float = 2.0 + 4.0 * flap
	var dark: Color = col.darkened(0.35)
	draw_circle(Vector2(0, wy + 14.0), 2.4, Color(0, 0, 0, 0.12))
	draw_colored_polygon(PackedVector2Array([Vector2(0, wy), Vector2(-w, wy - 4.0), Vector2(-w * 1.1, wy + 1.0), Vector2(-w * 0.5, wy + 3.0)]), col)
	draw_colored_polygon(PackedVector2Array([Vector2(0, wy), Vector2(w, wy - 4.0), Vector2(w * 1.1, wy + 1.0), Vector2(w * 0.5, wy + 3.0)]), col)
	draw_line(Vector2(0, wy - 3.0), Vector2(0, wy + 3.0), dark, 1.5)
