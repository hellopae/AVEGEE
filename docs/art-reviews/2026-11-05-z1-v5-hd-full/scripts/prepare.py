from pathlib import Path
import json, hashlib, shutil
from PIL import Image, ImageDraw
O=Path(__file__).resolve().parents[1]
if (O/'generation-prompts.json').exists():
 raise SystemExit('Preparation already recorded; refusing to overwrite generation evidence.')
P=Path('/Users/agapae/agapae-work/.codex-worktrees/20261105T020514Z-5d66c53d/docs/art-reviews/2026-11-05-z1-v5-hd')
inv=json.loads((P/'objects-inventory.json').read_text())
lumps=json.loads(Path('/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Toby/2026-11-05-v5-white-lumps.json').read_text())
master=Image.open(P/'inputs/master-lossless.webp').convert('RGB')
# All repair masks end above y=3008; this bottom-strip uses v5 unchanged.
manifest={'tool':'built-in image_gen.imagegen','generationCount':0,'mapSize':[4915,3277],'generations':[]}
for c in range(1,6):
 chunk=f'r4-c{c}'; d=O/chunk; (d/'inputs').mkdir(parents=True,exist_ok=True)
 x0=(c-1)*1024; w=min(1024,4915-x0); split=(w+1)//2
 master.crop((x0,3072,x0+w,3277)).save(d/'inputs/v5.webp',lossless=True)
 objects=[]
 for v in inv:
  if v['action']=='keep-baked':continue
  x,y,ow,oh=v['bboxWorld']; box=[x*4915/3840,y*3277/2560,ow*4915/3840,oh*3277/2560]
  if box[0]<x0+w+64 and box[0]+box[2]>max(0,x0-64) and box[1]<3277 and box[1]+box[3]>3008:
   objects.append(dict(v,rectMapPx1x=box))
 (d/'removed.json').write_text(json.dumps({'requestedObjects':objects,'removedIds':[], 'visuallyVerified':False,'fogLumps':[],'note':'No listed white fog lump intersects row4 or its context. IDs include objects in retained overlap.'},ensure_ascii=False,indent=2))
 for q,start,end in [('q11',0,split),('q12',split,w)]:
  cx=max(0,x0+start-64); ex=min(4915,x0+end+64); rect=[cx,3008,ex-cx,269]
  crop=master.crop((cx,3008,ex,3277)); ip=d/f'inputs/{q}-v5.webp'; crop.save(ip,lossless=True)
  marked=crop.copy();draw=ImageDraw.Draw(marked); delete=[]
  for v in objects:
   x,y,ow,oh=v['rectMapPx1x']; bx=[max(0,x-cx),max(0,y-3008),min(ex-cx,x+ow-cx),min(269,y+oh-3008)]
   if bx[2]<=bx[0] or bx[3]<=bx[1]:continue
   draw.rectangle(bx,outline='#00ff00',width=2); delete.append({'id':v['id'],'rectCropPx1x':[round(z,2) for z in bx]})
  marked.save(d/f'inputs/{q}-removal-guide.webp',lossless=True)
  prompt='Use case: precise-object-edit. Asset: production hand-painted isometric game terrain microtile. Edit FIRST input crop. SECOND input is only a removal guide: bright green rectangles identify baked foreground trees/shrubs/rocks to erase completely, including cast shadows. Remove ONLY those marked foreground objects, fill their areas with continuous matching cliff/ground; do not copy guide outlines. Retain all unmarked distant forest, cliffs, clouds and architecture. THIRD input is an approved terrain detail example, only for material quality; never import its composition. Return ONLY ONE wide terrain crop with the FIRST image exact aspect ratio, identical framing, full bleed, no borders or captions. Preserve every original large shape, stair count/width/position, cliff silhouette, riverbanks, water/lava channels, paths, bridge floors and boundary at the exact input relative coordinates. Do not redesign, shift, zoom, rotate or crop. Retain large cloud sea and all liquids as a painted base, identical contours and locations. Repaint substantially more ACTUAL DRAWN detail: individual sharp hand-painted chipped stones, tiny mineral grain, fissures, recessed mortar, sparse moss and tiny fallen leaves where appropriate, crisp fine branching and leaves in distant forest. Match FIRST image overall lighting, palette and broad value hierarchy. No blur, DOF, parallax, sharpening halos or photographic noise. Keep all objects clipped exactly at the four edges. Request maximum native detail, ideally width 1536 or greater, never pad canvas. This crop represents '+str(rect[2])+' by 269 original map pixels. Tile '+chunk+'/'+q+'. Remove guide objects '+json.dumps(delete)+'.'
  manifest['generations'].append({'chunk':chunk,'id':q,'coreMapPx1x':[x0+start,3072,end-start,205],'contextMapPx1x':rect,'coreChunkPx1x':[start,0,end-start,205],'prompt':prompt,'references':[str(ip.resolve()),str((d/f'inputs/{q}-removal-guide.webp').resolve()),'/Users/agapae/agapae-work/.codex-worktrees/20261105T025229Z-00c52f6e/docs/art-reviews/2026-11-05-z1-v5-plaza-detail/r2-c3-2x2.webp'],'nativeFile':None,'removals':delete})
manifest['sourceProvenance']=[{'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in [P/'inputs/master-lossless.webp',P/'objects-inventory.json',Path('src/town-terrain-repair.js')]]
(O/'generation-prompts.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
over=master.crop((0,3008,4915,3277));over.resize((1966,108)).save(O/'source-overview.jpg',quality=95)
print([(x['chunk'],x['id'],x['contextMapPx1x'],x['removals']) for x in manifest['generations']])
