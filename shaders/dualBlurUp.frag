#version 300 es
precision mediump float;

uniform vec2 u_resolution; // resolution of THIS pass's render target
uniform sampler2D u_input;

out vec4 fragColor;

void main() {
    vec2 texel = 1.0 / u_resolution;
    vec2 uv = gl_FragCoord.xy / u_resolution;

    // 8-tap upsample: 4 diagonal + 4 axis-aligned (weighted)
    vec4 sum  = texture(u_input, uv + vec2(-texel.x * 2.0, 0.0));
    sum      += texture(u_input, uv + vec2( texel.x * 2.0, 0.0));
    sum      += texture(u_input, uv + vec2(0.0, -texel.y * 2.0));
    sum      += texture(u_input, uv + vec2(0.0,  texel.y * 2.0));
    sum      += texture(u_input, uv + vec2(-texel.x, -texel.y)) * 2.0;
    sum      += texture(u_input, uv + vec2( texel.x, -texel.y)) * 2.0;
    sum      += texture(u_input, uv + vec2(-texel.x,  texel.y)) * 2.0;
    sum      += texture(u_input, uv + vec2( texel.x,  texel.y)) * 2.0;

    fragColor = sum / 12.0;
}
