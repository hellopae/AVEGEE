"""P4 only: register per-frame ImageGen clothing; preserve original alpha/identity/weapons.
Run from repository root with Python, Pillow, NumPy and SciPy.
"""
from pathlib import Path
import json, hashlib
from PIL import Image, ImageDraw
import numpy as np
from scipy import ndimage as ndi

P=Path(__file__).resolve().parent
ROOT=P.parents[3]
ASSETS=ROOT/'img/yama-sword-weapons'
HAT_TOP=[478,494,476,494,486,497,504,487]
GEN_FOOT=[1116,1116,1116,1113,1113,1116,1114,1116]


def bbox(a, threshold=0):
    return Image.fromarray(np.uint8(a[:,:,3]>threshold)*255).getbbox()

def skin(a):
    r,g,b=a[:,:,:3].astype(float).transpose(2,0,1)
    m=(r>55)&(r>1.35*g)&(r>1.22*b)&(a[:,:,3]>16)
    m[500:]=False
    m=ndi.binary_fill_holes(m)
    return ndi.binary_dilation(m,iterations=2)

def foot(a):
    # Opaque boot contact, below the knees and left of all sword-tip effects.
    m=a[:,:,3]>128;m[:540]=False;m[:,370:]=False
    yy,xx=np.where(m);y=int(yy.max());xs=np.flatnonzero(m[y])
    return [float((xs.min()+xs.max())/2),y]

def bg(a):
    f=Image.fromarray(a) if isinstance(a,np.ndarray) else a
    im=Image.new('RGBA',f.size,'#393943');im.alpha_composite(f)
    return im.convert('RGB')

validation={'scope':'P4 only','imagegen_calls':8,'alpha_bbox_threshold':0,
 'opaque_bbox_threshold':128,'foot_method':'midpoint of min/max x on bottom opaque (alpha>128) boot row; x<370 and y>=540; excludes sword effects',
 'method':'Registered ImageGen costume RGB inside original silhouette; exact original alpha retained. Original exposed skin/eyes/horns plus union of original weapon differences restored without resampling.',
 'sheets':[]}
transforms=[];finals={k:[] for k in ['cane','fang']}
(P/'masks').mkdir(exist_ok=True)
(P/'final-frames').mkdir(exist_ok=True)
for i in range(8):
    old={k:np.array(Image.open(P/'original-frames'/f'{k}-{i}.png').convert('RGBA')) for k in finals}
    c,f=old.values()
    # Weapon replacement affects the same registered character; keep both weapons verbatim.
    diff=np.any(c!=f,axis=2)&((c[:,:,3]>0)|(f[:,:,3]>0))
    protected=ndi.binary_dilation(diff,iterations=2)|skin(c)|skin(f)
    char=np.zeros((640,640),bool);char[245:582,110:375]=True
    costume=char&~protected&(c[:,:,3]>0)&(f[:,:,3]>0)
    g=np.array(Image.open(P/f'generated-{i}.png').convert('RGBA'))
    # Remove tiny alpha noise introduced by generation before measuring/registering.
    g[g[:,:,3]<9]=0
    sy=(foot(c)[1]-250)/(GEN_FOOT[i]-HAT_TOP[i]);dy=250-sy*HAT_TOP[i]
    # Fit boot span horizontally, independently of the original sword's reach.
    gm=(g[:,:,3]>128);gm[:1040]=False;gm[1120:]=False;gm[:,740:]=False
    gy,gx=np.where(gm)
    om=(c[:,:,3]>128);om[:540]=False;om[571:]=False;om[:,370:]=False
    oy,ox=np.where(om)
    sx=(ox.max()-ox.min())/(gx.max()-gx.min());dx=ox.min()-sx*gx.min()
    resized=Image.fromarray(g).resize((round(g.shape[1]*sx),round(g.shape[0]*sy)),Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',(640,640))
    canvas.paste(resized,(round(dx),round(dy)))
    registered=np.array(canvas)
    # Never sample generated skin/eyes into an original clothing pixel.
    bad=(registered[:,:,3]<32)|skin(registered)
    _,indices=ndi.distance_transform_edt(bad,return_indices=True)
    rgb=registered[indices[0],indices[1],:3]
    # Store the mask so the exact preserved regions are independently inspectable.
    Image.fromarray(np.uint8(costume)*255).save(P/'masks'/f'costume-{i}.png')
    transforms.append({'frame':i,'scale_x':resized.width/g.shape[1],'scale_y':resized.height/g.shape[0],'translate':[round(dx),round(dy)],'generated_hat_top':HAT_TOP[i],'generated_boot_row':GEN_FOOT[i],'resampler':'Pillow LANCZOS'})
    for k,o in old.items():
        n=o.copy();n[costume,:3]=rgb[costume];n[n[:,:,3]==0,:3]=0
        Image.fromarray(n).save(P/'final-frames'/f'{k}-{i}.png')
        finals[k].append(n)

for k,frames in finals.items():
    sheet=Image.new('RGBA',(5120,640))
    for i,a in enumerate(frames):sheet.paste(Image.fromarray(a),(640*i,0))
    path=ASSETS/f'hero-yama-cyberhell-sword-{k}.webp'
    sheet.save(path,'WEBP',lossless=True,exact=True,method=6)
    reopened=Image.open(path);assert reopened.size==(5120,640) and reopened.mode=='RGBA'
    rec={'path':str(path.relative_to(ROOT)),'size':list(reopened.size),'mode':reopened.mode,'grid':[8,1],'cell':[640,640],'frames':[]}
    gif=[]
    for i in range(8):
        o=np.array(Image.open(P/'original-frames'/f'{k}-{i}.png'))
        n=np.array(reopened.crop((640*i,0,640*(i+1),640)))
        bo,bn=bbox(o),bbox(n);fo,fn=foot(o),foot(n)
        m=np.array(Image.open(P/'masks'/f'costume-{i}.png'))>0
        kept=(~m)&(o[:,:,3]>0)
        row={'frame':i,'original_bbox':bo,'new_bbox':bn,'original_opaque_bbox':bbox(o,128),'new_opaque_bbox':bbox(n,128),
          'height_delta_percent':100*((bn[3]-bn[1])/(bo[3]-bo[1])-1),
          'original_foot':fo,'new_foot':fn,'foot_delta_px':[fn[j]-fo[j] for j in range(2)],
          'alpha_identical':bool(np.array_equal(o[:,:,3],n[:,:,3])),
          'preserved_region_pixels':int(kept.sum()),'preserved_region_rgb_identical':bool(np.array_equal(o[kept],n[kept])),
          'costume_pixels_changed':int(np.any(o[:,:,:3]!=n[:,:,:3],axis=2)[m].sum()),'fallback_original':False}
        assert abs(row['height_delta_percent'])<=2 and max(abs(x) for x in row['foot_delta_px'])<=2
        assert row['alpha_identical'] and row['preserved_region_rgb_identical']
        rec['frames'].append(row)
        pair=Image.new('RGB',(1280,680),'#393943');pair.paste(bg(o),(0,40));pair.paste(bg(n),(640,40))
        d=ImageDraw.Draw(pair);d.text((20,12),f'{k} frame {i} / ORIGINAL',fill='white');d.text((660,12),'NEW COSTUME',fill='white')
        gif.append(pair.resize((960,510)))
    gif[0].save(P/f'compare-{k}.gif',save_all=True,append_images=gif[1:],duration=150,loop=0,optimize=False,disposal=2)
    rec['gif_frames']=len(gif);rec['sha256']=hashlib.sha256(path.read_bytes()).hexdigest();validation['sheets'].append(rec)

# Every frame side by side at native resolution, two sheet columns.
compare=Image.new('RGB',(2560,8*680),'#393943')
for col,k in enumerate(finals):
    for i,n in enumerate(finals[k]):
        o=Image.open(P/'original-frames'/f'{k}-{i}.png')
        compare.paste(bg(o),(col*1280,i*680+40));compare.paste(bg(n),(col*1280+640,i*680+40))
        d=ImageDraw.Draw(compare);d.text((col*1280+15,i*680+12),f'{k} frame {i} / ORIGINAL',fill='white');d.text((col*1280+655,i*680+12),'NEW COSTUME',fill='white')
compare.save(P/'compare.jpg',quality=94,subsampling=0)
compare.resize((1280,2720)).save(P/'compare-preview.jpg',quality=92)
validation['registration']=transforms
(P/'validation.json').write_text(json.dumps(validation,indent=2)+'\n')
print(json.dumps({'sheets':len(validation['sheets']),'frames':sum(len(s['frames']) for s in validation['sheets']),'max_height_delta_percent':max(abs(f['height_delta_percent']) for s in validation['sheets'] for f in s['frames']),'max_foot_delta_px':max(abs(v) for s in validation['sheets'] for f in s['frames'] for v in f['foot_delta_px'])},indent=2))
