# Intended round machine (Quizz’em Hold’em)

This document is the **authoritative show-flow contract** between engine (`@qhe/core`), Socket.IO server (`apps/server`), host UI (`apps/host`), players, and displays. Poker **wagering** and **seven digit cards per player** mirror a table feel; **showdown resolves by numeric trivia proximity**, not poker hand ranking.

---

## Design principles

1. **Per-table phase** — Each `VENUE:tableId` session (e.g. `HOST01:1` … `HOST01:8`) has its own `GameState.phase` and `round`, but **the host drives many actions across all playable tables at once** when actions are routed venue-wide on the server.
2. **One shared trivia question per wave** — `setQuestion` (and venue-synced equivalents) aligns the active `round.question` across tables before deals; **`determineWinner` / `endRound`** use **`Question.answer`** vs each player’s **`submittedAnswer`**.
3. **Two betting waves** — `bettingRound: 1` = after hole cards, **before** board. `bettingRound: 2` = **after five community cards are dealt in one atomic step** (not flop → turn → river as separate streets in v1).
4. **Phases declared but not all exercised** — `GamePhase` includes `'reveal' | 'payout' | 'intermission'`. The **live loop today** spends most time in `lobby` → `question` → `betting` → `answering` → `showdown`, then **`endRound`** returns everyone to **`lobby`**. Unused phases are reserved for richer UX later unless wired.
5. **Busted = off the chip rails, not off the trivia** — When `bankroll` hits **`0`** after a round settles, **`pointsOnly`** latches (`endRound`): no blinds or wagering orbit, **no chip pot share**. They **stay in `players`**, accumulate **`answerPoints`** each wave they submit (closest-answer grading is the same formula for everyone non-folded who submitted), and can keep answering from the **five community** digits whenever the board is up.

---

## State machine (happy path)

```mermaid
stateDiagram-v2
  [*] --> lobby

  lobby --> question: host startGame (+ optional setQuestion)\n(engine: startGame or setQuestion)
  note right of lobby
    newGame nukes venue sessions to fresh lobby.
    assignTablesFromLobby: lobby only.
  end note

  question --> betting: host dealInitialCards\n(deal hole cards,\nposts blinds, bettingRound 1)
  note right of question
    Trivia question may be absent;
    core still allows deal from question phase.
  end note

  state betting {
    [*] --> r1_open: bettingRound 1\nisBettingOpen true
    r1_open --> r1_closed: natural completion OR\nadminCloseBetting
    r1_closed --> r2_open: host dealCommunityCards\n(all 5 community cards),\nbettingRound 2
    r2_open --> r2_closed: natural completion OR\nadminCloseBetting
  }

  betting --> answering: host startAnswering\n(requires betting closed +\n5 community cards +\nphase betting)
  note right of answering
    Server sets shared answerDeadline
    from venue default (env `ANSWER_WINDOW_SECONDS` or persisted override)
    and arms auto `revealAnswer` per table for that same wall-clock span.
  end note

  answering --> showdown: host revealAnswer\nOR timer expiry
  note right of showdown
    revealAnswer(core) sets phase showdown.
    Winner uses trivia distance,\nsee “Showdown scoring”.
  end note

  showdown --> lobby: host endRound\n(payout trivia winner,\nclear cards, dealer rotates)
```

---

## Phases (what each means)

| Phase | Intended meaning |
|--------|------------------|
| **lobby** | Between trivia rounds or after **`endRound`**. Fresh hands off; **`round.question` usually null** until **start / setQuestion** again. Rosters unchanged unless assign / join / disconnect. |
| **question** | Set up for the upcoming hand: **host may attach** `round.question` via bank / random / venue push / setlist. **Initial hole-card deal only allowed here** (`dealInitialCards`). |
| **betting** | Active wagering on **round 1 (pre-board)** or **round 2 (post-board)**. Turn order **`currentPlayerIndex`**; **`isBettingOpen`** gates player actions unless host uses **adminCloseBetting / adminAdvanceTurn**. |
| **answering** | Board is complete (**≥5 community cards** implied by server precondition), wagering closed on that table; players compose **`submittedAnswer`** by choosing **exactly five digit cards** from their holes + board (order + optional decimal), then submit before **`answerDeadline`**. |
| **showdown** | **Reveal** moment: core **`revealAnswer`** puts phase here; UI treats as “answers visible / trivia resolution prelude”. **`endRound`** performs payout + resets to **`lobby`**. |
| **reveal / payout / intermission** | **Not on the canonical path today** — avoid teaching host flows that depend on them until implemented end-to-end. |

---

## Showdown scoring (winner)

After **`phase === 'answering'`** (or logically after timer), **`revealAnswer`** moves to **`showdown`**.

- **`determineChipPotTriviaWinners`**: Among chip contestants (**`pointsOnly`** rows skipped), minimum `|answer − question.answer|`; **ties split that pot layer** evenly (whole dollars; remainder to earlier roster order among winner ids). **`determineWinner`** (deprecated, first tied id only) now mirrors chip eligibility.
- **Side pots**: **`handContributions`** tracks total chips put in per player for the hand. At **`endRound`**, **`buildSidePotSettlement`** splits unequal stacks into main/side layers; uncalled overbets are **returned**; each layer is paid to the closest trivia answer among **eligible** non-folders only (short stacks cannot win chips they were not covered for).
- **`determineTriviaWinners`**: Same distance rule computed over **every** non-folder with a submission — includes spectators so you can visualize how everyone guessed versus chips-only settlement.

- **`endRound`**: Only runs from **`phase === 'showdown'`** (wrong phase → no-op in core). Pays via **`payoutHandWithSidePots`** when **`handContributions`** exist; otherwise the legacy single-pot path. Accumulates **`answerPoints`** (`max(0, 100 − min(distance,100))`) for each roster row that **submitted** while **not folded** (**spectators included**). Latches **`pointsOnly`** wherever **`bankroll <= 0`** after payouts. Then increments **`roundId`**, clears cards/betting, rotates **`dealerIndex` modulo full roster length**, **`phase: lobby`**. **Chip total (bankrolls + pot)** is conserved; trivia points never mint chips.

Folding removes a player from chip **and** trivia scoring that wave (`hasFolded`).

**`submitAnswer` (server)** rejects values that **cannot** be built from that player’s **two holes + five board** digits using **exactly five** digit cards in order with **at most one** decimal (matches player UI).

---

## Venue-wide vs single-session actions

**Host socket** resolves **`sessionKey`** from their joined lobby or table hello. Actions that **`assertVenueHost`** and loop **`allTableSessionsInVenue`** (or similar) broadcast the same semantic step to every **numbered playable table**:

- `startGame`, `setQuestion`, `nextQuestionFromSetlist`
- `dealInitialCards`, `dealCommunityCards`
- `adminCloseBetting`, `adminSetBlinds` (where wired venue-wide), `assignTablesFromLobby`
- `startAnswering`, `revealAnswer`, `endRound`
- **`newGame`**: resets **every** session key under the venue (**including lobby path** semantics per server impl — treat as catastrophic reset).

Actions that mutate **only** **`sessionKey`** (typical **`bet`, `fold`, `check`, `call`, `raise`, `allIn`, `submitAnswer`**) affect **that table only**.

Venue-wide host cues are **lockstep**: the server refuses a step unless **every existing numbered felt** shares the same **phase street** (betting wave, clock, board depth, trivia deadline where applicable). There are **no partial venue advances** — fix any straggler felt (or use **`newGame`** cautiously as a catastrophic reset).

---

## Server guardrails worth preserving

Venue-wide mutations (`startGame`, `setQuestion`, deals, `adminCloseBetting` when used as a host hammer, `startAnswering`, `revealAnswer`, `endRound`, …) run only when **every numbered table** passes the same precondition **and** shares the same **strict phase signature** — otherwise the host gets a **sync** toast and **no table** advances.

| Transition | Guards (summary) |
|------------|-------------------|
| **`startGame`**, **`setQuestion`**, setlist advance | All felts **aligned**; `startGame` requires **lobby** everywhere; question pushes require **lobby** or **question** everywhere. |
| **`dealCommunityCards`** | `phase === 'betting'`, **`bettingRound === 1`**, **`isBettingOpen === false`**, **`communityCards.length < 5`**. Deals **five** cards and opens **`bettingRound: 2`**. |
| **`startAnswering`** | **`phase === 'betting'`**, **`bettingRound === 2`**, **`!isBettingOpen`**, **`communityCards.length ≥ 5`**. Same **`answerDeadline`** on every felt; duration = **`answerWindowSeconds`** payload if provided, else venue default (host **Save default** + `hostLibrary`, or **`ANSWER_WINDOW_SECONDS`** / **`ANSWER_WINDOW_SEC`** on bootstrap), clamped **15–300**s. Venue-wide **`revealAnswer`** timer per table matches that duration. |
| **`submitAnswer`** | **`answering`** and before **`answerDeadline`**; value must be **constructible** from holes + board (exactly five digit positions, optional decimal). |
| **`endRound`** | All tables in **`showdown`** together; wrong mix → host toast, **no payouts**. |

---

## Large all-CPU rehearsals (e.g. 20 seats)

**“Finish” (one wave)** means driving the canonical path through **`showdown`**, then host **`endRound`** so **every playable felt** lands back in **`lobby`** with payouts and cleared cards (`stateDiagram` above). A longer **event** is **multiple waves** (repeat from **`startGame`** / question / deals … **`endRound`**).

- Rosters **`maxPlayers`** default to **32** in core **`createEmptyGame`** — twenty **`vp:*`** seats in **`LOBBY`** then **Assign from lobby** splits into several numbered felts (e.g. 20 → three tables within **≤8** per felt). Only **sessions that exist** participate in venue lockstep; empty table ids are not instantiated.
- Paced CPU wagering uses **one virtual action every ~3–7s random** per **CPU-only** felt so the mosaic stays legible (`drainCpuVpSessionChain`). With many bots that becomes **hours** unless you shorten the pause: set server env **`QHE_CPU_VP_ACTION_DELAY_MS`** to a nonnegative ms value (**`50`**–**`150`** typical for rehearsals; **`0`** hammers CPU steps back-to-back in the chunked loop).
- If felts drift during wagering (different random paths), venue-wide steps block until fingerprints match — use **`adminCloseBetting`** (same street everywhere) plus waiting or **temporary** **`QHE_CPU_VP_ACTION_DELAY_MS=0`** to resync sooner.

---

## Host recovery levers

| Action | Effect |
|--------|--------|
| **adminCloseBetting** | Force-closes **open** wagering (**every table** must agree on the same street first). Use when players stall closing a wave so **`dealCommunityCards`** / **`startAnswering`** can unlock. Venue-wide lockstep enforced on the server. |
| **adminAdvanceTurn** | Advances **`currentPlayerIndex`** without validating player action — escape hatch only. |
| **revealAnswer** | Manual premature exit from **`answering`** to **`showdown`** (matches auto-timer semantics). Venue-wide fan-out where implemented. |
| **endRound** | Payout + full round cleanup → **`lobby`** venue-wide — only when **every** table is **`showdown`** together. |
| **newGame** | Fresh **`createEmptyGame`** per venue session — **destructive**. |

---

## Player actions (during `betting`)

Implemented in **`@qhe/core`**: **`check`, `call`, `raise`, `allIn`, `fold`**, plus low-level **`bet`**. Respect **`currentPlayerIndex`** and **`isBettingOpen`**. Raises enforce **minimum additive step related to big blind** in **`playerRaise`** (see core).

---

## Content (questions) and phase

- **`setQuestion`** resets **`phase` to `question`** and clears **`communityCards`** in that transition (see **`setQuestion`** in core).
- **Venue-synced** **`setQuestion`** on server applies chosen question to **all playable numbered tables**.
- Imports / CRUD mutate **persisted venue library**: **PostgreSQL** when `DATABASE_URL` is set (e.g. Railway plugin), otherwise **SQLite** under `apps/server/data/` — with one-time import from legacy JSON if the store is empty — orthogonal to phase until **`setQuestion` / random / next from setlist** fires.

---

## Display: join briefing vs venue wall overview

`/display` in **venue overview** shows **either**:

1. **`AudienceWelcomeWall`** (QR + URL + room code + “how to play”) — only while the server snapshot includes **`showAudienceWelcome: true`**. That flips to **`false`** after the host runs **`Assign from lobby`** (`markVenueShowStarted`), or after venue-wide **Start Game** if you never use lobby assign (single-table setups). It becomes **`true`** again only after host runs **New Game**, which clears that set entry and re-emits the venue snapshot.
2. **`VenueEightTablesPreview`** — a **featured table** hero (large mini-felt) plus fixed **All tables** crawl (`VenueAllTablesCrawl`) and optional **Stacks/Seating** roster strip. Until every live numbered tile remains **`lobby`**, felts **auto-rotate** for pre-start pacing; afterward the hero pins to the hottest **phase** across tables (wagering beats answering beats question, …). Numbered crawl tiles appear **after** **`Assign from lobby`** fills snapshot **`tiles`**; before that or on first-load preview, rehearsal tiles stand in until the first **`displayVenueSnapshot`**.

So: UI changes in **`AudienceWelcomeWall.tsx`** do not affect **`VenueEightTablesPreview`**; after **Assign from lobby** (or **Start Game** without assign) you will **not** see the join hero until **New Game** restores briefing.

**Production:** Express serves **`/display`** from **`apps/display/dist`**. Deploy must run **`npm run build`** at the **repo root** so the display bundle updates; building only **`apps/server`** leaves stale or missing TV assets. **`railway.toml`** runs **`scripts/railway-build.sh`**, which only runs **`npm run build`** (**`NPM_CONFIG_PRODUCTION=false`**). Railway **Railpack** runs dependency install in a **separate** step; running **`npm ci`** or **`rm -rf`** inside the **build** step conflicts with Railpack **BuildKit cache mounts** at **`/app/apps/<workspace>/node_modules/.vite`** and surfaces as **`EBUSY: rmdir`** (those paths are not deletable from the build script). Each app’s **`vite.config`** sets **`cacheDir`** under **`os.tmpdir()`** (**`quizzem-vite/<app>`**) so Vite’s own cache does not depend on **`node_modules/.vite`**. If you change this flow, read [Railpack caches](https://railpack.com/config/file#caches) first.

After deploy, **`index.html`** is sent with **`Cache-Control: no-store`** so browsers pick up new hashed JS/CSS; long-term cache applies only to **`/display/assets/*`**. On the TV tab, open DevTools → Elements on **`#root`** and check **`data-display-build`** (7-char git SHA, or **`local`** when built without CI env vars)—it must match the latest commit on GitHub for that deploy. If the shell still looks stale, inspect the **`index.html`** response in DevTools Network for **`Cache-Control`** and verify script URLs reference the new hashed **`/display/assets/`** chunks.

---

## Implementation map (where to enforce / document changes)

| Layer | Files |
|--------|--------|
| Types + transitions | `packages/core/src/index.ts` (`GameState`, **`startGame`, `setQuestion`, `dealInitialCards`, `dealCommunityCards`, `player*`**, **`submitAnswer`, `revealAnswer`, `endRound`**, **`createEmptyGame`**) |
| IO + timers + venue fan-out | `apps/server/src/index.ts` (**`action`** switch**, **`VENUE_SYNC_ACTION_TYPES`**, **`startAnswering`**, **`emitDisplayVenueSnapshotNow`** → **`hostVenueGameplayHints`** + **`hostVenueFeltBeat`**), **`QHE_CPU_VP_ACTION_DELAY_MS`** (paced CPU-only drain) |
| Host UX | `apps/host/src/App.tsx` (library, gameplay hints, **venue 1–8 felt beat strip**, deals, admins) |
| Net | `packages/net` (**`hostVenueFeltBeat`**, **`HostVenueFeltBeatPayload`**) |
| Player UX | `apps/player` emits **`action`** payloads constrained by **`GameState`** subscriptions |
| Display | Read-only **`state`** + optional **`DISPLAY` snapshots** |

---

## Changelog hygiene

When you change **preconditions** for any transition, update **this file** and any host-blocking hint text derived from stale assumptions (`dealInitialBlocked`, **`dealCommunityHint`**, **`startAnswering`** toasts, etc.) in the **same PR**.
