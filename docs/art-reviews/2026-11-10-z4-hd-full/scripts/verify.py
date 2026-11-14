"""File completeness/openability/dimensions only. Does not accept art quality."""
import json, struct
from PIL import Image
from prepare import OUT, CHUNKS, write_json

parts=json.loads((OUT/'parts.json').read_text())
checks=[]
errors=[]
for chunk in CHUNKS:
    selected=[p for p in parts if p['chunk']==chunk]
    folder=OUT/chunk
    x0=min(p['coreRectPx1x'][0] for p in selected);y0=min(p['coreRectPx1x'][1] for p in selected)
    x1=max(p['coreRectPx1x'][2] for p in selected);y1=max(p['coreRectPx1x'][3] for p in selected)
    required=['registration.json','structure.json','removed.json','structure-points.json','seams.json',f'{chunk}-compare.jpg','seam-check.jpg','seam-strips.jpg','structure-overlay.jpg',f'{chunk}-2x.webp']
    required += [f"{p['part']}-native.webp" for p in selected]
    for name in required:
        path=folder/name
        try:
            if path.suffix=='.json':
                data=json.loads(path.read_text())
                if name=='registration.json':
                    assert set(data['parts'])=={p['part'] for p in selected}
                    for q,r in data['parts'].items():
                        assert len(r['nativeToContextPx1x'])==2
                        assert all(len(row)==3 for row in r['nativeToContextPx1x'])
            else:
                with Image.open(path) as im:
                    im.load();size=list(im.size)
                    if name==f'{chunk}-2x.webp':assert size==[(x1-x0)*2,(y1-y0)*2],size
                    if '-native.webp' in name:
                        gen=next(g for g in reversed(json.loads((OUT/'generations.json').read_text())) if g['chunk']==chunk and g['part']==name[:3])
                        assert size==gen['returnedSize']
                if path.suffix=='.webp':
                    raw=path.read_bytes();pos=12;tags=[]
                    while pos+8<=len(raw):
                        tag=raw[pos:pos+4];n=struct.unpack('<I',raw[pos+4:pos+8])[0]
                        tags.append(tag);pos+=8+n+(n%2)
                    assert b'VP8L' in tags, 'WebP must be lossless VP8L'
            checks.append(str(path.relative_to(OUT)))
        except Exception as exc:
            errors.append(dict(file=str(path.relative_to(OUT)),error=str(exc)))
total=sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file() and '__pycache__' not in p.parts)
if total>80_000_000:errors.append(dict(error='Run exceeds 80 MB',bytes=total))
report=dict(scope='files complete, decode, exact output dimensions, JSON readable, affine shape, lossless WebP, <=80MB only. No art quality gate.',
    checkedFiles=len(checks),errors=errors,totalBytes=total,qualityAcceptance='not evaluated by this script')
write_json(OUT/'file-checks.json',report)
print(json.dumps(report,ensure_ascii=False,indent=2))
raise SystemExit(bool(errors))
