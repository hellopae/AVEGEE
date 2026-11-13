"""Package two existing built-in ImageGen edits; never writes the live terrain.

python3 docs/art-reviews/2026-11-13-z1-touchup/build.py [--check]
Requires Pillow, numpy and OpenCV. No network or generation calls.
"""
import hashlib
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
SPOTS = {
    "lava-north-stair": {
        "rect": [610, 810, 866, 1066],
        "polygon": [[137, 242], [155, 231], [181, 231], [204, 239],
                    [220, 257], [215, 282], [199, 301], [167, 306], [139, 288]],
        "protected": [[0, 0, 512, 230], [0, 315, 512, 512]],
    },
    "heaven-bridge": {
        "rect": [3492, 620, 3748, 876],
        "polygon": [[226, 185], [240, 175], [253, 182], [267, 194],
                    [282, 201], [298, 201], [314, 213], [307, 235],
                    [289, 253], [269, 269], [243, 259], [229, 239], [223, 215]],
        "protected": [[0, 0, 512, 175], [0, 315, 512, 512]],
    },
}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_crop(rect):
    x0, y0, x1, y1 = [v * 2 for v in rect]
    out = Image.new("RGB", (x1 - x0, y1 - y0))
    tiles = {}
    for row in range(y0 // 1024, (y1 - 1) // 1024 + 1):
        for col in range(x0 // 1024, (x1 - 1) // 1024 + 1):
            path = ROOT / f"img/map-zone1/v7r/r{row+1}-c{col+1}.webp"
            with Image.open(path) as tile:
                out.paste(tile.convert("RGB"), (col * 1024 - x0, row * 1024 - y0))
            tiles[str(path.relative_to(ROOT))] = sha(path)
    return out, tiles


def save_json(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")


def build(name, spec):
    dest = HERE / name
    original, tiles = source_crop(spec["rect"])
    original.save(dest / "source.webp", lossless=True)
    source = np.array(original)
    with Image.open(dest / "generated.webp") as im:
        generated_size = list(im.size)
        generated = np.array(im.convert("RGB").resize(original.size, Image.Resampling.LANCZOS))
    mask = Image.new("L", original.size)
    ImageDraw.Draw(mask).polygon([tuple(p) for p in spec["polygon"]], fill=255)
    # A finite support, 8-output-pixel feather. It cannot change distant geometry.
    distance = cv2.distanceTransform(np.array(mask), cv2.DIST_L2, cv2.DIST_MASK_PRECISE)
    t = np.clip(distance / 8, 0, 1)
    alpha = np.uint8(np.rint(t * t * (3 - 2 * t) * 255))
    Image.fromarray(alpha).save(dest / "edit-mask.png")
    sift = cv2.SIFT_create()
    valid = np.uint8(alpha == 0) * 255
    k1, d1 = sift.detectAndCompute(cv2.cvtColor(generated, cv2.COLOR_RGB2GRAY), valid)
    k2, d2 = sift.detectAndCompute(cv2.cvtColor(source, cv2.COLOR_RGB2GRAY), valid)
    matches = [m for m, n in cv2.BFMatcher().knnMatch(d1, d2, k=2) if m.distance < .7 * n.distance]
    p1 = np.float32([k1[m.queryIdx].pt for m in matches])
    p2 = np.float32([k2[m.trainIdx].pt for m in matches])
    cv2.setRNGSeed(0)
    affine, inliers = cv2.estimateAffinePartial2D(p1, p2, method=cv2.RANSAC, ransacReprojThreshold=2)
    assert affine is not None and int(inliers.sum()) >= 30
    paint = cv2.warpAffine(generated, affine, original.size, flags=cv2.INTER_LANCZOS4,
                           borderMode=cv2.BORDER_REFLECT)
    a = alpha[..., None].astype(np.float64) / 255
    result = np.uint8(np.rint(source * (1 - a) + paint * a))
    Image.fromarray(result).save(dest / "native.webp", lossless=True)
    # Current game projection: scene.mapViewport, 390 CSS px wide, zoom 5, DPR 2.
    # Ground maps 9830 output pixels to 3840 world units; SCENE.w = 1678.
    scale = 390 / 1678 * 5 * 2 * 3840 / 9830
    size = (round(512 * scale), round(512 * scale))
    sheet = Image.new("RGB", (size[0] * 2 + 8, size[1] + 48), (24, 24, 24))
    sheet.paste(original.resize(size, Image.Resampling.LANCZOS), (0, 48))
    sheet.paste(Image.fromarray(result).resize(size, Image.Resampling.LANCZOS), (size[0] + 8, 48))
    draw = ImageDraw.Draw(sheet)
    draw.text((8, 6), "BEFORE: v7r", fill="white")
    draw.text((size[0] + 16, 6), "AFTER: touchup", fill="white")
    draw.text((8, 25), "Ground only | zoom 5 | 390 CSS px | DPR 2 | camera-scale reconstruction", fill="white")
    sheet.save(dest / "compare.jpg", quality=95, subsampling=0)
    x0, y0, x1, y1 = spec["rect"]
    save_json(dest / "registration.json", {
        "schema": "z1-touchup-1", "sourceSet": "img/map-zone1/v7r/",
        "rectConvention": "[x0,y0,x1,y1), upper-left origin; no inclusive endpoint",
        "contextRectPx1x": spec["rect"],
        "contextRectPx2x": [v * 2 for v in spec["rect"]],
        "mapSizePx1x": [4915, 3277], "mapSizePx2x": [9830, 6554],
        "nativeSizePx": [512, 512],
        "nativeToContextPx1x": [[.5, 0, 0], [0, .5, 0]],
        "nativeToMapPx1x": [[.5, 0, x0], [0, .5, y0]],
        "nativeToContextPx2x": [[1, 0, 0], [0, 1, 0]],
        "nativeToMapPx2x": [[1, 0, x0 * 2], [0, 1, y0 * 2]],
        "nativeDescription": "Ready-to-place localized patch: aligned ImageGen pixels through edit-mask.png; original v7r elsewhere. Not the raw model output.",
        "generator": "built-in image_gen", "generations": 1, "retries": 0,
        "generatedSizePx": generated_size,
        "resizedGeneratedToNativeAffine": affine.tolist(),
        "registrationMatches": len(matches), "registrationInliers": int(inliers.sum()),
        "editPolygonNativePx": spec["polygon"], "featherPx2x": 8,
        "sourceTilesSHA256": tiles,
        "sha256": {f: sha(dest / f) for f in ["source.webp", "generated.webp", "edit-mask.png", "native.webp", "prompt.txt"]},
        "compare": {"kind": "terrain-only camera-scale reconstruction, not a live-game screenshot",
                    "zoom": 5, "viewportCssWidth": 390, "dpr": 2,
                    "scalePerV7rOutputPixel": scale, "panelSizePx": list(size)},
    })


def check(name, spec):
    dest = HERE / name
    reg = json.loads((dest / "registration.json").read_text())
    for file, digest in reg["sha256"].items():
        assert sha(dest / file) == digest, file
    original, tiles = source_crop(spec["rect"])
    assert tiles == reg["sourceTilesSHA256"], "Live source changed"
    for file in ["source.webp", "generated.webp", "native.webp", "edit-mask.png", "compare.jpg"]:
        with Image.open(dest / file) as im:
            im.verify()
        with Image.open(dest / file) as im:
            im.load()
    source = np.array(original)
    assert np.array_equal(source, np.array(Image.open(dest / "source.webp")))
    native = np.array(Image.open(dest / "native.webp"))
    mask = np.array(Image.open(dest / "edit-mask.png"))
    assert native.shape == source.shape == (512, 512, 3)
    changed = np.any(source != native, axis=2)
    assert changed.any() and not changed[mask == 0].any()
    assert (dest / "native.webp").read_bytes()[12:16] == b"VP8L", "Not lossless WebP"
    for x0, y0, x1, y1 in spec["protected"]:
        assert not changed[y0:y1, x0:x1].any(), "Protected geometry changed"
    assert reg["nativeToContextPx2x"] == [[1, 0, 0], [0, 1, 0]]
    assert reg["contextRectPx2x"] == [v * 2 for v in spec["rect"]]
    for suffix, factor in [("1x", .5), ("2x", 1)]:
        matrix = np.array(reg[f"nativeToMapPx{suffix}"])
        corners = matrix @ np.array([[0, 512], [0, 512], [1, 1]])
        expected = np.array(reg[f"contextRectPx{suffix}"]).reshape(2, 2).T
        assert np.array_equal(corners, expected), "Affine does not map crop corners"
        assert reg[f"nativeToContextPx{suffix}"] == [[factor, 0, 0], [0, factor, 0]]
    yy, xx = np.where(changed)
    return {"filesDecoded": 5, "losslessNative": True, "changedPixelsPx2x": int(changed.sum()),
            "changedBoundsNativePx": [int(xx.min()), int(yy.min()), int(xx.max()) + 1, int(yy.max()) + 1],
            "changedPixelsOutsideMask": 0, "changedPixelsInProtectedRect": 0,
            "protectedRectsNativePx": spec["protected"],
            "nativePlacementResampling": "none; identity at v7r 2x grid",
            "scope": "File/decode, source hashes, affine and pixel-invariance checks only; no gameplay QA"}


if __name__ == "__main__":
    cv2.setNumThreads(2)
    if "--check" not in sys.argv:
        for name, spec in SPOTS.items():
            build(name, spec)
    report = {name: check(name, spec) for name, spec in SPOTS.items()}
    if "--check" not in sys.argv:
        save_json(HERE / "checks.json", report)
    print(json.dumps(report, indent=2, ensure_ascii=False))
