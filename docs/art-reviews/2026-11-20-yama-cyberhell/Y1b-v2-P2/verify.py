"""Read-only artifact acceptance checks, independent of compositor measurements."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
P=Path(__file__).resolve().parent
ROOT=P.parents[3]
def bounds(a,threshold):
 y,x=np.where(a>=threshold)
 return [int(x.min()),int(y.min()),int(x.max()+1),int(y.max()+1)]
def feet(a):
 m=a[520:600,90:380]>=128
 y=np.flatnonzero(m.any(axis=1))[-1];x=np.flatnonzero(m[y])+90
 return [(int(x.min())+int(x.max()))/2,int(y+520)]
def main():
 old=Image.open(P/'original.png').convert('RGBA')
 new=Image.open(ROOT/'img/yama-sword-v4/hero-yama-cyberhell-sword.webp')
 report=json.loads((P/'validation.json').read_text())
 assert old.size==new.size==(5120,640)
 assert new.mode=='RGBA'
 assert len(report['frames'])==8
 results=[]
 for i in range(8):
  o=np.array(old.crop((i*640,0,(i+1)*640,640)))
  n=np.array(new.crop((i*640,0,(i+1)*640,640)))
  assert np.array_equal(o,np.array(Image.open(P/f'original-{i+1:02}.png')))
  assert np.array_equal(n,np.array(Image.open(P/f'frame-{i+1:02}.png')))
  assert np.array_equal(o[:,:,3],n[:,:,3]),f'alpha mismatch frame {i+1}'
  for threshold in [1,128]:
   ob=bounds(o[:,:,3],threshold);nb=bounds(n[:,:,3],threshold)
   assert ob==nb
   assert abs((nb[3]-nb[1])/(ob[3]-ob[1])-1)<=0.02
  of=feet(o[:,:,3]);nf=feet(n[:,:,3]);assert max(abs(a-b) for a,b in zip(of,nf))<=2
  mask=np.array(Image.open(P/f'costume-mask-{i+1:02}.png'))>0
  visible_protected=(~mask)&(o[:,:,3]>0)
  assert np.array_equal(o[visible_protected],n[visible_protected]),f'protected pixel mismatch frame {i+1}'
  assert np.all(n[n[:,:,3]==0,:3]==0)
  changed=int(np.any(o[mask]!=n[mask],axis=1).sum())
  assert changed>20000,f'missing costume edit frame {i+1}'
  assert report['frames'][i]['old_bbox_alpha1']==ob or report['frames'][i]['old_bbox_alpha128']==ob
  assert report['frames'][i]['old_foot']==of
  results.append({'frame':i+1,'bbox_alpha1':bounds(n[:,:,3],1),'foot':nf,'changed_costume_pixels':changed,'changed_outside_costume_mask':0})
 gif=Image.open(P/'hero-yama-cyberhell-sword-compare.gif')
 assert gif.n_frames==8 and gif.info['loop']==0 and gif.size==(960,500)
 durations=[]
 for i in range(8):gif.seek(i);durations.append(gif.info['duration'])
 assert all(d>0 for d in durations)
 compare=Image.open(P/'compare.jpg');assert compare.size==(960,3840)
 assert (P/'README.md').exists() and (P/'prompts.json').exists()
 assert report['geometry_checks_pass']
 assert all(r['decoded_pixels_identical_to_composite'] for r in report['frames'])
 print(json.dumps({'checks':'artifact assertions completed','sheet_size':list(new.size),'mode':new.mode,'frames':results,'gif_frames':gif.n_frames,'gif_loop':0,'gif_durations_ms':durations,'compare_size':list(compare.size)},indent=2))
if __name__=='__main__':main()
