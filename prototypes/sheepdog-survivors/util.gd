class_name U
extends RefCounted
# small helpers shared by the scripts

static func frames(tex: Texture2D, cell: int, names: Array, nframes: int = 9, fps: float = 10.0) -> SpriteFrames:
	var sf := SpriteFrames.new()
	sf.remove_animation("default")
	for r in names.size():
		var a: String = "walk_" + String(names[r])
		sf.add_animation(a)
		sf.set_animation_speed(a, fps)
		sf.set_animation_loop(a, true)
		for i in range(1, nframes):
			sf.add_frame(a, _at(tex, i * cell, r * cell, cell))
		var ia: String = "idle_" + String(names[r])
		sf.add_animation(ia)
		sf.set_animation_speed(ia, 1.0)
		sf.set_animation_loop(ia, true)
		sf.add_frame(ia, _at(tex, 0, r * cell, cell))
	return sf

static func _at(tex: Texture2D, x: int, y: int, cell: int) -> AtlasTexture:
	var at := AtlasTexture.new()
	at.atlas = tex
	at.region = Rect2(x, y, cell, cell)
	return at

static func shadow_texture() -> Texture2D:
	var g := Gradient.new()
	g.set_color(0, Color(0, 0, 0, 0.42))
	g.set_color(1, Color(0, 0, 0, 0.0))
	var gt := GradientTexture2D.new()
	gt.gradient = g
	gt.fill = GradientTexture2D.FILL_RADIAL
	gt.fill_from = Vector2(0.5, 0.5)
	gt.fill_to = Vector2(1.0, 0.5)
	gt.width = 64
	gt.height = 64
	return gt

static func row_for(v: Vector2, has5: bool) -> String:
	# which of the sheet rows to show for a velocity: east / north / south / south-east / north-east
	if absf(v.y) > absf(v.x) * 1.4:
		if has5:
			return "north-east" if v.y < 0.0 else "south-east"
		return "north" if v.y < 0.0 else "south"
	return "east"

static func raven_frames() -> SpriteFrames:
	# the Raven Astrologer: 8 directions of idle, walk and cast, one PNG per frame
	var sf := SpriteFrames.new()
	sf.remove_animation("default")
	var dirs: Array = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"]
	var clips: Dictionary = {"idle": [6.0, true], "walk": [12.0, true], "cast": [16.0, false]}
	for clip in clips.keys():
		for d in dirs:
			var an: String = String(clip) + "_" + String(d)
			sf.add_animation(an)
			sf.set_animation_speed(an, float((clips[clip] as Array)[0]))
			sf.set_animation_loop(an, bool((clips[clip] as Array)[1]))
			var i: int = 0
			while ResourceLoader.exists("res://art/wiz/%s/%s/%d.png" % [clip, d, i]):
				sf.add_frame(an, load("res://art/wiz/%s/%s/%d.png" % [clip, d, i]) as Texture2D)
				i += 1
	return sf

static func dir8(h: Vector2) -> String:
	var dirs: Array = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"]
	var idx: int = int(round(h.angle() / (PI / 4.0)))
	return String(dirs[posmod(idx, 8)])

static func sheep8_frames() -> SpriteFrames:
	var sf := SpriteFrames.new()
	sf.remove_animation("default")
	var dirs: Array = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"]
	for clip in ["walk", "idle"]:
		for d in dirs:
			var an: String = String(clip) + "_" + String(d)
			sf.add_animation(an)
			sf.set_animation_speed(an, 12.0 if clip == "walk" else 1.0)
			sf.set_animation_loop(an, true)
			var i: int = 0
			while ResourceLoader.exists("res://art/sheep8/%s/%s/%d.png" % [clip, d, i]):
				sf.add_frame(an, load("res://art/sheep8/%s/%s/%d.png" % [clip, d, i]) as Texture2D)
				i += 1
	return sf
