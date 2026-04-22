#version 300 es
precision mediump float;

uniform sampler2D u_input;
uniform vec2 u_resolution;
uniform float u_limeThreshold;
uniform vec3 u_color2;

out vec4 fragColor;

// Returns 1.0 for pixels matching u_color2 (the blob/high-end color), fading to 0
float limeness(vec3 col) {
  float thresh = u_limeThreshold > 0.0 ? u_limeThreshold : 0.30;
  return 1.0 - smoothstep(0.12, thresh, length(col - u_color2));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec4 src = texture(u_input, uv);

  float isLime = limeness(src.rgb);

  if (isLime < 0.05) {
    fragColor = src;
    return;
  }

  vec2 px = 1.0 / u_resolution;
  // Walk in this direction looking for the blob edge; shadow falls opposite
  vec2 shadowDir = normalize(vec2(1.5, -1.0));
  float shadowRadius = 16.0;

  float shadow = 0.0;
  for (float d = 1.0; d <= shadowRadius; d += 1.0) {
    vec2 sampleUV = uv + shadowDir * px * d;
    float edgeness = 1.0 - limeness(texture(u_input, sampleUV).rgb);
    float weight = 1.0 - (d - 1.0) / shadowRadius;
    shadow += edgeness * weight;
  }
  shadow = clamp(shadow / shadowRadius, 0.0, 1.0) * 0.7;

  vec3 shadowColor = u_color2 * 0.08; // shadow is a very dark tint of the blob color
  vec3 result = mix(src.rgb, shadowColor, shadow * isLime);

  fragColor = vec4(result, 1.0);
}
