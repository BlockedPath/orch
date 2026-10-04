# The Green Room · Casino Blackjack

A polished, fully playable browser Blackjack game built with TypeScript, Vite, and clean modular architecture separating pure deterministic game engine mechanics from reactive UI rendering and persistence.

---

## Quick Start & Running Locally

### Prerequisites
- Node.js 22+ (tested and verified on Node.js 24 and Node.js 26)
- npm or pnpm

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build & Preview
```bash
npm run build
npm run preview
```
Open [http://localhost:4173](http://localhost:4173) in your browser.

### Test Suite Execution
```bash
npm test
```
Runs 87 automated unit, deterministic fixture, UI controller, and 20,000-round invariant fuzz tests with 100% pass rate.

---

## Implemented House Rules

- **Shoe & Shuffling**: 6 standard decks (312 cards) shuffled via the Fisher-Yates algorithm using an unbiased 128-bit PRNG. Cut card set at 75% penetration (card index 234); shoe is reshuffled between rounds during `NEW_ROUND` when the cut card is crossed.
- **Bankroll & Wagers**: Starting bankroll of 1,000 play-money chips. Bets range from 10 to 500 chips in increments of 10, strictly capped by the current available bankroll.
- **Card Values**: Aces count as 1 or 11 (automatically calculating the best non-busting total and identifying soft vs. hard totals). Face cards count as 10.
- **Dealer Rules**:
  - Upcard dealt face up; hole card dealt face down and kept hidden until player hands resolve.
  - Dealer checks for natural blackjack immediately when showing an Ace or 10-valued card. If dealer has a natural, hole card is revealed and round concludes immediately.
  - Dealer stands on all 17s (including Soft 17: S17).
- **Payouts & Accounting**:
  - Natural Blackjack (initial two-card Ace + 10-value unsplit) pays 3:2.
  - Mutual player and dealer natural blackjacks push (original wager returned).
  - Ordinary wins pay 1:1. Pushes return the original stake.
  - Profit and returned stakes are accounted for and displayed separately.
- **Player Actions**:
  - **Hit**: Draw an additional card. Busts if total exceeds 21; automatically stands on 21.
  - **Stand**: Conclude the active hand.
  - **Double Down**: Permitted on initial two cards (including Double After Split on non-ace hands) when bankroll covers the additional wager. Deducts an equal wager, deals exactly one card, and automatically stands.
  - **Split**: Permitted on identical card ranks up to four total hands when bankroll covers the additional wager. Each hand is played sequentially.
  - **Split Aces**: Each split Ace receives exactly one card and automatically stands. Resplitting split Aces is prohibited.
  - **Split 21**: A 21 on a split hand counts as an ordinary 21 (pays 1:1), not a natural blackjack.
- **Persistence & Reload**:
  - State and statistics atomically saved to `localStorage` under `blackjack.save.v1` on every state transition before animation.
  - Mid-round browser refresh safely restores active hands and wagers without lost stakes or duplicated payouts.
  - Corrupt or invalid saves are quarantined to `blackjack.save.v1.corrupt` and seamlessly reset.
  - When broke (bankroll < 10 chips), a bankroll reset to 1,000 chips is enabled between rounds.

---

## Visual Design & Accessibility Features

- **Casino Felt Aesthetic**: Deep casino green felt table (#103e32 / #0b2d24) with rich card graphics and gold accents.
- **Multi-hand Layout**: Clear visual demarcation for up to four split hands, actively highlighting the current in-play hand with badge indicators for Doubled and Split Aces.
- **Card Animations**: Smooth dealing and reveal animations, with complete zero-delay reduced-motion support (`@media (prefers-reduced-motion: reduce)`).
- **Action Guarding**: Fast-click and double-dispatch protection during dealing animations.
- **Keyboard Navigation**:
  - `D`: Deal
  - `H`: Hit
  - `S`: Stand
  - `2` or `X`: Double Down
  - `P`: Split
  - `N`: New Round
  - `R`: Reset Bankroll
  - `Escape`: Close open dialogs
  - Fully navigable with visible high-contrast focus rings.
- **Responsive Layout**: Designed and verified for mobile viewports (360px) up to high-resolution desktop displays (1440px+).
- **Accessible Dialogs**: Accessible native modal dialogs for House Rules and Gameplay Statistics.
