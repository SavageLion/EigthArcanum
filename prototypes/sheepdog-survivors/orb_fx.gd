class_name Orb
extends Node2D
# A spell projectile: homes in on its target. kind: bolt (violet), fire (orange).

var kind: String = "bolt"
var tgt: Fox = null
var speed: float = 380.0
var life: float = 1.8
var dmg: float = 2.0
var area: float = 0.0
var trail: Array = []
var t: float = 0.0

func _process(delta: float) -> void:
	t += delta
	trail.push_front(position)
	if trail.size() > 7:
		trail.pop_back()
	queue_redraw()

func _draw() -> void:
	var c1: Color = Color(0.75, 0.5, 1.0) if kind == "bolt" else Color(1.0, 0.55, 0.15)
	var c2: Color = Color(1.0, 0.95, 1.0) if kind == "bolt" else Color(1.0, 0.95, 0.6)
	var r: float = 5.0 if kind == "bolt" else 8.0
	for i in range(trail.size() - 1, 0, -1):
		var p: Vector2 = (trail[i] as Vector2) - position + Vector2(0, -7)
		var k: float = 1.0 - float(i) / float(trail.size())
		draw_circle(p, r * k * 0.8, Color(c1, 0.35 * k))
	draw_circle(Vector2(0, -7), r * 1.7, Color(c1, 0.22))
	draw_circle(Vector2(0, -7), r, c1)
	draw_circle(Vector2(0, -7), r * 0.5, c2)
