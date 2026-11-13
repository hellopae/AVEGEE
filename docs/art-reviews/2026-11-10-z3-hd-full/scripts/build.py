"""Review-only west HD parts. Run from repository root; never installs game art.

prepare: source crops and mask evidence. finish: SIFT affine, seam and measurements.
Native images are drawn by the built-in ImageGen tool, never by this script.
"""
from pathlib import Path
import argparse, hashlib, json, re
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parents[1]
CHUNKS = ['r3-c3', 'r3-c4', 'r3-c5', 'r4-c1']
FULL = (4915, 3277)

def dump(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False)+'\n')

def master():
    result = Image.new('RGB', FULL)
    for p in (ROOT/'img/map-zone3/v1').glob('r*-c*.webp'):
        r,c = map(int, re.findall(r'\d+',p.stem))
        result.paste(Image.open(p), ((c-1)*1024,(r-1)*1024))
    return result

def layout(name):
    r,c = map(int,re.findall(r'\d+',name))
    x,y = (c-1)*1024,(r-1)*1024
    w,h = min(1024,FULL[0]-x),min(1024,FULL[1]-y)
    xs=[0,(w+1)//2,w]; ys=[0,(h+1)//2,h] if r!=4 else [0,h]
    parts=[]
    for j in range(len(ys)-1):
        for i in range(2):
            core=[x+xs[i],y+ys[j],x+xs[i+1],y+ys[j+1]]
            context=[max(0,core[0]-64),max(0,core[1]-64),min(FULL[0],core[2]+64),min(FULL[1],core[3]+64)]
            parts.append(dict(part=f'q{j+1}{i+1}',coreRectPx1x=core,contextRectPx1x=context))
    return [x,y,x+w,y+h],parts

def walkmask():
    text=(ROOT/'src/town-owner-walkmask-west.js').read_text()
    runs=json.loads(re.search(r'TOWN_OWNER_WALK_RUNS=(\[.*?\]);',text).group(1))
    a=np.zeros(480*320,np.uint8);p=0
    for i,n in enumerate(runs):
        if i%2: a[p:p+n]=255
        p+=n
    assert p==480*320
    return np.asarray(Image.fromarray(a.reshape(320,480)).resize(FULL,Image.Resampling.NEAREST))

def prepare():
    im=master();mask=walkmask(); plans={}
    for name in CHUNKS:
        folder=OUT/name;folder.mkdir(exist_ok=True)
        rect,parts=layout(name);plans[name]=dict(chunkRectPx1x=rect,parts=parts)
        for p in parts:
            im.crop(p['contextRectPx1x']).save(folder/(p['part']+'-source.webp'),lossless=True)
        x0,y0,x1,y1=rect
        a=np.asarray(im.crop(rect)).copy();m=mask[y0:y1,x0:x1]>0
        a[m]=(a[m]*.65+np.array([255,40,50])*.35).astype(np.uint8)
        Image.fromarray(a).save(folder/'walkmask-overlay.jpg',quality=88)
    dump(OUT/'layout.json',plans)
    # Engine tree IDs and source foot positions, checked against the owner mask.
    ts=(ROOT/'src/town-west-trees.js').read_text()
    points=json.loads(ts[ts.index('['):ts.rindex(']')+1]);objects=[]
    for i,p in enumerate(points):
        x,y=p['x']*FULL[0],p['y']*FULL[1]
        if not any(v['chunkRectPx1x'][0]-160<=x<v['chunkRectPx1x'][2]+160 and v['chunkRectPx1x'][1]-220<=y<v['chunkRectPx1x'][3]+64 for v in plans.values()):continue
        on=bool(mask[min(int(y),FULL[1]-1),min(int(x),FULL[0]-1)])
        in_context=any(v['chunkRectPx1x'][0]-64<=x<v['chunkRectPx1x'][2]+64 and v['chunkRectPx1x'][1]-64<=y<v['chunkRectPx1x'][3]+64 for v in plans.values())
        action='runtime-only' if on else 'keep-baked'
        reason='owner floor at foot; visual source has clear pavers at this foot, no matching baked cedar to erase' if on else 'nonwalkable snowbank; keep forest silhouette'
        if not in_context:action,reason='outside-scope','foot and trunk above every supplied context; no removal claimed in this run'
        objects.append(dict(id=f'west-tree-{i}',source='src/town-west-trees.js',footPx1x=[x,y],ownerWalkmaskAtFoot=on,action=action,reason=reason))
    for i,(x,y) in enumerate([[1710,1080],[2100,1080],[1788,1405],[2050,1405],[1790,1560],[2050,1560],[1770,2080],[2070,2080],[1770,2250],[2070,2250]]):
        px,py=x*FULL[0]/3840,y*FULL[1]/2560
        if any(v['chunkRectPx1x'][0]-64<=px<v['chunkRectPx1x'][2]+64 and v['chunkRectPx1x'][1]-64<=py<v['chunkRectPx1x'][3]+64 for v in plans.values()):
            objects.append(dict(id=f'hell-pillar-{i}',source='src/town-layout.js',footPx1x=[px,py],ownerWalkmaskAtFoot=bool(mask[int(py),int(px)]),action='runtime-only',reason='runtime sprite position; no separate matching baked torch visible in source; do not erase structural bridge posts'))
    objects += [dict(id='west-south-bridge-rails',action='keep-baked',reason='rails outside walking deck; deck and stair treads locked'),dict(id='west-river-bones',action='keep-baked',reason='skull and spine in nonwalkable water; preserve liquid base silhouette'),dict(id='west-lower-path-bones',action='keep-baked',reason='r3-c4 and r3-c5 lower paths have no owner walkmask cells; retain scenery bones'),dict(id='west-snowbank-forest',action='keep-baked',reason='forest on nonwalkable bank; distant scenery retained')]
    dump(OUT/'objects-inventory.json',dict(zone='west',scope=CHUNKS,master='img/map-zone3/v1/',repairs=False,coordinateSystem='full master pixels 1x; world 3840x2560',walkmask='src/town-owner-walkmask-west.js',objects=objects,limitations='Source-foot mask test is evidence, not a whole-object occlusion test. Compare overlays visually. Runtime sprites are not baked objects.'))

def register(source, native):
    """Fit native -> context 1x. Record both inlier and all-match residuals."""
    h,w=source.shape[:2];nh,nw=native.shape[:2]
    small=cv2.resize(native,(w,h),interpolation=cv2.INTER_AREA)
    sift=cv2.SIFT_create(nfeatures=7000,contrastThreshold=.015)
    ka,da=sift.detectAndCompute(cv2.cvtColor(small,cv2.COLOR_RGB2GRAY),None)
    kb,db=sift.detectAndCompute(cv2.cvtColor(source,cv2.COLOR_RGB2GRAY),None)
    if da is None or db is None: raise ValueError('No descriptors; retain native for manual registration')
    matches=[a for a,b in cv2.BFMatcher().knnMatch(da,db,k=2) if a.distance<.72*b.distance]
    if len(matches)<8: raise ValueError(f'Only {len(matches)} reliable matches')
    a=np.float32([ka[m.queryIdx].pt for m in matches]);b=np.float32([kb[m.trainIdx].pt for m in matches])
    cv2.setRNGSeed(234)
    mat,inside=cv2.estimateAffine2D(a,b,method=cv2.RANSAC,ransacReprojThreshold=3,maxIters=10000,confidence=.999,refineIters=20)
    if mat is None or inside.sum()<6:raise ValueError('Affine unsupported')
    residual=np.linalg.norm(cv2.transform(a[None],mat)[0]-b,axis=1);ok=inside.ravel().astype(bool)
    native_mat=mat@np.diag([w/nw,h/nh,1])
    coverage=cv2.warpAffine(np.ones((nh,nw),np.uint8),native_mat,(w,h),flags=cv2.INTER_NEAREST)
    stats=dict(matches=len(matches),inliers=int(ok.sum()),inlierResidualMaxPx1x=float(residual[ok].max()),inlierResidualP95Px1x=float(np.percentile(residual[ok],95)),allMatchResidualP95Px1x=float(np.percentile(residual,95)),contextCoverage=float(coverage.mean()))
    return native_mat,stats,a[ok],b[ok]

def cut_path(cost):
    """Minimum top-to-bottom RGB cost; steps -1,0,+1; exclude 10px rim."""
    cost=cost.copy();h,w=cost.shape
    rim=min(10,max(0,w//8));cost[:,:rim]=1e9;cost[:,w-rim:]=1e9
    acc=cost[0].copy();back=np.zeros((h,w),np.int8)
    for y in range(1,h):
        opts=np.stack([np.r_[1e12,acc[:-1]],acc,np.r_[acc[1:],1e12]])
        idx=opts.argmin(axis=0);back[y]=idx-1;acc=cost[y]+opts[idx,np.arange(w)]
    path=np.empty(h,np.int32);path[-1]=int(acc.argmin())
    for y in range(h-1,0,-1):path[y-1]=path[y]+back[y,path[y]]
    return path

def join(a,b,box_a,box_b,axis):
    x0,y0=max(box_a[0],box_b[0]),max(box_a[1],box_b[1]);x1,y1=min(box_a[2],box_b[2]),min(box_a[3],box_b[3])
    aa=a[y0:y1,x0:x1];bb=b[y0:y1,x0:x1]
    cost=cv2.GaussianBlur(np.mean((aa.astype(np.float32)-bb.astype(np.float32))**2,axis=2),(5,5),0)
    if axis=='y':cost=cost.T
    path=cut_path(cost);coords=np.arange(cost.shape[1])[None,:]
    t=np.clip((coords-path[:,None]+8)/16,0,1);alpha=t*t*(3-2*t)
    if axis=='y':alpha=alpha.T
    union=[min(box_a[0],box_b[0]),min(box_a[1],box_b[1]),max(box_a[2],box_b[2]),max(box_a[3],box_b[3])]
    out=a.copy();out[box_b[1]:box_b[3],box_b[0]:box_b[2]]=b[box_b[1]:box_b[3],box_b[0]:box_b[2]]
    out[y0:y1,x0:x1]=np.uint8(np.clip(aa*(1-alpha[:,:,None])+bb*alpha[:,:,None],0,255))
    return out,union,dict(axis=axis,overlapRectPx2x=[x0,y0,x1,y1],path=path.tolist(),meanOverlapRgbDifference=float(np.abs(aa.astype(float)-bb).mean()),featherPx2x=8)

def lap(im):
    return float(cv2.Laplacian(cv2.cvtColor(im,cv2.COLOR_RGB2GRAY),cv2.CV_64F).var())

def chunk_record(name,im):
    folder=OUT/name
    reg=json.loads((folder/'registration.json').read_text());chunk=reg['chunkRectPx1x']
    final=np.asarray(Image.open(folder/(name+'-2x.webp')))
    baseline=np.asarray(im.crop(chunk).resize((final.shape[1],final.shape[0]),Image.Resampling.LANCZOS))
    structure=json.loads((folder/'structure.json').read_text())
    return dict(chunk=name,state='drawn-needs-review',parts=len(reg['parts']),nativeSizes=[p['nativeSize'] for p in reg['parts']],outputSize=[final.shape[1],final.shape[0]],sharpness=dict(method='grayscale Laplacian variance at equal 2x size; baseline Lanczos from v1',baseline=lap(baseline),output=lap(final),ratio=lap(final)/lap(baseline),target=10),structureInlierMaxPx1x=structure['maxInlierResidualPx1x'],pending=['Claude structure/seam/style review'])

def finish():
    plans=json.loads((OUT/'layout.json').read_text());im=master();records=[]
    for name,plan in plans.items():
        folder=OUT/name;chunk=plan['chunkRectPx1x'];parts=plan['parts']
        missing=[p['part'] for p in parts if not (folder/(p['part']+'-native.webp')).exists()]
        if missing:
            records.append(dict(chunk=name,state='incomplete',missing=missing));continue
        # Resume packaging after interruption without refitting or repainting completed art.
        if (folder/'registration.json').exists() and (folder/(name+'-2x.webp')).exists():
            records.append(chunk_record(name,im));continue
        # Canvas includes the outer overlap; exported chunk is cropped only after joins.
        outer=[min(p['contextRectPx1x'][0] for p in parts),min(p['contextRectPx1x'][1] for p in parts),max(p['contextRectPx1x'][2] for p in parts),max(p['contextRectPx1x'][3] for p in parts)]
        cw,ch=(outer[2]-outer[0])*2,(outer[3]-outer[1])*2
        images=[];boxes=[];reg=[]
        for p in parts:
            native=np.asarray(Image.open(folder/(p['part']+'-native.webp')).convert('RGB'));source=np.asarray(Image.open(folder/(p['part']+'-source.webp')).convert('RGB'))
            mat,stats,a,b=register(source,native);r=p['contextRectPx1x'];box=[(r[0]-outer[0])*2,(r[1]-outer[1])*2,(r[2]-outer[0])*2,(r[3]-outer[1])*2]
            to_canvas=mat*2;to_canvas[:,2]+=box[:2]
            warped=cv2.warpAffine(native,to_canvas,(cw,ch),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REFLECT_101)
            images.append(warped);boxes.append(box)
            reg.append({**p,'nativeFile':p['part']+'-native.webp','nativeSize':[native.shape[1],native.shape[0]],'nativeToContextPx1x':mat.tolist(),'nativeToMasterPx1x':(mat+np.array([[0,0,r[0]],[0,0,r[1]]])).tolist(),'fit':stats})
            overlay=source.copy();down=cv2.warpAffine(native,mat,(source.shape[1],source.shape[0]),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REFLECT_101)
            overlay=cv2.addWeighted(overlay,.5,down,.5,0)
            for x,y in b:cv2.circle(overlay,(round(float(x)),round(float(y))),2,(0,255,60),1)
            Image.fromarray(overlay).save(folder/(p['part']+'-registration.jpg'),quality=85)
        top,top_box,s1=join(images[0],images[1],boxes[0],boxes[1],'x');seams=[s1]
        if len(parts)==4:
            bottom,bottom_box,s2=join(images[2],images[3],boxes[2],boxes[3],'x');joined,_,s3=join(top,bottom,top_box,bottom_box,'y');seams += [s2,s3]
        else:joined=top
        cx,cy=(chunk[0]-outer[0])*2,(chunk[1]-outer[1])*2;w,h=(chunk[2]-chunk[0])*2,(chunk[3]-chunk[1])*2
        final=joined[cy:cy+h,cx:cx+w]
        Image.fromarray(final).save(folder/(name+'-2x.webp'),lossless=True,method=6)
        baseline=np.asarray(im.crop(chunk).resize((w,h),Image.Resampling.LANCZOS))
        # Match-residual proxy is deliberately not labelled whole-structure compliance.
        structure=dict(method='SIFT affine residual in 1x master pixels; no dense structural guarantee',maxInlierResidualPx1x=max(p['fit']['inlierResidualMaxPx1x'] for p in reg),parts={p['part']:p['fit'] for p in reg},acceptance='requires Claude visual judgement of plaza/stairs/cliffs/banks; match residual alone does not certify <=4px')
        dump(folder/'structure.json',structure)
        dump(folder/'registration.json',dict(chunk=name,coordinateSystem='rects [x0,y0,x1,y1], exclusive max; affine native pixels -> context origin or master pixels',outerRectPx1x=outer,chunkRectPx1x=chunk,parts=reg))
        dump(folder/'seams.json',dict(originPx1x=outer[:2],seams=seams))
        dump(folder/'removed.json',dict(removedIds=[],note='No verified baked walk-floor obstacle inside this chunk; see inventory and walkmask overlay. Runtime props remain external. No claim of removal for objects outside the crop.'))
        # Equal display scale: 2.8 screen pixels/world unit = 2.1875 screen pixels/master pixel.
        scale=2.8/(4915/3840);pw,ph=round((w/2)*scale),round((h/2)*scale)
        cmp=Image.new('RGB',(pw*2,ph+28),'#202020');d=ImageDraw.Draw(cmp);d.text((8,7),'v1 | ImageGen registered 2x (2.8 px/world unit)',fill='white')
        cmp.paste(Image.fromarray(baseline).resize((pw,ph),Image.Resampling.LANCZOS),(0,28));cmp.paste(Image.fromarray(final).resize((pw,ph),Image.Resampling.LANCZOS),(pw,28));cmp.save(folder/(name+'-compare.jpg'),quality=70)
        seam_preview=Image.fromarray(final);sd=ImageDraw.Draw(seam_preview)
        for s in seams:
            sx0,sy0,_,_=s['overlapRectPx2x']
            points=[(sx0+v-cx,sy0+i-cy) if s['axis']=='x' else (sx0+i-cx,sy0+v-cy) for i,v in enumerate(s['path'])]
            sd.line(points,fill=(255,0,190),width=2)
        seam_preview.thumbnail((1200,1200));seam_preview.save(folder/'seam-check.jpg',quality=80)
        records.append(chunk_record(name,im))
    dump(OUT/'run-summary.json',dict(task='Z234-HD-FULL zone3 set4/5',chunks=records,imageGenCalls=len(json.loads((OUT/'generation-prompts.json').read_text())),budgetCalls=16,reviewState='Not QA approved; measurements for Claude review',incompleteParts=[{'chunk':r['chunk'],'parts':r.get('missing',[])} for r in records if r['state']=='incomplete']))

def package():
    """Compact review JPEGs; no native/2x changes, refitting or quality retesting."""
    im=master()
    for name in CHUNKS:
        folder=OUT/name;rect,_=layout(name)
        final=Image.open(folder/(name+'-2x.webp'))
        scale=2.8/(4915/3840);pw,ph=round((rect[2]-rect[0])*scale),round((rect[3]-rect[1])*scale)
        cmp=Image.new('RGB',(pw*2,ph+28),'#202020');d=ImageDraw.Draw(cmp)
        d.text((8,7),'v1 | ImageGen registered 2x (2.8 px/world unit)',fill='white')
        # Match finish's baseline filter chain exactly.
        baseline=im.crop(rect).resize(final.size,Image.Resampling.LANCZOS)
        cmp.paste(baseline.resize((pw,ph),Image.Resampling.LANCZOS),(0,28))
        cmp.paste(final.resize((pw,ph),Image.Resampling.LANCZOS),(pw,28))
        cmp.save(folder/(name+'-compare.jpg'),quality=70)
        # Rebuild the marked seam preview from lossless pixels, never recompress a JPEG.
        marked=final.copy();sd=ImageDraw.Draw(marked)
        seamdata=json.loads((folder/'seams.json').read_text());ox,oy=seamdata['originPx1x']
        cx,cy=(rect[0]-ox)*2,(rect[1]-oy)*2
        for s in seamdata['seams']:
            sx0,sy0,_,_=s['overlapRectPx2x']
            points=[(sx0+v-cx,sy0+i-cy) if s['axis']=='x' else (sx0+i-cx,sy0+v-cy) for i,v in enumerate(s['path'])]
            sd.line(points,fill=(255,0,190),width=2)
        marked.thumbnail((1200,1200));marked.save(folder/'seam-check.jpg',quality=80)

    summary=json.loads((OUT/'run-summary.json').read_text())
    notes={
        'r3-c3':['SIFT inlier residual max 4.24px exceeds 4px; this is a match proxy, not measured maximum structural displacement.','Engraved plaza motifs are darker and more defined; local design differs from source.','Bridge posts differ in silver/gold balance between q11 and q12.'],
        'r3-c4':['Water ripples are denser; inspect shore contours and waterfall detail against unchanged flow mask.'],
        'r3-c5':['q12 adds a short bright waterfall at the upper bank where source had icicles; geometry preservation is not certified.','Skull and rib detail is reinterpreted; inspect liquid mask near bones.'],
        'r4-c1':['More realistic snow/needle texture than source; inspect style consistency with adjacent chunks.','Native affine coverage in q12 context is 99.06%; border reflect sampling is used outside native support, not a new generation.']}
    for c in summary['chunks']:
        c['imageGenCalls']=c['parts'];c['visualNotes']=notes[c['chunk']]
        c['structureMaxPx1x']=None
        c['qualityApproval']=None
    summary['completedDrawingParts']=14
    summary['pendingAcceptance']=['Claude structure <=4px judgement; r3-c3 match residual warning and r3-c5 added-waterfall defect','Claude seam and west-style judgement at 2.8 px/world unit','ASSEMBLE cross-chunk seams; outer overlaps intentionally retained']
    summary['incompleteParts']=[]
    summary['processingNotes']='Manifest packaging recovered and resumed from existing exports; no generations or fits repeated to improve thresholds.'
    dump(OUT/'run-summary.json',summary)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('command',choices=['prepare','finish','package']);args=parser.parse_args()
    if args.command=='prepare':prepare()
    elif args.command=='finish':finish()
    else:package()
