'use strict';
// ===== Босс: Кавардак, 3 фазы. Тень — куда прыгнет, волна — перепрыгни, плитку — в его заводной ключ =====
const BPH=[{vals:['c','t','c','t','?'],ans:'c',tiles:['c','t','s'],line:'b_p1'},{vals:[12,14,16,'?'],ans:18,tiles:[17,18,20],line:'b_p2'},{vals:[5,10,15,'?'],ans:20,tiles:[20,25,16],line:'b_p3'}];
function BOSS(){const L=newLevel({idx:5,bg:'boss',music:'boss',spawn:{x:3,y:1.2},check:{x:3,y:1.2},bounds:{x0:0,x1:20,y0:-1},killY:-6,trig:[],won:false,hint:null,tiles:[]});
 POP.x=1.6;POP.y=1;POP.on=true;L.cam.x=10;L.cam.y=2.4;
 mk.ground(-3,-4,23,0);mk.ground(-3,-4,0,14);mk.ground(20,-4,23,14);
 mk.ground(1,2.6,3.6,3,{oneway:true});mk.ground(16.4,2.6,19,3,{oneway:true});
 L.tasks=BPH.map(p=>({vals:p.vals.slice(),hud:null,ans:p.ans,line:p.line}));L.tasks.forEach(t=>t.hud=t.vals);L.cur=0;L.task=L.tasks[0];
 const B=L.b={x:15,y:0,st:'intro',t:0,ph:0,fx:15,tx:15,face:-1,waves:[],slot:null,laughT:0,key:0,keyV:1,waveSaid:0,hits:0};
 function newSlot(){const p=BPH[B.ph];const sl=mk.slot(10,4.3,p.ans,{size:.75});sl.onOk=c=>hit(c);sl.onBad=()=>{sayNow('b_miss');SFX.laugh();B.laughT=1.4};B.slot=sl}
 function spill(){const p=BPH[B.ph];const px=ST.P.getPosition().x;let xs=[4.2,6.8,13.2,15.8].filter(x=>Math.abs(x-B.x)>1.5).sort(()=>Math.random()-.5);
  p.tiles.forEach((v,i)=>{let x=xs[i%xs.length]+(i>=xs.length?.8:0);const c=mk.crate(v,x,3.4+i*.3,{s:.55});c.b.setLinearVelocity(V(rnd(-1,1),2));L.tiles.push(c);wburst(x,3.4,10,'#ffd27a',4,.4)});SFX.pop()}
 function clearTiles(){for(const c of L.tiles){if(c.solved)continue;if(ST.carry===c)dropCarry();c.dead=1;c.hide=1;try{c.b.setActive(false)}catch(_){}const q=c.b.getPosition();wburst(q.x,q.y,10,'#fff',3,.4)}L.tiles=L.tiles.filter(c=>!c.dead)}
 function hit(c){c.hide=1;c.dead=1;try{c.b.setActive(false)}catch(_){}const t=L.tasks[B.ph];const q=t.vals.indexOf('?');if(q>=0)t.vals[q]=t.ans;t.solved=1;L.hudFlash=L.t;
  B.ph++;B.hits++;B.st='hit';B.t=0;B.y=0;B.keyV=14;hitstop(.22);FX.slow=.25;FX.flash=.7;FX.flashC='#fff3c0';addShake(.8);SFX.hit();vib([40,40,60]);wburst(B.x,2,40,'#ffd54a',9,.8);floatT('Бум!','#fff',B.x,3.4);
  L.slots=L.slots.filter(s=>s!==B.slot);try{L.world.destroyBody(B.slot.b)}catch(_){};B.slot=null;
  if(B.ph<3){sayNow(B.ph===1?'b_hit1':'b_hit2');setTimeout(()=>{if(LV!==L)return;clearTiles();L.cur=B.ph;L.task=L.tasks[B.ph];newSlot();spill();sayNow(BPH[B.ph].line);B.st='rest';B.t=0},2200)}
  else{B.st='down';L.won=true;ST.cheer=9;music('win');SFX.fanfare();clearTiles();const v=vis();for(let i=0;i<5;i++)setTimeout(()=>{if(LV===L)burst(v.x0+v.w*(.15+i*.17),v.y0+60,40,'conf')},i*200);
   run(async()=>{await wait(2600);go('fin')})}}
 L.targets=c=>B.slot?[{x:B.slot.x,y:B.slot.y,any:true,pri:1}]:[];
 L.camFn=(tx,ty)=>{const K=H/VH,VW=W/K;const x=VW>=20?10:clamp(tx,VW/2,20-VW/2);return[x,clamp(ty,1.55,2.1)]};
 run(async()=>{await wait(500);await say('b_s');await say('b_tip');newSlot();spill();sayNow('b_p1');B.st='rest';B.t=0});
 L.update=dt=>{const P=ST.P,p=P.getPosition(),v=P.getLinearVelocity();B.t+=dt;B.laughT-=dt;B.key+=dt*B.keyV;B.keyV=Math.max(1+B.ph,B.keyV-dt*6);
  if(ST.carry&&!SV.tut.carry){L.hint='carry'}if(L.hint==='carry'&&ST.throwT>0)hintDone('carry');
  const rest=[1.7,1.35,1.05][Math.min(2,B.ph)];
  if(B.st==='rest'&&B.t>rest&&!L.won){B.st='squat';B.t=0;let tx=clamp(p.x+v.x*.25,3.6,16.4);if(Math.abs(tx-10)<1.5)tx=10+(tx<10?-1.5:1.5);B.fx=B.x;B.tx=tx;B.face=Math.sign(tx-B.x)||B.face;SFX.wind()}
  else if(B.st==='squat'&&B.t>.75){B.st='fly';B.t=0;SFX.whoosh();SFX.laugh()}
  else if(B.st==='fly'){const k=Math.min(1,B.t/1);B.x=lerp(B.fx,B.tx,k);B.y=Math.sin(k*Math.PI)*5.5;if(k>=1){B.y=0;B.st='rest';B.t=0;land()}}
  else if(B.st==='hit'||B.st==='down'){B.y=Math.max(0,B.y-dt*4)}
  // волны
  for(const w of B.waves){w.x+=w.d*7.5*dt;w.t+=dt;if(!w.hitP&&Math.abs(p.x-w.x)<.45&&p.y<1.25&&!ST.hook){w.hitP=1;knock(w.d,'wave')}
   for(const c of L.tiles){if(c.held||c.dead)continue;const q=c.b.getPosition();if(!c['w'+w.id]&&Math.abs(q.x-w.x)<.5&&q.y<1.2){c['w'+w.id]=1;c.b.setLinearVelocity(V(w.d*1.5,5))}}}
  B.waves=B.waves.filter(w=>w.x>-.5&&w.x<20.5);
  // касание Кавардака
  if(B.st!=='down'&&B.st!=='intro'){const top=B.y+2.45;const bx=Math.abs(p.x-B.x);
   if(bx<.95&&p.y-.8>top-.5&&p.y-.8<top+.4&&v.y<=0){P.setLinearVelocity(V(v.x,14));ST.launch=0;addShake(.2);hitstop(.05);SFX.boing();vib(15);floatT('Ой!','#fff',B.x,top+.6);wburst(B.x,top,14,'#fff',4,.4);B.laughT=.8}
   else if(bx<.9&&p.y-.8<top-.5&&p.y+.8>B.y&&ST.stun<=0)knock(Math.sign(p.x-B.x)||1,'body')}
  // нет плиток — посыпались
  if(B.slot&&!L.tiles.some(c=>!c.dead&&!c.solved)&&B.st==='rest'&&B.t>.2)spill()};
 function land(){addShake(.6);SFX.quake();SFX.stomp();vib(30);hitstop(.06);wburst(B.x,.2,26,'#e8d6b0',6,.6);ringFX(B.x,.3,'#ffd27a',2.4);
  for(const d of[-1,1])B.waves.push({x:B.x+d*.9,d,t:0,id:Math.random()});
  if(!B.waveSaid){B.waveSaid=1;sayNow('b_wave')}
  const p=ST.P.getPosition();if(Math.abs(p.x-B.x)<1.3&&p.y<2.2)knock(Math.sign(p.x-B.x)||1,'land')}
 function knock(d,why){const P=ST.P;if(ST.hook)unhook(false);dropCarry();P.setLinearVelocity(V(d*7,8));ST.stun=.3;ST.launch=0;ST.react=.9;hitstop(.06);addShake(.3);const p=P.getPosition();wburst(p.x,p.y,12,'#fa5',5,.4);SFX.bad();vib(25);floatT('Ух!','#ffb070',p.x,p.y+1.2)}
 L.drawBack=K=>{// заводной ключ над ареной
  const [kx,ky]=w2s(10,4.3);X.save();X.translate(kx,ky);X.rotate(B.key);X.fillStyle='#e8b23a';X.strokeStyle='#6a3a08';X.lineWidth=K*.08;
  for(const a of[0,Math.PI]){X.save();X.rotate(a);X.beginPath();X.ellipse(K*.85,0,K*.55,K*.38,0,0,7);X.fill();X.stroke();X.fillStyle='#fff3c0';X.beginPath();X.ellipse(K*.85,0,K*.22,K*.14,0,0,7);X.fill();X.fillStyle='#e8b23a';X.restore()}
  X.beginPath();X.arc(0,0,K*.32,0,7);X.fill();X.stroke();X.restore()};
 L.drawFront=K=>{// тень, волны, Кавардак
  if(B.st==='squat'||B.st==='fly'){const [sx,sy]=w2s(B.tx,0);const k=B.st==='squat'?B.t/.75:1-.4*Math.sin(Math.min(1,B.t)*Math.PI);const pul=.5+.5*Math.sin(L.t*14);
   X.save();X.fillStyle='rgba(30,0,40,'+(.25+.25*pul)+')';X.strokeStyle='rgba(255,80,80,'+(.5+.4*pul)+')';X.lineWidth=4;X.beginPath();X.ellipse(sx,sy-2,K*(.8+.6*k),K*.25,0,0,7);X.fill();X.stroke();X.restore()}
  for(const w of B.waves){const [x,y]=w2s(w.x,0);X.save();X.globalAlpha=Math.max(.3,1-w.t*.35);X.fillStyle='#e8d6b0';X.strokeStyle='#8a5a2a';X.lineWidth=3;X.beginPath();X.moveTo(x-K*.6,y);X.quadraticCurveTo(x+w.d*K*.15,y-K*1.1,x+w.d*K*.6,y);X.closePath();X.fill();X.stroke();X.restore()}
  const [bx,by]=w2s(B.x,B.y);const n=B.st==='down'?(B.t<1.2?'k_hit':'k_kind'):B.st==='hit'?(B.t<1?'k_hit':'k_laugh'):B.st==='squat'?'k_squat':B.st==='fly'?'k_fly':B.laughT>0?'k_laugh':'k_laugh';
  const h=2.7*K*(B.st==='squat'?.92:1)*(B.st==='rest'?1+.015*Math.sin(L.t*3):1);if(B.st!=='fly'){X.save();X.fillStyle='rgba(0,0,0,.25)';X.beginPath();X.ellipse(bx,w2s(0,0)[1],K*.8,K*.18,0,0,7);X.fill();X.restore()}
  spr(n,bx+(B.st==='hit'&&B.t<.4?Math.sin(T*70)*6:0),by,h,{ax:.5,ay:1,blink:BLINKS.includes(n)?9:0});
  if(B.st==='down'&&B.t>1.2)for(let i=0;i<3;i++){const a=L.t*3+i*2.1;symDraw('st',bx+Math.cos(a)*K*.9,by-h*1.05+Math.sin(a)*K*.25,K*.14)}};
 return L}
