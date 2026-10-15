#!/usr/bin/env python3
"""L1: clear-mask for the Zone 1 painted ground (re-runnable whenever the layout changes).

Why: the K1b painting already has trees / rocks / roofs painted where the owner marked them, and K1d then
stands sprites on top of them, so everything is drawn twice and nothing touches the ground. Codex inpaints
the painting under every placed object (ground only, flat dirt / stone / snow + contact shade) using this mask.

Reads the REAL placement from the running game (building footprints are measured from sprite alpha in
src/art.js, so the page is the only honest source), builds:
  <out>/clear-mask.png     4915x3277, white = clear, black = keep
  <out>/footprints.json    one entry per object (kind, id, world + painting px boxes, biome, ground hint)
  <out>/mask-overlay.jpg   mask over the 1536x1024 preview
usage: l1-clear-mask.py [--out DIR] [--pad PX]
"""
import sys, os, json, math, base64, threading, functools, http.server, socketserver, argparse
import numpy as np
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HARNESS = '/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Toby/k3-perf'
MAP = '/Users/agapae/agapae-work/backup/avegee-k1b-map-v2-2026-10-15/zone1-terrain-v2-full.png'
PREVIEW = os.path.join(ROOT, 'img/map-zone1/v2/zone1-terrain-v2-preview.webp')
PX = 4915 / 3840            # painting px per world unit (1.28)
ap = argparse.ArgumentParser()
ap.add_argument('--out', default='/Users/agapae/agapae-work/backup/avegee-l1-clear-mask')
ap.add_argument('--pad', type=float, default=16, help='expand every footprint by this many painting px (12-20)')
ap.add_argument('--port', type=int, default=8941)
args = ap.parse_args()
os.makedirs(args.out, exist_ok=True)

# ---------- 1. ask the running game where things really stand ----------
JS = """async()=>{
  const art=await import('./src/art.js'), data=await import('./src/data.js');
  const lay=await import('./src/town-layout.js?v=k1d');
  const defs=[...data.STATIONS,data.FRONTIER];
  const st=defs.map(d=>{const b=art.stationBox(d);return {k:d.k,bx:d.bx,by:d.by,bw:d.bw,
    box:b?[b.x,b.y,b.x+b.w,b.y+b.h]:null,foot:art.footOf(d),body:art.bodyBoxOf(d)};});
  const m=lay.TOWN_WALK_MASK;let bin='';for(let i=0;i<m.data.length;i++)bin+=String.fromCharCode(48+m.data[i]);
  const imgs={};for(const k of ['town-tree-th','town-prop-rock'])imgs[k]=(i=>i?[i.naturalWidth,i.naturalHeight]:null)(art.img(k));
  return {stations:st,houses:lay.TOWN_HOUSE_SITES,props:lay.TOWN_PROP_SITES.map(({id,kind,x,y,w,rx,ry,biome,h})=>({id,kind,x,y,w,rx,ry,biome,h})),
    dais:lay.TOWN_DAIS,walk:{cell:m.cell,cols:m.cols,rows:m.rows,bits:bin},imgs};}"""
sys.path.insert(0, HARNESS)
from harness import setup
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def end_headers(self): self.send_header('Cache-Control', 'no-store'); super().end_headers()
class S(socketserver.ThreadingMixIn, http.server.HTTPServer): daemon_threads = True; allow_reuse_address = True
srv = S(('127.0.0.1', args.port), functools.partial(Q, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b, ctx, pg = setup(p, args.port, 1440, 900, 2)
    pg.wait_for_timeout(3000); pg.evaluate(JS); pg.wait_for_timeout(4000)   # first pass triggers lazy image loads
    D = pg.evaluate(JS)
    assert pg.evaluate('G.zone') == 'th'
    b.close()
srv.shutdown()
json.dump(D, open('/tmp/l1-dump.json', 'w'))

# ---------- 2. footprints (world units) ----------
BIOME_BY_STATION = {'krata':'lava','dab':'lava','ngiw':'lava','tarang':'city','sala':'city','tea':'city','sawan':'heaven',
                    'lokan':'ice','lan':'ice','krajok':'ice','frontier':'city'}
def biome_at(x, y):
    return 'lava' if x < 900 else 'ice' if x > 2900 else 'city'
GROUND = {'lava':'dark volcanic earth / basalt gravel (orange-red leaf litter ok)',
          'city':'packed earth and rough cobble matching the neighbouring road',
          'ice':'frost-grey stone with thin snow',
          'heaven':'pale warm stone paving'}
items = []     # each: dict(kind,id,biome, shape=('ell',cx,cy,rx,ry)|('rect',x1,y1,x2,y2), sprite=[x1,y1,x2,y2])
for s in D['stations']:
    f, bx = s['foot'], s['box']
    if not f: print('WARN no foot for', s['k']); continue
    items.append(dict(kind='frontier-gate' if s['k']=='frontier' else 'building', id=s['k'], biome=BIOME_BY_STATION.get(s['k'],'city'),
                      shape=('rect', *f), sprite=bx))
dais = D['dais']; dh = dais['w'] * 1024 / 1536
items.append(dict(kind='dais', id='dais', biome='city',
                  shape=('rect', dais['x']-dais['w']*.46, dais['y']-dh*.22, dais['x']+dais['w']*.46, dais['y']+4),
                  sprite=[dais['x']-dais['w']/2, dais['y']-dh, dais['x']+dais['w']/2, dais['y']]))
for i, h in enumerate(D['houses']):
    band = min(46, h['h'] * .34)
    items.append(dict(kind='house', id=f"house-{i}", biome=biome_at(h['x'], h['y']),
                      shape=('rect', h['x']-h['w']*.46, h['y']-band, h['x']+h['w']*.46, h['y']+4),
                      sprite=[h['x']-h['w']/2, h['y']-h['h'], h['x']+h['w']/2, h['y']]))
for p_ in D['props']:
    x, y, w, k = p_['x'], p_['y'], p_['w'], p_['kind']
    if k == 'tree':
        ih = (D['imgs']['town-tree-th'] or [1199, 1312]); th = w * ih[1] / ih[0]
        shape = ('ell', x, y-3, max(w*.22, 26), max(w*.085, 10)); sprite = [x-w/2, y-th, x+w/2, y]
    elif k == 'rock':
        shape = ('ell', x, y-w*.08, w*.5, w*.2); sprite = [x-w/2, y-w, x+w/2, y]
    elif k == 'palm':
        shape = ('ell', x, y-2, 22, 9); sprite = [x-w/2, y-(p_['h'] or 171), x+w/2, y]
    else:   # lamp / torch: thin post
        shape = ('ell', x, y-2, 11, 6); sprite = [x-w/2, y-(p_['h'] or 72), x+w/2, y]
    items.append(dict(kind=k, id=p_['id'], biome=p_['biome'] if k not in ('lamp','torch') else ('heaven' if k=='lamp' else 'lava'),
                      shape=shape, sprite=sprite))

# ---------- 3. paint the mask ----------
W, H = 4915, 3277
mask = Image.new('L', (W, H), 0); dr = ImageDraw.Draw(mask)
walk = np.frombuffer(D['walk']['bits'].encode(), dtype=np.uint8).reshape(D['walk']['rows'], D['walk']['cols']) - 48
img = np.asarray(Image.open(MAP).convert('RGB'))
out = []
for it in items:
    s = it['shape']
    if s[0] == 'ell':
        cx, cy, rx, ry = s[1]*PX, s[2]*PX, s[3]*PX + args.pad, s[4]*PX + args.pad
        dr.ellipse([cx-rx, cy-ry, cx+rx, cy+ry], fill=255); box = [cx-rx, cy-ry, cx+rx, cy+ry]
    else:
        x1, y1, x2, y2 = [v*PX for v in s[1:]]; pd = args.pad
        box = [x1-pd, y1-pd*.6, x2+pd, y2+pd]
        dr.rounded_rectangle(box, radius=min(40, (box[3]-box[1])/2), fill=255)
    box = [max(0, box[0]), max(0, box[1]), min(W-1, box[2]), min(H-1, box[3])]
    # what the painting shows right around the footprint (hint for the inpaint colour) and how much of it is walkable
    ix1, iy1, ix2, iy2 = [int(v) for v in box]
    pad2 = 60
    ring = img[max(0, iy1-pad2):min(H, iy2+pad2), max(0, ix1-pad2):min(W, ix2+pad2)].astype(float)
    cxw, cyw = (box[0]+box[2])/2/PX, (box[1]+box[3])/2/PX
    cell = D['walk']['cell']; wr = int(min(walk.shape[0]-1, cyw/cell)); wc = int(min(walk.shape[1]-1, cxw/cell))
    sx = it['sprite']
    out.append(dict(kind=it['kind'], id=it['id'], biome=it['biome'], ground_hint=GROUND[it['biome']],
        footprint_px=[round(v) for v in box], footprint_world=[round(v/PX, 1) for v in box],
        sprite_world=[round(v, 1) for v in sx] if sx else None,
        sprite_px=[round(v*PX) for v in sx] if sx else None,
        on_walkable_ground=bool(walk[wr, wc]), nearby_mean_rgb=[int(v) for v in ring.reshape(-1, 3).mean(0)]))
mask.save(os.path.join(args.out, 'clear-mask.png'), optimize=True)
json.dump(dict(painting_px=[W, H], world=[3840, 2560], px_per_world_unit=PX, pad_px=args.pad,
               light='from upper-left (shadows fall to the right and slightly down)', count=len(out), items=out),
          open(os.path.join(args.out, 'footprints.json'), 'w'), indent=1, ensure_ascii=False)

# ---------- 4. overlay on the preview ----------
pv = Image.open(PREVIEW).convert('RGB'); sc = pv.width / W
m_small = mask.resize(pv.size, Image.LANCZOS)
tint = Image.new('RGB', pv.size, (255, 40, 90))
ov = Image.composite(tint, pv, m_small.point(lambda v: int(v * .55)))
d2 = ImageDraw.Draw(ov)
for o in out:
    x1, y1, x2, y2 = [v*sc for v in o['footprint_px']]; d2.rectangle([x1, y1, x2, y2], outline=(255, 255, 0))
ov.save(os.path.join(args.out, 'mask-overlay.jpg'), quality=88)
cov = np.asarray(mask).mean() / 255
print(f'items {len(out)}  mask coverage {cov*100:.2f}%  -> {args.out}')
