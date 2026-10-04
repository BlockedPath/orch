import { describe, expect, it } from 'vitest';
import { createGame, getLegalActions } from '../src/engine/game';
import { deserialize, serialize } from '../src/engine/serialize';
import { draw } from '../src/engine/shoe';
import type { Action, GameState } from '../src/engine/types';
import { CORRUPT_KEY, MemoryStore, SAVE_KEY, SaveManager } from '../src/persistence/save';
import { act, cards, deal, requireRound } from './fixtures';

function activeDoubled(): GameState {
  const state=deal(cards('5','9','6','7','2','4'));
  const round=requireRound(state);
  const hand=round.hands[0];
  if(!hand) throw new Error('Missing fixture hand');
  const dealt=draw(state.shoe);
  return {...state,phase:'PLAYER_TURN',bankroll:800,shoe:dealt.shoe,stats:{...state.stats,doubles:1},round:{...round,
    hands:[{...hand,cards:[...hand.cards,dealt.card],doubled:true,wager:200}]}};
}
function activeAce(stripFlag=false): GameState {
  const state=act(deal(cards('A','10','A','7','A','5')),{type:'SPLIT'});
  const round=requireRound(state);
  return {...state,phase:'PLAYER_TURN',bankroll:800,stats:{...createGame().stats,splits:1},round:{...round,
    activeHandIndex:1,holeRevealed:false,endReason:null,settlements:null,
    hands:round.hands.map((hand,index)=>index===1 ? {...hand,status:'ACTIVE',splitAces:!stripFlag} : hand)}};
}
function unfinishedNatural(dealer: boolean): GameState {
  const state=deal(dealer ? cards('5','A','6','K','2') : cards('A','9','K','7','2'));
  const round=requireRound(state);
  const hand=round.hands[0];
  if(!hand) throw new Error('Missing fixture hand');
  const dealt=draw(state.shoe);
  return {...state,phase:'PLAYER_TURN',bankroll:900,stats:createGame().stats,
    shoe:dealer ? state.shoe : dealt.shoe,round:{...round,activeHandIndex:0,holeRevealed:false,endReason:null,settlements:null,
      hands:[{...hand,status:'ACTIVE',cards:dealer ? hand.cards : [...hand.cards,dealt.card]}]}};
}
const envelope=(state:GameState)=>JSON.stringify({schemaVersion:1,savedAt:'now',state});

describe('review regressions: reachable saved states',()=>{
  it.each([
    ['active doubled hand',activeDoubled()],
    ['active split ace',activeAce()],
    ['missing split-ace flag',activeAce(true)],
    ['unresolved dealer blackjack',unfinishedNatural(true)],
    ['hit after initial player natural',unfinishedNatural(false)],
  ])('quarantines %s at the initial load',(_name,state)=>{
    const raw=envelope(state);
    const store=new MemoryStore();store.set(SAVE_KEY,raw);
    const loaded=new SaveManager(store).load();
    expect(loaded.kind).toBe('NEW');
    expect(store.get(CORRUPT_KEY)).toBe(raw);
    expect(deserialize(serialize(state)).ok).toBe(false);
  });
  it('refuses to overwrite a valid save with an invalid successor',()=>{
    const store=new MemoryStore();const manager=new SaveManager(store);
    const state=manager.load().state;manager.save(state);
    const before=store.get(SAVE_KEY);
    expect(manager.save(activeDoubled())).toMatchObject({ok:false,reason:'INVALID_STATE'});
    expect(store.get(SAVE_KEY)).toBe(before);
  });
  it.each(['unsupported schema','missing RNG field'])('refuses outgoing %s without replacing valid bytes',(kind)=>{
    const store=new MemoryStore();const manager=new SaveManager(store);
    const state=manager.load().state;manager.save(state);
    const before=store.get(SAVE_KEY);
    const raw=kind==='unsupported schema' ? serialize(state).replace('"schemaVersion":1','"schemaVersion":2')
      : serialize(state).replace(/"a":\d+,/,'');
    const invalid: unknown=JSON.parse(raw);
    expect(deserialize(raw).ok).toBe(false);
    expect(Reflect.apply(manager.save,manager,[invalid])).toEqual({ok:false,reason:'INVALID_STATE'});
    expect(store.get(SAVE_KEY)).toBe(before);
  });
  it.each(['removed','corrupted'])('recovers a %s save key without losing the in-memory table',(mode)=>{
    const store=new MemoryStore();const manager=new SaveManager(store);
    const state=manager.load().state;manager.save(state);
    if(mode==='removed') store.remove(SAVE_KEY);else store.set(SAVE_KEY,'corrupted bytes');
    const next=act(state,{type:'DEAL',bet:10});
    expect(manager.save(next).ok).toBe(true);
    expect(new SaveManager(store).load().state).toEqual(next);
    if(mode==='corrupted') expect(store.get(CORRUPT_KEY)).toBe('corrupted bytes');
  });
  it('retains a valid mid-split snapshot and every legal successor remains reloadable',()=>{
    const state=act(deal(cards('8','10','8','7','3','10','9')),{type:'SPLIT'});
    const loaded=deserialize(serialize(state));
    if(!loaded.ok) throw new Error(loaded.reason);
    expect(loaded.state).toEqual(state);
    const legal=getLegalActions(loaded.state);
    const actions: Action[]=[{type:'HIT'},{type:'STAND'}];
    if(legal.double.allowed) actions.push({type:'DOUBLE'});
    for(const action of actions) {
      const result=deserialize(serialize(act(loaded.state,action)));
      expect(result.ok).toBe(true);
    }
  });
  it('can retry a failed set without repeating settlement',()=>{
    class SetFailureStore extends MemoryStore {
      failSet=false;
      override set(key:string,value:string):void {
        if(this.failSet) throw new Error('Write failed');
        super.set(key,value);
      }
    }
    const store=new SetFailureStore();const manager=new SaveManager(store);
    manager.load();const player=deal(cards('10','10','8','7'));manager.save(player);
    const over=act(player,{type:'STAND'});
    store.failSet=true;expect(manager.save(over)).toEqual({ok:false,reason:'UNAVAILABLE'});
    store.failSet=false;expect(manager.save(over)).toEqual({ok:true});
    expect(new SaveManager(store).load().state).toEqual(over);
    expect(over.bankroll).toBe(1100);
  });
});
