"""Validate delivered raster/metadata containers, without claiming visual QA."""
from pathlib import Path
import hashlib
import json
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parent


def main():
    manifest = json.loads((ROOT/'construction.json').read_text())
    review = json.loads((ROOT/'loop-review.json').read_text())
    assert [s['stage'] for s in manifest['stages']] == [1, 2, 3]
    geometry = {(s['frameW'],s['frameH'],tuple(s['foot']),s['worldWidth']) for s in manifest['stages']}
    assert len(geometry) == 1, 'stage geometry must agree'
    for stage in manifest['stages']:
        n,w,h = stage['frames'],stage['frameW'],stage['frameH']
        assert 6 <= n <= 8 and w >= 640 and stage['fps'] > 0
        sheet = Image.open(ROOT/stage['file'])
        assert sheet.mode == 'RGBA' and sheet.size == (n*w,h)
        assert getattr(sheet,'n_frames',1) == 1, 'single-row atlas, not animated WebP'
        hashes = []
        for i in range(n):
            frame = sheet.crop((i*w,0,(i+1)*w,h))
            a = np.array(frame)
            # A 1-2% export downsample can turn isolated source alpha=255 into 254.
            assert a[:,:,3].min() == 0 and a[:,:,3].max() >= 250
            border = np.concatenate([a[0,:,3],a[-1,:,3],a[:,0,3],a[:,-1,3]])
            assert not border.any(), 'sprite clipped against frame border'
            a[a[:,:,3] == 0,:3] = 0
            hashes.append(hashlib.sha256(a.tobytes()).hexdigest())
        assert len(set(hashes)) == n, 'duplicate cels'
        entry = review['stages'][str(stage['stage'])]
        # Hidden RGB under alpha=0 is not part of the visible artwork.
        assert hashes == entry['visibleSHA256'], 'WebP changed visible source cel pixels'
        assert entry['uniqueDrawnCels'] == n
        assert min(entry['nativeGroundPixelsPerWorldUnit']) >= 2.56
        assert entry['exportGroundPixelsPerWorldUnit'] >= 2.56
        assert 200 <= stage['groundWorldWidth'] <= 260
        assert stage['groundWorldWidth'] == stage['groundWidthPx']/w*stage['worldWidth']
        assert all(p['groundWidth'] == stage['groundWidthPx'] == 600 for p in entry['packing'])
        assert all(0 < p['scale'] <= 1 for p in entry['packing']), 'no upscaling'
        assert all(e['saturatedRedEdgePixels'] == 0 for e in entry['edgeScreen'])
        assert all(e['saturatedYellowEdgePixels'] == 0 for e in entry['edgeScreen'])
        gif = Image.open(ROOT/f"preview/stage-{stage['stage']}.gif")
        assert gif.n_frames == n and gif.info.get('loop') == 0
        duration = 0
        for i in range(gif.n_frames):
            gif.seek(i)
            duration += gif.info['duration']
        assert duration == round(1000*n/stage['fps'])
        print(f"stage-{stage['stage']}: {n} unique RGBA cels, {w}x{h}, GIF loop {duration} ms")
    for name in ('frame-strip.jpg','style-compare.jpg'):
        with Image.open(ROOT/name) as im:
            im.verify()
    total = sum(p.stat().st_size for p in ROOT.rglob('*') if p.is_file())
    assert total <= 30_000_000, f'{total} bytes > 30 MB'
    print(f'Container checks complete; bundle {total:,} bytes. Visual acceptance is separate.')


if __name__ == '__main__':
    main()
