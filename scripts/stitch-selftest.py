#!/usr/bin/env python3
"""M2 self-test of the quadrant stitcher against Zone 1: cut the real Zone 1 ground into four quadrants, stitch them
back, compare with the original chunks / preview.   python3 scripts/stitch-selftest.py [--tmp DIR] [--json FILE]
 A) native-resolution quadrants (2765x1843 ...)  -> must reproduce the sheet (differences = webp only)
 B) quadrants downscaled to 1536x1024 (what the painter delivers) -> the real-world loss from the ~1.8x upscale
"""
import argparse, json, os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import town_terrain_lib as T
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser(); ap.add_argument('--tmp'); ap.add_argument('--json'); a = ap.parse_args()
tmp = a.tmp or tempfile.mkdtemp(prefix='stitch-selftest-')
Z1 = os.path.join(ROOT, 'img/map-zone1/v5')
orig = T.load_sheet_from_chunks(Z1)
def psnr(x, y):
    m = np.mean((x.astype(np.float64) - y.astype(np.float64)) ** 2)
    return 99.0 if m == 0 else round(10 * np.log10(255 ** 2 / m), 2)
def mae(x, y): return round(float(np.mean(np.abs(x.astype(np.int16) - y.astype(np.int16)))), 3)
res = {}
for label, native in (('A_native', True), ('B_1536x1024', False)):
    quads = {}
    for n in T.QUADS:
        x0, y0, x1, y1 = T.final_box(n)
        im = Image.fromarray(orig[y0:y1, x0:x1])
        quads[n] = im if native else im.resize((1536, 1024), Image.LANCZOS)
    sheet = T.stitch(quads)
    out = os.path.join(tmp, label); T.write_chunks(sheet, out); T.write_preview(sheet, os.path.join(out, 'preview.webp'))
    # compare chunk files (decoded) with the Zone 1 chunk files (decoded)
    per = []
    for r, c, box in T.chunk_boxes():
        o = np.asarray(Image.open(os.path.join(Z1, f'r{r}-c{c}.webp')).convert('RGB')); n = np.asarray(Image.open(os.path.join(out, f'r{r}-c{c}.webp')).convert('RGB'))
        per.append({'chunk': f'r{r}-c{c}', 'psnr': psnr(o, n), 'mae': mae(o, n)})
    # overlap strips (where two or four quadrants were cross-faded)
    ox0, ox1 = T.final_box('ne')[0], T.final_box('nw')[2]; oy0, oy1 = T.final_box('sw')[1], T.final_box('nw')[3]
    strip_x = (psnr(orig[:, ox0:ox1], sheet[:, ox0:ox1]), mae(orig[:, ox0:ox1], sheet[:, ox0:ox1]))
    strip_y = (psnr(orig[oy0:oy1], sheet[oy0:oy1]), mae(orig[oy0:oy1], sheet[oy0:oy1]))
    pv_o = np.asarray(Image.open(os.path.join(Z1, 'zone1-terrain-v5-preview.webp')).convert('RGB')); pv_n = np.asarray(Image.open(os.path.join(out, 'preview.webp')).convert('RGB'))
    res[label] = {'sheet_psnr': psnr(orig, sheet), 'sheet_mae': mae(orig, sheet), 'chunk_psnr_min': min(p['psnr'] for p in per), 'chunk_psnr_mean': round(float(np.mean([p['psnr'] for p in per])), 2),
                  'chunk_mae_max': max(p['mae'] for p in per), 'overlap_x(psnr,mae)': strip_x, 'overlap_y(psnr,mae)': strip_y,
                  'preview_psnr_vs_zone1_preview': psnr(pv_o, pv_n), 'preview_mae': mae(pv_o, pv_n), 'dir': out}
    # worst chunk, for the report
    res[label]['worst_chunk'] = min(per, key=lambda p: p['psnr'])
print(json.dumps(res, indent=1, default=list))
if a.json: json.dump(res, open(a.json, 'w'), indent=1, default=list)
