"""Partial bank-distance bounds from independently labelled actual ground surfaces."""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw
from scipy.ndimage import distance_transform_edt

from build_assets import crop, terrain
from reference_regions import reference_support

ROOT = Path(__file__).resolve().parents[1]


def polygon(size, polygons):
    image = Image.new('L', size)
    for poly in polygons:
        ImageDraw.Draw(image).polygon([tuple(p) for p in poly], fill=255)
    return np.array(image) > 0


def main():
    layout = json.loads((ROOT / 'fx-layout.json').read_text())
    refs = json.loads((ROOT / 'review/shore-ground-reference.json').read_text())
    shared_path = ROOT / 'review/liquid-reference.json'
    shared = json.loads(shared_path.read_text()) if any('liquidReferenceMask' in patch for patch in refs['patches']) else None
    rects = {p['mask']: p['maskRectPx'] for p in layout['pieces']}
    world_per_pixel = [layout['worldSize'][i] / (layout['masterSize'][i] * 2) for i in range(2)]
    ground = terrain()
    patches, disks = [], []
    totals, confirmed = {}, {}
    for name in ['shore-band-ice', 'shore-band-spirit']:
        alpha = np.array(Image.open(ROOT / 'masks' / (name + '.webp')).getchannel('A'))
        totals[name] = int((alpha > 0).sum())
        confirmed[name] = Image.new('L', (alpha.shape[1], alpha.shape[0]))
    for index, ref in enumerate(refs['patches']):
        rect = ref['groundRectMap1x']; x, y, w, h = rect
        mx, my, _, _ = rects[ref['mask']]
        alpha = Image.open(ROOT / 'masks' / (ref['mask'] + '.webp')).getchannel('A')
        mask = np.array(alpha.crop(((x-mx)*2, (y-my)*2, (x+w-mx)*2, (y+h-my)*2))) > 0
        solid = polygon((w*2, h*2), ref['solidPolygons'])
        if 'liquidReferenceMask' in ref:
            water = np.array(reference_support(shared, ref['liquidReferenceMask'], rect)) > 0
        else:
            water = polygon((w*2, h*2), ref['liquidPolygons'])
        assert not (solid & water).any()
        # Nearest labelled solid, with anisotropic world scale. Labels are
        # actual solid interiors, so this never understates true bank distance.
        distance = distance_transform_edt(~solid, sampling=(world_per_pixel[1], world_per_pixel[0]))
        certified = mask & water & (distance <= 12)
        # Patches can overlap. Count each native shore pixel once.
        lx, ly = (x - mx) * 2, (y - my) * 2
        patch = Image.new('L', confirmed[ref['mask']].size)
        patch.paste(Image.fromarray(certified.astype('uint8') * 255), (lx, ly))
        confirmed[ref['mask']] = ImageChops.lighter(confirmed[ref['mask']], patch)
        base = crop(ground, rect)
        panels = [base]
        for selected, color in [(solid, (240,220,20)), (certified, (20,240,80))]:
            tint = Image.new('RGBA', base.size, (*color, 0))
            tint.putalpha(Image.fromarray(selected.astype('uint8') * 120))
            panels.append(Image.alpha_composite(base.convert('RGBA'), tint).convert('RGB'))
        out = Image.new('RGB', (base.width*3, base.height+30), '#17171e')
        for i, im in enumerate(panels): out.paste(im, (base.width*i, 30))
        ImageDraw.Draw(out).text((4,5), ref['mask'] + ' | ground | definite bank solid | certified water-side band <=12 world', fill='white')
        suffix = ref.get('id', ref['mask'])
        dest = ROOT / 'review/boundary' / (suffix + '-actual-bank-proof.webp')
        out.thumbnail((1500, 900), Image.Resampling.LANCZOS)
        out.save(dest, quality=55, method=6)
        patches.append({'mask': ref['mask'], 'patchIndex': index, 'rectMap1x': rect,
                        'maskPixelsInPatch': int(mask.sum()), 'confirmedWaterPixels': int((mask & water).sum()),
                        'confirmedWaterWithin12World': int(certified.sum()),
                        'maximumCertifiedBankDistanceUpperBoundWorld': float(distance[certified].max()) if certified.any() else None,
                        'evidence': str(dest.relative_to(ROOT))})
    for ref in refs['waterOnlyDisks']:
        cx, cy = ref['centerMap1x']; mx, my, _, _ = rects[ref['mask']]
        r = ref['radiusNative2x']; lx, ly = (cx-mx)*2, (cy-my)*2
        alpha = Image.open(ROOT / 'masks' / (ref['mask'] + '.webp')).getchannel('A')
        selected = np.array(alpha.crop((lx-r, ly-r, lx+r+1, ly+r+1))) > 0
        yy, xx = np.ogrid[-r:r+1, -r:r+1]; radial = np.hypot(xx, yy)
        lower = (r-ref['guardNative2x']-radial)*min(world_per_pixel)
        disks.append(dict(ref, selectedWaterDiskPixels=int((selected & (radial <= r)).sum()),
                          selectedPixelsProvenBeyond12World=int((selected & (lower > 12)).sum())))
    report = {'reference': 'review/shore-ground-reference.json',
              'referenceSha256': hashlib.sha256((ROOT / 'review/shore-ground-reference.json').read_bytes()).hexdigest(),
              'liquidReferenceSha256': hashlib.sha256(shared_path.read_bytes()).hexdigest() if shared else None,
              'worldPerNativePixelXY': world_per_pixel, 'patchMeasurements': patches, 'diskMeasurements': disks,
              'maskTotals': [{'mask': n, 'selectedPixels': totals[n],
                              'certifiedUniquePixels': int((np.array(confirmed[n]) > 0).sum()),
                              'remainingPixelsUnverified': totals[n]-int((np.array(confirmed[n]) > 0).sum())} for n in totals],
              'allShorePixelsVerified': False,
              'limitation': 'Partial physical-bank survey only. No distance to production trace or production mask boundary is used as acceptance evidence.'}
    (ROOT / 'review/shore-ground-result.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
