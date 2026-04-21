#version 300 es
precision mediump float;

uniform sampler2D u_input;
uniform vec2 u_resolution;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec4 color = texture(u_input, uv);

  // Detect yellow: high R + high G, lower B
  float r = color.r;
  float g = color.g;
  float b = color.b;

  // Yellow detection: R and G are dominant, B is relatively low
  float yellowness = (r + g) / 2.0 - b * 0.5;

  // Threshold to isolate yellow regions
  float isYellow = smoothstep(0.3, 0.5, yellowness);

  // Bloom mask: 1 where we want bloom, 0 where we don't (yellow areas)
  float bloomMask = 1.0 - isYellow;

  // Output: mask in red channel, original color in RGB
  fragColor = vec4(color.rgb, bloomMask);
}
