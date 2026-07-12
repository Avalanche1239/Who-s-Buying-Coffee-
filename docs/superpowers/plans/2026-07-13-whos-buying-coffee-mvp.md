# Who's Buying Coffee? MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a mobile-first, static Cloudflare Pages web app where 2 to 12 people choose a coffee payer through three fair coffee-themed games.

**Architecture:** React renders typed game state produced by small pure TypeScript modules. Web Crypto is isolated behind a random-number interface, each game owns its rules, and browser persistence is isolated behind a failure-tolerant adapter. Vite emits a static site; no backend, account, analytics, or remote asset is included.

**Tech Stack:** React, React DOM, TypeScript, Vite, Vitest, Testing Library, CSS, self-hosted Pretendard Variable, Cloudflare Pages

## Global Constraints

- Repository path is `D:\projects\whos-buying-coffee`.
- Support 2 to 12 participants; trim names, reject blanks and duplicates, and limit names to 20 characters.
- Use `crypto.getRandomValues()` with rejection sampling; never use `Math.random()`.
- Determine results before animation; animation cannot alter a result.
- Store only versioned recent participant names and display preferences in `localStorage`.
- No backend, accounts, analytics, advertising, tracking, remote media, user uploads, or weighted odds.
- Use original SVG/CSS artwork only; do not add third-party icons, photos, music, or sound effects.
- Self-host unmodified Pretendard Variable with its original SIL OFL 1.1 license text.
- Verify every dependency's canonical license before installation and record exact installed versions in `THIRD_PARTY_LICENSES.md`.
- Respect reduced motion, keyboard navigation, visible focus, semantic controls, and sufficient contrast.
- Produce a static Vite build suitable for Cloudflare Pages.

---

### Task 1: Licensed Project Foundation and Participant Validation

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/types/participant.ts`
- Create: `src/features/participants/validateParticipants.ts`
- Create: `src/features/participants/validateParticipants.test.ts`
- Create: `THIRD_PARTY_LICENSES.md`

**Interfaces:**
- Produces: `Participant { id: string; name: string }`
- Produces: `validateParticipantNames(names: string[]): ValidationResult`
- Produces: `ValidationResult = { ok: true; participants: Participant[] } | { ok: false; code: ValidationErrorCode }`

- [ ] **Step 1: Verify and install the minimal toolchain**

Inspect the canonical `license` metadata and upstream license files for React, React DOM, Vite, TypeScript, Vitest, jsdom, Testing Library React, Testing Library DOM, and Testing Library user-event. Reject any package whose exact installed version lacks a commercially compatible license. Then initialize npm and install exact pinned versions; do not use caret or tilde ranges.

Run:

```powershell
npm init -y
npm install --save-exact react react-dom
npm install --save-dev --save-exact typescript vite @vitejs/plugin-react vitest jsdom @testing-library/react @testing-library/dom @testing-library/user-event @types/react @types/react-dom
npm pkg set scripts.dev="vite" scripts.build="tsc -b && vite build" scripts.test="vitest run" scripts.test:watch="vitest" scripts.license:check="npm query .license"
```

Expected: commands exit 0, `package-lock.json` is created, and `package.json` contains exact versions without `^` or `~`.

- [ ] **Step 2: Write participant validation tests**

Create `src/features/participants/validateParticipants.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { validateParticipantNames } from './validateParticipants'

describe('validateParticipantNames', () => {
  it('trims and converts 2 to 12 unique names', () => {
    expect(validateParticipantNames([' Mina ', 'Joon'])).toEqual({
      ok: true,
      participants: [
        { id: 'participant-0', name: 'Mina' },
        { id: 'participant-1', name: 'Joon' },
      ],
    })
  })

  it.each([
    { names: ['Mina'], code: 'too-few' },
    { names: Array.from({ length: 13 }, (_, i) => `P${i}`), code: 'too-many' },
    { names: ['Mina', '   '], code: 'blank-name' },
    { names: ['Mina', 'mina'], code: 'duplicate-name' },
    { names: ['A'.repeat(21), 'Joon'], code: 'name-too-long' },
  ] as const)('rejects $code', ({ names, code }) => {
    expect(validateParticipantNames([...names])).toEqual({ ok: false, code })
  })
})
```

- [ ] **Step 3: Run the test and verify failure**

Run: `npm test -- src/features/participants/validateParticipants.test.ts`

Expected: FAIL because `validateParticipants.ts` does not exist.

- [ ] **Step 4: Implement participant types and validation**

Create `src/types/participant.ts` and `src/features/participants/validateParticipants.ts`:

```ts
export interface Participant {
  id: string
  name: string
}
```

```ts
import type { Participant } from '../../types/participant'

export type ValidationErrorCode =
  | 'too-few'
  | 'too-many'
  | 'blank-name'
  | 'duplicate-name'
  | 'name-too-long'

export type ValidationResult =
  | { ok: true; participants: Participant[] }
  | { ok: false; code: ValidationErrorCode }

export function validateParticipantNames(names: string[]): ValidationResult {
  if (names.length < 2) return { ok: false, code: 'too-few' }
  if (names.length > 12) return { ok: false, code: 'too-many' }
  const trimmed = names.map((name) => name.trim())
  if (trimmed.some((name) => name.length === 0)) return { ok: false, code: 'blank-name' }
  if (trimmed.some((name) => [...name].length > 20)) return { ok: false, code: 'name-too-long' }
  const normalized = trimmed.map((name) => name.toLocaleLowerCase())
  if (new Set(normalized).size !== normalized.length) return { ok: false, code: 'duplicate-name' }
  return {
    ok: true,
    participants: trimmed.map((name, index) => ({ id: `participant-${index}`, name })),
  }
}
```

- [ ] **Step 5: Configure Vite, TypeScript, Vitest, and the minimal React entry**

Configure `vite.config.ts` with React and `test: { environment: 'jsdom', globals: true }`. Configure strict TypeScript with DOM libraries. `src/main.tsx` must render `<App />`; `src/App.tsx` initially renders `<main><h1>Who's Buying Coffee?</h1></main>`.

- [ ] **Step 6: Record dependency provenance**

Create `THIRD_PARTY_LICENSES.md` with one row per exact installed direct dependency: package, exact version from `package-lock.json`, SPDX license, canonical repository, and license-file path. Do not summarize a license whose upstream text has not been inspected.

- [ ] **Step 7: Verify and commit**

Run: `npm test -- src/features/participants/validateParticipants.test.ts; npm run build; npm run license:check`

Expected: validation tests PASS, build exits 0, and the license query reports no missing direct-package license.

Commit:

```powershell
git add package.json package-lock.json vite.config.ts tsconfig*.json index.html src THIRD_PARTY_LICENSES.md
git commit -m "feat: establish licensed app foundation"
```

### Task 2: Secure Randomness and Shared Game Contracts

**Files:**
- Create: `src/lib/random/secureRandom.ts`
- Create: `src/lib/random/secureRandom.test.ts`
- Create: `src/features/games/types.ts`

**Interfaces:**
- Produces: `RandomSource = (target: Uint32Array) => Uint32Array`
- Produces: `secureInt(maxExclusive: number, source?: RandomSource): number`
- Produces: `secureShuffle<T>(items: readonly T[], source?: RandomSource): T[]`
- Produces: `chooseOne<T>(items: readonly T[], source?: RandomSource): T`
- Produces: `GameId = 'roulette' | 'receipt-bomb' | 'overflow-pass'`

- [ ] **Step 1: Write failing secure-random tests**

Test that `secureInt(0)` and non-integers throw, a supplied deterministic source rejects values outside the unbiased limit, shuffle preserves every item without mutating input, and `chooseOne([])` throws. Use deterministic sources such as `(target) => (target[0] = 7, target)`; never mock with `Math.random()`.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- src/lib/random/secureRandom.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement unbiased bounded integers and Fisher-Yates shuffle**

Use this algorithm in `secureRandom.ts`:

```ts
export type RandomSource = (target: Uint32Array) => Uint32Array
const nativeSource: RandomSource = (target) => crypto.getRandomValues(target)

export function secureInt(maxExclusive: number, source: RandomSource = nativeSource): number {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 0x1_0000_0000) {
    throw new RangeError('maxExclusive must be an integer between 1 and 2^32')
  }
  const range = 0x1_0000_0000
  const limit = range - (range % maxExclusive)
  const buffer = new Uint32Array(1)
  do source(buffer)
  while (buffer[0] >= limit)
  return buffer[0] % maxExclusive
}

export function secureShuffle<T>(items: readonly T[], source: RandomSource = nativeSource): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = secureInt(i + 1, source)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function chooseOne<T>(items: readonly T[], source: RandomSource = nativeSource): T {
  if (items.length === 0) throw new RangeError('Cannot choose from an empty list')
  return items[secureInt(items.length, source)]
}
```

- [ ] **Step 4: Define shared game types**

Create `src/features/games/types.ts` with `GameId`, `GameSummary`, and `GameResult { gameId: GameId; payerId: string; participantCount: number; drawnAt: string }`.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/lib/random/secureRandom.test.ts; npm run build`

Expected: PASS and build exits 0.

Commit: `git add src/lib/random src/features/games/types.ts && git commit -m "feat: add unbiased secure random engine"`

### Task 3: Versioned Local Storage and Participant Entry UI

**Files:**
- Create: `src/lib/storage/preferences.ts`
- Create: `src/lib/storage/preferences.test.ts`
- Create: `src/features/participants/ParticipantForm.tsx`
- Create: `src/features/participants/ParticipantForm.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `loadPreferences(storage?: Storage): Preferences`
- Produces: `savePreferences(value: Preferences, storage?: Storage): boolean`
- Produces: `ParticipantForm({ initialNames, onSubmit })`

- [ ] **Step 1: Write failing storage tests**

Cover valid version-1 JSON, malformed JSON, the wrong schema version, an object with non-string names, and a storage object whose methods throw. The fallback must be `{ version: 1, recentNames: [], reducedMotion: false }` and saves must return `false` rather than throw.

- [ ] **Step 2: Implement the failure-tolerant adapter**

Use a single key, `whos-buying-coffee.preferences`, validate every parsed field, cap restored names at 12, and never persist game-in-progress state.

- [ ] **Step 3: Write failing participant form tests**

Test initial two rows, adding rows up to 12, removing no lower than 2, visible Korean validation copy, keyboard submission, and successful submission of trimmed names.

- [ ] **Step 4: Implement the participant form**

Render labeled text inputs, Add/Remove controls, inline error text with `role="alert"`, and a primary `게임 시작` submit button. Map validation codes to explicit Korean strings; keep validation logic out of the component.

- [ ] **Step 5: Connect App state and persistence**

`App` loads recent names once, falls back to two empty rows, saves only after valid submission, and changes from setup to game selection without a router dependency.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- src/lib/storage/preferences.test.ts src/features/participants/ParticipantForm.test.tsx; npm run build`

Expected: all focused tests PASS and build exits 0.

Commit: `git add src && git commit -m "feat: add participant setup and local preferences"`

### Task 4: Game Selection and Coffee Cup Roulette

**Files:**
- Create: `src/features/games/GamePicker.tsx`
- Create: `src/features/games/roulette/roulette.ts`
- Create: `src/features/games/roulette/roulette.test.ts`
- Create: `src/features/games/roulette/RouletteGame.tsx`
- Create: `src/features/games/roulette/RouletteGame.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `createRouletteResult(participants, now?, source?): GameResult`
- Produces: `RouletteGame({ participants, onComplete })`
- Consumes: `chooseOne`, `Participant[]`, `GameResult`

- [ ] **Step 1: Write the failing roulette rule test**

Use a deterministic `RandomSource` and fixed clock. Assert the chosen participant, `gameId: 'roulette'`, participant count, and ISO timestamp. Assert an empty list throws.

- [ ] **Step 2: Implement `createRouletteResult` as a pure function**

Choose the payer once through `chooseOne`; never choose again during rendering or animation.

- [ ] **Step 3: Write the failing component test**

Use fake timers. Assert the start button locks after one click, `onComplete` is not called before the reveal interval, and receives the already-created result after the interval. Add a reduced-motion case with a short transition.

- [ ] **Step 4: Implement the roulette view and picker**

Use semantic buttons and original CSS cup shapes. `GamePicker` exposes Quick Start plus three explicit games. Quick Start uses secure selection among the three game IDs.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/features/games/roulette; npm run build`

Expected: focused tests PASS and build exits 0.

Commit: `git add src && git commit -m "feat: add coffee cup roulette"`

### Task 5: Receipt Bomb Coffee

**Files:**
- Create: `src/features/games/receipt-bomb/receiptBomb.ts`
- Create: `src/features/games/receipt-bomb/receiptBomb.test.ts`
- Create: `src/features/games/receipt-bomb/ReceiptBombGame.tsx`
- Create: `src/features/games/receipt-bomb/ReceiptBombGame.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `createReceiptBombState(participants, source?): ReceiptBombState`
- Produces: `pickReceiptCup(state, cupId, now?): ReceiptBombState`
- State includes shuffled `turnOrder`, `cups`, `activeTurn`, `selectedCupIds`, and optional `result`.

- [ ] **Step 1: Write failing state-machine tests**

Assert deterministic shuffled order, exactly one receipt cup, refusal of an already selected cup, advancing after a safe cup, and final `GameResult` after the receipt cup. Assert input participant order is not mutated.

- [ ] **Step 2: Implement immutable receipt-bomb transitions**

Create every random decision in `createReceiptBombState`. `pickReceiptCup` performs no random call and returns a new state. Reject invalid cup IDs and picks after completion.

- [ ] **Step 3: Write failing UI interaction tests**

Assert current participant text, disabled revealed cups, one state transition per click, receipt reveal copy, and no click after completion.

- [ ] **Step 4: Implement the UI with original cup and receipt CSS/SVG**

Use buttons for cups, accessible labels including cup number and status, and a live region for turn changes. Do not import an icon package.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/features/games/receipt-bomb; npm run build`

Expected: focused tests PASS and build exits 0.

Commit: `git add src && git commit -m "feat: add receipt bomb coffee game"`

### Task 6: Overflow Coffee Pass

**Files:**
- Create: `src/features/games/overflow-pass/overflowPass.ts`
- Create: `src/features/games/overflow-pass/overflowPass.test.ts`
- Create: `src/features/games/overflow-pass/OverflowPassGame.tsx`
- Create: `src/features/games/overflow-pass/OverflowPassGame.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `createOverflowState(participants, source?): OverflowState`
- Produces: `advanceOverflow(state, now?): OverflowState`
- State includes shuffled `turnOrder`, `currentTap`, `overflowTap`, `currentParticipantId`, and optional `result`.

- [ ] **Step 1: Write failing rule tests**

Assert shuffled immutable order, `overflowTap >= participantCount + 1`, correct participant rotation, no result before overflow, a result on the chosen tap, and refusal to advance after completion.

- [ ] **Step 2: Implement the pure overflow state machine**

Choose `overflowTap` once in `createOverflowState` within `[participantCount + 1, participantCount * 3]`. `advanceOverflow` increments exactly once and determines the payer from the participant active on that tap.

- [ ] **Step 3: Write failing component tests**

Assert the current participant name, one increment per button press, gauge `aria-valuenow`, disabled input during a brief transition, and payer reveal on overflow.

- [ ] **Step 4: Implement the component**

Build the cup and liquid level with CSS, expose the gauge as a progressbar, and keep `overflowTap` out of visible text and DOM attributes.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/features/games/overflow-pass; npm run build`

Expected: focused tests PASS and build exits 0.

Commit: `git add src && git commit -m "feat: add overflow coffee pass game"`

### Task 7: Result Flow, Replay, and Exclude Payer

**Files:**
- Create: `src/features/result/ResultScreen.tsx`
- Create: `src/features/result/ResultScreen.test.tsx`
- Create: `src/features/result/resultActions.ts`
- Create: `src/features/result/resultActions.test.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `excludePayer(participants, payerId): Participant[]`
- Produces: `ResultScreen({ result, participants, onReplay, onExcludeAndReplay, onHome })`

- [ ] **Step 1: Write failing result-action tests**

Assert payer removal, immutability, preservation of order, and refusal to exclude when only two participants remain because a valid game requires two players.

- [ ] **Step 2: Implement result actions**

Return a discriminated result: `{ ok: true, participants }` or `{ ok: false, code: 'minimum-participants' }`.

- [ ] **Step 3: Write failing result-screen tests**

Assert payer name, Korean result copy, participant count, equal-odds statement, localized timestamp, replay, exclude-and-replay availability, and home action.

- [ ] **Step 4: Implement and wire the result flow**

`App` becomes the sole screen coordinator with states `setup`, `picker`, `playing`, and `result`. Replay creates a fresh game state; exclude-and-replay updates participants before creating it.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/features/result; npm run build`

Expected: focused tests PASS and build exits 0.

Commit: `git add src && git commit -m "feat: add result and replay flows"`

### Task 8: Visual System, Font License, Accessibility, and Static Hosting

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `src/styles/games.css`
- Create: `public/fonts/PretendardVariable.woff2`
- Create: `public/fonts/OFL.txt`
- Create: `public/_headers`
- Create: `public/_redirects`
- Create: `src/features/licenses/LicensePage.tsx`
- Create: `src/features/licenses/LicensePage.test.tsx`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Modify: `THIRD_PARTY_LICENSES.md`

**Interfaces:**
- Produces: shared CSS tokens and an in-app license view linked from every screen.

- [ ] **Step 1: Obtain Pretendard only from its canonical release**

Download the unmodified variable WOFF2 and exact OFL 1.1 text from the official Pretendard repository release. Verify filenames and repository license. Do not use a font CDN. Record the release/tag and canonical URL in `THIRD_PARTY_LICENSES.md`.

- [ ] **Step 2: Write the failing license-page test**

Assert visible entries for Pretendard, SIL Open Font License 1.1, the bundled license-file link, and the statement that game illustrations are original project SVG/CSS.

- [ ] **Step 3: Build the responsive visual system**

Define cream, espresso, caramel, mint, and cherry tokens; minimum 44px interactive targets; visible `:focus-visible`; responsive content width; and `@media (prefers-reduced-motion: reduce)` that removes nonessential transforms and shortens transitions. Use only local CSS and original inline SVG/CSS shapes.

- [ ] **Step 4: Add Cloudflare Pages static configuration**

`public/_redirects` contains `/* /index.html 200`. `public/_headers` applies `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, a restrictive permissions policy, and a CSP allowing only same-origin assets with no remote fonts, scripts, or images. Confirm Vite's emitted inline behavior is compatible before finalizing CSP.

- [ ] **Step 5: Run accessibility-oriented component checks**

Verify every interactive control has a semantic name, game status uses live regions sparingly, focus moves to result heading after reveal, and state is not communicated by color alone. Add component tests for the focus and reduced-motion branches.

- [ ] **Step 6: Verify and commit**

Run: `npm test; npm run build; npm run license:check`

Expected: all tests PASS, build exits 0, `dist/fonts/PretendardVariable.woff2` and license text exist, and no missing direct dependency license is reported.

Commit: `git add src public THIRD_PARTY_LICENSES.md && git commit -m "feat: add licensed visual system and pages config"`

### Task 9: Release Audit and Cloudflare Pages Readiness

**Files:**
- Create: `docs/release-checklist.md`
- Create: `README.md`
- Modify: `THIRD_PARTY_LICENSES.md`

**Interfaces:**
- Produces: repeatable local verification and exact Cloudflare Pages settings.

- [ ] **Step 1: Write the release checklist**

Include: test/build pass, direct-package license verification, transitive-license scan, asset provenance, font OFL presence, no remote network request, no `Math.random`, no analytics, 2/12-player manual tests, keyboard test, reduced-motion test, and production preview smoke test.

- [ ] **Step 2: Write deployment documentation**

`README.md` specifies Node version used, `npm ci`, `npm test`, `npm run build`, Cloudflare build command `npm run build`, output directory `dist`, no environment variables, and rollback by selecting the previous Pages deployment.

- [ ] **Step 3: Run the complete release audit**

Run:

```powershell
npm ci
npm test
npm run build
rg -n "Math\.random|https?://" src public
npm run license:check
npm run dev
```

Expected: clean install succeeds; all tests and build pass; no `Math.random`; URLs appear only in documented license/provenance material, not runtime fetches; license query has no missing direct license; local app starts.

- [ ] **Step 4: Smoke-test the production build**

Run `npm run build` and preview `dist`. Manually complete each game once with 2 participants and once with 12 participants, verify refresh resets an in-progress game, verify stored recent names restore, and verify the license page opens.

- [ ] **Step 5: Final repository check and commit**

Run: `git status --short; git log --oneline --decorate -10`

Expected: only intentional release-document changes are uncommitted before the commit.

Commit:

```powershell
git add README.md docs/release-checklist.md THIRD_PARTY_LICENSES.md
git commit -m "docs: add release and deployment audit"
```

Do not deploy until the user explicitly requests deployment and authorizes access to the intended Cloudflare account/project.
