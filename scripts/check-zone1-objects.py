"""Z1-LAYOUT-A step 4: measure each object against ok.jpg.
For every object: render alone, find the integer+sub-pixel translation (search +-SEARCH px) that best matches
ok.jpg inside its own opaque pixels (masked SQDIFF), and report residual colour diff in the pixels it owns."""
import json, sys
from pathlib import Path
import numpy as np, cv2
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parent))
from z1_layout_common import warp_sprite, OKW, OKH
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/art-reviews/2026-11-05-zone1-layout'
OK = Path('/Users/agapae/Documents/Work PAE/Claude/AVEGEE-reference/files/UI New map/New-Map-Zone1-ok.jpg')
SEARCH = 14


def load_objects():
    doc = json.loads((OUT / 'layout.json').read_text())
    return doc, sorted(doc['objects'], key=lambda o: o['authorOrder'])


def main(write=True):
    doc, objs = load_objects()
    ok = np.array(Image.open(OK).convert('RGB')); okg = cv2.cvtColor(ok, cv2.COLOR_RGB2GRAY).astype(np.float32)
    cache = {}
    renders = []
    owner = np.full((OKH, OKW), -1, np.int32)
    for i, o in enumerate(objs):
        spr = cache.get(o['sprite'])
        if spr is None: spr = cache[o['sprite']] = np.array(Image.open(OUT / doc['sprites'][o['sprite']]['file']).convert('RGBA'))
        lay, bb = warp_sprite(spr, np.array(o['matrix']).reshape(2, 3))
        renders.append((lay, bb))
        if lay is not None:
            x0, y0, x1, y1 = bb; solid = lay[..., 3] >= 128
            sub = owner[y0:y1, x0:x1]; sub[solid] = i
    results = []
    for i, o in enumerate(objs):
        lay, bb = renders[i]
        if lay is None: results.append(dict(id=o['id'], error='outside frame')); continue
        x0, y0, x1, y1 = bb; own = (owner[y0:y1, x0:x1] == i)
        solid = lay[..., 3] >= 128
        rgb = np.where(lay[..., 3:4] > 0, lay[..., :3] / np.maximum(lay[..., 3:4], 1) * 255.0, 0).astype(np.float32)
        d0 = np.abs(rgb - ok[y0:y1, x0:x1]).mean(axis=2)
        meanDiff = float(d0[own].mean()) if own.sum() else None
        # translation search with mask = own pixels (eroded 2px so soft edges do not matter)
        mask = cv2.erode(own.astype(np.uint8), np.ones((5, 5), np.uint8))
        shift = None
        if mask.sum() > 400:
            g = cv2.cvtColor(np.clip(rgb, 0, 255).astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32)
            sx0, sy0 = max(0, x0 - SEARCH), max(0, y0 - SEARCH); sx1, sy1 = min(OKW, x1 + SEARCH), min(OKH, y1 + SEARCH)
            hay = okg[sy0:sy1, sx0:sx1]
            # crop the template to the mask bbox to keep it cheap
            ys, xs = np.where(mask > 0); ty0, ty1, tx0, tx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            t = g[ty0:ty1, tx0:tx1]; m = mask[ty0:ty1, tx0:tx1].astype(np.float32)
            if hay.shape[0] >= t.shape[0] and hay.shape[1] >= t.shape[1]:
                res = cv2.matchTemplate(hay, t, cv2.TM_SQDIFF, mask=m)
                res = np.nan_to_num(res, nan=1e30, posinf=1e30)
                my, mx = np.unravel_index(np.argmin(res), res.shape)
                # sub-pixel parabola
                def sub(v, c, n): return 0.0 if c <= 0 or c >= n - 1 else 0.5 * (v[c - 1] - v[c + 1]) / (v[c - 1] - 2 * v[c] + v[c + 1] + 1e-9)
                fx = sub(res[my], mx, res.shape[1]); fy = sub(res[:, mx], my, res.shape[0])
                best_x = sx0 + mx + fx; best_y = sy0 + my + fy
                shift = (float(best_x - (x0 + tx0)), float(best_y - (y0 + ty0)))
        results.append(dict(id=o['id'], sprite=o['sprite'], source=o['source'], ownedPx=int(own.sum()), solidPx=int(solid.sum()),
                            meanAbsDiff=None if meanDiff is None else round(meanDiff, 2),
                            shiftX=None if shift is None else round(shift[0], 2), shiftY=None if shift is None else round(shift[1], 2),
                            shiftPx=None if shift is None else round(float(np.hypot(*shift)), 2)))
    return doc, objs, results


def fit_correction(objs, results):
    """per-AI-file residual (translation + axis scale) from objects with enough owned pixels; robust to outliers"""
    out = {}
    for fn in sorted({o['source']['file'] for o in objs if o['source']['file'].endswith('.ai')}):
        rows = []
        for o, r in zip(objs, results):
            if o['source']['file'] == fn and r.get('shiftX') is not None and abs(r['shiftX']) < 8 and abs(r['shiftY']) < 8 and r['ownedPx'] > 3000 and not o.get('dedupedFrom') and not o.get('conflictResolved'):
                rows.append((o['x'] + o['w'] / 2, o['y'] + o['h'] / 2, r['shiftX'], r['shiftY']))
        a = np.array(rows); keep = np.ones(len(a), bool); co = {}
        for _ in range(3):
            for k, nm, col in ((2, 'x', 0), (3, 'y', 1)):
                A = np.c_[np.ones(keep.sum()), a[keep, col]]; c = np.linalg.lstsq(A, a[keep, k], rcond=None)[0]; co[nm] = c
            rx = a[:, 2] - (co['x'][0] + co['x'][1] * a[:, 0]); ry = a[:, 3] - (co['y'][0] + co['y'][1] * a[:, 1])
            keep = np.hypot(rx, ry) < 1.5
        out[fn] = dict(dx=round(float(co['x'][0]), 3), xScale=round(float(co['x'][1]), 6), dy=round(float(co['y'][0]), 3), yScale=round(float(co['y'][1]), 6),
                       objectsUsed=int(keep.sum()), objectsCandidates=len(a))
    return out


if __name__ == '__main__':
    doc, objs, results = main()
    if '--fit' in sys.argv:
        fit = fit_correction(objs, results)
        (OUT / 'registration-correction.json').write_text(json.dumps(dict(
            note='Residual between the Im7-normalised AI placement and ok.jpg, measured by masked template matching (check-zone1-objects.py --fit). '
                 'Applied by extract-zone1-ok-layout.py as x\'=(1+xScale)*x+dx, y\'=(1+yScale)*y+dy per source file. ok.jpg is the source of truth '
                 '(it was flattened from a Photoshop file in which the owner pasted the AI exports; 5.ai was pasted 2497px wide).', files=fit), indent=1))
        print(json.dumps(fit, indent=1)); sys.exit(0)
    sh = [r['shiftPx'] for r in results if r.get('shiftPx') is not None]
    print('n', len(results), 'with shift', len(sh))
    for r in results:
        print(r['id'], r['source']['file'][-6:], r['source']['image'], 'own', r.get('ownedPx'), 'diff', r.get('meanAbsDiff'), 'shift', r.get('shiftX'), r.get('shiftY'))
    print('median shift', np.median(sh), 'p90', np.percentile(sh, 90), 'max', max(sh))
