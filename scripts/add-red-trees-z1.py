#!/usr/bin/env python3
"""ART-INTEGRATE (13 Nov 2026): put the red trees that v7r lost back as separate sprites (owner 13 Nov: "add separate tree pictures on top").

Positions = the owner's own survey of the v5 ground (docs/art-reviews/2026-11-05-z1-v5-hd/objects-inventory.json in git 807f23f1: `west-tree-NN`, `pilot-red-tree-NN`,
bbox + foot in world units).  A spot is used when (1) v5 had clearly red foliage inside the bbox and v7r has <= 25 % of it (hue/saturation count on the 2x ground), and
(2) the foot is >= 40 units from any walkable cell and >= 60 units from an existing prop (so no path, stair or existing tree is covered).
Picture = the owner's red tree already in the repo (img/map-zone1/v7r/sprites/pilot-red-tree-00.webp), same picture at every spot, drawn at the survey width, not recoloured.
Entries are appended to sprites.json with layer 'sort' (depth-sorted by the foot with the characters) and `show: true` (the other 'sort' sprites stay hidden).
    python3 scripts/add-red-trees-z1.py
"""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
P = ROOT / 'img/map-zone1/v7r/sprites.json'
# id: (bbox width, foot x, foot y) from the survey
SPOTS = {
    'west-tree-01': (77, 172.8, 514.1), 'west-tree-03': (77, 691.2, 658.8), 'west-tree-08': (70, 92.4, 1083.7), 'west-tree-09': (67, 148.8, 1124.9),
    'west-tree-15': (72, 79.2, 1640.5), 'west-tree-16': (96, 105.6, 2152.1), 'west-tree-17': (108, 750.0, 2144.3),
    'pilot-red-tree-04': (82, 1164.0, 2031.1), 'pilot-red-tree-05': (82, 1260.0, 2117.1), 'pilot-red-tree-10': (101, 2666.4, 2357.3),
    'pilot-red-tree-11': (94, 2346.0, 2370.5), 'pilot-red-tree-12': (96, 2486.4, 2546.6),
}
ASPECT = 313 / 265      # pilot-red-tree-00.webp 265 x 313
FOOT_FRAC = .511        # foot x as a fraction of the picture width (same as the pilot sprites)
lst = [e for e in json.loads(P.read_text()) if not e['id'].startswith('red-tree-')]
for sid, (w, fx, fy) in SPOTS.items():
    h = w * ASPECT
    lst.append({'id': 'red-tree-' + sid, 'src': 'sprites/pilot-red-tree-00.webp', 'rectWorld': [round(fx - FOOT_FRAC * w, 2), round(fy - h, 2), round(w, 2), round(h, 2)],
                'footWorld': [fx, fy], 'layer': 'sort', 'verified': False, 'show': True})
P.write_text(json.dumps(lst, ensure_ascii=False, separators=(',', ':')))
print(len(SPOTS), 'red trees,', len(lst), 'sprites')
