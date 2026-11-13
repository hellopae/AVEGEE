"""Archive exact active Asia v2 crops and evidence. Run from repository root."""
from pathlib import Path
import hashlib, json, re, subprocess
import numpy as np
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1]
ROOT = OUT.parents[2]
CHUNKS = [f'r1-c{c}' for c in range(1, 5)]

def write(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n')

def main():
    master = Image.new('RGB', (4915, 3277))
    sources = []
    for p in sorted((ROOT/'img/map-zone2/v2').glob('r*-c*.webp')):
        r, c = map(int, re.findall(r'\d+', p.stem))
        master.paste(Image.open(p), ((c-1)*1024, (r-1)*1024))
        sources.append(dict(path=str(p.relative_to(ROOT)), sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
    source = (ROOT/'src/town-owner-walkmask-asia.js').read_text()
    runs = json.loads(re.search(r'WALK_RUNS=(\[.*?\]);', source).group(1))
    mask = np.zeros(sum(runs), np.uint8)
    at = 0
    for i, n in enumerate(runs):
        mask[at:at+n] = i % 2
        at += n
    mask = np.array(Image.fromarray(mask.reshape(320, 480)).resize(master.size, Image.Resampling.NEAREST))
    code = "import {applyTownZoneLayout,TOWN_PROP_SITES,TOWN_HOUSE_SITES,TOWN_STATION_SITES} from './src/town-layout.js'; applyTownZoneLayout('asia'); console.log(JSON.stringify({props:TOWN_PROP_SITES,houses:TOWN_HOUSE_SITES,stations:TOWN_STATION_SITES}));"
    runtime = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', code], cwd=ROOT))
    # Baked vegetation fringes selected on source before seeing generated alignment.
    # Boxes are search areas, not rectangular inpaint masks: only upright plants over paving are targeted.
    regions = {
        'r1-c1': [[267,514,65,83],[742,736,105,63],[654,904,90,56],[875,843,101,71]],
        'r1-c2': [[337,814,102,74],[876,799,107,81]],
        'r1-c3': [[277,777,91,66],[395,801,115,57],[690,876,114,69]],
        'r1-c4': [[430,548,83,72],[145,770,74,66]],
    }
    objects = []
    for chunk, boxes in regions.items():
        ox = (int(chunk[-1])-1)*1024
        for i, (x, y, w, h) in enumerate(boxes):
            objects.append(dict(id=f'asia-{chunk}-paving-fringe-{i:02}', chunk=[chunk], kind='baked upright vegetation intruding on paving', action='remove-paving-intrusion-only', masterPx=[ox+x,y,w,h], walkmaskFraction=float(mask[y:y+h,ox+x:ox+x+w].mean()), removalVerified=False))
    objects += [dict(id='asia-inaccessible-scenery', chunk=CHUNKS, action='keep-baked', kind='mountains, off-floor trees, bones on inaccessible ledges, cliff moss'), dict(id='asia-fluid-cloud-base', chunk=CHUNKS, action='keep-baked', kind='lava, turquoise river, falls, mist and large cloud sea; preserve silhouettes'), dict(id='asia-structural-architecture',chunk=CHUNKS,action='keep-baked',kind='plaza contours, stairs, bridge decks, rails and support columns')]
    write(OUT/'objects-inventory.json', dict(zone='asia', scope=CHUNKS, coordinates='master 1x pixels, bbox x,y,width,height', evidence=['src/town-owner-walkmask-asia.js','src/town-layout.js','src/town-asia-trees.js','src/zone-skin.js'], runtimeObjects=runtime, runtimeObjectPolicy='Separate depth-sorted runtime sprites are evidence only, not painted objects to erase at their screen boxes.', objects=objects, allRemovalsVisuallyVerified=False))
    for chunk in CHUNKS:
        d = OUT/chunk
        (d/'inputs').mkdir(parents=True, exist_ok=True)
        ox = (int(chunk[-1])-1)*1024
        tiles = []
        for row in range(2):
            for col in range(2):
                name = f'q{row+1}{col+1}'
                x, y = ox+col*512, row*512
                x0, y0, x1, y1 = max(0,x-64), max(0,y-64), min(4915,x+576), min(3277,y+576)
                master.crop((x0,y0,x1,y1)).save(d/'inputs'/f'{name}-v2.webp', lossless=True, method=6)
                targets = []
                for obj in objects:
                    if obj['action']=='keep-baked' or chunk not in obj['chunk']:
                        continue
                    a,b,w,h = obj['masterPx']
                    if a+w>x0 and a<x1 and b+h>y0 and b<y1:
                        targets.append(dict(id=obj['id'],bboxInputPx=[a-x0,b-y0,w,h]))
                tiles.append(dict(id=name, coreMasterPx1x=[x,y,512,512],contextMasterPx1x=[x0,y0,x1-x0,y1-y0],coreChunkPx1x=[col*512,row*512,512,512],contextChunkPx1x=[x0-ox,y0,x1-x0,y1-y0],removalTargets=targets))
        write(d/'inputs/tiles.json', tiles)
        write(d/'removed.json',dict(objects=[obj for obj in objects if chunk in obj['chunk'] and obj['action']!='keep-baked'], allRemovalsVisuallyVerified=False, note='Requested vegetation removals; IDs are not a claim of completed removal. See README visual findings.'))
    z = np.array(master)
    z[mask>0] = z[mask>0]*.55 + np.array([0,255,180])*.45
    Image.fromarray(z[:1024,:4096]).resize((2048,512)).save(OUT/'walkmask-review.jpg',quality=90)
    write(OUT/'inputs-provenance.json',dict(sources=sources, terrain='img/map-zone2/v2/',runtimeRepairsApplied=False,reason='src/zone-skin.js asia terrain inherits repairs:false',referenceHistory=dict(plaza='bc9dc4dd',hdFull='d54fac28'),method='2x2 512px cores, 64px context per side clipped at master boundaries'))

if __name__=='__main__':
    main()
