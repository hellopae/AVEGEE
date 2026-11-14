#!/usr/bin/env python3
"""Check deliverable presence, decoding, dimensions and lossless containers only.

Deliberately has no sharpness/structure/seam quality gate and does not regenerate art.
"""
import json
import struct
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parents[1]


def is_lossless_webp(path):
    data = path.read_bytes()
    if data[:4] != b'RIFF' or data[8:12] != b'WEBP':
        return False
    offset = 12
    while offset+8 <= len(data):
        kind = data[offset:offset+4]
        size = struct.unpack('<I',data[offset+4:offset+8])[0]
        if kind == b'VP8L':
            return True
        if kind == b'VP8 ':
            return False
        offset += 8+size+(size%2)
    return False


def main():
    required_root = ['README.md','run-summary.json','generation-prompts.json','objects-inventory.json',
                     'source-contact.jpg','walkmask-contact.jpg','hd-contact.jpg','removed-compare.jpg']
    for name in required_root:
        assert (OUT/name).is_file(),name
    rows = []
    for c in range(1,5):
        name = f'r1-c{c}'
        chunk = OUT/name
        for filename in ['registration.json','structure.json','removed.json','seams.json',
                         f'{name}-2x.webp',f'{name}-compare.jpg','structure-overlay.jpg','seam-paths.jpg','seam-check.jpg']:
            assert (chunk/filename).is_file(),filename
        reg = json.loads((chunk/'registration.json').read_text())
        for q in ['q11','q12','q21','q22']:
            p = chunk/f'{q}-native.webp'
            with Image.open(p) as im:
                im.load()
                assert list(im.size)==reg['parts'][q]['nativeSize'],str(p)
                assert is_lossless_webp(p),str(p)
                rows.append({'file':str(p.relative_to(OUT)),'size':list(im.size),'lossless':True})
        p = chunk/f'{name}-2x.webp'
        with Image.open(p) as im:
            im.load()
            assert im.size==(2048,2048),str(p)
            assert is_lossless_webp(p),str(p)
            rows.append({'file':str(p.relative_to(OUT)),'size':list(im.size),'lossless':True})
    json_count = 0
    jpeg_count = 0
    for p in OUT.rglob('*.json'):
        if p.name=='verification.json':
            continue
        json.loads(p.read_text())
        json_count += 1
    for p in OUT.rglob('*.jpg'):
        with Image.open(p) as im:
            im.load()
            jpeg_count += 1
    files = [p for p in OUT.rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.name!='verification.json']
    size = sum(p.stat().st_size for p in files)
    assert size+10000 <= 80000000,(size,'byte limit, including report reserve')
    report = {'scope':'presence / decode / dimensions / lossless WebP format / byte cap only',
              'qualityDecision':'not evaluated by this check; see README and structure.json',
              'webpImages':rows,'jsonFilesDecoded':json_count,'jpegImagesDecoded':jpeg_count,
              'filesMeasuredExcludingThisReport':len(files),'bytesMeasuredExcludingThisReport':size,
              'maxBytes':80000000,'errors':[]}
    (OUT/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k!='webpImages'},ensure_ascii=False,indent=2))


if __name__=='__main__':
    main()
