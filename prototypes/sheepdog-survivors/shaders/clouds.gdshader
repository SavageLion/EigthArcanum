shader_type canvas_item;
// Slow cloud shadows drifting across the meadow (scrolls with the camera so they feel like they sit on the ground).
uniform sampler2D noise_tex : repeat_enable, filter_linear;
uniform vec2 cam = vec2(0.0);
uniform vec2 view_size = vec2(960.0, 540.0);
uniform float strength = 0.16;
void fragment() {
	vec2 world = cam - view_size * 0.5 + UV * view_size;
	float n = texture(noise_tex, world * 0.00055 + vec2(TIME * 0.006, TIME * 0.002)).r;
	float a = smoothstep(0.5, 0.78, n) * strength;
	COLOR = vec4(0.05, 0.12, 0.2, a);
}
