'use strict';
// ===== Бонус «Попрыгун-пинбол»: Попрыгун-шарик, бамперы 2-4-6-8-10 по порядку =====
const PIN_SC={
 enter(){music('title');const w=new pl.World({gravity:V(0,-10)});const P=this.P={w,acc:0,next:0,lit:[0,0,0,0,0],done:false,t0:T,bump:[],fl:[],ball:null,gl:0};
  const ground=w.createBody();const wall=[[5.75,1.05],[0,3.2],[0,8.2],[1,9],[15,9],[16,8.2],[16,3.2],[10.25,1.05]];
  for(let i=0;i<wall.length-1;i++)ground.createFixture(pl.Edge(V(...wall[i]),V(...wall[i+1])),{restitution:.3,friction:.1});
  // нижние «рогатки» у стенок
  ground.createFixture(pl.Edge(V(1.6,4.6),V(3.4,2.9)),{restitution:.9,userData:{k:'sling',d:1}});ground.createFixture(pl.Edge(V(14.4,4.6),V(12.6,2.9)),{restitution:.9,userData:{k:'sling',d:-1}});
  [[2,3.6,6.9],[4,8,7.7],[6,12.4,6.9],[8,5.6,4.9],[10,10.4,4.9]].forEach((b,i)=>{const bd=w.createBody({position:V(b[1],b[2])});bd.createFixture(pl.Circle(.62),{restitution:.6,userData:{k:'bump',i}});P.bump.push({v:b[0],x:b[1],y:b[2],hit:0,i})});
  for(const left of[true,false]){const px=left?5.95:10.05,py=1.05;const b=w.createBody({type:'dynamic',position:V(px,py),bullet:true});const s=left?1:-1;
   b.createFixture(pl.Polygon([V(0,.2),V(0,-.2),V(s*1.9,-.07),V(s*1.9,.07)]),{density:2,friction:.2});
   const j=w.createJoint(pl.RevoluteJoint({enableLimit:true,lowerAngle:-.5,upperAngle:.5,enableMotor:true,maxMotorTorque:900,motorSpeed:0},ground,b,V(px,py)));
   b.setAngle(left?-.5:.5);P.fl.push({b,j,left,px,py,up:false})}
  this.spawn();
  w.on('begin-contact',c=>{const a=c.getFixtureA().getUserData()||{},b=c.getFixtureB().getUserData()||{};const u=a.k?a:b.k?b:null;if(!u)return;P.ev=P.ev||[];P.ev.push(u)});
  run(async()=>{await wait(300);await say('pb_s')})},
 spawn(){const P=this.P;if(P.ball)P.w.destroyBody(P.ball);P.ball=P.w.createBody({type:'dynamic',position:V(8+rnd(-.5,.5),8.2),bullet:true});P.ball.createFixture(pl.Circle(.42),{density:1,restitution:.45,friction:.2});P.ball.setLinearVelocity(V(rnd(-2,2),0));SFX.boing()},
 inp(){let l=false,r=false;for(const p of PTR.values()){if(p.own==='ui')continue;if(p.x<640)l=true;else r=true}
  if(KEYS.ArrowLeft||KEYS.KeyA||KEYS.ShiftLeft||KEYS.KeyZ)l=true;if(KEYS.ArrowRight||KEYS.KeyD||KEYS.ShiftRight||KEYS.Slash)r=true;if(EXT.pl)l=true;if(EXT.pr)r=true;return[l,r]},
 update(dt){const P=this.P;const [l,r]=this.inp();
  for(const f of P.fl){const on=f.left?l:r;if(on&&!f.up){SFX.snap();vib(8)}f.up=on;f.j.setMotorSpeed(f.left?(on?18:-12):(on?-18:12))}
  P.acc+=dt;let n=0;while(P.acc>=1/60&&n<4){P.w.step(1/60,8,3);P.acc-=1/60;n++;
   for(const u of P.ev||[])this.hit(u);P.ev=[];
   const v=P.ball.getLinearVelocity(),s=v.length();if(s>16)P.ball.setLinearVelocity(V(v.x*16/s,v.y*16/s))}
  if(n>=4)P.acc=0;for(const b of P.bump)b.hit=Math.max(0,b.hit-dt*3);P.gl=Math.max(0,P.gl-dt*2);
  const q=P.ball.getPosition();if(q.y<-1||q.x<-1||q.x>17||q.y>10)this.spawn();
  // застрял — лёгкий толчок
  if(P.ball.getLinearVelocity().length()<.15){P.still=(P.still||0)+dt;if(P.still>3){P.still=0;P.ball.setLinearVelocity(V(rnd(-2,2),9));SFX.boing()}}else P.still=0;
  stepParticles()},
 hit(u){const P=this.P;const q=P.ball.getPosition();
  if(u.k==='bump'){const b=P.bump[u.i];const dx=q.x-b.x,dy=q.y-b.y,d=Math.hypot(dx,dy)||1;P.ball.setLinearVelocity(V(dx/d*11,dy/d*11));b.hit=1;SFX.bumper();vib(10);
   const [cx,cy]=this.d(b.x,b.y);if(!P.done&&b.v===[2,4,6,8,10][P.next]){P.lit[u.i]=1;P.next++;SFX.star();burst(cx,cy,26,'spark',50);if(P.next>=5)this.win()}else burst(cx,cy,10,'spark',200)}
  if(u.k==='sling'){P.ball.setLinearVelocity(V(u.d*8,9));SFX.boing()}},
 win(){const P=this.P;P.done=true;SV.pin=1;save();SFX.fanfare();vib([30,50,30]);const v=vis();for(let i=0;i<5;i++)setTimeout(()=>{if(G.scene==='pin')burst(v.x0+v.w*(.15+i*.17),v.y0+60,40,'conf')},i*180);sayNow('pb_ok')},
 geo(){const v=vis();const k=Math.min(70,(v.w-60)/16.6,(safeB()-safeT()-90)/9.7);const yb=safeB()-8-k*.55;return{k,yb}},
 d(x,y){const g=this.geo();return[640+(x-8)*g.k,g.yb-y*g.k]},
 draw(){const P=this.P;bgCover('map');dim(.35);const {k}=this.geo();const d=(x,y)=>this.d(x,y);
  const wall=[[5.75,1.05],[0,3.2],[0,8.2],[1,9],[15,9],[16,8.2],[16,3.2],[10.25,1.05]];
  X.save();X.beginPath();wall.forEach((p,i)=>{const [x,y]=d(...p);i?X.lineTo(x,y):X.moveTo(x,y)});const [bx,by]=d(8,-.2);X.lineTo(...d(10.25,-.2));X.lineTo(...d(5.75,-.2));X.closePath();
  const g=X.createLinearGradient(0,d(0,9)[1],0,d(0,0)[1]);g.addColorStop(0,'#4a2a6a');g.addColorStop(1,'#24123a');X.fillStyle=g;X.fill();X.lineWidth=k*.18;X.strokeStyle='#e0b25a';X.lineJoin='round';X.stroke();X.restore();
  X.save();X.strokeStyle='#ffd27a';X.lineWidth=k*.14;X.lineCap='round';for(const s of[[[1.6,4.6],[3.4,2.9]],[[14.4,4.6],[12.6,2.9]]]){X.beginPath();X.moveTo(...d(...s[0]));X.lineTo(...d(...s[1]));X.stroke()}X.restore();
  for(const b of P.bump){const [x,y]=d(b.x,b.y);const r=.62*k*(1+b.hit*.25);const lit=P.lit[b.i],nx=!P.done&&b.v===[2,4,6,8,10][P.next];X.save();if(lit||nx){X.shadowColor=lit?'#ffe066':'#9ef3ff';X.shadowBlur=nx?20+10*Math.sin(T*6):24}
   const gg=X.createRadialGradient(x,y-r*.3,r*.1,x,y,r);gg.addColorStop(0,lit?'#fff3a0':'#ffffff');gg.addColorStop(1,lit?'#e8a020':'#d0c0e8');X.fillStyle=gg;X.beginPath();X.arc(x,y,r,0,7);X.fill();X.lineWidth=k*.08;X.strokeStyle=nx?'#9ef3ff':'#5a2a7a';X.stroke();X.restore();
   txt(String(b.v),x,y+2,r*1.05,'#1d1030',{f:NUM,st:'#fff',lw:4,box:[x-r*.8,y-r*.8,x+r*.8,y+r*.8],id:'bump',kind:'num'})}
  for(const f of P.fl){const p=f.b.getPosition(),a=f.b.getAngle();const [x,y]=d(p.x,p.y);const h=2.41*k*.6;
   if(okI(IM.flipper))spr('flipper',x,y,h,{ax:.84,ay:.19,flip:f.left,rot:f.left?-a-.357:-(Math.PI+a)-(Math.PI-.357)});
   else{X.save();X.translate(x,y);X.rotate(-a);X.fillStyle='#e8873a';rr(f.left?0:-1.9*k,-.18*k,1.9*k,.36*k,.18*k);X.fill();X.restore()}}
  {const q=P.ball.getPosition();const [x,y]=d(q.x,q.y);spr('p_ball',x,y,.84*k*1.12,{rot:-P.ball.getAngle()})}
  // порядок вверху
  const n=5,ts=Math.min(56,k*.8),gap=10,w=n*ts+(n-1)*gap+30,cx=640,cy=safeT()+40;X.fillStyle='rgba(43,25,58,.9)';rr(cx-w/2,cy-ts/2-10,w,ts+20,16);X.fill();X.strokeStyle='#e0b25a';X.lineWidth=3;X.stroke();
  [2,4,6,8,10].forEach((v,i)=>{const x=cx-w/2+15+ts/2+i*(ts+gap);const lit=i<P.next;X.fillStyle=lit?'#ffd54a':'#fffaf0';rr(x-ts/2,cy-ts/2,ts,ts,ts*.2);X.fill();if(i===P.next&&!P.done){X.strokeStyle='#9ef3ff';X.lineWidth=4;X.stroke()}
   txt(String(v),x,cy+2,ts*.62,'#1d1030',{f:NUM,st:'#fff',lw:4,box:[x-ts/2,cy-ts/2,x+ts/2,cy+ts/2],id:'order',kind:'num'})});
  if(T-P.t0<6&&!P.done){const [lx,ly]=d(4,.6),[rx]=d(12,.6);hand(Math.max(safeL()+60,lx-k*3),ly-20,0);hand(Math.min(safeR()-60,rx+k*3),ly-20,0)}
  drawTalk();drawParticles()},
 ui(){roundBtn('home',safeL()+42,safeT()+42,76,r=>houseIcon(r),()=>{SFX.click();go('map')});
  if(this.P.done&&!talk)boardBtn('tomap',640,vis().y0+vis().h*.5,300,'На карту',()=>go('map'),{pulse:1})}};
