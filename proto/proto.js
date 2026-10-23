// Greybox physics prototype — «Ярик и Заводной город» (урок 306)
// planck.js (Box2D). Core: run / jump (coyote+buffer+variable) / dash / magnetic hook swing /
// magnet carry + aim-assisted throw / pattern slot (2,4,6,?) / knockback mouse / destructible stack / spring pad.
'use strict';
const pl = planck, V = pl.Vec2;
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1, S = 40; // S = px per metre
function resize(){ DPR = Math.min(2, window.devicePixelRatio||1); W = innerWidth; H = innerHeight;
  cv.width = W*DPR; cv.height = H*DPR; S = Math.max(W/19, H/10); }
addEventListener('resize', resize); resize();

// ---------- tuning ----------
const T = { g:-30, fallMul:1.7, maxFall:-22, run:7.5, accG:75, accA:42, decG:90, jumpV:12.8, jumpCut:0.45,
  coyote:0.12, buffer:0.14, dashV:16, dashT:0.2, dashCD:0.45, hookR:7, reel:3.5, pump:22, relBoost:1.12, relUp:3.2,
  carryK:14, throwMaxD:11, springV:19, knockV:[8,7], stompV:13 };

const world = new pl.World({gravity:V(0,T.g)});
const CAT = {ground:1, player:2, crate:4, enemy:8, deco:16};
function ground(x1,y1,x2,y2,ud){ const b = world.createBody({type:'static'});
  b.createFixture(pl.Box((x2-x1)/2,(y2-y1)/2,V((x1+x2)/2,(y1+y2)/2)),{friction:0.8,userData:ud||{k:'ground'},filterCategoryBits:CAT.ground});
  b.rect={x1,y1,x2,y2}; return b; }
const solids = [];
solids.push(ground(-6,-2,22,0)); solids.push(ground(28,-2,70,0));
solids.push(ground(-7,-2,-6,12)); solids.push(ground(70,-2,71,12));
solids.push(ground(22,-6,28,-5)); // pit floor
solids.push(ground(21.7,-6,22,0)); solids.push(ground(28,-6,28.3,0));
solids.push(ground(31,4.6,35.5,5.2)); // high platform
// spring pad in pit
const pad = world.createBody({type:'static'});
pad.createFixture(pl.Box(2.6,0.15,V(25,-4.85)),{isSensor:true,userData:{k:'pad'}});
// shelf with pattern 2,4,6,[slot]
const shelfY=0, shelf=[]; const SH = {x:44, y:0.7, step:1.5};
[2,4,6].forEach((n,i)=>{ shelf.push({n, x:SH.x+i*SH.step, y:SH.y}); ground(SH.x+i*SH.step-0.65,0,SH.x+i*SH.step+0.65,1.4,{k:'ground'}); });
const slot = {x:SH.x+3*SH.step, y:SH.y+0.05, solved:false, flash:0, rej:0};
const slotBody = world.createBody({type:'static'});
slotBody.createFixture(pl.Box(0.55,0.55,V(slot.x,slot.y)),{isSensor:true,userData:{k:'slot'}});
ground(slot.x-0.7,-0.0,slot.x+0.7,0.05);
// gate
const gate = world.createBody({type:'kinematic', position:V(53,2.5)});
gate.createFixture(pl.Box(0.4,2.5),{userData:{k:'ground'}}); gate.h=2.5;
// rings (hook anchors)
const rings = [[19.5,7.2],[25,8.4],[30.5,9.6],[38,8.2]].map(([x,y])=>{ const b=world.createBody({type:'static',position:V(x,y)}); return {x,y,b,pulse:Math.random()*6}; });

// crates
const crates = [];
function crate(n,x,y,size,light){ const b = world.createBody({type:'dynamic',position:V(x,y),angularDamping:1.5});
  const s=size||0.5; b.createFixture(pl.Box(s,s),{density:light?0.35:1.0,friction:0.6,restitution:0.15,userData:{k:'crate'},filterCategoryBits:CAT.crate});
  const c={b,n,s,light:!!light,held:false,noPlayer:0,solved:false}; b.c=c; crates.push(c); return c; }
crate(7,9,0.6); crate(9,13,0.6); crate(8,33,5.8);
// destructible stack (light deco boxes) — knock with dash / thrown crate
for(let r=0;r<3;r++) for(let i=0;i<3-r;i++) crate(null,15.6+i*0.62+r*0.31,0.3+r*0.6,0.3,true);

// player
const P = world.createBody({type:'dynamic',position:V(2,1.5),fixedRotation:true,bullet:true});
P.createFixture(pl.Box(0.38,0.6,V(0,0.1)),{density:1,friction:0,userData:{k:'player'},filterCategoryBits:CAT.player});
P.createFixture(pl.Circle(V(0,-0.45),0.37),{density:1,friction:0,userData:{k:'player'},filterCategoryBits:CAT.player});
P.createFixture(pl.Box(0.3,0.08,V(0,-0.85)),{isSensor:true,userData:{k:'foot'}});
const st = {ground:0, coyote:0, buffer:0, face:1, dash:0, dashCD:0, airDash:true, hook:null, hookRing:null, hookT:0,
  carry:null, jumpHeld:false, stun:0, landT:0, prevVy:0, solvedAt:0};

// enemy: wind-up mouse (patrol → warn "!" → charge → dizzy)
const M = world.createBody({type:'dynamic',position:V(40,0.5),fixedRotation:true});
M.createFixture(pl.Box(0.55,0.4),{density:2,friction:0.2,userData:{k:'mouse'},filterCategoryBits:CAT.enemy});
const ms = {state:'patrol', t:0, dir:-1, x1:36, x2:42.5, dizzy:0};

// ---------- contacts ----------
function kinds(c){ return [c.getFixtureA().getUserData()||{}, c.getFixtureB().getUserData()||{}]; }
function other(c,k){ const [a,b]=kinds(c); if(a.k===k) return [c.getFixtureB(),c.getFixtureA()]; if(b.k===k) return [c.getFixtureA(),c.getFixtureB()]; return null; }
const events=[];
world.on('begin-contact',c=>{
  const f=other(c,'foot'); if(f && !f[0].isSensor()){ st.ground++; }
  const pd=other(c,'pad'); if(pd){ const ud=pd[0].getUserData()||{}; if(ud.k==='player') events.push({e:'pad'}); }
  const sl=other(c,'slot'); if(sl){ const body=sl[0].getBody(); if(body.c && body.c.n!=null) events.push({e:'slot',c:body.c}); }
  const pc=other(c,'player'); if(pc){ const ud=pc[0].getUserData()||{}; if(ud.k==='crate' && st.dash>0) events.push({e:'dashHit',b:pc[0].getBody()}); }
  const mo=other(c,'mouse'); if(mo){ const ud=mo[0].getUserData()||{}; if(ud.k==='player') events.push({e:'mouseHit'}); if(ud.k==='crate'){ const cb=mo[0].getBody(); if(cb.getLinearVelocity().length()>5) events.push({e:'mouseCrate'}); } }
});
world.on('end-contact',c=>{ const f=other(c,'foot'); if(f && !f[0].isSensor()) st.ground=Math.max(0,st.ground-1); });
world.on('pre-solve',c=>{ // carried / just-thrown crate passes through player
  const [a,b]=kinds(c); if((a.k==='player'&&b.k==='crate')||(b.k==='player'&&a.k==='crate')){
    const cb=(a.k==='crate'?c.getFixtureA():c.getFixtureB()).getBody(); if(cb.c&&(cb.c.held||cb.c.noPlayer>0)) c.setEnabled(false); }
  if((a.k==='foot'||b.k==='foot')) return;
});
world.on('post-solve',(c,imp)=>{ const n = imp && imp.normalImpulses ? imp.normalImpulses[0] : 0;
  const [a,b]=kinds(c); if(n>3.5 && (a.k==='crate'||b.k==='crate')){ const wm=c.getWorldManifold(); if(wm&&wm.points[0]) events.push({e:'impact',p:wm.points[0],n}); } });

// ---------- input ----------
const inp = {x:0, jump:false, act:false, jumpP:false, actP:false};
const keys={}; addEventListener('keydown',e=>{ if(e.repeat) return; keys[e.code]=1; if(e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW') inp.jumpP=true; if(e.code==='KeyX'||e.code==='KeyJ') inp.actP=true; });
addEventListener('keyup',e=>{ keys[e.code]=0; });
const touches={}; let stick=null;
function btns(){ const r=Math.min(H*0.125,W*0.065); return { jump:{x:W-r*1.25-10,y:H-r*1.25-8,r}, act:{x:W-r*3.6-10,y:H-r*1.05-8,r:r*0.92} }; }
cv.addEventListener('pointerdown',e=>{ const B=btns(); const x=e.clientX,y=e.clientY;
  if(Math.hypot(x-B.jump.x,y-B.jump.y)<B.jump.r*1.35){ touches[e.pointerId]='jump'; inp.jumpP=true; }
  else if(Math.hypot(x-B.act.x,y-B.act.y)<B.act.r*1.35){ touches[e.pointerId]='act'; inp.actP=true; }
  else if(x<W*0.5 && !stick){ stick={id:e.pointerId,ox:x,oy:y,x,y}; touches[e.pointerId]='stick'; }
  cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove',e=>{ if(stick&&stick.id===e.pointerId){ stick.x=e.clientX; stick.y=e.clientY; } });
function up(e){ if(stick&&stick.id===e.pointerId) stick=null; delete touches[e.pointerId]; }
cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',up);
const ext = {x:null, jump:false, act:false}; // test harness override
function readInput(){
  let x=(keys.ArrowRight||keys.KeyD?1:0)-(keys.ArrowLeft||keys.KeyA?1:0);
  if(stick){ const R=H*0.12, dx=stick.x-stick.ox; x=Math.max(-1,Math.min(1,dx/R)); if(Math.abs(x)<0.18) x=0; }
  if(ext.x!==null) x=ext.x;
  inp.x=x; const v=Object.values(touches);
  inp.jump = !!(keys.Space||keys.ArrowUp||keys.KeyW||v.includes('jump')||ext.jump);
  inp.act = !!(keys.KeyX||keys.KeyJ||v.includes('act')||ext.act);
}

// ---------- FX ----------
const parts=[]; let shake=0, hitstop=0, slowmo=1, flashTxt=null;
function burst(x,y,n,col,sp,life){ for(let i=0;i<n;i++){ const a=Math.random()*6.283, v=(0.3+Math.random())*sp; parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v+sp*0.3,life:life*(0.6+Math.random()*0.6),t:0,col,r:0.06+Math.random()*0.1}); } }
const rings2=[]; function ringFX(x,y,col,r){ rings2.push({x,y,col,t:0,r:r||1.5}); }
function addShake(a){ shake=Math.min(1,shake+a); }
let audio=null; function beep(f,d,type,vol,slide){ try{ if(!audio) audio=new (window.AudioContext||window.webkitAudioContext)(); const o=audio.createOscillator(), g=audio.createGain(); o.type=type||'square'; o.frequency.value=f; if(slide) o.frequency.exponentialRampToValueAtTime(slide,audio.currentTime+d); g.gain.value=vol||0.05; g.gain.exponentialRampToValueAtTime(0.0001,audio.currentTime+d); o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime+d);}catch(e){} }
function buzz(ms){ try{ navigator.vibrate&&navigator.vibrate(ms);}catch(e){} }

// ---------- helpers ----------
function nearestRing(){ const p=P.getPosition(); let best=null,bd=1e9;
  for(const r of rings){ const dx=r.x-p.x, dy=r.y-p.y; if(dy<0.8) continue; const d=Math.hypot(dx,dy); if(d>T.hookR) continue;
    const score=d - dx*st.face*0.35; if(score<bd){bd=score;best=r;} } return best; }
function nearCrate(){ const p=P.getPosition(); for(const c of crates){ if(c.n==null||c.solved||c.held||c.noPlayer>0) continue; const q=c.b.getPosition(); if(Math.abs(q.x-p.x)<1.1 && Math.abs(q.y-p.y)<1.3) return c; } return null; }
function actionKind(){ if(st.carry) return 'throw'; if(st.hook) return 'hook'; if(nearestRing()) return 'hook'; return 'dash'; }
function grab(c){ st.carry=c; c.held=true; c.b.setGravityScale(0); c.b.setAngularVelocity(0); beep(520,0.08,'triangle',0.06,900); ringFX(c.b.getPosition().x,c.b.getPosition().y,'#7ef',0.9); buzz(10); }
function throwCrate(){ const c=st.carry; st.carry=null; c.held=false; c.noPlayer=0.25; c.b.setGravityScale(1);
  const p=c.b.getPosition(); let vx=st.face*9, vy=6;
  const dx=slot.x-p.x, dy=slot.y-p.y; // aim assist toward the slot if it is in front and in range
  if(!slot.solved && Math.sign(dx)===st.face && Math.abs(dx)<T.throwMaxD && Math.abs(dy)<6){
    const t=Math.max(0.45,Math.min(0.95,Math.abs(dx)/10)); vx=dx/t; vy=(dy-0.5*T.g*t*t)/t; }
  c.b.setLinearVelocity(V(vx,vy)); c.b.setAngularVelocity(-st.face*6); beep(300,0.12,'sawtooth',0.04,140); addShake(0.12); }
function hookTo(r){ const p=P.getPosition(); const L=Math.hypot(r.x-p.x,r.y-p.y);
  st.hook=world.createJoint(new pl.RopeJoint({bodyA:r.b,bodyB:P,localAnchorA:V(0,0),localAnchorB:V(0,0.4),maxLength:L,collideConnected:false}));
  st.hookRing=r; st.hookT=0; st.hookL=L; st.airDash=true; r.pulse=0; beep(880,0.09,'square',0.05,1400); buzz(12); ringFX(r.x,r.y,'#9ff',1.2); }
function unhook(boost){ if(!st.hook) return; world.destroyJoint(st.hook); st.hook=null;
  if(boost){ const v=P.getLinearVelocity(); P.setLinearVelocity(V(v.x*T.relBoost, Math.max(v.y*T.relBoost, 0)+T.relUp)); beep(660,0.1,'triangle',0.05,330); burst(P.getPosition().x,P.getPosition().y,8,'#bff',4,0.35);} st.hookRing=null; }

// ---------- step ----------
const DT=1/60; let acc=0, last=performance.now(), simT=0;
const stats={frames:0,fpsT:0,fps:0,minFps:999,steps:0,events:[]};
function log(e){ stats.events.push([+simT.toFixed(2),e]); }
function step(dt){
  simT+=dt; readInput();
  const v=P.getLinearVelocity(), p=P.getPosition();
  const grounded = st.ground>0 && v.y<=0.5;
  if(grounded){ st.coyote=T.coyote; st.airDash=true; if(st.prevVy<-9){ burst(p.x,p.y-0.9,10,'#dcb',3,0.35); addShake(Math.min(0.25,-st.prevVy/80)); beep(120,0.06,'sine',0.06); st.landT=0.12; } }
  else st.coyote-=dt;
  st.prevVy=v.y;
  if(inp.x) st.face=Math.sign(inp.x);
  if(inp.jumpP){ st.buffer=T.buffer; } else st.buffer-=dt;
  if(inp.actP){
    const k=actionKind();
    if(k==='throw') throwCrate();
    else if(k==='hook' && !st.hook){ hookTo(nearestRing()); }
    else if(k==='dash' && st.dashCD<=0 && (grounded||st.airDash)){ st.dash=T.dashT; st.dashCD=T.dashCD; st.dashId=(st.dashId||0)+1; if(!grounded) st.airDash=false; P.setGravityScale(0); beep(200,0.12,'sawtooth',0.05,700); addShake(0.08); buzz(8); }
  }
  inp.jumpP=false; inp.actP=false;
  // hook release: let go of the button → fly with momentum
  if(st.hook && !inp.act && st.hookT>0.08) unhook(true);
  if(st.hook && st.buffer>0){ unhook(true); st.buffer=0; const v2=P.getLinearVelocity(); P.setLinearVelocity(V(v2.x, Math.max(v2.y,T.jumpV*0.8))); }
  let vx=v.x, vy=v.y;
  if(st.stun>0){ st.stun-=dt; }
  else if(st.dash>0){ st.dash-=dt; vx=st.face*T.dashV; vy=0; if(Math.random()<0.8) parts.push({x:p.x,y:p.y,vx:0,vy:0,life:0.18,t:0,col:'#6cf',r:0.42,ghost:1}); if(st.dash<=0){ P.setGravityScale(1); vx=st.face*T.run; } }
  else if(st.hook){
    st.hookT+=dt; const r=st.hookRing; const L=st.hook.getMaxLength(); if(st.hookT<0.35) st.hook.setMaxLength(Math.max(2.2,L-T.reel*dt));
    const dx=p.x-r.x, dy=p.y-r.y, d=Math.hypot(dx,dy)||1; const tx=-dy/d, ty=dx/d; // tangent
    if(inp.x){ const s=Math.sign(tx)===Math.sign(inp.x)?1:-1; P.applyForceToCenter(V(tx*s*T.pump*P.getMass()*Math.abs(inp.x), ty*s*T.pump*P.getMass()*Math.abs(inp.x))); }
    return finish(dt);
  } else {
    const target=inp.x*T.run; const a = grounded ? (inp.x? T.accG : T.decG) : T.accA;
    const dv=target-vx; vx += Math.sign(dv)*Math.min(Math.abs(dv), a*dt);
    if(st.buffer>0 && st.coyote>0){ vy=T.jumpV; st.buffer=0; st.coyote=0; beep(420,0.1,'square',0.04,760); burst(p.x,p.y-0.9,6,'#fff',2,0.25); }
    if(!inp.jump && vy>0 && !st.jumpCut && !grounded){ vy*=T.jumpCut; st.jumpCut=true; }
    if(grounded||vy<=0) st.jumpCut=false;
    if(vy<0) vy += T.g*(T.fallMul-1)*dt; vy=Math.max(vy,T.maxFall);
  }
  P.setLinearVelocity(V(vx,vy));
  return finish(dt);
}
function finish(dt){
  st.dashCD-=dt; if(slot.rej>0) slot.rej-=dt; const p=P.getPosition();
  // carried crate follows with springy lag (magnet)
  if(st.carry){ const b=st.carry.b, q=b.getPosition(); const tx=p.x-st.face*0.25, ty=p.y+1.55; const pv=P.getLinearVelocity();
    b.setLinearVelocity(V((tx-q.x)*T.carryK+pv.x*0.3,(ty-q.y)*T.carryK+pv.y*0.3)); b.setAngularVelocity(-b.getAngle()*8 - pv.x*0.15); }
  else { const c=nearCrate(); if(c) grab(c); }
  for(const c of crates){ if(c.noPlayer>0) c.noPlayer-=dt; }
  // mouse AI
  const m=M.getPosition(), mv=M.getLinearVelocity(); ms.t+=dt;
  if(ms.state==='patrol'){ M.setLinearVelocity(V(ms.dir*1.6,mv.y)); if(m.x<ms.x1) ms.dir=1; if(m.x>ms.x2) ms.dir=-1;
    if(Math.abs(p.x-m.x)<5 && Math.abs(p.y-m.y)<1.6 && Math.sign(p.x-m.x)===ms.dir){ ms.state='warn'; ms.t=0; beep(990,0.12,'square',0.04); } }
  else if(ms.state==='warn'){ M.setLinearVelocity(V(0,mv.y)); if(ms.t>0.55){ ms.state='charge'; ms.t=0; } }
  else if(ms.state==='charge'){ M.setLinearVelocity(V(ms.dir*6.5,mv.y)); if(ms.t>0.7||m.x<ms.x1-1||m.x>ms.x2+1){ ms.state='dizzy'; ms.t=0; ms.dizzy=1.1; } }
  else if(ms.state==='dizzy'){ M.setLinearVelocity(V(mv.x*0.9,mv.y)); if(ms.t>ms.dizzy){ ms.state='patrol'; ms.dir=Math.sign(p.x-m.x)||1; } }
  // events
  while(events.length){ const ev=events.shift();
    if(ev.e==='pad'){ const v=P.getLinearVelocity(); P.setLinearVelocity(V(v.x,T.springV)); st.airDash=true; ringFX(P.getPosition().x,-4.8,'#fd6',1.6); beep(180,0.25,'sine',0.08,720); addShake(0.2); burst(P.getPosition().x,-4.7,14,'#fd6',5,0.5); log('pad'); }
    if(ev.e==='slot'){ const c=ev.c; if(slot.solved||c.solved) continue;
      if(c.n===8){ slot.solved=true; c.solved=true; if(st.carry===c) st.carry=null; c.held=false; c.b.setType('static'); c.b.setTransform(V(slot.x,slot.y),0);
        hitstop=0.09; slowmo=0.35; addShake(0.45); burst(slot.x,slot.y,40,'#ffd54a',8,0.9); ringFX(slot.x,slot.y,'#ffd54a',3); flashTxt={t:0,s:'2, 4, 6, 8 — каждый раз +2!'}; beep(523,0.15,'triangle',0.07); setTimeout(()=>beep(659,0.15,'triangle',0.07),120); setTimeout(()=>beep(784,0.3,'triangle',0.07),240); buzz([20,40,30]); st.solvedAt=simT; log('solved'); }
      else { slot.rej=0.5; const dir = -1; c.held=false; if(st.carry===c) st.carry=null; c.b.setGravityScale(1); c.b.setLinearVelocity(V(dir*5.5,8.5)); c.b.setAngularVelocity(8); c.noPlayer=1.0;
        addShake(0.18); burst(slot.x,slot.y,12,'#f77',5,0.4); flashTxt={t:0,s:c.n+'? Пружина говорит «бо-ойнь»! Ищи +2'}; beep(160,0.3,'sawtooth',0.05,90); buzz(30); log('reject '+c.n); } }
    if(ev.e==='mouseHit'){ const p2=P.getPosition(), m2=M.getPosition(); const v=P.getLinearVelocity();
      if(p2.y>m2.y+0.55 && v.y<1){ P.setLinearVelocity(V(v.x,T.stompV)); ms.state='dizzy'; ms.t=0; ms.dizzy=2; addShake(0.2); hitstop=0.05; burst(m2.x,m2.y+0.4,14,'#fff',4,0.4); beep(700,0.12,'square',0.05,300); log('stomp'); }
      else if(st.stun<=0 && ms.state!=='dizzy'){ const d=Math.sign(p2.x-m2.x)||1; P.setLinearVelocity(V(d*T.knockV[0],T.knockV[1])); st.stun=0.28; hitstop=0.06; addShake(0.3); burst(p2.x,p2.y,12,'#fa5',5,0.4); beep(140,0.15,'square',0.06,80); buzz(25); ms.state='dizzy'; ms.t=0; ms.dizzy=0.9; log('knockback'); } }
    if(ev.e==='mouseCrate'){ if(ms.state!=='dizzy'){ ms.state='dizzy'; ms.t=0; ms.dizzy=2.2; M.applyLinearImpulse(V(0,8*M.getMass()),M.getPosition()); addShake(0.25); hitstop=0.05; log('crateHitMouse'); } }
    if(ev.e==='dashHit'){ const b=ev.b; if(b.c&&!b.c.held&&!b.c.solved&&b.c.hitAt!==st.dashId){ b.c.hitAt=st.dashId; b.applyLinearImpulse(V(st.face*5.5*b.getMass(),3.5*b.getMass()),b.getWorldPoint(V(0,0.2))); hitstop=0.04; addShake(0.22); burst(b.getPosition().x,b.getPosition().y,10,'#e8c79a',5,0.4); beep(110,0.12,'square',0.06,60); log('dashHit'); } }
    if(ev.e==='impact'){ if(ev.n>6){ burst(ev.p.x,ev.p.y,5,'#cba',3,0.3); addShake(Math.min(0.15,ev.n/80)); } }
  }
  // gate opens after solve
  if(slot.solved && gate.getPosition().y<7.4) gate.setLinearVelocity(V(0,3)); else gate.setLinearVelocity(V(0,0));
  // respawn safety (never punish): fell out somehow
  if(p.y<-12){ P.setTransform(V(2,2),0); P.setLinearVelocity(V(0,0)); }
  for(const c of crates){ const q=c.b.getPosition(); if(q.y<-12||q.x>69.5){ c.b.setTransform(V(c.n===8?33:9,6),0); c.b.setLinearVelocity(V(0,0)); } }
  world.step(dt,8,3); stats.steps++;
}

// ---------- render ----------
const cam={x:2,y:2};
function W2S(x,y){ return [(x-cam.x)*S+W/2, H*0.5-(y-cam.y)*S]; }
function rrect(x,y,w,h,r){ ctx.beginPath(); ctx.roundRect?ctx.roundRect(x,y,w,h,r):ctx.rect(x,y,w,h); }
function numBox(cx,cy,s,ang,n,glow){ ctx.save(); const [X,Y]=W2S(cx,cy); ctx.translate(X,Y); ctx.rotate(-ang); const w=s*2*S;
  ctx.fillStyle='#9a6a3a'; rrect(-w/2,-w/2,w,w,w*0.12); ctx.fill(); ctx.lineWidth=Math.max(2,w*0.06); ctx.strokeStyle='#4a2f17'; ctx.stroke();
  if(n!=null){ ctx.fillStyle=glow?'#2a6bd6':'#1c2f66'; rrect(-w*0.36,-w*0.36,w*0.72,w*0.72,w*0.08); ctx.fill();
    ctx.fillStyle='#fff'; ctx.font=`900 ${Math.round(w*0.6)}px NunitoLogo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.lineWidth=w*0.06; ctx.strokeStyle='#0b1430'; ctx.strokeText(n,0,w*0.03); ctx.fillText(n,0,w*0.03); }
  ctx.restore(); }
function draw(rdt){
  const p=P.getPosition(), v=P.getLinearVelocity();
  let tx=p.x+st.face*2.2+v.x*0.18; if(st.carry&&!slot.solved&&Math.abs(slot.x-p.x)<12) tx=(p.x+slot.x)/2+1.5; const ty=Math.max(p.y,1)+0.6; cam.x+=(tx-cam.x)*Math.min(1,rdt*4); cam.y+=(ty-cam.y)*Math.min(1,rdt*3);
  ctx.setTransform(DPR,0,0,DPR,0,0);
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#ffb46b'); g.addColorStop(0.6,'#e7739a'); g.addColorStop(1,'#5a3a7a'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  // parallax gears
  for(let i=0;i<14;i++){ const px=((i*7.3 - cam.x*0.3)%40+40)%40*S*0.5 - S*2, py=H*0.35+Math.sin(i*1.7)*H*0.12; ctx.fillStyle='rgba(90,50,90,0.25)'; ctx.beginPath(); ctx.arc(px,py,S*(1.2+i%3*0.6),0,7); ctx.fill(); }
  if(shake>0){ const a=shake*shake*14; ctx.translate((Math.random()-0.5)*a,(Math.random()-0.5)*a); }
  // solids
  ctx.fillStyle='#5b4636';
  for(const b of solids){ const r=b.rect; const [x1,y1]=W2S(r.x1,r.y2), [x2,y2]=W2S(r.x2,r.y1); ctx.fillRect(x1,y1,x2-x1,y2-y1); ctx.fillStyle='#8c7058'; ctx.fillRect(x1,y1,x2-x1,Math.min(8,y2-y1)); ctx.fillStyle='#5b4636'; }
  // pad
  { const [x1,y1]=W2S(22.4,-4.7),[x2]=W2S(27.6,0); ctx.fillStyle='#ffcf4a'; ctx.fillRect(x1,y1,x2-x1,S*0.3); ctx.strokeStyle='#b07a10'; ctx.lineWidth=3; for(let i=0;i<8;i++){ const xx=x1+(x2-x1)*(i+0.5)/8; ctx.beginPath(); ctx.moveTo(xx-6,y1+S*0.3); ctx.lineTo(xx+6,y1+S*0.6); ctx.stroke(); } }
  // gate
  { const q=gate.getPosition(); const [x1,y1]=W2S(q.x-0.4,q.y+2.5),[x2,y2]=W2S(q.x+0.4,q.y-2.5); ctx.fillStyle='#7c8aa0'; ctx.fillRect(x1,y1,x2-x1,y2-y1); ctx.fillStyle='#ffd54a'; ctx.font=`900 ${S*0.6}px NunitoLogo`; ctx.textAlign='center'; ctx.fillText('🔒',(x1+x2)/2,(y1+y2)/2); }
  { const [fx,fy]=W2S(60,0); ctx.fillStyle='#fff'; ctx.fillRect(fx,fy-S*3,4,S*3); ctx.fillStyle='#4cd964'; ctx.fillRect(fx+4,fy-S*3,S*1.1,S*0.7); }
  // shelf pattern
  for(const s of shelf) numBox(s.x,s.y,0.62,0,s.n,slot.solved);
  { const [X,Y]=W2S(slot.x,slot.y); const w=1.24*S; ctx.save(); ctx.translate(X,Y); const pul=0.6+0.4*Math.sin(simT*5); ctx.shadowColor='#7df'; ctx.shadowBlur=slot.solved?0:20*pul; ctx.strokeStyle=slot.rej>0?'#f55':'#8ef'; ctx.lineWidth=4; rrect(-w/2,-w/2,w,w,8); ctx.stroke();
    if(!slot.solved){ ctx.fillStyle='rgba(120,220,255,0.18)'; ctx.fill(); ctx.fillStyle='#e8fbff'; ctx.font=`900 ${w*0.62}px NunitoLogo`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('?',0,2); }
    ctx.restore(); }
  // rings
  const nr = (!st.hook && !st.carry) ? nearestRing() : (st.carry? nearestRing():null);
  for(const r of rings){ const [X,Y]=W2S(r.x,r.y); r.pulse+=rdt; const k=1+0.08*Math.sin(r.pulse*4); ctx.lineWidth=S*0.14; ctx.strokeStyle='#c99a3a'; ctx.beginPath(); ctx.arc(X,Y,S*0.42*k,0,7); ctx.stroke();
    if(r===nr && !st.hook){ ctx.strokeStyle='rgba(140,240,255,0.9)'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(X,Y,S*0.7,0,7); ctx.stroke(); const [px,py]=W2S(p.x,p.y+0.4); ctx.setLineDash([6,8]); ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(X,Y); ctx.stroke(); ctx.setLineDash([]); } }
  // rope
  if(st.hook){ const r=st.hookRing; const [X,Y]=W2S(r.x,r.y),[px,py]=W2S(p.x,p.y+0.4); ctx.strokeStyle='#8ff'; ctx.shadowColor='#4ef'; ctx.shadowBlur=14; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(X,Y); ctx.lineTo(px,py); ctx.stroke(); ctx.shadowBlur=0; }
  // crates
  for(const c of crates){ const q=c.b.getPosition(); if(c.n==null){ numBox(q.x,q.y,c.s,c.b.getAngle(),null); } else numBox(q.x,q.y,c.s,c.b.getAngle(),c.n,c.solved); }
  if(st.carry){ const q=st.carry.b.getPosition(); const [X,Y]=W2S(q.x,q.y),[px,py]=W2S(p.x,p.y+0.5); ctx.strokeStyle='rgba(120,230,255,0.6)'; ctx.lineWidth=3; for(let i=0;i<3;i++){ ctx.beginPath(); ctx.arc((X+px)/2,(Y+py)/2,6+i*6+(simT*30%6),0,7); ctx.stroke(); } }
  // mouse
  { const m=M.getPosition(); const [X,Y]=W2S(m.x,m.y); ctx.save(); ctx.translate(X,Y); if(ms.state==='dizzy') ctx.rotate(Math.sin(simT*20)*0.15);
    ctx.fillStyle=ms.state==='charge'?'#e05a5a':'#9aa3b5'; rrect(-0.55*S,-0.4*S,1.1*S,0.8*S,0.3*S); ctx.fill(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(ms.dir*0.3*S,-0.1*S,0.12*S,0,7); ctx.fill(); ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(ms.dir*0.33*S,-0.1*S,0.06*S,0,7); ctx.fill();
    ctx.strokeStyle='#c99a3a'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(0,-0.4*S); ctx.lineTo(0,-0.65*S); ctx.moveTo(-0.15*S,-0.65*S); ctx.lineTo(0.15*S,-0.65*S); ctx.stroke();
    if(ms.state==='warn'){ ctx.fillStyle='#ff3'; ctx.font=`900 ${S*0.9}px NunitoLogo`; ctx.textAlign='center'; ctx.fillText('!',0,-0.8*S); }
    if(ms.state==='dizzy'){ ctx.fillStyle='#ffe'; ctx.font=`900 ${S*0.45}px NunitoLogo`; ctx.textAlign='center'; ctx.fillText('★ ★',0,-0.8*S); }
    ctx.restore(); }
  // player (greybox: alive eyes look at the child)
  { const [X,Y]=W2S(p.x,p.y); ctx.save(); ctx.translate(X,Y); if(st.stun>0) ctx.globalAlpha=0.7+0.3*Math.sin(simT*40);
    ctx.fillStyle=st.dash>0?'#5fd0ff':'#1f8f8f'; rrect(-0.38*S,-0.7*S,0.76*S,1.52*S,0.3*S); ctx.fill(); ctx.fillStyle='#ffd9b8'; ctx.beginPath(); ctx.arc(0,-0.45*S,0.3*S,0,7); ctx.fill();
    const blink=(simT%3.2)<0.12; ctx.fillStyle='#222'; if(blink){ ctx.fillRect(-0.15*S,-0.47*S,0.1*S,0.03*S); ctx.fillRect(0.05*S,-0.47*S,0.1*S,0.03*S);} else { ctx.beginPath(); ctx.arc(-0.1*S+st.face*0.03*S,-0.47*S,0.05*S,0,7); ctx.arc(0.1*S+st.face*0.03*S,-0.47*S,0.05*S,0,7); ctx.fill(); }
    ctx.fillStyle='#d4a63a'; ctx.beginPath(); ctx.arc(st.face*0.42*S,0.05*S,0.16*S,0,7); ctx.fill(); ctx.restore(); }
  // particles & ring FX
  for(let i=parts.length-1;i>=0;i--){ const q=parts[i]; q.t+=rdt; if(q.t>q.life){ parts.splice(i,1); continue; } if(!q.ghost){ q.vy-=12*rdt; q.x+=q.vx*rdt; q.y+=q.vy*rdt; }
    const [X,Y]=W2S(q.x,q.y); const a=1-q.t/q.life; ctx.globalAlpha=q.ghost?a*0.45:a; ctx.fillStyle=q.col; ctx.beginPath(); if(q.ghost){ rrect(X-0.38*S,Y-0.7*S,0.76*S,1.52*S,0.3*S);} else ctx.arc(X,Y,q.r*S*(0.5+a*0.5),0,7); ctx.fill(); ctx.globalAlpha=1; }
  for(let i=rings2.length-1;i>=0;i--){ const q=rings2[i]; q.t+=rdt; if(q.t>0.45){ rings2.splice(i,1); continue; } const [X,Y]=W2S(q.x,q.y); const k=q.t/0.45; ctx.globalAlpha=1-k; ctx.strokeStyle=q.col; ctx.lineWidth=6*(1-k)+1; ctx.beginPath(); ctx.arc(X,Y,q.r*S*(0.3+k),0,7); ctx.stroke(); ctx.globalAlpha=1; }
  // HUD
  ctx.setTransform(DPR,0,0,DPR,0,0);
  const fs=Math.round(H*0.075); ctx.font=`${fs}px FairyLogo, serif`; const task='Продолжи ряд: 2, 4, 6, …'; const tw=ctx.measureText(task).width;
  ctx.fillStyle='rgba(30,20,60,0.72)'; rrect(W/2-tw/2-20,10,tw+40,fs*1.45,fs*0.4); ctx.fill(); ctx.fillStyle='#fff6d8'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(task,W/2,10+fs*0.75);
  if(flashTxt){ flashTxt.t+=rdt; if(flashTxt.t>2.4) flashTxt=null; else { const f2=Math.round(H*0.065); ctx.font=`900 ${f2}px NunitoLogo`; const w2=ctx.measureText(flashTxt.s).width; const yy=H*0.28; ctx.globalAlpha=Math.min(1,(2.4-flashTxt.t)*3); ctx.fillStyle='rgba(255,255,255,0.92)'; rrect(W/2-w2/2-18,yy-f2*0.8,w2+36,f2*1.6,f2*0.5); ctx.fill(); ctx.fillStyle='#3a1f66'; ctx.fillText(flashTxt.s,W/2,yy); ctx.globalAlpha=1; } }
  const B=btns(); const ak=actionKind(); const lab={throw:'БРОСОК',hook:'КРЮК',dash:'РЫВОК'}[ak]; const col={throw:'#ff9f43',hook:'#38d6ff',dash:'#a78bfa'}[ak];
  function btn(b,label,c,pressed){ ctx.globalAlpha=pressed?0.95:0.75; ctx.fillStyle=c; ctx.beginPath(); ctx.arc(b.x,b.y,b.r*(pressed?0.92:1),0,7); ctx.fill(); ctx.lineWidth=4; ctx.strokeStyle='rgba(255,255,255,0.9)'; ctx.stroke(); ctx.globalAlpha=1; ctx.fillStyle='#fff'; ctx.font=`900 ${Math.round(b.r*0.36)}px NunitoLogo`; ctx.fillText(label,b.x,b.y+2); }
  btn(B.jump,'ПРЫЖОК','#4cd964',inp.jump); btn(B.act,lab,col,inp.act);
  if(stick){ ctx.globalAlpha=0.5; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(stick.ox,stick.oy,H*0.12,0,7); ctx.fill(); ctx.globalAlpha=0.85; ctx.beginPath(); const dx=Math.max(-H*0.12,Math.min(H*0.12,stick.x-stick.ox)); ctx.arc(stick.ox+dx,stick.oy,H*0.06,0,7); ctx.fill(); ctx.globalAlpha=1; }
  else { ctx.globalAlpha=0.25; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(W*0.13,H*0.78,H*0.12,0,7); ctx.fill(); ctx.globalAlpha=0.6; ctx.font=`900 ${Math.round(H*0.04)}px NunitoLogo`; ctx.fillText('◀  ▶',W*0.13,H*0.78); ctx.globalAlpha=1; }
  ctx.font=`700 ${Math.round(H*0.035)}px NunitoLogo`; ctx.textAlign='left'; ctx.fillStyle='rgba(255,255,255,0.8)'; ctx.fillText('fps '+stats.fps,10,H-14);
  if(H>W){ ctx.fillStyle='rgba(20,10,40,0.92)'; ctx.fillRect(0,0,W,H); ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.font=`${Math.round(W*0.08)}px FairyLogo`; ctx.fillText('Поверни телефон ⟳',W/2,H/2); }
}

function frame(now){
  let rdt=Math.min(0.05,(now-last)/1000); last=now;
  stats.frames++; stats.fpsT+=rdt; if(stats.fpsT>=1){ stats.fps=Math.round(stats.frames/stats.fpsT); if(simT>2) stats.minFps=Math.min(stats.minFps,stats.fps); stats.frames=0; stats.fpsT=0; }
  shake=Math.max(0,shake-rdt*2.2);
  if(slowmo<1) slowmo=Math.min(1,slowmo+rdt*1.2);
  if(hitstop>0){ hitstop-=rdt; } else { acc+=rdt*slowmo; let n=0; while(acc>=DT && n<4){ step(DT); acc-=DT; n++; } if(n>=4) acc=0; }
  draw(rdt); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// test harness
window.__T = { M, ext, st, slot, ms, stats, P, crates, T, tp(x,y){ if(st.hook) unhook(false); P.setTransform(V(x,y),0); P.setLinearVelocity(V(0,0)); cam.x=x; cam.y=y; },
  pos(){ const p=P.getPosition(), v=P.getLinearVelocity(); return {x:p.x,y:p.y,vx:v.x,vy:v.y,ground:st.ground,hook:!!st.hook,carry:st.carry?st.carry.n:null}; },
  drop(){ if(st.carry){ st.carry.held=false; st.carry.b.setGravityScale(1); st.carry.noPlayer=0.5; st.carry=null; } }, press(k){ if(k==='jump') inp.jumpP=true; else inp.actP=true; }, kind:actionKind };
