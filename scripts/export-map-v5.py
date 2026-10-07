"""Technical sprite export: crop transparent margins and preserve generated alpha in lossless WebP."""
from pathlib import Path
from PIL import Image,ImageDraw
import json,shutil
ROOT=Path(__file__).resolve().parents[1]
sources=ROOT/'output/zone1-map-v5/generated-sources.json'
if sources.exists():
 for name,path in json.loads(sources.read_text()).items():shutil.copy(path,ROOT/f'img/raw/map-v5/{name}.png')
keys=['dab','ngiw','krata','frontier','sawan','tarang','lan','krajok','sala']
for zone in ['th','asia','west','cyberhell']:
 out=Image.new('RGB',(1200,900),(35,25,35));d=ImageDraw.Draw(out)
 for i,k in enumerate(keys):
  p=ROOT/f'img/raw/map-v5/st-{k}-{zone}.png'
  if not p.exists():continue
  im=Image.open(p).convert('RGBA');im=im.crop(im.getbbox());im.save(ROOT/f'img/map-v5/st-{k}-{zone}.webp',lossless=True,method=6)
  im.thumbnail((380,260));out.paste(im,((i%3)*400+(400-im.width)//2,(i//3)*300),im);d.text(((i%3)*400+5,(i//3)*300+275),k,fill='white')
 out.save(ROOT/f'output/zone1-map-v5/assets-{zone}.jpg',quality=94)
print('Exported',len(list((ROOT/'img/map-v5').glob('*.webp'))),'production sprites')
