#version 300 es
precision mediump float;

uniform vec2 u_resolution; // resolution of THIS pass's render target
uniform sampler2D u_input;

out vec4 fragColor;

void main() {
    vec2 texel = 1.0 / u_resolution;
    vec2 uv = gl_FragCoord.xy / u_resolution;

    // 5-tap downsample: center + 4 diagonal offsets
    vec4 sum = texture(u_input, uv) * 4.0;
    sum += texture(u_input, uv + vec2(-texel.x, -texel.y));
    sum += texture(u_input, uv + vec2( texel.x, -texel.y));
    sum += texture(u_input, uv + vec2(-texel.x,  texel.y));
    sum += texture(u_input, uv + vec2( texel.x,  texel.y));

    fragColor = sum / 8.0;
}
