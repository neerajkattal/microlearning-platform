import type { CompleteSessionResult } from "../types";

interface ResultsScreenProps {
  result: CompleteSessionResult;
  onPlayAgain: () => void;
  onBackToCategories: () => void;
}

export function ResultsScreen({ result, onPlayAgain, onBackToCategories }: ResultsScreenProps) {
  return (
    <div className="max-w-md mx-auto text-center space-y-2">
      <h2 className="text-xl font-semibold">Quiz complete</h2>
      <p>
        {result.score} / {result.total_questions} correct
      </p>
      <div className="text-sm text-gray-600 space-y-1">
        <p>+{result.xp_earned} XP</p>
        <p>Total XP: {result.total_xp}</p>
        <p>Level {result.level}</p>
        <p>Streak: {result.streak} day(s)</p>
      </div>
      <div className="flex gap-3 justify-center pt-2">
        <button onClick={onPlayAgain} className="px-4 py-2 rounded bg-gray-800 text-white">
          Play again
        </button>
        <button onClick={onBackToCategories} className="px-4 py-2 rounded border">
          Back to categories
        </button>
      </div>
    </div>
  );
}
