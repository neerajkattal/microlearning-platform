import { useEffect, useState } from "react";
import { HERO_PHOTOS } from "../categoryPhotos";

const ROTATE_MS = 4000;
const FADE_MS = 1200;

/** The landing page's rotating backdrop: real photos from a spread of
 * quiz topics, crossfading into each other behind a warm scrim so the
 * hero text on top stays legible. Every photo is stacked in the DOM so
 * only opacity has to move for the crossfade - swapping the `src` of a
 * single <img> would flash to blank while the next photo loads.
 *
 * Only the current photo and the one it's about to fade into ever get
 * a backgroundImage - the rest stay unset until they're a rotation
 * away from needed. Setting all of them upfront meant paying for every
 * photo's full download before the page felt loaded, for photos that
 * might not be seen for another 20+ seconds; this way the first paint
 * only waits on two.
 *
 * Respects reduced motion by simply not starting the rotation - the
 * first photo stays put instead of an unannounced background changing
 * on its own (CLAUDE.md 11: reduced-motion preference). */
export function HeroBackdrop() {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState<ReadonlySet<number>>(
    () => new Set([0, 1 % HERO_PHOTOS.length])
  );

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setIndex((current) => {
        const next = (current + 1) % HERO_PHOTOS.length;
        const upcoming = (next + 1) % HERO_PHOTOS.length;
        setLoaded((prev) => (prev.has(upcoming) ? prev : new Set(prev).add(upcoming)));
        return next;
      });
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {HERO_PHOTOS.map((url, i) => (
        <div
          key={url}
          className="absolute inset-0 transition-opacity ease-in-out"
          style={{
            backgroundImage: loaded.has(i) ? `url("${url}")` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: i === index ? 0.32 : 0,
            transitionDuration: `${FADE_MS}ms`,
          }}
        />
      ))}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(12,10,9,0.55), rgba(12,10,9,0.9)), " +
            "radial-gradient(44rem 30rem at 8% 10%, rgba(245,158,11,0.22), transparent 62%), " +
            "radial-gradient(30rem 26rem at 90% 100%, rgba(244,63,94,0.18), transparent 60%)",
        }}
      />
    </div>
  );
}
