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


from prepare import CHUNKS, bounds, rectangles

# Semantic feature patches chosen on the source tile before measuring output.
PROBES = {
    'r2-c4': [('bridge-deck-west',55,249), ('bridge-landing-east',215,282),
              ('stair-left-foot',819,366), ('stair-right-foot',930,371),
              ('waterfall-upper-lip',695,554), ('waterfall-lower-lip',826,744)],
    'r2-c5': [('stair-left-head',107,535), ('stair-right-head',202,536),
              ('stair-left-foot',141,678), ('stair-right-foot',240,681),
              ('upper-plaza-cliff',300,229), ('lower-plaza-east-rim',657,808)],
    'r3-c1': [('north-stair-left-foot',650,43), ('north-stair-right-foot',783,45),
              ('north-plaza-bank',682,157), ('river-south-bank',682,486),
              ('lower-plaza-cliff',250,759), ('plaza-rock-tip',624,687)],
    'r3-c2': [('lavafall-lip',172,45), ('lavafall-base',185,126),
              ('north-plaza-cliff',833,120), ('south-bank',669,472),
              ('island-rock-tip',435,679), ('east-plaza-rim',889,721)],
}


def canvas_for(native, matrix, context, box):
    x0,y0,x1,y1 = box
    width,height = (x1-x0)*2,(y1-y0)*2
    # Output pixel centres: u_2x = 2*(u_1x + .5) - .5.
    transform = matrix*2
    transform[:,2] += [(context[0]-x0)*2+.5, (context[1]-y0)*2+.5]
    image = cv2.warpAffine(native,transform,(width,height),flags=cv2.INTER_LANCZOS4,
                           borderMode=cv2.BORDER_REFLECT_101)
    valid = cv2.warpAffine(np.ones(native.shape[:2],np.float32),transform,(width,height),
                           flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT)
    yy,xx = np.mgrid[:height,:width]
    inside = ((xx >= (context[0]-x0)*2) & (xx < (context[2]-x0)*2)
              & (yy >= (context[1]-y0)*2) & (yy < (context[3]-y0)*2))
    return image.astype(np.float32),valid*inside,transform


def probe_structure(base, down, chunk):
    reference = cv2.GaussianBlur(gray(base),(0,0),2)
    result = cv2.GaussianBlur(gray(down),(0,0),2)
    rows = []
    for name,x,y in PROBES[chunk]:
        radius,search = 16,20
        template = reference[y-radius:y+radius+1,x-radius:x+radius+1]
        window = result[y-radius-search:y+radius+search+1,x-radius-search:x+radius+search+1]
        scores = cv2.matchTemplate(window,template,cv2.TM_CCOEFF_NORMED)
        _,score,_,(dx,dy) = cv2.minMaxLoc(scores)
        dx,dy = dx-search,dy-search
        rows.append({'name':name,'sourcePx1x':[x,y],'bestCandidatePx1x':[x+dx,y+dy],
                     'displacementPx1x':float(np.hypot(dx,dy)), 'correlation':score,
                     'reliableCorrespondence':score>=.7})
    return {'method':'33x33 low-pass grayscale patches sigma=2; +/-20px search on delivered output at 1x',
            'coordinateSpace':'chunk-local master 1x pixels','landmarks':rows,
            'structureMaxProxyPx1x':max(row['displacementPx1x'] for row in rows),
            'structureMaxCertifiedPx1x':None,
            'limitation':'Local template probes are diagnostics. Complete plaza/stair/cliff/bank geometry remains for Claude visual decision.'}


def evidence(chunk, base, delivered, seams):
    dest = OUT/chunk
    im = Image.fromarray(delivered)
    down = np.array(im.resize((base.shape[1],base.shape[0]),Image.Resampling.LANCZOS))
    # Same 320 source-pixel crop at 2.8 screen px/world unit on both sides.
    factor = 2.8*3840/4915
    side = round(320*factor)
    crop = (256,448,576,768)
    contact = Image.new('RGB',(side*2+24,side+44),(20,16,30))
    draw = ImageDraw.Draw(contact)
    draw.text((8,8),'v3 master - 2.8 px/world',fill='white')
    draw.text((side+16,8),'HD - 2.8 px/world',fill='white')
    contact.paste(Image.fromarray(base).crop(crop).resize((side,side),Image.Resampling.LANCZOS),(8,36))
    contact.paste(im.crop(tuple(v*2 for v in crop)).resize((side,side),Image.Resampling.LANCZOS),(side+16,36))
    contact.save(dest/f'{chunk}-compare.jpg',quality=85,optimize=True)
    edge1 = cv2.Canny(cv2.GaussianBlur(gray(base),(0,0),2),40,80)
    edge2 = cv2.Canny(cv2.GaussianBlur(gray(down),(0,0),2),40,80)
    overlay = down//2
    overlay[edge1>0] = [255,60,60]
    overlay[edge2>0] = [30,220,255]
    overlay[(edge1>0)&(edge2>0)] = [255,255,255]
    Image.fromarray(overlay).save(dest/'structure-overlay.jpg',quality=83,optimize=True)
    marked = im.copy()
    draw = ImageDraw.Draw(marked)
    for key,offset in [('topVertical',0),('bottomVertical',896)]:
        draw.line([(x,y+offset) for y,x in enumerate(seams[key]['pathPx2x'])],fill=(20,255,50),width=2)
    draw.line([(x,y) for x,y in enumerate(seams['horizontal']['pathPx2x'])],fill=(255,170,20),width=2)
    marked.thumbnail((1024,1024))
    marked.save(dest/'seam-paths.jpg',quality=83,optimize=True)
    split = seams['topVertical']['overlapBandPx2x']
    cx = (split[0]+split[1])//2
    # Unscaled source strips, so actual 2x joins remain inspectable.
    check = Image.new('RGB',(2048,1536),(20,16,30))
    check.paste(im.crop((max(0,cx-192),0,cx+192,1536)),(0,0))
    check.paste(im.crop((0,832,min(im.width,1632),1216)),(400,0))
    check.paste(im.crop((max(0,cx-320),704,cx+320,1344)),(400,416))
    check.save(dest/'seam-check.jpg',quality=85,optimize=True)
    return down


def main():
    if (OUT/'run-summary.json').exists():
        raise SystemExit('Measurements already recorded. Review the existing report before rerunning.')
    master = baseline()
    inputs = json.loads((OUT/'inputs.json').read_text())
    log = json.loads((OUT/'generation-log.json').read_text())
    summary = {'zone':4,'set':'v3','run':'3/5','requestedChunks':CHUNKS,
        'tool':'built-in image_gen only', 'imageGenCalls':len(log), 'retries':0,
        'source':'img/map-zone4/v3/', 'repairs':False, 'measurementRuns':1,
        'qualityDecision':'Pending Claude review', 'missingDeliverables':[],
        'pendingWork':['Claude decision on sharpness/structure/seams and color fidelity',
                       'ASSEMBLE neighbouring chunk boundaries'],
        'referenceAvailability':'Both supplied Zone1 example directories missing. Brief read in full. SIFT/affine and min-cost seam precedent reused from available repo scripts and Zone4 set 1 review script.',
        'chunks':[]}
    contact = Image.new('RGB',(1536,1536),(20,16,30))
    for index,chunk in enumerate(CHUNKS):
        dest = OUT/chunk
        box = bounds(chunk)
        size = ((box[2]-box[0])*2,(box[3]-box[1])*2)
        reg = {'schemaVersion':1,'chunk':chunk,'chunkRectPx1x':box,
            'source':'img/map-zone4/v3/','repairs':False,
            'rectFormat':'[x0,y0,x1,y1], full-map master 1x, half-open',
            'matrixConvention':'nativeToContextPx1x maps native pixel centres to context-local 1x pixel centres; add context origin for global. nativeToChunkPx2x directly maps native to final chunk pixel centres.',
            'parts':{}}
        tiles,valids = {},{}
        for q,data in inputs[chunk]['parts'].items():
            context = data['contextRectPx1x']
            native_path = dest/f'{q}-native.webp'
            native = native_image(native_path)
            matrix,fit = register(np.array(master.crop(context)),native)
            tiles[q],valids[q],output_matrix = canvas_for(native,matrix,context,box)
            reg['parts'][q] = {**data, 'nativeFile':native_path.name,
                'nativeSize':[native.shape[1],native.shape[0]], 'nativeSHA256':sha(native_path),
                'contextSizePx1x':[context[2]-context[0],context[3]-context[1]],
                'overlapPx1x':64,'nativeToContextPx1x':matrix.tolist(),
                'nativeToChunkPx2x':output_matrix.tolist(),'fit':fit}
        # c5 is 819 wide: split into 410/409px cores, preserving 64px context.
        split_x = (inputs[chunk]['parts']['q11']['coreRectPx1x'][2]-box[0])*2
        lo,hi = split_x-128,split_x+128
        top,vt,st = join(tiles['q11'][:1152],tiles['q12'][:1152],valids['q11'][:1152],valids['q12'][:1152],'vertical',lo,hi)
        bottom,vb,sb = join(tiles['q21'][896:],tiles['q22'][896:],valids['q21'][896:],valids['q22'][896:],'vertical',lo,hi)
        upper = np.zeros((size[1],size[0],3),np.float32)
        lower = upper.copy()
        vu = np.zeros((size[1],size[0]),np.float32)
        vl = vu.copy()
        upper[:1152],vu[:1152] = top,vt
        lower[896:],vl[896:] = bottom,vb
        merged,coverage,sh = join(upper,lower,vu,vl,'horizontal')
        base = np.array(master.crop(box))
        base2 = np.array(Image.fromarray(base).resize(size,Image.Resampling.LANCZOS))
        uncovered = coverage<.99
        merged[uncovered] = base2[uncovered]
        merged = np.uint8(np.rint(np.clip(merged,0,255)))
        image_path = dest/f'{chunk}-2x.webp'
        Image.fromarray(merged).save(image_path,lossless=True,quality=100,method=6)
        delivered = native_image(image_path)
        seams = {'method':'min-cost DP RGB squared difference; 5x5 blurred cost; smoothstep +/-8 output px',
                 'topVertical':st,'bottomVertical':{**sb,'rowOffsetPx2x':896},'horizontal':sh,
                 'neighbourChunks':'reserved for ASSEMBLE','visualDecision':'pending Claude review'}
        down = evidence(chunk,base,delivered,seams)
        structure = probe_structure(base,down,chunk)
        residuals = [(part['fit']['residualPx1x'] or {}).get('inlierMax') for part in reg['parts'].values()]
        structure['registrationInlierMaxPx1x'] = max(value for value in residuals if value is not None) if any(value is not None for value in residuals) else None
        structure['affineUncoveredMasterFallbackFraction'] = float(uncovered.mean())
        sharpness = {'baselineMaster1xLaplacianVariance':lap(base),
            'baselineLanczos2xLaplacianVariance':lap(base2),
            'delivered2xLaplacianVariance':lap(delivered),'deliveredDownsampled1xLaplacianVariance':lap(down)}
        sharpness['ratioAtEqual1xSampling'] = sharpness['deliveredDownsampled1xLaplacianVariance']/sharpness['baselineMaster1xLaplacianVariance']
        sharpness['ratioAtEqual2xSampling'] = sharpness['delivered2xLaplacianVariance']/sharpness['baselineLanczos2xLaplacianVariance']
        sharpness['method'] = 'Full chunk grayscale CV_32F Laplacian variance; Lanczos equal-sampling comparison; generated detail only, no sharpening/noise'
        write_json(dest/'registration.json',reg)
        write_json(dest/'structure.json',structure)
        write_json(dest/'seams.json',seams)
        row = {'chunk':chunk,'outputSize':list(size),'imageGenCalls':4,
            'nativeSizes':{q:part['nativeSize'] for q,part in reg['parts'].items()},
            'sharpness':sharpness,'structureMaxProxyPx1x':structure['structureMaxProxyPx1x'],
            'structureMaxCertifiedPx1x':None,'affineUncoveredMasterFallbackFraction':float(uncovered.mean()),
            'registeredParts':sum(part['fit']['inliers']>0 for part in reg['parts'].values()),
            'removedObjectIds':[],'qualityDecision':'pending Claude review'}
        summary['chunks'].append(row)
        preview = Image.fromarray(delivered)
        preview.thumbnail((768,736))
        contact.paste(preview,((index%2)*768,(index//2)*768+32))
        ImageDraw.Draw(contact).text(((index%2)*768+8,(index//2)*768+8),chunk,fill='white')
        print(json.dumps(row),flush=True)
    contact.save(OUT/'hd-contact.jpg',quality=85,optimize=True)
    write_json(OUT/'run-summary.json',summary)


if __name__ == '__main__':
    main()
