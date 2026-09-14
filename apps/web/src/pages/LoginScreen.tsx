import { useRef, useState } from "react";
import { api } from "../api";
import { setToken } from "../auth";
import { Button } from "../components/ui/Button";
import { DemoQuiz } from "../components/DemoQuiz";
import type { User } from "../types";

interface LoginScreenProps {
  onAuthenticated: (user: User) => void;
}

type Mode = "login" | "register";

const FEATURES = [
  "🏎️ Lane Rush",
  "🎈 Balloon Pop",
  "🏆 Leaderboard",
  "⚡ XP & Levels",
  "💡 Hints",
];

export function LoginScreen({ onAuthenticated }: LoginScreenProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formCardRef = useRef<HTMLDivElement>(null);

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

  function goToRegister() {
    setMode("register");
    formCardRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <div className="text-center space-y-4 pt-2 motion-safe:animate-card-in">
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide
            text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1"
        >
          🎮 Gamified Trivia
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-100">
          Trivia that plays{" "}
          <span className="bg-gradient-to-r from-amber-400 to-orange-300 bg-clip-text text-transparent">
            like a game
          </span>
          .
        </h1>
        <p className="text-slate-400 max-w-xl mx-auto">
          Dodge into the right lane. Pop the right balloon. Real XP, streaks, and a leaderboard —
          powered by real trivia questions.
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          {FEATURES.map((feature) => (
            <span
              key={feature}
              className="text-xs font-medium text-slate-300 bg-slate-900/60 border border-slate-800
                rounded-full px-3 py-1 whitespace-nowrap"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="motion-safe:animate-card-in" style={{ animationDelay: "80ms" }}>
          <DemoQuiz onCreateAccount={goToRegister} />
        </div>

        <div
          ref={formCardRef}
          className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-card p-6 space-y-5
            motion-safe:animate-card-in scroll-mt-6"
          style={{ animationDelay: "140ms" }}
        >
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
    </div>
  );
}
