shader_type canvas_item;

// the painted map is drawn on flat magenta; the magenta becomes see-through
uniform vec3 key = vec3(1.0, 0.0, 1.0);

void fragment() {
	vec4 c = texture(TEXTURE, UV);
	float d = distance(c.rgb, key);
	float a = smoothstep(0.2, 0.5, d);
	vec3 rgb = c.rgb;
	float spill = (1.0 - smoothstep(0.5, 0.9, d)) * 0.5;
	rgb.r = mix(rgb.r, min(rgb.r, rgb.g + 0.1), spill);
	rgb.b = mix(rgb.b, min(rgb.b, rgb.g + 0.1), spill);
	COLOR = vec4(rgb, c.a * a);
}
