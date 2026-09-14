import { useEffect, useState } from "react";
import { api, UnauthorizedError } from "./api";
import { clearToken, getToken } from "./auth";
import type { CompleteSessionResult, Difficulty, QuizSession, User } from "./types";
import { CategorySelect } from "./pages/CategorySelect";
import { GameModeSelect, type GameMode } from "./pages/GameModeSelect";
import { LoginScreen } from "./pages/LoginScreen";
import { StatsPage } from "./pages/StatsPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { ProfilePage } from "./pages/ProfilePage";
import { avatarEmoji } from "./avatars";
import { QuizOptionsModal } from "./components/QuizOptionsModal";
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
  | { name: "mode-select"; categorySlug: string | null; difficulty: Difficulty; questionCount: number }
  | { name: "quiz"; session: QuizSession; mode: GameMode }
  | { name: "results"; result: CompleteSessionResult }
  | { name: "stats" }
  | { name: "leaderboard" }
  | { name: "profile" };

/** Screens that count as "logged in and browsing" — used to decide when
 * the header's nav links (Stats/Leaderboard) make sense to show. */
function isMainAppScreen(screen: Screen): boolean {
  return screen.name !== "checking-auth" && screen.name !== "auth";
}

function statusDotClass(status: HealthStatus): string {
  if (status === "ok") return "bg-emerald-400";
  if (status === "error") return "bg-red-500";
  return "bg-slate-500 animate-pulse";
}

export default function App() {
  const [status, setStatus] = useState<HealthStatus>("checking");
  const [screen, setScreen] = useState<Screen>(() =>
    getToken() ? { name: "checking-auth" } : { name: "auth" }
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [lastCategory, setLastCategory] = useState<string | null>(null);
  const [lastMode, setLastMode] = useState<GameMode>("classic");
  const [lastDifficulty, setLastDifficulty] = useState<Difficulty>(null);
  const [lastQuestionCount, setLastQuestionCount] = useState(5);
  const [startError, setStartError] = useState<string | null>(null);
  const [pendingCategory, setPendingCategory] = useState<{ slug: string | null; name: string } | null>(null);

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

  async function startQuiz(
    categorySlug: string | null,
    mode: GameMode,
    difficulty: Difficulty = null,
    questionCount: number = 5
  ) {
    setStartError(null);
    setLastCategory(categorySlug);
    setLastMode(mode);
    setLastDifficulty(difficulty);
    setLastQuestionCount(questionCount);
    try {
      const session = await api.startQuizSession({ category: categorySlug, difficulty, questionCount });
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
      setStartError("No questions match that category/difficulty combination. Try a different one.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(60rem 30rem at 15% -10%, rgba(245,158,11,0.12), transparent), radial-gradient(50rem 30rem at 100% 0%, rgba(37,99,235,0.14), transparent)",
        }}
      />
      <header className="sticky top-0 z-10 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="max-w-5xl mx-auto flex justify-between items-center gap-3 px-4 py-4">
          <button
            onClick={() => currentUser && setScreen({ name: "categories" })}
            aria-label="Go to home"
            className="whitespace-nowrap text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r
              from-amber-400 to-orange-300 bg-clip-text text-transparent disabled:cursor-default"
            disabled={!currentUser}
          >
            PlayToLearn
          </button>
          <div className="flex items-center gap-2 sm:gap-4 text-sm text-slate-400 min-w-0">
            <p
              className="flex items-center gap-1.5 whitespace-nowrap"
              title={`API: ${status === "checking" ? "checking..." : status === "ok" ? "connected" : "unreachable"}`}
            >
              <span className={`inline-block w-2 h-2 rounded-full ${statusDotClass(status)}`} aria-hidden />
              <span className="hidden sm:inline">
                API: {status === "checking" && "checking..."}
                {status === "ok" && "connected"}
                {status === "error" && "unreachable"}
              </span>
            </p>
            {currentUser && isMainAppScreen(screen) && (
              <>
                <button
                  onClick={() => setScreen({ name: "stats" })}
                  aria-label="My Stats"
                  className="whitespace-nowrap rounded-full px-2.5 sm:px-3 py-1 border border-slate-700 hover:border-amber-500/60 hover:text-amber-300 transition-colors"
                >
                  <span className="sm:hidden" aria-hidden>📊</span>
                  <span className="hidden sm:inline">My Stats</span>
                </button>
                <button
                  onClick={() => setScreen({ name: "leaderboard" })}
                  aria-label="Leaderboard"
                  className="whitespace-nowrap rounded-full px-2.5 sm:px-3 py-1 border border-slate-700 hover:border-amber-500/60 hover:text-amber-300 transition-colors"
                >
                  <span className="sm:hidden" aria-hidden>🏆</span>
                  <span className="hidden sm:inline">Leaderboard</span>
                </button>
                <button
                  onClick={() => setScreen({ name: "profile" })}
                  aria-label="Edit profile"
                  className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
                >
                  <span className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/20
                    border border-amber-500/30 text-base flex items-center justify-center">
                    <span aria-hidden>{avatarEmoji(currentUser.avatar)}</span>
                  </span>
                  <span className="hidden md:inline truncate max-w-[8rem]">{currentUser.username}</span>
                </button>
                <button onClick={logOut} className="whitespace-nowrap hover:text-white transition-colors">
                  Log out
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main
        className={`relative mx-auto px-4 py-10 ${
          screen.name === "auth" ? "max-w-5xl" : "max-w-3xl"
        }`}
      >
        <div key={screen.name} className="motion-safe:animate-screen-in">
          {screen.name === "checking-auth" && (
            <p className="text-center text-slate-500">Loading...</p>
          )}

          {screen.name === "auth" && <LoginScreen onAuthenticated={handleAuthenticated} />}

          {screen.name === "categories" && (
            <div className="space-y-4">
              {startError && (
                <p className="text-red-400 text-center bg-red-500/10 border border-red-500/30 rounded-lg py-2 px-3">
                  {startError}
                </p>
              )}
              <CategorySelect
                onSelectCategory={(categorySlug, categoryName) =>
                  setPendingCategory({ slug: categorySlug, name: categoryName })
                }
              />
            </div>
          )}
          {screen.name === "mode-select" && (
            <GameModeSelect
              onSelectMode={(mode) => startQuiz(screen.categorySlug, mode, screen.difficulty, screen.questionCount)}
            />
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
              onPlayAgain={() => startQuiz(lastCategory, lastMode, lastDifficulty, lastQuestionCount)}
              onBackToCategories={() => setScreen({ name: "categories" })}
            />
          )}
          {screen.name === "stats" && <StatsPage onBack={() => setScreen({ name: "categories" })} />}
          {screen.name === "leaderboard" && (
            <LeaderboardPage
              onBack={() => setScreen({ name: "categories" })}
              currentUsername={currentUser?.username}
            />
          )}
          {screen.name === "profile" && currentUser && (
            <ProfilePage
              user={currentUser}
              onUpdated={(user) => {
                setCurrentUser(user);
                setScreen({ name: "categories" });
              }}
              onBack={() => setScreen({ name: "categories" })}
            />
          )}
        </div>
        {pendingCategory && (
          <QuizOptionsModal
            categoryName={pendingCategory.name}
            onCancel={() => setPendingCategory(null)}
            onStart={(difficulty, questionCount) => {
              setScreen({ name: "mode-select", categorySlug: pendingCategory.slug, difficulty, questionCount });
              setPendingCategory(null);
            }}
          />
        )}
      </main>
    </div>
  );
}
