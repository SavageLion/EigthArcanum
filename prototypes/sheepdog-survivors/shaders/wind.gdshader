shader_type canvas_item;
// Sways anything anchored at its bottom: the top of the sprite leans with travelling gusts of wind.
uniform float amp = 0.12;
uniform float strength = 1.0;
uniform float phase = 0.0;
uniform vec2 actors[8];
void vertex() {
	vec2 wp = (MODEL_MATRIX * vec4(VERTEX, 0.0, 1.0)).xy;
	float g = max(0.0, sin(TIME * 0.38 - wp.x * 0.0045 + wp.y * 0.002));
	g = g * g * g;
	float w = sin(TIME * 1.5 - wp.x * 0.012 + wp.y * 0.004) * 0.06 + g * 0.2 + sin(TIME * 0.7) * 0.015;
	w += sin(TIME * 2.1 + phase + wp.x * 0.5) * 0.02;
	float h = 1.0 - UV.y;
	VERTEX.x += w * strength * h * (1.0 / TEXTURE_PIXEL_SIZE.y) * amp * 6.0;
	vec2 base = MODEL_MATRIX[3].xy;
	for (int a = 0; a < 8; a++) {
		vec2 d = base - actors[a];
		float dist = length(vec2(d.x, d.y * 1.4));
		float f = clamp(1.0 - dist / 62.0, 0.0, 1.0);
		VERTEX.x += sign(d.x) * f * f * h * (1.0 / TEXTURE_PIXEL_SIZE.y) * 0.45;
	}
}
