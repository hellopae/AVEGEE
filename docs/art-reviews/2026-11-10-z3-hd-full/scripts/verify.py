"""Artifact checks only: files, decode, dimensions and lossless integrity.

No quality thresholds, automated artistic acceptance or numeric retries.
Run once on the final package. This does not certify QA or continuous geometry.
"""
import gzip
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageChops

OUT = Path(__file__).resolve().parents[1]
ROOT = Path(__file__).resolve().parents[4]

def main():
    manifest = json.loads((OUT/'source-manifest.json').read_text())
    provenance = json.loads((OUT/'generation-provenance.json').read_text())
    prompts = json.loads((OUT/'generation-prompts.json').read_text())
    report = dict(scope='artifact completeness, decode, dimensions and integrity only; no quality approval', errors=[], chunks={}, imagesDecoded=0)
    expected = {f'{ch}/{q}' for ch,s in manifest['chunks'].items() for q in s['parts']}
    assert {i['id'] for i in provenance['completed']} == expected
    assert len(provenance['completed']) == 16
    assert {f'{ch}/{q}' for ch,qs in prompts.items() for q in qs} == expected
    report['generatedNativesPixelIdentical'] = 0
    for item in provenance['completed']:
        src, target = Path(item['generatedSourcePath']), OUT/item['nativePath']
        assert hashlib.sha256(src.read_bytes()).hexdigest() == item['generatedSHA256']
        with Image.open(src) as a, Image.open(target) as b:
            assert a.size == b.size
            assert ImageChops.difference(a.convert('RGB'),b.convert('RGB')).getbbox() is None
        report['generatedNativesPixelIdentical'] += 1
    for ch,s in manifest['chunks'].items():
        d = OUT/ch
        required = ['registration.json','structure.json','removed.json','landmarks.json','landmarks.jpg','source-inventory.jpg','seam-check.jpg','structure-matches.jpg','owner-walkmask-overlay.jpg','sift-correspondences.json.gz',f'{ch}-2x.webp',f'{ch}-compare.jpg']
        required += [f'{q}-native.webp' for q in s['parts']]
        missing = [name for name in required if not (d/name).is_file()]
        assert not missing, (ch,missing)
        reg = json.loads((d/'registration.json').read_text())
        matches = json.loads(gzip.decompress((d/'sift-correspondences.json.gz').read_bytes()))
        assert set(matches) == set(s['parts'])
        sizes = {}
        for q,part in s['parts'].items():
            f = d/f'{q}-native.webp'
            with Image.open(f) as im:
                im.load()
                sizes[q] = list(im.size)
            info = reg['parts'][q]
            assert sizes[q] == info['nativeSizePx']
            assert hashlib.sha256(f.read_bytes()).hexdigest() == info['nativeSHA256']
            assert b'VP8L' in f.read_bytes()[:32], 'Expected lossless WebP'
            for key in ['coreRectPx1x','contextRectPx1x']:
                assert info[key] == part[key]
        x0,y0,x1,y1 = s['chunkRectPx1x']
        size = ((x1-x0)*2,(y1-y0)*2)
        with Image.open(d/f'{ch}-2x.webp') as im:
            assert im.size == size
        assert b'VP8L' in (d/f'{ch}-2x.webp').read_bytes()[:32]
        report['chunks'][ch] = dict(nativeSizes=sizes,outputSize=list(size),missing=[])
    for rel,sha in manifest['sourceHashes'].items():
        assert hashlib.sha256((ROOT/rel).read_bytes()).hexdigest() == sha, rel
    report['unchangedMasterTiles'] = len(manifest['sourceHashes'])
    for rel,sha in manifest['runtimeEvidenceSHA256'].items():
        assert hashlib.sha256((ROOT/rel).read_bytes()).hexdigest() == sha, rel
    report['unchangedRuntimeEvidenceFiles'] = len(manifest['runtimeEvidenceSHA256'])
    for f in OUT.rglob('*'):
        if f.suffix in ('.webp','.jpg','.png'):
            with Image.open(f) as im:
                im.load()
            report['imagesDecoded'] += 1
        elif f.suffix == '.json' and f.name != 'verification.json':
            json.loads(f.read_text())
    report['bytesBeforeVerification'] = sum(f.stat().st_size for f in OUT.rglob('*') if f.is_file())
    assert report['bytesBeforeVerification'] + 10000 < 80_000_000
    (OUT/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))

if __name__ == '__main__':
    main()
