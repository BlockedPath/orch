import { cardValue, evaluateHand } from './hand';
import { seedRng } from './prng';
import { CUT_CARD_POSITION, draw, shoeFromCards, shuffledShoe } from './shoe';
import type { Action, ActionResult, Card, ErrorCode, GameEvent, GameState, HandSettlement, PlayerHand, RoundState, Statistics } from './types';

export const STARTING_BANKROLL = 1000;
export const MIN_BET = 10;
export const MAX_BET = 500;

export function createGame(options: { cards?: readonly Card[]; seed?: number } = {}): GameState {
  const shuffled = shuffledShoe(seedRng(options.seed ?? 1));
  const stats: Statistics = { rounds: 0, hands: 0, wins: 0, losses: 0, pushes: 0, naturals: 0,
    doubles: 0, splits: 0, totalWagered: 0, netProfit: 0, biggestWin: 0, peakBankroll: 1000, reloads: 0 };
  return { schemaVersion: 1, seq: 0, phase: 'BETTING', round: null, bankroll: 1000, lastBet: null,
    shoe: options.cards ? shoeFromCards(options.cards) : shuffled.shoe, rng: shuffled.rng, stats };
}

export function maxBet(bankroll: number): number {
  return Math.min(MAX_BET, Math.floor(bankroll / 10) * 10);
}

export function validateBet(bet: unknown, bankroll: number): ErrorCode | null {
  if (typeof bet !== 'number' || !Number.isSafeInteger(bet) || bet < 10 || bet > 500 || bet % 10 !== 0) return 'INVALID_BET';
  return bet > bankroll ? 'INSUFFICIENT_FUNDS' : null;
}

export function getLegalActions(state: GameState) {
  const player = state.phase === 'PLAYER_TURN';
  const hand = state.round?.hands[state.round.activeHandIndex];
  const doubleReason: ErrorCode | null = !player ? 'ILLEGAL_PHASE'
    : !hand || hand.cards.length !== 2 || hand.splitAces ? 'CANNOT_DOUBLE'
    : state.bankroll < hand.wager ? 'INSUFFICIENT_FUNDS' : null;
  const splitReason: ErrorCode | null = !player ? 'ILLEGAL_PHASE'
    : !hand || hand.cards.length !== 2 || hand.splitAces ? 'CANNOT_SPLIT'
    : hand.cards[0]?.rank !== hand.cards[1]?.rank ? 'NOT_A_PAIR'
    : (state.round?.hands.length ?? 0) >= 4 ? 'MAX_HANDS'
    : state.bankroll < hand.wager ? 'INSUFFICIENT_FUNDS' : null;
  return {
    deal: state.phase === 'BETTING' && state.bankroll >= MIN_BET ? { min: MIN_BET, max: maxBet(state.bankroll), step: 10 } : null,
    hit: player, stand: player,
    double: { allowed: doubleReason === null, reason: doubleReason },
    split: { allowed: splitReason === null, reason: splitReason },
    newRound: state.phase === 'ROUND_OVER', reload: state.phase === 'BETTING' && state.bankroll < MIN_BET,
  };
}

function parseAction(input: unknown): Action | null {
  if (typeof input !== 'object' || input === null || !('type' in input)) return null;
  switch (input.type) {
    case 'DEAL': return { type: 'DEAL', bet: 'bet' in input && typeof input.bet === 'number' ? input.bet : NaN };
    case 'HIT': case 'STAND': case 'DOUBLE': case 'SPLIT': case 'NEW_ROUND': case 'RELOAD_BANKROLL': return { type: input.type };
    default: return null;
  }
}

function reject(state: GameState, error: ErrorCode): ActionResult {
  return { ok: false, state, events: [], error };
}

type WorkingRound = { -readonly [K in keyof RoundState]: RoundState[K] } & { hands: PlayerHand[] };

export function applyAction(state: GameState, input: unknown): ActionResult {
  const action = parseAction(input);
  if (!action) return reject(state, 'UNKNOWN_ACTION');
  const legal = getLegalActions(state);
  if (action.type === 'DEAL') {
    if (state.phase !== 'BETTING') return reject(state, 'ILLEGAL_PHASE');
    const error = validateBet(action.bet, state.bankroll);
    if (error) return reject(state, error);
  } else if (action.type === 'RELOAD_BANKROLL') {
    if (!legal.reload) return reject(state, 'RELOAD_NOT_ALLOWED');
  } else if (action.type === 'NEW_ROUND') {
    if (!legal.newRound) return reject(state, 'ILLEGAL_PHASE');
  } else {
    if (state.phase !== 'PLAYER_TURN') return reject(state, 'ILLEGAL_PHASE');
    if (action.type === 'DOUBLE' && legal.double.reason) return reject(state, legal.double.reason);
    if (action.type === 'SPLIT' && legal.split.reason) return reject(state, legal.split.reason);
  }
  const events: GameEvent[] = [];
  const seq = state.seq + 1;
  if (action.type === 'NEW_ROUND') {
    const shuffled = state.shoe.position >= CUT_CARD_POSITION ? shuffledShoe(state.rng) : { shoe: state.shoe, rng: state.rng };
    if (shuffled.shoe !== state.shoe) events.push({ type: 'SHUFFLED' });
    events.push({ type: 'PHASE', phase: 'BETTING' });
    return { ok: true, state: { ...state, ...shuffled, seq, phase: 'BETTING', round: null }, events };
  }
  if (action.type === 'RELOAD_BANKROLL') {
    return { ok: true, state: { ...state, seq, bankroll: 1000, stats: { ...state.stats, reloads: state.stats.reloads + 1,
      peakBankroll: Math.max(state.stats.peakBankroll, 1000) } }, events: [{ type: 'BANKROLL_RELOADED' }] };
  }
  let bankroll = state.bankroll;
  let shoe = state.shoe;
  let stats = { ...state.stats };
  const round: WorkingRound = state.round ? { ...state.round, hands: [...state.round.hands] } : {
    baseBet: action.type === 'DEAL' ? action.bet : 0, bankrollAtStart: state.bankroll, shoeStart: shoe.position,
    hands: [], activeHandIndex: 0, dealer: { cards: [], isSplit: false }, holeRevealed: false, endReason: null, settlements: null,
  };
  function drawCard(target: 'player' | 'dealer', handIndex: number, hole = false): Card {
    const dealt = draw(shoe);
    shoe = dealt.shoe;
    events.push(hole ? { type: 'HOLE_DEALT' } : { type: 'CARD_DEALT', target, handIndex, card: dealt.card });
    return dealt.card;
  }
  function takePlayerCard(index: number): void {
    const hand = round.hands[index];
    if (!hand) throw new Error('Invariant: missing player hand.');
    round.hands[index] = { ...hand, cards: [...hand.cards, drawCard('player', index)] };
  }
  function setStatus(index: number, status: PlayerHand['status']): void {
    const hand = round.hands[index];
    if (!hand) throw new Error('Invariant: missing player hand.');
    round.hands[index] = { ...hand, status };
  }
  function reveal(): void {
    if (round.holeRevealed) return;
    round.holeRevealed = true;
    const card = round.dealer.cards[1];
    if (!card) throw new Error('Invariant: missing hole card.');
    events.push({ type: 'HOLE_REVEALED', card });
  }
  function finish(): void {
    reveal();
    round.activeHandIndex = -1;
    const settlements = round.hands.map((hand, handIndex): HandSettlement => {
      const player = evaluateHand(hand);
      const dealer = evaluateHand(round.dealer);
      const outcome = dealer.isBlackjack ? player.isBlackjack ? 'PUSH' : 'LOSS'
        : player.isBlackjack ? 'BLACKJACK' : player.isBust ? 'BUST'
        : dealer.isBust || player.total > dealer.total ? 'WIN'
        : player.total === dealer.total ? 'PUSH' : 'LOSS';
      const winnings = outcome === 'BLACKJACK' ? hand.wager * 1.5 : outcome === 'WIN' ? hand.wager : 0;
      const stakeReturned = outcome === 'BLACKJACK' || outcome === 'WIN' || outcome === 'PUSH' ? hand.wager : 0;
      return { handIndex, outcome, wager: hand.wager, winnings, stakeReturned, profit: winnings + stakeReturned - hand.wager };
    });
    round.settlements = settlements;
    bankroll += settlements.reduce((sum, item) => sum + item.stakeReturned + item.winnings, 0);
    const net = settlements.reduce((sum, item) => sum + item.profit, 0);
    stats = { ...stats, rounds: stats.rounds + 1, hands: stats.hands + settlements.length,
      wins: stats.wins + settlements.filter((item) => item.outcome === 'WIN' || item.outcome === 'BLACKJACK').length,
      losses: stats.losses + settlements.filter((item) => item.outcome === 'LOSS' || item.outcome === 'BUST').length,
      pushes: stats.pushes + settlements.filter((item) => item.outcome === 'PUSH').length,
      naturals: stats.naturals + settlements.filter((item) => item.outcome === 'BLACKJACK').length,
      totalWagered: stats.totalWagered + settlements.reduce((sum, item) => sum + item.wager, 0),
      netProfit: stats.netProfit + net, biggestWin: Math.max(stats.biggestWin, net), peakBankroll: Math.max(stats.peakBankroll, bankroll) };
    events.push({ type: 'SETTLED', settlements }, { type: 'PHASE', phase: 'ROUND_OVER' });
  }
  function dealerTurn(): void {
    events.push({ type: 'PHASE', phase: 'DEALER_TURN' });
    reveal();
    const allBust = round.hands.every((hand) => evaluateHand(hand).isBust);
    round.endReason = allBust ? 'ALL_BUST' : 'SHOWDOWN';
    if (!allBust) {
      while (evaluateHand(round.dealer).total < 17) {
        round.dealer = { ...round.dealer, cards: [...round.dealer.cards, drawCard('dealer', -1)] };
      }
    }
    finish();
  }
  function activateFrom(start: number): void {
    for (let index = start; index < round.hands.length; index += 1) {
      let hand = round.hands[index];
      if (!hand) throw new Error('Invariant: missing player hand.');
      if (hand.cards.length === 1) { takePlayerCard(index); hand = round.hands[index]; }
      if (!hand) throw new Error('Invariant: missing player hand.');
      const value = evaluateHand(hand);
      if (hand.splitAces || value.total === 21 || value.isBust) {
        setStatus(index, value.isBust ? 'BUST' : 'STOOD');
        continue;
      }
      setStatus(index, 'ACTIVE');
      round.activeHandIndex = index;
      events.push({ type: 'PHASE', phase: 'PLAYER_TURN' });
      return;
    }
    dealerTurn();
  }
  if (action.type === 'DEAL') {
    bankroll -= action.bet;
    events.push({ type: 'PHASE', phase: 'DEALING' });
    const first = drawCard('player', 0);
    const up = drawCard('dealer', -1);
    const second = drawCard('player', 0);
    const hole = drawCard('dealer', -1, true);
    round.hands = [{ cards: [first, second], isSplit: false, splitAces: false, doubled: false, wager: action.bet, status: 'ACTIVE' }];
    round.dealer = { cards: [up, hole], isSplit: false };
    if (up.rank === 'A' || cardValue(up) === 10) events.push({ type: 'PHASE', phase: 'DEALER_PEEK' });
    if (evaluateHand(round.dealer).isBlackjack || evaluateHand(round.hands[0] ?? { cards: [], isSplit: false }).isBlackjack) {
      round.endReason = evaluateHand(round.dealer).isBlackjack ? 'DEALER_BLACKJACK' : 'PLAYER_BLACKJACK';
      setStatus(0, 'STOOD');
      finish();
    } else events.push({ type: 'PHASE', phase: 'PLAYER_TURN' });
  } else {
    const index = round.activeHandIndex;
    const hand = round.hands[index];
    if (!hand) throw new Error('Invariant: missing active hand.');
    switch (action.type) {
      case 'HIT': {
        takePlayerCard(index);
        const hit = round.hands[index];
        if (!hit) throw new Error('Invariant: missing hit hand.');
        const value = evaluateHand(hit);
        if (value.isBust || value.total === 21) {
          setStatus(index, value.isBust ? 'BUST' : 'STOOD');
          activateFrom(index + 1);
        }
        break;
      }
      case 'STAND': setStatus(index, 'STOOD'); activateFrom(index + 1); break;
      case 'DOUBLE':
        bankroll -= hand.wager;
        round.hands[index] = { ...hand, wager: hand.wager * 2, doubled: true };
        stats.doubles += 1;
        events.push({ type: 'DOUBLED' });
        takePlayerCard(index);
        setStatus(index, evaluateHand(round.hands[index] ?? hand).isBust ? 'BUST' : 'STOOD');
        activateFrom(index + 1);
        break;
      case 'SPLIT': {
        const first = hand.cards[0];
        const second = hand.cards[1];
        if (!first || !second) throw new Error('Invariant: split requires two cards.');
        bankroll -= hand.wager;
        const splitAces = first.rank === 'A';
        const common = { isSplit: true, splitAces, doubled: false, wager: round.baseBet, status: 'PENDING' } satisfies Omit<PlayerHand, 'cards'>;
        round.hands.splice(index, 1, { ...common, cards: [first] }, { ...common, cards: [second] });
        stats.splits += 1;
        events.push({ type: 'SPLIT' });
        activateFrom(index);
        break;
      }
    }
  }
  const phase = round.settlements ? 'ROUND_OVER' : 'PLAYER_TURN';
  return { ok: true, state: { ...state, seq, bankroll, shoe, stats, lastBet: round.baseBet, phase, round }, events };
}
