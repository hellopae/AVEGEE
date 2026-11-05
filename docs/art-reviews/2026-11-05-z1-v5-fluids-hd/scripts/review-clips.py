"""Decode actual encoded clips with FFmpeg and make a review contact sheet."""
from pathlib import Path
from io import BytesIO
import subprocess
from PIL import Image,ImageDraw
R=Path(__file__).resolve().parents[1]
strip=Image.new('RGB',(1280,540));draw=ImageDraw.Draw(strip)
for row,name in enumerate(['lava','ice','heaven']):
    result=subprocess.run(['ffmpeg','-v','error','-i',str(R/f'preview-{name}.mp4'),'-vf',"select='eq(n,0)+eq(n,6)+eq(n,12)+eq(n,24)',scale=320:180,tile=4x1",'-frames:v','1','-f','image2pipe','-vcodec','png','pipe:1'],capture_output=True,check=True)
    im=Image.open(BytesIO(result.stdout)).convert('RGB')
    assert im.size==(1280,180)
    strip.paste(im,(0,row*180))
    for col,t in enumerate([0,.5,1,2]):draw.text((col*320+5,row*180+5),f'{name} {t}s',fill='white',stroke_width=2,stroke_fill='black')
strip.save(R/'clip-review-strip.jpg',quality=94)
print('Decoded 4 samples from each of 3 encoded clips; saved clip-review-strip.jpg')
