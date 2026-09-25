import { useEffect, useState } from "react";

// Render's free tier spins the API down after inactivity, so the very
// first request after a while can take several seconds. Rather than sit
// on inert "Loading..." text, this cycles through honest, timed messages
// so a real cold start reads as "working", not "broken".
const MESSAGES = [
  "Loading…",
  "Waking up the server — free hosting naps after inactivity",
  "Almost there, hang tight…",
];
const MESSAGE_DELAYS_MS = [2200, 7000];

export function LoadingScreen() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timers = MESSAGE_DELAYS_MS.map((delay, i) => setTimeout(() => setMessageIndex(i + 1), delay));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 text-center" role="status" aria-live="polite">
      <span className="motion-safe:animate-pop-in text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-ink">
        Play
        <span className="inline-block bg-accent-yellow border-2 border-ink px-2 -rotate-1 shadow-card mx-0.5">
          To
        </span>
        Learn
      </span>
      <div className="flex gap-1.5" aria-hidden>
        <span className="w-2.5 h-2.5 bg-ink rounded-full animate-pulse [animation-delay:0ms]" />
        <span className="w-2.5 h-2.5 bg-ink rounded-full animate-pulse [animation-delay:150ms]" />
        <span className="w-2.5 h-2.5 bg-ink rounded-full animate-pulse [animation-delay:300ms]" />
      </div>
      <p key={messageIndex} className="text-sm text-stone-600 max-w-xs motion-safe:animate-screen-in">
        {MESSAGES[messageIndex]}
      </p>
    </div>
  );
}
