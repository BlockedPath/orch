# Blackjack specification

The Green Room is a single-player browser blackjack game using play chips. The Stage 2 implementation includes hit, stand, double down, sequential split hands, statistics, and exact saved-round resume.

## House rules

| ID | Rule |
| --- | --- |
| R1 | Six decks, 312 physical cards. Fisher–Yates uses a saved sfc32 RNG and unbiased uint32 rejection sampling. Fresh seeds are mixed for 20 steps before shuffling. Production entropy enters through the UI. |
| R2 | The cut card is at position 234. NEW_ROUND reshuffles at or beyond the cut, never during a round. No burn card. |
| R3 | Starting bankroll: 1,000 chips. |
| R4 | Initial wager: an integer from 10 to 500, in increments of 10, capped by bankroll. Invalid range or step is checked before insufficient funds. DEAL deducts the wager. |
| R5 | Aces count as 1 or 11. The best total uses one ace as 11 when that avoids a bust. A hand is soft when an ace counts as 11. |
| R6 | Dealer hits below 17 and stands on every 17, including soft 17. |
| R7 | The dealer hole card stays hidden during player play. It is revealed during dealer play or when the round ends immediately. |
| R8 | With an Ace or ten-value upcard, the dealer checks for blackjack before any player action. Upcards 2–9 do not trigger a peek. No insurance prompt. |
| R9 | Natural blackjack is an unsplit, initial two-card Ace plus a ten-value card. It pays 3:2. Mutual naturals push. Dealer natural beats every other hand. Player natural settles immediately after any required peek; the dealer draws nothing. |
| R10 | Ordinary wins pay 1:1. Push returns the stake. Loss and bust forfeit it. Each settlement records wager, winnings, returned stake, and net profit separately. |
| R11 | Engine actions: DEAL with a bet, HIT, STAND, DOUBLE, SPLIT, NEW_ROUND, and RELOAD_BANKROLL. |
| R12 | Double on exactly two cards, including after a non-ace split, with enough bankroll to cover an equal wager. Draw exactly one card and automatically stand or bust. A doubled 500-chip wager becomes 1,000. |
| R13 | Split identical ranks, with an extra equal wager, into at most four hands. Insert the new hand immediately to the right. Deal the current hand its second card now; later hands receive theirs when activated. Play hands in order. |
| R14 | Split aces create exactly two hands. Each receives one new card and automatically stands. No hit, double, or resplit. |
| R15 | Any split 21 is an ordinary 21 and pays 1:1. |
| R16 | Insurance, even money, surrender, and side bets are not offered. |
| R17 | Reload is allowed only in BETTING with bankroll below 10. It sets bankroll to 1,000, drops any remainder, increments reloads, and preserves other statistics. |
| R18 | Save the complete accepted transition before animation. Reload resumes the exact saved round rather than refunding wagers. |
| R19 | A player total of 21 automatically stands. |
| R20 | A player bust loses even if the dealer busts. If all hands bust, reveal the dealer hole card but draw no more cards. |

## State and modules

`src/engine/` is independent of browser APIs, storage, clocks, and uncontrolled randomness.

| Module | Responsibility |
| --- | --- |
| types.ts | Cards, hands, actions, phases, state, events, settlements, and statistics |
| prng.ts | Seed mixing, sfc32 state transitions, uint32 rejection sampling, and test PRNG |
| shoe.ts | Physical card IDs, shuffle, fixture stacking, and draws |
| hand.ts | Totals, softness, busts, and naturals |
| game.ts | Legality and synchronous immutable action reducer |
| view.ts | Computed presentation data and hidden-card redaction |
| invariants.ts | Reachability, card provenance, phase, bankroll, and settlement validation |
| errors.ts | InvariantError for broken internal contracts |
| serialize.ts | Structural parsing and validated snapshot loading |
| ../persistence/save.ts | Atomic save envelope, invalid-save backup, stale-state checks, and recovery |
| ../ui/table.ts | Rendering, controls, keyboard input, animation, and dialogs |

`applyAction(state, unknown)` validates action shape. A rejection returns the original state, an error code, and no events. Acceptance returns a new snapshot and events. Inputs are never mutated.

Only BETTING, PLAYER_TURN, and ROUND_OVER are persisted. DEALING, DEALER_PEEK, and DEALER_TURN are synchronous steps exposed through PHASE events. Settlement is part of the transition into ROUND_OVER.

A dealer hole-card event has no card data. A hidden card view is exactly `{ key: 'dealer-1', faceDown: true }`. The hidden dealer total uses only the upcard.

## Invariants

- I1: Chip amounts and sequence values are safe integers. Bankroll is nonnegative; wagers are positive multiples of 10.
- I2: The shoe is a permutation of IDs 0–311 with matching ranks and suits. Position is within 0–312.
- I3: Cards on the table match the consumed shoe cards without duplicates. Opening player and dealer cards retain deal order.
- I4: BETTING has no round and a shoe position below the cut.
- I5: PLAYER_TURN has exactly one active hand below 21. Earlier hands are stood or bust; later hands are pending with one card. The dealer has two hidden cards and no natural. Bankroll equals starting bankroll minus current stakes.
- I6: ROUND_OVER has revealed dealer cards and one valid settlement per hand. Bankroll equals starting bankroll minus stakes plus returned stakes and winnings. End reason and statistics agree with the settled round.
- I7: Doubled hands have three cards, double the base wager, and a stood or bust status. Split-ace provenance cannot be stripped: all ace-root split hands have two cards and have stood, with exactly two hands total. No player history contains a draw after an earlier 21 or bust.

Validation runs on every loaded snapshot and before a snapshot is written. Tests check invariants across 20,000 seeded rounds.

## Persistence

One localStorage key, `blackjack.save.v1`, stores `{ schemaVersion: 1, savedAt, state }`. State includes bankroll, shoe, saved RNG, round, statistics, and sequence.

- Accepted actions save once before animation. Rejected actions never save.
- Valid snapshots resume without another deduction or payout.
- Invalid JSON, unsupported schemas, and impossible states are copied verbatim to `blackjack.save.v1.corrupt` and replaced by a new table.
- An invalid outgoing state is refused before touching a valid save.
- If a stored key is deleted or corrupted while play continues, the next valid save preserves the in-memory table and backs up corrupt bytes.
- A write failure leaves the previous saved bytes intact. Play continues in memory with a notice. A successful retry clears the notice.
- A newer valid stored sequence causes STALE; the controller adopts it and drops its own transition. Higher-sequence storage events are adopted; older events are ignored.

The earlier refund-on-reload proposal is superseded by exact resume.

## UI

The table uses green felt, restrained gold, accessible card names, native buttons, visible focus, and a responsive two-column split-hand layout. At 360 pixels, four hands fit without horizontal scrolling.

Each hand shows total, wager, status, active indication, doubled or split-ace badge, and its own settlement. The round banner separates net profit from returned stake. Rules and statistics use native modal dialogs.

Controls follow `getLegalActions`. Keyboard mappings follow the latest user instruction:

| Key | Action |
| --- | --- |
| D | Deal |
| H | Hit |
| S | Stand |
| 2 or X | Double |
| P | Split |
| N | New Round |
| R | Reset Bankroll |
| Space while animating | Skip animation |

Shortcuts are ignored in editable controls or open dialogs. Dealing, reveal, and bankroll changes animate; reduced motion uses zero duration. Animation locks gameplay input. Space, the Skip animation button, or a tap on the table skips presentation without dispatching another move. Loading jumps directly to the saved final state.

## Acceptance fixtures

Deal order is player, dealer upcard, player, dealer hole, then subsequent draws. `T` denotes rank 10. Default bankroll is 1,000 and bet is 100. Suit is cosmetic, but each physical card has a unique ID.

| Scenario | Stacked ranks | Actions after deal | Final bankroll | Shoe position |
| --- | --- | --- | ---: | ---: |
| S1 | A 9 K 7 | None | 1150 | 4 |
| S2 | K A A Q | None | 1000 | 4 |
| S3 | K Q Q A | None | 900 | 4 |
| S4 | T A 7 9 | Stand; peek finds no blackjack | 900 | 4 |
| S5 | T A 8 6 5 | Stand; soft 17 stands | 1100 | 4 |
| S6 | T T 9 6 K | Stand | 1100 | 5 |
| S7 | T 6 6 T 9 | Hit | 900 | 5 |
| S8 | 5 9 6 7 T 2 | Hit; auto-stand at 21 | 1100 | 6 |
| S9 | T T 8 8 | Stand | 1000 | 4 |
| S10 | T 2 9 A 4 5 | Stand | 1100 | 5 |
| S11 | T 5 8 A 9 3 | Stand | 1000 | 6 |
| S12 | 5 6 6 T T 9 | Double | 1200 | 6 |
| S13 | T 6 2 T K | Double; bust | 800 | 5 |
| S16 | 8 T 8 7 3 T 9 | Split, Double, Stand | 1200 | 7 |
| S17 | A 9 A 7 K 5 Q | Split | 1200 | 7 |
| S18 | A 9 A 7 A 5 2 | Split | 800 | 7 |
| S19 | 8 T 8 7 8 8 8 T T T | Split three times; fifth hand rejected; Stand four times | 1200 | 10 |
| S21 | K 9 Q 7 | Split rejected: NOT_A_PAIR | Unchanged after deal | 4 |
| S22 | 8 6 8 T T 9 T 5 | Split, Hit, Hit | 800 | 8 |
| S25 | A 9 K 7; bet 10 | None | 1015 | 4 |

S14 checks double eligibility at starting bankrolls 200 and 150, plus rejection after a hit. S20 checks insufficient funds for splits, including after DAS. S26 checks max bet 40 at bankroll 45, reload below 10, and rejection at exactly 10.

The original handoff did not define S15, S23, or S24. No additional rules are inferred from those unused IDs.

## Verification

`npm test`, `npm run typecheck`, and `npm run build` must pass. Run the production browser smoke script against freshly built output. It exercises DAS, four hands, split aces, exact split and settled resume, mid-animation reload, input locks, keyboard actions, and dialogs. Review regressions additionally cover impossible saved states and storage recovery.
