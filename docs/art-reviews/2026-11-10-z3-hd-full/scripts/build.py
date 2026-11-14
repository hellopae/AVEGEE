"""Review-only west HD parts. Run from repository root; never installs game art.

prepare: source crops and mask evidence. finish: SIFT affine, seam and measurements.
Native images are drawn by the built-in ImageGen tool, never by this script.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parents[1]
CHUNKS = ['r4-c2', 'r4-c3', 'r4-c4', 'r4-c5']
FULL = (4915, 3277)
VISUAL_NOTES = {
    'r4-c2': ['Fissures and mortar contrast are stronger than v1. Inspect west-style consistency with adjacent chunks.'],
    'r4-c3': ['q11 all-match residual P95 is 62.08px. Repeated paving/rail features include rejected correspondences. Inspect the corridor rails and snow boundary.',
        'The seam crosses the paved corridor close to the right rail. Inspect continuous paving and post shapes at game zoom.'],
    'r4-c4': ['The frozen blue icicles remain frozen. Rock strata and branch detail are more pronounced than v1.'],
    'r4-c5': ['The Gothic inset tracery and small icicle/rock details are reinterpreted. Inspect silhouette agreement at the right map edge.'],
}

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
    xs=[0,(w+1)//2,w]
    ys=[0,h]
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
    a=np.zeros(480*320,np.uint8)
    p=0
    for i,n in enumerate(runs):
        if i%2:
            a[p:p+n]=255
        p+=n
    assert p==480*320
    return np.asarray(Image.fromarray(a.reshape(320,480)).resize(FULL,Image.Resampling.NEAREST))

def prepare():
    im=master()
    mask=walkmask()
    plans={}
    for name in CHUNKS:
        folder=OUT/name
        folder.mkdir(exist_ok=True)
        rect,parts=layout(name)
        plans[name]=dict(chunkRectPx1x=rect,parts=parts)
        for p in parts:
            im.crop(p['contextRectPx1x']).save(folder/(p['part']+'-source.webp'),lossless=True)
        x0,y0,x1,y1=rect
        a=np.asarray(im.crop(rect)).copy()
        m=mask[y0:y1,x0:x1]>0
        a[m]=(a[m]*.65+np.array([255,40,50])*.35).astype(np.uint8)
        Image.fromarray(a).save(folder/'walkmask-overlay.jpg',quality=88)
    dump(OUT/'layout.json',plans)
    # Runtime roots are surveyed separately from the painted scenery.
    ts=(ROOT/'src/town-west-trees.js').read_text()
    points=json.loads(ts[ts.index('['):ts.rindex(']')+1])
    objects=[]
    for i,p in enumerate(points):
        x,y=p['x']*FULL[0],p['y']*FULL[1]
        if not any(v['chunkRectPx1x'][0]-160<=x<v['chunkRectPx1x'][2]+160 and v['chunkRectPx1x'][1]-220<=y<v['chunkRectPx1x'][3]+64 for v in plans.values()):
            continue
        on=bool(mask[min(int(y),FULL[1]-1),min(int(x),FULL[0]-1)])
        in_context=any(v['chunkRectPx1x'][0]-64<=x<v['chunkRectPx1x'][2]+64 and v['chunkRectPx1x'][1]-64<=y<v['chunkRectPx1x'][3]+64 for v in plans.values())
        action='runtime-only' if on else 'keep-baked'
        reason='owner floor at foot; visual source has clear pavers at this foot, no matching baked cedar to erase' if on else 'nonwalkable snowbank; keep forest silhouette'
        if not in_context:
            action,reason='outside-scope','foot and trunk above every supplied context; no removal claimed in this run'
        objects.append(dict(id=f'west-tree-{i}',source='src/town-west-trees.js',footPx1x=[x,y],ownerWalkmaskAtFoot=on,action=action,reason=reason))
    for i,(x,y) in enumerate([[1710,1080],[2100,1080],[1788,1405],[2050,1405],[1790,1560],[2050,1560],[1770,2080],[2070,2080],[1770,2250],[2070,2250]]):
        px,py=x*FULL[0]/3840,y*FULL[1]/2560
        if any(v['chunkRectPx1x'][0]-64<=px<v['chunkRectPx1x'][2]+64 and v['chunkRectPx1x'][1]-64<=py<v['chunkRectPx1x'][3]+64 for v in plans.values()):
            objects.append(dict(id=f'hell-pillar-{i}',source='src/town-layout.js',footPx1x=[px,py],ownerWalkmaskAtFoot=bool(mask[int(py),int(px)]),action='runtime-only',reason='runtime sprite position; no separate matching baked torch visible in source; do not erase structural bridge posts'))
    for name, plan in plans.items():
        x0,y0,x1,y1=plan['chunkRectPx1x']
        m=mask[y0:y1,x0:x1]>0
        ys,xs=np.where(m)
        objects.append(dict(id=name+'-baked-scenery',chunk=name,
            coreRectPx1x=[x0,y0,x1,y1],ownerWalkPixels=int(m.sum()),
            ownerWalkBoundsPx1x=[int(xs.min()+x0),int(ys.min()+y0),int(xs.max()+x0+1),int(ys.max()+y0+1)] if len(xs) else None,
            action='keep-baked',removedIds=[],
            visualSurvey=('Only the narrow central stone corridor is walkable. Its paving is clear. Side rails/posts and snowbank pine remain outside the corridor.' if len(xs) else 'No owner walk pixels in this core. Retain the snowy rocks, pines and shrubs.'),
            completeSilhouetteAuditVerified=False))
    objects.append(dict(id='r4-c4-context-bones',action='keep-baked',
        sourcePart='r4-c4/q11-source.webp',
        reason='Bones are clipped along the upper neighbor context, outside the walking corridor. Keep their original silhouette.'))
    dump(OUT/'objects-inventory.json',dict(zone='west',scope=CHUNKS,master='img/map-zone3/v1/',repairs=False,
        coordinateSystem='full master pixels 1x; world 3840x2560',
        walkmask='src/town-owner-walkmask-west.js',objects=objects,
        runtimeRoots=dict(treeCount=len(points),maximumTreeFootMapY=max(p['y']*FULL[1] for p in points),
            otherPropMaximumFootWorldY=2250,otherPropMaximumFootMapY=2250*FULL[1]/2560,
            contextStartsMapY=3008,rootsIntersectingRunContext=0,
            source='src/town-west-trees.js and WEST_PROPS/TOWN_PROP_SITES in src/town-layout.js'),
        liquidCloudPolicy='Retain any liquid/cloud base and footprint. The blue hanging forms in this run are frozen icicles.',
        limitations='Visual survey and owner navigation mask inform removals. Full silhouette/occlusion acceptance remains for Claude.'))
    sources = [ROOT/f'img/map-zone3/v1/r{r}-c{c}.webp' for r in (3,4) for c in range(1,6)]
    sources += [ROOT/p for p in ['src/zone-skin.js','src/town-layout.js','src/town-west-trees.js','src/town-owner-walkmask-west.js']]
    dump(OUT/'source-provenance.json',dict(masterSize=list(FULL),repairs=False,
        overlapPerSidePx1x=64,files={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sources},
        prototypeEvidence=['bc9dc4dd:docs/art-reviews/2026-11-05-z1-v5-plaza-detail/scripts/assemble.py',
            '0c544a3f:docs/art-reviews/2026-11-05-z1-v5-hd-full/scripts/assemble.py'],
        adaptedHelper='/Users/agapae/agapae-work/.codex-worktrees/20261113T141806Z-4c0979f5/docs/art-reviews/2026-11-10-z3-hd-full/scripts/build.py'))

def register(source, native):
    """Fit native -> context 1x. Record both inlier and all-match residuals."""
    h,w=source.shape[:2]
    nh,nw=native.shape[:2]
    small=cv2.resize(native,(w,h),interpolation=cv2.INTER_AREA)
    sift=cv2.SIFT_create(nfeatures=7000,contrastThreshold=.015)
    ka,da=sift.detectAndCompute(cv2.cvtColor(small,cv2.COLOR_RGB2GRAY),None)
    kb,db=sift.detectAndCompute(cv2.cvtColor(source,cv2.COLOR_RGB2GRAY),None)
    if da is None or db is None:
        raise ValueError('No descriptors; retain native for manual registration')
    matches=[a for a,b in cv2.BFMatcher().knnMatch(da,db,k=2) if a.distance<.72*b.distance]
    if len(matches)<8:
        raise ValueError(f'Only {len(matches)} reliable matches')
    a=np.float32([ka[m.queryIdx].pt for m in matches])
    b=np.float32([kb[m.trainIdx].pt for m in matches])
    cv2.setRNGSeed(234)
    mat,inside=cv2.estimateAffine2D(a,b,method=cv2.RANSAC,ransacReprojThreshold=3,maxIters=10000,confidence=.999,refineIters=20)
    if mat is None or inside.sum()<6:
        raise ValueError('Affine unsupported')
    residual=np.linalg.norm(cv2.transform(a[None],mat)[0]-b,axis=1)
    ok=inside.ravel().astype(bool)
    native_mat=mat@np.diag([w/nw,h/nh,1])
    coverage=cv2.warpAffine(np.ones((nh,nw),np.uint8),native_mat,(w,h),flags=cv2.INTER_NEAREST)
    stats=dict(matches=len(matches),inliers=int(ok.sum()),inlierResidualMaxPx1x=float(residual[ok].max()),inlierResidualP95Px1x=float(np.percentile(residual[ok],95)),allMatchResidualP95Px1x=float(np.percentile(residual,95)),contextCoverage=float(coverage.mean()))
    return native_mat,stats,a[ok],b[ok]

def cut_path(cost):
    """Minimum top-to-bottom RGB cost; steps -1,0,+1; exclude 10px rim."""
    cost=cost.copy()
    h,w=cost.shape
    rim=min(10,max(0,w//8))
    cost[:,:rim]=1e9
    cost[:,w-rim:]=1e9
    acc=cost[0].copy()
    back=np.zeros((h,w),np.int8)
    for y in range(1,h):
        opts=np.stack([np.r_[1e12,acc[:-1]],acc,np.r_[acc[1:],1e12]])
        idx=opts.argmin(axis=0)
        back[y]=idx-1
        acc=cost[y]+opts[idx,np.arange(w)]
    path=np.empty(h,np.int32)
    path[-1]=int(acc.argmin())
    for y in range(h-1,0,-1):
        path[y-1]=path[y]+back[y,path[y]]
    return path

def join(a,b,box_a,box_b,axis):
    x0,y0=max(box_a[0],box_b[0]),max(box_a[1],box_b[1])
    x1,y1=min(box_a[2],box_b[2]),min(box_a[3],box_b[3])
    aa=a[y0:y1,x0:x1]
    bb=b[y0:y1,x0:x1]
    cost=cv2.GaussianBlur(np.mean((aa.astype(np.float32)-bb.astype(np.float32))**2,axis=2),(5,5),0)
    if axis=='y':
        cost=cost.T
    path=cut_path(cost)
    coords=np.arange(cost.shape[1])[None,:]
    t=np.clip((coords-path[:,None]+8)/16,0,1)
    alpha=t*t*(3-2*t)
    if axis=='y':
        alpha=alpha.T
    union=[min(box_a[0],box_b[0]),min(box_a[1],box_b[1]),max(box_a[2],box_b[2]),max(box_a[3],box_b[3])]
    out=a.copy()
    out[box_b[1]:box_b[3],box_b[0]:box_b[2]]=b[box_b[1]:box_b[3],box_b[0]:box_b[2]]
    out[y0:y1,x0:x1]=np.uint8(np.clip(aa*(1-alpha[:,:,None])+bb*alpha[:,:,None],0,255))
    return out,union,dict(axis=axis,overlapRectPx2x=[x0,y0,x1,y1],path=path.tolist(),meanOverlapRgbDifference=float(np.abs(aa.astype(float)-bb).mean()),featherPx2x=8)

def lap(im):
    return float(cv2.Laplacian(cv2.cvtColor(im,cv2.COLOR_RGB2GRAY),cv2.CV_64F).var())

def chunk_record(name,im):
    folder = OUT / name
    registration = json.loads((folder / 'registration.json').read_text())
    chunk = registration['chunkRectPx1x']
    final_image = Image.open(folder / (name + '-2x.webp')).convert('RGB')
    original = im.crop(chunk)
    final = np.asarray(final_image)
    baseline = np.asarray(original.resize(final_image.size, Image.Resampling.LANCZOS))
    structure = json.loads((folder / 'structure.json').read_text())
    baseline_lap, final_lap = lap(baseline), lap(final)
    screen_size = (
        round(original.width * 2.8 / (4915 / 3840)),
        round(original.height * 2.8 / (3277 / 2560)),
    )
    screen_baseline = lap(np.asarray(original.resize(screen_size, Image.Resampling.LANCZOS)))
    screen_output = lap(np.asarray(final_image.resize(screen_size, Image.Resampling.LANCZOS)))
    return dict(
        chunk=name,
        state='drawn-needs-review',
        parts=len(registration['parts']),
        nativeSizes=[part['nativeSize'] for part in registration['parts']],
        outputSize=list(final_image.size),
        sharpness=dict(
            method='grayscale Laplacian variance at equal 2x size; baseline Lanczos from v1',
            baseline=baseline_lap, output=final_lap, ratio=final_lap / baseline_lap, target=10,
        ),
        sharpnessGameZoom=dict(
            method='Pillow Lanczos directly from master v1 and assembled 2x to equal 2.8 screen pixels/world unit; grayscale Laplacian variance ksize=1',
            roi='full chunk', screenSize=list(screen_size), baseline=screen_baseline,
            output=screen_output, ratio=screen_output / screen_baseline, target=10,
        ),
        structureInlierMaxPx1x=structure['maxInlierResidualPx1x'],
        structureMaxPx1x=None,
        qualityApproval=None,
        visualNotes=VISUAL_NOTES[name],
        pending=['Claude structure/seam/style review'],
    )

def finish():
    plans=json.loads((OUT/'layout.json').read_text())
    im=master()
    records=[]
    for name,plan in plans.items():
        folder=OUT/name
        chunk=plan['chunkRectPx1x']
        parts=plan['parts']
        missing=[p['part'] for p in parts if not (folder/(p['part']+'-native.webp')).exists()]
        if missing:
            records.append(dict(chunk=name,state='incomplete',missing=missing))
            continue
        # Resume packaging after interruption without refitting or repainting completed art.
        if (folder/'registration.json').exists() and (folder/(name+'-2x.webp')).exists():
            records.append(chunk_record(name,im))
            continue
        # Canvas includes the outer overlap; exported chunk is cropped only after joins.
        outer=[min(p['contextRectPx1x'][0] for p in parts),min(p['contextRectPx1x'][1] for p in parts),max(p['contextRectPx1x'][2] for p in parts),max(p['contextRectPx1x'][3] for p in parts)]
        cw,ch=(outer[2]-outer[0])*2,(outer[3]-outer[1])*2
        images=[]
        boxes=[]
        reg=[]
        for p in parts:
            native=np.asarray(Image.open(folder/(p['part']+'-native.webp')).convert('RGB'))
            source=np.asarray(Image.open(folder/(p['part']+'-source.webp')).convert('RGB'))
            mat,stats,a,b=register(source,native)
            r=p['contextRectPx1x']
            box=[(r[0]-outer[0])*2,(r[1]-outer[1])*2,(r[2]-outer[0])*2,(r[3]-outer[1])*2]
            to_canvas=mat*2
            to_canvas[:,2]+=box[:2]
            warped=cv2.warpAffine(native,to_canvas,(cw,ch),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REFLECT_101)
            images.append(warped)
            boxes.append(box)
            reg.append({**p,'nativeFile':p['part']+'-native.webp','nativeSize':[native.shape[1],native.shape[0]],'nativeToContextPx1x':mat.tolist(),'nativeToMasterPx1x':(mat+np.array([[0,0,r[0]],[0,0,r[1]]])).tolist(),'fit':stats})
            overlay=source.copy()
            down=cv2.warpAffine(native,mat,(source.shape[1],source.shape[0]),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REFLECT_101)
            overlay=cv2.addWeighted(overlay,.5,down,.5,0)
            for x,y in b:
                cv2.circle(overlay,(round(float(x)),round(float(y))),2,(0,255,60),1)
            Image.fromarray(overlay).save(folder/(p['part']+'-registration.jpg'),quality=85)
        top,top_box,s1=join(images[0],images[1],boxes[0],boxes[1],'x')
        seams=[s1]
        joined=top
        cx,cy=(chunk[0]-outer[0])*2,(chunk[1]-outer[1])*2
        w,h=(chunk[2]-chunk[0])*2,(chunk[3]-chunk[1])*2
        final=joined[cy:cy+h,cx:cx+w]
        Image.fromarray(final).save(folder/(name+'-2x.webp'),lossless=True,method=6)
        baseline=np.asarray(im.crop(chunk).resize((w,h),Image.Resampling.LANCZOS))
        # Match-residual proxy is deliberately not labelled whole-structure compliance.
        structure=dict(method='SIFT affine residual in 1x master pixels; no dense structural guarantee',maxInlierResidualPx1x=max(p['fit']['inlierResidualMaxPx1x'] for p in reg),parts={p['part']:p['fit'] for p in reg},structureMaxPx1x=None,semanticStructureVerified=False,acceptance='requires Claude visual judgement of plaza/stairs/cliffs/banks; match residual alone does not certify <=4px')
        dump(folder/'structure.json',structure)
        dump(folder/'registration.json',dict(chunk=name,coordinateSystem='rects [x0,y0,x1,y1], exclusive max; affine native pixels -> context origin or master pixels',outerRectPx1x=outer,chunkRectPx1x=chunk,parts=reg,
            borderMode='BORDER_REFLECT_101 for samples outside native support; context coverage recorded per part',
            outputScale=2,externalChunkBlend=False,colorCorrectionApplied=False,sharpeningApplied=False))
        dump(folder/'seams.json',dict(originPx1x=outer[:2],seams=seams))
        dump(folder/'removed.json',dict(removedIds=[],note='No verified baked walk-floor obstacle inside this chunk; see inventory and walkmask overlay. Runtime props remain external. No claim of removal for objects outside the crop.'))
        # Equal display scale: 2.8 screen pixels/world unit = 2.1875 screen pixels/master pixel.
        scale=2.8/(4915/3840)
        pw,ph=round((w/2)*scale),round((h/2)*scale)
        cmp=Image.new('RGB',(pw*2,ph+28),'#202020')
        d=ImageDraw.Draw(cmp)
        d.text((8,7),'v1 | ImageGen registered 2x (2.8 px/world unit)',fill='white')
        cmp.paste(Image.fromarray(baseline).resize((pw,ph),Image.Resampling.LANCZOS),(0,28))
        cmp.paste(Image.fromarray(final).resize((pw,ph),Image.Resampling.LANCZOS),(pw,28))
        cmp.save(folder/(name+'-compare.jpg'),quality=70)
        seam_preview=Image.fromarray(final)
        sd=ImageDraw.Draw(seam_preview)
        for s in seams:
            sx0,sy0,_,_=s['overlapRectPx2x']
            points=[(sx0+v-cx,sy0+i-cy) if s['axis']=='x' else (sx0+i-cx,sy0+v-cy) for i,v in enumerate(s['path'])]
            sd.line(points,fill=(255,0,190),width=2)
        seam_preview.thumbnail((1200,1200))
        seam_preview.save(folder/'seam-check.jpg',quality=80)
        records.append(chunk_record(name,im))
    dump(OUT/'run-summary.json',dict(task='Z234-HD-FULL zone3 set5/5',chunks=records,imageGenCalls=len(json.loads((OUT/'generation-prompts.json').read_text())),budgetCalls=16,
        completedDrawingParts=sum(r.get('parts',0) for r in records),
        reviewState='Awaiting Claude quality decision',qualityApproval=None,
        pendingAcceptance=['Claude decision on structure <=4px, internal seams and west-style consistency',
            'ASSEMBLE cross-chunk seams using native images and outer overlaps'],
        incompleteParts=[{'chunk':r['chunk'],'parts':r.get('missing',[])} for r in records if r['state']=='incomplete']))

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('command',choices=['prepare','finish'])
    args=parser.parse_args()
    if args.command=='prepare':
        prepare()
    elif args.command=='finish':
            finish()
