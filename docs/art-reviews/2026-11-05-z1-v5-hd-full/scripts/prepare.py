from pathlib import Path
import json,hashlib
from PIL import Image
O=Path(__file__).resolve().parents[1]
if (O/'generation-prompts.json').exists():raise SystemExit('Inputs already prepared; refusing to reset generation history.')
P=Path('/Users/agapae/agapae-work/.codex-worktrees/20261105T020514Z-5d66c53d/docs/art-reviews/2026-11-05-z1-v5-hd')
master=Image.open(P/'inputs/master-lossless.webp').convert('RGB')
objects=json.loads((P/'objects-inventory.json').read_text())
lumps=json.loads(Path('/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Toby/2026-11-05-v5-white-lumps.json').read_text())['lumps']
style=Path('/Users/agapae/agapae-work/.codex-worktrees/20261105T025229Z-00c52f6e/docs/art-reviews/2026-11-05-z1-v5-plaza-detail/tiles-2x2/q11-native.webp')
Image.open(style).save(O/'style-reference.webp',lossless=True)
manifest={'tool':'built-in image_gen.imagegen','plannedGenerations':8,'generations':[],'sourceMaster':str(P/'inputs/master-lossless.webp'),'sourceMasterSha256':hashlib.sha256((P/'inputs/master-lossless.webp').read_bytes()).hexdigest(),'repairNote':'Pilot repaired lossless master; no repair definitions intersect these chunks or their 64px contexts.'}
for chunk,x,y,w,h in [('r3-c1',0,2048,1024,1024),('r1-c5',4096,0,819,1024)]:
 d=O/chunk;(d/'inputs').mkdir(parents=True,exist_ok=True)
 master.crop((x,y,x+w,y+h)).save(d/'inputs/v5.webp',lossless=True)
 obs=[]
 for o in objects:
  if o['action']=='keep-baked':continue
  bx,by,bw,bh=o['bboxWorld'];rect=[bx*4915/3840,by*3277/2560,bw*4915/3840,bh*3277/2560]
  if rect[0]+rect[2]>max(0,x-64) and rect[0]<min(4915,x+w+64) and rect[1]+rect[3]>max(0,y-64) and rect[1]<min(3277,y+h+64):obs.append(dict(o,rectMapPx1x=rect))
 ls=[o for o in lumps if chunk in o['chunks']]
 (d/'removed.json').write_text(json.dumps({'objects':obs,'requestedRemovedIds':[o['id'] for o in obs],'removedIds':[],'fogRemovalIds':[o['id'] for o in ls if 'delete' in o['review']],'fogKeptIds':[o['id'] for o in ls if 'keep' in o['review']],'visualRemovalVerified':False},indent=2,ensure_ascii=False))
 split=(w+1)//2
 for ri,(cy,ch) in enumerate([(0,512),(512,512)],1):
  for ci,(cx,cw) in enumerate([(0,split),(split,w-split)],1):
   name=f'q{ri}{ci}';core=[x+cx,y+cy,cw,ch];x0=max(0,core[0]-64);y0=max(0,core[1]-64);x1=min(4915,core[0]+cw+64);y1=min(3277,core[1]+ch+64);ctx=[x0,y0,x1-x0,y1-y0]
   ref=d/f'inputs/{name}-v5.webp';master.crop((x0,y0,x1,y1)).save(ref,lossless=True)
   remove=[]
   for o in obs:
    bx,by,bw,bh=o['rectMapPx1x']
    if bx+bw>x0 and bx<x1 and by+bh>y0 and by<y1:remove.append(f"{o['id']} ({o['kind']}) near crop rectangle {[round(bx-x0),round(by-y0),round(bw),round(bh)]}")
   fog=[]
   for o in lumps:
    bx,by,bw,bh=o['masterPx']
    if bx+bw>x0 and bx<x1 and by+bh>y0 and by<y1:fog.append(f"{o['id']} {[bx-x0,by-y0,bw,bh]}: {o['review']}")
   prompt=f'''Use case: precise-object-edit. Asset: production hand-painted isometric game terrain microtile. Edit FIRST image; SECOND image is ONLY the approved material-detail style reference, never copy its layout. Return ONE full-bleed terrain crop with IDENTICAL framing and aspect ratio to FIRST image. Crop {chunk}/{name}, {ctx[2]} by {ctx[3]} original map pixels. Preserve every large shape, paving ring, ornament, stair count/width/position, cliff silhouette, path boundary, riverbank, liquid channel and bridge DECK at exact input coordinates. No redesign, crop, zoom, rotation or camera change. Repaint substantially finer actual drawn detail: individual chipped stone bevels, fine mineral grain, fissures, recessed mortar, subtle sparse moss inside cracks and tiny dry leaves, at the approved second image's material quality. Preserve FIRST image's overall lighting, colors and broad value hierarchy, including cool purple/brown cliffs or ice-blue stones as present. Keep lava, purple river, blue water, waterfalls and large white cloud seas as BASE terrain with exactly original shapes; animation masks must still align. Keep distant inaccessible forest, mountains and sky with matching fine detail. Remove ONLY these inventoried foreground objects and their shadows, filling continuous matching ground underneath: {'; '.join(remove) if remove else 'none in this crop; keep distant scenery'}. Rectangle units are FIRST-image original pixels [x,y,width,height], approximate object survey; do not erase the rectangular region or architecture. Bridge rails/posts may be removed, NEVER bridge floors or stairs. Fog instructions: {'; '.join(fog) if fog else 'no specified small fog lump here; preserve large edge cloud seas'}. For deleted fog fill coherent existing ravine/cliff terrain; keep specified pale stone plazas. No new trees, bushes, props or structures. Keep all features clipped at identical edge locations. No blur, DOF, parallax, sharpening halos or photographic noise. Maximum resolved native detail, ideally 2048px long edge; do not embed image in a larger canvas. No borders, captions, text or watermark.'''
   manifest['generations'].append(dict(chunk=chunk,id=name,chunkRectPx1x=[x,y,w,h],coreMapPx1x=core,contextMapPx1x=ctx,prompt=prompt,referenced_image_paths=[str(ref.resolve()),str((O/'style-reference.webp').resolve())],status='pending'))
(O/'generation-prompts.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
print([(g['chunk'],g['id'],g['contextMapPx1x']) for g in manifest['generations']])
