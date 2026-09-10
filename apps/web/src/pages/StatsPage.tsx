import { useEffect, useState } from "react";
import { api } from "../api";
import type { UserMe } from "../types";

interface StatsPageProps {
  onBack: () => void;
}

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
    <div className="max-w-md mx-auto space-y-5">
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
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-card p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-orange-500
              text-slate-950 text-2xl font-extrabold flex items-center justify-center">
              {me.user.username.slice(0, 1).toUpperCase()}
            </div>
            <h2 className="text-xl font-bold">{me.user.username}</h2>

            <div className="grid grid-cols-3 gap-3 text-center pt-2">
              <div>
                <p className="text-2xl font-extrabold text-amber-400">{me.stats.xp}</p>
                <p className="text-xs text-slate-500 mt-0.5">XP</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-100">{me.stats.level}</p>
                <p className="text-xs text-slate-500 mt-0.5">Level</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-100 flex items-center justify-center gap-1">
                  <span aria-hidden>🔥</span>
                  {me.stats.current_streak}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Streak</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">Longest streak: {me.stats.longest_streak} day(s)</p>
          </div>

          <div>
            <h3 className="font-semibold mb-2 text-slate-200">Achievements</h3>
            {me.achievements.length === 0 && (
              <p className="text-sm text-slate-500">
                None yet — play a quiz to start earning some.
              </p>
            )}
            <ul className="grid grid-cols-1 gap-2">
              {me.achievements.map((achievement) => (
                <li
                  key={achievement.code}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 flex gap-3 items-start"
                >
                  <span className="text-xl" aria-hidden>
                    {achievement.icon}
                  </span>
                  <span>
                    <div className="font-medium text-slate-100">{achievement.name}</div>
                    <div className="text-sm text-slate-500">{achievement.description}</div>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
