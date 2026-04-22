#version 300 es
precision highp float;

uniform vec2  u_resolution;
uniform float u_time;

// 0=FBM  1=Cellular  2=DomainWarp  3=Voronoi  4=WaveInterference  5=Curl
uniform float u_noiseType;

// Shared
uniform float u_scale;
uniform float u_speed;

// FBM / DomainWarp / Curl
uniform float u_octaves;
uniform float u_lacunarity;
uniform float u_gain;

// Cellular / Voronoi
uniform float u_jitter;
uniform float u_distanceMode;  // 0=F1  1=F2  2=F2-F1

// DomainWarp
uniform float u_warpStrength;
uniform float u_warpScale;

// Voronoi
uniform float u_edgeSharpness;

// Wave Interference
uniform float u_waveCount;
uniform float u_frequency;
uniform float u_angleSpread;

// Curl
uniform float u_curlStrength;

out vec4 fragColor;

// ── Primitives ───────────────────────────────────────────────────────

float hash(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
}

vec2 hash2(vec2 p) {
  return fract(sin(vec2(
    dot(p, vec2(127.1, 311.7)),
    dot(p, vec2(269.5, 183.3))
  )) * 43758.5453);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i),                hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

// ── FBM ─────────────────────────────────────────────────────────────

float fbm(vec2 p) {
  float val = 0.0, amp = 0.5, freq = 1.0;
  int oct = int(round(clamp(u_octaves, 1.0, 8.0)));
  for (int i = 0; i < 8; i++) {
    if (i >= oct) break;
    val  += amp * valueNoise(p * freq);
    freq *= u_lacunarity;
    amp  *= u_gain;
  }
  return val;
}

// ── Cellular ────────────────────────────────────────────────────────

float cellular(vec2 p) {
  vec2  i  = floor(p);
  vec2  f  = fract(p);
  float F1 = 8.0, F2 = 8.0;
  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      vec2  n  = vec2(float(x), float(y));
      vec2  pt = hash2(i + n) * u_jitter + n;
      float d  = length(pt - f);
      if      (d < F1) { F2 = F1; F1 = d; }
      else if (d < F2) { F2 = d; }
    }
  }
  int mode = int(round(u_distanceMode));
  if (mode == 1) return clamp(F2 * 0.9,        0.0, 1.0);
  if (mode == 2) return clamp((F2 - F1) * 3.0, 0.0, 1.0);
  return clamp(F1 * 1.5, 0.0, 1.0);
}

// ── Domain Warp ─────────────────────────────────────────────────────

float domainWarp(vec2 p) {
  vec2 wp = p * u_warpScale;
  vec2 q  = vec2(fbm(wp), fbm(wp + vec2(5.2, 1.3)));
  return fbm(p + u_warpStrength * q);
}

// ── Voronoi ─────────────────────────────────────────────────────────

float voronoi(vec2 p) {
  vec2  i       = floor(p);
  vec2  f       = fract(p);
  float minDist = 8.0;
  vec2  minPt   = vec2(0.0);
  float cellVal = 0.0;

  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      vec2  n  = vec2(float(x), float(y));
      vec2  pt = hash2(i + n) * u_jitter + n;
      float d  = length(pt - f);
      if (d < minDist) { minDist = d; minPt = pt; cellVal = hash(i + n); }
    }
  }

  float edgeDist = 8.0;
  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      vec2 n  = vec2(float(x), float(y));
      vec2 pt = hash2(i + n) * u_jitter + n;
      if (length(pt - minPt) > 0.001) {
        float d = dot(f - 0.5 * (minPt + pt), normalize(pt - minPt));
        edgeDist = min(edgeDist, d);
      }
    }
  }

  float edge = smoothstep(0.0, u_edgeSharpness * 0.15 + 0.01, edgeDist);
  return mix(cellVal, edge, 0.6);
}

// ── Wave Interference ────────────────────────────────────────────────

float waveInterference(vec2 p, float t) {
  float val   = 0.0;
  int   count = int(round(clamp(u_waveCount, 1.0, 8.0)));
  for (int i = 0; i < 8; i++) {
    if (i >= count) break;
    float frac = count > 1 ? float(i) / float(count - 1) : 0.5;
    float a    = u_angleSpread * (frac - 0.5);
    vec2  dir  = vec2(cos(a), sin(a));
    val += sin(dot(p, dir) * u_frequency - t);
  }
  return val / float(count) * 0.5 + 0.5;
}

// ── Curl ────────────────────────────────────────────────────────────

float curlNoise(vec2 p) {
  const float eps = 0.005;
  float n1   = fbm(p + vec2(0.0,  eps));
  float n2   = fbm(p - vec2(0.0,  eps));
  float n3   = fbm(p + vec2(eps,  0.0));
  float n4   = fbm(p - vec2(eps,  0.0));
  vec2  curl = vec2(n1 - n2, -(n3 - n4)) / (2.0 * eps);
  return fbm(p + curl * u_curlStrength);
}

// ── Main ────────────────────────────────────────────────────────────

void main() {
  vec2  uv = gl_FragCoord.xy / u_resolution;
  float t  = u_time * u_speed;
  vec2  p  = uv * u_scale + vec2(t * 0.13, t * 0.07);

  int   type = int(round(u_noiseType));
  float n    = 0.5;
  if      (type == 0) n = fbm(p);
  else if (type == 1) n = cellular(p);
  else if (type == 2) n = domainWarp(p);
  else if (type == 3) n = voronoi(p);
  else if (type == 4) n = waveInterference(uv * u_scale, t);
  else if (type == 5) n = curlNoise(p);

  fragColor = vec4(clamp(n, 0.0, 1.0), 0.0, 0.0, 1.0);
}
