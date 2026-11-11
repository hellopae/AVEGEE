"""Measure frozen ground-only labels without altering masks or filling unknowns."""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]


def main():
    reference_path = ROOT / 'review/liquid-reference.json'
    reference = json.loads(reference_path.read_text())
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
            labelled = Image.new('L', (alpha.shape[1], alpha.shape[0]))
            for poly in item['definiteLiquidPolygons']:
                ImageDraw.Draw(labelled).polygon([tuple(p) for p in poly], fill=255)
            liquid = np.array(labelled) > 0
            known = int((alpha & liquid).sum())
            unknown = total - known
            upper = 100 * unknown / total if total else None
            result.update(definiteLiquidPixels=known, unknownPixels=unknown,
                          outsidePercentUpperBound=upper,
                          status='upper-bound-within-3-percent' if upper is not None and upper <= 3 else 'reference-incomplete')
            ground = Image.open(ROOT / item['ground']).convert('RGB')
            panels = []
            for region, color in [(liquid, (40, 230, 80)), (alpha & ~liquid, (255, 40, 180))]:
                tint = Image.new('RGBA', ground.size, (*color, 0))
                tint.putalpha(Image.fromarray(region.astype('uint8') * 115))
                panels.append(Image.alpha_composite(ground.convert('RGBA'), tint).convert('RGB'))
            proof = Image.new('RGB', (ground.width * 3, ground.height + 32), '#17171e')
            for i, im in enumerate([ground, *panels]):
                proof.paste(im, (i * ground.width, 32))
            ImageDraw.Draw(proof).text((4, 6), f'{name} | ground | frozen liquid reference (green) | mask unknown (pink)', fill='white')
            dest = ROOT / 'review/boundary' / (name + '-liquid-reference.webp')
            proof.save(dest, quality=65, method=6)
            result['evidence'] = str(dest.relative_to(ROOT))
            result['referenceGroundSha256'] = hashlib.sha256((ROOT / item['ground']).read_bytes()).hexdigest()
            if name == 'icefall-summit':
                before = np.array(Image.open(ROOT / 'review/before-registration/mask.webp').getchannel('A')) > 0
                added = alpha & ~before
                unknown_added = int((added & ~liquid).sum())
                result['registrationAddedRegion'] = {'pixels': int(added.sum()), 'unknownPixels': unknown_added,
                    'outsidePercentUpperBound': 100 * unknown_added / int(added.sum()) if added.any() else None}
        results.append(result)
    report = {'method': 'Mask support intersected with separately frozen ground-only definite-liquid interiors. All unlabelled selected pixels count as potentially outside, giving a conservative upper bound. No palette-only classification; no construction annotation imported.',
              'reference': str(reference_path.relative_to(ROOT)),
              'referenceSha256': hashlib.sha256(reference_path.read_bytes()).hexdigest(),
              'sameAiReviewer': True, 'notHumanQA': True,
              'allMasksWithin3Percent': all(r['status'] == 'upper-bound-within-3-percent' for r in results),
              'measurements': results}
    (ROOT / 'review/liquid-reference-result.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({r['mask']: {'status': r['status'], 'upperBound': r['outsidePercentUpperBound']} for r in results if r['status'] != 'reference-missing'}, indent=2))


if __name__ == '__main__':
    main()
