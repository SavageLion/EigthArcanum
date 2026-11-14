class_name Meta
extends RefCounted
# The campaign: a farm of plots, each with its own animals and castle. Animals make raw materials,
# materials unlock spells, castle pieces and plots, and every few gathers one of your plots is attacked.

const SAVE_PATH: String = "user://campaign.json"
const GATHERS_PER_ATTACK: int = 3
const FINAL_ATTACK: int = 12
const SPIN_LEN: float = 3.0

const MATS: Dictionary = {
	"wool": {"name": "Wool", "col": Color(0.95, 0.93, 0.85)},
	"eggs": {"name": "Eggs", "col": Color(0.96, 0.82, 0.45)},
	"milk": {"name": "Milk", "col": Color(0.7, 0.85, 0.98)},
	"cheese": {"name": "Cheese", "col": Color(0.95, 0.7, 0.2)},
	"truffle": {"name": "Truffles", "col": Color(0.55, 0.36, 0.25)},
	"horn": {"name": "Horn", "col": Color(0.78, 0.7, 0.55)},
	"fleece": {"name": "Fine fleece", "col": Color(0.9, 0.75, 0.55)},
	"fur": {"name": "Thick fur", "col": Color(0.45, 0.32, 0.24)},
	"tusk": {"name": "Tusks", "col": Color(0.97, 0.94, 0.8)},
	"stardust": {"name": "Stardust", "col": Color(0.9, 0.7, 1.0)},
	"scales": {"name": "Dragon scales", "col": Color(0.35, 0.8, 0.45)},
	"ember": {"name": "Phoenix ember", "col": Color(1.0, 0.55, 0.15)},
}
const MAT_ORDER: Array = ["wool", "eggs", "milk", "cheese", "truffle", "horn", "fleece", "fur", "tusk", "stardust", "scales", "ember"]
const MAT_OF: Dictionary = {"normal": "wool", "black": "wool", "lamb": "wool", "ram": "horn", "goat": "cheese", "cow": "milk", "pig": "truffle", "goose": "eggs", "duck": "eggs", "chicken": "eggs", "alpaca": "fleece", "yak": "fur", "boar": "tusk", "unicorn": "stardust", "dragon": "scales", "phoenix": "ember"}
const ANIMAL_NAMES: Dictionary = {"normal": "Sheep", "black": "Black sheep", "lamb": "Lambs", "ram": "Rams", "goat": "Goats", "cow": "Cows", "pig": "Pigs", "goose": "Geese", "duck": "Ducks", "chicken": "Chickens", "alpaca": "Alpacas", "yak": "Yaks", "boar": "Boars", "unicorn": "Unicorns", "dragon": "Baby dragons", "phoenix": "Phoenixes"}

# pool: the animals that wander in at this plot (more entries = more common)
# mix: the raiders that attack it, [kind, weight]; weak and strong ones together
# cost: what it takes to open the plot (better plots need materials from earlier plots)
const PLOTS: Array = [
	{"name": "Home Paddock", "bonus": 0, "extra": "", "cost": {"wool": 10, "eggs": 3},
		"pool": ["normal", "normal", "normal", "normal", "lamb", "lamb", "duck", "duck", "goose", "chicken", "chicken"],
		"mix": [["wolf", 3], ["imp", 1], ["goblin", 1], ["skeleton", 1]]},
	{"name": "Carrot Patch", "bonus": 1, "extra": "fox", "cost": {"wool": 12, "eggs": 4},
		"pool": ["normal", "normal", "goat", "goat", "pig", "pig", "chicken", "chicken", "lamb"],
		"mix": [["wolf", 2], ["goblin", 3], ["imp", 1], ["torchling", 1]]},
	{"name": "Lavender Slope", "bonus": 1, "extra": "imp", "cost": {"wool": 14, "eggs": 6},
		"pool": ["black", "black", "black", "goat", "alpaca", "alpaca", "lamb", "goose"],
		"mix": [["imp", 2], ["wolf", 2], ["harpy", 1], ["goblin", 1], ["wisp", 1], ["kobold", 1]]},
	{"name": "Pumpkin Hollow", "bonus": 2, "extra": "imp", "cost": {"wool": 18, "milk": 4, "truffle": 3},
		"pool": ["pig", "pig", "boar", "boar", "cow", "cow", "ram", "goose", "duck"],
		"mix": [["goblin", 3], ["wolf", 1], ["gargoyle", 1], ["imp", 1], ["torchling", 2]]},
	{"name": "Poppy Meadow", "bonus": 2, "extra": "fox", "cost": {"wool": 20, "horn": 4, "fleece": 3},
		"pool": ["ram", "ram", "cow", "yak", "yak", "black", "alpaca", "goat"],
		"mix": [["wolf", 2], ["harpy", 2], ["goblin", 2], ["minotaur", 1], ["kobold", 1]]},
	{"name": "Berry Thicket", "bonus": 3, "extra": "wolf", "cost": {"wool": 24, "tusk": 4, "fur": 4},
		"pool": ["boar", "yak", "alpaca", "ram", "goose", "pig", "unicorn"],
		"mix": [["gargoyle", 2], ["ogre", 1], ["goblin", 3], ["wolf", 1], ["minotaur", 2], ["hexer", 1]]},
	{"name": "Windmill Fields", "bonus": 4, "extra": "wolf", "cost": {"fleece": 8, "fur": 6, "tusk": 6, "stardust": 2},
		"pool": ["cow", "yak", "yak", "ram", "ram", "alpaca", "unicorn", "phoenix"],
		"mix": [["ogre", 1], ["harpy", 2], ["goblin", 3], ["gargoyle", 2], ["torchling", 2], ["wisp", 1], ["skeleton", 2]]},
	{"name": "Old Orchard", "bonus": 5, "extra": "wolf", "cost": {"fur": 10, "tusk": 8, "stardust": 5, "ember": 3},
		"pool": ["unicorn", "unicorn", "phoenix", "phoenix", "alpaca", "boar", "goat", "dragon"],
		"mix": [["ogre", 2], ["harpy", 2], ["gargoyle", 2], ["imp", 1], ["goblin", 3], ["minotaur", 2], ["hexer", 2], ["kobold", 2]]},
	{"name": "The Dark Barn", "bonus": 6, "extra": "wolf", "cost": {"stardust": 8, "ember": 5, "fur": 12, "tusk": 10},
		"pool": ["dragon", "dragon", "phoenix", "unicorn", "yak", "boar"],
		"mix": [["ogre", 3], ["harpy", 2], ["gargoyle", 3], ["goblin", 4], ["wolf", 1], ["minotaur", 3], ["hexer", 2], ["wisp", 2], ["skeleton", 3], ["torchling", 2]]},
]

# kind: perk / tower / castle / tier. Better ones need materials from the later plots.
const UNLOCKS: Array = [
	{"id": "perk_wide", "kind": "perk", "ref": "wide", "name": "Wide Magic", "desc": "Perk: bigger explosions and rings.", "cost": {"eggs": 6, "milk": 2}},
	{"id": "perk_study", "kind": "perk", "ref": "study", "name": "Quick Study", "desc": "Perk: every gem gives more XP.", "cost": {"wool": 10, "eggs": 4}},
	{"id": "perk_nova", "kind": "perk", "ref": "nova", "name": "Frost Nova", "desc": "A spell: a slowing ring of frost.", "cost": {"wool": 12, "milk": 2}},
	{"id": "perk_zap", "kind": "perk", "ref": "zap", "name": "Chain Lightning", "desc": "A spell: lightning that jumps.", "cost": {"wool": 14, "cheese": 3, "fur": 3}},
	{"id": "perk_fire", "kind": "perk", "ref": "fire", "name": "Fireball", "desc": "A spell: exploding fireballs.", "cost": {"wool": 12, "horn": 4, "tusk": 3}},
	{"id": "perk_orbit", "kind": "perk", "ref": "orbit", "name": "Arcane Orbit", "desc": "A spell: orbs that circle you.", "cost": {"eggs": 10, "fleece": 4, "truffle": 3}},
	{"id": "tower_brazier", "kind": "tower", "ref": "brazier", "name": "Fire Brazier", "desc": "Tower that burns raiders at the walls.", "cost": {"wool": 12, "cheese": 2}},
	{"id": "tower_frost", "kind": "tower", "ref": "frost", "name": "Frost Totem", "desc": "Totem that slows raiders.", "cost": {"wool": 10, "horn": 3}},
	{"id": "castle_gate", "kind": "castle", "ref": "gate", "name": "Pen Gates", "desc": "Cut gates so animals walk in.", "cost": {"eggs": 6}},
	{"id": "castle_moss", "kind": "castle", "ref": "moss", "name": "Healing Moss", "desc": "Walls slowly mend.", "cost": {"eggs": 8, "milk": 2}},
	{"id": "castle_walls", "kind": "castle", "ref": "walls_up", "name": "Stronger Walls", "desc": "Reinforce the walls.", "cost": {"wool": 20, "tusk": 3}},
	{"id": "castle_market", "kind": "castle", "ref": "market", "name": "Market Stall", "desc": "Penned animals pay more gold.", "cost": {"wool": 12, "truffle": 4, "fleece": 3}},
	{"id": "castle_builders", "kind": "castle", "ref": "lv3", "name": "Master Builders", "desc": "Towers can reach level 3.", "cost": {"wool": 16, "fleece": 4, "horn": 3}},
	{"id": "tier_stone", "kind": "tier", "ref": "2", "name": "Stone Masons", "desc": "The pen can become a Stone Keep.", "cost": {"wool": 18, "fur": 4, "tusk": 3}},
	{"id": "castle_engineers", "kind": "castle", "ref": "lv4", "name": "Arcane Engineers", "desc": "Towers can reach level 4.", "cost": {"ember": 4, "scales": 3, "fur": 6}},
	{"id": "tier_castle", "kind": "tier", "ref": "3", "name": "Royal Charter", "desc": "The pen can become a Grand Castle.", "cost": {"stardust": 4, "scales": 3, "wool": 30}},
]

static var camp: Dictionary = {}
static var pending_mode: String = ""
static var pending_plot: int = 0
static var all_open: bool = false
static var loaded: bool = false

static func fresh_plot() -> Dictionary:
	return {"animals": {}, "castle": {}, "gold": 0}

static func new_campaign() -> void:
	var mats: Dictionary = {}
	for k in MAT_ORDER:
		mats[k] = 0
	camp = {"mats": mats, "unlocked": {}, "plots": {"0": fresh_plot()}, "wizard": {"perk_lv": {"bolt": 1}, "level": 1, "xp": 0.0}, "gathers": 0, "attacks": 0, "attack_plot": -1, "best": int(camp.get("best", 0))}

static func load_save() -> void:
	if loaded:
		return
	loaded = true
	if FileAccess.file_exists(SAVE_PATH):
		var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
		if f != null:
			var d: Variant = JSON.parse_string(f.get_as_text())
			if typeof(d) == TYPE_DICTIONARY and (d as Dictionary).has("plots"):
				camp = d
				# json hands numbers back as floats
				var w: Dictionary = camp["wizard"]
				var pl: Dictionary = w["perk_lv"]
				for k in pl.keys():
					pl[k] = int(pl[k])
				w["level"] = int(w["level"])
				return
	new_campaign()

static func save() -> void:
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f != null:
		f.store_string(JSON.stringify(camp))

# ---- plots
static func plot_open(i: int) -> bool:
	return (camp["plots"] as Dictionary).has(str(i))

static func open_plots() -> Array:
	var out: Array = []
	for i in PLOTS.size():
		if plot_open(i):
			out.append(i)
	return out

static func plot_data(i: int) -> Dictionary:
	return (camp["plots"] as Dictionary)[str(i)]

static func lose_plot(i: int) -> void:
	(camp["plots"] as Dictionary).erase(str(i))
	camp["attack_plot"] = -1
	camp["gathers"] = 0
	save()

static func animal_total(i: int) -> int:
	var n: int = 0
	var an: Dictionary = plot_data(i)["animals"]
	for k in an:
		n += int(an[k])
	return n

# what one plot makes each time you finish a gather
static func production(i: int) -> Dictionary:
	var out: Dictionary = {}
	var an: Dictionary = plot_data(i)["animals"]
	for k in an:
		var m: String = String(MAT_OF.get(k, "wool"))
		out[m] = int(out.get(m, 0)) + int(an[k])
	return out

# every plot's animals produce, and the attack clock moves on
static func tick_gather() -> void:
	var mats: Dictionary = camp["mats"]
	for i in open_plots():
		var pr: Dictionary = production(i)
		for m in pr:
			mats[m] = int(mats.get(m, 0)) + int(pr[m])
	camp["gathers"] = int(camp["gathers"]) + 1
	save()

static func attack_due() -> bool:
	return int(camp["gathers"]) >= GATHERS_PER_ATTACK and not open_plots().is_empty()

static func ensure_attack_target() -> int:
	var t: int = int(camp.get("attack_plot", -1))
	if t < 0 or not plot_open(t):
		var op: Array = open_plots()
		t = int(op[randi() % op.size()])
		camp["attack_plot"] = t
		save()
	return t

# ---- unlocks
static func plot_unlocks() -> Array:
	var out: Array = []
	for i in PLOTS.size():
		if plot_open(i):
			continue
		out.append({"id": "plot_%d" % i, "kind": "plot", "ref": str(i), "name": String(PLOTS[i]["name"]), "desc": "Open this plot with a fresh pen.", "cost": PLOTS[i]["cost"]})
	return out

static func tab_items(tab: int) -> Array:
	if tab == 2:
		return plot_unlocks()
	var out: Array = []
	for u in UNLOCKS:
		var k: String = String(u["kind"])
		if (tab == 0 and k == "perk") or (tab == 1 and k != "perk"):
			out.append(u)
	return out

static func has(id: String) -> bool:
	return all_open or bool((camp["unlocked"] as Dictionary).get(id, false))

static func can_afford(u: Dictionary) -> bool:
	var mats: Dictionary = camp["mats"]
	for k in (u["cost"] as Dictionary):
		if int(mats.get(k, 0)) < int((u["cost"] as Dictionary)[k]):
			return false
	return true

static func buy(u: Dictionary) -> bool:
	var plot_kind: bool = String(u["kind"]) == "plot"
	if not plot_kind and has(String(u["id"])):
		return false
	if not can_afford(u):
		return false
	var mats: Dictionary = camp["mats"]
	for k in (u["cost"] as Dictionary):
		mats[k] = int(mats.get(k, 0)) - int((u["cost"] as Dictionary)[k])
	if plot_kind:
		(camp["plots"] as Dictionary)[String(u["ref"])] = fresh_plot()
	else:
		(camp["unlocked"] as Dictionary)[String(u["id"])] = true
	save()
	return true

static func tier_cap() -> int:
	if has("tier_castle"):
		return 3
	if has("tier_stone"):
		return 2
	return 1

static func perk_ok(id: String) -> bool:
	for u in UNLOCKS:
		if String(u["kind"]) == "perk" and String(u["ref"]) == id:
			return has(String(u["id"]))
	return true

static func tower_ok(id: String) -> bool:
	for u in UNLOCKS:
		if String(u["kind"]) == "tower" and String(u["ref"]) == id:
			return has(String(u["id"]))
	return true

static func castle_ok(id: String) -> bool:
	for u in UNLOCKS:
		if String(u["kind"]) == "castle" and String(u["ref"]) == id:
			return has(String(u["id"]))
	return true
