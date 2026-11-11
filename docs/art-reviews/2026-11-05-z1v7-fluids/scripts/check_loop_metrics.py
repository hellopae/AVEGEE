"""Recheck held painted phases against recorded loop metrics, without rendering."""

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--update-mask', action='append', default=[],
                        help='Refresh loop metrics only for a mask with a recorded solid repair.')
    args = parser.parse_args()
    layout = json.loads((ROOT / 'fx-layout.json').read_text())
    loops = json.loads((ROOT / 'loop-review.json').read_text())
    recorded = {item['id']: item for item in loops['frames']}
    repairs = json.loads((ROOT / 'review/solid-repair-result.json').read_text())
    repaired_hashes = {change['mask']: change['afterSha256'] for change in repairs['changes']}
    if set(args.update_mask) - set(repaired_hashes):
        parser.error('Loop refresh requires a recorded solid repair')
    measurements = []
    for piece in layout['pieces']:
        if piece['group'] not in ['waterfall', 'lavafall']:
            continue
        name = piece['mask']
        sheet_path = ROOT / 'sheets' / piece['sheet']
        mask_path = ROOT / 'masks' / (name + '.webp')
        sheet = Image.open(sheet_path).convert('RGBA')
        width, height = piece['frameW'], piece['frameH']
        frames = [np.array(sheet.crop((i * width, 0, (i + 1) * width, height)))
                  for i in range(piece['frames'])]
        mask = Image.open(mask_path).getchannel('A').resize((width, height), Image.Resampling.NEAREST)
        visible = (np.array(mask) > 0) & np.logical_and.reduce([frame[:, :, 3] > 0 for frame in frames])
        rgb = [frame[:, :, :3][visible].astype('float32') for frame in frames]
        deltas = [float(np.abs(rgb[(i + 1) % len(rgb)] - rgb[i]).mean()) for i in range(len(rgb))]
        old = recorded[name]
        assert old['sheetSha256'] == sha(sheet_path)
        expected_hash = repaired_hashes[name] if name in args.update_mask else old['maskSha256']
        assert expected_hash == sha(mask_path)
        if name in args.update_mask:
            median = float(np.median(deltas))
            old.update(maskSha256=sha(mask_path), currentEffectiveMaskPixelsAtFrameSize=int(visible.sum()),
                       maskedAdjacentRgbMAEIncludingWrap=deltas,
                       wrapToMedianRatio=deltas[-1] / median,
                       largestToMedianRatio=max(deltas) / median)
        assert np.allclose(deltas, old['maskedAdjacentRgbMAEIncludingWrap'])
        assert len({hashlib.sha256(frame.tobytes()).hexdigest() for frame in rgb}) == 8
        largest = int(np.argmax(deltas))
        measurements.append({
            'mask': name, 'maskSha256': sha(mask_path), 'sheetSha256': sha(sheet_path),
            'distinctEffectivePhases': 8, 'rgbMAEIncludingWrap': deltas,
            'largestTransition': [largest + 1, (largest + 1) % 8 + 1],
            'wrapToMedianRatio': deltas[-1] / float(np.median(deltas)),
            'largestToMedianRatio': max(deltas) / float(np.median(deltas)),
            'matchesRecordedLoopMetrics': True,
            'refreshedForRecordedSolidRepair': name in args.update_mask,
            'smoothPlaybackVerified': False,
        })
    assert len(measurements) == 18
    if args.update_mask:
        loops['continuationMetricRefresh'] = {
            'masks': args.update_mask, 'reason': 'Recorded rock-silhouette alpha subtraction.',
            'evidence': 'review/current-loop-check.json', 'visualPlaybackReviewed': False,
        }
        (ROOT / 'loop-review.json').write_text(json.dumps(loops, indent=2) + '\n')
    report = {'method': 'Recomputed eight RGB changes within common sheet alpha and current external mask. '
                        'Held source artwork and rendered comparisons retained.',
              'refreshedMasks': args.update_mask,
              'assertions': 73, 'measurements': measurements,
              'visualPlaybackReviewed': False,
              'limitation': 'Numeric deltas identify transitions for playback review. They do not establish smoothness.'}
    (ROOT / 'review/current-loop-check.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'loopsChecked': 18, 'assertions': 73,
                      'upperTree': next(row for row in measurements if row['mask'] == 'icefall-upper-tree')}, indent=2))


if __name__ == '__main__':
    main()
