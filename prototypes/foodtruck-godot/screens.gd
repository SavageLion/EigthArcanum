class_name Screens
extends Control
# Full-screen menus shown when you enter a stop or finish a shift: gas, mechanic, kitchen, level-up and the results shop.

signal closed

var rng := RandomNumberGenerator.new()
var msg := ""
var sel: Array = []
var shop: Array = []
var relic_offers: Array = []
var relic_taken := false
var healed := false
var offers: Array = []
var result_info: Dictionary = {}

func _ready() -> void:
	rng.randomize()
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP

func reset(bg: String) -> void:
	UI.clear(self)
	var c := ColorRect.new()
	c.set_anchors_preset(Control.PRESET_FULL_RECT)
	c.color = Color(bg)
	add_child(c)
	var g := ColorRect.new()
	g.set_anchors_preset(Control.PRESET_FULL_RECT)
	g.color = Color(0, 0, 0, 0.35)
	add_child(g)
	visible = true

func hide_screen() -> void:
	visible = false
	UI.clear(self)
	closed.emit()

func card_icon(o: Dictionary, c: Vector2) -> void:
	var bg := ColorRect.new()
	bg.color = Color(1, 1, 1, 0.08)
	bg.size = Vector2(38, 38)
	bg.position = c - Vector2(19, 19)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bg)
	var ic := ""
	if o.get("kind", "") == "perk": ic = "p_" + o["pid"]
	elif o.get("kind", "") == "staff": ic = "s_" + o["sid"]
	elif o.has("icon"): ic = "d_" + o["icon"]
	if ic != "" and UI.has_icon(ic):
		UI.icon(self, ic, c, 36)
	if o.has("fk") and UI.has_icon("f_" + o["fk"]):
		UI.icon(self, "f_" + o["fk"], c + Vector2(15, -14), 18)

func invisible_button(r: Rect2, cb: Callable) -> Button:
	var b := Button.new()
	b.position = r.position
	b.size = r.size
	b.flat = true
	b.focus_mode = Control.FOCUS_NONE
	b.pressed.connect(cb)
	add_child(b)
	return b

# ---------- gas ----------
func show_gas() -> void:
	reset("#14201a")
	UI.label(self, Vector2(16, 14), "GAS STATION", 15, "#7ae07a")
	UI.label(self, Vector2(16, 36), "Cash $%d     Petrol %d / %d     $%.2f a unit (your reviews give a discount)" % [int(Run.cash), ceili(Run.fuel), int(Run.fuel_max), Run.gas_price()], 7, "#e8d8c0")
	var gx := 150.0
	var gy := 64.0
	var f := ColorRect.new(); f.position = Vector2(gx, gy); f.size = Vector2(180, 24); f.color = Color("#1a2a1a"); add_child(f)
	var f2 := ColorRect.new(); f2.position = Vector2(gx, gy); f2.size = Vector2(180.0 * clampf(Run.fuel / Run.fuel_max, 0.0, 1.0), 24); f2.color = Color("#ff5a4a") if Run.fuel / Run.fuel_max < 0.25 else Color("#7ae07a"); add_child(f2)
	UI.icon(self, "i_fuel", Vector2(126, 76), 22)
	var opts: Array = [10, 25, -1]
	for i in 3:
		var amt: int = int(ceil(Run.fuel_max - Run.fuel)) if opts[i] < 0 else int(opts[i])
		var price := int(ceil(amt * Run.gas_price()))
		var can: bool = amt > 0 and Run.cash >= price
		var x := 60.0 + i * 130.0
		UI.button(self, Rect2(x, 110, 120, 60), ("FILL UP" if opts[i] < 0 else "+%d" % opts[i]) + "\n%d for $%d" % [amt, price], func():
			Run.cash -= price; Run.fuel = minf(Run.fuel_max, Run.fuel + amt); msg = "Filled up."; show_gas(), false, 11, not can)
	if msg != "": UI.label(self, Vector2(0, 186), msg, 9, "#9fd8a0", 1, 480)
	UI.button(self, Rect2(170, 222, 140, 28), "BACK ON THE ROAD", hide_screen, true, 8)

# ---------- mechanic ----------
func show_mechanic() -> void:
	reset("#16181e")
	UI.label(self, Vector2(16, 12), "THE MECHANIC", 15, "#c8d0e0")
	UI.label(self, Vector2(16, 36), "Cash $%d      Truck %d/%d" % [int(Run.cash), ceili(Run.hp), int(Run.hp_max)], 7.5, "#e8d8c0")
	for i in Data.UPG.size():
		var u: Dictionary = Data.UPG[i]
		var x := 12.0 + (i % 3) * 150.0
		var y := 50.0 + (i / 3) * 70.0
		var lv: int = Run.car[u["id"]]
		var done: bool = lv >= u["max"]
		var p := Run.upg_price(u)
		var can: bool = not done and Run.cash >= p
		UI.panel(self, Rect2(x, y, 144, 64), "#4a5a4a" if done else ("#c8d0e0" if can else "#5a5a66"))
		UI.icon(self, "u_" + u["id"], Vector2(x + 124, y + 16), 26, 0.5 if done else 1.0)
		UI.label(self, Vector2(x + 8, y + 5), u["n"], 8, "#8aa88a" if done else "#ffffff")
		UI.label(self, Vector2(x + 8, y + 19), u["d"], 6, "#c0c8d0", 0, 108)
		for k in u["max"]:
			var pip := ColorRect.new(); pip.position = Vector2(x + 8 + k * 10, y + 44); pip.size = Vector2(8, 5); pip.color = Color("#ffd24a") if k < lv else Color("#3a3a46"); add_child(pip)
		UI.label(self, Vector2(x + 80, y + 46), "MAXED" if done else "$%d" % p, 9, "#8aa88a" if done else ("#ffe9a8" if can else "#9a7a6a"), 2, 56)
		if can:
			invisible_button(Rect2(x, y, 144, 64), func():
				Run.cash -= p; Run.apply_upgrade(u["id"]); msg = u["n"] + " installed!"; show_mechanic())
	var rp := 18
	UI.button(self, Rect2(12, 194, 150, 24), "Repair truck +40   $%d" % rp, func():
		Run.cash -= rp; Run.hp = minf(Run.hp_max, Run.hp + 40.0); msg = "Patched up."; show_mechanic(), false, 7, Run.cash < rp or Run.hp >= Run.hp_max)
	if msg != "": UI.label(self, Vector2(170, 200), msg, 8, "#9fd8a0")
	UI.button(self, Rect2(170, 236, 140, 26), "BACK ON THE ROAD", hide_screen, true, 8)

# ---------- kitchen ----------
func show_kitchen() -> void:
	reset("#1a1620")
	UI.label(self, Vector2(16, 12), "THE KITCHEN", 15, "#9ad8ff")
	UI.label(self, Vector2(16, 36), "Fuse two dishes into one new dish (it frees a menu slot). Cash $%d" % int(Run.cash), 7, "#e8d8c0")
	for i in Run.dishes.size():
		var d: Dictionary = Run.dishes[i]
		var x := 16.0 + i * 112.0
		var on: bool = sel.has(d)
		UI.panel(self, Rect2(x, 52, 104, 116), "#ffd24a" if on else "", not on and false)
		if UI.has_icon("d_" + d["k"]):
			UI.icon(self, "d_" + d["k"], Vector2(x + 52, y_c(30)), 44)
		else:
			var def: Dictionary = Run.D(d["k"])
			if def.has("parts"):
				UI.icon(self, "d_" + def["parts"][0], Vector2(x + 36, y_c(30)), 34)
				UI.icon(self, "d_" + def["parts"][1], Vector2(x + 68, y_c(26)), 34)
		UI.label(self, Vector2(x, 106), Run.D(d["k"])["n"], 8, "#ffffff", 1, 104)
		UI.label(self, Vector2(x, 118), "Lv %d" % d["lv"], 7, "#ffd27a", 1, 104)
		for j in d["fl"].size():
			var fl: String = d["fl"][j]
			if UI.has_icon("f_" + fl): UI.icon(self, "f_" + fl, Vector2(x + 30 + j * 40, 138), 16)
			UI.label(self, Vector2(x + 40 + j * 40 - 20, 130), Data.FLAV[fl]["n"], 5, "#ffffff")
		if d["recipe"] != "": UI.label(self, Vector2(x, 150), d["recipe"], 6, "#ffd24a", 1, 104)
		invisible_button(Rect2(x, 52, 104, 116), func():
			if sel.has(d): sel.erase(d)
			else:
				if sel.size() >= 2: sel.pop_front()
				sel.append(d)
			show_kitchen())
	var two: bool = sel.size() == 2
	var cost := 20
	var pv := "a new dish"
	if two: pv = Run.fusion_name(sel[0]["k"], sel[1]["k"])
	UI.button(self, Rect2(16, 178, 200, 28), ("FUSE into %s   $%d" % [pv, cost]) if two else "Pick two dishes to fuse", func():
		Run.cash -= cost; var n := Run.fuse(sel[0], sel[1]); msg = "You invented the %s!" % n; sel = []; show_kitchen(), two and Run.cash >= cost, 8, not two or Run.cash < cost)
	var one: bool = sel.size() == 1
	var mc: int = 14 * sel[0]["lv"] if one else 0
	UI.button(self, Rect2(228, 178, 150, 28), ("Master class: Lv %d   $%d" % [sel[0]["lv"] + 1, mc]) if one else "Select one for a master class", func():
		var d: Dictionary = sel[0]; Run.cash -= mc; d["lv"] += 1; Run.recipe_check(d); msg = Run.D(d["k"])["n"] + " levelled up!"; show_kitchen(), false, 7.5, not one or Run.cash < mc or (one and sel[0]["lv"] >= 6))
	if msg != "": UI.label(self, Vector2(0, 218), msg, 9, "#9fd8a0", 1, 480)
	UI.button(self, Rect2(170, 236, 140, 26), "BACK ON THE ROAD", hide_screen, true, 8)

func y_c(v: float) -> float:
	return 52.0 + v

# ---------- level up ----------
func show_levelup() -> void:
	reset("#120a1a")
	UI.label(self, Vector2(0, 12), "LEVEL UP!", 16, "#ffd24a", 1, 480)
	UI.label(self, Vector2(0, 38), "Pick a new menu item", 8, "#e8d8c0", 1, 480)
	offers = Run.pick3()
	for i in offers.size():
		var o: Dictionary = offers[i]
		var x := 14.0 + i * 146.0
		UI.panel(self, Rect2(x, 62, 138, 150), o.get("col", "#ffb84a"))
		card_icon(o, Vector2(x + 69, 94))
		UI.label(self, Vector2(x, 122), o["t"], 9, "#ffffff", 1, 138)
		UI.label(self, Vector2(x + 8, 138), o["d"], 7, "#d8c8b0", 1, 122)
		UI.label(self, Vector2(x, 198), {"fl": "FLAVOUR", "dish": "NEW DISH", "lv": "UPGRADE"}.get(o["kind"], "PERK"), 6.5, o.get("col", "#ffd27a"), 1, 138)
		invisible_button(Rect2(x, 62, 138, 150), func():
			Run.apply_offer(o); hide_screen())
	UI.label(self, Vector2(0, 252), "Level %d" % Run.lv, 6.5, "#9a8a7a", 1, 480)

func auto_pick() -> void:
	if not offers.is_empty():
		Run.apply_offer(offers[0])
	hide_screen()

# ---------- results ----------
func show_results(info: Dictionary) -> void:
	result_info = info
	reset("#1a1020")
	shop = []
	for o in Run.pick3():
		var base := 9 if o["kind"] == "perk" else (16 if o["kind"] == "dish" else (14 if o["kind"] == "fl" else 12))
		shop.append({"o": o, "price": int(roundf(base * (1.0 + 0.25 * Run.shift_n))), "sold": false})
	var av: Array = Data.STAFF.filter(func(x): return not Run.staff.has(x["id"]))
	if not av.is_empty() and Run.staff.size() < 4:
		var x: Dictionary = av[rng.randi() % av.size()]
		shop.append({"o": {"t": x["n"], "d": x["d"], "kind": "staff", "col": "#9ad8ff", "sid": x["id"], "do": "staff", "arg": x["id"]}, "price": x["price"], "sold": false})
	relic_offers = Data.RELICS.filter(func(r): return not Run.relics.has(r["id"]))
	relic_offers.shuffle()
	relic_offers = relic_offers.slice(0, 3)
	relic_taken = false
	healed = false
	_draw_results()

func _draw_results() -> void:
	reset("#1a1020")
	var info := result_info
	UI.label(self, Vector2(16, 8), "COOK-OFF WON!" if info.get("legdone", false) else "SHIFT %d COMPLETE" % Run.shift_n, 14, "#ffd24a")
	UI.label(self, Vector2(16, 34), "%d customers fed   +$%d in tips   Cash $%d" % [info.get("fed", 0), int(info.get("tips", 0)), int(Run.cash)], 7.5, "#e8d8c0")
	UI.label(self, Vector2(16, 48), "SHOP: buy as many as you can afford", 9, "#ffb84a")
	for i in shop.size():
		var s: Dictionary = shop[i]
		var o: Dictionary = s["o"]
		var x := 8.0 + i * 116.0
		var y := 62.0
		var can: bool = Run.cash >= s["price"] and not s["sold"]
		UI.panel(self, Rect2(x, y, 110, 96), "#443a4c" if s["sold"] else (o.get("col", "#ffb84a") if can else "#6a5a4a"))
		card_icon(o, Vector2(x + 55, y + 20))
		UI.label(self, Vector2(x, y + 40), o["t"], 7.2, "#7a6a7a" if s["sold"] else "#ffffff", 1, 110)
		UI.label(self, Vector2(x + 6, y + 51), o["d"], 5.8, "#6a5a6a" if s["sold"] else "#cfc0a8", 1, 98)
		UI.label(self, Vector2(x, y + 82), "SOLD" if s["sold"] else "$%d" % s["price"], 9, "#7a6a7a" if s["sold"] else ("#ffe9a8" if can else "#9a7a6a"), 1, 110)
		if can:
			invisible_button(Rect2(x, y, 110, 96), func():
				Run.cash -= s["price"]; s["sold"] = true; Run.apply_offer(o); _draw_results())
	UI.label(self, Vector2(16, 164), "DASH TRINKET: hang one up (free)", 8.5, "#e0b8ff")
	for i in relic_offers.size():
		var r: Dictionary = relic_offers[i]
		var x := 8.0 + i * 158.0
		var y := 177.0
		UI.panel(self, Rect2(x, y, 152, 36), "#443a4c" if relic_taken else "#c07aff")
		UI.icon(self, "r_" + r["id"], Vector2(x + 19, y + 18), 28, 0.45 if relic_taken else 1.0)
		UI.label(self, Vector2(x + 36, y + 3), r["t"], 7.4, "#7a6a7a" if relic_taken else "#ffffff")
		UI.label(self, Vector2(x + 36, y + 14), r["d"], 5.6, "#6a5a6a" if relic_taken else "#d0c0e0", 0, 112)
		if not relic_taken:
			invisible_button(Rect2(x, y, 152, 36), func():
				relic_taken = true; Run.apply_relic(r["id"]); _draw_results())
	var rp := roundi(10 + 3 * Run.shift_n)
	UI.button(self, Rect2(8, 220, 126, 24), "Repaired" if healed else "REPAIR +40  $%d" % rp, func():
		Run.cash -= rp; healed = true; Run.hp = minf(Run.hp_max, Run.hp + 40.0); _draw_results(), false, 7, healed or Run.cash < rp)
	UI.label(self, Vector2(8, 248), "Truck %d/%d" % [ceili(Run.hp), int(Run.hp_max)], 7, "#9fd8a0", 1, 126)
	if not Run.review.is_empty():
		var rv: Dictionary = Run.review
		UI.stars(self, Vector2(144, 216), rv["stars"], 11)
		UI.label(self, Vector2(212, 216), "%d%% fed" % rv["pct"], 8, "#ffd24a")
		UI.label(self, Vector2(144, 232), rv["q"], 6, "#e8d8c0", 0, 150)
	UI.button(self, Rect2(308, 222, 164, 34), "BACK ON THE ROAD", hide_screen, true, 9)
