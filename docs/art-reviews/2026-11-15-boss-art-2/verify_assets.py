"""Check BOSS-ART-2 delivery files; run from any directory with Pillow installed."""
import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[3]
REVIEW = Path(__file__).resolve().parent
SPECS = [
    ('img/z3-events/boss-cerberus-west.webp', (512, 512), 'RGBA'),
    ('img/z3-events/boss-cerberus-west-profile.webp', (512, 512), 'RGB'),
    ('img/z3-events/cut-cerberus-howl-west.webp', (1672, 941), 'RGB'),
    ('img/z3-events/boss-jormungandr-west.webp', (512, 512), 'RGBA'),
    ('img/z3-events/boss-jormungandr-west-profile.webp', (512, 512), 'RGB'),
    ('img/z3-events/cut-jormungandr-tide-west.webp', (1672, 941), 'RGB'),
    ('img/z4-events/boss-phantom404-cyberhell.webp', (512, 512), 'RGBA'),
    ('img/z4-events/boss-phantom404-cyberhell-profile.webp', (512, 512), 'RGB'),
    ('img/z4-events/cut-scammer-phishing-cyberhell.webp', (1672, 941), 'RGB'),
    ('img/z4-events/cut-phantom404-delete-cyberhell.webp', (1672, 941), 'RGB'),
    ('img/z4-events/phantom404-entry-cyberhell.webp', (512, 512), 'RGBA'),
    ('img/z4-events/phantom404-entry-cyberhell-profile.webp', (512, 512), 'RGB'),
]


def main():
    results = []
    for relative, size, mode in SPECS:
        path = ROOT / relative
        assert path.is_file(), f'Missing: {relative}'
        with Image.open(path) as image:
            image.load()
            assert image.format == 'WEBP', (relative, image.format)
            assert image.size == size, (relative, image.size)
            assert image.mode == mode, (relative, image.mode)
            item = {
                'path': relative,
                'format': image.format,
                'size': list(image.size),
                'mode': image.mode,
                'bytes': path.stat().st_size,
                'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            }
            if mode == 'RGBA':
                alpha = image.getchannel('A')
                extrema = alpha.getextrema()
                bounds = alpha.getbbox()
                assert extrema == (0, 255), (relative, extrema)
                assert bounds is not None
                assert 0 < bounds[0] < bounds[2] < size[0], (relative, bounds)
                assert 0 < bounds[1] < bounds[3] < size[1], (relative, bounds)
                item['alpha_extrema'] = list(extrema)
                item['alpha_bounds'] = list(bounds)
            results.append(item)
    record = {
        'checked_files': len(results),
        'automated_checks': ['exists', 'WebP decode', 'dimensions', 'mode',
                             'sprite alpha range', 'transparent sprite margins'],
        'limits': 'These file checks do not establish character identity, absence of text, visual style or in-game behavior.',
        'assets': results,
    }
    (REVIEW / 'asset-checks.json').write_text(
        json.dumps(record, indent=2) + '\n', encoding='utf-8')
    print(f'Checked {len(results)} WebP files: dimensions, modes, decode and sprite alpha assertions satisfied.')


if __name__ == '__main__':
    main()
