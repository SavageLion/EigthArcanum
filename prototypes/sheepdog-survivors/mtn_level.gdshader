shader_type canvas_item;

uniform sampler2D field : filter_linear, repeat_disable;
uniform sampler2D ground : filter_nearest, repeat_enable;
uniform sampler2D dirt : filter_nearest, repeat_enable;
uniform sampler2D cliff : filter_linear, repeat_disable;
uniform sampler2D noise : filter_linear, repeat_enable;
uniform vec2 world_size = vec2(3264.0, 3552.0);
uniform float hgt = 42.0;
uniform float yoff = 0.0;
uniform vec3 tint = vec3(1.0);
uniform int base_mode = 0;
uniform vec3 lip_col = vec3(0.45, 0.65, 0.25);

varying vec2 lp;

void vertex() {
	lp = VERTEX + vec2(0.0, yoff);
}

float top_at(vec2 p) {
	vec4 f = texture(field, p / world_size);
	return f.r * (1.0 - step(0.45, f.b));
}

void cliff_pass(vec2 p, float n, float n2, vec3 lipc, out vec4 res) {
	res = vec4(0.0);
	float depth = -1.0;
	for (int i = 1; i <= 14; i++) {
		float d = float(i) * 4.0;
		if (top_at(p - vec2(0.0, d)) >= 0.52) {
			depth = d;
			break;
		}
	}
	if (depth > 0.0) {
		float dm = hgt * (0.82 + 0.34 * texture(noise, vec2(p.x / 52.0, 0.37)).r);
		if (depth <= dm) {
			float u = abs(fract(p.x / 224.0) * 2.0 - 1.0);
			float v = 0.04 + 0.52 * clamp(depth / hgt, 0.0, 1.0);
			vec4 ct = texture(cliff, vec2(0.06 + u * 0.88, v));
			vec3 c = mix(vec3(0.34, 0.35, 0.33), ct.rgb, step(0.5, ct.a));
			c = mix(c, vec3(0.34, 0.35, 0.33), step(0.93, min(c.r, min(c.g, c.b))));
			c *= 1.0 - 0.28 * (depth / hgt);
			c *= 0.9 + 0.2 * n2;
			float lipm = 1.0 - smoothstep(0.0, 9.0, depth - n2 * 6.0);
			c = mix(c, lipc * 0.9, lipm * 0.6);
			res = vec4(c * mix(vec3(1.0), tint, 0.6), 1.0);
		} else if (depth <= hgt + 16.0) {
			res = vec4(0.0, 0.0, 0.0, 0.28 * (1.0 - (depth - dm) / (hgt + 16.0 - dm + 0.01)));
		}
	}
}

void fragment() {
	vec4 f = texture(field, lp / world_size);
	float n = texture(noise, lp / 170.0).r;
	float n2 = texture(noise, lp / 37.0 + 0.3).r;
	vec3 dcol = texture(dirt, lp / 190.0).rgb * vec3(1.18, 1.1, 0.96);
	float holef = 1.0 - smoothstep(0.3, 0.55, f.b);
	float tr = smoothstep(0.62, 0.7, f.g + (n2 - 0.5) * 0.25);
	COLOR = vec4(0.0);
	if (base_mode == 1) {
		COLOR = vec4(dcol * tr, tr);
	} else {
		float inside = smoothstep(0.5, 0.54, f.r) * holef;
		if (inside > 0.01) {
			vec3 g = texture(ground, lp / 190.0).rgb * tint;
			g *= 0.92 + 0.16 * n;
			float edge = 1.0 - smoothstep(0.5, 0.66, f.r);
			g = mix(g, lip_col * tint, edge * 0.55);
			float rim = 1.0 - smoothstep(0.5, 0.515, f.r);
			g *= 1.0 - rim * 0.35;
			vec2 fc = floor(lp / 13.0);
			float fh = fract(sin(dot(fc, vec2(12.9898, 78.233))) * 43758.5453);
			float fpatch = smoothstep(0.55, 0.75, texture(noise, lp / 260.0 + 0.6).r);
			if (fh > 0.975 - 0.06 * fpatch && edge < 0.2) {
				float ft = fract(fh * 7.0);
				vec3 fcol = ft < 0.33 ? vec3(0.95, 0.9, 0.95) : (ft < 0.66 ? vec3(0.75, 0.55, 0.9) : vec3(0.98, 0.85, 0.35));
				vec2 q = fract(lp / 13.0) - 0.5;
				g = mix(g, fcol, step(max(abs(q.x), abs(q.y)), 0.1));
			}
			g = mix(g, g * vec3(0.8, 0.95, 0.75), fpatch * 0.35);
			vec3 c = mix(g, dcol * tint, tr * (1.0 - edge * 0.5));
			COLOR = vec4(c, inside);
		} else if (f.b <= 0.3) {
			vec4 res;
			cliff_pass(lp, n, n2, lip_col, res);
			COLOR = res;
		}
	}
}
