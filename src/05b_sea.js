// ======================= 05b 海面：FFT 风浪 + 涌浪 / 碎浪 / 崖岸拍浪 =======================
// 减配移植自 ShoreBreak（© Christopher Canavan / awakewithai.com，MIT）：
//   碎浪形态关键帧表、前坡形状函数、崩塌停顿时钟、解析上冲、FFT 风浪（LEAN）、水体光学常数。
// 泛化：全部在“海岸坐标场”（03b_shore.js）里计算，适用于整座岛；新增崖岸拍浪（ShoreBreak 没有）。
// 删去：浅水求解器、浪唇网格、飞沫粒子、屏幕空间折射（见 docs/SEA.md）。
const SEA = {
  height: 0.62,          // 外海涌浪的名义碎浪高度（米）；泊港内再乘 SHORE.lagoonGain
  period: [3.8, 4.8],    // 相邻两道浪的间隔（秒）
  delayScale: 0.5,       // 到达延迟压缩系数：浪线沿岸推进仍然连贯，同时在途事件数减半
  U10: 6.0, windDeg: 172, // FFT 风浪：10 米风速（米/秒）与风向（波传播方向，自 +z 向 +x 计的角度）
  L: [41.0, 7.3, 1.37], ROT: [17.0, -31.0, 43.0], CHOP: 0.85,
  amp: [1.6, 1.15, 0.75],
};
const SEA_BK = {
  T:  [-6.0, -4.0, -3.0, -2.0, -1.4, -1.0, -0.8, -0.55, -0.40, -0.33, -0.22, -0.12, -0.04, 0.0, 0.12, 0.30, 0.60, 0.85],
  ZA: [-23.0, -15.5, -11.3, -7.0, -4.3, -2.55, -1.85, -1.08, -0.625, -0.511, -0.461, -0.472, -0.477, -0.481, -0.475, -0.46, -0.44, -0.43],
  YA: [0.20, 0.24, 0.28, 0.33, 0.41, 0.46, 0.50, 0.548, 0.56, 0.553, 0.484, 0.392, 0.346, 0.300, 0.200, 0.080, 0.010, 0.0],
  YT: [-0.10, -0.10, -0.10, -0.10, -0.09, -0.08, -0.068, -0.068, -0.068, -0.068, -0.068, -0.068, -0.068, -0.068, -0.06, -0.04, -0.02, 0.0],
  LF: [8.0, 7.0, 6.0, 4.0, 2.2, 1.4, 1.04, 0.60, 0.46, 0.42, 0.42, 0.40, 0.38, 0.36, 0.40, 0.60, 1.0, 1.2],
  UW: [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.26, 0.12, 0.04, 0.02, 0.02, 0.02, 0.02, 0.05, 0.2, 0.3, 0.3],
  HW: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.62, 0.66, 0.54, 0.56, 0.53, 0.47, 0.41, 0.40, 0.5, 0.5, 0.5],
  M:  [1.6, 1.6, 1.6, 1.6, 1.6, 1.8, 2.0, 2.6, 3.2, 3.6, 4.5, 5.0, 5.5, 6.0, 4.0, 2.0, 2.0, 2.0],
  P:  [2.0, 2.0, 2.0, 2.0, 2.0, 2.0, 2.0, 2.0, 3.0, 3.0, 3.0, 3.0, 3.0, 3.0, 2.0, 2.0, 2.0, 2.0],
  ST: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.55, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.8, 0.3, 0.0, 0.0],
  LB: [4.0, 3.8, 3.6, 3.2, 2.9, 2.7, 2.6, 2.5, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4, 2.6, 3.0, 3.0],
};
function seaStageGLSL() {
  const K = SEA_BK, T = K.T, n = T.length, f = (v) => { const s = (+v).toPrecision(7); return /[.e]/.test(s) ? s : s + '.0'; };
  const herm = (A, i) => { const i0 = Math.max(i - 1, 0), i3 = Math.min(i + 2, n - 1), h = T[i + 1] - T[i];
    const m1 = (A[i + 1] - A[i0]) / Math.max(T[i + 1] - T[i0], 1e-4) * h, m2 = (A[i3] - A[i]) / Math.max(T[i3] - T[i], 1e-4) * h, a = A[i], b = A[i + 1];
    return [a, m1, -3 * a - 2 * m1 + 3 * b - m2, 2 * a + m1 - 2 * b + m2]; };
  const v4 = (a) => `vec4(${a.map(f).join(', ')})`;
  let c = 'BrkStage brkStage(float tn) {\n  float t0, iw; vec4 cz, cy, l0, l1, q0, q1;\n';
  for (let i = 0; i < n - 1; i++) {
    const d = (k) => K[k][i + 1] - K[k][i];
    c += `  ${i ? 'else ' : ''}${i < n - 2 ? `if (tn < ${f(T[i + 1])}) ` : ''}{ t0 = ${f(T[i])}; iw = ${f(1 / (T[i + 1] - T[i]))}; cz = ${v4(herm(K.ZA, i))}; cy = ${v4(herm(K.YA, i))}; `
      + `l0 = ${v4([K.YT[i], K.LF[i], K.UW[i], K.HW[i]])}; l1 = ${v4([d('YT'), d('LF'), d('UW'), d('HW')])}; q0 = ${v4([K.M[i], K.P[i], K.ST[i], K.LB[i]])}; q1 = ${v4([d('M'), d('P'), d('ST'), d('LB')])}; }\n`;
  }
  return c + `  float fr = clamp((tn - t0) * iw, 0.0, 1.0); vec4 fp = vec4(1.0, fr, fr * fr, fr * fr * fr); vec4 l = l0 + l1 * fr, q = q0 + q1 * fr;
  BrkStage g; g.za = dot(cz, fp); g.ya = dot(cy, fp); g.yt = l.x; g.lf = l.y; g.uw = l.z; g.hw = l.w; g.m = q.x; g.p = q.y; g.st = q.z; g.lb = q.w; return g;
}`;
}

// ---------------------------------------------------------------- 事件表（确定性）
class SeaSchedule {
  constructor(maxEvents, seed = 7) { this.max = maxEvents; this.R = mulberry32(seed); this.ev = []; this.next = -60; this.count = 0; this.nextSet = 7; }
  _r(a, b) { return a + (b - a) * this.R(); }
  extend(t) {
    while (this.next < t) {
      let gain = 1; this.count++;
      if (this.count >= this.nextSet) { gain = 1.3 * this._r(0.9, 1.1); if (this.count >= this.nextSet + 2) { this.count = 0; this.nextSet = Math.floor(this._r(6, 10)); } }
      this.ev.push({ t0: this.next, H: gain * this._r(0.8, 1.2), seed: this.R(), style: this._r(0.45, 1.0), spill: this.R() < 0.3 ? this._r(0.6, 1) : this._r(0, 0.6), peel: this._r(0.7, 1.6), ph: this.R() });
      this.next += this._r(SEA.period[0], SEA.period[1]) * (gain > 1 ? 1.1 : 1);
    }
    const cut = this.ev.findIndex((e) => e.t0 > t - 400); if (cut > 0) this.ev.splice(0, cut);
  }
  pack(t, U, delayMax) {
    const rs = Math.sqrt(SEA.height * 1.6 / 0.45), ahead = 10.5 * rs + 2, behind = delayMax * SEA.delayScale + 26;
    this.extend(t + ahead + 10);
    const live = this.ev.filter((e) => e.t0 > t - behind - e.peel && e.t0 < t + ahead + e.peel).slice(-this.max);
    const A = U.uEvtA.value, B = U.uEvtB.value; A.fill(0); B.fill(0);
    live.forEach((e, i) => { A.set([e.t0, e.H * SEA.height, e.seed, 1], i * 4); B.set([e.style, e.spill, e.peel, e.ph], i * 4); });
    U.uEvtCount.value = live.length;
  }
}

// ---------------------------------------------------------------- FFT 风浪（r160：单目标、打包实数场）
// 三个级联的实数场打包成两个复数 FFT：T1 = (h0 + i·dx0, dz0 + i·h1)，T2 = (h2 + i·0, 0)。
function seaJonswap(w, U10, fetch = 30000, gamma = 3.3) {
  const g = 9.81, wp = 22 * Math.pow(g * g / (U10 * fetch), 1 / 3), a = 0.076 * Math.pow(U10 * U10 / (fetch * g), 0.22), sig = w <= wp ? 0.07 : 0.09;
  return a * g * g / w ** 5 * Math.exp(-1.25 * (wp / w) ** 4) * Math.pow(gamma, Math.exp(-((w - wp) ** 2) / (2 * sig * sig * wp * wp)));
}
function seaBuildH0(N, nc) {
  const R = mulberry32(1234), gauss = () => { const u = Math.max(R(), 1e-9), v = R(), m = Math.sqrt(-2 * Math.log(u)); return [m * Math.cos(2 * Math.PI * v), m * Math.sin(2 * Math.PI * v)]; };
  const band = [[0, 2 * Math.PI / 2.5], [2 * Math.PI / 2.5, nc > 2 ? 2 * Math.PI / 0.3 : 1e9], [2 * Math.PI / 0.3, 1e9]];
  const spread = [1.2, 0.6, 0.5], back = [0.1, 0.3, 0.4], out = [];
  for (let c = 0; c < nc; c++) {
    const L = SEA.L[c], dk = 2 * Math.PI / L, thw = (SEA.windDeg - SEA.ROT[c]) * Math.PI / 180;
    let norm = 0; for (let i = 0; i < 720; i++) { const q = Math.cos(-Math.PI + 2 * Math.PI * (i + 0.5) / 720); norm += (q > 0 ? q ** spread[c] : back[c] * (-q) ** spread[c]) * 2 * Math.PI / 720; }
    const re = new Float32Array(N * N), im = new Float32Array(N * N);
    for (let m = 0; m < N; m++) for (let n = 0; n < N; n++) {
      const kx = dk * (n < N / 2 ? n : n - N), kz = dk * (m < N / 2 ? m : m - N), k = Math.hypot(kx, kz), [g1, g2] = gauss();
      if (k < 1e-6 || k < band[c][0] || k >= band[c][1]) continue;
      const w = Math.sqrt(9.81 * k * (1 + (k / 370) ** 2)), dw = 9.81 * (1 + 3 * (k / 370) ** 2) / (2 * w);
      let d = Math.atan2(kx, kz) - thw; d = Math.atan2(Math.sin(d), Math.cos(d)); const cs = Math.cos(d);
      const D = (cs > 0 ? cs ** spread[c] : back[c] * (-cs) ** spread[c]) / norm;
      const S = seaJonswap(w, SEA.U10) * dw / k * D * Math.exp(-((k / 520) ** 2));
      const e = Math.sqrt(S * dk * dk / 2) / Math.SQRT2; re[m * N + n] = g1 * e; im[m * N + n] = g2 * e;
    }
    const data = new Float32Array(N * N * 4);
    for (let m = 0; m < N; m++) for (let n = 0; n < N; n++) {
      const o = (m * N + n) * 4, q = ((N - m) % N) * N + (N - n) % N;
      data[o] = re[m * N + n]; data[o + 1] = im[m * N + n]; data[o + 2] = re[q]; data[o + 3] = im[q];
    }
    const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.FloatType); t.needsUpdate = true; out.push(t);
  }
  return out;
}
const SEA_FS_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
class SeaFFT {
  constructor(renderer, N, nc) {
    this.r = renderer; this.N = N; this.nc = nc;
    const rt = (type, filt, mip, wrap) => { const t = new THREE.WebGLRenderTarget(N, N, { type, format: THREE.RGBAFormat, minFilter: mip ? THREE.LinearMipmapLinearFilter : filt, magFilter: filt, wrapS: wrap, wrapT: wrap, depthBuffer: false, stencilBuffer: false, generateMipmaps: mip }); return t; };
    this.ping = [rt(THREE.FloatType, THREE.NearestFilter, false, THREE.ClampToEdgeWrapping), rt(THREE.FloatType, THREE.NearestFilter, false, THREE.ClampToEdgeWrapping)];
    this.T = [rt(THREE.FloatType, THREE.NearestFilter, false, THREE.RepeatWrapping), rt(THREE.FloatType, THREE.NearestFilter, false, THREE.RepeatWrapping)];
    this.disp = rt(THREE.HalfFloatType, THREE.LinearFilter, true, THREE.RepeatWrapping);
    this.slope = [0, 1, 2].slice(0, nc).map(() => rt(THREE.HalfFloatType, THREE.LinearFilter, true, THREE.RepeatWrapping));
    const h0 = seaBuildH0(N, nc);
    const mk = (fs, u) => new THREE.ShaderMaterial({ vertexShader: SEA_FS_VERT, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false });
    this.mSpec = mk(`precision highp float; uniform sampler2D uA, uB, uC; uniform float uT, uSet; uniform vec3 uL; uniform float uChop; varying vec2 vUv;
      vec2 cm(vec2 a, vec2 b){ return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }
      vec2 hk(sampler2D s, float L, ivec2 p, out vec2 kn){ float dk = 6.283185307 / L; vec2 k = dk * vec2(p.x < ${N / 2} ? p.x : p.x - ${N}, p.y < ${N / 2} ? p.y : p.y - ${N});
        float kl = length(k); kn = kl > 1e-6 ? k / kl : vec2(0.0); vec4 h0 = texelFetch(s, p, 0);
        float w = sqrt(9.81 * kl * (1.0 + kl * kl / 136900.0)); float ph = mod(w * uT, 6.283185307); vec2 e = vec2(cos(ph), sin(ph));
        return cm(h0.xy, vec2(e.x, -e.y)) + cm(vec2(h0.z, -h0.w), e); }
      void main(){ ivec2 p = ivec2(gl_FragCoord.xy); vec2 kn0, kn1, kn2;
        if (uSet < 0.5) {
          vec2 h0 = hk(uA, uL.x, p, kn0); vec2 dx = cm(vec2(0.0, -1.0), h0) * kn0.x * uChop, dz = cm(vec2(0.0, -1.0), h0) * kn0.y * uChop;
          vec2 h1 = ${nc > 1 ? 'hk(uB, uL.y, p, kn1)' : 'vec2(0.0)'};
          gl_FragColor = vec4(h0 + vec2(-dx.y, dx.x), dz + vec2(-h1.y, h1.x));
        } else { vec2 h2 = ${nc > 2 ? 'hk(uC, uL.z, p, kn2)' : 'vec2(0.0)'}; gl_FragColor = vec4(h2, 0.0, 0.0); } }`,
      { uA: { value: h0[0] }, uB: { value: h0[1] || h0[0] }, uC: { value: h0[2] || h0[0] }, uT: { value: 0 }, uSet: { value: 0 }, uL: { value: new THREE.Vector3(...SEA.L) }, uChop: { value: SEA.CHOP } });
    // Stockham 基 2，逆变换；每个纹素同时变换两个复数（rg、ba）
    this.mFFT = mk(`precision highp float; uniform sampler2D uSrc; uniform float uNs, uDir; varying vec2 vUv;
      void main(){ ivec2 p = ivec2(gl_FragCoord.xy); int o = uDir < 0.5 ? p.x : p.y; int Ns = int(uNs);
        int r = o % (2 * Ns); int j = (o / (2 * Ns)) * Ns + (r % Ns);
        ivec2 pa = uDir < 0.5 ? ivec2(j, p.y) : ivec2(p.x, j), pb = uDir < 0.5 ? ivec2(j + ${N / 2}, p.y) : ivec2(p.x, j + ${N / 2});
        vec4 a = texelFetch(uSrc, pa, 0), b = texelFetch(uSrc, pb, 0);
        float ang = 6.283185307 * float(j % Ns) / float(2 * Ns); vec2 w = vec2(cos(ang), sin(ang));
        vec4 wb = vec4(w.x*b.x - w.y*b.y, w.x*b.y + w.y*b.x, w.x*b.z - w.y*b.w, w.x*b.w + w.y*b.z);
        gl_FragColor = r < Ns ? a + wb : a - wb; }`, { uSrc: { value: null }, uNs: { value: 1 }, uDir: { value: 0 } });
    this.mDisp = mk(`precision highp float; uniform sampler2D uT1; varying vec2 vUv;
      void main(){ vec4 a = texelFetch(uT1, ivec2(gl_FragCoord.xy), 0); gl_FragColor = vec4(a.y, a.x, a.z, 0.0); }`, { uT1: { value: this.T[0].texture } });
    this.mSlope = mk(`precision highp float; uniform sampler2D uSrc; uniform vec4 uCh; uniform float uL; varying vec2 vUv;
      float h(ivec2 q){ q = (q + ${N}) % ${N}; return dot(texelFetch(uSrc, q, 0), uCh); }
      void main(){ ivec2 p = ivec2(gl_FragCoord.xy); float s = ${N}.0 / (2.0 * uL);
        vec2 g = vec2(h(p + ivec2(1, 0)) - h(p - ivec2(1, 0)), h(p + ivec2(0, 1)) - h(p - ivec2(0, 1))) * s;
        gl_FragColor = vec4(g, g * g); }`, { uSrc: { value: null }, uCh: { value: new THREE.Vector4() }, uL: { value: 1 } });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); this.quad.frustumCulled = false;
    this.scene = new THREE.Scene(); this.scene.add(this.quad); this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.stages = Math.round(Math.log2(N));
  }
  _pass(m, target) { this.quad.material = m; this.r.setRenderTarget(target); this.r.render(this.scene, this.cam); }
  update(t) {
    const r = this.r, prevT = r.getRenderTarget(), prevX = r.xr.enabled, sets = this.nc > 2 ? 2 : 1;
    r.xr.enabled = false;
    this.mSpec.uniforms.uT.value = t;
    for (let s = 0; s < sets; s++) {
      this.mSpec.uniforms.uSet.value = s; this._pass(this.mSpec, this.ping[0]);
      let src = 0;
      for (const dir of [0, 1]) for (let k = 0; k < this.stages; k++) {
        const last = dir === 1 && k === this.stages - 1, dst = last ? this.T[s] : this.ping[1 - src];
        const u = this.mFFT.uniforms; u.uSrc.value = this.ping[src].texture; u.uNs.value = 1 << k; u.uDir.value = dir;
        this._pass(this.mFFT, dst); src = 1 - src;
      }
    }
    this._pass(this.mDisp, this.disp);
    const su = this.mSlope.uniforms, ch = [[this.T[0], [1, 0, 0, 0]], [this.T[0], [0, 0, 0, 1]], [this.T[1], [1, 0, 0, 0]]];
    for (let c = 0; c < this.nc; c++) { su.uSrc.value = ch[c][0].texture; su.uCh.value.set(...ch[c][1]); su.uL.value = SEA.L[c]; this._pass(this.mSlope, this.slope[c]); }
    r.setRenderTarget(prevT); r.xr.enabled = prevX;
  }
}

// ---------------------------------------------------------------- GLSL：海岸坐标 + 碎浪 + 崖岸
function seaGLSL(maxEvents) { return `
#define MAX_EV ${maxEvents}
uniform sampler2D uData, uShore0, uShore1, uShore2; uniform vec4 uGrid;
uniform vec4 uEvtA[MAX_EV]; uniform vec4 uEvtB[MAX_EV]; uniform int uEvtCount; uniform float uDelayScale;
float sk_h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 sk_h22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float sk_vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f); return mix(mix(sk_h12(i), sk_h12(i+vec2(1,0)), u.x), mix(sk_h12(i+vec2(0,1)), sk_h12(i+vec2(1,1)), u.x), u.y); }
float sk_gn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);
  vec2 a = sk_h22(i)*2.0-1.0, b = sk_h22(i+vec2(1,0))*2.0-1.0, c = sk_h22(i+vec2(0,1))*2.0-1.0, d = sk_h22(i+vec2(1,1))*2.0-1.0;
  return 1.6*mix(mix(dot(a,f), dot(b,f-vec2(1,0)), u.x), mix(dot(c,f-vec2(0,1)), dot(d,f-vec2(1,1)), u.x), u.y); }
float sk_sech2(float x){ float e = exp(-abs(x)); float s = 2.0*e/(1.0+e*e); return s*s; }
struct Coast { float n, zl, bed, slope, expo, delay, fine, lag, cliff; vec2 g, foot; vec4 N; };
Coast coastAt(vec2 xz) {
  vec2 uv = (xz - uGrid.xy + 0.5) / (uGrid.zw + 1.0);
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  vec4 a = texture2D(uShore0, uv), b = texture2D(uShore1, uv);
  Coast c;
  c.bed = mix(-40.0, texture2D(uData, uv).r, inside);
  c.n = mix(2000.0, a.x, inside); c.zl = -c.n;
  float gl = length(a.yz); c.g = gl > 1e-4 ? a.yz / gl : vec2(0.0, 1.0);
  c.foot = xz - a.x * c.g;
  c.slope = max(a.w, 0.01); c.expo = b.x * inside; c.delay = b.y * uDelayScale; c.fine = b.z; c.lag = b.w;
  c.cliff = smoothstep(0.3, 0.55, c.slope) * (1.0 - c.lag);
  c.N = texture2D(uShore2, uv);
  return c;
}
#define BRK_HREF 0.45
#define BRK_TEND 0.85
#define BRK_TBIRTH -10.0
struct Brk { float ti, H, zI, style, spill, str, seed, s, rs, D, hold, S, runup; };
struct BrkStage { float za, ya, yt, lf, uw, hw, m, p, st, lb; };
${seaStageGLSL()}
float brkRot(vec2 f, float ph){ return cos(ph) * f.x + sin(ph) * f.y; }
Brk brkAt(int i, Coast c) {
  vec4 A = uEvtA[i], B = uEvtB[i]; Brk b; float sd = A.z;
  b.S = clamp(1.35 * brkRot(c.N.xy, 6.2831853 * B.w), -1.0, 1.0);
  b.D = 0.05 + 0.25 * B.z * (b.S + 1.0);
  b.ti = A.x + c.delay + B.z * b.S + 0.012 * c.fine * (2.0 * fract(sd * 7.13) - 1.0);
  b.H = A.y * c.expo * (1.0 + 0.08 * brkRot(c.N.zw, 6.2831853 * fract(sd * 3.71))) * (1.0 - 0.12 * b.S);
  b.s = max(b.H, 0.03) / BRK_HREF; b.rs = sqrt(b.s);
  float steep = smoothstep(0.025, 0.12, c.slope);
  b.style = clamp(B.x * mix(0.2, 1.0, steep), 0.0, 1.0); b.spill = max(B.y, 0.85 * (1.0 - steep));
  b.str = A.w * step(0.03, b.H); b.seed = sd;
  b.zI = -clamp(1.15 * b.H / c.slope, 0.6, 40.0) + 0.25 * b.S * b.s + 0.05 * c.fine * (2.0 * fract(sd * 5.31) - 1.0);
  b.hold = 0.5 * (1.0 - smoothstep(0.3, 0.5, b.style));
  b.runup = 0.16 * brkRot(c.N.zw, 6.2831853 * fract(sd * 1.97 + 0.3));
  return b;
}
float brkTn(Brk b, float t) {
  float Dn = b.D / b.rs, a = (t - b.ti) / b.rs + Dn, Ts = -0.47 - 0.6 * Dn;
  float tn = a - Dn * smoothstep(Ts, Ts + max(1.6 * Dn, 1e-3), a);
  float h0 = 0.6 * b.hold, w = max(0.8 * b.hold, 1e-4), u = clamp((tn - h0) / w, 0.0, 1.0);
  float I = w * u * u * u * (1.0 - 0.5 * u) + max(tn - h0 - w, 0.0);
  return mix(tn, 0.15 * tn + 0.85 * I, step(0.0, tn) * step(1e-9, b.hold));
}
vec2 brkApex(Brk b, BrkStage g, float tn) { float k = mix(b.s, b.rs, smoothstep(-0.8, -2.0, tn)); return vec2(b.zI + (g.za + 3.75 * min(tn + 6.0, 0.0)) * k, g.ya * b.s); }
vec2 brkFcos(float u){ u = clamp(u, 0.0, 1.0); return vec2(0.5 + 0.5 * cos(3.14159265 * u), -1.5707963 * sin(3.14159265 * u)); }
vec2 brkFsteep(float u, float uw, float hw, float m, float p) {
  u = clamp(u, 0.0, 1.0);
  if (u < uw) { float r = u / uw, rp = pow(r, p), q = max(1.0 - rp, 1e-5); return vec2(hw + (1.0 - hw) * pow(q, 1.0 / p), max(-(1.0 - hw) * pow(r, p - 1.0) * pow(q, 1.0 / p - 1.0) / uw, -60.0)); }
  float w = max((1.0 - u) / (1.0 - uw), 0.0); return vec2(hw * pow(w, m), -hw * m * pow(w, max(m - 1.0, 0.0)) / (1.0 - uw));
}
vec2 brkShape(BrkStage g, float xi) {
  if (xi < 0.0) { float a = xi / g.lb, s2 = sk_sech2(a); return vec2(g.ya * s2, g.ya * (-2.0 / g.lb) * tanh(a) * s2); }
  if (xi > g.lf) { float e = (xi - g.lf) / 1.5, ex = exp(-e * e); return vec2(g.yt * ex, g.yt * ex * (-2.0 * e / 1.5)); }
  float u = xi / g.lf; vec2 F = mix(brkFcos(u), brkFsteep(u, g.uw, g.hw, g.m, g.p), g.st);
  return vec2(g.yt + (g.ya - g.yt) * F.x, (g.ya - g.yt) * F.y / g.lf);
}
// 全部事件在一点的叠加
struct SeaState { float eta, dz, crest, level, foam, lace, film, speed, glow; };
SeaState seaState(Coast c, float t) {
  SeaState S; S.eta = 0.0; S.dz = 0.0; S.crest = 0.0; S.level = 0.0; S.foam = 0.0; S.lace = 0.0; S.film = 0.0; S.speed = 0.0; S.glow = 0.0;
  if (c.n > 110.0 || c.n < -30.0) return S;
  float face = clamp(c.slope * 1.3, 0.04, 0.35), x = c.zl;
  float lastCover = -1e9;
  for (int i = 0; i < MAX_EV; i++) {
    if (i >= uEvtCount) break;
    Brk b = brkAt(i, c); if (b.str <= 0.0) continue;
    float tau = t - b.ti, tn = brkTn(b, t);
    // ---- 涌浪 / 碎浪高度场（崖岸：不进入陡峭阶段，靠岸前淡出，由上涌接手）
    if (tn > BRK_TBIRTH && tn < BRK_TEND && x < 0.6) {
      float tnS = mix(tn, min(tn, -1.2), c.cliff);
      BrkStage g = brkStage(tnS); vec2 A = brkApex(b, g, tnS);
      float xi = (x - A.x) / b.s; vec2 e = brkShape(g, xi);
      float amp = smoothstep(BRK_TBIRTH, BRK_TBIRTH + 2.5, tn) * (1.0 - smoothstep(0.6, BRK_TEND, tn)) * b.str * (1.0 - smoothstep(-1.0, 0.1, x));
      amp *= 1.0 - c.cliff * smoothstep(-1.4, -0.9, tn);
      S.eta += e.x * b.s * amp; S.dz += e.y * amp;
      float cw = xi < 0.0 ? exp(-pow(xi / 0.12, 2.0)) : exp(-pow((g.ya - e.x) / (0.025 + 0.1 * b.spill), 2.0));
      float onset = mix(-0.85, -0.30, smoothstep(0.3, 0.9, b.spill));
      float wc = mix(smoothstep(0.0, 0.4, (t - b.ti + b.D) / b.rs - onset) * 0.5, smoothstep(0.0, 0.12, (t - b.ti + b.D) / b.rs - onset), smoothstep(0.3, 0.9, b.spill));
      float post = 0.5 * smoothstep(0.0, 0.1, tn) * (1.0 - smoothstep(0.3, 0.7, tn));
      S.crest = max(S.crest, cw * amp * max(wc * (1.0 - smoothstep(-0.05, 0.1, tn)), post) * (1.0 - c.cliff));
      S.glow = max(S.glow, amp * g.st * smoothstep(0.35, 0.9, e.x / max(g.ya, 1e-3)) * (1.0 - c.cliff));
    }
    if (tau < -1.0 || tau > 26.0) continue;
    // ---- 崖岸：上涌、崖脚炸白、蕾丝向外漂散
    if (c.cliff > 0.01 && c.n > -0.3) {
      float r = max(c.n, 0.0);
      float surge = 1.3 * b.H * smoothstep(-0.25, 0.35, tau) * exp(-max(tau - 0.35, 0.0) / 0.8) * exp(-r / 1.6);
      S.eta += surge * c.cliff;
      float w = smoothstep(-0.1, 0.25, tau) * exp(-tau / 4.0), rf = 0.8 + 2.2 * sqrt(max(tau, 0.0)) * b.rs;
      S.foam = max(S.foam, c.cliff * w * smoothstep(rf + 0.8, rf - 0.8, r) * mix(0.7, 1.0, b.style));
      float lw = exp(-tau / 9.0) * smoothstep(0.4, 1.6, tau), rl = 1.5 + 0.45 * tau;
      S.lace = max(S.lace, c.cliff * lw * smoothstep(rl + 3.5, rl - 1.0, r) * exp(-r / 7.0));   // 蕾丝随离崖距离衰减（原先一直漂到离崖 15 m 以外，满是白色碎点）
    }
    // ---- 沙滩：弹道上冲、涌潮、湿膜（ShoreBreak 远场模型的简化版）
    if (c.cliff < 0.99 && x > b.zI - 0.5 && x < 25.0) {
      float Rv = 0.75 * b.H * (1.0 + b.runup), Rh = Rv / face, a = 9.81 * face / sqrt(1.0 + face * face), U = sqrt(2.0 * a * Rh);
      float cb = 2.6 * b.rs, tS = b.ti + (-b.zI) / cb, ts = t - tS;
      if (x < 0.0) {
        float bh = t - (b.ti + (x - b.zI) / cb);
        if (bh > 0.0 && bh < 6.0) { S.level = max(S.level, 0.18 * b.H * exp(-bh / 1.6)); S.foam = max(S.foam, exp(-bh / 1.5) * smoothstep(0.0, 0.08, bh)); S.lace = max(S.lace, exp(-bh / 5.0) * smoothstep(0.5, 2.0, bh) * 0.8); S.speed = max(S.speed, cb * exp(-bh / 0.8)); }
      } else if (x < Rh && ts > 0.0) {
        float disc = max(U * U - 2.0 * a * x, 0.0), tIn = (U - sqrt(disc)) / a, tOut = (U + sqrt(disc)) / a + 0.25;
        if (ts > tIn && ts < tOut + 3.0) {
          float xt = U * ts - 0.5 * a * ts * ts, drain = smoothstep(tOut - 0.2, tOut + 1.5, ts);
          if (ts < tOut) S.level = max(S.level, mix(min(0.05 * b.s, 0.12 * max(xt - x, 0.0) * face + 0.004), 0.0015, drain));
          S.foam = max(S.foam, exp(-ts / (1.3 * b.rs)) * smoothstep(0.0, 0.3, ts - tIn) * (1.0 - drain));
          S.lace = max(S.lace, exp(-ts / 3.0) * (1.0 - drain) * 0.7);
          S.speed = max(S.speed, abs(U - a * ts));
        }
        if (ts > tIn) lastCover = max(lastCover, tS + min(ts, tOut));
      }
    }
  }
  S.film = lastCover > -1e8 ? exp(-max(t - lastCover, 0.0) / 2.6) : 0.0;
  S.foam *= 1.0 - 0.0;
  return S;
}
`; }

// ---------------------------------------------------------------- FFT 采样
function seaChopGLSL(nc) {
  const R = SEA.ROT.map((d) => { const a = d * Math.PI / 180; return [Math.cos(a), Math.sin(a)]; });
  const m2 = ([c, s]) => `mat2(${c.toFixed(6)}, ${s.toFixed(6)}, ${(-s).toFixed(6)}, ${c.toFixed(6)})`;
  const cas = (i) => `{ vec2 uv = OCR${i} * xz / uOceanL[${i}]; vec4 s = texture2D(uSlope${i}, uv); vec2 m = s.xy * uOceanAmp[${i}]; vec2 v = max(s.zw - s.xy * s.xy, vec2(0.0)) * uOceanAmp[${i}] * uOceanAmp[${i}];
    float c2 = OCR${i}[0][0] * OCR${i}[0][0]; r += vec4(transpose(OCR${i}) * m, c2 * v.x + (1.0 - c2) * v.y, (1.0 - c2) * v.x + c2 * v.y); }`;
  return `
uniform sampler2D uDisp, uSlope0${nc > 1 ? ', uSlope1' : ''}${nc > 2 ? ', uSlope2' : ''}; uniform vec3 uOceanL, uOceanAmp;
${R.slice(0, nc).map((r, i) => `const mat2 OCR${i} = ${m2(r)};`).join('\n')}
vec3 chopDisp(vec2 xz, float fp) {
  float lod = max(log2(fp * ${256}.0 / uOceanL.x), 0.0);
  vec3 a = texture2DLodEXT_(uDisp, OCR0 * xz / uOceanL.x, lod).xyz * uOceanAmp.x;
  vec2 hz = transpose(OCR0) * a.xz; return vec3(hz.x, a.y, hz.y);
}
vec4 chopSlope(vec2 xz) { vec4 r = vec4(0.0); ${[0, 1, 2].slice(0, nc).map(cas).join('\n  ')} return r; }
`.replace('texture2DLodEXT_', 'textureLod');
}

// ---------------------------------------------------------------- 甲板遮罩
// deckDist(xz, k)：点到甲板范围的距离（范围内 ≤ 0）；k = 0 登岸浮台（轴对齐矩形），k = 1 游艇（船体局部坐标下的矩形，x -27.7～25、|z| ≤ 4.6）
const SEA_DECK_GLSL = `
uniform vec4 uFloat, uBoat;
#define SWASH_SLOPE 0.2
float deckDist(vec2 xz, int k) {
  if (k == 0) { vec2 d = abs(xz - uFloat.xy) - uFloat.zw; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
  vec2 r = xz - uBoat.xy, l = vec2(r.x * uBoat.z - r.y * uBoat.w, r.x * uBoat.w + r.y * uBoat.z), d = abs(l - vec2(-1.35, 0.0)) - vec2(26.35, 4.6);
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}`;
// ---------------------------------------------------------------- 海面材质
const SEA_FOAM_GLSL = `
float sk_wall(vec2 q) { vec2 i = floor(q), f = fract(q); float f1 = 8.0, f2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)); vec2 r = g + sk_h22(i + g) - f; float d = dot(r, r); if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d; }
  return 0.5 * (sqrt(f2) - sqrt(f1)); }
// 泡沫图案：撕裂的泡沫毯 (x) + 蕾丝网 (y)，两组随流漂移的坐标交替淡入淡出（flow-map 技巧）
vec2 sk_foamSet(vec2 p, float fp) {
  vec2 q = p * 6.0 + 0.6 * vec2(sk_gn(p * 4.2), sk_gn(p * 4.2 + 5.2));
  float hole = sk_wall(q * 0.9) + 0.25 * sk_gn(p * 1.7);
  float tear = smoothstep(0.05, 0.32, hole);
  vec2 ql = p * 10.5 + 0.55 * vec2(sk_gn(p * 5.8), sk_gn(p * 5.8 + 3.1));
  float lf = sk_wall(ql), we = max(0.042, 0.7 * fp * 10.5);
  float net = exp(-(lf * lf) / (we * we)) * (0.042 / we) * mix(0.2, 1.3, smoothstep(-0.3, 0.6, sk_gn(p * 2.1)));
  return vec2(tear, net);
}
vec2 sk_foam(vec2 xz, vec2 vel, float fp, float t) {
  float pa = fract(t / 4.0), pb = fract(t / 4.0 + 0.5), wa = 1.0 - abs(2.0 * pa - 1.0), wb = 1.0 - wa;
  vec2 A = sk_foamSet(xz - vel * pa * 4.0, fp), B = sk_foamSet(xz - vel * pb * 4.0 + 17.3, fp);
  return min((A * wa + B * wb) / max(sqrt(wa * wa + wb * wb), 1e-3), vec2(1.0));   // 两组交替时按能量归一会超过 1，截到 1
}`;
function makeSeaMaterial(dataTex, shoreTex, fft, opts) {
  const nc = fft.nc, U = {
    uTime: { value: 0 }, uData: { value: dataTex }, uGrid: { value: new THREE.Vector4(G.x0, G.z0, G.nx - 1, G.nz - 1) },
    uShore0: { value: shoreTex[0] }, uShore1: { value: shoreTex[1] }, uShore2: { value: shoreTex[2] },
    uEvtA: { value: new Float32Array(opts.maxEvents * 4) }, uEvtB: { value: new Float32Array(opts.maxEvents * 4) }, uEvtCount: { value: 0 }, uDelayScale: { value: opts.delayScale },
    uDisp: { value: fft.disp.texture }, uOceanL: { value: new THREE.Vector3(...SEA.L) }, uOceanAmp: { value: new THREE.Vector3(...SEA.amp) },
    uCenter: { value: new THREE.Vector2() }, uSeaDbg: { value: location.hash.includes('seadbg') ? 1 : 0 },
    uSun: { value: SUN_DIR }, uZen: { value: SKY.zenith }, uHor: { value: SKY.horizon }, uFog: { value: SKY.fog }, uFogD: { value: 0.00021 }, uCloudOn: { value: opts.clouds ? 1 : 0 },
    uUwC: { value: new THREE.Color(0.07, 0.28, 0.30) }, uUwD: { value: 0.08 }, uUwE: { value: 0 },   // 水下雾（17e 按所在水域写入）
    // 甲板遮罩：登岸浮台（中心 x、z，半宽、半长）与游艇（x、z、cos 航向、sin 航向），水面不得从甲板底下冒上来
    uFloat: { value: new THREE.Vector4(L.landing.x, L.landing.z, 3.05, 6.55) }, uBoat: { value: new THREE.Vector4(1e5, 1e5, 1, 0) },
  };
  fft.slope.forEach((rt, i) => { U['uSlope' + i] = { value: rt.texture }; });
  const COMMON = seaGLSL(opts.maxEvents) + seaChopGLSL(nc);
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide, transparent: true, uniforms: U,
    vertexShader: `uniform float uTime; uniform vec2 uCenter; varying vec3 vW; varying vec2 vXZ;
      ${COMMON}
      ${SEA_DECK_GLSL}
      void main() {
        vec2 xz = uCenter + position.xz; float dist = length(position.xz);
        Coast c = coastAt(xz); SeaState S = seaState(c, uTime);
        float base = c.bed > 0.0 ? ((c.cliff < 0.5 && c.slope <= SWASH_SLOPE && c.n > -25.0) ? c.bed + S.level : -1.0) : S.level, depth = base + S.eta - c.bed;
        float chopW = smoothstep(0.05, 0.8, depth) * (1.0 - 0.85 * clamp(abs(S.dz), 0.0, 1.0)) * (1.0 - smoothstep(150.0, 400.0, dist));
        vec3 ch = chopDisp(xz, max(dist * 0.017, 0.03)) * chopW; ch.xz *= 1.0 - smoothstep(25.0, 60.0, dist);
        vec3 P = vec3(xz.x + ch.x, base + S.eta + ch.y + (c.bed > 0.0 ? 0.008 : 0.0), xz.y + ch.z);
        // 甲板周边压低水面：浮台四周 4 m 内渐变到不高于 0.32（浮台顶面 0.5），游艇船体四周 3 m 内不高于 0.7（游泳平台 0.9）
        P.y = mix(min(P.y, 0.32), P.y, smoothstep(0.0, 4.0, deckDist(xz, 0)));
        P.y = mix(min(P.y, 0.7), P.y, smoothstep(0.0, 3.0, deckDist(xz, 1)));
        vW = P; vXZ = xz; gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0);
      }`,
    fragmentShader: `uniform float uTime, uFogD, uSeaDbg, uUwD, uUwE; uniform vec3 uSun, uZen, uHor, uFog, uUwC; varying vec3 vW; varying vec2 vXZ;
      ${GLSL_NOISE}
      ${GLSL_CLOUD}
      ${COMMON}
      ${SEA_DECK_GLSL}
      ${SEA_FOAM_GLSL}
      const vec3 SIGMA = vec3(0.30, 0.048, 0.040);   // 热带清水：比 ShoreBreak 的地中海水略清
      vec3 skyCol(vec3 R) { vec3 s = mix(uHor, uZen, pow(clamp(R.y, 0.0, 1.0), 0.5));
        if (uCloudOn > 0.5 && R.y > 0.02) { vec2 cq = vW.xz + R.xz / R.y * (${CLOUD.h.toFixed(1)} - vW.y); s = mix(s, vec3(0.9, 0.93, 0.96), cloudDen(cq, uTime) * 0.45 * smoothstep(0.05, 0.3, R.y)); }
        return s; }
      float fresnelW(float c) { c = clamp(c, 0.0, 1.0); float t = sqrt(max(1.0 - (1.0 - c * c) / 1.777, 0.0)); float rs = (c - 1.333 * t) / (c + 1.333 * t), rp = (1.333 * c - t) / (1.333 * c + t); return 0.5 * (rs * rs + rp * rp); }
      void main() {
        vec4 chS = chopSlope(vXZ);
        vec3 dPx = dFdx(vW), dPy = dFdy(vW); float fp = max(max(length(dPx), length(dPy)), 1e-4);
        vec3 V = normalize(cameraPosition - vW); float dist = length(cameraPosition - vW);
        if (deckDist(vXZ, 0) <= 0.0 || deckDist(vXZ, 1) <= 0.0) discard;   // 浮台、船体范围内不画水面（甲板底下不会透出水）
        if (!gl_FrontFacing && cameraPosition.y > vW.y + 0.05) discard;       // 相机在水面以上却看到背面：水面网格贴着陡坡翻折的假象（原先显示成一整片不透明的青绿色）
        if (!gl_FrontFacing) {                       // 水下仰视水面：与原海面相同（生态水域的雾色由 17e 写入 uUwC/uUwD/uUwE）
          float rip = vnoise(vW.xz * 0.6 + uTime * 0.4) * 0.6 + vnoise(vW.xz * 1.7 - uTime * 0.7) * 0.4;
          vec3 cu = mix(vec3(0.10, 0.36, 0.38), vec3(0.70, 0.90, 0.88), smoothstep(0.3, 0.95, rip) * exp(-dist * 0.04));
          // 与场景雾相同的指数平方雾，并与 three.js 一样在色调映射之后混合，远处与海底、背景的雾色严丝合缝（否则水下远处出现硬边）
          float uf = uUwE > 0.5 ? 0.0 : 1.0 - exp(-dist * uUwD);
          gl_FragColor = vec4(mix(cu, uUwC, uf), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          if (uUwE > 0.5) gl_FragColor.rgb = mix(gl_FragColor.rgb, uUwC, 1.0 - exp(-dist * dist * uUwD * uUwD));
          return;
        }
        Coast c = coastAt(vXZ); SeaState S = seaState(c, uTime);
        float hCol = max(c.bed, 0.0) + S.level + S.eta - c.bed;
        if (c.bed > 0.0 && (c.cliff > 0.5 || c.slope > SWASH_SLOPE || c.n < -25.0 || (hCol < 0.012 && S.foam < 0.2))) discard;
        // 岸边水面网格被抬成陡面：贴着岩石的上涌水片（崖岸的浪不会变陡，陡面都是网格被上涌抬起的假象）与陆上翻折，泡沫图案会被拉成竖条，直接不画
        float steepY = abs(normalize(cross(dPx, dPy)).y);
        if ((c.bed > -0.3 || c.cliff > 0.3) && steepY < 0.6) discard;
        float chopW = smoothstep(0.03, 0.6, hCol) * (1.0 - 0.85 * clamp(abs(S.dz), 0.0, 1.0));
        vec2 g = -S.dz * c.g + chS.xy * chopW;
        vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
        float nv = dot(N, V); if (nv < 0.02) N = normalize(N + V * (0.02 - nv));
        float NoV = max(dot(N, V), 1e-3);
        vec2 var2 = chS.zw * chopW * chopW + 0.0009;
        float F = fresnelW(NoV);
        vec3 R = reflect(-V, N);
        vec3 refl = skyCol(R) * F;
        float csh = uCloudOn > 0.5 ? cloudShadow(vW, uSun, uTime) : 0.0;
        // 太阳：LEAN 高斯微面分布
        vec3 H = normalize(V + uSun); float cH = max(dot(H, N), 0.05); vec3 Ht = H / cH - N;
        vec3 tx = normalize(vec3(1.0, 0.0, 0.0) - N * N.x), tz = normalize(cross(tx, N));
        vec2 sl = vec2(dot(Ht, tx), dot(Ht, tz)); vec2 vg = clamp(var2, vec2(0.006), vec2(0.16));
        float Dsun = exp(-min(0.5 * (sl.x * sl.x / vg.x + sl.y * sl.y / vg.y), 80.0)) / (6.2831853 * sqrt(vg.x * vg.y) * cH * cH * cH * cH);
        vec3 sun = vec3(1.0, 0.95, 0.86) * min(Dsun * fresnelW(dot(V, H)) * 0.25 / max(NoV, 0.08), 6.0) * max(dot(N, uSun), 0.0) * (1.0 - 0.85 * csh);
        // 水体：沿折射路径的 Beer-Lambert；透明度 = 1 - (1-F)·透射率，水下地形透出来
        float ct = sqrt(max(1.0 - (1.0 - NoV * NoV) / 1.777, 0.05));
        vec3 T = exp(-SIGMA * hCol / ct - SIGMA * hCol);
        vec3 lit = (0.55 + 0.55 * max(uSun.y, 0.0)) * (1.0 - 0.3 * csh) * vec3(1.0);
        vec3 deep = mix(vec3(0.030, 0.300, 0.290), vec3(0.006, 0.090, 0.170), smoothstep(1.0, 20.0, hCol)) * lit;   // 浅水青绿 → 深水蓝（沿用岛上原有配色）
        vec3 scat = deep * (1.0 - T);
        // 浪峰透光：逆光时陡峭浪面泛青绿
        float back = pow(max(dot(-V, uSun), 0.0), 4.0);
        scat += vec3(0.04, 0.34, 0.30) * S.glow * (0.25 + 1.2 * back) * (1.0 - 0.6 * csh);
        float tMean = dot(T, vec3(0.2126, 0.7152, 0.0722));
        vec3 P = refl + (1.0 - F) * scat + sun;
        float A = 1.0 - (1.0 - F) * tMean;
        // 泡沫
        vec2 vel = (c.lag > 0.5 || c.cliff < 0.5) ? -c.g * min(S.speed, 1.5) * 0.35 : c.g * 0.35;
        vec2 pat = sk_foam(vXZ, vel, fp, uTime);
        // 崖岸泡沫（V-024）：泡沫毯用的是蜂窝状撕裂图案（一格约 0.17 m），泡沫量不高时按硬阈值切成一个个孤立小白块，
        // 离崖 15 m 内满是像碎纸片、垃圾的白色漂浮物。崖岸处改用连续噪声：柔和的泡沫团块（x）+ 脊线噪声的细长相连泡沫纹（y），
        // 阈值放宽，部分覆盖时是半透明的团块与纹路，泡沫量高时在崖脚连成一片；沙滩仍用原图案
        float cl = smoothstep(0.3, 0.7, c.cliff), soft = mix(0.18, 0.3, cl);
        if (cl > 0.0) {
          vec2 q = vXZ + c.g * uTime * 0.15;
          float body = 0.5 + 0.5 * (0.62 * sk_gn(q * 1.1 + uTime * vec2(0.05, -0.03)) + 0.38 * sk_gn(q * 2.9 - uTime * vec2(0.04, 0.07)));
          float ridge = pow(1.0 - abs(sk_gn(q * 1.7 + uTime * vec2(0.03, 0.06))), 10.0) * 0.8 + pow(1.0 - abs(sk_gn(q * 3.4 - uTime * vec2(0.05, 0.02))), 12.0) * 0.4;
          pat = mix(pat, vec2(body, ridge), cl);
        }
        float vis = 1.0 - smoothstep(0.05, 0.4, fp);
        // 泡沫毯只出现在有泡沫量的地方：原先 S.foam = 0 时 smoothstep(0.82, 1.18, pat.x) 仍在图案较亮处给出白斑，外海与港内满海面都是白色碎片
        float blanket = mix(S.foam, smoothstep(1.0 - S.foam - soft, 1.0 - S.foam + soft, pat.x) * smoothstep(0.0, 0.12, S.foam), vis);
        float lace = clamp(mix(0.12, pat.y * 1.6, vis) * S.lace * mix(1.0, 0.7, cl), 0.0, 1.0);
        float crest = S.crest * smoothstep(0.25, 0.75, 0.5 + 0.5 * sk_gn(vXZ * vec2(7.0, 11.0) + vec2(0.0, -uTime * 3.0)) + S.crest * 0.5);
        float foam = clamp(1.0 - (1.0 - blanket * 0.95) * (1.0 - lace) * (1.0 - crest), 0.0, 1.0) * smoothstep(0.5, 0.8, steepY);   // 陡面上泡沫图案会被拉长失真，淡出
        vec3 fcol = vec3(0.90, 0.93, 0.93) * (0.62 + 0.45 * max(dot(N, uSun), 0.0) * (1.0 - 0.6 * csh));
        P = P * (1.0 - foam) + fcol * foam; A = A * (1.0 - foam) + foam;
        // 湿沙上的薄水膜：只保留反光
        if (c.bed > 0.0) A *= smoothstep(0.004, 0.02, hCol) * 0.9 + foam * 0.1;
        vec3 col = P / max(A, 1e-3);
        float ff = 1.0 - exp(-uFogD * uFogD * dist * dist);
        col = mix(col, uFog, ff); A = mix(A, 1.0, ff);
        gl_FragColor = vec4(col, clamp(A, 0.0, 1.0));
        if (uSeaDbg > 0.5) gl_FragColor = vec4(clamp(S.foam, 0.0, 1.0), clamp(S.lace, 0.0, 1.0), clamp(S.crest * 4.0, 0.0, 1.0) + step(9.0, abs(S.eta)), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}
function seaPolarGrid(segments, rMin = 0.2, rMax = 6000) {
  // 近处（≤ 300 米）径向间距 = 弧向间距，远处只剩 FFT 法线，径向步长加倍
  const dth = 2 * Math.PI / segments, q = 1 + dth, rings = [0];
  for (let r = rMin; r < rMax; r *= r < 300 ? q : q * q) rings.push(r); rings.push(rMax);
  const nr = rings.length, pos = new Float32Array(nr * segments * 3), idx = new Uint32Array((nr - 1) * segments * 6);
  for (let j = 0; j < nr; j++) for (let i = 0; i < segments; i++) { const a = i * dth, k = (j * segments + i) * 3; pos[k] = rings[j] * Math.cos(a); pos[k + 2] = rings[j] * Math.sin(a); }
  let o = 0;
  for (let j = 0; j < nr - 1; j++) for (let i = 0; i < segments; i++) { const a = j * segments + i, b = j * segments + (i + 1) % segments, c = a + segments, d = b + segments; idx[o++] = a; idx[o++] = b; idx[o++] = c; idx[o++] = b; idx[o++] = d; idx[o++] = c; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7); return g;
}
// 返回 { mesh, mat, update(renderer, camera, t) }；不支持浮点渲染目标时返回 null（调用方回退到原海面）
function buildSea(X, dataTex, QS, renderer) {
  if (!X.shore || !renderer || !renderer.capabilities.isWebGL2 || !renderer.extensions.has('EXT_color_buffer_float')) return null;
  const tier = QS.tier || 'mid';
  const cfg = { high: { N: 256, nc: 3, seg: 192, ev: 12, ds: 0.5 }, mid: { N: 256, nc: 3, seg: 160, ev: 10, ds: 0.45 }, low: { N: 128, nc: 2, seg: 128, ev: 8, ds: 0.35 } }[tier] || { N: 256, nc: 3, seg: 160, ev: 10, ds: 0.45 };
  const mk = (a) => { const t = new THREE.DataTexture(a, G.nx, G.nz, THREE.RGBAFormat, THREE.HalfFloatType); t.minFilter = t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t; };
  const shoreTex = [mk(X.shore.f0), mk(X.shore.f1), mk(X.shore.f2)];
  const fft = new SeaFFT(renderer, cfg.N, cfg.nc);
  const mat = makeSeaMaterial(dataTex, shoreTex, fft, { maxEvents: cfg.ev, delayScale: cfg.ds, clouds: QS.clouds });
  const mesh = new THREE.Mesh(seaPolarGrid(cfg.seg), mat); mesh.frustumCulled = false; mesh.receiveShadow = false;
  const sched = new SeaSchedule(cfg.ev);
  return {
    mesh, mat, fft, cfg,
    update(r, camera, t) {
      fft.update(t);
      mat.uniforms.uCenter.value.set(camera.position.x, camera.position.z);
      if (typeof BOAT !== 'undefined' && BOAT.g) mat.uniforms.uBoat.value.set(BOAT.x, BOAT.z, Math.cos(BOAT.yaw), Math.sin(BOAT.yaw));
      sched.pack(t, mat.uniforms, X.shore.delayMax);
    },
  };
}
