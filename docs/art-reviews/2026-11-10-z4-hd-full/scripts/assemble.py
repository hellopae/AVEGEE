"""Register and assemble the eight archived ImageGen crops, with offline measurements.

Adapted from zone-1 scripts at bc9dc4dd and d54fac28. Writes this review pack only.
Run from any directory with Python 3, Pillow, numpy and OpenCV installed.
"""
import json
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1]
CHUNKS = [f'r4-c{c}' for c in range(2, 6)]
GAME_X = 2.8 / (4915 / 3840)
GAME_Y = 2.8 / (3277 / 2560)
FONT = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 20)
cv2.setNumThreads(2)
cv2.setRNGSeed(2345)

# Fixed source-space probes. Include named rock/path/bridge landmarks and a grid
# over the whole short row, retaining uncertain correspondences in the report.
LANDMARKS = {
    'r4-c2': [('foreground-rock-tip', 221, 24), ('crystal-base', 360, 169),
              ('foreground-east-tip', 593, 133), ('gold-crossing', 700, 102)],
    'r4-c3': [('bridge-left-edge', 332, 104), ('bridge-right-edge', 501, 105),
              ('bridge-stone-centre', 418, 151), ('west-rock-tip', 295, 61),
              ('east-gold-crossing', 752, 116)],
    'r4-c4': [('west-rock-tip', 180, 115), ('central-rock-tip', 396, 25),
              ('east-path-border', 849, 149), ('east-crystal-base', 921, 106)],
    'r4-c5': [('west-rock-tip', 146, 30), ('middle-rock-tip', 345, 62),
              ('path-gold-crossing', 499, 148), ('east-path-border', 674, 181)],
}


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def gray(array):
    return cv2.cvtColor(np.ascontiguousarray(array), cv2.COLOR_RGB2GRAY)


def register(folder, tile):
    name = tile['id']
    native = Image.open(folder / f'{name}-native.webp').convert('RGB')
    reference = Image.open(folder / f'inputs/{name}-v3.webp').convert('RGB')
    width, height = reference.size
    resized = np.array(native.resize(reference.size, Image.Resampling.LANCZOS))
    sift = cv2.SIFT_create(nfeatures=8000, contrastThreshold=.015)
    source_keys, source_desc = sift.detectAndCompute(gray(resized), None)
    target_keys, target_desc = sift.detectAndCompute(gray(np.array(reference)), None)
    if source_desc is None or target_desc is None:
        raise RuntimeError(f'No SIFT descriptors for {folder.name}/{name}')
    pairs = cv2.BFMatcher().knnMatch(source_desc, target_desc, k=2)
    matches = [a for a, b in pairs if a.distance < .74 * b.distance]
    if len(matches) < 6:
        raise RuntimeError(f'Insufficient matches for {folder.name}/{name}')
    source = np.float32([source_keys[m.queryIdx].pt for m in matches])
    target = np.float32([target_keys[m.trainIdx].pt for m in matches])
    affine, inliers = cv2.estimateAffinePartial2D(
        source, target, method=cv2.RANSAC, ransacReprojThreshold=2.5,
        maxIters=10000,
    )
    if affine is None or not .94 < np.linalg.det(affine[:, :2]) < 1.06:
        raise RuntimeError(f'Unreliable affine for {folder.name}/{name}')
    residual = np.linalg.norm(cv2.transform(source[None], affine)[0] - target, axis=1)
    residual = residual[inliers[:, 0] > 0]
    native_to_context = np.vstack([affine, [0, 0, 1]]) @ np.diag(
        [width / native.width, height / native.height, 1]
    )
    warp = (np.diag([2, 2, 1]) @ native_to_context)[:2]
    aligned = cv2.warpAffine(
        np.array(native), warp, (width * 2, height * 2),
        flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT,
    )
    valid = cv2.warpAffine(
        np.ones((native.height, native.width), np.uint8), warp,
        (width * 2, height * 2), flags=cv2.INTER_NEAREST,
        borderMode=cv2.BORDER_CONSTANT,
    )
    # Same broad-light correction as zone 1. Native pixels remain archived intact.
    ref = np.array(reference.resize((width * 2, height * 2), Image.Resampling.LANCZOS),
                   dtype=np.float32)
    delta = .8 * (cv2.GaussianBlur(ref, (0, 0), 70) -
                  cv2.GaussianBlur(aligned.astype(np.float32), (0, 0), 70))
    aligned = np.uint8(np.clip(aligned.astype(np.float32) + delta, 0, 255))
    x, y, _, _ = tile['contextMasterPx1x']
    to_master = np.array([[1, 0, x], [0, 1, y], [0, 0, 1]]) @ native_to_context
    record = dict(
        tile, nativeSize=list(native.size), affine=affine.tolist(),
        affineCoordinateConvention='resized native -> context-local 1x map pixels',
        nativeToContextPx1x=native_to_context[:2].tolist(),
        nativeToMasterPx1x=to_master[:2].tolist(),
        nativePxPerMapPixel=[native.width / width, native.height / height],
        siftMatches=len(matches), siftInliers=int(inliers.sum()),
        inlierResidualPx1x=dict(median=float(np.median(residual)),
                              p95=float(np.percentile(residual, 95)),
                              max=float(residual.max())),
        validWarpFraction=float(valid.mean()), localWarpApplied=False,
        lowFrequencyCorrection='0.8 delta, Gaussian sigma35 map px, no sharpening',
        semanticStructureVerified=False,
    )
    return aligned, record


def seam_blend(left, right, overlap=256):
    """Zone-1 minimum squared-colour cost, feather eight output pixels per side."""
    a = left[:, -overlap:].astype(np.float32)
    b = right[:, :overlap].astype(np.float32)
    cost = cv2.GaussianBlur(np.mean((a - b) ** 2, axis=2), (5, 5), 0)
    height, width = cost.shape
    cumulative = cost.copy()
    back = np.zeros((height, width), np.int16)
    for y in range(1, height):
        previous = np.pad(cumulative[y - 1], (1, 1), constant_values=np.inf)
        choices = np.stack([previous[:width], previous[1:width + 1], previous[2:]])
        choice = np.argmin(choices, axis=0) - 1
        back[y] = choice
        cumulative[y] += choices[choice + 1, np.arange(width)]
    path = np.zeros(height, np.int32)
    path[-1] = int(np.argmin(cumulative[-1]))
    for y in range(height - 1, 0, -1):
        path[y - 1] = path[y] + back[y, path[y]]
    weight = np.clip((np.arange(width)[None, :] - path[:, None] + 8) / 16, 0, 1)
    weight = weight * weight * (3 - 2 * weight)
    mix = np.uint8(np.clip(a * (1 - weight[:, :, None]) + b * weight[:, :, None], 0, 255))
    result = np.concatenate([left[:, :-overlap], mix, right[:, overlap:]], axis=1)
    return result, path


def structure(folder, old, new):
    def band(image):
        values = gray(image).astype(np.float32)
        return cv2.GaussianBlur(values, (0, 0), 1.5) - cv2.GaussianBlur(values, (0, 0), 6)

    before, after = band(old), band(new)
    width = old.shape[1]
    probes = LANDMARKS[folder.name] + [
        (f'grid-{x}-{y}', x, y) for y in [32, 100, 172] for x in range(48, width - 20, 96)
    ]
    records = []
    radius, search = 16, 12
    for name, x, y in probes:
        x0, y0 = max(0, x - radius - search), max(0, y - radius - search)
        x1, y1 = min(width, x + radius + search + 1), min(205, y + radius + search + 1)
        template = before[y - radius:y + radius + 1, x - radius:x + radius + 1]
        scores = cv2.matchTemplate(after[y0:y1, x0:x1], template, cv2.TM_CCOEFF_NORMED)
        _, correlation, _, location = cv2.minMaxLoc(scores)
        dx, dy = location[0] + x0 - (x - radius), location[1] + y0 - (y - radius)
        distance = math.hypot(dx, dy)
        records.append(dict(id=name, sourcePx1x=[x, y], displacementPx1x=[dx, dy],
                            distancePx1x=distance, normalizedCorrelation=correlation,
                            reliable=correlation >= .6, within4px=distance <= 4))
    reliable = [r for r in records if r['reliable']]
    report = dict(
        thresholdPx1x=4, method='Fixed source 33x33 DoG sigma1.5/6 templates, NCC search +/-12 map px',
        limitation='Local correspondences do not certify every semantic contour. Low-correlation probes retained.',
        totalProbes=len(records), reliableProbes=len(reliable),
        maxReliableDisplacementPx1x=max((r['distancePx1x'] for r in reliable), default=None),
        allReliableProbesWithin4px=bool(reliable) and all(r['within4px'] for r in reliable),
        wholeStructureWithin4pxVerified=False, semanticStructureVerified=False, probes=records,
    )
    write(folder / 'structure.json', report)
    sheet = Image.new('RGB', (width * 2 + 24, 275), '#161a22')
    sheet.paste(Image.fromarray(old), (0, 60))
    sheet.paste(Image.fromarray(new), (width + 24, 60))
    draw = ImageDraw.Draw(sheet)
    draw.text((8, 8), 'v3 source | fixed structure probes', font=FONT, fill='white')
    draw.text((width + 32, 8), '2x result | green <=4px / red >4px / yellow uncertain', font=FONT, fill='white')
    for record in records:
        x, y = record['sourcePx1x']
        dx, dy = record['displacementPx1x']
        color = '#f0cb35' if not record['reliable'] else '#35efb1' if record['within4px'] else '#ff4566'
        for ox, px, py in [(0, x, y), (width + 24, x + dx, y + dy)]:
            draw.ellipse((ox + px - 3, py + 57, ox + px + 3, py + 63), outline=color, width=1)
    sheet.save(folder / 'structure-check.jpg', quality=90, subsampling=0)
    return report


def laplacian(image):
    return float(cv2.Laplacian(gray(np.array(image)).astype(np.float64), cv2.CV_64F, ksize=1).var())


def process(chunk):
    folder = OUT / chunk
    tiles = json.loads((folder / 'inputs/tiles.json').read_text())
    images, registration = [], []
    for tile in tiles:
        aligned, record = register(folder, tile)
        images.append(aligned)
        registration.append(record)
    write(folder / 'registration.json', dict(chunk=chunk, outputScale=2,
          rectConvention='[x,y,width,height], 1x map pixels', overlapPerSidePx1x=64,
          neighborChunkSeamsApplied=False, tiles=registration))
    combined, path = seam_blend(*images)
    old = Image.open(folder / 'inputs/master-v3.webp').convert('RGB')
    width = old.width
    atlas = combined[128:538, 128:128 + width * 2]
    new = Image.fromarray(atlas)
    new.save(folder / f'{chunk}-2x.webp', lossless=True, method=6)
    split = tiles[0]['coreChunkPx1x'][2]
    seam = [[(split - 64) * 2 + int(value), y - 128]
            for y, value in enumerate(path) if 128 <= y < 538]
    write(folder / 'seams.json', dict(units='2x output pixels, chunk-local', featherHalfWidth=8, vertical=seam))
    metrics = {}
    for name, box in {'full_chunk': [0, 0, width, 205],
                      'left_half': [0, 0, split, 205],
                      'right_half': [split, 0, width, 205]}.items():
        x0, y0, x1, y1 = box
        size = (round((x1 - x0) * GAME_X), round((y1 - y0) * GAME_Y))
        a = laplacian(old.crop(box).resize(size, Image.Resampling.LANCZOS))
        b = laplacian(new.crop(tuple(v * 2 for v in box)).resize(size, Image.Resampling.LANCZOS))
        metrics[name] = dict(rectPx1x=box, deviceSize=list(size), v3LaplacianVariance=a,
                             newLaplacianVariance=b, laplacianRatio=b / a)
    write(folder / 'sharpness.json', dict(
        devicePxPerWorldUnit=2.8, devicePxPerMapPixel=[GAME_X, GAME_Y], threshold=10,
        primaryRoi='full_chunk', method='Decoded output, equal game zoom, Lanczos, grayscale Laplacian ksize1. No sharpening.',
        limitation='Texture and contrast affect the ratio. This metric is not a resolution multiplier.', rois=metrics,
    ))
    device_size = (round(width * GAME_X), round(205 * GAME_Y))
    compare = Image.new('RGB', (device_size[0] * 2 + 24, device_size[1] + 64), '#161a22')
    draw = ImageDraw.Draw(compare)
    for i, (label, image) in enumerate([('v3 master 1x', old), ('ImageGen assembled 2x', new)]):
        x = i * (device_size[0] + 24)
        draw.text((x + 8, 12), f'{chunk} | {label} | 2.8 device px/world unit', font=FONT, fill='white')
        compare.paste(image.resize(device_size, Image.Resampling.LANCZOS), (x, 64))
    compare.save(folder / f'{chunk}-compare.jpg', quality=90, subsampling=0)
    preview = new.copy()
    ImageDraw.Draw(preview).line(seam, fill='#00e7ff', width=2)
    sheet = Image.new('RGB', (width * 2, 970), '#161a22')
    sheet.paste(new, (0, 54))
    sheet.paste(preview, (0, 540))
    draw = ImageDraw.Draw(sheet)
    draw.text((8, 12), f'{chunk} | assembled native 2x output', font=FONT, fill='white')
    draw.text((8, 496), 'Cyan = actual min-cost seam | 16px feather width', font=FONT, fill='white')
    sheet.save(folder / 'seam-check.jpg', quality=90, subsampling=0)
    st = structure(folder, np.array(old), np.array(new.resize(old.size, Image.Resampling.LANCZOS)))
    return dict(chunk=chunk, completeParts=[t['id'] for t in tiles], pendingParts=[],
                nativeSizes={r['id']: r['nativeSize'] for r in registration}, outputSize=list(new.size),
                structureMaxReliablePx1x=st['maxReliableDisplacementPx1x'],
                structureReliableProbes=st['reliableProbes'], structureTotalProbes=st['totalProbes'],
                wholeStructureWithin4pxVerified=False,
                structureProbesOver4px=[r['id'] for r in st['probes'] if r['reliable'] and not r['within4px']],
                sharpnessRatioLaplacian=metrics['full_chunk']['laplacianRatio'])


if __name__ == '__main__':
    results = [process(chunk) for chunk in CHUNKS]
    manifest = json.loads((OUT / 'generation-prompts.json').read_text())
    write(OUT / 'run-summary.json', dict(
        zone=4, sourceSet='v3', chunks=results, imageGenCalls=len(manifest['generations']),
        generationLimit=16, tool=manifest['tool'], pendingParts=[],
        qualityDecision='Pending Claude review of measurements and images',
        pendingQualityReview=['r4-c2 structure probes above 4px',
                              'Whole semantic contours and seam appearance for all four chunks'],
        visualReviewFile='visual-review.json',
        neighborChunkSeamsApplied=False, qaPassedClaimed=False, inGameTestRun=False,
    ))
    print(json.dumps(results, ensure_ascii=False, indent=2))
