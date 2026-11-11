"""Read-only artwork audit; writes review evidence only inside this delivery folder.

Run from any cwd: python3 path/to/evidence/inspect_assets.py
Requires Pillow, NumPy, SciPy. Does not generate or alter sprite artwork.
"""
from pathlib import Path
import hashlib
import json
import platform
import sys

import numpy as np
from PIL import Image, ImageDraw, __version__ as pillow_version
from scipy import ndimage

OUT = Path(__file__).resolve().parents[1]
REPO = OUT.parents[2]
EVIDENCE = OUT / "evidence"
PRIOR = Path("/Users/agapae/agapae-work/.codex-worktrees/20261110T163225Z-dfe59d0e/docs/art-reviews/2026-11-10-worker-cook")
ZONES = ("th", "asia", "west", "cyberhell")
manifest = json.loads((OUT / "worker-cook.json").read_text())
report = {
    "date": "2026-11-11", "status": "incomplete",
    "method": "Decode every GIF frame; measure every RGBA atlas cell; compare source hashes. Visual review is recorded separately.",
    "runtime": {"python": platform.python_version(), "pillow": pillow_version},
    "generation": {"priorCalls": 16, "briefLimit": 16, "newCalls": 0,
                   "reason": "Prior evidence records 16/16 calls. Additional quota has not been confirmed."},
    "animatedPlaybackReviewed": False, "inGameTested": False,
    "footMeasurementCaveat": "Lower-band silhouette centre is diagnostic only: walking changes the planted foot and lifting the other foot changes the silhouette. It is not the draw anchor. Exact foot contact against the source is not certified.",
    "checks": [], "rows": [], "sourceRows": [], "preservation": [],
}


def check(name, condition, detail=None):
    report["checks"].append({"name": name, "satisfied": bool(condition), "detail": detail})


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def plate(frames, labels, path, columns=4, background=(229, 230, 233)):
    rows = (len(frames) + columns - 1) // columns
    canvas = Image.new("RGB", (320 * columns, 346 * rows), background)
    draw = ImageDraw.Draw(canvas)
    for i, (frame, label) in enumerate(zip(frames, labels)):
        x, y = (i % columns) * 320, (i // columns) * 346
        draw.text((x + 6, y + 5), label, fill=(30, 30, 30))
        frame = frame.convert("RGBA")
        canvas.paste(frame, (x, y + 26), frame)
    canvas.save(path, quality=90)


def metrics(frame):
    a = np.asarray(frame)
    mask = a[:, :, 3] > 40
    labels, count = ndimage.label(mask)
    areas = np.bincount(labels.ravel())[1:]
    low = mask[285:, :]
    xs = np.where(low)[1]
    return {
        "alphaBounds": frame.getchannel("A").getbbox(),
        "componentsAlphaAbove40": int(count),
        "detachedComponentPixels": int(areas.sum() - areas.max()) if len(areas) else 0,
        "lowerBandCenterX": float((xs.min() + xs.max()) / 2) if len(xs) else None,
        "bottomOccupiedPixelY": int(np.where(mask)[0].max()) if mask.any() else None,
        "topAndSideClear": not bool(mask[0].any() or mask[:, 0].any() or mask[:, -1].any()),
        "semiTransparentPixels": int(((a[:, :, 3] > 0) & (a[:, :, 3] < 255)).sum()),
    }


for zone in ZONES:
    path = REPO / f"img/workers/worker-{zone}-sheet-v2.webp"
    original = Image.open(path).convert("RGBA")
    check(f"source {zone} 1280x3840", original.size == (1280, 3840))
    frames = []
    for name, row in (("idle", 0), ("side", 1), ("down", 4), ("up", 5)):
        cells = [original.crop((c * 320, row * 320, (c + 1) * 320, (row + 1) * 320)) for c in range(4)]
        frames.append(cells[0])
        report["sourceRows"].append({"zone": zone, "dir": name, "row": row,
                                      "metrics": [metrics(cell) for cell in cells]})
    plate(frames, [f"ORIGINAL {zone} {d} c1" for d in ("idle", "side", "down", "up")],
          EVIDENCE / f"reference-{zone}.jpg")

for entry in manifest["animations"]:
    zone, anim, direction = entry["zone"], entry["anim"], entry["dir"]
    key = f"{zone}/{anim}/{direction}"
    sheet_path = OUT / entry["file"]
    sheet = Image.open(sheet_path)
    expected_rows = 4 if anim == "carry" else 2
    check(f"{key} RGBA and layout", sheet.mode == "RGBA" and sheet.size == (2560, expected_rows * 320))
    check(f"{key} manifest", all(entry[k] == v for k, v in {"frames": 8, "frameW": 320, "frameH": 320, "fps": 8, "foot": [160, 320]}.items()))
    row = entry["row"]
    cells = [sheet.crop((i * 320, row * 320, (i + 1) * 320, (row + 1) * 320)) for i in range(8)]
    cell_metrics = [metrics(cell) for cell in cells]
    check(f"{key} eight distinct frames", len({hashlib.sha256(cell.tobytes()).hexdigest() for cell in cells}) == 8)
    check(f"{key} clear top and side", all(m["topAndSideClear"] for m in cell_metrics))
    check(f"{key} opaque foot baseline y319", all(m["bottomOccupiedPixelY"] == 319 for m in cell_metrics))
    check(f"{key} no detached pixels alpha>40", all(m["detachedComponentPixels"] == 0 for m in cell_metrics))
    # Use a composited RGB difference: invisible RGB does not affect this statistic.
    rgb = []
    for cell in cells:
        bg = Image.new("RGBA", cell.size, (229, 230, 233, 255))
        rgb.append(np.asarray(Image.alpha_composite(bg, cell).convert("RGB")).astype(float))
    differences = [round(float(np.abs(rgb[(i + 1) % 8] - rgb[i]).mean()), 4) for i in range(8)]
    gif_path = OUT / "preview" / f"worker-{zone}-{anim}-{direction}.gif"
    gif = Image.open(gif_path)
    decoded, durations, errors = [], [], []
    for i in range(gif.n_frames):
        gif.seek(i)
        frame = gif.convert("RGB")
        decoded.append(frame.copy())
        durations.append(gif.info.get("duration", 0))
        if i < 8:
            errors.append(round(float(np.abs(np.asarray(frame).astype(float) - rgb[i]).mean()), 4))
    check(f"{key} GIF frame count and loop", gif.n_frames == 8 and gif.info.get("loop") == 0)
    check(f"{key} GIF one second", durations == [120, 130] * 4)
    check(f"{key} GIF matches atlas within quantization", len(errors) == 8 and max(errors) < 3, errors)
    plate(decoded, [f"GIF {zone}/{anim}/{direction} f{i+1}" for i in range(len(decoded))],
          EVIDENCE / f"gif-frames-{zone}-{anim}-{direction}.jpg")
    plate([decoded[i] for i in (6, 7, 0, 1)], [f"SEAM f{i+1}" for i in (6, 7, 0, 1)],
          EVIDENCE / f"seam-{zone}-{anim}-{direction}.jpg")
    report["rows"].append({"zone": zone, "anim": anim, "dir": direction,
                           "frameMetrics": cell_metrics, "compositedMeanAbsoluteDifference": differences,
                           "seam8to1Difference": differences[-1], "gifDurationsMs": durations,
                           "gifPaletteMeanAbsoluteError": errors,
                           "note": "Unique frames and difference metrics do not establish anatomical identity or smooth animation."})

for zone in ZONES:
    entries = [e for e in manifest["animations"] if e["zone"] == zone]
    picks, names = [], []
    for e in entries:
        sheet = Image.open(OUT / e["file"]).convert("RGBA")
        for c in (0, 3, 7):
            picks.append(sheet.crop((c * 320, e["row"] * 320, (c + 1) * 320, (e["row"] + 1) * 320)))
            names.append(f"{e['anim']}/{e['dir']} f{c+1}")
    canvas = Image.new("RGB", (960, len(picks) * 170), (229, 230, 233))
    draw = ImageDraw.Draw(canvas)
    for row, (cell, name) in enumerate(zip(picks, names)):
        for col, bg in enumerate(((255, 255, 255), (12, 12, 12), (55, 115, 66))):
            swatch = Image.new("RGBA", (320, 320), (*bg, 255))
            swatch = Image.alpha_composite(swatch, cell).convert("RGB").resize((160, 160))
            x = col * 320
            canvas.paste(swatch, (x, row * 170 + 10))
            draw.text((x + 165, row * 170 + 45), name, fill=(20, 20, 20))
    canvas.save(EVIDENCE / f"alpha-{zone}.jpg", quality=90)

for path in sorted(OUT.rglob("*")):
    if path.is_file() and path.suffix in (".webp", ".gif"):
        rel = path.relative_to(OUT)
        previous = PRIOR / rel
        same = previous.is_file() and digest(path) == digest(previous)
        report["preservation"].append({"file": str(rel), "sha256": digest(path), "identicalToPrior": same})
        check(f"{rel} artwork preserved byte-for-byte", same)

check("four cook zones two directions each", all(sum(e["zone"] == z and e["anim"] == "cook" for e in manifest["animations"]) == 2 for z in ZONES))
check("TH carry direction set", {e["dir"] for e in manifest["animations"] if e["zone"] == "th" and e["anim"] == "carry"} == {"side", "side-left", "down", "up"})
report["packageBytesBeforeReport"] = sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file())
check("package below 30 MB before report", report["packageBytesBeforeReport"] < 30_000_000)
report["failedChecks"] = [c for c in report["checks"] if not c["satisfied"]]
report["checkCount"] = len(report["checks"])
(EVIDENCE / "technical-audit.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({"atlasCells": sum(e["frames"] for e in manifest["animations"]),
                  "gifFiles": len(report["rows"]), "checks": len(report["checks"]),
                  "failedChecks": report["failedChecks"],
                  "artworkFilesIdenticalToPrior": sum(p["identicalToPrior"] for p in report["preservation"])}, ensure_ascii=False, indent=2))
sys.exit(1 if report["failedChecks"] else 0)
