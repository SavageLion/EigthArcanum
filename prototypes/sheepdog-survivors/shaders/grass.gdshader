shader_type canvas_item;
// Dense hand-painted-looking grass: big soft light and dark masses with tiny pixel blade strokes on top.
uniform vec2 world_size = vec2(3264.0, 2208.0);
uniform sampler2D noise_tex : repeat_enable, filter_linear;
uniform vec3 c_dark : source_color = vec3(0.20, 0.45, 0.17);
uniform vec3 c_mid : source_color = vec3(0.30, 0.60, 0.21);
uniform vec3 c_light : source_color = vec3(0.42, 0.70, 0.26);
uniform vec3 c_tip : source_color = vec3(0.62, 0.82, 0.36);
uniform float px = 3.0;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void fragment() {
	vec2 wp = UV * world_size;
	float n = texture(noise_tex, wp / 1500.0).r;
	float n2 = texture(noise_tex, wp / 520.0 + vec2(0.31, 0.57)).r;
	float tone = clamp(n * 0.65 + n2 * 0.35, 0.0, 1.0);
	vec3 base = mix(c_dark, c_mid, smoothstep(0.28, 0.46, tone));
	base = mix(base, c_light, smoothstep(0.50, 0.70, tone));
	vec2 cell = floor(wp / px);
	vec3 col = base;
	// blades are rooted below this pixel and rise up to four cells
	for (int k = 0; k < 4; k++) {
		vec2 root = cell + vec2(0.0, float(k));
		float h = hash(root);
		float len = 1.0 + floor(hash(root + 5.7) * 3.4);
		if (h > 0.8 && float(k) < len) {
			float t = float(k) / max(len - 1.0, 1.0);
			vec3 stroke = mix(c_dark * 0.92, c_tip, 0.3 + 0.7 * t);
			col = mix(stroke, base, 0.28);
		}
	}
	if (hash(cell + vec2(19.0, 3.0)) > 0.94) {
		col = mix(col, c_dark * 0.8, 0.6);
	}
	COLOR = vec4(col, 1.0);
}
