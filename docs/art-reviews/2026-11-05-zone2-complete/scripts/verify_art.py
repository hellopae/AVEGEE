"""Check shipped art against the read-only terrain source, independently of the builder."""
from pathlib import Path
from PIL import Image, ImageChops
import hashlib, json, xml.etree.ElementTree as ET, urllib.request, math

P=Path(__file__).resolve().parents[1]
S=Path('/Users/agapae/Documents/Work PAE/Claude/AVEGEE/layered-map-work/docs/art-reviews/2026-11-05-zone2-terrain')
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
load=lambda n:json.loads((P/n).read_text())
m=load('manifest.json');source= json.loads((S/'manifest.json').read_text());layout=load('layout.json');cat=load('object-catalog.json')['assets']
expected=set('tea sala krata dab ngiw lokan tarang sawan lan krajok canteen judgment house-front-one house-right-one house-left-two house-right-two gate-entry gate-exit tree-red tree-green tree-white lamp rail-front rail-back post-front post-back dock-canopy shrub-green shrub-red shrub-white rock-green rock-red rock-white'.split())
assert {a['id'] for a in cat}==expected
assert len({a['id'] for a in cat})==len(cat)
assert m['world']==[2304,1536]==source['world']==layout['world']
hash_checks=[]
for row in load('source-hashes.json'):
    h=digest(P/row['file']);assert h==digest(S/row['file'])==row['sha256']
    hash_checks.append(row['file'])
assert 'terrain-atlas.png' in hash_checks and 'fluid-master.png' in hash_checks
for f,old in zip(m['liquids'],source['liquids']):
    assert f==old and len(f['frames'])==12
    assert f['png'] in hash_checks and all(x['src'] in hash_checks for x in f['frames'])
assert m['tiles']==source['tiles']
atlas=Image.open(P/'terrain-atlas.png').convert('RGBA')
tile_results=[]
for form in ['png','webp']:
    stitched=Image.new('RGBA',atlas.size)
    for t in m['tiles']:
        im=Image.open(P/(t['png'] if form=='png' else t['src'])).convert('RGBA')
        x,y,w,h=t['rect']
        if form=='webp':
            cx,cy,cw,ch=t['crop'];im=im.crop((cx,cy,cx+cw,cy+ch))
        assert im.size==(w,h)
        stitched.paste(im,(x,y))
    assert stitched.tobytes()==atlas.tobytes(),form+' tiles differ from atlas'
    tile_results.append({'format':form,'tiles':len(m['tiles']),'exactPixelMatch':True})
(P/'tile-review.json').write_text(json.dumps({'world':m['world'],'tileSize':m['tileSize'],'gutter':m['gutter'],'atlasSha256':digest(P/'terrain-atlas.png'),'reconstruction':tile_results},indent=2)+'\n')
assets={x['sprite']:x for x in cat};alpha=atlas.getchannel('A');support=[]
links_original=json.loads((S/'connection-review.json').read_text())['connections']
def distance(p,a,b):
    vx=b[0]-a[0];vy=b[1]-a[1]
    u=max(0,min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy)))
    return math.hypot(p[0]-a[0]-u*vx,p[1]-a[1]-u*vy)
clearance=[]
for a in cat:
    im=Image.open(P/a['sprite']);assert im.mode=='RGBA' and list(im.size)==a['size']
    lo,hi=im.getchannel('A').getextrema();assert lo==0 and hi>=240
    assert 0<=a['foot'][0]<=im.width and 0<=a['foot'][1]<=im.height
    assert Image.open(P/a['preview']).mode=='RGBA'
assert len({o['id'] for o in layout['objects']})==len(layout['objects'])
for o in layout['objects']:
    a=assets[o['sprite']];sw,sh=a['size'];fx=o['foot'][0]/sw*o['w'];fy=o['foot'][1]/sh*o['h']
    if o['flipX']:fx=o['w']-fx
    assert abs(o['x']+fx-o['anchor'][0])<.02 and abs(o['y']+fy-o['anchor'][1])<.02
    assert o['x']>=0 and o['y']>=0 and o['x']+o['w']<=2304 and o['y']+o['h']<=1536,o['id']+' outside atlas'
    x,y=o['anchor'];v=alpha.getpixel((round(x),round(y)));assert v>=240,(o['id'],o['anchor'],v)
    support.append({'id':o['id'],'anchor':o['anchor'],'terrainAlpha':v})
    if o['category'] in ['tree','station','house','shrub','rock']:
        distances=[]
        for connection in links_original:
            pts=[[x*2304/1100,y*1536/733] for x,y in connection['pointsInReference1100x733']]
            distances.extend(distance(o['anchor'],a,b) for a,b in zip(pts,pts[1:]))
        minimum=min(distances);required=24+o['w']*.12
        assert minimum>=required,(o['id'],'base near original route',minimum,required)
        clearance.append({'id':o['id'],'minimum':round(minimum,2),'required':round(required,2)})
for n in ['sky','mountains']:
    assert Image.open(P/m[n]['png']).mode=='RGBA'
assert Image.open(P/m['mountains']['png']).getchannel('A').getextrema()[0]==0
assert Image.open(P/'composite-preview.jpg').width==1600
root=ET.parse(P/'zone2-layered-layout.svg').getroot();links=[]
for el in root.iter('{http://www.w3.org/2000/svg}image'):
    src=el.attrib['{http://www.w3.org/1999/xlink}href'];assert not Path(src).is_absolute() and (P/src).is_file();links.append(src)
assert len(links)==len(layout['objects'])+len(m['tiles'])+5
for row in load('generation-prompts.json')['calls']:
    assert 'style-reference.jpg' in row['references']
calls=load('generation-prompts.json')['calls'];assert len(calls)<=12
size=sum(f.stat().st_size for f in P.rglob('*') if f.is_file());assert size<80_000_000,size
http=[]
for src in sorted(set(links+[t['src'] for t in m['tiles']]+[a['preview'] for a in cat]+[x['src'] for f in m['liquids'] for x in f['frames']]+['index.html','scripts/preview.mjs','layout.json','manifest.json','object-catalog.json'])):
    req=urllib.request.Request('http://127.0.0.1:8878/'+src,method='HEAD')
    with urllib.request.urlopen(req) as r:assert r.status==200;http.append(src)
report={'scope':'art artifact checks; not gameplay QA or owner approval','imagegenCalls':len(calls),'assets':len(cat),'placements':len(layout['objects']),
        'sourceFilesIdentical':len(hash_checks),'tileReconstruction':tile_results,'groundedAnchorChecks':support,'baseRouteClearance':clearance,
        'relativeSvgImageLinks':len(links),'httpResourcesChecked':len(http),'outputBytesAtCheck':size,
        'limitations':['Browser UI not inspected: browser access host is unavailable','Foot support is terrain-alpha sampling, not walkmask/collision testing','Separate border 2–3 exit anchor is not specified on reference page 1','Final style/scale approval belongs to owner']}
(P/'artifact-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ['groundedAnchorChecks','baseRouteClearance','limitations']},ensure_ascii=False))
