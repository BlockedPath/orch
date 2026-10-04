import type { Card, Hand } from './types';

export function cardValue(card: Card): number {
  if (card.rank === 'A') return 1;
  if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') return 10;
  return Number(card.rank);
}

export function evaluateHand(hand: Hand): { total: number; isSoft: boolean; isBust: boolean; isBlackjack: boolean } {
  const lowTotal = hand.cards.reduce((total, card) => total + cardValue(card), 0);
  const isSoft = hand.cards.some((card) => card.rank === 'A') && lowTotal + 10 <= 21;
  const total = lowTotal + (isSoft ? 10 : 0);
  return {
    total,
    isSoft,
    isBust: total > 21,
    isBlackjack: total === 21 && hand.cards.length === 2 && !hand.isSplit,
  };
}
