"""Reassemble individually generated frames; never calls an image service.

Run from repository root: python3 docs/art-reviews/2026-11-20-guards/cyberhell-b/build_review.py
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw, ImageOps
from scipy import ndimage

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SPECS = json.loads((HERE / 'originals.json').read_text())


def measurements(im):
    a = np.array(im.getchannel('A'))
    mask = a >= 16
    yy, xx = np.where(mask)
    bbox = [int(xx.min()), int(yy.min()), int(xx.max()+1), int(yy.max()+1)]
    foot_y = bbox[3]-1
    # Midpoint of the ground footprint is stable when one sole is a few pixels
    # higher than the other. A centroid of the last scanline is not stable.
    band = max(1, round((bbox[3]-bbox[1])*.12))
    footprint_x = np.where(mask[max(0,foot_y-band+1):foot_y+1])[1]
    foot_x = float((int(footprint_x.min())+int(footprint_x.max()))/2)
    return {'bbox_alpha16': bbox, 'height': bbox[3]-bbox[1],
            'foot_x': round(foot_x, 3), 'foot_y': foot_y}


def clean(im):
    rgba = np.array(im.convert('RGBA'))
    mask = rgba[:, :, 3] >= 16
    labels, _ = ndimage.label(mask)
    sizes = np.bincount(labels.ravel())
    keep = sizes[labels] >= 64
    rgba[:, :, 3][~(mask & keep)] = 0
    im = Image.fromarray(rgba)
    return im.crop(im.getchannel('A').getbbox())


def match_walk_two_handedness(im):
    """Mirror the broad stride/tablet arm while retaining the left-facing head.

    The neck split and -22px neck alignment were inspected on the 1199x1312
    generation. This is a deterministic cutout/composite, not painted anatomy.
    """
    assert im.size == (1199,1312)
    arr = np.array(im.convert('RGBA'))
    mask = arr[:,:,3] >= 16
    mask[505:] = False
    labels,_ = ndimage.label(mask)
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    head = ndimage.binary_dilation(labels == sizes.argmax(),iterations=2)
    head[505:] = False
    head_rgba = arr.copy()
    head_rgba[:,:,3][~head] = 0
    body_rgba = arr.copy()
    body_rgba[:,:,3][head] = 0
    output = ImageOps.mirror(Image.fromarray(body_rgba))
    output.alpha_composite(Image.fromarray(head_rgba),(-22,0))
    return output


def place(im, original, size, variant=0, body_anchors=None):
    """Preserve body height and midpoint of the lower 12% ground footprint."""
    target = measurements(original)
    raw_bbox = im.getchannel('A').point(lambda v:255 if v>=16 else 0).getbbox()
    im = clean(im)
    if variant:
        # Small breathing/settling motion only; major poses are separately generated.
        im = im.transform(im.size, Image.Transform.AFFINE,
                          (1, variant*.006, -variant*.003*im.height, 0, 1, 0),
                          Image.Resampling.BICUBIC)
        im = clean(im)
    original_body_top = target['bbox_alpha16'][1]
    body_offset = 0
    if body_anchors:
        original_body_top, raw_body_top = body_anchors
        body_offset = raw_body_top-raw_bbox[1]
    target_body_height = target['foot_y']+1-original_body_top
    height = round(target_body_height * im.height/(im.height-body_offset))
    width = max(1, round(im.width * height/im.height))
    # Keep transparent margins inside the original runtime crop; preserve height.
    width = min(width, size[0]-4)
    for _ in range(size[0]):
        scaled = im.resize((width, height), Image.Resampling.LANCZOS)
        sm = measurements(scaled)
        x = round(target['foot_x']-sm['foot_x'])
        b = sm['bbox_alpha16']
        if x+b[0] >= 0 and x+b[2] <= size[0]:
            break
        width -= 1
    else:
        raise ValueError('Cannot fit support-foot anchor')
    y = target['foot_y']-sm['foot_y']
    output = Image.new('RGBA', size)
    output.alpha_composite(scaled, (x,y))
    measured = measurements(output)
    new_body_top = y+round(body_offset*height/im.height)
    new_body_height = measured['foot_y']+1-new_body_top
    return output, {'original': target, 'new': measured,
                    'foot_delta_px': [round(measured['foot_x']-target['foot_x'],3),
                                      measured['foot_y']-target['foot_y']],
                    'silhouette_height_delta_percent': round((measured['height']/target['height']-1)*100,3),
                    'body_height': {'original_top_y':original_body_top, 'new_top_y':new_body_top,
                                    'original_height':target_body_height,'new_height':new_body_height,
                                    'manual_raw_head_top':body_anchors[1] if body_anchors else None,
                                    'delta_percent':round((new_body_height/target_body_height-1)*100,3)},
                    'resize_xy': [width,height], 'placement_xy':[x,y]}


def preview_bg(im, size=None):
    if size:
        im = im.copy()
        im.thumbnail(size, Image.Resampling.LANCZOS)
    bg = Image.new('RGB', im.size, (38,40,51))
    bg.paste(im, (0,0), im)
    return bg


def build():
    report = {'scope':'cyberhell-b', 'imagegen_calls':12,
              'measurement_method':'alpha >=16; occupied silhouette includes held equipment; '
              'foot_y=lowest occupied pixel; foot_x=midpoint of occupied x extrema in lowest 12% of silhouette',
              'limitations':['Overhead combat frame 1 uses manually inspected crown anchors to exclude the raised recording slate; other frames use occupied silhouette top as crown proxy.',
                             'No game runtime QA performed. Visual review is recorded in README.'],
              'files':[]}
    pairs = []
    for spec in SPECS:
        name = spec['name']
        new_sheet = Image.new('RGBA', tuple(spec['size']))
        originals = Image.open(HERE/'source'/f'{name}.webp')
        animation = []
        entry = {'path':spec['path'], 'original_size':spec['size'], 'original_mode':spec['mode'],
                 'grid':spec['grid'], 'frame_count':len(spec['frames']), 'frames':[]}
        if name == 'walk':
            entry.update({'layout':'packed atlas', 'runtime_frame_size':spec['runtime_frame_size'],
                          'runtime_offsets':[f['offset'] for f in spec['frames']]})
        else:
            entry['cell_size'] = spec['cell']
        for f in spec['frames']:
            n = f['frame']
            if name == 'combat':
                source = {3:2, 5:0}.get(n,n)
                variant = {3:2, 5:-1}.get(n,0)
            elif name == 'idle':
                source,variant = 0,[0,1,2,1][n]
            else:
                source,variant = n,0
            raw = Image.open(HERE/'frames'/f'{name}-{source}-generated.png')
            handedness_fix = name == 'walk' and n == 2
            if handedness_fix:
                raw = match_walk_two_handedness(raw)
                raw.save(HERE/'frames/walk-2-composed.png')
            original = Image.open(HERE/'source'/f'{name}-{n}.png')
            if 'rect' in f:
                x,y,w,h = f['rect']
                size = (w,h)
            else:
                w,h = spec['cell']
                x,y = (n%spec['grid'][0])*w,(n//spec['grid'][0])*h
                size = (w,h)
            body_anchors = (137,325) if name == 'combat' and n == 1 else None
            final, metrics = place(raw, original, size, variant, body_anchors)
            final.save(HERE/'frames'/f'{name}-{n}.png')
            new_sheet.alpha_composite(final, (x,y))
            if name == 'walk':
                stage = Image.new('RGBA', tuple(spec['runtime_frame_size']))
                stage.alpha_composite(final,tuple(f['offset']))
            else:
                stage = final
            animation.append(preview_bg(stage))
            entry['frames'].append({'frame':n, 'rect':[x,y,w,h], 'generated_frame':source,
                                    'pillow_variant':variant,
                                    'pillow_handedness_composite':handedness_fix, **metrics})
        dest = ROOT/spec['path']
        new_sheet.save(dest, 'WEBP', lossless=True, exact=True)
        reread = Image.open(dest)
        entry.update({'new_size':list(reread.size), 'new_mode':reread.mode,
                      'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
        assert reread.size == tuple(spec['size']) and reread.mode == spec['mode']
        for f in entry['frames']:
            assert abs(f['foot_delta_px'][0]) <= 2 and abs(f['foot_delta_px'][1]) <= 2
            assert abs(f['body_height']['delta_percent']) <= 3
            x,y,w,h=f['rect']
            assert measurements(reread.crop((x,y,x+w,y+h))) == f['new']
        animation[0].save(HERE/f'{name}.gif',save_all=True,append_images=animation[1:],
                           duration=160 if name != 'idle' else 260,loop=0,disposal=2,optimize=False)
        with Image.open(HERE/f'{name}.gif') as gif:
            entry['gif_frames'] = gif.n_frames
            assert gif.n_frames == len(spec['frames'])
        report['files'].append(entry)
        pairs.append((name,preview_bg(originals,(1000,650)),preview_bg(new_sheet,(1000,650))))
    width = 2040
    height = sum(max(a.height,b.height)+48 for _,a,b in pairs)
    comparison = Image.new('RGB',(width,height),(25,27,35))
    draw = ImageDraw.Draw(comparison)
    y=0
    for name,old,new in pairs:
        draw.text((16,y+12),name+' / ORIGINAL',fill='white')
        draw.text((1032,y+12),name+' / WATSON-03',fill='white')
        comparison.paste(old,(16,y+36));comparison.paste(new,(1032,y+36))
        y+=max(old.height,new.height)+48
    comparison.save(HERE/'compare.jpg',quality=94)
    report['assertions_completed'] = ['file dimensions and RGBA mode','frame count and runtime rectangles',
                                       'support-foot xy tolerance','body-height tolerance with documented crown proxy','lossless WebP readback','GIF frame counts']
    (HERE/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'files':len(report['files']),'frames':sum(x['frame_count'] for x in report['files']),
                      'max_foot_xy_delta':max(max(abs(v) for v in f['foot_delta_px']) for s in report['files'] for f in s['frames']),
                      'max_body_height_delta_percent':max(abs(f['body_height']['delta_percent']) for s in report['files'] for f in s['frames'])},indent=2))


if __name__ == '__main__':
    build()
