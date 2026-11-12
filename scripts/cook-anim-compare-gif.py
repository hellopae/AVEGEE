#!/usr/bin/env python3
"""Before / after GIFs of the cook + TH carry strips.

  python3 -I scripts/cook-anim-compare-gif.py <codex-delivery-dir> <out-dir>

before = the Codex strip exactly as delivered, after = img/workers/*.webp as the game now loads them. Panels share one 320 px grid with the cell centre line
(x=160, where the renderer plants the foot) and the baseline drawn, so an off-centre or drifting foot shows. 8 frames at 125 ms, looped."""
import json, os, sys
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = os.path.join(ROOT, 'img', 'workers')
BG = (46, 40, 56)
CELL, P = 320, 0.75


def frame(strip, row, col, scale=1.0, label=''):
    cell = strip.crop((col * CELL, row * CELL, (col + 1) * CELL, (row + 1) * CELL))
    if scale != 1.0:
        s = round(CELL * scale)
        cell = cell.resize((s, s), Image.NEAREST); pad = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
        pad.alpha_composite(cell, (CELL // 2 - s // 2, CELL - s)); cell = pad
    bg = Image.new('RGBA', (CELL, CELL), BG + (255,)); bg.alpha_composite(cell)
    d = ImageDraw.Draw(bg)
    d.line([(160, 0), (160, CELL)], fill=(80, 220, 120, 255), width=1); d.line([(0, CELL - 1), (CELL, CELL - 1)], fill=(80, 160, 255, 255), width=1)
    d.text((6, 4), label, fill=(255, 255, 255, 255))
    return bg.convert('RGB').resize((round(CELL * P), round(CELL * P)), Image.NEAREST)


def gif(path, panels):
    """panels: list of (strip, row, scale, label); one GIF frame per column."""
    frames = []
    for c in range(8):
        parts = [frame(s, r, c, sc, lb) for s, r, sc, lb in panels]
        out = Image.new('RGB', (sum(p.width for p in parts) + 4 * (len(parts) - 1), parts[0].height), (10, 10, 14))
        x = 0
        for p in parts: out.paste(p, (x, 0)); x += p.width + 4
        frames.append(out.quantize(colors=128, method=Image.MEDIANCUT, dither=Image.NONE))
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=125, loop=0, optimize=True)


def main():
    src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
    for z in ('th', 'asia', 'west', 'cyberhell'):
        raw = Image.open(os.path.join(src, f'worker-{z}-cook-v1.webp')).convert('RGBA'); new = Image.open(os.path.join(W, f'worker-{z}-cook-v1.webp')).convert('RGBA')
        gif(os.path.join(out, f'cook-{z}-before-after.gif'), [(raw, 0, 1, 'before R'), (raw, 1, 1, 'before L'), (new, 0, 1, 'after R'), (new, 1, 1, 'after L')])
    raw = Image.open(os.path.join(src, 'worker-th-carry-v1.webp')).convert('RGBA'); new = Image.open(os.path.join(W, 'worker-th-carry-v1.webp')).convert('RGBA')
    meta = json.load(open(os.path.join(W, 'worker-th-carry-v1.json')))
    for r, name in enumerate(('side', 'side-left', 'down', 'up')):
        gif(os.path.join(out, f'carry-th-{name}-before-after.gif'), [(raw, r, 1, 'before ' + name), (new, r, meta['rows'][r]['scale'], 'after ' + name)])


if __name__ == '__main__':
    main()
