// view3d.js — มุมมอง 3D แบบ billboard
//
// ทำไมเป็น billboard ไม่ใช่ 3D เต็มตัว:
// ทีมวัดกำลังผลิตงานวาดไว้ที่ 6-10 ชิ้น/สัปดาห์ (Toby, game-feasibility-v2.md)
// ถ้าไปโมเดล 3D จริง ตัวละคร 1 ตัว = โมเดล + texture + rig + animation
// และรูปที่ gen มาแล้วทั้งหมดใช้ต่อไม่ได้เลยสักไฟล์
// วิธีนี้ (แบบเดียวกับ Don't Starve / Octopath) ได้กล้อง แสง เงา และความลึกจริง
// โดยงานวาดเพิ่มเป็นศูนย์ — สไปรท์ชุดเดิมยืนตั้งขึ้นมาหันเข้าหากล้อง

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.180.0/three.module.min.js';
import { SCENE, STATIONS, SPOTS, QUEUE_LINE } from './data.js';

const U = 20;                                   // 20 px บนฉาก = 1 หน่วยโลก
const W = SCENE.w / U, H = SCENE.h / U;         // พื้นกว้าง 76.4 x ลึก 35.2
const toX = sx => sx / U - W / 2;
const toZ = sy => sy / U - H / 2;

let R, scene, cam, dirty = true;
const sprites = new Map();                      // key -> THREE.Sprite/Mesh ที่ใช้ซ้ำ
const texCache = new Map();
const orbit = { yaw: 0, pitch: 0.92, dist: 46, tx: 0, tz: 2 };

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

  // พื้น = ภาพฉากเดิมทั้งใบ ปูราบเป็นระนาบ
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshStandardMaterial({ map: tex('img/scene.png'), roughness: 1, metalness: 0 }));
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

  scene.add(new THREE.AmbientLight(0x5a3040, 1.15));
  const moon = new THREE.DirectionalLight(0xffd0b0, 0.75);
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

/** ผูกการหมุน/ซูมกล้องกับเมาส์ */
export function bindControls(canvas) {
  let drag = null;
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; });
  addEventListener('pointerup', () => { drag = null; });
  addEventListener('pointermove', e => {
    if (!drag) return;
    orbit.yaw -= (e.clientX - drag.x) * 0.005;
    orbit.pitch = clamp(orbit.pitch - (e.clientY - drag.y) * 0.004, 0.32, 1.35);
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
  m.scale.set(h, h, 1);
  m.position.set(toX(sx), h / 2 + (opt.lift || 0), toZ(sy));
  m.rotation.y = orbit.yaw;
  m.visible = true;
  m.userData.live = true;
  return m;
}

export function render(g, t) {
  // ---- กล้อง ----
  cam.position.set(
    orbit.tx + Math.sin(orbit.yaw) * Math.cos(orbit.pitch) * orbit.dist,
    Math.sin(orbit.pitch) * orbit.dist,
    orbit.tz + Math.cos(orbit.yaw) * Math.cos(orbit.pitch) * orbit.dist);
  cam.lookAt(orbit.tx, 0, orbit.tz);

  sprites.forEach(m => { m.userData.live = false; });

  // ---- อาคารที่สร้างแล้ว ----
  for (const st of g.stations) {
    const d = st.def;
    if (d.bx == null) continue;
    billboard('st-' + d.k, `img/st-${d.k}.png`, d.bx, d.by, d.bw * 0.92);
  }

  // ---- ตัวเรา / พญายม / ยมทูต ----
  billboard('hero', 'img/hero-yama.png', SPOTS.bench.x, SPOTS.bench.y, 92);
  if (g.bossUntil && t < g.bossUntil)
    billboard('boss', 'img/hero-boss.png', SPOTS.throne.x, SPOTS.throne.y, 116);
  for (const c of g.crew) {
    const st = c.at ? STATIONS.find(d => d.k === c.at) : null;
    billboard('c-' + c.k, `img/crew-${c.k}.png`, st ? st.x : c.hx, st ? st.y : c.hy, 82);
  }

  // ---- วิญญาณ: ลอยเหนือพื้นนิดหนึ่ง ----
  g.queue.forEach((s, i) => {
    const p = QUEUE_LINE[i];
    if (!p) return;
    billboard('q-' + s.id, `img/spirit${s.id % 3 + 1}.png`, p[0], p[1], 64,
      { lift: 0.5 + Math.sin(t / 520 + i) * 0.18 });
  });
  for (const st of g.stations)
    if (st.soul)
      billboard('s-' + st.soul.id, `img/spirit${st.soul.id % 3 + 1}.png`, st.def.x - 40, st.def.y, 56, { lift: 0.4 });

  // ---- เรือข้ามแม่น้ำ ----
  const f = SPOTS.ferry, ph = t / 5200;
  const fx = f.from[0] + (f.to[0] - f.from[0]) * (Math.sin(ph) + 1) / 2;
  const boat = billboard('boat', 'img/prop-boat.png', fx, f.from[1], 120, { lift: -0.3 });
  boat.scale.x *= Math.cos(ph) > 0 ? -1 : 1;

  // เก็บกวาดสไปรท์ของสิ่งที่หายไปแล้ว (คดีจบ วิญญาณออกจากคิว)
  sprites.forEach((m, k) => { if (!m.userData.live) m.visible = false; });

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
