#!/usr/bin/env python3
"""Register the Codex cook / carry delivery (2026-11-10-worker-cook) onto the game's worker frame grid.

  python3 -I scripts/build-worker-cook.py <delivery-dir> [--preview <dir>]

<delivery-dir> is read-only (the Codex hand-off folder with worker-<zone>-cook-v1.webp + worker-th-carry-v1.webp, 320 px cells, 8 columns).
Nothing is redrawn, stretched or recoloured: every cell is moved by a whole number of pixels, nothing else.
  * every row is shifted left/right by ONE constant per row so the sole midpoint lands on x=160 (the cell centre the renderer draws at); the head stays
    pixel-identical from frame to frame (Codex pasted one head over all frames), so a per-frame shift would only make it wobble
  * the vertical position is untouched (cook feet already sit on the same baseline as the shipped idle row: th/asia/west y319, cyberhell y314)
  * FRAME_ORDER lists which source frame each of the 8 output slots shows; a repeated number holds a pose (used where a source frame breaks the loop)
  * carry rows get a render-time scale (not a resample): standing height of the zone's shipped walk rows / the row's own height, like WORKER_FIT_*
Writes img/workers/worker-<zone>-cook-v1.webp (2560x640: row 0 faces right, row 1 faces left), worker-th-carry-v1.webp (2560x1280: side, side-left, down, up)
and the matching .json (enabled, frames, frameMs, rows with dx/scale that were applied)."""
import json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'img', 'workers')
CELL, COLS, FOOT_X = 320, 8, 160
ZONES = ('th', 'asia', 'west', 'cyberhell')
STAND_H = 308            # alpha height of a standing worker in the shipped v1 sheets (see WORKER_FIT_* in src/workers.js)
FRAME_MS = 125           # 8 fps like the Codex preview
# source frame (0-based) shown in each of the 8 output slots; zone -> row -> order
# th row 1 (faces left): source frame 7 draws the belt pouch on the other hip than the 7 other frames, so the pose of frame 6 is held for that slot
FRAME_ORDER = {'th': {1: [0, 1, 2, 3, 4, 5, 5, 7]}}


def sole_mid(a):
    ys = np.where(a.any(1))[0]; b = ys.max(); xs = np.where(a[b - 10:b + 1].any(0))[0]
    return (xs.min() + xs.max()) / 2


def shift_cell(cell, dx):
    out = np.zeros_like(cell)
    w = cell.shape[1]
    if dx >= 0: out[:, dx:] = cell[:, :w - dx]
    else: out[:, :w + dx] = cell[:, -dx:]
    return out


def build_sheet(src, rows, order_for):
    im = np.array(Image.open(src).convert('RGBA'))
    assert im.shape[1] == CELL * COLS and im.shape[0] == CELL * rows, (src, im.shape)
    out = np.zeros_like(im); meta = []
    for r in range(rows):
        cells = [im[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL] for c in range(COLS)]
        order = order_for(r)
        mids = [sole_mid(cells[c][:, :, 3] > 40) for c in range(COLS)]
        med = float(np.median(mids))
        dx = int(round(FOOT_X - med))
        heights = []
        for slot, c in enumerate(order):
            moved = shift_cell(cells[c], dx)
            ys = np.where(moved[:, :, 3] > 40)[0]; heights.append(int(ys.max() - ys.min() + 1))
            cut = cells[c][:, CELL - dx:, 3] if dx > 0 else cells[c][:, :-dx, 3] if dx < 0 else cells[c][:, :0, 3]
            assert not (cut > 0).any(), 'shift would clip'
            out[r * CELL:(r + 1) * CELL, slot * CELL:(slot + 1) * CELL] = moved
        meta.append({'dx': dx, 'soleMid': round(med, 1), 'order': [c + 1 for c in order], 'meanHeight': round(float(np.mean(heights)), 1)})
    return out, meta


def main():
    src = sys.argv[1]
    prev = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None
    default = lambda r: list(range(COLS))
    for z in ZONES:
        order_for = lambda r, z=z: FRAME_ORDER.get(z, {}).get(r) or default(r)
        out, meta = build_sheet(os.path.join(src, f'worker-{z}-cook-v1.webp'), 2, order_for)
        Image.fromarray(out).save(os.path.join(OUT, f'worker-{z}-cook-v1.webp'), lossless=True, quality=100, method=6, exact=True)
        rows = [{'dir': d, 'row': i, 'dx': m['dx'], 'order': m['order']} for i, (d, m) in enumerate(zip(('right', 'left'), meta))]
        json.dump({'enabled': True, 'image': f'worker-{z}-cook-v1.webp', 'frames': COLS, 'frameMs': FRAME_MS, 'cell': CELL, 'foot': [FOOT_X, CELL],
                   'layout': 'row 0 faces right, row 1 faces left; 8 frames per row; sole midpoint registered to x=160; height = shipped standing height',
                   'rows': rows, 'source': 'Codex 20261111T170902Z-d171c309 (docs/art-reviews/2026-11-10-worker-cook), registered by scripts/build-worker-cook.py',
                   'fallback': 'worker sheet build row'}, open(os.path.join(OUT, f'worker-{z}-cook-v1.json'), 'w'), indent=1)
        print(z, [(m['dx'], m['soleMid'], m['meanHeight']) for m in meta])
        if prev: Image.fromarray(out).save(os.path.join(prev, f'cook-{z}.png'))
    names = ('side', 'side-left', 'down', 'up')
    order_for = lambda r: FRAME_ORDER.get('carry', {}).get(r) or default(r)
    out, meta = build_sheet(os.path.join(src, 'worker-th-carry-v1.webp'), 4, order_for)
    rows = []
    for i, (n, m) in enumerate(zip(names, meta)):
        rows.append({'dir': n, 'row': i, 'dx': m['dx'], 'scale': round(STAND_H / m['meanHeight'], 3), 'order': m['order']})
    Image.fromarray(out).save(os.path.join(OUT, 'worker-th-carry-v1.webp'), lossless=True, quality=100, method=6, exact=True)
    json.dump({'enabled': True, 'image': 'worker-th-carry-v1.webp', 'frames': COLS, 'frameMs': FRAME_MS, 'cell': CELL, 'foot': [FOOT_X, CELL],
               'layout': 'rows side (faces right), side-left, down, up; 8 frames per row; sole midpoint registered to x=160; scale about the foot baseline = render-time fit',
               'rows': rows, 'source': 'Codex 20261111T170902Z-d171c309 (docs/art-reviews/2026-11-10-worker-cook), registered by scripts/build-worker-cook.py'},
              open(os.path.join(OUT, 'worker-th-carry-v1.json'), 'w'), indent=1)
    print('carry', [(m['dx'], m['soleMid'], m['meanHeight'], r['scale']) for m, r in zip(meta, rows)])
    if prev: Image.fromarray(out).save(os.path.join(prev, 'carry-th.png'))


if __name__ == '__main__':
    main()
