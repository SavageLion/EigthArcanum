shader_type canvas_item;
// Iris wipe: everything outside a circle around the truck is dark; shrinking the radius closes the iris.
uniform float radius = 999.0;
uniform vec2 center = vec2(240.0, 135.0);

void fragment() {
	vec2 p = UV * vec2(480.0, 270.0);
	float d = distance(p, center);
	float a = smoothstep(radius - 2.0, radius + 2.0, d);
	COLOR = vec4(0.07, 0.05, 0.08, a);
}
