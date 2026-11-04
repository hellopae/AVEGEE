"""Z1-LAYOUT-A step 4-5: copy the terrain files that are used, render proof-composite.jpg / proof-diff.jpg,
write object-check.json and gap candidates (gap-candidates.json).  Run after extract + register."""
import json, shutil, sys
from pathlib import Path
import numpy as np, cv2
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parent))
from z1_layout_common import warp_sprite, composite_over, OKW, OKH
import importlib.util
spec = importlib.util.spec_from_file_location('chk', Path(__file__).resolve().parent / 'check-zone1-objects.py'); chk = importlib.util.module_from_spec(spec); spec.loader.exec_module(chk)
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/art-reviews/2026-11-05-zone1-layout'
T = Path('/Users/agapae/Documents/Work PAE/Claude/AVEGEE/layered-map-work/docs/art-reviews/2026-11-04-terrain-seamless')
OK = chk.OK
DIFF_OBJ_FLAG = 30.0     # mean abs RGB diff in the owned pixels above this -> flag for eyes
SHIFT_FLAG = 3.0
GAP_T = 24.0


def copy_terrain():
    d = OUT / 'terrain'; (d / 'terrain-webp').mkdir(parents=True, exist_ok=True)
    man = json.loads((T / 'manifest.json').read_text())
    for t in man['tiles']: shutil.copy2(T / t['src'], d / t['src'])
    for f in ('sky.png', 'mountains.png', 'river.png', 'lava.png', 'waterfall.png'): shutil.copy2(T / 'layers' / f, d / f)
    slim = dict(world=man['world'], tileSize=man['tileSize'], gutter=man['gutter'],
                tiles=[{k: t[k] for k in ('id', 'src', 'rect', 'crop', 'size')} for t in man['tiles']],
                layers=dict(sky=dict(src='sky.png', rect=man['sky']['rect']), mountains=dict(src='mountains.png', rect=man['mountains']['rect']),
                            **{l['id']: dict(src=f"{l['id']}.png", rect=l['rect']) for l in man['liquids']}),
                layerOrder=man['layerOrder'], source='layered-map-work/docs/art-reviews/2026-11-04-terrain-seamless (Codex, read-only copy of used files)')
    (d / 'terrain-manifest.json').write_text(json.dumps(slim, indent=1)); return slim


def world_layer(img, rect, M):
    """premultiplied warp of an image that sits at rect=[x,y,w,h] in 2300x1618 world"""
    h, w = img.shape[:2]; x, y, rw, rh = rect
    L = np.array([[rw / w, 0, x], [0, rh / h, y], [0, 0, 1.]]); full = (np.vstack([M, [0, 0, 1.]]) @ L)[:2]
    return warp_sprite(img, full)


def main():
    man = copy_terrain(); reg = json.loads((OUT / 'terrain-registration.json').read_text()); M = np.array(reg['matrix']).reshape(2, 3)
    ok = np.array(Image.open(OK).convert('RGB')).astype(np.float32)
    canvas = np.zeros((OKH, OKW, 3), np.float32)
    def put(path, rect, force_opaque=False):
        im = Image.open(OUT / 'terrain' / path).convert('RGBA'); a = np.array(im)
        if force_opaque: a[..., 3] = 255
        lay, bb = world_layer(a, rect, M)
        if lay is not None: composite_over(canvas, lay, bb)
    L = man['layers']
    put('sky.png', L['sky']['rect'], True); put('mountains.png', L['mountains']['rect'])
    doc0 = json.loads((OUT / 'layout.json').read_text())
    for e in doc0.get('baseLayerExtras', []):   # owner's clouds (not part of Codex's terrain pack)
        spr = np.array(Image.open(OUT / doc0['sprites'][e['sprite']]['file']).convert('RGBA'))
        lay, bb = warp_sprite(spr, np.array(e['matrix']).reshape(2, 3)); composite_over(canvas, lay, bb)
    for k in ('river', 'lava', 'waterfall'): put(L[k]['src'], L[k]['rect'])
    atlas = np.zeros((man['world'][1], man['world'][0], 4), np.uint8)
    for t in man['tiles']:
        im = np.array(Image.open(OUT / 'terrain' / t['src']).convert('RGBA')); cx, cy, cw, ch = t['crop']; rx, ry, rw, rh = t['rect']
        atlas[ry:ry + rh, rx:rx + rw] = im[cy:cy + ch, cx:cx + cw]
    lay, bb = warp_sprite(atlas, M)
    composite_over(canvas, lay, bb)
    terrain_only = canvas.copy()
    doc, objs = chk.load_objects(); cache = {}
    for o in objs:
        spr = cache.get(o['sprite'])
        if spr is None: spr = cache[o['sprite']] = np.array(Image.open(OUT / doc['sprites'][o['sprite']]['file']).convert('RGBA'))
        lay, bb = warp_sprite(spr, np.array(o['matrix']).reshape(2, 3))
        if lay is not None: composite_over(canvas, lay, bb)
    comp = canvas.clip(0, 255).astype(np.uint8)
    W = 1250; H = round(OKH * W / OKW)
    Image.fromarray(comp).resize((W, H), Image.LANCZOS).save(OUT / 'proof-composite.jpg', quality=88)
    Image.fromarray(terrain_only.clip(0, 255).astype(np.uint8)).resize((W, H), Image.LANCZOS).save(OUT / 'proof-terrain-only.jpg', quality=85)
    diff = np.abs(comp.astype(np.float32) - ok).mean(axis=2)
    sm = cv2.GaussianBlur(diff, (0, 0), 6)
    heat = cv2.applyColorMap(np.clip(sm * 255 / 80, 0, 255).astype(np.uint8), cv2.COLORMAP_INFERNO)[..., ::-1]
    base = (ok * 0.45 + heat * 0.55).clip(0, 255).astype(np.uint8)
    Image.fromarray(base).resize((W, H), Image.LANCZOS).save(OUT / 'proof-diff.jpg', quality=85)
    # object-check.json
    _, objs2, results = chk.main()
    for r in results:
        r['flag'] = []
        if r.get('shiftPx') is not None and r['shiftPx'] > SHIFT_FLAG: r['flag'].append(f"shift>{SHIFT_FLAG}px")
        if r.get('meanAbsDiff') is not None and r['meanAbsDiff'] > DIFF_OBJ_FLAG: r['flag'].append(f"colour diff>{DIFF_OBJ_FLAG}")
    sh = [r['shiftPx'] for r in results if r.get('shiftPx') is not None]
    summary = dict(objects=len(results), shiftPx=dict(median=round(float(np.median(sh)), 2), p90=round(float(np.percentile(sh, 90)), 2), max=round(float(max(sh)), 2)),
                   within3px=int(sum(1 for s in sh if s <= 3)), within1px=int(sum(1 for s in sh if s <= 1)),
                   meanAbsDiff=dict(median=round(float(np.median([r['meanAbsDiff'] for r in results if r.get('meanAbsDiff') is not None])), 2)),
                   flagged=[r['id'] for r in results if r['flag']],
                   method='per object: render alone, masked SQDIFF template match against ok.jpg within +-14 px, sub-pixel parabola; shift = remaining offset (px). meanAbsDiff = mean |RGB diff| (0-255) over the pixels this object owns (not covered by later objects).')
    (OUT / 'object-check.json').write_text(json.dumps(dict(summary=summary, objects=results), indent=1))
    print(json.dumps(summary, indent=1))
    # --- gap candidates: regions where the proof is still far from ok.jpg (smoothed diff > GAP_T), with side-by-side crops
    m = (sm > GAP_T).astype(np.uint8); m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((21, 21), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    gd = OUT / 'gap-crops'; gd.mkdir(exist_ok=True)
    for f in gd.glob('gap-*.jpg'): f.unlink()
    comps = []
    for i in sorted(range(1, n), key=lambda i: -st[i, 4]):
        x, y, w, h, a = [int(v) for v in st[i]]
        if a < 2500: continue
        k = len(comps) + 1; pad = 24; x0, y0, x1, y1 = max(0, x - pad), max(0, y - pad), min(OKW, x + w + pad), min(OKH, y + h + pad)
        pair = np.concatenate([ok[y0:y1, x0:x1].astype(np.uint8), np.full((y1 - y0, 8, 3), 255, np.uint8), comp[y0:y1, x0:x1]], axis=1)
        sc = min(1.0, 1400 / pair.shape[1]); im = Image.fromarray(pair)
        if sc < 1: im = im.resize((int(pair.shape[1] * sc), int(pair.shape[0] * sc)), Image.LANCZOS)
        im.save(gd / f'gap-{k:02d}-ok-left-proof-right.jpg', quality=85)
        comps.append(dict(n=k, bbox=[x, y, w, h], areaPx=a, meanSmoothedDiff=round(float(sm[lab == i].mean()), 1), crop=f'gap-crops/gap-{k:02d}-ok-left-proof-right.jpg'))
    (OUT / 'gap-candidates.json').write_text(json.dumps(dict(threshold=GAP_T, note='smoothed (sigma 6) mean |RGB| diff vs ok.jpg above threshold, closed 21px, area>=2500. Colour-grade noise on objects is ~9-13.', regions=comps), indent=1))
    print('gap regions', len(comps))
    return comp, ok, sm


if __name__ == '__main__':
    main()
