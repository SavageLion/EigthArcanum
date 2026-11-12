shader_type canvas_item;
// Big soft patches of lighter and darker meadow over the ground tiles, from smooth noise snapped to a coarse pixel grid.
uniform vec2 world_size = vec2(2400.0, 1632.0);
uniform sampler2D noise_tex : repeat_enable, filter_linear;

void fragment() {
	vec2 wp = floor(UV * world_size / 4.0) * 4.0;
	float a = texture(noise_tex, wp / 1000.0).r;
	float b = texture(noise_tex, wp / 1900.0 + vec2(0.37, 0.61)).r;
	float light = smoothstep(0.55, 0.68, a);
	float dark = max(smoothstep(0.45, 0.33, a), smoothstep(0.58, 0.70, b));
	vec3 col = mix(vec3(0.98, 0.92, 0.5), vec3(0.08, 0.22, 0.08), step(light, dark));
	float al = max(light * 0.10, dark * 0.13);
	COLOR = vec4(col, al);
}
