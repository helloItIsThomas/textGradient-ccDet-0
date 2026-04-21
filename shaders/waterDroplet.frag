#version 300 es
precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;
uniform sampler2D u_input;
uniform sampler2D u_lut;
uniform float u_intensity;
uniform float u_speed;
uniform float u_dropletCount;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;

  float intensity = u_intensity > 0.0 ? u_intensity : 0.3;
  float speed = u_speed > 0.0 ? u_speed : 1.0;
  float dropletCount = u_dropletCount > 0.0 ? u_dropletCount : 3.0;

  float waveHeight = 0.0;
  float wavePhase = 0.0;

  // Multiple droplets with different starting positions
  for (float i = 0.0; i < 10.0; i++) {
    if (i >= dropletCount) break;

    // Randomize droplet start position and timing
    vec2 dropletPos = vec2(
      0.5 + 0.3 * sin(i * 12.989 + u_time * speed * 0.3),
      0.5 + 0.3 * cos(i * 78.233 + u_time * speed * 0.25)
    );

    // Distance from this pixel to droplet center
    float dist = distance(uv, dropletPos);

    // Wave ripples using sin/cos
    float ripple = sin(dist * 20.0 - u_time * speed * 2.0) *
                   exp(-dist * 8.0);

    // Secondary wave for complexity
    float ripple2 = cos(dist * 15.0 - u_time * speed * 1.5 + i) *
                    exp(-dist * 6.0);

    // Radial wave outward
    float expandingWave = sin((dist - u_time * speed * 0.5) * 25.0) *
                          exp(-dist * 4.0);

    // Accumulate wave heights
    waveHeight += (ripple + ripple2 * 0.5 + expandingWave * 0.3) * intensity;
    wavePhase += ripple * 0.1 + ripple2 * 0.05;
  }

  // Add overall wave undulation for breathing effect
  float breathing = sin(u_time * speed * 0.7 + uv.y * 3.0) * 0.02 * intensity +
                    cos(u_time * speed * 0.6 + uv.x * 3.0) * 0.02 * intensity;
  waveHeight += breathing;

  // Normalize wave height to 0-1 range for LUT lookup
  float lutCoord = clamp((waveHeight + 1.0) / 2.0, 0.0, 1.0);

  // Sample liquid metal color from LUT (1D lookup in horizontal gradient)
  vec3 metalColor = texture(u_lut, vec2(lutCoord, 0.5)).rgb;

  fragColor = vec4(metalColor, 1.0);
}
