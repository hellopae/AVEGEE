"""Replace only front/back rows; side walking and idle assets remain byte-for-byte intact."""
from pathlib import Path
from PIL import Image
import json,hashlib

HERE=Path(__file__).resolve().parent
PILOT=HERE.parent
source=Image.open(HERE/'generated.png').convert('RGBA')
assert source.getextrema()[3][0]==0
def cuts(im,count,axis):
    mask=im.getchannel('A').point(lambda a:255 if a>60 else 0)
    length=im.width if axis=='x' else im.height
    step=length/count;result=[0]
    for i in range(1,count):
        target=round(i*step);clear=[]
        for p in range(max(result[-1]+1,round(target-step*.35)),min(length,round(target+step*.35))):
            band=mask.crop((p,0,p+1,im.height) if axis=='x' else (0,p,im.width,p+1))
            if not band.getbbox():clear.append(p)
        assert clear,('No transparent cut',axis,i)
        result.append(min(clear,key=lambda p:abs(p-target)))
    return result+[length]
ys=cuts(source,2,'y');poses={}
for row,direction in enumerate(['down','up']):
    strip=source.crop((0,ys[row],source.width,ys[row+1]));xs=cuts(strip,8,'x');poses[direction]=[]
    for i in range(8):
        cell=strip.crop((xs[i],0,xs[i+1],strip.height))
        box=cell.getchannel('A').point(lambda a:255 if a>60 else 0).getbbox()
        assert box,(direction,i)
        poses[direction].append(cell.crop(box))
# Order the rear poses by observed stance: far-right foot/left trailing → passing
# → right trailing/left far → passing. Keep every authored pose exactly once.
order={'down':list(range(8)),'up':[1,4,2,0,3,5,6,7]}
for direction in poses:poses[direction]=[poses[direction][i] for i in order[direction]]
scale=min(320/max(f.height for row in poses.values() for f in row),250/max(f.width for row in poses.values() for f in row))
atlas=Image.open(HERE/'walk-sheet-before.png').convert('RGBA')
metadata=json.loads((HERE/'metadata-before.json').read_text())
facts={};timings=[100]*8
for direction,row in [('down',0),('up',3)]:
    frames=[];entries=[]
    for i,pose in enumerate(poses[direction]):
        head=pose.crop((0,0,pose.width,round(pose.height*.24)))
        crown=head.getchannel('A').point(lambda a:255 if a>120 else 0).getbbox()
        rootx=(crown[0]+crown[2])/2
        art=pose.resize((round(pose.width*scale),round(pose.height*scale)),Image.Resampling.LANCZOS)
        # Do not pin the lowest visible toe to y=440 every frame: that erased
        # the fore/aft foot-depth change and moved the whole torso on passing poses.
        # Keep crown/hips stable; permit each drawn foot to travel in depth.
        x=round(160-rootx*scale);y=120+[0,2,-2,-1,0,2,-2,-1][i]
        assert x>=0 and y>=0 and x+art.width<=320
        frame=Image.new('RGBA',(320,480));frame.alpha_composite(art,(x,y))
        frame.save(PILOT/f'walk-{direction}-{i:02}.png')
        # paste replaces the prior alpha as well as RGB; alpha_composite would leave ghosts.
        atlas.paste(frame,(i*320,row*480))
        frames.append(frame)
        entries.append({'x':i*320,'y':row*480,'w':320,'h':480,'root':{'x':160,'y':440},'art_size':list(art.size),'crown_top_y':y,'source_pose':order[direction][i]})
    metadata['modes']['walk']['frames'][direction]=entries
    facts[direction]=entries
    rgb=[]
    for frame in frames:
        bg=Image.new('RGBA',frame.size,'#191e2c');bg.alpha_composite(frame);rgb.append(bg.convert('RGB'))
    rgb[0].save(PILOT/f'walk-{direction}.gif',save_all=True,append_images=rgb[1:],duration=timings,loop=0)
    contact=Image.new('RGB',(8*240,360),'#191e2c')
    for i,f in enumerate(rgb):contact.paste(f.resize((240,360),Image.Resampling.LANCZOS),(i*240,0))
    contact.save(HERE/f'{direction}-contact.jpg')
atlas.save(PILOT/'walk-sheet.png')
metadata['modes']['walk']['front_back_revision']={'source':'front-back-v3/generated.png','sha256':hashlib.sha256((HERE/'generated.png').read_bytes()).hexdigest(),'scale_uniform_both_directions':scale,'directions':['down','up'],'frame_order_from_source_zero_based':order,'side_rows_unchanged':True}
(PILOT/'metadata.json').write_text(json.dumps(metadata,indent=2))
contact=Image.new('RGB',(1280,960),'#191e2c')
for row in range(4):
    for col in range(8):
        frame=atlas.crop((col*320,row*480,(col+1)*320,(row+1)*480))
        bg=Image.new('RGBA',frame.size,'#191e2c');bg.alpha_composite(frame)
        contact.paste(bg.convert('RGB').resize((160,240),Image.Resampling.LANCZOS),(col*160,row*240))
contact.save(PILOT/'walk-contact.jpg')
before=Image.open(HERE/'walk-sheet-before.png').convert('RGBA')
for row in [1,2]:assert before.crop((0,row*480,2560,(row+1)*480)).tobytes()==atlas.crop((0,row*480,2560,(row+1)*480)).tobytes()
protected=json.loads((HERE/'protected-hashes.json').read_text())
for name,digest in protected.items():assert hashlib.sha256((PILOT/name).read_bytes()).hexdigest()==digest,name
assert atlas.getextrema()[3][0]==0
(HERE/'verification.json').write_text(json.dumps({'new_frames':16,'front_back_uniform_scale':scale,'left_right_atlas_pixels_identical':True,'protected_files_byte_identical':True,'alpha_preserved':True},indent=2))
print('PASS: only front/back 16 frames replaced; left/right and idle unchanged; alpha preserved.')
