"""Trace only visible cloud valleys at the heaven gate; keep protected terrain."""
from pathlib import Path
import json,cv2,numpy as np
from PIL import Image,ImageDraw
R=Path(__file__).resolve().parents[1]
im=np.array(Image.open(R/'master-v5.webp').convert('RGB'));H,W=im.shape[:2]
# Coordinates on the 1500x1000 review proxy. Insets deliberately avoid gold trees,
# the plaza rim, stairs, bridge, cyan water, and all snow east of x=1195.
polys=[[(804,88),(821,80),(833,85),(832,103),(818,118),(804,123),(797,111)],[(1147,87),(1174,87),(1185,99),(1180,123),(1169,139),(1152,131),(1139,115)],[(838,214),(850,216),(863,222),(879,221),(893,231),(895,245),(879,250),(859,239),(845,237)],[(977,282),(986,279),(995,287),(993,299),(984,304),(975,295)]]
roi=np.zeros((H,W),np.uint8)
for p in polys:cv2.fillPoly(roi,[np.round(np.array(p)*[W/1500,H/1000]).astype('int32')],255)
r,g,b=im.transpose(2,0,1).astype(float);hsv=cv2.cvtColor(im,cv2.COLOR_RGB2HSV)
sel=(r>135)&(g>125)&(b>139)&(hsv[:,:,1]<76)&(b>r*.83)&(g<r*1.08)
m=(sel&(roi>0)).astype('uint8')*255
m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8));m=cv2.erode(m,np.ones((3,3),np.uint8))
m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((11,11),np.uint8))
# Cloud shadows are part of the volume. Smooth the color gate spatially and
# feather inward at the traced boundary, without painting past the ROI.
m=cv2.GaussianBlur(m,(0,0),4)
inset=cv2.distanceTransform((roi>0).astype('uint8'),cv2.DIST_L2,3)
m=np.rint(m*np.clip(inset/14,0,1)).astype('uint8');m[roi==0]=0
# Region geometry itself excludes traversable land; color gate avoids foliage/rock.
yy,xx=np.where(m>0);x,y,x2,y2=map(int,[xx.min(),yy.min(),xx.max()+1,yy.max()+1])
Image.fromarray(m).save(R/'masks/cloud-sea-1x.png');Image.fromarray(m[y:y2,x:x2]).save(R/'masks/regions/cloud-sea.png')
j=json.loads((R/'regions.json').read_text());j['regions']=[v for v in j['regions'] if v['id']!='cloud-sea']
j['regions'].append({'id':'cloud-sea','kind':'cloud-sea','flowDir':[0,0],'mask':'masks/regions/cloud-sea.png','maskRectPx':[x,y,x2-x,y2-y],'rectWorld':[x*3840/W,y*2560/H,(x2-x)*3840/W,(y2-y)*2560/H],'coveredPixels':len(xx),'polygonProxy1500':polys,'boundaryAuthority':'inset hand-traced cloud valleys AND pale cloud color; raster mask authoritative','exclusions':'plaza, paths, stairs, gold trees, bridge, snow right of x1195 proxy'})
j['omitted']=[v for v in j['omitted'] if 'cloud deck' not in v];(R/'regions.json').write_text(json.dumps(j,indent=2,ensure_ascii=False))
a=im.copy();a[m>0]=(a[m>0]*.35+np.array([230,50,240])*.65).astype('uint8');Image.fromarray(a).resize((1500,1000)).save(R/'cloud-mask-review.jpg',quality=92)
print('cloud pixels',len(xx),'rect',[x,y,x2-x,y2-y])
