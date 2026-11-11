"""Sample actual masked sprite footprints against ground-only falling-lava labels."""
import hashlib
import json
from pathlib import Path
from types import SimpleNamespace

import numpy as np
from PIL import Image, ImageChops, ImageDraw

from build_assets import crop
from render_offline import Renderer, View

ROOT = Path(__file__).resolve().parents[1]


def main():
    renderer = Renderer()
    current = json.loads((ROOT / 'fx-layout.json').read_text())
    before = json.loads((ROOT / 'review/before-registration/layout.json').read_text())
    refs = json.loads((ROOT / 'review/particle-ground-reference.json').read_text())
    measurements = []
    for ref in refs['regions']:
        name = ref['mask']
        old_piece = next(p for p in before['pieces'] if p['mask'] == name and p['group'] == 'lava-steam')
        piece = next(p for p in current['pieces'] if p['id'] == old_piece['id'])
        rect = piece['maskRectPx']
        base = crop(renderer.ground, rect)
        reference = Image.new('L', base.size)
        ImageDraw.Draw(reference).polygon([tuple(pt) for pt in ref['polygon']], fill=255)
        falling = np.array(reference) > 0
        support = Image.open(ROOT / 'masks' / (name + '.webp')).getchannel('A')
        view = SimpleNamespace(renderer=renderer, rect=rect, scale=[2, 2])
        layer = {'piece': old_piece, 'box': [0, 0, *base.size]}
        union = np.zeros((base.height, base.width), dtype=bool)
        counts = []
        visible_counts = []
        for i in range(288):
            image = View.spots(view, layer, i / 24)
            alpha = ImageChops.multiply(image.getchannel('A'), support)
            visible = np.array(alpha.point(lambda a: round(a * piece.get('opacity', 1)))) > 0
            union |= visible
            counts.append(int((visible & falling).sum()))
            visible_counts.append(int(visible.sum()))
        tinted = base.convert('RGBA')
        for region, color in [(falling, (240, 220, 20)), (union, (255, 30, 150))]:
            tint = Image.new('RGBA', base.size, (*color, 0))
            tint.putalpha(Image.fromarray(region.astype('uint8') * 115))
            tinted = Image.alpha_composite(tinted, tint)
        panel = Image.new('RGB', (base.width * 2, base.height + 32), '#17171e')
        panel.paste(base, (0, 32)); panel.paste(tinted.convert('RGB'), (base.width, 32))
        ImageDraw.Draw(panel).text((4, 6), name + ' | ground | fall witness (yellow), inherited particle footprint (pink)', fill='white')
        dest = ROOT / 'review/boundary' / (name + '-particle-proof.webp')
        panel.save(dest, quality=68, method=6)
        measurements.append({'id': piece['id'], 'mask': name, 'reference': ref,
                             'baselineMaximumFallingLavaPixelsInOneSample': max(counts),
                             'baselineSamplesOnFallingLava': sum(c > 0 for c in counts),
                             'baselineUniqueFallingLavaPixels': int((union & falling).sum()),
                             'baselineUniqueVisiblePixels': int(union.sum()),
                             'baselineSamplesWithAnyVisibleParticle': sum(c > 0 for c in visible_counts),
                             'currentOff': bool(piece.get('off')),
                             'currentFallingLavaPixels': 0 if piece.get('off') else max(counts),
                             'evidence': str(dest.relative_to(ROOT))})
    particle_pieces = [p for p in current['pieces'] if p['group'] in ['lava-bubble', 'lava-steam', 'embers']]
    reviewed = {r['id'] for r in measurements}
    report = {'method': 'Native 2x masked and opacity-quantized sprite alpha sampled at 24 fps for 12 seconds. Includes drift, rotation, sheet frame timing and external clipping. Labels traced on ground, not inferred from mask names.',
              'layoutSha256': hashlib.sha256((ROOT / 'fx-layout.json').read_bytes()).hexdigest(),
              'measurements': measurements,
              'remainingParticlePieces': [p['id'] for p in particle_pieces if p['id'] not in reviewed],
              'allParticleFootprintsVerifiedOnFlatLava': False,
              'limitation': 'Two ground witnesses and finite offline samples; other particle pieces and continuous runtime behaviour remain unverified.'}
    (ROOT / 'review/particle-footprint-result.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(measurements, indent=2))


if __name__ == '__main__':
    main()
