import { useEffect, useState } from "react";
import { api } from "../api";
import type { LeaderboardEntry } from "../types";

interface LeaderboardPageProps {
  onBack: () => void;
}

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
    <div className="max-w-md mx-auto space-y-4">
      <button onClick={onBack} className="text-sm underline">
        ← Back
      </button>

      <h2 className="text-xl font-semibold">Leaderboard</h2>

      {error && <p className="text-red-600">Couldn't load the leaderboard. Check that the backend is running.</p>}
      {!error && entries === null && <p className="text-gray-500">Loading...</p>}
      {entries !== null && entries.length === 0 && (
        <p className="text-gray-500">No players yet.</p>
      )}

      {entries && entries.length > 0 && (
        <ol className="space-y-2">
          {entries.map((entry, index) => (
            <li key={entry.username} className="p-3 border rounded-lg flex justify-between items-center">
              <span className="flex gap-3">
                <span className="text-gray-400 w-6 text-right">{index + 1}.</span>
                <span className="font-medium">{entry.username}</span>
              </span>
              <span className="text-sm text-gray-500">
                {entry.xp} XP · Level {entry.level}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
