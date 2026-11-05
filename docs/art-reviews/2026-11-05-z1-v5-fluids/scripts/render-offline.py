"""Reference raster compositor for the same fixed sheets/layout as index.html.
Fallback because this run cannot launch a browser. Does not invent animation.
Frames are selected from painted sheets; coverage comes from authoritative PNGs.
"""
from pathlib import Path
import json,subprocess
import numpy as np
import cv2
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
model=json.loads((ROOT/'fx-layout.json').read_text())
master=np.asarray(Image.open(ROOT/'master-v5.webp').convert('RGB'))
cameras={'full':[0,0,4915,3277],'lava':[0,450,1750,984.375],'river':[1500,1950,2100,1181.25],'ice':[2960,790,1830,1029.375]}
images={p:np.asarray(Image.open(ROOT/p).convert('RGBA')) for p in {v['sheet'] for v in model['pieces']}}
masks={p:np.asarray(Image.open(ROOT/p)) for p in {v[k] for v in model['pieces'] for k in ['mask','clipMask'] if k in v}}
cache={}
def render(t,view='full',size=(1600,1067),base=False):
    cx,cy,cw,ch=cameras[view];ow,oh=size
    # Output pixel centers map directly to the same master coordinate space.
    gx=cx+(np.arange(ow,dtype='float32')+.5)*cw/ow-.5
    gy=cy+(np.arange(oh,dtype='float32')+.5)*ch/oh-.5
    mapx,mapy=np.meshgrid(gx,gy)
    out=cv2.remap(master,mapx,mapy,cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT).astype('float32')/255
    if base:return np.uint8(np.rint(out*255).clip(0,255))
    for p in model['pieces']:
        x,y,w,h=p['maskRectPx']
        ix=np.where((gx>=x)&(gx<x+w))[0];iy=np.where((gy>=y)&(gy<y+h))[0]
        if not len(ix) or not len(iy):continue
        dx0,dx1=int(ix[0]),int(ix[-1]+1);dy0,dy1=int(iy[0]),int(iy[-1]+1)
        lx,ly=np.meshgrid(gx[dx0:dx1]-x,gy[dy0:dy1]-y)
        coverage=cv2.remap(masks[p['mask']],lx,ly,cv2.INTER_NEAREST,borderMode=cv2.BORDER_CONSTANT).astype('float32')/255
        if p.get('clipMask'):coverage*=cv2.remap(masks[p['clipMask']],lx,ly,cv2.INTER_NEAREST,borderMode=cv2.BORDER_CONSTANT).astype('float32')/255
        frame=int(t*p['fps'])%p['frames'];key=(p['sheet'],frame)
        if key not in cache:cache[key]=images[p['sheet']][:,frame*p['frameW']:(frame+1)*p['frameW']].copy()
        if p.get('tileInRegion'):
            tw=p['tileWorld'][0]*4915/3840;th=p['tileWorld'][1]*3277/2560
            tx=((lx+x+.5)%tw)/tw*p['frameW']-.5;ty=((ly+y+.5)%th)/th*p['frameH']-.5
            mode=cv2.BORDER_WRAP
        else:
            tx=(lx+.5)/w*p['frameW']-.5;ty=(ly+.5)/h*p['frameH']-.5;mode=cv2.BORDER_REPLICATE
        src=cv2.remap(cache[key],tx.astype('float32'),ty.astype('float32'),cv2.INTER_LINEAR,borderMode=mode).astype('float32')/255
        alpha=(src[:,:,3]*coverage*p['opacity'])[:,:,None];src=src[:,:,:3]
        dst=out[dy0:dy1,dx0:dx1]
        if p['blend']=='overlay':paint=np.where(dst<=.5,2*dst*src,1-2*(1-dst)*(1-src))
        elif p['blend']=='normal':paint=src
        else:raise ValueError(p['blend'])
        dst[:]=dst*(1-alpha)+paint*alpha
    return np.uint8(np.rint(out*255).clip(0,255))

def measure(a):
    a=a.astype('float32')/255;lum=a@np.array([.2126,.7152,.0722],np.float32);mx=a.max(2);mn=a.min(2)
    return {'meanLuminance':float(lum.mean()),'luminanceStd':float(lum.std()),'meanHSV_Saturation':float(np.mean((mx-mn)/np.maximum(mx,.0001))),'meanChroma':float((mx-mn).mean())}

baseline=measure(render(0,base=True));samples=[]
for t in [0,.125,.25,.375,.5,.625,.75,.875,1.25,2.5,4,6,8,10,11.875]:
    im=render(t);m=measure(im);m['time']=t;m['contrastRatio']=m['luminanceStd']/baseline['luminanceStd'];m['saturationRatio']=m['meanHSV_Saturation']/baseline['meanHSV_Saturation'];samples.append(m)
    if t==0:Image.fromarray(im).save(ROOT/'composite-preview.jpg',quality=94)
contrast={'renderer':'offline reference compositor, not browser screenshot','baseline':baseline,'samples':samples,'measurement':'1600x1067 full map, Rec.709 luminance std and HSV saturation, fixed opacity per layer, no grading','minimumContrastRatio':min(m['contrastRatio'] for m in samples),'minimumSaturationRatio':min(m['saturationRatio'] for m in samples),'criterion':'both ratios >=1.0','meetsNumericalCriterion':all(m['contrastRatio']>=1 and m['saturationRatio']>=1 for m in samples),'limitations':'global metrics cannot prove no local haze; browser parity not measured'}
(ROOT/'contrast-check.json').write_text(json.dumps(contrast,indent=2));print('contrast',contrast['minimumContrastRatio'],'saturation',contrast['minimumSaturationRatio'],flush=True)
native=render(.375,size=(4915,3277));union=np.zeros((3277,4915),bool)
for f in (ROOT/'masks').glob('*-1x.png'):union|=np.asarray(Image.open(f))>0
changed=np.any(native!=master,axis=2)
containment={'renderer':'offline reference compositor','time':.375,'nativeSize':[4915,3277],'changedPixels':int(changed.sum()),'changedPixelsOutsideMaskUnion':int((changed&~union).sum())}
del native,union,changed
video=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pixel_format','rgb24','-video_size','1280x720','-framerate','12','-i','-','-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',str(ROOT/'preview-clip.mp4')],stdin=subprocess.PIPE)
contact=Image.new('RGB',(1280,1080),(25,24,31));d=ImageDraw.Draw(contact)
for vi,view in enumerate(['lava','river','ice']):
    for f in range(48):
        im=render(vi*4+f/12,view,(1280,720));video.stdin.write(im.tobytes())
        if f==12:Image.fromarray(im).save(ROOT/f'preview-{view}.jpg',quality=94)
        if f in [0,6,12,18,24,30,36,42]:
            n=vi*8+f//6;thumb=Image.fromarray(im).resize((320,180));contact.paste(thumb,((n%4)*320,(n//4)*180));d.text(((n%4)*320+5,(n//4)*180+5),f'{view} {vi*4+f/12:.1f}s',fill='white',stroke_fill='black',stroke_width=2)
    print('recorded',view,flush=True)
video.stdin.close();code=video.wait();contact.save(ROOT/'clip-review-strip.jpg',quality=92)
probe=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration:stream=width,height,r_frame_rate,nb_frames','-of','json',str(ROOT/'preview-clip.mp4')],capture_output=True,text=True,check=True)
evidence={'renderer':'offline reference compositor; same sheets, masks, frame indexes, cameras, fixed opacity, overlay blend formula as index.html','browser':{'attempted':True,'status':'blocked','playwrightReason':'macOS sandbox: bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer Permission denied (1100)','browserPaneReason':'browser access host is unavailable','runtimeAndInteractionTests':'not run'},'browserErrors':None,'containmentRender':containment,'interactions':{},'video':{'exitCode':code,'durationSeconds':12,'fps':12,'frames':144,'views':[{'id':'lava','seconds':[0,4]},{'id':'river','seconds':[4,8]},{'id':'ice','seconds':[8,12]}],'ffprobe':json.loads(probe.stdout)},'claim':'automated raster evidence only; not browser validation or artistic QA approval'}
(ROOT/'render-check.json').write_text(json.dumps(evidence,indent=2));print(json.dumps(evidence),flush=True)
