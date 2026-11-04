import struct,sys
def parse(path):
    f=open(path,'rb');d={}
    sig,ver,res,ch,h,w,depth,mode=struct.unpack('>4sH6sHIIHH',f.read(26))
    d['hdr']=(sig,ver,ch,h,w,depth,mode)
    n=struct.unpack('>I',f.read(4))[0];f.seek(n,1)  # color mode data
    n=struct.unpack('>I',f.read(4))[0];f.seek(n,1)  # image resources
    lm_len=struct.unpack('>Q' if ver==2 else '>I',f.read(8 if ver==2 else 4))[0]
    lm_start=f.tell()
    li_len=struct.unpack('>Q' if ver==2 else '>I',f.read(8 if ver==2 else 4))[0]
    cnt=struct.unpack('>h',f.read(2))[0];neg=cnt<0;cnt=abs(cnt)
    layers=[]
    for i in range(cnt):
        t,l,b,r,nch=struct.unpack('>iiiiH',f.read(18))
        chans=[]
        for c in range(nch):
            cid,clen=struct.unpack('>hQ' if ver==2 else '>hI',f.read(10 if ver==2 else 6));chans.append((cid,clen))
        bsig,bm,op,clip,flags,_=struct.unpack('>4s4sBBBB',f.read(12))
        ex=struct.unpack('>I',f.read(4))[0];exs=f.tell()
        m=struct.unpack('>I',f.read(4))[0];f.seek(m,1)
        bl=struct.unpack('>I',f.read(4))[0];f.seek(bl,1)
        nl=ord(f.read(1));nm=f.read(nl)
        pad=(nl+1)%4; 
        name=nm.decode('latin1')
        # try unicode name block
        rest=ex-(f.tell()-exs-0)
        extra=f.read(max(0,exs+ex-f.tell()-0)) if False else b''
        f.seek(exs+ex)
        layers.append(dict(i=i,top=t,left=l,bottom=b,right=r,chans=chans,op=op,flags=flags,name=name))
    d['layers']=layers;d['data_start']=f.tell();d['f']=f;d['ver']=ver
    return d
if __name__=="__main__":
    d=parse(sys.argv[1]);print(d['hdr'])
    for l in d['layers']:print(l['i'],l['name'],l['left'],l['top'],l['right']-l['left'],l['bottom']-l['top'],l['op'],l['flags'],[c for c in l['chans']])

def unpackbits(data,n):
    out=bytearray();i=0
    while i<len(data) and len(out)<n:
        c=data[i];i+=1
        if c<128: out+=data[i:i+c+1];i+=c+1
        elif c>128: out+=bytes([data[i]])*(257-c);i+=1
    return bytes(out)
def layer_rgba(d,idx):
    import numpy as np
    f=d['f'];pos=d['data_start']
    for l in d['layers']:
        if l['i']==idx:break
        pos+=sum(c[1] for c in l['chans'])
    l=d['layers'][idx];h=l['bottom']-l['top'];w=l['right']-l['left'];planes={}
    for cid,clen in l['chans']:
        f.seek(pos);raw=f.read(clen);pos+=clen
        comp=struct.unpack('>H',raw[:2])[0];body=raw[2:]
        if comp==0:arr=np.frombuffer(body,np.uint8)[:w*h]
        elif comp==1:
            counts=struct.unpack('>%dH'%h,body[:2*h]);p=2*h;rows=[]
            for c in counts:rows.append(unpackbits(body[p:p+c],w));p+=c
            arr=np.frombuffer(b''.join(rows),np.uint8)
        else:raise Exception('comp %d'%comp)
        planes[cid]=arr.reshape(h,w)
    rgba=np.dstack([planes[0],planes[1],planes[2],planes[-1]]);return rgba
