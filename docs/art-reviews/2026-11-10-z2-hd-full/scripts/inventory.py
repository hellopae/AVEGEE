"""Record owner-walkmask and source evidence for this run's bottom-row survey."""
import hashlib
import json
import re

import numpy as np
from prepare import OUT, ROOT, CHUNKS, walkmask, write_json


if __name__ == '__main__':
    mask = np.array(walkmask())>0
    tree_source = (ROOT/'src/town-asia-trees.js').read_text()
    trees = json.loads(re.search(r'ASIA_TREE_POINTS = (\[.*?\]);',tree_source,re.S).group(1))
    runtime_trees = [dict(id=f'asia-tree-{i}',kind=t['kind'],ownerFootPx1x=[t['x']*4915,t['y']*3277],
        onWalk=t['on_walk'],action='runtime-sprite-only',inThisRunContext=t['y']*3277>=3008) for i,t in enumerate(trees)]
    records = []
    for chunk in CHUNKS:
        x = (int(chunk[-1])-1)*1024
        m = mask[3072:3277,x:min(x+1024,4915)]
        ys,xs = np.where(m)
        records.append(dict(id=chunk+'-baked-scenery',chunk=chunk,
            coreRectPx1x=[x,3072,min(x+1024,4915),3277],ownerWalkPixels=int(m.sum()),
            ownerWalkBoundsPx1x=[int(xs.min()+x),int(ys.min()+3072),int(xs.max()+x+1),int(ys.max()+3073)] if len(xs) else None,
            action='keep-baked',removalIds=[],
            visualSurvey=('Walkable stair treads remain; side gold rails/posts and maple trunks outside floor remain. No trunk/bone/rock obstruction surveyed inside mask.' if len(xs) else
                'No owner walk pixels in this core. Keep painted mountain, maple/pine/cherry scenery and bones if present.'),
            completeSilhouetteAuditVerified=False))
    write_json(OUT/'objects-inventory.json',dict(zone=2,skin='asia',scope=CHUNKS,
        coordinates='All RectPx1x use global [x0,y0,x1,y1] master pixels, exclusive end',
        terrain=dict(dir='img/map-zone2/v2/',repairs=False,source='src/zone-skin.js'),
        evidence=['src/town-owner-walkmask-asia.js','src/town-layout.js','src/town-asia-trees.js','walkmask-review.jpg'],
        method='Decode owner RLE 480x320 and resize nearest to4915x3277. Compare floor to original painted scenery, distinguish runtime decorations.',
        runtimeTrees=runtime_trees,
        runtimeOtherProps=dict(source='src/town-layout.js TOWN_PROP_SITES retained by ASIA_PROPS',
            maximumFootWorldY=2250,maximumFootMapY=2250*3277/2560,
            contextStartsMapY=3008,rootIntersectionsInRun=0,
            note='Runtime sprites are independent of baked-image removal. No sprite or collider is edited.'),
        objects=records,requestedRemovalIds=[],
        liquidCloudPolicy='Keep painted static base and original shape, including mist at r4-c2 left context.',
        limitations=['Owner mask is navigation data, not a semantic segmentation of every leaf.',
            'No obstruction was identified on the only walk floor (r4-c3 stair); no removal generation requested. Final silhouette review remains with Claude.']))
    paths = [ROOT/f'img/map-zone2/v2/r{r}-c{c}.webp' for r in (3,4) for c in range(1,6)]
    paths += [ROOT/p for p in ['src/zone-skin.js','src/town-layout.js','src/town-asia-trees.js','src/town-owner-walkmask-asia.js']]
    write_json(OUT/'source-provenance.json',dict(masterSize=[4915,3277],
        terrainRepairs=False,contextPxPerSide=64,files={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths},
        reusedFrom='/Users/agapae/agapae-work/.codex-worktrees/20261113T050923Z-2099857a',
        reusedNativeFiles=['r4-c2/q11-native.webp','r4-c2/q12-native.webp','r4-c3/q11-native.webp'],
        prototypeGit=['bc9dc4dd:docs/art-reviews/2026-11-05-z1-v5-plaza-detail/scripts/assemble.py',
            '0c544a3f:docs/art-reviews/2026-11-05-z1-v5-hd-full/scripts/assemble.py']))
    print(json.dumps([dict(chunk=r['chunk'],ownerWalkPixels=r['ownerWalkPixels'],removalIds=r['removalIds']) for r in records]))
