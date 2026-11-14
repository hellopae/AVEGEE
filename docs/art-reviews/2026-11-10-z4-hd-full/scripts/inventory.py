"""Record this run's visually reviewed baked groups and separate runtime objects."""
import json
import re
from pathlib import Path
import numpy as np
from PIL import Image
from prepare import OUT, ROOT, CHUNKS, bounds, dump, sha, walkmask

# Rectangles and feet measured on the four source tile images, in tile-local 1x.
GROUPS = {
    'r2-c4': [
        ('upper-cliff-crystals-pylons', [215,0,650,350], [570,342]),
        ('stair-side-rails', [785,235,991,391], [805,370]),
        ('central-path-rim-pylon', [318,314,419,565], [361,555]),
        ('lower-mountain-border', [0,490,755,1024], [672,1000]),
        ('lower-bridge-rails', [797,925,1024,1024], [865,1020]),
    ],
    'r2-c5': [
        ('upper-cliff-border', [0,167,470,492], [365,477]),
        ('middle-rock-border', [188,335,819,732], [550,665]),
        ('stair-side-rails', [77,502,265,710], [106,695]),
        ('lower-plaza-rim', [556,705,819,1024], [650,990]),
        ('lower-bridge-rails', [0,916,213,1024], [159,1010]),
    ],
    'r3-c1': [
        ('north-bank-rocks-crystals', [0,0,1024,242], [560,222]),
        ('south-riverbank-border', [0,320,1024,730], [296,620]),
        ('lower-plaza-border', [0,675,1024,1024], [785,990]),
    ],
    'r3-c2': [
        ('north-bank-rocks-pylons', [0,0,1024,211], [660,194]),
        ('middle-riverbank-border', [0,390,1024,631], [740,605]),
        ('plaza-rock-island', [183,645,737,1010], [426,895]),
        ('east-plaza-rim', [703,530,1024,852], [800,825]),
    ],
}


def main():
    mask = walkmask()
    def on_floor(x, y):
        return bool(mask[min(319, int(y/3277*320)), min(479, int(x/4915*480))])
    objects = []
    for chunk, groups in GROUPS.items():
        x0, y0, _, _ = bounds(chunk)
        for name, box, foot in groups:
            x, y = x0+foot[0], y0+foot[1]
            objects.append({'id':f'z4-{chunk}-{name}', 'chunk':chunk,
                'bboxPx1x':[box[0]+x0, box[1]+y0, box[2]+x0, box[3]+y0],
                'sampleFootPx1x':[x,y], 'ownerWalkmaskAtSampleFoot':on_floor(x,y),
                'action':'keep-baked',
                'reason':'connected cliff/bank/island border or stair/bridge railing; source inspection found no isolated raised object in the open pavement corridor',
                'reviewEvidence':['source-contact.jpg','walkmask-contact.jpg']})
        objects.append({'id':f'z4-{chunk}-fluid-fog-base', 'chunk':chunk,
            'action':'keep-baked', 'reason':'cyan river/waterfalls, orange lava where present and purple fog retain their source extent as the painted base'})
    pole_source = ROOT/'src/z4-poles-data.js'
    poles = json.loads(re.search(r'Z4_POLES = Object.freeze\((\[.*?\])\.map',pole_source.read_text()).group(1))
    for i, (x,y,height) in enumerate(poles):
        px, py = x*4915, y*3277
        chunk = f'r{int(py//1024)+1}-c{int(px//1024)+1}'
        if chunk in CHUNKS:
            objects.append({'id':f'runtime-z4-pole-{i}', 'chunk':chunk,
                'footPx1x':[px,py], 'ownerWalkmaskAtFoot':on_floor(px,py),
                'action':'runtime-layer-only', 'source':f'src/z4-poles-data.js Z4_POLES[{i}]',
                'reason':'separate pole/wire rendering in src/z4-poles.js'})
    layout = (ROOT/'src/town-cyberhell-layout.js').read_text()
    layout = re.sub(r'//[^\n]*', '', layout)
    for ident, bx, by in re.findall(r'\b(\w+):site\((\d+),(\d+),', layout):
        px, py = int(bx)*4915/1536, int(by)*3277/1024
        chunk = f'r{int(py//1024)+1}-c{int(px//1024)+1}'
        if chunk in CHUNKS:
            objects.append({'id':f'runtime-station-{ident}', 'chunk':chunk,
                'footPx1x':[px,py], 'ownerWalkmaskAtFoot':on_floor(px,py),
                'action':'runtime-layer-only', 'source':'src/town-cyberhell-layout.js',
                'reason':'separate station sprite and reserved footprint'})
    sources = ['src/zone-skin.js','src/cyberhell-terrain.js','src/town-layout.js',
               'src/town-cyberhell-layout.js','src/town-owner-walkmask-cyberhell.js',
               'src/z4-poles-data.js','src/z4-poles.js']
    dump(OUT/'objects-inventory.json', {'zone':4,'skin':'cyberhell','scope':CHUNKS,
        'coordinateSpace':'full-map master 1x 4915x3277 pixels; bbox half-open [x0,y0,x1,y1]',
        'sources':{p:sha(ROOT/p) for p in sources}, 'repairs':False,
        'runtimeHouses':[], 'runtimeProps':[],
        'bakedRemovalCandidates':[],
        'limitations':'Border groups are visually reviewed, not individual collision masks. Owner mask cell = 8 world units, centre sampling. Sample feet do not classify a whole group. r3 lower plazas are outside this owner walkmask. No freestanding pavement obstruction identified in this scope.',
        'objects':objects})
    for chunk in CHUNKS:
        dump(OUT/chunk/'removed.json', {'chunk':chunk,'removedObjectIds':[],
            'reviewedBakedGroupIds':[o['id'] for o in objects if o['chunk']==chunk and o['action']=='keep-baked'],
            'finding':'No isolated raised object identified in open source pavement corridors. Border ensembles retained.',
            'evidence':'../objects-inventory.json'})
    print(f'{len(objects)} inventory entries; 0 removal candidates')


if __name__ == '__main__':
    main()
