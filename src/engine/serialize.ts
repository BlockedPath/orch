import { assertInvariants } from './invariants';
import { RANKS, SUITS } from './types';
import type { GameState } from './types';

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);
const oneOf = (value: unknown, choices: readonly string[]) => choices.some((choice) => choice === value);
const list = (value: unknown, check: (item: unknown) => boolean, limit = 312): boolean => Array.isArray(value) && value.length <= limit && value.every(check);
function card(value: unknown): boolean {
  return record(value) && integer(value.id) && oneOf(value.rank, RANKS) && oneOf(value.suit, SUITS);
}
function hand(value: unknown): boolean {
  return record(value) && list(value.cards, card) && typeof value.isSplit === 'boolean';
}
function playerHand(value: unknown): boolean {
  return record(value) && hand(value) && integer(value.wager) && typeof value.splitAces === 'boolean'
    && typeof value.doubled === 'boolean' && oneOf(value.status, ['PENDING', 'ACTIVE', 'STOOD', 'BUST']);
}
function settlement(value: unknown): boolean {
  return record(value) && oneOf(value.outcome, ['BLACKJACK', 'WIN', 'PUSH', 'LOSS', 'BUST'])
    && ['handIndex', 'wager', 'profit', 'stakeReturned', 'winnings'].every((key) => integer(value[key]));
}
function round(value: unknown): boolean {
  return record(value) && ['baseBet', 'bankrollAtStart', 'shoeStart', 'activeHandIndex'].every((key) => integer(value[key]))
    && list(value.hands, playerHand, 4) && hand(value.dealer) && typeof value.holeRevealed === 'boolean'
    && (value.endReason === null || oneOf(value.endReason, ['DEALER_BLACKJACK', 'PLAYER_BLACKJACK', 'ALL_BUST', 'SHOWDOWN']))
    && (value.settlements === null || list(value.settlements, settlement, 4));
}

function isState(value: unknown): value is GameState {
  if (!record(value) || value.schemaVersion !== 1 || !integer(value.seq) || !integer(value.bankroll)
    || !(value.lastBet === null || integer(value.lastBet))) return false;
  if (!record(value.shoe) || !integer(value.shoe.position) || !list(value.shoe.cards, card)) return false;
  if (!record(value.rng) || !['a', 'b', 'c', 'd'].every((key) => record(value.rng) && integer(value.rng[key]))) return false;
  if (!record(value.stats) || !['rounds', 'hands', 'wins', 'losses', 'pushes', 'naturals', 'doubles', 'splits',
    'totalWagered', 'netProfit', 'biggestWin', 'peakBankroll', 'reloads'].every((key) => record(value.stats) && integer(value.stats[key]))) return false;
  return value.phase === 'BETTING' ? value.round === null
    : oneOf(value.phase, ['PLAYER_TURN', 'ROUND_OVER']) && round(value.round);
}

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export function deserialize(raw: string): { ok: true; state: GameState } | { ok: false; reason: string } {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isState(value)) return { ok: false, reason: 'Save format is invalid or unsupported.' };
    assertInvariants(value);
    return { ok: true, state: value };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'Invalid save.' };
  }
}
