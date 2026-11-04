"""Assemble the Frontier 1 review pack from its fixed-alpha terrain and reused art.

Only writes to this worktree's dated review folder. Source art is read-only.
Run export-frontier1-terrain.py first, then this script, then verify-frontier1-review.py.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import json
import shutil
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/art-reviews/2026-11-05-frontier1-redraw'
SOURCE = Path('/Users/agapae/Documents/Work PAE/Claude/AVEGEE/layered-map-work/docs/art-reviews')
SEAMLESS = SOURCE / '2026-11-04-terrain-seamless'
KIT = SOURCE / '2026-11-04-zone1-modular/world-kit/assets'
W, H = 2300, 2524


def save_json(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def rgba(path):
    return Image.open(path).convert('RGBA')


def main():
    for folder in ['layers', 'flows', 'objects']:
        (OUT / folder).mkdir(exist_ok=True)
    manifest = json.loads((OUT / 'manifest.json').read_text())
    manifest.update(label='AVEGEE · ชายแดนโซน 1', preview='composite-preview.jpg',
                    layout='layout.json', sourceArtboardPoints=[1935.4, 2123.95])
    provenance = []
    for name, rect in [('sky', [0, 0, W, 1294]), ('mountains', [4, 209, 2297, 766])]:
        source = SEAMLESS / 'layers' / f'{name}.png'
        shutil.copyfile(source, OUT / 'layers' / f'{name}.png')
        im = rgba(source)
        im.thumbnail((1280, 720))
        im.save(OUT / 'layers' / f'{name}-preview.webp', lossless=True, exact=True)
        layer = dict(src=f'layers/{name}-preview.webp', png=f'layers/{name}.png',
                     size=list(im.size), rect=rect, source=str(source))
        manifest[name] = layer
        provenance.append(dict(id=name, source=str(source), operation='unchanged source; scaled at render'))

    # River is liquid-only source art; extend its continuous surface behind the terrain.
    # Crop below mountain feet; bank overlap is intentional and hidden by terrain alpha.
    old = json.loads((SEAMLESS / 'manifest.json').read_text())
    liquids = []
    for item in old['liquids']:
        if item['id'] != 'river':
            continue
        name = item['id']
        rect = [0, 625, W, H - 625]
        shutil.copyfile(SEAMLESS / item['png'], OUT / item['png'])
        frames = []
        for frame in item['frames']:
            # Extend liquid-only texture vertically, overlapping each repeat to hide seams.
            src = rgba(SEAMLESS / frame['src'])
            rgb = np.array(src)[:, :, :3]
            sh, sw = rgb.shape[:2]
            oh = round(rect[3] * sw / W)
            period = sh - 100
            surface = np.zeros((oh, sw, 3), dtype='float32')
            weights = np.zeros((oh, sw, 1), dtype='float32')
            for start in range(-period, oh, period):
                lo, hi = max(0, start), min(oh, start + sh)
                if hi <= lo:
                    continue
                iy = np.arange(lo - start, hi - start)
                fade = np.minimum(np.minimum(iy / 80, (sh - 1 - iy) / 80), 1).clip(.001, 1)
                surface[lo:hi] += rgb[iy] * fade[:, None, None]
                weights[lo:hi] += fade[:, None, None]
            alpha = np.uint8(np.clip(np.arange(oh) / 60, 0, 1) * 255)
            extended = np.dstack((np.uint8(surface / weights), np.broadcast_to(alpha[:, None], (oh, sw))))
            Image.fromarray(extended).save(OUT / frame['src'], lossless=True, exact=True)
            frames.append(dict(src=frame['src'], size=[sw, oh]))
        liquids.append(dict(id=name, rect=rect, frames=frames, png=item['png'],
                            cycleSeconds=item['cycleSeconds'], source=str(SEAMLESS / item['png']),
                            flowDirection={'river': 'left/down', 'lava': 'down', 'waterfall': 'down'}[name]))
        rgba(OUT / frames[0]['src']).resize(tuple(rect[2:]), Image.Resampling.LANCZOS).save(OUT / item['png'])
        provenance.append(dict(id=name, source=str(SEAMLESS / item['png']),
                               operation='reuse all 12 frames, overlapping vertical repeats and top alpha fade beneath banks'))
    manifest['liquids'] = liquids

    # Owner's original frontal Thai arch has a real transparent opening.
    gate = rgba(OUT / 'input/thai-gate-source.png')
    gate.thumbnail((1000, 1000))
    gw, gh = gate.size
    a = np.array(gate)
    yy, xx = np.mgrid[:gh, :gw]
    foreground = (yy < gh * .48) | ((xx > gw * .29) & (xx < gw * .72))
    for name, mask in [('thai-gate-front', foreground), ('thai-gate-back', ~foreground)]:
        part = a.copy()
        part[~mask] = 0
        Image.fromarray(part).save(OUT / 'objects' / f'{name}.png')
    provenance.append(dict(id='thai-gate',
        source='/Users/agapae/Documents/Work PAE/Claude/AVEGEE-reference/files/UI New map/New Pic Map Zone1/ChatGPT Image Nov 4, 2026, 11_29_05 AM.png',
        operation='alpha bbox crop; reduce to 1000px; partition front/back with disjoint masks'))

    objects = []
    gates = [('north', [.4515, .176, .223, .1135]), ('south', [.3301, .8229, .3931, .2001])]
    for gid, (x, y, w, h) in gates:
        for part in ['back', 'front']:
            objects.append(dict(id=f'{gid}-gate-{part}', sprite=f'objects/thai-gate-{part}.png',
                                x=round(x * W), y=round(y * H), w=round(w * W), h=round(h * H),
                                flipX=False, foot=[.5, .83 if gid == 'south' else .98],
                                footNote='visible passage threshold; south wall continues beyond owner artboard',
                                layer=part, category='gate', group=f'{gid}-gate'))
    # Sparse side decorations, outside the protected main corridor.
    specs = [('volcanic-tree', .18, .64, 190, 'tree'),
             ('ice-pine', .85, .65, 210, 'tree'),
             ('volcanic-boulder', .29, .72, 70, 'rock'),
             ('ice-shrub', .77, .72, 44, 'shrub'),
             ('thai-street-lamp', .37, .60, 120, 'lamp'),
             ('thai-street-lamp', .73, .60, 120, 'lamp')]
    for i, (name, fx, fy, height, category) in enumerate(specs):
        target = OUT / 'objects' / f'{name}.png'
        if not target.exists():
            source = KIT / f'{name}.png'
            im = rgba(source)
            im = im.crop(im.getchannel('A').getbbox())
            # Save at useful sprite resolution; avoid importing multi-megapixel source waste.
            im.thumbnail((600, 600))
            im.save(target)
            provenance.append(dict(id=name, source=str(source), operation='alpha bbox crop and downscale'))
        im = rgba(target)
        width = round(height * im.width / im.height)
        objects.append(dict(id=f'{name}-{i}', sprite=f'objects/{name}.png',
                            x=round(fx * W - width / 2), y=round(fy * H - height * .96),
                            w=width, h=height, flipX=False, foot=[.5, .96], layer='mid', category=category))
    layout = dict(world=[W, H], footUnits='normalized within sprite rectangle',
                  footWorldFormula='[x + foot[0]*w, y + foot[1]*h]', objects=objects)
    save_json('layout.json', layout)
    manifest['objects'] = dict(layout='layout.json', footUnits=layout['footUnits'])
    manifest['layerOrder'] = ['sky', 'mountains', 'river', 'terrain', 'objects']
    manifest['layers'] = [dict(id=k, **manifest[k]) for k in ['sky', 'mountains']]
    save_json('manifest.json', manifest)
    save_json('source-provenance.json', provenance)

    composite = Image.new('RGBA', (W, H), '#352641')
    def place(im, rect):
        x, y, w, h = map(round, rect)
        composite.alpha_composite(im.resize((w, h), Image.Resampling.LANCZOS), (x, y))
    for name in ['sky', 'mountains']:
        place(rgba(OUT / manifest[name]['png']), manifest[name]['rect'])
    for liquid in liquids:
        place(rgba(OUT / liquid['frames'][0]['src']), liquid['rect'])
    composite.alpha_composite(rgba(OUT / 'terrain-atlas.png'))
    order = {'back': 0, 'mid': 1, 'front': 2}
    for ob in sorted(objects, key=lambda ob: (order[ob['layer']], ob['y'] + ob['h'] * ob['foot'][1])):
        place(rgba(OUT / ob['sprite']), [ob[k] for k in ['x', 'y', 'w', 'h']])
    preview = composite.convert('RGB').resize((1600, 1756), Image.Resampling.LANCZOS)
    preview.save(OUT / 'composite-preview.jpg', quality=92)
    owner = Image.open(OUT / 'input/frontier1-owner-layout.jpg').convert('RGB').resize(preview.size)
    Image.blend(preview, owner, .5).save(OUT / 'owner-overlay.jpg', quality=92)
    # Three complete cycles of every imported 12-frame loop, for visual review.
    for liquid in liquids:
        frames = []
        for f in liquid['frames']:
            im = rgba(OUT / f['src'])
            im.thumbnail((480, 260))
            frames.append(im)
        frames[0].save(OUT / 'flows' / f"{liquid['id']}-3-cycles.webp", save_all=True,
                       append_images=(frames * 3)[1:], duration=round(liquid['cycleSeconds'] * 1000 / 12),
                       loop=1, lossless=True)
    runtime = {manifest['sky']['src'], manifest['mountains']['src']}
    runtime.update(t['src'] for t in manifest['tiles'])
    runtime.update(o['sprite'] for o in objects)
    runtime.update(f['src'] for liquid in liquids for f in liquid['frames'])
    save_json('image-metadata.json', {s: list(Image.open(OUT / s).size) for s in sorted(runtime)})
    print(json.dumps(dict(objects=len(objects), layers=len(manifest['layers']),
                          liquids=len(liquids), frames=sum(len(x['frames']) for x in liquids))))


if __name__ == '__main__':
    main()
