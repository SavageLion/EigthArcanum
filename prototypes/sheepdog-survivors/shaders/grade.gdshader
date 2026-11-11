shader_type canvas_item;
// Gentle colour grade: warm, a little saturated, soft vignette.
uniform sampler2D screen_tex : hint_screen_texture, filter_linear;
uniform float vignette = 0.32;
uniform vec3 tint = vec3(1.03, 0.995, 0.93);
uniform float sat = 1.10;
void fragment() {
	vec3 c = texture(screen_tex, SCREEN_UV).rgb;
	float l = dot(c, vec3(0.299, 0.587, 0.114));
	c = mix(vec3(l), c, sat) * tint;
	vec2 uv = SCREEN_UV - 0.5;
	float v = 1.0 - smoothstep(0.28, 0.9, length(uv * vec2(1.25, 1.0))) * vignette;
	COLOR = vec4(c * v, 1.0);
}
