"""ตรวจ geometry/พิกเซลเทียบ commit ต้นฉบับ; ไม่ใช่การทดสอบ animation ในเกม.

Run from any directory: python3 docs/art-reviews/2026-11-20-fix-clip-th/verify.py
Requires Pillow and numpy. Reads git objects only; never changes git metadata.
"""

import hashlib
import io
import json
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[3]
BASE = "572d9d5f4dfd54c43a46a3934754478aaadfaec1"
FOLDER = "img/crew-combat-v1/th"
# 1-based cells, row-major. These polygons bound only the composited repairs.
PATCHES = {
    ("boon", 5): [(245, 294), (291, 294), (291, 265), (380, 265),
                  (380, 398), (245, 398)],
    ("guard", 3): [(0, 145), (76, 145), (82, 242), (112, 288),
                   (101, 315), (0, 315)],
    ("guard", 5): [(270, 314), (383, 314), (383, 430), (270, 430)],
    ("guard", 6): [(272, 135), (377, 135), (377, 283), (254, 296),
                   (244, 287), (263, 240)],
}


def original_bytes(name):
    return subprocess.check_output(
        ["git", "show", f"{BASE}:{FOLDER}/{name}.webp"], cwd=ROOT
    )


def image_from(data):
    return Image.open(io.BytesIO(data)).convert("RGBA")


def box(alpha):
    ys, xs = np.where(alpha > 0)
    return [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]


def bottom_anchor(alpha):
    bottom = box(alpha)[3]
    xs = np.where(np.any(alpha[max(0, bottom - 2):bottom + 1] > 0, axis=0))[0]
    return {"bottom_y": bottom, "bottom_x": xs.tolist()}


def edge_runs(pixels, name, cell):
    """Longest constant opaque silhouette columns, restricted to weapon/hand rows."""
    alpha = pixels[:, :, 3] > 127
    left = (name, cell) == ("guard", 3)
    low, high = ((145, 315) if left else (250, 380) if name == "boon"
                 else (310, 430) if cell == 5 else (135, 280))
    edges = []
    for row in alpha[low:high]:
        xs = np.flatnonzero(row)
        edges.append(int(xs[0 if left else -1]) if len(xs) else -1)
    runs, start = [], 0
    for end in range(1, len(edges) + 1):
        if end == len(edges) or edges[end] != edges[start]:
            x = edges[start]
            if (0 <= x <= 30) if left else (x >= 330):
                runs.append({"x": x, "y_start": low + start,
                             "y_end": low + end - 1, "length": end - start})
            start = end
    return sorted(runs, key=lambda r: r["length"], reverse=True)[:3]


def verify():
    report = {"baseline_commit": BASE, "checks": [], "cells": [], "idle": []}
    for name in ("boon", "guard"):
        old = image_from(original_bytes(name))
        new = Image.open(ROOT / FOLDER / f"{name}.webp")
        assert old.size == new.size == (1536, 1024), name
        assert new.mode == "RGBA", name
        old_array, new_array = np.array(old), np.array(new)
        for cell in range(1, 9):
            x, y = (cell - 1) % 4 * 384, (cell - 1) // 4 * 512
            before = old_array[y:y + 512, x:x + 384]
            after = new_array[y:y + 512, x:x + 384]
            diff = np.any(before != after, axis=2)
            polygon = PATCHES.get((name, cell))
            if polygon:
                mask = Image.new("L", (384, 512))
                ImageDraw.Draw(mask).polygon(polygon, fill=255)
                assert not diff[np.array(mask) == 0].any(), (name, cell, "outside patch")
                assert diff.any(), (name, cell, "missing repair")
            else:
                assert not diff.any(), (name, cell, "unexpected cell change")
            # Guard 5's mace reaches y=419; its boots are below y=431.
            # Guard 7's raised foot is also checked by whole-cell identity above.
            foot_start = 431 if (name, cell) == ("guard", 5) else 400
            assert np.array_equal(before[foot_start:], after[foot_start:]), (name, cell, "feet")
            anchor_before = bottom_anchor(before[:, :, 3])
            anchor_after = bottom_anchor(after[:, :, 3])
            assert anchor_before == anchor_after, (name, cell, "anchor")
            bounds = box(after[:, :, 3])
            margins = [bounds[0], bounds[1], 383 - bounds[2], 511 - bounds[3]]
            assert min(margins) >= 6, (name, cell, "transparent margin", margins)
            report["cells"].append({
                "file": f"{FOLDER}/{name}.webp", "cell_1_based": cell,
                "changed_rgba_pixels": int(diff.sum()),
                "foot_band_start_y": foot_start, "changed_pixels_in_foot_band": 0,
                "bbox_inclusive_alpha_gt_0": bounds,
                "transparent_margins_left_top_right_bottom": margins,
                "foot_anchor_before": anchor_before, "foot_anchor_after": anchor_after,
                **({"longest_edge_runs_before": edge_runs(before, name, cell),
                    "longest_edge_runs_after": edge_runs(after, name, cell)} if polygon else {}),
            })
        report["checks"].append(f"{name}: RGBA 1536x1024; 8 cells 384x512")
    for name in ("boon-idle", "guard-idle"):
        before = original_bytes(name)
        after = (ROOT / FOLDER / f"{name}.webp").read_bytes()
        assert before == after, (name, "idle changed")
        im = image_from(after)
        assert im.size == (1024, 384), name
        report["idle"].append({
            "file": f"{FOLDER}/{name}.webp", "size": list(im.size),
            "unchanged_bytes": True, "sha256": hashlib.sha256(after).hexdigest(),
        })
    report["checks"] += [
        "Only boon cell 5 and guard cells 3, 5, 6 differ",
        "All RGBA foot bands are identical: y=400..511; guard 5 uses y=431..511",
        "All bottom anchors match exactly: x delta=0, y delta=0",
        "All 16 combat cells have >=6px fully transparent border (alpha=0)",
        "Both idle files are byte-identical to the baseline",
    ]
    with Image.open(Path(__file__).parent / "compare.jpg") as compare:
        assert compare.size == (800, 2232) and compare.mode == "RGB"
    report["checks"].append("compare.jpg: RGB 800x2232; four before/after rows")
    return report


if __name__ == "__main__":
    print(json.dumps(verify(), ensure_ascii=False, indent=2))
