"""Read-only checks for the delivered west-b artwork. Requires Pillow."""
from pathlib import Path
from PIL import Image
import hashlib
import json

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
baseline = json.loads((HERE / 'baseline.json').read_text())
report = json.loads((HERE / 'validation.json').read_text())
expected = {
    'img/crew-combat-v1/west/guard.webp': ((1536, 1024), (4, 2), 'combat.gif'),
    'img/crew-combat-v1/west/guard-idle.webp': ((1024, 384), (4, 1), 'idle.gif'),
    'img/West/crew-guard-west-walk-v2.webp': ((2172, 724), (4, 1), 'walk.gif'),
}
assert {s['path'] for s in report['sheets']} == set(expected)
assert {s['path'] for s in baseline} == set(expected)
max_dx = max_dy = max_height = 0
for sheet in report['sheets']:
    path = ROOT / sheet['path']
    size, grid, gif_name = expected[sheet['path']]
    original = next(s for s in baseline if s['path'] == sheet['path'])
    im = Image.open(path)
    assert im.size == size == tuple(original['size'])
    assert im.mode == 'RGBA' == original['mode']
    assert tuple(sheet['grid']) == grid == tuple(original['grid'])
    assert hashlib.sha256(path.read_bytes()).hexdigest() == sheet['sha256']
    cols, rows = grid
    assert len(sheet['frames']) == cols * rows == sheet['frame_count']
    cw, ch = im.width // cols, im.height // rows
    assert (cw, ch) == tuple(original['cell_size'])
    for rec in sheet['frames']:
        i = rec['index']
        frame = im.crop((i % cols * cw, i // cols * ch,
                         (i % cols + 1) * cw, (i // cols + 1) * ch))
        alpha = frame.getchannel('A')
        mask = alpha.point(lambda v: 255 if v >= 128 else 0)
        bb = mask.getbbox()
        assert bb and list(bb) == rec['after']['bbox_alpha128']
        assert alpha.getextrema()[0] == 0
        band = max(8, round((bb[3] - bb[1]) * .08))
        feet = mask.crop((0, bb[3] - band, cw, bb[3])).getbbox()
        foot_x = (feet[0] + feet[2] - 1) / 2
        foot_y = bb[3] - 1
        assert foot_x == rec['after']['foot_x']
        assert foot_y == rec['after']['foot_y']
        before = original['frames'][i]
        dx = abs(foot_x - before['foot_x'])
        dy = abs(foot_y - before['foot_y'])
        height = foot_y - rec['after']['head_top_y'] + 1
        assert height == rec['after']['character_height']
        height_delta = abs(height / before['character_height'] - 1) * 100
        assert dx <= 2 and dy <= 2 and height_delta <= 3
        assert mask.crop((0, rec['after']['head_top_y'], cw,
                          rec['after']['head_top_y'] + 2)).getbbox()
        if 'runtime_crop_local' in before:
            actual = alpha.getbbox()
            x0, y0, x1, y1 = before['runtime_crop_local']
            assert x0 <= actual[0] < actual[2] <= x1
            assert y0 <= actual[1] < actual[3] <= y1
        max_dx, max_dy = max(max_dx, dx), max(max_dy, dy)
        max_height = max(max_height, height_delta)
    gif = Image.open(HERE / gif_name)
    assert gif.n_frames == cols * rows
    assert gif.size == (cw, ch)
    assert gif.info.get('loop') == 0
assert Image.open(HERE / 'compare.jpg').format == 'JPEG'
assert (HERE / 'README.md').is_file()
assert report['imagegen_calls'] <= 12
print(f'Checked 3 sheets / 16 frames / 3 GIFs; max foot dx={max_dx}px, '
      f'dy={max_dy}px; max character-height delta={max_height:.3f}%.')
print('Head landmarks are manually selected; this does not test game playback or artistic approval.')
