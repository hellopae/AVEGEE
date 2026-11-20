"""Read-only checks for the delivered P1 sheets; run from any directory."""
from PIL import Image
from pathlib import Path
from io import BytesIO
import hashlib
import base64
import zlib
import json
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = Path(subprocess.check_output(['git', '-C', str(HERE), 'rev-parse', '--show-toplevel'], text=True).strip())
report = json.loads((HERE / 'validation.json').read_text())

def box(im, threshold):
    return list(im.getchannel('A').point(lambda a: 255 if a >= threshold else 0).getbbox())

def foot(im):
    alpha = im.getchannel('A')
    y = box(im, 128)[3] - 1
    xs = [x for x in range(im.width) if alpha.getpixel((x, y)) >= 128]
    return [(min(xs) + max(xs)) / 2, y]

count = 0
for sheet in report['sheets']:
    source = subprocess.check_output(['git', '-C', str(ROOT), 'show', f"{report['source_git_head']}:{sheet['file']}"])
    old = Image.open(BytesIO(source)).convert('RGBA')
    new = Image.open(ROOT / sheet['file'])
    assert new.mode == 'RGBA', sheet['file']
    assert list(old.size) == list(new.size) == sheet['size_new'] == sheet['size_original']
    assert hashlib.sha256(old.tobytes()).hexdigest() == sheet['original_rgba_sha256']
    assert hashlib.sha256(new.tobytes()).hexdigest() == sheet['new_rgba_sha256']
    cw, ch = sheet['cell']
    cols, rows = sheet['grid']
    assert new.size == (cw * cols, ch * rows)
    assert len(sheet['frames']) == sheet['frame_count'] == cols * rows
    for frame in sheet['frames']:
        x, y = frame['cell_origin']
        a = old.crop((x, y, x + cw, y + ch))
        b = new.crop((x, y, x + cw, y + ch))
        ba, bb = box(a, 128), box(b, 128)
        fa, fb = foot(a), foot(b)
        assert ba == frame['bbox_original'] and bb == frame['bbox_new']
        assert box(a, 1) == frame['bbox_any_alpha_original']
        assert box(b, 1) == frame['bbox_any_alpha_new']
        assert fa == frame['foot_original'] and fb == frame['foot_new']
        height_error = abs((bb[3] - bb[1]) / (ba[3] - ba[1]) - 1)
        assert height_error <= .02
        assert max(abs(fa[k] - fb[k]) for k in (0, 1)) <= 2
        assert a.getchannel('A').tobytes() == b.getchannel('A').tobytes()
        mask = Image.frombytes('L', (cw, ch), zlib.decompress(base64.b64decode(frame['protected_mask_zlib_base64'])))
        assert mask.histogram()[255] == frame['protected_source_pixels']
        blank = Image.new('RGBA', (cw, ch))
        assert Image.composite(a, blank, mask).tobytes() == Image.composite(b, blank, mask).tobytes()
        count += 1
    gif = Image.open(HERE / sheet['gif'])
    assert gif.info['loop'] == 0
    assert gif.n_frames == max(2, sheet['frame_count'])
    for i in range(gif.n_frames):
        gif.seek(i)
        gif.load()
        assert gif.info['duration'] > 0
    print(f"OK {sheet['file']}: {cols * rows} frames, RGBA, dimensions/grid, bbox/feet, alpha, protected RGBA, hashes, looping GIF")
Image.open(HERE / 'compare.jpg').verify()
assert (HERE / 'README.md').is_file() and (HERE / 'prompts.md').is_file()
print(f"Measured {count} frames across {len(report['sheets'])} sheets. Height error 0%; foot delta (0,0) px.")
print('Art approval and in-game playback are not evaluated by this script.')
