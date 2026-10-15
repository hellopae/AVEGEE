"""Technical alignment/packing of four newly drawn passing poses."""
from pathlib import Path
from PIL import Image
import json,hashlib
HERE=Path(__file__).resolve().parent;PILOT=HERE.parent
TARGETS=[('down',2),('down',6),('up',2),('up',6)]
def crown_box(im):
    bounds=im.getchannel('A').point(lambda a:255 if a>80 else 0).getbbox();assert bounds
    mask=Image.new('L',im.size);pixels=mask.load()
    for y in range(bounds[1],bounds[1]+round((bounds[3]-bounds[1])*.32)):
        for x in range(bounds[0],bounds[2]):
            r,g,b,a=im.getpixel((x,y))
            if a>100 and g>80 and g>r*.45 and b<g*.8:pixels[x,y]=255
    box=mask.getbbox();assert box
    return box
atlas=Image.open(HERE/'walk-sheet-before.png').convert('RGBA')
meta=json.loads((HERE/'metadata-before.json').read_text());facts=[]
for direction,i in TARGETS:
    source=Image.open(HERE/f'generated-{direction}-{i:02}.png').convert('RGBA')
    target=Image.open(HERE/f'before-walk-{direction}-{i:02}.png').convert('RGBA')
    assert source.getextrema()[3][0]==0
    sb,tb=crown_box(source),crown_box(target)
    # Front edits have a slightly different crown aspect. Match crown height
    # to preserve torso/leg length; rear edits match the original crown width.
    scale=((tb[3]-tb[1])/(sb[3]-sb[1]) if direction=='down' else (tb[2]-tb[0])/(sb[2]-sb[0]))
    bounds=source.getchannel('A').point(lambda a:255 if a>40 else 0).getbbox()
    art=source.crop(bounds).resize((round((bounds[2]-bounds[0])*scale),round((bounds[3]-bounds[1])*scale)),Image.Resampling.LANCZOS)
    x=round((tb[0]+tb[2])/2-((sb[0]+sb[2])/2-bounds[0])*scale)
    y=round(tb[1]-(sb[1]-bounds[1])*scale)
    assert x>=0 and y>=0 and x+art.width<=320 and y+art.height<=480,(direction,i,x,y,art.size)
    frame=Image.new('RGBA',(320,480));frame.alpha_composite(art,(x,y))
    frame.save(PILOT/f'walk-{direction}-{i:02}.png')
    row=['down','left','right','up'].index(direction);atlas.paste(frame,(i*320,row*480))
    meta['modes']['walk']['frames'][direction][i].update({'source_lift_revision':f'lift-v4/generated-{direction}-{i:02}.png','uniform_scale_to_existing_crown':scale,'art_size':list(art.size)})
    facts.append({'direction':direction,'frame':i+1,'target_crown':tb,'uniform_scale':scale,'placement':[x,y],'source_sha256':hashlib.sha256((HERE/f'generated-{direction}-{i:02}.png').read_bytes()).hexdigest()})
atlas.save(PILOT/'walk-sheet.png')
for direction in ['down','up']:
    frames=[]
    for i in range(8):
        im=Image.open(PILOT/f'walk-{direction}-{i:02}.png').convert('RGBA')
        bg=Image.new('RGBA',im.size,'#191e2c');bg.alpha_composite(im);frames.append(bg.convert('RGB'))
    frames[0].save(PILOT/f'walk-{direction}.gif',save_all=True,append_images=frames[1:],duration=[100]*8,loop=0)
meta['modes']['walk']['lift_revision']={'version':'v4','frames':facts,'protected_frames_unchanged':True}
(PILOT/'metadata.json').write_text(json.dumps(meta,indent=2))
contact=Image.new('RGB',(1280,960),'#191e2c')
for row in range(4):
    for col in range(8):
        im=atlas.crop((col*320,row*480,(col+1)*320,(row+1)*480))
        bg=Image.new('RGBA',im.size,'#191e2c');bg.alpha_composite(im)
        contact.paste(bg.convert('RGB').resize((160,240),Image.Resampling.LANCZOS),(col*160,row*240))
contact.save(PILOT/'walk-contact.jpg')
proof=Image.new('RGB',(1280,960),'#191e2c')
for j,(direction,i) in enumerate(TARGETS):
    for k,name in enumerate([HERE/f'before-walk-{direction}-{i:02}.png',PILOT/f'walk-{direction}-{i:02}.png']):
        im=Image.open(name).convert('RGBA');bg=Image.new('RGBA',im.size,'#191e2c');bg.alpha_composite(im)
        proof.paste(bg.convert('RGB'),(j*320,k*480))
proof.save(HERE/'before-after.jpg')
protected=json.loads((HERE/'protected-hashes.json').read_text())
for name,digest in protected.items():assert hashlib.sha256((PILOT/name).read_bytes()).hexdigest()==digest,name
before=Image.open(HERE/'walk-sheet-before.png').convert('RGBA')
for row,d in enumerate(['down','left','right','up']):
    for i in range(8):
        if (d,i) in TARGETS:continue
        box=(i*320,row*480,(i+1)*320,(row+1)*480)
        assert before.crop(box).tobytes()==atlas.crop(box).tobytes(),(d,i)
(HERE/'verification.json').write_text(json.dumps({'replaced_frames':4,'other_walk_frames_pixel_identical':28,'protected_file_count':len(protected),'protected_file_hashes_match':True,'alpha_preserved':True,'alignment':'isotropic scale to existing crown, no deformation'},indent=2))
print('PASS: only front/back frames3&7 changed; other28 walk frames and all idle frames untouched.')
