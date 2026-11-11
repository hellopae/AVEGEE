"""Localized stationary garment cutouts explicitly allowed by the repair brief.
No generation, resampling, frame translation, or replacement of animated limbs.
Read the latest inherited delivery so rerunning never compounds the edits.
"""
from pathlib import Path
import json, hashlib, shutil
import numpy as np
from PIL import Image, ImageDraw, ImageOps
from scipy import ndimage
EV=Path(__file__).resolve().parent
OUT=EV.parents[1]
REPO=OUT.parents[2]
INPUT=Path('/Users/agapae/agapae-work/.toby-worktrees/.codex-worktrees/20261111T162400Z-6a49dc9c/docs/art-reviews/2026-11-10-worker-cook')
RUN='20261111T165435Z-427eb5ef'

def polygon(points):
    im=Image.new('L',(320,320));ImageDraw.Draw(im).polygon(points,fill=255)
    return np.array(im)>0

def cell(a,row,i):return a.crop((i*320,row*320,(i+1)*320,(row+1)*320))
def source(z):
    return Image.open(REPO/f'img/workers/worker-{z}-sheet-v2.webp').convert('RGBA').crop((320,0,640,320))

def signature(a):return hashlib.sha256(a.tobytes()).hexdigest()

operations=[]
# Rectangles follow the individually drawn arm/food/spoon envelopes, in the
# canonical right-facing coordinates of the reflected left animation. These
# protected pixels are copied unchanged, including their ink and alpha.
protected=[
 [(135,186,198,225),(235,180,300,238),(187,219,245,253)],
 [(137,174,208,207),(201,176,260,207),(233,194,299,226)],
 [(138,183,200,236),(195,195,244,220),(240,170,300,230)],
 [(138,176,270,232)],[(138,168,270,222)],
 [(138,162,235,203),(201,176,275,232)],
 [(139,178,181,218),(160,209,218,271),(237,176,282,263),(200,235,252,284)],
 [(137,178,193,237),(172,218,218,257),(239,171,300,223)]
]
name='worker-cyberhell-cook-v1.webp'
atlas=Image.open(INPUT/name).convert('RGBA');src=np.array(source('cyberhell'))
roi=polygon([(183,175),(226,175),(234,186),(234,240),(183,240)])
for i in range(8):
    before=np.array(ImageOps.mirror(cell(atlas,1,i)));after=before.copy()
    p=Image.new('L',(320,320));d=ImageDraw.Draw(p)
    for rect in protected[i]:d.rectangle(rect,fill=255)
    protect=np.array(p)>0
    mask=roi & ~protect & (before[:,:,3]>=245) & (src[:,:,3]>=245)
    # Preserve target alpha: the cutout changes only interior garment colour.
    after[mask,:3]=src[mask,:3]
    changed=np.any(before!=after,axis=2)
    mask_image=Image.fromarray((mask*255).astype('uint8'));mask_image.save(EV/f'cyberhell-left-f{i+1}-mask.png')
    atlas.paste(ImageOps.mirror(Image.fromarray(after)),(i*320,320))
    operations.append({'file':name,'row':1,'frame':i+1,'sourceRow':0,'sourceColumn':1,
      'kind':'stationary source torso/belt RGB in exposed interior; reflected with renderer direction',
      'protectedRectanglesCanonical':protected[i],'mask':f'evidence/repair-sourcebody/cyberhell-left-f{i+1}-mask.png',
      'selectedPixels':int(mask.sum()),'changedPixels':int(changed.sum()),
      'checks':{'alphaUnchanged':bool(np.array_equal(before[:,:,3],after[:,:,3])),
      'outsideMaskUnchanged':bool(np.array_equal(before[~mask],after[~mask])),
      'drawnMotionEnvelopeUnchanged':bool(np.array_equal(before[protect],after[protect])),
      'headAboveY175Unchanged':bool(np.array_equal(before[:175],after[:175])),
      'legsBelowY241Unchanged':bool(np.array_equal(before[241:],after[241:])),
      'sourceRGBExactInMask':bool(np.array_equal(after[mask,:3],src[mask,:3]))}})
atlas.save(OUT/name,lossless=True,method=6,exact=True)
# TH left f7: expose the original near-side tool pouch under the moving wrist.
# The red hand and the rice with its ink border remain in front of this layer.
name='worker-th-cook-v1.webp';atlas=Image.open(INPUT/name).convert('RGBA')
before=np.array(ImageOps.mirror(cell(atlas,1,6)));after=before.copy();src=np.array(source('th'))
roi=polygon([(165,223),(177,221),(182,225),(184,234),(189,242),(188,266),(184,273),(173,276),(157,272),(155,263),(157,247),(158,235)])
skin=(before[:,:,0]>70)&(before[:,:,0]>before[:,:,1].astype(float)*1.65)&(before[:,:,0]>before[:,:,2].astype(float)*1.4)&(before[:,:,3]>40)
food=(before[:,:,0]>165)&(before[:,:,1]>165)&(before[:,:,2]>145)&(before[:,:,3]>40)
protect=ndimage.binary_dilation(skin|food,iterations=3)
mask=roi & ~protect & (before[:,:,3]>=245) & (src[:,:,3]>=245)
after[mask,:3]=src[mask,:3]
Image.fromarray((mask*255).astype('uint8')).save(EV/'th-left-f7-pouch-mask.png')
atlas.paste(ImageOps.mirror(Image.fromarray(after)),(1920,320));atlas.save(OUT/name,lossless=True,method=6,exact=True)
operations.append({'file':name,'row':1,'frame':7,'kind':'original near-side pouch interior below moving hand','sourceRow':0,'sourceColumn':1,
 'mask':'evidence/repair-sourcebody/th-left-f7-pouch-mask.png','selectedPixels':int(mask.sum()),'changedPixels':int(np.any(before!=after,axis=2).sum()),
 'checks':{'alphaUnchanged':bool(np.array_equal(before[:,:,3],after[:,:,3])),
 'outsideMaskUnchanged':bool(np.array_equal(before[~mask],after[~mask])),
 'drawnHandAndFoodUnchanged':bool(np.array_equal(before[protect],after[protect])),
 'sourceRGBExactInMask':bool(np.array_equal(after[mask,:3],src[mask,:3]))}})
report={'run':RUN,'input':str(INPUT),'newImageGenCalls':0,'operations':operations,
 'checks':sum(len(op['checks']) for op in operations),'failures':[op for op in operations if not all(op['checks'].values())],
 'limitations':['Only localized exposed garment interiors are repaired. Whole-body proportions and real-time loop continuity are not certified.']}
(EV/'repair-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'operations':len(operations),'changedPixels':[op['changedPixels'] for op in operations],'checks':report['checks'],'failures':len(report['failures'])}))
raise SystemExit(bool(report['failures']))
