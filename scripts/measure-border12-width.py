#!/usr/bin/env python3
"""Euclidean distance-transform diameters at arc-length sampled centerlines.
All results are in the original 1672 x 941 world pixels, independent of art size.
This measures a traced floor mask, not automatic semantic recognition of artwork.
"""
import json,re,argparse
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt
ROOT=Path(__file__).resolve().parents[1]
WEST=[[450,341],[430,390],[394,438],[456,458],[483,505],[525,535],[517,549],[552,577],[600,600]]
def samples(points):
    result=[]
    for a,b in zip(points,points[1:]):
        a,b=np.array(a),np.array(b)
        n=max(1,int(np.linalg.norm(b-a)))
        result.extend(a+(b-a)*t for t in np.linspace(0,1,n,endpoint=False))
    return np.asarray(result).round().astype(int)
def measure(mask,points):
    d=distance_transform_edt(mask)
    xy=samples(points)
    # Find the medial ridge within each connected perpendicular floor cross-section.
    # Keep gameplay-line clearance separately: story anchors need not lie on the ridge.
    tangent=np.gradient(xy.astype(float),axis=0)
    norms=np.linalg.norm(tangent,axis=1);norms[norms==0]=1
    normal=np.column_stack((-tangent[:,1],tangent[:,0]))/norms[:,None]
    widths=[]
    for point,n in zip(xy,normal):
        cross=np.rint(point+np.arange(-80,81)[:,None]*n).astype(int)
        cross[:,0]=np.clip(cross[:,0],0,1671);cross[:,1]=np.clip(cross[:,1],0,940)
        ds=d[cross[:,1],cross[:,0]]
        if ds[80]==0:widths.append(0);continue
        lo=hi=80
        while lo>0 and ds[lo-1]>0:lo-=1
        while hi<160 and ds[hi+1]>0:hi+=1
        widths.append(2*ds[lo:hi+1].max())
    values=np.asarray(widths)
    clearance=2*d[xy[:,1],xy[:,0]]
    return dict(gameplayClearanceP10=float(np.percentile(clearance,10)),samples=len(values),p10=float(np.percentile(values,10)),median=float(np.median(values)),minimum=float(values.min()),offFloor=int(np.sum(values==0)))
def main():
    parser=argparse.ArgumentParser();parser.add_argument('mask');parser.add_argument('output');parser.add_argument('--corridor');args=parser.parse_args()
    mask=np.asarray(Image.open(args.mask).convert('L').resize((1672,941),Image.Resampling.NEAREST))>0
    route=json.loads(re.search(r'DUNGEON_CORRIDOR = Object.freeze\((\[.*?\])\.map',(ROOT/'src/route-geometry.js').read_text())[1])
    if args.corridor:route=json.loads(Path(args.corridor).read_text())
    route=np.array(route)*[1672,941]
    report={'method':'2 * scipy.ndimage.distance_transform_edt on medial ridge of connected normal cross-sections at ~1px arc-length samples; 1672x941 scale, no endpoint trimming; gameplay clearance reported separately','main':measure(mask,route),'west':measure(mask,WEST),'thresholds':{'p10':40,'median':48}}
    report['meetsWidthThresholds']=all(report[k]['p10']>=40 and report[k]['median']>=48 and report[k]['offFloor']==0 for k in ['main','west'])
    Path(args.output).write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if __name__=='__main__':main()
