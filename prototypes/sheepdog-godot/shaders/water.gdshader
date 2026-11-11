shader_type canvas_item;
// A slow drifting stream with a soft shimmer.
uniform float speed = 0.02;
void fragment() {
	vec2 uv = UV + vec2(0.0, TIME * speed);
	vec4 c = texture(TEXTURE, uv);
	float sh = sin((UV.x + UV.y) * 90.0 + TIME * 2.0) * 0.5 + 0.5;
	c.rgb += vec3(0.05, 0.07, 0.08) * sh * 0.5;
	COLOR = c;
}
