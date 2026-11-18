import cv2,numpy as np,sys
S='/private/tmp/claude-501/-Users-agapae-Documents-Work-PAE-Claude-AGAPAE-Agent/1c14c246-0c1e-407d-b3fa-d98d27ebb721/scratchpad/g1'
CL={ # name:(H lo,hi,S lo,hi,V lo,hi, bgr draw)
 'green':(38,62,170,255,120,255,(0,255,0)),
 'blue':(95,108,70,170,200,255,(255,200,0)),
 'blueB':(100,115,171,255,150,255,(255,0,0)),
 'orange':(8,20,200,255,200,255,(0,140,255)),
 'yellow':(20,32,90,200,225,255,(0,255,255)),
 'teal':(78,94,60,255,170,255,(200,200,0)),
 'dkgreen':(55,85,90,255,70,170,(0,100,0)),
}
def masks(im):
  hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV);H,Sx,V=[hsv[...,k].astype(int) for k in range(3)]
  out={}
  for n,(a,b,c,d,e,f,_) in CL.items():
    m=((H>=a)&(H<=b)&(Sx>=c)&(Sx<=d)&(V>=e)&(V<=f)).astype(np.uint8)
    out[n]=m
  return out
if __name__=='__main__':
  for i in range(1,9):
    im=cv2.imread(f'/Users/agapae/agapae-work/feedback/2026-11-18-owner/{i}.JPG')
    ms=masks(im);o=np.zeros_like(im)
    for n,m in ms.items(): o[m>0]=CL[n][6]
    cv2.imwrite(S+f'/stroke{i}.png',cv2.resize(o,(1194,644),interpolation=cv2.INTER_AREA))
