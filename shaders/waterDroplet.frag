#version 300 es
precision mediump float;

uniform vec2      u_resolution;
uniform sampler2D u_input;  // noise pass output (R channel = lutCoord)
uniform vec3      u_color0;
uniform vec3      u_color1;
uniform vec3      u_color2;

out vec4 fragColor;

void main() {
  vec2  uv       = gl_FragCoord.xy / u_resolution;
  float lutCoord = texture(u_input, uv).r;

  vec3 color = lutCoord < 0.5
    ? mix(u_color0, u_color1, lutCoord * 2.0)
    : mix(u_color1, u_color2, (lutCoord - 0.5) * 2.0);

  fragColor = vec4(color, 1.0);
}
