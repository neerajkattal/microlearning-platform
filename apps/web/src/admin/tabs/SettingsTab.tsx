import { useEffect, useState } from "react";
import { adminApi } from "../adminApi";
import type { GameConfig } from "../adminTypes";

const FIELDS: { key: keyof GameConfig; label: string; step?: string }[] = [
  { key: "base_correct_xp", label: "Base XP for a correct answer" },
  { key: "attempt_xp", label: "XP for a wrong (but attempted) answer" },
  { key: "difficulty_multiplier_easy", label: "Easy difficulty multiplier", step: "0.1" },
  { key: "difficulty_multiplier_medium", label: "Medium difficulty multiplier", step: "0.1" },
  { key: "difficulty_multiplier_hard", label: "Hard difficulty multiplier", step: "0.1" },
  { key: "speed_bonus_threshold_ms", label: "Speed bonus threshold (ms)" },
  { key: "speed_bonus_xp", label: "Speed bonus XP" },
  { key: "max_streak_bonus_days", label: "Max streak bonus (days)" },
  { key: "streak_bonus_xp_per_day", label: "Streak bonus XP per day" },
  { key: "xp_per_level", label: "XP needed per level" },
];

export function SettingsTab() {
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.getGameConfig().then(setConfig).catch(() => setError("Couldn't load game config."));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setError(null);
    setSaving(true);
    setSaved(false);
    try {
      const updated = await adminApi.updateGameConfig(config);
      setConfig(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  if (error && !config) return <p className="text-red-600">{error}</p>;
  if (!config) return <p className="text-stone-500">Loading...</p>;

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border-2 border-ink bg-white shadow-card p-5 space-y-4 max-w-lg">
      <p className="text-sm text-stone-600">
        These feed directly into the server-side XP formula - changes apply to every answer submitted after you save.
      </p>
      {FIELDS.map(({ key, label, step }) => (
        <div key={key} className="flex items-center justify-between gap-4">
          <label htmlFor={key} className="text-sm">
            {label}
          </label>
          <input
            id={key}
            type="number"
            step={step ?? "1"}
            value={config[key]}
            onChange={(e) => setConfig({ ...config, [key]: Number(e.target.value) })}
            className="w-28 p-1.5 rounded border-2 border-ink text-sm text-right"
          />
        </div>
      ))}
      {error && <p className="text-sm bg-accent-coral/20 border-2 border-ink rounded-lg py-2 px-3">{error}</p>}
      {saved && !error && <p className="text-sm text-emerald-700 font-semibold">Saved.</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg px-4 py-2 text-sm font-semibold border-2 border-ink bg-accent-yellow shadow-card
          hover:shadow-glow disabled:opacity-40"
      >
        {saving ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
