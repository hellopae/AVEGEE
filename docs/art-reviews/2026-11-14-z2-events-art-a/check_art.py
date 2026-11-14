"""ตรวจไฟล์ภาพชุด A: รันจาก repo root ด้วย python3 <path>/check_art.py."""
from pathlib import Path
import hashlib
import json

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
SPECS = [
    ("img/z1-events/cut-sita-phantom-ledger-th.webp", (1375, 768), "RGB"),
    ("img/z1-events/cut-hanuman-yields-th.webp", (1375, 768), "RGB"),
    ("img/z1-events/cut-sita-return-th.webp", (1375, 768), "RGB"),
    ("img/z2-events/soul-ape-elder-asia.webp", (1254, 1254), "RGBA"),
    ("img/z2-events/soul-ape-elder-asia-profile.webp", (1254, 1254), "RGBA"),
    ("img/z2-events/boss-wukong-asia.webp", (512, 512), "RGBA"),
    ("img/z2-events/boss-wukong-asia-profile.webp", (512, 512), "RGB"),
    ("img/z2-events/cut-wukong-arrives-asia.webp", (1672, 941), "RGB"),
    ("img/z2-events/cut-ape-phantom-ledger-asia.webp", (1672, 941), "RGB"),
    ("img/z2-events/cut-wukong-returns-asia.webp", (1672, 941), "RGB"),
    ("img/z2-events/cut-wukong-yields-asia.webp", (1672, 941), "RGB"),
]


def check():
    exports = {r["file"]: r for r in json.loads((OUT / "exports.json").read_text())}
    rows = []
    for name, size, mode in SPECS:
        p = ROOT / name
        row = {"file": name, "expected_size": size, "expected_mode": mode}
        try:
            with Image.open(p) as im:
                im.verify()
            with Image.open(p) as im:
                im.load()
                row.update(size=list(im.size), mode=im.mode, format=im.format)
                assert im.format == "WEBP", "format"
                assert im.size == size, "size"
                assert im.mode == mode, "mode"
                if mode == "RGBA":
                    alpha = im.getchannel("A")
                    row["alpha_extrema"] = list(alpha.getextrema())
                    row["alpha_bbox"] = alpha.getbbox()
                    assert alpha.getextrema() == (0, 255), "missing transparency/opaque body"
                    assert all(alpha.getpixel(xy) == 0 for xy in
                               [(0, 0), (0, size[1]-1), (size[0]-1, 0),
                                (size[0]-1, size[1]-1)]), "nontransparent corner"
            data = p.read_bytes()
            export = exports[name]
            assert export["encoding"]["quality"] == 86, "export quality"
            assert export["sha256"] == hashlib.sha256(data).hexdigest(), "export digest"
            if mode == "RGBA":
                with Image.open(p) as im:
                    alpha_hash = hashlib.sha256(im.getchannel("A").tobytes()).hexdigest()
                    assert alpha_hash == export["source_alpha_sha256"], "alpha changed from normalized source"
                    row["alpha_matches_source"] = True
                    if Path(name).name == "boss-wukong-asia.webp":
                        assert export["encoding"]["lossless"] is True, "W4 lossless encoding"
                        assert hashlib.sha256(im.tobytes()).hexdigest() == export["source_rgba_sha256"], "W4 pixels changed"
                        row["rgba_matches_W4"] = True
            row.update(bytes=len(data), sha256=hashlib.sha256(data).hexdigest(), result="OK")
        except Exception as exc:
            row.update(result="FAIL", error=str(exc))
        rows.append(row)
    report = {"checks": "exists, verify, decode, WEBP, exact dimensions/mode, RGBA alpha/corners, export digest/q86, alpha source hash, W4 RGBA source hash",
              "files": rows, "ok": sum(r["result"] == "OK" for r in rows), "total": len(rows)}
    (OUT / "checks.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    return report


def contact_sheet(specs, name, columns=2):
    cell_w, cell_h = 700, 440
    sheet = Image.new("RGB", (columns*cell_w, ((len(specs)+columns-1)//columns)*cell_h), "#161c28")
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Monaco.ttf", 16)
    except OSError:
        font = ImageFont.load_default()
    for i, (path, size, mode) in enumerate(specs):
        x, y = (i % columns)*cell_w, (i // columns)*cell_h
        p = ROOT / path
        if p.exists():
            with Image.open(p) as im:
                im = im.convert("RGBA")
                im.thumbnail((cell_w-24, cell_h-65), Image.Resampling.LANCZOS)
                bg = Image.new("RGBA", im.size, "#b9c2cc")
                bd = ImageDraw.Draw(bg)
                for cy in range(0, im.height, 16):
                    for cx in range(0, im.width, 16):
                        if (cx//16 + cy//16) % 2:
                            bd.rectangle((cx, cy, cx+15, cy+15), fill="#d6dde5")
                bg.alpha_composite(im)
                sheet.paste(bg.convert("RGB"), (x+(cell_w-im.width)//2, y+10))
        draw.text((x+12, y+cell_h-46), Path(path).name, font=font, fill="white")
        draw.text((x+12, y+cell_h-24), f"{size[0]} x {size[1]} {mode}", font=font, fill="#b9c2cc")
    sheet.save(OUT / name, quality=92, subsampling=0)


if __name__ == "__main__":
    report = check()
    contact_sheet(SPECS[:3], "contact-sheet-a1.jpg")
    contact_sheet(SPECS[3:7], "contact-sheet-a2-characters.jpg")
    contact_sheet(SPECS[7:], "contact-sheet-a2-cutscenes.jpg")
    for row in report["files"]:
        print(row["result"], row["file"], row.get("size"), row.get("mode"), row.get("error", ""))
    print(f"File checks: {report['ok']}/{report['total']}")
    raise SystemExit(0 if report["ok"] == report["total"] else 1)
