"""Shared geometry + image code for the painted-town ground (M2): quadrants -> one sheet -> 1024 px chunks + preview.

Zone 1's ground is 4915x3277 px for the 3840x2560 world (1.28 px per unit), cut into 20 webp chunks of 1024 px
(r{row}-c{col}.webp, last column 819 px, last row 205 px) plus a 1536x1024 preview (2.5 world units per px).
A new zone's ground is painted as four 3:2 quadrants that overlap, in PREVIEW pixels (1536x1024):
    NW (0,0)-(864,576)     NE (672,0)-(1536,576)     SW (0,448)-(864,1024)     SE (672,448)-(1536,1024)
Left-right overlap 192 preview px, top-bottom overlap 128 preview px (Mind, M1 spec 3.1; the brief's "192 all round" was wrong).
Each quadrant is resized to its box on the final sheet and the overlaps are cross-faded with a smoothstep ramp
(weights of the layers sum to 1 everywhere, so a seam never changes brightness).
"""
import numpy as np
from PIL import Image

FULL = (4915, 3277)           # final sheet, px
PREVIEW = (1536, 1024)
CHUNK = 1024
# box in preview px: x0, y0, x1, y1
QUADS = {'nw': (0, 0, 864, 576), 'ne': (672, 0, 1536, 576), 'sw': (0, 448, 864, 1024), 'se': (672, 448, 1536, 1024)}
ZONES = {'asia': ('map-zone2', 'zone2'), 'west': ('map-zone3', 'zone3'), 'cyberhell': ('map-zone4', 'zone4')}


def final_box(name):
    """Pixel box of a quadrant on the final sheet (ints; overlaps are shared pixels)."""
    x0, y0, x1, y1 = QUADS[name]
    sx, sy = FULL[0] / PREVIEW[0], FULL[1] / PREVIEW[1]
    return (round(x0 * sx), round(y0 * sy), min(FULL[0], round(x1 * sx)), min(FULL[1], round(y1 * sy)))


def _smooth(t):
    t = np.clip(t, 0.0, 1.0)
    return t * t * (3 - 2 * t)


def weights(name):
    """Per-pixel weight (h, w) of one quadrant on its own box."""
    x0, y0, x1, y1 = final_box(name)
    w, h = x1 - x0, y1 - y0
    # overlap strips on the final sheet: x between NE.x0 and NW.x1, y between SW.y0 and NW.y1
    ox0, ox1 = final_box('ne')[0], final_box('nw')[2]
    oy0, oy1 = final_box('sw')[1], final_box('nw')[3]
    xs = (np.arange(w) + x0 + .5)
    ys = (np.arange(h) + y0 + .5)
    fx = np.ones(w, np.float32); fy = np.ones(h, np.float32)
    if name in ('ne', 'se'):                      # has a left neighbour: fade in across the overlap
        fx = _smooth((xs - ox0) / (ox1 - ox0)).astype(np.float32)
    else:                                         # has a right neighbour: fade out
        fx = (1 - _smooth((xs - ox0) / (ox1 - ox0))).astype(np.float32)
    if name in ('sw', 'se'):
        fy = _smooth((ys - oy0) / (oy1 - oy0)).astype(np.float32)
    else:
        fy = (1 - _smooth((ys - oy0) / (oy1 - oy0))).astype(np.float32)
    return fy[:, None] * fx[None, :]


def stitch(quads):
    """quads: {'nw': PIL.Image, ...} (RGB). Returns the final sheet as a uint8 array (h, w, 3)."""
    acc = np.zeros((FULL[1], FULL[0], 3), np.float32)
    for name in QUADS:
        x0, y0, x1, y1 = final_box(name)
        im = quads[name].convert('RGB')
        if im.size != (x1 - x0, y1 - y0):
            im = im.resize((x1 - x0, y1 - y0), Image.LANCZOS)
        a = np.asarray(im, np.float32)
        acc[y0:y1, x0:x1] += a * weights(name)[:, :, None]
    return np.clip(np.rint(acc), 0, 255).astype(np.uint8)


def chunk_boxes():
    cols, rows = -(-FULL[0] // CHUNK), -(-FULL[1] // CHUNK)
    for r in range(1, rows + 1):
        for c in range(1, cols + 1):
            x0, y0 = (c - 1) * CHUNK, (r - 1) * CHUNK
            yield r, c, (x0, y0, min(FULL[0], x0 + CHUNK), min(FULL[1], y0 + CHUNK))


def write_chunks(sheet, out_dir, quality=92):
    """sheet: uint8 array. Writes r{row}-c{col}.webp. Returns list of (name, size)."""
    import os
    os.makedirs(out_dir, exist_ok=True)
    img = Image.fromarray(sheet)
    done = []
    for r, c, box in chunk_boxes():
        name = f'r{r}-c{c}.webp'
        img.crop(box).save(os.path.join(out_dir, name), 'WEBP', quality=quality, method=6)
        done.append((name, (box[2] - box[0], box[3] - box[1])))
    return done


def write_preview(sheet, path, quality=92):
    Image.fromarray(sheet).resize(PREVIEW, Image.LANCZOS).save(path, 'WEBP', quality=quality, method=6)


def load_sheet_from_chunks(chunk_dir):
    """Re-assemble a full sheet from r*-c*.webp (used to test against Zone 1)."""
    import os
    full = Image.new('RGB', FULL)
    for r, c, box in chunk_boxes():
        full.paste(Image.open(os.path.join(chunk_dir, f'r{r}-c{c}.webp')).convert('RGB'), box[:2])
    return np.asarray(full)
