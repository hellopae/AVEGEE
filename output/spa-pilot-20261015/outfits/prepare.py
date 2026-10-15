"""Extract ImageGen art into atlases, without painting or deforming poses.

Run from repository root with the pilot's Python. All output remains in this pilot.
"""
from pathlib import Path
from PIL import Image
import json, hashlib, statistics

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
DIRS = ['down', 'left', 'right', 'up']
TIMING = {'book-idle': [1000,320,100,480], 'book-walk': [100]*8,
          'sword-idle': [1000,240,420,100,100,260], 'sword-attack': [85,80,60,35,40,80,100,100]}

def cuts(im, count, axis):
    mask = im.getchannel('A').point(lambda a: 255 if a > 60 else 0)
    length = im.width if axis == 'x' else im.height
    step = length/count
    result = [0]
    for n in range(1,count):
        target = round(n*step)
        candidates = []
        for p in range(round(target-step*.30), round(target+step*.30)):
            band = mask.crop((p,0,p+1,im.height) if axis == 'x' else (0,p,im.width,p+1))
            if band.getbbox() is None: candidates.append(p)
        assert candidates, ('Missing transparent gutter',axis,n)
        result.append(min(candidates,key=lambda p:abs(p-target)))
    return result+[length]

def extract(path, columns, rows):
    im = Image.open(path).convert('RGBA')
    assert im.getextrema()[3][0] == 0
    yy = cuts(im,rows,'y')
    poses=[]
    for r in range(rows):
        row=im.crop((0,yy[r],im.width,yy[r+1]));xx=cuts(row,columns,'x')
        poses.append([])
        for c in range(columns):
            cell=row.crop((xx[c],0,xx[c+1],row.height))
            bounds=cell.getchannel('A').point(lambda a:255 if a>60 else 0).getbbox()
            assert bounds
            poses[r].append(cell.crop(bounds))
    return poses

def preview(frames,path,durations):
    rgb=[]
    for f in frames:
        bg=Image.new('RGBA',f.size,'#191e2c');bg.alpha_composite(f);rgb.append(bg.convert('RGB'))
    rgb[0].save(path,save_all=True,append_images=rgb[1:],duration=durations,loop=0)

facts={}
for zone in ['asia','west','cyberhell']:
    folder=HERE/zone
    modes={}
    for mode,cols,rows in [('book-idle',4,4),('book-walk',8,4),('sword-idle',3,2)]:
        source=folder/f'{mode}-generated.png'
        if not source.exists(): continue
        poses=extract(source,cols,rows)
        sword=mode.startswith('sword')
        if sword: poses=[[p for row in poses for p in row]];cols=6;rows=1
        fw,fh=(640,640) if sword else (320,480)
        anchor=(240,570) if sword else (160,440)
        targetheight=420 if sword else 320
        scale=min(targetheight/max(p.height for row in poses for p in row),
                  (440 if sword else 250)/max(p.width for row in poses for p in row))
        atlas=Image.new('RGBA',(fw*cols,fh*rows));rects={};allframes=[]
        for r,row in enumerate(poses):
            frames=[];entries=[]
            # Stable head height preserves forward/rear depth of the feet.
            top=anchor[1]-round(statistics.median(p.height for p in row)*scale)
            for c,p in enumerate(row):
                # For book poses the whole upper headwear is an invariant anchor.
                # Sword poses use the planted feet; blade length does not affect root.
                upper=p.crop((0,0,p.width,max(1,round(p.height*.30))))
                b=upper.getchannel('A').point(lambda a:255 if a>100 else 0).getbbox()
                if sword:
                    foot=p.crop((0,round(p.height*.88),p.width,p.height))
                    b=foot.getchannel('A').point(lambda a:255 if a>100 else 0).getbbox()
                root=(b[0]+b[2])/2
                resized=p.resize((round(p.width*scale),round(p.height*scale)),Image.Resampling.LANCZOS)
                x=round(anchor[0]-root*scale)
                y=anchor[1]-resized.height if sword else top
                assert min(x,y)>=0 and x+resized.width<=fw and y+resized.height<=fh,(zone,mode,r,c,x,y,resized.size)
                frame=Image.new('RGBA',(fw,fh));frame.alpha_composite(resized,(x,y))
                name=DIRS[r] if not sword else 'right'
                frame.save(folder/f'{mode}-{name}-{c:02}.png')
                atlas.alpha_composite(frame,(c*fw,r*fh));frames.append(frame);allframes.append(frame)
                entries.append({'x':c*fw,'y':r*fh,'w':fw,'h':fh})
            rects[name]=entries
            preview(frames,folder/f'{mode}-{name}.gif',TIMING[mode])
        atlas.save(folder/f'{mode}-sheet.png')
        contact=Image.new('RGBA',(cols*(160 if not sword else 240),rows*(240 if not sword else 240)),'#191e2c')
        for i,f in enumerate(allframes):
            size=(160,240) if not sword else (240,240)
            contact.alpha_composite(f.resize(size,Image.Resampling.LANCZOS),((i%cols)*size[0],(i//cols)*size[1]))
        contact.convert('RGB').save(folder/f'{mode}-contact.jpg')
        modes[mode]={'sheet':f'{zone}/{mode}-sheet.png','columns':cols,'rows':rows,'frameWidth':fw,'frameHeight':fh,
                     'anchor':list(anchor),'durations':TIMING[mode],'directions':DIRS if not sword else ['right'],
                     'frames':rects,'isotropic_scale':scale,'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
                     'provenance':'ImageGen costume variants, technical crop/pack only'}
    attacksource=REPO/f'img/yama-sword-v4/hero-yama-{zone}-sword.webp'
    attack=Image.open(attacksource).convert('RGBA');assert attack.size==(5120,640)
    attack.save(folder/'sword-attack-sheet.png')
    preview([attack.crop((i*640,0,(i+1)*640,640)) for i in range(8)],folder/'sword-attack-right.gif',TIMING['sword-attack'])
    modes['sword-attack']={'sheet':f'{zone}/sword-attack-sheet.png','columns':8,'rows':1,'frameWidth':640,'frameHeight':640,
                         'anchor':[240,570],'durations':TIMING['sword-attack'],'directions':['right'],
                         'frames':{'right':[{'x':i*640,'y':0,'w':640,'h':640} for i in range(8)]},
                         'provenance':str(attacksource.relative_to(REPO))+' (existing approved art, unchanged pixels)'}
    (folder/'metadata.json').write_text(json.dumps({'zone':zone,'modes':modes},indent=2))
    facts[zone]={m:v['columns']*v['rows'] for m,v in modes.items()}
(HERE/'verification.json').write_text(json.dumps(facts,indent=2))
print(json.dumps(facts,indent=2))
