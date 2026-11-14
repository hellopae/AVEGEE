#!/usr/bin/env python3
"""Z2-EVENTS: placeholder pictures for the story slots of Zone 2 that have no drawing yet (right pixel size, never stretched, clearly labelled).
A real drawing saved under the same file name replaces it - no code change.   python3 scripts/build-z2-events-placeholders.py [--force]
Soul sprites/profiles: a plain COPY of the closest existing archetype drawing of the zone (nothing is recoloured or edited) so the court stays readable.
Everything else: a labelled frame at the exact size. The art spec is Output/Claudy/briefs/2026-11-14-avegee-z2-events-art.md"""
import shutil, sys
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'img' / 'z2-events'; OUT.mkdir(exist_ok=True)
force = '--force' in sys.argv
SOULS = {  # soul key -> existing archetype drawing it stands in for
    'soul-ape-elder-asia': 'spirit-worker-asia-v2', 'soul-satori-father-asia': 'spirit-officer-asia-v2',
    'soul-deserter-asia': 'spirit-officer-asia-v2', 'soul-commander-asia': 'spirit-officer-asia-v2',
    'soul-cupdealer-asia': 'spirit-business-asia-v2', 'soul-granary-sister-asia': 'spirit-woman-asia-v2',
}
BOARDS = {   # file -> (w, h, mode, label)
    'boss-wukong-asia.webp': (512, 512, 'RGBA', 'boss-wukong-asia'), 'boss-wukong-asia-profile.webp': (512, 512, 'RGB', 'boss-wukong-asia-profile'),
    'cut-wukong-arrives-asia.webp': (1672, 941, 'RGB', 'cut-wukong-arrives-asia  (Wukong lands on a golden cloud)'),
    'cut-ape-phantom-ledger-asia.webp': (1672, 941, 'RGB', 'cut-ape-phantom-ledger-asia  (Nira opens the monkeys ledger: [PHANTOM-404])'),
    'cut-wukong-returns-asia.webp': (1672, 941, 'RGB', 'cut-wukong-returns-asia  (the old ape rides the cloud beside Wukong)'),
    'cut-wukong-yields-asia.webp': (1672, 941, 'RGB', 'cut-wukong-yields-asia  (P2)'),
    'cut-frontier-boss-to-dais-asia.webp': (1672, 941, 'RGB', 'cut-frontier-boss-to-dais-asia  (Akura walks first, no shackles)'),
    'cut-frontier-boss-punished-asia.webp': (1672, 941, 'RGB', 'cut-frontier-boss-punished-asia  (Akura carries stone to mend the gate)'),
    'cut-frontier-boss-released-asia.webp': (1672, 941, 'RGB', 'cut-frontier-boss-released-asia  (Akura walks into the cave)'),
    'cut-satori-farewell-asia.webp': (1672, 941, 'RGB', 'cut-satori-farewell-asia  (Satori walks beside his father, not touching)'),
    'cut-satori-ask-asia.webp': (1672, 941, 'RGB', 'cut-satori-ask-asia  (P2)'),
    'cut-guard-test-asia.webp': (1672, 941, 'RGB', 'cut-guard-test-asia  (the gate guardian bars the door)'),
    'prop-shackle-pair-asia.webp': (1375, 768, 'RGB', 'prop-shackle-pair-asia  (a broken pair of shackles, hammer mark on the left loop)'),
    'prop-cup-flame-asia.webp': (1375, 768, 'RGB', 'prop-cup-flame-asia  (cup base, three flame lines, the third unfinished)'),
    'prop-empty-granary-asia.webp': (1375, 768, 'RGB', 'prop-empty-granary-asia  (P2)'),
}
def board(name, w, h, mode, label):
    im = Image.new(mode, (w, h), (24, 14, 20) + ((255,) if mode == 'RGBA' else ())); d = ImageDraw.Draw(im)
    gold = (167, 129, 67) + ((255,) if mode == 'RGBA' else ()); dark = (60, 40, 48) + ((255,) if mode == 'RGBA' else ())
    d.rectangle([12, 12, w - 13, h - 13], outline=gold, width=3)
    d.line([12, 12, w - 13, h - 13], fill=dark, width=2); d.line([w - 13, 12, 12, h - 13], fill=dark, width=2)
    d.rectangle([24, h // 2 - 26, w - 25, h // 2 + 26], fill=(24, 14, 20) + ((255,) if mode == 'RGBA' else ()))
    d.text((36, h // 2 - 8), 'PLACEHOLDER %dx%d  %s' % (w, h, label), fill=(255, 224, 164) + ((255,) if mode == 'RGBA' else ()))
    im.save(OUT / name, 'WEBP', quality=80)
for name, (w, h, mode, label) in BOARDS.items():
    if force or not (OUT / name).exists(): board(name, w, h, mode, label); print('board', name, (w, h))
for key, base in SOULS.items():
    for suffix in ('', '-profile'):
        dst = OUT / f'{key}{suffix}.webp'
        if force or not dst.exists(): shutil.copyfile(ROOT / 'img' / 'Asia' / f'{base}.webp', dst); print('copy', dst.name, '<-', base)
