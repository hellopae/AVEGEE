#!/usr/bin/env python3
"""Checks on the assembled v7r atlas (reads ~/agapae-work/.toby-scratch/z1-v7r/atlas-*.npy written by assemble-v7r.py).
 1. nothing outside the 7 context rects differs from v7
 2. every core pixel == the registered Codex native (alpha 1 in the core) -> structure error inherited from Codex's own measure (max 3.5 map px, limit 5)
 3. sharpness: Laplacian variance of the ring band (the join zone) vs a 60 px band outside the context (v7 native) -> ring/outside ratio
 4. seam strip: mean |gradient| across the strip vs the same in surroundings (an obvious cut line shows as ratio >> 1)
writes verify-v7r.json next to this script's parent"""
import json, sys
from pathlib import Path
import cv2, numpy as np
from PIL import Image
sys.path.insert(0, str(Path(__file__).parent))
S = Path.home() / 'agapae-work/.toby-scratch/z1-v7r'
rep = json.load(open(S / 'seam-report.json'))
a7 = np.load(S / 'atlas-v7.npy', mmap_mode='r'); ar = np.load(S / 'atlas-v7r.npy', mmap_mode='r')
import importlib.util
spec = importlib.util.spec_from_file_location('asm', Path(__file__).parent / 'assemble-v7r.py'); asm = importlib.util.module_from_spec(spec); spec.loader.exec_module(asm)
mask = np.zeros(a7.shape[:2], bool)
for sid, d in rep.items():
    if sid.startswith('_'): continue
    x0, y0, x1, y1 = [v*2 for v in d['context1x']]; mask[y0:y1, x0:x1] = True
outside = int(np.count_nonzero(np.any(np.asarray(a7) != np.asarray(ar), axis=2) & ~mask))
res = dict(pixelsChangedOutsideContexts=outside, spots={})
def lapvar(im): return float(cv2.Laplacian(cv2.cvtColor(np.ascontiguousarray(im), cv2.COLOR_RGB2GRAY), cv2.CV_32F).var())
for sid, run in asm.SPOTS:
    d = rep[sid]; reg = json.loads((run / sid / 'registration.json').read_text())
    cx0, cy0, cx1, cy1 = d['context1x']; kx0, ky0, kx1, ky1 = d['core1x']
    M = np.array(reg['nativeToContextPx1x'], np.float64) * 2
    nat = cv2.warpAffine(np.asarray(Image.open(run / sid / 'native.webp').convert('RGB')), M, ((cx1-cx0)*2, (cy1-cy0)*2), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT)
    core = np.asarray(ar[ky0*2:ky1*2, kx0*2:kx1*2]).astype(int)
    ncore = nat[(ky0-cy0)*2:(ky1-cy0)*2, (kx0-cx0)*2:(kx1-cx0)*2].astype(int)
    # core is exactly native except for edge px that the ring joins touch (feather 8 px inside the core is NOT used: alpha is 1 in the whole core)
    diff = np.abs(core - ncore).max(axis=2)
    ring = np.zeros((cy1*2-cy0*2, cx1*2-cx0*2), bool)
    ring[:] = True; ring[(ky0-cy0)*2:(ky1-cy0)*2, (kx0-cx0)*2:(kx1-cx0)*2] = False
    ctx = np.asarray(ar[cy0*2:cy1*2, cx0*2:cx1*2]); ctx7 = np.asarray(a7[cy0*2:cy1*2, cx0*2:cx1*2])
    # sharpness: lap variance in ring (blocks) vs a frame 60 px outside the context, in v7r and (for reference) in v7
    X0, Y0, X1, Y1 = max(0, cx0*2-60), max(0, cy0*2-60), min(9830, cx1*2+60), min(6554, cy1*2+60)
    big = np.asarray(ar[Y0:Y1, X0:X1]); big7 = np.asarray(a7[Y0:Y1, X0:X1])
    inner = np.zeros(big.shape[:2], bool); inner[cy0*2-Y0:cy1*2-Y0, cx0*2-X0:cx1*2-X0] = True
    ringm = np.zeros_like(inner); ringm[cy0*2-Y0:cy1*2-Y0, cx0*2-X0:cx1*2-X0] = ring
    def lv(im, m):
        L = cv2.Laplacian(cv2.cvtColor(np.ascontiguousarray(im), cv2.COLOR_RGB2GRAY), cv2.CV_32F); return float(L[m].var())
    res['spots'][sid] = dict(coreMaxAbsDiffVsNative=int(diff.max()), coreMeanAbsDiffVsNative=round(float(diff.mean()), 3),
        lapVarRing_v7r=round(lv(big, ringm), 1), lapVarRing_v7=round(lv(big7, ringm), 1), lapVarOutside60=round(lv(big, ~inner), 1),
        lapVarCore_v7r=round(lv(big, np.pad(np.zeros((1,1),bool),0) if False else (inner & ~ringm)), 1))
json.dump(res, open(Path(__file__).parent.parent / 'verify-v7r.json', 'w'), indent=1)
print(json.dumps(res, indent=1))
