#ifdef GL_ES
precision mediump float;
#endif

uniform float u_debug;
uniform float u_time;
uniform float u_brightness;
uniform vec2 u_resolution;
uniform sampler2D u_tex;
uniform vec2 u_texRes;
uniform float u_texResW;
uniform float u_texResH;

vec2 contain(float canvasAspect, float imageAspect) {
    vec2 scale;
    if (canvasAspect > imageAspect) {
        // Canvas is wider than image - scale by height
        // Image is taller than canvas - scale by height
        scale = vec2(imageAspect / canvasAspect, 1.0);
    } else {
        // Canvas is taller than image - scale by width
        // Image is wider than canvas - scale by width
        scale = vec2(1.0, canvasAspect / imageAspect);
    }
    return scale;
}

vec2 cover(float canvasAspect, float imageAspect) {
    vec2 scale;
    if (canvasAspect > imageAspect) {
        // Canvas is wider than image - scale by width
        // Image is taller than canvas - scale by width
        scale = vec2(1.0, canvasAspect / imageAspect);
    } else {
        // Canvas is taller than image - scale by height
        // Image is wider than canvas - scale by height
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
    
    vec4 water = texture2D(u_tex, uv);
    color = water;
    gl_FragColor = color;
}