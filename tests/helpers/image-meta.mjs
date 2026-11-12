// Width / height / alpha of a PNG, JPEG or WebP file without any image library.
// Needed since 12 Nov 2569: the game's PNG/JPEG art ships as WebP (smaller deploy), but these tests
// used to read the PNG IHDR bytes directly.
import { readFileSync } from 'node:fs';

export function imageMeta(fileOrBuffer) {
  const b = Buffer.isBuffer(fileOrBuffer) ? fileOrBuffer : readFileSync(fileOrBuffer);
  if (b.length > 24 && b.toString('latin1', 1, 4) === 'PNG') {
    const ct = b[25];   // 4 = grey+alpha, 6 = RGBA
    return { format: 'png', width: b.readUInt32BE(16), height: b.readUInt32BE(20), hasAlpha: ct === 4 || ct === 6 };
  }
  if (b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') {
    const kind = b.toString('latin1', 12, 16);
    if (kind === 'VP8X') {
      return { format: 'webp', width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3), hasAlpha: !!(b[20] & 0x10) };
    }
    if (kind === 'VP8L') {
      const bits = b.readUInt32LE(21);
      return { format: 'webp', width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff), hasAlpha: !!((bits >> 28) & 1) };
    }
    if (kind === 'VP8 ') {
      return { format: 'webp', width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff, hasAlpha: false };
    }
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i + 9 < b.length;) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { format: 'jpeg', width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5), hasAlpha: false };
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  throw new Error('unknown image format');
}
