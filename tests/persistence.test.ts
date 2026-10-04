import { describe, expect, it } from 'vitest';
import { createGame } from '../src/engine/game';
import { deserialize, serialize } from '../src/engine/serialize';
import { CORRUPT_KEY, MemoryStore, SAVE_KEY, SaveManager } from '../src/persistence/save';
import { act, deal, fixtures, stack } from './fixtures';

const source=stack(['8S','10H','8D','7C','3H','10D','9C']);
const envelope=(state: unknown) => JSON.stringify({schemaVersion:1,savedAt:'2026-10-04T00:00:00.000Z',state});

describe('exact resume and atomic persistence', () => {
  it('P1/P2 resumes S16 after split without losing bets or repeating payouts', () => {
    const store=new MemoryStore();
    const manager=new SaveManager(store,()=>createGame({cards:source}));
    const initial=manager.load().state;
    let state=act(initial,{type:'DEAL',bet:100});
    expect(manager.save(state).ok).toBe(true);
    state=act(state,{type:'SPLIT'});
    manager.save(state);
    const resumedManager=new SaveManager(store);
    const resumed=resumedManager.load();
    expect(resumed.kind).toBe('RESUMED');
    expect(resumed.state).toEqual(state);
    expect(resumed.state.bankroll).toBe(800);
    state=act(resumed.state,{type:'DOUBLE'});
    resumedManager.save(state);
    state=act(state,{type:'STAND'});
    resumedManager.save(state);
    expect(state.bankroll).toBe(1200);
    expect(new SaveManager(store).load().state).toEqual(state);
  });
  it('P3/P4 settled saves never pay out again on repeated loads', () => {
    const store=new MemoryStore();
    const manager=new SaveManager(store);
    manager.load();
    const over=deal(fixtures.natural);
    manager.save(over);
    for(let count=0; count<3; count+=1) {
      const loaded=new SaveManager(store).load().state;
      expect(loaded.bankroll).toBe(1150);
      expect(loaded.stats.rounds).toBe(1);
      expect(loaded).toEqual(over);
    }
  });
  it('P5 failed settlement write leaves the previous round resumable exactly once', () => {
    const store=new MemoryStore();
    const manager=new SaveManager(store);
    manager.load();
    const player=deal(stack(['10S','10H','8D','7C']));
    manager.save(player);
    const over=act(player,{type:'STAND'});
    store.fail=true;
    expect(manager.save(over)).toEqual({ok:false,reason:'UNAVAILABLE'});
    store.fail=false;
    const resumed=new SaveManager(store).load().state;
    expect(resumed).toEqual(player);
    expect(act(resumed,{type:'STAND'}).bankroll).toBe(1100);
  });
  it.each(['{not JSON', envelope({...createGame(),bankroll:-5}), envelope({...createGame(),schemaVersion:2}),
    JSON.stringify({schemaVersion:2,savedAt:'now',state:createGame()}),
    envelope({...createGame(),shoe:{...createGame().shoe,cards:Array(312).fill(createGame().shoe.cards[0])}}),
    envelope({...createGame(),stats:{}}), envelope({...createGame(),rng:{a:1}}),
  ])('P6/P7 backs up malformed saves and opens a playable table', (raw) => {
    const store=new MemoryStore();
    store.set(SAVE_KEY,raw);
    const loaded=new SaveManager(store).load();
    expect(loaded.kind).toBe('NEW');
    expect(loaded.notice).toContain('backed up');
    expect(loaded.state.bankroll).toBe(1000);
    expect(store.get(CORRUPT_KEY)).toBe(raw);
    expect(act(loaded.state,{type:'DEAL',bet:10}).bankroll).toBeLessThanOrEqual(1015);
  });
  it('rejects forged settlement amounts and stale hand totals on load', () => {
    const state=deal(fixtures.natural);
    const forged=JSON.parse(serialize(state));
    forged.round.settlements[0].winnings=100000;
    expect(deserialize(JSON.stringify(forged)).ok).toBe(false);
    forged.round=null;
    expect(deserialize(JSON.stringify(forged)).ok).toBe(false);
  });
  it('P8 storage unavailable never blocks play', () => {
    const store=new MemoryStore();
    store.fail=true;
    const manager=new SaveManager(store);
    const loaded=manager.load();
    expect(loaded.notice).toContain('Progress not saved');
    const state=act(loaded.state,{type:'DEAL',bet:100});
    expect(manager.save(state)).toEqual({ok:false,reason:'UNAVAILABLE'});
  });
  it('P9 detects stale tabs and preserves the newer stored state', () => {
    const store=new MemoryStore();
    const first=new SaveManager(store,()=>createGame({cards:source}));
    const initial=first.load().state;
    first.save(initial);
    const second=new SaveManager(store);
    const older=second.load().state;
    const newer=act(initial,{type:'DEAL',bet:100});
    first.save(newer);
    const result=second.save(act(older,{type:'DEAL',bet:200}));
    expect(result).toEqual({ok:false,reason:'STALE',current:newer});
    expect(new SaveManager(store).load().state).toEqual(newer);
  });
  it('P10 adopts a newer storage event and ignores older events', () => {
    const store=new MemoryStore();
    const manager=new SaveManager(store);
    const state=manager.load().state;
    manager.save(state);
    const newer=act(state,{type:'DEAL',bet:100});
    expect(manager.adopt(envelope(newer))).toEqual(newer);
    expect(manager.adopt(envelope(state))).toBeNull();
    expect(manager.adopt('broken')).toBeNull();
  });
});
