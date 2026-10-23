#!/usr/bin/env python3
"""N4: bake the "flowing surface" map for Zone 1 from the painted ground (img/map-zone1/v4).

Output img/map-zone1/v4/flow-v4.png, 1536x1024 (the same grid as zone1-terrain-v4-preview.webp,
2.5 world units per pixel), 8-bit RGB:
    R = kind * 40      0 none | 1 purple river | 2 lava | 3 lava fall | 4 ice river | 5 ice fall
    G = 128 + 127*dx   unit flow direction (downstream), world axes (x right, y down)
    B = 128 + 127*dy
The game reads it once (src/town-flow.js). Nothing here touches the painting.

Surfaces come from the colours of the painting, limited to hand-drawn exclusion boxes / include
polygons so painted trees, plazas, bridges, piers and stone banks are never covered.
Flow directions come from hand-traced centre lines (one per channel, upstream -> downstream);
every surface pixel takes the direction of its nearest centre line, falls always point down.

    python3 scripts/bake-town-flow.py [--debug /tmp/dir]

M2 — other zones:  --zone asia|west|cyberhell --profile scripts/flow-profiles/<zone>.json [--ground-dir DIR] [--out FILE]
The hand-made data below (boxes, falls, centre lines, river colour rule) is Zone 1's; a zone supplies its own in a JSON profile
with the same field names (lowercase): lava_exclude, lava_x_max, lava_falls, ice_falls, ice_allow, lava_paths, ice_paths,
purple_dir, river {hue:[lo,hi], sat_min, val_min, b_over_r, b_over_g, y:[lo,hi]}.  Missing fields keep Zone 1's value.
Default (no --zone) is byte-identical to before.  Then set flowUrl in src/zone-skin.js.

Needs numpy, scipy and opencv-python (cv2).
"""
import sys, os
import numpy as np, cv2
from scipy.spatial import cKDTree

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'img/map-zone1/v4/flow-v4.png')
GROUND_DIR = os.path.join(ROOT, 'img/map-zone1/v4')
W, H = 1536, 1024
KIND = {'purple': 1, 'lava': 2, 'lavafall': 3, 'ice': 4, 'icefall': 5}

# ---------------------------------------------------------------- hand-made data (preview pixels)
# Rectangles [x0,y0,x1,y1] where painted lava-coloured things are NOT lava (lit ground, orange leaves).
LAVA_EXCLUDE = [
    [100, 375, 225, 455],     # lit dirt west of the cauldron plaza
    [100, 540, 225, 705],     # glowing cracks on the plaza rim
]
LAVA_X_MAX = 540        # lava only exists in the west
# Waterfalls: pixels of the matching surface inside these boxes become "fall" (fast, straight down).
LAVA_FALLS = [
    [225, 12, 252, 78], [141, 70, 160, 102], [350, 128, 392, 190], [57, 224, 93, 276],
    [362, 262, 397, 320], [338, 396, 380, 440], [408, 502, 462, 572], [375, 633, 402, 680],
]
ICE_FALLS = [
    [1370, 45, 1414, 138], [1248, 206, 1268, 248], [1202, 488, 1248, 602], [1154, 476, 1170, 505],
    [1446, 338, 1480, 395],
]
# Where ice water is allowed: the lower river system, the NE fall and the east edge stream.
ICE_ALLOW = [
    [940, 190, 1340, 705], [1360, 40, 1426, 150], [1430, 330, 1536, 420],
]
# Hand-traced centre lines, upstream -> downstream.
LAVA_PATHS = [
    [(238, 12), (240, 70), (262, 92), (300, 102), (335, 118), (362, 135), (368, 185), (356, 215),
     (368, 240), (372, 275), (372, 310), (385, 335), (405, 350), (395, 372), (365, 392), (362, 420),
     (366, 445), (385, 462), (410, 478), (430, 500), (440, 540), (445, 575), (470, 595), (495, 620),
     (500, 650), (505, 680), (505, 704)],
    [(238, 75), (200, 70), (160, 66), (150, 85), (150, 102), (150, 130)],
    [(65, 205), (72, 240), (75, 275), (70, 300), (60, 330)],
    [(372, 520), (368, 580), (376, 640), (386, 690)],
    [(330, 60), (380, 70), (420, 62)],
]
ICE_PATHS = [
    [(1255, 225), (1200, 222), (1150, 240), (1120, 270), (1080, 310), (1030, 340), (1000, 365),
     (985, 400), (980, 430), (975, 455), (1010, 470), (1050, 495), (1100, 508), (1160, 510),
     (1210, 510), (1225, 560), (1235, 600), (1260, 625), (1300, 640), (1310, 670), (1300, 704)],
    [(1455, 338), (1465, 395), (1500, 405), (1536, 395)],
    [(1392, 48), (1396, 135), (1400, 150)],
]
# Purple river flows left -> right.
PURPLE_DIR = (1.0, 0.0)
# River colour rule (Zone 1: saturated violet band between y 660 and 830).
RIVER = {'hue': [240, 310], 'sat_min': 110, 'val_min': 70, 'b_over_r': 10, 'b_over_g': 1.6, 'y': [660, 830]}


def apply_profile(path):
    import json
    global LAVA_EXCLUDE, LAVA_X_MAX, LAVA_FALLS, ICE_FALLS, ICE_ALLOW, LAVA_PATHS, ICE_PATHS, PURPLE_DIR, RIVER
    p = json.load(open(path))
    tup = lambda paths: [[tuple(pt) for pt in line] for line in paths]
    LAVA_EXCLUDE = p.get('lava_exclude', LAVA_EXCLUDE); LAVA_X_MAX = p.get('lava_x_max', LAVA_X_MAX)
    LAVA_FALLS = p.get('lava_falls', LAVA_FALLS); ICE_FALLS = p.get('ice_falls', ICE_FALLS); ICE_ALLOW = p.get('ice_allow', ICE_ALLOW)
    LAVA_PATHS = tup(p['lava_paths']) if 'lava_paths' in p else LAVA_PATHS
    ICE_PATHS = tup(p['ice_paths']) if 'ice_paths' in p else ICE_PATHS
    PURPLE_DIR = tuple(p.get('purple_dir', PURPLE_DIR)); RIVER = {**RIVER, **p.get('river', {})}
# ----------------------------------------------------------------------------------------------


def load_full():
    from PIL import Image
    full = Image.new('RGB', (4915, 3277))
    for r in range(1, 5):
        for c in range(1, 6):
            full.paste(Image.open(os.path.join(GROUND_DIR, f'r{r}-c{c}.webp')).convert('RGB'),
                       ((c - 1) * 1024, (r - 1) * 1024))
    rgb = np.asarray(full.resize((W, H), Image.LANCZOS))
    return rgb[..., ::-1].copy()  # BGR


def rect_mask(rects):
    m = np.zeros((H, W), np.uint8)
    for x0, y0, x1, y1 in rects:
        m[y0:y1, x0:x1] = 1
    return m


def keep_big(m, min_px):
    n, lab, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), 8)
    out = np.zeros_like(m, np.uint8)
    for i in range(1, n):
        if st[i, 4] >= min_px:
            out[lab == i] = 1
    return out


def ell(k):
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))


def build_masks(im):
    b, g, r = [im[..., i].astype(np.int32) for i in range(3)]
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV).astype(np.int32)
    hue, sat, val = hsv[..., 0] * 2, hsv[..., 1], hsv[..., 2]
    yy = np.arange(H)[:, None] * np.ones((1, W), np.int32)
    xx = np.ones((H, 1), np.int32) * np.arange(W)[None, :]

    # lava: bright orange / yellow, west side, above the river
    lava = (r >= 205) & (b <= 58) & (g >= 28) & (r > g + 25) & (xx < LAVA_X_MAX) & (yy < 705)
    lava &= (rect_mask(LAVA_EXCLUDE) == 0)
    lava = cv2.morphologyEx(lava.astype(np.uint8), cv2.MORPH_CLOSE, ell(5))
    lava = keep_big(lava, 350)

    # purple river: saturated violet band
    purple = (b > r + RIVER['b_over_r']) & (b > g * RIVER['b_over_g']) & (r > g) & (val > RIVER['val_min']) & (sat > RIVER['sat_min']) \
        & (hue > RIVER['hue'][0]) & (hue < RIVER['hue'][1]) & (yy > RIVER['y'][0]) & (yy < RIVER['y'][1])
    # lava running on into the river looks lit-up violet/orange; take it as river water below the bank
    reflect = rect_mask([[345, 695, 432, 790], [445, 695, 545, 792]]).astype(bool) & (val > 110)
    purple |= reflect
    purple = cv2.morphologyEx(purple.astype(np.uint8), cv2.MORPH_CLOSE, ell(5))
    purple = keep_big(purple, 300)

    # ice / blue water: cyan, only inside the allowed boxes
    ice = (g >= 95) & (b >= 125) & (b > r + 60) & (g > r + 40) & (rect_mask(ICE_ALLOW) == 1) & (xx > 900) & (yy < 705)
    ice = cv2.morphologyEx(ice.astype(np.uint8), cv2.MORPH_CLOSE, ell(3))
    ice = keep_big(ice, 60)

    # priority: lava beats river water above the bank line, ice beats nothing else
    purple[lava > 0] = 0
    ice[lava > 0] = 0
    ice[purple > 0] = 0

    # 1 px erosion: effects stay inside the painted banks
    out = {}
    for k, m in (('purple', purple), ('lava', lava), ('ice', ice)):
        out[k] = cv2.erode(m, ell(3))
    lavafall = out['lava'] & rect_mask(LAVA_FALLS)
    icefall = out['ice'] & rect_mask(ICE_FALLS)
    out['lava'] = out['lava'] & (1 - lavafall)
    out['ice'] = out['ice'] & (1 - icefall)
    out['lavafall'], out['icefall'] = lavafall, icefall
    return out


def densify(paths):
    pts, tans = [], []
    for p in paths:
        for (x0, y0), (x1, y1) in zip(p[:-1], p[1:]):
            n = max(2, int(np.hypot(x1 - x0, y1 - y0)))
            d = np.array([x1 - x0, y1 - y0], float)
            d /= (np.linalg.norm(d) or 1)
            for t in np.linspace(0, 1, n, endpoint=False):
                pts.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t))
                tans.append(d)
    return np.array(pts), np.array(tans)


def flow_field(mask, paths):
    ys, xs = np.nonzero(mask)
    fx = np.zeros((H, W), np.float32)
    fy = np.zeros((H, W), np.float32)
    if not len(xs):
        return fx, fy
    pts, tans = densify(paths)
    _, idx = cKDTree(pts).query(np.stack([xs, ys], 1))
    fx[ys, xs], fy[ys, xs] = tans[idx, 0], tans[idx, 1]
    return fx, fy


def smooth(fx, fy, mask, sigma=7):
    m = mask.astype(np.float32)
    den = cv2.GaussianBlur(m, (0, 0), sigma) + 1e-6
    sx = cv2.GaussianBlur(fx * m, (0, 0), sigma) / den
    sy = cv2.GaussianBlur(fy * m, (0, 0), sigma) / den
    n = np.hypot(sx, sy) + 1e-6
    return sx / n * m, sy / n * m


def main():
    global OUT, GROUND_DIR
    arg = lambda name: sys.argv[sys.argv.index(name) + 1] if name in sys.argv else None
    debug = arg('--debug')
    zone = arg('--zone')
    if zone:
        if not arg('--profile'): sys.exit('--zone needs --profile <json> (the hand-made data of that zone)')
        apply_profile(arg('--profile'))
        folder = {'asia': 'map-zone2', 'west': 'map-zone3', 'cyberhell': 'map-zone4'}[zone]
        GROUND_DIR = arg('--ground-dir') or os.path.join(ROOT, 'img', folder, 'v1')
        OUT = arg('--out') or os.path.join(ROOT, 'img', folder, 'v1', 'flow-v1.png')
    elif arg('--out'): OUT = arg('--out')
    im = load_full()
    masks = build_masks(im)
    kind = np.zeros((H, W), np.uint8)
    dx = np.zeros((H, W), np.float32)
    dy = np.zeros((H, W), np.float32)
    for name in ('purple', 'lava', 'ice', 'lavafall', 'icefall'):
        m = masks[name] > 0
        kind[m] = KIND[name]
        if name == 'purple':
            dx[m], dy[m] = PURPLE_DIR
        elif name in ('lavafall', 'icefall'):
            dy[m] = 1.0
        else:
            fx, fy = flow_field(m, LAVA_PATHS if name == 'lava' else ICE_PATHS)
            fx, fy = smooth(fx, fy, m)
            dx[m], dy[m] = fx[m], fy[m]
    out = np.zeros((H, W, 3), np.uint8)  # BGR for cv2
    out[..., 2] = kind * 40
    out[..., 1] = np.clip(128 + np.round(127 * dx), 1, 255)
    out[..., 0] = np.clip(128 + np.round(127 * dy), 1, 255)
    cv2.imwrite(OUT, out, [cv2.IMWRITE_PNG_COMPRESSION, 9])
    print('wrote', OUT, os.path.getsize(OUT), 'bytes', {k: int((masks[k] > 0).sum()) for k in masks})
    if debug:
        os.makedirs(debug, exist_ok=True)
        ov = im.copy()
        col = {1: (255, 0, 255), 2: (0, 255, 0), 3: (0, 255, 255), 4: (255, 255, 0), 5: (255, 128, 0)}
        for k, c in col.items():
            ov[kind == k] = (0.4 * ov[kind == k] + 0.6 * np.array(c)).astype(np.uint8)
        for y in range(6, H, 14):
            for x in range(6, W, 14):
                if kind[y, x]:
                    cv2.arrowedLine(ov, (x, y), (int(x + dx[y, x] * 9), int(y + dy[y, x] * 9)), (255, 255, 255), 1, tipLength=.4)
        cv2.imwrite(os.path.join(debug, 'flow-overlay.png'), ov)
        np.save(os.path.join(debug, 'kind.npy'), kind)


if __name__ == '__main__':
    main()
