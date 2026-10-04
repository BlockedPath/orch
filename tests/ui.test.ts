// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { applyAction, createGame } from '../src/engine/game';
import { mountGame, motionDuration } from '../src/ui/table';
import { LocalStorageStore, MemoryStore, readSave, SAVE_KEY } from '../src/persistence/save';
import { act, stack } from './fixtures';

const source=stack(['8S','10H','8D','7C','3H','10D','9C']);
let destroy: (()=>void) | undefined;
const button=(id:string)=>{
  const node=document.getElementById(id);
  if(!(node instanceof HTMLButtonElement)) throw new Error(`Missing ${id}`);
  return node;
};
async function click(id:string): Promise<void> {
  button(id).click();
  await Promise.resolve();
  await Promise.resolve();
}
beforeEach(()=>{
  const html=readFileSync('index.html','utf8');
  document.body.innerHTML=(html.match(/<body>([\s\S]*)<\/body>/)?.[1] ?? '').replace(/<script[\s\S]*?<\/script>/g,'');
  window.localStorage.clear();
});
afterEach(()=>{destroy?.();destroy=undefined;vi.restoreAllMocks();});

describe('UI controller and persistence boundary',()=>{
  it('renders split hands, DAS, per-hand results, and stats from selectView',async()=>{
    destroy=mountGame({store:new MemoryStore(),fresh:()=>createGame({cards:source}),reducedMotion:()=>true}).destroy;
    button('deal').click();await Promise.resolve();await Promise.resolve();
    expect(document.querySelectorAll('.player-hand')).toHaveLength(1);
    expect(document.querySelectorAll('.card-back')).toHaveLength(1);
    expect(button('double').disabled).toBe(false);
    expect(button('split').disabled).toBe(false);
    await click('split');
    expect(document.querySelectorAll('.player-hand')).toHaveLength(2);
    expect(document.querySelectorAll('.player-hand.active')).toHaveLength(1);
    expect(document.querySelectorAll('.player-hand')[1]?.textContent).toContain('Up next');
    await click('double');
    expect(document.querySelector('.doubled-badge')?.textContent).toBe('Doubled');
    expect(document.querySelector('.player-hand.active')?.getAttribute('aria-label')).toContain('Hand 2');
    await click('stand');
    expect(document.querySelectorAll('.hand-settlement')).toHaveLength(2);
    expect(document.getElementById('bankroll')?.textContent).toBe('1,020');
    expect(document.getElementById('stats-values')?.textContent).toContain('Rounds1');
    expect(button('new-round').disabled).toBe(false);
    expect(button('hit').disabled).toBe(true);
  });
  it('P11 saves before animation, blocks repeated actions, and uses zero reduced-motion durations',async()=>{
    const store=new MemoryStore();
    let release: ()=>void=()=>{};
    const deferred=new Promise<void>((resolve)=>{release=resolve;});
    const animate=vi.fn(async()=>{
      const raw=store.get(SAVE_KEY);
      const saved=readSave(raw ?? '');
      expect(saved.ok).toBe(true);
      if(saved.ok) {expect(saved.state.phase).toBe('PLAYER_TURN');expect(saved.state.bankroll).toBe(990);}
      await deferred;
    });
    destroy=mountGame({store,fresh:()=>createGame({cards:source}),reducedMotion:()=>false,animate}).destroy;
    button('deal').click();
    button('deal').click();
    button('hit').click();
    expect(animate).toHaveBeenCalledTimes(1);
    expect(button('stand').disabled).toBe(true);
    const saved=readSave(store.get(SAVE_KEY) ?? '');
    expect(saved.ok && saved.state.seq).toBe(1);
    release();await Promise.resolve();await Promise.resolve();await Promise.resolve();
    await vi.waitFor(()=>expect(button('stand').disabled).toBe(false));
    expect(motionDuration(true)).toBe(0);
    expect(motionDuration(false)).toBe(220);
  });
  it('resumes mid-round on mount without an animation or second deduction',async()=>{
    const store=new MemoryStore();
    const state=act(createGame({cards:source}),{type:'DEAL',bet:100});
    store.set(SAVE_KEY,JSON.stringify({schemaVersion:1,savedAt:'now',state}));
    const animate=vi.fn(async()=>{});
    destroy=mountGame({store,reducedMotion:()=>true,animate}).destroy;
    expect(document.getElementById('bankroll')?.textContent).toBe('900');
    expect(document.querySelectorAll('.player-hand')).toHaveLength(1);
    expect(animate).not.toHaveBeenCalled();
    await click('split');
    expect(document.getElementById('bankroll')?.textContent).toBe('800');
  });
  it('wires keyboard shortcuts, ignores repeats, and avoids shortcuts in the wager input',async()=>{
    destroy=mountGame({store:new MemoryStore(),fresh:()=>createGame({cards:source}),reducedMotion:()=>true}).destroy;
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'d',bubbles:true}));
    await Promise.resolve();await Promise.resolve();
    expect(document.querySelectorAll('.player-hand')).toHaveLength(1);
    const before=document.querySelectorAll('.card').length;
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'h',repeat:true,bubbles:true}));
    expect(document.querySelectorAll('.card')).toHaveLength(before);
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'p',bubbles:true}));
    await Promise.resolve();await Promise.resolve();
    expect(document.querySelectorAll('.player-hand')).toHaveLength(2);
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'2',bubbles:true}));
    await Promise.resolve();await Promise.resolve();
    expect(document.querySelector('.doubled-badge')).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'s',bubbles:true}));
    await Promise.resolve();await Promise.resolve();
    expect(button('new-round').disabled).toBe(false);
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'n',bubbles:true}));
    await Promise.resolve();await Promise.resolve();
    expect(button('deal').disabled).toBe(false);
    const bet=document.getElementById('bet');
    bet?.dispatchEvent(new KeyboardEvent('keydown',{key:'d',bubbles:true}));
    expect(document.querySelectorAll('.player-hand')).toHaveLength(0);
  });
  it('uses real localStorage with the required save key',async()=>{
    destroy=mountGame({store:new LocalStorageStore(),fresh:()=>createGame({cards:source}),reducedMotion:()=>true}).destroy;
    await click('deal');
    const saved=readSave(window.localStorage.getItem(SAVE_KEY) ?? '');
    expect(saved.ok && saved.state.bankroll).toBe(990);
  });
  it('shows storage failures while keeping the game playable',async()=>{
    const store=new MemoryStore();store.fail=true;
    destroy=mountGame({store,fresh:()=>createGame({cards:source}),reducedMotion:()=>true}).destroy;
    await click('deal');
    expect(document.getElementById('save-notice')?.textContent).toContain('Progress not saved');
    expect(button('stand').disabled).toBe(false);
  });
  it('adopts newer storage events and rejects stale clicks',async()=>{
    const store=new MemoryStore();
    const state=createGame({cards:source});
    destroy=mountGame({store,fresh:()=>state,reducedMotion:()=>true}).destroy;
    const newer=act(state,{type:'DEAL',bet:100});
    const raw=JSON.stringify({schemaVersion:1,savedAt:'now',state:newer});
    store.set(SAVE_KEY,raw);
    window.dispatchEvent(new StorageEvent('storage',{key:SAVE_KEY,newValue:raw}));
    expect(document.getElementById('bankroll')?.textContent).toBe('900');
    expect(button('deal').disabled).toBe(true);
    const result=applyAction(newer,{type:'SPLIT'});
    if(!result.ok) throw new Error(result.error);
    store.set(SAVE_KEY,JSON.stringify({schemaVersion:1,savedAt:'now',state:result.state}));
    await click('hit');
    expect(document.getElementById('save-notice')?.textContent).toContain('Another tab changed');
    expect(document.getElementById('bankroll')?.textContent).toBe('800');
    expect(document.querySelectorAll('.player-hand')).toHaveLength(2);
  });
  it('opens and closes accessible native rules and stats dialogs',async()=>{
    destroy=mountGame({store:new MemoryStore(),reducedMotion:()=>true}).destroy;
    await click('rules-open');
    expect(document.querySelector('#rules-dialog[open]')).not.toBeNull();
    expect(document.getElementById('rules-dialog')?.textContent).toContain('Split aces');
    await click('rules-close');
    expect(document.querySelector('#rules-dialog[open]')).toBeNull();
    await click('stats-open');
    expect(document.querySelector('#stats-dialog[open]')).not.toBeNull();
    await click('stats-close');
    expect(document.querySelector('#stats-dialog[open]')).toBeNull();
  });
  it('Space skips animation without dispatching another move',async()=>{
    const store=new MemoryStore();
    destroy=mountGame({store,fresh:()=>createGame({cards:source}),reducedMotion:()=>false,
      animate:()=>new Promise<void>(()=>{})}).destroy;
    button('deal').click();
    expect(button('stand').disabled).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true}));
    await vi.waitFor(()=>expect(button('stand').disabled).toBe(false),{timeout:100});
    expect(document.activeElement?.id).toBe('game-table');
    const saved=readSave(store.get(SAVE_KEY)??'');
    expect(saved.ok && saved.state.seq).toBe(1);
  });
  it('clears the unavailable notice after storage recovers',async()=>{
    const store=new MemoryStore();store.fail=true;
    destroy=mountGame({store,fresh:()=>createGame({cards:source}),reducedMotion:()=>true}).destroy;
    expect(document.getElementById('save-notice')?.textContent).toContain('Progress not saved');
    store.fail=false;
    await click('deal');
    expect(document.getElementById('save-notice')?.textContent).toBe('');
  });
});
