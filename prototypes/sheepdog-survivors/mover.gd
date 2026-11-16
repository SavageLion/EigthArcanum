class_name Mover
extends Node2D
var vel: Vector2 = Vector2.ZERO
var face: int = 1
var layer: int = 0
var elev: float = 0.0
static var char_k: float = 1.0

func _enter_tree() -> void:
	scale = Vector2(char_k, char_k)
