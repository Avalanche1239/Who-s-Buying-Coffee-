# Who's Buying Coffee? MVP Design

## Objective

Ship a mobile-first web service quickly on Cloudflare Pages so groups can decide who buys coffee through short, fair, coffee-themed games. The first audience is coworkers and friends, while the internal design leaves room for later lunch, team, and ordering decisions.

## Product Scope

The MVP supports 2 to 12 participants on one device. Users enter names, start a recommended game or choose one of three games, see the result, and can replay or exclude the selected payer. Recent participant names are stored locally.

Included:

- Participant entry and validation
- Coffee Cup Roulette
- Receipt Bomb Coffee
- Overflow Coffee Pass
- Cryptographically secure random selection
- Result, replay, and exclude-winner flows
- Local recent-participant storage
- Reduced-motion support
- License and attribution page

Excluded from the MVP:

- Accounts, server storage, analytics, or tracking
- Room codes and multi-device play
- Real-time voting or secret results
- Weighted odds or history-based balancing
- Team creation, bill splitting, and menu selection
- User-uploaded media

## Brand and Visual Direction

The public name is **Who's Buying Coffee?** The product should feel like a cheerful game tool with a coffee theme, not a generic random picker or a quiet lifestyle app.

- Warm cream background
- Dark espresso text
- Caramel-orange primary actions
- Mint for safe/exempt states
- Cherry red for the payer/result state
- Original SVG/CSS illustrations of cups, beans, receipts, and steam
- Calm setup screens with more energetic result animations

Pretendard Variable is the only typeface. It is self-hosted, unmodified, and distributed with its SIL Open Font License 1.1 text. Weight usage: 400-500 for body content, 600-700 for controls, and 700-800 for headings and results.

## User Flow

1. The home screen asks for 2 to 12 participant names.
2. Whitespace is trimmed, duplicates are rejected, and names are limited to 20 characters.
3. The browser remembers the most recent valid participant list when storage is available.
4. The user selects Quick Start or chooses a game.
5. The result is determined before animation with Web Crypto.
6. Animation reveals the predetermined result.
7. The result screen shows the payer, timestamp, participant count, and equal-odds statement.
8. The user can replay, replay without the payer, or return home.

## Games

### Coffee Cup Roulette

All participants have equal odds. A secure selection happens at start, cups rotate for roughly 3 to 5 seconds, then the selected cup moves to the center. Input is locked during the animation.

### Receipt Bomb Coffee

Participant order is securely shuffled. An equal number of face-down cups is shown, with one predetermined receipt cup. Participants select one unused cup in turn. A normal cup passes play to the next participant; revealing the receipt selects the current participant as payer. Shuffling turn order prevents the same entered participant from consistently receiving a positional advantage.

### Overflow Coffee Pass

Participant order is securely shuffled. The overflow turn is chosen before play and can occur only after every participant has acted at least once. Each tap increases the visible coffee gauge and passes control. The participant whose tap causes overflow becomes the payer. The hidden overflow turn is never exposed in page state intended for display.

## Fairness and Randomness

- Use `crypto.getRandomValues()` exclusively for result selection and shuffling.
- Use rejection sampling when converting random integers to bounded ranges, avoiding modulo bias.
- Animation never determines or changes a result.
- Default odds are equal and cannot be edited in the MVP.
- Every replay creates new randomness.
- No history-based or weighted mode is included.
- The result view explains equal odds without exposing security-sensitive implementation details.

## Architecture

Use React, Vite, and TypeScript, producing a static build for Cloudflare Pages. Workers are deferred until a server-backed feature is justified by real usage.

Modules have narrow responsibilities:

- `participants`: validation and participant-list operations
- `random`: secure bounded integers, shuffling, and selection
- `game-engine`: shared game lifecycle and result contracts
- `games`: isolated rules and presentation for each game
- `result`: reveal, replay, and exclude-payer actions
- `storage`: versioned and failure-tolerant local persistence
- `licenses`: bundled third-party notices and asset provenance

Game rules should be pure functions wherever possible. UI components consume typed state and events without implementing randomness directly.

## Data and Privacy

No participant data leaves the device. The application has no accounts, analytics, advertising SDK, or tracking pixels in the MVP. `localStorage` contains only a schema version, recent participant names, and non-sensitive display preferences. If storage is unavailable or corrupt, the app continues for the current session and safely resets invalid persisted data.

## Error Handling and Accessibility

- Block start for fewer than 2 or more than 12 participants.
- Reject blank and duplicate names after normalization.
- Disable repeated input while transitions are active.
- Restart an in-progress game after a reload instead of restoring ambiguous partial state.
- Show a clear unsupported-browser message when Web Crypto is unavailable.
- Respect `prefers-reduced-motion` and offer functional, short reveal transitions.
- Support keyboard navigation, visible focus, semantic controls, and sufficient color contrast.
- Do not communicate state through color alone.

## Licensing and Copyright Policy

The project must not include assets or dependencies without a clear license compatible with commercial web distribution.

- Use only original SVG/CSS artwork created for this project.
- Do not imitate protected toy, game, cafe, or character designs.
- Do not include third-party photos, icons, music, or sound effects in the MVP.
- Keep Pretendard's original font name and files, and bundle its `OFL.txt`.
- Record direct runtime and development dependencies in `THIRD_PARTY_LICENSES.md` with package name, version, license, and canonical source.
- Verify package metadata and upstream license files before installation and again before release.
- Preserve all required copyright and license notices.
- Fail the release checklist if any asset has unknown provenance or an incompatible license.

## Testing

- Unit-test unbiased bounded random generation and permutation validity.
- Test participant validation at 2 and 12 participants and invalid boundary cases.
- Test whitespace, blank names, duplicate names, and 20-character limits.
- Test every game state transition and repeated-interaction lockout.
- Test persistence recovery from missing, blocked, and malformed storage.
- Test replay and exclude-payer behavior.
- Test keyboard operation, visible focus, reduced motion, and mobile layouts.
- Verify production builds and direct-route reload behavior for Cloudflare Pages.
- Run dependency and asset license audits before release.

## Success Criteria

- A first-time visitor can start a game within 30 seconds without instructions.
- All three games work for 2 to 12 participants on current mobile and desktop browsers.
- No server, login, or personal-data transmission is required.
- Random outcomes use the documented equal-odds mechanism.
- Production contains no unlicensed or unattributed third-party asset.
- The static build deploys successfully to Cloudflare Pages.

## Project Location and Deployment

The repository lives at `D:\projects\whos-buying-coffee`. Cloudflare Pages hosts the initial static build. A Worker, D1 database, or Durable Object may be introduced only through a later design when a validated multi-device or account requirement exists.
