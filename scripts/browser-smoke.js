async (page) => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('http://127.0.0.1:4173');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const idle = () => page.waitForFunction(() => ['deal','hit','new-round','reset'].some((id) => !document.getElementById(id).disabled));
  const bank = async () => Number((await page.locator('#bankroll').innerText()).replaceAll(',', ''));
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('blackjack.save.v1')).state);
  const key = async (value) => { await page.keyboard.press(value); await idle(); };
  async function fixture(tokens, bankroll = 1000) {
    await page.evaluate(({tokens,bankroll}) => {
      const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
      const suits = ['clubs','diamonds','hearts','spades'];
      const pool = [];
      for(let deck=0;deck<6;deck+=1) for(const suit of suits) for(const rank of ranks) pool.push({id:pool.length,rank,suit});
      const named = {S:'spades',H:'hearts',D:'diamonds',C:'clubs'};
      const prefix = tokens.map((token) => {
        const index = pool.findIndex((card) => card.rank === token.slice(0,-1) && card.suit === named[token.slice(-1)]);
        if(index<0) throw new Error('Fixture card missing');
        return pool.splice(index,1)[0];
      });
      const state = {schemaVersion:1,seq:0,phase:'BETTING',round:null,bankroll,lastBet:100,
        shoe:{cards:[...prefix,...pool],position:0},rng:{a:42,b:0x9e3779b9,c:0x243f6a88,d:1},
        stats:{rounds:0,hands:0,wins:0,losses:0,pushes:0,naturals:0,doubles:0,splits:0,totalWagered:0,
          netProfit:0,biggestWin:0,peakBankroll:1000,reloads:0}};
      localStorage.setItem('blackjack.save.v1',JSON.stringify({schemaVersion:1,savedAt:new Date().toISOString(),state}));
    }, {tokens,bankroll});
    await page.reload();
    await idle();
    await page.locator('#deal').focus();
  }
  await page.setViewportSize({width:1440,height:1100});
  await fixture(['8S','10H','8D','7C','3H','10D','9C']);
  await key('d');
  assert(await bank()===900,'Deal deducts once');
  assert(await page.getByRole('img',{name:'Face-down card',exact:true}).count()===1,'Hole card hidden');
  assert(await page.locator('#dealer-total').innerText()==='Showing 10','Only upcard total is shown');
  await key('p');
  assert(await page.locator('.player-hand').count()===2,'Split creates two hands');
  assert(await bank()===800,'Split adds equal wager');
  const beforeReload=await saved();
  await page.reload();await idle();
  assert(JSON.stringify(await saved())===JSON.stringify(beforeReload),'Reload preserves exact split round');
  await key('2');
  assert(await bank()===700,'DAS deducts one equal wager');
  assert(await page.locator('.doubled-badge').count()===1,'Doubled badge');
  assert((await page.locator('.player-hand.active').getAttribute('aria-label')).includes('Hand 2'),'Next split hand active');
  await page.screenshot({path:'output/playwright/desktop-das.png',fullPage:true});
  await key('s');
  assert(await bank()===1200,'S16 settles to 1200');
  assert(await page.locator('.hand-settlement').count()===2,'Per-hand settlements visible');
  assert(await page.getByRole('img',{name:'Face-down card',exact:true}).count()===0,'Hole revealed');
  await page.reload();await idle();
  assert(await bank()===1200,'Settled reload never pays twice');
  await page.locator('#stats-open').click();
  const stats=await page.locator('#stats-values').innerText();
  assert(stats.includes('Net profit\n200') && stats.includes('Doubles\n1'),'Exact stats displayed');
  await page.screenshot({path:'output/playwright/desktop-stats.png',fullPage:true});
  await page.locator('#stats-close').click();
  await fixture(['8S','10H','8D','7C','8H','8C','8S','10S','10D','10C']);
  await key('d');
  await key('p');await key('p');await key('p');
  assert(await page.locator('.player-hand').count()===4,'Four split hands');
  assert(await page.locator('#split').isDisabled(),'Fifth hand prohibited');
  await page.setViewportSize({width:360,height:800});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Four hands fit mobile without overflow');
  await page.screenshot({path:'output/playwright/mobile-four-hands.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1100});
  await page.screenshot({path:'output/playwright/desktop-four-hands.png',fullPage:true});
  for(let count=0;count<4;count+=1) await key('s');
  assert(await bank()===1200,'S19 hand order and settlement');
  await fixture(['AS','9H','AD','7C','KH','5D','QC']);
  await key('d');await key('p');
  assert(await bank()===1200,'Split ace 21 pays 1:1');
  assert(await page.locator('.split-badge').count()===2,'Split ace badges');
  assert(await page.locator('#hit').isDisabled() && await page.locator('#split').isDisabled(),'Split aces auto-stand');
  await page.locator('#rules-open').click();
  assert((await page.locator('#rules-dialog').innerText()).includes('No insurance'),'Omitted rules documented');
  await page.setViewportSize({width:360,height:800});
  await page.screenshot({path:'output/playwright/mobile-rules.png',fullPage:true});
  await page.keyboard.press('Escape');
  assert(!await page.locator('#rules-dialog').isVisible(),'Native Escape closes modal');
  await fixture(['10S','10H','8D','7C']);
  await page.emulateMedia({reducedMotion:'no-preference'});
  const animationCheck=await page.evaluate(()=>{
    document.getElementById('deal').click();
    const read=()=>JSON.parse(localStorage.getItem('blackjack.save.v1')).state;
    const first=read();
    const locked=document.getElementById('hit').disabled && document.getElementById('deal').disabled;
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'h',bubbles:true}));
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'d',bubbles:true}));
    const afterRepeated=read();
    document.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true}));
    return {seq:first.seq,bankroll:first.bankroll,locked,afterRepeatedSeq:afterRepeated.seq};
  });
  assert(animationCheck.seq===1 && animationCheck.bankroll===900,'Action saved before animation');
  assert(animationCheck.locked && animationCheck.afterRepeatedSeq===1,'Animation blocks repeated actions');
  await idle();
  assert((await saved()).seq===1 && await bank()===900,'Skipping animation never dispatches another move');
  assert(await page.locator('#skip-animation').isHidden(),'Skip control hides after animation');
  await fixture(['10S','10H','8D','7C']);
  await page.locator('#deal').click();
  await page.reload();await idle();
  assert(await bank()===900 && (await saved()).seq===1,'Mid-animation reload resumes final saved snapshot');
  await key('s');
  await fixture([],5);
  await page.keyboard.press('r');await idle();
  assert(await bank()===1000,'Keyboard reload restores bankroll');
  const previousWager = Number(await page.locator('#bet-value').innerText());
  await page.locator('#bet').focus();
  await page.keyboard.press('ArrowRight');
  assert(Number(await page.locator('#bet-value').innerText())===previousWager+10,'Keyboard slider wager');
  assert(await page.locator('#bet').evaluate((node)=>parseFloat(getComputedStyle(node).outlineWidth)>0),'Visible keyboard focus');
  assert(errors.length===0,`Browser errors: ${errors.join('; ')}`);
  console.log(JSON.stringify({passed:true,scenarios:['S16/DAS/exact resume','S19/four hands','S17/split aces',
    'mid-animation reload','animation input lock','Space animation skip','keyboard reset','keyboard wager','dialogs'],browserErrors:errors}));
}
