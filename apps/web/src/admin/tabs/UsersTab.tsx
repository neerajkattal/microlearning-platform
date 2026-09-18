import { useEffect, useState } from "react";
import { adminApi } from "../adminApi";
import type { AdminUserDetail } from "../adminTypes";

export function UsersTab() {
  const [users, setUsers] = useState<AdminUserDetail[] | null>(null);
  const [search, setSearch] = useState("");
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load(searchTerm?: string) {
    adminApi
      .listUsers(searchTerm || undefined)
      .then(setUsers)
      .catch(() => setError("Couldn't load users."));
  }

  useEffect(() => {
    load();
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(search);
  }

  async function toggleHidden(user: AdminUserDetail) {
    setError(null);
    try {
      const updated = user.hidden_from_leaderboard ? await adminApi.unhideUser(user.id) : await adminApi.hideUser(user.id);
      setUsers((prev) => prev!.map((u) => (u.id === user.id ? updated : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that user.");
    }
  }

  async function submitRename(user: AdminUserDetail) {
    setError(null);
    try {
      const updated = await adminApi.renameUser(user.id, renameValue);
      setUsers((prev) => prev!.map((u) => (u.id === user.id ? updated : u)));
      setRenamingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't rename that user.");
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username..."
          className="flex-1 p-2.5 rounded-lg bg-white border-2 border-ink text-ink"
        />
        <button
          type="submit"
          className="rounded-lg px-4 py-2 text-sm font-semibold border-2 border-ink bg-white hover:bg-stone-100"
        >
          Search
        </button>
      </form>

      {error && (
        <p className="text-sm bg-accent-coral/20 border-2 border-ink rounded-lg py-2 px-3">{error}</p>
      )}

      <div className="rounded-xl border-2 border-ink bg-white shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-ink text-left">
              <th className="p-3">Username</th>
              <th className="p-3">Joined</th>
              <th className="p-3">Last login</th>
              <th className="p-3">Leaderboard</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {users?.map((user) => (
              <tr key={user.id} className="border-b border-stone-200 last:border-0">
                <td className="p-3 font-semibold">
                  {renamingId === user.id ? (
                    <div className="flex gap-1.5">
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="w-32 p-1 rounded border-2 border-ink text-xs"
                        autoFocus
                      />
                      <button
                        onClick={() => submitRename(user)}
                        className="text-xs px-2 rounded border-2 border-ink bg-accent-yellow"
                      >
                        Save
                      </button>
                      <button onClick={() => setRenamingId(null)} className="text-xs px-2 text-stone-500">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    user.username
                  )}
                </td>
                <td className="p-3 text-stone-600">{new Date(user.created_at).toLocaleDateString()}</td>
                <td className="p-3 text-stone-600">
                  {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : "Never"}
                </td>
                <td className="p-3">
                  {user.hidden_from_leaderboard ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full border border-ink bg-stone-100">
                      Hidden
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full border border-ink bg-accent-yellow">
                      Visible
                    </span>
                  )}
                </td>
                <td className="p-3 whitespace-nowrap">
                  {renamingId !== user.id && (
                    <button
                      onClick={() => {
                        setRenamingId(user.id);
                        setRenameValue(user.username);
                      }}
                      className="text-xs font-semibold text-ink underline mr-3"
                    >
                      Rename
                    </button>
                  )}
                  <button onClick={() => toggleHidden(user)} className="text-xs font-semibold text-ink underline">
                    {user.hidden_from_leaderboard ? "Unhide" : "Hide"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users?.length === 0 && <p className="p-4 text-sm text-stone-500">No users match.</p>}
      </div>
    </div>
  );
}
