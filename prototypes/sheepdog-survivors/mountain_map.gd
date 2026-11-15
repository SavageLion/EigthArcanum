class_name MountainMap
extends Node2D
# A mountain slice with up to five levels. The pen sits in the valley at the bottom, terraces climb around it
# with cliff edges and ramps, and anything can walk up or down by a ramp.

const CELL: float = 24.0
const GW: int = 136
const GH: int = 148
const H: float = 60.0

var game: Node2D
var levels: int = 1
var lvl: PackedByteArray = PackedByteArray()
var rmp: PackedInt32Array = PackedInt32Array()
var ramps: Array = []
var spawnable: Array = []   # per level, a list of cell centres
var dist: PackedInt32Array = PackedInt32Array()
var cliff_tex: Array = []
var trail: PackedByteArray = PackedByteArray()
var water: PackedByteArray = PackedByteArray()
var bridges: Array = []
var sealed: int = 0
var river_xs: Array = []
var river_y0: int = 0
var river_pond: Vector2i = Vector2i.ZERO
var ground_tex: Dictionary = {}
# which tiles make up the top of each level
const TOPS: Array = [[], ["g0", "g1", "g12", "g13", "g2", "g3"], ["g4", "g5", "g6", "g7"], ["g10", "g11", "g14", "g15", "g8", "g9"], ["r0", "r1", "r4", "r2", "r5"]]

func _ix(cx: int, cy: int) -> int:
	return cy * GW + cx

func _in(cx: int, cy: int) -> bool:
	return cx >= 0 and cy >= 0 and cx < GW and cy < GH

func _lv(cx: int, cy: int) -> int:
	return int(lvl[_ix(cx, cy)]) if _in(cx, cy) else 0

func _cell_of(p: Vector2) -> Vector2i:
	return Vector2i(clampi(int(floor(p.x / CELL)), 0, GW - 1), clampi(int(floor(p.y / CELL)), 0, GH - 1))

# ---------------------------------------------------------------- building the mountain
func build(tier: int) -> void:
	cliff_tex = [load("res://art/mtn/cliff_a.png"), load("res://art/mtn/cliff_b.png")]
	for gi in 16:
		ground_tex["g%d" % gi] = load("res://art/mtn/ground/g%d.png" % gi)
		ground_tex["r%d" % gi] = load("res://art/mtn/ground/r%d.png" % gi)
		ground_tex["d%d" % gi] = load("res://art/mtn/ground/d%d.png" % gi)
	levels = clampi(tier, 1, 5)
	lvl.resize(GW * GH)
	lvl.fill(0)
	rmp.resize(GW * GH)
	rmp.fill(-1)
	water.resize(GW * GH)
	water.fill(0)
	bridges.clear()
	ramps.clear()
	if levels > 1:
		_generate()
	_flow()
	_seal()
	_collect_spawns()
	_trails()
	if levels > 1:
		_make_parts()
		_decorate()

func _generate() -> void:
	var noise := FastNoiseLite.new()
	noise.seed = randi()
	noise.frequency = 0.03
	noise.fractal_octaves = 3
	var cx: float = float(GW) / 2.0
	var cy: float = float(GH) / 2.0
	for y in GH:
		for x in GW:
			var dx: float = (float(x) - cx) / (float(GW) * 0.5)
			var dy: float = (float(y) - cy) / (float(GH) * 0.5)
			var north: float = clampf(-dy, 0.0, 1.0)
			var south: float = clampf(dy, 0.0, 1.0)
			var e: float = north * 0.95 + dx * dx * 0.32 * (0.35 + north) + south * 0.2 + noise.get_noise_2d(float(x), float(y)) * 0.34 - 0.06
			var l: int = clampi(int(floor(clampf(e, 0.0, 0.999) * float(levels))), 0, levels - 1)
			# the valley around the pen stays flat
			if (dx * dx / 0.18) + (dy * dy / 0.03) < 1.0:
				l = 0
			lvl[_ix(x, y)] = l
	for pass_i in 3:
		_smooth()
	_river()
	for k in range(0, levels - 1):
		_place_ramps(k, 3 + levels)
	_connect()
	_restrip()
	_connect()
	_river_fix()

func _smooth() -> void:
	var out: PackedByteArray = lvl.duplicate()
	for y in range(1, GH - 1):
		for x in range(1, GW - 1):
			var counts: Dictionary = {}
			for oy in range(-1, 2):
				for ox in range(-1, 2):
					var v: int = _lv(x + ox, y + oy)
					counts[v] = int(counts.get(v, 0)) + 1
			var best: int = _lv(x, y)
			var bc: int = int(counts.get(best, 0))
			for kk in counts:
				if int(counts[kk]) > bc:
					bc = int(counts[kk])
					best = int(kk)
			out[_ix(x, y)] = best
	lvl = out

func _place_ramps(k: int, want: int) -> void:
	var cands: Array = []
	for y in range(8, GH - 14, 2):
		for x in range(8, GW - 14, 2):
			if _water_near(x - 6, y - 6, 20):
				continue
			var okn: bool = true
			var oks: bool = true
			var okw: bool = true
			var oke: bool = true
			for i in 4:
				if not (_lv(x + i, y) == k + 1 and _lv(x + i, y + 1) == k):
					okn = false
				if not (_lv(x + i, y) == k and _lv(x + i, y + 1) == k + 1):
					oks = false
				if not (_lv(x, y + i) == k + 1 and _lv(x + 1, y + i) == k):
					okw = false
				if not (_lv(x, y + i) == k and _lv(x + 1, y + i) == k + 1):
					oke = false
			if okn:
				cands.append([x, y, "n"])
			if oks:
				cands.append([x, y, "s"])
			if okw:
				cands.append([x, y, "w"])
			if oke:
				cands.append([x, y, "e"])
	cands.shuffle()
	var chosen: Array = []
	for c in cands:
		if chosen.size() >= want:
			break
		var far: bool = true
		for o in chosen:
			if absi(int(c[0]) - int(o[0])) + absi(int(c[1]) - int(o[1])) < 26:
				far = false
		if not far:
			continue
		if _carve(int(c[0]), int(c[1]), String(c[2]), k):
			chosen.append(c)

func _carve(x: int, y: int, dir: String, k: int) -> bool:
	var vertical: bool = dir == "n" or dir == "s"
	var rx0: int = x if vertical else x - 1
	var ry0: int = y - 1 if vertical else y
	# nothing else may be in the way
	for oy in range(-3, 8):
		for ox in range(-3, 8):
			var tx: int = rx0 + (ox if not vertical else ox)
			var ty: int = ry0 + oy
			if not vertical:
				tx = rx0 + ox
				ty = ry0 + oy
			if _in(tx, ty) and rmp[_ix(tx, ty)] >= 0:
				if vertical and ox >= 0 and ox < 4 and oy >= -3 and oy < 7:
					return false
				if not vertical and oy >= 0 and oy < 4 and ox >= -3 and ox < 7:
					return false
	var idx: int = ramps.size()
	var rect := Rect2(float(rx0) * CELL, float(ry0) * CELL, 4.0 * CELL, 4.0 * CELL)
	var high_first: bool = dir == "n" or dir == "w"
	for i in 4:
		for t in range(1, 3):
			if vertical:
				_setl(rx0 + i, ry0 - t, k + 1 if high_first else k)
				_setl(rx0 + i, ry0 + 3 + t, k if high_first else k + 1)
			else:
				_setl(rx0 - t, ry0 + i, k + 1 if high_first else k)
				_setl(rx0 + 3 + t, ry0 + i, k if high_first else k + 1)
		for r in 4:
			if vertical:
				rmp[_ix(rx0 + i, ry0 + r)] = idx
			else:
				rmp[_ix(rx0 + r, ry0 + i)] = idx
	var cxm: float = rect.get_center().x
	var cym: float = rect.get_center().y
	var a := Vector2.ZERO
	var b := Vector2.ZERO
	if dir == "n":
		a = Vector2(cxm, rect.end.y)
		b = Vector2(cxm, rect.position.y)
	elif dir == "s":
		a = Vector2(cxm, rect.position.y)
		b = Vector2(cxm, rect.end.y)
	elif dir == "w":
		a = Vector2(rect.end.x, cym)
		b = Vector2(rect.position.x, cym)
	else:
		a = Vector2(rect.position.x, cym)
		b = Vector2(rect.end.x, cym)
	ramps.append({"a": a, "b": b, "w": 4.0 * CELL, "lo": k, "hi": k + 1, "rect": rect, "rx0": rx0, "ry0": ry0, "vertical": vertical, "high_first": high_first})
	return true

# the cells at both ends of every ramp must stay on the right level
func _restrip() -> void:
	for r in ramps:
		var rx0: int = int(r["rx0"])
		var ry0: int = int(r["ry0"])
		var vertical: bool = bool(r["vertical"])
		var high_first: bool = bool(r["high_first"])
		var k: int = int(r["lo"])
		for i in 4:
			for t in range(1, 3):
				if vertical:
					_setl(rx0 + i, ry0 - t, k + 1 if high_first else k)
					_setl(rx0 + i, ry0 + 3 + t, k if high_first else k + 1)
				else:
					_setl(rx0 - t, ry0 + i, k + 1 if high_first else k)
					_setl(rx0 + 3 + t, ry0 + i, k if high_first else k + 1)

func _setl(cx: int, cy: int, v: int) -> void:
	if _in(cx, cy) and rmp[_ix(cx, cy)] < 0:
		lvl[_ix(cx, cy)] = v

# anything the player could not reach is folded into the terrain it touches
func _connect() -> void:
	var reach: PackedByteArray = PackedByteArray()
	reach.resize(GW * GH)
	reach.fill(0)
	var start: Vector2i = Vector2i(GW / 2, GH / 2)
	var queue: Array = [start]
	reach[_ix(start.x, start.y)] = 1
	var dirs: Array = [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]
	var head: int = 0
	while head < queue.size():
		var c: Vector2i = queue[head]
		head += 1
		for d in dirs:
			var n: Vector2i = c + (d as Vector2i)
			if not _in(n.x, n.y) or reach[_ix(n.x, n.y)] == 1:
				continue
			if _can_step(c, n):
				reach[_ix(n.x, n.y)] = 1
				queue.append(n)
	# fold the rest into their reachable neighbours
	head = 0
	queue = []
	for y in GH:
		for x in GW:
			if reach[_ix(x, y)] == 1:
				queue.append(Vector2i(x, y))
	while head < queue.size():
		var c2: Vector2i = queue[head]
		head += 1
		for d2 in dirs:
			var n2: Vector2i = c2 + (d2 as Vector2i)
			if not _in(n2.x, n2.y) or reach[_ix(n2.x, n2.y)] == 1:
				continue
			if water[_ix(n2.x, n2.y)] != 0:
				continue
			if rmp[_ix(n2.x, n2.y)] < 0 and water[_ix(n2.x, n2.y)] == 0:
				lvl[_ix(n2.x, n2.y)] = lvl[_ix(c2.x, c2.y)]
			reach[_ix(n2.x, n2.y)] = 1
			queue.append(n2)

# on which level a normal cell beside a ramp joins it: only at the two ends, never the sides
func _end_level(ri: int, c: Vector2i) -> int:
	var r: Dictionary = ramps[ri]
	var ab: Vector2 = (r["b"] as Vector2) - (r["a"] as Vector2)
	var t: float = ((Vector2(c) + Vector2(0.5, 0.5)) * CELL - (r["a"] as Vector2)).dot(ab) / ab.length_squared()
	if t < 0.0:
		return int(r["lo"])
	if t > 1.0:
		return int(r["hi"])
	return -1

func _can_step(a: Vector2i, b: Vector2i) -> bool:
	if water[_ix(a.x, a.y)] != 0 or water[_ix(b.x, b.y)] != 0:
		return false
	var ra: int = rmp[_ix(a.x, a.y)]
	var rb: int = rmp[_ix(b.x, b.y)]
	if ra >= 0 and rb >= 0:
		return ra == rb
	if ra >= 0:
		return _end_level(ra, b) == int(lvl[_ix(b.x, b.y)])
	if rb >= 0:
		return _end_level(rb, a) == int(lvl[_ix(a.x, a.y)])
	return lvl[_ix(a.x, a.y)] == lvl[_ix(b.x, b.y)]

# how far every cell is from the valley by the ways an animal can walk
# land nobody can walk to is closed off so that nothing spawns or gets stuck there
func _seal() -> void:
	sealed = 0
	for y in GH:
		for x in GW:
			var i: int = _ix(x, y)
			if dist[i] < 0 and rmp[i] < 0 and water[i] == 0:
				water[i] = 2
				sealed += 1

func _flow() -> void:
	dist.resize(GW * GH)
	dist.fill(-1)
	var queue: Array = []
	for y in range(GH / 2 - 5, GH / 2 + 6):
		for x in range(GW / 2 - 5, GW / 2 + 6):
			if rmp[_ix(x, y)] < 0 and lvl[_ix(x, y)] == 0:
				dist[_ix(x, y)] = 0
				queue.append(Vector2i(x, y))
	var dirs: Array = [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]
	var head: int = 0
	while head < queue.size():
		var c: Vector2i = queue[head]
		head += 1
		for d in dirs:
			var n: Vector2i = c + (d as Vector2i)
			if _in(n.x, n.y) and dist[_ix(n.x, n.y)] < 0 and _can_step(c, n):
				dist[_ix(n.x, n.y)] = dist[_ix(c.x, c.y)] + 1
				queue.append(n)

# worn dirt trails that follow the way down from the far terraces to the valley
func _trails() -> void:
	trail.resize(GW * GH)
	trail.fill(0)
	if levels <= 1:
		return
	var dirs: Array = [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]
	for t in 3 + levels:
		var k: int = 1 + randi() % (levels - 1)
		var list: Array = spawnable[k]
		if list.is_empty():
			continue
		var cur: Vector2i = _cell_of(list[randi() % list.size()])
		var wob: int = 0
		for step in 500:
			var d0: int = dist[_ix(cur.x, cur.y)]
			if d0 <= 0:
				break
			var best: Vector2i = cur
			var bd: int = d0
			var opts: Array = dirs.duplicate()
			opts.shuffle()
			for d in opts:
				var n: Vector2i = cur + (d as Vector2i)
				if _in(n.x, n.y) and dist[_ix(n.x, n.y)] >= 0 and dist[_ix(n.x, n.y)] < bd and _can_step(cur, n):
					best = n
					bd = dist[_ix(n.x, n.y)]
			if best == cur:
				break
			cur = best
			if rmp[_ix(cur.x, cur.y)] < 0:
				trail[_ix(cur.x, cur.y)] = 1
				if randf() < 0.7:
					wob = clampi(wob + (randi() % 3 - 1), -1, 1)
				for sd in dirs:
					var side: Vector2i = cur + (sd as Vector2i)
					if _in(side.x, side.y) and rmp[_ix(side.x, side.y)] < 0 and lvl[_ix(side.x, side.y)] == lvl[_ix(cur.x, cur.y)]:
						trail[_ix(side.x, side.y)] = 1

func use_flow(p: Vector2, layer: int) -> bool:
	return layer >= 1 or p.distance_to(Vector2(float(GW), float(GH)) * CELL / 2.0) > 470.0

# a few cells ahead along the way home, down through the ramps
func flow_goal(p: Vector2) -> Vector2:
	var cur: Vector2i = _cell_of(p)
	if dist[_ix(cur.x, cur.y)] < 0:
		return Vector2(float(GW), float(GH)) * CELL / 2.0
	var dirs: Array = [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]
	var best: Vector2i = cur
	var bd: int = dist[_ix(cur.x, cur.y)]
	for d in dirs:
		var n: Vector2i = cur + (d as Vector2i)
		if _in(n.x, n.y) and dist[_ix(n.x, n.y)] >= 0 and dist[_ix(n.x, n.y)] < bd and _can_step(cur, n):
			best = n
			bd = dist[_ix(n.x, n.y)]
	if best == cur:
		return (Vector2(cur) + Vector2(0.5, 0.5)) * CELL
	# two cells ahead when the way goes straight on
	var n2: Vector2i = best + (best - cur)
	if _in(n2.x, n2.y) and dist[_ix(n2.x, n2.y)] == bd - 1 and _can_step(best, n2):
		best = n2
	return (Vector2(best) + Vector2(0.5, 0.5)) * CELL

func _collect_spawns() -> void:
	spawnable = []
	for k in levels:
		spawnable.append([])
	for y in range(6, GH - 6):
		for x in range(6, GW - 6):
			if rmp[_ix(x, y)] >= 0:
				continue
			var l: int = int(lvl[_ix(x, y)])
			# only cells that are fully inside their level
			var inside: bool = water[_ix(x, y)] == 0 and not _water_near(x - 2, y - 2, 5)
			for o in [Vector2i(2, 0), Vector2i(-2, 0), Vector2i(0, 2), Vector2i(0, -2)]:
				if _lv(x + (o as Vector2i).x, y + (o as Vector2i).y) != l or rmp[_ix(x + (o as Vector2i).x, y + (o as Vector2i).y)] >= 0:
					inside = false
			if inside:
				(spawnable[l] as Array).append(Vector2((float(x) + 0.5) * CELL, (float(y) + 0.5) * CELL))

# ---------------------------------------------------------------- walking
func _frac(r: Dictionary, p: Vector2) -> float:
	var ab: Vector2 = (r["b"] as Vector2) - (r["a"] as Vector2)
	return clampf((p - (r["a"] as Vector2)).dot(ab) / ab.length_squared(), 0.0, 1.0)

func _allowed(layer: int, old: Vector2, np: Vector2) -> bool:
	var cn: Vector2i = _cell_of(np)
	var co: Vector2i = _cell_of(old)
	if water[_ix(cn.x, cn.y)] != 0:
		return false
	var rn: int = rmp[_ix(cn.x, cn.y)]
	var ro: int = rmp[_ix(co.x, co.y)]
	if rn >= 0 and ro == rn:
		return int(ramps[rn]["lo"]) == layer or int(ramps[rn]["hi"]) == layer
	if rn >= 0:
		if ro >= 0:
			return false
		return _end_level(rn, co) == layer and int(lvl[_ix(co.x, co.y)]) == layer
	var ln: int = int(lvl[_ix(cn.x, cn.y)])
	if ro >= 0:
		var r: Dictionary = ramps[ro]
		if layer != int(r["lo"]) and layer != int(r["hi"]):
			return false
		return _end_level(ro, cn) == ln
	return ln == layer

func _finalize(e: Mover) -> void:
	var c: Vector2i = _cell_of(e.position)
	if rmp[_ix(c.x, c.y)] < 0:
		e.layer = int(lvl[_ix(c.x, c.y)])

func resolve(e: Mover, old: Vector2) -> void:
	if levels <= 1:
		return
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

func height_at(p: Vector2, _layer: int) -> float:
	var c: Vector2i = _cell_of(p)
	var r: int = rmp[_ix(c.x, c.y)]
	if r >= 0:
		return H * (float(ramps[r]["lo"]) + _frac(ramps[r], p))
	return H * float(lvl[_ix(c.x, c.y)])

func on_ramp(p: Vector2) -> bool:
	var c: Vector2i = _cell_of(p)
	return rmp[_ix(c.x, c.y)] >= 0

func spawn_layer(p: Vector2) -> int:
	var c: Vector2i = _cell_of(p)
	if water[_ix(c.x, c.y)] != 0:
		return -1
	if rmp[_ix(c.x, c.y)] >= 0:
		return -1
	return int(lvl[_ix(c.x, c.y)])

# the way down from a level: the nearest ramp that comes up from the level below
func down_goal(p: Vector2, layer: int) -> Vector2:
	var best: Dictionary = {}
	var bd: float = 1.0e9
	for r in ramps:
		if int(r["hi"]) != layer:
			continue
		var d: float = p.distance_to(r["b"])
		if d < bd and _clear(p, r["b"], layer):
			bd = d
			best = r
	if best.is_empty():
		for r2 in ramps:
			if int(r2["hi"]) == layer:
				var d2: float = p.distance_to(r2["b"])
				if d2 < bd:
					bd = d2
					best = r2
	if best.is_empty():
		return p
	var dir: Vector2 = ((best["b"] as Vector2) - (best["a"] as Vector2)).normalized()
	if bd > 60.0 and not on_ramp(p):
		return (best["b"] as Vector2) + dir * 36.0
	return (best["a"] as Vector2) - dir * 60.0

func _clear(a: Vector2, b: Vector2, layer: int) -> bool:
	for i in range(1, 8):
		var q: Vector2 = a.lerp(b, float(i) / 8.0)
		var c: Vector2i = _cell_of(q)
		if rmp[_ix(c.x, c.y)] < 0 and int(lvl[_ix(c.x, c.y)]) != layer:
			return false
	return true

# a few starting spots on every level
func cluster_centers(ground: Array) -> Array:
	var out: Array = []
	for k in range(1, levels):
		var list: Array = spawnable[k]
		if not list.is_empty():
			out.append(list[randi() % list.size()])
			if levels > 2 and list.size() > 40:
				out.append(list[randi() % list.size()])
	if not spawnable[0].is_empty():
		var home: Vector2 = Vector2(float(GW), float(GH)) * CELL / 2.0
		var pick: Vector2 = (spawnable[0] as Array)[0]
		for i in 40:
			var cand: Vector2 = (spawnable[0] as Array)[randi() % (spawnable[0] as Array).size()]
			if cand.distance_to(home) > 650.0:
				pick = cand
				break
		out.append(pick)
	elif not ground.is_empty():
		out.append(ground[0])
	if out.is_empty():
		out.append(Vector2(float(GW) * CELL * 0.3, float(GH) * CELL * 0.3))
	return out

func fox_spawn(near: Vector2, layer: int) -> Vector2:
	for i in 30:
		var p: Vector2 = near + Vector2.from_angle(randf() * TAU) * randf_range(350.0, 650.0)
		if p.x > 150.0 and p.y > 150.0 and p.x < float(GW) * CELL - 150.0 and p.y < float(GH) * CELL - 150.0 and spawn_layer(p) == layer:
			return p
	return near + Vector2(300.0, 0.0)

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

# ---------------------------------------------------------------- how it looks
func _make_parts() -> void:
	for k in range(0, levels):
		var part := LayerPart.new()
		part.map = self
		part.mode = "L%d" % k
		part.z_index = 10 * k + 1 if k > 0 else -135
		part.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		add_child(part)
		if k > 0:
			var cp := LayerPart.new()
			cp.map = self
			cp.mode = "C%d" % k
			cp.z_index = 10 * (k - 1) + 3
			cp.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
			add_child(cp)
	for k2 in range(0, levels):
		if _has_water(k2):
			var wp := LayerPart.new()
			wp.map = self
			wp.mode = "W%d" % k2
			wp.z_index = 10 * k2 + 2 if k2 > 0 else -134
			wp.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
			add_child(wp)
			var bp := LayerPart.new()
			bp.map = self
			bp.mode = "B%d" % k2
			bp.z_index = 10 * k2 + 3 if k2 > 0 else -133
			bp.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
			add_child(bp)
	var rp := LayerPart.new()
	rp.map = self
	rp.mode = "ramps"
	rp.z_index = 2
	rp.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	add_child(rp)

func _decorate() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = randi()
	var shrub: Texture2D = load("res://art/mtn/shrub.png")
	var rocks: Texture2D = load("res://art/mtn/boulders.png")
	var trees: Array = [load("res://art/mtn/pine.png"), load("res://art/mtn/fir.png"), load("res://art/mtn/tree_round.png")]
	for k in range(1, levels):
		var list: Array = spawnable[k]
		if list.is_empty():
			continue
		# along the top of every cliff: shrubs and boulders
		var edge: Array = []
		for p in list:
			var c: Vector2i = _cell_of(p)
			if _lv(c.x, c.y + 3) < k:
				edge.append(p)
		var n: int = 60 + 14 * (levels - k)
		for i in n:
			var from_edge: bool = not edge.is_empty() and rng.randf() < 0.65
			var p2: Vector2 = (edge[rng.randi() % edge.size()] if from_edge else list[rng.randi() % list.size()]) as Vector2
			var s := Sprite2D.new()
			var roll: float = rng.randf()
			var t: Texture2D = rocks if roll < 0.18 else trees[rng.randi() % trees.size()]
			var sc: float = rng.randf_range(0.55, 0.85) if not trees.has(t) else rng.randf_range(0.7, 1.25)
			s.texture = t
			s.scale = Vector2.ONE * sc
			s.offset = Vector2(0, -float(t.get_height()) * 0.5 + 6.0 - H * float(k) / maxf(sc, 0.01))
			s.position = p2 + Vector2(rng.randf_range(-6.0, 6.0), rng.randf_range(-6.0, 6.0))
			s.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
			game.container_for(k).add_child(s)
	_landmarks(rng)

func _roomy(p: Vector2, k: int, r: int) -> bool:
	var c: Vector2i = _cell_of(p)
	if _water_near(c.x - r - 1, c.y - r - 1, 2 * r + 3):
		return false
	for oy in range(-r, r + 1, 2):
		for ox in range(-r, r + 1, 2):
			if _lv(c.x + ox, c.y + oy) != k or (_in(c.x + ox, c.y + oy) and rmp[_ix(c.x + ox, c.y + oy)] >= 0):
				return false
	return true

func _landmark(rng: RandomNumberGenerator, k: int, path: String, sc: float, r: int) -> void:
	var list: Array = spawnable[k]
	for i in 80:
		if list.is_empty():
			return
		var p: Vector2 = list[rng.randi() % list.size()]
		if not _roomy(p, k, r):
			continue
		var t: Texture2D = load(path)
		var s := Sprite2D.new()
		s.texture = t
		s.scale = Vector2.ONE * sc
		s.offset = Vector2(0, -float(t.get_height()) * 0.5 + 8.0 - H * float(k) / sc)
		s.position = p
		s.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
		game.container_for(k).add_child(s)
		return

func _landmarks(rng: RandomNumberGenerator) -> void:
	_landmark(rng, 1, "res://art/mtn/cabin.png", 1.3, 5)
	_landmark(rng, mini(2, levels - 1), "res://art/mtn/camp.png", 1.2, 4)
	_landmark(rng, levels - 1, "res://art/mtn/stones.png", 1.4, 5)
	for k in range(1, levels):
		for j in 3:
			_landmark(rng, k, "res://art/mtn/blossom.png", rng.randf_range(0.9, 1.2), 2)

func _hash(x: int, y: int) -> float:
	return fposmod(sin(float(x) * 12.9898 + float(y) * 78.233) * 43758.5453, 1.0)

func _top_color(k: int) -> Color:
	var pal: Array = [Color(0.34, 0.58, 0.24), Color(0.46, 0.62, 0.30), Color(0.56, 0.6, 0.38), Color(0.6, 0.6, 0.56), Color(0.82, 0.85, 0.88)]
	return pal[clampi(k, 0, 4)]

func draw_part(ci: CanvasItem, mode: String) -> void:
	if mode == "ramps":
		for r in ramps:
			var a: Vector2 = r["a"]
			var b: Vector2 = r["b"]
			var lo: float = float(r["lo"])
			var perp: Vector2 = (b - a).normalized().orthogonal() * float(r["w"]) / 2.0
			var pa := Vector2(0.0, -H * lo)
			var pb := Vector2(0.0, -H * (lo + 1.0))
			ci.z_index = 2
			var pts := PackedVector2Array([a + perp + pa, b + perp + pb, b - perp + pb, a - perp + pa])
			var uvs := PackedVector2Array([Vector2(0, 0), Vector2(0, 3), Vector2(3, 3), Vector2(3, 0)])
			ci.texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
			ci.draw_colored_polygon(pts, Color(0.45, 0.4, 0.34))
			var steps: int = 9
			for kk in steps:
				var t0: float = float(kk) / float(steps)
				var t1: float = float(kk + 1) / float(steps)
				var m0: Vector2 = a.lerp(b, t0) + pa.lerp(pb, t0)
				var m1: Vector2 = a.lerp(b, t1) + pa.lerp(pb, t1)
				var sh: float = 0.62 + 0.16 * t1
				ci.draw_colored_polygon(PackedVector2Array([m0 + perp * 0.86, m1 + perp * 0.86, m1 - perp * 0.86, m0 - perp * 0.86]), Color(sh * 0.95, sh * 0.88, sh * 0.76))
				ci.draw_line(m1 + perp * 0.86, m1 - perp * 0.86, Color(0.3, 0.2, 0.1, 0.8), 2.0)
			ci.draw_line(a + perp * 0.9 + pa, b + perp * 0.9 + pb, Color(0.36, 0.34, 0.32), 5.0)
			ci.draw_line(a - perp * 0.9 + pa, b - perp * 0.9 + pb, Color(0.36, 0.34, 0.32), 5.0)
		return
	if mode.begins_with("W") or mode.begins_with("B"):
		_draw_water(ci, mode)
		return
	var k: int = int(mode.substr(1))
	if k == 0:
		_draw_clouds(ci)
	var pass_mode: int = 2 if mode.begins_with("C") else 1
	var up: float = H * float(k)
	var mat := ShaderMaterial.new()
	mat.shader = load("res://mtn_level.gdshader")
	mat.set_shader_parameter("field", _field_tex(k))
	mat.set_shader_parameter("noise", _noise_tex())
	mat.set_shader_parameter("ground", _composite(TOPS[clampi(k, 1, 4)] if k > 0 else ["g0"], "g"))
	mat.set_shader_parameter("dirt", _composite(["d0", "d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9", "d10", "d11"], "d"))
	mat.set_shader_parameter("cliff", cliff_tex[k % 2])
	mat.set_shader_parameter("world_size", Vector2(float(GW) * CELL, float(GH) * CELL))
	mat.set_shader_parameter("hgt", H)
	mat.set_shader_parameter("yoff", up)
	mat.set_shader_parameter("base_mode", 1 if k == 0 else 0)
	mat.set_shader_parameter("pass_mode", pass_mode)
	var tints: Array = [Vector3(1, 1, 1), Vector3(1.0, 1.0, 0.95), Vector3(1.0, 0.97, 0.9), Vector3(0.95, 0.95, 1.0), Vector3(0.92, 0.96, 1.08)]
	mat.set_shader_parameter("tint", tints[clampi(k, 0, 4)])
	ci.material = mat
	ci.draw_rect(Rect2(0.0, -up, float(GW) * CELL, float(GH) * CELL + 80.0), Color(1, 1, 1))

var _noise_cache: ImageTexture

func _noise_tex() -> ImageTexture:
	if _noise_cache == null:
		var fn := FastNoiseLite.new()
		fn.seed = 7
		fn.frequency = 0.02
		fn.fractal_octaves = 3
		fn.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
		var img: Image = fn.get_seamless_image(256, 256)
		img.convert(Image.FORMAT_RGBA8)
		_noise_cache = ImageTexture.create_from_image(img)
	return _noise_cache

func _composite(names: Array, _fam: String) -> ImageTexture:
	var img := Image.create(224, 224, false, Image.FORMAT_RGBA8)
	for ty in 8:
		for tx in 8:
			var nm: String = String(names[int(_hash(tx * 7 + names.size(), ty * 3) * float(names.size())) % names.size()])
			var src: Image = (ground_tex[nm] as Texture2D).get_image()
			src.convert(Image.FORMAT_RGBA8)
			img.blit_rect(src, Rect2i(2, 2, 28, 28), Vector2i(tx * 28, ty * 28))
	return ImageTexture.create_from_image(img)

func _blur(src: PackedFloat32Array) -> PackedFloat32Array:
	var out := PackedFloat32Array()
	out.resize(GW * GH)
	for y in GH:
		for x in GW:
			var s: float = 0.0
			for oy in range(-1, 2):
				for ox in range(-1, 2):
					s += src[clampi(y + oy, 0, GH - 1) * GW + clampi(x + ox, 0, GW - 1)]
			out[y * GW + x] = s / 9.0
	return out

var _field_cache: Dictionary = {}

func _field_tex(k: int) -> ImageTexture:
	if _field_cache.has(k):
		return _field_cache[k]
	var made: ImageTexture = _field_make(k)
	_field_cache[k] = made
	return made

func _field_make(k: int) -> ImageTexture:
	var fn := FastNoiseLite.new()
	fn.seed = 11 + k
	fn.frequency = 0.12
	var top := PackedFloat32Array()
	var tr := PackedFloat32Array()
	var rp := PackedFloat32Array()
	top.resize(GW * GH)
	tr.resize(GW * GH)
	rp.resize(GW * GH)
	for y in GH:
		for x in GW:
			var i: int = y * GW + x
			var l: int = int(lvl[i])
			var isr: bool = rmp[i] >= 0
			top[i] = 1.0 if (k > 0 and l >= k and not isr) else 0.0
			if isr and k > 0:
				top[i] = 1.0 if l >= k else 0.0
			tr[i] = 1.0 if (trail.size() > 0 and trail[i] == 1 and l == k and not isr) else 0.0
			rp[i] = 1.0 if isr else 0.0
	top = _blur(_blur(top))
	tr = _blur(tr)
	rp = _blur(rp)
	var img := Image.create(GW, GH, false, Image.FORMAT_RGBA8)
	for y in GH:
		for x in GW:
			var i2: int = y * GW + x
			var nz: float = fn.get_noise_2d(float(x), float(y))
			var t: float = top[i2]
			t = clampf(t + nz * 0.3 * 4.0 * t * (1.0 - t), 0.0, 1.0)
			var g: float = tr[i2]
			g = clampf(g + nz * 0.25 * 4.0 * g * (1.0 - g), 0.0, 1.0)
			var rr: float = clampf((rp[i2] - 0.1) * 1.6, 0.0, 1.0)
			img.set_pixel(x, y, Color(t, g, rr, 1.0))
	img.resize(GW * 4, GH * 4, Image.INTERPOLATE_BILINEAR)
	return ImageTexture.create_from_image(img)

func _draw_clouds(ci: CanvasItem) -> void:
	var w: float = float(GW) * CELL
	var h: float = float(GH) * CELL
	var sky := Color(0.66, 0.78, 0.86)
	ci.draw_rect(Rect2(-900, -900, w + 1800, 900), sky)
	ci.draw_rect(Rect2(-900, h, w + 1800, 900), sky)
	ci.draw_rect(Rect2(-900, 0, 900, h), sky)
	ci.draw_rect(Rect2(w, 0, 900, h), sky)
	for i in 170:
		var side: int = i % 4
		var u: float = _hash(i, 3)
		var d: float = _hash(i, 8)
		var p := Vector2.ZERO
		if side == 0:
			p = Vector2(u * w, -d * 260.0 + 90.0)
		elif side == 1:
			p = Vector2(u * w, h + d * 260.0 - 90.0)
		elif side == 2:
			p = Vector2(-d * 260.0 + 90.0, u * h)
		else:
			p = Vector2(w + d * 260.0 - 90.0, u * h)
		for j in 5:
			ci.draw_circle(p + Vector2((_hash(i, j + 20) - 0.5) * 120.0, (_hash(i, j + 40) - 0.5) * 50.0), 26.0 + _hash(i, j + 60) * 34.0, Color(0.95, 0.97, 1.0, 0.9))

# ---------------------------------------------------------------- the river
func _water_near(x: int, y: int, size: int) -> bool:
	for oy in size:
		for ox in size:
			if _in(x + ox, y + oy) and water[_ix(x + ox, y + oy)] != 0:
				return true
	return false

func _has_water(k: int) -> bool:
	for i in GW * GH:
		if water[i] == 1 and int(lvl[i]) == k:
			return true
	return false

# a river from the high ground down towards the valley; every level it crosses is flat and the drops become waterfalls
func _river() -> void:
	var noise := FastNoiseLite.new()
	noise.seed = randi()
	noise.frequency = 0.05
	var side: float = 0.9 if randf() < 0.5 else 0.1
	river_xs = []
	var y0: int = 6
	var y1: int = GH / 2 - 10
	var xs: Array = []
	var x: float = float(GW) * side
	for y in range(y0, y1 + 1):
		var want: float = float(GW) * side + noise.get_noise_1d(float(y)) * 5.0
		x = clampf(want, x - 1.0, x + 1.0)
		xs.append(int(round(x)))
	var ls: Array = []
	var cur: int = int(lvl[_ix(int(xs[0]), y0)])
	var run: int = 0
	for i in xs.size():
		var own: int = int(lvl[_ix(int(xs[i]), y0 + i)])
		if run >= 8 and own < cur:
			cur = maxi(own, cur - 1)
			run = 0
		else:
			run += 1
		ls.append(cur)
	for i in xs.size():
		var yy: int = y0 + i
		for ox in range(-3, 4):
			var cx: int = int(xs[i]) + ox
			if _in(cx, yy):
				lvl[_ix(cx, yy)] = int(ls[i])
				if absi(ox) <= 1:
					water[_ix(cx, yy)] = 1
	# a pond where the river ends
	var ex: int = int(xs[xs.size() - 1])
	var ey: int = y1 + 3
	var el: int = int(ls[ls.size() - 1])
	for oy in range(-7, 8):
		for ox in range(-7, 8):
			var d2: float = float(ox * ox + oy * oy)
			if d2 <= 49.0 and _in(ex + ox, ey + oy):
				lvl[_ix(ex + ox, ey + oy)] = el
				if d2 <= 16.0:
					water[_ix(ex + ox, ey + oy)] = 1
	river_xs = xs
	river_y0 = y0
	river_pond = Vector2i(ex, ey)

# once the terrain is final: the water takes the height of its banks, then bridges go where both banks match
func _river_fix() -> void:
	if river_xs.is_empty():
		return
	var n: int = river_xs.size()
	var wl: Array = []
	for i in n:
		var yy: int = river_y0 + i
		var cx: int = int(river_xs[i])
		var la: int = int(lvl[_ix(cx - 3, yy)])
		var lb: int = int(lvl[_ix(cx + 3, yy)])
		var l: int = mini(la, lb)
		wl.append(l)
		for ox in range(-1, 2):
			lvl[_ix(cx + ox, yy)] = l
	# the pond takes the lowest bank around it
	var pl: int = 99
	for o in [Vector2i(7, 0), Vector2i(-7, 0), Vector2i(0, 7), Vector2i(0, -7)]:
		var pc: Vector2i = river_pond + (o as Vector2i)
		if _in(pc.x, pc.y) and water[_ix(pc.x, pc.y)] == 0:
			pl = mini(pl, int(lvl[_ix(pc.x, pc.y)]))
	if pl == 99:
		pl = 0
	for oy in range(-5, 6):
		for ox in range(-5, 6):
			var px: int = river_pond.x + ox
			var py: int = river_pond.y + oy
			if _in(px, py) and water[_ix(px, py)] == 1 and py > river_y0 + n - 2:
				lvl[_ix(px, py)] = pl
	# the river runs along the edge of the mountain, so nothing needs a crossing
	if true:
		return
	var cands: Dictionary = {}
	for r in range(1, n - 3):
		var cx2: int = int(river_xs[r])
		if int(river_xs[r + 1]) != cx2 or int(river_xs[r - 1]) != cx2:
			continue
		var yy2: int = river_y0 + r
		var l2: int = int(lvl[_ix(cx2 - 2, yy2)])
		var okb: bool = true
		for ro in range(-1, 3):
			for ox2 in [-3, -2, 2, 3]:
				if int(lvl[_ix(cx2 + (ox2 as int), yy2 + ro)]) != l2 or rmp[_ix(cx2 + (ox2 as int), yy2 + ro)] >= 0 or water[_ix(cx2 + (ox2 as int), yy2 + ro)] != 0:
					okb = false
		if okb:
			if not cands.has(l2):
				cands[l2] = []
			(cands[l2] as Array).append(r)
	for kk in cands:
		var rows: Array = cands[kk]
		var picks: Array = [rows[rows.size() / 2]]
		if rows.size() > 24:
			picks.append(rows[rows.size() / 6])
			picks.append(rows[rows.size() * 5 / 6])
		for pr in picks:
			var bx: int = int(river_xs[int(pr)])
			var yr: int = river_y0 + int(pr)
			for ro2 in 2:
				for ox3 in range(-1, 2):
					water[_ix(bx + ox3, yr + ro2)] = 0
					lvl[_ix(bx + ox3, yr + ro2)] = int(kk)
			bridges.append({"lvl": int(kk), "x": bx, "y": yr})

func _water_tex(k: int) -> ImageTexture:
	if _field_cache.has(1000 + k):
		return _field_cache[1000 + k]
	var fn := FastNoiseLite.new()
	fn.seed = 91 + k
	fn.frequency = 0.15
	var wr := PackedFloat32Array()
	wr.resize(GW * GH)
	for i in GW * GH:
		wr[i] = 1.0 if (water[i] == 1 and int(lvl[i]) == k) else 0.0
	wr = _blur(wr)
	var img := Image.create(GW, GH, false, Image.FORMAT_RGBA8)
	for y in GH:
		for x in GW:
			var i2: int = y * GW + x
			var v: float = wr[i2]
			v = clampf(v + fn.get_noise_2d(float(x), float(y)) * 0.25 * 4.0 * v * (1.0 - v), 0.0, 1.0)
			var fall: float = 0.0
			if water[i2] == 1 and int(lvl[i2]) == k and y + 1 < GH and water[i2 + GW] == 1 and int(lvl[i2 + GW]) < k:
				fall = 1.0
			img.set_pixel(x, y, Color(v, fall, 0.0, 1.0))
	img.resize(GW * 4, GH * 4, Image.INTERPOLATE_BILINEAR)
	var tex: ImageTexture = ImageTexture.create_from_image(img)
	_field_cache[1000 + k] = tex
	return tex

func _draw_water(ci: CanvasItem, mode: String) -> void:
	var k: int = int(mode.substr(1))
	var up: float = H * float(k)
	if mode.begins_with("B"):
		for b in bridges:
			if int(b["lvl"]) != k:
				continue
			var x0: float = float(int(b["x"]) - 2) * CELL - 4.0
			var y0: float = float(int(b["y"])) * CELL - up - 4.0
			var w: float = 5.0 * CELL + 8.0
			var h: float = 2.0 * CELL + 8.0
			ci.draw_rect(Rect2(x0, y0, w, h), Color(0.5, 0.36, 0.2))
			var bxx: float = x0 + 4.0
			while bxx < x0 + w - 3.0:
				ci.draw_line(Vector2(bxx, y0), Vector2(bxx, y0 + h), Color(0.3, 0.2, 0.1), 2.0)
				bxx += 9.0
			ci.draw_rect(Rect2(x0, y0, w, 4.0), Color(0.28, 0.18, 0.1))
			ci.draw_rect(Rect2(x0, y0 + h - 4.0, w, 4.0), Color(0.28, 0.18, 0.1))
			for px in [x0 + 2.0, x0 + w - 6.0]:
				ci.draw_rect(Rect2(px, y0 - 6.0, 5.0, 10.0), Color(0.22, 0.14, 0.08))
				ci.draw_rect(Rect2(px, y0 + h - 4.0, 5.0, 10.0), Color(0.22, 0.14, 0.08))
		return
	var mat := ShaderMaterial.new()
	mat.shader = load("res://mtn_water.gdshader")
	mat.set_shader_parameter("wfield", _water_tex(k))
	mat.set_shader_parameter("noise", _noise_tex())
	mat.set_shader_parameter("world_size", Vector2(float(GW) * CELL, float(GH) * CELL))
	mat.set_shader_parameter("hgt", H)
	mat.set_shader_parameter("yoff", up)
	ci.material = mat
	ci.draw_rect(Rect2(0.0, -up, float(GW) * CELL, float(GH) * CELL + 80.0), Color(1, 1, 1))
