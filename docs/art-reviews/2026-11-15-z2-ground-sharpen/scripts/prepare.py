"""Prepare read-only source crops for the zone 2 repair, in this review only."""
import hashlib
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

OUT = Path(__file__).resolve().parents[1]
ROOT = OUT.parents[2]
SOURCE = Path('/Users/agapae/agapae-work/.codex-worktrees/20261113T085021Z-39f7fa12/docs/art-reviews/2026-11-10-z2-hd-assemble')
FULL = (9830, 6554)


def atlas(folder, size, chunk):
    result = Image.new('RGB', size)
    for row in range(1, 5):
        for col in range(1, 6):
            with Image.open(folder / f'r{row}-c{col}.webp') as tile:
                result.paste(tile.convert('RGB'), ((col - 1) * chunk, (row - 1) * chunk))
    return result


def prepare():
    before = atlas(SOURCE / 'v7', FULL, 2048)
    base = atlas(ROOT / 'img/map-zone2/v2', (4915, 3277), 1024)
    records = json.loads((SOURCE / 'inventory.json').read_text())['fallbackPatches']
    records.append(dict(id='missing-r2-c3-q22', core=[2560, 1536, 3072, 2048],
                        contextRectPx1x=[2496, 1472, 3136, 2112], geometrySource='v2'))
    # The approximate coordinates in the brief land on the rocks beside the
    # staircase. Source v2 identifies the whole actual diagonal stair below.
    records.append(dict(id='lava-bank-treads', core=[1450, 1210, 1885, 1440],
                        contextRectPx1x=[1402, 1162, 1933, 1488],
                        geometrySource='v2', briefApproximateCore=[1340, 1120, 1700, 1250]))
    for item in records:
        name = item['id']
        box = item['contextRectPx1x']
        box2 = tuple(v * 2 for v in box)
        before.crop(box2).save(OUT / 'inputs' / f'{name}-v7.png')
        base.crop(box).resize((box2[2] - box2[0], box2[3] - box2[1]), Image.Resampling.LANCZOS).save(
            OUT / 'inputs' / f'{name}-v2.png')
    (OUT / 'regions.json').write_text(json.dumps(records, indent=2) + '\n')
    pixels = np.array(before)
    excluded = np.zeros(pixels.shape[:2], bool)
    for item in records:
        x, y, ex, ey = [v * 2 for v in item['contextRectPx1x']]
        excluded[y:ey, x:ex] = True
    rings = []
    for item in records:
        x, y, ex, ey = [v * 2 for v in item['contextRectPx1x']]
        left, top = max(0, x - 96), max(0, y - 96)
        right, bottom = min(FULL[0], ex + 96), min(FULL[1], ey + 96)
        mask = ~excluded[top:bottom, left:right]
        image = cv2.cvtColor(pixels[top:bottom, left:right].astype(np.float32), cv2.COLOR_RGB2GRAY)
        lap = cv2.Laplacian(image, cv2.CV_32F)[mask]
        hp = (image - cv2.GaussianBlur(image, (0, 0), 1))[mask]
        rings.append(dict(id=item['id'], laplacian=float(lap.var()),
                          highpassRms=float(np.sqrt(np.mean(hp ** 2))), pixels=int(mask.sum()),
                          outerRectOutputPx=[left, top, right, bottom]))
    (OUT / 'native-ring.json').write_text(json.dumps(rings, indent=2) + '\n')
    paths = [SOURCE / 'inventory.json', SOURCE / 'seams.json', SOURCE / 'v7/manifest.json']
    paths += sorted((SOURCE / 'v7').glob('r*-c*.webp'))
    paths += sorted((ROOT / 'img/map-zone2/v2').glob('r*-c*.webp'))
    (OUT / 'source-hashes.json').write_text(json.dumps([
        dict(path=str(path), sha256=hashlib.sha256(path.read_bytes()).hexdigest()) for path in paths
    ], indent=2) + '\n')


if __name__ == '__main__':
    prepare()
