extends Node
# Autoload "Run": the state of the current run (cash, fuel, dishes, perks, staff...) and the rules that change it.

var truck: Dictionary = {}
var shift_n := 0
var cash := 30.0
var xp := 0.0
var lv := 1
var fed := 0
var hp_max := 120.0
var hp := 120.0
var dishes: Array = []
var dish_defs: Dictionary = {}
var staff: Array = ["intern"]
var relics: Array = []
var fuel := 100.0
var fuel_max := 100.0
var fuel_use := 1.0
var insp := 6.0
var rating: Array = []
var stops := 0
var leg_shifts := 0
var car := {"engine": 0, "tires": 0, "armor": 0, "window": 0, "vent": 0, "tank": 0}
var perks := {}
var log: Array = []
var review: Dictionary = {}
var flash_msg := ""
var rng := RandomNumberGenerator.new()

func _ready() -> void:
	rng.randomize()
	new_run(0)

func new_run(tr: int) -> void:
	truck = Data.TRUCKS[tr]
	shift_n = 0; cash = 30.0; xp = 0.0; lv = 1; fed = 0
	hp_max = roundf(120.0 * truck["hp"]); hp = hp_max
	dishes = []; staff = ["intern"]; relics = []; fuel = 100.0; fuel_max = 100.0; fuel_use = 1.0; insp = 6.0
	rating = []; stops = 0; leg_shifts = 0; log = []; review = {}
	car = {"engine": 0, "tires": 0, "armor": 0, "window": 0, "vent": 0, "tank": 0}
	perks = {"shots": 0, "rate": 1.0, "dmg": 1.0, "speed": truck["spd"], "magnet": 1.0, "armor": 1.0, "size": 1.0, "tip": 1.0, "heat": 1.0, "chill": 1.0, "burn": 1.0, "stun": 1.0, "xp": 1.0, "drive": 0}
	dish_defs = Data.DISH.duplicate(true)
	add_dish(truck["dish"])
	if truck["id"] == "purple": perks["rate"] *= 1.15
	if truck["id"] == "green": dishes[0]["lv"] = 3
	if truck["id"] == "gold": perks["shots"] += 1

func D(k: String) -> Dictionary:
	return dish_defs[k]

func need_xp() -> float:
	return 4.0 + lv * 3.4

func add_dish(k: String) -> void:
	dishes.append({"k": k, "lv": 1, "fl": [], "recipe": ""})

func recipe_check(d: Dictionary) -> void:
	if d["lv"] >= 3 and d["fl"].size() > 0 and d["recipe"] == "":
		d["recipe"] = Data.RECIPE.get(d["k"] + "_" + d["fl"][d["fl"].size() - 1], "")
		if d["recipe"] != "":
			flash_msg = "RECIPE UNLOCKED: %s!" % d["recipe"]

func dish_count(d: Dictionary) -> int:
	return int(D(d["k"])["n0"]) + int(floor((d["lv"] - 1) / 2.0)) + int(perks["shots"])

func dish_dmg(d: Dictionary) -> float:
	return D(d["k"])["dmg"] * (1.0 + 0.25 * (d["lv"] - 1)) * perks["dmg"]

func has_staff(id: String) -> bool:
	return staff.has(id)

func burners() -> int:
	return 2 + (1 if has_staff("sous") else 0)

func avg_stars() -> float:
	if rating.is_empty():
		return 3.0
	var s := 0.0
	for r in rating: s += r
	return s / rating.size()

func heat_level() -> int:
	return mini(5, int(ceil(insp / 18.0)))

func gas_price() -> float:
	return maxf(0.28, 0.5 * (1.0 - 0.07 * (avg_stars() - 3.0)))

func upg_price(u: Dictionary) -> int:
	return int(roundf(u["base"] * (1.0 + 0.6 * car[u["id"]])))

func apply_upgrade(id: String) -> void:
	match id:
		"engine": perks["speed"] *= 1.08
		"tires": fuel_use *= 0.85
		"armor": hp_max += 25.0; hp = minf(hp_max, hp + 25.0)
		"window": perks["shots"] += 1
		"vent": perks["heat"] *= 0.7; insp = maxf(0.0, insp - 18.0)
		"tank": fuel_max += 30.0; fuel = minf(fuel_max, fuel + 30.0)
	car[id] += 1

func apply_perk(id: String) -> void:
	match id:
		"plates": perks["shots"] += 1
		"hands": perks["rate"] *= 1.2
		"portion": perks["dmg"] *= 1.25
		"skates": perks["speed"] *= 1.15
		"magnet": perks["magnet"] *= 1.4
		"counter": perks["armor"] *= 0.85
		"bigplate": perks["size"] *= 1.25
		"cashier": perks["tip"] *= 1.2
	log.append(id)

func apply_relic(id: String) -> void:
	match id:
		"pan": perks["shots"] += 1
		"ext": perks["heat"] *= 0.5
		"spat": perks["dmg"] *= 1.15
		"spoon": perks["tip"] *= 1.25
		"fridge": perks["chill"] *= 1.8
		"ghost": perks["burn"] *= 1.6
		"pickle": perks["stun"] *= 2.0
		"gps": perks["drive"] += 15
		"loyal": perks["xp"] *= 1.3
		"tires": perks["speed"] *= 1.2
	relics.append(id)

func pool() -> Array:
	var o: Array = []
	for k in Data.DISH.keys():
		var owned := false
		for d in dishes:
			if d["k"] == k or (dish_defs[d["k"]].has("parts") and dish_defs[d["k"]]["parts"].has(k)):
				owned = true
		if not owned and dishes.size() < 4:
			o.append({"w": 3.0, "kind": "dish", "icon": k, "t": "New: " + Data.DISH[k]["n"], "d": Data.DISH[k]["desc"], "col": Data.DISH[k]["col"], "do": "dish", "arg": k})
	for d in dishes:
		if d["lv"] < 6:
			var txt := "+25% damage and a new recipe slot (with a flavour)." if d["lv"] + 1 == 3 else ("+25% damage." if (d["lv"] + 1) % 2 == 1 else "+1 projectile and +25% damage.")
			o.append({"w": 4.0, "kind": "lv", "icon": d["k"], "t": "%s Lv %d" % [D(d["k"])["n"], d["lv"] + 1], "d": txt, "col": D(d["k"])["col"], "do": "lv", "ref": d})
		if d["fl"].size() < 2:
			for f in Data.FLAV.keys():
				if not d["fl"].has(f):
					o.append({"w": 2.2, "kind": "fl", "icon": d["k"], "fk": f, "t": "%s %s" % [Data.FLAV[f]["n"], D(d["k"])["n"]], "d": Data.FLAV[f]["desc"], "col": Data.FLAV[f]["col"], "do": "fl", "ref": d, "arg": f})
	for p in Data.PERKS:
		var n := log.count(p["id"])
		if not p.has("max") or n < p["max"]:
			o.append({"w": 2.0, "kind": "perk", "pid": p["id"], "t": p["t"], "d": p["d"], "col": "#ffd27a", "do": "perk", "arg": p["id"]})
	return o

func pick3() -> Array:
	var o := pool()
	var out: Array = []
	while out.size() < 3 and not o.is_empty():
		var tot := 0.0
		for it in o: tot += it["w"]
		var r := rng.randf() * tot
		var i := 0
		while i < o.size() - 1:
			r -= o[i]["w"]
			if r <= 0.0: break
			i += 1
		var it: Dictionary = o.pop_at(i)
		var dup := false
		for x in out:
			if x["t"] == it["t"]: dup = true
		if not dup: out.append(it)
	return out

func apply_offer(o: Dictionary) -> void:
	match o["do"]:
		"dish": add_dish(o["arg"])
		"lv": o["ref"]["lv"] += 1; recipe_check(o["ref"])
		"fl": o["ref"]["fl"].append(o["arg"]); recipe_check(o["ref"])
		"perk": apply_perk(o["arg"])
		"staff": staff.append(o["arg"])

func fusion_key(a: String, b: String) -> String:
	var arr := [a, b]
	arr.sort()
	return "fuse_%s_%s" % [arr[0], arr[1]]

func fusion_name(a: String, b: String) -> String:
	var arr := [a, b]
	arr.sort()
	var key := "%s_%s" % [arr[0], arr[1]]
	return Data.FUSION.get(key, dish_defs[a]["n"] + "-" + dish_defs[b]["n"])

func fuse(a: Dictionary, b: Dictionary) -> String:
	var ka: String = a["k"]
	var kb: String = b["k"]
	var key := fusion_key(ka, kb)
	var A: Dictionary = D(ka)
	var B: Dictionary = D(kb)
	if not dish_defs.has(key):
		dish_defs[key] = {"n": fusion_name(ka, kb), "col": A["col"], "cd": (A["cd"] + B["cd"]) / 2.0, "dmg": (A["dmg"] + B["dmg"]) * 0.72, "spd": (A["spd"] + B["spd"]) / 2.0, "n0": maxi(A["n0"], B["n0"]),
			"spread": A.get("spread", B.get("spread", 0.0)), "pierce": maxi(A.get("pierce", 0), B.get("pierce", 0)), "boom": A.get("boom", false) or B.get("boom", false),
			"lob": (A.get("lob", false) or B.get("lob", false)) and not (A.get("boom", false) or B.get("boom", false)), "splash": maxf(A.get("splash", 0.0), B.get("splash", 0.0)), "parts": [ka, kb], "desc": "A fusion of %s and %s." % [A["n"], B["n"]]}
	var fl: Array = []
	for f in a["fl"] + b["fl"]:
		if not fl.has(f): fl.append(f)
	fl = fl.slice(0, 2)
	var lvl := maxi(a["lv"], b["lv"])
	dishes.erase(a)
	dishes.erase(b)
	dishes.append({"k": key, "lv": lvl, "fl": fl, "recipe": ""})
	return dish_defs[key]["n"]

func make_review(fed_this: int, remaining: int, fires: int) -> Dictionary:
	var tot := fed_this + remaining
	var r := float(fed_this) / tot if tot > 0 else 1.0
	var st := 5 if r > 0.9 else (4 if r > 0.78 else (3 if r > 0.6 else (2 if r > 0.4 else 1)))
	if hp < hp_max * 0.3: st -= 1
	if fires > 0: st -= 1
	st = clampi(st, 1, 5)
	var q: Array = Data.QUIPS[st]
	return {"stars": st, "q": q[rng.randi() % q.size()], "pct": int(roundf(r * 100.0))}
