"""Exercise the actual browser compositor, record three fixed cameras, measure
contrast/saturation and changes outside the region mask union. Local server only.
"""
from pathlib import Path
from io import BytesIO
import base64,json,subprocess
import numpy as np
import cv2
from PIL import Image
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
URL='http://127.0.0.1:8765/docs/art-reviews/2026-11-05-z1-v5-fluids/'
def decode(data):return Image.open(BytesIO(base64.b64decode(data.split(',',1)[1]))).convert('RGB')
def measure(im):
    a=np.asarray(im).astype(np.float32)/255
    lum=a@np.array([.2126,.7152,.0722],np.float32)
    mx=a.max(2);mn=a.min(2)
    return {'meanLuminance':float(lum.mean()),'luminanceStd':float(lum.std()),'meanHSV_Saturation':float(np.mean((mx-mn)/np.maximum(mx,.0001))),'meanChroma':float((mx-mn).mean())}
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':1280,'height':840},device_scale_factor=1)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(URL);page.evaluate('window.reviewReady');page.locator('#play').click()
    print('browser loaded',page.evaluate('reviewState()'),flush=True)
    def capture(t,view='full',w=1600,h=1067,base=False):
        return decode(page.evaluate('(a)=>capture(...a)',[t,view,w,h,base]))
    base=capture(0,base=True);baseline=measure(base)
    samples=[]
    for t in [0,.125,.25,.375,.5,.625,.75,.875,1.25,2.5,4,6,8,10,11.875]:
        im=capture(t);m=measure(im);m['time']=t
        m['contrastRatio']=m['luminanceStd']/baseline['luminanceStd']
        m['saturationRatio']=m['meanHSV_Saturation']/baseline['meanHSV_Saturation']
        samples.append(m)
        if t==0:im.save(ROOT/'composite-preview.jpg',quality=94)
    contrast={'baseline':baseline,'samples':samples,'measurement':'actual Canvas2D compositor, 1600x1067, full map, Rec.709 luma std and HSV saturation; no full-image grading','minimumContrastRatio':min(m['contrastRatio'] for m in samples),'minimumSaturationRatio':min(m['saturationRatio'] for m in samples),'criterion':'ratios >= 1.0; no reduction from baseline','meetsNumericalCriterion':all(m['contrastRatio']>=1 and m['saturationRatio']>=1 for m in samples),'perceptualHaze':'requires visual judgment, not proved by global statistics'}
    (ROOT/'contrast-check.json').write_text(json.dumps(contrast,indent=2))
    print('contrast',contrast['minimumContrastRatio'],'saturation',contrast['minimumSaturationRatio'],flush=True)
    # Native-pixel comparison includes all blend modes, all visible layers.
    nativeBase=np.asarray(capture(0,w=4915,h=3277,base=True))
    nativeFX=np.asarray(capture(.375,w=4915,h=3277))
    union=np.zeros((3277,4915),bool)
    for path in (ROOT/'masks').glob('*-1x.png'):union|=np.asarray(Image.open(path))>0
    changed=np.any(nativeBase!=nativeFX,axis=2)
    containment={'time':.375,'nativeSize':[4915,3277],'changedPixels':int(changed.sum()),'changedPixelsOutsideMaskUnion':int((changed&~union).sum())}
    del nativeBase,nativeFX,union,changed
    # Actual interaction checks: pause, layer toggles, camera presets, zoom/pan.
    a=np.asarray(capture(.25,view='river',w=960,h=540))
    page.locator('#layers input').nth(2).uncheck()
    # Record state and restore; index-independent full disable tests below.
    page.locator('#layers input').nth(2).check()
    page.evaluate('Object.keys(enabled).forEach(k=>enabled[k]=false)')
    nofx=np.asarray(capture(.25,view='river',w=960,h=540))
    basecrop=np.asarray(capture(.25,view='river',w=960,h=540,base=True))
    toggle={'allLayersDisabledEqualsMaster':bool(np.array_equal(nofx,basecrop)),'enabledLayersChangeImage':bool(np.any(a!=nofx))}
    page.evaluate('Object.keys(enabled).forEach(k=>enabled[k]=true)')
    page.locator('[data-view="ice"]').click();before=page.evaluate('reviewState().camera')
    page.mouse.move(700,420);page.mouse.wheel(0,-120);after=page.evaluate('reviewState().camera')
    toggle['wheelChangesZoom']=before[2]!=after[2]
    before=after;page.mouse.move(700,420);page.mouse.down();page.mouse.move(760,450);page.mouse.up();after=page.evaluate('reviewState().camera')
    toggle['dragChangesCamera']=before[:2]!=after[:2]
    video=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pixel_format','rgb24','-video_size','1280x720','-framerate','12','-i','-','-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',str(ROOT/'preview-clip.mp4')],stdin=subprocess.PIPE)
    for viewindex,view in enumerate(['lava','river','ice']):
        for f in range(48):
            im=capture(viewindex*4+f/12,view,1280,720)
            video.stdin.write(im.tobytes())
            if f==12:im.save(ROOT/f'preview-{view}.jpg',quality=94)
        print('recorded',view,flush=True)
    video.stdin.close();code=video.wait()
    evidence={'browser':'Playwright Chromium, headless, local HTTP','browserErrors':errors,'containmentRender':containment,'interactions':toggle,'video':{'exitCode':code,'durationSeconds':12,'fps':12,'frames':144,'views':[{'id':'lava','seconds':[0,4]},{'id':'river','seconds':[4,8]},{'id':'ice','seconds':[8,12]}]},'claim':'automated evidence only; not artistic QA approval'}
    (ROOT/'render-check.json').write_text(json.dumps(evidence,indent=2));print(json.dumps(evidence),flush=True)
    browser.close()
