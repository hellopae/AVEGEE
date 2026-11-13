"""Exact crop reconstruction from unchanged repo WebP masters; no runtime repairs for west."""
from pathlib import Path
from functools import lru_cache
from PIL import Image
O=Path(__file__).resolve().parents[1]
ROOT=O.parents[2]
@lru_cache(maxsize=1)
def master():
 im=Image.new('RGB',(4915,3277))
 for p in (ROOT/'img/map-zone3/v1').glob('r*-c*.webp'):
  r,c=map(int,p.stem[1:].split('-c'));im.paste(Image.open(p),((c-1)*1024,(r-1)*1024))
 return im
def region(rect):
 x,y,w,h=rect;return master().crop((x,y,x+w,y+h))
def chunk(name):return region([(int(name[-1])-1)*1024,0,1024,1024])
