"""Cut ImageGen drawings; spatial seam repair only, never synthesize temporal frames."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
(ROOT/'clouds').mkdir(exist_ok=True)
def write(name, obj):
    (ROOT / name).write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n')

def spec(id, source, cols, rows, cells, size, fps, zone, placements, blend='normal', tile=False):
    return dict(id=id, source=source, cols=cols, rows=rows, cells=cells, size=size,
                fps=fps, zone=zone, placements=placements, blend=blend, tile=tile)

S = []
def add(id, source, cols, rows, cells, size, fps, zone, placements, blend='normal', tile=False):
    S.append(spec(id,source,cols,rows,cells,size,fps,zone,placements,blend,tile))
# Placements are x,y,w,h in the requested 2500 x 1759 ok-space.
add('spirit-river','river',4,2,list(range(8)),(384,192),10,'river',[[0,970,2500,620]],tile=True)
add('river-foam','river-foam',4,2,list(range(8)),(320,128),8,'river',[[150,1170,360,90],[1660,1180,380,95],[2100,1340,320,80]])
add('lava-surface','lava',4,2,list(range(8)),(320,192),7,'lava',[[0,350,640,800]],tile=True)
add('lava-bubble','lava-bubble',4,2,list(range(8)),(144,144),9,'lava',[[76,680,65,65],[180,825,55,55],[300,1050,80,80]])
add('lava-fall-left','lava-fall',4,2,list(range(8)),(144,224),10,'lava-fall',[[414,1032,115,118]])
for row,(id,zone,ps) in enumerate([
    ('river-mist','river',[[140,1130,610,170],[1680,1170,620,180]]),
    ('lava-steam','lava',[[25,710,300,120],[130,920,380,150]]),
    ('ice-mist','ice',[[2050,650,400,130],[1880,870,420,140]])]):
    add(id,'mist',6,3,list(range(row*6,row*6+6)),(256,120),4,zone,ps)
for row,(id,zone,ps) in enumerate([
    ('leaf-maple','trees',[[560,1250,24,24],[770,1430,22,22],[1250,1350,24,24],[130,510,20,20]]),
    ('leaf-gold','trees',[[1640,540,19,24],[1480,460,18,23],[1690,640,20,24]]),
    ('leaf-green','trees',[[1840,1490,20,26],[1990,1560,20,24],[1170,830,20,24]]),
    ('snowflake','ice',[[2180,550,14,14],[2300,730,12,12],[2100,850,14,14],[2390,940,13,13]])]):
    add(id,'leaves',6,4,list(range(row*6,row*6+6)),(80,80),7,zone,ps)
for source,rows in [('clouds-near',[(0,'cloud-01',[35,35,730,190]),(1,'cloud-02',[1420,30,820,240]),(2,'cloud-03',[680,150,580,140])]),
                    ('clouds-far',[(0,'cloud-04',[1600,200,650,190]),(1,'cloud-far-01',[250,260,520,100]),(2,'cloud-far-02',[1000,285,650,100])])]:
    for row,id,p in rows:
        add(id,source,6,3,list(range(row*6,row*6+6)),(296,160),3,'sky',[p])
add('torch-flame','fire',4,4,list(range(8)),(128,160),11,'lamps',[[1312,966,22,32],[1511,968,22,32],[2120,916,20,30],[320,708,26,38]])
add('embers-ash','fire',4,4,list(range(8,16)),(128,160),7,'lava',[[100,560,120,180],[290,880,130,190]])
for row,id in enumerate(['god-ray-01','god-ray-02','god-ray-03','air-dust']):
    ps=[[[750,270,310,430]],[[1440,510,290,400]],[[2060,410,330,420]],[[850,550,180,200],[1500,800,160,190]]][row]
    add(id,'rays-dust',6,4,list(range(row*6,row*6+6)),(192,224) if row<3 else (96,96),3 if row<3 else 5,'air',ps,'screen')
add('water-sparkle','water-sparkle',4,2,list(range(8)),(160,80),8,'river',[[540,1260,90,45],[1770,1270,100,50],[2180,1400,90,45],[80,1360,100,50]],'screen')

def premul(im):
    a=np.asarray(im,dtype=np.float32)/255
    return np.concatenate([a[:,:,:3]*a[:,:,3:4],a[:,:,3:4]],axis=2)

def difference(a,b):
    active=np.maximum(a[:,:,3],b[:,:,3])>.015
    return float(np.abs(a-b)[active].mean()) if active.any() else 0

def seam(im):
    a=np.array(im).astype(np.float32)
    return float(np.abs(a[:,0]-a[:,-1]).mean()/255)

def periodic(im, band=20):
    a=np.array(im).astype(np.float32)
    original=a.copy()
    for d in range(band):
        t=d/(band-1)
        common=(original[:,d]+original[:,-1-d])/2
        a[:,d]=common*(1-t)+original[:,d]*t
        a[:,-1-d]=common*(1-t)+original[:,-1-d]*t
    return Image.fromarray(np.rint(a).astype('uint8'))

manifest=[]; reviews=[]; thumbs=[]
for s in S:
    source=Image.open(ROOT/'sources'/f"{s['source']}.webp").convert('RGBA')
    w,h=source.size; cells=[]
    for n in s['cells']:
        c=n%s['cols']; r=n//s['cols']
        box=(round(c*w/s['cols']),round(r*h/s['rows']),round((c+1)*w/s['cols']),round((r+1)*h/s['rows']))
        cell=source.crop(box)
        if not s['tile']:
            # Generated wisps can touch a cell boundary. Feather alpha spatially.
            pixels=np.array(cell);cy,cx=np.indices(pixels.shape[:2])
            edge=np.minimum.reduce([cx,cy,pixels.shape[1]-1-cx,pixels.shape[0]-1-cy])
            feather=np.clip(edge/12,0,1)
            pixels[:,:,3]=np.rint(pixels[:,:,3]*feather).astype('uint8')
            cell=Image.fromarray(pixels)
        cells.append(cell)
    # One common crop for the whole sequence preserves generated registration.
    if not s['tile']:
        bboxes=[im.getchannel('A').point(lambda v:255 if v>4 else 0).getbbox() for im in cells]
        bboxes=[b for b in bboxes if b]
        box=(max(0,min(b[0] for b in bboxes)-5),max(0,min(b[1] for b in bboxes)-5),
             min(min(im.width for im in cells),max(b[2] for b in bboxes)+5),
             min(min(im.height for im in cells),max(b[3] for b in bboxes)+5))
        cells=[im.crop(box) for im in cells]
    else:
        box=None
    native=[cells[0].width,cells[0].height]
    target=s['size']
    frames=[]; before=[]
    for im in cells:
        if s['tile']:
            im=im.resize(target,Image.Resampling.LANCZOS)
            before.append(seam(im)); im=periodic(im)
        else:
            im.thumbnail(target,Image.Resampling.LANCZOS)
            canvas=Image.new('RGBA',target)
            canvas.alpha_composite(im,((target[0]-im.width)//2,(target[1]-im.height)//2))
            im=canvas
        # WebP discards RGB under zero alpha; canonicalize before hashing/export.
        pixels=np.array(im);pixels[pixels[:,:,3]==0,:3]=0
        frames.append(Image.fromarray(pixels))
    arrays=[premul(f) for f in frames]
    adjacent=[difference(a,b) for a,b in zip(arrays,arrays[1:])]
    mean=float(np.mean(adjacent)); close=difference(arrays[-1],arrays[0])
    ratio=close/mean if mean else 0
    order=list(range(len(frames))); mode='loop'
    if ratio>1.5:
        mode='pingpong'
        if adjacent[-1]<adjacent[0]:
            # Reverse the forward sequence, not the drawings, for the quieter turn.
            order=order[::-1]
        order=order+order[-2:0:-1]
    played=[arrays[i] for i in order]
    played_adj=[difference(a,b) for a,b in zip(played,played[1:])]
    effective_close=difference(played[-1],played[0])
    effective_mean=float(np.mean(played_adj))
    effective_ratio=effective_close/effective_mean if effective_mean else 0
    sheet=Image.new('RGBA',(target[0]*len(frames),target[1]))
    for i,f in enumerate(frames):sheet.paste(f,(i*target[0],0))
    sheet.save(ROOT/'sheets'/f"{s['id']}.webp",lossless=True,exact=True,method=6)
    if s['zone']=='sky':
        frames[0].save(ROOT/'clouds'/f"{s['id']}.png")
    strip=Image.new('RGB',(200*len(frames),155),'#372d40');d=ImageDraw.Draw(strip)
    for i,f in enumerate(frames):
        t=f.copy();t.thumbnail((194,125));bg=Image.new('RGBA',(194,125),'#372d40');bg.alpha_composite(t,((194-t.width)//2,(125-t.height)//2));strip.paste(bg.convert('RGB'),(i*200,22));d.text((i*200+8,5),str(i+1),fill='white')
    strip.save(ROOT/'strips'/f"{s['id']}-frame-strip.jpg",quality=87)
    gifs=[]
    for i in order:
        f=frames[i].copy();f.thumbnail((280,210));bg=Image.new('RGBA',f.size,'#372d40');bg.alpha_composite(f);gifs.append(bg.convert('RGB'))
    gifs[0].save(ROOT/'preview'/f"{s['id']}.gif",save_all=True,append_images=gifs[1:],duration=round(1000/s['fps']),loop=0,disposal=2)
    alpha=np.asarray(sheet)[:,:,3]
    m=dict(id=s['id'],sheet=f"sheets/{s['id']}.webp",frameW=target[0],frameH=target[1],frames=len(frames),fps=s['fps'],loop=mode,
           playbackOrder=order,tileable='x' if s['tile'] else '',blend=s['blend'],suggestedPlacement=[dict(x=p[0],y=p[1],w=p[2],h=p[3],zone=s['zone']) for p in s['placements']],
           nativeCropPx=native,source=f"sources/{s['source']}.webp",sourceGrid=[s['cols'],s['rows']],sourceCells=s['cells'],commonCrop=box,
           frameStrip=f"strips/{s['id']}-frame-strip.jpg",preview=f"preview/{s['id']}.gif",parallax=0.18 if 'far' in s['id'] else 0.35 if s['zone']=='sky' else 1,
           mask='river-mask.png' if s['id'] in ['spirit-river','water-sparkle','river-foam'] else 'lava-mask.png' if s['id']=='lava-surface' else None)
    manifest.append(m)
    m['suggestedOpacity']=0.42 if s['id'] in ['river-mist','lava-steam','ice-mist'] else 0.25 if s['id'].startswith('god-ray') else 0.5 if s['id']=='river-foam' else 0.65 if s['id']=='air-dust' else 1
    reviews.append(dict(id=s['id'],rawAdjacentMAE=adjacent,rawMeanAdjacentMAE=mean,rawLastToFirstMAE=close,rawRatio=ratio,
                        loop=mode,playbackOrder=order,effectiveLastToFirstMAE=effective_close,effectiveMeanAdjacentMAE=effective_mean,effectiveRatio=effective_ratio,
                        loopThreshold=1.5,loopCriterionMet=effective_ratio<=1.5,
                        frameHashes=[hashlib.sha256(f.tobytes()).hexdigest() for f in frames],uniqueFrames=len(set(f.tobytes() for f in frames)),
                        alphaRange=[int(alpha.min()),int(alpha.max())],fractionPartialAlpha=float(((alpha>0)&(alpha<255)).mean()),
                        rawTileEdgeMAE=before,finalTileEdgeMAE=[seam(f) for f in frames] if s['tile'] else [],
                        spatialProcessing='20px symmetric edge-color repair per drawing; no temporal synthesis' if s['tile'] else '12px cell-edge alpha feather, common crop, fit without upscaling, transparent padding'))
    t=frames[0].copy();t.thumbnail((210,120));thumbs.append((s['id'],t))
    if s['tile']:
        panel=Image.new('RGB',(768,384))
        for y in range(2):
            for x in range(3):panel.paste(frames[0].resize((256,192)).convert('RGB'),(x*256,y*192))
        panel.save(ROOT/'evidence'/f"{s['id']}-tile-repeat.jpg",quality=90)

# Visible-water masks from color ranges in the supplied composite; review masks, not game walkmasks.
proof=Image.open(ROOT/'proof-composite.jpg').convert('RGB')
a=np.asarray(proof).astype(float); yy,xx=np.indices(a.shape[:2]);r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
river=(yy>proof.height*.56)&(b>r*1.08)&(b>g*1.24)&(r<115)
lava=(xx<proof.width*.26)&(yy>proof.height*.18)&(yy<proof.height*.66)&(r>115)&(r>g*1.8)&(g>b*1.1)
# Confine warm pixels to the lava channel, excluding red maple canopies.
channel=np.zeros(lava.shape,dtype=bool)
path=[(300,505),(260,590),(140,665),(75,740),(170,810),(140,875),(100,930),(180,995),(330,1055),(470,1120)]
for (x0,y0),(x1,y1) in zip(path,path[1:]):
    px=xx*2500/proof.width;py=yy*1759/proof.height
    u=np.clip(((px-x0)*(x1-x0)+(py-y0)*(y1-y0))/((x1-x0)**2+(y1-y0)**2),0,1)
    channel|=(px-x0-u*(x1-x0))**2+(py-y0-u*(y1-y0))**2<65**2
lava &= channel
for id,mask in [('river',river),('lava',lava)]:
    rgba=np.zeros((*mask.shape,4),dtype=np.uint8);rgba[:,:,:3]=255;rgba[:,:,3]=mask*255
    Image.fromarray(rgba).save(ROOT/f'{id}-mask.png')

write('fx-manifest.json',dict(schemaVersion=1,coordinateSpace=[2500,1759],sourceReferenceSize=[2500,1758],note='bottom extra pixel is empty; placements are suggestions, masks derived from visible colors, not final occlusion geometry',assets=manifest))
write('loop-review.json',dict(metric='mean absolute difference of premultiplied sRGB+alpha over union of alpha > 0.015, range 0..1; checked from final exported lossless sheets by verify.py',
                             note='pingpong reverses drawn frames, no interpolated or shifted frames. Numerical continuity does not prove motion quality.',assets=reviews))
contact=Image.new('RGB',(1000,150*5),'#27232e');d=ImageDraw.Draw(contact)
for i,(id,t) in enumerate(thumbs):
    x=(i%5)*200;y=(i//5)*150;d.text((x+6,y+5),id,fill='white');contact.paste(t.convert('RGB') if t.mode!='RGBA' else Image.new('RGB',t.size,'#372d40'),(x,y+25))
    if t.mode=='RGBA':contact.paste(t,(x,y+25),t)
contact.save(ROOT/'frame-strip.jpg',quality=90)
print(json.dumps(dict(assets=len(manifest),loopCriteriaMet=sum(r['loopCriterionMet'] for r in reviews),pingpong=[r['id'] for r in reviews if r['loop']=='pingpong']),indent=2))
