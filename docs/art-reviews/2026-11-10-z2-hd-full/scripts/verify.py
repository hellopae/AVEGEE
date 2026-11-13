"""Artifact checks ONLY: presence, readable JSON/images and recorded dimensions.

No assertion on sharpness, semantic structure, seams, object removal or art quality.
"""
import json
from pathlib import Path
from PIL import Image
from prepare import OUT, CHUNKS, write_json


if __name__ == '__main__':
    checked = []
    json_files = ['parts.json','source-hashes.json','source-provenance.json','objects-inventory.json',
        'generation-prompts.json','run-summary.json','measurements.json','reuse-verification.json']
    image_sizes = {'walkmask-review.jpg':(1400,600)}
    required = [OUT/'README.md'] + list((OUT/'scripts').glob('*.py'))
    for name in CHUNKS:
        w = 819 if name=='r4-c5' else 1024
        d = OUT/name
        json_files += [f'{name}/{f}.json' for f in ['registration','structure','sharpness','seams','removed']]
        reg = json.loads((d/'registration.json').read_text())
        for tile in reg['tiles']:
            image_sizes[tile['nativeFile']] = tuple(tile['nativeSize'])
        image_sizes[f'{name}/{name}-2x.webp'] = (w*2,410)
        for p in [d/f'{name}-compare.jpg',d/'structure-check.jpg',d/'seam-check.jpg']:
            image_sizes[str(p.relative_to(OUT))] = None
    for part in json.loads((OUT/'parts.json').read_text()):
        r = part['contextRectPx1x']
        image_sizes[part['input']] = (r[2]-r[0],r[3]-r[1])
    for rel in json_files:
        p = OUT/rel
        json.loads(p.read_text())
        required.append(p)
    for p in required:
        if not p.is_file() or p.stat().st_size==0:
            raise RuntimeError(f'Missing/empty {p}')
    for rel,size in image_sizes.items():
        with Image.open(OUT/rel) as im:
            im.load()
            if size is not None and im.size!=size:
                raise RuntimeError(f'{rel}: {im.size} != {size}')
            checked.append(dict(file=rel,size=list(im.size),format=im.format))
    files = [p for p in OUT.rglob('*') if p.is_file() and '__pycache__' not in p.parts]
    count_bytes = sum(p.stat().st_size for p in files if p.name!='verification.json')
    write_json(OUT/'verification.json',dict(scope='Presence, JSON/image decoding, recorded dimensions only; no quality acceptance',
        imagesChecked=len(checked),jsonChecked=len(json_files),images=checked,
        artifactBytesExcludingThisReport=count_bytes,runBudgetBytes=80000000,
        qualityAcceptanceEvaluated=False,gameTestRun=False))
    print(json.dumps(dict(imagesChecked=len(checked),jsonChecked=len(json_files),artifactBytesExcludingThisReport=count_bytes)))
