import { useState } from "react";
import { api } from "../api";
import { avatarEmoji } from "../avatars";
import { AvatarPicker } from "../components/AvatarPicker";
import { Button } from "../components/ui/Button";
import type { User } from "../types";

interface ProfilePageProps {
  user: User;
  onUpdated: (user: User) => void;
  onBack: () => void;
}

export function ProfilePage({ user, onUpdated, onBack }: ProfilePageProps) {
  const [avatar, setAvatar] = useState(user.avatar);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = avatar !== user.avatar;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateProfile({ avatar });
      onUpdated(updated);
    } catch {
      setError("Couldn't save your character. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-5">
      <button onClick={onBack} className="text-sm text-stone-600 hover:text-ink transition-colors">
        ← Back
      </button>

      <div className="rounded-2xl border border-ink bg-white/60 shadow-card p-6 text-center space-y-2">
        <div className="text-6xl motion-safe:animate-pop-in" key={avatar} aria-hidden>
          {avatarEmoji(avatar)}
        </div>
        <h2 className="text-xl font-bold text-ink">{user.username}</h2>
      </div>

      <div>
        <p className="text-sm mb-1.5 text-stone-700">Choose your character</p>
        <AvatarPicker value={avatar} onChange={setAvatar} />
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg py-2 px-3">
          {error}
        </p>
      )}

      <Button onClick={handleSave} disabled={!changed || saving} className="w-full">
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
