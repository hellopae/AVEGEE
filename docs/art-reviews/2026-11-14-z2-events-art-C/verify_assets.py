"""ตรวจไฟล์ชุด C และสร้างหลักฐานจาก WebP ที่เกมอ่านจริง (ต้องมี Pillow)."""
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageOps

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
NAMES = ['deserter', 'commander', 'cupdealer', 'granary-sister', 'bandit-chief']
FILES = [f'soul-{name}-asia{suffix}.webp' for name in NAMES for suffix in ('', '-profile')]
FILES += [f'prop-{name}-asia.webp' for name in ('shackle-pair', 'cup-flame', 'empty-granary')]
manifest = json.loads((HERE / 'generation-inputs.json').read_text())
sources = {row['file']: Path(row['source']) for row in manifest['sources']}
assert set(sources) == set(FILES)
rows = []
for name in FILES:
    path = ROOT / 'img/z2-events' / name
    with Image.open(path) as image:
        image.load()
        prop = name.startswith('prop-')
        expected_size = (1375, 768) if prop else (1254, 1254)
        expected_mode = 'RGB' if prop else 'RGBA'
        assert image.format == 'WEBP', name
        assert image.size == expected_size, name
        assert image.mode == expected_mode, name
        row = dict(file=str(path.relative_to(ROOT)), size=list(image.size), mode=image.mode,
                   decode=True, bytes=path.stat().st_size, sha256=hashlib.sha256(path.read_bytes()).hexdigest())
        if not prop:
            alpha = image.getchannel('A')
            assert alpha.getextrema() == (0, 255), name
            assert all(alpha.getpixel(point) == 0 for point in [(0, 0), (1253, 0), (0, 1253), (1253, 1253)]), name
            row['alpha_range'] = list(alpha.getextrema())
            row['alpha_bbox'] = list(alpha.getbbox())
            row['source_alpha_identical'] = None
            if sources[name].exists():
                with Image.open(sources[name]) as original:
                    original = original.convert('RGBA')
                    if original.size != expected_size:
                        original = original.resize(expected_size, Image.Resampling.LANCZOS)
                    same = ImageChops.difference(original.getchannel('A'), alpha).getbbox() is None
                    assert same, name
                    row['source_alpha_identical'] = same
        rows.append(row)
assert len({row['sha256'] for row in rows}) == 13
report = dict(files_checked=len(rows), failures=0, checks=rows,
              source_alpha_files_compared=sum(row.get('source_alpha_identical') is True for row in rows),
              note='ตรวจโครงสร้างไฟล์เท่านั้น; ข้อกำหนดภาพและหน้า/ชุดตรวจด้วยสายตาแยกต่างหาก')
(HERE / 'check-results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')

font = ImageFont.load_default(size=15)
def tile(canvas, name, box):
    x, y, width, height = box
    canvas.paste((31, 38, 46), (x, y, x + width, y + height))
    with Image.open(ROOT / 'img/z2-events' / name) as source:
        source = ImageOps.contain(source.convert('RGBA'), (width - 20, height - 42))
        canvas.paste(source, (x + (width - source.width) // 2, y + 8), source)
    ImageDraw.Draw(canvas).text((x + 8, y + height - 26), name.removesuffix('.webp'), font=font, fill='white')

characters = Image.new('RGB', (2000, 1000), (20, 24, 29))
for col, name in enumerate(NAMES):
    for row, suffix in enumerate(('', '-profile')):
        tile(characters, f'soul-{name}-asia{suffix}.webp', (col * 400, row * 500, 398, 498))
characters.save(HERE / 'contact-sheet-characters.jpg', quality=93, subsampling=0)
props = Image.new('RGB', (1000, 1770), (20, 24, 29))
for row, name in enumerate(('shackle-pair', 'cup-flame', 'empty-granary')):
    tile(props, f'prop-{name}-asia.webp', (0, row * 590, 1000, 588))
props.save(HERE / 'contact-sheet-props.jpg', quality=93, subsampling=0)
print(f'checked={len(rows)} failures=0 alpha_identical={report["source_alpha_files_compared"]}/10')
