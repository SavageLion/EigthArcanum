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
	{"name": "Sunhaven Meadows", "biome": "sunhaven", "bonus": 0, "extra": "", "cost": {"wool": 10, "eggs": 3},
		"pool": ["normal", "normal", "normal", "lamb", "lamb", "cow", "cow", "chicken", "chicken", "chicken", "duck"],
		"mix": [["wolf", 3], ["imp", 1], ["goblin", 1], ["bat", 1], ["cutpurse", 1], ["slime", 1]]},
	{"name": "Whisperwood Grove", "biome": "whisperwood", "bonus": 1, "extra": "imp", "cost": {"wool": 12, "eggs": 4},
		"pool": ["goat", "goat", "goat", "alpaca", "alpaca", "goose", "goose", "normal", "lamb", "unicorn"],
		"mix": [["imp", 2], ["wolf", 1], ["wisp", 3], ["kobold", 2], ["goblin", 2], ["bat", 1], ["shaman", 1], ["cutpurse", 1]]},
	{"name": "Hollowshade Fields", "biome": "hollowshade", "bonus": 1, "extra": "fox", "cost": {"wool": 14, "eggs": 6},
		"pool": ["pig", "pig", "pig", "boar", "boar", "cow", "cow", "normal"],
		"mix": [["wolf", 1], ["imp", 1], ["skeleton", 3], ["torchling", 2], ["goblin", 3], ["necromancer", 2], ["bat", 1], ["knight", 1]]},
	{"name": "Miremoon Marshes", "biome": "miremoon", "bonus": 2, "extra": "imp", "cost": {"wool": 18, "milk": 4, "truffle": 3},
		"pool": ["duck", "duck", "duck", "goose", "goose", "goose", "chicken", "chicken", "black"],
		"mix": [["imp", 1], ["wolf", 1], ["kobold", 3], ["wisp", 2], ["goblin", 1], ["slime", 3], ["mole", 1], ["frostling", 1]]},
	{"name": "Frostveil Pastures", "biome": "frostveil", "bonus": 2, "extra": "fox", "cost": {"wool": 20, "horn": 4, "fleece": 3},
		"pool": ["yak", "yak", "yak", "ram", "ram", "ram", "alpaca", "alpaca", "goat"],
		"mix": [["wolf", 3], ["minotaur", 2], ["hexer", 1], ["goblin", 2], ["skeleton", 1], ["frostling", 3], ["knight", 2], ["banshee", 1]]},
	{"name": "Sunscorch Expanse", "biome": "sunscorch", "bonus": 3, "extra": "fox", "cost": {"wool": 24, "tusk": 4, "fur": 4},
		"pool": ["goat", "goat", "boar", "boar", "boar", "alpaca", "alpaca", "ram"],
		"mix": [["minotaur", 3], ["torchling", 2], ["harpy", 2], ["goblin", 2], ["gargoyle", 1], ["mole", 3], ["cutpurse", 2], ["knight", 1]]},
	{"name": "Emberfall Acres", "biome": "emberfall", "bonus": 4, "extra": "imp", "cost": {"fleece": 8, "fur": 6, "tusk": 6, "stardust": 2},
		"pool": ["phoenix", "phoenix", "phoenix", "dragon", "dragon", "boar", "ram"],
		"mix": [["ogre", 2], ["torchling", 3], ["gargoyle", 2], ["goblin", 2], ["imp", 1], ["slime", 2], ["knight", 2], ["shaman", 2], ["banshee", 1]]},
	{"name": "Starfall Gardens", "biome": "starfall", "bonus": 5, "extra": "imp", "cost": {"fur": 10, "tusk": 8, "ember": 5, "stardust": 3},
		"pool": ["unicorn", "unicorn", "unicorn", "unicorn", "phoenix", "phoenix", "alpaca", "alpaca", "goose"],
		"mix": [["wisp", 3], ["hexer", 3], ["harpy", 2], ["imp", 1], ["goblin", 1], ["kobold", 1], ["banshee", 2], ["frostling", 1], ["necromancer", 1], ["shaman", 1]]},
	{"name": "Kingsgrave Estate", "biome": "kingsgrave", "bonus": 6, "extra": "wolf", "cost": {"stardust": 8, "ember": 5, "fur": 12, "tusk": 10},
		"pool": ["dragon", "dragon", "unicorn", "yak", "yak", "boar", "phoenix"],
		"mix": [["ogre", 3], ["hexer", 3], ["skeleton", 3], ["gargoyle", 3], ["minotaur", 2], ["goblin", 2], ["harpy", 1], ["knight", 3], ["necromancer", 2], ["banshee", 2], ["shaman", 2], ["mole", 1], ["cutpurse", 1]]},
]

# how each plot looks: grass colours (dark, mid, light, tip), tree tint, overall mood tint,
# drifting particles and the scattered decorations (all drawn in code)
const BIOMES: Dictionary = {
	"sunhaven": {"grass": [Color(0.20, 0.45, 0.17), Color(0.30, 0.60, 0.21), Color(0.42, 0.70, 0.26), Color(0.62, 0.82, 0.36)], "tree": Color(1, 1, 1), "tone": Color(1, 1, 1), "fx": "", "decor": []},
	"whisperwood": {"grass": [Color(0.10, 0.30, 0.30), Color(0.16, 0.48, 0.40), Color(0.26, 0.62, 0.50), Color(0.50, 0.85, 0.70)], "tree": Color(0.85, 0.7, 1.15), "tone": Color(0.9, 0.93, 1.0), "fx": "fireflies", "decor": [["mushroom", 22]]},
	"hollowshade": {"grass": [Color(0.30, 0.26, 0.10), Color(0.46, 0.38, 0.14), Color(0.58, 0.46, 0.18), Color(0.75, 0.58, 0.25)], "tree": Color(1.15, 0.72, 0.42), "tone": Color(1.0, 0.9, 0.8), "fx": "", "decor": [["pumpkin", 30]]},
	"miremoon": {"grass": [Color(0.10, 0.26, 0.22), Color(0.16, 0.38, 0.30), Color(0.22, 0.48, 0.36), Color(0.40, 0.62, 0.45)], "tree": Color(0.7, 0.95, 0.8), "tone": Color(0.85, 0.95, 0.95), "fx": "fireflies", "decor": [["puddle", 16], ["reeds", 24]]},
	"frostveil": {"grass": [Color(0.62, 0.72, 0.82), Color(0.78, 0.86, 0.93), Color(0.88, 0.94, 0.98), Color(0.97, 0.99, 1.0)], "tree": Color(0.75, 0.9, 1.1), "tone": Color(0.95, 0.97, 1.05), "fx": "snow", "decor": [["snowmound", 24], ["icepond", 4]]},
	"sunscorch": {"grass": [Color(0.66, 0.50, 0.24), Color(0.80, 0.64, 0.32), Color(0.90, 0.76, 0.42), Color(0.97, 0.86, 0.55)], "tree": Color(1.15, 1.0, 0.7), "tone": Color(1.05, 0.97, 0.88), "fx": "", "decor": [["dune", 16], ["cactus", 22]]},
	"emberfall": {"grass": [Color(0.14, 0.11, 0.11), Color(0.22, 0.17, 0.16), Color(0.32, 0.24, 0.20), Color(0.50, 0.30, 0.20)], "tree": Color(0.45, 0.35, 0.35), "tone": Color(1.0, 0.85, 0.8), "fx": "embers", "decor": [["lavapool", 8], ["emberrock", 20]]},
	"starfall": {"grass": [Color(0.08, 0.08, 0.22), Color(0.14, 0.14, 0.34), Color(0.22, 0.22, 0.46), Color(0.40, 0.40, 0.70)], "tree": Color(0.6, 0.55, 1.0), "tone": Color(0.78, 0.8, 1.0), "fx": "sparkle", "decor": [["crystal", 28]]},
	"kingsgrave": {"grass": [Color(0.16, 0.22, 0.17), Color(0.24, 0.31, 0.24), Color(0.32, 0.40, 0.31), Color(0.46, 0.54, 0.42)], "tree": Color(0.55, 0.6, 0.55), "tone": Color(0.85, 0.88, 0.9), "fx": "", "decor": [["gravestone", 28]]},
}

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
static var run: Dictionary = {}
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
	if all_open:
		return true
	if run_active():
		return bool((run["acquired"] as Dictionary).get(id, false))
	return bool((camp["unlocked"] as Dictionary).get(id, false))

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

# ================================================================ the expedition: a ten-stop road with the pen on a wagon
const RUN_LAYERS: int = 10
const BASIC: Array = ["perk_wide", "perk_study", "perk_nova", "tower_brazier", "tower_frost", "castle_gate", "castle_moss"]
const NODE_NAMES: Dictionary = {"gather": "Gather", "defend": "Defend", "elite": "Elite raid", "rest": "Rest", "merchant": "Merchant", "event": "Event", "boss": "The boss"}

static func run_active() -> bool:
	return bool(run.get("active", false))

static func new_run() -> void:
	var layers: Array = []
	for l in RUN_LAYERS:
		var n: int = 1 if (l == 0 or l == RUN_LAYERS - 1) else (2 + randi() % 2)
		var layer: Array = []
		for i in n:
			var tp: String = "gather"
			if l == RUN_LAYERS - 1:
				tp = "boss"
			elif l == RUN_LAYERS - 2:
				tp = "rest" if randf() < 0.5 else "merchant"
			elif l > 0:
				var roll: float = randf() * (100.0 if l >= 3 else 90.0)
				if roll < 28.0:
					tp = "gather"
				elif roll < 54.0:
					tp = "defend"
				elif roll < 64.0:
					tp = "rest"
				elif roll < 74.0:
					tp = "merchant"
				elif roll < 88.0:
					tp = "event"
				else:
					tp = "elite"
			var b: int = clampi(roundi(float(l) * 8.0 / 9.0) + (randi() % 3 - 1), 0, 8)
			if l == 0:
				b = 0
			if l == RUN_LAYERS - 1:
				b = 8
			layer.append({"type": tp, "biome": b, "next": [], "done": false})
		layers.append(layer)
	var l1: Array = layers[1]
	var has_gather: bool = false
	for nd in l1:
		if String(nd["type"]) == "gather":
			has_gather = true
	if not has_gather:
		(l1[0] as Dictionary)["type"] = "gather"
	for l in RUN_LAYERS - 1:
		var cur: Array = layers[l]
		var nxt: Array = layers[l + 1]
		var incoming: Array = []
		for k in nxt.size():
			incoming.append(false)
		for j in cur.size():
			var base: int = clampi(roundi((float(j) + 0.5) * float(nxt.size()) / float(cur.size()) - 0.5), 0, nxt.size() - 1)
			var links: Array = [base]
			if nxt.size() > 1 and randf() < 0.5:
				var alt: int = base + (1 if (base == 0 or randf() < 0.5) else -1)
				if alt >= 0 and alt < nxt.size() and not links.has(alt):
					links.append(alt)
			(cur[j] as Dictionary)["next"] = links
			for k2 in links:
				incoming[int(k2)] = true
		for k3 in nxt.size():
			if not bool(incoming[k3]):
				var from: int = clampi(roundi((float(k3) + 0.5) * float(cur.size()) / float(nxt.size()) - 0.5), 0, cur.size() - 1)
				((cur[from] as Dictionary)["next"] as Array).append(k3)
	var mats: Dictionary = {}
	for k in MAT_ORDER:
		mats[k] = 0
	mats["wool"] = 10
	mats["eggs"] = 4
	run = {"active": true, "layers": layers, "pos": [-1, 0], "cur": [0, 0], "wizard": {"perk_lv": {"bolt": 1}, "level": 1, "xp": 0.0}, "wagon": {"animals": {}, "castle": {}, "gold": 30}, "mats": mats, "acquired": {}, "done": 0, "shop": [], "event": ""}

static func run_options() -> Array:
	var out: Array = []
	var pos: Array = run["pos"]
	var layers: Array = run["layers"]
	if int(pos[0]) < 0:
		out.append([0, 0])
		return out
	for k in ((layers[int(pos[0])] as Array)[int(pos[1])] as Dictionary)["next"]:
		out.append([int(pos[0]) + 1, int(k)])
	return out

static func run_node(l: int, i: int) -> Dictionary:
	return (run["layers"] as Array)[l][i]

static func run_node_done() -> void:
	var cur: Array = run["cur"]
	run_node(int(cur[0]), int(cur[1]))["done"] = true
	run["pos"] = [int(cur[0]), int(cur[1])]
	run["done"] = int(run["done"]) + 1

static func run_herd() -> int:
	var n: int = 0
	var an: Dictionary = (run["wagon"] as Dictionary)["animals"]
	for k in an:
		n += int(an[k])
	return n

# every animal on the wagon makes one material
static func run_production() -> void:
	var mats: Dictionary = run["mats"]
	var an: Dictionary = (run["wagon"] as Dictionary)["animals"]
	for k in an:
		var m: String = String(MAT_OF.get(k, "wool"))
		mats[m] = int(mats.get(m, 0)) + int(an[k])

static func run_pool() -> Array:
	var ids: Array = BASIC.duplicate()
	for k in (camp["unlocked"] as Dictionary):
		if bool((camp["unlocked"] as Dictionary)[k]) and not ids.has(k):
			ids.append(k)
	return ids

static func run_offers() -> Array:
	var pool: Array = []
	for u in UNLOCKS:
		if run_pool().has(String(u["id"])) and not bool((run["acquired"] as Dictionary).get(String(u["id"]), false)):
			pool.append(String(u["id"]))
	pool.shuffle()
	return pool.slice(0, 3)

static func unlock_by_id(id: String) -> Dictionary:
	for u in UNLOCKS:
		if String(u["id"]) == id:
			return u
	return {}

static func run_can_afford(u: Dictionary) -> bool:
	var mats: Dictionary = run["mats"]
	for k in (u["cost"] as Dictionary):
		if int(mats.get(k, 0)) < int((u["cost"] as Dictionary)[k]):
			return false
	return true

static func run_buy(u: Dictionary) -> bool:
	if not run_can_afford(u):
		return false
	var mats: Dictionary = run["mats"]
	for k in (u["cost"] as Dictionary):
		mats[k] = int(mats.get(k, 0)) - int((u["cost"] as Dictionary)[k])
	(run["acquired"] as Dictionary)[String(u["id"])] = true
	return true

# the run is over: a share of what is left goes to the farm storehouse for permanent unlocks
static func end_run(victory: bool) -> Dictionary:
	var banked: Dictionary = {}
	var ratio: float = 1.0 if victory else 0.34
	var mats: Dictionary = run["mats"]
	var store: Dictionary = camp["mats"]
	for k in MAT_ORDER:
		var n: int = int(ceil(float(int(mats.get(k, 0))) * ratio))
		if n > 0:
			store[k] = int(store.get(k, 0)) + n
			banked[k] = n
	if victory:
		store["wool"] = int(store.get("wool", 0)) + 10
		store["eggs"] = int(store.get("eggs", 0)) + 5
		banked["wool"] = int(banked.get("wool", 0)) + 10
		banked["eggs"] = int(banked.get("eggs", 0)) + 5
	var done: int = int(run["done"])
	camp["best_run"] = maxi(int(camp.get("best_run", 0)), done)
	run = {}
	save()
	return {"banked": banked, "done": done}
