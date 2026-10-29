"""Static PIL evidence using the game's real terrain/dais and world-space placement.
Run from repository root. No browser effects, NPCs or nighttime lighting simulated.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import re, math
ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
layout = (ROOT / 'src/town-layout.js').read_text()
x, y, w = map(float, re.search(r'TOWN_DAIS = \{ x:(\d+), y:(\d+), w:(\d+)', layout).groups())
# 3 output pixels per world unit; crop contains the actual throne surroundings.
scale = 3
crop = (x-210, y-240, x+210, y+35)
size = (1260, 825)
terrain = Image.open(ROOT/'img/map-zone3/v1/zone3-terrain-v1-preview.webp').convert('RGBA')
base = terrain.transform(size, Image.Transform.AFFINE,
    (terrain.width/3840/scale,0,crop[0]*terrain.width/3840,0,terrain.height/2560/scale,crop[1]*terrain.height/2560), Image.Resampling.BICUBIC)
def draw(canvas, im, left, top, width, height, smooth=False):
    sprite=im.resize((round(width*scale),round(height*scale)), Image.Resampling.LANCZOS if smooth else Image.Resampling.NEAREST)
    canvas.alpha_composite(sprite,(round((left-crop[0])*scale),round((top-crop[1])*scale)))
dais=Image.open(ROOT/'img/theme-v4/town-judgment-west-v2.webp').convert('RGBA')
dh=w*dais.height/dais.width
draw(base,dais,x-w/2,y-dh,w,dh,True)
old=Image.open(ROOT/'img/West/hero-boss-west-v2.png').convert('RGBA')
new=Image.open(ROOT/'img/West/hero-boss-west-seated-v2.png').convert('RGBA')
before=base.copy(); h=92*.8*.75*1.2
# t=0: drawStandee idle bob is sin(x)*h*.012.
draw(before,old,x-h/2,917-h+math.sin(x)*h*.012,h,h)
after=base.copy(); h=w*.2085; seat=y-dh*.61
draw(after,new,x-h/2,seat-h*.70,h,h)
for name,im in [('before',before),('after',after)]: im.convert('RGB').save(OUT/f'{name}.png')
comparison=Image.new('RGB',(2520,865),'#18202b');comparison.paste(before,(0,40));comparison.paste(after,(1260,40));d=ImageDraw.Draw(comparison);d.text((20,12),'BEFORE: embedded red/gold chair on scene throne',fill='white');d.text((1280,12),'AFTER: chair-free ruler on scene throne',fill='white');comparison.save(OUT/'before-after.png')
identity=Image.new('RGBA',(1024,550),'#25313d');identity.alpha_composite(old,(0,38));identity.alpha_composite(new,(512,38));d=ImageDraw.Draw(identity);d.text((12,12),'ORIGINAL',fill='white');d.text((524,12),'SEATED V2',fill='white');identity.convert('RGB').save(OUT/'identity-comparison.png')
print(f'dais: ({x}, {y}), width={w}, height={dh}; ruler canvas={h:.4f}; seatY={seat:.4f}; top={seat-h*.70:.4f}')
