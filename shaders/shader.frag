#version 300 es
precision mediump float;

uniform float u_debug;
uniform float u_time;
uniform float u_brightness;
uniform vec2 u_resolution;
uniform sampler2D u_tex;
uniform vec2 u_texRes;
uniform float u_texResW;
uniform float u_texResH;

out vec4 fragColor;

vec2 contain(float canvasAspect, float imageAspect) {
    vec2 scale;
    if (canvasAspect > imageAspect) {
        scale = vec2(imageAspect / canvasAspect, 1.0);
    } else {
        scale = vec2(1.0, canvasAspect / imageAspect);
    }
    return scale;
}

vec2 cover(float canvasAspect, float imageAspect) {
    vec2 scale;
    if (canvasAspect > imageAspect) {
        scale = vec2(1.0, canvasAspect / imageAspect);
    } else {
        scale = vec2(imageAspect / canvasAspect, 1.0);
    }
    return scale;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;

    vec2 center = vec2(0.5, 0.5);
    vec4 color = vec4(0.0);
    vec2 vWH = vec2(u_resolution.x, u_resolution.y);
    vec2 texWH = vec2(u_texResW, u_texResH);

    float texAR = u_texResW / u_texResH;
    float vAR = u_resolution.x / u_resolution.y;

    vec2 scl = cover(vAR, texAR);

    uv = (uv - 0.5) / scl + 0.5;

    vec4 water = texture(u_tex, uv);
    color = water * 1.0;
    fragColor = color;
}
