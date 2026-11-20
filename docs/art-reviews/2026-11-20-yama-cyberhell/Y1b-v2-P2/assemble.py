"""P2 only. Rebuild from per-frame built-in ImageGen edits; preserve source anatomy/effects."""
from pathlib import Path
import json, hashlib
import numpy as np
from scipy import ndimage as ndi
from PIL import Image, ImageDraw, ImageFont
P = Path(__file__).resolve().parent
ROOT = P.parents[3]
TARGET = ROOT/'img/yama-sword-v4/hero-yama-cyberhell-sword.webp'
# Costume regions in ORIGINAL frame coordinates, excluding blade/effects.
HATS = {
1:[(174,287),(282,248),(328,285),(319,335),(182,340)],
2:[(184,286),(285,249),(331,284),(320,338),(192,346)],
3:[(191,282),(274,248),(317,284),(310,337),(203,342)],
4:[(185,295),(281,255),(327,286),(319,345),(192,349)],
5:[(198,297),(300,256),(343,289),(335,349),(207,351)],
6:[(195,296),(302,255),(351,290),(334,353),(201,351)],
7:[(192,296),(302,259),(347,294),(335,357),(198,354)],
8:[(176,287),(285,248),(330,285),(321,335),(184,340)]}
# Body includes sleeves. Skin/weapon masks below protect original artwork.
BODIES = {
1:[(182,378),(236,392),(287,391),(320,421),(359,573),(118,573),(144,485),(171,450)],
2:[(205,388),(281,379),(318,359),(348,375),(344,411),(295,449),(346,574),(127,574),(144,490),(207,451)],
3:[(163,322),(207,318),(247,370),(290,398),(304,452),(349,574),(132,574),(145,487),(207,449),(177,394)],
4:[(203,395),(269,401),(319,426),(328,466),(351,574),(127,574),(143,498),(203,455)],
5:[(217,384),(278,402),(321,417),(331,459),(360,574),(123,574),(145,494),(212,450)],
6:[(213,386),(280,400),(324,438),(338,482),(359,574),(117,574),(147,486),(203,450)],
7:[(211,396),(276,405),(323,443),(338,490),(359,574),(109,574),(145,491),(202,456)],
8:[(183,378),(237,392),(288,391),(321,421),(361,573),(120,573),(146,485),(173,450)]}
WEAPONS = {
1:[[(248,417),(267,399),(283,402),(288,416),(308,415),(309,439),(280,452),(259,437)],[(291,412),(450,278),(459,280),(449,301),(299,426)],[(216,452),(233,449),(244,463),(233,480),(215,477)]],
2:[[(54,220),(74,224),(253,312),(258,331),(239,333),(60,239)],[(301,325),(320,325),(336,346),(332,358),(314,349)],[(343,366),(375,366),(375,390),(352,391)]],
3:[[(215,287),(251,126),(269,126),(236,291)],[(174,279),(201,271),(238,281),(248,307),(230,316),(211,301),(176,301)],[(179,329),(204,329),(213,354),(188,358)]],
4:[[(306,426),(323,402),(343,407),(348,421),(359,426),(355,449),(338,455),(319,447)],[(342,419),(500,282),(508,278),(506,300),(351,433)],[(300,467),(322,459),(329,482),(307,493)]],
5:[[(353,407),(374,408),(382,453),(373,466),(355,454)],[(373,421),(566,409),(573,425),(560,438),(378,441)],[(308,473),(330,464),(342,483),(318,501)]],
6:[[(324,454),(350,449),(364,471),(359,490),(342,500),(326,479)],[(353,475),(527,560),(532,582),(511,578),(352,490)]],
7:[[(323,460),(348,451),(364,470),(359,493),(341,505),(323,482)],[(355,481),(519,558),(527,578),(509,581),(351,496)]],
8:[[(249,417),(268,399),(284,402),(289,416),(309,415),(310,439),(281,452),(260,437)],[(292,412),(452,278),(459,280),(449,301),(300,426)],[(217,452),(234,449),(245,463),(234,480),(216,477)]]}
def polygon(points):
 m=Image.new('L',(640,640));ImageDraw.Draw(m).polygon(points,fill=255);return np.array(m)>0
def bbox(a,t=1):
 ys,xs=np.where(a>=t);return [int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]
def foot(a):
 # Fixed shoe ROI excludes the lower slash glow in frames 6/7.
 m=a[520:600,90:380]>=128;y=np.where(m.any(axis=1))[0][-1];xs=np.where(m[y])[0]+90
 return [float((xs.min()+xs.max())/2),int(y+520)]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 originals=[];news=[];records=[]
 for k in range(1,9):
  original=Image.open(P/f'original-{k:02}.png').convert('RGBA');o=np.array(original); originals.append(original)
  gen_index=1 if k==8 else k
  path=P/f'generated-{gen_index:02}.png'
  if not path.exists():news.append(original);records.append({'frame':k,'status':'original_fallback_missing_generation'});continue
  g=Image.open(path).convert('RGBA');gb=bbox(np.array(g)[:,:,3],16);ob=bbox(o[:,:,3],128)
  scale=(ob[3]-ob[1])/(gb[3]-gb[1]);g=g.crop(gb);g=g.resize((round(g.width*scale),ob[3]-ob[1]),Image.Resampling.LANCZOS)
  n=Image.new('RGBA',(640,640));n.paste(g,(ob[0],ob[1]));a=np.array(n)
  # Extend only non-skin generated pixels into tiny source silhouette gaps.
  def costume_rgb(image):
   pixels=np.array(image);red=(pixels[:,:,0]>55)&(pixels[:,:,0]>pixels[:,:,1]*1.35)&(pixels[:,:,0]>pixels[:,:,2]*1.25)
   valid=(pixels[:,:,3]>=64)&~ndi.binary_dilation(red,iterations=1)
   _,nearest=ndi.distance_transform_edt(~valid,return_indices=True)
   return pixels[:,:,:3][tuple(nearest)]
  rgb=costume_rgb(n)
  body_adjustment=None
  if k==6:
   # Local garment registration to the two original shoe anchors. Alpha/anatomy stay fixed.
   stretch=(331-149.5)/(303-146.5)
   transform=(1/stretch,0,146.5-149.5/stretch,4/181.5,1,-2-149.5*4/181.5)
   body=n.transform((640,640),Image.Transform.AFFINE,transform,Image.Resampling.BICUBIC)
   body_rgb=costume_rgb(body);region=polygon(BODIES[k]);rgb[region]=body_rgb[region]
   body_adjustment={'inverse_affine':list(transform),'reason':'register garment boot details to original left/right shoe positions; no alpha or anatomy changes'}
  skin=(o[:,:,0]>55)&(o[:,:,0]>o[:,:,1]*1.35)&(o[:,:,0]>o[:,:,2]*1.25)&(o[:,:,3]>0)
  skin[500:]=False
  skin=ndi.binary_fill_holes(ndi.binary_closing(skin,iterations=2))|skin
  protected=ndi.binary_dilation(skin,iterations=2)
  weapon=np.zeros((640,640),bool)
  for poly in WEAPONS[k]:weapon|=polygon(poly)
  protected|=weapon
  protected &= o[:,:,3]>0
  costume=(polygon(HATS[k])|polygon(BODIES[k]))&~protected&(o[:,:,3]>0)
  out=o.copy();out[costume,:3]=rgb[costume];out[o[:,:,3]==0,:3]=0;final=Image.fromarray(out);news.append(final);final.save(P/f'frame-{k:02}.png')
  Image.fromarray((costume*255).astype('uint8')).save(P/f'costume-mask-{k:02}.png')
  oldb=bbox(o[:,:,3]);newb=bbox(out[:,:,3]);oldfoot=foot(o[:,:,3]);newfoot=foot(out[:,:,3]);h=oldb[3]-oldb[1]
  rec={'frame':k,'status':'derived_from_frame_1' if k==8 else 'imagegen_edit','generation':gen_index,'generated_bbox_alpha16':gb,'pillow_uniform_scale':scale,'normalized_position':[ob[0],ob[1]],'body_rgb_registration':body_adjustment,'old_bbox_alpha1':oldb,'new_bbox_alpha1':newb,'old_bbox_alpha128':ob,'new_bbox_alpha128':bbox(out[:,:,3],128),'height_error_percent':round(abs((newb[3]-newb[1])-h)/h*100,5),'old_foot':oldfoot,'new_foot':newfoot,'foot_error_px':[abs(oldfoot[0]-newfoot[0]),abs(oldfoot[1]-newfoot[1])],'alpha_identical':bool(np.array_equal(o[:,:,3],out[:,:,3])),'protected_changed_pixels':int(np.any(o[protected]!=out[protected],axis=1).sum()),'costume_changed_pixels':int(np.any(o[costume]!=out[costume],axis=1).sum())}
  records.append(rec)
 sheet=Image.new('RGBA',(5120,640))
 for k,f in enumerate(news):sheet.paste(f,(k*640,0))
 sheet.save(TARGET,format='WEBP',lossless=True,exact=True)
 decoded=Image.open(TARGET)
 for i,r in enumerate(records):
  actual=decoded.crop((640*i,0,640*(i+1),640)).convert('RGBA')
  r['decoded_pixels_identical_to_composite']=bool(np.array_equal(np.array(actual),np.array(news[i])))
 data={'scope':'P2 only','sheet':str(TARGET.relative_to(ROOT)),'size':list(decoded.size),'mode':decoded.mode,'grid':[8,1],'cell':[640,640],'frame_count':8,'imagegen_calls':len(list(P.glob('generated-*.png'))),'original_sha256':sha(P/'original.png'),'output_sha256':sha(TARGET),'measurement':{'bbox':'RGBA alpha >= 1 (also report alpha >=128); right/bottom exclusive','foot':'alpha >=128; midpoint of extreme opaque x on bottommost shoe row in ROI x90:380 y520:600; exclude sword glow','composition':'Generated costume RGB normalized uniformly by opaque bbox height; original alpha and protected face/skin/weapons retained. Frame8 uses frame1 shifted to its own source bbox.'},'frames':records}
 data['geometry_checks_pass']=decoded.size==(5120,640) and decoded.mode=='RGBA' and all(r.get('height_error_percent',100)<=2 and max(r.get('foot_error_px',[100]))<=2 for r in records)
 (P/'validation.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 # Full cells in compare: include frame3's elevated sword and all frame boundaries.
 compare=Image.new('RGB',(960,8*480),(45,48,56));d=ImageDraw.Draw(compare)
 for i,(o,n) in enumerate(zip(originals,news)):
  for col,f in enumerate([o,n]):
   f=f.resize((480,480),Image.Resampling.LANCZOS);compare.paste(f,(col*480,i*480),f)
  d.text((12,i*480+12),f'{i+1} ORIGINAL',fill='white');d.text((492,i*480+12),f'{i+1} NEW',fill='white')
 compare.save(P/'compare.jpg',quality=92)
 anim=[]
 for i,(o,n) in enumerate(zip(originals,news)):
  c=Image.new('RGB',(960,500),(45,48,56));d=ImageDraw.Draw(c)
  for col,f in enumerate([o,n]):
   f=f.resize((480,480),Image.Resampling.LANCZOS);c.paste(f,(col*480,20),f)
  d.text((12,8),'ORIGINAL',fill='white');d.text((492,8),f'NEW | FRAME {i+1}/8',fill='white');anim.append(c)
 anim[0].save(P/'hero-yama-cyberhell-sword-compare.gif',save_all=True,append_images=anim[1:],duration=[180,130,130,100,100,130,160,220],loop=0,optimize=False)
 print(json.dumps({'geometry_checks_pass':data['geometry_checks_pass'],'size':data['size'],'mode':data['mode'],'frames':[{'frame':r['frame'],'changed':r.get('costume_changed_pixels'),'protected_changed':r.get('protected_changed_pixels')} for r in records]},indent=2))
if __name__=='__main__':main()
