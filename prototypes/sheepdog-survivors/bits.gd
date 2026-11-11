class_name Coin
extends Node2D
# Loot dropped by a defeated raider. Walk near it to collect; spend it on castle defences.

var value: int = 1
var life: float = 28.0
var t: float = 0.0
var fly: bool = false

func _process(delta: float) -> void:
	t += delta
	life -= delta
	queue_redraw()

func _draw() -> void:
	var y: float = -5.0 + sin(t * 5.0) * 1.6
	var a: float = 1.0 if life > 4.0 else (0.5 + 0.5 * sin(t * 18.0))
	var s: float = 1.0 + 0.25 * float(mini(value, 5) - 1) * 0.5
	draw_circle(Vector2(0, y + 6.0), 5.0 * s, Color(0, 0, 0, 0.2 * a))
	draw_circle(Vector2(0, y), 5.0 * s, Color(0.72, 0.5, 0.1, a))
	draw_circle(Vector2(0, y), 4.0 * s, Color(1.0, 0.82, 0.25, a))
	draw_circle(Vector2(-1.2, y - 1.2), 1.6 * s, Color(1.0, 0.97, 0.7, a))
