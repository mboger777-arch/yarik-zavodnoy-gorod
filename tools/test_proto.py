import asyncio, json, sys
from playwright.async_api import async_playwright
URL='file:///workspace/lesson306b/proto/index.html'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--disable-gpu-vsync'])
    pg=await b.new_page(viewport={'width':844,'height':390},device_scale_factor=2,has_touch=True)
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
    await pg.goto(URL); await pg.wait_for_timeout(1200)
    E=lambda s: pg.evaluate(s)
    out={}
    # 1 run speed
    await E("__T.ext.x=1"); await pg.wait_for_timeout(700); out['run']=await E("__T.pos()")
    await E("__T.ext.x=0"); await pg.wait_for_timeout(500)
    # 2 jump full vs short (variable height)
    async def jump(hold):
      await E("__T.tp(3,0.95)"); await pg.wait_for_timeout(400)
      y0=(await E("__T.pos()"))['y']; await E("__T.ext.jump=true;__T.press('jump')"); await pg.wait_for_timeout(hold); await E("__T.ext.jump=false")
      mx=y0
      for i in range(30):
        y=(await E("__T.pos()"))['y']; mx=max(mx,y); await pg.wait_for_timeout(25)
      return round(mx-y0,2)
    out['jump_full']=await jump(500); out['jump_tap']=await jump(60)
    # 3 coyote: run off ledge at pit edge then jump shortly after
    await E("__T.tp(19.5,0.95)"); await pg.wait_for_timeout(300)
    await E("__T.ext.x=1"); 
    for i in range(80):
      q=await E("__T.pos()")
      if q['x']>22.15: break
      await pg.wait_for_timeout(10)
    await pg.wait_for_timeout(50); await E("__T.press('jump')"); await pg.wait_for_timeout(120); out['coyote']=await E("__T.pos()")
    await E("__T.ext.x=0"); await pg.wait_for_timeout(800)
    # 4 spring pad in pit: drop into pit
    await E("__T.tp(25,-2)"); await pg.wait_for_timeout(450); out['pad_vy']=await E("__T.pos()")
    await pg.wait_for_timeout(800)
    # 5 hook swing from ring at 25,8.4
    await E("__T.tp(22.5,4)"); await pg.wait_for_timeout(30)
    out['kind_near_ring']=await E("__T.kind()")
    await E("__T.ext.act=true;__T.press('act')"); await E("__T.ext.x=1"); await pg.wait_for_timeout(900)
    out['swing']=await E("__T.pos()"); await pg.screenshot(path='shots/proto_swing.png')
    await E("__T.ext.act=false"); await pg.wait_for_timeout(500); out['after_release']=await E("__T.pos()"); await E("__T.ext.x=0")
    await pg.wait_for_timeout(800)
    # 6 dash knocks the stack
    await E("__T.drop(); __T.crates.find(c=>c.n===9).b.setTransform(planck.Vec2(5,1),0); __T.tp(13.9,0.95)"); await pg.wait_for_timeout(300); out["kind_before_dash"]=await E("__T.kind()")
    await E("__T.ext.x=1"); await pg.wait_for_timeout(120); await E("__T.ext.x=0;__T.press('act')"); await pg.wait_for_timeout(700)
    out['stack_after_dash']=await E("__T.crates.filter(c=>c.n==null).map(c=>[+c.b.getPosition().x.toFixed(1),+c.b.getPosition().y.toFixed(1)])")
    # 7 wrong crate then right crate into slot (grab by walking, throw)
    await E("__T.crates.find(c=>c.n===7).b.setTransform(planck.Vec2(46.1,2.1),0); __T.tp(45.4,2.3)"); await pg.wait_for_timeout(100)
    await E("__T.tp(45.6,2.3)"); await pg.wait_for_timeout(500); out['carry1']=await E("__T.pos()")
    await E("__T.ext.x=1"); await pg.wait_for_timeout(60); await E("__T.ext.x=0"); await pg.wait_for_timeout(60); await E("__T.press('act')"); await pg.wait_for_timeout(900)
    out['slot_after_7']=await E("({solved:__T.slot.solved})")
    await pg.screenshot(path='shots/proto_reject.png')
    await pg.wait_for_timeout(1500)
    await E("__T.drop(); __T.crates.find(c=>c.n===7).b.setTransform(planck.Vec2(5,1),0); __T.crates.find(c=>c.n===8).b.setTransform(planck.Vec2(43,2.2),0); __T.tp(43,2.3)"); await pg.wait_for_timeout(500)
    out['carry2']=await E("__T.pos()")
    await E("__T.ext.x=1"); await pg.wait_for_timeout(60); await E("__T.ext.x=0"); await pg.wait_for_timeout(60); await E("__T.press('act')"); await pg.wait_for_timeout(500)
    await pg.screenshot(path='shots/proto_solved.png'); await pg.wait_for_timeout(1500)
    out['slot_after_8']=await E("({solved:__T.slot.solved})")
    # 8 mouse knockback
    await E("__T.ms.state='patrol'; var m=__T.P.getWorld? null:null; const mp=__T.M.getPosition(); __T.tp(mp.x+3*__T.ms.dir,0.95)"); await pg.wait_for_timeout(2500); out['events']=await E("__T.stats.events"); out['mouse']=await E("[__T.ms.state, __T.M.getPosition().x, __T.P.getPosition().x]")
    # 9 perf: free run 4 s with movement
    await E("__T.stats.minFps=999; __T.tp(2,1); __T.ext.x=1"); await pg.wait_for_timeout(4000)
    out['fps']=await E("__T.stats.fps"); out['minFps']=await E("__T.stats.minFps")
    await E("__T.tp(40,6)"); await E("__T.ext.x=0"); await pg.wait_for_timeout(600); await pg.screenshot(path='shots/proto_overview.png')
    out['errors']=errs
    print(json.dumps(out,ensure_ascii=False,indent=1))
    await b.close()
asyncio.run(main())
