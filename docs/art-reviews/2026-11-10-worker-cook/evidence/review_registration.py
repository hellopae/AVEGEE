"""Render diagnostic plates with the game's inset/fit/face math.

This does not edit artwork. Run from anywhere with Pillow and NumPy.
Feet-band bounds describe silhouettes, not anatomical contact points.
"""
from pathlib import Path
import hashlib
import json
import re

import numpy as np
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1]
REPO = OUT.parents[2]
EV = OUT / "evidence"
CODE = (REPO / "src/workers.js").read_text()
INSETS = json.loads(re.search(r"WORKER_FRAME_INSETS=Object.freeze\((\{.*?\})\);", CODE)[1])
MANIFEST = json.loads((OUT / "worker-cook.json").read_text())
BG = (229, 230, 233, 255)
SIZE, ANCHOR = 384, (192, 352)


def fit_table(zone):
    text = re.search(rf"WORKER_FIT_{zone.upper()}_V2=Object.freeze\((\{{.*?\}})\);", CODE, re.S)[1]
    text = re.sub(r"(\b\d+|scale|dx)\s*:", r'"\1":', text)
    return json.loads(text)


def render(frame, scale=1, dx=0, face=1, guards=(0, 0, 0, 0)):
    l, t, r, b = guards
    cropped = Image.new("RGBA", (320, 320))
    cropped.paste(frame.crop((l, t, 320-r, 320-b)), (l, t))
    # Browser drawImage uses floating point destination rectangles. Pillow's
    # affine sampler preserves the same coordinates; its filtering differs.
    rendered = cropped.transform(
        (SIZE, SIZE), Image.Transform.AFFINE,
        (1/scale, 0, 160-dx-ANCHOR[0]/scale,
         0, 1/scale, 320-ANCHOR[1]/scale),
        resample=Image.Resampling.BICUBIC,
    )
    if face == -1:
        rendered = rendered.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    return rendered


def metrics(frame):
    a = np.asarray(frame)[:, :, 3]
    ys, xs = np.where(a > 40)
    fy, fx = np.where((a > 40) & (np.indices(a.shape)[0] >= ANCHOR[1]-32))
    return {
        "boundsAlphaAbove40": [int(xs.min()), int(ys.min()), int(xs.max()+1), int(ys.max()+1)],
        "lowestOpaquePixelY": int(ys.max()),
        "lowestOpaquePixelMinusAnchorY": int(ys.max()-ANCHOR[1]),
        "bottom32pxSilhouetteBounds": [int(fx.min()), int(fy.min()), int(fx.max()+1), int(fy.max()+1)] if len(fx) else None,
        "bottom32pxSilhouetteCentreMinusAnchorX": round(float((fx.min()+fx.max()+1)/2-ANCHOR[0]), 2) if len(fx) else None,
    }


def cell(atlas, row, column):
    return atlas.crop((column*320, row*320, (column+1)*320, (row+1)*320))


def plate(name, picks):
    canvas = Image.new("RGB", (SIZE*4, (SIZE+28)*((len(picks)+3)//4)), BG[:3])
    draw = ImageDraw.Draw(canvas)
    for i, (frame, label) in enumerate(picks):
        x, y = i % 4 * SIZE, i // 4 * (SIZE+28)
        canvas.paste(Image.alpha_composite(Image.new("RGBA", frame.size, BG), frame).convert("RGB"), (x, y+28))
        draw.text((x+4, y+5), label, fill=(25,25,25))
        draw.line((x, y+28+ANCHOR[1], x+SIZE-1, y+28+ANCHOR[1]), fill=(50,110,180))
        draw.line((x+ANCHOR[0], y+28, x+ANCHOR[0], y+SIZE+27), fill=(170,175,185))
    canvas.save(EV / name, quality=87, subsampling=0)


report = {
    "status": "incomplete", "artworkEditedByThisDiagnosticScript": False,
    "method": "Offline reimplementation of drawWorker at height=320; inset, fit.scale, fit.dx and face applied about the cell-bottom anchor. Padded review canvas only.",
    "canvas": [SIZE, SIZE], "drawAnchor": list(ANCHOR),
    "limitations": [
        "Pillow bicubic sampling differs from browser canvas filtering.",
        "A silhouette bound or anchor does not establish anatomical foot registration.",
        "Different walk poses change the bottom-band silhouette; no inferred correction is applied.",
        "These are diagnostic composites, not replacement sprite frames or in-game tests."
    ],
    "sourceCodeSha256": hashlib.sha256(CODE.encode()).hexdigest(),
    "sources": [], "deliveredRows": [],
}

for zone in ("th", "asia", "west", "cyberhell"):
    source = Image.open(REPO / f"img/workers/worker-{zone}-sheet-v2.webp").convert("RGBA")
    fits = fit_table(zone)
    picks = []
    for heading, row in (("idle",0), ("side",1), ("down",4), ("up",5)):
        for col in range(4):
            guard = INSETS[zone][row*4+col] if row < 3 else [0,0,0,0]
            fit = fits.get(str(row), {})
            f = render(cell(source,row,col), fit.get("scale",1), fit.get("dx",0), guards=guard)
            report["sources"].append({"zone":zone, "heading":heading, "row":row, "column":col,
                "fit":fit, "insets":guard, "metrics":metrics(f)})
            if col == (0 if zone == "asia" else 1):
                picks.append((f, f"SOURCE {zone} {heading} c{col+1} scale={fit.get('scale',1)} dx={fit.get('dx',0)}"))
    atlas = Image.open(OUT / f"worker-{zone}-cook-v1.webp").convert("RGBA")
    for col in range(8):
        picks.append((render(cell(atlas,0,col)), f"COOK {zone} down-right f{col+1} scale=1 dx=0"))
    plate(f"renderer-fit-{zone}-cook.jpg", picks)

for entry in MANIFEST["animations"]:
    atlas = Image.open(OUT / entry["file"]).convert("RGBA")
    frames = [render(cell(atlas,entry["row"],c)) for c in range(8)]
    report["deliveredRows"].append({"zone":entry["zone"], "anim":entry["anim"], "dir":entry["dir"],
        "metrics":[metrics(f) for f in frames]})
    if entry["anim"] == "carry":
        heading = entry["dir"]
        row = {"side":1,"side-left":1,"down":4,"up":5}[heading]
        source = Image.open(REPO / "img/workers/worker-th-sheet-v2.webp").convert("RGBA")
        fit = fit_table("th").get(str(row), {})
        source_picks = []
        for col in range(4):
            guards = INSETS["th"][row*4+col] if row < 3 else [0,0,0,0]
            frame = render(cell(source,row,col), fit.get("scale",1), fit.get("dx",0), -1 if heading == "side-left" else 1, guards)
            source_picks.append((frame, f"SOURCE th {heading} c{col+1} scale={fit.get('scale',1)} dx={fit.get('dx',0)}"))
        plate(f"renderer-fit-th-carry-{heading}.jpg", source_picks+[(f,f"CARRY th {heading} f{i+1} scale=1 dx=0") for i,f in enumerate(frames)])

(EV / "registration-review.json").write_text(json.dumps(report, ensure_ascii=False, indent=2)+"\n")
print(json.dumps({"sourceFrames":len(report["sources"]), "deliveredFrames":sum(len(r["metrics"]) for r in report["deliveredRows"]), "plates":8, "anatomicalRegistrationAccepted":False}))
