"""Pack 16 independently drawn ImageGen poses, preserving their RGBA artwork.

Only uniform scaling and foot-baseline registration; never paint, replace a
head, mirror, tween, or manufacture motion. Inputs are lossless tool outputs.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
OUT = HERE.parents[1]
atlas = Image.new('RGBA', (2560, 640))
records = []
for call, row, start in ((1,0,0),(2,0,4),(3,1,0),(4,1,4)):
    src = Image.open(HERE / f'generated-{call:02}.webp').convert('RGBA')
    cw, ch = src.width//2, src.height//2
    for i in range(4):
        raw = src.crop((i%2*cw, i//2*ch, (i%2+1)*cw, (i//2+1)*ch))
        a = np.asarray(raw)[:,:,3]
        yy, xx = np.where(a>40)
        # Source TH idle is 308px high at alpha>40. Uniformly scale the
        # complete cell about the drawn figure, not individual body parts.
        scale = 308/(int(yy.max())-int(yy.min())+1)
        scaled = raw.resize((round(cw*scale),round(ch*scale)), Image.Resampling.LANCZOS)
        a = np.asarray(scaled)[:,:,3]
        yy, xx = np.where(a>40)
        fy, fx = np.where((a>40)&(np.indices(a.shape)[0]>=int(yy.max())-28))
        footx = (int(fx.min())+int(fx.max()))/2
        dx,dy = round(160-footx), 319-int(yy.max())
        frame = Image.new('RGBA',(320,320)); frame.paste(scaled,(dx,dy))
        visible = np.asarray(frame)[:,:,3]
        assert np.count_nonzero(visible>40)==np.count_nonzero(a>40), (call,i,'clipped solid artwork')
        gutter = np.concatenate((visible[0],visible[:,0],visible[:,-1]))
        assert gutter.max() <= 1, (call,i,'solid art in packing gutter')
        clean = Image.new('RGBA',(320,320))
        clean.paste(frame.crop((1,1,319,320)),(1,1))
        frame = clean
        visible = np.asarray(frame)[:,:,3]
        atlas.paste(frame,((start+i)*320,row*320))
        y,x=np.where(visible>40)
        records.append({'call':call,'row':row,'frame':start+i+1,'scaleFromToolCell':scale,
                        'offset':[dx,dy],'boundsAlphaAbove40':[int(x.min()),int(y.min()),int(x.max()+1),int(y.max()+1)],
                        'sourceStandingHeight':308,'footBandCentreXBeforeOffset':footx,
                        'excludedTopSideGutterMaxAlpha':int(gutter.max()),
                        'excludedTopSideGutterNonzeroPixels':int(np.count_nonzero(gutter)),
                        'anatomicalRegistrationAccepted':False})
atlas.save(OUT/'worker-th-cook-v1.webp',lossless=True,exact=True)
for row,direction in enumerate(('down-right','down-left')):
    frames=[]
    for i in range(8):
        f=atlas.crop((i*320,row*320,(i+1)*320,(row+1)*320))
        bg=Image.new('RGBA',(320,320),(229,230,233,255))
        frames.append(Image.alpha_composite(bg,f).convert('RGB'))
    frames[0].save(OUT/'preview'/f'worker-th-cook-{direction}.gif',save_all=True,
                   append_images=frames[1:],duration=[120,130]*4,loop=0,disposal=2,optimize=False)
(HERE/'packing.json').write_text(json.dumps({'method':'uniform scale to original standing height, silhouette foot-band centre at x160, bottom y319; not anatomical proof','frames':records},indent=2)+'\n')
print(json.dumps({'drawnPosesPacked':len(records),'heights':[r['boundsAlphaAbove40'][3]-r['boundsAlphaAbove40'][1] for r in records]}))
