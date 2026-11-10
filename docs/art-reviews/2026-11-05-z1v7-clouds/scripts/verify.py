from pathlib import Path
from PIL import Image
import json,sys,hashlib,subprocess
import numpy as np
R=Path(__file__).resolve().parents[1];cfg=json.loads((R/'clouds.json').read_text());records=json.loads((R/'generation-records.json').read_text());regions=json.loads((R/'regions.json').read_text());checks=[]
def check(name,ok,detail):
 checks.append({'name':name,'ok':bool(ok),'detail':detail});print(('OK ' if ok else 'FAIL ')+name+': '+str(detail))
W,H=cfg['fullPx'];mask=np.array(Image.open(R/cfg['mask']));ex=np.array(Image.open(R/'input/exclusion-mask.png'));check('mask2x',mask.shape==(6554,9830),list(mask.shape));check('delete12',len(regions['excludedLumps'])==12 and not np.any(mask[ex>0]),regions['excludedLumps'])
check('generation36',len(records)==36 and len({r['originalSha256'] for r in records})==36,len(records));check('nativeRGBA',all(r['nativeMode']=='RGBA' and r['alphaExtrema'][0]==0 and r['alphaExtrema'][1]>0 for r in records),'native alpha, all records')
reg=json.loads((R/'registration.json').read_text());check('noUpscaling',len(reg)==28 and all(max(a['scale'])<=1 for a in reg),{'mappedQuarters':len(reg),'largestScale':max(max(a['scale']) for a in reg)})
check('grid40',len(cfg['layers'])==40,len(cfg['layers']));bounds=True;hashes=True;outside=0;missing=0;ab=[];soft=0
for row in range(4):
 for col in range(5):
  x,y=col*2048,row*2048;w,h=min(2048,W-x),min(2048,H-y);ims=[]
  for v in ['A','B']:
   f=next(f for f in cfg['layers'] if f['variant']==v and f['rectPx2x'][:2]==[x,y]);p=R/f['file'];im=Image.open(p);a=np.array(im.convert('RGBA'));ims.append(a)
   bounds &= im.size==(w,h) and im.mode=='RGBA';hashes &= hashlib.sha256(p.read_bytes()).hexdigest()==f['sha256'];outside+=int(np.count_nonzero(a[:,:,3][mask[y:y+h,x:x+w]==0]));soft+=int(np.count_nonzero((a[:,:,3]>0)&(a[:,:,3]<255)))
  core=mask[y:y+h,x:x+w]>128
  if core.any():
   aa,bb=ims;use=core&(aa[:,:,3]>0)&(bb[:,:,3]>0);diff=np.abs(aa.astype(float)-bb.astype(float));ab.append({'chunk':f'r{row+1}-c{col+1}','overlapPixels':int(use.sum()),'rgbaMAE':float(diff[use].mean()) if use.any() else 0.,'differentPixels':int(np.any(aa!=bb,axis=2)[core].sum())});missing+=int(np.count_nonzero(core&((aa[:,:,3]==0)|(bb[:,:,3]==0))))
check('decodeDimensionsAndHash',bounds and hashes,{'bounds':bounds,'hashes':hashes});check('maskNoLeak',outside==0,{'outsideMaskPixels':outside,'softAlphaPixels':soft});check('ABDifferent',all(a['differentPixels']>0 and a['rgbaMAE']>.05 for a in ab),ab)
check('puffs8HD',len(cfg['puffs'])==8 and all(p['pixelsPerWorldUnit']>=2.56 for p in cfg['puffs']),[{'id':p['id'],'size':p['sizePx'],'pxPerWorld':p['pixelsPerWorldUnit']} for p in cfg['puffs']])
clips=json.loads((R/'clip-check.json').read_text());clipok=len(clips)==3
for c in clips:
 s=c['probe']['streams'][0];clipok &= int(s['nb_read_frames'])==144 and s['r_frame_rate']=='12/1' and s['width']==1280 and s['height']==720 and abs(float(c['probe']['format']['duration'])-12)<.01
check('clips3x12s',clipok,[c['id'] for c in clips])
# Premultiplied interpolation oracle: half opaque-red + half transparent-black stays red at alpha .5.
a=np.array([1.,0,0,1]);b=np.zeros(4);mid=(a+b)*.5;rgb=mid[:3]/mid[3];check('premultipliedOracle',np.allclose(rgb,[1,0,0]) and mid[3]==.5,{'rgb':rgb.tolist(),'alpha':float(mid[3])})
size=sum(p.stat().st_size for p in R.rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.name!='verification.json');check('size60MB',size<60000000,{'bytesBeforeThisReport':size,'limit':60000000})
changed=subprocess.check_output(['git','status','--porcelain','--untracked-files=all'],text=True).splitlines();scope=all(line[3:].startswith('docs/art-reviews/2026-11-05-z1v7-clouds/') for line in changed);check('scope',scope,{'changedFiles':len(changed)})
result={'fileChecks':checks,'allFileChecks':all(c['ok'] for c in checks),'maskCorePixelsWithoutEitherVariant':missing,'ABMeasurements':ab,'notQAApproval':True,'limitations':['Semantic completeness of cloud mask needs owner review against v5; no automated proof that every cloud or protected rock edge is correctly traced.','Three clips are offline composites, not runtime recordings. Preview terrain crops and cloud overlays both use map2x samples.','12s clips cover A to B half-cycle; 24s full loop follows a periodic analytic weight.','No game integration performed.']}
(R/'verification.json').write_text(json.dumps(result,indent=2,ensure_ascii=False));sys.exit(0 if result['allFileChecks'] else 1)
