"""Apply conservative geometric alpha cuts, never generate/translate/fade artwork.

Uses hand-reviewed ground coordinates in review/mask-corrections.json, not the
partial exclusion labels used by verify_delivery.py. Keeps the inherited alpha
as an upper bound; cannot add pixels. Re-runnable from the included before masks.
The old exclusion labels become regression witnesses after this repair, not a
new independent full-liquid segmentation or an acceptance certificate.
"""
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageChops
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    spec = json.loads((ROOT / 'review/mask-corrections.json').read_text())
    layout = json.loads((ROOT / 'fx-layout.json').read_text())
    rects = {p['mask']: p['maskRectPx'] for p in layout['pieces']}
    records = []
    for item in spec['cuts']:
        name = item['mask']
        before = ROOT / 'review/before-masks' / (name + '.webp')
        assert sha(before) == item['beforeSha256'], name
        im = Image.open(before).convert('RGBA')
        support = np.asarray(im.getchannel('A')) > 0
        geometry = Image.new('L', im.size)
        draw = ImageDraw.Draw(geometry)
        if item['operation'] == 'keep-water-interiors':
            for poly in item['polygons']:
                draw.polygon([tuple(pt) for pt in poly], fill=255)
            keep = np.asarray(geometry) > 0
        elif item['operation'] == 'remove-occluders':
            for poly in item['polygons']:
                draw.polygon([tuple(pt) for pt in poly], fill=255)
            keep = ~ndimage.binary_dilation(np.asarray(geometry) > 0, iterations=item['guardNative2x'])
        elif item['operation'] == 'keep-near-ground-bank':
            x0, y0, _, _ = rects[name]
            for segment in item['bankSegments']:
                px, py, _, _ = rects[segment['groundCrop']]
                pts = [((px-x0)*2+x, (py-y0)*2+y) for x,y in segment['pointsNative2x']]
                draw.line(pts, fill=255, width=1)
            # Isotropic native pixels; width deliberately narrower than 12 world.
            keep = ndimage.distance_transform_edt(np.asarray(geometry) == 0) <= item['radiusNative2x']
        else:
            raise ValueError(item['operation'])
        result = support & keep
        assert result.any() and not np.any(result & ~support), name
        im.putalpha(Image.fromarray(result.astype('uint8') * 255))
        dest = ROOT / 'masks' / (name + '.webp')
        im.save(dest, lossless=True, method=6)
        records.append({'mask': name, 'beforeSha256': sha(before), 'afterSha256': sha(dest),
                        'beforePixels': int(support.sum()), 'afterPixels': int(result.sum()),
                        'removedPixels': int((support & ~result).sum()), 'addedPixels': 0,
                        'reason': item['reason'], 'fullSemanticAcceptanceVerified': False})
    # Aggregate is an exact union; do not leave a stale full-map shore mask.
    union = Image.new('L', tuple(s*2 for s in layout['masterSize']))
    for name in ['shore-band-ice', 'shore-band-spirit']:
        x,y,w,h = rects[name]
        alpha = Image.open(ROOT/'masks'/(name+'.webp')).getchannel('A')
        box = (x*2, y*2, (x+w)*2, (y+h)*2)
        union.paste(ImageChops.lighter(union.crop(box), alpha), box[:2])
    out = Image.new('RGBA', union.size, 'white'); out.putalpha(union)
    out.save(ROOT/'masks/shore-band.webp', lossless=True, method=6)
    (ROOT/'review/mask-correction-result.json').write_text(json.dumps({
        'method': 'Intersection/subtraction of geometric alpha constraints hand-traced on original assembled v7 ground. No artwork generation. Layout and sheets unchanged.',
        'reference': 'review/mask-corrections.json', 'changes': records,
        'shoreAggregateSha256': sha(ROOT/'masks/shore-band.webp'),
        'limitation': 'Repairs known defects only. Regression exclusions and bank polylines do not certify full-map semantic leakage <=3%.'
    }, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps(records, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
