"""Offline fixed-camera reference compositor; not a recording of game runtime."""
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np,cv2,json,math,subprocess
R=Path(__file__).resolve().parents[1];cfg=json.loads((R/'clouds.json').read_text());W,H=cfg['fullPx']
# Use exact world-to-map scale; source base is 1x preview resolution, cloud overlay remains 2x.
mask=Image.open(R/'cloud-layer-mask.png');puffs=[Image.open(R/p['file']).convert('RGBA') for p in cfg['puffs']]
views=[{'id':'heaven','label':'Heaven gate','rectPx2x':[6900,410,1280,720]}, {'id':'left-edge','label':'West edge / deleted fog protected','rectPx2x':[0,2600,1280,720]}, {'id':'central-valley','label':'Central valley','rectPx2x':[5100,400,1280,720]}]

def crop_layer(v,box):
 l,t,r,b=box;out=Image.new('RGBA',(r-l,b-t))
 for f in cfg['layers']:
  if f['variant']!=v:continue
  x,y,w,h=f['rectPx2x']
  if x<r and y<b and x+w>l and y+h>t:out.alpha_composite(Image.open(R/f['file']).convert('RGBA'),(x-l,y-t))
 return out

def pm(a):
 a=np.array(a,dtype=np.float32)/255; a[:,:,:3]*=a[:,:,3:4];return a

def frame(view,t):
 x,y,w,h=view['rectPx2x'];pad=8;box=(x-pad,y-pad,x+w+pad,y+h+pad)
 a,b=view['_layers'];weight=.5-.5*math.cos(2*math.pi*t/24);mixed=a*(1-weight)+b*weight
 dx,dy=np.array(cfg['animation']['layerDriftWorldAmplitude'])*[W/3840,H/2560]*math.sin(2*math.pi*t/48)
 mat=np.float32([[1,0,dx],[0,1,dy]]);mixed=cv2.warpAffine(mixed,mat,(w+2*pad,h+2*pad),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT)[pad:pad+h,pad:pad+w]
 # Reapply fixed mask after drift; alpha already masked at source, minimum prevents edge thickening.
 ma=np.array(mask.crop((x,y,x+w,y+h)),dtype=np.float32)/255
 olda=mixed[:,:,3].copy();mixed[:,:,3]=np.minimum(olda,ma);mixed[:,:,:3]*=(mixed[:,:,3]/np.maximum(olda,1e-9))[:,:,None]
 for p,im in zip(cfg['puffs'],puffs):
  ow,oh=p['spriteWorld'];pw,ph=round(ow*W/3840),round(oh*H/2560);origin=p['originWorld'];vx,vy=p['driftWorldPerSecond'];cx,cy=(origin[0]+vx*t)*W/3840-x,(origin[1]+vy*t)*H/2560-y
  l,top=round(cx-pw/2),round(cy-ph/2)
  if l>=w or top>=h or l+pw<=0 or top+ph<=0:continue
  overlay=Image.new('RGBA',(w,h));overlay.alpha_composite(im.resize((pw,ph),Image.Resampling.LANCZOS),(l,top));aa=pm(overlay);aa[:,:,:3]*=ma[:,:,None]*p['opacity'];aa[:,:,3]*=ma*p['opacity'];mixed=aa+mixed*(1-aa[:,:,3:4])
 mixed*=cfg['animation']['opacity'];bg=np.array(view['_base'],dtype=np.float32)/255;rgb=np.clip(mixed[:,:,:3]+bg*(1-mixed[:,:,3:4]),0,1);out=Image.fromarray(np.rint(rgb*255).astype('uint8'))
 d=ImageDraw.Draw(out);d.rectangle((0,0,w,44),fill=(20,18,29));d.text((12,8),f"{view['label']} | {t:05.2f}s | offline fixed camera | A/B 24s cycle",fill=(250,241,224));return out

strip=Image.new('RGB',(1280*3,720*3));stats=[]
for vi,view in enumerate(views):
 x,y,w,h=view['rectPx2x'];view['_base']=Image.open(R/'input'/f"{view['id']}-base.webp").convert('RGB');pad=8;box=(x-pad,y-pad,x+w+pad,y+h+pad);view['_layers']=[pm(crop_layer(v,box)) for v in ['A','B']]
 path=R/'previews'/f"{view['id']}-12s.mp4"
 cmd=['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{w}x{h}','-r','12','-i','-','-an','-c:v','libx264','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',str(path)]
 process=subprocess.Popen(cmd,stdin=subprocess.PIPE)
 for i in range(144):
  im=frame(view,i/12);process.stdin.write(im.tobytes())
  if i in [0,72,143]:strip.paste(im,(vi*1280,[0,72,143].index(i)*720))
 process.stdin.close();assert process.wait()==0
 frame(view,6).save(R/'previews'/f"{view['id']}.jpg",quality=93)
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_entries','stream=width,height,nb_read_frames,r_frame_rate:format=duration','-of','json',str(path)]))
 stats.append({'id':view['id'],'rectPx2x':view['rectPx2x'],'probe':probe,'kind':'offline reference raster compositor, fixed camera, base v7 and clouds sampled at native map2x'})
 print(view['id'],probe,flush=True)
strip.resize((1920,1080),Image.Resampling.LANCZOS).save(R/'previews/three-view-strip.jpg',quality=92)
json.dump(stats,open(R/'clip-check.json','w'),indent=2)
# Contact sheets are visual review aids, not authored assets.
contact=Image.new('RGB',(1024,512),(43,39,57));draw=ImageDraw.Draw(contact)
for i,im in enumerate(puffs):
 im=im.copy();im.thumbnail((238,200));x=(i%4)*256+(256-im.width)//2;y=(i//4)*256+20;contact.paste(im,(x,y),im);draw.text(((i%4)*256+10,(i//4)*256+235),f'puff-{i+1:02d}',fill='white')
contact.save(R/'previews/puffs-contact.jpg',quality=93)
