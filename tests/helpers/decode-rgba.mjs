// Decode any image the tests ship (PNG / WebP / JPEG) to raw RGBA through Pillow.
// Since 12 Nov 2569 the game art is WebP, which node cannot decode without a library;
// other tests in this repo already shell out to python3 + Pillow the same way.
import { execFileSync } from 'node:child_process';

const PY = `
import sys, struct
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGBA')
sys.stdout.buffer.write(struct.pack('<II', *im.size) + im.tobytes())
`;

export function decodeRGBA(file) {
  const buf = execFileSync('python3', ['-I', '-c', PY, String(file)], { maxBuffer: 1 << 29 });
  const w = buf.readUInt32LE(0), h = buf.readUInt32LE(4);
  return { w, h, out: new Uint8Array(buf.buffer, buf.byteOffset + 8, w * h * 4) };
}
