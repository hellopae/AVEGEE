import { SWORD_SHEETS } from './yama-sword-v2-assets.js';

// One physical slash, synchronized to the existing 580 ms battle lunge.
// Wind up visibly, cut quickly through contact, hold the low follow-through, then recover.
export const SWORD_FRAME_MS = Object.freeze([85, 80, 60, 35, 40, 80, 100, 100]);
export const SWORD_DURATION_MS = SWORD_FRAME_MS.reduce((a, b) => a + b, 0);
export const swordSheet = style => SWORD_SHEETS[style] || SWORD_SHEETS.th;
export function swordFrame(elapsed) {
  let end = 0;
  for (let i = 0; i < SWORD_FRAME_MS.length; i++) {
    end += SWORD_FRAME_MS[i];
    if (Math.max(0, elapsed) < end) return i;
  }
  return SWORD_FRAME_MS.length - 1;
}
export const isYamaSwordAttack = fx => fx?.action === 'atk' && !fx.crew;
const images = new Map();
export function swordImage(style) {
  const sheet = swordSheet(style);
  if (!images.has(sheet.src)) { const im = new Image(); im.src = sheet.src; images.set(sheet.src, im); }
  return images.get(sheet.src);
}

/** Fixed body height and feet anchor across all frames; blade may extend beyond the body. */
export function drawYamaSword(ctx, style, x, feet, bodyHeight, elapsed = 0, face = 1) {
  const sheet = swordSheet(style), im = swordImage(style);
  if (!im.complete || !im.naturalWidth) return false;
  const scale = bodyHeight / sheet.bodyHeight, frame = swordFrame(elapsed);
  ctx.save(); ctx.translate(x, feet); ctx.scale(face < 0 ? -1 : 1, 1);
  ctx.drawImage(im, frame * sheet.size, 0, sheet.size, sheet.size,
    -sheet.anchor.x * scale, -sheet.anchor.y * scale, sheet.size * scale, sheet.size * scale);
  ctx.restore();
  return true;
}
const standingBoxes = new Map();
function standingBox(im) {
  if (standingBoxes.has(im.src)) return standingBoxes.get(im.src);
  const canvas = document.createElement('canvas'); canvas.width = im.naturalWidth; canvas.height = im.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently:true }); ctx.drawImage(im, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let top = canvas.height, bottom = 0, left = canvas.width, right = 0;
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    if (pixels[(y * canvas.width + x) * 4 + 3] > 40) {
      top = Math.min(top, y); bottom = Math.max(bottom, y + 1); left = Math.min(left, x); right = Math.max(right, x + 1);
    }
  }
  const box = { top:top/canvas.height, bottom:bottom/canvas.height, center:(left+right)/2/canvas.width };
  standingBoxes.set(im.src, box); return box;
}

/** Keep the standing <img> as the team's size reference, overlay only during Yama's ordinary slash. */
export function mountBattleSword(stage, style, startedAt) {
  const actor = stage.querySelector('.fig.you'), standing = actor?.querySelector('img:not(.fx)');
  if (!standing) return;
  const canvas = document.createElement('canvas'); canvas.className = 'yama-sword-animation';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position:'absolute', pointerEvents:'none', maxWidth:'none', zIndex:'1' });
  actor.append(canvas);
  const ctx = canvas.getContext('2d');
  const finish = () => { standing.style.visibility = ''; canvas.remove(); };
  const render = () => {
    const elapsed = Date.now() - startedAt;
    if (!canvas.isConnected || elapsed >= SWORD_DURATION_MS) { finish(); return; }
    if (standing.complete && standing.naturalWidth && swordImage(style).naturalWidth) {
      const r = standing.getBoundingClientRect(), ar = actor.getBoundingClientRect();
      const box = standingBox(standing), scale = Math.min(r.width / standing.naturalWidth, r.height / standing.naturalHeight);
      const w = standing.naturalWidth * scale, h = standing.naturalHeight * scale;
      const x0 = r.left - ar.left + (r.width-w)/2, y0 = r.top - ar.top + r.height-h;
      canvas.width = Math.ceil(w*3); canvas.height = Math.ceil(h*2);
      Object.assign(canvas.style, { left:`${x0-w}px`, top:`${y0-h}px`, width:`${w*3}px`, height:`${h*2}px` });
      const flipped = getComputedStyle(standing).transform.startsWith('matrix(-1');
      const center = flipped ? 1-box.center : box.center;
      if (drawYamaSword(ctx, style, w*(1+center), h*(1+box.bottom), h*(box.bottom-box.top), elapsed)) {
        standing.style.visibility = 'hidden'; canvas.dataset.frame = String(swordFrame(elapsed));
      }
    }
    requestAnimationFrame(render);
  };
  render();
}
