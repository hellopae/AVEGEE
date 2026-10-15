"""Assemble ImageGen's cleaned temple patches; preserve all other sprite pixels."""
from pathlib import Path
from PIL import Image,ImageFilter,ImageChops
import hashlib,json
HERE=Path(__file__).resolve().parent;PILOT=HERE.parent
FRAMES=[0,1,3,4,5,7]
source=Image.open(HERE/'heads-cleaned.png').convert('RGBA')
assert source.getextrema()[3][0]==0
atlas=Image.open(HERE/'walk-sheet-before.png').convert('RGBA')
meta=json.loads((HERE/'metadata-before.json').read_text());facts=[]
def crown(im):
    bbox=im.getchannel('A').point(lambda a:255 if a>80 else 0).getbbox();assert bbox
    mask=Image.new('L',im.size);mp=mask.load()
    for y in range(bbox[1],bbox[1]+round((bbox[3]-bbox[1])*.58)):
        for x in range(bbox[0],bbox[2]):
            r,g,b,a=im.getpixel((x,y))
            if a>100 and g>80 and g>r*.45 and b<g*.8:mp[x,y]=255
    box=mask.getbbox();assert box
    return box
def red_groups(im):
    pixels=set()
    for y in range(195,239):
        for x in range(85,116):
            r,g,b,a=im.getpixel((x,y))
            if a>80 and r>110 and r>g*2 and r>b*1.6:pixels.add((x,y))
    groups=[]
    while pixels:
        pt=pixels.pop();todo=[pt];group=[pt]
        while todo:
            x,y=todo.pop()
            for n in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
                if n in pixels:pixels.remove(n);todo.append(n);group.append(n)
        if len(group)>5:groups.append(group)
    return groups
for n,i in enumerate(FRAMES):
    original=Image.open(HERE/f'before-down-{i:02}.png').convert('RGBA')
    target_head=original.crop((75,110,235,290))
    cell=source.crop((round(n%3*source.width/3),round(n//3*source.height/2),round((n%3+1)*source.width/3),round((n//3+1)*source.height/2)))
    sc,tc=crown(cell),crown(target_head)
    scale=(tc[2]-tc[0])/(sc[2]-sc[0])
    sb=cell.getchannel('A').getbbox();art=cell.crop(sb).resize((round((sb[2]-sb[0])*scale),round((sb[3]-sb[1])*scale)),Image.Resampling.LANCZOS)
    x=round(75+(tc[0]+tc[2])/2-((sc[0]+sc[2])/2-sb[0])*scale)
    y=round(110+tc[1]-(sc[1]-sb[1])*scale)
    aligned=Image.new('RGBA',original.size);aligned.alpha_composite(art,(x,y))
    groups=red_groups(original)
    main=min([g for g in groups if min(y for x,y in g)<=197],key=lambda g:-len(g))
    mainleft=min(x for x,y in main)
    lobes=[g for g in groups if min(x for x,y in g)<mainleft and min(y for x,y in g)>197]
    assert lobes,(i,'No unwanted lobe selected')
    core=Image.new('L',original.size);cp=core.load()
    for g in lobes:
        for x,y in g:cp[x,y]=255
    mask=core.filter(ImageFilter.MaxFilter(7))
    protect=Image.new('L',original.size);pp=protect.load()
    for x,y in main:pp[x,y]=255
    protect=protect.filter(ImageFilter.MaxFilter(3))
    mask=ImageChops.subtract(mask,protect)
    # Preserve the actual ear (below239) and crown/main horn above198.
    mp=mask.load()
    for y0 in range(original.height):
        for x0 in range(original.width):
            if y0<198 or y0>=239:mp[x0,y0]=0
    result=original.copy();result.paste(aligned,(0,0),mask)
    assert result.crop((0,290,320,480)).tobytes()==original.crop((0,290,320,480)).tobytes()
    inverse=ImageChops.invert(mask)
    for old,new in zip(original.split(),result.split()):
        assert ImageChops.multiply(ImageChops.difference(old,new),inverse).getbbox() is None
    before=sum(core.getdata())//255;after=0
    for x0 in range(85,116):
        for y0 in range(198,239):
            if not cp[x0,y0]:continue
            r,g,b,a=result.getpixel((x0,y0))
            if a>80 and r>110 and r>g*2 and r>b*1.6:after+=1
    assert after<=max(8,before*.08),(i,'Unwanted flesh remains',before,after)
    result.save(PILOT/f'walk-down-{i:02}.png');mask.save(HERE/f'mask-{i:02}.png')
    aligned.save(HERE/f'aligned-cleaned-head-{i:02}.png')
    atlas.paste(result,(i*320,0))
    facts.append({'frame':i+1,'patch_bounds':mask.getbbox(),'unwanted_red_pixels_before':before,'after':after,'body_legs_identical':True})
atlas.save(PILOT/'walk-sheet.png')
meta['modes']['walk']['temple_cleanup']={'version':'v5','source':'temple-v5/heads-cleaned.png','source_sha256':hashlib.sha256((HERE/'heads-cleaned.png').read_bytes()).hexdigest(),'frames':facts,'all_body_legs_preserved':True}
(PILOT/'metadata.json').write_text(json.dumps(meta,indent=2))
for name,digest in json.loads((HERE/'protected-hashes.json').read_text()).items():assert hashlib.sha256((PILOT/name).read_bytes()).hexdigest()==digest,name
gif=[]
for i in range(8):
    im=Image.open(PILOT/f'walk-down-{i:02}.png').convert('RGBA');bg=Image.new('RGBA',im.size,'#191e2c');bg.alpha_composite(im);gif.append(bg.convert('RGB'))
gif[0].save(PILOT/'walk-down.gif',save_all=True,append_images=gif[1:],duration=[100]*8,loop=0)
(HERE/'verification.json').write_text(json.dumps({'frames':facts,'all_32_walk_leg_regions_identical':True,'other26_frames_unchanged':True,'image_edits':'ImageGen; code only aligns/extracts/assembles generated patches'},indent=2))
print(json.dumps(facts,indent=2))
