import { useEffect, useState } from "react";
import { adminApi } from "../adminApi";
import type { TopicRequestItem } from "../adminTypes";

export function TopicRequestsTab() {
  const [requests, setRequests] = useState<TopicRequestItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    adminApi
      .listTopicRequests("pending")
      .then(setRequests)
      .catch(() => setError("Couldn't load topic requests."));
  }

  useEffect(load, []);

  async function fulfill(id: number) {
    setError(null);
    try {
      await adminApi.fulfillTopicRequest(id);
      setRequests((prev) => prev!.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that request.");
    }
  }

  async function dismiss(id: number) {
    setError(null);
    try {
      await adminApi.dismissTopicRequest(id);
      setRequests((prev) => prev!.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that request.");
    }
  }

  if (error) return <p className="text-red-600">{error}</p>;
  if (!requests) return <p className="text-stone-500">Loading...</p>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-600">
        Topics players searched for that don't exist yet. Add the category and questions yourself in "Categories
        &amp; Questions", then mark the request fulfilled here.
      </p>
      {requests.length === 0 && (
        <p className="rounded-xl border-2 border-ink bg-white shadow-card p-4 text-sm text-stone-500">
          No pending requests.
        </p>
      )}
      <ul className="space-y-2">
        {requests.map((request) => (
          <li
            key={request.id}
            className="rounded-xl border-2 border-ink bg-white shadow-card p-4 flex items-center justify-between gap-3"
          >
            <div>
              <p className="font-semibold">
                {request.topic}
                {request.request_count > 1 && (
                  <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full border border-ink bg-accent-yellow">
                    ×{request.request_count}
                  </span>
                )}
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                First asked by {request.requested_by_username ?? "someone"} ·{" "}
                {new Date(request.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => dismiss(request.id)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border-2 border-ink bg-white hover:bg-stone-100"
              >
                Dismiss
              </button>
              <button
                onClick={() => fulfill(request.id)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border-2 border-ink bg-accent-yellow"
              >
                Mark fulfilled
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
