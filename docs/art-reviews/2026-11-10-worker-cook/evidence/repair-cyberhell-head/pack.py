"""Extract separately drawn ImageGen frames; register cells, never synthesize motion.

Whole-cell uniform resize and integer translation only. Preserve generated alpha.
Reference is original cyberhell idle row0 column1, mirrored for down-left exactly
as the existing renderer does. Lower-32px sole bounding-box midpoint is a
registration proxy, not proof of anatomical identity. Reject opaque clipping.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

HERE = Path(__file__).resolve().parent
OUT = HERE.parents[1]
REPO = OUT.parents[2]

def bounds(frame):
    mask = np.asarray(frame)[:, :, 3] > 40
    labels, _ = ndimage.label(mask)
    counts = np.bincount(labels.ravel()); counts[0] = 0
    main = labels == counts.argmax()
    ys, xs = np.where(main)
    bottom = int(ys.max())
    low_x = np.where(main[max(0, bottom-31):bottom+1])[1]
    return {'bounds': [int(xs.min()), int(ys.min()), int(xs.max()+1), bottom+1],
            'bottom': bottom, 'soleBandMidX': float((low_x.min()+low_x.max())/2)}

source = Image.open(REPO/'img/workers/worker-cyberhell-sheet-v2.webp').convert('RGBA').crop((320,0,640,320))
references = [source, source.transpose(Image.Transpose.FLIP_LEFT_RIGHT)]
atlas = Image.new('RGBA', (2560,640))
records = []
for call, row, start in [(1,0,0),(2,0,4),(3,1,0),(4,1,4)]:
    generated = Image.open(HERE/f'generated-{call:02}.webp').convert('RGBA')
    assert generated.width%2 == 0 and generated.height%2 == 0
    w,h = generated.width//2, generated.height//2
    reference = bounds(references[row])
    for i in range(4):
        box = (i%2*w, i//2*h, (i%2+1)*w, (i//2+1)*h)
        frame = generated.crop(box).resize((320,320), Image.Resampling.LANCZOS)
        unscaled = bounds(frame)
        source_height = reference['bounds'][3]-reference['bounds'][1]
        generated_height = unscaled['bounds'][3]-unscaled['bounds'][1]
        uniform_scale = source_height/generated_height
        scaled_size = round(320*uniform_scale)
        # Normalize the complete drawn cell, never head/body parts separately.
        frame = frame.resize((scaled_size,scaled_size), Image.Resampling.LANCZOS)
        before = bounds(frame)
        dx = round(reference['soleBandMidX']-before['soleBandMidX'])
        dy = reference['bottom']-before['bottom']
        a = np.asarray(frame)[:,:,3]
        yy,xx = np.indices(a.shape)
        lost = a[(xx+dx<0)|(xx+dx>=320)|(yy+dy<0)|(yy+dy>=320)]
        assert not np.any(lost>40), (call,i,'opaque clipping')
        registered = Image.new('RGBA',(320,320)); registered.paste(frame,(dx,dy))
        # Lanczos can leave alpha=1 ringing in otherwise empty cell gutters.
        # Exclude that 1px packing gutter only; never touch character pixels.
        ra = np.asarray(registered)[:,:,3]
        gutter = np.concatenate((ra[0],ra[:,0],ra[:,-1]))
        assert gutter.max() <= 1, (call,i,'visible pixels in packing gutter')
        clean = Image.new('RGBA',(320,320))
        clean.paste(registered.crop((1,1,319,320)),(1,1))
        registered = clean
        atlas.paste(registered,((start+i)*320,row*320))
        after = bounds(registered)
        assert after['bottom'] == 314
        assert abs(after['soleBandMidX']-reference['soleBandMidX']) <= .5
        records.append({'call':call,'row':row,'frame':start+i+1,'inputCellBox':list(box),
                        'unscaled':unscaled,'uniformScale':uniform_scale,'scaledCellSize':scaled_size,
                        'before':before,'offset':[dx,dy],'after':after,'reference':reference,
                        'clippedPixelsAlphaAbove40':int((lost>40).sum()),
                        'clippedNonzeroPixels':int((lost>0).sum()),
                        'excludedGutterNonzeroPixels':int((gutter>0).sum()),
                        'excludedGutterMaximumAlpha':int(gutter.max()),
                        'sha256RGBA':hashlib.sha256(registered.tobytes()).hexdigest()})
atlas.save(OUT/'worker-cyberhell-cook-v1.webp',lossless=True,exact=True)
for row,direction in enumerate(['down-right','down-left']):
    frames=[]
    for i in range(8):
        f=atlas.crop((i*320,row*320,(i+1)*320,(row+1)*320))
        bg=Image.new('RGBA',(320,320),(229,230,233,255))
        frames.append(Image.alpha_composite(bg,f).convert('RGB'))
    frames[0].save(OUT/'preview'/f'worker-cyberhell-cook-{direction}.gif',save_all=True,
                   append_images=frames[1:],duration=[120,130]*4,loop=0,disposal=2,optimize=False)

old = Image.open(HERE/'input-worker-cyberhell-cook-v1.webp').convert('RGBA')
plate = Image.new('RGB',(1280,688),(229,230,233)); draw=ImageDraw.Draw(plate)
for row in range(2):
    for col,(im,label) in enumerate([(references[row],'SOURCE exact direction'),
                                    (old.crop((0,row*320,320,(row+1)*320)),'INPUT f1'),
                                    (atlas.crop((0,row*320,320,(row+1)*320)),'REVISED f1'),
                                    (atlas.crop((1280,row*320,1600,(row+1)*320)),'REVISED f5')]):
        x,y=col*320,row*344
        draw.text((x+4,y+4),label,fill=(20,20,20))
        bg=Image.new('RGBA',(320,320),(229,230,233,255))
        plate.paste(Image.alpha_composite(bg,im).convert('RGB'),(x,y+24))
        draw.line((x,y+24+314,x+319,y+24+314), fill=(60,130,190))
plate.save(HERE/'before-after.jpg',quality=85)
(HERE/'packing.json').write_text(json.dumps({'method':'whole-cell extraction, uniform resize, source sole-band registration',
    'source':'img/workers/worker-cyberhell-sheet-v2.webp row0 column1 (zero based)',
    'drawAnchor':[160,320],'referenceMetrics':[bounds(f) for f in references],
    'anatomicalRegistrationCertified':False,'frames':records},indent=2)+'\n')
print(json.dumps({'packedFrames':len(records),'referenceMetrics':[bounds(f) for f in references],
                  'offsets':[r['offset'] for r in records]},indent=2))
