// ======================= 13b 载具喇叭：汽车、拖拉机、直升机、游艇各自的音色（WebAudio 现场合成，不引入音频文件） =======================
// 驾驶任意载具时按 H 鸣笛；游艇在闸外鸣笛会召唤鲸群与鱼群（17f boatHorn）
const HORN = { ac: null, last: null, count: 0 };
const HORN_KIND = {
  car: 'Cybertruck 电子双音喇叭',
  tractor: '拖拉机单音喇叭（两短声）',
  heli: '直升机机外警示音（高低双音）',
  boat: '游艇汽笛（低沉长鸣）',
};
function hornSound(kind) {
  HORN.last = { kind, t: performance.now() }; HORN.count++;
  try {
    const A = HORN.ac || (HORN.ac = new (window.AudioContext || window.webkitAudioContext)()); if (A.state === 'suspended') A.resume();
    const t0 = A.currentTime + 0.01;
    // 一段音：若干振荡器 → 滤波 → 包络（起音、保持、释放）
    const tone = (freqs, type, start, dur, vol, filt) => {
      const g = A.createGain(), f = A.createBiquadFilter(); f.type = filt.type; f.frequency.value = filt.f; f.Q.value = filt.q || 0.7;
      g.gain.setValueAtTime(0.0001, start); g.gain.exponentialRampToValueAtTime(vol, start + 0.015); g.gain.setValueAtTime(vol, start + dur - 0.04); g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      f.connect(g); g.connect(A.destination);
      for (const fr of freqs) { const o = A.createOscillator(); o.type = type; o.frequency.value = fr; o.connect(f); o.start(start); o.stop(start + dur + 0.02); }
    };
    if (kind === 'car') tone([415, 520], 'square', t0, 0.55, 0.12, { type: 'bandpass', f: 1300, q: 0.9 });                 // 电子双音，略带鼻音
    else if (kind === 'tractor') { for (const s of [0, 0.3]) tone([330, 333], 'sawtooth', t0 + s, 0.2, 0.14, { type: 'lowpass', f: 1500 }); }   // 两短声，微拍频显得粗糙
    else if (kind === 'heli') { [950, 740, 950, 740].forEach((fr, i) => tone([fr], 'triangle', t0 + i * 0.26, 0.24, 0.12, { type: 'lowpass', f: 3000 })); }
    else {   // 游艇汽笛：三个锯齿波叠成低沉和弦，长鸣约 2.3 秒
      const g = A.createGain(), f = A.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.32, t0 + 0.08); g.gain.setValueAtTime(0.32, t0 + 1.6); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.3);
      f.connect(g); g.connect(A.destination);
      for (const fr of [110, 138.6, 165]) { const o = A.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(f); o.start(t0); o.stop(t0 + 2.4); }
    }
  } catch (e) { /* 浏览器不支持或未允许播放声音时静默 */ }
}
