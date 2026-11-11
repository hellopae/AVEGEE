"""Measure every lava particle's sampled footprint against ground-only labels."""
import hashlib
import json
from pathlib import Path
from types import SimpleNamespace

import numpy as np
from PIL import Image, ImageChops, ImageDraw

from build_assets import crop
from render_offline import Renderer, View
from reference_regions import reference_support

ROOT = Path(__file__).resolve().parents[1]
SAMPLES = 288


def labels(size, polygons):
    image = Image.new('L', size)
    for polygon in polygons:
        ImageDraw.Draw(image).polygon([tuple(point) for point in polygon], fill=255)
    return np.array(image) > 0


def main():
    renderer = Renderer()
    layout_path = ROOT / 'fx-layout.json'
    layout = json.loads(layout_path.read_text())
    reference_path = ROOT / 'review/particle-flat-reference.json'
    reference = json.loads(reference_path.read_text())
    shared_path = ROOT / 'review/liquid-reference.json'
    shared = json.loads(shared_path.read_text()) if any('liquidReferenceMask' in item for item in reference['masks'].values()) else None
    output = ROOT / 'review/particle-coverage'
    output.mkdir(exist_ok=True)
    measurements = []
    for piece in layout['pieces']:
        if piece['group'] not in ['lava-bubble', 'lava-steam', 'embers']:
            continue
        name = piece['mask']
        base = crop(renderer.ground, piece['maskRectPx'])
        item = reference['masks'].get(name, {})
        flat = labels(base.size, item.get('definiteFlatLavaPolygons', []))
        falling = labels(base.size, item.get('definiteFallingLavaPolygons', []))
        unknown_labels = labels(base.size, item.get('unlabelledPolygons', []))
        flat &= ~unknown_labels
        falling &= ~unknown_labels
        if 'liquidReferenceMask' in item:
            # Only records explicitly classified as flat lava are shared here.
            # Ambiguous sloping channels have no liquidReferenceMask link.
            flat |= np.array(reference_support(shared, item['liquidReferenceMask'], piece['maskRectPx'])) > 0
        assert not (flat & falling).any(), name
        view = SimpleNamespace(renderer=renderer, rect=piece['maskRectPx'], scale=[2, 2])
        layer = {'piece': piece, 'box': [0, 0, *base.size]}
        union = np.zeros((base.height, base.width), dtype=bool)
        counts = []
        fall_counts = []
        for index in range(SAMPLES):
            image = View.spots(view, layer, index / 24)
            alpha = ImageChops.multiply(image.getchannel('A'), renderer.masks[name])
            visible = np.array(alpha.point(lambda value: round(value * piece.get('opacity', 1)))) > 0
            if piece.get('off'):
                visible[:] = False
            union |= visible
            counts.append(int(visible.sum()))
            fall_counts.append(int((visible & falling).sum()))
        known_flat = union & flat
        known_falling = union & falling
        unknown = union & ~flat & ~falling
        support = Image.fromarray(union.astype('uint8') * 255)
        bounds = support.getbbox()
        proof = None
        if bounds:
            x0, y0, x1, y1 = bounds
            bounds = [max(0, x0 - 24), max(0, y0 - 24), min(base.width, x1 + 24), min(base.height, y1 + 24)]
            ground = base.crop(bounds)
            grid = ground.copy()
            draw = ImageDraw.Draw(grid)
            for x in range((bounds[0] // 25 + 1) * 25, bounds[2], 25):
                local_x = x - bounds[0]
                draw.line((local_x, 0, local_x, grid.height), fill='#aa9922')
                draw.text((local_x + 2, 2), str(x), fill='white', stroke_width=1, stroke_fill='black')
            for y in range((bounds[1] // 25 + 1) * 25, bounds[3], 25):
                local_y = y - bounds[1]
                draw.line((0, local_y, grid.width, local_y), fill='#aa9922')
                draw.text((2, local_y + 2), str(y), fill='white', stroke_width=1, stroke_fill='black')
            grid.thumbnail((900, 900), Image.Resampling.LANCZOS)
            grid.save(output / (piece['id'] + '-ground.jpg'), quality=60, optimize=True)
            overlay = base.convert('RGBA')
            for selected, color in [(known_flat, (30, 240, 60)), (known_falling, (240, 220, 20)), (unknown, (255, 30, 150))]:
                tint = Image.new('RGBA', base.size, (*color, 0))
                tint.putalpha(Image.fromarray(selected.astype('uint8') * 160))
                overlay = Image.alpha_composite(overlay, tint)
            overlay = overlay.crop(bounds).convert('RGB')
            panel = Image.new('RGB', (ground.width * 2, ground.height + 30), '#17171e')
            panel.paste(ground, (0, 30))
            panel.paste(overlay, (ground.width, 30))
            panel.thumbnail((1200, 900), Image.Resampling.LANCZOS)
            ImageDraw.Draw(panel).text((4, 5), 'ground | sampled footprint: flat green, falling yellow, unknown pink', fill='white')
            dest = output / (piece['id'] + '-proof.webp')
            panel.save(dest, quality=55, method=6)
            proof = str(dest.relative_to(ROOT))
            support.crop(bounds).save(output / (piece['id'] + '-support.png'))
        total = int(union.sum())
        measurements.append({
            'id': piece['id'], 'mask': name, 'maskRectPx': piece['maskRectPx'],
            'maskSha256': hashlib.sha256((ROOT / 'masks' / (name + '.webp')).read_bytes()).hexdigest(),
            'sheetSha256': hashlib.sha256((ROOT / 'sheets' / piece['sheet']).read_bytes()).hexdigest(),
            'groundDecodedRgbSha256': hashlib.sha256(base.tobytes()).hexdigest(),
            'samples': SAMPLES, 'samplesWithVisiblePixels': sum(count > 0 for count in counts),
            'maximumVisiblePixelsPerSample': max(counts), 'uniqueVisiblePixels': total,
            'uniqueConfirmedFlatPixels': int(known_flat.sum()),
            'uniqueConfirmedFallingPixels': int(known_falling.sum()),
            'samplesWithConfirmedFallingPixels': sum(count > 0 for count in fall_counts),
            'unknownPixels': int(unknown.sum()), 'footprintCropNative2x': bounds,
            'evidence': proof,
            'status': 'no-visible-pixels' if not total else 'falling-lava-overlap' if known_falling.any()
                else 'sampled-footprint-confirmed-flat' if not unknown.any() else 'ground-reference-incomplete'
        })
    result = {
        'method': 'Every current lava bubble/steam/ember piece, native 2x, 288 masked alpha/opacity-quantized samples at 24 fps for 12 seconds. Includes sheet timing, spot phases, drift and rotation.',
        'layoutSha256': hashlib.sha256(layout_path.read_bytes()).hexdigest(),
        'reference': str(reference_path.relative_to(ROOT)),
        'referenceSha256': hashlib.sha256(reference_path.read_bytes()).hexdigest(),
        'liquidReferenceSha256': hashlib.sha256(shared_path.read_bytes()).hexdigest() if shared else None,
        'measurements': measurements,
        'all12PiecesSampled': len(measurements) == 12,
        'allSampledVisibleFootprintsConfirmedFlat': all(row['status'] == 'sampled-footprint-confirmed-flat' for row in measurements),
        'limitation': 'Finite offline samples. Same-AI ground tracing. Zero visible pixels gives no positive placement evidence. Continuous game playback is unverified.'
    }
    (ROOT / 'review/particle-coverage-result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps([{key: row[key] for key in ['id', 'uniqueVisiblePixels', 'uniqueConfirmedFlatPixels', 'uniqueConfirmedFallingPixels', 'unknownPixels', 'footprintCropNative2x', 'status']} for row in measurements], indent=2))


if __name__ == '__main__':
    main()
