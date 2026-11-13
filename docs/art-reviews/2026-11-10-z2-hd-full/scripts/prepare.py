"""Prepare exact master crops; no generation or runtime edits. Run from repository root."""
from pathlib import Path
import hashlib, json, re
import numpy as np
from PIL import Image, ImageDraw

O = Path(__file__).resolve().parents[1]
ROOT = O.parents[2]
CHUNKS = ['r2-c4', 'r2-c5', 'r3-c1', 'r3-c2']
def dump(p, data):
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')

def main():
    master = Image.new('RGB', (4915,3277))
    sources = []
    for r in range(1,5):
        for c in range(1,6):
            p = ROOT/f'img/map-zone2/v2/r{r}-c{c}.webp'
            master.paste(Image.open(p), ((c-1)*1024,(r-1)*1024))
            sources.append({'path':str(p.relative_to(ROOT)), 'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
    text=(ROOT/'src/town-owner-walkmask-asia.js').read_text()
    runs=json.loads(re.search(r'TOWN_OWNER_WALK_RUNS=(\[.*?\]);',text).group(1))
    mask=np.zeros(480*320,np.uint8); i=0
    for n,run in enumerate(runs):
        if n%2: mask[i:i+run]=1
        i+=run
    assert i==480*320
    mask=Image.fromarray(mask.reshape(320,480)*255).resize(master.size,Image.Resampling.NEAREST)
    trees=json.loads((ROOT/'src/town-asia-trees.js').read_text().split('=',1)[1].strip().rstrip(';'))
    inventory=[]
    for n,t in enumerate(trees):
        x,y=t['x']*4915,t['y']*3277
        chunk=f'r{int(y)//1024+1}-c{int(x)//1024+1}'
        if chunk in CHUNKS:
            inventory.append(dict(id=f'asia-tree-{n}',kind='runtime-tree',footMasterPx1x=[x,y],chunk=chunk,
                on_walk=t['on_walk'],action='separate-runtime-sprite',note='Not automatically a baked object; do not erase background forest from sprite footprint.'))
    # Conservative visual survey of baked intrusions, checked with owner floor mask.
    removals={
        'r2-c4':[(305,342,210,100),(467,405,100,90),(465,503,105,72),(728,498,78,76)],
        'r2-c5':[(23,691,90,75),(370,838,150,115)],
        'r3-c1':[],
        'r3-c2':[],
    }
    for chunk,boxes in removals.items():
        r,c=map(int,re.findall(r'\d+',chunk)); x,y=(c-1)*1024,(r-1)*1024
        for n,(bx,by,bw,bh) in enumerate(boxes):
            inventory.append(dict(id=f'{chunk}-floor-shrub-{n+1}',chunk=chunk,kind='baked-low-shrub',
                action='remove-on-floor-only',masterRectPx1x=[x+bx,y+by,bw,bh],
                ownerWalkMaskFraction=float(np.array(mask.crop((x+bx,y+by,x+bx+bw,y+by+bh))).mean()/255),
                note='Remove only vegetation projecting onto existing stone floor in this survey region; retain cliff-edge/forest vegetation and exact floor contour.'))
    dump(O/'objects-inventory.json',dict(zone='asia',scope=CHUNKS,coordinateFormat='[x,y,width,height], master 1x',
        evidence=['src/town-layout.js','src/town-asia-trees.js','src/town-owner-walkmask-asia.js','src/zone-skin.js'],
        rules={'liquidsAndClouds':'keep-baked in original silhouette','unreachableForest':'keep-baked','stairsAndBridgeDecks':'keep-baked','bridgeRails':'keep unless individually requested'},objects=inventory))
    jobs=[]
    for chunk in CHUNKS:
        r,c=map(int,re.findall(r'\d+',chunk));x,y=(c-1)*1024,(r-1)*1024
        w,h=min(1024,4915-x),min(1024,3277-y); d=O/chunk;(d/'inputs').mkdir(parents=True,exist_ok=True)
        old=master.crop((x,y,x+w,y+h));old.save(d/'inputs/master.webp',lossless=True)
        overlay=old.convert('RGBA'); tint=Image.new('RGBA',old.size,(255,30,50,0)); tint.putalpha(mask.crop((x,y,x+w,y+h)).point(lambda a:round(a*.3)))
        overlay=Image.alpha_composite(overlay,tint);draw=ImageDraw.Draw(overlay)
        requested=[a for a in inventory if a['chunk']==chunk and a['action']=='remove-on-floor-only']
        for a in requested:
            bx,by,bw,bh=a['masterRectPx1x'];draw.rectangle((bx-x,by-y,bx-x+bw,by-y+bh),outline='yellow',width=2)
        overlay.convert('RGB').save(d/'walkmask-inventory.jpg',quality=50,subsampling=2,optimize=True)
        tiles=[]; cut=(w+1)//2
        for rr in range(2):
            for cc in range(2):
                tid=f'q{rr+1}{cc+1}';cx=x+(cut if cc else 0);cy=y+rr*512;cw=w-cut if cc else cut
                rect=[max(0,cx-64),max(0,cy-64),min(4915,cx+cw+64),min(3277,cy+512+64)]
                im=master.crop(rect);im.save(d/f'inputs/{tid}-master.webp',lossless=True)
                rem=[]
                for a in requested:
                    bx,by,bw,bh=a['masterRectPx1x']
                    if bx<rect[2] and bx+bw>rect[0] and by<rect[3] and by+bh>rect[1]:
                        rem.append(dict(id=a['id'],rectInInputPx=[bx-rect[0],by-rect[1],bw,bh]))
                tile=dict(id=tid,coreMasterPx1x=[cx,cy,cw,512],contextMasterPx1x=[rect[0],rect[1],im.width,im.height],removal=rem)
                tiles.append(tile)
                prompt=('Use case: precise-object-edit. Edit the input image IN PLACE as one full-bleed production hand-painted isometric game terrain microtile. '
                    'This is an exact terrain restoration, not loose inspiration. Preserve the exact crop, framing, perspective, ALL terrace/path boundaries, '
                    'stone pavement outer contours, stair count/width/position, cliff silhouettes, rocks, waterbanks, waterfall shapes, river course and mist/cloud silhouettes. '
                    'Do not move, rotate, zoom, redesign or invent structures. Keep original East Asian Chinese/Japanese underworld style, cool blue-grey stone, '
                    'red maple/pink sakura/pine foliage, turquoise river, gold trim and red bridges. Match original overall lighting, palette and values. '
                    'Draw substantially more REAL fine painterly detail: chipped stone bevels, distinct stones, fine recessed mortar, tiny fissures/mineral grain, sparse moss '
                    'in cracks, individual small leaves, detailed bark and rock crevices. Keep water and mist as painted base layers in exactly their existing contours. '
                    'Retain unreachable forest and mountains, all stairs, bridge decks, gold posts/rails and their exact silhouettes. '
                    'Remove only the specifically listed low shrubs on owner-walkable stone. If no rectangles are listed, preserve ALL vegetation. Fill removed shrubs with continuous paving; never widen the path or erase forest. '
                    f'Crop {chunk}/{tid}, input {im.width}x{im.height} map pixels. Requested floor-only removal survey rectangles in input coordinates [x,y,w,h]: {json.dumps(rem)}. '
                    'Rectangles locate intrusions, not areas to erase wholesale. Keep floor/rock boundaries inside them. '
                    'Output just this same terrain crop, at maximum native resolution ideally 2048 pixels tall, exact same aspect ratio. '
                    'No borders, labels, characters, new props, new clouds, DOF, blur, parallax, photographic noise or sharpening halos. '
                    'Precisely align every object where it crosses the four image edges; add resolved material detail instead of enlarging blur.')
                jobs.append(dict(chunk=chunk,id=tid,prompt=prompt,input=f'{chunk}/inputs/{tid}-master.webp',status='pending'))
        dump(d/'inputs/tiles.json',tiles)
        if not (d/'removed.json').exists():
            dump(d/'removed.json',dict(requestedObjects=requested,status='requested; output visual review pending',removedIdsVerified=[]))
    if not (O/'generation-prompts.json').exists():
        dump(O/'generation-prompts.json',dict(tool='built-in image_gen.imagegen',plannedCount=16,generationCount=0,generations=jobs))
    for f in ['src/zone-skin.js','src/town-terrain-repair.js','src/town-owner-walkmask-asia.js','src/town-asia-trees.js','src/town-layout.js']:
        sources.append(dict(path=f,sha256=hashlib.sha256((ROOT/f).read_bytes()).hexdigest()))
    dump(O/'source-provenance.json',dict(sources=sources,activeTerrain='img/map-zone2/v2/',repairsApplied=[],
        note='terrain() default repairs:false; no zone2 runtime repairs. References recovered read-only from git bc9dc4dd and 0c544a3f.'))

if __name__=='__main__': main()
