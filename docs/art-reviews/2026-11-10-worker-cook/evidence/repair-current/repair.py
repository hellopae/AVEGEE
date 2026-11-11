"""Repair stationary neck seams using direction-matched original RGBA pixels.
Zero ImageGen. Read the latest inherited delivery, so reruns are idempotent.
Preserve all pixels outside explicit neck masks, including drawn arms and legs.
"""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import numpy as np
from PIL import Image, ImageDraw, ImageOps
from scipy import ndimage

EV = Path(__file__).resolve().parent
OUT = EV.parents[1]
REPO = OUT.parents[2]
INPUT = Path('/Users/agapae/agapae-work/.toby-worktrees/.codex-worktrees/20261111T121621Z-c330d056/docs/art-reviews/2026-11-10-worker-cook')
parser = argparse.ArgumentParser()
parser.add_argument('--apply', action='store_true')
args = parser.parse_args()
manifest = json.loads((OUT / 'worker-cook.json').read_text())
atlases = {}
operations = []
checks = []
polygons = {
    'cyberhell-cook': [(185,167),(174,171),(151,169),(138,166),(140,181),(151,181),(167,180),(177,179)],
    'th-carry-side': [(112,157),(142,156),(150,160),(170,163),(187,170),(211,175),(229,173),(237,182),(226,185),(213,180),(190,180),(173,173),(157,170),(140,166),(112,165)],
    'th-carry-down': [(92,153),(114,158),(145,158),(166,153),(165,172),(151,186),(134,191),(112,176),(94,165)],
    'th-carry-up': [(108,151),(140,159),(175,158),(210,150),(213,168),(181,174),(136,174),(108,165)],
}
for entry in manifest['animations']:
    name = entry['file']
    if name not in atlases:
        atlases[name] = Image.open(INPUT / name).convert('RGBA')
    atlas = atlases[name]
    key = f"{entry['zone']}-{entry['anim']}"
    if entry['anim'] == 'carry':
        key += '-' + ('side' if entry['dir'] == 'side-left' else entry['dir'])
    if key not in polygons:
        continue
    source_row, source_column = (0,1) if entry['anim'] == 'cook' else {
        'side': (1,2), 'side-left': (1,2), 'down': (4,0), 'up': (5,0)
    }[entry['dir']]
    source = Image.open(REPO / f"img/workers/worker-{entry['zone']}-sheet-v2.webp").convert('RGBA')
    source = source.crop((source_column*320,source_row*320,(source_column+1)*320,(source_row+1)*320))
    head_name = 'head-cyberhell-source.webp' if entry['anim']=='cook' else f"head-th-carry-{'side' if entry['dir']=='side-left' else entry['dir']}-source.webp"
    head = Image.open(OUT / 'evidence/repair-identity' / head_name).convert('RGBA')
    mask = Image.new('L',(320,320))
    ImageDraw.Draw(mask).polygon(polygons[key],fill=255)
    if entry['dir'] in ('down-left','side-left'):
        source, head, mask = [ImageOps.mirror(image) for image in (source,head,mask)]
    source_pixels = np.array(source)
    head_support = np.array(head)[:,:,3]>0
    base_mask = (np.array(mask)>0) & ~head_support
    for index in range(8):
        cell = (index*320,entry['row']*320,(index+1)*320,(entry['row']+1)*320)
        before = np.array(atlas.crop(cell))
        after = before.copy()
        # Preserve rice plus its ink border where the tray rises into the collar.
        food = (before[:,:,0]>170)&(before[:,:,1]>170)&(before[:,:,2]>150)&(before[:,:,3]>40)
        protected_food = ndimage.binary_dilation(food,iterations=3)
        selected = base_mask & ~protected_food
        after[selected] = source_pixels[selected]
        labels, count = ndimage.label(after[:,:,3]>40)
        sizes = np.bincount(labels.ravel()); sizes[0] = 0
        detached = (labels>0) & (labels!=sizes.argmax())
        cleanup = detached & ndimage.binary_dilation(base_mask,iterations=4) & ~head_support & ~protected_food
        after[cleanup] = 0
        touched_mask = selected | cleanup
        changed = np.any(before!=after,axis=2)
        row_name = f"{entry['zone']}-{entry['anim']}-{entry['dir']}"
        operations.append({'row':row_name,'frame':index+1,'pixels':int(changed.sum()),'removedDetachedNeckPixels':int(cleanup.sum()),'sourceRow':source_row,'sourceColumn':source_column,'polygonCanonical':polygons[key]})
        checks.append({'row':row_name,'frame':index+1,'headRGBAUnchanged':bool(np.array_equal(before[head_support],after[head_support])),
                       'outsideMaskUnchanged':bool(np.array_equal(before[~touched_mask],after[~touched_mask])),
                       'drawnHandsPropsAndLowerBodyY192OnwardUnchanged':bool(np.array_equal(before[192:],after[192:])),
                       'sourceRGBAExactInPatch':bool(np.array_equal(after[selected & ~cleanup],source_pixels[selected & ~cleanup])),
                       'foodAndInkUnchanged':bool(np.array_equal(before[protected_food],after[protected_food]))})
        atlas.paste(Image.fromarray(after),(cell[0],cell[1]))
for entry in manifest['animations']:
    atlas = atlases[entry['file']]
    plate = Image.new('RGB',(1280,688),(229,230,233))
    draw = ImageDraw.Draw(plate)
    for index in range(8):
        frame = atlas.crop((index*320,entry['row']*320,(index+1)*320,(entry['row']+1)*320))
        bg = Image.new('RGBA',(320,320),(229,230,233,255)); bg.alpha_composite(frame)
        x,y = index%4*320,index//4*344
        plate.paste(bg.convert('RGB'),(x,y+24))
        draw.text((x+4,y+4),f"{entry['zone']}-{entry['anim']}-{entry['dir']} f{index+1}",fill='black')
    plate.save(EV/f"current-{entry['zone']}-{entry['anim']}-{entry['dir']}.jpg",quality=87)
failures = [check for check in checks if not all(value for key,value in check.items() if key not in ('row','frame'))]
report = {'input':str(INPUT),'newImageGenCalls':0,'applied':args.apply,'operations':operations,'checks':checks,'failures':failures}
if args.apply and not failures:
    for name,atlas in atlases.items():
        if name in ('worker-cyberhell-cook-v1.webp','worker-th-carry-v1.webp'):
            atlas.save(OUT/name,lossless=True,method=6,exact=True)
        else:
            shutil.copyfile(INPUT/name,OUT/name)
    report['outputHashes']={name:hashlib.sha256((OUT/name).read_bytes()).hexdigest() for name in atlases}
    for entry in manifest['animations']:
        atlas = atlases[entry['file']];frames=[]
        for index in range(8):
            frame=atlas.crop((index*320,entry['row']*320,(index+1)*320,(entry['row']+1)*320))
            bg=Image.new('RGBA',(320,320),(229,230,233,255));bg.alpha_composite(frame);frames.append(bg.convert('RGB'))
        frames[0].save(OUT/'preview'/f"worker-{entry['zone']}-{entry['anim']}-{entry['dir']}.gif",save_all=True,append_images=frames[1:],duration=[120,130]*4,loop=0,disposal=2,optimize=False)
(EV/'repair-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'applied':args.apply,'operations':len(operations),'checks':len(checks)*5,'failures':len(failures)}))
raise SystemExit(bool(failures))
