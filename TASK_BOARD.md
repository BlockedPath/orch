# Blackjack Project Task Board & Decision Log

## Baseline & Agent Roster
- Project Path: `/Users/justin/dev/orch`
- Git commit baseline: `135ca1eb9c3de430ab9bf4d508c4a9affbbb26ac` (clean branch `main`)
- Environment: macOS, Node.js `v26.4.0`, npm `11.17.0`, pnpm `v24.15.0/bin/pnpm`

### Agent Roster & Verified Configuration
| Role | Pane ID | Herdr Agent Name | Harness | Configured Model & Mode | Status |
|---|---|---|---|---|---|
| Main Coordinator | `w4T:p5` | `agy` | Antigravity agy | Gemini 3.8 Flash (high thinking) | Active / Coordinating |
| Planner / Architect | `w4T:p1` | `planner` | Claude Code v2.1.289 | Opus 5.5 (xhigh effort) | Ready |
| Primary Coder | `w4T:p2` | `coder` | OpenAI Codex v0.160.0 | GPT-6.1 Sol (high effort, fast mode, Default mode) | Ready |
| Adversarial Reviewer | `w4T:p3` | `adversary` | Grok | Grok 4.7 (xhigh effort) | Ready |
| Researcher / Tester | `w4T:p4` | `tester` | Pi | Muse Spark 1.3 (max thinking) | Ready |
| Primary Reviewer | `w4T:p6` | `reviewer` | Claude Code v2.1.289 | Opus 5.5 (xhigh effort) [Switched from Fable 5.1] | Ready |

---

## Decision Log
1. **Model & Mode Normalization**:
   - `w4T:p2` (Codex) was initially in Plan mode with medium effort; switched via `shift+tab` to Default agent mode running `GPT-6.1 Sol high fast`.
   - `w4T:p6` (Claude Code primary reviewer) was initially set to Fable 5.1; switched via `/model opus` to `Opus 5.5 xhigh effort` to meet requirements.
   - Herdr agents renamed to descriptive semantic identifiers: `planner`, `coder`, `adversary`, `tester`, `reviewer`.
2. **Project Architecture Direction**:
   - Clean separation between core Blackjack game engine (pure TypeScript, deterministic, fully unit-testable) and UI/rendering layer (DOM/canvas/CSS component with animations, accessible keyboard navigation, responsive layout).
   - Minimal dependency stack (Vite + TypeScript + Vitest/node test runner).

---

## Active Task Board
- **TASK-001-ARCH-PLAN**: Game design, rules formalization, architecture, acceptance criteria, vertical slice staging.
  - Assigned: `planner` (`w4T:p1`, Claude Code Opus 5.5)
  - Status: COMPLETE. Full architecture, state machine, rules R1-R18, invariant specifications I1-I7, and test matrix S1-S26 delivered.
- **TASK-002-REPO-TEST-RESEARCH**: Repository inspection, tooling setup recommendations, independent deterministic test fixture specifications.
  - Assigned: `tester` (`w4T:p4`, Pi Muse Spark 1.3)
  - Status: COMPLETE. Tooling (Vite + TypeScript + Vitest) verified; test fixtures A through H designed with deterministic RNG proof.
- **TASK-003-STAGE1-SLICE**: Stage 1 Playable Vertical Slice Implementation.
  - Assigned: `coder` (`w4T:p2`, Codex GPT-6.1 Sol)
  - Status: COMPLETE. Engine, card deck/shoe, hand evaluator, S17, 3:2 natural, dealer peek, betting, basic UI table, and 38 Vitest unit/fixture tests passing. Production build verified.
- **TASK-003-STAGE2-FULL**: Stage 2 Full Features Implementation.
  - Assigned: `coder` (`w4T:p2`, Codex GPT-6.1 Sol)
  - Status: COMPLETE. All 77 unit, fixture, persistence, and fuzz tests passing. Clean build (`dist/`). Frozen at commit `22e0849551f43225a151dd1b7672b122c370e950`.
- **TASK-004-VERIFICATION-PRIMARY**: Independent Primary Code & Specification Review.
  - Assigned: `reviewer` (`w4T:p6`, Claude Code)
  - Target commit: `22e0849`
  - Findings: Verified 16 independent custom probes passing; verified real headless Chrome layout rendering at 360px and 1440px; verified keyboard shortcuts and focus indicators. Identified Node 26 global webstorage shadowing in vitest config (resolved).
  - Status: COMPLETE.
- **TASK-004-VERIFICATION-ADVERSARIAL**: Adversarial Security, Rules, State Corruption & Exploit Review.
  - Assigned: `adversary` (`w4T:p3`, Grok 4.7 xhigh)
  - Target commit: `22e0849`
  - Findings: Evaluated payout matrix, S17, split aces, 4-hand cap, phase guards, 300 automated rounds, and corrupt save quarantines. 0 blocking issues. Recommends tightening split-ace hit guard (applied) and refining broke banner wording (applied).
  - Status: COMPLETE.
- **TASK-004-VERIFICATION-TESTING**: Independent Test & Fixture Execution & Verification.
  - Assigned: `tester` (`w4T:p4`, Pi Muse Spark 1.3 max)
  - Target commit: `22e0849`
  - Findings: Verified 24 scenario fixtures (S1–S14, S16–S22, S25, S26), T-BET, T-HAND, guard matrix, P1–P11, and 20,000-round fuzz test. Verified Node 26 `--no-experimental-webstorage` flag.
  - Status: COMPLETE.
- **TASK-005-INTEGRATION-DELIVERY**: Final Integration, Smoke Testing & Release Verification.
  - Assigned: `coordinator` (`w4T:p5`, Gemini 3.8 Flash)
  - Checks: 87/87 tests passing on Node 26, `npm run build` cleanly packaging production bundle in 60ms, preview server verified on `http://localhost:4173`, full house rules documented.
  - Status: COMPLETE & READY FOR DELIVERY.

- **TASK-006-REVIEW-FIXES-DEPLOY**: Fix consolidated primary-reviewer and tester findings, re-verify, and deploy.
  - Assigned: `coder` (`w4T:p2`), with primary review by `w4T:p6` and testing by `w4T:p4` and `w4T:p7`.
  - Review follow-up on `593877f`: all three confirmed malformed-save gaps. The primary reviewer also retained non-blocking findings for PRNG warm-up, missing/corrupt save-key recovery, rules text, stale notices, animation skip, and terminal-capture documentation.
  - Fixes: validate doubled/split-ace statuses and provenance, unresolved naturals, opening card order, prior auto-resolved totals, settlement end reasons, and outgoing snapshots. Preserve valid exact resume, retries, and stale-tab protection. Recover deleted/corrupt keys, mix fresh seeds, clear notices, add animation skip and bankroll count-up, normalize InvariantError, update rules, and clean docs.
  - Checks: 104 tests and production build passing; all three exact `w4T:p7` saved repros now reject at first load. Historical test counts: 85 at `22e0849`, 87 at `593877f`.
  - Status: Fixes implemented; final independent verification and deployment pending.
  - Additional final-review fixes: animation completion focuses the neutral table so late/repeated Space does not hit; bankroll interpolation clamps at zero; every non-pending hand requires at least two cards. Failing-before focus and one-card regressions now pass. Suite: 107 tests; build clean.
