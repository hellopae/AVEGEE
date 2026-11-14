"""Prepare 64px-context references and owner-mask evidence, without generation."""
from pathlib import Path
import hashlib
import json
import re
import numpy as np
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1]
ROOT = OUT.parents[2]
CHUNKS = ['r2-c4', 'r2-c5', 'r3-c1', 'r3-c2']
FULL = (4915, 3277)


def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def master():
    image = Image.new('RGB', FULL)
    for row in range(1, 5):
        for col in range(1, 6):
            image.paste(Image.open(ROOT/f'img/map-zone4/v3/r{row}-c{col}.webp'), ((col-1)*1024, (row-1)*1024))
    return image


def bounds(chunk):
    row, col = map(int, re.fullmatch(r'r(\d)-c(\d)', chunk).groups())
    x, y = (col-1)*1024, (row-1)*1024
    return [x, y, min(x+1024, FULL[0]), min(y+1024, FULL[1])]


def rectangles(chunk):
    x0, y0, x1, y1 = bounds(chunk)
    xs, ys = [x0, x0+(x1-x0+1)//2, x1], [y0, y0+(y1-y0+1)//2, y1]
    result = {}
    for row in range(2):
        for col in range(2):
            core = [xs[col], ys[row], xs[col+1], ys[row+1]]
            context = [max(0, core[0]-64), max(0, core[1]-64), min(FULL[0], core[2]+64), min(FULL[1], core[3]+64)]
            result[f'q{row+1}{col+1}'] = {'coreRectPx1x':core, 'contextRectPx1x':context}
    return result


def walkmask():
    text = (ROOT/'src/town-owner-walkmask-cyberhell.js').read_text()
    runs = json.loads(re.search(r'TOWN_OWNER_WALK_RUNS=(\[.*?\]);', text).group(1))
    mask = np.zeros(480*320, np.uint8)
    offset = 0
    for i, length in enumerate(runs):
        mask[offset:offset+length] = i%2
        offset += length
    assert offset == mask.size
    return mask.reshape(320, 480)


def main():
    image = master()
    mask = walkmask()
    full_mask = np.array(Image.fromarray(mask*255).resize(FULL, Image.Resampling.NEAREST))>0
    contact = Image.new('RGB', (1536, 1536))
    walk_contact = contact.copy()
    metadata = {}
    for index, chunk in enumerate(CHUNKS):
        dest = OUT/chunk
        dest.mkdir(exist_ok=True)
        box = bounds(chunk)
        metadata[chunk] = {'chunkRectPx1x':box, 'parts':rectangles(chunk)}
        for q, data in metadata[chunk]['parts'].items():
            path = dest/f'{q}-input.webp'
            image.crop(data['contextRectPx1x']).save(path, lossless=True, method=6)
            data['inputSHA256'] = sha(path)
        tile = image.crop(box)
        preview = Image.new('RGB', (768, 768), (20, 16, 30))
        tile.thumbnail((768, 736))
        preview.paste(tile, (0, 32))
        ImageDraw.Draw(preview).text((10, 10), chunk, fill='white')
        contact.paste(preview, ((index%2)*768, (index//2)*768))
        a = np.array(image.crop(box)).copy()
        m = full_mask[box[1]:box[3], box[0]:box[2]]
        a[m] = (a[m]*.6+np.array([30, 255, 80])*.4).astype(np.uint8)
        overlay = Image.fromarray(a)
        overlay.thumbnail((768, 736))
        preview.paste(overlay, (0, 32))
        walk_contact.paste(preview, ((index%2)*768, (index//2)*768))
    dump(OUT/'inputs.json', metadata)
    contact.save(OUT/'source-contact.jpg', quality=85)
    walk_contact.save(OUT/'walkmask-contact.jpg', quality=85)
    print(json.dumps(metadata, indent=2))


if __name__ == '__main__':
    main()
