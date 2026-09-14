import { useEffect, useState } from "react";
import { api } from "../api";
import type { LeaderboardEntry } from "../types";

interface LeaderboardPageProps {
  onBack: () => void;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export function LeaderboardPage({ onBack }: LeaderboardPageProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .getLeaderboard()
      .then(setEntries)
      .catch(() => setError(true));
  }, []);

  return (
    <div className="max-w-md mx-auto space-y-5">
      <button onClick={onBack} className="text-sm text-slate-400 hover:text-white transition-colors">
        ← Back
      </button>

      <h2 className="text-xl font-bold text-center">
        <span aria-hidden>🏆</span> Leaderboard
      </h2>

      {error && (
        <p className="text-red-400 text-center bg-red-500/10 border border-red-500/30 rounded-lg py-3 px-4">
          Couldn't load the leaderboard. Check that the backend is running.
        </p>
      )}
      {!error && entries === null && <p className="text-slate-500 text-center">Loading...</p>}
      {entries !== null && entries.length === 0 && (
        <p className="text-slate-500 text-center">No players yet.</p>
      )}

      {entries && entries.length > 0 && (
        <ol className="space-y-2">
          {entries.map((entry, index) => (
            <li
              key={entry.username}
              className={`rounded-xl border p-3.5 flex justify-between items-center ${
                index < 3
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-slate-800 bg-slate-900/60"
              }`}
            >
              <span className="flex items-center gap-3 min-w-0 flex-1">
                <span className="w-7 shrink-0 text-center text-lg" aria-hidden>
                  {MEDALS[index] ?? index + 1}
                </span>
                <span className="font-semibold text-slate-100 truncate">{entry.username}</span>
              </span>
              <span className="text-sm text-slate-400 shrink-0 whitespace-nowrap pl-3">
                {entry.xp} XP · Level {entry.level}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
