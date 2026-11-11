"""Restore existing painted summit phases at the omitted lower cascade.

Only spatial registration/alpha, no new temporal phases or generated artwork.
Reproducible from retained pre-registration mask and sheet, not current outputs.
"""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parents[1]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    spec = json.loads((ROOT / 'review/summit-registration.json').read_text())
    before = ROOT / 'review/before-registration'
    before.mkdir(exist_ok=True)
    mask_path = ROOT / 'masks/icefall-summit.webp'
    sheet_path = ROOT / 'sheets/icefall-summit.webp'
    for name, path in [('mask.webp', mask_path), ('sheet.webp', sheet_path)]:
        target = before / name
        if not target.exists():
            target.write_bytes(path.read_bytes())
    assert sha(before / 'mask.webp') == spec['beforeMaskSha256']
    assert sha(before / 'sheet.webp') == spec['beforeSheetSha256']
    mask = Image.open(before / 'mask.webp').convert('RGBA')
    extension = Image.new('L', mask.size)
    ImageDraw.Draw(extension).polygon([tuple(p) for p in spec['polygonNative2x']], fill=255)
    old_alpha = np.array(mask.getchannel('A'))
    new_alpha = np.maximum(old_alpha, np.array(extension))
    mask.putalpha(Image.fromarray(new_alpha))
    mask_temp = mask_path.with_name('icefall-summit.pending.webp')
    mask.save(mask_temp, lossless=True, method=6)
    mask_temp.replace(mask_path)
    # Preserve all existing decoded visible frame pixels exactly. Recover only
    # the newly exposed region from the original native ImageGen source cells.
    sheet = Image.open(before / 'sheet.webp').convert('RGBA')
    alpha = extension.resize((800, 800), Image.Resampling.NEAREST)
    sources = []
    for i in range(8):
        path = ROOT / 'sources' / ('icefall-summit-' + ['12', '34', '56', '78'][i // 2] + '.webp')
        original = Image.open(path).convert('RGBA')
        cell = i % 2
        frame = original.crop((cell * original.width // 2, 0,
                               (cell + 1) * original.width // 2, original.height))
        frame = frame.resize((800, 800), Image.Resampling.LANCZOS)
        frame.putalpha(255)
        sheet.paste(frame, (i * 800, 0), alpha)
        sources.append({'path': str(path.relative_to(ROOT)), 'sha256': sha(path), 'cell': cell})
    sheet_temp = sheet_path.with_name('icefall-summit.pending.webp')
    sheet.save(sheet_temp, lossless=True, method=6)
    sheet_temp.replace(sheet_path)
    old = np.array(Image.open(before / 'sheet.webp').convert('RGBA'))
    now = np.array(Image.open(sheet_path).convert('RGBA'))
    added = np.tile(np.array(alpha) > 0, (1, 8))
    visible_unchanged = (old[:, :, 3] > 0) & ~added
    assert np.array_equal(old[visible_unchanged], now[visible_unchanged])
    assert np.array_equal(old[:, :, 3][~added], now[:, :, 3][~added])
    report = {
        'method': 'Same full-crop spatial registration as inherited sheet; restore original eight painted source cells only inside omitted lower-cascade geometry. No per-frame shift/fade or temporal synthesis.',
        'specification': 'review/summit-registration.json',
        'beforeMaskSha256': spec['beforeMaskSha256'], 'beforeSheetSha256': spec['beforeSheetSha256'],
        'afterMaskSha256': sha(mask_path), 'afterSheetSha256': sha(sheet_path),
        'maskPixelsBefore': int((old_alpha > 0).sum()), 'maskPixelsAfter': int((new_alpha > 0).sum()),
        'addedMaskPixels': int(((new_alpha > 0) & (old_alpha == 0)).sum()),
        'unchangedVisibleSheetPixelsOutsideExtension': bool(np.array_equal(old[visible_unchanged], now[visible_unchanged])),
        'unchangedSheetAlphaOutsideExtension': bool(np.array_equal(old[:, :, 3][~added], now[:, :, 3][~added])),
        'encodingNote': 'Lossless WebP preserves visible RGBA exactly; RGB under fully transparent pixels may be discarded.',
        'sourceCells': sources, 'generationsThisRun': 0,
        'visualSmoothnessVerified': False,
    }
    ground = Image.open(ROOT / 'input/icefall-summit.png').convert('RGB')
    witness_spec = json.loads((ROOT / 'review/coverage-witness-result.json').read_text())
    witness = Image.new('L', ground.size)
    ImageDraw.Draw(witness).polygon([tuple(p) for p in witness_spec['polygon']], fill=255)
    selected = np.array(witness) > 0
    effective_counts, rgb_phases, composites = [], [], []
    for i in range(8):
        frame = sheet.crop((i*800, 0, (i+1)*800, 800)).resize(ground.size, Image.Resampling.BICUBIC)
        effective = ImageChops.multiply(frame.getchannel('A'), mask.getchannel('A'))
        effective = effective.point(lambda a: round(a * .48))
        visible = np.array(effective) > 0
        effective_counts.append(int((selected & visible).sum()))
        rgb_phases.append(np.array(frame.convert('RGB'))[selected].astype('float32'))
        composites.append(Image.composite(frame.convert('RGB'), ground, effective))
    report['lowerWitnessEffectiveCoveragePixelsByPhase'] = effective_counts
    report['lowerWitnessPixels'] = int(selected.sum())
    report['lowerWitnessDistinctPaintedRgbPhases'] = len({hashlib.sha256(a.tobytes()).hexdigest() for a in rgb_phases})
    report['lowerWitnessAdjacentRgbMAEIncludingWrap'] = [float(np.abs(rgb_phases[(i+1)%8]-rgb_phases[i]).mean()) for i in range(8)]
    box = (300, 580, 500, 680)
    tint = Image.new('RGBA', ground.size, (255, 20, 150, 0))
    tint.putalpha(mask.getchannel('A').point(lambda a: round(a*.4)))
    overlay = Image.alpha_composite(ground.convert('RGBA'), tint).convert('RGB')
    panel = Image.new('RGB', (1200, 230), '#17171e')
    for i, image in enumerate([ground, overlay, composites[3]]):
        panel.paste(image.crop(box).resize((400,200)), (i*400,30))
    ImageDraw.Draw(panel).text((4,5), 'v7 ground | current mask | effective painted phase4', fill='white')
    panel.save(ROOT / 'review/boundary/summit-lower-registration-current.webp', quality=82)
    montage = Image.new('RGB', (1200, 360), '#17171e')
    for i, image in enumerate(composites):
        x, y = i%4*300, i//4*180
        montage.paste(image.crop(box).resize((300,150)), (x,y+25))
        ImageDraw.Draw(montage).text((x+4,y+4), 'painted phase '+str(i+1), fill='white')
    montage.save(ROOT / 'review/boundary/summit-lower-eight-phases.jpg', quality=78)
    (ROOT / 'review/summit-registration-result.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({k: v for k, v in report.items() if k != 'sourceCells'}, indent=2))


if __name__ == '__main__':
    main()
