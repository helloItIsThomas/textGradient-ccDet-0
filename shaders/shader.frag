#ifdef GL_ES
precision mediump float;
#endif

uniform float u_debug;
uniform float u_time;
uniform float u_brightness;

void main() {
    gl_FragColor = vec4(0.0, u_brightness, 0.0, 1.0);
}  