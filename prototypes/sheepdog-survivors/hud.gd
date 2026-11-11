class_name Hud
extends Control
# All on-screen UI, drawn by hand.

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

func _w2s(p: Vector2) -> Vector2:
	return main.get_viewport().get_canvas_transform() * p

func _bar(r: Rect2, frac: float, col: Color) -> void:
	draw_rect(r, Color(0, 0, 0, 0.55))
	draw_rect(Rect2(r.position, Vector2(r.size.x * clampf(frac, 0.0, 1.0), r.size.y)), col)
	draw_rect(r, Color(1, 0.9, 0.7, 0.35), false, 1.0)

func _draw() -> void:
	if main == null or main.dog == null:
		return
	var v: Vector2 = main.vp()
	# top left: level and xp
	_panel(Rect2(8, 6, 230, 54))
	_text("LV %d" % main.level, Vector2(18, 28), 17, GOLD)
	_bar(Rect2(70, 15, 158, 10), main.xp / main.xp_need, Color(0.55, 0.85, 0.4))
	_text("%d in the pen" % main.pen_total, Vector2(18, 52), 12, Color(CREAM, 0.85))
	# stamina
	_bar(Rect2(70, 31, 158, 7), main.dog.stam / main.dog.stam_max, Color(0.95, 0.45, 0.35) if main.dog.winded else Color(0.45, 0.75, 0.9))
	# top centre: wave
	var left: int = int(ceil(main.WAVE_LEN - main.wave_t))
	_panel(Rect2(v.x / 2.0 - 90, 6, 180, 32))
	_text("WAVE %d / %d   %d" % [main.wave, main.LAST_WAVE, left], Vector2(v.x / 2.0 - 90, 28), 16, CREAM, 180.0, HORIZONTAL_ALIGNMENT_CENTER)
	# top right: fence health (weakest piece)
	var worst: float = 1.0
	for w in main.world.walls:
		if w["pen"]:
			worst = minf(worst, float(w["hp"]) / float(w["max"]))
	_panel(Rect2(v.x - 190, 6, 182, 32))
	_text("FENCE", Vector2(v.x - 182, 28), 13, CREAM)
	_bar(Rect2(v.x - 130, 15, 114, 12), worst, Color(0.55, 0.85, 0.4) if worst > 0.5 else (Color(0.95, 0.75, 0.3) if worst > 0.25 else Color(0.95, 0.4, 0.35)))
	# fence bars over damaged pieces
	for w in main.world.walls:
		if not w["pen"] or float(w["hp"]) >= float(w["max"]) - 0.5:
			continue
		var mid: Vector2 = _w2s(((w["a"] as Vector2) + (w["b"] as Vector2)) / 2.0) + Vector2(0, -16)
		_bar(Rect2(mid - Vector2(18, 0), Vector2(36, 5)), float(w["hp"]) / float(w["max"]), Color(0.95, 0.5, 0.35))
	# raider health bars for the big ones
	for f in main.foxes:
		var fx: Fox = f
		if fx.maxhp > 3.0 and not fx.fleeing and fx.hp < fx.maxhp:
			var q: Vector2 = _w2s(fx.position) + Vector2(0, -34)
			_bar(Rect2(q - Vector2(16, 0), Vector2(32, 4)), fx.hp / fx.maxhp, Color(0.9, 0.4, 0.35))
	# off-screen raider arrows
	var cen: Vector2 = v / 2.0
	for f in main.foxes:
		var fx2: Fox = f
		if fx2.fleeing:
			continue
		var sp: Vector2 = _w2s(fx2.position)
		if sp.x > 20 and sp.x < v.x - 20 and sp.y > 50 and sp.y < v.y - 20:
			continue
		var d: Vector2 = sp - cen
		var k: float = minf((v.x / 2.0 - 26.0) / maxf(absf(d.x), 1.0), (v.y / 2.0 - 30.0) / maxf(absf(d.y), 1.0))
		var q2: Vector2 = cen + d * k
		var a: float = d.angle()
		draw_colored_polygon(PackedVector2Array([q2 + Vector2.from_angle(a) * 10.0, q2 + Vector2.from_angle(a + 2.5) * 9.0, q2 + Vector2.from_angle(a - 2.5) * 9.0]), Color(1.0, 0.45, 0.35, 0.9))
	# popups
	for pu in main.popups:
		var sp2: Vector2 = _w2s(pu["pos"])
		var t: float = float(pu["t"])
		sp2.y -= (1.0 - t) * 22.0
		var col: Color = pu["col"]
		col.a = minf(1.0, t * 2.5)
		_text(String(pu["s"]), sp2 - Vector2(40, 0), 14, col, 80.0, HORIZONTAL_ALIGNMENT_CENTER)
	# stick and buttons
	if main.stick_on:
		draw_circle(main.stick_origin, 62.0, Color(1, 1, 1, 0.10))
		draw_arc(main.stick_origin, 62.0, 0.0, TAU, 40, Color(1, 0.95, 0.8, 0.35), 2.0, true)
		draw_circle(main.stick_pos, 24.0, Color(1, 0.95, 0.8, 0.45))
	_button(0, "BARK", main.dog.bark_cd > 0.0, 1.0 - main.dog.bark_cd / main.bark_cd(), false)
	_button(1, "CALM", false, 1.0, main.calm_held or main.dog.crouch)
	_button(2, "SPRINT", main.dog.winded, 1.0, main.sprint_held)
	# banner
	if main.banner_t > 0.0 and main.state == "play":
		var ba: float = minf(1.0, main.banner_t)
		_panel(Rect2(v.x / 2.0 - 190, 70, 380, 38), Color(0.13, 0.09, 0.08, 0.7 * ba))
		_text(main.banner, Vector2(v.x / 2.0 - 190, 95), 18, Color(CREAM, ba), 380.0, HORIZONTAL_ALIGNMENT_CENTER)
	if main.state == "levelup":
		draw_rect(Rect2(Vector2.ZERO, v), Color(0.05, 0.03, 0.02, 0.6))
		_text("LEVEL UP  -  pick one", Vector2(0, v.y / 2.0 - 112), 24, GOLD, v.x, HORIZONTAL_ALIGNMENT_CENTER)
		for i in main.choices.size():
			var r: Rect2 = main.card_rect(i)
			var pk: Dictionary = main.choices[i]
			_panel(r, Color(0.2, 0.14, 0.1, 0.96))
			var lv: int = main.pl(String(pk["id"]))
			_text(String(pk["name"]), r.position + Vector2(0, 38), 20, GOLD, r.size.x, HORIZONTAL_ALIGNMENT_CENTER)
			_text("Lv %d -> %d" % [lv, lv + 1] if lv > 0 else "NEW", r.position + Vector2(0, 62), 14, Color(0.6, 1.0, 0.6), r.size.x, HORIZONTAL_ALIGNMENT_CENTER)
			draw_multiline_string(font, r.position + Vector2(14, 92), String(pk["desc"]), HORIZONTAL_ALIGNMENT_CENTER, r.size.x - 28.0, 15, -1, CREAM)
			_text("tap or press %d" % (i + 1), r.position + Vector2(0, 164), 12, Color(CREAM, 0.6), r.size.x, HORIZONTAL_ALIGNMENT_CENTER)
	if main.state == "result":
		draw_rect(Rect2(Vector2.ZERO, v), Color(0.05, 0.03, 0.02, 0.55))
		var rr := Rect2(v.x / 2.0 - 200, v.y / 2.0 - 125, 400, 250)
		_panel(rr, Color(0.2, 0.14, 0.1, 0.96))
		var won: bool = String(main.result["why"]) == "won"
		_text("THE PEN HELD!" if won else "THE FENCE BROKE", rr.position + Vector2(0, 52), 30, GOLD if won else Color(1.0, 0.5, 0.42), rr.size.x, HORIZONTAL_ALIGNMENT_CENTER)
		_text("Reached wave %d  ·  level %d" % [main.result["wave"], main.result["level"]], rr.position + Vector2(0, 98), 17, CREAM, rr.size.x, HORIZONTAL_ALIGNMENT_CENTER)
		_text("%d animals herded  ·  %d raiders shooed" % [main.result["herded"], main.result["defeated"]], rr.position + Vector2(0, 126), 15, Color(CREAM, 0.85), rr.size.x, HORIZONTAL_ALIGNMENT_CENTER)
		_text("tap to play again", rr.position + Vector2(0, 208), 18, GOLD, rr.size.x, HORIZONTAL_ALIGNMENT_CENTER)

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
