import { useState } from "react";
import type { Difficulty } from "../types";
import { Button } from "./ui/Button";

interface QuizOptionsModalProps {
  categoryName: string;
  onStart: (difficulty: Difficulty, questionCount: number) => void;
  onCancel: () => void;
}

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: null, label: "Any" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const QUESTION_COUNTS = [5, 10, 15, 20];

export function QuizOptionsModal({ categoryName, onStart, onCancel }: QuizOptionsModalProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(null);
  const [questionCount, setQuestionCount] = useState(5);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-options-heading"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 shadow-card p-6 space-y-6
          animate-pop-in"
      >
        <div>
          <h2 id="quiz-options-heading" className="text-lg font-bold text-slate-100">
            {categoryName}
          </h2>
          <p className="text-sm text-slate-500">Set up your quiz</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-400">Difficulty</h3>
          <div className="flex gap-2" role="group" aria-label="Select difficulty">
            {DIFFICULTIES.map(({ value, label }) => (
              <button
                key={label}
                onClick={() => setDifficulty(value)}
                aria-pressed={difficulty === value}
                className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                  difficulty === value
                    ? "border-amber-500 bg-amber-500/15 text-amber-300"
                    : "border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-400">Number of questions</h3>
          <div className="flex gap-2" role="group" aria-label="Select number of questions">
            {QUESTION_COUNTS.map((count) => (
              <button
                key={count}
                onClick={() => setQuestionCount(count)}
                aria-pressed={questionCount === count}
                className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                  questionCount === count
                    ? "border-amber-500 bg-amber-500/15 text-amber-300"
                    : "border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
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
