"""Artifact-only checks: completeness, decode, dimensions, source hashes, lossless.

Deliberately does not accept/reject artwork from sharpness, geometry, or seam scores.
Run once after final assembly. The resulting JSON is evidence, not a QA sign-off.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageChops

OUT = Path(__file__).resolve().parents[1]
ROOT = Path(__file__).resolve().parents[4]

def main():
    manifest = json.loads((OUT/'source-manifest.json').read_text())
    report = dict(scope='artifact files only; no visual acceptance',chunks={},errors=[],imagesDecoded=0)
    for ch,spec in manifest['chunks'].items():
        d = OUT/ch
        required = ['registration.json','structure.json','removed.json',f'{ch}-2x.webp',f'{ch}-compare.jpg','seam-check.jpg','structure-matches.jpg','owner-walkmask-overlay.jpg']
        required += [f'{q}-native.webp' for q in spec['parts']]
        missing = [f for f in required if not (d/f).is_file()]
        report['chunks'][ch] = dict(missing=missing)
        if missing:
            report['errors'].append(f'{ch}: missing {missing}')
            continue
        reg = json.loads((d/'registration.json').read_text())
        sizes = {}
        for q,s in spec['parts'].items():
            f = d/f'{q}-native.webp'
            with Image.open(f) as im:
                im.load()
                sizes[q] = list(im.size)
            assert sizes[q] == reg['parts'][q]['nativeSizePx'], f'{ch}/{q}: dimensions vs registration'
            assert b'VP8L' in f.read_bytes()[:32], f'{ch}/{q}: expected lossless WebP'
            assert hashlib.sha256(f.read_bytes()).hexdigest() == reg['parts'][q]['nativeSHA256']
            assert reg['parts'][q]['coreRectPx1x'] == s['coreRectPx1x']
            assert reg['parts'][q]['contextRectPx1x'] == s['contextRectPx1x']
        x0,y0,x1,y1 = spec['chunkRectPx1x']
        with Image.open(d/f'{ch}-2x.webp') as im:
            assert im.size == ((x1-x0)*2,(y1-y0)*2)
        assert b'VP8L' in (d/f'{ch}-2x.webp').read_bytes()[:32]
        report['chunks'][ch].update(nativeSizes=sizes,outputSize=[(x1-x0)*2,(y1-y0)*2])
    for f in OUT.rglob('*'):
        if f.suffix.lower() in ('.webp','.jpg','.png'):
            with Image.open(f) as im:
                im.load()
            report['imagesDecoded'] += 1
        elif f.suffix == '.json' and f.name != 'verification.json':
            json.loads(f.read_text())
    for rel,expected in manifest['sourceHashes'].items():
        assert hashlib.sha256((ROOT/rel).read_bytes()).hexdigest() == expected, f'source changed: {rel}'
    report['originalSourceTilesUnchanged'] = len(manifest['sourceHashes'])
    report['nativePixelComparisonsToGeneratedPNG'] = 0
    provenance = json.loads((OUT/'generation-provenance.json').read_text())
    assert len(provenance['completed']) == 16
    assert provenance['callsPreviousRun'] == 15 and provenance['callsThisRun'] == 1
    report['copiedNativesUnchanged'] = 0
    for item in provenance['completed']:
        if item['origin'] == 'copied-previous-run':
            old = Path(provenance['previousRun'])/'docs/art-reviews/2026-11-10-z3-hd-full'/item['nativePath']
            assert old.read_bytes() == (OUT/item['nativePath']).read_bytes(), item['id']
            report['copiedNativesUnchanged'] += 1
        generated = Path(item['generatedSourcePath'])
        if generated.exists():
            with Image.open(generated) as a, Image.open(OUT/item['nativePath']) as b:
                assert a.size == b.size
                assert ImageChops.difference(a.convert('RGB'),b.convert('RGB')).getbbox() is None, item['id']
            report['nativePixelComparisonsToGeneratedPNG'] += 1
    report['artifactBytesBeforeVerification'] = sum(f.stat().st_size for f in OUT.rglob('*') if f.is_file())
    assert report['artifactBytesBeforeVerification'] < 80_000_000, '80MB budget'
    (OUT/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    if report['errors']:
        raise SystemExit(1)

if __name__ == '__main__':
    main()
