import { createPortal } from "react-dom";
import type { ExpandTarget } from "../useCardExpand";

interface CardExpandOverlayProps {
  target: ExpandTarget | null;
  expanded: boolean;
}

/** Purely presentational - renders the card-sized rect that grows to
 * cover the screen. All the timing/state logic lives in
 * useCardExpand.ts, tested separately with fake timers.
 *
 * Rendered through a portal straight into <body>: a `position: fixed`
 * element is positioned relative to the viewport only as long as none
 * of its ancestors has a transform - once one does (and
 * motion-safe:animate-screen-in leaves every screen wrapper with a
 * lingering translateY(0) after its entrance animation ends, same as
 * the stacking-context gotcha elsewhere in this app), that ancestor
 * becomes the containing block instead, so "cover the whole screen"
 * actually meant "cover that ancestor's box" - which could sit well
 * below the true viewport top, leaving whatever's above it (a category
 * row, the header) visible through the "expanded" card. Escaping to
 * body sidesteps the containing-block rule entirely. */
export function CardExpandOverlay({ target, expanded }: CardExpandOverlayProps) {
  if (!target) return null;

  return createPortal(
    <div
      aria-hidden
      className="fixed z-40 overflow-hidden pointer-events-none transition-all duration-500 ease-in-out"
      style={{
        top: expanded ? 0 : target.top,
        left: expanded ? 0 : target.left,
        width: expanded ? "100vw" : target.width,
        height: expanded ? "100vh" : target.height,
        borderRadius: expanded ? 0 : 12,
        backgroundImage: `linear-gradient(${target.color}4d, rgba(12,10,9,0.75)), url("${target.photo}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <span
        className="absolute top-3 left-3 text-2xl bg-paper/60 rounded-lg w-9 h-9 flex items-center
          justify-center transition-opacity duration-300 ease-in-out"
        style={{ opacity: expanded ? 0 : 1 }}
      >
        {target.icon}
      </span>
    </div>,
    document.body
  );
}
