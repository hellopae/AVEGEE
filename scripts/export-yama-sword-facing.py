"""Pack only the two imagegen-corrected poses; preserve six approved strike frames exactly."""
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
source=Image.open(ROOT/'img/raw/yama-sword-v3/th-facing-right.png').convert('RGBA').resize((2560,1280),Image.Resampling.LANCZOS)
old=Image.open(ROOT/'img/yama-sword-v2/hero-yama-th-sword.webp').convert('RGBA')
frames=[old.crop((i*640,0,(i+1)*640,640)) for i in range(8)]
for i in (0,7):
 x=(i%4)*640;y=(i//4)*640
 frames[i]=source.crop((x,y,x+640,y+640))
atlas=Image.new('RGBA',old.size)
grid=Image.new('RGBA',(2560,1280))
for i,f in enumerate(frames):
 atlas.paste(f,(i*640,0));grid.paste(f,((i%4)*640,(i//4)*640))
atlas.save(ROOT/'img/yama-sword-v3/hero-yama-th-sword.webp',lossless=True,method=6)
grid.save(ROOT/'img/raw/yama-sword-v3/th-aligned.png')
for i in range(1,7):assert atlas.crop((i*640,0,(i+1)*640,640)).tobytes()==old.crop((i*640,0,(i+1)*640,640)).tobytes()
styles=['th','asia','west','cyberhell'];sheets=[atlas]+[Image.open(ROOT/f'img/yama-sword-v2/hero-yama-{s}-sword.webp').convert('RGBA') for s in styles[1:]]
preview=[]
for i in range(8):
 canvas=Image.new('RGB',(1280,320),(25,13,24))
 for col,sheet in enumerate(sheets):
  f=sheet.crop((i*640,0,(i+1)*640,640)).resize((320,320),Image.Resampling.NEAREST)
  canvas.paste(f,(col*320,0),f)
 preview.append(canvas)
preview[0].save(ROOT/'output/yama-sword-v3/all-outfits.gif',save_all=True,append_images=preview[1:],duration=[650,80,60,35,40,80,100,100],loop=0)
print('Corrected poses 0 and 7; six strike frames identical; all-outfits preview exported')
