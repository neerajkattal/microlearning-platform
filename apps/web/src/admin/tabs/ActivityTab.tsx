import { useEffect, useState } from "react";
import { adminApi } from "../adminApi";
import type { ActivityLogEntry } from "../adminTypes";

const EVENT_LABELS: Record<string, string> = {
  user_registered: "🆕 Registered",
  user_login: "🔑 Logged in",
  quiz_completed: "✅ Finished a quiz",
};

export function ActivityTab() {
  const [entries, setEntries] = useState<ActivityLogEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    adminApi
      .getActivity(100)
      .then(setEntries)
      .catch(() => setError(true));
  }, []);

  if (error) return <p className="text-red-600">Couldn't load activity.</p>;
  if (!entries) return <p className="text-stone-500">Loading...</p>;

  return (
    <div className="rounded-xl border-2 border-ink bg-white shadow-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-ink text-left">
            <th className="p-3">Event</th>
            <th className="p-3">User</th>
            <th className="p-3">Detail</th>
            <th className="p-3">When</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-stone-200 last:border-0">
              <td className="p-3">{EVENT_LABELS[entry.event_type] ?? entry.event_type}</td>
              <td className="p-3 font-semibold">{entry.username ?? "—"}</td>
              <td className="p-3 text-stone-600">{entry.detail ?? "—"}</td>
              <td className="p-3 text-stone-600 whitespace-nowrap">{new Date(entry.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {entries.length === 0 && <p className="p-4 text-sm text-stone-500">Nothing yet.</p>}
    </div>
  );
}
