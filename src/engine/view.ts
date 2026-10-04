import { evaluateHand } from './hand';
import { getLegalActions, maxBet } from './game';
import { CUT_CARD_POSITION } from './shoe';
import type { Card, GameState } from './types';

export type CardView = Readonly<{ key: string; faceDown: true }>
  | Readonly<{ key: string; faceDown: false; card: Card }>;

export function selectView(state: GameState) {
  const round = state.round;
  const settlements = round?.settlements ?? [];
  const upcard = round?.dealer.cards[0];
  const dealerValue = round && (round.holeRevealed || !upcard
    ? evaluateHand(round.dealer) : evaluateHand({ cards: [upcard], isSplit: false }));
  return {
    phase: state.phase, bankroll: state.bankroll, lastBet: state.lastBet, maxBet: maxBet(state.bankroll),
    legal: getLegalActions(state), stats: state.stats,
    dealer: {
      cards: (round?.dealer.cards ?? []).map((card, index): CardView =>
        index === 1 && !round?.holeRevealed ? { key: 'dealer-1', faceDown: true }
          : { key: `dealer-${index}`, faceDown: false, card }),
      value: dealerValue || null, revealed: round?.holeRevealed ?? false,
    },
    hands: (round?.hands ?? []).map((hand, index) => ({
      cards: hand.cards.map((card): CardView => ({ key: `card-${card.id}`, faceDown: false, card })),
      value: evaluateHand(hand), wager: hand.wager, status: hand.status,
      isActive: state.phase === 'PLAYER_TURN' && index === round?.activeHandIndex,
      doubled: hand.doubled, splitAces: hand.splitAces, settlement: settlements[index] ?? null,
    })),
    roundSummary: settlements.length ? {
      profit: settlements.reduce((sum, item) => sum + item.profit, 0),
      stakeReturned: settlements.reduce((sum, item) => sum + item.stakeReturned, 0),
      outcomes: settlements.map((item) => item.outcome),
    } : null,
    shoe: { remaining: state.shoe.cards.length - state.shoe.position, cutReached: state.shoe.position >= CUT_CARD_POSITION,
      penetration: state.shoe.position / state.shoe.cards.length },
  };
}
export type TableView = ReturnType<typeof selectView>;
