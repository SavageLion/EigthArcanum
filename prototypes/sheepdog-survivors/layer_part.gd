class_name LayerPart
extends Node2D
# One drawing pass of the layered map (ramps on the ground, hill tops and cliffs, bridge decks).

var map: LayerMap
var mode: String = ""

func _draw() -> void:
	if map != null:
		map.draw_part(self, mode)
