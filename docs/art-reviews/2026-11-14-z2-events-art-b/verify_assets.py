"""ตรวจไฟล์ภาพชุด Z2-ART-B แบบอ่านอย่างเดียว; ต้องมี Pillow."""

import hashlib
import json
from pathlib import Path

from PIL import Image


REVIEW = Path(__file__).resolve().parent
ROOT = REVIEW.parents[2]
EXPECTED = {
    "cut-frontier-boss-to-dais-asia.webp": ((1672, 941), "RGB"),
    "cut-frontier-boss-punished-asia.webp": ((1672, 941), "RGB"),
    "cut-frontier-boss-released-asia.webp": ((1672, 941), "RGB"),
    "soul-satori-father-asia.webp": ((1254, 1254), "RGBA"),
    "soul-satori-father-asia-profile.webp": ((1254, 1254), "RGBA"),
    "cut-satori-farewell-asia.webp": ((1672, 941), "RGB"),
    "cut-guard-test-asia.webp": ((1672, 941), "RGB"),
    "cut-satori-ask-asia.webp": ((1672, 941), "RGB"),
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def main():
    manifest = json.loads((REVIEW / "checks.json").read_text())
    records = {Path(row["file"]).name: row for row in manifest["assets"]}
    require(len(records) == len(EXPECTED) and set(records) == set(EXPECTED), "รายการไม่ตรง brief")
    require(sum(row["imagegen_calls"] for row in records.values()) == manifest["imagegen_calls"] <= 14,
            "จำนวนครั้ง ImageGen ไม่ตรงหรือเกินงบ")
    require(all(1 <= row["imagegen_calls"] <= 3 for row in records.values()), "retry เกิน 2 ต่อภาพ")

    for name, (size, mode) in EXPECTED.items():
        path = ROOT / "img" / "z2-events" / name
        data = path.read_bytes()
        require(data[:4] == b"RIFF" and data[8:12] == b"WEBP", f"ไม่ใช่ WebP: {name}")
        require(sha256(data) == records[name]["sha256"], f"ไฟล์เปลี่ยนจากผลส่งออก: {name}")
        with Image.open(path) as image:
            image.load()
            require(image.format == "WEBP" and image.size == size and image.mode == mode,
                    f"format/ขนาด/โหมดสีไม่ตรง: {name}")
            if mode == "RGBA":
                alpha = image.getchannel("A")
                require(alpha.getextrema() == (0, 255), f"อัลฟาไม่โปร่งจริง: {name}")
                require(sha256(alpha.tobytes()) == records[name]["alpha"]["sha256"],
                        f"อัลฟาเปลี่ยนจาก PNG ต้นทาง: {name}")
                require(all(alpha.getpixel(p) == 0 for p in [(0, 0), (1253, 0), (0, 1253), (1253, 1253)]),
                        f"มุมภาพไม่โปร่ง: {name}")
        print(f"OK {name}: {size[0]}x{size[1]} {mode}")

    with Image.open(REVIEW / "contact-sheet.jpg") as sheet:
        sheet.load()
        require(sheet.format == "JPEG" and sheet.mode == "RGB" and sheet.size == (1600, 2016),
                "contact sheet เปิดไม่ได้หรือขนาด/โหมดไม่ตรง")
    print("Checked 8/8 assets and contact sheet; alpha matches export record for 2/2 sprites.")
    print("File checks only; no game runtime or content QA approval implied.")


if __name__ == "__main__":
    main()
