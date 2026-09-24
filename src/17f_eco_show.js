// ======================= 17f 海洋表演：游艇鸣笛，召唤虎鲸、座头鲸、鲸鲨与鱼群游到船边 =======================
// 在闸外海域鸣笛：把外海四个水域的鲸群与鱼群整体挪到船体周围 40～70 m 的深水里（相机看不到的距离外出现），各自快速游近；
// 2 分钟后整体挪回原水域。闸内潟湖与淡水湖只提示，不召唤（海水与淡水、潟湖与外海物种不混用）
const ECO_SHOW = { t: 0, moved: null, ac: null };
function ecoHornSound() {
  try {
    const A = ECO_SHOW.ac || (ECO_SHOW.ac = new (window.AudioContext || window.webkitAudioContext)()); if (A.state === 'suspended') A.resume();
    const t0 = A.currentTime, g = A.createGain(), f = A.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.32, t0 + 0.08); g.gain.setValueAtTime(0.32, t0 + 1.6); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.3);
    f.connect(g); g.connect(A.destination);
    for (const fr of [110, 138.6, 165]) { const o = A.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(f); o.start(t0); o.stop(t0 + 2.4); }
  } catch (e) { /* 浏览器不支持或未允许播放声音时静默 */ }
}
function ecoToast(msg) {
  let el = document.getElementById('fptoast');
  if (!el) { el = document.createElement('div'); el.id = 'fptoast'; el.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);padding:8px 16px;background:rgba(0,0,0,.55);color:#fff;border-radius:6px;font-size:15px;pointer-events:none;transition:opacity .6s;z-index:30;opacity:0'; document.body.appendChild(el); }
  el.textContent = msg; el.style.opacity = 1; clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = 0; }, 3500);
}
// 整个水域平移 (dx, dz)：水域中心、鱼群（位置、群中心、目标、锚点）、鲸群（个体、家、航点）
function ecoShiftZone(Z, dx, dz) {
  Z.center = { x: Z.center.x + dx, z: Z.center.z + dz };
  for (const f of Z.flocks || []) { for (let i = 0; i < f.n; i++) { f.p[i * 3] += dx; f.p[i * 3 + 2] += dz; }
    f.home = { ...f.home, x: f.home.x + dx, z: f.home.z + dz }; if (f.cx !== undefined) { f.cx += dx; f.cz += dz; } if (f.goal) { f.goal.x += dx; f.goal.z += dz; }
    if (f.anchors) f.anchors = f.anchors.map(a => ({ ...a, x: a.x + dx, z: a.z + dz })); }
  for (const w of Z.whales || []) { for (const a of w.a) { a.x += dx; a.z += dz; } w.home = { ...w.home, x: w.home.x + dx, z: w.home.z + dz }; w.wp = { x: w.wp.x + dx, z: w.wp.z + dz }; w.wt = 0; }
}
// 返回提示文字；成功时各外海水域被挪到船边
function ecoOceanShow(x, z) {
  if (!ECO.built) return '生态尚未就绪';
  if (ecoZone(x, z) !== 'ocean') return '鸣笛：鲸群和鱼群只在闸外海域出现，开出水闸再试';
  if (ECO_SHOW.moved) { ECO_SHOW.t = 120; return '鸣笛：鲸群和鱼群就在附近'; }
  const names = ['oceanSE', 'oceanSW', 'oceanS', 'oceanN'].filter(n => ECO.zones[n]), moved = [];
  // 在船周围 40～70 m 找深水点（水深足够、属于外海），每个水域一个，彼此错开方向
  const spots = [];
  for (let k = 0; k < 96 && spots.length < names.length; k++) {
    const a = k * 2.39996, r = 40 + (k % 4) * 10, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    if (gh(px, pz) < -20 && ecoIn('ocean', px, pz) && spots.every(s => Math.hypot(s.x - px, s.z - pz) > 25)) spots.push({ x: px, z: pz });
  }
  if (!spots.length) return '鸣笛：附近海水太浅，鲸鱼过不来，往深海开一点再试';
  names.forEach((n, i) => { const Z = ECO.zones[n], s = spots[i % spots.length], dx = s.x - Z.center.x, dz = s.z - Z.center.z; ecoShiftZone(Z, dx, dz); moved.push([n, dx, dz]); Z.on = undefined; });
  ECO_SHOW.moved = moved; ECO_SHOW.t = 120;
  return '鸣笛：虎鲸、座头鲸和鱼群正在游向游艇';
}
function ecoShowUpdate(dt) {
  if (!ECO_SHOW.moved) return;
  ECO_SHOW.t -= dt;
  if (ECO_SHOW.t <= 0) { for (const [n, dx, dz] of ECO_SHOW.moved) { ecoShiftZone(ECO.zones[n], -dx, -dz); ECO.zones[n].on = undefined; } ECO_SHOW.moved = null; }
}
// 游艇喇叭：驾驶时按 H，或在驾驶台按操控台上的红色按钮
function boatHorn() { ecoHornSound(); const msg = ecoOceanShow(BOAT.x, BOAT.z); ecoToast(msg); return msg; }
