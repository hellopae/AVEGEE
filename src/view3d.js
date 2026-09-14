// view3d.js — มุมมอง 3D แบบ billboard
//
// ทำไมเป็น billboard ไม่ใช่ 3D เต็มตัว:
// ทีมวัดกำลังผลิตงานวาดไว้ที่ 6-10 ชิ้น/สัปดาห์ (Toby, game-feasibility-v2.md)
// ถ้าไปโมเดล 3D จริง ตัวละคร 1 ตัว = โมเดล + texture + rig + animation
// และรูปที่ gen มาแล้วทั้งหมดใช้ต่อไม่ได้เลยสักไฟล์
// วิธีนี้ (แบบเดียวกับ Don't Starve / Octopath) ได้กล้อง แสง เงา และความลึกจริง
// โดยงานวาดเพิ่มเป็นศูนย์ — สไปรท์ชุดเดิมยืนตั้งขึ้นมาหันเข้าหากล้อง

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.180.0/three.module.min.js';
import { SCENE, SPOTS, QUEUE_LINE, ITEMS, MOB, GUARD } from './data.js';
import { artUrl, soulKey } from './art.js';

const U = 20;                                   // 20 px บนฉาก = 1 หน่วยโลก
const W = SCENE.w / U, H = SCENE.h / U;         // พื้นกว้าง 76.4 x ลึก 35.2
const toX = sx => sx / U - W / 2;
const toZ = sy => sy / U - H / 2;

let R, scene, cam, dirty = true;
const sprites = new Map();                      // key -> THREE.Sprite/Mesh ที่ใช้ซ้ำ
const texCache = new Map();
// กล้อง Don’t Starve ควรอ่านพื้นที่เล่นง่ายกว่าการโชว์ว่าเป็น 3D
// เวอร์ชันเก่าให้หมุนรอบฉากได้ แต่ภาพพื้นถูกวาด perspective มาแล้วจึงโดนเอียงซ้ำ
// รอบนี้ล็อกทิศและให้ลากเลื่อน/ซูมเท่านั้น จนกว่าจะมี ground art แบบมองจากบนจริง
const orbit = { yaw: 0, pitch: 0.88, dist: 55, tx: 0, tz: 1 };
let ground;
let groundUrl = 'img/scene-ground-v1.png';

function tex(url) {
  if (texCache.has(url)) return texCache.get(url);
  const t = new THREE.TextureLoader().load(url, () => { dirty = true; });
  t.magFilter = THREE.NearestFilter;            // รักษาความคมของ pixel art
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(url, t);
  return t;
}

export function init(canvas) {
  R = new THREE.WebGLRenderer({ canvas, antialias: false });
  R.setClearColor(0x0d0509, 1);
  R.setPixelRatio(Math.min(2, devicePixelRatio));
  R.shadowMap.enabled = true;
  R.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0d0509, 78, 165);

  cam = new THREE.PerspectiveCamera(38, canvas.width / canvas.height, 0.5, 400);

  // เริ่มด้วย ground-only ของสุวรรณภูมิ; render() จะสลับให้ทันทีเมื่อเป็นโซนอื่น
  ground = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshStandardMaterial({ map: tex(groundUrl), roughness: 1, metalness: 0 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.position.y = 0.01;                  // ลอยเหนือฝาฐานนิดเดียว กัน z-fighting
  scene.add(ground);

  // ฐานไดโอรามา — แผ่นหินหนาใต้แผนที่
  // ถ้าไม่มีอันนี้ พอหมุนกล้องแล้วจะเห็นแผนที่บางเป็นแผ่นกระดาษ และเห็นพื้นหลังโล่ง ๆ เป็นขอบเทา
  const SLAB = 6;
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(W, SLAB, H),
    new THREE.MeshStandardMaterial({ color: 0x2a1620, roughness: 1 }));
  slab.position.y = -SLAB / 2;
  slab.castShadow = true; slab.receiveShadow = true;
  scene.add(slab);

  // ความมืดรอบ ๆ ให้สายตาจบที่ขอบแผนที่ ไม่ใช่จบที่ขอบจอ
  const void_ = new THREE.Mesh(
    new THREE.PlaneGeometry(W * 6, H * 8),
    new THREE.MeshBasicMaterial({ color: 0x0d0509 }));
  void_.rotation.x = -Math.PI / 2;
  void_.position.y = -SLAB - 0.2;
  scene.add(void_);

  // StandardMaterial มืดกว่าภาพ Canvas เดิมมาก ถ้าใช้ค่าแสงสมจริง UI จะอ่านตัวละครไม่ออก
  // ยก fill light ให้รักษาค่าสีของ pixel art แล้วปล่อย point light ทำหน้าที่เป็น accent เท่านั้น
  scene.add(new THREE.AmbientLight(0xa96b82, 2.05));
  const moon = new THREE.DirectionalLight(0xffd8bd, 1.05);
  moon.position.set(-18, 34, 14);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  const d = 46;
  Object.assign(moon.shadow.camera, { left: -d, right: d, top: d, bottom: -d, near: 1, far: 120 });
  moon.shadow.camera.updateProjectionMatrix();   // ต้องเรียกเอง หลังแก้ค่ากล้องเงาตรง ๆ
  scene.add(moon);

  // แสงลาวา — วางตามธารลาวาบนฉาก ทำให้พื้นมีสีไฟจริง ไม่ใช่แค่ภาพวาด
  LAVA.forEach(([sx, sy], i) => {
    const l = new THREE.PointLight(0xff6a1e, 4.2, 26, 2);
    l.position.set(toX(sx), 2.2, toZ(sy));
    l.userData.phase = i * 1.7;
    scene.add(l);
  });
  return R;
}

const LAVA = [[560, 120], [700, 180], [560, 330], [560, 470], [700, 520], [900, 520], [1030, 540], [1010, 460]];

/** ลากเลื่อนฉากและหมุนล้อซูม — ไม่หมุนทิศของงานวาด */
export function bindControls(canvas) {
  let drag = null;
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; });
  addEventListener('pointerup', () => { drag = null; });
  addEventListener('pointermove', e => {
    if (!drag) return;
    const k = orbit.dist * 0.0012;
    orbit.tx = clamp(orbit.tx - (e.clientX - drag.x) * k, -W * 0.2, W * 0.2);
    orbit.tz = clamp(orbit.tz - (e.clientY - drag.y) * k, -H * 0.18, H * 0.18);
    drag = { x: e.clientX, y: e.clientY };
    dirty = true;
  });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    orbit.dist = clamp(orbit.dist + e.deltaY * 0.045, 20, 76);
    dirty = true;
  }, { passive: false });
}
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);

/** ป้ายยืน: ระนาบตั้งฉากกับพื้น หันเข้าหากล้องเฉพาะแกน Y (เงาจึงยังทอดถูกทาง) */
function billboard(key, url, sx, sy, hPx, opt = {}) {
  let m = sprites.get(key);
  if (!m) {
    m = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshStandardMaterial({
        map: tex(url), transparent: true, alphaTest: 0.35,
        roughness: 1, side: THREE.DoubleSide,
      }));
    m.castShadow = true;
    scene.add(m);
    sprites.set(key, m);
  }
  const h = hPx / U * (opt.scale || 1);
  const w = h * (opt.aspect || 1);
  m.scale.set(w, h, 1);
  m.position.set(toX(sx), h / 2 + (opt.lift || 0), toZ(sy));
  m.rotation.y = orbit.yaw;
  // ภาพนิ่งยังรู้สึกมีชีวิตได้โดยขยับน้อยมากแบบ paper puppet
  // ไม่ใช้กับอาคาร เพราะเส้นตั้งของสถาปัตยกรรมจะดูเมาแทนที่จะดูเคลื่อนไหว
  const seed = [...key].reduce((n, c) => n + c.charCodeAt(0), 0);
  m.rotation.z = opt.sway ? Math.sin(performance.now() / 720 + seed) * 0.018 : 0;
  m.visible = true;
  m.userData.live = true;

  // เงารูปเข้มเหลื่อมด้านหลังเล็กน้อย = ความหนาของกระดาษตัดแบบ Don't Starve
  if (opt.thickness) {
    let back = m.userData.depthBack;
    if (!back) {
      back = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ map: tex(url), color: 0x210910, transparent: true,
          alphaTest: 0.35, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false }));
      scene.add(back); m.userData.depthBack = back;
    }
    back.scale.set(w * 1.055, h * 1.055, 1);
    back.position.set(toX(sx) + 0.09, h / 2 + (opt.lift || 0) + 0.04, toZ(sy) - 0.06);
    back.rotation.copy(m.rotation);
    back.visible = true;
  }

  if (opt.shadow) {
    let sh = m.userData.rootShadow;
    if (!sh) {
      sh = new THREE.Mesh(
        new THREE.CircleGeometry(0.5, 24),
        new THREE.MeshBasicMaterial({ color: 0x080207, transparent: true, opacity: 0.42, depthWrite: false }));
      sh.rotation.x = -Math.PI / 2;
      scene.add(sh);
      m.userData.rootShadow = sh;
    }
    sh.position.set(toX(sx), 0.035, toZ(sy));
    sh.scale.set(h * (opt.shadowScale || 0.88), h * 0.30, 1);
    sh.visible = true;
    sh.userData.owner = m;
  }
  return m;
}

function liveBillboard(key, url, sx, sy, hPx, opt) {
  if (!url || sx == null || sy == null) return null;
  return billboard(key, url, sx, sy, hPx, opt);
}

/** ภาพมองจากบน เช่นลานแท่น ต้องนอนบนพื้นโลก ไม่ตั้งเป็นป้ายแนวตั้ง */
function groundDecal(key, url, sx, sy, wPx, hPx) {
  let m = sprites.get(key);
  if (!m) {
    m = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: tex(url), transparent: true, alphaTest: 0.12, depthWrite: true }));
    m.rotation.x = -Math.PI / 2;
    scene.add(m); sprites.set(key, m);
  }
  m.scale.set(wPx / U, hPx / U, 1);
  m.position.set(toX(sx), 0.055, toZ(sy));
  m.visible = true; m.userData.live = true;
  return m;
}

export function render(g, t) {
  // สลับงานวาดตามโซน โดยยังใช้โลก/เซฟชุดเดียวกับมุม 2D
  // สุวรรณภูมิมี ground-only รุ่นทดลอง: ตัดแท่น/รั้ว/พร็อพตั้งออกเพื่อไม่ให้ซ้ำกับ billboard
  // โซนอื่นยังใช้ภาพเต็มตามเดิมจนกว่าจะผ่าน art-direction gate ของโซนแรก
  const nextGround = g.zone === 'th' ? 'img/scene-ground-v1.png' : (artUrl('scene') || 'img/scene.png');
  if (nextGround !== groundUrl) {
    groundUrl = nextGround;
    ground.material.map = tex(nextGround);
    ground.material.needsUpdate = true;
  }
  // ---- กล้อง ----
  cam.position.set(
    orbit.tx + Math.sin(orbit.yaw) * Math.cos(orbit.pitch) * orbit.dist,
    Math.sin(orbit.pitch) * orbit.dist,
    orbit.tz + Math.cos(orbit.yaw) * Math.cos(orbit.pitch) * orbit.dist);
  cam.lookAt(orbit.tx, 0, orbit.tz);

  sprites.forEach(m => {
    m.userData.live = false;
    if (m.userData.rootShadow) m.userData.rootShadow.visible = false;
    if (m.userData.depthBack) m.userData.depthBack.visible = false;
  });

  // ---- อาคารที่สร้างแล้ว ----
  // ภาพแท่นเต็มใบเป็น top-down art จึงใช้เป็น decal ปูบน ground-only
  // ส่วนกำแพงหน้าเก็บไว้สำหรับ occlusion pass แยก ไม่ฝืนตั้งภาพ top-down เป็น billboard
  if (g.zone === 'th')
    groundDecal('judgment-platform', 'img/prop-throne-platform-v1.png', SPOTS.throne.x, 420, 315, 390);

  if (g.zone === 'th')
    liveBillboard('judgment-foreground', 'img/scene-foreground-v1.png', SPOTS.throne.x, 548, 150,
      { aspect: 1520 / 704 });

  for (const st of g.stations) {
    const d = st.def;
    if (d.bx == null) continue;
    liveBillboard('st-' + d.k, artUrl('st-' + d.k), d.bx, d.by, d.bw * 0.82,
      { shadow: true, shadowScale: 1.05, thickness: true });
  }

  // ---- ตัวเรา / พญายม / ยมทูต ----
  liveBillboard('hero', artUrl('hero-yama'), g.player.x, g.player.y, 138,
    { shadow: true, sway: true, thickness: true });
  if (g.bossUntil && t < g.bossUntil)
    liveBillboard('boss', artUrl('hero-boss'), SPOTS.throne.x, SPOTS.throne.y, 164,
      { shadow: true, sway: true, thickness: true });
  for (const c of g.crew) {
    liveBillboard('c-' + c.k, artUrl('crew-' + c.k), c.x, c.y, 122,
      { shadow: true, sway: true, thickness: true });
  }

  // ---- วิญญาณ: ลอยเหนือพื้นนิดหนึ่ง ----
  g.queue.forEach((s, i) => {
    const p = QUEUE_LINE[i];
    if (!p) return;
    liveBillboard('q-' + s.id, artUrl(soulKey(s)), p[0], p[1], 82,
      { lift: 0.5 + Math.sin(t / 520 + i) * 0.18, shadow: true, sway: true, thickness: true });
  });

  // ของเก็บบนพื้น / ตัวก่อกวน / ยักษ์ทวารบาล — รุ่นเก่ายังไม่รู้จักระบบเหล่านี้
  g.items.forEach((it, i) => {
    const d = ITEMS[it.k];
    liveBillboard('it-' + i, artUrl(d.img), it.x, it.y, d.h * 1.25, { lift: 0.2, shadow: true });
  });
  g.mobs.forEach((m, i) => {
    const d = MOB.kinds[m.kind ?? 0] || MOB;
    liveBillboard('mob-' + i, artUrl(d.img), m.x, m.y, MOB.h * 1.35,
      { shadow: true, sway: true, thickness: true });
  });
  if (g.guard)
    liveBillboard('guard', artUrl(GUARD.img), g.guard.x, g.guard.y, GUARD.h * 1.25,
      { shadow: true, sway: true, thickness: true });

  // ---- เรือข้ามแม่น้ำ ----
  const f = SPOTS.ferry, ph = t / 5200;
  const fx = f.from[0] + (f.to[0] - f.from[0]) * (Math.sin(ph) + 1) / 2;
  const boat = liveBillboard('boat', artUrl('prop-boat'), fx, f.from[1], 120, { lift: -0.3 });
  if (boat) boat.scale.x *= Math.cos(ph) > 0 ? -1 : 1;

  // เก็บกวาดสไปรท์ของสิ่งที่หายไปแล้ว (คดีจบ วิญญาณออกจากคิว)
  sprites.forEach((m, k) => {
    if (!m.userData.live) {
      m.visible = false;
      if (m.userData.rootShadow) m.userData.rootShadow.visible = false;
      if (m.userData.depthBack) m.userData.depthBack.visible = false;
    }
  });

  // ไฟลาวาเต้น
  scene.children.forEach(o => {
    if (o.isPointLight) o.intensity = 3.4 + Math.sin(t / 620 + o.userData.phase) * 1.1;
  });

  R.render(scene, cam);
}

/** แปลงพิกัดฉาก -> ตำแหน่งบนจอเป็น % (ให้หมุดคำพูดเกาะหัวตัวละครได้เหมือนโหมด 2D) */
export function project(sx, sy, hPx = 0) {
  const v = new THREE.Vector3(toX(sx), hPx / U, toZ(sy)).project(cam);
  return [(v.x * 0.5 + 0.5) * 100, (-v.y * 0.5 + 0.5) * 100, v.z < 1];
}

/** แปลงตำแหน่งเมาส์ -> พิกัดฉาก โดยยิงรังสีลงไปตัดกับระนาบพื้น */
export function unproject(canvas, e) {
  const r = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    (e.clientX - r.left) / r.width * 2 - 1,
    -((e.clientY - r.top) / r.height * 2 - 1));
  const ray = new THREE.Raycaster();
  ray.setFromCamera(ndc, cam);
  const hit = new THREE.Vector3();
  if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) return null;
  return [(hit.x + W / 2) * U, (hit.z + H / 2) * U];
}

export function resize(w, h) {
  if (!R) return;
  R.setSize(w, h, false);
  cam.aspect = w / h;
  cam.updateProjectionMatrix();
}
