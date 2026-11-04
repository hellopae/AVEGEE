"""Reproducible asset slicing/compositing; never paints or modifies the source terrain."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageChops
import hashlib, json, shutil, math, html, sys

OUT = Path(__file__).resolve().parents[1]
layout_only='--layout-only' in sys.argv
SOURCE = Path('/Users/agapae/Documents/Work PAE/Claude/AVEGEE/layered-map-work/docs/art-reviews/2026-11-05-zone2-terrain')
KIT = SOURCE.parent / '2026-11-04-zone1-modular/world-kit/assets'
def write(name, value):
    (OUT/name).write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n')
def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
def copy(rel):
    dest=OUT/rel; dest.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(SOURCE/rel,dest)
    return {'file':rel,'source':str(SOURCE/rel),'sha256':sha(dest),'equal':sha(dest)==sha(SOURCE/rel)}

manifest=json.loads((SOURCE/'manifest.json').read_text())
needed={'terrain-atlas.png','fluid-master.png','terrain-alpha-preview.png'}
for t in manifest['tiles']: needed.update([t['png'],t['src']])
for f in manifest['liquids']:
    needed.add(f['png']);needed.update(x['src'] for x in f['frames'])
hashes=json.loads((OUT/'source-hashes.json').read_text()) if layout_only else [copy(x) for x in sorted(needed)]
write('source-hashes.json',hashes)
(OUT/'objects').mkdir(exist_ok=True)
catalog=json.loads((OUT/'object-catalog.json').read_text())['assets'] if layout_only else []
if layout_only:
    current=json.loads((OUT/'manifest.json').read_text())
    manifest['sky']=current['sky'];manifest['mountains']=current['mountains']
    manifest['mountains']['rect']=[0,0,2304,500]
prompts=json.loads((OUT/'generation-prompts.json').read_text())
feet={'tea':[.50,.96],'sala':[.45,.96],'tarang':[.43,.94],
      'krajok':[.47,.96],'sawan':[.50,.96],'judgment':[.45,.96],
      'gate-entry':[.50,.95],'gate-exit':[.50,.95],
      'dock-canopy':[.50,.93]}
labels={'tea':'ศาลาน้ำชา','sala':'หอทะเบียนกรรม','tarang':'ตะราง',
        'krajok':'กระจกส่องกรรม','sawan':'ประตูสวรรค์','krata':'กระทะทองแดง',
        'ngiw':'ต้นงิ้ว','dab':'ป่าดาบอสิปัตตะ','lokan':'โลกันตนรก',
        'lan':'แท่นลงทัณฑ์ lan','canteen':'โรงอาหาร','judgment':'แท่นตัดสิน',
        'gate-entry':'ประตูเข้า 1–2','gate-exit':'ประตูออก 2–3',
        'house-front-one':'บ้านพัก 1','house-right-one':'บ้านพัก 2',
        'house-left-two':'บ้านพัก 3','house-right-two':'บ้านพัก 4',
        'tree-red':'เมเปิลแดง','tree-green':'สนเอเชีย','tree-white':'สนหิมะ',
        'lamp':'เสาไฟ','rail-front':'ราวสะพานหน้า','rail-back':'ราวสะพานหลัง',
        'post-front':'เสาสะพานหน้า','post-back':'เสาสะพานหลัง','dock-canopy':'หลังคาท่าเรือ'}

def sprite(im, sid, provenance, source_rect=None):
    # Crop transparent gutters only. Preserve all existing RGBA values and antialiasing.
    # A threshold finds the silhouette bbox; +8px keeps soft edges/contact shadows.
    a=im.getchannel('A');box=a.point(lambda x:255 if x>24 else 0).getbbox()
    if not box:raise ValueError(sid+' has no visible pixels')
    box=(max(0,box[0]-8),max(0,box[1]-8),min(im.width,box[2]+8),min(im.height,box[3]+8))
    im=im.crop(box)
    im.thumbnail((720,720),Image.Resampling.LANCZOS)
    # PNG is the editable RGBA original cut; smaller lossless WebP is for the streamed preview.
    im.save(OUT/'objects'/f'{sid}.png',optimize=True)
    small=im.copy();small.thumbnail((320,320),Image.Resampling.LANCZOS)
    small.save(OUT/'objects'/f'{sid}.webp',lossless=True,method=6)
    fp=feet.get(sid,[.5,.96]);fp=[round(fp[0]*im.width,2),round(fp[1]*im.height,2)]
    catalog.append({'id':sid,'label':labels.get(sid,sid),'sprite':f'objects/{sid}.png',
                    'preview':f'objects/{sid}.webp','size':list(im.size),'foot':fp,
                    'provenance':provenance,'sourceRect':source_rect,'trim':list(box),
                    'visualReview':'inspected; owner approval pending'})

for rec in ([] if layout_only else prompts['calls']):
    im=Image.open(rec['original']).convert('RGBA')
    if rec['id']=='sky':
        im.save(OUT/'layers/sky.png',optimize=True)
        im.thumbnail((896,600));im.save(OUT/'layers/sky-preview.webp',lossless=True,method=6)
        manifest['sky']={'png':'layers/sky.png','src':'layers/sky-preview.webp',
                         'size':list(im.size),'rect':[0,0,2304,1536],'generation':rec['n']}
        continue
    if rec['id']=='mountains':
        im.save(OUT/'layers/mountains.png',optimize=True)
        im.thumbnail((1024,400));im.save(OUT/'layers/mountains-preview.webp',lossless=True,method=6)
        manifest['mountains']={'png':'layers/mountains.png','src':'layers/mountains-preview.webp',
                              'size':list(im.size),'rect':[0,0,2304,500],'generation':rec['n']}
        continue
    cols,rows=rec.get('grid',[1,1]);ids=rec.get('cells',[rec['id']])
    for i,sid in enumerate(ids):
        x=i%cols;y=i//cols
        rect=[round(x*im.width/cols),round(y*im.height/rows),round((x+1)*im.width/cols),round((y+1)*im.height/rows)]
        # The left gateway extends slightly past the mathematical half; split at the empty gutter.
        if rec['id']=='gates':
            split=round(im.width*.535)
            rect=[0,0,split,im.height] if i==0 else [split,0,im.width,im.height]
        sprite(im.crop(rect),sid,{'kind':'built-in ImageGen','call':rec['n']},rect)

reuse={'tree-red':'volcanic-tree','tree-green':'forest-pine','tree-white':'ice-pine',
       'shrub-green':'forest-shrub','shrub-red':'volcanic-shrub','shrub-white':'ice-shrub',
       'rock-green':'forest-boulder','rock-red':'volcanic-boulder','rock-white':'ice-boulder'}
for sid,source_id in ([] if layout_only else reuse.items()):
    src=KIT/(source_id+'.png')
    sprite(Image.open(src).convert('RGBA'),sid,{'kind':'reused approved zone1 kit','source':str(src),'sha256':sha(src)})
write('object-catalog.json',{'assets':catalog,'footUnits':'source PNG local pixels','alpha':'RGBA; gutters cropped, no painted pixel retouch'})
assets={a['id']:a for a in catalog}
objects=[]
def place(sid,x,y,w,category='scenery',layer='mid',oid=None,h=None,flip=False,note=None):
    a=assets[sid];sw,sh=a['size'];h=h or round(w*sh/sw,2)
    fx=a['foot'][0]/sw*w;fy=a['foot'][1]/sh*h
    if flip:fx=w-fx
    obj={'id':oid or sid,'sprite':a['sprite'],'preview':a['preview'],
         'x':round(x-fx,2),'y':round(y-fy,2),'w':w,'h':h,'flipX':flip,
         'foot':a['foot'],'anchor':[x,y],'layer':layer,'category':category}
    if note:obj['note']=note
    objects.append(obj)

for sid,x,y,w in [('krata',310,270,200),('dab',293,562,205),('ngiw',365,775,220),
                  ('tarang',1000,210,270),('sawan',1540,250,150),('lokan',2070,340,205),
                  ('lan',1980,555,215),('krajok',1970,710,205),
                  ('tea',900,825,165),('sala',1340,825,180),('canteen',735,837,142)]:
    place(sid,x,y,w,'station')
place('judgment',1080,575,255,'judgment')
for sid,x,y,w in [('house-front-one',870,555,135),('house-right-one',1300,550,145),
                  ('house-left-two',740,1440,175),('house-right-two',1530,1445,175)]:
    place(sid,x,y,w,'house')
# Page 1 shows only the south axis. Both gates stay on that existing axis.
# Their destination assignments are proposals, not newly invented map connections.
place('gate-entry',1110,1500,390,'gate',note='แนวใต้เดิม; ข้อเสนอทางเข้า 1–2 ยังไม่ใช่ border anchor ในเกม')
place('gate-exit',1110,1245,270,'gate',note='แนวใต้เดิม; หน้า 1 ไม่ระบุทางออก 2–3 แยก ต้องให้เจ้าของยืนยันปลายทาง')

red=[(95,230),(490,265),(95,445),(410,465),(105,588),(465,620),(180,720),(525,790),
     (245,855),(110,925),(480,905),(560,1010),(145,1340),(305,1440),(440,1360),(620,1510)]
green=[(740,220),(1200,205),(1300,235),(720,435),(1400,420),(750,610),(1435,610),
       (730,750),(1500,785),(830,920),(1220,925),(1510,925),(1820,680),(2200,890),
       (1780,940),(1900,1010),(1640,1360),(1830,1470),(2010,1345),(2190,1510),
       (480,1495),(865,1515),(1360,1500),(2250,1130)]
white=[(2210,300),(1940,290),(2230,515),(2100,180)]
for sid,points in [('tree-red',red),('tree-green',green),('tree-white',white)]:
    for i,(x,y) in enumerate(points):
        w=(165+i%3*17) if y<1100 else (205+i%3*18)
        if sid=='tree-white':w=120+i%2*12
        if sid=='tree-white' and y<220:w=80
        place(sid,x,y,w,'tree',oid=f'{sid}-{i+1:02}',flip=bool(i%2))

for sid,points in [('shrub-red',[(80,350),(490,560),(125,810),(430,965),(290,1200),(540,1415)]),
                   ('shrub-green',[(670,280),(1380,370),(775,680),(1480,700),(1590,880),(1790,900),(1680,1250),(2160,1400),(1350,1380)]),
                   ('shrub-white',[(2190,390),(1910,190),(2270,670)]),
                   ('rock-red',[(60,640),(575,950),(160,1470)]),
                   ('rock-green',[(690,1000),(1620,980),(2060,1430)]),
                   ('rock-white',[(2260,200),(2170,620)])]:
    for i,(x,y) in enumerate(points):place(sid,x,y,60 if 'shrub' in sid else 72,'shrub' if 'shrub' in sid else 'rock',oid=f'{sid}-{i+1:02}')

for i,(x,y) in enumerate([(850,250),(1160,250),(810,590),(1360,590),(1015,645),(1185,645),
                         (810,845),(1430,845),(1015,875),(1190,875),(1025,1180),(1210,1180),
                         (965,1280),(1250,1280),(2050,590),(1610,250)]):
    place('lamp',x,y,34,'lamp',oid=f'lamp-{i+1:02}')
for i,(x,y,w) in enumerate([(1810,278,178),(1510,557,172),(2090,792,180)]):
    place('rail-back',x,y-28,w,'bridge','back',oid=f'rail-back-{i+1}',h=49)
    place('rail-front',x,y,w,'bridge','front',oid=f'rail-front-{i+1}',h=49)
for i,(x,y) in enumerate([(1030,898),(1190,898),(1040,1110),(1180,1110),(1350,939),(1455,939)]):
    sid='post-back' if i%2==0 else 'post-front'
    place(sid,x,y,23,'bridge','back' if i%2==0 else 'front',oid=f'{sid}-{i+1}')
place('dock-canopy',1400,930,130,'dock')

# Only decorative proposals can move to the nearest original opaque land.
# No terrain pixels, station coordinates, bridges or interface axes are changed.
terrain_alpha=Image.open(OUT/'terrain-atlas.png').getchannel('A')
connections=json.loads((SOURCE/'connection-review.json').read_text())['connections']
paths=[{'id':c['connection'],'points':[[x*2304/1100,y*1536/733] for x,y in c['pointsInReference1100x733']]} for c in connections]
write('path-reservations.json',{'scope':'original path centerlines; decorative base clearance only, not collision/walkmask','paths':paths,'baseClearance':'24 + display width * 0.12 atlas pixels'})
def path_distance(point):
    distances=[]
    for path in paths:
        for a,b in zip(path['points'],path['points'][1:]):
            vx=b[0]-a[0];vy=b[1]-a[1]
            u=max(0,min(1,((point[0]-a[0])*vx+(point[1]-a[1])*vy)/(vx*vx+vy*vy)))
            distances.append(math.hypot(point[0]-a[0]-u*vx,point[1]-a[1]-u*vy))
    return min(distances)
adjustments=[]
def supported(x,y,r):
    return all(0<=x+dx<2304 and 0<=y+dy<1536 and terrain_alpha.getpixel((x+dx,y+dy))>=240
               for dx,dy in [(0,0),(-r,0),(r,0),(0,-8)])
for obj in objects:
    if obj['category'] not in ['tree','rock','shrub']:continue
    x,y=obj['anchor'];r=18 if obj['category']=='tree' else 8
    fx=x-obj['x'];fy=y-obj['y']
    def in_canvas(px,py):
        return 8<=px-fx and px-fx+obj['w']<=2296 and 8<=py-fy and py-fy+obj['h']<=1528
    def clear_path(px,py):return path_distance([px,py])>=24+obj['w']*.12
    if supported(x,y,r) and in_canvas(x,y) and clear_path(x,y):continue
    candidates=[]
    for dy in range(-180,181,4):
        for dx in range(-180,181,4):
            if in_canvas(x+dx,y+dy) and supported(x+dx,y+dy,r) and clear_path(x+dx,y+dy):candidates.append((dx*dx+dy*dy,dx,dy))
    if not candidates:raise ValueError('No original land near '+obj['id'])
    _,dx,dy=min(candidates)
    obj['x']=round(obj['x']+dx,2);obj['y']=round(obj['y']+dy,2)
    obj['anchor']=[x+dx,y+dy]
    adjustments.append({'id':obj['id'],'from':[x,y],'to':obj['anchor'],'reason':'original terrain alpha >= 240 at root support samples, inside atlas and clear of original path centerlines'})
write('placement-adjustments.json',adjustments)

layout={'world':[2304,1536],'status':'PROPOSAL — ให้คุณเป้ปรับ; ไม่ใช่ผังเกมหรือ border topology สุดท้าย',
        'coordinates':'x/y top-left in atlas pixels, w/h display size; foot local PNG pixels; anchor world contact point',
        'reference':'Map-Zone2-1.jpg / Map-Zone2-2.jpg / Map Zone2.ai page 1 only',
        'gateUncertainty':'หน้า 1 ระบุแนวใต้เพียงแนวเดียว ไม่พบจุดทางออก 2–3 แยก จึงวาง 2 ประตูบนแนวใต้เดิมเพื่อเสนอเท่านั้น ห้ามนำไปใช้เป็นทางเชื่อมจริงจนเจ้าของกำหนด',
        'objects':objects}
write('layout.json',layout)
manifest.pop('pack',None)
manifest['label']='AVEGEE · โซน 2 เมืองบูรพา — ผังเสนอ'
manifest['preview']='composite-preview.jpg';manifest['objects']='layout.json'
manifest['layerOrder']=['sky','mountains','river','lava','waterfall','terrain','objects-back','objects-mid','objects-front']
manifest['layers']=[{'id':key,**manifest[key]} for key in ['sky','mountains']]+[{'id':f['id'],'png':f['png'],'rect':f['rect']} for f in manifest['liquids']]+[
    {'id':'terrain','png':'terrain-atlas.png','rect':[0,0,2304,1536]},
    *[{'id':'objects-'+key,'layout':'layout.json','filterLayer':key} for key in ['back','mid','front']]]
write('manifest.json',manifest)

def layer(path,rect,canvas):
    im=Image.open(OUT/path).convert('RGBA');im=im.resize((int(rect[2]),int(rect[3])),Image.Resampling.LANCZOS)
    canvas.alpha_composite(im,(int(rect[0]),int(rect[1])))
def compose():
    canvas=Image.new('RGBA',(2304,1536),'#9d7b81')
    layer(manifest['sky']['png'],manifest['sky']['rect'],canvas)
    layer(manifest['mountains']['png'],manifest['mountains']['rect'],canvas)
    for f in manifest['liquids']:layer(f['png'],f['rect'],canvas)
    canvas.alpha_composite(Image.open(OUT/'terrain-atlas.png').convert('RGBA'))
    for obj in sorted(objects,key=lambda o:({'back':0,'mid':1,'front':2}[o['layer']],o['anchor'][1],o['id'])):
        im=Image.open(OUT/obj['sprite']).convert('RGBA')
        if obj['flipX']:im=ImageOps.mirror(im)
        im=im.resize((round(obj['w']),round(obj['h'])),Image.Resampling.LANCZOS)
        canvas.alpha_composite(im,(round(obj['x']),round(obj['y'])))
    return canvas
canvas=compose();canvas.convert('RGB').resize((1600,1067),Image.Resampling.LANCZOS).save(OUT/'composite-preview.jpg',quality=92)

# Editable Illustrator-compatible linked PNG groups; all terrain tiles retain original coordinates.
ns='http://www.w3.org/2000/svg';ink='http://www.inkscape.org/namespaces/inkscape'
svg=[f'<svg xmlns="{ns}" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:inkscape="{ink}" width="2304" height="1536" viewBox="0 0 2304 1536">',
     '<title>Zone 2 — proposed object layout, original seamless terrain</title>',
     '<desc>Linked RGBA PNGs. Keep folders beside this SVG. Gate destinations require owner confirmation.</desc>']
def image_tag(path,rect,extra=''):
    return f'<image x="{rect[0]}" y="{rect[1]}" width="{rect[2]}" height="{rect[3]}" xlink:href="{html.escape(path)}" preserveAspectRatio="none" {extra}/>'
for sid in ['sky','mountains']:
    s=manifest[sid];svg.append(f'<g id="{sid}">'+image_tag(s['png'],s['rect'])+'</g>')
for f in manifest['liquids']:svg.append(f'<g id="{f["id"]}">'+image_tag(f['png'],f['rect'])+'</g>')
svg.append('<g id="TerrainTiles">')
for t in manifest['tiles']:svg.append(image_tag(t['png'],t['rect']))
svg.append('</g>')
for z in ['back','mid','front']:
    svg.append(f'<g id="Objects-{z}">')
    for o in sorted([x for x in objects if x['layer']==z],key=lambda x:(x['anchor'][1],x['id'])):
        extra=f'transform="translate({2*o["x"]+o["w"]} 0) scale(-1 1)"' if o['flipX'] else ''
        svg.append(f'<g id="{o["id"]}"><title>{html.escape(o["id"])}</title>'+image_tag(o['sprite'],[o['x'],o['y'],o['w'],o['h']],extra)+'</g>')
    svg.append('</g>')
svg.append('</svg>');(OUT/'zone2-layered-layout.svg').write_text('\n'.join(svg))

font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',18)
cols=6;cw=250;ch=250;rows=math.ceil(len(catalog)/cols)
sheet=Image.new('RGB',(cols*cw,rows*ch),'#bdb3a5');d=ImageDraw.Draw(sheet)
for i,a in enumerate(catalog):
    im=Image.open(OUT/a['sprite']).convert('RGBA');im.thumbnail((230,205),Image.Resampling.LANCZOS)
    x=i%cols*cw;y=i//cols*ch;sheet.paste(im,(x+(cw-im.width)//2,y+205-im.height),im)
    d.text((x+12,y+218),a['id'],fill='#272326',font=font)
sheet.save(OUT/'kit-contact-sheet.jpg',quality=92)

ref=Image.open(OUT/'style-reference.jpg').convert('RGB')
comparison=Image.new('RGB',(1600,750),'#211e25');d=ImageDraw.Draw(comparison)
ref.thumbnail((800,680));comparison.paste(ref,((800-ref.width)//2,45))
pv=canvas.convert('RGB');pv.thumbnail((800,680));comparison.paste(pv,(800+(800-pv.width)//2,45))
d.text((20,12),'APPROVED ZONE 1 — style / lighting reference',font=font,fill='white')
d.text((820,12),'ZONE 2 — proposed composition / East Asian kit',font=font,fill='white')
d.text((20,710),'Hand-painted reference; new source terrain is locked. Owner style approval remains pending.',font=font,fill='white')
comparison.save(OUT/'style-compare.jpg',quality=92)
print(json.dumps({'assets':len(catalog),'placements':len(objects),'imagegenCalls':len(prompts['calls'])}))
