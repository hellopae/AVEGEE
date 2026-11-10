"""Reference SIFT/partial-affine + min-cost seam workflow, for r1-c1 and r2-c1 only.
Native pixels stay lossless. No sharpening, optical flow, or inter-chunk stitching.
"""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1]
MANIFEST = json.loads((OUT / 'generation-prompts.json').read_text())
FONT = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 24)


def seam_blend(left, right, overlap=256):
    """Reference squared-color minimum-cost path with 8px feather on either side."""
    a = left[:, -overlap:].astype(np.float32)
    b = right[:, :overlap].astype(np.float32)
    cost = cv2.GaussianBlur(np.mean((a-b)**2, axis=2), (5, 5), 0)
    h, w = cost.shape
    dp = cost.copy()
    back = np.zeros((h, w), np.int16)
    for y in range(1, h):
        prev = np.pad(dp[y-1], (1, 1), constant_values=np.inf)
        choices = np.stack([prev[:w], prev[1:w+1], prev[2:]])
        choice = np.argmin(choices, axis=0)-1
        back[y] = choice
        dp[y] += choices[choice+1, np.arange(w)]
    path = np.zeros(h, np.int32)
    path[-1] = int(np.argmin(dp[-1]))
    for y in range(h-1, 0, -1):
        path[y-1] = path[y]+back[y, path[y]]
    t = np.clip((np.arange(w)[None, :]-path[:, None]+8)/16, 0, 1)
    t = t*t*(3-2*t)
    mix = np.uint8(np.clip(a*(1-t[:, :, None])+b*t[:, :, None], 0, 255))
    return np.concatenate([left[:, :-overlap], mix, right[:, overlap:]], axis=1), path


def register(tile):
    folder = OUT / tile['chunk']
    raw = Image.open(folder / f"{tile['id']}-native.webp").convert('RGB')
    target = Image.open(OUT / tile['input']).convert('RGB')
    w, h = target.size
    resized = np.array(raw.resize((w, h), Image.Resampling.LANCZOS))
    sift = cv2.SIFT_create(nfeatures=8000, contrastThreshold=.015)
    k1, d1 = sift.detectAndCompute(cv2.cvtColor(resized, cv2.COLOR_RGB2GRAY), None)
    k0, d0 = sift.detectAndCompute(cv2.cvtColor(np.array(target), cv2.COLOR_RGB2GRAY), None)
    good = [a for a, b in cv2.BFMatcher().knnMatch(d1, d0, k=2) if a.distance < .74*b.distance]
    if len(good) < 6:
        raise RuntimeError(f"Insufficient SIFT matches: {tile['chunk']}/{tile['id']}: {len(good)}")
    src = np.float32([k1[m.queryIdx].pt for m in good])
    dst = np.float32([k0[m.trainIdx].pt for m in good])
    matrix, ok = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=2.5, maxIters=10000)
    if matrix is None or not .94 < np.linalg.det(matrix[:, :2]) < 1.06:
        raise RuntimeError(f"Unreliable registration: {tile['chunk']}/{tile['id']}: {matrix}")
    residual = np.linalg.norm(cv2.transform(src[None], matrix)[0]-dst, axis=1)[ok[:, 0] > 0]
    native_to_context = (np.vstack([matrix, [0, 0, 1]]) @ np.diag([w/raw.width, h/raw.height, 1]))[:2]
    warp = native_to_context*2
    aligned = cv2.warpAffine(np.array(raw), warp, (w*2, h*2), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT)
    # Same broad-light correction as reference, but exclude object-removal/fog targets.
    old = np.array(target.resize((w*2, h*2), Image.Resampling.LANCZOS), dtype=np.float32)
    delta = cv2.GaussianBlur(old, (0, 0), 70)-cv2.GaussianBlur(aligned.astype(np.float32), (0, 0), 70)
    exclusion = np.zeros((h*2, w*2), np.uint8)
    for obj in tile['removalTargets']+tile['fogTargets']:
        x0, y0, x1, y1 = obj['percentRect']
        cv2.rectangle(exclusion, (round(x0*w/50), round(y0*h/50)), (round(x1*w/50), round(y1*h/50)), 255, -1)
    exclusion = cv2.GaussianBlur(cv2.dilate(exclusion, np.ones((81, 81), np.uint8)), (0, 0), 40)/255
    aligned = np.uint8(np.clip(aligned.astype(np.float32)+.8*delta*(1-exclusion[:, :, None]), 0, 255))
    record = dict(id=tile['id'], nativeFile=f"{tile['id']}-native.webp", nativeSize=list(raw.size),
                  corePx1x=tile['corePx1x'], contextPx1x=tile['contextPx1x'],
                  coreMasterPx1x=tile['coreMasterPx1x'], contextMasterPx1x=tile['contextMasterPx1x'],
                  affine=matrix.tolist(), affineConvention='resized native to context-local map pixels, OpenCV pixel centers',
                  nativeToContextAffine=native_to_context.tolist(), registrationReference=tile['input'],
                  siftMatches=len(good), siftInliers=int(ok.sum()),
                  inlierResidualPx1x=dict(median=float(np.median(residual)), p95=float(np.percentile(residual, 95)), max=float(max(residual))),
                  localWarpApplied=False, semanticStructureVerified=False,
                  broadLightingCorrection=dict(strength=.8, sigmaPx1x=35, exclusion='removal/fog rectangles dilated and feathered'),
                  borderMode='BORDER_REFLECT outside transformed native coverage')
    print(tile['chunk'], tile['id'], 'matches/inliers', len(good), int(ok.sum()), 'max residual', round(max(residual), 3), flush=True)
    return aligned, record


for chunk in ['r1-c1', 'r2-c1']:
    folder = OUT / chunk
    images, records = {}, []
    for tile in [t for t in MANIFEST['generations'] if t['chunk'] == chunk]:
        aligned, record = register(tile)
        images[tile['id']] = aligned
        records.append(record)
    top, sv1 = seam_blend(images['q11'], images['q12'])
    bottom, sv2 = seam_blend(images['q21'], images['q22'])
    atlas, sh = seam_blend(top.transpose(1, 0, 2), bottom.transpose(1, 0, 2))
    atlas = atlas.transpose(1, 0, 2)
    y_offset = 0 if chunk == 'r1-c1' else 128
    atlas = atlas[y_offset:y_offset+2048, :2048]
    Image.fromarray(atlas).save(folder / f'{chunk}-2x.webp', lossless=True, method=6)
    (folder / 'registration.json').write_text(json.dumps(dict(chunk=chunk, coordinateUnits='v5 master pixels at 1x',
        chunkOriginMasterPx1x=[0, 0 if chunk == 'r1-c1' else 1024], overlapEachSidePx1x=64,
        exteriorMapEdgesClipped=True, composition='reference min-cost seam, squared RGB difference, 16 output-pixel smoothstep feather',
        interChunkSeamsProcessed=False, tiles=records), indent=2))
    # Compare both complete chunks at the actual 2.8 device-px/world-unit game zoom.
    game = 2.8/(4915/3840)
    size = round(1024*game)
    source = Image.open(folder / 'inputs/v5.webp').convert('RGB').resize((size, size), Image.Resampling.LANCZOS)
    result = Image.fromarray(atlas).resize((size, size), Image.Resampling.LANCZOS)
    compare = Image.new('RGB', (size*2+36, size+64), '#161a22')
    compare.paste(source, (12, 64)); compare.paste(result, (size+24, 64))
    draw = ImageDraw.Draw(compare)
    draw.text((12, 14), f'{chunk} v5 | 2.8 device px / world unit', font=FONT, fill='white')
    draw.text((size+24, 14), f'{chunk} HD | identical zoom', font=FONT, fill='white')
    compare.save(folder / f'{chunk}-compare.jpg', quality=91, subsampling=0)
    sheet = Image.new('RGB', (2080, 1710), '#161a22')
    draw = ImageDraw.Draw(sheet)
    draw.text((16, 12), f'{chunk} | overview and unscaled 2x seam strips', font=FONT, fill='white')
    sheet.paste(Image.fromarray(atlas).resize((1024, 1024)), (16, 56))
    vertical = Image.fromarray(atlas).crop((896, 0, 1152, 2048)).transpose(Image.Transpose.ROTATE_90)
    horizontal = Image.fromarray(atlas).crop((0, 896, 2048, 1152))
    sheet.paste(vertical, (16, 1120)); sheet.paste(horizontal, (16, 1420))
    sheet.save(folder / 'seam-check.jpg', quality=90, subsampling=0)
    (folder / 'seams.json').write_text(json.dumps(dict(units='2x context pixels', verticalTop=sv1.tolist(), verticalBottom=sv2.tolist(), horizontal=sh.tolist(), cropOffset=[0, y_offset]), separators=(',', ':')))
