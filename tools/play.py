# Сценарий полного прохождения: ошибка + исправление на каждом задании, аудиты, fps, ошибки консоли.
import asyncio,sys,json,time
from playwright.async_api import async_playwright
W,H=int(sys.argv[1]),int(sys.argv[2]);OUT=sys.argv[3] if len(sys.argv)>3 else '/tmp/z306b/pl'
URL='http://localhost:8417/index.html'
import os
START=int(os.environ.get('START','0'))
LOG=[];FAIL=[];AUDS=[]
def log(*a):
  s=' '.join(str(x) for x in a);LOG.append(s);print(s,flush=True)
async def main():
  import os;os.makedirs(OUT,exist_ok=True)
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    pg=await b.new_page(viewport={'width':W,'height':H},has_touch=True,is_mobile=True,device_scale_factor=2)
    errs=[];pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None);pg.on('pageerror',lambda e: errs.append(str(e)))
    await pg.goto(URL);await pg.wait_for_timeout(2500)
    await pg.evaluate("""G.fast=true;window.BADN=0;window.OKN=0;window.__LN=[];const _s=window.sayNow;window.sayNow=function(k){__LN.push(k);if(/_bad|b_miss|l3_wrong|l1_slip/.test(k))BADN++;return _s.apply(this,arguments)};const _y=window.say;window.say=function(k){__LN.push(k);return _y.apply(this,arguments)};0""")
    W8=lambda ms: pg.wait_for_timeout(ms)
    ev=pg.evaluate
    async def st(): return await ev("__T.st()")
    async def shot(n): await pg.screenshot(path=f'{OUT}/{n}.jpg',type='jpeg',quality=72)
    async def audit(name):
      await ev("G.auditReq=1");await W8(120)
      a=await ev("({t:(G._aud||{t:[]}).t,h:G.heroes||[],vw:innerWidth,vh:innerHeight})")
      bad=[]
      for t in a['t']:
        bb=t['b'];box=t['box']
        if not bb or not t['t'].strip(): continue
        out=bb[2]<0 or bb[3]<0 or bb[0]>a['vw'] or bb[1]>a['vh']
        if not out and (bb[0]<-1 or bb[1]<-1 or bb[2]>a['vw']+1 or bb[3]>a['vh']+1): bad.append(('edgecut',t['id'],t['t'][:20],[round(v) for v in bb]))
        if out: continue
        if box and (bb[0]<box[0]-2 or bb[1]<box[1]-2 or bb[2]>box[2]+2 or bb[3]>box[3]+2): bad.append(('outframe',t['id'],t['t'][:20],[round(v) for v in bb],[round(v) for v in box]))
        if t['t'].strip().isdigit() and t['css']<14: bad.append(('smalldigit',t['id'],t['t'],round(t['css'],1)))
      for h in a['h']:
        if 'w' in h and 'h' in h and h.get('ar'):
          if abs(h['w']/h['h']-h['ar'])/h['ar']>.03: bad.append(('stretch',h))
      AUDS.append((name,len(a['t']),bad))
      if bad: log('AUDIT',name,bad[:6])
      else: log('audit ok',name,len(a['t']),'texts',len(a['h']),'heroes')
    async def btn(id,timeout=8000,idx=0):
      t0=time.time()
      while time.time()-t0<timeout/1000:
        bs=await ev("G.btns()");m=[x for x in bs if x['id']==id and not x['dis']]
        if len(m)>idx:
          c=await ev(f"G.pg({m[idx]['x']},{m[idx]['y']})");await pg.touchscreen.tap(c['x'],c['y']);return True
        await W8(150)
      FAIL.append('no button '+id);log('NO BUTTON',id,[x['id'] for x in bs]);return False
    async def until(js,timeout=6000,step=100):
      t0=time.time()
      while time.time()-t0<timeout/1000:
        if await ev(js): return True
        await W8(step)
      return False
    async def key(k,hold=60):
      await pg.keyboard.down(k);await W8(hold);await pg.keyboard.up(k)
    async def notalk(t=15000):
      await until("!__T.st().talk",t)
    async def walk(dx,ms):
      await ev(f"__T.ext({{x:{dx}}})");await W8(ms);await ev("__T.ext({x:0})")
    async def walkto(x,timeout=6000,jump=False):
      t0=time.time();s=await st();d=1 if x>s['x'] else -1
      await ev(f"__T.ext({{x:{d}}})")
      while time.time()-t0<timeout/1000:
        s=await st()
        if 'x' not in s: return True
        if (s['x']-x)*d>=0: break
        if jump and s['g'] and abs(s['vx'])<.5: await key('Space',200)
        await W8(60)
      await ev("__T.ext({x:0})");return (s['x']-x)*d>=0
    async def throw_crate(v,near=None,expect_ok=True,tries=4,tx=None):
      for k in range(tries):
        cs=await ev("__T.crates()")
        c=[c for c in cs if c['v']==v and not c['solved'] and not c['dead'] and not c['pinned']]
        if near is not None: c.sort(key=lambda c:abs(c['x']-near))
        if not c: await W8(700);continue
        b0=await ev("BADN");n0=sum(1 for t in (await st())['tasks'] if t)
        await ev(f"__T.grab({c[0]['i']})");await W8(250)
        s=await st()
        if s['carry']!=v: log('grab failed',v,s['carry']);await W8(400);continue
        if tx is not None and abs(s['x']-tx)>8:
          await walkto(tx-7.5 if tx>s['x'] else tx+7.5,6000,jump=True);await W8(200)
          await ev(f"__T.face({1 if tx>(await st())['x'] else -1})")
        await key('KeyX')
        for _ in range(9):
          await W8(400);s=await st();n1=sum(1 for t in s['tasks'] if t);b1=await ev("BADN")
          if n1>n0 or b1>b0: break
        if expect_ok and n1>n0: log(' ok throw',v);return True
        if not expect_ok and b1>b0: log(' wrong throw spat',v);return True
        log(' throw retry',v,'bad',b0,b1,'solved',n0,n1,'carry',s['carry'])
        await W8(600)
      FAIL.append(f'throw {v} ok={expect_ok} L{(await st()).get("idx")}');return False
    async def finish_level(idx):
      s=await st()
      if not s['tasks'] or not all(s['tasks']): FAIL.append(f'L{idx} tasks {s["tasks"]}')
      await notalk(12000)
      ok=await walkto(s['exitX']+.5,9000,jump=True)
      if not await until("G.scene!=='play'||__T.st().won",4000):
        log('assist exit L',idx);FAIL.append(f'assist exit L{idx}');await ev(f"__T.tp({s['exitX']+1},{s['y']+1})")
      await until("G.scene==='map'",15000);await W8(800)
    async def start_level(i):
      if i==START and START>0:
        await ev(f"G.fast=true;for(let j=0;j<{i};j++)SV.done[j]=1;go('play',{i})");await W8(900)
      else:
        await until("G.scene==='map'",8000);await notalk(8000);await W8(400)
        if not await btn('n'+str(i),3000):
          log('map node missing, scene',await ev("G.scene"));FAIL.append(f'map n{i}');await ev(f"go('play',{i})")
        await until("G.scene==='play'",5000);await W8(600)
      await ev("G.fast=true")
    async def gear(x,y):
      await ev(f"__T.tp({x},{y})");await W8(500)
    # ---------- титул / интро / карта
    await shot('00_title');await audit('title')
    await btn('play');await W8(1200);await shot('01_intro');await audit('intro')
    await until("G.scene==='map'",60000);await W8(1500);await shot('02_map');await audit('map')
    log('map btns',[x['id'] for x in await ev('G.btns()')])
    # ---------- L1
    if START<=0:
      await start_level(0);await notalk()
      await walk(1,700);await key('Space',250);await W8(500);await key('KeyX');await W8(800);await shot('10_L1_start')
      for k,(E,g) in enumerate([(16,1),(44,2),(72,0)]):
        s=await st()
        if s['x']<E-8: await ev(f"__T.tp({E-4},1.2)")
        await walkto(E-.5,5000);await W8(600);await notalk()
        rs=[r for r in await ev("__T.rings()") if r['task']==k]
        bad=[r for r in rs if not r['good']][0];good=[r for r in rs if r['good']][0]
        b0=await ev("BADN")
        await pg.touchscreen.tap(*bad['css']) if False else await pg.touchscreen.tap(bad['css'][0],bad['css'][1])
        await W8(400);await shot(f'11_L1_t{k}_bad') if k==0 else None
        await until(f"BADN>{b0}",3000);await W8(2200)
        log('L1',k,'bad slips',await ev("BADN")-b0,'pos',round((await st())['x'],1))
        await notalk();s=await st()
        if abs(s['x']-(E-.5))>1.5: await walkto(E-.5,5000)
        await W8(300);rs=[r for r in await ev("__T.rings()") if r['task']==k];good=[r for r in rs if r['good']][0]
        await pg.touchscreen.tap(good['css'][0],good['css'][1])
        ok=await until(f"__T.st().tasks[{k}]",3000)
        if not ok:
          log(' ring retry',k,await st());await notalk(6000);await walkto(E-.2,4000);await W8(400)
          rs=[r for r in await ev("__T.rings()") if r['task']==k];good=[r for r in rs if r['good']][0]
          await pg.touchscreen.tap(good['css'][0],good['css'][1]);ok=await until(f"__T.st().tasks[{k}]",3000)
          if not ok: FAIL.append(f'L1 t{k} ring tap')
        await W8(300);await shot(f'12_L1_t{k}_hook') if k==1 else None
        ok2=await until(f"__T.st().x>{E+12.5}&&__T.st().g",6000)
        log('L1',k,'solved',ok,'landed',ok2,round((await st())['x'],1))
        if not ok2: FAIL.append(f'L1 t{k} landing assist');await ev(f"__T.tp({E+14.2},2)")
      await gear(39.6,5.6)
      await finish_level(0);await audit('map_after_L1')
    # ---------- L2
    if START<=1:
      await start_level(1);await notalk();await shot('20_L2_start')
      for k,(wr,ok,nx,x0,sx,base,ly) in enumerate([(6,5,6,12,17.2,0,6.5),(7,8,24.5,35.5,39.4,6.5,13.5),(9,7,49,59.5,63.4,13.5,19.5)]):
        await throw_crate(wr,nx,False,tx=sx);await notalk()
        if k==0: await shot('21_L2_bad')
        await throw_crate(ok,nx,True,tx=sx);await W8(1800);await notalk()
        if k==1: await shot('22_L2_ok1')
        await ev(f"__T.tp({x0-1.5},{base+1})");await W8(500)
        await walkto(sx+.3,8000,jump=True)
        up=await until(f"__T.st().y>{ly-.3}&&__T.st().g",4000)
        s=await st();log('L2',k,'stairs+pad climb',up,round(s['x'],1),round(s['y'],1))
        if not up: FAIL.append(f'L2 t{k} climb assist');await ev(f"__T.tp({sx+4},{ly+1})");await W8(800)
      await gear(-.5,6.2)
      await ev("__T.tp(70,20.5)");await W8(500)
      await finish_level(1)
    # ---------- L3
    if START<=2:
      await start_level(2);await notalk();await shot('30_L3_start')
      for k,(tx,wr,wr2,ok,near) in enumerate([(14,18,30,20,7.5),(42,34,50,35,33),(68,10,16,15,58.5)]):
        await ev(f"__T.tp({near-2},1.2)");await W8(900);await notalk()
        if k==2:
          # сбить рывком
          await ev(f"__T.tp({tx-3.2},1.0)");await ev("__T.face(1)");await W8(500);await key('KeyX');await W8(1200)
          kn=await ev(f"__T.crates().filter(c=>c.imp&&c.tower!=null).map(c=>c.pinned)")
          log('L3 dash knock pins',kn)
        else:
          await throw_crate(wr,near,False) if False else None
          cs=await ev("__T.crates()");c=[c for c in cs if c['v']==wr and not c['pinned']]
          c.sort(key=lambda c:abs(c['x']-near))
          await ev(f"__T.grab({c[0]['i']})");await W8(250);await key('KeyX');await W8(1800)
          if k==0: await shot('31_L3_knock')
        await notalk()
        await throw_crate(wr2 if k<2 else wr,near,False,tx=tx);await notalk()
        await throw_crate(ok,near,True,tx=tx);await W8(1200);await notalk()
        if k==0: await shot('32_L3_ok')
      await gear(42,7.6)
      await ev("__T.tp(74,1.5)");await W8(400)
      await finish_level(2)
    # ---------- L4
    if START<=3:
      await start_level(3);await notalk();await shot('40_L4_start')
      for k,(wx,wy,good_high) in enumerate([(28,13,False),(52,10,True),(76,6.5,True)]):
        async def door(high):
          if high: await ev(f"__T.tp({wx-1.8},{wy+3.2})")
          else: await ev(f"__T.tp({wx-2.5},{wy+1})")
          await W8(700);await notalk();b0=await ev("BADN");n0=sum((await st())['tasks'])
          await walk(1,1300);await W8(900)
          s=await st();return (await ev("BADN"))>b0, sum(s['tasks'])>n0
        wb,_=await door(not good_high);log('L4',k,'wrong door bounced',wb)
        if not wb: FAIL.append(f'L4 t{k} wrong door no bounce')
        if k==0: await shot('41_L4_bad')
        await notalk();_,gk=await door(good_high);log('L4',k,'good door solved',gk)
        if not gk: FAIL.append(f'L4 t{k} good door')
        await W8(1200);await notalk();await walk(1,900)
        if k==1: await shot('42_L4_ok')
      await gear(67.5,17.6)
      await ev("__T.tp(90,5)");await W8(500)
      await finish_level(3)
    # ---------- L5
    if START<=4:
      await start_level(4);await notalk(20000);await W8(800);await shot('50_L5_start')
      for k,(ok,wr) in enumerate([(4,5),(6,7),(10,12)]):
        await until("__T.st().cur!=null&&!__T.st().talk",8000)
        if not await until(f"__T.crates().some(c=>c.v=={wr}&&!c.solved&&!c.dead)",6000):
          cs=[c['v'] for c in await ev("__T.crates()") if not c['solved'] and not c['dead'] and c['v'] not in (4,6,10)]
          if cs: wr=cs[0]
        await throw_crate(wr,12,False);await notalk()
        if k==0: await shot('51_L5_bad')
        await until(f"__T.crates().some(c=>c.v=={ok}&&!c.solved&&!c.dead)",15000)
        await throw_crate(ok,12,True);await W8(1000);await notalk()
        if k==1: await shot('52_L5_ok')
      await W8(3500);await notalk()
      await gear(47.2,9);await ev("__T.tp(40,1.5)");await W8(400)
      await finish_level(4);await audit('map_all');await shot('60_map_all')
      log('gears',await ev("SV.gears||SV.g||null"))
    # ---------- Босс
    if START<=5:
      await start_level(5);await W8(500);await shot('70_boss_start')
      await until("__T.st().b&&__T.st().b.st!=='intro'",25000)
      PH=[('s','c'),(17,18),(25,20)]
      async def bst():
        s=await st();return s.get('b') if s else None
      async def tile(v,exp,k):
        for a in range(6):
          b=await bst()
          if not b or b['ph']!=k: log(' tile skip',v,b,await st());return exp
          cs=await ev("LV?__T.crates():[]")
          c=[c for c in cs if str(c['v'])==str(v) and not c['solved'] and not c['dead']]
          if not c: await W8(800);continue
          b0=await ev("BADN")
          await ev(f"__T.grab({c[0]['i']})");await W8(200)
          s=await st()
          if not s or s.get('carry') is None: await W8(500);continue
          await ev(f"__T.face({1 if s['x']<10 else -1})");await key('KeyX');await W8(1500)
          b=await bst();b1=await ev("BADN")
          if exp and (not b or b['ph']>k or b['st'] in('hit','down')): return True
          if not exp and b1>b0: return True
          log(' boss retry',v,b,b0,b1);await W8(700)
        FAIL.append(f'boss ph{k} {v} {exp}');return False
      for k,(wr,ok) in enumerate(PH):
        await until(f"!LV||(__T.st().b&&__T.st().b.ph=={k}&&__T.st().b.st!=='hit'&&__T.crates().some(c=>!c.dead&&!c.solved))",12000)
        await notalk(8000);await W8(500)
        r1=await tile(wr,False,k);log('boss',k,'wrong',r1)
        if k==0: await shot('71_boss_bad')
        r2=await tile(ok,True,k);log('boss',k,'hit',r2)
        if k==1: await W8(300);await shot('72_boss_hit')
        await W8(2600)
      await until("G.scene==='fin'",15000);await W8(4000);await shot('80_fin');await audit('fin')
      await until("G.btns().some(b=>b.id==='tomap')",40000);await W8(1500);await shot('81_fin_medal');await audit('fin_medal')
      await btn('tomap');await until("G.scene==='map'",5000);await W8(1500);await shot('82_map_end')
    # ---------- Пинбол
    if await btn('pin',4000):
      await W8(1500);await shot('90_pin');await audit('pin')
      SCP="SC.pin.P"
      for i in range(60):
        y=await ev(f"{SCP}.ball.getPosition().y")
        fl=y<2.6
        await ev(f"EXT.pl={str(fl).lower()};EXT.pr={str(fl).lower()};0");await W8(250)
      await ev("EXT.pl=false;EXT.pr=false;0")
      log('pin free play lit',await ev(f"{SCP}.lit"))
      await shot('91_pin_play')
      # гарантированный проход: шарик кладём над бамперами по порядку
      for bi in range(5):
        await ev(f"(()=>{{const P={SCP};const b=P.bump.find(q=>q.v==={(bi+1)*2});P.ball.setPosition(V(b.x-1.2,b.y));P.ball.setLinearVelocity(V(8,0))}})();0");await W8(900)
      log('pin lit',await ev(f"{SCP}.lit"),'done',await ev(f"{SCP}.done"))
      if not await ev(f"{SCP}.done"): FAIL.append('pin not won')
      await W8(2500);await shot('92_pin_win');await audit('pin_win')
    fps=await ev("G.fps()");log('FPS',fps,'ERR',errs[:8]);log('FAILS',FAIL)
    json.dump({'fps':fps,'errs':errs,'fail':FAIL,'aud':AUDS,'log':LOG},open(f'{OUT}/report.json','w'),ensure_ascii=False,indent=1,default=str)
    await b.close()
asyncio.run(main())
