# Blackjack test fixtures

This reference describes deterministic behavior checks for the Stage 2 game. The runnable fixtures are authoritative in `tests/fixtures.ts` and the test suites. Rules and scenario IDs are defined in [SPECIFICATION.md](SPECIFICATION.md).

## Fixture construction

`cards(...ranks)` creates cards with unique physical IDs, drawing repeated rank/suit combinations from later decks. `stack(tokens)` accepts tokens such as `AS`, `9H`, `KD`, and `7C`. A stacked prefix is consumed in the order player, dealer upcard, player, dealer hole, then subsequent draws. Remaining physical cards fill the rest of the six-deck shoe.

Unless specified, bankroll starts at 1,000 and wager is 100. Expected bankroll is starting bankroll minus total stakes plus returned stakes and winnings. Net profit includes losses as negative amounts.

## Groups

| Group | Cases | Runnable suite |
| --- | --- | --- |
| A | Multiple aces, soft-to-hard transitions, busts, natural detection, split 21 | hand.test.ts |
| B | Player natural: 1150; dealer natural: 900; mutual naturals: 1000; natural at bet 10: 1015 | game.test.ts |
| C | Dealer stands on A+6 and A+2+4; hits below 17; soft-to-hard dealer sequence | game.test.ts |
| D | Player bust: 900 without dealer draw; dealer bust: 1100; push: 1000; separate profit and stake | game.test.ts |
| E | Double win: 1200; double loss or bust: 800; double push: 1000; funds and two-card guards; 500 to 1000 wager | stage2.test.ts |
| F | Sequential splits, resplit to four, rank equality, split aces, ordinary split 21, DAS, all-bust dealer behavior | stage2.test.ts |
| G | Waiting-phase/action matrix, malformed actions, non-active target rejection, replay guards, animation lock | stage2.test.ts and ui.test.ts |
| H | Exact mid-round resume, repeated settled loads, failed writes and retry, corruption backup, stale tabs, storage events | persistence.test.ts, save-validation.test.ts, and ui.test.ts |

## Exact settlement examples

| Outcome | Wager | Winnings | Stake returned | Net profit | Final bankroll |
| --- | ---: | ---: | ---: | ---: | ---: |
| Ordinary win | 100 | 100 | 100 | 100 | 1100 |
| Blackjack | 100 | 150 | 100 | 150 | 1150 |
| Loss or bust | 100 | 0 | 0 | -100 | 900 |
| Push | 100 | 0 | 100 | 0 | 1000 |
| Double win | 200 | 200 | 200 | 200 | 1200 |
| Double push | 200 | 0 | 200 | 0 | 1000 |
| Double loss | 200 | 0 | 0 | -200 | 800 |

S16 uses `8S 10H 8D 7C 3H 10D 9C`: Split, Double, Stand. The first hand wins 200 at 21; the second pushes at 17 with 100 returned. Final bankroll is 1200, rounds 1, hands 2, wins 1, pushes 1, doubles 1, splits 1, total wagered 300, and net profit 200.

S19 uses `8S 10H 8D 7C 8H 8C 8S 10S 10D 10C`: three splits create four hands. Another split is rejected. Four stands settle to 1200 at shoe position 10. Suit order is asserted to detect activation-order mistakes.

## Persistence policy

The accepted policy is exact resume, not refund on reload. A saved active wager remains deducted and the same hand stays active. ROUND_OVER reloads never credit payouts again. Every accepted action saves a complete snapshot before animation.

| Case | Expected behavior |
| --- | --- |
| P1 | Serialization round-trips valid states |
| P2 | S16 reload after split resumes at 800; completing Double and Stand yields 1200 |
| P3 | Repeated settled loads retain bankroll and statistics |
| P4 | Reloading a player natural retains 1150, not 1300 |
| P5 | Failed settlement write retains pre-Stand bytes; retry or resume settles once |
| P6 | Invalid JSON, negative bankroll, or duplicate physical IDs are backed up and replaced |
| P7 | Unsupported schema is backed up and replaced |
| P8 | Unavailable storage does not block in-memory play |
| P9 | Stale tab cannot overwrite a newer valid snapshot |
| P10 | Higher-sequence storage events are adopted; older events ignored |
| P11 | Post-action snapshot exists before animation starts |

## Review regression fixtures

Reject these impossible snapshots on the first load, retain their exact raw backup, and open a new table:

- An ACTIVE doubled hand `[5,6,2]` with wager 200 and bankroll 800. It must not accept another hit and become unloadable later.
- Two split-ace hands `[A,A]` stood and `[A,5]` active. Both should already have stood.
- An ace-root split hand with its split-ace flag removed. Provenance must prevent an ace resplit or another hit.
- A hidden dealer `[A,K]` while PLAYER_TURN remains unresolved. The peek must have ended the round before any extra wager.
- An unsplit ACTIVE `[A,K,2]`. A draw after an initial natural is impossible.
- Any player hand whose earlier prefix reached 21 or busted before its last card.

Keep valid S16 mid-split and post-double active-successor states as positive controls. Every legal successor of an accepted loaded state must remain serializable and loadable. Invalid outgoing states must not overwrite valid bytes. Deleted or corrupted save keys must recover using the valid in-memory table; corrupt bytes are backed up.

## RNG and fuzz checks

Fresh sfc32 seeds are mixed before use. A fixed seed has a golden first-eight-card vector. Rejection sampling exercises the uint32 boundary. Across 60,000 seeds, all six three-card shuffle permutations must be within three percent of their expected count.

Twenty thousand seeded rounds exercise hit, stand, double, split, rejected actions, settlements, and reshuffling. Inputs remain immutable; replaying an action from the same state produces identical state and events. Loaded snapshots and legal successors preserve invariants.

## Browser checks

Run `scripts/browser-smoke.js` through Playwright against the production preview. Inspect desktop and 360-pixel four-hand layouts. Verify hidden cards, DAS, exact resume, keyboard D/H/S/2/X/P/N/R, dialogs, animation locks, zero reduced-motion duration, and animation skipping without another game action.
