"""Read-only verification of the two P4 sheets and review artifacts."""
from pathlib import Path
import json, hashlib
import numpy as np
from PIL import Image

P=Path(__file__).resolve().parent
ROOT=P.parents[3]
v=json.loads((P/'validation.json').read_text())
assert v['scope']=='P4 only' and v['imagegen_calls']==8
assert len(v['sheets'])==2
count=0
for s in v['sheets']:
    path=ROOT/s['path'];k=path.stem.rsplit('-',1)[1]
    assert hashlib.sha256(path.read_bytes()).hexdigest()==s['sha256']
    im=Image.open(path)
    assert im.format=='WEBP' and im.mode=='RGBA' and im.size==(5120,640)
    assert s['grid']==[8,1] and s['cell']==[640,640] and len(s['frames'])==8
    for i,row in enumerate(s['frames']):
        o=np.array(Image.open(P/'original-frames'/f'{k}-{i}.png'))
        n=np.array(im.crop((640*i,0,640*(i+1),640)))
        mask=np.array(Image.open(P/'masks'/f'costume-{i}.png'))>0
        assert np.array_equal(o[:,:,3],n[:,:,3]),(k,i,'alpha')
        keep=(~mask)&(o[:,:,3]>0)
        assert np.array_equal(o[keep],n[keep]),(k,i,'preserved RGB')
        assert np.any(o[mask,:3]!=n[mask,:3]),(k,i,'no costume change')
        for threshold,ob,nb in [(0,'original_bbox','new_bbox'),(128,'original_opaque_bbox','new_opaque_bbox')]:
            a=Image.fromarray(np.uint8(o[:,:,3]>threshold)*255).getbbox()
            b=Image.fromarray(np.uint8(n[:,:,3]>threshold)*255).getbbox()
            assert list(a)==row[ob] and list(b)==row[nb]
            assert abs((b[3]-b[1])/(a[3]-a[1])-1)<=.02
        feet=[]
        for a in [o,n]:
            boot=a[:,:,3]>128;boot[:540]=False;boot[:,370:]=False
            yy,xx=np.where(boot);y=int(yy.max());xs=np.flatnonzero(boot[y])
            feet.append([float((xs.min()+xs.max())/2),y])
        assert feet==[row['original_foot'],row['new_foot']]
        assert max(abs(a-b) for a,b in zip(*feet))<=2
        # Every pixel that differs between cane/fang must remain its own original weapon.
        other='fang' if k=='cane' else 'cane'
        alt=np.array(Image.open(P/'original-frames'/f'{other}-{i}.png'))
        weapon=np.any(o!=alt,axis=2)&((o[:,:,3]>0)|(alt[:,:,3]>0))
        assert np.array_equal(o[weapon],n[weapon]),(k,i,'weapon')
        count+=1
    gif=Image.open(P/f'compare-{k}.gif')
    assert gif.n_frames==8 and gif.size==(960,510) and gif.info.get('loop')==0
    for i in range(8):
        gif.seek(i);assert gif.info['duration']==150;gif.load()
compare=Image.open(P/'compare.jpg');compare.verify()
assert Image.open(P/'compare.jpg').size==(2560,5440)
assert (P/'README.md').read_text().startswith('# Y1b-v2-P4')
assert len(json.loads((P/'prompts.json').read_text())['frames'])==8
print(f'Inspected {count} frames in 2 lossless RGBA WebP sheets; alpha, preserved pixels, bbox, feet, weapon pixels, 2 looping GIFs and compare.jpg verified.')
