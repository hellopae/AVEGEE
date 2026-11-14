"""Direct native -> registered 2x atlas. Writes only inside this review directory.

No generation, global grading, sharpening, dense warp, or runtime edits.
Python 3 + Pillow + numpy + OpenCV. Run from any directory.
External source worktrees are read only; inventory.json records their hashes.
"""
from pathlib import Path
import hashlib
import json
import re

import cv2
import numpy as np
from PIL import Image

O = Path(__file__).resolve().parents[1]
ROOT = O.parents[2]
SOURCES = Path('/Users/agapae/agapae-work/.codex-worktrees')
RUNS = [
    '20261114T042638Z-7b9ca353', '20261114T042658Z-8bb1f62d',
    '20261114T065936Z-8b73ee34', '20261114T045714Z-d333090d',
    '20261114T070300Z-30291ec5',
]
FULL = (9830, 6554)
# Add only visually demonstrated structural restorations, with evidence/reasons.
STRUCTURE_FALLBACKS = []
cv2.setNumThreads(2)


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def baseline():
    """Active zone4 v3, repairs=false in src/zone-skin.js; no runtime overlays."""
    im = Image.new('RGB', (4915, 3277))
    for r in range(1, 5):
        for c in range(1, 6):
            with Image.open(ROOT/f'img/map-zone4/v3/r{r}-c{c}.webp') as tile:
                assert tile.size == (min(1024, 4915-(c-1)*1024), min(1024, 3277-(r-1)*1024))
                im.paste(tile, ((c-1)*1024, (r-1)*1024))
    return im


def inventory():
    """Use local, hash-verified snapshots; assembly can rerun without source worktrees."""
    out = {p.parent.name: p for p in sorted((O/'inputs').glob('r*-c*/registration.json'))}
    assert set(out) == {f'r{r}-c{c}' for r in range(1, 5) for c in range(1, 6)}
    return out


def snapshot_sources():
    import shutil
    chunks, files = set(), []
    for run in RUNS:
        source = SOURCES/run/'docs/art-reviews/2026-11-10-z4-hd-full'
        for reg in sorted(source.glob('*/registration.json')):
            chunk = reg.parent.name
            assert chunk not in chunks, ('duplicate source', chunk)
            chunks.add(chunk)
            dst = O/'inputs'/chunk
            dst.mkdir(parents=True, exist_ok=True)
            # Keep exact registration and quality/removal evidence alongside every native.
            paths = sorted(reg.parent.glob('q*-native.webp')) + [reg]
            paths += [p for p in reg.parent.glob('*.json') if p != reg]
            for src in paths:
                target = dst/src.name
                shutil.copyfile(src, target)
                assert sha(src) == sha(target)
                files.append(dict(original=str(src), copy=str(target.relative_to(O)),
                    bytes=target.stat().st_size, sha256=sha(target)))
        dst = O/'inputs'/run
        dst.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source/'README.md', dst/'README.md')
        files.append(dict(original=str(source/'README.md'), copy=str((dst/'README.md').relative_to(O)),
            bytes=(dst/'README.md').stat().st_size, sha256=sha(dst/'README.md')))
    assert len(chunks) == 20
    write_json(O/'source-copies.json', dict(files=files, nativeCount=sum(f['copy'].endswith('-native.webp') for f in files),
        referenceCommit='8c8f339f', referenceDirectoryUnavailable=True,
        note='Zone1 reference worktree is absent; scripts and README read from the original commit, git read-only.'))


def normalize(chunk, path):
    data = json.loads(path.read_text())
    parts = data.get('tiles', data.get('parts'))
    r, c = map(int, re.fullmatch(r'r(\d)-c(\d)', chunk).groups())
    origin = np.array([(c-1)*1024, (r-1)*1024])
    result = []
    entries = parts.items() if isinstance(parts, dict) else ((t['id'], t) for t in parts)
    for tid, t in entries:
        if 'coreMasterPx1x' in t:
            core = np.array(t['coreMasterPx1x'], dtype=int)
            ctx = np.array(t['contextMasterPx1x'], dtype=int)
        else:
            # Runs1-4: GLOBAL XYXY, even though run1 uses the shorter Rect key.
            core = np.array(t['coreRectPx1x'], dtype=int)
            ctx = np.array(t['contextRectPx1x'], dtype=int)
            core[2:] -= core[:2]
            ctx[2:] -= ctx[:2]
        x, y, w, h = core
        cx, cy, cw, ch = ctx
        assert 0 <= cx <= x < x+w <= cx+cw <= 4915
        assert 0 <= cy <= y < y+h <= cy+ch <= 3277
        assert origin[0] <= x < x+w <= min(origin[0]+1024, 4915)
        assert origin[1] <= y < y+h <= min(origin[1]+1024, 3277)
        raw = path.parent/t.get('nativeFile', f'{tid}-native.webp')
        with Image.open(raw) as im:
            assert im.size == tuple(t['nativeSize'])
        if 'nativeSHA256' in t:
            assert sha(raw) == t['nativeSHA256']
        matrix = np.array(t['nativeToContextPx1x'], dtype=np.float64)
        assert matrix.shape == (2, 3) and np.isfinite(matrix).all()
        global_matrix = matrix.copy()
        global_matrix[:, 2] += ctx[:2]
        if 'nativeToMasterPx1x' in t:
            assert np.allclose(global_matrix, t['nativeToMasterPx1x'], atol=1e-7)
        if 'nativeToChunkPx2x' in t:
            local = global_matrix.copy()
            local[:, 2] -= origin
            out_matrix = local*2
            out_matrix[:, 2] += .5  # 1x pixel centres -> 2x pixel centres
            assert np.allclose(out_matrix, t['nativeToChunkPx2x'], atol=1e-7)
        result.append(dict(id=tid, chunk=chunk, corePx1x=core.tolist(), contextPx1x=ctx.tolist(),
            nativeFile=str(raw.relative_to(O)), nativeSize=t['nativeSize'], sha256=sha(raw),
            nativeToContextPx1x=matrix.tolist(), nativeToMasterPx1x=global_matrix.tolist(),
            sourceRegistration=str(path.relative_to(O)), registrationSha256=sha(path), fallback=False))
    assert {t['id'] for t in result} == ({'q11','q12'} if r == 4 else {'q11','q12','q21','q22'})
    # Cores must partition this chunk exactly, without overlaps or holes.
    cover = np.zeros((min(1024,3277-origin[1]), min(1024,4915-origin[0])), np.uint8)
    for t in result:
        x,y,w,h = t['corePx1x']
        cover[y-origin[1]:y-origin[1]+h, x-origin[0]:x-origin[0]+w] += 1
    assert np.all(cover == 1), chunk
    return result


SEAMS = []


def seam(a, b, start, label, valid_a=None, valid_b=None):
    """Join horizontal neighbours at known global overlap; only overlap pixels change.

    Local symmetric colour compensation <=8 RGB, tapered to zero at band ends;
    min-cost path with step -1/0/+1; smoothstep feather +/-8 output pixels.
    """
    overlap = a.shape[1]-start
    assert 32 <= overlap <= 260 and a.shape[0] == b.shape[0], (label, a.shape, b.shape, start)
    left, right = a[:, start:].astype(np.float32), b[:, :overlap].astype(np.float32)
    delta = cv2.GaussianBlur(left-right, (0, 0), 16)
    taper = np.sin(np.linspace(0, np.pi, overlap, dtype=np.float32))[None, :, None]**2
    correction = np.clip(delta*.5, -8, 8)*taper
    left = np.clip(left-correction, 0, 255)
    right = np.clip(right+correction, 0, 255)
    cost = cv2.GaussianBlur(np.mean((left-right)**2, axis=2), (5, 5), 0)
    with_validity = valid_a is not None or valid_b is not None
    if with_validity:
        assert valid_a.shape == a.shape[:2] and valid_b.shape == b.shape[:2]
        va, vb = valid_a[:, start:], valid_b[:, :overlap]
        # Avoid paths through extrapolated samples when a true overlap exists.
        cost[~(va & vb)] += 1e8
    # Keep feather endpoints inside the overlap, avoiding an abrupt cut at its ends.
    cost[:, :10] = np.inf
    cost[:, -10:] = np.inf
    h, w = cost.shape
    dp, back = cost.copy(), np.zeros((h, w), np.int8)
    for y in range(1, h):
        p = np.pad(dp[y-1], (1, 1), constant_values=np.inf)
        choices = np.stack([p[:w], p[1:w+1], p[2:]])
        choice = np.argmin(choices, axis=0)
        back[y] = choice-1
        dp[y] += choices[choice, np.arange(w)]
    path = np.empty(h, np.int32)
    path[-1] = np.argmin(dp[-1])
    for y in range(h-1, 0, -1):
        path[y-1] = path[y]+back[y, path[y]]
    t = np.clip((np.arange(w)[None, :]-path[:, None]+8)/16, 0, 1)
    t = t*t*(3-2*t)
    if with_validity:
        t[va & ~vb] = 0
        t[vb & ~va] = 1
    mixed = np.uint8(np.rint(left*(1-t[..., None])+right*t[..., None]))
    record = dict(id=label, overlapOutputPx=overlap, pathInOverlapOutputPx=path.tolist(),
        correctionAbsMax=float(np.abs(correction).max()), featherRadiusOutputPx=8,
        meanAbsoluteDifferenceBefore=float(np.mean(np.abs(a[:, start:].astype(np.float32)-b[:, :overlap]))),
        meanAbsoluteDifferenceAfter=float(np.mean(np.abs(left-right))))
    SEAMS.append(record)
    result = np.concatenate([a[:, :start], mixed, b[:, overlap:]], axis=1)
    if with_validity:
        valid = np.concatenate([valid_a[:, :start], va | vb, valid_b[:, overlap:]], axis=1)
        return result, valid
    return result


def compose_parts(parts):
    aligned = {}
    for t in parts:
        x, y, w, h = t['contextPx1x']
        transform = np.array(t['nativeToContextPx1x'])*2
        transform[:, 2] += .5
        im = cv2.warpAffine(np.array(Image.open(O/t['nativeFile']).convert('RGB')),
            transform, (w*2, h*2), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT)
        valid = cv2.warpAffine(np.ones(tuple(reversed(t['nativeSize'])), np.float32),
            transform, (w*2, h*2), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT) >= .999
        aligned[t['id']] = (im, (x*2, y*2), valid)
    rows = []
    for k in [1, 2]:
        ids = [f'q{k}1', f'q{k}2']
        if ids[0] not in aligned:
            continue
        a, oa, va = aligned[ids[0]]
        b, ob, vb = aligned[ids[1]]
        assert oa[1] == ob[1]
        joined, valid = seam(a, b, ob[0]-oa[0], parts[0]['chunk']+f'/q{k}-vertical', va, vb)
        rows.append((joined, oa, valid))
    a, oa, va = rows[0]
    if len(rows) == 2:
        b, ob, vb = rows[1]
        assert oa[0] == ob[0]
        joined, valid = seam(a.transpose(1, 0, 2), b.transpose(1, 0, 2), ob[1]-oa[1],
            parts[0]['chunk']+'/q-horizontal', va.T, vb.T)
        a, va = joined.transpose(1, 0, 2), valid.T
    return a, oa, va


def assemble():
    for d in [O/'v7', O/'seam-check', O/'compare-zoom']:
        d.mkdir(parents=True, exist_ok=True)
    inputs = {chunk: normalize(chunk, path) for chunk, path in inventory().items()}
    provenance = dict(chunks=inputs, imageGenCalls=0, fallback=[],
        outputPixelCentreConvention='u2x=2*u1x+0.5 for every native; matches explicit run3 output matrices.',
        baselineInputs=[dict(path=str(p.relative_to(ROOT)), sha256=sha(p)) for p in
            sorted((ROOT/'img/map-zone4/v3').glob('r*-c*.webp'))+
            [ROOT/'src/zone-skin.js', ROOT/'src/cyberhell-terrain.js', ROOT/'src/town-owner-walkmask-cyberhell.js']])
    atlas, origin, atlas_valid = None, None, None
    for r in range(1, 5):
        row, row_origin, row_valid = None, None, None
        for c in range(1, 6):
            chunk = f'r{r}-c{c}'
            im, pos, valid = compose_parts(inputs[chunk])
            if row is None:
                row, row_origin, row_valid = im, pos, valid
            else:
                assert row_origin[1] == pos[1]
                row, row_valid = seam(row, im, pos[0]-row_origin[0], f'chunk-r{r}-c{c-1}-c{c}', row_valid, valid)
            print('assembled', chunk, im.shape, flush=True)
        if atlas is None:
            atlas, origin, atlas_valid = row, row_origin, row_valid
        else:
            assert origin[0] == row_origin[0]
            joined, valid = seam(atlas.transpose(1, 0, 2), row.transpose(1, 0, 2), row_origin[1]-origin[1],
                f'chunk-r{r-1}-r{r}', atlas_valid.T, row_valid.T)
            atlas, atlas_valid = joined.transpose(1, 0, 2), valid.T
    atlas = atlas[-origin[1]:FULL[1]-origin[1], -origin[0]:FULL[0]-origin[0]]
    assert atlas.shape == (FULL[1], FULL[0], 3)
    atlas_valid = atlas_valid[-origin[1]:FULL[1]-origin[1], -origin[0]:FULL[0]-origin[0]]
    invalid = (~atlas_valid).astype(np.uint8)
    Image.fromarray(invalid*255).save(O/'native-domain-extrapolation.png')
    n, labels, stats, centroids = cv2.connectedComponentsWithStats(invalid)
    provenance['nativeDomainExtrapolation'] = dict(outputPixels=int(invalid.sum()),
        fraction=float(invalid.mean()), mask='native-domain-extrapolation.png',
        components=[dict(rectPx2x=[int(v) for v in stats[i,:4]], pixels=int(stats[i,4])) for i in range(1,n)],
        method='Validity-aware overlap composition always selects a real sample when either contributor has one; reflected generated samples remain only where neither covers the output. No v3 fallback.')
    provenance['fallbackPatches'] = STRUCTURE_FALLBACKS
    write_json(O/'inventory.json', provenance)
    files = []
    for r in range(1, 5):
        for c in range(1, 6):
            x, y = (c-1)*2048, (r-1)*2048
            im = Image.fromarray(atlas[y:min(y+2048, FULL[1]), x:min(x+2048, FULL[0])])
            path = O/f'v7/r{r}-c{c}.webp'
            im.save(path, quality=90, method=6)
            files.append(dict(file=path.name, width=im.width, height=im.height, bytes=path.stat().st_size,
                sha256=sha(path), rectPx2x=[x, y, im.width, im.height]))
            print('exported', path.name, path.stat().st_size, flush=True)
    preview = O/'v7/zone4-terrain-v7-preview.webp'
    Image.fromarray(atlas).resize((1536, 1024), Image.Resampling.LANCZOS).save(preview, quality=90, method=6)
    files.append(dict(file=preview.name, width=1536, height=1024, bytes=preview.stat().st_size, sha256=sha(preview)))
    manifest = dict(version=7, zone=4, fullPx=dict(w=9830, h=6554), chunk=2048, rows=4, cols=5,
        worldSize=dict(w=3840, h=2560), format='webp', quality=90, repairs=False,
        runtimeIntegration='Asset pack only; src/img unchanged. Loader must select this directory, fullPx and chunk=2048, repairs=false.',
        imageGenCalls=0, fallbackParts=[], fallbackPatches=STRUCTURE_FALLBACKS, files=files,
        imageBytes=sum(f['bytes'] for f in files), limitBytes=40_000_000)
    write_json(O/'v7/manifest.json', manifest)
    write_json(O/'seams.json', dict(method='squared RGB difference Gaussian5 DP +/-1; feather +/-8 output pixels; symmetric local delta Gaussian16 <=8 RGB tapered to zero at overlap ends; validity-aware path penalty and source selection; no colour change outside overlap', seams=SEAMS))
    print('image bytes', manifest['imageBytes'], flush=True)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--snapshot', action='store_true', help='Copy exact upstream native and registration inputs before assembly.')
    args = parser.parse_args()
    if args.snapshot:
        snapshot_sources()
    assemble()
