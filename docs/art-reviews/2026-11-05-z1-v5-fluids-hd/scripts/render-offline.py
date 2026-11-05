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
cameras={'heaven':[2500,160,1450,815.625],'full':[0,0,4915,3277],'lava':[860,1110,900,506.25],'river':[1500,1950,2100,1181.25],'ice':[3630,1510,900,506.25]}
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
        if p.get('driftWorld'):
            sx=4915/3840;sy=3277/2560
            rx,ry,rw,rh=p['rectWorld'];sw,sh=p['spriteWorld']
            wx=rx+(p['driftOriginWorld'][0]-rx+p['driftWorld'][0]*t)%rw
            wy=ry+(p['driftOriginWorld'][1]-ry+p['driftWorld'][1]*t)%rh
            # Shortest periodic distance; draw wrapped copies equivalently.
            ddx=((lx+x)/sx-wx+rw/2)%rw-rw/2
            ddy=((ly+y)/sy-wy+rh/2)%rh-rh/2
            tx=(ddx/sw+.5)*p['frameW']-.5;ty=(ddy/sh+.5)*p['frameH']-.5
            mode=cv2.BORDER_CONSTANT
        elif p.get('tileInRegion'):
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


def use_model(value,baseline=False):
    global model,images,masks,cache
    model=json.loads(json.dumps(value));cache={}
    if baseline:
        for p in model['pieces']:
            for k in ['sheet','mask','clipMask']:
                if k in p:p[k]='reference/'+p[k]
    images={p:np.asarray(Image.open(ROOT/p).convert('RGBA')) for p in {v['sheet'] for v in model['pieces']}}
    masks={p:np.asarray(Image.open(ROOT/p)) for p in {v[k] for v in model['pieces'] for k in ['mask','clipMask'] if k in v}}

if __name__=='__main__':
    new=json.loads((ROOT/'fx-layout.json').read_text());old=json.loads((ROOT/'reference/fx-layout-v5.json').read_text())
    compare=Image.new('RGB',(1280,4*390),(24,24,30));draw=ImageDraw.Draw(compare);sharp=[]
    for n,kind in enumerate(['lava','lavafall','ice-stream','waterfall']):
        mask=np.asarray(Image.open(ROOT/f'masks/{kind}-1x.png'))
        # Select densest 320x180 master-pixel window without favoring new art.
        scores=cv2.boxFilter((mask>0).astype('float32'),-1,(320,180),normalize=False)
        cy,cx=np.unravel_index(np.argmax(scores),scores.shape);cx=int(np.clip(cx,160,4915-160));cy=int(np.clip(cy,90,3277-90))
        cameras['metric']=[cx-160,cy-90,320,180]
        roi=cv2.resize(mask[cy-90:cy+90,cx-160:cx+160],(640,360),interpolation=cv2.INTER_NEAREST)>0
        valid=cv2.erode(roi.astype('uint8'),np.ones((7,7),np.uint8))>0
        vals=[]
        for i,(m,b) in enumerate([(old,True),(new,False)]):
            use_model(m,b);im=render(0,'metric',(640,360));gray=cv2.cvtColor(im,cv2.COLOR_RGB2GRAY)
            lap=cv2.Laplacian(gray,cv2.CV_64F);vals.append(float(lap[valid].var()))
            compare.paste(Image.fromarray(im),(i*640,n*390+30))
        draw.text((8,n*390+8),f'{kind}  OLD | NEW   {vals[0]:.2f} -> {vals[1]:.2f}',fill='white')
        sharp.append({'kind':kind,'masterCrop':cameras['metric'],'pixelsPerWorldUnit':2.56,'time':0,'validInteriorPixels':int(valid.sum()),'oldLaplacianVariance':vals[0],'newLaplacianVariance':vals[1],'ratio':vals[1]/vals[0]})
    compare.save(ROOT/'compare-fluids.jpg',quality=96)
    (ROOT/'sharpness.json').write_text(json.dumps({'method':'Rec.601 grayscale Laplacian CV_64F variance inside eroded authoritative kind mask. Exact same frame index0, camera, output scale 2.56px/world for both runs; densest window selected using old mask only. Actual runtime blend/opacity; opacity increased for visibility so this measures delivered composite, not resolution alone. No sharpening filter.','samples':sharp,'limitations':'Laplacian is a local contrast/detail proxy, not perceptual approval. Sources delivered 627px/cell, below requested ~800.'},indent=2))
    use_model(new)
    evidence={'renderer':'offline reference raster compositor, not browser capture','clips':[],'containment':[]}
    for view in ['lava','ice','heaven']:
        path=ROOT/f'preview-{view}.mp4'
        video=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pixel_format','rgb24','-video_size','1280x720','-framerate','12','-i','-','-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',str(path)],stdin=subprocess.PIPE)
        for f in range(144):
            im=render(f/12,view,(1280,720));video.stdin.write(im.tobytes())
            if f==0:Image.fromarray(im).save(ROOT/f'preview-{view}.jpg',quality=94)
        video.stdin.close();code=video.wait();assert code==0
        probe=json.loads(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration:stream=width,height,r_frame_rate,nb_frames','-of','json',str(path)],capture_output=True,text=True,check=True).stdout)
        evidence['clips'].append({'view':view,'file':path.name,'probe':probe});print('recorded',view,flush=True)
    # Cloud-only native render must preserve all pixels outside the cloud mask.
    cloudmodel=dict(new,pieces=[p for p in new['pieces'] if p['regionId']=='cloud-sea'])
    use_model(cloudmodel)
    cm=np.asarray(Image.open(ROOT/'masks/cloud-sea-1x.png'))>0
    cameras['cloudcheck']=[2500,160,1450,816]
    x,y,w,h=map(int,cameras['cloudcheck']);outside=~cm[y:y+h,x:x+w]
    base=master[y:y+h,x:x+w]
    samples=[]
    for t in [0,.125,.5,1,3,6,11.9,80,300,900]:
        im=render(t,'cloudcheck',(w,h));changes=np.any(im!=base,axis=2)
        evidence['containment'].append({'time':t,'changedOutsideCloudMask':int(np.count_nonzero(changes&outside)),'changedInside':int(np.count_nonzero(changes&~outside))})
        if t in [0,6]:samples.append(im)
    evidence['cloudMotionChangedPixels0to6']=int(np.any(samples[0]!=samples[1],axis=2).sum())
    evidence['puffMotion']=[]
    for p in new['pieces']:
        if 'driftWorld' not in p:continue
        use_model(dict(new,pieces=[p]))
        a=render(0,'cloudcheck',(w,h));b=render(6,'cloudcheck',(w,h))
        evidence['puffMotion'].append({'id':p['id'],'visiblePixelsAt0':int(np.any(a!=base,axis=2).sum()),'visiblePixelsAt6':int(np.any(b!=base,axis=2).sum()),'changedPixels0to6':int(np.any(a!=b,axis=2).sum()),'driftWorld':p['driftWorld']})
    evidence['claim']='Numerical raster evidence only; browser playback and artistic approval are separate.'
    (ROOT/'render-check.json').write_text(json.dumps(evidence,indent=2))
    print(json.dumps(sharp,indent=2),flush=True)
