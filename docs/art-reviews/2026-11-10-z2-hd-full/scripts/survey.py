"""Record this run's source-ground survey. Coordinates are master1x LTRB.
No source edits. Survey boxes locate objects, not exact removal masks.
"""
import json,re,hashlib
from PIL import Image
import numpy as np
from prepare import OUT,ROOT,write_json

def main():
    plan=json.loads((OUT/'crop-plan.json').read_text());objects=[]
    # Gold rails obstruct the painted deck; removal expressly allowed by the brief.
    boxes={
      'r3-c3': [('bridge-west-rail',[2350,1984,2401,2526]),('bridge-east-rail',[2520,1984,2578,2526]),
                ('pier-west-rail',[2768,2108,2831,2315]),('pier-east-rail',[2921,2106,2980,2315]),
                ('south-stair-west-rail',[2392,2920,2452,3136]),('south-stair-east-rail',[2548,2920,2608,3136])],
      'r3-c4': [('west-stair-west-rail',[3059,2070,3116,2203]),('west-stair-east-rail',[3185,2040,3238,2189]),
                ('upper-east-bridge-rails',[3955,1984,4160,2102])],
      'r3-c5': [('upper-west-partial-bridge-rails',[4096,1984,4335,2138])],
    }
    runs=json.loads(re.search(r'TOWN_OWNER_WALK_RUNS=(\[.*?\]);',(ROOT/'src/town-owner-walkmask-asia.js').read_text()).group(1))
    flat=np.zeros(480*320,np.uint8);i=0
    for n,length in enumerate(runs):flat[i:i+length]=n%2;i+=length
    assert i==flat.size
    mask=np.array(Image.fromarray(flat.reshape(320,480)).resize((4915,3277),Image.Resampling.NEAREST))
    for chunk,rows in boxes.items():
        for label,rect in rows:
            x0,y0,x1,y1=rect
            objects.append(dict(id=f'{chunk}-{label}',chunk=chunk,kind='baked-gold-rail-or-post',rectPx1x=rect,
                action='remove-baked',ownerWalkMaskFraction=float(mask[y0:y1,x0:x1].mean()),
                note='Remove gold vertical object only, keep deck, treads, support blocks, river/bank silhouette. Box includes context outside chunk.'))
    trees=json.loads(re.search(r'ASIA_TREE_POINTS = (\[.*\]);',(ROOT/'src/town-asia-trees.js').read_text(),re.S).group(1))
    for n,p in enumerate(trees):
        x,y=p['x']*4915,p['y']*3277
        for chunk,spec in plan.items():
            x0,y0,x1,y1=spec['chunkRectPx1x']
            if x0<=x<x1 and y0<=y<y1:
                objects.append(dict(id=f'asia-tree-{n}',chunk=chunk,kind='runtime-tree',footMasterPx1x=[x,y],
                    action='separate-runtime-sprite',on_walk=p['on_walk'],note='Source runtime prop is not proof of a baked object. Do not erase inaccessible forest.'))
    for chunk in plan:
        objects.append(dict(id=f'{chunk}-inaccessible-environment',chunk=chunk,kind='forest-rocks-bones-liquid-mist',
            action='keep-baked',note='Source and owner walkmask inspected: off-route forest, bones, river/foam and fog remain painted base. Keep existing open-floor outline.'))
    objects.append(dict(id='r3-c3-gold-floor-inlay',chunk='r3-c3',kind='floor-pattern',action='keep-baked',note='Gold circular inlay is part of plaza, not railing.'))
    write_json(OUT/'objects-inventory.json',dict(zone='asia',scope=list(plan),coordinateFormat='master1x [left,top,right,bottom]',
        evidence=['src/zone-skin.js','src/town-layout.js','src/town-asia-trees.js','src/town-owner-walkmask-asia.js','*/inputs/walkmask-overlay.jpg'],
        rules=dict(liquidsAndClouds='keep original extent',unreachableForest='keep-baked',stairsAndBridgeDecks='keep-baked',rails='remove vertical gold objects; preserve floors'),
        limitation='Visual survey, not semantic segmentation. Removal outcome is recorded separately after assembly.',objects=objects))
    prior='/Users/agapae/agapae-work/.codex-worktrees/20261113T050903Z-19483646/docs/art-reviews/2026-11-10-z2-hd-full'
    copied={str(p.relative_to(OUT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in OUT.glob('*/q*-native.webp') if p.name in ['q11-native.webp','q12-native.webp'] and p.parent.name=='r3-c3'}
    write_json(OUT/'continuation.json',dict(copiedFrom=prior,copiedNativeSha256=copied,newGenerationIndices=list(range(2,14)),
        inheritedGenerationCount=2,plannedNewGenerationCount=12,totalDistinctGenerationCount=14,
        sourceHashMismatches=[f for f,v in json.loads((OUT/'source-hashes.json').read_text()).items() if hashlib.sha256((ROOT/f).read_bytes()).hexdigest()!=v],
        approvedReference=dict(requestedPathsAbsent=True,readFromGit='bc9dc4dd:docs/art-reviews/2026-11-05-z1-v5-plaza-detail/scripts/assemble.py'),
        activeTerrain='img/map-zone2/v2/',repairs=False))

if __name__=='__main__':main()
