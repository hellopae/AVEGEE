"""Pack genuinely drawn ImageGen cels; no synthesized animation poses.

Run from repository root: python3 docs/art-reviews/2026-11-05-construction-anim/export.py
Crop and register original cels, retain a static scene outside motion masks, encode.
"""
from pathlib import Path
import hashlib
import json

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
FRAME = 704
FOOT = (352, 640)
WORLD = 256  # full sprite quad width; ground itself is about 218 world units
GROUND_WIDTH = 600
GROUND_WORLD = GROUND_WIDTH/FRAME*WORLD
FPS = 8
FONT = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 20)

# Registered-canvas coordinates. These cover the union of the original drawn
# poses, including their tools, loads and ropes. No position changes over time.
MOTION_REGIONS = {
    1: [
        [(407, 165), (454, 165), (454, 255), (407, 255)],
        [(277, 343), (364, 343), (364, 445), (277, 445)],
        [(149, 441), (237, 441), (237, 558), (149, 558)],
        [(293, 503), (371, 503), (371, 587), (293, 587)],
        [(389, 472), (486, 472), (486, 574), (389, 574)],
    ],
    2: [
        [(293, 325), (352, 325), (352, 434), (293, 434)],
        [(149, 422), (241, 422), (241, 561), (149, 561)],
        [(407, 170), (448, 170), (448, 214), (470, 225),
         (414, 419), (367, 419), (403, 272), (414, 220)],
        [(374, 394), (405, 394), (374, 470), (478, 470),
         (478, 586), (302, 590), (281, 582), (300, 545),
         (300, 475), (344, 475)],
    ],
    3: [
        [(136, 326), (212, 326), (212, 413), (136, 413)],
        [(281, 300), (362, 300), (362, 393), (281, 393)],
        [(414, 166), (446, 166), (446, 214), (516, 306),
         (490, 329), (430, 234), (388, 326), (359, 330), (412, 212)],
        [(343, 299), (542, 284), (552, 340), (343, 365)],
        [(485, 334), (509, 334), (456, 521), (437, 534),
         (423, 523), (441, 490)],
        [(317, 477), (501, 477), (501, 587), (317, 587)],
    ],
}


def motion_mask(stage):
    mask = Image.new('L', (FRAME, FRAME))
    draw = ImageDraw.Draw(mask)
    for polygon in MOTION_REGIONS[stage]:
        draw.polygon(polygon, fill=255)
    # A fixed 3px transition softens ground-texture seams. Full-strength mask
    # still covers every pose. It never reaches the lower base contour.
    return mask.filter(ImageFilter.GaussianBlur(1))


def clean_alpha(frame):
    a = np.array(frame)
    # The original generated cutouts contain saturated RGB at alpha 1..8.
    # Discard that nearly transparent fringe and clear all invisible RGB.
    a[a[:, :, 3] <= 8] = 0
    return Image.fromarray(a)


def stabilize(frames, mask):
    reference = frames[0]
    return [Image.composite(frame, reference, mask) for frame in frames]


def pale_spirit_pixels(a):
    # Conservative color screen for the supplied blue-white ghost artwork.
    # It catches feet/hands clipped by a motion-mask edge, alongside visual review.
    return ((a[:, :, 0] > 90) & (a[:, :, 2] >= a[:, :, 0])
            & (a[:, :, 1] >= a[:, :, 0]) & (a[:, :, 3] > 20))


def composite(im, color=(58, 65, 72)):
    bg = Image.new('RGBA', im.size, (*color, 255))
    bg.alpha_composite(im)
    return bg.convert('RGB')


def split(source):
    im = Image.open(source).convert('RGBA')
    assert im.width % 2 == 0 and im.height % 2 == 0
    w, h = im.width // 2, im.height // 2
    return [im.crop((x*w, y*h, (x+1)*w, (y+1)*h)) for y in range(2) for x in range(2)]


def ground_box(im):
    a = np.array(im)
    mask = a[:, :, 3] > 100
    # Use only lower half for foot measurement, excluding boom/load silhouettes.
    mask[:im.height // 2] = False
    ys, xs = np.where(mask)
    return [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]


def register(im):
    native_size = im.size
    native_box = ground_box(im)
    native_width = native_box[2]-native_box[0]+1
    assert native_width >= GROUND_WIDTH, 'never upscale generated artwork'
    # Normalize export footprint only, never invent motion or additional poses.
    target_w = round(im.width*GROUND_WIDTH/native_width)
    original = im
    for _ in range(5):
        # Bilinear avoids LANCZOS color ringing on very low-alpha wood edges.
        im = original.resize((target_w,round(original.height*target_w/original.width)),
                             Image.Resampling.BILINEAR)
        box = ground_box(im)
        width = box[2]-box[0]+1
        if width == GROUND_WIDTH:
            break
        target_w += GROUND_WIDTH-width
    assert width == GROUND_WIDTH, f'ground width {width}'
    a = np.array(im)
    # Stable integer convention for even-width ground; avoid banker's-rounding jitter.
    origin = (box[0] + width//2, box[3])
    delta = (FOOT[0] - origin[0], FOOT[1] - origin[1])
    canvas = Image.new('RGBA', (FRAME, FRAME))
    canvas.paste(im, delta)
    # Prove packing did not crop any visible generated pixels.
    assert np.array(canvas)[:, :, 3].sum() == a[:, :, 3].sum(), 'clipped source'
    return canvas, {'sourceSize': list(native_size), 'sourceGroundBox': native_box,
                    'nativeGroundWidth': native_width, 'resampledGroundBox': box,
                    'integerOffset': list(delta), 'groundWidth': width,
                    'scale': round(target_w/original.width,6), 'foot': list(FOOT)}


def delta(a, b):
    # Composite over neutral grey so hidden transparent RGB cannot affect metrics.
    a = np.asarray(composite(a)).astype(float)
    b = np.asarray(composite(b)).astype(float)
    return float(np.mean(np.abs(a-b)))


def ground_metrics(frames):
    arrays = [np.array(f) for f in frames]
    masks = [a[595:645, :, 3] > 100 for a in arrays]
    ious = [round(float(np.sum(m & masks[0])/np.sum(m | masks[0])), 5)
            for m in masks]
    spans = []
    for a in arrays:
        rows = []
        for y in (600, 620, 635):
            xs = np.where(a[y, :, 3] > 100)[0]
            rows.append([int(xs.min()), int(xs.max())] if len(xs) else None)
        spans.append(rows)
    drift = max(abs(a-b) for rows in spans
                for row, ref in zip(rows, spans[0]) if row and ref
                for a, b in zip(row, ref))
    return {'lowerGroundSilhouetteIoUVersusFirst': ious,
            'lowerGroundEdgeSpansAtY600620635': spans,
            'maxLowerGroundEdgeSpanDriftPx': drift}


def main():
    stages, reports, all_frames = [], {}, {}
    strip = Image.new('RGB', (8*256, 3*286), (40, 45, 52))
    draw = ImageDraw.Draw(strip)
    alignment = Image.new('RGB', (4*352, 3*396), (40, 45, 52))
    ad = ImageDraw.Draw(alignment)
    gif_review = Image.new('RGB', (4*352, 3*396), (40, 45, 52))
    gd = ImageDraw.Draw(gif_review)
    for stage in (1, 2, 3):
        cells = split(ROOT/f'sources/stage-{stage}-a.webp') + split(ROOT/f'sources/stage-{stage}-b.webp')
        frames, placement = [], []
        for cell in cells:
            frame, place = register(cell)
            frames.append(frame)
            placement.append(place)
        before = ground_metrics(frames)
        raw_frames = [clean_alpha(f) for f in frames]
        mask = motion_mask(stage)
        mask.save(ROOT/f'sources/motion-mask-stage-{stage}.png')
        frames = [clean_alpha(f) for f in stabilize(raw_frames, mask)]
        fixed = np.array(mask) == 0
        core = np.array(mask) == 255
        raw = [np.array(f) for f in raw_frames]
        current = [np.array(f) for f in frames]
        static_changes = [int(np.sum(np.any(a[fixed] != current[0][fixed], axis=1)))
                          for a in current]
        core_changes = [int(np.sum(np.any(a[core] != b[core], axis=1)))
                        for a, b in zip(current, raw)]
        uncovered_spirit_pixels = [int(np.sum(pale_spirit_pixels(a) & ~core)) for a in raw]
        assert static_changes == core_changes == [0]*8
        assert uncovered_spirit_pixels == [0]*8, 'pale spirit at mask boundary'
        sheet = Image.new('RGBA', (FRAME*8, FRAME))
        for i, frame in enumerate(frames):
            sheet.paste(frame, (i*FRAME, 0))
            thumb = composite(frame).resize((256, 256), Image.Resampling.LANCZOS)
            strip.paste(thumb, (i*256, (stage-1)*286+30))
            draw.text((i*256+8, (stage-1)*286+5), f'Stage {stage} / {i+1:02}', font=FONT, fill='white')
        path = ROOT/f'stage-{stage}.webp'
        # Keep the last complete atlas if encoding is interrupted; a direct save
        # previously left stage-1.webp empty in the source handoff.
        pending = path.with_suffix('.pending.webp')
        sheet.save(pending, lossless=True, method=6, exact=True)
        with Image.open(pending) as encoded:
            assert encoded.mode == 'RGBA' and encoded.size == sheet.size
            encoded.load()
        pending.replace(path)
        # GIF on a neutral background deliberately makes edge contamination visible.
        previews = [composite(f).resize((528, 528), Image.Resampling.LANCZOS) for f in frames]
        previews[0].save(ROOT/f'preview/stage-{stage}.gif', save_all=True,
                         append_images=previews[1:], duration=[120,130]*4, loop=0, disposal=2)
        y = (stage-1)*396
        annotated = composite(frames[0]).convert('RGBA')
        tint = Image.new('RGBA', annotated.size, (36, 194, 255, 0))
        tint.putalpha(mask.point(lambda v: round(v*0.35)))
        annotated.alpha_composite(tint)
        before_diff = np.abs(np.array(composite(raw_frames[-1])).astype(int)
                             - np.array(composite(raw_frames[0])).astype(int))
        after_diff = np.abs(np.array(composite(frames[-1])).astype(int)
                            - np.array(composite(frames[0])).astype(int))
        panels = [composite(frames[0]), annotated.convert('RGB'),
                  Image.fromarray(np.clip(before_diff*5, 0, 255).astype('uint8')),
                  Image.fromarray(np.clip(after_diff*5, 0, 255).astype('uint8'))]
        labels = [f'Stage {stage}: fixed reference', 'Cyan: original drawn motion',
                  f'Before: base drift {before["maxLowerGroundEdgeSpanDriftPx"]}px',
                  'After: base drift 0px / delta x5']
        for i, (panel, label) in enumerate(zip(panels, labels)):
            alignment.paste(panel.resize((352,352),Image.Resampling.LANCZOS),(i*352,y+44))
            ad.text((i*352+6,y+10), label, font=FONT, fill='white')
        with Image.open(ROOT/f'preview/stage-{stage}.gif') as gif:
            for col, cel in enumerate((6,7,0,1)):
                gif.seek(cel)
                panel = gif.convert('RGB').resize((352,352),Image.Resampling.LANCZOS)
                gif_review.paste(panel, (col*352,y+44))
                gd.text((col*352+8,y+10), f'Stage {stage} GIF / {cel+1:02}',font=FONT,fill='white')
        stages.append({'stage': stage, 'file': path.name, 'frames': 8, 'frameW': FRAME,
                       'frameH': FRAME, 'fps': FPS, 'foot': list(FOOT), 'worldWidth': WORLD,
                       'groundWidthPx': GROUND_WIDTH, 'groundWorldWidth': GROUND_WORLD})
        aa = [np.array(f) for f in frames]
        hashes = [hashlib.sha256(f.tobytes()).hexdigest() for f in frames]
        visible_hashes = []
        for a in aa:
            canonical = a.copy()
            canonical[canonical[:,:,3] == 0,:3] = 0
            visible_hashes.append(hashlib.sha256(canonical.tobytes()).hexdigest())
        adjacent = [round(delta(frames[i], frames[(i+1)%8]), 5) for i in range(8)]
        fringe = []
        for a in aa:
            edge = (a[:,:,3] > 8) & (a[:,:,3] < 248)
            red = (a[:,:,0] > 180) & (a[:,:,1] < 65) & (a[:,:,2] < 65)
            yellow = (a[:,:,0] > 210) & (a[:,:,1] > 190) & (a[:,:,2] < 45)
            fringe.append({'saturatedRedEdgePixels': int(np.sum(edge & red)),
                           'saturatedYellowEdgePixels': int(np.sum(edge & yellow)),
                           'transparentFraction': round(float(np.mean(a[:,:,3] == 0)), 5),
                           'partialAlphaPixels': int(np.sum(edge))})
        reports[str(stage)] = {'uniqueDrawnCels': len(set(hashes)), 'sha256': hashes,
            'visibleSHA256': visible_hashes,
            'packing': placement, 'adjacentCompositeMAEIncludingWrap': adjacent,
            'wrapToMedianInternalDelta': round(adjacent[-1]/np.median(adjacent[:-1]), 4),
            'edgeScreen': fringe,
            **ground_metrics(frames),
            'beforeStaticLayer': before,
            'staticLayer': {
                'referenceCel': 1,
                'mask': f'sources/motion-mask-stage-{stage}.png',
                'maskSHA256': hashlib.sha256(mask.tobytes()).hexdigest(),
                'staticPixelCount': int(np.sum(fixed)),
                'staticPixelsChangedVersusReference': static_changes,
                'motionCorePixelCount': int(np.sum(core)),
                'motionCorePixelsChangedVersusOriginalCel': core_changes,
                'paleBlueWhitePixelScreenOutsideCore': uncovered_spirit_pixels,
                'originalCelSHA256': [hashlib.sha256(a.tobytes()).hexdigest() for a in raw],
                'motionCoreSHA256': [hashlib.sha256(a[core].tobytes()).hexdigest() for a in current],
            },
            'nativeGroundPixelsPerWorldUnit': [round(p['nativeGroundWidth']/GROUND_WORLD,4) for p in placement],
            'exportGroundPixelsPerWorldUnit': FRAME/WORLD}
        all_frames[stage] = frames
    strip.save(ROOT/'frame-strip.jpg', quality=92, subsampling=0)
    alignment.save(ROOT/'alignment-review.jpg', quality=92, subsampling=0)
    gif_review.save(ROOT/'gif-review.jpg', quality=92, subsampling=0)
    (ROOT/'construction.json').write_text(json.dumps({'version':1, 'layout':'single-row',
        'alpha':'straight', 'stages':stages}, indent=2)+'\n')
    (ROOT/'loop-review.json').write_text(json.dumps({'method':
        '8 original ImageGen-drawn cels per stage, chronological order. Normalize width to 600px and register foot. Keep cel 1 outside fixed motion masks; retain each original cel inside masks with a fixed 3px transition. Cull alpha <=8 fringe. No temporal interpolation, translated poses or duplicated cels. MAE is descriptive, not artistic acceptance.',
        'continuation': {
            'sourceWorktree':'20261110T160026Z-062c773b',
            'change':'Preserve 24 drawn cels; replace static scene pixels with cel 1 outside fixed motion masks.',
            'newImageGenCalls':0,
            'runtimeQA':'not run'},
        'stages':reports,
        'visualReview': {
            'evidence':'See README.md for the visual inspection and acceptance self-check. This report contains reproducible pixel/container checks.',
            'limitation':'Textures inside motion regions remain part of original drawn cels; no runtime map placement test.'
        }}, indent=2)+'\n')
    # Compare wood/stone materials directly with the owner screenshot and HD terrain.
    compare = Image.new('RGB', (1500, 2000), (40,45,52))
    d = ImageDraw.Draw(compare)
    reference = Image.open(ROOT/'sources/style-reference.jpg').convert('RGB')
    reference.thumbnail((550, 440), Image.Resampling.LANCZOS)
    compare.paste(reference, (20,50))
    d.text((20,15), 'Owner reference: warm teak / sandstone / HD ground', font=FONT, fill='white')
    for stage in (1,2,3):
        x = 570+(stage-1)*310
        compare.paste(composite(all_frames[stage][0]).resize((310,310),Image.Resampling.LANCZOS),(x,110))
        d.text((x+12,65), f'Construction stage {stage}', font=FONT,fill='white')
    for stage in (1,2,3):
        y = 500+(stage-1)*500
        for i, color in enumerate([(245,245,245),(26,28,32),(121,92,65)]):
            compare.paste(composite(all_frames[stage][2],color).resize((490,490),Image.Resampling.LANCZOS),(i*500,y))
        d.rectangle((0,y+455,1500,y+500),fill=(40,45,52))
        for i,label in enumerate(['white','dark','warm ground']):
            d.text((i*500+12,y+467),f'Stage {stage} edge on {label}',font=FONT,fill='white')
    compare.save(ROOT/'style-compare.jpg', quality=92,subsampling=0)
    print(json.dumps({'stages':{k:{'unique':v['uniqueDrawnCels'],
        'delta':v['adjacentCompositeMAEIncludingWrap'],'wrapRatio':v['wrapToMedianInternalDelta'],
        'groundWidths':[p['groundWidth'] for p in v['packing']]} for k,v in reports.items()}},indent=2))


if __name__ == '__main__':
    main()
