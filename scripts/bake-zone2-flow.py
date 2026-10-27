#!/usr/bin/env python3
"""Conservative registered town surface data; never repaints terrain/navigation.

Run from any directory. --debug DIR saves a diagnostic overlay and report.
Uses the existing N4 flow encoding and engine. Registered channel centre lines
are shared with Zone1 where aligned, with new water paths for the repaints,
then narrowed by surface colour and the selected zone's actual walkable floor.
No dilation/closing can reopen excluded pixels.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import subprocess
import cv2
import numpy as np
from scipy.spatial import cKDTree

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('zone1_flow',ROOT/'scripts/bake-town-flow.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
W,H=1536,1024
LAVA_PATHS=base.LAVA_PATHS
WATER_PATHS=base.ICE_PATHS+[
 [(0,740),(280,735),(550,739),(850,739),(1100,738),(1340,744),(1535,739)],
 [(1255,225),(1250,267),(1200,300),(1130,319),(1070,348),(1010,380)],
]
LAVA_FALLS=[[224,12,253,81],[349,129,395,191],[52,219,98,280],
 [346,265,395,321],[336,394,384,444],[405,503,468,575],[373,633,406,683]]
WATER_FALLS=[[1365,47,1428,143],[1240,207,1272,251],
 [1190,481,1254,605],[1437,330,1488,402]]

def corridor(paths,max_dist):
 pts,_=base.densify(paths);yy,xx=np.indices((H,W))
 dist,_=cKDTree(pts).query(np.stack([xx.ravel(),yy.ravel()],1))
 return dist.reshape(H,W)<max_dist

def floor_mask(zone):
 code="""import {applyTownZoneLayout,townFloorAt} from './src/town-layout.js';
applyTownZoneLayout(ZONE);const b=Buffer.alloc(1536*1024);
for(let y=0;y<1024;y++)for(let x=0;x<1536;x++)b[y*1536+x]=+townFloorAt((x+.5)*2.5,(y+.5)*2.5);
process.stdout.write(b);"""
 code=code.replace('ZONE',json.dumps(zone))
 return np.frombuffer(subprocess.check_output(['node','--input-type=module','-e',code],cwd=ROOT),np.uint8).reshape(H,W)

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--debug',type=Path)
 ap.add_argument('--zone',choices=['asia','west'],default='asia');args=ap.parse_args()
 folder,filename={'asia':('map-zone2/v2','flow-v2.png'),'west':('map-zone3/v1','flow-v1.png')}[args.zone]
 base.GROUND_DIR=str(ROOT/'img'/folder);im=base.load_full()
 b,g,r=[im[...,i].astype(np.int32) for i in range(3)]
 yy,xx=np.indices((H,W));floor=floor_mask(args.zone)
 forbidden=cv2.dilate(floor,base.ell(5))>0
 lava=(r>=235)&(g>=100)&(g<r*.94)&(b<105)&(xx<550)&(yy<705)&corridor(LAVA_PATHS,70)
 # Zone3 retains the registered channel geometry but the entire river system is
 # cyan water. Include the former west lava channels as cold-water corridors.
 water_paths=WATER_PATHS+(LAVA_PATHS if args.zone=='west' else [])
 water=(b>r+45)&(g>r+30)&(g>80)&(b>110)&corridor(water_paths,55)
 if args.zone=='west':
  lava[:]=False
  # Blue shadows on white snow are not flowing water.
  water&=(r<140)&(b>r+70)&(g>r+45)
 masks={}
 for name,m in [('lava',lava),('ice',water)]:
  m=np.asarray(m&~forbidden,np.uint8)
  masks[name]=cv2.erode(base.keep_big(m,30),base.ell(3))
 masks['lavafall']=masks['lava']&base.rect_mask(LAVA_FALLS)
 masks['icefall']=masks['ice']&base.rect_mask(WATER_FALLS+(LAVA_FALLS if args.zone=='west' else []))
 masks['lava']&=1-masks['lavafall'];masks['ice']&=1-masks['icefall']
 kind=np.zeros((H,W),np.uint8);dx=np.zeros((H,W),np.float32);dy=np.zeros_like(dx)
 for name,k in [('lava',2),('lavafall',3),('ice',4),('icefall',5)]:
  m=masks[name]>0;kind[m]=k
  if name.endswith('fall'):dy[m]=1
  else:
   fx,fy=base.flow_field(m,LAVA_PATHS if name=='lava' else water_paths)
   fx,fy=base.smooth(fx,fy,m);dx[m]=fx[m];dy[m]=fy[m]
 out=np.zeros((H,W,3),np.uint8);out[...,2]=kind*40
 out[...,1]=np.clip(128+np.round(dx*127),1,255);out[...,0]=np.clip(128+np.round(dy*127),1,255)
 dest=ROOT/'img'/folder/filename;cv2.imwrite(str(dest),out,[cv2.IMWRITE_PNG_COMPRESSION,9])
 report={'counts':{k:int(np.count_nonzero(v)) for k,v in masks.items()},'onWalkableFloor':int(np.count_nonzero((kind>0)&(floor>0))),'bytes':dest.stat().st_size}
 assert report['onWalkableFloor']==0
 print(json.dumps(report))
 if args.debug:
  args.debug.mkdir(parents=True,exist_ok=True);ov=im.copy()
  for k,c in [(2,[0,190,255]),(3,[0,255,255]),(4,[255,180,0]),(5,[255,255,0])]:
   m=kind==k;ov[m]=(.3*ov[m]+.7*np.array(c)).astype(np.uint8)
  cv2.imwrite(str(args.debug/'flow-overlay.png'),ov)
  (args.debug/'report.json').write_text(json.dumps(report,indent=2))

if __name__=='__main__':main()
