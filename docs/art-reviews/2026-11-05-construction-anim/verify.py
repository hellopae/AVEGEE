"""Validate delivered raster/metadata containers, without claiming visual QA."""
from pathlib import Path
import hashlib
import json
from PIL import Image
import numpy as np
from export import clean_alpha, composite, delta, motion_mask, pale_spirit_pixels, register, split

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
        ground_masks, edge_spans, fringe = [], [], []
        for i in range(n):
            frame = sheet.crop((i*w,0,(i+1)*w,h))
            a = np.array(frame)
            # A 1-2% export downsample can turn isolated source alpha=255 into 254.
            assert a[:,:,3].min() == 0 and a[:,:,3].max() >= 250
            border = np.concatenate([a[0,:,3],a[-1,:,3],a[:,0,3],a[:,-1,3]])
            assert not border.any(), 'sprite clipped against frame border'
            ground = a[:,:,3] > 100
            ground[:h//2] = False
            ys,xs = np.where(ground)
            assert int(xs.max()-xs.min()+1) == stage['groundWidthPx']
            assert [int(xs.min())+stage['groundWidthPx']//2,int(ys.max())] == stage['foot']
            ground_masks.append(a[595:645,:,3] > 100)
            edge_spans.append([[int(xx.min()),int(xx.max())] if len(xx) else None
                for row in (600,620,635) for xx in [np.where(a[row,:,3] > 100)[0]]])
            edge = (a[:,:,3] > 8) & (a[:,:,3] < 248)
            fringe.append((int(np.sum(edge & (a[:,:,0] > 180) & (a[:,:,1] < 65) & (a[:,:,2] < 65))),
                           int(np.sum(edge & (a[:,:,0] > 210) & (a[:,:,1] > 190) & (a[:,:,2] < 45)))))
            a[a[:,:,3] == 0,:3] = 0
            hashes.append(hashlib.sha256(a.tobytes()).hexdigest())
        assert len(set(hashes)) == n, 'duplicate cels'
        entry = review['stages'][str(stage['stage'])]
        sid = stage['stage']
        mask_image = Image.open(ROOT/f'sources/motion-mask-stage-{sid}.png')
        mask = np.array(mask_image)
        assert np.array_equal(mask, np.array(motion_mask(sid)))
        assert hashlib.sha256(mask.tobytes()).hexdigest() == entry['staticLayer']['maskSHA256']
        assert not mask[595:].any(), 'motion mask touches lower base'
        fixed, core = mask == 0, mask == 255
        original = split(ROOT/f'sources/stage-{sid}-a.webp') + split(ROOT/f'sources/stage-{sid}-b.webp')
        registered = [np.array(clean_alpha(register(f)[0])) for f in original]
        assert [hashlib.sha256(a.tobytes()).hexdigest() for a in registered] == entry['staticLayer']['originalCelSHA256']
        frames = [sheet.crop((i*w,0,(i+1)*w,h)) for i in range(n)]
        arrays = [np.array(f) for f in frames]
        adjacent = [round(delta(frames[i],frames[(i+1)%n]),5) for i in range(n)]
        assert adjacent == entry['adjacentCompositeMAEIncludingWrap']
        ratio = round(adjacent[-1]/np.median(adjacent[:-1]),4)
        assert ratio == entry['wrapToMedianInternalDelta']
        for a, raw in zip(arrays, registered):
            assert np.array_equal(a[fixed], registered[0][fixed]), 'static scene drift'
            assert np.array_equal(a[core], raw[core]), 'original drawn motion altered'
        motion_hashes = [hashlib.sha256(a[core].tobytes()).hexdigest() for a in arrays]
        assert len(set(motion_hashes)) == n, 'drawn action cores must remain distinct'
        assert motion_hashes == entry['staticLayer']['motionCoreSHA256']
        assert entry['staticLayer']['staticPixelCount'] == int(np.sum(fixed))
        assert entry['staticLayer']['motionCorePixelCount'] == int(np.sum(core))
        assert entry['staticLayer']['staticPixelsChangedVersusReference'] == [0]*n
        assert entry['staticLayer']['motionCorePixelsChangedVersusOriginalCel'] == [0]*n
        uncovered = [int(np.sum(pale_spirit_pixels(a) & ~core)) for a in registered]
        assert uncovered == entry['staticLayer']['paleBlueWhitePixelScreenOutsideCore'] == [0]*n
        assert all(not np.any((a[:,:,3] > 0) & (a[:,:,3] <= 8)) for a in arrays)
        assert all(not a[a[:,:,3] == 0,:3].any() for a in arrays)
        assert edge_spans == entry['lowerGroundEdgeSpansAtY600620635']
        ious = [round(float(np.sum(m & ground_masks[0])/np.sum(m | ground_masks[0])),5) for m in ground_masks]
        assert ious == entry['lowerGroundSilhouetteIoUVersusFirst']
        drift = max(abs(a-b) for spans in edge_spans for row,ref in zip(spans,edge_spans[0])
                    if row and ref for a,b in zip(row,ref))
        assert drift == entry['maxLowerGroundEdgeSpanDriftPx']
        assert drift == 0, 'base edge regression'
        assert ious == [1.0]*n, 'base silhouette regression'
        assert fringe == [(e['saturatedRedEdgePixels'],e['saturatedYellowEdgePixels']) for e in entry['edgeScreen']]
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
        gif_errors = []
        for i in range(gif.n_frames):
            gif.seek(i)
            duration += gif.info['duration']
            expected = composite(frames[i]).resize(gif.size, Image.Resampling.LANCZOS)
            error = float(np.mean(np.abs(np.array(gif.convert('RGB')).astype(float)
                                        - np.array(expected).astype(float))))
            assert error < 2, f'GIF frame {i} differs from atlas: {error}'
            gif_errors.append(error)
        assert duration == round(1000*n/stage['fps'])
        print(f"stage-{stage['stage']}: {n} unique RGBA cels, {w}x{h}, GIF loop {duration} ms")
        print(f"  Base edge drift {drift} px; min silhouette IoU {min(ious):.5f}")
        print(f"  Static RGBA pixels fixed: {int(np.sum(fixed)):,}; original motion cores preserved in all 8 cels")
        print(f"  GIF max RGB MAE {max(gif_errors):.5f}; wrap/internal median ratio {ratio:.4f}")
        print('  Red/yellow alpha-edge screen: 0 pixels; pale-spirit mask-boundary screen: 0 pixels')
    for name in ('frame-strip.jpg','style-compare.jpg','alignment-review.jpg','gif-review.jpg'):
        with Image.open(ROOT/name) as im:
            im.verify()
    for name in ('README.md','prompts.json','tests-run.txt','queue-check.json'):
        assert (ROOT/name).stat().st_size > 0, f'missing deliverable: {name}'
    queue = json.loads((ROOT/'queue-check.json').read_text())
    assert queue['status'] in ('ready','incomplete')
    assert isinstance(queue['evidence'],list) and queue['evidence']
    assert isinstance(queue['remaining'],list)
    if queue['status'] == 'ready':
        assert queue['remaining'] == []
    total = sum(p.stat().st_size for p in ROOT.rglob('*') if p.is_file())
    assert total <= 30_000_000, f'{total} bytes > 30 MB'
    print(f'Container checks complete; bundle {total:,} bytes. Visual acceptance is separate.')


if __name__ == '__main__':
    main()
