"""Offline native registration/assembly and diagnostics. No generation, sharpening or runtime edits.
Derived from bc9dc4dd approved plaza pipeline: partial affine, sigma35 colour field,
minimum-cost overlap seam, 8 output-pixel feather. Quality measurements are not acceptance gates.
"""
from pathlib import Path
import json, math, argparse
import cv2
import numpy as np
from PIL import Image,ImageDraw
O=Path(__file__).resolve().parents[1]
cv2.setNumThreads(2)
cv2.setRNGSeed(234)
def dump(p,d):p.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')

def seam_blend(left,right,overlap=256):
    a=left[:,-overlap:].astype(np.float32);b=right[:,:overlap].astype(np.float32)
    cost=cv2.GaussianBlur(np.mean((a-b)**2,axis=2),(5,5),0);h,w=cost.shape
    dp=cost.copy();back=np.zeros((h,w),np.int16)
    for y in range(1,h):
        prev=np.pad(dp[y-1],(1,1),constant_values=np.inf)
        choices=np.stack([prev[:w],prev[1:w+1],prev[2:]])
        choice=np.argmin(choices,axis=0)-1;back[y]=choice
        dp[y]+=choices[choice+1,np.arange(w)]
    path=np.zeros(h,np.int32);path[-1]=int(np.argmin(dp[-1]))
    for y in range(h-1,0,-1):path[y-1]=path[y]+back[y,path[y]]
    t=np.clip((np.arange(w)[None,:]-path[:,None]+8)/16,0,1);t=t*t*(3-2*t)
    mix=np.uint8(np.clip(a*(1-t[:,:,None])+b*t[:,:,None],0,255))
    return np.concatenate([left[:,:-overlap],mix,right[:,overlap:]],axis=1),path

# Fixed exposed contour/stair/bridge/water landmarks, selected from baseline before measurement.
LANDMARKS={
 'r2-c4':[(212,262),(214,303),(320,344),(439,392),(588,468),(844,270),(936,278),(833,357),(925,368),(822,402),(756,556),(641,530),(759,658),(511,687),(906,963),(945,940),(975,942),(360,166),(380,318),(215,571)],
 'r2-c5':[(68,519),(184,510),(89,628),(218,638),(74,273),(224,263),(389,218),(167,936),(188,986),(124,882),(412,911),(601,716),(741,917),(531,315),(625,401),(580,161)],
 'r3-c1':[(678,167),(836,155),(950,144),(690,550),(819,537),(459,244),(663,288),(926,259),(306,206),(372,371),(500,468),(823,436),(786,814),(925,823),(120,709),(428,872)],
 'r3-c2':[(65,173),(217,153),(403,128),(642,128),(899,153),(986,136),(504,453),(700,476),(925,514),(616,602),(927,660),(965,746),(868,843),(712,975),(328,775),(270,949)],
}
def band(im):
    g=cv2.cvtColor(im,cv2.COLOR_RGB2GRAY).astype(np.float32)
    return cv2.GaussianBlur(g,(0,0),1.5)-cv2.GaussianBlur(g,(0,0),6)

def diagnostics(name,old,new,d):
    w,h=old.size; small=np.array(new.resize(old.size,Image.Resampling.LANCZOS))
    a,b=band(np.array(old)),band(small);records=[];radius=24;search=12
    for i,(x,y) in enumerate(LANDMARKS[name]):
        scores=cv2.matchTemplate(b[y-radius-search:y+radius+search+1,x-radius-search:x+radius+search+1],a[y-radius:y+radius+1,x-radius:x+radius+1],cv2.TM_CCOEFF_NORMED)
        _,score,_,loc=cv2.minMaxLoc(scores);dx,dy=loc[0]-search,loc[1]-search
        records.append(dict(id=f'contour-{i+1}',sourcePx1x=[x,y],displacementPx1x=[dx,dy],distancePx1x=math.hypot(dx,dy),normalizedCorrelation=score,reliable=score>=.6))
    reliable=[r for r in records if r['reliable']]
    structure=dict(method='Fixed 49x49 DoG sigma1.5/6 templates, search +/-12 map pixels; independent of SIFT',
        thresholdPx1x=4,totalProbes=len(records),reliableProbes=len(reliable),
        maxReliableDisplacementPx1x=max((r['distancePx1x'] for r in reliable),default=None),
        uncertainProbes=len(records)-len(reliable),semanticStructureVerified=False,
        limitation='Sparse local correspondences do not certify every contour or stair count. All uncertain probes retained; repeated stone/water patterns may be ambiguous.',probes=records)
    dump(d/'structure.json',structure)
    check=Image.new('RGB',(w*2+24,h+40),'#171b24');check.paste(old,(0,40));check.paste(Image.fromarray(small),(w+24,40));dr=ImageDraw.Draw(check)
    dr.text((8,8),'Master | assembled (green <=4px, red >4px, yellow uncertain)',fill='white')
    for i,r in enumerate(records):
        x,y=r['sourcePx1x'];dx,dy=r['displacementPx1x'];color='yellow' if not r['reliable'] else ('lime' if r['distancePx1x']<=4 else 'red')
        for ox,px,py in [(0,x,y),(w+24,x+dx,y+dy)]:
            dr.ellipse((ox+px-4,40+py-4,ox+px+4,40+py+4),outline=color,width=2);dr.text((ox+px+5,40+py),str(i+1),fill=color)
    check.save(d/'structure-check.jpg',quality=50,subsampling=2,optimize=True)
    scaleX=2.8/(4915/3840);scaleY=2.8/(3277/2560)
    rois={'full_chunk':[0,0,w,h],'top_left':[0,0,(w+1)//2,512],
        'top_right':[(w+1)//2,0,w,512],'bottom_left':[0,512,(w+1)//2,h],'bottom_right':[(w+1)//2,512,w,h]}
    metrics={}
    for label,box in rois.items():
        size=(round((box[2]-box[0])*scaleX),round((box[3]-box[1])*scaleY));vals={}
        for v,im,k in [('master',old,1),('redraw',new,2)]:
            crop=im.crop(tuple(a*k for a in box)).resize(size,Image.Resampling.LANCZOS)
            gray=cv2.cvtColor(np.array(crop),cv2.COLOR_RGB2GRAY).astype(np.float64)
            vals[v]=dict(laplacianVariance=float(cv2.Laplacian(gray,cv2.CV_64F,ksize=1).var()),highPassMeanSquare=float(np.mean((gray-cv2.GaussianBlur(gray,(0,0),1))**2)))
        metrics[label]=dict(rectPx1x=box,deviceSize=list(size),versions=vals,laplacianRatio=vals['redraw']['laplacianVariance']/vals['master']['laplacianVariance'])
    sharp=dict(method='Fixed ROIs, Pillow Lanczos to same 2.8 device px/world unit; grayscale Laplacian ksize1. No sharpening.',threshold=10,primaryRoi='full_chunk',primaryRatio=metrics['full_chunk']['laplacianRatio'],rois=metrics,
        limitation='Edge/texture energy depends on material/contrast/removal; ratio does not certify art quality.')
    dump(d/'sharpness.json',sharp)
    make_compare(name,old,new,d)
    return structure,sharp

def make_compare(name,old,new,d):
    w,h=old.size;scaleX=2.8/(4915/3840);scaleY=2.8/(3277/2560)
    # Comparison crops retain exact game zoom while avoiding a redundant full-frame JPEG.
    boxes=[(32,96,352,416),(max(32,w-352),440,w-32,760),(180,672,500,992)]
    panels=[]
    for box in boxes:
        size=(round((box[2]-box[0])*scaleX),round((box[3]-box[1])*scaleY))
        row=Image.new('RGB',(size[0]*2+24,size[1]+40),'#171b24');dr=ImageDraw.Draw(row)
        for i,(label,im,k) in enumerate([('Master',old,1),('Redraw',new,2)]):
            x=i*(size[0]+24);row.paste(im.crop(tuple(v*k for v in box)).resize(size,Image.Resampling.LANCZOS),(x,40))
            dr.text((x+8,12),label+' | 2.8 device px/world | '+str(box),fill='white')
        panels.append(row)
    sheet=Image.new('RGB',(max(p.width for p in panels),sum(p.height for p in panels)),'#171b24');y=0
    for panel in panels:sheet.paste(panel,(0,y));y+=panel.height
    sheet.save(d/f'{name}-compare.jpg',quality=78,subsampling=2,optimize=True)

def assemble(name):
    d=O/name;tiles=json.loads((d/'inputs/tiles.json').read_text());images={};reg=[]
    for tile in tiles:
        tid=tile['id'];raw=Image.open(d/f'{tid}-native.webp').convert('RGB');ref=Image.open(d/f'inputs/{tid}-master.webp').convert('RGB');w,h=ref.size
        small=np.array(raw.resize(ref.size,Image.Resampling.LANCZOS));sift=cv2.SIFT_create(nfeatures=8000,contrastThreshold=.015)
        k1,d1=sift.detectAndCompute(cv2.cvtColor(small,cv2.COLOR_RGB2GRAY),None);k0,d0=sift.detectAndCompute(cv2.cvtColor(np.array(ref),cv2.COLOR_RGB2GRAY),None)
        good=[a for a,b in cv2.BFMatcher().knnMatch(d1,d0,k=2) if a.distance<.74*b.distance]
        if len(good)<6:raise RuntimeError(f'{name}/{tid}: insufficient matches ({len(good)})')
        src=np.float32([k1[m.queryIdx].pt for m in good]);dst=np.float32([k0[m.trainIdx].pt for m in good])
        matrix,ok=cv2.estimateAffinePartial2D(src,dst,method=cv2.RANSAC,ransacReprojThreshold=2.5,maxIters=10000)
        if matrix is None or not .9<np.linalg.det(matrix[:,:2])<1.1:raise RuntimeError(f'{name}/{tid}: unreliable affine')
        res=np.linalg.norm(cv2.transform(src[None],matrix)[0]-dst,axis=1)[ok[:,0]>0]
        native=np.vstack([matrix,[0,0,1]])@np.diag([w/raw.width,h/raw.height,1])
        aligned=cv2.warpAffine(np.array(raw),(np.diag([2,2,1])@native)[:2],(w*2,h*2),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REFLECT)
        old=np.array(ref.resize((w*2,h*2),Image.Resampling.LANCZOS),dtype=np.float32)
        mask=np.ones((h*2,w*2),np.float32)
        for rem in tile['removal']:
            x,y,rw,rh=rem['rectInInputPx'];mask[max(0,(y-64)*2):min(h*2,(y+rh+64)*2),max(0,(x-64)*2):min(w*2,(x+rw+64)*2)]=0
        mask=cv2.GaussianBlur(mask,(0,0),20)
        delta=cv2.GaussianBlur(old,(0,0),70)-cv2.GaussianBlur(aligned.astype(np.float32),(0,0),70)
        images[tid]=np.uint8(np.clip(aligned.astype(np.float32)+.8*delta*mask[:,:,None],0,255))
        glob=native.copy();glob[:2,2]+=tile['contextMasterPx1x'][:2]
        reg.append(dict(id=tid,coreMasterPx1x=tile['coreMasterPx1x'],contextMasterPx1x=tile['contextMasterPx1x'],overlapPx1x=64,nativeSize=list(raw.size),
            nativePixelToContextPx1x=native[:2].tolist(),nativePixelToMasterPx1x=glob[:2].tolist(),resizedNativeToContextAffine=matrix.tolist(),
            siftMatches=len(good),siftInliers=int(ok.sum()),inlierResidualPx1x=dict(median=float(np.median(res)),p95=float(np.percentile(res,95)),max=float(max(res))),localWarpApplied=False,semanticStructureVerified=False))
    top,sv1=seam_blend(images['q11'],images['q12']);bottom,sv2=seam_blend(images['q21'],images['q22'])
    atlas,sh=seam_blend(top.transpose(1,0,2),bottom.transpose(1,0,2));atlas=atlas.transpose(1,0,2)
    cx,cy=tiles[0]['coreMasterPx1x'][:2];ex,ey=tiles[0]['contextMasterPx1x'][:2]
    old=Image.open(d/'inputs/master.webp').convert('RGB');w,h=old.size;ox,oy=(cx-ex)*2,(cy-ey)*2
    atlas=atlas[oy:oy+h*2,ox:ox+w*2];assert atlas.shape==(h*2,w*2,3)
    new=Image.fromarray(atlas);new.save(d/f'{name}-2x.webp',lossless=True,method=6)
    dump(d/'registration.json',dict(chunk=name,coordinateFormat='rectangles [x,y,width,height], global master origin; affine native pixels to map1x',chunkMasterPx1x=[cx,cy,w,h],outputSize=[w*2,h*2],
        colorCorrection=dict(sigmaMapPx=35,gain=.8,excluded='removal survey boxes +64px',noSharpening=True),externalChunkBlend=False,tiles=reg))
    dump(d/'seams.json',dict(units='context-inclusive output2x before chunk cropping',verticalOverlapStart=images['q11'].shape[1]-256,horizontalOverlapStart=top.shape[0]-256,cropOffset=[ox,oy],q11_q12=sv1.tolist(),q21_q22=sv2.tolist(),top_bottom=sh.tolist(),featherHalfWidthOutputPx=8))
    sheet=Image.new('RGB',(w*2+24,1690),'#171b24');sheet.paste(new.resize((w,h)),(0,32));marked=new.resize((w,h));dr=ImageDraw.Draw(marked)
    vx=images['q11'].shape[1]-256;hy=top.shape[0]-256
    for path,offset in [(sv1,0),(sv2,512)]:dr.line([((vx+int(path[i])-ox)/2,(i-oy)/2+offset) for i in range(oy,len(path)-128,4)],fill='cyan',width=1)
    dr.line([((i-ox)/2,(hy+int(sh[i])-oy)/2) for i in range(ox,len(sh)-max(0,top.shape[1]-ox-w*2),4)],fill='cyan',width=1)
    sheet.paste(marked,(w+24,32));draw=ImageDraw.Draw(sheet);draw.text((8,8),'Assembly | actual adaptive seam paths (cyan), offline',fill='white')
    cut=(w+1)//2*2
    strip=new.crop((max(0,cut-128),0,min(w*2,cut+128),h*2)).transpose(Image.Transpose.ROTATE_90)
    sheet.paste(strip,(0,1090));sheet.paste(new.crop((0,896,w*2,1152)),(0,1400));sheet.save(d/'seam-check.jpg',quality=50,subsampling=2,optimize=True)
    structure,sharp=diagnostics(name,old,new,d)
    print(json.dumps(dict(chunk=name,nativeSizes=[r['nativeSize'] for r in reg],inliers=[r['siftInliers'] for r in reg],sharpness=sharp['primaryRatio'],structureMax=structure['maxReliableDisplacementPx1x'],reliable=structure['reliableProbes'],total=structure['totalProbes'])),flush=True)

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('chunks',nargs='*',default=['r2-c4','r2-c5','r3-c1','r3-c2']);args=ap.parse_args()
    for name in args.chunks:assemble(name)
