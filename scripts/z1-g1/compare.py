import sys,os,json
sys.path.insert(0,'.')
from boot import *
import cv2,numpy as np
S='.'
OUT=sys.argv[1];os.makedirs(OUT,exist_ok=True)
tag=sys.argv[2] if len(sys.argv)>2 else 'after'
only=[int(x) for x in sys.argv[3].split(',')] if len(sys.argv)>3 else range(1,9)
A=json.load(open('affine.json'))
g=cv2.imread('ground_half.png',0);sift=cv2.SIFT_create(nfeatures=20000);kg,dg=sift.detectAndCompute(g,None)
def aff(im):
  k,d=sift.detectAndCompute(im,None);ms=cv2.BFMatcher().knnMatch(d,dg,k=2)
  good=[a for a,b in ms if a.distance<.75*b.distance]
  M,inl=cv2.estimateAffinePartial2D(np.float32([k[m.queryIdx].pt for m in good]),np.float32([kg[m.trainIdx].pt for m in good]),ransacReprojThreshold=4)
  return M,int(inl.sum())
with sync_playwright() as p:
  b,pg,errs=boot(p,1194,644,2)
  pg.click('#town-zoom-less');pg.wait_for_timeout(800)
  pg.evaluate("""async()=>{const d=await import('./src/data.js');for(const def of d.STATIONS){if(G.stations.some(s=>s.def.k===def.k))continue;G.stations.push({def,slots:[],crewK:null,intensity:3,build:0,buildWait:false,repair:0,repairWait:false,arrivalElapsed:0,fire:0,speedLv:0,capLv:0,fuelLv:0,mgCd:0});}G.syncBlocks&&G.syncBlocks(true);G.onChange&&G.onChange();}""")
  pg.wait_for_timeout(1500)
  for i in only:
    a=np.array(A[str(i)]);c=a@np.array([1194,644,1.0])/1.28
    cx,cy=float(c[0]),float(c[1])
    look(pg,cx,cy);pg.wait_for_timeout(3500)
    allshots=[]
    for attempt in range(5):
      pg.screenshot(path=f'{OUT}/_raw{i}.png')
      mine=cv2.imread(f'{OUT}/_raw{i}.png');M,n=aff(cv2.cvtColor(mine,cv2.COLOR_BGR2GRAY))
      wc=M@np.array([1194,644,1.0])/1.28;ex,ey=cx-wc[0],cy-wc[1]
      allshots.append((abs(ex)+abs(ey),mine.copy(),M))
      if attempt==0 or abs(ex)+abs(ey)<best[0]:best=(abs(ex)+abs(ey),mine.copy(),M)
      print('  attempt',attempt,'view-centre error',round(float(ex)),round(float(ey)),flush=True)
      if abs(ex)<12 and abs(ey)<12:break
      cx+=ex*0.6;cy+=ey*0.6;look(pg,cx,cy,wait=False);pg.wait_for_timeout(3500)
    _,mine,M=best
    # mine -> owner: owner = Ao^-1 (M mine)
    Mo=np.vstack([a,[0,0,1]]);Mm=np.vstack([M,[0,0,1]]);T=np.linalg.inv(Mo)@Mm
    owner=cv2.imread(f'/Users/agapae/agapae-work/feedback/2026-11-18-owner/{i}.JPG')
    warp=None
    for _,m2,M2 in sorted(allshots,key=lambda t:t[0]):
      Mm2=np.vstack([M2,[0,0,1]]);T2=np.linalg.inv(Mo)@Mm2
      w2=cv2.warpAffine(m2,T2[:2],(owner.shape[1],owner.shape[0]),flags=cv2.INTER_AREA)
      if warp is None:warp=w2
      else:
        hole=(warp.sum(axis=2)==0);warp[hole]=w2[hole]
    cv2.imwrite(f'{OUT}/_warp{i}.png',warp)
    pair=np.hstack([owner,warp]);pair=cv2.resize(pair,(pair.shape[1]//2,pair.shape[0]//2),interpolation=cv2.INTER_AREA)
    cv2.imwrite(f'{OUT}/{i:02d}-owner-vs-game-{tag}.jpg',pair,[cv2.IMWRITE_JPEG_QUALITY,82])
    print(i,'center',round(cx),round(cy),'inl',n,'scale',round(float(np.hypot(M[0,0],M[1,0])),4),flush=True)
  print(errs[:3]);b.close()
