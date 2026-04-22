#version 300 es
precision mediump float;

uniform sampler2D u_pass3;
uniform sampler2D u_input;
uniform vec2 u_resolution;
uniform float u_bloomStrength;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;

  // u_pass3 is the bloomMask output with color + mask in alpha
  vec4 masked = texture(u_pass3, uv);
  // u_input is the blurred result from dualBlur
  vec4 blurred = texture(u_input, uv);

  // Bloom mask is stored in alpha channel of the masked version
  float bloomMask = masked.a;

  // Strength control
  float strength = u_bloomStrength > 0.0 ? u_bloomStrength : 0.6;

  // Blend: where mask = 1, add bloom; where mask = 0, use original color
  vec3 bloomed = mix(masked.rgb, blurred.rgb, bloomMask * strength);

  fragColor = vec4(bloomed, 1.0);
}
