class_name LayerMap
extends Node2D
# A map with two levels you can walk between: hills with cliffs, ramps that climb them, and bridges
# between hills with open ground underneath. Things on the hill are drawn higher and on a layer above.

const CELL: float = 48.0
const GW: int = 68
const GH: int = 46
const H: float = 34.0

# cell types: 0 open ground, 1 hill top, 2 ramp, 3 bridge deck
var game: Node2D
var cells: PackedByteArray = PackedByteArray()
var pid: PackedByteArray = PackedByteArray()
var ramps: Array = []
var next_pid: int = 1

func _ix(cx: int, cy: int) -> int:
	return cy * GW + cx

func cell_at(cx: int, cy: int) -> int:
	if cx < 0 or cy < 0 or cx >= GW or cy >= GH:
		return 0
	return int(cells[_ix(cx, cy)])

func cell_type(p: Vector2) -> int:
	return cell_at(int(floor(p.x / CELL)), int(floor(p.y / CELL)))

func _plateau(x0: int, y0: int, x1: int, y1: int) -> void:
	for cy in range(y0, y1 + 1):
		for cx in range(x0, x1 + 1):
			cells[_ix(cx, cy)] = 1
			pid[_ix(cx, cy)] = next_pid
	next_pid += 1

func _ramp(x0: int, y0: int, x1: int, y1: int, dir: String) -> void:
	for cy in range(y0, y1 + 1):
		for cx in range(x0, x1 + 1):
			cells[_ix(cx, cy)] = 2
	var cx_mid: float = float(x0 + x1 + 1) / 2.0 * CELL
	var cy_mid: float = float(y0 + y1 + 1) / 2.0 * CELL
	var a := Vector2.ZERO
	var b := Vector2.ZERO
	var w: float = 0.0
	var plat: int = 0
	if dir == "w":
		a = Vector2(float(x1 + 1) * CELL, cy_mid)
		b = Vector2(float(x0) * CELL, cy_mid)
		w = float(y1 - y0 + 1) * CELL
		plat = int(pid[_ix(x0 - 1, y0)])
	elif dir == "e":
		a = Vector2(float(x0) * CELL, cy_mid)
		b = Vector2(float(x1 + 1) * CELL, cy_mid)
		w = float(y1 - y0 + 1) * CELL
		plat = int(pid[_ix(x1 + 1, y0)])
	elif dir == "n":
		a = Vector2(cx_mid, float(y1 + 1) * CELL)
		b = Vector2(cx_mid, float(y0) * CELL)
		w = float(x1 - x0 + 1) * CELL
		plat = int(pid[_ix(x0, y0 - 1)])
	else:
		a = Vector2(cx_mid, float(y0) * CELL)
		b = Vector2(cx_mid, float(y1 + 1) * CELL)
		w = float(x1 - x0 + 1) * CELL
		plat = int(pid[_ix(x0, y1 + 1)])
	ramps.append({"a": a, "b": b, "w": w, "plateau": plat, "rect": Rect2(float(x0) * CELL, float(y0) * CELL, float(x1 - x0 + 1) * CELL, float(y1 - y0 + 1) * CELL)})

func _bridge(x0: int, y0: int, x1: int, y1: int) -> void:
	for cy in range(y0, y1 + 1):
		for cx in range(x0, x1 + 1):
			if cells[_ix(cx, cy)] == 0:
				cells[_ix(cx, cy)] = 3

func build() -> void:
	cells.resize(GW * GH)
	cells.fill(0)
	pid.resize(GW * GH)
	pid.fill(0)
	_plateau(5, 6, 16, 17)
	_plateau(24, 4, 42, 10)
	_plateau(51, 8, 62, 19)
	_plateau(8, 30, 15, 38)
	_ramp(17, 11, 18, 12, "w")
	_ramp(9, 18, 10, 19, "n")
	_ramp(33, 11, 34, 12, "n")
	_ramp(49, 14, 50, 15, "e")
	_ramp(55, 20, 56, 21, "n")
	_ramp(16, 33, 17, 34, "w")
	_bridge(17, 8, 23, 9)
	_bridge(43, 8, 50, 9)
	for mode in ["ground", "tops", "decks"]:
		var part := LayerPart.new()
		part.map = self
		part.mode = String(mode)
		part.z_index = {"ground": -50, "tops": 3, "decks": 5}[mode]
		if mode == "decks":
			part.modulate = Color(1, 1, 1, 0.92)
		add_child(part)

# ---------------------------------------------------------------- walking
func _allowed(layer: int, old: Vector2, np: Vector2) -> bool:
	var tn: int = cell_type(np)
	var to: int = cell_type(old)
	if layer == 0:
		return tn == 0 or tn == 2 or tn == 3 or (tn == 1 and to == 2)
	return tn == 1 or tn == 2 or tn == 3 or (tn == 0 and to == 2)

func _finalize(e: Mover) -> void:
	var t: int = cell_type(e.position)
	if e.layer == 0 and t == 1:
		e.layer = 1
	elif e.layer == 1 and t == 0:
		e.layer = 0

# keep an entity where its level lets it be: cliffs stop it, ramps and bridges let it through
func resolve(e: Mover, old: Vector2) -> void:
	var np: Vector2 = e.position
	if _allowed(e.layer, old, np):
		_finalize(e)
		return
	var ax := Vector2(np.x, old.y)
	if _allowed(e.layer, old, ax):
		e.position = ax
		e.vel.y = 0.0
		_finalize(e)
		return
	var ay := Vector2(old.x, np.y)
	if _allowed(e.layer, old, ay):
		e.position = ay
		e.vel.x = 0.0
		_finalize(e)
		return
	e.position = old
	e.vel = Vector2.ZERO

func height_at(p: Vector2, layer: int) -> float:
	var t: int = cell_type(p)
	if t == 1:
		return H
	if t == 3:
		return H if layer == 1 else 0.0
	if t == 2:
		for r in ramps:
			if (r["rect"] as Rect2).has_point(p):
				var ab: Vector2 = (r["b"] as Vector2) - (r["a"] as Vector2)
				return H * clampf((p - (r["a"] as Vector2)).dot(ab) / ab.length_squared(), 0.0, 1.0)
	return 0.0

# from the top of a hill: the way down
func spawn_layer(p: Vector2) -> int:
	var t: int = cell_type(p)
	if t == 1:
		return 1
	return 0 if t == 0 else -1

func use_flow(_p: Vector2, layer: int) -> bool:
	return layer >= 1

func flow_goal(p: Vector2) -> Vector2:
	return down_goal(p, 1)

func on_ramp(p: Vector2) -> bool:
	return cell_type(p) == 2

func down_goal(p: Vector2, _layer: int = 1) -> Vector2:
	var cx: int = int(floor(p.x / CELL))
	var cy: int = int(floor(p.y / CELL))
	var here: int = int(pid[_ix(clampi(cx, 0, GW - 1), clampi(cy, 0, GH - 1))])
	var best: Dictionary = {}
	var bd: float = 1.0e9
	for r in ramps:
		if here > 0 and int(r["plateau"]) != here:
			continue
		var d: float = p.distance_to(r["b"])
		if d < bd:
			bd = d
			best = r
	if best.is_empty():
		for r2 in ramps:
			var d2: float = p.distance_to(r2["b"])
			if d2 < bd:
				bd = d2
				best = r2
	var dir: Vector2 = ((best["b"] as Vector2) - (best["a"] as Vector2)).normalized()
	if bd > 70.0 and cell_type(p) != 2:
		return (best["b"] as Vector2) + dir * 40.0
	return (best["a"] as Vector2) - dir * 60.0

func cluster_centers(ground: Array) -> Array:
	var out: Array = [Vector2(10.0, 12.0) * CELL, Vector2(56.0, 14.0) * CELL, Vector2(33.0, 7.0) * CELL]
	if not ground.is_empty():
		out.append(ground[0])
	return out

# put everyone on the right level of the scene and at the right height
func sync_all() -> void:
	var dt: float = get_process_delta_time()
	_sync(game.dog, dt)
	for s in game.sheep:
		_sync(s, dt)
	for f in game.foxes:
		_sync(f, dt)

func _sync(e: Mover, dt: float) -> void:
	e.elev = move_toward(e.elev, height_at(e.position, e.layer), 220.0 * dt)
	var want: Node = game.container_for(e.layer)
	if e.get_parent() != want:
		e.get_parent().remove_child(e)
		want.add_child(e)

# ---------------------------------------------------------------- drawing
func _hash(x: int, y: int) -> float:
	return fposmod(sin(float(x) * 12.9898 + float(y) * 78.233) * 43758.5453, 1.0)

func draw_part(ci: CanvasItem, mode: String) -> void:
	if mode == "ground":
		for r in ramps:
			var a: Vector2 = r["a"]
			var b: Vector2 = r["b"]
			var perp: Vector2 = (b - a).normalized().orthogonal() * float(r["w"]) / 2.0
			var up := Vector2(0.0, -H)
			ci.draw_colored_polygon(PackedVector2Array([a + perp, b + perp + up, b - perp + up, a - perp]), Color(0.66, 0.52, 0.34))
			for k in range(1, 7):
				var t: float = float(k) / 7.0
				var m: Vector2 = a.lerp(b, t) + up * t
				ci.draw_line(m + perp, m - perp, Color(0.45, 0.34, 0.2, 0.7), 2.0)
			ci.draw_line(a + perp, b + perp + up, Color(0.3, 0.22, 0.14), 2.0)
			ci.draw_line(a - perp, b - perp + up, Color(0.3, 0.22, 0.14), 2.0)
		for cy in GH:
			for cx in GW:
				if cell_at(cx, cy) == 3:
					ci.draw_rect(Rect2(float(cx) * CELL, float(cy) * CELL, CELL, CELL), Color(0, 0, 0, 0.22))
		return
	if mode == "tops":
		for cy in GH:
			for cx in GW:
				if cell_at(cx, cy) != 1:
					continue
				var x: float = float(cx) * CELL
				var y: float = float(cy) * CELL
				var sh: float = _hash(cx, cy) * 0.06
				ci.draw_rect(Rect2(x, y - H, CELL + 0.5, CELL + 0.5), Color(0.40 + sh, 0.66 + sh, 0.30))
				if cell_at(cx, cy - 1) != 1:
					ci.draw_rect(Rect2(x, y - H, CELL, 3.0), Color(0.62, 0.82, 0.42))
				if cell_at(cx - 1, cy) != 1 and cell_at(cx - 1, cy) != 2 and cell_at(cx - 1, cy) != 3:
					ci.draw_rect(Rect2(x, y - H, 3.0, CELL), Color(0.2, 0.3, 0.14))
				if cell_at(cx + 1, cy) != 1 and cell_at(cx + 1, cy) != 2 and cell_at(cx + 1, cy) != 3:
					ci.draw_rect(Rect2(x + CELL - 3.0, y - H, 3.0, CELL), Color(0.2, 0.3, 0.14))
				var south: int = cell_at(cx, cy + 1)
				if south == 0:
					ci.draw_rect(Rect2(x, y + CELL - H, CELL + 0.5, H), Color(0.5, 0.46, 0.4))
					for k in range(1, 4):
						ci.draw_rect(Rect2(x, y + CELL - H + float(k) * H / 4.0, CELL, 2.0), Color(0.36, 0.32, 0.28))
					ci.draw_rect(Rect2(x, y + CELL - H, CELL, 3.0), Color(0.28, 0.25, 0.22))
					ci.draw_rect(Rect2(x, y + CELL, CELL, 10.0), Color(0, 0, 0, 0.18))
		return
	# bridge decks
	for cy in GH:
		for cx in GW:
			if cell_at(cx, cy) != 3:
				continue
			var x2: float = float(cx) * CELL
			var y2: float = float(cy) * CELL - H
			ci.draw_rect(Rect2(x2, y2, CELL + 0.5, CELL + 0.5), Color(0.62, 0.45, 0.27))
			for k in range(0, 6):
				ci.draw_rect(Rect2(x2 + float(k) * CELL / 6.0, y2, 2.0, CELL), Color(0.42, 0.29, 0.17))
			if cell_at(cx, cy - 1) != 3:
				ci.draw_rect(Rect2(x2, y2, CELL + 0.5, 6.0), Color(0.34, 0.22, 0.12))
			if cell_at(cx, cy + 1) != 3:
				ci.draw_rect(Rect2(x2, y2 + CELL - 6.0, CELL + 0.5, 6.0), Color(0.34, 0.22, 0.12))
				if cx % 3 == 0:
					ci.draw_rect(Rect2(x2 + CELL / 2.0 - 4.0, y2 + CELL, 8.0, H), Color(0.4, 0.28, 0.16))
