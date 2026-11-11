class_name Hud
extends Control
# All on-screen UI, drawn by hand: top bar, sheep counter, stamina, stick, buttons, pings, banner, result card.

var main: Node2D
var font: Font = ThemeDB.fallback_font

const INK := Color(0.13, 0.09, 0.08, 0.78)
const CREAM := Color(1.0, 0.95, 0.82)
const GOLD := Color(1.0, 0.82, 0.36)

func _panel(r: Rect2, col: Color = INK) -> void:
	var sb := StyleBoxFlat.new()
	sb.bg_color = col
	sb.set_corner_radius_all(10)
	sb.border_color = Color(1, 0.9, 0.7, 0.25)
	sb.set_border_width_all(2)
	draw_style_box(sb, r)

func _text(s: String, p: Vector2, size: int, col: Color = CREAM, w: float = -1.0, al: int = HORIZONTAL_ALIGNMENT_LEFT) -> void:
	draw_string(font, p + Vector2(1, 2), s, al, w, size, Color(0, 0, 0, 0.55))
	draw_string(font, p, s, al, w, size, col)

func _world_to_screen(p: Vector2) -> Vector2:
	return main.get_viewport().get_canvas_transform() * p

func _draw() -> void:
	if main == null or main.dog == null:
		return
	var v: Vector2 = main.vp()
	# top bar
	_panel(Rect2(8, 6, 250, 32))
	var pct: float = 0.0
	_text("SHEEP  %d / %d" % [main.penned, main.need], Vector2(18, 28), 17)
	var secs: int = int(ceil(main.t_left))
	_panel(Rect2(v.x - 118, 6, 110, 32))
	_text("%d:%02d" % [secs / 60, secs % 60], Vector2(v.x - 118, 29), 19, CREAM if secs > 20 else Color(1.0, 0.5, 0.4), 110.0, HORIZONTAL_ALIGNMENT_CENTER)
	if main.penned >= main.need and main.state == "play":
		var fr: Rect2 = main.finish_rect()
		_panel(fr, Color(0.25, 0.5, 0.2, 0.9))
		_text("END DAY", fr.position + Vector2(0, 21), 16, CREAM, fr.size.x, HORIZONTAL_ALIGNMENT_CENTER)
	# stamina
	var sr := Rect2(18, 46, 150, 10)
	draw_rect(sr, Color(0, 0, 0, 0.5))
	var sf: float = main.dog.stam / main.dog.stam_max
	var sc: Color = Color(0.95, 0.45, 0.35) if main.dog.winded else Color(0.55, 0.85, 0.4)
	draw_rect(Rect2(sr.position, Vector2(sr.size.x * sf, sr.size.y)), sc)
	draw_rect(sr, Color(1, 0.9, 0.7, 0.35), false, 1.0)
	# off-screen pings for seen-but-far sheep and unseen pinged ones
	var cen: Vector2 = v / 2.0
	for s in main.sheep:
		var sh: Sheep = s
		if sh.in_pen or sh.carried or sh.hidden_grass:
			continue
		var sp: Vector2 = _world_to_screen(sh.position)
		if sp.x > 20 and sp.x < v.x - 20 and sp.y > 50 and sp.y < v.y - 20:
			continue
		if not sh.seen and sh.ping <= 0.0:
			continue
		var d: Vector2 = (sp - cen)
		var k: float = minf((v.x / 2.0 - 26.0) / maxf(absf(d.x), 1.0), (v.y / 2.0 - 30.0) / maxf(absf(d.y), 1.0))
		var q: Vector2 = cen + d * k
		var a: float = d.angle()
		var pts := PackedVector2Array([q + Vector2.from_angle(a) * 10.0, q + Vector2.from_angle(a + 2.5) * 9.0, q + Vector2.from_angle(a - 2.5) * 9.0])
		draw_colored_polygon(pts, Color(1.0, 0.95, 0.8, 0.85))
	# popups
	for pu in main.popups:
		var sp2: Vector2 = _world_to_screen(pu["pos"])
		var t: float = float(pu["t"])
		sp2.y -= (1.0 - t) * 22.0
		var col: Color = pu["col"]
		col.a = minf(1.0, t * 2.5)
		_text(String(pu["s"]), sp2 - Vector2(40, 0), 14, col, 80.0, HORIZONTAL_ALIGNMENT_CENTER)
	# stick
	if main.stick_on:
		draw_circle(main.stick_origin, 62.0, Color(1, 1, 1, 0.10))
		draw_arc(main.stick_origin, 62.0, 0.0, TAU, 40, Color(1, 0.95, 0.8, 0.35), 2.0, true)
		draw_circle(main.stick_pos, 24.0, Color(1, 0.95, 0.8, 0.45))
	# buttons
	_button(0, "BARK", main.dog.bark_cd > 0.0, 1.0 - main.dog.bark_cd / 2.4, false)
	_button(1, "CALM", false, 1.0, main.calm_held or main.dog.crouch)
	_button(2, "SPRINT", main.dog.winded, 1.0, main.sprint_held)
	# banner
	if main.banner_t > 0.0 and main.state == "play":
		var ba: float = minf(1.0, main.banner_t)
		_panel(Rect2(v.x / 2.0 - 190, 70, 380, 38), Color(0.13, 0.09, 0.08, 0.7 * ba))
		_text(main.banner, Vector2(v.x / 2.0 - 190, 95), 18, Color(CREAM, ba), 380.0, HORIZONTAL_ALIGNMENT_CENTER)
	# result
	if main.state == "result":
		draw_rect(Rect2(Vector2.ZERO, v), Color(0.05, 0.03, 0.02, 0.55))
		var r := Rect2(v.x / 2.0 - 190, v.y / 2.0 - 120, 380, 240)
		_panel(r, Color(0.2, 0.14, 0.1, 0.96))
		var ok: bool = bool(main.result["ok"])
		_text("DAY WON" if ok else "DAY LOST", r.position + Vector2(0, 52), 34, GOLD if ok else Color(1.0, 0.5, 0.42), r.size.x, HORIZONTAL_ALIGNMENT_CENTER)
		_text("%d of %d sheep safe in the pen" % [main.result["penned"], main.result["total"]], r.position + Vector2(0, 98), 18, CREAM, r.size.x, HORIZONTAL_ALIGNMENT_CENTER)
		_text("needed %d   ·   lost %d" % [main.result["need"], main.result["lost"]], r.position + Vector2(0, 126), 16, Color(CREAM, 0.8), r.size.x, HORIZONTAL_ALIGNMENT_CENTER)
		_text("tap to play again", r.position + Vector2(0, 196), 18, GOLD, r.size.x, HORIZONTAL_ALIGNMENT_CENTER)

func _button(i: int, label: String, dim: bool, fill: float, on: bool) -> void:
	var p: Vector2 = main.btn_pos(i)
	var col: Color = Color(0.13, 0.09, 0.08, 0.7)
	if on:
		col = Color(0.45, 0.32, 0.12, 0.85)
	draw_circle(p, main.BTN_R, col)
	draw_arc(p, main.BTN_R, 0.0, TAU, 40, Color(1, 0.9, 0.7, 0.5 if not dim else 0.2), 2.5, true)
	if dim and fill < 1.0:
		draw_arc(p, main.BTN_R - 5.0, -PI / 2.0, -PI / 2.0 + TAU * clampf(fill, 0.0, 1.0), 40, GOLD, 4.0, true)
	_text(label, p + Vector2(-main.BTN_R, 6), 16, CREAM if not dim else Color(CREAM, 0.5), main.BTN_R * 2.0, HORIZONTAL_ALIGNMENT_CENTER)
