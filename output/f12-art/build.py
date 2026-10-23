"""Reproduce the local inpaint composite and pixel-level evidence (Pillow, numpy)."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/f12-art'
QA = OUT / 'qa'
SOURCE = ROOT / 'img/frontier-route/zone1-2-v3.webp'
DEST = ROOT / 'img/frontier-route/zone1-2-v4.webp'
base = Image.open(SOURCE).convert('RGB')
generated = Image.open(OUT / 'generated-clean.png').convert('RGB')
assert base.size == generated.size == (1672, 941)
walk = Image.open(OUT / 'walkmask.png').convert('L').point(lambda v: 255 if v >= 128 else 0)
W, H = base.size

# Pixel boxes delimit visible intrusion, not a replacement of the whole road.
# Some objects straddle the owner's boundary; their protected pixels remain original.
specs = [
 ('stone-lantern', (330,277,362,325), 'upper-left lantern silhouette'),
 ('grass', (395,319,427,348), 'tuft at stair landing'),
 ('grass', (495,345,533,368), 'tufts on upper linking path'),
 ('tree', (523,349,569,393), 'small tree intruding into upper linking path'),
 ('rock', (589,386,619,408), 'stones on linking path'),
 ('tree', (752,396,803,438), 'small tree at middle fork'),
 ('rock', (791,417,818,440), 'loose stones at middle fork'),
 ('tree', (816,377,863,426), 'tree over middle descent'),
 ('rock', (865,496,902,527), 'loose stones above cave roof'),
 ('rock', (840,506,858,524), 'small stone above cave roof'),
 ('rock', (900,514,919,535), 'stone on cave roof approach'),
 ('grass', (398,445,426,467), 'growth on left descent'),
 ('tree', (418,451,451,483), 'red growth crossing left descent'),
 ('rock', (484,550,518,575), 'stones on lower left landing'),
 ('grass', (522,576,547,598), 'tuft on lower left path'),
 ('grass', (610,599,633,618), 'tuft on lower left path end'),
 ('rock', (967,277,982,299), 'loose stone in upper hairpin'),
 ('rock', (980,290,1000,312), 'loose stones in upper hairpin'),
 ('rock', (950,308,974,329), 'stones at bridge junction'),
 ('grass', (868,321,898,343), 'growth at central bend'),
 ('grass', (916,329,944,352), 'growth at central bend edge'),
 ('tree', (913,718,956,758), 'canopy intruding above lower plaza stair'),
 ('tree', (777,704,830,750), 'canopy intruding at lower plaza edge'),
 ('tree', (829,723,873,761), 'canopy intruding at lower plaza edge'),
 ('tree', (1227,804,1281,833), 'canopy intruding at southeast path'),
 ('grass', (1371,526,1400,550), 'growth at right descent'),
 ('rock', (1411,539,1440,563), 'stones at right path bend'),
]

objects = []
region = Image.new('L', base.size)
draw = ImageDraw.Draw(region)
annotated = base.copy()
ad = ImageDraw.Draw(annotated)
for i, (kind, box, note) in enumerate(specs, 1):
    x0,y0,x1,y1 = box
    cx,cy = (x0+x1)/2, (y0+y1)/2
    # Keep whole boundary-straddling silhouettes instead of leaving chopped trees/posts.
    selected = i in {5,7,9,10,11,12,17,18,19,27}
    if selected:
        draw.rectangle(box, fill=255)
    ad.ellipse((x0-3,y0-3,x1+3,y1+3), outline=(255,30,180) if selected else (255,170,0), width=2)
    ad.rectangle((x0,y0-12,x0+22,y0), fill='black')
    ad.text((x0+2,y0-12), str(i), fill='white')
    objects.append(dict(id=i, type=kind, xy_normalized=[round(cx/W,6),round(cy/H,6)],
                        bbox_normalized=[round(x0/W,6),round(y0/H,6),round(x1/W,6),round(y1/H,6)],
                        bbox_pixels=list(box), note=note,
                        action='local inpaint composite' if selected else 'preserved: boundary/structure conflict; not removed',
                        selected_for_edit=selected))

# Blend inwards across 4 pixels; no blur with an unbounded tail.
# A finite box filter has compact support. Intersect again with original mask.
region = region.filter(ImageFilter.BoxBlur(2))
alpha = np.minimum(np.asarray(region), np.asarray(walk)).copy()
# Exact source restoration of water and stair treads/rails, including their edges.
protected_boxes = [
 (450,562,710,640), # owner-mask water on left middle, including its shoreline rails
 (375,350,452,433), (444,493,503,557), # left stairs
 (831,452,872,506), # stairs above cave
 (882,768,920,829), (932,870,969,898), # lower stairs
 (976,596,1094,674), (1032,597,1108,642),
 (1195,522,1286,580), (1276,476,1336,528),
 (1333,829,1394,862), (1454,744,1583,785),
]
for x0,y0,x1,y1 in protected_boxes:
    alpha[y0:y1,x0:x1] = 0
Image.fromarray(alpha).save(OUT / 'edit-alpha.png')
expanded_walk = walk.filter(ImageFilter.MaxFilter(13))
for obj in objects:
    x0,y0,x1,y1 = obj['bbox_pixels']
    obj['composited_pixels_in_bbox'] = int((alpha[y0:y1,x0:x1] > 0).sum())
    obj['outside_mask_plus_6_pixels_in_bbox'] = int((np.asarray(expanded_walk)[y0:y1,x0:x1] == 0).sum())
final = Image.composite(generated, base, Image.fromarray(alpha))
# Lossless is required: lossy recompression would change untouched source pixels.
final.save(DEST, format='WEBP', lossless=True, method=6, exact=True)
decoded = Image.open(DEST).convert('RGB')
a,b = np.asarray(base),np.asarray(decoded)
delta = np.abs(a.astype(np.int16)-b.astype(np.int16))
changed = np.any(delta != 0, axis=2)
allowed = np.asarray(expanded_walk) > 0
outside = ~allowed
assert int(changed[outside].sum()) == 0
assert decoded.size == (1672,941) and decoded.mode == 'RGB'
for x0,y0,x1,y1 in protected_boxes:
    assert not changed[y0:y1,x0:x1].any()

annotated.save(QA / 'objects.png')
split = base.copy()
split.paste(decoded.crop((W//2,0,W,H)), (W//2,0))
sd = ImageDraw.Draw(split)
sd.line((W//2,0,W//2,H), fill='white',width=2)
sd.rectangle((10,8,260,32),fill='black'); sd.text((18,14),'LEFT: v3 | RIGHT: v4',fill='white')
split.save(QA / 'before-after-split.png')
pair = Image.new('RGB',(W*2,H));pair.paste(base,(0,0));pair.paste(decoded,(W,0))
pair.save(QA / 'before-after-full.jpg',quality=95)
peak = delta.max(axis=2)
heat = np.zeros_like(a);heat[:,:,0] = np.minimum(peak*4,255).astype(np.uint8)
heat[:,:,1] = np.where(changed, np.minimum(peak*2,255),0).astype(np.uint8)
Image.fromarray(heat).save(QA / 'diff-heatmap.png')
report = dict(source=str(SOURCE.relative_to(ROOT)),output=str(DEST.relative_to(ROOT)),
 width=W,height=H,mode=decoded.mode,encoding='WebP lossless',feather_support_pixels=2,
 mask_dilation='Chebyshev radius 6px (13x13 max filter)',
 changed_pixels=int(changed.sum()),outside_mask_plus_6_changed_pixels=int(changed[outside].sum()),
 outside_mask_plus_6_max_channel_diff=int(delta[outside].max()),
 outside_original_mask_changed_pixels=int(changed[np.asarray(walk)==0].sum()),
 protected_boxes=protected_boxes,protected_boxes_changed_pixels=0,
 source_sha256=hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
 output_sha256=hashlib.sha256(DEST.read_bytes()).hexdigest(),
 visual_review='Human acceptance required; object completeness is not established by pixel assertions.')
(OUT / 'objects.json').write_text(json.dumps(dict(coordinate_system='top-left origin; x/1672, y/941',objects=objects),indent=2)+'\n')
(QA / 'verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
