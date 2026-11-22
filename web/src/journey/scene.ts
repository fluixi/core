// The homepage scene: a reactive graph drawn in particles, which the reader travels through by
// scrolling. A pulse leaves the source, runs along the edges that read it, the branches that do
// not read it dim, then the particles gather into a browser window and the Fluixi mark.
//
// WebGL with no library, so the page that argues for a light framework stays light itself.

export interface JourneyOptions {
  /** Image whose opaque pixels the particles gather into at the end. */
  logoSrc: string;
  /** Still frame, no animation: `prefers-reduced-motion`, or the reader paused it. */
  paused: () => boolean;
}

export interface Journey {
  /** Draw one frame now, for a still scene after scrolling or a theme change. */
  redraw(): void;
  dispose(): void;
}

type Vec3 = [number, number, number];

interface GraphNode {
  p: Vec3;
  depth: number;
  reached: number;
}

interface GraphEdge {
  from: number;
  to: number;
  depth: number;
  reached: number;
}

// The end shape sits this far down the graph's depth axis.
const END_Z = -205;

const DARK_PALETTE: Vec3[] = [
  [0.37, 0.88, 0.56],
  [0.24, 0.86, 0.78],
  [0.13, 0.83, 0.93],
];
const LIGHT_PALETTE: Vec3[] = [
  [0.08, 0.5, 0.24],
  [0.06, 0.49, 0.43],
  [0.05, 0.45, 0.56],
];

const VERTEX = `
attribute vec3 aPos; attribute vec3 aWin; attribute vec3 aLogo; attribute vec4 aMeta; attribute vec3 aCol;
uniform mat4 uView; uniform mat4 uProj; uniform float uTime; uniform float uFront; uniform float uDim;
uniform float uMorphA; uniform float uMorphB; uniform float uSize; uniform float uLit; uniform float uLight;
varying vec3 vCol; varying float vAlpha; varying float vLight;
void main() {
  vLight = uLight;
  float kind = floor(aMeta.w); float rnd = fract(aMeta.w);
  vec3 p = mix(mix(aPos, aWin, uMorphA), aLogo, uMorphB);
  float drift = kind < 1.5 ? 0.35 : 1.2;
  p += vec3(sin(uTime * 0.6 + rnd * 40.0), cos(uTime * 0.5 + rnd * 31.0), sin(uTime * 0.4 + rnd * 17.0)) * drift * (1.0 - uMorphA * 0.8);
  vec4 mv = uView * vec4(p, 1.0);
  gl_Position = uProj * mv;
  float along = aMeta.x + aMeta.y;
  float wave = exp(-pow((uFront - along) * 2.6, 2.0)) * aMeta.z;
  float settled = step(along, uFront) * aMeta.z * uLit;
  float base = kind < 1.5 ? mix(0.55, 0.12, uDim * (1.0 - aMeta.z)) : 0.35 + 0.35 * sin(uTime * 1.3 + rnd * 60.0);
  if (kind > 1.5) base *= 0.6;
  float morph = kind < 1.5 ? uMorphA * 0.6 : 0.0;
  float glow = base + wave * 2.4 + settled * 0.5 + morph;
  vec3 hot = uLight > 0.5 ? vec3(0.0, 0.25, 0.22) : vec3(1.0);
  vCol = mix(aCol, hot, clamp(wave * 0.55, 0.0, 0.7));
  vAlpha = glow;
  float sz = kind < 1.5 ? 1.0 + wave * 1.6 : 0.7 + rnd * 0.9;
  gl_PointSize = clamp(uSize * sz * (60.0 / max(1.0, -mv.z)), 1.0, 9.0);
}`;

const FRAGMENT = `
precision mediump float; varying vec3 vCol; varying float vAlpha; varying float vLight;
void main() {
  vec2 d = gl_PointCoord - 0.5; float r = dot(d, d);
  if (r > 0.25) discard;
  float a = smoothstep(0.25, 0.0, r);
  if (vLight > 0.5) gl_FragColor = vec4(vCol, a * clamp(vAlpha * 0.55, 0.0, 0.9));
  else gl_FragColor = vec4(vCol * vAlpha * a, a * min(vAlpha, 1.0));
}`;

function smooth(a: number, b: number, v: number): number {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function perspective(fov: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}

function lookAt(eye: Vec3, center: Vec3): Float32Array {
  let z: Vec3 = [eye[0] - center[0], eye[1] - center[1], eye[2] - center[2]];
  const lz = Math.hypot(...z);
  z = [z[0] / lz, z[1] / lz, z[2] / lz];
  let x: Vec3 = [z[2], 0, -z[0]];
  const lx = Math.hypot(...x) || 1;
  x = [x[0] / lx, x[1] / lx, x[2] / lx];
  const y: Vec3 = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
  const dot = (v: Vec3) => v[0] * eye[0] + v[1] * eye[1] + v[2] * eye[2];
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x), -dot(y), -dot(z), 1]);
}

/** Whether the page behind the canvas is light, read from the theme's `--bg`. */
function pageIsLight(el: Element): boolean {
  const bg = getComputedStyle(el).backgroundColor || getComputedStyle(document.body).backgroundColor;
  const m = bg.match(/\d+(\.\d+)?/g);
  if (!m) return false;
  const [r, g, b] = m.map(Number);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140;
}

export function mountJourney(canvas: HTMLCanvasElement, options: JourneyOptions): Journey | null {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false });
  if (!gl) return null;

  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  let seed = 11;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;

  // One source, branching forward in depth. A child reads its parent's value when it is the
  // first child or by chance; only those branches light up.
  const nodes: GraphNode[] = [{ p: [0, 0, 0], depth: 0, reached: 1 }];
  const edges: GraphEdge[] = [];
  let frontier = [0];
  for (let depth = 1; depth <= 4; depth++) {
    const next: number[] = [];
    for (const pi of frontier) {
      const kids = depth === 1 ? 3 : 2 + Math.floor(rnd() * 2);
      for (let k = 0; k < kids; k++) {
        const r = 10 + depth * 13;
        const a = rnd() * Math.PI * 2;
        const parent = nodes[pi];
        const reached = parent.reached && (k === 0 || rnd() < 0.35) ? 1 : 0;
        nodes.push({
          p: [parent.p[0] * 0.4 + Math.cos(a) * r, parent.p[1] * 0.4 + Math.sin(a) * r * 0.62, -depth * 42 + gauss() * 6],
          depth,
          reached,
        });
        edges.push({ from: pi, to: nodes.length - 1, depth: depth - 1, reached });
        next.push(nodes.length - 1);
      }
    }
    frontier = next;
  }

  const perEdge = small ? 260 : 650;
  const perNode = small ? 320 : 820;
  const stars = small ? 5000 : 14000;
  const movable = edges.length * perEdge + nodes.length * perNode;
  const total = movable + stars;
  const pos = new Float32Array(total * 3);
  const win = new Float32Array(total * 3);
  const logo = new Float32Array(total * 3);
  const meta = new Float32Array(total * 4);
  const shade = new Float32Array(total);
  let n = 0;

  // A browser window in particles: frame, title bar and a few lines of content.
  const windowPoint = (o: number) => {
    const W = 64;
    const H = 40;
    const s = rnd();
    let x: number;
    let y: number;
    if (s < 0.45) {
      const e = rnd() * (2 * W + 2 * H);
      if (e < W) [x, y] = [-W / 2 + e, H / 2];
      else if (e < 2 * W) [x, y] = [-W / 2 + e - W, -H / 2];
      else if (e < 2 * W + H) [x, y] = [-W / 2, -H / 2 + e - 2 * W];
      else [x, y] = [W / 2, -H / 2 + e - 2 * W - H];
    } else if (s < 0.6) {
      [x, y] = [-W / 2 + rnd() * W, H / 2 - 5];
    } else {
      const line = Math.floor(rnd() * 5);
      const len = [0.7, 0.45, 0.85, 0.55, 0.3][line];
      [x, y] = [-W / 2 + 6 + rnd() * (W - 12) * len, H / 2 - 12 - line * 6];
    }
    win[o] = x + gauss() * 0.25;
    win[o + 1] = y + gauss() * 0.25;
    win[o + 2] = END_Z + gauss() * 0.6;
  };

  // kind: 0 edge, 1 node, 2 star. `tone` picks the palette entry, so a theme change only
  // rewrites colours.
  const put = (x: number, y: number, z: number, depth: number, t: number, reached: number, kind: number, tone: number) => {
    pos.set([x, y, z], n * 3);
    meta.set([depth, t, reached, kind + rnd() * 0.9], n * 4);
    shade[n] = tone;
    if (kind < 2) windowPoint(n * 3);
    else win.set([x, y, z], n * 3);
    logo.set(win.subarray(n * 3, n * 3 + 3), n * 3);
    n++;
  };

  for (const e of edges) {
    const A = nodes[e.from].p;
    const B = nodes[e.to].p;
    const C: Vec3 = [(A[0] + B[0]) / 2 + gauss() * 8, (A[1] + B[1]) / 2 + gauss() * 8, (A[2] + B[2]) / 2];
    for (let k = 0; k < perEdge; k++) {
      const t = rnd();
      const u = 1 - t;
      const spread = 0.35 + 0.9 * Math.sin(t * Math.PI);
      const at = (i: number) => u * u * A[i] + 2 * u * t * C[i] + t * t * B[i] + gauss() * spread;
      put(at(0), at(1), at(2), e.depth, t, e.reached, 0, e.depth % 3);
    }
  }
  for (const node of nodes) {
    for (let k = 0; k < perNode; k++) {
      const r = Math.abs(gauss()) * 2.4;
      const th = rnd() * Math.PI * 2;
      const ph = Math.acos(2 * rnd() - 1);
      put(
        node.p[0] + r * Math.sin(ph) * Math.cos(th),
        node.p[1] + r * Math.sin(ph) * Math.sin(th),
        node.p[2] + r * Math.cos(ph),
        node.depth - 0.0001,
        1,
        node.reached,
        1,
        node.depth % 3,
      );
    }
  }
  for (let s = 0; s < stars; s++) {
    const r = 140 + rnd() * 320;
    const th = rnd() * Math.PI * 2;
    const ph = Math.acos(2 * rnd() - 1);
    put(r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th) * 0.7, -100 + r * Math.cos(ph), -1, 0, 0, 2, 3);
  }

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('[journey] the scene shader did not link:', gl.getProgramInfoLog(prog));
    return null;
  }
  gl.useProgram(prog);

  const buffers: WebGLBuffer[] = [];
  const attribute = (name: string, data: Float32Array, size: number) => {
    const b = gl.createBuffer()!;
    buffers.push(b);
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    return b;
  };
  attribute('aPos', pos, 3);
  attribute('aWin', win, 3);
  const logoBuffer = attribute('aLogo', logo, 3);
  attribute('aMeta', meta, 4);
  const colors = new Float32Array(total * 3);
  const colorBuffer = attribute('aCol', colors, 3);

  const u = (name: string) => gl.getUniformLocation(prog, name);
  const U = {
    view: u('uView'), proj: u('uProj'), time: u('uTime'), front: u('uFront'), dim: u('uDim'),
    morphA: u('uMorphA'), morphB: u('uMorphB'), size: u('uSize'), lit: u('uLit'), light: u('uLight'),
  };
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);

  let light = false;
  const applyTheme = () => {
    light = pageIsLight(document.body);
    const palette = light ? LIGHT_PALETTE : DARK_PALETTE;
    const star: Vec3 = light ? [0.35, 0.45, 0.48] : [0.55, 0.75, 0.8];
    for (let i = 0; i < total; i++) colors.set(shade[i] === 3 ? star : palette[shade[i]], i * 3);
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
    gl.blendFunc(gl.SRC_ALPHA, light ? gl.ONE_MINUS_SRC_ALPHA : gl.ONE);
    if (light) gl.clearColor(1, 1, 1, 1);
    else gl.clearColor(0, 0, 0, 1);
    gl.uniform1f(U.light, light ? 1 : 0);
  };
  applyTheme();

  // The end: the particles gather into the mark's opaque pixels.
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = c.height = 96;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, 96, 96);
    const data = ctx.getImageData(0, 0, 96, 96).data;
    const pts: [number, number][] = [];
    for (let py = 0; py < 96; py++) for (let px = 0; px < 96; px++) if (data[(py * 96 + px) * 4 + 3] > 120) pts.push([px, py]);
    if (!pts.length) return;
    for (let k = 0; k < movable; k++) {
      const q = pts[Math.floor(rnd() * pts.length)];
      logo.set([(q[0] - 48) * 0.5 + gauss() * 0.15, (48 - q[1]) * 0.5 + gauss() * 0.15, END_Z + gauss() * 0.5], k * 3);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, logoBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, logo, gl.STATIC_DRAW);
    redraw();
  };
  img.src = options.logoSrc;

  const dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
  const resize = () => {
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniformMatrix4fv(U.proj, false, perspective(0.95, window.innerWidth / window.innerHeight, 0.1, 1200));
    gl.uniform1f(U.size, (small ? 2.2 : 2.6) * dpr);
    redraw();
  };

  let progress = 0;
  let time = 0;
  let lastNow = performance.now();
  let raf = 0;
  const scrollTarget = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? window.scrollY / max : 0;
  };

  const draw = () => {
    const p = progress;
    // Camera: in front of the source, along the graph, then facing the end shape.
    const travel = smooth(0.04, 0.72, p);
    const camZ = 70 - travel * 215;
    const calm = 1 - smooth(0.7, 0.8, p);
    const sway = Math.sin(p * 7) * 14 * calm;
    const settle = smooth(0.72, 0.82, p);
    const eye: Vec3 = [sway * (1 - settle), (6 + Math.sin(p * 5) * 8 * calm) * (1 - settle), camZ * (1 - settle) + (END_Z + 62) * settle];
    const look: Vec3 = [sway * 0.3 * (1 - settle), 0, (camZ - 60) * (1 - settle) + END_Z * settle];
    gl.uniformMatrix4fv(U.view, false, lookAt(eye, look));
    // The pulse idles at the top, then reaches deeper as the page goes on.
    const front = p < 0.08 ? (time * 0.5) % 1.2 : ((time * 0.55) % 1) + smooth(0.08, 0.62, p) * 4.2;
    const toLogo = smooth(0.9, 0.97, p);
    gl.uniform1f(U.time, time);
    gl.uniform1f(U.front, front);
    gl.uniform1f(U.dim, smooth(0.42, 0.55, p));
    gl.uniform1f(U.lit, smooth(0.42, 0.55, p));
    gl.uniform1f(U.morphA, smooth(0.74, 0.84, p) * (1 - toLogo) + toLogo);
    gl.uniform1f(U.morphB, toLogo);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, total);
  };

  const tick = (now: number) => {
    raf = 0;
    const paused = options.paused();
    if (!paused) time += Math.min(0.05, (now - lastNow) / 1000);
    lastNow = now;
    progress += (scrollTarget() - progress) * (paused ? 1 : 0.08);
    draw();
    if (!paused && !document.hidden) raf = requestAnimationFrame(tick);
  };
  function redraw() {
    if (!raf) raf = requestAnimationFrame(tick);
  }

  const onVisible = () => {
    lastNow = performance.now();
    redraw();
  };
  const themeWatch = new MutationObserver(() => {
    applyTheme();
    redraw();
  });
  themeWatch.observe(document.documentElement, { attributes: true });
  const scheme = window.matchMedia('(prefers-color-scheme: dark)');
  const onScheme = () => {
    applyTheme();
    redraw();
  };
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', redraw, { passive: true });
  document.addEventListener('visibilitychange', onVisible);
  scheme.addEventListener('change', onScheme);
  resize();

  return {
    redraw,
    dispose() {
      if (raf) cancelAnimationFrame(raf);
      themeWatch.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', redraw);
      document.removeEventListener('visibilitychange', onVisible);
      scheme.removeEventListener('change', onScheme);
      for (const b of buffers) gl.deleteBuffer(b);
      gl.deleteProgram(prog);
    },
  };
}
