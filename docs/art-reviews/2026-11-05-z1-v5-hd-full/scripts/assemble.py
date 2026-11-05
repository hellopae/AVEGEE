"""Offline adaptation of approved plaza assemble.py: SIFT partial affine, native warp,
35px broad color correction, min-cost seams with 8px feather. No generation/sharpening.
Run from any directory. Inputs and outputs stay in this review folder.
"""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image,ImageDraw,ImageFont
O=Path(__file__).resolve().parents[1]
TILES=json.loads((O/'tiles.json').read_text())
GAME=2.8/(4915/3840)
FONT=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',22)

def seam_blend(left,right,overlap=256):
    a=left[:,-overlap:].astype(np.float32);b=right[:,:overlap].astype(np.float32)
    cost=cv2.GaussianBlur(np.mean((a-b)**2,axis=2),(5,5),0)
    h,w=cost.shape;dp=cost.copy();back=np.zeros((h,w),np.int16)
    for y in range(1,h):
        prev=np.pad(dp[y-1],(1,1),constant_values=np.inf)
        choices=np.stack([prev[:w],prev[1:w+1],prev[2:]])
        choice=np.argmin(choices,axis=0)-1
        back[y]=choice;dp[y]+=choices[choice+1,np.arange(w)]
    path=np.zeros(h,np.int32);path[-1]=int(np.argmin(dp[-1]))
    for y in range(h-1,0,-1):path[y-1]=path[y]+back[y,path[y]]
    t=np.clip((np.arange(w)[None,:]-path[:,None]+8)/16,0,1);t=t*t*(3-2*t)
    mix=np.uint8(np.clip(a*(1-t[:,:,None])+b*t[:,:,None],0,255))
    return np.concatenate([left[:,:-overlap],mix,right[:,overlap:]],axis=1),path

def measure(im):
    g=cv2.cvtColor(np.array(im),cv2.COLOR_RGB2GRAY).astype(np.float64)
    return dict(laplacianVariance=float(cv2.Laplacian(g,cv2.CV_64F,ksize=1).var()),highPassMeanSquare=float(np.mean((g-cv2.GaussianBlur(g,(0,0),1))**2)))

def register(tile,d):
    name=tile['id'];raw=Image.open(d/f'{name}-native.webp').convert('RGB')
    ref=Image.open(d/f'inputs/{name}-v5.webp').convert('RGB');w,h=ref.size
    small=np.array(raw.resize((w,h),Image.Resampling.LANCZOS))
    sift=cv2.SIFT_create(nfeatures=8000,contrastThreshold=.015)
    k1,d1=sift.detectAndCompute(cv2.cvtColor(small,cv2.COLOR_RGB2GRAY),None)
    k0,d0=sift.detectAndCompute(cv2.cvtColor(np.array(ref),cv2.COLOR_RGB2GRAY),None)
    good=[a for a,b in cv2.BFMatcher().knnMatch(d1,d0,k=2) if a.distance<.74*b.distance]
    if len(good)<6:raise RuntimeError(f'{d.name}/{name}: insufficient SIFT matches')
    src=np.float32([k1[m.queryIdx].pt for m in good]);dst=np.float32([k0[m.trainIdx].pt for m in good])
    matrix,ok=cv2.estimateAffinePartial2D(src,dst,method=cv2.RANSAC,ransacReprojThreshold=2.5,maxIters=10000)
    # q21 has a measurable global ~6% framing scale drift after prop removal.
    # Permit affine registration to undo this; independent structure probes below
    # must still report the final displacement. Never use a local deformation.
    if matrix is None or int(ok.sum())<12 or not .8<np.linalg.det(matrix[:,:2])<1.2:raise RuntimeError(f'{d.name}/{name}: unreliable registration')
    residual=np.linalg.norm(cv2.transform(src[None],matrix)[0]-dst,axis=1)[ok[:,0]>0]
    scale=np.diag([w/raw.width,h/raw.height,1.]);affine=np.vstack([matrix,[0,0,1]])
    native_to_context=affine@scale
    cx,cy,_,_=tile['contextPx1x'];native_to_map=np.array([[1,0,cx],[0,1,cy],[0,0,1.]])@native_to_context
    warp=(np.diag([2,2,1])@native_to_context)[:2]
    aligned=cv2.warpAffine(np.array(raw),warp,(w*2,h*2),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REFLECT)
    old=np.array(ref.resize((w*2,h*2),Image.Resampling.LANCZOS),dtype=np.float32)
    delta=cv2.GaussianBlur(old,(0,0),70)-cv2.GaussianBlur(aligned.astype(np.float32),(0,0),70)
    # Do not paint broad colors/shadows of removed objects back into restored ground.
    remove=np.zeros((h*2,w*2),np.float32)
    for a in json.loads((d/'removed.json').read_text())['requestedObjects']:
        x,y,rw,rh=a['rectMapPx1x'];x-=cx;y-=cy
        x0=max(0,round(x*2));y0=max(0,round(y*2));x1=min(w*2,round((x+rw)*2));y1=min(h*2,round((y+rh)*2))
        if x1>x0 and y1>y0:remove[y0:y1,x0:x1]=1
    strength=1-cv2.GaussianBlur(remove,(0,0),70)
    # The source still contains the removed large ground props. Inventory boxes
    # are approximate and cannot suppress all broad object shadows. For these
    # two dry-ground tiles retain ImageGen lighting rather than transfer ghosts.
    source_color_applied=not (d.name=='r3-c2' and name in ['q21','q22'])
    if not source_color_applied:strength[:]=0
    aligned=np.uint8(np.clip(aligned.astype(np.float32)+.8*delta*strength[:,:,None],0,255))
    rec=dict(id=name,corePx1x=tile['corePx1x'],contextPx1x=tile['contextPx1x'],coreChunkPx1x=tile['coreChunkPx1x'],
        coreInContextPx1x=[64,64,512,512],overlapPx1x=dict(left=64,top=64,right=64,bottom=64),nativeSize=list(raw.size),
        nativePxPerMapPixel=raw.width/w,affine=matrix.tolist(),affineConvention='resized native (640x640) -> context-local map 1x',
        nativeToContextPx1x=native_to_context[:2].tolist(),nativeToMapPx1x=native_to_map[:2].tolist(),
        siftMatches=len(good),siftInliers=int(ok.sum()),inlierResidualPx1x=dict(median=float(np.median(residual)),p95=float(np.percentile(residual,95)),max=float(max(residual))),
        localWarpApplied=False,semanticStructureVerified=False,
        sourceColorCorrectionApplied=source_color_applied,
        colorCorrection='0.8*(Gaussian(source, sigma=35 map px)-Gaussian(aligned,sigma=35)); attenuated inside blurred inventory removal rectangles; disabled on r3-c2 lower tiles because source retains large removed props and shadows')
    return aligned,rec

for chunk in ['r3-c2','r2-c4']:
    d=O/chunk;images={};records=[]
    for tile in [t for t in TILES if t['chunk']==chunk]:
        images[tile['id']],rec=register(tile,d);records.append(rec)
    top,sv1=seam_blend(images['q11'],images['q12']);bottom,sv2=seam_blend(images['q21'],images['q22'])
    atlas,sh=seam_blend(top.transpose(1,0,2),bottom.transpose(1,0,2));atlas=atlas.transpose(1,0,2)[128:2176,128:2176]
    new=Image.fromarray(atlas);new.save(d/f'{chunk}-2x.webp',lossless=True,method=6)
    (d/'registration.json').write_text(json.dumps(dict(coordinateSystem='global master map pixels, 1x, xywh rectangles',chunk=chunk,chunkRectPx1x=[records[0]['corePx1x'][0],records[0]['corePx1x'][1],1024,1024],tiles=records,composition=dict(method='minimum squared RGB cost seam / 8 output px feather',overlapOutputPx=256,outerCropOutputPx=[128,128,2048,2048],neighborChunkBlendingApplied=False)),indent=2))
    (d/'seams.json').write_text(json.dumps(dict(coordinates='2x extended chunk before 128px outer crop; vertical starts x=1024, horizontal starts y=1024',verticalTop=sv1.tolist(),verticalBottom=sv2.tolist(),horizontal=sh.tolist()),separators=(',',':')))
    old=Image.open(d/'inputs/v5-repaired.webp').convert('RGB');size=(round(1024*GAME),round(1024*GAME))
    oldgame=old.resize(size,Image.Resampling.LANCZOS);newgame=new.resize(size,Image.Resampling.LANCZOS)
    a,b=measure(oldgame),measure(newgame);ratio=b['laplacianVariance']/a['laplacianVariance']
    (d/'sharpness.json').write_text(json.dumps(dict(gameDevicePxPerWorldUnit=2.8,devicePxPerMapPixel=GAME,roiPx1x=[0,0,1024,1024],deviceSize=list(size),method='same fixed full chunk; Pillow Lanczos at game zoom, grayscale Laplacian variance ksize=1; no sharpening',v5=a,new=b,laplacianRatioToV5=ratio,threshold=10,meetsNumericalThreshold=ratio>=10,caveat='Texture energy, contrast and object removal affect ratio; it is not a resolution multiplier or semantic structure proof.'),indent=2))
    comp=Image.new('RGB',(size[0]*2+24,size[1]+64),'#161a22');draw=ImageDraw.Draw(comp)
    draw.text((12,12),f'{chunk}: v5 + repairs | new 2x; same 2.8 device px / world unit; open at 100%',font=FONT,fill='white')
    comp.paste(oldgame,(0,64));comp.paste(newgame,(size[0]+24,64));comp.save(d/f'{chunk}-compare.jpg',quality=88,subsampling=2)
    sheet=Image.new('RGB',(2130,1700),'#161a22');draw=ImageDraw.Draw(sheet)
    draw.text((16,12),f'{chunk}: full chunk / cyan seam paths; unscaled 2x seam strips below',font=FONT,fill='white')
    preview=new.resize((1024,1024));sheet.paste(preview,(16,55));marked=preview.copy();pd=ImageDraw.Draw(marked)
    for path,yoff in [(sv1,0),(sv2,512)]:
        pd.line([((1024+int(path[i])-128)/2,(i-128)/2+yoff) for i in range(128,1152,4)],fill='#00e7ff',width=1)
    pd.line([((i-128)/2,(1024+int(sh[i])-128)/2) for i in range(128,2176,4)],fill='#00e7ff',width=1)
    sheet.paste(marked,(1080,55))
    for y,box,title in [(1130,(896,0,1152,2048),'Vertical center overlap strip'),(1430,(0,896,2048,1152),'Horizontal center overlap strip')]:
        strip=new.crop(box)
        if strip.height>strip.width:strip=strip.transpose(Image.Transpose.ROTATE_90)
        draw.text((16,y-30),title,font=FONT,fill='white');sheet.paste(strip,(16,y))
    sheet.save(d/'seam-check.jpg',quality=90,subsampling=0)
    print(chunk,'Laplacian ratio',ratio,'SIFT inliers',[r['siftInliers'] for r in records],flush=True)
