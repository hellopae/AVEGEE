"""Pack four built-in ImageGen edits; no animation is synthesized here.

Each input contains four separately drawn poses in a 2x2 grid. Resize each
complete cell uniformly to 320px, then register its boot baseline. This is
atlas registration, not a substitute for drawing motion. Preserve generated
alpha within the sprite; exclude faint grid-edge noise in the packing gutter.
Never replace heads or repaint the character in this script.
"""
from pathlib import Path
import hashlib
import json

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
OUT = HERE.parents[1]
atlas = Image.new("RGBA", (2560, 640))
records = []
for call, row, start in ((1, 0, 0), (2, 0, 4), (3, 1, 0), (4, 1, 4)):
    source = Image.open(HERE / f"generated-{call:02}.webp").convert("RGBA")
    w, h = source.width // 2, source.height // 2
    for i in range(4):
        box = (i % 2 * w, i // 2 * h, (i % 2 + 1) * w, (i // 2 + 1) * h)
        frame = source.crop(box).resize((320, 320), Image.Resampling.LANCZOS)
        alpha = np.asarray(frame)[:, :, 3]
        bottom = int(np.where(alpha > 40)[0].max())
        dy = 314 - bottom
        registered = Image.new("RGBA", (320, 320))
        registered.paste(frame, (0, dy))
        clipped = alpha[320-dy:] if dy > 0 else np.array([], dtype=np.uint8)
        # A fixed cell may exclude faint resampling tails below its bottom;
        # record them, and never cut a pixel above the measurement threshold.
        assert not np.any(clipped > 40), (call, i, dy)
        a = np.asarray(registered)[:, :, 3]
        gutter = np.concatenate((a[0], a[1:, 0], a[1:, -1]))
        assert gutter.max() <= 1, (call, i, "nontrivial alpha in gutter")
        clean = Image.new("RGBA", (320, 320))
        clean.paste(registered.crop((1, 1, 319, 320)), (1, 1))
        registered = clean
        atlas.paste(registered, ((start + i) * 320, row * 320))
        records.append({"call": call, "row": row, "frame": start + i + 1,
                        "inputCellBox": list(box), "resize": [320, 320],
                        "opaqueBottomBefore": bottom, "registrationOffset": [0, dy],
                        "opaqueBottomAfter": 314,
                        "clippedNonzeroAlphaPixels": int(np.count_nonzero(clipped)),
                        "clippedMaximumAlpha": int(clipped.max()) if clipped.size else 0,
                        "clippedAlphaSum": int(clipped.sum()),
                        "excludedGutterNonzeroPixels": int(np.count_nonzero(gutter)),
                        "excludedGutterMaximumAlpha": int(gutter.max()),
                        "sha256RGBA": hashlib.sha256(registered.tobytes()).hexdigest()})
atlas.save(OUT / "worker-cyberhell-cook-v1.webp", lossless=True, exact=True)
for row, direction in enumerate(("down-right", "down-left")):
    frames = []
    for i in range(8):
        frame = atlas.crop((i * 320, row * 320, (i + 1) * 320, (row + 1) * 320))
        bg = Image.new("RGBA", frame.size, (229, 230, 233, 255))
        frames.append(Image.alpha_composite(bg, frame).convert("RGB"))
    frames[0].save(OUT / "preview" / f"worker-cyberhell-cook-{direction}.gif",
                   save_all=True, append_images=frames[1:], duration=[120, 130] * 4,
                   loop=0, disposal=2, optimize=False)
(HERE / "packing.json").write_text(json.dumps({
    "method": "2x2 grid extraction, uniform cell resize, boot-baseline registration only",
    "baselineDefinition": "lowest alpha>40 pixel; source cyberhell idle bottom is y314",
    "drawAnchorUnchanged": [160, 320],
    "anatomicalXRegistrationAccepted": False,
    "frames": records,
}, indent=2) + "\n")
print(json.dumps({"packedFrames": len(records), "baselineY": 314,
                  "offsetsY": [r["registrationOffset"][1] for r in records]}))
