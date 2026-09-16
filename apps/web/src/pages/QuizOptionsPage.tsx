import { useState } from "react";
import type { Difficulty } from "../types";
import { Button } from "../components/ui/Button";
import { CategoryBackdrop } from "../components/CategoryBackdrop";

interface QuizOptionsPageProps {
  categoryName: string;
  color: string;
  icon: string;
  onStart: (difficulty: Difficulty, questionCount: number) => void;
  onBack: () => void;
}

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: null, label: "Any" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const QUESTION_COUNTS = [5, 10, 15, 20];

export function QuizOptionsPage({ categoryName, color, icon, onStart, onBack }: QuizOptionsPageProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(null);
  const [questionCount, setQuestionCount] = useState(5);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <CategoryBackdrop categoryName={categoryName} color={color} />

      <button onClick={onBack} className="text-sm text-stone-400 hover:text-white transition-colors">
        ← Back
      </button>

      <div className="relative rounded-2xl border-2 bg-stone-900/80 shadow-card p-6 sm:p-8 space-y-6
        motion-safe:animate-card-in" style={{ borderColor: `${color}55` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="text-3xl w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${color}22`, border: `1px solid ${color}55` }}
            aria-hidden
          >
            {icon}
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-100">{categoryName}</h2>
            <p className="text-sm text-stone-500">Set up your quiz</p>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-stone-400">Difficulty</h3>
          <div className="flex gap-2" role="group" aria-label="Select difficulty">
            {DIFFICULTIES.map(({ value, label }) => (
              <button
                key={label}
                onClick={() => setDifficulty(value)}
                aria-pressed={difficulty === value}
                className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                  difficulty === value
                    ? "border-amber-500 bg-amber-500/15 text-amber-300"
                    : "border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-stone-400">Number of questions</h3>
          <div className="flex gap-2" role="group" aria-label="Select number of questions">
            {QUESTION_COUNTS.map((count) => (
              <button
                key={count}
                onClick={() => setQuestionCount(count)}
                aria-pressed={questionCount === count}
                className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                  questionCount === count
                    ? "border-amber-500 bg-amber-500/15 text-amber-300"
                    : "border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200"
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button onClick={() => onStart(difficulty, questionCount)} className="flex-1">
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
