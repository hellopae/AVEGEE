"""Subtract two inspected hard surfaces, reproducibly from retained input masks."""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw

from build_assets import crop, terrain

ROOT = Path(__file__).resolve().parents[1]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    spec_path = ROOT / 'review/solid-repairs-current.json'
    spec = json.loads(spec_path.read_text())
    witnesses = json.loads((ROOT / 'review/solid-witnesses-current.json').read_text())
    layout = json.loads((ROOT / 'fx-layout.json').read_text())
    ground = terrain()
    before_dir = ROOT / 'review/before-solid-repair'
    before_dir.mkdir(exist_ok=True)
    changes = []
    for name, item in spec['masks'].items():
        path = ROOT / 'masks' / (name + '.webp')
        before = before_dir / path.name
        if not before.exists():
            before.write_bytes(path.read_bytes())
        image = Image.open(before).convert('RGBA')
        original = np.array(image.getchannel('A'))
        exclusion = Image.new('L', image.size)
        for polygon in item['excludeNative2x']:
            ImageDraw.Draw(exclusion).polygon([tuple(p) for p in polygon], fill=255)
        alpha = original.copy()
        alpha[np.array(exclusion) > 0] = 0
        image.putalpha(Image.fromarray(alpha))
        pending = path.with_suffix('.pending.webp')
        image.save(pending, lossless=True, method=6)
        pending.replace(path)
        witness = Image.new('L', image.size)
        for polygon in witnesses['masks'][name]:
            ImageDraw.Draw(witness).polygon([tuple(p) for p in polygon], fill=255)
        solid = np.array(witness) > 0
        removed = (original > 0) & (alpha == 0)
        assert np.array_equal(alpha[~removed], original[~removed])
        assert not ((alpha > 0) & solid).any()
        box = Image.fromarray(removed.astype('uint8') * 255).getbbox()
        rect = next(p['maskRectPx'] for p in layout['pieces'] if p['mask'] == name)
        base = crop(ground, rect)
        panels = [base]
        for support, color in [(original > 0, (255, 40, 160)), (alpha > 0, (30, 235, 90))]:
            tint = Image.new('RGBA', base.size, (*color, 0))
            tint.putalpha(Image.fromarray(support.astype('uint8') * 135))
            panels.append(Image.alpha_composite(base.convert('RGBA'), tint).convert('RGB'))
        margin = 30
        view_box = (max(0, box[0] - margin), max(0, box[1] - margin),
                    min(base.width, box[2] + margin), min(base.height, box[3] + margin))
        width, height = view_box[2] - view_box[0], view_box[3] - view_box[1]
        proof = Image.new('RGB', (width * 6, height * 2 + 30), '#17171e')
        for index, panel in enumerate(panels):
            proof.paste(panel.crop(view_box).resize((width * 2, height * 2)), (index * width * 2, 30))
        ImageDraw.Draw(proof).text((4, 6), name + ' | v7 ground | before pink | after green', fill='white')
        dest = ROOT / 'review/boundary' / (name + '-solid-repair.webp')
        proof.save(dest, quality=75, method=6)
        changes.append({
            'mask': name, 'beforePath': str(before.relative_to(ROOT)),
            'beforeSha256': sha(before), 'afterSha256': sha(path),
            'beforePixels': int((original > 0).sum()), 'afterPixels': int((alpha > 0).sum()),
            'removedPixels': int(removed.sum()), 'addedPixels': int(((alpha > 0) & (original == 0)).sum()),
            'witnessSolidOverlapBefore': int(((original > 0) & solid).sum()),
            'witnessSolidOverlapAfter': int(((alpha > 0) & solid).sum()),
            'removedBoundingBoxNative2x': list(box),
            'changedRectMap1x': [rect[0] + box[0] / 2, rect[1] + box[1] / 2,
                                 (box[2] - box[0]) / 2, (box[3] - box[1]) / 2],
            'unchangedAlphaOutsideRemovedRegion': True,
            'reason': item['reason'], 'evidence': str(dest.relative_to(ROOT)),
        })
    # The full-map mask is also a deliverable. Rebuild it from components so
    # consumers cannot recover the removed hard-surface pixels through it.
    aggregate_path = ROOT / 'masks/lava-flat.webp'
    before_aggregate = before_dir / aggregate_path.name
    if not before_aggregate.exists():
        before_aggregate.write_bytes(aggregate_path.read_bytes())
    union = Image.new('L', tuple(value * 2 for value in layout['masterSize']))
    for piece in layout['pieces']:
        if piece['group'] != 'lava':
            continue
        x, y, w, h = piece['maskRectPx']
        box = (x * 2, y * 2, (x + w) * 2, (y + h) * 2)
        alpha = Image.open(ROOT / 'masks' / (piece['mask'] + '.webp')).getchannel('A')
        union.paste(ImageChops.lighter(union.crop(box), alpha), box[:2])
    aggregate = Image.new('RGBA', union.size, 'white')
    aggregate.putalpha(union)
    aggregate.save(aggregate_path, lossless=True, method=6)
    old = np.array(Image.open(before_aggregate).getchannel('A')) > 0
    new = np.array(union) > 0
    assert not (new & ~old).any()
    result = {'specification': str(spec_path.relative_to(ROOT)), 'specificationSha256': sha(spec_path),
              'changes': changes, 'newGenerations': 0,
              'lavaAggregate': {'beforeSha256': sha(before_aggregate),
                                'afterSha256': sha(aggregate_path),
                                'removedPixels': int((old & ~new).sum()),
                                'equalsComponentUnion': True},
              'limitation': 'Ground-derived repair witnesses are regression checks after repair. Full semantic acceptance still requires separate liquid references and full coverage/playback review.'}
    (ROOT / 'review/solid-repair-result.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
