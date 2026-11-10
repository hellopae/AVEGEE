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
    '20261105T035112Z-7cf015da', '20261105T035132Z-46d9fa9a',
    '20261110T105803Z-bc08e0c8', '20261110T105823Z-31826e77',
    '20261110T112026Z-a7642a20', '20261110T112046Z-14492593',
    '20261110T114020Z-976a4086', '20261110T114040Z-659a291e',
]
PLAZA = SOURCES/'20261105T025229Z-00c52f6e/docs/art-reviews/2026-11-05-z1-v5-plaza-detail'
FULL = (9830, 6554)
# Narrow v5 fallbacks for visibly changed structural outlines in upstream natives.
# [x0,y0,x1,y1] at 1x; 48px context ring is joined adaptively, not a broad blur.
STRUCTURE_FALLBACKS = [
    dict(id='heaven-bridge', core=[3620, 545, 4065, 745], reason='HD-FULL-4 bridge supports/rock tip displaced5-12px; bridge railing/abutment changed.'),
    dict(id='lava-north-stair', core=[570, 800, 750, 940], reason='Stair side/landing outline changed in r1-c1 lower native.'),
    dict(id='lava-mid-stairs', core=[620, 1420, 820, 1620], reason='Stair width/landing edge changed in r2-c1 lower-left native.'),
    dict(id='lava-low-stair', core=[700, 1960, 825, 2050], reason='r2-c1 bottom stair top-left displaced9,5px; inspected width changed.'),
    dict(id='south-plaza-stair', core=[2420, 2910, 2620, 3060], reason='South plaza stair side moved7px and railing silhouette changed.'),
    dict(id='pier-stair', core=[2770, 2120, 2960, 2240], reason='Pier stair side/rail silhouette changed; correspondence displaced10px.'),
]
cv2.setNumThreads(2)


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def baseline():
    """v5 with the three runtime repairs baked at 1x (pixel-centre alpha ramps)."""
    im = Image.new('RGB', (4915, 3277))
    for r in range(1, 5):
        for c in range(1, 6):
            im.paste(Image.open(ROOT/f'img/map-zone1/v5/r{r}-c{c}.webp'), ((c-1)*1024, (r-1)*1024))
    # Parse the source definitions rather than maintain a second repair inventory.
    source = (ROOT/'src/town-terrain-repair.js').read_text()
    for row, col, url, border, fade, boxes in re.findall(
        r"row:(\d+),col:(\d+),url:'([^']+)',border:(\d+),fade:(\d+),boxes:(\[\[.*?\]\])", source
    ):
        x, y = (int(col)-1)*1024, (int(row)-1)*1024
        old = np.array(im.crop((x, y, x+1024, y+1024)), dtype=np.float32)
        art = np.array(Image.open(ROOT/url).convert('RGB').resize((1024, 1024), Image.Resampling.LANCZOS), dtype=np.float32)
        xx, yy = np.meshgrid(np.arange(1024)+.5, np.arange(1024)+.5)
        alpha = np.zeros((1024, 1024), np.float32)
        for x0, y0, x1, y1 in json.loads(boxes):
            a = np.clip(np.minimum(xx-x0, x1-xx)/42, 0, 1)*np.clip(np.minimum(yy-y0, y1-yy)/42, 0, 1)
            alpha = 1-(1-alpha)*(1-a)
        b, f = int(border), int(fade)
        alpha *= np.clip((np.minimum(xx, 1024-xx)-b)/f, 0, 1)
        alpha *= np.clip((np.minimum(yy, 1024-yy)-b)/f, 0, 1)
        im.paste(Image.fromarray(np.uint8(np.rint(old*(1-alpha[..., None])+art*alpha[..., None]))), (x, y))
    return im


def inventory():
    out = {}
    for run in RUNS:
        for path in sorted((SOURCES/run/'docs/art-reviews/2026-11-05-z1-v5-hd-full').glob('*/registration.json')):
            out[path.parent.name] = path
    out['r2-c3'] = PLAZA/'registration.json'
    assert len(out) == 20
    return out


def normalize(chunk, path):
    data = json.loads(path.read_text())
    parts = data if isinstance(data, list) else data.get('tiles', data.get('parts', []))
    r, c = map(int, re.fullmatch(r'r(\d)-c(\d)', chunk).groups())
    origin = np.array([(c-1)*1024, (r-1)*1024])
    result = []
    for t in parts:
        if not t['id'].startswith('q'):
            continue  # plaza t31 was an experiment, not one of the 2x2 native tiles.
        core = next((t[k] for k in ['coreMasterPx1x', 'coreMapPx1x'] if k in t), t.get('corePx1x'))
        ctx = next((t[k] for k in ['contextMasterPx1x', 'contextMapPx1x'] if k in t), t.get('contextPx1x'))
        core, ctx = np.array(core), np.array(ctx)
        if chunk == 'r2-c3':
            core[:2] += origin
            ctx[:2] += origin
        matrix = next((t[k] for k in ['nativeToContextPx1x', 'nativePixelToContextPx1x',
            'nativeToContextAffine', 'affineNativeToContext'] if k in t), None)
        if matrix is None:
            assert chunk == 'r2-c3'
            matrix = (np.vstack([t['affine'], [0, 0, 1]]) @ np.diag([ctx[2]/t['nativeSize'][0], ctx[3]/t['nativeSize'][1], 1]))[:2]
        raw = path.parent/('tiles-2x2' if chunk == 'r2-c3' else '')/f"{t['id']}-native.webp"
        assert Image.open(raw).size == tuple(t['nativeSize'])
        matrix = np.asarray(matrix, dtype=np.float64)
        global_matrix = matrix.copy()
        global_matrix[:, 2] += ctx[:2]
        # Reject any schema mix-up instead of silently placing a tile at the wrong origin.
        for key in ['nativeToGlobalMapPx1x', 'nativeToMapPx1x', 'nativeToMasterPx1x',
                    'nativePixelToMasterPx1x', 'affineNativeToMapPx1x']:
            if key in t:
                assert np.allclose(global_matrix, t[key], atol=1e-7), (chunk, t['id'], key)
        result.append(dict(id=t['id'], chunk=chunk, corePx1x=core.tolist(), contextPx1x=ctx.tolist(),
            nativeFile=str(raw), nativeSize=t['nativeSize'], sha256=sha(raw),
            nativeToContextPx1x=matrix.tolist(), nativeToMasterPx1x=global_matrix.tolist(),
            sourceRegistration=str(path), registrationSha256=sha(path),
            fallback=chunk == 'r4-c1' and t['id'] == 'q12'))
    return result


SEAMS = []


def seam(a, b, start, label):
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
    mixed = np.uint8(np.rint(left*(1-t[..., None])+right*t[..., None]))
    record = dict(id=label, overlapOutputPx=overlap, pathInOverlapOutputPx=path.tolist(),
        correctionAbsMax=float(np.abs(correction).max()), featherRadiusOutputPx=8,
        meanAbsoluteDifferenceBefore=float(np.mean(np.abs(a[:, start:].astype(np.float32)-b[:, :overlap]))),
        meanAbsoluteDifferenceAfter=float(np.mean(np.abs(left-right))))
    SEAMS.append(record)
    return np.concatenate([a[:, :start], mixed, b[:, overlap:]], axis=1)


def compose_parts(parts, base):
    aligned = {}
    for t in parts:
        x, y, w, h = t['contextPx1x']
        if t['fallback']:
            im = np.array(base.crop((x, y, x+w, y+h)).resize((w*2, h*2), Image.Resampling.LANCZOS))
        else:
            im = cv2.warpAffine(np.array(Image.open(t['nativeFile']).convert('RGB')),
                np.array(t['nativeToContextPx1x'])*2, (w*2, h*2),
                flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT)
        aligned[t['id']] = (im, (x*2, y*2))
    rows = []
    for k in [1, 2]:
        ids = [f'q{k}1', f'q{k}2']
        if ids[0] not in aligned:
            continue
        a, oa = aligned[ids[0]]
        b, ob = aligned[ids[1]]
        assert oa[1] == ob[1]
        rows.append((seam(a, b, ob[0]-oa[0], parts[0]['chunk']+f'/q{k}-vertical'), oa))
    a, oa = rows[0]
    if len(rows) == 2:
        b, ob = rows[1]
        assert oa[0] == ob[0]
        a = seam(a.transpose(1, 0, 2), b.transpose(1, 0, 2), ob[1]-oa[1],
            parts[0]['chunk']+'/q-horizontal').transpose(1, 0, 2)
    return a, oa


def restore_structure(atlas, base):
    """Copy original architecture without deforming either image. Adaptive perimeter.

    Same min-cost solver on four48-map-pixel overlap bands. The core is exactly
    Lanczos v5, feather16 output-pixels wide follows actual cut paths. Corner
    masks intersect, so no rectangular hard join or invalid coverage holes.
    """
    for item in STRUCTURE_FALLBACKS:
        x0, y0, x1, y1 = item['core']
        box = (x0-48, y0-48, x1+48, y1+48)
        x, y, ex, ey = [v*2 for v in box]
        current = atlas[y:ey, x:ex].copy()
        reference = np.array(base.crop(box).resize((ex-x, ey-y), Image.Resampling.LANCZOS))
        h, w = current.shape[:2]
        alpha = np.ones((h, w), np.float32)
        for side in ['left', 'right', 'top', 'bottom']:
            a, b = current, reference
            if side in ['top', 'bottom']:
                a, b = a.transpose(1, 0, 2), b.transpose(1, 0, 2)
            offset = 0 if side in ['left', 'top'] else a.shape[1]-96
            # A full96px overlap obtains a perimeter path; core always remains v5.
            seam(a[:, offset:offset+96], b[:, offset:offset+96], 0, 'fallback/'+item['id']+'/'+side)
            SEAMS[-1]['usage'] = 'Perimeter mask path only; original colours used for final alpha mix, no perimeter colour correction.'
            path = np.array(SEAMS[-1]['pathInOverlapOutputPx'])+offset
            t = np.clip((np.arange(a.shape[1])[None, :]-path[:, None]+8)/16, 0, 1)
            t = t*t*(3-2*t)
            if side in ['right', 'bottom']:
                t = 1-t
            if side in ['top', 'bottom']:
                t = t.T
            alpha *= t
        atlas[y:ey, x:ex] = np.uint8(np.rint(current*(1-alpha[..., None])+reference*alpha[..., None]))
        item['contextRectPx1x'] = list(box)
        item['effectiveFallbackPixels2x'] = int(np.count_nonzero(alpha))
        print('restored structure', item['id'], flush=True)
    return atlas


def assemble():
    for d in [O/'v7', O/'seam-check', O/'compare-zoom']:
        d.mkdir(parents=True, exist_ok=True)
    base = baseline()
    inputs = {chunk: normalize(chunk, path) for chunk, path in inventory().items()}
    provenance = dict(chunks=inputs, imageGenCalls=0,
        fallback=[dict(part='r4-c1/q12', reason='HD-FULL-8 manual-review.json: lower forest incorrectly replaced; source correction remains pending.',
            corePx1x=[512, 3072, 512, 205], contextPx1x=next(t['contextPx1x'] for t in inputs['r4-c1'] if t['id']=='q12'),
            method='v5 + baked runtime repairs, Lanczos 2x; min-cost join to native neighbour')],
        baselineInputs=[dict(path=str(p.relative_to(ROOT)), sha256=sha(p)) for p in
            sorted((ROOT/'img/map-zone1/v5').glob('r*-c*.webp'))+
            sorted((ROOT/'img/map-zone1/repairs').glob('*.webp'))+
            [ROOT/'src/town-terrain-repair.js', ROOT/'src/town-walkmask.js']])
    atlas, origin = None, None
    for r in range(1, 5):
        row, row_origin = None, None
        for c in range(1, 6):
            chunk = f'r{r}-c{c}'
            im, pos = compose_parts(inputs[chunk], base)
            if row is None:
                row, row_origin = im, pos
            else:
                assert row_origin[1] == pos[1]
                row = seam(row, im, pos[0]-row_origin[0], f'chunk-r{r}-c{c-1}-c{c}')
            print('assembled', chunk, im.shape, flush=True)
        if atlas is None:
            atlas, origin = row, row_origin
        else:
            assert origin[0] == row_origin[0]
            atlas = seam(atlas.transpose(1, 0, 2), row.transpose(1, 0, 2), row_origin[1]-origin[1],
                f'chunk-r{r-1}-r{r}').transpose(1, 0, 2)
    atlas = atlas[-origin[1]:FULL[1]-origin[1], -origin[0]:FULL[0]-origin[0]]
    assert atlas.shape == (FULL[1], FULL[0], 3)
    atlas = restore_structure(atlas, base)
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
    preview = O/'v7/zone1-terrain-v7-preview.webp'
    Image.fromarray(atlas).resize((1536, 1024), Image.Resampling.LANCZOS).save(preview, quality=90, method=6)
    files.append(dict(file=preview.name, width=1536, height=1024, bytes=preview.stat().st_size, sha256=sha(preview)))
    manifest = dict(version=7, fullPx=dict(w=9830, h=6554), chunk=2048, rows=4, cols=5,
        worldSize=dict(w=3840, h=2560), format='webp', quality=90, repairs=False,
        runtimeIntegration='Asset pack only; src/img unchanged. Loader must select this directory, fullPx and chunk=2048, repairs=false.',
        imageGenCalls=0, fallbackParts=['r4-c1/q12'], fallbackPatches=STRUCTURE_FALLBACKS, files=files,
        imageBytes=sum(f['bytes'] for f in files), limitBytes=40_000_000)
    write_json(O/'v7/manifest.json', manifest)
    write_json(O/'seams.json', dict(method='squared RGB difference Gaussian5 DP +/-1; feather +/-8 output pixels; symmetric local delta Gaussian16 <=8 RGB tapered to zero at overlap ends; no colour change outside overlap', seams=SEAMS))
    print('image bytes', manifest['imageBytes'], flush=True)


if __name__ == '__main__':
    assemble()
