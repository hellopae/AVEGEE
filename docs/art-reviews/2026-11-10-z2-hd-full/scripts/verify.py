"""Integrity only: completeness, decoding, dimensions and lossless storage. No quality gate."""
from pathlib import Path
import hashlib, json
from PIL import Image

OUT=Path(__file__).resolve().parents[1]

def main():
    errors=[];images=[];documents=[]
    manifest=json.loads((OUT/'generation-prompts.json').read_text())
    for c in range(1,5):
        chunk=f'r1-c{c}';d=OUT/chunk
        names=[f'{q}-native.webp' for q in ['q11','q12','q21','q22']]+['registration.json','structure.json','removed.json',f'{chunk}-2x.webp',f'{chunk}-compare.jpg','seam-check.jpg','sharpness.json','inputs/tiles.json']
        for name in names:
            if not (d/name).is_file():errors.append(f'Missing: {chunk}/{name}')
        p=d/f'{chunk}-2x.webp'
        if p.exists() and Image.open(p).size!=(2048,2048):errors.append(f'Wrong assembled dimensions: {chunk}')
    for p in sorted(OUT.rglob('*')):
        if p.suffix in ['.webp','.jpg','.png']:
            try:
                im=Image.open(p);im.load()
                if p.suffix=='.webp' and p.read_bytes()[12:16]!=b'VP8L':errors.append(f'Not VP8L lossless: {p.relative_to(OUT)}')
                images.append(dict(path=str(p.relative_to(OUT)),size=list(im.size),format=im.format))
            except Exception as error:errors.append(f'Decode {p.name}: {error}')
        elif p.suffix=='.json' and p.name!='verification.json':
            try:json.loads(p.read_text());documents.append(str(p.relative_to(OUT)))
            except Exception as error:errors.append(f'JSON {p.name}: {error}')
    for g in manifest['generations']:
        p=OUT/g['archivedNative'];im=Image.open(p).convert('RGB')
        if list(im.size)!=g['nativeSize']:errors.append(f'Native dimensions: {p}')
        if hashlib.sha256(im.tobytes()).hexdigest()!=g['decodedRgbSha256']:errors.append(f'Native pixel hash: {p}')
    size=sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())
    if size>80_000_000:errors.append(f'Package bytes {size} exceeds 80 MB')
    result=dict(scope='file completeness / decoding / dimensions / lossless roundtrip hashes / package size only',qualityAssessed=False,qaPassedClaimed=False,errors=errors,imageCount=len(images),jsonCount=len(documents),bytesBeforeVerification=size,images=images,jsonDocuments=documents)
    (OUT/'verification.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({k:v for k,v in result.items() if k not in ['images','jsonDocuments']},indent=2))
    if errors:raise SystemExit(1)

if __name__=='__main__':main()
