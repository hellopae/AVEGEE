"""File, readability and dimensions only. Does not approve visual quality."""
import json
from pathlib import Path
from PIL import Image

OUT=Path(__file__).resolve().parents[1]
plans=json.loads((OUT/'layout.json').read_text())
assert list(plans)==['r4-c2','r4-c3','r4-c4','r4-c5']
checked=[]
for name in ['README.md','objects-inventory.json','source-provenance.json',
             'generation-prompts.json','run-summary.json']:
    assert (OUT/name).is_file(),name
for p in OUT.rglob('*.json'):
    json.loads(p.read_text())
for name,plan in plans.items():
    folder=OUT/name
    for file in ['registration.json','structure.json','removed.json','seams.json']:
        json.loads((folder/file).read_text())
    reg=json.loads((folder/'registration.json').read_text())
    assert len(reg['parts'])==2
    assert [p['part'] for p in reg['parts']]==[p['part'] for p in plan['parts']]
    for p,expected_part in zip(reg['parts'],plan['parts']):
        assert p['coreRectPx1x']==expected_part['coreRectPx1x']
        assert p['contextRectPx1x']==expected_part['contextRectPx1x']
        r=p['contextRectPx1x']
        with Image.open(folder/(p['part']+'-source.webp')) as source:
            source.load()
            assert source.size==(r[2]-r[0],r[3]-r[1])
    rect=plan['chunkRectPx1x']
    expected=((rect[2]-rect[0])*2,(rect[3]-rect[1])*2)
    files=[(folder/(name+'-2x.webp'),expected)]
    files += [(folder/p['nativeFile'],tuple(p['nativeSize'])) for p in reg['parts']]
    for p,size in files:
        with Image.open(p) as im:
            im.load()
            assert im.size==size,(p,im.size,size)
            assert im.format=='WEBP'
        assert b'VP8L' in p.read_bytes()[:64],f'Not lossless WebP: {p}'
        checked.append({'file':str(p.relative_to(OUT)),'size':list(size)})
    review_files = ['walkmask-overlay.jpg','seam-check.jpg',name+'-compare.jpg',
                    'q11-registration.jpg','q12-registration.jpg']
    for filename in review_files:
        p=folder/filename
        with Image.open(p) as im:
            im.load()
    for p in folder.glob('*-source.webp'):
        with Image.open(p) as im:
            im.load()
summary=json.loads((OUT/'run-summary.json').read_text())
assert len(json.loads((OUT/'generation-prompts.json').read_text()))==sum(len(p['parts']) for p in plans.values())
assert summary['completedDrawingParts']==8
assert summary['imageGenCalls']<=16
total=sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())
assert total<=80_000_000,total
report={'scope':'file completeness, decoding, recorded dimensions, lossless WebP, storage and call budget only','nativeAnd2xImages':checked,'imageGenCalls':summary['imageGenCalls'],'bytesAtCheck':total,'qualityApproval':None}
(OUT/'file-check.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'checkedNativeAnd2x':len(checked),'imageGenCalls':summary['imageGenCalls'],'bytes':total,'qualityApproval':None}))
