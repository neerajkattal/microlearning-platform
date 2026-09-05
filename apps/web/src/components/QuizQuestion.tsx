import { useState } from "react";
import { api } from "../api";
import type { QuizSession, SubmitAnswerResult } from "../types";

interface QuizQuestionProps {
  session: QuizSession;
}

export function QuizQuestion({ session }: QuizQuestionProps) {
  const [index] = useState(0);
  const [questionStartedAt] = useState(() => Date.now());
  const [result, setResult] = useState<SubmitAnswerResult | null>(null);
  const current = session.questions[index];

  async function selectAnswer(answerId: number) {
    const responseTimeMs = Date.now() - questionStartedAt;
    const res = await api.submitAnswer({
      sessionId: session.id,
      sessionQuestionId: current.session_question_id,
      selectedAnswerId: answerId,
      responseTimeMs,
    });
    setResult(res);
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h2 className="text-lg font-medium">{current.prompt}</h2>
      <div className="grid gap-2">
        {current.choices.map((choice) => (
          <button
            key={choice.id}
            onClick={() => selectAnswer(choice.id)}
            className="text-left px-4 py-3 border rounded-lg hover:bg-gray-50"
          >
            {choice.text}
          </button>
        ))}
      </div>
      {result && <p>{result.is_correct ? "Correct!" : "Wrong."}</p>}
    </div>
  );
}
