"""Offline review pack only. No writes to game directories or source worktrees."""
import argparse
import hashlib
import json
import shutil
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1]
ROOT = OUT.parents[2]
SOURCE = Path('/Users/agapae/agapae-work/.codex-worktrees/20261113T085021Z-39f7fa12/docs/art-reviews/2026-11-10-z2-hd-assemble')
FULL = (9830, 6554)
LAVA_BOX = [1490, 1170, 1920, 1460]
cv2.setNumThreads(2)


def write(name, data):
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def stitch(folder, full, chunk):
    im = Image.new('RGB', full)
    for r in range(4):
        for c in range(5):
            with Image.open(folder / f'r{r+1}-c{c+1}.webp') as tile:
                im.paste(tile, (c * chunk, r * chunk))
    return np.array(im)


def items():
    data = json.loads((SOURCE / 'inventory.json').read_text())['fallbackPatches']
    return data + [dict(id='missing-r2-c3-q22', core=[2560, 1536, 3072, 2048],
                        contextRectPx1x=[2496, 1472, 3136, 2112])]


def crop(a, rect):
    x, y, ex, ey = [v * 2 for v in rect]
    return a[y:ey, x:ex]


def prepare():
    (OUT / 'inputs').mkdir(exist_ok=True)
    (OUT / 'generated').mkdir(exist_ok=True)
    atlas = stitch(SOURCE / 'v7', FULL, 2048)
    source = stitch(ROOT / 'img/map-zone2/v2', (4915, 3277), 1024)
    for item in items():
        box = item['contextRectPx1x']
        Image.fromarray(crop(atlas, box)).save(OUT / 'inputs' / f"{item['id']}-v7.png")
    box = LAVA_BOX
    x,y,ex,ey=box
    Image.fromarray(crop(atlas, box)).save(OUT / 'inputs/lava-actual-v7.png')
    Image.fromarray(source[y:ey,x:ex]).resize(((ex-x)*2,(ey-y)*2), Image.Resampling.LANCZOS).save(OUT / 'inputs/lava-actual-v2.png')
    q22=crop(atlas,[2496,1472,3136,2112])
    Image.fromarray(q22[:,:688]).save(OUT/'inputs/q22-left.png')
    Image.fromarray(q22[:,592:]).save(OUT/'inputs/q22-right.png')
    Image.fromarray(source[1472:2112,2496:2840]).resize((688,1280),Image.Resampling.LANCZOS).save(OUT/'inputs/q22-left-v2.png')
    mask=np.zeros((580,860),np.uint8)
    cv2.fillPoly(mask,[np.array([[105,389],[618,170],[711,233],[242,462],[135,425]],np.int32)],255)
    Image.fromarray(cv2.GaussianBlur(mask,(0,0),2)).save(OUT/'inputs/lava-stair-mask.png')
    write('regions.json', dict(rectFormat='xyxy map1x', fallbackRegions=items(), lavaBankContext=box))
    paths = sorted((SOURCE / 'v7').glob('r*-c*.webp')) + sorted((ROOT / 'img/map-zone2/v2').glob('r*-c*.webp')) + [SOURCE/'inventory.json',SOURCE/'seams.json',ROOT/'docs/art-reviews/2026-11-14-z23-ground-integrate/README.md',Path('/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Claudy/2026-11-15-owner-feedback/z2-blurry-bushes.png')]
    write('source-hashes.json', [dict(path=str(p), sha256=sha(p)) for p in paths])


def feather(item):
    x, y, ex, ey = item['contextRectPx1x']
    cx, cy, cex, cey = item['core']
    yy, xx = np.mgrid[y*2:ey*2, x*2:ex*2]
    paths = {s['id']: s for s in json.loads((SOURCE / 'seams.json').read_text())['seams']}
    if 'fallback/' + item['id'] + '/left' in paths:
        h, w = (ey-y)*2, (ex-x)*2
        alpha = np.ones((h,w), np.float32)
        for side in ['left','right','top','bottom']:
            length = w if side in ['left','right'] else h
            offset = 0 if side in ['left','top'] else length-96
            path = np.array(paths['fallback/'+item['id']+'/'+side]['pathInOverlapOutputPx'])+offset
            t = np.clip((np.arange(length)[None,:]-path[:,None]+8)/16,0,1)
            t = t*t*(3-2*t)
            if side in ['right','bottom']:
                t = 1-t
            if side in ['top','bottom']:
                t = t.T
            alpha *= t
        return alpha
    # Missing q22 has no four-sided archived fallback path; use a 64px context ring.
    distance = np.minimum.reduce([xx-x*2, ex*2-1-xx, yy-y*2, ey*2-1-yy]).astype(np.float32)
    t = np.clip(distance / 128, 0, 1)
    return t*t*(3-2*t)


def aligned_detail(reference, generated):
    """Transfer generated fine detail only; source owns all low-frequency geometry/color."""
    h, w = reference.shape[:2]
    gen = np.array(Image.fromarray(generated).resize((w, h), Image.Resampling.LANCZOS))
    a = cv2.cvtColor(reference, cv2.COLOR_RGB2GRAY)
    b = cv2.cvtColor(gen, cv2.COLOR_RGB2GRAY)
    flow = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM).calc(a, b, None)
    yy, xx = np.mgrid[:h, :w].astype(np.float32)
    registered = cv2.remap(gen, xx+flow[..., 0], yy+flow[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT).astype(np.float32)
    # Fine band sigma2.4 output px: reject generated broad shapes and global grading.
    detail = registered - cv2.GaussianBlur(registered, (0, 0), 2.4)
    return np.clip(detail, -48, 48), dict(medianFlowPx2x=float(np.median(np.linalg.norm(flow, axis=2))),
                                         p95FlowPx2x=float(np.percentile(np.linalg.norm(flow, axis=2), 95)))


def metric(a):
    gray = cv2.cvtColor(a, cv2.COLOR_RGB2GRAY).astype(np.float32)
    return cv2.Laplacian(gray, cv2.CV_32F)**2


def comparison(label, before, after, reference=None):
    panels = [before, after] if reference is None else [reference, before, after]
    h, w = before.shape[:2]
    sheet = Image.new('RGB', (w * len(panels), h+40), '#161c24')
    d = ImageDraw.Draw(sheet)
    labels = ['V7 BEFORE', 'V8 AFTER'] if reference is None else ['V2 SOURCE 2x', 'V7 BEFORE', 'V8 AFTER']
    for i, (p, text) in enumerate(zip(panels, labels)):
        sheet.paste(Image.fromarray(p), (i*w, 40))
        d.text((i*w+8, 10), label+' | '+text, fill='white')
    sheet.save(OUT / 'compare' / f'{label}.jpg', quality=95, subsampling=0)


def build(lossless=False):
    for d in ['v8', 'compare', 'masks', 'structure', 'master-patches']:
        (OUT / d).mkdir(exist_ok=True)
    before = stitch(SOURCE / 'v7', FULL, 2048)
    source = stitch(ROOT / 'img/map-zone2/v2', (4915, 3277), 1024)
    after = before.copy()
    edit_mask = np.zeros(before.shape[:2], np.uint8)
    records = []
    for item in items():
        path = OUT / 'generated' / f"{item['id']}.png"
        if not path.exists():
            records.append(dict(id=item['id'], status='pending-no-generated-image'))
            continue
        box = item['contextRectPx1x']
        ref = crop(before, box)
        if item['id']=='missing-r2-c3-q22':
            x,y,ex,ey=box
            ref=np.array(Image.fromarray(source[y:ey,x:ex]).resize(((ex-x)*2,(ey-y)*2),Image.Resampling.LANCZOS))
        native = np.array(Image.open(path).convert('RGB'))
        detail, registration = aligned_detail(ref, native)
        generated_files = [dict(file=path.name,sha256=sha(path),nativeSize=[native.shape[1],native.shape[0]])]
        if item['id']=='missing-r2-c3-q22' and (OUT/'generated/q22-left.png').exists() and (OUT/'generated/q22-right.png').exists():
            detail = np.zeros_like(ref,dtype=np.float32)
            generated_files=[]; registration={}
            for name,start in [('q22-left',0),('q22-right',592)]:
                half_path=OUT/'generated'/f'{name}.png'
                half=np.array(Image.open(half_path).convert('RGB'))
                assert half.shape[0]>=1280 and half.shape[1]>=688, 'Native half too small'
                hd,hr=aligned_detail(ref[:,start:start+688],half)
                generated_files.append(dict(file=half_path.name,sha256=sha(half_path),nativeSize=[half.shape[1],half.shape[0]]))
                registration[name]=hr
                if start==0:
                    detail[:,:688]=hd
                else:
                    t=np.linspace(0,1,96,dtype=np.float32)[None,:,None]; t=t*t*(3-2*t)
                    detail[:,592:688]=detail[:,592:688]*(1-t)+hd[:,:96]*t
                    detail[:,688:]=hd[:,96:]
        alpha = feather(item)
        # Replace original fine band with generated band; retain v7 broad structure.
        f = ref.astype(np.float32)
        base = cv2.GaussianBlur(f, (0, 0), 2.4)
        # Texture contrast compensation on the five soft stair sources.
        gain = 1.25 if item['id'] in ['main-plaza-stair','central-bridge-stair-rails','east-water-stair','northwest-stair'] else 1.0
        if item['id']=='ice-stair':
            gain=1.6
        candidate = np.clip(np.rint(base + detail*gain), 0, 255)
        dst = crop(after, box)
        dst[:] = np.uint8(np.rint(dst*(1-alpha[..., None])+candidate*alpha[..., None]))
        crop(edit_mask, box)[:] |= (alpha > 0).astype(np.uint8)
        Image.fromarray(np.uint8(alpha*255)).save(OUT / 'masks' / f"{item['id']}.png")
        records.append(dict(id=item['id'], status='generated-detail-composited',
                            inputSize=[ref.shape[1], ref.shape[0]], detailGain=gain, generatedFiles=generated_files, registration=registration))
    # Lava stair restoration is separate and source-derived, never generated geometry.
    lava = dict(id='lava-bank-stair', core=[1540,1250,1858,1410], contextRectPx1x=LAVA_BOX)
    x,y,ex,ey = lava['contextRectPx1x']
    reference = np.array(Image.fromarray(source[y:ey,x:ex]).resize(((ex-x)*2,(ey-y)*2), Image.Resampling.LANCZOS))
    # Read the source/target before drawing the final source stair mask.
    lava_mask_path = OUT / 'inputs/lava-stair-mask.png'
    if lava_mask_path.exists():
        alpha = np.array(Image.open(lava_mask_path).convert('L')).astype(np.float32)/255
        dst = crop(after,lava['contextRectPx1x'])
        assert alpha.shape == dst.shape[:2]
        native_path = OUT / 'generated/lava-bank-stair.png'
        restored = reference.astype(np.float32)
        if native_path.exists():
            detail, registration = aligned_detail(reference,np.array(Image.open(native_path).convert('RGB')))
            restored = np.clip(cv2.GaussianBlur(restored,(0,0),2.4)+detail,0,255)
        dst[:] = np.uint8(np.rint(dst*(1-alpha[...,None])+restored*alpha[...,None]))
        crop(edit_mask,lava['contextRectPx1x'])[:] |= (alpha>0).astype(np.uint8)
        native_image=Image.open(native_path)
        records.append(dict(id='lava-bank-stair',status='v2-source-treads-restored',contextRectPx1x=LAVA_BOX,inputSize=[reference.shape[1],reference.shape[0]],
                            generatedFiles=[dict(file=native_path.name,sha256=sha(native_path),nativeSize=list(native_image.size))],registration=registration,detailGain=1.0))
    else:
        records.append(dict(id='lava-bank',status='pending-source-stair-mask'))
    # Lossless context patches reconstruct the exact master without a >100MB PNG.
    patches=[]
    for item in items()+[lava]:
        name=item['id']+'.png'
        path=OUT/'master-patches'/name
        Image.fromarray(crop(after,item['contextRectPx1x'])).save(path)
        patches.append(dict(file=name,rectPx1x=item['contextRectPx1x'],sha256=sha(path)))
    write('master-patches/index.json',dict(base=str(SOURCE/'v7'),patches=patches))
    Image.fromarray(edit_mask*255).save(OUT / 'edit-mask.png')
    files=[]
    for r in range(4):
        for c in range(5):
            name=f'r{r+1}-c{c+1}.webp'
            x,y=c*2048,r*2048
            region=after[y:min(y+2048,FULL[1]),x:min(x+2048,FULL[0])]
            target=OUT/'v8'/name
            if not np.any(edit_mask[y:y+2048,x:x+2048]):
                shutil.copyfile(SOURCE/'v7'/name,target)
                encoded=False
            else:
                Image.fromarray(region).save(target,quality=90,method=6,lossless=lossless)
                encoded=True
            files.append(dict(file=name,width=region.shape[1],height=region.shape[0],bytes=target.stat().st_size,sha256=sha(target),reencoded=encoded,codec='VP8L lossless' if encoded and lossless else 'VP8 q90'))
    preview=Image.fromarray(after).resize((1536,1024),Image.Resampling.LANCZOS)
    preview.save(OUT/'v8/zone2-terrain-v8-preview.webp',quality=90,method=6)
    # Installer currently requires this legacy filename, even when --name v8.
    shutil.copyfile(OUT/'v8/zone2-terrain-v8-preview.webp',OUT/'v8/zone2-terrain-v7-preview.webp')
    manifest=dict(zone='asia',version=8,fullPx=dict(w=9830,h=6554),chunk=2048,rows=4,cols=5,worldSize=dict(w=3840,h=2560),
                  format='webp',quality=90,repairs=False,visualAcceptanceVerified=False,imageGenCalls=len(list((OUT/'generated').glob('*.png'))),
                  editedChunkCodec='VP8L lossless' if lossless else 'VP8 q90',
                  method='Generated registered fine-band texture; v7 low frequencies and source-derived v2 stair mask; archived adaptive 48px feather, smoothstep64px for missing q22.',files=files,regions=records)
    write('v8/manifest.json',manifest)
    verify(before,after,edit_mask,source,records)


def band(a):
    gray=cv2.cvtColor(a,cv2.COLOR_RGB2GRAY).astype(np.float32)
    return cv2.GaussianBlur(gray,(0,0),1.5)-cv2.GaussianBlur(gray,(0,0),6)


def verify(before,master,mask,source,records):
    shipping=stitch(OUT/'v8',FULL,2048)
    sharp=[]; probes=[]
    # Global 1x source and decoded shipping. Keep all low-confidence / failed probes.
    reduced=np.array(Image.fromarray(shipping).resize((4915,3277),Image.Resampling.LANCZOS))
    a,b=band(source),band(reduced)
    for item in items():
        box=item['contextRectPx1x'];cx,cy,ex,ey=item['core'];x,y,xx,yy=box
        old,new=crop(before,box),crop(shipping,box)
        roi=np.zeros(old.shape[:2],bool)
        roi[(cy-y)*2:(ey-y)*2,(cx-x)*2:(ex-x)*2]=True
        ring=~roi
        values={}
        for label,image in [('before',old),('after',new)]:
            m=metric(image)
            values[label]=dict(coreLaplacianMeanSquare=float(m[roi].mean()),ringLaplacianMeanSquare=float(m[ring].mean()))
            values[label]['ratio']=values[label]['coreLaplacianMeanSquare']/max(values[label]['ringLaplacianMeanSquare'],1e-9)
        sharp.append(dict(id=item['id'],**values,atLeast85Percent=values['after']['ratio']>=.85))
        comparison(item['id'],old,new)
        # Fixed 24px grid of edge-bearing source templates, +/-12px exhaustive translation.
        pp=[]
        for py in range(cy+12,ey-11,24):
            for px in range(cx+12,ex-11,24):
                template=a[py-12:py+13,px-12:px+13]
                if float(template.std()) < 3:
                    continue
                search=b[py-24:py+25,px-24:px+25]
                _,score,_,loc=cv2.minMaxLoc(cv2.matchTemplate(search,template,cv2.TM_CCOEFF_NORMED))
                dx,dy=loc[0]-12,loc[1]-12
                pp.append(dict(point=[px,py],displacement=[dx,dy],distance=float(np.hypot(dx,dy)),correlation=score,reliable=score>=.6,within4px=bool(np.hypot(dx,dy)<=4)))
        reliable=[p for p in pp if p['reliable']]
        probes.append(dict(id=item['id'],probes=pp,reliable=len(reliable),uncertain=len(pp)-len(reliable),over4px=sum(not p['within4px'] for p in reliable),
                           wholeContourVerified=False))
    lava_box=LAVA_BOX
    x,y,ex,ey=lava_box
    ref=np.array(Image.fromarray(source[y:ey,x:ex]).resize(((ex-x)*2,(ey-y)*2),Image.Resampling.LANCZOS))
    comparison('lava-bank',crop(before,lava_box),crop(shipping,lava_box),ref)
    Image.fromarray(shipping).resize((1920,1280),Image.Resampling.LANCZOS).save(OUT/'overview.jpg',quality=93,subsampling=0)
    diff=np.any(shipping!=before,axis=2)
    outside=mask==0
    master_diff=np.any(master!=before,axis=2)
    write('sharpness.json',dict(method='Mean squared grayscale Laplacian ksize1 on decoded q90 2x pixels. Core vs context ring (48 map px; 64 for missing q22). Fixed masks; generated detail gain recorded per region; no synthetic noise. Content differs across ring: diagnostic, not perceptual proof.',threshold=.85,regions=sharp))
    write('structure.json',dict(method='DoG sigma1.5/6 at map1x; fixed grid25x25 templates; +/-12 NCC, confidence>=.6. Includes all failures and uncertain points. Texture correspondence cannot certify semantic contours.',thresholdPx1x=4,wholeStructureWithin4pxVerified=False,regions=probes))
    write('verification.json',dict(chunks=len(list((OUT/'v8').glob('r*-c*.webp'))),fullPx=list(FULL),masterChangedOutsideMask=int(np.count_nonzero(master_diff & outside)),
                                  decodedChangedOutsideMask=int(np.count_nonzero(diff & outside)),decodedChangedInsideMask=int(np.count_nonzero(diff & ~outside)),
                                  outsideMaxRGBError=int(np.abs(shipping.astype(np.int16)-before.astype(np.int16))[outside].max()),
                                  all16SharpnessAtLeast85Percent=all(v['atLeast85Percent'] for v in sharp),inGameTested=False,visualAcceptanceVerified=False,regions=records))
    print(json.dumps(dict(sharpnessPass=sum(v['atLeast85Percent'] for v in sharp),regions=len(sharp),structureReliable=sum(p['reliable'] for p in probes),structureOver4px=sum(p['over4px'] for p in probes),outsideDecodedChanged=int(np.count_nonzero(diff & outside))),indent=2))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('action',choices=['prepare','build']);parser.add_argument('--lossless',action='store_true');args=parser.parse_args()
    prepare() if args.action=='prepare' else build(args.lossless)
