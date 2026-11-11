"""Show frozen ground labels without reading production alpha."""

import json
from pathlib import Path

from PIL import Image, ImageDraw

from build_assets import crop, terrain
from reference_regions import reference_support

ROOT = Path(__file__).resolve().parents[1]


def main():
    reference = json.loads((ROOT / 'review/liquid-reference.json').read_text())
    ground = terrain()
    for name, item in reference['groundPatches'].items():
        base = crop(ground, item['groundRectMap1x'])
        support = reference_support(reference, name, item['groundRectMap1x'])
        tint = Image.new('RGBA', base.size, (20, 240, 60, 0))
        tint.putalpha(support.point(lambda value: round(value * .35)))
        over = Image.alpha_composite(base.convert('RGBA'), tint).convert('RGB')
        base.thumbnail((700, 500), Image.Resampling.LANCZOS)
        over.thumbnail((700, 500), Image.Resampling.LANCZOS)
        out = Image.new('RGB', (base.width * 2, base.height + 25), '#17171e')
        out.paste(base, (0, 25))
        out.paste(over, (base.width, 25))
        ImageDraw.Draw(out).text((5, 5), name + ' | ground | frozen reference', fill='white')
        out.save(ROOT / 'review/boundary' / (name + '-labels.webp'), quality=48, method=6)
    print('Ground-only label previews:', len(reference['groundPatches']))


if __name__ == '__main__':
    main()
