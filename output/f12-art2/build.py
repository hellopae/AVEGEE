"""Composite bounded generated repairs; emit repeatable pixel checks and review images."""
from pathlib import Path
import json, hashlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/f12-art2'; QA=OUT/'qa'
base=Image.open(OUT/'before.png').convert('RGB')
gen=Image.open(OUT/'generated-final.png').convert('RGB')
assert base.size==gen.size==(1672,941)
# Whole visible silhouettes, independent of the old walkmask/canopy-only boxes.
boxes={1:[330,277,362,346],2:[398,320,432,363],3:[469,340,555,439],4:[527,355,594,432],6:[746,396,808,445],8:[815,364,886,431],13:[412,434,481,515],14:[484,550,518,575],15:[523,578,549,601],16:[604,585,643,626],20:[868,321,907,359],21:[916,329,944,352],22:[913,716,955,763],23:[768,701,836,764],24:[818,722,878,781],25:[1207,798,1301,921],26:[1352,522,1415,621]}
retained={1:'Rail-connected lantern tower: visible rails join its base; a structural post, not freestanding clutter.',14:'Integral vertical rock pinnacle continuous with cliff face below the landing, not a loose stone.',20:'Integral cliff pinnacle rising from continuous rock face on inside of bend.',21:'Rock teeth continuous with cliff rim beside bend; removal would change cliff/road boundary.'}
polys={
2:[(398,325),(414,320),(432,339),(426,360),(411,363),(399,348)],
3:[(469,348),(493,340),(524,344),(544,362),(555,384),(551,410),(528,434),(503,439),(475,416)],
4:[(532,362),(555,355),(576,369),(594,392),(590,416),(573,432),(547,426),(528,402),(527,381)],
6:[(746,416),(759,405),(776,396),(792,406),(808,421),(804,436),(782,445),(760,439)],
8:[(815,380),(832,364),(850,368),(857,379),(874,379),(886,397),(876,414),(867,431),(847,429),(827,418)],
13:[(412,470),(427,455),(421,442),(443,434),(465,436),(481,457),(469,476),(451,483),(449,502),(439,515),(425,512),(417,497)],
15:[(523,579),(540,578),(549,589),(543,601),(525,599)],
16:[(604,598),(615,585),(632,589),(643,603),(638,617),(621,626),(606,616)],
22:[(913,732),(925,716),(944,722),(955,739),(949,753),(935,763),(922,759)],
23:[(768,728),(779,711),(799,701),(820,709),(836,727),(830,747),(817,764),(791,758),(778,746)],
24:[(818,742),(835,727),(850,722),(869,735),(878,747),(863,762),(857,781),(839,776),(834,761),(821,756)],
25:[(1217,828),(1229,812),(1250,798),(1270,807),(1283,812),(1301,828),(1297,848),(1288,865),(1283,906),(1269,921),(1246,916),(1233,906),(1225,868)],
26:[(1352,551),(1364,536),(1379,522),(1397,532),(1415,546),(1410,564),(1401,583),(1393,610),(1379,621),(1365,602),(1361,580)]}
# Local generated crops repair remaining bare branches; never paste whole contact sheet.
residual=OUT/'residual-final.png'
if residual.exists():
 sheet=Image.open(residual).convert('RGB').resize((720,1200),Image.Resampling.LANCZOS)
 patch_boxes=[(738,357,892,450),(404,430,484,520),(1212,795,1306,925)]
 patch_polys=[[(753,408),(779,405),(802,418),(799,441),(766,443)],[(422,485),(438,476),(448,495),(445,513),(427,516)],[(1242,822),(1266,819),(1279,854),(1273,899),(1258,905),(1247,876)]]
 # Also finish both back trunks in middle panel.
 patch_polys[0]=[(749,400),(778,393),(810,393),(816,375),(847,369),(875,385),(880,417),(858,430),(822,422),(802,442),(767,445)]
 for i,(b,p) in enumerate(zip(patch_boxes,patch_polys)):
  x,y,r,bt=b; scale=min(700/(r-x),360/(bt-y)); sw,sh=round((r-x)*scale),round((bt-y)*scale)
  tile=sheet.crop((0,i*400+30,sw,i*400+30+sh)).resize((r-x,bt-y),Image.Resampling.LANCZOS)
  lay=gen.copy();lay.paste(tile,(x,y)); m=Image.new('L',base.size);ImageDraw.Draw(m).polygon(p,fill=255)
  m=m.filter(ImageFilter.BoxBlur(1));gen=Image.composite(lay,gen,m)
allowed=Image.new('L',base.size);ad=ImageDraw.Draw(allowed)
mask=Image.new('L',base.size);md=ImageDraw.Draw(mask)
for i,p in polys.items():
 x,y,r,b=boxes[i];ad.rectangle((x-12,y-12,r+11,b+11),fill=255)
 md.polygon(p,fill=255)
mask=mask.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.BoxBlur(2))
alpha=np.minimum(np.asarray(mask),np.asarray(allowed)).copy()
# Protect visible stairs, original water and rail pixels near the local edits.
protected=Image.new('L',base.size);pd=ImageDraw.Draw(protected)
for b in [(418,350,449,431),(451,508,502,557),(831,453,872,506),(882,771,920,829),(976,596,1108,674),(1195,522,1286,580),(1276,476,1336,528),(1333,829,1394,862),(1454,744,1583,785),(882,753,970,766)]:pd.rectangle(b,fill=255)
# Narrow polylines trace visible rail runs; source pixels are restored exactly.
rails=[([(469,339),(495,349),(521,360)],3), ([(529,350),(550,361),(589,374),(614,383)],3), ([(815,408),(830,411),(843,416),(862,423),(884,432)],3), ([(752,405),(763,400)],3), ([(781,743),(807,753),(832,763)],3), ([(855,752),(875,762)],3), ([(1349,527),(1360,535)],3), ([(1405,558),(1425,568)],3), ([(1217,807),(1232,811)],3), ([(1285,822),(1304,828)],3)]
for pts,width in rails:pd.line(pts,fill=255,width=width)
# Adjacent dark conifer is a separate tree, behind (left of) target bamboo 25.
pd.polygon([(1189,836),(1207,831),(1226,847),(1226,869),(1224,892),(1227,912),(1221,923),(1203,919),(1190,878)],fill=255)
# Preserve orange lantern directly below removed tree 22.
pd.polygon([(925,743),(937,743),(945,762),(932,771),(921,760)],fill=255)
src=np.asarray(base).astype('int16')
water_roi=np.zeros((941,1672),dtype=bool)
for x,y,r,b in [(520,554,660,611),(1320,575,1438,634),(1195,810,1210,933)]:water_roi[y:b,x:r]=True
water=water_roi & (src[:,:,2]>src[:,:,0]*1.2) & (src[:,:,1]>src[:,:,0]*1.2) & (src[:,:,2]>src[:,:,1]*0.9)
pa=np.asarray(protected).copy();pa[water]=255;previous=np.asarray(Image.open(OUT/'previous-edit-alpha.png').convert('L'))>0;pa[previous]=255;pa[743:745,925:929]=0;protected=Image.fromarray(pa)
keep=Image.fromarray((previous*255).astype('uint8')).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.BoxBlur(2))
alpha=(alpha.astype('float32')*(1-np.asarray(keep)/255)).round().astype('uint8')
alpha[np.asarray(protected)>0]=0
Image.fromarray(alpha).save(OUT/'edit-alpha.png');allowed.save(QA/'allowed-frames-mask.png');protected.save(QA/'protected-mask.png')
final=Image.composite(gen,base,Image.fromarray(alpha))
finish_path=OUT/'finish-final.png'
if finish_path.exists():
 sheet=Image.open(finish_path).convert('RGB').resize((720,1200),Image.Resampling.LANCZOS)
 finish_boxes=[(590,575,655,635),(760,700,960,785),(1203,797,1307,926)]
 finish_polys=[[(611,592),(624,590),(635,601),(635,617),(610,619)],[(785,709),(808,709),(819,719),(839,721),(866,720),(890,724),(890,746),(860,746),(847,743),(833,736),(816,727),(799,724),(785,720)],[(1207,829),(1228,835),(1232,900),(1236,920),(1213,922),(1207,898)]]
 for i,(box,poly) in enumerate(zip(finish_boxes,finish_polys)):
  x,y,r,bt=box;sc=min(700/(r-x),360/(bt-y));sw,sh=round((r-x)*sc),round((bt-y)*sc)
  tile=sheet.crop((0,i*400+30,sw,i*400+30+sh)).resize((r-x,bt-y),Image.Resampling.LANCZOS)
  lay=final.copy();lay.paste(tile,(x,y));m=Image.new('L',base.size);ImageDraw.Draw(m).polygon(poly,fill=255)
  if i==1:ImageDraw.Draw(m).rectangle((922,739,930,745),fill=255)
  m=m.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.BoxBlur(1))
  ma=np.minimum(np.asarray(m),np.asarray(allowed)).copy();ma[np.asarray(protected)>0]=0
  final=Image.composite(lay,final,Image.fromarray(ma))
  alpha=np.maximum(alpha,ma)
Image.fromarray(alpha).save(OUT/'edit-alpha.png')
dest=ROOT/'img/frontier-route/zone1-2-v4.webp' 
final.save(dest,'WEBP',lossless=True,method=6,exact=True)
a=np.asarray(base); decoded=Image.open(dest);b=np.asarray(decoded)
diff=np.abs(a.astype('int16')-b.astype('int16'));changed=np.any(diff,axis=2);outside=np.asarray(allowed)==0
assert decoded.mode=='RGB' and decoded.size==(1672,941)
assert not changed[outside].any();assert not changed[np.asarray(protected)>0].any();assert not changed[previous].any()
assert np.array_equal(np.asarray(final),b)
raw=dest.read_bytes();assert b'VP8L' in raw and b'VP8 ' not in raw
report={'width':1672,'height':941,'mode':decoded.mode,'encoding':'WebP lossless (VP8L)','changed_pixels':int(changed.sum()),'outside_frames_changed_pixels':int(changed[outside].sum()),'outside_frames_max_channel_diff':int(diff[outside].max()),'protected_mask_changed_pixels':int(changed[np.asarray(protected)>0].sum()),'previous_patch_changed_pixels':int(changed[previous].sum()),'lossless_roundtrip_equal':True,'source_pixel_sha256':hashlib.sha256(a.tobytes()).hexdigest(),'output_sha256':hashlib.sha256(raw).hexdigest(),'removed_ids':list(polys),'retained_structural_ids':list(retained),'note':'Pixel assertions do not establish visual acceptance; see all per-object pairs.'}
(QA/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
(OUT/'objects.json').write_text(json.dumps([{'id':i,'silhouette_bbox':b,'allowed_bbox':[b[0]-12,b[1]-12,b[2]+12,b[3]+12],'action':'retain structure' if i in retained else 'remove whole vegetation','reason':retained.get(i),'changed_pixels_in_frame':int(changed[max(0,b[1]-12):b[3]+12,max(0,b[0]-12):b[2]+12].sum())} for i,b in boxes.items()],indent=2)+'\n')
pair=Image.new('RGB',(3344,975),'#202020');d=ImageDraw.Draw(pair);d.text((10,10),'BEFORE: previous v4',fill='white');d.text((1682,10),'AFTER: F12-ART2',fill='white');pair.paste(base,(0,34));pair.paste(final,(1672,34));pair.save(QA/'before-after-full.png')
frames=base.copy();d=ImageDraw.Draw(frames)
for i,bx in boxes.items():
 x,y,r,bt=bx;d.rectangle((x-12,y-12,r+12,bt+12),outline='cyan' if i not in retained else 'orange',width=1);d.text((x,y-12),str(i),fill='white')
frames.save(QA/'frames.png')
for i,bx in boxes.items():
 x,y,r,bt=bx;bbox=(max(0,x-22),max(0,y-22),min(1672,r+22),min(941,bt+22));sz=((bbox[2]-bbox[0])*4,(bbox[3]-bbox[1])*4)
 canvas=Image.new('RGB',(sz[0]*2,sz[1]+28),'#202020');d=ImageDraw.Draw(canvas);d.text((6,7),f'{i:02d} BEFORE',fill='white');d.text((sz[0]+6,7),f'{i:02d} AFTER: '+('retain structure' if i in retained else 'remove'),fill='white')
 canvas.paste(base.crop(bbox).resize(sz,Image.Resampling.NEAREST),(0,28));canvas.paste(final.crop(bbox).resize(sz,Image.Resampling.NEAREST),(sz[0],28));canvas.save(QA/f'object-{i:02d}.png')
heat=np.zeros_like(a);heat[:,:,0]=np.where(changed,255,0);Image.fromarray(heat).save(QA/'diff.png')
print(json.dumps(report,indent=2))
