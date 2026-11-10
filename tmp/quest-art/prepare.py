import json
import shutil
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont

root = Path.cwd()
review = root / 'docs/art-reviews/2026-11-10-quest-art'
entries = json.loads((root / 'tmp/quest-art/entries.json').read_text())
for entry in entries:
    image = Image.open(entry['source']).convert('RGBA')
    name = entry['name']
    if '/th/' in name:
        image = ImageOps.fit(image.convert('RGB'), (1375, 768), Image.Resampling.LANCZOS)
    else:
        side = 256 if '/icons/' in name else 768 if name.endswith('-768.webp') else 512
        margin = 8 if side == 256 else 16 if side == 512 else 24
        image = image.crop(image.getchannel('A').getbbox())
        image.thumbnail((side - 2 * margin, side - 2 * margin), Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA', (side, side))
        canvas.alpha_composite(image, ((side - image.width) // 2, (side - image.height) // 2))
        image = canvas
    target = review / name
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.suffix == '.webp':
        image.save(target, lossless=True, method=6)
    else:
        image.save(target, optimize=True)
    live = root / 'img' / name
    live.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(target, live)
    print(name, image.size, image.mode, target.stat().st_size)

font = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 15)
title_font = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 23)
sheet = Image.new('RGB', (1536, 1650), '#191722')
draw = ImageDraw.Draw(sheet)
draw.text((24, 16), 'QUEST ART / 6 ENEMIES + 3 ULTIMATES', font=title_font, fill='#eee1bd')
for i, entry in enumerate(entries[:6]):
    x, y = 16 + i * 254, 58
    image = Image.open(review / entry['name']).convert('RGBA')
    image.thumbnail((238, 238), Image.Resampling.LANCZOS)
    sheet.paste(image, (x + (238 - image.width) // 2, y), image)
    draw.text((x, y + 246), entry['key'], font=font, fill='white')

skills = [('eye', 'eyeAwaitingPermission'), ('letter', 'letterDelivered'), ('gate', 'gatekeeperStand')]
for row, (prefix, skill) in enumerate(skills):
    top = 350 + row * 420
    draw.text((24, top), skill, font=title_font, fill='#eee1bd')
    for key, box in [(prefix + '-icon', (20, top + 40, 220, 230)),
                     (prefix + '-fx', (250, top + 40, 270, 270)),
                     (prefix + '-cut-01', (540, top + 40, 480, 269)),
                     (prefix + '-cut-02', (1036, top + 40, 480, 269))]:
        entry = next(item for item in entries if item['key'] == key)
        x, y, w, h = box
        image = Image.open(review / entry['name']).convert('RGBA')
        image.thumbnail((w, h), Image.Resampling.LANCZOS)
        sheet.paste(image, (x + (w - image.width) // 2, y), image)
        draw.text((x, top + 322), key, font=font, fill='white')
        if key.endswith('-icon'):
            small = Image.open(review / entry['name']).convert('RGBA').resize((40, 40), Image.Resampling.LANCZOS)
            sheet.paste(small, (x + 85, top + 355), small)
sheet.save(review / 'contact-sheet.jpg', quality=90, optimize=True)
print('review bytes', sum(p.stat().st_size for p in review.rglob('*') if p.is_file()))
