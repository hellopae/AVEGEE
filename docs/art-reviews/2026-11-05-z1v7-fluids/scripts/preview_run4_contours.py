"""Ground-only grids/labels. No production alpha or construction geometry."""
import json
from pathlib import Path

from PIL import Image, ImageDraw

from build_assets import crop, terrain
from reference_regions import reference_support

ROOT = Path(__file__).resolve().parents[1]
VIEWS = {
    'ice-central-right': ('ice-stream-flat-central', [680, 0, 1260, 340]),
    'ice-central-left': ('ice-stream-flat-central', [0, 250, 700, 720]),
    'ice-upper-pool': ('ice-stream-flat-upper', [0, 0, 1300, 500]),
    'ice-lower-outlet': ('ice-stream-flat-lower', [1550, 450, 2220, 1140]),
    'lava-middle': ('lava-flat-middle', [0, 0, 1000, 440]),
    'lava-west-upper-pool': ('lava-flat-west', [170, 250, 610, 520]),
    'lava-west-lower-pool': ('lava-flat-west', [0, 750, 1040, 1120]),
    'lava-west-particle-pool': ('lava-flat-west', [190, 790, 410, 980]),
}


def main():
    reference = json.loads((ROOT / 'review/liquid-reference.json').read_text())
    spec = json.loads((ROOT / 'review/run4-ground-contours.json').read_text())
    ground = terrain()
    for name, (target, box) in VIEWS.items():
        base = crop(ground, reference['masks'][target]['groundRectMap1x']).crop(box)
        draw = ImageDraw.Draw(base)
        for axis in range(2):
            for value in range((box[axis] // 25 + 1) * 25, box[axis + 2], 25):
                local = value - box[axis]
                line = (local, 0, local, base.height) if axis == 0 else (0, local, base.width, local)
                draw.line(line, fill='#777777')
                draw.text((local + 1, 1) if axis == 0 else (1, local + 1), str(value),
                          fill='white', stroke_width=1, stroke_fill='black')
        if base.width < 700:
            base = base.resize((base.width * 2, base.height * 2))
        base.thumbnail((1500, 1200), Image.Resampling.LANCZOS)
        base.save(ROOT / 'review/boundary' / ('run4-' + name + '-ground-grid.webp'), quality=75, method=6)
    for name, item in spec['patches'].items():
        base = crop(ground, item['groundRectMap1x'])
        support = reference_support(reference, name, item['groundRectMap1x'])
        tint = Image.new('RGBA', base.size, (20, 240, 60, 0))
        tint.putalpha(support.point(lambda value: round(value * .35)))
        over = Image.alpha_composite(base.convert('RGBA'), tint).convert('RGB')
        out = Image.new('RGB', (base.width * 2, base.height + 25), '#17171e')
        out.paste(base, (0, 25)); out.paste(over, (base.width, 25))
        ImageDraw.Draw(out).text((2, 5), name + ' | ground | liquid contour', fill='white')
        out.thumbnail((1500, 1100), Image.Resampling.LANCZOS)
        out.save(ROOT / 'review/boundary' / (name + '-labels.webp'), quality=65, method=6)
    for name, item in spec['solidRepairs'].items():
        base = crop(ground, reference['masks'][name]['groundRectMap1x'])
        support = Image.new('L', base.size)
        for polygon in item['excludeNative2x']:
            ImageDraw.Draw(support).polygon([tuple(p) for p in polygon], fill=255)
        tint = Image.new('RGBA', base.size, (240, 220, 20, 0))
        tint.putalpha(support.point(lambda value: round(value * .4)))
        over = Image.alpha_composite(base.convert('RGBA'), tint).convert('RGB')
        out = Image.new('RGB', (base.width * 4, base.height * 2 + 25), '#17171e')
        out.paste(base.resize((base.width * 2, base.height * 2)), (0, 25))
        out.paste(over.resize((base.width * 2, base.height * 2)), (base.width * 2, 25))
        ImageDraw.Draw(out).text((2, 5), name + ' | ground | hard solid exclusion', fill='white')
        out.thumbnail((1800, 1100), Image.Resampling.LANCZOS)
        out.save(ROOT / 'review/boundary' / ('run4-' + name + '-solid-ground-labels.webp'), quality=65, method=6)
    print('Ground-only views:', len(VIEWS), 'new label groups:', len(spec['patches']))


if __name__ == '__main__':
    main()
