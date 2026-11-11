"""Measure frozen ground-only labels without altering masks or filling unknowns."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

from build_assets import crop, terrain
from reference_regions import reference_support

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reference', default='review/liquid-reference.json')
    parser.add_argument('--output', default='review/liquid-reference-result.json')
    parser.add_argument('--proof-mask', action='append', help='Limit diagnostic updates to these masks.')
    args = parser.parse_args()
    reference_path = ROOT / args.reference
    reference = json.loads(reference_path.read_text())
    layout = json.loads((ROOT / 'fx-layout.json').read_text())
    rects = {piece['mask']: piece['maskRectPx'] for piece in layout['pieces']}
    for name in ['ice-stream-flat', 'lava-flat', 'spirit-river', 'shore-band']:
        rects[name] = [0, 0, *layout['masterSize']]
    for name, item in reference['masks'].items():
        item.setdefault('groundRectMap1x', rects[name])
    ground_map = terrain()
    results = []
    for path in sorted((ROOT / 'masks').glob('*.webp')):
        name = path.stem
        alpha = np.array(Image.open(path).getchannel('A')) > 0
        total = int(alpha.sum())
        item = reference['masks'].get(name)
        result = {'mask': name, 'maskSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                  'selectedPixels': total, 'definiteLiquidPixels': 0, 'unknownPixels': total,
                  'outsideDrawnLiquidPercent': None, 'outsidePercentUpperBound': None,
                  'status': 'reference-missing'}
        if item:
            labelled = reference_support(reference, name, item['groundRectMap1x'])
            assert labelled.size == (alpha.shape[1], alpha.shape[0]), name
            liquid = np.array(labelled) > 0
            known = int((alpha & liquid).sum())
            unknown = total - known
            upper = 100 * unknown / total if total else None
            result.update(definiteLiquidPixels=known, unknownPixels=unknown,
                          outsidePercentUpperBound=upper,
                          status='upper-bound-within-3-percent' if upper is not None and upper <= 3 else 'reference-incomplete')
            components, count = ndimage.label(alpha & ~liquid)
            sizes = np.bincount(components.ravel())
            boxes = ndimage.find_objects(components)
            largest = sorted(range(1, count + 1), key=lambda index: int(sizes[index]), reverse=True)[:8]
            result['largestUnknownComponents'] = [
                {'pixels': int(sizes[index]),
                 'boxNative2x': [boxes[index - 1][1].start, boxes[index - 1][0].start,
                                 boxes[index - 1][1].stop, boxes[index - 1][0].stop]}
                for index in largest
            ]
            result['unknownComponentCount'] = count
            if 'groundRectMap1x' in item:
                ground = crop(ground_map, item['groundRectMap1x'])
            else:
                ground = Image.open(ROOT / item['ground']).convert('RGB')
            assert ground.size == labelled.size, name
            dest = ROOT / 'review/boundary' / (name + '-liquid-reference.webp')
            result['evidence'] = str(dest.relative_to(ROOT)) if dest.is_file() else None
            result['referenceGroundDecodedRgbSha256'] = hashlib.sha256(ground.tobytes()).hexdigest()
            result['labelSupportSha256'] = hashlib.sha256(labelled.tobytes()).hexdigest()
            if name == 'icefall-summit':
                before = np.array(Image.open(ROOT / 'review/before-registration/mask.webp').getchannel('A')) > 0
                added = alpha & ~before
                unknown_added = int((added & ~liquid).sum())
                result['registrationAddedRegion'] = {'pixels': int(added.sum()), 'unknownPixels': unknown_added,
                    'outsidePercentUpperBound': 100 * unknown_added / int(added.sum()) if added.any() else None}
            if args.proof_mask is not None and name not in args.proof_mask:
                results.append(result)
                continue
            # Keep native pixels for measurement. Build diagnostic panels at
            # preview size so full-map unions do not allocate a 29500px image.
            preview = ground.copy()
            preview.thumbnail((600, 650), Image.Resampling.LANCZOS)
            panels = []
            for region, color in [(liquid, (40, 230, 80)), (alpha & ~liquid, (255, 40, 180))]:
                tint = Image.new('RGBA', preview.size, (*color, 0))
                tint.putalpha(Image.fromarray(region.astype('uint8') * 115).resize(preview.size, Image.Resampling.BOX))
                panels.append(Image.alpha_composite(preview.convert('RGBA'), tint).convert('RGB'))
            proof = Image.new('RGB', (preview.width * 3, preview.height + 32), '#17171e')
            for i, im in enumerate([preview, *panels]):
                proof.paste(im, (i * preview.width, 32))
            # Large flat-water crops remain reproducible at native resolution
            # from the terrain and polygons. Bound only the diagnostic preview.
            flat_preview = name.startswith(('lava-flat-', 'ice-stream-flat-'))
            proof.thumbnail((1350, 1350) if flat_preview else (1800, 1800), Image.Resampling.LANCZOS)
            ImageDraw.Draw(proof).text((4, 6), f'{name} | ground | frozen liquid reference (green) | mask unknown (pink)', fill='white')
            proof.save(dest, quality=48 if flat_preview else 65, method=6)
            result['evidence'] = str(dest.relative_to(ROOT))
        results.append(result)
    report = {'method': 'Mask support intersected with separately frozen ground-only definite-liquid interiors. All unlabelled selected pixels count as potentially outside, giving a conservative upper bound. No palette-only classification; no construction annotation imported.',
              'reference': str(reference_path.relative_to(ROOT)),
              'referenceSha256': hashlib.sha256(reference_path.read_bytes()).hexdigest(),
              'sameAiReviewer': True, 'notHumanQA': True,
              'allMasksWithin3Percent': all(r['status'] == 'upper-bound-within-3-percent' for r in results),
              'measurements': results}
    (ROOT / args.output).write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({r['mask']: {'status': r['status'], 'upperBound': r['outsidePercentUpperBound']} for r in results if r['status'] != 'reference-missing'}, indent=2))


if __name__ == '__main__':
    main()
