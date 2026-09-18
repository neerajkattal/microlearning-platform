import { useState } from "react";
import { adminApi } from "./adminApi";
import { setAdminToken } from "./adminAuth";

interface AdminLoginProps {
  onLoggedIn: (adminUsername: string) => void;
}

export function AdminLogin({ onLoggedIn }: AdminLoginProps) {
  const [mode, setMode] = useState<"login" | "bootstrap">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response =
        mode === "login"
          ? await adminApi.login(username, password)
          : await adminApi.bootstrap(username, password, adminKey);
      setAdminToken(response.access_token);
      onLoggedIn(response.admin_username);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border-2 border-ink bg-white shadow-card p-6 space-y-5">
        <div>
          <h1 className="font-display text-2xl">Admin</h1>
          <p className="text-sm text-stone-600 mt-1">
            {mode === "login" ? "Sign in to manage PlayToLearn." : "Create the first (and only) admin account."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-username" className="block text-sm mb-1 text-stone-700">
              Username
            </label>
            <input
              id="admin-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full p-2.5 rounded-lg bg-paper border-2 border-ink text-ink focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-sm mb-1 text-stone-700">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === "bootstrap" ? 8 : undefined}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full p-2.5 rounded-lg bg-paper border-2 border-ink text-ink focus:outline-none"
            />
          </div>
          {mode === "bootstrap" && (
            <div>
              <label htmlFor="admin-key" className="block text-sm mb-1 text-stone-700">
                Admin key
              </label>
              <input
                id="admin-key"
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                required
                placeholder="ADMIN_API_KEY from Render"
                className="w-full p-2.5 rounded-lg bg-paper border-2 border-ink text-ink focus:outline-none"
              />
              <p className="text-xs text-stone-500 mt-1">
                Proves you're the operator, not just anyone reaching this page. Only needed this once.
              </p>
            </div>
          )}
          {error && (
            <p className="text-sm bg-accent-coral/20 border-2 border-ink rounded-lg py-2 px-3 text-ink">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl px-4 py-2.5 font-semibold text-sm border-2 border-ink bg-accent-yellow
              text-ink shadow-card hover:shadow-glow hover:-translate-y-0.5 active:shadow-none active:translate-y-0
              transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Please wait..." : mode === "login" ? "Sign in" : "Create admin account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === "login" ? "bootstrap" : "login"));
            setError(null);
          }}
          className="text-xs text-stone-500 hover:text-ink underline"
        >
          {mode === "login" ? "First time setting this up?" : "Already have an admin account? Sign in"}
        </button>
      </div>
    </div>
  );
}
