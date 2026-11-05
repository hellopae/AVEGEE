"""Offline registration/composition and measurements. No generation or source mutations.
Run from repo root: python3 docs/art-reviews/2026-11-05-z1-v5-plaza-detail/scripts/assemble.py
Dependencies: Pillow, numpy, OpenCV. Native images are saved losslessly; no sharpening.
"""
from pathlib import Path
import json, shutil
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

O = Path(__file__).resolve().parents[1]
P = Path('/Users/agapae/agapae-work/.codex-worktrees/20261105T020514Z-5d66c53d/docs/art-reviews/2026-11-05-z1-v5-hd')
MANIFEST = json.loads((O/'generation-prompts.json').read_text())
TILES = json.loads((O/'inputs/tiles.json').read_text())
TILES.append(dict(id='t31', core=[0,341,342,342], context=[-64,277,470,470]))
SCALE_X, SCALE_Y = 4915/3840, 3277/2560
GAME = 2.8/SCALE_X
REG = []
IMAGES = {}
for tile in TILES:
    name=tile['id']; folder=O/('tile-3x3' if name=='t31' else 'tiles-2x2')
    rawpath=folder/f'{name}-native.webp'
    if not rawpath.exists():
        original=next(p['nativeFile'] for p in MANIFEST['generations'] if p['id']==name)
        Image.open(original).convert('RGB').save(rawpath,lossless=True,method=6)
    raw=Image.open(rawpath).convert('RGB'); target=Image.open(O/f'inputs/{name}-v5.webp').convert('RGB')
    pilot=Image.open(O/f'inputs/{name}-pilot.webp').convert('RGB')
    n=target.width; new=np.array(raw.resize((n,n),Image.Resampling.LANCZOS))
    sift=cv2.SIFT_create(nfeatures=8000,contrastThreshold=.015)
    gnew=cv2.cvtColor(new,cv2.COLOR_RGB2GRAY); k1,d1=sift.detectAndCompute(gnew,None)
    candidates=[]
    for label,ref in [('v5',target),('pilot',pilot)]:
        k0,d0=sift.detectAndCompute(cv2.cvtColor(np.array(ref),cv2.COLOR_RGB2GRAY),None)
        good=[a for a,b in cv2.BFMatcher().knnMatch(d1,d0,k=2) if a.distance<.74*b.distance]
        if len(good)<6: continue
        src=np.float32([k1[m.queryIdx].pt for m in good]); dst=np.float32([k0[m.trainIdx].pt for m in good])
        matrix,ok=cv2.estimateAffinePartial2D(src,dst,method=cv2.RANSAC,ransacReprojThreshold=2.5,maxIters=10000)
        if matrix is None or not .94<np.linalg.det(matrix[:,:2])<1.06: continue
        residual=np.linalg.norm(cv2.transform(src[None],matrix)[0]-dst,axis=1)
        candidates.append((int(ok.sum()),label,matrix,len(good),residual[ok[:,0]>0]))
    if not candidates: raise RuntimeError(f'No reliable registration for {name}')
    inliers,reference,matrix,matches,residual=max(candidates,key=lambda c:c[0])
    # Warp the native file directly to 2x map coordinates: avoid downsample/upscale cycle.
    scale=np.diag([n/raw.width,n/raw.height,1.]); affine=np.vstack([matrix,[0,0,1]])
    outscale=3 if name=='t31' else 2
    warp=(np.diag([outscale,outscale,1])@affine@scale)[:2]
    aligned=cv2.warpAffine(np.array(raw),warp,(n*outscale,n*outscale),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REFLECT)
    # Correct broad lighting only, using the already cleared pilot. Never unsharp mask.
    old=np.array(pilot.resize((n*outscale,n*outscale),Image.Resampling.LANCZOS),dtype=np.float32)
    delta=cv2.GaussianBlur(old,(0,0),35*outscale)-cv2.GaussianBlur(aligned.astype(np.float32),(0,0),35*outscale)
    aligned=np.uint8(np.clip(aligned.astype(np.float32)+.8*delta,0,255))
    # Registered arrays are assembled in memory; raw lossless tiles + affine are archived.
    IMAGES[name]=aligned
    rec=dict(id=name,corePx1x=tile['core'],contextPx1x=tile['context'],nativeSize=list(raw.size),
        nativePxPerMapPixel=raw.width/n,nativePxPerWorldUnit=raw.width/n*SCALE_X,
        registrationReference=reference,siftMatches=matches,siftInliers=inliers,affine=matrix.tolist(),
        inlierResidualPx1x=dict(median=float(np.median(residual)),p95=float(np.percentile(residual,95)),max=float(max(residual))),
        localWarpApplied=False,semanticStructureVerified=False)
    REG.append(rec)

def seam_blend(left,right,overlap=256):
    """Minimum squared-color-difference seam; 8 output-pixel feather on either side."""
    a=left[:,-overlap:].astype(np.float32); b=right[:,:overlap].astype(np.float32)
    cost=np.mean((a-b)**2,axis=2)
    cost=cv2.GaussianBlur(cost,(5,5),0)
    h,w=cost.shape; dp=cost.copy(); back=np.zeros((h,w),np.int16)
    for y in range(1,h):
        prev=np.pad(dp[y-1],(1,1),constant_values=np.inf)
        choices=np.stack([prev[:w],prev[1:w+1],prev[2:]])
        choice=np.argmin(choices,axis=0)-1
        back[y]=choice;dp[y]+=choices[choice+1,np.arange(w)]
    path=np.zeros(h,np.int32);path[-1]=int(np.argmin(dp[-1]))
    for y in range(h-1,0,-1): path[y-1]=path[y]+back[y,path[y]]
    t=np.clip((np.arange(w)[None,:]-path[:,None]+8)/16,0,1)
    t=t*t*(3-2*t)
    mix=np.uint8(np.clip(a*(1-t[:,:,None])+b*t[:,:,None],0,255))
    return np.concatenate([left[:,:-overlap],mix,right[:,overlap:]],axis=1),path

top,sv1=seam_blend(IMAGES['q11'],IMAGES['q12'])
bottom,sv2=seam_blend(IMAGES['q21'],IMAGES['q22'])
atlas,sh=seam_blend(top.transpose(1,0,2),bottom.transpose(1,0,2))
atlas=atlas.transpose(1,0,2)[128:2176,128:2176]
Image.fromarray(atlas).save(O/'r2-c3-2x2.webp',lossless=True,method=6)
sample=Image.fromarray(IMAGES['t31']).crop((192,192,1218,1218))
sample.save(O/'tile-3x3/t31-core.webp',lossless=True,method=6)
(O/'registration.json').write_text(json.dumps(REG,indent=2))

# Identical engine zoom and fixed ROIs. Quantify terrain before overlaying identical sprites.
v5=Image.open(O/'inputs/v5-repaired.webp').convert('RGB')
pilot=Image.open(O/'inputs/pilot.webp').convert('RGB')
versions={'v5':(v5,1,(0,0)),'pilot':(pilot,2,(0,0)),
          '2x2':(Image.fromarray(atlas),2,(0,0)), '3x3':(sample,3,(0,341))}
def crop_version(name,box,game=GAME):
    im,scale,(ox,oy)=versions[name]
    b=[round((box[0]-ox)*scale),round((box[1]-oy)*scale),round((box[2]-ox)*scale),round((box[3]-oy)*scale)]
    return im.crop(b).resize((round((box[2]-box[0])*game),round((box[3]-box[1])*game)),Image.Resampling.LANCZOS)

def measure(im):
    gray=cv2.cvtColor(np.array(im),cv2.COLOR_RGB2GRAY).astype(np.float64)
    lap=float(cv2.Laplacian(gray,cv2.CV_64F,ksize=1).var())
    hp=gray-cv2.GaussianBlur(gray,(0,0),1.)
    # Radial FFT fraction: >0.25 cycles/device pixel. Window suppresses crop-edge leakage.
    centered=(gray-gray.mean())*np.outer(np.hanning(gray.shape[0]),np.hanning(gray.shape[1]))
    power=np.abs(np.fft.fft2(centered))**2
    fy=np.fft.fftfreq(gray.shape[0])[:,None];fx=np.fft.fftfreq(gray.shape[1])[None,:]
    freq=np.sqrt(fx*fx+fy*fy);high=(freq>=.25)
    return dict(laplacianVariance=lap,highPassMeanSquare=float(np.mean(hp**2)),
                fftHighFrequencyFraction=float(power[high].sum()/max(power.sum(),1e-12)))

rois={'common_plaza_cliff_stair':[0,341,342,683], 'plaza_stones':[100,80,440,330],
      'main_stair':[272,415,384,546], 'lower_paving':[555,585,825,735], 'full_chunk':[0,0,1024,1024]}
metrics={}
for label,box in rois.items():
    names=list(versions) if label=='common_plaza_cliff_stair' else ['v5','pilot','2x2']
    m={name:measure(crop_version(name,box)) for name in names}
    for name,values in m.items():
        values['ratioToV5']={k:values[k]/m['v5'][k] for k in ['laplacianVariance','highPassMeanSquare','fftHighFrequencyFraction']}
    metrics[label]=dict(rectPx1x=box,deviceSize=list(crop_version('v5',box).size),versions=m)
primary=metrics['common_plaza_cliff_stair']['versions']['2x2']['ratioToV5']['laplacianVariance']
report=dict(gameDevicePxPerWorldUnit=2.8,mapPxPerWorldUnit=[SCALE_X,SCALE_Y],devicePxPerMapPixel=GAME,
    method='Pillow Lanczos to identical engine zoom; grayscale Laplacian variance ksize=1, Gaussian residual sigma=1, Hann-window FFT energy >=0.25 cycles/device-pixel; no sharpening applied.',
    primaryRoi='common_plaza_cliff_stair',primaryRatio2x2ToV5=primary,threshold=1.8,meetsNumericalThreshold=primary>=1.8,
    caveats=['Texture/contrast and object removal affect these metrics; numerical ratio alone does not prove better art or semantic structure.',
             '3x3 is one 342x342 map-pixel core only; never extrapolated to the whole chunk.',
             'Units use engine world coordinates (4915 map px / 3840 world units); pixel-space ratio also recorded.',
             'Measurements use decoded lossless output, before identical tree overlays; fixed ROIs include previously occluded surfaces.'],rois=metrics)
(O/'sharpness.json').write_text(json.dumps(report,indent=2))

# Copy and render only pilot tree sprites intersecting this chunk; record original placements.
if (O/'inputs/sprites.json').exists():
    sprite_records=json.loads((O/'inputs/sprites.json').read_text())
else:
    sprite_records=[]
    for s in json.loads((P/'sprites.json').read_text()):
        if 'tree' not in s['id']:continue
        x,y,w,h=s['rectWorld'];px=x*SCALE_X-2048;py=y*SCALE_Y-1024;pw=w*SCALE_X;ph=h*SCALE_Y
        if px+pw<0 or py+ph<0 or px>=1024 or py>=1024:continue
        dest=O/'inputs/sprites'/Path(s['src']).name;dest.parent.mkdir(exist_ok=True)
        if not dest.exists():shutil.copyfile(P/s['src'],dest)
        sprite_records.append(dict(id=s['id'],src=str(dest.relative_to(O)),rectPx1x=[px,py,pw,ph],footWorld=s['footWorld'],placementVerified=False))
(O/'inputs/sprites.json').write_text(json.dumps(sprite_records,indent=2))

def with_trees(name,box):
    im=crop_version(name,box).convert('RGBA')
    for s in sorted(sprite_records,key=lambda s:s['footWorld'][1]):
        x,y,w,h=s['rectPx1x']
        sprite=Image.open(O/s['src']).convert('RGBA').resize((round(w*GAME),round(h*GAME)),Image.Resampling.LANCZOS)
        im.alpha_composite(sprite,(round((x-box[0])*GAME),round((y-box[1])*GAME)))
    return im.convert('RGB')

fontpath='/System/Library/Fonts/Supplemental/Arial.ttf'
font=ImageFont.truetype(fontpath,22)
def panel_row(box,factor,title):
    panels=[with_trees(name,box) for name in versions]
    if factor!=1:panels=[im.resize((im.width*factor,im.height*factor),Image.Resampling.NEAREST) for im in panels]
    w,h=panels[0].size; out=Image.new('RGB',(w*4+48,h+90),'#161a22');d=ImageDraw.Draw(out)
    d.text((12,8),title,font=font,fill='white')
    for i,(name,im) in enumerate(zip(versions,panels)):
        d.text((12+i*(w+12),43),name+' + same pilot trees',font=font,fill='white');out.paste(im,(i*(w+12),90))
    return out

rows=[panel_row(rois['common_plaza_cliff_stair'],1,'Same crop at 2.8 device px / engine world unit (view JPEG at 100%)'),
      panel_row([225,385,342,520],2,'Plaza edge / main stair: 200% of game zoom, nearest-neighbor enlargement')]
compare=Image.new('RGB',(max(r.width for r in rows),sum(r.height for r in rows)+24),'#161a22');y=0
for row in rows:compare.paste(row,(0,y));y+=row.height+12
compare.save(O/'compare-plaza.jpg',quality=94,subsampling=0)

# Full overview plus native-size center seam strips. Seam coordinates are explicitly marked outside art.
sheet=Image.new('RGB',(2200,1850),'#161a22');d=ImageDraw.Draw(sheet)
d.text((20,10),'2x2 assembled terrain; minimum-cost overlap seams, no sprite cover-up',font=font,fill='white')
sheet.paste(Image.fromarray(atlas).resize((1024,1024)),(20,55))
for title,box,y in [('Vertical tile boundary',(896,0,1152,2048),1100),('Horizontal tile boundary',(0,896,2048,1152),1455)]:
    strip=Image.fromarray(atlas).crop(box)
    if strip.height>strip.width:strip=strip.transpose(Image.Transpose.ROTATE_90)
    sheet.paste(strip,(20,y+40));d.text((20,y),title+' (2x map pixels, unscaled strip)',font=font,fill='white')
# Mark actual adaptive seam traces on a separate preview, not on comparison crops.
preview=Image.fromarray(atlas).resize((1024,1024));pd=ImageDraw.Draw(preview)
for path,offset in [(sv1,0),(sv2,512)]:
    pts=[((896+int(path[i])-128)/2,(i-128)/2+offset) for i in range(128,min(len(path),1152),4)]
    pd.line(pts,fill='#00e7ff',width=1)
pts=[((i-128)/2,(896+int(sh[i])-128)/2) for i in range(128,min(len(sh),2176),4)]
pd.line(pts,fill='#00e7ff',width=1)
sheet.paste(preview,(1120,55));d.text((1120,10),'Cyan = actual overlap cut paths',font=font,fill='white')
sheet.save(O/'seam-check.jpg',quality=90,subsampling=0)
print(json.dumps(dict(registration=REG,sharpnessRatio=primary,spriteCount=len(sprite_records),compareSize=list(compare.size)),indent=2))
