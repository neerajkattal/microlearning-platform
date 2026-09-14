import { useEffect, useState } from "react";
import { api } from "../api";
import { avatarEmoji } from "../avatars";
import { ProgressRing } from "../components/ProgressRing";
import type { UserMe } from "../types";

interface StatsPageProps {
  onBack: () => void;
}

const XP_PER_LEVEL = 100;

export function StatsPage({ onBack }: StatsPageProps) {
  const [me, setMe] = useState<UserMe | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .getMe()
      .then(setMe)
      .catch(() => setError(true));
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={onBack} className="text-sm text-slate-400 hover:text-white transition-colors">
        ← Back
      </button>

      {error && (
        <p className="text-red-400 text-center bg-red-500/10 border border-red-500/30 rounded-lg py-3 px-4">
          Couldn't load your stats. Check that the backend is running.
        </p>
      )}
      {!error && me === null && <p className="text-slate-500 text-center">Loading your stats...</p>}

      {me && (
        <div className="space-y-6">
          <div className="text-center space-y-1 motion-safe:animate-card-in">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100">
              Welcome back, {me.user.username}!
            </h2>
            <p className="text-slate-500 text-sm">Your gamified learning journey</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div
              className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-card p-5 text-center
                space-y-2 motion-safe:animate-card-in"
            >
              <div
                className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/20
                  border border-amber-500/30 text-3xl flex items-center justify-center"
              >
                <span aria-hidden>{avatarEmoji(me.user.avatar)}</span>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total XP</p>
              <p className="text-2xl font-extrabold text-amber-400">{me.stats.xp}</p>
            </div>

            <div
              className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-card p-5 flex flex-col
                items-center justify-center gap-2 motion-safe:animate-card-in"
              style={{ animationDelay: "60ms" }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Progress to level {me.stats.level + 1}
              </p>
              <ProgressRing percent={me.stats.xp % XP_PER_LEVEL} size={80}>
                <span className="text-lg font-extrabold text-slate-100">{me.stats.level}</span>
              </ProgressRing>
              <p className="text-xs text-slate-500">
                {me.stats.xp % XP_PER_LEVEL}/{XP_PER_LEVEL} XP
              </p>
            </div>

            <div
              className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-card p-5 text-center
                space-y-2 motion-safe:animate-card-in"
              style={{ animationDelay: "120ms" }}
            >
              <p className="text-4xl" aria-hidden>
                🔥
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Current streak</p>
              <p className="text-2xl font-extrabold text-slate-100">{me.stats.current_streak} day(s)</p>
              <p className="text-xs text-slate-500">Longest: {me.stats.longest_streak} day(s)</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-slate-200">
              {`Achievements (${me.achievements.length})`}
            </h3>
            {me.achievements.length === 0 && (
              <p className="text-sm text-slate-500">None yet — play a quiz to start earning some.</p>
            )}
            {me.achievements.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {me.achievements.map((achievement) => (
                  <div key={achievement.code} className="flex flex-col items-center gap-1.5 text-center">
                    <div
                      title={achievement.description}
                      className="w-16 h-16 flex items-center justify-center text-2xl bg-gradient-to-br
                        from-amber-500/20 to-orange-500/10 border-2 border-amber-500/40 shadow-glow"
                      style={{ clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }}
                    >
                      <span aria-hidden>{achievement.icon}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-300 leading-tight">{achievement.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
