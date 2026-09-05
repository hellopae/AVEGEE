// map.js — แผนที่ tile + วาดฉาก
import { TILE, MAP_W, MAP_H, SLOTS } from './data.js';
import { drawTile, drawStation, drawSoul, drawCrew, rr } from './art.js';

export const ST_SIZE = TILE * 3;

/** สร้างผังพื้น: หิน / ทางเดินขี้เถ้า / ธารลาวา */
export function buildMap() {
  const m = [];
  for (let y = 0; y < MAP_H; y++) {
    m[y] = [];
    for (let x = 0; x < MAP_W; x++) m[y][x] = 'rock';
  }
  // ธารลาวาบน-ล่าง
  for (let x = 0; x < MAP_W; x++) {
    const w = 1 + (Math.sin(x * 0.6) > 0.3 ? 1 : 0);
    for (let k = 0; k < w; k++) { m[k][x] = 'lava'; m[MAP_H - 1 - k][x] = 'lava'; }
  }
  // ถนนกลาง
  for (let x = 0; x < MAP_W; x++) { m[6][x] = 'path'; m[7][x] = 'path'; }
  // ทางแยกเข้าสถานี
  for (const s of SLOTS) {
    const cx = s.x + 1;
    const from = Math.min(s.y + 3, 6), to = Math.max(s.y, 7);
    for (let y = from; y <= to; y++) if (m[y] && m[y][cx]) m[y][cx] = 'path';
  }
  return m;
}

/** วาดทั้งฉากหนึ่งเฟรม */
export function render(ctx, g, map, t, hover) {
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) drawTile(ctx, map[y][x], x, y, t);

  // ช่องว่างที่ยังสร้างได้
  const used = new Set(g.stations.map(s => s.slotIdx));
  SLOTS.forEach((s, i) => {
    if (used.has(i)) return;
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = 'rgba(240,190,120,.30)'; ctx.lineWidth = 1.5;
    rr(ctx, s.x * TILE + 4, s.y * TILE + 4, ST_SIZE - 8, ST_SIZE - 8, 6); ctx.stroke();
    ctx.setLineDash([]);
  });

  // สถานี (เรียงตาม y ให้บังกันถูก)
  const list = [...g.stations].sort((a, b) => a.slot.y - b.slot.y);
  for (const st of list) {
    const px = st.slot.x * TILE, py = st.slot.y * TILE;
    const active = !!st.soul;
    drawStation(ctx, st.def, px, py, ST_SIZE, { active, t });

    if (hover === st.def.k) {
      ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 2;
      rr(ctx, px + 2, py + 2, ST_SIZE - 4, ST_SIZE - 4, 8); ctx.stroke();
    }
    if (st.crewK) {
      const c = g.crewOf(st.crewK);
      if (c) drawCrew(ctx, c, px + ST_SIZE - 14, py + ST_SIZE - 4, 22, t);
    }
    if (st.soul) {
      drawSoul(ctx, px + 18, py + ST_SIZE - 16, 5, t);
      // หลอดความคืบหน้า
      const w = ST_SIZE - 16, p = Math.min(1, st.progress / st.need);
      ctx.fillStyle = 'rgba(0,0,0,.6)'; rr(ctx, px + 8, py + ST_SIZE + 1, w, 6, 3); ctx.fill();
      ctx.fillStyle = '#ff9d3a'; rr(ctx, px + 8, py + ST_SIZE + 1, w * p, 6, 3); ctx.fill();
      // จุดบอกระดับวาระ
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i < st.intensity ? '#ff6a4a' : 'rgba(255,255,255,.18)';
        ctx.beginPath(); ctx.arc(px + 12 + i * 8, py + ST_SIZE + 14, 2.6, 0, 7); ctx.fill();
      }
    }
  }

  // คิววิญญาณลอยอยู่บนถนน
  g.queue.slice(0, 12).forEach((s, i) => {
    drawSoul(ctx, 22 + i * 26, 6.9 * TILE, 6, t + i * 200, s.waited > 40 ? '#ffb0b0' : '#bfe9ff');
  });

  // ประตูทางเข้า
  ctx.fillStyle = 'rgba(255,120,50,.16)';
  ctx.fillRect(0, 6 * TILE, 10, TILE * 2);
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
