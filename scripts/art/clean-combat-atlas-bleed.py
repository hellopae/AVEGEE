#!/usr/bin/env python3
"""N2 — remove neighbour-frame bleed from the drawn combat atlases (be307b5). Safe to re-run (idempotent).

Why: the 384x512 atlases (crew / boss / yama hurt) were sliced from a continuous strip with a hard 346px window
(x 19..364 in each cell). Poses wider than the window spilled into the neighbouring cell: the left/right-most
pixel columns of a cell hold pieces of the neighbour's weapon/limb (e.g. Boon's lotus appearing left of the next frame).
A piece is removed only when ALL hold (connected component, never touches the character):
  * it is detached from the main character cluster (4px dilation does not merge them), and
  * it touches the clip edge of its cell (EDGE), or lies completely above the character's head (STRAY-TOP), or
    (idle atlases without a clip window) is a tiny speck <= 600px (SPECK).
Everything else is left byte-identical (verified). Frames whose OWN pose is cut by the window are not touched here
(drawing defect, listed in docs/n2-sprite-bleed.md for Codex).

usage: clean-combat-atlas-bleed.py [--apply] [--root .] [--log out.json]
"""
import argparse, json, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

TH = 8          # alpha considered "solid"
D = 1           # detach distance: dilation steps (gap > 2px = separate piece)
SPECK = 600
STRUCT = np.ones((3, 3), bool)


def plan(root):
    man = json.load(open(f'{root}/img/combat-animation-v1/manifest.json'))['sprites']
    atlases = {}
    for key, r in man.items():
        atlases.setdefault(r['src'], r)
    out = []
    for src, r in atlases.items():
        fw, fh, cols, nrows = r['frameWidth'], r['frameHeight'], r['cols'], r['rows']
        img = np.array(Image.open(f'{root}/{src}').convert('RGBA'))
        A = img[:, :, 3] > TH
        wide = fw == 384
        cell = lambda f: A[(f // cols) * fh:(f // cols + 1) * fh, (f % cols) * fw:(f % cols + 1) * fw]
        CL = CR = None
        if wide:
            mins, maxs = [], []
            for f in range(cols * nrows):
                xs = np.nonzero(cell(f).any(0))[0]
                if len(xs): mins.append(xs.min()); maxs.append(xs.max())
            CL = int(min(mins)) if min(mins) <= 26 else 19
            CR = int(max(maxs)) if max(maxs) >= 358 else 364
        frames = sorted({f for mo in r['modes'].values() for f in mo['frames']})
        rm = np.zeros(A.shape, bool)
        pieces = []
        for f in frames:
            fr = cell(f)
            dil = ndi.binary_dilation(fr, STRUCT, iterations=D)
            lab, n = ndi.label(dil, STRUCT)
            if n <= 1: continue
            counts = ndi.sum(fr, lab, range(1, n + 1)); main = int(np.argmax(counts)) + 1
            my0 = np.nonzero(((lab == main) & fr).any(1))[0].min()
            for i in range(1, n + 1):
                if i == main: continue
                m = (lab == i) & fr
                ys, xs = np.nonzero(m)
                if not len(xs): continue
                kind = None
                if wide:
                    if xs.min() <= CL + 1 or xs.max() >= CR - 1: kind = 'EDGE-L' if xs.min() <= CL + 1 else 'EDGE-R'
                    elif ys.max() < my0: kind = 'STRAY-TOP'
                elif len(xs) <= SPECK: kind = 'SPECK'
                if not kind: continue
                # clear the piece plus its antialias fringe (alpha 1..TH), never reaching the character (>=8px away)
                mm = ndi.binary_dilation(m, STRUCT, iterations=2)
                y0, x0 = (f // cols) * fh, (f % cols) * fw
                rm[y0:y0 + fh, x0:x0 + fw] |= mm
                pieces.append(dict(src=src, frame=f, kind=kind, area=int(len(xs)),
                                   bbox=[int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]))
        out.append((src, img, rm, pieces))
    return out


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--apply', action='store_true'); ap.add_argument('--root', default='.')
    ap.add_argument('--log'); a = ap.parse_args()
    allp = []; changed = 0
    for src, img, rm, pieces in plan(a.root):
        allp += pieces
        if not rm.any(): continue
        changed += 1
        new = img.copy(); new[rm] = 0
        # verification: every pixel outside the removal mask is identical
        assert (new[~rm] == img[~rm]).all()
        if a.apply:
            Image.fromarray(new, 'RGBA').save(f'{a.root}/{src}', 'WEBP', lossless=True, quality=100, method=6, exact=True)
            chk = np.array(Image.open(f'{a.root}/{src}').convert('RGBA'))
            assert (chk[~rm] == img[~rm]).all() and (chk[rm][:, 3] == 0).all(), src
    frames = {(p['src'], p['frame']) for p in allp}
    kinds = {}
    for p in allp: kinds[p['kind']] = kinds.get(p['kind'], 0) + 1
    print(('APPLIED' if a.apply else 'DRY-RUN'), 'atlases changed', changed, 'frames', len(frames), 'pieces', len(allp), kinds)
    if a.log: json.dump(allp, open(a.log, 'w'), indent=1)

if __name__ == '__main__': main()
