#!/usr/bin/env python3
"""Z1-LAYOUT-B2 build: liquid / mist / shadow regions for the animated Zone 1 fx, from DATA (not from fx-manifest suggestedPlacement).

  lava   = lava-coloured pixels of ok.jpg  (+ the base lava layer)  inside the terrain's alpha holes   (under the left arch it is lava, not purple water)
  water  = the base river layer inside the terrain holes, minus lava
  ice    = the base waterfall / ice stream layer inside the terrain holes
  mist zones = liquid dilated by a bank margin, minus the walkable floor (plaza, steps, bridges) -> mist never lies on buildings / plaza / trees
  ground = everything that is not sky (cloud shadows are clipped to it)

Outputs: src/town-v6-fx-data.js (polygons in world units, even-odd), docs/art-reviews/2026-11-05-zone1-fx/liquid-regions.png (+ mist-zones.png).
Run: python3 scripts/build-zone1-fx.py
"""
import json, re, math
from pathlib import Path
import numpy as np, cv2
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OKP = ROOT / 'docs/art-reviews/2026-11-05-zone1-layout/ok.jpg'
V6 = ROOT / 'img/map-zone1/v6'
EV = ROOT / 'docs/art-reviews/2026-11-05-zone1-fx'; EV.mkdir(parents=True, exist_ok=True)
man = json.loads((V6 / 'manifest.json').read_text())
S = man['world']['scale']; OY = man['world']['offsetY']
K = 2; GW, GH = 3840 // K, 2560 // K                       # working grid: 1 px = 2 world units

def grid_place(rgba, rect, crop=None):
    x, y, w, h = rect
    if crop: cx, cy, cw, ch = crop; rgba = rgba[cy:cy + ch, cx:cx + cw]
    tw, th = max(1, round(w / K)), max(1, round(h / K)); a = cv2.resize(rgba, (tw, th), interpolation=cv2.INTER_AREA)
    out = np.zeros((GH, GW, 4), np.uint8); x0, y0 = round(x / K), round(y / K)
    sx, sy = max(0, -x0), max(0, -y0); ex, ey = min(GW, x0 + tw), min(GH, y0 + th)
    if ex > max(0, x0) and ey > max(0, y0): out[max(0, y0):ey, max(0, x0):ex] = a[sy:sy + ey - max(0, y0), sx:sx + ex - max(0, x0)]
    return out

def load(p): return np.array(Image.open(ROOT / p).convert('RGBA'))
layers = {l['id']: grid_place(load(l['src']), l['rect'])[..., 3] > 128 for l in man['layers']}
terr = np.zeros((GH, GW, 4), np.uint8)
for t in man['tiles']:
    p = grid_place(load(t['src']), t['rect'], t['crop']); m = p[..., 3] > 0; terr[m] = p[m]
hole = terr[..., 3] < 128

# ok.jpg resampled into the world grid
ok = np.array(Image.open(OKP).convert('RGB'))
Mw = np.array([[K / S, 0, 0], [0, K / S, -OY / S]], np.float64)
ok_g = cv2.warpAffine(ok, Mw, (GW, GH), flags=cv2.INTER_AREA | cv2.WARP_INVERSE_MAP)
r, g, b = [ok_g[..., i].astype(np.int32) for i in range(3)]
lava_col = (r > 150) & (g < r * .85) & (b < g * .9 + 20) & (r - b > 110)
ys, xs = np.mgrid[0:GH, 0:GW]; wx, wy = xs * K, ys * K

def clean(m, open_px=0, min_area=0, close_px=0):
    m = m.astype(np.uint8)
    if close_px: m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (close_px, close_px)))
    if open_px: m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (open_px, open_px)))
    if min_area:
        n, lab, st, _ = cv2.connectedComponentsWithStats(m); keep = np.zeros_like(m)
        for i in range(1, n):
            if st[i, 4] >= min_area: keep[lab == i] = 1
        m = keep
    return m.astype(bool)

# ---- lava: left side only (x < 1150 world, below the volcano slope), in holes; the base lava layer + the ok.jpg colour (adds the arch)
left = (wx < 1150) & (wy > 380) & (wy < 1760)
lava = clean(hole & left & (layers['lava'] | (lava_col & (wy > 1380))), open_px=3, min_area=900, close_px=9)   # the colour test only where the sky cannot be mistaken for lava (the arch)
# ---- water: river layer in the holes minus lava; bottom half of the world only (the sky bits of the layer are not water)
water = clean(hole & layers['river'] & ~cv2.dilate(lava.astype(np.uint8), np.ones((7, 7), np.uint8)).astype(bool) & (wy > 1300), open_px=3, min_area=2000)
# ---- ice stream: waterfall layer in the holes
ice = clean(hole & layers['waterfall'], open_px=3, min_area=250, close_px=7)
nonsky = np.zeros((GH, GW), bool)
for k in ('mountains', 'river', 'lava', 'waterfall'): nonsky |= layers[k]
nonsky |= terr[..., 3] > 128
nonsky = clean(nonsky, open_px=5, close_px=9, min_area=3000)

# ---- walk floor (8 world units per cell) -> grid
js = (ROOT / 'src/town-owner-walkmask-th6.js').read_text(); runs = list(map(int, re.search(r'\[([\d,]+)\]', js).group(1).split(',')))
flat = np.zeros(sum(runs), np.uint8); p = 0; v = 0
for n in runs:
    flat[p:p + n] = v; p += n; v ^= 1
walk8 = flat.reshape(320, 480)
walk = cv2.resize(walk8, (GW, GH), interpolation=cv2.INTER_NEAREST).astype(bool)

def dil(m, wu): k = int(wu / K) * 2 + 1; return cv2.dilate(m.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))).astype(bool)
walk_pad = dil(walk, 14)
def mist_zone(liq, bank, up):
    z = dil(liq, bank)
    if up:                                         # mist rises: extend the zone upwards over the bank
        z |= cv2.dilate(liq.astype(np.uint8), np.ones((int(up / K), 1), np.uint8), anchor=(0, int(up / K) - 1)).astype(bool)
    return clean(z & ~walk_pad & ~(lava & (liq is not lava)) & nonsky, open_px=3, min_area=800)
mz_water = mist_zone(water, 36, 70)
mz_lava = mist_zone(lava, 40, 90)
mz_ice = mist_zone(ice, 46, 60)

def polys(m, eps=2.0, min_pts=4):
    cs, hier = cv2.findContours(m.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE); out = []
    for c in cs:
        if cv2.contourArea(c) < 6: continue
        a = cv2.approxPolyDP(c, eps, True).reshape(-1, 2) * K
        if len(a) >= min_pts: out.append([int(v) for v in a.reshape(-1)])
    return out

regions = {'lava': polys(lava), 'water': polys(water), 'ice': polys(ice), 'mistWater': polys(mz_water, 3), 'mistLava': polys(mz_lava, 3), 'mistIce': polys(mz_ice, 3), 'ground': polys(nonsky, 4)}

# ---- point sets (deterministic) --------------------------------------------------
rng = np.random.default_rng(20261105)
def sample_in(m, n, min_dist, edge=0, rng=rng):
    core = m if not edge else (cv2.erode(m.astype(np.uint8), np.ones((int(edge / K) * 2 + 1,) * 2, np.uint8)) > 0)
    yy, xx = np.nonzero(core); pts = []
    if not len(yy): return pts
    for i in rng.permutation(len(yy)):
        x, y = int(xx[i] * K), int(yy[i] * K)
        if all((x - px) ** 2 + (y - py) ** 2 >= min_dist ** 2 for px, py in pts):
            pts.append((x, y))
            if len(pts) >= n: break
    return pts
pts = {}
pts['lavaBubble'] = sample_in(lava, 14, 120, edge=26)
pts['lavaSteam'] = sample_in(lava, 6, 260, edge=0)
pts['embers'] = sample_in(lava, 5, 280, edge=10)
pts['sparkle'] = sample_in(water, 26, 190, edge=40)
pts['waterMist'] = sample_in(water & mz_water & (wy > 1420) & (wy < 1760), 7, 430, edge=0)   # the river seen from the plaza, bridges and pier (not the part under the foreground trees)
pts['iceMist'] = sample_in(mz_ice, 4, 220, edge=8)

# river foam: along the north bank (water whose upper neighbour is terrain), roughly one per 440 units
up = np.zeros_like(water); up[1:] = water[1:] & ~water[:-1]; up &= (terr[..., 3] > 128)[:-1].tolist() + [[False] * GW] if False else up
bank = []
yy, xx = np.nonzero(up)
for i in rng.permutation(len(yy)):
    x, y = int(xx[i] * K), int(yy[i] * K)
    if y > 1250 and y < 1780 and all(abs(x - px) > 460 or abs(y - py) > 200 for px, py in bank): bank.append((x, y))
    if len(bank) >= 9: break
pts['foam'] = sorted(bank)

# lava fall: lowest part of the lava where it meets the water (the arch) -> bottom edge pixel of the lava mass in the arch
arch = lava & (wx > 650) & (wy > 1380)
yy, xx = np.nonzero(arch)
pts['lavaFall'] = [(int(np.median(xx[yy > yy.max() - 12]) * K), int(yy.max() * K))] if len(yy) else []

# ---- evidence images --------------------------------------------------------------
base = np.array(Image.open(OKP).convert('RGB')); big = cv2.resize(base, (3840, 2560)); canvas = np.zeros((2560, 3840, 3), np.uint8)
Mo = np.array([[S, 0, 0], [0, S, OY]], np.float64)
canvas = cv2.warpAffine(base, Mo, (3840, 2560), flags=cv2.INTER_AREA, borderMode=cv2.BORDER_CONSTANT)
def paint(m, col, a=.55):
    mm = cv2.resize(m.astype(np.uint8), (3840, 2560), interpolation=cv2.INTER_NEAREST).astype(bool)
    canvas[mm] = (canvas[mm] * (1 - a) + np.array(col) * a).astype(np.uint8)
ev = canvas.copy()
paint(water, (40, 80, 255)); paint(lava, (255, 40, 20)); paint(ice, (0, 230, 230))
cv2.putText(canvas, '', (0, 0), 0, 1, 0)
leg = canvas
Image.fromarray(canvas).resize((1920, 1280), Image.LANCZOS).save(EV / 'liquid-regions.png')
canvas = ev.copy()
paint(mz_water, (255, 255, 255), .5); paint(mz_lava, (255, 200, 60), .5); paint(mz_ice, (200, 240, 255), .5)
for key, col in (('lavaBubble', (255, 0, 255)), ('lavaSteam', (255, 255, 0)), ('sparkle', (255, 255, 255)), ('foam', (0, 255, 0)), ('lavaFall', (255, 128, 0)), ('waterMist', (0, 255, 255)), ('iceMist', (0, 0, 255)), ('embers', (255, 80, 80))):
    for (x, y) in pts[key]: cv2.circle(canvas, (int(x), int(y)), 14, col, -1); cv2.circle(canvas, (int(x), int(y)), 14, (0, 0, 0), 2)
Image.fromarray(canvas).resize((1920, 1280), Image.LANCZOS).save(EV / 'mist-zones-and-points.png')

# ---- fx sheets: copy from Codex's FX-ART-Z1 run (drawn art, never edited here) + a trimmed manifest ------------
import os, shutil
CODEX = Path(os.environ.get('FX_ART_DIR', '/Users/agapae/agapae-work/.codex-worktrees/20261104T191411Z-285bbd21/docs/art-reviews/2026-11-05-fx-art-z1'))
USED = ['spirit-river', 'river-foam', 'water-sparkle', 'river-mist', 'lava-surface', 'lava-bubble', 'lava-fall-left', 'lava-steam', 'embers-ash', 'ice-mist',
        'torch-flame', 'leaf-maple', 'leaf-gold', 'leaf-green', 'snowflake', 'god-ray-01', 'god-ray-02', 'god-ray-03', 'air-dust', 'cloud-03', 'cloud-far-01', 'cloud-far-02']
fxm = json.loads((CODEX / 'fx-manifest.json').read_text()); byid = {a['id']: a for a in fxm['assets']}
(V6 / 'fx').mkdir(exist_ok=True); sheets = {}
for i in USED:
    a = byid[i]; shutil.copyfile(CODEX / a['sheet'], V6 / 'fx' / f'{i}.webp')
    sheets[i] = {'src': f'img/map-zone1/v6/fx/{i}.webp', 'fw': a['frameW'], 'fh': a['frameH'], 'n': a['frames'], 'fps': a['fps'], 'order': a['playbackOrder'],
                 'blend': a['blend'], 'alpha': a['suggestedOpacity'], 'tile': a['tileable']}
def ok2w(x, y): return (round(x * S), round(y * S + OY))
rays = [ok2w(q['x'], q['y']) + (round(q['w'] * S), round(q['h'] * S)) for q in (byid[k]['suggestedPlacement'][0] for k in ('god-ray-01', 'god-ray-02', 'god-ray-03'))]
torches = [ok2w(p_['x'] + p_['w'] / 2, p_['y'] + p_['h']) + (round(p_['w'] * S), round(p_['h'] * S)) for p_ in byid['torch-flame']['suggestedPlacement']]
dust = [ok2w(p_['x'], p_['y']) + (round(p_['w'] * S), round(p_['h'] * S)) for p_ in byid['air-dust']['suggestedPlacement']]
data = {'sheets': sheets, 'regions': regions, 'points': {k: [list(p) for p in v] for k, v in pts.items()}, 'rays': [list(r) for r in rays], 'dust': [list(r) for r in dust], 'torches': [list(t) for t in torches]}
out = ROOT / 'src/town-v6-fx-data.js'
out.write_text('// GENERATED by scripts/build-zone1-fx.py - polygons (world units, even-odd) and emitter points of the Zone 1 animated fx. Do not edit by hand.\n'
               'export const FX_Z1=' + json.dumps(data, separators=(',', ':')) + ';\n')
print({k: len(v) for k, v in regions.items()}, {k: len(v) for k, v in pts.items()}, out.stat().st_size)
print({'lava_px': int(lava.sum()), 'water_px': int(water.sum()), 'ice_px': int(ice.sum()), 'lava_in_walk': int((lava & walk).sum()), 'water_in_walk': int((water & walk).sum()), 'mist_in_walk': int(((mz_water | mz_lava | mz_ice) & walk).sum())})
