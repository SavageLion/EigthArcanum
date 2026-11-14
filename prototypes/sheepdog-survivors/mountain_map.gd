class_name MountainMap
extends Node2D
# A mountain slice with up to five levels. The pen sits in the valley at the bottom, terraces climb around it
# with cliff edges and ramps, and anything can walk up or down by a ramp.

const CELL: float = 24.0
const GW: int = 136
const GH: int = 92
const H: float = 30.0

var game: Node2D
var levels: int = 1
var lvl: PackedByteArray = PackedByteArray()
var rmp: PackedInt32Array = PackedInt32Array()
var ramps: Array = []
var spawnable: Array = []   # per level, a list of cell centres
var dist: PackedInt32Array = PackedInt32Array()

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
		part.z_index = 10 * k + 1
		add_child(part)
	var rp := LayerPart.new()
	rp.map = self
	rp.mode = "ramps"
	rp.z_index = 2
	add_child(rp)

func _decorate() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = randi()
	var trees: Array = [game.world.tex("tree_big_a"), game.world.tex("tree_big_b")]
	var rock: Texture2D = game.world.tex("rock2")
	for k in range(1, levels):
		var list: Array = spawnable[k]
		if list.is_empty():
			continue
		var n: int = 26 + 8 * (levels - k)
		for i in n:
			var p: Vector2 = list[rng.randi() % list.size()]
			var s := Sprite2D.new()
			var is_tree: bool = rng.randf() < (0.55 if k <= 2 else 0.2)
			var t: Texture2D = trees[rng.randi() % trees.size()] if is_tree else rock
			s.texture = t
			var sc: float = rng.randf_range(0.5, 0.7) if is_tree else rng.randf_range(0.05, 0.09)
			s.scale = Vector2.ONE * sc
			s.offset = Vector2(0, -float(t.get_height()) * 0.5 + 4.0 - H * float(k) / maxf(sc, 0.01))
			s.position = p
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
			ci.draw_colored_polygon(PackedVector2Array([a + perp + pa, b + perp + pb, b - perp + pb, a - perp + pa]), Color(0.62, 0.5, 0.34))
			for kk in range(1, 8):
				var t: float = float(kk) / 8.0
				var m: Vector2 = a.lerp(b, t) + pa.lerp(pb, t)
				ci.draw_line(m + perp, m - perp, Color(0.44, 0.34, 0.22, 0.7), 2.0)
			ci.draw_line(a + perp + pa, b + perp + pb, Color(0.3, 0.22, 0.14), 2.0)
			ci.draw_line(a - perp + pa, b - perp + pb, Color(0.3, 0.22, 0.14), 2.0)
		return
	var k: int = int(mode.substr(1))
	var base: Color = _top_color(k)
	var up: float = H * float(k)
	for cy in GH:
		for cx in GW:
			if rmp[_ix(cx, cy)] >= 0 or int(lvl[_ix(cx, cy)]) != k:
				continue
			var x: float = float(cx) * CELL
			var y: float = float(cy) * CELL - up
			if k > 0:
				var sh: float = _hash(cx, cy) * 0.07
				ci.draw_rect(Rect2(x, y, CELL + 0.6, CELL + 0.6), Color(base.r + sh, base.g + sh, base.b + sh * 0.6))
				if _lv(cx, cy - 1) < k:
					ci.draw_rect(Rect2(x, y, CELL + 0.6, 3.0), base.lightened(0.18))
				if _lv(cx - 1, cy) < k:
					ci.draw_rect(Rect2(x, y, 2.5, CELL), base.darkened(0.32))
				if _lv(cx + 1, cy) < k:
					ci.draw_rect(Rect2(x + CELL - 2.5, y, 2.5, CELL), base.darkened(0.32))
			var south: int = _lv(cx, cy + 1)
			if south < k and _in(cx, cy + 1) and rmp[_ix(cx, cy + 1)] < 0:
				var drop: float = float(k - south) * H
				var fy: float = float(cy + 1) * CELL - up
				var wob: float = _hash(cx + 7, cy) * 5.0
				var face := Color(0.52, 0.47, 0.41)
				ci.draw_rect(Rect2(x, fy, CELL + 0.6, drop + wob), face)
				for s in range(1, int(drop / 8.0)):
					ci.draw_rect(Rect2(x, fy + float(s) * 8.0 + _hash(cx, s) * 3.0, CELL, 2.0), face.darkened(0.22))
				ci.draw_rect(Rect2(x + _hash(cx, cy + 3) * (CELL - 4.0), fy, 3.0, drop), face.darkened(0.18))
				ci.draw_rect(Rect2(x, fy, CELL + 0.6, 3.0), face.darkened(0.4))
				ci.draw_rect(Rect2(x, fy + drop + wob, CELL + 0.6, 8.0), Color(0, 0, 0, 0.16))
