import { useState } from "react";
import { api } from "../api";
import { setToken } from "../auth";
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
    <div className="max-w-sm mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-center">Microlearning Platform</h2>
      <div className="flex gap-4 justify-center text-sm">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={mode === "login" ? "font-semibold underline" : "text-gray-500"}
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={mode === "register" ? "font-semibold underline" : "text-gray-500"}
        >
          Register
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="username" className="block text-sm mb-1">
            Username
          </label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full p-2 border rounded-lg"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === "register" ? 8 : undefined}
            className="w-full p-2 border rounded-lg"
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full p-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
        >
          {submitting ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>
    </div>
  );
}
