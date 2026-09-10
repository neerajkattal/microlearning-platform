import { Button } from "./ui/Button";
import type { CompleteSessionResult } from "../types";

interface ResultsScreenProps {
  result: CompleteSessionResult;
  onPlayAgain: () => void;
  onBackToCategories: () => void;
}

export function ResultsScreen({ result, onPlayAgain, onBackToCategories }: ResultsScreenProps) {
  const pct = result.total_questions > 0 ? Math.round((result.score / result.total_questions) * 100) : 0;
  const xpIntoLevel = result.total_xp % 100;

  return (
    <div className="max-w-md mx-auto text-center space-y-6">
      <div className="space-y-1">
        <div className="text-5xl" aria-hidden>
          {pct === 100 ? "🏆" : pct >= 50 ? "🎉" : "💪"}
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight">Quiz complete</h2>
        <p className="text-lg text-slate-300">
          {result.score} / {result.total_questions} correct
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-card p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl bg-slate-950/60 border border-slate-800 py-3">
            <p className="text-amber-400 font-bold text-lg">+{result.xp_earned} XP</p>
            <p className="text-slate-500 text-xs mt-0.5">Total XP: {result.total_xp}</p>
          </div>
          <div className="rounded-xl bg-slate-950/60 border border-slate-800 py-3">
            <p className="font-bold text-lg text-slate-100">Level {result.level}</p>
            <p className="text-slate-500 text-xs mt-0.5">Streak: {result.streak} day(s)</p>
          </div>
        </div>

        <div className="text-left">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Progress to next level</span>
            <span>{xpIntoLevel} / 100 XP</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 animate-fill-bar"
              style={{ width: `${xpIntoLevel}%` }}
            />
          </div>
        </div>
      </div>

      {result.achievements_earned.length > 0 && (
        <div className="space-y-2">
          <p className="font-semibold text-sm text-amber-300">Achievement unlocked!</p>
          <ul className="space-y-2">
            {result.achievements_earned.map((achievement) => (
              <li
                key={achievement.code}
                className="animate-pop-in flex items-center gap-3 rounded-xl border border-amber-500/30
                  bg-amber-500/10 px-4 py-2.5 text-left"
              >
                <span className="text-xl" aria-hidden>
                  {achievement.icon}
                </span>
                <span className="font-medium text-slate-100">{achievement.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3 justify-center">
        <Button onClick={onPlayAgain}>Play again</Button>
        <Button variant="secondary" onClick={onBackToCategories}>
          Back to categories
        </Button>
      </div>
    </div>
  );
}
