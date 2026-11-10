class_name Vehicle
extends RigidBody2D
# Arcade car physics on a RigidBody2D: engine force along the heading, tyre grip that kills sideways slide (and lets you
# drift when it is low), turn rate that depends on speed, and real momentum-based collisions with everything else.

const DIRS := ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"]

signal crashed(speed: float, at: Vector2)

var heading := 0.0
var throttle := 0.0          # 0..1 engine
var want_dir := Vector2.ZERO # the direction we are steering towards (length ignored)
var max_speed := 150.0
var accel := 280.0
var turn_rate := 3.4         # rad/s at speed
var grip := 7.0              # how fast sideways velocity is removed (per second)
var boost := 0.0             # 0..1 nitro
var handbrake := false
var brake := 0.0
var sprites := {}
var spr: Sprite2D
var last_speed := 0.0
var is_player := false

func setup(prefix: String, radius: float, m: float, sprite_lift: float) -> void:
	mass = m
	gravity_scale = 0.0
	lock_rotation = true
	contact_monitor = true
	max_contacts_reported = 4
	var pm := PhysicsMaterial.new()
	pm.bounce = 0.3
	pm.friction = 0.0
	physics_material_override = pm
	var cs := CollisionShape2D.new()
	var sh := CircleShape2D.new()
	sh.radius = radius
	cs.shape = sh
	add_child(cs)
	spr = Sprite2D.new()
	spr.offset = Vector2(0, -sprite_lift)
	add_child(spr)
	for d in DIRS:
		sprites[d] = load("res://art/%s_%s.png" % [prefix, d])
	spr.texture = sprites["east"]
	body_entered.connect(_on_hit)

func _on_hit(_body: Node) -> void:
	if last_speed > 110.0:
		crashed.emit(last_speed, global_position)

func _physics_process(_dt: float) -> void:
	last_speed = linear_velocity.length()

func _process(_dt: float) -> void:
	var idx := posmod(int(roundf(heading / (PI / 4.0))), 8)
	spr.texture = sprites[DIRS[idx]]

func _integrate_forces(state: PhysicsDirectBodyState2D) -> void:
	var dt := state.step
	var v := state.linear_velocity
	var speed := v.length()
	if want_dir.length() > 0.05:
		var diff := wrapf(want_dir.angle() - heading, -PI, PI)
		var rate := turn_rate * clampf(speed / 60.0, 0.3, 1.0)
		heading += clampf(diff, -rate * dt, rate * dt)
	var fwd := Vector2.RIGHT.rotated(heading)
	var right := fwd.orthogonal()
	var g := 1.2 if handbrake else grip
	v -= right * v.dot(right) * clampf(g * dt, 0.0, 1.0)
	v += fwd * throttle * accel * (1.0 + 1.6 * boost) * dt
	if throttle < 0.05:
		v *= (1.0 - 1.4 * dt)
	v *= maxf(0.0, 1.0 - brake * dt)
	var cap := max_speed * (1.0 + 0.8 * boost)
	if v.length() > cap:
		v = v.move_toward(v.normalized() * cap, 500.0 * dt)
	state.linear_velocity = v
