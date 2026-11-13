"""Check package completeness, decoding and dimensions. Quality decisions stay in README."""
import json
from pathlib import Path

from PIL import Image


PACKAGE = Path(__file__).resolve().parents[1]
CHUNKS = [f"r1-c{column}" for column in range(1, 5)]
PARTS = ["q11", "q12", "q21", "q22"]
REPORT = PACKAGE / "verification.json"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def verify():
    required = [
        "README.md", "run-summary.json", "generation-prompts.json",
        "source-provenance.json", "objects-inventory.json", "input-recipes.json",
        "measurement-summary.json", "visual-observations.json",
    ]
    dimensions = {}
    for chunk in CHUNKS:
        required.extend(f"{chunk}/{name}" for name in [
            "registration.json", "structure.json", "sharpness.json", "removed.json",
            "seams.json", "inputs/tiles.json", "object-review.jpg",
        ])
        registration = read_json(PACKAGE / chunk / "registration.json")
        tiles = {tile["id"]: tile for tile in registration["tiles"]}
        for part in PARTS:
            dimensions[f"{chunk}/{part}-native.webp"] = tiles[part]["nativeSize"]
        dimensions.update({
            f"{chunk}/{chunk}-2x.webp": [2048, 2048],
            f"{chunk}/{chunk}-compare.jpg": [4516, 2292],
            f"{chunk}/seam-check.jpg": [2110, 1640],
            f"{chunk}/structure-check.jpg": [1400, 718],
            f"{chunk}/inputs/walkmask-overlay.jpg": [1024, 1024],
        })
    required.extend(dimensions)
    for relative in required:
        if not (PACKAGE / relative).is_file():
            raise FileNotFoundError(relative)

    # Decode every delivered image and JSON, including the retained references.
    images = []
    json_count = 0
    for path in sorted(PACKAGE.rglob("*")):
        if path.suffix.lower() in {".webp", ".jpg", ".png"}:
            relative = path.relative_to(PACKAGE).as_posix()
            with Image.open(path) as image:
                image.load()
                actual = list(image.size)
            expected = dimensions.get(relative)
            if expected is not None and actual != expected:
                raise ValueError(f"{relative}: expected {expected}, got {actual}")
            images.append({"file": relative, "size": actual})
        elif path.suffix == ".json" and path != REPORT:
            read_json(path)
            json_count += 1

    report = {
        "checks": ["required files present", "images and JSON readable", "image dimensions"],
        "chunks": CHUNKS,
        "nativeFiles": 16,
        "assembledFiles": 4,
        "decodedImages": len(images),
        "decodedJsonFilesExcludingReport": json_count,
        "images": images,
        "qualityMeasurementsRun": 0,
        "qualityAcceptanceVerified": False,
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    total_bytes = sum(path.stat().st_size for path in PACKAGE.rglob("*") if path.is_file())
    if total_bytes > 80_000_000:
        raise ValueError(f"Package size {total_bytes} exceeds 80,000,000 bytes")
    print(f"File checks completed: {len(images)} images, {json_count} JSON files, "
          f"16 natives, 4 assembled images, {total_bytes} bytes")


if __name__ == "__main__":
    verify()
