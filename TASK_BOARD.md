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
  - Objective: Double Down, Split (up to 4 hands, rank matching, split ace 1-card limit, split 21 = 1:1, DAS), multi-hand settlements, localStorage persistence & stats, smooth card animations with reduced-motion support, keyboard shortcuts & visible focus, comprehensive fixture tests (Groups E, F, G, H / S12-S26).
  - Status: In Progress
- **TASK-004-VERIFICATION**: Parallel review (Opus 5.5 w4T:p6), adversarial review (Grok 4.7 w4T:p3), and independent testing (Pi w4T:p4).
  - Status: Pending TASK-003-STAGE2-FULL.
