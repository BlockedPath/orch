
                      ████████████╗
                      ████████████║
                      ████╔═══████║
                      ████║   ████║
                      ████████╬═══████╗
                      ████████║   ████║
                      ████╔═══╝   ████║
                      ████║       ████║
                      ╚═══╝       ╚═══╝

               There are many agent harnesses,
                    but this one is yours.


 Model: muse-spark-1.3-contributor


 Task Brief:
 Task ID: TASK-002-REPO-TEST-RESEARCH
 Objective: Inspect the repository and tooling environment,
 verify documentation, identify implementation/browser
 constraints, and design independent deterministic test
 fixture specifications and test suite structure for the
 single-player TypeScript blackjack game.
 Relevant files and current commit: README.md, commit
 135ca1eb9c3de430ab9bf4d508c4a9affbbb26ac.
 Dependencies: None.
 Files you own or may edit: Read-only/design ownership for
 this task. Do not edit repository files; report findings and
 proposed test specifications.

 Acceptance criteria:
 1. Environment and tooling assessment: Verify Node v26,
    npm/pnpm, recommend minimal dependency setup (e.g. Vite +
    TypeScript + Vitest).
 2. Independent test specification: Define exact card deck
    sequence fixtures (rigged shoes) to test:
     - Multiple aces and dynamic transitions between soft and
       hard totals (e.g. A+6 -> A+6+A -> A+6+A+8).
     - Natural blackjacks: Player natural (3:2), dealer
       natural (loss), mutual naturals (push), split-hand 21
       (1:1).
     - Dealer standing on soft 17 (e.g., A+6 stands, does not
       draw).
     - Busts, dealer busts, ties/pushes, exact chip
       accounting (profit vs returned stake).
     - Double down: correct chip deduction, exactly one card
       dealt, automatic stand. Insufficient funds handling.
     - Splits: rank matching, up to 4 hands max, split ace
       restrictions (1 card only, auto stand, no resplit),
       split 21 payout.
     - State/Phase guards: illegal actions rejected in each
       phase, repeated click idempotency.
     - Persistence: reload policy consistency, preventing
       balance duplication or loss mid-round.
 3. Test requirements and proposed test structure to hand off
    to Codex for implementation.

 Checks required: Check environment capabilities and verify
 test fixture determinism.

 Expected output format:
 Please report using this exact structure:
 - Task ID: TASK-002-REPO-TEST-RESEARCH
 - Status: (working, blocked, ready for review, or complete)
 - Files changed and commit: (none / N/A)
 - Findings with evidence: (repo tooling, Node/npm
   capabilities, test constraints)
 - Proposed Independent Tests & Deterministic Fixtures:
   (concrete fixture tables and test scenarios)
 - Checks run and results: (environment verification)
 - Unresolved issues: (if any)
 - Next action needed: (test handoff to Codex)



 todo + Inspect repo and README at commit
 ○ pending



 todo + Verify Node/npm tooling environment
 ○ pending



 todo + Design deterministic fixtures and test structure
 ○ pending



 todo → Inspect repo and README at commit
 ◐ in progress



 read ~/dev/orch/README.md



 $ git rev-parse HEAD; echo "---"; git log --oneline -5; echo
 "---"; git status --short; echo "---"; ls -la

 ... (8 earlier lines, ctrl+o to expand)
 drwxr-xr-x@ 45 justin  staff  1440 Oct  4 03:02 ..
 drwxr-xr-x@ 12 justin  staff   384 Oct  4 03:44 .git
 -rw-r--r--@  1 justin  staff     6 Oct  4 03:32 README.md
 -rw-r--r--@  1 justin  staff  2714 Oct  4 03:43
 TASK_BOARD.md

 Took 0.1s



 read ~/dev/orch/TASK_BOARD.md



 $ git show --stat HEAD; echo "==="; cat README.md; echo
 "==="; ls -la .git/refs/heads/ 2>&1; git branch -a

 ... (12 earlier lines, ctrl+o to expand)
 drwxr-xr-x@ 5 justin  staff  160 Oct  4 03:32 ..
 -rw-r--r--@ 1 justin  staff   41 Oct  4 03:32 main
 * main
   remotes/origin/HEAD -> origin/main
   remotes/origin/main

 Took 0.1s



 todo → Inspect repo and README at commit
 ● completed



 todo → Verify Node/npm tooling environment
 ◐ in progress



 $ node --version; npm --version; pnpm --version 2>&1; echo
 "---"; which node npm pnpm npx tsc vite vitest 2>&1; echo
 "---"; npm --version && node -p "process.versions" 2>&1 |
 head -20; echo "---"; sw_vers 2>&1 | head -5; uname -m

 ... (31 earlier lines, ctrl+o to expand)
 ---
 ProductName:      macOS
 ProductVersion:      27.2
 BuildVersion:      26B5086k
 arm64

 Took 0.7s



 $ ls /Users/justin/.nvm/versions/node/ 2>&1; echo "---"; nvm
 ls 2>&1 | head -30; echo "---"; echo $PATH; echo "---"; ls
 /opt/homebrew/bin/node* /usr/local/bin/node* 2>&1; echo
 "---"; cat ~/.nvmrc 2>&1; cat .nvmrc 2>&1; echo "---"; env |
 grep -i -E "^(PI_|NODE|NVM|PATH)" | head -20

 ... (72 earlier lines, ctrl+o to expand)
 c3b-442e66df3e65.jsonl
 PI_PROVIDER=meta
 PI_SESSION_ID=01a105bc-bedb-726b-9c3b-442e66df3e65
 NVM_BIN=/Users/justin/.nvm/versions/node/v24.15.0/bin
 PI_REASONING_LEVEL=max

 Took 0.0s



 $ /opt/homebrew/bin/node --version 2>&1;
 /opt/homebrew/bin/npm --version 2>&1; echo "---brew---";
 brew list --versions node 2>&1 | head -5; echo "---tsc---";
 tsc --version 2>&1; echo "---vite/vitest global?---"; npm ls
 -g --depth=0 2>&1 | head -30; echo "---corepack---";
 corepack --version 2>&1; echo "---registry check---"; npm
 ping 2>&1 | head -5

 ... (34 earlier lines, ctrl+o to expand)
 ---corepack---
 0.35.0
 ---registry check---
 npm notice PING https://registry.npmjs.org/
 npm notice PONG 303ms

 Took 4.2s


 Diagnosing PATH precedence between nvm Node 24 and brew Node
 26 and clarifying pnpm version versus path.


 $ echo "=== pnpm details ==="; pnpm --version; ls
 /Users/justin/Library/pnpm/bin/ 2>&1 | head;
 /opt/homebrew/bin/pnpm --version 2>&1; echo "===
 package.json? ==="; ls package.json pnpm-lock.yaml
 package-lock.json vite.config.* tsconfig* 2>&1; echo "===
 npm registry versions ==="; npm view vite version 2>&1 |
 tail -2; npm view vitest version 2>&1 | tail -2; npm view
 typescript version 2>&1 | tail -2

 ... (8 earlier lines, ctrl+o to expand)
 ls: vite.config.*: No such file or directory
 === npm registry versions ===
 8.3.2
 5.0.3
 7.0.2

 Took 3.7s



 $ echo "=== browsers ==="; which google-chrome chromium
 chromium-browser firefox safari 2>&1; ls
 "/Applications/Google Chrome.app"
 "/Applications/Chromium.app" "/Applications/Firefox.app"
 2>&1 | head; echo "=== playwright/puppeteer cache ==="; ls
 ~/.cache/ms-playwright 2>&1 | head; echo "=== xcode sim?
 ==="; xcode-select -p 2>&1; echo "=== git ==="; git
 --version; git config user.name 2>&1; git config user.email
 2>&1

 ... (11 earlier lines, ctrl+o to expand)
 /Library/Developer/CommandLineTools
 === git ===
 git version 2.54.0 (Apple Git-157)
 justin
 justinjbarlow92@gmail.com

 Took 0.1s



 $ echo "=== engines ==="; npm view vite engines 2>&1 | tail
 -5; npm view vitest engines 2>&1 | tail -5; echo "=== chrome
 version ==="; "/Applications/Google
 Chrome.app/Contents/MacOS/Google Chrome" --version 2>&1;
 "/Applications/Firefox.app/Contents/MacOS/firefox" --version
 2>&1 | head -2; echo "=== jsdom/happy-dom versions ==="; npm
 view jsdom version 2>&1 | tail -1; npm view happy-dom
 version 2>&1 | tail -1; npm view @vitest/coverage-v8 version
 2>&1 | tail -1

 ... (5 earlier lines, ctrl+o to expand)
 Mozilla Firefox 154.0.1
 === jsdom/happy-dom versions ===
 30.1.1
 20.14.5
 5.0.3

 Took 10.1s


 Confirming Node and toolchain versions meet requirements and
 noting PATH precedence before designing fixtures.


 $ cat > /tmp/seed_check.mjs <<'EOF'
 // Determinism PoC: mulberry32 + Fisher-Yates must produce
 identical shoes on any Node
 function mulberry32(a){return
 function(){a|=0;a=a+0x6D2B79F5|0;let
 t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;retu
 rn((t^t>>>14)>>>0)/4294967296}}
 function shoe(seed,n=52){const d=[...Array(n).keys()];const
 r=mulberry32(seed);for(let i=n-1;i>0;i--){const
 j=Math.floor(r()*(i+1));[d[i],d[j]]=[d[j],d[i]]}return d}
 const a=shoe(42).join(','), b=shoe(42).join(',');
 console.log("node",process.version,"self-consistent:",a===b,
 "head:",shoe(42).slice(0,8).join('-'));
 EOF
 echo "--- nvm node ---"; node /tmp/seed_check.mjs; echo "---
 brew node26 ---"; /opt/homebrew/bin/node
 /tmp/seed_check.mjs; echo "--- cross-version hash compare
 ---"; node /tmp/seed_check.mjs | md5; /opt/homebrew/bin/node
 /tmp/seed_check.mjs | md5 | sed 's/node.*/HEAD-CHECK/'; node
 -e "import('/tmp/seed_check.mjs')" 2>/dev/null;
 /opt/homebrew/bin/node --input-type=module -e "import fs
 from 'fs';const
 src=fs.readFileSync('/tmp/seed_check.mjs','utf8').replace(/c
 onsole.log.*/,'');eval(src);console.log(shoe(42).slice(0,8).
 join('-'))"; node --input-type=module -e "import fs from
 'fs';const
 src=fs.readFileSync('/tmp/seed_check.mjs','utf8').replace(/c
 onsole.log.*/,'');eval(src);console.log(shoe(42).slice(0,8).
 join('-'))"

 ... (49 earlier lines, ctrl+o to expand)

 Node.js v24.15.0


 Command exited with code 1

 Took 0.7s


 Confirming cross-version determinism and drafting the final
 report with fixture notation.

 Defining blackjack rule assumptions and hand-valuation test
 cases with ace handling.

 Extending test cases for split, double, and dealer soft-17
 rules with balance and phase guards.


 $ rm -f /tmp/seed_check.mjs

 (no output)

 Took 0.1s



 todo → Verify Node/npm tooling environment
 ● completed



 todo → Design deterministic fixtures and test structure
 ◐ in progress


 Composing the final report with deal-order assumptions and
 balance equation while marking the todo complete.

 Validating hand-value rules and natural-blackjack detection
 against edge cases.

 Adding dealer soft-17 stand and bust accounting test cases
 with balance assertions.

 Extending tests to double-down and split scenarios with
 stake and hand-count assertions.

 Adding phase-guard and idempotency tests for split actions
 and fund checks.

 Extending tests to persistence, reload refunds, and
 determinism with injected adapters and seeded RNG.


 todo → Design deterministic fixtures and test structure
 ● completed


 - Task ID: TASK-002-REPO-TEST-RESEARCH

 - Status: ready for review

 - Files changed and commit: none / N/A (read-only task; repo
   untouched at 135ca1eb9c3de430ab9bf4d508c4a9affbbb26ac,
   main)

 - Findings with evidence: (repo tooling, Node/npm
   capabilities, test constraints)
     1. Repo is greenfield. git rev-parse HEAD =
        135ca1eb9c3de430ab9bf4d508c4a9affbbb26ac, matching
        the brief and TASK_BOARD baseline. git show --stat
        HEAD shows the initial commit contains only README.md
         (1 line: # orch). No package.json, lockfile,
        tsconfig, or vite.config exists. Only other file is
        untracked TASK_BOARD.md (board state, not part of the
        commit). Nothing to contradict; Codex starts from
        scratch.
     2. README verifies trivially but documents nothing.
        Content is # orch — no rules, architecture, or setup
        docs. All rule decisions are pending from TASK-001
        (planner); assumptions used in fixtures below are
        flagged per-case.
     3. Node v26 verified — with a PATH caveat. The brief
        asks for Node v26: present via Homebrew
        (/opt/homebrew/bin/node --version → v26.4.0, npm
        11.17.0, matching TASK_BOARD). BUT the default shell
        PATH resolves node to nvm v24.15.0 (npm 12.0.2)
        because /Users/justin/.nvm/versions/node/v24.15.0/bin
         precedes /opt/homebrew/bin. Only v24.15.0 exists
        under ~/.nvm/versions/node/ (no .nvmrc). Both
        versions satisfy the current toolchain engines (see
        below), but Codex/CI must pin one explicitly
        (recommend .nvmrc + engines field, or always invoke
        brew Node) to avoid "works on my pane" drift.
     4. Package managers + registry healthy. pnpm 11.21.0
        (nvm path; no brew pnpm), corepack 0.35.0, npm ping →
        PONG (~303ms). Registry (Oct 2026): vite@8.3.2,
        vitest@5.0.3, typescript@7.0.2, jsdom@30.1.1,
        happy-dom@20.14.5, @vitest/coverage-v8@5.0.3. Engine
        requirements: Vite 8 needs ^20.19.0 || >=22.12.0;
        Vitest 5 needs ^22.12.0 || ^24.0.0 || >=26.0.0 —
        satisfied by both installed Nodes. Global tsc is
        6.0.3 (behind registry 7.0.2); recommend Codex pins a
        local TypeScript (5.x stable line or 6.x/7.x only if
        TASK-001 accepts bleeding-edge risk — TS 6/7 may have
        breaking strictness changes).
     5. Recommended minimal stack (per acceptance criterion
        1): vite + typescript + vitest + happy-dom +
        @vitest/coverage-v8. Rationale: zero-config TS + DOM
        testing, Node-built-in alternative (node:test)
        rejected because UI/persistence tests need a DOM and
        coverage; happy-dom preferred over jsdom for speed
        (either fine). No other runtime deps needed — engine
        must be dependency-free pure TS.
     6. Browser baseline is modern. Chrome 154.0.8037.93 and
        Firefox 154.0.1 installed; no Playwright cache
        (~/.cache/ms-playwright absent — real-browser E2E
        would need a download, so default to happy-dom
        component tests; add Playwright only if TASK-001
        demands it). ES2022+ language features safe; no
        transpile concerns beyond Vite defaults.
     7. Implementation constraints for testability (handoff
        requirements for Codex):
         - Pure engine: src/engine/* must not import DOM,
           localStorage, timers, or Math.random. All
           randomness enters via an injected Shoe (explicit
           card array) or documented seeded RNG; persistence
           via an injected storage adapter.
         - Single action entry point, e.g. dispatch(state,
           action) -> Result<State, GameError>, with typed
           rejection errors (IllegalPhase, InsufficientFunds,
           MaxHandsReached, …) so guard tests assert reasons,
           not silent no-ops.
         - Explicit phase state machine (IDLE → PLAYER →
           DEALER → ROUND_OVER), serializable state (JSON
           round-trip), and a balance ledger (debit/credit
           log) so tests can separate returned stake from
           profit.
         - Shoe consumption must be observable (cards dealt /
           pointer) so tests catch phantom draws (e.g. dealer
           drawing on naturals or after player bust).

 - Proposed Independent Tests & Deterministic Fixtures:
   (concrete fixture tables and test scenarios)
     - Notation. Cards as RankSuit: ranks A,2–9,T,J,Q,K;
       suits S,H,D,C (cosmetic). A rigged shoe is an array
       consumed front-to-back in standard deal order: [P1,
       D-up, P2, D-hole, …hits/draws in turn order]. Default
       bankroll fixture B0=1000, base bet 100 unless stated.
       Balance equation: B_final = B0 − totalStaked +
       totalReturned (totalReturned includes stake).
     - Assumptions pending TASK-001 (each fixture notes its
       dependency): blackjack pays 3:2; dealer stands on all
       17 incl. soft 17 (per brief); split by rank-match
       (T≠J≠Q≠K) up to 4 hands; split aces = 1 card each,
       auto-stand, no resplit; double on any first two; no
       insurance/surrender; single-round settlement API.
       Where a ruling could flip, both expectations are
       given.
     - Group A — Hand valuation (pure evaluateHand, no shoe):
        A1 [A,6]→17 soft; A2 [A,6,A]→18 soft (11+6+1); A3
       [A,6,A,8]→16 hard (brief's exact soft→soft→hard
       sequence); A4 [A,A]→12 soft; A5 [A,9]→20 soft; A6
       [A,9,A]→21 soft, not natural; A7 [T,A]→21 natural
       (natural ⟺ exactly 2 cards totalling 21); A8
       [A,K,5]→16 hard; A9 [5,5,A]→21 soft; A10 [T,6,7]→23
       bust; A11 [A,5,9]→15 hard (soft→hard transition down);
       A12 [9,6,A]→16 hard; A13 [A,A,A,A,9]→13 hard (4-ace
       stress); A14 [K,Q]→20 hard.
     - Group B — Naturals (B0=1000, bet=100): B1 player
       natural shoe=[AS,9D,KH,7C] → P 21 natural, D 16; round
       ends immediately, dealer does not draw (pointer stays
       4); B=1150 (stake 100 + profit 150). B2 dealer natural
       [9S,AD,7H,KC] → P 16, D natural; player cannot act;
       B=900. B3 mutual [AD,AS,KC,KH] → both natural, push;
       B=1000, profit 0. B4 split-21 pays 1:1 → see F3/F4. B5
       3-card 21 ≠ natural [5S,9D,6H,7C,TS,TC] → P 5+6 hits T
       = 21 (3 cards), stands; D 9+7=16 draws T → 22 bust; P
       wins 1:1, B=1100 not 1150.
     - Group C — Dealer soft-17 stand: C1 [TS,AD,7H,6C] → P
       17 stands; D A+6 soft 17 stands, no draw (pointer
       stays 4); push B=1000. C2 [TS,AD,8H,6C] → P 18 vs D
       soft-17 stand; P wins B=1100. C3 hard-16 draws
       [TS,TD,7H,6C,5S] → D T+6=16 draws 5 → 21; P loses
       B=900, pointer=5. C4 soft<17 hits, soft≥17 stands
       [9S,AD,8H,2C,5S] → P 17; D A+2=soft13 draws 5 → soft18
       stands; P loses B=900. C5 dealer bust [TS,9D,7H,6C,8S]
        → D 9+6=15 draws 8 → 23 bust; B=1100.
     - Group D — Busts / pushes / accounting matrix: D1
       player bust [TS,9D,6H,6C,8S] → P T+6 hits 8 = 24 bust;
       immediate loss, dealer never draws (pointer=5); B=900
       even though dealer "would bust". D2 dealer bust = C5.
       D3 push [TS,TD,7H,7C] → 17 vs 17, B=1000. D5 matrix
       (bet 100): win→1100, natural→1150, loss→900, bust→900,
       push→1000 — assert profit and returnedStake separately
        (natural: returned 100 + profit 150; push: returned
       100 + profit 0).
     - Group E — Double down: E1 win [5S,6D,6H,TC,TS,9H] → P
       5+6=11 vs D 6+T=16; double deducts +100 (staked 200),
       deals exactly one card T → 21, auto-stands (further
       hit rejected); D 16 draws 9 → 25 bust; return 400 →
       B=1200; assert hand len 3, pointer advanced exactly 1
       during double. E2 loss [5S,6D,6H,TC,2S,5H] → P 13; D
       16+5=21; B=800. E3 push [5S,TD,6H,6C,9S,4H] → P 20; D
       T+6=16+4=20; 200 returned; B=1000. E4 insufficient
       funds: B0=150, bet 100 (avail 50) → double rejected
       (InsufficientFunds), no card (pointer=4), still PLAYER
       turn, may hit/stand instead. E5 double after a hit (3
       cards) → rejected (IllegalAction), no deduction. E6
       double-bust variant (needs "double any first two"
       ruling): P T+2=12 doubles +T → 22 bust, B=800; if
       TASK-001 restricts double to 9/10/11, E6 instead
       expects rejection.
     - Group F — Splits: F1 [8S,6D,8H,TC, TS,9H, 7C] → 8+8 vs
       D 6+T=16; split (+100, staked 200); H1=8+T=18,
       H2=8+9=17; D draws 7 → 23 bust; both win → return 400,
       B=1200. F2 resplit-to-4 [8S,6D,8H,TC, 8D,TS,9H,
       8C,TH,7S,6H, 5C]: split → H1=8+8 resplit (staked 300)
       → H1a=8+T=18, H1b=8+9=17; H2=8+8 resplit (4th hand,
       staked 400) → H2a=8+T=18, H2b=8+7 hits 6 = 21; D
       16+5=21; H1a/H1b/H2a lose, H2b pushes; returned 100 →
       B=700. F2b cap: a 5th split opportunity (deal H2b an 8
       → pair of 8s at 4 hands) → rejected MaxHandsReached,
       must play 16 as-is. F3 split aces [AS,6D,AH,9C, KS,AD,
       KH] → A+A vs D 6+9=15; split (+100); H1=A+K=21
       auto-stand (hit rejected); H2=A+A=soft 12, no resplit,
       1 card only, auto-stand on 12; D 15+K=25 bust; both
       pay 1:1 → return 400, B=1200 (wrongly paying H1 as
       natural 3:2 → 1250 = caught); pointer=7. F4 non-ace
       split-21-is-not-natural [TS,9D,TH,6C, AS,8H, KC] →
       split Tens; H1=T+A=21 (natural=false, 1:1), H2=T+8=18;
       D 9+6=15+K=25 bust; B=1200 (3:2 overpay → 1250 =
       caught). F5 T+Q split rejected under rank-match (J+J,
       K+K, T+T accepted) — invert if TASK-001 rules
       value-match. F6 B0=150/bet=100 pair → split rejected,
       play hard 16. F7 DAS (double-after-split except split
       aces): fixture slot reserved pending TASK-001.
     - Group G — Phase guards & idempotency: G1 full (phase ×
       action) matrix over IDLE / PLAYER / DEALER /
       ROUND_OVER: IDLE rejects hit/stand/double/split,
       accepts bet; PLAYER rejects bet/deal; DEALER and
       ROUND_OVER reject all player actions; ROUND_OVER
       accepts new bet. Every rejection is a typed error with
       state deep-equal before/after. G2 double-dispatch
       idempotency: fire hit/stand/double/split/deal twice in
       the same tick — first applies, second is
       rejected/no-op (pointer, hand length, deductions,
       settlement credit each change exactly once;
       stand-twice credits balance once). G3 action targeting
       non-active split hand → rejected. G4 bet
       0/negative/over-balance, and deal-with-no-bet →
       rejected.
     - Group H — Persistence / reload: recommended policy P1
       refund-in-flight: store settles {balanceSettled,
       lastSettledRoundId} in one atomic JSON write;
       in-flight stakes refunded on load, settlement replayed
       only if roundId ≠ lastSettledRoundId. H1: settled 900
       + 100 in-flight → reload → B=1000 IDLE; second reload
       → still 1000 (no double refund). H2: settled 1100 →
       reload → 1100 twice (no double credit). H3: 400 staked
       across 4 split hands → full refund. H4: corrupt/legacy
       save → reset to default bankroll, warn, no throw,
       playable. H5: balance moves only at bet-debit and
       settlement-credit (property test over full action log;
       no other action touches balance).
     - Proposed test structure (handoff to Codex):
       ```
         src/engine/  types.ts cards.ts hand.ts shoe.ts
       rng.ts game.ts persistence.ts   # zero-dep pure TS
         src/ui/      ...
       # DOM layer only
         tests/fixtures/shoes.ts   # shoe("AS","9D",...)
       builder + deal-order helpers + seeded RNG
         tests/unit/  hand.spec.ts (A) · shoe.spec.ts (seed
       determinism, empty-shoe policy)
                      game-naturals.spec.ts (B) ·
       game-dealer.spec.ts (C) · game-settle.spec.ts (D)
                      game-double.spec.ts (E) ·
       game-split.spec.ts (F) · guards.spec.ts (G)
                      persistence.spec.ts (H)
         tests/integration/round.spec.ts  # end-to-end rounds
       via public dispatch() using fixtures B1–F4
         tests/ui/ (happy-dom) betting.spec.ts
       actions.spec.ts  # buttons mirror guards; fake timers
         vitest.config.ts  # node env default, happy-dom for
       tests/ui, coverage ≥90% on src/engine
       ```
       Determinism contract: every fixture pins the full shoe
       array; seeded-shuffle tests pin exact sequences; each
       round test asserts shoe-pointer consumption; no
       Math.random/Date.now() in engine paths (inject fakes).

 - Checks run and results: (environment verification)
     1. git rev-parse HEAD → 135ca1eb… matches brief; git
        status --short clean except untracked TASK_BOARD.md;
        README.md = # orch. ✅
     2. node --version (PATH) → v24.15.0;
        /opt/homebrew/bin/node --version → v26.4.0 ✅
        (criterion met, PATH-precedence caveat documented
        above); npm 11.17.0 (brew) / 12.0.2 (nvm); pnpm
        11.21.0; corepack 0.35.0; npm ping PONG ✅.
     3. Registry/engines: vite@8.3.2 needs ^20.19.0 ||
        >=22.12.0 ✅; vitest@5.0.3 needs ^22.12.0 || ^24.0.0
        || >=26.0.0 ✅ on both Nodes; happy-dom@20.14.5 /
        jsdom@30.1.1 / @vitest/coverage-v8@5.0.3 available
        ✅. No local toolchain files (greenfield confirmed)
        ✅.
     4. Browsers: Chrome 154 + Firefox 154 present ✅; no
        Playwright cache (happy-dom path recommended) ✅. Git
        2.54.0, identity configured ✅.
     5. Determinism PoC (mulberry32 + Fisher–Yates, seed 42):
        Node v24.15.0 and v26.4.0 both self-consistent AND
        cross-version identical (head:
        41-47-14-25-51-34-6-49) ✅ — proves seeded fixtures
        are runtime-independent; temp script removed
        afterwards. (One sloppy eval-based re-probe errored
        on scoping — irrelevant; the direct runs are the
        evidence.)
     6. Fixture determinism review: every scenario above uses
        a fully pinned shoe + pinned bankroll/bet with exact
        expected balances and pointer assertions — no
        randomness, no wall-clock, no DOM dependency in
        engine tests. ✅

 - Unresolved issues:
     1. Rules owned by TASK-001 still open and able to flip
        fixture expectations: insurance; surrender; double
        range (any-two vs 9/10/11); split value-vs-rank;
        double-after-split (DAS); resplit-aces; deck count /
        penetration / reshuffle-on-empty policy; default
        bankroll; confirmation of 3:2 and
        dealer-stands-soft-17. Fixtures carry per-case
        fallback expectations, but Codex must not implement
        until TASK-001 lands.
     2. Node version pinning: PATH-default Node is v24 while
        the board standard is v26 — needs .nvmrc + engines
        (Codex task) to prevent drift.
     3. Local TypeScript line (5.x stable vs 6.x/7.x)
        unpinned — recommend 5.x unless planner accepts
        bleeding-edge risk.
     4. Persistence policy P1 (refund-in-flight) is a
        recommendation, not a ruling — planner to confirm;
        H-group tests assume it.

 - Next action needed: (test handoff to Codex)
     - Hand this spec + TASK-001's rules/architecture to
       coder (TASK-003) as the binding acceptance suite:
       implement src/engine per §7 testability constraints,
       then tests per the structure above with all Group A–H
       fixtures green; reviewer/adversary (TASK-004) to
       re-run fixtures independently against the
       implementation.

○ Todos (3/3)
├─ ✓ Inspect repo and README at commit
├─ ✓ Verify Node/npm tooling environment
└─ ✓ Design deterministic fixtures and test structure

──────────────────────────────────────────────────────────────

──────────────────────────────────────────────────────────────
 pi-lens
░▒▓ 🤖 muse-spark-1.3-contributor 🪟 ctx 4.1%/1.0m
🔌 LSP Inactive • 🔌 telegram disconnected • 🔌 ▁▃▁▂▂▅▂▃▁█▁▂
121 tps · μ 155 · p95 343