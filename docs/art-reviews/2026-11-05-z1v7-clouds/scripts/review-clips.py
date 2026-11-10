from pathlib import Path
from PIL import Image,ImageDraw
import subprocess,json,io,numpy as np
R=Path(__file__).resolve().parents[1];views=['heaven','left-edge','central-valley'];strip=Image.new('RGB',(1280*3,720*3));metrics=[]
for vi,vid in enumerate(views):
 frames=[]
 for ti,t in enumerate([0,6,11.916667]):
  raw=subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',str(R/'previews'/f'{vid}-12s.mp4'),'-frames:v','1','-f','image2pipe','-vcodec','png','-']);im=Image.open(io.BytesIO(raw)).convert('RGB');im.load();strip.paste(im,(vi*1280,ti*720));frames.append(np.array(im)[44:].astype(float))
 metrics.append({'view':vid,'decodedFrame0ToLastRGBMAE':float(np.abs(frames[-1]-frames[0]).mean()),'hudExcluded':True,'leftEdgeMayBeNearlyStaticDueToDelete12':vid=='left-edge'})
strip.resize((1920,1080),Image.Resampling.LANCZOS).save(R/'previews/decoded-clips.jpg',quality=94)
(R/'decoded-clip-check.json').write_text(json.dumps(metrics,indent=2));print(json.dumps(metrics,indent=2))
