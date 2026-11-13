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
    '20261113T042731Z-852dd473', '20261113T044051Z-18492653',
    '20261113T044110Z-6767827c', '20261113T083606Z-6d680311',
    '20261113T083614Z-edf7e01a',
]
FULL = (9830, 6554)
# Source-derived architecture restoration, not generated repairs.
# Global1x [x0,y0,x1,y1]; each core has a48px adaptive perimeter ring.
STRUCTURE_FALLBACKS = [
    dict(id='invented-volcanic-bridge', core=[1000, 90, 1590, 440], reason='Run1 q11 invents a bridge and staircase in the panorama; visually confirmed in upstream-structure-review.jpg.'),
    dict(id='upper-plaza-added-steps-rail', core=[1830, 320, 2260, 600], reason='Run1 r1-c2/q12 adds railing; adjacent r1-c3/q11 adds upper-left steps.'),
    dict(id='east-plaza-thick-rim', core=[2870, 370, 3072, 660], reason='Run1 r1-c3/q12 changes the right road edge into a thick rim.'),
    dict(id='pale-source-feature', core=[2360, 745, 2440, 815], reason='Run1 r1-c3/q21 replaces the pale source feature with a pink tree.'),
    dict(id='upper-stair-foot', core=[3120, 280, 3270, 420], reason='Run1 r1-c4 upper stair foot reports12px displacement and a changed landing.'),
    dict(id='heaven-bridge', core=[3600, 485, 3910, 660], reason='Run1 r1-c4 bridge approaches and steps differ from source.'),
    dict(id='volcanic-stair-foot', core=[1385, 775, 1580, 940], reason='Run1 r1-c2 stair-foot-right displacement4.4721px and changed stair-foot paving.'),
    dict(id='northwest-stair', core=[380, 360, 590, 550], reason='Final focus audit: changed tread spacing, base and step/rail proportions at source staircase; repeated-step match displaced9,11px.'),
    dict(id='west-mid-stair', core=[1640, 1190, 1870, 1360], reason='Final focus audit: altered treads and extended edging; independent contour probes displaced6-12px.'),
    dict(id='main-plaza-stair', core=[2290, 1390, 2540, 1670], reason='Final focus audit: tread geometry differs; source stairs match at search boundary12px.'),
    dict(id='central-bridge-stair-rails', core=[2340, 1900, 2600, 2580], reason='Final focus audit: bridge rails removed and lower stair sides shifted5-7px. Restore source geometry rather than invent rails.'),
    dict(id='pier-stair-rails', core=[2770, 2100, 2960, 2330], reason='Final focus audit: pier rails removed and stair width changed; reliable contour discrepancies retained.'),
    dict(id='east-water-stair', core=[3130, 2100, 3260, 2220], reason='Final focus audit: water stair rail supports removed and side outline changed.'),
    dict(id='ice-stair', core=[4435, 750, 4645, 950], reason='Final focus audit: tread arrangement and source right stair edge changed.'),
    dict(id='east-plaza-stair', core=[3110, 650, 3290, 810], reason='Final focus audit: altered tread spacing; repeated-step correspondence hits12px search boundary.'),
]
cv2.setNumThreads(2)


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def baseline():
    """The active Asia v2 terrain, with repairs:false in zone-skin.js."""
    im = Image.new('RGB', (4915, 3277))
    for r in range(1, 5):
        for c in range(1, 6):
            with Image.open(ROOT/f'img/map-zone2/v2/r{r}-c{c}.webp') as tile:
                im.paste(tile, ((c-1)*1024, (r-1)*1024))
    return im


def inventory():
    paths = sorted((O/'inputs').glob('r*/registration.json'))
    if not paths:
        raise RuntimeError('Run ingest.py first; native/registration are archived locally.')
    out = {p.parent.name:p for p in paths}
    assert len(out) == 20
    return out


def normalize(chunk, path):
    data = json.loads(path.read_text())
    result = []
    for t in data.get('tiles', data.get('parts', [])):
        # First three runs use xywh; continuation runs4/5 use xyxy.
        if 'contextRectPx1x' in t:
            ctx = np.array(t['contextRectPx1x']); ctx[2:] -= ctx[:2]
            core = np.array(t['coreRectPx1x']); core[2:] -= core[:2]
        else:
            core = np.array(t['coreMasterPx1x'])
            ctx = np.array(t['contextMasterPx1x'])
        matrix = np.asarray(t.get('nativeToContextPx1x', t.get('nativePixelToContextPx1x')), dtype=np.float64)
        glob = matrix.copy(); glob[:,2] += ctx[:2]
        key = 'nativeToMasterPx1x' if 'nativeToMasterPx1x' in t else 'nativePixelToMasterPx1x'
        assert np.allclose(glob,t[key],atol=1e-7), (chunk,t['id'],'matrix/schema mismatch')
        raw = path.parent/f"{t['id']}-native.webp"
        with Image.open(raw) as im:
            assert im.size == tuple(t['nativeSize'])
        result.append(dict(id=t['id'], chunk=chunk, corePx1x=core.tolist(), contextPx1x=ctx.tolist(),
            nativeFile=str(raw.relative_to(O)), nativeSize=t['nativeSize'], sha256=sha(raw),
            nativeToContextPx1x=matrix.tolist(), nativeToMasterPx1x=glob.tolist(),
            sourceRegistration=str(path.relative_to(O)), registrationSha256=sha(path), fallback=False))
    if chunk == 'r2-c3':
        assert {t['id'] for t in result} == {'q11','q12','q21'}
        result.append(dict(id='q22',chunk=chunk,corePx1x=[2560,1536,512,512],
            contextPx1x=[2496,1472,640,640],fallback=True,
            reason='Missing native in HD-FULL2; source Asia v2 enlarged2x Lanczos.'))
    assert len(result) == (2 if chunk.startswith('r4-') else 4)
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
            im = cv2.warpAffine(np.array(Image.open(O/t['nativeFile']).convert('RGB')),
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
    Lanczos Asia v2, feather16 output-pixels wide follows actual cut paths. Corner
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
            # A full96px overlap obtains a perimeter path; core always remains Asia v2.
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
        fallback=[dict(part='r2-c3/q22', reason='Native missing in HD-FULL2.', corePx1x=[2560,1536,512,512], contextPx1x=[2496,1472,640,640], method='Asia v2 Lanczos2x; min-cost join to native neighbours')],
        baselineInputs=[dict(path=str(p.relative_to(ROOT)), sha256=sha(p)) for p in
            sorted((ROOT/'img/map-zone2/v2').glob('r*-c*.webp'))+
            [ROOT/'src/zone-skin.js', ROOT/'src/town-walkmask.js', ROOT/'src/town-owner-walkmask-asia.js']])
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
    preview = O/'v7/zone2-terrain-v7-preview.webp'
    Image.fromarray(atlas).resize((1536, 1024), Image.Resampling.LANCZOS).save(preview, quality=90, method=6)
    files.append(dict(file=preview.name, width=1536, height=1024, bytes=preview.stat().st_size, sha256=sha(preview)))
    manifest = dict(zone='asia',version=7,visualAcceptanceVerified=False, fullPx=dict(w=9830, h=6554), chunk=2048, rows=4, cols=5,
        worldSize=dict(w=3840, h=2560), format='webp', quality=90, repairs=False,
        runtimeIntegration='Asset pack only; src/img unchanged. Loader must select this directory, fullPx and chunk=2048, repairs=false.',
        imageGenCalls=0, fallbackParts=['r2-c3/q22'], fallbackPatches=STRUCTURE_FALLBACKS, files=files,
        imageBytes=sum(f['bytes'] for f in files), limitBytes=40_000_000)
    write_json(O/'v7/manifest.json', manifest)
    write_json(O/'seams.json', dict(method='squared RGB difference Gaussian5 DP +/-1; feather +/-8 output pixels; symmetric local delta Gaussian16 <=8 RGB tapered to zero at overlap ends; no colour change outside overlap', seams=SEAMS))
    print('image bytes', manifest['imageBytes'], flush=True)


if __name__ == '__main__':
    assemble()
