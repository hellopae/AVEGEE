#!/usr/bin/env python3
"""Z1-LAYOUT-B1 build: layout.json + terrain-seamless (round A) -> img/map-zone1/v6 + src/town-v6-data.js + walk mask.

World = ok.jpg px * 1.536 (same scale as the old owner drawing, so actors keep their size next to buildings),
y shifted so the 1758 px tall picture ends at the bottom of the 2560 unit world (top 91 px of sky fall outside).
"""
import json, math, shutil, sys
from pathlib import Path
import numpy as np, cv2
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
REV = ROOT / 'docs/art-reviews/2026-11-05-zone1-layout'
OUT = ROOT / 'img/map-zone1/v6'
CFG = json.loads((Path(__file__).parent / 'zone1-v6-config.json').read_text())
S = CFG['world']['scale']; OY = CFG['world']['offsetY']
W, H = 3840, 2560; CELL = 8; COLS, ROWS = W // CELL, H // CELL
OKW, OKH = 2500, 1758
layout = json.loads((REV / 'layout.json').read_text())
reg = json.loads((REV / 'terrain-registration.json').read_text())
tman = json.loads((REV / 'terrain/terrain-manifest.json').read_text())
M = np.array(reg['matrix'], np.float64).reshape(2, 3)          # terrain px -> ok px

def ok2w(x, y): return x * S, y * S + OY
def w2ok(x, y): return x / S, (y - OY) / S
def t2w(x, y):
    ox = M[0, 0] * x + M[0, 1] * y + M[0, 2]; oy = M[1, 0] * x + M[1, 1] * y + M[1, 2]
    return ok2w(ox, oy)

def r2(v): return round(float(v), 2)

# ---------------------------------------------------------------- floor from terrain
def assemble_terrain():
    Wt, Ht = tman['world']; out = np.zeros((Ht, Wt, 4), np.uint8)
    for t in tman['tiles']:
        im = np.array(Image.open(REV / 'terrain' / t['src']).convert('RGBA'))
        cx, cy, cw, ch = t['crop']; x, y, w, h = t['rect']
        piece = np.pad(im[cy:cy + ch, cx:cx + cw], ((0, h - ch), (0, w - cw), (0, 0)))[:min(h, Ht - y), :min(w, Wt - x)]
        out[y:y + piece.shape[0], x:x + piece.shape[1]] = piece
    return out

def floor_ok():
    f = CFG['floor']; terr = assemble_terrain()
    a = terr[..., 3] > 128
    lum = cv2.cvtColor(terr[..., :3], cv2.COLOR_RGB2GRAY).astype(np.float32)
    mu = cv2.blur(lum, (9, 9)); sd = np.sqrt(np.maximum(cv2.blur(lum * lum, (9, 9)) - mu * mu, 0)); sd2 = cv2.blur(sd, (15, 15))
    fl = ((sd2 < f['autoThreshold']) & a).astype(np.uint8)
    fl = cv2.morphologyEx(fl, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    fl = cv2.morphologyEx(fl, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    n, lab, st, _ = cv2.connectedComponentsWithStats(fl); keep = np.zeros_like(fl)
    for i in range(1, n):
        if st[i, 4] > 3000: keep[lab == i] = 1
    okf = (cv2.warpAffine(keep * 255, M, (OKW, OKH), flags=cv2.INTER_LINEAR) > 127).astype(np.uint8)
    er = cv2.erode(okf, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    for b in f['barriers']: cv2.polylines(er, [np.array(b, np.int32)], False, 0, 7)
    n, lab, st, _ = cv2.connectedComponentsWithStats(er); keep = np.zeros_like(er)
    for sx, sy in f['seeds']:
        l = lab[sy, sx]
        if not l: raise SystemExit(f'seed {sx},{sy} is not on auto floor')
        keep[lab == l] = 1
    fl = cv2.dilate(keep, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))) & okf
    adds = np.zeros_like(fl)
    for p in f['add'].values(): cv2.fillPoly(adds, [np.array(p, np.int32)], 1)
    for p in f['sub'].values(): cv2.fillPoly(fl, [np.array(p, np.int32)], 0)
    return fl, adds, terr

# ---------------------------------------------------------------- object feet from sprite alpha
FOOT = {  # category -> (band as fraction of height, min px, max px, shrink fraction each side)
    'tree': (.05, 6, 16, .10), 'shrub': (.12, 5, 10, .05), 'building': (.2, 24, 50, .04), 'gate': (.14, 20, 66, 0),
    'fence': (.45, 8, 30, 0), 'lamp': (.05, 4, 7, 0), 'other': (.5, 8, 24, 0), 'dock': (0, 0, 0, 0), 'station': (.2, 24, 50, .04),
}
def sprite_alpha_ok(o):
    spr = layout['sprites'][o['sprite']]
    a = np.array(Image.open(REV / spr['file']).convert('RGBA'))[..., 3]
    m = np.array(o['matrix'], np.float64).reshape(2, 3)
    x0, y0 = int(math.floor(o['x'])) - 4, int(math.floor(o['y'])) - 4
    m2 = m.copy(); m2[0, 2] -= x0; m2[1, 2] -= y0
    bw, bh = int(math.ceil(o['w'])) + 10, int(math.ceil(o['h'])) + 10
    return cv2.warpAffine(a, m2, (bw, bh), flags=cv2.INTER_LINEAR), x0, y0

def object_feet(o, shape=(OKH, OKW)):
    cat = o['category']; frac, lo, hi, shrink = FOOT.get(cat, FOOT['building'])
    if frac == 0: return None
    a, x0, y0 = sprite_alpha_ok(o); solid = a > 128
    rows = np.where(solid.any(1))[0]
    if not len(rows): return None
    bottom = rows.max(); top = rows.min(); band = int(min(hi, max(lo, frac * (bottom - top))))
    foot = np.zeros_like(solid); foot[max(0, bottom - band):bottom + 1] = solid[max(0, bottom - band):bottom + 1]
    if shrink:
        cols = np.where(foot.any(0))[0]
        if len(cols):
            c0, c1 = cols.min(), cols.max(); d = int((c1 - c0) * shrink); foot[:, :c0 + d] = 0; foot[:, max(c0, c1 - d):] = 0
    full = np.zeros(shape, np.uint8)
    ys, xs = np.nonzero(foot)
    full[np.clip(ys + y0, 0, shape[0] - 1), np.clip(xs + x0, 0, shape[1] - 1)] = 1
    return full

# ---------------------------------------------------------------- world grid
def to_world_grid(mask_ok, margin_ok):
    """cell centre -> ok px; a cell is floor when its centre and the ring `margin_ok` px around it are floor."""
    er = cv2.erode(mask_ok, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * margin_ok + 1, 2 * margin_ok + 1))) if margin_ok else mask_ok
    xs = (np.arange(COLS) + .5) * CELL / S; ys = ((np.arange(ROWS) + .5) * CELL - OY) / S
    xi = np.clip(np.round(xs).astype(int), 0, OKW - 1); yi = np.clip(np.round(ys).astype(int), 0, OKH - 1)
    grid = er[np.ix_(yi, xi)].astype(np.uint8)
    grid[(ys < 0) | (ys > OKH - 1), :] = 0
    return grid

def runs_of(grid):
    flat = grid.reshape(-1); out = []; cur = 0; n = 0
    for v in flat:
        if v == cur: n += 1
        else: out.append(n); cur = v; n = 1
    out.append(n); return out


import heapq
def dijkstra(grid, src, dst=None):
    """8-connected shortest path on the world grid (cells). returns (dist, prev)."""
    dist = np.full(grid.shape, np.inf); prev = {}
    sy, sx = src; dist[sy, sx] = 0; pq = [(0.0, sy, sx)]
    nb = [(-1,0,1),(1,0,1),(0,-1,1),(0,1,1),(-1,-1,1.414),(-1,1,1.414),(1,-1,1.414),(1,1,1.414)]
    while pq:
        d, y, x = heapq.heappop(pq)
        if d > dist[y, x]: continue
        if dst and (y, x) == dst: break
        for dy, dx, c in nb:
            ny, nx = y + dy, x + dx
            if 0 <= ny < grid.shape[0] and 0 <= nx < grid.shape[1] and grid[ny, nx]:
                if dy and dx and not (grid[y + dy, x] and grid[y, x + dx]): continue
                nd = d + c
                if nd < dist[ny, nx]: dist[ny, nx] = nd; prev[(ny, nx)] = (y, x); heapq.heappush(pq, (nd, ny, nx))
    return dist, prev

def cell_of(wx, wy): return int(min(ROWS - 1, max(0, wy // CELL))), int(min(COLS - 1, max(0, wx // CELL)))
def cell_xy(c): return (c[1] + .5) * CELL, (c[0] + .5) * CELL

def snap(grid, wx, wy, prefer_down=True, maxr=260, room=20):
    dtg = cv2.distanceTransform(grid.astype(np.uint8), cv2.DIST_L2, 5) * CELL
    best = None
    cy0, cx0 = cell_of(wx, wy); R = int(maxr // CELL)
    for dy in range(-R, R + 1):
        for dx in range(-R, R + 1):
            y, x = cy0 + dy, cx0 + dx
            if 0 <= y < ROWS and 0 <= x < COLS and grid[y, x]:
                d = math.hypot(dx, dy) + (0 if dy >= 0 or not prefer_down else .6 * abs(dy)) + (0 if dtg[y, x] >= room else 6 + (room - dtg[y, x]) / CELL * 3)
                if best is None or d < best[0]: best = (d, y, x)
    if not best: raise SystemExit(f'no floor near {wx},{wy}')
    return cell_xy((best[1], best[2]))

def main():
    fl, adds, terr = floor_ok()
    cfg = CFG; objs = layout['objects']; by_id = {o['id']: o for o in objs}
    # --- feet: everything except stations (blocked live by the game) and the dais (silhouette minus top/stairs)
    feet = np.zeros((OKH, OKW), np.uint8)
    for o in objs:
        if o['id'] == cfg['dais']['id']:
            a, x0, y0 = sprite_alpha_ok(o); ys, xs = np.nonzero(a > 128)
            feet[np.clip(ys + y0, 0, OKH - 1), np.clip(xs + x0, 0, OKW - 1)] = 1; continue
        if o['id'] in cfg['stations'].values(): continue
        f = object_feet(o)
        if f is not None: feet |= f
    # auto floor keeps a margin from cliff edges; hand-drawn pieces (stairs, decks, dais) are used as drawn
    walk = fl.copy(); walk[feet == 1] = 0
    hand = adds.copy(); hand[feet == 1] = 0
    for k in (cfg['dais']['top'], cfg['dais']['stairs'], 'PIER_LINK', 'PIER_DECK', 'LTERRACE'): cv2.fillPoly(hand, [np.array(cfg['floor']['add'][k], np.int32)], 1)
    grid = to_world_grid(walk, int(cfg['floor']['erodePx'])) | to_world_grid(hand, 0)
    # keep only the component that holds the plaza
    sp = cfg['spotsOk']; plaza_w = ok2w(*sp['plaza'])
    n, lab = cv2.connectedComponents(grid.astype(np.uint8), connectivity=4)
    pc = cell_of(*plaza_w)
    if not grid[pc]: raise SystemExit('plaza cell is not floor')
    grid = (lab == lab[pc]).astype(np.uint8)
    # --- spots (snapped to floor) ---
    def P(okpt, down=True):
        x, y = snap(grid, *ok2w(*okpt), prefer_down=down); return [r2(x), r2(y)]
    spots = {k: P(sp[k]) for k in ('plaza', 'bench', 'throne', 'bossPier', 'merchant', 'guard', 'challenge')}
    spots['gateDoor'] = P(sp['gateDoor']); spots['entryNira'] = P(sp['entryNira'])
    crew = {k: P(v) for k, v in sp['crew'].items()}
    ferry = {'from': P(sp['ferryFrom'], False), 'to': [r2(v) for v in ok2w(*sp['ferryTo'])]}
    nx0, ny0, nx1, ny1 = sp['niraStage']; (wx0, wy0), (wx1, wy1) = ok2w(nx0, ny0), ok2w(nx1, ny1)
    nira_stage = [r2(wx0), r2(wy0), r2(wx1), r2(wy1)]
    # --- queue along the central road: plaza -> gate ---
    dist, prev = dijkstra(grid, cell_of(*spots['plaza']))
    gc = cell_of(*spots['gateDoor'])
    if not np.isfinite(dist[gc]): raise SystemExit('gate not reachable from plaza')
    path = [gc]
    while path[-1] in prev: path.append(prev[path[-1]])
    path.reverse(); acc = [0.0]
    for a, b in zip(path, path[1:]): acc.append(acc[-1] + math.hypot(a[0] - b[0], a[1] - b[1]) * CELL)
    queue = []
    for d in (14, 94, 174, 254, 334, 414, 494):
        i = min(range(len(acc)), key=lambda k: abs(acc[k] - d)); queue.append([r2(v) for v in cell_xy(path[i])])
    # --- invaders: first water row ~ plaza south bank ---
    river_y = r2(ok2w(0, sp['riverYok'])[1]); yrow = int((river_y - 50) // CELL)
    spans = []; row = grid[yrow]; x = 0
    while x < COLS:
        if row[x]:
            x0 = x
            while x < COLS and row[x]: x += 1
            if (x - x0) * CELL >= 100 and x0 * CELL > 1200: spans.append([x0 * CELL + 16, x * CELL - 16])
        else: x += 1
    # --- stations ---
    stations = {}; odict = {}
    def spr_url(o): return 'img/map-zone1/v6/sprites/' + Path(layout['sprites'][o['sprite']]['file']).name
    def wbox(o): return [o['x'] * S, o['y'] * S + OY, o['w'] * S, o['h'] * S]
    for key, oid in cfg['stations'].items():
        o = by_id[oid]; bx_, by_, bw_, bh_ = wbox(o)
        bx = bx_ + bw_ / 2; by = by_ + bh_
        dx, dy = snap(grid, *(ok2w(*cfg['stationDoorOk'][key]) if key in cfg.get('stationDoorOk', {}) else (bx, by + 12)), room=0)
        stations[key] = {'bx': r2(bx), 'by': r2(by), 'bw': r2(bw_), 'mapScale': 1, 'x': r2(dx), 'y': r2(dy), 'sx': r2(dx), 'sy': r2(dy),
                         'hit': [r2(bx_ + bw_ * .1), r2(by_ + bh_ * .4), r2(bx_ + bw_ * .9), r2(by)],
                         'v6': {'id': oid, 'src': spr_url(o), 'x': r2(bx_), 'y': r2(by_), 'w': r2(bw_), 'h': r2(bh_), 'flip': bool(o['flipX']), 'depth': r2(by)}}
    for key, okpt in cfg.get('provisional', {}).items():     # NOT in the owner's layout: placeholder site, art stays the old sprite
        pbx, pby = ok2w(*okpt); dx, dy = snap(grid, pbx, pby + 38)
        stations[key] = {'bx': r2(pbx), 'by': r2(pby), 'bw': 118, 'x': r2(dx), 'y': r2(dy), 'hit': [r2(pbx - 52), r2(pby - 33), r2(pbx + 52), r2(pby)], 'v6absent': True}
    for key in ('dab', 'ngiw'): stations[key] = {'v6absent': True}
    g = by_id[cfg['frontierGate']]; gx, gy, gw, gh = wbox(g)
    gdx, gdy = spots['gateDoor']
    frontier = {'bx': r2(gx + gw / 2), 'by': r2(gy + gh), 'bw': r2(gw), 'mapScale': 1, 'x': gdx, 'y': gdy, 'sx': gdx, 'sy': gdy - 40, 'reach': 105,
                'hit': [r2(gx), r2(gy + gh * .3), r2(gx + gw), r2(gy + gh)],
                'v6': {'id': g['id'], 'src': spr_url(g), 'x': r2(gx), 'y': r2(gy), 'w': r2(gw), 'h': r2(gh), 'flip': bool(g['flipX']), 'depth': r2(gy + gh)}}
    dais_o = by_id[cfg['dais']['id']]; dx0, dy0, dw0, dh0 = wbox(dais_o)
    dais = {'x': r2(dx0 + dw0 / 2), 'y': r2(dy0 + dh0), 'w': r2(dw0)}
    # --- objects drawn by the map queue (stations that exist in the game are drawn through the station pipeline) ---
    skip = set(cfg['stations'].values()) | {cfg['frontierGate']}
    st_by_obj = {v: k for k, v in cfg['stations'].items()}
    for o in objs:
        bx_, by_, bw_, bh_ = wbox(o); m = np.array(o['matrix']).reshape(2, 3)
        wm = [m[0, 0] * S, m[0, 1] * S, m[0, 2] * S, m[1, 0] * S, m[1, 1] * S, m[1, 2] * S + 0]
        wm[5] = m[1, 2] * S + OY
        odict[o['id']] = {'id': o['id'], 'cat': o['category'], 'area': o['area'], 'label': o['label'], 'src': spr_url(o),
                          'm': [round(v, 5) for v in wm], 'box': [r2(bx_), r2(by_), r2(bw_), r2(bh_)], 'depth': r2(cfg.get('depthOk', {}).get(o['id'], o['y'] + o['h']) * S + OY),
                          'station': st_by_obj.get(o['id'], ('frontier' if o['id'] == cfg['frontierGate'] else None)),
                          'draw': o['id'] not in skip}
    clouds = []
    for c in layout['baseLayerExtras']:
        m = np.array(c['matrix']).reshape(2, 3)
        clouds.append({'id': c['id'], 'src': spr_url(c), 'm': [round(v, 5) for v in [m[0,0]*S, m[0,1]*S, m[0,2]*S, m[1,0]*S, m[1,1]*S, m[1,2]*S+OY]], 'box': [r2(c['x']*S), r2(c['y']*S+OY), r2(c['w']*S), r2(c['h']*S)]})
    # --- assets ---
    for d in ('terrain', 'sprites', 'layers'): (OUT / d).mkdir(parents=True, exist_ok=True)
    used = {Path(spr_url(o)).name for o in objs} | {Path(c['src']).name for c in clouds}
    for name in used: shutil.copy2(REV / 'sprites' / name, OUT / 'sprites' / name)
    tiles = []
    ts = M[0, 0] * S
    for t in tman['tiles']:
        shutil.copy2(REV / 'terrain' / t['src'], OUT / 'terrain' / Path(t['src']).name)
        x, y, w, h = t['rect']; wx, wy = t2w(x, y)
        tiles.append({'id': t['id'], 'src': 'img/map-zone1/v6/terrain/' + Path(t['src']).name, 'rect': [r2(wx), r2(wy), r2(w * ts), r2(h * ts)], 'crop': t['crop'], 'size': t['size']})
    layers = []
    for lid in ('sky', 'mountains', 'river', 'lava', 'waterfall'):
        L = tman['layers'][lid]; im = Image.open(REV / 'terrain' / L['src'])
        out = OUT / 'layers' / (lid + '.webp')
        if im.mode == 'RGB': im.save(out, 'WEBP', quality=86, method=5)
        else: im.save(out, 'WEBP', quality=90, method=5, alpha_quality=95)
        x, y, w, h = L['rect']; wx, wy = t2w(x, y)
        layers.append({'id': lid, 'src': 'img/map-zone1/v6/layers/' + lid + '.webp', 'rect': [r2(wx), r2(wy), r2(w * ts), r2(h * ts)]})
    # --- 1/3-scale preview of the base layers (sky, clouds, mountains, liquids, terrain): fallback while tiles stream, and the overview ---
    PW, PH = W // 3, int(math.ceil(H / 3)); prev = Image.new('RGBA', (PW, PH), (0, 0, 0, 255))
    def paste(im, rect):
        x, y, w, h = rect; sc = 1 / 3
        im2 = im.convert('RGBA').resize((max(1, round(w * sc)), max(1, round(h * sc))), Image.LANCZOS)
        layer = Image.new('RGBA', (PW, PH), (0, 0, 0, 0)); layer.paste(im2, (round(x * sc), round(y * sc))); prev.alpha_composite(layer)
    byid = {l['id']: l for l in layers}
    paste(Image.open(OUT / 'layers/sky.webp'), byid['sky']['rect'])
    for c in clouds: paste(Image.open(OUT / 'sprites' / Path(c['src']).name), c['box'])
    for lid in ('mountains', 'river', 'lava', 'waterfall'): paste(Image.open(OUT / 'layers' / (lid + '.webp')), byid[lid]['rect'])
    for t, tt in zip(tman['tiles'], tiles):
        im = Image.open(REV / 'terrain' / t['src']).convert('RGBA'); cx, cy, cw, ch = t['crop']; paste(im.crop((cx, cy, cx + cw, cy + ch)), tt['rect'])
    prev.convert('RGB').save(OUT / 'preview.webp', 'WEBP', quality=84, method=5)
    # --- walk mask ---
    runs = runs_of(grid)
    data = {'version': 1, 'world': {'w': W, 'h': H, 'scale': S, 'offsetY': OY, 'ok': [OKW, OKH]}, 'cell': CELL,
            'preview': 'img/map-zone1/v6/preview.webp', 'layers': layers, 'clouds': clouds, 'tiles': tiles, 'objects': list(odict.values()),
            'stations': stations, 'frontier': frontier, 'dais': dais, 'spots': spots, 'crew': crew, 'ferry': ferry, 'niraStage': nira_stage,
            'queue': queue, 'riverY': river_y, 'shoreSpans': spans, 'missingStations': ['dab', 'ngiw', 'canteen']}
    (OUT / 'manifest.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    (ROOT / 'src/town-v6-data.js').write_text('// GENERATED by scripts/build-zone1-v6.py from docs/art-reviews/2026-11-05-zone1-layout + scripts/zone1-v6-config.json - do not edit.\n'
        'export const TOWN_V6 = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    (ROOT / 'src/town-owner-walkmask-th6.js').write_text('// GENERATED by scripts/build-zone1-v6.py - Zone 1 v3 walk floor (terrain floor minus object feet). 1 cell = 8 world units.\n'
        f'export const TOWN_V6_WALK_RUNS=[{",".join(map(str, runs))}];\n')
    # --- evidence ---
    ev = REV / 'b1-evidence'; ev.mkdir(exist_ok=True)
    ok = np.array(Image.open(REV / 'ok.jpg').convert('RGB')); vis = ok.copy()
    gk = np.kron(grid, np.ones((CELL, CELL), np.uint8))   # world px
    gok = cv2.warpAffine(gk, np.array([[1 / S, 0, 0], [0, 1 / S, -OY / S]], np.float64), (OKW, OKH), flags=cv2.INTER_NEAREST)
    m = gok.astype(bool); vis[m] = (vis[m] * .55 + np.array([0, 255, 120]) * .45).astype(np.uint8)
    for lab_, pt in list(spots.items()) + [('crew-' + k, v) for k, v in crew.items()] + [('q%d' % i, q) for i, q in enumerate(queue)]:
        px, py = w2ok(*pt); cv2.circle(vis, (int(px), int(py)), 7, (255, 255, 0), -1); cv2.putText(vis, lab_, (int(px) + 9, int(py) + 4), 0, .6, (255, 255, 255), 2)
    for k, st in stations.items():
        if 'x' not in st: continue
        px, py = w2ok(st['x'], st['y']); cv2.circle(vis, (int(px), int(py)), 8, (0, 200, 255), -1); cv2.putText(vis, k, (int(px) + 9, int(py) + 4), 0, .7, (0, 0, 0), 3); cv2.putText(vis, k, (int(px) + 9, int(py) + 4), 0, .7, (255, 255, 255), 1)
    Image.fromarray(vis).save(ev / 'walkmask-overlay-ok.jpg', quality=88)
    # --- anchors hidden behind a foreground sprite (body point 25 ok px above the feet) ---
    alpha_cache = {}
    def covered(px, py):
        hits = []
        for o in objs:
            if o['y'] + o['h'] <= py + 1: continue                      # drawn before an actor standing at py
            if not (o['x'] <= px <= o['x'] + o['w'] and o['y'] <= py - 25 <= o['y'] + o['h']): continue
            if o['id'] not in alpha_cache: alpha_cache[o['id']] = sprite_alpha_ok(o)
            a, x0, y0 = alpha_cache[o['id']]; ix, iy = int(px - x0), int(py - 25 - y0)
            if 0 <= iy < a.shape[0] and 0 <= ix < a.shape[1] and a[iy, ix] > 40: hits.append(o['id'])
        return hits
    allp = {**{'spot-' + k: v for k, v in spots.items()}, **{'crew-' + k: v for k, v in crew.items()}, **{'station-' + k: [v['x'], v['y']] for k, v in stations.items() if 'x' in v}}
    occluded = {k: covered(*w2ok(*v)) for k, v in allp.items()}; occluded = {k: v for k, v in occluded.items() if v}
    # --- connectivity report (every anchor reachable from the plaza) ---
    anchors = {**{'spot-' + k: v for k, v in spots.items()}, **{'crew-' + k: v for k, v in crew.items()}, **{'station-' + k: [v['x'], v['y']] for k, v in stations.items() if 'x' in v}}
    unreachable = [k for k, v in anchors.items() if not np.isfinite(dist[cell_of(*v)])]
    print(json.dumps({'floorCells': int(grid.sum()), 'runs': len(runs), 'spots': spots, 'crew': crew, 'queue': queue, 'riverY': river_y, 'shoreSpans': spans,
                      'stations': {k: [v['x'], v['y']] for k, v in stations.items() if 'x' in v}, 'unreachable': unreachable, 'occluded': occluded, 'ferry': ferry, 'dais': dais}, ensure_ascii=False))

if __name__ == '__main__':
    main()
