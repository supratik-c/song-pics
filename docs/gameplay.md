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
`client/src/navigation.ts`. The composition root supplies the requested ID to
the puzzle loader, so content selection does not read browser globals. Archive
rendering similarly receives a URL callback and does not inspect location.
Adjacent-issue navigation uses the same archive ordering and URL callback:
Previous Issue selects the next, chronologically older archive entry, while
Next Issue selects the preceding, newer entry. The unavailable direction stays
visible but disabled at the oldest and latest boundaries.

The generated archive index is chronological. The client assigns contiguous
issue numbers from that ordering, so the earliest available puzzle is Issue #1
and missing calendar dates do not create gaps. The main eyebrow is
`Issue #N - display date`; the clue remains unprefixed; archive links are
`Issue #N - song clue`. The newest archive link omits the query parameter while
older links preserve it.

## Guess matching

`client/src/gameConfig.ts` exposes the single durable gameplay-policy object,
`GAME_RULES`, currently allowing a maximum of five attempts and a 64-character
answer. Feature-local values such as archive page size stay beside their
only consumer rather than becoming global configuration.

`client/src/game.ts` owns answer normalization and matching. Normalization:

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

All terminal states disable further guesses and turn Reveal Song into View
Result. A solved result reveals the canonical song and artist, uses the success
treatment, and may embed the configured YouTube video. A manually revealed
result may also embed the video. A failed result reveals the answer without a
video. Closing a result removes its content so any embedded video stops.

Terminal results open immediately when reached but do not reopen automatically
when a saved puzzle is revisited.

Every terminal outcome offers the same spoiler-free puzzle invitation at the
bottom of its result dialog and in the persistent main game region. The
invitation uses the dated issue URL, whose link preview identifies the first
clue panel. Solved invitations include the number of recorded attempts with
singular or plural wording; failed and manually revealed invitations use the
same playful surrender challenge. They never include the solution, artist, or
submitted guess text. The share request derives this performance synchronously
from the latest in-memory state when the control is activated, including for a
restored terminal state whose result dialog does not reopen automatically.

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
Completion is refreshed whenever Previous Issues opens. Lookup failure leaves
navigation usable and simply omits completion markers.

The authored wire JSON uses the single current puzzle shape, while its runtime
contract is split by capability: `PuzzleClue` contains ID, date, issue, clue,
and panels;
`PuzzleSolution` contains title, artist, accepted answers, and optional video;
`Puzzle` combines them. Views and domain functions accept the narrowest useful
contract, reducing accidental solution access.

If a future backend validates guesses, publicly load only `PuzzleClue` and
replace the local synchronous use case with an asynchronous validation gateway.
The server should own its authoritative rules. Keep browser and server behavior
aligned through the shared normalization/date JSON fixtures rather than adding
a root TypeScript package solely to share implementation.
