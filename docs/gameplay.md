# Gameplay Architecture

This document describes the durable game rules and progress model. See
[architecture.md](architecture.md) for the system overview.

## Puzzle selection and numbering

Puzzle IDs are release dates in `YYYY-MM-DD` form. With no `puzzle` query
parameter, the game opens the latest released puzzle. A valid released
`?puzzle=YYYY-MM-DD` value opens that archive entry; invalid or unavailable
values fall back to the latest puzzle. A future date produces the dedicated
future-puzzle view rather than attempting to fetch its answer data.

The generated archive index is chronological. The client assigns contiguous
issue numbers from that ordering, so the earliest available puzzle is Issue #1
and missing calendar dates do not create gaps. The main eyebrow is
`Issue #N - display date`; the clue remains unprefixed; archive links are
`Issue #N - song clue`. The newest archive link omits the query parameter while
older links preserve it.

## Guess matching

`client/src/game.ts` owns answer normalization and matching. Normalization:

- lowercases text, removes accents and punctuation, converts `&` to `and`, and
  collapses whitespace;
- removes matching artist words, including a preceding `by`, before matching;
- rejects input longer than the limit in `constants.ts`.

A normalized guess matches any normalized `acceptedAnswers` entry. Empty
answers, repeated normalized guesses, and answers containing only the artist do
not consume an attempt. When artist text is removed from a guess, the artist
hint is revealed. Players receive five non-duplicate normalized guesses by
default.

Puzzle content should include the canonical title and genuinely useful
alternate titles in `acceptedAnswers`, but should not duplicate variants already
covered by normalization or enumerate `Song by Artist` permutations.

## State transitions and results

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

## Persistence and completion

Production stores state in `localStorage` under a key derived from the puzzle
ID. Vite development deliberately clears that puzzle's stored record and starts
clean. Stored data is treated as untrusted: malformed data falls back safely,
string guesses are recovered where possible, and a stored `playing` state with
five guesses is corrected to `failed`.

Legacy records migrate as follows: `isSolved: true` becomes `solved`; an
unsolved record with five guesses becomes `failed`; other legacy records become
`playing`.

Archive completion is currently derived from any terminal local state. The
asynchronous completion boundary can later use an account-backed API without
changing archive rendering. Completion is refreshed whenever Previous Issues
opens; lookup failure leaves navigation usable and simply omits completion
markers.

If a future backend validates guesses, it should own its server-side rules.
Keep browser and server behavior aligned through shared fixture cases rather
than introducing a root TypeScript package solely to share implementation. Add
focused normalization and date coverage when a test runner is introduced or a
regression justifies it.
