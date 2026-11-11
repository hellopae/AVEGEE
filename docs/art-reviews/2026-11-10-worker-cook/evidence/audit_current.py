"""Inspect existing artwork, without changing it. Run from any directory.

Creates native-size review plates and a factual report inside this delivery only.
Requires Pillow, NumPy and SciPy. No image generation or sprite editing.
"""
from pathlib import Path
import hashlib
import json
import re

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

OUT = Path(__file__).resolve().parents[1]
REPO = OUT.parents[2]
EV = OUT / "evidence"
PREVIOUS = Path("/Users/agapae/agapae-work/.toby-worktrees/.codex-worktrees/20261111T022930Z-b006be7f/docs/art-reviews/2026-11-10-worker-cook")
ZONES = ("th", "asia", "west", "cyberhell")
manifest = json.loads((OUT / "worker-cook.json").read_text())
source = (REPO / "src/workers.js").read_text()
insets = json.loads(re.search(r"WORKER_FRAME_INSETS=Object.freeze\((\{.*?\})\);", source).group(1))
report = {
    "status": "incomplete", "date": "2026-11-11",
    "scope": "Independent inspection of copied latest assets; no artwork edited.",
    "checks": [], "sources": [], "rows": [], "preservation": [],
    "limitations": [
        "Numeric frame differences do not prove a smooth loop or identity.",
        "Cell-bottom anchor is not an anatomical foot-registration measurement.",
        "Fringe colour candidates include legitimate skin, gold, rice and clothes; inspect plates.",
        "No game integration or browser playback is performed by this script."
    ]
}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check(name, value, detail=None):
    report["checks"].append({"name": name, "satisfied": bool(value), "detail": detail})


def composited(frame, colour):
    bg = Image.new("RGBA", frame.size, (*colour, 255))
    return Image.alpha_composite(bg, frame).convert("RGB")


def metrics(frame):
    pixels = np.array(frame)
    mask = pixels[:, :, 3] > 40
    labels, count = ndimage.label(mask)
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    body = labels == sizes.argmax()
    ys, xs = np.where(body)
    # Include all non-zero alpha at the border, not only alpha > 40.
    a = pixels[:, :, 3]
    edge = (a > 0) & (a < 255) & ndimage.binary_dilation(a == 0)
    r, g, b = [pixels[:, :, i].astype(int) for i in range(3)]
    red = edge & (r > 140) & (r - g > 60) & (r - b > 60)
    yellow = edge & (r > 160) & (g > 120) & (b < 100)
    return {
        "alphaBounds": list(frame.getchannel("A").getbbox()),
        "mainBodyBoundsAlphaAbove40": [int(xs.min()), int(ys.min()), int(xs.max()+1), int(ys.max()+1)],
        "mainBodyHeight": int(ys.max()-ys.min()+1),
        "detachedPixelsAlphaAbove40": int(mask.sum()-body.sum()),
        "nonzeroAlphaOnBorder": {"top": int((a[0] > 0).sum()), "left": int((a[:, 0] > 0).sum()),
                                 "right": int((a[:, -1] > 0).sum()), "bottom": int((a[-1] > 0).sum())},
        "partiallyTransparentPixels": int(((a > 0) & (a < 255)).sum()),
        "redBoundaryCandidatesNotAProofOfFringe": int(red.sum()),
        "yellowBoundaryCandidatesNotAProofOfFringe": int(yellow.sum())
    }


def comparison(zone):
    """Actual source crops and existing deliverables at 1:1 pixel size."""
    original = Image.open(REPO / f"img/workers/worker-{zone}-sheet-v2.webp").convert("RGBA")
    cook = Image.open(OUT / f"worker-{zone}-cook-v1.webp").convert("RGBA")
    picks = []
    def source_cell(row, column, title):
        cell = original.crop((column*320, row*320, (column+1)*320, (row+1)*320))
        guards = insets[zone][row*4+column] if row < 3 else [0,0,0,0]
        l,t,r,b = guards
        kept = Image.new("RGBA", (320,320))
        kept.paste(cell.crop((l,t,320-r,320-b)), (l,t))
        return kept, f"SOURCE {zone} {title} row{row} c{column+1}"
    # Asia's second idle cell is a blink: use its open-eyed first cell for face review.
    picks.append(source_cell(0, 0 if zone == "asia" else 1, "idle"))
    for c in (0,4,6):
        picks.append((cook.crop((c*320,0,(c+1)*320,320)), f"NEW cook down-right f{c+1}"))
    picks.extend([source_cell(1,1,"side"), source_cell(4,0,"down"), source_cell(5,0,"up")])
    picks.append((cook.crop((0,320,320,640)), "NEW cook down-left f1"))
    if zone == "th":
        carry = Image.open(OUT / "worker-th-carry-v1.webp").convert("RGBA")
        for row, heading in enumerate(("side","side-left","down","up")):
            picks.append((carry.crop((0,row*320,320,(row+1)*320)), f"NEW carry {heading} f1"))
    card = Image.new("RGB", (1280, 364*((len(picks)+3)//4)), (229,230,233))
    draw = ImageDraw.Draw(card)
    for i,(cell,title) in enumerate(picks):
        x,y=(i%4)*320,(i//4)*364
        draw.text((x+5,y+5), title, fill=(25,25,25))
        card.paste(composited(cell, (229,230,233)), (x,y+24))
        # Baseline and anchor in a footer, without painting over source feet.
        draw.line((x,y+344,x+319,y+344), fill=(80,80,80))
        draw.line((x+160,y+344,x+160,y+351), fill=(0,80,150))
        draw.text((x+5,y+351), "320px cell / anchor [160,320] / no fit", fill=(25,25,25))
    card.save(OUT / f"compare-{zone}.jpg", quality=90, subsampling=0)


for zone in ZONES:
    path = REPO / f"img/workers/worker-{zone}-sheet-v2.webp"
    original = Image.open(path).convert("RGBA")
    check(f"source {zone} dimensions", original.size == (1280, 3840))
    for heading, row in (("idle", 0), ("side", 1), ("down", 4), ("up", 5)):
        for c in range(4):
            cell = original.crop((c*320, row*320, (c+1)*320, (row+1)*320))
            # Match renderer crop guards, retaining the original coordinate system.
            guards = insets[zone][row*4+c] if row < 3 else [0, 0, 0, 0]
            l, t, r, b = guards
            kept = Image.new("RGBA", (320, 320))
            kept.paste(cell.crop((l, t, 320-r, 320-b)), (l, t))
            report["sources"].append({"zone": zone, "heading": heading, "row": row,
                                      "column": c, "rendererInsets": guards, "metrics": metrics(kept)})
    report.setdefault("sourceHashes", {})[str(path.relative_to(REPO))] = sha(path)
    comparison(zone)

for entry in manifest["animations"]:
    key = f"{entry['zone']}-{entry['anim']}-{entry['dir']}"
    atlas = Image.open(OUT / entry["file"])
    row = entry["row"]
    frames = [atlas.crop((i*320, row*320, (i+1)*320, (row+1)*320)).convert("RGBA") for i in range(8)]
    check(f"{key} atlas RGBA/layout", atlas.mode == "RGBA" and atlas.size == (2560, 1280 if entry["anim"] == "carry" else 640))
    check(f"{key} manifest", all(entry[k] == v for k, v in {"frames": 8, "frameW": 320, "frameH": 320,
                                                            "foot": [160, 320], "fps": 8}.items()))
    check(f"{key} eight unique frames", len({hashlib.sha256(f.tobytes()).hexdigest() for f in frames}) == 8)
    measurements = [metrics(f) for f in frames]
    check(f"{key} top and side borders fully transparent", all(all(m["nonzeroAlphaOnBorder"][k] == 0 for k in ("top", "left", "right")) for m in measurements))
    check(f"{key} no detached alpha>40 pixels", all(m["detachedPixelsAlphaAbove40"] == 0 for m in measurements))
    gif_path = OUT / "preview" / f"worker-{key}.gif"
    gif = Image.open(gif_path)
    rgb = [np.asarray(composited(f, (229, 230, 233))).astype(float) for f in frames]
    durations, errors = [], []
    for i in range(gif.n_frames):
        gif.seek(i)
        durations.append(gif.info.get("duration", 0))
        errors.append(float(np.abs(np.asarray(gif.convert("RGB")).astype(float) - rgb[i]).mean()) if i < 8 else None)
    check(f"{key} GIF size/count/repeat", gif.size == (320, 320) and gif.n_frames == 8 and gif.info.get("loop") == 0)
    check(f"{key} GIF timing", durations == [120, 130]*4, durations)
    check(f"{key} GIF matches sheet within palette error", len(errors) == 8 and all(e is not None and e < 3 for e in errors), errors)
    differences = [round(float(np.abs(rgb[(i+1)%8]-rgb[i]).mean()), 4) for i in range(8)]
    # Every frame on white, black and green at 320x320; no reduction in these plates.
    plates = []
    for start in (0, 4):
        plate = Image.new("RGB", (960, 1376), (229, 230, 233))
        draw = ImageDraw.Draw(plate)
        for j, frame in enumerate(frames[start:start+4]):
            for b, colour in enumerate(((255,255,255), (0,0,0), (30,135,65))):
                x, y = b*320, j*344
                draw.text((x+5, y+5), f"{key} f{start+j+1} / {('white','black','green')[b]}", fill=(0,0,0))
                plate.paste(composited(frame, colour), (x, y+24))
        rel = f"evidence/native-alpha-{key}-{start+1}-{start+4}.jpg"
        plate.save(OUT / rel, quality=88, subsampling=0)
        plates.append(rel)
    mirror_exact = None
    if entry.get("mirroredFrom"):
        other = next(e for e in manifest["animations"] if e["zone"] == entry["zone"] and e["anim"] == entry["anim"] and e["dir"] == entry["mirroredFrom"])
        reference = Image.open(OUT / other["file"]).convert("RGBA")
        mirror_exact = all(np.array_equal(np.asarray(frames[i]), np.asarray(reference.crop((i*320, other["row"]*320, (i+1)*320, (other["row"]+1)*320)).transpose(Image.Transpose.FLIP_LEFT_RIGHT))) for i in range(8))
    report["rows"].append({"key": key, "metrics": measurements, "adjacentMeanAbsoluteDifferencesIncludingSeam": differences,
                           "seam8to1": differences[-1], "nativeAlphaPlates": plates,
                           "byteExactHorizontalMirrorOfDeclaredSource": mirror_exact})

for path in sorted(OUT.rglob("*")):
    if path.is_file() and path.suffix in (".webp", ".gif"):
        rel = path.relative_to(OUT)
        old = PREVIOUS / rel
        same = old.is_file() and sha(old) == sha(path)
        report["preservation"].append({"file": str(rel), "sha256": sha(path), "sameAsLatestInput": same})
        check(f"{rel} preserved", same)

check("cook has four zones/two directions", all({e["dir"] for e in manifest["animations"] if e["zone"] == z and e["anim"] == "cook"} == {"down-right", "down-left"} for z in ZONES))
check("carry TH has all delivered directions", {e["dir"] for e in manifest["animations"] if e["zone"] == "th" and e["anim"] == "carry"} == {"side", "side-left", "down", "up"})
report["failedChecks"] = [c for c in report["checks"] if not c["satisfied"]]
report["checkCount"] = len(report["checks"])
(EV / "current-audit.json").write_text(json.dumps(report, ensure_ascii=False, indent=2)+"\n")
print(json.dumps({"atlasCells": 96, "gifsDecoded": len(report["rows"]), "nativeAlphaPlates": 24,
                  "checks": report["checkCount"], "failedChecks": report["failedChecks"]}, indent=2))
raise SystemExit(1 if report["failedChecks"] else 0)
