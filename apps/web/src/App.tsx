import { useEffect, useState } from "react";
import { api } from "./api";
import type { CompleteSessionResult, QuizSession } from "./types";
import { CategorySelect } from "./pages/CategorySelect";
import { QuizQuestion } from "./components/QuizQuestion";
import { ResultsScreen } from "./components/ResultsScreen";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

type HealthStatus = "checking" | "ok" | "error";

type Screen =
  | { name: "categories" }
  | { name: "quiz"; session: QuizSession }
  | { name: "results"; result: CompleteSessionResult };

export default function App() {
  const [status, setStatus] = useState<HealthStatus>("checking");
  const [screen, setScreen] = useState<Screen>({ name: "categories" });
  const [lastCategory, setLastCategory] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((res) => (res.ok ? setStatus("ok") : setStatus("error")))
      .catch(() => setStatus("error"));
  }, []);

  async function startQuiz(categorySlug: string | null) {
    setStartError(null);
    setLastCategory(categorySlug);
    try {
      const session = await api.startQuizSession({ category: categorySlug, questionCount: 5 });
      setScreen({ name: "quiz", session });
    } catch {
      // however we got here (initial pick or "play again"), land back on
      // categories so the error has somewhere consistent to display
      setScreen({ name: "categories" });
      setStartError("Couldn't start a quiz for that category. Try another one.");
    }
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <header className="max-w-2xl mx-auto flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold">Microlearning Platform</h1>
        <p className="text-sm text-gray-500">
          API: {status === "checking" && "checking..."}
          {status === "ok" && "connected"}
          {status === "error" && "unreachable"}
        </p>
      </header>

      {screen.name === "categories" && (
        <div className="space-y-3">
          {startError && <p className="text-red-600 text-center">{startError}</p>}
          <CategorySelect onSelectCategory={startQuiz} />
        </div>
      )}
      {screen.name === "quiz" && (
        <QuizQuestion
          key={screen.session.id}
          session={screen.session}
          onComplete={(result) => setScreen({ name: "results", result })}
        />
      )}
      {screen.name === "results" && (
        <ResultsScreen
          result={screen.result}
          onPlayAgain={() => startQuiz(lastCategory)}
          onBackToCategories={() => setScreen({ name: "categories" })}
        />
      )}
    </main>
  );
}
