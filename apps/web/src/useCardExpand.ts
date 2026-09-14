import { useState } from "react";

export interface ExpandTarget {
  top: number;
  left: number;
  width: number;
  height: number;
  color: string;
  icon: string;
}

/** Drives the "card grows to fill the screen" transition: capture the
 * clicked card's on-screen position/color/icon, flip a flag one frame
 * later so CSS can transition from that exact rect to full-viewport,
 * then call back once the transition has had time to finish. Timing
 * lives here (not in the presentational overlay) so it's covered by a
 * real test with fake timers instead of only visual inspection. */
export function useCardExpand(durationMs = 500) {
  const [target, setTarget] = useState<ExpandTarget | null>(null);
  const [expanded, setExpanded] = useState(false);

  function trigger(target: ExpandTarget, onComplete: () => void) {
    setTarget(target);
    setExpanded(false);
    // Two rAFs: the first lets the browser paint the overlay at its
    // starting (card-sized) position at least once - flipping straight
    // to `expanded` in the same tick as mounting it would let the
    // browser coalesce both states into one paint and skip the
    // transition entirely.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setExpanded(true));
    });
    window.setTimeout(() => {
      onComplete();
      setTarget(null);
      setExpanded(false);
    }, durationMs);
  }

  return { target, expanded, trigger };
}
