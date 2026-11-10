class_name City
extends RefCounted
# The street network: junctions (nodes) joined by streets (edges, each a gently bent Curve2D), plus the city blocks between them.
# Generated from a jittered grid with uneven spacing, a few avenues and a few missing links, so it reads as a real city
# with open spaces instead of a perfect grid or a single loop.

const COLS := 8
const ROWS := 6
const STREET_W := 96.0
const AVENUE_W := 124.0
const PAVE_EXTRA := 94.0
const LANE_F := 0.23

var nodes: Array = []          # Vector2
var edges: Array = []          # {a, b, curve, len, w, pts}
var adj: Dictionary = {}       # node index -> Array of edge indices
var cells: Array = []          # {rect, ij, type}
var bounds := Rect2()
var xs: Array = []
var ys: Array = []

func generate(rng: RandomNumberGenerator) -> void:
	nodes.clear(); edges.clear(); adj.clear(); cells.clear(); xs.clear(); ys.clear()
	var x := 0.0
	for i in COLS + 1:
		xs.append(x)
		x += rng.randf_range(640.0, 860.0)
	var y := 0.0
	for j in ROWS + 1:
		ys.append(y)
		y += rng.randf_range(540.0, 720.0)
	for j in ROWS + 1:
		for i in COLS + 1:
			var jx := rng.randf_range(-50.0, 50.0) if (i > 0 and i < COLS) else 0.0
			var jy := rng.randf_range(-50.0, 50.0) if (j > 0 and j < ROWS) else 0.0
			nodes.append(Vector2(xs[i] + jx, ys[j] + jy))
	var want: Array = []
	for j in ROWS + 1:
		for i in COLS + 1:
			if i < COLS:
				want.append([j * (COLS + 1) + i, j * (COLS + 1) + i + 1, j == 0 or j == ROWS])
			if j < ROWS:
				want.append([j * (COLS + 1) + i, (j + 1) * (COLS + 1) + i, i == 0 or i == COLS])
	for w in want:
		var border: bool = w[2]
		if not border and rng.randf() < 0.1:
			continue
		_add_edge(w[0], w[1], rng)
	if not _connected():
		# put every link back if the random cuts split the city
		edges.clear(); adj.clear()
		for w in want:
			_add_edge(w[0], w[1], rng)
	var mn := Vector2(1e9, 1e9)
	var mx := Vector2(-1e9, -1e9)
	for n in nodes:
		mn = Vector2(minf(mn.x, n.x), minf(mn.y, n.y))
		mx = Vector2(maxf(mx.x, n.x), maxf(mx.y, n.y))
	bounds = Rect2(mn, mx - mn)
	for j in ROWS:
		for i in COLS:
			var a: Vector2 = nodes[j * (COLS + 1) + i]
			var b: Vector2 = nodes[j * (COLS + 1) + i + 1]
			var c: Vector2 = nodes[(j + 1) * (COLS + 1) + i]
			var d: Vector2 = nodes[(j + 1) * (COLS + 1) + i + 1]
			var inset := STREET_W / 2.0 + PAVE_EXTRA / 2.0 + 28.0
			var l := maxf(a.x, c.x) + inset
			var r := minf(b.x, d.x) - inset
			var t := maxf(a.y, b.y) + inset
			var bt := minf(c.y, d.y) - inset
			if r - l > 200.0 and bt - t > 170.0:
				cells.append({"rect": Rect2(l, t, r - l, bt - t), "ij": Vector2i(i, j), "type": "shops"})

func _add_edge(a: int, b: int, rng: RandomNumberGenerator) -> void:
	var pa: Vector2 = nodes[a]
	var pb: Vector2 = nodes[b]
	var dirv := (pb - pa)
	var ln := dirv.length()
	var perp := Vector2(-dirv.y, dirv.x).normalized()
	var bow := rng.randf_range(-48.0, 48.0)
	var cv := Curve2D.new()
	cv.add_point(pa, Vector2.ZERO, dirv / 3.0 + perp * bow * 1.33)
	cv.add_point(pb, -dirv / 3.0 + perp * bow * 1.33, Vector2.ZERO)
	var w := AVENUE_W if rng.randf() < 0.22 else STREET_W
	var pts := cv.tessellate(5, 2.0)
	var e := {"a": a, "b": b, "curve": cv, "len": cv.get_baked_length(), "w": w, "pts": pts}
	edges.append(e)
	var idx := edges.size() - 1
	for n in [a, b]:
		if not adj.has(n):
			adj[n] = []
		adj[n].append(idx)
	ln = ln

func _connected() -> bool:
	var seen := {0: true}
	var q := [0]
	while not q.is_empty():
		var n: int = q.pop_back()
		for ei in adj.get(n, []):
			var e: Dictionary = edges[ei]
			var o: int = e["b"] if e["a"] == n else e["a"]
			if not seen.has(o):
				seen[o] = true
				q.append(o)
	return seen.size() == nodes.size()

# ---------- queries ----------
func point(ei: int, off: float) -> Vector2:
	var e: Dictionary = edges[ei]
	return e["curve"].sample_baked(clampf(off, 0.0, e["len"]))

func tangent(ei: int, off: float) -> Vector2:
	var e: Dictionary = edges[ei]
	var o := clampf(off, 0.0, e["len"] - 9.0)
	return (e["curve"].sample_baked(o + 8.0) - e["curve"].sample_baked(o)).normalized()

func normal(ei: int, off: float) -> Vector2:
	var t := tangent(ei, off)
	return Vector2(-t.y, t.x)

func lane_off(ei: int) -> float:
	return edges[ei]["w"] * LANE_F

func lane_pos(ei: int, off: float, dir: int) -> Vector2:
	return point(ei, off) + normal(ei, off) * lane_off(ei) * float(dir)

func random_lane_spot(rng: RandomNumberGenerator) -> Dictionary:
	var ei := rng.randi() % edges.size()
	var e: Dictionary = edges[ei]
	var off := rng.randf_range(80.0, maxf(81.0, e["len"] - 80.0))
	var dir := 1 if rng.randf() < 0.5 else -1
	return {"pos": lane_pos(ei, off, dir), "e": ei, "off": off, "dir": dir}

func random_walk_spot(rng: RandomNumberGenerator) -> Dictionary:
	var ei := rng.randi() % edges.size()
	var e: Dictionary = edges[ei]
	var off := rng.randf_range(100.0, maxf(101.0, e["len"] - 100.0))
	var side := 1.0 if rng.randf() < 0.5 else -1.0
	return {"pos": point(ei, off) + normal(ei, off) * side * (e["w"] / 2.0 + 24.0), "e": ei, "off": off}

func pick_next(ei: int, dir: int, rng: RandomNumberGenerator) -> Dictionary:
	var e: Dictionary = edges[ei]
	var n: int = e["b"] if dir > 0 else e["a"]
	var opts: Array = []
	for o in adj[n]:
		if o != ei:
			opts.append(o)
	if opts.is_empty():
		return {"e": ei, "dir": -dir}
	var pick: int = opts[rng.randi() % opts.size()]
	return {"e": pick, "dir": 1 if edges[pick]["a"] == n else -1}

func nearest_edge(p: Vector2) -> int:
	var best := 0
	var bd := 1e18
	for i in edges.size():
		var cp: Vector2 = edges[i]["curve"].get_closest_point(p)
		var d := cp.distance_squared_to(p)
		if d < bd:
			bd = d
			best = i
	return best

func on_road(p: Vector2, margin: float = 0.0) -> bool:
	for i in edges.size():
		var e: Dictionary = edges[i]
		var cp: Vector2 = e["curve"].get_closest_point(p)
		if cp.distance_to(p) < e["w"] / 2.0 + PAVE_EXTRA / 2.0 + margin:
			return true
	return false
