import type { ExpandTarget } from "../useCardExpand";

interface CardExpandOverlayProps {
  target: ExpandTarget | null;
  expanded: boolean;
}

/** Purely presentational - renders the card-sized rect that grows to
 * cover the screen. All the timing/state logic lives in
 * useCardExpand.ts, tested separately with fake timers. */
export function CardExpandOverlay({ target, expanded }: CardExpandOverlayProps) {
  if (!target) return null;

  return (
    <div
      aria-hidden
      className="fixed z-40 flex items-center justify-center overflow-hidden pointer-events-none
        transition-all duration-500 ease-in-out"
      style={{
        top: expanded ? 0 : target.top,
        left: expanded ? 0 : target.left,
        width: expanded ? "100vw" : target.width,
        height: expanded ? "100vh" : target.height,
        borderRadius: expanded ? 0 : 12,
        backgroundColor: target.color,
      }}
    >
      <span
        className="text-5xl transition-transform duration-500 ease-in-out"
        style={{ transform: expanded ? "scale(2.2)" : "scale(1)", opacity: expanded ? 0.9 : 1 }}
      >
        {target.icon}
      </span>
    </div>
  );
}
