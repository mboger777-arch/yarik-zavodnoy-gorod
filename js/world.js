'use strict';
// ===== Мир: физика planck.js, герой, предметы, камера, отрисовка, управление =====
const pl=planck,V=pl.Vec2;
const TU={g:-30,fallMul:1.7,maxFall:-22,run:7.5,accG:75,accA:42,decG:90,jumpV:12.8,jumpCut:.45,coyote:.12,buffer:.14,dashV:16,dashT:.2,dashCD:.4,hookR:7.5,tapR:13,reel:6,minRope:3.2,pump:16,relBoost:1.1,relUp:3,carryK:14,throwMaxD:15,springV:19,knockV:[8,7],stompV:13};
const VH=7.6;// видимая высота мира в метрах
let LV=null;// текущий уровень
const FX={shake:0,hit:0,slow:1,flash:0,flashC:'#fff'};
function addShake(a){FX.shake=Math.min(1,FX.shake+a)}
function hitstop(t){FX.hit=Math.max(FX.hit,t)}
// ---------- построение уровня ----------
function newLevel(o){
 const w=new pl.World({gravity:V(0,TU.g)});
 const L=Object.assign({world:w,solids:[],slopes:[],pads:[],rings:[],crates:[],slots:[],gates:[],mice:[],gears:[],items:[],doors:[],signs:[],npcs:[],steps:[],deco:[],wp:[],rfx:[],floats:[],ev:[],t:0,tasks:[],cur:0,done:false,
  bounds:{x0:-5,x1:100,y0:-6},killY:-14,spawn:{x:2,y:2},check:{x:2,y:2},cam:{x:2,y:2},hookR:TU.hookR,tapR:TU.tapR},o);
 LV=L;mkPlayer(L);
 w.on('begin-contact',c=>contact(c,true));w.on('end-contact',c=>contact(c,false));
 w.on('pre-solve',c=>{const a=c.getFixtureA().getUserData()||{},b=c.getFixtureB().getUserData()||{};
  const pc=a.k==='player'?b:b.k==='player'?a:null;
  if(pc&&pc.k==='crate'){const cb=pc.c;if(cb&&(cb.held||cb.noPlayer>0||cb.pinned))c.setEnabled(false)}
  if(pc&&pc.k==='door'&&(pc.d.open||pc.d.good))c.setEnabled(false);
  if(a.k==='crate'&&b.k==='crate'){for(const [x,y] of [[a.c,b.c],[b.c,a.c]])if(x&&y&&x.pass&&(x.thrown>0||x.passT>0)&&y.pinned&&!y.imp)c.setEnabled(false)}
  if((a.k==='crate'&&b.k==='crate')){const A=a.c,B=b.c;if(A.held||B.held)c.setEnabled(false)}
  if((a.k==='crate'&&b.k==='oneway')||(b.k==='crate'&&a.k==='oneway')||(pc&&pc.k==='oneway')){// одностороння платформа: снизу проходим
   const o=a.k==='oneway'?b:a;const body=o.k==='player'?ST.P:o.c&&o.c.b;const ow=a.k==='oneway'?a:b;if(body){const v=body.getLinearVelocity(),p=body.getPosition();const bot=o.k==='player'?p.y-.8:p.y-(o.c.s||.5)*.9;if(v.y>.5||bot<ow.top-.25)c.setEnabled(false)}}});
 w.on('post-solve',(c,imp)=>{const n=imp&&imp.normalImpulses?imp.normalImpulses[0]:0;if(n<2.5)return;const a=c.getFixtureA().getUserData()||{},b=c.getFixtureB().getUserData()||{};
  if(a.k==='crate'||b.k==='crate'){const wm=c.getWorldManifold();if(wm&&wm.points[0])L.ev.push({e:'impact',p:{x:wm.points[0].x,y:wm.points[0].y},n,c:(a.k==='crate'?a:b).c})}});
 return L}
function ud(k,o){return Object.assign({k},o||{})}
function box(x1,y1,x2,y2,o){o=o||{};const b=LV.world.createBody({type:o.type||'static',position:V((x1+x2)/2,(y1+y2)/2)});
 b.createFixture(pl.Box((x2-x1)/2,(y2-y1)/2),{friction:o.fr==null?.8:o.fr,restitution:o.rest||0,isSensor:!!o.sensor,userData:o.ud||ud('ground')});return b}
const mk={
 ground(x1,y1,x2,y2,o){o=o||{};const b=box(x1,y1,x2,y2,o.oneway?{ud:ud('oneway',{top:y2})}:{});const s={x1,y1,x2,y2,b,look:o.look||'tile',oneway:o.oneway};LV.solids.push(s);return s},
 slope(pts,o){o=o||{};const b=LV.world.createBody({type:'static'});for(let i=0;i<pts.length-1;i++)b.createFixture(pl.Edge(V(pts[i][0],pts[i][1]),V(pts[i+1][0],pts[i+1][1])),{friction:.6,userData:ud('ground')});const s={pts,b,depth:o.depth||8};LV.slopes.push(s);return s},
 pad(x,y,w,o){o=o||{};const b=box(x-w/2,y-.15,x+w/2,y+.15,{});const p={x,y,w,to:o.to||null,v:o.v||TU.springV,squash:0,hidden:o.hidden,b};b.createFixture(pl.Box(w/2-.05,.12,V(0,.2),0),{isSensor:true,userData:ud('pad',{p})});LV.pads.push(p);return p},
 ring(x,y,o){o=o||{};const b=LV.world.createBody({type:'static',position:V(x,y)});const r=Object.assign({x,y,b,sym:null,good:null,land:null,pulse:Math.random()*6,slip:0,used:0},o);LV.rings.push(r);return r},
 crate(v,x,y,o){o=o||{};const s=o.s||(String(v).length>1?.6:.5);const b=LV.world.createBody({type:o.pinned?'static':'dynamic',position:V(x,y),angularDamping:1.5,bullet:true});
  const c=Object.assign({b,v,s,home:{x,y},held:false,noPlayer:0,solved:false,ball:!!o.ball,light:!!o.light,deco:v==null,shake:0,wob:0},o);
  b.createFixture(c.ball?pl.Circle(s):pl.Box(s,s),{density:c.light?.3:1,friction:c.ball?.4:.6,restitution:c.ball?.35:.12,userData:ud('crate',{c})});b.c=c;LV.crates.push(c);return c},
 slot(x,y,want,o){o=o||{};const b=LV.world.createBody({type:'static',position:V(x,y)});const sl=Object.assign({x,y,want,b,solved:false,rej:0,act:true,size:.6},o);b.createFixture(pl.Box(sl.size,sl.size),{isSensor:true,userData:ud('slot',{sl})});LV.slots.push(sl);return sl},
 gate(x,y0,h,o){o=o||{};const b=LV.world.createBody({type:'kinematic',position:V(x,y0+h/2)});b.createFixture(pl.Box(.45,h/2),{userData:ud('ground')});const g=Object.assign({x,y0,h,b,open:false,lift:0},o);LV.gates.push(g);return g},
 mouse(x,y,x1,x2){const b=LV.world.createBody({type:'dynamic',position:V(x,y),fixedRotation:true});const m={b,state:'patrol',t:0,dir:-1,x1,x2,dizzy:0,anim:0};b.createFixture(pl.Box(.55,.36),{density:2,friction:.2,userData:ud('mouse',{m})});LV.mice.push(m);return m},
 gear(x,y,i){const g={x,y,i,got:SV.gears[i]?2:0,t:0};LV.gears.push(g);return g},
 item(kind,x,y,o){const it=Object.assign({kind,x,y,got:0,t:0},o||{});LV.items.push(it);return it},
 door(x,y0,h,v,good,o){o=o||{};const b=LV.world.createBody({type:'static',position:V(x,y0+h/2)});const d=Object.assign({x,y0,h,v,good,b,open:false,rej:0,task:o.task},o);b.createFixture(pl.Box(.3,h/2),{restitution:0,userData:ud('door',{d})});LV.doors.push(d);return d},
 sign(x,y,vals,o){const s=Object.assign({x,y,vals,size:.9},o||{});LV.signs.push(s);return s},
 npc(who,x,y,o){const n=Object.assign({who,x,y,face:1,h:who==='u'?1.75:1.2},o||{});LV.npcs.push(n);return n},
 step(x,w,h,v,o){o=o||{};const y0=o.base||0;const b=box(x-w/2,y0,x+w/2,y0+Math.max(.2,h),{});const s=Object.assign({x,w,h,v,b,y0},o);LV.steps.push(s);LV.solids.push({x1:x-w/2,y1:y0,x2:x+w/2,y2:y0+h,b,look:'step',st:s});return s}};
// ---------- игрок ----------
let ST=null;
function mkPlayer(L){const w=L.world;const P=w.createBody({type:'dynamic',position:V(L.spawn.x,L.spawn.y),fixedRotation:true,bullet:true});
 P.createFixture(pl.Box(.36,.55,V(0,.1),0),{density:1,friction:0,userData:ud('player')});P.createFixture(pl.Circle(V(0,-.45),.37),{density:1,friction:0,userData:ud('player')});
 P.createFixture(pl.Box(.28,.08,V(0,-.85),0),{isSensor:true,userData:ud('foot')});
 ST={P,ground:0,coyote:0,buffer:0,face:1,dash:0,dashCD:0,airDash:true,hook:null,ring:null,hookT:0,carry:null,stun:0,land:0,prevVy:0,throwT:0,launch:0,dashId:0,react:0,cheer:0,run:0,idleT:0,noGrab:0,lock:0,ctrl:true,talkT:0,walk:null,stepT:0,jumpCut:false}}
function contact(c,on){const fa=c.getFixtureA(),fb=c.getFixtureB();const a=fa.getUserData()||{},b=fb.getUserData()||{};
 const pair=(k1,k2)=>a.k===k1&&b.k===k2?[a,b,fa,fb]:b.k===k1&&a.k===k2?[b,a,fb,fa]:null;
 // ноги
 const fo=a.k==='foot'?[b,fb]:b.k==='foot'?[a,fa]:null;
 if(fo&&!fo[1].isSensor()){ST.ground=Math.max(0,ST.ground+(on?1:-1))}
 if(!on)return;
 let q;
 if(q=pair('pad','player'))LV.ev.push({e:'pad',p:q[0].p});
 if(q=pair('pad','crate'))LV.ev.push({e:'padc',p:q[0].p,c:q[1].c});
 if(q=pair('slot','crate'))LV.ev.push({e:'slot',sl:q[0].sl,c:q[1].c});
 if(q=pair('player','crate'))if(ST.dash>0)LV.ev.push({e:'dashHit',c:q[1].c});
 if(q=pair('mouse','player'))LV.ev.push({e:'mouseHit',m:q[0].m});
 if(q=pair('mouse','crate'))LV.ev.push({e:'mouseCrate',m:q[0].m,c:q[1].c});
 if(q=pair('door','player'))LV.ev.push({e:'door',d:q[0].d});
 if(q=pair('crate','crate')){LV.ev.push({e:'cc',a:q[0].c,b:q[1].c})}
 if(q=pair('player','ground'))LV.ev.push({e:'pg'});
}
// ---------- ввод ----------
const INP={x:0,jump:false,act:false,jumpP:false,actP:false,ring:null};const EXT={x:null,jump:false,act:false};
let STICK=null,BTN={};
function ctrlLayout(){const v=vis();const R=Math.min(84,v.w*.07);const jb={x:safeR()-R*1.15,y:safeB()-R*1.2,r:R};const ab={x:jb.x-R*2.35,y:safeB()-R*.95,r:R*.86};
 return{jump:jb,act:ab,stick:{x:safeL()+110,y:safeB()-105,r:78}}}
function w2s(x,y){const K=H/VH;return[(x-LV.cam.x)*K+W/2,H/2-(y-LV.cam.y)*K]}
function s2w(cx,cy){const K=H/VH;return[(cx-W/2)/K+LV.cam.x,(H/2-cy)/K+LV.cam.y]}
function d2css(x,y){return[x*S+OX,y*S+OY]}
function handleTaps(){if(!LV)return;const L=ctrlLayout();
 for(const t of TAPS){const p=PTR.get(t.id);if(hitUI(t.x,t.y)){continue}
  const dj=Math.hypot(t.x-L.jump.x,t.y-L.jump.y),da=Math.hypot(t.x-L.act.x,t.y-L.act.y);
  if(dj<L.jump.r*1.3&&dj<=da){INP.jumpP=true;if(p)p.own='jump';continue}
  if(da<L.act.r*1.35){INP.actP=true;if(p)p.own='act';continue}
  // кольцо под пальцем?
  const [cx,cy]=d2css(t.x,t.y);const [wx,wy]=s2w(cx,cy);let best=null,bd=1.6;for(const r of LV.rings){if(r.hidden)continue;const d=Math.hypot(r.x-wx,r.y-wy);if(d<bd){bd=d;best=r}}
  if(best){INP.ring=best;if(p)p.own='ring';continue}
  if(LV.onTap&&LV.onTap(wx,wy)){continue}
  const v=vis();if(t.x<v.x0+v.w*.5&&!STICK&&p){p.own='stick';STICK={id:t.id,ox:t.x,oy:t.y}}
  else if(t.x>=v.x0+v.w*.5&&p){INP.jumpP=true;p.own='jump'}}
 TAPS=[]}
function readInput(){let x=(KEYS.ArrowRight||KEYS.KeyD?1:0)-(KEYS.ArrowLeft||KEYS.KeyA?1:0);
 if(STICK){const p=PTR.get(STICK.id);if(!p)STICK=null;else{let dx=p.x-STICK.ox;if(Math.abs(dx)>70){STICK.ox=p.x-Math.sign(dx)*70;dx=Math.sign(dx)*70}x=clamp(dx/52,-1,1);if(Math.abs(x)<.2)x=0}}
 if(EXT.x!==null)x=EXT.x;INP.x=x;let j=false,a=false;for(const p of PTR.values()){if(p.own==='jump')j=true;if(p.own==='act')a=true}
 if(KEYS.Space||KEYS.ArrowUp||KEYS.KeyW)j=true;if(KEYS.KeyX||KEYS.KeyJ||KEYS.KeyK)a=true;
 if((KEYS.Space||KEYS.ArrowUp||KEYS.KeyW)&&!INP._kj)INP.jumpP=true;INP._kj=KEYS.Space||KEYS.ArrowUp||KEYS.KeyW;
 if((KEYS.KeyX||KEYS.KeyJ||KEYS.KeyK)&&!INP._ka)INP.actP=true;INP._ka=KEYS.KeyX||KEYS.KeyJ||KEYS.KeyK;
 INP.jump=j||EXT.jump;INP.act=a||EXT.act}
// ---------- помощники ----------
function nearestRing(){const p=ST.P.getPosition();let best=null,bd=1e9;for(const r of LV.rings){if(r.hidden||r.slip>0||r.task!=null)continue;const dx=r.x-p.x,dy=r.y-p.y;if(dy<.8)continue;const d=Math.hypot(dx,dy);if(d>LV.hookR)continue;const sc=d-dx*ST.face*.4;if(sc<bd){bd=sc;best=r}}return best}
function nearCrate(){const p=ST.P.getPosition();let best=null,bd=9;for(const c of LV.crates){if(c.v==null||c.solved||c.held||c.noPlayer>0||c.pinned||c.nograb||c.ng>0||c.dead)continue;const q=c.b.getPosition();const dx=Math.abs(q.x-p.x),dy=q.y-p.y;if(dx<.75+c.s&&dy>-1.2&&dy<1.2){const d=dx+Math.abs(dy);if(d<bd){bd=d;best=c}}}return best}
function actionKind(){if(ST.carry)return'throw';if(ST.hook)return'hook';if(nearestRing())return'hook';return'dash'}
function grab(c){ST.carry=c;c.held=true;c.b.setGravityScale(0);c.b.setAngularVelocity(0);SFX.grab();vib(10);const q=c.b.getPosition();ringFX(q.x,q.y,'#7ef',.9);LV.onGrab&&LV.onGrab(c)}
function dropCarry(){const c=ST.carry;if(!c)return;ST.carry=null;c.held=false;c.b.setGravityScale(1);c.noPlayer=.5}
function throwTarget(c){if(!LV.targets)return null;const p=c.b.getPosition();let best=null,bd=1e9;for(const t of LV.targets(c)){const dx=t.x-p.x,dy=t.y-p.y;if(!t.any&&Math.sign(dx)!==ST.face&&Math.abs(dx)>1.2)continue;if(Math.abs(dx)>TU.throwMaxD||dy>9||dy<-6)continue;const d=Math.abs(dx)+Math.abs(dy)*.5-(t.pri||0)*3;if(d<bd){bd=d;best=t}}return best}
function throwVel(p,t){const dx=t.x-p.x,dy=t.y-p.y;const g=-TU.g;if(t.direct){const tt=clamp(Math.hypot(dx,dy)/14,.3,.8);return[dx/tt,(dy+.5*g*tt*tt)/tt]}// навесом: подбираем вершину дуги, чтобы ящик перелетел ступеньки и стенки
 const xa=Math.min(p.x,t.x),xb=Math.max(p.x,t.x),obs=[];for(const q of (LV&&LV.solids)||[]){if(q.x2<xa-.2||q.x1>xb+.2||Math.abs((q.x1+q.x2)/2-t.x)<.6||q.y2>p.y+5)continue;obs.push(q)}
 const sol=top=>{const vy=Math.sqrt(2*g*top);const tt=vy/g+Math.sqrt(2*Math.max(.02,top-dy)/g);return[dx/tt,vy,tt]};
 let top=Math.max(0,dy)+clamp(Math.abs(dx)*.2,.9,2.4),r=sol(top);
 for(let k=0;k<14&&obs.length;k++){r=sol(top);let hit=false;for(let i=1;i<24&&!hit;i++){const tm=r[2]*i/24,x=p.x+r[0]*tm,y=p.y+r[1]*tm-.5*g*tm*tm;for(const q of obs)if(x>q.x1-.45&&x<q.x2+.45&&y<q.y2+.45&&y>q.y1-.45){hit=true;break}}if(!hit)break;top+=.35}
 return[r[0],r[1]]}
function throwCrate(){const c=ST.carry;ST.carry=null;c.held=false;c.noPlayer=.35;c.b.setGravityScale(1);ST.throwT=.3;ST.noGrab=.45;
 const p=c.b.getPosition();let vx=ST.face*9,vy=6;const t=throwTarget(c);if(t){if(t.any&&Math.abs(t.x-p.x)>.6)ST.face=Math.sign(t.x-p.x);[vx,vy]=throwVel(p,t)}
 c.b.setLinearVelocity(V(vx,vy));c.b.setAngularVelocity(-ST.face*6);c.thrown=3.2;c.pass=!!(t&&t.direct);c.tgt=t||null;SFX.throw();addShake(.1);vib(8);LV.onThrow&&LV.onThrow(c,t)}
function hookTo(r){const P=ST.P,p=P.getPosition();if(ST.hook)unhook(false);if(ST.carry)dropCarry();const L=Math.hypot(r.x-p.x,r.y-p.y);
 ST.hook=LV.world.createJoint(new pl.RopeJoint({bodyA:r.b,bodyB:P,localAnchorA:V(0,0),localAnchorB:V(0,.4),maxLength:L,collideConnected:false}));
 ST.ring=r;ST.hookT=0;ST.airDash=true;ST.dash=0;P.setGravityScale(1);r.pulse=0;r.used++;SFX.hook();vib(12);ringFX(r.x,r.y,'#9ff',1.2);
 if(r.x!==p.x)ST.face=Math.sign(r.x-p.x)||ST.face;LV.onHook&&LV.onHook(r);if(r.good===false)r.slipAt=.5}
function unhook(boost){if(!ST.hook)return;LV.world.destroyJoint(ST.hook);ST.hook=null;const r=ST.ring;ST.ring=null;
 if(boost){const P=ST.P,v=P.getLinearVelocity();if(r&&r.land){launchTo(r.land.x,r.land.y,1.4)}else P.setLinearVelocity(V(v.x*TU.relBoost,Math.max(v.y*TU.relBoost,0)+TU.relUp));SFX.release();const p=P.getPosition();wburst(p.x,p.y,10,'#bff',4,.4)}}
// баллистика «точно на площадку»: управление выключено на время полёта
function launchTo(tx,ty,apex){ty+=.85;const P=ST.P,p=P.getPosition();const g=-TU.g,gf=g*TU.fallMul;const top=Math.max(ty,p.y)+(apex||1.6);const vy=Math.sqrt(2*g*Math.max(.3,top-p.y));const t=vy/g+Math.sqrt(2*Math.max(.05,top-ty)/gf);const vx=(tx-p.x)/t;
 P.setLinearVelocity(V(vx,vy));ST.launch=t+.05;ST.lt={x:tx,y:ty};ST.face=Math.sign(vx)||ST.face;ST.dash=0;P.setGravityScale(1);ST.airDash=true}
function teleport(x,y){if(ST.hook)unhook(false);ST.P.setTransform(V(x,y),0);ST.P.setLinearVelocity(V(0,0));ST.launch=0;ST.dash=0}
// ---------- шаг физики ----------
function stepWorld(dt){const L=LV,P=ST.P;L.t+=dt;readInput();
 const v=P.getLinearVelocity(),p=P.getPosition();const grounded=ST.ground>0&&v.y<=.6;
 if(grounded){ST.coyote=TU.coyote;ST.airDash=true;if(ST.prevVy<-8){wburst(p.x,p.y-.85,10,'#e8d6b0',3,.35);addShake(Math.min(.22,-ST.prevVy/90));SFX.land(-ST.prevVy/18);ST.land=.14;if(ST.prevVy<-14)vib(10)}ST.launch=0}else ST.coyote-=dt;
 ST.prevVy=v.y;const ctrl=ST.ctrl&&ST.lock<=0;
 const ix=ctrl?INP.x:(ST.walk!=null?Math.sign(ST.walk-p.x)*(Math.abs(ST.walk-p.x)>.15?1:0)*.6:0);
 if(ix&&ST.launch<=0)ST.face=Math.sign(ix);
 if(INP.jumpP&&ctrl)ST.buffer=TU.buffer;else ST.buffer-=dt;
 if(ctrl&&INP.ring){const r=INP.ring;const d=Math.hypot(r.x-p.x,r.y-p.y);if(d<L.tapR&&r.y>p.y+.5&&!(ST.hook&&ST.ring===r))hookTo(r);else if(!ST.hook){ringFX(r.x,r.y,'#ffd27a',.8)}}
 if(ctrl&&INP.actP){const k=actionKind();
  if(k==='throw')throwCrate();
  else if(k==='hook'){if(ST.hook){if(ST.hookT>.15)unhook(true)}else hookTo(nearestRing())}
  else if(k==='dash'&&ST.dashCD<=0&&(grounded||ST.airDash)){ST.dash=TU.dashT;ST.dashCD=TU.dashCD;ST.dashId++;ST.launch=0;if(!grounded)ST.airDash=false;P.setGravityScale(0);SFX.dash();addShake(.06);vib(8);L.onDash&&L.onDash()}}
 INP.jumpP=false;INP.actP=false;INP.ring=null;
 if(ST.hook&&ST.buffer>0&&ST.hookT>.12){ST.buffer=0;const r=ST.ring;unhook(true);if(!r||!r.land){const v2=P.getLinearVelocity();P.setLinearVelocity(V(v2.x,Math.max(v2.y,TU.jumpV*.8)))}}
 let vx=v.x,vy=v.y;
 if(ST.stun>0){ST.stun-=dt}
 else if(ST.dash>0){ST.dash-=dt;vx=ST.face*TU.dashV;vy=0;if(Math.random()<.85)L.wp.push({x:p.x,y:p.y,vx:0,vy:0,life:.2,t:0,col:'#6cf',ghost:pose(),face:ST.face});if(ST.dash<=0){P.setGravityScale(1);vx=ST.face*TU.run}}
 else if(ST.hook){ST.hookT+=dt;const r=ST.ring,j=ST.hook;const Lr=j.getMaxLength();if(Lr>TU.minRope)j.setMaxLength(Math.max(TU.minRope,Lr-TU.reel*dt));
  const dx=p.x-r.x,dy=p.y-r.y,d=Math.hypot(dx,dy)||1;const tx=-dy/d,ty=dx/d;const vt=v.x*tx+v.y*ty;
  let dir=ix?Math.sign(tx)===Math.sign(ix)?1:-1:0;if(!dir&&r.land&&r.good!==false){dir=Math.sign(vt)||Math.sign(r.land.x-r.x)*Math.sign(tx)}else if(!dir&&Math.abs(vt)>.5)dir=Math.sign(vt)*.6;
  if(dir&&dy<0)P.applyForceToCenter(V(tx*dir*TU.pump*P.getMass(),ty*dir*TU.pump*P.getMass()));
  if(r.good===false){r.slipAt-=dt;if(r.slipAt<=0){r.slip=1.2;unhook(false);P.setLinearVelocity(V(v.x*.3,-2));SFX.slip();vib(30);addShake(.2);wburst(r.x,r.y,16,'#ff6a5a',4,.5);ST.react=1;L.onSlip&&L.onSlip(r)}}
  else if(r.land){const sd=Math.sign(r.land.x-r.x);if((p.x-r.x)*sd>.9&&v.y>-.5&&ST.hookT>.35)unhook(true)}
  ST.face=Math.sign(v.x)||ST.face;return finish(dt)}
 else if(ST.launch>0){ST.launch-=dt;if(vy<0)vy+=TU.g*(TU.fallMul-1)*dt;
  // наведение: если стенка погасила скорость — после подъёма над ней всё равно долетаем до цели
  if(ST.lt){const g=-TU.g,gf=g*TU.fallMul;const top=p.y+(vy>0?vy*vy/(2*g):0);if(top>ST.lt.y){const tr=(vy>0?vy/g:0)+Math.sqrt(2*Math.max(.05,top-ST.lt.y)/gf);vx=(ST.lt.x-p.x)/Math.max(.12,tr);ST.launch=Math.max(ST.launch,tr)}}}
 else{const target=ix*TU.run;const a=grounded?(ix?TU.accG:TU.decG):TU.accA;const dv=target-vx;vx+=Math.sign(dv)*Math.min(Math.abs(dv),a*dt);
  if(ST.buffer>0&&ST.coyote>0){vy=TU.jumpV;ST.buffer=0;ST.coyote=0;SFX.jump();wburst(p.x,p.y-.85,6,'#fff',2,.25);L.onJump&&L.onJump()}
  if(!INP.jump&&vy>0&&!ST.jumpCut&&!grounded&&ctrl){vy*=TU.jumpCut;ST.jumpCut=true}
  if(grounded||vy<=0)ST.jumpCut=false;
  if(vy<0)vy+=TU.g*(TU.fallMul-1)*dt;vy=Math.max(vy,TU.maxFall);
  if(grounded&&Math.abs(vx)>2){ST.stepT-=dt*Math.abs(vx);if(ST.stepT<0){ST.stepT=1.6;SFX.step();if(Math.random()<.5)L.wp.push({x:p.x-ST.face*.3,y:p.y-.8,vx:-ST.face*.5,vy:.6,life:.35,t:0,col:'rgba(230,214,180,.8)',r:.09})}}}
 P.setLinearVelocity(V(vx,vy));return finish(dt)}
function finish(dt){const L=LV,P=ST.P,p=P.getPosition();ST.dashCD-=dt;ST.throwT-=dt;ST.react-=dt;ST.cheer-=dt;ST.noGrab-=dt;ST.land-=dt;ST.lock-=dt;
 if(ST.carry){const b=ST.carry.b,q=b.getPosition();const tx=p.x-ST.face*.15,ty=p.y+1.05+ST.carry.s;const pv=P.getLinearVelocity();b.setLinearVelocity(V((tx-q.x)*TU.carryK+pv.x*.3,(ty-q.y)*TU.carryK+pv.y*.3));b.setAngularVelocity(-b.getAngle()*8-pv.x*.1)}
 else if(!ST.hook&&ST.noGrab<=0&&ST.dash<=0){const c=nearCrate();if(c)grab(c)}
 for(const c of L.crates){if(c.noPlayer>0)c.noPlayer-=dt;if(c.thrown>0)c.thrown-=dt;if(c.passT>0)c.passT-=dt;c.shake=Math.max(0,c.shake-dt*3);if(c.ng>0)c.ng-=dt;c.wob=Math.max(0,c.wob-dt*2)}
 for(const r of L.rings)if(r.slip>0)r.slip-=dt;
 for(const s of L.slots)if(s.rej>0)s.rej-=dt;
 for(const d of L.doors)if(d.rej>0)d.rej-=dt;
 for(const pd of L.pads)pd.squash=Math.max(0,pd.squash-dt*4);
 mice(dt);
 // шестерёнки, предметы
 for(const g of L.gears){g.t+=dt;if(g.got)continue;if(Math.hypot(g.x-p.x,g.y-p.y)<1.1){g.got=1;SV.gears[g.i]=1;save();SFX.gear();vib([15,30,15]);wburst(g.x,g.y,30,'#ffd54a',6,.7);ringFX(g.x,g.y,'#ffd54a',2);floatT('+1','#ffd54a',g.x,g.y+.8);sayNow('g_gear')}}
 for(const it of L.items){it.t+=dt;if(it.got||it.hidden)continue;if(Math.hypot(it.x-p.x,it.y-p.y)<1.1){it.got=1;SFX.gear();wburst(it.x,it.y,24,'#c9a0ff',5,.6);ringFX(it.x,it.y,'#c9a0ff',1.6);it.on&&it.on(it)}}
 for(const sl of L.slots){if(sl.solved||!sl.act||sl.rej>0)continue;for(const c of L.crates){if(c.held||c.dead||c.solved||c.v==null)continue;const fly=c.thrown>0;if(!fly){if(c.spat===sl&&!c.held){const q=c.b.getPosition(),dx=q.x-sl.x,dy=q.y-sl.y;if(Math.abs(dx)<sl.size+.9&&dy>-(sl.size+.9)&&dy<sl.size+2.6){const v=c.b.getLinearVelocity();if(Math.abs(v.y)<1.5&&Math.abs(v.x)<2){const d=Math.sign(dx)||c.spD||-1;c.b.setLinearVelocity(V(d*4,sl.spit?sl.spit[1]*.8:8));c.ng=Math.max(c.ng,1)}}else if(Math.abs(dx)>3.5||dy<-3)c.spat=null}continue}if(fly&&c.tgt&&c.tgt.x!=null&&(Math.abs(c.tgt.x-sl.x)>.05||Math.abs(c.tgt.y-sl.y)>.05))continue;const q=c.b.getPosition();const tol=sl.size+(fly?.3:.15);if(Math.abs(q.x-sl.x)<tol&&Math.abs(q.y-sl.y)<tol){L.ev.push({e:'slot',sl,c,src:'pos'});break}}}
 // события
 while(L.ev.length){const e=L.ev.shift();handleEv(e)}
 for(const g of L.gates){const target=g.open?g.y0+g.h/2+g.h+.2:g.y0+g.h/2;const y=g.b.getPosition().y;g.b.setLinearVelocity(V(0,clamp((target-y)*4,-6,6)))}
 for(const s of L.steps){if(s.rise!=null){const y=s.b.getPosition().y;}}
 // страховка: выпал — пружина возвращает
 if(p.y<L.killY){teleport(L.check.x,L.check.y+1);ST.P.setLinearVelocity(V(0,6));SFX.boing();ringFX(L.check.x,L.check.y,'#fd6',1.6);sayNow('g_spring')}
 for(const c of L.crates){const q=c.b.getPosition();if((q.y<L.killY||q.x<L.bounds.x0-2||q.x>L.bounds.x1+2)&&!c.pinned&&!c.solved){if(c.respawn===false){c.dead=1;continue}c.b.setTransform(V(c.home.x,c.home.y+1),0);c.b.setLinearVelocity(V(0,0));c.b.setAngularVelocity(0);wburst(c.home.x,c.home.y+1,12,'#fff',3,.4)}}
 L.update&&L.update(dt);
 L.world.step(dt,8,3)}
function handleEv(e){const L=LV,P=ST.P;
 if(e.e==='pad'){const pd=e.p;if(pd.hidden&&!pd.found){pd.found=1}const p=P.getPosition();if(ST.hook)return;
  if(pd.to)launchTo(pd.to.x,pd.to.y,pd.apex||1.8);else{const v=P.getLinearVelocity();P.setLinearVelocity(V(v.x,pd.v));ST.launch=0}
  ST.airDash=true;pd.squash=1;ringFX(p.x,pd.y+.2,'#fd6',1.6);SFX.boing();addShake(.18);wburst(p.x,pd.y+.3,14,'#fd6',5,.5);vib(15);L.onPad&&L.onPad(pd)}
 if(e.e==='padc'){const c=e.c;if(c.held)return;const v=c.b.getLinearVelocity();c.b.setLinearVelocity(V(v.x,12));e.p.squash=.6;SFX.boing()}
 if(e.e==='slot'){const sl=e.sl,c=e.c;if(sl.solved||c.solved||!sl.act||c.v==null||sl.rej>0||(c.held&&!sl.grabOK))return;if(!(c.thrown>0))return;if(c.thrown>0&&c.tgt&&c.tgt.x!=null&&(Math.abs(c.tgt.x-sl.x)>.05||Math.abs(c.tgt.y-sl.y)>.05))return;
  const ok=typeof sl.want==='function'?sl.want(c.v):c.v===sl.want;
  (G.slog=G.slog||[]).push({v:c.v,ok,th:+c.thrown.toFixed(2),tg:c.tgt&&c.tgt.x,sl:sl.x,src:e.src||'c'});
  if(ok){sl.solved=true;c.solved=true;if(ST.carry===c)ST.carry=null;c.held=false;const tx=sl.px==null?sl.x:sl.px,ty=sl.py==null?sl.y:sl.py;
   setTimeout(()=>{try{c.b.setType('static');c.b.setTransform(V(tx,ty),0);c.b.setLinearVelocity(V(0,0))}catch(_){}},0);
   hitstop(.1);FX.slow=.35;addShake(.45);wburst(tx,ty,40,'#ffd54a',8,.9);ringFX(tx,ty,'#ffd54a',3);SFX.ok();vib([20,40,30]);ST.cheer=1.4;sl.onOk&&sl.onOk(c)}
  else{sl.rej=.6;c.passT=c.thrown>0?.9:0;c.thrown=0;c.tgt=null;c.spat=sl;if(ST.carry===c)ST.carry=null;c.held=false;c.b.setGravityScale(1);const p=P.getPosition();const dir=Math.sign(p.x-sl.x)||-1;c.spD=dir;
   setTimeout(()=>{c.b.setLinearVelocity(V(dir*(sl.spit?sl.spit[0]:5),sl.spit?sl.spit[1]:9));c.b.setAngularVelocity(dir*8)},0);c.noPlayer=.6;c.shake=1;c.ng=2.5;
   addShake(.2);wburst(sl.x,sl.y,14,'#ff6a5a',5,.45);SFX.spit();vib(30);ST.react=.8;floatT('?','#ff8a7a',sl.x,sl.y+1);sl.onBad&&sl.onBad(c)}}
 if(e.e==='mouseHit'){const m=e.m,p=P.getPosition(),q=m.b.getPosition(),v=P.getLinearVelocity();
  if(m.state==='dead')return;
  if(p.y>q.y+.55&&v.y<1.5){P.setLinearVelocity(V(v.x,TU.stompV));ST.launch=0;m.state='dizzy';m.t=0;m.dizzy=2.5;addShake(.2);hitstop(.05);wburst(q.x,q.y+.4,14,'#fff',4,.4);SFX.stomp();vib(15);floatT('Бум!','#fff',q.x,q.y+1.2);L.onStomp&&L.onStomp(m)}
  else if(ST.dash>0){m.state='dizzy';m.t=0;m.dizzy=2.5;m.b.setLinearVelocity(V(ST.face*6,7));hitstop(.05);addShake(.2);SFX.stomp();wburst(q.x,q.y,12,'#fff',4,.4)}
  else if(ST.stun<=0&&m.state!=='dizzy'){const d=Math.sign(p.x-q.x)||1;if(ST.hook)unhook(false);dropCarry();P.setLinearVelocity(V(d*TU.knockV[0],TU.knockV[1]));ST.stun=.3;ST.launch=0;ST.react=.8;hitstop(.06);addShake(.3);wburst(p.x,p.y,12,'#fa5',5,.4);SFX.bad();vib(25);m.state='dizzy';m.t=0;m.dizzy=1}}
 if(e.e==='mouseCrate'){const m=e.m,c=e.c;if(c.held||m.state==='dizzy')return;const sp=c.b.getLinearVelocity().length();if(sp>4){m.state='dizzy';m.t=0;m.dizzy=2.5;m.b.applyLinearImpulse(V(0,6*m.b.getMass()),m.b.getPosition());addShake(.25);hitstop(.05);SFX.stomp()}}
 if(e.e==='dashHit'){const c=e.c;if(c.held||c.solved||c.hitAt===ST.dashId)return;c.hitAt=ST.dashId;L.onDashHit&&L.onDashHit(c);if(c.pinned)return;
  c.b.applyLinearImpulse(V(ST.face*5.5*c.b.getMass(),3.5*c.b.getMass()),c.b.getWorldPoint(V(0,.2)),true);hitstop(.04);addShake(.22);const q=c.b.getPosition();wburst(q.x,q.y,10,'#e8c79a',5,.4);SFX.smash()}
 if(e.e==='door'){const d=e.d;if(d.open)return;L.onDoor&&L.onDoor(d)}
 if(e.e==='cc'){L.onCC&&L.onCC(e.a,e.b)}
 if(e.e==='impact'){const c=e.c;if(e.n>5){wburst(e.p.x,e.p.y,5,'#dcb',3,.3);addShake(Math.min(.12,e.n/90))}if(c&&!c.ball)SFX.thud(e.n/10);else SFX.clank(e.n/10);L.onImpact&&L.onImpact(e)}}
function mice(dt){const p=ST.P.getPosition();for(const m of LV.mice){const q=m.b.getPosition(),v=m.b.getLinearVelocity();m.t+=dt;m.anim+=dt*Math.abs(v.x);
 if(m.state==='patrol'){m.b.setLinearVelocity(V(m.dir*1.6,v.y));if(q.x<m.x1)m.dir=1;if(q.x>m.x2)m.dir=-1;if(Math.abs(p.x-q.x)<5&&Math.abs(p.y-q.y)<1.6&&Math.sign(p.x-q.x)===m.dir){m.state='warn';m.t=0;SFX.squeak()}}
 else if(m.state==='warn'){m.b.setLinearVelocity(V(0,v.y));if(m.t>.6){m.state='charge';m.t=0}}
 else if(m.state==='charge'){m.b.setLinearVelocity(V(m.dir*6,v.y));if(m.t>.75||q.x<m.x1-1||q.x>m.x2+1){m.state='dizzy';m.t=0;m.dizzy=1.1}}
 else if(m.state==='dizzy'){m.b.setLinearVelocity(V(v.x*.9,v.y));if(m.t>m.dizzy){m.state='patrol';m.dir=Math.sign(p.x-q.x)||1}}}}
// ---------- мировые эффекты ----------
function wburst(x,y,n,col,sp,life){for(let i=0;i<n;i++){const a=Math.random()*6.283,v=(.3+Math.random())*sp;LV.wp.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v+sp*.3,life:life*(.6+Math.random()*.6),t:0,col,r:.06+Math.random()*.1,g:1})}}
function ringFX(x,y,col,r){LV.rfx.push({x,y,col,t:0,r:r||1.5})}
function floatT(s,col,x,y){LV.floats.push({s,col,x,y,t:0})}
// ---------- камера ----------
function camStep(dt){const L=LV,p=ST.P.getPosition(),v=ST.P.getLinearVelocity();const K=H/VH,VW=W/K;
 let tx=p.x+ST.face*1.6+v.x*.15,ty=p.y+.6;
 if(ST.carry){const t=throwTarget(ST.carry);if(t)tx=(p.x+t.x)/2}
 if(!ST.carry&&!ST.hook){let mx=-1e9;for(const r of LV.rings){if(r.hidden||r.task==null||(LV.tasks[r.task]&&LV.tasks[r.task].solved))continue;if(r.x>p.x-1&&r.x<p.x+14)mx=Math.max(mx,r.x)}if(mx>-1e9)tx=Math.max(tx,Math.min(mx+1.4-VW/2,p.x+VW/2-1.6))}// все кольца-ответы в кадре на узких экранах
 const nr=ST.hook?ST.ring:nearestRing();if(nr)ty=Math.max(ty,Math.min(nr.y-1.6,p.y+3.2));
 if(L.camFn){const o=L.camFn(tx,ty);tx=o[0];ty=o[1]}
 const c=L.cam;c.x+=(tx-c.x)*Math.min(1,dt*4);c.y+=(ty-c.y)*Math.min(1,dt*3);
 c.x=clamp(c.x,L.bounds.x0+VW/2,Math.max(L.bounds.x0+VW/2,L.bounds.x1-VW/2));c.y=Math.max(c.y,L.bounds.y0+VH/2);if(L.bounds.y1!=null)c.y=Math.min(c.y,L.bounds.y1-VH/2)}
// ---------- отрисовка мира (CSS-пиксели) ----------
let TILEPAT=null;
function poseH(n){return({y_idle:1.85,y_cheer:1.95,y_point:1.85,y_run1:1.7,y_run2:1.7,y_jump:1.85,y_dash:1.35,y_swing:2.0,y_carry:1.95,y_throw:1.8,y_react:1.8}[n]||1.8)}
function pose(){const v=ST.P.getLinearVelocity();const grounded=ST.ground>0&&v.y<=.6;
 if(ST.react>0&&!ST.hook)return'y_react';if(ST.hook)return'y_swing';if(ST.dash>0)return'y_dash';if(ST.throwT>0)return'y_throw';if(ST.carry)return'y_carry';
 if(!grounded&&ST.launch<=0&&Math.abs(v.y)>1.5)return'y_jump';if(!grounded&&ST.launch>0)return'y_jump';
 if(ST.cheer>0&&grounded)return'y_cheer';if(grounded&&Math.abs(v.x)>1){ST.run+=Math.abs(v.x)/60;return(Math.floor(ST.run/.55)%2)?'y_run2':'y_run1'}
 if(talk&&talk.who==='yarik')return'y_point';return'y_idle'}
const SIDE={y_run1:1,y_run2:1,y_jump:0,y_dash:1,y_swing:0,y_carry:0,y_throw:1,y_react:0};
function drawHero(n,x,y,face,o){o=o||{};const K=H/VH;const [sx,sy]=w2s(x,y);const BR={y_idle:1,y_point:1,y_cheer:1};const h=poseH(n)*K*(BR[n]&&!o.a?1+.012*Math.sin(T*2.4):1);const side=SIDE[n];const flip=side?face<0:false;
 spr(n,sx,sy,h,{ax:.5,ay:1,flip,blink:BLINKS.includes(n)?3:0,rot:o.rot||0,a:o.a})}
function drawCrateAt(c,x,y,ang,K){const [sx,sy]=w2s(x,y);const s=c.s*2*K;X.save();X.translate(sx+(c.shake?Math.sin(T*60)*c.shake*4:0),sy);X.rotate(-ang);
 if(c.ball){if(okI(IM.ball))X.drawImage(IM.ball,-s/2,-s/2,s,s);else{X.fillStyle='#c9952e';X.beginPath();X.arc(0,0,s/2,0,7);X.fill()}}
 else if(c.v==null){X.globalAlpha=.95;if(okI(IM.crate))X.drawImage(IM.crate,-s/2,-s/2,s,s);X.globalAlpha=1}
 else{if(c.imp&&c.revealed){X.shadowColor='#ff4040';X.shadowBlur=18}if(okI(IM.crate))X.drawImage(IM.crate,-s/2,-s/2,s,s);X.shadowBlur=0}
 if(c.v!=null){const pw=s*(c.ball?.62:.66);X.fillStyle=c.solved?'#fff3c4':c.imp&&c.revealed?'#ffd6d0':'#fffaf0';rr(-pw/2,-pw/2,pw,pw,pw*.2);X.fill();X.lineWidth=Math.max(1.5,s*.04);X.strokeStyle='#4a2b12';X.stroke();
  valDraw(c.v,0,0,pw,{col:c.solved?'#7a3d00':'#1d1030',st:'#ffffff',box:[-s/2,-s/2,s/2,s/2],id:'crate'})}
 X.restore()}
function drawSolids(K){const v=vis();if(!TILEPAT&&okI(IM.bg_tile)){TILEPAT=X.createPattern(IM.bg_tile,'repeat')}
 for(const s of LV.solids){if(s.hide)continue;const pos=s.b.getPosition();const hw=(s.x2-s.x1)/2,hh=(s.y2-s.y1)/2;const cx=s.st?pos.x:(s.x1+s.x2)/2,cy=s.st?pos.y:(s.y1+s.y2)/2;
  const [x1,y1]=w2s(cx-hw,cy+hh),[x2,y2]=w2s(cx+hw,cy-hh);if(x2<-50||x1>W+50||y1>H+50||y2<-50)continue;
  if(s.look==='step'){if(s.clipY!=null){X.save();X.beginPath();X.rect(x1-30,-1e4,x2-x1+60,1e4+w2s(0,s.clipY)[1]);X.clip();drawStep(s,x1,y1,x2,y2,K);X.restore()}else drawStep(s,x1,y1,x2,y2,K);continue}
  X.save();if(TILEPAT){const m=new DOMMatrix();const sc=K*1.6/IM.bg_tile.naturalWidth;m.translateSelf(w2s(0,0)[0],w2s(0,0)[1]);m.scaleSelf(sc,sc);TILEPAT.setTransform(m);X.fillStyle=TILEPAT}else X.fillStyle='#7a5a44';
  rr(x1,y1,x2-x1,y2-y1,Math.min(8,(y2-y1)/3));X.fill();X.fillStyle='rgba(30,10,40,.18)';X.fill();
  const th=Math.min(K*.16,(y2-y1)*.5);const g=X.createLinearGradient(0,y1,0,y1+th);g.addColorStop(0,'#ffe08a');g.addColorStop(1,'#a8742a');X.fillStyle=g;rr(x1-2,y1-2,x2-x1+4,th+2,4);X.fill();
  X.strokeStyle='rgba(40,16,10,.7)';X.lineWidth=2;rr(x1,y1,x2-x1,y2-y1,Math.min(8,(y2-y1)/3));X.stroke();
  if(s.oneway){X.fillStyle='rgba(255,230,150,.9)';for(let x=x1+K*.3;x<x2;x+=K*.6){X.beginPath();X.arc(x,y1+th/2,K*.05,0,7);X.fill()}}
  X.restore()}
 for(const s of LV.slopes){const P=s.pts.map(q=>w2s(q[0],q[1]));X.save();X.beginPath();X.moveTo(P[0][0],P[0][1]);for(const q of P)X.lineTo(q[0],q[1]);const last=P[P.length-1];X.lineTo(last[0],last[1]+s.depth*K);X.lineTo(P[0][0],P[0][1]+s.depth*K);X.closePath();
  if(TILEPAT){const m=new DOMMatrix();const sc=K*1.6/IM.bg_tile.naturalWidth;m.translateSelf(w2s(0,0)[0],w2s(0,0)[1]);m.scaleSelf(sc,sc);TILEPAT.setTransform(m);X.fillStyle=TILEPAT}else X.fillStyle='#7a5a44';X.fill();X.fillStyle='rgba(30,10,40,.18)';X.fill();
  X.lineJoin='round';X.lineCap='round';X.beginPath();X.moveTo(P[0][0],P[0][1]);for(const q of P)X.lineTo(q[0],q[1]);X.strokeStyle='#a8742a';X.lineWidth=K*.2;X.stroke();X.strokeStyle='#ffe08a';X.lineWidth=K*.08;X.stroke();X.restore()}}
function drawStep(s,x1,y1,x2,y2,K){const st=s.st;X.save();const g=X.createLinearGradient(x1,0,x2,0);g.addColorStop(0,'#8a5a2c');g.addColorStop(.5,'#b98244');g.addColorStop(1,'#7a4c22');X.fillStyle=g;rr(x1,y1,x2-x1,y2-y1,6);X.fill();
 X.strokeStyle='#3a1a08';X.lineWidth=2;X.stroke();X.fillStyle='#ffd27a';rr(x1-2,y1-2,x2-x1+4,K*.14,4);X.fill();
 // пружинки по бокам
 X.strokeStyle='rgba(255,220,140,.6)';X.lineWidth=2;for(let yy=y1+K*.3;yy<y2-4;yy+=K*.22){X.beginPath();X.moveTo(x1+4,yy);X.lineTo(x1+K*.18,yy+K*.11);X.stroke();X.beginPath();X.moveTo(x2-4,yy);X.lineTo(x2-K*.18,yy+K*.11);X.stroke()}
 if(st.v!=null&&st.show!==false){const pw=Math.min(K*.95,(x2-x1)*.8,(y2-y1)*.8);const cy=Math.max(y1+pw*.62,Math.min(y2-pw*.6,y1+pw*.7));if(pw>K*.35){X.fillStyle=st.glow?'#fff3c4':'#fffaf0';rr((x1+x2)/2-pw/2,cy-pw/2,pw,pw,pw*.2);X.fill();X.strokeStyle='#4a2b12';X.lineWidth=2;X.stroke();valDraw(st.v,(x1+x2)/2,cy,pw,{box:[x1,y1,x2,y2],id:'step'})}}
 X.restore()}
function drawWorld(){const L=LV,K=H/VH;X.setTransform(DPR,0,0,DPR,0,0);
 // фон: параллакс зеркальной плиткой
 const b=IM['bg_'+L.bg];if(okI(b)){const bh=H*1.18,bw=bh*b.naturalWidth/b.naturalHeight;let ox=-(L.cam.x*K*.22)%(bw*2);if(ox>0)ox-=bw*2;const oy=-H*.09+clamp((L.cam.y-L.bounds.y0-VH/2)*K*.06,-H*.06,H*.09);
  for(let x=ox,i=0;x<W;x+=bw,i++){X.save();if(i%2){X.translate(x+bw,oy);X.scale(-1,1);X.drawImage(b,0,0,bw,bh)}else X.drawImage(b,x,oy,bw,bh);X.restore()}}
 else{X.fillStyle='#4b3560';X.fillRect(0,0,W,H)}
 X.save();if(FX.shake>0){const a=FX.shake*FX.shake*16;X.translate((Math.random()-.5)*a,(Math.random()-.5)*a)}
 L.drawBack&&L.drawBack(K);
 drawSolids(K);
 // таблички с рядами
 for(const s of L.signs){if(s.hide)continue;drawSign(s,K)}
 // слоты
 for(const sl of L.slots){if(sl.solved||!sl.act||sl.hide)continue;const [x,y]=w2s(sl.x,sl.y);const w=sl.size*2*K;X.save();X.translate(x,y);const pul=.6+.4*Math.sin(L.t*5);X.shadowColor=sl.rej>0?'#f55':'#7df';X.shadowBlur=18*pul;X.strokeStyle=sl.rej>0?'#ff6a5a':'#9ef3ff';X.lineWidth=4;X.setLineDash([8,6]);rr(-w/2,-w/2,w,w,10);X.stroke();X.setLineDash([]);X.fillStyle='rgba(120,220,255,.18)';X.fill();X.shadowBlur=0;valDraw('?',0,0,w*.9,{box:[-w/2,-w/2,w/2,w/2],id:'slot'});X.restore()}
 // ворота
 for(const g of L.gates){const q=g.b.getPosition();const [x1,y1]=w2s(q.x-.55,q.y+g.h/2),[x2,y2]=w2s(q.x+.55,q.y-g.h/2);if(okI(IM.gate)){X.save();X.beginPath();X.rect(x1-20,0,x2-x1+40,w2s(0,g.y0)[1]);X.clip();const gw=x2-x1,gh=y2-y1;X.drawImage(IM.gate,x1-gw*.25,y1,gw*1.5,gh);X.restore()}else{X.fillStyle='#7c8aa0';X.fillRect(x1,y1,x2-x1,y2-y1)}}
 // двери (ур.4)
 for(const d of L.doors)drawDoor(d,K);
 // батуты
 for(const p of L.pads){if(p.hidden&&!p.found)continue;const [x,y]=w2s(p.x,p.y+.15);const w=p.w*K;const h=w*.55*(1-p.squash*.35);if(okI(IM.tramp))X.drawImage(IM.tramp,x-w/2,y-h*.42,w,h);if(p.to){X.fillStyle='rgba(255,230,120,.9)';const ax=Math.sign(p.to.x-p.x);X.beginPath();X.moveTo(x+ax*w*.15,y-h*.55-K*.1);X.lineTo(x-ax*w*.05,y-h*.55-K*.25);X.lineTo(x-ax*w*.05,y-h*.55+K*.05);X.fill()}}
 // кольца
 const nr=!ST.hook?nearestRing():null;
 for(const r of L.rings){if(r.hidden)continue;const [x,y]=w2s(r.x,r.y);r.pulse+=1/60;const k=1+.07*Math.sin(r.pulse*4);const d=K*1.0*k;
  X.strokeStyle='rgba(60,40,20,.6)';X.lineWidth=3;X.beginPath();X.moveTo(x,y-d*.45);X.lineTo(x,Math.max(-10,y-K*3));X.stroke();
  if(r.slip>0){X.globalAlpha=.5+.5*Math.sin(L.t*30)}
  if(okI(IM.ring))X.drawImage(IM.ring,x-d/2,y-d/2,d,d);X.globalAlpha=1;
  if(r.sym){const ly=y+d*.95;X.fillStyle='rgba(255,250,235,.95)';X.beginPath();X.arc(x,ly,K*.42,0,7);X.fill();X.lineWidth=3;X.strokeStyle='#5a3410';X.stroke();valDraw(r.sym,x,ly,K*.66,{box:[x-K*.45,ly-K*.45,x+K*.45,ly+K*.45],id:'ringsym'})}
  if((r===nr||(L.ringHint&&!ST.hook&&r.task===L.cur&&Math.hypot(r.x-ST.P.getPosition().x,r.y-ST.P.getPosition().y)<L.tapR))&&!ST.hook){X.strokeStyle=r===nr?'rgba(140,240,255,.95)':'rgba(255,240,160,.7)';X.lineWidth=3;X.setLineDash([6,8]);X.beginPath();X.arc(x,y,d*.8+Math.sin(L.t*6)*3,0,7);X.stroke();X.setLineDash([])}}
 // верёвка
 if(ST.hook){const r=ST.ring,p=ST.P.getPosition();const [x,y]=w2s(r.x,r.y),[px,py]=w2s(p.x+ST.face*.2,p.y+.75);X.strokeStyle='#8ff';X.shadowColor='#4ef';X.shadowBlur=14;X.lineWidth=4;X.beginPath();X.moveTo(x,y);X.lineTo(px,py);X.stroke();X.shadowBlur=0}
 // ящики
 for(const c of L.crates){if(c.dead||c.hide)continue;const q=c.b.getPosition();drawCrateAt(c,q.x,q.y,c.b.getAngle(),K)}
 // дуга прицела
 if(ST.carry){const t=throwTarget(ST.carry);if(t){const q=ST.carry.b.getPosition();const [vx,vy]=throwVel(q,t);X.fillStyle='rgba(255,255,255,.85)';const tt=Math.abs(t.x-q.x)/Math.max(.1,Math.abs(vx));for(let i=1;i<14;i++){const s=i/14*tt;const [x,y]=w2s(q.x+vx*s,q.y+vy*s+.5*TU.g*s*s);X.beginPath();X.arc(x,y,3.5,0,7);X.fill()}const [tx,ty]=w2s(t.x,t.y);X.strokeStyle='rgba(255,255,255,.9)';X.lineWidth=3;X.beginPath();X.arc(tx,ty,K*.6+Math.sin(L.t*8)*3,0,7);X.stroke()}}
 // мыши
 for(const m of L.mice){const q=m.b.getPosition();const [x,y]=w2s(q.x,q.y-.36);const h=K*1.05;const n=m.state==='dizzy'?'mouse_dz':'mouse';const hop=m.state==='charge'?Math.abs(Math.sin(L.t*20))*4:Math.abs(Math.sin(m.anim*3))*3;
  spr(n,x,y-hop,h,{ax:.5,ay:.95,flip:m.dir<0});if(m.state==='warn'){txt('!',x,y-h*1.15,K*.8,'#ffe066',{f:NUM})}if(m.state==='dizzy'){for(let i=0;i<3;i++){const a=L.t*5+i*2.1;symDraw('st',x+Math.cos(a)*K*.45,y-h*1.05+Math.sin(a)*K*.12,K*.12)}}}
 // шестерёнки и предметы
 for(const g of L.gears){if(g.got===2)continue;const [x,y]=w2s(g.x,g.y+Math.sin(g.t*3)*.12);const d=K*.95;X.save();X.translate(x,y);X.rotate(g.t*1.5);if(g.got){X.globalAlpha=Math.max(0,1-g.t*0);}X.shadowColor='#ffd54a';X.shadowBlur=18;if(okI(IM.gear))X.drawImage(IM.gear,-d/2,-d/2,d,d);X.restore();if(g.got)g.got=2}
 for(const it of L.items){if(it.got||it.hidden)continue;const [x,y]=w2s(it.x,it.y+Math.sin(it.t*3)*.1);X.save();X.shadowColor='#c9a0ff';X.shadowBlur=20;spr(it.kind,x,y,K*(it.h||1),{});X.restore()}
 // персонажи
 for(const n of L.npcs){if(n.hide)continue;drawNpc(n,K)}
 drawPopr(K);
 // эффекты-призраки рывка
 for(const q of L.wp)if(q.ghost){const a=1-q.t/q.life;drawHero(q.ghost,q.x,q.y-.82,q.face,{a:a*.35})}
 // герой
 {const P=ST.P,p=P.getPosition();const n=pose();let rot=0;if(n==='y_swing'&&ST.ring){rot=-Math.atan2(ST.ring.x-p.x,ST.ring.y-p.y)*.6}const fy=n==='y_swing'?p.y-1.1:p.y-.82;
  X.save();if(ST.stun>0)X.globalAlpha=.75;drawHero(n,p.x,fy,ST.face,{rot});X.restore()}
 if(ST.carry){const c=ST.carry,q=c.b.getPosition();drawCrateAt(c,q.x,q.y,c.b.getAngle(),K);const p=ST.P.getPosition();const [x,y]=w2s(q.x,q.y-c.s),[px,py]=w2s(p.x,p.y+.7);X.strokeStyle='rgba(120,230,255,.55)';X.lineWidth=2.5;for(let i=0;i<3;i++){X.beginPath();X.arc((x+px)/2,(y+py)/2,5+i*5+(L.t*30%5),0,7);X.stroke()}}
 L.drawFront&&L.drawFront(K);
 // частицы
 for(let i=L.wp.length-1;i>=0;i--){const q=L.wp[i];q.t+=1/60;if(q.t>q.life){L.wp.splice(i,1);continue}if(q.ghost)continue;if(q.g){q.vy-=12/60;q.x+=q.vx/60;q.y+=q.vy/60}else{q.x+=q.vx/60;q.y+=q.vy/60}
  const [x,y]=w2s(q.x,q.y);const a=1-q.t/q.life;X.globalAlpha=a;X.fillStyle=q.col;X.beginPath();X.arc(x,y,(q.r||.08)*K*(.5+a*.5),0,7);X.fill()}X.globalAlpha=1;
 for(let i=L.rfx.length-1;i>=0;i--){const q=L.rfx[i];q.t+=1/60;if(q.t>.45){L.rfx.splice(i,1);continue}const [x,y]=w2s(q.x,q.y);const k=q.t/.45;X.globalAlpha=1-k;X.strokeStyle=q.col;X.lineWidth=6*(1-k)+1;X.beginPath();X.arc(x,y,q.r*K*(.3+k),0,7);X.stroke()}X.globalAlpha=1;
 for(let i=L.floats.length-1;i>=0;i--){const f=L.floats[i];f.t+=1/60;if(f.t>1.3){L.floats.splice(i,1);continue}const [x,y]=w2s(f.x,f.y+f.t*.8);X.globalAlpha=clamp((1.3-f.t)*3,0,1);txt(f.s,x,y,K*.7*(1+Math.max(0,.3-f.t)),f.col,{f:NUM,lw:6});X.globalAlpha=1}
 X.restore();
 if(FX.flash>0){X.fillStyle=FX.flashC;X.globalAlpha=FX.flash;X.fillRect(0,0,W,H);X.globalAlpha=1;FX.flash=Math.max(0,FX.flash-1/60*3)}}
function drawSign(s,K){const n=s.vals.length,ts=s.size*K,gap=ts*.18;const w=n*ts+(n-1)*gap+ts*.5,h=ts*1.5;const [cx,cy]=w2s(s.x,s.y);const x0=cx-w/2,y0=cy-h/2;const dup=G.boardOn&&LV&&LV.task&&!LV.task.solved&&(s.vals===LV.task.vals||s===LV.task.sign);s.fa=clamp((s.fa==null?1:s.fa)+(dup?-.06:.06),0,1);if(G.boardOn||s.fa<1){const bb=(safeT()+92)*S+OY;const a=Math.min(s.fa,G.boardOn?clamp((y0-bb+10)/40,0,1):1);if(a<=.02)return;X.save();X.globalAlpha=a;drawSign0(s,K,n,ts,gap,w,h,cx,cy,x0,y0);X.restore();return}drawSign0(s,K,n,ts,gap,w,h,cx,cy,x0,y0)}
function drawSign0(s,K,n,ts,gap,w,h,cx,cy,x0,y0){
 X.save();X.strokeStyle='#5a3410';X.lineWidth=4;X.beginPath();X.moveTo(cx-w*.3,y0+h);X.lineTo(cx-w*.3,y0+h+K*(s.post||0));X.moveTo(cx+w*.3,y0+h);X.lineTo(cx+w*.3,y0+h+K*(s.post||0));X.stroke();
 const g=X.createLinearGradient(0,y0,0,y0+h);g.addColorStop(0,'#3a2a5a');g.addColorStop(1,'#241838');X.fillStyle=g;rr(x0,y0,w,h,ts*.25);X.fill();X.lineWidth=Math.max(3,ts*.08);X.strokeStyle='#e0b25a';X.stroke();
 for(let i=0;i<n;i++){const v=s.vals[i];const x=x0+ts*.25+i*(ts+gap)+ts/2,y=cy;const q=v==='?';X.fillStyle=q?'rgba(255,224,102,.25)':'#fffaf0';if(s.mark===i)X.fillStyle='#ffd0c8';rr(x-ts/2,y-ts/2,ts,ts,ts*.18);X.fill();if(q){X.setLineDash([5,4]);X.strokeStyle='#ffe066';X.lineWidth=2.5;X.stroke();X.setLineDash([])}
  valDraw(v,x,y,ts,{col:q?'#ffe066':'#1d1030',st:q?'#2a1206':'#fff',box:[x0,y0,x0+w,y0+h],id:'sign'})}
 if(s.solvedT!=null){const k=clamp((LV.t-s.solvedT)*2,0,1);X.globalAlpha=1-k;X.strokeStyle='#ffe066';X.lineWidth=6;rr(x0-k*20,y0-k*20,w+k*40,h+k*40,ts*.3);X.stroke();X.globalAlpha=1}
 X.restore()}
function drawDoor(d,K){const [x1,y1]=w2s(d.x-.5,d.y0+d.h),[x2,y2]=w2s(d.x+.5,d.y0);X.save();
 X.fillStyle='#5a3a24';rr(x1-K*.15,y1-K*.25,x2-x1+K*.3,y2-y1+K*.25,K*.2);X.fill();
 if(!d.open){const wob=d.rej>0?Math.sin(T*40)*d.rej*K*.15:0;X.fillStyle=d.rej>0?'rgba(255,120,110,.75)':'rgba(140,220,255,.55)';rr(x1+wob,y1,x2-x1,y2-y1,K*.15);X.fill();X.strokeStyle='#ffd27a';X.lineWidth=3;X.stroke()}
 const ts=Math.min(K*1.0,(y2-y1)*.62);const cx=(x1+x2)/2,cy=(y1+y2)/2;X.fillStyle='#fffaf0';rr(cx-ts/2,cy-ts/2,ts,ts,ts*.2);X.fill();X.strokeStyle='#5a3410';X.lineWidth=3;X.stroke();valDraw(d.v,cx,cy,ts,{box:[cx-ts/2,cy-ts/2,cx+ts/2,cy+ts/2],id:'door'});X.restore()}
// Попрыгун — бежит следом прыжками, смотрит на ребёнка, когда стоит
const POP={x:0,y:0,vy:0,face:1,t:0,hop:0,on:true};
function groundBelow(x,y){let best=null;LV.world.rayCast(V(x,y),V(x,y-12),(f,pt,n,fr)=>{const u=f.getUserData()||{};if(u.k==='ground'||u.k==='oneway'){best=pt.y;return fr}return -1});return best}
function drawPopr(K){if(!POP.on||LV.noPopr)return;const p=ST.P.getPosition();POP.t+=1/60;
 const tx=p.x-ST.face*1.5;const dx=tx-POP.x;if(Math.abs(dx)>14||Math.abs(p.y-POP.y)>8){POP.x=tx;POP.y=p.y;POP.vy=0}
 POP.x+=clamp(dx*4,-9,9)/60;const gy=groundBelow(POP.x,Math.max(POP.y,p.y)+1.5);const floor=gy==null?p.y-.82:gy;
 POP.vy-=30/60;POP.y+=POP.vy/60;if(POP.y<=floor){POP.y=floor;POP.vy=Math.abs(dx)>.6||POP.hop>0?7.5:0;if(POP.hop>0)POP.hop--}
 if(Math.abs(dx)>.3)POP.face=Math.sign(dx);
 const air=POP.y>floor+.05;const n=air?'p_jump':(talk&&talk.who==='popr'?'p_talk':'p_sit');const [x,y]=w2s(POP.x,POP.y);
 spr(n,x,y,K*(n==='p_jump'?1.25:1.05*(1+.015*Math.sin(T*3))),{ax:.5,ay:1,blink:n!=='p_jump'?7:0,flip:n==='p_jump'&&POP.face<0})}
function drawNpc(n,K){const [x,y]=w2s(n.x,n.y);let im=n.im;if(!im){if(n.who==='u')im=talk&&talk.who==='ulya'?'u_talk':(n.cheer?'u_cheer':'u_idle');if(n.who==='k')im='k_laugh'}
 spr(im,x,y,K*n.h*(1+.012*Math.sin(T*2.2+n.x)),{ax:.5,ay:1,blink:BLINKS.includes(im)?11:0,flip:n.flip})}
