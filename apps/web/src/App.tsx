import { useEffect, useState } from "react";
import { api, UnauthorizedError } from "./api";
import { clearToken, getToken } from "./auth";
import type { CompleteSessionResult, QuizSession, User } from "./types";
import { CategorySelect } from "./pages/CategorySelect";
import { GameModeSelect, type GameMode } from "./pages/GameModeSelect";
import { LoginScreen } from "./pages/LoginScreen";
import { StatsPage } from "./pages/StatsPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { QuizQuestion } from "./components/QuizQuestion";
import { LaneRush } from "./components/LaneRush";
import { BalloonPop } from "./components/BalloonPop";
import { ResultsScreen } from "./components/ResultsScreen";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

type HealthStatus = "checking" | "ok" | "error";

type Screen =
  | { name: "checking-auth" }
  | { name: "auth" }
  | { name: "categories" }
  | { name: "mode-select"; categorySlug: string | null }
  | { name: "quiz"; session: QuizSession; mode: GameMode }
  | { name: "results"; result: CompleteSessionResult }
  | { name: "stats" }
  | { name: "leaderboard" };

/** Screens that count as "logged in and browsing" — used to decide when
 * the header's nav links (Stats/Leaderboard) make sense to show. */
function isMainAppScreen(screen: Screen): boolean {
  return screen.name !== "checking-auth" && screen.name !== "auth";
}

export default function App() {
  const [status, setStatus] = useState<HealthStatus>("checking");
  const [screen, setScreen] = useState<Screen>(() =>
    getToken() ? { name: "checking-auth" } : { name: "auth" }
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [lastCategory, setLastCategory] = useState<string | null>(null);
  const [lastMode, setLastMode] = useState<GameMode>("classic");
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((res) => (res.ok ? setStatus("ok") : setStatus("error")))
      .catch(() => setStatus("error"));
  }, []);

  // A stored token might be stale (expired, or from before a server
  // restart cleared nothing but time moved on) — validate it against
  // the real API once on mount, via the same call that also gets us the
  // username to display, rather than trusting it blindly until the
  // first quiz-session request happens to fail.
  useEffect(() => {
    if (screen.name !== "checking-auth") return;
    api
      .getMe()
      .then((me) => {
        setCurrentUser(me.user);
        setScreen({ name: "categories" });
      })
      .catch(() => setScreen({ name: "auth" }));
  }, [screen.name]);

  function handleAuthenticated(user: User) {
    setCurrentUser(user);
    setScreen({ name: "categories" });
  }

  function logOut() {
    clearToken();
    setCurrentUser(null);
    setScreen({ name: "auth" });
  }

  async function startQuiz(categorySlug: string | null, mode: GameMode) {
    setStartError(null);
    setLastCategory(categorySlug);
    setLastMode(mode);
    try {
      const session = await api.startQuizSession({ category: categorySlug, questionCount: 5 });
      setScreen({ name: "quiz", session, mode });
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        setCurrentUser(null);
        setScreen({ name: "auth" });
        return;
      }
      // however we got here (mode pick or "play again"), land back on
      // categories so the error has somewhere consistent to display
      setScreen({ name: "categories" });
      setStartError("Couldn't start a quiz for that category. Try another one.");
    }
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <header className="max-w-2xl mx-auto flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold">Microlearning Platform</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>
            API: {status === "checking" && "checking..."}
            {status === "ok" && "connected"}
            {status === "error" && "unreachable"}
          </span>
          {currentUser && isMainAppScreen(screen) && (
            <>
              <button onClick={() => setScreen({ name: "stats" })} className="underline">
                My Stats
              </button>
              <button onClick={() => setScreen({ name: "leaderboard" })} className="underline">
                Leaderboard
              </button>
              <span>{currentUser.username}</span>
              <button onClick={logOut} className="underline">
                Log out
              </button>
            </>
          )}
        </div>
      </header>

      {screen.name === "checking-auth" && <p className="text-center text-gray-500">Loading...</p>}

      {screen.name === "auth" && <LoginScreen onAuthenticated={handleAuthenticated} />}

      {screen.name === "categories" && (
        <div className="space-y-3">
          {startError && <p className="text-red-600 text-center">{startError}</p>}
          <CategorySelect
            onSelectCategory={(categorySlug) => setScreen({ name: "mode-select", categorySlug })}
          />
        </div>
      )}
      {screen.name === "mode-select" && (
        <GameModeSelect onSelectMode={(mode) => startQuiz(screen.categorySlug, mode)} />
      )}
      {screen.name === "quiz" && screen.mode === "classic" && (
        <QuizQuestion
          key={screen.session.id}
          session={screen.session}
          onComplete={(result) => setScreen({ name: "results", result })}
        />
      )}
      {screen.name === "quiz" && screen.mode === "lane-rush" && (
        <LaneRush
          key={screen.session.id}
          session={screen.session}
          onComplete={(result) => setScreen({ name: "results", result })}
        />
      )}
      {screen.name === "quiz" && screen.mode === "balloon-pop" && (
        <BalloonPop
          key={screen.session.id}
          session={screen.session}
          onComplete={(result) => setScreen({ name: "results", result })}
        />
      )}
      {screen.name === "results" && (
        <ResultsScreen
          result={screen.result}
          onPlayAgain={() => startQuiz(lastCategory, lastMode)}
          onBackToCategories={() => setScreen({ name: "categories" })}
        />
      )}
      {screen.name === "stats" && <StatsPage onBack={() => setScreen({ name: "categories" })} />}
      {screen.name === "leaderboard" && (
        <LeaderboardPage onBack={() => setScreen({ name: "categories" })} />
      )}
    </main>
  );
}
