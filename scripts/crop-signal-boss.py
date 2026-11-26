#!/usr/bin/env python3
"""FB3-T6/8: the controlled border lords of Zones 1-3 (img/story-sig/boss-frontier-<zone>-signal-v1.webp) are drawn by Codex as a 3 x 4 SHEET of poses (cells of 384 x 512), not as one picture.
The game draws a boss as one square picture, so the whole sheet showed up as a cluster of tiny figures on the border map and in the fight.  This cuts the first cell (the standing pose) out,
trims it and puts it on a transparent 512 x 512 square with the feet at the bottom - img/story-sig/boss-frontier-<zone>-signal-idle.webp (what src/art.js points to).  The pixels are Codex's, nothing is
recoloured; a real single-picture drawing can simply overwrite the -idle file.   python3 scripts/crop-signal-boss.py"""
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parent.parent
for zone in ('th', 'asia', 'west'):
    src = ROOT / f'img/story-sig/boss-frontier-{zone}-signal-v1.webp'
    sheet = Image.open(src).convert('RGBA'); cw, ch = sheet.width // 3, sheet.height // 4
    cell = sheet.crop((0, 0, cw, ch)); box = cell.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    cell = cell.crop(box); k = min(480 / cell.width, 480 / cell.height, 1.0 if max(cell.size) >= 480 else 480 / max(cell.size))
    cell = cell.resize((max(1, round(cell.width * k)), max(1, round(cell.height * k))), Image.LANCZOS)
    out = Image.new('RGBA', (512, 512), (0, 0, 0, 0)); out.alpha_composite(cell, ((512 - cell.width) // 2, 504 - cell.height))
    dst = ROOT / f'img/story-sig/boss-frontier-{zone}-signal-idle.webp'; out.save(dst, lossless=True, quality=100); print(dst.name, sheet.size, '->', out.size, 'cell box', box)
