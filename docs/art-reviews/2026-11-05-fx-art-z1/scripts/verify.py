"""Reopen deliverables and exercise the review page. Does not test the game."""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageChops
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
def distance(a,b):
    active=np.maximum(a[:,:,3],b[:,:,3])>.015
    return float(np.abs(a-b)[active].mean()) if active.any() else 0
def array(im):
    a=np.asarray(im,dtype=np.float32)/255
    return np.concatenate([a[:,:,:3]*a[:,:,3:4],a[:,:,3:4]],axis=2)
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8943);parser.add_argument('--art-only',action='store_true');args=parser.parse_args()
    manifest=json.loads((ROOT/'fx-manifest.json').read_text())
    reviews=json.loads((ROOT/'loop-review.json').read_text())['assets'];by_id={r['id']:r for r in reviews}
    checks=[]
    assert len(manifest['assets'])==25
    for a in manifest['assets']:
        im=Image.open(ROOT/a['sheet']).convert('RGBA');w,h=a['frameW'],a['frameH']
        assert im.size==(w*a['frames'],h),a['id']
        frames=[im.crop((i*w,0,(i+1)*w,h)) for i in range(a['frames'])]
        hashes=[hashlib.sha256(f.tobytes()).hexdigest() for f in frames]
        assert hashes==by_id[a['id']]['frameHashes']
        assert len(set(hashes))==a['frames']
        if a['id'].startswith('cloud'):
            still=Image.open(ROOT/'clouds'/f"{a['id']}.png").convert('RGBA')
            assert still.tobytes()==frames[0].tobytes()
        played=[array(frames[i]) for i in a['playbackOrder']]
        mean=np.mean([distance(x,y) for x,y in zip(played,played[1:])]);close=distance(played[-1],played[0])
        ratio=float(close/mean);assert ratio<=1.5,(a['id'],ratio)
        assert abs(ratio-by_id[a['id']]['effectiveRatio'])<1e-7
        if a['tileable']=='x':
            assert all(np.array_equal(np.asarray(f)[:,0],np.asarray(f)[:,-1]) for f in frames)
        for key in ['source','frameStrip','preview']:
            assert (ROOT/a[key]).is_file(),a[key]
        gif=Image.open(ROOT/a['preview']);assert gif.n_frames==len(a['playbackOrder'])
        for p in a['suggestedPlacement']:
            assert 0<=p['x']<2500 and 0<=p['y']<1759 and p['w']>0 and p['h']>0
        checks.append(dict(id=a['id'],uniqueDrawings=len(set(hashes)),recomputedLoopRatio=ratio,tileXExact=a['tileable']=='x'))
    total=sum(p.stat().st_size for p in ROOT.rglob('*') if p.is_file());assert total<=80_000_000
    browsers=[]
    with sync_playwright() as pw:
        browser=None
        if args.art_only:
            browsers.append(dict(status='not run',reason='--art-only requested; Chromium launch previously denied by sandbox MachPortRendezvous Permission denied (1100); in-app browser host unavailable'))
        else:
            try:
                browser=pw.chromium.launch()
            except Exception as error:
                browsers.append(dict(status='blocked',reason=str(error)))
        for name,size in ([('desktop',dict(width=1440,height=1100)),('mobile',dict(width=390,height=844))] if browser else []):
            page=browser.new_page(viewport=size,device_scale_factor=1)
            errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('response',lambda r:errors.append(f'HTTP {r.status} {r.url}') if r.status>=400 else None)
            page.goto(f'http://127.0.0.1:{args.port}/index.html')
            page.wait_for_function('window.fxReview && window.fxReview.images.size > 5')
            page.wait_for_timeout(900)
            loaded=page.evaluate('fxReview.manifest.assets.filter(a=>fxReview.images.has(a.sheet)).length')
            assert 0<loaded<=25
            # Pause freezes both animation time and the actual canvas pixels.
            page.locator('#play').click();page.wait_for_timeout(80)
            first=page.locator('canvas').screenshot();time1=page.evaluate('fxReview.time')
            page.wait_for_timeout(250);second=page.locator('canvas').screenshot()
            assert time1==page.evaluate('fxReview.time')
            assert first==second,'paused canvas changed'
            page.locator('#fx').uncheck();page.wait_for_timeout(100)
            assert second!=page.locator('canvas').screenshot(),'FX toggle made no change'
            page.locator('#fx').check();page.locator('#play').click();page.wait_for_timeout(300)
            assert page.evaluate('fxReview.time')>time1
            page.locator('#zoom').click();assert page.locator('#world').evaluate('e=>e.clientWidth')==2500
            page.locator('#viewport').evaluate('e=>{e.scrollLeft=1200;e.scrollTop=500}')
            page.wait_for_timeout(300);page.screenshot(path=str(ROOT/'evidence'/f'{name}-zoom.png'))
            page.locator('#zoom').click();page.locator('#viewport').evaluate('e=>{e.scrollLeft=0;e.scrollTop=0}')
            page.locator('#play').click();page.wait_for_timeout(100)
            page.screenshot(path=str(ROOT/'evidence'/f'{name}.png'))
            if name=='desktop':
                data=page.locator('canvas').evaluate("c=>c.toDataURL('image/jpeg',.92).split(',')[1]")
                import base64
                (ROOT/'evidence'/'composite-fx.jpg').write_bytes(base64.b64decode(data))
            overflow=page.evaluate('document.documentElement.scrollWidth>innerWidth');assert not overflow
            assert not errors,errors
            browsers.append(dict(viewport=name,size=size,loadedSheetsAtStart=loaded,pausePixelsStable=True,fxToggleChangesPixels=True,resumeAdvancesTime=True,zoomAndPanExercised=True,noPageOverflow=True,errors=errors))
            page.close()
        if browser:browser.close()
    if not any(b.get('viewport')=='desktop' for b in browsers):
        # Explicit offline proof, not a browser screenshot.
        scene=Image.open(ROOT/'proof-composite.jpg').convert('RGBA').resize((2500,1759))
        for a in manifest['assets']:
            layer=Image.new('RGBA',scene.size)
            f=Image.open(ROOT/a['sheet']).convert('RGBA').crop((0,0,a['frameW'],a['frameH']))
            for p in a['suggestedPlacement']:
                x,y,w,h=[round(p[k]) for k in ['x','y','w','h']]
                if a['tileable']:
                    patch=Image.new('RGBA',(w,h))
                    for py in range(0,h,f.height):
                        for px in range(0,w,f.width):patch.paste(f,(px,py))
                    layer.alpha_composite(patch,(x,y))
                else:layer.alpha_composite(f.resize((w,h),Image.Resampling.LANCZOS),(x,y))
            if a.get('mask'):
                mask=Image.open(ROOT/a['mask']).getchannel('A').resize(scene.size)
                layer.putalpha(ImageChops.multiply(layer.getchannel('A'),mask))
            opacity=a.get('suggestedOpacity',1)
            if opacity!=1:layer.putalpha(layer.getchannel('A').point(lambda v:round(v*opacity)))
            if a['blend']=='screen':
                lit=ImageChops.screen(scene.convert('RGB'),layer.convert('RGB')).convert('RGBA')
                scene=Image.composite(lit,scene,layer.getchannel('A'))
            else:scene.alpha_composite(layer)
        scene.convert('RGB').save(ROOT/'evidence'/'composite-fx.jpg',quality=92)
    compare=Image.new('RGB',(1800,720),'#282330');draw=ImageDraw.Draw(compare)
    for x,file,label in [(0,'style-reference.jpg','ACCEPTED STYLE REFERENCE'),(900,'evidence/composite-fx.jpg','DRAWN FX OVER PROOF COMPOSITE')]:
        im=Image.open(ROOT/file);im.thumbnail((900,640));compare.paste(im,(x,40));draw.text((x+16,12),label,fill='#f6dcaa')
    draw.text((16,690),'OFFLINE COMPOSITE, not browser capture. Clouds ~296px/cell enlarged. Baked clouds remain. No game integration.',fill='white')
    compare.save(ROOT/'style-compare.jpg',quality=92)
    total=sum(p.stat().st_size for p in ROOT.rglob('*') if p.is_file());assert total<=80_000_000
    (ROOT/'verification.json').write_text(json.dumps(dict(scope='exported art package and standalone review page only; not game QA',bytes=total,assets=checks,browser=browsers),indent=2)+'\n')
    print(json.dumps(dict(artAssetsChecked=len(checks),bytes=total,browser=browsers),indent=2))
if __name__=='__main__':main()
