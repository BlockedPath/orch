export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
export type Rank = (typeof RANKS)[number];
export type Suit = (typeof SUITS)[number];
export type Card = Readonly<{ id: number; rank: Rank; suit: Suit }>;
export type Hand = Readonly<{ cards: readonly Card[]; isSplit: boolean }>;
export type Phase = 'BETTING' | 'DEALING' | 'DEALER_PEEK' | 'PLAYER_TURN' | 'DEALER_TURN' | 'ROUND_OVER';
export type Action = Readonly<{ type: 'DEAL'; bet: number }>
  | Readonly<{ type: 'HIT' | 'STAND' | 'DOUBLE' | 'SPLIT' | 'NEW_ROUND' | 'RELOAD_BANKROLL' }>;
export type Shoe = Readonly<{ cards: readonly Card[]; position: number }>;
export type Outcome = 'BLACKJACK' | 'WIN' | 'PUSH' | 'LOSS' | 'BUST';
export type HandSettlement = Readonly<{
  handIndex: number; outcome: Outcome; wager: number; profit: number; stakeReturned: number; winnings: number;
}>;
export type HandStatus = 'PENDING' | 'ACTIVE' | 'STOOD' | 'BUST';
export type PlayerHand = Hand & Readonly<{ wager: number; splitAces: boolean; doubled: boolean; status: HandStatus }>;
export type RoundState = Readonly<{
  baseBet: number; bankrollAtStart: number; shoeStart: number;
  hands: readonly PlayerHand[]; activeHandIndex: number; dealer: Hand; holeRevealed: boolean;
  endReason: 'DEALER_BLACKJACK' | 'PLAYER_BLACKJACK' | 'ALL_BUST' | 'SHOWDOWN' | null;
  settlements: readonly HandSettlement[] | null;
}>;
export type Statistics = Readonly<{
  rounds: number; hands: number; wins: number; losses: number; pushes: number; naturals: number;
  doubles: number; splits: number; totalWagered: number; netProfit: number; biggestWin: number;
  peakBankroll: number; reloads: number;
}>;
export type RngState = Readonly<{ a: number; b: number; c: number; d: number }>;
export type GameState = Readonly<{
  schemaVersion: 1; seq: number; bankroll: number; lastBet: number | null;
  shoe: Shoe; rng: RngState; stats: Statistics;
}> & (
  | Readonly<{ phase: 'BETTING'; round: null }>
  | Readonly<{ phase: 'PLAYER_TURN' | 'ROUND_OVER'; round: RoundState }>
);
export type ErrorCode = 'UNKNOWN_ACTION' | 'INVALID_BET' | 'INSUFFICIENT_FUNDS' | 'ILLEGAL_PHASE' | 'CANNOT_DOUBLE' | 'CANNOT_SPLIT' | 'NOT_A_PAIR' | 'MAX_HANDS' | 'RELOAD_NOT_ALLOWED';
export type GameEvent =
  | Readonly<{ type: 'PHASE'; phase: Phase }>
  | Readonly<{ type: 'CARD_DEALT'; target: 'player' | 'dealer'; handIndex: number; card: Card }>
  | Readonly<{ type: 'HOLE_DEALT' }>
  | Readonly<{ type: 'HOLE_REVEALED'; card: Card }>
  | Readonly<{ type: 'SETTLED'; settlements: readonly HandSettlement[] }>
  | Readonly<{ type: 'SHUFFLED' | 'SPLIT' | 'DOUBLED' | 'BANKROLL_RELOADED' }>;
export type ActionResult =
  | Readonly<{ ok: true; state: GameState; events: readonly GameEvent[] }>
  | Readonly<{ ok: false; state: GameState; events: readonly []; error: ErrorCode }>;
export type RandomSource = () => number;
