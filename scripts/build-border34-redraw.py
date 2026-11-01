#!/usr/bin/env python3
"""Rebuild the traced floor, measured widths, route-local flow and art-only occluders.
Artwork itself is generated with built-in image_gen; this script does no semantic repaint.
Coordinates use the 1672x941 gameplay/review grid, independent of the 2x raster.
"""
from pathlib import Path
import argparse
import json,hashlib,importlib.util
import numpy as np,cv2
from PIL import Image,ImageDraw
from scipy.ndimage import label,binary_erosion,binary_closing,binary_opening,binary_fill_holes
from scipy.spatial import cKDTree
ROOT=Path(__file__).resolve().parents[1]
JOB='b34'
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('evidence_dir',type=Path,help='External art evidence directory; never the game repository output/')
OUT=parser.parse_args().evidence_dir.resolve()
NUM={'b23':'23','b34':'34'}[JOB]
ASSET={'b23':'zone2-3-v4.webp','b34':'zone3-4-v2.webp'}[JOB]
MODULE={'b23':'asia-west','b34':'west-cyberhell'}[JOB]
PATHS={
'b23':[(5,14,[(110,495),(110,538),(109,575)]),(5,15,[(433,538),(439,580),(435,626)]),(5,20,[(1046,444),(1040,490),(1039,517)]),(5,16,[(1020,772),(1015,810),(1010,839)]),(4,24,[(10,606),(58,621),(130,633),(196,647),(217,674),(286,679)]),(4,26,[(226,701),(247,752),(320,790),(362,819),(418,855),(508,884),(607,926)]),(4,24,[(1023,854),(1077,877),(1143,900),(1192,928)])],
'b34':[(5,16,[(87,268),(88,309),(95,338)]),(5,15,[(203,360),(204,404),(208,435)]),(5,16,[(348,495),(350,541),(356,570)]),(5,16,[(425,684),(429,726),(435,764)]),(5,18,[(591,745),(590,789),(586,826)]),(5,18,[(1080,181),(1086,219),(1080,253)]),(4,18,[(82,249),(130,254),(154,272)]),(4,23,[(74,343),(128,357),(180,368)]),(4,23,[(214,442),(257,450),(285,479)]),(4,24,[(355,581),(381,619),(413,644),(440,678)]),(4,24,[(606,441),(665,461),(686,488),(705,520),(675,557),(620,573)]),(4,27,[(436,767),(483,800),(528,821),(585,848)]),(2,14,[(1580,453),(1588,491),(1600,526)]),(3,13,[(1629,534),(1636,576),(1640,612)]),(3,14,[(1148,891),(1155,915),(1159,938)]),(2,17,[(1431,894),(1474,920),(1510,940)])]
}
# Boxes/seeds trace actual foreground pixels, excluding beige paving. Baseline is the root/foot.
OCC={
'b23':[('stair-post', (840,366,876,415),(859,400)),('snow-fir-bend',(736,425,784,482),(761,459)),('snow-fir-lower',(1070,652,1125,710),(1098,685))],
'b34':[('snow-fir-plaza',(290,280,329,328),(308,308)),('snow-fir-entry',(186,198,215,242),(200,225)),('teal-fir-inner',(875,316,927,371),(900,345)),('snow-fir-plaza-front',(405,300,445,353),(428,333)),('plaza-rail-post',(916,700,952,756),(933,740))]
}
PATHS['b34'] += [(3,18,[(1508,402),(1509,442),(1512,482)]),(3,18,[(1647,496),(1644,548),(1655,584)]),(2,26,[(1312,680),(1337,697),(1351,725)]),(3,18,[(1437,888),(1437,913),(1437,940)]),(3,18,[(1610,865),(1612,906),(1618,939)])]
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def main():
 row=json.loads((OUT/'geometry-original.json').read_text());polygons=json.loads((OUT/'floor-polygons.json').read_text())
 floor=Image.new('L',(1672,941));d=ImageDraw.Draw(floor)
 for polygon in polygons:d.polygon([tuple(p) for p in polygon],fill=255)
 if JOB=='b34':
  for t in row['ambient']['trees']:
   x,y=t['x']*1672,t['y']*941;d.ellipse((x-4,y-3,x+4,y+3),fill=0)
 mask=np.asarray(floor)>0;labs,components=label(mask)
 if components>1:
  sizes=np.bincount(labs.ravel());sizes[0]=0;largest=int(sizes.argmax());assert mask.sum()-sizes[largest]<20
  mask=labs==largest;floor=Image.fromarray((mask*255).astype('uint8'));_,components=label(mask)
 assert components==1,components
 corridor=json.loads((OUT/'corridor.json').read_text())
 flat=mask.ravel().astype(np.uint8);edges=np.r_[0,np.flatnonzero(flat[1:]!=flat[:-1])+1,len(flat)]
 runs=np.diff(edges).tolist()
 if flat[0]:runs=[0]+runs
 module=ROOT/f'src/frontier-walkmask-{MODULE}-redraw.js'
 module.write_text('// '+JOB.upper()+'-REDRAW: floor traced on the 2x repaint; original owner data is retained separately.\n'+f'export const BORDER{NUM}_REDRAW_MASK=Object.freeze('+json.dumps({'cols':1672,'rows':941,'runs':runs},separators=(',',':'))+');\n'+f'export const BORDER{NUM}_REDRAW_CORRIDOR=Object.freeze('+json.dumps(corridor,separators=(',',':'))+'.map(Object.freeze));\n')
 floor.save(OUT/'walkmask.png');floor.save(ROOT/f'tests/fixtures/{JOB}-redraw-floor.png')
 spec=importlib.util.spec_from_file_location('measure',ROOT/'scripts/measure-border12-width.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
 pts=np.asarray(corridor)*[1672,941]
 before=np.zeros(1672*941,bool);offset=0;val=0
 for length in row['walkMask']['runs']:
  before[offset:offset+length]=val;offset+=length;val=1-val
 before=before.reshape((941,1672))
 report={'method':'B12 medial-ridge Euclidean distance-transform diameter, connected perpendicular sections, ~1px arc sampling; all values in 1672x941 world px; no endpoint trimming','floorPixels':int(mask.sum()),'components':components,'main':m.measure(mask,pts),'before':m.measure(before,np.asarray(row['corridor'])*[1672,941]),'sections':[]}
 for i,(a,b) in enumerate(zip([0]+row['checkpointVertex'],row['checkpointVertex']+[len(pts)-1])):report['sections'].append({'section':i+1,**m.measure(mask,pts[a:b+1])})
 report['meetsWidthThresholds']=all(s['p10']>=40 and s['median']>=48 and not s['offFloor'] for s in report['sections'])
 assert report['meetsWidthThresholds'],report
 (OUT/'width-report.json').write_text(json.dumps(report,indent=2)+'\n')
 source=ROOT/'img/frontier-route'/ASSET;original=Image.open(source).convert('RGB');assert original.size==(3344,1882)
 image=original.resize((1672,941)).convert('RGBA');overlay=np.zeros((941,1672,4),np.uint8);overlay[mask]=[0,255,100,80];image=Image.alpha_composite(image,Image.fromarray(overlay));draw=ImageDraw.Draw(image);draw.line([tuple(p) for p in pts],fill='magenta',width=2)
 for i in row['checkpointVertex']:
  x,y=pts[i];draw.ellipse((x-6,y-6,x+6,y+6),outline='yellow',width=2)
 image.save(OUT/'mask-overlay.png')
 # Flow selection uses authored paths intersected with conservative material colors from the NEW raster.
 W,H=836,470;rgb=np.asarray(original.resize((W*4,H*4))).astype(float);r,g,b=rgb.transpose(2,0,1)
 water=(b>r*1.10)&(g>r*1.05)&(b>115)&(g>100);lava=(r>195)&(g>55)&(g<r*.89)&(b<100)&(r>b*1.9)
 yy,xx=np.indices((H,W));coords=np.stack([(xx+.5)/W*1672,(yy+.5)/H*941],-1).reshape(-1,2)
 kinds=np.zeros((H,W),np.uint8);dx=np.zeros((H,W));dy=np.zeros((H,W))
 for k,radius,path in PATHS[JOB]:
  points=[];vectors=[]
  for a,b in zip(path,path[1:]):
   a,b=np.array(a),np.array(b);v=(b-a)/np.linalg.norm(b-a)
   for t in np.linspace(0,1,max(2,int(np.linalg.norm(b-a)*2))):points.append(a+(b-a)*t);vectors.append(v)
  dist,index=cKDTree(points).query(coords);material=water if k>=4 else lava
  strict=material.reshape(H,4,W,4).all(axis=(1,3));selected=strict&(dist.reshape(H,W)<radius)
  if k>=4:selected=binary_erosion(selected,iterations=1)
  vec=np.asarray(vectors)[index].reshape(H,W,2);kinds[selected]=k;dx[selected]=vec[...,0][selected];dy[selected]=vec[...,1][selected]
 # Never spawn surface flow on the traced walkable road.
 small=np.asarray(floor.resize((W,H),Image.Resampling.NEAREST))>0;kinds[small]=0
 rgba=np.zeros((H,W,4),np.uint8);rgba[...,0]=kinds*40;rgba[...,1]=np.rint(128+127*dx);rgba[...,2]=np.rint(128+127*dy);rgba[...,3]=255
 Image.fromarray(rgba).save(ROOT/'img/frontier-route'/ASSET.replace('.webp','-flow.png'))
 overlay=np.zeros((H,W,4),np.uint8);overlay[(kinds==2)|(kinds==3)]=[255,40,180,190];overlay[kinds>=4]=[0,255,255,190]
 Image.alpha_composite(original.resize((1672,941)).convert('RGBA'),Image.fromarray(overlay).resize((1672,941),Image.Resampling.NEAREST)).save(OUT/'flow-overlay.png')
 trace={'source':str(source.relative_to(ROOT)),'sha256':sha(source),'size':[W,H],'kindCells':{str(k):int((kinds==k).sum()) for k in range(2,6)},'paths':PATHS[JOB],'roadCells':int(np.sum((kinds>0)&small))}
 (OUT/'flow-trace.json').write_text(json.dumps(trace,indent=2)+'\n')
 # Segment and clip actual art in chosen foreground ROIs. No substitute sprites or opaque blocks.
 rgb=np.asarray(original);hsv=cv2.cvtColor(rgb,cv2.COLOR_RGB2HSV).astype(float);h,s,v=hsv[...,0]*2,hsv[...,1]/255,hsv[...,2]/255
 paving=(h>12)&(h<48)&(s>.10)&(s<.50)&(v>.62);pieces=[];occ=original.resize((1672,941)).convert('RGBA');draw=ImageDraw.Draw(occ)
 occluders=OCC[JOB]
 if JOB=='b34':
  occluders=[]
  for t in row['ambient']['trees']:
   if t['id'] in [3,6,8,11,12,13,14,15,19,24,25,27,28]:
    x,y=t['x']*1672,t['y']*941;occluders.append((f"tree-{t['id']}",(x-19,y-51,x+19,y+3),(x,y-17)))
 for name,box,seed in occluders:
  x0,y0,x1,y1=[int(n*2) for n in box];sx,sy=[int(n*2) for n in seed]
  region=np.zeros(paving.shape,bool);region[y0:y1,x0:x1]=True
  obj=binary_opening(binary_closing(region&~paving,iterations=2),iterations=1);labs,n=label(obj);which=labs[sy,sx]
  if not which:
   near=labs[max(y0,sy-12):min(y1,sy+12),max(x0,sx-10):min(x1,sx+10)];counts=np.bincount(near.ravel());counts[0]=0;which=int(counts.argmax())
   if not which:raise ValueError(f'{name}: no foreground in seed ROI')
  blob=binary_fill_holes(labs==which);cs,_=cv2.findContours(blob.astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE);contour=max(cs,key=cv2.contourArea);poly=cv2.approxPolyDP(contour,1.6,True)[:,0,:].tolist()
  piece={'id':name,'baseline':max(p[1] for p in poly),'polygon':poly};pieces.append(piece);draw.polygon([tuple(np.array(p)/2) for p in poly],outline='magenta',width=2)
 (OUT/'occlusion-overlay.png').write_bytes(b'')
 occ.save(OUT/'occlusion-overlay.png')
 data={'routeId':row['id'],'size':[3344,1882],'pieces':pieces}
 (ROOT/f'src/route-occlusion-data/{MODULE}-redraw.js').write_text('// '+JOB.upper()+'-REDRAW: actual painted foreground, segmented from '+ASSET+'.\nexport default Object.freeze('+json.dumps(data,separators=(',',':'))+');\n')
 (OUT/'art-audit.json').write_text(json.dumps({'asset':str(source.relative_to(ROOT)),'size':original.size,'sha256':sha(source),'maskSHA256':sha(OUT/'walkmask.png'),'occluders':len(pieces)},indent=2)+'\n')
 print(json.dumps({'job':JOB,'width':report['main'],'floor':report['floorPixels'],'flow':trace['kindCells'],'occluders':len(pieces)}))
if __name__=='__main__':main()
