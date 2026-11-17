class_name Peak
extends RefCounted
# The climb: a Slay-the-Spire style map of ten stops up a mountain. Every stop is a herding stage on
# a mountain slice with more levels the higher you go.

const COLS: int = 8
const NAMES: Dictionary = {"herd": "Herd", "elite": "Hard herd", "rest": "Camp", "shop": "Trader", "boss": "The big day", "bonus": "Bonus"}
const KINDS: Dictionary = {
	"crossing": {"name": "BRIDGE CROSSING", "desc": "The flock starts on one island, the pen is across a narrow bridge."},
	"escort": {"name": "ESCORT", "desc": "Guide a lost lamb home. Foxes hunt it, and if it is lost the stage fails."},
	"gather": {"name": "GATHER", "desc": "Round up the whole flock into the pen."},
	"sort": {"name": "SORT", "desc": "Three pens: black sheep, white sheep and goats each have their own."},
	"hunt": {"name": "FOX HUNT", "desc": "Extra foxes and raiders. Keep the flock together."},
}

static var run: Dictionary = {}
static var pending: Dictionary = {}

static func active() -> bool:
	return bool(run.get("active", false))

static func tier_of(col: int) -> int:
	return mini(5, 1 + col / 2)

static func new_run(hub: bool = false) -> void:
	var layers: Array = []
	for l in COLS:
		var n: int = 3 if l == 0 else (1 if l == COLS - 1 else (2 + randi() % 2))
		var layer: Array = []
		for i in n:
			var tp: String = "herd"
			if l == COLS - 1:
				tp = "boss"
			elif l == COLS - 2:
				tp = "rest" if randf() < 0.5 else "shop"
			elif l > 0:
				var roll: float = randf() * (100.0 if l >= 3 else 82.0)
				if roll < 52.0:
					tp = "herd"
				elif roll < 66.0:
					tp = "rest"
				elif roll < 82.0:
					tp = "shop"
				else:
					tp = "elite"
			var kd: String = "gather"
			if l == 0:
				kd = ["gather", "sort", "hunt"][i]
			elif tp == "herd" or tp == "elite":
				var kr: float = randf()
				kd = "gather" if kr < 0.4 else ("sort" if kr < 0.75 else "hunt")
			elif tp == "boss":
				kd = "sort"
			layer.append({"type": tp, "kind": kd, "next": [], "done": false})
		layers.append(layer)
	if hub:
		# in the hub world the trader and the camp are buildings on the home island, so every stop is a stage
		for ly in layers:
			for nd0 in (ly as Array):
				var nd: Dictionary = nd0
				if String(nd["type"]) == "rest" or String(nd["type"]) == "shop":
					nd["type"] = "herd"
					var kr2: float = randf()
					nd["kind"] = "gather" if kr2 < 0.4 else ("sort" if kr2 < 0.75 else "hunt")
	var l1: Array = layers[1]
	var has_herd: bool = false
	for nd in l1:
		if String(nd["type"]) == "herd":
			has_herd = true
	if not has_herd:
		(l1[0] as Dictionary)["type"] = "herd"
	for l in COLS - 1:
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
	run = {"unlocked": {}, "bonus_stop": {}, "flock": ["normal", "normal", "normal", "black", "goat"], "active": true, "layers": layers, "pos": [-1, 0], "cur": [0, 0], "gold": 30, "picks": 0, "done": 0, "shop": [], "msg": ""}
	pending = {}

static func options() -> Array:
	var out: Array = []
	var pos: Array = run["pos"]
	if int(pos[0]) < 0:
		for i0 in (run["layers"] as Array)[0].size():
			out.append([0, i0])
		return out
	for k in ((run["layers"] as Array)[int(pos[0])][int(pos[1])] as Dictionary)["next"]:
		out.append([int(pos[0]) + 1, int(k)])
	return out

static func node(l: int, i: int) -> Dictionary:
	return (run["layers"] as Array)[l][i]

static func finish_node() -> void:
	var cur: Array = run["cur"]
	node(int(cur[0]), int(cur[1]))["done"] = true
	run["camp_used"] = false
	run["pos"] = [int(cur[0]), int(cur[1])]
	run["done"] = int(run["done"]) + 1
