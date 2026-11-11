shader_type canvas_item;
// Calm painted meadow: soft patches of light and dark, banded like pixel art.
uniform vec2 world_size = vec2(2100.0, 960.0);
uniform vec3 c_dark : source_color = vec3(0.247, 0.478, 0.204);
uniform vec3 c_mid : source_color = vec3(0.31, 0.60, 0.25);
uniform vec3 c_light : source_color = vec3(0.45, 0.70, 0.34);
uniform vec3 c_hi : source_color = vec3(0.60, 0.77, 0.36);
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void fragment() {
	vec2 wp = floor(UV * world_size / 2.0) * 2.0;
	float n = vnoise(wp / 34.0) * 0.55 + vnoise(wp / 12.0) * 0.3 + vnoise(wp / 5.0) * 0.15;
	vec3 c = c_dark;
	if (n > 0.36) c = c_mid;
	if (n > 0.58) c = c_light;
	if (n > 0.76) c = c_hi;
	COLOR = vec4(c, 1.0);
}
