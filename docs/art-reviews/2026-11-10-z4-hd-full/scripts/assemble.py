#!/usr/bin/env python3
"""Register saved built-in ImageGen art and assemble four review chunks.

No generation, sharpening, texture transfer, or semantic drawing here.
SIFT/full affine + RANSAC registers native pixels; min-cost seams join them.
Quality metrics are observations, never pass/fail gates. Original assets are read only.
"""
from pathlib import Path
import hashlib
import json
import re
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1]
ROOT = OUT.parents[2]
cv2.setNumThreads(2)
cv2.setRNGSeed(234)


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def gray(rgb):
    return cv2.cvtColor(np.ascontiguousarray(rgb), cv2.COLOR_RGB2GRAY)


def lap(rgb):
    return float(cv2.Laplacian(gray(rgb), cv2.CV_32F).var())


def native_image(path):
    return np.array(Image.open(path).convert('RGB'))


def baseline():
    im = Image.new('RGB', (4915, 3277))
    for r in range(1, 5):
        for c in range(1, 6):
            im.paste(Image.open(ROOT / f'img/map-zone4/v3/r{r}-c{c}.webp'), ((c-1)*1024, (r-1)*1024))
    return im


def rectangles(c, qr, qc):
    core = [(c-1)*1024+qc*512, qr*512, (c-1)*1024+(qc+1)*512, (qr+1)*512]
    context = [max(0, core[0]-64), max(0, core[1]-64), min(4915, core[2]+64), min(3277, core[3]+64)]
    return core, context


def register(ref, nat):
    """Work in context 1x, then compose native-to-context affine explicitly."""
    h, w = ref.shape[:2]
    resized = cv2.resize(nat, (w, h), interpolation=cv2.INTER_AREA)
    sift = cv2.SIFT_create(nfeatures=12000, contrastThreshold=.012)
    ka, da = sift.detectAndCompute(gray(resized), None)
    kb, db = sift.detectAndCompute(gray(ref), None)
    good = []
    if da is not None and db is not None:
        good = [a for pair in cv2.BFMatcher().knnMatch(da, db, k=2)
                if len(pair) == 2 for a, b in [pair] if a.distance < .72*b.distance]
    affine = None
    inliers = None
    if len(good) >= 6:
        a = np.float32([ka[m.queryIdx].pt for m in good])
        b = np.float32([kb[m.trainIdx].pt for m in good])
        affine, inliers = cv2.estimateAffine2D(a, b, method=cv2.RANSAC,
            ransacReprojThreshold=3, maxIters=5000, confidence=.999, refineIters=10)
    fit = {'method':'SIFT Lowe .72 / full affine RANSAC, threshold 3 px at 1x',
           'candidateMatches':len(good), 'inliers':int(inliers.sum()) if inliers is not None else 0}
    if affine is None:
        affine = np.array([[1., 0., 0.], [0., 1., 0.]])
        fit['status'] = 'UNREGISTERED: nominal size mapping only; requires manual registration'
        fit['residualPx1x'] = None
    else:
        residual = np.linalg.norm(cv2.transform(a[None], affine)[0]-b, axis=1)
        inside = residual[inliers.ravel().astype(bool)]
        fit['status'] = 'affine estimated; semantic geometry not certified'
        fit['residualPx1x'] = {'inlierMax':float(inside.max()), 'inlierP95':float(np.percentile(inside,95)),
                               'allLoweP95':float(np.percentile(residual,95)), 'allLoweMax':float(residual.max())}
        fit['matches'] = [{'resizedNative':x.tolist(), 'contextReference':y.tolist(),
                          'residual':float(d), 'ransacInlier':bool(k)}
                         for x,y,d,k in zip(a,b,residual,inliers.ravel())]
    # OpenCV resize pixel-centre convention: u_ref=(u_native+.5)*scale-.5.
    scale = np.array([[w/nat.shape[1],0,(w/nat.shape[1]-1)/2],
                      [0,h/nat.shape[0],(h/nat.shape[0]-1)/2], [0,0,1]])
    native_to_context = (np.vstack([affine, [0,0,1]]) @ scale)[:2]
    return native_to_context, fit


def seam_path(a, b, va, vb):
    """Same three-neighbour DP recurrence/cost smoothing as Z1 v7r band_path.

    Explicit validity penalties keep the path off exposed affine borders.
    """
    cost = cv2.GaussianBlur(np.mean((a.astype(np.float32)-b.astype(np.float32))**2, axis=2), (5,5), 0)
    cost += ((va < .99) | (vb < .99))*1e6
    cost[:, :10] += 1e7
    cost[:, -10:] += 1e7
    h, w = cost.shape
    dp = cost.copy()
    back = np.zeros((h,w), np.int8)
    for y in range(1,h):
        p = np.pad(dp[y-1], (1,1), constant_values=np.inf)
        choices = np.stack([p[:w],p[1:w+1],p[2:]])
        k = np.argmin(choices, axis=0)
        dp[y] += choices[k,np.arange(w)]
        back[y] = k-1
    path = np.empty(h,np.int32)
    path[-1] = np.argmin(dp[-1])
    for y in range(h-1,0,-1):
        path[y-1] = path[y]+back[y,path[y]]
    return path, float(np.min(dp[-1])/h)


def join(a, b, va, vb, axis, lo=896, hi=1152):
    if axis == 'horizontal':
        a,b = a.transpose(1,0,2),b.transpose(1,0,2)
        va,vb = va.T,vb.T
    path, cost = seam_path(a[:,lo:hi],b[:,lo:hi],va[:,lo:hi],vb[:,lo:hi])
    path += lo
    xx = np.arange(a.shape[1])[None,:]
    t = np.clip((xx-path[:,None]+8)/16,0,1)
    alpha = (t*t*(3-2*t)).astype(np.float32)
    alpha = np.where(va < .01,1,alpha)
    alpha = np.where(vb < .01,0,alpha)
    valid = va*(1-alpha)+vb*alpha
    out = a*(1-alpha[...,None])+b*alpha[...,None]
    if axis == 'horizontal':
        out, valid = out.transpose(1,0,2),valid.T
    return out,valid,{'axis':axis,'overlapBandPx2x':[lo,hi], 'featherPx2x':8,
                     'pathPx2x':path.tolist(),'meanCost':cost}


def canvas_for(nat, matrix, context, c):
    transform = matrix*2
    transform[:,2] += [(context[0]-(c-1)*1024)*2,context[1]*2]
    tile = cv2.warpAffine(nat,transform,(2048,2048),flags=cv2.INTER_LANCZOS4,
                          borderMode=cv2.BORDER_REFLECT_101)
    valid = cv2.warpAffine(np.ones(nat.shape[:2],np.float32),transform,(2048,2048),
                           flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT)
    # Disallow reflected material outside the actual crop's reference rectangle.
    yy,xx = np.mgrid[:2048,:2048]
    inside = ((xx >= (context[0]-(c-1)*1024)*2) & (xx < (context[2]-(c-1)*1024)*2)
              & (yy >= context[1]*2) & (yy < context[3]*2))
    return tile.astype(np.float32),valid*inside


# Explicit structural feature probes in chunk-local source coordinates.
# Local template correlation is diagnostic, not an exhaustive semantic proof.
PROBES = {
    1:[('north-stair-left-foot',423,453),('north-stair-right-foot',559,453),
       ('plaza-east-bridge-junction',949,737),('south-stair-left-foot',571,910),
       ('south-stair-right-foot',703,911),('lavafall-lip',206,681)],
    2:[('bridge-deck-left',68,768),('bridge-landing-corner',507,869),
       ('upper-stair-foot',595,840),('upper-stair-head',772,643),
       ('plaza-south-stair-head',1010,660),('lavafall-lip',265,562)],
    3:[('west-plaza-stair-left-head',117,650),('west-plaza-stair-right-head',255,650),
       ('west-stair-left-foot',111,783),('lower-stair-left-head',246,923),
       ('east-path-cliff-turn',860,885),('upper-plaza-edge',990,580)],
    4:[('north-stair-left-foot',174,392),('north-stair-right-foot',287,392),
       ('south-stair-left-head',129,705),('south-stair-right-head',261,710),
       ('arched-bridge-centre-deck',836,533),('cyan-waterfall-lip',992,663)],
}


def probe_structure(base, after, c):
    a = cv2.GaussianBlur(gray(base),(0,0),2)
    b = cv2.GaussianBlur(gray(after),(0,0),2)
    rows = []
    for name,x,y in PROBES[c]:
        radius,search = 20,24
        template = a[y-radius:y+radius+1,x-radius:x+radius+1]
        window = b[y-radius-search:y+radius+search+1,x-radius-search:x+radius+search+1]
        scores = cv2.matchTemplate(window,template,cv2.TM_CCOEFF_NORMED)
        _,score,_,(dx,dy) = cv2.minMaxLoc(scores)
        dx,dy = dx-search,dy-search
        rows.append({'name':name,'sourcePx1x':[x,y],'bestCandidatePx1x':[x+dx,y+dy],
                     'displacementPx1x':float(np.hypot(dx,dy)),'correlation':float(score),
                     'reliableCorrespondence':bool(score>=.7),
                     'note':'Local template proxy; inspect structural landmarks visually.'})
    return {'method':'41x41 low-pass grayscale patches, +/-24 px search, delivered output downsampled to 1x',
            'coordinateSpace':'chunk-local master 1x pixels', 'landmarks':rows,
            'structureMaxProxyPx1x':max(d['displacementPx1x'] for d in rows),
            'structureMaxCertifiedPx1x':None,
            'decision':'NOT CERTIFIED: proxy probes do not prove every plaza/stair/cliff/bank <=4 px; Claude review required'}


def inventory():
    source = ROOT/'src/town-owner-walkmask-cyberhell.js'
    runs = json.loads(re.search(r'TOWN_OWNER_WALK_RUNS=(\[.*?\]);',source.read_text()).group(1))
    mask = np.zeros(480*320,np.uint8)
    pos = 0
    for i,n in enumerate(runs):
        mask[pos:pos+n] = i%2
        pos += n
    assert pos == len(mask)
    mask = mask.reshape(320,480)
    def walk(x,y):
        return bool(mask[min(319,int(y/3277*320)),min(479,int(x/4915*480))])
    objs = []
    for ident,box,foot in [
        ('z4-r1-c3-loose-crystal-west',[2217,860,2252,899],[2234,887]),
        ('z4-r1-c3-loose-crystal-east',[2368,826,2404,860],[2386,852])]:
        objs.append({'id':ident,'chunk':'r1-c3','bboxPx1x':box,'footPx1x':foot,
                     'ownerWalkmaskAtFoot':walk(*foot),'action':'remove-and-inpaint',
                     'generation':'r1-c3/q21','reason':'isolated raised crystal on pavement between stair flights'})
    for c in range(1,5):
        objs.append({'id':f'z4-r1-c{c}-border-pylons-crystals-rails','chunk':f'r1-c{c}',
                     'action':'keep-baked','reason':'structural border ensemble; retained deck/stair boundaries; no freestanding middle-of-floor objects identified outside two entries',
                     'inspection':'source-contact.jpg and walkmask-contact.jpg; bounding groups are not individual collision masks'})
        objs.append({'id':f'z4-r1-c{c}-background-and-fluid','chunk':f'r1-c{c}',
                     'action':'keep-baked','reason':'inaccessible mountains/city, cloud sea, lava and cyan water stay as animation base'})
    pole_source = ROOT/'src/z4-poles-data.js'
    poles = json.loads(re.search(r'Z4_POLES = Object.freeze\((\[.*?\])\.map',pole_source.read_text()).group(1))
    for i,(x,y,h) in enumerate(poles):
        px,py = x*4915,y*3277
        if px<4096 and py<1024:
            objs.append({'id':f'runtime-z4-pole-{i}','chunk':f'r1-c{int(px//1024)+1}',
                         'footPx1x':[px,py],'ownerWalkmaskAtFoot':walk(px,py),
                         'action':'runtime-layer-only','source':f'src/z4-poles-data.js Z4_POLES[{i}]',
                         'reason':'separate sprite/wire layer via src/z4-poles.js; not a baked terrain removal target'})
    for ident,foot in [('krata',[187*4915/1536,211*3277/1024]),
                       ('tarang',[664*4915/1536,173*3277/1024]),
                       ('sawan',[1015*4915/1536,160*3277/1024]),
                       ('canteen',[636*4915/1536,276*3277/1024])]:
        objs.append({'id':f'runtime-station-{ident}','footPx1x':foot,
                     'chunk':f'r1-c{int(foot[0]//1024)+1}','action':'runtime-layer-only',
                     'source':'src/town-cyberhell-layout.js','ownerWalkmaskAtFoot':walk(*foot),
                     'reason':'station drawn separately; reserved floor/flat inlay remains'})
    data = {'zone':4,'skin':'cyberhell','scope':['r1-c1','r1-c2','r1-c3','r1-c4'],
            'coordinateSpace':'full 4915x3277 master 1x pixels; source bbox [x0,y0,x1,y1]',
            'sources':{str(p.relative_to(ROOT)):sha(p) for p in [source,pole_source,ROOT/'src/town-cyberhell-layout.js',ROOT/'src/zone-skin.js']},
            'repairs':False,'runtimeProps':[],'runtimeHouses':[],
            'limitations':'walkmask is cell-centre sampled at 8 world units, not per-object collision evidence; border ensembles reviewed visually. Scope only these four chunks.',
            'objects':objs}
    write_json(OUT/'objects-inventory.json',data)
    return data


def main():
    master = baseline()
    inv = inventory()
    summary = {'zone':4,'style':'cyberhell','source':'img/map-zone4/v3/',
               'repairs':False,'tool':'built-in image_gen only','imageGenCalls':16,'retries':0,
               'requestedChunks':[f'r1-c{c}' for c in range(1,5)],'chunks':[],
               'qualityDecision':'Pending Claude review; no QA acceptance asserted',
               'missingDeliverables':[],
               'pendingWork':['Claude decision on sharpness, structure and visible seams',
                              'ASSEMBLE neighbour-chunk seams; original game assets not installed'],
               'referenceAvailability':{'externalZone1ExampleDirectories':'missing at supplied locations',
                   'usedMethods':['scripts/stitch-border34-redraw.py SIFT/affine precedent',
                       'docs/art-reviews/2026-11-12-z1-v7r-assemble/scripts/assemble-v7r.py band_path recurrence']}}
    for c in range(1,5):
        chunk = f'r1-c{c}'
        dest = OUT/chunk
        tiles,valids = {},{}
        reg = {'schemaVersion':1,'chunk':chunk,'source':'img/map-zone4/v3/',
               'chunkRectPx1x':[(c-1)*1024,0,c*1024,1024],
               'rectFormat':'[x0,y0,x1,y1], full-map 1x, half-open',
               'matrixConvention':'nativeToContextPx1x maps native image pixel centres to context-local 1x pixel centres; add context origin for global coordinates',
               'parts':{}}
        for qr in range(2):
            for qc in range(2):
                q = f'q{qr+1}{qc+1}'
                core,context = rectangles(c,qr,qc)
                ref = np.array(master.crop(context))
                input_path = dest/f'{q}-input.webp'
                if not input_path.exists():
                    Image.fromarray(ref).save(input_path,lossless=True)
                path = dest/f'{q}-native.webp'
                nat = native_image(path)
                matrix,fit = register(ref,nat)
                tiles[q],valids[q] = canvas_for(nat,matrix,context,c)
                reg['parts'][q] = {'nativeFile':path.name,'nativeSize':[nat.shape[1],nat.shape[0]],
                    'nativeSHA256':sha(path),'inputSHA256':sha(dest/f'{q}-input.webp'),
                    'coreRectPx1x':core,'contextRectPx1x':context,'contextSizePx1x':[ref.shape[1],ref.shape[0]],
                    'overlapPx1x':64,'nativeToContextPx1x':matrix.tolist(),'fit':fit}
        top,vt,st = join(tiles['q11'][:1152],tiles['q12'][:1152],valids['q11'][:1152],valids['q12'][:1152],'vertical')
        bottom,vb,sb = join(tiles['q21'][896:],tiles['q22'][896:],valids['q21'][896:],valids['q22'][896:],'vertical')
        upper = np.zeros((2048,2048,3),np.float32)
        lower = upper.copy()
        vu = np.zeros((2048,2048),np.float32)
        vl = vu.copy()
        upper[:1152],vu[:1152] = top,vt
        lower[896:],vl[896:] = bottom,vb
        merged,coverage,sh = join(upper,lower,vu,vl,'horizontal')
        base = np.array(master.crop(reg['chunkRectPx1x']))
        base2 = np.array(Image.fromarray(base).resize((2048,2048),Image.Resampling.LANCZOS))
        # Any affine-exposed pixels use the actual master; quantify this explicitly.
        missing = coverage < .99
        merged[missing] = base2[missing]
        merged = np.uint8(np.rint(np.clip(merged,0,255)))
        im = Image.fromarray(merged)
        im.save(dest/f'{chunk}-2x.webp',lossless=True,quality=100,method=6)
        delivered = native_image(dest/f'{chunk}-2x.webp')
        down = np.array(Image.fromarray(delivered).resize((1024,1024),Image.Resampling.LANCZOS))
        structure = probe_structure(base,down,c)
        structure['registrationInlierResidualMaxPx1x'] = max((p['fit']['residualPx1x'] or {}).get('inlierMax',0) for p in reg['parts'].values())
        structure['affineUncoveredMasterFallbackFraction'] = float(missing.mean())
        # Same display sampling on both sides (2.8 screen px/world unit).
        game_factor = 2.8/(4915/3840)
        compare = Image.new('RGB',(1424,752),(20,16,30))
        draw = ImageDraw.Draw(compare)
        draw.text((8,8),'v3 master at 2.8 px/world',fill='white')
        draw.text((720,8),'HD assembly at 2.8 px/world',fill='white')
        crop_box = (256,448,576,768)
        before = Image.fromarray(base).crop(crop_box).resize((700,700),Image.Resampling.LANCZOS)
        after = im.crop(tuple(v*2 for v in crop_box)).resize((700,700),Image.Resampling.LANCZOS)
        compare.paste(before,(8,40))
        compare.paste(after,(720,40))
        compare.save(dest/f'{chunk}-compare.jpg',quality=84,optimize=True)
        edge1 = cv2.Canny(cv2.GaussianBlur(gray(base),(0,0),2),40,80)
        edge2 = cv2.Canny(cv2.GaussianBlur(gray(down),(0,0),2),40,80)
        overlay = down//2
        overlay[edge1>0] = [255,60,60]
        overlay[edge2>0] = [30,220,255]
        overlay[(edge1>0)&(edge2>0)] = [255,255,255]
        Image.fromarray(overlay).save(dest/'structure-overlay.jpg',quality=84,optimize=True)
        seam_image = Image.new('RGB',(1024,1024))
        seam_image.paste(im.resize((1024,1024),Image.Resampling.LANCZOS))
        d = ImageDraw.Draw(seam_image)
        for yy,xx in enumerate(st['pathPx2x']):
            if yy%2==0:d.point((xx//2,yy//2),fill=(50,255,50))
        for yy,xx in enumerate(sb['pathPx2x']):
            if yy%2==0:d.point((xx//2,(yy+896)//2),fill=(50,255,50))
        for xx,yy in enumerate(sh['pathPx2x']):
            if xx%2==0:d.point((xx//2,yy//2),fill=(255,170,20))
        seam_image.save(dest/'seam-paths.jpg',quality=84,optimize=True)
        seam_check = Image.new('RGB',(2048,1024))
        seam_check.paste(im.crop((768,0,1280,2048)).resize((512,1024)),(0,0))
        seam_check.paste(im.crop((0,768,2048,1280)).resize((1536,384)),(512,0))
        seam_check.paste(im.crop((704,704,1344,1344)),(800,384))
        seam_check.save(dest/'seam-check.jpg',quality=84,optimize=True)
        write_json(dest/'registration.json',reg)
        write_json(dest/'structure.json',structure)
        write_json(dest/'seams.json',{'method':'min-cost DP, RGB squared difference, Gaussian 5x5 cost, +/-8 output px smoothstep feather',
                    'topVertical':st,'bottomVertical':{**sb,'rowOffsetPx2x':896},'horizontal':sh,
                    'neighbourChunks':'not joined; native + contexts retained for ASSEMBLE',
                    'visualDecision':'requires Claude review; paths do not prove invisibility'})
        removed = [x['id'] for x in inv['objects'] if x.get('chunk')==chunk and x['action']=='remove-and-inpaint']
        write_json(dest/'removed.json',{'chunk':chunk,'removedObjectIds':removed,
            'method':'built-in ImageGen q21 prompt for isolated pavement crystals' if removed else 'none identified on open floor',
            'review':'visual native and assembled crops; no game collision changes'})
        sharpness = {'baselineMaster1xLaplacianVariance':lap(base),'baselineLanczos2xLaplacianVariance':lap(base2),
                     'delivered2xLaplacianVariance':lap(delivered),'deliveredDownsampled1xLaplacianVariance':lap(down)}
        sharpness['ratioAtEqual2xSampling'] = sharpness['delivered2xLaplacianVariance']/sharpness['baselineLanczos2xLaplacianVariance']
        sharpness['ratioAtEqual1xSampling'] = sharpness['deliveredDownsampled1xLaplacianVariance']/sharpness['baselineMaster1xLaplacianVariance']
        sharpness['note'] = 'Full-chunk grayscale Laplacian variance; no sharpening added. Both sampling conventions reported since unavailable Z1 scripts cannot be verified.'
        row = {'chunk':chunk,'imageGenCalls':4,'nativeSizes':{k:v['nativeSize'] for k,v in reg['parts'].items()},
               'outputSize':[2048,2048],'structureMaxCertifiedPx1x':None,
               'structureMaxProxyPx1x':structure['structureMaxProxyPx1x'],
               'affineUncoveredMasterFallbackFraction':float(missing.mean()),
               'sharpness':sharpness,'removedObjectIds':removed,'qualityStatus':'pending-review'}
        summary['chunks'].append(row)
        print(json.dumps(row,ensure_ascii=False),flush=True)
    write_json(OUT/'run-summary.json',summary)
    for path in OUT.glob('r*/q*-input.webp'):
        path.unlink()  # reproducible crops, omitted from final pack to meet 80 MB


if __name__ == '__main__':
    if '--prepare-inputs' in sys.argv:
        master = baseline()
        for c in range(1,5):
            dest = OUT/f'r1-c{c}'
            dest.mkdir(exist_ok=True)
            for qr in range(2):
                for qc in range(2):
                    _,context = rectangles(c,qr,qc)
                    master.crop(context).save(dest/f'q{qr+1}{qc+1}-input.webp',lossless=True)
        print('Prepared 16 original master context crops; no generation performed.')
    else:
        main()
