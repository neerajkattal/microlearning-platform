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
    <div className="max-w-md mx-auto space-y-4">
      <button onClick={onBack} className="text-sm underline">
        ← Back
      </button>

      {error && <p className="text-red-600">Couldn't load your stats. Check that the backend is running.</p>}
      {!error && me === null && <p className="text-gray-500">Loading your stats...</p>}

      {me && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">{me.user.username}</h2>
            <dl className="grid grid-cols-2 gap-y-2 mt-3 text-sm">
              <dt className="text-gray-500">XP</dt>
              <dd className="text-right font-medium">{me.stats.xp}</dd>
              <dt className="text-gray-500">Level</dt>
              <dd className="text-right font-medium">{me.stats.level}</dd>
              <dt className="text-gray-500">Current streak</dt>
              <dd className="text-right font-medium">{me.stats.current_streak} day(s)</dd>
              <dt className="text-gray-500">Longest streak</dt>
              <dd className="text-right font-medium">{me.stats.longest_streak} day(s)</dd>
            </dl>
          </div>

          <div>
            <h3 className="font-medium mb-2">Achievements</h3>
            {me.achievements.length === 0 && (
              <p className="text-sm text-gray-500">
                None yet — play a quiz to start earning some.
              </p>
            )}
            <ul className="space-y-2">
              {me.achievements.map((achievement) => (
                <li key={achievement.code} className="p-3 border rounded-lg flex gap-3 items-start">
                  <span className="text-xl" aria-hidden>
                    {achievement.icon}
                  </span>
                  <span>
                    <div className="font-medium">{achievement.name}</div>
                    <div className="text-sm text-gray-500">{achievement.description}</div>
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
