import { useState } from "react";
import { api } from "../api";
import { Button } from "./ui/Button";
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
  const progressPct = Math.round(((index + 1) / session.questions.length) * 100);

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
    const base =
      "text-left px-4 py-3.5 rounded-xl border transition-all duration-150 font-medium";
    if (!result) {
      return `${base} border-slate-700 bg-slate-900/60 hover:border-amber-500/50 hover:bg-slate-800/60`;
    }
    if (choiceId === result.correct_answer_id) {
      return `${base} border-emerald-500 bg-emerald-500/10 text-emerald-300`;
    }
    if (choiceId === selectedAnswerId) {
      return `${base} border-red-500 bg-red-500/10 text-red-300`;
    }
    return `${base} border-slate-800 bg-slate-900/30 opacity-40`;
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs text-slate-500">
          <span>
            Question {index + 1} of {session.questions.length}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <h2 className="text-xl font-bold text-slate-100">{current.prompt}</h2>

      <div className="grid gap-2.5">
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
        <div
          className={`rounded-xl border p-4 space-y-2 animate-pop-in ${
            result.is_correct
              ? "border-emerald-500/40 bg-emerald-500/10"
              : "border-red-500/40 bg-red-500/10"
          }`}
        >
          <p className={`font-semibold ${result.is_correct ? "text-emerald-300" : "text-red-300"}`}>
            {result.is_correct ? "Correct!" : "Not quite."} +{result.xp_earned} XP
          </p>
          {result.explanation && <p className="text-sm text-slate-400">{result.explanation}</p>}
          {!isLastQuestion && <Button onClick={goToNextQuestion}>Next question</Button>}
          {isLastQuestion && (
            <Button onClick={finishQuiz} disabled={finishing}>
              {finishing ? "Finishing..." : "See results"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
