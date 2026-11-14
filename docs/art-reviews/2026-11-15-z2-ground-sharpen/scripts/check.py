"""Read-only artifact checks. --acceptance intentionally fails unresolved criteria."""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

OUT=Path(__file__).resolve().parents[1]
FULL=(9830,6554)


def read(name):
    return json.loads((OUT/name).read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def stitch(folder):
    canvas=np.zeros((FULL[1],FULL[0],3),np.uint8)
    for r in range(4):
        for c in range(5):
            path=folder/f'r{r+1}-c{c+1}.webp'
            image=Image.open(path).convert('RGB')
            x,y=c*2048,r*2048
            assert image.size==(min(2048,FULL[0]-x),min(2048,FULL[1]-y)),path.name
            canvas[y:y+image.height,x:x+image.width]=np.array(image)
    return canvas


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--acceptance',action='store_true');parser.add_argument('--pack',default='v8');args=parser.parse_args()
    pack=OUT/args.pack
    manifest=json.loads((pack/'manifest.json').read_text())
    assert manifest['fullPx']==dict(w=9830,h=6554)
    assert manifest['chunk']==2048 and manifest['rows']==4 and manifest['cols']==5
    chunks=list(pack.glob('r*-c*.webp'))
    assert len(chunks)==20
    assert Image.open(pack/'zone2-terrain-v7-preview.webp').size==(1536,1024)
    assert (pack/'zone2-terrain-v7-preview.webp').read_bytes()==(pack/'zone2-terrain-v8-preview.webp').read_bytes()
    for entry in manifest['files']:
        path=pack/entry['file'];assert sha(path)==entry['sha256']
        raw=path.read_bytes();assert raw[:4]==b'RIFF' and raw[8:12]==b'WEBP'
        assert (b'VP8L' if entry['codec']=='VP8L lossless' else b'VP8 ') in raw[:40]
    sources=read('source-hashes.json')
    for entry in sources:
        assert sha(Path(entry['path']))==entry['sha256'],entry['path']
    assert manifest['imageGenCalls']<=24
    assert len(manifest['regions'])==17 and not any(r['status'].startswith('pending') for r in manifest['regions'])
    for region in manifest['regions']:
        for image in region.get('generatedFiles',[]):
            assert sha(OUT/'generated'/image['file'])==image['sha256']
            w,h=image['nativeSize']
            tw,th=(688,1280) if image['file'].startswith('q22-') else region['inputSize']
            assert w>=tw and h>=th,(image['file'],'below native target')
    index=read('master-patches/index.json')
    before=stitch(Path(index['base']))
    master=before.copy()
    for entry in index['patches']:
        path=OUT/'master-patches'/entry['file'];assert sha(path)==entry['sha256']
        x,y,ex,ey=[v*2 for v in entry['rectPx1x']]
        pixels=np.array(Image.open(path).convert('RGB'))
        assert pixels.shape==(ey-y,ex-x,3)
        master[y:ey,x:ex]=pixels
    mask=np.array(Image.open(OUT/'edit-mask.png'))>0
    outside=~mask
    master_out=int(np.count_nonzero(np.any(before!=master,axis=2)&outside))
    assert master_out==0
    shipping=stitch(pack)
    decoded_out=int(np.count_nonzero(np.any(before!=shipping,axis=2)&outside))
    if manifest.get('editedChunkCodec')=='VP8L lossless':
        assert np.array_equal(shipping,master)
        assert decoded_out==0
    sharp=read('sharpness.json')['regions']
    structure=read('structure.json')['regions']
    failures=[]
    if not all(r['atLeast85Percent'] for r in sharp): failures.append('sharpness below85%')
    if any(r['over4px'] or r['uncertain'] for r in structure): failures.append('structure probes failed or uncertain')
    if not read('structure.json')['wholeStructureWithin4pxVerified']: failures.append('whole semantic contours unverified')
    if decoded_out: failures.append('decoded pixels outside edit mask differ')
    failures.append('in-game seam review not performed')
    print(json.dumps(dict(pack=args.pack,technicalChecks='completed',sourceHashesVerified=len(sources),chunks=20,
                          imageGenCalls=manifest['imageGenCalls'],masterOutsideChanged=master_out,decodedOutsideChanged=decoded_out,
                          sharpnessAtLeast85Percent=sum(r['atLeast85Percent'] for r in sharp),structureOver4px=sum(r['over4px'] for r in structure),
                          structureUncertain=sum(r['uncertain'] for r in structure),acceptanceUnresolved=failures),indent=2))
    return 2 if args.acceptance and failures else 0


if __name__=='__main__':
    sys.exit(main())
