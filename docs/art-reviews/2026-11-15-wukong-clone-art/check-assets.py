"""ตรวจไฟล์ภาพส่งมอบด้วย Pillow; เรียกจาก working directory ใดก็ได้."""
from pathlib import Path
import hashlib
import struct

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
ART = ROOT / 'img/z2-events'
EXPECTED = {
    'boss-wukong-clone-asia.webp': ((512, 512), 'RGBA', b'VP8L'),
    'boss-wukong-clone-asia-profile.webp': ((512, 512), 'RGB', b'VP8 '),
    'cut-wukong-sweep-asia.webp': ((1672, 941), 'RGB', b'VP8 '),
    'cut-wukong-clones-asia.webp': ((1672, 941), 'RGB', b'VP8 '),
}


def chunks(data):
    assert data[:4] == b'RIFF' and data[8:12] == b'WEBP'
    assert struct.unpack_from('<I', data, 4)[0] + 8 == len(data)
    offset = 12
    while offset < len(data):
        size = struct.unpack_from('<I', data, offset + 4)[0]
        yield data[offset:offset + 4]
        offset += 8 + size + size % 2
    assert offset == len(data)


for name, (size, mode, encoding) in EXPECTED.items():
    path = ART / name
    data = path.read_bytes()
    assert encoding in list(chunks(data)), f'{name}: unexpected WebP encoding'
    with Image.open(path) as im:
        im.load()  # Decode the entire image, not just its header.
        assert im.format == 'WEBP' and im.size == size and im.mode == mode, name
    print(f'OK {name}: {size[0]}x{size[1]} {mode} {encoding.decode().strip()} '
          f'{len(data)} bytes SHA256={hashlib.sha256(data).hexdigest()}')

with Image.open(ART / 'boss-wukong-clone-asia.webp') as clone:
    alpha = clone.getchannel('A')
    box = alpha.getbbox()
    assert box and min(box[0], box[1], 512 - box[2], 512 - box[3]) >= 24
    assert alpha.getextrema()[0] == 0
    histogram = alpha.histogram()
    assert sum(histogram[1:255]) > 10000, 'Missing painted partial transparency'
    for bounds in [(0, 0, 512, 24), (0, 488, 512, 512),
                   (0, 0, 24, 512), (488, 0, 512, 512)]:
        assert alpha.crop(bounds).getextrema() == (0, 0), 'Dirty canvas edge'
    pixels = clone.tobytes()
    assert all(pixels[i:i + 3] == b'\0\0\0'
               for i in range(0, len(pixels), 4) if pixels[i + 3] == 0), \
        'Hidden matte color in fully transparent pixels'
    with Image.open(ART / 'boss-wukong-asia.webp') as original:
        original_box = original.getchannel('A').getbbox()
        assert box[3] - box[1] < original_box[3] - original_box[1]
    print(f'OK alpha: bbox={box}; 24px transparent border; '
          f'{sum(histogram[1:255])} partially transparent pixels; no hidden matte')

for suffix in ['', '-profile']:
    assert (ART / f'boss-wukong-clone-asia{suffix}.webp').read_bytes() != \
        (ART / f'boss-wukong-asia{suffix}.webp').read_bytes(), 'Unchanged placeholder'

with Image.open(Path(__file__).with_name('contact-sheet.jpg')) as sheet:
    sheet.load()
    assert sheet.format == 'JPEG' and sheet.mode == 'RGB' and sheet.size == (1600, 2208)
print('OK contact-sheet.jpg: 1600x2208 RGB JPEG')
print('ตรวจโครงสร้างไฟล์ครบ 4 ภาพ; องค์ประกอบและขอบบนพื้นสว่าง/เข้มต้องตรวจด้วยสายตาร่วมด้วย')
