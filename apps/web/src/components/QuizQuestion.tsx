import { useState } from "react";
import { api } from "../api";
import type { CompleteSessionResult, QuizSession, SubmitAnswerResult } from "../types";

interface QuizQuestionProps {
  session: QuizSession;
  onComplete: (result: CompleteSessionResult) => void;
}

export function QuizQuestion({ session, onComplete }: QuizQuestionProps) {
  const [index, setIndex] = useState(0);
  const [questionStartedAt, setQuestionStartedAt] = useState(() => Date.now());
  const [selectedAnswerId, setSelectedAnswerId] = useState<number | null>(null);
  const [result, setResult] = useState<SubmitAnswerResult | null>(null);
  const [finishing, setFinishing] = useState(false);
  const current = session.questions[index];
  const isLastQuestion = index === session.questions.length - 1;

  function goToNextQuestion() {
    setIndex((i) => i + 1);
    setSelectedAnswerId(null);
    setResult(null);
    setQuestionStartedAt(Date.now());
  }

  async function finishQuiz() {
    setFinishing(true);
    const completeResult = await api.completeQuizSession(session.id);
    onComplete(completeResult);
  }

  async function selectAnswer(answerId: number) {
    if (result) return; // already answered
    setSelectedAnswerId(answerId);
    const responseTimeMs = Date.now() - questionStartedAt;
    const res = await api.submitAnswer({
      sessionId: session.id,
      sessionQuestionId: current.session_question_id,
      selectedAnswerId: answerId,
      responseTimeMs,
    });
    setResult(res);
  }

  function choiceClassName(choiceId: number): string {
    const base = "text-left px-4 py-3 border rounded-lg transition-colors";
    if (!result) {
      return `${base} hover:bg-gray-50`;
    }
    if (choiceId === result.correct_answer_id) {
      return `${base} border-green-500 bg-green-50`;
    }
    if (choiceId === selectedAnswerId) {
      return `${base} border-red-500 bg-red-50`;
    }
    return `${base} opacity-50`;
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <p className="text-sm text-gray-500">
        Question {index + 1} of {session.questions.length}
      </p>
      <h2 className="text-lg font-medium">{current.prompt}</h2>
      <div className="grid gap-2">
        {current.choices.map((choice) => (
          <button
            key={choice.id}
            onClick={() => selectAnswer(choice.id)}
            disabled={result !== null}
            className={choiceClassName(choice.id)}
          >
            {choice.text}
          </button>
        ))}
      </div>
      {result && (
        <div className="space-y-1">
          <p className={result.is_correct ? "text-green-700" : "text-red-700"}>
            {result.is_correct ? "Correct!" : "Not quite."} +{result.xp_earned} XP
          </p>
          {result.explanation && <p className="text-sm text-gray-500">{result.explanation}</p>}
          {!isLastQuestion && (
            <button onClick={goToNextQuestion} className="px-4 py-2 rounded bg-gray-800 text-white">
              Next question
            </button>
          )}
          {isLastQuestion && (
            <button
              onClick={finishQuiz}
              disabled={finishing}
              className="px-4 py-2 rounded bg-gray-800 text-white disabled:opacity-50"
            >
              {finishing ? "Finishing..." : "See results"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
