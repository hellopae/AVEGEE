// Pure colour grading of the painted town ground (no DOM, no module state): shared by the main thread (town-lighting.js) and the bake worker
// (terrain-bake-worker.js).  Moved out of town-lighting.js in Z1-V5-FX3 without changing a formula.
export const clamp = x => Math.max(0, Math.min(1, x));
export function fireStrength(r, g, b) { return clamp((r - 160) / 70) * clamp((r - b - 70) / 90) * clamp((g - b - 20) / 60) * clamp((100 - b) / 65); }
// M2: a zone may list extra light sources (zone-skin.js light.emit). A 'hue' source marks bright, saturated pixels inside
// its hue range as glowing, exactly the way fireStrength() marks orange fire. Zone 1 lists only the fire reader.
export function hueStrength(r, g, b, e) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return 0;
  const v = mx / 255, sat = d / mx;
  if (v < e.vMin - .2 || sat < e.sMin - .25) return 0;
  const h = (mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60, hue = (h + 360) % 360;
  if (hue < e.hue[0] || hue > e.hue[1]) return 0;
  return clamp((v - (e.vMin - .2)) / .2) * clamp((sat - (e.sMin - .25)) / .25);
}
// Strongest emitter at a pixel and its glow colour (rgb), for zones with more than the fire reader.
export function emitAt(emit, r, g, b, out = [0, 0, 0, 0]) {
  let best = 0, col = null;
  for (const e of emit) {
    const s = e.type === 'fire' ? fireStrength(r, g, b) : hueStrength(r, g, b, e);
    if (s > best) { best = s; col = e.type === 'fire' ? null : e.color; }
  }
  out[0] = best; out[1] = col ? col[0] : 255; out[2] = col ? col[1] : Math.min(230, g); out[3] = col ? col[2] : 20; return out;
}
export function hellColor(r, g, b, out = [0, 0, 0], light = 0, strength = null) {
  const fire = strength === null ? fireStrength(r, g, b) : strength, l = .299 * r + .587 * g + .114 * b;
  for (let i = 0; i < 3; i++) {
    const v = i === 0 ? r : i === 1 ? g : b;
    const shade = (i === 0 ? .74 : i === 1 ? .73 : .76) + light * (i === 0 ? .30 : i === 1 ? .24 : .12);
    const base = (l + (v - l) * 1.03) * shade, boost = i === 0 ? 1.13 : i === 1 ? 1.08 : 1;
    out[i] = Math.round(Math.max(0, Math.min(255, base * (1 - fire) + v * boost * fire)));
  }
  return out;
}
/** Grade `h` rows of RGBA pixels `px` (rows y0..y0+h of an image H rows tall) in place and write the glow into `gl` (same layout).  `col[x]` = light-field column of
 *  pixel x, `field` the light field (COLS wide), rows are looked up from the world rectangle `[ox, oy, ww, wh]`.  Returns true if any pixel glows.  Identical maths to
 *  the former inline loop of town-lighting.js (LOAD-01b). */
export function gradeStrip(px, gl, W, h, y0, H, geo, emit, fireOnly) {
  const { ox, oy, ww, wh, CELL, COLS, ROWS, field, col } = geo, rgb = [0, 0, 0], em = [0, 0, 0, 0];
  let any = false;
  for (let yy = 0; yy < h; yy++) {
    const row = Math.max(0, Math.min(ROWS - 1, Math.floor((oy + (y0 + yy) / H * wh) / CELL))) * COLS;
    for (let x = 0; x < W; x++) {
      const i = (yy * W + x) * 4, r = px[i], g = px[i + 1], b = px[i + 2], light = field[row + col[x]];
      if (fireOnly) {
        if (r <= 160) {   // fireStrength is exactly 0 here (first clamp), so the grade reduces to the plain shaded base colour
          const l = .299 * r + .587 * g + .114 * b, s0 = .74 + light * .30, s1 = .73 + light * .24, s2 = .76 + light * .12;
          px[i] = Math.round(Math.max(0, Math.min(255, (l + (r - l) * 1.03) * s0)));
          px[i + 1] = Math.round(Math.max(0, Math.min(255, (l + (g - l) * 1.03) * s1)));
          px[i + 2] = Math.round(Math.max(0, Math.min(255, (l + (b - l) * 1.03) * s2)));
          gl[i] = 255; gl[i + 1] = Math.min(230, g); gl[i + 2] = 20; gl[i + 3] = 0;
        } else {
          const s = fireStrength(r, g, b);
          hellColor(r, g, b, rgb, light);
          px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2];
          gl[i] = 255; gl[i + 1] = Math.min(230, g); gl[i + 2] = 20; gl[i + 3] = Math.round(255 * s);
        }
      } else {
        emitAt(emit, r, g, b, em);
        hellColor(r, g, b, rgb, light, em[0]);
        px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2];
        gl[i] = em[1]; gl[i + 1] = em[2]; gl[i + 2] = em[3]; gl[i + 3] = Math.round(255 * em[0]);
      }
      if (gl[i + 3]) any = true;
    }
  }
  return any;
}
/** Light-field column of every pixel x for a graded image W px wide covering world x `ox..ox+ww`. */
export function lightColumns(W, ox, ww, CELL, COLS) {
  const col = new Int32Array(W);
  for (let x = 0; x < W; x++) col[x] = Math.max(0, Math.min(COLS - 1, Math.floor((ox + x / W * ww) / CELL)));
  return col;
}
