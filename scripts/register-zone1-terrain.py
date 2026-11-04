"""Z1-LAYOUT-A step 3: register Codex's terrain-seamless atlas (2300x1618 world) into ok.jpg space (2500x1758).
SIFT feature match between the terrain composite and ok.jpg (object areas masked out), RANSAC similarity,
least-squares refit on inliers.  Writes terrain-registration.json.  Terrain files are read-only here."""
import json, sys
from pathlib import Path
import numpy as np, cv2
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parent))
from z1_layout_common import warp_sprite, OKW, OKH
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/art-reviews/2026-11-05-zone1-layout'
T = Path('/Users/agapae/Documents/Work PAE/Claude/AVEGEE/layered-map-work/docs/art-reviews/2026-11-04-terrain-seamless')
OK = Path('/Users/agapae/Documents/Work PAE/Claude/AVEGEE-reference/files/UI New map/New-Map-Zone1-ok.jpg')


def main():
    ok = cv2.cvtColor(np.array(Image.open(OK).convert('RGB')), cv2.COLOR_RGB2GRAY)
    comp = cv2.cvtColor(np.array(Image.open(T / 'zone1-terrain-composite.png').convert('RGB')), cv2.COLOR_RGB2GRAY)
    doc = json.loads((OUT / 'layout.json').read_text()); mask = np.zeros(ok.shape, np.uint8)
    for o in doc['objects']:
        spr = np.array(Image.open(OUT / doc['sprites'][o['sprite']]['file']).convert('RGBA'))
        lay, bb = warp_sprite(spr, np.array(o['matrix']).reshape(2, 3))
        if lay is not None:
            x0, y0, x1, y1 = bb; mask[y0:y1, x0:x1] |= (lay[..., 3] > 10).astype(np.uint8) * 255
    mask = cv2.dilate(mask, np.ones((9, 9), np.uint8))
    sift = cv2.SIFT_create(12000)
    kpa, da = sift.detectAndCompute(comp, None); kpb, db = sift.detectAndCompute(ok, cv2.bitwise_not(mask))
    m = cv2.BFMatcher().knnMatch(da, db, k=2); good = [a for a, b in m if a.distance < 0.8 * b.distance]
    A = np.float32([kpa[g.queryIdx].pt for g in good]); B = np.float32([kpb[g.trainIdx].pt for g in good])
    M, inl = cv2.estimateAffinePartial2D(A, B, ransacReprojThreshold=3, maxIters=10000)
    for _ in range(2):   # refit on inliers
        r = np.hypot(*(cv2.transform(A[None], M)[0] - B).T); keep = r < 2.0
        M, _ = cv2.estimateAffinePartial2D(A[keep], B[keep], method=cv2.LMEDS)
    r = np.hypot(*(cv2.transform(A[None], M)[0] - B).T); ins = r < 3
    gx = np.clip((B[:, 0] // (OKW / 3)).astype(int), 0, 2); gy = np.clip((B[:, 1] // (OKH / 3)).astype(int), 0, 2)
    grid = [[dict(inliers=int(((gx == x) & (gy == y) & ins).sum()),
                  medianResidualPx=round(float(np.median(r[(gx == x) & (gy == y) & ins])), 2) if ((gx == x) & (gy == y) & ins).sum() else None)
             for x in range(3)] for y in range(3)]
    s = float(np.hypot(M[0, 0], M[1, 0]))
    reg = dict(world=[2300, 1618], target=[OKW, OKH], method='SIFT + RANSAC similarity on zone1-terrain-composite.png vs ok.jpg (object areas masked)',
               matrix=[round(float(v), 6) for v in M.ravel()], scale=round(s, 6), rotationDeg=round(float(np.degrees(np.arctan2(M[1, 0], M[0, 0]))), 4),
               expectedScale=round(OKW / 2300, 6), matches=len(good), inliers=int(ins.sum()),
               residualPx=dict(mean=round(float(r[ins].mean()), 2), median=round(float(np.median(r[ins])), 2), p95=round(float(np.percentile(r[ins], 95)), 2), max=round(float(r[ins].max()), 2)),
               gridRowsTopToBottomColsLeftToRight=grid,
               layers=dict(note='all Codex layers share the 2300x1618 world; place with this matrix after their own rect',
                           sky=dict(rect=[0, 0, 2300, 1294]), mountains=dict(rect=[-70, 20, 2440, 813]),
                           river=dict(rect=[0, 820, 2300, 798]), lava=dict(rect=[0, 340, 600, 810]), waterfall=dict(rect=[1710, 190, 590, 940]),
                           terrainTiles='terrain-webp/manifest.json (rect = world px, gutter 2)'))
    (OUT / 'terrain-registration.json').write_text(json.dumps(reg, indent=1)); print(json.dumps({k: reg[k] for k in ('matrix', 'scale', 'rotationDeg', 'inliers', 'residualPx')}))


if __name__ == '__main__':
    main()
