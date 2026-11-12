shader_type canvas_item;
// A soft-edged, noise-wobbled ribbon (river, dirt path) filled with a tiling pixel texture, snapped to a pixel grid.
uniform sampler2D tex : repeat_enable, filter_nearest;
uniform float tex_scale = 48.0;
uniform vec3 tint : source_color = vec3(1.0, 1.0, 1.0);
uniform vec3 edge_col : source_color = vec3(0.3, 0.2, 0.1);
uniform float edge_w = 0.2;
uniform float fringe = 0.2;
uniform float flow = 0.0;
uniform float sparkle = 0.0;
varying vec2 wpos;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 0.0, 1.0)).xy;
}

void fragment() {
	float d = abs(UV.y - 0.5) * 2.0;
	vec2 q = floor(wpos / 3.0) * 3.0;
	float n = vnoise(q / 26.0) * 0.6 + vnoise(q / 9.0) * 0.4;
	float lim = 1.0 - fringe * n;
	if (d > lim) {
		discard;
	}
	vec2 uv = floor(wpos / 1.5) * 1.5 / tex_scale;
	uv.y -= TIME * flow * 0.02;
	uv.x += sin(wpos.y * 0.02 + TIME * 0.6) * 0.01 * flow;
	vec3 c = texture(tex, uv).rgb * tint;
	float edge = smoothstep(lim - edge_w - 0.03, lim - edge_w, d);
	c = mix(c, edge_col, edge * 0.85);
	float sp = step(0.993, hash(floor(wpos / 3.0) + floor(TIME * 1.5))) * sparkle;
	c += vec3(sp * 0.7);
	COLOR = vec4(c, 1.0);
}
