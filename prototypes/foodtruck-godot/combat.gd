class_name Combat
extends Node2D
# Everything that happens on the road while you drive: heat and the Food Police, the hangry traffic swarm, rival trucks,
# your auto-firing dishes, loot, drive-by customers, tip streaks, and the road fun (crates, stalls, ramps, boost pads).
# Ported from the canvas version; enemies are Vehicle bodies so they crash into you for real.

const SPEEDK := 1.55
const MINT := {
	"sedan": {"hp": 16.0, "spd": 90.0, "dmg": 2.4, "r": 13.0, "xp": 0.5, "cash": 0.7},
	"scooter": {"hp": 9.0, "spd": 132.0, "dmg": 1.5, "r": 9.0, "xp": 0.35, "cash": 0.5},
	"van": {"hp": 50.0, "spd": 64.0, "dmg": 3.8, "r": 15.0, "xp": 1.1, "cash": 1.6, "big": true},
	"bus": {"hp": 130.0, "spd": 50.0, "dmg": 6.0, "r": 22.0, "xp": 2.4, "cash": 4.0, "big": true},
	"charger": {"hp": 30.0, "spd": 74.0, "dmg": 4.0, "r": 14.0, "xp": 1.2, "cash": 2.0, "dash": true},
	"armored": {"hp": 110.0, "spd": 46.0, "dmg": 5.5, "r": 15.0, "xp": 2.0, "cash": 3.5, "big": true, "arm": 0.5},
}
const RIVALS := [
	{"n": "Taco Tyrant", "col": "#e8402a", "fl": "spicy", "hp": 70.0, "spd": 74.0, "cd": 1.5, "sp": 3, "dmg": 4.0, "model": "truck", "tint": Color(1.25, 0.7, 0.65)},
	{"n": "Burger Baron", "col": "#e0a040", "fl": "", "hp": 115.0, "spd": 62.0, "cd": 2.1, "sp": 1, "dmg": 8.0, "model": "burgertruck", "tint": Color.WHITE},
	{"n": "Frosty Freddie", "col": "#6ab8f0", "fl": "frozen", "hp": 62.0, "spd": 84.0, "cd": 1.7, "sp": 2, "dmg": 4.0, "model": "icevan", "tint": Color.WHITE},
	{"n": "Sour Sue", "col": "#a8d848", "fl": "sour", "hp": 78.0, "spd": 70.0, "cd": 1.8, "sp": 2, "dmg": 5.0, "model": "truck", "tint": Color(0.75, 1.2, 0.7)},
	{"n": "Pizza Pete", "col": "#d05a3a", "fl": "", "hp": 88.0, "spd": 68.0, "cd": 1.3, "sp": 3, "dmg": 3.0, "model": "pizzatruck", "tint": Color.WHITE},
	{"n": "Dessert Dolly", "col": "#f090c8", "fl": "sour", "hp": 55.0, "spd": 92.0, "cd": 1.4, "sp": 2, "dmg": 4.0, "model": "icevan", "tint": Color(1.25, 0.85, 1.1)},
]
const PEDN := ["suit", "jogger", "shopper", "skater", "oldman", "tourist", "kid", "student"]

signal busted
signal wrecked

var m: Node
var rng := RandomNumberGenerator.new()
var age := 0.0
var grace := 4.0
var cops: Array = []
var rivals: Array = []
var mins: Array = []
var shots: Array = []
var rshots: Array = []
var loot: Array = []
var fans: Array = []
var crates: Array = []
var stalls: Array = []
var pads: Array = []
var bust := 0.0
var far_t := 0.0
var min_t := 2.0
var wave_t := 38.0
var rival_t := 6.0
var fan_t := 2.0
var dish_t: Array = []
var streak := 0
var streak_t := 0.0
var coin_acc := 0.0
var coin_txt_t := 0.0
var air_t := 0.0
var warned := false
var cop_warned := false
var clock := 0.0
var logging := false
var last_log := -1

func setup(main: Node) -> void:
	m = main
	logging = m._arg("log") == "1"
	rng.seed = 777
	z_index = 20
	_make_fun()

func rnd(a: float, b: float) -> float:
	return rng.randf_range(a, b)

func pick(a: Array) -> Variant:
	return a[rng.randi() % a.size()]

func mult() -> float:
	return 1.0 + minf(8.0, floor(streak / 3.0)) * 0.25

func bump(n: int) -> void:
	streak += n
	streak_t = 4.5

func all_enemies() -> Array:
	return cops + rivals + mins

func clear_enemies() -> void:
	for e in all_enemies():
		e.queue_free()
	cops = []; rivals = []; mins = []; shots = []; rshots = []; bust = 0.0; far_t = 0.0

func resume() -> void:
	grace = 7.0
	rival_t = maxf(rival_t, 8.0)
	air_t = 0.0
	m.player.lift = 0.0
	m.player.air(false)

# ---------- helpers ----------
func road_spot(dmin: float, dmax: float) -> Variant:
	var p: Vector2 = m.player.position
	for i in 40:
		var s: Dictionary = m.city.random_lane_spot(rng)
		var d: float = s["pos"].distance_to(p)
		if d > dmin and d < dmax:
			return s
	return null

func ftext(pos: Vector2, s: String, col: Color) -> void:
	var lab := Label.new()
	lab.text = s
	lab.position = pos + Vector2(-30, -26)
	lab.add_theme_font_size_override("font_size", 8)
	lab.add_theme_color_override("font_color", col)
	lab.add_theme_color_override("font_outline_color", Color.BLACK)
	lab.add_theme_constant_override("outline_size", 3)
	lab.z_index = 100
	add_child(lab)
	var tw := create_tween()
	tw.tween_property(lab, "position:y", lab.position.y - 22.0, 0.8)
	tw.parallel().tween_property(lab, "modulate:a", 0.0, 0.8)
	tw.tween_callback(lab.queue_free)

func burst(pos: Vector2, col: Color, n: int = 10, spd: float = 90.0) -> void:
	var p := CPUParticles2D.new()
	p.position = pos
	p.one_shot = true
	p.explosiveness = 1.0
	p.amount = n
	p.lifetime = 0.5
	p.spread = 180.0
	p.direction = Vector2.ZERO
	p.initial_velocity_min = spd * 0.4
	p.initial_velocity_max = spd
	p.gravity = Vector2.ZERO
	p.scale_amount_min = 2.0
	p.scale_amount_max = 3.5
	p.color = col
	add_child(p)
	p.emitting = true
	get_tree().create_timer(0.9).timeout.connect(p.queue_free)

func make_enemy(prefix: String, r: float, mass: float, hp: float, tint: Color) -> Vehicle:
	var v := Vehicle.new()
	v.setup(prefix, r, mass, r * 0.9)
	v.hp = hp
	v.hp_max = hp
	v.tint = tint
	v.accel = 300.0
	m.world.add_child(v)
	return v

# ---------- the main loop ----------
func _physics_process(dt: float) -> void:
	clock += dt
	if m.mode != 0:
		return
	age += dt
	if logging and int(age) % 5 == 0 and int(age) != last_log:
		last_log = int(age)
		print("t=", last_log, " cops=", cops.size(), " mins=", mins.size(), " rivals=", rivals.size(), " hp=", int(Run.hp), " cash=", int(Run.cash), " xp=", snappedf(Run.xp, 0.1), " heat=", int(Run.insp), " bust=", snappedf(bust, 0.1), " loot=", loot.size(), " fans=", fans.size(), " streak=", streak)
	grace = maxf(0.0, grace - dt)
	var p: Vehicle = m.player
	p.tick_fx(dt)
	if p.fx["burn"] > 0.0:
		Run.hp -= 2.2 * dt
	_heat(dt)
	_update_cops(dt)
	_update_mins(dt)
	_update_rivals(dt)
	_autofire(dt)
	_update_shots(dt)
	_update_rshots(dt)
	_ram(dt)
	_reap()
	_update_loot(dt)
	_update_fans(dt)
	_update_fun(dt)
	streak_t = maxf(0.0, streak_t - dt)
	if streak_t <= 0.0 and streak > 0:
		if streak >= 6:
			ftext(p.position, "STREAK LOST", Color("#b8a0a0"))
		streak = 0
	if coin_acc > 0.0 and clock - coin_txt_t > 0.5:
		ftext(p.position, "+$%s" % (str(int(coin_acc)) if coin_acc >= 10.0 else "%.1f" % coin_acc), Color("#ffd24a"))
		coin_acc = 0.0
		coin_txt_t = clock
	if Run.hp <= 0.0:
		Run.hp = 0.0
		wrecked.emit()
	queue_redraw()

func _heat(dt: float) -> void:
	var sp: float = m.player.linear_velocity.length()
	if cops.is_empty():
		if sp < 40.0:
			Run.insp = maxf(0.0, Run.insp - 0.9 * dt)
		elif Run.insp < 14.0 and grace <= 0.0:
			Run.insp += 0.75 * dt
		else:
			Run.insp = maxf(0.0, Run.insp - 0.12 * dt)

# ---------- the Food Police ----------
func _update_cops(dt: float) -> void:
	var p: Vehicle = m.player
	var L := Run.heat_level()
	var want := 0
	if Run.insp >= 8.0:
		want = mini(6, 1 + int(Run.insp / 20.0))
	if cops.size() < want and grace <= 0.0 and rng.randf() < dt * 0.9:
		var s: Variant = road_spot(720.0, 1300.0)
		if s != null:
			var c := make_enemy("cop", 14.0, 1.7, 24.0 + 10.0 * L, Color.WHITE)
			c.position = s["pos"]
			c.info = {"cop": true}
			cops.append(c)
			if cops.size() == 1 and not cop_warned:
				m.show_msg("THE FOOD POLICE ARE AFTER YOU!", 2.4)
	var near := 0
	var closest := 1e9
	for c in cops:
		c.tick_fx(dt)
		if c.fx["burn"] > 0.0:
			c.hp -= 5.0 * Run.perks["burn"] * dt
		var aim: Vector2 = p.position + p.linear_velocity * 0.35 - c.position
		c.want_dir = aim
		c.throttle = 1.0
		c.max_speed = (82.0 + 8.0 * L) * SPEEDK
		var d: float = c.position.distance_to(p.position)
		closest = minf(closest, d)
		if d < 36.0:
			near += 1
		if d < 36.0 and c.hit_cd <= 0.0 and p.lift <= 2.0:
			c.hit_cd = 0.9
			Run.hp -= 4.0 * Run.perks["armor"]
			ftext(p.position, "-%d" % int(round(4.0 * Run.perks["armor"])), Color("#ff8a7a"))
			m.shake_cam(2.5)
	bust = bust + dt * near if near > 0 else maxf(0.0, bust - dt * 1.5)
	if bust >= 3.2:
		busted.emit()
	if not cops.is_empty() and closest > 800.0:
		far_t += dt
		if far_t > 6.0:
			for c in cops:
				c.queue_free()
			cops = []
			Run.insp *= 0.6
			m.show_msg("You lost them!", 1.8)
			far_t = 0.0
	else:
		far_t = 0.0

# ---------- the hangry traffic swarm ----------
func _spawn_minion() -> void:
	var L := 0
	var r := rng.randf()
	var t1 := 0.05 * L
	var t2 := t1 + (0.07 if L > 0 else 0.0)
	var t3 := t2 + 0.14
	var t4 := t3 + 0.2
	var t5 := t4 + 0.25
	var k: String = "bus" if r < t1 else ("armored" if r < t2 else ("charger" if r < t3 else ("van" if r < t4 else ("scooter" if r < t5 else "sedan"))))
	var s: Variant = road_spot(520.0, 900.0)
	if s == null:
		return
	var D: Dictionary = MINT[k]
	var sc := 1.0 + 0.3 * L + 0.04 * Run.leg_shifts
	var prefix := k
	if k == "sedan":
		prefix = pick(["sedan", "sedan", "hatch", "pickup", "taxi"])
	var tint := Color.WHITE
	if k == "sedan" or k == "van" or k == "scooter":
		tint = Color.from_hsv(rng.randf(), 0.25, 1.15)
	var e := make_enemy(prefix, D["r"], 1.2 + D["r"] / 12.0, D["hp"] * sc, tint)
	e.position = s["pos"]
	e.info = {"k": k, "D": D, "dash": 0.0, "dcd": rnd(2, 4)}
	mins.append(e)

func _update_mins(dt: float) -> void:
	var p: Vehicle = m.player
	var L := 0
	min_t -= dt
	var heat_n := int(round(1.5 * Run.heat_level()))
	var target := mini(14 + 9 * L, int(floor(4.0 + age / 6.0)) + heat_n)
	if grace <= 0.0 and mins.size() < target and min_t <= 0.0:
		_spawn_minion()
		min_t = 0.3
		if age > 2.0 and not warned:
			warned = true
			m.show_msg("RUSH HOUR! The traffic is hangry!", 2.4)
	wave_t -= dt
	if wave_t <= 0.0 and grace <= 0.0:
		wave_t = rnd(26.0, 36.0)
		for i in 7 + 3 * L:
			_spawn_minion()
		m.show_msg("A PACK OF HANGRY DRIVERS!", 2.0)
	for e in mins:
		var D: Dictionary = e.info["D"]
		e.tick_fx(dt)
		if e.fx["burn"] > 0.0:
			e.hp -= 5.0 * Run.perks["burn"] * dt
		var dx: Vector2 = p.position - e.position
		var d := dx.length()
		var sp: float = D["spd"] * (1.0 + 0.04 * L) * SPEEDK
		if D.get("dash", false):
			e.info["dash"] = maxf(0.0, e.info["dash"] - dt)
			e.info["dcd"] -= dt
			if e.info["dcd"] <= 0.0 and d < 600.0 and e.fx["stun"] <= 0.0:
				e.info["dash"] = 0.65
				e.info["dcd"] = rnd(3.0, 4.5)
		e.want_dir = dx
		e.throttle = 1.0
		e.max_speed = sp * (3.0 if e.info["dash"] > 0.0 else 1.0)
		if d < D["r"] + 17.0 + 5.0 and e.hit_cd <= 0.0 and p.lift <= 2.0:
			e.hit_cd = 1.1
			var dm: float = D["dmg"] * (1.0 + 0.12 * L) * Run.perks["armor"]
			Run.hp -= dm
			m.shake_cam(1.5)
			if rng.randf() < 0.3:
				ftext(e.position, pick(["HONK!", "BEEP!", "MOVE IT!", "MY LUNCH!", "ROAD RAGE!", "I SAW A HAIR!", "TOOT TOOT"]), Color("#ffe27a"))
		if d > 1700.0:
			e.hp = -999.0
			e.info["silent"] = true

# ---------- rival trucks ----------
func _update_rivals(dt: float) -> void:
	var p: Vehicle = m.player
	var L := 0
	rival_t -= dt
	if rival_t <= 0.0 and rivals.size() < 2 + L and grace <= 0.0:
		var free: Array = RIVALS.filter(func(r): return not rivals.any(func(x): return x.info["def"] == r))
		var def: Dictionary = pick(free if not free.is_empty() else RIVALS)
		var s: Variant = road_spot(780.0, 1400.0)
		if s != null:
			var sc := 1.0 + 0.35 * L + 0.08 * Run.leg_shifts
			var rv := make_enemy(def["model"], 17.0, 3.2, def["hp"] * sc, def["tint"])
			rv.position = s["pos"]
			rv.info = {"def": def, "cd": rnd(1.0, 2.0)}
			rivals.append(rv)
			m.show_msg("RIVAL TRUCK: %s!" % def["n"].to_upper(), 2.4)
		rival_t = 13.0
	for rv in rivals:
		var def: Dictionary = rv.info["def"]
		rv.tick_fx(dt)
		if rv.fx["burn"] > 0.0:
			rv.hp -= 5.0 * Run.perks["burn"] * dt
		var dx: Vector2 = p.position - rv.position
		var d := dx.length()
		var dir := dx.normalized()
		var go: Vector2 = dir if d > 285.0 else (-dir if d < 165.0 else dir.orthogonal() * 1.0 + dir * 0.15)
		rv.want_dir = go
		rv.throttle = 0.9
		rv.max_speed = def["spd"] * SPEEDK
		rv.info["cd"] -= dt
		if rv.info["cd"] <= 0.0 and d < 480.0 and rv.fx["stun"] <= 0.0:
			rv.info["cd"] = def["cd"]
			var a0 := (dx + p.linear_velocity * (d / 290.0) * 0.4).angle()
			for j in def["sp"]:
				var a: float = a0 + ((j - (def["sp"] - 1) / 2.0) * 0.22 if def["sp"] > 1 else 0.0)
				rshots.append({"pos": rv.position, "vel": Vector2.RIGHT.rotated(a) * 290.0, "dmg": def["dmg"], "fl": def["fl"], "col": Color(def["col"]), "life": 1.8})
		if d < 46.0 and rv.hit_cd <= 0.0 and p.lift <= 2.0:
			rv.hit_cd = 1.0
			Run.hp -= def["dmg"] * 1.2 * Run.perks["armor"]
			m.shake_cam(3.0)
			ftext(p.position, "RAMMED -%d" % int(round(def["dmg"] * 1.2 * Run.perks["armor"])), Color("#ff8a7a"))
		if d > 1700.0:
			rv.hp = -999.0
			rv.info["silent"] = true

func _update_rshots(dt: float) -> void:
	var p: Vehicle = m.player
	for s in rshots:
		s["life"] -= dt
		s["pos"] += s["vel"] * dt
		if s["pos"].distance_to(p.position) < 20.0 and p.lift <= 2.0:
			s["life"] = 0.0
			Run.hp -= s["dmg"] * Run.perks["armor"]
			m.shake_cam(2.0)
			ftext(p.position, "-%d" % int(round(s["dmg"] * Run.perks["armor"])), Color("#ff8a7a"))
			if s["fl"] == "frozen": p.fx["slow"] = 2.0
			if s["fl"] == "sour": p.fx["slow"] = maxf(p.fx["slow"], 0.9)
			if s["fl"] == "spicy": p.fx["burn"] = 2.2
	rshots = rshots.filter(func(s): return s["life"] > 0.0)

# ---------- your auto-firing dishes ----------
func _autofire(dt: float) -> void:
	var p: Vehicle = m.player
	while dish_t.size() < Run.dishes.size():
		dish_t.append(rnd(0.0, 0.3))
	dish_t = dish_t.slice(0, Run.dishes.size())
	var tl: Array = all_enemies().filter(func(e): return e.position.distance_to(p.position) < 360.0 and e.hp > 0.0)
	tl.sort_custom(func(a, b): return a.position.distance_to(p.position) < b.position.distance_to(p.position))
	for i in Run.dishes.size():
		dish_t[i] -= dt
		if dish_t[i] > 0.0 or tl.is_empty():
			continue
		var d: Dictionary = Run.dishes[i]
		var D: Dictionary = Run.D(d["k"])
		var tgt: Vehicle = tl[i % tl.size()]
		dish_t[i] = D["cd"] / (Run.perks["rate"] * (1.0 + 0.06 * (d["lv"] - 1))) * 1.15
		var n := Run.dish_count(d)
		var a0 := (tgt.position - p.position).angle()
		for j in n:
			var a: float = a0 + ((j - (n - 1) / 2.0) * 0.14 if n > 1 else 0.0) + rnd(-0.03, 0.03)
			shots.append({"pos": p.position, "vel": Vector2.RIGHT.rotated(a) * 380.0 + p.linear_velocity * 0.3, "dmg": Run.dish_dmg(d) * 1.2, "pierce": 1 if D.get("pierce", 0) > 0 else 0, "hit": [], "fl": d["fl"], "k": d["k"], "life": 1.1, "size": 4.0 * Run.perks["size"]})

func _update_shots(dt: float) -> void:
	var targets := all_enemies()
	for s in shots:
		s["life"] -= dt
		s["pos"] += s["vel"] * dt
		for e in targets:
			if e.hp <= 0.0 or s["hit"].has(e.get_instance_id()):
				continue
			var rr: float = e.radius + 4.0 + s["size"]
			if e.position.distance_to(s["pos"]) < rr:
				s["hit"].append(e.get_instance_id())
				var arm: float = e.info["D"].get("arm", 1.0) if (e.info.has("D")) else 1.0
				e.hp -= s["dmg"] * arm
				e.fx["flash"] = 0.15
				var fl: Array = s["fl"]
				if fl.has("frozen"): e.fx["slow"] = 2.4 * Run.perks["chill"]
				if fl.has("sour"): e.fx["stun"] = 0.8 * Run.perks["stun"]
				if fl.has("greasy"): e.fx["stun"] = 1.1
				if fl.has("spicy"): e.fx["burn"] = 2.6
				burst(s["pos"], Color(Run.D(s["k"])["col"]), 4, 60.0)
				if s["pierce"] > 0:
					s["pierce"] -= 1
				else:
					s["life"] = 0.0
					break
	shots = shots.filter(func(s): return s["life"] > 0.0)

func _ram(dt: float) -> void:
	var p: Vehicle = m.player
	if p.boost <= 0.0:
		return
	for e in all_enemies():
		if e.ram_cd > 0.0:
			continue
		var d: Vector2 = e.position - p.position
		if d.length() < e.radius + p.radius + 6.0:
			e.ram_cd = 0.4
			e.hp -= 14.0 * Run.perks["dmg"]
			e.fx["flash"] = 0.15
			e.fx["stun"] = maxf(e.fx["stun"], 0.35)
			e.apply_central_impulse(d.normalized() * 260.0 * e.mass)

# ---------- deaths and loot ----------
func _reap() -> void:
	var p: Vehicle = m.player
	for e in mins.duplicate():
		if e.hp <= 0.0:
			if not e.info.has("silent"):
				var D: Dictionary = e.info["D"]
				drop_loot(e.position, D["cash"] * Run.perks["tip"], D["xp"] * Run.perks["xp"], 3.0 if D.get("big", false) else 1.0)
				burst(e.position, Color("#ffd24a"), 10, 90.0)
			mins.erase(e)
			e.queue_free()
	for c in cops.duplicate():
		if c.hp <= 0.0:
			drop_loot(c.position, 6.0, 1.2, 3.0)
			Run.insp = maxf(0.0, Run.insp - 6.0)
			burst(c.position, Color("#ff7a3a"), 14, 100.0)
			ftext(c.position, "Cop car out! +$6", Color("#ffd24a"))
			cops.erase(c)
			c.queue_free()
	for r in rivals.duplicate():
		if r.hp <= 0.0:
			if not r.info.has("silent"):
				var def: Dictionary = r.info["def"]
				var rew := int(round(26.0 + 14.0 * 0 + 4.0 * Run.leg_shifts))
				drop_loot(r.position, rew, 3.0, 5.0)
				burst(r.position, Color(def["col"]), 22, 110.0)
				ftext(r.position, "%s is toast! +$%d" % [def["n"], rew], Color("#ffd24a"))
				var offers := Run.pick3()
				if not offers.is_empty():
					Run.apply_offer(offers[0])
					m.show_msg("Stole their recipe: " + offers[0]["t"], 2.6)
				else:
					m.show_msg("Rival defeated!", 2.0)
				rival_t = maxf(rival_t, 10.0)
			rivals.erase(r)
			r.queue_free()

func drop_loot(pos: Vector2, cash: float, xp: float, lucky: float) -> void:
	var n := clampi(int(round(cash / 0.7)), 1, 6)
	for i in n:
		spawn_loot("coin", pos, cash / n)
	if xp > 0.0:
		spawn_loot("gem", pos, xp)
	var r := rng.randf() / maxf(1.0, lucky)
	if r < 0.05:
		spawn_loot("fuel", pos, 7.0)
	elif r < 0.09:
		spawn_loot("kit", pos, 4.0)
	elif r < 0.14:
		spawn_loot("nitro", pos, 0.4)

func spawn_loot(k: String, pos: Vector2, v: float, still: bool = false) -> void:
	var a := rng.randf() * TAU
	var sp := 0.0 if still else rnd(30.0, 90.0)
	loot.append({"k": k, "pos": pos, "vel": Vector2(cos(a), sin(a)) * sp, "v": v, "age": 0.0, "life": 26.0 if k == "coin" else 34.0, "ph": rnd(0.0, 6.0)})
	if loot.size() > 150:
		loot.pop_front()

func _update_loot(dt: float) -> void:
	var p: Vehicle = m.player
	var sp := p.linear_velocity.length()
	for l in loot:
		l["age"] += dt
		l["pos"] += l["vel"] * dt
		l["vel"] *= maxf(0.0, 1.0 - 4.0 * dt)
		var d: float = l["pos"].distance_to(p.position)
		var R := 70.0 + (30.0 if p.boost > 0.0 else 0.0)
		if l["age"] > 0.35 and d < R and p.lift < 14.0:
			l["pos"] += (p.position - l["pos"]).normalized() * (160.0 + 320.0 * (1.0 - d / R)) * dt
		if l["age"] > 0.35 and d < 22.0 + sp * dt and p.lift < 14.0:
			l["life"] = -1.0
			match l["k"]:
				"coin":
					var v: float = l["v"] * mult()
					Run.cash += v
					coin_acc += v
					bump(1)
				"gem": Run.xp += l["v"]
				"fuel":
					Run.fuel = minf(Run.fuel_max, Run.fuel + l["v"])
					ftext(p.position, "+PETROL", Color("#7ae07a"))
				"kit":
					Run.hp = minf(Run.hp_max, Run.hp + l["v"])
					ftext(p.position, "+REPAIR", Color("#ff9aaa"))
				"nitro":
					m.add_nitro(l["v"])
					ftext(p.position, "+NITRO", Color("#7af0ff"))
		elif l["age"] > l["life"]:
			l["life"] = -1.0
	loot = loot.filter(func(l): return l["life"] > 0.0 and l["age"] <= l["life"])

# ---------- drive-by customers ----------
func _update_fans(dt: float) -> void:
	var p: Vehicle = m.player
	fan_t -= dt
	if fan_t <= 0.0 and fans.filter(func(f): return not f["sold"]).size() < 4:
		fan_t = rnd(3.5, 6.0)
		for i in 30:
			var ws: Dictionary = m.city.random_walk_spot(rng)
			var pos: Vector2 = ws["pos"]
			var d := pos.distance_to(p.position)
			if d > 160.0 and d < 600.0 and m.in_zone(pos).is_empty():
				var dk: String = pick(Run.dishes)["k"] if not Run.dishes.is_empty() and rng.randf() < 0.75 else pick(Data.DISH.keys())
				fans.append({"pos": pos, "t": 26.0, "hold": 0.0, "ped": pick(PEDN), "want": dk, "sold": false, "out": 0.0, "ph": rnd(0, 6)})
				break
	var sp := p.linear_velocity.length()
	for f in fans:
		f["ph"] += dt
		if f["sold"]:
			f["out"] -= dt
			continue
		f["t"] -= dt
		var d: float = f["pos"].distance_to(p.position)
		if d < 48.0 and sp < 200.0 and p.lift <= 2.0:
			f["hold"] += dt
			if f["hold"] >= 0.5:
				f["sold"] = true
				f["out"] = 1.2
				var owned: bool = Run.dishes.any(func(x): return x["k"] == f["want"])
				var pay := int(round((5.0 + rnd(0, 5)) * (1.5 if owned else 1.0) * mult()))
				Run.cash += pay
				Run.xp += 0.35 * Run.perks["xp"]
				bump(3)
				m.add_nitro(0.1)
				ftext(f["pos"], "SOLD! +$%d%s" % [pay, " (their fave!)" if owned else ""], Color("#ffd24a"))
				burst(f["pos"] + Vector2(0, -16), Color("#ff8aa8"), 8, 60.0)
		else:
			f["hold"] = maxf(0.0, f["hold"] - dt * 2.0)
	fans = fans.filter(func(f): return (f["out"] > 0.0) if f["sold"] else (f["t"] > 0.0))

# ---------- crates, stalls, ramps, boost pads ----------
func _make_fun() -> void:
	for ei in m.city.edges.size():
		var e: Dictionary = m.city.edges[ei]
		var off := 100.0
		while off < e["len"] - 100.0:
			off += rnd(110.0, 240.0)
			if off > e["len"] - 100.0:
				break
			var pt: Vector2 = m.city.point(ei, off)
			var tg: Vector2 = m.city.tangent(ei, off)
			var nm: Vector2 = m.city.normal(ei, off)
			var half: float = e["w"] / 2.0
			var r := rng.randf()
			if r < 0.07:
				var pos: Vector2 = pt + nm * rnd(-14.0, 14.0)
				if not m.in_zone(pos).is_empty(): continue
				var s := Sprite2D.new()
				s.texture = m.tex("pad_ramp")
				s.position = pos
				s.rotation = tg.angle() + PI / 2.0
				m.ground_fx.add_child(s)
				pads.append({"k": "ramp", "pos": pos, "cool": 0.0})
			elif r < 0.17:
				var pos: Vector2 = pt + nm * rnd(-14.0, 14.0)
				if not m.in_zone(pos).is_empty(): continue
				var s := Sprite2D.new()
				s.texture = m.tex("pad_boost")
				s.position = pos
				s.rotation = tg.angle()
				m.ground_fx.add_child(s)
				pads.append({"k": "boost", "pos": pos, "cool": 0.0})
			elif r < 0.31:
				var side := 1.0 if rng.randf() < 0.5 else -1.0
				var pos: Vector2 = pt + nm * side * (half + 12.0)
				if not m.in_zone(pos).is_empty(): continue
				var kind: String = pick(["fruit", "flowers", "tacos"])
				var n := Node2D.new()
				n.position = pos + Vector2(0, 13)
				var t: Texture2D = m.tex("stall_" + kind)
				var s := Sprite2D.new()
				s.texture = t
				s.centered = false
				s.offset = Vector2(-t.get_width() / 2.0, -t.get_height())
				n.add_child(s)
				var sb := StaticBody2D.new()
				sb.collision_layer = 2
				sb.collision_mask = 0
				var cs := CollisionShape2D.new()
				var rs := RectangleShape2D.new()
				rs.size = Vector2(34, 26)
				cs.shape = rs
				cs.position = Vector2(0, -13)
				sb.add_child(cs)
				n.add_child(sb)
				m.world.add_child(n)
				stalls.append({"pos": pos, "node": n, "kind": kind})
			elif r < 0.58:
				for i in int(rnd(1.0, 3.99)):
					var pos: Vector2 = pt + nm * rnd(-(half + 40.0), half + 40.0)
					if not m.in_zone(pos).is_empty(): continue
					var n := Node2D.new()
					n.position = pos + Vector2(0, 8)
					var s := Sprite2D.new()
					s.texture = m.tex("prop_crate")
					s.scale = Vector2(0.6, 0.6)
					s.centered = false
					s.offset = Vector2(-16.5, -42)
					n.add_child(s)
					m.world.add_child(n)
					crates.append({"pos": pos, "node": n})

func _update_fun(dt: float) -> void:
	var p: Vehicle = m.player
	var sp := p.linear_velocity.length()
	if air_t > 0.0:
		air_t -= dt
		p.lift = sin(PI * (1.0 - air_t / 0.9)) * 42.0
		if air_t <= 0.0:
			p.lift = 0.0
			p.air(false)
			for e in all_enemies():
				if e.position.distance_to(p.position) < 80.0:
					e.hp -= 18.0 * Run.perks["dmg"]
					e.fx["flash"] = 0.2
					e.fx["stun"] = maxf(e.fx["stun"], 0.6)
			burst(p.position, Color("#e8dcc0"), 16, 110.0)
			for i in 3:
				spawn_loot("coin", p.position, 1.5)
			bump(3)
			m.add_nitro(0.2)
			ftext(p.position, "AIR TIME! BIG TIPS!", Color("#ffd24a"))
			m.shake_cam(4.0)
	for pd in pads:
		pd["cool"] = maxf(0.0, pd["cool"] - dt)
		if pd["cool"] > 0.0 or air_t > 0.0:
			continue
		if p.position.distance_to(pd["pos"]) < 26.0:
			if pd["k"] == "ramp" and sp > 90.0:
				pd["cool"] = 1.0
				air_t = 0.9
				p.air(true)
				ftext(p.position, "AIRBORNE!", Color("#ffe27a"))
			elif pd["k"] == "boost":
				pd["cool"] = 0.7
				p.apply_central_impulse(Vector2.RIGHT.rotated(p.heading) * 260.0 * p.mass)
				m.add_nitro(0.05)
				ftext(p.position, "ZOOM!", Color("#7af0ff"))
	for s in stalls.duplicate():
		if p.position.distance_to(s["pos"]) < 40.0 and (sp >= 110.0 or p.boost > 0.0) and air_t <= 0.0:
			burst(s["pos"] + Vector2(0, -10), Color(pick(["#e84a3a", "#f0c040", "#7acb6a", "#f070b0"])), 22, 130.0)
			for i in 4:
				spawn_loot("coin", s["pos"], 1.2)
			if rng.randf() < 0.3:
				spawn_loot("fuel", s["pos"], 7.0)
			bump(2)
			m.add_nitro(0.06)
			Run.insp = clampf(Run.insp + 2.0, 0.0, 100.0)
			ftext(s["pos"], pick(["SMASH!", "FRESH PRODUCE!", "SPLAT!", "SALE ENDS NOW!"]), Color("#ffb84a"))
			m.shake_cam(3.0)
			s["node"].queue_free()
			stalls.erase(s)
	for c in crates.duplicate():
		if p.position.distance_to(c["pos"]) < 26.0 and air_t <= 0.0:
			burst(c["pos"], Color(pick(["#b88a4a", "#8a6030", "#d8a860"])), 10, 90.0)
			drop_loot(c["pos"], 2.0, 0.5, 3.0)
			bump(1)
			c["node"].queue_free()
			crates.erase(c)

# ---------- drawing ----------
func _draw() -> void:
	var p: Vehicle = m.player
	for f in fans:
		var pos: Vector2 = f["pos"]
		var fr := clampf(f["t"] / 26.0, 0.0, 1.0)
		draw_set_transform(pos + Vector2(0, 1), 0.0, Vector2(1.0, 0.5))
		draw_arc(Vector2.ZERO, 21.0, 0.0, TAU, 24, Color(0.08, 0.05, 0.1, 0.45), 2.0)
		if not f["sold"]:
			draw_arc(Vector2.ZERO, 21.0, -PI / 2.0, -PI / 2.0 + TAU * fr, 24, Color("#ff6a4a") if fr < 0.25 else Color("#ffd24a"), 2.0)
			if f["hold"] > 0.0:
				draw_arc(Vector2.ZERO, 15.0, -PI / 2.0, -PI / 2.0 + TAU * clampf(f["hold"] / 0.5, 0.0, 1.0), 20, Color("#6ae87a"), 3.0)
		draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
		var t: Texture2D = m.tex("ped_" + f["ped"])
		var bob: float = absf(sin(f["ph"] * 6.0)) * -1.5
		draw_texture_rect_region(t, Rect2(pos.x - 24, pos.y - 42 + bob, 48, 48), Rect2(0, 48, 48, 48))
		if not f["sold"]:
			var owned: bool = Run.dishes.any(func(x): return x["k"] == f["want"])
			var bx := pos.x - 12.0
			var by := pos.y - 62.0 + bob
			draw_rect(Rect2(bx, by, 24, 18), Color(1, 0.93, 0.6, 0.97) if owned else Color(1, 0.99, 0.94, 0.95))
			if UI.has_icon("d_" + f["want"]):
				draw_texture_rect(UI.tex("d_" + f["want"]), Rect2(bx + 4, by + 1, 16, 16), false)
	for l in loot:
		if l["age"] > l["life"] - 4.0 and int(clock * 10.0) % 2 == 1:
			continue
		var pos: Vector2 = l["pos"]
		draw_set_transform(pos + Vector2(0, 2), 0.0, Vector2(1.0, 0.35))
		draw_circle(Vector2.ZERO, 5.0, Color(0, 0, 0, 0.3))
		var k: String = l["k"]
		var nm: String = {"coin": "i_coin", "gem": "i_gem", "fuel": "i_fuel", "kit": "i_kit", "nitro": "i_nitro"}[k]
		var sz := 16.0 if (k == "coin" or k == "gem") else 20.0
		var sx: float = 0.25 + 0.75 * absf(cos(clock * 5.0 + l["ph"])) if k == "coin" else 1.0
		draw_set_transform(pos + Vector2(0, -8), 0.0, Vector2(sx, 1.0))
		draw_texture_rect(UI.tex(nm), Rect2(-sz / 2.0, -sz / 2.0, sz, sz), false)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	for s in shots:
		var k: String = s["k"]
		var pos: Vector2 = s["pos"]
		var rot: float = clock * 12.0
		draw_set_transform(pos, rot, Vector2.ONE)
		if Run.D(k).has("parts"):
			k = Run.D(k)["parts"][0]
		if UI.has_icon("d_" + k):
			draw_texture_rect(UI.tex("d_" + k), Rect2(-8, -8, 16, 16), false)
		draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
		if s["fl"].size() > 0:
			draw_arc(pos, 9.0, 0.0, TAU, 14, Color(Data.FLAV[s["fl"][s["fl"].size() - 1]]["col"]), 1.4)
	for s in rshots:
		draw_circle(s["pos"], 5.0, s["col"])
		draw_circle(s["pos"], 2.0, Color.WHITE)
	# health bars over the tougher enemies
	for e in all_enemies():
		if e.hp < e.hp_max and (e.radius >= 14.0):
			var w := 24.0
			draw_rect(Rect2(e.position.x - w / 2, e.position.y - 34, w, 3), Color("#2a1010"))
			draw_rect(Rect2(e.position.x - w / 2, e.position.y - 34, w * clampf(e.hp / e.hp_max, 0.0, 1.0), 3), Color("#ff6a4a"))
	for r in rivals:
		var def: Dictionary = r.info["def"]
		draw_string(ThemeDB.fallback_font, r.position + Vector2(-40, -44), def["n"], HORIZONTAL_ALIGNMENT_CENTER, 80, 8, Color(def["col"]))
	if p.lift > 2.0:
		draw_set_transform(p.position + Vector2(0, 14), 0.0, Vector2(1.0, 0.35))
		draw_circle(Vector2.ZERO, 20.0, Color(0, 0, 0, 0.35))
		draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
