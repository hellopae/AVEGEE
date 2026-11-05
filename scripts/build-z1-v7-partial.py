#!/usr/bin/env python3
"""Z1-V7-PARTIAL: assemble a playable 2x ground (5 x 4 chunks of 2048 px, 9830x6554) from drawings that already exist - nothing is redrawn.

  python3 scripts/build-z1-v7-partial.py <codex-worktrees root>   (default /Users/agapae/agapae-work/.codex-worktrees)

  * 5 chunks are Codex's HD redraws:  r2-c3 (plaza-detail run 20261105T025229Z-00c52f6e),  r2-c2 + r3-c3 (20261105T035112Z-7cf015da),
    r3-c2 + r2-c4 (20261105T035132Z-46d9fa9a).  Their 2048 px files are re-encoded (quality Q_HD) to fit the size budget; no pixel is edited.
  * every other chunk = v5 (+ the old object-removal repair of r1-c3 baked in the same way town-terrain-repair.js does) enlarged 2x with Lanczos.
  * seams: where an HD chunk touches another chunk, the low-frequency colour step across the seam (strip means, smoothed along the seam) is
    split between both sides and faded out over FEATHER px, so no tone jump is left.  Painted detail is not touched.  (A true overlap blend from the
    `*-native.webp` context margins is NOT done - see the FX2 note.)
  * sprites: the tree / bed / rock / river-rail / pier / stair sprites the pilot run cut from v5 for the removed objects of those 5 chunks are copied to
    sprites/ with sprites.json (world rect, foot, layer back|sort|front) for src/town-ground-sprites.js.
  * preview 1536x1024 is the downscale of the assembled ground, so the minimap / overview match.
Output: img/map-zone1/v7-partial/{r1-c1..r7-c10.webp (1024 px tiles; the 2048 px source chunks are only the unit of the HD drawings), zone1-terrain-v7-preview.webp, sprites/, sprites.json, manifest.json}
"""
import json, shutil, sys, time
from pathlib import Path
import numpy as np
import cv2
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
CX = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('/Users/agapae/agapae-work/.codex-worktrees')
OUT = ROOT / 'img/map-zone1/v7-partial'
V5 = ROOT / 'img/map-zone1/v5'
Q_HD, Q_UP = 90, 82
FEATHER = 160
SEAM_CLIP = 14        # max colour offset (0..255) a seam correction may remove
FULL = (9830, 6554)
CH = 2048
HD = {
    (2, 3): CX / '20261105T025229Z-00c52f6e/docs/art-reviews/2026-11-05-z1-v5-plaza-detail/r2-c3-2x2.webp',
    (2, 2): CX / '20261105T035112Z-7cf015da/docs/art-reviews/2026-11-05-z1-v5-hd-full/r2-c2/r2-c2-2x.webp',
    (3, 3): CX / '20261105T035112Z-7cf015da/docs/art-reviews/2026-11-05-z1-v5-hd-full/r3-c3/r3-c3-2x.webp',
    (3, 2): CX / '20261105T035132Z-46d9fa9a/docs/art-reviews/2026-11-05-z1-v5-hd-full/r3-c2/r3-c2-2x.webp',
    (2, 4): CX / '20261105T035132Z-46d9fa9a/docs/art-reviews/2026-11-05-z1-v5-hd-full/r2-c4/r2-c4-2x.webp',
}
PILOT = CX / '20261105T020514Z-5d66c53d/docs/art-reviews/2026-11-05-z1-v5-hd'
REMOVED = {
    (2, 2): CX / '20261105T035112Z-7cf015da/docs/art-reviews/2026-11-05-z1-v5-hd-full/r2-c2/removed.json',
    (3, 3): CX / '20261105T035112Z-7cf015da/docs/art-reviews/2026-11-05-z1-v5-hd-full/r3-c3/removed.json',
    (3, 2): CX / '20261105T035132Z-46d9fa9a/docs/art-reviews/2026-11-05-z1-v5-hd-full/review-notes.json',
    (2, 4): CX / '20261105T035132Z-46d9fa9a/docs/art-reviews/2026-11-05-z1-v5-hd-full/r2-c4/removed.json',
}
for p in HD.values():
    assert p.exists(), p
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'sprites').mkdir(exist_ok=True)


def repaired_v5(r, c):
    """v5 chunk with the old patch baked in (same maths as src/town-terrain-repair.js)."""
    im = np.asarray(Image.open(V5 / f'r{r}-c{c}.webp').convert('RGB')).astype(np.float32)
    defs = {(1, 3): dict(url='r1-c3-v1.webp', border=16, fade=16, boxes=[[290, 775, 850, 1024]])}
    d = defs.get((r, c))
    if not d:
        return im
    art = np.asarray(Image.open(ROOT / 'img/map-zone1/repairs' / d['url']).convert('RGB').resize((1024, 1024), Image.BILINEAR)).astype(np.float32)
    mask = np.zeros((1024, 1024), np.float32)
    for x0, y0, x1, y1 in d['boxes']:
        w, h = x1 - x0, y1 - y0
        gx = np.clip(np.minimum(np.arange(w) / 42.0, (w - 1 - np.arange(w)) / 42.0), 0, 1)
        gy = np.clip(np.minimum(np.arange(h) / 42.0, (h - 1 - np.arange(h)) / 42.0), 0, 1)
        part = np.outer(gy, gx)
        m = mask[y0:y1, x0:x1]
        mask[y0:y1, x0:x1] = m + part * (1 - m)
    a, b = d['border'], d['border'] + d['fade']
    def ramp(n):
        x = np.arange(n, dtype=np.float32)
        return np.clip(np.minimum((x - a) / (b - a), (n - 1 - x - a) / (b - a)), 0, 1)
    mask *= np.outer(ramp(1024), ramp(1024))
    h, w = im.shape[:2]
    im[:1024, :1024] = im[:1024, :1024] * (1 - mask[..., None]) + art * mask[..., None]
    return im


t0 = time.time()
canvas = np.zeros((FULL[1], FULL[0], 3), np.uint8)
kind = {}
for r in range(1, 5):
    for c in range(1, 6):
        x0, y0 = (c - 1) * CH, (r - 1) * CH
        if (r, c) in HD:
            a = np.asarray(Image.open(HD[(r, c)]).convert('RGB'))
            assert a.shape[:2] == (CH, CH), (r, c, a.shape)
            kind[(r, c)] = 'hd'
        else:
            src = repaired_v5(r, c)
            h, w = src.shape[:2]
            a = cv2.resize(src.astype(np.uint8), (w * 2, h * 2), interpolation=cv2.INTER_LANCZOS4)
            kind[(r, c)] = 'up'
        canvas[y0:y0 + a.shape[0], x0:x0 + a.shape[1]] = a
print('assembled', FULL, round(time.time() - t0), 's')


def seam_fix(axis, pos, lo, hi):
    """axis 'v' = vertical seam at x=pos (rows lo..hi), 'h' = horizontal seam at y=pos (cols lo..hi). Returns the max |offset| applied."""
    if axis == 'h':
        view = canvas.transpose(1, 0, 2)          # same maths on a transposed view
    else:
        view = canvas
    # view[y, x]: seam at x=pos, y in [lo,hi)
    A = view[lo:hi, pos - 6:pos].astype(np.float32).mean(1)
    B = view[lo:hi, pos:pos + 6].astype(np.float32).mean(1)
    raw = ndi.gaussian_filter1d(B - A, 80, axis=0, mode='nearest')
    d = np.clip(raw, -SEAM_CLIP, SEAM_CLIP)       # a bigger step is painted content (a wall, a river), not a tone jump: leave it
    ramp = 0.5 * (1 + np.cos(np.linspace(0, np.pi, FEATHER)))       # 1 at the seam -> 0 at FEATHER
    xl, xr = max(0, pos - FEATHER), pos
    left = view[lo:hi, xl:xr].astype(np.float32)
    left += (d / 2)[:, None, :] * ramp[::-1][-(xr - xl):][None, :, None]
    view[lo:hi, xl:xr] = np.clip(left, 0, 255)
    right = view[lo:hi, pos:pos + FEATHER].astype(np.float32)
    right -= (d / 2)[:, None, :] * ramp[:right.shape[1]][None, :, None]
    view[lo:hi, pos:pos + FEATHER] = np.clip(right, 0, 255)
    return [round(float(np.median(np.abs(raw))), 1), round(float(np.abs(raw).max()), 1)]


seams = {}
for r in range(1, 5):
    for c in range(1, 6):
        if c < 5 and ('hd' in (kind[(r, c)], kind[(r, c + 1)])):
            y0 = (r - 1) * CH; y1 = min(FULL[1], y0 + CH)
            seams[f'r{r}c{c}|r{r}c{c+1}'] = seam_fix('v', c * CH, y0, y1)
        if r < 4 and ('hd' in (kind[(r, c)], kind[(r + 1, c)])):
            x0 = (c - 1) * CH; x1 = min(FULL[0], x0 + CH)
            seams[f'r{r}c{c}/r{r+1}c{c}'] = seam_fix('h', r * CH, x0, x1)
print('seams [median, max] strip step before correction (0..255):', seams)

# FX3: the ground is served as 1024 px tiles (10 x 7 = 70 files, 400 world units each), not 2048 px chunks: at phone zoom the camera sees ~600 x 1200
# world units, so 2048 px chunks kept 6-8 chunks (100-130 MB of graded canvas) alive for ~1 chunk of picture; 1024 px tiles keep 8-12 tiles (35-50 MB).
TILE = 1024
for old in OUT.glob('r*-c*.webp'):
    old.unlink()
total = 0
files = {}
for r in range(1, -(-FULL[1] // TILE) + 1):
    for c in range(1, -(-FULL[0] // TILE) + 1):
        x0, y0 = (c - 1) * TILE, (r - 1) * TILE
        part = canvas[y0:min(FULL[1], y0 + TILE), x0:min(FULL[0], x0 + TILE)]
        src_r, src_c = y0 // CH + 1, x0 // CH + 1
        f = OUT / f'r{r}-c{c}.webp'
        Image.fromarray(part).save(f, 'WEBP', quality=Q_HD if kind[(src_r, src_c)] == 'hd' else Q_UP, method=4)
        files[f.name] = f.stat().st_size
        total += f.stat().st_size
prev = cv2.resize(canvas, (1536, 1024), interpolation=cv2.INTER_AREA)
Image.fromarray(prev).save(OUT / 'zone1-terrain-v7-preview.webp', 'WEBP', quality=84, method=4)
print('chunks', round(total / 1e6, 1), 'MB | preview', round((OUT / 'zone1-terrain-v7-preview.webp').stat().st_size / 1e6, 2), 'MB')

# ---------------------------------------------------------------- sprites for the removed objects of the 5 HD chunks
sprites = json.loads((PILOT / 'sprites.json').read_text())
M = 800    # world units per chunk
def chunk_of(x, y):
    return int(y // M) + 1, int(x // M) + 1
removed_ids = set()
for k, f in REMOVED.items():
    d = json.loads(f.read_text()) if f.exists() else {}
    ids = d.get('removedObjectIds') or d.get('removedIds') or [o['id'] for o in d.get('objects', [])]
    removed_ids |= set(ids)
keep = []
for s in sprites:
    fx, fy = s['footWorld']
    rect = s['rectWorld']
    cs = {chunk_of(rect[0] + 1, rect[1] + 1), chunk_of(fx, fy), chunk_of(rect[0] + rect[2] - 1, rect[1] + rect[3] - 1)}
    if any(c in HD for c in cs):
        keep.append(s)
print('sprites kept', len(keep), 'of', len(sprites), '| ids also in removed.json:', sum(1 for s in keep if s['id'] in removed_ids))
slim = []
for s in keep:
    shutil.copyfile(PILOT / s['src'], OUT / 'sprites' / Path(s['src']).name)
    slim.append({'id': s['id'], 'src': 'sprites/' + Path(s['src']).name, 'rectWorld': [round(v, 2) for v in s['rectWorld']],
                 'footWorld': [round(v, 2) for v in s['footWorld']], 'layer': s['layer'], 'verified': bool(s.get('placementVerified'))})
(OUT / 'sprites.json').write_text(json.dumps(slim, separators=(',', ':')))
manifest = {'note': 'built by scripts/build-z1-v7-partial.py', 'tilePx': TILE, 'hdChunks': [f'r{r}-c{c}' for (r, c) in HD], 'seams': seams,
            'qualityHd': Q_HD, 'qualityUp': Q_UP, 'bytes': files, 'totalChunkBytes': total, 'sprites': [s['id'] for s in slim]}
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=1))
alls = sum(f.stat().st_size for f in OUT.rglob('*') if f.is_file())
print('folder', round(alls / 1e6, 1), 'MB', round(time.time() - t0), 's')
