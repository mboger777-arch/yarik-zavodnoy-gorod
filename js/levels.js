'use strict';
// ===== Уровни 1–5: улицы Заводного города =====
function lvBase(i,o){const L=newLevel(Object.assign({idx:i,bg:'l'+(i+1),trig:[],tasks:[],hint:null,exitX:null,won:false},o));POP.x=L.spawn.x-1.5;POP.y=L.spawn.y;POP.on=true;L.cam.x=L.spawn.x;L.cam.y=L.spawn.y+1;return L}
function trig(x,fn,o){LV.trig.push(Object.assign({x,fn,done:0},o||{}))}
function startTask(i){const L=LV;if(L.cur===i&&L.task&&L.task.started)return;L.cur=i;L.task=L.tasks[i];if(!L.task)return;L.task.started=1;if(L.task.line)sayNow(L.task.line)}
function solveTask(i,o){const L=LV,t=L.tasks[i];if(t.solved)return;t.solved=1;t.st=L.t;if(t.sign){const q=t.sign.vals.indexOf('?');if(q>=0)t.sign.vals[q]=t.ans;t.sign.mark=-1;t.sign.solvedT=L.t}
 if(t.hud){const q=t.hud.indexOf('?');if(q>=0)t.hud[q]=t.ans}L.hudFlash=L.t;if(t.ok)sayNow(t.ok);if(t.gate)setTimeout(()=>{if(LV===L){t.gate.open=true;SFX.gate();addShake(.15)}},700);
 const nx=L.tasks.findIndex(q=>!q.solved);if(nx>=0&&t.autoNext!==false)setTimeout(()=>{if(LV===L&&!L.tasks[nx].started&&L.tasks[nx].auto)startTask(nx)},2600)}
function lvCommon(dt){const L=LV,p=ST.P.getPosition();for(const t of L.trig){if(!t.done&&p.x>t.x&&(!t.cond||t.cond())){t.done=1;t.fn()}}
 if(L.exitX!=null&&!L.won&&p.x>L.exitX&&L.tasks.every(t=>t.solved))winLevel()}
function exitDraw(K){const L=LV;if(L.exitX==null)return;const [x,y]=w2s(L.exitX+1.2,L.exitY||0);const h=K*3.4;const open=L.tasks.every(t=>t.solved);X.save();if(open){X.shadowColor='#ffe066';X.shadowBlur=30+Math.sin(L.t*5)*10}spr('gate',x,y,h,{ax:.5,ay:1,a:open?1:.75});X.restore();
 if(open){for(let i=0;i<3;i++){const a=L.t*2+i*2.1;symDraw('st',x+Math.cos(a)*K*1.2,y-h*.6+Math.sin(a)*K*.8,K*.16)}}}
// подсказки управления (обучение): снимаются, когда ребёнок сделал движение
function hintOn(k,line){if(SV.tut[k]&&k!=='hook')return;LV.hint=k;if(line)sayNow(line)}
function hintDone(k){if(LV.hint===k){LV.hint=null}SV.tut[k]=1;save()}
// ---------- 1. Крыши-качели ----------
const LEVELS=[];
LEVELS[0]=function(){const L=lvBase(0,{bg:'l1',music:'level',spawn:{x:-2,y:1.2},bounds:{x0:-7,x1:101,y0:-7},killY:-12});
 mk.ground(-7,-9,16,0);mk.ground(-8,-9,-7,14);
 mk.npc('u',1.5,0,{face:1});
 mk.ground(6,0,7.3,1.3);// труба
 for(let r=0;r<3;r++)for(let i=0;i<3-r;i++)mk.crate(null,10.4+i*.62+r*.31,.3+r*.6,{s:.3,light:true});
 const gap=(E,syms,good,ans,ti)=>{mk.ground(E-.01,-9,E,0);mk.ground(E,-9,E+12,-6.2);const pad=mk.pad(E+6,-6,11.6,{to:{x:E-2.5,y:0}});
  const rs=[];syms.forEach((s,k)=>{rs.push(mk.ring(E+2.6+k*3.1,5.3+(k===1?.5:0),{sym:s,good:k===good,task:ti,land:k===good?{x:E+14.2,y:0}:null}))});return rs};
 const T=L.tasks;
 // станция 1
 const s1=mk.sign(12.5,3.4,['r','b','r','b','?'],{post:3.4});T.push({vals:s1.vals,sign:s1,ans:'r',line:'l1_t1',ok:'l1_ok1',bad:'l1_bad'});gap(16,['b','r','g'],1,'r',0);
 mk.ground(28,-9,44,0);mk.ground(36,0,37.4,2.2);mk.ground(38.3,4.5,41,4.9,{oneway:true});mk.gear(39.6,5.6,0);
 const s2=mk.sign(41,3.6,['c','t','s','c','t','?'],{post:3.6});T.push({vals:s2.vals,sign:s2,ans:'s',line:'l1_t2',ok:'l1_ok2',bad:'l1_bad'});gap(44,['t','c','s'],2,'s',1);
 mk.ground(56,-9,72,0);mk.ground(61.4,0,62.6,1.5);const hp=mk.pad(62,1.5,1.1,{to:{x:67.5,y:7.6}});mk.ground(65.5,7.2,70,7.6,{oneway:true});
 const hat=mk.item('hat',68.6,8.4,{h:.9,on:()=>{SV.hat=1;save();sayNow('s_hat');floatT('★','#c9a0ff',68.6,9)}});if(SV.hat)hat.got=1;
 const s3=mk.sign(69,3.6,['c','c','t','c','c','t','?'],{post:3.6,size:.8});T.push({vals:s3.vals,sign:s3,ans:'c',line:'l1_t3',ok:'l1_ok3',bad:'l1_bad'});gap(72,['c','t','s'],0,'c',2);
 mk.ground(84,-9,101,0);mk.ground(101,-9,102,14);L.exitX=94;
 L.ringHint=true;
 L.camFn=(tx,ty)=>{const p=ST.P.getPosition();for(const E of [16,44,72]){if(p.x>E-6.5&&p.x<E+15&&p.y>-1.5)return[tx,Math.max(ty,3.2)]}return[tx,ty]};
 trig(-100,()=>{run(async()=>{await wait(500);await say('l1_s');if(!SV.tut.move)hintOn('move','o_move')})});
 trig(3.2,()=>hintOn('jump','o_jump'));trig(8,()=>hintOn('dash','o_dash'));
 trig(11.5,()=>{hintDone('dash');startTask(0);setTimeout(()=>{if(LV===L&&!T[0].solved){LV.hint='hook';sayQ('o_hook')}},300)});
 trig(37,()=>startTask(1));trig(64,()=>startTask(2),{cond:()=>ST.ground>0});
 L.onHook=r=>{if(L.hint==='hook')L.hint=null;if(r.task!=null&&r.good){solveTask(r.task)}};
 L.onSlip=r=>{sayNow('l1_bad');L.misses=(L.misses||0)+1};
 L.onJump=()=>{if(L.hint==='jump')hintDone('jump')};L.onDash=()=>{if(L.hint==='dash')hintDone('dash')};
 L.update=dt=>{lvCommon(dt);if(L.hint==='move'&&Math.abs(ST.P.getPosition().x-L.spawn.x)>2.5)hintDone('move')};
 L.drawBack=K=>exitDraw(K);
 L.check={x:-1,y:0};trig(29,()=>L.check={x:30,y:0});trig(57,()=>L.check={x:58,y:0});trig(85,()=>L.check={x:86,y:0});
 return L};
// ---------- 2. Лестница-пружина ----------
LEVELS[1]=function(){const L=lvBase(1,{bg:'l2',music:'level2',spawn:{x:0,y:1.2},bounds:{x0:-6,x1:84,y0:-1.4},killY:-8});
 mk.ground(-6,-3,24,0);mk.ground(-7,-3,-6,30);
 mk.npc('u',2.5,0);
 // тайник: батут на полку с шестерёнкой
 mk.pad(-4.3,0,1.2,{to:{x:-1.5,y:5.3}});mk.ground(-5.8,4.9,1.2,5.3,{oneway:true});mk.gear(-.5,6.2,1);
 const T=L.tasks;const k=.45;
 const stair=(x0,base,vals,ans,ti,boxes,land,bx)=>{const st=[];vals.forEach((v,i)=>st.push(mk.step(x0+i*1.3,1.3,v*k,v,{base})));
  const sx=x0+vals.length*1.3,h=ans*k;const b=L.world.createBody({type:'kinematic',position:V(sx,base+.2-h/2)});b.createFixture(pl.Box(.65,h/2),{friction:.8,userData:ud('ground')});
  const s={x:sx,w:1.3,h,v:'?',b,base,kin:1,show:true};L.steps.push(s);L.solids.push({x1:sx-.65,y1:base,x2:sx+.65,y2:base+h,b,look:'step',st:s,clipY:base});
  const sl=mk.slot(sx,base+1.25,ans,{size:.85,spit:[4.2,15]});
  const sign=mk.sign(x0+1.6,base+4.7,vals.concat(['?']),{post:0});
  T.push({sl,vals:sign.vals,sign,ans,line:'l2_t'+(ti+1),ok:'l2_ok'+(ti+1),bad:'l2_bad',auto:false});
  boxes.forEach((v,j)=>mk.crate(v,bx[j],base+.6));
  sl.onOk=c=>{c.hide=1;c.dead=1;try{c.b.setActive(false)}catch(_){}s.v=ans;s.glow=1;s.rising=1;solveTask(ti);SFX.rise()};
  sl.onBad=c=>{sayNow('l2_bad')};
  s.land=land;return s};
 const sA=stair(12,0,[1,2,3,4],5,0,[6,5,3],{x:22.5,y:6.5},[4.5,7,9.3]);
 mk.ground(17.85,0,44,6.5);
 const sB=stair(35.5,6.5,[2,4,6],8,1,[7,10,8],{x:45.5,y:13.5},[22,24.5,29]);
 mk.mouse(31,7,26.5,33.5);
 mk.ground(40.05,6.5,70,13.5);
 const sC=stair(59.5,13.5,[1,3,5],7,2,[6,9,7],{x:68.5,y:19.5},[45.5,49,53]);
 mk.mouse(51,14,47,56.5);
 mk.ground(64.05,13.5,84,19.5);mk.ground(84,-3,85,40);L.exitX=78;L.exitY=19.5;
 L.update=dt=>{lvCommon(dt);for(const s of L.steps){if(s.rising){const y=s.b.getPosition().y,ty=s.base+s.h/2;if(y<ty-.01)s.b.setLinearVelocity(V(0,Math.min(3,(ty-y)*6+.5)));else{s.b.setLinearVelocity(V(0,0));s.b.setPosition(V(s.x,ty));s.rising=0;
   const pd=mk.pad(s.x,s.base+s.h,1.15,{to:s.land});pd.apex=1.2;wburst(s.x,s.base+s.h,20,'#ffd54a',5,.6);sayNow('l2_up')}}}};
 trig(-100,()=>{run(async()=>{await wait(400);await say('l2_s');if(!SV.tut.carry){L.hint='carry';await say('o_carry')}startTask(0)})});
 trig(20,()=>startTask(1),{cond:()=>ST.P.getPosition().y>6});trig(44,()=>startTask(2),{cond:()=>ST.P.getPosition().y>13});
 L.onGrab=()=>{if(L.hint==='carry'){}};L.onThrow=()=>{if(L.hint==='carry')hintDone('carry')};
 L.targets=c=>{const t=L.task;const sl=t&&!t.solved&&t.sl?[t.sl]:L.slots.filter(s=>!s.solved);return sl.map(s=>({x:s.x,y:s.y,any:true}))};
 L.drawBack=K=>exitDraw(K);
 trig(19,()=>L.check={x:21,y:6.5},{cond:()=>ST.P.getPosition().y>6});trig(42,()=>L.check={x:44,y:13.5},{cond:()=>ST.P.getPosition().y>13});
 return L};
// ---------- 3. Башня самозванца ----------
LEVELS[2]=function(){const L=lvBase(2,{bg:'l3',music:'level',spawn:{x:0,y:1.2},bounds:{x0:-6,x1:86,y0:-1.4},killY:-8});
 mk.ground(-6,-3,86,0);mk.ground(-7,-3,-6,30);mk.ground(86,-3,87,30);
 mk.npc('u',2.5,0);
 const T=L.tasks;
 const tower=(x,vals,imp,ans,ti,cands,cx)=>{const cr=vals.map((v,i)=>mk.crate(v,x,.6+i*1.2,{s:.6,pinned:true,tower:ti,imp:i===imp,respawn:false}));
  const sl=mk.slot(x,.6+imp*1.2,ans,{size:.55,act:false});sl.px=x;sl.py=.6+imp*1.2;
  const hud=vals.slice();const t={vals:hud,hud:null,ans,line:'l3_t'+(ti+1),ok:'l3_ok'+(ti+1),bad:'l3_bad',tower:x,cr,sl,imp:cr[imp],idx:imp,auto:false};T.push(t);
  cands.forEach((v,j)=>mk.crate(v,cx[j],.7));
  sl.onOk=c=>{solveTask(ti);for(const q of cr)q.wob=1};sl.onBad=c=>sayNow('l3_bad');return t};
 tower(14,[5,10,15,17,25],3,20,0,[20,18,30],[5.5,7.5,9.5]);const g1=mk.gate(20,0,4.2);T[0].gate=g1;
 tower(42,[25,30,33,40,45],2,35,1,[35,34,50],[30,33,36]);const g2=mk.gate(48,0,4.2);T[1].gate=g2;
 mk.mouse(27,.5,23,37);
 mk.pad(45.5,0,1.1,{to:{x:42,y:6.6}});mk.gear(42,7.6,2);
 tower(68,[12,20,25,30,35],0,15,2,[15,10,16],[56,58.5,61]);
 mk.mouse(60,.5,52,64);
 L.exitX=78;
 L.targets=c=>{const t=T[L.cur];if(!t||t.solved)return[];if(!t.knocked)return[{x:t.tower,y:t.imp.b.getPosition().y,pri:1,direct:true}];return[{x:t.sl.x,y:t.sl.y,pri:1,direct:true}]};
 const knock=(t,dir)=>{if(t.knocked)return;t.knocked=1;const c=t.imp;c.pinned=false;c.revealed=1;c.pass=true;c.passT=1.2;
  setTimeout(()=>{try{c.b.setType('dynamic');c.b.setAwake(true);c.b.setLinearVelocity(V(dir*7,8));c.b.setAngularVelocity(dir*-9)}catch(_){}},0);
  hitstop(.12);FX.slow=.4;addShake(.5);const q=c.b.getPosition();wburst(q.x,q.y,30,'#ff8a5a',7,.7);ringFX(q.x,q.y,'#ff8a5a',2.5);SFX.smash();vib([30,30,30]);floatT('Бах!','#ffd27a',q.x,q.y+1);
  setTimeout(()=>{if(LV!==L)return;t.sl.act=true;t.vals[t.idx]='?';t.hud=t.vals;sayNow('l3_knock')},450);setTimeout(()=>{c.nograb=1},10);setTimeout(()=>{if(LV===L){c.dead=1;try{c.b.setActive(false)}catch(_){}const q=c.b.getPosition();wburst(q.x,q.y,16,'#fff',4,.5)}},1500)};
 L.onDashHit=c=>{const t=T[L.cur];if(!t||c.tower==null)return;if(c.imp&&c.tower===L.cur&&!t.knocked)knock(t,ST.face);else if(c.pinned){c.wob=1;c.shake=.6;SFX.clank(1);if(lim('wr',2500))sayNow('l3_wrong')}};
 L.onCC=(a,b)=>{const t=T[L.cur];if(!t)return;for(const [x,y] of [[a,b],[b,a]]){if(x.imp&&x.tower===L.cur&&!t.knocked&&y.thrown>0&&!y.held){const v=y.b.getLinearVelocity();knock(t,Math.sign(v.x)||1)}else if(x.pinned&&y.thrown>0&&!y.pass&&x.tower===L.cur&&!t.knocked){x.wob=1;x.shake=.6;if(lim('wr',2500))sayNow('l3_wrong')}}};
 trig(-100,()=>{run(async()=>{await wait(400);await say('l3_s')})});
 trig(3.5,()=>{startTask(0);if(!SV.tut.knock)setTimeout(()=>{if(LV===L)sayQ('o_knock');SV.tut.knock=1;save()},200)});trig(24,()=>startTask(1));trig(51,()=>{startTask(2);sayQ('o_stomp')});
 L.drawBack=K=>{exitDraw(K);for(const t of T){const [x,y0]=w2s(t.tower,0),[,y1]=w2s(t.tower,6.2);X.strokeStyle='#8a6a3a';X.lineWidth=K*.12;X.beginPath();X.moveTo(x-K*.75,y0);X.lineTo(x-K*.75,y1);X.moveTo(x+K*.75,y0);X.lineTo(x+K*.75,y1);X.stroke();X.fillStyle='#c9a24a';X.fillRect(x-K*.9,y1-K*.15,K*1.8,K*.2)}};
 trig(21,()=>L.check={x:22,y:0});trig(49,()=>L.check={x:50,y:0});
 L.update=dt=>lvCommon(dt);
 return L};
// ---------- 4. Обратный отсчёт ----------
LEVELS[3]=function(){const L=lvBase(3,{bg:'l4',music:'level2',spawn:{x:0,y:17.5},bounds:{x0:-6,x1:104,y0:1.5},killY:-6});
 const pts=[[-6,16],[8,16],[20,13],[33,13],[45,10],[57,10],[69,6.5],[81,6.5],[89,4],[104,4]];mk.slope(pts,{depth:20});mk.ground(-7,0,-6,40);mk.ground(104,0,105,40);
 mk.npc('u',2.5,16);
 const T=L.tasks;
 const wall=(x,y,lowV,highV,good,ti,vals)=>{mk.ground(x-.3,y+1.9,x+.3,y+2.1);mk.ground(x-.3,y+4.1,x+.3,y+12);mk.ground(x-3.4,y+1.9,x-.3,y+2.1,{oneway:true});
  const dl=mk.door(x,y,1.9,lowV,good===0,{task:ti}),dh=mk.door(x,y+2.1,2.0,highV,good===1,{task:ti});
  const sign=mk.sign(x-7,y+4.6,vals,{post:4.6,size:.85});T.push({vals:sign.vals,sign,ans:good===0?lowV:highV,line:'l4_t'+(ti+1),ok:'l4_ok'+(ti+1),bad:'l4_bad',auto:false,doors:[dl,dh]})};
 wall(28,13,4,5,0,0,[10,8,6,'?']);wall(52,10,4,3,1,1,[9,7,5,'?']);wall(76,6.5,8,5,1,2,[20,15,10,'?']);
 mk.mouse(39,12,35,43.5);mk.mouse(63,9,59,67);mk.mouse(92,5,90,98);
 L.onDoor=d=>{const t=T[d.task];if(d.good){if(!t.solved){d.open=true;solveTask(d.task);ST.cheer=1;hitstop(.08);addShake(.4);wburst(d.x,d.y0+d.h/2,40,'#ffd54a',7,.8);ringFX(d.x,d.y0+d.h/2,'#ffd54a',2.5);SFX.ok();vib([20,40,30]);for(const o of t.doors)if(o!==d)o.gone=1}}
  else{if(d.rej>0)return;d.rej=.6;const p=ST.P.getPosition();ST.P.setLinearVelocity(V(-9,8));ST.launch=.35;ST.react=.9;SFX.boing();SFX.bad();addShake(.25);vib(30);wburst(p.x+.4,p.y,14,'#ff6a5a',5,.45);floatT('?','#ff8a7a',d.x,d.y0+d.h+.5);sayNow('l4_bad')}};
 // тайное кольцо за часами
 const clock={x:62,y:18};const hr=mk.ring(62,15.6,{hidden:true,land:{x:66.8,y:16.6}});mk.ground(64.5,16.2,69,16.6,{oneway:true});mk.gear(67.5,17.6,3);
 trig(55,()=>{if(hr.hidden){hr.hidden=false;ringFX(hr.x,hr.y,'#ffd54a',2);SFX.star();sayNow('s_ring');if(SV.ring!==1){SV.ring=1;save()}}});
 L.exitX=96;L.exitY=4;
 trig(-100,()=>{run(async()=>{await wait(400);await say('l4_s')})});
 trig(14,()=>startTask(0));trig(38,()=>{startTask(1)});trig(62,()=>startTask(2));
 trig(30,()=>sayQ('o_stomp'),{cond:()=>!SV.tut.stomp});L.onStomp=()=>{SV.tut.stomp=1;save()};
 L.drawBack=K=>{const [cx,cy]=w2s(clock.x,clock.y);const r=K*2.3;X.save();X.fillStyle='#f6ead0';X.strokeStyle='#8a5a1c';X.lineWidth=K*.3;X.beginPath();X.arc(cx,cy,r,0,7);X.fill();X.stroke();X.fillStyle='#3a2410';
  for(let i=0;i<12;i++){const a=i/12*6.283;X.beginPath();X.arc(cx+Math.cos(a)*r*.8,cy+Math.sin(a)*r*.8,K*.1,0,7);X.fill()}X.lineCap='round';X.strokeStyle='#3a2410';X.lineWidth=K*.14;const a1=-LV.t*.5,a2=-LV.t*.05;X.beginPath();X.moveTo(cx,cy);X.lineTo(cx+Math.sin(a1)*r*.7,cy-Math.cos(a1)*r*.7);X.moveTo(cx,cy);X.lineTo(cx+Math.sin(a2)*r*.45,cy-Math.cos(a2)*r*.45);X.stroke();X.restore();exitDraw(K)};
 L.update=dt=>{lvCommon(dt);for(const d of L.doors)if(d.gone&&!d.goneDone){d.goneDone=1}};
 trig(34,()=>L.check={x:34,y:13});trig(58,()=>L.check={x:58,y:10});trig(82,()=>L.check={x:82,y:6.5});
 return L};
// ---------- 5. Таблица-кран ----------
LEVELS[4]=function(){const L=lvBase(4,{bg:'l5',music:'level',spawn:{x:0,y:1.2},bounds:{x0:-6,x1:62,y0:-1.4},killY:-8});
 mk.ground(-6,-3,62,0);mk.ground(-7,-3,-6,30);mk.ground(62,-3,63,30);mk.ground(14.6,0,15,.6);
 mk.npc('u',1.5,0);
 const T=L.tasks;const COLX=[19.4,21,22.6,24.2],ROWY=[2.9,4.4,5.9];
 const rows=[[1,2,3,'?'],[2,4,'?',8],[5,'?',15,20]],ans=[4,6,10];
 L.table={rows,COLX,ROWY};
 rows.forEach((r,i)=>{const ci=r.indexOf('?');const sl=mk.slot(COLX[ci],ROWY[i],ans[i],{size:.62});sl.row=i;sl.ci=ci;sl.hide=true;
  T.push({vals:r.slice(),ans:ans[i],line:'l5_t'+(i+1),ok:'l5_ok'+(i+1),bad:'l5_bad',sl,auto:true});
  sl.onOk=c=>{c.hide=1;c.dead=1;try{c.b.setActive(false)}catch(_){}rows[i][ci]=ans[i];solveTask(i);L.rowFlash[i]=L.t;if(T.every(t=>t.solved)){setTimeout(()=>{if(LV===L){L.gate.open=true;SFX.gate();sayNow('l5_end')}},2600)}};
  sl.onBad=c=>{c.wob=1;sayNow('l5_bad')}});
 L.rowFlash=[-9,-9,-9];
 L.gate=mk.gate(33,0,5);
 // конвейер шариков
 const seq=[4,6,10,5,7,9,12,3,8];let si=0;L.balls=[];
 const spawn=()=>{const cu=L.task&&!L.task.solved?ans[T.indexOf(L.task)]:null;const has=cu!=null&&L.balls.some(b=>!b.dead&&!b.solved&&b.v===cu);let v=seq[si%seq.length];si++;if(cu!=null&&!has&&si%2===0)v=cu;if(T[ans.indexOf(v)]&&T[ans.indexOf(v)].solved)return spawn();const c=mk.crate(v,1.5,4,{ball:true,s:.5});c.respawn=false;L.balls.push(c);ringFX(1.5,4,'#9ef3ff',1)};
 L.spawnT=0;
 // кран-крюк для шестерёнки
 mk.ring(38,7.6);mk.ring(43,7.9,{land:{x:47.2,y:8.2}});mk.ground(45.5,7.8,49,8.2,{oneway:true});mk.gear(47.2,9,4);
 L.exitX=54;L.camFn=(tx,ty)=>{const p=ST.P.getPosition();if(p.x>15.5&&p.x<28&&p.y<3)return[tx,3.6];return[tx,ty]};
 L.targets=c=>{const sl=L.task&&!L.task.solved?[L.task.sl]:L.slots.filter(s=>!s.solved);return sl.map(s=>({x:s.x,y:s.y,any:true,pri:2,direct:true}))};
 L.update=dt=>{lvCommon(dt);L.spawnT-=dt;const live=L.balls.filter(b=>!b.dead&&!b.solved);if(live.length>=4&&L.spawnT<=0&&L.task&&!L.task.solved){const cu=ans[T.indexOf(L.task)];if(!live.some(b=>b.v===cu)){const o=live.find(b=>!b.held&&b!==ST.carry);if(o){const q=o.b.getPosition();o.dead=1;o.hide=1;try{o.b.setActive(false)}catch(_){}wburst(q.x,q.y,12,'#9ef3ff',3,.4);live.splice(live.indexOf(o),1)}}}
  if(live.length<4&&L.spawnT<=0&&!T.every(t=>t.solved)){spawn();L.spawnT=1.2}
  for(const b of live){const q=b.b.getPosition();if(!b.held&&q.x<14.4&&q.y<1.2&&q.x>-1){const v=b.b.getLinearVelocity();b.b.setLinearVelocity(V(Math.max(v.x,2.2),v.y))}}
  if(!L.task||L.task.solved){const n=T.findIndex(t=>!t.solved);if(n>=0&&L.t>6)startTask(n)}};
 L.onThrow=(c,t)=>{if(L.hint==='carry')hintDone('carry')};
 trig(-100,()=>{run(async()=>{await wait(400);await say('l5_s');await say('o_aim');startTask(0)})});
 L.drawBack=K=>{// конвейер
  const [a1,b1]=w2s(-1,.0),[a2,b2]=w2s(14.6,0);X.fillStyle='#3a2a20';X.fillRect(a1,b1-K*.12,a2-a1,K*.12);X.fillStyle='#d9a24a';for(let x=0;x<16;x+=.6){const xx=w2s(-1+((x+LV.t*2.2)%15.6),0)[0];X.fillRect(xx,b1-K*.12,K*.12,K*.12)}
  // таблица
  const [x0,y0]=w2s(COLX[0]-1.1,ROWY[2]+1.1),[x1,y1]=w2s(COLX[3]+1.1,ROWY[0]-1.1);X.save();const g=X.createLinearGradient(0,y0,0,y1);g.addColorStop(0,'#3a2a5a');g.addColorStop(1,'#241838');X.fillStyle=g;rr(x0,y0,x1-x0,y1-y0,K*.3);X.fill();X.lineWidth=K*.14;X.strokeStyle='#e0b25a';X.stroke();
  const [px0,py0]=w2s(COLX[0]-1.1,0);X.fillStyle='#8a6a3a';X.fillRect(x0+K*.3,y1,K*.25,py0-y1);X.fillRect(x1-K*.55,y1,K*.25,py0-y1);
  const ts=K*1.3;const p=ST.P.getPosition();const tgt=ST.carry?throwTarget(ST.carry):null;
  rows.forEach((r,i)=>r.forEach((v,j)=>{const [cx,cy]=w2s(COLX[j],ROWY[i]);const q=v==='?';const fl=clamp(1-(LV.t-L.rowFlash[i]),0,1);X.fillStyle=q?'rgba(255,224,102,.22)':(fl>0?`rgba(255,${230-fl*40},120,1)`:'#fffaf0');rr(cx-ts/2+3,cy-ts/2+3,ts-6,ts-6,ts*.18);X.fill();
   if(q){X.setLineDash([6,5]);X.strokeStyle=tgt&&Math.abs(tgt.x-COLX[j])<.1&&Math.abs(tgt.y-ROWY[i])<.1?'#ffffff':'#ffe066';X.lineWidth=3;X.stroke();X.setLineDash([])}
   valDraw(v,cx,cy,ts*.9,{col:q?'#ffe066':'#1d1030',st:q?'#2a1206':'#fff',box:[cx-ts/2,cy-ts/2,cx+ts/2,cy+ts/2],id:'table'})}));
  // правила строк
  rows.forEach((r,i)=>{const [rx,ry]=w2s(COLX[3]+1.75,ROWY[i]);const rule=['+1','+2','+5'][i];X.fillStyle=T[i].solved?'#ffd54a':'rgba(255,255,255,.25)';X.beginPath();X.arc(rx,ry,K*.42,0,7);X.fill();if(T[i].solved)txt(rule,rx,ry,K*.42,'#3a1a06',{f:NUM,st:'#fff',lw:4,box:[rx-K*.42,ry-K*.42,rx+K*.42,ry+K*.42],id:'rule'})});
  X.restore();exitDraw(K)};
 return L};
