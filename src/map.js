// map.js — แผนที่ tile + วาดฉาก
import { TILE, MAP_W, MAP_H, SLOTS } from './data.js';
import { drawGround, drawEdges, drawLavaGlow, drawStation, drawSoul, drawCrew,
         drawProp, drawEmbers, drawVignette, hash, rr } from './art.js';

export const ST_SIZE = TILE * 3;

const inSlot = (x, y) => SLOTS.some(s => x >= s.x - 1 && x <= s.x + 3 && y >= s.y - 1 && y <= s.y + 3);

/** สร้างผังพื้น + ของประดับ (คงที่ทุกครั้ง ไม่สุ่มใหม่ตอนรีเฟรช) */
export function buildMap() {
  const map = [];
  for (let y = 0; y < MAP_H; y++) { map[y] = []; for (let x = 0; x < MAP_W; x++) map[y][x] = 'rock'; }

  // ธารลาวาขอบบน-ล่าง ขอบหยักไม่เป็นเส้นตรง
  for (let x = 0; x < MAP_W; x++) {
    const top = 1 + Math.round(0.9 + Math.sin(x * 0.55) + hash(x, 3) * 0.9);
    const bot = 1 + Math.round(0.9 + Math.cos(x * 0.7) + hash(x, 9) * 0.9);
    for (let k = 0; k < top; k++) map[k][x] = 'lava';
    for (let k = 0; k < bot; k++) map[MAP_H - 1 - k][x] = 'lava';
  }
  // ถนนกลาง
  for (let x = 0; x < MAP_W; x++) { map[6][x] = 'path'; map[7][x] = 'path'; }
  // ทางแยกเข้าสถานี
  for (const s of SLOTS) {
    const cx = s.x + 1;
    const from = Math.min(s.y + 3, 6), to = Math.max(s.y, 7);
    for (let y = from; y <= to; y++) if (map[y] && map[y][cx]) map[y][cx] = 'path';
  }

  // ของประดับ — ทำให้แผนที่แน่นแบบภาพอ้างอิง
  const decor = [];
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    if (map[y][x] !== 'rock' || inSlot(x, y)) continue;
    // โคมไฟเรียงสองข้างถนน
    if ((y === 5 || y === 8) && x % 5 === 2) { decor.push({ x, y, k: 'lantern' }); continue; }
    const r = hash(x * 3 + 17, y * 5 + 29);
    if (r > 0.90) decor.push({ x, y, k: 'thorn' });
    else if (r > 0.80) decor.push({ x, y, k: 'rock' });
    else if (r > 0.755) decor.push({ x, y, k: 'bones' });
    else if (r > 0.735) decor.push({ x, y, k: 'urn' });
  }
  decor.sort((a, b) => a.y - b.y);
  return { map, decor };
}

/** วาดทั้งฉากหนึ่งเฟรม */
export function render(ctx, g, world, t, hover) {
  const { map, decor } = world;
  ctx.imageSmoothingEnabled = false;
  drawGround(ctx, map, MAP_W, MAP_H, t);
  drawEdges(ctx, map, MAP_W, MAP_H);
  drawLavaGlow(ctx, map, MAP_W, MAP_H, t);

  // ช่องว่างที่ยังสร้างได้
  const used = new Set(g.stations.map(s => s.slotIdx));
  SLOTS.forEach((s, i) => {
    if (used.has(i)) return;
    ctx.fillStyle = 'rgba(20,8,12,.35)';
    rr(ctx, s.x * TILE + 4, s.y * TILE + 4, ST_SIZE - 8, ST_SIZE - 8, 6); ctx.fill();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = 'rgba(240,190,120,.28)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.setLineDash([]);
  });

  // ของประดับที่อยู่เหนือแนวสถานี
  for (const d of decor) if (d.y < 8) drawProp(ctx, d.k, d.x * TILE, d.y * TILE, t);

  // สถานี (เรียงตาม y ให้บังกันถูก)
  const list = [...g.stations].sort((a, b) => a.slot.y - b.slot.y);
  for (const st of list) {
    const px = st.slot.x * TILE, py = st.slot.y * TILE;
    drawStation(ctx, st.def, px, py, ST_SIZE, { active: !!st.soul, t });

    if (hover === st.def.k) {
      ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 2;
      rr(ctx, px + 2, py + 2, ST_SIZE - 4, ST_SIZE - 4, 8); ctx.stroke();
    }
    if (st.crewK) {
      const c = g.crewOf(st.crewK);
      if (c) drawCrew(ctx, c, px + ST_SIZE - 16, py + ST_SIZE + 2, 34, t);
    }
    if (st.soul) {
      drawSoul(ctx, px + 18, py + ST_SIZE - 16, 5, t);
      const w = ST_SIZE - 16, p = Math.min(1, st.progress / st.need);
      ctx.fillStyle = 'rgba(0,0,0,.7)'; rr(ctx, px + 8, py + ST_SIZE + 1, w, 6, 3); ctx.fill();
      ctx.fillStyle = '#ff9d3a'; rr(ctx, px + 8, py + ST_SIZE + 1, w * p, 6, 3); ctx.fill();
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i < st.intensity ? '#ff6a4a' : 'rgba(255,255,255,.18)';
        ctx.beginPath(); ctx.arc(px + 12 + i * 8, py + ST_SIZE + 14, 2.6, 0, 7); ctx.fill();
      }
    }
  }

  // ของประดับแถวล่าง วาดทับสถานีให้ดูมีชั้น
  for (const d of decor) if (d.y >= 8) drawProp(ctx, d.k, d.x * TILE, d.y * TILE, t);

  // คิววิญญาณลอยเข้ามาตามถนน
  g.queue.slice(0, 12).forEach((s, i) => {
    drawSoul(ctx, 22 + i * 26, 6.9 * TILE, 6, t + i * 200, s.waited > 40 ? '#ffb0b0' : '#bfe9ff');
  });

  // ประตูทางเข้า
  ctx.fillStyle = 'rgba(255,120,50,.20)';
  ctx.fillRect(0, 6 * TILE, 8, TILE * 2);

  drawEmbers(ctx, MAP_W * TILE, MAP_H * TILE, t);
  drawVignette(ctx, MAP_W * TILE, MAP_H * TILE);
}

/** คลิกโดนสถานีไหน */
export function hitStation(g, mx, my) {
  for (const st of g.stations) {
    const px = st.slot.x * TILE, py = st.slot.y * TILE;
    if (mx >= px && mx < px + ST_SIZE && my >= py && my < py + ST_SIZE) return st;
  }
  return null;
}

/** คลิกโดนช่องว่างไหน (คืน index ของ SLOTS) */
export function hitSlot(g, mx, my) {
  const used = new Set(g.stations.map(s => s.slotIdx));
  for (let i = 0; i < SLOTS.length; i++) {
    if (used.has(i)) continue;
    const s = SLOTS[i];
    if (mx >= s.x * TILE && mx < s.x * TILE + ST_SIZE && my >= s.y * TILE && my < s.y * TILE + ST_SIZE) return i;
  }
  return -1;
}
