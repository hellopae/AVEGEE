"""Technical extraction of new map poses; no artwork repaint or body deformation."""
from pathlib import Path
from PIL import Image
import json,hashlib,statistics

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
DIRECTIONS=['down','left','right','up']
SOURCES={'idle':'idle-generated.png','walk':'walk-generated-v2.png'}
W,H=320,480
raw={}; max_height=0; max_width=0
def grid_cuts(image,count,axis):
    mask=image.getchannel('A').point(lambda a:255 if a>60 else 0)
    length=image.width if axis=='x' else image.height
    step=length/count;cuts=[0]
    for n in range(1,count):
        target=round(n*step)
        candidates=[]
        for p in range(max(cuts[-1]+1,round(target-step*.30)),min(length,round(target+step*.30))):
            band=mask.crop((p,0,p+1,image.height) if axis=='x' else (0,p,image.width,p+1))
            if band.getbbox() is None:candidates.append(p)
        assert candidates,('No clear gutter',axis,n)
        cuts.append(min(candidates,key=lambda p:abs(p-target)))
    return cuts+[length]
for mode,columns in [('idle',4),('walk',8)]:
    source=Image.open(HERE/SOURCES[mode]).convert('RGBA')
    assert source.getextrema()[3][0]==0,'Expected genuine transparency'
    ycuts=grid_cuts(source,4,'y')
    rows=[]
    for row,direction in enumerate(DIRECTIONS):
        rowimage=source.crop((0,ycuts[row],source.width,ycuts[row+1]))
        xcuts=grid_cuts(rowimage,columns,'x')
        cells=[]
        for col in range(columns):
            cell=rowimage.crop((xcuts[col],0,xcuts[col+1],rowimage.height))
            bounds=cell.getchannel('A').point(lambda a:255 if a>60 else 0).getbbox()
            assert bounds,(mode,direction,col,'missing pose')
            # Cuts were selected on fully transparent scanlines, not guessed cell edges.
            pose=cell.crop(bounds)
            cells.append(pose)
            max_height=max(max_height,pose.height)
            max_width=max(max_width,pose.width)
        rows.append(cells)
    raw[mode]=rows
# A single fixed isotropic scale per generated sheet. Never resize individual poses independently.
metadata={'generator':'built-in ImageGen; technical extraction with Pillow','frame_size':{'w':W,'h':H},'anchor':{'x':160,'y':440},'directions':DIRECTIONS,'native_spa_verified':False,'modes':{}}
for mode,rows in raw.items():
    cols=len(rows[0])
    scale=min(320/max(p.height for row in rows for p in row),250/max(p.width for row in rows for p in row))
    atlas=Image.new('RGBA',(cols*W,4*H));facts={}
    previews=[]
    for row,(direction,poses) in enumerate(zip(DIRECTIONS,rows)):
        frames=[];entries=[]
        for col,pose in enumerate(poses):
            # Use crown center as horizontal root; moving feet must not shift the whole frame.
            top=pose.crop((0,0,pose.width,max(1,round(pose.height*.24))))
            crown=top.getchannel('A').point(lambda a:255 if a>120 else 0).getbbox()
            assert crown
            rootx=(crown[0]+crown[2])/2
            resized=pose.resize((round(pose.width*scale),round(pose.height*scale)),Image.Resampling.LANCZOS)
            x=round(160-rootx*scale);y=440-resized.height
            assert x>=0 and y>=0 and x+resized.width<=W,(mode,direction,col,x,resized.size)
            frame=Image.new('RGBA',(W,H));frame.alpha_composite(resized,(x,y))
            frame.save(HERE/f'{mode}-{direction}-{col:02}.png')
            atlas.alpha_composite(frame,(col*W,row*H))
            bg=Image.new('RGBA',(W,H),'#191e2c');bg.alpha_composite(frame)
            frames.append(bg.convert('RGB'))
            entries.append({'x':col*W,'y':row*H,'w':W,'h':H,'root':{'x':160,'y':440},'art_size':list(resized.size)})
        facts[direction]=entries
        durations=([1000,320,100,480] if mode=='idle' else [100]*8)
        frames[0].save(HERE/f'{mode}-{direction}.gif',save_all=True,append_images=frames[1:],duration=durations,loop=0)
        previews.append(frames)
    atlas.save(HERE/f'{mode}-sheet.png')
    contact=Image.new('RGB',(cols*160,4*240),'#191e2c')
    for r,frames in enumerate(previews):
        for c,f in enumerate(frames):contact.paste(f.resize((160,240),Image.Resampling.LANCZOS),(c*160,r*240))
    contact.save(HERE/f'{mode}-contact.jpg')
    metadata['modes'][mode]={'sheet':f'{mode}-sheet.png','columns':cols,'scale_uniform':scale,'durations_ms':durations,'frames':facts,'source_file':SOURCES[mode],'source_sha256':hashlib.sha256((HERE/SOURCES[mode]).read_bytes()).hexdigest()}
# Original walking sheet only copied into pilot for honest comparison.
original=json.loads((HERE/'original-walk-metadata.json').read_text())
Image.open(ROOT/original['src']).save(HERE/'original-walk.png')
(HERE/'metadata.json').write_text(json.dumps(metadata,indent=2))
print(json.dumps({'idle_frames':16,'walk_frames':32,'directions':DIRECTIONS,'fixed_isotropic_scales':{m:d['scale_uniform'] for m,d in metadata['modes'].items()}},indent=2))
