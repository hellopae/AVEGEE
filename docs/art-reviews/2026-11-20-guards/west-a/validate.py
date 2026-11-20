"""Read-only art checks; writes only this review's validation.json.

Run from repository root: python3 docs/art-reviews/2026-11-20-guards/west-a/validate.py
Requires Pillow and NumPy. Original images are read from the recorded Git commit.
"""
from pathlib import Path
from io import BytesIO
import hashlib
import json
import subprocess

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
REVIEW = Path(__file__).resolve().parent
BASE = "4efc2419c4530420aa9fb7d30570de5225eaa1bd"
FILES = [
    "img/West/crew-guard-west.webp",
    "img/West/crew-guard-west-cutscene.webp",
    "img/tea-rest/crew-guard-west-sit-v1.webp",
    "img/z3-events/guard-vanhelsing-west.webp",
    "img/z3-events/guard-vanhelsing-west-profile.webp",
    "img/ko-pose-v1/west/guard.webp",
]


def original(path):
    data = subprocess.check_output(["git", "show", f"{BASE}:{path}"], cwd=ROOT)
    return Image.open(BytesIO(data)), hashlib.sha256(data).hexdigest()


def alpha_metrics(im):
    a = np.array(im.getchannel("A"))
    yy, xx = np.where(a >= 16)
    bottom = int(yy.max())
    _, contact_x = np.where(a[max(0, bottom - 2):bottom + 1] >= 16)
    box = [int(xx.min()), int(yy.min()), int(xx.max()) + 1, bottom + 1]
    return {
        "bbox_alpha_16": box,
        "height_px": box[3] - box[1],
        "lowest_contact_median_bottom_3_rows": [float(np.median(contact_x)), bottom],
    }


def metadata(im):
    result = {"size": list(im.size), "mode": im.mode,
              "grid": [1, 1], "frames": getattr(im, "n_frames", 1)}
    if im.mode == "RGBA":
        result.update(alpha_metrics(im))
    return result


records = []
for path in FILES:
    current_bytes = (ROOT / path).read_bytes()
    im = Image.open(BytesIO(current_bytes))
    entry = {"file": path, "after": metadata(im),
             "after_sha256": hashlib.sha256(current_bytes).hexdigest()}
    if path != FILES[-1]:
        before, digest = original(path)
        entry.update(before=metadata(before), before_sha256=digest)
        entry["structural_checks"] = {
            key: entry["before"][key] == entry["after"][key]
            for key in ["size", "mode", "grid", "frames"]
        }
        assert all(entry["structural_checks"].values()), path
        if im.mode == "RGBA":
            a = np.array(entry["before"]["lowest_contact_median_bottom_3_rows"])
            b = np.array(entry["after"]["lowest_contact_median_bottom_3_rows"])
            change = (entry["after"]["height_px"] / entry["before"]["height_px"] - 1) * 100
            entry.update(contact_delta_px=(b-a).tolist(), height_change_percent=change)
            assert np.max(np.abs(b-a)) <= 2, path
            if path == FILES[0]:
                # Old polearm reaches y=0; anatomical head/horn starts at y=32.
                # Compare body height independently of the replaced weapon.
                old_body_height = 512 - 32
                entry["body_height_before_manual_px"] = old_body_height
                entry["body_height_after_px"] = entry["after"]["height_px"]
                entry["body_height_change_percent"] = (entry["after"]["height_px"] / old_body_height - 1) * 100
                assert abs(entry["body_height_change_percent"]) <= 3
            else:
                assert abs(change) <= 3, path
    else:
        entry["new_file_checks"] = {
            "size_640x320": im.size == (640, 320), "rgba": im.mode == "RGBA",
            "single_frame": getattr(im, "n_frames", 1) == 1,
        }
        assert all(entry["new_file_checks"].values())
    records.append(entry)

scene_before, _ = original(FILES[1])
scene_after = Image.open(ROOT / FILES[1])
edit_mask = np.array(Image.open(REVIEW / "cutscene-edit-mask.png"))
character = Image.open(REVIEW / "cutscene-character-mask.png")
char = np.array(character)
changed = np.any(np.array(scene_before) != np.array(scene_after), axis=2)
outside_changes = int(np.count_nonzero(changed & (edit_mask == 0)))
assert outside_changes == 0
placement = json.loads((REVIEW / "cutscene-placement.json").read_text())
anchors = []
for (left, right), expected in zip([(250, 520), (600, 820)],
                                  [placement["original_front_sole"], placement["original_rear_sole"]]):
    region = char[:, left:right]
    bottom = int(np.where(region >= 16)[0].max())
    _, xs = np.where(region[bottom-2:bottom+1] >= 16)
    measured = [float(np.median(xs + left)), bottom]
    delta = (np.array(measured) - expected).tolist()
    assert max(abs(n) for n in delta) <= 2
    anchors.append({"before_manual_rgb": expected, "after_mask_measured": measured, "delta_px": delta})
char_bbox = character.point(lambda x: 255 if x >= 16 else 0).getbbox()
body_height = char_bbox[3] - char_bbox[1]
height_change = (body_height / placement["body_height_pixels_inclusive"] - 1) * 100
assert abs(height_change) <= 3
ko = records[-1]["after"]["bbox_alpha_16"]
standing_height = records[0]["body_height_after_px"]
ratio = (ko[2] - ko[0]) / standing_height
assert 0.9 <= ratio <= 1
assert Image.open(REVIEW / "compare.jpg").format == "JPEG"
assert (REVIEW / "README.md").is_file()
prompts = json.loads((REVIEW / "prompts.json").read_text())
assert prompts["calls"] == len(prompts["entries"]) == 7
assert all(e["prompt"] and e["approved_reference"] for e in prompts["entries"])

report = {
    "scope": "west-a only", "baseline_commit": BASE, "assets": records,
    "measurement_method": "alpha >=16; lowest contact x is median over final three occupied rows; bbox right/bottom exclusive",
    "limitations": [
        "Event original is a placeholder: its bottom silhouette contact is the alignment proxy, not an anatomical foot.",
        "Cutscene original foot and head landmarks were measured manually from RGB; after values are measured from the composited character mask.",
        "Profile original is a text placeholder with no anatomical height or foot reference; only canvas/mode/grid/frame invariants apply.",
        "Map original polearm reaches y=0; body top is manually measured at y=32. Body height is compared without the polearm; the full alpha bbox therefore becomes shorter.",
        "Automated checks do not judge artistic approval or game runtime behavior."
    ],
    "cutscene": {"body_bbox": list(char_bbox), "body_height_px": body_height,
                 "body_height_change_percent": height_change, "foot_anchors": anchors,
                 "unchanged_background_pixels_outside_edit_mask": int(np.count_nonzero(edit_mask == 0)),
                 "changed_pixels_outside_edit_mask": outside_changes},
    "ko": {"head_left_feet_right": "visually inspected", "visible_length_px": ko[2]-ko[0],
           "standing_height_px": standing_height, "length_ratio": ratio},
    "sheets_and_gifs": {"sheets_in_scope": 0, "gifs_required": 0,
                        "reason": "Set a has only single images; set b untouched."},
    "imagegen_calls": 7,
    "visual_inspection": {"identity": "elderly gray-haired man, broad-brim hat, crossbow right hand, lantern left hand",
                          "no_visible_text_blood_religious_symbols": True,
                          "status": "inspected exported images; artistic acceptance remains with reviewer"},
    "game_runtime_tested": False,
}
(REVIEW / "validation.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
print("Checked 6 assets: dimensions, modes, grids, frames, measured contacts, heights, KO ratio, background preservation, review artifacts.")
print("Wrote west-a/validation.json; no game runtime or artistic approval claim.")
