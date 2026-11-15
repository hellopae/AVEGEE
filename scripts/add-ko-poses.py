#!/usr/bin/env python3
"""F8 (owner 15 Nov): lying-down (KO) pictures of the team -> img/combat-animation-v1/manifest.json

Drop one picture per figure in  img/ko-pose-v1/<zone>/<key>.webp   (zone = th asia west cyberhell · key = yama taan kan dam boon plerng guard nira)
and run  python3 scripts/add-ko-poses.py   - it writes the `:ko` record of each picture that exists (and removes the `:ko` record of one that is gone).
The game (battle-ko.js + combat-sprites.js) already draws a record `<key>:ko` instead of tilting the standing picture; a figure without a file keeps the old tilt.

  record key      yama -> yama:<zone>:ko · nira -> crew:<zone>:nira:ko · the rest -> crew:<zone>:<key>:ko
  frame           the whole picture, 1 x 1 cells, held (one frame)
  anchor          [centre x of the visible pixels, bottom of the visible pixels]  = the point that stands on the floor where the standing figure's feet were
  bodyHeight      copied from the STANDING record of the same figure (same drawing scale: the file must be drawn at the standing picture's scale)
  --check         only report, write nothing   --root DIR  repo root (tests)
Then bump the manifest query (?v=night-v1-p9-grace-f in battle-fx.js, combat-sprites.js, ui.js) so players' caches pick the new records up."""
import json, sys
from pathlib import Path
from PIL import Image

ZONES = ('th', 'asia', 'west', 'cyberhell')
KEYS = ('yama', 'taan', 'kan', 'dam', 'boon', 'plerng', 'guard', 'nira')
DIR = 'img/ko-pose-v1'
MANIFEST = 'img/combat-animation-v1/manifest.json'


def record_key(zone, key):
    return f'yama:{zone}:ko' if key == 'yama' else f'crew:{zone}:{key}:ko'


def standing_key(zone, key):
    return f'yama:{zone}' if key == 'yama' else f'nira:{zone}' if key == 'nira' else f'crew:{zone}:{key}'


def entry_for(root, zone, key, sprites):
    f = Path(root) / DIR / zone / f'{key}.webp'
    if not f.exists():
        return None
    ref = sprites.get(standing_key(zone, key))
    if not ref:
        raise SystemExit(f'no standing record {standing_key(zone, key)} in the manifest - cannot scale {f}')
    im = Image.open(f).convert('RGBA')
    bbox = im.getchannel('A').point(lambda a: 255 if a > 40 else 0).getbbox()
    if not bbox:
        raise SystemExit(f'{f} has no visible pixel')
    w, h = im.size
    return {'src': f'{DIR}/{zone}/{key}.webp', 'frameWidth': w, 'frameHeight': h, 'cols': 1, 'rows': 1,
            'anchor': [round((bbox[0] + bbox[2]) / 2), bbox[3]], 'bodyHeight': ref['bodyHeight'],
            'modes': {'ko': {'frames': [0], 'durations': [1000]}}}


def build(root):
    path = Path(root) / MANIFEST
    m = json.loads(path.read_text())
    sprites = m['sprites']
    for k in [k for k in sprites if k.endswith(':ko')]:
        del sprites[k]
    added = []
    for zone in ZONES:
        for key in KEYS:
            e = entry_for(root, zone, key, sprites)
            if e:
                sprites[record_key(zone, key)] = e; added.append(record_key(zone, key))
    return m, added, path


if __name__ == '__main__':
    args = sys.argv[1:]
    root = args[args.index('--root') + 1] if '--root' in args else Path(__file__).resolve().parent.parent
    m, added, path = build(root)
    print(f'{len(added)} KO pictures found:', ', '.join(added) or '(none)')
    if '--check' not in args:
        path.write_text(json.dumps(m, ensure_ascii=False, indent=2) + '\n'); print('wrote', path)
