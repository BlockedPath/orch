# The Green Room blackjack

A single-player browser blackjack table built with TypeScript, Vite, and Vitest. Includes six decks, S17, 3:2 natural blackjack, hit, stand, double down, four split hands, split aces, saved rounds, and statistics. Chips are for play.

## Run locally

Use Node.js 22.12 or newer. Node 24 and 26 are verified.

```sh
npm ci
npm run dev
```

The development server opens at http://localhost:5173.

## Verify and preview

```sh
npm test
npm run typecheck
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

The test suite covers engine fixtures, persistence, UI controls, save-validation regressions, 60,000 seeded shuffle samples, and 20,000 seeded rounds. Test workers disable Node's native Web Storage so DOM tests use their own browser storage.

With the production preview running, execute the browser smoke script in another terminal:

```sh
npx --package @playwright/cli playwright-cli -s=blackjack open http://127.0.0.1:4173
npx --package @playwright/cli playwright-cli -s=blackjack run-code --filename=scripts/browser-smoke.js
```

It checks DAS, four hands at 360 pixels, split aces, exact resume, animation locks and skipping, keyboard controls, and dialogs. Screenshots are written to `output/playwright/`. The script replaces saved data only in its isolated browser session.

## Engine and saves

`src/engine/game.ts` exposes `createGame`, `applyAction`, and `getLegalActions`. Accepted actions return a new immutable snapshot and animation events. Rejected actions return the original state, an error code, and no events. `selectView` computes totals and omits hidden hole-card information.

The engine stores its sfc32 state with the shoe. Fresh seeds are mixed before shuffling; existing saved RNG states resume unchanged. Production entropy comes from the UI. Each fixture card has a unique physical ID. Deal order is player, dealer upcard, player, dealer hole, then draws.

`src/persistence/save.ts` writes one complete snapshot at `blackjack.save.v1` after each accepted action, before animation. Reload resumes the same active hand with its wager deducted. Settled rounds never pay twice. Invalid saves are backed up at `blackjack.save.v1.corrupt`. Validation rejects impossible doubled hands, split-ace histories, unresolved naturals, and draws after an earlier 21 or bust.

Invalid outgoing states cannot overwrite valid bytes. Deleted or corrupt save keys recover from the valid in-memory table. Storage failures keep play available with a notice; successful saves clear the notice. Sequence checks reject stale writes from other tabs.

## Controls and rules

Use native buttons or D to deal, H to hit, S to stand, 2 or X to double, P to split, N for a new round, and R to reset a bankroll below 10 before dealing. Shortcuts are ignored in editable controls and open dialogs. Focus remains visible.

Press Space, use Skip animation, or tap the table while cards are in motion to finish the animation without another move. Reduced motion uses zero duration. Four hands wrap into two columns on mobile. Rules and statistics use native dialogs.

The dealer stands on all 17s and checks for blackjack before extra double or split wagers. Split identical ranks up to four hands. Split aces receive one card each and automatically stand without resplitting. Split 21 pays 1:1. Insurance, even money, surrender, and side bets are not offered.

See [SPECIFICATION.md](SPECIFICATION.md) for the rules and [TEST_FIXTURES.md](TEST_FIXTURES.md) for test scenarios.
