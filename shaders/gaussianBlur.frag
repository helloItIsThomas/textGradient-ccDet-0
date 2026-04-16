#version 300 es
precision mediump float;

uniform vec2 u_resolution;
uniform vec2 u_direction; // (1,0) for horizontal, (0,1) for vertical
uniform float u_blurRadius; // blur size in pixels
uniform float u_blurMix;    // 0.0 = no blur (original), 1.0 = full blur
uniform sampler2D u_input;  // output of the preceding pass

const int MAX_SAMPLES = 64;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 texel = u_direction / u_resolution;

    // sigma scales with radius so the curve always looks smooth
    float sigma = max(u_blurRadius / 3.0, 0.001);
    // number of taps scales with radius, clamped to MAX_SAMPLES
    int taps = clamp(int(ceil(u_blurRadius)), 1, MAX_SAMPLES);

    // center tap
    float weightSum = 1.0;
    vec4 blurred = texture(u_input, uv);

    for (int i = 1; i < MAX_SAMPLES; i++) {
        if (i >= taps) break;
        float x = float(i);
        float w = exp(-(x * x) / (2.0 * sigma * sigma));
        weightSum += 2.0 * w;
        vec2 offset = texel * x;
        blurred += texture(u_input, uv + offset) * w;
        blurred += texture(u_input, uv - offset) * w;
    }

    blurred /= weightSum;

    vec4 original = texture(u_input, uv);
    fragColor = mix(original, blurred, u_blurMix);
}
