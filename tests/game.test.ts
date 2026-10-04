import { describe, expect, it } from 'vitest';
import { applyAction, createGame, getLegalActions, maxBet, validateBet } from '../src/engine/game';
import { assertInvariants } from '../src/engine/invariants';
import { selectView } from '../src/engine/view';
import type { Action, GameState } from '../src/engine/types';
import { act, cards, deal, fixtures, requireRound, stack } from './fixtures';

const scenarios: [string, string[], Action[], number, number][] = [
  ['S1 natural', ['AS','9H','KD','7C'], [], 1150, 4],
  ['S2 mutual naturals', ['KS','AH','AD','QC'], [], 1000, 4],
  ['S3 dealer natural', ['KS','QH','QD','AC'], [], 900, 4],
  ['S4 dealer soft 20', ['10S','AH','7D','9C'], [{type:'STAND'}], 900, 4],
  ['S5 S17', ['10S','AH','8D','6C','5H'], [{type:'STAND'}], 1100, 4],
  ['S6 dealer bust', ['10S','10H','9D','6C','KH'], [{type:'STAND'}], 1100, 5],
  ['S7 player bust', ['10S','6H','6D','10C','9H'], [{type:'HIT'}], 900, 5],
  ['S8 auto-stand on 21', ['5S','9H','6D','7C','10H','2S'], [{type:'HIT'}], 1100, 6],
  ['S9 push', ['10S','10H','8D','8C'], [{type:'STAND'}], 1000, 4],
  ['S10 soft 17 after a draw', ['10S','2H','9D','AC','4D','5S'], [{type:'STAND'}], 1100, 5],
  ['S11 soft to hard', ['10S','5H','8D','AC','9H','3S'], [{type:'STAND'}], 1000, 6],
];
describe('Stage 1 scenarios through the Stage 2 API', () => {
  it.each(scenarios)('%s', (_name, source, actions, bankroll, position) => {
    let state = deal(stack(source));
    for (const action of actions) state = act(state, action);
    expect(state.phase).toBe('ROUND_OVER');
    expect(state.bankroll).toBe(bankroll);
    expect(state.shoe.position).toBe(position);
    assertInvariants(state);
  });
  it.each([
    [fixtures.natural, 'BLACKJACK', 150, 100, 1150],
    [fixtures.dealerNatural, 'LOSS', -100, 0, 900],
    [fixtures.mutualNaturals, 'PUSH', 0, 100, 1000],
  ])('separates natural profit and stake', (source, outcome, profit, stakeReturned, bankroll) => {
    const state = deal(source);
    expect(requireRound(state).settlements?.[0]).toMatchObject({ outcome, wager: 100, profit, stakeReturned });
    expect(state.bankroll).toBe(bankroll);
  });
  it('S25 pays exactly 15 profit on a 10-chip blackjack', () => {
    const state = deal(fixtures.natural, 10);
    expect(state.bankroll).toBe(1015);
    expect(requireRound(state).settlements?.[0]).toMatchObject({ profit: 15, stakeReturned: 10 });
    expect(maxBet(state.bankroll)).toBe(500);
  });
  it('hides the hole card in views and deal events, then reveals it at settlement', () => {
    const result = applyAction(createGame({ cards: fixtures.soft17 }), { type: 'DEAL', bet: 100 });
    if (!result.ok) throw new Error(result.error);
    expect(selectView(result.state).dealer.cards[1]).toEqual({ key: 'dealer-1', faceDown: true });
    expect(selectView(result.state).dealer.value?.total).toBe(11);
    expect(result.events.find((event) => event.type === 'HOLE_DEALT')).toEqual({ type: 'HOLE_DEALT' });
    const over = act(result.state, { type: 'STAND' });
    expect(selectView(over).dealer.cards.every((card) => !card.faceDown)).toBe(true);
    expect(selectView(over).dealer.value?.total).toBe(17);
  });
  it('peek occurs before the first player turn', () => {
    const result = applyAction(createGame({ cards: fixtures.soft17 }), { type: 'DEAL', bet: 100 });
    if (!result.ok) throw new Error(result.error);
    expect(result.events.filter((event) => event.type === 'PHASE').map((event) => event.phase)).toEqual(['DEALING','DEALER_PEEK','PLAYER_TURN']);
  });
  it.each([0, 5, 15, 505, 510, -10, 10.5, NaN, Infinity, '10'])('rejects malformed wager %s', (bet) => {
    expect(validateBet(bet, 1000)).toBe('INVALID_BET');
    expect(applyAction(createGame(), { type:'DEAL', bet }).ok).toBe(false);
  });
  it('S26 caps bets and reloads only below 10 in BETTING', () => {
    const state: GameState = { ...createGame(), bankroll: 45 };
    expect(maxBet(state.bankroll)).toBe(40);
    expect(applyAction(state, { type: 'DEAL', bet: 50 })).toMatchObject({ ok:false, error:'INSUFFICIENT_FUNDS' });
    const broke: GameState = { ...state, bankroll:5 };
    const reloaded = act(broke, {type:'RELOAD_BANKROLL'});
    expect(reloaded.bankroll).toBe(1000);
    expect(reloaded.stats.reloads).toBe(1);
    expect(getLegalActions(broke).deal).toBeNull();
    expect(applyAction({...state, bankroll:10}, {type:'RELOAD_BANKROLL'})).toMatchObject({error:'RELOAD_NOT_ALLOWED'});
  });
  it('reshuffles on NEW_ROUND at 234 and preserves the shoe at 233', () => {
    const over = deal(fixtures.natural);
    const below: GameState = {...over, shoe:{...over.shoe, position:233}};
    expect(act(below, {type:'NEW_ROUND'}).shoe).toBe(below.shoe);
    const cut: GameState = {...over, shoe:{...over.shoe, position:234}};
    const next = act(cut, {type:'NEW_ROUND'});
    expect(next.shoe.position).toBe(0);
    expect(next.shoe.cards).toHaveLength(312);
    expect(next.shoe).not.toBe(cut.shoe);
  });
  it('freezes inputs without breaking accepted or rejected transitions', () => {
    const state = deal(cards('10','9','5','8','2'));
    Object.freeze(state);
    Object.freeze(state.round);
    Object.freeze(state.shoe);
    if (state.round) for (const hand of state.round.hands) { Object.freeze(hand.cards); Object.freeze(hand); }
    const before = structuredClone(state);
    expect(act(state, {type:'HIT'}).shoe.position).toBe(5);
    expect(state).toEqual(before);
    const rejected = applyAction(state, {type:'DEAL',bet:100});
    expect(rejected.state).toBe(state);
    expect(rejected.events).toEqual([]);
  });
});
