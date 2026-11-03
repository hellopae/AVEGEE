#!/usr/bin/env python3
"""Inspect layer metadata and owner-mask coverage sequentially; never load an image batch."""
from pathlib import Path
import hashlib,json,subprocess
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/art-reviews/2026-11-03-layered-map'
SOURCES={'zone1':'img/map-zone1/v5/zone1-terrain-v5-preview.webp','zone2':'img/map-zone2/v2/zone2-terrain-v2-preview.webp','zone3':'img/map-zone3/v1/zone3-terrain-v1-preview.webp','zone4':'img/map-zone4/v3/zone4-terrain-v3-preview.webp','border23':'img/frontier-route/zone2-3-v4.webp','border34':'img/frontier-route/zone3-4-v2.webp'}
manifest={'sprites':{'water':{'src':'water-loop-sheet.png','cols':4,'rows':2,'frames':8,'fps':8,'inset':2},'lava':{'src':'lava-loop-sheet.png','cols':4,'rows':2,'frames':8,'fps':6,'inset':2}},'base':'812152d2','status':'art studies, not installed; native-detail, object-depth and registration review pending','maps':{},'assets':{}}
for p in sorted(OUT.glob('*.png')):
 if p.name.startswith('review-'):continue
 with Image.open(p) as im:
  metadata={'size':list(im.size),'mode':im.mode,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
  if im.mode=='RGBA':metadata['alphaRange']=list(im.getextrema()[3])
 manifest['assets'][p.name]=metadata
for key,reference in SOURCES.items():
 row={'reference':reference,'floor':f'{key}-floor-study.png','nature':f'{key}-nature-study.png','status':'layer prototype; rail feet/navigation checked; per-object depth and visual acceptance pending'}
 if key=='border34' and (OUT/'border34-floor-v2-study.png').exists():row['floor']='border34-floor-v2-study.png'
 if (OUT/f'{key}-rails-study.png').exists():row['rails']=f'{key}-rails-study.png'
 if (OUT/f'{key}-liquid-study.png').exists():row['liquid']=f'{key}-liquid-study.png'
 flows={'zone1':'img/map-zone1/v4/flow-v4.png','zone2':'img/map-zone2/v2/flow-v2.png','zone3':'img/map-zone3/v1/flow-v1.png','border23':'img/frontier-route/zone2-3-v4-flow.png','border34':'img/frontier-route/zone3-4-v2-flow.png'}
 if key in flows:row['flow']=flows[key]
 repairs=OUT/'floor-repairs.json'
 if repairs.exists() and key in json.loads(repairs.read_text()):row['floorPatches']=json.loads(repairs.read_text())[key]
 infill=OUT/'floor-infill.json'
 if infill.exists() and key in json.loads(infill.read_text()):row['floorInfill']=json.loads(infill.read_text())[key]
 registration=OUT/'object-registration.json'
 if registration.exists() and key in json.loads(registration.read_text()):row['railsRegistration']=json.loads(registration.read_text())[key]
 row['filesPresent']=all((OUT/row[k]).exists() for k in ['floor','nature'])
 manifest['maps'][key]=row
manifest['maps']['border12']={'reference':'img/frontier-route/zone1-2-v6.webp','floor':'floor-study.png','nature':'nature-study.png','liquid':'liquid-study.png','rails':'rails-study.png','status':'working preview; visual roots, object depth, seams and physical-mobile performance pending'}
# Source metadata only; coverage is a necessary condition, not proof of floor semantics.
for z,mod in [(1,'town-owner-walkmask'),(2,'town-owner-walkmask-asia'),(3,'town-owner-walkmask-west'),(4,'town-owner-walkmask-cyberhell')]:
 image=OUT/f'zone{z}-floor-study.png'
 if not image.exists():continue
 code=f"import{{TOWN_OWNER_WALK_RUNS as r}}from'./src/{mod}.js';console.log(JSON.stringify(r));"
 runs=json.loads(subprocess.check_output(['node','--input-type=module','-e',code],cwd=ROOT))
 cells=np.zeros(480*320,bool);at=0;on=False
 for n in runs:cells[at:at+n]=on;at+=n;on=not on
 with Image.open(image) as im:alpha=np.asarray(im.resize((480,320),Image.Resampling.NEAREST))[:,:,3].ravel()
 manifest['maps'][f'zone{z}']['opaqueCoverageAtOwnerFloorCells']=float(np.mean(alpha[cells]>180))
for key,module,export in [('border23','frontier-walkmask-asia-west-redraw','BORDER23_REDRAW_MASK'),('border34','frontier-walkmask-west-cyberhell-redraw','BORDER34_REDRAW_MASK')]:
 image=OUT/manifest['maps'][key]['floor']
 if not image.exists():continue
 code=f"import{{{export} as m}}from'./src/{module}.js';console.log(JSON.stringify(m));"
 mask=json.loads(subprocess.check_output(['node','--input-type=module','-e',code],cwd=ROOT));cells=np.zeros(mask['cols']*mask['rows'],bool);at=0;on=False
 for n in mask['runs']:cells[at:at+n]=on;at+=n;on=not on
 with Image.open(image) as im:alpha=np.asarray(im.resize((mask['cols'],mask['rows']),Image.Resampling.NEAREST))[:,:,3].ravel()
 manifest['maps'][key]['opaqueCoverageAtOwnerFloorCells']=float(np.mean(alpha[cells]>180))
repair_report=OUT/'b34-composed-floor-report.json'
if repair_report.exists():manifest['maps']['border34']['composedFloorRepair']=json.loads(repair_report.read_text())['repair']
manifest['coverageLimitation']='Opaque coverage can include a cliff or object; not a floor-alignment acceptance test.'
(OUT/'asset-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:{'filesPresent':v.get('filesPresent',True),'floorCoverage':v.get('opaqueCoverageAtOwnerFloorCells')}for k,v in manifest['maps'].items()},indent=2))
