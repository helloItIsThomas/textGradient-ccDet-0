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

void main() {
    float texAR = u_texRes.x / u_texRes.y;
    texAR = u_texResW / u_texResH;
    float vAR = u_resolution.x / u_resolution.y;
    
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;

    float aspectRatio = u_resolution.x / u_resolution.y;
    if (aspectRatio > 1.0) { // Wider than tall
        // uv.x *= aspectRatio;
        uv.x = (uv.x - 0.5) * aspectRatio + 0.5;
    } else { // Taller or square
        // uv.y /= aspectRatio;
        uv.y = (uv.y - 0.5) / aspectRatio + 0.5;
    }
    
    uv.y *= texAR;

    vec4 color = vec4(0.0);
    vec2 center = vec2(0.5, 0.5);
    vec4 water = texture2D(u_tex, uv);

    color = water;

    vec2 square = step(0.2, abs(center - uv));
    // color = vec4(square.x, square.y, 0.0, 1.0);


    gl_FragColor = color;
}