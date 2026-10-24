'use strict';
// ===== Сцены: загрузка, титул, вступление, карта, игра (HUD, управление, реплики), победа, финал, медаль, поворот, главный цикл =====
const SC={};if(typeof PIN_SC!=='undefined')SC.pin=PIN_SC;
Object.assign(G,{scene:'load',arg:null,t0:0,auditReq:0,_aud:null,_fps:[],heroes:[],acc:0,kind:false});
function go(name,arg){GEN++;stopTalk();G.scene=name;G.arg=arg;G.t0=T;UI=[];TAPS=[];STICK=null;PS.length=0;EXT.x=null;EXT.jump=false;EXT.act=false;
 if(!SC[name].world)LV=null;try{SC[name].enter&&SC[name].enter(arg)}catch(e){console.error(e)}}
G.go=go;
// координаты нарисованного фона (1280×720) → дизайн
function bgXY(px,py){const v=vis();const s=Math.max(v.w/1280,v.h/720);const w=1280*s,h=720*s;return[v.x0+(v.w-w)/2+px*s,v.y0+(v.h-h)/2+py*s,s]}
// герой на сцене: ноги на линии земли, без растяжения (дыхание — равномерный масштаб от ног)
function hero(n,x,gy,h,o){o=o||{};const br=o.still?1:1+.012*Math.sin(T*2.4+(o.ph||0));const ar=aspect(n);const hh=h*br;
 spr(n,x,gy,hh,{ax:.5,ay:1,flip:o.flip,blink:BLINKS.includes(n)?(o.seed||5):0,a:o.a});
 if(AUD){const m=X.getTransform(),k=m.a/DPR;G.heroes.push({n,x:(m.e/DPR)+x*k,w:hh*ar*k,h:hh*k,ar,feet:(m.f/DPR)+gy*k})}}
// табличка с текстом
function plate(t,x,y,w,h,size,o){o=o||{};X.save();X.fillStyle=o.bg||'rgba(43,25,58,.88)';rr(x-w/2,y-h/2,w,h,Math.min(22,h/2));X.fill();X.lineWidth=4;X.strokeStyle=o.bd||'#e0b25a';X.stroke();X.restore();
 textIn(t,x,y+1,w-h*.5,h*.72,size,o.col||'#fff6dc',{f:o.f||FONT,st:'#2a1206',lw:5,id:o.id||'plate',min:14})}
function drawParticlesIf(){stepParticles();drawParticles()}
// ---- загрузка ----
SC.load={draw(){const v=vis();X.fillStyle='#2b1d3a';X.fillRect(v.x0,v.y0,v.w,v.h);const k=NIMG?NLOAD/NIMG:0;
  rr(640-260,420,520,34,17);X.fillStyle='#1a1026';X.fill();X.strokeStyle='#e0b25a';X.lineWidth=4;X.stroke();rr(640-254,426,Math.max(22,508*k),22,11);X.fillStyle='#ffd27a';X.fill();
  X.save();X.translate(640,300);X.rotate(T*2);if(okI(IM.gear))X.drawImage(IM.gear,-70,-70,140,140);X.restore();
  if(NLOAD>=NIMG&&T>.4&&document.fonts.status!=='loading')go('title')}};
// ---- титул ----
SC.title={enter(){music('title')},
 draw(){bgCover('title');const v=vis();const [,gy]=bgXY(0,646);const hh=Math.min(v.h*.52,gy-safeT()-40);
  const [rx]=bgXY(1080,0);const yx=Math.min(rx,safeR()-hh*.3);hero('y_idle',yx,gy,hh,{seed:3});
  const ph=hh*.5;const hop=Math.max(0,Math.sin(T*3.2))*ph*.35;spr(hop>2?'p_jump':'p_sit',yx-hh*.62,gy-hop,ph*(hop>2?1.15:1),{ax:.5,ay:1,blink:hop>2?0:7});
  textIn('Ярик и Заводной город',640,safeT()+86,Math.min(940,v.w*.68),140,112,'#fff3d6',{f:FONT,st:'#3a1606',lw:13,id:'logo'});
  textIn('игра про закономерности и таблицы',640,safeT()+186,Math.min(700,v.w*.5),56,42,'#ffe28a',{f:FONT,st:'#3a1606',lw:7,id:'logo2'})},
 ui(){boardBtn('play',640,safeB()-96,360,'Играть',()=>{ac();SFX.click();if(!SV.intro)go('intro');else go('map')},{pulse:1})}};
// ---- вступление ----
SC.intro={enter(){music('title');const S2=this.st={kv:-1,ul:-1,ya:-1,po:-1,shake:0};
  run(async()=>{await wait(400);await say('i1');S2.kv=T;SFX.boing();SFX.laugh();S2.shake=1;await say('i2');S2.ul=T;await say('i3');S2.ya=T;await say('i4');S2.po=T;SFX.boing();await say('i5');await wait(300);SV.intro=1;save();go('map')})},
 draw(){const st=this.st;const sh=st.shake>0?(st.shake-=DT*1.5,st.shake*10):0;X.save();X.translate((Math.random()-.5)*sh,(Math.random()-.5)*sh);bgCover('title',0,0,1.04);X.restore();
  const v=vis();const [,gy]=bgXY(0,646);const hh=Math.min(v.h*.5,gy-safeT()-130);
  if(st.kv>0){const k=clamp((T-st.kv)/.7,0,1);const [lx,lgy]=bgXY(150,560);const x=Math.max(lx,safeL()+hh*.4);const y=lerp(v.y0-30,lgy,ease(k));if(k<1)spr('k_fly',x,y,hh*1.05,{ax:.5,ay:1});else hero('k_laugh',x,y,hh*1.05,{})}
  const [rx]=bgXY(1060,0);const right=Math.min(rx,safeR()-hh*.3);
  if(st.ul>0){const k=ease(clamp((T-st.ul)/.5,0,1));hero(talk&&talk.who==='ulya'?'u_talk':'u_idle',right-hh*1.3+(1-k)*300,gy,hh*.95,{seed:2,a:k})}
  if(st.ya>0){const k=ease(clamp((T-st.ya)/.5,0,1));hero(talk&&talk.who==='yarik'?'y_point':'y_idle',right-hh*.15+(1-k)*300,gy,hh,{seed:4,a:k})}
  if(st.po>0){const k=clamp((T-st.po)/.6,0,1);const hop=Math.sin(k*Math.PI)*hh*.4;spr(k<1?'p_jump':(talk&&talk.who==='popr'?'p_talk':'p_sit'),right-hh*.72,gy-hop,hh*.45,{ax:.5,ay:1,blink:7})}
  drawTalk()},
 ui(){roundBtn('skip',safeR()-46,safeB()-46,84,r=>{X.fillStyle='#fff6dc';for(const d of [-.35,.05]){X.beginPath();X.moveTo(r*d,-r*.38);X.lineTo(r*(d+.4),0);X.lineTo(r*d,r*.38);X.fill()}},()=>{SV.intro=1;save();go('map')},{c1:'#e8873a',c2:'#9a4a14'})}};
// ---- карта ----
const MAPN=[[95,440,'Крыши-качели'],[270,370,'Лестница-пружина'],[400,300,'Башня самозванца'],[550,250,'Обратный отсчёт'],[690,230,'Таблица-кран'],[880,170,'Башня Кавардака']].map(n=>[n[0]*1.25,n[1]*1.25,n[2]]);
const isOpen=i=>i===0||!!SV.done[i-1];
SC.map={enter(){music('title');run(async()=>{await wait(350);if(NGEARS()>=5&&!SV.pinSaid){SV.pinSaid=1;save();await say('m_bonus')}else if(SV.done[4]&&!SV.done[5])await say('m_boss');else await say('m1')})},
 draw(){bgCover('map');let cur=SV.done.findIndex(d=>!d);if(cur<0)cur=5;
  MAPN.forEach((n,i)=>{const [x,y,s]=bgXY(n[0],n[1]);const open=isOpen(i),done=SV.done[i];const d=i===5?112:96,bob=Math.sin(T*2+i)*4,ny=y+bob-62;
   mapNode('n'+i,x,ny,d,i===5?'★':String(i+1),open,()=>{if(!open){sayNow('m_lock');SFX.bad();return}SFX.click();go('play',i)},open&&!done);
   if(done)spr('medal',x+d*.45,ny-d*.38,d*.55,{rot:Math.sin(T*2+i)*.1});
   if(i<5&&SV.gears[i])spr('gear',x-d*.48,ny-d*.36,d*.38,{rot:T});
   {const pw=i===5?236:212;plate(n[2],clamp(x,safeL()+pw/2+6,safeR()-pw/2-6),ny+d/2+28,pw,46,30,{id:'mapname'})}});
  {const [x,y]=bgXY(MAPN[cur][0],MAPN[cur][1]);const hh=150;const side=cur===5?-1:1;hero('y_idle',x+side*92,y+30,hh,{seed:2});spr('p_sit',x+side*150,y+30,hh*.42,{ax:.5,ay:1,blink:7})}
  const x0=safeR()-222,y0=safeT()+40;X.fillStyle='rgba(43,25,58,.85)';rr(x0-32,y0-32,252,64,32);X.fill();X.strokeStyle='#e0b25a';X.lineWidth=3;X.stroke();
  for(let i=0;i<5;i++)spr('gear',x0+i*47,y0,SV.gears[i]?46:34,{a:SV.gears[i]?1:.35,rot:SV.gears[i]?T*.8:0});
  if(SV.hat)spr('hat',safeR()-40,y0+68,50,{});
  if(SV.fin)spr('medal',safeR()-110,y0+80,80,{rot:Math.sin(T*1.5)*.08});
  drawTalk()},
 ui(){roundBtn('home',safeL()+44,safeT()+44,80,r=>houseIcon(r),()=>{SFX.click();go('title')});
  if(NGEARS()>=5){const x=safeR()-100,y=safeB()-84;UI.push({id:'pin',x,y,w:170,h:160,fn:()=>{SFX.click();go('pin')}});const k=1+Math.sin(T*4)*.05;spr('p_ball',x,y-16,104*k,{rot:Math.sin(T*3)*.2});plate('Пинбол',x,y+50,170,44,30,{id:'pinbtn'})}}};
function mapNode(id,x,y,d,t,open,fn,pulse){UI.push({id,x,y,w:d,h:d,fn});const k=1+(pulse?Math.sin(T*5)*.06:0);X.save();X.translate(x,y);X.scale(k,k);
 const g=X.createRadialGradient(0,-d*.15,d*.1,0,0,d*.5);g.addColorStop(0,open?'#f2b649':'#8a7a6a');g.addColorStop(1,open?'#a0581a':'#4a4038');X.fillStyle=g;X.strokeStyle=open?'#fff0b8':'#b0a090';X.lineWidth=6;X.beginPath();X.arc(0,0,d/2,0,7);X.fill();X.stroke();
 if(pulse){X.strokeStyle='rgba(255,240,170,'+(.45+.3*Math.sin(T*5))+')';X.lineWidth=5;X.beginPath();X.arc(0,0,d/2+10,0,7);X.stroke()}X.restore();
 if(open)txt(t,x,y+3,d*.6,'#fff6dc',{f:NUM,st:'#4a1e04',lw:8,box:[x-d*.45,y-d*.45,x+d*.45,y+d*.45],id:'node',kind:'num'});else lockIcon(x,y,d*.36)}
function lockIcon(x,y,r){X.save();X.translate(x,y);X.fillStyle='#d8cfc0';X.strokeStyle='#3a2a20';X.lineWidth=3;rr(-r*.7,-r*.15,r*1.4,r*1.05,r*.2);X.fill();X.stroke();X.beginPath();X.arc(0,-r*.15,r*.45,Math.PI,0);X.lineWidth=r*.22;X.strokeStyle='#d8cfc0';X.stroke();X.restore()}
function houseIcon(r){X.fillStyle='#fff6dc';X.beginPath();X.moveTo(0,-r*.5);X.lineTo(r*.5,-r*.02);X.lineTo(r*.34,-r*.02);X.lineTo(r*.34,r*.42);X.lineTo(-r*.34,r*.42);X.lineTo(-r*.34,-r*.02);X.lineTo(-r*.5,-r*.02);X.closePath();X.fill();X.fillStyle='#1d5a57';X.fillRect(-r*.1,r*.12,r*.2,r*.3)}
// ---- игра ----
const LVNAME=['Крыши-качели','Лестница-пружина','Башня самозванца','Обратный отсчёт','Таблица-кран','Башня Кавардака'];
SC.play={world:1,enter(i){FX.shake=0;FX.hit=0;FX.slow=1;FX.flash=0;if(i===5)BOSS();else LEVELS[i]();ST.ctrl=true;music(LV.music||'level');G.acc=0;LV.titleT=T;camSnapNow()},
 update(dt){if(!LV)return;handleTaps();
  if(FX.hit>0){FX.hit-=dt}else{G.acc+=dt*FX.slow;let n=0;while(G.acc>=1/60&&n<4){stepWorld(1/60);G.acc-=1/60;n++;if(!LV)return}if(n>=4)G.acc=0}
  FX.slow=Math.min(1,FX.slow+dt*1.6);FX.shake=Math.max(0,FX.shake-dt*2.2);camStep(dt)},
 draw(){drawWorld()},hud(){drawHUD()}};
function camSnapNow(){const p=ST.P.getPosition();LV.cam.x=p.x+1.6;LV.cam.y=p.y+.6;for(let i=0;i<90;i++)camStep(1/30)}
function winLevel(){const L=LV;if(!L||L.won)return;L.won=true;SV.done[L.idx]=1;save();ST.ctrl=false;ST.cheer=9;music('win');SFX.fanfare();vib([30,50,30,50,60]);
 const v=vis();for(let i=0;i<5;i++)setTimeout(()=>{if(LV===L)burst(v.x0+v.w*(.15+i*.17),v.y0+60,40,'conf')},i*180);
 run(async()=>{await wait(300);await say('g_win');await wait(900);go('map')})}
// ---- HUD ----
const PORT={yarik:['y_point',45,25,210],ulya:['u_talk',90,0,210],popr:['p_talk',120,30,400],kav:['k_laugh',10,50,240],kavk:['k_kind',105,0,250]};
function drawHUD(){const L=LV;
 if(ST.ctrl&&!L.won)drawControls();
 const busy=!!talk;
 G.boardOn=!!(L.task&&L.task.vals&&!busy&&(!L.task.solved||(L.hudFlash!=null&&L.t-L.hudFlash<1.6)));
 if(G.boardOn)drawTaskBoard(L.task.vals,640,safeT()+44,!!L.task.solved);
 const x0=safeR()-58,y0=safeT()+40;X.fillStyle='rgba(43,25,58,.82)';rr(x0-62,y0-30,120,60,30);X.fill();X.strokeStyle='#e0b25a';X.lineWidth=3;X.stroke();spr('gear',x0-30,y0,44,{rot:T*.6});
 txt(NGEARS()+'/5',x0+16,y0+2,32,'#ffe28a',{f:NUM,st:'#2a1206',lw:6,box:[x0-10,y0-30,x0+58,y0+30],id:'gears',kind:'num'});
 const tk=T-L.titleT;if(tk<3&&!busy){X.globalAlpha=clamp(Math.min(tk*3,(3-tk)*2),0,1);plate((L.idx<5?(L.idx+1)+'. ':'')+LVNAME[L.idx],640,safeT()+44,520,70,46,{id:'lvtitle'});X.globalAlpha=1}
 drawTalk();
 roundBtn('home',safeL()+42,safeT()+42,76,r=>houseIcon(r),()=>{SFX.click();go('map')});
 drawParticlesIf()}
function drawTaskBoard(vals,cx,cy,solved){const n=vals.length;const ts=Math.min(66,(Math.min(760,vis().w-420))/n-10);const gap=10;const w=n*ts+(n-1)*gap+30,h=ts+22;X.save();
 X.fillStyle=solved?'rgba(90,60,10,.9)':'rgba(43,25,58,.88)';rr(cx-w/2,cy-h/2,w,h,18);X.fill();X.strokeStyle=solved?'#ffe066':'#e0b25a';X.lineWidth=4;X.stroke();
 for(let i=0;i<n;i++){const v=vals[i],x=cx-w/2+15+ts/2+i*(ts+gap),q=v==='?';X.fillStyle=q?'rgba(255,224,102,.22)':'#fffaf0';rr(x-ts/2,cy-ts/2,ts,ts,ts*.18);X.fill();if(q){X.setLineDash([5,4]);X.strokeStyle='#ffe066';X.lineWidth=3;X.stroke();X.setLineDash([])}
  valDraw(v,x,cy,ts,{col:q?'#ffe066':'#1d1030',st:q?'#2a1206':'#fff',box:[x-ts/2,cy-ts/2,x+ts/2,cy+ts/2],id:'board'})}X.restore()}
function drawTalk(){if(!talk)return;const v=vis();const l=LINES[talk.k];if(!l)return;const who=talk.who==='kav'&&G.kind?'kavk':talk.who;
 const bw=Math.min(900,v.w-2*130-40),bx=640,bh=118,by=safeT()+8+bh/2;const k=ease(clamp((T-talk.t0)/.18,0,1));X.save();X.globalAlpha=k;
 X.fillStyle='rgba(255,250,236,.96)';rr(bx-bw/2,by-bh/2,bw,bh,26);X.fill();X.lineWidth=4;X.strokeStyle=who==='kav'||who==='kavk'?'#7a4ab0':who==='ulya'?'#d0602a':who==='popr'?'#e89a2a':who==='yarik'?'#2a9a94':'#8a6a3a';X.stroke();
 const P=PORT[who];const pr=bh*.42;const px=bx-bw/2+pr+14;
 if(P&&okI(IM[P[0]])){X.save();X.beginPath();X.arc(px,by,pr,0,7);X.fillStyle='#ffe7b8';X.fill();X.clip();X.drawImage((okI(IM[P[0]+'_b'])&&blinkK(13))?IM[P[0]+'_b']:IM[P[0]],P[1],P[2],P[3],P[3],px-pr,by-pr,pr*2,pr*2);X.restore();X.beginPath();X.arc(px,by,pr,0,7);X.lineWidth=3;X.stroke()}
 else{X.save();X.translate(px,by);X.rotate(T);if(okI(IM.gear))X.drawImage(IM.gear,-pr,-pr,pr*2,pr*2);X.restore()}
 const tx0=px+pr+16,tw=bx+bw/2-18-tx0;textIn(l.t,tx0+tw/2,by,tw,bh-20,36,'#2a1606',{f:BODY,st:0,id:'talk',min:18});X.restore()}
function drawControls(){const C2=ctrlLayout();const L=LV;
 const so=STICK?{x:STICK.ox,y:STICK.oy}:C2.stick;const p=STICK&&PTR.get(STICK.id);X.save();X.globalAlpha=STICK?.55:.38;X.fillStyle='#1a1026';X.beginPath();X.arc(so.x,so.y,C2.stick.r,0,7);X.fill();X.lineWidth=4;X.strokeStyle='#ffe7b8';X.stroke();
 const kx=p?so.x+clamp(p.x-so.x,-60,60):so.x+(INP.x||0)*50;X.globalAlpha=STICK?.85:.6;X.fillStyle='#ffe7b8';X.beginPath();X.arc(kx,so.y,C2.stick.r*.42,0,7);X.fill();
 X.fillStyle='#ffe7b8';X.globalAlpha=.8;for(const d of[-1,1]){X.beginPath();X.moveTo(so.x+d*C2.stick.r*.95,so.y);X.lineTo(so.x+d*C2.stick.r*.7,so.y-13);X.lineTo(so.x+d*C2.stick.r*.7,so.y+13);X.fill()}X.restore();
 if(L.hint==='move'){const k=(T*1.2)%1;hand(C2.stick.x-40+k*90,C2.stick.y+26,1);X.save();X.strokeStyle='rgba(255,230,150,'+(1-k)+')';X.lineWidth=5;X.beginPath();X.arc(C2.stick.x,C2.stick.y,C2.stick.r+10+k*20,0,7);X.stroke();X.restore()}
 const jb=C2.jump,ab=C2.act;const ps=[...PTR.values()];const jp=ps.some(q=>q.own==='jump'),ap=ps.some(q=>q.own==='act');
 bigBtn('btn_t',jb,jp,L.hint==='jump');X.save();X.translate(jb.x,jb.y);const r=jb.r;X.fillStyle='#fff';X.strokeStyle='#0c3a38';X.lineWidth=6;X.lineJoin='round';X.beginPath();X.moveTo(0,-r*.46);X.lineTo(r*.4,0);X.lineTo(r*.15,0);X.lineTo(r*.15,r*.4);X.lineTo(-r*.15,r*.4);X.lineTo(-r*.15,0);X.lineTo(-r*.4,0);X.closePath();X.stroke();X.fill();X.restore();
 const k=actionKind();const lab={hook:'Крюк',throw:'Бросок',dash:'Рывок'}[k];const actPulse=L.hint==='dash'||(L.hint==='carry'&&!!ST.carry);bigBtn('btn_o',ab,ap,actPulse);
 X.save();X.translate(ab.x,ab.y-ab.r*.12);actIcon(k,ab.r);X.restore();textIn(lab,ab.x,ab.y+ab.r*.5,ab.r*1.3,ab.r*.42,ab.r*.4,'#fff',{f:FONT,st:'#5a2004',lw:5,id:'actlab',min:12});
 if(L.hint==='jump')hand(jb.x+22,jb.y+42,0);if(actPulse)hand(ab.x+22,ab.y+42,0);
 if(L.hint==='hook'&&!ST.hook){const rs=L.rings.filter(r=>r.task===L.cur&&!r.hidden);if(rs.length){const r=rs[Math.floor(T/1.2)%rs.length];const [cx,cy]=w2s(r.x,r.y);hand((cx-OX)/S+16,(cy-OY)/S+34,0)}}}
function bigBtn(n,b,pressed,pulse){const d=b.r*2*(pressed?.92:1);X.save();if(pulse){const k=(T*1.5)%1;X.strokeStyle='rgba(255,240,160,'+(1-k)+')';X.lineWidth=7;X.beginPath();X.arc(b.x,b.y,b.r*(1.05+k*.45),0,7);X.stroke()}
 X.globalAlpha=pressed?1:.92;if(okI(IM[n]))X.drawImage(IM[n],b.x-d/2,b.y-d/2*1.03,d,d*1.03);X.restore()}
function actIcon(k,r){X.fillStyle='#fff';X.lineJoin='round';X.lineCap='round';
 if(k==='hook'){X.beginPath();X.arc(0,-r*.1,r*.24,Math.PI*.2,Math.PI*1.8,true);X.lineWidth=r*.2;X.strokeStyle='#5a2004';X.stroke();X.lineWidth=r*.1;X.strokeStyle='#fff';X.stroke()}
 else if(k==='throw'){X.beginPath();X.moveTo(-r*.32,r*.08);X.quadraticCurveTo(-r*.05,-r*.5,r*.28,-r*.12);X.lineWidth=r*.17;X.strokeStyle='#5a2004';X.stroke();X.lineWidth=r*.08;X.strokeStyle='#fff';X.stroke();X.beginPath();X.moveTo(r*.4,-r*.02);X.lineTo(r*.14,-r*.04);X.lineTo(r*.32,-r*.28);X.closePath();X.strokeStyle='#5a2004';X.lineWidth=4;X.stroke();X.fill()}
 else{X.beginPath();X.moveTo(-r*.06,-r*.32);X.lineTo(r*.36,-r*.08);X.lineTo(-r*.06,r*.16);X.closePath();X.strokeStyle='#5a2004';X.lineWidth=5;X.stroke();X.fill();X.lineWidth=r*.08;X.strokeStyle='#fff';for(const y of[-.24,-.08,.08]){X.beginPath();X.moveTo(-r*.44,r*y);X.lineTo(-r*.2,r*y);X.stroke()}}}
function hand(x,y,slide){const k=slide?0:Math.abs(Math.sin(T*5))*8;X.save();X.translate(x,y+k);X.rotate(-.35);X.fillStyle='#fff6dc';X.strokeStyle='#3a1a06';X.lineWidth=4;X.lineJoin='round';
 X.beginPath();X.moveTo(-8,-34);X.quadraticCurveTo(0,-44,8,-34);X.lineTo(8,-8);X.lineTo(22,-4);X.quadraticCurveTo(30,4,26,20);X.lineTo(20,34);X.lineTo(-12,34);X.lineTo(-20,10);X.quadraticCurveTo(-24,0,-14,-2);X.lineTo(-8,4);X.closePath();X.fill();X.stroke();X.restore()}
// ---- финал и медаль ----
SC.fin={enter(){music('win');G.kind=true;const st=this.st={med:-1};
  run(async()=>{await wait(500);await say('f1');await say('f2');SFX.wind();await say('f3');await say('f4');if(SV.hat)await say('f_hat');st.med=T;SFX.fanfare();vib([30,60,30]);const v=vis();for(let i=0;i<6;i++)setTimeout(()=>burst(v.x0+v.w*(.1+i*.16),v.y0+50,45,'conf'),i*150);
   SV.done[5]=1;SV.fin=1;save();await say('f5')})},
 draw(){bgCover('fin');const v=vis();const st=this.st;const [,gy]=bgXY(0,650);const hh=Math.min(v.h*.46,gy-safeT()-150);const cx=640;
  hero(st.med>0||(talk&&talk.k!=='f1')?'k_kind':'k_laugh',cx+hh*.95,gy,hh*1.08,{});
  hero(talk&&talk.who==='ulya'?'u_talk':'u_cheer',cx-hh*1.0,gy,hh*.95,{seed:2});hero(talk&&talk.who==='yarik'?'y_point':'y_cheer',cx-hh*.22,gy,hh,{seed:4});
  spr(talk&&talk.who==='popr'?'p_talk':'p_sit',cx+hh*.3,gy,hh*.42,{ax:.5,ay:1,blink:7});
  if(SV.hat&&st.med>0)spr('hat',cx+hh*.95,gy-hh*1.04,hh*.3,{});
  if(st.med>0){const k=ease(clamp((T-st.med)/.8,0,1));const mh=Math.min(260,v.h*.36)*k;spr('medal',cx+(talk?0:0),safeT()+(talk?140:110)+mh/2+Math.sin(T*2)*5,mh,{rot:Math.sin(T*1.5)*.05});
   if(!talk)textIn('Мастер закономерностей',640,safeT()+52,Math.min(820,v.w*.62),84,66,'#ffe9a8',{f:FONT,st:'#3a1d00',lw:10,id:'mtitle'})}
  drawTalk();drawParticlesIf();if(Math.random()<.03&&st.med>0)burst(rnd(v.x0,v.x0+v.w),v.y0+30,20,'conf')},
 ui(){if(this.st.med>0&&!talk)boardBtn('tomap',safeR()-130,safeB()-62,250,'На карту',()=>{G.kind=false;go('map')},{pulse:1})}};
// ---- поворот экрана ----
function drawRotate(){X.setTransform(DPR,0,0,DPR,0,0);const b=IM.bg_rotate;if(okI(b)){const s=Math.max(W/b.naturalWidth,H/b.naturalHeight);X.drawImage(b,(W-b.naturalWidth*s)/2,(H-b.naturalHeight*s)/2,b.naturalWidth*s,b.naturalHeight*s)}else{X.fillStyle='#2b1d3a';X.fillRect(0,0,W,H)}
 const w=Math.min(W*.86,520),h=Math.min(110,H*.13),x=W/2,y=H*.86;X.fillStyle='rgba(43,25,58,.9)';rr(x-w/2,y-h/2,w,h,22);X.fill();X.strokeStyle='#e0b25a';X.lineWidth=4;X.stroke();
 textIn('Поверни телефон боком',x,y,w-40,h*.7,46,'#fff6dc',{f:FONT,st:'#2a1206',lw:5,id:'rot'})}
// ---- главный цикл ----
let _last=performance.now();
function frame(now){requestAnimationFrame(frame);let dt=Math.min(.05,(now-_last)/1000);_last=now;G._fps.push(now);while(G._fps.length&&now-G._fps[0]>2000)G._fps.shift();T+=dt;
 if(G.auditReq){AUD={t:[]};G.heroes=[]}
 try{
  if(PORTRAIT()){TAPS=[];drawRotate()}
  else{const sc=SC[G.scene];
   TAPS=TAPS.filter(t=>{const b=hitUI(t.x,t.y);if(b){const p=PTR.get(t.id);if(p)p.own='ui';b.fn&&b.fn();return false}return true});
   if(SC[G.scene]!==sc){UI=[]}
   else{if(!sc.world)TAPS=[];
    sc.update&&sc.update(dt);musTick();UI=[];
    if(sc.world){if(LV){sc.draw();X.setTransform(S*DPR,0,0,S*DPR,OX*DPR,OY*DPR);sc.hud()}}
    else{X.setTransform(S*DPR,0,0,S*DPR,OX*DPR,OY*DPR);sc.draw&&sc.draw();sc.ui&&sc.ui()}}}
 }catch(e){console.error(e)}
 if(AUD){G._aud=AUD;AUD=null;G.auditReq=0}}
requestAnimationFrame(frame);
// ---- тестовый стенд ----
G.btns=()=>UI.map(b=>({id:b.id,x:b.x,y:b.y,dis:!!b.dis}));
G.pg=(x,y)=>({x:x*S+OX,y:y*S+OY});
G.fps=()=>{const f=G._fps;return f.length>1?Math.round((f.length-1)*1000/(f[f.length-1]-f[0])):0};
window.__T={
 st(){if(!LV)return{scene:G.scene,talk:talk&&talk.k};const p=ST.P.getPosition(),v=ST.P.getLinearVelocity();return{scene:G.scene,idx:LV.idx,x:p.x,y:p.y,vx:v.x,vy:v.y,g:ST.ground,cur:LV.cur,task:LV.task?{vals:LV.task.vals,solved:!!LV.task.solved}:null,tasks:LV.tasks.map(t=>!!t.solved),won:LV.won,carry:ST.carry?ST.carry.v:null,hook:!!ST.hook,ctrl:ST.ctrl,hint:LV.hint,exitX:LV.exitX,talk:talk&&talk.k,b:LV.b?{st:LV.b.st,ph:LV.b.ph,x:LV.b.x}:null}},
 tp(x,y){teleport(x,y)},
 css(x,y){return w2s(x,y)},
 rings(){return LV.rings.map((r,i)=>({i,x:r.x,y:r.y,task:r.task,good:r.good,sym:r.sym,hidden:!!r.hidden,css:w2s(r.x,r.y)}))},
 crates(){return LV.crates.map((c,i)=>{const q=c.b.getPosition();return{i,v:c.v,x:q.x,y:q.y,solved:c.solved,dead:!!c.dead,held:c.held,pinned:!!c.pinned,imp:!!c.imp,tower:c.tower}})},
 grab(i){const c=LV.crates[i];const q=c.b.getPosition();if(ST.carry)dropCarry();teleport(q.x-.9,q.y+.2);ST.face=1;ST.noGrab=0;c.ng=0;c.noPlayer=0;grab(c)},
 face(d){ST.face=d},ext(o){Object.assign(EXT,o)},lv(){return LV}};
go('load');
