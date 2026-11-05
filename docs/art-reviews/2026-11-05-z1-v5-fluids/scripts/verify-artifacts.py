"""Structural and pixel tests for this art review; no game source/test changes."""
from pathlib import Path
import json,hashlib,subprocess,re
from PIL import Image
import numpy as np
import cv2
ROOT=Path(__file__).resolve().parents[1]
REPO=ROOT.parents[2]
regions=json.loads((ROOT/'regions.json').read_text())['regions'];byid={r['id']:r for r in regions}
model=json.loads((ROOT/'fx-layout.json').read_text());checks=[]
def check(name,ok,details=None):
    checks.append({'check':name,'ok':bool(ok),'details':details});print(name, bool(ok),details if not ok else '',flush=True)
master=Image.open(ROOT/'master-v5.webp').convert('RGB')
exact=True
for r in range(1,5):
    for c in range(1,6):
        tile=Image.open(REPO/f'img/map-zone1/v5/r{r}-c{c}.webp').convert('RGB');x=(c-1)*1024;y=(r-1)*1024
        exact &= np.array_equal(np.asarray(tile),np.asarray(master.crop((x,y,x+tile.width,y+tile.height))))
check('master exactly reconstructs decoded original 20 tiles',exact)
for kind in ['lava','lavafall','spirit-river','ice-stream','waterfall','fog']:
    one=Image.open(ROOT/f'masks/{kind}-1x.png');two=Image.open(ROOT/f'masks/{kind}-2x.png')
    check('mask sizes and exact 2x '+kind,one.size==(4915,3277) and two.size==(9830,6554) and np.array_equal(np.asarray(one.resize(two.size,Image.Resampling.NEAREST)),np.asarray(two)))
    del one,two
for a in model['assets']:
    im=Image.open(ROOT/a['sheet']).convert('RGBA')
    check('sheet dimensions '+a['id'],im.size==(a['frameW']*a['frames'],a['frameH']))
    if not a.get('new'):continue
    frames=[np.asarray(im.crop((i*a['frameW'],0,(i+1)*a['frameW'],a['frameH']))) for i in range(8)]
    check('8 distinct painted frames '+a['id'],len({hashlib.sha256(f.tobytes()).digest() for f in frames})==8)
    if a['id'] in byid:
        mask=np.asarray(Image.open(ROOT/byid[a['id']]['mask']).resize((a['frameW'],a['frameH']),Image.Resampling.NEAREST))
        leaked=sum(int(np.count_nonzero((f[:,:,3]>0)&(mask==0))) for f in frames)
        check('preclipped sheet alpha '+a['id'],leaked==0,{'leakedPixels':leaked})
for p in model['pieces']:
    reg=byid[p['regionId']];mask=np.asarray(Image.open(ROOT/p['mask']))
    channel=np.asarray(Image.open(ROOT/f"masks/{reg['kind']}-1x.png"));x,y,w,h=p['maskRectPx']
    leak=int(np.count_nonzero((mask>0)&(channel[y:y+h,x:x+w]==0)))
    if p.get('clipMask'):
        bank=np.asarray(Image.open(ROOT/p['clipMask']));leak+=int(np.count_nonzero((bank>0)&(mask==0)))
    check('region containment '+p['id'],leak==0 and mask.shape==(h,w),{'leakedPixels':leak})
    check('no animated placement '+p['id'],p['scrollSpeed']==0 and p['loop'] and 'frameOrder' in p)
    asset=next(a for a in model['assets'] if a['sheet']==p['sheet'])
    if asset.get('new'):
        size=p['tileWorld'] if p.get('tileInRegion') else p['rectWorld'][2:]
        density=[p['frameW']/size[0],p['frameH']/size[1]]
        check('new frame output density >=2.56 '+p['id'],min(density)>=2.56-1e-9,{'pxPerWorldUnit':density})
loops=json.loads((ROOT/'loop-review.json').read_text())
for a in loops['assets']:
    check('wrap discontinuity <=1.5x interior '+a['id'],a['wrapToInteriorRatio']<=1.5,{'ratio':a['wrapToInteriorRatio']})
    if a.get('tileable'):
        check('spatial edges exact '+a['id'],a['maxOpposingEdgeError']==0 and a['maxTopBottomEdgeError']==0)
render=json.loads((ROOT/'render-check.json').read_text())
blocked=[]
if isinstance(render.get('browser'),dict) and render['browser']['status']=='blocked':
    blocked=['Browser runtime and layer-toggle/zoom/pan interaction checks: sandbox denies Chromium launch; browser pane unavailable']
else:check('browser has no runtime errors',not render['browserErrors'],render['browserErrors'])
js=re.search(r'<script>(.*?)</script>',(ROOT/'index.html').read_text(),re.S).group(1)
syntax=subprocess.run(['node','--check','--input-type=commonjs'],input=js,capture_output=True,text=True)
check('preview JavaScript syntax',syntax.returncode==0,syntax.stderr)
check('reference renderer unchanged outside all masks',render['containmentRender']['changedPixelsOutsideMaskUnion']==0,render['containmentRender'])
for k,v in render['interactions'].items():check('viewer interaction '+k,v)
check('video 12 seconds and three angles',render['video']['exitCode']==0 and render['video']['frames']==144 and len(render['video']['views'])==3)
contrast=json.loads((ROOT/'contrast-check.json').read_text())
check('global saturation and contrast not reduced',contrast['meetsNumericalCriterion'],{k:contrast[k] for k in ['minimumContrastRatio','minimumSaturationRatio']})
size=sum(p.stat().st_size for p in ROOT.rglob('*') if p.is_file())
check('output <=80 MB decimal',size<=80_000_000,{'bytes':size})
out={'automatedChecks':checks,'satisfied':sum(c['ok'] for c in checks),'total':len(checks),'allExecutedAutomatedChecksSatisfied':all(c['ok'] for c in checks),'blockedTests':blocked,'outputBytesAtCheck':size,'limitations':['Structural/raster checks do not prove artist-approved masks or convincing directional flow.','Global metrics do not prove no local haze.','No in-game integration or artistic QA approval in this run.']}
(ROOT/'verification.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
print('RESULT',out['satisfied'],'/',out['total'],'bytes',size)
