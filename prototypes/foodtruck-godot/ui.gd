class_name UI
extends RefCounted
# Pixel Lab UI skin for Godot: 9-slice panels and buttons, icons, and small helpers that build Control nodes.

static var _tex := {}
static var _sb := {}

static func tex(n: String) -> Texture2D:
	if not _tex.has(n):
		_tex[n] = load("res://art/ui/%s.png" % n)
	return _tex[n]

static func has_icon(n: String) -> bool:
	return ResourceLoader.exists("res://art/ui/%s.png" % n)

static func box(n: String, margin: int) -> StyleBoxTexture:
	var key := "%s%d" % [n, margin]
	if not _sb.has(key):
		var s := StyleBoxTexture.new()
		s.texture = tex(n)
		s.texture_margin_left = margin
		s.texture_margin_right = margin
		s.texture_margin_top = margin
		s.texture_margin_bottom = margin
		s.axis_stretch_horizontal = StyleBoxTexture.AXIS_STRETCH_MODE_STRETCH
		s.axis_stretch_vertical = StyleBoxTexture.AXIS_STRETCH_MODE_STRETCH
		_sb[key] = s
	return _sb[key]

static func rim(col: Color, w: int = 2) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = Color(0, 0, 0, 0)
	s.border_color = col
	s.set_border_width_all(w)
	s.set_corner_radius_all(6)
	return s

static func panel(parent: Node, r: Rect2, accent: String = "", dim: bool = false) -> Panel:
	var p := Panel.new()
	p.position = r.position
	p.size = r.size
	p.add_theme_stylebox_override("panel", box("panel", 12))
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(p)
	if accent != "":
		var a := Panel.new()
		a.set_anchors_preset(Control.PRESET_FULL_RECT)
		a.add_theme_stylebox_override("panel", rim(Color(accent), 2))
		a.mouse_filter = Control.MOUSE_FILTER_IGNORE
		p.add_child(a)
	if dim:
		var d := ColorRect.new()
		d.set_anchors_preset(Control.PRESET_FULL_RECT)
		d.color = Color(0.08, 0.05, 0.1, 0.5)
		d.mouse_filter = Control.MOUSE_FILTER_IGNORE
		p.add_child(d)
	return p

static func button(parent: Node, r: Rect2, text: String, cb: Callable, main: bool = false, size: int = 9, disabled: bool = false) -> Button:
	var b := Button.new()
	b.position = r.position
	b.size = r.size
	b.text = text
	b.focus_mode = Control.FOCUS_NONE
	b.disabled = disabled
	var nm := "btn_dis" if disabled else ("btn_main" if main else "btn")
	b.add_theme_stylebox_override("normal", box(nm, 6))
	b.add_theme_stylebox_override("hover", box(nm, 6))
	b.add_theme_stylebox_override("pressed", box(nm, 6))
	b.add_theme_stylebox_override("disabled", box("btn_dis", 6))
	b.add_theme_font_size_override("font_size", size)
	var tc := Color("#2a1408") if main else Color("#ffe9c0")
	if disabled:
		tc = Color("#6a6070")
	for k in ["font_color", "font_hover_color", "font_pressed_color", "font_disabled_color"]:
		b.add_theme_color_override(k, tc)
	if not disabled:
		b.pressed.connect(cb)
	parent.add_child(b)
	return b

static func label(parent: Node, pos: Vector2, text: String, size: int = 8, col: String = "#f4e8d0", align: int = 0, width: float = 0.0) -> Label:
	var lines: Array = [text]
	if width > 0.0:
		lines = wrap_words(text, int(width / (size * 0.66))).split("\n")
	var first: Label = null
	for i in lines.size():
		var l := Label.new()
		l.text = lines[i]
		l.add_theme_font_size_override("font_size", size)
		l.add_theme_color_override("font_color", Color(col))
		l.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var lx := 0.0
		if width > 0.0:
			var tw := ThemeDB.fallback_font.get_string_size(lines[i], HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
			lx = (width - tw) / 2.0 if align == 1 else ((width - tw) if align == 2 else 0.0)
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		l.position = pos + Vector2(lx, i * size * 1.3)
		parent.add_child(l)
		if first == null:
			first = l
	return first

static func wrap_words(s: String, n: int) -> String:
	var lines: Array = []
	var cur := ""
	for w in s.split(" "):
		if (cur + " " + w).strip_edges().length() > n and cur != "":
			lines.append(cur)
			cur = w
		else:
			cur = (cur + " " + w).strip_edges()
	if cur != "":
		lines.append(cur)
	return "
".join(lines)

static func icon(parent: Node, n: String, center: Vector2, size: float, alpha: float = 1.0) -> TextureRect:
	var t := TextureRect.new()
	t.texture = tex(n)
	t.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	t.stretch_mode = TextureRect.STRETCH_SCALE
	t.custom_minimum_size = Vector2(size, size)
	t.size = Vector2(size, size)
	t.position = center - Vector2(size, size) / 2.0
	t.modulate.a = alpha
	t.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(t)
	return t

static func clear(n: Node) -> void:
	for c in n.get_children():
		c.queue_free()

static func stars(parent: Node, pos: Vector2, n: int, size: float, tint: Color = Color.WHITE, off_alpha: float = 0.25) -> Array:
	var out: Array = []
	for i in 5:
		var t := icon(parent, "i_star", pos + Vector2(i * (size + 1.0) + size / 2.0, size / 2.0), size)
		t.modulate = Color(tint.r, tint.g, tint.b, 1.0 if i < n else off_alpha)
		out.append(t)
	return out

static func set_stars(arr: Array, n: int, tint: Color = Color.WHITE, off_alpha: float = 0.25) -> void:
	for i in arr.size():
		arr[i].modulate = Color(tint.r, tint.g, tint.b, 1.0 if i < n else off_alpha)
