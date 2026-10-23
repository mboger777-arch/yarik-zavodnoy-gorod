# Нарезка листов refs/*.jpg -> assets/sprites|ui (birefnet-general, без ореола). /home/box/rbvenv/bin/python tools/cut.py [sheet]
from rembg import remove,new_session
from PIL import Image
import numpy as np,json,os,sys
from scipy import ndimage
import onnxruntime as ort
SO=ort.SessionOptions();SO.enable_cpu_mem_arena=False;SO.intra_op_num_threads=3
S=new_session('birefnet-general',sess_opts=SO)
def clean(a):
    al=a[...,3].copy();lab,n=ndimage.label(al>40)
    if n>=1:
        sz=ndimage.sum(np.ones_like(lab),lab,range(1,n+1));big=[i+1 for i,v in enumerate(sz) if v>=0.03*sz.max()]
        m=ndimage.binary_dilation(np.isin(lab,big),iterations=3);al=(al*m).astype(np.uint8)
    al[al<14]=0
    edge=(al>0)&(al<245);solid=al>=245
    if edge.any() and solid.any():
        idx=ndimage.distance_transform_edt(~solid,return_distances=False,return_indices=True)
        rgb=a[...,:3].copy();rgb[edge]=a[...,:3][idx[0][edge],idx[1][edge]];a[...,:3]=rgb
    a[...,3]=al;return a
SHEETS={
 'yarik_front':('sprites',['y_idle','y_cheer','y_point']),
 'yarik_run':('sprites',['y_run1','y_run2','y_jump','y_dash']),
 'yarik_act':('sprites',['y_swing','y_carry','y_throw','y_react']),
 'popr':('sprites',['p_sit','p_jump','p_ball','p_talk']),
 'ulya':('sprites',['u_idle','u_talk','u_cheer']),
 'kav':('sprites',['k_laugh','_k_s0','k_dizzy','k_kind']),
 'kav2':('sprites',['k_squat','k_fly','k_hit']),
 'props':('ui',['crate','ring','tramp','gear','mouse','mouse_dz','ball','medal']),
 'ui':('ui',['board','btn_t','btn_o','hook','slot','gate','hat','flipper'])}
KEY=set()
ONLYN=set(os.environ.get('ONLY','').split(','))-{''}
FILL={'board','btn_t','btn_o','crate','gear','ball','medal','gate'}
INFO=json.load(open('tools/cut_info.json')) if os.path.exists('tools/cut_info.json') else {}
only=sys.argv[1:]
for sh,(dst,names) in SHEETS.items():
    if only and sh not in only:continue
    img=Image.open(f'art/{sh}.jpg').convert('RGB');Wd,Hd=img.size
    if sh in KEY:
        A=np.array(img).astype(int);bgc=np.median(np.concatenate([A[:4].reshape(-1,3),A[-4:].reshape(-1,3)]),0);KD=np.abs(A-bgc).sum(2)
        m=ndimage.binary_fill_holes(ndimage.binary_opening(KD>60,iterations=2))
    else: m=np.array(remove(img,session=S,only_mask=True,post_process_mask=True))>90
    COLS=json.load(open('tools/cols.json')) if os.path.exists('tools/cols.json') else {}
    if sh in COLS:
        l2,n2=ndimage.label(ndimage.binary_dilation(m,iterations=2));cb=[0]+[c*Wd for c in COLS[sh]]+[Wd];lab=np.zeros_like(l2)
        cms=ndimage.center_of_mass(np.ones_like(l2),l2,range(1,n2+1));szs=ndimage.sum(np.ones_like(l2),l2,range(1,n2+1))
        for i,(cy,cx) in enumerate(cms):
            if szs[i]<0.002*m.size:continue
            col=[j for j in range(len(cb)-1) if cb[j]<=cx<cb[j+1]][0];lab[l2==i+1]=col+1
        n=len(cb)-1
    else: lab,n=ndimage.label(ndimage.binary_dilation(m,iterations={'ui':3,'props':4}.get(sh,int(Wd*.012))))
    objs=ndimage.find_objects(lab);sz=[(lab[o]==i+1).sum() for i,o in enumerate(objs)]
    bb=[(o[1].start,o[0].start,o[1].stop,o[0].stop) for i,o in enumerate(objs) if sz[i]>0.04*max(sz)]
    if len(names)==1: bb=[(min(b[0] for b in bb),min(b[1] for b in bb),max(b[2] for b in bb),max(b[3] for b in bb))]
    bb.sort(key=lambda b:(b[1]+b[3])/2);rows=[];
    for b in bb:
        if rows and abs((b[1]+b[3])/2-np.mean([(r[1]+r[3])/2 for r in rows[-1]]))<Hd*(.17 if sh in ('props','ui') else 1): rows[-1].append(b)
        else: rows.append([b])
    bb=[b for r in rows for b in sorted(r,key=lambda b:b[0])]
    if len(bb)!=len(names): print('!!',sh,'found',len(bb),'need',len(names),bb);continue
    os.makedirs(f'assets/{dst}',exist_ok=True)
    bg=np.array(img.getpixel((2,2)),np.uint8);A0=np.array(img)
    labs=[lab[b[1]:b[3],b[0]:b[2]] for b in bb]
    for oi,((x0,y0,x1,y1),nm) in enumerate(zip(bb,names)):
        own=lab[y0+(y1-y0)//2, x0+(x1-x0)//2] if False else None
        ids=np.unique(lab[y0:y1,x0:x1]);ids=ids[ids>0]
        # своя метка = самая частая в своём bbox
        cnt=[(lab[y0:y1,x0:x1]==i).sum() for i in ids];me=ids[int(np.argmax(cnt))]
        other=ndimage.binary_dilation((lab>0)&(lab!=me),iterations=4)&~ndimage.binary_dilation(lab==me,iterations=1)
        A=A0.copy();A[other]=bg;imgx=Image.fromarray(A)
        if (ONLYN and nm not in ONLYN) or nm.startswith('_'):continue
        pad=24;x0=max(0,x0-pad);y0=max(0,y0-pad);x1=min(Wd,x1+pad);y1=min(Hd,y1+pad)
        P=Image.new('RGB',(x1-x0+40,y1-y0+40),img.getpixel((2,2)));P.paste(imgx.crop((x0,y0,x1,y1)),(20,20))
        k=max(1,1000/max(P.size));P=P.resize((int(P.width*k),int(P.height*k)),Image.LANCZOS)
        if sh in KEY:
            Pa=np.array(P).astype(int);kd=np.abs(Pa-bgc).sum(2);mk=ndimage.binary_fill_holes(ndimage.binary_opening(kd>60,iterations=2))
            lb,nn=ndimage.label(mk);
            if nn>1:
                sz=ndimage.sum(np.ones_like(lb),lb,range(1,nn+1));mk=lb==(1+int(np.argmax(sz)))
            mk=ndimage.binary_erosion(mk,iterations=1);al=(np.clip(ndimage.gaussian_filter(mk.astype(float),1.0),0,1)*255).astype(np.uint8)
            o=np.dstack([np.array(P),al])
        else: o=clean(np.array(remove(P,session=S,post_process_mask=True)))
        if nm in FILL:
            Pa=np.array(P);fm=ndimage.binary_fill_holes(o[...,3]>40);hole=fm&(o[...,3]<250);o[...,:3][hole]=Pa[hole];o[...,3][hole]=255
        al=o[...,3]
        touch=bool(al[:3].max()>40 or al[-3:].max()>40 or al[:,:3].max()>40 or al[:,-3:].max()>40)
        im=Image.fromarray(o);im=im.crop(im.getbbox())
        mx=640 if dst=='sprites' else (900 if nm in ('board',) else 400)
        if max(im.size)>mx: k=mx/max(im.size);im=im.resize((round(im.width*k),round(im.height*k)),Image.LANCZOS)
        im.save(f'assets/{dst}/{nm}.webp',quality=90,method=5);INFO[nm]={'w':im.width,'h':im.height,'edge':touch};print(sh,nm,im.size,'EDGE!' if touch else '',flush=True)
    json.dump(INFO,open('tools/cut_info.json','w'),indent=1)
