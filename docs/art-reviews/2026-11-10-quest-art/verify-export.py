"""ตรวจไฟล์ส่งออกโดยไม่แก้ภาพหรือโค้ดเกม (ต้องมี Pillow)."""
import hashlib
import json
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parent
REPO = OUT.parents[2]
SOURCE = Path('/Users/agapae/agapae-work/.toby-worktrees/.codex-worktrees/20261110T170237Z-317132f8/docs/art-reviews/2026-11-10-quest-art')
MOBS = ['debtor', 'collector', 'gauze-big', 'gauze', 'tale-big', 'tale']
SKILLS = [('kan', 'eyeAwaitingPermission', 'kan-eye-reflect-512', 512),
          ('boon', 'letterDelivered', 'boon-letter-glow-512', 512),
          ('guard', 'gatekeeperStand', 'guard-gate-wave-768', 768)]
expected = {f'mob-q-{name}.png': ((512, 512), 'RGBA') for name in MOBS}
for kind, skill, fx, size in SKILLS:
    expected[f'skills-v1/icons/{skill}.webp'] = ((256, 256), 'RGBA')
    expected[f'skills-v1/fx/{fx}.webp'] = ((size, size), 'RGBA')
    for frame in ('01', '02'):
        expected[f'skills-v1/th/{kind}-{skill}-cut-{frame}.webp'] = ((1375, 768), 'RGB')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

actual = {str(p.relative_to(OUT)) for p in OUT.rglob('*') if p.suffix in ('.png', '.webp')}
assert actual == set(expected), (actual - set(expected), set(expected) - actual)
records = []
for name, (size, mode) in expected.items():
    path = OUT / name
    with Image.open(path) as im:
        im.load()
        assert im.size == size, name
        assert im.mode == mode, (name, im.mode)
        assert im.format == ('PNG' if name.endswith('.png') else 'WEBP'), name
        assert getattr(im, 'n_frames', 1) == 1, name
        record = dict(path=name, size=list(im.size), mode=im.mode, bytes=path.stat().st_size)
        if mode == 'RGBA':
            alpha = im.getchannel('A')
            assert alpha.getextrema() == (0, 255), name
            bbox = alpha.getbbox()
            margins = [bbox[0], bbox[1], im.width - bbox[2], im.height - bbox[3]]
            assert min(margins) >= 8, (name, margins)
            record.update(alpha_extrema=[0, 255], transparent_margins_px=margins,
                          transparent_fraction=round(alpha.histogram()[0] / (im.width * im.height), 6))
    record['sha256'] = sha(path)
    record['source_sha256'] = sha(SOURCE / name)
    assert record['sha256'] == record['source_sha256'], name
    records.append(record)

style = (REPO / 'ASSET-PROMPTS.md').read_text().split('## บล็อกสไตล์ — แปะนำหน้าทุก prompt')[1].split('```')[1].strip()
prompts = json.loads((OUT / 'prompts.json').read_text())
assert len(prompts) == 18
assert {r['name'] for r in prompts} == set(expected)
assert all(r['prompt'].startswith(style) for r in prompts)
assert sha(OUT / 'prompts.json') == sha(SOURCE / 'prompts.json')
assert sha(OUT / 'contact-sheet.jpg') == sha(SOURCE / 'contact-sheet.jpg')
for name in ('contact-sheet.jpg', 'alpha-contact-sheet.jpg'):
    with Image.open(OUT / name) as im:
        im.verify()

refs = ['img/Asia/crew-kan-asia-cutscene.jpeg', 'img/West/crew-boon-west-cutscene-f.jpeg',
        'img/crew-guard-cutscene.jpeg', 'img/Asia/mob-kasha-asia.png',
        'img/Asia/mob-hitodama-asia.png', 'img/mob-tanee.png', 'img/mob-pret2.png',
        'img/skills-v1/icons/karmaFracture.webp']
total = sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())
assert total < 40_000_000, total
report = dict(result='passed', asset_count=18, counts=dict(enemies=6, icons=3, cutscenes=6, effects=3),
              assets=records, source=str(SOURCE), copied_assets_identical=18,
              style_prefix_matches=18, total_bytes_at_check=total, limit_bytes=40_000_000,
              reference_sha256={name: sha(REPO / name) for name in refs},
              limits='การตรวจขนาด/alpha/hash ไม่ยืนยันเนื้อหาหรือความเหมือนใบหน้า; ดู visual-review.md ประกอบ')
(OUT / 'technical-checks.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(f'ตรวจครบ 18 ภาพ: ขนาด/รูปแบบ/alpha/ขอบโปร่ง/hash/prompt ตรงข้อกำหนด; โฟลเดอร์ {total:,} bytes < 40,000,000')
