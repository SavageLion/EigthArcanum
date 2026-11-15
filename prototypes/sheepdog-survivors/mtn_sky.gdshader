shader_type canvas_item;

// the chasm between the islands: a dark forest canopy far below
uniform sampler2D noise : filter_linear, repeat_enable;

varying vec2 lp;

void vertex() {
	lp = VERTEX;
}

void fragment() {
	vec2 q = floor(lp / 6.0) * 6.0;
	float a = texture(noise, q / 420.0).r;
	float b = texture(noise, q / 110.0 + 0.4).r;
	float c = texture(noise, q / 38.0 + 0.8).r;
	vec3 deep = vec3(0.05, 0.17, 0.11);
	vec3 mid = vec3(0.09, 0.27, 0.15);
	vec3 top = vec3(0.17, 0.4, 0.2);
	vec3 col = mix(deep, mid, smoothstep(0.35, 0.6, b * 0.6 + a * 0.4));
	col = mix(col, top, smoothstep(0.55, 0.8, c * 0.7 + b * 0.3) * 0.7);
	col *= 0.85 + 0.3 * smoothstep(0.3, 0.7, a);
	COLOR = vec4(col, 1.0);
}
