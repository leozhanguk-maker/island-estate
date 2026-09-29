// ======================= 18 小白鹭：偶尔飞到闸口沙滩西侧的水线觅食，人跑近会惊飞 =======================
// @ts-nocheck —— 由拼接式全局脚本机械转换而来，类型尚未补齐（逐文件移除此行并补类型）
import { THREE } from '../three';
import { V3, ecoBody, ecoFin, ecoM4, ecoMerge, ecoMix, ecoPart, ecoRod } from './core';
import { TAU, clamp, lerp, mulberry32 } from '../core/util';
import { gh } from '../structures/villa';
// 小白鹭（Egretta garzetta）：体长约 60 cm，通体白色；黑色细长的喙，眼先黄色，黄色虹膜；黑腿黄脚趾；
// 繁殖期枕部两根长饰羽、背部蓑羽（细丝状）。飞行时颈部缩成 S 形、双腿伸向后方。
// 模型按部位分组（身体、颈与头、两腿、两翼），姿态每帧在分组上变换；几何体用生态模块的合并工具（17a）
export const EGRET = { birds: [], state: 'away', t: 0, next: 30, stay: 0, spots: [], flushes: 0, visits: 0, R: null, prevP: null, speed: 0 };
export const EGRET_EXIT = { x: -18, y: 46, z: 250 };   // 从闸外峡谷出海口上空飞来、飞走（沿水道，避开两侧崖壁）
export function egretGeo() {
  const W = 0xf5f5f0, Wd = 0xe4e4dc, K = 0x16171a, Y = 0xe9c42e, parts = { body: [], neck: [], leg: [], wing: [] };
  // 身体：纺锤形，胸部略丰满，背部近尾处收窄；腹侧颜色略暗（阴影色）
  parts.body.push(ecoPart(ecoBody(0.34, (t) => [0.078 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.12 + t * 0.95)), 0.8) + 0.004, 0.068 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.12 + t * 0.95)), 0.85) + 0.004], (t, a) => ecoMix(Wd, W, 0.5 + 0.5 * Math.sin(a)), 14, 10), null, 0, ecoM4(0, 0.36, 0, 0, 0, 0.22)));
  // 尾：短而方的白色尾羽
  parts.body.push(ecoFin([[-0.15, 0.335, 0], [-0.26, 0.30, -0.035], [-0.27, 0.305, 0], [-0.26, 0.30, 0.035]], W));
  // 背部蓑羽：十余根细丝从肩背披到尾后，末端上翘
  for (let i = 0; i < 12; i++) { const z = (i / 11 - 0.5) * 0.07, pts = [V3(0.02, 0.43, z), V3(-0.12, 0.43, z * 1.3), V3(-0.25, 0.38, z * 1.6), V3(-0.33, 0.37 + 0.02 * Math.sin(i), z * 1.8)];
    parts.body.push(ecoPart(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.0022, 3, false), W)); }
  // 颈（以颈基为原点）：S 形细长颈，头在上端
  const neckC = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(0.045, 0.07, 0), V3(0.01, 0.15, 0), V3(0.05, 0.22, 0), V3(0.085, 0.245, 0)]);
  parts.neck.push(ecoPart(new THREE.TubeGeometry(neckC, 16, 0.017, 7, false), W));
  parts.neck.push(ecoPart(new THREE.SphereGeometry(0.027, 10, 8), W, 0, ecoM4(0.09, 0.25, 0, 0, 0, 0, 1.35, 1, 0.95)));   // 头
  parts.neck.push(ecoRod(V3(0.115, 0.248, 0), V3(0.215, 0.238, 0), 0.0085, 0.0012, K, 0, 6));                          // 喙：黑色、细长如匕首
  for (const s of [-1, 1]) {
    parts.neck.push(ecoPart(new THREE.SphereGeometry(0.0075, 6, 5), Y, 0, ecoM4(0.112, 0.252, s * 0.011, 0, 0, 0, 1.4, 0.8, 0.6)));   // 眼先：黄色裸皮
    parts.neck.push(ecoPart(new THREE.SphereGeometry(0.0055, 6, 5), Y, 0, ecoM4(0.1, 0.258, s * 0.018)));                           // 虹膜
    parts.neck.push(ecoPart(new THREE.SphereGeometry(0.0028, 5, 4), K, 0, ecoM4(0.103, 0.259, s * 0.0225)));                        // 瞳孔
  }
  // 枕部两根长饰羽：从后枕垂向背部
  for (const s of [-1, 1]) parts.neck.push(ecoPart(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(0.07, 0.262, s * 0.006), V3(0.0, 0.25, s * 0.01), V3(-0.08, 0.2, s * 0.012), V3(-0.12, 0.15, s * 0.014)]), 10, 0.0016, 3, false), W));
  // 腿（以髋为原点）：黑色胫、跗蹠；黄色脚趾三前一后
  parts.leg.push(ecoRod(V3(0, 0, 0), V3(0.01, -0.11, 0), 0.0085, 0.0065, K, 0, 6), ecoRod(V3(0.01, -0.11, 0), V3(0, -0.3, 0), 0.0062, 0.0055, K, 0, 6));
  for (const a of [-0.45, 0, 0.45]) parts.leg.push(ecoRod(V3(0, -0.3, 0), V3(0.055 * Math.cos(a), -0.302, 0.055 * Math.sin(a)), 0.0035, 0.0022, Y, 0, 4));
  parts.leg.push(ecoRod(V3(0, -0.3, 0), V3(-0.03, -0.302, 0), 0.003, 0.002, Y, 0, 4));
  // 翼（右翼，沿 +z 展开，以肩为原点）：宽圆的白色翼面，外缘初级飞羽分叉成指状
  const sh = new THREE.Shape(); sh.moveTo(0.06, 0); sh.bezierCurveTo(0.09, 0.12, 0.08, 0.3, 0.03, 0.44);
  for (let i = 0; i < 5; i++) { const y = 0.44 - i * 0.012, x = 0.03 - i * 0.03; sh.lineTo(x, y + 0.02); sh.lineTo(x - 0.018, y - 0.01); }
  sh.bezierCurveTo(-0.14, 0.3, -0.13, 0.12, -0.08, 0); sh.lineTo(0.06, 0);
  const wg = new THREE.ShapeGeometry(sh, 6); wg.rotateX(Math.PI / 2);
  parts.wing.push(ecoPart(wg, (x, y, z) => ecoMix(W, Wd, clamp(-x * 4, 0, 1) * 0.5)));
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0, side: THREE.DoubleSide });
  const mk = (k) => ecoMerge(parts[k]);
  return { m, body: mk('body'), neck: mk('neck'), leg: mk('leg'), wing: mk('wing') };
}
export function buildEgrets(scene) {
  EGRET.R = mulberry32(5005);
  // 觅食点：闸口沙滩西侧的水线（地面 -0.08～0.03 m，脚趾没在浅水或踩在湿沙上）
  for (let x = -46; x <= -18; x += 0.5) { let best = null; for (let z = 34; z <= 58; z += 0.2) { const h = gh(x, z); if (h > -0.08 && h < 0.03) { best = { x, z }; break; } } if (best) EGRET.spots.push(best); }
  const G = egretGeo();
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group(), add = (geo, p, par = g) => { const o = new THREE.Group(); o.position.set(...p); const me = new THREE.Mesh(geo, G.m); me.castShadow = true; o.add(me); par.add(o); return o; };
    const body = new THREE.Group(); g.add(body); body.add(new THREE.Mesh(G.body, G.m)); body.children[0].castShadow = true;
    const neck = add(G.neck, [0.13, 0.42, 0], body);
    const legs = [add(G.leg, [0.015, 0.3, -0.03], g), add(G.leg, [0.015, 0.3, 0.03], g)];
    const wings = [add(G.wing, [0.04, 0.41, -0.05], body), add(G.wing, [0.04, 0.41, 0.05], body)];
    wings[0].scale.z = -1;                                                        // 左翼为右翼的镜像
    g.visible = false; scene.add(g);
    EGRET.birds.push({ g, body, neck, legs, wings, x: 0, y: 0, z: 0, yaw: 0, state: 'away', t: 0, ph: EGRET.R() * TAU, path: null });
  }
}
export const egretRand = (a, b) => a + (b - a) * EGRET.R();
// 二次贝塞尔飞行路径：p0 → c → p1，按弧长近似匀速；用于飞来与飞走
export function egretPath(p0, c, p1, speed) { const L_ = Math.hypot(c.x - p0.x, c.y - p0.y, c.z - p0.z) + Math.hypot(p1.x - c.x, p1.y - c.y, p1.z - c.z); return { p0, c, p1, dur: L_ / speed, t: 0 }; }
export const egretAt = (P, u) => { const a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u; return { x: a * P.p0.x + b * P.c.x + c * P.p1.x, y: a * P.p0.y + b * P.c.y + c * P.p1.y, z: a * P.p0.z + b * P.c.z + c * P.p1.z }; };
// 飞来：2～4 只，各自落在不同的水线觅食点
export function egretVisit(n) {
  if (!EGRET.spots.length) return;
  n = n || 2 + Math.floor(EGRET.R() * 3); EGRET.state = 'visit'; EGRET.stay = egretRand(70, 160); EGRET.t = 0; EGRET.visits++;
  const used = [];
  EGRET.birds.forEach((b, i) => {
    if (i >= n) { b.state = 'away'; b.g.visible = false; return; }
    let s = null; for (let k = 0; k < 30; k++) { const c = EGRET.spots[Math.floor(EGRET.R() * EGRET.spots.length)]; if (used.every(u => Math.hypot(u.x - c.x, u.z - c.z) > 2.5)) { s = c; break; } } s = s || EGRET.spots[i % EGRET.spots.length]; used.push(s);
    const p0 = { x: EGRET_EXIT.x + egretRand(-8, 8), y: EGRET_EXIT.y + egretRand(-4, 4), z: EGRET_EXIT.z + i * 6 }, p1 = { x: s.x, y: gh(s.x, s.z), z: s.z };
    b.path = egretPath(p0, { x: -20, y: 20, z: 110 }, p1, egretRand(8, 9.5)); b.path.t = -i * egretRand(0.8, 2.2);   // 前后错开几秒到达
    b.state = 'arrive'; b.x = p0.x; b.y = p0.y; b.z = p0.z; b.g.visible = false; b.t = 0;
  });
}
// 飞走：scared 为受惊（先急速起飞、背离玩家），否则从容离开
export function egretLeave(scared, player) {
  EGRET.state = 'leaving'; if (scared) EGRET.flushes++;
  EGRET.birds.forEach((b) => {
    if (b.state === 'away') return;
    let ax = -0.3, az = 1; if (player) { ax = b.x - player.x; az = b.z - player.z; const l = Math.hypot(ax, az) || 1; ax /= l; az /= l; }
    az = Math.max(az, 0.2); { const l = Math.hypot(ax, az); ax /= l; az /= l; }   // 背离玩家，但总是朝水面方向飞（不钻进沙滩后面的树林）
    // 先原地振翅爬升约 1.2 秒（上升约 4 m/s、背离玩家约 3 m/s），再沿曲线飞向出海口
    b.climb = { t: scared ? -egretRand(0, 0.35) : -egretRand(0, 3), dur: 1.2, ax, az };
    b.path = null; b.speedOut = scared ? egretRand(10, 12) : 8.5;
    b.state = 'depart'; b.scared = scared; b.t = 0;
  });
  EGRET.next = scared ? egretRand(90, 200) : egretRand(60, 150);
}
// 每帧：player 为玩家（或所驾载具）位置；奔跑（速度 > 6 m/s）靠近到 14 m 内、或走到 5 m 内、或开车/飞来（> 12 m/s）到 22 m 内就惊飞
export function updateEgrets(dt, t, player, camera) {
  if (!EGRET.birds.length) return;
  dt = Math.min(dt, 0.05);
  if (player) { const p = EGRET.prevP; if (p && dt > 0) { const v = Math.hypot(player.x - p.x, player.z - p.z) / dt; EGRET.speed = v > 40 ? EGRET.speed : lerp(EGRET.speed, v, Math.min(1, dt * 6)); } EGRET.prevP = { x: player.x, z: player.z }; }
  if (EGRET.state === 'away') { EGRET.next -= dt; if (EGRET.next <= 0) egretVisit(); return; }
  EGRET.t += dt;
  let ground = 0, near = 1e9;
  for (const b of EGRET.birds) if (b.state === 'forage' || b.state === 'land') { ground++; if (player) near = Math.min(near, Math.hypot(player.x - b.x, player.z - b.z)); }
  if (EGRET.state === 'visit' && ground && player && (near < 5 || (near < 14 && EGRET.speed > 6) || (near < 22 && EGRET.speed > 12))) egretLeave(true, player);
  else if (EGRET.state === 'visit' && EGRET.t > EGRET.stay) egretLeave(false, null);
  let alive = 0;
  for (const b of EGRET.birds) {
    if (b.state === 'away') continue; alive++;
    b.t += dt; b.ph += dt;
    if (b.state === 'arrive' || b.state === 'depart') egretFly(b, dt);
    else egretForage(b, dt);
    egretPose(b, t);
  }
  if (!alive && EGRET.state === 'leaving') { EGRET.state = 'away'; }
  // 远处不画（体型小，200 m 外看不清）
  if (camera) for (const b of EGRET.birds) if (b.state !== 'away') b.g.visible = Math.hypot(camera.position.x - b.x, camera.position.z - b.z) < 200 && !(b.path && b.path.t < 0 && b.state === 'arrive');
}
export function egretFly(b, dt) {
  if (b.state === 'depart' && !b.path) {
    const C = b.climb; C.t += dt; if (C.t < 0) { b.anim = 'stand'; return; }
    b.x += C.ax * 3 * dt; b.z += C.az * 3 * dt; b.y += 4 * dt; b.vy = 4; b.yaw = Math.atan2(-C.az, C.ax); b.anim = 'takeoff';
    if (C.t >= C.dur) { const p0 = { x: b.x, y: b.y, z: b.z }, c = { x: b.x + C.ax * 12, y: b.y + (b.scared ? 12 : 9), z: b.z + C.az * 12 + 6 }, p1 = { x: EGRET_EXIT.x + egretRand(-10, 10), y: EGRET_EXIT.y + 8, z: EGRET_EXIT.z + 30 };
      b.path = egretPath(p0, c, p1, b.speedOut); }
    return;
  }
  const P = b.path; P.t += dt; if (P.t < 0) return;
  const u = Math.min(1, P.t / P.dur), q = egretAt(P, u), q2 = egretAt(P, Math.min(1, u + 0.01));
  b.vy = (q.y - b.y) / Math.max(dt, 1e-3); b.x = q.x; b.y = q.y; b.z = q.z;
  if (Math.hypot(q2.x - q.x, q2.z - q.z) > 1e-4) b.yaw = Math.atan2(-(q2.z - q.z), q2.x - q.x);
  const left = (1 - u) * P.dur;
  b.anim = b.state === 'arrive' && left < 1.4 ? 'flare' : (b.state === 'arrive' && left < 5 && left > 1.4 ? 'glide' : 'flap');
  if (u >= 1) {
    if (b.state === 'arrive') { b.state = 'forage'; b.act = 'stand'; b.at = egretRand(1, 3); b.y = gh(b.x, b.z); }
    else { b.state = 'away'; b.g.visible = false; }
  }
}
// 觅食：踱步（沿水线慢走）→ 伏身潜行 → 迅速啄击 → 吞咽；偶尔梳理羽毛
export function egretForage(b, dt) {
  b.at -= dt;
  if (b.act === 'walk') {
    const dx = b.gx - b.x, dz = b.gz - b.z, d = Math.hypot(dx, dz);
    if (d < 0.05) { b.act = 'stand'; b.at = egretRand(0.5, 2); }
    else { const want = Math.atan2(-dz, dx); let da = ((want - b.yaw + Math.PI * 3) % TAU) - Math.PI; b.yaw += clamp(da, -2 * dt, 2 * dt); const sp = 0.28 * (Math.abs(da) > 0.6 ? 0.3 : 1); b.x += Math.cos(b.yaw) * sp * dt; b.z -= Math.sin(b.yaw) * sp * dt; }
  } else if (b.at <= 0) {
    const r = EGRET.R();
    if (b.act === 'stalk') { b.act = 'strike'; b.at = 0.55; }
    else if (b.act === 'strike') { b.act = r < 0.35 ? 'swallow' : 'stand'; b.at = r < 0.35 ? 0.8 : egretRand(0.6, 1.8); }
    else if (r < 0.45) { // 沿水线挑一个 1～3 m 外的觅食点
      const near = EGRET.spots.filter(s => { const d = Math.hypot(s.x - b.x, s.z - b.z); return d > 0.8 && d < 3; }); const s = near[Math.floor(EGRET.R() * near.length)];
      if (s) { b.act = 'walk'; b.gx = s.x + egretRand(-0.2, 0.2); b.gz = s.z + egretRand(-0.2, 0.2); } else { b.act = 'stand'; b.at = 1; }
    } else if (r < 0.85) { b.act = 'stalk'; b.at = egretRand(1, 3); }
    else { b.act = 'preen'; b.at = egretRand(1.5, 3); }
  }
  b.y = gh(b.x, b.z); b.anim = b.act;
}
// 姿态：飞行（振翅/滑翔/落地前张翼刹车/起飞），地面（站立、踱步、潜行、啄击、吞咽、梳羽）
export function egretPose(b, t) {
  const g = b.g, a = b.anim || 'stand', [wl, wr] = b.wings, ph = b.ph;
  g.position.set(b.x, b.y, b.z); g.rotation.set(0, b.yaw, 0);
  // 收拢的翼：翼展转向后方（绕 y 轴 -1.5），再绕翼展轴翻成竖直，贴在体侧
  let neckRz = 0, bodyRz = 0, legRz = [0, 0], wingX = 0, wingY = 0, wingS = 1, neckS = 1, folded = true;
  if (a === 'flap' || a === 'takeoff' || a === 'glide' || a === 'flare') {
    const f = a === 'takeoff' ? 4.2 : 2.9, fl = Math.sin(ph * f * TAU);
    wingS = 1; wingY = 0; folded = false;
    wingX = a === 'glide' ? -0.12 + 0.05 * Math.sin(ph * 2) : a === 'flare' ? -0.5 + 0.55 * fl : -0.15 - 0.75 * fl;   // 上下振翅；滑翔时两翼略上扬平展
    neckRz = 0.35; neckS = 0.62; bodyRz = clamp((b.vy || 0) * 0.05, -0.35, 0.35) + (a === 'flare' ? 0.55 : 0);
    legRz = a === 'flare' ? [0.4, 0.45] : [-1.35, -1.35];                                                                  // 飞行时双腿伸向后方，落地前放下
  } else {
    const walk = a === 'walk' ? Math.sin(ph * 5.5) : 0;
    legRz = [0.42 * walk, -0.42 * walk]; bodyRz = 0.03 * Math.abs(walk);
    if (a === 'stalk') { neckRz = -0.55; bodyRz = -0.12; }
    else if (a === 'strike') { const u = clamp(1 - b.at / 0.55, 0, 1); neckRz = u < 0.25 ? -0.55 - 1.55 * (u / 0.25) : -2.1 + 2.1 * ((u - 0.25) / 0.75); bodyRz = -0.45 * Math.sin(Math.PI * Math.min(1, u * 1.6)); }   // 快速啄向水线：颈猛伸、身体前倾
    else if (a === 'swallow') neckRz = 0.25 * Math.sin(ph * 14);
    else if (a === 'preen') neckRz = 1.7 + 0.2 * Math.sin(ph * 6);   // 回头梳理背羽
    else neckRz = 0.05 * Math.sin(ph * 0.7);
    if (a === 'walk') neckRz = 0.12 * Math.sin(ph * 5.5 + 1);                                                          // 踱步时头随步点前后伸缩
  }
  b.body.rotation.z = bodyRz; b.neck.rotation.z = neckRz; b.neck.scale.set(1, neckS, 1);   // 飞行时颈部缩短（缩成 S 形贴在肩上）
  b.legs[0].rotation.z = legRz[0]; b.legs[1].rotation.z = legRz[1];
  // 收拢时翼紧贴体侧、被白色体羽盖住（真实的小白鹭站立时几乎看不出翼的轮廓）：只在飞行时显示翼面
  wr.visible = wl.visible = !folded;
  wr.rotation.set(wingX, wingY, 0); wr.scale.set(1, 1, wingS);
  wl.rotation.set(-wingX, -wingY, 0); wl.scale.set(1, 1, -wingS);
}
