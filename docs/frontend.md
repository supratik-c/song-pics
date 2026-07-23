# Frontend Architecture

This document describes the browser UI, rendering boundaries, dialogs,
accessibility, and responsive behavior. See
[architecture.md](architecture.md) for the system overview. Exact CSS values
and transient visual implementation details remain canonical in source.

## Composition and ownership

`client/index.html` owns the static semantic shell: masthead controls, puzzle
heading, clue-panel region, guess form, action controls, feedback regions, and
one native `<dialog>`. `client/src/dom.ts` resolves that shell into typed element
references and co-locates the `GameElements` contract.

`client/src/main.ts` performs the deployment check, constructs concrete browser
dependencies, and starts the app. `client/src/app.ts` owns orchestration and
event handling: it invokes domain transitions, saves state, manages focus, and
calls focused view functions. It does not write DOM output directly.

DOM output is divided by stable UI responsibility:

- `views/puzzleView.ts` renders the puzzle, active state, validation, artist
  hint, future state, load errors, and panel zoom;
- `views/archiveView.ts` renders archive navigation and pagination using an
  injected puzzle-URL callback;
- `views/howToPlayView.ts` renders tutorial content;
- `views/resultView.ts` renders terminal results and optional video.

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

## Dialogs and secondary views

`client/src/modal.ts` owns one reusable native dialog and co-locates its modal
types. It manages the common title, close action, active-view identity, cleanup,
optional tone, and focus restoration. Feature renderers return typed
`DocumentFragment` content rather than branching inside the modal controller.
Updating an obsolete asynchronous view is ignored, and closing the dialog
removes its content.

How to Play types stay with its loader. The feature loads its validated content
manifest lazily and shows a recoverable error if loading fails. Previous Issues
loads completion asynchronously each time it opens, orders released puzzles
newest first, paginates in groups of 50, and opens on the page containing the
selected puzzle. Long lists scroll within the height-constrained dialog.
Completion lookup failure does not block archive navigation.

Correct, revealed, and failed outcomes share the result dialog. Only correct
answers use its success treatment. Result content owns any YouTube iframe
cleanup so closing the dialog stops playback.

## State rendering and errors

The puzzle view owns headings, panels, guesses, attempts, validation, control
availability, and terminal labels. Invalid input uses a dedicated polite live
region and does not replace general application errors. Artist and attempt
feedback use deliberate live regions without making every visual change an
announcement. Fatal initialization and load failures are also rendered through
a view rather than direct writes from `main.ts` or `app.ts`.

A requested future date renders a friendly future-puzzle state while retaining
archive access. Unexpected load failures use the general message region and are
logged for diagnosis.

## Accessibility and responsive behavior

Native forms, buttons, lists, and dialogs provide the interaction foundation.
Every input has a visible label; controls have accessible names; actions remain
keyboard-operable; and focus indicators are preserved. Hover and color are not
the only state signals. Modal close returns focus to the control that opened it.

Puzzle media reserves a 4:3 area to avoid layout shifts. Panel alt text must
remain neutral unless content can describe the clue usefully without revealing
the answer. Embedded media stays responsive.

The layout is mobile-first down to 320 px and also supports wide desktop
viewports. Controls must not overflow and primary targets should remain roughly
44 px or larger. If motion is added, it must honor `prefers-reduced-motion`.
Visible changes should be checked at narrow and wide sizes across every affected
state, including validation, terminal results, archive, future-puzzle, and load
errors.

## Stylesheet structure

`client/src/styles.css` is an ordered import entry. Vite inlines its plain CSS
imports and rebases nested asset URLs, so production still emits one bundled
stylesheet:

1. `styles/foundation.css` owns fonts, tokens, reset, page shell, and masthead;
2. `styles/game.css` owns panels, controls, feedback, and the future state;
3. `styles/dialog.css` owns the dialog, tutorial, archive, and results;
4. `styles/responsive.css` owns ordered breakpoint, motion, and forced-color
   overrides.

The import order is part of the cascade contract. Exact measurements, font
ratios, wrapping choices, shadows, and breakpoint values remain canonical in
the CSS rather than being duplicated here.
