#!/usr/bin/env python3
"""Register generated sprites and package review media; Pillow/NumPy READ pixels only.
All raster formatting uses ffmpeg: crop, nearest scaling, alpha threshold, placement,
PNG packing and GIF palettes. cwebp encodes lossless WebP. No RGB tinting, drawing, or runtime edits.
Run from repository root: python3 art-src/dam-foreman-2026-11-15/build_review.py
"""
import hashlib, json, subprocess
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / 'art-src/dam-foreman-2026-11-15'
REVIEW = ROOT / 'docs/art-reviews/2026-11-15-dam-foreman-art'
REVIEW.mkdir(parents=True, exist_ok=True)
DIRECTIONS = ['side', 'side-left', 'down', 'up']
# Five drawn key poses, eight playback frames. Return poses are intentional,
# not interpolated artwork. This closes the cycle through the same 1->2 transition.
PHASES = [0, 1, 2, 3, 4, 3, 2, 1]
THRESHOLD = 128
SOURCES = {
 'img/crew-dam.webp': 'ffd5c707dc0ed1ef4e303ca8637f6c1933b19e73a6a77eab3dc5c3c896fc2043',
 'img/crew-dam-walk-v2.webp': 'deb27bdd2e4d757212950a204e8bf7784422a00c75ef33f143f5b8f08a70f395',
 'img/crew-dam-work.webp': '84b834221de3806fe30e90e177a54cfa13b9f4d6ceddda43535fbc6214ad8809',
 'img/crew-dam-profile.webp': '129e0ce5f8ba976603ef190db0e989504994c98c4d909085e3895e23276964ac',
 'img/workers/worker-th-carry-v1.webp': '8b3a3c32fd045a28ece75ebce1c8720bb0def9c45819d5ced4dd70a7140030f8',
 'img/workers/worker-th-carry-v1.json': 'ac94f58ec4e34311bc7dfb91add505cde86636e6293dbe4117148d09db1cfdec',
}

def ff(args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *map(str,args)], check=True, cwd=ROOT)

def bounds(a):
    yy,xx=np.where(a >= THRESHOLD)
    if not len(xx): raise ValueError('empty sprite')
    return tuple(map(int,(xx.min(),yy.min(),xx.max()+1,yy.max()+1)))

def sole_center(a):
    # Ground pivot: horizontal midpoint of BOTH feet in the lowest 15% of
    # the silhouette, projected onto the sole baseline. A single bottom scanline
    # switches to the planted leg and causes body sliding at each step.
    b=bounds(a)
    band=round((b[3]-b[1])*.15)
    _,xx=np.where(a[max(b[1],b[3]-band):b[3]] >= THRESHOLD)
    return (int(xx.min())+int(xx.max())+1)/2

def encode_png(source, dest, vf):
    ff(['-i',source,'-vf',vf,'-frames:v','1',dest])

def encode_webp(png,dest):
    subprocess.run(['cwebp','-quiet','-lossless','-exact','-m','6',str(png),'-o',str(dest)],check=True,cwd=ROOT)

def save_webp(source,dest,vf=None):
    png=WORK/(Path(dest).stem+'-packed.png')
    args=['-i',source]
    if vf: args+=['-vf',vf]
    ff(args+['-frames:v','1',png])
    encode_webp(png,dest)

ALPHA="format=rgba,lutrgb=a='if(lt(val,128),0,255)'"

def build_sheet(kind,stem):
    raw=WORK/f'{kind}-generated.png'
    base_raw=raw
    base_im=Image.open(raw)
    base_a=np.array(base_im)[:,:,3]
    frames=WORK/kind
    frames.mkdir(exist_ok=True)
    registrations=[]
    for row in range(4):
        for col in range(8):
            raw=base_raw;im=base_im;a=base_a
            phase=PHASES[col]
            x0,x1=round(phase*im.width/8),round((phase+1)*im.width/8)
            y0,y1=round(row*im.height/4),round((row+1)*im.height/4)
            cell=a[y0:y1,x0:x1]
            l,t,r,b=bounds(cell)
            # No sprite may touch a crop edge: would indicate clipped art/neighbour bleed.
            assert l>0 and t>0 and r<x1-x0 and b<y1-y0, (kind,row,col,'clipped source')
            h=296
            w=round((r-l)*h/(b-t))
            # Nearest-neighbour foot-region sample predicts the final discrete center.
            src=cell[t:b,l:r]
            iy=np.floor(np.arange(h)*src.shape[0]/h).astype(int)
            ix=np.floor(np.arange(w)*src.shape[1]/w).astype(int)
            scaled=src[np.ix_(iy,ix)]
            px=round(160-sole_center(scaled))
            py=320-h
            assert 0<=px and px+w<=320
            vf=f'{ALPHA},crop={r-l}:{b-t}:{x0+l}:{y0+t},scale={w}:{h}:flags=neighbor,pad=320:320:{px}:{py}:color=black@0'
            dest=frames/f'{row*8+col:02d}.png'
            encode_png(raw,dest,vf)
            # ffmpeg's scaler samples centers slightly differently; register the actual output.
            actual=np.array(Image.open(dest))[:,:,3]
            correction=round(160-sole_center(actual))
            if correction:
                px+=correction
                assert 0<=px and px+w<=320
                vf=f'{ALPHA},crop={r-l}:{b-t}:{x0+l}:{y0+t},scale={w}:{h}:flags=neighbor,pad=320:320:{px}:{py}:color=black@0'
                encode_png(raw,dest,vf)
            registrations.append({'row':row,'frame':col+1,'source_pose':phase+1,'source':raw.name,'source_bounds':[x0+l,y0+t,x0+r,y0+b], 'width':w,'height':h,'placement':[px,py]})
    # Spend at most 3 pixels of the 4px pivot tolerance to steady the upper body.
    for row in range(4):
        centers=[]
        for col in range(8):
            aa=np.array(Image.open(frames/f'{row*8+col:02d}.png'))[:,:,3]
            _,xx=np.where(aa[:120]>=THRESHOLD)
            centers.append((int(xx.min())+int(xx.max())+1)/2)
        target=float(np.median(centers))
        for col,center in enumerate(centers):
            shift=max(-3,min(3,round(target-center)))
            if not shift:continue
            reg=registrations[row*8+col]
            reg['placement'][0]+=shift
            reg['upper_body_correction_x']=shift
            l,t,r,b=reg['source_bounds'];w,h=reg['width'],reg['height'];px,py=reg['placement']
            assert 0<=px and px+w<=320
            vf=f'{ALPHA},crop={r-l}:{b-t}:{l}:{t},scale={w}:{h}:flags=neighbor,pad=320:320:{px}:{py}:color=black@0'
            encode_png(WORK/reg['source'],frames/f'{row*8+col:02d}.png',vf)
    inputs=[]
    for i in range(32): inputs+=['-i',frames/f'{i:02d}.png']
    layout='|'.join(f'{(i%8)*320}_{(i//8)*320}' for i in range(32))
    packed=WORK/f'{kind}-packed.png'
    ff(inputs+['-filter_complex',f'xstack=inputs=32:layout={layout}:fill=black@0,format=rgba','-frames:v','1',packed])
    encode_webp(packed,ROOT/'img'/f'{stem}.webp')
    meta=json.loads((ROOT/'img/workers/worker-th-carry-v1.json').read_text())
    meta['image']=f'{stem}.webp'
    # Preserve every template field (including render-time dx/scale/order), per brief.
    # This source string deliberately records provenance, not gameplay wiring.
    meta['source']='ImageGen 2026-11-15; registered by art-src/dam-foreman-2026-11-15/build_review.py; template worker-th-carry-v1.json; art only'
    (ROOT/'img'/f'{stem}.json').write_text(json.dumps(meta,ensure_ascii=False,indent=1)+'\n')
    (WORK/f'{kind}-registration.json').write_text(json.dumps(registrations,indent=2)+'\n')
    for row,direction in enumerate(DIRECTIONS):
        # Review both light and dark backgrounds. No text is burned into the art.
        pattern=frames/'%02d.png'
        fc=(
          '[0:v]format=rgba,split=2[a][b];'
          'color=c=0xdde5ec:s=320x320:r=8[light];'
          'color=c=0x20242c:s=320x320:r=8[dark];'
          '[light][a]overlay=shortest=1[l];[dark][b]overlay=shortest=1[d];'
          '[l][d]hstack=inputs=2,split[p0][p1];'
          '[p0]palettegen=reserve_transparent=0:stats_mode=full[p];'
          '[p1][p]paletteuse=dither=none'
        )
        ff(['-framerate','8','-start_number',str(row*8),'-i',pattern,'-filter_complex',fc,'-frames:v','8','-loop','0','-final_delay','12',REVIEW/f'{stem}-{direction}.gif'])
    return registrations

def build_supervisor():
    raw=WORK/'supervise-generated.png'
    a=np.array(Image.open(raw))[:,:,3]
    l,t,r,b=bounds(a)
    # Original opacity>=128 silhouette is y=1..510, centered x=256.
    h=510;w=round((r-l)*h/(b-t));px=round(256-w/2)
    save_webp(raw,ROOT/'img/crew-dam-supervise-v1.webp',f'{ALPHA},crop={r-l}:{b-t}:{l}:{t},scale={w}:{h}:flags=neighbor,pad=512:512:{px}:1:color=black@0')


def build_comparison():
    # Full-height comparison: original / supervisor / carry-down / rice-down.
    paths=[ROOT/'img/crew-dam.webp',ROOT/'img/crew-dam-supervise-v1.webp',WORK/'carry/16.png',WORK/'rice/16.png']
    ins=[]
    for p in paths:ins+=['-i',p]
    fc='[0:v]format=rgba[a0];[1:v]format=rgba[a1];'
    for i in [2,3]:
        fc+=f'[{i}:v]crop=320:296:0:24,scale=512:474:flags=neighbor,pad=512:512:0:38:color=black@0[a{i}];'
    fc+='[a0][a1][a2][a3]hstack=inputs=4,split=2[s0][s1];'
    fc+='color=c=0xdde5ec:s=2048x512[bg0];color=c=0x20242c:s=2048x512[bg1];'
    fc+='[bg0][s0]overlay=shortest=1[c0];[bg1][s1]overlay=shortest=1[c1];[c0][c1]vstack=inputs=2'
    packed=WORK/'reference-comparison.png'
    ff(ins+['-filter_complex',fc,'-frames:v','1',packed])
    encode_webp(packed,REVIEW/'reference-comparison.webp')


def validate():
    report={'source_sha256':{},'sheets':{},'supervisor':{},'gif_reviews':{}}
    for f,expected in SOURCES.items():
        actual=hashlib.sha256((ROOT/f).read_bytes()).hexdigest()
        assert actual==expected,f'{f} modified'
        report['source_sha256'][f]=actual
    template=json.loads((ROOT/'img/workers/worker-th-carry-v1.json').read_text())
    for stem in ['crew-dam-carry-walk-v1','crew-dam-carry-rice-v1']:
        im=Image.open(ROOT/'img'/f'{stem}.webp');assert im.size==(2560,1280) and im.mode=='RGBA'
        meta=json.loads((ROOT/'img'/f'{stem}.json').read_text())
        assert {k:v for k,v in meta.items() if k not in ['image','source']}=={k:v for k,v in template.items() if k not in ['image','source']}
        rgba=np.array(im);a=rgba[:,:,3];assert set(np.unique(a))=={0,255}
        # A light fringe is a bright RGB pixel on the external alpha boundary.
        opaque=a>0
        interior=opaque.copy()
        interior[1:,:]&=opaque[:-1,:];interior[:-1,:]&=opaque[1:,:]
        interior[:,1:]&=opaque[:,:-1];interior[:,:-1]&=opaque[:,1:]
        edge=opaque & ~interior
        bright_edge=int(np.count_nonzero(edge & np.all(rgba[:,:,:3]>225,axis=2)))
        assert bright_edge==0,(stem,'bright external fringe')
        frame_metrics=[];masks=[]
        for row in range(4):
            rm=[]
            for col in range(8):
                cell=a[row*320:(row+1)*320,col*320:(col+1)*320]
                l,t,r,b=bounds(cell);foot=sole_center(cell)
                assert b==320 and abs(foot-160)<=4 and b-t==296
                rm.append(cell>0)
                frame_metrics.append({'row':row,'frame':col+1,'bounds':[l,t,r,b],'both_feet_projected_midpoint_x':foot,'sole_baseline_y':b,'silhouette_height':b-t})
            masks.append(rm)
        motion=[]
        for row in range(4):
            changes=[float(np.mean(masks[row][i]!=masks[row][(i+1)%8])) for i in range(8)]
            motion.append({'direction':DIRECTIONS[row],'adjacent_silhouette_difference_fraction':changes,'loop_seam':changes[-1],'largest_internal_transition':max(changes[:-1]),'seam_no_larger_than_internal':changes[-1]<=max(changes[:-1])+1e-9,'unique_playback_masks':len({m.tobytes() for m in masks[row]})})
        report['sheets'][stem]={'size':list(im.size),'mode':im.mode,'source_pose_order_1_based':[p+1 for p in PHASES],'unique_drawn_key_poses_per_direction':5,'pivot_measurement':'midpoint of visible feet within lowest 15% of silhouette, projected to sole baseline; up to 3px upper-body stabilization','frames':frame_metrics,'silhouette_height_variation_percent':0,'alpha_values':[0,255],'bright_external_boundary_pixels':bright_edge,'metadata_matches_template_except_image_and_source':True,'motion_metrics_not_visual_approval':motion}
    im=Image.open(ROOT/'img/crew-dam-supervise-v1.webp');a=np.array(im)[:,:,3]
    assert im.size==(512,512) and im.mode=='RGBA' and bounds(a)[1::2]==(1,511)
    report['supervisor']={'size':list(im.size),'mode':im.mode,'opaque_bounds':bounds(a),'reference_opaque_bounds':bounds(np.array(Image.open(ROOT/'img/crew-dam.webp'))[:,:,3])}
    for f in sorted(REVIEW.glob('*.gif')):
        im=Image.open(f);assert im.n_frames==8
        durations=[]
        for n in range(im.n_frames):im.seek(n);durations.append(im.info.get('duration'))
        # GIF timing has 10ms precision: use 120/130 ms alternation for average 125ms.
        assert durations==[130,120,130,120,130,120,130,120],(f.name,durations)
        assert im.info.get('loop')==0
        report['gif_reviews'][f.name]={'size':list(im.size),'frames':im.n_frames,'durations_ms':durations,'loop':im.info.get('loop')}
    (REVIEW/'measurements.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'files_checked':len(SOURCES),'sheets':len(report['sheets']),'gif_reviews':len(report['gif_reviews']),'supervisor':report['supervisor']},indent=2))

if __name__=='__main__':
    import sys
    if '--validate-only' not in sys.argv:
        build_sheet('carry','crew-dam-carry-walk-v1')
        build_supervisor()
        if (WORK/'rice-generated.png').exists():
            build_sheet('rice','crew-dam-carry-rice-v1')
            build_comparison()
    if (ROOT/'img/crew-dam-carry-rice-v1.webp').exists():validate()
