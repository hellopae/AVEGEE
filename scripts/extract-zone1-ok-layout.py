"""Z1-LAYOUT-A step 1-2: read the owner's Illustrator layout files (read-only) and export
a normalised object layout in ok.jpg pixel space + de-duplicated sprites.

Usage: PYTHONPATH=<dir containing pypdf> python3 scripts/extract-zone1-ok-layout.py
Outputs go to docs/art-reviews/2026-11-05-zone1-layout/ (layout.json, sprites/).
Source files are only opened for reading.
"""
import sys, os, json, copy, hashlib, math, gc
from io import BytesIO
from pathlib import Path
import numpy as np, cv2
from PIL import Image, ImageCms
for p in ('/private/tmp/avegee-pdf-lib',):
    if os.path.isdir(p): sys.path.insert(0, p)
from pypdf import PdfReader
from pypdf.generic import ContentStream
from pypdf.generic._image_xobject import _xobj_to_image
sys.path.insert(0, str(Path(__file__).resolve().parent))
from z1_layout_common import warp_sprite

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/art-reviews/2026-11-05-zone1-layout'
SRC = Path('/Users/agapae/Documents/Work PAE/Claude/AVEGEE-reference/files/UI New map')
FILES = ['New Map Zone1-3.ai', 'New Map Zone1-4.ai', 'New Map Zone1-5.ai']
PSD = SRC / 'New-Map-Zone1.psd'
ORIG = SRC / 'New Pic Map Zone1'   # owner's original sprite PNGs (read-only)
CORR = OUT_CORR = None
MATCH_MAX_DIFF = 20.0          # thumbnail mean-abs-diff (0-255); AI CMYK->RGB conversion differs from the original PNG by ~1-10
MATCH_MARGIN = 2.0             # runner-up must be >= 2x worse (when several originals share the pixel size)
OKW, OKH = 2500, 1758          # ok.jpg / PSD canvas
BASE_IMS = {f'Im{i}' for i in range(0, 11)}   # sky, mountains, side/bottom ground, clouds (base layers, not objects)
CLOUD_IMS = {'Im8', 'Im9', 'Im10'}   # the three clouds in 3.ai: owner's art, absent from Codex's terrain pack -> kept apart as baseLayerExtras
GUIDE = 'Im7'                  # 1495x1052 picture covering the whole layout = ok frame
DEDUPE_PX = 6.0
CROP_ALPHA = 4                 # alpha >= this counts as content when cropping
FOOT_ALPHA = 128
SPRITE_MAX_X = 2.0             # exported long side <= 2x placed size, never upscaled


def parse_ai(path):
    r = PdfReader(str(path)); page = r.pages[0]; res = page['/Resources']; xo = res['/XObject']
    gs_res = res.get('/ExtGState', {})
    ops = ContentStream(page.get_contents(), r).operations
    ctm = np.eye(3); stack = []; clip = []; poly = []; clipnext = False; cur_gs = None
    draws = []
    for a, op in ops:
        if op == b'q': stack.append((ctm.copy(), copy.deepcopy(clip), cur_gs))
        elif op == b'Q': ctm, clip, cur_gs = stack.pop()
        elif op == b'cm':
            x, y, z, w, e, f = map(float, a); ctm = ctm @ np.array([[x, z, e], [y, w, f], [0, 0, 1.]])
        elif op == b're':
            x, y, w, h = map(float, a)
            poly = [(ctm @ np.array([u, v, 1.]))[:2].tolist() for u, v in [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]]
        elif op == b'm': poly = [(ctm @ np.array([float(a[0]), float(a[1]), 1.]))[:2].tolist()]
        elif op == b'l': poly.append((ctm @ np.array([float(a[0]), float(a[1]), 1.]))[:2].tolist())
        elif op in (b'W', b'W*'): clipnext = True
        elif op in (b'n', b'f', b'S'):
            if clipnext: clip.append(copy.deepcopy(poly)); clipnext = False
            poly = []
        elif op == b'gs': cur_gs = str(a[0])
        elif op == b'Do':
            name = str(a[0]); o = xo[name].get_object()
            if str(o['/Subtype']) != '/Image': raise SystemExit(f'non-image xobject {name} in {path.name}')
            alpha_gs = None
            if cur_gs and cur_gs in gs_res:
                g = gs_res[cur_gs].get_object(); alpha_gs = float(g.get('/ca', 1.0))
            draws.append(dict(name=name[1:], w=int(o['/Width']), h=int(o['/Height']), ctm=ctm.copy(),
                              clips=copy.deepcopy(clip), order=len(draws), gsAlpha=alpha_gs))
    return r, page, draws


def decode_xobj(o):
    cs = o['/ColorSpace']; w, h = int(o['/Width']), int(o['/Height'])
    if isinstance(cs, list) and str(cs[0]) == '/ICCBased':
        prof = cs[1].get_object(); n = int(prof['/N']); mode = {1: 'L', 3: 'RGB', 4: 'CMYK'}[n]
        im = Image.frombytes(mode, (w, h), o.get_data())
        im = ImageCms.profileToProfile(im, ImageCms.ImageCmsProfile(BytesIO(prof.get_data())),
                                       ImageCms.createProfile('sRGB'), outputMode='RGB', renderingIntent=1).convert('RGBA')
        if '/SMask' in o:
            so = o['/SMask'].get_object()
            alpha = Image.frombytes('L', (int(so['/Width']), int(so['/Height'])), so.get_data())
            if alpha.size != im.size: alpha = alpha.resize(im.size, Image.BILINEAR)
            im.putalpha(alpha)
        return im
    _, _, im = _xobj_to_image(o)
    return im.convert('RGBA')


def image_to_ok(ctm, w, h, N):
    """2x3 matrix: source image pixel (u,v; v from top) -> ok px."""
    # image px -> unit square (U=u/w, V=1-v/h) -> PDF -> ok
    pre = np.array([[1 / w, 0, 0], [0, -1 / h, 1], [0, 0, 1.]])
    return (N @ ctm @ pre)[:2]


def norm_matrix(draws):
    g = [d for d in draws if d['name'] == GUIDE][0]
    c = g['ctm']; a, d_, e, f = c[0, 0], c[1, 1], c[0, 2], c[1, 2]
    top = f + d_
    k = OKW / a   # uniform scale: Im7 aspect is 1.4211 (=> 2500x1759.2), ok.jpg is cropped to 1758 rows
    return np.array([[k, 0, -e * k], [0, -k, top * k], [0, 0, 1.]]), g


def affine_bbox(M, w, h):
    pts = cv2.transform(np.float32([[[0, 0], [w, 0], [w, h], [0, h]]]), M)[0]
    return pts[:, 0].min(), pts[:, 1].min(), pts[:, 0].max(), pts[:, 1].max()


def clip_mask(inst_M, w, h, clips, N):
    """rasterise intersection of clip polygons into source image pixel space; returns uint8 mask or None"""
    if not clips: return None
    inv = cv2.invertAffineTransform(inst_M)
    mask = np.full((h, w), 255, np.uint8)
    for polygon in clips:
        pts = np.array([(N @ np.array([x, y, 1.]))[:2] for x, y in polygon], np.float32)
        ip = cv2.transform(pts[None], inv)[0]
        m = np.zeros((h, w), np.uint8); cv2.fillPoly(m, [np.round(ip).astype(np.int32)], 255)
        mask = cv2.bitwise_and(mask, m)
    return mask


def thumb_sig(rgba8, n=48):
    """RGB composited on mid-grey + alpha, both n x n; used to pair an AI-embedded image with its original PNG"""
    a = rgba8[..., 3:4].astype(np.float32) / 255.0
    comp = rgba8[..., :3].astype(np.float32) * a + 128.0 * (1 - a)
    return (cv2.resize(comp, (n, n), interpolation=cv2.INTER_AREA), cv2.resize(rgba8[..., 3].astype(np.float32), (n, n), interpolation=cv2.INTER_AREA))


_ORIG = None
def originals():
    global _ORIG
    if _ORIG is None:
        _ORIG = []
        for f in sorted(ORIG.glob('*.png')):
            im = Image.open(f); w, h = im.size; rgba = np.array(im.convert('RGBA'))
            _ORIG.append(dict(file=f.name, size=(w, h), hasAlpha=im.mode in ('RGBA', 'LA'), sig=thumb_sig(rgba)))
            del rgba, im
    return _ORIG


def match_original(ai_rgba):
    h, w = ai_rgba.shape[:2]; sig = thumb_sig(ai_rgba); cands = []
    for o in originals():
        if o['size'] != (w, h): continue
        d = float(np.abs(o['sig'][0] - sig[0]).mean()); da = float(np.abs(o['sig'][1] - sig[1]).mean())
        cands.append((d + da * 0.5, d, da, o))
    cands.sort(key=lambda c: c[0])
    if not cands: return None, dict(reason=f'no original PNG with size {w}x{h}')
    best = cands[0]; info = dict(rgbDiff=round(best[1], 2), alphaDiff=round(best[2], 2), candidates=len(cands),
                                 runnerUp=round(cands[1][0], 2) if len(cands) > 1 else None)
    if len(cands) > 1 and cands[1][0] < best[0] * MATCH_MARGIN: info['reason'] = 'ambiguous: runner-up too close'; return None, info
    if best[0] > MATCH_MAX_DIFF: info['reason'] = f'best thumbnail diff {best[0]:.1f} > {MATCH_MAX_DIFF}'; return None, info
    return best[3], info


def area_of(r):
    """plaza/upper/lava/ice/bottom from the object's ok-space position (rule-based; see README)"""
    cx = r['x'] + r['w'] / 2; foot = r['footY']
    if foot > 1300: return 'bottom'
    if foot < 700 and 640 < cx < 1580: return 'upper'
    if cx < 700: return 'lava'
    if cx > 1780: return 'ice'
    return 'plaza'


def write_base_reference():
    """informational: where the owner's own base images (sky/mountains/side ground/clouds, Im0-Im10) sit in ok space + their original PNG"""
    fn = FILES[0]; r, page, draws = parse_ai(SRC / fn); N, _ = norm_matrix(draws); N = apply_correction(fn, N)
    res = page['/Resources']['/XObject']; rows = []
    for d in draws:
        if d['name'] not in BASE_IMS: continue
        full = np.array(decode_xobj(res['/' + d['name']].get_object())); orig, info = match_original(full)
        M = image_to_ok(d['ctm'], d['w'], d['h'], N); x0, y0, x1, y1 = affine_bbox(M, d['w'], d['h'])
        rows.append(dict(image=d['name'], size=[d['w'], d['h']], boxOk=[round(float(x0), 1), round(float(y0), 1), round(float(x1 - x0), 1), round(float(y1 - y0), 1)],
                         flipX=flip_rot(M)[0], originalFile=orig['file'] if orig else None, match=info)); del full
    (OUT / 'base-layers-reference.json').write_text(json.dumps(dict(source=fn, note='NOT objects. Owner base images from 3.ai for reference only (Im7 = guide picture, no original PNG).', layers=rows), ensure_ascii=False, indent=1))


def lin_scale(M): return float(np.sqrt(abs(np.linalg.det(M[:, :2]))))


def flip_rot(M):
    det = np.linalg.det(M[:, :2]); flip = det < 0
    th = math.degrees(math.atan2(-M[1, 0], -M[0, 0])) if flip else math.degrees(math.atan2(M[1, 0], M[0, 0]))
    return bool(flip), th


def score_candidate(rgba_full, inst, ok):
    """mean abs RGB diff vs ok.jpg on the instance's opaque pixels (used to resolve conflicting duplicates)"""
    sm, bb = warp_sprite(rgba_full, inst['M'])
    if sm is None: return 1e9
    x0, y0, x1, y1 = bb; m = sm[..., 3] > 200
    if m.sum() < 50: return 1e9
    rgb = np.where(sm[..., 3:4] > 0, sm[..., :3] / np.maximum(sm[..., 3:4], 1) * 255.0, 0)
    d = np.abs(rgb - ok[y0:y1, x0:x1].astype(np.float32)).mean(axis=2)
    return float(d[m].mean())


def apply_correction(fn, N):
    """optional per-file residual fitted against ok.jpg by scripts/check-zone1-objects.py --fit (translation + axis scale)"""
    f = OUT / 'registration-correction.json'
    if os.environ.get('Z1_NO_CORRECTION') or not f.exists(): return N
    c = json.loads(f.read_text()).get('files', {}).get(fn)
    if not c: return N
    C = np.array([[1 + c['xScale'], 0, c['dx']], [0, 1 + c['yScale'], c['dy']], [0, 0, 1.]])
    return C @ N


def build_instances():
    instances = []
    for fi, fn in enumerate(FILES):
        r, page, draws = parse_ai(SRC / fn)
        N, guide = norm_matrix(draws)
        N = apply_correction(fn, N)
        res = page['/Resources']['/XObject']; n_base = 0
        for d in draws:
            is_cloud = fi == 0 and d['name'] in CLOUD_IMS
            if (d['name'] in BASE_IMS or d['name'] == GUIDE) and not is_cloud: n_base += 1; continue
            d['extra'] = 'cloud' if is_cloud else None
            o = res['/' + d['name']].get_object()
            d['hash'] = hashlib.sha1(o.get_data()).hexdigest()[:10]
            M = image_to_ok(d['ctm'], d['w'], d['h'], N)
            x0, y0, x1, y1 = affine_bbox(M, d['w'], d['h'])
            d.update(file=fn, fileIdx=fi, M=M, N=N, box=[float(x0), float(y0), float(x1 - x0), float(y1 - y0)], xobj=o)
            instances.append(d)
        print(fn, 'draws', len(draws), 'base/guide skipped', n_base, 'objects', len(draws) - n_base, flush=True)
    return instances


def main():
    OUT.mkdir(parents=True, exist_ok=True); (OUT / 'sprites').mkdir(exist_ok=True)
    ok = np.array(Image.open(SRC / 'New-Map-Zone1-ok.jpg').convert('RGB'))
    instances = build_instances()
    # objects present in an AI file but absent from ok.jpg (measured by check-zone1-objects.py, listed by hand in exclusions.json)
    ex_file = OUT / 'exclusions.json'; excl = json.loads(ex_file.read_text()) if ex_file.exists() else []
    ex_keys = {(e['file'], e['image']) for e in excl}
    excluded = [d for d in instances if (d['file'], d['name']) in ex_keys]
    instances = [d for d in instances if (d['file'], d['name']) not in ex_keys]
    # --- dedupe across files: same raw image + box within DEDUPE_PX = the same object saved in two files.
    #     keep the copy whose placement matches ok.jpg better (e.g. the bottom file is pasted on top in the PSD)
    kept = []; dropped = []; full_cache = {}
    def px_score(d):
        if d['hash'] not in full_cache: full_cache.clear(); full_cache[d['hash']] = np.array(decode_xobj(d['xobj']))
        return score_candidate(full_cache[d['hash']], d, ok)
    for d in instances:
        dup = next((k for k in kept if k['hash'] == d['hash'] and k['fileIdx'] != d['fileIdx']
                    and np.max(np.abs(np.array(k['box']) - np.array(d['box']))) <= DEDUPE_PX), None)
        if dup is None: kept.append(d); continue
        sd, sk = px_score(d), px_score(dup)
        win, lose = (d, dup) if sd < sk else (dup, d)
        if win is d: kept[kept.index(dup)] = d
        win['dedupedFrom'] = (win.get('dedupedFrom') or []) + [f"{lose['file']}:{lose['name']}"]
        win['dedupeScores'] = dict(kept=round(min(sd, sk), 2), dropped=round(max(sd, sk), 2))
        dropped.append((lose, win))
    full_cache.clear()
    # --- near-conflicts: same raw image, different file, similar place but different size -> pick the one that matches ok.jpg
    conflicts = []
    for i, a in enumerate(kept):
        for b in kept[i + 1:]:
            if a['hash'] == b['hash'] and a['fileIdx'] != b['fileIdx']:
                ax, ay, aw, ah = a['box']; bx, by, bw, bh = b['box']
                ix = max(0, min(ax + aw, bx + bw) - max(ax, bx)); iy = max(0, min(ay + ah, by + bh) - max(ay, by))
                if ix * iy / min(aw * ah, bw * bh) > 0.7: conflicts.append((a, b))
    drop_ids = set()
    for a, b in conflicts:
        full = decode_xobj(a['xobj']); arr = np.array(full)
        sa, sb = score_candidate(arr, a, ok), score_candidate(arr, b, ok)
        loser, winner = (b, a) if sa <= sb else (a, b)
        print('conflict', a['file'][-6:], a['name'], round(sa, 2), 'vs', b['file'][-6:], b['name'], round(sb, 2), '-> keep', winner['file'][-6:], winner['name'])
        winner.setdefault('conflictResolved', []).append(dict(dropped=f"{loser['file']}:{loser['name']}", droppedBox=[round(v, 1) for v in loser['box']],
                                                              scoreKept=round(min(sa, sb), 2), scoreDropped=round(max(sa, sb), 2), rule='kept the placement closer to ok.jpg'))
        drop_ids.add(id(loser)); del full, arr
    kept = [k for k in kept if id(k) not in drop_ids]
    print('instances', len(instances), 'after dedupe', len(kept), 'exact dupes dropped', len(dropped), 'conflicts resolved', len(conflicts), flush=True)

    # --- PSD lamp posts (already in ok space)
    import psd_lite
    pd = psd_lite.parse(str(PSD)); lamps = []
    for idx in (3, 4, 5):
        L = pd['layers'][idx]; rgba = psd_lite.layer_rgba(pd, idx)
        lamps.append(dict(file='New-Map-Zone1.psd', name=f'layer{idx}', rgba=rgba, hash=hashlib.sha1(rgba.tobytes()).hexdigest()[:10],
                          M=np.array([[1, 0, L['left']], [0, 1, L['top']]], float), w=rgba.shape[1], h=rgba.shape[0], clips=[], fileIdx=3, order=idx))
    # --- decode each unique image once, derive per-instance alpha (clip baked when it really cuts content)
    groups = {}
    for d in kept: groups.setdefault(d['hash'], []).append(d)
    for l in lamps: groups.setdefault(l['hash'], []).append(l)
    sprites = {}; recs = []
    for hsh, items in groups.items():
        src_file = None; match_info = None
        if 'rgba' in items[0]:
            full = items[0]['rgba']; match_info = dict(reason='pixels come from the PSD layer itself (no separate original PNG)')
        else:
            full = np.array(decode_xobj(items[0]['xobj']))
            orig, match_info = match_original(full)
            if orig is not None:
                src_file = orig['file']; oim = Image.open(ORIG / orig['file']); ob = np.array(oim.convert('RGBA'))
                if not orig['hasAlpha']: ob[..., 3] = full[..., 3]; match_info['alpha'] = 'original has no alpha: alpha taken from the AI soft mask'
                else: match_info['alpha'] = 'original alpha'
                full = ob
            else: print('NO ORIGINAL for', items[0]['file'], items[0]['name'], match_info, flush=True)
        h, w = full.shape[:2]; variants = {}
        for d in items:
            alpha = full[..., 3].copy(); clipped = False
            if d['clips']:
                m = clip_mask(d['M'], w, h, d['clips'], d['N'])
                removed = int(((alpha >= CROP_ALPHA) & (m == 0)).sum()); total = int((alpha >= CROP_ALPHA).sum())
                if total and removed / total > 0.002:
                    alpha = cv2.bitwise_and(alpha, m); clipped = True
                    clip_hash = hashlib.sha1(m.tobytes()).hexdigest()[:6]
                else: clip_hash = ''
            else: clip_hash = ''
            ys, xs = np.where(alpha >= CROP_ALPHA)
            if not len(xs): print('EMPTY', d['file'], d['name']); continue
            crop = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
            key = hsh + (('-c' + clip_hash) if clipped else '')
            v = variants.setdefault(key, dict(alpha=alpha, crop=crop, insts=[], clipped=clipped))
            v['insts'].append(d); d['_key'] = key; d['_crop'] = crop; d['_clipped'] = clipped
            d['_foot_src'] = int(np.where(alpha >= FOOT_ALPHA)[0].max()) + 1 if (alpha >= FOOT_ALPHA).any() else crop[3]
        for key, v in variants.items():
            x0, y0, x1, y1 = v['crop']; smax = max(lin_scale(i['M']) for i in v['insts'])
            s = min(1.0, SPRITE_MAX_X * smax)
            rgba = full.copy(); rgba[..., 3] = v['alpha']; rgba = rgba[y0:y1, x0:x1]
            if s < 0.999:
                P = cv2.resize(rgba[..., :3].astype(np.float32) * (rgba[..., 3:4] / 255.0), None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
                A = cv2.resize(rgba[..., 3], (P.shape[1], P.shape[0]), interpolation=cv2.INTER_AREA)
                rgb = np.where(A[..., None] > 0, P / np.maximum(A[..., None] / 255.0, 1e-4), 0).clip(0, 255)
                rgba = np.dstack([rgb, A]).round().astype(np.uint8)
            fn = f'spr-{key}.webp'
            Image.fromarray(rgba, 'RGBA').save(OUT / 'sprites' / fn, 'WEBP', quality=90, alpha_quality=100, method=4)
            v['sprite'] = dict(file=f'sprites/{fn}', size=[rgba.shape[1], rgba.shape[0]], scale=round(s, 4),
                               crop=[x0, y0, x1, y1], sourceSize=[w, h], sourceBytesHash=hsh, clipBaked=v['clipped'], sourceFile=src_file, sourceMatch=match_info)
            sprites[key] = v['sprite']
        for key, v in variants.items():
            for d in v['insts']:
                spr = sprites[key]; s = spr['scale']; x0, y0, x1, y1 = spr['crop']
                # sprite px -> source px:  src = crop0 + p/s ; then M
                S = np.array([[1 / s, 0, x0], [0, 1 / s, y0], [0, 0, 1.]])
                MS = (np.vstack([d['M'], [0, 0, 1.]]) @ S)[:2]
                bx0, by0, bx1, by1 = affine_bbox(MS, spr['size'][0], spr['size'][1])
                foot = float(d['M'] @ np.array([(x0 + x1) / 2, d['_foot_src'], 1.]))if False else float((d['M'] @ np.array([(x0 + x1) / 2, d['_foot_src'], 1.]))[1])
                flip, rot = flip_rot(d['M'])
                recs.append(dict(extra=d.get('extra'), dedupeScores=d.get('dedupeScores'), source=dict(file=d['file'], image=d['name']), sourceFile=spr['sourceFile'], sprite=key, matrix=[round(float(v), 4) for v in MS.ravel()],
                                 x=round(float(bx0), 1), y=round(float(by0), 1), w=round(float(bx1 - bx0), 1), h=round(float(by1 - by0), 1),
                                 flipX=flip, rotationDeg=round(rot, 2), footY=round(foot, 1),
                                 clip=[[[round(float(p[0]), 1), round(float(p[1]), 1)] for p in (d['N'] @ np.vstack([np.array(poly).T, np.ones(len(poly))]))[:2].T] for poly in d['clips']] if d.get('_clipped') else None,
                                 authorOrder=None, _file=d['fileIdx'], _ord=d['order'],
                                 dedupedFrom=d.get('dedupedFrom'), conflictResolved=d.get('conflictResolved'), sourceBox=[round(v, 1) for v in d.get('box', [])] or None))
        del full; gc.collect(); print('sprite group', hsh, len(variants), 'variant(s)', len(items), 'instance(s)', flush=True)
    # author order = file rank (3 -> 4 -> 5 -> psd lamps), then content-stream order inside each file
    extras = sorted([r for r in recs if r['extra']], key=lambda r: r['_ord']); recs = [r for r in recs if not r['extra']]
    for i, r in enumerate(extras):
        r['id'] = f'z1-cloud-{i + 1}'; r['category'] = 'cloud'; r['area'] = 'sky'; r['authorOrder'] = None; del r['_file'], r['_ord'], r['extra']
    recs.sort(key=lambda r: (r['_file'], r['_ord']))
    cats = json.loads((OUT / 'categories.json').read_text())   # hand-assigned by eye from the sprite contact sheet (keyed by sprite hash)
    for i, r in enumerate(recs):
        c = cats[r['sprite'].split('-')[0]]
        r['authorOrder'] = i; r['id'] = f'z1-{i + 1:03d}'; r['category'] = c['category']; r['label'] = c['label']; r['area'] = area_of(r)
        del r['_file'], r['_ord'], r['extra']
    per_file = {}
    for r in recs: per_file[r['source']['file']] = per_file.get(r['source']['file'], 0) + 1
    doc = dict(frame=[OKW, OKH], note='coordinates are ok.jpg pixels (2500x1758). matrix = sprite px -> ok px (2x3 row-major). flipX/rotationDeg are informative; matrix already contains them.',
               sources=[f for f in FILES] + ['New-Map-Zone1.psd (layers 3-5 lamp posts)'], perFile=per_file,
               excludedNotInOk=excl, exactDuplicatesDropped=[dict(dropped=f"{d['file']}:{d['name']}", sameAs=f"{k['file']}:{k['name']}") for d, k in dropped],
               sprites=sprites, objects=recs, baseLayerExtras=extras)
    (OUT / 'layout.json').write_text(json.dumps(doc, ensure_ascii=False, indent=1))
    write_base_reference()
    print('objects', len(recs), 'unique sprites', len(sprites), per_file)


if __name__ == '__main__':
    main()
