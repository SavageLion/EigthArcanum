class_name MountainMap
extends Node2D
# A mountain slice with up to five levels. The pen sits in the valley at the bottom, terraces climb around it
# with cliff edges and ramps, and anything can walk up or down by a ramp.

const CELL: float = 24.0
const GW: int = 136
const GH: int = 92
const H: float = 42.0

var game: Node2D
var levels: int = 1
var lvl: PackedByteArray = PackedByteArray()
var rmp: PackedInt32Array = PackedInt32Array()
var ramps: Array = []
var spawnable: Array = []   # per level, a list of cell centres
var dist: PackedInt32Array = PackedInt32Array()
var cliff_tex: Array = []
var trail: PackedByteArray = PackedByteArray()
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
	ramps.clear()
	if levels > 1:
		_generate()
	_collect_spawns()
	_flow()
	_trails()
	if levels > 1:
		_make_parts()
		_decorate()

func _generate() -> void:
	var noise := FastNoiseLite.new()
	noise.seed = randi()
	noise.frequency = 0.045
	noise.fractal_octaves = 3
	var cx: float = float(GW) / 2.0
	var cy: float = float(GH) / 2.0
	for y in GH:
		for x in GW:
			var dx: float = (float(x) - cx) / (float(GW) * 0.5)
			var dy: float = (float(y) - cy) / (float(GH) * 0.5)
			var d: float = sqrt(dx * dx * 0.75 + dy * dy)
			var e: float = clampf((d - 0.3) / 0.7, 0.0, 1.0) + noise.get_noise_2d(float(x), float(y)) * 0.32
			var l: int = clampi(int(floor(clampf(e, 0.0, 0.999) * float(levels))), 0, levels - 1)
			# the valley around the pen stays flat
			if (dx * dx / 0.08) + (dy * dy / 0.09) < 1.0:
				l = 0
			lvl[_ix(x, y)] = l
	for pass_i in 2:
		_smooth()
	for k in range(0, levels - 1):
		_place_ramps(k, 2 + levels / 2)
	_connect()

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
	for y in range(4, GH - 8, 2):
		for x in range(4, GW - 8, 2):
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
	ramps.append({"a": a, "b": b, "w": 4.0 * CELL, "lo": k, "hi": k + 1, "rect": rect})
	return true

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
			if rmp[_ix(n2.x, n2.y)] < 0 and rmp[_ix(c2.x, c2.y)] < 0:
				lvl[_ix(n2.x, n2.y)] = lvl[_ix(c2.x, c2.y)]
			elif rmp[_ix(n2.x, n2.y)] < 0:
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
				var side: Vector2i = Vector2i(cur.x + 1, cur.y) if (absi(best.x - cur.x) + 1) % 2 == 0 else Vector2i(cur.x, cur.y + 1)
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
			var inside: bool = true
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
	if not ground.is_empty():
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
		var n: int = 30 + 10 * (levels - k)
		for i in n:
			var from_edge: bool = not edge.is_empty() and rng.randf() < 0.65
			var p2: Vector2 = (edge[rng.randi() % edge.size()] if from_edge else list[rng.randi() % list.size()]) as Vector2
			var s := Sprite2D.new()
			var roll: float = rng.randf()
			var t: Texture2D = shrub if roll < 0.45 else (rocks if roll < 0.8 else trees[rng.randi() % trees.size()])
			var sc: float = rng.randf_range(0.55, 0.85) if not trees.has(t) else rng.randf_range(0.9, 1.3)
			s.texture = t
			s.scale = Vector2.ONE * sc
			s.offset = Vector2(0, -float(t.get_height()) * 0.5 + 6.0 - H * float(k) / maxf(sc, 0.01))
			s.position = p2 + Vector2(rng.randf_range(-6.0, 6.0), rng.randf_range(-6.0, 6.0))
			s.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
			game.container_for(k).add_child(s)

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
			ci.draw_colored_polygon(pts, Color(0.5, 0.48, 0.44))
			var steps: int = 9
			for kk in steps:
				var t0: float = float(kk) / float(steps)
				var t1: float = float(kk + 1) / float(steps)
				var m0: Vector2 = a.lerp(b, t0) + pa.lerp(pb, t0)
				var m1: Vector2 = a.lerp(b, t1) + pa.lerp(pb, t1)
				var sh: float = 0.42 + 0.22 * t1
				ci.draw_colored_polygon(PackedVector2Array([m0 + perp * 0.86, m1 + perp * 0.86, m1 - perp * 0.86, m0 - perp * 0.86]), Color(sh, sh * 0.97, sh * 0.9))
				ci.draw_line(m1 + perp * 0.86, m1 - perp * 0.86, Color(0.26, 0.25, 0.24, 0.8), 2.0)
			ci.draw_line(a + perp * 0.86 + pa, b + perp * 0.86 + pb, Color(0.3, 0.28, 0.25), 2.0)
			ci.draw_line(a - perp * 0.86 + pa, b - perp * 0.86 + pb, Color(0.3, 0.28, 0.25), 2.0)
		return
	var k: int = int(mode.substr(1))
	if k == 0:
		_draw_clouds(ci)
	var base: Color = _top_color(k)
	var up: float = H * float(k)
	ci.modulate = [Color(1,1,1),Color(1.0,1.0,0.95),Color(1.0,0.97,0.9),Color(0.95,0.95,1.0),Color(0.92,0.96,1.08)][clampi(k,0,4)]
	for cy in GH:
		for cx in GW:
			if rmp[_ix(cx, cy)] >= 0 or int(lvl[_ix(cx, cy)]) != k:
				continue
			var x: float = float(cx) * CELL
			var y: float = float(cy) * CELL - up
			if trail.size() > 0 and trail[_ix(cx, cy)] == 1:
				ci.draw_texture_rect_region(ground_tex["d%d" % (int(_hash(cx, cy) * 12.0) % 12)], Rect2(x, y, CELL + 0.6, CELL + 0.6), Rect2(2.0, 2.0, 28.0, 28.0), Color(1.35, 1.25, 1.05))
			elif k > 0:
				var names: Array = TOPS[clampi(k, 1, 4)]
				var tname: String = String(names[int(_hash(cx, cy) * float(names.size())) % names.size()])
				ci.draw_texture_rect_region(ground_tex[tname], Rect2(x, y, CELL + 0.6, CELL + 0.6), Rect2(2.0, 2.0, 28.0, 28.0))
				if _lv(cx, cy - 1) < k:
					for j in 3:
						var h2: float = _hash(cx * 3 + j, cy + 7)
						ci.draw_circle(Vector2(x + CELL * (0.17 + 0.33 * float(j)), y + 1.0 - h2 * 5.0), 4.0 + h2 * 4.0, base.lightened(0.1 + h2 * 0.1))
				if _lv(cx - 1, cy) < k:
					var h3: float = _hash(cx + 5, cy * 3)
					ci.draw_circle(Vector2(x - 1.0 - h3 * 3.0, y + CELL * h3), 4.0 + h3 * 3.0, base.darkened(0.2))
				if _lv(cx + 1, cy) < k:
					var h4: float = _hash(cx * 3, cy + 11)
					ci.draw_circle(Vector2(x + CELL + 1.0 + h4 * 3.0, y + CELL * h4), 4.0 + h4 * 3.0, base.darkened(0.2))
			var south: int = _lv(cx, cy + 1)
			if south < k and _in(cx, cy + 1) and rmp[_ix(cx, cy + 1)] < 0:
				var rows: int = k - south
				var fy: float = float(cy + 1) * CELL - up
				var tex: Texture2D = cliff_tex[int(_hash(cx / 4, cy) * 2.0) % 2]
				var sx: float = float(cx % 4) * 32.0
				for rw in rows:
					var shade: float = 1.0 - 0.12 * float(rw)
					var src := Rect2(sx, 0.0 if rw == 0 else 28.0, 32.0, 56.0)
					ci.draw_texture_rect_region(tex, Rect2(x, fy + float(rw) * H, CELL + 0.5, H), src, Color(shade, shade, shade))
				var by: float = fy + float(rows) * H
				var hb: float = _hash(cx * 5, cy + 3)
				var hc: float = _hash(cx * 5 + 2, cy + 9)
				ci.draw_colored_polygon(PackedVector2Array([Vector2(x - 2.0, by - 6.0), Vector2(x + CELL * 0.3, by + 3.0 + hb * 7.0), Vector2(x + CELL * 0.65, by + 1.0 + hc * 6.0), Vector2(x + CELL + 2.0, by - 6.0)]), Color(0.2, 0.2, 0.22, 0.55))
				ci.draw_circle(Vector2(x + CELL * hb, by + 2.0 + hc * 4.0), 3.0 + hc * 2.5, Color(0.42, 0.42, 0.44))


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
