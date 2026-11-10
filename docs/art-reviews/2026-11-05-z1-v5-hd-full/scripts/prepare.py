"""Prepare the two assigned chunks. Reads existing terrain and reference evidence only."""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parents[1]
PILOT = Path('/Users/agapae/agapae-work/.codex-worktrees/20261105T020514Z-5d66c53d/docs/art-reviews/2026-11-05-z1-v5-hd')
REFERENCE = Path('/Users/agapae/agapae-work/.codex-worktrees/20261105T025229Z-00c52f6e/docs/art-reviews/2026-11-05-z1-v5-plaza-detail')
LUMPS = Path('/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Toby/2026-11-05-v5-white-lumps.json')
CHUNKS = ['r1-c1', 'r2-c1']
if (OUT / 'generation-prompts.json').exists():
    raise RuntimeError('Inputs already prepared. Preserve the recorded generation history.')
SX, SY = 4915 / 3840, 3277 / 2560
objects = json.loads((PILOT / 'objects-inventory.json').read_text())
lumps = json.loads(LUMPS.read_text())['lumps']
# There are no repair definitions intersecting these chunks or their 64px contexts.
master = Image.new('RGB', (4915, 3277))
for row in range(1, 4):
    for col in range(1, 3):
        master.paste(Image.open(ROOT / f'img/map-zone1/v5/r{row}-c{col}.webp'), ((col-1)*1024, (row-1)*1024))
(OUT / 'inputs').mkdir(exist_ok=True)
Image.open(REFERENCE / 'tiles-2x2/q11-native.webp').save(OUT / 'inputs/accepted-style.webp', lossless=True)
manifest = dict(tool='built-in image_gen.imagegen', plannedGenerationCount=8, generationLimit=10, generations=[])
base = ('Use case: precise-object-edit. Asset: production hand-painted isometric game terrain microtile. '
        'Edit FIRST image as the exact layout. SECOND image is ONLY the approved reference for fine painterly material quality, never copy its layout or circular plaza. '
        'Return ONLY ONE terrain crop, identical framing and aspect ratio, full bleed, no borders, no captions. '
        'Preserve every original large shape, paving outline, stair count/width/position, cliff silhouette, lava channel and waterfall boundary at exact input pixel coordinates. '
        'Do not redesign, shift, zoom or rotate anything. Repaint with substantially more ACTUAL DRAWN detail per stone: '
        'sharp hand-painted chipped bevels, tiny irregular mineral grain, fissures, fine recessed mortar, subtle sparse moss inside cracks and tiny dry leaves. '
        'Resolve distant mountains, red forest leaves and sky to the same painted detail level. '
        'Preserve the FIRST image overall warm ochre lighting, orange lava glow, purple grey cliffs, color and broad value hierarchy. '
        'Keep ALL lava, liquid falls and large sky/edge cloud sea painted as a base, with their exact existing silhouettes for animation mask alignment. '
        'No blur, DOF, parallax, fake sharpening halos, photographic noise, new objects or new vegetation. '
        'Keep objects clipped exactly where they cross the four edges. Need maximum native resolution, ideally 1254px or higher on the long side. '
        'Draw finer resolved detail instead of a blurry enlargement. '
        'Remove only the listed foreground trees/shrub beds and bridge rails/posts when visible in the approximate percent rectangles below, '
        'including any residual blurry object-erasure blobs there. Fill with continuous matching underlying ground or rock. '
        'Retain unreachable continuous distant forest and mountains. Bridge DECKS, stair treads and their exact outlines MUST remain intact. ')
for chunk in CHUNKS:
    row = int(chunk[1]); ox, oy = 0, (row-1)*1024
    folder = OUT / chunk
    (folder / 'inputs').mkdir(parents=True, exist_ok=True)
    selected = [o for o in objects if chunk in o['chunk'] and o['action'] != 'keep-baked']
    fog = [o for o in lumps if chunk in o['chunks'] and 'delete' in o['review']]
    (folder / 'removed.json').write_text(json.dumps(dict(objects=selected, fogLumps=fog, verification='requested removals; review against output required'), ensure_ascii=False, indent=2))
    master.crop((ox, oy, ox+1024, oy+1024)).save(folder / 'inputs/v5.webp', lossless=True)
    for qrow in range(2):
        for qcol in range(2):
            name = f'q{qrow+1}{qcol+1}'
            cx, cy = ox+qcol*512, oy+qrow*512
            x, y = max(0, cx-64), max(0, cy-64)
            right, bottom = min(4915, cx+576), min(3277, cy+576)
            w, h = right-x, bottom-y
            path = folder / f'inputs/{name}-v5.webp'
            master.crop((x,y,right,bottom)).save(path, lossless=True)
            removals = []
            # Include all overlapping objects even when inventory chunk labels only name a neighbour.
            for obj in objects:
                if obj['action'] == 'keep-baked':
                    continue
                bx, by, bw, bh = obj['bboxWorld']; bx *= SX; bw *= SX; by *= SY; bh *= SY
                if bx+bw <= x or by+bh <= y or bx >= right or by >= bottom:
                    continue
                rect = [round(100*(bx-x)/w,1), round(100*(by-y)/h,1), round(100*(bx+bw-x)/w,1), round(100*(by+bh-y)/h,1)]
                removals.append(dict(id=obj['id'], kind=obj['kind'], percentRect=rect))
            tile_fog=[]
            for obj in lumps:
                if 'delete' not in obj['review']:
                    continue
                bx,by,bw,bh=obj['masterPx']
                if bx+bw <= x or by+bh <= y or bx >= right or by >= bottom:
                    continue
                tile_fog.append(dict(id=obj['id'], percentRect=[round(100*(bx-x)/w,1),round(100*(by-y)/h,1),round(100*(bx+bw-x)/w,1),round(100*(by+bh-y)/h,1)]))
            prompt = base + f' This is {chunk}/{name}, covering {w}x{h} original map pixels. Removal rectangles are [left,top,right,bottom] percentages and may extend outside the crop. Foreground removal targets: {json.dumps(removals)}.'
            if tile_fog:
                prompt += f' Also DELETE these localized white/lavender fog lumps, reconstruct the continuous dark volcanic ravine/cliff underneath, preserving adjacent rock and lava silhouettes: {json.dumps(tile_fog)}. Preserve the large cloud sea elsewhere.'
            manifest['generations'].append(dict(chunk=chunk,id=name,corePx1x=[cx-ox,cy-oy,512,512],contextPx1x=[x-ox,y-oy,w,h],coreMasterPx1x=[cx,cy,512,512],contextMasterPx1x=[x,y,w,h],input=str(path.relative_to(OUT)),prompt=prompt,removalTargets=removals,fogTargets=tile_fog,status='pending'))
(OUT / 'generation-prompts.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print('Prepared',len(manifest['generations']),'crops')
