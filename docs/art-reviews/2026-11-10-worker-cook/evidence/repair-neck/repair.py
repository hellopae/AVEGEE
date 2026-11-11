"""Deterministic, native-coordinate stationary collar repair. No generation.
Read the latest delivery; do not translate or resample an animation frame.
All hands, rice, utensils, walking legs, and original head cutouts are excluded.
"""
from pathlib import Path
import hashlib,json
import numpy as np
from PIL import Image,ImageDraw,ImageOps
from scipy import ndimage
EV=Path(__file__).resolve().parent
OUT=EV.parents[1]; REPO=OUT.parents[2]
INPUT=Path('/Users/agapae/agapae-work/.codex-worktrees/.codex-worktrees/20261111T165435Z-427eb5ef/docs/art-reviews/2026-11-10-worker-cook')
RUN='20261111T170902Z-d171c309'

def polygon(points):
 m=Image.new('L',(320,320));ImageDraw.Draw(m).polygon(points,fill=255)
 return np.array(m)>0

def cell(a,row,i):return a.crop((i*320,row*320,(i+1)*320,(row+1)*320))

def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()

# Boundaries stop above the moving sleeves, hands, and food. Every vertex is
# in the existing 320px source coordinate system. Head cutout support is excluded.
CONFIG=[
 ('th','cook',[0,1],0,1,[(132,156),(237,156),(247,173),(232,181),(208,179),(180,180),(151,178),(132,173)]),
 ('cyberhell','cook',[1],0,1,[(154,156),(251,156),(252,174),(234,179),(188,178),(171,174),(154,171)]),
 ('th','carry',[0,1],1,2,[(148,154),(248,154),(255,172),(239,181),(204,179),(181,181),(165,175),(148,170)])
]
report={'run':RUN,'input':str(INPUT),'newImageGenCalls':0,'operations':[],
 'method':'Native original collar/upper shoulder RGBA cutouts; exact source-head support protected; no resampling, translation, frame substitution, or generation.',
 'retainedAtlases':['worker-asia-cook-v1.webp','worker-west-cook-v1.webp'],
 'limitations':['This localized repair does not certify whole-body proportions or real-time loop continuity.']}
for zone,anim,rows,sr,sc,points in CONFIG:
 name=f'worker-{zone}-{anim}-v1.webp'
 atlas=Image.open(INPUT/name).convert('RGBA')
 src=np.array(Image.open(REPO/f'img/workers/worker-{zone}-sheet-v2.webp').convert('RGBA').crop((sc*320,sr*320,(sc+1)*320,(sr+1)*320)))
 head_name=f'head-{zone}-source.webp' if anim=='cook' else 'head-th-carry-side-source.webp'
 head=np.array(Image.open(OUT/'evidence/repair-identity'/head_name).convert('RGBA'))
 head_support=head[:,:,3]>0
 base=polygon(points)&~head_support
 for row in rows:
  for i in range(8):
   mirrored=row==1
   before=np.array(ImageOps.mirror(cell(atlas,row,i)) if mirrored else cell(atlas,row,i))
   mask=base.copy()
   # Drawn arms in side-carry second batch rise above the first batch. Preserve
   # that real motion, with a tighter stationary shoulder boundary for f5..8.
   if anim=='carry' and i>=4:mask[173:]=False
   # Foreground protection includes the ink outline around rice and red hands.
   # It matters where f6's hand or side-carry rice rises into the neck band.
   r,g,b=[before[:,:,k].astype(float) for k in range(3)]
   skin=(r>55)&(r>g*1.5)&(r>b*1.5)&(before[:,:,3]>40) if zone=='th' else np.zeros((320,320),bool)
   rice=(r>145)&(g>145)&(b>125)&(before[:,:,3]>40)
   foreground=ndimage.binary_dilation(skin|rice,iterations=3)
   mask &= ~foreground
   # Keep the existing silhouette wherever the original source has no body.
   # A source cutout must not punch a hole into the drawn raised shoulder.
   mask &= (src[:,:,3]>=245) | (src[:,:,3]>before[:,:,3])
   Image.fromarray((foreground*255).astype('uint8')).save(EV/f'{zone}-{anim}-r{row}-f{i+1}-foreground.png')
   # Retain the already verified exact source head even at the transparent edge.
   after=before.copy();after[mask]=src[mask]
   # RGB=0 for source transparent pixels in the localized cutout.
   transparent=mask&(after[:,:,3]==0);after[transparent]=0
   # Reject source additions disconnected by the localized mask boundary.
   labels,_=ndimage.label(after[:,:,3]>40);counts=np.bincount(labels.ravel());counts[0]=0
   main=labels==counts.argmax()
   rejected=mask&(after[:,:,3]>40)&~main
   mask &= ~rejected;after[rejected]=before[rejected]
   changed=np.any(before!=after,axis=2)
   prefix=f'{zone}-{anim}-r{row}-f{i+1}'
   Image.fromarray((mask*255).astype('uint8')).save(EV/f'{prefix}-mask.png')
   output=Image.fromarray(after)
   atlas.paste(ImageOps.mirror(output) if mirrored else output,(i*320,row*320))
   report['operations'].append({'file':name,'row':row,'frame':i+1,'mirroredCanonicalCoordinates':mirrored,
    'source':f'img/workers/worker-{zone}-sheet-v2.webp','sourceRow':sr,'sourceColumn':sc,'polygon':points,
    'mask':f'evidence/repair-neck/{prefix}-mask.png','selectedPixels':int(mask.sum()),
    'changedPixels':int(changed.sum()),'alphaChangedPixels':int((before[:,:,3]!=after[:,:,3]).sum()),
    'filledAlphaAbove40Pixels':int(((before[:,:,3]<=40)&(after[:,:,3]>40)).sum()),
    'removedAlphaAbove40Pixels':int(((before[:,:,3]>40)&(after[:,:,3]<=40)).sum()),
    'checks':{'outsideMaskUnchanged':bool(np.array_equal(before[~mask],after[~mask])),
     'noRemovedOpaqueSilhouette':bool(np.all(after[:,:,3][before[:,:,3]>40]>40)),
     'originalHeadUnchanged':bool(np.array_equal(before[head_support],after[head_support])),
     'foregroundWithInkMarginUnchanged':bool(np.array_equal(before[foreground],after[foreground])),
     'drawnMotionBelowY182Unchanged':bool(np.array_equal(before[182:],after[182:])),
     'sourceRGBAExactForVisiblePixels':bool(np.array_equal(after[mask&(src[:,:,3]>0)],src[mask&(src[:,:,3]>0)]))}})
 atlas.save(OUT/name,lossless=True,method=6,exact=True)
 report.setdefault('inputHashes',{})[name]=digest(INPUT/name)
 report.setdefault('outputHashes',{})[name]=digest(OUT/name)
 # Before/after at both requested seams, at native 320px scale.
 original=Image.open(INPUT/name).convert('RGBA')
 for row in rows:
  plate=Image.new('RGB',(1280,688),(229,230,233));d=ImageDraw.Draw(plate)
  for j,i in enumerate([3,4,7,0]):
   for k,a in enumerate([original,atlas]):
    f=cell(a,row,i);bg=Image.new('RGBA',(320,320),(229,230,233,255));bg.alpha_composite(f)
    plate.paste(bg.convert('RGB'),(j*320,k*344+24))
    d.text((j*320+4,k*344+4),f'{zone} {anim} r{row} f{i+1} '+('BEFORE' if k==0 else 'AFTER'),fill='black')
  plate.save(EV/f'before-after-{zone}-{anim}-r{row}.jpg',quality=88)
report['checks']=sum(len(op['checks']) for op in report['operations'])
report['failures']=[op for op in report['operations'] if not all(op['checks'].values())]
(EV/'repair-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'editedFrames':len(report['operations']),'changedPixels':sum(op['changedPixels'] for op in report['operations']),
 'alphaChangedPixels':sum(op['alphaChangedPixels'] for op in report['operations']),'checks':report['checks'],'failures':len(report['failures'])}))
raise SystemExit(bool(report['failures']))
