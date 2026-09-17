import { useState } from "react";

interface DemoQuestion {
  prompt: string;
  choices: string[];
  correctIndex: number;
}

// Entirely client-side, no backend calls, no login required — the point
// is to let a visitor feel the answer -> feedback -> XP loop in a few
// seconds before deciding whether to create a real account. Deliberately
// separate from the real quiz engine/types (services/api's Question and
// Answer never enter here) so there's zero chance of this ever being
// confused with real, server-scored data.
const DEMO_QUESTIONS: DemoQuestion[] = [
  {
    prompt: "Which planet is known as the Red Planet?",
    choices: ["Mercury", "Venus", "Mars", "Jupiter"],
    correctIndex: 2,
  },
  {
    prompt: "What's the largest ocean on Earth?",
    choices: ["Atlantic", "Indian", "Arctic", "Pacific"],
    correctIndex: 3,
  },
  {
    prompt: "In games, what does \"XP\" stand for?",
    choices: ["Extra Power", "Exit Point", "Experience Points", "Xtra Play"],
    correctIndex: 2,
  },
];

const DEMO_XP_PER_CORRECT = 10;

interface DemoQuizProps {
  onCreateAccount: () => void;
}

export function DemoQuiz({ onCreateAccount }: DemoQuizProps) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [demoXp, setDemoXp] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = DEMO_QUESTIONS[index];
  const isLast = index === DEMO_QUESTIONS.length - 1;

  function selectAnswer(choiceIndex: number) {
    if (selected !== null) return;
    setSelected(choiceIndex);
    if (choiceIndex === question.correctIndex) {
      setDemoXp((xp) => xp + DEMO_XP_PER_CORRECT);
      setCorrectCount((c) => c + 1);
    }
  }

  function advance() {
    if (isLast) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  }

  function playAgain() {
    setIndex(0);
    setSelected(null);
    setDemoXp(0);
    setCorrectCount(0);
    setFinished(false);
  }

  function choiceClassName(choiceIndex: number): string {
    const base = "text-left px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-all duration-150";
    if (selected === null) {
      return `${base} border-ink bg-paper/60 hover:border-ink hover:bg-stone-100/60`;
    }
    if (choiceIndex === question.correctIndex) {
      return `${base} border-emerald-500 bg-emerald-500/10 text-emerald-300`;
    }
    if (choiceIndex === selected) {
      return `${base} border-red-500 bg-red-500/10 text-red-300`;
    }
    return `${base} border-ink bg-white/30 opacity-40`;
  }

  return (
    <div className="rounded-2xl border border-ink bg-white/60 shadow-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
          🎮 Try it — no account needed
        </p>
        <p className="text-xs text-stone-500">
          Question {Math.min(index + 1, DEMO_QUESTIONS.length)}/{DEMO_QUESTIONS.length}
        </p>
      </div>

      {!finished && (
        <>
          <h3 className="text-base font-bold text-ink">{question.prompt}</h3>
          <div className="grid grid-cols-2 gap-2">
            {question.choices.map((choice, choiceIndex) => (
              <button
                key={choice}
                onClick={() => selectAnswer(choiceIndex)}
                disabled={selected !== null}
                className={choiceClassName(choiceIndex)}
              >
                {choice}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-amber-700 animate-pop-in" key={demoXp}>
              ⚡ {demoXp} XP
            </p>
            {selected !== null && (
              <button
                onClick={advance}
                className="text-sm font-semibold text-ink bg-accent-yellow border-2 border-ink shadow-card
                  hover:shadow-glow hover:-translate-y-0.5 active:shadow-none active:translate-y-0 rounded-lg px-4 py-1.5 transition-all"
              >
                {isLast ? "See results →" : "Next"}
              </button>
            )}
          </div>
        </>
      )}

      {finished && (
        <div className="text-center space-y-3 animate-pop-in">
          <p className="text-2xl" aria-hidden>
            {correctCount === DEMO_QUESTIONS.length ? "🏆" : "🎉"}
          </p>
          <p className="font-bold text-ink">
            Demo complete — {correctCount}/{DEMO_QUESTIONS.length} correct, {demoXp} XP
          </p>
          <p className="text-sm text-stone-600">
            Create a free account to save real progress, unlock achievements, and play the actual
            games.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={onCreateAccount}
              className="text-sm font-semibold text-ink bg-accent-yellow border-2 border-ink shadow-card
                hover:shadow-glow hover:-translate-y-0.5 active:shadow-none active:translate-y-0 rounded-lg px-4 py-2 transition-all"
            >
              Create free account
            </button>
            <button
              onClick={playAgain}
              className="text-sm font-semibold text-stone-700 hover:text-ink
                border border-ink rounded-lg px-4 py-2 transition-colors"
            >
              Play again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
