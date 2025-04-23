// Enhanced Starry Space Shader
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;

// Simple 2D random function
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// Noise based on simple random function
float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
           (c - a) * u.y * (1.0 - u.x) +
           (d - b) * u.x * u.y;
}

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    st.x *= u_resolution.x / u_resolution.y;

    // Multiple layers of stars for depth effect
    float stars1 = noise(st * 150.0);
    float stars2 = noise(st * 75.0);
    float stars3 = noise(st * 25.0);

    // Thresholds for star effects
    float brightness = step(0.852, stars1) + step(0.810, stars2) * 0.6 + step(0.510, stars3) * 0.3;

    // Twinkling effect
    brightness *= smoothstep(0.926, 1.0, noise(st * 100.0 + u_time));

    // Nebula effect using soft noise
    float nebula = smoothstep(0.4, 0.6, noise(st * 3.0 + u_time * 0.05));
    vec3 nebulaColor = vec3(0.048, 0.095, 0.190) * nebula;

    vec3 starColor = vec3(brightness);

    // Space background color
    vec3 spaceColor = vec3(0.0, 0.0, 0.05);

    gl_FragColor = vec4(mix(spaceColor + nebulaColor, vec3(1.0), starColor), 1.0);
}
