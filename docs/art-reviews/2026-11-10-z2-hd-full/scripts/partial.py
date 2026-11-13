"""Register available native parts without inventing a missing quadrant or final export."""
from pathlib import Path
import importlib.util,json
import numpy as np
from PIL import Image,ImageDraw,ImageFont
O=Path(__file__).resolve().parents[1];spec=importlib.util.spec_from_file_location('terrain_assemble',O/'scripts/assemble.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
chunk='r2-c3';d=O/chunk;tiles=json.loads((d/'inputs/tiles.json').read_text());reg=[];missing=[];done=[]
preview=Image.new('RGB',(2048,2048),'#29313b');draw=ImageDraw.Draw(preview)
for t in tiles:
 q=t['id']
 if not (d/f'{q}-native.webp').exists():missing.append(q);continue
 aligned,rec=mod.register(d,t);reg.append(rec);done.append(q);cx,cy,cw,ch=t['coreChunkPx1x'];x,y,_,_=t['contextChunkPx1x']
 crop=Image.fromarray(aligned).crop(((cx-x)*2,(cy-y)*2,(cx-x+cw)*2,(cy-y+ch)*2));preview.paste(crop,(cx*2,cy*2))
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',34)
for t in tiles:
 if t['id'] in missing:
  cx,cy,cw,ch=t['coreChunkPx1x'];draw.rectangle((cx*2,cy*2,(cx+cw)*2-1,(cy+ch)*2-1),outline='#ff6d7b',width=6);draw.text((cx*2+40,cy*2+60),f"{t['id']} PENDING - NO GENERATED IMAGE",font=font,fill='white')
preview=preview.resize((1024,1024),Image.Resampling.LANCZOS);sheet=Image.new('RGB',(1040,1080),'#151922');sheet.paste(preview,(8,48));ImageDraw.Draw(sheet).text((8,10),'PARTIAL PREVIEW: core crops only; NOT blended/final terrain',font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',20),fill='white');sheet.save(d/f'{chunk}-partial-review.jpg',quality=78,subsampling=0)
mod.write(d/'registration.json',dict(chunk=chunk,outputScale=2,complete=False,pendingParts=missing,neighborChunkSeamsApplied=False,tiles=reg))
mod.write(d/'structure.json',dict(state='not measured: full chunk is incomplete',wholeStructureWithin4pxVerified=False,pendingParts=missing))
mod.write(d/'sharpness.json',dict(state='not measured: no final blended chunk',threshold=10,pendingParts=missing))
m=json.loads((O/'generation-prompts.json').read_text());summary=json.loads((O/'run-summary.json').read_text());entries={r['chunk']:r for r in summary['chunks']};entries[chunk]=dict(chunk=chunk,completeParts=done,pendingParts=missing,assemblyPending=True,pendingReason='16-call cap reached: one redundant redraw after an asynchronous archive-status handling error',nativeSizes={r['id']:r['nativeSize'] for r in reg},registrationAvailableForAllCompletedParts=True,sharpnessRatioLaplacian=None,structureMaxReliablePx1x=None,wholeStructureWithin4pxVerified=False)
summary.update(chunks=list(entries.values()),imageGenCalls=len(m['generations'])+len(m.get('failedGenerations',[])),successfulNativeParts=sum(g.get('selected',True) for g in m['generations']),failedCalls=m.get('failedGenerations',[]),pendingParts=[f'{chunk}/{q}' for q in missing],allRequestedChunksComplete=False)
mod.write(O/'run-summary.json',summary);print(json.dumps(entries[chunk],indent=2))
