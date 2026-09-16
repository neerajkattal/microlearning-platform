import { AVATAR_OPTIONS } from "../avatars";

interface AvatarPickerProps {
  value: string;
  onChange: (key: string) => void;
}

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2" role="group" aria-label="Choose your character">
      {AVATAR_OPTIONS.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          aria-label={option.label}
          aria-pressed={value === option.key}
          title={option.label}
          className={`aspect-square rounded-xl border text-2xl flex items-center justify-center
            transition-all duration-150 hover:-translate-y-0.5 ${
              value === option.key
                ? "border-amber-500 bg-amber-500/15 shadow-glow"
                : "border-stone-700 bg-stone-950/60 hover:border-stone-600"
            }`}
        >
          <span aria-hidden>{option.emoji}</span>
        </button>
      ))}
    </div>
  );
}
