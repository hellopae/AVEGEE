"""Rebuild ground/alpha evidence and measure repaired visible phases.
No generated art: only crops, diagnostic overlays, and arithmetic on held frames.
"""
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from build_assets import crop, terrain

ROOT = Path(__file__).resolve().parents[1]


def write(name, value):
    (ROOT/name).write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n')


def overlay(base, alpha):
    tint=Image.new('RGBA',base.size,(255,25,135,0))
    tint.putalpha(alpha.point(lambda a: round(a*.40)))
    return Image.alpha_composite(base.convert('RGBA'),tint).convert('RGB')


def panel(images, labels, dest):
    width=max(im.width for im in images);height=max(im.height for im in images)
    out=Image.new('RGB',(width*len(images),height+36),'#17171e');d=ImageDraw.Draw(out)
    for i,(im,label) in enumerate(zip(images,labels)):
        out.paste(im,(i*width,36));d.text((i*width+4,6),label,fill='white')
    out.save(dest,quality=66,method=6)


def main():
    layout=json.loads((ROOT/'fx-layout.json').read_text());ground=terrain()
    pieces={p['mask']:p for p in layout['pieces']}
    repairs=json.loads((ROOT/'review/mask-correction-result.json').read_text())
    proofs=[]
    for change in repairs['changes']:
        name=change['mask'];piece=pieces[name];rect=piece['maskRectPx']
        before=Image.open(ROOT/'review/before-masks'/(name+'.webp')).getchannel('A')
        after=Image.open(ROOT/'masks'/(name+'.webp')).getchannel('A')
        if name.startswith('icefall-'):
            base=crop(ground,rect)
            dest=ROOT/'review/boundary'/(name+'-repair.webp')
            panel([base,overlay(base,before),overlay(base,after)],['v7 ground (native 2x)','BEFORE mask','AFTER mask'],dest)
            panel([base,overlay(base,after)],['v7 ground (native 2x)','CURRENT mask; magenta'],ROOT/'review/boundary'/(name+'.webp'))
            proofs.append(str(dest.relative_to(ROOT)))
    # Ground-only traces remain available beside the diagnostic bank overlays.
    bank=next(c for c in json.loads((ROOT/'review/mask-corrections.json').read_text())['cuts'] if c['mask']=='shore-band-ice')
    shore=pieces['shore-band-ice'];sx,sy,_,_=shore['maskRectPx']
    before=Image.open(ROOT/'review/before-masks/shore-band-ice.webp').getchannel('A')
    after=Image.open(ROOT/'masks/shore-band-ice.webp').getchannel('A')
    for name in dict.fromkeys(s['groundCrop'] for s in bank['bankSegments']):
        rect=pieces[name]['maskRectPx'];x,y,w,h=rect;base=crop(ground,rect)
        box=[(x-sx)*2,(y-sy)*2,(x+w-sx)*2,(y+h-sy)*2]
        images=[base,overlay(base,before.crop(box)),overlay(base,after.crop(box))]
        for im in images:im.thumbnail((500,500))
        dest=ROOT/'review/boundary'/(name+'-shore-repair.webp')
        panel(images,['v7 ground','BEFORE bank mask','AFTER bank mask'],dest);proofs.append(str(dest.relative_to(ROOT)))
    # The full RGB artwork is unchanged. Measure only the CURRENT effective mask,
    # not obsolete sheet-alpha regions removed by the external production mask.
    loops=[]
    for piece in layout['pieces']:
        if piece['group'] not in ['waterfall','lavafall']:continue
        image=Image.open(ROOT/'sheets'/piece['sheet']).convert('RGBA');fw,fh=piece['frameW'],piece['frameH']
        mask=Image.open(ROOT/'masks'/(piece['mask']+'.webp')).getchannel('A').resize((fw,fh),Image.Resampling.NEAREST)
        frames=[np.asarray(image.crop((i*fw,0,(i+1)*fw,fh))) for i in range(piece['frames'])]
        visible=(np.array(mask)>0)&np.logical_and.reduce([f[:,:,3]>0 for f in frames])
        rgb=[f[:,:,:3][visible].astype('float32') for f in frames]
        deltas=[float(np.abs(rgb[(i+1)%len(rgb)]-rgb[i]).mean()) for i in range(len(rgb))]
        median=float(np.median(deltas));loops.append({'id':piece['mask'],'frames':len(frames),'frameSize':[fw,fh],
            'currentEffectiveMaskPixelsAtFrameSize':int(visible.sum()),'distinctVisiblePhases':len({hashlib.sha256(a.tobytes()).hexdigest() for a in rgb}),
            'maskedAdjacentRgbMAEIncludingWrap':deltas,'wrapToMedianRatio':deltas[-1]/max(.001,median),
            'largestToMedianRatio':max(deltas)/max(.001,median),'temporalSynthesis':False,'visualSmoothnessVerified':False})
    write('loop-review.json',{'method':'Recomputed after alpha repairs. RGB deltas inside CURRENT external mask AND common sheet alpha; all transitions including 8->1. Original painted source frames held; no shifted/faded frame synthesis.','frames':loops,'visualPlaybackReviewed':False,'limitation':'Changed pixels and numeric loop deltas do not establish smooth playback.'})
    # A visual ground witness independently exposes missing waterfall coverage.
    # This was traced on input/icefall-summit.png, never on construction geometry.
    local=[[359,617],[377,623],[396,626],[405,635],[411,642],[401,642],[382,637],[369,629]]
    piece=pieces['icefall-summit'];rect=piece['maskRectPx'];base=crop(ground,rect)
    ref=Image.new('L',base.size);ImageDraw.Draw(ref).polygon([tuple(p) for p in local],fill=255)
    wx,wy,ww,wh=rect
    combined=Image.new('L',base.size)
    for p in layout['pieces']:
        if p.get('off'):continue
        x,y,w,h=p['maskRectPx']
        if x+w<=wx or y+h<=wy or x>=wx+ww or y>=wy+wh:continue
        a=Image.open(ROOT/'masks'/(p['mask']+'.webp')).getchannel('A')
        layer=Image.new('L',base.size);layer.paste(a,((x-wx)*2,(y-wy)*2))
        combined=Image.fromarray(np.maximum(np.array(combined),np.array(layer)))
    selected=np.array(ref)>0;covered=np.array(combined)>0
    annotated=base.copy();ImageDraw.Draw(annotated).polygon([tuple(p) for p in local],outline='yellow',width=2)
    box=(310,585,470,675);images=[im.crop(box).resize((480,270),Image.Resampling.NEAREST) for im in [annotated,overlay(base,combined)]]
    dest=ROOT/'review/boundary/summit-lower-drop-coverage.webp'
    panel(images,['Ground-only waterfall witness','Union of ALL current effect masks'],dest)
    write('review/coverage-witness-result.json',{'groundReference':'input/icefall-summit.png','coordinatePolicy':'Local native 2x pixels in original v7 ground crop; not construction annotation.','polygon':local,
        'label':'Small sloping waterfall below the summit pool; visible lip, falling strands and base foam.','witnessPixels':int(selected.sum()),'coveredByAnyCurrentEffectMaskPixels':int((selected&covered).sum()),
        'uncoveredWitnessPixels':int((selected&~covered).sum()),'evidence':str(dest.relative_to(ROOT)),
        'status':'confirmed-coverage-gap' if np.any(selected&~covered) else 'this-witness-covered',
        'limitation':'One independently inspected witness, not an exhaustive count of all waterfalls. Existing generated full-crop frames were inspected; no unverified extension of their alpha was made.'})
    write('review/repair-review.json',{'proofs':proofs,'currentBoundaryImagesRebuiltFor':['icefall-upper-tree','icefall-summit','icefall-east-cliff'],'loopMeasurements':18,'coverageWitness':'review/coverage-witness-result.json','acceptanceComplete':False})
    print('Rebuilt',len(proofs),'repair comparisons; measured',len(loops),'fall loops; uncovered witness pixels',int((selected&~covered).sum()))


if __name__=='__main__':main()
