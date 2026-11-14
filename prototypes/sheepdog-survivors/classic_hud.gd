class_name ClassicHud
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
	if main.summit_mode and (main.state == "map" or main.state == "pshop" or main.state == "prest" or main.state == "final"):
		_peak_screens(v)
		return
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
	# back to the farm
	_panel(Rect2(8, 92, 96, 28))
	_text("< FARM", Vector2(8, 112), 14, CREAM, 96.0, HORIZONTAL_ALIGNMENT_CENTER)
	# level and xp
	_text("LV %d" % main.run_level, Vector2(18, 76), 14, Color(0.6, 0.9, 1.0))
	draw_rect(Rect2(60, 66, 108, 8), Color(0, 0, 0, 0.5))
	draw_rect(Rect2(60, 66, 108.0 * clampf(main.run_xp / main.xp_need(), 0.0, 1.0), 8), Color(0.45, 0.8, 1.0))
	draw_rect(Rect2(60, 66, 108, 8), Color(1, 0.9, 0.7, 0.35), false, 1.0)
	var py: float = 134.0
	for pk in main.PERKS:
		var lvp: int = main.pl(String(pk["id"]))
		if lvp > 0:
			_text("%s  %d" % [String(pk["name"]), lvp], Vector2(10, py), 12, Color(CREAM, 0.9))
			py += 15.0
	_text(("Stage %d" if main.summit_mode else "Day %d") % main.run_day, Vector2(0, 76), 14, Color(CREAM, 0.8), v.x, HORIZONTAL_ALIGNMENT_CENTER)
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
		var sh: ClassicSheep = s
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
	# level-up
	if main.state == "levelup":
		draw_rect(Rect2(Vector2.ZERO, v), Color(0.04, 0.03, 0.08, 0.82))
		_text("LEVEL UP!  Level %d" % main.run_level, Vector2(0, 62), 30, GOLD, v.x, HORIZONTAL_ALIGNMENT_CENTER)
		_text("Choose a helper", Vector2(0, 92), 16, Color(CREAM, 0.8), v.x, HORIZONTAL_ALIGNMENT_CENTER)
		for i in main.perk_offers.size():
			var pk2: Dictionary = main.perk_offers[i]
			var lv2: int = main.pl(String(pk2["id"]))
			var cr: Rect2 = main.lv_card_rect(i)
			_panel(cr, Color(0.28, 0.2, 0.14, 0.97))
			_text(String(pk2["name"]), cr.position + Vector2(0, 46), 24, GOLD, cr.size.x, HORIZONTAL_ALIGNMENT_CENTER)
			_text("Lv %d > %d" % [lv2, lv2 + 1], cr.position + Vector2(0, 78), 16, Color(0.6, 1.0, 0.6), cr.size.x, HORIZONTAL_ALIGNMENT_CENTER)
			draw_multiline_string(font, cr.position + Vector2(18, 118), String(pk2["desc"]), HORIZONTAL_ALIGNMENT_CENTER, cr.size.x - 36.0, 16, 4, Color(CREAM, 0.92))
			_text("TAP TO CHOOSE", cr.position + Vector2(0, cr.size.y - 20), 14, Color(0.6, 0.9, 1.0), cr.size.x, HORIZONTAL_ALIGNMENT_CENTER)
	# result
	if main.state == "result":
		draw_rect(Rect2(Vector2.ZERO, v), Color(0.05, 0.03, 0.02, 0.55))
		var r := Rect2(v.x / 2.0 - 190, v.y / 2.0 - 120, 380, 240)
		_panel(r, Color(0.2, 0.14, 0.1, 0.96))
		var ok: bool = bool(main.result["ok"])
		_text(("STAGE CLEARED" if main.summit_mode else ("DAY %d WON" % int(main.result["day"]))) if ok else ("THE CLIMB ENDS" if main.summit_mode else "THE RUN ENDS"), r.position + Vector2(0, 52), 34, GOLD if ok else Color(1.0, 0.5, 0.42), r.size.x, HORIZONTAL_ALIGNMENT_CENTER)
		_text("%d of %d sheep safe in the pen" % [main.result["penned"], main.result["total"]], r.position + Vector2(0, 98), 18, CREAM, r.size.x, HORIZONTAL_ALIGNMENT_CENTER)
		_text("needed %d   ·   lost %d" % [main.result["need"], main.result["lost"]], r.position + Vector2(0, 126), 16, Color(CREAM, 0.8), r.size.x, HORIZONTAL_ALIGNMENT_CENTER)
		_text("tap to continue" if main.summit_mode else (("tap for day %d" % (int(main.result["day"]) + 1)) if ok else ("%d days survived. Tap to start a new run" % (int(main.result["day"]) - 1))), r.position + Vector2(0, 196), 17, GOLD, r.size.x, HORIZONTAL_ALIGNMENT_CENTER)

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

# ---------------------------------------------------------------- the climb screens
const NODE_COL: Dictionary = {"herd": Color(0.35, 0.65, 0.3), "elite": Color(0.72, 0.3, 0.25), "rest": Color(0.3, 0.55, 0.82), "shop": Color(0.92, 0.72, 0.25), "boss": Color(0.85, 0.85, 0.95)}
const NODE_LET: Dictionary = {"herd": "H", "elite": "!", "rest": "C", "shop": "T", "boss": "S"}

func _peak_screens(v: Vector2) -> void:
	draw_rect(Rect2(Vector2.ZERO, v), Color(0.2, 0.34, 0.2))
	for i in 30:
		draw_rect(Rect2(fposmod(float(i) * 97.0, v.x), fposmod(float(i) * 53.0, v.y), 14, 4), Color(0.26, 0.42, 0.24))
	# the mountain behind the map
	draw_colored_polygon(PackedVector2Array([Vector2(0, v.y), Vector2(v.x * 0.18, v.y * 0.62), Vector2(v.x * 0.34, v.y * 0.8), Vector2(v.x * 0.58, v.y * 0.3), Vector2(v.x * 0.74, v.y * 0.62), Vector2(v.x * 0.9, v.y * 0.4), Vector2(v.x, v.y)]), Color(0.28, 0.36, 0.28, 0.7))
	draw_colored_polygon(PackedVector2Array([Vector2(v.x * 0.52, v.y * 0.42), Vector2(v.x * 0.58, v.y * 0.3), Vector2(v.x * 0.64, v.y * 0.42)]), Color(0.9, 0.93, 0.97, 0.85))
	_panel(Rect2(8, 92, 96, 28))
	_text("< FARM", Vector2(8, 112), 14, CREAM, 96.0, HORIZONTAL_ALIGNMENT_CENTER)
	_panel(Rect2(8, 6, 330, 32))
	_text("Gold %d   ·   Level %d" % [int(Peak.run["gold"]) if Peak.active() else 0, main.run_level], Vector2(18, 28), 16, GOLD)
	var py: float = 134.0
	for pk in main.PERKS:
		var lvp: int = main.pl(String(pk["id"]))
		if lvp > 0:
			_text("%s  %d" % [String(pk["name"]), lvp], Vector2(10, py), 12, Color(CREAM, 0.9))
			py += 15.0
	if main.state == "map":
		_peak_map(v)
	elif main.state == "prest":
		_peak_choice(v, "A QUIET CAMP", "The flock rests by a fire.", ["Train the dog", "Choose a new helper"], ["Forage", "Find 50 gold"])
	elif main.state == "pshop":
		_peak_shop(v)
	else:
		var won: bool = main.final_kind == "won"
		_panel(Rect2(v.x / 2.0 - 220, v.y / 2.0 - 110, 440, 220), Color(0.2, 0.14, 0.1, 0.96))
		_text("YOU REACHED THE SUMMIT!" if won else "THE CLIMB ENDS", Vector2(0, v.y / 2.0 - 40), 28, GOLD if won else Color(1.0, 0.5, 0.42), v.x, HORIZONTAL_ALIGNMENT_CENTER)
		_text("%d of 10 stops cleared" % int(Peak.run.get("done", 0)), Vector2(0, v.y / 2.0), 16, CREAM, v.x, HORIZONTAL_ALIGNMENT_CENTER)
		_text("tap to start a new climb", Vector2(0, v.y / 2.0 + 60), 18, GOLD, v.x, HORIZONTAL_ALIGNMENT_CENTER)
	if main.map_msg != "":
		_panel(Rect2(v.x / 2.0 - 160, v.y - 44, 320, 34), Color(0.5, 0.38, 0.12, 0.96))
		_text(main.map_msg, Vector2(v.x / 2.0 - 160, v.y - 21), 15, CREAM, 320.0, HORIZONTAL_ALIGNMENT_CENTER)

func _peak_map(v: Vector2) -> void:
	_text("THE CLIMB", Vector2(0, 86), 22, GOLD, v.x, HORIZONTAL_ALIGNMENT_CENTER)
	var layers: Array = Peak.run["layers"]
	var opts: Array = Peak.options()
	var pos: Array = Peak.run["pos"]
	for l in layers.size() - 1:
		for i in (layers[l] as Array).size():
			for k in ((layers[l] as Array)[i] as Dictionary)["next"]:
				var lit: bool = int(pos[0]) == l and int(pos[1]) == i
				draw_line(main.peak_pos(l, i), main.peak_pos(l + 1, int(k)), Color(1.0, 0.9, 0.6, 0.9) if lit else Color(0.1, 0.2, 0.1, 0.45), 3.0 if lit else 2.0)
	var pulse: float = 0.5 + 0.5 * sin(float(Time.get_ticks_msec()) * 0.008)
	for l in layers.size():
		for i in (layers[l] as Array).size():
			var nd: Dictionary = (layers[l] as Array)[i]
			var p: Vector2 = main.peak_pos(l, i)
			var tp: String = String(nd["type"])
			var rad: float = 24.0 if tp == "boss" else 18.0
			var col: Color = NODE_COL[tp]
			var done: bool = bool(nd["done"])
			var is_opt: bool = false
			for o in opts:
				if int((o as Array)[0]) == l and int((o as Array)[1]) == i:
					is_opt = true
			if done:
				col = col.darkened(0.55)
			draw_circle(p, rad + 3.0, Color(0.08, 0.06, 0.05, 0.9))
			draw_circle(p, rad, col)
			_text(String(NODE_LET[tp]), p + Vector2(-rad, 6), 16, Color(0.1, 0.08, 0.06) if tp == "boss" else CREAM, rad * 2.0, HORIZONTAL_ALIGNMENT_CENTER)
			_text("L%d" % Peak.tier_of(l), p + Vector2(-rad, rad + 16.0), 10, Color(CREAM, 0.7), rad * 2.0, HORIZONTAL_ALIGNMENT_CENTER)
			if is_opt:
				draw_arc(p, rad + 6.0 + pulse * 3.0, 0.0, TAU, 28, Color(1.0, 0.85, 0.3, 0.6 + 0.4 * pulse), 3.0, true)
			if int(pos[0]) == l and int(pos[1]) == i:
				draw_arc(p, rad + 5.0, 0.0, TAU, 28, Color(0.6, 0.9, 1.0), 3.0, true)
	var kinds: Array = ["herd", "elite", "rest", "shop", "boss"]
	var names: Array = ["Herd", "Hard herd", "Camp", "Trader", "Summit"]
	for i in kinds.size():
		var lx: float = 150.0 + float(i) * 130.0
		draw_circle(Vector2(lx, v.y - 24), 8.0, NODE_COL[String(kinds[i])])
		_text(String(names[i]), Vector2(lx + 14.0, v.y - 19), 12, Color(CREAM, 0.85))
	_text("L1 is the meadow. Higher levels have more terraces and ramps.", Vector2(0, v.y - 52), 13, Color(CREAM, 0.7), v.x, HORIZONTAL_ALIGNMENT_CENTER)

func _peak_choice(v: Vector2, title: String, text: String, a: Array, b: Array) -> void:
	_text(title, Vector2(0, v.y / 2.0 - 70), 26, GOLD, v.x, HORIZONTAL_ALIGNMENT_CENTER)
	_text(text, Vector2(0, v.y / 2.0 - 40), 15, Color(CREAM, 0.85), v.x, HORIZONTAL_ALIGNMENT_CENTER)
	for i in 2:
		var r: Rect2 = main.popt_rect(i)
		var opt: Array = a if i == 0 else b
		_panel(r, Color(0.3, 0.22, 0.14, 0.97))
		_text(String(opt[0]), r.position + Vector2(0, 32), 18, GOLD, r.size.x, HORIZONTAL_ALIGNMENT_CENTER)
		_text(String(opt[1]), r.position + Vector2(0, 56), 13, Color(CREAM, 0.85), r.size.x, HORIZONTAL_ALIGNMENT_CENTER)

func _peak_shop(v: Vector2) -> void:
	_text("THE TRADER", Vector2(0, 100), 24, GOLD, v.x, HORIZONTAL_ALIGNMENT_CENTER)
	if main.shop_offers.is_empty():
		_text("Nothing left to sell you.", Vector2(0, 200), 16, Color(CREAM, 0.7), v.x, HORIZONTAL_ALIGNMENT_CENTER)
	for i in main.shop_offers.size():
		var pk: Dictionary = main.shop_offers[i]
		var r: Rect2 = main.pshop_row(i)
		var cost: int = main.shop_price(String(pk["id"]))
		var can: bool = int(Peak.run["gold"]) >= cost
		_panel(r, Color(0.3, 0.22, 0.14, 0.97) if can else Color(0.17, 0.13, 0.1, 0.93))
		_text("%s  (Lv %d > %d)" % [String(pk["name"]), main.pl(String(pk["id"])), main.pl(String(pk["id"])) + 1], r.position + Vector2(14, 24), 16, CREAM)
		_text(String(pk["desc"]), r.position + Vector2(14, 46), 11, Color(CREAM, 0.75))
		_text("%d gold" % cost, Vector2(r.end.x - 110, r.position.y + 26), 14, GOLD if can else Color(GOLD, 0.5), 96.0, HORIZONTAL_ALIGNMENT_RIGHT)
	var lr: Rect2 = main.pleave_rect()
	_panel(lr, Color(0.4, 0.3, 0.14, 0.98))
	_text("LEAVE", lr.position + Vector2(0, 29), 17, CREAM, lr.size.x, HORIZONTAL_ALIGNMENT_CENTER)
