// Pure placement math for a small popover anchored to a control, with no
// DOM access — mirrors the pure/adapter split between this file and
// anchoredDialog.ts the same way share.ts (pure) pairs with
// browserShare.ts (DOM adapter). Kept in platform/ rather than domain/
// (reserved for game rules/policy) or views/ (DOM output only): this is
// browser-geometry policy, not gameplay policy.

export type AnchorRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type PlacementViewport = {
  width: number;
  height: number;
  scrollX: number;
  scrollY: number;
};

export type BubbleSize = {
  width: number;
  height: number;
};

export type PlacementOptions = {
  gap?: number;
  margin?: number;
  minTailInset?: number;
};

export type AnchoredPlacement = {
  direction: 'above' | 'below';
  left: number;
  top: number;
  tailOffset: number;
};

const defaultGap = 12;
const defaultMargin = 12;
// The tail (anchoredPopover.css's .anchored-popover::after) is a 20px
// content box rotated 45deg, but only one of its two border pairs is set at
// a time (e.g. border-top + border-left for the 'below' placement), so its
// rendered border box is 24px square, not 20px — giving it a half-diagonal
// of 12 * sqrt(2) ~= 16.97px from its center. For the tail to sit flush
// against a straight border segment rather than clipping into the
// popover's 16px corner radius, its offset from either edge must be at
// least radius + half-diagonal ~= 32.97px. 34 adds a small safety margin.
const defaultMinTailInset = 34;

export function computeAnchoredPlacement(
  anchor: AnchorRect,
  bubble: BubbleSize,
  viewport: PlacementViewport,
  options: PlacementOptions = {},
): AnchoredPlacement {
  const gap = options.gap ?? defaultGap;
  const margin = options.margin ?? defaultMargin;
  const minTailInset = options.minTailInset ?? defaultMinTailInset;

  const spaceBelow = viewport.height - (anchor.top + anchor.height);
  const spaceAbove = anchor.top;
  const fitsBelow = spaceBelow >= gap + bubble.height + margin;
  const fitsAbove = spaceAbove >= gap + bubble.height + margin;

  const direction: AnchoredPlacement['direction'] = fitsBelow
    ? 'below'
    : fitsAbove
      ? 'above'
      : spaceBelow >= spaceAbove
        ? 'below'
        : 'above';

  const rawTop = direction === 'below'
    ? anchor.top + anchor.height + gap
    : anchor.top - gap - bubble.height;
  const maxTop = Math.max(margin, viewport.height - margin - bubble.height);
  const clampedTop = clamp(rawTop, margin, maxTop);

  const anchorCenterX = anchor.left + anchor.width / 2;
  const rawLeft = anchorCenterX - bubble.width / 2;
  const maxLeft = Math.max(margin, viewport.width - margin - bubble.width);
  const clampedLeft = clamp(rawLeft, margin, maxLeft);

  const maxTailOffset = Math.max(minTailInset, bubble.width - minTailInset);
  const tailOffset = clamp(
    anchorCenterX - clampedLeft,
    minTailInset,
    maxTailOffset,
  );

  return {
    direction,
    left: clampedLeft + viewport.scrollX,
    top: clampedTop + viewport.scrollY,
    tailOffset,
  };
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}
