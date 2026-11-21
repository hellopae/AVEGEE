// Leaf contours traced on AVEGEE's own red banyan. Coordinates match the
// 475×520 reference. The gaps between clumps leave the major branches fixed.
const LEAF_SHAPES = [
  'M68 78 Q96 51 119 55 Q121 31 148 30 Q159 13 181 17 Q199 -4 222 0 Q251 5 267 29 Q288 36 291 56 Q267 65 247 68 Q231 88 208 89 Q202 105 186 104 Q173 91 155 99 Q130 98 112 106 L83 100 Q76 90 68 78Z',
  'M261 47 Q286 33 308 50 Q329 50 343 68 Q374 66 381 81 Q388 94 372 108 Q353 109 331 108 Q312 124 297 111 Q278 98 264 106 Q244 97 247 81 L261 47Z',
  'M19 121 Q42 103 63 105 Q78 97 96 104 Q123 98 135 119 Q155 117 165 129 Q154 144 134 147 Q123 165 104 156 Q77 160 66 148 Q42 153 24 145 Q12 138 19 121Z',
  'M287 118 Q314 107 333 118 Q346 128 364 118 Q378 102 398 106 Q424 105 435 118 Q454 122 476 149 L476 180 Q461 175 445 184 Q429 166 405 171 Q392 152 379 158 Q353 152 340 163 Q317 151 297 163 Q278 157 269 142 L287 118Z',
  'M8 173 Q30 155 55 160 Q75 150 90 166 Q104 173 111 192 Q93 203 79 200 Q70 221 51 213 Q49 235 30 231 Q11 234 3 213 L-3 193 Z',
  'M311 196 Q336 170 363 174 Q382 178 401 173 Q416 176 428 191 Q449 183 473 204 L476 241 Q456 243 445 257 Q424 247 410 254 Q398 232 373 241 Q355 242 345 228 Q326 230 301 224 Q292 218 299 208Z',
];
const WIDTH = 475;
const HEIGHT = 520;
const CYCLE_MS = 7400;

const smooth = x => x * x * (3 - 2 * x);

// Reuse this sampler for falling leaves. x is the position along the room's
// wind direction, in room-image widths. Positive x means wind moves right.
export function roomWindAt(timeMs, x) {
  const phase = ((timeMs / CYCLE_MS - x * .66) % 1 + 1) % 1;
  const strength = smooth(Math.max(0, 1 - Math.abs(phase - .34) / .28));
  return {
    strength,
    wave: Math.sin(2 * Math.PI * (timeMs / 1770 - x * 1.24)),
  };
}

function layer(draw) {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  draw?.(canvas.getContext('2d'));
  return canvas;
}

export function makeRoomTreeWind(sprite) {
  const paths = LEAF_SHAPES.map(shape => new Path2D(shape));
  const clumps = paths.map(path => layer(ctx => {
    ctx.clip(path);
    ctx.drawImage(sprite, 0, 0, WIDTH, HEIGHT);
  }));
  const base = layer(ctx => {
    ctx.drawImage(sprite, 0, 0, WIDTH, HEIGHT);
    const canopy = new Path2D();
    for (const path of paths) canopy.addPath(path);
    ctx.clip(canopy);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(38, 5, 14, .20)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  });
  const frame = layer();
  const ctx = frame.getContext('2d');
  return (timeMs, treeX) => {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.drawImage(base, 0, 0);
    for (const [index, clump] of clumps.entries()) {
      const {strength, wave} = roomWindAt(timeMs, treeX + index * .055);
      ctx.drawImage(clump, strength * (2.3 + wave * 1.45), -strength * (1.15 + wave * .85));
    }
    return frame;
  };
}
