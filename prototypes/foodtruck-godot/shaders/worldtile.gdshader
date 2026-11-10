shader_type canvas_item;
// Tiles a texture in WORLD space so ground, roads and pavements line up pixel-perfectly on any shape (curves included).
uniform sampler2D tex : filter_nearest, repeat_enable;
uniform vec2 tex_size = vec2(112.0, 112.0);
varying vec2 wpos;

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 0.0, 1.0)).xy;
}

void fragment() {
	COLOR = vec4(texture(tex, wpos / tex_size).rgb, 1.0) * COLOR.a;
}
