"""N1b: composite generated local inpaints with finite feather masks; verify decoded assets."""
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path
import io, json, subprocess
import numpy as np

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]
CONFIG = {
    'th': ((748,128,968,304), (77,55,144,116)),
    'asia': ((748,150,968,326), (74,50,148,129)),
    'cyberhell': ((748,206,968,382), (79,28,141,117)),
}
report = {'backgrounds': {}, 'encoding': 'RGB WebP lossless; decoded pixels outside feather mask identical to HEAD', 'tool': 'built-in image_gen'}
for name, (box, ellipse) in CONFIG.items():
    rel = f'img/rooms-wide/{name}-krajok.webp'
    before = Image.open(io.BytesIO(subprocess.check_output(['git','show',f'HEAD:{rel}'], cwd=ROOT))).convert('RGB')
    generated = Image.open(OUT / f'{name}-inpaint.png').convert('RGB').resize((220,176), Image.Resampling.LANCZOS)
    # Keep the normalized generated patch as the reproducible compositing input.
    generated.save(OUT / f'{name}-inpaint.png')
    mask = Image.new('L', (220,176)); ImageDraw.Draw(mask).ellipse(ellipse, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(2))
    full_mask = Image.new('L', before.size); full_mask.paste(mask, box[:2])
    full_mask.save(OUT / f'{name}-mask.png')
    after = before.copy()
    after.paste(Image.composite(generated, before.crop(box), mask), box[:2])
    after.save(ROOT / rel, 'WEBP', lossless=True, quality=100, method=6)
    saved = Image.open(ROOT / rel).convert('RGB')
    a,b,m = np.asarray(before),np.asarray(saved),np.asarray(full_mask)
    changed = np.any(a != b,axis=2)
    outside = int(np.count_nonzero(changed & (m == 0)))
    assert saved.size == before.size and outside == 0
    y,x = np.where(changed)
    diff = np.zeros_like(a); diff[changed] = (255,80,40)
    Image.fromarray(diff).save(OUT / f'{name}-diff-map.png')
    Image.blend(before,Image.fromarray(diff),0.55).save(OUT / f'{name}-diff-overlay.png')
    sheet = Image.new('RGB',(660,176)); sheet.paste(before.crop(box),(0,0)); sheet.paste(saved.crop(box),(220,0)); sheet.paste(Image.fromarray(diff).crop(box),(440,0))
    sheet.resize((1320,352)).save(OUT / f'{name}-before-after-diff.png')
    report['backgrounds'][name] = {'size':list(saved.size),'changed_pixels':int(changed.sum()),'changed_bbox_xyxy_exclusive':[int(x.min()),int(y.min()),int(x.max()+1),int(y.max()+1)],'changed_outside_mask':outside,'original_bytes':len(subprocess.check_output(['git','show',f'HEAD:{rel}'],cwd=ROOT)),'final_bytes':(ROOT / rel).stat().st_size}

mirror = Image.open(OUT / 'mirror-generated.png').convert('RGBA')
# Preserve generated alpha, fit within 512, anchor its supporting foot at bottom center.
alpha = np.asarray(mirror.getchannel('A'))
ys,xs = np.where(alpha > 8)
mirror = mirror.crop((int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)))
mirror.thumbnail((500,512),Image.Resampling.LANCZOS)
asset = Image.new('RGBA',(512,512)); asset.alpha_composite(mirror,((512-mirror.width)//2,512-mirror.height))
asset.save(ROOT / 'img/krajok-magic-mirror.png')
saved = Image.open(ROOT / 'img/krajok-magic-mirror.png')
a = np.asarray(saved.getchannel('A'))
assert saved.size == (512,512) and saved.mode == 'RGBA' and saved.n_frames == 1
assert (a == 0).any() and (a == 255).any() and a[-1,240:273].max() > 128
report['mirror'] = {'size':list(saved.size),'mode':saved.mode,'frames':saved.n_frames,'alpha_min_max':[int(a.min()),int(a.max())],'bottom_center_alpha_max':int(a[-1,240:273].max())}
# Art alignment preview only: the N1 renderer is absent from this checkout.
background = Image.open(ROOT / 'img/rooms-wide/th-krajok.webp').convert('RGBA')
foot=(859,246); sprite_size=94
sprite=asset.resize((sprite_size,sprite_size),Image.Resampling.LANCZOS)
background.alpha_composite(sprite,(foot[0]-sprite_size//2,foot[1]-sprite_size))
background.convert('RGB').save(OUT / 'th-mirror-composite-n1b.png')
background.crop((748,128,968,304)).resize((880,704)).save(OUT / 'th-mirror-contact-n1b.png')
report['preview']={'foot_xy':foot,'sprite_size':sprite_size,'kind':'art placement preview; not runtime verification'}
# West is an invariant.
west='img/rooms-wide/west-krajok.webp'
assert (ROOT / west).read_bytes() == subprocess.check_output(['git','show',f'HEAD:{west}'],cwd=ROOT)
report['west_unchanged']=True
(OUT / 'verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
