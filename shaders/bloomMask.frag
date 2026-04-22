#version 300 es
precision mediump float;

uniform sampler2D u_input;
uniform vec2 u_resolution;
uniform vec3 u_color2;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec4 color = texture(u_input, uv);

  // Suppress bloom on blob (high-end color) regions
  float isBlobColor = 1.0 - smoothstep(0.15, 0.40, length(color.rgb - u_color2));
  float bloomMask = 1.0 - isBlobColor;

  // Output: mask in red channel, original color in RGB
  fragColor = vec4(color.rgb, bloomMask);
}
