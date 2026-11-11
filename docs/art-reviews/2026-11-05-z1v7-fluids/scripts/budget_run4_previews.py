"""Reduce diagnostic previews only; preserve native terrain, art and masks."""
from io import BytesIO
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def size():
    return sum(path.stat().st_size for path in ROOT.rglob('*') if path.is_file())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--finish', action='store_true', help='Only compress refreshed particle/navigation previews.')
    args = parser.parse_args()
    if args.finish:
        report_path = ROOT / 'review/run4-preview-budget.json'
        report = json.loads(report_path.read_text())
        changes = []
        candidates = sorted((ROOT / 'review/particle-coverage').glob('*-proof.webp'))
        candidates.append(ROOT / 'review/run4-upper-tree-loop-phases.webp')
        for path in candidates:
            if size() < 79_250_000:
                break
            image = Image.open(path).convert('RGB')
            original_size = list(image.size)
            image.thumbnail((1000, 750), Image.Resampling.LANCZOS)
            buffer = BytesIO(); image.save(buffer, format='WEBP', quality=40, method=6)
            before, after = path.read_bytes(), buffer.getvalue()
            if len(after) < len(before) * .95:
                path.write_bytes(after)
                changes.append({'path': str(path.relative_to(ROOT)), 'stage': 'final-navigation',
                                'beforeBytes': len(before), 'afterBytes': len(after),
                                'beforeSize': original_size, 'afterSize': list(image.size),
                                'beforeSha256': hashlib.sha256(before).hexdigest(),
                                'afterSha256': hashlib.sha256(after).hexdigest()})
        report['files'].extend(changes)
        report['finalNavigationCompression'] = {'files': len(changes), 'bytesBeforeUpdatingReport': size(),
            'nativeParticleSupportPngsAndAllMeasurementInputsPreserved': True}
        report_path.write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps({'finalPreviewsReencoded': len(changes), 'bytes': size()}))
        return
    changes = []
    original_total = size()
    active = {
        'ice-stream-flat-central', 'ice-stream-flat-upper', 'ice-stream-flat-lower',
        'ice-stream-flat', 'lava-flat-middle', 'lava-flat-west', 'lava-flat',
        'lavafall-upper-left', 'lavafall-mouth', 'lavafall-volcano', 'shore-band-ice', 'shore-band',
    }
    for stage in range(2):
        for path in sorted((ROOT / 'review/boundary').iterdir()):
            if path.suffix not in ['.webp', '.jpg'] or 'summit' in path.name:
                continue
            if path.name.endswith('-solid-repair.webp'):
                continue  # Preserve enlarged production repair evidence.
            is_active = path.name.startswith('run4-') or any(
                path.name == name + '-liquid-reference.webp' for name in active)
            if stage == 0 and (is_active or path.name.startswith(('icefall-', 'lavafall-'))):
                continue
            if stage == 1 and size() < 79_400_000:
                break
            image = Image.open(path).convert('RGB')
            before_size = list(image.size)
            # Native terrain and contour coordinates are the measurement
            # inputs. These JPEG/WebP panels are navigation aids only.
            limit = (1100, 850) if is_active else (950, 750)
            quality = 43 if is_active else (28 if stage == 0 else 22)
            image.thumbnail(limit, Image.Resampling.LANCZOS)
            buffer = BytesIO()
            if path.suffix == '.webp':
                image.save(buffer, format='WEBP', quality=quality, method=6)
            else:
                image.save(buffer, format='JPEG', quality=quality, optimize=True)
            before = path.read_bytes(); after = buffer.getvalue()
            if len(after) >= len(before) * .95:
                continue
            path.write_bytes(after)
            changes.append({
                'path': str(path.relative_to(ROOT)), 'stage': stage,
                'beforeBytes': len(before), 'afterBytes': len(after),
                'beforeSize': before_size, 'afterSize': list(image.size),
                'beforeSha256': hashlib.sha256(before).hexdigest(),
                'afterSha256': hashlib.sha256(after).hexdigest(),
            })
        if size() < 79_400_000:
            break
    report = {
        'beforeTotalBytes': original_total, 'afterTotalBytesBeforeThisReport': size(),
        'files': changes, 'productionImagesChanged': False,
        'nativeGroundAndContourCoordinatesUnchanged': True,
        'summitEvidenceAndEnlargedRepairPanelsPreserved': True,
        'limitation': 'Lossy diagnostic previews, not measurement inputs. Historical preview hashes are historical; reconstruct native detail from input/v7 and the frozen contours.',
    }
    (ROOT / 'review/run4-preview-budget.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'previewsReencoded': len(changes), 'beforeBytes': original_total,
                      'afterBytes': size(), 'targetMet': size() < 79_500_000}))


if __name__ == '__main__':
    main()
