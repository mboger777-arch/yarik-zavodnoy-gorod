'use strict';
// ===== Ярик и Заводной город — ядро: экран, картинки, звук, голос, текст, частицы, ввод =====
const C=document.getElementById('c'),X=C.getContext('2d');
let W=0,H=0,S=1,OX=0,OY=0,DPR=1,T=0,DT=1/60,PX=-99,PY=-99;
const SAFE={l:0,t:0,r:0,b:0};let VVX=0,VVY=0;const _sp=document.createElement('div');_sp.style.cssText='position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';document.documentElement.appendChild(_sp);
function vpWH(){const v=window.visualViewport;let w=innerWidth,h=innerHeight;VVX=0;VVY=0;if(v&&v.width>0){w=Math.round(v.width);h=Math.round(v.height);VVX=v.offsetLeft||0;VVY=v.offsetTop||0}const e=document.documentElement;return[w||e.clientWidth,h||e.clientHeight]}
function rs(){DPR=Math.min(2,window.devicePixelRatio||1);if(window.scrollX||window.scrollY)window.scrollTo(0,0);[W,H]=vpWH();C.style.left=VVX+'px';C.style.top=VVY+'px';C.style.width=W+'px';C.style.height=H+'px';C.width=Math.round(W*DPR);C.height=Math.round(H*DPR);
 const cs=getComputedStyle(_sp);SAFE.t=parseFloat(cs.paddingTop)||0;SAFE.r=parseFloat(cs.paddingRight)||0;SAFE.b=parseFloat(cs.paddingBottom)||0;SAFE.l=parseFloat(cs.paddingLeft)||0;
 S=Math.min(W/1280,H/720);if(W/H>1280/720)S=H/720;OX=(W-1280*S)/2;OY=(H-720*S)/2}
const PORTRAIT=()=>H>W*1.05;
const FS_OK=!!(document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen);const isFS=()=>!!(document.fullscreenElement||document.webkitFullscreenElement);
function goFS(){if(!FS_OK||isFS())return;const e=document.documentElement;try{const p=(e.requestFullscreen||e.webkitRequestFullscreen).call(e,{navigationUI:'hide'});const lk=()=>{try{screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{})}catch(_){}};if(p&&p.then)p.then(lk).catch(()=>{});else lk()}catch(_){}}
const TOUCHDEV=('ontouchstart' in window)||navigator.maxTouchPoints>0;
addEventListener('pointerdown',()=>{if(TOUCHDEV&&!PORTRAIT())goFS()},true);
let _lastW=-1,_lastH=-1;function relayout(){rs();_lastW=W;_lastH=H}
function onOrient(){relayout();[100,300,600].forEach(t=>setTimeout(relayout,t))}
addEventListener('resize',onOrient);addEventListener('orientationchange',onOrient);addEventListener('pageshow',onOrient);addEventListener('scroll',()=>{if(scrollX||scrollY)scrollTo(0,0)});
document.addEventListener('fullscreenchange',onOrient);document.addEventListener('webkitfullscreenchange',onOrient);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){onOrient();if(AC&&AC.state==='suspended')AC.resume().catch(()=>{})}});
if(window.visualViewport){visualViewport.addEventListener('resize',onOrient);visualViewport.addEventListener('scroll',onOrient)}
setInterval(()=>{const[w,h]=vpWH();if(w!==_lastW||h!==_lastH)relayout()},500);rs();
// ---- картинки ----
const IM={};let NIMG=0,NLOAD=0;function img(n,src){const i=new Image();NIMG++;i.onload=i.onerror=()=>NLOAD++;i.src=src+'?v=20261024a1';IM[n]=i;return i}
const okI=i=>!!i&&(i.tagName==='CANVAS'||(i.complete&&i.naturalWidth>0));
['title','map','l1','l2','l3','l4','l5','boss','fin','rotate','tile'].forEach(n=>img('bg_'+n,'assets/bg/'+n+'.jpg'));
const SPRITES=['y_idle','y_cheer','y_point','y_run1','y_run2','y_jump','y_dash','y_swing','y_carry','y_throw','y_react','p_sit','p_jump','p_ball','p_talk','u_idle','u_talk','u_cheer','k_laugh','k_kind','k_squat','k_fly','k_hit'];
const BLINKS=['y_idle','y_point','y_cheer','u_idle','u_talk','u_cheer','p_sit','p_talk','k_laugh','k_kind'];
SPRITES.forEach(n=>{img(n,'assets/sprites/'+n+'.webp');if(BLINKS.includes(n))img(n+'_b','assets/sprites/'+n+'_b.webp')});
['crate','ring','tramp','gear','mouse','mouse_dz','ball','medal','board','btn_t','btn_o','hook','slot','gate','hat','flipper'].forEach(n=>img(n,'assets/ui/'+n+'.webp'));
const FONT='FairyLogo, Georgia, serif',BODY='Pangolin, "Comic Sans MS", sans-serif',NUM='NunitoLogo, "Arial Black", sans-serif';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rnd=(a,b)=>a+Math.random()*(b-a),ease=t=>t<0?0:t>1?1:1-Math.pow(1-t,3),lerp=(a,b,t)=>a+(b-a)*t;
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
// ---- сохранение ----
let SV;try{SV=JSON.parse(localStorage.getItem('zavod306'))}catch(e){}
if(!SV||!SV.done)SV={done:[0,0,0,0,0,0],gears:[0,0,0,0,0],hat:0,ring:0,intro:0,fin:0,pin:0,tut:{}};
function save(){try{localStorage.setItem('zavod306',JSON.stringify(SV))}catch(e){}}
const NGEARS=()=>SV.gears.reduce((a,b)=>a+b,0);
// ---- звук ----
var AC=null,MASTER=null;function ac(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)();MASTER=AC.createDynamicsCompressor();MASTER.connect(AC.destination)}catch(e){}}if(AC&&AC.state==='suspended')AC.resume().catch(()=>{});return AC}
function tone(f,d,type,v,when,slide){const a=ac();if(!a||G.mute)return;const t=a.currentTime+(when||0),o=a.createOscillator(),g=a.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+d);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v||.1,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(MASTER);o.start(t);o.stop(t+d+.05)}
const _NB={};function noise(d,v,fq,when,q){const a=ac();if(!a||G.mute)return;const key=Math.round(d*20);let b=_NB[key];if(!b){b=a.createBuffer(1,Math.floor(a.sampleRate*d),a.sampleRate);const ch=b.getChannelData(0);for(let i=0;i<ch.length;i++)ch[i]=(Math.random()*2-1)*(1-i/ch.length);_NB[key]=b}const s=a.createBufferSource();s.buffer=b;const f=a.createBiquadFilter();f.type='bandpass';f.frequency.value=fq;f.Q.value=q||1;const g=a.createGain();g.gain.value=v;s.connect(f).connect(g).connect(MASTER);s.start(a.currentTime+(when||0))}
let _sfxT={};function lim(k,ms){const n=performance.now();if(_sfxT[k]&&n-_sfxT[k]<ms)return false;_sfxT[k]=n;return true}
const SFX={
 ok(){[1046,1318,1568,2093].forEach((f,i)=>tone(f,.5,'sine',.08,i*.07));tone(523,.6,'triangle',.05)},
 bad(){tone(330,.18,'square',.05,0,250);tone(250,.3,'square',.05,.12,170)},
 boing(){tone(180,.35,'sine',.16,0,520);tone(360,.25,'triangle',.05,0,900)},
 jump(){if(lim('j',60))tone(420,.14,'square',.035,0,820)},
 land(v){if(lim('l',90)){noise(.08,.18*Math.min(1,v),220);tone(140,.08,'sine',.08*Math.min(1,v),0,80)}},
 step(){if(lim('s',120))noise(.04,.05,900+Math.random()*400,0,3)},
 dash(){noise(.25,.25,1500,0,.7);tone(500,.18,'sawtooth',.03,0,200)},
 hook(){tone(1600,.06,'square',.04);tone(900,.2,'triangle',.06,.03,1400);noise(.06,.2,3000)},
 release(){tone(500,.2,'sine',.08,0,1100)},
 slip(){tone(900,.4,'triangle',.06,0,200);noise(.3,.08,2000)},
 grab(){tone(260,.08,'square',.04,0,420);tone(700,.1,'sine',.05,.05)},
 throw(){noise(.2,.2,1100,0,.8);tone(300,.18,'triangle',.05,0,700)},
 thud(v){if(lim('t',60)){noise(.12,.3*Math.min(1,v),160);tone(90,.15,'sine',.12*Math.min(1,v),0,50)}},
 clank(v){if(lim('c',70)){tone(1200+Math.random()*300,.12,'square',.03*Math.min(1,v));noise(.08,.15*Math.min(1,v),2500,0,4)}},
 smash(){noise(.35,.45,500,0,.6);noise(.25,.3,1800,.03);tone(120,.3,'sine',.15,0,40)},
 spit(){tone(200,.12,'square',.06,0,120);tone(700,.25,'sine',.06,.08,300);noise(.15,.15,600)},
 snap(){tone(1400,.08,'square',.05);tone(1900,.12,'sine',.06,.06);noise(.06,.2,4000,0,2)},
 rise(){tone(200,.6,'triangle',.06,0,800);[0,.1,.2,.3].forEach(w=>tone(300+w*900,.05,'square',.03,w))},
 gate(){[0,.08,.16,.24,.32].forEach(w=>tone(220,.06,'square',.04,w));noise(.5,.15,400)},
 gear(){[1568,2093,2637,3136,4186].forEach((f,i)=>tone(f,.5,'sine',.07,i*.07))},
 star(){[1568,2093,2637,3136].forEach((f,i)=>tone(f,.6,'sine',.07,i*.12))},
 squeak(){if(lim('q',150))tone(1800,.12,'sine',.08,0,2600)},
 stomp(){tone(200,.15,'square',.06,0,90);tone(1600,.2,'sine',.06,.05,800);noise(.15,.2,700)},
 wind(){[0,.07,.14,.21,.28,.35].forEach(w=>{tone(1100,.04,'square',.03,w);noise(.03,.1,3000,w,4)})},
 whoosh(){noise(.45,.2,700)},
 roar(){tone(110,.6,'sawtooth',.06,0,70);tone(140,.5,'sawtooth',.05,.1,90);noise(.5,.2,300)},
 quake(){noise(.6,.5,120,0,.5);tone(60,.6,'sine',.25,0,35)},
 hit(){tone(900,.1,'square',.06,0,300);noise(.3,.4,900);tone(150,.4,'sine',.18,0,50)},
 laugh(){[0,.12,.24,.36].forEach((w,i)=>tone(500-i*40,.09,'square',.035,w,420-i*40))},
 yay(){[784,988,1175,1568].forEach((f,i)=>tone(f,.25,'triangle',.06,i*.06));noise(.3,.05,3000,.1)},
 click(){tone(1300,.05,'square',.03)},
 pop(){tone(600,.12,'sine',.1,0,1200)},
 meow(){tone(700,.3,'sine',.06,0,1000);tone(1000,.25,'sine',.04,.12,600)},
 bumper(){tone(1200,.08,'square',.05);tone(600,.2,'sine',.08,0,900)},
 fanfare(){[523,659,784,1046,784,1046,1318].forEach((f,i)=>tone(f,.35,'triangle',.07,i*.13));[0,.4,.8].forEach(w=>noise(.2,.15,200,w))}};
function vib(p){try{if(navigator.vibrate&&!G.mute)navigator.vibrate(p)}catch(e){}}
// ---- голос и реплики ----
const G={_busy:0,fast:false,mute:false};let talk=null,skipTalk=null,GEN=0;
const STALE={stale:1};
function ctxNow(){return{gen:GEN}}
function alive(c){return c.gen===GEN}
function wait(ms){const c=ctxNow();return new Promise((r,j)=>setTimeout(()=>alive(c)?r():j(STALE),G.fast?Math.min(ms,30):ms))}
let SAYID=0,SAYQ=Promise.resolve(),SAYEP=0,VOL_DUCK=0;
// реплики никогда не обрываются: stopTalk лишь отменяет очередь, текущая фраза договаривается
function stopTalk(){SAYEP++}
function say(k){const ep=SAYEP,c=ctxNow();const p=SAYQ.then(()=>ep===SAYEP&&alive(c)?say1(k):null);SAYQ=p.catch(()=>{});return p.then(v=>{if(!alive(c))throw STALE;return v})}
function sayNow(k){stopTalk();return say(k).catch(()=>{})}
function sayQ(k){say(k).catch(()=>{})}
async function say1(k){const l=LINES[k];if(!l)return;const id=++SAYID;talk={who:l.who,text:l.t,k,t0:T,id};
 if(G.fast){await new Promise(r=>setTimeout(r,40));if(talk&&talk.id===id)talk=null;return}
 const v=typeof VOICE!=='undefined'&&VOICE[k];const dur=Math.max(1800,l.t.length*65);
 await new Promise(async res=>{let done=false,a=null;const fin=()=>{if(!done){done=true;if(a){try{a.pause()}catch(e){}}if(skipTalk===sk)skipTalk=null;res()}};const sk=()=>fin();skipTalk=sk;setTimeout(fin,((v&&v[1])||0)*1000+dur+9000);
  if(v&&!G.mute){a=new Audio('assets/voice/'+v[0]);a.onended=()=>setTimeout(fin,250);a.onerror=()=>setTimeout(fin,dur);let ok=true;try{await a.play()}catch(e){ok=false}
   if(done)return;if(ok)setTimeout(fin,(v[1]+2.5)*1000);else setTimeout(fin,dur)}else setTimeout(fin,dur)});
 if(talk&&talk.id===id)talk=null}
async function run(fn){G._busy++;try{await fn()}catch(e){if(e!==STALE)console.error(e)}finally{G._busy--}}
// ---- экранные частицы (в координатах дизайна) ----
const PS=[];
function burst(x,y,n,kind,hue,sp){sp=sp||1;for(let i=0;i<n;i++){const a=Math.random()*6.283,v=rnd(80,420)*sp;PS.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-(kind==='conf'?220:0),life:1,dec:rnd(.5,1.1),kind,hue:hue==null?rnd(0,360):hue+rnd(-15,15),s:kind==='conf'?rnd(7,13):rnd(3,7),rot:rnd(0,6),vr:rnd(-10,10)})}}
function stepParticles(){for(let i=PS.length-1;i>=0;i--){const p=PS[i];p.life-=p.dec*DT;if(p.life<=0){PS.splice(i,1);continue}
 if(p.kind==='conf'){p.vy+=700*DT;p.vx*=.99}else{p.vx*=.95;p.vy*=.95}p.x+=p.vx*DT;p.y+=p.vy*DT;p.rot+=p.vr*DT}}
function drawParticles(){for(const p of PS){X.globalAlpha=clamp(p.life*1.4,0,1);
 if(p.kind==='conf'){X.save();X.translate(p.x,p.y);X.rotate(p.rot);X.fillStyle=`hsl(${p.hue},90%,60%)`;X.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);X.restore()}
 else{X.fillStyle=`hsl(${p.hue},100%,68%)`;X.beginPath();X.arc(p.x,p.y,p.s,0,7);X.fill()}}X.globalAlpha=1}
// ---- видимая область (координаты дизайна 1280x720, ширина тянется) ----
function vis(){return{x0:-OX/S,y0:-OY/S,w:W/S,h:H/S}}
function safeL(){return vis().x0+SAFE.l/S+14}function safeR(){return vis().x0+vis().w-SAFE.r/S-14}
function safeT(){return vis().y0+SAFE.t/S+8}function safeB(){return vis().y0+vis().h-SAFE.b/S-6}
// фон «cover» на весь экран, без полос
function bgCover(n,ox,oy,zoom){const v=vis(),b=IM['bg_'+n];if(!okI(b)){X.fillStyle='#2b1d3a';X.fillRect(v.x0,v.y0,v.w,v.h);return}
 const s=Math.max(v.w/b.naturalWidth,v.h/b.naturalHeight)*(zoom||1);const w=b.naturalWidth*s,h=b.naturalHeight*s;X.drawImage(b,v.x0+(v.w-w)/2+(ox||0),v.y0+(v.h-h)/2+(oy||0),w,h)}
function dim(a){const v=vis();X.fillStyle=`rgba(10,8,30,${a})`;X.fillRect(v.x0,v.y0,v.w,v.h)}
// ---- текст: всё вписывается в свой предмет ----
function wrap(t,maxW){const ws=String(t).split(' '),out=[];let cur='';for(const w of ws){const s=cur?cur+' '+w:w;if(X.measureText(s).width>maxW&&cur){out.push(cur);cur=w}else cur=s}if(cur)out.push(cur);return out}
function fitText(t,w,h,maxS,font,minS){font=font||BODY;minS=minS||14;for(let s=maxS;s>=minS;s-=2){X.font=s+'px '+font;const L=wrap(t,w);const lh=s*1.16;if(L.length*lh<=h&&L.every(l=>X.measureText(l).width<=w))return{s,L,lh}}X.font=minS+'px '+font;return{s:minS,L:wrap(t,w),lh:minS*1.16}}
let AUD=null;let BASE=null;
function mapBox(b){if(!b||!BASE)return b;const m=BASE.inverse().multiply(X.getTransform());if(m.isIdentity)return b;const P=[[b[0],b[1]],[b[2],b[1]],[b[0],b[3]],[b[2],b[3]]].map(([x,y])=>m.transformPoint(new DOMPoint(x,y)));const xs=P.map(p=>p.x),ys=P.map(p=>p.y);return[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]}
// регистрируем в CSS-пикселях экрана
function regText(b,box,id,t,size,kind){if(!AUD)return;const m=X.getTransform();const toCss=bb=>{if(!bb)return bb;const P=[[bb[0],bb[1]],[bb[2],bb[1]],[bb[0],bb[3]],[bb[2],bb[3]]].map(([x,y])=>m.transformPoint(new DOMPoint(x,y)));const xs=P.map(p=>p.x/DPR),ys=P.map(p=>p.y/DPR);return[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]};
 const k=Math.hypot(m.a,m.b)/DPR;AUD.t.push({id:id||'',b:toCss(b),box:toCss(box),t:String(t||''),css:(size||0)*k,kind:kind||'t'})}
function txt(t,x,y,size,col,o){o=o||{};X.font=size+'px '+(o.f||FONT);X.textAlign=o.al||'center';X.textBaseline='middle';
 if(o.st!==0){X.lineJoin='round';X.lineWidth=o.lw||Math.max(3,size*.16);X.strokeStyle=o.st||'rgba(40,16,4,.9)';X.strokeText(t,x,y)}X.fillStyle=col||'#fff';X.fillText(t,x,y);
 if(AUD&&o.box!==undefined){const w=X.measureText(t).width;const x0=o.al==='left'?x:o.al==='right'?x-w:x-w/2;regText([x0,y-size*.5,x0+w,y+size*.5],o.box,o.id,t,size,o.kind)}}
function textIn(t,x,y,w,h,maxS,col,o){o=o||{};const f=fitText(t,w,h,maxS,o.f||BODY,o.min);const y0=y-(f.L.length-1)*f.lh/2;
 f.L.forEach((l,i)=>txt(l,x,y0+i*f.lh,f.s,col,{f:o.f||BODY,st:o.st,lw:o.lw,box:[x-w/2,y-h/2,x+w/2,y+h/2],id:o.id}));return f}
function spr(n,x,y,h,o){let i=IM[n];if(!okI(i))return 0;o=o||{};if(o.blink&&okI(IM[n+'_b'])&&blinkK(o.blink))i=IM[n+'_b'];const w=h*i.naturalWidth/i.naturalHeight;X.save();X.translate(x,y);if(o.rot)X.rotate(o.rot);if(o.flip)X.scale(-1,1);if(o.a!=null)X.globalAlpha=o.a;
 const ax=o.ax==null?.5:o.ax,ay=o.ay==null?.5:o.ay;X.drawImage(i,-w*ax,-h*ay,w,h);X.restore();return w}
function sprW(n,x,y,w,o){const i=IM[n];if(!okI(i))return 0;return spr(n,x,y,w*i.naturalHeight/i.naturalWidth,o)}
function aspect(n){const i=IM[n];return okI(i)?i.naturalWidth/i.naturalHeight:1}
function blinkK(seed){const p=3.2+(seed%5)*.37,t=(T+seed*1.7)%p;return t<.13}
// ---- фигурки-символы и цифры: крупно и контрастно ----
const SYM={r:['#e8402f','c'],b:['#2f7fe8','c'],g:['#3dbb4a','c'],y:['#ffc928','c'],c:['#e8402f','c'],t:['#2f7fe8','t'],s:['#3dbb4a','s'],st:['#ffc928','*']};
function symDraw(k,x,y,r){const [col,sh]=SYM[k]||['#fff','c'];X.save();X.translate(x,y);X.fillStyle=col;X.strokeStyle='#1d1030';X.lineWidth=Math.max(2,r*.16);X.lineJoin='round';X.beginPath();
 if(sh==='c')X.arc(0,0,r*.82,0,7);else if(sh==='t'){X.moveTo(0,-r*.95);X.lineTo(r*.92,r*.7);X.lineTo(-r*.92,r*.7);X.closePath()}else if(sh==='s'){X.rect(-r*.75,-r*.75,r*1.5,r*1.5)}else{for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.42:r*.95;X.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}X.closePath()}
 X.fill();X.stroke();X.fillStyle='rgba(255,255,255,.45)';X.beginPath();X.ellipse(-r*.25,-r*.3,r*.22,r*.13,-.5,0,7);X.fill();X.restore()}
// значение плитки: число или символ
function valDraw(v,x,y,s,o){o=o||{};if(typeof v==='string'&&SYM[v]){symDraw(v,x,y,s*.5);if(AUD)regText([x-s*.4,y-s*.4,x+s*.4,y+s*.4],o.box||[x-s/2,y-s/2,x+s/2,y+s/2],o.id||'sym',v,s,'sym');return}
 if(v==='?'){txt('?',x,y+s*.03,s*.82,o.col||'#ffe066',{f:NUM,st:'#2a1206',lw:s*.14,box:o.box,id:o.id,kind:'num'});return}
 const str=String(v);const fs=s*(str.length>1?.66:.8);txt(str,x,y+s*.04,fs,o.col||'#fff',{f:NUM,st:o.st||'#1d1030',lw:fs*.2,box:o.box,id:o.id,kind:'num'})}
function rr(x,y,w,h,r){X.beginPath();X.moveTo(x+r,y);X.arcTo(x+w,y,x+w,y+h,r);X.arcTo(x+w,y+h,x,y+h,r);X.arcTo(x,y+h,x,y,r);X.arcTo(x,y,x+w,y,r);X.closePath()}
// ---- ввод: мульти-тач, координаты дизайна ----
const PTR=new Map();let TAPS=[];
function toD(e){const r=C.getBoundingClientRect();return[(e.clientX-r.left-OX)/S,(e.clientY-r.top-OY)/S]}
C.addEventListener('pointerdown',e=>{ac();e.preventDefault();const[x,y]=toD(e);PX=x;PY=y;PTR.set(e.pointerId,{x,y,x0:x,y0:y,t0:T,own:null});TAPS.push({x,y,id:e.pointerId});try{C.setPointerCapture(e.pointerId)}catch(_){}});
C.addEventListener('pointermove',e=>{const[x,y]=toD(e);PX=x;PY=y;const p=PTR.get(e.pointerId);if(p){p.x=x;p.y=y}});
const _up=e=>{const p=PTR.get(e.pointerId);if(p)p.up=true;PTR.delete(e.pointerId)};C.addEventListener('pointerup',_up);C.addEventListener('pointercancel',_up);C.addEventListener('lostpointercapture',_up);
const KEYS={};addEventListener('keydown',e=>{KEYS[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();ac()});addEventListener('keyup',e=>{KEYS[e.code]=false});
// кнопки интерфейса: регистрируются при отрисовке
let UI=[];
function hitUI(x,y){for(let i=UI.length-1;i>=0;i--){const b=UI[i];if(Math.abs(x-b.x)<=b.w/2&&Math.abs(y-b.y)<=b.h/2&&!b.dis)return b}return null}
function boardBtn(id,x,y,w,label,fn,o){o=o||{};const h=w/aspect('board')*.62;UI.push({id,x,y,w,h,fn,dis:o.dis});const k=1+(o.pulse?Math.sin(T*4)*.03:0);
 X.save();X.translate(x,y);X.scale(k,k);X.drawImage(IM.board,-w/2,-h/2,w,h);X.restore();
 X.save();X.translate(x,y);X.scale(k,k);textIn(label,0,0,w*.72,h*.5,o.size||56,'#fff6dc',{f:FONT,st:'#3a1a06',lw:7,id});X.restore()}
function roundBtn(id,x,y,d,draw,fn,o){o=o||{};UI.push({id,x,y,w:d,h:d,fn});X.save();X.translate(x,y);const r=d/2;const g=X.createRadialGradient(0,-r*.3,r*.1,0,0,r);g.addColorStop(0,o.c1||'#3b9c96');g.addColorStop(1,o.c2||'#1d5a57');X.fillStyle=g;X.beginPath();X.arc(0,0,r,0,7);X.fill();X.lineWidth=Math.max(3,d*.06);X.strokeStyle='#ffd27a';X.stroke();draw(r);X.restore()}
