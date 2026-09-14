import { useRef, useState } from "react";
import { api } from "../api";
import { setToken } from "../auth";
import { Button } from "../components/ui/Button";
import { AvatarPicker } from "../components/AvatarPicker";
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
  const [avatar, setAvatar] = useState("astronaut");
  const formCardRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = mode === "login"
        ? await api.login({ username, password })
        : await api.register({ username, password, avatar });
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

  function goToLogin() {
    setMode("login");
    formCardRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-16">
      {/* Hero: full-bleed, no card frame around it - big left-aligned
          headline on desktop with the demo quiz floating on the right
          (stacks below on mobile, per the brief - headline -> CTA ->
          feature pills -> one quiz card, no squeezed desktop layout). A
          slow-drifting purple/blue glow sits directly on the page
          background instead of being boxed in, motion-safe gated same
          as everything else on this page. */}
      <div className="relative -mx-4 px-4 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 motion-safe:animate-drift"
          aria-hidden
          style={{
            background:
              "radial-gradient(44rem 30rem at 8% 10%, rgba(168,85,247,0.30), transparent 62%), " +
              "radial-gradient(36rem 28rem at 95% 0%, rgba(56,189,248,0.20), transparent 65%), " +
              "radial-gradient(30rem 26rem at 60% 100%, rgba(217,70,239,0.16), transparent 60%)",
          }}
        />
        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center pt-6 pb-4 sm:pt-14 sm:pb-10">
          <div className="text-center lg:text-left space-y-6 motion-safe:animate-card-in">
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide
                text-violet-300 bg-violet-500/10 border border-violet-500/30 rounded-full px-3 py-1"
            >
              🎮 Gamified Trivia
            </span>
            <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white text-balance leading-[1.05]">
              Trivia that plays{" "}
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-300 to-sky-300 bg-clip-text text-transparent">
                like a game
              </span>
              .
            </h1>
            <p className="text-lg text-slate-300 max-w-xl mx-auto lg:mx-0">
              Dodge into the right lane. Pop the right balloon. Real XP, streaks, and a leaderboard —
              powered by real trivia questions.
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-3 pt-1">
              <Button onClick={goToRegister}>Get started →</Button>
              <Button variant="secondary" onClick={goToLogin}>
                Sign in
              </Button>
            </div>
            <div className="flex flex-wrap justify-center lg:justify-start gap-2 pt-1">
              {FEATURES.map((feature) => (
                <span
                  key={feature}
                  className="text-xs font-medium text-slate-300 bg-slate-900/60 border border-slate-800
                    rounded-full px-3 py-1 whitespace-nowrap transition-all duration-150 cursor-default
                    hover:border-violet-500/60 hover:text-violet-300 hover:-translate-y-0.5 hover:shadow-glow"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>

          <div
            className="motion-safe:animate-card-in motion-safe:animate-float"
            style={{ animationDelay: "80ms" }}
          >
            <DemoQuiz onCreateAccount={goToRegister} />
          </div>
        </div>
      </div>

      <div
        ref={formCardRef}
        className="max-w-md mx-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-card p-6 space-y-5
          motion-safe:animate-card-in scroll-mt-6"
        style={{ animationDelay: "140ms" }}
      >
        <div className="flex gap-1 p-1 rounded-xl bg-slate-800/70 text-sm font-medium">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-lg py-1.5 transition-colors ${
              mode === "login"
                ? "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 rounded-lg py-1.5 transition-colors ${
              mode === "register"
                ? "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <p className="block text-sm mb-1.5 text-slate-300">Choose your character</p>
              <AvatarPicker value={avatar} onChange={setAvatar} />
            </div>
          )}
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
                placeholder:text-slate-600 focus:border-violet-500 transition-colors"
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
                placeholder:text-slate-600 focus:border-violet-500 transition-colors"
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
