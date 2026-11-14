class_name Shot
extends Node2D
# A bolt thrown at the wizard: "stun" knocks him senseless for a moment, "curse" silences his bark.

var vel: Vector2 = Vector2.ZERO
var col: Color = Color(1.0, 0.55, 0.15)
var effect: String = "stun"
var life: float = 3.2
var main: Node2D

func _process(delta: float) -> void:
	if main == null or main.state != "play":
		return
	position += vel * delta
	life -= delta
	if main.dog.position.distance_to(position) < 18.0:
		main.shot_hit(effect, position)
		queue_free()
		return
	if life <= 0.0:
		queue_free()
		return
	queue_redraw()

func _draw() -> void:
	draw_circle(Vector2.ZERO, 11.0, Color(col, 0.25))
	draw_circle(Vector2.ZERO, 7.0, col.darkened(0.25))
	draw_circle(Vector2.ZERO, 5.0, col)
	draw_circle(Vector2(-1.5, -1.5), 2.4, col.lightened(0.55))
