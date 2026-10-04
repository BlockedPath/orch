import { describe, expect, it } from 'vitest';
import { applyAction, createGame, getLegalActions } from '../src/engine/game';
import { assertInvariants } from '../src/engine/invariants';
import type { Action } from '../src/engine/types';
import { act, cards, deal, requireRound, stack } from './fixtures';

const scenarios: [string, string[], Action[], number, number][] = [
  ['S12 double win', ['5S','6H','6D','10C','10H','9S'], [{type:'DOUBLE'}],1200,6],
  ['S13 double bust', ['10S','6H','2D','10C','KH'], [{type:'DOUBLE'}],800,5],
  ['E2 double loss', ['5S','6D','6H','10C','2S','5H'], [{type:'DOUBLE'}],800,6],
  ['E3 double push', ['5S','10D','6H','6C','9S','4H'], [{type:'DOUBLE'}],1000,6],
  ['S16 DAS mixed settlement', ['8S','10H','8D','7C','3H','10D','9C'], [{type:'SPLIT'},{type:'DOUBLE'},{type:'STAND'}],1200,7],
  ['S17 split ace 21 pays 1:1', ['AS','9H','AD','7C','KH','5D','QC'], [{type:'SPLIT'}],1200,7],
  ['S18 split aces cannot resplit', ['AS','9H','AD','7C','AH','5D','2C'], [{type:'SPLIT'}],800,7],
  ['S22 all bust, dealer never draws', ['8S','6H','8D','10C','10H','9S','10D','5C'], [{type:'SPLIT'},{type:'HIT'},{type:'HIT'}],800,8],
  ['F1 split two wins', ['8S','6D','8H','10C','10S','9H','7C'], [{type:'SPLIT'},{type:'STAND'},{type:'STAND'}],1200,7],
  ['F4 split tens auto-stand 21', ['10S','9D','10H','6C','AS','8H','KC'], [{type:'SPLIT'},{type:'STAND'}],1200,7],
];
describe('Double down, splits, and multi-hand settlement', () => {
  it.each(scenarios)('%s', (_name, source, actions, bankroll, position) => {
    let state = deal(stack(source));
    for (const action of actions) { state = act(state, action); assertInvariants(state); }
    expect(state.phase).toBe('ROUND_OVER');
    expect(state.bankroll).toBe(bankroll);
    expect(state.shoe.position).toBe(position);
    const round = requireRound(state);
    expect(round.settlements).toHaveLength(round.hands.length);
    for (const item of round.settlements ?? []) expect(item.profit).toBe(item.stakeReturned + item.winnings - item.wager);
  });
  it('S16 records exact per-hand results and statistics', () => {
    let state = deal(stack(['8S','10H','8D','7C','3H','10D','9C']));
    state = act(state, {type:'SPLIT'});
    expect(state.bankroll).toBe(800);
    expect(requireRound(state).hands.map((hand)=>hand.cards.length)).toEqual([2,1]);
    state = act(state, {type:'DOUBLE'});
    expect(state.bankroll).toBe(700);
    expect(requireRound(state).activeHandIndex).toBe(1);
    state = act(state, {type:'STAND'});
    expect(requireRound(state).settlements).toEqual([
      {handIndex:0,outcome:'WIN',wager:200,profit:200,stakeReturned:200,winnings:200},
      {handIndex:1,outcome:'PUSH',wager:100,profit:0,stakeReturned:100,winnings:0},
    ]);
    expect(state.stats).toMatchObject({rounds:1,hands:2,wins:1,pushes:1,doubles:1,splits:1,totalWagered:300,netProfit:200,biggestWin:200,peakBankroll:1200});
  });
  it('S19 resplits in sequence up to four hands and rejects a fifth', () => {
    let state = deal(stack(['8S','10H','8D','7C','8H','8C','8S','10S','10D','10C']));
    for (let count=0; count<3; count+=1) state=act(state,{type:'SPLIT'});
    expect(requireRound(state).hands).toHaveLength(4);
    const rejected=applyAction(state,{type:'SPLIT'});
    expect(rejected).toMatchObject({ok:false,error:'MAX_HANDS',events:[]});
    expect(rejected.state).toBe(state);
    for (let count=0; count<4; count+=1) { state=act(state,{type:'STAND'}); assertInvariants(state); }
    expect(state.bankroll).toBe(1200);
    expect(state.shoe.position).toBe(10);
    expect(requireRound(state).hands.map((hand)=>hand.cards.map((card)=>card.suit))).toEqual([
      ['spades','spades'],['clubs','spades'],['hearts','diamonds'],['diamonds','clubs'],
    ]);
  });
  it('S14 double requires the full extra wager and allows equality', () => {
    const source=cards('5','6','6','10','10','9');
    expect(getLegalActions(deal(source,100,200)).double.allowed).toBe(true);
    expect(applyAction(deal(source,100,150),{type:'DOUBLE'})).toMatchObject({error:'INSUFFICIENT_FUNDS'});
    const afterHit=act(deal(cards('5','10','6','7','2')),{type:'HIT'});
    expect(applyAction(afterHit,{type:'DOUBLE'})).toMatchObject({error:'CANNOT_DOUBLE'});
  });
  it('S20 split requires funds, including after DAS', () => {
    expect(applyAction(deal(cards('8','10','8','7','3'),100,150),{type:'SPLIT'})).toMatchObject({error:'INSUFFICIENT_FUNDS'});
    let state=deal(cards('8','10','8','7','3','10','8'),100,300);
    state=act(state,{type:'SPLIT'});
    state=act(state,{type:'DOUBLE'});
    expect(getLegalActions(state).split.reason).toBe('INSUFFICIENT_FUNDS');
  });
  it('S21 splits identical ranks, not equal card values', () => {
    expect(applyAction(deal(cards('K','9','Q','7')),{type:'SPLIT'})).toMatchObject({error:'NOT_A_PAIR'});
    for (const rank of ['K','10','Q','J'] as const) expect(getLegalActions(deal(cards(rank,'9',rank,'7'))).split.allowed).toBe(true);
  });
  it('a doubled 500-chip initial wager becomes 1000', () => {
    const over=act(deal(cards('5','6','6','10','10','9'),500),{type:'DOUBLE'});
    expect(requireRound(over).hands[0]?.wager).toBe(1000);
    expect(over.bankroll).toBe(2000);
  });
  it('G: guards every waiting phase and rejects malformed actions without mutations', () => {
    const betting=createGame();
    const player=deal(cards('5','10','6','7'));
    const over=act(player,{type:'STAND'});
    const actions: Action[]=[{type:'DEAL',bet:100},{type:'HIT'},{type:'STAND'},{type:'DOUBLE'},{type:'SPLIT'},{type:'NEW_ROUND'},{type:'RELOAD_BANKROLL'}];
    for(const state of [betting,player,over]) {
      const legal=getLegalActions(state);
      const allowed=[legal.deal!==null,legal.hit,legal.stand,legal.double.allowed,legal.split.allowed,legal.newRound,legal.reload];
      actions.forEach((action,index)=> {
        const result=applyAction(state,action);
        expect(result.ok).toBe(allowed[index]);
        if(!result.ok) {expect(result.state).toBe(state);expect(result.events).toEqual([]);}
      });
      for(const invalid of [null,undefined,{},'HIT',42,{type:'BOGUS'},{type:'hit'}]) {
        expect(applyAction(state,invalid)).toMatchObject({ok:false,error:'UNKNOWN_ACTION',events:[]});
      }
    }
  });
  it('G: repeated deal, stand, double, and settlement cannot replay deductions or payouts', () => {
    const state=deal(cards('5','10','6','7','10'));
    expect(applyAction(state,{type:'DEAL',bet:100}).ok).toBe(false);
    const over=act(state,{type:'DOUBLE'});
    for(const action of [{type:'DOUBLE'},{type:'STAND'},{type:'HIT'}]) {
      const rejected=applyAction(over,action);
      expect(rejected.state).toBe(over);
      expect(rejected.ok).toBe(false);
    }
    expect(over.stats.rounds).toBe(1);
  });
});
