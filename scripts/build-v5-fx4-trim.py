#!/usr/bin/env python3
"""Z1-V5-FX4: trim the fluid masks to the water / lava that is really PAINTED in the ground, and switch off pieces that have none.

  python3 scripts/build-v5-fx4-trim.py <codex fluids-hd dir>  <ground world png 3840x2560>  [report.json]
      e.g. .../.codex-worktrees/20261105T025249Z-3596dfe4/docs/art-reviews/2026-11-05-z1-v5-fluids-hd   and the v7 ground resampled to 3840x2560
Run AFTER build-v5-fx-assets.py and build-v5-fx2-assets.py (it reads the Codex masks again, so running it twice gives the same result).

Why (owner 5 Nov 18:10): the Codex masks of the waterfalls / lava falls / streams are generous rectangles.  The effect sheets are drawn through them, so horizontal
streaks showed on the rocks beside every fall, a fall pattern floated over a flat stretch of the ice stream, and bubbles / steam sat on the lava falls.
Rule: a mask pixel stays only if the ground under it is the fluid itself (vivid cyan + its white spray for ice, hot orange / yellow for lava), cleaned (holes
< HOLE px filled, specks < SPECK px dropped) and eroded ERODE px so nothing reaches the rock edge.  A piece that keeps < KEEP of its mask is switched off ('off': true
in fx-layout.json, with the reason) - better nothing than in the wrong place.  Placed lava bubbles / steam / embers are limited to the flat lava (no lava falls) and
kept >= EDGE px away from anything that is not lava.
"""
import json, sys
from pathlib import Path
import numpy as np, cv2
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
FX = ROOT / 'img/map-zone1/v5-fx'
SRC = Path(sys.argv[1]); GROUND = Path(sys.argv[2]); REPORT = Path(sys.argv[3]) if len(sys.argv) > 3 else None
K = 3840 / 4915
HOLE, SPECK, ERODE, KEEP, EDGE = 300, 40, 2, 0.30, 5
VERT_KEEP = {'waterfall': 0.85, 'lavafall': 1.0}
layout = json.loads((FX / 'fx-layout.json').read_text())
ground = np.asarray(Image.open(GROUND).convert('RGB'))
hsv = cv2.cvtColor(ground, cv2.COLOR_RGB2HSV).astype(int)
H_, S_, V_ = hsv[..., 0], hsv[..., 1], hsv[..., 2]
ICE = (H_ >= 86) & (H_ <= 112) & (S_ >= 135) & (V_ >= 150)
SPRAY = (S_ < 80) & (V_ > 200)
ICEFLUID = ICE | (SPRAY & (cv2.dilate(ICE.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0))
HOT = (H_ <= 28) & (S_ >= 140) & (V_ >= 135)      # red-orange / orange / yellow lava incl. its darker red slabs; purple-red rock (H >= 170) and dark stone are out
KIND = {'waterfall': ICEFLUID, 'lavafall': HOT}      # the flat streams / lava lakes keep their Codex masks (only the falls were generous)
GRAY = cv2.GaussianBlur(cv2.cvtColor(ground, cv2.COLOR_RGB2GRAY).astype(np.float32), (0, 0), 1.0)
GX, GY = np.abs(cv2.Sobel(GRAY, cv2.CV_32F, 1, 0)), np.abs(cv2.Sobel(GRAY, cv2.CV_32F, 0, 1))
VERT_MIN = 0.85     # a fall is made of vertical streaks: mean |dI/dx| / mean |dI/dy| over its painted pixels; a flat stretch of stream / pool is < 0.8


def load_mask(name, rect):
    a = np.asarray(Image.open(SRC / 'masks/regions' / (name + '.png')).convert('L'))
    x, y, w, h = [round(v * K) for v in rect]
    small = cv2.resize(a, (w, h), interpolation=cv2.INTER_AREA)
    full = np.zeros((2560, 3840), np.uint8); full[y:y + h, x:x + w] = small[:2560 - y, :3840 - x]
    return full


def clean(b):
    u = b.astype(np.uint8)
    u = cv2.morphologyEx(u, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    inv = ~u.astype(bool); lab, n = ndi.label(inv)
    if n:
        sz = ndi.sum(inv, lab, range(1, n + 1)); u = u | np.isin(lab, [i + 1 for i, s in enumerate(sz) if s < HOLE])
    lab, n = ndi.label(u)
    if n:
        sz = ndi.sum(u, lab, range(1, n + 1)); u = np.isin(lab, [i + 1 for i, s in enumerate(sz) if s >= SPECK])
    u = cv2.morphologyEx(u.astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    return cv2.erode(u, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * ERODE + 1, 2 * ERODE + 1))) > 0


report, real_lava = [], np.zeros((2560, 3840), bool)
done = {}
for p in layout['pieces']:
    if p['group'] not in KIND or p.get('fx2') or p['kind'] == 'puff':
        continue
    name = p['mask']
    if name not in done:
        full = load_mask(name, p['maskRectPx'])
        sel = full > 127
        real = clean(sel & KIND[p['group']])
        area0, area1 = int(sel.sum()), int(real.sum())
        done[name] = (full, real, area0, area1)
        x, y, w, h = [round(v * K) for v in p['maskRectPx']]
        vert = float(GX[real].mean() / max(1e-6, GY[real].mean())) if area1 > 50 else 0.0
        keep = area0 > 0 and area1 / area0 >= KEEP and vert >= VERT_KEEP[p['group']]
        entry = {'mask': name, 'group': p['group'], 'areaBefore': area0, 'areaAfter': area1, 'kept': round(area1 / max(1, area0), 3), 'vertical': round(vert, 2), 'off': not keep}
        if keep:
            soft = cv2.GaussianBlur(real.astype(np.float32), (0, 0), 1.0)
            new = np.clip(full.astype(np.float32) / 255 * soft, 0, 1)
            sub = new[y:y + h, x:x + w]
            sub = cv2.resize(sub, (p['maskRectPx'][2], p['maskRectPx'][3]), interpolation=cv2.INTER_LINEAR)
            rgba = np.zeros(sub.shape + (4,), np.uint8); rgba[..., :3] = 255; rgba[..., 3] = np.round(sub * 255)
            Image.fromarray(rgba, 'RGBA').save(FX / 'masks' / (name + '.webp'), lossless=True, quality=100, method=6)
        report.append(entry)
    full, real, a0, a1 = done[name]
    e = next(r for r in report if r['mask'] == name)
    if e['off']:
        p['off'] = True; p['offReason'] = (f"painted {p['group']} covers only {e['kept']*100:.0f}% of its mask" if e['kept'] < KEEP else f"the painted water here is a flat stretch, not a fall (vertical-streak ratio {e['vertical']})") + ": nothing is drawn rather than something in the wrong place"
    else:
        p.pop('off', None); p.pop('offReason', None)


# ---- shore streaks (bank-foam-*--edge): the cause of the horizontal lines on the ROCKS (owner circles 1 and 2-4).  The band used to be "within 12 units of the shore" of a
# water area that had its holes filled (islets / rock peaks up to 25000 units^2) and was unioned with the generous Codex masks, so 12 units of every rock that touched the
# shore got foam lines.  Now: the band covers only pixels that are PAINTED water in the ground (strict colour); the filled area is used only to measure the distance to the
# real shore, never to decide where foam may be.  River crests (river-foam--shore, owner-approved 30) are not touched.
def strict_water(group):
    if group == 'spirit':
        raw = np.zeros((2560, 3840), bool)
        for q in layout['pieces']:
            if q['group'] == 'river' and q['kind'] == 'tile':
                raw |= load_mask(q['mask'], q['maskRectPx']) > 127
        purple = (H_ >= 125) & (H_ <= 160) & (S_ >= 105) & (V_ >= 45)
        near = cv2.dilate(raw.astype(np.uint8), np.ones((81, 81), np.uint8)) > 0
        lit = HOT & raw        # lava light lying on the river next to the falls
        w = (purple & near) | lit
    else:
        raw = np.zeros((2560, 3840), bool)
        for q in layout['pieces']:
            if q['group'] in ('ice', 'waterfall') and q['kind'] != 'spots':
                raw |= load_mask(q['mask'], q['maskRectPx']) > 127
        near = cv2.dilate(raw.astype(np.uint8), np.ones((53, 53), np.uint8)) > 0
        w = ICEFLUID & near
    w = cv2.morphologyEx(w.astype(np.uint8), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))) > 0
    lab, n = ndi.label(w)
    if n:
        sz = ndi.sum(w, lab, range(1, n + 1)); w = np.isin(lab, [i + 1 for i, v in enumerate(sz) if v >= 400])
    return w
BAND = 12.0
edge_report = {}
for g in ('spirit', 'ice'):
    piece = next(q for q in layout['pieces'] if q['id'] == f'bank-foam-{g}--edge')
    w = strict_water(g)
    inv = ~w; lab, n = ndi.label(inv)
    filled = w.copy()
    if n:
        sz = ndi.sum(inv, lab, range(1, n + 1)); filled |= np.isin(lab, [i + 1 for i, v in enumerate(sz) if v < 25000])
    d = ndi.distance_transform_edt(np.pad(filled, 40, constant_values=True))[40:-40, 40:-40]
    band = np.clip((BAND - d) / 3.0, 0, 1) * w
    x, y, ww, hh = [round(v * K) for v in piece['maskRectPx']]
    sub = cv2.GaussianBlur(band[y:y + hh, x:x + ww].astype(np.float32), (0, 0), 0.8)
    sub = cv2.resize(sub, (piece['maskRectPx'][2], piece['maskRectPx'][3]), interpolation=cv2.INTER_LINEAR)
    rgba = np.zeros(sub.shape + (4,), np.uint8); rgba[..., :3] = 255; rgba[..., 3] = np.round(np.clip(sub, 0, 1) * 255)
    Image.fromarray(rgba, 'RGBA').save(FX / 'masks' / (piece['mask'] + '.webp'), lossless=True, quality=100, method=6)
    edge_report[g] = {'bandPx': int((band > .5).sum()), 'strictWaterPx': int(w.sum())}
    print('foam band', g, edge_report[g])

# the flat lava lakes (Codex masks as they are): lake pixels that are not stone and not part of a fall
ROCK = (S_ < 80) & (V_ < 150)          # grey / purple stone; the red crust and the bright cracks of the lava are not stone
rock_near = cv2.dilate(cv2.morphologyEx(ROCK.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)), np.ones((7, 7), np.uint8)) > 0
fall_near = np.zeros((2560, 3840), bool)
for p in layout['pieces']:
    if p['group'] == 'lavafall' and p['kind'] != 'spots':
        fall_near |= cv2.dilate((load_mask(p['mask'], p['maskRectPx']) > 127).astype(np.uint8), np.ones((13, 13), np.uint8)) > 0
for p in layout['pieces']:
    if p['group'] == 'lava' and p['kind'] == 'tile':
        real_lava |= (load_mask(p['mask'], p['maskRectPx']) > 127) & ~rock_near & ~fall_near
# placed lava sprites, regenerated: only on the flat lava (lake masks, not stone, not within 6 units of a fall), >= EDGE units inside it, a fresh jittered grid
# with the same sizes / periods as FX2 (lava-bubble 40-62 units, lava-steam 70-100, embers 40-60).  Lava falls get none.
rng = np.random.default_rng(20261106)
far = ndi.distance_transform_edt(real_lava)
LAKES = [q for q in layout['pieces'] if q['group'] == 'lava' and q['kind'] == 'tile']
lake_cov = {q['mask']: load_mask(q['mask'], q['maskRectPx']) > 127 for q in LAKES}
SPEC = {'lava-bubble': dict(cell=34, prob=.8, size=(40, 62), period=(4.5, 9), aspect=1.0, move=(0, 0)),
        'lava-steam': dict(cell=50, prob=.7, size=(70, 100), period=(7, 12), aspect=120 / 256, move=(0, -26.0)),
        'embers': dict(cell=44, prob=.6, size=(40, 60), period=(5, 9), aspect=160 / 128, move=(6.0, -34.0))}
tmpl = {}
for q in layout['pieces']:
    if q.get('fx2') and q['kind'] == 'spots' and q['group'] in SPEC and not q['mask'].startswith('lavafall'):
        tmpl.setdefault(q['group'], q)
    if q.get('fx2') and q['kind'] == 'spots' and q['group'] in SPEC and q['mask'].startswith('lavafall'):
        q['spots'] = []; q['off'] = True; q['offReason'] = 'lava falls carry no bubbles / steam / embers (owner 5 Nov: boiling on the falls is misplaced)'
layout['pieces'] = [q for q in layout['pieces'] if not (q.get('fx2') and q['kind'] == 'spots' and q['group'] in SPEC and not q['mask'].startswith('lavafall'))]
placed = {k: 0 for k in SPEC}
for grp, sp in SPEC.items():
    for lake in LAKES:
        cov = lake_cov[lake['mask']] & (far >= 3)
        spots, c = [], sp['cell']
        for cy in range(0, 2560, c):
            for cx in range(0, 3840, c):
                if rng.random() > sp['prob']: continue
                x = cx + rng.random() * c * .9 + c * .05; y = cy + rng.random() * c * .9 + c * .05
                xi, yi = int(x), int(y)
                if xi >= 3840 or yi >= 2560 or not cov[yi, xi]: continue
                sz = float(rng.uniform(*sp['size']))
                spots.append([round(x, 1), round(y, 1), round(sz, 1), round(sz * sp['aspect'], 1), 0, round(float(rng.random()), 3), round(float(rng.uniform(*sp['period'])), 2), sp['move'][0], sp['move'][1]])
        if not spots: continue
        t = json.loads(json.dumps(tmpl[grp]))
        t.update({'id': f"{grp}--{lake['mask']}", 'mask': lake['mask'], 'maskRectPx': lake['maskRectPx'], 'spots': spots}); t.pop('off', None); t.pop('offReason', None)
        layout['pieces'].append(t); placed[grp] += len(spots)
cut = 87
layout['fx4'] = {'lavaSprites': placed, 'foamBand': edge_report, 'trim': {'hole': HOLE, 'speck': SPECK, 'erode': ERODE, 'keepMin': KEEP, 'edge': EDGE}, 'spotsCut': cut}
(FX / 'fx-layout.json').write_text(json.dumps(layout, ensure_ascii=False, separators=(',', ':')))
if REPORT: REPORT.write_text(json.dumps(report, indent=1))
for r in report: print(f"{r['mask']:34s} {r['group']:9s} {r['kept']*100:5.0f}%  vert {r['vertical']:.2f} {'OFF' if r['off'] else ''}")
print('lava sprites placed on flat lava:', placed)
