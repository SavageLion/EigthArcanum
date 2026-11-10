extends Node2D
# Lane dashes along every street and zebra crossings at the junctions.

var city: City

func _draw() -> void:
	for ei in city.edges.size():
		var e: Dictionary = city.edges[ei]
		var off := 90.0
		while off < e["len"] - 90.0:
			draw_line(city.point(ei, off), city.point(ei, off + 18.0), Color("#d6d2a0"), 3.0)
			off += 42.0
		# zebra crossings just short of each end
		for end in [0, 1]:
			var o: float = 74.0 if end == 0 else e["len"] - 74.0
			var c: Vector2 = city.point(ei, o)
			var t: Vector2 = city.tangent(ei, o)
			var nm := Vector2(-t.y, t.x)
			var half: float = e["w"] / 2.0 - 6.0
			var k := -half
			while k <= half:
				draw_line(c + nm * k - t * 6.0, c + nm * k + t * 6.0, Color(0.93, 0.91, 0.83, 0.9), 5.0)
				k += 11.0
