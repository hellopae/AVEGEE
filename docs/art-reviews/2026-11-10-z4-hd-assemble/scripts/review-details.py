"""Additional offline evidence from decoded shipping tiles; no asset mutations."""
import cv2
import numpy as np
from PIL import Image, ImageDraw

from assemble import O, baseline, inventory, normalize, write_json
from verify import FONT, GAME_X, GAME_Y, decoded_master


def main():
    old, new = baseline(), decoded_master()
    new.crop((8780,0,9250,900)).save(O/'seam-check/sky-internal-detail.jpg', quality=95, subsampling=0)
    details = O/'structure-details'
    details.mkdir(exist_ok=True)
    rois = {
        'west-cliff-top': [0, 1010, 600, 1190],
        'west-plaza-rim': [350, 1200, 600, 1400],
        'west-rocks': [0, 1350, 500, 1620],
        'west-bank': [0, 1640, 300, 1970],
        'lava-lip': [1350, 1670, 1510, 1850],
        'upper-stair-head': [1680, 550, 1900, 740],
        'east-stair': [4390, 685, 4600, 875],
        'south-rocks': [1200, 3100, 1340, 3260],
    }
    for label, box in rois.items():
        w, h = (box[2]-box[0])*2, (box[3]-box[1])*2
        sheet = Image.new('RGB', (w*2+12, h+40), '#151923')
        sheet.paste(old.crop(box).resize((w, h), Image.Resampling.LANCZOS), (0, 40))
        sheet.paste(new.crop(tuple(v*2 for v in box)), (w+12, 40))
        ImageDraw.Draw(sheet).text((8, 8), label+' -- v3 | decoded v7 at 2x map px', font=FONT, fill='white')
        sheet.save(details/(label+'.jpg'), quality=95, subsampling=0)
    write_json(details/'rois.json', dict(rectFormat='global XYXY, map1x', rois=rois))

    # Retest the upstream exceptions with their original filters/windows too.
    # These results coexist with verify.py's fixed DoG49 method; none are discarded.
    a = cv2.cvtColor(np.array(old), cv2.COLOR_RGB2GRAY).astype(np.float32)
    b = cv2.cvtColor(np.array(new.resize(old.size, Image.Resampling.LANCZOS)), cv2.COLOR_RGB2GRAY).astype(np.float32)
    dog = lambda im: cv2.GaussianBlur(im, (0, 0), 1.5)-cv2.GaussianBlur(im, (0, 0), 6)
    points = [
        ('r1-c2/upper-stair-head', 1796, 643, 20, 24, 'lowpass2'),
        ('r1-c5/stair-top', 4537, 782, 22, 24, 'lowpass2'),
        ('r4-c2/grid-240-100', 1264, 3172, 16, 12, 'DoG1.5/6'),
        ('r4-c2/grid-720-172', 1744, 3244, 16, 12, 'DoG1.5/6'),
    ]
    records = []
    for label, x, y, radius, search, method in points:
        aa, bb = (dog(a), dog(b)) if method.startswith('DoG') else (
            cv2.GaussianBlur(a, (0, 0), 2), cv2.GaussianBlur(b, (0, 0), 2))
        template = aa[y-radius:y+radius+1, x-radius:x+radius+1]
        area = bb[y-radius-search:y+radius+search+1, x-radius-search:x+radius+search+1]
        _, score, _, loc = cv2.minMaxLoc(cv2.matchTemplate(area, template, cv2.TM_CCOEFF_NORMED))
        dx, dy = loc[0]-search, loc[1]-search
        records.append(dict(id=label, sourcePx1x=[x, y], method=method,
            templateSize=2*radius+1, searchRadius=search, displacementPx1x=[dx, dy],
            distancePx1x=float(np.hypot(dx, dy)), normalizedCorrelation=score))
    write_json(details/'upstream-exceptions-retest.json', dict(probes=records,
        limitation='Original diagnostic methods applied to final decoded atlas. Filter/window choice affects texture matching; no whole-contour guarantee.'))

    # All internal quadrant boundaries at the same game zoom as the seven main edges.
    dest = O/'seam-check/internal'
    dest.mkdir(exist_ok=True)
    internal = []
    coverage = []
    for chunk, path in inventory().items():
        parts = normalize(chunk, path)
        x, y = parts[0]['corePx1x'][:2]
        w, h = min(1024, 4915-x), min(1024, 3277-y)
        sx = parts[1]['corePx1x'][0]*2
        boxes = [('vertical', [sx-160, y*2, sx+160, (y+h)*2])]
        if h == 1024:
            sy = (y+512)*2
            boxes.append(('horizontal', [x*2, sy-160, (x+w)*2, sy+160]))
        pieces = []
        for axis, box in boxes:
            im = new.crop(box)
            if axis == 'vertical':
                im = im.transpose(Image.Transpose.ROTATE_90)
            scale = GAME_Y/2 if axis == 'vertical' else GAME_X/2
            im = im.resize((round(im.width*scale), round(im.height*scale)), Image.Resampling.LANCZOS)
            pieces.append((axis, im))
            internal.append(dict(chunk=chunk, axis=axis, rectPx2x=box))
        sheet = Image.new('RGB', (max(im.width for _, im in pieces), sum(im.height+40 for _, im in pieces)), '#151923')
        offset = 0
        for axis, im in pieces:
            ImageDraw.Draw(sheet).text((8, offset+8), f'{chunk} {axis}; decoded v7; 2.8 px/world; view100%', font=FONT, fill='white')
            sheet.paste(im, (0, offset+40))
            offset += im.height+40
        sheet.save(dest/(chunk+'.jpg'), quality=95, subsampling=0)
        for t in parts:
            cx, cy, cw, ch = t['contextPx1x']
            nw, nh = t['nativeSize']
            matrix = np.array(t['nativeToContextPx1x'])*2
            matrix[:, 2] += .5
            valid = cv2.warpAffine(np.ones((nh, nw), np.uint8), matrix, (cw*2, ch*2),
                flags=cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT)
            coverage.append(dict(chunk=chunk, part=t['id'], contextPx1x=t['contextPx1x'],
                reflectedContextSamples=int(np.count_nonzero(valid == 0)),
                contextSamples=int(valid.size)))
    write_json(dest/'index.json', dict(devicePxPerWorldUnit=2.8, regions=internal,
        note='Each vertical band includes both q-row seams; the horizontal band includes the q-row join. Full chunk extent, decoded shipping pixels.'))
    write_json(O/'border-reflection.json', dict(parts=coverage,
        note='Native-to-context domain diagnostic, before joining. BORDER_REFLECT extends generated pixels only where affine exceeds native bounds. Counts are not final atlas counts: overlaps are composited and clipped. No v3 fallback used.'))
    print('Wrote eight structure comparisons, four inherited-probe retests, 20 internal seam sheets and 70 context-domain diagnostics.')


if __name__ == '__main__':
    main()
