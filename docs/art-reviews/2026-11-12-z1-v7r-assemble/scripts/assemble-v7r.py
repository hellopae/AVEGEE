#!/usr/bin/env python3
"""Z1 v7r: put Codex's 7 native repairs onto the v7 2x ground and join them to the native surroundings.

No drawing, no ImageGen. Every pixel comes from the v7 pack or from a Codex native (warped by its registration affine, Lanczos4).
Join = the same min-cost seam solver as Codex's assemble.py (restore_structure idea, reversed: the native repair is the "inside", v7 is the "outside"),
colour matched ONLY inside the 48 map px ring (tapered to zero at the core edge), feather +-8 output px.

  python3 assemble-v7r.py [--only id,id] [--bridge-top v7|native]   -> <out>/v7r/r*-c*.webp (20 chunks, untouched chunks copied byte for byte) + seam-report.json
"""
import argparse, json, re, shutil, sys
from pathlib import Path
import cv2, numpy as np
from PIL import Image

CW = Path('/Users/agapae/agapae-work/.codex-worktrees')
V7 = CW / '20261110T115811Z-6ad6e037/docs/art-reviews/2026-11-05-z1-v5-hd-assemble/v7'
R1 = CW / '.codex-worktrees/20261111T214451Z-8741fd14/docs/art-reviews/2026-11-11-z1-v7-native-repairs'
R2 = CW / '.codex-worktrees/20261111T212700Z-98218760/docs/art-reviews/2026-11-11-z1-v7-native-repairs'
FULL = (9830, 6554); CH = 2048
ROOT = Path(__file__).resolve().parents[4]   # the game worktree (v5 tiles + town-terrain-repair.js are the same files Codex's baseline used, hashes checked)
SPOTS = [  # id, run dir
    ('forest-r4-c1-q12', R1), ('heaven-bridge', R1), ('lava-north-stair', R1), ('lava-mid-stairs', R1),
    ('lava-low-stair', R2), ('south-plaza-stair', R2), ('pier-stair', R2)]
cv2.setNumThreads(2)

def smooth(t):
    t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)

def baseline():
    """v5 + baked runtime repairs at 1x - EXACTLY Codex assemble.py baseline(); v7's fallback pixels are Lanczos-2x of this."""
    im = Image.new('RGB', (4915, 3277))
    for r in range(1, 5):
        for c in range(1, 6):
            im.paste(Image.open(ROOT/f'img/map-zone1/v5/r{r}-c{c}.webp'), ((c-1)*1024, (r-1)*1024))
    source = (ROOT/'src/town-terrain-repair.js').read_text()
    for row, col, url, border, fade, boxes in re.findall(
        r"row:(\d+),col:(\d+),url:'([^']+)',border:(\d+),fade:(\d+),boxes:(\[\[.*?\]\])", source):
        x, y = (int(col)-1)*1024, (int(row)-1)*1024
        old = np.array(im.crop((x, y, x+1024, y+1024)), dtype=np.float32)
        art = np.array(Image.open(ROOT/url).convert('RGB').resize((1024, 1024), Image.Resampling.LANCZOS), dtype=np.float32)
        xx, yy = np.meshgrid(np.arange(1024)+.5, np.arange(1024)+.5)
        alpha = np.zeros((1024, 1024), np.float32)
        for x0, y0, x1, y1 in json.loads(boxes):
            a = np.clip(np.minimum(xx-x0, x1-xx)/42, 0, 1)*np.clip(np.minimum(yy-y0, y1-yy)/42, 0, 1)
            alpha = 1-(1-alpha)*(1-a)
        b, f = int(border), int(fade)
        alpha *= np.clip((np.minimum(xx, 1024-xx)-b)/f, 0, 1)
        alpha *= np.clip((np.minimum(yy, 1024-yy)-b)/f, 0, 1)
        im.paste(Image.fromarray(np.uint8(np.rint(old*(1-alpha[..., None])+art*alpha[..., None]))), (x, y))
    return im

def load_atlas():
    a = np.zeros((FULL[1], FULL[0], 3), np.uint8)
    for r in range(1, 5):
        for c in range(1, 6):
            im = np.asarray(Image.open(V7 / f'r{r}-c{c}.webp').convert('RGB'))
            a[(r-1)*CH:(r-1)*CH+im.shape[0], (c-1)*CH:(c-1)*CH+im.shape[1]] = im
    return a

def rect(d, key):
    """-> x0,y0,x1,y1 (1x map px) from either registration schema"""
    if key == 'core':
        v = d.get('coreRectPx1x') or d['corePx1x']
    else:
        v = d.get('contextRectPx1x') or d['contextPx1x']
    if 'coreRectPx1x' in d or 'contextRectPx1x' in d:
        return list(v)                      # [x0,y0,x1,y1]
    return [v[0], v[1], v[0]+v[2], v[1]+v[3]]  # [x,y,w,h]

def band_path(cur, nat, offset, fb=None):
    """min-cost path (rows) through a 96 px overlap band between current v7 (left of band) and native (right) - Codex seam() cost."""
    a = cur[:, offset:offset+96].astype(np.float32); b = nat[:, offset:offset+96].astype(np.float32)
    cost = cv2.GaussianBlur(np.mean((a - b) ** 2, axis=2), (5, 5), 0)
    if fb is not None:   # never cut where v7 is still the blurry v5 fallback: native must cover it
        cost = cost + 3000.0 * fb[:, offset:offset+96]
    cost[:, :10] = np.inf; cost[:, -10:] = np.inf
    h, w = cost.shape
    dp, back = cost.copy(), np.zeros((h, w), np.int8)
    for y in range(1, h):
        p = np.pad(dp[y-1], (1, 1), constant_values=np.inf)
        ch = np.stack([p[:w], p[1:w+1], p[2:]]); k = np.argmin(ch, axis=0)
        back[y] = k - 1; dp[y] += ch[k, np.arange(w)]
    path = np.empty(h, np.int32); path[-1] = np.argmin(dp[-1])
    for y in range(h-1, 0, -1):
        path[y-1] = path[y] + back[y, path[y]]
    return path + offset, float(np.min(dp[-1]) / h)

def join_spot(atlas, sid, run, report, base2x, bridge_top='native'):
    reg = json.loads((run / sid / 'registration.json').read_text())
    cx0, cy0, cx1, cy1 = rect(reg, 'context'); kx0, ky0, kx1, ky1 = rect(reg, 'core')
    W, H = (cx1-cx0)*2, (cy1-cy0)*2
    M = np.array(reg['nativeToContextPx1x'], np.float64) * 2
    nat_rgb = np.asarray(Image.open(run / sid / 'native.webp').convert('RGB'))
    nat = cv2.warpAffine(nat_rgb, M, (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT)
    valid = cv2.warpAffine(np.full(nat_rgb.shape[:2], 255, np.uint8), M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    reg2x = np.asarray(Image.open(run / sid / 'registered-2x.webp').convert('RGB'))
    reg_diff = float(np.mean(np.abs(nat.astype(np.float32) - reg2x.astype(np.float32)))) if reg2x.shape == nat.shape else None
    cur = atlas[cy0*2:cy1*2, cx0*2:cx1*2].copy()
    # how much of v7 here is still the v5 fallback (0 = native exterior, 1 = fallback)
    ref = base2x(cx0, cy0, cx1, cy1)
    D = cv2.GaussianBlur(np.mean(np.abs(cur.astype(np.float32) - ref.astype(np.float32)), axis=2), (0, 0), 2.5)
    fb = np.clip(1 - (D - 2.0) / 5.0, 0, 1).astype(np.float32)
    # core box in crop coords (output px); sides where core touches the context edge (map border) have no ring
    k = [(kx0-cx0)*2, (ky0-cy0)*2, (kx1-cx0)*2, (ky1-cy0)*2]
    alpha = np.ones((H, W), np.float32)       # 1 = native repair
    sides = {}
    for side in ['left', 'right', 'top', 'bottom']:
        edge_gap = {'left': k[0], 'top': k[1], 'right': W-k[2], 'bottom': H-k[3]}[side]
        if edge_gap < 96:
            sides[side] = 'no ring (map edge)'; continue
        if side == 'top' and sid == 'heaven-bridge' and bridge_top == 'v7':
            sides[side] = 'native top band kept from v7 (see README)'; continue
        a, b, f = cur, nat, fb
        if side in ('top', 'bottom'):
            a, b, f = a.transpose(1, 0, 2), b.transpose(1, 0, 2), f.T
        offset = 0 if side in ('left', 'top') else a.shape[1] - 96
        path, c = band_path(a, b, offset, f)
        t = smooth((np.arange(a.shape[1])[None, :] - path[:, None] + 8) / 16)
        if side in ('right', 'bottom'): t = 1 - t
        if side in ('top', 'bottom'): t = t.T
        alpha *= t; sides[side] = dict(meanCost=round(c, 1))
    # no native pixel where the warp has no data (rim): fade out in the last 2 px
    alpha *= smooth((cv2.erode((valid > 250).astype(np.uint8), np.ones((5, 5), np.uint8)).astype(np.float32) * 1.0))
    # colour match, ring only: low-frequency (v7 - native) measured where the seam sits, tapered to 0 at the core edge
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    dcore = np.maximum.reduce([k[0]-xx, xx-k[2], k[1]-yy, yy-k[3], np.zeros_like(xx)])   # distance outside the core box
    ring = (dcore > 0).astype(np.float32)
    w_meas = ring * np.exp(-((alpha - .5) ** 2) / .08)                                    # weight near the seam (alpha~.5)
    diff = (cur.astype(np.float32) - nat.astype(np.float32))
    num = cv2.GaussianBlur(diff * w_meas[..., None], (0, 0), 14); den = cv2.GaussianBlur(w_meas, (0, 0), 14)[..., None] + 1e-4
    delta = np.clip(num / den, -10, 10)
    taper = smooth(dcore / 56.0)[..., None]
    nat_c = np.clip(nat.astype(np.float32) + delta * taper, 0, 255)
    out = np.rint(cur.astype(np.float32) * (1 - alpha[..., None]) + nat_c * alpha[..., None])
    out = np.clip(out, 0, 255).astype(np.uint8)
    changed = int(np.count_nonzero(np.any(out != cur, axis=2)))
    atlas[cy0*2:cy1*2, cx0*2:cx1*2] = out
    report[sid] = dict(context1x=[cx0, cy0, cx1, cy1], core1x=[kx0, ky0, kx1, ky1], sides=sides,
        registered2xMeanAbsDiffVsCodexExport=reg_diff, colourDeltaAbsMax=float(np.abs(delta).max()),
        changedPx2x=changed, fallbackFractionOfContextInV7=round(float(fb.mean()), 3))
    np.save(Path(sys.argv[0]).parent / '.fb-%s.npy' % sid, fb) if False else None
    return cur, nat, alpha

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=str(Path.home() / 'agapae-work/.toby-scratch/z1-v7r'))
    ap.add_argument('--only', default=None)
    ap.add_argument('--bridge-top', default='native', choices=['native', 'v7'])
    a = ap.parse_args()
    out = Path(a.out); (out / 'v7r').mkdir(parents=True, exist_ok=True); (out / 'before').mkdir(exist_ok=True)
    atlas = load_atlas(); before = atlas.copy(); report = {}
    _base = baseline()
    def base2x(x0, y0, x1, y1):
        return np.array(_base.crop((x0, y0, x1, y1)).resize(((x1-x0)*2, (y1-y0)*2), Image.Resampling.LANCZOS))
    only = set(a.only.split(',')) if a.only else None
    for sid, run in SPOTS:
        if only and sid not in only: continue
        join_spot(atlas, sid, run, report, base2x, a.bridge_top); print('joined', sid, flush=True)
    changed = np.any(atlas != before, axis=2)
    rows, cols = np.where(changed.any(axis=1))[0], np.where(changed.any(axis=0))[0]
    for r in range(1, 5):
        for c in range(1, 6):
            x, y = (c-1)*CH, (r-1)*CH; w, h = min(CH, FULL[0]-x), min(CH, FULL[1]-y)
            f = f'r{r}-c{c}.webp'
            if changed[y:y+h, x:x+w].any():
                Image.fromarray(atlas[y:y+h, x:x+w]).save(out / 'v7r' / f, 'WEBP', quality=90, method=6); report.setdefault('_chunksRewritten', []).append(f)
            else:
                shutil.copyfile(V7 / f, out / 'v7r' / f)
    shutil.copyfile(V7 / 'zone1-terrain-v7-preview.webp', out / 'v7r' / 'zone1-terrain-v7-preview.webp')
    Image.fromarray(atlas).resize((1536, 1024), Image.Resampling.LANCZOS).save(out / 'v7r' / 'zone1-terrain-v7-preview.webp', quality=90, method=6)
    m = json.loads((V7 / 'manifest.json').read_text())
    m.update(version='7r', fallbackParts=[], fallbackPatches=[], imageGenCalls=0, note='v7 + Codex native repairs of the 7 fallback spots, joined by scripts/assemble-v7r.py (docs/art-reviews/2026-11-12-z1-v7r-assemble)',
             repairedSpots=[s for s, _ in SPOTS if not only or s in only], chunksRewritten=report.get('_chunksRewritten'))
    (out / 'v7r' / 'manifest.json').write_text(json.dumps(m, indent=1))
    np.save(out / 'atlas-v7r.npy', atlas); np.save(out / 'atlas-v7.npy', before)
    (out / 'seam-report.json').write_text(json.dumps(report, indent=1))
    print(json.dumps(report, indent=1))
