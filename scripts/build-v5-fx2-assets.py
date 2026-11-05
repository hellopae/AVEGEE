#!/usr/bin/env python3
"""Z1-V5-FX2: place the already-drawn waves, glints and lava sprites (no new drawing).

Usage (run AFTER scripts/build-v5-fx-assets.py; idempotent):
  python3 scripts/build-v5-fx2-assets.py <fluids round-1 sheets dir> <codex-fx-art-z1 sheets dir>
      e.g. .../2026-11-05-z1-v5-fluids/sheets  .../AVEGEE-art-backup/2026-11-05-zone1-new-kit/codex-fx-art-z1/sheets

What it does (placement only, the drawn sheets are copied byte for byte):
  * foam: the water mask of every river / ice stream is cleaned (holes < HOLE_MIN world px^2 filled = ragged shore speckle / small rocks, water
    slivers < SLIVER_MIN dropped), its shore line is walked, and `river-foam` crests are put ON that line, turned along it, uneven spacing.
    The streak sheets (bank-foam-spirit / bank-foam-ice) are clipped to an `<region>-edge` mask = water within BAND world units of the shore.
    Nothing is placed further from the shore than BAND (tests/z1-v5-fx2.test.mjs checks every anchor against the mask).
  * glints (water-sparkle) on the purple river, bubbles (lava-bubble), steam (lava-steam) and embers (embers-ash) over lava and lava falls
    only, jittered grid with per-spot phase / period.
  * the old `-bank` clip masks (outline of every islet = foam in the middle of the river) are replaced by the `-edge` masks.
All coordinates are WORLD units (3840x2560 = 4915x3277 master * 0.7813).
"""
import json, math, random, shutil, sys
from pathlib import Path
import numpy as np
import cv2
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
FX = ROOT / 'img/map-zone1/v5-fx'
WORLD = (3840, 2560)
BAND = 12.0            # world units: nothing of the foam sits further from the shore than this
HOLE_MAX = 25000       # world px^2: an enclosed non-water patch smaller than this (rock, ragged mask, lava inflow) gets no foam ring
SLIVER_MIN = 900       # world px^2: smaller water specks are ignored
random.seed(20261105)
rng = np.random.default_rng(20261105)

if len(sys.argv) < 3:
    sys.exit(__doc__)
SRC_A, SRC_B = Path(sys.argv[1]), Path(sys.argv[2])
layout = json.loads((FX / 'fx-layout.json').read_text())
M2W = layout['worldSize'][0] / layout['masterSize'][0]
pieces = [p for p in layout['pieces'] if not p.get('fx2')]
byid = {p['id']: p for p in pieces}


def region_rect_world(p):
    x, y, w, h = p['maskRectPx']
    return [round(x * M2W), round(y * M2W), round(w * M2W), round(h * M2W)]


def load_region(name, rect_master):
    """Coverage (0..255) of a region mask resampled to world pixels, pasted on a world canvas."""
    a = np.asarray(Image.open(FX / 'masks' / (name + '.webp')).convert('RGBA'))[..., 3]
    x, y, w, h = rect_master
    wx0, wy0, wx1, wy1 = round(x * M2W), round(y * M2W), round((x + w) * M2W), round((y + h) * M2W)
    small = cv2.resize(a, (wx1 - wx0, wy1 - wy0), interpolation=cv2.INTER_AREA)
    cv = np.zeros((WORLD[1], WORLD[0]), np.uint8)
    cv[wy0:wy1, wx0:wx1] = small[:WORLD[1] - wy0, :WORLD[0] - wx0]
    return cv


def clean(water):
    """Fill small holes, drop small slivers, smooth the outline a little."""
    w = water.copy()
    inv = ~w
    lab, n = ndi.label(inv)
    if n:
        sizes = ndi.sum(inv, lab, range(1, n + 1))
        w |= np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s < HOLE_MAX])
    lab, n = ndi.label(w)
    if n:
        sizes = ndi.sum(w, lab, range(1, n + 1))
        w &= np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= SLIVER_MIN])
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    u8 = w.astype(np.uint8) * 255
    u8 = cv2.morphologyEx(u8, cv2.MORPH_CLOSE, k)
    u8 = cv2.morphologyEx(u8, cv2.MORPH_OPEN, k)
    return u8 > 127


def shore_distance(water):
    """Distance (world units) of every water pixel to the nearest non-water pixel; the map border is NOT shore."""
    pad = np.pad(water, 40, constant_values=True)
    return ndi.distance_transform_edt(pad)[40:-40, 40:-40]


GROUPS = {
    'spirit': ['river-main', 'river-east'],
    'ice': ['ice-upper', 'ice-central', 'ice-lower', 'ice-mouth', 'ice-east'],
    'lava': ['lava-upper', 'lava-left', 'lava-middle', 'lava-lower', 'lava-left-bottom', 'lava-southwest'],
    'lavafall': sorted({p['mask'] for p in pieces if p['group'] == 'lavafall'}),
}
rect_of = {}
for p in pieces:
    if p['group'] in ('river', 'ice', 'lava', 'lavafall'):
        rect_of[p['mask']] = p['maskRectPx']
for names in GROUPS.values():
    for n in names:
        assert n in rect_of, n

# the drawn ground itself decides where the real shore is (the Codex masks are a little smaller / larger than the painted water in places)
GROUND = ROOT / 'img/map-zone1/v5'
def ground_world():
    m = Image.new('RGB', (4915, 3277))
    for r in range(1, 5):
        for c in range(1, 6):
            m.paste(Image.open(GROUND / f'r{r}-c{c}.webp').convert('RGB'), ((c - 1) * 1024, (r - 1) * 1024))
    return np.asarray(m.resize(WORLD, Image.LANCZOS))
HSV = cv2.cvtColor(ground_world(), cv2.COLOR_RGB2HSV).astype(int)
H_, S_, V_ = HSV[..., 0], HSV[..., 1], HSV[..., 2]
COLOR = {'spirit': (H_ >= 125) & (H_ <= 160) & (S_ >= 105) & (V_ >= 45),      # deep violet water
         'ice': (H_ >= 88) & (H_ <= 112) & (S_ >= 110) & (V_ >= 140)}         # bright cyan-blue stream
GROW = 240            # px of lava glow followed from the lava masks into the river
NEAR = {'spirit': 40, 'ice': 26}       # painted water further than this from the mask is not considered

water, raw, rawdist, rawnear, dist = {}, {}, {}, {}, {}
for g, names in GROUPS.items():
    cov = np.zeros((WORLD[1], WORLD[0]), np.uint8)
    for n in names:
        cov = np.maximum(cov, load_region(n, rect_of[n]))
    raw[g] = cov > 127
    rawdist[g] = ndi.distance_transform_edt(raw[g])
    rawnear[g] = ndi.distance_transform_edt(~raw[g])      # distance from the Codex mask
    if g in ('lava', 'lavafall'):
        water[g] = raw[g]
    else:
        extra = np.zeros_like(cov)           # lava / lava falls / ice falls running into the water are no bank
        if g == 'spirit':
            for n in GROUPS['lava'] + GROUPS['lavafall']:
                extra = np.maximum(extra, load_region(n, rect_of[n]))
        else:
            for p in pieces:
                if p['group'] == 'waterfall':
                    extra = np.maximum(extra, load_region(p['mask'], p['maskRectPx']))
        k = np.ones((2 * NEAR[g] + 1,) * 2, np.uint8)
        near = cv2.dilate((cov > 127).astype(np.uint8), k) > 0
        extra = extra * (near.astype(np.uint8))
        if g == 'spirit':     # lava glow painted INTO the river: hot-coloured pixels reachable from the lava masks within GROW steps
            hot = ((H_ <= 28) | (H_ >= 172)) & (S_ >= 110) & (V_ >= 140) & near
            reach = (cv2.dilate((extra > 127).astype(np.uint8), np.ones((9, 9), np.uint8)) > 0) & hot
            ys, xs = np.nonzero(near); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            r, hh = reach[y0:y1, x0:x1].astype(np.uint8), hot[y0:y1, x0:x1].astype(np.uint8)
            k3 = np.ones((3, 3), np.uint8)
            for _ in range(GROW):
                r = cv2.dilate(r, k3) & hh
            extra = extra.copy(); extra[y0:y1, x0:x1] = np.maximum(extra[y0:y1, x0:x1], r * 255)
        real = (COLOR[g] & near) | (cv2.dilate((extra > 127).astype(np.uint8), np.ones((15, 15), np.uint8)) > 0) | (raw[g] if g == 'ice' else False)
        water[g] = clean(real)
    dist[g] = shore_distance(water[g])
    print(g, 'mask px', int(raw[g].sum()), 'real water px', int(water[g].sum()))

# ------------------------------------------------------------------------------------------------ edge masks (streak clip) + foam pieces
for f in (FX / 'masks').glob('*-edge.webp'):
    f.unlink()
FOAM_RECT = {}
for g in ('spirit', 'ice'):
    ys, xs = np.nonzero(raw[g])
    x0, x1, y0, y1 = max(0, xs.min() - 70), min(WORLD[0], xs.max() + 70), max(0, ys.min() - 70), min(WORLD[1], ys.max() + 70)
    d = dist[g][y0:y1, x0:x1]
    band = np.clip((BAND - d) / 3.0, 0, 1) * water[g][y0:y1, x0:x1]
    band = cv2.GaussianBlur(band.astype(np.float32), (0, 0), 0.8)
    mw, mh = round((x1 - x0) / M2W), round((y1 - y0) / M2W)
    band = cv2.resize(band, (mw, mh), interpolation=cv2.INTER_LINEAR)
    rgba = np.zeros((mh, mw, 4), np.uint8); rgba[..., :3] = 255; rgba[..., 3] = np.round(np.clip(band, 0, 1) * 255)
    Image.fromarray(rgba, 'RGBA').save(FX / 'masks' / f'foam-{g}-edge.webp', lossless=True, quality=100, method=6)
    FOAM_RECT[g] = [round(x0 / M2W), round(y0 / M2W), mw, mh]
    rect_of[f'foam-{g}-edge'] = FOAM_RECT[g]
streak = []
for p in pieces:
    if p['group'] == 'foam':
        continue
    streak.append(p)
pieces = streak
for g, sheet in (('spirit', 'bank-foam-spirit.webp'), ('ice', 'bank-foam-ice.webp')):
    pieces.append({'id': f'bank-foam-{g}--edge', 'group': 'foam', 'sheet': sheet, 'frames': 8, 'fps': 8, 'blend': 'screen', 'opacity': 0.6,
                   'maskRectPx': FOAM_RECT[g], 'mask': f'foam-{g}-edge', 'frameW': 384, 'frameH': 96, 'kind': 'tile', 'tileWorld': [150, 37.5]})
for f in (FX / 'masks').glob('*-bank.webp'):
    f.unlink()


# ------------------------------------------------------------------------------------------------ shore walk -> river-foam crests
def smooth_closed(pts, k=9):
    n = len(pts)
    if n < 2 * k + 3:
        return pts
    pad = np.concatenate([pts[-k:], pts, pts[:k]])
    ker = np.ones(2 * k + 1) / (2 * k + 1)
    return np.stack([np.convolve(pad[:, 0], ker, 'same'), np.convolve(pad[:, 1], ker, 'same')], 1)[k:-k]


def crest_spots(g):
    w = water[g]
    cs, _ = cv2.findContours(w.astype(np.uint8), cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    out = []
    for c in cs:
        pts = c[:, 0, :].astype(np.float64)
        if len(pts) < 160:
            continue
        pts = smooth_closed(pts, 8)
        n = len(pts)
        i = int(rng.integers(0, 60))
        while i < n - 30:
            j = i
            p = pts[i]
            # tangent over +-14 px, turn over +-30 px (skip sharp corners)
            t = pts[(i + 14) % n] - pts[(i - 14) % n]
            t2 = pts[(i + 30) % n] - pts[(i - 30) % n]
            ang = abs(math.atan2(t[0] * t2[1] - t[1] * t2[0], t[0] * t2[0] + t[1] * t2[1]))
            L = math.hypot(*t)
            step = int(rng.integers(70, 160))
            if L > 1e-6 and ang < 0.9:
                tx, ty = t / L
                for s in (1, -1):                      # the normal that points into the water
                    nx, ny = -ty * s, tx * s
                    qx, qy = int(round(p[0] + nx * 7)), int(round(p[1] + ny * 7))
                    bx, by = int(round(p[0] - nx * 7)), int(round(p[1] - ny * 7))
                    if 0 <= qx < WORLD[0] and 0 <= qy < WORLD[1] and 0 <= bx < WORLD[0] and 0 <= by < WORLD[1] and w[qy, qx] and not w[by, bx]:
                        break
                else:
                    i += step
                    continue
                if rawnear[g][min(WORLD[1] - 1, int(p[1])), min(WORLD[0] - 1, int(p[0]))] > NEAR[g] + 10:
                    i += step
                    continue
                size = float(rng.uniform(56, 88))
                ax, ay = p[0] + nx * 3.0, p[1] + ny * 3.0       # anchor 3 units inside the water
                rot = math.atan2(nx, -ny)                        # sprite "up" -> into the water, sprite "down" sits on the shore
                period = float(rng.uniform(4.5, 8.0))
                out.append([round(ax, 1), round(ay, 1), round(size, 1), round(size * .4, 1), round(rot, 3), round(float(rng.random()), 3), round(period, 2),
                            round(-nx * 4.0, 2), round(-ny * 4.0, 2)])
            i += step
    return out


def scatter(g, cell, prob, dmin, size, aspect=1.0, jitter=.9, maxn=400, period=(2, 4)):
    w, d = raw[g], rawdist[g]          # glints / bubbles use the drawn coverage itself, not the shore-cleaned one
    out = []
    for cy in range(0, WORLD[1], cell):
        for cx in range(0, WORLD[0], cell):
            if rng.random() > prob:
                continue
            x = cx + rng.random() * cell * jitter + cell * (1 - jitter) / 2
            y = cy + rng.random() * cell * jitter + cell * (1 - jitter) / 2
            xi, yi = int(x), int(y)
            if xi >= WORLD[0] or yi >= WORLD[1] or not w[yi, xi] or d[yi, xi] < dmin:
                continue
            sz = float(rng.uniform(*size))
            out.append([round(x, 1), round(y, 1), round(sz, 1), round(sz * aspect, 1), 0, round(float(rng.random()), 3), round(float(rng.uniform(*period)), 2), 0, 0])
    rng.shuffle(out)
    return out[:maxn]


def assign(spots, regions, margin=0):
    """Split spots into the region masks that cover their anchor (checked on the group coverage of each region)."""
    res = {n: [] for n in regions}
    covs = {n: load_region(n, rect_of[n]) for n in regions}
    for s in spots:
        xi, yi = int(s[0]), int(s[1])
        for n in regions:
            if 0 <= xi < WORLD[0] and 0 <= yi < WORLD[1] and covs[n][yi, xi] > 127:
                res[n].append(s); break
    return res


def mkpiece(pid, group, sheet, meta, mode, region, spots, blend, opacity, extra=None):
    q = {'id': pid, 'group': group, 'sheet': sheet, 'frames': meta[0], 'fps': meta[1], 'blend': blend, 'opacity': opacity, 'maskRectPx': rect_of[region],
         'mask': region, 'frameW': meta[2], 'frameH': meta[3], 'kind': 'spots', 'mode': mode, 'spots': spots, 'fx2': True}
    if extra:
        q.update(extra)
    return q


new = []
copy_from = {'river-foam.webp': SRC_B, 'water-sparkle.webp': SRC_B, 'lava-bubble.webp': SRC_B, 'lava-steam.webp': SRC_B, 'embers-ash.webp': SRC_B}
for s, d in copy_from.items():
    shutil.copyfile(d / s, FX / 'sheets' / s)

# foam crests on the purple river shore (river-foam 320x128 x 8)
crests = crest_spots('spirit')
new.append(mkpiece('river-foam--shore', 'foam', 'river-foam.webp', (8, 8, 320, 128), 'swell', 'foam-spirit-edge', crests, 'normal', 0.82))
# glints on the purple river (water-sparkle 160x80 x 8): once per cycle, 55% of the period
spk = scatter('spirit', 70, .55, 9, (30, 52), aspect=.5, maxn=420, period=(2.2, 4.5))
for reg, sp in assign(spk, GROUPS['spirit']).items():
    if sp:
        new.append(mkpiece('water-sparkle--' + reg, 'sparkle', 'water-sparkle.webp', (8, 8, 160, 80), 'once', reg, sp, 'screen', 0.9, {'win': .6}))
# lava bubbles / steam / embers: lava surface and the lava falls, never anywhere else
for g in ('lava', 'lavafall'):
    regs = GROUPS[g]
    bub = scatter(g, 34 if g == 'lava' else 30, .8, 2, (40, 62), maxn=140, period=(4.5, 9))
    for reg, sp in assign(bub, regs).items():
        if sp:
            new.append(mkpiece('lava-bubble--' + reg, 'lava-bubble', 'lava-bubble.webp', (8, 9, 144, 144), 'once', reg, sp, 'normal', 0.95, {'win': .42}))
    stm = scatter(g, 50 if g == 'lava' else 44, .7, 1, (70, 100), maxn=70, period=(7, 12))
    for s in stm:
        s[3] = round(s[2] * 120 / 256, 1); s[7] = 0; s[8] = -26.0       # rises 26 units over its life
    for reg, sp in assign(stm, regs).items():
        if sp:
            new.append(mkpiece('lava-steam--' + reg, 'lava-steam', 'lava-steam.webp', (6, 4, 256, 120), 'rise', reg, sp, 'normal', 0.5))
    emb = scatter(g, 44 if g == 'lava' else 38, .6, 1, (40, 60), maxn=80, period=(5, 9))
    for s in emb:
        s[3] = round(s[2] * 160 / 128, 1); s[7] = 6.0; s[8] = -34.0
    for reg, sp in assign(emb, regs).items():
        if sp:
            new.append(mkpiece('embers-ash--' + reg, 'embers', 'embers-ash.webp', (8, 7, 128, 160), 'rise', reg, sp, 'screen', 0.9))

layout['pieces'] = pieces + new
layout['sheets'] = sorted(set(layout['sheets']) | {q['sheet'] for q in new})
layout['schemaVersion'] = 4
layout['note'] = 'Z1 v5 fluid / cloud frames + FX2 placements. Space = masterSize px == worldSize units. Built by scripts/build-v5-fx-assets.py then scripts/build-v5-fx2-assets.py'
layout['bandWorld'] = BAND
(FX / 'fx-layout.json').write_text(json.dumps(layout, ensure_ascii=False, separators=(',', ':')))
cnt = {}
for q in new:
    cnt[q['group']] = cnt.get(q['group'], 0) + len(q['spots'])
print('spots per group', cnt, '| pieces', len(layout['pieces']))
print('fx dir', round(sum(f.stat().st_size for f in FX.rglob('*') if f.is_file()) / 1e6, 2), 'MB')
