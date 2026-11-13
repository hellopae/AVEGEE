"""Check the STORY-ART-B handoff files; this does not test game integration."""

import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent
EXPECTED = {
    'soul-sita-th.webp': ((1254, 1254), True),
    'soul-sita-th-profile.webp': ((1254, 1254), True),
    'boss-hanuman-th.webp': ((512, 512), True),
    'boss-hanuman-th-profile.webp': ((512, 512), False),
    'cut-hanuman-descends-th.webp': ((1375, 768), False),
    'skill-yama-fire-charge-cut-01.webp': ((1375, 768), False),
    'skill-yama-fire-charge-cut-02.webp': ((1375, 768), False),
    'skill-yama-fire-charge-icon.webp': ((256, 256), True),
}


def chunks(data):
    assert data[:4] == b'RIFF' and data[8:12] == b'WEBP', 'Invalid WebP'
    assert int.from_bytes(data[4:8], 'little') + 8 == len(data), 'Invalid RIFF size'
    offset = 12
    while offset < len(data):
        size = int.from_bytes(data[offset + 4:offset + 8], 'little')
        yield data[offset:offset + 4], data[offset + 8:offset + 8 + size]
        offset += 8 + size + (size % 2)
    assert offset == len(data), 'Truncated chunk'


def main():
    records = json.loads((ROOT / 'export-checks.json').read_text())
    evidence = {a['file']: a for a in records['assets']}
    assert set(evidence) == set(EXPECTED), 'Export record inventory mismatch'
    assert {p.name for p in ROOT.glob('*.webp')} == set(EXPECTED) | {'contact-sheet.webp'}
    for name, (size, transparent) in EXPECTED.items():
        path = ROOT / name
        data = path.read_bytes()
        riff = dict(chunks(data))
        assert b'VP8 ' in riff, f'{name}: expected lossy RGB encoding'
        assert b'ANIM' not in riff, f'{name}: unexpected animation'
        with Image.open(path) as im:
            im.load()
            assert im.format == 'WEBP' and im.size == size, f'{name}: dimensions/format'
            alpha = im.convert('RGBA').getchannel('A')
            assert alpha.getextrema() == ((0, 255) if transparent else (255, 255)), name
            if transparent:
                assert b'ALPH' in riff, f'{name}: missing alpha chunk'
                # No alpha quantization preprocessing; raw or lossless-compressed alpha.
                assert riff[b'ALPH'][0] & 3 in (0, 1), name
                assert (riff[b'ALPH'][0] >> 4) & 3 == 0, name
                assert all(alpha.getpixel(p) == 0 for p in
                           [(0, 0), (size[0]-1, 0), (0, size[1]-1), (size[0]-1, size[1]-1)]), name
        record = evidence[name]
        assert hashlib.sha256(data).hexdigest() == record['sha256'], f'{name}: hash mismatch'
        assert record['alpha_max_difference_from_resized_source'] == 0, name
        options = record['encoding_options']
        assert options[options.index('-q') + 1] == '86', name
        assert options[options.index('-alpha_q') + 1] == '100', name
        print(f'{name}: {size[0]}x{size[1]}, alpha={transparent}, hash matches export record')
    with Image.open(ROOT / 'contact-sheet.webp') as sheet:
        sheet.load()
        assert sheet.format == 'WEBP' and sheet.size == (1680, 760)
    prompts = json.loads((ROOT / 'prompts.json').read_text())
    assert {a['name'] for a in prompts['assets']} == set(EXPECTED)
    assert prompts['generations'] == records['imagegen_calls'] == 8
    assert prompts['generations'] <= prompts['budget'] == 16
    assert prompts['retries'] == records['retries'] == 0
    assert (ROOT / 'README.md').is_file()
    print('Checked 8 assets, contact sheet, README, prompt inventory and export evidence. No in-game QA performed.')


if __name__ == '__main__':
    main()
