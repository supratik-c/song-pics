# Frontend Architecture

This document describes the browser UI, rendering boundaries, dialogs,
accessibility, and responsive behavior. See
[architecture.md](architecture.md) for the system overview. Exact CSS values
and transient visual implementation details remain canonical in source.

## Composition and ownership

`client/index.html` owns the static semantic shell: masthead controls, puzzle
heading, clue-panel region, guess form, action controls, feedback regions, and
one native `<dialog>`. `client/src/dom.ts` resolves that shell into typed element
references. `styles.css` supplies the complete visual system and responsive
layout.

`client/src/main.ts` performs the deployment check and starts the app.
`client/src/app.ts` coordinates loading, state changes, user events, focus after
guesses, and calls into renderers. `render.ts` constructs feature-specific DOM
output with DOM APIs and `textContent`; external or content-authored strings are
not inserted with untrusted `innerHTML`.

The interface is a single responsive comic-page frame. Its durable design
language is warm graph paper, ink-dark outlines, cream surfaces, hard offset
shadows, bold accents, informal typography, and deliberately rough clue art.
Controls share tactile hover, focus, and press behavior, while the drawings
remain the primary visual focus.

## Dialogs and secondary views

`client/src/modal.ts` owns one reusable native dialog. It manages the common
title, close action, active-view identity, cleanup, optional tone, and focus
restoration. Feature renderers return typed `DocumentFragment` content rather
than branching inside the modal controller. Updating an obsolete asynchronous
view is ignored, and closing the dialog removes its content.

How to Play loads its validated content manifest lazily and shows a recoverable
error if loading fails. Previous Issues loads completion asynchronously each
time it opens, orders released puzzles newest first, paginates in groups of 50,
and opens on the page containing the selected puzzle. Long lists scroll within
the height-constrained dialog. Completion lookup failure does not block archive
navigation.

Correct, revealed, and failed outcomes share the result dialog. Only correct
answers use its success treatment. Result content owns any YouTube iframe
cleanup so closing the dialog stops playback.

## State rendering and errors

The main renderer owns puzzle headings, panels, guesses, attempts, validation,
control availability, and terminal labels. Invalid input uses a dedicated
polite live region and does not replace general application errors. Artist and
attempt feedback use deliberate live regions without making every visual
change an announcement.

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
