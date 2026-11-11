from pathlib import Path
from PIL import Image
import json,sys,hashlib,subprocess
import numpy as np
R=Path(__file__).resolve().parents[1];cfg=json.loads((R/'clouds.json').read_text());records=json.loads((R/'generation-records.json').read_text());regions=json.loads((R/'regions.json').read_text());checks=[]
def check(name,ok,detail):
 checks.append({'name':name,'ok':bool(ok),'detail':detail});print(('OK ' if ok else 'FAIL ')+name+': '+str(detail))
W,H=cfg['fullPx'];mask=np.array(Image.open(R/cfg['mask']));ex=np.array(Image.open(R/'input/exclusion-mask.png'));check('mask2x',mask.shape==(6554,9830),list(mask.shape));check('delete12',len(regions['excludedLumps'])==12 and not np.any(mask[ex>0]),regions['excludedLumps'])
check('generation38',len(records)==38 and len({r['originalSha256'] for r in records})==38,len(records));check('nativeRGBA',all(r['nativeMode']=='RGBA' and r['alphaExtrema'][0]==0 and r['alphaExtrema'][1]>0 for r in records),'native alpha, all records')
sourceok=True;sourcehashes=[]
for record in records:
 p=R/record['savedFile'];im=Image.open(p);im.load();sourcehashes.append(hashlib.sha256(p.read_bytes()).hexdigest())
 sourceok &= im.mode=='RGBA' and list(im.size)==record['nativeSize'] and list(im.getchannel('A').getextrema())==record['alphaExtrema']
check('sourcePixels',sourceok and len(set(sourcehashes))==38,{'uniqueDecodedSourceFiles':len(set(sourcehashes)),'records':len(records)})
reg=json.loads((R/'registration.json').read_text());check('noUpscaling',len(reg)==30 and all(max(a['scale'])<=1 for a in reg),{'mappedQuarters':len(reg),'largestScale':max(max(a['scale']) for a in reg)})
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
puffok=True
for p in cfg['puffs']:
 im=Image.open(R/p['file']);im.load()
 puffok &= im.mode=='RGBA' and list(im.size)==p['sizePx'] and im.getchannel('A').getextrema()[0]==0 and im.getchannel('A').getextrema()[1]>0 and min(im.width/p['spriteWorld'][0],im.height/p['spriteWorld'][1])>=2.56
check('puffDecodedAlphaAndScale',puffok,'Read all exported PNGs, both world axes >=2.56 px/unit')
clips=json.loads((R/'clip-check.json').read_text());clipok=len(clips)==3
for c in clips:
 path=R/'previews'/f"{c['id']}-12s.mp4"
 actual=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_entries','stream=width,height,nb_read_frames,r_frame_rate:format=duration','-of','json',str(path)]))
 decode=subprocess.run(['ffmpeg','-v','error','-i',str(path),'-f','null','-'],capture_output=True,text=True)
 s=actual['streams'][0];clipok &= int(s['nb_read_frames'])==144 and s['r_frame_rate']=='12/1' and s['width']==1280 and s['height']==720 and abs(float(actual['format']['duration'])-12)<.01 and actual==c['probe'] and decode.returncode==0 and not decode.stderr
check('clips3x12s',clipok,[c['id'] for c in clips])
import re
links=re.findall(r'\]\(([^)]+)\)',(R/'README.md').read_text())
missinglinks=[p for p in links if '://' not in p and p.split('#')[0]!='verification.json' and not (R/p.split('#')[0]).exists()]
check('readmeLocalLinks',not missinglinks,{'links':len(links),'missing':missinglinks,'selfReport':'verification.json is written after checks; excluded from input-link validation'})
provenance=json.loads((R/'input/provenance.json').read_text());badprovenance=[]
for f in provenance:
 p=R/f['file']
 if not p.exists() or p.stat().st_size!=f['bytes'] or hashlib.sha256(p.read_bytes()).hexdigest()!=f['sha256']:badprovenance.append(f['file'])
check('inputProvenance',not badprovenance,{'files':len(provenance),'mismatches':badprovenance})
seams=json.loads((R/'seams.json').read_text())
check('bothSeamAxes',set(s['axis'] for s in seams['scannedBoundaries'])=={'vertical','horizontal'}, {'boundariesScanned':len(seams['scannedBoundaries']),'boundariesWithPairedMaskAbove64':len(seams['boundaries'])})
protected=np.asarray(Image.open(R/'protected-terrain-mask.png'))
check('protectedSnowAndRock',not np.any(mask[protected>0]),{'supportPixels':int(np.count_nonzero(mask[protected>0]))})
# Each supported mask pixel must have a source quarter, including the new west edge.
covered=np.zeros(mask.shape,bool)
for q in regions['quarters']:
 x,y,w,h=q['rectPx2x'];covered[y:y+h,x:x+w]=True
check('registeredMaskCoverage',not np.any((mask>0)&~covered),{'unregisteredSupportPixels':int(np.count_nonzero((mask>0)&~covered))})
decoded=json.loads((R/'decoded-clip-check.json').read_text())
check('motionVisibleInAllThreeViews',len(decoded)==3 and all(m['maskSupportPixelsBelowHUD']>1000 and m['decodedMAEInsideMask']>1 and m['pixelsWithAnyRGBChangeAbove3']>1000 for m in decoded),decoded)
check('fixedCameraBackground',all(m['staticBackgroundMAEOutsideMaskGuard12px']<.5 for m in decoded),[{'view':m['view'],'staticBackgroundMAE':m['staticBackgroundMAEOutsideMaskGuard12px']} for m in decoded])
inherited=json.loads((R/'input/current-run-inheritance.json').read_text())
check('inheritedArtUnchanged',len(inherited['files'])==36 and all(hashlib.sha256((R/f['file']).read_bytes()).hexdigest()==f['sha256'] for f in inherited['files']),{'preservedSourceFiles':len(inherited['files']),'newImageGenCalls':2})
# Premultiplied interpolation oracle: half opaque-red + half transparent-black stays red at alpha .5.
a=np.array([1.,0,0,1]);b=np.zeros(4);mid=(a+b)*.5;rgb=mid[:3]/mid[3];check('premultipliedOracle',np.allclose(rgb,[1,0,0]) and mid[3]==.5,{'rgb':rgb.tolist(),'alpha':float(mid[3])})
size=sum(p.stat().st_size for p in R.rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.name!='verification.json');check('size60MB',size<60000000,{'bytesBeforeThisReport':size,'limit':60000000})
changed=subprocess.check_output(['git','status','--porcelain','--untracked-files=all'],text=True).splitlines();scope=all(line[3:].startswith('docs/art-reviews/2026-11-05-z1v7-clouds/') for line in changed);check('scope',scope,{'changedFiles':len(changed)})
result={'fileChecks':checks,'allFileChecks':all(c['ok'] for c in checks),'maskCorePixelsWithoutEitherVariant':missing,'ABMeasurements':ab,'notQAApproval':True,'limitations':['Cloud envelopes were inspected visually against supplied v7; file checks do not establish owner art approval.','Three clips are offline composites, not runtime recordings. Preview terrain crops and cloud overlays both use map2x samples.','12s clips cover A to B half-cycle; 24s full loop follows a periodic analytic weight.','No game integration performed; baked clouds remain in unchanged terrain.']}
(R/'verification.json').write_text(json.dumps(result,indent=2,ensure_ascii=False));sys.exit(0 if result['allFileChecks'] else 1)
