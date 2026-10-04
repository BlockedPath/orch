import { evaluateHand } from './hand';
import { canonicalCards, CUT_CARD_POSITION } from './shoe';
import { validateBet } from './game';
import type { GameState } from './types';
import { InvariantError } from './errors';

function requireInvariant(condition: boolean, message: string): void {
  if (!condition) throw new InvariantError(message);
}
const nonnegative = (value: number) => Number.isSafeInteger(value) && value >= 0;

export function assertInvariants(state: GameState): void {
  requireInvariant(nonnegative(state.bankroll) && nonnegative(state.seq), 'Invalid bankroll or sequence.');
  requireInvariant(state.lastBet === null || validateBet(state.lastBet, 500) === null, 'Invalid last bet.');
  for (const value of Object.values(state.rng)) requireInvariant(nonnegative(value) && value <= 0xffffffff, 'Invalid RNG state.');
  requireInvariant(state.shoe.cards.length === 312 && nonnegative(state.shoe.position) && state.shoe.position <= 312, 'Invalid shoe size or position.');
  const canonical = canonicalCards();
  const seen = new Set<number>();
  for (const card of state.shoe.cards) {
    const expected = canonical[card.id];
    requireInvariant(Boolean(expected && card.rank === expected.rank && card.suit === expected.suit && !seen.has(card.id)), 'Invalid or duplicate physical card.');
    seen.add(card.id);
  }
  for (const [key, value] of Object.entries(state.stats)) {
    requireInvariant(Number.isSafeInteger(value) && (key === 'netProfit' || value >= 0), 'Invalid statistics.');
  }
  const stats = state.stats;
  requireInvariant(stats.hands === stats.wins + stats.losses + stats.pushes && stats.naturals <= stats.hands
    && stats.rounds <= stats.hands && stats.peakBankroll >= state.bankroll, 'Statistics totals disagree.');
  if (state.phase === 'BETTING') {
    requireInvariant(state.round === null && state.shoe.position < CUT_CARD_POSITION, 'Invalid betting state.');
    return;
  }
  const round = state.round;
  requireInvariant(round.hands.length >= 1 && round.hands.length <= 4, 'Invalid number of hands.');
  requireInvariant(validateBet(round.baseBet, round.bankrollAtStart) === null && nonnegative(round.bankrollAtStart), 'Invalid round wager.');
  requireInvariant(state.lastBet === round.baseBet && nonnegative(round.shoeStart) && round.shoeStart < CUT_CARD_POSITION, 'Invalid round start.');
  requireInvariant(round.dealer.cards.length >= 2 && !round.dealer.isSplit, 'Invalid dealer hand.');
  const initialPlayer = state.shoe.cards[round.shoeStart];
  const secondPlayer = state.shoe.cards[round.shoeStart + 2];
  requireInvariant(round.dealer.cards[0]?.id === state.shoe.cards[round.shoeStart + 1]?.id
    && round.dealer.cards[1]?.id === state.shoe.cards[round.shoeStart + 3]?.id
    && round.hands[0]?.cards[0]?.id === initialPlayer?.id, 'Opening deal order disagrees.');
  requireInvariant(round.hands.length === 1 ? round.hands[0]?.cards[1]?.id === secondPlayer?.id
    : initialPlayer?.rank === secondPlayer?.rank, 'Invalid initial player hand.');
  const table = [...round.hands.flatMap((hand) => hand.cards), ...round.dealer.cards];
  const dealt = state.shoe.cards.slice(round.shoeStart, state.shoe.position);
  requireInvariant(table.length === dealt.length && new Set(table.map((card) => card.id)).size === table.length, 'Table card count disagrees.');
  for (const card of table) {
    const expected = dealt.find((item) => item.id === card.id);
    requireInvariant(Boolean(expected && card.rank === expected.rank && card.suit === expected.suit), 'Table cards disagree with shoe.');
  }
  const wager = round.hands.reduce((sum, hand) => sum + hand.wager, 0);
  for (const hand of round.hands) {
    requireInvariant(hand.status === 'PENDING' ? hand.cards.length === 1 : hand.cards.length >= 2, 'Invalid hand card count.');
    requireInvariant(hand.isSplit === (round.hands.length > 1), 'Invalid split flag.');
    requireInvariant(hand.wager === round.baseBet * (hand.doubled ? 2 : 1), 'Invalid hand wager.');
    requireInvariant(!hand.doubled || (hand.cards.length === 3 && (hand.status === 'STOOD' || hand.status === 'BUST')), 'Invalid doubled hand.');
    requireInvariant(!hand.isSplit || hand.cards[0]?.rank === initialPlayer?.rank, 'Split rank disagrees with opening pair.');
    requireInvariant(hand.splitAces === (hand.isSplit && initialPlayer?.rank === 'A'), 'Invalid split-ace provenance.');
    requireInvariant(!hand.splitAces || (round.hands.length === 2 && hand.cards.length === 2
      && !hand.doubled && hand.status === 'STOOD'), 'Invalid split aces.');
    requireInvariant(hand.status === 'BUST' ? evaluateHand(hand).isBust : !evaluateHand(hand).isBust, 'Hand status disagrees with total.');
    for (let length = 2; length < hand.cards.length; length += 1) {
      requireInvariant(evaluateHand({ ...hand, cards: hand.cards.slice(0, length) }).total < 21, 'Player drew after an auto-resolved total.');
    }
  }
  requireInvariant(stats.doubles >= round.hands.filter((hand) => hand.doubled).length
    && stats.splits >= round.hands.length - 1 && stats.peakBankroll >= round.bankrollAtStart, 'Round statistics disagree.');
  if (state.phase === 'PLAYER_TURN') {
    requireInvariant(!round.holeRevealed && round.dealer.cards.length === 2 && round.settlements === null
      && round.endReason === null && !evaluateHand(round.dealer).isBlackjack, 'Invalid player phase.');
    requireInvariant(state.bankroll === round.bankrollAtStart - wager, 'Player bankroll disagrees with stakes.');
    round.hands.forEach((hand, index) => {
      const valid = index < round.activeHandIndex ? hand.status === 'STOOD' || hand.status === 'BUST'
        : index === round.activeHandIndex ? hand.status === 'ACTIVE' && hand.cards.length >= 2
          && !hand.doubled && !hand.splitAces && evaluateHand(hand).total < 21
        : hand.status === 'PENDING' && hand.cards.length === 1;
      requireInvariant(valid, 'Invalid active hand sequence.');
    });
    requireInvariant(round.activeHandIndex >= 0 && round.activeHandIndex < round.hands.length, 'Invalid active index.');
    return;
  }
  const settlements = round.settlements;
  requireInvariant(round.holeRevealed && round.activeHandIndex === -1 && Boolean(settlements && settlements.length === round.hands.length), 'Invalid round settlement.');
  if (!settlements) throw new InvariantError('Missing settlements.');
  requireInvariant(round.hands.every((hand) => hand.status === 'STOOD' || hand.status === 'BUST'), 'Unresolved hand at settlement.');
  settlements.forEach((item, index) => {
    const hand = round.hands[index];
    if (!hand) throw new InvariantError('Missing settlement hand.');
    const player = evaluateHand(hand);
    const dealer = evaluateHand(round.dealer);
    const outcome = dealer.isBlackjack ? player.isBlackjack ? 'PUSH' : 'LOSS'
      : player.isBlackjack ? 'BLACKJACK' : player.isBust ? 'BUST'
      : dealer.isBust || player.total > dealer.total ? 'WIN' : player.total === dealer.total ? 'PUSH' : 'LOSS';
    const winnings = outcome === 'BLACKJACK' ? hand.wager * 1.5 : outcome === 'WIN' ? hand.wager : 0;
    const stake = ['BLACKJACK', 'WIN', 'PUSH'].includes(outcome) ? hand.wager : 0;
    requireInvariant(item.handIndex === index && item.outcome === outcome && item.wager === hand.wager && item.winnings === winnings
      && item.stakeReturned === stake && item.profit === winnings + stake - hand.wager, 'Settlement accounting disagrees.');
  });
  requireInvariant(state.bankroll === round.bankrollAtStart - wager + settlements.reduce((sum, item) => sum + item.stakeReturned + item.winnings, 0), 'Settled bankroll disagrees.');
  const dealer = evaluateHand(round.dealer);
  const expectedEnd = dealer.isBlackjack ? 'DEALER_BLACKJACK'
    : round.hands.some((hand) => evaluateHand(hand).isBlackjack) ? 'PLAYER_BLACKJACK'
    : round.hands.every((hand) => evaluateHand(hand).isBust) ? 'ALL_BUST' : 'SHOWDOWN';
  requireInvariant(round.endReason === expectedEnd, 'Round end reason disagrees.');
  requireInvariant(stats.rounds >= 1 && stats.hands >= round.hands.length && stats.totalWagered >= wager
    && stats.wins >= settlements.filter((item) => item.outcome === 'WIN' || item.outcome === 'BLACKJACK').length
    && stats.losses >= settlements.filter((item) => item.outcome === 'LOSS' || item.outcome === 'BUST').length
    && stats.pushes >= settlements.filter((item) => item.outcome === 'PUSH').length
    && stats.naturals >= round.hands.filter((hand) => evaluateHand(hand).isBlackjack).length, 'Settled statistics disagree.');
  if (round.endReason === 'SHOWDOWN') {
    requireInvariant(dealer.total >= 17, 'Dealer stopped below 17.');
    for (let length = 2; length < round.dealer.cards.length; length += 1) {
      requireInvariant(evaluateHand({ cards: round.dealer.cards.slice(0, length), isSplit: false }).total < 17, 'Dealer drew on 17 or above.');
    }
  } else {
    requireInvariant(round.dealer.cards.length === 2, 'Unexpected dealer draw.');
    requireInvariant(round.endReason === 'ALL_BUST' ? round.hands.every((hand) => evaluateHand(hand).isBust)
      : round.endReason === 'DEALER_BLACKJACK' ? dealer.isBlackjack
      : round.endReason === 'PLAYER_BLACKJACK' && round.hands.some((hand) => evaluateHand(hand).isBlackjack), 'Invalid round end reason.');
  }
}
