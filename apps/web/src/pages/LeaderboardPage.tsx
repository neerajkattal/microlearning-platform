import { useEffect, useState } from "react";
import { api } from "../api";
import { avatarEmoji } from "../avatars";
import { LoadingScreen } from "../components/ui/LoadingScreen";
import type { LeaderboardEntry } from "../types";

interface LeaderboardPageProps {
  onBack: () => void;
  currentUsername?: string;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export function LeaderboardPage({ onBack, currentUsername }: LeaderboardPageProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .getLeaderboard()
      .then(setEntries)
      .catch(() => setError(true));
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <button onClick={onBack} className="text-sm text-stone-600 hover:text-ink transition-colors">
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
      {!error && entries === null && <LoadingScreen />}
      {entries !== null && entries.length === 0 && (
        <p className="text-stone-500 text-center">No players yet.</p>
      )}

      {entries && entries.length > 0 && (
        <div className="rounded-2xl border border-ink bg-white/60 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500 border-b border-ink">
                  <th className="py-3 pl-4 pr-2 w-10">Rank</th>
                  <th className="py-3 px-2">Player</th>
                  <th className="py-3 px-2 text-right">XP</th>
                  <th className="py-3 px-2 text-right">Level</th>
                  <th className="py-3 pr-4 pl-2 text-right">Badges</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => {
                  const isMe = entry.username === currentUsername;
                  return (
                    <tr
                      key={entry.username}
                      className={`border-b border-ink last:border-b-0 ${
                        isMe
                          ? "bg-accent-yellow"
                          : index < 3
                            ? "bg-accent-yellow"
                            : ""
                      }`}
                    >
                      <td className="py-3 pl-4 pr-2 text-center text-base" aria-hidden>
                        {MEDALS[index] ?? index + 1}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="shrink-0 w-8 h-8 rounded-full bg-accent-yellow border-2 border-ink text-base flex items-center justify-center"
                            aria-hidden
                          >
                            {avatarEmoji(entry.avatar)}
                          </span>
                          <span className="font-semibold text-ink truncate">{entry.username}</span>
                          {isMe && (
                            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-ink bg-accent-yellow border border-ink rounded-full px-1.5 py-0.5">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-amber-700 whitespace-nowrap">
                        {entry.xp}
                      </td>
                      <td className="py-3 px-2 text-right text-stone-700 whitespace-nowrap">{entry.level}</td>
                      <td className="py-3 pr-4 pl-2 text-right text-stone-700 whitespace-nowrap">
                        <span aria-hidden>🎖️</span> {entry.badges}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
