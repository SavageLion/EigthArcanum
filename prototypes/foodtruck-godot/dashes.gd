extends Node2D
# Dashed centre line that follows the road curve.

var curve: Curve2D
var length := 0.0

func _draw() -> void:
	var off := 0.0
	while off < length:
		draw_line(curve.sample_baked(off), curve.sample_baked(fmod(off + 18.0, length)), Color("#d6d2a0"), 3.0)
		off += 42.0
