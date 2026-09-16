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
  const [eliminatedIds, setEliminatedIds] = useState<number[]>([]);
  const [hintLoading, setHintLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [confirmingStop, setConfirmingStop] = useState(false);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [pausedDurationMs, setPausedDurationMs] = useState(0);
  const current = session.questions[index];
  const isLastQuestion = index === session.questions.length - 1;
  const progressPct = Math.round(((index + 1) / session.questions.length) * 100);

  function goToNextQuestion() {
    setIndex((i) => i + 1);
    setSelectedAnswerId(null);
    setResult(null);
    setEliminatedIds([]);
    setQuestionStartedAt(Date.now());
    setPausedDurationMs(0);
  }

  async function finishQuiz() {
    setFinishing(true);
    const completeResult = await api.completeQuizSession(session.id);
    onComplete(completeResult);
  }

  // A browser confirm() dialog is unstyled system chrome that blocks the
  // whole page - this asks the same question as an in-app message
  // instead, so stopping mid-quiz never leaves the app's own look.
  function stopQuiz() {
    if (finishing) return;
    pauseQuiz();
    setConfirmingStop(true);
  }

  function cancelStop() {
    setConfirmingStop(false);
    resumeQuiz();
  }

  function confirmStop() {
    setConfirmingStop(false);
    finishQuiz();
  }

  async function selectAnswer(answerId: number) {
    if (result || paused) return; // already answered, or paused
    setSelectedAnswerId(answerId);
    const responseTimeMs = Date.now() - questionStartedAt - pausedDurationMs;
    const res = await api.submitAnswer({
      sessionId: session.id,
      sessionQuestionId: current.session_question_id,
      selectedAnswerId: answerId,
      responseTimeMs,
    });
    setResult(res);
  }

  async function useHint() {
    if (result || hintLoading || eliminatedIds.length > 0) return;
    setHintLoading(true);
    try {
      const hint = await api.getHint({ sessionId: session.id, sessionQuestionId: current.session_question_id });
      setEliminatedIds(hint.eliminated_answer_ids);
    } finally {
      setHintLoading(false);
    }
  }

  function pauseQuiz() {
    setPaused(true);
    setPausedAt(Date.now());
  }

  function resumeQuiz() {
    if (pausedAt !== null) {
      setPausedDurationMs((ms) => ms + (Date.now() - pausedAt));
    }
    setPausedAt(null);
    setPaused(false);
  }

  function choiceClassName(choiceId: number): string {
    const base =
      "text-left px-4 py-3.5 rounded-xl border transition-all duration-150 font-medium";
    if (!result) {
      if (eliminatedIds.includes(choiceId)) {
        return `${base} border-stone-800 bg-stone-900/30 opacity-30 line-through`;
      }
      return `${base} border-stone-700 bg-stone-900/60 hover:border-amber-500/50 hover:bg-stone-800/60`;
    }
    if (choiceId === result.correct_answer_id) {
      return `${base} border-emerald-500 bg-emerald-500/10 text-emerald-300`;
    }
    if (choiceId === selectedAnswerId) {
      return `${base} border-red-500 bg-red-500/10 text-red-300`;
    }
    return `${base} border-stone-800 bg-stone-900/30 opacity-40`;
  }

  return (
    <div className="max-w-xl mx-auto space-y-5 relative">
      {paused && !confirmingStop && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-2xl
          bg-stone-950/90 backdrop-blur-sm">
          <p className="text-2xl font-extrabold text-stone-100">Paused</p>
          <Button onClick={resumeQuiz}>Resume</Button>
        </div>
      )}

      {confirmingStop && (
        <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 space-y-3 animate-pop-in">
          <p className="text-sm text-red-200">
            Stop this quiz? You'll see results for what you've answered so far.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={cancelStop}
              className="rounded-full px-4 py-1.5 text-sm font-semibold border border-stone-600
                text-stone-100 hover:border-stone-400 hover:bg-stone-800 transition-colors"
            >
              Keep playing
            </button>
            <button
              onClick={confirmStop}
              className="rounded-full px-4 py-1.5 text-sm font-semibold bg-red-500/90 text-white
                hover:bg-red-500 transition-colors"
            >
              Yes, stop
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs text-stone-500">
          <span>
            Question {index + 1} of {session.questions.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={useHint}
              disabled={result !== null || hintLoading || eliminatedIds.length > 0}
              aria-label="Get a hint"
              title="Eliminate two wrong answers"
              className="rounded-full p-1.5 border border-stone-800 text-amber-400 hover:border-amber-500/60
                hover:bg-amber-500/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              💡
            </button>
            <button
              onClick={pauseQuiz}
              disabled={result !== null}
              aria-label="Pause"
              className="rounded-full p-1.5 border border-stone-800 text-stone-400 hover:border-stone-600
                hover:text-stone-200 disabled:opacity-30 transition-colors"
            >
              ⏸
            </button>
            <button
              onClick={stopQuiz}
              disabled={finishing}
              aria-label="Stop"
              title="End the quiz now"
              className="rounded-full p-1.5 border border-stone-800 text-red-400 hover:border-red-500/60
                hover:bg-red-500/10 disabled:opacity-30 transition-colors"
            >
              ⏹
            </button>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-stone-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <h2 className="text-xl font-bold text-stone-100">{current.prompt}</h2>

      <div className="grid gap-2.5">
        {current.choices.map((choice) => (
          <button
            key={choice.id}
            onClick={() => selectAnswer(choice.id)}
            disabled={result !== null || eliminatedIds.includes(choice.id)}
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
          {result.explanation && <p className="text-sm text-stone-400">{result.explanation}</p>}
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
