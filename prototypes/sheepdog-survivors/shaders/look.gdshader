shader_type canvas_item;
// Look-dev: the same scene in several art directions. mode 0 is the current warm grade.
uniform sampler2D screen_tex : hint_screen_texture, filter_nearest;
uniform int mode = 0;

float luma(vec3 c) {
	return dot(c, vec3(0.299, 0.587, 0.114));
}

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float bayer4(vec2 p) {
	int x = int(mod(p.x, 4.0));
	int y = int(mod(p.y, 4.0));
	int i = x + y * 4;
	float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
	return m[i] / 16.0;
}

vec3 kuwahara(vec2 uv, float r, vec2 px) {
	float best = 1.0e9;
	vec3 res = vec3(0.0);
	for (int q = 0; q < 4; q++) {
		vec2 dir = vec2((q % 2 == 0) ? -1.0 : 1.0, (q < 2) ? -1.0 : 1.0);
		vec3 mean = vec3(0.0);
		vec3 sq = vec3(0.0);
		for (int i = 0; i <= 2; i++) {
			for (int j = 0; j <= 2; j++) {
				vec3 c = texture(screen_tex, uv + vec2(float(i), float(j)) * dir * px * r).rgb;
				mean += c;
				sq += c * c;
			}
		}
		mean /= 9.0;
		sq /= 9.0;
		float vv = dot(sq - mean * mean, vec3(1.0));
		if (vv < best) {
			best = vv;
			res = mean;
		}
	}
	return res;
}

vec3 bloom(vec2 uv, float r, vec2 px) {
	vec3 acc = vec3(0.0);
	for (int i = 0; i < 8; i++) {
		float a = float(i) * 0.785398;
		acc += texture(screen_tex, uv + vec2(cos(a), sin(a)) * px * r).rgb;
	}
	return acc / 8.0;
}

void fragment() {
	vec2 uv = SCREEN_UV;
	vec3 c = texture(screen_tex, uv).rgb;
	float l = luma(c);
	vec2 cuv = uv - 0.5;
	float vig = 1.0 - smoothstep(0.28, 0.9, length(cuv * vec2(1.25, 1.0)));
	if (mode == 0) {
		c = mix(vec3(l), c, 1.10) * vec3(1.03, 0.995, 0.93);
		c *= mix(1.0, vig, 0.32);
	} else if (mode == 1) {
		// painted: oil-paint smoothing, slightly richer colour, soft edge darkening
		c = kuwahara(uv, 1.6, SCREEN_PIXEL_SIZE);
		l = luma(c);
		c = mix(vec3(l), c, 1.18) * vec3(1.04, 1.0, 0.94);
		c = floor(c * 14.0 + 0.5) / 14.0;
		c *= mix(1.0, vig, 0.28);
	} else if (mode == 2) {
		// pastel storybook: lifted shadows, soft bloom, paper grain
		vec3 b = bloom(uv, 7.0, SCREEN_PIXEL_SIZE);
		c = mix(vec3(l), c, 0.92);
		c = c * 1.06 + 0.05;
		c = mix(c, vec3(0.98, 0.88, 0.82), 0.10);
		c += max(b - 0.62, 0.0) * 0.45;
		c += (hash(floor(FRAGCOORD.xy / 2.0)) - 0.5) * 0.035;
		c *= mix(1.0, vig, 0.18);
	} else if (mode == 3) {
		// golden hour: warm light, cool purple shadows, light shafts, heavier vignette
		c *= vec3(1.14, 0.99, 0.76);
		c = mix(c, c * vec3(0.72, 0.78, 1.05), (1.0 - l) * 0.55);
		c = mix(vec3(luma(c)), c, 1.2);
		float ray = pow(max(0.0, sin((uv.x - uv.y * 0.55) * 8.0 + TIME * 0.12)), 5.0) * 0.07;
		c += vec3(1.0, 0.82, 0.5) * ray;
		c *= mix(1.0, vig, 0.55);
	} else if (mode == 4) {
		// chunky limited-palette pixel: dithered posterize
		float d = bayer4(floor(FRAGCOORD.xy / 2.0)) - 0.5;
		c = floor(c * 5.0 + 0.5 + d * 0.9) / 5.0;
		c = c * vec3(1.05, 1.0, 0.92);
		c *= mix(1.0, vig, 0.25);
	} else {
		// bright farm-sim: clean, saturated, little vignette
		c = mix(vec3(l), c, 1.3);
		c = (c - 0.5) * 1.08 + 0.53;
		c *= mix(1.0, vig, 0.1);
	}
	COLOR = vec4(clamp(c, 0.0, 1.0), 1.0);
}
