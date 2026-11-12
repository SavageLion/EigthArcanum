shader_type canvas_item;
// Slow cloud shadows drifting over the meadow: two crisp pixel-snapped tones, anchored to the ground.
uniform sampler2D noise_tex : repeat_enable, filter_linear;
uniform vec2 cam = vec2(0.0);
uniform vec2 view_size = vec2(960.0, 540.0);
uniform float strength = 0.14;
void fragment() {
	vec2 world = cam - view_size * 0.5 + UV * view_size;
	world = floor(world / 3.0) * 3.0;
	float n = texture(noise_tex, world * 0.0004 + vec2(TIME * 0.004, TIME * 0.0015)).r;
	float a = step(0.57, n) * 0.6 + step(0.66, n) * 0.4;
	COLOR = vec4(0.05, 0.1, 0.22, a * strength);
}
