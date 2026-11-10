class_name Shift
extends Node2D
# The shift, seen from inside the truck: hungry customers march up the street to the serving window.
# Tap a dish to put a burner on it, flick a dish at anyone to throw it, chain 3 throws for combos, put out stove fires.
# Ported from the canvas version (prototypes/foodtruck/index.html).

signal finished(kind: String)   # "done" | "boss" | "lose"
signal levelup

const LW := 480.0
const LH := 270.0
const HZ := 104.0
const NY := 204.0
const MUZ := Vector2(240, 224)
const STOCKCAP := 4
const COOKX := 3.0

var spot: Dictionary
var spot_key := ""
var boss_info: Dictionary = {}
var is_gala := false
var shift_t := 0.0
var limit := 70.0
var E: Array = []
var PR: Array = []
var HP: Array = []
var PT: Array = []
var FT: Array = []
var ZN: Array = []
var BOLT: Array = []
var stations: Array = []
var heat := 0.0
var fire := 0.0
var sp := 1.4
var fed_this := 0
var tips_this := 0.0
var fires_this := 0
var boss: Variant = null
var boss_spawned := false
var over := ""
var msg := ""
var msg_t := 0.0
var shake := 0.0
var vig := 0.0
var chain: Array = []
var chain_t := 0.0
var ev_t := 0.0
var wave_t := 0.0
var legend := false
var big_t := 0.0
var big_txt := ""
var big_col := Color.WHITE
var tap: Variant = null
var cook_tog: Variant = null
var drag := {"on": false, "ds": null, "x": 0.0, "y": 0.0, "sx": 0.0, "sy": 0.0}
var hold := false          # true while a modal (level up) is on top
var bot := false
var bot_t := 0.0
var clock := 0.0
var rng := RandomNumberGenerator.new()
var chars := {}
var font: Font = ThemeDB.fallback_font
var combo_btn := Rect2(LW - 90, 4, 44, 24)
var legend_hit := Rect2(0, 0, LW, LH)

func _ready() -> void:
	rng.randomize()
	for i in 16: _load_char("pr%d" % i)
	for i in 8: _load_char("pm%d" % i)
	set_process(false)

func _load_char(n: String) -> void:
	var t: Texture2D = load("res://art/chars/%s.png" % n)
	var bb := t.get_image().get_used_rect()
	chars[n] = {"tex": t, "bb": Rect2(bb)}

func rnd(a: float, b: float) -> float:
	return rng.randf_range(a, b)

func pick(a: Array) -> Variant:
	return a[rng.randi() % a.size()]

func hsh(x: float, y: float) -> float:
	return fposmod(sin(x * 12.9898 + y * 78.233) * 43758.5453, 1.0)

# ---------- setup ----------
func start(key: String, boss_i: Dictionary = {}, gala: bool = false) -> void:
	spot = Data.SPOTS[key]
	spot_key = key
	boss_info = boss_i
	is_gala = gala
	shift_t = 0.0; limit = 110.0 if gala else 70.0
	E = []; PR = []; HP = []; PT = []; FT = []; ZN = []; BOLT = []
	heat = 0.0; fire = 0.0; sp = 1.4; fed_this = 0; tips_this = 0.0; fires_this = 0
	boss = null; boss_spawned = false; over = ""
	msg = spot["n"].to_upper(); msg_t = 2.2; shake = 0.0; vig = 0.0; chain = []; chain_t = 0.0
	tap = null; cook_tog = null; ev_t = rnd(9, 14); wave_t = rnd(20, 26); legend = false; big_t = 0.0
	drag["on"] = false
	hold = false
	stations = []
	for i in Run.dishes.size():
		stations.append(_new_station(Run.dishes[i], 2, i < Run.burners(), i))

func _new_station(d: Dictionary, stock: int, cook: bool, ct: float) -> Dictionary:
	return {"d": d, "stock": stock, "prog": 0.0, "cook": cook, "ct": ct, "fire": 0.0, "taps": 0, "fb": 0.0, "fbt": "", "fc": Color.WHITE, "sx": 240.0, "shk": 0.0}

func st_lay() -> Dictionary:
	var n := maxi(1, stations.size())
	var sw := minf(74.0, 256.0 / n)
	return {"n": n, "sw": sw, "x0": 240.0 - sw * n / 2.0}

# ---------- customers ----------
func spawn_customer(type: String, pos: Variant = null) -> Dictionary:
	var T: Dictionary = Data.CT[type]
	var sh: int = Run.shift_n
	var hpm: float = spot["hp"] * (1.0 + 0.28 * sh) * (1.0 + 0.45 * shift_t / limit)
	var hp0: float = T["hp"] * (1.0 if T.get("boss", false) else hpm)
	var e := {"type": type, "lx": pos["lx"] if pos != null else rnd(-1, 1), "z": pos["z"] if pos != null else rnd(0, 0.06), "hp": hp0, "max": hp0,
		"spd": T["spd"] * spot["spd"] * (1.0 + 0.04 * sh) * rnd(0.9, 1.1), "spr": pick(T["pool"]), "flash": 0.0, "burn": 0.0, "chill": 0.0, "stun": 0.0, "state": "walk", "t": 0.0,
		"face": -1 if rng.randf() < 0.5 else 1, "cd": rnd(1.6, 3.0), "sweet": false, "bt": 0.0, "sx": 240.0, "sy": HZ, "ss": 0.3, "dh": 20.0, "dead": false, "angry": false}
	E.append(e)
	return e

func add_text(x: float, y: float, s: String, col: Color) -> void:
	FT.append({"x": x, "y": y, "s": s, "col": col, "t": 1.0})

func burst(x: float, y: float, col: Color, n: int, spd: float = 60.0, life: float = 0.5) -> void:
	for i in n:
		var a := rng.randf() * TAU
		var v := rnd(0.3, 1.0) * spd
		PT.append({"x": x, "y": y, "vx": cos(a) * v, "vy": sin(a) * v, "t": life * rnd(0.6, 1.0), "max": life, "col": col, "r": rnd(1.0, 2.4)})

func place(e: Dictionary) -> void:
	var T: Dictionary = Data.CT[e["type"]]
	var z := clampf(e["z"], 0.0, 1.04)
	var k := pow(clampf(z, 0.0, 1.0), 1.12)
	e["sy"] = HZ + 8.0 + (NY - HZ - 8.0) * k + (4.0 if e["z"] >= 1.0 else 0.0)
	e["ss"] = 0.34 + 1.05 * clampf(z, 0.0, 1.0)
	e["sx"] = 240.0 + e["lx"] * (60.0 + z * 200.0)
	e["dh"] = T["h"] * 1.5 * e["ss"]

func body_of(e: Dictionary) -> Dictionary:
	return {"x": e["sx"], "y": e["sy"] - e["dh"] * 0.5, "rx": e["dh"] * 0.27, "ry": e["dh"] * 0.5}

func extinguish(ds: Dictionary, manual: bool) -> void:
	var quick: bool = ds["fire"] < 3.6
	ds["fire"] = 0.0; ds["taps"] = 0
	if manual:
		if quick: Run.cash += 4
		ds["fb"] = 0.7; ds["fbt"] = "Put out! +$4" if quick else "Put out"; ds["fc"] = Color("#9adfff")
	burst(ds["sx"], 236, Color("#bfe8ff"), 10, 60)

func feed(e: Dictionary, pr: Variant) -> void:
	if e["state"] == "fed":
		return
	var T: Dictionary = Data.CT[e["type"]]
	e["state"] = "fed"; e["t"] = 0.0
	Run.fed += 1; fed_this += 1
	var tip: float = T["tip"] * Run.perks["tip"] * spot["tip"] * (1.0 + 0.08 * (Run.avg_stars() - 3.0)) * (2.0 if e["sweet"] else 1.0) * (1.35 if Run.has_staff("waiter") else 1.0)
	var xp: float = T["xp"] * Run.perks["xp"]
	Run.cash += tip; Run.xp += xp; tips_this += tip
	burst(e["sx"], e["sy"] - e["dh"] * 0.5, Color("#ffe9a0"), 8, 70)
	add_text(e["sx"], e["sy"] - e["dh"] - 6, "%s +$%s" % [pick(["FED!", "Yum!", "Tasty!", "Delicious!", "Mmm!", "5 stars!"]), (("%.1f" % tip) if tip < 1.0 else str(int(roundf(tip))))], Color("#9aff9a"))
	if T.get("boss", false):
		over = "boss"

func hurt(e: Dictionary, dmg: float, pr: Variant) -> void:
	if e["state"] == "fed":
		return
	e["hp"] -= dmg; e["flash"] = 0.18
	var fl: Array = pr["fl"] if (pr != null and pr.has("fl")) else []
	var P: Dictionary = Run.perks
	if fl.has("spicy"): e["burn"] = 2.4 * spot.get("burn", 1.0); e["chill"] = 0.0
	if fl.has("frozen"): e["chill"] = 2.4 * P["chill"]; e["burn"] = 0.0
	if fl.has("sour"): e["stun"] = 0.5 * P["stun"]; e["hp"] -= dmg * 0.25
	if fl.has("sweet"): e["sweet"] = true
	if fl.has("greasy"): e["z"] = maxf(0.0, e["z"] - 0.06); e["stun"] = maxf(e["stun"], 0.25)
	PT.append({"x": e["sx"], "y": e["sy"] - e["dh"] * 0.55, "vx": rnd(-40, 40), "vy": rnd(-60, -20), "t": 0.4, "max": 0.4, "col": Color(pr["col"]) if (pr != null and pr.has("col")) else Color.WHITE, "r": 2.0})
	if e["hp"] <= 0.0:
		feed(e, pr)

func splash(p: Dictionary, x: float, y: float) -> void:
	var R: float = (Run.D(p["k"]).get("splash", 28.0)) * (1.3 if p.get("rec", "") == "Mexican Sundae" else 1.0) * Run.perks["magnet"]
	for e in E:
		if e["state"] == "fed":
			continue
		var b := body_of(e)
		if Vector2(b["x"] - x, (b["y"] - y) * 1.4).length() < R + b["rx"]:
			hurt(e, p["dmg"], p)
	var hot: bool = p["fl"].has("spicy")
	ZN.append({"x": x, "y": y, "r": R, "t": 2.2 if hot else 1.6, "k": "fire" if hot else "ice"})
	burst(x, y, Color("#ff7a3a") if hot else Color("#bfe8ff"), 14, 80, 0.5)

func big_text(s: String, col: String) -> void:
	big_txt = s; big_col = Color(col); big_t = 1.5; shake = 0.8

func combo_check(entry: Dictionary) -> String:
	chain.append(entry)
	if chain.size() > 3:
		chain.pop_front()
	chain_t = 5.0
	if chain.size() < 3:
		return ""
	var ch := chain
	var P: Dictionary = Run.perks
	var base: float = 12.0 * P["dmg"] * (1.0 + 0.12 * Run.shift_n)
	var same: bool = ch[0]["k"] == ch[1]["k"] and ch[1]["k"] == ch[2]["k"]
	var hot := false
	var cold := false
	for x in ch:
		if x["fl"].has("spicy"): hot = true
		if x["fl"].has("frozen"): cold = true
	var ks := {}
	for x in ch: ks[x["k"]] = true
	var distinct: bool = ks.size() == 3
	var surf: bool = ch[0]["k"] == ch[2]["k"] and ch[0]["k"] != ch[1]["k"]
	if same:
		chain = []; big_text("TRIPLE DECKER!", "#ffd24a"); return "triple"
	if hot and cold:
		chain = []; big_text("THERMAL SHOCK!", "#ff9a5a")
		for e in E:
			if e["state"] == "fed" or e["z"] < 0.03: continue
			hurt(e, base * 0.9, {"fl": ["spicy"], "col": "#ff7a3a"})
			e["chill"] = maxf(e["chill"], 2.0); e["stun"] = maxf(e["stun"], 1.2)
			burst(e["sx"], e["sy"] - e["dh"] * 0.5, Color("#9adfff"), 5, 60)
		return "thermal"
	if surf:
		chain = []; big_text("SURF & TURF!", "#8affc8")
		var tg: Array = E.filter(func(e): return e["state"] != "fed" and e["z"] > 0.03)
		tg.sort_custom(func(a, b): return a["z"] > b["z"])
		var px := 240.0
		var py := 232.0
		for e in tg.slice(0, 6):
			var b := body_of(e)
			BOLT.append({"x1": px, "y1": py, "x2": b["x"], "y2": b["y"], "t": 0.35})
			hurt(e, base * 1.6, {"fl": [], "col": "#8affc8"})
			px = b["x"]; py = b["y"]
		return "surf"
	if distinct:
		chain = []; big_text("COMBO MEAL!", "#ffb84a")
		for e in E:
			if e["state"] == "fed" or e["z"] < 0.03: continue
			hurt(e, base, {"fl": [], "col": "#ffd24a"})
			e["z"] = maxf(0.0, e["z"] - 0.06)
		vig = 0.0
		return "meal"
	return ""

func throw_dish(ds: Dictionary, tx: float, ty: float) -> bool:
	var d: Dictionary = ds["d"]
	var D: Dictionary = Run.D(d["k"])
	var P: Dictionary = Run.perks
	if not stations.has(ds) or ds["stock"] < 1 or fire > 0.0 or ds["fire"] > 0.0:
		if ds["stock"] < 1:
			ds["fb"] = 0.5; ds["fbt"] = "EMPTY"; ds["fc"] = Color("#ff8a6a"); ds["shk"] = 0.3
		return false
	ds["stock"] -= 1
	var kind := combo_check({"k": d["k"], "fl": d["fl"].duplicate()})
	var mega: bool = kind == "triple"
	var ax := tx
	var ay := ty
	var bd: float = pow(44.0 * P["magnet"], 2)
	for e in E:
		if e["state"] == "fed" or e["z"] < 0.03: continue
		var b := body_of(e)
		var dd: float = pow(b["x"] - tx, 2) + pow(b["y"] - ty, 2)
		if dd < bd:
			bd = dd; ax = b["x"]; ay = b["y"]
	var ox: float = ds["sx"]
	var oy := 232.0
	var dx := ax - ox
	var dy := minf(ay - oy, -14.0)
	var base := atan2(dy, dx)
	var dist := Vector2(dx, dy).length()
	if dist < 1.0: dist = 1.0
	var n := Run.dish_count(d)
	var fl: Array = d["fl"].duplicate()
	var r: String = d["recipe"]
	var hot: bool = fl.has("spicy")
	for i in n:
		var spread: float = (D["spread"] * 0.6 / (1.6 if n > 3 else 1.0)) if D.has("spread") else 0.12
		var a := base + ((i - (n - 1) / 2.0) * spread if n > 1 else 0.0) + rnd(-0.02, 0.02)
		var spd: float = D["spd"] * 1.55
		var p := {"x": ox, "y": oy, "vx": cos(a) * spd, "vy": sin(a) * spd, "dmg": Run.dish_dmg(d) * (3.0 if mega else 1.0), "pierce": 99 if mega else (D.get("pierce", 0) + (2 if r == "Pickle Dog" else 0)),
			"hit": {}, "fl": fl, "col": D["col"], "k": d["k"], "life": 2.4, "size": (5.2 if d["k"] == "icecream" else 4.6) * P["size"] * (1.8 if mega else 1.0), "rot": 0.0,
			"boom": D.get("boom", false), "t0": 0.0, "lob": D.get("lob", false), "rec": r, "home": fl.has("sweet") and not mega, "sx": ox, "sy": oy, "tx": ax, "ty": ay, "tt": 0.0, "dur": maxf(0.35, minf(0.8, dist / spd)), "back": false, "twice": false}
		if p["lob"]:
			p["dur"] = maxf(0.35, dist / (spd * 0.8)); p["life"] = p["dur"]
		if r == "Frosty Taco" and d["k"] == "taco" and i % 2 == 1:
			p["fl"] = fl + ["frozen"]
		PR.append(p)
	if hot:
		heat += 9.0 * n * P["heat"]
	return true

# ---------- the update loop ----------
func _process(dt: float) -> void:
	clock += dt
	if not hold:
		update_shift(dt)
	queue_redraw()

func update_shift(dt: float) -> void:
	var P: Dictionary = Run.perks
	if bot:
		bot_update(dt)
	shift_t += dt
	Run.hp = minf(Run.hp_max, Run.hp + 0.5 * dt)
	msg_t = maxf(0.0, msg_t - dt); shake = maxf(0.0, shake - dt * 3.0); vig = maxf(0.0, vig - dt * 2.0); big_t = maxf(0.0, big_t - dt)
	chain_t -= dt
	if chain_t <= 0.0: chain = []
	while stations.size() < Run.dishes.size():
		var on: bool = stations.filter(func(x): return x["cook"]).size() < Run.burners()
		stations.append(_new_station(Run.dishes[stations.size()], 1, on, stations.size()))
	var L := st_lay()
	for i in stations.size():
		var ds: Dictionary = stations[i]
		ds["sx"] = L["x0"] + (i + 0.5) * L["sw"]
		ds["fb"] = maxf(0.0, ds["fb"] - dt); ds["shk"] = maxf(0.0, ds["shk"] - dt)
	if cook_tog != null:
		var ds: Dictionary = cook_tog
		cook_tog = null
		if stations.has(ds):
			if ds["cook"]:
				ds["cook"] = false
			else:
				ds["cook"] = true; ds["ct"] = shift_t
				var on: Array = stations.filter(func(x): return x["cook"])
				if on.size() > Run.burners():
					on.sort_custom(func(a, b): return a["ct"] < b["ct"])
					on[0]["cook"] = false
	for ds in stations:
		if not ds["cook"] or ds["fire"] > 0.0 or fire > 0.0: continue
		if ds["stock"] >= STOCKCAP:
			ds["prog"] = 0.0; continue
		var D: Dictionary = Run.D(ds["d"]["k"])
		ds["prog"] += dt * P["rate"] * (1.0 + 0.05 * (ds["d"]["lv"] - 1)) * (1.25 if Run.has_staff("intern") else 1.0) / (D["cd"] * COOKX)
		if ds["prog"] >= 1.0:
			ds["prog"] = 0.0; ds["stock"] += 1; ds["fb"] = 0.4; ds["fbt"] = "+1"; ds["fc"] = Color("#9aff9a")
	for e in E: place(e)
	# kitchen heat and stove fires
	heat = maxf(0.0, heat - (18.0 if Run.has_staff("dish") else 9.0) * dt)
	if fire > 0.0:
		fire -= dt
		Run.hp -= 7.0 * (0.5 if Run.has_staff("dish") else 1.0) * dt
		if rng.randf() < dt * 20.0:
			PT.append({"x": rnd(60, 420), "y": LH - rnd(0, 30), "vx": rnd(-10, 10), "vy": -rnd(30, 70), "t": 0.6, "max": 0.6, "col": pick([Color("#ff7a3a"), Color("#ffd24a"), Color("#ff4a2a")]), "r": 3.0})
	elif heat >= 100.0:
		fire = 3.0; heat = 40.0; fires_this += 1; Run.insp = clampf(Run.insp + 14.0, 0.0, 100.0)
		msg = "KITCHEN FIRE! Too much spice!"; msg_t = 1.8; shake = 1.0
	ev_t -= dt
	if ev_t <= 0.0 and shift_t > 7.0:
		if not stations.any(func(x): return x["fire"] > 0.0):
			var hotl: Array = stations.filter(func(x): return x["d"]["fl"].has("spicy") or x["cook"])
			var ds: Dictionary = pick(stations + hotl)
			ds["fire"] = 0.001; ds["taps"] = 0
			msg = "FIRE on the %s stove! Tap it 3 times!" % Run.D(ds["d"]["k"])["n"]; msg_t = 2.2
		ev_t = rnd(10, 16) / (1.0 + 0.1 * Run.shift_n)
	for ds in stations:
		if ds["fire"] > 0.0:
			ds["fire"] += dt
			Run.hp -= 2.6 * (0.5 if Run.has_staff("dish") else 1.0) * dt
			if rng.randf() < dt * 28.0:
				PT.append({"x": ds["sx"] + rnd(-14, 14), "y": 250.0, "vx": rnd(-8, 8), "vy": -rnd(30, 70), "t": 0.5, "max": 0.5, "col": pick([Color("#ff7a3a"), Color("#ffd24a"), Color("#ff4a2a")]), "r": 3.0})
			if Run.has_staff("dish") and ds["fire"] > 1.5: extinguish(ds, false)
			elif ds["fire"] > 9.0: ds["fire"] = 0.0; ds["taps"] = 0
	# spawns
	sp -= dt
	if sp <= 0.0 and E.size() < (45 if is_gala else 70):
		sp = maxf(0.26, 2.3 / (spot["spawn"] * (1.0 + shift_t / 48.0)) / (1.0 + 0.26 * Run.shift_n) * (1.5 if Run.shift_n == 0 else 1.0))
		var mix: Dictionary = spot["mix"]
		var tot := 0.0
		for k in mix: tot += mix[k]
		var r := rng.randf() * tot
		var type := "walker"
		for k in mix:
			r -= mix[k]
			if r <= 0.0:
				type = k; break
		if type == "mob":
			var lx := rnd(-0.9, 0.9)
			for i in 3 + mini(2, Run.shift_n):
				spawn_customer("mob", {"lx": lx + rnd(-0.14, 0.14), "z": rnd(0, 0.05)})
		else:
			spawn_customer(type)
	if is_gala and not boss_spawned and shift_t > 6.0:
		boss_spawned = true
		boss = spawn_customer("critic", {"lx": 0.0, "z": 0.0})
		boss["hp"] = boss_info.get("hp", 420.0); boss["max"] = boss["hp"]; boss["spr"] = boss_info.get("spr", "pm7"); boss["bname"] = boss_info.get("n", "The Food Critic").to_upper(); boss["spd"] = 19.0
		msg = boss["bname"] + " ARRIVES"; msg_t = 2.4
	wave_t -= dt
	if wave_t <= 0.0 and shift_t > 10.0:
		wave_t = rnd(20, 26) / (1.0 + 0.05 * Run.shift_n)
		var n := 4 + Run.shift_n
		var lx0 := rnd(-0.8, 0.8)
		for i in n:
			spawn_customer(pick(["walker", "jogger", "walker"]), {"lx": lx0 + rnd(-0.4, 0.4), "z": rnd(0, 0.05)})
		msg = "HANGRY WAVE!"; msg_t = 1.6
	if tap != null:
		var tp: Vector2 = tap
		tap = null
		for h in HP:
			if Vector2(h["x"], h["y"]).distance_to(tp) < h["size"] + 20.0:
				h["dead"] = true; burst(h["x"], h["y"], Color("#ff9a9a"), 8, 50); add_text(h["x"], h["y"], "Complaint dismissed", Color("#ffd0d0")); break
	# customers
	for e in E:
		var T: Dictionary = Data.CT[e["type"]]
		e["flash"] = maxf(0.0, e["flash"] - dt); e["t"] += dt
		if e["state"] == "fed":
			if e["t"] > 1.1: e["dead"] = true
			continue
		e["burn"] = maxf(0.0, e["burn"] - dt); e["chill"] = maxf(0.0, e["chill"] - dt); e["stun"] = maxf(0.0, e["stun"] - dt)
		if e["burn"] > 0.0:
			e["hp"] -= (3.2 * P["burn"] + Run.shift_n * 0.4) * dt
			e["bt"] -= dt
			if e["bt"] <= 0.0:
				e["bt"] = 0.45
				var b := body_of(e)
				for o in E:
					if o != e and o["state"] != "fed" and o["burn"] <= 0.0:
						var ob := body_of(o)
						if Vector2(ob["x"] - b["x"], (ob["y"] - b["y"]) * 1.3).length() < 30.0 * maxf(0.6, e["ss"]) and rng.randf() < 0.45:
							o["burn"] = 2.2
			if rng.randf() < dt * 12.0:
				PT.append({"x": e["sx"] + rnd(-4, 4), "y": e["sy"] - e["dh"] * rnd(0.7, 1.0), "vx": rnd(-8, 8), "vy": -rnd(20, 40), "t": 0.4, "max": 0.4, "col": pick([Color("#ff7a3a"), Color("#ffd24a")]), "r": 2.0})
			if e["hp"] <= 0.0:
				feed(e, null); continue
		var sp2: float = e["spd"] * (0.5 if e["chill"] > 0.0 else 1.0) * (0.0 if e["stun"] > 0.0 else 1.0) * (1.25 if e["burn"] > 0.0 else 1.0) * 0.0023
		if T.get("ranged", false):
			if e["z"] < 0.62:
				e["z"] += sp2 * dt
			else:
				e["cd"] -= dt
				if e["cd"] <= 0.0 and e["stun"] <= 0.0:
					e["cd"] = 2.8
					HP.append({"x": e["sx"], "y": e["sy"] - e["dh"] * 0.6, "sx": e["sx"], "sy": e["sy"] - e["dh"] * 0.6, "t": 0.0, "dur": 2.8, "dmg": 5.0, "size": 4.0, "dead": false})
					add_text(e["sx"], e["sy"] - e["dh"] - 4, "\"I WANT A REFUND!\"", Color("#ffb0a0"))
		elif e["z"] < 1.0:
			e["z"] += sp2 * dt
		else:
			e["z"] = 1.0
			var dm: float = T["dmg"] * 1.25 * P["armor"] * (1.0 + 0.16 * Run.shift_n) * dt * (0.55 if Run.has_staff("bouncer") else 1.0)
			Run.hp -= dm
			vig = maxf(vig, 0.5)
			if rng.randf() < dt * 2.5:
				add_text(e["sx"] + rnd(-8, 8), e["sy"] - e["dh"] - 6, "-%d" % maxi(1, int(roundf(T["dmg"] * P["armor"]))), Color("#ff8a7a"))
		e["lx"] *= 1.0 - 0.1 * dt
		if T.get("boss", false):
			e["cd"] -= dt
			if e["cd"] <= 0.0:
				e["cd"] = 6.0
				for i in 3: spawn_customer("walker", {"lx": rnd(-0.6, 0.6), "z": e["z"] * 0.6})
				add_text(e["sx"], e["sy"] - e["dh"] - 4, "\"I SAW A HAIR.\"", Color("#ffd27a"))
			if e["hp"] < e["max"] * 0.5 and not e["angry"]:
				e["angry"] = true; e["spd"] *= 1.6; msg = "THE BOSS IS FURIOUS!"; msg_t = 1.6
		if e["hp"] <= 0.0 and e["state"] != "fed":
			feed(e, null)
	E = E.filter(func(e): return not e["dead"])
	for z in ZN:
		z["t"] -= dt
		for e in E:
			if e["state"] == "fed": continue
			var b := body_of(e)
			if Vector2(b["x"] - z["x"], (b["y"] - z["y"]) * 1.5).length() < z["r"]:
				if z["k"] == "fire": e["burn"] = maxf(e["burn"], 1.6)
				else: e["chill"] = maxf(e["chill"], 1.2)
	ZN = ZN.filter(func(z): return z["t"] > 0.0)
	for b in BOLT: b["t"] -= dt
	BOLT = BOLT.filter(func(b): return b["t"] > 0.0)
	for h in HP:
		h["t"] += dt
		var f: float = h["t"] / h["dur"]
		h["x"] = h["sx"] + (MUZ.x - h["sx"]) * f
		h["y"] = h["sy"] + (MUZ.y - 30.0 - h["sy"]) * f
		h["size"] = 4.0 + f * 14.0
		if f >= 1.0:
			Run.hp -= h["dmg"] * P["armor"]; vig = 1.0; shake = 0.6
			add_text(240, 200, "-%d" % int(roundf(h["dmg"] * P["armor"])), Color("#ff8a7a"))
			h["dead"] = true
	HP = HP.filter(func(h): return not h["dead"])
	update_projectiles(dt)
	for q in PT:
		q["t"] -= dt; q["x"] += q["vx"] * dt; q["y"] += q["vy"] * dt
	PT = PT.filter(func(q): return q["t"] > 0.0)
	for f in FT:
		f["t"] -= dt; f["y"] -= 14.0 * dt
	FT = FT.filter(func(f): return f["t"] > 0.0)
	if Run.xp >= Run.need_xp():
		Run.xp -= Run.need_xp(); Run.lv += 1
		hold = true
		levelup.emit()
		return
	if Run.hp <= 0.0:
		Run.hp = 0.0; over = "lose"
	if over == "boss":
		finished.emit("boss"); set_process(false); return
	if over == "lose":
		finished.emit("lose"); set_process(false); return
	if shift_t >= limit:
		finished.emit("lose" if is_gala else "done"); set_process(false)

func update_projectiles(dt: float) -> void:
	for p in PR:
		p["life"] -= dt
		if p["lob"]:
			p["tt"] += dt
			var f := minf(1.0, p["tt"] / p["dur"])
			p["x"] = p["sx"] + (p["tx"] - p["sx"]) * f
			p["y"] = p["sy"] + (p["ty"] - p["sy"]) * f - sin(f * PI) * 46.0
			if f >= 1.0:
				splash(p, p["tx"], p["ty"]); p["life"] = 0.0
			continue
		if p["boom"]:
			p["t0"] += dt
			if p["t0"] > p["dur"] and not p["back"]:
				p["back"] = true; p["hit"] = {}
			if p["back"]:
				var dx: float = p["sx"] - p["x"]
				var dy: float = p["sy"] - p["y"]
				var dd: float = maxf(1.0, Vector2(dx, dy).length())
				p["vx"] = dx / dd * Data.DISH["pizza"]["spd"] * 1.9
				p["vy"] = dy / dd * Data.DISH["pizza"]["spd"] * 1.9
				if dd < 14.0: p["life"] = 0.0
				else: p["life"] = 0.5
		if p["home"]:
			var tg: Variant = null
			var bd := 110.0 * 110.0
			for e in E:
				if e["state"] == "fed": continue
				var b := body_of(e)
				var dd: float = pow(b["x"] - p["x"], 2) + pow(b["y"] - p["y"], 2)
				if dd < bd:
					bd = dd; tg = b
			if tg != null:
				var a := atan2(tg["y"] - p["y"], tg["x"] - p["x"])
				var cur := atan2(p["vy"], p["vx"])
				var sp3 := Vector2(p["vx"], p["vy"]).length()
				var na: float = cur + clampf(wrapf(a - cur, -PI, PI), -4.0 * dt, 4.0 * dt)
				p["vx"] = cos(na) * sp3; p["vy"] = sin(na) * sp3
		p["x"] += p["vx"] * dt; p["y"] += p["vy"] * dt; p["rot"] += dt * 12.0
		if rng.randf() < dt * 34.0:
			PT.append({"x": p["x"], "y": p["y"], "vx": rnd(-6, 6), "vy": rnd(-6, 6), "t": 0.3, "max": 0.3, "col": Color(Data.FLAV[p["fl"][p["fl"].size() - 1]]["col"]) if p["fl"].size() > 0 else Color(1, 0.94, 0.78, 0.8), "r": 2.0})
		for h in HP:
			if Vector2(h["x"] - p["x"], h["y"] - p["y"]).length() < h["size"] + p["size"] and not h["dead"]:
				h["dead"] = true; burst(h["x"], h["y"], Color("#ff9a9a"), 8, 50); add_text(h["x"], h["y"], "Complaint dismissed", Color("#ffd0d0"))
				if p["pierce"] > 0: p["pierce"] -= 1
				else: p["life"] = 0.0
		var order: Array = E.filter(func(e): return e["state"] != "fed" and not p["hit"].has(e))
		order.sort_custom(func(a, b): return a["z"] > b["z"])
		for e in order:
			var b := body_of(e)
			var ex: float = (p["x"] - b["x"]) / (b["rx"] + p["size"])
			var ey: float = (p["y"] - b["y"]) / (b["ry"] + p["size"])
			if ex * ex + ey * ey < 1.0:
				p["hit"][e] = true
				hurt(e, p["dmg"], p)
				var rec: String = p["rec"]
				if rec == "Inferno Burger" or rec == "Pepperoni Blaze":
					ZN.append({"x": b["x"], "y": e["sy"], "r": 22.0, "t": 1.8, "k": "fire"})
				if rec == "Fire Taco" or rec == "Chili Dog":
					for o in E:
						if o != e and o["state"] != "fed":
							var ob := body_of(o)
							if Vector2(ob["x"] - b["x"], (ob["y"] - b["y"]) * 1.3).length() < 36.0:
								o["burn"] = maxf(o["burn"], 1.8)
				if rec == "Dessert Pizza" or rec == "Churro Taco":
					Run.cash += 0.4 * Run.perks["tip"]
				if p["pierce"] > 0: p["pierce"] -= 1
				elif not p["boom"]: p["life"] = 0.0
				if p["k"] == "burger" and rec == "Double Smash" and not p["twice"]:
					p["twice"] = true; p["vx"] *= -0.8; p["vy"] *= -0.8; p["life"] = 0.35; p["hit"] = {}
				break
		if p["x"] < -30.0 or p["y"] < -30.0 or p["x"] > LW + 30.0 or p["y"] > LH + 30.0:
			p["life"] = 0.0
	PR = PR.filter(func(p): return p["life"] > 0.0)

# ---------- test bot ----------
func bot_update(dt: float) -> void:
	bot_t -= dt
	if bot_t > 0.0:
		return
	bot_t = 0.4
	for ds in stations:
		if ds["fire"] > 0.0: extinguish(ds, true)
	var cand: Array = E.filter(func(e): return e["state"] != "fed" and e["z"] > 0.08)
	cand.sort_custom(func(a, b): return a["z"] > b["z"])
	var av: Array = stations.filter(func(x): return x["stock"] > 0 and x["fire"] <= 0.0)
	if not cand.is_empty() and not av.is_empty() and fire <= 0.0:
		var b := body_of(cand[0])
		throw_dish(pick(av), b["x"], b["y"])

# ---------- input ----------
func _input(ev: InputEvent) -> void:
	if hold or not visible:
		return
	if ev is InputEventMouseButton and ev.button_index == MOUSE_BUTTON_LEFT:
		var p: Vector2 = ev.position
		if ev.pressed:
			if legend:
				legend = false; return
			if combo_btn.has_point(p):
				legend = true; return
			var L := st_lay()
			for i in stations.size():
				var ds: Dictionary = stations[i]
				var r := Rect2(L["x0"] + i * L["sw"], 226.0 - 14.0, L["sw"], 42.0 + 16.0)
				if r.has_point(p):
					if ds["fire"] > 0.0:
						ds["taps"] += 1
						if ds["taps"] >= 3: extinguish(ds, true)
					else:
						drag = {"on": true, "ds": ds, "x": p.x, "y": p.y, "sx": p.x, "sy": p.y}
					return
			tap = p
		else:
			if drag["on"]:
				drag["on"] = false
				var moved := Vector2(drag["x"] - drag["sx"], drag["y"] - drag["sy"]).length()
				if moved > 14.0:
					throw_dish(drag["ds"], drag["x"], drag["y"] - 8.0)
				else:
					cook_tog = drag["ds"]
	elif ev is InputEventMouseMotion and drag["on"]:
		drag["x"] = ev.position.x; drag["y"] = ev.position.y

# ---------- drawing ----------
func R(x: float, y: float, w: float, h: float, col: Color) -> void:
	draw_rect(Rect2(x, y, w, h), col)

func T(s: String, x: float, y: float, col: Color = Color("#f4e8d0"), size: int = 8, align: int = 0) -> void:
	if align == 1:
		draw_string(font, Vector2(x - 300.0, y), s, HORIZONTAL_ALIGNMENT_CENTER, 600.0, size, col)
	elif align == 2:
		draw_string(font, Vector2(x - 600.0, y), s, HORIZONTAL_ALIGNMENT_RIGHT, 600.0, size, col)
	else:
		draw_string(font, Vector2(x, y), s, HORIZONTAL_ALIGNMENT_LEFT, -1, size, col)

func vgrad(x: float, y: float, w: float, h: float, c0: Color, c1: Color) -> void:
	draw_polygon(PackedVector2Array([Vector2(x, y), Vector2(x + w, y), Vector2(x + w, y + h), Vector2(x, y + h)]), PackedColorArray([c0, c0, c1, c1]))

func draw_spr(name: String, x: float, y: float, h: float, flip: bool, alpha: float, flash: float) -> void:
	if not chars.has(name): return
	var o: Dictionary = chars[name]
	var bb: Rect2 = o["bb"]
	var w: float = h * bb.size.x / bb.size.y
	draw_set_transform(Vector2(x, y), 0.0, Vector2(-1.0 if flip else 1.0, 1.0))
	var m := Color(1, 1, 1, alpha)
	if flash > 0.0: m = Color(2.2, 2.2, 2.2, alpha)
	draw_texture_rect_region(o["tex"], Rect2(-w / 2.0, -h, w, h), bb, m)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

func draw_dish(k: String, c: Vector2, z: float, fl: Array = [], alpha: float = 1.0, rot: float = 0.0) -> void:
	var def: Dictionary = Run.D(k)
	if def.has("parts"):
		draw_dish(def["parts"][0], c + Vector2(-z * 0.2, z * 0.04), z * 0.78, [], alpha, rot)
		draw_dish(def["parts"][1], c + Vector2(z * 0.2, -z * 0.08), z * 0.78, [], alpha, rot)
	elif UI.has_icon("d_" + k):
		draw_set_transform(c, rot, Vector2.ONE)
		draw_texture_rect(UI.tex("d_" + k), Rect2(-z / 2.0, -z / 2.0, z, z), false, Color(1, 1, 1, alpha))
		draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	if fl.size() > 0:
		draw_arc(c, z * 0.58, 0.0, TAU, 20, Color(Data.FLAV[fl[fl.size() - 1]]["col"]), 1.4)

func panel_box(r: Rect2, accent: Color = Color("#ffb84a"), dim: bool = false) -> void:
	draw_style_box(UI.box("panel", 12), r)
	if accent != Color("#ffb84a"):
		draw_style_box(UI.rim(accent, 2), r)
	if dim:
		draw_rect(r.grow(-2), Color(0.08, 0.05, 0.1, 0.5))

func btn_box(r: Rect2, label: String, size: int = 6) -> void:
	draw_style_box(UI.box("btn", 6), r)
	T(label, r.position.x + r.size.x / 2.0, r.position.y + r.size.y / 2.0 + 2.5, Color("#ffe9c0"), size, 1)

func _draw() -> void:
	var sh := Vector2.ZERO
	if shake > 0.0:
		sh = Vector2(rnd(-1, 1), rnd(-1, 1)) * shake * 3.0
	draw_set_transform(sh, 0.0, Vector2.ONE)
	draw_rect(Rect2(-10, -10, LW + 20, LH + 20), Color.BLACK)
	draw_bg()
	for z in ZN:
		var a := clampf(z["t"], 0.0, 1.0) * 0.55
		var col := Color(1.0, 0.42, 0.16, a) if z["k"] == "fire" else Color(0.75, 0.91, 1.0, a)
		draw_set_transform(Vector2(z["x"], z["y"]) + sh, 0.0, Vector2(1.0, 0.45))
		draw_circle(Vector2.ZERO, z["r"], col)
	draw_set_transform(sh, 0.0, Vector2.ONE)
	var order := E.duplicate()
	order.sort_custom(func(a, b): return a["z"] < b["z"])
	for e in order:
		var Tt: Dictionary = Data.CT[e["type"]]
		var al: float = clampf(1.1 - e["t"], 0.0, 1.0) if e["state"] == "fed" else 1.0
		var bob: float = abs(sin(clock * 8.0 + e["lx"] * 9.0 + e["max"] + e["sx"])) * -2.0 * e["ss"] if e["state"] == "walk" else 0.0
		draw_set_transform(Vector2(e["sx"], e["sy"]) + sh, 0.0, Vector2(1.0, 0.27))
		draw_circle(Vector2.ZERO, e["dh"] * 0.26, Color(0, 0, 0, 0.3 * al))
		draw_set_transform(sh, 0.0, Vector2.ONE)
		draw_spr(e["spr"], e["sx"], e["sy"] + bob, e["dh"], e["face"] < 0, al, e["flash"])
		if e["chill"] > 0.0:
			R(e["sx"] - e["dh"] * 0.2, e["sy"] - e["dh"], e["dh"] * 0.4, e["dh"], Color(0.59, 0.86, 1.0, 0.3))
		if e["burn"] > 0.0:
			var f: float = e["dh"] / 30.0
			R(e["sx"] - 4 * f, e["sy"] - e["dh"] - 3 - sin(clock * 18.0 + e["lx"] * 9.0) * 2.0, 3 * f, 5 * f, Color("#ff7a3a"))
			R(e["sx"], e["sy"] - e["dh"] - 5 - cos(clock * 18.0 + e["lx"] * 9.0) * 2.0, 3 * f, 6 * f, Color("#ffd24a"))
		if e["state"] == "fed":
			T("♥", e["sx"], e["sy"] - e["dh"] - 2, Color("#ff6a9a"), 9, 1)
		elif e["hp"] < e["max"]:
			var w: float = maxf(12.0, e["dh"] * 0.5) * (1.6 if Tt.get("boss", false) else 1.0)
			R(e["sx"] - w / 2, e["sy"] - e["dh"] - 6, w, 3, Color("#3a1a1a"))
			R(e["sx"] - w / 2, e["sy"] - e["dh"] - 6, w * clampf(e["hp"] / e["max"], 0.0, 1.0), 3, Color("#ffb84a") if e["hp"] / e["max"] > 0.5 else Color("#ff6a4a"))
		if e["stun"] > 0.0:
			T("*", e["sx"], e["sy"] - e["dh"] - 8, Color.WHITE, 8, 1)
	if spot_key == "night":
		R(0, 0, LW, LH, Color(0.03, 0.02, 0.12, 0.28))
	draw_fg()
	if fire > 0.0:
		for i in 10:
			R(40 + i * 40 + sin(clock * 20.0 + i) * 3.0, LH - 14 - fposmod(clock * 50.0 + i * 9.0, 26.0), 6, 10, Color("#ff7a3a") if i % 2 == 1 else Color("#ffd24a"))
	# staff behind the counter
	for i in mini(4, Run.staff.size()):
		var sid: String = Run.staff[i]
		var px: float = [54.0, 92.0, 388.0, 426.0][i]
		for st in Data.STAFF:
			if st["id"] == sid:
				draw_set_transform(Vector2(px, 230) + sh, 0.0, Vector2(1.0, 0.3))
				draw_circle(Vector2.ZERO, 13.0, Color(0, 0, 0, 0.3))
				draw_set_transform(sh, 0.0, Vector2.ONE)
				draw_spr(st["spr"], px, 230.0 + sin(clock * 3.0 + i * 2.0) * 1.5 - (abs(sin(clock * 14.0 + i)) * 3.0 if fire > 0.0 else 0.0), 40.0, i > 1, 1.0, 0.0)
	draw_stations()
	for h in HP:
		draw_circle(Vector2(h["x"], h["y"]), h["size"], Color("#ff6a6a"))
		R(h["x"] - 1, h["y"] - h["size"] * 0.6, 2, h["size"] * 0.7, Color.WHITE)
		R(h["x"] - 1, h["y"] + h["size"] * 0.3, 2, 2, Color.WHITE)
	for b in BOLT:
		var a := clampf(b["t"] * 4.0, 0.0, 1.0)
		var m := Vector2((b["x1"] + b["x2"]) / 2.0 + rnd(-8, 8), (b["y1"] + b["y2"]) / 2.0 + rnd(-8, 8))
		draw_polyline(PackedVector2Array([Vector2(b["x1"], b["y1"]), m, Vector2(b["x2"], b["y2"])]), Color(0.85, 1.0, 0.94, a), 2.0)
	for p in PR:
		var z: float = p["size"] * (1.0 + sin(minf(1.0, p["tt"] / p["dur"]) * PI) * 0.4 if p["lob"] else 1.0) * 3.6
		draw_dish(p["k"], Vector2(p["x"], p["y"]), z, p["fl"], 1.0, p["rot"])
	for q in PT:
		var a := clampf(q["t"] / q["max"] * 1.4, 0.0, 1.0)
		var c: Color = q["col"]
		R(q["x"] - q["r"] / 2, q["y"] - q["r"] / 2, q["r"], q["r"], Color(c.r, c.g, c.b, c.a * a))
	for f in FT:
		var c: Color = f["col"]
		T(f["s"], f["x"], f["y"], Color(c.r, c.g, c.b, clampf(f["t"] * 2.0, 0.0, 1.0)), 7, 1)
	if drag["on"] and Vector2(drag["x"] - drag["sx"], drag["y"] - drag["sy"]).length() > 10.0:
		var ds: Dictionary = drag["ds"]
		var ax: float = drag["x"]
		var ay: float = drag["y"]
		var bd: float = pow(44.0 * Run.perks["magnet"], 2)
		for e in E:
			if e["state"] == "fed" or e["z"] < 0.03: continue
			var b := body_of(e)
			var dd: float = pow(b["x"] - ax, 2) + pow(b["y"] - ay, 2)
			if dd < bd:
				bd = dd; ax = b["x"]; ay = b["y"]
		draw_line(Vector2(ds["sx"], 232), Vector2(ax, ay), Color(1, 0.9, 0.5, 0.6), 1.5)
		draw_arc(Vector2(ax, ay), 10.0, 0.0, TAU, 16, Color(1, 0.9, 0.5, 0.8), 1.5)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	if vig > 0.0:
		draw_rect(Rect2(0, 0, LW, 8), Color(0.8, 0.08, 0.08, clampf(vig, 0.0, 1.0) * 0.4))
		draw_rect(Rect2(0, LH - 8, LW, 8), Color(0.8, 0.08, 0.08, clampf(vig, 0.0, 1.0) * 0.4))
	draw_hud()

func draw_stations() -> void:
	var L := st_lay()
	var nb: int = stations.filter(func(x): return x["cook"]).size()
	T("BURNERS %d/%d" % [nb, Run.burners()], LW / 2, 221, Color("#ffd9a0"), 6, 1)
	for i in stations.size():
		var ds: Dictionary = stations[i]
		var x: float = L["x0"] + i * L["sw"] + 2.0
		var y: float = 226.0 + (sin(clock * 60.0) * 2.0 if ds["shk"] > 0.0 else 0.0)
		var w: float = L["sw"] - 4.0
		var h := 42.0
		var dk: Dictionary = Run.D(ds["d"]["k"])
		var burn: bool = ds["fire"] > 0.0
		var dr: bool = drag["on"] and drag["ds"] == ds
		var fillc := Color(0.43, 0.12, 0.055, 0.96) if burn else (Color(0.27, 0.2, 0.09, 0.96) if dr else (Color(0.17, 0.12, 0.1, 0.95) if ds["cook"] else Color(0.12, 0.07, 0.14, 0.94)))
		var sb := StyleBoxFlat.new()
		sb.bg_color = fillc
		sb.border_color = Color("#ff7a3a") if burn else (Color("#7a5a5a") if ds["stock"] < 1 else Color(dk["col"]))
		sb.set_border_width_all(2 if ds["stock"] > 0 else 1)
		sb.set_corner_radius_all(6)
		draw_style_box(sb, Rect2(x, y, w, h))
		draw_dish(ds["d"]["k"], Vector2(x + w / 2, y + 13), minf(23.0, w * 0.34), ds["d"]["fl"], 1.0 if ds["stock"] > 0 else 0.4)
		T("Lv%d" % ds["d"]["lv"], x + w - 5, y + 9, Color("#d8c8b0"), 6, 2)
		for j in STOCKCAP:
			var pw := minf(9.0, (w - 12.0) / STOCKCAP - 2.0)
			var px := x + w / 2 - (STOCKCAP * (pw + 2.0) - 2.0) / 2.0 + j * (pw + 2.0)
			R(px, y + 25, pw, 6, Color(dk["col"]) if j < ds["stock"] else Color("#3a3040"))
		R(x + 5, y + 35, w - 10, 4, Color("#2a2030"))
		if ds["cook"] and ds["stock"] < STOCKCAP:
			R(x + 5, y + 35, (w - 10) * clampf(ds["prog"], 0.0, 1.0), 4, Color("#ffb84a"))
		if not ds["cook"] and not burn:
			T("OFF", x + w / 2, y + h - 2, Color("#8a7a8a"), 5, 1)
		if ds["cook"] and not burn and ds["stock"] < STOCKCAP:
			R(x + w / 2 - 3 + sin(clock * 10.0 + i) * 1.5, y - 5 - fposmod(clock * 20.0 + i * 5.0, 6.0), 3, 5, Color("#ff9a3a"))
		if burn:
			for k in 3:
				R(x + 6 + k * (w / 3) + sin(clock * 18.0 + k) * 2.0, y - 4 - fposmod(clock * 40.0 + k * 9.0, 12.0), 7, 10, Color("#ff7a3a") if k % 2 == 1 else Color("#ffd24a"))
			T("TAP x%d" % (3 - ds["taps"]), x + w / 2, y + h - 2, Color.WHITE, 8, 1)
		if ds["fb"] > 0.0:
			var c: Color = ds["fc"]
			T(ds["fbt"], x + w / 2, y - 14 - (0.7 - ds["fb"]) * 14.0, Color(c.r, c.g, c.b, clampf(ds["fb"] * 2.0, 0.0, 1.0)), 8, 1)
	T("TAP a dish = burner on/off.   FLICK a dish at anyone = throw it.", LW / 2, LH - 2, Color("#b8a898"), 5, 1)

func draw_hud() -> void:
	panel_box(Rect2(8, 6, 120, 34))
	R(16, 13, 104, 6, Color("#3a1a1a"))
	R(16, 13, 104 * clampf(Run.hp / Run.hp_max, 0.0, 1.0), 6, Color("#6ad86a") if Run.hp / Run.hp_max > 0.4 else Color("#ff6a5a"))
	T("TRUCK %d" % ceili(Run.hp), 18, 18.5, Color.WHITE, 5)
	R(16, 22, 104, 5, Color("#2a2440"))
	R(16, 22, 104 * clampf(Run.xp / Run.need_xp(), 0.0, 1.0), 5, Color("#ffd24a"))
	T("LV %d" % Run.lv, 18, 26.6, Color("#2a1408"), 5)
	T("$%d   fed %d" % [int(Run.cash), Run.fed], 16, 36.5, Color("#ffe9a8"), 6)
	for i in Run.dishes.size():
		var d: Dictionary = Run.dishes[i]
		var px := 8.0 + i * 28.0
		var py := 44.0
		draw_rect(Rect2(px, py, 26, 16), Color(0.08, 0.05, 0.1, 0.72))
		draw_dish(d["k"], Vector2(px + 8, py + 8), 13.0)
		T("%d" % d["lv"], px + 14, py + 11, Color.WHITE, 7)
	var left: float = maxf(0.0, limit - shift_t)
	panel_box(Rect2(LW / 2 - 46, 32, 92, 18))
	T("%d:%02d" % [int(left / 60.0), int(ceil(left)) % 60], LW / 2, 45, Color("#ff8a6a") if left < 10.0 else Color("#fff4c0"), 10, 1)
	T(spot["n"], LW / 2, 60, Color.WHITE, 6, 1)
	var cx0 := LW - 84.0
	var cy0 := 56.0
	T("CHAIN", cx0 - 6, cy0 + 8, Color("#b8a898"), 5, 2)
	for i in 3:
		draw_rect(Rect2(cx0 + i * 22, cy0 - 2, 20, 20), Color(0.08, 0.05, 0.1, 0.8))
		draw_rect(Rect2(cx0 + i * 22, cy0 - 2, 20, 20), Color("#ffe27a") if i < chain.size() else Color("#4a3a50"), false, 1.2)
		if i < chain.size():
			draw_dish(chain[i]["k"], Vector2(cx0 + i * 22 + 10, cy0 + 8), 14.0, chain[i]["fl"])
	btn_box(combo_btn, "COMBOS", 6)
	if heat > 8.0:
		R(LW - 70, 86, 56, 6, Color("#2a1410"))
		R(LW - 70, 86, 56 * clampf(heat / 100.0, 0.0, 1.0), 6, Color("#ff4a2a") if heat > 75.0 else Color("#ff9a3a"))
		T("KITCHEN HEAT", LW - 42, 83, Color("#ffb890"), 5, 1)
	if msg_t > 0.0:
		T(msg, LW / 2, 86, Color(1, 1, 1, clampf(msg_t, 0.0, 1.0)), 11, 1)
	if big_t > 0.0:
		T(big_txt, LW / 2, 120, Color(big_col.r, big_col.g, big_col.b, clampf(big_t * 1.6, 0.0, 1.0)), 20, 1)
	if boss != null and boss["state"] != "fed":
		var w := 200.0
		R(LW / 2 - w / 2, LH - 18, w, 8, Color("#2a1018"))
		R(LW / 2 - w / 2, LH - 18, w * clampf(boss["hp"] / boss["max"], 0.0, 1.0), 8, Color("#ff6a8a"))
		T(boss.get("bname", "THE FOOD CRITIC"), LW / 2, LH - 21, Color("#ffd0e0"), 7, 1)
	if legend:
		draw_rect(Rect2(40, 34, 400, 176), Color(0.03, 0.015, 0.055, 0.92))
		T("COMBOS: chain 3 throws", LW / 2, 52, Color("#ffd24a"), 11, 1)
		for i in Data.COMBOS.size():
			var q: Dictionary = Data.COMBOS[i]
			draw_texture_rect(UI.tex(q["ic"]), Rect2(58, 70 + i * 34, 28, 28), false)
			T(q["n"], 96, 76 + i * 34, Color("#ffe27a"), 8)
			T(q["d"], 96, 88 + i * 34, Color("#d8c8b0"), 6)
		T("(tap anywhere to close)", LW / 2, 204, Color("#8a7a8a"), 6, 1)

func draw_bg() -> void:
	var dk: String = spot["deco"]
	var sky: Array = {"beach": ["#7ec8f0", "#e0f2ff"], "office": ["#8ab8e0", "#e8f0f8"], "stadium": ["#f09a6a", "#ffd8a0"], "festival": ["#80c0f0", "#fff0c0"], "night": ["#0a0a28", "#40306a"], "gala": ["#3a2050", "#c06a7a"]}[dk]
	vgrad(0, 0, LW, HZ + 2, Color(sky[0]), Color(sky[1]))
	if dk == "night" or dk == "gala":
		for i in 40:
			R((i * 73) % int(LW), (i * 31) % 80, 1, 1, Color(1, 1, 1, 0.7))
	if dk == "beach":
		R(0, HZ - 14, LW, 16, Color("#4a9ad8"))
		for x in range(0, int(LW), 24):
			R(x, HZ - 10 + (x / 24 % 2) * 3, 10, 2, Color("#bfe4ff"))
		for i in 5:
			var x := 40 + i * 100
			R(x, HZ - 26, 3, 26, Color("#6a4a2a")); R(x - 10, HZ - 30, 22, 5, Color("#3a9a4a"))
	elif dk == "stadium":
		R(0, HZ - 40, LW, 42, Color("#5a5a6a"))
		for x in range(0, int(LW), 6):
			R(x, HZ - 36 + ((x * 7) % 24), 4, 3, Color("#e8d070") if hsh(x, 3) > 0.5 else Color("#d06a6a"))
		R(0, HZ - 44, LW, 6, Color("#3a3a48"))
	else:
		var cols: Array = {"night": ["#1a1a3a", "#241a44", "#2a2050"], "gala": ["#5a2a4a", "#6a3a5a", "#4a2040"], "festival": ["#d8b078", "#c89860", "#e0c088"], "office": ["#7a8aa8", "#8a9ab8", "#6a7a98"]}[dk]
		for x in range(0, int(LW), 34):
			var h := 18.0 + hsh(x, dk.length()) * 46.0
			R(x, HZ - h, 32, h + 2, Color(cols[(x / 34) % 3]))
			var wy := HZ - h + 5
			while wy < HZ - 4:
				var wx := x + 4
				while wx < x + 28:
					R(wx, wy, 4, 5, (Color("#ffd84a") if hsh(wx, wy) > 0.5 else Color("#ff5ac8")) if dk == "night" else Color(1, 1, 1, 0.35))
					wx += 9
				wy += 9
	var gr: Array = {"beach": ["#ecd8a0", "#d8c088"], "office": ["#7a7e88", "#4a4e58"], "stadium": ["#5a9a4a", "#3a7a38"], "festival": ["#9aa860", "#6a8040"], "night": ["#34304a", "#1c1a30"], "gala": ["#9a3a4a", "#5a1a2a"]}[dk]
	vgrad(0, HZ, LW, LH - HZ, Color(gr[0]), Color(gr[1]))
	for i in range(-6, 7):
		draw_line(Vector2(240 + i * 14, HZ), Vector2(240 + i * 84, LH), Color(1, 1, 1, 0.14), 1.0)
	var y := HZ + 10
	while y < NY + 20:
		R(0, y, LW, 2, Color(0, 0, 0, 0.05))
		y += maxf(7.0, (y - HZ) * 0.3)
	if dk == "stadium":
		draw_line(Vector2(0, HZ + 60), Vector2(LW, HZ + 60), Color(1, 1, 1, 0.4), 1.0)

func draw_fg() -> void:
	vgrad(0, 0, 34, LH, Color("#2a2630"), Color("#4a4452"))
	R(0, 0, 34, LH, Color(0, 0, 0, 0))
	draw_polygon(PackedVector2Array([Vector2(LW - 34, 0), Vector2(LW, 0), Vector2(LW, LH), Vector2(LW - 34, LH)]), PackedColorArray([Color("#4a4452"), Color("#2a2630"), Color("#2a2630"), Color("#4a4452")]))
	var y := 14
	while y < LH:
		R(6, y, 3, 3, Color("#6a6272")); R(LW - 9, y, 3, 3, Color("#6a6272"))
		y += 24
	draw_circle(Vector2(18, 90), 9, Color("#8a8a98")); R(16, 98, 4, 16, Color("#8a8a98")); draw_circle(Vector2(18, 90), 6, Color("#6a6a78"))
	R(LW - 26, 80, 16, 12, Color("#d8d0c0")); R(LW - 24, 76, 3, 6, Color.WHITE); R(LW - 17, 76, 3, 6, Color.WHITE); R(LW - 23, 84, 2, 2, Color("#222")); R(LW - 17, 84, 2, 2, Color("#222"))
	for x in range(0, int(LW), 24):
		var col := Color("#f0f0e8") if (x / 24) % 2 == 1 else Color("#d83a3a")
		R(x, 0, 24, 26, col)
		draw_circle(Vector2(x + 12, 26), 12, col)
	R(0, 26, LW, 3, Color(0, 0, 0, 0.2))
	vgrad(0, NY + 6, LW, 14, Color("#c0864a"), Color("#a86c3a"))
	R(0, NY + 20, LW, LH - NY - 20, Color("#2a2028"))
	R(0, NY + 6, LW, 2, Color(1, 1, 1, 0.25))
	R(0, NY + 26, LW, LH - NY - 26, Color("#3a303a"))
	var cols2 := ["#e0603a", "#e8c040", "#7ac060", "#6ab0e0", "#e090c0", "#c8a060", "#d8d8e0"]
	for i in 7:
		var x := 40 + i * 60
		R(x, NY + 32, 14, 18, Color(cols2[i])); R(x, NY + 46, 14, 4, Color(0, 0, 0, 0.3)); R(x + 2, NY + 30, 10, 3, Color("#ccaaaa"))
	R(110, NY + 54, 260, 10, Color("#202028"))
