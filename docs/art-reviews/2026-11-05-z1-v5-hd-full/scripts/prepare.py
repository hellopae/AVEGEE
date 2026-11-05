from pathlib import Path
import json,hashlib
from PIL import Image
O=Path(__file__).resolve().parents[1]
P=Path('/Users/agapae/agapae-work/.codex-worktrees/20261105T020514Z-5d66c53d/docs/art-reviews/2026-11-05-z1-v5-hd')
T=Path('/Users/agapae/agapae-work/.codex-worktrees/20261105T025229Z-00c52f6e/docs/art-reviews/2026-11-05-z1-v5-plaza-detail')
master=Image.open(P/'inputs/master-lossless.webp').convert('RGB')
inv=json.loads((P/'objects-inventory.json').read_text())
style=T/'tiles-2x2/q11-native.webp'
# Archive only a material crop of the approved redraw; no access to the owner's folder.
Image.open(style).crop((350,250,950,750)).save(O/'style-reference.webp',lossless=True)
manifest={'tool':'built-in image_gen.imagegen','plannedCalls':8,'generations':[]}
for chunk,cy in [('r1-c4',0),('r3-c4',2048)]:
 d=O/chunk; (d/'inputs').mkdir(parents=True,exist_ok=True)
 master.crop((3072,cy,4096,cy+1024)).save(d/'inputs/v5-repaired.webp',lossless=True)
 records=[]
 for q,xx,yy in [('q11',0,0),('q12',512,0),('q21',0,512),('q22',512,512)]:
  gx,gy=3072+xx,cy+yy
  x0,y0=max(0,gx-64),max(0,gy-64);x1,y1=min(4915,gx+576),min(3277,gy+576)
  ref=d/f'inputs/{q}-v5.webp';master.crop((x0,y0,x1,y1)).save(ref,lossless=True)
  objects=[]
  for o in inv:
   if o['action']=='keep-baked':continue
   x,y,w,h=o['bboxWorld']; x*=4915/3840;w*=4915/3840;y*=3277/2560;h*=3277/2560
   if x+w<=x0 or x>=x1 or y+h<=y0 or y>=y1:continue
   objects.append({'id':o['id'],'kind':o['kind'],'bboxPercent':[round((x-x0)/(x1-x0)*100,1),round((y-y0)/(y1-y0)*100,1),round(w/(x1-x0)*100,1),round(h/(y1-y0)*100,1)],'action':o['action']})
  prompt="Use case: precise-object-edit. Asset: production hand-painted isometric game terrain microtile. Edit FIRST input crop; SECOND image is ONLY the material-detail style reference from the approved plaza redraw. Return ONLY ONE terrain crop with exactly the FIRST image's aspect ratio, identical framing, full bleed, no borders or captions. Preserve every original large shape, paved boundary, stair count/width/position, cliff silhouette, bank, bridge deck and path boundary at exact input coordinates. Do not redesign, shift, zoom or rotate anything. Repaint with substantially more ACTUAL DRAWN detail per stone: sharp but hand-painted chipped bevels, tiny irregular mineral grain, fissures, fine recessed mortar, subtle sparse moss inside cracks and scattered tiny dry leaves. Preserve FIRST image's overall lighting, colors and broad value hierarchy. Preserve all blue water, purple river, lava, waterfalls, cloud sea and fog as a detailed base layer in their EXACT original outlines and locations for existing animation masks. Keep inaccessible distant forest and mountains. No blur, no DOF, no parallax, no fake sharpening halos, no photograph noise. Keep all objects clipped exactly where crossing the four edges. Need maximum native resolution, ideally 2048 on long side; never put smaller art inside a larger canvas. Create finer resolved detail instead of a blurry enlargement. Remove ONLY the listed foreground objects, including their shadows, filling with continuous underlying ground. For bridge-rail entries remove rails/posts ONLY, always preserve the complete deck and stairs. Do not add trees, shrubs, rocks or props. Object boxes below are [left,top,width,height] in percent of FIRST image, may be clipped by the frame. Treat boxes as approximate object locations, not rectangles to erase. Objects: "+json.dumps(objects)+f". Tile {chunk}/{q}; represents {x1-x0} by {y1-y0} map pixels. Geometry must remain within 4 original map pixels. Match SECOND reference for material quality only, never copy its layout."
  rec={'chunk':chunk,'id':q,'coreGlobalPx1x':[gx,gy,512,512],'corePx1x':[xx,yy,512,512],'contextGlobalPx1x':[x0,y0,x1-x0,y1-y0],'contextPx1x':[x0-3072,y0-cy,x1-x0,y1-y0],'reference':str(ref.relative_to(O)),'objects':objects,'prompt':prompt,'referenced_image_paths':[str(ref.resolve()),str((O/'style-reference.webp').resolve())]}
  manifest['generations'].append(rec);records.extend(objects)
 unique={r['id']:r for r in records}
 (d/'removed.json').write_text(json.dumps({'plannedObjects':list(unique.values()),'removedIds':[],'verification':'Pending generation and visual inspection'},indent=2))
(O/'generation-prompts.json').write_text(json.dumps(manifest,indent=2))
sources=[P/'inputs/master-lossless.webp',P/'objects-inventory.json',T/'scripts/assemble.py',style]
(O/'source-provenance.json').write_text(json.dumps([{'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sources],indent=2))
print([(r['chunk'],r['id'],r['contextGlobalPx1x'],[o['id'] for o in r['objects']]) for r in manifest['generations']])
