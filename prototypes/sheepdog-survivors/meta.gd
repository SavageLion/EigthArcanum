class_name Meta
extends RefCounted
# The farm: plots you defend, crops they grow, and what the crops unlock. Saved between visits.

const SAVE_PATH: String = "user://farm.json"
const GROW_SECS: float = 30.0
const GROW_CAP: int = 8
const RUN_PLOTS: int = 6

const CROPS: Dictionary = {
	"wheat": {"name": "Wheat", "col": Color(0.95, 0.8, 0.3)},
	"carrot": {"name": "Carrots", "col": Color(0.96, 0.55, 0.2)},
	"pumpkin": {"name": "Pumpkins", "col": Color(0.86, 0.4, 0.12)},
	"lavender": {"name": "Lavender", "col": Color(0.7, 0.5, 0.95)},
	"poppy": {"name": "Poppies", "col": Color(0.92, 0.25, 0.22)},
	"berry": {"name": "Berries", "col": Color(0.55, 0.25, 0.7)},
}
const CROP_ORDER: Array = ["wheat", "carrot", "pumpkin", "lavender", "poppy", "berry"]

# bonus makes every wave harder, extra adds more of one raider, req is the plot that must be cleared first
const PLOTS: Array = [
	{"name": "Home Paddock", "crop": "wheat", "bonus": 0, "extra": "", "req": -1},
	{"name": "Carrot Patch", "crop": "carrot", "bonus": 1, "extra": "fox", "req": 0},
	{"name": "Lavender Slope", "crop": "lavender", "bonus": 1, "extra": "imp", "req": 0},
	{"name": "Pumpkin Hollow", "crop": "pumpkin", "bonus": 2, "extra": "imp", "req": 1},
	{"name": "Poppy Meadow", "crop": "poppy", "bonus": 2, "extra": "fox", "req": 2},
	{"name": "Berry Thicket", "crop": "berry", "bonus": 3, "extra": "wolf", "req": 4},
	{"name": "Windmill Fields", "crop": "wheat", "bonus": 4, "extra": "wolf", "req": 3},
	{"name": "Old Orchard", "crop": "berry", "bonus": 5, "extra": "wolf", "req": 5},
	{"name": "The Dark Barn", "crop": "pumpkin", "bonus": 6, "extra": "wolf", "req": 6},
]

# kind: perk / tower / castle / tier
const UNLOCKS: Array = [
	{"id": "tower_brazier", "kind": "tower", "ref": "brazier", "name": "Fire Brazier", "desc": "Castle tower that burns raiders near the walls.", "cost": {"wheat": 4, "carrot": 2}},
	{"id": "tower_frost", "kind": "tower", "ref": "frost", "name": "Frost Totem", "desc": "Castle totem that slows raiders.", "cost": {"lavender": 4, "poppy": 2}},
	{"id": "perk_fire", "kind": "perk", "ref": "fire", "name": "Fireball", "desc": "A spell for the wizard: exploding fireballs.", "cost": {"poppy": 4, "carrot": 3}},
	{"id": "perk_nova", "kind": "perk", "ref": "nova", "name": "Frost Nova", "desc": "A spell for the wizard: a slowing ring of frost.", "cost": {"lavender": 3, "carrot": 2}},
	{"id": "perk_zap", "kind": "perk", "ref": "zap", "name": "Chain Lightning", "desc": "A spell for the wizard: lightning that jumps.", "cost": {"poppy": 3, "pumpkin": 2}},
	{"id": "perk_orbit", "kind": "perk", "ref": "orbit", "name": "Arcane Orbit", "desc": "A spell for the wizard: orbs that circle him.", "cost": {"pumpkin": 3, "wheat": 3}},
	{"id": "perk_wide", "kind": "perk", "ref": "wide", "name": "Wide Magic", "desc": "Perk: bigger explosions, rings and orbits.", "cost": {"lavender": 2, "poppy": 2}},
	{"id": "perk_study", "kind": "perk", "ref": "study", "name": "Quick Study", "desc": "Perk: every gem gives more XP.", "cost": {"wheat": 3, "carrot": 3}},
	{"id": "castle_gate", "kind": "castle", "ref": "gate", "name": "Pen Gates", "desc": "Castle option: cut gates so animals walk in.", "cost": {"carrot": 4}},
	{"id": "castle_walls", "kind": "castle", "ref": "walls_up", "name": "Stronger Walls", "desc": "Castle option: reinforce the walls.", "cost": {"wheat": 6}},
	{"id": "castle_market", "kind": "castle", "ref": "market", "name": "Market Stall", "desc": "Castle option: penned animals pay more gold.", "cost": {"wheat": 5, "berry": 2}},
	{"id": "castle_moss", "kind": "castle", "ref": "moss", "name": "Healing Moss", "desc": "Castle option: walls slowly mend.", "cost": {"lavender": 3, "berry": 3}},
	{"id": "tier_stone", "kind": "tier", "ref": "2", "name": "Stone Masons", "desc": "The pen can grow into a Stone Keep.", "cost": {"pumpkin": 5, "wheat": 5}},
	{"id": "tier_castle", "kind": "tier", "ref": "3", "name": "Royal Charter", "desc": "The pen can grow into a Grand Castle.", "cost": {"berry": 6, "poppy": 5}},
]

static var crops: Dictionary = {}
static var cleared: Dictionary = {}   # plot index (as string) -> unix time of last harvest
static var unlocked: Dictionary = {}
static var pending: int = -1
static var run: Dictionary = {}
static var all_open: bool = false
static var loaded: bool = false

static func load_save() -> void:
	if loaded:
		return
	loaded = true
	crops = {}
	for k in CROP_ORDER:
		crops[k] = 0
	if not FileAccess.file_exists(SAVE_PATH):
		return
	var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if f == null:
		return
	var d: Variant = JSON.parse_string(f.get_as_text())
	if typeof(d) != TYPE_DICTIONARY:
		return
	var dd: Dictionary = d
	for k in CROP_ORDER:
		crops[k] = int((dd.get("crops", {}) as Dictionary).get(k, 0))
	cleared = dd.get("cleared", {})
	unlocked = dd.get("unlocked", {})

static func save() -> void:
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f == null:
		return
	f.store_string(JSON.stringify({"crops": crops, "cleared": cleared, "unlocked": unlocked}))

static func has(id: String) -> bool:
	return all_open or bool(unlocked.get(id, false))

static func is_cleared(i: int) -> bool:
	return cleared.has(str(i))

static func plot_open(i: int) -> bool:
	var rq: int = int(PLOTS[i]["req"])
	return rq < 0 or is_cleared(rq)

static func ready_count(i: int) -> int:
	if not is_cleared(i):
		return 0
	var t: float = float(cleared[str(i)])
	return mini(GROW_CAP, int((Time.get_unix_time_from_system() - t) / GROW_SECS))

static func total_ready() -> int:
	var n: int = 0
	for i in PLOTS.size():
		n += ready_count(i)
	return n

static func collect_all() -> int:
	var n: int = 0
	var now: float = Time.get_unix_time_from_system()
	for i in PLOTS.size():
		var r: int = ready_count(i)
		if r > 0:
			var c: String = String(PLOTS[i]["crop"])
			crops[c] = int(crops.get(c, 0)) + r
			cleared[str(i)] = now
			n += r
	save()
	return n

static func adjacent(a: int, b: int) -> bool:
	return absi(a % 3 - b % 3) + absi(a / 3 - b / 3) == 1

# a plot of the expedition is won: bank its crop at once and mark it cleared for good
static func record_win(plot: int) -> void:
	var crop: String = String(PLOTS[plot]["crop"])
	var amt: int = 5 + int(PLOTS[plot]["bonus"]) / 2
	crops[crop] = int(crops.get(crop, 0)) + amt
	if not is_cleared(plot):
		cleared[str(plot)] = Time.get_unix_time_from_system()
	var b: Dictionary = run.get("banked", {})
	b[crop] = int(b.get(crop, 0)) + amt
	run["banked"] = b
	var v: Array = run.get("visited", [])
	v.append(plot)
	run["visited"] = v
	save()

# finishing the whole expedition pays a little extra of every crop it touched
static func finish_bonus() -> void:
	var b: Dictionary = run.get("banked", {})
	for k in b.keys():
		crops[k] = int(crops.get(k, 0)) + 3
		b[k] = int(b[k]) + 3
	run["banked"] = b
	save()

static func can_afford(u: Dictionary) -> bool:
	for k in (u["cost"] as Dictionary):
		if int(crops.get(k, 0)) < int((u["cost"] as Dictionary)[k]):
			return false
	return true

static func buy(u: Dictionary) -> bool:
	if has(String(u["id"])) or not can_afford(u):
		return false
	for k in (u["cost"] as Dictionary):
		crops[k] = int(crops.get(k, 0)) - int((u["cost"] as Dictionary)[k])
	unlocked[String(u["id"])] = true
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
