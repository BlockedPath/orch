import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { applyAction, createGame, getLegalActions } from '../src/engine/game';
import { assertInvariants } from '../src/engine/invariants';
import { mulberry32, nextInt, seedRng } from '../src/engine/prng';
import { deserialize, serialize } from '../src/engine/serialize';
import { shuffledShoe } from '../src/engine/shoe';
import type { Action } from '../src/engine/types';
import { act } from './fixtures';

describe('purity, shuffle, and invariant verification', () => {
  it('keeps the engine independent of browser APIs and uncontrolled randomness', () => {
    for(const file of readdirSync('src/engine').filter((name)=>name.endsWith('.ts'))) {
      const source=readFileSync(`src/engine/${file}`,'utf8');
      expect(source).not.toMatch(/Math\.random|Date\b|performance\b|window\b|document\b|localStorage\b|crypto\b|from ['"].*(?:ui|persistence)/);
    }
  });
  it('has a stable seed golden shoe and uint32 rejection sampling', () => {
    expect(shuffledShoe(seedRng(42))).toEqual(shuffledShoe(seedRng(42)));
    expect(shuffledShoe(seedRng(42)).shoe.cards.slice(0,8).map((card)=>card.id)).toEqual([89,133,77,285,112,31,305,188]);
    const rejectionBoundaryRng={a:0xffffffff,b:0,c:0,d:0};
    expect(nextInt(rejectionBoundaryRng,3).value).toBe(1);
    expect(nextInt(rejectionBoundaryRng,3).rng.d).toBe(2);
  });
  it('20,000 seeded rounds preserve invariants and round-trip every accepted snapshot', () => {
    let state=createGame({seed:42});
    const random=mulberry32(93);
    let shuffles=0;
    let doubles=0;
    let splits=0;
    for(let round=0;round<20000;round+=1) {
      if(state.bankroll<10) state=act(state,{type:'RELOAD_BANKROLL'});
      state=act(state,{type:'DEAL',bet:10});
      let step=0;
      while(state.phase==='PLAYER_TURN') {
        if(step++>100) throw new Error('Round did not converge.');
        const legal=getLegalActions(state);
        const chosen=random();
        const action: Action=chosen<0.25 && legal.split.allowed ? {type:'SPLIT'}
          : chosen<0.5 && legal.double.allowed ? {type:'DOUBLE'}
          : chosen<0.7 ? {type:'HIT'} : {type:'STAND'};
        const rejected=applyAction(state,{type:'DEAL',bet:500});
        if(rejected.ok || rejected.state!==state || rejected.events.length) throw new Error('Illegal action changed state.');
        const before=serialize(state);
        const result=applyAction(state,action);
        const replay=applyAction(state,action);
        if(!result.ok || !replay.ok || serialize(result.state)!==serialize(replay.state)
          || JSON.stringify(result.events)!==JSON.stringify(replay.events)) throw new Error('Determinism failed.');
        if(serialize(state)!==before) throw new Error('Input mutated.');
        state=result.state;
        doubles+=action.type==='DOUBLE' ? 1 : 0;
        splits+=action.type==='SPLIT' ? 1 : 0;
        assertInvariants(state);
        const encoded=serialize(state);
        const loaded=deserialize(encoded);
        if(!loaded.ok || serialize(loaded.state)!==encoded) throw new Error('Snapshot round-trip failed.');
      }
      assertInvariants(state);
      const previous=state.shoe;
      state=act(state,{type:'NEW_ROUND'});
      if(previous.cards!==state.shoe.cards) shuffles+=1;
      assertInvariants(state);
    }
    expect(shuffles).toBeGreaterThan(0);
    expect(doubles).toBeGreaterThan(0);
    expect(splits).toBeGreaterThan(0);
    expect(state.stats.rounds).toBe(20000);
  },120000);
});
