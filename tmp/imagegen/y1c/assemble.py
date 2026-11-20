from PIL import Image, ImageDraw, ImageFilter, ImageFont
from pathlib import Path
import json
import numpy as np

root=Path('tmp/imagegen/y1c')
items=json.loads((root/'baseline.json').read_text())
# Costume placement areas are measured in the original canvas. Everything else
# remains original; the alpha channel is copied unchanged, including antialiasing.
costume=[
 [[(176,0),(372,0),(372,141),(175,141)],[(130,239),(329,238),(341,350),(370,396),(368,467),(130,467)]],
 [[(176,0),(372,0),(372,141),(175,141)],[(146,241),(329,241),(341,350),(370,396),(368,467),(130,467)]],
 [[(235,0),(418,0),(418,116),(235,116)],[(140,227),(224,210),(338,223),(380,281),(378,353),(417,447),(362,459),(241,445),(181,422),(220,337),(140,307)]],
 [[(180,0),(390,0),(390,151),(180,151)],[(91,197),(211,193),(312,234),(390,272),(449,295),(435,362),(363,342),(402,393),(362,460),(248,420),(145,449),(87,397),(121,330),(91,282)]],
 [[(437,59),(910,59),(910,398),(437,398)],[(324,628),(800,596),(825,721),(825,893),(894,1029),(894,1187),(325,1187)]],
 [[(62,96),(506,96),(574,291),(581,439),(373,512),(62,512)],[(237,682),(626,451),(725,436),(882,500),(1029,494),(1340,613),(1337,768),(1202,850),(1006,813),(800,814),(237,814)]],
 [[(175,114),(258,114),(259,213),(175,213)],[(249,156),(331,151),(395,168),(426,194),(426,250),(340,248),(259,248)]],
]
keep=[
 [[(166,139),(335,139),(356,168),(347,208),(316,236),(288,251),(210,250),(176,222)],[(185,274),(243,274),(263,304),(258,337),(186,337)],[(134,166),(218,166),(218,279),(134,279)],[(173,412),(275,412),(275,466),(173,466)]],
 [[(166,139),(335,139),(356,168),(347,208),(316,236),(288,251),(210,250),(176,222)],[(184,235),(249,235),(260,288),(239,304),(184,295)],[(134,166),(218,166),(218,241),(134,241)],[(173,412),(275,412),(275,466),(173,466)]],
 [[(206,111),(335,105),(360,154),(393,163),(378,194),(342,227),(291,244),(225,218),(207,171)],[(90,199),(144,199),(165,236),(155,267),(90,271)],[(246,238),(293,238),(311,279),(303,305),(251,296)],[(191,448),(398,448),(398,512),(191,512)]],
 [[(185,128),(334,122),(365,158),(358,222),(330,252),(257,249),(209,218),(183,177)],[(135,239),(189,239),(198,293),(130,304)],[(398,283),(452,283),(454,345),(396,345)],[(85,455),(439,455),(439,512),(85,512)]],
 [[(401,414),(752,410),(861,468),(851,527),(786,619),(699,667),(493,667),(425,608)],[(423,731),(594,731),(644,803),(642,881),(425,881)],[(338,478),(405,478),(405,617),(530,659),(532,735),(487,735),(487,686),(338,657)],[(429,1014),(638,1014),(638,1190),(429,1190)]],
 [[(130,461),(367,301),(474,376),(575,398),(586,296),(655,306),(673,464),(638,524),(624,601),(561,667),(450,710),(298,710),(211,678),(183,625),(135,565)],[(487,701),(592,701),(611,704),(729,704),(754,794),(480,794)],[(498,289),(572,283),(590,422),(549,413)]],
 [[(215,138),(249,136),(271,152),(287,183),(284,200),(252,220),(222,216),(207,208),(207,186)],[(422,173),(465,173),(465,256),(422,256)],[(175,249),(466,249),(466,274),(175,274)]],
]
gem_regions=[
 [[(205,0),(278,0),(278,103),(205,103)]],
 [[(205,0),(278,0),(278,103),(205,103)]],
 [[(265,0),(336,0),(336,80),(265,80)]],
 [[(284,22),(345,22),(345,101),(284,101)]],
 [[(484,70),(643,70),(643,316),(484,316)]],
 [[(190,249),(330,249),(330,424),(190,424)]],
 [[(222,118),(248,118),(248,143),(222,143)]],
]
def poly_mask(size,polys):
 m=Image.new('L',size);d=ImageDraw.Draw(m)
 for poly in polys:d.polygon(poly,fill=255)
 return m

report=[]
for i,item in enumerate(items):
 orig=Image.open(item['original']).convert('RGBA');gen=Image.open(root/f'generated-{i}.png').convert('RGBA')
 ob=orig.getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox()
 gb=gen.getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox()
 fitted=Image.new('RGBA',orig.size)
 fitted.paste(gen.crop(gb).resize((ob[2]-ob[0],ob[3]-ob[1]),Image.Resampling.NEAREST),ob[:2])
 a=np.array(orig);b=np.array(fitted)
 area=np.array(poly_mask(orig.size,costume[i]))>0
 protect=np.array(poly_mask(orig.size,keep[i]))>0
 # Original warm pixels are skin, tea, mat or flame; preserve their outlines too.
 red=(a[:,:,0].astype(int)>a[:,:,2].astype(int)*1.22)&(a[:,:,0].astype(int)>a[:,:,1].astype(int)*1.22)&(a[:,:,0]>40)
 red=np.array(Image.fromarray((red*255).astype('uint8')).filter(ImageFilter.MaxFilter(5)))>0
 red &= ~(np.array(poly_mask(orig.size,gem_regions[i]))>0)
 protect|=red
 # Never import a regenerated face, flame, or a transparent hole into clothing.
 generated_warm=(b[:,:,0].astype(int)>b[:,:,2].astype(int)*1.22)&(b[:,:,0].astype(int)>b[:,:,1].astype(int)*1.22)&(b[:,:,0]>40)
 apply=area&~protect&~generated_warm&(b[:,:,3]>200)&(a[:,:,3]>0)
 out=a.copy();out[apply,:3]=b[apply,:3]
 result=Image.fromarray(out,'RGBA')
 result.save(item['path'],format='WEBP',lossless=True,exact=True,method=6)
 Image.fromarray((apply*255).astype('uint8')).save(root/f'mask-{i}.png')
 reopened=np.array(Image.open(item['path']).convert('RGBA'))
 changed=np.any(a[:,:,:3]!=reopened[:,:,:3],axis=2)&(a[:,:,3]>0)
 rec={'path':item['path'],'size':list(result.size),'mode':Image.open(item['path']).mode,'frames':Image.open(item['path']).n_frames,'alpha_changed_pixels':int(np.sum(a[:,:,3]!=reopened[:,:,3])),'changed_visible_pixels':int(changed.sum()),'changed_outside_costume_mask':int((changed&~apply).sum()),'changed_protected_pixels':int((changed&protect).sum()),'original_alpha_bbox':list(orig.getbbox()),'new_alpha_bbox':list(result.getbbox()),'foreground_alignment':{'original_bbox_128':ob,'generated_bbox_128':gb}}
 assert rec['alpha_changed_pixels']==0 and rec['changed_outside_costume_mask']==0 and rec['changed_protected_pixels']==0
 report.append(rec)
(root/'validation.json').write_text(json.dumps(report,indent=2))
# Render a review contact sheet with original and assembled output at equal scale.
sheet=Image.new('RGB',(1080,7*565),(30,33,41));draw=ImageDraw.Draw(sheet)
font=ImageFont.truetype('/System/Library/Fonts/Menlo.ttc',14)
for i,item in enumerate(items):
 y=i*565;draw.text((16,y+8),f"{i+1}. {item['path']}",font=font,fill='white')
 for col,p in enumerate([item['original'],item['path']]):
  im=Image.open(p).convert('RGBA');im.thumbnail((512,512),Image.Resampling.NEAREST)
  x=14+col*540+(512-im.width)//2;yy=y+42+(512-im.height)//2
  bg=Image.new('RGB',im.size,(67,70,80));bg.paste(im,mask=im.getchannel('A'));sheet.paste(bg,(x,yy))
sheet.save(root/'preview.jpg',quality=94)
print(json.dumps(report,indent=2))
