#!/usr/bin/env python3
"""SCENE-FX: per-picture masks for the painted lava / waterfalls / pond / torches of the battle + interrogation backdrops.

  python3 scripts/build-scene-fx.py build            writes img/scene-fx/masks/*.webp + img/scene-fx/scene-fx-layout.json + inventory
  python3 scripts/build-scene-fx.py review <outdir>  writes overlay pictures (mask in cyan on the backdrop) + a contact sheet to look at

Nothing here draws anything: it only decides WHERE the already drawn frames (img/map-zone1/v5-fx/sheets, by Codex) may play.
A mask pixel stays only where the painted backdrop under it really is the fluid / flame (colour test, tight search box, small specks dropped,
holes closed, eroded so it never reaches the rock or the figures) - better no motion than motion on the rock.
"""
import json, sys
from pathlib import Path
import numpy as np, cv2
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'img/scene-fx'
SHEETS = 'img/map-zone1/v5-fx/sheets/'
SIZE = (1672, 941)

# --- sheet recipes: frame counts / fps / blend from img/map-zone1/v5-fx/fx-layout.json (Codex / FX1). Opacity is lower than on the map (.72/.70/.68/.58): the
#     backdrops here are finished paintings (the map ground is a flat base), and the sheets are more saturated than the painted lava / ice falls.
SHEET = {
    'lavafall':   dict(sheet='lavafall.webp', frames=8, fps=7, frameW=314, frameH=534, blend='overlay', opacity=.55, group='lavafall'),
    'waterfall':  dict(sheet='waterfall-ice.webp', frames=8, fps=8, frameW=242, frameH=541, blend='overlay', opacity=.30, group='waterfall'),
    'lava':       dict(sheet='lava-surface.webp', frames=8, fps=7, frameW=627, frameH=627, blend='overlay', opacity=.55, group='lava'),
    'water':      dict(sheet='ice-stream.webp', frames=8, fps=8, frameW=627, frameH=627, blend='overlay', opacity=.30, group='ice'),
    'embers':     dict(sheet='embers-ash.webp', frames=8, fps=7, frameW=128, frameH=160, blend='screen', opacity=.9, group='embers', mode='rise'),
    'sparkle':    dict(sheet='water-sparkle.webp', frames=8, fps=8, frameW=160, frameH=80, blend='screen', opacity=.9, group='sparkle', mode='once', win=.6),
}

def hsv_of(rgb):
    h = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV).astype(int)
    return h[..., 0], h[..., 1], h[..., 2]

def preds(rgb):
    H, S, V = hsv_of(rgb)
    R, G, B = (rgb[..., i].astype(int) for i in range(3))
    hot = (R >= 215) & (B <= 95) & (S >= 140)                                  # lava: the rock / sky around it is dark red (R <= 190)
    return {
        'hot':    hot,
        'hotY':   hot | ((R >= 235) & (G >= 120) & (B <= 140) & (S >= 70)),     # + the yellow-white core
        'hotLow': (R >= 196) & (S >= 180) & (B <= 75),                          # far-away lava is dimmer
        'flame':  (R >= 235) & (G >= 130) & (B <= 120) & (S >= 110),
        'fall':   (((H >= 85) & (H <= 125) & (S >= 35) & (V >= 135)) | ((S <= 70) & (V >= 200))),   # blue / white streaks of a fall
        'pond':   (H >= 80) & (H <= 112) & (S >= 55) & (V >= 80),
    }

# --- scenes. box = [x0,y0,x1,y1] search box in picture px. kind: rect (one frame stretched over the bbox) | tile (pattern) | pulse (flicker of the painted pixels)
SCENES = {
 'img/map-zone1/battle-volcano-v1.webp': dict(id='battle-volcano', outdoor=True, pieces=[
    dict(id='lavafall-a',  kind='rect', recipe='lavafall', pred='hotY', box=[398,140,452,300], min=250),
    dict(id='lavafall-b',  kind='rect', recipe='lavafall', pred='hotY', box=[628,190,690,305], min=400),
    dict(id='lavafall-c',  kind='rect', recipe='lavafall', pred='hotY', box=[858,245,912,330], min=250),
    dict(id='lava-river-right', kind='tile', recipe='lava', pred='hotLow', box=[1090,262,1440,348], tile=[90,54], min=900, embers=9),
    dict(id='lava-pool-left',   kind='tile', recipe='lava', pred='hotLow', box=[285,285,572,352], tile=[90,54], min=900, embers=7),
    dict(id='volcano-streams',  kind='tile', recipe='lava', pred='hot', box=[1120,55,1250,235], tile=[60,36], min=300),
    dict(id='torch-left',  kind='pulse', pred='flame', box=[8,222,48,290], min=120),
    dict(id='torch-right', kind='pulse', pred='flame', box=[1598,255,1665,335], min=120),
 ]),
 'img/map-zone1/battle-ice-v1.webp': dict(id='battle-ice', outdoor=True, pieces=[
    dict(id='fall-big-right',  kind='rect', recipe='waterfall', pred='fall', box=[1150,100,1445,345], min=3000),
    dict(id='fall-center',     kind='rect', recipe='waterfall', pred='fall', box=[850,262,1075,362], min=1500),
    dict(id='fall-left',       kind='rect', recipe='waterfall', pred='fall', box=[676,200,735,342], min=500),
    dict(id='fall-small',      kind='rect', recipe='waterfall', pred='fall', box=[1028,145,1078,250], min=300),
 ]),
 'img/map-zone1/battle-forest-v1.webp': dict(id='battle-forest', outdoor=True, pieces=[
    dict(id='fall-a', kind='rect', recipe='waterfall', pred='fall', box=[438,148,508,262], min=500, op=.22),
    dict(id='fall-b', kind='rect', recipe='waterfall', pred='fall', box=[362,272,462,362], min=800, op=.22),
    dict(id='fall-c', kind='rect', recipe='waterfall', pred='fall', box=[628,165,695,255], min=200, op=.22),
    dict(id='pond',   kind='tile', recipe='water', pred='pond', box=[358,336,862,402], tile=[110,110], min=3000),
    dict(id='torch-1', kind='pulse', pred='flame', box=[940,300,985,350], min=40),
    dict(id='torch-2', kind='pulse', pred='flame', box=[1245,310,1290,350], min=40),
    dict(id='torch-3', kind='pulse', pred='flame', box=[1085,220,1135,262], min=40),
    dict(id='torch-4', kind='pulse', pred='flame', box=[1595,215,1655,262], min=120),
 ]),
 'img/frontier-route/battle-border-v1.webp': dict(id='battle-border', outdoor=True, pieces=[
    dict(id='lavafall-a', kind='rect', recipe='lavafall', pred='hotY', box=[378,160,436,292], min=500),
    dict(id='lava-glow-left', kind='tile', recipe='lava', pred='hot', box=[230,100,420,175], tile=[80,48], min=600),
    dict(id='fall-a', kind='rect', recipe='waterfall', pred='fall', box=[1118,200,1172,372], min=500, op=.22),
    dict(id='fall-b', kind='rect', recipe='waterfall', pred='fall', box=[772,190,812,275], min=250, op=.22),
 ]),
 'img/frontier-route/battle-cave-v1.webp': dict(id='battle-cave', outdoor=False, pieces=[
    dict(id='lavafall-a', kind='rect', recipe='lavafall', pred='hotY', box=[68,100,132,250], min=600),
    dict(id='lavafall-b', kind='rect', recipe='lavafall', pred='hotY', box=[218,160,276,285], min=300),
    dict(id='lava-cascade', kind='tile', recipe='lava', pred='hot', box=[0,285,200,480], tile=[90,54], min=1500, embers=8, ember_px=34),
    dict(id='fall-far', kind='rect', recipe='waterfall', pred='fall', box=[1296,128,1330,292], min=250, op=.22),
    dict(id='torch-1', kind='pulse', pred='flame', box=[318,185,352,225], min=40),
    dict(id='torch-2', kind='pulse', pred='flame', box=[690,262,722,300], min=40),
    dict(id='torch-3', kind='pulse', pred='flame', box=[1370,320,1400,360], min=40),
    dict(id='torch-4', kind='pulse', pred='flame', box=[1612,350,1652,395], min=40),
 ]),
 'img/map-zone1/arena-v1.webp': dict(id='arena-th', outdoor=True, pieces=[
    dict(id='lava-streams', kind='tile', recipe='lava', pred='hot', box=[400,80,640,260], tile=[60,36], min=500),
    dict(id='fall-a', kind='rect', recipe='waterfall', pred='fall', box=[1455,150,1500,215], min=200, op=.22),
    dict(id='fall-b', kind='rect', recipe='waterfall', pred='fall', box=[1530,265,1572,320], min=200, op=.22),
    dict(id='river', kind='tile', recipe='water', pred='pond', box=[1300,330,1560,440], tile=[100,100], min=2000),
 ]),
}

def mask_for(rgb, P, spec):
    x0, y0, x1, y1 = spec['box']
    full = np.zeros(rgb.shape[:2], bool)
    full[y0:y1, x0:x1] = P[spec['pred']][y0:y1, x0:x1]
    u = full.astype(np.uint8)
    u = cv2.morphologyEx(u, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    # holes smaller than 150 px are painted detail inside the fluid
    inv = ~u.astype(bool); lab, n = ndi.label(inv)
    if n:
        sz = ndi.sum(inv, lab, range(1, n + 1)); u = u | np.isin(lab, [i + 1 for i, s in enumerate(sz) if s < 150])
    lab, n = ndi.label(u)
    if n:
        sz = ndi.sum(u, lab, range(1, n + 1)); u = np.isin(lab, [i + 1 for i, s in enumerate(sz) if s >= max(12, spec.get('min', 100) // 12)])
    u = u.astype(np.uint8)
    if spec['kind'] != 'pulse':
        u = cv2.erode(u, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    soft = cv2.GaussianBlur(u.astype(np.float32), (0, 0), .8)      # 1 px feather: no hard stair-step edge
    return np.clip(soft * (u > 0) + soft * .0, 0, 1) if False else np.clip(soft, 0, 1) * (cv2.dilate(u, np.ones((3, 3), np.uint8)) > 0)

def embers(m, n, seed, px):
    """n placed rising embers on the (flat) lava of mask m: inside the mask, not on its edge, spaced apart. Deterministic."""
    rng = np.random.default_rng(1000 + seed)
    core = cv2.erode((m > .6).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    ys, xs = np.nonzero(core)
    if len(xs) < 40: return None
    spots, tries = [], 0
    while len(spots) < n and tries < 400:
        tries += 1; i = int(rng.integers(len(xs))); x, y = int(xs[i]), int(ys[i])      # m is a full-picture mask
        if any((x - s[0]) ** 2 + (y - s[1]) ** 2 < (px * 2.2) ** 2 for s in spots): continue
        spots.append([x, y, px, round(px * 1.25), 0, round(float(rng.random()), 3), round(2.6 + float(rng.random()) * 2.2, 2), round(float(rng.random() - .5) * px * .6, 1), -round(px * (1.1 + float(rng.random()) * .8), 1)])
    r = SHEET['embers']
    xs2 = [s[0] for s in spots]; ys2 = [s[1] for s in spots]
    return dict(id=f'embers-{seed}', kind='embers', rect=[min(xs2) - px, min(ys2) - px * 2, max(xs2) - min(xs2) + px * 2, max(ys2) - min(ys2) + px * 3], sheet=r['sheet'], frames=r['frames'], fps=r['fps'],
                frameW=r['frameW'], frameH=r['frameH'], blend='screen', opacity=r['opacity'], group='embers', spriteW=px, spriteH=round(px * 1.25), spots=spots)

def build(review=None):
    OUT.mkdir(parents=True, exist_ok=True); (OUT / 'masks').mkdir(exist_ok=True)
    layout = {'schemaVersion': 1, 'note': 'SCENE-FX: where the drawn lava / waterfall / pond frames play over the battle + interrogation backdrops. Space = backdrop picture px. Masks cropped to rect (alpha = coverage).',
              'sheetsDir': SHEETS, 'masksDir': 'img/scene-fx/masks/', 'scenes': {}}
    inventory = {}
    for src, scene in SCENES.items():
        rgb = np.asarray(Image.open(ROOT / src).convert('RGB')); assert rgb.shape[1::-1] == SIZE or True
        h, w = rgb.shape[:2]; P = preds(rgb)
        pieces, info = [], []
        overlay = rgb.copy() if review else None
        for spec in scene['pieces']:
            m = mask_for(rgb, P, spec)
            area = int((m > .5).sum())
            ys, xs = np.nonzero(m > .02)
            rec = dict(id=spec['id'], kind=spec['kind'], pred=spec['pred'], area=area, box=spec['box'])
            if area < spec.get('min', 100) or len(xs) == 0:
                rec['off'] = f'only {area} px of the painted fluid / flame found (need {spec.get("min", 100)})'; info.append(rec); continue
            x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
            rect = [x0, y0, x1 - x0, y1 - y0]
            mid = f"{scene['id']}--{spec['id']}"
            crop = (m[y0:y1, x0:x1] * 255).astype(np.uint8)
            rgba = np.dstack([np.full_like(crop, 255)] * 3 + [crop])
            Image.fromarray(rgba, 'RGBA').save(OUT / 'masks' / f'{mid}.webp', lossless=True, method=6)
            piece = dict(id=mid, kind=spec['kind'], rect=rect, mask=mid)
            if spec['kind'] == 'pulse':
                piece.update(period=2.4 + (len(pieces) % 3) * .7, phase=round((len(pieces) * .37) % 1, 2), depth=.22, group='torch')
            else:
                r = SHEET[spec['recipe']]
                piece.update(sheet=r['sheet'], frames=r['frames'], fps=r['fps'], frameW=r['frameW'], frameH=r['frameH'], blend=r['blend'], opacity=spec.get('op', r['opacity']), group=r['group'])
                if spec['kind'] == 'tile':
                    piece['tile'] = spec['tile']
            pieces.append(piece); rec.update(rect=rect, kept=True); info.append(rec)
            if spec.get('embers'):
                e = embers(m, spec['embers'], len(pieces), spec.get('ember_px', 28))
                if e: pieces.append(e); rec['embers'] = len(e['spots'])
            if overlay is not None:
                a = np.zeros((h, w), bool); a[y0:y1, x0:x1] = crop > 60
                overlay[a] = (overlay[a] * .35 + np.array([0, 255, 255]) * .65).astype(np.uint8)
                cv2.rectangle(overlay, (x0, y0), (x1, y1), (255, 255, 0), 1)
                cv2.putText(overlay, spec['id'], (x0, max(10, y0 - 3)), cv2.FONT_HERSHEY_SIMPLEX, .4, (255, 255, 255), 1)
        layout['scenes'][src] = dict(id=scene['id'], size=[w, h], outdoor=scene['outdoor'], pieces=pieces)
        inventory[src] = dict(id=scene['id'], size=[w, h], outdoor=scene['outdoor'], pieces=info)
        if review is not None:
            Path(review).mkdir(parents=True, exist_ok=True)
            Image.fromarray(overlay).save(Path(review) / f"{scene['id']}.jpg", quality=88)
    (OUT / 'scene-fx-layout.json').write_text(json.dumps(layout, ensure_ascii=False, separators=(',', ':')))
    (OUT / 'build-report.json').write_text(json.dumps(inventory, ensure_ascii=False, indent=1))
    for src, v in inventory.items():
        print(v['id'], [(p['id'], p['area'], 'off' if 'off' in p else 'ok') for p in v['pieces']])

if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'build'
    build(sys.argv[2] if cmd == 'review' else None)
