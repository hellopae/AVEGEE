#!/usr/bin/env python3
"""Trace only zone1-2-v6 (3344x1882). Paths use a 1200x675 review grid.
Conservative colour intersection + erosion keeps rails, banks and trees out.
R=kind*40, GB=128+127*downstream; same encoding as town-flow.js.
"""
from pathlib import Path
import hashlib,json
import numpy as np
from PIL import Image,ImageDraw
from scipy.ndimage import binary_erosion
from scipy.spatial import cKDTree
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/coordination/2026-10-30-b12-fx'
# (kind, radius, downstream centreline). Independent tracing for the v6 repaint.
PATHS=[
 (2,18,[(0,119),(30,136),(65,153),(90,177),(122,187)]),
 (2,14,[(174,49),(218,57),(253,63),(295,76),(334,70)]),
 (2,13,[(303,15),(350,20),(400,33),(448,49),(470,61)]),
 (2,15,[(0,236),(22,260),(70,276),(100,300),(135,323)]),
 (2,14,[(0,311),(40,333),(80,362),(122,381),(176,402)]),
 (2,13,[(262,434),(300,423),(311,442),(287,466)]),
 (2,19,[(84,500),(113,529),(148,555),(175,575)]),
 (2,18,[(116,605),(136,628),(151,653)]),
 (3,11,[(92,0),(95,22),(91,52)]),
 (3,12,[(385,67),(389,91),(391,117)]),
 (3,10,[(510,0),(505,20),(500,40)]),
 (3,12,[(99,199),(101,225),(97,251)]),
 (3,9,[(184,331),(198,357),(199,385),(208,415)]),
 (3,9,[(217,438),(217,460),(220,482)]),
 (3,11,[(73,451),(79,479),(80,505)]),
 (3,9,[(98,566),(99,591),(100,613)]),
 (4,15,[(553,124),(529,137),(510,143)]),
 (5,18,[(509,146),(504,169),(503,190)]),
 (4,25,[(508,198),(541,211),(564,216),(536,230),(503,241)]),
 (5,10,[(499,241),(493,252),(493,260)]),
 (5,22,[(470,321),(471,351),(466,378),(468,397)]),
 (4,25,[(470,399),(490,406),(504,415)]),
 (5,9,[(389,456),(383,475)]),
 (4,22,[(382,477),(365,491),(405,499),(421,485)]),
 (5,11,[(353,510),(348,534),(346,551)]),
 (5,13,[(416,521),(411,543),(409,562)]),
 (4,33,[(822,328),(849,342),(835,357),(809,381)]),
 (5,14,[(1114,112),(1107,140),(1102,173)]),
 (4,20,[(1050,195),(1020,211),(990,231)]),
]
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 source=ROOT/'img/frontier-route/zone1-2-v6.webp'
 original=Image.open(source).convert('RGB');assert original.size==(3344,1882)
 W,H=836,470
 # Every source pixel assigned to a coarse cell must pass the colour gate.
 rgb=np.asarray(original.resize((W*4,H*4))).astype(float)
 r,g,b=rgb.transpose(2,0,1)
 lava=(r>195)&(g>55)&(g<r*.89)&(b<100)&(r>b*1.9)
 water=(b>r*1.13)&(g>r*1.10)&(b>115)&(g>105)
 masks={2:lava,3:lava,4:water,5:water}
 yy,xx=np.indices((H,W));coords=np.stack([(xx+.5)/W*1200,(yy+.5)/H*675],-1).reshape(-1,2)
 kind=np.zeros((H,W),np.uint8);dx=np.zeros((H,W));dy=np.zeros((H,W))
 for k,radius,path in PATHS:
  pts=[];vectors=[]
  for a,b in zip(path,path[1:]):
   a,b=np.array(a),np.array(b);v=b-a;v=v/np.linalg.norm(v)
   for t in np.linspace(0,1,max(2,int(np.linalg.norm(b-a)*2))):pts.append(a+(b-a)*t);vectors.append(v)
  dist,index=cKDTree(pts).query(coords)
  strict=masks[k].reshape(H,4,W,4).all(axis=(1,3))
  selected=binary_erosion(strict&(dist.reshape(H,W)<radius),iterations=1)
  vec=np.asarray(vectors)[index].reshape(H,W,2)
  kind[selected]=k;dx[selected]=vec[...,0][selected];dy[selected]=vec[...,1][selected]
 rgba=np.zeros((H,W,4),np.uint8);rgba[...,0]=kind*40;rgba[...,1]=np.rint(128+127*dx);rgba[...,2]=np.rint(128+127*dy);rgba[...,3]=255
 Image.fromarray(rgba).save(ROOT/'img/frontier-route/zone1-2-v6-flow.png')
 overlay=original.resize((1200,675)).convert('RGBA');marks=Image.new('RGBA',(W,H));pixels=np.zeros((H,W,4),np.uint8)
 pixels[(kind==2)|(kind==3)]=[255,30,180,200];pixels[kind>=4]=[0,255,255,200];marks=Image.fromarray(pixels).resize(overlay.size,Image.Resampling.NEAREST);overlay=Image.alpha_composite(overlay,marks)
 draw=ImageDraw.Draw(overlay)
 for k,_,path in PATHS:
  for a,b in zip(path,path[1:]):draw.line([tuple(a),tuple(b)],fill='yellow' if k<4 else 'white',width=1)
 overlay.convert('RGB').save(OUT/'v6-flow-overlay.png')
 (OUT/'flow-trace.json').write_text(json.dumps({'source':str(source.relative_to(ROOT)),'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'size':[W,H],'kindCells':{str(k):int((kind==k).sum()) for k in range(2,6)},'paths':PATHS},indent=2)+'\n')
if __name__=='__main__':main()
