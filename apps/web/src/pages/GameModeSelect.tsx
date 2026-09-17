import { CategoryBackdrop } from "../components/CategoryBackdrop";

export type GameMode = "classic" | "lane-rush" | "balloon-pop";

interface GameModeSelectProps {
  categoryName: string;
  color: string;
  icon: string;
  onSelectMode: (mode: GameMode) => void;
  onBack: () => void;
}

const MODES: { mode: GameMode; label: string; desc: string; emoji: string }[] = [
  { mode: "classic", label: "Classic", desc: "Tap the right answer button", emoji: "📝" },
  { mode: "lane-rush", label: "Lane Rush", desc: "Steer your car into the right lane", emoji: "🏎️" },
  { mode: "balloon-pop", label: "Balloon Pop", desc: "Pop the balloon with the right answer", emoji: "🎈" },
];

export function GameModeSelect({ categoryName, color, icon, onSelectMode, onBack }: GameModeSelectProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <CategoryBackdrop categoryName={categoryName} color={color} />

      <button onClick={onBack} className="text-sm text-stone-600 hover:text-ink transition-colors">
        ← Back
      </button>

      <div className="text-center space-y-2 motion-safe:animate-card-in">
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide rounded-full px-3 py-1"
          style={{ color, backgroundColor: `${color}1a`, borderColor: `${color}55`, borderWidth: 1 }}
        >
          <span aria-hidden>{icon}</span> {categoryName}
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
          Choose your mode
        </h2>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {MODES.map(({ mode, label, desc, emoji }, index) => (
          <button
            key={mode}
            onClick={() => onSelectMode(mode)}
            style={{ animationDelay: `${index * 60}ms` }}
            className="group rounded-2xl border-2 border-ink bg-white/70 p-6 text-center shadow-card
              hover:border-ink hover:shadow-glow hover:-translate-y-1.5 transition-all
              motion-safe:animate-card-in"
          >
            <div
              className="mx-auto mb-3 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl
                bg-stone-100/80 border border-ink group-hover:border-ink transition-colors"
              aria-hidden
            >
              {emoji}
            </div>
            <div className="font-bold text-ink text-lg">{label}</div>
            <div className="text-sm text-stone-500 mt-1.5">{desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
