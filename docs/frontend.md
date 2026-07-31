# Frontend Architecture

This document describes the browser UI, rendering boundaries, dialogs,
accessibility, and responsive behavior. See
[architecture.md](architecture.md) for the system overview. Exact CSS values
and transient visual implementation details remain canonical in source.

## Composition and ownership

`client/index.html` owns the static semantic shell: masthead controls, puzzle
heading, clue-panel region, guess form, action controls, inline result and
feedback regions, a small site footer, and one native `<dialog>`. The footer
links to the separate “The Legal Stuff” page. `client/src/dom.ts` resolves the
interactive shell into typed element references and co-locates the
`GameElements` contract.

`client/src/main.ts` performs the deployment check, constructs concrete browser
dependencies, and starts the app. `client/src/app.ts` owns orchestration and
event handling: it invokes domain transitions, saves state, manages focus, and
calls focused view functions. It does not write DOM output directly.

DOM output is divided by stable UI responsibility:

- `views/puzzleView.ts` renders the puzzle, active state, validation, artist
  hint, initial panel loading, future state, load errors, and panel zoom;
- `views/archiveView.ts` renders archive navigation and pagination using an
  injected puzzle-URL callback and reports ordinary same-tab selections to the
  application before navigation;
- `views/howToPlayView.ts` renders tutorial content;
- `views/loadingView.ts` creates reusable, scalable loading statuses with
  accessible text and decorative motion;
- `views/resultView.ts` renders inline terminal results, the optional YouTube
  load control and privacy-policy link, and the activated player;
- `views/shareView.ts` creates reusable terminal share controls and owns their
  busy and feedback rendering.

These views use DOM APIs and `textContent`; external or content-authored strings
are not inserted with untrusted `innerHTML`. The split does not introduce a
generic component factory or JSON-driven UI templates: the semantic shell,
direct DOM composition, puzzle JSON, and tutorial manifest remain the
appropriate level of templating for this application.

The interface is a single responsive comic-page frame. Its durable design
language is warm graph paper, ink-dark outlines, cream surfaces, hard offset
shadows, bold accents, informal typography, and deliberately rough clue art.
Controls share tactile hover, focus, and press behavior, while the drawings
remain the primary visual focus.

The standalone “The Legal Stuff” page reuses those foundations without loading
the game. Legal content is edited directly in `client/legal.html`, where
semantic HTML groups privacy, copyright, font licence, and other notices under
reusable section headings. A minimal script renders links to the exact Bangers
and Kalam OFL assets without embedding their full text. A single base-aware
`The Legal Stuff` link beneath the comic page makes the page available from the
main shell and every generated share shell.

The title panel places a compact pair of circular controls beside the
introduction: a pale-blue illustrated open-comic control for All Issues
followed by the green question-mark control for How to Play. Their accessible
names remain “All Issues” and “How to Play,” and closing either dialog restores
focus to the control that opened it. The game area follows the title panel
directly across the hand-drawn black divider.

The puzzle header stacks the abbreviated issue date above the song clue. The
visible date uses one `Issue #N · D Mon YY` format everywhere. All Issues is the
single browsing surface for selecting another released puzzle.

When puzzle content includes a `doodledBy` credit, the clue section displays
`Doodled By: {name}` as small, left-aligned ink text beneath the panels. The
credit remains outside the separate guess-entry panel and is absent rather than
empty when the field is omitted.

## Dialogs and secondary views

`client/src/modal.ts` owns one reusable native dialog and co-locates its modal
types. It manages the common title, close action, active-view identity, cleanup,
and focus restoration. Feature renderers return typed
`DocumentFragment` content rather than branching inside the modal controller.
Updating an obsolete asynchronous view is ignored, and closing the dialog
removes its content.

How to Play types stay with its loader. The feature loads its validated content
manifest lazily and shows a recoverable error if loading fails. Async modal
content uses the reusable loading status and marks the modal body busy until
content or an error replaces it. The status defers only its visual appearance
through a short shared threshold, so fast operations do not flash and ready
content is never held back. All Issues loads completion asynchronously each
time it opens, orders released puzzles newest first, paginates in groups of 50,
and opens on the page containing the selected puzzle. Long lists scroll within
the height-constrained dialog. Completion lookup failure does not block archive
navigation.

Selecting an archive issue through an ordinary same-tab activation covers the
interactive archive with an in-place busy overlay before full-page navigation
begins. The existing archive stays in the DOM to preserve the dialog's
dimensions, becomes inert, and remains visible unless the delayed loading
status appears over it. The dialog close action remains available.
Modified activations and links targeting another browsing context retain
native anchor behavior. The modal closes during page exit so a back-forward-
cache restore does not leave a stale loading overlay open.

Correct, revealed, and failed outcomes replace the guess form and action grid
with an inline result. Only correct answers use its success treatment. Solved
and manually revealed results may include a local `Watch YouTube Video`
control with a short linked Google privacy notice; failed results do not.
Activating that control grants consent for the current tab session, creates the
configured privacy-enhanced iframe, and reveals a separate red
`Watch on YouTube` fallback link with the same play icon. Later eligible results
in that session create the iframe immediately. The reusable dialog remains the
surface for How to Play and All Issues, while the share control stays in its
separate terminal-state region below the result and previous guesses.

## State rendering and errors

The puzzle view owns headings, panels, guesses, attempts, validation, control
availability, and terminal form visibility. Invalid input uses a dedicated
polite live region and does not replace general application errors. Artist and
attempt feedback use deliberate live regions without making every visual change
an announcement. Fatal initialization and load failures are also rendered
through a view rather than direct writes from `main.ts` or `app.ts`.

The static game shell places the reusable loading status in the clue-panel area
so it can appear before JavaScript downloads. It reserves the loading layout and
remains available to assistive technology immediately, while a short visual
threshold prevents it flashing during fast or cached loads. The initial clue
area reserves one line each for the issue and clue heading plus the common
two-row panel footprint. Longer clues can still expand naturally when they
wrap. The real guess form and action layout are also present from first paint,
visibly disabled and inert, with neutral attempts copy until the selected state
is known. Puzzle metadata may replace the empty issue heading while clue images
load. The puzzle view builds the final responsive grid invisibly, waits for
every clue image to load and decode, and then reveals all panels together
without waiting for the loading status to finish.

After panel readiness, application state either enables the form for active
play or displays the saved terminal result over an invisible, inert form that
continues reserving the normal interaction height. Results therefore replace
the controls visually without collapsing their layout area. Less common puzzles
with more than two panel rows still expand to fit their complete grid. Future
and load-error views remove the interaction reservation. A failed image or
decode is a puzzle load failure; the loader and busy state are cleared before
the friendly error is shown.

Optional lyric captions are created only for terminal states and are semantic
`figcaption` children of their corresponding panels. Each caption is flanked by
music-note characters and split into inline word tokens, without a containing
box. Captions wrap within the panel width, and each grid row follows its tallest
caption so later content remains aligned. Every panel independently loops a
transform-only wave from its leading note through its words to its trailing
note. Feature-scoped CSS properties provide shared timing and movement defaults,
and stable panel-number attributes support selector-based overrides. Reduced-
motion preferences leave every token stationary. Panel zoom temporarily hides
its caption to keep the expanded artwork unobstructed. The final word and
trailing note share an atomic inline ending group, preventing the note from
wrapping onto a line by itself while retaining their separate animations.

A requested future date renders a friendly future-puzzle state while retaining
archive access. Unexpected load failures use the general message region and are
logged for diagnosis.

The main share region is hidden while play is active and in future or load-error
views. It appears for solved, manually revealed, failed, and restored terminal
states. Share feedback uses its own polite status region; dismissing the OS
share sheet is not announced as an error.

Newly reached terminal results receive programmatic focus after replacing the
form, then scroll the page to the bottom so the completed area is in view.
Smooth scrolling is used unless reduced motion is preferred. Restored terminal
states render the same result without moving focus or scroll position.

## Accessibility and responsive behavior

Native forms, buttons, lists, and dialogs provide the interaction foundation.
Every input has a visible label; controls have accessible names; actions remain
keyboard-operable; and focus indicators are preserved. Hover and color are not
the only state signals. Modal close returns focus to the control that opened it.

Puzzle media reserves a 4:3 area to avoid layout shifts. The panel region is
marked busy while its accessible loading status is present. Panel alt text must
remain neutral unless content can describe the clue usefully without revealing
the answer. Playable puzzles keep two equal-width panels per full row; when the
panel count is odd, the final panel is centered at that same width. Embedded
media stays responsive. Loading controls remain disabled, inert, and hidden
from assistive technology until the panels are ready and the puzzle is known to
be playable.

Without session consent, the initial YouTube control and `Subject to Google's
Privacy Policy` notice use only local DOM and CSS and contain no remote
thumbnail or iframe. Activating the control replaces the reserved 16:9 area
with the iframe, moves focus to the player, reveals the external fallback link,
and records consent in `sessionStorage`. A later automatic load does not move
focus. Closing the tab ends consent; a later tab session starts unloaded.

The layout is mobile-first down to 320 px and also supports wide desktop
viewports. Controls must not overflow and primary targets should remain roughly
44 px or larger. If motion is added, it must honor `prefers-reduced-motion`.
Visible changes should be checked at narrow and wide sizes across every affected
state, including validation, terminal results, archive, future-puzzle, and load
errors.

The compact, left-aligned share action uses the visible label `Share` with its
three-node icon, leaving room for adjacent terminal actions. Desktop and unknown
platforms make that action copy the invitation even when the browser exposes an
OS share mechanism, avoiding desktop share targets that discard the link in
favour of another payload representation. Conservatively recognized Android,
iPhone, iPod, and iPadOS browsers use native sharing when it is available; their
payload contains only the title, spoiler-free invitation with terminal
performance, and dated URL. The request is created synchronously from current
state inside the activation handler so native sharing retains user activation.
Unsupported native sharing falls back to the Clipboard API. If modern clipboard
access is unavailable or rejected, the control leaves an operable share-page
link. No share-specific image fetch is performed in the browser; receiving apps
may fetch the first-panel preview from the share page's static metadata.

## Stylesheet structure

`client/src/styles.css` is an ordered import entry. Vite inlines its plain CSS
imports and rebases nested asset URLs, so production still emits one bundled
stylesheet:

1. `styles/foundation.css` owns fonts, tokens, reset, page shell, and masthead;
2. `styles/loading.css` owns the reusable loading status and its motion;
3. `styles/game.css` owns panels, controls, feedback, and the future state;
4. `styles/dialog.css` owns the dialog, tutorial, archive, and results;
5. `styles/share.css` owns the reusable main and dialog share control;
6. `styles/responsive.css` owns ordered breakpoint, motion, and forced-color
   overrides.

`client/src/legal.css` is the separate entry for The Legal Stuff page. It
imports the shared foundation before its page-specific legal styles, avoiding
game, dialog, and share rules that the static page does not use.

The import order is part of the cascade contract. Exact measurements, font
ratios, wrapping choices, shadows, and breakpoint values remain canonical in
the CSS rather than being duplicated here.
