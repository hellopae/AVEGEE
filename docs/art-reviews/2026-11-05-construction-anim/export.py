"""Pack genuinely drawn ImageGen cels; no synthesized animation poses.

Run from repository root: python3 docs/art-reviews/2026-11-05-construction-anim/export.py
Only crop, downsample to a common ground width, register the foot, and encode.
"""
from pathlib import Path
import hashlib
import json

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
FRAME = 704
FOOT = (352, 640)
WORLD = 256  # full sprite quad width; ground itself is about 218 world units
GROUND_WIDTH = 600
GROUND_WORLD = GROUND_WIDTH/FRAME*WORLD
FPS = 8
FONT = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 20)


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


def main():
    stages, reports, all_frames = [], {}, {}
    strip = Image.new('RGB', (8*256, 3*286), (40, 45, 52))
    draw = ImageDraw.Draw(strip)
    for stage in (1, 2, 3):
        cells = split(ROOT/f'sources/stage-{stage}-a.webp') + split(ROOT/f'sources/stage-{stage}-b.webp')
        frames, placement = [], []
        for cell in cells:
            frame, place = register(cell)
            frames.append(frame)
            placement.append(place)
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
        sheet.save(pending, lossless=True, method=6)
        with Image.open(pending) as encoded:
            assert encoded.mode == 'RGBA' and encoded.size == sheet.size
            encoded.load()
        pending.replace(path)
        # GIF on a neutral background deliberately makes edge contamination visible.
        previews = [composite(f).resize((528, 528), Image.Resampling.LANCZOS) for f in frames]
        previews[0].save(ROOT/f'preview/stage-{stage}.gif', save_all=True,
                         append_images=previews[1:], duration=[120,130]*4, loop=0, disposal=2)
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
        ground_masks = [(a[595:645,:,3] > 100) for a in aa]
        ground_iou = [round(float(np.sum(m & ground_masks[0])/np.sum(m | ground_masks[0])),5)
                      for m in ground_masks]
        lower_edge_spans = []
        for a in aa:
            spans = []
            for row in (600,620,635):
                xs = np.where(a[row,:,3] > 100)[0]
                spans.append([int(xs.min()),int(xs.max())] if len(xs) else None)
            lower_edge_spans.append(spans)
        max_edge_drift = max(abs(a-b) for spans in lower_edge_spans
                             for row,ref in zip(spans,lower_edge_spans[0]) if row and ref
                             for a,b in zip(row,ref))
        reports[str(stage)] = {'uniqueDrawnCels': len(set(hashes)), 'sha256': hashes,
            'visibleSHA256': visible_hashes,
            'packing': placement, 'adjacentCompositeMAEIncludingWrap': adjacent,
            'wrapToMedianInternalDelta': round(adjacent[-1]/np.median(adjacent[:-1]), 4),
            'edgeScreen': fringe,
            'lowerGroundSilhouetteIoUVersusFirst': ground_iou,
            'lowerGroundEdgeSpansAtY600620635': lower_edge_spans,
            'maxLowerGroundEdgeSpanDriftPx': max_edge_drift,
            'nativeGroundPixelsPerWorldUnit': [round(p['nativeGroundWidth']/GROUND_WORLD,4) for p in placement],
            'exportGroundPixelsPerWorldUnit': FRAME/WORLD}
        all_frames[stage] = frames
    strip.save(ROOT/'frame-strip.jpg', quality=92, subsampling=0)
    (ROOT/'construction.json').write_text(json.dumps({'version':1, 'layout':'single-row',
        'alpha':'straight', 'stages':stages}, indent=2)+'\n')
    (ROOT/'loop-review.json').write_text(json.dumps({'method':
        '8 separate ImageGen-drawn cels per stage, chronological order. Export downsampling normalizes ground width to 600 px, then integer foot registration. Every source cel appears once; no synthetic motion, interpolation, fading or duplicated cels. MAE measures image differences, not artistic acceptance.',
        'continuation': {
            'sourceWorktree':'20261110T121452Z-e5633251',
            'recovered':'stage-1.webp was 0 bytes; rebuilt from existing ImageGen sources stage-1-a and stage-1-b.',
            'newImageGenCalls':0,
            'acceptance1Status':'incomplete: static ground/post details drift between drawn cels',
            'runtimeQA':'not run'},
        'stages':reports,
        'visualReview': {
            'scope':'Source contact sheets, 24-cel strip and material/edge comparison inspected; edge comparison includes all three stages. Not an in-game QA run.',
            'observations':['Three distinct construction stages; no roof, walls or temple finials in selected art.',
                'Workers have drawn hammer, hauling, carrying and guiding poses; stage3 has scaffold workers.',
                'Red teak, sandstone and warm light compared with owner canteen screenshot.',
                'No obvious red/yellow fringe on white, dark and warm backgrounds in the comparison.'],
            'acceptance1': {
                'delivered':'3 stages x 8 unique drawn cels; common 600px ground width, 704px canvas and [352,640] foot; no roof/walls.',
                'limitation':'Fixed textures, post details and ground contour still vary slightly across ImageGen cels. Pixel-exact static registration and fully seamless playback are not certified.'},
            'acceptance2': {
                'delivered':'Owner material reference used, genuine RGBA retained, saturated red/yellow alpha-edge screen recorded for all 24 cels.',
                'limitation':'Style match is a visual judgment; edge thresholds do not detect every possible halo. No runtime map placement test.'}
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
