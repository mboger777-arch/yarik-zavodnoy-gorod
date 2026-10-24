# Моргание для Попрыгуна (p_*) и Кавардака (k_*): глаза из tools/eyes.json (заданы вручную по картинке).
# Глаз закрывается мехом: кошке — копией шерсти со лба над глазом, еноту — inpaint по маске; сверху дуга века.
import numpy as np,cv2,sys,json
from PIL import Image
EY=json.load(open('tools/eyes.json'))
CFG={'p':dict(soft=.14,sc=1.12,fill='copy',th=.09,col=(70,32,10)),'k':dict(soft=.12,sc=1.12,fill='inpaint',th=.17,col=(12,10,10))}
for n in sys.argv[1:]:
  c=CFG[n[0]];im=np.array(Image.open(f'assets/sprites/{n}.webp').convert('RGBA'));H,W=im.shape[:2];al=im[...,3]
  out=im[...,:3].copy();yy,xx=np.mgrid[0:H,0:W];S=4;arcs=[]
  for (cx,cy,rx,ry) in EY[n]:
    m=(((xx-cx)/(rx*c['sc']))**2+((yy-cy)/(ry*c['sc']))**2<1).astype(np.uint8)
    m=(((xx-cx)/(rx*c['sc']))**2+((yy-cy+ry*.06)/(ry*c['sc']*1.06))**2<1).astype(np.uint8)
    ring=((((xx-cx)/(rx*1.6))**2+((yy-cy)/(ry*1.6))**2)<1)&((((xx-cx)/(rx*c['sc']*1.15))**2+((yy-cy)/(ry*c['sc']*1.15))**2)>1)&(al>250)
    if c['fill']=='copy':
      fill=cv2.inpaint(np.ascontiguousarray(out[...,::-1]),cv2.dilate(m*255,np.ones((5,5),np.uint8)),9,cv2.INPAINT_TELEA)[...,::-1].astype(float)
    else:
      rp=out[ring].astype(float);lum=rp.mean(1);base=np.median(rp[lum<np.percentile(lum,50)],0)*1.07
      fill=np.ones_like(out,dtype=float)*base[None,None,:]
    rng=np.random.default_rng(int(cx));nz=rng.normal(0,1,(H,W)).astype(np.float32)
    nz=cv2.GaussianBlur(nz,(1,9),0,sigmaY=3)  # шерстинки вдоль
    sd=out[ring].astype(float).std(0).mean()*(.55 if c['fill']=='copy' else .18)
    fill=fill+nz[...,None]*sd
    soft=cv2.GaussianBlur(m.astype(np.float32),(0,0),max(1.5,rx*c['soft']))[...,None]
    soft=np.clip(soft*1.6,0,1)
    out=np.clip(fill*soft+out*(1-soft),0,255).astype(np.uint8)
    arcs.append((cx,cy,rx,ry))
  big=cv2.resize(np.ascontiguousarray(out[...,::-1]),(W*S,H*S),interpolation=cv2.INTER_CUBIC)
  for (cx,cy,rx,ry) in arcs:
    hw=rx*.95*S;yc=(cy+ry*.05)*S;sag=ry*.32*S;th=max(3*S/2,rx*c['th']*S)
    pts=np.array([[cx*S+t*hw,yc+sag*(1-t*t)] for t in np.linspace(-1,1,48)],np.int32)
    col=tuple(int(v) for v in c['col'][::-1])
    cv2.polylines(big,[pts],False,col,int(th),cv2.LINE_AA)
    for t in (-1,1):
      px,py=cx*S+t*hw,yc;cv2.line(big,(int(px),int(py)),(int(px+t*hw*.16),int(py-sag*.45)),col,int(th*.6),cv2.LINE_AA)
  sm=cv2.resize(big,(W,H),interpolation=cv2.INTER_AREA)[...,::-1]
  res=np.dstack([sm,al]);Image.fromarray(res).save(f'assets/sprites/{n}_b.webp',quality=90);print(n,'ok')
