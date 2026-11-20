from PIL import Image, ImageDraw, ImageFilter
import numpy as np
from pathlib import Path
D=Path(__file__).resolve().parent
ROOT=D.parents[3]
source=Image.open(D/'inputs/original.webp').convert('RGBA')
generated=Image.open(D/'inputs/generated.webp').convert('RGBA')
output_sheet=Image.new('RGBA',(5120,640))
records=[]
# Source and destination hat/feet landmarks after resampling generated canvas to 640.
landmarks=[(245,568,250,568),(244,568,250,574),(247,570,250,572),(253,568,257,572),(247,568,250,568),(256,570,255,570),(191,545,260,570),(236,568,250,568)]
# Hat silhouette; all original red skin/black hair below this boundary is protected.
hats=[[(179,289),(285,250),(326,280),(325,314),(307,337),(262,338),(244,323),(187,343)],[(194,281),(283,248),(326,272),(330,309),(308,338),(265,339),(246,322),(196,340)],[(204,268),(283,248),(315,272),(320,302),(303,335),(263,335),(247,320),(211,325)],[(185,300),(286,257),(329,284),(329,318),(312,344),(272,343),(250,328),(194,349)],[(202,282),(302,250),(346,277),(348,315),(328,344),(284,340),(266,323),(208,345)],[(211,285),(312,254),(357,281),(358,316),(337,348),(296,343),(276,326),(216,344)],[(192,302),(300,260),(344,287),(346,322),(323,350),(281,347),(263,330),(199,353)],[(177,291),(280,250),(322,280),(320,315),(305,337),(258,337),(241,322),(185,343)]]
# Necklines bound body clothing away from all face and hair pixels.
bodies=[[(186,382),(221,392),(268,405),(287,397),(326,414),(350,574),(120,574),(133,482),(174,446)],[(203,393),(224,403),(266,387),(319,347),(350,379),(338,444),(349,577),(129,580),(137,489),(204,450)],[(167,348),(191,328),(217,343),(251,383),(284,402),(317,397),(346,575),(133,581),(139,486),(199,451),(172,410)],[(206,398),(238,410),(280,418),(315,402),(347,430),(354,576),(126,581),(135,494),(206,451)],[(210,385),(240,405),(286,419),(316,407),(353,427),(350,573),(125,578),(133,483),(207,451)],[(209,383),(247,404),(292,419),(317,408),(351,437),(353,575),(122,578),(125,491),(205,449)],[(203,399),(242,412),(285,424),(317,414),(346,446),(346,577),(115,579),(122,493),(199,457)],[(186,383),(220,394),(266,406),(286,399),(325,416),(350,574),(122,574),(135,484),(175,447)]]
# Weapons/handles crossing garments must remain source pixels.
weapon_polys=[[(220,449),(278,404),(452,280),(457,309),(315,421),(323,444),(284,452),(251,483),(218,480)],[(57,214),(100,212),(259,302),(311,306),(356,300),(364,337),(365,361),(415,377),(416,426),(374,427),(350,385),(329,376),(321,348),(265,329)],[(219,133),(267,128),(275,169),(229,291),(230,320),(210,341),(188,355),(179,339),(185,292)],[(284,470),(326,427),(494,279),(507,298),(380,434),(373,466),(345,472),(306,494),(282,489)],[(305,450),(340,398),(377,391),(382,410),(568,410),(566,453),(383,454),(367,470),(337,464),(315,470)],[(307,476),(321,451),(348,451),(351,472),(510,546),(510,573),(338,504),(317,500)],[(313,481),(324,446),(347,445),(363,475),(524,560),(525,587),(344,515),(320,511)],[(218,450),(276,405),(452,280),(456,310),(315,422),(324,446),(283,453),(248,484),(217,479)]]
def poly(points):
 m=Image.new('L',(640,640));ImageDraw.Draw(m).polygon(points,fill=255);return m
out=[]
for i in range(8):
 orig=source.crop((i*640,0,(i+1)*640,640));a=np.array(orig)
 gen=generated.crop((i*640,0,(i+1)*640,640))
 gh,gf,oh,of=landmarks[i];s=(of-oh)/(gf-gh);dx=0
 # Frame 7 ImageGen shifted head left; source x is adjusted to match original feet centre.
 if i==6: dx=17
 fitted=gen.transform((640,640),Image.Transform.AFFINE,(1/s,0,-dx/s,0,1/s,-(of-s*gf)/s),Image.Resampling.BICUBIC)
 g=np.array(fitted)
 costume=np.maximum(np.array(poly(hats[i])),np.array(poly(bodies[i])))>0
 skin=(a[:,:,0].astype(float)>a[:,:,1]*1.45)&(a[:,:,0].astype(float)>a[:,:,2]*1.3)&(a[:,:,0]>45)&(a[:,:,3]>0)
 skin[520:]=False
 skin=np.array(Image.fromarray(skin.astype('uint8')*255).filter(ImageFilter.MaxFilter(5)))>0
 protect=(np.array(poly(weapon_polys[i]))>0)|skin
 generated_skin=(g[:,:,0].astype(float)>g[:,:,1]*1.45)&(g[:,:,0].astype(float)>g[:,:,2]*1.3)&(g[:,:,0]>70)
 mask=costume&~protect&~generated_skin&(a[:,:,3]>0)&(g[:,:,3]>128)
 result=a.copy();result[mask,:3]=g[mask,:3]
 # Fit each generated boot row to the existing boot silhouette, including the sole.
 # This prevents a narrower generated boot from leaving a second original toe.
 for xa,xb in ((100,210),(280,365)):
  srcok=g[535:585,xa:xb,3]>=128;dstok=a[535:585,xa:xb,3]>=128
  symax=int(np.where(srcok)[0].max())+535;dymax=int(np.where(dstok)[0].max())+535
  for yy in range(535,dymax+1):
   sy=round(535+(yy-535)*(symax-535)/max(1,dymax-535))
   sx=np.where(g[sy,xa:xb,3]>=128)[0]+xa
   tx=np.where(a[yy,xa:xb,3]>0)[0]+xa
   if not len(sx) or not len(tx): continue
   line=Image.fromarray(g[sy:sy+1,sx.min():sx.max()+1,:3]).resize((int(tx.max()-tx.min()+1),1),Image.Resampling.BICUBIC)
   result[yy,tx,:3]=np.array(line)[0,tx-tx.min()]
   mask[yy,tx]=True
 # Exact source alpha preserves subpixel edge, frame bbox, original silhouette and foot anchor.
 new=Image.fromarray(result)
 output_sheet.paste(new,(i*640,0))
 records.append({'mask':mask,'skin':skin,'weapon':np.array(poly(weapon_polys[i]))>0,'scale':s,'x_shift':dx,'y_shift':of-s*gf})
 out.append(new)

# Export losslessly, then validate decoded delivery bytes rather than the working image.
import hashlib,json
asset=ROOT/'img/yama-sword-weapons/hero-yama-cyberhell-sword-chain.webp'
output_sheet.save(asset,format='WEBP',lossless=True,exact=True)
delivered=Image.open(asset)
assert delivered.mode=='RGBA' and delivered.size==(5120,640)
assert getattr(delivered,'n_frames',1)==1
validation={
 'scope':'P5 only', 'sheet':str(asset.relative_to(ROOT)),
 'source_sha256':hashlib.sha256((D/'inputs/original.webp').read_bytes()).hexdigest(),
 'output_sha256':hashlib.sha256(asset.read_bytes()).hexdigest(),
 'size':[5120,640], 'mode':delivered.mode,'grid':[8,1],'cell':[640,640],'frame_count':8,
 'imagegen_calls':8,'fallback_original_frames':[],
 'measurement':{
  'bbox':'Pillow half-open [left,top,right,bottom]; opaque alpha>=128; also report all alpha>0 including glow',
  'foot':'For each frame: lowest alpha>=128 row in footwear ROI x=[100,365), y=[530,590); x=(leftmost+rightmost)/2 on that row. This excludes sword/effect below feet in frames 6 and 7. The left boot is lower than the right boot in source.',
  'registration':'Fit generated costume by hat/sole landmarks; composite only garment masks; retain complete source alpha and source pixels outside garment masks. Fit boots to source silhouette by row.',
  'limits':'Numeric checks verify layout and protected pixel regions; design match remains a visual review, not an automated QA result.'
 },'frames':[]}
def bbox(a,threshold):
 return list(Image.fromarray((a[:,:,3]>=threshold).astype('uint8')*255).getbbox())
def foot(a):
 m=a[:,:,3]>=128;m[:530]=False;m[590:]=False;m[:,:100]=False;m[:,365:]=False
 y=int(np.where(m)[0].max());xs=np.where(m[y])[0]
 return [float((xs.min()+xs.max())/2),y]
for i,r in enumerate(records):
 a=np.array(source.crop((i*640,0,(i+1)*640,640)));b=np.array(delivered.crop((i*640,0,(i+1)*640,640)))
 oldbb,newbb=bbox(a,128),bbox(b,128);oh=oldbb[3]-oldbb[1];nh=newbb[3]-newbb[1]
 oldfoot,newfoot=foot(a),foot(b);fd=[newfoot[j]-oldfoot[j] for j in range(2)]
 diff=np.any(a!=b,axis=2);outside=int(np.count_nonzero(diff&~r['mask']))
 skinchanges=int(np.count_nonzero(diff&r['skin']));weaponchanges=int(np.count_nonzero(diff&r['weapon']))
 rec={'frame':i+1,'source_bbox_opaque':oldbb,'output_bbox_opaque':newbb,
  'source_bbox_alpha_nonzero':bbox(a,1),'output_bbox_alpha_nonzero':bbox(b,1),
  'source_height':oh,'output_height':nh,'height_delta_percent':round((nh/oh-1)*100,6),
  'source_foot_xy':oldfoot,'output_foot_xy':newfoot,'foot_delta_xy':fd,
  'source_alpha_identical':bool(np.array_equal(a[:,:,3],b[:,:,3])),
  'changed_pixels':int(np.count_nonzero(diff)), 'changed_pixels_outside_costume_mask':outside,
  'protected_skin_changed_pixels':skinchanges,'protected_weapon_changed_pixels':weaponchanges,
  'generated_uniform_scale':r['scale'],'generated_shift_xy':[r['x_shift'],r['y_shift']]}
 assert abs(rec['height_delta_percent'])<=2 and max(map(abs,fd))<=2
 assert rec['source_alpha_identical'] and outside==0 and skinchanges==0 and weaponchanges==0
 assert rec['changed_pixels']>5000
 validation['frames'].append(rec)

# Every comparison row uses complete, equally sized 640x640 cells.
compare=Image.new('RGB',(1280,8*672),(48,52,62));draw=ImageDraw.Draw(compare)
review_frames=[]
for i in range(8):
 pair=Image.new('RGB',(1280,672),(48,52,62));pd=ImageDraw.Draw(pair)
 pd.text((16,10),f'FRAME {i+1:02} | ORIGINAL',fill='white');pd.text((656,10),f'FRAME {i+1:02} | NEW COSTUME',fill='white')
 for j,im in enumerate((source,delivered)):
  cell=im.crop((i*640,0,(i+1)*640,640));pair.paste(cell,(j*640,32),cell)
 compare.paste(pair,(0,i*672));review_frames.append(pair.resize((960,504),Image.Resampling.LANCZOS))
compare.save(D/'compare.jpg',quality=94,subsampling=0)
# One shared palette prevents per-frame palette flicker in this preview.
palette_source=Image.new('RGB',(960,504*8))
for i,f in enumerate(review_frames):palette_source.paste(f,(0,i*504))
palette=palette_source.quantize(colors=256)
gifframes=[f.quantize(palette=palette,dither=Image.Dither.NONE) for f in review_frames]
gifpath=D/'chain-compare.gif'
gifframes[0].save(gifpath,save_all=True,append_images=gifframes[1:],duration=120,loop=0,disposal=2,optimize=False)
gif=Image.open(gifpath)
assert gif.n_frames==8 and gif.info['loop']==0 and gif.size==(960,504)
validation['review_artifacts']={'compare_size':list(Image.open(D/'compare.jpg').size),'gif_size':list(gif.size),'gif_frames':gif.n_frames,'gif_loop':gif.info['loop'],'gif_frame_duration_ms':120}
(D/'validation.json').write_text(json.dumps(validation,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'sheet':validation['size'],'mode':validation['mode'],'frames':8,'bbox_height_delta_percent':[f['height_delta_percent'] for f in validation['frames']],'foot_delta_xy':[f['foot_delta_xy'] for f in validation['frames']],'protected_region_changes':sum(f['protected_skin_changed_pixels']+f['protected_weapon_changed_pixels'] for f in validation['frames']),'gif_frames':gif.n_frames},ensure_ascii=False))
