import { describe, expect, it } from 'vitest';
import { computeAnchoredPlacement } from './anchoredPlacement.ts';

const viewport = { width: 800, height: 600, scrollX: 0, scrollY: 0 };
const bubble = { width: 260, height: 120 };

describe('computeAnchoredPlacement', () => {
  it('places the bubble below the anchor when there is room', () => {
    const anchor = { top: 100, left: 300, width: 100, height: 44 };

    const placement = computeAnchoredPlacement(anchor, bubble, viewport);

    expect(placement.direction).toBe('below');
    expect(placement.top).toBeGreaterThan(anchor.top + anchor.height);
  });

  it('places the bubble above the anchor when it is near the bottom', () => {
    const anchor = { top: 540, left: 300, width: 100, height: 44 };

    const placement = computeAnchoredPlacement(anchor, bubble, viewport);

    expect(placement.direction).toBe('above');
    expect(placement.top + bubble.height).toBeLessThan(anchor.top);
  });

  it('falls back to whichever side has more room and clamps vertically when neither fits', () => {
    const shortViewport = { width: 800, height: 160, scrollX: 0, scrollY: 0 };
    const anchor = { top: 70, left: 300, width: 100, height: 20 };

    const placement = computeAnchoredPlacement(anchor, bubble, shortViewport);

    // More room above (70px) than below (70px) is a tie; either is
    // acceptable, but the bubble must stay fully inside the viewport.
    expect(placement.top).toBeGreaterThanOrEqual(0);
    expect(placement.top + bubble.height).toBeLessThanOrEqual(
      shortViewport.height,
    );
  });

  it('returns document coordinates that include scroll offset', () => {
    const anchor = { top: 100, left: 300, width: 100, height: 44 };
    const scrolled = { width: 800, height: 600, scrollX: 40, scrollY: 500 };

    const placement = computeAnchoredPlacement(anchor, bubble, scrolled);

    expect(placement.left).toBeGreaterThanOrEqual(scrolled.scrollX);
    expect(placement.top).toBeGreaterThanOrEqual(scrolled.scrollY);
  });

  it('clamps horizontally at a narrow viewport while the tail still points at the anchor center', () => {
    const narrowViewport = { width: 320, height: 600, scrollX: 0, scrollY: 0 };
    // Anchor sits near the left edge; a 260px-wide bubble centered on it
    // would overflow the left side of a 320px viewport.
    const anchor = { top: 100, left: 10, width: 90, height: 44 };

    const placement = computeAnchoredPlacement(anchor, bubble, narrowViewport);

    expect(placement.left).toBeGreaterThanOrEqual(0);
    expect(placement.left + bubble.width).toBeLessThanOrEqual(
      narrowViewport.width,
    );

    const anchorCenterX = anchor.left + anchor.width / 2;
    const impliedTailX = placement.left + placement.tailOffset;

    // The tail is clamped away from the rounded corners (minTailInset), so
    // it cannot land exactly on the anchor center once clamped hard against
    // an edge — but it must still be closer to the anchor than the
    // opposite, unclamped edge of the bubble would be.
    expect(Math.abs(impliedTailX - anchorCenterX)).toBeLessThan(
      bubble.width / 2,
    );
  });

  it('never lets the tail offset cross minTailInset near either bubble corner', () => {
    const narrowViewport = { width: 320, height: 600, scrollX: 0, scrollY: 0 };
    const leftAnchor = { top: 100, left: -50, width: 20, height: 44 };
    const rightAnchor = { top: 100, left: 350, width: 20, height: 44 };
    const options = { minTailInset: 18 };

    const leftPlacement = computeAnchoredPlacement(
      leftAnchor,
      bubble,
      narrowViewport,
      options,
    );
    const rightPlacement = computeAnchoredPlacement(
      rightAnchor,
      bubble,
      narrowViewport,
      options,
    );

    expect(leftPlacement.tailOffset).toBeGreaterThanOrEqual(18);
    expect(leftPlacement.tailOffset).toBeLessThanOrEqual(bubble.width - 18);
    expect(rightPlacement.tailOffset).toBeGreaterThanOrEqual(18);
    expect(rightPlacement.tailOffset).toBeLessThanOrEqual(bubble.width - 18);
  });
});
