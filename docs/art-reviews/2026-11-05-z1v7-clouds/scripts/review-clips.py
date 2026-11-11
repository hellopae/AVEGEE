from pathlib import Path
from PIL import Image,ImageDraw
import subprocess,json,io,numpy as np,cv2
R=Path(__file__).resolve().parents[1];views=['heaven','left-edge','central-valley'];strip=Image.new('RGB',(1280*3,720*3));metrics=[]
rects={c['id']:c['rectPx2x'] for c in json.loads((R/'clip-check.json').read_text())};mask=Image.open(R/'cloud-layer-mask.png')
for vi,vid in enumerate(views):
 frames=[]
 for ti,t in enumerate([0,6,11.916667]):
  raw=subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',str(R/'previews'/f'{vid}-12s.mp4'),'-frames:v','1','-f','image2pipe','-vcodec','png','-']);im=Image.open(io.BytesIO(raw)).convert('RGB');im.load();strip.paste(im,(vi*1280,ti*720));frames.append(np.array(im)[44:].astype(float))
 x,y,w,h=rects[vid];support=np.asarray(mask.crop((x,y,x+w,y+h)))[44:]>0;delta=np.abs(frames[-1]-frames[0])
 safe=cv2.dilate(support.astype('uint8'),np.ones((25,25),np.uint8))==0
 metrics.append({'view':vid,'decodedFrame0ToLastRGBMAE':float(delta.mean()),'maskSupportPixelsBelowHUD':int(support.sum()),'decodedMAEInsideMask':float(delta[support].mean()) if support.any() else None,'pixelsWithAnyRGBChangeAbove3':int(np.count_nonzero(np.any(delta>3,axis=2))),'staticBackgroundMAEOutsideMaskGuard12px':float(delta[safe].mean()) if safe.any() else None,'hudExcluded':True,'leftEdgeHasNoCloudSupport':vid=='left-edge' and not support.any()})
strip.resize((1920,1080),Image.Resampling.LANCZOS).save(R/'previews/decoded-clips.jpg',quality=94)
(R/'decoded-clip-check.json').write_text(json.dumps(metrics,indent=2));print(json.dumps(metrics,indent=2))
