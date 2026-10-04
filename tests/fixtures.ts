import { applyAction, createGame } from '../src/engine/game';
import { canonicalCards } from '../src/engine/shoe';
import type { Action, Card, GameState, Rank, Suit } from '../src/engine/types';

// Deal order: player, dealer upcard, player, dealer hole, then draws.
export function cards(...ranks: Rank[]): Card[] {
  return stack(ranks.map((rank) => `${rank}S`));
}
export function stack(tokens: readonly string[]): Card[] {
  const pool = canonicalCards();
  const suits: Record<string, Suit> = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' };
  return tokens.map((token) => {
    const suit = suits[token.slice(-1)];
    const rank = token.slice(0, -1).replace('T', '10');
    const index = pool.findIndex((card) => card.rank === rank && card.suit === suit);
    const found = pool.splice(index, 1)[0];
    if (index < 0 || !found) throw new Error(`Invalid or exhausted fixture card: ${token}`);
    return found;
  });
}
export function act(state: GameState, action: Action): GameState {
  const result = applyAction(state, action);
  if (!result.ok) throw new Error(result.error);
  return result.state;
}
export function deal(source: readonly Card[], wager = 100, bankroll = 1000): GameState {
  return act({ ...createGame({ cards: source }), bankroll }, { type: 'DEAL', bet: wager });
}
export function requireRound(state: GameState) {
  if (state.phase === 'BETTING') throw new Error('Expected active or settled round.');
  return state.round;
}
export const fixtures = {
  natural: cards('A', '9', 'K', '7'), dealerNatural: cards('10', 'A', '9', 'K'),
  mutualNaturals: cards('A', 'K', 'Q', 'A'), soft17: cards('10', 'A', '8', '6', 'K'),
  playerBust: cards('10', '9', '6', '7', 'K'), dealerBust: cards('10', '6', '8', '9', 'K'),
  push: cards('10', '10', '8', '8'), loss: cards('10', '10', '7', '9'),
};
