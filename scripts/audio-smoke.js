async (page) => {
  const assert=(condition,message)=>{if(!condition)throw new Error(message);};
  const errors=[];
  page.on('pageerror',(error)=>errors.push(error.message));
  await page.goto('http://127.0.0.1:5174');
  const rendered=await page.evaluate(async()=>{
    const {synthesizeSound}=await import('/src/ui/audio.ts');
    const result=[];
    for(const cue of ['chip','card','reveal','shuffle','win','blackjack','push','loss','bust']) {
      const context=new OfflineAudioContext(1,48000,48000);
      synthesizeSound(context,context.destination,cue,0.01);
      const buffer=await context.startRendering();
      const data=buffer.getChannelData(0);
      let peak=0,sum=0;
      for(const value of data){peak=Math.max(peak,Math.abs(value));sum+=value*value;}
      result.push({cue,peak,rms:Math.sqrt(sum/data.length)});
    }
    return result;
  });
  for(const result of rendered) assert(result.peak>0.01 && result.peak<0.8 && result.rms>0.001,`${result.cue} renders audible, unclipped audio`);
  await page.addInitScript(()=>{
    const NativeContext=window.AudioContext;
    window.__soundProbe={contexts:[],nodes:[],starts:0,stops:0};
    window.AudioContext=new Proxy(NativeContext,{construct(Target,args){
      const context=Reflect.construct(Target,args);
      window.__soundProbe.contexts.push(context);
      for(const name of ['createOscillator','createBufferSource']) {
        const original=context[name].bind(context);
        context[name]=()=>{
          const source=original();
          window.__soundProbe.nodes.push(source);
          const start=source.start.bind(source),stop=source.stop.bind(source);
          source.start=(...args)=>{window.__soundProbe.starts+=1;return start(...args);};
          source.stop=(...args)=>{window.__soundProbe.stops+=1;return stop(...args);};
          return source;
        };
      }
      return context;
    }});
  });
  await page.goto('http://127.0.0.1:4173');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
  assert(await page.evaluate(()=>window.__soundProbe.contexts.length)===0,'No audio context or autoplay on load');
  await page.getByRole('button',{name:'Bet 100 chips',exact:true}).click();
  await page.waitForFunction(()=>window.__soundProbe.starts>0);
  assert(await page.evaluate(()=>window.__soundProbe.contexts[0].state)==='running','User interaction unlocks real Web Audio');
  assert(await page.locator('#sound-toggle').getAttribute('aria-pressed')==='true','Sound enabled by default');
  await page.locator('#sound-toggle').click();
  assert(await page.locator('#sound-toggle').getAttribute('aria-pressed')==='false','Mute toggle accessible state');
  const starts=await page.evaluate(()=>window.__soundProbe.starts);
  await page.locator('#deal').click();
  await page.waitForFunction(()=>!document.getElementById('hit').disabled || !document.getElementById('new-round').disabled);
  assert(await page.evaluate(()=>window.__soundProbe.starts)===starts,'Muted deal produces no audio nodes');
  assert(await page.evaluate(()=>localStorage.getItem('blackjack.sound.v1'))==='off','Mute persisted separately');
  await page.reload();
  assert(await page.locator('#sound-toggle').getAttribute('aria-pressed')==='false','Mute survives reload');
  assert(await page.evaluate(()=>window.__soundProbe.contexts.length)===0,'Resume never replays audio');
  await page.locator('#sound-toggle').click();
  await page.waitForFunction(()=>window.__soundProbe.starts>0);
  assert(await page.evaluate(()=>window.__soundProbe.contexts[0].state)==='running','Unmute unlocks audio');
  const mute=await page.evaluate(()=>{
    document.getElementById('sound-toggle').click();
    const stops=window.__soundProbe.stops;
    return {stops,enabled:document.getElementById('sound-toggle').getAttribute('aria-pressed')};
  });
  assert(mute.stops>0 && mute.enabled==='false','Muting stops scheduled/playing effects');
  await page.setViewportSize({width:360,height:800});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Sound control fits mobile');
  await page.screenshot({path:'output/playwright/mobile-audio.png',fullPage:true});
  assert(errors.length===0,`No browser errors: ${errors.join('; ')}`);
  return {passed:true,rendered,checks:['no autoplay','gesture unlock','mute','mute persistence','silent resume','mobile layout']};
}
