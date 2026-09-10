import { useState } from "react";
import { api } from "../api";
import { setToken } from "../auth";
import { Button } from "../components/ui/Button";
import type { User } from "../types";

interface LoginScreenProps {
  onAuthenticated: (user: User) => void;
}

type Mode = "login" | "register";

export function LoginScreen({ onAuthenticated }: LoginScreenProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = mode === "login"
        ? await api.login({ username, password })
        : await api.register({ username, password });
      setToken(response.access_token);
      onAuthenticated(response.user);
    } catch {
      setError(
        mode === "login"
          ? "Invalid username or password."
          : "Couldn't register — try a different username, or a password of at least 8 characters."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-6">
      <div className="text-center mb-6 space-y-1">
        <div className="text-4xl">🎮</div>
        <h2 className="text-2xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-amber-400 to-orange-300 bg-clip-text text-transparent">
            Level up
          </span>{" "}
          your knowledge
        </h2>
        <p className="text-slate-400 text-sm">Quick quizzes. Real games. Real XP.</p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-card p-6 space-y-5">
        <div className="flex gap-1 p-1 rounded-xl bg-slate-800/70 text-sm font-medium">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-lg py-1.5 transition-colors ${
              mode === "login" ? "bg-amber-500 text-slate-950" : "text-slate-300 hover:text-white"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 rounded-lg py-1.5 transition-colors ${
              mode === "register" ? "bg-amber-500 text-slate-950" : "text-slate-300 hover:text-white"
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm mb-1 text-slate-300">
              Username
            </label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100
                placeholder:text-slate-600 focus:border-amber-500 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm mb-1 text-slate-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === "register" ? 8 : undefined}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100
                placeholder:text-slate-600 focus:border-amber-500 transition-colors"
            />
          </div>
          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg py-2 px-3">
              {error}
            </p>
          )}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </Button>
        </form>
      </div>
    </div>
  );
}
