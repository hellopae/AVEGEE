"""Artifact/schema/coordinate assertions. Art acceptance remains separate and unresolved."""
from pathlib import Path
import json,subprocess,hashlib,math,re
from PIL import Image
import numpy as np
O=Path(__file__).resolve().parents[1];R=O.parents[2];checks=[]
def check(name,condition):
 if not condition:raise AssertionError(name)
 checks.append(name)
def data(n):return json.loads((O/n).read_text())
chunks=data('chunks.json');inv=data('objects-inventory.json');sprites=data('sprites.json');prompts=data('generation-prompts.json');metrics=data('structure-metrics.json')
check('exactly requested four chunk IDs',{a['id'] for a in chunks}=={'r2-c2','r2-c3','r3-c2','r3-c3'})
for a in chunks:
 im=Image.open(O/a['src']);check(a['id']+' export 2048x2048',im.size==(2048,2048));r,c=int(a['id'][1]),int(a['id'][4]);rect=[(c-1)*1024*3840/4915,(r-1)*1024*2560/3277,1024*3840/4915,1024*2560/3277];check(a['id']+' exact townChunkRect',all(abs(x-y)<1e-8 for x,y in zip(rect,a['rectWorld'])))
check('master dimensions match original atlas',Image.open(O/'master-1x.jpg').size==(4915,3277))
check('unique inventory IDs',len({a['id'] for a in inv})==len(inv));check('inventory references all 20 chunks',set(c for a in inv for c in a['chunk'])=={f'r{r}-c{c}' for r in range(1,5) for c in range(1,6)})
for a in inv:
 check(a['id']+' required fields',all(k in a for k in ['id','kind','bboxWorld','footWorld','chunk','action']));check(a['id']+' legal action',a['action'] in ['keep-baked','extract-redraw'] or a['action'].startswith('replace:'));x,y,w,h=a['bboxWorld'];check(a['id']+' finite world box',all(math.isfinite(v) for v in [x,y,w,h,*a['footWorld']]) and w>0 and h>0 and x>=0 and y>=0 and x+w<=3840.01 and y+h<=2560.01)
check('unique sprite IDs',len({a['id'] for a in sprites})==len(sprites));spr={a['id']:a for a in sprites};pilot={a['id'] for a in chunks}
required={a['id'] for a in inv if a['action']!='keep-baked' and set(a['chunk'])&pilot};check('all planned pilot objects have sprites',required==set(spr))
for a in sprites:
 im=Image.open(O/a['src']);check(a['id']+' true alpha',im.mode=='RGBA' and im.getchannel('A').getextrema()==(0,255));x,y,w,h=a['rectWorld'];check(a['id']+' export density >= 2.56',im.width/w>=2.559 and im.height/h>=2.559);fx,fy=a['footWorld'];check(a['id']+' foot inside rect',x-.01<=fx<=x+w+.01 and y-.01<=fy<=y+h+.01);check(a['id']+' legal layer',a['layer'] in ['back','sort','front']);px,py=a['footPx'];check(a['id']+' alpha contact band at foot',np.any(np.array(im.getchannel('A'))[max(0,int(py)-3):min(im.height,int(py)+4)]>=128))
for bridge in ['lava-lower','river']:
 check(bridge+' distinct front/back images',spr[bridge+'-back']['src']!=spr[bridge+'-front']['src'] and spr[bridge+'-back']['layer']=='back' and spr[bridge+'-front']['layer']=='front')
check('ImageGen calls <= 12',prompts['totalCalls']==len(prompts['calls'])<=12);check('full prompts and builtin tool provenance',all(a['prompt'] and a['tool']=='built-in image_gen.imagegen' and a['status']=='returned' for a in prompts['calls']))
required=['walkmask-overlay-1x.jpg','inventory-overlay.jpg','station-mapping.md','structure-check.jpg','seam-check.jpg','compare-game-zoom.jpg','style-compare.jpg','index.html','README.md']
for name in required:check('required artifact '+name,(O/name).is_file())
mapping=(O/'station-mapping.md').read_text()
for key in ['krata','dab','ngiw','tarang','sawan','lokan','lan','krajok','tea','sala','canteen']:check('mapping contains '+key,key in mapping)
changed=subprocess.check_output(['git','status','--porcelain','--untracked-files=all'],cwd=R,text=True).splitlines();check('all changes restricted to delivery folder',all(line[3:].startswith('docs/art-reviews/2026-11-05-z1-v5-hd/') for line in changed));check('base HEAD unchanged',subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip()=='812152d2f60651f71955d6083cb1403a92203625')
files=[p for p in O.rglob('*') if p.is_file()];total=sum(p.stat().st_size for p in files);check('delivery <= 80,000,000 bytes',total<=80_000_000)
report={'assertions':len(checks),'assertionFailures':0,'scope':'File/schema/alpha/coordinates/preview logic only; not QA or art acceptance','bytes':total,'MBdecimal':round(total/1e6,3),'inventoryCount':len(inv),'spriteCount':len(sprites),'nativeTerrainSizes':[a['nativeSize'] for a in metrics['registration']],'diagnosticMaximumNearestEdgePx':max(a['maxNearestEdgePx'] for a in metrics['probes']),'nativeResolutionMeetsMinimum1_5x':metrics['nativeResolutionMeetsMinimum1_5x'],'semanticStructureVerified':False,'browserRenderVerified':False,'acceptance':{'1':'not met: native resolution below 1.5x; sharpness/seams not approved','2':'not met: diagnostic max exceeds 4px; whole semantic contour not verified','3':'partial: sprite exports complete but removal and exact placement not exhaustively verified; old art remains in external feather','4':'partial: 20 chunks surveyed and mapping complete; manual grouped survey, completeness/deduplication not independently verified','5':'README present and size within budget'},'checks':checks}
(O/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({k:v for k,v in report.items() if k!='checks'},ensure_ascii=False,indent=2))
