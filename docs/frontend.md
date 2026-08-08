# Frontend Architecture

This document describes the browser UI, rendering boundaries, dialogs,
accessibility, and responsive behavior. See
[architecture.md](architecture.md) for the system overview. Exact CSS values
and transient visual implementation details remain canonical in source.

## Composition and ownership

`client/index.html` owns the static semantic shell: masthead controls, puzzle
heading, clue-panel region, guess form, action controls, inline result and
feedback regions, a small site footer, and one native `<dialog>`. The footer
links to the separate “The Legal Stuff” page. `client/src/platform/dom.ts`
resolves the interactive shell into typed element references and co-locates
the `GameElements` contract.

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
  busy and feedback rendering;
- `views/supportView.ts` creates the reusable Ko-fi support prompt — a single
  sentence with a boxed, linked logo inline at the end, built as one detached
  section — gated by an injected `shouldRender` predicate so it, and its
  text, render nothing at all when the predicate is false. `#support-region`
  is nested inside `#share-region` in `index.html` so the prompt pairs
  visually with the Share button in one row; see the stylesheet-structure
  note below for the resulting cross-file layout split.

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
introduction: a pale-blue hand-drawn menu control for All Releases
followed by the green question-mark control for How to Play. Their accessible
names remain “All Releases” and “How to Play,” and closing either dialog restores
focus to the control that opened it. The game area follows the title panel
directly across the hand-drawn black divider.

The puzzle header stacks the abbreviated issue date above the song clue. The
visible date uses one `Issue #N · D Mon YY` format everywhere. All Releases is the
single browsing surface for selecting another released puzzle.

When puzzle content includes a `doodledBy` credit, the clue section displays
`Doodled By: {name}` as small, left-aligned ink text beneath the panels. The
credit remains outside the separate guess-entry panel and is absent rather than
empty when the field is omitted.

## Dialogs and secondary views

`client/src/platform/modal.ts` owns one reusable native dialog and co-locates its modal
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
content is never held back. All Releases loads completion asynchronously each
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

`client/src/platform/anchoredDialog.ts` owns a second, general-purpose dialog
system — a peer of `modal.ts`, not a feature of any one caller. Where
`modal.ts` centers one shared `<dialog>` in the page, `anchoredDialog.ts`
opens a fresh `<dialog>` positioned relative to a caller-supplied control,
for a small popup that reads as an aside rather than a full modal
interruption. A caller's `AnchoredDialogView` supplies content (a
`DocumentFragment`), a modifier class for its own styling, the anchor and
return-focus elements, and an optional `onClose` callback; the controller
exposes `open`/`close`/`isOpen`/`setDismissible` and never learns why a
popover closed or was locked — that meaning stays entirely with the caller,
expressed as ordinary closures around `onClose`. A popup that is just copy
and a single close button is the same controller with different injected
content; `dismissible: false` at open time and the runtime `setDismissible`
toggle are the two built-in extension points, for a popup that must be
answered rather than dismissed with Escape or an outside tap, including one
whose dismissibility needs to change while it's already open (e.g. locking
it once a caller-side action has started committing). The Reveal Artist
notice (below) is its first caller. It still reuses `showModal()` for the same free
inertness/top-layer/focus-containment `modal.ts` relies on, but overrides the
UA's fixed, auto-centered positioning: CSS sets `position: absolute` (so the
top-layer dialog scrolls with the document instead of staying pinned to the
viewport) with `top`/`left` from JS-computed custom properties, and a
transparent `::backdrop` so the rest of the page stays visible, just inert.
Initial focus goes to the dialog container itself, not a descendant button,
since which button (if any) should be pre-focused is caller-specific. The
shared `.anchored-popover` shell (`styles/anchoredPopover.css`) sets
`overflow: visible`, overriding the UA `dialog` stylesheet's `overflow: auto`
— without it, the speech-bubble tail pseudo-element, which deliberately
protrudes past the border box, gets silently clipped to two stray stubs. For
the same reason its hard comic shadow is a `filter: drop-shadow(...)` rather
than `box-shadow`, so the shadow follows the tail's silhouette too;
forced-colors mode suppresses it back to `filter: none` (`styles/
responsive.css`) since forced-colors does not remap or suppress `filter` the
way it does `box-shadow`. Beware that `elementHandle.screenshot()` in a
Playwright verification pass clips to the same border box and will hide
this tail — screenshot a page region instead.
Placement — above or below the anchor, depending on scroll position, with
horizontal clamping at narrow viewports — is computed once when the popover
opens (`platform/anchoredPlacement.ts`, a pure function) and is not
recomputed on resize or orientation change; an open popover may overlap
other controls, which is safe because the inert page means a keyboard or
assistive-technology user cannot reach anything underneath, and a pointer
user simply hits whichever element is topmost.

The Reveal Artist button now shows only its label; the button used to also
carry a small `−2` cost badge, but that made the button look cramped on
narrow viewports and has been replaced. Before the very first click of any
Reveal Artist button, ever, a speech-bubble popover (`anchored-popover
artist-reveal-notice`) opens anchored to the button, stating the guess cost
with light-green Accept (“Reveal”) and red Decline (“No Thanks”) buttons. The
cost phrase (“uses two guesses”) is bold and underlined against an otherwise
regular-weight message — Kalam only ships weights 400/700, so the surrounding
text must drop to 400 for the bold phrase to read as emphasized rather than
matching weight with the rest of the line.
Escape and an outside tap both behave as Decline. Either choice permanently
records that the notice has been answered — a separate flag
(`ArtistRevealNoticeStore`, see the persistence section below), not part of
per-puzzle game state — so it never appears again on that puzzle or any
other, once per browser. Once answered, subsequent clicks reveal directly
with the existing cost/flourish behavior and no popover. Once fewer attempts
remain than the reveal would cost plus one, the button disables and its
label swaps to `Not enough guesses!`, exactly as before; that affordability
check runs before the notice can open, so a click that can't reveal never
opens the popover and never spends the once-ever flag. A successful reveal,
from either the popover's Accept or a direct click once the notice has
already been answered, moves focus to the artist hint that replaces the
button, so keyboard and assistive-technology users are not left on a
now-hidden element. Revealing still updates the polite attempts-left live
region like any other attempt, and the
separate, purely decorative `aria-hidden` `−2` marker still appears over the
guesses-left number and drifts downward while fading over 0.5s, then removes
itself; under `prefers-reduced-motion` the marker still appears and is still
removed, just without the drift, fade, or the popover's own appear
animation.

Correct, revealed, and failed outcomes replace the guess form and action grid
with an inline result. Only correct answers use its success treatment. Solved
and manually revealed results may include a local `Watch YouTube Video`
control with a short linked Google privacy notice; failed results do not.
Activating that control grants consent for the current tab session, creates the
configured privacy-enhanced iframe, and reveals a separate red
`Watch on YouTube` fallback link with the same play icon. Later eligible results
in that session create the iframe immediately. The reusable dialog remains the
surface for How to Play and All Releases, while the share control stays in its
separate terminal-state region below the result and previous guesses.

## State rendering and errors

The puzzle view owns headings, panels, guesses, attempts, validation, control
availability, and terminal form visibility. Invalid input uses a dedicated
polite live region and does not replace general application errors. Artist and
attempt feedback use deliberate live regions without making every visual change
an announcement. Fatal initialization and load failures are also rendered
through a view rather than direct writes from `main.ts` or `app.ts`.

The Reveal Artist tile shows a single centered label. Once fewer attempts
remain than the reveal would cost plus one, the button disables and the
label swaps to `Not enough guesses!`, so a player can never spend attempts
on a hint they cannot act on. See "Dialogs and secondary views" above for
the once-ever confirmation popover this button opens and the attempts-left
flourish this produces — the first animation in this codebase to need
`prefers-reduced-motion` handling distinct from a live-region announcement,
since it communicates the same change without motion rather than removing it.

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

`platform/storage.ts` persists per-puzzle game state (guesses, status, and
whether the artist has been revealed) by puzzle ID under the `scribble-bops:`
key prefix. `main.ts` composes the store
per environment: production uses `localStorage` with the default namespace so
progress survives across sessions; `vite dev` uses `sessionStorage` under a
`scribble-bops:dev:<run id>` namespace, where the run id is generated fresh in
`vite.config.js` on every dev-server start. This lets progress persist across
reloads and navigation within a dev session — so archive "Completed" badges
and the Ko-fi support prompt are reachable while developing — without ever
colliding with production keys on `localhost`, and it self-resets on the next
`npm run dev`. `main.ts` also forces the Ko-fi support trigger to
`alwaysShowSupport` in dev, bypassing the normal three-solve threshold, so the
prompt can be inspected after any single terminal result.

`ArtistRevealNoticeStore` (also in `platform/storage.ts`) is a second,
separate permanent flag: whether the player has ever answered the Reveal
Artist confirmation popover, on any puzzle. It shares `main.ts`'s dev/prod
namespace split with game-state persistence — `localStorage` in production,
dev-run-namespaced `sessionStorage` in `vite dev` — but is deliberately not
part of the per-puzzle `GameState` contract, which is a closed, exactly-3-key
shape that cannot grow to hold a cross-puzzle flag. Once set, it stays set
until the browser's storage for the site is cleared, at which point the
notice is expected to reappear — the same graceful-reset shape `GameState`
and `YouTubeConsentStore` already have.

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
favour of another payload representation. The copied text carries the
invitation, terminal performance, and dated URL without the product title,
since a rendered link preview already shows its own title; the title survives
only for the native path below, where OS share sheets use it directly (e.g. as
a mail subject). Conservatively recognized Android,
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
3. `styles/game.css` owns panels, controls, feedback, the future state, and
   the Reveal Artist notice's content (message and Accept/Decline styling —
   the popover shell itself lives in `anchoredPopover.css`, below);
4. `styles/dialog.css` owns the dialog, tutorial, archive, and results;
5. `styles/anchoredPopover.css` owns the generic anchored-popover shell
   (shape, tail, placement, transparent backdrop, appear animation) that
   `platform/anchoredDialog.ts` opens — content-only styling for any one
   popover, such as the Reveal Artist notice, stays in that feature's own
   stylesheet instead;
6. `styles/share.css` owns the reusable main and dialog share control, and
   the shared flex-row layout of `.share-region` that pairs it with the
   nested Ko-fi prompt;
7. `styles/support.css` owns the reusable Ko-fi support prompt's own content
   and boxed-logo styling, not its row layout;
8. `styles/responsive.css` owns ordered breakpoint, motion, and forced-color
   overrides.

`client/src/legal.css` is the separate entry for The Legal Stuff page. It
imports the shared foundation before `styles/legal.css` — the ninth file in
`client/src/styles/`, page-specific and outside `styles.css`'s chain — avoiding
game, dialog, share, and support rules that the static page does not use.

The import order is part of the cascade contract. Exact measurements, font
ratios, wrapping choices, shadows, and breakpoint values remain canonical in
the CSS rather than being duplicated here.
