// Fragment shaders for the Gradients, Abstract and Animated theme families.
// Each program reads up to 6 palette colors (uC) and 4 parameters (uP); themes are just data.

export const HEADER = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uC[6];
uniform vec4 uP;
varying vec2 vUv;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
float fbm3(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 1.9 + vec2(3.1, 7.7); a *= 0.5; }
  return v / 0.875;
}
vec3 hsv(float h, float s, float v) { vec3 k = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); return v * mix(vec3(1.0), k, s); }
float grain(vec2 fc, float t) { return hash(fc + fract(t * 7.0) * 100.0) - 0.5; }
`

/** Soft mesh gradient: six color points drifting around, blended by inverse distance and warped by noise. */
const mesh = /* glsl */ `
void main() {
  vec2 uv = vUv;
  float ar = uRes.x / uRes.y;
  float t = uTime * uP.z;
  uv += 0.09 * vec2(fbm(uv * 2.0 + t * 0.07), fbm(uv * 2.0 - t * 0.06 + 3.1)) - 0.045;
  vec3 col = vec3(0.0); float ws = 0.0;
  vec2 anchors[6];
  anchors[0] = vec2(0.08, 0.88); anchors[1] = vec2(0.04, 0.32); anchors[2] = vec2(0.82, 0.18);
  anchors[3] = vec2(0.98, 0.02); anchors[4] = vec2(0.58, 0.98); anchors[5] = vec2(0.55, 0.5);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    vec2 c = anchors[i] + uP.w * vec2(sin(t * (0.21 + fi * 0.037) + fi * 1.7), cos(t * (0.17 + fi * 0.029) + fi * 2.3));
    float d = length((uv - c) * vec2(ar, 1.0));
    float w = 1.0 / pow(d + 0.04, uP.x);
    col += uC[i] * w; ws += w;
  }
  col /= ws;
  col += grain(gl_FragCoord.xy, uTime) * uP.y;
  gl_FragColor = vec4(col, 1.0);
}`

/** Glowing heart (iq's heart SDF) breathing over a two-tone background. */
const heart = /* glsl */ `
float dot2(vec2 v) { return dot(v, v); }
float sdHeart(vec2 p) {
  p.x = abs(p.x);
  if (p.y + p.x > 1.0) return sqrt(dot2(p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
  return sqrt(min(dot2(p - vec2(0.0, 1.0)), dot2(p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
}
void main() {
  vec2 uv = vUv;
  float ar = uRes.x / uRes.y;
  vec3 bg = mix(uC[0], uC[1], smoothstep(0.0, 1.0, uv.y + 0.15 * sin(uTime * 0.2 + uv.x * 3.0)));
  float pulse = 1.0 + 0.04 * sin(uTime * 1.3);
  vec2 p = (uv - vec2(0.5, 0.36)) * vec2(ar, 1.0) * 2.6 / pulse;
  float d = sdHeart(p);
  float glow = exp(-max(d, 0.0) * uP.x) * (0.85 + 0.15 * sin(uTime * 1.3));
  float core = smoothstep(0.12, -0.25, d);
  vec3 col = mix(bg, uC[2], glow * 0.9);
  col = mix(col, uC[3], core * 0.75);
  col += grain(gl_FragCoord.xy, uTime) * uP.y;
  gl_FragColor = vec4(col, 1.0);
}`

/** Lens flare: a big bloom rising from below plus a soft secondary glow; uP.w > 0 cycles hues (rainbow). */
const flare = /* glsl */ `
void main() {
  vec2 uv = vUv;
  float ar = uRes.x / uRes.y;
  float t = uTime * uP.z;
  vec2 c1 = vec2(0.32 + 0.08 * sin(t * 0.3), -0.18 + 0.05 * cos(t * 0.27));
  vec2 c2 = vec2(0.78 + 0.06 * cos(t * 0.23), 0.12 + 0.05 * sin(t * 0.31));
  float d1 = length((uv - c1) * vec2(ar, 1.0));
  float d2 = length((uv - c2) * vec2(ar, 1.0));
  vec3 a = uC[1], b = uC[2];
  if (uP.w > 0.0) { a = hsv(fract(uv.x * 0.6 + t * 0.03), 0.75, 1.0); b = hsv(fract(uv.x * 0.6 + 0.35 + t * 0.03), 0.7, 1.0); }
  vec3 col = uC[0];
  col = mix(col, a, clamp(exp(-d1 * uP.x) * 1.25, 0.0, 1.0));
  col = mix(col, b, exp(-d2 * uP.x * 1.7) * 0.75);
  col += mix(a, vec3(1.0), 0.6) * exp(-d1 * uP.x * 4.0) * 0.35;
  col += grain(gl_FragCoord.xy, uTime) * uP.y;
  gl_FragColor = vec4(col, 1.0);
}`

/** Flowing ribbons of light across a dark field. */
const ribbon = /* glsl */ `
void main() {
  vec2 uv = vUv;
  float t = uTime * uP.z;
  vec3 col = uC[0];
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float y = 0.5 + 0.18 * sin(uv.x * (3.0 + fi) + t * (0.4 + fi * 0.1) + fi * 2.0) + (fi - 1.0) * 0.08;
    float w = 0.05 + 0.03 * sin(uv.x * 5.0 + t + fi);
    float d = abs(uv.y - y);
    float band = exp(-d * d / (w * w) * 2.0);
    vec3 c = i == 0 ? uC[1] : i == 1 ? uC[2] : uC[3];
    col = mix(col, c, band * 0.85);
    col += c * exp(-d * 40.0) * 0.3;
  }
  col += grain(gl_FragCoord.xy, uTime) * uP.y;
  gl_FragColor = vec4(col, 1.0);
}`

/**
 * Domain-warped noise: uP.w picks the look.
 * 0 = liquid metal ripple, 1 = silk, 2 = sonar blobs, 3 = cirrus clouds.
 */
const liquid = /* glsl */ `
void main() {
  vec2 uv = vUv;
  float ar = uRes.x / uRes.y;
  vec2 p = uv * vec2(ar, 1.0) * uP.x;
  float t = uTime * uP.z;
  vec2 q = vec2(fbm3(p + t * 0.05), fbm3(p + vec2(5.2, 1.3) - t * 0.04));
  vec2 r = vec2(fbm3(p + 1.8 * q + vec2(1.7, 9.2) + t * 0.07), fbm3(p + 1.8 * q + vec2(8.3, 2.8) - t * 0.05));
  float f = fbm3(p + 1.8 * r);
  vec3 col;
  if (uP.w < 0.5) {
    float bands = sin(f * 7.0 + t * 0.5);
    col = mix(uC[3], uC[0], smoothstep(-0.9, 0.2, bands));
    col = mix(col, uC[1], smoothstep(0.2, 0.85, bands));
    col = mix(col, uC[2], pow(smoothstep(0.75, 1.0, bands), 2.0));
  } else if (uP.w < 1.5) {
    float fold = sin(f * 5.0 + r.x * 2.0 + t * 0.3);
    col = mix(uC[3], uC[0], smoothstep(-1.0, 0.3, fold));
    col = mix(col, uC[1], smoothstep(0.3, 0.9, fold));
    col = mix(col, uC[2], pow(smoothstep(0.85, 1.0, fold), 3.0) * 0.9);
  } else if (uP.w < 2.5) {
    float b = smoothstep(0.42, 0.6, f);
    col = mix(uC[3], uC[0], smoothstep(0.2, 0.45, f));
    col = mix(col, uC[1], b);
    col = mix(col, uC[2], smoothstep(0.6, 0.8, f) * 0.8);
  } else {
    float cl = smoothstep(0.42, 0.78, f + 0.15 * (1.0 - uv.y));
    col = mix(mix(uC[0], uC[2], uv.y), uC[1], cl);
  }
  col += grain(gl_FragCoord.xy, uTime) * uP.y;
  gl_FragColor = vec4(col, 1.0);
}`

/** A rainbow light trail sweeping in from the bottom-left. */
const streak = /* glsl */ `
void main() {
  vec2 uv = vUv;
  float t = uTime * uP.z;
  float x = uv.x;
  float yc = 0.18 + 0.55 * pow(x, 1.6) + 0.02 * sin(t * 0.5 + x * 4.0);
  float w = 0.012 + 0.09 * pow(1.0 - x, 2.0);
  float d = (uv.y - yc) / w;
  vec3 col = uC[0];
  if (abs(d) < 1.0) col = hsv(0.02 + (d * 0.5 + 0.5) * 0.72, 0.85, 1.0) * smoothstep(0.0, 0.12, x) * smoothstep(1.02, 0.6, x);
  col += hsv(0.6, 0.6, 1.0) * exp(-abs(d) * 0.9) * 0.25 * smoothstep(0.0, 0.3, x);
  float pulse = exp(-pow((x - fract(t * 0.12)) * 8.0, 2.0)) * step(abs(d), 1.0);
  col += pulse * 0.5;
  col += grain(gl_FragCoord.xy, uTime) * uP.y;
  gl_FragColor = vec4(col, 1.0);
}`

/** Overlapping blurred light discs with a slight chromatic shift (Prism); uP.w = 1 renders a CRT bar instead. */
const prism = /* glsl */ `
void main() {
  vec2 uv = vUv;
  float ar = uRes.x / uRes.y;
  float t = uTime * uP.z;
  vec3 col = uC[0];
  if (uP.w > 0.5) {
    vec2 p = (uv - 0.5) * vec2(ar, 1.0);
    float box = smoothstep(0.55, 0.15, abs(p.x) / 1.2) * smoothstep(0.32, 0.05, abs(p.y));
    vec3 rb = hsv(fract(uv.x * 0.9 + t * 0.02), 0.8, 1.0);
    col = mix(col, rb, box);
    col *= 0.85 + 0.15 * sin(gl_FragCoord.y * 1.6);
    col *= smoothstep(1.2, 0.2, length(p));
  } else {
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      vec2 c = vec2(0.5 + 0.25 * sin(t * 0.2 + fi * 1.6), 0.5 + 0.2 * cos(t * 0.17 + fi * 2.1));
      vec3 k = i == 0 ? uC[1] : i == 1 ? uC[2] : i == 2 ? uC[3] : uC[4];
      float d = length((uv - c) * vec2(ar, 1.0));
      col += k * exp(-d * d * 5.0) * 0.9;
    }
    col = col / (1.0 + col * 0.35);
  }
  col += grain(gl_FragCoord.xy, uTime) * uP.y;
  gl_FragColor = vec4(col, 1.0);
}`

/** Rays fanning out from below the horizon, slowly turning. */
const sunburst = /* glsl */ `
void main() {
  vec2 uv = vUv;
  float ar = uRes.x / uRes.y;
  float t = uTime * uP.z;
  vec2 p = (uv - vec2(0.5, 0.02)) * vec2(ar, 1.0);
  float a = atan(p.y, p.x);
  float r = length(p);
  float rays = 0.5 + 0.5 * sin(a * 28.0 + t * 0.4 + sin(r * 6.0 - t) * 0.6);
  vec3 sky = mix(uC[0], uC[1], smoothstep(0.0, 1.0, uv.y));
  vec3 col = mix(sky, uC[2], rays * smoothstep(1.4, 0.1, r) * 0.6);
  col = mix(col, uC[3], exp(-r * 4.0));
  col += grain(gl_FragCoord.xy, uTime) * uP.y;
  gl_FragColor = vec4(col, 1.0);
}`

/** Soft-focus shapes over a pastel haze: uP.w 0 = flowers, 1 = doves, 2 = butterfly. */
const soft = /* glsl */ `
float flower(vec2 p, float r) {
  float a = atan(p.y, p.x);
  float k = r * (0.75 + 0.25 * cos(a * 6.0));
  return length(p) - k;
}
float bird(vec2 p, float flap) {
  p.x = abs(p.x);
  float wing = abs(p.y - flap * p.x * 1.6 + 0.6 * p.x * p.x) - 0.012 - 0.02 * (1.0 - p.x * 5.0);
  return max(wing, p.x - 0.18);
}
float butterfly(vec2 p, float flap) {
  p.x = abs(p.x) / max(flap, 0.2);
  float up = length((p - vec2(0.12, 0.08)) * vec2(1.0, 1.3)) - 0.12;
  float lo = length((p - vec2(0.09, -0.09)) * vec2(1.2, 1.0)) - 0.08;
  return min(up, lo);
}
void main() {
  vec2 uv = vUv;
  float ar = uRes.x / uRes.y;
  float t = uTime * uP.z;
  vec2 hz = uv + 0.05 * vec2(fbm(uv * 2.0 + t * 0.05), fbm(uv * 2.0 - t * 0.04));
  vec3 col = mix(uC[0], uC[1], smoothstep(0.0, 1.0, hz.y));
  col = mix(col, uC[2], smoothstep(0.6, 0.0, length((hz - vec2(0.3, 0.7)) * vec2(ar, 1.0))) * 0.5);
  vec2 P = uv * vec2(ar, 1.0);
  if (uP.w < 0.5) {
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      vec2 c = vec2((0.16 + fi * 0.23) * ar, 0.36 + 0.12 * sin(fi * 2.3) + 0.012 * sin(t + fi));
      float stem = abs(P.x - c.x - 0.03 * sin(P.y * 5.0 + fi + t * 0.3)) - 0.006;
      if (P.y < c.y) col = mix(col, uC[4], smoothstep(0.05, 0.0, stem) * 0.45);
      float an = t * 0.1 + fi;
      float d = flower(mat2(cos(an), -sin(an), sin(an), cos(an)) * (P - c), 0.13 + 0.04 * sin(fi * 3.1));
      float blur = 0.09 + 0.05 * fi;
      col = mix(col, i == 1 ? uC[5] : uC[3], smoothstep(blur, -blur * 0.5, d) * 0.8);
    }
  } else if (uP.w < 1.5) {
    for (int i = 0; i < 2; i++) {
      float fi = float(i);
      vec2 c = vec2((0.62 + fi * 0.08 + 0.02 * sin(t * 0.3 + fi)) * ar, 0.36 + fi * 0.06 + 0.02 * cos(t * 0.4 + fi));
      float d = bird((P - c) * (1.0 + fi * 0.3), sin(t * 3.0 + fi * 1.5) * 0.35);
      col = mix(col, uC[3], smoothstep(0.01, -0.005, d));
    }
  } else {
    vec2 c = vec2(0.5 * ar + 0.03 * sin(t * 0.5), 0.5 + 0.03 * cos(t * 0.7));
    float d = butterfly(P - c, abs(cos(t * 2.2)));
    col = mix(col, uC[3], smoothstep(0.06, -0.04, d) * 0.9);
    col = mix(col, uC[4], smoothstep(0.03, -0.06, d) * 0.6);
  }
  col += grain(gl_FragCoord.xy, uTime) * uP.y;
  gl_FragColor = vec4(col, 1.0);
}`

/** Lava lamp metaballs rising and merging. */
const lava = /* glsl */ `
void main() {
  vec2 uv = vUv;
  float ar = uRes.x / uRes.y;
  float t = uTime * uP.z;
  vec2 p = uv * vec2(ar, 1.0);
  float f = 0.0;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec2 c = vec2((0.15 + fi * 0.12) * ar + 0.08 * sin(t * 0.3 + fi), fract(0.1 + fi * 0.37 + t * (0.03 + fi * 0.006)) * 1.4 - 0.2);
    float r = 0.16 + 0.06 * sin(fi * 1.7);
    f += r * r / dot(p - c, p - c);
  }
  vec3 bg = mix(uC[0], uC[1], uv.y);
  vec3 blob = mix(uC[2], uC[3], uv.y);
  float m = smoothstep(1.4, 1.9, f);
  vec3 col = mix(bg, blob, m);
  col += uC[4] * smoothstep(0.9, 1.4, f) * (1.0 - m) * 0.45;
  col += grain(gl_FragCoord.xy, uTime) * uP.y;
  gl_FragColor = vec4(col, 1.0);
}`

/** Flat color with a whisper of vignette, for the minimalist themes. */
const solid = /* glsl */ `
void main() {
  vec2 uv = vUv;
  vec3 col = mix(uC[0], uC[1], length(uv - 0.5) * 1.2);
  col += grain(gl_FragCoord.xy, uTime) * uP.y;
  gl_FragColor = vec4(col, 1.0);
}`

export const PROGRAMS = { mesh, heart, flare, ribbon, liquid, streak, prism, sunburst, soft, lava, solid }
export type ProgramId = keyof typeof PROGRAMS
