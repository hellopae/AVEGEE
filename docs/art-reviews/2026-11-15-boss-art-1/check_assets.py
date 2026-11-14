"""Recheck the eight BOSS-ART-1 deliverables; run from the repository root."""
import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image


REVIEW = Path(__file__).resolve().parent
ROOT = REVIEW.parents[2]
ASSETS = [
    ("img/item-phoenix-feather.webp", (128, 128), "RGBA"),
    ("img/mob-q-ashsmoke-big.webp", (512, 512), "RGBA"),
    ("img/mob-q-ashsmoke.webp", (512, 512), "RGBA"),
    ("img/z1-events/cut-tanthasura-army-th.webp", (1672, 941), "RGB"),
    ("img/z1-events/cut-hanuman-sweep-th.webp", (1672, 941), "RGB"),
    ("img/z2-events/cut-akura-thornstorm-asia.webp", (1672, 941), "RGB"),
    ("img/z3-events/cut-valdric-batstorm-west.webp", (1672, 941), "RGB"),
    ("img/z4-events/cut-trojan9-rush-cyberhell.webp", (1672, 941), "RGB"),
]


def command(*args):
    return subprocess.check_output(args, cwd=ROOT, text=True).strip()


def check():
    records = []
    for name, size, mode in ASSETS:
        path = ROOT / name
        with Image.open(path) as im:
            im.load()
            assert im.format == "WEBP", name
            assert im.size == size, (name, im.size)
            assert im.mode == mode, (name, im.mode)
            assert getattr(im, "n_frames", 1) == 1, name
            item = {
                "path": name,
                "size": list(im.size),
                "mode": im.mode,
                "format": im.format,
                "bytes": path.stat().st_size,
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            }
            if mode == "RGBA":
                alpha = im.getchannel("A")
                assert alpha.getextrema() == (0, 255), name
                assert all(alpha.crop(box).getextrema() == (0, 0) for box in [
                    (0, 0, size[0], 1), (0, size[1] - 1, size[0], size[1]),
                    (0, 0, 1, size[1]), (size[0] - 1, 0, size[0], size[1]),
                ]), (name, "nontransparent canvas edge")
                # Ignore almost invisible alpha noise for apparent sprite scale.
                visible = alpha.point(lambda value: 255 if value >= 8 else 0)
                item["alpha_range"] = list(alpha.getextrema())
                item["visible_bbox_alpha_ge_8"] = list(visible.getbbox())
                item["transparent_canvas_edges"] = True
            records.append(item)

    big = records[1]["visible_bbox_alpha_ge_8"]
    small = records[2]["visible_bbox_alpha_ge_8"]
    ratio = (small[3] - small[1]) / (big[3] - big[1])
    assert 0.45 <= ratio <= 0.55, ratio

    # This brief permits new assets/evidence only; existing tracked files stay intact.
    tracked_changes = command("git", "diff", "HEAD", "--name-only")
    assert not tracked_changes, tracked_changes
    new_files = command("git", "ls-files", "--others", "--exclude-standard").splitlines()
    allowed = {name for name, _, _ in ASSETS}
    review_prefix = str(REVIEW.relative_to(ROOT)) + "/"
    unexpected = [name for name in new_files if name not in allowed
                  and not name.startswith(review_prefix)]
    assert not unexpected, unexpected
    report = {
        "scope": "File properties and workspace scope only; no art QA verdict.",
        "assets_checked": len(records),
        "assets": records,
        "small_to_big_visible_height_ratio": round(ratio, 4),
        "visible_scale_alpha_threshold": 8,
        "existing_tracked_files_changed": [],
        "branch_observed": command("git", "branch", "--show-current"),
        "imagegen_calls": 8,
        "imagegen_limit": 12,
        "ocr": "Not run: tesseract unavailable. Text checked visually only.",
    }
    (REVIEW / "validation.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    )
    print(f"Checked {len(records)} WEBP assets: sizes/modes, single frames, alpha edges.")
    print(f"Small/big visible height ratio: {ratio:.3f} (target approximately 0.5).")
    print("No existing tracked files changed; new paths match the asset/evidence scope.")
    print("Visual checks are documented separately; this is not a QA approval.")


if __name__ == "__main__":
    check()
