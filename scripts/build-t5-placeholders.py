#!/usr/bin/env python3
"""T5': labelled placeholder pictures for the story slots of Rae R2 part A (sections 4-10) that Codex has not drawn yet (right file name, right pixel size, never stretched).
A real drawing saved under the same name replaces a placeholder with no code change.  Cutscenes: 1672x941 · sprites: transparent RGBA · profiles / icons: square.
  python3 scripts/build-t5-placeholders.py <group> [<group> ...]      groups: wanthong yomathat frontier12 guanyu boatman guanyin wukong lian musashi ryujin cerberus   (an existing file is never overwritten)"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parent.parent / 'img'
CUT = (1672, 941)
# group -> [(path under img/, (w, h), kind, label)]   kind: cut | sprite | square
GROUPS = {
 'frontier12': [
  ('z1-events/cut-frontier12-stop-th.webp', CUT, 'cut', 'PLACEHOLDER cut-frontier12-stop-th  (E2: Yomathat\'s hand on Yama\'s shoulder, same cave as E1)'),
 ],
 'guanyu': [
  ('z2-events/boss-guanyu-asia.webp', (512, 512), 'sprite', 'PLACEHOLDER boss-guanyu-asia (F1: Guan Yu, standing, polearm upright)'),
  ('z2-events/boss-guanyu-asia-profile.webp', (512, 512), 'square', 'PLACEHOLDER boss-guanyu-asia-profile'),
  ('z2-events/boss-guanyu-asia-guard.webp', (512, 512), 'sprite', 'PLACEHOLDER boss-guanyu-asia-guard (map sprite of the Zone 2 Guard)'),
  ('z2-events/cut-guanyu-gate-asia.webp', CUT, 'cut', 'PLACEHOLDER cut-guanyu-gate-asia  (F2: the red gate in haze, Guan Yu before it)'),
  ('z2-events/cut-guanyu-sweep-asia.webp', CUT, 'cut', 'PLACEHOLDER cut-guanyu-sweep-asia  (F3: Green Dragon Sweep, half circle with green glints)'),
  ('z2-events/cut-guanyu-yields-asia.webp', CUT, 'cut', 'PLACEHOLDER cut-guanyu-yields-asia  (F4: haft planted, hands before chest, bow)'),
  ('z2-events/cut-yomathat-gift-asia.webp', CUT, 'cut', 'PLACEHOLDER cut-yomathat-gift-asia  (D2: the half-open red gate, the bundle and purse; D2b: the flame lights the lamp)'),
  ('summon/cut-yomathat-flame-guard.webp', CUT, 'cut', 'PLACEHOLDER cut-yomathat-flame-guard  (D4: heavy flame-blade cut, wall of flame behind him)'),
 ],
 'boatman': [
  ('boat/boatman-lung-chaew.webp', (512, 512), 'sprite', 'PLACEHOLDER boatman-lung-chaew (G1: old boatman at the stern, straw hat, long oar)'),
  ('boat/boatman-lung-chaew-profile.webp', (512, 512), 'square', 'PLACEHOLDER boatman-lung-chaew-profile'),
  ('boat/cut-boatman-song-asia.webp', CUT, 'cut', 'PLACEHOLDER cut-boatman-song-asia  (G2: the boat on still water, Lung Chaew singing, Yama and Nira at the bow)'),
  ('boat/fx-water-song.webp', CUT, 'cut', 'PLACEHOLDER fx-water-song (G3: ripples at the end of the landing, faint gold motes; Zone 2 adds a small red lantern)'),
  ('boat/item-oar.webp', (512, 512), 'square', 'PLACEHOLDER item-oar (G4: small hand-carved oar with a faded blue ribbon)'),
 ],
 'guanyin': [   # T6/2 - Rae R2 part B, group H
  ('z2-events/soul-guanyin-father-asia.webp', (1254, 1254), 'sprite', 'PLACEHOLDER soul-guanyin-father-asia (H1: the father, an old king in faded robes, shoulders down, hands clasped)'),
  ('z2-events/soul-guanyin-father-asia-profile.webp', (1254, 1254), 'square', 'PLACEHOLDER soul-guanyin-father-asia-profile'),
  ('z2-events/cut-guanyin-descends-asia.webp', CUT, 'cut', 'PLACEHOLDER cut-guanyin-descends-asia  (H2: white light in the hall, lotus petals, Guanyin in plain white with a willow vase; Yama + Nira bow, the father kneels bottom right)'),
  ('z2-events/cut-guanyin-father-asia.webp', CUT, 'cut', 'PLACEHOLDER cut-guanyin-father-asia  (H3: she bows to her father who is bent to the floor; light from behind, petals fading)'),
 ],
 'wanthong': [
  ('z1-events/soul-wanthong-th.webp', (1254, 1254), 'sprite', 'PLACEHOLDER soul-wanthong-th (Lady Wanthong, court sprite)'),
  ('z1-events/soul-wanthong-th-profile.webp', (1254, 1254), 'square', 'PLACEHOLDER soul-wanthong-th-profile'),
  ('z1-events/boss-khunphaen-th.webp', (512, 512), 'sprite', 'PLACEHOLDER boss-khunphaen-th (Khun Phaen)'),
  ('z1-events/boss-khunphaen-th-profile.webp', (512, 512), 'square', 'PLACEHOLDER boss-khunphaen-th-profile'),
  ('z1-events/cut-khunphaen-arrives-th.webp', CUT, 'cut', 'PLACEHOLDER cut-khunphaen-arrives-th  (C3: doors kicked open, mist-grey horse outside)'),
  ('z1-events/cut-khunphaen-yields-th.webp', CUT, 'cut', 'PLACEHOLDER cut-khunphaen-yields-th  (C4: Khun Phaen on one knee, Wanthong stands between)'),
  ('z1-events/cut-khunphaen-gift-th.webp', CUT, 'cut', 'PLACEHOLDER cut-khunphaen-gift-th  (C5: the bow, boy with topknot - no baby)'),
  ('summon/kuman-thong.webp', (512, 512), 'sprite', 'PLACEHOLDER kuman-thong (C6 full figure)'),
  ('summon/kuman-thong-icon.webp', (512, 512), 'square', 'PLACEHOLDER kuman-thong-icon'),
  ('summon/kuman-thong-battle.webp', (512, 512), 'sprite', 'PLACEHOLDER kuman-thong-battle'),
  ('summon/cut-kuman-golden-aegis.webp', CUT, 'cut', 'PLACEHOLDER cut-kuman-golden-aegis  (C7: golden dome over the team)'),
 ],
}
def font(size):
    for f in ('/System/Library/Fonts/Supplemental/Arial.ttf', '/System/Library/Fonts/Helvetica.ttc'):
        try: return ImageFont.truetype(f, size)
        except Exception: pass
    return ImageFont.load_default()
def wrap(d, text, f, width):
    words, lines, cur = text.split(' '), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=f) <= width: cur = t
        else: lines.append(cur); cur = w
    return lines + [cur]
def make(path, size, kind, label):
    w, h = size
    im = Image.new('RGBA' if kind == 'sprite' else 'RGB', size, (0, 0, 0, 0) if kind == 'sprite' else (24, 14, 20)); d = ImageDraw.Draw(im)
    m = max(6, w // 100)
    if kind == 'sprite':     # a simple standing figure on transparent: head + body + feet at the bottom edge (the real sprite stands on the bottom edge too)
        cx = w // 2; d.ellipse([cx - w * .12, h * .06, cx + w * .12, h * .06 + w * .24], fill=(120, 96, 64, 235), outline=(255, 224, 164, 255), width=m // 2 + 1)
        d.rounded_rectangle([cx - w * .2, h * .06 + w * .22, cx + w * .2, h * .97], radius=w * .05, fill=(90, 66, 52, 235), outline=(255, 224, 164, 255), width=m // 2 + 1)
        box = [m, h * .45, w - m, h * .45 + h * .22]
    else:
        d.rectangle([m, m, w - m - 1, h - m - 1], outline=(167, 129, 67), width=max(3, m // 2))
        d.line([m, m, w - m - 1, h - m - 1], fill=(60, 40, 48), width=2); d.line([w - m - 1, m, m, h - m - 1], fill=(60, 40, 48), width=2)
        box = [m * 2, h * .5 - h * .09, w - m * 2, h * .5 + h * .09]
    d.rectangle(box, fill=(24, 14, 20, 255)); f = font(max(12, int(w * (.022 if kind == 'cut' else .05))))
    y = box[1] + 8
    for line in wrap(d, f'{label}  {w}x{h}', f, box[2] - box[0] - 16):
        d.text((box[0] + 8, y), line, fill=(255, 224, 164, 255), font=f); y += f.size + 4
    out = ROOT / path; out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, 'WEBP', quality=78); print(path, im.size)
for g in sys.argv[1:]:
    for path, size, kind, label in GROUPS[g]:
        if (ROOT / path).exists(): print('keeps', path); continue
        make(path, size, kind, label)
