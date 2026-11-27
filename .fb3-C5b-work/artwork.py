from io import BytesIO
from pathlib import Path
import json
import re
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont, ImageOps

WORK = Path('.fb3-C5b-work')
REVIEW = Path('docs/art-reviews/2026-11-26-fb3-C5b')
TARGET = (1672, 941)
MAX_BYTES = 450_000
CAPTION = {
    'asia-01': 'เหลียนกังเหวี่ยงตราโซ่ในจังหวะที่ยมบาทน้อยเผลอ นิราอยู่ด้านขวา',
    'asia-02': 'นิราก้าวเข้าขวางพลังสีฟ้าและรับแรงโจมตีแทนยมบาทน้อย',
    'asia-03': 'ยมบาทน้อยลุกขึ้นบังนิรา ขณะพลัง Rage ปะทุรอบตัว',
    'asia-04': 'ยมบาทน้อยพุ่งชนเกราะเหลียนกังด้วย Rage ปีศาจสองตนล้มอยู่ข้างลาน',
    'asia-05-v2': 'ยมบาทน้อยนำชามาเยี่ยมนิราที่พักฟื้นในศาลา ใช้ภาพเดียวกับหน้าต่างเยี่ยมนิรา',
    'west-01': 'เซเวอรินคุกเข่ายอมรับชัยชนะของยมบาทน้อยท่ามกลางลานน้ำแข็ง',
    'west-02': 'เกล็ดน้ำแข็งรวมตัวเหนือฝ่ามือยมบาทน้อย โดยมีเซเวอรินยืนมอง',
}

def filename(key):
    return f'story-{key}.webp'

def baseline(key):
    return subprocess.check_output(['git', 'show', f'HEAD:img/{filename(key)}'])

def budget(old):
    return min(MAX_BYTES, len(old) * 115 // 100)

def verify(key, path, old):
    with Image.open(path) as im:
        assert (im.format, im.size, im.n_frames, im.mode) == ('WEBP', TARGET, 1, 'RGB'), key
        im.load()
        oriented = (im, im.transpose(Image.Transpose.ROTATE_90))
        for axis in oriented:
            luminance = axis.convert('L')
            for y in list(range(8)) + list(range(axis.height - 8, axis.height)):
                band = luminance.crop((0, y, axis.width, y+1))
                hist = band.histogram()
                assert sum(hist[:17]) / axis.width < 0.98, (key, 'mostly black edge', y)
    size = path.stat().st_size
    assert size <= budget(old), (key, size, budget(old))
    assert path.read_bytes() != old, key
    return size

def stage(key, raw):
    old = baseline(key)
    path = WORK / filename(key)
    with Image.open(raw) as source:
        rendered = ImageOps.fit(source.convert('RGB'), TARGET, Image.Resampling.LANCZOS)
        scratch = BytesIO()
        lo, hi = 0, 100
        best = b''
        selected_quality = None
        while lo <= hi:
            q = (lo + hi) // 2
            scratch.seek(0)
            scratch.truncate()
            rendered.save(scratch, 'WEBP', quality=q, method=6)
            if scratch.tell() <= budget(old):
                best = scratch.getvalue()
                selected_quality = q
                lo = q + 1
            else:
                hi = q - 1
        assert best, (key, 'could not meet WebP budget')
        path.write_bytes(best)
        print(f'{key} generated={source.size} quality={selected_quality} bytes={verify(key,path,old)} cap={budget(old)}')

def thumb(image, box, canvas, x, y):
    image = ImageOps.contain(image.convert('RGB'), box, Image.Resampling.LANCZOS)
    canvas.paste(image, (x + (box[0] - image.width) // 2, y + (box[1] - image.height) // 2))

def report(calls):
    crop_source = Path('src/cutscene-presentation.js').read_text()
    fontfile = '/System/Library/Fonts/Supplemental/Thonburi.ttc'
    label_font = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 17)
    note_font = ImageFont.truetype(fontfile, 22)
    w, h, gap, margin, header, label = 516, 290, 12, 18, 68, 29
    sheet = Image.new('RGB', (2*w+gap+2*margin, header+len(CAPTION)*(h+label+gap)+margin), '#25232a')
    draw = ImageDraw.Draw(sheet)
    x2 = margin+w+gap
    with Image.open(WORK/'header.png') as title:
        sheet.paste(title.convert('RGB'))
    changed, pending, before, after, crop = [], [], 0, 0, []
    rows = []
    for i, (key, desc) in enumerate(CAPTION.items()):
        filename_ = filename(key)
        target = Path('img') / filename_
        y = header+i*(h+label+gap)
        draw.text((margin, y+2), filename_, font=label_font, fill='#ebd9bc')
        original = baseline(key)
        with Image.open(BytesIO(original)) as old:
            thumb(old, (w,h), sheet, margin, y+label)
            old_size = f'{old.width}×{old.height}'
        unchanged = target.read_bytes() == original
        if unchanged:
            pending.append(filename_)
            draw.text((x2+w//2, y+label+h//2), 'รอภาพใหม่', font=note_font, fill='#ebd9bc', anchor='mm')
            size = len(original)
            new_size, desc = old_size, 'ยังใช้ภาพเดิม'
        else:
            changed.append(filename_)
            size = verify(key, target, original)
            new_size = f'{TARGET[0]}×{TARGET[1]}'
            with Image.open(target) as new:
                thumb(new, (w,h), sheet, x2, y+label)
            match = re.search(r"'" + re.escape(filename_) + r"':\[(\d+),(\d+)\]", crop_source)
            if match:
                crop.append(f'- `{filename_}` `[{match[1]},{match[2]}]`')
        before += len(original)
        after += size
        delta = (size / len(original) - 1)*100
        rows.append(f'| `img/{filename_}` | {old_size} → {new_size} | {len(original)/1000:.2f} → {size/1000:.2f} | {delta:+.2f}% | {desc} |')

    REVIEW.mkdir(parents=True, exist_ok=True)
    low, high = 50, 91
    chosen = b''
    while low <= high:
        quality = (low + high) // 2
        data = BytesIO()
        sheet.save(data, 'JPEG', quality=quality, optimize=True, progressive=True)
        if data.tell() <= MAX_BYTES:
            chosen = data.getvalue()
            low = quality + 1
        else:
            high = quality - 1
    assert chosen, 'could not meet comparison JPEG budget'
    (REVIEW/'compare.jpg').write_bytes(chosen)
    prompt_summary = (
        'ใช้ภาพเดิมคุมจังหวะและองค์ประกอบ ใช้ภาพของขุนแผน ตะเกียงสีดา และประตูกวนอูคุมเส้นคม '
        'สัดส่วน chibi แสงอุ่น และรายละเอียดฉาก ใช้ภาพชุดและบอสประจำโซน 2–3 คุมสีผิว เขา หมวก ลายผ้าและเกราะ '
        'แล้วให้ ImageGen วาดเต็มกรอบ 16:9 ตามเหตุการณ์ในตาราง โดยเว้นข้อความและ UI ออกจากภาพ'
    )
    lines = [
        '# FB3-C5b ปรับภาพคัตซีนโซน 2–3', '',
        f'ส่งภาพใหม่ **{len(changed)}/7 ภาพ** ใช้ ImageGen ในตัว {calls} ครั้ง '
        'ภาพเดิมอยู่ฝั่งซ้ายพร้อมแถบดำตามต้นฉบับ ภาพใหม่อยู่ฝั่งขวา [compare.jpg](compare.jpg)', '',
        prompt_summary, '',
        'ขนาดไฟล์คิดที่ 1 KB = 1,000 ไบต์ เทียบกับไฟล์เดิมจาก HEAD '
        'เพดานของภาพใหม่แต่ละไฟล์คือค่าที่ต่ำกว่าระหว่าง 450 KB กับ 115% ของขนาดเดิม', '',
        '| ไฟล์ | พิกเซล เดิม → ใหม่ | KB เดิม → ใหม่ | เปลี่ยน | รายละเอียด |',
        '| --- | --- | ---: | ---: | --- |',
        *rows, '',
        f'ขนาดรวมคัตซีนชุดนี้ {before/1000:,.2f} → {after/1000:,.2f} KB', '',
        '## งานครอปที่ต้องทำตอนนำภาพเข้าเกม', '',
        'ลบค่าครอปเดิมของไฟล์ด้านล่างออกจาก `CONTENT_ROWS` เพื่อให้คัตซีนแสดงครบทั้งเฟรม 1672×941 '
        '[src/cutscene-presentation.js](../../../src/cutscene-presentation.js#L5)', '',
        *crop, '',
        '`story-asia-03.webp` ใช้ขนาดเต็มตามค่าเริ่มต้นอยู่แล้ว', '',
        '`story-asia-05-v2.webp` ยังถูกโหลดตรงจากหน้าต่างเยี่ยมนิราที่ศาลาน้ำชา จึงใช้ภาพใหม่เต็มกรอบในหน้าต่างนั้นด้วย', '',
        f'ชุดนี้เป็นงานภาพ การลบค่าครอป {len(crop)} รายการเป็นงานติดตามในโค้ด', '',
    ]
    if pending:
        lines[3:3] = ['ภาพที่ยังค้าง ได้แก่ ' + ', '.join(f'`{p}`' for p in pending), '']
    (REVIEW/'README.md').write_text('\n'.join(lines), encoding='utf-8')
    print(f'{len(changed)} images, comparison {sheet.size}, {len(chosen)} bytes')

if sys.argv[1] == 'stage':
    stage(sys.argv[2], sys.argv[3])
elif sys.argv[1] == 'report':
    report(int(sys.argv[2]))
elif sys.argv[1] == 'verify':
    for key in CAPTION:
        print(key, verify(key, Path('img') / filename(key), baseline(key)))
