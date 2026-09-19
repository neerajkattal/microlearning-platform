import { useEffect, useState } from "react";
import { adminApi } from "../adminApi";
import type { Stats } from "../adminTypes";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border-2 border-ink bg-white shadow-card p-4">
      <p className="text-xs uppercase tracking-wide text-stone-600 font-semibold">{label}</p>
      <p className="font-display text-3xl mt-1">{value.toLocaleString()}</p>
    </div>
  );
}

export function OverviewTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    adminApi
      .getStats()
      .then(setStats)
      .catch(() => setError(true));
  }, []);

  if (error) return <p className="text-red-600">Couldn't load stats.</p>;
  if (!stats) return <p className="text-stone-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Players" value={stats.total_users} />
        <StatCard label="Questions" value={stats.total_questions} />
        <StatCard label="Categories" value={stats.total_categories} />
        <StatCard label="Quiz sessions" value={stats.total_quiz_sessions} />
        <StatCard label="Pending requests" value={stats.pending_topic_requests} />
      </div>

      <div className="rounded-xl border-2 border-ink bg-white shadow-card p-4">
        <h3 className="font-semibold mb-3">Questions per category</h3>
        <ul className="space-y-1.5">
          {stats.questions_per_category.map((row) => (
            <li key={row.category} className="flex justify-between text-sm border-b border-stone-200 pb-1.5">
              <span>{row.category}</span>
              <span className="font-semibold">{row.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
