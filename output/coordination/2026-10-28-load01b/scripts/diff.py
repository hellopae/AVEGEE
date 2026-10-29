import sys,glob,os
from PIL import Image
import numpy as np
a,b=sys.argv[1:3]
for f in sorted(glob.glob(a+'/*.png')):
    n=os.path.basename(f)
    g=b+'/'+n
    if not os.path.exists(g): continue
    x=np.asarray(Image.open(f).convert('RGB')).astype(int);y=np.asarray(Image.open(g).convert('RGB')).astype(int)
    if x.shape!=y.shape: print(n,'SHAPE',x.shape,y.shape);continue
    d=np.abs(x-y).max(axis=2)
    print(f"{n:32s} differing px {np.count_nonzero(d)/d[...,0].size*100 if d.ndim>2 else np.count_nonzero(d)/d.size*100:6.3f}%  >8: {np.count_nonzero(d>8)/d.size*100:6.3f}%  max {d.max():3d}  mean {np.abs(x-y).mean():.4f}")
