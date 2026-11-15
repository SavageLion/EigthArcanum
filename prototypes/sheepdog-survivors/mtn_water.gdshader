shader_type canvas_item;

uniform sampler2D wfield : filter_linear, repeat_disable;
uniform sampler2D noise : filter_linear, repeat_enable;
uniform vec2 world_size = vec2(3264.0, 3552.0);
uniform float hgt = 60.0;
uniform float yoff = 0.0;

varying vec2 lp;

void vertex() {
	lp = VERTEX + vec2(0.0, yoff);
}

void fragment() {
	vec4 f = texture(wfield, lp / world_size);
	float t = TIME;
	float in_w = smoothstep(0.45, 0.55, f.r);
	COLOR = vec4(0.0);
	if (in_w > 0.01) {
		float n = texture(noise, vec2(lp.x / 110.0, lp.y / 110.0 - t * 0.05)).r;
		float s = smoothstep(0.58, 0.68, texture(noise, vec2(lp.x / 34.0, lp.y / 120.0 - t * 0.16)).r);
		vec3 col = mix(vec3(0.12, 0.36, 0.66), vec3(0.28, 0.62, 0.9), n);
		col = mix(col, vec3(0.9, 0.97, 1.0), s * 0.55);
		float edge = 1.0 - smoothstep(0.5, 0.7, f.r);
		col = mix(col, vec3(0.92, 0.97, 1.0), edge * 0.55);
		COLOR = vec4(col, in_w);
	} else {
		float depth = -1.0;
		for (int i = 1; i <= 16; i++) {
			float d = float(i) * 4.0;
			if (texture(wfield, (lp - vec2(0.0, d)) / world_size).g >= 0.5) {
				depth = d;
				break;
			}
		}
		if (depth > 0.0 && depth <= hgt * 0.98) {
			float s = texture(noise, vec2(lp.x / 16.0, lp.y / 70.0 - t * 0.7)).r;
			vec3 col = mix(vec3(0.5, 0.76, 0.95), vec3(1.0), smoothstep(0.35, 0.75, s));
			float foot = smoothstep(hgt * 0.8, hgt * 0.98, depth);
			col = mix(col, vec3(1.0), foot * 0.7);
			COLOR = vec4(col, 0.94);
		}
	}
}
