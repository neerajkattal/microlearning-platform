export type GameMode = "classic" | "lane-rush" | "balloon-pop";

interface GameModeSelectProps {
  onSelectMode: (mode: GameMode) => void;
}

const MODES: { mode: GameMode; label: string; desc: string; emoji: string; wide?: boolean }[] = [
  { mode: "classic", label: "Classic", desc: "Answer buttons", emoji: "📝" },
  { mode: "lane-rush", label: "Lane Rush", desc: "Steer into an answer", emoji: "🏎️" },
  { mode: "balloon-pop", label: "Balloon Pop", desc: "Pop the right answer", emoji: "🎈", wide: true },
];

export function GameModeSelect({ onSelectMode }: GameModeSelectProps) {
  return (
    <div className="max-w-md mx-auto space-y-4">
      <h2 className="text-lg font-bold text-center text-slate-200">Choose your mode</h2>
      <div className="grid grid-cols-2 gap-3">
        {MODES.map(({ mode, label, desc, emoji, wide }) => (
          <button
            key={mode}
            onClick={() => onSelectMode(mode)}
            className={`rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-center shadow-card
              hover:border-amber-500/50 hover:-translate-y-0.5 transition-all ${wide ? "col-span-2" : ""}`}
          >
            <div className="text-2xl mb-1" aria-hidden>
              {emoji}
            </div>
            <div className="font-semibold text-slate-100">{label}</div>
            <div className="text-xs text-slate-500 mt-1">{desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
