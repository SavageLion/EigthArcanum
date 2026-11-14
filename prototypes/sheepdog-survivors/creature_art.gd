class_name CreatureArt
extends RefCounted
# Fantasy animals and raiders drawn pixel by pixel in code (placeholder until real art is made).
# Every creature is drawn facing east; the other directions reuse it (mirrored for the west side).

const NAMES: Array = ["chicken", "alpaca", "yak", "boar", "unicorn", "dragon", "phoenix", "goblin", "gargoyle", "harpy", "ogre", "drake", "griffin", "gorebeast", "wisp", "hexer", "minotaur", "torchling", "skeleton", "kobold", "frostling", "bat", "slime", "knight", "mole", "necromancer", "shaman", "banshee", "cutpurse"]
const FLYERS: Array = ["phoenix", "gargoyle", "harpy", "drake", "dragon", "griffin", "wisp", "frostling", "bat", "banshee"]
static var _cache: Dictionary = {}

static func has(n: String) -> bool:
	return NAMES.has(n)

static func canvas(n: String) -> Vector2i:
	if n == "drake":
		return Vector2i(112, 96)
	if n == "ogre":
		return Vector2i(80, 80)
	if n == "minotaur":
		return Vector2i(72, 80)
	if n == "gorebeast":
		return Vector2i(80, 64)
	return Vector2i(64, 64)

# ---------------------------------------------------------------- drawing helpers
static func _px(img: Image, x: int, y: int, c: Color) -> void:
	if x >= 0 and y >= 0 and x < img.get_width() and y < img.get_height():
		img.set_pixel(x, y, c)

static func _rect(img: Image, x: float, y: float, w: float, h: float, c: Color) -> void:
	for yy in range(int(y), int(y + h)):
		for xx in range(int(x), int(x + w)):
			_px(img, xx, yy, c)

static func _ell(img: Image, cx: float, cy: float, rx: float, ry: float, c: Color) -> void:
	for yy in range(int(cy - ry) - 1, int(cy + ry) + 2):
		for xx in range(int(cx - rx) - 1, int(cx + rx) + 2):
			var dx: float = (float(xx) - cx) / maxf(rx, 0.5)
			var dy: float = (float(yy) - cy) / maxf(ry, 0.5)
			if dx * dx + dy * dy <= 1.0:
				_px(img, xx, yy, c)

# a shaded blob: dark underside, body colour, light highlight
static func _ball(img: Image, cx: float, cy: float, rx: float, ry: float, c: Color) -> void:
	_ell(img, cx, cy + ry * 0.16, rx, ry, c.darkened(0.28))
	_ell(img, cx, cy - ry * 0.06, rx * 0.96, ry * 0.88, c)
	_ell(img, cx - rx * 0.25, cy - ry * 0.38, rx * 0.46, ry * 0.3, c.lightened(0.2))

static func _tri(img: Image, a: Vector2, b: Vector2, c: Vector2, col: Color) -> void:
	var mnx: int = int(minf(a.x, minf(b.x, c.x)))
	var mxx: int = int(maxf(a.x, maxf(b.x, c.x))) + 1
	var mny: int = int(minf(a.y, minf(b.y, c.y)))
	var mxy: int = int(maxf(a.y, maxf(b.y, c.y))) + 1
	var d: float = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y)
	if absf(d) < 0.001:
		return
	for yy in range(mny, mxy):
		for xx in range(mnx, mxx):
			var l1: float = ((b.y - c.y) * (float(xx) - c.x) + (c.x - b.x) * (float(yy) - c.y)) / d
			var l2: float = ((c.y - a.y) * (float(xx) - c.x) + (a.x - c.x) * (float(yy) - c.y)) / d
			var l3: float = 1.0 - l1 - l2
			if l1 >= 0.0 and l2 >= 0.0 and l3 >= 0.0:
				_px(img, xx, yy, col)

static func _line(img: Image, a: Vector2, b: Vector2, w: float, c: Color) -> void:
	var n: int = int(maxf(absf(b.x - a.x), absf(b.y - a.y))) + 1
	for i in n + 1:
		var p: Vector2 = a.lerp(b, float(i) / float(maxi(n, 1)))
		_rect(img, p.x - w / 2.0, p.y - w / 2.0, w, w, c)

static func _outline(img: Image) -> void:
	var src: Image = img.duplicate()
	var out := Color(0.12, 0.09, 0.1, 1.0)
	for y in img.get_height():
		for x in img.get_width():
			if src.get_pixel(x, y).a > 0.1:
				continue
			var near: bool = false
			for o in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
				var q: Vector2i = Vector2i(x, y) + (o as Vector2i)
				if q.x >= 0 and q.y >= 0 and q.x < img.get_width() and q.y < img.get_height() and src.get_pixel(q.x, q.y).a > 0.5:
					near = true
			if near:
				img.set_pixel(x, y, out)

# ---------------------------------------------------------------- the creatures (facing east, g = ground line)
static func _chicken(img: Image, f: int, g: float) -> void:
	var sw: float = [0.0, 2.0, 0.0, -2.0][f]
	var leg := Color(0.95, 0.65, 0.2)
	_rect(img, 28.0 + sw, g - 9.0, 2.0, 9.0, leg)
	_rect(img, 34.0 - sw, g - 9.0, 2.0, 9.0, leg)
	_rect(img, 27.0 + sw, g - 1.0, 5.0, 1.0, leg)
	_rect(img, 33.0 - sw, g - 1.0, 5.0, 1.0, leg)
	_tri(img, Vector2(21, g - 22), Vector2(12, g - 31), Vector2(22, g - 13), Color(0.62, 0.38, 0.2))
	_tri(img, Vector2(21, g - 20), Vector2(10, g - 24), Vector2(22, g - 12), Color(0.8, 0.52, 0.25))
	_ball(img, 30.0, g - 17.0, 11.0, 9.0, Color(0.97, 0.92, 0.8))
	_ell(img, 28.0, g - 17.0, 6.0, 4.0, Color(0.85, 0.68, 0.45))
	_ball(img, 41.0, g - 27.0, 5.0, 5.0, Color(0.97, 0.92, 0.8))
	_ell(img, 41.0, g - 33.0, 3.0, 2.0, Color(0.9, 0.2, 0.2))
	_tri(img, Vector2(45, g - 28), Vector2(51, g - 26), Vector2(45, g - 24), Color(1.0, 0.7, 0.2))
	_px(img, 43, int(g - 28.0), Color(0.05, 0.05, 0.05))
	_px(img, 45, int(g - 23.0), Color(0.9, 0.2, 0.2))

static func _alpaca(img: Image, f: int, g: float) -> void:
	var sw: float = [0.0, 2.0, 0.0, -2.0][f]
	var tan := Color(0.86, 0.72, 0.55)
	for lx in [20.0, 24.0]:
		_rect(img, float(lx) - sw, g - 14.0, 3.0, 14.0, tan.darkened(0.2))
	for lx in [32.0, 36.0]:
		_rect(img, float(lx) + sw, g - 14.0, 3.0, 14.0, tan.darkened(0.2))
	_rect(img, 37.0, g - 44.0, 5.0, 24.0, tan)
	_ball(img, 28.0, g - 22.0, 12.0, 9.0, tan)
	_ball(img, 28.0, g - 27.0, 11.0, 6.0, Color(0.98, 0.94, 0.85))
	_ball(img, 42.0, g - 45.0, 6.0, 4.0, tan)
	_ball(img, 41.0, g - 49.0, 4.0, 3.0, Color(0.98, 0.94, 0.85))
	_tri(img, Vector2(40, g - 49), Vector2(38, g - 56), Vector2(43, g - 49), tan.darkened(0.15))
	_tri(img, Vector2(44, g - 49), Vector2(47, g - 56), Vector2(48, g - 48), tan.darkened(0.15))
	_px(img, 44, int(g - 46.0), Color(0.05, 0.05, 0.05))

static func _yak(img: Image, f: int, g: float) -> void:
	var sw: float = [0.0, 2.0, 0.0, -2.0][f]
	var dk := Color(0.38, 0.27, 0.2)
	for lx in [18.0, 24.0]:
		_rect(img, float(lx) - sw, g - 12.0, 5.0, 12.0, dk.darkened(0.2))
	for lx in [34.0, 40.0]:
		_rect(img, float(lx) + sw, g - 12.0, 5.0, 12.0, dk.darkened(0.2))
	_ball(img, 28.0, g - 24.0, 16.0, 11.0, dk)
	_ball(img, 28.0, g - 15.0, 15.0, 6.0, dk.darkened(0.2))
	_ball(img, 34.0, g - 35.0, 8.0, 5.0, dk)
	_ball(img, 46.0, g - 25.0, 7.0, 6.0, dk.lightened(0.05))
	_ball(img, 51.0, g - 22.0, 4.0, 3.0, Color(0.55, 0.42, 0.35))
	_line(img, Vector2(43, g - 30), Vector2(39, g - 40), 2.0, Color(0.95, 0.9, 0.75))
	_line(img, Vector2(50, g - 30), Vector2(54, g - 38), 2.0, Color(0.95, 0.9, 0.75))
	_px(img, 48, int(g - 27.0), Color(0.95, 0.9, 0.7))

static func _boar(img: Image, f: int, g: float) -> void:
	var sw: float = [0.0, 2.0, 0.0, -2.0][f]
	var br := Color(0.5, 0.38, 0.32)
	for lx in [18.0, 23.0]:
		_rect(img, float(lx) - sw, g - 9.0, 4.0, 9.0, br.darkened(0.25))
	for lx in [33.0, 38.0]:
		_rect(img, float(lx) + sw, g - 9.0, 4.0, 9.0, br.darkened(0.25))
	for i in 6:
		_tri(img, Vector2(16 + i * 5, g - 24), Vector2(18 + i * 5, g - 31), Vector2(21 + i * 5, g - 24), Color(0.25, 0.18, 0.15))
	_ball(img, 28.0, g - 17.0, 14.0, 9.0, br)
	_ball(img, 44.0, g - 16.0, 8.0, 6.0, br)
	_rect(img, 49.0, g - 19.0, 5.0, 6.0, Color(0.9, 0.6, 0.6))
	_tri(img, Vector2(47, g - 13), Vector2(50, g - 18), Vector2(51, g - 12), Color(0.97, 0.93, 0.8))
	_tri(img, Vector2(42, g - 21), Vector2(44, g - 27), Vector2(47, g - 21), br.darkened(0.2))
	_px(img, 46, int(g - 19.0), Color(0.05, 0.05, 0.05))
	_px(img, 13, int(g - 20.0), br.darkened(0.3))
	_px(img, 12, int(g - 21.0), br.darkened(0.3))

static func _unicorn(img: Image, f: int, g: float) -> void:
	var sw: float = [0.0, 2.0, 0.0, -2.0][f]
	var wh := Color(0.97, 0.97, 1.0)
	for lx in [18.0, 22.0]:
		_rect(img, float(lx) - sw, g - 15.0, 3.0, 15.0, wh.darkened(0.12))
		_rect(img, float(lx) - sw, g - 2.0, 3.0, 2.0, Color(0.95, 0.8, 0.3))
	for lx in [31.0, 35.0]:
		_rect(img, float(lx) + sw, g - 15.0, 3.0, 15.0, wh.darkened(0.12))
		_rect(img, float(lx) + sw, g - 2.0, 3.0, 2.0, Color(0.95, 0.8, 0.3))
	_ell(img, 14.0, g - 22.0, 4.0, 9.0, Color(0.95, 0.5, 0.85))
	_ell(img, 11.0, g - 15.0, 3.0, 8.0, Color(0.7, 0.5, 0.95))
	_ball(img, 27.0, g - 22.0, 13.0, 8.0, wh)
	_tri(img, Vector2(33, g - 26), Vector2(43, g - 42), Vector2(38, g - 20), wh)
	_ball(img, 45.0, g - 41.0, 6.0, 4.0, wh)
	_ball(img, 50.0, g - 39.0, 3.0, 2.0, Color(0.98, 0.85, 0.9))
	_tri(img, Vector2(45, g - 44), Vector2(48, g - 58), Vector2(51, g - 44), Color(1.0, 0.85, 0.3))
	_line(img, Vector2(47, g - 47), Vector2(49, g - 50), 1.0, Color(0.9, 0.6, 0.15))
	_tri(img, Vector2(42, g - 44), Vector2(41, g - 50), Vector2(44, g - 44), wh.darkened(0.1))
	for i in 4:
		_ell(img, 37.0 - float(i) * 2.0, g - 39.0 + float(i) * 4.0, 3.0, 4.0, Color(0.95, 0.45, 0.85) if i % 2 == 0 else Color(0.7, 0.5, 0.95))
	_px(img, 47, int(g - 42.0), Color(0.2, 0.1, 0.3))

static func _dragon(img: Image, f: int, g: float) -> void:
	var sw: float = [0.0, 2.0, 0.0, -2.0][f]
	var wy: float = [0.0, -3.0, -6.0, -3.0][f]
	var gr := Color(0.35, 0.7, 0.4)
	for lx in [20.0, 24.0]:
		_rect(img, float(lx) - sw, g - 8.0, 3.0, 8.0, gr.darkened(0.25))
	for lx in [31.0, 35.0]:
		_rect(img, float(lx) + sw, g - 8.0, 3.0, 8.0, gr.darkened(0.25))
	_ball(img, 12.0, g - 11.0, 6.0, 4.0, gr)
	_ball(img, 6.0, g - 9.0, 4.0, 3.0, gr)
	_tri(img, Vector2(2, g - 11), Vector2(-2, g - 14), Vector2(3, g - 7), Color(0.9, 0.5, 0.2))
	_tri(img, Vector2(20, g - 24), Vector2(12, g - 36 + wy), Vector2(30, g - 26), Color(0.85, 0.35, 0.35))
	_tri(img, Vector2(22, g - 24), Vector2(24, g - 38 + wy), Vector2(32, g - 25), Color(0.7, 0.25, 0.3))
	_ball(img, 27.0, g - 17.0, 11.0, 8.0, gr)
	_ball(img, 29.0, g - 12.0, 8.0, 4.0, Color(0.9, 0.9, 0.5))
	for i in 4:
		_tri(img, Vector2(19 + i * 5, g - 24), Vector2(21 + i * 5, g - 29), Vector2(23 + i * 5, g - 24), Color(0.95, 0.55, 0.2))
	_ball(img, 38.0, g - 27.0, 5.0, 6.0, gr)
	_ball(img, 42.0, g - 30.0, 6.0, 5.0, gr)
	_ball(img, 47.0, g - 28.0, 4.0, 3.0, gr.lightened(0.05))
	_tri(img, Vector2(40, g - 34), Vector2(39, g - 40), Vector2(43, g - 34), Color(0.95, 0.55, 0.2))
	_px(img, 44, int(g - 31.0), Color(1.0, 0.9, 0.2))
	_px(img, 45, int(g - 31.0), Color(0.1, 0.1, 0.05))
	if f % 2 == 1:
		_px(img, 51, int(g - 28.0), Color(1.0, 0.6, 0.1))
		_px(img, 52, int(g - 29.0), Color(1.0, 0.85, 0.2))

static func _phoenix(img: Image, f: int, g: float) -> void:
	var wy: float = [0.0, -6.0, -11.0, -5.0][f]
	_ell(img, 30.0, g - 26.0, 18.0, 15.0, Color(1.0, 0.55, 0.1, 0.3))
	_tri(img, Vector2(24, g - 24), Vector2(4, g - 10), Vector2(22, g - 18), Color(0.85, 0.2, 0.1))
	_tri(img, Vector2(24, g - 25), Vector2(6, g - 18), Vector2(23, g - 20), Color(1.0, 0.5, 0.1))
	_tri(img, Vector2(25, g - 26), Vector2(8, g - 26), Vector2(23, g - 21), Color(1.0, 0.85, 0.25))
	_rect(img, 30.0, g - 14.0, 2.0, 12.0, Color(0.9, 0.6, 0.2))
	_rect(img, 35.0, g - 14.0, 2.0, 12.0, Color(0.9, 0.6, 0.2))
	_ell(img, 24.0, g - 31.0 + wy, 7.0, 11.0, Color(0.75, 0.2, 0.08))
	_ball(img, 31.0, g - 25.0, 10.0, 7.0, Color(0.95, 0.4, 0.1))
	_ball(img, 33.0, g - 21.0, 6.0, 4.0, Color(1.0, 0.8, 0.25))
	_ell(img, 32.0, g - 32.0 + wy * 0.6, 9.0, 5.0, Color(1.0, 0.55, 0.12))
	_ball(img, 41.0, g - 32.0, 5.0, 5.0, Color(1.0, 0.5, 0.1))
	_tri(img, Vector2(38, g - 37), Vector2(36, g - 44), Vector2(41, g - 37), Color(1.0, 0.85, 0.25))
	_tri(img, Vector2(41, g - 37), Vector2(42, g - 45), Vector2(44, g - 36), Color(1.0, 0.7, 0.2))
	_tri(img, Vector2(45, g - 33), Vector2(51, g - 31), Vector2(45, g - 29), Color(1.0, 0.85, 0.3))
	_px(img, 43, int(g - 33.0), Color(0.1, 0.05, 0.05))

static func _goblin(img: Image, f: int, g: float) -> void:
	var sw: float = [0.0, 2.0, 0.0, -2.0][f]
	var gr := Color(0.5, 0.75, 0.3)
	_rect(img, 27.0 + sw, g - 12.0, 4.0, 12.0, gr.darkened(0.3))
	_rect(img, 34.0 - sw, g - 12.0, 4.0, 12.0, gr.darkened(0.3))
	_rect(img, 26.0 + sw, g - 2.0, 6.0, 2.0, Color(0.3, 0.2, 0.12))
	_rect(img, 33.0 - sw, g - 2.0, 6.0, 2.0, Color(0.3, 0.2, 0.12))
	_ball(img, 32.0, g - 21.0, 7.0, 9.0, Color(0.5, 0.35, 0.2))
	_line(img, Vector2(36, g - 24), Vector2(44, g - 21), 3.0, gr)
	_ball(img, 47.0, g - 20.0, 5.0, 5.0, Color(0.16, 0.16, 0.2))
	_line(img, Vector2(47, g - 26), Vector2(49, g - 31), 1.0, Color(0.7, 0.55, 0.3))
	_px(img, 49, int(g - 32.0), Color(1.0, 0.7, 0.1))
	_px(img, 50, int(g - 33.0), Color(1.0, 0.9, 0.3))
	_ball(img, 33.0, g - 34.0, 7.0, 6.0, gr)
	_tri(img, Vector2(27, g - 35), Vector2(17, g - 39), Vector2(28, g - 31), gr)
	_tri(img, Vector2(39, g - 35), Vector2(47, g - 40), Vector2(38, g - 31), gr)
	_px(img, 35, int(g - 35.0), Color(1.0, 0.9, 0.1))
	_px(img, 31, int(g - 35.0), Color(1.0, 0.9, 0.1))
	_rect(img, 31.0, g - 31.0, 4.0, 1.0, Color(0.2, 0.1, 0.1))

static func _gargoyle(img: Image, f: int, g: float) -> void:
	var sw: float = [0.0, 2.0, 0.0, -2.0][f]
	var wy: float = [0.0, -4.0, -8.0, -4.0][f]
	var st := Color(0.5, 0.55, 0.64)
	_tri(img, Vector2(28, g - 32), Vector2(8, g - 50 + wy), Vector2(26, g - 20), st.darkened(0.2))
	_tri(img, Vector2(34, g - 32), Vector2(52, g - 48 + wy), Vector2(36, g - 20), st.darkened(0.2))
	_rect(img, 26.0 + sw, g - 12.0, 5.0, 12.0, st.darkened(0.25))
	_rect(img, 34.0 - sw, g - 12.0, 5.0, 12.0, st.darkened(0.25))
	_rect(img, 25.0 + sw, g - 2.0, 7.0, 2.0, Color(0.25, 0.25, 0.3))
	_rect(img, 33.0 - sw, g - 2.0, 7.0, 2.0, Color(0.25, 0.25, 0.3))
	_line(img, Vector2(26, g - 18), Vector2(14, g - 12), 2.0, st.darkened(0.15))
	_ball(img, 31.0, g - 24.0, 8.0, 11.0, st)
	_ball(img, 33.0, g - 40.0, 7.0, 6.0, st.lightened(0.05))
	_tri(img, Vector2(28, g - 44), Vector2(26, g - 52), Vector2(32, g - 45), Color(0.85, 0.85, 0.9))
	_tri(img, Vector2(36, g - 45), Vector2(40, g - 53), Vector2(39, g - 44), Color(0.85, 0.85, 0.9))
	_px(img, 33, int(g - 41.0), Color(1.0, 0.2, 0.15))
	_px(img, 37, int(g - 41.0), Color(1.0, 0.2, 0.15))
	_rect(img, 33.0, g - 36.0, 5.0, 1.0, Color(0.15, 0.1, 0.1))

static func _harpy(img: Image, f: int, g: float) -> void:
	var sw: float = [0.0, 1.0, 0.0, -1.0][f]
	var wy: float = [0.0, -5.0, -10.0, -5.0][f]
	var pu := Color(0.55, 0.4, 0.72)
	_rect(img, 28.0 + sw, g - 10.0, 2.0, 10.0, Color(0.95, 0.65, 0.2))
	_rect(img, 34.0 - sw, g - 10.0, 2.0, 10.0, Color(0.95, 0.65, 0.2))
	_rect(img, 26.0 + sw, g - 1.0, 6.0, 1.0, Color(0.95, 0.65, 0.2))
	_rect(img, 33.0 - sw, g - 1.0, 6.0, 1.0, Color(0.95, 0.65, 0.2))
	_ell(img, 18.0, g - 30.0 + wy, 10.0, 7.0, pu.darkened(0.3))
	_ell(img, 46.0, g - 30.0 + wy, 10.0, 7.0, pu.darkened(0.3))
	_ell(img, 16.0, g - 28.0 + wy * 0.6, 7.0, 4.0, pu)
	_ell(img, 48.0, g - 28.0 + wy * 0.6, 7.0, 4.0, pu)
	_ball(img, 32.0, g - 24.0, 8.0, 11.0, pu)
	_ball(img, 32.0, g - 42.0, 6.0, 6.0, Color(0.92, 0.78, 0.68))
	_ball(img, 31.0, g - 45.0, 7.0, 4.0, Color(0.35, 0.2, 0.5))
	_px(img, 34, int(g - 42.0), Color(0.05, 0.05, 0.05))
	_tri(img, Vector2(36, g - 41), Vector2(41, g - 40), Vector2(36, g - 39), Color(1.0, 0.7, 0.2))

static func _ogre(img: Image, f: int, g: float) -> void:
	var sw: float = [0.0, 3.0, 0.0, -3.0][f]
	var gr := Color(0.45, 0.58, 0.36)
	_rect(img, 28.0 + sw, g - 16.0, 9.0, 16.0, gr.darkened(0.3))
	_rect(img, 42.0 - sw, g - 16.0, 9.0, 16.0, gr.darkened(0.3))
	_rect(img, 27.0 + sw, g - 3.0, 11.0, 3.0, Color(0.3, 0.22, 0.15))
	_rect(img, 41.0 - sw, g - 3.0, 11.0, 3.0, Color(0.3, 0.22, 0.15))
	_line(img, Vector2(60, g - 40), Vector2(71, g - 60), 5.0, Color(0.45, 0.3, 0.18))
	_ball(img, 71.0, g - 62.0, 7.0, 7.0, Color(0.35, 0.24, 0.15))
	_ball(img, 40.0, g - 34.0, 18.0, 20.0, gr)
	_ball(img, 41.0, g - 28.0, 12.0, 10.0, gr.lightened(0.12))
	_rect(img, 28.0, g - 22.0, 25.0, 8.0, Color(0.5, 0.34, 0.2))
	_ball(img, 20.0, g - 38.0, 6.0, 12.0, gr)
	_ball(img, 60.0, g - 40.0, 7.0, 12.0, gr)
	_ball(img, 41.0, g - 60.0, 10.0, 9.0, gr.lightened(0.05))
	_rect(img, 33.0, g - 66.0, 17.0, 3.0, gr.darkened(0.4))
	_tri(img, Vector2(35, g - 54), Vector2(33, g - 62), Vector2(38, g - 54), Color(0.97, 0.93, 0.8))
	_tri(img, Vector2(46, g - 54), Vector2(49, g - 62), Vector2(50, g - 53), Color(0.97, 0.93, 0.8))
	_px(img, 37, int(g - 62.0), Color(1.0, 0.2, 0.1))
	_px(img, 45, int(g - 62.0), Color(1.0, 0.2, 0.1))
	_tri(img, Vector2(31, g - 62), Vector2(26, g - 68), Vector2(33, g - 58), gr)

static func _drake(img: Image, f: int, g: float) -> void:
	var sw: float = [0.0, 3.0, 0.0, -3.0][f]
	var wy: float = [0.0, -8.0, -16.0, -8.0][f]
	var rd := Color(0.68, 0.16, 0.14)
	_tri(img, Vector2(48, g - 40), Vector2(22, g - 76 + wy), Vector2(66, g - 44), rd.darkened(0.3))
	_tri(img, Vector2(52, g - 40), Vector2(48, g - 80 + wy), Vector2(72, g - 42), rd.darkened(0.15))
	for lx in [34.0, 42.0]:
		_rect(img, float(lx) - sw, g - 14.0, 7.0, 14.0, rd.darkened(0.3))
		_rect(img, float(lx) - sw, g - 3.0, 9.0, 3.0, Color(0.95, 0.9, 0.7))
	for lx in [60.0, 68.0]:
		_rect(img, float(lx) + sw, g - 14.0, 7.0, 14.0, rd.darkened(0.3))
		_rect(img, float(lx) + sw, g - 3.0, 9.0, 3.0, Color(0.95, 0.9, 0.7))
	_ball(img, 22.0, g - 20.0, 10.0, 7.0, rd)
	_ball(img, 9.0, g - 15.0, 7.0, 5.0, rd)
	_tri(img, Vector2(4, g - 15), Vector2(-4, g - 20), Vector2(5, g - 9), Color(0.95, 0.6, 0.2))
	_ball(img, 50.0, g - 26.0, 26.0, 15.0, rd)
	_ball(img, 54.0, g - 18.0, 20.0, 7.0, Color(0.95, 0.8, 0.4))
	for i in 7:
		_tri(img, Vector2(30 + i * 7, g - 38), Vector2(33 + i * 7, g - 46), Vector2(36 + i * 7, g - 38), Color(0.95, 0.6, 0.2))
	_ball(img, 70.0, g - 36.0, 7.0, 9.0, rd)
	_ball(img, 76.0, g - 46.0, 6.0, 8.0, rd)
	_ball(img, 84.0, g - 52.0, 10.0, 7.0, rd.lightened(0.05))
	_ball(img, 94.0, g - 50.0, 8.0, 5.0, rd.lightened(0.1))
	_rect(img, 88.0, g - 46.0, 14.0, 2.0, Color(0.15, 0.05, 0.05))
	_tri(img, Vector2(80, g - 58), Vector2(76, g - 68), Vector2(85, g - 58), Color(0.97, 0.93, 0.8))
	_tri(img, Vector2(88, g - 58), Vector2(90, g - 68), Vector2(94, g - 57), Color(0.97, 0.93, 0.8))
	_px(img, 88, int(g - 54.0), Color(1.0, 0.9, 0.1))
	_px(img, 89, int(g - 54.0), Color(1.0, 0.9, 0.1))
	if f % 2 == 1:
		_ell(img, 106.0, g - 47.0, 5.0, 3.0, Color(1.0, 0.55, 0.1))
		_ell(img, 109.0, g - 47.0, 3.0, 2.0, Color(1.0, 0.9, 0.3))

static func _griffin(img: Image, f: int, g: float) -> void:
	var sw: float = [0.0, 1.0, 0.0, -1.0][f]
	var wy: float = [0.0, -6.0, -12.0, -6.0][f]
	var tan := Color(0.82, 0.6, 0.3)
	_line(img, Vector2(17, g - 22), Vector2(6, g - 30), 2.0, tan.darkened(0.2))
	_ball(img, 5.0, g - 31.0, 3.0, 3.0, Color(0.45, 0.28, 0.15))
	_rect(img, 19.0 - sw, g - 9.0, 3.0, 9.0, tan.darkened(0.2))
	_rect(img, 24.0 + sw, g - 9.0, 3.0, 9.0, tan.darkened(0.2))
	_ell(img, 26.0, g - 31.0 + wy, 12.0, 6.0, Color(0.5, 0.36, 0.22))
	_ell(img, 35.0, g - 33.0 + wy * 0.8, 10.0, 5.0, Color(0.68, 0.52, 0.32))
	_ball(img, 28.0, g - 20.0, 12.0, 8.0, tan)
	_ball(img, 38.0, g - 26.0, 6.0, 7.0, Color(0.95, 0.92, 0.85))
	_rect(img, 33.0 + sw, g - 8.0, 3.0, 8.0, Color(0.95, 0.8, 0.2))
	_rect(img, 37.0 - sw, g - 8.0, 3.0, 8.0, Color(0.95, 0.8, 0.2))
	_ball(img, 43.0, g - 35.0, 5.0, 5.0, Color(0.96, 0.94, 0.88))
	_tri(img, Vector2(46, g - 37), Vector2(53, g - 34), Vector2(46, g - 31), Color(1.0, 0.75, 0.15))
	_px(img, 44, int(g - 37.0), Color(0.05, 0.05, 0.05))

static func _gorebeast(img: Image, f: int, g: float) -> void:
	var sw: float = [0.0, 3.0, 0.0, -3.0][f]
	var dk := Color(0.36, 0.22, 0.26)
	for lx in [20.0, 28.0]:
		_rect(img, float(lx) - sw, g - 12.0, 6.0, 12.0, dk.darkened(0.25))
	for lx in [48.0, 56.0]:
		_rect(img, float(lx) + sw, g - 12.0, 6.0, 12.0, dk.darkened(0.25))
	_line(img, Vector2(14, g - 24), Vector2(6, g - 14), 2.0, dk.darkened(0.2))
	for i in 5:
		_tri(img, Vector2(20 + i * 6, g - 33), Vector2(23 + i * 6, g - 41), Vector2(26 + i * 6, g - 33), Color(0.2, 0.12, 0.15))
	_ball(img, 36.0, g - 22.0, 22.0, 13.0, dk)
	_ball(img, 30.0, g - 34.0, 10.0, 7.0, dk)
	_ball(img, 58.0, g - 22.0, 9.0, 8.0, dk.lightened(0.05))
	_ball(img, 66.0, g - 19.0, 5.0, 4.0, Color(0.7, 0.55, 0.55))
	_tri(img, Vector2(54, g - 28), Vector2(49, g - 42), Vector2(58, g - 29), Color(0.97, 0.93, 0.8))
	_tri(img, Vector2(62, g - 28), Vector2(69, g - 39), Vector2(65, g - 27), Color(0.97, 0.93, 0.8))
	_px(img, 61, int(g - 24.0), Color(1.0, 0.2, 0.1))
	_px(img, 68, int(g - 19.0), Color(0.1, 0.05, 0.05))

static func _wisp(img: Image, f: int, g: float) -> void:
	var wy: float = [0.0, -3.0, -5.0, -2.0][f]
	_ell(img, 30.0, g - 30.0, 17.0, 19.0, Color(1.0, 0.55, 0.1, 0.25))
	_tri(img, Vector2(23, g - 33), Vector2(30, g - 52 + wy), Vector2(37, g - 33), Color(1.0, 0.5, 0.12))
	_tri(img, Vector2(26, g - 33), Vector2(30, g - 46 + wy), Vector2(34, g - 33), Color(1.0, 0.85, 0.3))
	_ball(img, 30.0, g - 28.0, 9.0, 10.0, Color(1.0, 0.55, 0.15))
	_ball(img, 30.0, g - 26.0, 6.0, 6.0, Color(1.0, 0.9, 0.4))
	_px(img, 27, int(g - 28.0), Color(0.15, 0.05, 0.02))
	_px(img, 28, int(g - 28.0), Color(0.15, 0.05, 0.02))
	_px(img, 32, int(g - 28.0), Color(0.15, 0.05, 0.02))
	_px(img, 33, int(g - 28.0), Color(0.15, 0.05, 0.02))
	_rect(img, 29.0, g - 24.0, 3.0, 1.0, Color(0.15, 0.05, 0.02))
	_tri(img, Vector2(26, g - 18), Vector2(23, g - 8), Vector2(30, g - 17), Color(1.0, 0.6, 0.15, 0.8))
	_tri(img, Vector2(31, g - 18), Vector2(35, g - 10), Vector2(35, g - 18), Color(1.0, 0.7, 0.2, 0.7))

static func _hexer(img: Image, f: int, g: float) -> void:
	var sw: float = [0.0, 1.0, 0.0, -1.0][f]
	var pu := Color(0.42, 0.26, 0.62)
	_line(img, Vector2(43, g - 6), Vector2(43, g - 50), 2.0, Color(0.45, 0.3, 0.18))
	_ball(img, 43.0, g - 53.0, 4.0, 4.0, Color(0.7, 1.0, 0.4))
	_tri(img, Vector2(21 + sw, g - 2), Vector2(31, g - 32), Vector2(41 + sw, g - 2), pu.darkened(0.2))
	_ball(img, 31.0, g - 20.0, 10.0, 14.0, pu)
	_rect(img, 20.0 + sw, g - 3.0, 22.0, 3.0, pu.darkened(0.35))
	_line(img, Vector2(36, g - 26), Vector2(42, g - 32), 3.0, pu.lightened(0.1))
	_ball(img, 31.0, g - 38.0, 7.0, 7.0, pu.darkened(0.15))
	_ell(img, 33.0, g - 37.0, 4.0, 4.0, Color(0.05, 0.02, 0.08))
	_px(img, 33, int(g - 38.0), Color(0.8, 1.0, 0.3))
	_px(img, 35, int(g - 38.0), Color(0.8, 1.0, 0.3))

static func _minotaur(img: Image, f: int, g: float) -> void:
	var sw: float = [0.0, 3.0, 0.0, -3.0][f]
	var fur := Color(0.45, 0.32, 0.22)
	_rect(img, 26.0 + sw, g - 16.0, 8.0, 16.0, fur.darkened(0.3))
	_rect(img, 40.0 - sw, g - 16.0, 8.0, 16.0, fur.darkened(0.3))
	_rect(img, 25.0 + sw, g - 3.0, 10.0, 3.0, Color(0.2, 0.15, 0.1))
	_rect(img, 39.0 - sw, g - 3.0, 10.0, 3.0, Color(0.2, 0.15, 0.1))
	_ball(img, 38.0, g - 36.0, 16.0, 18.0, fur)
	_ball(img, 39.0, g - 31.0, 10.0, 9.0, fur.lightened(0.12))
	_rect(img, 28.0, g - 24.0, 22.0, 8.0, Color(0.5, 0.2, 0.15))
	_ball(img, 20.0, g - 40.0, 6.0, 12.0, fur)
	_ball(img, 57.0, g - 40.0, 6.0, 12.0, fur)
	_ball(img, 38.0, g - 63.0, 10.0, 9.0, fur.darkened(0.1))
	_ball(img, 46.0, g - 59.0, 6.0, 5.0, Color(0.78, 0.62, 0.55))
	_px(img, 49, int(g - 58.0), Color(0.95, 0.8, 0.2))
	_tri(img, Vector2(30, g - 68), Vector2(21, g - 84), Vector2(35, g - 68), Color(0.97, 0.93, 0.8))
	_tri(img, Vector2(46, g - 68), Vector2(57, g - 82), Vector2(42, g - 68), Color(0.97, 0.93, 0.8))
	_px(img, 41, int(g - 65.0), Color(1.0, 0.2, 0.1))
	_px(img, 45, int(g - 65.0), Color(1.0, 0.2, 0.1))

static func _torchling(img: Image, f: int, g: float) -> void:
	var sw: float = [0.0, 2.0, 0.0, -2.0][f]
	var rd := Color(0.82, 0.36, 0.26)
	_rect(img, 27.0 + sw, g - 12.0, 4.0, 12.0, rd.darkened(0.3))
	_rect(img, 34.0 - sw, g - 12.0, 4.0, 12.0, rd.darkened(0.3))
	_ball(img, 32.0, g - 21.0, 7.0, 9.0, Color(0.35, 0.25, 0.2))
	_line(img, Vector2(36, g - 24), Vector2(44, g - 32), 2.0, Color(0.45, 0.3, 0.18))
	_ball(img, 45.0, g - 36.0, 4.0, 5.0, Color(1.0, 0.5, 0.1))
	_ball(img, 45.0, g - 35.0, 2.0, 3.0, Color(1.0, 0.9, 0.3))
	_ball(img, 33.0, g - 34.0, 7.0, 6.0, rd)
	_tri(img, Vector2(27, g - 35), Vector2(18, g - 39), Vector2(28, g - 31), rd)
	_tri(img, Vector2(39, g - 35), Vector2(46, g - 40), Vector2(38, g - 31), rd)
	_px(img, 35, int(g - 35.0), Color(1.0, 0.95, 0.2))
	_px(img, 31, int(g - 35.0), Color(1.0, 0.95, 0.2))

static func _skeleton(img: Image, f: int, g: float) -> void:
	var sw: float = [0.0, 2.0, 0.0, -2.0][f]
	var bone := Color(0.92, 0.9, 0.8)
	_rect(img, 28.0 + sw, g - 14.0, 3.0, 14.0, bone.darkened(0.15))
	_rect(img, 35.0 - sw, g - 14.0, 3.0, 14.0, bone.darkened(0.15))
	_ball(img, 32.0, g - 24.0, 7.0, 9.0, bone)
	for i in 3:
		_rect(img, 27.0, g - 28.0 + float(i) * 4.0, 11.0, 1.0, Color(0.35, 0.3, 0.25))
	_line(img, Vector2(37, g - 26), Vector2(45, g - 30), 2.0, bone.darkened(0.1))
	_line(img, Vector2(45, g - 30), Vector2(52, g - 45), 2.0, Color(0.62, 0.52, 0.45))
	_ball(img, 33.0, g - 38.0, 7.0, 7.0, bone)
	_ell(img, 31.0, g - 38.0, 2.0, 2.0, Color(0.1, 0.05, 0.05))
	_ell(img, 36.0, g - 38.0, 2.0, 2.0, Color(0.1, 0.05, 0.05))
	_rect(img, 30.0, g - 33.0, 7.0, 2.0, bone.darkened(0.2))

static func _kobold(img: Image, f: int, g: float) -> void:
	var sw: float = [0.0, 2.0, 0.0, -2.0][f]
	var tl := Color(0.35, 0.6, 0.55)
	_line(img, Vector2(23, g - 10), Vector2(10, g - 5), 3.0, tl.darkened(0.15))
	_rect(img, 27.0 + sw, g - 8.0, 3.0, 8.0, tl.darkened(0.3))
	_rect(img, 33.0 - sw, g - 8.0, 3.0, 8.0, tl.darkened(0.3))
	_ball(img, 26.0, g - 22.0, 7.0, 8.0, Color(0.6, 0.45, 0.25))
	_px(img, 26, int(g - 30.0), Color(0.3, 0.2, 0.1))
	_ball(img, 31.0, g - 15.0, 7.0, 8.0, tl)
	_ball(img, 37.0, g - 26.0, 6.0, 5.0, tl)
	_ball(img, 43.0, g - 24.0, 4.0, 3.0, tl.lightened(0.1))
	_tri(img, Vector2(34, g - 30), Vector2(31, g - 37), Vector2(37, g - 30), tl.darkened(0.1))
	_px(img, 39, int(g - 27.0), Color(1.0, 0.9, 0.2))

static func _frostling(img: Image, f: int, g: float) -> void:
	var wy: float = [0.0, -2.0, -3.0, -1.0][f]
	var ice := Color(0.6, 0.85, 1.0)
	_tri(img, Vector2(24, g - 16), Vector2(22, g - 2 + wy), Vector2(29, g - 14), Color(0.6, 0.85, 1.0, 0.7))
	_tri(img, Vector2(30, g - 14), Vector2(31, g - 1 + wy), Vector2(36, g - 14), Color(0.6, 0.85, 1.0, 0.7))
	_tri(img, Vector2(35, g - 16), Vector2(40, g - 3 + wy), Vector2(39, g - 17), Color(0.6, 0.85, 1.0, 0.7))
	_ball(img, 31.0, g - 26.0 + wy, 10.0, 13.0, ice)
	_line(img, Vector2(31, g - 32 + wy), Vector2(31, g - 20 + wy), 1.0, Color(1, 1, 1))
	_line(img, Vector2(25, g - 26 + wy), Vector2(37, g - 26 + wy), 1.0, Color(1, 1, 1))
	_ball(img, 31.0, g - 42.0 + wy, 7.0, 7.0, Color(0.8, 0.95, 1.0))
	_tri(img, Vector2(25, g - 46 + wy), Vector2(22, g - 58 + wy), Vector2(29, g - 48 + wy), Color(0.85, 0.97, 1.0))
	_tri(img, Vector2(31, g - 48 + wy), Vector2(31, g - 60 + wy), Vector2(34, g - 48 + wy), Color(0.85, 0.97, 1.0))
	_tri(img, Vector2(36, g - 47 + wy), Vector2(41, g - 57 + wy), Vector2(38, g - 45 + wy), Color(0.85, 0.97, 1.0))
	_px(img, 29, int(g - 42.0 + wy), Color(0.1, 0.2, 0.45))
	_px(img, 34, int(g - 42.0 + wy), Color(0.1, 0.2, 0.45))

static func _bat(img: Image, f: int, g: float) -> void:
	var wy: float = [0.0, -6.0, -10.0, -5.0][f]
	var pu := Color(0.32, 0.22, 0.4)
	_ell(img, 20.0, g - 32.0 + wy, 11.0, 4.0, pu.darkened(0.2))
	_ell(img, 42.0, g - 32.0 + wy, 11.0, 4.0, pu.darkened(0.2))
	_tri(img, Vector2(12, g - 30 + wy), Vector2(8, g - 22 + wy), Vector2(18, g - 28 + wy), pu)
	_tri(img, Vector2(50, g - 30 + wy), Vector2(54, g - 22 + wy), Vector2(44, g - 28 + wy), pu)
	_ball(img, 31.0, g - 28.0, 5.0, 6.0, pu.lightened(0.1))
	_tri(img, Vector2(28, g - 33), Vector2(27, g - 39), Vector2(31, g - 33), pu)
	_tri(img, Vector2(32, g - 33), Vector2(35, g - 39), Vector2(34, g - 32), pu)
	_px(img, 29, int(g - 28.0), Color(1.0, 0.2, 0.2))
	_px(img, 33, int(g - 28.0), Color(1.0, 0.2, 0.2))
	_px(img, 30, int(g - 24.0), Color(1, 1, 1))
	_px(img, 32, int(g - 24.0), Color(1, 1, 1))

static func _slime(img: Image, f: int, g: float) -> void:
	var ry: float = [12.0, 10.0, 13.0, 11.0][f]
	var gr := Color(0.4, 0.8, 0.35)
	_ball(img, 31.0, g - ry + 1.0, 17.0, ry, gr)
	_ell(img, 24.0, g - ry - 2.0, 5.0, 3.0, gr.lightened(0.45))
	_ell(img, 26.0, g - 14.0, 3.0, 3.0, Color(1, 1, 1))
	_ell(img, 37.0, g - 14.0, 3.0, 3.0, Color(1, 1, 1))
	_px(img, 27, int(g - 14.0), Color(0.05, 0.1, 0.05))
	_px(img, 38, int(g - 14.0), Color(0.05, 0.1, 0.05))
	_rect(img, 29.0, g - 8.0, 6.0, 2.0, Color(0.15, 0.35, 0.12))

static func _knight(img: Image, f: int, g: float) -> void:
	var sw: float = [0.0, 2.0, 0.0, -2.0][f]
	var st := Color(0.64, 0.68, 0.74)
	_rect(img, 27.0 + sw, g - 14.0, 5.0, 14.0, st.darkened(0.3))
	_rect(img, 34.0 - sw, g - 14.0, 5.0, 14.0, st.darkened(0.3))
	_ball(img, 32.0, g - 28.0, 10.0, 13.0, st)
	_ball(img, 22.0, g - 28.0, 6.0, 11.0, Color(0.72, 0.2, 0.2))
	_rect(img, 21.0, g - 36.0, 2.0, 16.0, Color(0.95, 0.85, 0.5))
	_rect(img, 17.0, g - 29.0, 10.0, 2.0, Color(0.95, 0.85, 0.5))
	_line(img, Vector2(38, g - 30), Vector2(46, g - 26), 3.0, st)
	_line(img, Vector2(46, g - 26), Vector2(51, g - 46), 2.0, Color(0.9, 0.92, 0.95))
	_ball(img, 33.0, g - 46.0, 7.0, 7.0, st.lightened(0.05))
	_rect(img, 30.0, g - 47.0, 8.0, 2.0, Color(0.08, 0.08, 0.1))
	_tri(img, Vector2(33, g - 52), Vector2(27, g - 60), Vector2(38, g - 52), Color(0.8, 0.15, 0.15))

static func _mole(img: Image, f: int, g: float) -> void:
	var sw: float = [0.0, 2.0, 0.0, -2.0][f]
	var br := Color(0.45, 0.33, 0.28)
	_ell(img, 30.0, g - 3.0, 22.0, 5.0, Color(0.5, 0.36, 0.2))
	_ball(img, 29.0, g - 15.0, 13.0, 10.0, br)
	_ball(img, 39.0, g - 17.0, 6.0, 5.0, br.lightened(0.05))
	_ball(img, 45.0, g - 16.0, 4.0, 3.0, Color(0.95, 0.6, 0.65))
	_tri(img, Vector2(36 + sw, g - 8), Vector2(48 + sw, g - 3), Vector2(36 + sw, g - 3), Color(0.9, 0.78, 0.65))
	_tri(img, Vector2(30 - sw, g - 8), Vector2(42 - sw, g - 3), Vector2(30 - sw, g - 3), Color(0.9, 0.78, 0.65))
	_px(img, 41, int(g - 19.0), Color(0.05, 0.05, 0.05))

static func _necromancer(img: Image, f: int, g: float) -> void:
	var sw: float = [0.0, 1.0, 0.0, -1.0][f]
	var dk := Color(0.2, 0.22, 0.26)
	_line(img, Vector2(45, g - 4), Vector2(45, g - 48), 2.0, Color(0.4, 0.3, 0.2))
	_ball(img, 45.0, g - 52.0, 5.0, 5.0, Color(0.92, 0.9, 0.8))
	_px(img, 43, int(g - 52.0), Color(0.3, 1.0, 0.4))
	_px(img, 47, int(g - 52.0), Color(0.3, 1.0, 0.4))
	_tri(img, Vector2(22 + sw, g - 2), Vector2(32, g - 38), Vector2(42 + sw, g - 2), dk.darkened(0.2))
	_ball(img, 32.0, g - 22.0, 10.0, 15.0, dk)
	_rect(img, 22.0 + sw, g - 3.0, 20.0, 3.0, Color(0.3, 0.5, 0.35))
	_line(img, Vector2(37, g - 28), Vector2(44, g - 34), 3.0, dk.lightened(0.1))
	_ball(img, 32.0, g - 42.0, 7.0, 7.0, dk.darkened(0.1))
	_ell(img, 34.0, g - 41.0, 4.0, 4.0, Color(0.02, 0.05, 0.03))
	_px(img, 33, int(g - 42.0), Color(0.3, 1.0, 0.4))
	_px(img, 36, int(g - 42.0), Color(0.3, 1.0, 0.4))

static func _shaman(img: Image, f: int, g: float) -> void:
	var sw: float = [0.0, 2.0, 0.0, -2.0][f]
	_rect(img, 27.0 + sw, g - 12.0, 4.0, 12.0, Color(0.45, 0.3, 0.2))
	_rect(img, 34.0 - sw, g - 12.0, 4.0, 12.0, Color(0.45, 0.3, 0.2))
	_line(img, Vector2(43, g - 6), Vector2(43, g - 48), 2.0, Color(0.45, 0.3, 0.18))
	_ball(img, 43.0, g - 51.0, 4.0, 4.0, Color(0.4, 0.95, 0.5))
	_tri(img, Vector2(41, g - 44), Vector2(36, g - 40), Vector2(41, g - 38), Color(0.9, 0.3, 0.25))
	_ball(img, 31.0, g - 22.0, 9.0, 13.0, Color(0.55, 0.38, 0.22))
	_rect(img, 25.0, g - 26.0, 12.0, 2.0, Color(0.85, 0.2, 0.2))
	_rect(img, 25.0, g - 20.0, 12.0, 2.0, Color(0.85, 0.2, 0.2))
	_ball(img, 31.0, g - 40.0, 7.0, 8.0, Color(0.88, 0.78, 0.55))
	_px(img, 29, int(g - 41.0), Color(0.1, 0.05, 0.05))
	_px(img, 34, int(g - 41.0), Color(0.1, 0.05, 0.05))
	_tri(img, Vector2(26, g - 46), Vector2(22, g - 58), Vector2(30, g - 47), Color(0.9, 0.25, 0.2))
	_tri(img, Vector2(30, g - 47), Vector2(31, g - 60), Vector2(34, g - 47), Color(0.95, 0.8, 0.2))
	_tri(img, Vector2(34, g - 46), Vector2(40, g - 57), Vector2(37, g - 45), Color(0.3, 0.8, 0.4))

static func _banshee(img: Image, f: int, g: float) -> void:
	var wy: float = [0.0, -2.0, -3.0, -1.0][f]
	var wh := Color(0.88, 0.92, 1.0)
	_ell(img, 22.0, g - 34.0 + wy, 9.0, 16.0, Color(0.2, 0.25, 0.5))
	_tri(img, Vector2(21, g - 2 + wy), Vector2(32, g - 38 + wy), Vector2(43, g - 2 + wy), Color(0.88, 0.92, 1.0, 0.85))
	_tri(img, Vector2(26, g - 1 + wy), Vector2(32, g - 30 + wy), Vector2(38, g - 1 + wy), Color(1.0, 1.0, 1.0, 0.5))
	_line(img, Vector2(27, g - 30 + wy), Vector2(18, g - 42 + wy), 2.0, wh)
	_line(img, Vector2(38, g - 30 + wy), Vector2(47, g - 42 + wy), 2.0, wh)
	_ball(img, 32.0, g - 42.0 + wy, 6.0, 6.0, Color(0.95, 0.97, 1.0))
	_ell(img, 32.0, g - 39.0 + wy, 2.0, 3.0, Color(0.05, 0.05, 0.1))
	_ell(img, 29.0, g - 44.0 + wy, 1.5, 2.0, Color(0.05, 0.05, 0.1))
	_ell(img, 35.0, g - 44.0 + wy, 1.5, 2.0, Color(0.05, 0.05, 0.1))

static func _cutpurse(img: Image, f: int, g: float) -> void:
	var sw: float = [0.0, 2.0, 0.0, -2.0][f]
	var dk := Color(0.3, 0.25, 0.36)
	_rect(img, 28.0 + sw, g - 12.0, 4.0, 12.0, dk.darkened(0.3))
	_rect(img, 34.0 - sw, g - 12.0, 4.0, 12.0, dk.darkened(0.3))
	_ball(img, 24.0, g - 26.0, 6.0, 7.0, Color(0.6, 0.5, 0.3))
	_px(img, 24, int(g - 26.0), Color(1.0, 0.85, 0.2))
	_px(img, 25, int(g - 25.0), Color(1.0, 0.85, 0.2))
	_ball(img, 32.0, g - 22.0, 8.0, 12.0, dk)
	_line(img, Vector2(38, g - 24), Vector2(46, g - 28), 2.0, dk.lightened(0.1))
	_line(img, Vector2(46, g - 28), Vector2(52, g - 32), 1.0, Color(0.85, 0.88, 0.92))
	_ball(img, 33.0, g - 38.0, 7.0, 7.0, dk.darkened(0.15))
	_ell(img, 35.0, g - 37.0, 3.0, 3.0, Color(0.05, 0.03, 0.08))
	_px(img, 35, int(g - 38.0), Color(1.0, 0.9, 0.2))

# ---------------------------------------------------------------- building the frames
static func _draw_one(n: String, f: int) -> Image:
	var sz: Vector2i = canvas(n)
	var img := Image.create(sz.x, sz.y, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	var g: float = float(sz.y) - 6.0
	match n:
		"chicken": _chicken(img, f, g)
		"alpaca": _alpaca(img, f, g)
		"yak": _yak(img, f, g)
		"boar": _boar(img, f, g)
		"unicorn": _unicorn(img, f, g)
		"dragon": _dragon(img, f, g)
		"phoenix": _phoenix(img, f, g)
		"goblin": _goblin(img, f, g)
		"gargoyle": _gargoyle(img, f, g)
		"harpy": _harpy(img, f, g)
		"ogre": _ogre(img, f, g)
		"drake": _drake(img, f, g)
		"griffin": _griffin(img, f, g)
		"gorebeast": _gorebeast(img, f, g)
		"wisp": _wisp(img, f, g)
		"hexer": _hexer(img, f, g)
		"minotaur": _minotaur(img, f, g)
		"torchling": _torchling(img, f, g)
		"skeleton": _skeleton(img, f, g)
		"kobold": _kobold(img, f, g)
		"frostling": _frostling(img, f, g)
		"bat": _bat(img, f, g)
		"slime": _slime(img, f, g)
		"knight": _knight(img, f, g)
		"mole": _mole(img, f, g)
		"necromancer": _necromancer(img, f, g)
		"shaman": _shaman(img, f, g)
		"banshee": _banshee(img, f, g)
		"cutpurse": _cutpurse(img, f, g)
	_outline(img)
	return img

static func _bounds(img: Image) -> Dictionary:
	var x0: int = img.get_width()
	var x1: int = 0
	var y0: int = img.get_height()
	var y1: int = 0
	for y in img.get_height():
		for x in img.get_width():
			if img.get_pixel(x, y).a > 0.1:
				x0 = mini(x0, x)
				x1 = maxi(x1, x + 1)
				y0 = mini(y0, y)
				y1 = maxi(y1, y + 1)
	return {"x0": x0, "x1": x1, "y0": y0, "y1": y1, "ch": img.get_height()}

static func frames(n: String) -> SpriteFrames:
	if _cache.has(n):
		return _cache[n]
	var east: Array = []
	var west: Array = []
	for f in 4:
		var im: Image = _draw_one(n, f)
		east.append(ImageTexture.create_from_image(im))
		var fl: Image = im.duplicate()
		fl.flip_x()
		west.append(ImageTexture.create_from_image(fl))
	var flier: bool = FLYERS.has(n)
	var sf := SpriteFrames.new()
	sf.remove_animation("default")
	var dirs: Array = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"]
	for clip in ["walk", "idle"]:
		for d in dirs:
			var an: String = String(clip) + "_" + String(d)
			sf.add_animation(an)
			var going_west: bool = String(d).contains("west")
			var set_tex: Array = west if going_west else east
			sf.set_animation_loop(an, true)
			if clip == "walk":
				sf.set_animation_speed(an, 9.0)
				for f in 4:
					sf.add_frame(an, set_tex[f])
			else:
				sf.set_animation_speed(an, 4.0 if flier else 1.0)
				if flier:
					for f in 4:
						sf.add_frame(an, set_tex[f])
				else:
					sf.add_frame(an, set_tex[0])
	# remember the silhouette so the game can size it like the drawn art
	U.register_size(n, _bounds(_draw_one(n, 0)))
	_cache[n] = sf
	return sf
