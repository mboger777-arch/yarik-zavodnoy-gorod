# Проверка: реплики не обрываются и не накладываются (реальный режим, со звуком)
import asyncio,sys,json
from playwright.async_api import async_playwright
HOOK="""(()=>{window.__AU=[];const P=HTMLMediaElement.prototype;const op=P.play,pa=P.pause;
P.play=function(){const r={src:this.src.split('/').pop(),t0:performance.now(),end:null,cut:null,dur:null};__AU.push(r);this.__r=r;
 this.addEventListener('ended',()=>{r.end=performance.now()},{once:true});this.addEventListener('loadedmetadata',()=>{r.dur=this.duration});return op.apply(this,arguments)};
P.pause=function(){if(this.__r&&!this.__r.end&&!this.ended&&this.src.includes('/voice/'))this.__r.cut={at:this.currentTime,dur:this.duration};return pa.apply(this,arguments)}})()"""
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    pg=await b.new_page(viewport={'width':844,'height':390},has_touch=True,is_mobile=True)
    await pg.add_init_script(HOOK)
    await pg.goto('http://localhost:8417/index.html');await pg.wait_for_timeout(2500)
    ev=pg.evaluate
    # интро целиком, со звуком; во время реплик жмём по экрану (не должно обрывать)
    await ev("go('intro')")
    for i in range(70):
      await pg.mouse.click(422,200);await pg.wait_for_timeout(1000)
      if await ev("G.scene")=='map': break
    print('scene',await ev("G.scene"))
    await pg.wait_for_timeout(4000)
    # начало уровня 1 со звуком
    await ev("go('play',0)");await pg.wait_for_timeout(25000)
    # финал
    await ev("go('fin')");
    for i in range(60):
      await pg.mouse.click(422,200);await pg.wait_for_timeout(1000)
    au=[a for a in await ev("__AU") if 'voice' in json.dumps(a) or a['src'].endswith('.mp3')]
    au=[a for a in au if '_' in a['src']]
    cut=[a for a in au if a['cut']];ov=[]
    vo=[a for a in au if a['src'][:2] not in('mu','sf')]
    for x,y in zip(vo,vo[1:]):
      if x['end'] and y['t0']<x['end']-50: ov.append((x['src'],y['src']))
    for a in vo: print(a['src'],'dur',a['dur'] and round(a['dur'],2),'played',a['end'] and round((a['end']-a['t0'])/1000,2),'CUT' if a['cut'] else '')
    print('VOICES',len(vo),'CUT',len(cut),'OVERLAP',ov)
    await b.close()
asyncio.run(main())
