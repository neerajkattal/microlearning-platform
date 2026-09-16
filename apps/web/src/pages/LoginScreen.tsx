import { useRef, useState } from "react";
import { api } from "../api";
import { setToken } from "../auth";
import { Button } from "../components/ui/Button";
import { AvatarPicker } from "../components/AvatarPicker";
import { DemoQuiz } from "../components/DemoQuiz";
import { HeroBackdrop } from "../components/HeroBackdrop";
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [avatar, setAvatar] = useState("astronaut");
  const formCardRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
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

  // Clearing confirmPassword and any old error on every mode switch means
  // a stale mismatch from a previous attempt can never silently block a
  // later, unrelated submit.
  function switchMode(next: Mode) {
    setMode(next);
    setConfirmPassword("");
    setError(null);
  }

  function goToRegister() {
    switchMode("register");
    formCardRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

  function goToLogin() {
    switchMode("login");
    formCardRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-16">
      {/* Hero: full-bleed, no card frame around it - big left-aligned
          headline on desktop with the demo quiz floating on the right
          (stacks below on mobile, per the brief - headline -> CTA ->
          feature pills -> one quiz card, no squeezed desktop layout).
          HeroBackdrop crossfades through real photos from a spread of
          quiz topics behind a warm scrim, instead of a flat color
          gradient - it's what this app's questions are actually about. */}
      <div className="relative -mx-4 px-4 overflow-hidden">
        <HeroBackdrop />
        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center pt-6 pb-4 sm:pt-14 sm:pb-10">
          <div className="text-center lg:text-left space-y-6 motion-safe:animate-card-in">
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide
                text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1"
            >
              🎮 Gamified Trivia
            </span>
            <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white text-balance leading-[1.05]">
              Trivia that plays{" "}
              <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400 bg-clip-text text-transparent">
                like a game
              </span>
              .
            </h1>
            <p className="text-lg text-stone-300 max-w-xl mx-auto lg:mx-0">
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
                  className="text-xs font-medium text-stone-300 bg-stone-900/60 border border-stone-800
                    rounded-full px-3 py-1 whitespace-nowrap transition-all duration-150 cursor-default
                    hover:border-amber-500/60 hover:text-amber-300 hover:-translate-y-0.5 hover:shadow-glow"
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
        className="max-w-md mx-auto rounded-2xl border border-stone-800 bg-stone-900/60 shadow-card p-6 space-y-5
          motion-safe:animate-card-in scroll-mt-6"
        style={{ animationDelay: "140ms" }}
      >
        <div className="flex gap-1 p-1 rounded-xl bg-stone-800/70 text-sm font-medium">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`flex-1 rounded-lg py-1.5 transition-colors ${
              mode === "login"
                ? "bg-gradient-to-r from-amber-600 to-rose-500 text-white"
                : "text-stone-300 hover:text-white"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`flex-1 rounded-lg py-1.5 transition-colors ${
              mode === "register"
                ? "bg-gradient-to-r from-amber-600 to-rose-500 text-white"
                : "text-stone-300 hover:text-white"
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <p className="block text-sm mb-1.5 text-stone-300">Choose your character</p>
              <AvatarPicker value={avatar} onChange={setAvatar} />
            </div>
          )}
          <div>
            <label htmlFor="username" className="block text-sm mb-1 text-stone-300">
              Username
            </label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full p-2.5 rounded-lg bg-stone-950 border border-stone-700 text-stone-100
                placeholder:text-stone-600 focus:border-amber-500 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm mb-1 text-stone-300">
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
              className="w-full p-2.5 rounded-lg bg-stone-950 border border-stone-700 text-stone-100
                placeholder:text-stone-600 focus:border-amber-500 transition-colors"
            />
          </div>
          {mode === "register" && (
            <div>
              <label htmlFor="confirm-password" className="block text-sm mb-1 text-stone-300">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full p-2.5 rounded-lg bg-stone-950 border border-stone-700 text-stone-100
                  placeholder:text-stone-600 focus:border-amber-500 transition-colors"
              />
            </div>
          )}
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
