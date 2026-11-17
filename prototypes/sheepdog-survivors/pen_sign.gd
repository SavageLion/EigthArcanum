class_name PenSign
extends Node2D
# A pen's floor patch and its sign. The floor is a dirt patch with a darker rim; the sign (mode "sign") hangs over the top fence
# and shows which animals the pen takes and how many are in.

var rect: Rect2 = Rect2()
var label: String = ""
var col: Color = Color(1, 1, 1)
var mode: String = "floor"
var n: int = 0
var total: int = 0
var size: Vector2 = Vector2(80.0, 80.0)

func _process(_d: float) -> void:
	if mode == "ring":
		queue_redraw()

func _draw() -> void:
	if mode == "crown":
		var gold := Color(1.0, 0.85, 0.25)
		var pts := PackedVector2Array()
		for i in 10:
			var rr: float = 9.0 if i % 2 == 0 else 4.0
			pts.append(Vector2.from_angle(-PI / 2.0 + float(i) * PI / 5.0) * rr)
		draw_colored_polygon(pts, gold)
		draw_polyline(pts + PackedVector2Array([pts[0]]), Color(0.4, 0.25, 0.05), 1.5)
		return
	if mode == "barrier":
		draw_rect(Rect2(-40.0, -26.0, 7.0, 38.0), Color(0.35, 0.22, 0.12))
		draw_rect(Rect2(33.0, -26.0, 7.0, 38.0), Color(0.35, 0.22, 0.12))
		draw_line(Vector2(-36.0, -14.0), Vector2(36.0, -10.0), Color(0.85, 0.7, 0.4), 4.0)
		draw_line(Vector2(-36.0, 0.0), Vector2(36.0, 4.0), Color(0.85, 0.7, 0.4), 4.0)
		draw_rect(Rect2(-9.0, -12.0, 18.0, 15.0), Color(0.9, 0.75, 0.2))
		draw_arc(Vector2(0.0, -12.0), 6.0, PI, TAU, 12, Color(0.75, 0.75, 0.8), 3.0)
		return
	if mode == "ring":
		var pulse: float = 0.5 + 0.5 * sin(float(Time.get_ticks_msec()) * 0.004)
		draw_arc(Vector2.ZERO, 46.0 + 8.0 * pulse, 0.0, TAU, 40, Color(col, 0.5 + 0.4 * pulse), 4.0, true)
		draw_arc(Vector2.ZERO, 30.0, 0.0, TAU, 32, Color(col, 0.35), 2.0, true)
		return
	if mode == "marker":
		draw_rect(Rect2(-size / 2.0, size), col)
		return
	if mode == "floor":
		var r: Rect2 = Rect2(rect.position - position, rect.size).grow(10.0)
		draw_rect(r.grow(5.0), Color(0.26, 0.2, 0.1, 0.55))
		draw_rect(r, Color(0.72, 0.58, 0.36, 0.95))
		for i in 26:
			var h: float = fposmod(sin(float(i) * 12.9898 + rect.position.x * 0.013) * 43758.5453, 1.0)
			var h2: float = fposmod(sin(float(i) * 78.233 + rect.position.y * 0.017) * 43758.5453, 1.0)
			draw_circle(r.position + Vector2(h * r.size.x, h2 * r.size.y), 3.0 + 3.0 * h, Color(0.6, 0.46, 0.27, 0.55))
		return
	if label == "":
		return
	var font: Font = ThemeDB.fallback_font
	var txt: String = label if total <= 0 else "%s  %d/%d" % [label, n, total]
	var w: float = maxf(120.0, font.get_string_size(txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 15).x + 26.0)
	var b := Rect2(-w / 2.0, -64.0, w, 26.0)
	draw_rect(Rect2(-3.0, -40.0, 6.0, 40.0), Color(0.35, 0.24, 0.14))
	draw_rect(b.grow(2.0), Color(0.12, 0.08, 0.06))
	draw_rect(b, col)
	var dark: bool = col.get_luminance() < 0.45
	draw_string(font, b.position + Vector2(0, 19), txt, HORIZONTAL_ALIGNMENT_CENTER, w, 15, Color(1, 1, 1) if dark else Color(0.15, 0.1, 0.07))
