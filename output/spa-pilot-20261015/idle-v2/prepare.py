"""Technical sprite packing only: preserve generated poses, uniform scale, foot alignment."""
from pathlib import Path
from PIL import Image, ImageDraw
import json, hashlib

HERE=Path(__file__).resolve().parent
im=Image.open(HERE/'generated-sheet.png').convert('RGBA')
assert im.getextrema()[3][0]==0,'Expected transparent generated artwork'
cw,ch=im.width//3,im.height//2
poses=[]
for i in range(6):
    cell=im.crop(((i%3)*cw,(i//3)*ch,(i%3+1)*cw,(i//3+1)*ch))
    bounds=cell.getchannel('A').point(lambda a:255 if a>40 else 0).getbbox()
    assert bounds, i
    poses.append(cell.crop(bounds))
# One common scale, never squash/stretch individual poses.
scale=min(355/max(p.height for p in poses),480/max(p.width for p in poses))
atlas=Image.new('RGBA',(640*6,640))
frames=[];facts=[]
for i,pose in enumerate(poses):
    pose=pose.resize((round(pose.width*scale),round(pose.height*scale)),Image.Resampling.LANCZOS)
    # Find the two planted red feet near the bottom, ignoring weapon/robe edges.
    feet=[]
    for y in range(round(pose.height*.88),pose.height):
        for x in range(pose.width):
            r,g,b,a=pose.getpixel((x,y))
            if a>120 and r>g*1.25 and r>b*1.15: feet.append((x,y))
    assert feet,('No red feet detected',i)
    fx=(min(x for x,y in feet)+max(x for x,y in feet))/2
    fy=max(y for x,y in feet)+1
    x,y=round(240-fx),round(570-fy)
    assert x>=0 and y>=0 and x+pose.width<=640 and y+pose.height<=640,(i,x,y,pose.size)
    frame=Image.new('RGBA',(640,640));frame.alpha_composite(pose,(x,y))
    frame.save(HERE/f'idle-{i:02}.png');frames.append(frame)
    atlas.alpha_composite(frame,(i*640,0))
    facts.append({'frame':i,'size':list(pose.size),'placement':[x,y],'feet':[fx,fy]})
atlas.save(HERE/'idle-sheet.png')
durations=[1000,240,420,100,100,260]
bgframes=[]
for f in frames:
    bg=Image.new('RGBA',(640,640),'#191e2c');bg.alpha_composite(f)
    bgframes.append(bg.convert('RGB').resize((400,400),Image.Resampling.LANCZOS))
bgframes[0].save(HERE/'idle-preview.gif',save_all=True,append_images=bgframes[1:],duration=durations,loop=0)
contact=Image.new('RGB',(1200,800),'#191e2c')
for i,f in enumerate(bgframes):contact.paste(f,((i%3)*400,(i//3)*400))
contact.save(HERE/'contact.jpg')
(HERE/'metadata.json').write_text(json.dumps({'generator':'Built-in ImageGen; technical packing with Pillow','source_sha256':hashlib.sha256((HERE/'generated-sheet.png').read_bytes()).hexdigest(),'scale_uniform_all_frames':scale,'frame_size':640,'durations_ms':durations,'anchor':{'x':240,'y':570},'frames':facts},indent=2))
print(json.dumps(facts,indent=2))
