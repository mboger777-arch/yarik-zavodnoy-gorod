# уточнение координат глаз: центр зрачка (тёмное пятно) + размер белка
import numpy as np,json
from PIL import Image, ImageDraw
from scipy import ndimage
G={'y_idle':[(125,125),(171,127)],'y_point':[(127,124),(177,130)],'y_cheer':[(175,122),(225,122)],'u_idle':[(153,108),(205,103)],'u_talk':[(167,107),(218,97)],
 'u_cheer':[(189,178),(242,178)],'k_laugh':[(103,159),(167,159)],'k_kind':[(195,107),(257,98)],'p_sit':[(262,209),(398,209)],'p_talk':[(245,194),(392,216)]}
OUT={};tiles=[]
for n,gs in G.items():
  im=np.array(Image.open(f'assets/sprites/{n}.webp').convert('RGBA')).astype(float);rgb=im[...,:3];al=im[...,3];lum=rgb.mean(-1)
  H,W=lum.shape;yy,xx=np.mgrid[0:H,0:W];R=28 if n[0]=='p' else 18
  res=[]
  for gx,gy in gs:
    win=((xx-gx)**2+(yy-gy)**2<R*R)&(al>200)
    dark=win&(lum<np.percentile(lum[win],12))
    lab,nl=ndimage.label(dark)
    if nl:
      sz=ndimage.sum(dark,lab,range(1,nl+1));k=1+int(np.argmax(sz));ys,xs=np.where(lab==k);cx,cy=xs.mean(),ys.mean()
    else:cx,cy=gx,gy
    # белок: светлые малонасыщенные пиксели вокруг
    sat=rgb.max(-1)-rgb.min(-1)
    w2=((xx-cx)**2+(yy-cy)**2<(R*1.6)**2)&(al>200)
    wh=w2&(lum>170)&(sat<70)
    lab2,n2=ndimage.label(ndimage.binary_dilation(wh,iterations=1))
    # объединяем белок, касающийся зрачка
    eye=(lab2>0)&(np.hypot(xx-cx,yy-cy)<R*1.4)
    if eye.sum()>20:
      ys,xs=np.where(eye|dark&(lab==k if nl else dark));x0,x1,y0,y1=np.percentile(xs,3),np.percentile(xs,97),np.percentile(ys,3),np.percentile(ys,97)
      rx,ry=(x1-x0)/2,(y1-y0)/2;cx2,cy2=(x0+x1)/2,(y0+y1)/2
    else: rx=ry=R*.5;cx2,cy2=cx,cy
    res.append((int(cx2),int(cy2),int(rx),int(ry)))
  OUT[n]=res
  P=Image.fromarray(im.astype(np.uint8));bb=Image.new('RGBA',P.size,(90,140,90,255));bb.alpha_composite(P);d=ImageDraw.Draw(bb)
  for (cx,cy,rx,ry) in res:d.ellipse([cx-rx,cy-ry,cx+rx,cy+ry],outline=(255,0,0),width=1)
  ys=[r[1] for r in res];top=max(0,min(ys)-60);c=bb.crop((0,top,W,min(H,top+130))).convert('RGB');c=c.resize((c.width*2,c.height*2));tiles.append(c)
print(json.dumps(OUT))
json.dump(OUT,open('tools/eyes.json','w'))
S=Image.new('RGB',(sum(t.width for t in tiles[:5]),260*2),'black');x=0
for t in tiles[:5]:S.paste(t,(x,0));x+=t.width
x=0
for t in tiles[5:]:S.paste(t,(x,260));x+=t.width
S.save('/tmp/z306b/eyecheck.png')
