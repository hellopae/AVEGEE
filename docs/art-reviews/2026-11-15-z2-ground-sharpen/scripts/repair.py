"""Register drawn texture to existing terrain and blend only declared repairs.

The ImageGen donor supplies fine detail. Existing v7 supplies the registered
low-frequency scene. Optical flow resamples only the donor, never the map.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import shutil

import cv2
import numpy as np
from PIL import Image

from prepare import FULL, OUT, SOURCE, atlas

cv2.setNumThreads(2)


def gray(image):
    return cv2.cvtColor(image.astype(np.float32), cv2.COLOR_RGB2GRAY)


def blur(image, sigma):
    return cv2.GaussianBlur(image, (0, 0), sigma)


def laplacian_variance(image, mask):
    values = cv2.Laplacian(gray(image), cv2.CV_32F)[mask]
    return float(values.var())


def register(reference, donor):
    """Resample new drawing onto reference geometry, then preserve coarse forms."""
    height, width = reference.shape[:2]
    donor = cv2.resize(donor, (width, height), interpolation=cv2.INTER_LANCZOS4)
    small_size = (max(32, width // 2), max(32, height // 2))
    a = cv2.resize(gray(reference), small_size).astype(np.uint8)
    b = cv2.resize(gray(donor), small_size).astype(np.uint8)
    flow = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM).calc(a, b, None)
    flow = cv2.resize(flow, (width, height), interpolation=cv2.INTER_LINEAR) * 2
    flow = blur(flow, 2)
    yy, xx = np.mgrid[:height, :width].astype(np.float32)
    registered = cv2.remap(donor, xx + flow[..., 0], yy + flow[..., 1],
                           cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT101)
    return registered.astype(np.float32), float(np.linalg.norm(flow, axis=2).max())


def stone_detail(geometry, registered):
    """Use drawn grain while keeping source paving joints and architecture.

    ImageGen occasionally adds a medallion or changes the number of steps.
    Those low/mid-frequency donor shapes must never enter stone or rail areas.
    Where the donor disagrees, reuse an actual neutral stone-grain swatch from
    that drawing. The original geometry carries every joint and tread edge.
    """
    luminance = gray(registered)
    gradient = cv2.magnitude(cv2.Sobel(blur(luminance, 2), cv2.CV_32F, 1, 0),
                             cv2.Sobel(blur(luminance, 2), cv2.CV_32F, 0, 1))
    # A dedicated structure-free drawn stone texture avoids repeating donor
    # paving joints, ornaments, or stair edges in uncertain patches.
    patch = np.array(Image.open(OUT / 'generated/stone-grain.png').convert('RGB'), np.float32)
    patch = patch - blur(patch, 1.1)
    height, width = geometry.shape[:2]
    swatch = np.tile(patch, (height // patch.shape[0] + 1, width // patch.shape[1] + 1, 1))[:height, :width]
    raw = registered - blur(registered, 1.1)
    error = np.mean(np.abs(blur(geometry, 3) - blur(registered, 3)), axis=2)
    safe = np.exp(-((error / 10) ** 2))
    safe *= np.clip((35 - gradient) / 25, 0, 1)
    texture = raw * safe[..., None] + swatch * (1 - safe[..., None])
    # Source-derived edge restoration keeps the same edge centers and counts.
    edges = geometry - blur(geometry, 1.4)
    return geometry + .8 * edges + texture


def structure_trust(geometry, registered):
    """Local zero-displacement DoG correlation rejects invented donor shapes."""
    a = blur(gray(geometry), 3) - blur(gray(geometry), 12)
    b = blur(gray(registered), 3) - blur(gray(registered), 12)
    mean = lambda value: cv2.boxFilter(value, -1, (98, 98))
    ma, mb = mean(a), mean(b)
    va, vb = np.maximum(mean(a * a) - ma * ma, 0), np.maximum(mean(b * b) - mb * mb, 0)
    correlation = (mean(a * b) - ma * mb) / np.sqrt(np.maximum(va * vb, 1e-6))
    trust = np.clip((correlation - .7) / .2, 0, 1)
    trust[va < 1] = 0
    return blur(trust, 2)[..., None]


def minimum_path(cost):
    height, width = cost.shape
    dp = cost.copy()
    back = np.zeros(cost.shape, np.int8)
    for row in range(1, height):
        previous = np.pad(dp[row - 1], (1, 1), constant_values=np.inf)
        choices = np.stack((previous[:width], previous[1:width + 1], previous[2:]))
        best = choices.argmin(axis=0)
        back[row] = best - 1
        dp[row] += choices[best, np.arange(width)]
    path = np.empty(height, np.int32)
    path[-1] = dp[-1].argmin()
    for row in range(height - 1, 0, -1):
        path[row - 1] = path[row] + back[row, path[row]]
    return path


def perimeter(reference, candidate, ring):
    """Same four minimum-cost paths and +/-8px smoothstep as the v7 repair."""
    alpha = np.ones(reference.shape[:2], np.float32)
    paths = {}
    for side in ('left', 'right', 'top', 'bottom'):
        a, b = reference, candidate
        if side in ('top', 'bottom'):
            a, b = a.transpose(1, 0, 2), b.transpose(1, 0, 2)
        offset = 0 if side in ('left', 'top') else a.shape[1] - ring
        cost = blur(np.mean((a[:, offset:offset + ring] - b[:, offset:offset + ring]) ** 2, axis=2), 1)
        cost[:, :10] = np.inf
        cost[:, -10:] = np.inf
        path = minimum_path(cost) + offset
        t = np.clip((np.arange(a.shape[1])[None, :] - path[:, None] + 8) / 16, 0, 1)
        t = t * t * (3 - 2 * t)
        if side in ('right', 'bottom'):
            t = 1 - t
        if side in ('top', 'bottom'):
            t = t.T
        alpha *= t
        paths[side] = path.tolist()
    return alpha, paths


def cover_legacy_feather(item, alpha):
    """Cover the old blurry ring as well as its core, retaining +/-8px feather.

    A new unconstrained minimum-cost path could cut inside the old path and
    leave a blurry crescent. Use the old paths expanded outward by 16 output
    pixels as a minimum coverage, within the same original context rectangle.
    """
    records = json.loads((SOURCE / 'seams.json').read_text())['seams']
    paths = {r['id'].rsplit('/', 1)[-1]: r['pathInOverlapOutputPx'] for r in records
             if r['id'].startswith('fallback/' + item['id'] + '/')}
    if not paths:
        return alpha
    old = np.ones(alpha.shape, np.float32)
    for side in ('left', 'right', 'top', 'bottom'):
        height, width = alpha.shape
        if side in ('top', 'bottom'):
            height, width = width, height
        path = np.array(paths[side])
        assert path.shape == (height,)
        if side in ('left', 'top'):
            path = np.maximum(path - 16, 10)
        else:
            path = np.minimum(path + 16, 85) + width - 96
        t = np.clip((np.arange(width)[None, :] - path[:, None] + 8) / 16, 0, 1)
        t = t * t * (3 - 2 * t)
        if side in ('right', 'bottom'):
            t = 1 - t
        if side in ('top', 'bottom'):
            t = t.T
        old *= t
    return np.maximum(alpha, old)


def repair(item):
    name = item['id']
    reference = np.array(Image.open(OUT / 'inputs' / f'{name}-v7.png').convert('RGB'), np.float32)
    geometry = reference
    if item.get('geometrySource') == 'v2':
        geometry = np.array(Image.open(OUT / 'inputs' / f'{name}-v2.png').convert('RGB'), np.float32)
    donor = np.array(Image.open(OUT / 'generated' / f'{name}.png').convert('RGB'))
    registered, displacement = register(geometry, donor)
    # Red/green foliage accepts registered leaf silhouettes. Architecture uses
    # source edges and new drawn material grain, preventing invented structures.
    hsv = cv2.cvtColor(np.uint8(geometry), cv2.COLOR_RGB2HSV)
    red = ((hsv[..., 0] < 10) | (hsv[..., 0] > 172)) & (hsv[..., 1] > 90)
    green = (hsv[..., 0] > 35) & (hsv[..., 0] < 85) & (hsv[..., 1] > 45)
    foliage = blur((red | green).astype(np.float32), 1.5)[..., None]
    leaves = registered + blur(geometry - registered, 6)
    trust = np.maximum(foliage, structure_trust(geometry, registered))
    restored = stone_detail(geometry, registered) * (1 - trust) + leaves * trust
    if name == 'pale-source-feature':
        restored = leaves
    fine = restored - blur(restored, .7)
    base = blur(restored, .7)
    box = item['contextRectPx1x']
    x0, y0, x1, y1 = item['core']
    core = np.zeros(reference.shape[:2], bool)
    core[(y0 - box[1]) * 2:(y1 - box[1]) * 2,
         (x0 - box[0]) * 2:(x1 - box[0]) * 2] = True
    # An independent native annulus outside every known fallback, prepared
    # from decoded v7. The existing feather ring still contains blurry v2.
    native_rings = json.loads((OUT / 'native-ring.json').read_text())
    reference_variance = next(r['laplacian'] for r in native_rings if r['id'] == name)
    raw_variance = laplacian_variance(base + fine, core)
    gain = float(np.clip(np.sqrt(reference_variance / max(raw_variance, 1e-6)), .1, 3.0))
    candidate = np.clip(base + fine * gain, 0, 255)
    # Encode painted detail at requested q90 before exact-pixel atlas storage.
    buffer = io.BytesIO()
    Image.fromarray(np.uint8(np.rint(candidate))).save(buffer, 'WEBP', quality=90, method=5)
    buffer.seek(0)
    candidate = np.array(Image.open(buffer).convert('RGB'), np.float32)
    alpha, paths = perimeter(reference, candidate, (x0 - box[0]) * 2)
    alpha = cover_legacy_feather(item, alpha)
    result = np.uint8(np.rint(reference * (1 - alpha[..., None]) + candidate * alpha[..., None]))
    Image.fromarray(result).save(OUT / 'compare' / f'{name}-after.png')
    Image.fromarray(np.uint8(np.rint(alpha * 255))).save(OUT / 'compare' / f'{name}-mask.png')
    return candidate, alpha, dict(id=name, gain=gain, donorFlowMaxOutputPx=displacement,
                              ringWidthMapPx=x0 - box[0], featherRadiusOutputPx=8, paths=paths,
                              legacyFeatherOutwardExpansionOutputPx=16,
                              laplacianBefore=laplacian_variance(reference, core),
                              laplacianAfter=laplacian_variance(result, core),
                              laplacianRing=reference_variance)


def compose_missing_drawing():
    """Two native-sized crops replace the undersized first square generation."""
    paths = [OUT / 'generated' / f'missing-{part}.png' for part in ('top', 'bottom')]
    if not all(path.exists() for path in paths):
        return
    source = np.array(Image.open(OUT / 'inputs/missing-r2-c3-q22-v2.png').convert('RGB'))
    top, _ = register(source[:768], np.array(Image.open(paths[0]).convert('RGB')))
    bottom, _ = register(source[512:], np.array(Image.open(paths[1]).convert('RGB')))
    cost = blur(np.mean((top[512:] - bottom[:256]) ** 2, axis=2), 1).T
    cost[:, :10] = cost[:, -10:] = np.inf
    path = minimum_path(cost)
    alpha = np.clip((np.arange(256)[:, None] - path[None, :] + 8) / 16, 0, 1)
    alpha = alpha * alpha * (3 - 2 * alpha)
    overlap = top[512:] * (1 - alpha[..., None]) + bottom[:256] * alpha[..., None]
    result = np.concatenate((top[:512], overlap, bottom[256:]), axis=0)
    Image.fromarray(np.uint8(np.clip(np.rint(result), 0, 255))).save(OUT / 'generated/missing-r2-c3-q22.png')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--region')
    args = parser.parse_args()
    if not args.region or args.region == 'missing-r2-c3-q22':
        compose_missing_drawing()
    items = json.loads((OUT / 'regions.json').read_text())
    canvas = None if args.region else np.array(atlas(SOURCE / 'v7', FULL, 2048))
    coverage = None if args.region else np.zeros((FULL[1], FULL[0]), bool)
    results = []
    for item in items:
        if args.region and item['id'] != args.region:
            continue
        if not (OUT / 'generated' / f"{item['id']}.png").exists():
            raise FileNotFoundError(item['id'])
        candidate, alpha, report = repair(item)
        if canvas is not None:
            x, y, ex, ey = [v * 2 for v in item['contextRectPx1x']]
            current = canvas[y:ey, x:ex].astype(np.float32)
            canvas[y:ey, x:ex] = np.uint8(np.rint(current * (1 - alpha[..., None]) + candidate * alpha[..., None]))
            coverage[y:ey, x:ex] |= alpha > 0
        results.append(report)
        print(item['id'], report['gain'], report['laplacianAfter'] / report['laplacianRing'], flush=True)
    (OUT / ('pilot.json' if args.region else 'blend.json')).write_text(json.dumps(results, indent=2) + '\n')
    if canvas is not None:
        export(canvas, coverage, items)


def export(canvas, coverage, items):
    """Keep decoded v7 pixels exact outside the feather support.

    Donor composites have already been encoded at q90. Changed chunks use VP8L
    storage, since another lossy full-chunk encode violates pixel identity.
    Unchanged chunks are copied byte-for-byte from v7.
    """
    manifest = dict(zone='asia', version=8, fullPx=dict(w=FULL[0], h=FULL[1]), chunk=2048,
                    rows=4, cols=5, worldSize=dict(w=3840, h=2560), format='webp', quality=90,
                    repairs=False, imageGenCalls=len(json.loads((OUT / 'generation.json').read_text())['calls']),
                    visualAcceptanceVerified=False,
                    encoding='q90 repair composites, exact VP8L storage for changed chunks; unchanged VP8 copied',
                    repairedRegions=[item['id'] for item in items], files=[])
    for row in range(4):
        for col in range(5):
            name = f'r{row + 1}-c{col + 1}.webp'
            x, y = col * 2048, row * 2048
            ex, ey = min(x + 2048, FULL[0]), min(y + 2048, FULL[1])
            path = OUT / 'v8' / name
            changed = bool(coverage[y:ey, x:ex].any())
            if changed:
                Image.fromarray(canvas[y:ey, x:ex]).save(path, 'WEBP', lossless=True, quality=90, method=5)
            else:
                shutil.copyfile(SOURCE / 'v7' / name, path)
            manifest['files'].append(dict(file=name, width=ex - x, height=ey - y,
                                           rectPx2x=[x, y, ex - x, ey - y], bytes=path.stat().st_size,
                                           sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                                           storage='VP8L' if changed else 'copied v7 VP8'))
            print('exported', name, path.stat().st_size, flush=True)
    preview = 'zone2-terrain-v7-preview.webp'  # Required by the existing installer.
    Image.fromarray(canvas).resize((1536, 1024), Image.Resampling.LANCZOS).save(
        OUT / 'v8' / preview, 'WEBP', quality=90, method=5)
    Image.fromarray(canvas).resize((1920, 1280), Image.Resampling.LANCZOS).save(
        OUT / 'overview.jpg', quality=95, subsampling=0)
    Image.fromarray(coverage.astype(np.uint8) * 255).save(OUT / 'edit-support.png')
    manifest['imageBytes'] = sum(p.stat().st_size for p in (OUT / 'v8').glob('*.webp'))
    (OUT / 'v8/manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')


if __name__ == '__main__':
    main()
