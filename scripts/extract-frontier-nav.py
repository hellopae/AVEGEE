#!/usr/bin/env python3
"""Extract E2 polygons in runtime background coordinates (Python + OpenCV + NumPy).
Read-only inputs; --write-nav replaces only FRONTIER_NAV, never pathfinding code.
Run: python3 scripts/extract-frontier-nav.py --write-nav
"""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {'th': 'Map-Zone1-3.jpg', 'asia': 'Map-Zone2-4.jpg', 'west': 'Map-Zone3-5.jpg', 'cyberhell': 'Map-Zone4-w.jpg'}
# Painted standees are transient blockers, not geometry. These boxes cover only
# the two standees beside the top gate and characters on the central floor.
ACTORS = [(0.40, 0.16, 0.45, 0.275), (0.555, 0.16, 0.59, 0.275),
          (0.47, 0.28, 0.505, 0.365)]

def actor_boxes(zone):
    if zone == 'cyberhell':
        return [(0.47, 0.30, 0.51, 0.43)]
    return ACTORS + {
        'th': [(0.36, 0.62, 0.435, 0.77)],
        'asia': [(0.57, 0.60, 0.65, 0.79)],
        'west': [(0.55, 0.64, 0.65, 0.79)]
    }[zone]

def rect(mask, bounds, value):
    h, w = mask.shape
    x1,y1,x2,y2 = bounds
    mask[round(y1*h):round(y2*h),round(x1*w):round(x2*w)] = value

def register(bg, shot):
    sift = cv2.SIFT_create(nfeatures=15000)
    ka, da = sift.detectAndCompute(bg, None)
    kb, db = sift.detectAndCompute(shot, None)
    good = [a for a,b in cv2.BFMatcher().knnMatch(da, db, k=2) if a.distance < .70*b.distance]
    pa = np.float32([ka[m.queryIdx].pt for m in good])
    pb = np.float32([kb[m.trainIdx].pt for m in good])
    matrix, inliers = cv2.estimateAffinePartial2D(pa, pb, method=cv2.RANSAC, ransacReprojThreshold=3)
    if matrix is None or inliers.sum() < 100:
        raise ValueError('Cannot reliably register screenshot to runtime background')
    error = np.linalg.norm(pa @ matrix[:,:2].T + matrix[:,2] - pb, axis=1)[inliers.ravel() == 1]
    h,w = bg.shape[:2]
    inv = cv2.invertAffineTransform(matrix)
    aligned = cv2.warpAffine(shot, inv, (w,h))
    valid = cv2.warpAffine(np.full(shot.shape[:2],255,np.uint8), inv, (w,h)) > 250
    return aligned, valid, {'background_to_screenshot': matrix.tolist(),
        'inliers': int(inliers.sum()), 'median_registration_error_px': float(np.median(error)),
        'background_size': [w,h], 'screenshot_size': [shot.shape[1],shot.shape[0]]}

def extract(bg, aligned, valid, zone):
    # Differential red detection avoids classifying original Thai flames as paint.
    a,b = bg.astype(float), aligned.astype(float)
    d = b-a
    threshold = 10 if zone == "th" else 16
    red = ((d[:,:,2] > threshold) & (d[:,:,2]-(d[:,:,0]+d[:,:,1])/2 > threshold)
           & (b[:,:,2]-np.maximum(b[:,:,0],b[:,:,1]) > 20) & valid).astype(np.uint8)*255
    red = cv2.medianBlur(red, 5)
    red = cv2.morphologyEx(red, cv2.MORPH_CLOSE, np.ones((7,7),np.uint8))
    # Background not covered by screenshot is unknown, not automatically walkable.
    red[~valid] = 255
    for box in actor_boxes(zone):
        rect(red, box, 0)
    # Keep floor connected to the main courtyard. Bright highlights and HUD
    # punched into the painted perimeter do not become detached walkable islands.
    n, labels, stats, _ = cv2.connectedComponentsWithStats(255-red)
    main = 1 + np.argmax(stats[1:,cv2.CC_STAT_AREA])
    floor = (labels == main).astype(np.uint8)*255
    # Ignore tiny red JPEG specks / character fragments, retain permanent fences.
    contours, hierarchy = cv2.findContours(floor, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    for i,c in enumerate(contours):
        if hierarchy[0,i,3] >= 0 and cv2.contourArea(c) < 500:
            cv2.drawContours(floor,[c],-1,255,-1)
    return floor, red

def geometry(floor):
    h,w = floor.shape
    contours, hierarchy = cv2.findContours(floor, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    outer_i = max((i for i in range(len(contours)) if hierarchy[0,i,3] < 0), key=lambda i: cv2.contourArea(contours[i]))
    def simplify(c):
        points = cv2.approxPolyDP(c, .0025*w, True).reshape(-1,2)
        return [[round(float(x)/w,6),round(float(y)/h,6)] for x,y in points]
    return {'outer': simplify(contours[outer_i]), 'holes': [simplify(c) for i,c in enumerate(contours) if hierarchy[0,i,3] == outer_i and cv2.contourArea(c) >= 500]}

def raster(nav, shape):
    h,w = shape
    mask = np.zeros(shape,np.uint8)
    def points(p):
        return np.rint(np.asarray(p)*[w,h]).astype(np.int32)
    cv2.fillPoly(mask,[points(nav['outer'])],255)
    for p in nav['holes']:
        cv2.fillPoly(mask,[points(p)],0)
    return mask

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, default=Path('/Users/agapae/Documents/Work PAE/Claude/AVEGEE/files/UI map'))
    parser.add_argument('--write-nav',action='store_true')
    args=parser.parse_args()
    cv2.setNumThreads(2)
    cv2.setRNGSeed(0)
    out=ROOT/'output/Codex/e2-preview'
    out.mkdir(parents=True,exist_ok=True)
    navs, refs, meta = {}, {}, {}
    for zone,name in SOURCES.items():
        bg=cv2.imread(str(ROOT/f'img/theme-v4/frontier-{zone}.webp'))
        shot=cv2.imread(str(args.source_dir/name))
        if shot is None: raise FileNotFoundError(args.source_dir/name)
        aligned,valid,info=register(bg,shot)
        floor,red=extract(bg,aligned,valid,zone)
        reference=floor.copy()
        # Explicit brief-required portal corridors; west paint covers lower stairs.
        rect(floor,(.475,.10,.525,.19),255)
        rect(floor,(.465,.80,.535,1),255)
        if zone == "th":
            # Edge clearance at the left tower (+6 px) and right fence foot
            # (+16 px <= 1% background width), retaining conservative edge clearance.
            rect(floor,(.197,.32,.203,.37),0)
            rect(floor,(.747,.45,.787,.482),0)
        navs[zone]=geometry(floor)
        refs[zone]=(reference,red,valid,aligned,floor.copy())
        meta[zone]={'source':name,**info,'simplification_epsilon_px': .0025*bg.shape[1]}
    target=ROOT/'src/frontier-navigation.js'
    if args.write_nav:
        text=target.read_text()
        start=text.index('function inPolygon')
        header='// Background-normalized E2 navigation, extracted 2026-10-08.\n'
        header+='// th: Map-Zone1-3.jpg; asia: Map-Zone2-4.jpg; west: Map-Zone3-5.jpg.\n'
        header+='// cyberhell: approved Map-Zone4-w.jpg red-mask source.\n'
        header+='// Regenerate with scripts/extract-frontier-nav.py --write-nav; portals and actors are documented there.\n'
        body = 'export const FRONTIER_NAV = {\n'
        for zone,nav in navs.items():
            body += ' '+zone+': {\n  outer: '+json.dumps(nav['outer'],separators=(',',':'))+',\n  holes: '+json.dumps(nav['holes'],separators=(',',':'))+'\n },\n'
        target.write_text(header+body+'};\n'+text[start:])
    # Always preview actual exported runtime polygons, including if hand-edited.
    actual=json.loads(subprocess.check_output(['node','--input-type=module','-e',
        "import {FRONTIER_NAV} from './src/frontier-navigation.js'; console.log(JSON.stringify(FRONTIER_NAV));"],cwd=ROOT))
    for zone,nav in actual.items():
        bg=cv2.imread(str(ROOT/f'img/theme-v4/frontier-{zone}.webp'))
        floor=raster(nav,bg.shape[:2]); blocked=floor==0
        overlay=bg.copy(); overlay[blocked]=(.40*bg[blocked]+.60*np.array([45,55,255])).astype(np.uint8)
        cv2.imwrite(str(out/f'frontier-{zone}-overlay.png'),overlay)
        cv2.imwrite(str(out/f'frontier-{zone}-walkable.png'),floor)
        ref,red,valid,aligned,unsimplified=refs[zone]
        def boundary(mask):
            edge=np.zeros(mask.shape,np.uint8)
            contours,_=cv2.findContours(mask,cv2.RETR_LIST,cv2.CHAIN_APPROX_NONE)
            cv2.drawContours(edge,contours,-1,255,1)
            return edge
        before,after=boundary(unsimplified),boundary(floor)
        dt_before=cv2.distanceTransform(255-before,cv2.DIST_L2,cv2.DIST_MASK_PRECISE)
        dt_after=cv2.distanceTransform(255-after,cv2.DIST_L2,cv2.DIST_MASK_PRECISE)
        meta[zone]["max_simplification_boundary_error_px"]=float(max(dt_before[after>0].max(),dt_after[before>0].max()))
        # Ignore UI-covered pixels and transient actors when measuring source agreement.
        measured=valid.astype(np.uint8)*255
        for box in actor_boxes(zone)+[(0,0,.37,.11),(.88,0,1,.13),(0,.79,.22,1),(.82,.94,1,1)]:
            rect(measured,box,0)
        scope=measured>0
        disagreement=(floor>0)!=(ref>0)
        meta[zone]['runtime_geometry_sha256']=hashlib.sha256(json.dumps(nav,separators=(',',':')).encode()).hexdigest()
        meta[zone]['measured_pixels']=int(scope.sum())
        meta[zone]['excluded_or_unobserved_percent']=float(100*(1-scope.mean()))
        meta[zone]['mismatch_percent']=float(100*disagreement[scope].mean())
        meta[zone]['raw_color_mismatch_percent']=float(100*((floor==0)!=(red>0))[scope].mean())
        meta[zone]['outer_vertices']=len(nav['outer'])
        meta[zone]['hole_vertices']=[len(p) for p in nav['holes']]
        cv2.imwrite(str(out/f'frontier-{zone}-reference-walkable.png'),ref)
        comparison=aligned.copy(); comparison[disagreement & scope]=[255,0,255]
        cv2.imwrite(str(out/f'frontier-{zone}-comparison.png'),comparison)
    (out/'extraction-metrics.json').write_text(json.dumps(meta,indent=2)+'\n')
    print(json.dumps(meta,indent=2))

if __name__=='__main__': main()
