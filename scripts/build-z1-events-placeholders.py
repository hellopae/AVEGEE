#!/usr/bin/env python3
"""Z1-EVENTS: placeholder pictures for story slots that have no drawing yet (right pixel size, never stretched, clearly labelled).
A real drawing saved under the same name replaces it - no code change.   python3 scripts/build-z1-events-placeholders.py"""
from pathlib import Path
from PIL import Image, ImageDraw
OUT = Path(__file__).resolve().parent.parent / 'img' / 'z1-events'
SLOTS = {'cut-sita-phantom-ledger-th.webp': (1375, 768, 'PLACEHOLDER 1375x768  cut-sita-phantom-ledger-th  (Nira opens the ledger: [PHANTOM-404])')}
for name, (w, h, label) in SLOTS.items():
    im = Image.new('RGB', (w, h), (24, 14, 20)); d = ImageDraw.Draw(im)
    d.rectangle([12, 12, w - 13, h - 13], outline=(167, 129, 67), width=3)
    d.line([12, 12, w - 13, h - 13], fill=(60, 40, 48), width=2); d.line([w - 13, 12, 12, h - 13], fill=(60, 40, 48), width=2)
    d.rectangle([40, h // 2 - 26, w - 41, h // 2 + 26], fill=(24, 14, 20)); d.text((56, h // 2 - 8), label, fill=(255, 224, 164))
    im.save(OUT / name, 'WEBP', quality=80); print(name, im.size)
