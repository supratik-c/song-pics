# Gameplay Architecture

This document describes the durable game rules and progress model. See
[architecture.md](architecture.md) for the system overview.

## Puzzle selection and numbering

Puzzle IDs are release dates in `YYYY-MM-DD` form. With no `puzzle` query
parameter, the game opens the latest released puzzle. A valid released
`?puzzle=YYYY-MM-DD` value opens that archive entry; invalid or unavailable
values fall back to the latest puzzle. A future date produces the dedicated
future-puzzle view rather than attempting to fetch its answer data.

Query parsing and archive URL construction are pure functions in
`client/src/domain/navigation.ts`. The composition root supplies the requested ID to
the puzzle loader, so content selection does not read browser globals. Archive
rendering similarly receives a URL callback and does not inspect location. All
Releases is the single in-app browsing surface for selecting another released
puzzle.

The generated archive index is chronological. The client assigns contiguous
issue numbers from that ordering, so the earliest available puzzle is Issue #1
and missing calendar dates do not create gaps. The main eyebrow is
`Issue #N · D Mon YY`; the clue remains unprefixed; archive links are
`Issue #N - song clue`. The newest archive link omits the query parameter while
older links preserve it.

## Guess matching

`client/src/domain/gameConfig.ts` exposes the single durable gameplay-policy
object, `GAME_RULES`, currently allowing a maximum of five attempts and a
64-character answer. Feature-local values such as archive page size stay
beside their only consumer rather than becoming global configuration.

`client/src/domain/game.ts` owns answer matching; normalization itself lives
in `client/shared/textNormalization.mjs`, shared with `scripts/puzzleValidation.mjs`
so an answer is judged the same way at authoring time and at play time:

- lowercases text, removes accents and punctuation, converts `&` to `and`, and
  collapses whitespace.

`submitGuess` rejects raw input longer than `GAME_RULES.maxAnswerLength` before
normalization.

A normalized guess matches any normalized `acceptedAnswers` entry. Empty
answers and repeated normalized guesses do not consume an attempt. Artist text
has no special matching behavior: partial or complete artist guesses consume an
attempt like any other incorrect guess, and adding artist text to a song title
does not produce a match unless that complete value is explicitly accepted.
The Reveal Artist button is the only pre-solve path that reveals the artist.
Players receive five non-duplicate normalized guesses by default.

Puzzle content should include the canonical title and genuinely useful
alternate titles in `acceptedAnswers`, but should not duplicate variants already
covered by normalization or enumerate `Song by Artist` permutations.

## State transitions and results

State changes are immutable domain operations rather than behavior embedded in
DOM handlers:

- `createInitialGameState()` creates a new playing state;
- `submitGuess(state, rawGuess, solution, rules)` evaluates one guess and
  returns a `GuessSubmission` without mutating its inputs;
- `revealSong(state)` returns the revealed state only while play is active.

`GuessSubmission` is discriminated by `kind`. A `recorded` result contains the
next state. An `invalid` result identifies `too-long`, `empty`, `duplicate`, or
`not-playing`; expected input problems do not use exceptions or consume an
attempt. Terminal operations are no-ops. This keeps transitions testable
without a DOM and gives the application one explicit place to map domain
outcomes to messages and focus behavior.

Game state contains normalized guesses and one status:

| Status | Meaning | Entry path |
| --- | --- | --- |
| `playing` | Guesses and hint controls remain available | New or unfinished puzzle |
| `solved` | The answer matched | Correct guess |
| `revealed` | The player chose to reveal the song | Reveal Song while playing |
| `failed` | No guesses remain | Fifth incorrect guess |

All terminal states replace the guess form and action grid with an inline
result. A solved result reveals the canonical song and artist, uses the success
treatment, and may offer the configured YouTube video. A manually revealed
result may also offer it. The initial control and linked privacy notice are
local and create no third-party media request. Activating
`Watch YouTube Video` creates the privacy-enhanced player and external YouTube
fallback link and grants consent for the current browser-tab session. Later
solved or revealed results in that session load the player automatically. A
failed result reveals the answer without a video control regardless of consent.

When authored lyric lines exist, every terminal state also reveals them beneath
their corresponding clue panels. They remain absent from the DOM while play is
active and appear immediately for newly reached and restored terminal states.
Puzzles without lyric lines retain the same terminal flow without captions.

Terminal results render inline immediately when reached and when a saved puzzle
is revisited. A newly reached result receives keyboard focus and scrolls the
page to the bottom, using immediate rather than smooth scrolling when reduced
motion is preferred. Restored results do not move focus or scroll the page.
YouTube consent is not game state. A restored solved or revealed result loads
the player automatically when the current tab session has consent and otherwise
returns to the unloaded local control and notice. Automatic loading does not
move focus.

Every terminal outcome offers the same spoiler-free puzzle invitation in a
persistent main game region kept separate from the inline result. The
invitation uses the dated issue URL, whose link preview identifies the first
clue panel. Solved invitations include the number of recorded attempts with
singular or plural wording; failed and manually revealed invitations use the
same playful surrender challenge. They never include the solution, artist, or
submitted guess text. The share request derives this performance synchronously
from the latest in-memory state when the control is activated, including for a
restored terminal state.

`getPuzzlePerformance` is a pure terminal read model containing puzzle ID,
outcome, and recorded attempts. It returns no performance while play continues
and performs no persistence or network access. It may support future local
statistics, but a competitive leaderboard must use server-owned validation
rather than trusting client-derived performance.

## Persistence and completion

`GameStateStore` is a synchronous `load`/`save` boundary. Its browser adapter
uses `localStorage` under a key derived from the puzzle ID in production; Vite
development deliberately disables persistence and starts clean. Unavailable
storage, access failures, and quota errors degrade to in-memory gameplay rather
than breaking the game.

`YouTubeConsentStore` is a separate synchronous browser preference boundary.
The first video activation records the versioned value `granted` in
`sessionStorage` under `scribble-bops:youtube-consent:v1`. The preference is
shared across navigation and reloads in the same tab and ends with that tab
session; it is not copied into puzzle progress or `localStorage`. Unavailable
session storage falls back to memory for the current page only.

Stored data is untrusted and must match the current `{ guesses, status }`
contract exactly. Guesses must be unique, non-empty normalized strings within
the attempt limit, and their count must agree with the status: `playing` and
`revealed` remain below the limit, `solved` has at least one attempt, and
`failed` is exactly at the limit. A malformed or inconsistent record is
best-effort removed as a whole and play starts clean; no fields are recovered
and no previous format is migrated.

`CompletionSource` is a separate asynchronous read-model boundary. Its local
implementation derives completed IDs from terminal states returned by the
state store; it is not folded into the storage adapter because a future
account-backed completion API may have different ownership and timing.
Completion is refreshed whenever All Releases opens. Lookup failure leaves
navigation usable and simply omits completion markers.

The authored wire JSON uses the single current puzzle shape, while its runtime
contract is split by capability: `PuzzleClue` contains ID, date, issue, clue,
and panels;
`PuzzleSolution` contains title, artist, accepted answers, optional video, and
optional lyric lines;
`Puzzle` combines them. Views and domain functions accept the narrowest useful
contract, reducing accidental solution access.

If a future backend validates guesses, publicly load only `PuzzleClue` and
replace the local synchronous use case with an asynchronous validation gateway.
The server should own its authoritative rules. Keep browser and server behavior
aligned through the shared normalization/date JSON fixtures rather than adding
a root TypeScript package solely to share implementation.
