"""Rasterize ground contours and their unions, preserving per-source unknowns."""

from PIL import Image, ImageChops, ImageDraw


def leaf_references(reference, name, ancestors=()):
    if name in ancestors:
        raise ValueError('Reference cycle: ' + ' -> '.join((*ancestors, name)))
    item = reference['masks'].get(name, reference.get('groundPatches', {}).get(name))
    if item is None:
        raise KeyError('Missing ground reference: ' + name)
    if 'definiteLiquidPolygons' in item:
        yield name, item
    for source in item.get('unionReferences', []):
        yield from leaf_references(reference, source, (*ancestors, name))


def reference_support(reference, name, target_rect):
    """Intersect each ground-labelled patch with the target, then union labels.

    Rectangles use map 1x. Contours use local native 2x. Unknown exclusions
    belong to their own source patch, so they cannot erase another observation.
    No production alpha, construction annotation or palette is read here.
    """
    tx, ty, tw, th = target_rect
    result = Image.new('L', (tw * 2, th * 2))
    for _, item in leaf_references(reference, name):
        sx, sy, sw, sh = item['groundRectMap1x']
        x0, y0 = max(tx, sx), max(ty, sy)
        x1, y1 = min(tx + tw, sx + sw), min(ty + th, sy + sh)
        if x0 >= x1 or y0 >= y1:
            continue
        patch = Image.new('L', ((x1 - x0) * 2, (y1 - y0) * 2))
        draw = ImageDraw.Draw(patch)
        for key, value in [('definiteLiquidPolygons', 255), ('unlabelledPolygons', 0)]:
            for polygon in item.get(key, []):
                draw.polygon([(x + (sx - x0) * 2, y + (sy - y0) * 2)
                              for x, y in polygon], fill=value)
        box = ((x0 - tx) * 2, (y0 - ty) * 2, (x1 - tx) * 2, (y1 - ty) * 2)
        result.paste(ImageChops.lighter(result.crop(box), patch), box[:2])
    return result
