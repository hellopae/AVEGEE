"""Mechanical artifact check only: completeness, decode, sizes. Never a quality gate."""
from pathlib import Path
import json
from PIL import Image
O=Path(__file__).resolve().parents[1]
CHUNKS=['r2-c4','r2-c5','r3-c1','r3-c2']
m=json.loads((O/'generation-prompts.json').read_text());images=[]
for chunk in CHUNKS:
    d=O/chunk
    for name in ['registration.json','structure.json','removed.json','sharpness.json','seams.json',f'{chunk}-compare.jpg','seam-check.jpg','structure-check.jpg','walkmask-inventory.jpg']:
        assert (d/name).is_file(),f'missing {chunk}/{name}'
    reg=json.loads((d/'registration.json').read_text())
    assert len(reg['tiles'])==4
    assert Image.open(d/f'{chunk}-2x.webp').size==((1638,2048) if chunk=='r2-c5' else (2048,2048))
    for tile in reg['tiles']:
        p=d/f"{tile['id']}-native.webp"
        assert list(Image.open(p).size)==tile['nativeSize']
        assert len(tile['nativePixelToMasterPx1x'])==2
        assert len(tile['coreMasterPx1x'])==4 and len(tile['contextMasterPx1x'])==4
for p in sorted(O.rglob('*')):
    if p.suffix.lower() in ['.webp','.jpg','.png']:
        with Image.open(p) as im:
            im.load();images.append(dict(path=str(p.relative_to(O)),size=list(im.size)))
assert len(m['generations'])==16 and m['generationCount']==16
assert all(g['status']=='generated' for g in m['generations'])
total=sum(p.stat().st_size for p in O.rglob('*') if p.is_file())
assert total<=80_000_000,total
report=dict(scope='file completeness, decoding and dimensions only; no art/structure/seam acceptance',
    imageGenCalls=m['generationCount'],imageCount=len(images),outputBytesBeforeVerificationFile=total,
    limitBytes=80_000_000,images=images,qualityAcceptance='pending Claude review')
(O/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='images'},indent=2))
