#!/usr/bin/env python3
# FB3-CLEAN2 (26 Nov 2026): the images this script uses were removed from the tree: img/map-zone3/v1 and img/map-zone3/v7 (the 1x and 2x ground it builds v8 from; v8 itself stays).  They are in git at commit 6e752785: git checkout 6e752785 -- <path>.
"""Z3-SNOW-CODE (15 Nov 2026): zone 3 snow drawn by code onto the v7 ground, written as a new ground set img/map-zone3/v8/.

Why: the HD ground (v7) has thinner snow along the cliff tops and the road edges than the 1x ground (v1), so the whole zone looks pale and cold.
What it does (nothing is recoloured or filtered; new snow is ADDED where v1 had it and v7 is bare):
  1. where v1 has snow (bright, unsaturated pixels) and v7 is not already thick snow -> a footprint, minus water, minus stairs/bridges (protected rects),
     minus the pine trees, minus the walk mask (the plazas and roads stay bare, as in the game's navigation data);
  2. the footprint is drawn at 2x (the ground's own resolution): lumpy outline (noise-warped threshold, never a rectangle), a rounded pillow height,
     a normal-lit surface with the light from the upper left like the painting, a bluish shaded underside, a hanging cornice (front face) with short drips,
     a soft cast shadow, fine grain and a few glints;  the colours come from a ramp sampled from v1's own snow, so the snow is as bright as v1;
  3. the dry twigs of v7 stay on top of the new snow (their pixels are masked out);
  4. the central bridge head is taken from Codex's round 1 pack (docs: that patch passed), joined with a feather;
  5. the result is written as 20 chunks of 2048 px (r1-c1..r4-c5.webp + preview + manifest.json), the same pack layout scripts/install-ground.py reads.

  python3 scripts/build-z3-snow.py --out <pack dir> [--window x0 y0 x1 y1 (1x map px) --png crop.png]   # --window renders only a crop for look checks
Then:  python3 scripts/install-ground.py <pack dir> --zone 3 --name v8 --activate
"""
import argparse, json, os, re
from pathlib import Path
import numpy as np, cv2
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
FULL = (9830, 6554)
BASE = (4915, 3277)
BRIDGE_BOX = (2302, 1807, 2623, 2168)     # 1x map px: the central bridge head repainted by Codex round 1
HALO = 80
GROW = int(os.environ.get('GROW', 24))         # 1x px a new drift may reach out from the snow v7 already has


# ----------------------------------------------------------------------------------------------- inputs
def stitch(folder, size, tile):
    W, H = size
    out = np.zeros((H, W, 3), np.uint8)
    for r in range(1, -(-H // tile) + 1):
        for c in range(1, -(-W // tile) + 1):
            im = np.asarray(Image.open(Path(folder) / f'r{r}-c{c}.webp').convert('RGB'))
            out[(r - 1) * tile:(r - 1) * tile + im.shape[0], (c - 1) * tile:(c - 1) * tile + im.shape[1]] = im
    return out


def hsv(a): return cv2.cvtColor(a, cv2.COLOR_RGB2HSV)


def snow_pixels(a):
    h = hsv(a); f = a.astype(np.int16)
    return (f[..., 0] > 150) & (f[..., 1] > 165) & (f[..., 2] > 180) & (h[..., 1] < 80) & (f[..., 2] - f[..., 0] < 85)


def cyan_pixels(a):
    h = hsv(a)
    return (h[..., 0] >= 82) & (h[..., 0] <= 106) & (h[..., 1] > 100) & (h[..., 2] > 130)


def green_pixels(a):
    h = hsv(a); f = a.astype(np.int16)
    return (h[..., 0] >= 35) & (h[..., 0] <= 95) & (h[..., 1] > 45) & (h[..., 2] < 150) & (f[..., 1] >= f[..., 0] + 4)


def twig_pixels(a):
    h = hsv(a); f = a.astype(np.float32)
    return (f[..., 0] > f[..., 2] * 1.02) & (f[..., 0] > f[..., 1] * .99) & (h[..., 2] < 170) & (h[..., 2] > 28)


def walk_cells():
    txt = (ROOT / 'src/town-owner-walkmask-west.js').read_text()
    runs = json.loads(re.search(r'TOWN_OWNER_WALK_RUNS=(\[.*?\]);', txt).group(1))
    cells = np.repeat(np.arange(len(runs)) % 2, runs).astype(np.uint8).reshape(320, 480)
    assert int(cells.sum()) == 27328
    return cells


def protected_rects():
    d = json.loads((ROOT / 'scripts/data/z3-protected-structure.json').read_text())
    m = np.zeros((BASE[1], BASE[0]), np.float32)
    for x0, y0, x1, y1 in d['rectsPreview1500x1000']:
        m[round(y0 * BASE[1] / 1000):round(y1 * BASE[1] / 1000), round(x0 * BASE[0] / 1500):round(x1 * BASE[0] / 1500)] = 1
    return m


class Ctx:
    """1x masks + the v7 ground + the colour ramp.  Everything the strip renderer reads."""
    def __init__(self):
        self.v1 = stitch(ROOT / 'img/map-zone3/v1', BASE, 1024)
        self.v7 = stitch(ROOT / 'img/map-zone3/v7', FULL, 1024)
        v7s = cv2.resize(self.v7, BASE, interpolation=cv2.INTER_AREA)
        k = lambda n: np.ones((n, n), np.uint8)
        s1 = snow_pixels(self.v1)
        s1[:420] = False                                           # far ridge, clouds and sky stay as painted
        s1 = cv2.morphologyEx(s1.astype(np.uint8), cv2.MORPH_OPEN, k(3))
        s1 = cv2.morphologyEx(s1, cv2.MORPH_CLOSE, k(7))           # twig gaps inside a drift are snow too
        self.s1 = s1
        water = (cv2.dilate((cyan_pixels(self.v1) | cyan_pixels(v7s)).astype(np.uint8), k(15)) > 0)
        trees = cv2.morphologyEx(green_pixels(v7s).astype(np.uint8), cv2.MORPH_CLOSE, k(9))
        trees = cv2.dilate(trees, k(13)) > 0
        s7 = snow_pixels(v7s).astype(np.uint8)
        s7 = cv2.morphologyEx(s7, cv2.MORPH_OPEN, k(5))
        thick7 = cv2.GaussianBlur(s7.astype(np.float32), (0, 0), 3) > .93  # v7 already has a real drift here
        self.thick7 = thick7
        prot = cv2.GaussianBlur(protected_rects(), (0, 0), 5)
        # clouds / mist in v1 (smooth and bright, big): not snow on the ground, never grow a drift into them
        l1 = self.v1.astype(np.float32) @ np.array([.2126, .7152, .0722], np.float32)
        m1 = cv2.blur(l1, (9, 9)); sd1 = np.sqrt(np.maximum(cv2.blur(l1 * l1, (9, 9)) - m1 * m1, 0))
        cloud = cv2.morphologyEx(((sd1 < 12) & (l1 > 190)).astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)))
        cloud = cv2.dilate(cloud, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41))) > 0
        l7 = v7s.astype(np.float32) @ np.array([.2126, .7152, .0722], np.float32)
        m7 = cv2.blur(l7, (7, 7)); sd7 = np.sqrt(np.maximum(cv2.blur(l7 * l7, (7, 7)) - m7 * m7, 0))
        fog7 = cv2.morphologyEx(((sd7 < 13) & (m7 > 105) & (m7 < 232)).astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)))
        cloud = cloud | (cv2.dilate(fog7, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))) > 0)
        self.cloud = cloud
        keep = (~water) & (~trees) & (~cloud) & (prot < .5)
        # growth only from a drift v7 already has: v1 and v7 are the same map but not the same pixels (v7 redrew paving and rocks),
        # so a v1 drift floating on v7's cobbles would be wrong; a drift that touches v7's own snow is safe
        s7any = cv2.morphologyEx(s7, cv2.MORPH_CLOSE, k(5))
        near7 = cv2.dilate(s7any, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * GROW + 1, 2 * GROW + 1))) > 0
        reg = s1.astype(np.float32) * keep * (~thick7) * near7
        # drop crumbs: only footprints of a real size are drawn
        n, lab, st, _ = cv2.connectedComponentsWithStats((reg > .5).astype(np.uint8), connectivity=8)
        big = np.zeros(n, bool); big[1:] = st[1:, cv2.CC_STAT_AREA] >= 200
        reg *= big[lab]
        self.reg = reg
        self.reg_blur = cv2.GaussianBlur(reg, (0, 0), 2.2)
        cells = walk_cells()
        self.walk = cv2.resize(cells, BASE, interpolation=cv2.INTER_NEAREST).astype(np.float32)
        self.walk_blur = cv2.GaussianBlur(self.walk, (0, 0), 4)
        self.water = cv2.GaussianBlur(water.astype(np.float32), (0, 0), 3)
        self.prot = prot
        # colour ramp = v1's own snow, brightest at the end
        px = self.v1[s1 > 0].astype(np.float32)
        lum = px @ np.array([.2126, .7152, .0722], np.float32)
        qs = np.percentile(lum, np.linspace(2, 99, 64))
        idx = np.digitize(lum, qs)
        ramp = np.array([px[idx == i].mean(0) if (idx == i).sum() else px.mean(0) for i in range(64)], np.float32)
        self.ramp = cv2.GaussianBlur(ramp[None], (0, 0), 1.6)[0]        # smooth LUT, 64 x 3
        self.noise_cache = {}

    def lattice(self, scale, seed):
        key = (scale, seed)
        if key not in self.noise_cache:
            rng = np.random.default_rng(seed)
            self.noise_cache[key] = rng.random((int(FULL[1] / scale) + 6, int(FULL[0] / scale) + 6), dtype=np.float32) * 2 - 1
        return self.noise_cache[key]

    def noise(self, x0, y0, x1, y1, scale, seed):
        """Smooth value noise in [-1, 1] sampled over the 2x window, global coordinates (so strips join)."""
        L = self.lattice(scale, seed)
        xs = (np.arange(x0, x1, dtype=np.float32) + .5) / scale + 1
        ys = (np.arange(y0, y1, dtype=np.float32) + .5) / scale + 1
        return cv2.remap(L, np.broadcast_to(xs[None], (y1 - y0, x1 - x0)).copy(), np.broadcast_to(ys[:, None], (y1 - y0, x1 - x0)).copy(),
                         cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


def up(a1x, x0, y0, x1, y1, interp=cv2.INTER_CUBIC):
    """sample a 1x map at the pixel centres of the 2x window"""
    xs = (np.arange(x0, x1, dtype=np.float32) + .5) / 2 - .5
    ys = (np.arange(y0, y1, dtype=np.float32) + .5) / 2 - .5
    return cv2.remap(a1x, np.broadcast_to(xs[None], (y1 - y0, x1 - x0)).copy(), np.broadcast_to(ys[:, None], (y1 - y0, x1 - x0)).copy(),
                     interp, borderMode=cv2.BORDER_REPLICATE)


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


# ----------------------------------------------------------------------------------------------- the snow
LIGHT = np.array([-.55, -.62, .56], np.float32); LIGHT /= np.linalg.norm(LIGHT)


def render(ctx, X0, Y0, X1, Y1, params):
    """Return the new ground for the 2x window [X0,X1) x [Y0,Y1) (uint8 RGB).  Computed with a halo so strips join."""
    p = params
    x0, y0, x1, y1 = max(0, X0 - HALO), max(0, Y0 - HALO), min(FULL[0], X1 + HALO), min(FULL[1], Y1 + HALO)
    H, W = y1 - y0, x1 - x0
    base = ctx.v7[y0:y1, x0:x1].astype(np.float32)
    N = lambda s, seed: ctx.noise(x0, y0, x1, y1, s, seed)

    # --- footprint: blurred region, warped by noise, minus the walk mask
    f = up(ctx.reg_blur, x0, y0, x1, y1)
    wb = up(ctx.walk_blur, x0, y0, x1, y1)
    f = f - 1.15 * wb
    f = f - 0.9 * up(ctx.water, x0, y0, x1, y1)
    f = f - 0.9 * up(ctx.prot, x0, y0, x1, y1)
    f = f + p['warp1'] * N(22, 11) + p['warp2'] * N(8, 12) + p['warp3'] * N(3, 13)
    shape = (f > .5)
    shape_u8 = shape.astype(np.uint8)
    if not shape.any():
        return base[Y0 - y0:Y1 - y0, X0 - x0:X1 - x0].astype(np.uint8)
    # drop slivers left by the cuts
    shape_u8 = cv2.morphologyEx(shape_u8, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    shape = shape_u8 > 0

    # --- height: rounded pillow from the inside distance
    d = cv2.distanceTransform(shape_u8, cv2.DIST_L2, 5)
    d = cv2.GaussianBlur(d, (0, 0), 2.2)
    amp = 1 + .35 * N(40, 14) + .18 * N(14, 15)
    h = (1 - np.exp(-d / p['pillow'])) * amp + p['bump'] * N(5, 16) * np.clip(d / 6, 0, 1) + p['bump2'] * N(2.2, 17) * np.clip(d / 4, 0, 1)
    hs = cv2.GaussianBlur(h, (0, 0), .9)
    gx = cv2.Sobel(hs, cv2.CV_32F, 1, 0, ksize=3) / 8
    gy = cv2.Sobel(hs, cv2.CV_32F, 0, 1, ksize=3) / 8
    k = p['relief']
    nx, ny, nz = -gx * k, -gy * k, np.ones_like(gx)
    inv = 1 / np.sqrt(nx * nx + ny * ny + 1)
    s = (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) * inv / LIGHT[2]       # 1 = flat
    ridge = (1 - np.abs(N(4.5, 24))) ** 3                    # crevices between crystal clumps
    ridge2 = (1 - np.abs(N(2.2, 26))) ** 3
    t = p['base'] + (s - 1) * p['contrast'] + .05 * N(3, 18)
    # crystal detail goes straight into the colour (the ramp is almost flat near white, so noise in t would vanish): fine grain, clumps and bluish crevices
    ripple = np.sin(d / p['rip'] + 3.0 * N(14, 28)) * np.clip(d / 7, 0, 1)        # wind-packed ripples that follow the outline of the drift
    detail = (p['grain'] * (N(1.0, 19) + .7 * N(1.7, 27)) + p['crev'] * ((ridge - .3) + .8 * (ridge2 - .3)) + p['ripamp'] * ripple)
    # a little ambient darkening in the thin rim, so a drift reads as thick
    t -= .10 * np.exp(-d / 3.0) * shape
    t = np.clip(t, 0, 1)
    idx = t * 63
    i0 = np.clip(idx.astype(np.int32), 0, 62); fr = (idx - i0)[..., None]
    top_col = ctx.ramp[i0] * (1 - fr) + ctx.ramp[i0 + 1] * fr
    top_col = np.clip(top_col + detail[..., None] * np.array([1., .93, .78], np.float32), 0, 255)
    # glints: sparse single bright pixels on the lit side
    gl = (N(1.7, 20) > p['glint']) & (s > .98) & shape
    gl = cv2.dilate(gl.astype(np.uint8), np.ones((2, 2), np.uint8)) > 0
    top_col = np.where(gl[..., None], top_col * .35 + 255 * .65, top_col)

    # --- cornice: the front face under the lower edge (+ short drips)
    rows = np.arange(H, dtype=np.int32)[:, None]
    last = np.maximum.accumulate(np.where(shape, rows, -1), axis=0)
    dy = (rows - last).astype(np.float32)                    # distance below the nearest snow pixel above
    spike = np.clip((N(7, 21) - .45) * 3.2, 0, 1) ** 1.6
    T = p['lip'] * (.55 + .45 * (.5 + .5 * N(30, 22))) + p['drip'] * spike
    ok = (last >= 0) & (~shape)
    face_a = np.clip(T - dy + .5, 0, 1) * ok
    # the drip must not stand on a roadway, water or a protected structure
    face_a *= 1 - smooth(.25, .6, wb)
    face_a *= 1 - smooth(.3, .7, up(ctx.water, x0, y0, x1, y1))
    face_a *= 1 - smooth(.3, .7, up(ctx.prot, x0, y0, x1, y1))
    fy = np.clip(dy / np.maximum(T, 1), 0, 1)
    tf = .30 + .22 * (1 - fy) + .06 * N(4, 23)
    tf = np.clip(tf, 0, 1)
    j0 = np.clip((tf * 63).astype(np.int32), 0, 62); fj = (tf * 63 - j0)[..., None]
    face_col = ctx.ramp[j0] * (1 - fj) + ctx.ramp[j0 + 1] * fj
    face_col = face_col * np.array([.93, .97, 1.0], np.float32)     # shaded side leans blue

    # --- soft cast shadow toward the lower right, only where the ground is rock / ice (not roadway)
    sh = cv2.warpAffine(shape_u8.astype(np.float32), np.float32([[1, 0, p['shx']], [0, 1, p['shy']]]), (W, H))
    sh = cv2.GaussianBlur(sh, (0, 0), p['shblur'])
    sh = np.clip(sh - shape.astype(np.float32), 0, 1) * (1 - face_a)
    sh *= (1 - smooth(.25, .6, wb)) * (1 - smooth(.3, .7, up(ctx.water, x0, y0, x1, y1)))
    base_sh = base * (1 - p['shadow'] * sh[..., None] * np.array([.30, .20, .08], np.float32) * 3.3 / 3.3)

    # --- composite.  Dry twigs of v7 stay on top of the snow.
    twig = twig_pixels(ctx.v7[y0:y1, x0:x1])
    twig = cv2.dilate(twig.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(np.float32)
    twig = cv2.GaussianBlur(twig, (0, 0), .7)
    keep = 1 - np.clip(twig * 1.3, 0, 1)
    # anti-aliased edge of the top: signed distance from the thresholded field
    gmag = cv2.GaussianBlur(np.hypot(cv2.Sobel(f, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(f, cv2.CV_32F, 0, 1, ksize=3)) / 8, (0, 0), 1.2)
    sd = (f - .5) / np.maximum(gmag, 1e-3)
    top_a = np.clip(.5 + sd / 1.3, 0, 1) * (cv2.GaussianBlur(shape_u8.astype(np.float32), (0, 0), 1.0) > .02)
    top_a = np.minimum(top_a, cv2.GaussianBlur(shape_u8.astype(np.float32), (0, 0), 1.1) * 1.6)
    top_a = np.clip(top_a, 0, 1)
    # v7's own snow pixels stay where they are: the new snow only fills the gaps between them, so the frosty drift keeps its crystals
    v7l = base @ np.array([.2126, .7152, .0722], np.float32)
    v7sat = base.max(2) - base.min(2)
    sn7 = smooth(196, 222, v7l) * (1 - smooth(60, 110, v7sat))
    sn7 = cv2.GaussianBlur(sn7, (0, 0), .6)
    top_a *= 1 - p['keep7'] * sn7
    face_a = face_a * (1 - p['keep7'] * sn7)
    top_a *= keep; face_a = face_a * keep
    out = base_sh
    out = out * (1 - face_a[..., None]) + face_col * face_a[..., None]
    out = out * (1 - top_a[..., None]) + top_col * top_a[..., None]
    out = np.clip(out + .5, 0, 255).astype(np.uint8)
    return out[Y0 - y0:Y1 - y0, X0 - x0:X1 - x0]


PARAMS = dict(warp1=.22, warp2=.10, warp3=.045, pillow=9.0, bump=.10, bump2=.05, relief=7.0, contrast=.55, glint=.80,
              grain=24., crev=60., ripamp=34., rip=2.2, base=.72, keep7=.7, lip=4.0, drip=11.0, shx=3, shy=5, shblur=3.0, shadow=.38)


def bridge_patch(img):
    """central bridge head: Codex round 1 passed this box.  The pixels are kept in scripts/data/z3-bridge-head.webp (lossless, cut from
    Codex's v8 chunks, review dir 2026-11-15-z3-ground-snow); it is joined with a short feather so the v7 ghost under it cannot show."""
    src = np.asarray(Image.open(ROOT / 'scripts/data/z3-bridge-head.webp').convert('RGB'))
    x0, y0, x1, y1 = (v * 2 for v in BRIDGE_BOX)
    assert src.shape[:2] == (y1 - y0, x1 - x0), src.shape
    yy, xx = np.mgrid[:y1 - y0, :x1 - x0]
    e = np.minimum.reduce([xx, yy, x1 - x0 - 1 - xx, y1 - y0 - 1 - yy]).astype(np.float32)
    a = smooth(2, 22, e)[..., None]
    img[y0:y1, x0:x1] = np.clip(src * a + img[y0:y1, x0:x1] * (1 - a) + .5, 0, 255).astype(np.uint8)
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=None)
    ap.add_argument('--window', type=int, nargs=4, default=None)
    ap.add_argument('--png', default=None)
    ap.add_argument('--no-bridge', action='store_true')
    ap.add_argument('--param', action='append', default=[], help='name=value override')
    a = ap.parse_args()
    P = dict(PARAMS)
    for kv in a.param:
        k, v = kv.split('='); P[k] = float(v)
    ctx = Ctx()
    if a.window:
        x0, y0, x1, y1 = (v * 2 for v in a.window)
        new = render(ctx, x0, y0, x1, y1, P)
        old = ctx.v7[y0:y1, x0:x1]
        v1 = cv2.resize(ctx.v1[a.window[1]:a.window[3], a.window[0]:a.window[2]], (x1 - x0, y1 - y0), interpolation=cv2.INTER_CUBIC)
        gap = np.full((y1 - y0, 8, 3), 20, np.uint8)
        Image.fromarray(np.hstack([v1, gap, old, gap, new])).save(a.png or 'window.png')
        return
    result = ctx.v7.copy()
    for y in range(0, FULL[1], 1024):
        y1 = min(FULL[1], y + 1024)
        result[y:y1] = render(ctx, 0, y, FULL[0], y1, P)
        print('strip', y, flush=True)
    if not a.no_bridge:
        result = bridge_patch(result)
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    for r in range(1, 5):
        for c in range(1, 6):
            x, y = (c - 1) * 2048, (r - 1) * 2048
            Image.fromarray(result[y:min(y + 2048, FULL[1]), x:min(x + 2048, FULL[0])]).save(out / f'r{r}-c{c}.webp', 'WEBP', quality=90, method=5)
    Image.fromarray(result).resize((1536, 1024), Image.LANCZOS).save(out / 'zone3-terrain-v7-preview.webp', 'WEBP', quality=90, method=5)
    (out / 'manifest.json').write_text(json.dumps(dict(zone='west', version=8, generator='scripts/build-z3-snow.py', params=P,
                                                       fullPx=dict(w=FULL[0], h=FULL[1]), chunk=2048), indent=1))
    print('written', out)


if __name__ == '__main__':
    main()
