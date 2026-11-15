shader_type canvas_item;

// the drop between the islands: a dark forest far below, with a sea of clouds drifting over it
uniform sampler2D noise : filter_linear, repeat_enable;

varying vec2 lp;

void vertex() {
	lp = VERTEX;
}

float cloud_field(vec2 p, float t) {
	float a = texture(noise, (p - vec2(t * 9.0, t * 2.0)) / 1900.0).r;
	float b = texture(noise, (p - vec2(t * 21.0, -t * 3.0)) / 1000.0 + 0.37).r;
	float c = texture(noise, (p - vec2(t * 34.0, t * 5.0)) / 560.0 + 0.71).r;
	return a * 0.5 + b * 0.32 + c * 0.18;
}

void fragment() {
	float t = TIME;
	vec2 q = floor(lp / 4.0) * 4.0;
	float fa = texture(noise, q / 420.0).r;
	float fb = texture(noise, q / 110.0 + 0.4).r;
	vec3 forest = mix(vec3(0.04, 0.14, 0.1), vec3(0.1, 0.28, 0.17), smoothstep(0.35, 0.65, fb * 0.6 + fa * 0.4));
	forest = mix(forest, vec3(0.5, 0.68, 0.84), 0.62);
	float far_d = cloud_field(q * 0.7 + vec2(400.0, 900.0), t * 0.55);
	float far_c = smoothstep(0.34, 0.5, far_d);
	vec3 col = mix(forest, vec3(0.74, 0.84, 0.93), far_c * 0.92);
	float d = cloud_field(q, t);
	float body = smoothstep(0.43, 0.56, d);
	float up = cloud_field(q + vec2(0.0, 14.0), t);
	float rim = clamp((d - up) * 9.0, -1.0, 1.0);
	vec3 shade = vec3(0.64, 0.74, 0.88);
	vec3 white = vec3(0.97, 0.985, 1.0);
	vec3 tone = mix(shade, white, smoothstep(0.48, 0.7, d));
	tone = mix(tone, white, clamp(rim, 0.0, 1.0) * 0.6);
	tone = mix(tone, shade * 0.95, clamp(-rim, 0.0, 1.0) * 0.5);
	tone = floor(tone * 7.0 + 0.5) / 7.0;
	col = mix(col, tone, body);
	COLOR = vec4(col, 1.0);
}
