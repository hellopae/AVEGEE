#!/usr/bin/env python3
"""Assemble only the B12 art review pack; never modifies the game.

Run export-border12-terrain.py first. The source library is read-only.
All atlas coordinates share a 1.5 scale and 264px sky margin from the guide.
Dependencies: Pillow, numpy, opencv-python.
"""
import argparse
import hashlib
import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/art-reviews/2026-11-05-border12-redraw'
W, H = 2304, 1800


def write(name, data):
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def point(x, y):
    return [round(x * 1.5), round(y * 1.5 + 264)]


def opaque(im):
    """Normalize generated near-opaque interiors; preserve soft cutout edges."""
    a = np.array(im.convert('RGBA'))
    alpha = a[:, :, 3]
    a[:, :, 3] = np.where(alpha >= 230, 255, np.where(alpha < 12, 0, alpha)).astype('uint8')
    a[a[:, :, 3] == 0] = 0
    return Image.fromarray(a)


def line_mask(points, width):
    mask = Image.new('L', (W, H))
    draw = ImageDraw.Draw(mask)
    pts = [point(*p) for p in points]
    r = round(width * 1.5 / 2)
    draw.line(pts, fill=255, width=r * 2, joint='curve')
    for x, y in pts:
        draw.ellipse((x-r, y-r, x+r, y+r), fill=255)
    return mask.filter(ImageFilter.GaussianBlur(3))


def place(canvas, sprite, rect):
    x, y, w, h = rect
    canvas.alpha_composite(sprite.convert('RGBA').resize((w, h), Image.Resampling.LANCZOS), (x, y))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-root', type=Path, default=Path(
        '/Users/agapae/Documents/Work PAE/Claude/AVEGEE/layered-map-work/docs/art-reviews'))
    args = parser.parse_args()
    sources = args.source_root
    z1 = sources / '2026-11-04-terrain-seamless'
    kit = sources / '2026-11-04-zone1-modular/world-kit/assets'
    z2 = sources / '2026-11-05-zone2-terrain'
    for folder in ['layers', 'flows', 'objects', 'reviews']:
        (OUT / folder).mkdir(exist_ok=True)
    manifest = json.loads((OUT / 'manifest.json').read_text())
    assert manifest['world'] == [W, H]
    provenance = []

    # Reuse the accepted sky and LEFT volcano, not Zone 1's snowy right mountain.
    sky = Image.open(z1 / 'layers/sky.png').convert('RGB')
    sky.thumbnail((1280, 1000))
    sky.save(OUT / 'layers/sky.webp', quality=94)
    mountain = Image.open(z1 / 'layers/mountains.png').convert('RGBA')
    volcano = mountain.crop((0, 0, 1150, mountain.height))
    aa = np.array(volcano)
    fade = np.minimum(1, np.maximum(0, (volcano.width-1-np.arange(volcano.width))/220))
    aa[:, :, 3] = np.uint8(aa[:, :, 3] * fade[None, :])
    aa[aa[:, :, 3] == 0] = 0
    Image.fromarray(aa).save(OUT / 'layers/mountains-volcano.png')
    asia = Image.open(OUT / 'source-images/mountains-asia.webp').convert('RGBA')
    # Preserve generated atmospheric transparency; clean numerical zero dust only.
    aa = np.array(asia)
    aa[aa[:, :, 3] < 5] = 0
    Image.fromarray(aa).save(OUT / 'layers/mountains-asia.png')
    layers = [
        {'id': 'sky', 'src': 'layers/sky.webp', 'rect': [0, 0, W, H], 'parallax': .08},
        {'id': 'mountains-volcano', 'src': 'layers/mountains-volcano.png',
         'rect': [-80, -40, 1450, 680], 'parallax': .18},
        {'id': 'mountains-asia', 'src': 'layers/mountains-asia.png',
         'rect': [840, -150, 1550, 1033], 'parallax': .14},
    ]
    provenance += [{'output': 'layers/sky.webp', 'source': str(z1 / 'layers/sky.png')},
                   {'output': 'layers/mountains-volcano.png', 'source': str(z1 / 'layers/mountains.png'),
                    'sourceCrop': [0, 0, 1150, mountain.height]}]

    # The original Zone 1 pure-fluid study underlying its flow export contains no banks.
    lava_study = sources / '2026-11-04-zone1-modular/registered-layout/left-lava-master.png'
    Image.open(lava_study).convert('RGB').resize((384, 640), Image.Resampling.LANCZOS).save(
        OUT / 'source-images/lava-texture.webp', lossless=True)
    water = Image.open(z2 / 'fluid-master.png').convert('RGB')
    water_patch = np.array(water.crop((800, 100, 1500, 800)).resize((512, 512), Image.Resampling.LANCZOS)).astype(float)
    # Match the accepted sunset scene's quieter blue-violet water palette.
    gray = water_patch.mean(axis=2, keepdims=True)
    water_patch = .42 * water_patch + .18 * gray + np.array([35, 19, 33])
    Image.fromarray(np.uint8(np.clip(water_patch, 0, 255))).save(OUT / 'source-images/water-texture.webp', lossless=True)
    provenance += [
        {'output': 'source-images/lava-texture.webp', 'source': str(lava_study),
         'kind': 'whole pure-fluid study; channel geometry authored separately'},
        {'output': 'source-images/water-texture.webp', 'source': str(z2 / 'fluid-master.png'),
         'sourceCrop': [800, 100, 1500, 800]},
    ]
    specs = [
        ('lava', 'lava-texture.webp', [(510, 65), (400, 120), (295, 200), (200, 280),
                                     (125, 370), (60, 440), (135, 520), (195, 590)], 105, [-4, 18]),
        ('water', 'water-texture.webp', [(1380, 470), (1290, 585), (1140, 700),
                                       (995, 860), (865, 1020)], 285, [-12, 18]),
        ('waterfall', 'water-texture.webp', [(1370, 435), (1355, 500), (1305, 570),
                                           (1230, 640)], 78, [-3, 30]),
    ]
    fluids = []
    flow_reviews = []
    for name, texture, pts, width, velocity in specs:
        full_mask = line_mask(pts, width)
        if name == 'water':
            # Continuous river plane below all foreground cliffs, no exposed tube end.
            top = point(0, 385)[1]
            rows = np.clip((np.arange(H) - top) / 140, 0, 1)
            full_mask = Image.fromarray(np.uint8(np.repeat(rows[:, None], W, axis=1) * 255))
        box = full_mask.getbbox()
        x, y, x1, y1 = box
        rw, rh = x1-x, y1-y
        fw = min(650, rw)
        fh = round(rh * fw / rw)
        mask = full_mask.crop(box).resize((fw, fh), Image.Resampling.LANCZOS)
        tile = np.array(Image.open(OUT / 'source-images' / texture).convert('RGB'))
        # Mirrored periods avoid discontinuous source texture seams during advection.
        tile = np.concatenate([tile, tile[:, ::-1]], axis=1)
        tile = np.concatenate([tile, tile[::-1]], axis=0)
        yy, xx = np.mgrid[:fh, :fw].astype('float32')
        frames = []
        arrays = []
        def sample(t):
            return cv2.remap(tile, (xx - np.float32(velocity[0] * t)) % tile.shape[1],
                             (yy - np.float32(velocity[1] * t)) % tile.shape[0],
                             cv2.INTER_CUBIC, borderMode=cv2.BORDER_WRAP)
        def periodic(t):
            t %= 1
            return np.uint8(np.clip((1-t)*sample(t).astype('float32')
                                   + t*sample(t-1).astype('float32'), 0, 255))
        for n in range(12):
            a = periodic(n / 12)
            arrays.append(a)
            frame = Image.fromarray(a).convert('RGBA')
            frame.putalpha(mask)
            src = f'flows/{name}-{n:02d}.webp'
            frame.save(OUT / src, lossless=True, exact=True)
            frames.append({'src': src, 'size': [fw, fh]})
            if n == 0:
                frame.resize((rw, rh), Image.Resampling.LANCZOS).save(OUT / f'layers/{name}.png')
        differences = [float(np.mean(np.abs(arrays[(i+1) % 12].astype(float)-arrays[i]))) for i in range(12)]
        flow_reviews.append({'id': name, 'uniqueFrames': len({hashlib.sha256(a.tobytes()).hexdigest() for a in arrays}),
                             'frame12EqualsFrame0': bool(np.array_equal(periodic(1), periodic(0))),
                             'consecutiveMeanRgbDelta': differences,
                             'threeCycles': [i % 12 for i in range(36)], 'motionVectorPerCycle': velocity,
                             'method': 'periodic crossfaded downstream advection; fixed authored alpha'})
        fluids.append({'id': name, 'rect': [x, y, rw, rh], 'png': f'layers/{name}.png',
                       'frames': frames, 'cycleSeconds': 4, 'reviewLoops': 3,
                       'flowDirection': velocity, 'alphaFixed': True})

    # Cave masks are disjoint, preserving pixel ownership and common position/foot.
    cave = opaque(Image.open(OUT / 'source-images/cave-master.webp'))
    bbox = cave.getchannel('A').getbbox()
    cw, ch = cave.size
    front = Image.new('L', cave.size)
    d = ImageDraw.Draw(front)
    # Own the complete horn/guardian silhouette in front, including its high tips.
    d.polygon([(200, 0), (1330, 0), (1330, 900), (985, 940),
               (920, 710), (600, 700), (495, 940), (200, 900)], fill=255)
    d.polygon([(490, 850), (505, 730), (540, 625), (610, 530), (710, 465),
               (780, 447), (865, 495), (935, 585), (985, 715), (1005, 860),
               (1090, 1024), (390, 1024)], fill=0)
    front = np.array(front) > 0
    a = np.array(cave)
    pieces = []
    for name, ownership in [('cave-front', front), ('cave-back', ~front)]:
        piece = a.copy()
        piece[~ownership] = 0
        sprite = Image.fromarray(piece).crop(bbox)
        sprite.save(OUT / 'objects' / f'{name}.png')
        pieces.append(sprite)
    combined = pieces[1].copy()
    combined.alpha_composite(pieces[0])
    assert np.array_equal(np.array(combined), np.array(cave.crop(bbox)))
    cave_review = Image.new('RGB', (1200, 350), '#41434c')
    labels = ImageDraw.Draw(cave_review)
    for i, (name, sprite) in enumerate([('cave-back', pieces[1]), ('cave-front', pieces[0])]):
        sprite = sprite.copy()
        sprite.thumbnail((580, 310))
        cave_review.paste(sprite, (i*600, 30), sprite)
        labels.text((i*600+8, 5), name, fill='white')
    cave_review.save(OUT / 'cave-layer-review.jpg', quality=93)
    write('cave-review.json', {'disjointPixelOwnership': True, 'reassemblyPixelExact': True,
                              'sourceSize': list(cave.size), 'crop': list(bbox),
                              'front': 'guardian arch, jambs, braziers',
                              'back': 'receding dark interior, rear rock walls, threshold',
                              'occlusionInGame': 'not integrated; sort character between back and front'})

    asset_sources = {
        'thai-gate': kit / 'heaven-gate.png', 'asia-gate': ROOT / 'img/map-v5/st-frontier-asia.webp',
        'red-maple': kit / 'volcanic-tree.png', 'pine': kit / 'forest-pine.png',
        'gold-tree': ROOT / 'img/theme-v4/town-landmark-asia-v1.webp',
        'basalt': kit / 'volcanic-boulder.png', 'moss-rock': kit / 'forest-boulder.png',
        'lamp': kit / 'thai-street-lamp.png',
    }
    for name, source in asset_sources.items():
        sprite = opaque(Image.open(source))
        sprite = sprite.crop(sprite.getchannel('A').getbbox())
        sprite.thumbnail((650, 800))
        sprite.save(OUT / f'objects/{name}.png')
        provenance.append({'output': f'objects/{name}.png', 'source': str(source)})
    objects = []
    def obj(id_, asset, fx, fy, sw, sh, layer='mid', category='tree', flip=False):
        px, py = point(fx, fy)
        ow, oh = round(sw*1.5), round(sh*1.5)
        # Foot is local to the placed rectangle; world foot is x+foot[0], y+foot[1].
        foot = [round(ow/2), oh-2]
        objects.append({'id': id_, 'sprite': f'objects/{asset}.png', 'x': px-foot[0], 'y': py-foot[1],
                        'w': ow, 'h': oh, 'flipX': flip, 'foot': foot, 'layer': layer,
                        'category': category, 'footWorld': [px, py]})
    obj('entrance-thai', 'thai-gate', 108, 478, 128, 165, category='entrance')
    obj('exit-asia', 'asia-gate', 1440, 282, 133, 140, category='exit')
    for side in ['back', 'front']:
        obj('guardian-cave-'+side, 'cave-'+side, 690, 342, 400, 267, side, 'cave')
    for i, (x, y, width, height, flip) in enumerate([
            (125, 700, 150, 180, False), (220, 840, 170, 190, True),
            (385, 915, 145, 175, False), (260, 350, 145, 175, True),
            (400, 190, 140, 170, False)]):
        obj('maple-'+str(i), 'red-maple', x, y, width, height, flip=flip)
    obj('transition-gold', 'gold-tree', 860, 195, 135, 175, 'back')
    for i, (x, y, flip) in enumerate([(930, 480, True), (1250, 140, False), (1325, 200, True), (1150, 115, False)]):
        obj('pine-'+str(i), 'pine', x, y, 170, 175, flip=flip)
    for i, (x, y) in enumerate([(170, 510), (470, 780), (610, 420), (840, 455), (1230, 255), (1490, 310)]):
        obj('lamp-'+str(i), 'lamp', x, y, 28, 90, category='lamp')
    obj('basalt-west', 'basalt', 310, 710, 65, 45, category='rock')
    obj('moss-east', 'moss-rock', 1200, 390, 70, 42, category='rock')
    # Keep export PNGs while serving right-sized lossless sprites to the camera viewer.
    (OUT / 'objects-preview').mkdir(exist_ok=True)
    for asset in {o['sprite'] for o in objects}:
        instances = [o for o in objects if o['sprite'] == asset]
        image = Image.open(OUT / asset).convert('RGBA')
        image.thumbnail((max(o['w'] for o in instances), max(o['h'] for o in instances)))
        preview = 'objects-preview/' + Path(asset).stem + '.webp'
        image.save(OUT / preview, lossless=True, exact=True)
        for o in instances:
            o['preview'] = preview
    layout = {'world': [W, H], 'footConvention': 'local placed rectangle pixels; add x,y for atlas foot',
              'guideTransform': {'scale': 1.5, 'offset': [0, 264]}, 'objects': objects}
    write('layout.json', layout)
    manifest.update(layers=layers, liquids=fluids, layout='layout.json',
                    layerOrder=['sky', 'mountains-volcano', 'mountains-asia', 'lava', 'water', 'waterfall',
                                'terrain', 'objects-back', 'objects-mid', 'objects-front'],
                    label='AVEGEE · นอกเขตชายแดน 1–2', preview='composite-preview.jpg')
    write('manifest.json', manifest)
    write('source-provenance.json', provenance)
    write('flow-review.json', {'frameCount': 12, 'cyclesReviewed': 3, 'fluids': flow_reviews})

    # Composite uses exactly the layer order and placement in the exported metadata.
    background = Image.new('RGBA', (W, H), '#765569')
    for layer in layers:
        place(background, Image.open(OUT / layer['src']), layer['rect'])
    for fluid in fluids:
        place(background, Image.open(OUT / fluid['png']), fluid['rect'])
    background.alpha_composite(Image.open(OUT / 'terrain-atlas.png'))
    for layer in ['back', 'mid', 'front']:
        for o in sorted((o for o in objects if o['layer'] == layer), key=lambda o: o['footWorld'][1]):
            sprite = Image.open(OUT / o['sprite'])
            if o['flipX']:
                sprite = sprite.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            place(background, sprite, [o['x'], o['y'], o['w'], o['h']])
    background.resize((1600, 1250), Image.Resampling.LANCZOS).convert('RGB').save(
        OUT / 'composite-preview.jpg', quality=94)
    # Three visibly repeated loops, low-resolution review only (not extra terrain art).
    preview_frames = []
    for n in range(12):
        canvas = Image.new('RGBA', (640, 500), '#765569')
        for layer in layers:
            rect = [round(v*640/W) for v in layer['rect']]
            place(canvas, Image.open(OUT / layer['src']), rect)
        for fluid in fluids:
            rect = [round(v*640/W) for v in fluid['rect']]
            place(canvas, Image.open(OUT / fluid['frames'][n]['src']), rect)
        land = Image.open(OUT / 'terrain-atlas.png').resize(canvas.size, Image.Resampling.LANCZOS)
        canvas.alpha_composite(land)
        preview_frames.append(canvas.convert('RGB'))
    sequence = preview_frames * 3
    sequence[0].save(OUT / 'flow-three-loops.webp', save_all=True, append_images=sequence[1:],
                     duration=333, loop=1, quality=75)
    # Paired style crops are part of the reproducible final review pack.
    ref = Image.open(OUT / 'source-images/zone1-style.jpg')
    land = Image.open(OUT / 'terrain-atlas.png').convert('RGB')
    raw_cave = Image.open(OUT / 'source-images/cave-master.webp').convert('RGB')
    comparison = Image.new('RGB', (1600, 1050), '#272830')
    labels = ImageDraw.Draw(comparison)
    pairs = [
        ('ZONE 1 | accepted painterly reference', ref.crop((0, 240, 750, 690)), (0, 45)),
        ('B12 | terrain detail, shared alpha', land.crop((420, 680, 1545, 1355)), (810, 45)),
        ('ZONE 1 | worn cliffs, warm sunset', ref.crop((0, 200, 550, 565)), (0, 570)),
        ('B12 | guardian cave repaint', raw_cave.crop((175, 115, 1375, 910)), (810, 570)),
    ]
    for title, image, xy in pairs:
        comparison.paste(image.resize((790, 470), Image.Resampling.LANCZOS), xy)
        labels.text((xy[0]+10, xy[1]-30), title, fill='#f5d6b3')
    comparison.save(OUT / 'style-compare.jpg', quality=95)
    print(json.dumps({'world': [W, H], 'objects': len(objects), 'liquids': len(fluids),
                      'ImageGenCalls': 5, 'cavePixelExact': True}))


if __name__ == '__main__':
    main()
