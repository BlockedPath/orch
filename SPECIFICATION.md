  files:
  - src/engine/** imports nothing from ui/ or
    persistence/.
  - src/engine/** never uses Math.random, Date,
    performance, window, document, localStorage or
    crypto.
  - The engine never mutates its input. It is total:
    bad input comes back as an error value. It throws
    only InvariantError, which means a bug.
  - The UI never works out game rules itself. It
    renders selectView(state) and the event payloads,
    which already carry computed totals.

  Controller flow, one action:
  1. If animating, ignore the input.
  2. r = applyAction(state, action). If !r.ok, show a
     toast; this shouldn't happen, because buttons are
     enabled from getLegalActions.
  3. saveManager.save(r.state), synchronously, before
     any animation.
  4. If the save result is STALE, adopt result.current,
     re-render, show a notice and drop the local
     transition.
  5. Set state = r.state, run animator.play(r.events),
     then renderer.render(selectView(state)) to make
     the DOM match the final state.

  2. House rules (formal)

  ID: R1
  Rule: 6 decks = 312 cards (24 of each rank).
  Fisher-Yates shuffle with an unbiased RNG.
  Clarification / precise behavior: for i=n-1..1:
  j=nextInt(i+1);  swap(i,j). nextInt uses rejection
  sampling on uint32. PRNG is sfc32 with a 128-bit
  state that is saved with the game. Production seed
  comes from crypto.getRandomValues, outside the
  engine.
  ────────────────────────────────────────
  ID: R2
  Rule: Cut card at index 234 (75%).
  Clarification / precise behavior: C7: reshuffle all
  312 cards in NEW_ROUND when position ≥ 234, never
  mid-round. A round may deal past the cut card.
  createGame does the first shuffle. No burn card.
  ────────────────────────────────────────
  ID: R3
  Rule: Starting bankroll is 1000.
  Clarification / precise behavior:
  ────────────────────────────────────────
  ID: R4
  Rule: Bet: an integer, a multiple of 10, 10 ≤ bet ≤
  500, bet ≤ bankroll.
  Clarification / precise behavior: maxBet = min(500,
  floor(bankroll/10)*10). Error order: INVALID_BET
  (type/range/step) is checked before
  INSUFFICIENT_FUNDS. The bet is taken from the
  bankroll at DEAL.
  ────────────────────────────────────────
  ID: R5
  Rule: Hand value
  Clarification / precise behavior: hard = sum with
  aces
  as 1. soft = has an ace and hard+10 ≤  21. best =
  soft ?  hard+10 : hard. bust = hard > 21.
  ────────────────────────────────────────
  ID: R6
  Rule: Dealer stands on all 17s, including soft 17.
  Clarification / precise behavior: The dealer draws
  while best < 17, so A-6 and A-2-4 both stand.
  ────────────────────────────────────────
  ID: R7
  Rule: Hole card stays hidden until player hands are
  resolved.
  Clarification / precise behavior: C6: revealed when
  DEALER_TURN starts, or when the round ends at the
  peek or on a player natural. It is always hidden in
  PLAYER_TURN and always revealed in ROUND_OVER.
  ────────────────────────────────────────
  ID: R8
  Rule: Dealer peeks when the upcard is A or 10/J/Q/K,
  before any player action.
  Clarification / precise behavior: No insurance
  prompt.
  With a 2–9 upcard there is no peek (F4).
  ────────────────────────────────────────
  ID: R9
  Rule: Natural = an unsplit two-card A + 10-value.
  Pays
  3:2. Two naturals push. A dealer natural beats every
   other player hand.
  Clarification / precise behavior: The player's
  natural
  is settled right away without the dealer drawing,
  after the peek if there is one.
  ────────────────────────────────────────
  ID: R10
  Rule: Win pays 1:1. Push returns the stake. Loss
  forfeits it.
  Clarification / precise behavior: Each hand records
  stakeReturned (0 or the wager), winnings (0, the
  wager, or wager×3/2) and net. Bankroll is credited
  stakeReturned +  winnings.
  ────────────────────────────────────────
  ID: R11
  Rule: Actions
  Clarification / precise behavior: DEAL{bet}, HIT,
  STAND, DOUBLE, SPLIT, NEW_ROUND, RELOAD_BANKROLL.
  ────────────────────────────────────────
  ID: R12
  Rule: Double down
  Clarification / precise behavior: Only on exactly 2
  cards, any hard or soft total, including split
  non-ace hands. Requires bankroll ≥  hand.wager (no
  doubling for less). The wager doubles, exactly one
  card is dealt, and the hand stands automatically.
  C1:  the 500 table max  applies only to the  initial
   bet, so a doubled 500 bet carries 1000.
  ────────────────────────────────────────
  ID: R13
  Rule: Split
  Clarification / precise behavior: C9: identical rank
  only (K-K yes, K-Q no). Requires hands.length < 4
  and bankroll ≥ baseBet. C3: the new hand is inserted
   at i+1, to the right, and is played next. C4: the
  current hand gets its 2nd card immediately; a
  split-off hand gets its 2nd card when it becomes
  active. Non-aces may be resplit up to 4 hands.
  ────────────────────────────────────────
  ID: R14
  Rule: Split aces
  Clarification / precise behavior: Each ace gets
  exactly one card and stands automatically. No hit,
  double or resplit. C5: split aces always make
  exactly 2 hands.
  ────────────────────────────────────────
  ID: R15
  Rule: 21 on a split hand is an ordinary 21.
  Clarification / precise behavior: Pays 1:1. fromSplit

  hands are never naturals.
  ────────────────────────────────────────
  ID: R16
  Rule: Insurance, even money, surrender and side bets
  are left out.
  Clarification / precise behavior: Explained in the
  rules panel.
  ────────────────────────────────────────
  ID: R17
  Rule: Reload
  Clarification / precise behavior: C2: "empty" means
  bankroll < 10. Allowed only in BETTING. Sets the
  bankroll to 1000 (any remainder under 10 is dropped)
   and increments stats.reloads. Other stats are kept.
  ────────────────────────────────────────
  ID: R18
  Rule: Persistence
  Clarification / precise behavior: One snapshot per
  accepted action, saved before animation, resumed
  exactly (§5).
  ────────────────────────────────────────
  ID: R19
  Rule: C8 (design choice): a hand with best === 21
  stands automatically.
  Clarification / precise behavior: Hitting 21 can
  never
  do better than standing, so this only removes a
  pointless option. It also guarantees an active hand
  always has best ≤ 20.
  ────────────────────────────────────────
  ID: R20
  Rule: A player bust loses even if the dealer busts
  later. If every player hand busts, the dealer
  reveals the hole card but draws nothing.
  Clarification / precise behavior:

  3. State machine

  Waiting phases (saved, and the only ones that accept
  input): BETTING, PLAYER_TURN, ROUND_OVER.
  Pass-through phases (only exist inside one
  applyAction call, emitted as PHASE events): DEALING,
  DEALER_PEEK, DEALER_TURN, SETTLEMENT.

              RELOAD_BANKROLL (bankroll<10)
                 ┌──────┐
                 ▼      │
  NEW_ROUND ─▶ BETTING ─┘
   (reshuffle    │ DEAL{bet}
    if pos≥234)  ▼
              DEALING ──upcard A/10──▶ DEALER_PEEK
                 │ upcard 2–9               │
                 ├──────────────────────────┤
                 │ dealer BJ, or player natural →
  SETTLEMENT → ROUND_OVER
                 ▼ otherwise
            PLAYER_TURN ◀── HIT / STAND / DOUBLE /
  SPLIT (another hand still to play)
                 │ all hands STOOD/BUST
                 ▼
            DEALER_TURN (reveal hole; draw to ≥17
  unless all hands bust)
                 ▼
            SETTLEMENT ─▶ ROUND_OVER ── NEW_ROUND ─▶
  BETTING

  Transitions and checks:

  From: BETTING
  Action: DEAL{bet}
  Check (first failing error wins): INVALID_BET →
  INSUFFICIENT_FUNDS
  Result: PLAYER_TURN or ROUND_OVER
  ────────────────────────────────────────
  From: BETTING
  Action: RELOAD_BANKROLL
  Check (first failing error wins): bankroll < 10, else

  RELOAD_NOT_ALLOWED
  Result: BETTING
  ────────────────────────────────────────
  From: PLAYER_TURN
  Action: HIT, STAND
  Check (first failing error wins): always legal on the

  active hand
  Result: PLAYER_TURN / ROUND_OVER
  ────────────────────────────────────────
  From: PLAYER_TURN
  Action: DOUBLE
  Check (first failing error wins): cards.length===2,
  else CANNOT_DOUBLE → INSUFFICIENT_FUNDS
  Result: PLAYER_TURN / ROUND_OVER
  ────────────────────────────────────────
  From: PLAYER_TURN
  Action: SPLIT
  Check (first failing error wins): cards.length===2,
  else CANNOT_SPLIT → NOT_A_PAIR → MAX_HANDS →
  INSUFFICIENT_FUNDS
  Result: PLAYER_TURN / ROUND_OVER
  ────────────────────────────────────────
  From: ROUND_OVER
  Action: NEW_ROUND
  Check (first failing error wins): —
  Result: BETTING
  ────────────────────────────────────────
  From: any
  Action: an action not listed for that phase
  Check (first failing error wins): ILLEGAL_PHASE
  Result: unchanged
  ────────────────────────────────────────
  From: any
  Action: malformed or unknown type
  Check (first failing error wins): UNKNOWN_ACTION
  Result: unchanged

  Strict rejection: a rejected action returns
  {ok:false, state: <same reference>, error} with no
  events and no change. getLegalActions and applyAction
  must call the same check functions.

  Algorithms:
  - DEAL:
    a. Take the bet from the bankroll.
    b. Deal P1, dealer up, P2, dealer hole (face down).
    c. If the upcard is A or 10-value: peek, set
       peeked=true.
    d. Dealer blackjack: reveal, settle as
       natural(hand0) ? PUSH : LOSE,
       endReason=DEALER_BLACKJACK.
    e. Else, player natural: reveal, settle BLACKJACK,
       endReason=PLAYER_BLACKJACK.
    f. Else: activateFrom(0).
  - activateFrom(i): for each hand from idx=i:
    - If it has 1 card, draw one.
    - If splitAces, mark it STOOD (SPLIT_ACES) and
      continue.
    - If best===21, mark it STOOD (TWENTY_ONE) and
      continue.
    - Otherwise mark it ACTIVE, set activeHandIndex=idx
      and return PLAYER_TURN.
    - If no hand is left, go to dealerTurn().
    - A two-card hand can't bust (A-A = soft 12).
  - HIT: draw. Bust → BUST, activateFrom(i+1). 21 →
    STOOD, activateFrom(i+1). Otherwise stay on the
    hand.
  - STAND: STOOD, then activateFrom(i+1).
  - DOUBLE: bankroll -= wager; wager *= 2; doubled =
    true. Draw 1. Mark BUST or STOOD (DOUBLED). Then
    activateFrom(i+1).
  - SPLIT: bankroll -= baseBet. The current hand
    becomes [c1]. Insert {cards:[c2], wager: baseBet,
    PENDING} at i+1. Both hands get fromSplit=true and
    splitAces = (rank==='A'). Then activateFrom(i).
  - dealerTurn: reveal the hole card. If any hand is
    not BUST, draw while best < 17. endReason =
    ALL_BUST or SHOWDOWN. Then settle().
  - settleHand: in this order:
    a. DEALER_BLACKJACK → PUSH if the player has a
       natural, else LOSE.
    b. PLAYER_BLACKJACK → BLACKJACK.
    c. Player bust → LOSE.
    d. Dealer bust → WIN.
    e. Compare best.
    - After that: credit the bankroll, update stats,
      store settlements, set phase ROUND_OVER.
  - NEW_ROUND: set round=null. If position ≥ 234,
    reshuffle (position=0, shuffleCount++, SHUFFLED
    event).

  4. Module design and interfaces

  src/engine/  types.ts rules.ts rng.ts cards.ts
  shoe.ts hand.ts legality.ts reducer.ts
               dealer.ts settlement.ts stats.ts
  invariants.ts view.ts serialize.ts index.ts
  src/persistence/  storage.ts saveManager.ts
  src/ui/  controller.ts input.ts animation.ts a11y.ts
  render/{table,hand,card,controls,panels}.ts
  styles/*.css
  src/main.ts
  tests/engine/*.test.ts tests/persistence/*.test.ts
  tests/ui/*.test.ts (jsdom) tests/fixtures/stack.ts

  // rules.ts
  export const RULES = { DECKS: 6, SHOE_SIZE: 312,
  CUT_INDEX: 234, START_BANKROLL: 1000,
    MIN_BET: 10, MAX_BET: 500, BET_STEP: 10, MAX_HANDS:
  4, DEALER_STAND: 17 } as const;

  // types.ts
  export type Suit = 'S'|'H'|'D'|'C';
  export type Rank =
  'A'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K';
  export interface Card { readonly id: number; readonly
  rank: Rank; readonly suit: Suit } // id = deck*52 +
  suitIdx*13 + rankIdx
  export type RestingPhase =
  'BETTING'|'PLAYER_TURN'|'ROUND_OVER';
  export type Phase = RestingPhase |
  'DEALING'|'DEALER_PEEK'|'DEALER_TURN'|'SETTLEMENT';
  export interface RngState { readonly a: number;
  readonly b: number; readonly c: number; readonly d:
  number }
  export interface ShoeState { readonly cards: readonly
  Card[]; readonly position: number; readonly
  cutIndex: number; readonly shuffleCount: number }
  export interface HandValue { readonly hard: number;
  readonly best: number; readonly soft: boolean;
  readonly bust: boolean }
  export type HandStatus =
  'PENDING'|'ACTIVE'|'STOOD'|'BUST';
  export interface PlayerHand { readonly cards:
  readonly Card[]; readonly wager: number; readonly
  fromSplit: boolean;
    readonly splitAces: boolean; readonly doubled:
  boolean; readonly status: HandStatus }
  export interface DealerHand { readonly cards:
  readonly Card[]; readonly holeRevealed: boolean;
  readonly peeked: boolean }
  export type Outcome =
  'BLACKJACK'|'WIN'|'PUSH'|'LOSE';
  export interface HandSettlement { readonly handIndex:
  number; readonly outcome: Outcome; readonly wager:
  number;
    readonly stakeReturned: number; readonly winnings:
  number; readonly net: number }
  export interface RoundState { readonly id: number;
  readonly baseBet: number; readonly bankrollAtStart:
  number;
    readonly shoeStart: number; readonly hands:
  readonly PlayerHand[]; readonly activeHandIndex:
  number; // -1 if none
    readonly dealer: DealerHand; readonly endReason:
  'DEALER_BLACKJACK'|'PLAYER_BLACKJACK'|'ALL_BUST'|'SHO
  WDOWN'|null;
    readonly settlements: readonly HandSettlement[] |
  null }
  export interface Stats { roundsPlayed: number;
  handsPlayed: number; handsWon: number; handsLost:
  number; handsPushed: number;
    blackjacks: number; doubles: number; splits:
  number; busts: number; totalWagered: number;
  netProfit: number;
    biggestWin: number; peakBankroll: number; reloads:
  number }
  export interface GameState { readonly schemaVersion:
  1; readonly seq: number; readonly phase:
  RestingPhase;
    readonly bankroll: number; readonly lastBet: number
  | null; readonly shoe: ShoeState; readonly rng:
  RngState;
    readonly round: RoundState | null; readonly stats:
  Stats }
  export type Action = { type: 'DEAL'; bet: number } |
  { type: 'HIT' } | { type: 'STAND' }
    | { type: 'DOUBLE' } | { type: 'SPLIT' }
  // added in Stage 2
    | { type: 'NEW_ROUND' } | { type: 'RELOAD_BANKROLL'
  };
  export type ErrorCode =
  'UNKNOWN_ACTION'|'ILLEGAL_PHASE'|'INVALID_BET'|'INSUF
  FICIENT_FUNDS'|'CANNOT_DOUBLE'
    |'CANNOT_SPLIT'|'NOT_A_PAIR'|'MAX_HANDS'|'RELOAD_NO
  T_ALLOWED';
  export type ActionResult = { ok: true; state:
  GameState; events: readonly GameEvent[] }
    | { ok: false; state: GameState; error: { code:
  ErrorCode; message: string } };
  export type GameEvent =
    | { type: 'PHASE'; phase: Phase } | { type:
  'SHUFFLED'; shuffleCount: number }
    | { type: 'BET_PLACED'; amount: number; bankroll:
  number }
    | { type: 'PLAYER_CARD'; handIndex: number; card:
  Card; total: HandValue }
    | { type: 'DEALER_CARD'; card: Card; visibleTotal:
  HandValue } | { type: 'HOLE_DEALT' }   // no card
  data
    | { type: 'DEALER_PEEKED'; blackjack: boolean } | {
  type: 'HOLE_REVEALED'; card: Card; total: HandValue
  }
    | { type: 'HAND_SPLIT'; handIndex: number;
  newHandIndex: number; bankroll: number }
    | { type: 'HAND_DOUBLED'; handIndex: number; wager:
  number; bankroll: number }
    | { type: 'HAND_STOOD'; handIndex: number; reason:
  'PLAYER'|'TWENTY_ONE'|'DOUBLED'|'SPLIT_ACES' }
    | { type: 'HAND_BUST'; handIndex: number } | {
  type: 'ACTIVE_HAND'; handIndex: number }
    | { type: 'DEALER_DONE'; total: number; bust:
  boolean }
    | { type: 'HAND_SETTLED'; settlement:
  HandSettlement } | { type: 'ROUND_SETTLED'; net:
  number; bankroll: number }
    | { type: 'BANKROLL_RELOADED'; bankroll: number };

  // index.ts (public, testable API)
  createGame(o: { seed: RngState; bankroll?: number;
  stackedShoe?: readonly Card[] }): GameState;
  applyAction(s: GameState, a: unknown): ActionResult;
          // runtime-validates action shape
  getLegalActions(s): { deal: { min: 10; max: number;
  step: 10 } | null; hit: boolean; stand: boolean;
    double: { allowed: boolean; reason?: ErrorCode };
  split: { allowed: boolean; reason?: ErrorCode };
    newRound: boolean; reload: boolean };
  evaluateHand(cards): HandValue;  isNatural(hand:
  PlayerHand | DealerHand): boolean;
  maxBet(bankroll): number;  validateBet(bet: unknown,
  bankroll): ErrorCode | null;
  selectView(s): TableView;  assertInvariants(s): void;
   serialize(s): string;
  deserialize(raw: string): { ok: true; state:
  GameState } | { ok: false; reason: string };

  // TableView: dealer.cards are CardView[]; a hidden
  hole card is exactly { key: 'dealer-1', faceDown:
  true }.
  // dealer.total is the upcard-only value while the
  hole card is hidden.
  // hands[] carry { cards, total, wager, status,
  isActive, settlement? }.
  // Also: legal, bankroll, bet bounds, shoe {
  remaining, penetration, cutReached }, stats,
  roundSummary.
  // tests/fixtures/stack.ts:
  stack(['AS','9H','KD','7C', ...]) → a valid 312-card
  permutation;
  // the listed physical cards come first (duplicates
  pull from the next deck), the rest follow in
  canonical order.

  Invariants (assertInvariants, run after every action
  in tests and on every load):
  - I1 All amounts are safe integers. bankroll ≥ 0.
    Every wager is a positive multiple of 10.
  - I2 shoe.cards is a permutation of ids 0..311, and
    each id's rank/suit matches. 0 ≤ position ≤ 312.
    cutIndex === 234.
  - I3 The card ids on the table equal the id set of
    shoe.cards.slice(round.shoeStart, position).
  - I4 In BETTING: round===null and position < 234.
  - I5 In PLAYER_TURN:
    - 1–4 hands.
    - Exactly one ACTIVE hand, at activeHandIndex, with
      ≥2 cards and best ≤ 20.
    - Hands before it are STOOD/BUST; hands after it
      are PENDING with exactly 1 card.
    - The hole card is not revealed and the dealer has
      2 cards.
    - bankroll === bankrollAtStart − Σwager.
  - I6 In ROUND_OVER:
    - The hole card is revealed.
    - There is one settlement per hand.
    - bankroll === bankrollAtStart − Σwager +
      Σ(stakeReturned+winnings).
    - With SHOWDOWN, the dealer's final best ≥ 17 (or
      bust) and every earlier prefix of 2+ cards was <
      17. Otherwise the dealer has exactly 2 cards.
  - I7 A split-aces hand has 2 cards and is not
    doubled. A doubled hand has 3 cards and wager =
    2·baseBet. Every other hand has wager = baseBet.
    fromSplit is true exactly when hands.length > 1.

  5. Persistence policy (resume exactly)

  - One key blackjack.save.v1 holds {schemaVersion:1,
    savedAt, state}. The whole GameState (bankroll,
    round, stats, shoe, RNG, seq) goes in one setItem.
    Settlement is part of the same transition into
    ROUND_OVER, so no saved state can have the payout
    applied while the round is still unsettled.
    ROUND_OVER only accepts NEW_ROUND, so a payout
    can't be applied twice.
  - When saving: after every accepted action, before
    animation. Rejected actions are never saved.
  - Loading: deserialize checks the structure, then
    runs assertInvariants.
    - Valid: RESUMED. Mid-round, the bets stay at risk
      with the same cards and the same shoe.
    - Invalid JSON, a failed invariant, or an unknown
      schemaVersion: copy the raw string to
      blackjack.save.v1.corrupt, start a new game, show
      a notice.
  - Storage unavailable (get or set throws, or quota is
    exceeded): the game keeps working in memory and
    shows a "progress not saved" banner. It never
    throws.
  - Multiple tabs: save reads the stored seq first. If
    the stored seq isn't the one this tab last loaded
    or wrote, the result is STALE with the current
    stored state; the controller adopts it and drops
    its own transition. A storage event with a higher
    seq → adopt it and re-render.
  - Interfaces:
    - KeyValueStore { get; set; remove; subscribe? }
      with LocalStorageStore and MemoryStore (the
      latter can be set to throw, for tests).
    - SaveManager.load(): {kind:'RESUMED'|'NEW', state,
      notice?}
    - save(s): {ok:true} | {ok:false,
      reason:'STALE'|'UNAVAILABLE', current?}

  6. UI design

  - Layout:
    - Header: bankroll, a shoe meter with a cut-card
      marker, Rules and Stats buttons.
    - Dealer row: cards, plus a total that shows only
      the upcard value while the hole card is hidden,
      and a toast after the peek.
    - Player row: 1–4 hands with the active hand
      highlighted, a wager chip and status/result
      badges.
    - Control bar, by phase:
      - BETTING: chips +10/+50/+100, Clear, Max, Rebet,
        Deal; Reload when the bankroll is under 10.
      - PLAYER_TURN: Hit/Stand/Double/Split, with a
        tooltip giving the reason when disabled.
      - ROUND_OVER: net result and New Round.
  - Input: buttons are enabled strictly from
    getLegalActions. Keyboard: H S D P, Enter (Deal /
    New Round), Backspace (clear bet), R (rules). Input
    is blocked while animating; Space or a click skips
    the animation.
  - Animation: events play one at a time (deal ~220 ms,
    flip ~300 ms, badge ~400 ms). Each card animates
    from the shoe position. Totals and results update
    only after the cards land. When the queue finishes,
    a full render(finalView) brings the DOM in line.
    prefers-reduced-motion uses 0 ms. On load there's
    no animation; the screen jumps straight to the
    current state.
  - Accessibility: native <button>s. Card names like
    "King of Spades" and "Face-down card". An
    aria-live="polite" region announces events from the
    event payloads. Visible focus. AA contrast. Layout
    works from 360 px to 1440 px; 4 hands wrap to a
    2×2 grid without horizontal scrolling.
  - Rules panel text covers R1–R17 in plain words,
    including: "Insurance, even money and surrender
    aren't offered. Because the dealer checks for
    blackjack first, you never lose double or split
    bets to a dealer blackjack."
  - Out of scope: sound, side bets, multiplayer, a
    server, a card-counting trainer.

  7. Two-stage roadmap for Codex

  Stage 1: playable vertical slice
  1. Set up Vite (vanilla-ts), TypeScript strict +
     noUncheckedIndexedAccess +
     exactOptionalPropertyTypes, and Vitest. Scripts:
     dev, build, test, typecheck. Package manager and
     lint follow TASK-002.
  2. Write the full engine types now, including
     split/double fields, so Stage 2 doesn't need a
     refactor. Leave DOUBLE and SPLIT out of the Action
     union; they return UNKNOWN_ACTION.
  3. Build rng, cards, shoe, hand, legality, the
     reducer (DEAL, peek, naturals, HIT, STAND, dealer
     S17, settlement, NEW_ROUND with reshuffle,
     RELOAD), invariants, selectView, plus stats with
     field defaults.
  4. Minimal DOM UI: text cards (e.g. "K♠"), chip
     betting, buttons enabled by legality, full rules
     panel. No persistence (each page load starts a new
     game) and no animation.

  Stage 2: full features and polish
  1. Add DOUBLE and SPLIT (activation draw, split aces,
     resplit to 4, double after split) to the union
     and the checks.
  2. Stats updated during SETTLEMENT and RELOAD, plus a
     stats panel.
  3. Serialize/validate, SaveManager, controller wiring
     (save before animating), multi-tab handling,
     corrupt/unavailable handling. schemaVersion: 1 is
     frozen from here on.
  4. Animation queue, input lock, skip, reduced motion,
     DOM reconciliation.
  5. Polished UI: CSS/SVG cards, felt table, chips,
     multi-hand layout, badges, a bankroll count-up
     animation, accessibility, responsive layout.

  8. Acceptance criteria

  Scenario fixtures (bankroll 1000, bet 100 unless
  noted; deal order is P1, dealer up, P2, hole, then
  draws). All expected values below were checked with
  the reference model.

  ID: S1
  Stacked shoe: AS 9H KD 7C
  Actions: —
  Expected: Natural, no peek, wn 150, bankroll 1150,
  pos
  4
  ────────────────────────────────────────
  ID: S2
  Stacked shoe: KS AH AD QC
  Actions: —
  Expected: Peek finds dealer BJ; both naturals push,
  1000
  ────────────────────────────────────────
  ID: S3
  Stacked shoe: KS QH QD AC
  Actions: —
  Expected: Peek finds BJ; LOSE 900; HIT afterwards →
  ILLEGAL_PHASE
  ────────────────────────────────────────
  ID: S4
  Stacked shoe: 10S AH 7D 9C
  Actions: STAND
  Expected: Peek: none. Hole card hidden in view during

  PLAYER_TURN. Dealer soft 20, 900
  ────────────────────────────────────────
  ID: S5
  Stacked shoe: 10S AH 8D 6C 5H
  Actions: STAND
  Expected: Dealer stands on soft 17, pos stays 4, 1100
  ────────────────────────────────────────
  ID: S6
  Stacked shoe: 10S 10H 9D 6C KH
  Actions: STAND
  Expected: Dealer 16 draws K and busts, 1100, pos 5
  ────────────────────────────────────────
  ID: S7
  Stacked shoe: 10S 6H 6D 10C 9H
  Actions: HIT
  Expected: Player busts at 25; dealer draws nothing (2

  cards), 900, pos 5
  ────────────────────────────────────────
  ID: S8
  Stacked shoe: 5S 9H 6D 7C 10H 2S
  Actions: HIT
  Expected: 21 stands automatically, straight to
  ROUND_OVER; dealer 18, 1100
  ────────────────────────────────────────
  ID: S9
  Stacked shoe: 10S 10H 8D 8C
  Actions: STAND
  Expected: Push, 1000
  ────────────────────────────────────────
  ID: S10
  Stacked shoe: 10S 2H 9D AC 4D 5S
  Actions: STAND
  Expected: Dealer A-2-4 = soft 17 stands, 1100, pos 5
  ────────────────────────────────────────
  ID: S11
  Stacked shoe: 10S 5H 8D AC 9H 3S
  Actions: STAND
  Expected: Dealer soft 16 → hard 15 → 18, push 1000,
  pos 6
  ────────────────────────────────────────
  ID: S12
  Stacked shoe: 5S 6H 6D 10C 10H 9S
  Actions: DOUBLE
  Expected: Wager 200, 21; dealer busts; sr200 wn200,
  1200
  ────────────────────────────────────────
  ID: S13
  Stacked shoe: 10S 6H 2D 10C KH
  Actions: DOUBLE
  Expected: Busts at 22; dealer draws nothing, 800
  ────────────────────────────────────────
  ID: S14
  Stacked shoe: bankroll 200 / 150
  Actions: DOUBLE
  Expected: 200: legal (bankroll ends at 0). 150:
  INSUFFICIENT_FUNDS. After a HIT: CANNOT_DOUBLE
  ────────────────────────────────────────
  ID: S16
  Stacked shoe: 8S 10H 8D 7C 3H 10D 9C
  Actions: SPLIT, DOUBLE, STAND
  Expected: Hands [8,3,10]=21 (w200, WIN) and [8,9]=17
  (PUSH); dealer 17, 1200, pos 7
  ────────────────────────────────────────
  ID: S17
  Stacked shoe: AS 9H AD 7C KH 5D QC
  Actions: SPLIT
  Expected: Split-ace A-K = 21 pays wn 100, not 150;
  dealer busts, 1200
  ────────────────────────────────────────
  ID: S18
  Stacked shoe: AS 9H AD 7C AH 5D 2C
  Actions: SPLIT
  Expected: [A,A] soft 12 stands automatically, no
  resplit; dealer 18, 800
  ────────────────────────────────────────
  ID: S19
  Stacked shoe: 8S 10H 8D 7C 8H 8C 8S 10S 10D 10C
  Actions: SPLIT×3, then a 4th → MAX_HANDS; STAND×4
  Expected: Hand order [8,8], [8♣,10], [8♥,10],
  [8♦,10];
  1200, pos 10
  ────────────────────────────────────────
  ID: S20
  Stacked shoe: bankroll 150 with an 8-8 / bankroll 300

  split + double after split, then pair
  Actions: SPLIT
  Expected: INSUFFICIENT_FUNDS on the split / on the
  second split
  ────────────────────────────────────────
  ID: S21
  Stacked shoe: KS 9H QD 7C
  Actions: SPLIT
  Expected: NOT_A_PAIR (K-K is allowed)
  ────────────────────────────────────────
  ID: S22
  Stacked shoe: 8S 6H 8D 10C 10H 9S 10D 5C
  Actions: SPLIT, HIT, HIT
  Expected: Both hands bust; dealer draws nothing, 800,

  pos 8
  ────────────────────────────────────────
  ID: S25
  Stacked shoe: AS 9H KD 7C, bet 10
  Actions: —
  Expected: wn 15, 1015, maxBet 500
  ────────────────────────────────────────
  ID: S26
  Stacked shoe: bankroll 45 / 5
  Actions: —
  Expected: max bet 40, and 50 → INSUFFICIENT_FUNDS /
  deal:null, reload legal; reload at 10 →
  RELOAD_NOT_ALLOWED

  Hand evaluator table (T-HAND):

  ┌───────┬──────────────────────────────────┐
  │ Cards │             Expected             │
  ├───────┼──────────────────────────────────┤
  │ A6    │ 7 / 17 soft                      │
  ├───────┼──────────────────────────────────┤
  │ A6T   │ 17 hard                          │
  ├───────┼──────────────────────────────────┤
  │ AA    │ 12 soft                          │
  ├───────┼──────────────────────────────────┤
  │ AA9   │ 21 soft                          │
  ├───────┼──────────────────────────────────┤
  │ AAK   │ 12 hard                          │
  ├───────┼──────────────────────────────────┤
  │ AAAA7 │ 21 soft                          │
  ├───────┼──────────────────────────────────┤
  │ AK    │ 21 soft, natural only if unsplit │
  ├───────┼──────────────────────────────────┤
  │ T69   │ 25, bust                         │
  ├───────┼──────────────────────────────────┤
  │ 5A9   │ 15 hard                          │
  └───────┴──────────────────────────────────┘

  Bet table (T-BET), bankroll 1000:
  - Allowed: 10, 500.
  - INVALID_BET: 0, 5, 15, 505, 510, −10, 10.5, NaN,
    Infinity, "10".
  - At bankroll 300: 310 → INSUFFICIENT_FUNDS; 510 →
    INVALID_BET.

  Stage 1 (AC1):
  1. typecheck, test and build pass with no errors.
  2. The purity and import-boundary scan test passes.
  3. T-SHOE:
     - 312 cards with 24 of each rank.
     - The shuffle produces a permutation.
     - Fisher-Yates distribution: 3 elements × 60k
       seeded shuffles, every permutation within ±3% of
       expected.
     - nextInt rejection sampling is unbiased.
     - A golden first-8-cards test for a fixed seed.
     - NEW_ROUND reshuffles at position 234 and not
       at 233.
  4. T-HAND and T-BET pass.
  5. S1–S11, S25 and S26 pass, asserting phase,
     bankroll, shoe.position, every HandSettlement
     field and the event sequence.
  6. Rejection matrix: every waiting phase × every
     action type plus malformed input gives the
     expected code. A rejected action returns the same
     state reference and no events.
  7. Hole card hidden: in PLAYER_TURN,
     view.dealer.cards[1] deep-equals {key:'dealer-1',
     faceDown:true}. No HOLE_DEALT event carries card
     data.
  8. Fuzz: 5,000 seeded rounds with a random agent that
     also tries illegal actions and bets. After every
     step, ok === legal, invariants I1–I7 hold, nothing
     throws, and at least one reshuffle happens.
  9. The same seed and the same actions produce
     deep-equal states and events. Deep-frozen inputs
     never throw.
  10. Manual check: a full game in the browser covering
      betting, deal, hit, stand, new round and reload.
      Buttons match legality. The rules panel lists
      R1–R17 and the omitted options.

  Stage 2 (AC2):
  1. S12–S22 pass, and the fuzz test is extended to
     20,000 rounds with DOUBLE and SPLIT; every
     invariant holds.
  2. Stats after S16: rounds 1, hands 2, won 1, pushed
     1, doubles 1, splits 1, totalWagered 300,
     netProfit 200, biggestWin 200, peakBankroll 1200.
  3. Persistence tests:
     - P1 For every fuzz state,
       deserialize(serialize(s)) deep-equals s.
     - P2 Reload S16 after the SPLIT: resumes at
       bankroll 800, and finishing the round gives
       exactly 1200.
     - P3 Reload at ROUND_OVER: the bankroll doesn't
       change, no settlement events fire, and only
       newRound is legal.
     - P4 Reload after S1: 1150, not 1300.
     - P5 The save throws on the post-STAND write:
       reload gives the pre-STAND PLAYER_TURN with the
       bet still taken, and STAND then settles once.
     - P6 Corrupt JSON, bankroll −5, or a duplicate
       card id: new game with a notice, and the raw
       string is kept at the backup key.
     - P7 schemaVersion: 2: backed up, new game.
     - P8 The store throws on every call: the game is
       playable and shows the unavailable notice.
     - P9 Two SaveManagers: the stale one's save
       returns STALE and the store keeps the newer
       state.
     - P10 A storage event with a higher seq is
       adopted.
     - P11 The store already holds the post-action
       state when animator.play is called.
  4. In jsdom, after the animation queue finishes,
     innerHTML equals a fresh render(finalView). Input
     is ignored during animation. Reduced motion means
     0 ms durations.
  5. Manual checks:
     - Every action works by keyboard.
     - The live region announces cards, totals and
       results.
     - Width 360 px with 4 hands: no horizontal scroll.
     - The hole card flips on reveal.
     - Reloading mid-animation shows the final state.
  6. If coverage tooling is added (TASK-002), engine
     coverage is ≥95% of lines and ≥90% of branches.

  ---

  Checks run and results

  - Repo inspection (ls, git log, git status): baseline
    135ca1eb… confirmed. Only README.md is tracked.
  - Scenario check: I wrote a small throwaway
    JavaScript model (in my scratchpad, not in the
    repo) and ran 19 of the fixtures through it
    (S1–S13, S16–S19, S22, S25). Every bankroll, shoe
    position, per-hand wager/stakeReturned/winnings and
    dealer total matches the table above. Key results:
    - S16 gives 1200 at pos 7.
    - S17's split-ace 21 pays 100, not 150.
    - S19 gives 1200 at pos 10 with the hand order
      shown.
    - S22: when every hand busts, the dealer stays at 2
      cards.
  - Shoe bound computed: at most 61 cards per round vs.
    at least 79 remaining at round start (F2).
  - Consistency check: every rule in the brief maps to
    an R-ID and a test ID:

  | Brief rule                       | Spec rule |
  Tests            |
  |----------------------------------|-----------|-----
  -------------|
  | 6 decks / Fisher-Yates / 75% cut | R1–R2     |
  T-SHOE           |
  | Bankroll / bets                  | R3–R4     |
  T-BET, S26       |
  | Aces and soft totals             | R5        |
  T-HAND, S10, S11 |
  | Dealer S17                       | R6        | S5,
  S10          |
  | Hole card / peek                 | R7–R8     |
  S2–S4, AC1-7     |
  | Naturals 3:2 / push              | R9        |
  S1–S3, S25       |
  | 1:1, push, separate accounting   | R10       | all
  scenarios    |
  | Double                           | R12       |
  S12–S14          |
  | Split, max 4                     | R13       | S16,
  S19–S21     |
  | Split aces                       | R14       | S17,
  S18         |
  | Split 21 pays 1:1                | R15       | S17
              |
  | Omitted options                  | R16       |
  rules panel      |
  | Reload                           | R17       | S26
              |
  | Persistence                      | R18       |
  P1–P11           |
    With C1–C9 settled, I found no contradictions.

  Unresolved issues

  None of these block Stage 1. They are decisions I
  made that the reviewer or user can override:
  1. C8, auto-stand on 21, isn't in the user's spec.
     It's harmless because hitting 21 never helps, and
     it's cheap to undo.
  2. C2, reload sets the bankroll to 1000 and drops any
     remainder under 10. Stats are kept and reloads
     are counted.
  3. C1, the table max only limits the initial bet, so
     a doubled 500 bet carries 1000.
  4. The cross-tab seq check isn't a true atomic
     compare-and-set, because localStorage has none.
     The race window is negligible.
  5. Someone using devtools can read the hole card and
     the shoe order. Accepted for a no-money game.
  6. Tooling details (npm vs. pnpm, lint, coverage
     package) are left to TASK-002. Script names above
     are what the spec expects.

  Next action needed

  - The coordinator should send Stage 1 (§7, AC1) to
    coder (TASK-003), with §2–§4 as the binding
    contract.
  - tester (TASK-002) should independently re-derive
    fixtures S1–S26 and P1–P11 from the rules, and
    align the tooling choices.
  - reviewer and adversary should review §2, §3 and §5
    for rule gaps before Stage 2 starts.
  - Stage 2 starts only after every AC1 item passes.

✻ Cogitated for 14m 1s · done 3:57 AM

⏺ tool-pet: ui.render hook skipped: ran past
  its 10s budget

※ recap: I'm writing the architecture and rules spec
  for the TypeScript browser blackjack game, and it's
  ready for review; I didn't edit any files. Next, the
  coordinator hands Stage 1 to Codex while the tester
  re-checks the scenario fixtures. (disable recaps in
  /config)

───────────────────────────────────────────────────────
❯ 
───────────────────────────────────────────────────────
  ⚠ touched-files: touched 1 file, 1 edit
  ⚠ session-meter: ⏱ 14m01s · 1 turn · 245.1k in / 7…
  📁 ~/dev/orch  🌿 main  🤖 Opus 5.5  💭 xhigh  📟 …
  🧠 Context Remaining: 91% [=========-]  94k/1.0M t…
  ⏵⏵ bypass         (shif…Mochi zZ            ██████
  permissions on ·        food [#-----]  18  ▀██████▀
                          joy  [###---]  43   ▝▝  ▘▘
                                        123443 tokens