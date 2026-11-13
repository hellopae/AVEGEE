"""Integrity checks only: completeness, decode, dimensions, hashes, byte budget.
Does not grade sharpness, structure, seams or object removal.
"""
import hashlib,json
from PIL import Image
from prepare import OUT,ROOT,write_json

def main():
    errors=[];images=[];documents=[]
    plan=json.loads((OUT/'crop-plan.json').read_text())
    results=json.loads((OUT/'generation-results.json').read_text())
    for chunk,spec in plan.items():
        d=OUT/chunk;x0,y0,x1,y1=spec['chunkRectPx1x']
        for name in [f'{p["id"]}-native.webp' for p in spec['parts']]+[
            'registration.json','structure.json','removed.json','sharpness.json','seams.json',
            'measurements.json','seam-check.jpg','structure-check.jpg',f'{chunk}-2x.webp',f'{chunk}-compare.jpg']:
            if not (d/name).is_file():errors.append(f'Missing {chunk}/{name}')
        p=d/f'{chunk}-2x.webp'
        if p.is_file() and Image.open(p).size!=((x1-x0)*2,(y1-y0)*2):errors.append(f'Output dimensions {chunk}')
        if (d/'registration.json').is_file():
            reg=json.loads((d/'registration.json').read_text())
            if {p['id'] for p in reg['parts']}!={p['id'] for p in spec['parts']}:errors.append(f'Registration parts {chunk}')
            for p in spec['parts']:
                rec=next(v for v in reg['parts'] if v['id']==p['id'])
                if rec['coreRectPx1x']!=p['coreRectPx1x'] or rec['contextRectPx1x']!=p['contextRectPx1x']:errors.append(f'Registration rect {chunk}/{p["id"]}')
    for p in sorted(OUT.rglob('*')):
        if p.suffix in ['.webp','.jpg','.png']:
            try:
                im=Image.open(p);im.load()
                if p.suffix=='.webp' and p.read_bytes()[12:16]!=b'VP8L':errors.append(f'Not lossless VP8L {p.relative_to(OUT)}')
                images.append(dict(path=str(p.relative_to(OUT)),size=list(im.size),format=im.format))
            except Exception as e:errors.append(f'Decode {p.relative_to(OUT)}: {e}')
        elif p.suffix=='.json' and p.name!='verification.json':
            try:json.loads(p.read_text());documents.append(str(p.relative_to(OUT)))
            except Exception as e:errors.append(f'JSON {p.relative_to(OUT)}: {e}')
    expected={(ch,p['id']) for ch,s in plan.items() for p in s['parts']}
    if {(g['chunk'],g['part']) for g in results}!=expected:errors.append('Generation records incomplete')
    if len(results)!=len(expected):errors.append('Duplicate generation records')
    for g in results:
        p=OUT/g['native']
        if not p.is_file():continue
        if list(Image.open(p).size)!=g['nativeSize']:errors.append(f'Native dimensions {g["native"]}')
        if hashlib.sha256(p.read_bytes()).hexdigest()!=g['nativeSha256']:errors.append(f'Native hash {g["native"]}')
        if not g['losslessRoundTrip']:errors.append(f'Native roundtrip {g["native"]}')
    for f,v in json.loads((OUT/'source-hashes.json').read_text()).items():
        if hashlib.sha256((ROOT/f).read_bytes()).hexdigest()!=v:errors.append(f'Source hash changed: {f}')
    for f,v in json.loads((OUT/'continuation.json').read_text())['copiedNativeSha256'].items():
        if hashlib.sha256((OUT/f).read_bytes()).hexdigest()!=v:errors.append(f'Copied native changed: {f}')
    size=sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())
    if size>80_000_000:errors.append(f'Package {size} > 80 MB')
    result=dict(scope='file completeness / decoding / dimensions / lossless hashes / source preservation / byte budget only',
        qualityAssessed=False,qaPassedClaimed=False,errors=errors,imageCount=len(images),jsonCount=len(documents),
        bytesBeforeVerification=size,images=images,jsonDocuments=documents)
    write_json(OUT/'verification.json',result)
    print(json.dumps({k:v for k,v in result.items() if k not in ['images','jsonDocuments']},indent=2))
    if errors:raise SystemExit(1)

if __name__=='__main__':main()
