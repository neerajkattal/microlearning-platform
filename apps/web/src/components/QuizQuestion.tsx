import { useState } from "react";
import type { QuizSession } from "../types";

interface QuizQuestionProps {
  session: QuizSession;
}

export function QuizQuestion({ session }: QuizQuestionProps) {
  const [index] = useState(0);
  const current = session.questions[index];

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h2 className="text-lg font-medium">{current.prompt}</h2>
      <div className="grid gap-2">
        {current.choices.map((choice) => (
          <button key={choice.id} className="text-left px-4 py-3 border rounded-lg hover:bg-gray-50">
            {choice.text}
          </button>
        ))}
      </div>
    </div>
  );
}
